# Security

## Reporting a vulnerability

Email the Grievance Officer address in `GRIEVANCE_OFFICER_EMAIL` (default `grievance@vaadakaro.in`) with
steps to reproduce. Please don't open a public issue or test against other people's data.

## What's in place

- JWT in an httpOnly cookie, bcrypt password hashes, every permission checked on the server.
- Officers see only their department; role changes are admin-only and audit-logged.
- Rate limits on sign-in, signup, AI and grievance endpoints; failed logins capped per email.
- Uploads are type- and size-checked in presigned R2 URLs; links expire in minutes.
- AI input is wrapped as data (prompt-injection guard); citizen text is never logged in metrics.
- Audit log of important actions, never purged.

## If there's an incident

1. Contain it (rotate `JWT_SECRET` and keys, lock access).
2. **Within 6 hours** of noticing: report to CERT-In (incident@cert-in.org.in / www.cert-in.org.in).
3. Admin › **Data breaches**: record it and notify affected users without delay.
4. **Within 72 hours**: detailed report to the Data Protection Board of India.
5. Mark both reports done on the breach page.
