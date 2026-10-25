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
| Lawyers | `GET /lawyers`, `GET /lawyers/{id}`, `POST /lawyers/{id}/bookings` |
| Documents | `GET/PATCH/DELETE /documents/{id}`, `GET/POST /documents`, `GET /documents/{id}/pdf` |
| Uploads | `POST /uploads/presign` → PUT the file to `uploadUrl`, then pass `key` in the complaint's `attachments` |
| Notifications | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET/PATCH /settings/notifications` |
| Admin | `GET /admin/users`, `PATCH /admin/users/{id}/role`, `GET /admin/reports`, `GET /admin/audit-logs` |
| Health | `GET /health` |

## Rules enforced on the server

- Officers only see complaints of their own department; officers with no department see nothing.
- Role is never accepted at signup; only admins change roles, and every change is audit-logged.
- Attachments must be keys under the uploader's own `uploads/<userId>/` prefix; type and size are signed into the upload URL.
- Duplicate complaint (same title + department within 5 minutes) returns 409 unless `confirmDuplicate` is true.
- AI drafts include a disclaimer, a list of assumptions/placeholders, and a fact check that flags numbers or dates from the citizen's text that are missing from the draft.

## Changing the schema

Edit `app/models.py`. New optional fields need no migration (give them a default); renamed or
removed fields need a one-off `update_many` over existing documents.
