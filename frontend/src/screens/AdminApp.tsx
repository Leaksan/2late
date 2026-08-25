import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { AuthScreen } from "@/screens/AuthScreen";
import { AdminScreen } from "@/screens/AdminScreen";
import { DetailScreen } from "@/screens/DetailScreen";
import { useStore } from "@/store";
import { ChevronLeft, LogOut, ShieldCheck } from "lucide-react";

// Interface d'administration séparée du site applicatif : connexion via
// /api/admin/login (comptes ADMIN uniquement), pilotage complet de 2late.
export function AdminApp() {
  const { ready, user, logout } = useStore();
  const [annId, setAnnId] = useState<string | null>(null);

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
    </div>
  );
}
