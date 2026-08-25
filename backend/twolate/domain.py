"""Pure, time-injectable domain rules for 2late.

Every function here is side-effect free: I/O lives in the service layer.
`now_ms` is milliseconds since epoch, matching JS Date.parse / Date.now().
"""

from __future__ import annotations

import re
import time
import unicodedata
from typing import Iterable, Optional, Sequence

from .constants import (
    EMAIL_RE,
    FILE_MAX_BYTES,
    MIN_MOTIVATION,
    MIN_PASSWORD,
    MIN_WHATSAPP_DIGITS,
    RELIABLE_THRESHOLD,
    REPEAT_MS,
    ROOM_BY_ID,
    URL_RE,
)
from .models import (
    Announcement,
    ChatMessage,
    ChatVisit,
    CourseNote,
    Grade,
    ReadReceipt,
    ResetToken,
    RoomAccess,
    ScheduleSlot,
    Submission,
    SyllabusDoc,
    User,
    Vote,
)

EMAIL_RX = re.compile(EMAIL_RE)
URL_RX = re.compile(URL_RE)
TOUS_RX = re.compile(r"@tous\b", re.IGNORECASE)


def now_ms(now: Optional[float] = None) -> float:
    """Return epoch milliseconds; injectable for tests."""
    if now is not None:
        return float(now)
    return time.time() * 1000.0


def parse_iso_ms(iso: str) -> float:
    """Parse an ISO-8601 timestamp to epoch milliseconds (UTC-aware)."""
    from datetime import datetime, timezone

    text = iso.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    dt = datetime.fromisoformat(text)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp() * 1000.0


def iso_from_ms(ms: float) -> str:
    from datetime import datetime, timezone

    return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def is_valid_email(email: str) -> bool:
    return bool(EMAIL_RX.match((email or "").strip()))


def is_valid_url(url: str) -> bool:
    return bool(URL_RX.match((url or "").strip()))


def is_valid_password(password: str) -> bool:
    return isinstance(password, str) and len(password) >= MIN_PASSWORD


def whatsapp_digits(number: str) -> str:
    return re.sub(r"\D", "", number or "")


def is_valid_whatsapp(number: str) -> bool:
    return len(whatsapp_digits(number)) >= MIN_WHATSAPP_DIGITS


def is_valid_motivation(message: str) -> bool:
    return len((message or "").strip()) >= MIN_MOTIVATION


def is_expired(ann: Announcement, now: Optional[float] = None) -> bool:
    if not ann.expires_at:
        return False
    return now_ms(now) >= parse_iso_ms(ann.expires_at)


def is_published(ann: Announcement, now: Optional[float] = None) -> bool:
    if not ann.publish_at:
        return True
    return now_ms(now) >= parse_iso_ms(ann.publish_at)


def is_read_now(
    ann: Announcement,
    read_at: Optional[str],
    now: Optional[float] = None,
) -> bool:
    if not read_at:
        return False
    if not ann.repeat:
        return True
    cycle = REPEAT_MS.get(ann.repeat)
    if not cycle:
        return True
    return now_ms(now) - parse_iso_ms(read_at) < cycle


def read_at_of(reads: Sequence[ReadReceipt], announcement_id: str, user_id: str) -> Optional[str]:
    for r in reads:
        if r.announcement_id == announcement_id and r.user_id == user_id:
            return r.read_at
    return None


def visible_announcements(user: User, announcements: Sequence[Announcement]) -> list[Announcement]:
    if user.role in ("PROF", "ADMIN"):
        return list(announcements)
    if not user.pole:
        return []
    return [a for a in announcements if user.pole in a.poles]


def feeds(
    user: User,
    announcements: Sequence[Announcement],
    reads: Sequence[ReadReceipt],
    now: Optional[float] = None,
) -> dict[str, list[Announcement]]:
    vis = [
        a
        for a in visible_announcements(user, announcements)
        if not is_expired(a, now) and is_published(a, now)
    ]

    def urgent_then_date(a: Announcement, b: Announcement) -> int:
        ua = 0 if a.priority == "URGENTE" else 1
        ub = 0 if b.priority == "URGENTE" else 1
        if ua != ub:
            return ua - ub
        return int(parse_iso_ms(b.created_at) - parse_iso_ms(a.created_at))

    to_read: list[Announcement] = []
    seen: list[Announcement] = []
    for a in vis:
        if is_read_now(a, read_at_of(reads, a.id, user.id), now):
            seen.append(a)
        else:
            to_read.append(a)

    to_read.sort(key=lambda a: (0 if a.priority == "URGENTE" else 1, -parse_iso_ms(a.created_at)))
    seen.sort(
        key=lambda a: -(parse_iso_ms(read_at_of(reads, a.id, user.id) or a.created_at)),
    )
    return {"toRead": to_read, "seen": seen}


