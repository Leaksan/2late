import { evalCountdownLabel, evalStateOf } from "@/lib/domain";
import type { ScheduleSlot } from "@/lib/types";
import { useNow } from "@/hooks/useNow";
import { BookOpen, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TodayStrip({
  live,
  nextToday,
  onOpenSchedule,
  onVisio,
  onEval,
}: {
  live?: ScheduleSlot;
  nextToday?: ScheduleSlot;
  onOpenSchedule: (slotId: string) => void;
  onVisio: (slot: ScheduleSlot) => void;
  onEval: (slot: ScheduleSlot) => void;
}) {
  const slot = live ?? nextToday;
  const tick = live && (evalStateOf(live) === "open" || evalStateOf(live) === "plain") ? 1000 : 30_000;
  const now = useNow(tick);
  if (!slot) return null;

  const evalState = live ? evalStateOf(live, now) : "none";
  const ends = live?.evalStartsAt && live.evalMinutes ? Date.parse(live.evalStartsAt) + live.evalMinutes * 60_000 : 0;
  const showVisio = !!live && live.hasVisio && live.visioOpen && !live.coursePostponed;
  const showEval = !!live && (evalState === "open" || evalState === "plain");

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
      <button type="button" className="flex items-start gap-3 text-left" onClick={() => onOpenSchedule(slot.id)}>
        {live && <span className="live-dot mt-1.5" />}
        <div>
          <div className="font-bold">
            {live ? `En cours · ${live.discipline}` : `Prochain · ${nextToday!.discipline}`}
          </div>
          <div className="text-meta text-muted-foreground">
            {slot.start}–{slot.end}
            {slot.room ? ` · ${slot.room}` : ""}
            {slot.teacherName ? ` · ${slot.teacherName}` : ""}
          </div>
        </div>
      </button>
      {(showVisio || showEval) && (
        <div className="flex flex-wrap gap-2">
          {showVisio && (
            <Button className="h-11" size="sm" variant="outline" onClick={() => onVisio(live!)}>
              <Video className="h-4 w-4" /> Visio
            </Button>
          )}
          {showEval && (
            <Button className="h-11" size="sm" variant="outline" onClick={() => onEval(live!)}>
              <BookOpen className="h-4 w-4" />
              {evalState === "open" ? `Éval ${evalCountdownLabel(ends, now)}` : "Évaluation"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
