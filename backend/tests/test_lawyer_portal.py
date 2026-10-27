"""Lawyer portal, citizen bookings and admin lawyer verification."""

from app.models import UserRole

PROFILE = {
    "barNumber": "MAH/9999/2018",
    "stateBarCouncil": "Bar Council of Maharashtra and Goa",
    "enrolmentYear": 2018,
    "specialization": ["Consumer", " Consumer ", "Property"],
    "location": "Pune",
    "pincode": "411001",
    "fees": 800,
    "experience": 6,
    "languages": ["Marathi", "English"],
    "bio": "Consumer and property disputes.",
}
BOOKING = {"date": "2099-11-02T00:00:00", "timeSlot": "10:00 AM - 11:00 AM", "description": "Deposit not refunded by landlord."}


async def test_profile_and_booking_lifecycle(client, make_user):
    lawyer_id, lawyer = await make_user("adv@example.com", UserRole.LAWYER, name="Adv. Asha")
    citizen_id, citizen = await make_user("c@example.com", name="Meera")
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)

    # Only lawyers reach the portal; a lawyer starts without a profile.
    assert (await client.get("/api/v1/lawyer/profile", headers=citizen)).status_code == 403
    assert (await client.get("/api/v1/lawyer/profile", headers=lawyer)).status_code == 404

    r = await client.put("/api/v1/lawyer/profile", json={**PROFILE, "isVerified": True}, headers=lawyer)
    assert r.status_code == 200, r.text
    profile = r.json()
    assert profile["specialization"] == ["Consumer", "Property"]
    assert profile["isVerified"] is False  # not the lawyer's to set
    profile_id = profile["id"]

    # Admin verifies; the lawyer is told.
    pending = (await client.get("/api/v1/admin/lawyers", params={"verified": False}, headers=admin)).json()
    assert [p["id"] for p in pending] == [profile_id]
    assert pending[0]["email"] == "adv@example.com"
    r = await client.patch(f"/api/v1/admin/lawyers/{profile_id}/verify", json={"isVerified": True}, headers=admin)
    assert r.json()["isVerified"] is True
    notes = (await client.get("/api/v1/notifications", headers=lawyer)).json()
    assert notes[0]["type"] == "LAWYER_VERIFIED"

    # Changing the bar number drops verification.
    r = await client.put("/api/v1/lawyer/profile", json={**PROFILE, "barNumber": "MAH/1/2020"}, headers=lawyer)
    assert r.json()["isVerified"] is False

    # Lawyers cannot book themselves.
    assert (await client.post(f"/api/v1/lawyers/{profile_id}/bookings", json=BOOKING, headers=lawyer)).status_code == 400

    booking_id = (await client.post(f"/api/v1/lawyers/{profile_id}/bookings", json=BOOKING, headers=citizen)).json()["id"]
    notes = (await client.get("/api/v1/notifications", headers=lawyer)).json()
    assert notes[0]["type"] == "BOOKING_REQUESTED"

    stats = (await client.get("/api/v1/lawyer/stats", headers=lawyer)).json()
    assert stats == {"pending": 1, "upcoming": 0, "completed": 0, "cancelled": 0}

    # Contact details stay hidden until the lawyer confirms.
    rows = (await client.get("/api/v1/lawyer/bookings", params={"status": "PENDING"}, headers=lawyer)).json()
    assert rows[0]["citizen"] == {"id": citizen_id, "name": "Meera", "email": None, "phone": None}
    mine = (await client.get("/api/v1/bookings", headers=citizen)).json()
    assert mine[0]["lawyer"]["name"] == "Adv. Asha" and mine[0]["lawyer"]["email"] is None

    # Pending bookings cannot be completed directly.
    url = f"/api/v1/lawyer/bookings/{booking_id}"
    assert (await client.patch(url, json={"status": "COMPLETED"}, headers=lawyer)).status_code == 409
    r = await client.patch(url, json={"status": "CONFIRMED", "note": "Bring the rent agreement."}, headers=lawyer)
    assert r.status_code == 200, r.text
    assert r.json()["citizen"]["email"] == "c@example.com"

    mine = (await client.get("/api/v1/bookings", headers=citizen)).json()
    assert mine[0]["status"] == "CONFIRMED"
    assert mine[0]["lawyer"]["email"] == "adv@example.com"
    assert mine[0]["lawyerNote"] == "Bring the rent agreement."
    notes = (await client.get("/api/v1/notifications", headers=citizen)).json()
    assert notes[0]["type"] == "BOOKING_CONFIRMED"
    assert "Bring the rent agreement." in notes[0]["message"]

    assert (await client.get("/api/v1/lawyer/stats", headers=lawyer)).json()["upcoming"] == 1

    # Another lawyer cannot touch this booking.
    _, other = await make_user("other@example.com", UserRole.LAWYER)
    assert (await client.patch(url, json={"status": "CANCELLED"}, headers=other)).status_code == 404

    r = await client.patch(url, json={"status": "COMPLETED"}, headers=lawyer)
    assert r.json()["status"] == "COMPLETED"
    # Finished bookings can no longer be cancelled by either side.
    assert (await client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=citizen)).status_code == 409
    assert (await client.patch(url, json={"status": "CANCELLED"}, headers=lawyer)).status_code == 409


async def test_citizen_cancel_and_unlisted_lawyer(client, make_user):
    lawyer_id, lawyer = await make_user("adv@example.com", UserRole.LAWYER)
    _, citizen = await make_user("c@example.com")
    _, stranger = await make_user("s@example.com")
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)
    profile_id = (await client.put("/api/v1/lawyer/profile", json=PROFILE, headers=lawyer)).json()["id"]

    booking_id = (await client.post(f"/api/v1/lawyers/{profile_id}/bookings", json=BOOKING, headers=citizen)).json()["id"]
    assert (await client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=stranger)).status_code == 404
    r = await client.post(f"/api/v1/bookings/{booking_id}/cancel", headers=citizen)
    assert r.json()["status"] == "CANCELLED"
    notes = (await client.get("/api/v1/notifications", headers=lawyer)).json()
    assert notes[0]["type"] == "BOOKING_CANCELLED"

    # A lawyer demoted by an admin disappears from the directory and cannot be booked.
    await client.patch(f"/api/v1/admin/users/{lawyer_id}/role", json={"role": "CITIZEN"}, headers=admin)
    assert (await client.get("/api/v1/lawyers")).json() == []
    assert (await client.get(f"/api/v1/lawyers/{profile_id}")).status_code == 404
    assert (await client.post(f"/api/v1/lawyers/{profile_id}/bookings", json=BOOKING, headers=citizen)).status_code == 404


async def test_officer_open_high_priority_filter(client, make_user):
    from tests.conftest import complaint_payload

    _, citizen = await make_user("c@example.com")
    _, officer = await make_user("o@example.com", UserRole.OFFICER, department="Municipal Corporation")
    for title, priority in [("Open urgent issue", "URGENT"), ("Open high issue", "HIGH"), ("Open low issue", "LOW")]:
        r = await client.post("/api/v1/complaints", json=complaint_payload(title=title, priority=priority), headers=citizen)
        assert r.status_code == 201, r.text

    r = await client.get(
        "/api/v1/officer/complaints", params={"priority": ["URGENT", "HIGH"], "open": "true"}, headers=officer
    )
    assert sorted(c["priority"] for c in r.json()["items"]) == ["HIGH", "URGENT"]
