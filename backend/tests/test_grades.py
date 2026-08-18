"""Grades: /20 bounds, coefficients, weighted overall and per-discipline."""

from __future__ import annotations

from twolate.domain import weighted_average
from twolate.models import Grade


def test_weighted_average_matches_spec():
    grades = [
        Grade(id="1", user_id="u", discipline="Algo", title="CC1", value=14, coef=2, created_at="t"),
        Grade(id="2", user_id="u", discipline="Algo", title="TP", value=16, coef=1, created_at="t"),
        Grade(id="3", user_id="u", discipline="BDD", title="I1", value=11.5, coef=1, created_at="t"),
    ]
    # (14*2 + 16*1 + 11.5*1) / 4 = 55.5 / 4 = 13.875
    avg = weighted_average(grades)
    assert avg is not None
    assert abs(avg - 13.875) < 1e-9
    algo = [g for g in grades if g.discipline == "Algo"]
    assert abs(weighted_average(algo) - (44 / 3)) < 1e-9
    assert weighted_average([]) is None
    assert weighted_average([Grade(id="z", user_id="u", discipline="X", title="Y", value=10, coef=0, created_at="t")]) is None


def test_seeded_etu_average_via_api(client, etu):
    r = client.get("/api/grades", headers=etu)
    assert r.status_code == 200
    body = r.get_json()
    assert len(body["grades"]) == 5
    # same computation as shipped helper on the payload
    from twolate.domain import weighted_average as avg

    computed = avg(body["grades"])
    assert body["average"] == computed
    assert abs(computed - ((14 * 2 + 16 + 11.5 + 12.5 + 13) / 6)) < 1e-9


def test_invalid_grade_rejected(client, etu):
    r = client.post("/api/grades", json={"discipline": "Algo", "title": "CC", "value": 21, "coef": 1}, headers=etu)
    assert r.status_code == 400
    r = client.post("/api/grades", json={"discipline": "Algo", "title": "CC", "value": 10, "coef": 0}, headers=etu)
    assert r.status_code == 400
    r = client.post("/api/grades", json={"discipline": "", "title": "CC", "value": 10, "coef": 1}, headers=etu)
    assert r.status_code == 400


def test_add_and_delete_grade_updates_average(client, etu):
    before = client.get("/api/grades", headers=etu).get_json()["average"]
    r = client.post(
        "/api/grades",
        json={"discipline": "Anglais technique", "title": "Quiz", "value": 20, "coef": 1},
        headers=etu,
    )
    assert r.status_code == 201
    after = client.get("/api/grades", headers=etu).get_json()
    assert after["average"] > before
    gid = r.get_json()["id"]
    client.delete(f"/api/grades/{gid}", headers=etu)
    restored = client.get("/api/grades", headers=etu).get_json()["average"]
    assert abs(restored - before) < 1e-9
