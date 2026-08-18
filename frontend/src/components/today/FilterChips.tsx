import type { FilterId } from "@/lib/domain";
import { cn } from "@/lib/utils";

const CHIPS: { id: FilterId; label: string }[] = [
  { id: "ALL", label: "Tous" },
  { id: "URGENTE", label: "Urgent" },
  { id: "EVALUATION", label: "Éval" },
  { id: "DEVOIR", label: "Devoir" },
  { id: "VISIO", label: "Visio" },
  { id: "GENERALE", label: "Générale" },
  { id: "EMPLOI_DU_TEMPS", label: "EDT" },
  { id: "PARTICIPATIVE", label: "Collecte" },
  { id: "RELAIS", label: "Relais" },
  { id: "OFFICIEL", label: "Officiel" },
];

export function FilterChips({ value, onChange }: { value: FilterId; onChange: (v: FilterId) => void }) {
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer">
      {CHIPS.map((c) => (
        <button
          key={c.id}
          type="button"
          className={cn(
            "h-9 shrink-0 rounded-full border px-3 text-sm font-semibold",
            value === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
          )}
          aria-pressed={value === c.id}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
