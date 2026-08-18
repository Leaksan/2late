"""Deterministic demo seed matching the original 2late accounts and fixtures."""

from __future__ import annotations

import json
from typing import Optional

from werkzeug.security import generate_password_hash

from .constants import POLES
from .db import init_db
from .domain import iso_from_ms, now_ms
from .pdf import demo_pdf

# Cache demo hashes so each test DB seed does not re-run KDF.
_PASSWORD_HASHES: dict[str, str] = {}
_HASH_METHOD = "pbkdf2:sha256:260000"


def _hours_ago(now: float, hours: float) -> str:
    return iso_from_ms(now - hours * 3600_000)


def seed_conn(conn, now: Optional[float] = None, uploads_dir=None) -> None:
    """Populate an empty database with the official demo dataset."""
    init_db(conn)
    t = now_ms(now)
    h = lambda hours: _hours_ago(t, hours)

    def ph(password: str) -> str:
        cached = _PASSWORD_HASHES.get(password)
        if cached:
            return cached
        hashed = generate_password_hash(password, method=_HASH_METHOD)
        _PASSWORD_HASHES[password] = hashed
        return hashed

    users = [
        ("u-admin", "Administration 2late", "admin@2late.com", ph("admin"), "ADMIN", None, None, 0, h(24 * 30)),
        ("u-prof", "Pr. Pierre Kadet", "prof@2late.com", ph("prof"), "PROF", None, "+241 06 10 20 30", 0, h(24 * 21)),
        ("u-marc", "Marc Obame", "marc@2late.com", ph("marc"), "RELAIS", "STI", "+241 06 77 88 99", 0, h(24 * 18)),
        ("u-nadia", "Nadia Nzigou", "nadia@2late.com", ph("nadia"), "ETUDIANT", "SEDG", "+241 06 55 12 87", 0, h(24 * 15)),
        ("u-jean", "Jean Moulougui", "jean@2late.com", ph("jean"), "ETUDIANT", "MPI", "+241 06 22 33 44", 0, h(24 * 12)),
        ("u-sophie", "Sophie Bouanga", "sophie@2late.com", ph("sophie"), "ETUDIANT", "SVT", None, 0, h(24 * 10)),
        ("u-etu", "Compte Étudiant Démo", "etu@2late.com", ph("etu"), "ETUDIANT", "STI", "+241 06 11 22 33", 0, h(24 * 9)),
        ("u-arnaud", "Arnaud Bilie", "arnaud@2late.com", ph("arnaud"), "ETUDIANT", "STI", "+241 06 44 55 66", 0, h(24 * 8)),
        ("u-paul", "Paul Nguema", "paul@2late.com", ph("paul"), "ETUDIANT", "MPI", None, 0, h(24 * 7)),
        ("u-lea", "Léa Mengue", "lea@2late.com", ph("lea"), "ETUDIANT", "SHS", "+241 06 66 77 55", 0, h(24 * 6)),
        ("u-chris", "Chris Ibinga", "chris@2late.com", ph("chris"), "ETUDIANT", "SEDG", None, 0, h(24 * 5)),
    ]
    conn.executemany(
        "INSERT INTO users (id, name, email, password_hash, role, pole, whatsapp, disabled, created_at) "
        "VALUES (?,?,?,?,?,?,?,?,?)",
        users,
    )

    all_poles = json.dumps(list(POLES))
    announcements = [
        ("a1", "u-prof", "Examen final d’Algorithmique — STI", "EVALUATION",
         "L’examen final se déroulera en salle B12 le vendredi 22, de 09h à 12h. Programme : chapitres 1 à 8. Aucun document autorisé, calculatrice autorisée.",
         json.dumps(["STI"]), "URGENTE", None, None, None, None, None, None, None, h(2)),
        ("a2", "u-prof", "Devoir à rendre — Statistiques (MPI)", "DEVOIR",
         "À déposer sur Moodle avant dimanche 23h59. Format PDF, exercices 1 à 5 du TD 4.",
         json.dumps(["MPI"]), "NORMALE", None, None, None, None, None, None, None, h(26)),
        ("a3", "u-marc", "Report de la visio de Mathématiques", "VISIO",
         "La visio de ce soir serait reportée à demain 10h, selon un message du professeur relayé sur un groupe WhatsApp. Vérification en cours.",
         json.dumps(["STI", "MPI"]), "NORMALE", None, None, None, None, None, None, None, h(5)),
        ("a4", "u-marc", "Changement de salle d’Algorithmique ?", "EMPLOI_DU_TEMPS",
         "Rumeur : la salle B12 serait remplacée par l’amphi 3 dès lundi. Information non confirmée, en attente d’un message officiel.",
         json.dumps(["STI"]), "NORMALE", None, None, None, None, None, None, None, h(3)),
        ("a5", "u-admin", "Maintenance de Moodle ce samedi", "GENERALE",
         "La plateforme sera indisponible de 6h à 12h. Pensez à télécharger vos supports de cours avant la maintenance.",
         all_poles, "NORMALE", None, None, None, None, None, None, None, h(28)),
        ("a6", "u-prof", "Visio questions/réponses — Méthodologie", "VISIO",
         "Session de questions/réponses avant les partiels pour les pôles SHS et SEDG. Le lien Zoom sera publié sur Moodle une heure avant.",
         json.dumps(["SHS", "SEDG"]), "NORMALE", None, None, None, None, None, None, None, h(8)),
        ("a7", "u-marc", "Collecte de notes de cours — SVT", "GENERALE",
         "Une étudiante compile les notes du semestre pour un guide de révision commun. Vous pouvez lui transmettre vos cours à la BU.",
         json.dumps(["SVT"]), "NORMALE", None, None, None, None, None, None, None, h(0.7)),
        ("a8", "u-prof", "Déposez vos exercices du TD 4 (visio d’aujourd’hui)", "PARTICIPATIVE",
         "Pour éviter les fichiers perdus entre WhatsApp et ma boîte mail : déposez vos exercices directement ici avant ce soir 23 h. Chaque dépôt arrive classé à votre nom, avec son heure d’envoi.",
         json.dumps(["STI"]), "NORMALE", None, None, None, "PROF", "prof@2late.com", None, None, h(4)),
        ("a9", "u-admin", "Rappel hebdo — point annonces & fiabilité", "GENERALE",
         "Chaque semaine, les relais passent en revue les annonces de leur pôle : fiabilité, contestations, informations manquantes. Ce rappel revient automatiquement dans « À lire ».",
         all_poles, "NORMALE", None, None, None, None, None, None, "WEEKLY", h(30)),
        ("a10", "u-prof", "Ouverture des inscriptions au tutorat", "GENERALE",
         "Annonce programmée : les inscriptions ouvriront automatiquement à la date prévue. Testez la publication différée !",
         json.dumps(["STI"]), "NORMALE", None, None, None, None, None, iso_from_ms(t + 2 * 3600_000), None, h(1)),
    ]
    conn.executemany(
        "INSERT INTO announcements (id, author_id, title, type, description, poles, priority, "
        "reliability_override, links, expires_at, collect_access, collect_email, publish_at, repeat, created_at) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        announcements,
    )

    votes = [
        ("v1", "a3", "u-jean", 1, h(4)),
        ("v2", "a3", "u-sophie", 1, h(4)),
        ("v3", "a3", "u-nadia", 1, h(3)),
        ("v4", "a3", "u-etu", 1, h(3)),
        ("v5", "a3", "u-arnaud", 1, h(2)),
        ("v6", "a3", "u-paul", 1, h(2)),
        ("v7", "a3", "u-lea", 1, h(1)),
        ("v8", "a3", "u-chris", -1, h(1)),
        ("v9", "a4", "u-arnaud", 1, h(2)),
        ("v10", "a4", "u-paul", 1, h(2)),
        ("v11", "a4", "u-jean", -1, h(2)),
        ("v12", "a4", "u-sophie", -1, h(1)),
        ("v13", "a4", "u-nadia", -1, h(1)),
        ("v14", "a4", "u-etu", -1, h(1)),
        ("v15", "a4", "u-chris", -1, h(0.5)),
        ("v16", "a4", "u-lea", -1, h(0.5)),
    ]
    conn.executemany(
        "INSERT INTO votes (id, announcement_id, user_id, value, created_at) VALUES (?,?,?,?,?)",
        votes,
    )

    conn.executemany(
        "INSERT INTO reads (announcement_id, user_id, read_at) VALUES (?,?,?)",
        [
            ("a5", "u-etu", h(22)),
            ("a5", "u-marc", h(24)),
            ("a6", "u-nadia", h(6)),
        ],
    )

    conn.executemany(
        "INSERT INTO comments (id, announcement_id, author_id, body, created_at) VALUES (?,?,?,?,?)",
        [
            ("c1", "a1", "u-marc", "Pour confirmation : l’examen couvre bien les chapitres 1 à 8 ?", h(1.4)),
            ("c2", "a1", "u-prof", "Oui, chapitres 1 à 8 inclus. Bonne révision à tous.", h(1.1)),
            ("c3", "a3", "u-jean", "Reçu aussi sur le groupe WhatsApp, ça semble confirmé.", h(4)),
            ("c4", "a4", "u-marc", "Info venue d’un tutorat, à prendre avec prudence en attendant un message officiel.", h(2)),
            ("c5", "a7", "u-sophie", "Je participe, j’ai les TP complets.", h(0.4)),
        ],
    )

    conn.execute(
        "INSERT INTO applications (id, user_id, status, message, whatsapp, created_at) VALUES (?,?,?,?,?,?)",
        (
            "app1",
            "u-nadia",
            "PENDING",
            "Bonjour, je suis très active sur les groupes de promo et je relaye déjà beaucoup d’infos entre Moodle et WhatsApp. Je souhaite devenir Relais pour fiabiliser les annonces du pôle SEDG.",
            "+241 06 55 12 87",
            h(48),
        ),
    )

    conn.executemany(
        "INSERT INTO chat_messages (id, room_id, author_id, body, reply_to_id, deleted, reactions, created_at) "
        "VALUES (?,?,?,?,?,?,?,?)",
        [
            ("m1", "pole-STI", "u-marc", "Quelqu’un a commencé les révisions pour l’examen final d’algorithmique ? 📚", None, 0, None, h(6)),
            ("m2", "pole-STI", "u-arnaud", "Oui, je fais les annales de l’an dernier, elles couvrent presque tout le programme.", None, 0, None, h(5.5)),
            ("m3", "pole-STI", "u-etu", "@Arnaud on peut organiser une session à la BU demain ?", None, 0, None, h(4.5)),
            ("m4", "pole-STI", "u-arnaud", "Bonne idée ! 14h, salle 3 ?", None, 0, None, h(4.2)),
            ("m5", "pole-STI", "u-marc", "Je serai là aussi, je ramène mes notes de TD.", None, 0, None, h(0.4)),
            ("m6", "general", "u-admin", "Bienvenue dans le salon général 🌍 Rappel : les annonces officielles passent par 2late, le salon sert aux échanges.", None, 0, None, h(20)),
            ("m7", "general", "u-prof", "Pensez à consulter l’annonce sur la visio questions/réponses de demain.", None, 0, None, h(3)),
            ("m8", "general", "u-marc", "Bien noté professeur 👍", None, 0, json.dumps([{"emoji": "👍", "userIds": ["u-prof", "u-nadia"]}]), h(2.6)),
            ("m9", "staff", "u-admin", "Rappel : une candidature Relais est en attente de validation.", None, 0, None, h(9)),
        ],
    )

    conn.execute(
        "INSERT INTO room_access (user_id, room_id, decision, by_id, at) VALUES (?,?,?,?,?)",
        ("u-nadia", "general", "GRANTED", "u-admin", h(30)),
    )

    conn.executemany(
        "INSERT INTO chat_visits (user_id, room_id, at) VALUES (?,?,?)",
        [
            ("u-etu", "pole-STI", h(5)),
            ("u-marc", "pole-STI", h(1)),
            ("u-marc", "general", h(2.5)),
            ("u-admin", "staff", h(8)),
            ("u-nadia", "general", h(2.8)),
        ],
    )

    sti_teachers = ["Pr. Pierre Kadet", "Pr. Anne Mba", "Pr. Paul Nzue", "Pr. Grace Ondo", "Pr. Aïcha Bongo"]
    sti_disciplines = [
        "Algorithmique avancée", "Bases de données", "Réseaux et protocoles",
        "Mathématiques pour l’ingénieur", "TP Électronique", "Programmation Python",
        "Systèmes embarqués", "Thermodynamique", "Mécanique des matériaux",
        "Génie logiciel", "Traitement du signal", "Automatique",
        "Sécurité informatique", "Architecture des ordinateurs", "TP Mécanique",
        "Probabilités et statistiques", "Développement web", "Anglais technique",
        "Gestion de projet", "Intelligence artificielle", "Robotique",
    ]
    sti_rooms = ["B12", "B14", "Lab 1", "Lab 2", "Lab 3", "Amphi 3"]
    sti_times = [("08:00", "11:00"), ("12:00", "15:00"), ("16:00", "19:00")]
    days = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"]

    n = 0
    for day in days:
        for start, end in sti_times:
            n += 1
            eval_links = None
            eval_starts = None
            eval_minutes = None
            if n == 1:
                eval_links = json.dumps([
                    {"group": "Groupe 1", "url": "https://example.com/eval/sti-1/groupe-1"},
                    {"group": "Groupe 2", "url": "https://example.com/eval/sti-1/groupe-2"},
                ])
                eval_starts = iso_from_ms(t - 25 * 60_000)
                eval_minutes = 120
            conn.execute(
                "INSERT INTO schedule_slots (id, pole, day, start, end, discipline, teacher_name, room, "
                "visio_url, eval_url, eval_links, eval_starts_at, eval_minutes, visio_open, eval_open, "
                "course_postponed, eval_postponed, postponed_reason, note, created_at) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    f"sti-{n}", "STI", day, start, end,
                    sti_disciplines[(n - 1) % len(sti_disciplines)].strip(),
                    sti_teachers[(n - 1) % len(sti_teachers)],
                    sti_rooms[(n - 1) % len(sti_rooms)],
                    f"https://meet.google.com/sti-{n}",
                    f"https://moodle.univ.ga/mod/quiz/view.php?id=sti-{n}",
                    eval_links, eval_starts, eval_minutes,
                    0 if n % 4 == 0 else 1,
                    0 if n % 5 == 0 else 1,
                    0, 0, None, None, h(24 * 14),
                ),
            )

    other = [
        ("s6", "SEDG", "LUNDI", "10:00", "12:00", "Microéconomie", "Pr. Sylvain Assoumou", "A3",
         "https://meet.google.com/sedg-micro", "https://moodle.univ.ga/mod/quiz/view.php?id=sedg-micro", 1, 0),
        ("s7", "SEDG", "MARDI", "08:00", "10:00", "Comptabilité générale", "Pr. Léa Mengue", "A1",
         "https://meet.google.com/sedg-cpt", "https://moodle.univ.ga/mod/quiz/view.php?id=cpt-cc1", 0, 1),
        ("s8", "SEDG", "JEUDI", "14:00", "16:00", "Statistiques appliquées", "Pr. Sylvain Assoumou", None,
         "https://meet.google.com/sedg-stat", "https://moodle.univ.ga/mod/quiz/view.php?id=sedg-stat", 1, 1),
        ("s9", "MPI", "LUNDI", "14:00", "16:00", "Algèbre linéaire", "Pr. Jean Moulounga", "C2",
         "https://meet.google.com/mpi-alg", "https://moodle.univ.ga/mod/quiz/view.php?id=mpi-alg", 1, 1),
        ("s10", "MPI", "MERCREDI", "08:00", "10:00", "Physique ondulatoire", "Pr. Jean Moulounga", None,
         "https://zoom.us/j/112233445", "https://moodle.univ.ga/mod/quiz/view.php?id=mpi-phy", 1, 0),
        ("s11", "MPI", "VENDREDI", "10:00", "12:00", "Programmation Python", "Pr. Aïcha Bongo", "Lab 3",
         "https://meet.google.com/mpi-py", "https://moodle.univ.ga/mod/quiz/view.php?id=py-tp2", 0, 1),
        ("s12", "SVT", "MARDI", "14:00", "17:00", "TP Biologie cellulaire", "Pr. Sophie Bouanga", "Lab Bio",
         "https://meet.google.com/svt-bio", "https://moodle.univ.ga/mod/assign/view.php?id=bio-tp", 1, 1),
        ("s13", "SVT", "VENDREDI", "08:00", "10:00", "Géologie structurale", "Pr. Ismaël Obame", "D1",
         "https://meet.google.com/svt-geo", "https://moodle.univ.ga/mod/quiz/view.php?id=svt-geo", 1, 1),
        ("s14", "SHS", "MERCREDI", "10:00", "12:00", "Sociologie du développement", "Pr. Chantal Nziengui", "E2",
         "https://meet.google.com/shs-socio", "https://moodle.univ.ga/mod/quiz/view.php?id=shs-socio", 1, 0),
        ("s15", "SHS", "JEUDI", "10:00", "12:00", "Histoire des idées politiques", "Pr. Chantal Nziengui", None,
         "https://meet.google.com/shs-histoire", "https://moodle.univ.ga/mod/quiz/view.php?id=shs-hist", 1, 1),
    ]
    for row in other:
        sid, pole, day, start, end, disc, teacher, room, visio, ev, vo, eo = row
        note = "TP noté — compte-rendu à déposer la semaine suivante." if sid == "s12" else None
        conn.execute(
            "INSERT INTO schedule_slots (id, pole, day, start, end, discipline, teacher_name, room, "
            "visio_url, eval_url, eval_links, eval_starts_at, eval_minutes, visio_open, eval_open, "
            "course_postponed, eval_postponed, postponed_reason, note, created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (sid, pole, day, start, end, disc, teacher, room, visio, ev, None, None, None, vo, eo, 0, 0, None, note, h(24 * 14)),
        )

    seen = set()
    for row in conn.execute("SELECT * FROM schedule_slots"):
        key = (row["pole"], row["discipline"])
        if key in seen:
            continue
        seen.add(key)
        conn.execute(
            "INSERT INTO subjects (id, pole, discipline, teacher_name, room, visio_url, eval_url) VALUES (?,?,?,?,?,?,?)",
            (f"sub-{row['id']}", row["pole"], row["discipline"], row["teacher_name"], row["room"], row["visio_url"], row["eval_url"]),
        )

    msg = (
        "Merci à vous ! La communauté 2late vient d’atteindre {n} membres. "
        "Chaque inscription rend l’information plus fiable et plus rapide pour tout le campus. "
        "Merci de votre confiance — ensemble, rien n’arrive trop tard."
    )
    conn.executemany(
        "INSERT INTO milestones (id, threshold, title, message) VALUES (?,?,?,?)",
        [
            ("ms-10", 10, "{n} membres !", msg),
            ("ms-50", 50, "{n} membres !", msg),
            ("ms-100", 100, "{n} membres !",
             "Merci à vous ! 2late dépasse les {n} membres. Ce qui a commencé par des annonces perdues dans les groupes WhatsApp est devenu une vraie communauté. Merci de votre confiance — ensemble, rien n’arrive trop tard."),
        ],
    )

    docs = [
        ("doc-1", "u-prof", "Programme et plan du cours — Algorithmique avancée",
         "Plan détaillé des 12 séances, bibliographie et barème de l’évaluation continue.",
         json.dumps(["STI"]), "Algorithmique avancée", "programme-algo.pdf", "application/pdf", h(24 * 9)),
        ("doc-2", "u-prof", "Fiche de TP n°3 — Programmation Python",
         "Énoncé du TP à lire avant la séance. Dépôt du compte-rendu sur Moodle.",
         json.dumps(["MPI"]), "Programmation Python", "tp3-python.pdf", "application/pdf", h(24 * 6)),
        ("doc-3", "u-admin", "Guide de rédaction des comptes-rendus",
         "Consignes officielles de présentation des comptes-rendus, valables pour tous les pôles.",
         all_poles, None, "guide-comptes-rendus.pdf", "application/pdf", h(24 * 12)),
    ]
    for doc in docs:
        did, author, title, desc, poles, disc, fname, ftype, created = doc
        blob = demo_pdf([
            title,
            "Publié sur 2late — Administration" if author == "u-admin" else "Publié sur 2late — Pr. Pierre Kadet",
            "",
            "Ce document de démonstration est généré par l’application 2late.",
            "Les documents réels déposés par les enseignants et les relais",
            "apparaîtront dans cet espace syllabus.",
            "",
            f"Pôles concernés : {', '.join(json.loads(poles))}",
            f"Discipline : {disc}" if disc else "",
        ])
        conn.execute(
            "INSERT INTO syllabus_docs (id, author_id, title, description, poles, discipline, file_name, file_type, file_size, seed, created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (did, author, title, desc, poles, disc, fname, ftype, len(blob), 1, created),
        )
        if uploads_dir is not None:
            path = uploads_dir / did
            path.write_bytes(blob)

    conn.executemany(
        "INSERT INTO grades (id, user_id, discipline, title, value, coef, created_at) VALUES (?,?,?,?,?,?,?)",
        [
            ("g1", "u-etu", "Algorithmique avancée", "CC1 — partiel", 14, 2, h(24 * 20)),
            ("g2", "u-etu", "Algorithmique avancée", "TP noté n°3", 16, 1, h(24 * 10)),
            ("g3", "u-etu", "Bases de données", "Interrogation n°1", 11.5, 1, h(24 * 15)),
            ("g4", "u-etu", "Réseaux et protocoles", "Contrôle chapitres 1-3", 12.5, 1, h(24 * 7)),
            ("g5", "u-etu", "Anglais technique", "Oral de présentation", 13, 1, h(24 * 8)),
        ],
    )

    subs = [
        ("sub-1", "a8", "u-etu", "exos-td4-compte-demo.pdf", ["Exercices TD 4", "Compte Étudiant Démo — dépôt depuis 2late"], h(3)),
        ("sub-2", "a8", "u-arnaud", "exos-td4-arnaud-bilie.pdf", ["Exercices TD 4", "Arnaud Bilie"], h(2.4)),
    ]
    for sid, aid, uid, fname, lines, created in subs:
        blob = demo_pdf(lines)
        conn.execute(
            "INSERT INTO submissions (id, announcement_id, user_id, file_name, file_type, file_size, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (sid, aid, uid, fname, "application/pdf", len(blob), created),
        )
        if uploads_dir is not None:
            (uploads_dir / sid).write_bytes(blob)

    conn.commit()
