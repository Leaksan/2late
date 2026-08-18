"""Auth block: login, register, hashing, disabled accounts, no password leaks."""

from __future__ import annotations

from werkzeug.security import check_password_hash

from tests.conftest import auth_header
from twolate.domain import public_user


def test_demo_credentials_login(client):
    for email, password, role in (
        ("admin@2late.com", "admin", "ADMIN"),
        ("prof@2late.com", "prof", "PROF"),
        ("marc@2late.com", "marc", "RELAIS"),
        ("etu@2late.com", "etu", "ETUDIANT"),
    ):
        r = client.post("/api/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, r.get_json()
        user = r.get_json()["user"]
        assert user["role"] == role
        assert user["email"] == email
        assert "password" not in user
        assert "password_hash" not in user


def test_wrong_password_rejected(client):
    r = client.post("/api/auth/login", json={"email": "etu@2late.com", "password": "nope"})
    assert r.status_code == 401
    assert "incorrect" in r.get_json()["error"].lower()


def test_disabled_account_rejected(client, admin, svc):
    target = svc.repo.user_by_email("etu@2late.com")
    r = client.post(f"/api/admin/users/{target.id}/disabled", json={"disabled": True}, headers=admin)
    assert r.status_code == 200
    r = client.post("/api/auth/login", json={"email": "etu@2late.com", "password": "etu"})
    assert r.status_code == 403
    assert "désactivé" in r.get_json()["error"].lower()


def test_passwords_are_hashed_never_plaintext(svc):
    user = svc.repo.user_by_email("etu@2late.com")
    assert user.password_hash != "etu"
    assert "pbkdf2" in user.password_hash or user.password_hash.startswith("scrypt")
    assert check_password_hash(user.password_hash, "etu")
    dumped = public_user(user)
    assert "password" not in dumped
    assert "password_hash" not in dumped


def test_register_student_and_login(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "Grace Ondo", "email": "grace@univ.ga", "password": "grace", "pole": "SVT"},
    )
    assert r.status_code == 200, r.get_json()
    user = r.get_json()["user"]
    assert user["role"] == "ETUDIANT"
    assert user["pole"] == "SVT"
    assert "password" not in user
    r2 = client.post("/api/auth/login", json={"email": "grace@univ.ga", "password": "grace"})
    assert r2.status_code == 200


def test_register_duplicate_email(client):
    r = client.post(
        "/api/auth/register",
        json={"name": "X", "email": "etu@2late.com", "password": "xxxx", "pole": "STI"},
    )
    assert r.status_code == 400
    assert "existe déjà" in r.get_json()["error"]


def test_logout_invalidates_session(client, etu):
    r = client.get("/api/auth/me", headers=etu)
    assert r.status_code == 200
    client.post("/api/auth/logout", headers=etu)
    r = client.get("/api/auth/me", headers=etu)
    assert r.status_code == 401
