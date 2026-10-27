# VaadaKaro

AI-assisted citizen grievance and legal-help platform for India. Citizens describe a problem in Hindi,
Marathi or English, get a formal letter and the right office to send it to, file and track complaints,
and book a lawyer. Officers, lawyers and admins each have their own portal.

> Status: feature-complete for the report's MVP, not yet launched. See [PROJECT_STATUS.md](PROJECT_STATUS.md).
> Built to follow the DPDP Act 2023 and IT Rules 2021, **pending legal review**. See [docs/COMPLIANCE.md](docs/COMPLIANCE.md).

```
vaadakaro/
├─ frontend/   Next.js 15 + React 19 UI (no database access, no secrets)
├─ backend/    FastAPI API on MongoDB (Beanie): auth, complaints, AI (Gemini), PDFs, uploads (R2)
├─ docs/       Architecture, compliance, deployment, user guide
└─ brain.md    Project memory: decisions, rules, gotchas (read this first)
```

## What it does

| Who | Main features |
|---|---|
| Citizen | File and track complaints · AI letter drafter with voice input and fact check · "Where to complain" directory · My documents (record when and where a letter was sent) · Legal assistant · Book a lawyer · Download or delete my data |
| Officer | Department-only complaint queue · High-priority overview · Status updates and assignment |
| Lawyer | Consultation inbox (confirm, decline, complete) · Public profile (Bar Council rules) |
| Admin | Reports and pilot metrics · Users and roles · Lawyer verification · Authority directory · Grievance Officer queue · Data breaches · Audit log |

Details per role: [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## Run locally

Prerequisites: Node 20+, Python 3.12+, MongoDB (a free Atlas M0 cluster, or `docker compose up` in `backend/`).

```powershell
# 1. Backend on :8000 (collections and indexes are created on startup)
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
copy .env.example .env            # set MONGODB_URL, JWT_SECRET, GEMINI_API_KEY
.\.venv\Scripts\uvicorn app.main:app --reload --no-proxy-headers

# 2. Frontend on :3000, in a second terminal
cd frontend
npm install
copy .env.example .env.local      # API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000. API docs: http://localhost:8000/docs.

### First-time data (in `backend/`)

```powershell
.\.venv\Scripts\python -m app.cli create-admin you@example.com "Your Name"
.\.venv\Scripts\python -m app.cli seed-lawyers              # 2 demo lawyers (no password)
.\.venv\Scripts\python -m app.cli set-password rahul.lawyer@example.com
.\.venv\Scripts\python -m app.cli seed-authorities          # national portals, UNVERIFIED: check each
.\.venv\Scripts\python -m app.cli apply-retention --dry-run # schedule daily without --dry-run
```

Signup always creates citizens. Admins give officer, lawyer or admin roles in **Users & roles**.

## Tests

```powershell
cd backend;  .\.venv\Scripts\pytest               # 43 API tests; real MongoDB + fake AI (~5 min on Atlas)
cd frontend; npm run typecheck; npm run build
```

## Documentation

| File | What's in it |
|---|---|
| [brain.md](brain.md) | Project memory: purpose, decisions, rules that must not break, gotchas |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | What's built and what's left before launch |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the pieces talk, data model, folder map |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Indian law: what the code does and what is still open |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Render + Atlas setup, environment variables, launch checklist |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | How each portal is used |
| [backend/README.md](backend/README.md) | Full API reference and server rules |
| [frontend/README.md](frontend/README.md) | Frontend structure and conventions |
| [SECURITY.md](SECURITY.md) | Reporting vulnerabilities, incident steps |
| [CHANGELOG.md](CHANGELOG.md) | What changed, by date |
| `backend/VaadaKaro_Detailed_Project_Report.pdf` | The original project report this is built from |
