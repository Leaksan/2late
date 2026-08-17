import { IconBank, IconGlobe, IconGraduation } from '../ui/Icons';
import type { ChatRoomInfo } from '../data/chatTypes';

export function RoomIcon({ room, size = 22 }: { room: ChatRoomInfo; size?: number }) {
  if (room.kind === 'GENERAL') return <IconGlobe size={size} />;
  if (room.kind === 'STAFF') return <IconBank size={size} />;
  return <IconGraduation size={size} />;
}
