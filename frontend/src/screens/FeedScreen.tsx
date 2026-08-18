import { useEffect, useState } from "react";
import { ReliabilityBadge, RoleBadge, TypeBadge, UrgentBadge } from "@/components/RoleBadges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notesDueSoon, stripeColor } from "@/lib/domain";
import type { Announcement, CourseNote, ScheduleSlot } from "@/lib/types";
import { DAY_LABELS } from "@/lib/types";
import { countdown, timeAgo } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import { useStore } from "@/store";
import { Bell, Clock, Eye, MessageCircle, Plus } from "lucide-react";

export function FeedScreen({ onOpen, onPublish }: { onOpen: (id: string) => void; onPublish: () => void }) {
  const { user, feed, schedule } = useStore();
  const [tab, setTab] = useState<"toRead" | "seen">("toRead");
  const [list, setList] = useState<Announcement[]>([]);
  const [notes, setNotes] = useState<CourseNote[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  useNow(1000);

  useEffect(() => {
    void feed(tab).then(setList);
    void schedule().then((s) => {
      setNotes(s.notes);
      setSlots(s.slots);
    });
  }, [tab, feed, schedule]);

  const reminders = notesDueSoon(notes);
  const canPublish = user && (user.role === "PROF" || user.role === "RELAIS" || user.role === "ADMIN");
  const urgent = list.filter((a) => a.priority === "URGENTE").length;

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "toRead" | "seen")}>
        <TabsList>
          <TabsTrigger value="toRead">
            <Bell className="h-3.5 w-3.5" /> À lire
          </TabsTrigger>
          <TabsTrigger value="seen">
            <Eye className="h-3.5 w-3.5" /> Vu récemment
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {urgent > 0 && tab === "toRead" && (
        <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
          <b className="text-red-400">{urgent}</b> annonce{urgent > 1 ? "s" : ""} urgente{urgent > 1 ? "s" : ""} non lue{urgent > 1 ? "s" : ""} — elles apparaissent en tête de liste.
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {tab === "toRead" &&
          reminders.map((note) => {
            const cd = countdown(note.dueAt!);
            const slot = slots.find((s) => s.id === note.slotId);
            return (
              <Card key={note.id} className="border-yellow-500/30 bg-yellow-500/5 p-4">
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-yellow-300">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Rappel · note perso
                  </span>
                  <span className={cd.late ? "text-red-400" : ""}>{cd.late ? "dépassé" : cd.text}</span>
                </div>
                <p className="text-sm">N’oublie pas : {note.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {slot ? `${slot.discipline} · ${DAY_LABELS[slot.day]} ${slot.start}` : "Cours"}
                </p>
              </Card>
            );
          })}

        {list.map((ann) => (
          <button key={ann.id} className="w-full text-left" onClick={() => onOpen(ann.id)}>
            <Card className="flex gap-3 p-4">
              <div className="ann-stripe" style={{ background: stripeColor(ann.author?.role ?? "ETUDIANT") }} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {ann.author && <RoleBadge role={ann.author.role} />}
                  {ann.priority === "URGENTE" && <UrgentBadge />}
                  <TypeBadge ann={ann} />
                  {ann.author?.role === "RELAIS" && (
                    <ReliabilityBadge pct={ann.reliability.pct} total={ann.reliability.total} overridden={ann.reliability.overridden} />
                  )}
                </div>
                <div className="text-[16px] font-semibold leading-snug">{ann.title}</div>
                {ann.description && <p className="line-clamp-2 text-[13.5px] text-muted-foreground">{ann.description}</p>}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{ann.author?.name ?? "Auteur inconnu"}</span>
                  <span>·</span>
                  <span>{timeAgo(ann.createdAt)}</span>
                  {ann.commentCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> {ann.commentCount}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {list.length === 0 && reminders.length === 0 && (
        <div className="px-6 py-16 text-center text-muted-foreground">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
            {tab === "toRead" ? <Bell /> : <Eye />}
          </div>
          <b className="text-foreground">{tab === "toRead" ? "Tout est lu" : "Historique vide"}</b>
          <p className="mx-auto mt-1 max-w-xs text-sm">
            {tab === "toRead"
              ? "Aucune annonce en attente pour votre pôle. Revenez plus tard."
              : "Les annonces consultées basculent ici, triées par date de lecture."}
          </p>
        </div>
      )}

      {canPublish && (
        <button className="fab" onClick={onPublish} aria-label="Publier une annonce">
          <Plus />
        </button>
      )}
    </>
  );
}
