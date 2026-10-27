# Indian law compliance

**Status: built to follow these laws, pending legal review. Not certified, and not "100% DPDP compliant".**
This is written from the developers' understanding of the law; have a lawyer confirm it before launch.

## What the code does

| Law | Requirement | Where it's built |
|---|---|---|
| **DPDP Act 2023** s.5 | Notice of what is collected and why, in English or a scheduled language | `/privacy` (English, Hindi, Marathi; others on request); a one-time banner for older accounts |
| s.6 | Consent: specific, recorded, withdrawable as easily as given | `consent_records` with notice version; AI consent separate and optional; Settings switch |
| s.6(10) | Prove consent | Append-only consent records, kept after account deletion (ids only) |
| s.8(6) + DPDP Rules 2025 | Tell affected people and the Board about breaches (Board within 72 hours) | Admin › Data breaches |
| s.8(7) | Erase data once its purpose is over | `apply-retention` CLI; erase on account deletion; erase assistant history on AI-consent withdrawal |
| s.9 | Verifiable parental consent for under-18s | Not offered, so signup is 18+ only |
| s.11–12 | Access, correction, erasure | Settings › Download / Delete; correction through the Grievance Officer |
| s.13 | Grievance redressal | `/grievance` and Admin › Grievance Officer |
| s.14 | Nominate someone | Settings › Nominee |
| **IT Rules 2021** r.3(1)(b) | Tell users what they may not post | Terms › Acceptable use |
| r.3(2) | Named Grievance Officer; acknowledge in 24h, resolve in 15 days | `GRIEVANCE_OFFICER_*` env vars; auto-acknowledge; overdue flags |
| **CERT-In directions (2022)** | Report incidents within 6 hours; keep logs | Breach page deadline tracker; audit logs never purged |
| **BCI Rules** Part VI Ch. II r.36 | Advocates may not advertise or solicit | No ratings, neutral order, disclaimer gate, factual profiles |
| **BNS / BNSS / BSA** (from 1 July 2024) | Current criminal law; victim anonymity (BNS s.72) | AI prompt reference list and rules in `services/ai/prompts.py` |
| **BNS s.217** | False complaints are an offence | Declaration on the complaint form and in the Terms |

## Still open

**In code:**
- Email delivery: notices currently reach people in the app only.
- Real age verification: currently self-declared.
- Nominee requests are verified by hand.

**Outside code (owner's job):**
- Appoint and name the Grievance Officer (`GRIEVANCE_OFFICER_NAME`, `GRIEVANCE_OFFICER_ADDRESS`).
- Sign data-processing contracts with Vercel, Render, MongoDB Atlas, Cloudflare and Google.
- Use a Gemini plan that doesn't keep prompts for training; database backups; a security audit.
- Legal review, including the DPDP Rules' phased dates and the State Bar Council names on lawyer profiles.

## When you change something

- **Privacy notice text:** bump `PRIVACY_NOTICE_VERSION` (backend) and `NOTICE_VERSION` (`frontend/src/app/privacy/page.tsx`) together.
- **New personal data or a new purpose:** update `/privacy`, decide its retention, and add it to `GET /account/export`.
- **New AI feature:** use the `AIUser` dependency and handle `AI consent required` in the UI with `<AiConsentPrompt>`.
