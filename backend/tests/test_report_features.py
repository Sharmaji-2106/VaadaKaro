"""Authority directory, document submission records, pilot metrics, and account export/deletion."""

from datetime import timedelta

from app.core.ids import utcnow
from app.models import Authority, Complaint, ComplaintStatus, UserRole
from app.services.ai.schemas import LetterDraft
from tests.conftest import complaint_payload

AUTHORITY = {
    "name": "Pune Municipal Corporation grievance cell",
    "department": "Municipal Corporation",
    "categories": ["Streetlights", "Waste Management"],
    "state": "Maharashtra",
    "district": "Pune",
    "howToSubmit": "Lodge the complaint online with your ward and the pole number.",
    "submissionUrl": "https://example.gov.in/complaints",
    "sourceUrl": "https://example.gov.in",
}

LETTER = LetterDraft(
    detected_language="mr",
    english_summary="Streetlight broken since 3 March.",
    category="Municipal / civic services",
    suggested_department="Pune Municipal Corporation - Electrical",
    department_group="Municipal Corporation",
    authority_note="Usually the ward office.",
    subject="Streetlight not working",
    body="The streetlight outside house 42 has not worked since 3 March.",
    missing_information=[],
    placeholders=[],
    assumptions=[],
)


async def test_authority_directory(client, make_user, fake_ai):
    _, citizen = await make_user("c@example.com")
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)

    assert (await client.post("/api/v1/admin/authorities", json=AUTHORITY, headers=citizen)).status_code == 403
    assert (await client.post("/api/v1/admin/authorities", json={**AUTHORITY, "department": "Pizza"}, headers=admin)).status_code == 422
    local = (await client.post("/api/v1/admin/authorities", json=AUTHORITY, headers=admin)).json()
    assert local["lastVerifiedAt"] is not None

    # Nationwide entry that nobody has checked yet.
    await Authority(
        name="Nationwide portal", department="Municipal Corporation", how_to_submit="Online.", source_url="https://x.gov.in"
    ).insert()
    # Another state's entry never applies to Pune.
    await client.post(
        "/api/v1/admin/authorities", json={**AUTHORITY, "name": "Other state", "state": "Gujarat", "district": None}, headers=admin
    )

    found = (
        await client.get(
            "/api/v1/authorities", params={"department": "Municipal Corporation", "location": "42 MG Road, Pune, Maharashtra"}
        )
    ).json()
    assert [(a["name"], a["scope"], a["needsRecheck"]) for a in found] == [
        ("Pune Municipal Corporation grievance cell", "DISTRICT", False),
        ("Nationwide portal", "NATIONAL", True),
    ]
    # A category the local office doesn't handle leaves only the nationwide entry.
    found = (
        await client.get("/api/v1/authorities", params={"department": "Municipal Corporation", "category": "Stray Animals", "state": "Maharashtra", "district": "Pune"})
    ).json()
    assert [a["name"] for a in found] == ["Nationwide portal"]

    # Old verification needs a recheck; deactivated entries disappear.
    await Authority.find(Authority.id == local["id"]).update({"$set": {"last_verified_at": utcnow() - timedelta(days=400)}})
    found = (await client.get("/api/v1/authorities", params={"location": "Pune, Maharashtra"})).json()
    assert found[0]["needsRecheck"] is True
    r = await client.put(f"/api/v1/admin/authorities/{local['id']}", json={**AUTHORITY, "verifiedNow": True}, headers=admin)
    assert r.json()["lastVerifiedAt"] > local["lastVerifiedAt"]
    await client.put(f"/api/v1/admin/authorities/{local['id']}", json={**AUTHORITY, "isActive": False}, headers=admin)
    found = (await client.get("/api/v1/authorities", params={"location": "Pune, Maharashtra"})).json()
    assert "Pune Municipal Corporation grievance cell" not in [a["name"] for a in found]

    # The letter drafter attaches directory entries for the AI's department group.
    fake_ai.responses[LetterDraft] = LETTER
    r = await client.post(
        "/api/v1/ai/draft-letter",
        json={"description": "Streetlight outside house 42 broken since 3 March", "location": "Pune"},
        headers=citizen,
    )
    assert r.status_code == 200, r.text
    assert [a["name"] for a in r.json()["authorities"]] == ["Nationwide portal"]
    assert "Municipal Corporation" in fake_ai.calls[0]["prompt"]


