# 2late — Annonces universitaires

Backend **Flask** (source de vérité, SQLite) + frontend **React + Vite + Tailwind + shadcn/ui**.

Les annonces officielles et communautaires de l’université — centralisées, lisibles, vérifiées.

## Démarrage

```bash
# Backend
cd backend
pip install -r requirements.txt
python wsgi.py          # http://127.0.0.1:5000  (sert aussi frontend/dist s’il est construit)

# Frontend (dev, proxy /api → :5000)
cd frontend
npm install
npm run dev             # http://127.0.0.1:5173
```

Build production du client :

```bash
cd frontend && npm run build
# puis relancer Flask : l’API et le SPA sont servis ensemble sur :5000
```

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Admin | admin@2late.com | admin |
| Professeur | prof@2late.com | prof |
| Relais (STI) | marc@2late.com | marc |
| Étudiant (STI) | etu@2late.com | etu |

L’inscription crée un compte **Étudiant** (nom, e-mail, mot de passe, pôle). Les mots de passe sont hashés (PBKDF2) et **jamais** renvoyés par l’API.

## Tests

```bash
cd backend && python -m pytest
cd frontend && npm test
```

CI (`.github/workflows/ci.yml`) lance ces deux suites à chaque push / PR.

## GitHub Actions / Pages

L’ancien workflow déployait une PWA 100 % client. **Ça ne suffit plus** :

| Job | Rôle |
|---|---|
| `CI` | `pytest` (Flask) + `npm test` / `npm run build` (React) |
| `Deploy frontend to GitHub Pages` | Construit `frontend/` (plus la racine) et publie `frontend/dist` |

**GitHub Pages n’exécute pas Flask.** Le site `*.github.io/2late/` n’est que le SPA. Pour que login / feed / fichiers marchent en ligne, il faut un backend hébergé (Render, Fly, un VPS…) et le secret de dépôt :

```
VITE_API_BASE=https://votre-api.example.com
```

En local, `VITE_API_BASE` reste vide : le proxy Vite et Flask (`wsgi.py` + `frontend/dist`) parlent en same-origin `/api`.

## Architecture

```
backend/twolate/     Flask app factory, domaine pur, services autorisés, SQLite
backend/tests/        pytest — un fichier par bloc (auth, feed, votes, chat, éval…)
frontend/src/         React + shadcn/ui (Tailwind + Radix)
frontend/src/lib/     helpers de domaine (moyenne, fenêtre d’éval, mentions…)
```

Les règles métier (visibilité, URGENTE, votes Relais, salons, fenêtre d’évaluation, moyenne pondérée, tokens 24 h / usage unique) vivent dans `backend/twolate/domain.py` et sont réutilisées côté UI dans `frontend/src/lib/domain.ts`.

## API (aperçu)

- `POST /api/auth/login` · `POST /api/auth/register` · `POST /api/auth/logout`
- `GET /api/feed?tab=toRead|seen` · `POST /api/announcements`
- `GET /api/rooms` · `POST /api/rooms/<id>/messages`
- `GET /api/schedule` · `GET /api/schedule/<id>/open?kind=visio|eval`
- `GET /api/syllabus` · `GET /api/grades`
- `GET /api/admin/stats` · `GET /api/admin/members`
- Reset : l’admin obtient `#/reset/<token>` — jamais le mot de passe.

Fichiers (syllabus, collectes) : 20 Mo max, stockés sous `backend/instance/uploads/`.
