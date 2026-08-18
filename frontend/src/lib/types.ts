export type Role = "ETUDIANT" | "RELAIS" | "PROF" | "ADMIN";
export type Pole = "STI" | "SEDG" | "MPI" | "SVT" | "SHS";
export type AnnouncementType =
  | "EVALUATION"
  | "DEVOIR"
  | "VISIO"
  | "GENERALE"
  | "EMPLOI_DU_TEMPS"
  | "PARTICIPATIVE";
export type Priority = "NORMALE" | "URGENTE";
export type CollectAccess = "AUTHOR" | "PROF" | "RELAIS";
export type RepeatKind = "DAILY" | "WEEKLY" | "MONTHLY";
export type WeekDay = "DIMANCHE" | "LUNDI" | "MARDI" | "MERCREDI" | "JEUDI" | "VENDREDI" | "SAMEDI";

export const POLES: Pole[] = ["STI", "SEDG", "MPI", "SVT", "SHS"];
export const WEEK_DAYS: WeekDay[] = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"];
export const TYPES: AnnouncementType[] = [
  "EVALUATION",
  "DEVOIR",
  "VISIO",
  "GENERALE",
  "EMPLOI_DU_TEMPS",
  "PARTICIPATIVE",
];

export const POLE_LABELS: Record<Pole, string> = {
  STI: "Sciences et Technologies de l’Ingénieur",
  SEDG: "Sciences Économiques et de Gestion",
  MPI: "Mathématiques, Physique, Informatique",
  SVT: "Sciences de la Vie et de la Terre",
  SHS: "Sciences Humaines et Sociales",
};

export const TYPE_INFO: Record<AnnouncementType, { label: string }> = {
  EVALUATION: { label: "Évaluation" },
  DEVOIR: { label: "Devoir à rendre" },
  VISIO: { label: "Session visio" },
  GENERALE: { label: "Annonce générale" },
  EMPLOI_DU_TEMPS: { label: "Changement d’emploi du temps" },
  PARTICIPATIVE: { label: "Collecte participative" },
};

export const ROLE_LABELS: Record<Role, string> = {
  ETUDIANT: "Étudiant",
  RELAIS: "Relais",
  PROF: "Prof / Informaticien",
  ADMIN: "Administrateur",
};

export const ROLE_SHORT: Record<Role, string> = {
  ETUDIANT: "ÉTUDIANT",
  RELAIS: "RELAIS",
  PROF: "PROF",
  ADMIN: "ADMIN",
};

export const ROLE_COLORS: Record<Role, string> = {
  PROF: "#7CB9FF",
  RELAIS: "#E5C100",
  ADMIN: "#B9A4FF",
  ETUDIANT: "#9AA7B8",
};

export const REPEAT_LABELS: Record<RepeatKind, string> = {
  DAILY: "Chaque jour",
  WEEKLY: "Chaque semaine",
  MONTHLY: "Chaque mois",
};

export const COLLECT_ACCESS_LABELS: Record<CollectAccess, string> = {
  AUTHOR: "Uniquement l’auteur de la collecte",
  PROF: "Enseignants & administration",
  RELAIS: "Enseignants, admin & relais",
};

export const DAY_LABELS: Record<WeekDay, string> = {
  LUNDI: "Lundi",
  MARDI: "Mardi",
  MERCREDI: "Mercredi",
  JEUDI: "Jeudi",
  VENDREDI: "Vendredi",
  SAMEDI: "Samedi",
  DIMANCHE: "Dimanche",
};

export const REPEAT_MS: Record<RepeatKind, number> = {
  DAILY: 24 * 3600_000,
  WEEKLY: 7 * 24 * 3600_000,
  MONTHLY: 30 * 24 * 3600_000,
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  pole?: Pole | null;
  whatsapp?: string | null;
  disabled?: boolean;
  createdAt: string;
}

export interface Reliability {
  up: number;
  down: number;
  total: number;
  pct: number | null;
  overridden: boolean;
}

export interface AnnLink {
  id: string;
  label: string;
  url: string;
}

export interface Announcement {
  id: string;
  authorId: string;
  author?: User | null;
  title: string;
  type: AnnouncementType;
  description?: string | null;
  poles: Pole[];
  priority: Priority;
  reliability: Reliability;
  links: AnnLink[];
  expiresAt?: string | null;
  collectAccess?: CollectAccess | null;
  collectEmail?: string | null;
  publishAt?: string | null;
  repeat?: RepeatKind | null;
  createdAt: string;
  commentCount: number;
  submissionCount: number;
  myVote?: number | null;
  canVote?: boolean;
  comments?: Comment[];
  submissions?: SubmissionRow[];
  canSubmit?: boolean;
  canCollect?: boolean;
  canDownload?: boolean;
  canManageCollect?: boolean;
}

export interface Comment {
  id: string;
  announcementId: string;
  authorId: string;
  author?: User | null;
  body: string;
  createdAt: string;
}

export interface SubmissionRow {
  id: string;
  announcementId: string;
  userId: string;
  student?: User | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  canDownload: boolean;
}

export interface ChatRoom {
  id: string;
  kind: "GENERAL" | "POLE" | "STAFF";
  pole?: Pole | null;
  name: string;
  description: string;
  unread: number;
  members: number;
  lastMessage?: { id: string; body: string; createdAt: string; authorName?: string | null } | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  authorId: string;
  author?: User | null;
  body: string;
  replyToId?: string | null;
  deleted: boolean;
  reactions: Array<{ emoji: string; userIds: string[] }>;
  createdAt: string;
}

export interface ScheduleSlot {
  id: string;
  pole: Pole;
  day: WeekDay;
  start: string;
  end: string;
  discipline: string;
  teacherName: string;
  room?: string | null;
  hasVisio: boolean;
  hasEval: boolean;
  evalGroups: string[];
  visioUrl?: string | null;
  evalUrl?: string | null;
  evalLinks?: Array<{ group: string; url: string }>;
  evalState: EvalState;
  evalStartsAt?: string | null;
  evalMinutes?: number | null;
  visioOpen: boolean;
  evalOpen: boolean;
  coursePostponed: boolean;
  evalPostponed: boolean;
  postponedReason?: string | null;
  note?: string | null;
  createdAt: string;
}

export type EvalState = "none" | "off" | "upcoming" | "open" | "ended" | "plain";

export interface CourseNote {
  id: string;
  userId: string;
  slotId: string;
  body: string;
  done: boolean;
  dueAt?: string | null;
  createdAt: string;
}

export interface SyllabusDoc {
  id: string;
  authorId: string;
  author?: User | null;
  title: string;
  description?: string | null;
  poles: Pole[];
  discipline?: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  canDelete: boolean;
}

export interface Grade {
  id: string;
  discipline: string;
  title: string;
  value: number;
  coef: number;
  createdAt: string;
}

export interface Milestone {
  id: string;
  threshold: number;
  title: string;
  message: string;
  reachedAt?: string | null;
}

export interface NavBadges {
  toRead: number;
  chatUnread: number;
  mentionPending: boolean;
  pendingApplications: number;
}
