# 2late — Annonces universitaires (PWA)

PWA de centralisation des annonces académiques officielles et communautaires de l'université. Fonctionne hors-ligne, installable sur mobile/desktop, et prête à être portée sur Android/iOS avec Capacitor.

## Démarrage

```bash
npm install
npm run icons     # génère les icônes PWA (PNG) une seule fois
npm run dev       # http://localhost:5173
```

Build production + test local :

```bash
npm run build
npm run preview   # http://localhost:4173
```

## Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Admin | admin@2late.com | admin |
| Professeur | prof@2late.com | prof |
| Relais (STI) | marc@2late.com | marc |
| Étudiant (STI) | etu@2late.com | etu |

Un écran d'inscription permet aussi de créer un compte Étudiant (choix du pôle). Les données sont stockées localement (localStorage) ; « Réinitialiser » dans le Profil restaure la démo.

## Fonctionnalités (spec → implémentation)

- **Rôles** : ETUDIANT / RELAIS / PROF / ADMIN (src/types.ts)
- **Pôles** : STI, SEDG, MPI, SVT, SHS
- **Publication** : titre, 5 types, description, pôles cibles multiples, priorité (urgente réservée profs/admin)
- **Badges** : bordure gauche bleue #7CB9FF (PROF) / jaune #E5C100 (RELAIS), badge URGENT rouge, badges ✅ Fiable / ⚠️ Contestée
- **Fiabilité** : votes 👍/👎, ratio temps réel, seuil 70 %, réservé aux étudiants du pôle (hors auteur) + **surcharge admin** (ex. 99 %, marquée « 🔧 admin »)
- **Candidature Relais** : message de motivation + numéro WhatsApp obligatoires, visibles par l'admin (lien direct wa.me)
- **Salons de discussion** : chat général, salons par pôle, salon Administration — étudiants limités à leur pôle par défaut ; l'admin accorde/révoque l'accès à n'importe quel salon (onglet Admin → Salons, ou liste des membres du salon) ; les Relais peuvent révoquer/rétablir l'accès au salon général pour les étudiants de leur pôle. Interface mobile-first : bulles, séparateurs de jour, réponses citées, **mentions @ avec autocomplétion**, appui long (ou clic droit) sur un message → copier, répondre, supprimer, révoquer l'accès ; compteurs de non-lus
- **Planning hebdomadaire** : créneaux par pôle (jour, horaires, discipline, enseignant, salle, note) — étudiants voient leur pôle, profs/admins gèrent (bouton ＋, modifier/supprimer) et filtrent par pôle. Bandeau « En cours » en direct + prochain cours. **Liens visio/évaluation jamais affichés** : simples boutons « Visio » / « Évaluation » qui ouvrent l'URL dans un nouvel onglet
- **Rappels de notes perso** : échéances avec compte à rebours à la seconde (bandeau « À lire », planning, liste des notes), les moins de 48 h remontent automatiquement
- **Syllabus** : espace documentaire (PDF, images, documents — 20 Mo) où les enseignants, relais et l'admin déposent programmes, fiches de TP et guides, ciblés par pôle. Recherche insensible aux accents + tri (récents, anciens, titre, matière) mémorisé. Fichiers stockés dans IndexedDB (séparé de la base localStorage)
- **Notes & moyenne** : l'étudiant enregistre ses notes de devoirs (/20, coefficient) — moyenne générale pondérée et moyennes par matière, colorées. Accessible depuis le Profil → Résultats
- **Annonces participatives** : collecte de documents au sein d'une annonce (exercices, devoirs). Les étudiants déposent via bouton d'envoi explicite ; prof/relais/admin récupèrent une liste intitulée du nom de l'étudiant, heure d'envoi exacte, téléchargement individuel ou global (fichiers renommés au nom de l'étudiant), et bouton WhatsApp vers l'émetteur avec message prérempli. **Droits de téléchargement réglables** (menu ⋮) : auteur seul / enseignants & admin / enseignants, admin & relais
- **Évaluations chronométrées** : fenêtre d'ouverture + durée par éval — avant : bouton désactivé « ouvre à HH:MM » ; pendant : compte à rebours en direct ; après : lien inaccessible. **Liens par groupe** : l'étudiant choisit son groupe (1, 2…) au moment d'accéder à l'éval
- **Reset mot de passe** : l'admin génère un **lien unique** (usage unique, 24 h) que l'utilisateur utilise pour définir lui-même son nouveau mot de passe — l'admin ne le voit jamais. Écran dédié via `#/reset/<token>`
- **Feed** : onglet « À lire » (non lues, urgentes en tête puis date décroissante) / « Vu récemment » (historique par date de lecture, bascule automatique à l'ouverture)
- **Détail** : métadonnées, fil de commentaires, module de vote direct
- **Admin** : tableau de bord complet — stats (inscrits, relais, annonces urgentes, commentaires, taux de lecture moyen, répartition par pôle et par type, annonces contestées), gestion/modération des annonces (recherche, filtre par rôle, suppression), gestion des membres (annuaire, recherche, filtre, promotion/révocation Relais, désactivation/réactivation, réinitialisation de mot de passe, suppression avec cascade), validation/refus des candidatures Relais (promotion immédiate), création de comptes Professeurs/Admins en modal, modération des commentaires, export JSON des données
- **PWA** : manifeste, service worker (Workbox, autoUpdate), icônes + maskable, thème sombre Elegant, cartes 24px, offline complet. **Carte d'installation** dans le Profil : bouton natif Android (beforeinstallprompt) + instructions pas à pas iPhone (Safari → Partager → Sur l'écran d'accueil)
- **Profil** : numéro WhatsApp éditable (utilisé par les enseignants pour confirmer la réception des dépôts)

## Installer l'app

Le site officiel : **https://leaksan.github.io/2late/** — depuis le Profil → Application, le bouton « Installer » apparaît sur Android (Chrome) ; sur iPhone, suivre les instructions Safari intégrées. Fonctionne ensuite hors-ligne.

## Portage Android / iOS (Capacitor)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init 2late com.univ.deuxlate --web-dir=dist
npm run build
npx cap add android   # et/ou : npx cap add ios (macOS requis)
npx cap sync
npx cap open android
```

Puis dans Android Studio / Xcode : générer l'APK/AAB ou l'archive IPA. La webview charge `dist/` embarqué — aucune rewrite nécessaire.

## Évolutions prévues (architecture prête)

- **Backend réel** : remplacer `src/data/db.ts` (localStorage) par Supabase/Firebase — les tables SQL (User, Announcement, Vote, ReadReceipt, Comment, RelaisApplication) et le mapping sont déjà modélisés dans `src/types.ts` et les sélecteurs de `data/db.ts`.
- **Notifications push** : ajouter Firebase Cloud Messaging côté Capacitor, ou Web Push (VAPID) pour la PWA.
- **Auth forte** : la couche `src/store.tsx` isole déjà `login/register` — brancher un vrai provider sans toucher aux écrans.

## Structure

```
src/
  main.tsx              # entrée + enregistrement du service worker
  App.tsx               # shell : topbar, navigation basse, routing par vue
  store.tsx             # état global (équivalent ViewModel) + mutations
  types.ts              # modèle de données (rôles, pôles, annonces…)
  data/db.ts            # persistance locale + seed démo + sélecteurs
  components/           # cartes annonce, badges
  screens/              # Auth, Feed, Détail, Publication, Planning, Salons, Syllabus, Notes, Profil, Admin
  ui/Icons.tsx          # icônes SVG inline
scripts/gen-icons.mjs   # générateur d'icônes PNG (sans dépendance)
```
