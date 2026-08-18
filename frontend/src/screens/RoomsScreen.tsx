import { useEffect, useState } from "react";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { InboxSkeleton } from "@/components/states/InboxSkeleton";
import { Card } from "@/components/ui/card";
import type { ChatRoom } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { useStore } from "@/store";
import { MessagesSquare } from "lucide-react";

export function RoomsScreen({ onOpen, selectedId }: { onOpen: (id: string) => void; selectedId?: string }) {
  const { rooms } = useStore();
  const [list, setList] = useState<ChatRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    setError(null);
    void rooms()
      .then(setList)
      .catch((e) => setError(e?.message || "Impossible de charger les salons"));
  };

  useEffect(() => {
    reload();
  }, [rooms]);

  if (error) return <ErrorState title="Salons indisponibles" description={error} onRetry={reload} />;
  if (!list) return <InboxSkeleton rows={4} />;
  if (list.length === 0) return <EmptyState icon={MessagesSquare} title="Aucun salon" description="Vous n’avez accès à aucun salon pour le moment." />;

  return (
    <div className="flex flex-col gap-3">
      {list.map((room) => (
        <button key={room.id} className="w-full text-left" onClick={() => onOpen(room.id)}>
          <Card className={cn("flex items-center gap-3 p-4", selectedId === room.id && "border-primary")}>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card-2">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-bold">
                {room.name}
                {room.unread > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 text-[11px] text-destructive-foreground">{room.unread}</span>
                )}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {room.lastMessage ? `${room.lastMessage.authorName?.split(" ")[0] ?? "—"} : ${room.lastMessage.body}` : room.description}
              </div>
              <div className="text-meta text-muted-foreground">{room.members} membres</div>
            </div>
            {room.lastMessage && <span className="text-meta text-muted-foreground">{timeAgo(room.lastMessage.createdAt)}</span>}
          </Card>
        </button>
      ))}
    </div>
  );
}
