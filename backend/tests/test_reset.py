"""Password reset: unique 24h one-use token; admin never sees the new password."""

from __future__ import annotations

from twolate.domain import iso_from_ms, reset_token_error
from twolate.models import ResetToken


def test_create_link_and_consume_once(client, admin):
    r = client.post("/api/admin/users/u-etu/reset-link", headers=admin)
    assert r.status_code == 200, r.get_json()
    body = r.get_json()
    token = body["token"]
    assert body["path"] == f"#/reset/{token}"
    assert "password" not in body
    peek = client.get(f"/api/auth/reset/{token}")
    assert peek.status_code == 200
    assert peek.get_json()["valid"] is True
    consume = client.post("/api/auth/reset/consume", json={"token": token, "password": "nouveau"})
    assert consume.status_code == 200
    # old password no longer works
    old = client.post("/api/auth/login", json={"email": "etu@2late.com", "password": "etu"})
    assert old.status_code == 401
    new = client.post("/api/auth/login", json={"email": "etu@2late.com", "password": "nouveau"})
    assert new.status_code == 200
    # second consume fails
    again = client.post("/api/auth/reset/consume", json={"token": token, "password": "autre1"})
    assert again.status_code == 400
    assert "déjà" in again.get_json()["error"].lower()
    peek2 = client.get(f"/api/auth/reset/{token}")
    assert peek2.get_json()["valid"] is False


def test_expired_token_rejected(svc):
    now = svc.t()
    rec = ResetToken(
        token="deadbeefcafebabe0123456789abcdef012345",
        user_id="u-etu",
        created_at=iso_from_ms(now - 30 * 3600_000),
        expires_at=iso_from_ms(now - 6 * 3600_000),
    )
    svc.repo.insert_reset_token(rec)
    err = reset_token_error(rec, True, now)
    assert err is not None
    assert "expiré" in err.lower()
    try:
        svc.consume_reset_token(rec.token, "abcd")
        assert False, "expired token must raise"
    except Exception as exc:
        assert "expiré" in str(exc).lower()


def test_unknown_token_invalid(client):
    r = client.post("/api/auth/reset/consume", json={"token": "00" * 18, "password": "abcd"})
    assert r.status_code == 400
    assert "invalide" in r.get_json()["error"].lower() or "supprimé" in r.get_json()["error"].lower()


def test_admin_never_receives_new_password(client, admin):
    r = client.post("/api/admin/users/u-jean/reset-link", headers=admin)
    payload = r.get_json()
    dumped = str(payload)
    assert "jean" not in dumped.lower() or payload.get("token")
    assert "password" not in payload
    # consume privately
    client.post("/api/auth/reset/consume", json={"token": payload["token"], "password": "secret-jean"})
    members = client.get("/api/admin/members", headers=admin).get_json()["members"]
    jean = next(u for u in members if u["id"] == "u-jean")
    assert "password" not in jean
    assert jean.get("email") == "jean@2late.com"
