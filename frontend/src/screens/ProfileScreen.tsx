import { useMemo, useState } from "react";
import { RoleBadge } from "@/components/RoleBadges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { weightedAverage } from "@/lib/domain";
import { ROLE_LABELS } from "@/lib/types";
import { formatDateTime, frNum, initials } from "@/lib/utils";
import { resolveUiFlag, setUiFlag } from "@/lib/ui-flag";
import { useStore } from "@/store";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GraduationCap, LogOut, Megaphone } from "lucide-react";
import { useEffect } from "react";
import type { Grade } from "@/lib/types";

export function ProfileScreen({ onOpenGrades }: { onOpenGrades: () => void }) {
  const { user, logout, applyRelais, setWhatsapp, myApplication, grades } = useStore();
  const [wa, setWa] = useState(user?.whatsapp ?? "");
  const [waErr, setWaErr] = useState<string | null>(null);
  const [appOpen, setAppOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [appWa, setAppWa] = useState("");
  const [appErr, setAppErr] = useState<string | null>(null);
  const [myGrades, setMyGrades] = useState<Grade[]>([]);
  const [waOk, setWaOk] = useState(false);
  const [uiV2, setUiV2] = useState(() => resolveUiFlag() === "v2");

  useEffect(() => {
    void grades().then((d) => setMyGrades(d.grades));
  }, [grades]);

  const avg = useMemo(() => weightedAverage(myGrades), [myGrades]);
  if (!user) return null;

  return (
    <div className="screen pt-3">
      <Card className="mb-4 flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card-2 text-lg font-extrabold text-primary">{initials(user.name)}</div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{user.name}</span>
            <RoleBadge role={user.role} />
          </div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
          <div className="text-sm text-muted-foreground">
            {user.pole ? `Pôle ${user.pole} · ` : ""}
            {ROLE_LABELS[user.role]} · inscrit le {formatDateTime(user.createdAt).split(" à ")[0]}
          </div>
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <Label>Mon numéro WhatsApp</Label>
        <div className="mt-2 flex gap-2">
          <Input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="+241 06 12 34 56" />
          <Button
            variant="outline"
            onClick={async () => {
              const e = await setWhatsapp(wa);
              setWaErr(e);
              setWaOk(!e);
            }}
          >
            Enregistrer
          </Button>
        </div>
        {waErr && <p className="mt-1 text-sm text-destructive">{waErr}</p>}
        {waOk && !waErr && (
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400" role="status">
            Numéro enregistré.
          </p>
        )}
      </Card>

      <h2 className="mb-2 text-over uppercase text-muted-foreground">Interface</h2>
      <Card className="mb-4 p-4">
        <label className="flex cursor-pointer items-start gap-3 p-3 -m-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5"
            checked={uiV2}
            onChange={(e) => {
              const next = e.target.checked;
              setUiV2(next);
              setUiFlag(next ? "v2" : "v1");
              window.location.reload();
            }}
          />
          <span>
            <span className="font-semibold">Nouvelle interface</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">Accueil command center, 4 onglets, menu Plus.</span>
          </span>
        </label>
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold">Thème</div>
          <ThemeToggle />
        </div>
      </Card>

      <h2 className="mb-2 text-over text-muted-foreground">Résultats</h2>
      <Card className="mb-4 flex items-center gap-3 p-4">
        <GraduationCap className="text-muted-foreground" />
        <div className="flex-1">
          <div className="font-semibold">Mes notes & moyenne</div>
          <div className="text-sm text-muted-foreground">
            {myGrades.length > 0 ? `${myGrades.length} notes · moyenne ${frNum(avg ?? 0)}/20` : "Enregistrez vos notes de devoirs."}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenGrades}>
          Ouvrir
        </Button>
      </Card>

      {user.role === "ETUDIANT" && (
        <>
          <h2 className="mb-2 text-over text-muted-foreground">Statut Relais</h2>
          <Card className="mb-4 flex items-center gap-3 p-4">
            <Megaphone className="text-muted-foreground" />
            <div className="flex-1">
              <div className="font-semibold">{myApplication ? "Candidature envoyée" : "Devenir Relais"}</div>
              <div className="text-sm text-muted-foreground">
                {myApplication ? "En attente de validation par l’administration." : "Relayer les infos utiles de votre pôle."}
              </div>
            </div>
            {!myApplication && (
              <Button size="sm" onClick={() => setAppOpen(true)}>
                Postuler
              </Button>
            )}
          </Card>
        </>
      )}

      <h2 className="mb-2 text-over text-muted-foreground">Session</h2>
      <Card className="flex items-center gap-3 p-4">
        <LogOut className="text-muted-foreground" />
        <div className="flex-1">
          <div className="font-semibold">Se déconnecter</div>
          <div className="text-sm text-muted-foreground">Vous revenez à l’écran de connexion.</div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Déconnexion
        </Button>
      </Card>

      <Dialog open={appOpen} onOpenChange={setAppOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidature Relais</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const err = await applyRelais(msg, appWa);
              setAppErr(err);
              if (!err) setAppOpen(false);
            }}
          >
            <Label>Message de motivation *</Label>
            <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} />
            <Label>Numéro WhatsApp *</Label>
            <Input value={appWa} onChange={(e) => setAppWa(e.target.value)} />
            {appErr && <p className="text-sm text-red-400">{appErr}</p>}
            <Button type="submit" className="w-full">
              Envoyer ma candidature
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