def reliability_of(votes: Sequence[Vote]) -> dict:
    up = sum(1 for v in votes if v.value == 1)
    total = len(votes)
    down = total - up
    pct = None if total == 0 else int(round((up / total) * 100))
    return {"up": up, "down": down, "total": total, "pct": pct}


def reliability_of_ann(ann: Announcement, votes: Sequence[Vote]) -> dict:
    base = reliability_of(votes)
    if ann.reliability_override is not None:
        return {**base, "pct": int(ann.reliability_override), "overridden": True}
    return {**base, "overridden": False}


def reliability_badge(pct: Optional[int], total: int) -> str:
    if pct is not None and pct >= RELIABLE_THRESHOLD:
        return "Fiable"
    if total == 0:
        return "Non notée"
    return "Contestée"


def can_vote_on(user: User, ann: Announcement, author: Optional[User]) -> bool:
    if user.role not in ("ETUDIANT", "RELAIS"):
        return False
    if ann.author_id == user.id:
        return False
    if not author or author.role != "RELAIS":
        return False
    return bool(user.pole and user.pole in ann.poles)


def can_publish(user: User) -> bool:
    return user.role in ("PROF", "RELAIS", "ADMIN")


def can_set_urgente(user: User) -> bool:
    return user.role in ("PROF", "ADMIN")


def validate_publish(
    user: User,
    title: str,
    poles: Sequence[str],
    priority: str,
    links: Sequence[dict] | None = None,
    collect_email: Optional[str] = None,
) -> Optional[str]:
    if priority == "URGENTE" and not can_set_urgente(user):
        return "Priorité urgente réservée aux professeurs et à l’administration."
    if not can_publish(user):
        return "Vous n’avez pas le droit de publier."
    if not (title or "").strip():
        return "Le titre est obligatoire."
    if not poles:
        return "Sélectionnez au moins un pôle cible."
    for link in links or []:
        url = (link.get("url") or "").strip()
        label = (link.get("label") or "").strip()
        if not label or not url:
            continue
        if not is_valid_url(url):
            return "Liens invalides : ils doivent commencer par http(s)://"
    email = (collect_email or "").strip()
    if email and not is_valid_email(email):
        return "Adresse e-mail de réception invalide."
    return None


def can_apply_relais(user: User) -> bool:
    return user.role == "ETUDIANT"


def default_room_access(user: User, room: dict) -> bool:
    if user.role == "ADMIN":
        return True
    kind = room.get("kind")
    if kind == "GENERAL":
        return user.role in ("PROF", "RELAIS")
    if kind == "STAFF":
        return False
    if kind == "POLE":
        return user.role == "PROF" or user.pole == room.get("pole")
    return False


def room_by_id(room_id: str) -> Optional[dict]:
    return ROOM_BY_ID.get(room_id)


def room_access_of(
    user: User,
    room_id: str,
    overrides: Sequence[RoomAccess],
) -> bool:
    room = room_by_id(room_id)
    if not room:
        return False
    for ov in overrides:
        if ov.user_id == user.id and ov.room_id == room_id:
            return ov.decision == "GRANTED"
    return default_room_access(user, room)


def my_rooms(user: User, overrides: Sequence[RoomAccess]) -> list[dict]:
    from .constants import CHAT_ROOMS

    return [r for r in CHAT_ROOMS if room_access_of(user, r["id"], overrides)]


def can_moderate_room(viewer: User, room: dict, target: User) -> bool:
    if viewer.id == target.id:
        return False
    if viewer.role == "ADMIN":
        return target.role != "ADMIN"
    if viewer.role == "RELAIS" and room.get("id") == "general" and target.role == "ETUDIANT":
        return target.pole == viewer.pole
    return False


def messages_of(messages: Sequence[ChatMessage], room_id: str) -> list[ChatMessage]:
    out = [m for m in messages if m.room_id == room_id]
    out.sort(key=lambda m: parse_iso_ms(m.created_at))
    return out