async def test_submission_record_and_metrics(client, make_user, fake_ai):
    _, citizen = await make_user("c@example.com")
    _, admin = await make_user("admin@example.com", UserRole.ADMIN)

    fake_ai.responses[LetterDraft] = LETTER
    await client.post("/api/v1/ai/draft-letter", json={"description": "Streetlight broken since 3 March"}, headers=citizen)
    doc = (
        await client.post(
            "/api/v1/documents", json={"title": "Streetlight", "content": "Edited text", "editedFromAi": True}, headers=citizen
        )
    ).json()
    assert doc["submissionStatus"] == "DRAFT"
    assert (await client.get(f"/api/v1/documents/{doc['id']}/pdf", headers=citizen)).status_code == 200

    url = f"/api/v1/documents/{doc['id']}/submission"
    assert (await client.put(url, json={"status": "SUBMITTED"}, headers=citizen)).status_code == 422
    r = await client.put(url, json={"status": "SUBMITTED", "submittedTo": "Ward office", "submissionReference": "PMC-1"}, headers=citizen)
    assert r.json()["submissionStatus"] == "SUBMITTED" and r.json()["submittedOn"]
    assert (await client.put(url, json={"status": "RESPONDED", "submittedTo": "Ward office"}, headers=citizen)).status_code == 422
    r = await client.put(
        url, json={"status": "RESPONDED", "submittedTo": "Ward office", "responseNote": "Fixed on 10 March"}, headers=citizen
    )
    assert r.json()["responseNote"] == "Fixed on 10 March"
    _, other = await make_user("o@example.com")
    assert (await client.put(url, json={"status": "DRAFT"}, headers=other)).status_code == 404

    assert (await client.get("/api/v1/admin/metrics", headers=citizen)).status_code == 403
    m = (await client.get("/api/v1/admin/metrics", params={"days": 7}, headers=admin)).json()
    assert m["lettersDrafted"] == 1
    assert m["factCheckPassRate"] == 1.0
    assert m["inputLanguages"] == [{"language": "mr", "count": 1}]
    assert m["draftCompletionRate"] == 1.0 and m["draftCorrectionRate"] == 1.0
    assert m["documentsExported"] == 1
    assert m["documentsMarkedSubmitted"] == 1 and m["documentsWithResponse"] == 1


async def test_export_and_delete_account(client, make_user):
    citizen_id, citizen = await make_user("c@example.com", name="Meera")
    _, officer = await make_user("o@example.com", UserRole.OFFICER, department="Municipal Corporation")

    untouched = (await client.post("/api/v1/complaints", json=complaint_payload(), headers=citizen)).json()
    acted = (await client.post("/api/v1/complaints", json=complaint_payload(title="Garbage not collected for a week"), headers=citizen)).json()
    complaint = await Complaint.find_one(Complaint.tracking_id == acted["trackingId"])
    complaint.status = ComplaintStatus.IN_PROGRESS
    await complaint.save()
    await client.post("/api/v1/documents", json={"title": "Letter", "content": "Text"}, headers=citizen)

    r = await client.get("/api/v1/account/export", headers=citizen)
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    data = r.json()
    assert data["account"]["email"] == "c@example.com" and "password" not in data["account"]
    assert len(data["complaints"]) == 2 and len(data["documents"]) == 1

    assert (await client.request("DELETE", "/api/v1/account", json={"password": "password123"}, headers=officer)).status_code == 409
    assert (await client.request("DELETE", "/api/v1/account", json={"password": "wrong"}, headers=citizen)).status_code == 403
    r = await client.request("DELETE", "/api/v1/account", json={"password": "password123"}, headers=citizen)
    assert r.status_code == 204
    assert (await client.get("/api/v1/auth/me", headers=citizen)).status_code == 401

    # The untouched complaint is gone; the one the department acted on stays, without the person.
    assert await Complaint.find_one(Complaint.tracking_id == untouched["trackingId"]) is None
    kept = await Complaint.find_one(Complaint.tracking_id == acted["trackingId"])
    assert kept.citizen_id == "deleted-user" and kept.location is None and kept.pincode is None
    assert citizen_id != kept.citizen_id
