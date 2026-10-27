"""Indian-law requirements: DPDP Act 2023 consent, rights and breach intimation; IT Rules 2021
grievance timelines; BCI rule 36 for the lawyer directory; current criminal law in AI prompts."""

from datetime import timedelta

from app.core.ids import utcnow
from app.models import ConsentRecord, GrievanceRequest, LawyerProfile, Notification, User, UserRole
from app.services.ai.prompts import SAFETY_RULES
from app.services.ai.schemas import ComplaintAnalysis

SIGNUP = {"name": "Asha", "email": "asha@example.com", "password": "password123", "consent": True, "adult": True}


async def test_signup_requires_adult_and_records_consent(client, fake_ai):
    assert (await client.post("/api/v1/auth/signup", json={**SIGNUP, "adult": False})).status_code == 422
    r = await client.post("/api/v1/auth/signup", json=SIGNUP)
    assert r.status_code == 201, r.text
    assert r.json()["aiConsent"] is False  # AI processing is opt-in, not bundled with signup

    user = await User.find_one(User.email == "asha@example.com")
    assert user.adult_confirmed_at is not None
    records = await ConsentRecord.find(ConsentRecord.user_id == user.id).to_list()
    assert {(r.purpose.value, r.granted) for r in records} == {("ACCOUNT", True), ("AI_PROCESSING", False)}
    assert all(r.notice_version for r in records)

    # Without AI consent the AI tools refuse; giving and withdrawing consent is one call each.
    login = await client.post("/api/v1/auth/login", json={"email": "asha@example.com", "password": "password123"})
    h = {"Authorization": f"Bearer {login.json()['accessToken']}"}
    body = {"title": "Broken streetlight", "description": "The streetlight has been broken for two weeks."}
    r = await client.post("/api/v1/ai/analyze", json=body, headers=h)
    assert r.status_code == 403 and r.json()["detail"].startswith("AI consent required")

    status = (await client.put("/api/v1/account/consents/ai", json={"granted": True}, headers=h)).json()
    assert status["aiConsent"] is True and status["history"][0]["granted"] is True
    fake_ai.responses[ComplaintAnalysis] = ComplaintAnalysis(
        reliability_score=70, reliability_level="MEDIUM", feedback="ok", suggested_category="Streetlights",
        suggested_department="Municipal Corporation", missing_details=[],
    )
    assert (await client.post("/api/v1/ai/analyze", json=body, headers=h)).status_code == 200

    await client.put("/api/v1/account/consents/ai", json={"granted": False}, headers=h)
    assert (await client.post("/api/v1/ai/analyze", json=body, headers=h)).status_code == 403


async def test_withdrawing_ai_consent_erases_assistant_history(client, make_user, fake_ai):
    from app.models import AILegalHistory
    from app.schemas.legal import LegalAdviceResult

    user_id, h = await make_user("c@example.com")
    fake_ai.responses[LegalAdviceResult] = LegalAdviceResult(answer="File an RTI.")
    await client.post("/api/v1/ai/legal-advice", json={"query": "How do I file an RTI?"}, headers=h)
    doc = (await client.post("/api/v1/documents", json={"title": "Letter", "content": "Text"}, headers=h)).json()
    assert await AILegalHistory.find(AILegalHistory.user_id == user_id).count() == 1

    await client.put("/api/v1/account/consents/ai", json={"granted": False}, headers=h)
    assert await AILegalHistory.find(AILegalHistory.user_id == user_id).count() == 0
    # Documents the person saved are theirs and stay.
    assert (await client.get(f"/api/v1/documents/{doc['id']}", headers=h)).status_code == 200


async def test_existing_accounts_are_shown_the_notice_once(client, make_user):
    _, h = await make_user("old@example.com")  # made directly, like an account from before notices
    assert (await client.get("/api/v1/auth/me", headers=h)).json()["needsNotice"] is True
    r = await client.post("/api/v1/account/notice/acknowledge", headers=h)
    assert r.json()["noticeVersion"] == r.json()["currentNoticeVersion"]
    assert (await client.get("/api/v1/auth/me", headers=h)).json()["needsNotice"] is False

    # New signups have seen the notice already.
    await client.post("/api/v1/auth/signup", json=SIGNUP)
    login = await client.post("/api/v1/auth/login", json={"email": SIGNUP["email"], "password": SIGNUP["password"]})
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login.json()['accessToken']}"})
    assert me.json()["needsNotice"] is False


async def test_nominee(client, make_user):
    _, h = await make_user("c@example.com")
    assert (await client.put("/api/v1/account/nominee", json={"name": "Ravi", "relation": "Brother"}, headers=h)).status_code == 422
    r = await client.put(
        "/api/v1/account/nominee", json={"name": "Ravi", "relation": "Brother", "phone": "+91 98765 43210"}, headers=h
    )
    assert r.json()["nominee"]["name"] == "Ravi"
    r = await client.delete("/api/v1/account/nominee", headers=h)
    assert r.json()["nominee"] is None


