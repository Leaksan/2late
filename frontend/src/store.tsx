import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ADMIN_BUILD } from "./lib/admin";
import { apiGet, apiSend, apiUpload, getToken, setToken } from "./lib/api";
import { classifyError } from "./lib/errors";
import type {
  Announcement,
  ChatMessage,
  ChatRoom,
  CollectAccess,
  CourseNote,
  Grade,
  Milestone,
  NavBadges,
  Pole,
  ScheduleSlot,
  SyllabusDoc,
  User,
} from "./lib/types";

export type FeedCache = { toRead: Announcement[]; seen: Announcement[] };
export type ScheduleCache = { slots: ScheduleSlot[]; notes: CourseNote[]; canManage: boolean };

interface Store {
  ready: boolean;
  user: User | null;
  badges: NavBadges;
  milestones: Milestone[];
  myApplication: { id: string; status: string; createdAt: string } | null;
  feedCache: FeedCache | null;
  scheduleCache: ScheduleCache | null;
  offline: boolean;
  offlineBlocking: boolean;
  login(email: string, password: string): Promise<string | null>;
  adminLogin(username: string, password: string): Promise<string | null>;
  register(name: string, email: string, password: string, pole: Pole): Promise<string | null>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  refreshBadges(): Promise<void>;
  revalidate(): Promise<void>;
  feed(tab: "toRead" | "seen"): Promise<Announcement[]>;
  announcement(id: string): Promise<Announcement>;
  publish(input: Record<string, unknown>): Promise<string | null>;
  vote(id: string, value: 1 | -1): Promise<void>;
  comment(id: string, body: string): Promise<void>;
  rooms(): Promise<ChatRoom[]>;
  roomMessages(id: string): Promise<{ room: ChatRoom; messages: ChatMessage[]; participants: User[]; grantable: User[] }>;
  sendMessage(roomId: string, body: string, replyToId?: string): Promise<ChatMessage>;
  deleteMessage(id: string): Promise<void>;
  react(id: string, emoji: string): Promise<void>;
  setRoomAccess(roomId: string, userId: string, granted: boolean): Promise<string | null>;
  schedule(pole?: string): Promise<{ slots: ScheduleSlot[]; notes: CourseNote[]; dueSoon: CourseNote[]; subjects: any[]; canManage: boolean }>;
  openLink(slotId: string, kind: "visio" | "eval", group?: string): Promise<string>;
  upsertSlot(data: Record<string, unknown>): Promise<string | null>;
  updateSubject(sid: string, patch: Record<string, unknown>): Promise<string | null>;
  deleteSlot(id: string): Promise<void>;
  upsertNote(data: Partial<CourseNote> & { body: string; slotId: string }): Promise<string | null>;
  deleteNote(id: string): Promise<void>;
  syllabus(q?: string, sort?: string): Promise<SyllabusDoc[]>;
  uploadSyllabus(form: FormData): Promise<string | null>;
  deleteSyllabus(id: string): Promise<void>;
  grades(): Promise<{ grades: Grade[]; average: number | null }>;
  addGrade(input: { discipline: string; title: string; value: number; coef: number }): Promise<string | null>;
  deleteGrade(id: string): Promise<void>;
  submitFile(annId: string, file: File): Promise<string | null>;
  deleteSubmission(id: string): Promise<void>;
  setCollectAccess(id: string, access: CollectAccess): Promise<void>;
  setCollectEmail(id: string, email: string): Promise<string | null>;
  setWhatsapp(n: string): Promise<string | null>;
  applyRelais(message: string, whatsapp: string): Promise<string | null>;
  adminStats(): Promise<any>;
  adminAnnouncements(): Promise<Announcement[]>;
  adminMembers(): Promise<User[]>;
  adminApplications(): Promise<any[]>;
  adminComments(): Promise<any[]>;
  adminExport(): Promise<unknown>;
  decideApp(id: string, approve: boolean): Promise<void>;
  createStaff(name: string, email: string, password: string, role: "PROF" | "ADMIN"): Promise<string | null>;
  setDisabled(id: string, disabled: boolean): Promise<void>;
  setRelais(id: string, make: boolean): Promise<void>;
  resetLink(id: string): Promise<{ token: string; path: string }>;
  deleteUser(id: string): Promise<void>;
  deleteAnnouncement(id: string): Promise<void>;
  deleteComment(id: string): Promise<void>;
  setReliability(id: string, pct: number | null): Promise<void>;
  peekReset(token: string): Promise<{ valid: boolean; error?: string }>;
  consumeReset(token: string, password: string): Promise<string | null>;
}

