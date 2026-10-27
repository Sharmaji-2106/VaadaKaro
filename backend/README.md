# VaadaKaro API

FastAPI backend for the VaadaKaro grievance platform. The Next.js app in `../frontend` talks to it
through its own `/api/v1` proxy. Data lives in MongoDB; `app/models.py` (Beanie documents) defines
the collections and their indexes.

| Concern | Choice | Free tier |
|---|---|---|
| API | FastAPI + Pydantic v2 | open source |
| DB | MongoDB via Beanie 2 (async PyMongo) | MongoDB Atlas M0 |
| Auth | JWT bearer tokens, bcrypt (compatible with existing bcryptjs hashes) | — |
| AI | Gemini via `google-genai`, provider wrapper with primary → fallback | Gemini free tier |
| Files | Cloudflare R2, presigned PUT/GET (private bucket) | 10 GB |
| PDF | fpdf2 + HarfBuzz + Noto fonts (correct Devanagari shaping) | open source |
| Rate limiting | slowapi, memory or Redis | Upstash |
| Hosting | Docker → Google Cloud Run / Oracle Always Free / Render | free tiers |

## Run locally

Requires Python 3.12+.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
copy .env.example .env          # then fill in MONGODB_URL, JWT_SECRET, GEMINI_API_KEY
.\.venv\Scripts\uvicorn app.main:app --reload --no-proxy-headers
```

Collections and indexes are created on startup. In Atlas, allow your IP under Network Access.
Optional demo data: `.\.venv\Scripts\python -m app.cli seed-lawyers`.

Every browser request arrives through the frontend's proxy. `X-Forwarded-For` is ignored because
browsers can forge it; in production set `PROXY_SHARED_SECRET` here and `PROXY_SHARED_SECRET` +
`TRUSTED_IP_HEADER` in the frontend so rate limits apply per visitor. Without them every visitor shares
the frontend's IP bucket (fine locally). Failed logins are also capped per email regardless of IP.

Open http://localhost:8000/docs for interactive API docs.

Signup only creates citizens. Create the first admin from the CLI, then promote officers via
`PATCH /api/v1/admin/users/{id}/role`:

```powershell
.\.venv\Scripts\python -m app.cli create-admin admin@example.com "Admin Name"
```

With Docker instead: `docker compose up` (MongoDB + Redis + API).

## Tests

```powershell
.\.venv\Scripts\pytest
```

Tests use a fake AI provider and a real MongoDB: `TEST_MONGODB_URL` if set, otherwise `MONGODB_URL`.
Each test gets its own `vaadakaro_test_*` database, dropped afterwards. Tests skip if MongoDB is unreachable.

## API overview (`/api/v1`)

All JSON is camelCase. Send `Authorization: Bearer <accessToken>` from `/auth/login`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `GET /auth/me` |
| Complaints (citizen) | `POST /complaints`, `GET /complaints`, `GET /complaints/{id}`, `GET /complaints/{id}/pdf`, `GET /complaints/track/{trackingId}` (public view is redacted) |
| Officer / admin | `GET /officer/stats`, `GET /officer/complaints`, `GET /officer/complaints/{id}`, `PATCH /officer/complaints/{id}/status`, `POST /officer/complaints/{id}/assign`, `GET /officer/officers` |
| Replies | `POST /complaints/{id}/reply` (citizen answers an officer's information request) |
| AI | `POST /ai/analyze`, `POST /ai/draft-letter`, `POST /ai/legal-documents`, `POST /ai/legal-advice` (guests allowed), `GET /ai/history` |
| Lawyers (directory) | `GET /lawyers`, `GET /lawyers/{id}`, `POST /lawyers/{id}/bookings` |
| Bookings (citizen) | `GET /bookings`, `POST /bookings/{id}/cancel` |
| Lawyer portal | `GET/PUT /lawyer/profile`, `GET /lawyer/stats`, `GET /lawyer/bookings`, `PATCH /lawyer/bookings/{id}` (confirm, decline, complete) |
| Documents | `GET/PATCH/DELETE /documents/{id}`, `GET/POST /documents`, `GET /documents/{id}/pdf`, `PUT /documents/{id}/submission` (citizen records sent / reply) |
| Authority directory | `GET /authorities?department=&category=&state=&district=&location=` (public), `GET/POST /admin/authorities`, `PUT /admin/authorities/{id}` |
| Account | `GET /account/export` (all my data as JSON), `DELETE /account` (password required), `GET /account/privacy`, `PUT /account/consents/ai`, `PUT/DELETE /account/nominee` |
| Grievance Officer | `GET /grievance-officer`, `POST /grievances` (guests allowed), `GET /grievances`, `GET /grievances/track/{ref}?email=`, `GET /admin/grievances`, `PATCH /admin/grievances/{id}` |
| Breaches (admin) | `GET/POST /admin/breach-notices`, `PATCH /admin/breach-notices/{id}` |
| Uploads | `POST /uploads/presign` → PUT the file to `uploadUrl`, then pass `key` in the complaint's `attachments` |
| Notifications | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET/PATCH /settings/notifications` |
| Admin | `GET /admin/users`, `PATCH /admin/users/{id}/role`, `GET /admin/reports`, `GET /admin/audit-logs`, `GET /admin/lawyers`, `PATCH /admin/lawyers/{id}/verify`, `GET /admin/metrics?days=` |
| Health | `GET /health` |

