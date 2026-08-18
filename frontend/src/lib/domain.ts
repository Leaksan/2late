/** Shipped UI/domain helpers — same rules as the Flask backend. */

import type {
  Announcement,
  CollectAccess,
  CourseNote,
  EvalState,
  Grade,
  RepeatKind,
  Role,
  ScheduleSlot,
  User,
} from "./types";
import { REPEAT_MS } from "./types";

export function weightedAverage(grades: Array<{ value: number; coef: number } | Grade>): number | null {
  if (grades.length === 0) return null;
  const coefs = grades.reduce((s, g) => s + g.coef, 0);
  if (coefs <= 0) return null;
  return grades.reduce((s, g) => s + g.value * g.coef, 0) / coefs;
}

export function foldAccents(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function syllabusMatches(fields: string[], query: string): boolean {
  const q = foldAccents(query.trim());
  if (!q) return true;
  return fields.some((f) => foldAccents(f).includes(q));
}

export function sortAnnouncementsToRead(list: Announcement[]): Announcement[] {
  return [...list].sort(
    (a, b) =>
      (a.priority === "URGENTE" ? 0 : 1) - (b.priority === "URGENTE" ? 0 : 1) ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function sortAnnouncementsSeen(
  list: Array<Announcement & { readAt?: string | null }>,
): Announcement[] {
  return [...list].sort(
    (a, b) => Date.parse(b.readAt || b.createdAt) - Date.parse(a.readAt || a.createdAt),
  );
}

export function isExpired(ann: { expiresAt?: string | null }, now = Date.now()): boolean {
  return !!ann.expiresAt && now >= Date.parse(ann.expiresAt);
}

export function isPublished(ann: { publishAt?: string | null }, now = Date.now()): boolean {
  return !ann.publishAt || now >= Date.parse(ann.publishAt);
}

export function isReadNow(
  ann: { repeat?: RepeatKind | null },
  readAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!readAt) return false;
  if (!ann.repeat) return true;
  return now - Date.parse(readAt) < REPEAT_MS[ann.repeat];
}

export function reliabilityBadge(pct: number | null, total: number): "Fiable" | "Contestée" | "Non notée" {
  if (pct !== null && pct >= 70) return "Fiable";
  if (total === 0) return "Non notée";
  return "Contestée";
}

export function canVoteOn(user: User, ann: { authorId: string; poles: string[] }, authorRole?: Role | null): boolean {
  if (user.role !== "ETUDIANT" && user.role !== "RELAIS") return false;
  if (ann.authorId === user.id) return false;
  if (authorRole !== "RELAIS") return false;
  return !!user.pole && ann.poles.includes(user.pole);
}

export function canSetUrgente(user: { role: Role }): boolean {
  return user.role === "PROF" || user.role === "ADMIN";
}

export function canDownloadCollect(user: User, ann: { authorId: string; collectAccess?: CollectAccess | null }): boolean {
  const access = ann.collectAccess ?? "PROF";
  if (user.role === "ADMIN") return true;
  if (user.id === ann.authorId) return true;
  if (access === "PROF" && user.role === "PROF") return true;
  if (access === "RELAIS" && (user.role === "PROF" || user.role === "RELAIS")) return true;
  return false;
}

export function isMentioned(user: { name: string }, body: string): boolean {
  if (/@tous\b/i.test(body)) return true;
  const first = user.name.trim().split(/\s+/)[0];
  if (!first) return false;
  const re = new RegExp(`@${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(body);
}

export function evalStateOf(
  slot: {
    evalPostponed?: boolean;
    evalOpen?: boolean | null;
    evalStartsAt?: string | null;
    evalMinutes?: number | null;
    hasEval?: boolean;
    evalGroups?: string[];
    evalUrl?: string | null;
  },
  now = Date.now(),
): EvalState {
  const has =
    slot.hasEval === true ||
    (slot.evalGroups && slot.evalGroups.length > 0) ||
    !!slot.evalUrl;
  if (!has) return "none";
  if (slot.evalPostponed || !(slot.evalOpen ?? true)) return "off";
  if (!slot.evalStartsAt || !slot.evalMinutes) return "plain";
  const start = Date.parse(slot.evalStartsAt);
  const end = start + slot.evalMinutes * 60_000;
  if (now < start) return "upcoming";
  if (now < end) return "open";
  return "ended";
}

export function evalAccessAllowed(slot: Parameters<typeof evalStateOf>[0], now = Date.now()): boolean {
  return evalStateOf(slot, now) === "open" || evalStateOf(slot, now) === "plain";
}

export function evalCountdownLabel(endsAt: number, now: number): string {
  const s = Math.max(0, Math.floor((endsAt - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function notesDueSoon(notes: CourseNote[], now = Date.now()): CourseNote[] {
  return notes
    .filter((n) => !n.done && n.dueAt)
    .filter((n) => {
      const left = Date.parse(n.dueAt!) - now;
      return left >= -3600_000 && left <= 48 * 3600_000;
    })
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!));
}

const WEEK_ORDER = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"] as const;

export function liveSlotOf(slots: ScheduleSlot[], now = new Date()): ScheduleSlot | undefined {
  const today = WEEK_ORDER[(now.getDay() + 6) % 7];
  const hhmm = now.toTimeString().slice(0, 5);
  return slots.find((s) => s.day === today && !s.coursePostponed && s.start <= hhmm && hhmm < s.end);
}

export function nextSlotOf(slots: ScheduleSlot[], now = new Date()): ScheduleSlot | undefined {
  const today = WEEK_ORDER[(now.getDay() + 6) % 7];
  const todayIdx = WEEK_ORDER.indexOf(today);
  const hhmm = now.toTimeString().slice(0, 5);
  const open = slots.filter((s) => !s.coursePostponed);
  return (
    open.find((s) => s.day === today && s.start > hhmm) ??
    open.find((s) => WEEK_ORDER.indexOf(s.day as (typeof WEEK_ORDER)[number]) > todayIdx) ??
    open[0] ??
    slots[0]
  );
}

export function formatExactSendTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

export function canModerateRoom(
  viewer: User,
  room: { id: string },
  target: User,
): boolean {
  if (viewer.id === target.id) return false;
  if (viewer.role === "ADMIN") return target.role !== "ADMIN";
  if (viewer.role === "RELAIS" && room.id === "general" && target.role === "ETUDIANT") {
    return target.pole === viewer.pole;
  }
  return false;
}

export function filterAdminAnnouncements<T extends { title: string; author?: { name?: string; role?: Role } | null }>(
  list: T[],
  query: string,
  roleFilter: Role | "ALL",
): T[] {
  const q = query.trim().toLowerCase();
  return list.filter((a) => {
    if (roleFilter !== "ALL" && a.author?.role !== roleFilter) return false;
    if (q && !a.title.toLowerCase().includes(q) && !(a.author?.name ?? "").toLowerCase().includes(q)) return false;
    return true;
  });
}

export function stripeColor(role: Role): string {
  if (role === "PROF") return "#7CB9FF";
  if (role === "RELAIS") return "#E5C100";
  if (role === "ADMIN") return "#B9A4FF";
  return "#2A3342";
}

export function avgColor(avg: number | null): string {
  if (avg == null) return "var(--muted)";
  if (avg >= 14) return "var(--green)";
  if (avg >= 10) return "var(--primary)";
  return "var(--red)";
}
