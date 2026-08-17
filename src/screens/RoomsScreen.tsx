import { useMemo } from 'react';
import { messagesOf, myRooms, roomParticipants, unreadCount } from '../data/chat';
import { userById } from '../data/db';
import { useStore } from '../store';
import { timeAgo } from '../utils';
import type { ChatRoomInfo } from '../data/chatTypes';
import { RoomIcon } from '../components/RoomIcon';
import { IconChat } from '../ui/Icons';

export function RoomsScreen({ onOpen }: { onOpen: (roomId: string) => void }) {
  const { db, user } = useStore();
  const rooms = useMemo(() => (user ? myRooms(db, user) : []), [db, user]);

  if (!user) return null;

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rooms.map(room => (
          <RoomRow key={room.id} room={room} onOpen={onOpen} />
        ))}
      </div>

      {rooms.length <= 1 && (
        <div className="empty">
          <div className="empty-ico">💬</div>
          <b>Un seul salon pour l’instant</b>
          <p>
            Vous avez accès au salon de votre pôle. L’administration peut vous ouvrir d’autres salons
            (général, autres pôles) sur demande.
          </p>
        </div>
      )}
    </div>
  );
}

function RoomRow({ room, onOpen }: { room: ChatRoomInfo; onOpen: (roomId: string) => void }) {
  const { db, user } = useStore();
  if (!user) return null;

  const participants = roomParticipants(db, room.id);
  const unread = unreadCount(db, user.id, room.id);
  const lastMsg = messagesOf(db, room.id).filter(m => !m.deleted).at(-1);
  const lastAuthor = lastMsg ? userById(db, lastMsg.authorId) : undefined;

  return (
    <button className="room-card" onClick={() => onOpen(room.id)}>
      <span className="room-emoji"><RoomIcon room={room} size={22} /></span>
      <span className="room-body">
        <span className="room-name">
          {room.name}
          {unread > 0 && <span className="room-unread">{unread}</span>}
        </span>
        <span className="room-sub">
          {lastMsg
            ? `${lastAuthor?.name.split(' ')[0] ?? '—'} : ${lastMsg.body}`
            : room.description}
        </span>
        <span className="room-meta">{participants.length} membres</span>
      </span>
      {lastMsg && <span className="room-time">{timeAgo(lastMsg.createdAt)}</span>}
    </button>
  );
}
