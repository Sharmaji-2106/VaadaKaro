"""Admin bootstrap and demo data. Signup only ever creates citizens, so the first admin is made here.

    python -m app.cli create-admin admin@example.com "Admin Name"
    python -m app.cli seed-lawyers
    python -m app.cli set-password rahul.lawyer@example.com   # seeded lawyers have no password
    python -m app.cli seed-authorities                         # national portals, unverified
    python -m app.cli apply-retention [--dry-run]              # daily: erase expired personal data
"""

import argparse
import asyncio
import getpass
from datetime import timedelta

from app.core.config import get_settings
from app.core.database import close_db, init_db
from app.core.ids import utcnow
from app.core.security import hash_password
from app.models import AILegalHistory, Authority, LawyerProfile, Notification, User, UserRole
from app.services.audit import log_action

_NATIONAL_AUTHORITIES = [
    {
        "name": "CPGRAMS (Centralised Public Grievance Redress and Monitoring System)",
        "department": "Other",
        "how_to_submit": "Register on the portal and lodge the grievance against the central ministry or "
        "department concerned. Keep the registration number it gives you to track the grievance.",
        "submission_url": "https://pgportal.gov.in",
        "source_url": "https://pgportal.gov.in",
    },
    {
        "name": "National Consumer Helpline",
        "department": "Consumer Court",
        "how_to_submit": "Register the complaint online or call the helpline. It tries to settle the dispute "
        "with the company before you go to a consumer commission.",
        "submission_url": "https://consumerhelpline.gov.in",
        "phone": "1915",
        "source_url": "https://consumerhelpline.gov.in",
    },
    {
        "name": "e-Daakhil (online filing for Consumer Commissions)",
        "department": "Consumer Court",
        "how_to_submit": "File a formal complaint to the District, State or National Consumer Commission "
        "online, depending on the value of the claim. Attach bills, receipts and correspondence.",
        "submission_url": "https://edaakhil.nic.in",
        "source_url": "https://edaakhil.nic.in",
    },
    {
        "name": "National Cyber Crime Reporting Portal",
        "department": "Cyber Crime",
        "how_to_submit": "Report online. For money lost to online fraud, call the helpline as soon as "
        "possible so the transaction can be flagged.",
        "submission_url": "https://cybercrime.gov.in",
        "phone": "1930",
        "source_url": "https://cybercrime.gov.in",
    },
    {
        "name": "Emergency Response Support System (112)",
        "department": "Police",
        "how_to_submit": "For emergencies, call 112. For non-urgent complaints, write to or visit the police "
        "station that covers the place where it happened.",
        "phone": "112",
        "source_url": "https://112.gov.in",
    },
    {
        "name": "National Commission for Women",
        "department": "Women Safety",
        "how_to_submit": "Register a complaint with the Commission online. In an emergency, call 112 first.",
        "source_url": "https://ncw.nic.in",
    },
]

_DEMO_LAWYERS = [
    {
        "name": "Adv. Rahul Deshmukh",
        "email": "rahul.lawyer@example.com",
        "location": "Mumbai",
        "profile": {
            "bar_number": "MAH/1234/2010",
            "specialization": ["Criminal", "RTI"],
            "pincode": "400001",
            "fees": 1500,
            "experience": 12,
            "languages": ["English", "Marathi", "Hindi"],
            # Plain facts only: BCI r.36 does not allow self-praise such as "expert".
            "bio": "Practises criminal defence and RTI matters before the Bombay High Court.",
            "state_bar_council": "Bar Council of Maharashtra and Goa",
            "enrolment_year": 2010,
        },
    },
    {
        "name": "Adv. Priya Kulkarni",
        "email": "priya.lawyer@example.com",
        "location": "Pune",
        "profile": {
            "bar_number": "MAH/5678/2015",
            "specialization": ["Consumer", "Family"],
            "pincode": "411001",
            "fees": 1000,
            "experience": 8,
            "languages": ["English", "Marathi", "Hindi"],
            "bio": "Practises consumer protection and family law.",
            "state_bar_council": "Bar Council of Maharashtra and Goa",
            "enrolment_year": 2015,
        },
    },
]


