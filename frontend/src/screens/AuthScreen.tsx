import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ADMIN_BUILD } from "@/lib/admin";
import { POLES, POLE_LABELS, type Pole } from "@/lib/types";
import { useStore } from "@/store";
import { cn } from "@/lib/utils";

export function AuthScreen() {
  const { login, register } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pole, setPole] = useState<Pole>("STI");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = mode === "login" ? await login(email, password) : await register(name, email, password, pole);
    setBusy(false);
    setError(err);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[22px] border border-border bg-card shadow-lg">
          <Logo size={46} />
        </div>
        <div className="text-4xl font-extrabold tracking-tight">
          2<em className="not-italic text-primary">late</em>
          {ADMIN_BUILD && <span className="ml-2 align-middle text-sm font-bold uppercase tracking-widest text-muted-foreground">Administration</span>}
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">
          {ADMIN_BUILD
            ? "Interface réservée à l’administration — accès via compte autorisé uniquement."
            : "Les annonces officielles et communautaires de l’université — centralisées, lisibles, vérifiées."}
        </p>
      </div>

      <Card className="w-full max-w-[400px]">
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Grace Ondo" autoComplete="name" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Adresse e-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@univ.ga" autoComplete="email" aria-invalid={!!error} />
            </div>
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
            {mode === "register" && (
              <div className="space-y-2">
                <Label>Pôle académique</Label>
                <div className="flex flex-wrap gap-2">
                  {POLES.map((p) => (
                    <button
                      type="button"
                      key={p}
                      title={POLE_LABELS[p]}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold",
                        pole === p ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                      )}
                      onClick={() => setPole(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{POLE_LABELS[pole]}</p>
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button className="w-full" type="submit" disabled={busy}>
              {mode === "login" ? "Se connecter" : "Créer mon compte étudiant"}
            </Button>
          </form>

         {!ADMIN_BUILD && (
   <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Pas encore de compte ?{" "}
                <button type="button" className="font-semibold text-primary underline" onClick={() => { setMode("register"); setError(null); }}>
                  S’inscrire
                </button>
              </>
            ) : (
              <>
                Déjà inscrit ?{" "}
                <button type="button" className="font-semibold text-primary underline" onClick={() => { setMode("login"); setError(null); }}>
                  Se connecter
                </button>
              </>
            )}
          </p>
 )}
        </CardContent>
      </Card>
    </div>
  );
}