def unread_count(
    messages: Sequence[ChatMessage],
    visits: Sequence[ChatVisit],
    user_id: str,
    room_id: str,
) -> int:
    since = 0.0
    for v in visits:
        if v.user_id == user_id and v.room_id == room_id:
            since = parse_iso_ms(v.at)
            break
    return sum(
        1
        for m in messages
        if m.room_id == room_id
        and m.author_id != user_id
        and not m.deleted
        and parse_iso_ms(m.created_at) > since
    )


def is_mentioned(user: User, body: str) -> bool:
    if TOUS_RX.search(body or ""):
        return True
    parts = (user.name or "").strip().split()
    first = parts[0] if parts else ""
    if not first:
        return False
    pattern = re.compile(r"@" + re.escape(first) + r"\b", re.IGNORECASE)
    return bool(pattern.search(body or ""))


def mention_pending(
    user: User,
    messages: Sequence[ChatMessage],
    visits: Sequence[ChatVisit],
    overrides: Sequence[RoomAccess],
) -> bool:
    rooms = my_rooms(user, overrides)
    visit_map = {(v.user_id, v.room_id): v.at for v in visits}
    for room in rooms:
        since = 0.0
        at = visit_map.get((user.id, room["id"]))
        if at:
            since = parse_iso_ms(at)
        for m in messages:
            if (
                m.room_id == room["id"]
                and m.author_id != user.id
                and not m.deleted
                and parse_iso_ms(m.created_at) > since
                and is_mentioned(user, m.body)
            ):
                return True
    return False


def eval_links_of(slot: ScheduleSlot) -> list[dict]:
    if slot.eval_links:
        return [{"group": l.group, "url": l.url} for l in slot.eval_links]
    if slot.eval_url:
        return [{"group": "", "url": slot.eval_url}]
    return []


def eval_state_of(slot: ScheduleSlot, now: Optional[float] = None) -> str:
    """none | off | upcoming | open | ended | plain"""
    if not eval_links_of(slot):
        return "none"
    eval_open = True if slot.eval_open is None else bool(slot.eval_open)
    if slot.eval_postponed or not eval_open:
        return "off"
    if not slot.eval_starts_at or not slot.eval_minutes:
        return "plain"
    start = parse_iso_ms(slot.eval_starts_at)
    end = start + int(slot.eval_minutes) * 60_000
    current = now_ms(now)
    if current < start:
        return "upcoming"
    if current < end:
        return "open"
    return "ended"


def eval_access_allowed(slot: ScheduleSlot, now: Optional[float] = None) -> bool:
    return eval_state_of(slot, now) in ("open", "plain")


def visio_access_allowed(slot: ScheduleSlot) -> bool:
    visio_open = True if slot.visio_open is None else bool(slot.visio_open)
    return bool(slot.visio_url) and visio_open and not slot.course_postponed


def live_slot(slots: Sequence[ScheduleSlot], day: str, hhmm: str) -> Optional[ScheduleSlot]:
    for s in slots:
        if s.day == day and not s.course_postponed and s.start <= hhmm < s.end:
            return s
    return None


def weighted_average(grades: Sequence[Grade] | Sequence[dict]) -> Optional[float]:
    if not grades:
        return None
    coefs = 0.0
    total = 0.0
    for g in grades:
        if isinstance(g, dict):
            value, coef = float(g["value"]), float(g["coef"])
        else:
            value, coef = float(g.value), float(g.coef)
        coefs += coef
        total += value * coef
    if coefs <= 0:
        return None
    return total / coefs


def validate_grade(value: float, coef: float, discipline: str, title: str) -> Optional[str]:
    if not (discipline or "").strip():
        return "Indiquez la matière."
    if not (title or "").strip():
        return "Indiquez l’intitulé du devoir."
    if value != value or value < 0 or value > 20:  # NaN check
        return "Note invalide : entre 0 et 20."
    if coef != coef or coef <= 0 or coef > 10:
        return "Coefficient invalide : entre 0,5 et 10."
    return None


def can_add_syllabus(user: User) -> bool:
    return user.role in ("PROF", "RELAIS", "ADMIN")


def visible_syllabus(user: User, docs: Sequence[SyllabusDoc]) -> list[SyllabusDoc]:
    if user.role in ("PROF", "ADMIN"):
        return list(docs)
    if not user.pole:
        return []
    return [d for d in docs if user.pole in d.poles]


