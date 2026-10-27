# Architecture

## Request flow

```
Browser ──► Next.js (Vercel) ──/api/v1/*──► FastAPI (Render) ──► MongoDB Atlas
   │          httpOnly cookie vk_token            │  Bearer JWT       ├─► Gemini (AI, with consent)
   │                                              │                   └─► Cloudflare R2 (files)
   └── server components & actions call the API directly with the same token
```

- **Sign-in:** `POST /auth/login` returns a JWT; a server action stores it in the `vk_token` httpOnly cookie. JavaScript never sees it.
- **Browser calls** go to `/api/v1/...` on the frontend, which proxies them and adds `Authorization: Bearer`.
- **Server components** call the backend through `frontend/src/lib/api/server.ts`.
- **The user is reloaded on every request**, so role and department changes apply at once.
- **Rate limits** (slowapi) apply per visitor IP, which the proxy reports with `PROXY_SHARED_SECRET`.

## Backend layout (`backend/app/`)

```
main.py              routers, CORS, AI-outage handler, background DB connect
models.py            every MongoDB collection (Beanie documents)
cli.py               create-admin, seed-*, set-password, apply-retention
core/                config, database, security (JWT, bcrypt), rate_limit, ids, departments
api/deps.py          CurrentUser, Officer, Admin, Lawyer, AIUser (consent check)
api/routes/          one file per area (see backend/README.md for endpoints)
schemas/             request and response models (camelCase)
services/            ai/, audit, consent, notifications, pdf, storage
```

## Collections

| Collection | Holds | Notes |
|---|---|---|
| `users` | account, role, department, `ai_consent`, `notice_version`, `nominee` | |
| `complaints` | complaint + embedded `updates[]`, `attachments[]` | `tracking_id` is public; the public view is redacted |
| `legal_documents` | saved letters and drafts | `submission_status`: DRAFT → SUBMITTED → RESPONDED (the citizen's own record) |
| `authorities` | verified "where to complain" directory | `source_url`, `last_verified_at`; recheck after 180 days |
| `lawyer_profiles`, `bookings` | lawyer directory and consultations | no ratings shown |
| `consent_records` | append-only consent proof | purpose + notice version |
| `grievance_requests` | rights requests and grievances | 15-day `due_at` |
| `breach_notices` | data breaches | CERT-In 6h and Board 72h deadlines |
| `notifications`, `user_settings` | in-app notifications | |
| `audit_logs` | every important action | also feeds the pilot metrics; never purged |
| `ai_legal_history` | legal assistant chats | erased on AI-consent withdrawal or after 1 year |

## Frontend layout (`frontend/src/`)

```
app/                  routes (App Router). Public: /, /file-complaint, /draft-letter, /authorities,
                      /ai-assistant, /find-lawyer, /track-complaint, /grievance, /privacy, /terms
app/dashboard/        citizen (/, documents, bookings, settings), officer/, lawyer/, admin/
app/api/v1/[...path]  proxy to the backend
components/features/  domain components (authorities, bookings, complaints, legal, privacy, …)
services/             server.ts (server components), *.ts (browser calls via api())
lib/                  api client, session, departments, locations
middleware.ts         redirects for signed-out users and wrong roles (convenience only)
```

## AI pipeline (letter drafter)

```
text or voice ─► consent check ─► Gemini (safety rules + Indian-law reference list)
   ─► fact check (numbers and dates kept?) ─► department group ─► authority directory match
   ─► user edits ─► save (edited-from-AI flag) ─► PDF ─► citizen records sent / reply
```

Each step logs a count-only event (`LETTER_DRAFTED`, `DOCUMENT_SAVED`, …) that the admin metrics page aggregates.
