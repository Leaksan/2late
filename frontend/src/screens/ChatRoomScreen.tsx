import { useEffect, useRef, useState } from "react";
import { RoleBadge } from "@/components/RoleBadges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { canModerateRoom } from "@/lib/domain";
import type { ChatMessage, ChatRoom, User } from "@/lib/types";
import { initials } from "@/lib/utils";
import { useStore } from "@/store";
import { ChevronLeft, Lock, Send, Users } from "lucide-react";

const REACTIONS = ["👍", "❤️", "😂", "😮", "🙏"];

export function ChatRoomScreen({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const { user, roomMessages, sendMessage, deleteMessage, react, setRoomAccess } = useStore();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [people, setPeople] = useState<User[]>([]);
  const [grantable, setGrantable] = useState<User[]>([]);
  const [room, setRoom] = useState<Pick<ChatRoom, "id" | "name" | "kind"> | null>(null);
  const [roomName, setRoomName] = useState("");
  const [denied, setDenied] = useState(false);
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [menu, setMenu] = useState<ChatMessage | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const reload = async () => {
    try {
      const data = await roomMessages(roomId);
      setMsgs(data.messages);
      setPeople(data.participants);
      setGrantable(data.grantable || []);
      setRoom(data.room);
      setRoomName(data.room.name);
      setDenied(false);
    } catch {
      setDenied(true);
    }
  };

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => void reload(), 4000);
    return () => window.clearInterval(id);
  }, [roomId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  if (!user) return null;
  if (denied) {
    return (
      <div className="screen pt-3">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ChevronLeft />
        </Button>
        <div className="mt-16 text-center text-muted-foreground">
          <Lock className="mx-auto mb-3" />
          <b className="text-foreground">Accès révoqué</b>
          <p className="mt-1 text-sm">Votre accès à ce salon a été révoqué.</p>
        </div>
      </div>
    );
  }

  const send = async () => {
    if (!body.trim()) return;
    await sendMessage(roomId, body, reply?.id);
    setBody("");
    setReply(null);
    reload();
  };

  return (
    <div className="mx-auto flex h-dvh max-w-[720px] flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button variant="outline" size="icon" onClick={onBack} aria-label="Retour">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="font-bold">{roomName}</div>
          <div className="text-xs text-muted-foreground">{people.length} membres</div>
        </div>
        <Button variant="outline" size="icon" onClick={() => setMembersOpen(true)} aria-label="Membres">
          <Users className="h-4 w-4" />
        </Button>
      </header>
      <main className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {msgs.map((m) => {
          const mine = m.authorId === user.id;
          return (
            <div
              key={m.id}
              className={`flex max-w-[86%] gap-2 ${mine ? "ml-auto flex-row-reverse" : ""}`}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu(m);
              }}
              onClick={() => setMenu(m)}
            >
              {!mine && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initials(m.author?.name ?? "?")}</AvatarFallback>
                </Avatar>
              )}
              <div className={`rounded-2xl border px-3 py-2 ${mine ? "border-primary/40 bg-primary/15" : "border-border bg-card"} ${m.deleted ? "opacity-50" : ""}`}>
                {!mine && (
                  <div className="mb-0.5 flex items-center gap-2 text-xs font-bold text-primary">
                    {m.author?.name}
                    {m.author && <RoleBadge role={m.author.role} />}
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm">
                  {m.deleted
                    ? "Message supprimé"
                    : m.body.split(/(@[\p{L}\p{N}_'-]+)/u).map((part, i) =>
                        part.startsWith("@") ? (
                          <span key={i} className="rounded bg-primary/15 px-0.5 font-bold text-primary">
                            {part}
                          </span>
                        ) : (
                          <span key={i}>{part}</span>
                        ),
                      )}
                </p>
                {!!m.reactions?.length && (
                  <div className="mt-1 flex gap-1 text-sm">
                    {m.reactions.map((r) => (
                      <span key={r.emoji} className="rounded-full bg-black/20 px-1.5">
                        {r.emoji} {r.userIds.length}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </main>
      <footer className="border-t border-border p-3">
        {reply && (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs">
            Réponse à {reply.author?.name}
            <button onClick={() => setReply(null)}>✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} placeholder="Message · @ pour mentionner" />
          <Button size="icon" onClick={() => void send()} disabled={!body.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      <Dialog open={!!menu} onOpenChange={() => setMenu(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message</DialogTitle>
          </DialogHeader>
          {menu && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {REACTIONS.map((e) => (
                  <button
                    key={e}
                    className="text-xl"
                    onClick={() => {
                      void react(menu.id, e).then(reload);
                      setMenu(null);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setReply(menu); setMenu(null); }}>
                Répondre
              </Button>
              {(menu.authorId === user.id || user.role === "ADMIN") && !menu.deleted && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    void deleteMessage(menu.id).then(reload);
                    setMenu(null);
                  }}
                >
                  Supprimer
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {roomName} — {people.length} membres
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {user.role === "ADMIN"
              ? "Vous pouvez accorder ou révoquer l’accès à ce salon pour chaque membre."
              : user.role === "RELAIS" && roomId === "general"
                ? "En tant que Relais, vous pouvez révoquer ou rétablir l’accès des étudiants de votre pôle au salon général."
                : "Participants ayant accès à ce salon."}
          </p>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {people.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2">
                <Avatar>
                  <AvatarFallback>{initials(p.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.pole ? `Pôle ${p.pole}` : p.role}</div>
                </div>
                {room && canModerateRoom(user, room, p) && (
                  <Button size="sm" variant="outline" onClick={() => void setRoomAccess(roomId, p.id, false).then(reload)}>
                    Révoquer
                  </Button>
                )}
              </div>
            ))}
            {grantable.length > 0 && (
              <>
                <div className="pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Accorder l’accès</div>
                {grantable.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2">
                    <Avatar>
                      <AvatarFallback>{initials(p.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.pole ? `Pôle ${p.pole} · ` : ""}
                        {p.role}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => void setRoomAccess(roomId, p.id, true).then(reload)}>
                      + Accorder
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