async def create_admin(email: str, name: str, password: str) -> None:
    await init_db()
    try:
        user = await User.find_one(User.email == email.lower())
        if user is None:
            user = User(email=email.lower(), name=name, password=hash_password(password))
        user.role = UserRole.ADMIN
        await user.save()
        await log_action(user_id=None, action="ADMIN_CREATED_VIA_CLI", entity="USER", entity_id=user.id)
        print(f"{email} is now an admin (id {user.id})")
    finally:
        await close_db()


async def set_password(email: str, password: str) -> None:
    await init_db()
    try:
        user = await User.find_one(User.email == email.lower())
        if user is None:
            raise SystemExit(f"No user with email {email}")
        user.password = hash_password(password)
        await user.save()
        await log_action(user_id=None, action="PASSWORD_SET_VIA_CLI", entity="USER", entity_id=user.id)
        print(f"Password set for {email} ({user.role.value.lower()})")
    finally:
        await close_db()


async def seed_lawyers() -> None:
    """Idempotent: existing emails are left alone."""
    await init_db()
    try:
        for lawyer in _DEMO_LAWYERS:
            if await User.find_one(User.email == lawyer["email"]):
                print(f"skip {lawyer['email']} (exists)")
                continue
            user = await User(
                name=lawyer["name"], email=lawyer["email"], role=UserRole.LAWYER, location=lawyer["location"]
            ).insert()
            await LawyerProfile(user_id=user.id, location=lawyer["location"], **lawyer["profile"]).insert()
            print(f"added {lawyer['email']}")
    finally:
        await close_db()


async def seed_authorities() -> None:
    """Nationwide portals as unverified starting entries. Idempotent by name.

    They are deliberately not marked verified: an admin checks each against its source in the
    Authority directory screen, which records who verified it and when.
    """
    await init_db()
    try:
        for entry in _NATIONAL_AUTHORITIES:
            if await Authority.find_one(Authority.name == entry["name"]):
                print(f"skip {entry['name']} (exists)")
                continue
            await Authority(**entry).insert()
            print(f"added {entry['name']} (unverified)")
    finally:
        await close_db()


async def apply_retention(dry_run: bool) -> None:
    """Erases personal data whose purpose is over (DPDP Act s.8(7)). Run daily, e.g. from cron.

    Audit logs and consent records are never deleted here: the DPDP Rules and the CERT-In
    directions require logs to be kept, and consent records are the proof of consent.
    """
    s = get_settings()
    await init_db()
    try:
        now = utcnow()
        targets = [
            (
                "read notifications",
                Notification.find(
                    Notification.is_read == True,  # noqa: E712
                    Notification.created_at < now - timedelta(days=s.retain_read_notifications_days),
                ),
            ),
            (
                "assistant history",
                AILegalHistory.find(
                    AILegalHistory.created_at < now - timedelta(days=s.retain_assistant_history_days)
                ),
            ),
        ]
        for label, query in targets:
            count = await query.count()
            if not dry_run and count:
                await query.delete()
            print(f"{'would delete' if dry_run else 'deleted'} {count} {label}")
        if not dry_run:
            await log_action(user_id=None, action="RETENTION_APPLIED", entity="SYSTEM", entity_id="retention")
    finally:
        await close_db()


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("create-admin")
    p.add_argument("email")
    p.add_argument("name")
    sub.add_parser("seed-lawyers")
    sub.add_parser("seed-authorities")
    p = sub.add_parser("apply-retention")
    p.add_argument("--dry-run", action="store_true")
    p = sub.add_parser("set-password")
    p.add_argument("email")
    args = parser.parse_args()

    if args.command == "apply-retention":
        asyncio.run(apply_retention(args.dry_run))
        return
    if args.command == "seed-lawyers":
        asyncio.run(seed_lawyers())
        return
    if args.command == "seed-authorities":
        asyncio.run(seed_authorities())
        return

    password = getpass.getpass("Password (min 8 chars): ")
    if len(password) < 8:
        raise SystemExit("Password too short")
    if args.command == "set-password":
        asyncio.run(set_password(args.email, password))
    else:
        asyncio.run(create_admin(args.email, args.name, password))


if __name__ == "__main__":
    main()
