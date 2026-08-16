import type { Announcement, Comment, DB, Grade, Pole, ScheduleSlot, Subject, Submission, SyllabusDoc, User, Vote } from '../types';
import { POLES } from '../types';
import { demoPdf, putFile } from './files';

const DB_KEY = '2late.db.v1';

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

export function seedDB(): DB {
  const users: User[] = [
    { id: 'u-admin', name: 'Administration 2late', email: 'admin@2late.com', password: 'admin', role: 'ADMIN', createdAt: hoursAgo(24 * 30) },
    { id: 'u-prof', name: 'Pr. Pierre Kadet', email: 'prof@2late.com', password: 'prof', role: 'PROF', whatsapp: '+241 06 10 20 30', createdAt: hoursAgo(24 * 21) },
    { id: 'u-marc', name: 'Marc Obame', email: 'marc@2late.com', password: 'marc', role: 'RELAIS', pole: 'STI', whatsapp: '+241 06 77 88 99', createdAt: hoursAgo(24 * 18) },
    { id: 'u-nadia', name: 'Nadia Nzigou', email: 'nadia@2late.com', password: 'nadia', role: 'ETUDIANT', pole: 'SEDG', whatsapp: '+241 06 55 12 87', createdAt: hoursAgo(24 * 15) },
    { id: 'u-jean', name: 'Jean Moulougui', email: 'jean@2late.com', password: 'jean', role: 'ETUDIANT', pole: 'MPI', whatsapp: '+241 06 22 33 44', createdAt: hoursAgo(24 * 12) },
    { id: 'u-sophie', name: 'Sophie Bouanga', email: 'sophie@2late.com', password: 'sophie', role: 'ETUDIANT', pole: 'SVT', createdAt: hoursAgo(24 * 10) },
    { id: 'u-etu', name: 'Compte Étudiant Démo', email: 'etu@2late.com', password: 'etu', role: 'ETUDIANT', pole: 'STI', whatsapp: '+241 06 11 22 33', createdAt: hoursAgo(24 * 9) },
    { id: 'u-arnaud', name: 'Arnaud Bilie', email: 'arnaud@2late.com', password: 'arnaud', role: 'ETUDIANT', pole: 'STI', whatsapp: '+241 06 44 55 66', createdAt: hoursAgo(24 * 8) },
    { id: 'u-paul', name: 'Paul Nguema', email: 'paul@2late.com', password: 'paul', role: 'ETUDIANT', pole: 'MPI', createdAt: hoursAgo(24 * 7) },
    { id: 'u-lea', name: 'Léa Mengue', email: 'lea@2late.com', password: 'lea', role: 'ETUDIANT', pole: 'SHS', whatsapp: '+241 06 66 77 55', createdAt: hoursAgo(24 * 6) },
    { id: 'u-chris', name: 'Chris Ibinga', email: 'chris@2late.com', password: 'chris', role: 'ETUDIANT', pole: 'SEDG', createdAt: hoursAgo(24 * 5) }
  ];

  const announcements: Announcement[] = [
    {
      id: 'a1',
      authorId: 'u-prof',
      title: 'Examen final d’Algorithmique — STI',
      type: 'EVALUATION',
      description: 'L’examen final se déroulera en salle B12 le vendredi 22, de 09h à 12h. Programme : chapitres 1 à 8. Aucun document autorisé, calculatrice autorisée.',
      poles: ['STI'],
      priority: 'URGENTE',
      createdAt: hoursAgo(2)
    },
    {
      id: 'a2',
      authorId: 'u-prof',
      title: 'Devoir à rendre — Statistiques (MPI)',
      type: 'DEVOIR',
      description: 'À déposer sur Moodle avant dimanche 23h59. Format PDF, exercices 1 à 5 du TD 4.',
      poles: ['MPI'],
      priority: 'NORMALE',
      createdAt: hoursAgo(26)
    },
    {
      id: 'a3',
      authorId: 'u-marc',
      title: 'Report de la visio de Mathématiques',
      type: 'VISIO',
      description: 'La visio de ce soir serait reportée à demain 10h, selon un message du professeur relayé sur un groupe WhatsApp. Vérification en cours.',
      poles: ['STI', 'MPI'],
      priority: 'NORMALE',
      createdAt: hoursAgo(5)
    },
    {
      id: 'a4',
      authorId: 'u-marc',
      title: 'Changement de salle d’Algorithmique ?',
      type: 'EMPLOI_DU_TEMPS',
      description: 'Rumeur : la salle B12 serait remplacée par l’amphi 3 dès lundi. Information non confirmée, en attente d’un message officiel.',
      poles: ['STI'],
      priority: 'NORMALE',
      createdAt: hoursAgo(3)
    },
    {
      id: 'a5',
      authorId: 'u-admin',
      title: 'Maintenance de Moodle ce samedi',
      type: 'GENERALE',
      description: 'La plateforme sera indisponible de 6h à 12h. Pensez à télécharger vos supports de cours avant la maintenance.',
      poles: [...POLES],
      priority: 'NORMALE',
      createdAt: hoursAgo(28)
    },
    {
      id: 'a6',
      authorId: 'u-prof',
      title: 'Visio questions/réponses — Méthodologie',
      type: 'VISIO',
      description: 'Session de questions/réponses avant les partiels pour les pôles SHS et SEDG. Le lien Zoom sera publié sur Moodle une heure avant.',
      poles: ['SHS', 'SEDG'],
      priority: 'NORMALE',
      createdAt: hoursAgo(8)
    },
    {
      id: 'a7',
      authorId: 'u-marc',
      title: 'Collecte de notes de cours — SVT',
      type: 'GENERALE',
      description: 'Une étudiante compile les notes du semestre pour un guide de révision commun. Vous pouvez lui transmettre vos cours à la BU.',
      poles: ['SVT'],
      priority: 'NORMALE',
      createdAt: hoursAgo(0.7)
    },
    {
      id: 'a8',
      authorId: 'u-prof',
      title: 'Déposez vos exercices du TD 4 (visio d’aujourd’hui)',
      type: 'PARTICIPATIVE',
      description: 'Pour éviter les fichiers perdus entre WhatsApp et ma boîte mail : déposez vos exercices directement ici avant ce soir 23 h. Chaque dépôt arrive classé à votre nom, avec son heure d’envoi.',
      poles: ['STI'],
      priority: 'NORMALE',
      createdAt: hoursAgo(4)
    }
  ];

  const votes: Vote[] = [
    { id: 'v1', announcementId: 'a3', userId: 'u-jean', value: 1, createdAt: hoursAgo(4) },
    { id: 'v2', announcementId: 'a3', userId: 'u-sophie', value: 1, createdAt: hoursAgo(4) },
    { id: 'v3', announcementId: 'a3', userId: 'u-nadia', value: 1, createdAt: hoursAgo(3) },
    { id: 'v4', announcementId: 'a3', userId: 'u-etu', value: 1, createdAt: hoursAgo(3) },
    { id: 'v5', announcementId: 'a3', userId: 'u-arnaud', value: 1, createdAt: hoursAgo(2) },
    { id: 'v6', announcementId: 'a3', userId: 'u-paul', value: 1, createdAt: hoursAgo(2) },
    { id: 'v7', announcementId: 'a3', userId: 'u-lea', value: 1, createdAt: hoursAgo(1) },
    { id: 'v8', announcementId: 'a3', userId: 'u-chris', value: -1, createdAt: hoursAgo(1) },
    { id: 'v9', announcementId: 'a4', userId: 'u-arnaud', value: 1, createdAt: hoursAgo(2) },
    { id: 'v10', announcementId: 'a4', userId: 'u-paul', value: 1, createdAt: hoursAgo(2) },
    { id: 'v11', announcementId: 'a4', userId: 'u-jean', value: -1, createdAt: hoursAgo(2) },
    { id: 'v12', announcementId: 'a4', userId: 'u-sophie', value: -1, createdAt: hoursAgo(1) },
    { id: 'v13', announcementId: 'a4', userId: 'u-nadia', value: -1, createdAt: hoursAgo(1) },
    { id: 'v14', announcementId: 'a4', userId: 'u-etu', value: -1, createdAt: hoursAgo(1) },
    { id: 'v15', announcementId: 'a4', userId: 'u-chris', value: -1, createdAt: hoursAgo(0.5) },
    { id: 'v16', announcementId: 'a4', userId: 'u-lea', value: -1, createdAt: hoursAgo(0.5) }
  ];

  const reads = [
    { announcementId: 'a5', userId: 'u-etu', readAt: hoursAgo(22) },
    { announcementId: 'a5', userId: 'u-marc', readAt: hoursAgo(24) },
    { announcementId: 'a6', userId: 'u-nadia', readAt: hoursAgo(6) }
  ];

  const comments: Comment[] = [
    { id: 'c1', announcementId: 'a1', authorId: 'u-marc', body: 'Pour confirmation : l’examen couvre bien les chapitres 1 à 8 ?', createdAt: hoursAgo(1.4) },
    { id: 'c2', announcementId: 'a1', authorId: 'u-prof', body: 'Oui, chapitres 1 à 8 inclus. Bonne révision à tous.', createdAt: hoursAgo(1.1) },
    { id: 'c3', announcementId: 'a3', authorId: 'u-jean', body: 'Reçu aussi sur le groupe WhatsApp, ça semble confirmé.', createdAt: hoursAgo(4) },
    { id: 'c4', announcementId: 'a4', authorId: 'u-marc', body: 'Info venue d’un tutorat, à prendre avec prudence en attendant un message officiel.', createdAt: hoursAgo(2) },
    { id: 'c5', announcementId: 'a7', authorId: 'u-sophie', body: 'Je participe, j’ai les TP complets.', createdAt: hoursAgo(0.4) }
  ];

  const applications = [
    {
      id: 'app1',
      userId: 'u-nadia',
      status: 'PENDING' as const,
      message: 'Bonjour, je suis très active sur les groupes de promo et je relaye déjà beaucoup d’infos entre Moodle et WhatsApp. Je souhaite devenir Relais pour fiabiliser les annonces du pôle SEDG.',
      whatsapp: '+241 06 55 12 87',
      createdAt: hoursAgo(48)
    }
  ];

  const chatMessages = [
    { id: 'm1', roomId: 'pole-STI', authorId: 'u-marc', body: 'Quelqu’un a commencé les révisions pour l’examen final d’algorithmique ? 📚', createdAt: hoursAgo(6) },
    { id: 'm2', roomId: 'pole-STI', authorId: 'u-arnaud', body: 'Oui, je fais les annales de l’an dernier, elles couvrent presque tout le programme.', createdAt: hoursAgo(5.5) },
    { id: 'm3', roomId: 'pole-STI', authorId: 'u-etu', body: '@Arnaud on peut organiser une session à la BU demain ?', createdAt: hoursAgo(4.5) },
    { id: 'm4', roomId: 'pole-STI', authorId: 'u-arnaud', body: 'Bonne idée ! 14h, salle 3 ?', createdAt: hoursAgo(4.2) },
    { id: 'm5', roomId: 'pole-STI', authorId: 'u-marc', body: 'Je serai là aussi, je ramène mes notes de TD.', createdAt: hoursAgo(0.4) },
    { id: 'm6', roomId: 'general', authorId: 'u-admin', body: 'Bienvenue dans le salon général 🌍 Rappel : les annonces officielles passent par 2late, le salon sert aux échanges.', createdAt: hoursAgo(20) },
    { id: 'm7', roomId: 'general', authorId: 'u-prof', body: 'Pensez à consulter l’annonce sur la visio questions/réponses de demain.', createdAt: hoursAgo(3) },
    { id: 'm8', roomId: 'general', authorId: 'u-marc', body: 'Bien noté professeur 👍', reactions: [{ emoji: '👍', userIds: ['u-prof', 'u-nadia'] }], createdAt: hoursAgo(2.6) },
    { id: 'm9', roomId: 'staff', authorId: 'u-admin', body: 'Rappel : une candidature Relais est en attente de validation.', createdAt: hoursAgo(9) }
  ];

  const roomAccess = [
    { userId: 'u-nadia', roomId: 'general', decision: 'GRANTED' as const, byId: 'u-admin', at: hoursAgo(30) }
  ];

  const chatVisits = [
    { userId: 'u-etu', roomId: 'pole-STI', at: hoursAgo(5) },
    { userId: 'u-marc', roomId: 'pole-STI', at: hoursAgo(1) },
    { userId: 'u-marc', roomId: 'general', at: hoursAgo(2.5) },
    { userId: 'u-admin', roomId: 'staff', at: hoursAgo(8) },
    { userId: 'u-nadia', roomId: 'general', at: hoursAgo(2.8) }
  ];

  const stiTeachers = ['Pr. Pierre Kadet', 'Pr. Anne Mba', 'Pr. Paul Nzue', 'Pr. Grace Ondo', 'Pr. Aïcha Bongo'];
  const stiDisciplines = [
    'Algorithmique avancée', 'Bases de données', 'Réseaux et protocoles',
    'Mathématiques pour l’ingénieur', 'TP Électronique', 'Programmation Python',
    'Systèmes embarqués', 'Thermodynamique', 'Mécanique des matériaux',
    'Génie logiciel', 'Traitement du signal', 'Automatique',
    'Sécurité informatique', 'Architecture des ordinateurs', ' TP Mécanique',
    'Probabilités et statistiques', 'Développement web', 'Anglais technique',
    'Gestion de projet', 'Intelligence artificielle', 'Robotique'
  ];
  const stiRooms = ['B12', 'B14', 'Lab 1', 'Lab 2', 'Lab 3', 'Amphi 3'];
  const stiTimes: Array<[string, string]> = [['08:00', '11:00'], ['12:00', '15:00'], ['16:00', '19:00']];
  const daysSti: ScheduleSlot['day'][] = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
  const scheduleSlots: ScheduleSlot[] = [];
  let stiN = 0;
  for (const day of daysSti) {
    for (const [start, end] of stiTimes) {
      stiN++;
      scheduleSlots.push({
        id: `sti-${stiN}`,
        pole: 'STI',
        day,
        start,
        end,
        discipline: stiDisciplines[(stiN - 1) % stiDisciplines.length].trim(),
        teacherName: stiTeachers[(stiN - 1) % stiTeachers.length],
        room: stiRooms[(stiN - 1) % stiRooms.length],
        visioUrl: `https://meet.google.com/sti-${stiN}`,
        evalUrl: `https://moodle.univ.ga/mod/quiz/view.php?id=sti-${stiN}`,
        evalLinks: stiN === 1
          ? [
              { group: 'Groupe 1', url: 'https://moodle.univ.ga/mod/quiz/view.php?id=sti-1-g1' },
              { group: 'Groupe 2', url: 'https://moodle.univ.ga/mod/quiz/view.php?id=sti-1-g2' }
            ]
          : undefined,
        // Démo : évaluation démarrée il y a 25 min, durée 2 h — chrono visible.
        evalStartsAt: stiN === 1 ? new Date(Date.now() - 25 * 60_000).toISOString() : undefined,
        evalMinutes: stiN === 1 ? 120 : undefined,
        visioOpen: stiN % 4 !== 0,
        evalOpen: stiN % 5 !== 0,
        createdAt: hoursAgo(24 * 14)
      });
    }
  }
  const otherSlots: ScheduleSlot[] = [
    { id: 's6', pole: 'SEDG', day: 'LUNDI', start: '10:00', end: '12:00', discipline: 'Microéconomie', teacherName: 'Pr. Sylvain Assoumou', room: 'A3', visioUrl: 'https://meet.google.com/sedg-micro', evalUrl: 'https://moodle.univ.ga/mod/quiz/view.php?id=sedg-micro', visioOpen: true, evalOpen: false, createdAt: hoursAgo(24 * 14) },
    { id: 's7', pole: 'SEDG', day: 'MARDI', start: '08:00', end: '10:00', discipline: 'Comptabilité générale', teacherName: 'Pr. Léa Mengue', room: 'A1', visioUrl: 'https://meet.google.com/sedg-cpt', evalUrl: 'https://moodle.univ.ga/mod/quiz/view.php?id=cpt-cc1', visioOpen: false, evalOpen: true, createdAt: hoursAgo(24 * 14) },
    { id: 's8', pole: 'SEDG', day: 'JEUDI', start: '14:00', end: '16:00', discipline: 'Statistiques appliquées', teacherName: 'Pr. Sylvain Assoumou', visioUrl: 'https://meet.google.com/sedg-stat', evalUrl: 'https://moodle.univ.ga/mod/quiz/view.php?id=sedg-stat', visioOpen: true, evalOpen: true, createdAt: hoursAgo(24 * 13) },
    { id: 's9', pole: 'MPI', day: 'LUNDI', start: '14:00', end: '16:00', discipline: 'Algèbre linéaire', teacherName: 'Pr. Jean Moulounga', room: 'C2', visioUrl: 'https://meet.google.com/mpi-alg', evalUrl: 'https://moodle.univ.ga/mod/quiz/view.php?id=mpi-alg', visioOpen: true, evalOpen: true, createdAt: hoursAgo(24 * 14) },
    { id: 's10', pole: 'MPI', day: 'MERCREDI', start: '08:00', end: '10:00', discipline: 'Physique ondulatoire', teacherName: 'Pr. Jean Moulounga', visioUrl: 'https://zoom.us/j/112233445', evalUrl: 'https://moodle.univ.ga/mod/quiz/view.php?id=mpi-phy', visioOpen: true, evalOpen: false, createdAt: hoursAgo(24 * 13) },
    { id: 's11', pole: 'MPI', day: 'VENDREDI', start: '10:00', end: '12:00', discipline: 'Programmation Python', teacherName: 'Pr. Aïcha Bongo', room: 'Lab 3', visioUrl: 'https://meet.google.com/mpi-py', evalUrl: 'https://moodle.univ.ga/mod/quiz/view.php?id=py-tp2', visioOpen: false, evalOpen: true, createdAt: hoursAgo(24 * 12) },
    { id: 's12', pole: 'SVT', day: 'MARDI', start: '14:00', end: '17:00', discipline: 'TP Biologie cellulaire', teacherName: 'Pr. Sophie Bouanga', room: 'Lab Bio', note: 'TP noté — compte-rendu à déposer la semaine suivante.', visioUrl: 'https://meet.google.com/svt-bio', evalUrl: 'https://moodle.univ.ga/mod/assign/view.php?id=bio-tp', visioOpen: true, evalOpen: true, createdAt: hoursAgo(24 * 14) },
    { id: 's13', pole: 'SVT', day: 'VENDREDI', start: '08:00', end: '10:00', discipline: 'Géologie structurale', teacherName: 'Pr. Ismaël Obame', room: 'D1', visioUrl: 'https://meet.google.com/svt-geo', evalUrl: 'https://moodle.univ.ga/mod/quiz/view.php?id=svt-geo', visioOpen: true, evalOpen: true, createdAt: hoursAgo(24 * 13) },
    { id: 's14', pole: 'SHS', day: 'MERCREDI', start: '10:00', end: '12:00', discipline: 'Sociologie du développement', teacherName: 'Pr. Chantal Nziengui', room: 'E2', visioUrl: 'https://meet.google.com/shs-socio', evalUrl: 'https://moodle.univ.ga/mod/quiz/view.php?id=shs-socio', visioOpen: true, evalOpen: false, createdAt: hoursAgo(24 * 14) },
    { id: 's15', pole: 'SHS', day: 'JEUDI', start: '10:00', end: '12:00', discipline: 'Histoire des idées politiques', teacherName: 'Pr. Chantal Nziengui', visioUrl: 'https://meet.google.com/shs-histoire', evalUrl: 'https://moodle.univ.ga/mod/quiz/view.php?id=shs-hist', visioOpen: true, evalOpen: true, createdAt: hoursAgo(24 * 13) }
  ];
  scheduleSlots.push(...otherSlots);

  const subjects: Subject[] = [];
  for (const s of scheduleSlots) {
    if (!subjects.some(x => x.pole === s.pole && x.discipline === s.discipline)) {
      subjects.push({
        id: `sub-${s.id}`,
        pole: s.pole,
        discipline: s.discipline,
        teacherName: s.teacherName,
        room: s.room,
        visioUrl: s.visioUrl,
        evalUrl: s.evalUrl
      });
    }
  }

  const milestones = [
    {
      id: 'ms-10',
      threshold: 10,
      title: '🎉 {n} membres !',
      message: 'Merci à vous ! La communauté 2late vient d’atteindre {n} membres. Chaque inscription rend l’information plus fiable et plus rapide pour tout le campus. Merci de votre confiance — ensemble, rien n’arrive trop tard. 💙'
    },
    {
      id: 'ms-50',
      threshold: 50,
      title: '🎉 {n} membres !',
      message: 'Merci à vous ! La communauté 2late vient d’atteindre {n} membres. Chaque inscription rend l’information plus fiable et plus rapide pour tout le campus. Merci de votre confiance — ensemble, rien n’arrive trop tard. 💙'
    },
    {
      id: 'ms-100',
      threshold: 100,
      title: '🏆 {n} membres !',
      message: 'Merci à vous ! 2late dépasse les {n} membres. Ce qui a commencé par des annonces perdues dans les groupes WhatsApp est devenu une vraie communauté. Merci de votre confiance — ensemble, rien n’arrive trop tard. 💙'
    }
  ];

  const syllabusDocs: SyllabusDoc[] = [
    {
      id: 'doc-1',
      authorId: 'u-prof',
      title: 'Programme et plan du cours — Algorithmique avancée',
      description: 'Plan détaillé des 12 séances, bibliographie et barème de l’évaluation continue.',
      poles: ['STI'],
      discipline: 'Algorithmique avancée',
      fileName: 'programme-algo.pdf',
      fileType: 'application/pdf',
      fileSize: 0,
      seed: true,
      createdAt: hoursAgo(24 * 9)
    },
    {
      id: 'doc-2',
      authorId: 'u-prof',
      title: 'Fiche de TP n°3 — Programmation Python',
      description: 'Énoncé du TP à lire avant la séance. Dépôt du compte-rendu sur Moodle.',
      poles: ['MPI'],
      discipline: 'Programmation Python',
      fileName: 'tp3-python.pdf',
      fileType: 'application/pdf',
      fileSize: 0,
      seed: true,
      createdAt: hoursAgo(24 * 6)
    },
    {
      id: 'doc-3',
      authorId: 'u-admin',
      title: 'Guide de rédaction des comptes-rendus',
      description: 'Consignes officielles de présentation des comptes-rendus, valables pour tous les pôles.',
      poles: [...POLES],
      fileName: 'guide-comptes-rendus.pdf',
      fileType: 'application/pdf',
      fileSize: 0,
      seed: true,
      createdAt: hoursAgo(24 * 12)
    }
  ];
  // Contenu des PDF de démo : généré à la volée et stocké dans IndexedDB.
  for (const d of syllabusDocs) {
    const blob = demoPdf([
      d.title,
      `Publié sur 2late — ${d.authorId === 'u-admin' ? 'Administration' : 'Pr. Pierre Kadet'}`,
      '',
      'Ce document de démonstration est généré par l’application 2late.',
      'Les documents réels déposés par les enseignants et les relais',
      'apparaîtront dans cet espace syllabus.',
      '',
      `Pôles concernés : ${d.poles.join(', ')}`,
      d.discipline ? `Discipline : ${d.discipline}` : ''
    ]);
    d.fileSize = blob.size;
    void putFile(d.id, blob).catch(() => undefined);
  }

  const grades: Grade[] = [
    { id: 'g1', userId: 'u-etu', discipline: 'Algorithmique avancée', title: 'CC1 — partiel', value: 14, coef: 2, createdAt: hoursAgo(24 * 20) },
    { id: 'g2', userId: 'u-etu', discipline: 'Algorithmique avancée', title: 'TP noté n°3', value: 16, coef: 1, createdAt: hoursAgo(24 * 10) },
    { id: 'g3', userId: 'u-etu', discipline: 'Bases de données', title: 'Interrogation n°1', value: 11.5, coef: 1, createdAt: hoursAgo(24 * 15) },
    { id: 'g4', userId: 'u-etu', discipline: 'Réseaux et protocoles', title: 'Contrôle chapitres 1-3', value: 12.5, coef: 1, createdAt: hoursAgo(24 * 7) },
    { id: 'g5', userId: 'u-etu', discipline: 'Anglais technique', title: 'Oral de présentation', value: 13, coef: 1, createdAt: hoursAgo(24 * 8) }
  ];

  const submissions: Submission[] = [];
  const mkSub = (id: string, userId: string, fileName: string, lines: string[], h: number) => {
    const blob = demoPdf(lines);
    submissions.push({ id, announcementId: 'a8', userId, fileName, fileType: 'application/pdf', fileSize: blob.size, createdAt: hoursAgo(h) });
    void putFile(id, blob).catch(() => undefined);
  };
  mkSub('sub-1', 'u-etu', 'exos-td4-compte-demo.pdf', ['Exercices TD 4', 'Compte Étudiant Démo — dépôt depuis 2late'], 3);
  mkSub('sub-2', 'u-arnaud', 'exos-td4-arnaud-bilie.pdf', ['Exercices TD 4', 'Arnaud Bilie'], 2.4);

  return {
    version: 2,
    users,
    announcements,
    votes,
    reads,
    comments,
    applications,
    resetTokens: [],
    chatMessages,
    roomAccess,
    chatVisits,
    scheduleSlots,
    subjects,
    milestones,
    courseNotes: [],
    syllabusDocs,
    grades,
    submissions
  };
}

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (Array.isArray(parsed.users)) {
        parsed.resetTokens ??= [];
        parsed.chatMessages ??= [];
        parsed.chatMessages = parsed.chatMessages.map(m => ({ ...m, reactions: m.reactions ?? [] }));
        parsed.roomAccess ??= [];
        parsed.chatVisits ??= [];
        parsed.scheduleSlots ??= [];
        parsed.subjects ??= [];
        parsed.milestones ??= [];
        parsed.courseNotes ??= [];
        // Première version sans syllabus : on injecte les documents de démo.
        if (parsed.syllabusDocs === undefined) parsed.syllabusDocs = seedDB().syllabusDocs;
        // Idem pour les notes de démo (visibles uniquement par le compte démo u-etu).
        if (parsed.grades === undefined) parsed.grades = seedDB().grades;
        // Idem pour les participatives : annonce + dépôts + éval chronométrée de démo.
        if (parsed.submissions === undefined) {
          const fresh = seedDB();
          parsed.submissions = fresh.submissions;
          if (!parsed.announcements.some(a => a.type === 'PARTICIPATIVE')) {
            parsed.announcements.push(...fresh.announcements.filter(a => a.type === 'PARTICIPATIVE'));
          }
          const demoEval = fresh.scheduleSlots.find(s => s.id === 'sti-1');
          const target = parsed.scheduleSlots.find(s => s.id === 'sti-1');
          if (demoEval && target && !target.evalLinks) {
            target.evalLinks = demoEval.evalLinks;
            target.evalStartsAt = demoEval.evalStartsAt;
            target.evalMinutes = demoEval.evalMinutes;
          }
          // Numéros WhatsApp de démo pour les comptes existants qui n'en ont pas.
          const freshUsers = new Map(fresh.users.map(u => [u.id, u]));
          for (const u of parsed.users) {
            if (!u.whatsapp) u.whatsapp = freshUsers.get(u.id)?.whatsapp;
          }
        }
        return { ...parsed, version: 2 };
      }
    }
  } catch {
    localStorage.removeItem(DB_KEY);
  }
  const fresh = seedDB();
  saveDB(fresh);
  return fresh;
}

