"""Personal course-note deadlines and < 48 h surfacing."""

from __future__ import annotations

from twolate.domain import iso_from_ms, notes_due_within_48h
from twolate.models import CourseNote


def test_due_window_includes_next_48h_excludes_far(svc):
    now = svc.t()
    soon = CourseNote(
        id="n1", user_id="u-etu", slot_id="sti-1", body="Réviser chap. 3",
        created_at=iso_from_ms(now), due_at=iso_from_ms(now + 10 * 3600_000),
    )
    far = CourseNote(
        id="n2", user_id="u-etu", slot_id="sti-1", body="Dans une semaine",
        created_at=iso_from_ms(now), due_at=iso_from_ms(now + 5 * 24 * 3600_000),
    )
    done = CourseNote(
        id="n3", user_id="u-etu", slot_id="sti-1", body="Déjà fait",
        created_at=iso_from_ms(now), due_at=iso_from_ms(now + 2 * 3600_000), done=True,
    )
    due = notes_due_within_48h([soon, far, done], now)
    assert [n.id for n in due] == ["n1"]


def test_note_crud_is_personal(client, etu, marc):
    r = client.post(
        "/api/notes",
        json={"slotId": "sti-1", "body": "Apporter le polycopié demain matin", "dueAt": None},
        headers=etu,
    )
    assert r.status_code == 200, r.get_json()
    nid = r.get_json()["id"]
    mine = client.get("/api/notes", headers=etu).get_json()["notes"]
    assert any(n["id"] == nid for n in mine)
    other = client.get("/api/notes", headers=marc).get_json()["notes"]
    assert all(n["id"] != nid for n in other)
    forbidden = client.delete(f"/api/notes/{nid}", headers=marc)
    assert forbidden.status_code in (403, 404)
    assert client.delete(f"/api/notes/{nid}", headers=etu).status_code == 200
