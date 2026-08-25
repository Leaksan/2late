"""Authorized domain operations. Callers are HTTP routes or tests."""

from __future__ import annotations

import os
import re
import secrets
from pathlib import Path
from typing import Any, Optional

from werkzeug.security import check_password_hash, generate_password_hash

from .constants import (
    ANNOUNCEMENT_TYPES,
    CHAT_ROOMS,
    COLLECT_ACCESSES,
    FILE_MAX_BYTES,
    POLES,
    RELIABLE_THRESHOLD,
    RESET_TTL_MS,
)
from .domain import (
    can_add_syllabus,
    can_apply_relais,
    can_collect,
    can_download_submission,
    can_manage_collect,
    can_moderate_room,
    can_submit_to,
    can_vote_on,
    default_room_access,
    eval_access_allowed,
    eval_links_of,
    eval_state_of,
    feeds,
    file_too_large,
    fold_accents,
    is_read_now,
    is_valid_email,
    is_valid_motivation,
    is_valid_password,
    is_valid_whatsapp,
    iso_from_ms,
    mention_pending,
    my_rooms,
    notes_due_within_48h,
    now_ms,
    public_user,
    read_at_of,
    read_rate,
    reliability_of_ann,
    reset_token_error,
    room_access_of,
    room_by_id,
    sort_syllabus,
    syllabus_matches,
    unread_count,
    validate_grade,
    validate_publish,
    visio_access_allowed,
    visible_announcements,
    visible_syllabus,
    weighted_average,
)
from .errors import ServiceError
from .models import (
    AnnLink,
    Announcement,
    ChatMessage,
    Comment,
    CourseNote,
    EvalLink,
    Grade,
    Milestone,
    RelaisApplication,
    ResetToken,
    RoomAccess,
    ScheduleSlot,
    Subject,
    Submission,
    SyllabusDoc,
    User,
    Vote,
)
from .pdf import demo_pdf
from .repo import Repo


def uid(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(6)}"


def hash_password(password: str) -> str:
    return generate_password_hash(password, method="pbkdf2:sha256:260000")


