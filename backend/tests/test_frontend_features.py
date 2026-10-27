"""Endpoints the Next.js frontend relies on: legal assistant chat, lawyers and info-request replies."""

from app.models import Complaint, ComplaintStatus, LawyerProfile, User, UserRole
from app.schemas.legal import LegalAdviceResult
from tests.conftest import complaint_payload


async def test_legal_advice_guest_and_history(client, make_user, fake_ai):
    fake_ai.responses[LegalAdviceResult] = LegalAdviceResult(answer="File an RTI under the RTI Act, 2005.")

    # Guests must agree, per question, to it being sent to the AI provider.
    assert (await client.post("/api/v1/ai/legal-advice", json={"query": "How do I file an RTI?"})).status_code == 403
    guest = await client.post("/api/v1/ai/legal-advice", json={"query": "How do I file an RTI?", "aiConsent": True})
    assert guest.status_code == 200
    assert "RTI" in guest.json()["response"]

    _, h = await make_user("c@example.com")
    r = await client.post(
        "/api/v1/ai/legal-advice", json={"query": "How do I file an RTI?", "constitutionMode": True}, headers=h
    )
    assert r.status_code == 200
    assert "relevant to the question" in fake_ai.calls[-1]["prompt"]

    history = (await client.get("/api/v1/ai/history", headers=h)).json()
    assert [x["legalCategory"] for x in history] == ["CONSTITUTIONAL"]
    assert (await client.get("/api/v1/ai/history")).status_code == 401


async def test_lawyers_filter_and_booking(client, make_user):
    lawyer_user = await User(email="adv@example.com", name="Adv. Priya", role=UserRole.LAWYER).insert()
    profile = await LawyerProfile(
        user_id=lawyer_user.id,
        bar_number="MAH/1/2015",
        specialization=["Consumer", "Family"],
        location="Pune",
        pincode="411001",
        fees=1000,
        experience=8,
        languages=["English", "Marathi"],
        rating=4.5,
    ).insert()
    profile_id, lawyer_user_id = profile.id, lawyer_user.id

    assert len((await client.get("/api/v1/lawyers", params={"specialization": "Consumer"})).json()) == 1
    assert (await client.get("/api/v1/lawyers", params={"specialization": "Criminal"})).json() == []
    assert (await client.get("/api/v1/lawyers", params={"maxFees": 500})).json() == []
    one = (await client.get(f"/api/v1/lawyers/{profile_id}")).json()
    assert one["user"]["name"] == "Adv. Priya"

    booking = {"date": "2026-11-02T00:00:00", "timeSlot": "10:00 AM - 11:00 AM", "description": "Deposit not refunded by landlord."}
    assert (await client.post(f"/api/v1/lawyers/{profile_id}/bookings", json=booking)).status_code == 401
    _, h = await make_user("c@example.com")
    r = await client.post(f"/api/v1/lawyers/{profile_id}/bookings", json=booking, headers=h)
    assert r.status_code == 201, r.text
    # Booking.lawyerId must reference the lawyer's User id, not the profile id.
    assert r.json()["lawyerId"] == lawyer_user_id


async def test_reply_only_by_owner_when_info_requested(client, make_user):
    _, owner = await make_user("owner@example.com")
    _, other = await make_user("other@example.com")
    created = (await client.post("/api/v1/complaints", json=complaint_payload(), headers=owner)).json()
    url = f"/api/v1/complaints/{created['id']}/reply"
    body = {"message": "The light is pole number 17."}

    assert (await client.post(url, json=body, headers=owner)).status_code == 409

    complaint = await Complaint.get(created["id"])
    complaint.status = ComplaintStatus.INFO_REQUESTED
    await complaint.save()

    assert (await client.post(url, json=body, headers=other)).status_code == 404
    assert (await client.post(url, json=body, headers=owner)).status_code == 204

    tracked = (await client.get(f"/api/v1/complaints/track/{created['trackingId']}", headers=owner)).json()
    assert tracked["status"] == "UNDER_REVIEW"
    assert tracked["updates"][0]["remarks"].startswith("Citizen reply:")
