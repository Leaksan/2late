import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { ReliabilityBadge, RoleBadge, TypeBadge, UrgentBadge } from "@/components/RoleBadges";
import { InboxSkeleton } from "@/components/states/InboxSkeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { apiBlob } from "@/lib/api";
import { announce } from "@/lib/announce";
import { routeTitle } from "@/app/routes";
import { formatExactSendTime, isExpired, stripeColor } from "@/lib/domain";
import type { Announcement, CollectAccess } from "@/lib/types";
import { COLLECT_ACCESS_LABELS } from "@/lib/types";
import { formatSize, initials, timeAgo, timeLeft } from "@/lib/utils";
import { useStore } from "@/store";
import { Download, MessageCircle, Send, ThumbsDown, ThumbsUp } from "lucide-react";

const BACK_LABEL: Record<string, string> = {
  admin: "Admin",
  plus: "Plus",
  schedule: "Planning",
  today: "Aujourd’hui",
};

export function DetailScreen({
  id,
  onBack,
  from,
  hideBack,
}: {
  id: string;
  onBack: () => void;
  from?: string;
  hideBack?: boolean;
}) {
  const { user, announcement, vote, comment, submitFile, deleteSubmission, setCollectAccess, setCollectEmail } = useStore();
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mailValue, setMailValue] = useState<string | null>(null);
  const [mailErr, setMailErr] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);

  const reload = (announceRead = false) =>
    void announcement(id)
      .then((a) => {
        setAnn(a);
        setLoadErr(null);
        document.title = routeTitle({ name: "detail", annId: id, query: {} }, { announcementTitle: a.title, urgent: a.priority === "URGENTE" });
        if (announceRead) announce("Marquée comme lue");
      })
      .catch((e) => setLoadErr(e?.message || "Introuvable"));

  useEffect(() => {
    setAnn(null);
    setLoadErr(null);
    reload(true);
  }, [id]);

  if (!user) return null;
  if (loadErr) {
    return (
      <div className="screen pt-3">
        {!hideBack && <PageHeader title="Annonce" onBack={onBack} backLabel={BACK_LABEL[from || "today"]} />}
        <ErrorState title="Impossible d’ouvrir l’annonce" description={loadErr} onRetry={onBack} />
      </div>
    );
  }
  if (!ann) {
    return (
      <div className="screen pt-3">
        {!hideBack && <PageHeader title="Annonce" onBack={onBack} backLabel={BACK_LABEL[from || "today"]} />}
        <InboxSkeleton rows={3} />
      </div>
    );
  }

  const author = ann.author;
  const rel = ann.reliability;

  const send = async () => {
    if (!body.trim()) return;
    await comment(ann.id, body);
    setBody("");
    reload();
  };

  const download = async (sid: string, name: string) => {
    const blob = await apiBlob(`/api/submissions/${sid}/file`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="screen pt-3">
      {!hideBack && <PageHeader title="" onBack={onBack} backLabel={BACK_LABEL[from || "today"]} subtitle={BACK_LABEL[from || "today"]} />}
      <Card className="relative overflow-hidden p-5">
        <div className="absolute bottom-0 left-0 top-0 w-[5px]" style={{ background: stripeColor(author?.role ?? "ETUDIANT") }} />
        <div className="flex flex-wrap gap-1.5">
          {author && <RoleBadge role={author.role} />}
          {ann.priority === "URGENTE" && <UrgentBadge />}
          <TypeBadge ann={ann} />
          {author?.role === "RELAIS" && <ReliabilityBadge pct={rel.pct} total={rel.total} overridden={rel.overridden} />}
        </div>
        <h1 className="mt-3 text-title leading-snug">{ann.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-body text-card-foreground">{ann.description || "Pas d’information complémentaire pour cette annonce."}</p>
        {ann.expiresAt && (
          <p className="mt-3 text-xs text-muted-foreground">{isExpired(ann) ? "Cette annonce temporaire a expiré." : `Annonce temporaire — ${timeLeft(ann.expiresAt)}.`}</p>
        )}
        {ann.links?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {ann.links.map((l) => (
              <Button key={l.id} variant="outline" size="sm" onClick={() => window.open(l.url, "_blank", "noopener")}>
                {l.label}
              </Button>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
          <Avatar>
            <AvatarFallback>{initials(author?.name ?? "?")}</AvatarFallback>
          </Avatar>
          <div>
            <b>{author?.name ?? "Auteur inconnu"}</b>
            <div className="text-xs">Publié {timeAgo(ann.createdAt)}</div>
          </div>
        </div>
      </Card>

      {ann.type === "PARTICIPATIVE" && (
        <Card className="mt-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <b>Collecte de documents</b>
            {ann.canManageCollect && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    ⋮
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Droit de télécharger</DropdownMenuLabel>
                  {(["AUTHOR", "PROF", "RELAIS"] as CollectAccess[]).map((a) => (
                    <DropdownMenuItem key={a} onClick={() => void setCollectAccess(ann.id, a).then(() => reload())}>
                      {COLLECT_ACCESS_LABELS[a]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {ann.canManageCollect && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {ann.collectEmail ? (
                  <>
                    Réception automatique : <b className="text-foreground">{ann.collectEmail}</b>
                  </>
                ) : (
                  "Réception automatique : désactivée"
                )}
              </span>
              {mailValue === null ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMailValue(ann.collectEmail ?? user.email);
                    setMailErr(null);
                  }}
                >
                  {ann.collectEmail ? "Modifier" : "Activer"}
                </Button>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <Input className="max-w-[220px]" type="email" value={mailValue} onChange={(e) => setMailValue(e.target.value)} />
                  <Button
                    size="sm"
                    onClick={async () => {
                      const e = await setCollectEmail(ann.id, mailValue);
                      setMailErr(e);
                      if (!e) {
                        setMailValue(null);
                        reload();
                      }
                    }}
                  >
                    OK
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setMailValue(null)}>
                    Annuler
                  </Button>
                </span>
              )}
              {mailErr && <p className="w-full text-sm text-destructive">{mailErr}</p>}
            </div>
          )}
          {ann.canSubmit && (
            <label className="mb-4 flex min-h-11 cursor-pointer flex-col rounded-lg border border-dashed border-border p-3">
              <p className="mb-2 text-sm text-muted-foreground">PDF, image, document — 20 Mo max. Classé à votre nom avec l’heure d’envoi.</p>
              <input type="file" onChange={(e) => setPending(e.target.files?.[0] ?? null)} />
              {pending && (
                <Button
                  className="mt-2"
                  onClick={async (e) => {
                    e.preventDefault();
                    const er = await submitFile(ann.id, pending);
                    setErr(er);
                    if (!er) setPending(null);
                    reload();
                  }}
                >
                  <Send className="h-4 w-4" /> Envoyer
                </Button>
              )}
              {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
            </label>
          )}
          {(ann.submissions || []).map((s) => (
            <div key={s.id} className="flex items-center gap-3 border-t border-border py-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(s.student?.name ?? "?")}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{s.student?.name ?? "Compte supprimé"}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  envoyé <span className="time-chip"><b>{new Date(s.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</b><span className="time-chip-day">{new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span></span> · {formatSize(s.fileSize)}
                </div>
              </div>
              {s.student?.whatsapp ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title={`Contacter ${s.student.name} sur WhatsApp`}
                  onClick={() => {
                    const d = new Date(s.createdAt);
                    const msg = `Bonjour ${s.student!.name.split(" ")[0]}, je te confirme la bonne réception de ton document envoyé le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} via 2late (collecte « ${ann.title} »). — ${user.name}`;
                    window.open(`https://wa.me/${s.student!.whatsapp!.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
                  }}
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" disabled title="Numéro WhatsApp non renseigné">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
              {s.canDownload && (
                <Button variant="ghost" size="sm" onClick={() => void download(s.id, s.student?.name || s.fileName)}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {s.userId === user.id && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDropId(s.id)}>
                  Retirer
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      {author?.role === "RELAIS" && (
        <Card className="mt-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <b>Fiabilité communautaire</b>
            <ReliabilityBadge pct={rel.pct} total={rel.total} overridden={rel.overridden} />
          </div>
          {rel.total > 0 && (
            <div className="my-3 h-2 overflow-hidden rounded-full bg-destructive/20">
              <div className="h-full bg-emerald-500" style={{ width: `${rel.pct ?? 0}%` }} />
            </div>
          )}
          {ann.canVote ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant={ann.myVote === 1 ? "default" : "outline"} onClick={() => void vote(ann.id, 1).then(() => reload())}>
                <ThumbsUp className="h-4 w-4" /> Fiable
              </Button>
              <Button variant={ann.myVote === -1 ? "destructive" : "outline"} onClick={() => void vote(ann.id, -1).then(() => reload())}>
                <ThumbsDown className="h-4 w-4" /> Contester
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Le vote est réservé aux étudiants du pôle concerné (hors auteur de l’annonce).</p>
          )}
        </Card>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-base font-bold">Discussion {ann.comments?.length ? `(${ann.comments.length})` : ""}</h2>
        {(ann.comments || []).length === 0 && <EmptyState icon={MessageCircle} title="Soyez le premier…" description="Aucun commentaire pour le moment." />}
        {(ann.comments || []).map((c) => (
          <div key={c.id} className="mb-2 flex gap-3 rounded-lg border border-border bg-card p-3">
            <Avatar>
              <AvatarFallback>{initials(c.author?.name ?? "?")}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{c.author?.name ?? "Utilisateur supprimé"}</span>
                {c.author && <RoleBadge role={c.author.role} />}
                <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-card-foreground">{c.body}</p>
            </div>
          </div>
        ))}
        <div className="mt-3 flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Écrire un commentaire…"
          />
          <Button size="icon" onClick={() => void send()} disabled={!body.trim()} aria-label="Envoyer">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!dropId}
        title="Retirer votre fichier envoyé ?"
        onOpenChange={(o) => !o && setDropId(null)}
        onConfirm={() => {
          if (dropId) void deleteSubmission(dropId).then(() => reload());
        }}
      />
    </div>
  );
}
