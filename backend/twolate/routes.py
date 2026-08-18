"""HTTP API for 2late."""

from __future__ import annotations

import json
from functools import wraps
from io import BytesIO

from flask import Blueprint, current_app, g, jsonify, request, send_file

from .domain import public_user
from .errors import ServiceError

api = Blueprint("api", __name__, url_prefix="/api")


def _token() -> str | None:
    header = request.headers.get("Authorization", "")
    if header.lower().startswith("bearer "):
        return header.split(" ", 1)[1].strip()
    return request.cookies.get("twolate_session")


def current_user():
    return current_app.services.user_from_token(_token())


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return jsonify({"error": "Session expirée."}), 401
        g.user = user
        return fn(*args, **kwargs)

    return wrapper


@api.errorhandler(ServiceError)
def _svc_err(err: ServiceError):
    return jsonify({"error": err.message}), err.status


@api.route("/health")
def health():
    return jsonify({"ok": True, "service": "2late"})


# ---------- auth ----------
@api.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    token, user = current_app.services.login(data.get("email") or "", data.get("password") or "")
    resp = jsonify({"token": token, "user": public_user(user)})
    resp.set_cookie("twolate_session", token, httponly=True, samesite="Lax")
    return resp


@api.post("/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    token, user = current_app.services.register(
        data.get("name") or "",
        data.get("email") or "",
        data.get("password") or "",
        data.get("pole") or "",
    )
    resp = jsonify({"token": token, "user": public_user(user)})
    resp.set_cookie("twolate_session", token, httponly=True, samesite="Lax")
    return resp


@api.post("/auth/logout")
def logout():
    current_app.services.logout(_token())
    resp = jsonify({"ok": True})
    resp.delete_cookie("twolate_session")
    return resp


@api.get("/auth/me")
@auth_required
def me():
    return jsonify({"user": public_user(g.user)})


@api.get("/auth/reset/<token>")
def peek_reset(token: str):
    return jsonify(current_app.services.peek_reset_token(token))


@api.post("/auth/reset/consume")
def consume_reset():
    data = request.get_json(silent=True) or {}
    current_app.services.consume_reset_token(data.get("token") or "", data.get("password") or "")
    return jsonify({"ok": True})


# ---------- bootstrap / feed ----------
@api.get("/bootstrap")
@auth_required
def bootstrap():
    return jsonify(current_app.services.bootstrap(g.user))


@api.get("/nav")
@auth_required
def nav():
    return jsonify(current_app.services.nav_badges(g.user))


@api.get("/feed")
@auth_required
def feed():
    packed = current_app.services.feed(g.user)
    tab = (request.args.get("tab") or "toRead").strip()
    if tab == "seen":
        return jsonify({"announcements": packed["seen"], "tab": "seen"})
    return jsonify({"announcements": packed["toRead"], "tab": "toRead"})


@api.get("/announcements/<aid>")
@auth_required
def announcement_detail(aid: str):
    return jsonify(current_app.services.announcement_detail(g.user, aid))


@api.post("/announcements")
@auth_required
def publish():
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.publish(g.user, data)), 201


@api.post("/announcements/<aid>/read")
@auth_required
def mark_read(aid: str):
    current_app.services.mark_read(g.user, aid)
    return jsonify({"ok": True})


@api.post("/announcements/<aid>/vote")
@auth_required
def vote(aid: str):
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.vote(g.user, aid, int(data.get("value", 0))))


@api.post("/announcements/<aid>/comments")
@auth_required
def add_comment(aid: str):
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.add_comment(g.user, aid, data.get("body") or "")), 201


@api.delete("/announcements/<aid>")
@auth_required
def delete_announcement(aid: str):
    current_app.services.delete_announcement(g.user, aid)
    return jsonify({"ok": True})


@api.delete("/comments/<cid>")
@auth_required
def delete_comment(cid: str):
    current_app.services.delete_comment(g.user, cid)
    return jsonify({"ok": True})


@api.post("/announcements/<aid>/reliability")
@auth_required
def set_reliability(aid: str):
    data = request.get_json(silent=True) or {}
    pct = data.get("pct", None)
    if pct is not None:
        pct = int(pct)
    return jsonify(current_app.services.set_reliability(g.user, aid, pct))


@api.post("/announcements/<aid>/collect-access")
@auth_required
def set_collect_access(aid: str):
    data = request.get_json(silent=True) or {}
    current_app.services.set_collect_access(g.user, aid, data.get("access") or "")
    return jsonify({"ok": True})


@api.post("/announcements/<aid>/collect-email")
@auth_required
def set_collect_email(aid: str):
    data = request.get_json(silent=True) or {}
    current_app.services.set_collect_email(g.user, aid, data.get("email") or "")
    return jsonify({"ok": True})


