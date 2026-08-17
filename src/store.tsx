import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Announcement, CollectAccess, Comment, CourseNote, DB, Grade, Milestone, Pole, RepeatKind, ScheduleSlot, SyllabusDoc, Submission, User, Vote } from './types';
import { isExpired, isReadNow, loadDB, resetDB, saveDB } from './data/db';
import { canModerateRoom, defaultRoomAccess, roomById } from './data/chat';
import { deleteFile, putFile } from './data/files';
import { uid } from './utils';

const SESSION_KEY = '2late.session';
const SYLLABUS_MAX_BYTES = 20 * 1024 * 1024;
const SUBMISSION_MAX_BYTES = 20 * 1024 * 1024;

interface Store {
  db: DB;
  user: User | null;
  login(email: string, password: string): string | null;
  register(name: string, email: string, password: string, pole: Pole): string | null;
  logout(): void;
  publish(input: { title: string; type: Announcement['type']; description?: string; poles: Pole[]; priority: Announcement['priority']; links?: Announcement['links']; expiresAt?: string | null; collectAccess?: CollectAccess; collectEmail?: string | null; publishAt?: string | null; repeat?: RepeatKind | null }): string | null;
  markRead(announcementId: string): void;
  vote(announcementId: string, value: 1 | -1): void;
  addComment(announcementId: string, body: string): void;
  applyRelais(message: string, whatsapp: string): string | null;
  decideApplication(applicationId: string, approve: boolean): void;
  createProf(name: string, email: string, password: string, role?: 'PROF' | 'ADMIN'): string | null;
  deleteAnnouncement(announcementId: string): void;
  deleteComment(commentId: string): void;
  deleteUser(userId: string): void;
  setUserDisabled(userId: string, disabled: boolean): void;
  setRelaisStatus(userId: string, makeRelais: boolean): void;
  setReliability(announcementId: string, pct: number | null): void;
  createResetLink(userId: string): string;
  consumeResetToken(token: string, newPassword: string): string | null;
  sendChatMessage(roomId: string, body: string, replyToId?: string): string | null;
  softDeleteChatMessage(messageId: string): void;
  toggleChatReaction(messageId: string, emoji: string): void;
  markRoomVisited(roomId: string): void;
  setRoomAccess(roomId: string, userId: string, granted: boolean): string | null;
  upsertScheduleSlot(slot: ScheduleSlot): void;
  deleteScheduleSlot(slotId: string): void;
  upsertMilestone(m: Milestone): void;
  deleteMilestone(id: string): void;
  resetMilestoneReached(id: string): void;
  upsertCourseNote(note: CourseNote): void;
  deleteCourseNote(id: string): void;
  addSyllabusDoc(input: { title: string; description?: string; poles: Pole[]; discipline?: string; file: File }): Promise<string | null>;
  deleteSyllabusDoc(id: string): void;
  addGrade(input: { discipline: string; title: string; value: number; coef: number }): string | null;
  deleteGrade(id: string): void;
  submitToAnnouncement(announcementId: string, file: File): Promise<string | null>;
  deleteSubmission(id: string): void;
  setCollectAccess(announcementId: string, access: CollectAccess): void;
  setCollectEmail(announcementId: string, email: string): string | null;
  setWhatsapp(number: string): string | null;
  resetDemoData(): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDB] = useState<DB>(() => loadDB());
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));

  const user = useMemo(() => db.users.find(u => u.id === userId) ?? null, [db.users, userId]);

  const mutate = useCallback((fn: (draft: DB) => void) => {
    setDB(prev => {
      const draft: DB = JSON.parse(JSON.stringify(prev));
      fn(draft);
      saveDB(draft);
      return draft;
    });
  }, []);

  const login = useCallback((email: string, password: string): string | null => {
    const u = db.users.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) return 'E-mail ou mot de passe incorrect.';
    if (u.disabled) return 'Ce compte a été désactivé par l’administration.';
    localStorage.setItem(SESSION_KEY, u.id);
    setUserId(u.id);
    return null;
  }, [db.users]);

  const register = useCallback((name: string, email: string, password: string, pole: Pole): string | null => {
    const clean = email.trim().toLowerCase();
    if (!name.trim()) return 'Veuillez saisir votre nom.';
    if (!/^\S+@\S+\.\S+$/.test(clean)) return 'Adresse e-mail invalide.';
    if (password.length < 4) return 'Mot de passe : 4 caractères minimum.';
    if (db.users.some(x => x.email.toLowerCase() === clean)) return 'Un compte existe déjà avec cet e-mail.';
    const newUser: User = {
      id: uid('u'),
      name: name.trim(),
      email: clean,
      password,
      role: 'ETUDIANT',
      pole,
      createdAt: new Date().toISOString()
    };
    mutate(d => {
      d.users.push(newUser);
      const count = d.users.length;
      const now = new Date().toISOString();
      for (const m of d.milestones) {
        if (!m.reachedAt && count >= m.threshold) m.reachedAt = now;
      }
    });
    localStorage.setItem(SESSION_KEY, newUser.id);
    setUserId(newUser.id);
    return null;
  }, [db.users, mutate]);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUserId(null);
  }, []);

  const publish = useCallback((input: { title: string; type: Announcement['type']; description?: string; poles: Pole[]; priority: Announcement['priority']; links?: Announcement['links']; expiresAt?: string | null; collectAccess?: CollectAccess; collectEmail?: string | null; publishAt?: string | null; repeat?: RepeatKind | null }): string | null => {
    if (!user) return 'Session expirée.';
    if (!input.title.trim()) return 'Le titre est obligatoire.';
    if (input.poles.length === 0) return 'Sélectionnez au moins un pôle cible.';
    if (input.priority === 'URGENTE' && user.role !== 'PROF' && user.role !== 'ADMIN') return 'Priorité urgente réservée aux professeurs et à l’administration.';
    const links = (input.links ?? []).filter(l => l.label.trim() && l.url.trim());
    if (links.some(l => !/^https?:\/\/.+\..+/.test(l.url.trim()))) return 'Liens invalides : ils doivent commencer par http(s)://';
    const collectEmail = input.collectEmail?.trim() ?? '';
    if (collectEmail && !/^\S+@\S+\.\S+$/.test(collectEmail)) return 'Adresse e-mail de réception invalide.';
    const id = uid('a');
    mutate(d => {
      d.announcements.push({
        id,
        authorId: user.id,
        title: input.title.trim(),
        type: input.type,
        description: input.description?.trim() || undefined,
        poles: input.poles,
        priority: input.priority,
        links: links.length ? links : undefined,
        expiresAt: input.expiresAt ?? null,
        collectAccess: input.type === 'PARTICIPATIVE' ? (input.collectAccess ?? 'PROF') : undefined,
        collectEmail: input.type === 'PARTICIPATIVE' && collectEmail ? collectEmail : null,
        publishAt: input.publishAt ?? null,
        repeat: input.repeat ?? null,
        createdAt: new Date().toISOString()
      });
    });
    return null;
  }, [user, mutate]);

  const markRead = useCallback((announcementId: string) => {
    if (!user) return;
    const ann = db.announcements.find(a => a.id === announcementId);
    // Annonce répétée dont le cycle est écoulé : on rafraîchit la date de lecture.
    if (ann && isReadNow(db, ann, user.id)) return;
    mutate(d => {
      const existing = d.reads.find(r => r.announcementId === announcementId && r.userId === user.id);
      if (existing) existing.readAt = new Date().toISOString();
      else d.reads.push({ announcementId, userId: user.id, readAt: new Date().toISOString() });
    });
  }, [user, db, mutate]);

  const vote = useCallback((announcementId: string, value: 1 | -1) => {
    if (!user) return;
    mutate(d => {
      const existing = d.votes.find(v => v.announcementId === announcementId && v.userId === user.id);
      if (existing) {
        if (existing.value === value) {
          d.votes = d.votes.filter(v => v.id !== existing.id);
        } else {
          existing.value = value;
        }
      } else {
        const v: Vote = { id: uid('v'), announcementId, userId: user.id, value, createdAt: new Date().toISOString() };
        d.votes.push(v);
      }
    });
  }, [user, mutate]);

  const addComment = useCallback((announcementId: string, body: string) => {
    if (!user || !body.trim()) return;
    mutate(d => {
      d.comments.push({ id: uid('c'), announcementId, authorId: user.id, body: body.trim(), createdAt: new Date().toISOString() });
    });
  }, [user, mutate]);

  const applyRelais = useCallback((message: string, whatsapp: string): string | null => {
    if (!user) return 'Session expirée.';
    const msg = message.trim();
    const wa = whatsapp.trim();
    if (msg.length < 10) return 'Expliquez votre motivation en quelques mots (10 caractères minimum).';
    if (wa.replace(/\D/g, '').length < 8) return 'Numéro WhatsApp invalide (indicatif inclus, ex. +241 06 12 34 56).';
    let err: string | null = null;
    mutate(d => {
      if (d.applications.some(a => a.userId === user.id && a.status === 'PENDING')) {
        err = 'Une candidature est déjà en attente de validation.';
        return;
      }
      d.applications.push({
        id: uid('app'),
        userId: user.id,
        status: 'PENDING',
        message: msg,
        whatsapp: wa,
        createdAt: new Date().toISOString()
      });
    });
    return err;
  }, [user, mutate]);

  const decideApplication = useCallback((applicationId: string, approve: boolean) => {
    mutate(d => {
      const app = d.applications.find(a => a.id === applicationId);
      if (!app || app.status !== 'PENDING') return;
      app.status = approve ? 'APPROVED' : 'REFUSED';
      app.decidedAt = new Date().toISOString();
      if (approve) {
        const target = d.users.find(u => u.id === app.userId);
        if (target) target.role = 'RELAIS';
      }
    });
  }, [mutate]);

  const createProf = useCallback((name: string, email: string, password: string, role: 'PROF' | 'ADMIN' = 'PROF'): string | null => {
    const clean = email.trim().toLowerCase();
    if (!name.trim()) return 'Nom du professeur requis.';
    if (!/^\S+@\S+\.\S+$/.test(clean)) return 'Adresse e-mail invalide.';
    if (password.length < 4) return 'Mot de passe : 4 caractères minimum.';
    if (db.users.some(x => x.email.toLowerCase() === clean)) return 'Un compte existe déjà avec cet e-mail.';
    mutate(d => {
      d.users.push({ id: uid('u'), name: name.trim(), email: clean, password, role, createdAt: new Date().toISOString() });
    });
    return null;
  }, [db.users, mutate]);

  const deleteAnnouncement = useCallback((announcementId: string) => {
    mutate(d => {
      d.announcements = d.announcements.filter(a => a.id !== announcementId);
      d.votes = d.votes.filter(v => v.announcementId !== announcementId);
      d.reads = d.reads.filter(r => r.announcementId !== announcementId);
      d.comments = d.comments.filter(c => c.announcementId !== announcementId);
    });
  }, [mutate]);

  const deleteComment = useCallback((commentId: string) => {
    mutate(d => {
      d.comments = d.comments.filter(c => c.id !== commentId);
    });
  }, [mutate]);

  const deleteUser = useCallback((targetId: string) => {
    if (!user || targetId === user.id) return;
    mutate(d => {
      const annIds = d.announcements.filter(a => a.authorId === targetId).map(a => a.id);
      d.users = d.users.filter(u => u.id !== targetId);
      d.announcements = d.announcements.filter(a => a.authorId !== targetId);
      d.votes = d.votes.filter(v => v.userId !== targetId && !annIds.includes(v.announcementId));
      d.comments = d.comments.filter(c => c.authorId !== targetId && !annIds.includes(c.announcementId));
      d.reads = d.reads.filter(r => r.userId !== targetId && !annIds.includes(r.announcementId));
      d.applications = d.applications.filter(a => a.userId !== targetId);
    });
  }, [user, mutate]);

  const setUserDisabled = useCallback((targetId: string, disabled: boolean) => {
    if (!user || targetId === user.id) return;
    mutate(d => {
      const target = d.users.find(u => u.id === targetId);
      if (target) target.disabled = disabled;
    });
  }, [user, mutate]);

  const setRelaisStatus = useCallback((targetId: string, makeRelais: boolean) => {
    mutate(d => {
      const target = d.users.find(u => u.id === targetId);
      if (!target) return;
      if (makeRelais && target.role === 'ETUDIANT') {
        target.role = 'RELAIS';
        d.applications = d.applications.filter(a => !(a.userId === targetId && a.status === 'PENDING'));
      }
      if (!makeRelais && target.role === 'RELAIS') {
        target.role = 'ETUDIANT';
      }
    });
  }, [mutate]);

  const setReliability = useCallback((announcementId: string, pct: number | null) => {
    mutate(d => {
      const ann = d.announcements.find(a => a.id === announcementId);
      if (ann) ann.reliabilityOverride = pct;
    });
  }, [mutate]);

  const createResetLink = useCallback((targetId: string): string => {
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const now = Date.now();
    mutate(d => {
      d.resetTokens = d.resetTokens.filter(t => t.usedAt || t.userId !== targetId);
      d.resetTokens.push({
        token,
        userId: targetId,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 24 * 3600_000).toISOString()
      });
    });
    return `${window.location.origin}${window.location.pathname}#/reset/${token}`;
  }, [mutate]);

  const consumeResetToken = useCallback((token: string, newPassword: string): string | null => {
    const rec = db.resetTokens.find(t => t.token === token);
    if (!rec || !db.users.some(u => u.id === rec.userId)) return 'Lien invalide ou compte supprimé.';
    if (rec.usedAt) return 'Ce lien a déjà été utilisé. Demandez-en un nouveau.';
    if (Date.now() >= Date.parse(rec.expiresAt)) return 'Ce lien a expiré. Demandez-en un nouveau.';
    if (newPassword.length < 4) return 'Mot de passe : 4 caractères minimum.';
    mutate(d => {
      const t = d.resetTokens.find(x => x.token === token);
      const u = d.users.find(x => x.id === rec.userId);
      if (t && u) {
        u.password = newPassword;
        t.usedAt = new Date().toISOString();
      }
    });
    return null;
  }, [db, mutate]);

  const sendChatMessage = useCallback((roomId: string, body: string, replyToId?: string): string | null => {
    if (!user) return 'Session expirée.';
    const msg = body.trim();
    if (!msg) return 'Message vide.';
    mutate(d => {
      d.chatMessages.push({
        id: uid('m'),
        roomId,
        authorId: user.id,
        body: msg,
        replyToId,
        createdAt: new Date().toISOString()
      });
    });
    return null;
  }, [user, mutate]);

  const softDeleteChatMessage = useCallback((messageId: string) => {
    mutate(d => {
      const m = d.chatMessages.find(x => x.id === messageId);
      if (m) m.deleted = true;
    });
  }, [mutate]);

  const toggleChatReaction = useCallback((messageId: string, emoji: string) => {
    if (!user) return;
    mutate(d => {
      const m = d.chatMessages.find(x => x.id === messageId);
      if (!m || m.deleted) return;
      m.reactions ??= [];
      const already = m.reactions.find(x => x.emoji === emoji && x.userIds.includes(user.id));
      for (const r of m.reactions) r.userIds = r.userIds.filter(id => id !== user.id);
      m.reactions = m.reactions.filter(r => r.userIds.length > 0);
      if (!already) m.reactions.push({ emoji, userIds: [user.id] });
    });
  }, [user, mutate]);

  const markRoomVisited = useCallback((roomId: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    mutate(d => {
      const v = d.chatVisits.find(x => x.userId === user.id && x.roomId === roomId);
      if (v) v.at = now;
      else d.chatVisits.push({ userId: user.id, roomId, at: now });
    });
  }, [user, mutate]);

  const setRoomAccess = useCallback((roomId: string, targetId: string, granted: boolean): string | null => {
    if (!user) return 'Session expirée.';
    const room = roomById(roomId);
    const target = db.users.find(u => u.id === targetId);
    if (!room || !target) return 'Salon ou utilisateur introuvable.';
    if (!canModerateRoom(user, room, target)) return 'Vous n’avez pas la permission de gérer cet accès.';
    mutate(d => {
      d.roomAccess = d.roomAccess.filter(r => !(r.userId === targetId && r.roomId === roomId));
      if (defaultRoomAccess(target, room) !== granted) {
        d.roomAccess.push({ userId: targetId, roomId, decision: granted ? 'GRANTED' : 'REVOKED', byId: user.id, at: new Date().toISOString() });
      }
    });
    return null;
  }, [user, db.users, mutate]);

  const upsertScheduleSlot = useCallback((slot: ScheduleSlot) => {
    mutate(d => {
      const i = d.scheduleSlots.findIndex(s => s.id === slot.id);
      if (i >= 0) d.scheduleSlots[i] = slot;
      else d.scheduleSlots.push(slot);

      const subj = d.subjects.find(s => s.pole === slot.pole && s.discipline === slot.discipline);
      const info = {
        teacherName: slot.teacherName,
        room: slot.room,
        visioUrl: slot.visioUrl,
        evalUrl: slot.evalUrl
      };
      if (subj) Object.assign(subj, info);
      else d.subjects.push({ id: uid('sub'), pole: slot.pole, discipline: slot.discipline, ...info });
    });
  }, [mutate]);

  const deleteScheduleSlot = useCallback((slotId: string) => {
    mutate(d => {
      d.scheduleSlots = d.scheduleSlots.filter(s => s.id !== slotId);
    });
  }, [mutate]);

  const upsertMilestone = useCallback((m: Milestone) => {
    mutate(d => {
      const i = d.milestones.findIndex(x => x.id === m.id);
      if (i >= 0) d.milestones[i] = m;
      else d.milestones.push(m);
      d.milestones.sort((a, b) => a.threshold - b.threshold);
    });
  }, [mutate]);

  const deleteMilestone = useCallback((id: string) => {
    mutate(d => {
      d.milestones = d.milestones.filter(m => m.id !== id);
    });
  }, [mutate]);

  const resetMilestoneReached = useCallback((id: string) => {
    mutate(d => {
      const m = d.milestones.find(x => x.id === id);
      if (m) delete m.reachedAt;
    });
  }, [mutate]);

  const upsertCourseNote = useCallback((note: CourseNote) => {
    mutate(d => {
      const i = d.courseNotes.findIndex(n => n.id === note.id);
      if (i >= 0) d.courseNotes[i] = note;
      else d.courseNotes.push(note);
    });
  }, [mutate]);

  const deleteCourseNote = useCallback((id: string) => {
    mutate(d => {
      d.courseNotes = d.courseNotes.filter(n => n.id !== id);
    });
  }, [mutate]);

  const addSyllabusDoc = useCallback(async (input: { title: string; description?: string; poles: Pole[]; discipline?: string; file: File }): Promise<string | null> => {
    if (!user) return 'Session expirée.';
    if (user.role !== 'PROF' && user.role !== 'RELAIS' && user.role !== 'ADMIN') return 'Seuls les enseignants, relais et l’administration peuvent déposer un document.';
    if (!input.title.trim()) return 'Le titre est obligatoire.';
    if (input.poles.length === 0) return 'Sélectionnez au moins un pôle cible.';
    if (!input.file) return 'Choisissez un fichier à déposer.';
    if (input.file.size > SYLLABUS_MAX_BYTES) return 'Fichier trop volumineux : 20 Mo maximum.';
    const id = uid('doc');
    await putFile(id, input.file);
    mutate(d => {
      d.syllabusDocs.push({
        id,
        authorId: user.id,
        title: input.title.trim(),
        description: input.description?.trim() || undefined,
        poles: input.poles,
        discipline: input.discipline?.trim() || undefined,
        fileName: input.file.name,
        fileType: input.file.type || 'application/octet-stream',
        fileSize: input.file.size,
        createdAt: new Date().toISOString()
      });
    });
    return null;
  }, [user, mutate]);

  const deleteSyllabusDoc = useCallback((id: string) => {
    mutate(d => {
      d.syllabusDocs = d.syllabusDocs.filter(doc => doc.id !== id);
    });
    void deleteFile(id).catch(() => undefined);
  }, [mutate]);

  const addGrade = useCallback((input: { discipline: string; title: string; value: number; coef: number }): string | null => {
    if (!user) return 'Session expirée.';
    if (!input.discipline.trim()) return 'Indiquez la matière.';
    if (!input.title.trim()) return 'Indiquez l’intitulé du devoir.';
    if (!Number.isFinite(input.value) || input.value < 0 || input.value > 20) return 'Note invalide : entre 0 et 20.';
    if (!Number.isFinite(input.coef) || input.coef <= 0 || input.coef > 10) return 'Coefficient invalide : entre 0,5 et 10.';
    mutate(d => {
      d.grades.push({
        id: uid('g'),
        userId: user.id,
        discipline: input.discipline.trim(),
        title: input.title.trim(),
        value: input.value,
        coef: input.coef,
        createdAt: new Date().toISOString()
      });
    });
    return null;
  }, [user, mutate]);

  const deleteGrade = useCallback((id: string) => {
    mutate(d => {
      d.grades = d.grades.filter(g => g.id !== id);
    });
  }, [mutate]);

  const submitToAnnouncement = useCallback(async (announcementId: string, file: File): Promise<string | null> => {
    if (!user) return 'Session expirée.';
    const ann = db.announcements.find(a => a.id === announcementId);
    if (!ann || ann.type !== 'PARTICIPATIVE') return 'Cette annonce n’accepte pas de dépôt.';
    if (isExpired(ann)) return 'Cette collecte est expirée.';
    if (!user.pole || !ann.poles.includes(user.pole)) return 'Votre pôle n’est pas concerné par cette collecte.';
    if (file.size > SUBMISSION_MAX_BYTES) return 'Fichier trop volumineux : 20 Mo maximum.';
    const id = uid('sub');
    await putFile(id, file);
    mutate(d => {
      d.submissions.push({
        id,
        announcementId,
        userId: user.id,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        createdAt: new Date().toISOString()
      });
    });
    return null;
  }, [user, db.announcements, mutate]);

  const deleteSubmission = useCallback((id: string) => {
    mutate(d => {
      d.submissions = d.submissions.filter(s => s.id !== id);
    });
    void deleteFile(id).catch(() => undefined);
  }, [mutate]);

  const setCollectAccess = useCallback((announcementId: string, access: CollectAccess) => {
    if (!user) return;
    mutate(d => {
      const ann = d.announcements.find(a => a.id === announcementId);
      if (ann && (ann.authorId === user.id || user.role === 'ADMIN')) ann.collectAccess = access;
    });
  }, [user, mutate]);

  const setCollectEmail = useCallback((announcementId: string, email: string): string | null => {
    if (!user) return 'Session expirée.';
    const clean = email.trim();
    if (clean && !/^\S+@\S+\.\S+$/.test(clean)) return 'Adresse e-mail invalide.';
    mutate(d => {
      const ann = d.announcements.find(a => a.id === announcementId);
      if (ann && (ann.authorId === user.id || user.role === 'ADMIN')) ann.collectEmail = clean || null;
    });
    return null;
  }, [user, mutate]);

  const setWhatsapp = useCallback((number: string): string | null => {
    if (!user) return 'Session expirée.';
    const wa = number.trim();
    if (wa && wa.replace(/\D/g, '').length < 8) return 'Numéro WhatsApp invalide (indicatif inclus, ex. +241 06 12 34 56).';
    mutate(d => {
      const me = d.users.find(u => u.id === user.id);
      if (me) me.whatsapp = wa || undefined;
    });
    return null;
  }, [user, mutate]);

  const resetDemoData = useCallback(() => {
    const fresh = resetDB();
    setDB(fresh);
  }, []);

  const value = useMemo<Store>(() => ({
    db, user, login, register, logout, publish, markRead, vote, addComment,
    applyRelais, decideApplication, createProf, deleteAnnouncement, deleteComment, deleteUser,
    setUserDisabled, setRelaisStatus, setReliability, createResetLink, consumeResetToken,
    sendChatMessage, softDeleteChatMessage, toggleChatReaction, markRoomVisited, setRoomAccess, upsertScheduleSlot, deleteScheduleSlot,
  upsertMilestone, deleteMilestone, resetMilestoneReached, upsertCourseNote, deleteCourseNote, addSyllabusDoc, deleteSyllabusDoc, addGrade, deleteGrade, submitToAnnouncement, deleteSubmission, setCollectAccess, setCollectEmail, setWhatsapp, resetDemoData
  }), [db, user, login, register, logout, publish, markRead, vote, addComment, applyRelais, decideApplication, createProf, deleteAnnouncement, deleteComment, deleteUser, setUserDisabled, setRelaisStatus, setReliability, createResetLink, consumeResetToken, sendChatMessage, softDeleteChatMessage, toggleChatReaction, markRoomVisited, setRoomAccess, upsertScheduleSlot, deleteScheduleSlot, upsertMilestone, deleteMilestone, resetMilestoneReached, upsertCourseNote, deleteCourseNote, addSyllabusDoc, deleteSyllabusDoc, addGrade, deleteGrade, submitToAnnouncement, deleteSubmission, setCollectAccess, setCollectEmail, setWhatsapp, resetDemoData]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used within StoreProvider');
  return s;
}
