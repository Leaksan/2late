import { useEffect, useMemo, useState } from "react";
import { AnnouncementRow } from "@/components/today/AnnouncementRow";
import { FilterChips } from "@/components/today/FilterChips";
import { ReminderRow } from "@/components/today/ReminderRow";
import { SearchField } from "@/components/today/SearchField";
import { TodayStrip } from "@/components/today/TodayStrip";
import { UrgentStack } from "@/components/today/UrgentStack";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { InboxSkeleton } from "@/components/states/InboxSkeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { announce } from "@/lib/announce";
import { canPublish, liveSlotOf, nextTodaySlotOf, notesDueSoon, splitInbox, type FilterId } from "@/lib/domain";
import type { ScheduleSlot } from "@/lib/types";
import { useStore } from "@/store";
import { Bell, Eye, Plus } from "lucide-react";

export function TodayScreen({
  onOpen,
  onPublish,
  onScheduleSlot,
  onScheduleNote,
}: {
  onOpen: (id: string) => void;
  onPublish: () => void;
  onScheduleSlot: (slotId: string) => void;
  onScheduleNote: (noteId: string) => void;
}) {
  const { user, feedCache, scheduleCache, feed, schedule, openLink, revalidate, offline } = useStore();
  const [tab, setTab] = useState<"toRead" | "seen">("toRead");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterId>("ALL");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(!feedCache);
  const [error, setError] = useState<string | null>(null);
  const [evalPick, setEvalPick] = useState<ScheduleSlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(!feedCache);
    void Promise.all([feed(tab), schedule()])
      .then(() => {
        if (!cancelled) {
          setError(null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Impossible de charger");
          setLoading(false);
        }
      });
    void revalidate();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    setQ("");
    setFilter("ALL");
  }, [tab]);

  const source = tab === "toRead" ? (feedCache?.toRead ?? []) : (feedCache?.seen ?? []);
  const { urgentStack, inboxList, visible } = useMemo(() => splitInbox(source, filter, q, tab), [source, filter, q, tab]);
  const slots = scheduleCache?.slots ?? [];
  const notes = scheduleCache?.notes ?? [];
  const reminders = tab === "toRead" ? notesDueSoon(notes) : [];
  const live = liveSlotOf(slots);
  const nextToday = live ? undefined : nextTodaySlotOf(slots);
  const publish = canPublish(user);

  useEffect(() => {
    if (q || filter !== "ALL") announce(`${visible.length} résultat${visible.length > 1 ? "s" : ""}`);
  }, [visible.length, q, filter]);

  const openEval = async (s: ScheduleSlot) => {
    if (s.evalGroups.length > 1) {
      setEvalPick(s);
      return;
    }
    const url = await openLink(s.id, "eval", s.evalGroups[0]);
    window.open(url, "_blank", "noopener");
  };

  if (error && !feedCache) {
    return <ErrorState title="Impossible de charger" description={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="screen">
      <TodayStrip
        live={live}
        nextToday={nextToday}
        onOpenSchedule={onScheduleSlot}
        onVisio={(s) => void openLink(s.id, "visio").then((u) => window.open(u, "_blank", "noopener"))}
        onEval={(s) => void openEval(s)}
      />

      {reminders.map((note) => (
        <ReminderRow key={note.id} note={note} slot={slots.find((s) => s.id === note.slotId)} onOpen={onScheduleNote} />
      ))}

      <SearchField value={q} onChange={setQ} />
      <FilterChips value={filter} onChange={setFilter} />

      <Tabs className="mt-4" value={tab} onValueChange={(v) => setTab(v as "toRead" | "seen")}>
        <TabsList>
          <TabsTrigger value="toRead">
            <Bell className="h-3.5 w-3.5" /> À lire
            {feedCache ? ` · ${feedCache.toRead.length}` : ""}
          </TabsTrigger>
          <TabsTrigger value="seen">
            <Eye className="h-3.5 w-3.5" /> Vu récemment
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && <InboxSkeleton />}

      <UrgentStack items={urgentStack} expanded={expanded} onToggle={() => setExpanded((e) => !e)} onOpen={onOpen} />

      <div className="mt-3 flex flex-col gap-3">
        {inboxList.map((ann) => (
          <AnnouncementRow key={ann.id} ann={ann} q={q} showUrgentBadge={tab === "seen" || filter === "URGENTE"} onOpen={onOpen} />
        ))}
      </div>

      {!loading && visible.length === 0 && reminders.length === 0 && (
        <EmptyState
          icon={tab === "toRead" ? Bell : Eye}
          title={tab === "toRead" ? "Tout est lu" : "Historique vide"}
          description={
            tab === "toRead"
              ? "Aucune annonce en attente pour votre pôle. Revenez plus tard."
              : "Les annonces consultées basculent ici, triées par date de lecture."
          }
          action={{ label: "Voir le planning", onClick: () => onScheduleSlot("") }}
        />
      )}

      {publish && !offline && (
        <button className="fab" onClick={onPublish} aria-label="Publier une annonce">
          <Plus />
        </button>
      )}

      <Dialog open={!!evalPick} onOpenChange={() => setEvalPick(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Votre groupe d’évaluation</DialogTitle>
          </DialogHeader>
          {evalPick?.evalGroups.map((g) => (
            <Button
              key={g}
              className="w-full"
              onClick={() => {
                void openLink(evalPick.id, "eval", g).then((u) => {
                  window.open(u, "_blank", "noopener");
                  setEvalPick(null);
                });
              }}
            >
              {g}
            </Button>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
