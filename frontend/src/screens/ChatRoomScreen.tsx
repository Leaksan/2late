import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Composer } from "@/components/chat/Composer";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ErrorState } from "@/components/states/ErrorState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { canModerateRoom } from "@/lib/domain";
import type { ChatMessage, ChatRoom, User } from "@/lib/types";
import { initials } from "@/lib/utils";
import { useStore } from "@/store";
import { ChevronLeft, Lock, Users } from "lucide-react";

const REACTIONS = ["👍", "❤️", "😂", "😮", "🙏"];

export function ChatRoomScreen({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const { user, roomMessages, sendMessage, deleteMessage, react, setRoomAccess, offline } = useStore();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [people, setPeople] = useState<User[]>([]);
  const [grantable, setGrantable] = useState<User[]>([]);
  const [room, setRoom] = useState<Pick<ChatRoom, "id" | "name" | "kind"> | null>(null);
  const [denied, setDenied] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [menu, setMenu] = useState<ChatMessage | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [revokeUser, setRevokeUser] = useState<User | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const { keyboardInset } = useKeyboardOpen();

  const reload = async () => {
    try {
      const data = await roomMessages(roomId);
      setMsgs((prev) => mergePoll(prev, data.messages));
      setPeople(data.participants);
      setGrantable(data.grantable || []);
      setRoom(data.room);
      setDenied(false);
      setLoadErr(null);
    } catch (e: any) {
      if (e?.status === 403) setDenied(true);
      else setLoadErr(e?.message || "Erreur");
    }
  };

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => void reload(), 4000);
    return () => window.clearInterval(id);
  }, [roomId]);

  useEffect(() => {
    if (nearBottom.current) {
      const el = scroller.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
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
  if (loadErr && !room) {
    return <ErrorState title="Salon indisponible" description={loadErr} onRetry={() => void reload()} />;
  }

  const send = async () => {
    if (!body.trim() || offline) return;
    const tmpId = `tmp-${crypto.randomUUID()}`;
    const tmp: ChatMessage = {
      id: tmpId,
      roomId,
      authorId: user.id,
      author: user,
      body,
      replyToId: reply?.id,
      deleted: false,
      reactions: [],
      createdAt: new Date().toISOString(),
    };
    const savedBody = body;
    const savedReply = reply?.id;
    setMsgs((m) => [...m, tmp]);
    setBody("");
    setReply(null);
    setSendErr(null);
    try {
      const created = await sendMessage(roomId, savedBody, savedReply);
      setMsgs((m) => m.map((x) => (x.id === tmpId ? created : x)));
    } catch {
      setMsgs((m) => m.filter((x) => x.id !== tmpId));
      setBody(savedBody);
      setSendErr("Envoi impossible. Réessayez.");
    }
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[760px] flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button variant="outline" size="icon" onClick={onBack} aria-label="Retour">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="font-bold">{room?.name ?? "Salon"}</div>
          <div className="text-xs text-muted-foreground">{people.length} membres</div>
        </div>
        <Button variant="outline" size="icon" onClick={() => setMembersOpen(true)} aria-label="Membres">
          <Users className="h-4 w-4" />
        </Button>
      </header>
      <div
        ref={scroller}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {msgs.map((m) => (
          <MessageBubble key={m.id} message={m} mine={m.authorId === user.id} onMenu={setMenu} />
        ))}
      </div>
      <footer className="border-t border-border p-3" style={{ paddingBottom: keyboardInset > 0 ? keyboardInset : undefined }}>
        {sendErr && <p className="mb-2 text-sm text-destructive">{sendErr}</p>}
        <Composer
          value={body}
          onChange={setBody}
          onSend={() => void send()}
          disabled={offline}
          replyLabel={reply?.author?.name}
          onCancelReply={() => setReply(null)}
        />
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
                    className="h-11 w-11 text-xl"
                    onClick={() => {
                      void react(menu.id, e).then(reload);
                      setMenu(null);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setReply(menu);
                  setMenu(null);
                }}
              >
                Répondre
              </Button>
              {(menu.authorId === user.id || user.role === "ADMIN") && !menu.deleted && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setConfirmDelete(true);
                  }}
                >
                  Supprimer
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer ce message ?"
        onOpenChange={setConfirmDelete}
        onConfirm={() => {
          if (menu) void deleteMessage(menu.id).then(reload);
          setMenu(null);
        }}
      />

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {room?.name} — {people.length} membres
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
                  <Button size="sm" variant="outline" onClick={() => setRevokeUser(p)}>
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

      <ConfirmDialog
        open={!!revokeUser}
        title={revokeUser ? `Révoquer l’accès de ${revokeUser.name} à ce salon ?` : ""}
        onOpenChange={(o) => !o && setRevokeUser(null)}
        confirmLabel="Révoquer"
        onConfirm={() => {
          if (revokeUser) void setRoomAccess(roomId, revokeUser.id, false).then(reload);
        }}
      />
    </div>
  );
}

function mergePoll(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const tmps = prev.filter((m) => m.id.startsWith("tmp-"));
  const now = Date.now();
  const keptTmp = tmps.filter((t) => {
    const age = now - Date.parse(t.createdAt);
    if (age > 8000 && incoming.some((s) => s.authorId === t.authorId && s.body === t.body && Math.abs(Date.parse(s.createdAt) - Date.parse(t.createdAt)) < 10_000)) {
      return false;
    }
    return !incoming.some((s) => s.id === t.id);
  });
  return [...incoming, ...keptTmp];
}
