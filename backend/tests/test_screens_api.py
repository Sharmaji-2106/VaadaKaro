"""Endpoints behind the officer-assignment and admin screens, and the proxy IP handling."""

from datetime import datetime

from starlette.requests import Request

from app.core.config import get_settings
from app.core.rate_limit import client_ip, limiter
from app.models import UserRole
from tests.conftest import complaint_payload


def _request(headers: dict[str, str], client_host="10.0.0.5") -> Request:
    return Request(
        {
            "type": "http",
            "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
            "client": (client_host, 1234),
        }
    )


def test_client_ip_ignores_spoofable_headers(monkeypatch):
    monkeypatch.setattr(get_settings(), "proxy_shared_secret", "proxy-secret")

    # Browsers can set these to anything; neither is trusted on its own.
    assert client_ip(_request({"X-Forwarded-For": "1.2.3.4", "X-Client-IP": "1.2.3.4"})) == "10.0.0.5"
    assert client_ip(_request({"X-Client-IP": "1.2.3.4", "X-Proxy-Secret": "wrong"})) == "10.0.0.5"
    assert client_ip(_request({"X-Client-IP": "1.2.3.4", "X-Proxy-Secret": "proxy-secret"})) == "1.2.3.4"

    monkeypatch.setattr(get_settings(), "proxy_shared_secret", None)
    assert client_ip(_request({"X-Client-IP": "1.2.3.4", "X-Proxy-Secret": "proxy-secret"})) == "10.0.0.5"


async def test_failed_logins_limited_per_account_across_ips(client, make_user, monkeypatch):
    await make_user("victim@example.com")
    monkeypatch.setattr(get_settings(), "proxy_shared_secret", "proxy-secret")
    limiter.enabled = True
    limiter.reset()
    try:
        codes = []
        for i in range(11):
            # A different reported IP each time, so only the per-account limit can stop this.
            headers = {"X-Client-IP": f"203.0.113.{i}", "X-Proxy-Secret": "proxy-secret"}
            r = await client.post(
                "/api/v1/auth/login", json={"email": "victim@example.com", "password": "wrong-pass"}, headers=headers
            )
            codes.append(r.status_code)
        locked = await client.post(
            "/api/v1/auth/login",
            json={"email": "victim@example.com", "password": "password123"},
            headers={"X-Client-IP": "198.51.100.1", "X-Proxy-Secret": "proxy-secret"},
        )
    finally:
        limiter.enabled = False
    assert codes[:10] == [401] * 10
    assert codes[10] == 429
    assert locked.status_code == 429  # even the right password waits out the lock


async def test_assignable_officers_are_department_scoped(client, make_user):
    _, officer = await make_user("o1@example.com", UserRole.OFFICER, "Municipal Corporation", name="Asha")
    await make_user("o2@example.com", UserRole.OFFICER, "Municipal Corporation", name="Bala")
    await make_user("police@example.com", UserRole.OFFICER, "Police")
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)
    _, citizen = await make_user("c@example.com")

    names = [o["name"] for o in (await client.get("/api/v1/officer/officers", headers=officer)).json()]
    assert names == ["Asha", "Bala"]
    # Officers can't widen the scope with the query parameter.
    scoped = await client.get("/api/v1/officer/officers", params={"department": "Police"}, headers=officer)
    assert [o["name"] for o in scoped.json()] == ["Asha", "Bala"]

    police = await client.get("/api/v1/officer/officers", params={"department": "Police"}, headers=admin)
    assert [o["email"] for o in police.json()] == ["police@example.com"]
    assert (await client.get("/api/v1/officer/officers", headers=citizen)).status_code == 403


async def test_save_drafted_letter_and_export(client, make_user):
    _, h = await make_user("c@example.com")
    _, other = await make_user("o@example.com")
    body = {"title": "Streetlight complaint", "content": "सेवा में,\nनगर निगम\n\n[Your Name]", "category": "Civic"}

    r = await client.post("/api/v1/documents", json=body, headers=h)
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["type"] == "FORMAL_COMPLAINT"

    assert (await client.get(f"/api/v1/documents/{doc['id']}/pdf", headers=h)).content.startswith(b"%PDF")
    assert (await client.get(f"/api/v1/documents/{doc['id']}/pdf", headers=other)).status_code == 404
    assert (await client.post("/api/v1/documents", json={**body, "type": "bad type!"}, headers=h)).status_code == 422
    assert (await client.post("/api/v1/documents", json=body)).status_code == 401


async def test_admin_user_search(client, make_user):
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)
    await make_user("ravi@example.com", name="Ravi Kumar")
    _, citizen = await make_user("c@example.com")

    found = (await client.get("/api/v1/admin/users", params={"search": "ravi"}, headers=admin)).json()
    assert [u["email"] for u in found] == ["ravi@example.com"]
    admins = (await client.get("/api/v1/admin/users", params={"role": "ADMIN"}, headers=admin)).json()
    assert [u["email"] for u in admins] == ["admin@example.com"]
    assert (await client.get("/api/v1/admin/users", headers=citizen)).status_code == 403


async def test_monthly_report_counts_real_complaints(client, make_user):
    _, citizen = await make_user("c@example.com")
    _, officer = await make_user("o@example.com", UserRole.OFFICER, "Municipal Corporation")
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)

    first = (await client.post("/api/v1/complaints", json=complaint_payload(), headers=citizen)).json()
    await client.post(
        "/api/v1/complaints",
        json=complaint_payload(title="Garbage not collected this week", confirmDuplicate=True),
        headers=citizen,
    )
    await client.post(
        "/api/v1/complaints", json=complaint_payload(department="Police", category="Police"), headers=citizen
    )
    await client.patch(
        f"/api/v1/officer/complaints/{first['id']}/status",
        json={"status": "RESOLVED", "remarks": "Light repaired"},
        headers=officer,
    )

    now = datetime.now()
    report = (await client.get("/api/v1/admin/reports", params={"year": now.year, "month": now.month}, headers=admin)).json()
    assert report["totalFiled"] == 3 and report["totalResolved"] == 1
    municipal = report["departments"][0]
    assert municipal == {
        "department": "Municipal Corporation",
        "filed": 2,
        "pending": 1,
        "inProgress": 0,
        "resolved": 1,
        "rejected": 0,
        "officers": 1,
    }

    empty = (await client.get("/api/v1/admin/reports", params={"year": 2021, "month": 1}, headers=admin)).json()
    assert empty["departments"] == [] and empty["totalFiled"] == 0
    assert (
        await client.get("/api/v1/admin/reports", params={"year": now.year, "month": now.month}, headers=officer)
    ).status_code == 403
