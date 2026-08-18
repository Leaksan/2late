"""SQLite schema and connection helpers."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional

SCHEMA = """
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  pole TEXT,
  whatsapp TEXT,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  poles TEXT NOT NULL,
  priority TEXT NOT NULL,
  reliability_override INTEGER,
  links TEXT,
  expires_at TEXT,
  collect_access TEXT,
  collect_email TEXT,
  publish_at TEXT,
  repeat TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  value INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS reads (
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TEXT NOT NULL,
  PRIMARY KEY (announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  whatsapp TEXT,
  created_at TEXT NOT NULL,
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  reply_to_id TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  reactions TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_access (
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  by_id TEXT NOT NULL,
  at TEXT NOT NULL,
  PRIMARY KEY (user_id, room_id)
);

CREATE TABLE IF NOT EXISTS chat_visits (
  user_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  at TEXT NOT NULL,
  PRIMARY KEY (user_id, room_id)
);

CREATE TABLE IF NOT EXISTS schedule_slots (
  id TEXT PRIMARY KEY,
  pole TEXT NOT NULL,
  day TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  discipline TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  room TEXT,
  visio_url TEXT,
  eval_url TEXT,
  eval_links TEXT,
  eval_starts_at TEXT,
  eval_minutes INTEGER,
  visio_open INTEGER NOT NULL DEFAULT 1,
  eval_open INTEGER NOT NULL DEFAULT 1,
  course_postponed INTEGER NOT NULL DEFAULT 0,
  eval_postponed INTEGER NOT NULL DEFAULT 0,
  postponed_reason TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  pole TEXT NOT NULL,
  discipline TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  room TEXT,
  visio_url TEXT,
  eval_url TEXT
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  threshold INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reached_at TEXT
);

CREATE TABLE IF NOT EXISTS course_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  body TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  due_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS syllabus_docs (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  poles TEXT NOT NULL,
  discipline TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  seed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  discipline TEXT NOT NULL,
  title TEXT NOT NULL,
  value REAL NOT NULL,
  coef REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_ann_author ON announcements(author_id);
CREATE INDEX IF NOT EXISTS idx_votes_ann ON votes(announcement_id);
CREATE INDEX IF NOT EXISTS idx_comments_ann ON comments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_slots_pole ON schedule_slots(pole);
CREATE INDEX IF NOT EXISTS idx_grades_user ON grades(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_ann ON submissions(announcement_id);
"""


def connect(path: str | Path) -> sqlite3.Connection:
    uri = str(path)
    if uri == ":memory:":
        conn = sqlite3.connect(uri, check_same_thread=False)
    else:
        Path(uri).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(uri, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def is_empty(conn: sqlite3.Connection) -> bool:
    row = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()
    return int(row["n"]) == 0
