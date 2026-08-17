import type { ChatRoomInfo } from '../data/chatTypes';

export function RoomIcon({ room, size = 22 }: { room: ChatRoomInfo; size?: number }) {
  const emoji = room.kind === 'GENERAL' ? '🌍' : room.kind === 'STAFF' ? '🏛️' : '🎓';
  return <span style={{ fontSize: size, lineHeight: 1 }}>{emoji}</span>;
}
