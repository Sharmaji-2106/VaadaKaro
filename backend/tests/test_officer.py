from app.models import UserRole
from tests.conftest import complaint_payload


async def _setup(client, make_user):
    _, citizen = await make_user("citizen@example.com")
    _, officer = await make_user("officer@example.com", UserRole.OFFICER, "Municipal Corporation", name="Officer Rao")
    _, outsider = await make_user("police@example.com", UserRole.OFFICER, "Police")
    created = (await client.post("/api/v1/complaints", json=complaint_payload(), headers=citizen)).json()
    return citizen, officer, outsider, created


async def test_department_isolation(client, make_user):
    citizen, officer, outsider, created = await _setup(client, make_user)
    _, unassigned = await make_user("nodept@example.com", UserRole.OFFICER)

    assert (await client.get("/api/v1/officer/complaints", headers=officer)).json()["total"] == 1
    assert (await client.get("/api/v1/officer/complaints", headers=outsider)).json()["total"] == 0
    assert (await client.get("/api/v1/officer/complaints", headers=unassigned)).json()["total"] == 0
    assert (await client.get(f"/api/v1/officer/complaints/{created['id']}", headers=outsider)).status_code == 404
    assert (await client.get("/api/v1/officer/complaints", headers=citizen)).status_code == 403

    # An officer from another department only gets the public tracking view.
    track = await client.get(f"/api/v1/complaints/track/{created['trackingId']}", headers=outsider)
    assert track.json()["isPublicView"] is True


async def test_status_change_notifies_citizen(client, make_user):
    citizen, officer, outsider, created = await _setup(client, make_user)
    body = {"status": "IN_PROGRESS", "remarks": "Crew dispatched", "internalNotes": "Ward 7"}

    assert (
        await client.patch(f"/api/v1/officer/complaints/{created['id']}/status", json=body, headers=outsider)
    ).status_code == 404
    r = await client.patch(f"/api/v1/officer/complaints/{created['id']}/status", json=body, headers=officer)
    assert r.status_code == 204

    detail = (await client.get(f"/api/v1/officer/complaints/{created['id']}", headers=officer)).json()
    assert detail["status"] == "IN_PROGRESS"
    assert detail["internalNotes"] == "Ward 7"
    assert detail["updates"][0]["remarks"] == "Crew dispatched"

    notes = (await client.get("/api/v1/notifications", headers=citizen)).json()
    assert notes[0]["type"] == "IN_PROGRESS"
    # Internal notes are never exposed to the citizen.
    assert "internalNotes" not in (await client.get(f"/api/v1/complaints/{created['id']}", headers=citizen)).json()

    stats = (await client.get("/api/v1/officer/stats", headers=officer)).json()
    assert stats["total"] == 1 and stats["inProgress"] == 1


async def test_assign_requires_officer_of_same_department(client, make_user):
    citizen, officer, outsider, created = await _setup(client, make_user)
    me = (await client.get("/api/v1/auth/me", headers=officer)).json()
    police = (await client.get("/api/v1/auth/me", headers=outsider)).json()
    citizen_me = (await client.get("/api/v1/auth/me", headers=citizen)).json()

    url = f"/api/v1/officer/complaints/{created['id']}/assign"
    assert (await client.post(url, json={"officerId": police["id"]}, headers=officer)).status_code == 400
    assert (await client.post(url, json={"officerId": citizen_me["id"]}, headers=officer)).status_code == 400
    assert (await client.post(url, json={"officerId": me["id"]}, headers=officer)).status_code == 204

    detail = (await client.get(f"/api/v1/officer/complaints/{created['id']}", headers=officer)).json()
    assert detail["status"] == "UNDER_REVIEW"
    assert detail["assignedOfficer"]["email"] == "officer@example.com"
