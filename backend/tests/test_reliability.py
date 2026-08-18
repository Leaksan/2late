"""Reliability votes: toggle, audience, author/prof exclusion, 70% badge, admin override."""

from __future__ import annotations

from twolate.domain import can_vote_on, reliability_badge, reliability_of, reliability_of_ann
from twolate.models import Vote


def test_can_vote_rules_pure(svc):
    etu = svc.repo.user_by_id("u-etu")
    marc = svc.repo.user_by_id("u-marc")
    a3 = svc.repo.announcement("a3")  # RELAIS authored, STI+MPI
    a1 = svc.repo.announcement("a1")  # PROF authored
    a4 = svc.repo.announcement("a4")  # RELAIS authored, STI
    a7 = svc.repo.announcement("a7")  # RELAIS authored, SVT
    author_marc = marc
    author_prof = svc.repo.user_by_id("u-prof")
    assert can_vote_on(etu, a3, author_marc) is True
    assert can_vote_on(etu, a4, author_marc) is True
    assert can_vote_on(etu, a1, author_prof) is False  # PROF announcement
    assert can_vote_on(marc, a3, author_marc) is False  # own
    assert can_vote_on(etu, a7, author_marc) is False  # other pole
    sophie = svc.repo.user_by_id("u-sophie")  # SVT student
    assert can_vote_on(sophie, a7, author_marc) is True
    admin = svc.repo.user_by_id("u-admin")
    assert can_vote_on(admin, a3, author_marc) is False


def test_cannot_vote_own_or_prof_via_api(client, etu, marc):
    r = client.post("/api/announcements/a3/vote", json={"value": 1}, headers=marc)
    assert r.status_code == 403
    r = client.post("/api/announcements/a1/vote", json={"value": 1}, headers=etu)
    assert r.status_code == 403
    # a3 votes stay at seeded 8
    a3 = client.get("/api/announcements/a3", headers=etu).get_json()
    assert a3["reliability"]["total"] == 8


def test_vote_toggle(client, etu):
    before = client.get("/api/announcements/a3", headers=etu).get_json()["reliability"]
    # etu already voted +1 on a3 (seed v4)
    r = client.post("/api/announcements/a3/vote", json={"value": 1}, headers=etu)
    assert r.status_code == 200
    after = r.get_json()
    assert after["total"] == before["total"] - 1
    r = client.post("/api/announcements/a3/vote", json={"value": -1}, headers=etu)
    assert r.status_code == 200
    flipped = r.get_json()
    assert flipped["total"] == before["total"]
    assert flipped["down"] == before["down"] + 1


def test_reliability_ratio_and_threshold():
    votes = [
        Vote(id="1", announcement_id="x", user_id="a", value=1, created_at="t"),
        Vote(id="2", announcement_id="x", user_id="b", value=1, created_at="t"),
        Vote(id="3", announcement_id="x", user_id="c", value=-1, created_at="t"),
    ]
    rel = reliability_of(votes)
    assert rel["up"] == 2 and rel["down"] == 1 and rel["total"] == 3
    assert rel["pct"] == 67
    assert reliability_badge(rel["pct"], rel["total"]) == "Contestée"
    assert reliability_badge(70, 10) == "Fiable"
    assert reliability_badge(None, 0) == "Non notée"


def test_admin_override_marked(client, admin, etu, svc):
    a = svc.repo.announcement("a4")
    votes = svc.repo.votes_of("a4")
    base = reliability_of_ann(a, votes)
    assert base["overridden"] is False
    r = client.post("/api/announcements/a4/reliability", json={"pct": 99}, headers=admin)
    assert r.status_code == 200
    body = r.get_json()
    assert body["pct"] == 99
    assert body["overridden"] is True
    detail = client.get("/api/announcements/a4", headers=etu).get_json()
    assert detail["reliability"]["pct"] == 99
    assert detail["reliability"]["overridden"] is True
