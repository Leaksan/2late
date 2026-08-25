"""Auth block: login, register, hashing, disabled accounts, no password leaks."""

from __future__ import annotations

from werkzeug.security import check_password_hash

from tests.conftest import auth_header
from twolate.domain import public_user


def test_demo_credentials_login(client):
    # Les comptes applicatifs passent par le flux principal…
    for email, password, role in (
        ("prof@2late.com", "prof", "PROF"),
        ("marc@2late.com", "marc", "RELAIS"),
        ("etu@2late.com", "etu", "ETUDIANT"),
    ):
        r = client.post("/api/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, r.get_json()
        user = r.get_json()["user"]
        assert user["role"] == role
    # …et le compte ADMIN peut aussi consulter le site principal…
    r = client.post("/api/auth/login", json={"email": "admin@2late.com", "password": "admin"})
    assert r.status_code == 200, r.get_json()
    assert r.get_json()["user"]["role"] == "ADMIN"
    # …mais son interface dédiée exige son identifiant administrateur.
    r = client.post("/api/admin/login", json={"username": "admin", "password": "admin"})
    assert r.status_code == 200, r.get_json()
    assert r.get_json()["user"]["role"] == "ADMIN"


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


def test_frontend_dist_env_is_honored(tmp_path, monkeypatch):
    from pathlib import Path

    from twolate.app import create_app

    dist = tmp_path / "spa"
    dist.mkdir()
    (dist / "index.html").write_text("<!doctype html><title>2late</title>", encoding="utf-8")
    monkeypatch.setenv("TWOLATE_FRONTEND_DIST", str(dist))
    application = create_app(
        {"TESTING": True, "DATABASE": str(tmp_path / "env.db"), "UPLOADS": str(tmp_path / "up")}
    )
    assert Path(application.static_folder).resolve() == dist.resolve()
    application.db.close()


def test_logout_invalidates_session(client, etu):
    r = client.get("/api/auth/me", headers=etu)
    assert r.status_code == 200
    client.post("/api/auth/logout", headers=etu)
    r = client.get("/api/auth/me", headers=etu)
    assert r.status_code == 401


def test_admin_can_browse_main_site(client):
    """L'admin peut consulter le site applicatif avec son compte (e-mail)."""
    r = client.post("/api/auth/login", json={"email": "admin@2late.com", "password": "admin"})
    assert r.status_code == 200
    assert r.get_json()["user"]["role"] == "ADMIN"


def test_admin_interface_requires_username(client):
    """L'interface dédiée : identifiant admin + mot de passe."""
    ok = client.post("/api/admin/login", json={"username": "admin", "password": "admin"})
    assert ok.status_code == 200
    bad_pw = client.post("/api/admin/login", json={"username": "admin", "password": "nope"})
    assert bad_pw.status_code == 401
    # Les comptes non-admin n'ont pas d'identifiant admin : refus.
    not_admin = client.post("/api/admin/login", json={"username": "etu", "password": "etu"})
    assert not_admin.status_code == 401
    body = ok.get_json()
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_change_own_password(client):
    """Changement de mot de passe : ancien requis, 6 caractères minimum."""
    headers = auth_header(client, "etu@2late.com", "etu")
    r = client.post("/api/auth/password", json={"currentPassword": "wrong", "newPassword": "nouveau123"}, headers=headers)
    assert r.status_code == 403
    r = client.post("/api/auth/password", json={"currentPassword": "etu", "newPassword": "123"}, headers=headers)
    assert r.status_code == 400
    r = client.post("/api/auth/password", json={"currentPassword": "etu", "newPassword": "nouveau123"}, headers=headers)
    assert r.status_code == 200
    # l'ancien ne marche plus, le nouveau oui
    assert client.post("/api/auth/login", json={"email": "etu@2late.com", "password": "etu"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "etu@2late.com", "password": "nouveau123"}).status_code == 200
