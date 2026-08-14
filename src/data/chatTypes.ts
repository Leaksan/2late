import type { Pole, RoomKind } from '../types';

export interface ChatRoomInfo {
  id: string;
  kind: RoomKind;
  pole?: Pole;
  name: string;
  description: string;
}
