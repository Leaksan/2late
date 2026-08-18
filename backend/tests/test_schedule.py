"""Schedule slots, live window, eval access before/during/after."""

from __future__ import annotations

from twolate.domain import eval_access_allowed, eval_state_of, iso_from_ms, now_ms
from twolate.models import EvalLink, ScheduleSlot


def _slot(**kwargs) -> ScheduleSlot:
    base = dict(
        id="x",
        pole="STI",
        day="LUNDI",
        start="08:00",
        end="11:00",
        discipline="Algo",
        teacher_name="Pr. X",
        created_at="t",
        visio_url="https://meet.example/x",
        eval_url="https://moodle.example/x",
        visio_open=True,
        eval_open=True,
    )
    base.update(kwargs)
    return ScheduleSlot(**base)


def test_eval_window_states():
    now = 1_700_000_000_000
    start = iso_from_ms(now)
    slot = _slot(eval_starts_at=start, eval_minutes=60, eval_links=[EvalLink("G1", "https://ex.test/g1")])
    assert eval_state_of(slot, now - 1) == "upcoming"
    assert eval_access_allowed(slot, now - 1) is False
    assert eval_state_of(slot, now + 1) == "open"
    assert eval_access_allowed(slot, now + 1) is True
    assert eval_state_of(slot, now + 60 * 60_000) == "ended"
    assert eval_access_allowed(slot, now + 60 * 60_000) is False
    postponed = _slot(eval_postponed=True, eval_starts_at=start, eval_minutes=60)
    assert eval_state_of(postponed, now + 1) == "off"
    assert eval_access_allowed(postponed, now + 1) is False


def test_eval_api_rejects_before_and_after(client, etu, prof, svc):
    now = svc.t()
    future = iso_from_ms(now + 2 * 3600_000)
    r = client.post(
        "/api/schedule",
        json={
            "id": "eval-future",
            "pole": "STI",
            "day": "LUNDI",
            "start": "08:00",
            "end": "10:00",
            "discipline": "Éval future",
            "teacherName": "Pr. Test",
            "evalUrl": "https://moodle.univ.ga/quiz/future",
            "evalStartsAt": future,
            "evalMinutes": 30,
            "evalOpen": True,
        },
        headers=prof,
    )
    assert r.status_code == 200, r.get_json()
    r = client.get("/api/schedule/eval-future/open?kind=eval", headers=etu)
    assert r.status_code == 403
    assert "pas encore" in r.get_json()["error"].lower() or "ouverte" in r.get_json()["error"].lower()

    past = iso_from_ms(now - 3 * 3600_000)
    r = client.post(
        "/api/schedule",
        json={
            "id": "eval-past",
            "pole": "STI",
            "day": "LUNDI",
            "start": "08:00",
            "end": "10:00",
            "discipline": "Éval passée",
            "teacherName": "Pr. Test",
            "evalUrl": "https://moodle.univ.ga/quiz/past",
            "evalStartsAt": past,
            "evalMinutes": 30,
            "evalOpen": True,
        },
        headers=prof,
    )
    assert r.status_code == 200
    r = client.get("/api/schedule/eval-past/open?kind=eval", headers=etu)
    assert r.status_code == 403
    assert "terminée" in r.get_json()["error"].lower() or "accessible" in r.get_json()["error"].lower()


def test_seeded_sti1_eval_is_open_and_hides_raw_url_in_list(client, etu):
    packed = client.get("/api/schedule", headers=etu).get_json()
    sti1 = next(s for s in packed["slots"] if s["id"] == "sti-1")
    assert "evalUrl" not in sti1
    assert "visioUrl" not in sti1
    assert sti1["hasEval"] is True
    assert sti1["evalState"] == "open"
    assert "Groupe 1" in sti1["evalGroups"]
    r = client.get("/api/schedule/sti-1/open?kind=eval&group=Groupe 1", headers=etu)
    assert r.status_code == 200
    assert r.get_json()["url"].startswith("https://")
    # other-pole student cannot open
    # (nadia is SEDG)


def test_staff_schedule_exposes_urls_student_payload_does_not(client, etu, prof):
    student = client.get("/api/schedule", headers=etu).get_json()["slots"]
    staff = client.get("/api/schedule", headers=prof).get_json()["slots"]
    s_stu = next(s for s in student if s["id"] == "sti-1")
    s_prof = next(s for s in staff if s["id"] == "sti-1")
    assert "visioUrl" not in s_stu
    assert "evalUrl" not in s_stu
    assert s_prof.get("visioUrl", "").startswith("https://")
    assert s_prof.get("evalLinks")


def test_note_due_within_48h_is_returned(client, etu):
    from datetime import datetime, timedelta, timezone

    due = (datetime.now(timezone.utc) + timedelta(hours=10)).isoformat()
    r = client.post("/api/notes", json={"slotId": "sti-1", "body": "Réviser chapitres 1 à 8 ce soir", "dueAt": due}, headers=etu)
    assert r.status_code == 200, r.get_json()
    packed = client.get("/api/notes", headers=etu).get_json()
    assert any(n["id"] == r.get_json()["id"] for n in packed["dueSoon"])


def test_student_sees_only_own_pole_slots(client, etu):
    slots = client.get("/api/schedule", headers=etu).get_json()["slots"]
    assert slots
    assert all(s["pole"] == "STI" for s in slots)
    assert not any(s["pole"] == "SVT" for s in slots)
