import { describe, expect, it } from "vitest";
import {
  canDownloadCollect,
  canSetUrgente,
  canVoteOn,
  evalAccessAllowed,
  evalStateOf,
  foldAccents,
  isMentioned,
  canModerateRoom,
  filterAdminAnnouncements,
  formatExactSendTime,
  isPublished,
  liveSlotOf,
  nextSlotOf,
  notesDueSoon,
  reliabilityBadge,
  sortAnnouncementsToRead,
  syllabusMatches,
  weightedAverage,
} from "./domain";
import type { Announcement, CourseNote, ScheduleSlot, User } from "./types";

const etu: User = {
  id: "u-etu",
  name: "Compte Étudiant Démo",
  email: "etu@2late.com",
  role: "ETUDIANT",
  pole: "STI",
  createdAt: "t",
};

function ann(partial: Partial<Announcement> & Pick<Announcement, "id" | "authorId" | "priority" | "createdAt">): Announcement {
  return {
    title: "x",
    type: "GENERALE",
    poles: ["STI"],
    reliability: { up: 0, down: 0, total: 0, pct: null, overridden: false },
    links: [],
    commentCount: 0,
    submissionCount: 0,
    ...partial,
  };
}

describe("weightedAverage", () => {
  it("computes coefficient-weighted mean and null on empty/zero", () => {
    expect(weightedAverage([])).toBeNull();
    expect(weightedAverage([{ value: 10, coef: 0 }])).toBeNull();
    expect(weightedAverage([
      { value: 14, coef: 2 },
      { value: 16, coef: 1 },
      { value: 11.5, coef: 1 },
    ])).toBeCloseTo(13.875);
  });
});

describe("sortAnnouncementsToRead", () => {
  it("puts URGENTE first then newest", () => {
    const list = [
      ann({ id: "n", authorId: "p", priority: "NORMALE", createdAt: "2026-01-03T00:00:00Z" }),
      ann({ id: "u-old", authorId: "p", priority: "URGENTE", createdAt: "2026-01-01T00:00:00Z" }),
      ann({ id: "u-new", authorId: "p", priority: "URGENTE", createdAt: "2026-01-02T00:00:00Z" }),
    ];
    expect(sortAnnouncementsToRead(list).map((a) => a.id)).toEqual(["u-new", "u-old", "n"]);
  });
});

describe("eval window", () => {
  const now = Date.parse("2026-06-01T12:00:00Z");
  it("blocks before start and after duration, allows during", () => {
    const slot = {
      hasEval: true,
      evalOpen: true,
      evalStartsAt: "2026-06-01T12:00:00Z",
      evalMinutes: 60,
    };
    expect(evalStateOf(slot, now - 1)).toBe("upcoming");
    expect(evalAccessAllowed(slot, now - 1)).toBe(false);
    expect(evalStateOf(slot, now + 1000)).toBe("open");
    expect(evalAccessAllowed(slot, now + 1000)).toBe(true);
    expect(evalStateOf(slot, now + 60 * 60_000)).toBe("ended");
    expect(evalAccessAllowed(slot, now + 60 * 60_000)).toBe(false);
  });
});

describe("canDownloadCollect", () => {
  const base = { authorId: "u-prof", collectAccess: "AUTHOR" as const };
  it("author and admin always, RELAIS only when access is RELAIS", () => {
    const admin: User = { ...etu, id: "a", role: "ADMIN", pole: undefined };
    const prof: User = { ...etu, id: "u-prof", role: "PROF", pole: undefined };
    const relais: User = { ...etu, id: "u-marc", role: "RELAIS" };
    expect(canDownloadCollect(admin, base)).toBe(true);
    expect(canDownloadCollect(prof, base)).toBe(true);
    expect(canDownloadCollect(relais, base)).toBe(false);
    expect(canDownloadCollect(relais, { ...base, collectAccess: "RELAIS" })).toBe(true);
    expect(canDownloadCollect(etu, { ...base, collectAccess: "RELAIS" })).toBe(false);
  });
});

describe("isMentioned", () => {
  it("matches first name and @tous", () => {
    expect(isMentioned({ name: "Arnaud Bilie" }, "@Arnaud on se voit")).toBe(true);
    expect(isMentioned({ name: "Arnaud Bilie" }, "coucou @tous")).toBe(true);
    expect(isMentioned({ name: "Arnaud Bilie" }, "personne")).toBe(false);
  });
});

describe("authz helpers", () => {
  it("students cannot set URGENTE; cannot vote own or PROF", () => {
    expect(canSetUrgente(etu)).toBe(false);
    expect(canSetUrgente({ ...etu, role: "PROF" })).toBe(true);
    expect(canVoteOn(etu, { authorId: "u-etu", poles: ["STI"] }, "RELAIS")).toBe(false);
    expect(canVoteOn(etu, { authorId: "u-prof", poles: ["STI"] }, "PROF")).toBe(false);
    expect(canVoteOn(etu, { authorId: "u-marc", poles: ["STI"] }, "RELAIS")).toBe(true);
  });
});

