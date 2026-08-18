"""Announcements, feed visibility, URGENTE authorization, publish/read."""

from __future__ import annotations


def test_student_feed_is_pole_sti_and_published_only(client, etu):
    r = client.get("/api/feed?tab=toRead", headers=etu)
    assert r.status_code == 200
    body = r.get_json()
    anns = body["announcements"]
    assert isinstance(anns, list)
    ids = {a["id"] for a in anns}
    titles = {a["title"] for a in anns}
    # STI-visible unread: a1, a3, a4, a8, a9 (a5 already read, a10 unpublished, a2 MPI-only)
    assert "a1" in ids
    assert "a3" in ids
    assert "a4" in ids
    assert "a8" in ids
    assert "a9" in ids
    assert "a2" not in ids  # MPI only
    assert "a6" not in ids  # SHS/SEDG
    assert "a7" not in ids  # SVT
    assert "a10" not in ids  # publishAt in the future
    assert all("STI" in a["poles"] or set(a["poles"]) >= {"STI"} or "STI" in a["poles"] for a in anns)
    for a in anns:
        assert "password" not in a
        assert a.get("publishAt") is None or a["id"] != "a10"
    # urgente first
    assert anns[0]["priority"] == "URGENTE"
    assert "Algorithmique" in titles or anns[0]["id"] == "a1"


def test_seen_feed_sorted_by_read_time(client, etu):
    r = client.get("/api/feed?tab=seen", headers=etu)
    assert r.status_code == 200
    ids = [a["id"] for a in r.get_json()["announcements"]]
    assert "a5" in ids
    assert "a10" not in ids


def test_student_cannot_publish_urgente(client, etu):
    r = client.post(
        "/api/announcements",
        json={
            "title": "Fausse urgence",
            "type": "GENERALE",
            "poles": ["STI"],
            "priority": "URGENTE",
        },
        headers=etu,
    )
    assert r.status_code == 403
    assert "urgente" in r.get_json()["error"].lower()
    # must not have been persisted
    feed = client.get("/api/feed", headers=etu).get_json()["announcements"]
    assert all(a["title"] != "Fausse urgence" for a in feed)


def test_student_cannot_publish_at_all(client, etu):
    r = client.post(
        "/api/announcements",
        json={"title": "Hello", "type": "GENERALE", "poles": ["STI"], "priority": "NORMALE"},
        headers=etu,
    )
    assert r.status_code in (400, 403)
    assert "droit" in r.get_json()["error"].lower() or "publier" in r.get_json()["error"].lower()


def test_prof_can_publish_urgente(client, prof, etu):
    r = client.post(
        "/api/announcements",
        json={
            "title": "Urgence officielle",
            "type": "EVALUATION",
            "poles": ["STI"],
            "priority": "URGENTE",
            "description": "Présence obligatoire.",
        },
        headers=prof,
    )
    assert r.status_code == 201, r.get_json()
    created = r.get_json()
    assert created["priority"] == "URGENTE"
    feed = client.get("/api/feed", headers=etu).get_json()["announcements"]
    assert feed[0]["id"] == created["id"]
    assert feed[0]["priority"] == "URGENTE"


def test_relais_cannot_set_urgente(client, marc):
    r = client.post(
        "/api/announcements",
        json={"title": "Relais urgent", "type": "GENERALE", "poles": ["STI"], "priority": "URGENTE"},
        headers=marc,
    )
    assert r.status_code == 403
    assert "urgente" in r.get_json()["error"].lower()


def test_mark_read_moves_to_seen(client, etu):
    before = {a["id"] for a in client.get("/api/feed?tab=toRead", headers=etu).get_json()["announcements"]}
    assert "a1" in before
    r = client.post("/api/announcements/a1/read", headers=etu)
    assert r.status_code == 200
    after = {a["id"] for a in client.get("/api/feed?tab=toRead", headers=etu).get_json()["announcements"]}
    seen = {a["id"] for a in client.get("/api/feed?tab=seen", headers=etu).get_json()["announcements"]}
    assert "a1" not in after
    assert "a1" in seen


def test_repeat_weekly_returns_to_unread_after_cycle(svc):
    from twolate.domain import feeds, iso_from_ms

    user = svc.repo.user_by_id("u-etu")
    anns = svc.repo.all_announcements()
    a9 = next(a for a in anns if a.id == "a9")
    assert a9.repeat == "WEEKLY"
    now = svc.t()
    reads = svc.repo.all_reads()
    # simulate a stale read 8 days ago
    svc.repo.upsert_read("a9", "u-etu", iso_from_ms(now - 8 * 24 * 3600_000))
    packed = feeds(user, svc.repo.all_announcements(), svc.repo.all_reads(), now)
    assert any(a.id == "a9" for a in packed["toRead"])


def test_comment_on_announcement(client, etu):
    r = client.post("/api/announcements/a1/comments", json={"body": "Merci pour la précision."}, headers=etu)
    assert r.status_code == 201
    detail = client.get("/api/announcements/a1", headers=etu).get_json()
    assert any(c["body"] == "Merci pour la précision." for c in detail["comments"])
    assert "password" not in (detail["comments"][-1].get("author") or {})
