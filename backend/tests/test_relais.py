"""Relais candidature rules."""

from __future__ import annotations


def test_motivation_min_10_and_whatsapp_required(client, etu):
    r = client.post("/api/relais/apply", json={"message": "short", "whatsapp": "+241 06 11 22 33"}, headers=etu)
    assert r.status_code == 400
    assert "10" in r.get_json()["error"]
    r = client.post(
        "/api/relais/apply",
        json={"message": "Je relais déjà les infos du pôle chaque jour.", "whatsapp": "12"},
        headers=etu,
    )
    assert r.status_code == 400
    assert "whatsapp" in r.get_json()["error"].lower()


def test_apply_and_duplicate_pending(client, etu):
    r = client.post(
        "/api/relais/apply",
        json={
            "message": "Je relais déjà les infos du pôle chaque jour sur WhatsApp.",
            "whatsapp": "+241 06 11 22 33",
        },
        headers=etu,
    )
    assert r.status_code == 201, r.get_json()
    r2 = client.post(
        "/api/relais/apply",
        json={
            "message": "Deuxième tentative qui devrait être refusée par le système.",
            "whatsapp": "+241 06 11 22 33",
        },
        headers=etu,
    )
    assert r2.status_code == 400
    assert "déjà" in r2.get_json()["error"].lower()


def test_relais_cannot_apply(client, marc):
    r = client.post(
        "/api/relais/apply",
        json={"message": "Je suis déjà relais mais je retente quand même.", "whatsapp": "+241 06 77 88 99"},
        headers=marc,
    )
    assert r.status_code == 403


def test_admin_approves_promotes_to_relais(client, admin, svc):
    apps = client.get("/api/admin/applications", headers=admin).get_json()["applications"]
    pending = next(a for a in apps if a["status"] == "PENDING")
    assert pending["userId"] == "u-nadia"
    r = client.post("/api/relais/decide", json={"applicationId": pending["id"], "approve": True}, headers=admin)
    assert r.status_code == 200
    nadia = svc.repo.user_by_id("u-nadia")
    assert nadia.role == "RELAIS"
