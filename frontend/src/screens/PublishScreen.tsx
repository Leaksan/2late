import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canSetUrgente } from "@/lib/domain";
import {
  COLLECT_ACCESS_LABELS,
  POLES,
  POLE_LABELS,
  REPEAT_LABELS,
  TYPES,
  TYPE_INFO,
  type AnnouncementType,
  type CollectAccess,
  type Pole,
  type Priority,
  type RepeatKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";

export function PublishScreen({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { user, publish, offline } = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AnnouncementType>("GENERALE");
  const [description, setDescription] = useState("");
  const [poles, setPoles] = useState<Pole[]>(user?.pole ? [user.pole] : []);
  const [priority, setPriority] = useState<Priority>("NORMALE");
  const [collectAccess, setCollectAccess] = useState<CollectAccess>("PROF");
  const [collectEmail, setCollectEmail] = useState("");
  const [repeat, setRepeat] = useState<RepeatKind | null>(null);
  const [publishAt, setPublishAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const urgente = user ? canSetUrgente(user) : false;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    const err = await publish({
      title,
      type,
      description,
      poles,
      priority,
      collectAccess,
      collectEmail,
      repeat,
      publishAt: publishAt ? new Date(publishAt).toISOString() : null,
    });
    if (err) setError(err);
    else onDone();
  };

  return (
    <div className="screen pt-3">
      <PageHeader title={step === 1 ? "Quoi" : "Qui & quand"} onBack={step === 1 ? onCancel : () => setStep(1)} />
      <form onSubmit={submit} className="space-y-5">
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label>Titre de l’annonce *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Report de l’examen de statistiques" maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-1 gap-2">
                {TYPES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={cn("rounded-lg border px-3 py-3 text-left text-sm font-semibold", type === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                    onClick={() => setType(t)}
                  >
                    {TYPE_INFO[t].label}
                  </button>
                ))}
              </div>
            </div>
            {type === "PARTICIPATIVE" && (
              <div className="space-y-2">
                <Label>Qui pourra télécharger les documents collectés ?</Label>
                <div className="flex flex-col gap-2">
                  {(["AUTHOR", "PROF", "RELAIS"] as CollectAccess[]).map((a) => (
                    <button
                      type="button"
                      key={a}
                      className={cn("rounded-full border px-4 py-2 text-left text-sm", collectAccess === a ? "border-primary text-primary" : "border-border text-muted-foreground")}
                      onClick={() => setCollectAccess(a)}
                    >
                      {COLLECT_ACCESS_LABELS[a]}
                    </button>
                  ))}
                </div>
                <Label>Réception automatique par e-mail</Label>
                <Input type="email" value={collectEmail} onChange={(e) => setCollectEmail(e.target.value)} placeholder={user?.email} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails, horaires, salle, source…" />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="space-y-2">
              <Label>Pôles cibles *</Label>
              <div className="flex flex-wrap gap-2">
                {POLES.map((p) => (
                  <button
                    type="button"
                    key={p}
                    title={POLE_LABELS[p]}
                    className={cn("rounded-full border px-4 py-2 text-sm font-semibold", poles.includes(p) ? "border-primary text-primary" : "border-border text-muted-foreground")}
                    onClick={() => setPoles((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={cn("rounded-lg border py-3 font-semibold", priority === "NORMALE" ? "border-primary text-primary" : "border-border")} onClick={() => setPriority("NORMALE")}>
                  Normale
                </button>
                <button
                  type="button"
                  disabled={!urgente}
                  className={cn("rounded-lg border py-3 font-semibold disabled:opacity-40", priority === "URGENTE" ? "border-destructive text-destructive" : "border-border")}
                  onClick={() => setPriority("URGENTE")}
                >
                  Urgente
                </button>
              </div>
              {!urgente && <p className="text-xs text-muted-foreground">La priorité urgente est réservée aux professeurs et à l’administration.</p>}
            </div>
            <div className="space-y-2">
              <Label>Publication programmée</Label>
              <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Annonce répétée</Label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={cn("rounded-full border px-3 py-1.5 text-sm", !repeat ? "border-primary text-primary" : "border-border")} onClick={() => setRepeat(null)}>
                  Ponctuelle
                </button>
                {(["DAILY", "WEEKLY", "MONTHLY"] as RepeatKind[]).map((r) => (
                  <button key={r} type="button" className={cn("rounded-full border px-3 py-1.5 text-sm", repeat === r ? "border-primary text-primary" : "border-border")} onClick={() => setRepeat(r)}>
                    {REPEAT_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="font-semibold">{title || "Sans titre"}</div>
              <div className="text-muted-foreground">{poles.join(" · ") || "Aucun pôle"}</div>
            </div>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={step === 1 ? onCancel : () => setStep(1)}>
            {step === 1 ? "Annuler" : "Retour"}
          </Button>
          <Button type="submit" className="flex-1" disabled={offline}>
            {step === 1 ? "Continuer" : "Publier"}
          </Button>
        </div>
      </form>
    </div>
  );
}
