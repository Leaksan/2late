export type Role = 'ETUDIANT' | 'RELAIS' | 'PROF' | 'ADMIN';
export type Pole = 'STI' | 'SEDG' | 'MPI' | 'SVT' | 'SHS';
export type AnnouncementType = 'EVALUATION' | 'DEVOIR' | 'VISIO' | 'GENERALE' | 'EMPLOI_DU_TEMPS' | 'PARTICIPATIVE';
export type Priority = 'NORMALE' | 'URGENTE';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REFUSED';
// Qui a le droit de télécharger les documents collectés d'une annonce participative.
export type CollectAccess = 'AUTHOR' | 'PROF' | 'RELAIS';

// Récurrence d'une annonce : elle revient « à lire » à chaque cycle.
export type RepeatKind = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const REPEAT_MS: Record<RepeatKind, number> = {
  DAILY: 24 * 3600_000,
  WEEKLY: 7 * 24 * 3600_000,
  MONTHLY: 30 * 24 * 3600_000
};

export const REPEAT_LABELS: Record<RepeatKind, string> = {
  DAILY: 'Chaque jour',
  WEEKLY: 'Chaque semaine',
  MONTHLY: 'Chaque mois'
};

export const COLLECT_ACCESS_LABELS: Record<CollectAccess, string> = {
  AUTHOR: 'Uniquement l’auteur de la collecte',
  PROF: 'Enseignants & administration',
  RELAIS: 'Enseignants, admin & relais'
};

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  pole?: Pole;
  whatsapp?: string;
  disabled?: boolean;
  createdAt: string;
}

export interface AnnLink {
  id: string;
  label: string;
  url: string;
}

export interface Announcement {
  id: string;
  authorId: string;
  title: string;
  type: AnnouncementType;
  description?: string;
  poles: Pole[];
  priority: Priority;
  reliabilityOverride?: number | null;
  links?: AnnLink[];
  expiresAt?: string | null;
  collectAccess?: CollectAccess;
  collectEmail?: string | null;
  publishAt?: string | null;
  repeat?: RepeatKind | null;
  createdAt: string;
}

export interface Milestone {
  id: string;
  threshold: number;
  title: string;
  message: string;
  reachedAt?: string;
}

export interface Vote {
  id: string;
  announcementId: string;
  userId: string;
  value: 1 | -1;
  createdAt: string;
}

export interface ReadReceipt {
  announcementId: string;
  userId: string;
  readAt: string;
}

export interface Comment {
  id: string;
  announcementId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface RelaisApplication {
  id: string;
  userId: string;
  status: ApplicationStatus;
  message?: string;
  whatsapp?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface ResetToken {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

export type RoomKind = 'GENERAL' | 'POLE' | 'STAFF';
export type AccessDecision = 'GRANTED' | 'REVOKED';

export interface ChatMessage {
  id: string;
  roomId: string;
  authorId: string;
  body: string;
  replyToId?: string;
  deleted?: boolean;
  reactions?: Array<{ emoji: string; userIds: string[] }>;
  createdAt: string;
}

export interface RoomAccess {
  userId: string;
  roomId: string;
  decision: AccessDecision;
  byId: string;
  at: string;
}

export interface ChatVisit {
  userId: string;
  roomId: string;
  at: string;
}

export type WeekDay = 'DIMANCHE' | 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI';

export const WEEK_DAYS: WeekDay[] = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

export const DAY_LABELS: Record<WeekDay, string> = {
  LUNDI: 'Lundi',
  MARDI: 'Mardi',
  MERCREDI: 'Mercredi',
  JEUDI: 'Jeudi',
  VENDREDI: 'Vendredi',
  SAMEDI: 'Samedi',
  DIMANCHE: 'Dimanche'
};

export interface ScheduleSlot {
  id: string;
  pole: Pole;
  day: WeekDay;
  start: string;
  end: string;
  discipline: string;
  teacherName: string;
  room?: string;
  visioUrl?: string;
  evalUrl?: string;
  evalLinks?: Array<{ group: string; url: string }>;
  evalStartsAt?: string | null;
  evalMinutes?: number;
  visioOpen?: boolean;
  evalOpen?: boolean;
  coursePostponed?: boolean;
  evalPostponed?: boolean;
  postponedReason?: string;
  note?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  pole: Pole;
  discipline: string;
  teacherName: string;
  room?: string;
  visioUrl?: string;
  evalUrl?: string;
}

export interface CourseNote {
  id: string;
  userId: string;
  slotId: string;
  body: string;
  done?: boolean;
  dueAt?: string | null;
  createdAt: string;
}

export interface SyllabusDoc {
  id: string;
  authorId: string;
  title: string;
  description?: string;
  poles: Pole[];
  discipline?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  seed?: boolean;
  createdAt: string;
}

export interface Grade {
  id: string;
  userId: string;
  discipline: string;
  title: string;
  value: number;
  coef: number;
  createdAt: string;
}

export interface Submission {
  id: string;
  announcementId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface DB {
  version: number;
  users: User[];
  announcements: Announcement[];
  votes: Vote[];
  reads: ReadReceipt[];
  comments: Comment[];
  applications: RelaisApplication[];
  resetTokens: ResetToken[];
  chatMessages: ChatMessage[];
  roomAccess: RoomAccess[];
  chatVisits: ChatVisit[];
  scheduleSlots: ScheduleSlot[];
  subjects: Subject[];
  milestones: Milestone[];
  courseNotes: CourseNote[];
  syllabusDocs: SyllabusDoc[];
  grades: Grade[];
  submissions: Submission[];
}

export const POLES: Pole[] = ['STI', 'SEDG', 'MPI', 'SVT', 'SHS'];

export const POLE_LABELS: Record<Pole, string> = {
  STI: 'Sciences et Technologies de l’Ingénieur',
  SEDG: 'Sciences Économiques et de Gestion',
  MPI: 'Mathématiques, Physique, Informatique',
  SVT: 'Sciences de la Vie et de la Terre',
  SHS: 'Sciences Humaines et Sociales'
};

export const TYPES: AnnouncementType[] = ['EVALUATION', 'DEVOIR', 'VISIO', 'GENERALE', 'EMPLOI_DU_TEMPS', 'PARTICIPATIVE'];

export const TYPE_INFO: Record<AnnouncementType, { label: string }> = {
  EVALUATION: { label: 'Évaluation' },
  DEVOIR: { label: 'Devoir à rendre' },
  VISIO: { label: 'Session visio' },
  GENERALE: { label: 'Annonce générale' },
  EMPLOI_DU_TEMPS: { label: 'Changement d’emploi du temps' },
  PARTICIPATIVE: { label: 'Collecte participative' }
};

export const ROLE_LABELS: Record<Role, string> = {
  ETUDIANT: 'Étudiant',
  RELAIS: 'Relais',
  PROF: 'Prof / Informaticien',
  ADMIN: 'Administrateur'
};

export const ROLE_SHORT: Record<Role, string> = {
  ETUDIANT: 'ÉTUDIANT',
  RELAIS: 'RELAIS',
  PROF: 'PROF',
  ADMIN: 'ADMIN'
};

export const ROLE_COLORS: Record<Role, string> = {
  PROF: '#7CB9FF',
  RELAIS: '#E5C100',
  ADMIN: '#B9A4FF',
  ETUDIANT: '#9AA7B8'
};