async def test_grievance_officer_clock(client, make_user):
    officer = (await client.get("/api/v1/grievance-officer")).json()
    assert officer["acknowledgeWithinHours"] == 24 and officer["resolveWithinDays"] == 15

    # Guests must say who they are; the reference plus their email lets them follow it up.
    assert (await client.post("/api/v1/grievances", json={"type": "ERASURE", "details": "Please delete my data."})).status_code == 422
    r = await client.post(
        "/api/v1/grievances",
        json={"type": "ERASURE", "details": "Please delete my data.", "name": "Guest", "email": "G@example.com"},
    )
    assert r.status_code == 201, r.text
    guest = r.json()
    assert guest["reference"].startswith("GRV-") and guest["status"] == "ACKNOWLEDGED"
    track = f"/api/v1/grievances/track/{guest['reference']}"
    assert (await client.get(track, params={"email": "other@example.com"})).status_code == 404
    assert (await client.get(track, params={"email": "g@example.com"})).json()["id"] == guest["id"]

    # Signed-in requests are acknowledged in the app straight away.
    _, citizen = await make_user("c@example.com")
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)
    mine = (await client.post("/api/v1/grievances", json={"type": "ACCESS", "details": "Send me my data."}, headers=citizen)).json()
    notes = (await client.get("/api/v1/notifications", headers=citizen)).json()
    assert notes[0]["type"] == "GRIEVANCE_ACKNOWLEDGED" and mine["reference"] in notes[0]["title"]

    # Overdue requests come first in the admin queue.
    await GrievanceRequest.find(GrievanceRequest.id == guest["id"]).update({"$set": {"due_at": utcnow() - timedelta(days=1)}})
    queue = (await client.get("/api/v1/admin/grievances", headers=admin)).json()
    assert queue[0]["id"] == guest["id"] and queue[0]["overdue"] is True
    assert (await client.get("/api/v1/admin/grievances", headers=citizen)).status_code == 403

    url = f"/api/v1/admin/grievances/{mine['id']}"
    assert (await client.patch(url, json={"status": "RESOLVED"}, headers=admin)).status_code == 422
    r = await client.patch(url, json={"status": "RESOLVED", "response": "Use Settings › Your data › Download."}, headers=admin)
    assert r.json()["status"] == "RESOLVED" and r.json()["overdue"] is False
    notes = (await client.get("/api/v1/notifications", headers=citizen)).json()
    assert notes[0]["type"] == "GRIEVANCE_RESOLVED"


async def test_breach_intimation(client, make_user):
    affected_id, _ = await make_user("a@example.com")
    other_id, _ = await make_user("b@example.com")
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)
    detected = utcnow().isoformat()

    body = {
        "title": "Exposed backup",
        "description": "A database backup was briefly readable without a password.",
        "likelyConsequences": "Your name and email may have been seen.",
        "mitigation": "We locked the backup and rotated keys. Watch for phishing emails.",
        "detectedAt": detected,
    }
    assert (await client.post("/api/v1/admin/breach-notices", json=body, headers=admin)).status_code == 422
    r = await client.post("/api/v1/admin/breach-notices", json={**body, "affectedEmails": ["A@example.com"]}, headers=admin)
    assert r.status_code == 201, r.text
    notice = r.json()
    assert notice["notifiedCount"] == 1
    assert notice["certInDueAt"] > detected and notice["boardDueAt"] > notice["certInDueAt"]

    assert await Notification.find(Notification.user_id == affected_id, Notification.type == "DATA_BREACH").count() == 1
    assert await Notification.find(Notification.user_id == other_id, Notification.type == "DATA_BREACH").count() == 0

    r = await client.patch(f"/api/v1/admin/breach-notices/{notice['id']}", json={"certInReportedAt": detected}, headers=admin)
    assert r.json()["certInReportedAt"] is not None


async def test_lawyer_listing_has_no_ratings(client):
    a = await User(email="a@example.com", name="Adv. Zeta", role=UserRole.LAWYER).insert()
    b = await User(email="b@example.com", name="Adv. Alpha", role=UserRole.LAWYER).insert()
    common = {"bar_number": "MAH/1/2010", "specialization": ["Civil"], "location": "Pune", "pincode": "411001", "fees": 500, "experience": 5}
    await LawyerProfile(user_id=a.id, rating=5.0, is_verified=True, **common).insert()
    await LawyerProfile(user_id=b.id, rating=1.0, **common).insert()

    rows = (await client.get("/api/v1/lawyers")).json()
    assert all("rating" not in r for r in rows)
    # Verified first, then by name: never by rating.
    assert [r["user"]["name"] for r in rows] == ["Adv. Zeta", "Adv. Alpha"]


def test_prompts_use_current_criminal_law():
    assert "1 July 2024" in SAFETY_RULES and "BNSS s.173" in SAFETY_RULES and "BNS s.72" in SAFETY_RULES
