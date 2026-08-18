import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/store";
import { CheckCircle2 } from "lucide-react";

export function ResetPasswordScreen({ token, onExit }: { token: string; onExit: () => void }) {
  const { peekReset, consumeReset } = useStore();
  const [mode, setMode] = useState<"form" | "success" | "invalid">("form");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    void peekReset(token).then((r) => {
      if (!r.valid) setMode("invalid");
    });
  }, [token, peekReset]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== pwd2) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    const err = await consumeReset(token, pwd);
    setError(err);
    if (!err) setMode("success");
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[22px] border border-border bg-card">
          <Logo size={46} />
        </div>
        <div className="text-4xl font-extrabold tracking-tight">
          2<em className="not-italic text-primary">late</em>
        </div>
        <p className="text-sm text-muted-foreground">Réinitialisation sécurisée de votre mot de passe.</p>
      </div>
      <Card className="w-full max-w-[400px]">
        <CardContent className="pt-6">
          {mode === "invalid" && (
            <>
              <p className="text-center text-sm">Ce lien est invalide, déjà utilisé ou expiré (validité 24 h, usage unique).</p>
              <p className="mt-2 text-center text-xs text-muted-foreground">Demandez un nouveau lien à l’administration.</p>
              <Button className="mt-4 w-full" onClick={onExit}>
                Retour à l’application
              </Button>
            </>
          )}
          {mode === "success" && (
            <>
              <p className="flex items-start gap-2 text-sm text-emerald-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4" /> Votre mot de passe a été modifié avec succès.
              </p>
              <Button className="mt-4 w-full" onClick={onExit}>
                Aller à la connexion
              </Button>
            </>
          )}
          {mode === "form" && (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nouveau mot de passe</Label>
                <Input type={show ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="4 caractères minimum" />
              </div>
              <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <Input type={show ? "text" : "password"} value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Répétez le mot de passe" />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={show} onCheckedChange={(v) => setShow(Boolean(v))} /> Afficher les mots de passe
              </label>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button className="w-full" type="submit">
                Définir mon nouveau mot de passe
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
