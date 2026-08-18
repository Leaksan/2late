"""SQLite repository — thin persistence, no authorization."""

from __future__ import annotations

import json
import sqlite3
from typing import Any, Optional

from .models import (
    AnnLink,
    Announcement,
    ChatMessage,
    ChatVisit,
    Comment,
    CourseNote,
    EvalLink,
    Grade,
    Milestone,
    ReadReceipt,
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


def _j(value: Any) -> Optional[str]:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False)


def _loads(raw: Optional[str], default):
    if not raw:
        return default
    return json.loads(raw)


class Repo:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    # ---------- users ----------
    def _user(self, row) -> Optional[User]:
        if row is None:
            return None
        return User(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            password_hash=row["password_hash"],
            role=row["role"],
            pole=row["pole"],
            whatsapp=row["whatsapp"],
            disabled=bool(row["disabled"]),
            created_at=row["created_at"],
        )

    def user_by_id(self, user_id: str) -> Optional[User]:
        return self._user(self.conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone())

    def user_by_email(self, email: str) -> Optional[User]:
        return self._user(
            self.conn.execute("SELECT * FROM users WHERE lower(email)=?", (email.strip().lower(),)).fetchone()
        )

    def all_users(self) -> list[User]:
        return [self._user(r) for r in self.conn.execute("SELECT * FROM users")]  # type: ignore[misc]

    def insert_user(self, u: User) -> None:
        self.conn.execute(
            "INSERT INTO users (id, name, email, password_hash, role, pole, whatsapp, disabled, created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (u.id, u.name, u.email, u.password_hash, u.role, u.pole, u.whatsapp, int(u.disabled), u.created_at),
        )
        self.conn.commit()

    def update_user(self, u: User) -> None:
        self.conn.execute(
            "UPDATE users SET name=?, email=?, password_hash=?, role=?, pole=?, whatsapp=?, disabled=? WHERE id=?",
            (u.name, u.email, u.password_hash, u.role, u.pole, u.whatsapp, int(u.disabled), u.id),
        )
        self.conn.commit()

    def delete_user(self, user_id: str) -> None:
        self.conn.execute("DELETE FROM users WHERE id=?", (user_id,))
        self.conn.commit()

    # ---------- sessions ----------
    def insert_session(self, token: str, user_id: str, created_at: str) -> None:
        self.conn.execute(
            "INSERT INTO sessions (token, user_id, created_at) VALUES (?,?,?)",
            (token, user_id, created_at),
        )
        self.conn.commit()

    def session_user(self, token: str) -> Optional[User]:
        row = self.conn.execute(
            "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?",
            (token,),
        ).fetchone()
        return self._user(row)

    def delete_session(self, token: str) -> None:
        self.conn.execute("DELETE FROM sessions WHERE token=?", (token,))
        self.conn.commit()

    def delete_sessions_for(self, user_id: str) -> None:
        self.conn.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
        self.conn.commit()

    # ---------- announcements ----------
    def _ann(self, row) -> Announcement:
        links_raw = _loads(row["links"], [])
        links = [AnnLink(**l) if isinstance(l, dict) and "id" in l else AnnLink(id=l.get("id", ""), label=l.get("label", ""), url=l.get("url", "")) for l in links_raw]
        return Announcement(
            id=row["id"],
            author_id=row["author_id"],
            title=row["title"],
            type=row["type"],
            description=row["description"],
            poles=_loads(row["poles"], []),
            priority=row["priority"],
            reliability_override=row["reliability_override"],
            links=links,
            expires_at=row["expires_at"],
            collect_access=row["collect_access"],
            collect_email=row["collect_email"],
            publish_at=row["publish_at"],
            repeat=row["repeat"],
            created_at=row["created_at"],
        )

    def all_announcements(self) -> list[Announcement]:
        return [self._ann(r) for r in self.conn.execute("SELECT * FROM announcements")]

    def announcement(self, aid: str) -> Optional[Announcement]:
        row = self.conn.execute("SELECT * FROM announcements WHERE id=?", (aid,)).fetchone()
        return self._ann(row) if row else None

    def insert_announcement(self, a: Announcement) -> None:
        self.conn.execute(
            "INSERT INTO announcements (id, author_id, title, type, description, poles, priority, "
            "reliability_override, links, expires_at, collect_access, collect_email, publish_at, repeat, created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                a.id, a.author_id, a.title, a.type, a.description, json.dumps(a.poles),
                a.priority, a.reliability_override,
                json.dumps([{"id": l.id, "label": l.label, "url": l.url} for l in a.links]) if a.links else None,
                a.expires_at, a.collect_access, a.collect_email, a.publish_at, a.repeat, a.created_at,
            ),
        )
        self.conn.commit()

    def update_announcement(self, a: Announcement) -> None:
        self.conn.execute(
            "UPDATE announcements SET title=?, type=?, description=?, poles=?, priority=?, reliability_override=?, "
            "links=?, expires_at=?, collect_access=?, collect_email=?, publish_at=?, repeat=? WHERE id=?",
            (
                a.title, a.type, a.description, json.dumps(a.poles), a.priority, a.reliability_override,
                json.dumps([{"id": l.id, "label": l.label, "url": l.url} for l in a.links]) if a.links else None,
                a.expires_at, a.collect_access, a.collect_email, a.publish_at, a.repeat, a.id,
            ),
        )
        self.conn.commit()

    def delete_announcement(self, aid: str) -> None:
        self.conn.execute("DELETE FROM votes WHERE announcement_id=?", (aid,))
        self.conn.execute("DELETE FROM reads WHERE announcement_id=?", (aid,))
        self.conn.execute("DELETE FROM comments WHERE announcement_id=?", (aid,))
        self.conn.execute("DELETE FROM submissions WHERE announcement_id=?", (aid,))
        self.conn.execute("DELETE FROM announcements WHERE id=?", (aid,))
        self.conn.commit()

    # ---------- votes / reads / comments ----------
    def _vote(self, row) -> Vote:
        return Vote(id=row["id"], announcement_id=row["announcement_id"], user_id=row["user_id"], value=int(row["value"]), created_at=row["created_at"])

    def all_votes(self) -> list[Vote]:
        return [self._vote(r) for r in self.conn.execute("SELECT * FROM votes")]

    def votes_of(self, aid: str) -> list[Vote]:
        return [self._vote(r) for r in self.conn.execute("SELECT * FROM votes WHERE announcement_id=?", (aid,))]

    def vote_of(self, aid: str, uid: str) -> Optional[Vote]:
        row = self.conn.execute("SELECT * FROM votes WHERE announcement_id=? AND user_id=?", (aid, uid)).fetchone()
        return self._vote(row) if row else None

    def upsert_vote(self, v: Vote) -> None:
        existing = self.vote_of(v.announcement_id, v.user_id)
        if existing:
            self.conn.execute("UPDATE votes SET value=?, created_at=? WHERE id=?", (v.value, v.created_at, existing.id))
        else:
            self.conn.execute(
                "INSERT INTO votes (id, announcement_id, user_id, value, created_at) VALUES (?,?,?,?,?)",
                (v.id, v.announcement_id, v.user_id, v.value, v.created_at),
            )
        self.conn.commit()

    def delete_vote(self, vid: str) -> None:
        self.conn.execute("DELETE FROM votes WHERE id=?", (vid,))
        self.conn.commit()

    def all_reads(self) -> list[ReadReceipt]:
        return [
            ReadReceipt(announcement_id=r["announcement_id"], user_id=r["user_id"], read_at=r["read_at"])
            for r in self.conn.execute("SELECT * FROM reads")
        ]

    def upsert_read(self, announcement_id: str, user_id: str, read_at: str) -> None:
        self.conn.execute(
            "INSERT INTO reads (announcement_id, user_id, read_at) VALUES (?,?,?) "
            "ON CONFLICT(announcement_id, user_id) DO UPDATE SET read_at=excluded.read_at",
            (announcement_id, user_id, read_at),
        )
        self.conn.commit()

    def _comment(self, row) -> Comment:
        return Comment(id=row["id"], announcement_id=row["announcement_id"], author_id=row["author_id"], body=row["body"], created_at=row["created_at"])

    def all_comments(self) -> list[Comment]:
        return [self._comment(r) for r in self.conn.execute("SELECT * FROM comments")]

    def comments_of(self, aid: str) -> list[Comment]:
        rows = self.conn.execute("SELECT * FROM comments WHERE announcement_id=? ORDER BY created_at", (aid,))
        return [self._comment(r) for r in rows]

    def comment(self, cid: str) -> Optional[Comment]:
        row = self.conn.execute("SELECT * FROM comments WHERE id=?", (cid,)).fetchone()
        return self._comment(row) if row else None

    def insert_comment(self, c: Comment) -> None:
        self.conn.execute(
            "INSERT INTO comments (id, announcement_id, author_id, body, created_at) VALUES (?,?,?,?,?)",
            (c.id, c.announcement_id, c.author_id, c.body, c.created_at),
        )
        self.conn.commit()

    def delete_comment(self, cid: str) -> None:
        self.conn.execute("DELETE FROM comments WHERE id=?", (cid,))
        self.conn.commit()

    # ---------- applications ----------
    def _app(self, row) -> RelaisApplication:
        return RelaisApplication(
            id=row["id"], user_id=row["user_id"], status=row["status"], message=row["message"],
            whatsapp=row["whatsapp"], created_at=row["created_at"], decided_at=row["decided_at"],
        )

    def all_applications(self) -> list[RelaisApplication]:
        return [self._app(r) for r in self.conn.execute("SELECT * FROM applications")]

    def application(self, aid: str) -> Optional[RelaisApplication]:
        row = self.conn.execute("SELECT * FROM applications WHERE id=?", (aid,)).fetchone()
        return self._app(row) if row else None

    def insert_application(self, a: RelaisApplication) -> None:
        self.conn.execute(
            "INSERT INTO applications (id, user_id, status, message, whatsapp, created_at, decided_at) VALUES (?,?,?,?,?,?,?)",
            (a.id, a.user_id, a.status, a.message, a.whatsapp, a.created_at, a.decided_at),
        )
        self.conn.commit()

    def update_application(self, a: RelaisApplication) -> None:
        self.conn.execute(
            "UPDATE applications SET status=?, decided_at=? WHERE id=?",
            (a.status, a.decided_at, a.id),
        )
        self.conn.commit()

    def delete_pending_for(self, user_id: str) -> None:
        self.conn.execute("DELETE FROM applications WHERE user_id=? AND status='PENDING'", (user_id,))
        self.conn.commit()

    # ---------- reset tokens ----------
    def _rt(self, row) -> ResetToken:
        return ResetToken(token=row["token"], user_id=row["user_id"], created_at=row["created_at"], expires_at=row["expires_at"], used_at=row["used_at"])

    def reset_token(self, token: str) -> Optional[ResetToken]:
        row = self.conn.execute("SELECT * FROM reset_tokens WHERE token=?", (token,)).fetchone()
        return self._rt(row) if row else None

    def insert_reset_token(self, t: ResetToken) -> None:
        self.conn.execute("DELETE FROM reset_tokens WHERE user_id=? AND used_at IS NULL", (t.user_id,))
        self.conn.execute(
            "INSERT INTO reset_tokens (token, user_id, created_at, expires_at, used_at) VALUES (?,?,?,?,?)",
            (t.token, t.user_id, t.created_at, t.expires_at, t.used_at),
        )
        self.conn.commit()

    def mark_reset_used(self, token: str, used_at: str) -> None:
        self.conn.execute("UPDATE reset_tokens SET used_at=? WHERE token=?", (used_at, token))
        self.conn.commit()

    # ---------- chat ----------
    def _msg(self, row) -> ChatMessage:
        return ChatMessage(
            id=row["id"], room_id=row["room_id"], author_id=row["author_id"], body=row["body"],
            reply_to_id=row["reply_to_id"], deleted=bool(row["deleted"]),
            reactions=_loads(row["reactions"], []), created_at=row["created_at"],
        )

    def all_messages(self) -> list[ChatMessage]:
        return [self._msg(r) for r in self.conn.execute("SELECT * FROM chat_messages")]

    def messages_of(self, room_id: str) -> list[ChatMessage]:
        return [self._msg(r) for r in self.conn.execute("SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at", (room_id,))]

    def message(self, mid: str) -> Optional[ChatMessage]:
        row = self.conn.execute("SELECT * FROM chat_messages WHERE id=?", (mid,)).fetchone()
        return self._msg(row) if row else None

    def insert_message(self, m: ChatMessage) -> None:
        self.conn.execute(
            "INSERT INTO chat_messages (id, room_id, author_id, body, reply_to_id, deleted, reactions, created_at) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (m.id, m.room_id, m.author_id, m.body, m.reply_to_id, int(m.deleted), _j(m.reactions), m.created_at),
        )
        self.conn.commit()

    def update_message(self, m: ChatMessage) -> None:
        self.conn.execute(
            "UPDATE chat_messages SET body=?, deleted=?, reactions=? WHERE id=?",
            (m.body, int(m.deleted), _j(m.reactions), m.id),
        )
        self.conn.commit()

    def all_room_access(self) -> list[RoomAccess]:
        return [
            RoomAccess(user_id=r["user_id"], room_id=r["room_id"], decision=r["decision"], by_id=r["by_id"], at=r["at"])
            for r in self.conn.execute("SELECT * FROM room_access")
        ]

    def set_room_access(self, ra: Optional[RoomAccess], user_id: str, room_id: str) -> None:
        self.conn.execute("DELETE FROM room_access WHERE user_id=? AND room_id=?", (user_id, room_id))
        if ra:
            self.conn.execute(
                "INSERT INTO room_access (user_id, room_id, decision, by_id, at) VALUES (?,?,?,?,?)",
                (ra.user_id, ra.room_id, ra.decision, ra.by_id, ra.at),
            )
        self.conn.commit()

    def all_visits(self) -> list[ChatVisit]:
        return [ChatVisit(user_id=r["user_id"], room_id=r["room_id"], at=r["at"]) for r in self.conn.execute("SELECT * FROM chat_visits")]

    def upsert_visit(self, user_id: str, room_id: str, at: str) -> None:
        self.conn.execute(
            "INSERT INTO chat_visits (user_id, room_id, at) VALUES (?,?,?) "
            "ON CONFLICT(user_id, room_id) DO UPDATE SET at=excluded.at",
            (user_id, room_id, at),
        )
        self.conn.commit()

    # ---------- schedule ----------
    def _slot(self, row) -> ScheduleSlot:
        raw = _loads(row["eval_links"], [])
        links = [EvalLink(group=x.get("group", ""), url=x.get("url", "")) for x in raw]
        return ScheduleSlot(
            id=row["id"], pole=row["pole"], day=row["day"], start=row["start"], end=row["end"],
            discipline=row["discipline"], teacher_name=row["teacher_name"], room=row["room"],
            visio_url=row["visio_url"], eval_url=row["eval_url"], eval_links=links,
            eval_starts_at=row["eval_starts_at"], eval_minutes=row["eval_minutes"],
            visio_open=bool(row["visio_open"]), eval_open=bool(row["eval_open"]),
            course_postponed=bool(row["course_postponed"]), eval_postponed=bool(row["eval_postponed"]),
            postponed_reason=row["postponed_reason"], note=row["note"], created_at=row["created_at"],
        )

    def all_slots(self) -> list[ScheduleSlot]:
        return [self._slot(r) for r in self.conn.execute("SELECT * FROM schedule_slots")]

    def slot(self, sid: str) -> Optional[ScheduleSlot]:
        row = self.conn.execute("SELECT * FROM schedule_slots WHERE id=?", (sid,)).fetchone()
        return self._slot(row) if row else None

    def upsert_slot(self, s: ScheduleSlot) -> None:
        links = json.dumps([{"group": l.group, "url": l.url} for l in s.eval_links]) if s.eval_links else None
        existing = self.slot(s.id)
        vals = (
            s.pole, s.day, s.start, s.end, s.discipline, s.teacher_name, s.room, s.visio_url, s.eval_url,
            links, s.eval_starts_at, s.eval_minutes, int(s.visio_open), int(s.eval_open),
            int(s.course_postponed), int(s.eval_postponed), s.postponed_reason, s.note, s.created_at, s.id,
        )
        if existing:
            self.conn.execute(
                "UPDATE schedule_slots SET pole=?, day=?, start=?, end=?, discipline=?, teacher_name=?, room=?, "
                "visio_url=?, eval_url=?, eval_links=?, eval_starts_at=?, eval_minutes=?, visio_open=?, eval_open=?, "
                "course_postponed=?, eval_postponed=?, postponed_reason=?, note=?, created_at=? WHERE id=?",
                vals,
            )
        else:
            self.conn.execute(
                "INSERT INTO schedule_slots (pole, day, start, end, discipline, teacher_name, room, visio_url, eval_url, "
                "eval_links, eval_starts_at, eval_minutes, visio_open, eval_open, course_postponed, eval_postponed, "
                "postponed_reason, note, created_at, id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                vals,
            )
        self.conn.commit()

    def delete_slot(self, sid: str) -> None:
        self.conn.execute("DELETE FROM schedule_slots WHERE id=?", (sid,))
        self.conn.commit()

    def all_subjects(self) -> list[Subject]:
        return [
            Subject(id=r["id"], pole=r["pole"], discipline=r["discipline"], teacher_name=r["teacher_name"],
                    room=r["room"], visio_url=r["visio_url"], eval_url=r["eval_url"])
            for r in self.conn.execute("SELECT * FROM subjects")
        ]

    def subject(self, sid: str) -> Optional[Subject]:
        row = self.conn.execute("SELECT * FROM subjects WHERE id=?", (sid,)).fetchone()
        if not row:
            return None
        return Subject(id=row["id"], pole=row["pole"], discipline=row["discipline"], teacher_name=row["teacher_name"],
                       room=row["room"], visio_url=row["visio_url"], eval_url=row["eval_url"])

    def upsert_subject(self, s: Subject) -> None:
        existing = self.subject(s.id)
        if existing:
            self.conn.execute(
                "UPDATE subjects SET pole=?, discipline=?, teacher_name=?, room=?, visio_url=?, eval_url=? WHERE id=?",
                (s.pole, s.discipline, s.teacher_name, s.room, s.visio_url, s.eval_url, s.id),
            )
        else:
            self.conn.execute(
                "INSERT INTO subjects (id, pole, discipline, teacher_name, room, visio_url, eval_url) VALUES (?,?,?,?,?,?,?)",
                (s.id, s.pole, s.discipline, s.teacher_name, s.room, s.visio_url, s.eval_url),
            )
        self.conn.commit()

    def update_slots_discipline(self, pole: str, old: str, subj: Subject) -> None:
        self.conn.execute(
            "UPDATE schedule_slots SET discipline=?, teacher_name=?, room=?, visio_url=?, eval_url=? "
            "WHERE pole=? AND discipline=?",
            (subj.discipline, subj.teacher_name, subj.room, subj.visio_url, subj.eval_url, pole, old),
        )
        self.conn.commit()

    # ---------- milestones / notes / syllabus / grades / submissions ----------
    def all_milestones(self) -> list[Milestone]:
        return [
            Milestone(id=r["id"], threshold=r["threshold"], title=r["title"], message=r["message"], reached_at=r["reached_at"])
            for r in self.conn.execute("SELECT * FROM milestones ORDER BY threshold")
        ]

    def upsert_milestone(self, m: Milestone) -> None:
        row = self.conn.execute("SELECT id FROM milestones WHERE id=?", (m.id,)).fetchone()
        if row:
            self.conn.execute(
                "UPDATE milestones SET threshold=?, title=?, message=?, reached_at=? WHERE id=?",
                (m.threshold, m.title, m.message, m.reached_at, m.id),
            )
        else:
            self.conn.execute(
                "INSERT INTO milestones (id, threshold, title, message, reached_at) VALUES (?,?,?,?,?)",
                (m.id, m.threshold, m.title, m.message, m.reached_at),
            )
        self.conn.commit()

    def delete_milestone(self, mid: str) -> None:
        self.conn.execute("DELETE FROM milestones WHERE id=?", (mid,))
        self.conn.commit()

    def all_notes(self) -> list[CourseNote]:
        return [
            CourseNote(id=r["id"], user_id=r["user_id"], slot_id=r["slot_id"], body=r["body"],
                       done=bool(r["done"]), due_at=r["due_at"], created_at=r["created_at"])
            for r in self.conn.execute("SELECT * FROM course_notes")
        ]

    def notes_of(self, user_id: str) -> list[CourseNote]:
        return [
            CourseNote(id=r["id"], user_id=r["user_id"], slot_id=r["slot_id"], body=r["body"],
                       done=bool(r["done"]), due_at=r["due_at"], created_at=r["created_at"])
            for r in self.conn.execute("SELECT * FROM course_notes WHERE user_id=?", (user_id,))
        ]

    def note(self, nid: str) -> Optional[CourseNote]:
        r = self.conn.execute("SELECT * FROM course_notes WHERE id=?", (nid,)).fetchone()
        if not r:
            return None
        return CourseNote(id=r["id"], user_id=r["user_id"], slot_id=r["slot_id"], body=r["body"],
                          done=bool(r["done"]), due_at=r["due_at"], created_at=r["created_at"])

    def upsert_note(self, n: CourseNote) -> None:
        existing = self.note(n.id)
        if existing:
            self.conn.execute(
                "UPDATE course_notes SET slot_id=?, body=?, done=?, due_at=? WHERE id=?",
                (n.slot_id, n.body, int(n.done), n.due_at, n.id),
            )
        else:
            self.conn.execute(
                "INSERT INTO course_notes (id, user_id, slot_id, body, done, due_at, created_at) VALUES (?,?,?,?,?,?,?)",
                (n.id, n.user_id, n.slot_id, n.body, int(n.done), n.due_at, n.created_at),
            )
        self.conn.commit()

    def delete_note(self, nid: str) -> None:
        self.conn.execute("DELETE FROM course_notes WHERE id=?", (nid,))
        self.conn.commit()

    def _doc(self, r) -> SyllabusDoc:
        return SyllabusDoc(
            id=r["id"], author_id=r["author_id"], title=r["title"], description=r["description"],
            poles=_loads(r["poles"], []), discipline=r["discipline"], file_name=r["file_name"],
            file_type=r["file_type"], file_size=r["file_size"], seed=bool(r["seed"]), created_at=r["created_at"],
        )

    def all_docs(self) -> list[SyllabusDoc]:
        return [self._doc(r) for r in self.conn.execute("SELECT * FROM syllabus_docs")]

    def doc(self, did: str) -> Optional[SyllabusDoc]:
        r = self.conn.execute("SELECT * FROM syllabus_docs WHERE id=?", (did,)).fetchone()
        return self._doc(r) if r else None

    def insert_doc(self, d: SyllabusDoc) -> None:
        self.conn.execute(
            "INSERT INTO syllabus_docs (id, author_id, title, description, poles, discipline, file_name, file_type, file_size, seed, created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (d.id, d.author_id, d.title, d.description, json.dumps(d.poles), d.discipline, d.file_name, d.file_type, d.file_size, int(d.seed), d.created_at),
        )
        self.conn.commit()

    def delete_doc(self, did: str) -> None:
        self.conn.execute("DELETE FROM syllabus_docs WHERE id=?", (did,))
        self.conn.commit()

    def all_grades(self) -> list[Grade]:
        return [
            Grade(id=r["id"], user_id=r["user_id"], discipline=r["discipline"], title=r["title"],
                  value=float(r["value"]), coef=float(r["coef"]), created_at=r["created_at"])
            for r in self.conn.execute("SELECT * FROM grades")
        ]

    def grades_of(self, user_id: str) -> list[Grade]:
        return [
            Grade(id=r["id"], user_id=r["user_id"], discipline=r["discipline"], title=r["title"],
                  value=float(r["value"]), coef=float(r["coef"]), created_at=r["created_at"])
            for r in self.conn.execute("SELECT * FROM grades WHERE user_id=?", (user_id,))
        ]

    def grade(self, gid: str) -> Optional[Grade]:
        r = self.conn.execute("SELECT * FROM grades WHERE id=?", (gid,)).fetchone()
        if not r:
            return None
        return Grade(id=r["id"], user_id=r["user_id"], discipline=r["discipline"], title=r["title"],
                     value=float(r["value"]), coef=float(r["coef"]), created_at=r["created_at"])

    def insert_grade(self, g: Grade) -> None:
        self.conn.execute(
            "INSERT INTO grades (id, user_id, discipline, title, value, coef, created_at) VALUES (?,?,?,?,?,?,?)",
            (g.id, g.user_id, g.discipline, g.title, g.value, g.coef, g.created_at),
        )
        self.conn.commit()

    def delete_grade(self, gid: str) -> None:
        self.conn.execute("DELETE FROM grades WHERE id=?", (gid,))
        self.conn.commit()

    def _sub(self, r) -> Submission:
        return Submission(
            id=r["id"], announcement_id=r["announcement_id"], user_id=r["user_id"],
            file_name=r["file_name"], file_type=r["file_type"], file_size=r["file_size"], created_at=r["created_at"],
        )

    def all_submissions(self) -> list[Submission]:
        return [self._sub(r) for r in self.conn.execute("SELECT * FROM submissions")]

    def submissions_of(self, aid: str) -> list[Submission]:
        return [self._sub(r) for r in self.conn.execute("SELECT * FROM submissions WHERE announcement_id=?", (aid,))]

    def submission(self, sid: str) -> Optional[Submission]:
        r = self.conn.execute("SELECT * FROM submissions WHERE id=?", (sid,)).fetchone()
        return self._sub(r) if r else None

    def insert_submission(self, s: Submission) -> None:
        self.conn.execute(
            "INSERT INTO submissions (id, announcement_id, user_id, file_name, file_type, file_size, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (s.id, s.announcement_id, s.user_id, s.file_name, s.file_type, s.file_size, s.created_at),
        )
        self.conn.commit()

    def delete_submission(self, sid: str) -> None:
        self.conn.execute("DELETE FROM submissions WHERE id=?", (sid,))
        self.conn.commit()
