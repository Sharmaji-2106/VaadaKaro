"""Admin bootstrap and demo data. Signup only ever creates citizens, so the first admin is made here.

    python -m app.cli create-admin admin@example.com "Admin Name"
    python -m app.cli seed-lawyers
"""

import argparse
import asyncio
import getpass

from app.core.database import close_db, init_db
from app.core.security import hash_password
from app.models import LawyerProfile, User, UserRole
from app.services.audit import log_action

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
            "bio": "Expert in criminal defense and RTI matters with over 12 years of experience in Bombay High Court.",
            "rating": 4.8,
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
            "bio": "Specialized in consumer protection and family law disputes.",
            "rating": 4.9,
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


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("create-admin")
    p.add_argument("email")
    p.add_argument("name")
    sub.add_parser("seed-lawyers")
    args = parser.parse_args()

    if args.command == "seed-lawyers":
        asyncio.run(seed_lawyers())
        return

    password = getpass.getpass("Password (min 8 chars): ")
    if len(password) < 8:
        raise SystemExit("Password too short")
    asyncio.run(create_admin(args.email, args.name, password))


if __name__ == "__main__":
    main()