const Ctx = createContext<Store | null>(null);

const emptyBadges: NavBadges = { toRead: 0, chatUnread: 0, mentionPending: false, pendingApplications: 0 };

function moveToSeen(cache: FeedCache, id: string): FeedCache {
  const item = cache.toRead.find((a) => a.id === id);
  if (!item) return cache;
  return {
    toRead: cache.toRead.filter((a) => a.id !== id),
    seen: [item, ...cache.seen.filter((a) => a.id !== id)],
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [badges, setBadges] = useState<NavBadges>(emptyBadges);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [myApplication, setMyApplication] = useState<Store["myApplication"]>(null);
  const [feedCache, setFeedCache] = useState<FeedCache | null>(null);
  const [scheduleCache, setScheduleCache] = useState<ScheduleCache | null>(null);
  const [offline, setOffline] = useState(false);
  const [offlineBlocking, setOfflineBlocking] = useState(false);
  const userRef = useRef<User | null>(null);
  const feedAt = useRef(0);
  const badgeFails = useRef(0);
  userRef.current = user;

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setBadges(emptyBadges);
    setFeedCache(null);
    setScheduleCache(null);
    setOfflineBlocking(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setOfflineBlocking(false);
      setReady(true);
      return;
    }
    try {
      const data = await apiGet("/api/bootstrap");
      setUser(data.user);
      setBadges(data.badges);
      setMilestones(data.milestones || []);
      setMyApplication(data.myApplication);
      if (data.feed?.toRead && data.feed?.seen) {
        setFeedCache({ toRead: data.feed.toRead, seen: data.feed.seen });
        feedAt.current = Date.now();
      }
      setOffline(false);
      setOfflineBlocking(false);
      badgeFails.current = 0;
    } catch (e) {
      const kind = classifyError(e);
      if (kind === "auth") {
        clearSession();
      } else {
        setOffline(true);
        if (!userRef.current) setOfflineBlocking(true);
      }
    } finally {
      setReady(true);
    }
  }, [clearSession]);

  const refreshBadges = useCallback(async () => {
    if (!getToken()) return;
    try {
      const b = await apiGet<NavBadges>("/api/nav");
      setBadges(b);
      badgeFails.current = 0;
      setOffline(false);
    } catch (e) {
      if (classifyError(e) === "auth") {
        clearSession();
        return;
      }
      badgeFails.current += 1;
      if (badgeFails.current >= 2) setOffline(true);
    }
  }, [clearSession]);

  const revalidate = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [toRead, seen, sched] = await Promise.all([
        apiGet("/api/feed?tab=toRead"),
        apiGet("/api/feed?tab=seen"),
        apiGet("/api/schedule"),
      ]);
      setFeedCache({ toRead: toRead.announcements, seen: seen.announcements });
      feedAt.current = Date.now();
      setScheduleCache({ slots: sched.slots, notes: sched.notes, canManage: sched.canManage });
      setOffline(false);
    } catch (e) {
      if (classifyError(e) === "auth") clearSession();
      else setOffline(true);
    }
  }, [clearSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => void refreshBadges(), 30_000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshBadges();
        void revalidate();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const onOff = () => setOffline(true);
    const onOn = () => {
      setOffline(false);
      void refreshBadges();
    };
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
    };
  }, [user, refreshBadges, revalidate]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const data = await apiSend("/api/auth/login", "POST", { email, password });
        setToken(data.token);
        await refresh();
        return null;
      } catch (e: any) {
        return e.message as string;
      }
    },
    [refresh],
  );

  // Interface d'administration : identifiant + mot de passe.
  const adminLogin = useCallback(
    async (username: string, password: string) => {
      try {
        const data = await apiSend("/api/admin/login", "POST", { username, password });
        setToken(data.token);
        await refresh();
        return null;
      } catch (e: any) {
        return e.message as string;
      }
    },
    [refresh],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, pole: Pole) => {
      try {
        const data = await apiSend("/api/auth/register", "POST", { name, email, password, pole });
        setToken(data.token);
        await refresh();
        return null;
      } catch (e: any) {
        return e.message as string;
      }
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await apiSend("/api/auth/logout", "POST");
    } catch {
      /* ignore */
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo<Store>(
    () => ({
      ready,
      user,
      login,
      adminLogin,
      badges,
      milestones,
      myApplication,
      feedCache,
      scheduleCache,
      offline,
      offlineBlocking,
      register,
      logout,
      refresh,
      refreshBadges,
      revalidate,
      feed: async (tab) => {
        const hot = feedCache && Date.now() - feedAt.current < 10_000;
        if (hot && feedCache) return feedCache[tab];
        const d = await apiGet(`/api/feed?tab=${tab}`);
        setFeedCache((c) => ({
          toRead: tab === "toRead" ? d.announcements : (c?.toRead ?? []),
          seen: tab === "seen" ? d.announcements : (c?.seen ?? []),
        }));
        feedAt.current = Date.now();
        return d.announcements as Announcement[];
      },
      announcement: async (id) => {
        const data = await apiGet<Announcement>(`/api/announcements/${id}`);
        const unread = feedCache?.toRead.some((a) => a.id === id);
        if (unread) {
          setFeedCache((c) => (c ? moveToSeen(c, id) : c));
          setBadges((b) => ({ ...b, toRead: Math.max(0, b.toRead - 1) }));
        }
        return data;
      },
      publish: async (input) => {
        try {
          await apiSend("/api/announcements", "POST", input);
          await refresh();
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      vote: async (id, value) => {
        await apiSend(`/api/announcements/${id}/vote`, "POST", { value });
      },
      comment: async (id, body) => {
        await apiSend(`/api/announcements/${id}/comments`, "POST", { body });
      },
      rooms: () => apiGet("/api/rooms").then((d) => d.rooms),
      roomMessages: (id) => apiGet(`/api/rooms/${id}/messages`),
      sendMessage: (roomId, body, replyToId) =>
        apiSend<ChatMessage>(`/api/rooms/${roomId}/messages`, "POST", { body, replyToId }),
      deleteMessage: async (id) => {
        await apiSend(`/api/messages/${id}/delete`, "POST");
      },
      react: async (id, emoji) => {
        await apiSend(`/api/messages/${id}/react`, "POST", { emoji });
      },
      setRoomAccess: async (roomId, userId, granted) => {
        try {
          await apiSend(`/api/rooms/${roomId}/access`, "POST", { userId, granted });
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      schedule: async (pole) => {
        const data = await apiGet(`/api/schedule${pole ? `?pole=${pole}` : ""}`);
        setScheduleCache({ slots: data.slots, notes: data.notes, canManage: data.canManage });
        return data;
      },
      openLink: (slotId, kind, group) =>
        apiGet(`/api/schedule/${slotId}/open?kind=${kind}${group ? `&group=${encodeURIComponent(group)}` : ""}`).then((d) => d.url),
      upsertSlot: async (data) => {
        try {
          await apiSend("/api/schedule", "POST", data);
          return null;
        } catch (e: any) {
          return e.message;
        }
      },

      updateSubject: async (sid, patch) => {
        try {
          await apiSend(`/api/subjects/${sid}`, "PATCH", patch);
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      deleteSlot: async (id) => {
        await apiSend(`/api/schedule/${id}`, "DELETE");
      },
      upsertNote: async (data) => {
        try {
          await apiSend("/api/notes", "POST", data);
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      deleteNote: async (id) => {
        await apiSend(`/api/notes/${id}`, "DELETE");
      },
      syllabus: (q, sort) =>
        apiGet(`/api/syllabus?q=${encodeURIComponent(q || "")}&sort=${sort || "recent"}`).then((d) => d.docs),
      uploadSyllabus: async (form) => {
        try {
          await apiUpload("/api/syllabus", form);
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      deleteSyllabus: async (id) => {
        await apiSend(`/api/syllabus/${id}`, "DELETE");
      },
      grades: () => apiGet("/api/grades"),
      addGrade: async (input) => {
        try {
          await apiSend("/api/grades", "POST", input);
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      deleteGrade: async (id) => {
        await apiSend(`/api/grades/${id}`, "DELETE");
      },
      submitFile: async (annId, file) => {
        try {
          const form = new FormData();
          form.append("file", file);
          await apiUpload(`/api/announcements/${annId}/submissions`, form);
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      deleteSubmission: async (id) => {
        await apiSend(`/api/submissions/${id}`, "DELETE");
      },
      setCollectAccess: async (id, access) => {
        await apiSend(`/api/announcements/${id}/collect-access`, "POST", { access });
      },
      setCollectEmail: async (id, email) => {
        try {
          await apiSend(`/api/announcements/${id}/collect-email`, "POST", { email });
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      setWhatsapp: async (n) => {
        try {
          await apiSend("/api/me/whatsapp", "POST", { whatsapp: n });
          await refresh();
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      applyRelais: async (message, whatsapp) => {
        try {
          await apiSend("/api/relais/apply", "POST", { message, whatsapp });
          await refresh();
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      adminStats: () => apiGet("/api/admin/stats"),
      adminAnnouncements: () => apiGet("/api/admin/announcements").then((d) => d.announcements),
      adminMembers: () => apiGet("/api/admin/members").then((d) => d.members),
      adminApplications: () => apiGet("/api/admin/applications").then((d) => d.applications),
      adminComments: () => apiGet("/api/admin/comments").then((d) => d.comments),
      adminExport: () => apiGet("/api/admin/export"),
      decideApp: async (id, approve) => {
        await apiSend("/api/relais/decide", "POST", { applicationId: id, approve });
        await refresh();
      },
      createStaff: async (name, email, password, role) => {
        try {
          await apiSend("/api/admin/users", "POST", { name, email, password, role });
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
      setDisabled: async (id, disabled) => {
        await apiSend(`/api/admin/users/${id}/disabled`, "POST", { disabled });
      },
      setRelais: async (id, make) => {
        await apiSend(`/api/admin/users/${id}/relais`, "POST", { makeRelais: make });
      },
      resetLink: (id) => apiSend(`/api/admin/users/${id}/reset-link`, "POST"),
      deleteUser: async (id) => {
        await apiSend(`/api/admin/users/${id}`, "DELETE");
      },
      deleteAnnouncement: async (id) => {
        await apiSend(`/api/announcements/${id}`, "DELETE");
      },
      deleteComment: async (id) => {
        await apiSend(`/api/comments/${id}`, "DELETE");
      },
      setReliability: async (id, pct) => {
        await apiSend(`/api/announcements/${id}/reliability`, "POST", { pct });
      },
      peekReset: (token) => apiGet(`/api/auth/reset/${token}`),
      consumeReset: async (token, password) => {
        try {
          await apiSend("/api/auth/reset/consume", "POST", { token, password });
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
    }),
    [
      ready,
      user,
      badges,
      milestones,
      myApplication,
      feedCache,
      scheduleCache,
      offline,
      offlineBlocking,
      login,
      adminLogin,
      register,
      logout,
      refresh,
      refreshBadges,
      revalidate,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within StoreProvider");
  return s;
}