export function saveDB(db: DB): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDB(): DB {
  const fresh = seedDB();
  saveDB(fresh);
  return fresh;
}

export function userById(db: DB, id: string): User | undefined {
  return db.users.find(u => u.id === id);
}

export function votesOf(db: DB, announcementId: string): Vote[] {
  return db.votes.filter(v => v.announcementId === announcementId);
}

export function reliabilityOf(votes: Vote[]): { up: number; down: number; total: number; pct: number | null } {
  const up = votes.filter(v => v.value === 1).length;
  const down = votes.length - up;
  const total = votes.length;
  const pct = total === 0 ? null : Math.round((up / total) * 100);
  return { up, down, total, pct };
}

export function reliabilityOfAnn(db: DB, ann: Announcement): { up: number; down: number; total: number; pct: number | null; overridden: boolean } {
  const base = reliabilityOf(votesOf(db, ann.id));
  if (ann.reliabilityOverride != null) return { ...base, pct: ann.reliabilityOverride, overridden: true };
  return { ...base, overridden: false };
}

export function myVoteOf(db: DB, announcementId: string, userId: string): Vote | undefined {
  return db.votes.find(v => v.announcementId === announcementId && v.userId === userId);
}

export function hasRead(db: DB, announcementId: string, userId: string): boolean {
  return db.reads.some(r => r.announcementId === announcementId && r.userId === userId);
}

