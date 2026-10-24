"""Isolated SQLite database for the API tests.

This file sets DATABASE_URL before the application is imported, so pytest
never reads or writes the development database.
"""

import os
import tempfile
from pathlib import Path

_test_dir = Path(tempfile.mkdtemp(prefix="ashford-tests-"))
_db_path = (_test_dir / "test.db").resolve().as_posix()
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["JWT_SECRET"] = "test-only-secret-with-enough-length"
os.environ["JWT_EXPIRE_MINUTES"] = "60"

import pytest
from fastapi.testclient import TestClient

from database import Base, SessionLocal, engine
from main import app


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def admin_token(client, db):
    """Insert an administrator directly. Public registration cannot do this."""
    from auth import hash_password
    from models import User

    admin = User(
        username="admin",
        email="admin@example.com",
        password_hash=hash_password("password123"),
        role="admin",
    )
    db.add(admin)
    db.commit()
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "password123"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def customer_token(client):
    response = client.post(
        "/api/auth/register",
        json={
            "username": "customer",
            "email": "customer@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 201, response.text
    login = client.post(
        "/api/auth/login",
        json={"username": "customer", "password": "password123"},
    )
    assert login.status_code == 200, login.text
    return login.json()["access_token"]
