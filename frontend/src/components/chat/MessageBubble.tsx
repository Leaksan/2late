import { useRef, useState } from "react";
import { RoleBadge } from "@/components/RoleBadges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChatMessage, User } from "@/lib/types";
import { initials } from "@/lib/utils";
import { MoreHorizontal, Reply } from "lucide-react";

// Réponse par glissement (façon WhatsApp) : seuil et amplitude en px.
const SWIPE_TRIGGER = 60;
const SWIPE_MAX = 90;

export function MessageBubble({
  message,
  mine,
  onMenu,
  onSwipe,
  onProfile,
}: {
  message: ChatMessage;
  mine: boolean;
  onMenu: (m: ChatMessage) => void;
  onSwipe?: (m: ChatMessage) => void;
  onProfile?: (u: User) => void;
}) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [dx, setDx] = useState(0);
  const swiping = useRef(false);
  const lastSwipeAt = useRef(0);

  const clear = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  };

  const down = (x: number, y: number) => {
    start.current = { x, y };
    swiping.current = false;
    timer.current = window.setTimeout(() => {
      onMenu(message);
      timer.current = null;
    }, 450);
  };

  const move = (x: number, y: number) => {
    if (!start.current) return;
    const ddx = x - start.current.x;
    const ddy = y - start.current.y;
    if (swiping.current) {
      setDx(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, ddx)));
      return;
    }
    if (Math.abs(ddx) > Math.abs(ddy) && Math.abs(ddx) > 8) {
      // Glissement horizontal : on annule l'appui long et on swipe.
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      swiping.current = true;
      setDx(ddx);
      return;
    }
    if (Math.hypot(ddx, ddy) > 10) clear();
  };

  const up = () => {
    if (swiping.current) {
      if (Math.abs(dx) > SWIPE_TRIGGER) {
        lastSwipeAt.current = Date.now();
        onSwipe?.(message);
      }
      swiping.current = false;
      setDx(0);
    }
    clear();
  };

  return (
    <div
      className={`relative flex max-w-[86%] gap-2 ${mine ? "ml-auto flex-row-reverse" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(message);
      }}
      onPointerDown={(e) => down(e.clientX, e.clientY)}
      onPointerMove={(e) => move(e.clientX, e.clientY)}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={() => {
        if (Date.now() - lastSwipeAt.current < 400) return;
      }}
    >
      {Math.abs(dx) > 20 && (
        <span
          className={`absolute top-1/2 -translate-y-1/2 self-center rounded-full border border-border bg-card p-1.5 text-primary ${dx > 0 ? "-left-9" : "-right-9"}`}
          aria-hidden
        >
          <Reply size={14} className={dx > 0 ? "" : "-scale-x-100"} />
        </span>
      )}
      {!mine && (
        <button
          type="button"
          className="self-start rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={`Voir le profil de ${message.author?.name ?? "l’auteur"}`}
          onClick={() => message.author && onProfile?.(message.author)}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(message.author?.name ?? "?")}</AvatarFallback>
          </Avatar>
        </button>
      )}
      <div
        className={`rounded-2xl border px-3 py-2 transition-transform ${mine ? "border-primary/40 bg-primary/15" : "border-border bg-card"} ${message.deleted ? "opacity-50" : ""} ${message.id.startsWith("tmp-") ? "opacity-80" : ""}`}
        style={dx !== 0 ? { transform: `translateX(${dx * 0.4}px)` } : undefined}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {!mine && (
              <div className="mb-0.5 flex items-center gap-2 text-xs font-bold text-primary">
                <button
                  type="button"
                  className="rounded font-bold hover:underline"
                  onClick={() => message.author && onProfile?.(message.author)}
                  aria-label={`Voir le profil de ${message.author?.name ?? "l’auteur"}`}
                >
                  {message.author?.name}
                </button>
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
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Actions du message"
            onClick={() => {
              if (Date.now() - lastSwipeAt.current < 400) return;
              onMenu(message);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
