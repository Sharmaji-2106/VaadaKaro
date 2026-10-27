import enum


class Department(enum.StrEnum):
    """Must match DEPARTMENTS in frontend/src/lib/departments.ts: officers, complaints and the
    authority directory all match on these exact names."""

    POLICE = "Police"
    MUNICIPAL = "Municipal Corporation"
    ELECTRICITY = "Electricity"
    WATER = "Water Supply"
    ROADS = "Road & Infrastructure"
    CYBER = "Cyber Crime"
    CONSUMER = "Consumer Court"
    WOMEN = "Women Safety"
    OTHER = "Other"
