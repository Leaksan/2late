import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { evalCountdownLabel, liveSlotOf, nextSlotOf, notesDueSoon } from "@/lib/domain";
import type { CourseNote, Pole, ScheduleSlot, WeekDay } from "@/lib/types";
import { DAY_LABELS, POLES, WEEK_DAYS } from "@/lib/types";
import { cn, countdown } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import { useStore } from "@/store";
import { BookOpen, Clock, Pause, Plus, Video } from "lucide-react";

interface SlotDraft {
  id?: string;
  pole: Pole;
  day: WeekDay;
  start: string;
  end: string;
  discipline: string;
  teacherName: string;
  room: string;
  visioUrl: string;
  evalUrl: string;
  evalStartsAt: string;
  evalMinutes: string;
  evalLinksText: string;
  visioOpen: boolean;
  evalOpen: boolean;
  coursePostponed: boolean;
  evalPostponed: boolean;
  postponedReason: string;
}

function toLocalDT(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromSlot(s: Partial<ScheduleSlot> & { pole?: Pole }): SlotDraft {
  const links = s.evalLinks ?? [];
  return {
    id: s.id,
    pole: (s.pole as Pole) || "STI",
    day: (s.day as WeekDay) || "LUNDI",
    start: s.start || "08:00",
    end: s.end || "10:00",
    discipline: s.discipline || "",
    teacherName: s.teacherName || "",
    room: s.room || "",
    visioUrl: s.visioUrl || "",
    evalUrl: s.evalUrl || "",
    evalStartsAt: toLocalDT(s.evalStartsAt),
    evalMinutes: s.evalMinutes != null ? String(s.evalMinutes) : "",
    evalLinksText: links.map((l) => `${l.group}|${l.url}`).join("\n"),
    visioOpen: s.visioOpen ?? true,
    evalOpen: s.evalOpen ?? true,
    coursePostponed: !!s.coursePostponed,
    evalPostponed: !!s.evalPostponed,
    postponedReason: s.postponedReason || "",
  };
}

export function ScheduleScreen() {
  const { user, schedule, openLink, upsertSlot, deleteSlot, upsertNote, deleteNote } = useStore();
  const now = useNow(1000);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [notes, setNotes] = useState<CourseNote[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [viewPole, setViewPole] = useState<Pole | "ALL">("ALL");
  const [form, setForm] = useState<SlotDraft | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [noteSlot, setNoteSlot] = useState<ScheduleSlot | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteDone, setNoteDone] = useState(false);
  const [hasDue, setHasDue] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("23:59");
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const [evalPick, setEvalPick] = useState<ScheduleSlot | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [flashId, setFlashId] = useState<string | null>(null);

  // Défile jusqu'au créneau et le met en évidence (liseré vert 2 s).
  const scrollToSlot = (id: string) => {
    slotRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(id);
    window.setTimeout(() => setFlashId(null), 2000);
  };

  const reload = () =>
    void schedule(user?.pole ? undefined : viewPole === "ALL" ? undefined : viewPole).then((s) => {
      setSlots(s.slots);
      setNotes(s.notes);
      setCanManage(s.canManage);
    });

  useEffect(() => {
    reload();
  }, [viewPole]);

  if (!user) return null;
  const live = liveSlotOf(slots, new Date(now));
  const next = !live ? nextSlotOf(slots, new Date(now)) : undefined;
  const due = notesDueSoon(notes, now);
  // Évaluation dont la fenêtre chronométrée est actuellement ouverte.
  const liveEval = slots.find((s) => s.evalState === "open");
  const liveEvalEnds = liveEval?.evalStartsAt && liveEval.evalMinutes ? Date.parse(liveEval.evalStartsAt) + liveEval.evalMinutes * 60_000 : 0;
  const grouped = WEEK_DAYS.map((day) => ({ day, items: slots.filter((s) => s.day === day) })).filter((g) => g.items.length);

  const openEval = async (s: ScheduleSlot) => {
    if (s.evalGroups.length > 1) {
      setEvalPick(s);
      return;
    }
    const url = await openLink(s.id, "eval", s.evalGroups[0]);
    window.open(url, "_blank", "noopener");
  };

  const openNote = (s: ScheduleSlot) => {
    const existing = notes.find((n) => n.slotId === s.id);
    setNoteSlot(s);
    setNoteBody(existing?.body || "");
    setNoteDone(!!existing?.done);
    setHasDue(!!existing?.dueAt);
    if (existing?.dueAt) {
      const d = new Date(existing.dueAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      setDueDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setDueTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setDueDate("");
      setDueTime("23:59");
    }
    setNoteErr(null);
  };

  return (
    <div>
      {!user.pole && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button className={cn("rounded-full border px-3 py-1 text-sm", viewPole === "ALL" && "border-primary text-primary")} onClick={() => setViewPole("ALL")}>
            Tous
          </button>
          {POLES.map((p) => (
            <button key={p} className={cn("rounded-full border px-3 py-1 text-sm", viewPole === p && "border-primary text-primary")} onClick={() => setViewPole(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      {due.length > 0 && (
        <div className="mb-3 rounded-3xl border border-yellow-600/40 bg-yellow-500/10 px-4 py-3">
          <b className="inline-flex items-center gap-1 text-sm text-yellow-700 dark:text-yellow-200">
            <Clock className="h-4 w-4" /> N’oublie pas — échéance dans moins de 48 h
          </b>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {due.slice(0, 3).map((n) => {
              const s = slots.find((x) => x.id === n.slotId);
              const cd = countdown(n.dueAt!, now);
              return (
                <button key={n.id} className="block w-full cursor-pointer text-left" onClick={() => s && scrollToSlot(s.id)} title="Voir le créneau concerné">
                  <span className={cd.late ? "text-red-500 dark:text-red-400" : "text-yellow-700 dark:text-yellow-200"}>{cd.text}</span> · {s ? s.discipline : "Cours"} — {n.body}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {live && (
        <button className="mb-4 flex w-full items-center gap-3 rounded-3xl border border-emerald-500/40 bg-emerald-400/10 px-4 py-3 text-left" onClick={() => scrollToSlot(live.id)}>
          <span className="live-dot" />
          <div>
            <b>En cours · {live.discipline}</b>
            <div className="text-xs text-muted-foreground">
              {live.start}–{live.end} · {live.teacherName}
              {live.room ? ` · ${live.room}` : ""}
            </div>
          </div>
        </button>
      )}

      {liveEval && (
        <button
          className="mb-4 flex w-full items-center gap-3 rounded-3xl border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-left"
          onClick={() => scrollToSlot(liveEval.id)}
        >
          <Clock className="h-5 w-5 flex-none text-yellow-600 dark:text-yellow-300" />
          <div>
            <b className="text-yellow-700 dark:text-yellow-200">Évaluation en cours · {liveEval.discipline}</b>
            <div className="text-xs text-muted-foreground">
              fermeture dans <b className="tabular-nums text-yellow-700 dark:text-yellow-200">{evalCountdownLabel(liveEvalEnds, now)}</b> — touchez pour voir le créneau
            </div>
          </div>
        </button>
      )}

      {!live && next && (
        <button className="mb-4 block w-full rounded-3xl border border-primary/25 bg-primary/10 px-4 py-3 text-left text-sm" onClick={() => scrollToSlot(next.id)}>
          Prochain cours : <b>{next.discipline}</b> — {DAY_LABELS[next.day]} {next.start}, {next.teacherName}.
        </button>
      )}

      {grouped.map(({ day, items }) => (
        <div key={day} className="mb-5">
          <div className="mb-2 text-over text-muted-foreground">{DAY_LABELS[day]}</div>
          {items.map((s) => {
            const note = notes.find((n) => n.slotId === s.id);
            const ends = s.evalStartsAt && s.evalMinutes ? Date.parse(s.evalStartsAt) + s.evalMinutes * 60_000 : 0;
            return (
              <div key={s.id} ref={(el) => { slotRefs.current[s.id] = el; }} className={flashId === s.id ? "slot-flash" : undefined}>
                <Card className="mb-2 flex gap-3 p-3">
                <div className="flex w-14 flex-col items-center justify-center rounded-xl border border-border bg-card-2 py-2 text-center">
                  <b>{s.start}</b>
                  <span className="text-[11px] text-muted-foreground">{s.end}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{s.discipline}</div>
                  <div className="text-sm text-muted-foreground">
                    {s.teacherName}
                    {s.room ? ` · ${s.room}` : ""}
                  </div>
                  {s.coursePostponed && <div className="text-xs text-yellow-300">Cours reporté{s.postponedReason ? ` — ${s.postponedReason}` : ""}</div>}
                  {s.evalPostponed && <div className="text-xs text-yellow-300">Évaluation reportée</div>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.hasVisio && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!s.visioOpen || s.coursePostponed}
                        onClick={() => void openLink(s.id, "visio").then((u) => window.open(u, "_blank", "noopener"))}
                      >
                        <Video className="h-3.5 w-3.5" /> Visio
                      </Button>
                    )}
                    {s.hasEval && (
                      <Button size="sm" variant="outline" disabled={s.evalState !== "open" && s.evalState !== "plain"} onClick={() => void openEval(s)}>
                        <BookOpen className="h-3.5 w-3.5" />
                        {s.evalState === "upcoming"
                          ? "ouvre bientôt"
                          : s.evalState === "ended"
                            ? "terminée"
                            : s.evalState === "open"
                              ? `Éval ${evalCountdownLabel(ends, now)}`
                              : "Évaluation"}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openNote(s)}>
                      Note
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void upsertSlot({ id: s.id, coursePostponed: !s.coursePostponed }).then(reload)}
                        >
                          <Pause className="h-3.5 w-3.5" /> {s.coursePostponed ? "Rétablir le cours" : "Reporter le cours"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void upsertSlot({ id: s.id, evalPostponed: !s.evalPostponed, evalOpen: s.evalPostponed }).then(reload)}
                        >
                          {s.evalPostponed ? "Rétablir l’éval." : "Reporter l’éval."}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setForm(fromSlot(s)); setFormErr(null); }}>
                          Modifier
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => void deleteSlot(s.id).then(reload)}>
                          Suppr.
                        </Button>
                      </>
                    )}
                  </div>
                  {note && !note.done && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Note : {note.body}
                      {note.dueAt ? ` · avant ${countdown(note.dueAt, now).text}` : ""}
                    </p>
                  )}
                </div>
              </Card>
              </div>
            );
          })}
        </div>
      ))}

      {canManage && (
        <button
          className="fab"
          onClick={() => {
            setForm(fromSlot({ pole: user.pole || "STI", day: "LUNDI", start: "08:00", end: "10:00", visioOpen: true, evalOpen: true }));
            setFormErr(null);
          }}
          aria-label="Ajouter un créneau"
        >
          <Plus />
        </button>
      )}

      <Dialog open={!!form} onOpenChange={() => setForm(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Modifier le créneau" : "Nouveau créneau"}</DialogTitle>
          </DialogHeader>
          {form && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const evalLinks = form.evalLinksText
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [group, ...rest] = line.split("|");
                    return { group: group.trim(), url: rest.join("|").trim() };
                  })
                  .filter((l) => l.url);
                void upsertSlot({
                  id: form.id,
                  pole: form.pole,
                  day: form.day,
                  start: form.start,
                  end: form.end,
                  discipline: form.discipline,
                  teacherName: form.teacherName,
                  room: form.room || undefined,
                  visioUrl: form.visioUrl || null,
                  evalUrl: form.evalUrl || null,
                  evalLinks,
                  evalStartsAt: form.evalStartsAt ? new Date(form.evalStartsAt).toISOString() : null,
                  evalMinutes: form.evalMinutes ? Number(form.evalMinutes) : null,
                  visioOpen: form.visioOpen,
                  evalOpen: form.evalOpen,
                  coursePostponed: form.coursePostponed,
                  evalPostponed: form.evalPostponed,
                  postponedReason: form.postponedReason || null,
                }).then((err) => {
                  if (err) setFormErr(err);
                  else {
                    setForm(null);
                    reload();
                  }
                });
              }}
            >
              <Label>Discipline</Label>
              <Input value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} />
              <Label>Enseignant</Label>
              <Input value={form.teacherName} onChange={(e) => setForm({ ...form, teacherName: e.target.value })} />
              {!user.pole && (
                <>
                  <Label>Pôle</Label>
                  <select className="h-11 w-full rounded-xl border border-input bg-card px-3" value={form.pole} onChange={(e) => setForm({ ...form, pole: e.target.value as Pole })}>
                    {POLES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <Label>Jour</Label>
              <select className="h-11 w-full rounded-xl border border-input bg-card px-3" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value as WeekDay })}>
                {WEEK_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
                <Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
              </div>
              <Label>Salle</Label>
              <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
              <Label>URL visio (jamais affichée aux étudiants)</Label>
              <Input type="url" value={form.visioUrl} onChange={(e) => setForm({ ...form, visioUrl: e.target.value })} placeholder="https://meet.google.com/…" />
              <Label>URL évaluation (lien unique)</Label>
              <Input type="url" value={form.evalUrl} onChange={(e) => setForm({ ...form, evalUrl: e.target.value })} placeholder="https://moodle.univ.ga/…" />
              <Label>Liens par groupe (une ligne : Groupe 1|https://…)</Label>
              <Textarea value={form.evalLinksText} onChange={(e) => setForm({ ...form, evalLinksText: e.target.value })} placeholder={"Groupe 1|https://…\nGroupe 2|https://…"} />
              <Label>Fenêtre d’évaluation</Label>
              <Input type="datetime-local" value={form.evalStartsAt} onChange={(e) => setForm({ ...form, evalStartsAt: e.target.value })} />
              <Input type="number" min={1} value={form.evalMinutes} onChange={(e) => setForm({ ...form, evalMinutes: e.target.value })} placeholder="Durée en minutes" />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.visioOpen} onCheckedChange={(v) => setForm({ ...form, visioOpen: Boolean(v) })} /> Visio ouverte
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.evalOpen} onCheckedChange={(v) => setForm({ ...form, evalOpen: Boolean(v) })} /> Évaluation ouverte
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.coursePostponed} onCheckedChange={(v) => setForm({ ...form, coursePostponed: Boolean(v) })} /> Cours reporté
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.evalPostponed} onCheckedChange={(v) => setForm({ ...form, evalPostponed: Boolean(v) })} /> Évaluation reportée
              </label>
              <Label>Motif du report</Label>
              <Input value={form.postponedReason} onChange={(e) => setForm({ ...form, postponedReason: e.target.value })} />
              {formErr && <p className="text-sm text-red-400">{formErr}</p>}
              <Button type="submit" className="w-full">
                Enregistrer
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!noteSlot} onOpenChange={() => setNoteSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ma note — {noteSlot?.discipline}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Visible par vous seul·e. Une échéance à moins de 48 h remonte dans À lire et le planning.</p>
          <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Que faut-il retenir ?" />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={noteDone} onCheckedChange={(v) => setNoteDone(Boolean(v))} /> Marquer comme faite
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={hasDue} onCheckedChange={(v) => setHasDue(Boolean(v))} />
            <Clock className="h-3.5 w-3.5" /> Définir une échéance (rappel automatique 48 h avant)
          </label>
          {hasDue && (
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Date limite" />
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} aria-label="Heure limite" />
            </div>
          )}
          {noteErr && <p className="text-sm text-red-400">{noteErr}</p>}
          <div className="flex gap-2">
            {notes.find((n) => n.slotId === noteSlot?.id) && (
              <Button
                variant="outline"
                className="text-red-400"
                onClick={() => {
                  const existing = notes.find((n) => n.slotId === noteSlot?.id);
                  if (existing) void deleteNote(existing.id).then(() => { setNoteSlot(null); reload(); });
                }}
              >
                Supprimer
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={() => {
                if (!noteSlot) return;
                if (noteBody.trim().length < 3) {
                  setNoteErr("Écrivez au moins quelques mots (3 caractères minimum).");
                  return;
                }
                let dueAt: string | null = null;
                if (hasDue) {
                  if (!dueDate || !dueTime) {
                    setNoteErr("Date et heure d’échéance incomplètes.");
                    return;
                  }
                  const t = new Date(`${dueDate}T${dueTime}`);
                  if (Number.isNaN(t.getTime())) {
                    setNoteErr("Date d’échéance invalide.");
                    return;
                  }
                  dueAt = t.toISOString();
                }
                const existing = notes.find((n) => n.slotId === noteSlot.id);
                void upsertNote({ id: existing?.id, slotId: noteSlot.id, body: noteBody, done: noteDone, dueAt }).then((err) => {
                  if (err) setNoteErr(err);
                  else {
                    setNoteSlot(null);
                    reload();
                  }
                });
              }}
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