export function visibleAnnouncements(db: DB, user: User): Announcement[] {
  if (user.role === 'PROF' || user.role === 'ADMIN') return db.announcements;
  if (!user.pole) return [];
  const pole = user.pole;
  return db.announcements.filter(a => a.poles.includes(pole));
}

function readAtOf(db: DB, announcementId: string, userId: string): number {
  const r = db.reads.find(rc => rc.announcementId === announcementId && rc.userId === userId);
  return r ? Date.parse(r.readAt) : 0;
}

export function isExpired(ann: Announcement): boolean {
  return !!ann.expiresAt && Date.now() >= Date.parse(ann.expiresAt);
}

export function feeds(db: DB, user: User): { toRead: Announcement[]; seen: Announcement[] } {
  const vis = visibleAnnouncements(db, user).filter(a => !isExpired(a));
  const byUrgentThenDate = (a: Announcement, b: Announcement) =>
    (a.priority === 'URGENTE' ? 0 : 1) - (b.priority === 'URGENTE' ? 0 : 1) || Date.parse(b.createdAt) - Date.parse(a.createdAt);
  const toRead = vis.filter(a => !hasRead(db, a.id, user.id)).sort(byUrgentThenDate);
  const seen = vis.filter(a => hasRead(db, a.id, user.id)).sort((a, b) => readAtOf(db, b.id, user.id) - readAtOf(db, a.id, user.id));
  return { toRead, seen };
}

export function canVoteOn(db: DB, user: User, ann: Announcement): boolean {
  if (user.role !== 'ETUDIANT' && user.role !== 'RELAIS') return false;
  if (ann.authorId === user.id) return false;
  const author = userById(db, ann.authorId);
  if (!author || author.role !== 'RELAIS') return false;
  return !!user.pole && ann.poles.includes(user.pole as Pole);
}

export function commentsOf(db: DB, announcementId: string): Comment[] {
  return db.comments
    .filter(c => c.announcementId === announcementId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}