@api.post("/announcements/<aid>/submissions")
@auth_required
def submit(aid: str):
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "Choisissez un fichier à déposer."}), 400
    content = f.read()
    return jsonify(
        current_app.services.submit(g.user, aid, f.filename or "document", f.mimetype or "application/octet-stream", content)
    ), 201


@api.get("/submissions/<sid>/file")
@auth_required
def submission_file(sid: str):
    data, name, mime, student = current_app.services.submission_file(g.user, sid)
    download = student or name
    return send_file(BytesIO(data), mimetype=mime or "application/octet-stream", as_attachment=True, download_name=name)


@api.delete("/submissions/<sid>")
@auth_required
def delete_submission(sid: str):
    current_app.services.delete_submission(g.user, sid)
    return jsonify({"ok": True})


# ---------- relais / profile ----------
@api.post("/relais/apply")
@auth_required
def apply_relais():
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.apply_relais(g.user, data.get("message") or "", data.get("whatsapp") or "")), 201


@api.post("/relais/decide")
@auth_required
def decide_relais():
    data = request.get_json(silent=True) or {}
    current_app.services.decide_application(g.user, data.get("applicationId") or "", bool(data.get("approve")))
    return jsonify({"ok": True})


@api.post("/me/whatsapp")
@auth_required
def set_whatsapp():
    data = request.get_json(silent=True) or {}
    current_app.services.set_whatsapp(g.user, data.get("whatsapp") or "")
    return jsonify({"ok": True})


# ---------- chat ----------
@api.get("/rooms")
@auth_required
def rooms():
    return jsonify({"rooms": current_app.services.rooms_for(g.user)})


@api.get("/rooms/<room_id>/messages")
@auth_required
def room_messages(room_id: str):
    return jsonify(current_app.services.room_messages(g.user, room_id))


@api.post("/rooms/<room_id>/messages")
@auth_required
def send_message(room_id: str):
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.send_message(g.user, room_id, data.get("body") or "", data.get("replyToId"))), 201


@api.post("/rooms/<room_id>/visit")
@auth_required
def visit_room(room_id: str):
    current_app.services.mark_room_visited(g.user, room_id)
    return jsonify({"ok": True})


@api.post("/rooms/<room_id>/access")
@auth_required
def room_access(room_id: str):
    data = request.get_json(silent=True) or {}
    current_app.services.set_room_access(g.user, room_id, data.get("userId") or "", bool(data.get("granted")))
    return jsonify({"ok": True})


@api.post("/messages/<mid>/delete")
@auth_required
def delete_message(mid: str):
    current_app.services.soft_delete_message(g.user, mid)
    return jsonify({"ok": True})


@api.post("/messages/<mid>/react")
@auth_required
def react_message(mid: str):
    data = request.get_json(silent=True) or {}
    return jsonify({"reactions": current_app.services.toggle_reaction(g.user, mid, data.get("emoji") or "")})


# ---------- schedule ----------
@api.get("/schedule")
@auth_required
def schedule():
    return jsonify(current_app.services.schedule_for(g.user, request.args.get("pole")))


@api.post("/schedule")
@auth_required
def upsert_slot():
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.upsert_slot(g.user, data))


@api.delete("/schedule/<sid>")
@auth_required
def delete_slot(sid: str):
    current_app.services.delete_slot(g.user, sid)
    return jsonify({"ok": True})


@api.get("/schedule/<sid>/open")
@auth_required
def open_slot_link(sid: str):
    return jsonify(current_app.services.open_schedule_link(g.user, sid, request.args.get("kind") or "", request.args.get("group")))


@api.patch("/subjects/<sid>")
@auth_required
def update_subject(sid: str):
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.update_subject(g.user, sid, data))


@api.get("/notes")
@auth_required
def notes():
    packed = current_app.services.schedule_for(g.user)
    return jsonify({"notes": packed["notes"], "dueSoon": packed["dueSoon"]})


@api.post("/notes")
@auth_required
def upsert_note():
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.upsert_note(g.user, data))


@api.delete("/notes/<nid>")
@auth_required
def delete_note(nid: str):
    current_app.services.delete_note(g.user, nid)
    return jsonify({"ok": True})


# ---------- syllabus / grades ----------
@api.get("/syllabus")
@auth_required
def syllabus():
    return jsonify(
        {
            "docs": current_app.services.syllabus(
                g.user, request.args.get("q") or "", request.args.get("sort") or "recent"
            )
        }
    )


