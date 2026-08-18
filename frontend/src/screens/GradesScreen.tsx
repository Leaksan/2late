import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { avgColor, weightedAverage } from "@/lib/domain";
import type { Grade } from "@/lib/types";
import { frNum } from "@/lib/utils";
import { useStore } from "@/store";

export function GradesScreen({ onBack }: { onBack: () => void }) {
  const { grades, addGrade, deleteGrade } = useStore();
  const [items, setItems] = useState<Grade[]>([]);
  const [open, setOpen] = useState(false);
  const [discipline, setDiscipline] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [coef, setCoef] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);

  const reload = () => void grades().then((d) => setItems(d.grades));
  useEffect(() => {
    reload();
  }, []);

  const global = useMemo(() => weightedAverage(items), [items]);
  const groups = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const g of items) {
      const list = map.get(g.discipline) ?? [];
      list.push(g);
      map.set(g.discipline, list);
    }
    return [...map.entries()]
      .map(([discipline, gs]) => ({ discipline, grades: gs, avg: weightedAverage(gs) }))
      .sort((a, b) => a.discipline.localeCompare(b.discipline, "fr"));
  }, [items]);

  return (
    <div className="screen pt-3">
      <PageHeader title="Mes notes" onBack={onBack} actions={<Button onClick={() => setOpen(true)}>Ajouter</Button>} />
      <Card className="mb-4 p-5 text-center">
        <div className="text-over uppercase text-muted-foreground">Moyenne générale pondérée</div>
        <div className="mt-2 text-display" style={{ color: avgColor(global) }}>
          {global == null ? "—" : frNum(global)}
          <small className="text-lg">/20</small>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {items.length === 0 ? "Enregistrez vos notes de devoirs pour calculer votre moyenne." : `${items.length} note${items.length > 1 ? "s" : ""}`}
        </div>
      </Card>
      {groups.map((g) => (
        <div key={g.discipline} className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <b>{g.discipline}</b>
            <span style={{ color: avgColor(g.avg) }}>{frNum(g.avg ?? 0)}/20</span>
          </div>
          {g.grades.map((grade) => (
            <Card key={grade.id} className="mb-2 flex items-center gap-3 p-3">
              <div className="flex-1">
                <div className="font-semibold">{grade.title}</div>
                <div className="text-xs text-muted-foreground">coef ×{frNum(grade.coef)}</div>
              </div>
              <span className="text-lg font-bold" style={{ color: avgColor(grade.value) }}>
                {frNum(grade.value)}
                <small>/20</small>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setDropId(grade.id)}>
                ×
              </Button>
            </Card>
          ))}
        </div>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une note</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const err = await addGrade({
                discipline,
                title,
                value: Number(value.replace(",", ".")),
                coef: Number(coef.replace(",", ".")),
              });
              setError(err);
              if (!err) {
                setOpen(false);
                setTitle("");
                setValue("");
                reload();
              }
            }}
          >
            <Label>Matière *</Label>
            <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} />
            <Label>Intitulé *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Note / 20</Label>
                <Input value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div>
                <Label>Coefficient</Label>
                <Input value={coef} onChange={(e) => setCoef(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Enregistrer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!dropId}
        title="Supprimer cette note ?"
        onOpenChange={(o) => !o && setDropId(null)}
        onConfirm={() => {
          if (dropId) void deleteGrade(dropId).then(reload);
        }}
      />
    </div>
  );
}