describe("syllabus search + notes", () => {
  it("ignores accents", () => {
    expect(foldAccents("Évaluation")).toBe(foldAccents("evaluation"));
    expect(syllabusMatches(["Évaluation d’Algorithmique"], "evaluation")).toBe(true);
  });
  it("surfaces notes under 48h", () => {
    const now = Date.parse("2026-06-01T12:00:00Z");
    const notes: CourseNote[] = [
      { id: "1", userId: "u", slotId: "s", body: "soon", done: false, dueAt: "2026-06-02T10:00:00Z", createdAt: "t" },
      { id: "2", userId: "u", slotId: "s", body: "far", done: false, dueAt: "2026-06-10T10:00:00Z", createdAt: "t" },
    ];
    expect(notesDueSoon(notes, now).map((n) => n.id)).toEqual(["1"]);
  });
});

describe("isPublished", () => {
  it("hides future publishAt", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(isPublished({ publishAt: "2026-01-01T02:00:00Z" }, now)).toBe(false);
    expect(isPublished({ publishAt: null }, now)).toBe(true);
  });
});

function slot(partial: Partial<ScheduleSlot> & Pick<ScheduleSlot, "id" | "day" | "start" | "end">): ScheduleSlot {
  return {
    pole: "STI",
    discipline: partial.discipline || partial.id,
    teacherName: "Pr. X",
    hasVisio: false,
    hasEval: false,
    evalGroups: [],
    evalState: "none",
    visioOpen: true,
    evalOpen: true,
    coursePostponed: false,
    evalPostponed: false,
    createdAt: "t",
    ...partial,
  };
}

describe("nextSlotOf / liveSlotOf", () => {
  it("picks live now, then next later today, skipping postponed", () => {
    const now = new Date("2026-06-01T10:30:00"); // Monday
    expect(now.getDay()).toBe(1);
    const live = slot({ id: "live", day: "LUNDI", start: "10:00", end: "12:00", discipline: "En cours" });
    const later = slot({ id: "later", day: "LUNDI", start: "16:00", end: "18:00", discipline: "Après" });
    const postponed = slot({ id: "pp", day: "LUNDI", start: "14:00", end: "15:00", coursePostponed: true, discipline: "Reporté" });
    const tuesday = slot({ id: "tue", day: "MARDI", start: "08:00", end: "10:00", discipline: "Demain" });
    expect(liveSlotOf([live, later], now)?.id).toBe("live");
    expect(nextSlotOf([later, postponed, tuesday], now)?.id).toBe("later");
    expect(nextSlotOf([postponed, tuesday], now)?.id).toBe("tue");
  });
});

describe("formatExactSendTime", () => {
  it("prints calendar date and clock, not a relative ago phrase", () => {
    const label = formatExactSendTime("2026-06-01T14:35:00Z");
    expect(label).toMatch(/à/);
    expect(label).not.toMatch(/il y a/);
    expect(label).toMatch(/\d/);
    expect(label.toLowerCase()).toMatch(/juin|june|1/);
  });
});

describe("canModerateRoom", () => {
  const admin: User = { ...etu, id: "u-admin", role: "ADMIN", pole: undefined };
  const marc: User = { ...etu, id: "u-marc", role: "RELAIS", pole: "STI" };
  const sophie: User = { ...etu, id: "u-sophie", role: "ETUDIANT", pole: "SVT" };
  it("admin can grant/revoke anyone except other admins; relais only général + same pole students", () => {
    expect(canModerateRoom(admin, { id: "general" }, etu)).toBe(true);
    expect(canModerateRoom(admin, { id: "staff" }, { ...admin, id: "u-admin-2" })).toBe(false);
    expect(canModerateRoom(marc, { id: "general" }, etu)).toBe(true);
    expect(canModerateRoom(marc, { id: "general" }, sophie)).toBe(false);
    expect(canModerateRoom(marc, { id: "pole-STI" }, etu)).toBe(false);
    expect(canModerateRoom(etu, { id: "general" }, sophie)).toBe(false);
  });
});

describe("filterAdminAnnouncements", () => {
  it("filters by title/author and author role — used by AdminScreen", () => {
    const list = [
      ann({ id: "a1", authorId: "p", title: "Examen algo", priority: "URGENTE", createdAt: "t", author: { ...etu, role: "PROF", name: "Pr. Pierre" } }),
      ann({ id: "a3", authorId: "m", title: "Report visio", priority: "NORMALE", createdAt: "t", author: { ...etu, id: "m", role: "RELAIS", name: "Marc Obame" } }),
    ];
    expect(filterAdminAnnouncements(list, "visio", "ALL").map((a) => a.id)).toEqual(["a3"]);
    expect(filterAdminAnnouncements(list, "", "RELAIS").map((a) => a.id)).toEqual(["a3"]);
    expect(filterAdminAnnouncements(list, "pierre", "PROF").map((a) => a.id)).toEqual(["a1"]);
  });
});