@api.post("/syllabus")
@auth_required
def add_syllabus():
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "Choisissez un fichier à déposer."}), 400
    poles = request.form.getlist("poles")
    if len(poles) == 1 and poles[0].strip().startswith("["):
        try:
            poles = json.loads(poles[0])
        except json.JSONDecodeError:
            poles = []
    elif not poles and request.form.get("poles"):
        try:
            poles = json.loads(request.form.get("poles"))
        except json.JSONDecodeError:
            poles = [p.strip() for p in request.form.get("poles", "").split(",") if p.strip()]
    data = {
        "title": request.form.get("title") or "",
        "description": request.form.get("description") or "",
        "poles": poles,
        "discipline": request.form.get("discipline") or "",
    }
    return jsonify(
        current_app.services.add_syllabus(g.user, data, f.filename or "document", f.mimetype or "application/octet-stream", f.read())
    ), 201


@api.get("/syllabus/<did>/file")
@auth_required
def syllabus_file(did: str):
    data, name, mime = current_app.services.syllabus_file(g.user, did)
    return send_file(BytesIO(data), mimetype=mime or "application/pdf", as_attachment=False, download_name=name)


@api.delete("/syllabus/<did>")
@auth_required
def delete_syllabus(did: str):
    current_app.services.delete_syllabus(g.user, did)
    return jsonify({"ok": True})


@api.get("/grades")
@auth_required
def grades():
    return jsonify(current_app.services.grades(g.user))


@api.post("/grades")
@auth_required
def add_grade():
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.add_grade(g.user, data)), 201


@api.delete("/grades/<gid>")
@auth_required
def delete_grade(gid: str):
    current_app.services.delete_grade(g.user, gid)
    return jsonify({"ok": True})


# ---------- admin ----------
@api.get("/admin/announcements")
@auth_required
def admin_announcements():
    return jsonify({"announcements": current_app.services.admin_announcements(g.user)})


@api.get("/admin/stats")
@auth_required
def admin_stats():
    return jsonify(current_app.services.admin_stats(g.user))


@api.get("/admin/members")
@auth_required
def admin_members():
    return jsonify({"members": current_app.services.admin_members(g.user)})


@api.get("/admin/applications")
@auth_required
def admin_applications():
    return jsonify({"applications": current_app.services.admin_applications(g.user)})


@api.get("/admin/export")
@auth_required
def admin_export():
    payload = current_app.services.admin_export(g.user)
    return jsonify(payload)


@api.post("/admin/users")
@auth_required
def create_staff():
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.create_staff(g.user, data.get("name") or "", data.get("email") or "", data.get("password") or "", data.get("role") or "PROF")), 201


@api.post("/admin/users/<uid>/disabled")
@auth_required
def set_disabled(uid: str):
    data = request.get_json(silent=True) or {}
    current_app.services.set_user_disabled(g.user, uid, bool(data.get("disabled")))
    return jsonify({"ok": True})


@api.post("/admin/users/<uid>/relais")
@auth_required
def set_relais(uid: str):
    data = request.get_json(silent=True) or {}
    current_app.services.set_relais_status(g.user, uid, bool(data.get("makeRelais")))
    return jsonify({"ok": True})


@api.post("/admin/users/<uid>/reset-link")
@auth_required
def reset_link(uid: str):
    return jsonify(current_app.services.create_reset_link(g.user, uid))


@api.delete("/admin/users/<uid>")
@auth_required
def delete_user(uid: str):
    current_app.services.delete_user(g.user, uid)
    return jsonify({"ok": True})


@api.get("/admin/milestones")
@auth_required
def list_milestones():
    current_app.services.require_admin(g.user)
    return jsonify(
        {
            "milestones": [
                {"id": m.id, "threshold": m.threshold, "title": m.title, "message": m.message, "reachedAt": m.reached_at}
                for m in current_app.services.repo.all_milestones()
            ]
        }
    )


@api.post("/admin/milestones")
@auth_required
def upsert_milestone():
    data = request.get_json(silent=True) or {}
    return jsonify(current_app.services.upsert_milestone(g.user, data))


@api.delete("/admin/milestones/<mid>")
@auth_required
def delete_milestone(mid: str):
    current_app.services.delete_milestone(g.user, mid)
    return jsonify({"ok": True})


@api.post("/admin/milestones/<mid>/reset")
@auth_required
def reset_milestone(mid: str):
    current_app.services.reset_milestone(g.user, mid)
    return jsonify({"ok": True})


@api.get("/admin/comments")
@auth_required
def admin_comments():
    current_app.services.require_admin(g.user)
    users = {u.id: u for u in current_app.services.repo.all_users()}
    anns = {a.id: a for a in current_app.services.repo.all_announcements()}
    out = []
    for c in current_app.services.repo.all_comments():
        author = users.get(c.author_id)
        ann = anns.get(c.announcement_id)
        out.append(
            {
                "id": c.id,
                "body": c.body,
                "createdAt": c.created_at,
                "author": public_user(author) if author else None,
                "announcementId": c.announcement_id,
                "announcementTitle": ann.title if ann else None,
            }
        )
    out.sort(key=lambda x: x["createdAt"], reverse=True)
    return jsonify({"comments": out})