def fold_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", (text or "").lower())
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def syllabus_matches(doc: SyllabusDoc, query: str, author_name: str = "") -> bool:
    q = fold_accents(query.strip())
    if not q:
        return True
    fields = [doc.title, doc.description or "", doc.discipline or "", doc.file_name, author_name]
    return any(q in fold_accents(f) for f in fields)


def sort_syllabus(docs: list[SyllabusDoc], sort: str) -> list[SyllabusDoc]:
    out = list(docs)
    if sort == "old":
        out.sort(key=lambda d: parse_iso_ms(d.created_at))
    elif sort == "title":
        out.sort(key=lambda d: fold_accents(d.title))
    elif sort == "discipline":
        out.sort(key=lambda d: (fold_accents(d.discipline or "zz"), -parse_iso_ms(d.created_at)))
    else:
        out.sort(key=lambda d: -parse_iso_ms(d.created_at))
    return out


def can_submit_to(user: User, ann: Announcement, now: Optional[float] = None) -> tuple[bool, Optional[str]]:
    if ann.type != "PARTICIPATIVE":
        return False, "Cette annonce n’accepte pas de dépôt."
    if is_expired(ann, now):
        return False, "Cette collecte est expirée."
    if user.role not in ("ETUDIANT", "RELAIS"):
        return False, "Seuls les étudiants et relais peuvent déposer."
    if not user.pole or user.pole not in ann.poles:
        return False, "Votre pôle n’est pas concerné par cette collecte."
    return True, None


def can_collect(user: User, ann: Announcement) -> bool:
    return user.role in ("PROF", "ADMIN", "RELAIS") or user.id == ann.author_id


def can_download_submission(user: User, ann: Announcement) -> bool:
    access = ann.collect_access or "PROF"
    if user.role == "ADMIN":
        return True
    if user.id == ann.author_id:
        return True
    if access == "PROF" and user.role == "PROF":
        return True
    if access == "RELAIS" and user.role in ("PROF", "RELAIS"):
        return True
    return False


def can_manage_collect(user: User, ann: Announcement) -> bool:
    return user.id == ann.author_id or user.role == "ADMIN"


def file_too_large(size: int) -> bool:
    return size > FILE_MAX_BYTES


def reset_token_error(rec: Optional[ResetToken], user_exists: bool, now: Optional[float] = None) -> Optional[str]:
    if rec is None or not user_exists:
        return "Lien invalide ou compte supprimé."
    if rec.used_at:
        return "Ce lien a déjà été utilisé. Demandez-en un nouveau."
    if now_ms(now) >= parse_iso_ms(rec.expires_at):
        return "Ce lien a expiré. Demandez-en un nouveau."
    return None


def notes_due_within_48h(notes: Sequence[CourseNote], now: Optional[float] = None) -> list[CourseNote]:
    current = now_ms(now)
    out: list[CourseNote] = []
    for n in notes:
        if n.done or not n.due_at:
            continue
        left = parse_iso_ms(n.due_at) - current
        if -3600_000 <= left <= 48 * 3600_000:
            out.append(n)
    out.sort(key=lambda n: parse_iso_ms(n.due_at or n.created_at))
    return out


def read_rate(ann: Announcement, users: Sequence[User], reads: Sequence[ReadReceipt]) -> Optional[int]:
    audience = [
        u
        for u in users
        if u.role in ("ETUDIANT", "RELAIS") and u.pole and u.pole in ann.poles
    ]
    if not audience:
        return None
    ids = {u.id for u in audience}
    readers = sum(1 for r in reads if r.announcement_id == ann.id and r.user_id in ids)
    return int(round((readers / len(audience)) * 100))


def public_user(user: User) -> dict:
    """Serialize a user without password material."""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "pole": user.pole,
        "whatsapp": user.whatsapp,
        "disabled": bool(user.disabled),
        "createdAt": user.created_at,
    }


def assert_no_secret(payload: object) -> None:
    """Walk a JSON-like payload and raise if a password field leaks."""
    if isinstance(payload, dict):
        for key, value in payload.items():
            low = str(key).lower()
            if low in ("password", "password_hash", "passwordhash") and value:
                raise AssertionError(f"password material leaked via key {key}")
            assert_no_secret(value)
    elif isinstance(payload, (list, tuple)):
        for item in payload:
            assert_no_secret(item)
