"""Shared fixtures — each test gets a fresh seeded SQLite database."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from twolate.app import create_app  # noqa: E402


@pytest.fixture()
def app(tmp_path):
    application = create_app(
        {
            "TESTING": True,
            "DATABASE": str(tmp_path / "2late.db"),
            "UPLOADS": str(tmp_path / "uploads"),
        }
    )
    yield application
    application.db.close()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def svc(app):
    return app.services


def auth_header(client, email: str, password: str, admin: bool = False) -> dict:
    r = client.post(
        "/api/admin/login",
        json={"username": email.split("@")[0], "password": password},
    ) if admin else client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert r.status_code == 200, r.get_json()
    body = r.get_json()
    assert "password" not in body
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]
    return {"Authorization": f"Bearer {body['token']}"}


@pytest.fixture()
def etu(client):
    return auth_header(client, "etu@2late.com", "etu")


@pytest.fixture()
def admin(client):
    return auth_header(client, "admin@2late.com", "admin", admin=True)


@pytest.fixture()
def prof(client):
    return auth_header(client, "prof@2late.com", "prof")


@pytest.fixture()
def marc(client):
    return auth_header(client, "marc@2late.com", "marc")
