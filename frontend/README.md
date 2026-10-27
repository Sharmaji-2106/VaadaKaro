# VaadaKaro frontend

Next.js 15 (App Router) + React 19, styled with CSS modules and the tokens in `src/styles/globals.css`.
It holds no secrets and no database access; everything goes through the FastAPI backend.

## Run

```powershell
npm install
copy .env.example .env.local   # API_URL=http://localhost:8000
npm run dev                    # http://localhost:3000
npm run typecheck; npm run build
```

## Structure

| Path | Purpose |
|---|---|
| `src/app/` | Routes. `dashboard/` holds the citizen, `officer/`, `lawyer/` and `admin/` portals |
| `src/app/api/v1/[...path]/route.ts` | Proxy to the backend; adds the JWT from the `vk_token` cookie |
| `src/middleware.ts` | Sign-in and role redirects (convenience; the backend enforces access) |
| `src/services/server.ts` | Data loaders for server components and actions; never throw |
| `src/services/*.ts` | Browser-side calls via `api()` (throws `ApiError`) |
| `src/components/features/` | Domain components: authorities, bookings, complaints, legal, notifications, officer, privacy, tracking |
| `src/lib/departments.ts` | The department list; must match `backend/app/core/departments.py` |

## Conventions

- Server components and server actions for dashboards; client components only where there's interaction.
- Handle AI-consent refusals with `isAiConsentError()` + `<AiConsentPrompt onGranted={retry} />`.
- Copy must never imply something was submitted or confirmed when it wasn't.
- After `npm run build`, restart `npm run dev` (the build overwrites `.next`).
