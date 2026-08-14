import type { ChatRoomInfo } from './chatTypes';
import type { ChatMessage, DB, User } from '../types';
import { POLES } from '../types';

export const CHAT_ROOMS: ChatRoomInfo[] = [
  {
    id: 'general',
    kind: 'GENERAL',
    name: 'Général',
    description: 'Toute la communauté de l’université'
  },
  ...POLES.map(p => ({
    id: `pole-${p}`,
    kind: 'POLE' as const,
    pole: p,
    name: `Pôle ${p}`,
    description: `Étudiants et enseignants du pôle ${p}`
  })),
  {
    id: 'staff',
    kind: 'STAFF',
    name: 'Administration',
    description: 'Équipe administrative de l’école'
  }
];

export function roomById(roomId: string): ChatRoomInfo | undefined {
  return CHAT_ROOMS.find(r => r.id === roomId);
}

export function defaultRoomAccess(user: User, room: ChatRoomInfo): boolean {
  if (user.role === 'ADMIN') return true;
  switch (room.kind) {
    case 'GENERAL':
      return user.role === 'PROF' || user.role === 'RELAIS';
    case 'STAFF':
      return false;
    case 'POLE':
      return user.role === 'PROF' || user.pole === room.pole;
  }
}

export function roomAccessOf(db: DB, user: User, roomId: string): boolean {
  const room = roomById(roomId);
  if (!room) return false;
  const ov = db.roomAccess.find(r => r.userId === user.id && r.roomId === roomId);
  if (ov) return ov.decision === 'GRANTED';
  return defaultRoomAccess(user, room);
}

export function myRooms(db: DB, user: User): ChatRoomInfo[] {
  return CHAT_ROOMS.filter(r => roomAccessOf(db, user, r.id));
}

const ROLE_SORT: Record<User['role'], number> = { ADMIN: 0, PROF: 1, RELAIS: 2, ETUDIANT: 3 };

export function roomParticipants(db: DB, roomId: string): User[] {
  return db.users
    .filter(u => roomAccessOf(db, u, roomId))
    .sort(
      (a, b) =>
        ROLE_SORT[a.role] - ROLE_SORT[b.role] ||
        (a.pole ?? '').localeCompare(b.pole ?? '') ||
        a.name.localeCompare(b.name)
    );
}

export function canModerateRoom(viewer: User, room: ChatRoomInfo, target: User): boolean {
  if (viewer.id === target.id) return false;
  if (viewer.role === 'ADMIN') return target.role !== 'ADMIN';
  if (viewer.role === 'RELAIS' && room.id === 'general' && target.role === 'ETUDIANT') {
    return target.pole === viewer.pole;
  }
  return false;
}

export function messagesOf(db: DB, roomId: string): ChatMessage[] {
  return db.chatMessages
    .filter(m => m.roomId === roomId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export function unreadCount(db: DB, userId: string, roomId: string): number {
  const visit = db.chatVisits.find(v => v.userId === userId && v.roomId === roomId);
  const since = visit ? Date.parse(visit.at) : 0;
  return db.chatMessages.filter(m => m.roomId === roomId && m.authorId !== userId && !m.deleted && Date.parse(m.createdAt) > since).length;
}

export function totalUnread(db: DB, userId: string): number {
  const user = db.users.find(u => u.id === userId);
  if (!user) return 0;
  return myRooms(db, user).reduce((sum, r) => sum + unreadCount(db, userId, r.id), 0);
}

export function isMentioned(db: DB, user: User, body: string): boolean {
  if (/@tous\b/i.test(body)) return true;
  const first = user.name.trim().split(/\s+/)[0];
  if (first) {
    const re = new RegExp(`@${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(body)) return true;
  }
  return false;
}

export function mentionPending(db: DB, user: User): boolean {
  for (const room of myRooms(db, user)) {
    const visit = db.chatVisits.find(v => v.userId === user.id && v.roomId === room.id);
    const since = visit ? Date.parse(visit.at) : 0;
    const hit = db.chatMessages.some(
      m => m.roomId === room.id && m.authorId !== user.id && !m.deleted &&
        Date.parse(m.createdAt) > since && isMentioned(db, user, m.body)
    );
    if (hit) return true;
  }
  return false;
}
