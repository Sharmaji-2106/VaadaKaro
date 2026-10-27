# Deployment

Production layout: **frontend on Vercel**, **backend on Render** (`https://vaadakaro.onrender.com`,
Docker from `backend/Dockerfile`), **MongoDB Atlas**, optional **Cloudflare R2** for uploads.

## Backend (Render, Docker)

Root directory: `backend/`. Render injects `PORT`; the Dockerfile starts uvicorn with `--no-proxy-headers`.

| Variable | Required | Notes |
|---|---|---|
| `ENVIRONMENT` | yes | `production` (turns off /docs and enforces a strong JWT secret) |
| `MONGODB_URL` | yes | Atlas `mongodb+srv://…/vaadakaro`. In Atlas, allow Render's outbound IPs |
| `JWT_SECRET` | yes | 32+ random characters |
| `CORS_ORIGINS` | yes | JSON list, e.g. `["https://vaada-karo.vercel.app"]` |
| `PROXY_SHARED_SECRET` | yes | Same value as on Vercel, for per-visitor rate limits |
| `GEMINI_API_KEY` | for AI | AI features return 503 without it |
| `AI_PRIMARY_MODEL`, `AI_FALLBACK_MODEL` | no | Check current model names |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | for uploads | Uploads are off without them |
| `RATE_LIMIT_STORAGE_URI` | if more than one instance | Redis/Upstash URL |
| `GRIEVANCE_OFFICER_NAME`, `GRIEVANCE_OFFICER_EMAIL`, `GRIEVANCE_OFFICER_ADDRESS` | yes, legally | IT Rules r.3(2) |
| `PRIVACY_NOTICE_VERSION` | yes | Must match the frontend's `NOTICE_VERSION` |

Scheduled job (Render cron or similar), daily: `python -m app.cli apply-retention`.

## Frontend (Vercel)

Root directory: `frontend/`. Build `npm run build`.

| Variable | Notes |
|---|---|
| `API_URL` | Backend URL (defaults to the Render URL in production) |
| `TRUSTED_IP_HEADER` | `x-real-ip` on Vercel. Never `x-forwarded-for` |
| `PROXY_SHARED_SECRET` | Same as the backend |

## After first deploy

```
python -m app.cli create-admin you@example.com "Your Name"
python -m app.cli seed-authorities        # then check each entry in Admin › Authority directory
```

## Launch checklist

- [ ] All required variables set; `GET /health` shows `"database":"ok"` and `"ai":"configured"`
- [ ] Grievance Officer named; `/grievance` shows the name
- [ ] Authority directory entries checked against their sources
- [ ] Daily retention job scheduled
- [ ] Atlas backups enabled (M0 has none, so use M10+ or scheduled exports)
- [ ] Processor contracts signed; Gemini plan chosen
- [ ] Legal review done (see `docs/COMPLIANCE.md`)
- [ ] Tests green: `pytest`, `npm run typecheck`, `npm run build`
