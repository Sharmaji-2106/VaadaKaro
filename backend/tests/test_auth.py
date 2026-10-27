from app.core.security import hash_password, verify_password


async def test_signup_creates_citizen_and_ignores_role(client):
    r = await client.post(
        "/api/v1/auth/signup",
        json={"name": "Asha", "email": "Asha@Example.com", "password": "password123", "consent": True, "adult": True, "role": "ADMIN"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["role"] == "CITIZEN"
    assert r.json()["email"] == "asha@example.com"


async def test_signup_requires_consent_and_unique_email(client):
    body = {"name": "Asha", "email": "a@example.com", "password": "password123", "consent": False, "adult": True}
    assert (await client.post("/api/v1/auth/signup", json=body)).status_code == 422

    body["consent"] = True
    assert (await client.post("/api/v1/auth/signup", json=body)).status_code == 201
    assert (await client.post("/api/v1/auth/signup", json=body)).status_code == 409


async def test_login_and_me(client):
    await client.post(
        "/api/v1/auth/signup", json={"name": "Ravi", "email": "r@example.com", "password": "password123", "consent": True, "adult": True}
    )
    bad = await client.post("/api/v1/auth/login", json={"email": "r@example.com", "password": "wrong-pass"})
    assert bad.status_code == 401
    unknown = await client.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert unknown.status_code == 401

    ok = await client.post("/api/v1/auth/login", json={"email": "R@example.com", "password": "password123"})
    assert ok.status_code == 200
    token = ok.json()["accessToken"]

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email"] == "r@example.com"
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    assert (await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer junk"})).status_code == 401


def test_bcryptjs_hashes_still_verify():
    # bcryptjs (used by the Next.js app) writes $2a$ hashes.
    legacy = "$2a$" + hash_password("secret-pass")[4:]
    assert verify_password("secret-pass", legacy)
    assert not verify_password("other", legacy)
    assert not verify_password("x", None)
