"""Admin stats, members, cascade delete, staff creation."""

from __future__ import annotations


def test_admin_stats_and_members_seeded(client, admin):
    stats = client.get("/api/admin/stats", headers=admin)
    assert stats.status_code == 200
    body = stats.get_json()
    assert body["members"] >= 11
    assert body["students"] >= 8
    assert body["relais"] >= 1
    assert body["announcements"] >= 10
    assert body["pendingApplications"] >= 1
    assert body["byPole"]["STI"] >= 3
    members = client.get("/api/admin/members", headers=admin)
    assert members.status_code == 200
    people = members.get_json()["members"]
    assert len(people) >= 11
    emails = {u["email"] for u in people}
    assert "admin@2late.com" in emails
    assert "etu@2late.com" in emails
    for u in people:
        assert "password" not in u
        assert "password_hash" not in u


def test_student_cannot_hit_admin(client, etu):
    assert client.get("/api/admin/stats", headers=etu).status_code == 403
    assert client.get("/api/admin/members", headers=etu).status_code == 403


def test_create_prof_account(client, admin):
    r = client.post(
        "/api/admin/users",
        json={"name": "Pr. Anne Mba", "email": "anne@univ.ga", "password": "anne1", "role": "PROF"},
        headers=admin,
    )
    assert r.status_code == 201, r.get_json()
    assert r.get_json()["role"] == "PROF"
    assert "password" not in r.get_json()
    login = client.post("/api/auth/login", json={"email": "anne@univ.ga", "password": "anne1"})
    assert login.status_code == 200


def test_cascade_delete_user_removes_their_announcements(client, admin, etu, svc):
    # delete marc — announcements a3, a4, a7 plus votes on them
    r = client.delete("/api/admin/users/u-marc", headers=admin)
    assert r.status_code == 200
    assert svc.repo.user_by_id("u-marc") is None
    assert svc.repo.announcement("a3") is None
    assert svc.repo.announcement("a4") is None
    feed = client.get("/api/feed", headers=etu).get_json()["announcements"]
    ids = {a["id"] for a in feed}
    assert "a3" not in ids
    assert "a4" not in ids
    assert "a1" in ids  # prof's announcement remains


def test_admin_announcements_include_unpublished_and_can_override(client, admin):
    r = client.get("/api/admin/announcements", headers=admin)
    assert r.status_code == 200
    anns = r.get_json()["announcements"]
    ids = {a["id"] for a in anns}
    assert "a10" in ids  # future publishAt — hidden from student feed, visible to admin
    assert "a1" in ids
    relais = next(a for a in anns if a["id"] == "a4")
    assert relais["author"]["role"] == "RELAIS"
    ov = client.post("/api/announcements/a4/reliability", json={"pct": 99}, headers=admin)
    assert ov.status_code == 200
    assert ov.get_json()["overridden"] is True
    assert ov.get_json()["pct"] == 99
    gone = client.delete("/api/announcements/a7", headers=admin)
    assert gone.status_code == 200
    after = {a["id"] for a in client.get("/api/admin/announcements", headers=admin).get_json()["announcements"]}
    assert "a7" not in after


def test_export_json_has_no_passwords(client, admin):
    r = client.get("/api/admin/export", headers=admin)
    assert r.status_code == 200
    raw = r.get_data(as_text=True)
    assert "password" not in raw.lower() or "password_hash" not in raw
    assert '"password"' not in raw
    assert "password_hash" not in raw
    body = r.get_json()
    assert body["users"]
    assert body["announcements"]
