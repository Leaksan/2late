import { useEffect, useMemo, useState } from "react";
import { ReliabilityBadge, RoleBadge, TypeBadge, UrgentBadge } from "@/components/RoleBadges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { filterAdminAnnouncements } from "@/lib/domain";
import type { Announcement, Role, User } from "@/lib/types";
import { POLES } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useStore } from "@/store";

export function AdminScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [qAnn, setQAnn] = useState("");
  const [fAnnRole, setFAnnRole] = useState<Role | "ALL">("ALL");
  const [relModal, setRelModal] = useState<{ id: string; title: string } | null>(null);
  const [relVal, setRelVal] = useState("99");
  const [relErr, setRelErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [staffOpen, setStaffOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [role, setRole] = useState<"PROF" | "ADMIN">("PROF");
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const reload = () => {
    void store.adminStats().then(setStats);
    void store.adminMembers().then(setMembers);
    void store.adminApplications().then(setApps);
    void store.adminComments().then(setComments);
    void store.adminAnnouncements().then(setAnnouncements);
  };
  useEffect(() => {
    reload();
  }, []);

  const filtered = members.filter((u) => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));
  const filteredAnns = useMemo(() => filterAdminAnnouncements(announcements, qAnn, fAnnRole), [announcements, qAnn, fAnnRole]);

  return (
    <div className="screen pt-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview">Stats</TabsTrigger>
          <TabsTrigger value="announcements">Annonces</TabsTrigger>
          <TabsTrigger value="users">Membres</TabsTrigger>
          <TabsTrigger value="applications">Candidatures</TabsTrigger>
          <TabsTrigger value="comments">Comm.</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && stats && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Étudiants inscrits</div>
              <div className="text-3xl font-extrabold">{stats.students}</div>
              <div className="text-xs text-muted-foreground">{stats.relais} relais</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Annonces</div>
              <div className="text-3xl font-extrabold">{stats.announcements}</div>
              <div className="text-xs text-muted-foreground">{stats.urgent} urgentes</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Commentaires</div>
              <div className="text-3xl font-extrabold">{stats.comments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Lecture moyenne</div>
              <div className="text-3xl font-extrabold">{stats.avgRead == null ? "—" : `${stats.avgRead}%`}</div>
            </Card>
          </div>
          <h3 className="text-over text-muted-foreground">Répartition par pôle</h3>
          <Card className="p-2">
            {POLES.map((p) => (
              <div key={p} className="flex items-center gap-3 px-3 py-2">
                <span className="w-12 text-xs font-bold">{p}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-card-2">
                  <div className="h-full bg-primary" style={{ width: `${((stats.byPole[p] || 0) / Math.max(...POLES.map((x) => stats.byPole[x] || 0), 1)) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs">{stats.byPole[p] || 0}</span>
              </div>
            ))}
          </Card>
          <h3 className="text-over text-muted-foreground">Annonces relais contestées</h3>
          {(stats.contested || []).map((c: any) => (
            <Card key={c.id} className="mb-2 flex items-center justify-between p-3">
              <div>
                <div className="font-semibold">{c.title}</div>
                <ReliabilityBadge pct={c.reliability.pct} total={c.reliability.total} overridden={c.reliability.overridden} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => onOpen(c.id)}>
                Ouvrir
              </Button>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={async () => {
              const data = await store.adminStats();
              const blob = new Blob([JSON.stringify(await (await fetch("/api/admin/export", { headers: { Authorization: `Bearer ${localStorage.getItem("2late.token")}` } })).json(), null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "2late-export.json";
              a.click();
              URL.revokeObjectURL(url);
              void data;
            }}
          >
            Exporter les données (JSON)
          </Button>
        </div>
      )}

      {tab === "announcements" && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Rechercher titre ou auteur…" value={qAnn} onChange={(e) => setQAnn(e.target.value)} />
            <select
              className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
              value={fAnnRole}
              onChange={(e) => setFAnnRole(e.target.value as Role | "ALL")}
              aria-label="Filtrer par rôle"
            >
              <option value="ALL">Tous rôles</option>
              <option value="PROF">PROF</option>
              <option value="RELAIS">RELAIS</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          {filteredAnns.map((ann) => (
            <Card key={ann.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{ann.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {ann.author?.name ?? "—"} · {timeAgo(ann.createdAt)} · {ann.poles.join(" · ")}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {ann.author && <RoleBadge role={ann.author.role} />}
                    {ann.priority === "URGENTE" && <UrgentBadge />}
                    <TypeBadge ann={ann} />
                    {ann.author?.role === "RELAIS" && (
                      <ReliabilityBadge pct={ann.reliability.pct} total={ann.reliability.total} overridden={ann.reliability.overridden} />
                    )}
                    {ann.publishAt && new Date(ann.publishAt).getTime() > Date.now() && (
                      <span className="rounded-full border border-border px-2 text-[11px]">programmée</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <button className="text-primary" onClick={() => onOpen(ann.id)}>
                    Ouvrir
                  </button>
                  {ann.author?.role === "RELAIS" && (
                    <button
                      onClick={() => {
                        setRelModal({ id: ann.id, title: ann.title });
                        setRelVal(ann.reliability.overridden && ann.reliability.pct != null ? String(ann.reliability.pct) : "99");
                        setRelErr(null);
                      }}
                    >
                      Fiabilité…
                    </button>
                  )}
                  <button
                    className="text-red-400"
                    onClick={() => void store.deleteAnnouncement(ann.id).then(reload)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {filteredAnns.length === 0 && <p className="text-sm text-muted-foreground">Aucune annonce ne correspond à la recherche.</p>}
        </div>
      )}

      {tab === "users" && (
        <div className="mt-4 space-y-3">
          <Input placeholder="Rechercher nom ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button className="w-full" onClick={() => setStaffOpen(true)}>
            + Créer un compte Prof / Admin
          </Button>
          {filtered.map((u) => (
            <Card key={u.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{u.name}</b>
                    <RoleBadge role={u.role} />
                    {u.disabled && <span className="text-xs text-muted-foreground">Désactivé</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {u.email}
                    {u.pole ? ` · ${u.pole}` : ""}
                  </div>
                </div>
                {u.id !== store.user?.id && (
                  <div className="flex flex-col items-end gap-1 text-xs">
                    {u.role === "ETUDIANT" && (
                      <button className="text-primary" onClick={() => void store.setRelais(u.id, true).then(reload)}>
                        Promouvoir Relais
                      </button>
                    )}
                    {u.role === "RELAIS" && (
                      <button onClick={() => void store.setRelais(u.id, false).then(reload)}>Révoquer Relais</button>
                    )}
                    <button
                      onClick={async () => {
                        const r = await store.resetLink(u.id);
                        setLink(`${window.location.origin}${window.location.pathname}${r.path}`);
                      }}
                    >
                      Lien de réinitialisation
                    </button>
                    <button onClick={() => void store.setDisabled(u.id, !u.disabled).then(reload)}>{u.disabled ? "Réactiver" : "Désactiver"}</button>
                    <button className="text-red-400" onClick={() => void store.deleteUser(u.id).then(reload)}>
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "applications" && (
        <div className="mt-4 space-y-3">
          {apps.filter((a) => a.status === "PENDING").map((a) => (
            <Card key={a.id} className="p-4">
              <div className="font-bold">{a.user?.name}</div>
              <div className="text-xs text-muted-foreground">
                {a.user?.pole} · {timeAgo(a.createdAt)} · {a.whatsapp}
              </div>
              <p className="mt-2 text-sm">{a.message}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void store.decideApp(a.id, false).then(reload)}>
                  Refuser
                </Button>
                <Button size="sm" onClick={() => void store.decideApp(a.id, true).then(reload)}>
                  Valider
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "comments" && (
        <div className="mt-4 space-y-3">
          {comments.map((c) => (
            <Card key={c.id} className="p-3">
              <div className="text-sm font-semibold">{c.author?.name}</div>
              <p className="text-sm">{c.body}</p>
              <div className="mt-1 flex gap-2 text-xs">
                {c.announcementId && (
                  <button className="text-primary" onClick={() => onOpen(c.announcementId)}>
                    {c.announcementTitle}
                  </button>
                )}
                <button className="text-red-400" onClick={() => void store.deleteComment(c.id).then(reload)}>
                  Supprimer
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau compte</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const e2 = await store.createStaff(name, email, pwd, role);
              setErr(e2);
              if (!e2) {
                setStaffOpen(false);
                reload();
              }
            }}
          >
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Label>E-mail</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            <Label>Mot de passe</Label>
            <Input value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={role === "PROF" ? "default" : "outline"} onClick={() => setRole("PROF")}>
                Prof
              </Button>
              <Button type="button" variant={role === "ADMIN" ? "default" : "outline"} onClick={() => setRole("ADMIN")}>
                Admin
              </Button>
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <Button type="submit" className="w-full">
              Créer
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!relModal} onOpenChange={() => setRelModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fiabilité de l’annonce</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">« {relModal?.title} »</p>
          <Label>Pourcentage affiché (0–100)</Label>
          <Input type="number" min={0} max={100} value={relVal} onChange={(e) => setRelVal(e.target.value)} />
          {relErr && <p className="text-sm text-red-400">{relErr}</p>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!relModal) return;
                void store.setReliability(relModal.id, null).then(() => {
                  setRelModal(null);
                  reload();
                });
              }}
            >
              Retirer la surcharge
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                const n = Number(relVal);
                if (!Number.isInteger(n) || n < 0 || n > 100) {
                  setRelErr("Entrez un nombre entier entre 0 et 100.");
                  return;
                }
                if (!relModal) return;
                void store.setReliability(relModal.id, n).then(() => {
                  setRelModal(null);
                  reload();
                });
              }}
            >
              Appliquer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!link} onOpenChange={() => setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lien de réinitialisation</DialogTitle>
          </DialogHeader>
          <code className="block break-all rounded-xl border border-dashed border-border p-3 text-xs text-primary">{link}</code>
          <p className="text-xs text-muted-foreground">Lien unique, 24 h. L’administration ne voit jamais le nouveau mot de passe.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
