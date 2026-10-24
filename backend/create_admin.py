"""Create one administrator account for local development.

Reads ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD from the environment
or from backend/.env. It does not change an account that already exists.

PowerShell, from the backend folder:

    $env:ADMIN_USERNAME = "admin"
    $env:ADMIN_EMAIL = "admin@example.com"
    $env:ADMIN_PASSWORD = "change-this-password"
    python create_admin.py
"""

import os
import sys

from sqlalchemy import or_, select

from auth import hash_password
from database import Base, SessionLocal, engine
from models import User


def main():
    username = os.getenv("ADMIN_USERNAME", "").strip()
    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")

    if not username or not email or len(password) < 8:
        print("Set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 8 characters).")
        sys.exit(1)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(or_(User.username == username, User.email == email)))
        if existing is not None:
            print("A user with that username or email already exists. No account was changed.")
            sys.exit(1)

        db.add(
            User(
                username=username,
                email=email,
                password_hash=hash_password(password),
                role="admin",
            )
        )
        db.commit()
        print(f"Administrator '{username}' created.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
