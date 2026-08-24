import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Composer } from "@/components/chat/Composer";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ErrorState } from "@/components/states/ErrorState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RoleBadge } from "@/components/RoleBadges";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { canModerateRoom, canMentionUser } from "@/lib/domain";
import { ROLE_LABELS } from "@/lib/types";
import type { ChatMessage, ChatRoom, User } from "@/lib/types";
import { initials } from "@/lib/utils";
import { useStore } from "@/store";
import { ChevronLeft, Copy, Lock, Reply, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [profileUser, setProfileUser] = useState<User | null>(null);
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
          <MessageBubble key={m.id} message={m} mine={m.authorId === user.id} onMenu={setMenu} onSwipe={setReply} onProfile={setProfileUser} />
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
        <DialogContent className="gap-4">
          {menu && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">Actions sur le message</DialogTitle>
              </DialogHeader>

              <div
                className="mx-1 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                role="button"
                tabIndex={0}
                onClick={() => menu.author && setProfileUser(menu.author)}
                onKeyDown={(e) => { if (e.key === "Enter" && menu.author) setProfileUser(menu.author); }}
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback>{initials(menu.author?.name ?? "?")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {menu.author?.name ?? "Utilisateur supprimé"}
                    {menu.author && <RoleBadge role={menu.author.role} />}
                  </div>
                  <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">
                    {menu.deleted ? <i>Message supprimé</i> : menu.body}
                  </p>
                </div>
              </div>

              {!menu.deleted && (
                <div className="mx-1 flex items-center justify-between gap-1 rounded-2xl border border-border bg-card p-2">
                  {REACTIONS.map((e) => {
                    const mine = menu.reactions?.some((r) => r.emoji === e && r.userIds.includes(user.id));
                    return (
                      <button
                        key={e}
                        type="button"
                        className={cn(
                          "flex h-11 flex-1 items-center justify-center rounded-xl text-xl transition-transform",
                          mine ? "bg-primary/15 shadow-inner" : "hover:bg-muted active:scale-90",
                        )}
                        aria-label={`Réagir ${e}`}
                        onClick={() => {
                          void react(menu.id, e).then(reload);
                          setMenu(null);
                        }}
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mx-1 flex flex-col gap-1.5">
                <button
                  type="button"
                  className="flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-colors hover:bg-muted"
                  onClick={() => {
                    setReply(menu);
                    setMenu(null);
                  }}
                >
                  <Reply className="h-4.5 w-4.5 text-muted-foreground" /> Répondre
                </button>
                {!menu.deleted && (
                  <button
                    type="button"
                    className="flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-colors hover:bg-muted"
                    onClick={() => {
                      void navigator.clipboard?.writeText(menu.body);
                      setMenu(null);
                    }}
                  >
                    <Copy className="h-4.5 w-4.5 text-muted-foreground" /> Copier le texte
                  </button>
                )}
                {(menu.authorId === user.id || user.role === "ADMIN") && !menu.deleted && (
                  <button
                    type="button"
                    className="flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4.5 w-4.5" /> Supprimer
                  </button>
                )}
              </div>
            </>
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
        <DialogContent className="gap-3">
          <div className="mx-auto mt-1 h-1.5 w-10 rounded-full bg-border" />
          <DialogHeader>
            <DialogTitle>{room?.name} — {people.length} membres</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {user.role === "ADMIN"
              ? "Vous pouvez accorder ou révoquer l’accès à ce salon pour chaque membre."
              : user.role === "RELAIS" && roomId === "general"
                ? "En tant que Relais, vous pouvez révoquer ou rétablir l’accès des étudiants de votre pôle au salon général."
                : "Participants ayant accès à ce salon."}
          </p>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto overscroll-contain pr-1">
            {people.map((p) => (
              <div
                key={p.id}
                className="flex min-h-[3.5rem] cursor-pointer items-center gap-3 rounded-2xl px-2 transition-colors hover:bg-muted/60"
                role="button"
                tabIndex={0}
                onClick={() => setProfileUser(p)}
                onKeyDown={(e) => { if (e.key === "Enter") setProfileUser(p); }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{initials(p.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{p.name}</span>
                    <RoleBadge role={p.role} />
                  </div>
                  <div className="text-xs text-muted-foreground">{p.pole ? `Pôle ${p.pole}` : ""}</div>
                </div>
                {room && canModerateRoom(user, room, p) && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setRevokeUser(p); }}>
                    Révoquer
                  </Button>
                )}
              </div>
            ))}
            {grantable.length > 0 && (
              <>
                <div className="pt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Accorder l’accès</div>
                {grantable.map((p) => (
                  <div key={p.id} className="flex min-h-[3.5rem] items-center gap-3 rounded-2xl px-2 transition-colors hover:bg-muted/60">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{initials(p.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{p.name}</span>
                        <RoleBadge role={p.role} />
                      </div>
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

      <Dialog open={!!profileUser} onOpenChange={(o) => !o && setProfileUser(null)}>
        <DialogContent className="gap-4">
          {profileUser && (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">Profil de {profileUser.name}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-border bg-card text-2xl font-extrabold text-primary">
                  {initials(profileUser.name)}
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{profileUser.name}</div>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                    <RoleBadge role={profileUser.role} />
                    {profileUser.pole && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Pôle {profileUser.pole}</span>}
                    {profileUser.disabled && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Compte désactivé</span>}
                  </div>
                </div>
                <dl className="grid w-full grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-border bg-card p-3">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rôle</dt>
                    <dd className="mt-1 text-sm font-semibold">{ROLE_LABELS[profileUser.role]}</dd>
                  </div>
                  {profileUser.pole && (
                    <div className="rounded-2xl border border-border bg-card p-3">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pôle</dt>
                      <dd className="mt-1 text-sm font-semibold">{profileUser.pole}</dd>
                    </div>
                  )}
                  <div className="rounded-2xl border border-border bg-card p-3">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Membre depuis</dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {new Date(profileUser.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </dd>
                  </div>
                  {profileUser.id === user.id && (
                    <div className="rounded-2xl border border-border bg-card p-3">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">E-mail</dt>
                      <dd className="mt-1 break-all text-sm font-semibold">{profileUser.email}</dd>
                    </div>
                  )}
                </dl>
                {canMentionUser(user, profileUser) ? (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setBody((b) => (b.trim() ? `${b.trimEnd()} @${profileUser.name.split(" ")[0]} ` : `@${profileUser.name.split(" ")[0]} `));
                      setProfileUser(null);
                    }}
                  >
                    <Reply className="h-4 w-4" /> Identifier @{profileUser.name.split(" ")[0]}
                  </Button>
                ) : profileUser.role === "PROF" ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Seuls les relais et l’administration peuvent identifier un professeur.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
