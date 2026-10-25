import asyncio
import os
import uuid

# Must be set before the app is imported.
os.environ["JWT_SECRET"] = "test-secret-key-that-is-at-least-32-bytes"
os.environ["GEMINI_API_KEY"] = ""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel
from pymongo.errors import PyMongoError

from app.core.config import get_settings
from app.core.database import close_db, init_db, ping
from app.core.rate_limit import limiter
from app.core.security import hash_password
from app.main import app
from app.models import User, UserRole
from app.services.ai.provider import AIService
from app.services.ai.tasks import get_ai_service

limiter.enabled = False


class FakeProvider:
    """Returns canned outputs per schema; records calls. Set `fail_models` to simulate outages."""

    def __init__(self):
        self.responses: dict[type, BaseModel] = {}
        self.calls: list[dict] = []
        self.fail_models: set[str] = set()

    async def generate_json(self, *, model, system, prompt, schema):
        self.calls.append({"model": model, "system": system, "prompt": prompt, "schema": schema})
        if model in self.fail_models:
            raise RuntimeError(f"{model} is down")
        return self.responses[schema]


@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def mongo_db():
    """One throwaway database per test run on TEST_MONGODB_URL (or MONGODB_URL).

    Set up once because creating indexes over the network to Atlas is slow.
    """
    url = os.environ.get("TEST_MONGODB_URL") or get_settings().mongodb_url
    name = f"vaadakaro_test_{uuid.uuid4().hex[:12]}"
    try:
        client = await init_db(url, name)
        await ping()
    except PyMongoError as e:
        await close_db()
        pytest.skip(f"MongoDB not reachable for tests: {type(e).__name__}")
    db = client[name]
    yield db
    # Atlas "readWrite" users may drop collections but not databases; an empty database disappears.
    for collection in await db.list_collection_names():
        await db.drop_collection(collection)
    await close_db()


@pytest_asyncio.fixture(loop_scope="session")
async def mongo(mongo_db):
    """Each test starts with empty collections (indexes are kept)."""
    names = await mongo_db.list_collection_names()
    await asyncio.gather(*(mongo_db[n].delete_many({}) for n in names))
    yield


@pytest.fixture
def fake_ai():
    return FakeProvider()


@pytest_asyncio.fixture(loop_scope="session")
async def client(mongo, fake_ai):
    # ASGITransport does not run the lifespan, so the app uses the `mongo` fixture's connection.
    app.dependency_overrides[get_ai_service] = lambda: AIService(fake_ai, "primary", "fallback", 5)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(client):
    """Create a user directly in the DB and return (user_id, auth headers)."""

    async def _make(email: str, role: UserRole = UserRole.CITIZEN, department: str | None = None, name="Test User"):
        user = await User(
            email=email, name=name, password=hash_password("password123"), role=role, department=department
        ).insert()
        user_id = user.id
        r = await client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
        assert r.status_code == 200, r.text
        return user_id, {"Authorization": f"Bearer {r.json()['accessToken']}"}

    return _make


def complaint_payload(**overrides):
    body = {
        "title": "Streetlight not working for two weeks",
        "description": "The streetlight outside house no. 42 has not worked since 3 March. I complained on 5 March.",
        "department": "Municipal Corporation",
        "category": "Civic Services",
        "priority": "MEDIUM",
        "address": "42 MG Road",
        "city": "Pune",
        "state": "Maharashtra",
        "pincode": "411001",
        "declaration": True,
        "aiDisclaimer": True,
    }
    body.update(overrides)
    return body
