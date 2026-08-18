import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type { ChatRoom } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useStore } from "@/store";
import { MessagesSquare } from "lucide-react";

export function RoomsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { rooms } = useStore();
  const [list, setList] = useState<ChatRoom[]>([]);
  useEffect(() => {
    void rooms().then(setList);
  }, [rooms]);

  return (
    <div className="flex flex-col gap-3">
      {list.map((room) => (
        <button key={room.id} className="w-full text-left" onClick={() => onOpen(room.id)}>
          <Card className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card-2">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-bold">
                {room.name}
                {room.unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[11px] text-white">{room.unread}</span>}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {room.lastMessage ? `${room.lastMessage.authorName?.split(" ")[0] ?? "—"} : ${room.lastMessage.body}` : room.description}
              </div>
              <div className="text-[11px] text-muted-foreground">{room.members} membres</div>
            </div>
            {room.lastMessage && <span className="text-[11px] text-muted-foreground">{timeAgo(room.lastMessage.createdAt)}</span>}
          </Card>
        </button>
      ))}
    </div>
  );
}
