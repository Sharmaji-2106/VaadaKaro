from tests.conftest import complaint_payload


async def test_create_and_list(client, make_user):
    _, h = await make_user("c@example.com")
    r = await client.post("/api/v1/complaints", json=complaint_payload(), headers=h)
    assert r.status_code == 201, r.text
    assert r.json()["trackingId"].startswith("VDK-")

    mine = await client.get("/api/v1/complaints", headers=h)
    assert [c["title"] for c in mine.json()] == ["Streetlight not working for two weeks"]

    notes = await client.get("/api/v1/notifications", headers=h)
    assert notes.json()[0]["type"] == "COMPLAINT_SUBMITTED"


async def test_validation_mirrors_frontend(client, make_user):
    _, h = await make_user("c@example.com")
    assert (await client.post("/api/v1/complaints", json=complaint_payload(pincode="011001"), headers=h)).status_code == 422
    assert (await client.post("/api/v1/complaints", json=complaint_payload(title="short"), headers=h)).status_code == 422
    assert (
        await client.post("/api/v1/complaints", json=complaint_payload(declaration=False), headers=h)
    ).status_code == 422
    assert (await client.post("/api/v1/complaints", json=complaint_payload())).status_code == 401


async def test_duplicate_warning(client, make_user):
    _, h = await make_user("c@example.com")
    assert (await client.post("/api/v1/complaints", json=complaint_payload(), headers=h)).status_code == 201

    dup = await client.post("/api/v1/complaints", json=complaint_payload(), headers=h)
    assert dup.status_code == 409
    assert dup.json()["detail"]["isDuplicate"] is True

    forced = await client.post("/api/v1/complaints", json=complaint_payload(confirmDuplicate=True), headers=h)
    assert forced.status_code == 201


async def test_attachments_must_belong_to_uploader(client, make_user):
    uid, h = await make_user("c@example.com")
    good = {"key": f"uploads/{uid}/abc-photo.jpg", "filename": "photo.jpg", "mimeType": "image/jpeg", "fileSize": 1000}
    bad = {**good, "key": "uploads/someone-else/abc.jpg"}

    assert (await client.post("/api/v1/complaints", json=complaint_payload(attachments=[bad]), headers=h)).status_code == 400
    r = await client.post("/api/v1/complaints", json=complaint_payload(attachments=[good]), headers=h)
    assert r.status_code == 201


async def test_tracking_masks_data_for_others(client, make_user):
    _, owner = await make_user("owner@example.com")
    _, other = await make_user("other@example.com")
    created = (await client.post("/api/v1/complaints", json=complaint_payload(), headers=owner)).json()

    public = await client.get(f"/api/v1/complaints/track/{created['trackingId']}")
    assert public.status_code == 200
    body = public.json()
    assert body["isPublicView"] is True
    assert "description" not in body and "location" not in body
    assert body["updates"][0]["updatedBy"] is None

    full = await client.get(f"/api/v1/complaints/track/{created['trackingId']}", headers=owner)
    assert "house no. 42" in full.json()["description"]

    assert (await client.get(f"/api/v1/complaints/{created['id']}", headers=other)).status_code == 404
    assert (await client.get("/api/v1/complaints/track/VDK-0000-NOPE")).status_code == 404


async def test_pdf_export_with_devanagari(client, make_user):
    _, h = await make_user("c@example.com")
    payload = complaint_payload(
        title="सड़क पर गड्ढे - Road potholes",
        description="हमारे मोहल्ले की सड़क पर बड़े गड्ढे हैं। Since 3 March nobody has repaired them, ₹500 fine paid.",
    )
    created = (await client.post("/api/v1/complaints", json=payload, headers=h)).json()

    r = await client.get(f"/api/v1/complaints/{created['id']}/pdf", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content.startswith(b"%PDF")