## Indian law this follows

| Law | What the code does |
|---|---|
| DPDP Act 2023 s.5–6 (notice, consent) | Signup records consent per purpose with the notice version (`consent_records`). AI processing is a separate, optional, withdrawable consent; AI endpoints return 403 `AI consent required…` without it. Guests tick consent per question. |
| DPDP Act s.9 (children) | No verifiable parental-consent flow, so signup requires `adult: true` (18+). |
| DPDP Act s.11–14 (rights) | Self-service export and deletion; correction, erasure, grievance and nominee requests through the Grievance Officer queue; nominee in Settings. |
| DPDP Act s.8(6) + DPDP Rules 2025; CERT-In directions 2022 | Admin breach notices notify affected users in-app and track the 6-hour CERT-In and 72-hour Board deadlines (the reports themselves are filed outside the app). |
| DPDP Act s.8(7) (retention) | `python -m app.cli apply-retention` (run daily) erases read notifications after 180 days and assistant history after 1 year; audit logs and consent records are kept. |
| IT Rules 2021 r.3(1)(b), r.3(2) | Prohibited-content list in the Terms; Grievance Officer published from `GRIEVANCE_OFFICER_*`; requests acknowledged at once and due in 15 days, overdue ones flagged. |
| BCI Rules Part VI Ch. II r.36 | Lawyer listings carry no ratings and a neutral order; visitors accept a no-solicitation disclaimer; profiles show State Bar Council and enrolment year. |
| BNS / BNSS / BSA (from 1 July 2024) | AI prompts cite only a vetted reference list, use the law in force on the incident date, and never name victims of sexual offences (BNS s.72). |

## Rules enforced on the server

- Officers only see complaints of their own department; officers with no department see nothing.
- Role is never accepted at signup; only admins change roles, and every change is audit-logged.
- Attachments must be keys under the uploader's own `uploads/<userId>/` prefix; type and size are signed into the upload URL.
- Lawyers write their own profile but never `isVerified` or `rating`; changing the bar number removes verification. Only profiles whose owner still has the LAWYER role are listed or bookable.
- "Where to send it" comes from the authority directory, never from the model. Each entry has a source URL and a last-verified date; entries never verified, or verified over 180 days ago, are flagged to citizens. The AI picks a department group from `app/core/departments.py` to look entries up.
- A document's submission status is the citizen's own record. VaadaKaro never submits letters.
- Account deletion: see the retention rules at the top of `app/api/routes/account.py`. Admins and officers cannot self-delete.
- Pilot metrics are counted from audit-log events (`LETTER_DRAFTED`, `DOCUMENT_SAVED`, `DOCUMENT_EXPORTED`, `DOCUMENT_SUBMITTED`, …); no letter text is logged.
- Booking contact details (email, phone) are shared between citizen and lawyer only once the lawyer confirms.
- Duplicate complaint (same title + department within 5 minutes) returns 409 unless `confirmDuplicate` is true.
- AI drafts include a disclaimer, a list of assumptions/placeholders, and a fact check that flags numbers or dates from the citizen's text that are missing from the draft.

## Changing the schema

Edit `app/models.py`. New optional fields need no migration (give them a default); renamed or
removed fields need a one-off `update_many` over existing documents.
