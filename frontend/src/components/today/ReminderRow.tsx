import { Card } from "@/components/ui/card";
import type { CourseNote, ScheduleSlot } from "@/lib/types";
import { DAY_LABELS } from "@/lib/types";
import { countdown } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import { Clock } from "lucide-react";

export function ReminderRow({ note, slot, onOpen }: { note: CourseNote; slot?: ScheduleSlot; onOpen: (noteId: string) => void }) {
  const soon = note.dueAt ? Date.parse(note.dueAt) - Date.now() < 3600_000 : false;
  const now = useNow(soon ? 1000 : 30_000);
  const cd = note.dueAt ? countdown(note.dueAt, now) : null;
  return (
    <button type="button" className="w-full text-left" onClick={() => onOpen(note.id)}>
      <Card className="mt-3 flex min-h-12 items-center gap-3 border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
        <Clock className="h-4 w-4 shrink-0 text-yellow-700 dark:text-yellow-300" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">N’oublie pas : {note.body}</div>
          <div className="text-meta text-muted-foreground">
            {slot ? `${slot.discipline} · ${DAY_LABELS[slot.day]} ${slot.start}` : "Cours"}
          </div>
        </div>
        {cd && <span className={`text-meta font-semibold ${cd.late ? "text-destructive" : ""}`}>{cd.late ? "dépassé" : cd.text}</span>}
      </Card>
    </button>
  );
}
