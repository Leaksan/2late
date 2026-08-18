"""Dataclasses for the 2late domain."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class User:
    id: str
    name: str
    email: str
    password_hash: str
    role: str
    created_at: str
    pole: Optional[str] = None
    whatsapp: Optional[str] = None
    disabled: bool = False


@dataclass
class AnnLink:
    id: str
    label: str
    url: str


@dataclass
class Announcement:
    id: str
    author_id: str
    title: str
    type: str
    poles: list[str]
    priority: str
    created_at: str
    description: Optional[str] = None
    reliability_override: Optional[int] = None
    links: list[AnnLink] = field(default_factory=list)
    expires_at: Optional[str] = None
    collect_access: Optional[str] = None
    collect_email: Optional[str] = None
    publish_at: Optional[str] = None
    repeat: Optional[str] = None


@dataclass
class Vote:
    id: str
    announcement_id: str
    user_id: str
    value: int
    created_at: str


@dataclass
class ReadReceipt:
    announcement_id: str
    user_id: str
    read_at: str


@dataclass
class Comment:
    id: str
    announcement_id: str
    author_id: str
    body: str
    created_at: str


@dataclass
class RelaisApplication:
    id: str
    user_id: str
    status: str
    created_at: str
    message: Optional[str] = None
    whatsapp: Optional[str] = None
    decided_at: Optional[str] = None


@dataclass
class ResetToken:
    token: str
    user_id: str
    created_at: str
    expires_at: str
    used_at: Optional[str] = None


@dataclass
class ChatMessage:
    id: str
    room_id: str
    author_id: str
    body: str
    created_at: str
    reply_to_id: Optional[str] = None
    deleted: bool = False
    reactions: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class RoomAccess:
    user_id: str
    room_id: str
    decision: str
    by_id: str
    at: str


@dataclass
class ChatVisit:
    user_id: str
    room_id: str
    at: str


@dataclass
class EvalLink:
    group: str
    url: str


@dataclass
class ScheduleSlot:
    id: str
    pole: str
    day: str
    start: str
    end: str
    discipline: str
    teacher_name: str
    created_at: str
    room: Optional[str] = None
    visio_url: Optional[str] = None
    eval_url: Optional[str] = None
    eval_links: list[EvalLink] = field(default_factory=list)
    eval_starts_at: Optional[str] = None
    eval_minutes: Optional[int] = None
    visio_open: bool = True
    eval_open: bool = True
    course_postponed: bool = False
    eval_postponed: bool = False
    postponed_reason: Optional[str] = None
    note: Optional[str] = None


@dataclass
class Subject:
    id: str
    pole: str
    discipline: str
    teacher_name: str
    room: Optional[str] = None
    visio_url: Optional[str] = None
    eval_url: Optional[str] = None


@dataclass
class Milestone:
    id: str
    threshold: int
    title: str
    message: str
    reached_at: Optional[str] = None


@dataclass
class CourseNote:
    id: str
    user_id: str
    slot_id: str
    body: str
    created_at: str
    done: bool = False
    due_at: Optional[str] = None


@dataclass
class SyllabusDoc:
    id: str
    author_id: str
    title: str
    poles: list[str]
    file_name: str
    file_type: str
    file_size: int
    created_at: str
    description: Optional[str] = None
    discipline: Optional[str] = None
    seed: bool = False


@dataclass
class Grade:
    id: str
    user_id: str
    discipline: str
    title: str
    value: float
    coef: float
    created_at: str


@dataclass
class Submission:
    id: str
    announcement_id: str
    user_id: str
    file_name: str
    file_type: str
    file_size: int
    created_at: str
