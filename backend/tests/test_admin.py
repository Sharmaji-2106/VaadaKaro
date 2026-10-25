from app.core.rate_limit import limiter
from app.models import UserRole


async def test_role_change_and_audit(client, make_user):
    citizen_id, citizen = await make_user("c@example.com")
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)

    url = f"/api/v1/admin/users/{citizen_id}/role"
    assert (await client.patch(url, json={"role": "ADMIN"}, headers=citizen)).status_code == 403
    assert (await client.patch(url, json={"role": "OFFICER"}, headers=admin)).status_code == 400

    r = await client.patch(url, json={"role": "OFFICER", "department": "Police"}, headers=admin)
    assert r.json()["role"] == "OFFICER"

    # Role changes apply to existing tokens immediately because the user is reloaded per request.
    assert (await client.get("/api/v1/officer/stats", headers=citizen)).status_code == 200

    logs = (await client.get("/api/v1/admin/audit-logs", params={"entityId": citizen_id}, headers=admin)).json()
    assert logs[0]["action"] == "USER_ROLE_CHANGED"
    assert '"to": "OFFICER"' in logs[0]["metadata"]


async def test_login_rate_limit(client):
    limiter.enabled = True
    limiter.reset()
    try:
        codes = [
            (await client.post("/api/v1/auth/login", json={"email": "x@example.com", "password": "x"})).status_code
            for _ in range(11)
        ]
    finally:
        limiter.enabled = False
    assert codes[:10] == [401] * 10
    assert codes[10] == 429


async def test_health(client):
    body = (await client.get("/health")).json()
    assert body["database"] == "ok"
    assert body["ai"] == "not_configured"
