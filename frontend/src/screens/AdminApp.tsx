import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthScreen } from "@/screens/AuthScreen";
import { AdminScreen } from "@/screens/AdminScreen";
import { DetailScreen } from "@/screens/DetailScreen";
import { apiSend } from "@/lib/api";
import { useStore } from "@/store";
import { ChevronLeft, KeyRound, LogOut, ShieldCheck } from "lucide-react";

// Interface d'administration séparée du site applicatif : connexion via
// /api/admin/login (comptes ADMIN uniquement), pilotage complet de 2late.
export function AdminApp() {
  const { ready, user, logout } = useStore();
  const [annId, setAnnId] = useState<string | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);

  const changePassword = async () => {
    setPwErr(null);
    if (pwNew !== pwConfirm) {
      setPwErr("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    try {
      await apiSend("/api/auth/password", "POST", { currentPassword: pwCurrent, newPassword: pwNew });
      setPwOk(true);
      window.setTimeout(() => {
        setPwOpen(false);
        setPwOk(false);
        setPwCurrent("");
        setPwNew("");
        setPwConfirm("");
      }, 1200);
    } catch (e: any) {
      setPwErr(e.message as string);
    }
  };

  useEffect(() => {
    document.title = "2late — Administration";
  }, []);

  if (!ready) {
    return <div className="flex min-h-dvh items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  if (!user || user.role !== "ADMIN") return <AuthScreen />;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="topbar">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-3 px-4">
          <Logo size={28} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-bold leading-tight">
              Administration 2late <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="text-meta text-muted-foreground">{user.name}</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setPwErr(null); setPwOk(false); setPwOpen(true); }}>
            <KeyRound className="h-4 w-4" /> Mot de passe
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setAnnId(null); void logout(); }}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 pb-8 pt-4">
        {annId ? (
          <>
            <Button variant="ghost" size="sm" className="mb-3" onClick={() => setAnnId(null)}>
              <ChevronLeft className="h-4 w-4" /> Retour au pilotage
            </Button>
            <DetailScreen id={annId} from="admin" hideBack onBack={() => setAnnId(null)} />
          </>
        ) : (
          <AdminScreen onOpen={setAnnId} />
        )}
      </main>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer mon mot de passe</DialogTitle>
          </DialogHeader>
          {pwOk ? (
            <p className="py-4 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Mot de passe mis à jour ✓
            </p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Mot de passe actuel</Label>
                <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} autoComplete="current-password" />
              </div>
              <div className="space-y-2">
                <Label>Nouveau mot de passe (6 caractères min.)</Label>
                <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label>Confirmer le nouveau mot de passe</Label>
                <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              {pwErr && <p className="text-sm text-red-500">{pwErr}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPwOpen(false)}>Annuler</Button>
                <Button className="flex-1" disabled={!pwCurrent || !pwNew || !pwConfirm} onClick={() => void changePassword()}>
                  Mettre à jour
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
