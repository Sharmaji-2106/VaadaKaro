# VaadaKaro: what's built (status as of 26 Oct 2026)

Citizen grievance and legal-help platform. Next.js frontend, FastAPI backend, MongoDB Atlas.
Not yet committed. Backend: 43 tests passing. Frontend: type-check and build pass.

## Portals

**Citizen**
- File and track complaints; AI quality check on the complaint.
- Draft a complaint letter (Hindi, Marathi, English, voice input), with a fact check and **"Where to send it"** taken from the verified authority directory.
- **My documents** (`/dashboard/documents`): edit, download PDF, and record *sent to whom, reference, reply*. VaadaKaro never submits anything for you.
- **My consultations** (`/dashboard/bookings`): lawyer bookings, cancel.
- **Where to complain** (`/authorities`): official offices by department, state and district, each with its source and last-checked date.
- Legal assistant, legal document drafts, notifications.

**Officer**
- Overview with open urgent and high-priority complaints; complaint list, detail, status updates, assignment. Officers see only their own department.

**Lawyer** (`/dashboard/lawyer`)
- Overview, consultation inbox (confirm, decline, complete, cancel with a note), public profile.
- Contact details are shared with the citizen only after the lawyer confirms.

**Admin**
- Reports, **pilot metrics**, users and roles, **lawyer verification**, **authority directory**, **Grievance Officer queue**, **data breaches**, audit log.

## Indian law compliance

| Law | What's built |
|---|---|
| DPDP Act 2023 | Consent recorded per purpose with the notice version; AI consent is separate, optional and withdrawable (withdrawing also erases assistant history); signup is 18+ only; download my data; delete account; nominee; existing users shown the new notice once; retention job; breach notices. |
| IT Rules 2021 | Grievance Officer page (`/grievance`): requests acknowledged at once and answered within 15 days, overdue ones flagged; prohibited-content list in the Terms. |
| CERT-In 2022 / DPDP Rules 2025 | Breach page tracks the 6-hour CERT-In and 72-hour Board deadlines and notifies affected users. |
| BCI Rule 36 | No lawyer ratings, neutral ordering, a no-solicitation disclaimer, enrolment details on profiles. |
| BNS / BNSS / BSA | AI cites only a checked list of laws, uses the IPC for incidents before 1 July 2024 and BNS from that date, and never names victims of sexual offences. |

Privacy and Terms pages were rewritten to match what the system actually does, with Hindi and Marathi summaries.

## Useful commands (in `backend/`)

```
python -m app.cli create-admin you@example.com "Name"
python -m app.cli seed-lawyers                 # demo lawyers (no password)
python -m app.cli set-password <email>         # lets a demo lawyer log in
python -m app.cli seed-authorities             # national portals, UNVERIFIED
python -m app.cli apply-retention [--dry-run]  # run daily
.\.venv\Scripts\pytest                         # tests (~5 min against Atlas)
```

## Still to do before launch

- **Not 100% DPDP compliant yet.** Describe it as "built to follow the DPDP Act, pending legal review".
- Appoint a Grievance Officer and set `GRIEVANCE_OFFICER_NAME` / `GRIEVANCE_OFFICER_ADDRESS` in `backend/.env`.
- Set `GEMINI_API_KEY` (AI features are off without it); prefer a paid Gemini plan.
- Connect an email provider (messages are in-app only for now) and R2 (uploads are off).
- Check each seeded authority entry against its official site.
- Sign data-processing contracts with Vercel, Render, MongoDB Atlas, Cloudflare and Google; set up database backups.
- Real age verification, if needed.
- Legal review, then a small pilot with real users (report Phase 4).
