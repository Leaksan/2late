import { useRef } from "react";
import { RoleBadge } from "@/components/RoleBadges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChatMessage } from "@/lib/types";
import { initials } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

export function MessageBubble({
  message,
  mine,
  onMenu,
}: {
  message: ChatMessage;
  mine: boolean;
  onMenu: (m: ChatMessage) => void;
}) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  };

  const down = (x: number, y: number) => {
    start.current = { x, y };
    timer.current = window.setTimeout(() => {
      onMenu(message);
      timer.current = null;
    }, 450);
  };

  const move = (x: number, y: number) => {
    if (!start.current) return;
    if (Math.hypot(x - start.current.x, y - start.current.y) > 10) clear();
  };

  return (
    <div
      className={`flex max-w-[86%] gap-2 ${mine ? "ml-auto flex-row-reverse" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(message);
      }}
      onPointerDown={(e) => down(e.clientX, e.clientY)}
      onPointerMove={(e) => move(e.clientX, e.clientY)}
      onPointerUp={clear}
      onPointerCancel={clear}
    >
      {!mine && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>{initials(message.author?.name ?? "?")}</AvatarFallback>
        </Avatar>
      )}
      <div className={`rounded-2xl border px-3 py-2 ${mine ? "border-primary/40 bg-primary/15" : "border-border bg-card"} ${message.deleted ? "opacity-50" : ""} ${message.id.startsWith("tmp-") ? "opacity-80" : ""}`}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {!mine && (
              <div className="mb-0.5 flex items-center gap-2 text-xs font-bold text-primary">
                {message.author?.name}
                {message.author && <RoleBadge role={message.author.role} />}
              </div>
            )}
            <p className="whitespace-pre-wrap text-body">
              {message.deleted
                ? "Message supprimé"
                : message.body.split(/(@[\p{L}\p{N}_'-]+)/u).map((part, i) =>
                    part.startsWith("@") ? (
                      <span key={i} className="rounded bg-primary/15 px-0.5 font-bold text-primary">
                        {part}
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
            </p>
            {!!message.reactions?.length && (
              <div className="mt-1 flex gap-1 text-sm">
                {message.reactions.map((r) => (
                  <span key={r.emoji} className="rounded-full bg-muted px-1.5">
                    {r.emoji} {r.userIds.length}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" aria-label="Actions du message" onClick={() => onMenu(message)}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
