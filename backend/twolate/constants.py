"""Shared domain constants for 2late."""

from __future__ import annotations

ROLES = ("ETUDIANT", "RELAIS", "PROF", "ADMIN")
POLES = ("STI", "SEDG", "MPI", "SVT", "SHS")
ANNOUNCEMENT_TYPES = (
    "EVALUATION",
    "DEVOIR",
    "VISIO",
    "GENERALE",
    "EMPLOI_DU_TEMPS",
    "PARTICIPATIVE",
)
PRIORITIES = ("NORMALE", "URGENTE")
COLLECT_ACCESSES = ("AUTHOR", "PROF", "RELAIS")
REPEAT_KINDS = ("DAILY", "WEEKLY", "MONTHLY")
APPLICATION_STATUSES = ("PENDING", "APPROVED", "REFUSED")
ROOM_KINDS = ("GENERAL", "POLE", "STAFF")
ACCESS_DECISIONS = ("GRANTED", "REVOKED")
WEEK_DAYS = ("LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE")

REPEAT_MS = {
    "DAILY": 24 * 3600_000,
    "WEEKLY": 7 * 24 * 3600_000,
    "MONTHLY": 30 * 24 * 3600_000,
}

REPEAT_LABELS = {
    "DAILY": "Chaque jour",
    "WEEKLY": "Chaque semaine",
    "MONTHLY": "Chaque mois",
}

COLLECT_ACCESS_LABELS = {
    "AUTHOR": "Uniquement l’auteur de la collecte",
    "PROF": "Enseignants & administration",
    "RELAIS": "Enseignants, admin & relais",
}

POLE_LABELS = {
    "STI": "Sciences et Technologies de l’Ingénieur",
    "SEDG": "Sciences Économiques et de Gestion",
    "MPI": "Mathématiques, Physique, Informatique",
    "SVT": "Sciences de la Vie et de la Terre",
    "SHS": "Sciences Humaines et Sociales",
}

TYPE_INFO = {
    "EVALUATION": {"label": "Évaluation"},
    "DEVOIR": {"label": "Devoir à rendre"},
    "VISIO": {"label": "Session visio"},
    "GENERALE": {"label": "Annonce générale"},
    "EMPLOI_DU_TEMPS": {"label": "Changement d’emploi du temps"},
    "PARTICIPATIVE": {"label": "Collecte participative"},
}

ROLE_LABELS = {
    "ETUDIANT": "Étudiant",
    "RELAIS": "Relais",
    "PROF": "Prof / Informaticien",
    "ADMIN": "Administrateur",
}

EMAIL_RE = r"^\S+@\S+\.\S+$"
URL_RE = r"^https?://.+\..+"
FILE_MAX_BYTES = 20 * 1024 * 1024
RESET_TTL_MS = 24 * 3600_000
MIN_PASSWORD = 4
MIN_MOTIVATION = 10
MIN_WHATSAPP_DIGITS = 8
RELIABLE_THRESHOLD = 70

CHAT_ROOMS = (
    {
        "id": "general",
        "kind": "GENERAL",
        "pole": None,
        "name": "Général",
        "description": "Toute la communauté de l’université",
    },
    *[
        {
            "id": f"pole-{p}",
            "kind": "POLE",
            "pole": p,
            "name": f"Pôle {p}",
            "description": f"Étudiants et enseignants du pôle {p}",
        }
        for p in POLES
    ],
    {
        "id": "staff",
        "kind": "STAFF",
        "pole": None,
        "name": "Administration",
        "description": "Équipe administrative de l’école",
    },
)

ROOM_BY_ID = {r["id"]: r for r in CHAT_ROOMS}

ALLOWED_UPLOAD_EXT = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
}