class Services:
    def __init__(self, repo: Repo, uploads_dir: Path, now: Optional[float] = None):
        self.repo = repo
        self.uploads_dir = Path(uploads_dir)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self._now = now

    def t(self) -> float:
        return now_ms(self._now)

    def iso(self) -> str:
        return iso_from_ms(self.t())

    def require(self, user: Optional[User]) -> User:
        if not user:
            raise ServiceError("Session expirée.", 401)
        if user.disabled:
            raise ServiceError("Ce compte a été désactivé par l’administration.", 403)
        return user

    def require_admin(self, user: Optional[User]) -> User:
        u = self.require(user)
        if u.role != "ADMIN":
            raise ServiceError("Réservé à l’administration.", 403)
        return u

    # ---------- auth ----------
    def login(self, email: str, password: str) -> tuple[str, User]:
        user = self._check_credentials(email, password)
        if user.role == "ADMIN":
            raise ServiceError(
                "Les comptes administration ne peuvent pas se connecter ici : utilisez l’interface d’administration dédiée.",
                403,
            )
        return self._open_session(user)

    def login_admin(self, email: str, password: str) -> tuple[str, User]:
        user = self._check_credentials(email, password)
        if user.role != "ADMIN":
            raise ServiceError("Cette interface est réservée aux comptes administration.", 403)
        return self._open_session(user)

    def _check_credentials(self, email: str, password: str) -> User:
        user = self.repo.user_by_email(email or "")
        if not user or not check_password_hash(user.password_hash, password or ""):
            raise ServiceError("E-mail ou mot de passe incorrect.", 401)
        if user.disabled:
            raise ServiceError("Ce compte a été désactivé par l’administration.", 403)
        return user

    def _open_session(self, user: User) -> tuple[str, User]:
        token = secrets.token_hex(24)
        self.repo.insert_session(token, user.id, self.iso())
        return token, user

    def register(self, name: str, email: str, password: str, pole: str) -> tuple[str, User]:
        clean = (email or "").strip().lower()
        if not (name or "").strip():
            raise ServiceError("Veuillez saisir votre nom.")
        if not is_valid_email(clean):
            raise ServiceError("Adresse e-mail invalide.")
        if not is_valid_password(password or ""):
            raise ServiceError("Mot de passe : 4 caractères minimum.")
        if pole not in POLES:
            raise ServiceError("Pôle académique invalide.")
        if self.repo.user_by_email(clean):
            raise ServiceError("Un compte existe déjà avec cet e-mail.")
        user = User(
            id=uid("u"),
            name=name.strip(),
            email=clean,
            password_hash=hash_password(password),
            role="ETUDIANT",
            pole=pole,
            created_at=self.iso(),
        )
        self.repo.insert_user(user)
        count = len(self.repo.all_users())
        stamp = self.iso()
        for m in self.repo.all_milestones():
            if not m.reached_at and count >= m.threshold:
                m.reached_at = stamp
                self.repo.upsert_milestone(m)
        token = secrets.token_hex(24)
        self.repo.insert_session(token, user.id, stamp)
        return token, user

    def logout(self, token: Optional[str]) -> None:
        if token:
            self.repo.delete_session(token)

    def user_from_token(self, token: Optional[str]) -> Optional[User]:
        if not token:
            return None
        return self.repo.session_user(token)

    # ---------- announcements / feed ----------
    def feed(self, user: User) -> dict:
        packed = feeds(user, self.repo.all_announcements(), self.repo.all_reads(), self.t())
        return {
            "toRead": [self._ann_public(a, user) for a in packed["toRead"]],
            "seen": [self._ann_public(a, user) for a in packed["seen"]],
        }

    def _ann_public(self, a: Announcement, viewer: Optional[User] = None) -> dict:
        author = self.repo.user_by_id(a.author_id)
        votes = self.repo.votes_of(a.id)
        rel = reliability_of_ann(a, votes)
        comments = self.repo.comments_of(a.id)
        my_vote = None
        if viewer:
            v = self.repo.vote_of(a.id, viewer.id)
            my_vote = v.value if v else None
        subs = self.repo.submissions_of(a.id) if a.type == "PARTICIPATIVE" else []
        return {
            "id": a.id,
            "authorId": a.author_id,
            "author": public_user(author) if author else None,
            "title": a.title,
            "type": a.type,
            "description": a.description,
            "poles": a.poles,
            "priority": a.priority,
            "reliability": rel,
            "links": [{"id": l.id, "label": l.label, "url": l.url} for l in a.links],
            "expiresAt": a.expires_at,
            "collectAccess": a.collect_access,
            "collectEmail": a.collect_email,
            "publishAt": a.publish_at,
            "repeat": a.repeat,
            "createdAt": a.created_at,
            "commentCount": len(comments),
            "submissionCount": len(subs),
            "myVote": my_vote,
            "canVote": can_vote_on(viewer, a, author) if viewer else False,
        }

    def announcement_detail(self, user: User, aid: str) -> dict:
        a = self.repo.announcement(aid)
        if not a:
            raise ServiceError("Annonce introuvable.", 404)
        vis = visible_announcements(user, [a])
        if not vis and user.role not in ("PROF", "ADMIN"):
            raise ServiceError("Annonce introuvable.", 404)
        # mark read unless already effectively read
        if not is_read_now(a, read_at_of(self.repo.all_reads(), a.id, user.id), self.t()):
            self.repo.upsert_read(a.id, user.id, self.iso())
        comments = []
        for c in self.repo.comments_of(a.id):
            ca = self.repo.user_by_id(c.author_id)
            comments.append(
                {
                    "id": c.id,
                    "announcementId": c.announcement_id,
                    "authorId": c.author_id,
                    "author": public_user(ca) if ca else None,
                    "body": c.body,
                    "createdAt": c.created_at,
                }
            )
        payload = self._ann_public(a, user)
        payload["comments"] = comments
        if a.type == "PARTICIPATIVE":
            payload["submissions"] = self._subs_public(user, a)
            payload["canSubmit"] = can_submit_to(user, a, self.t())[0]
            payload["canCollect"] = can_collect(user, a)
            payload["canDownload"] = can_download_submission(user, a)
            payload["canManageCollect"] = can_manage_collect(user, a)
        return payload

    def publish(self, user: User, data: dict) -> dict:
        user = self.require(user)
        err = validate_publish(
            user,
            data.get("title") or "",
            data.get("poles") or [],
            data.get("priority") or "NORMALE",
            data.get("links"),
            data.get("collectEmail"),
        )
        if err:
            raise ServiceError(err, 403 if "urgente" in err.lower() or "droit" in err.lower() else 400)
        atype = data.get("type") or "GENERALE"
        if atype not in ANNOUNCEMENT_TYPES:
            raise ServiceError("Type d’annonce invalide.")
        poles = [p for p in (data.get("poles") or []) if p in POLES]
        if not poles:
            raise ServiceError("Sélectionnez au moins un pôle cible.")
        links = []
        for l in data.get("links") or []:
            label = (l.get("label") or "").strip()
            url = (l.get("url") or "").strip()
            if label and url:
                links.append(AnnLink(id=l.get("id") or uid("lnk"), label=label, url=url))
        collect_email = (data.get("collectEmail") or "").strip()
        a = Announcement(
            id=uid("a"),
            author_id=user.id,
            title=data["title"].strip(),
            type=atype,
            description=(data.get("description") or "").strip() or None,
            poles=poles,
            priority=data.get("priority") or "NORMALE",
            links=links,
            expires_at=data.get("expiresAt"),
            collect_access=(data.get("collectAccess") or "PROF") if atype == "PARTICIPATIVE" else None,
            collect_email=collect_email if atype == "PARTICIPATIVE" and collect_email else None,
            publish_at=data.get("publishAt"),
            repeat=data.get("repeat"),
            created_at=self.iso(),
        )
        if a.collect_access and a.collect_access not in COLLECT_ACCESSES:
            raise ServiceError("Droit de téléchargement invalide.")
        self.repo.insert_announcement(a)
        return self._ann_public(a, user)

    def mark_read(self, user: User, aid: str) -> None:
        user = self.require(user)
        a = self.repo.announcement(aid)
        if not a:
            raise ServiceError("Annonce introuvable.", 404)
        if is_read_now(a, read_at_of(self.repo.all_reads(), a.id, user.id), self.t()):
            return
        self.repo.upsert_read(aid, user.id, self.iso())

    def vote(self, user: User, aid: str, value: int) -> dict:
        user = self.require(user)
        if value not in (1, -1):
            raise ServiceError("Vote invalide.")
        a = self.repo.announcement(aid)
        if not a:
            raise ServiceError("Annonce introuvable.", 404)
        author = self.repo.user_by_id(a.author_id)
        if not can_vote_on(user, a, author):
            raise ServiceError("Le vote est réservé aux étudiants du pôle concerné (hors auteur de l’annonce).", 403)
        existing = self.repo.vote_of(aid, user.id)
        if existing and existing.value == value:
            self.repo.delete_vote(existing.id)
        elif existing:
            existing.value = value
            existing.created_at = self.iso()
            self.repo.upsert_vote(existing)
        else:
            self.repo.upsert_vote(Vote(id=uid("v"), announcement_id=aid, user_id=user.id, value=value, created_at=self.iso()))
        return reliability_of_ann(a, self.repo.votes_of(aid))

    def add_comment(self, user: User, aid: str, body: str) -> dict:
        user = self.require(user)
        if not (body or "").strip():
            raise ServiceError("Message vide.")
        if not self.repo.announcement(aid):
            raise ServiceError("Annonce introuvable.", 404)
        c = Comment(id=uid("c"), announcement_id=aid, author_id=user.id, body=body.strip(), created_at=self.iso())
        self.repo.insert_comment(c)
        return {
            "id": c.id,
            "announcementId": aid,
            "authorId": user.id,
            "author": public_user(user),
            "body": c.body,
            "createdAt": c.created_at,
        }

    def delete_announcement(self, user: User, aid: str) -> None:
        self.require_admin(user)
        if not self.repo.announcement(aid):
            raise ServiceError("Annonce introuvable.", 404)
        for s in self.repo.submissions_of(aid):
            self._rm_file(s.id)
        self.repo.delete_announcement(aid)

    def delete_comment(self, user: User, cid: str) -> None:
        self.require_admin(user)
        if not self.repo.comment(cid):
            raise ServiceError("Commentaire introuvable.", 404)
        self.repo.delete_comment(cid)

    def set_reliability(self, user: User, aid: str, pct: Optional[int]) -> dict:
        self.require_admin(user)
        a = self.repo.announcement(aid)
        if not a:
            raise ServiceError("Annonce introuvable.", 404)
        if pct is not None and (not isinstance(pct, int) or pct < 0 or pct > 100):
            raise ServiceError("Entrez un nombre entier entre 0 et 100.")
        a.reliability_override = pct
        self.repo.update_announcement(a)
        return reliability_of_ann(a, self.repo.votes_of(aid))

    # ---------- relais / reset ----------
    def apply_relais(self, user: User, message: str, whatsapp: str) -> dict:
        user = self.require(user)
        if not can_apply_relais(user):
            raise ServiceError("Seuls les étudiants peuvent candidater.", 403)
        if not is_valid_motivation(message or ""):
            raise ServiceError("Expliquez votre motivation en quelques mots (10 caractères minimum).")
        if not is_valid_whatsapp(whatsapp or ""):
            raise ServiceError("Numéro WhatsApp invalide (indicatif inclus, ex. +241 06 12 34 56).")
        for app in self.repo.all_applications():
            if app.user_id == user.id and app.status == "PENDING":
                raise ServiceError("Une candidature est déjà en attente de validation.")
        rec = RelaisApplication(
            id=uid("app"),
            user_id=user.id,
            status="PENDING",
            message=message.strip(),
            whatsapp=whatsapp.strip(),
            created_at=self.iso(),
        )
        self.repo.insert_application(rec)
        return {"id": rec.id, "status": rec.status}

    def decide_application(self, user: User, application_id: str, approve: bool) -> None:
        self.require_admin(user)
        app = self.repo.application(application_id)
        if not app or app.status != "PENDING":
            raise ServiceError("Candidature introuvable ou déjà traitée.", 404)
        app.status = "APPROVED" if approve else "REFUSED"
        app.decided_at = self.iso()
        self.repo.update_application(app)
        if approve:
            target = self.repo.user_by_id(app.user_id)
            if target:
                target.role = "RELAIS"
                self.repo.update_user(target)

    def create_reset_link(self, user: User, target_id: str) -> dict:
        self.require_admin(user)
        target = self.repo.user_by_id(target_id)
        if not target:
            raise ServiceError("Utilisateur introuvable.", 404)
        token = secrets.token_hex(18)
        rec = ResetToken(
            token=token,
            user_id=target_id,
            created_at=self.iso(),
            expires_at=iso_from_ms(self.t() + RESET_TTL_MS),
        )
        self.repo.insert_reset_token(rec)
        return {"token": token, "path": f"#/reset/{token}", "expiresAt": rec.expires_at}

    def peek_reset_token(self, token: str) -> dict:
        rec = self.repo.reset_token(token)
        user_exists = bool(rec and self.repo.user_by_id(rec.user_id))
        err = reset_token_error(rec, user_exists, self.t())
        return {"valid": err is None, "error": err}

    def consume_reset_token(self, token: str, new_password: str) -> None:
        rec = self.repo.reset_token(token)
        user = self.repo.user_by_id(rec.user_id) if rec else None
        err = reset_token_error(rec, bool(user), self.t())
        if err:
            raise ServiceError(err)
        if not is_valid_password(new_password or ""):
            raise ServiceError("Mot de passe : 4 caractères minimum.")
        assert rec and user
        user.password_hash = hash_password(new_password)
        self.repo.update_user(user)
        self.repo.mark_reset_used(token, self.iso())
        self.repo.delete_sessions_for(user.id)

    # ---------- chat ----------
    def rooms_for(self, user: User) -> list[dict]:
        user = self.require(user)
        overrides = self.repo.all_room_access()
        messages = self.repo.all_messages()
        visits = self.repo.all_visits()
        users = self.repo.all_users()
        out = []
        for room in my_rooms(user, overrides):
            last = None
            room_msgs = [m for m in messages if m.room_id == room["id"] and not m.deleted]
            if room_msgs:
                room_msgs.sort(key=lambda m: m.created_at)
                last = room_msgs[-1]
            last_author = self.repo.user_by_id(last.author_id) if last else None
            participants = [u for u in users if room_access_of(u, room["id"], overrides)]
            out.append(
                {
                    **room,
                    "unread": unread_count(messages, visits, user.id, room["id"]),
                    "members": len(participants),
                    "lastMessage": None
                    if not last
                    else {
                        "id": last.id,
                        "body": last.body,
                        "createdAt": last.created_at,
                        "authorName": last_author.name if last_author else None,
                    },
                }
            )
        return out

    def room_messages(self, user: User, room_id: str) -> dict:
        user = self.require(user)
        room = room_by_id(room_id)
        if not room:
            raise ServiceError("Salon introuvable.", 404)
        overrides = self.repo.all_room_access()
        if not room_access_of(user, room_id, overrides):
            raise ServiceError("Votre accès à ce salon a été révoqué.", 403)
        self.repo.upsert_visit(user.id, room_id, self.iso())
        users = {u.id: u for u in self.repo.all_users()}
        msgs = []
        for m in self.repo.messages_of(room_id):
            author = users.get(m.author_id)
            msgs.append(
                {
                    "id": m.id,
                    "roomId": m.room_id,
                    "authorId": m.author_id,
                    "author": public_user(author) if author else None,
                    "body": m.body,
                    "replyToId": m.reply_to_id,
                    "deleted": m.deleted,
                    "reactions": m.reactions,
                    "createdAt": m.created_at,
                }
            )
        participants = []
        for u in users.values():
            if room_access_of(u, room_id, overrides):
                participants.append(public_user(u))
        participants.sort(key=lambda p: ({"ADMIN": 0, "PROF": 1, "RELAIS": 2, "ETUDIANT": 3}[p["role"]], p.get("pole") or "", p["name"]))
        grantable = []
        for u in users.values():
            if room_access_of(u, room_id, overrides):
                continue
            if can_moderate_room(user, room, u):
                grantable.append(public_user(u))
        grantable.sort(key=lambda p: (p.get("pole") or "", p["name"]))
        return {"room": room, "messages": msgs, "participants": participants, "grantable": grantable}

    def send_message(self, user: User, room_id: str, body: str, reply_to_id: Optional[str] = None) -> dict:
        user = self.require(user)
        if not (body or "").strip():
            raise ServiceError("Message vide.")
        room = room_by_id(room_id)
        if not room:
            raise ServiceError("Salon introuvable.", 404)
        if not room_access_of(user, room_id, self.repo.all_room_access()):
            raise ServiceError("Votre accès à ce salon a été révoqué.", 403)
        m = ChatMessage(
            id=uid("m"),
            room_id=room_id,
            author_id=user.id,
            body=body.strip(),
            reply_to_id=reply_to_id,
            created_at=self.iso(),
        )
        self.repo.insert_message(m)
        return {
            "id": m.id,
            "roomId": room_id,
            "authorId": user.id,
            "author": public_user(user),
            "body": m.body,
            "replyToId": reply_to_id,
            "deleted": False,
            "reactions": [],
            "createdAt": m.created_at,
        }

    def soft_delete_message(self, user: User, mid: str) -> None:
        user = self.require(user)
        m = self.repo.message(mid)
        if not m:
            raise ServiceError("Message introuvable.", 404)
        if m.author_id != user.id and user.role != "ADMIN":
            raise ServiceError("Vous ne pouvez pas supprimer ce message.", 403)
        m.deleted = True
        self.repo.update_message(m)

    def toggle_reaction(self, user: User, mid: str, emoji: str) -> list:
        user = self.require(user)
        m = self.repo.message(mid)
        if not m or m.deleted:
            raise ServiceError("Message introuvable.", 404)
        if not room_access_of(user, m.room_id, self.repo.all_room_access()):
            raise ServiceError("Votre accès à ce salon a été révoqué.", 403)
        reactions = list(m.reactions or [])
        already = any(r.get("emoji") == emoji and user.id in r.get("userIds", []) for r in reactions)
        for r in reactions:
            r["userIds"] = [i for i in r.get("userIds", []) if i != user.id]
        reactions = [r for r in reactions if r.get("userIds")]
        if not already:
            reactions.append({"emoji": emoji, "userIds": [user.id]})
        m.reactions = reactions
        self.repo.update_message(m)
        return reactions

    def mark_room_visited(self, user: User, room_id: str) -> None:
        user = self.require(user)
        self.repo.upsert_visit(user.id, room_id, self.iso())

    def set_room_access(self, user: User, room_id: str, target_id: str, granted: bool) -> None:
        user = self.require(user)
        room = room_by_id(room_id)
        target = self.repo.user_by_id(target_id)
        if not room or not target:
            raise ServiceError("Salon ou utilisateur introuvable.")
        if not can_moderate_room(user, room, target):
            raise ServiceError("Vous n’avez pas la permission de gérer cet accès.", 403)
        default = default_room_access(target, room)
        if default == granted:
            self.repo.set_room_access(None, target_id, room_id)
        else:
            self.repo.set_room_access(
                RoomAccess(
                    user_id=target_id,
                    room_id=room_id,
                    decision="GRANTED" if granted else "REVOKED",
                    by_id=user.id,
                    at=self.iso(),
                ),
                target_id,
                room_id,
            )

    # ---------- schedule / notes ----------
    def schedule_for(self, user: User, view_pole: Optional[str] = None) -> dict:
        user = self.require(user)
        slots = self.repo.all_slots()
        if user.pole:
            slots = [s for s in slots if s.pole == user.pole]
        elif view_pole and view_pole != "ALL":
            slots = [s for s in slots if s.pole == view_pole]
        notes = self.repo.notes_of(user.id)
        manage = user.role in ("ADMIN", "PROF", "RELAIS")
        slot_payloads = []
        for s in slots:
            pub = self._slot_public(s)
            if manage:
                pub["visioUrl"] = s.visio_url
                pub["evalUrl"] = s.eval_url
                pub["evalLinks"] = [{"group": l.group, "url": l.url} for l in s.eval_links]
            slot_payloads.append(pub)
        return {
            "slots": slot_payloads,
            "subjects": [
                {
                    "id": s.id,
                    "pole": s.pole,
                    "discipline": s.discipline,
                    "teacherName": s.teacher_name,
                    "room": s.room,
                }
                for s in self.repo.all_subjects()
                if not user.pole or s.pole == user.pole
            ],
            "notes": [self._note_public(n) for n in notes],
            "dueSoon": [self._note_public(n) for n in notes_due_within_48h(notes, self.t())],
            "canManage": user.role in ("ADMIN", "PROF", "RELAIS"),
        }

    def _slot_public(self, s: ScheduleSlot) -> dict:
        links = eval_links_of(s)
        return {
            "id": s.id,
            "pole": s.pole,
            "day": s.day,
            "start": s.start,
            "end": s.end,
            "discipline": s.discipline,
            "teacherName": s.teacher_name,
            "room": s.room,
            "hasVisio": bool(s.visio_url),
            "hasEval": bool(links),
            "evalGroups": [l["group"] or f"Groupe {i+1}" for i, l in enumerate(links)],
            "evalState": eval_state_of(s, self.t()),
            "evalStartsAt": s.eval_starts_at,
            "evalMinutes": s.eval_minutes,
            "visioOpen": s.visio_open,
            "evalOpen": s.eval_open,
            "coursePostponed": s.course_postponed,
            "evalPostponed": s.eval_postponed,
            "postponedReason": s.postponed_reason,
            "note": s.note,
            "createdAt": s.created_at,
        }

    def _note_public(self, n: CourseNote) -> dict:
        return {
            "id": n.id,
            "userId": n.user_id,
            "slotId": n.slot_id,
            "body": n.body,
            "done": n.done,
            "dueAt": n.due_at,
            "createdAt": n.created_at,
        }

    def open_schedule_link(self, user: User, slot_id: str, kind: str, group: Optional[str] = None) -> dict:
        user = self.require(user)
        slot = self.repo.slot(slot_id)
        if not slot:
            raise ServiceError("Créneau introuvable.", 404)
        if user.pole and slot.pole != user.pole and user.role not in ("PROF", "ADMIN"):
            raise ServiceError("Créneau hors de votre pôle.", 403)
        if kind == "visio":
            if not visio_access_allowed(slot):
                raise ServiceError("La visio n’est pas ouverte pour ce créneau.", 403)
            return {"url": slot.visio_url, "label": "Visio"}
        if kind == "eval":
            if not eval_access_allowed(slot, self.t()):
                state = eval_state_of(slot, self.t())
                if state == "upcoming":
                    raise ServiceError("L’évaluation n’est pas encore ouverte.", 403)
                if state == "ended":
                    raise ServiceError("La fenêtre d’évaluation est terminée.", 403)
                raise ServiceError("L’évaluation n’est pas accessible.", 403)
            links = eval_links_of(slot)
            if not links:
                raise ServiceError("Aucun lien d’évaluation.", 404)
            if group:
                for l in links:
                    if l["group"] == group:
                        return {"url": l["url"], "label": group}
            return {"url": links[0]["url"], "label": links[0]["group"] or "Évaluation"}
        raise ServiceError("Type de lien invalide.")

    def upsert_slot(self, user: User, data: dict) -> dict:
        user = self.require(user)
        if user.role not in ("ADMIN", "PROF", "RELAIS"):
            raise ServiceError("Vous n’avez pas le droit de modifier le planning.", 403)
        slot_id = data.get("id") or uid("s")
        existing = self.repo.slot(slot_id)
        eval_links = [EvalLink(group=x.get("group", ""), url=x.get("url", "")) for x in (data.get("evalLinks") or [])]
        slot = ScheduleSlot(
            id=slot_id,
            pole=data.get("pole") or (existing.pole if existing else (user.pole or "STI")),
            day=data.get("day") or (existing.day if existing else "LUNDI"),
            start=data.get("start") or (existing.start if existing else "08:00"),
            end=data.get("end") or (existing.end if existing else "10:00"),
            discipline=(data.get("discipline") or (existing.discipline if existing else "")).strip(),
            teacher_name=(data.get("teacherName") or (existing.teacher_name if existing else "")).strip(),
            room=data.get("room") if "room" in data else (existing.room if existing else None),
            visio_url=data.get("visioUrl") if "visioUrl" in data else (existing.visio_url if existing else None),
            eval_url=data.get("evalUrl") if "evalUrl" in data else (existing.eval_url if existing else None),
            eval_links=eval_links or (existing.eval_links if existing else []),
            eval_starts_at=data.get("evalStartsAt") if "evalStartsAt" in data else (existing.eval_starts_at if existing else None),
            eval_minutes=data.get("evalMinutes") if "evalMinutes" in data else (existing.eval_minutes if existing else None),
            visio_open=bool(data["visioOpen"]) if "visioOpen" in data else (existing.visio_open if existing else True),
            eval_open=bool(data["evalOpen"]) if "evalOpen" in data else (existing.eval_open if existing else True),
            course_postponed=bool(data["coursePostponed"]) if "coursePostponed" in data else (existing.course_postponed if existing else False),
            eval_postponed=bool(data["evalPostponed"]) if "evalPostponed" in data else (existing.eval_postponed if existing else False),
            postponed_reason=data.get("postponedReason") if "postponedReason" in data else (existing.postponed_reason if existing else None),
            note=data.get("note") if "note" in data else (existing.note if existing else None),
            created_at=existing.created_at if existing else self.iso(),
        )
        if not slot.discipline or not slot.teacher_name:
            raise ServiceError("Discipline et enseignant sont obligatoires.")
        self.repo.upsert_slot(slot)
        subjects = self.repo.all_subjects()
        match = next((s for s in subjects if s.pole == slot.pole and s.discipline == slot.discipline), None)
        info = Subject(
            id=match.id if match else uid("sub"),
            pole=slot.pole,
            discipline=slot.discipline,
            teacher_name=slot.teacher_name,
            room=slot.room,
            visio_url=slot.visio_url,
            eval_url=slot.eval_url,
        )
        self.repo.upsert_subject(info)
        return self._slot_public(slot)

    def delete_slot(self, user: User, slot_id: str) -> None:
        user = self.require(user)
        if user.role not in ("ADMIN", "PROF", "RELAIS"):
            raise ServiceError("Vous n’avez pas le droit de modifier le planning.", 403)
        self.repo.delete_slot(slot_id)

    def update_subject(self, user: User, sid: str, patch: dict) -> dict:
        user = self.require(user)
        if user.role not in ("ADMIN", "PROF", "RELAIS"):
            raise ServiceError("Vous n’avez pas le droit de modifier les matières.", 403)
        subj = self.repo.subject(sid)
        if not subj:
            raise ServiceError("Matière introuvable.", 404)
        discipline = (patch.get("discipline") or "").strip()
        teacher = (patch.get("teacherName") or "").strip()
        if not discipline:
            raise ServiceError("L’intitulé de la matière est obligatoire.")
        if not teacher:
            raise ServiceError("Le nom de l’enseignant est obligatoire.")
        for s in self.repo.all_subjects():
            if s.id != sid and s.pole == subj.pole and s.discipline.lower() == discipline.lower():
                raise ServiceError(f"« {discipline} » existe déjà pour le pôle {subj.pole}.")
        old = subj.discipline
        subj.discipline = discipline
        subj.teacher_name = teacher
        subj.room = (patch.get("room") or "").strip() or None
        subj.visio_url = (patch.get("visioUrl") or "").strip() or None
        subj.eval_url = (patch.get("evalUrl") or "").strip() or None
        self.repo.upsert_subject(subj)
        self.repo.update_slots_discipline(subj.pole, old, subj)
        return {"id": subj.id, "pole": subj.pole, "discipline": subj.discipline, "teacherName": subj.teacher_name, "room": subj.room}

    def upsert_note(self, user: User, data: dict) -> dict:
        user = self.require(user)
        body = (data.get("body") or "").strip()
        if len(body) < 3:
            raise ServiceError("Écrivez au moins quelques mots (3 caractères minimum).")
        nid = data.get("id") or uid("cn")
        existing = self.repo.note(nid)
        if existing and existing.user_id != user.id:
            raise ServiceError("Cette note ne vous appartient pas.", 403)
        note = CourseNote(
            id=nid,
            user_id=user.id,
            slot_id=data.get("slotId") or (existing.slot_id if existing else ""),
            body=body,
            done=bool(data.get("done", existing.done if existing else False)),
            due_at=data.get("dueAt") if "dueAt" in data else (existing.due_at if existing else None),
            created_at=existing.created_at if existing else self.iso(),
        )
        self.repo.upsert_note(note)
        return self._note_public(note)

    def delete_note(self, user: User, nid: str) -> None:
        user = self.require(user)
        n = self.repo.note(nid)
        if not n or n.user_id != user.id:
            raise ServiceError("Note introuvable.", 404)
        self.repo.delete_note(nid)

    # ---------- syllabus / grades / submissions ----------
    def syllabus(self, user: User, q: str = "", sort: str = "recent") -> list[dict]:
        user = self.require(user)
        docs = visible_syllabus(user, self.repo.all_docs())
        users = {u.id: u for u in self.repo.all_users()}
        matched = [d for d in docs if syllabus_matches(d, q, users.get(d.author_id).name if users.get(d.author_id) else "")]
        matched = sort_syllabus(matched, sort)
        out = []
        for d in matched:
            author = users.get(d.author_id)
            out.append(
                {
                    "id": d.id,
                    "authorId": d.author_id,
                    "author": public_user(author) if author else None,
                    "title": d.title,
                    "description": d.description,
                    "poles": d.poles,
                    "discipline": d.discipline,
                    "fileName": d.file_name,
                    "fileType": d.file_type,
                    "fileSize": d.file_size,
                    "createdAt": d.created_at,
                    "canDelete": user.role == "ADMIN" or user.id == d.author_id,
                }
            )
        return out

    def add_syllabus(self, user: User, data: dict, file_name: str, file_type: str, content: bytes) -> dict:
        user = self.require(user)
        if not can_add_syllabus(user):
            raise ServiceError("Seuls les enseignants, relais et l’administration peuvent déposer un document.", 403)
        if not (data.get("title") or "").strip():
            raise ServiceError("Le titre est obligatoire.")
        poles = [p for p in (data.get("poles") or []) if p in POLES]
        if not poles:
            raise ServiceError("Sélectionnez au moins un pôle cible.")
        if file_too_large(len(content)):
            raise ServiceError("Fichier trop volumineux : 20 Mo maximum.")
        did = uid("doc")
        self._write_file(did, content)
        doc = SyllabusDoc(
            id=did,
            author_id=user.id,
            title=data["title"].strip(),
            description=(data.get("description") or "").strip() or None,
            poles=poles,
            discipline=(data.get("discipline") or "").strip() or None,
            file_name=file_name,
            file_type=file_type or "application/octet-stream",
            file_size=len(content),
            created_at=self.iso(),
        )
        self.repo.insert_doc(doc)
        return {"id": did}

    def syllabus_file(self, user: User, did: str) -> tuple[bytes, str, str]:
        user = self.require(user)
        doc = self.repo.doc(did)
        if not doc:
            raise ServiceError("Document introuvable.", 404)
        if visible_syllabus(user, [doc]) == []:
            raise ServiceError("Document introuvable.", 404)
        data = self._read_file(did)
        if data is None and doc.seed:
            data = demo_pdf([doc.title, "Document de démonstration 2late", "", doc.description or "", f"Pôles : {', '.join(doc.poles)}"])
            self._write_file(did, data)
        if data is None:
            raise ServiceError("Fichier introuvable.", 404)
        return data, doc.file_name, doc.file_type

    def delete_syllabus(self, user: User, did: str) -> None:
        user = self.require(user)
        doc = self.repo.doc(did)
        if not doc:
            raise ServiceError("Document introuvable.", 404)
        if user.role != "ADMIN" and user.id != doc.author_id:
            raise ServiceError("Vous ne pouvez pas supprimer ce document.", 403)
        self.repo.delete_doc(did)
        self._rm_file(did)

    def grades(self, user: User) -> dict:
        user = self.require(user)
        items = self.repo.grades_of(user.id)
        return {
            "grades": [
                {
                    "id": g.id,
                    "discipline": g.discipline,
                    "title": g.title,
                    "value": g.value,
                    "coef": g.coef,
                    "createdAt": g.created_at,
                }
                for g in items
            ],
            "average": weighted_average(items),
        }

    def add_grade(self, user: User, data: dict) -> dict:
        user = self.require(user)
        try:
            value = float(str(data.get("value", "")).replace(",", "."))
            coef = float(str(data.get("coef", "1")).replace(",", "."))
        except (TypeError, ValueError):
            raise ServiceError("Note invalide : entre 0 et 20.")
        err = validate_grade(value, coef, data.get("discipline") or "", data.get("title") or "")
        if err:
            raise ServiceError(err)
        g = Grade(
            id=uid("g"),
            user_id=user.id,
            discipline=data["discipline"].strip(),
            title=data["title"].strip(),
            value=value,
            coef=coef,
            created_at=self.iso(),
        )
        self.repo.insert_grade(g)
        return {"id": g.id, "average": weighted_average(self.repo.grades_of(user.id))}

    def delete_grade(self, user: User, gid: str) -> None:
        user = self.require(user)
        g = self.repo.grade(gid)
        if not g or g.user_id != user.id:
            raise ServiceError("Note introuvable.", 404)
        self.repo.delete_grade(gid)

    def submit(self, user: User, aid: str, file_name: str, file_type: str, content: bytes) -> dict:
        user = self.require(user)
        a = self.repo.announcement(aid)
        if not a:
            raise ServiceError("Annonce introuvable.", 404)
        ok, err = can_submit_to(user, a, self.t())
        if not ok:
            raise ServiceError(err or "Dépôt refusé.", 403)
        if file_too_large(len(content)):
            raise ServiceError("Fichier trop volumineux : 20 Mo maximum.")
        sid = uid("sub")
        self._write_file(sid, content)
        s = Submission(
            id=sid,
            announcement_id=aid,
            user_id=user.id,
            file_name=file_name,
            file_type=file_type or "application/octet-stream",
            file_size=len(content),
            created_at=self.iso(),
        )
        self.repo.insert_submission(s)
        return {"id": sid, "createdAt": s.created_at, "fileName": file_name, "fileSize": s.file_size}

    def _subs_public(self, user: User, a: Announcement) -> list[dict]:
        if not can_collect(user, a) and user.role not in ("ETUDIANT", "RELAIS"):
            return []
        items = self.repo.submissions_of(a.id)
        if not can_collect(user, a):
            items = [s for s in items if s.user_id == user.id]
        download = can_download_submission(user, a)
        out = []
        for s in items:
            stu = self.repo.user_by_id(s.user_id)
            out.append(
                {
                    "id": s.id,
                    "announcementId": s.announcement_id,
                    "userId": s.user_id,
                    "student": public_user(stu) if stu else None,
                    "fileName": s.file_name,
                    "fileType": s.file_type,
                    "fileSize": s.file_size,
                    "createdAt": s.created_at,
                    "canDownload": download or s.user_id == user.id,
                }
            )
        out.sort(key=lambda x: ((x["student"] or {}).get("name") or "", x["createdAt"]), reverse=False)
        return out

    def submission_file(self, user: User, sid: str) -> tuple[bytes, str, str, Optional[str]]:
        user = self.require(user)
        s = self.repo.submission(sid)
        if not s:
            raise ServiceError("Dépôt introuvable.", 404)
        a = self.repo.announcement(s.announcement_id)
        if not a:
            raise ServiceError("Annonce introuvable.", 404)
        if s.user_id != user.id and not can_download_submission(user, a):
            raise ServiceError("Téléchargement non autorisé.", 403)
        data = self._read_file(sid)
        if data is None:
            raise ServiceError("Fichier introuvable.", 404)
        student = self.repo.user_by_id(s.user_id)
        return data, s.file_name, s.file_type, student.name if student else None

    def delete_submission(self, user: User, sid: str) -> None:
        user = self.require(user)
        s = self.repo.submission(sid)
        if not s:
            raise ServiceError("Dépôt introuvable.", 404)
        if s.user_id != user.id and user.role != "ADMIN":
            raise ServiceError("Vous ne pouvez pas retirer ce dépôt.", 403)
        self.repo.delete_submission(sid)
        self._rm_file(sid)

    def set_collect_access(self, user: User, aid: str, access: str) -> None:
        user = self.require(user)
        a = self.repo.announcement(aid)
        if not a:
            raise ServiceError("Annonce introuvable.", 404)
        if not can_manage_collect(user, a):
            raise ServiceError("Vous ne pouvez pas modifier ce droit.", 403)
        if access not in COLLECT_ACCESSES:
            raise ServiceError("Droit invalide.")
        a.collect_access = access
        self.repo.update_announcement(a)

    def set_collect_email(self, user: User, aid: str, email: str) -> None:
        user = self.require(user)
        a = self.repo.announcement(aid)
        if not a:
            raise ServiceError("Annonce introuvable.", 404)
        if not can_manage_collect(user, a):
            raise ServiceError("Vous ne pouvez pas modifier cette adresse.", 403)
        clean = (email or "").strip()
        if clean and not is_valid_email(clean):
            raise ServiceError("Adresse e-mail invalide.")
        a.collect_email = clean or None
        self.repo.update_announcement(a)

    def set_whatsapp(self, user: User, number: str) -> None:
        user = self.require(user)
        wa = (number or "").strip()
        if wa and not is_valid_whatsapp(wa):
            raise ServiceError("Numéro WhatsApp invalide (indicatif inclus, ex. +241 06 12 34 56).")
        user.whatsapp = wa or None
        self.repo.update_user(user)

    # ---------- admin ----------
    def admin_announcements(self, user: User) -> list[dict]:
        self.require_admin(user)
        items = [self._ann_public(a) for a in self.repo.all_announcements()]
        items.sort(key=lambda a: a["createdAt"], reverse=True)
        return items

    def admin_stats(self, user: User) -> dict:
        self.require_admin(user)
        users = self.repo.all_users()
        anns = self.repo.all_announcements()
        comments = self.repo.all_comments()
        reads = self.repo.all_reads()
        students = [u for u in users if u.role in ("ETUDIANT", "RELAIS")]
        relais = [u for u in users if u.role == "RELAIS"]
        urgent = [a for a in anns if a.priority == "URGENTE"]
        by_pole = {p: sum(1 for u in students if u.pole == p) for p in POLES}
        by_type: dict[str, int] = {}
        for a in anns:
            by_type[a.type] = by_type.get(a.type, 0) + 1
        rates = [r for r in (read_rate(a, users, reads) for a in anns) if r is not None]
        avg_read = int(round(sum(rates) / len(rates))) if rates else None
        contested = []
        for a in anns:
            author = self.repo.user_by_id(a.author_id)
            rel = reliability_of_ann(a, self.repo.votes_of(a.id))
            if author and author.role == "RELAIS" and rel["total"] > 0 and (rel["pct"] or 0) < RELIABLE_THRESHOLD:
                contested.append({"id": a.id, "title": a.title, "reliability": rel, "poles": a.poles, "createdAt": a.created_at})
        contested.sort(key=lambda x: x["reliability"]["pct"] or 0)
        pending = [ap for ap in self.repo.all_applications() if ap.status == "PENDING"]
        return {
            "students": len(students),
            "relais": len(relais),
            "members": len(users),
            "announcements": len(anns),
            "urgent": len(urgent),
            "comments": len(comments),
            "avgRead": avg_read,
            "byPole": by_pole,
            "byType": by_type,
            "contested": contested[:8],
            "pendingApplications": len(pending),
        }

    def admin_members(self, user: User) -> list[dict]:
        self.require_admin(user)
        return [public_user(u) for u in self.repo.all_users()]

    def admin_applications(self, user: User) -> list[dict]:
        self.require_admin(user)
        out = []
        for a in self.repo.all_applications():
            u = self.repo.user_by_id(a.user_id)
            out.append(
                {
                    "id": a.id,
                    "userId": a.user_id,
                    "user": public_user(u) if u else None,
                    "status": a.status,
                    "message": a.message,
                    "whatsapp": a.whatsapp,
                    "createdAt": a.created_at,
                    "decidedAt": a.decided_at,
                }
            )
        return out

    def create_staff(self, user: User, name: str, email: str, password: str, role: str = "PROF") -> dict:
        self.require_admin(user)
        if role not in ("PROF", "ADMIN"):
            raise ServiceError("Rôle invalide.")
        clean = (email or "").strip().lower()
        if not (name or "").strip():
            raise ServiceError("Nom du professeur requis.")
        if not is_valid_email(clean):
            raise ServiceError("Adresse e-mail invalide.")
        if not is_valid_password(password or ""):
            raise ServiceError("Mot de passe : 4 caractères minimum.")
        if self.repo.user_by_email(clean):
            raise ServiceError("Un compte existe déjà avec cet e-mail.")
        nu = User(
            id=uid("u"),
            name=name.strip(),
            email=clean,
            password_hash=hash_password(password),
            role=role,
            created_at=self.iso(),
        )
        self.repo.insert_user(nu)
        return public_user(nu)

    def set_user_disabled(self, user: User, target_id: str, disabled: bool) -> None:
        self.require_admin(user)
        if target_id == user.id:
            raise ServiceError("Vous ne pouvez pas désactiver votre propre compte.")
        target = self.repo.user_by_id(target_id)
        if not target:
            raise ServiceError("Utilisateur introuvable.", 404)
        target.disabled = disabled
        self.repo.update_user(target)
        if disabled:
            self.repo.delete_sessions_for(target_id)

    def set_relais_status(self, user: User, target_id: str, make_relais: bool) -> None:
        self.require_admin(user)
        target = self.repo.user_by_id(target_id)
        if not target:
            raise ServiceError("Utilisateur introuvable.", 404)
        if make_relais and target.role == "ETUDIANT":
            target.role = "RELAIS"
            self.repo.update_user(target)
            self.repo.delete_pending_for(target_id)
        elif not make_relais and target.role == "RELAIS":
            target.role = "ETUDIANT"
            self.repo.update_user(target)

    def delete_user(self, user: User, target_id: str) -> None:
        self.require_admin(user)
        if target_id == user.id:
            raise ServiceError("Vous ne pouvez pas supprimer votre propre compte.")
        target = self.repo.user_by_id(target_id)
        if not target:
            raise ServiceError("Utilisateur introuvable.", 404)
        anns = [a for a in self.repo.all_announcements() if a.author_id == target_id]
        for a in anns:
            for s in self.repo.submissions_of(a.id):
                self._rm_file(s.id)
            self.repo.delete_announcement(a.id)
        for s in self.repo.all_submissions():
            if s.user_id == target_id:
                self._rm_file(s.id)
                self.repo.delete_submission(s.id)
        for g in self.repo.grades_of(target_id):
            self.repo.delete_grade(g.id)
        for n in self.repo.notes_of(target_id):
            self.repo.delete_note(n.id)
        for d in self.repo.all_docs():
            if d.author_id == target_id:
                self._rm_file(d.id)
                self.repo.delete_doc(d.id)
        # leftover votes / comments / reads / applications
        for v in self.repo.all_votes():
            if v.user_id == target_id:
                self.repo.delete_vote(v.id)
        for c in self.repo.all_comments():
            if c.author_id == target_id:
                self.repo.delete_comment(c.id)
        self.repo.conn.execute("DELETE FROM reads WHERE user_id=?", (target_id,))
        self.repo.conn.execute("DELETE FROM applications WHERE user_id=?", (target_id,))
        self.repo.conn.execute("DELETE FROM room_access WHERE user_id=?", (target_id,))
        self.repo.conn.execute("DELETE FROM chat_visits WHERE user_id=?", (target_id,))
        self.repo.conn.execute("DELETE FROM reset_tokens WHERE user_id=?", (target_id,))
        self.repo.delete_sessions_for(target_id)
        self.repo.delete_user(target_id)

    def admin_export(self, user: User) -> dict:
        self.require_admin(user)
        users = [public_user(u) for u in self.repo.all_users()]
        anns = []
        for a in self.repo.all_announcements():
            item = self._ann_public(a)
            item.pop("canVote", None)
            anns.append(item)
        return {
            "users": users,
            "announcements": anns,
            "comments": [
                {"id": c.id, "announcementId": c.announcement_id, "authorId": c.author_id, "body": c.body, "createdAt": c.created_at}
                for c in self.repo.all_comments()
            ],
            "applications": [
                {"id": a.id, "userId": a.user_id, "status": a.status, "createdAt": a.created_at}
                for a in self.repo.all_applications()
            ],
            "gradesCount": len(self.repo.all_grades()),
            "submissionsCount": len(self.repo.all_submissions()),
        }

    def upsert_milestone(self, user: User, data: dict) -> dict:
        self.require_admin(user)
        mid = data.get("id") or uid("ms")
        existing = next((m for m in self.repo.all_milestones() if m.id == mid), None)
        m = Milestone(
            id=mid,
            threshold=int(data.get("threshold") or (existing.threshold if existing else 10)),
            title=(data.get("title") or (existing.title if existing else "{n} membres !")),
            message=(data.get("message") or (existing.message if existing else "")),
            reached_at=existing.reached_at if existing else None,
        )
        if m.threshold <= 0:
            raise ServiceError("Seuil invalide.")
        self.repo.upsert_milestone(m)
        return {"id": m.id, "threshold": m.threshold, "title": m.title, "message": m.message, "reachedAt": m.reached_at}

    def delete_milestone(self, user: User, mid: str) -> None:
        self.require_admin(user)
        self.repo.delete_milestone(mid)

    def reset_milestone(self, user: User, mid: str) -> None:
        self.require_admin(user)
        for m in self.repo.all_milestones():
            if m.id == mid:
                m.reached_at = None
                self.repo.upsert_milestone(m)
                return
        raise ServiceError("Palier introuvable.", 404)

    def nav_badges(self, user: User) -> dict:
        user = self.require(user)
        packed = feeds(user, self.repo.all_announcements(), self.repo.all_reads(), self.t())
        overrides = self.repo.all_room_access()
        messages = self.repo.all_messages()
        visits = self.repo.all_visits()
        chat = 0
        for room in my_rooms(user, overrides):
            chat += unread_count(messages, visits, user.id, room["id"])
        pending = 0
        if user.role == "ADMIN":
            pending = sum(1 for a in self.repo.all_applications() if a.status == "PENDING")
        return {
            "toRead": len(packed["toRead"]),
            "chatUnread": chat,
            "mentionPending": mention_pending(user, messages, visits, overrides),
            "pendingApplications": pending,
        }

    def bootstrap(self, user: User) -> dict:
        user = self.require(user)
        packed = self.feed(user)
        return {
            "user": public_user(user),
            "feed": packed,
            "badges": self.nav_badges(user),
            "milestones": [
                {"id": m.id, "threshold": m.threshold, "title": m.title, "message": m.message, "reachedAt": m.reached_at}
                for m in self.repo.all_milestones()
            ],
            "myApplication": next(
                (
                    {"id": a.id, "status": a.status, "createdAt": a.created_at}
                    for a in self.repo.all_applications()
                    if a.user_id == user.id and a.status == "PENDING"
                ),
                None,
            ),
        }

    # ---------- files ----------
    def _safe_id(self, file_id: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9._-]+", file_id or ""):
            raise ServiceError("Identifiant de fichier invalide.")
        return file_id

    def _path(self, file_id: str) -> Path:
        return self.uploads_dir / self._safe_id(file_id)

    def _write_file(self, file_id: str, content: bytes) -> None:
        self._path(file_id).write_bytes(content)

    def _read_file(self, file_id: str) -> Optional[bytes]:
        p = self._path(file_id)
        if not p.exists():
            return None
        return p.read_bytes()

    def _rm_file(self, file_id: str) -> None:
        p = self._path(file_id)
        if p.exists():
            p.unlink()
