"""Chat rooms, default access, grant/revoke, mentions, unread."""

from __future__ import annotations

from twolate.domain import default_room_access, is_mentioned, room_access_of, room_by_id


def test_default_access_matrix(svc):
    etu = svc.repo.user_by_id("u-etu")
    marc = svc.repo.user_by_id("u-marc")
    prof = svc.repo.user_by_id("u-prof")
    admin = svc.repo.user_by_id("u-admin")
    general = room_by_id("general")
    sti = room_by_id("pole-STI")
    svt = room_by_id("pole-SVT")
    staff = room_by_id("staff")
    assert default_room_access(etu, general) is False
    assert default_room_access(etu, sti) is True
    assert default_room_access(etu, svt) is False
    assert default_room_access(etu, staff) is False
    assert default_room_access(marc, general) is True
    assert default_room_access(prof, general) is True
    assert default_room_access(prof, svt) is True
    assert default_room_access(admin, staff) is True
    assert default_room_access(prof, staff) is False


def test_student_cannot_open_other_pole_or_staff(client, etu):
    r = client.get("/api/rooms/pole-SVT/messages", headers=etu)
    assert r.status_code == 403
    r = client.get("/api/rooms/staff/messages", headers=etu)
    assert r.status_code == 403
    r = client.get("/api/rooms/pole-STI/messages", headers=etu)
    assert r.status_code == 200
    assert "password" not in r.get_json()["participants"][0]


def test_admin_grant_and_relais_revoke_general(client, admin, marc, etu, svc):
    # etu has no default access to general
    rooms = {r["id"] for r in client.get("/api/rooms", headers=etu).get_json()["rooms"]}
    assert "general" not in rooms
    r = client.post("/api/rooms/general/access", json={"userId": "u-etu", "granted": True}, headers=admin)
    assert r.status_code == 200
    rooms = {r["id"] for r in client.get("/api/rooms", headers=etu).get_json()["rooms"]}
    assert "general" in rooms
    # relais of STI can revoke general for STI student
    r = client.post("/api/rooms/general/access", json={"userId": "u-etu", "granted": False}, headers=marc)
    assert r.status_code == 200
    rooms = {r["id"] for r in client.get("/api/rooms", headers=etu).get_json()["rooms"]}
    assert "general" not in rooms
    # relais cannot revoke a student of another pole
    r = client.post("/api/rooms/general/access", json={"userId": "u-nadia", "granted": False}, headers=marc)
    assert r.status_code == 403


def test_mention_tous_and_first_name():
    class U:
        name = "Arnaud Bilie"

    assert is_mentioned(U(), "Salut @Arnaud on se voit ?") is True
    assert is_mentioned(U(), "Salut @arnaud !") is True
    assert is_mentioned(U(), "Message pour @tous ici") is True
    assert is_mentioned(U(), "Personne n'est cité") is False


def test_grantable_list_for_admin_and_relais_general(client, admin, marc, etu):
    data = client.get("/api/rooms/general/messages", headers=admin).get_json()
    grant_ids = {u["id"] for u in data["grantable"]}
    part_ids = {u["id"] for u in data["participants"]}
    assert "u-etu" in grant_ids  # student has no default général access
    assert "u-etu" not in part_ids
    assert "u-marc" in part_ids  # relais default
    # relais of STI can restore/revoke général for STI students
    r = client.post("/api/rooms/general/access", json={"userId": "u-etu", "granted": True}, headers=marc)
    assert r.status_code == 200
    rooms = {x["id"] for x in client.get("/api/rooms", headers=etu).get_json()["rooms"]}
    assert "general" in rooms
    marc_view = client.get("/api/rooms/general/messages", headers=marc).get_json()
    assert any(p["id"] == "u-etu" for p in marc_view["participants"])
    r = client.post("/api/rooms/general/access", json={"userId": "u-etu", "granted": False}, headers=marc)
    assert r.status_code == 200


def test_send_reply_soft_delete_react(client, etu, marc):
    r = client.post("/api/rooms/pole-STI/messages", json={"body": "On se retrouve à la BU."}, headers=etu)
    assert r.status_code == 201
    mid = r.get_json()["id"]
    r = client.post("/api/rooms/pole-STI/messages", json={"body": "OK 14h", "replyToId": mid}, headers=marc)
    assert r.status_code == 201
    assert r.get_json()["replyToId"] == mid
    r = client.post(f"/api/messages/{mid}/react", json={"emoji": "👍"}, headers=marc)
    assert r.status_code == 200
    assert any(x["emoji"] == "👍" and "u-marc" in x["userIds"] for x in r.get_json()["reactions"])
    r = client.post(f"/api/messages/{mid}/delete", headers=etu)
    assert r.status_code == 200
    msgs = client.get("/api/rooms/pole-STI/messages", headers=etu).get_json()["messages"]
    deleted = next(m for m in msgs if m["id"] == mid)
    assert deleted["deleted"] is True
