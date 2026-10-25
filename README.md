# VaadaKaro

Citizen grievance platform: file civic complaints, track them to resolution, and get AI-assisted legal guidance.

```
vaadakaro/
├─ frontend/   Next.js 15 UI (no database access, no secrets)
└─ backend/    FastAPI REST API: auth, complaints, officers, AI (Gemini), uploads (R2), PDFs; owns the MongoDB models
```

## How the pieces talk

```
Browser ──► frontend (Next.js) ──/api/v1/*──► backend (FastAPI) ──► MongoDB
              │  httpOnly cookie "vk_token"       ▲ Authorization: Bearer <JWT>
              └─ server components & actions ─────┘
```

- Signing in calls `POST /api/v1/auth/login`; the frontend stores the JWT in an httpOnly cookie.
- Browser code calls `/api/v1/...` on the frontend, which proxies to the backend and attaches the token
  (`frontend/src/app/api/v1/[...path]/route.ts`). The token is never exposed to JavaScript.
- Server components call the backend directly (`frontend/src/lib/api/server.ts`).
- Page access (`frontend/src/middleware.ts`) is only a convenience; the backend enforces every permission.

## Run locally

Prerequisites: Node 20+, Python 3.12+, MongoDB (a free Atlas M0 cluster, or Docker).

```powershell
# 1. Backend (port 8000). Collections and indexes are created on startup.
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
copy .env.example .env   # fill in MONGODB_URL, JWT_SECRET, GEMINI_API_KEY
.\.venv\Scripts\python -m app.cli seed-lawyers   # optional: sample lawyers
.\.venv\Scripts\uvicorn app.main:app --reload --no-proxy-headers

# 2. Frontend (port 3000), in a second terminal
cd frontend
npm install
copy .env.example .env.local   # API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000. API docs: http://localhost:8000/docs.

Create the first admin with `.\.venv\Scripts\python -m app.cli create-admin you@example.com "Your Name"`
(in `backend/`), then promote officers through `PATCH /api/v1/admin/users/{id}/role`.

## Tests

```powershell
cd backend;  .\.venv\Scripts\pytest          # API tests (MongoDB from .env + fake AI)
cd frontend; npm run typecheck; npm run build
```

See `backend/README.md` for the full API reference and deployment notes.
