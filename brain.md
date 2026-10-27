# brain.md: VaadaKaro project memory

Read this before changing anything. It holds what the code can't tell you: why things are the way
they are, rules that must not break, and traps. Keep it short and current.

## 1. What this is

- A grievance-**preparation** platform for Indian citizens, built from
  `backend/VaadaKaro_Detailed_Project_Report.pdf`. Core idea: turn an ordinary-language problem into a
  formal letter, point to the right office, and track what happened.
- **It never submits anything to a government office.** It drafts; the citizen sends. Complaints filed
  *on VaadaKaro* go to officers who are VaadaKaro users of that department.
- Four roles: CITIZEN, OFFICER (one department), LAWYER, ADMIN. Signup makes citizens only.

## 2. Stack and where things live

| Layer | Choice | Key files |
|---|---|---|
| Frontend | Next.js 15 App Router, React 19, CSS modules | `frontend/src/app/*`, `frontend/src/services/*` |
| API proxy | Next route `/api/v1/[...path]` adds the JWT from an httpOnly cookie | `frontend/src/app/api/v1/[...path]/route.ts` |
| Backend | FastAPI + Pydantic v2, camelCase JSON | `backend/app/main.py`, `backend/app/api/routes/*` |
| DB | MongoDB Atlas via Beanie 2 (async PyMongo) | `backend/app/models.py` (all collections) |
| AI | Gemini, primary → fallback model | `backend/app/services/ai/*` (prompts in `prompts.py`) |
| Files | Cloudflare R2, presigned URLs | `backend/app/services/storage.py` |
| Hosting | Vercel (frontend) + Render (backend, `vaadakaro.onrender.com`) | `docs/DEPLOYMENT.md` |

Legacy and unused: `prisma/`, the root `package.json` (Prisma scripts) and `node_modules/` at the root.
They're from the Postgres era (before 2026-10-25). Don't build on them.

## 3. Rules that must not break

1. **The backend enforces every permission.** Frontend middleware and layouts are convenience only.
2. **Officers see only their department's complaints** (`can_access_department`). Return 404, not 403, for other departments' ids.
3. **Never claim something was submitted, sent or confirmed when it wasn't.** UI copy and AI output alike.
4. **"Where to send it" comes from the Authority directory, never from the model.** Entries carry `source_url` and `last_verified_at`; seeded entries start unverified.
5. **AI needs consent.** `AIUser` dependency on AI routes; guests pass `aiConsent` per question. 403 detail starts with `AI consent required` (the frontend matches this prefix).
6. **AI may cite law only from the reference list in `prompts.py`.** Use BNS/BNSS/BSA for incidents from 1 July 2024, IPC/CrPC before. Never name sexual-offence victims (BNS s.72).
7. **No lawyer ratings or ranking** (BCI Rule 36). Neutral order: verified first, then name.
8. **Never log letter or complaint text** in metrics or audit metadata; counts and ids only.
9. **Contact details between citizen and lawyer only after the lawyer confirms.**
10. **Departments are one fixed list**, `backend/app/core/departments.py` = `frontend/src/lib/departments.ts`. Officers and the directory match by exact name.
11. **Notice version lives in two places**: `PRIVACY_NOTICE_VERSION` (backend config) and `NOTICE_VERSION` (`frontend/src/app/privacy/page.tsx`). Bump both together; users are then shown the notice once.
12. **Audit logs and consent records are never purged** (retention keeps them).

## 4. Conventions

- Add a field: put it in `models.py` with a default (no migration needed). Renames need an `update_many`.
- Datetimes are stored naive UTC (`utcnow()`); `ApiModel` adds the UTC marker on output.
- Output schemas use plain types; don't reuse input validators for output (stored data can break reads).
- Log important actions with `log_action(...)`; notify users with `notify(...)`.
- Server components load data via `frontend/src/services/server.ts` (never throws); browser code uses `services/*.ts` with `api()`.
- Comments explain *why*. Match the surrounding code's density.

## 5. Gotchas

- Atlas from the dev machine is slow: startup ~25s, ~2s per request, the full test suite ~5 min. `AutoReconnect` or semaphore timeouts are network flakes; rerun before believing a failure.
- Test emails need a real TLD (`.com`); pydantic rejects `.local` and `.test`.
- Demo lawyers have no password: use `python -m app.cli set-password <email>`.
- Running `npm run build` while `next dev` is running can corrupt the dev server's `.next`; restart dev after a build.
- The machine has no Docker, package manager or admin rights; everything runs from the venv and npm.

## 6. Decisions log (newest first)

| Date | Decision | Why |
|---|---|---|
| 2026-10-26 | Withdrawing AI consent erases assistant history; saved documents stay | DPDP s.8(7); documents are the user's own records |
| 2026-10-26 | Accounts are 18+ only | DPDP s.9 needs verifiable parental consent; there's no such flow |
| 2026-10-26 | Grievance clock: acknowledge at once, resolve in 15 days | IT Rules 2021 r.3(2); also covers DPDP requests |
| 2026-10-26 | Account deletion keeps department-handled complaints, anonymised | Departments' work shouldn't vanish; untouched complaints are deleted |
| 2026-10-26 | Authority directory instead of AI for "where to send" | Report §6.4 and §7.4: the LLM can't guarantee jurisdiction |
| 2026-10-26 | Lawyer portal; bookings PENDING → CONFIRMED → COMPLETED / CANCELLED | Report lists lawyers as a role; nothing existed |
| 2026-10-25 | Moved from Postgres/Prisma to MongoDB Atlas | Owner's request |

## 7. Open items

See `PROJECT_STATUS.md` → "Still to do". The big ones: name the Grievance Officer, email provider,
R2 uploads, processor contracts, backups, legal review, then a pilot.
