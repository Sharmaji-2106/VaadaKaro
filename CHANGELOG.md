# Changelog

## 2026-10-26: report features, all portals, Indian-law compliance (uncommitted)

**Portals**
- Lawyer portal: overview, consultation inbox (confirm, decline, complete, cancel), public profile.
- Citizen: My consultations, My documents with sent and reply tracking, Where to complain directory.
- Admin: lawyer verification, authority directory, pilot metrics, Grievance Officer queue, data breaches.
- Officer: high-priority list on the overview.

**From the project report**
- Verified authority directory; the letter drafter shows matches with source and last-checked date.
- Success metrics from count-only audit events.
- Data export and account deletion.

**Compliance**
- DPDP: per-purpose consent records, separate AI consent, 18+ signup, nominee, notice for older accounts, retention CLI, breach notices.
- IT Rules: Grievance Officer page with a 24h / 15-day clock; prohibited-content list in the Terms.
- BCI Rule 36: no lawyer ratings, neutral order, disclaimer, enrolment details.
- AI prompts: Indian-law reference list, BNS/BNSS cut-over date, victim anonymity.

**Fixes**
- Booking screen no longer says "You're booked"; it's a request until the lawyer confirms.
- Removed unsupported privacy claims (AES-256, NextAuth, "stored in India", "no training", 30-day replies).

## 2026-10-25: MongoDB

- Backend moved from Postgres/Prisma to MongoDB Atlas (Beanie). Old data not migrated.

## Earlier

- `db728c9` Point production frontend at the Render backend.
- `f3e5270` Next.js frontend + FastAPI backend.
