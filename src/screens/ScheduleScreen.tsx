import { useMemo, useRef, useState } from 'react';
import { DAY_LABELS, POLES, WEEK_DAYS, type CourseNote, type Pole, type ScheduleSlot, type Subject, type WeekDay } from '../types';
import { useStore } from '../store';
import { cx, countdown, uid } from '../utils';
import { useNow } from '../hooks/useNow';
import { NoteForm } from '../components/NoteForm';
import { IconBook, IconCalendar, IconCheckCircle, IconChevronDown, IconClock, IconClose, IconFileText, IconLink, IconNote, IconPause, IconPin, IconVideo } from '../ui/Icons';

type EvalState = 'none' | 'off' | 'upcoming' | 'open' | 'ended' | 'plain';

function evalLinksOf(slot: ScheduleSlot): Array<{ group: string; url: string }> {
  if (slot.evalLinks && slot.evalLinks.length > 0) return slot.evalLinks;
  return slot.evalUrl ? [{ group: '', url: slot.evalUrl }] : [];
}

// 'plain' = éval sans chrono configuré (comportement historique).
function evalStateOf(slot: ScheduleSlot, now: number): EvalState {
  if (evalLinksOf(slot).length === 0) return 'none';
  if (slot.evalPostponed || !(slot.evalOpen ?? true)) return 'off';
  if (!slot.evalStartsAt || !slot.evalMinutes) return 'plain';
  const start = Date.parse(slot.evalStartsAt);
  const end = start + slot.evalMinutes * 60_000;
  if (now < start) return 'upcoming';
  if (now < end) return 'open';
  return 'ended';
}

function evalEndsAt(slot: ScheduleSlot): number {
  return Date.parse(slot.evalStartsAt!) + (slot.evalMinutes ?? 0) * 60_000;
}

function evalCountdownLabel(endsAt: number, now: number): string {
  const s = Math.max(0, Math.floor((endsAt - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function EvalGroupModal({ links, onClose }: { links: Array<{ group: string; url: string }>; onClose: () => void }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 150 }} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Choisir mon groupe">
        <div className="modal-handle" />
        <div className="modal-title">
          Votre groupe d’évaluation
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✖️</button>
        </div>
        <p className="hint" style={{ marginBottom: 12 }}>Choisissez le lien correspondant à votre groupe de TD.</p>
        {links.map((l, i) => (
          <div className="row" style={{ marginBottom: 8 }} key={`${l.group}-${i}`}>
            <button className="btn btn-primary grow" onClick={() => { window.open(l.url, '_blank', 'noopener'); onClose(); }}>
              {l.group || `Groupe ${i + 1}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScheduleScreen() {
  const { db, user, upsertScheduleSlot, deleteScheduleSlot, upsertCourseNote, deleteCourseNote } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<ScheduleSlot | null>(null);
  const [detailSlot, setDetailSlot] = useState<ScheduleSlot | null>(null);
  const [noteSlot, setNoteSlot] = useState<ScheduleSlot | null>(null);
  const [notesListOpen, setNotesListOpen] = useState(false);
  const [viewPole, setViewPole] = useState<Pole | 'ALL'>('ALL');
  const [flashId, setFlashId] = useState<string | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useNow(1000);

  if (!user) return null;

  const canManage = user.role === 'ADMIN' || user.role === 'PROF' || user.role === 'RELAIS';
  const lockedPole: Pole | null = user.pole ?? null;

  const slots = useMemo(() => {
    const base = lockedPole ? db.scheduleSlots.filter(s => s.pole === lockedPole) : db.scheduleSlots;
    return base
      .filter(s => viewPole === 'ALL' || s.pole === viewPole)
      .sort((a, b) => WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day) || a.start.localeCompare(b.start));
  }, [db.scheduleSlots, lockedPole, viewPole]);

  const grouped = useMemo(() => {
    return WEEK_DAYS.map(day => ({ day, items: slots.filter(s => s.day === day) })).filter(g => g.items.length > 0);
  }, [slots]);

  const today: WeekDay = WEEK_DAYS[(new Date().getDay() + 6) % 7];
  const now = new Date().toTimeString().slice(0, 5);
  const liveSlot = today ? slots.find(s => s.day === today && !s.coursePostponed && s.start <= now && now < s.end) : undefined;
  const todayIdx = WEEK_DAYS.indexOf(today);
  const nextSlot =
    slots.find(s => s.day === today && !s.coursePostponed && s.start > now) ??
    slots.find(s => !s.coursePostponed && WEEK_DAYS.indexOf(s.day) > todayIdx) ??
    slots.find(s => !s.coursePostponed) ??
    slots[0];

  const postponedToday = slots.filter(s => s.day === today && (s.coursePostponed || s.evalPostponed));
  const postponedWeek = slots.filter(s => (s.coursePostponed || s.evalPostponed));

  const myNotes = user ? db.courseNotes.filter(n => n.userId === user.id) : [];
  const notesBySlot = new Map(myNotes.map(n => [n.slotId, n]));
  const openNotes = myNotes.filter(n => !n.done);
  const dueNotes = openNotes
    .filter(n => n.dueAt && Date.now() <= Date.parse(n.dueAt) && Date.parse(n.dueAt) - Date.now() <= 48 * 3600_000)
    .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!));
  const notesToday = openNotes.filter(n => {
    const s = slots.find(x => x.id === n.slotId);
    return s && s.day === today;
  });
  const notesBanner = dueNotes.length > 0 ? dueNotes : notesToday.length > 0 ? notesToday : openNotes;

  const scrollToSlot = (id: string) => {
    setDetailSlot(null);
    slotRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    window.setTimeout(() => setFlashId(null), 2000);
  };

  const openForm = (slot: ScheduleSlot | null) => {
    setEditSlot(slot);
    setFormOpen(true);
  };

  const toggle = (slot: ScheduleSlot, key: 'visioOpen' | 'evalOpen') => {
    upsertScheduleSlot({ ...slot, [key]: !(slot[key] ?? true) });
  };

  const togglePostponed = (slot: ScheduleSlot, what: 'course' | 'eval', reason?: string) => {
    if (what === 'course') {
      upsertScheduleSlot({
        ...slot,
        coursePostponed: !slot.coursePostponed,
        postponedReason: !slot.coursePostponed ? reason : undefined,
        visioOpen: !slot.coursePostponed ? false : slot.visioOpen
      });
    } else {
      upsertScheduleSlot({
        ...slot,
        evalPostponed: !slot.evalPostponed,
        postponedReason: !slot.evalPostponed ? reason : undefined,
        evalOpen: !slot.evalPostponed ? false : slot.evalOpen
      });
    }
  };

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      {!lockedPole && (
        <div className="chips" style={{ marginBottom: 14 }}>
          <button className={cx('chip', viewPole === 'ALL' && 'on')} onClick={() => setViewPole('ALL')}>Tous</button>
          {POLES.map(p => (
            <button key={p} className={cx('chip', viewPole === p && 'on')} onClick={() => setViewPole(p)}>{p}</button>
          ))}
        </div>
      )}

      {myNotes.length > 0 && (
        <button className="btn btn-ghost btn-sm notes-toggle" onClick={() => setNotesListOpen(true)}>
          📝 Mes notes · {myNotes.length}
        </button>
      )}

      {dueNotes.length > 0 && (
        <button className="due-summary" onClick={() => scrollToSlot(dueNotes[0].slotId)}>
          <b>🕒 N’oublie pas — échéance dans moins de 48 h</b>
          <div className="pp-summary-list">
            {dueNotes.slice(0, 3).map(n => {
              const s = slots.find(x => x.id === n.slotId);
              const cd = countdown(n.dueAt!);
              return (
                <span key={n.id}>
                  <span className="due-timer">{cd.text}</span> · {s ? s.discipline : 'Cours supprimé'} — {n.body.length > 42 ? `${n.body.slice(0, 42)}…` : n.body}
                </span>
              );
            })}
            {dueNotes.length > 3 && <span>+{dueNotes.length - 3} autre{dueNotes.length > 4 ? 's' : ''}…</span>}
          </div>
        </button>
      )}

      {notesBanner.length > 0 && (
        <button className="note-summary" onClick={() => scrollToSlot(notesBanner[0].slotId)}>
          <b>📝 {notesBanner.length} note{notesBanner.length > 1 ? 's' : ''} {notesToday.length > 0 ? 'pour aujourd’hui' : 'en attente'}</b>
          <div className="pp-summary-list">
            {notesBanner.slice(0, 3).map(n => {
              const s = slots.find(x => x.id === n.slotId);
              return <span key={n.id}>{s ? `${s.discipline} (${DAY_LABELS[s.day]} ${s.start})` : 'Cours supprimé'} — {n.body.length > 46 ? `${n.body.slice(0, 46)}…` : n.body}</span>;
            })}
            {notesBanner.length > 3 && <span>+{notesBanner.length - 3} autre{notesBanner.length > 4 ? 's' : ''}…</span>}
          </div>
        </button>
      )}

      {postponedToday.length > 0 ? (
        <button className="pp-summary" onClick={() => scrollToSlot(postponedToday[0].id)}>
          <b>⏸️ {postponedToday.length} report{postponedToday.length > 1 ? 's' : ''} aujourd’hui</b>
          <div className="pp-summary-list">
            {postponedToday.slice(0, 3).map(s => (
              <span key={s.id} className="row" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                {s.coursePostponed && s.evalPostponed ? '⏸️' : s.coursePostponed ? '📚' : '📄'}
                {s.discipline} ({s.start}){s.coursePostponed && !s.evalPostponed ? ' — cours' : ''}{!s.coursePostponed && s.evalPostponed ? ' — éval.' : ''}
              </span>
            ))}
            {postponedToday.length > 3 && <span>+{postponedToday.length - 3} autre{postponedToday.length > 4 ? 's' : ''}…</span>}
          </div>
        </button>
      ) : postponedWeek.length > 0 ? (
        <button className="pp-summary mild" onClick={() => scrollToSlot(postponedWeek[0].id)}>
          <b>⏸️ {postponedWeek.length} report{postponedWeek.length > 1 ? 's' : ''} cette semaine</b>
          <div className="pp-summary-list">
            {postponedWeek.slice(0, 3).map(s => (
              <span key={s.id}>{DAY_LABELS[s.day]} · {s.discipline}</span>
            ))}
            {postponedWeek.length > 3 && <span>+{postponedWeek.length - 3} autre{postponedWeek.length > 4 ? 's' : ''}…</span>}
          </div>
        </button>
      ) : null}

      {liveSlot && (
        <button className="live-banner" onClick={() => scrollToSlot(liveSlot.id)}>
          <span className="live-dot" />
          <div className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
            <b>En cours · {liveSlot.discipline}</b>
            <div className="live-sub">{liveSlot.start}–{liveSlot.end} · {liveSlot.teacherName}{liveSlot.room ? ` · ${liveSlot.room}` : ''}</div>
          </div>
          <span className="live-hint row" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>Voir ▾</span>
        </button>
      )}

      {!liveSlot && nextSlot && (
        <button className="pill-info next-pill" style={{ marginBottom: 14, width: '100%', textAlign: 'left' }} onClick={() => scrollToSlot(nextSlot.id)}>
          ▾ Prochain cours : <b>{nextSlot.discipline}</b> — {DAY_LABELS[nextSlot.day]} {nextSlot.start}, {nextSlot.teacherName}.
        </button>
      )}

      {grouped.map(({ day, items }) => (
        <div key={day} className="sched-day">
          <div className={cx('sched-day-head', day === today && 'today')}>
            {DAY_LABELS[day]}
            {day === today && <span className="badge badge-reliable">Aujourd’hui</span>}
          </div>
          {items.map(s => (
            <div key={s.id} ref={el => { slotRefs.current[s.id] = el; }}>
              <SlotCard
                slot={s}
                flash={flashId === s.id}
                canManage={canManage}
                note={notesBySlot.get(s.id)}
                onOpen={() => setDetailSlot(s)}
                onToggle={toggle}
                onPostpone={togglePostponed}
                onNote={() => setNoteSlot(s)}
              />
            </div>
          ))}
        </div>
      ))}

      {grouped.length === 0 && (
        <div className="empty">
          <div className="empty-ico">📅</div>
          <b>Aucun créneau</b>
          <p>{canManage ? 'Ajoutez les cours de la semaine avec le bouton « + ».' : 'Votre pôle n’a pas encore publié d’emploi du temps.'}</p>
        </div>
      )}

      {canManage && (
        <button className="fab" onClick={() => openForm(null)} aria-label="Ajouter un créneau">＋</button>
      )}

      {detailSlot && (
        <SlotDetail
          slot={db.scheduleSlots.find(s => s.id === detailSlot.id) ?? detailSlot}
          canManage={canManage}
          note={notesBySlot.get(detailSlot.id)}
          onClose={() => setDetailSlot(null)}
          onEdit={() => { setDetailSlot(null); openForm(db.scheduleSlots.find(s => s.id === detailSlot.id) ?? detailSlot); }}
          onDelete={() => { deleteScheduleSlot(detailSlot.id); setDetailSlot(null); }}
          onToggle={toggle}
          onPostpone={togglePostponed}
          onNote={() => { setNoteSlot(db.scheduleSlots.find(s => s.id === detailSlot.id) ?? detailSlot); setDetailSlot(null); }}
        />
      )}

      {noteSlot && user && (
        <NoteForm
          slot={noteSlot}
          existing={notesBySlot.get(noteSlot.id)}
          onClose={() => setNoteSlot(null)}
          onSave={note => { upsertCourseNote({ ...note, userId: user.id }); setNoteSlot(null); }}
          onDelete={id => { deleteCourseNote(id); setNoteSlot(null); }}
        />
      )}

      {notesListOpen && user && (
        <NotesListModal
          notes={[...myNotes].sort((a, b) => Number(a.done ?? false) - Number(b.done ?? false) || (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity))}
          onClose={() => setNotesListOpen(false)}
          onEdit={slot => { setNotesListOpen(false); setNoteSlot(slot); }}
          onToggleDone={note => upsertCourseNote({ ...note, done: !note.done })}
          onDelete={deleteCourseNote}
        />
      )}

      {formOpen && (
        <SlotForm
          slot={editSlot}
          subjects={db.subjects}
          defaultPole={lockedPole ?? (viewPole === 'ALL' ? 'STI' : viewPole)}
          onClose={() => setFormOpen(false)}
          onSave={slot => {
            upsertScheduleSlot(slot);
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SlotCard({ slot, flash, canManage, note, onOpen, onToggle, onPostpone, onNote }: {
  slot: ScheduleSlot;
  flash: boolean;
  canManage: boolean;
  note?: CourseNote;
  onOpen: () => void;
  onToggle: (slot: ScheduleSlot, key: 'visioOpen' | 'evalOpen') => void;
  onPostpone: (slot: ScheduleSlot, what: 'course' | 'eval', reason?: string) => void;
  onNote: () => void;
}) {
  const [evalChooser, setEvalChooser] = useState(false);
  const now = Date.now();
  const visioOn = !!slot.visioUrl && (slot.visioOpen ?? true) && !slot.coursePostponed;
  const evalOn = !!(slot.evalUrl || slot.evalLinks?.length) && (slot.evalOpen ?? true) && !slot.evalPostponed;
  const eState = evalStateOf(slot, now);
  const both = slot.coursePostponed && slot.evalPostponed;

  const openEval = () => {
    const links = evalLinksOf(slot);
    if (links.length <= 1) window.open(links[0]?.url, '_blank', 'noopener');
    else setEvalChooser(true);
  };

  return (
    <div className={cx('slot-card', flash && 'flash', (slot.coursePostponed || slot.evalPostponed) && 'postponed')} role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}>
      {evalChooser && <EvalGroupModal links={evalLinksOf(slot)} onClose={() => setEvalChooser(false)} />}
      <div className="slot-time">
        {both && <span className="pp-badge">TOUT REPORTÉ</span>}
        {slot.coursePostponed && !slot.evalPostponed && <span className="pp-badge">COURS REPORTÉ</span>}
        {slot.evalPostponed && !slot.coursePostponed && <span className="pp-badge">ÉVAL. REPORTÉE</span>}
        <b>{slot.start}</b>
        <span>{slot.end}</span>
      </div>
      <div className="slot-body">
        <div className="slot-disc">{slot.discipline}</div>
        <div className="slot-sub">{slot.teacherName}{slot.room ? ` · ${slot.room}` : ''}</div>
        {(slot.coursePostponed || slot.evalPostponed) && (
          <div className="slot-note pp-note">
            ⏸️
            <span>{both ? 'Cours et évaluation reportés' : slot.coursePostponed ? 'Cours reporté' : 'Évaluation reportée'}{slot.postponedReason ? ` — ${slot.postponedReason}` : ''}</span>
          </div>
        )}
        {!slot.coursePostponed && slot.note && (
          <div className="slot-note">📌<span>{slot.note}</span></div>
        )}
        {note && (
          <div className={cx('slot-note my-note', note.done && 'done')}>
            {note.done ? '✅' : '📝'} <span>{note.body}</span>
            {!note.done && note.dueAt && Date.now() <= Date.parse(note.dueAt) && Date.parse(note.dueAt) - Date.now() <= 48 * 3600_000 && (
              <span className="due-inline row" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>🕒 {countdown(note.dueAt).text}</span>
            )}
          </div>
        )}
        {!slot.coursePostponed && (
          <div className="slot-actions" onClick={e => e.stopPropagation()}>
            {canManage ? (
              <>
                {slot.visioUrl && (
                  <button className={cx('btn btn-ghost btn-sm', visioOn ? 'visio-on' : '')} onClick={() => onToggle(slot, 'visioOpen')}>
                    🎥 Visio {visioOn ? '· ouverte' : '· fermée'}
                  </button>
                )}
                {(slot.evalUrl || slot.evalLinks?.length) && !slot.evalPostponed && (
                  <button className={cx('btn btn-ghost btn-sm eval', evalOn ? 'eval-on' : '')} onClick={() => onToggle(slot, 'evalOpen')}>
                    🔗 Éval {evalOn ? '· ouverte' : '· fermée'}
                  </button>
                )}
              </>
            ) : (
              <>
                {visioOn && (
                  <button className="btn btn-ghost btn-sm visio-on" onClick={() => window.open(slot.visioUrl, '_blank', 'noopener')}>
                    🎥 Visio
                  </button>
                )}
                {eState === 'open' && (
                  <button className="btn btn-ghost btn-sm eval eval-on" onClick={openEval}>
                    🔗 Éval · <span className="eval-countdown">{evalCountdownLabel(evalEndsAt(slot), now)}</span>
                  </button>
                )}
                {eState === 'plain' && evalOn && (
                  <button className="btn btn-ghost btn-sm eval eval-on" onClick={openEval}>
                    🔗 Évaluation{evalLinksOf(slot).length > 1 ? ` · ${evalLinksOf(slot).length} grp` : ''}
                  </button>
                )}
                {eState === 'upcoming' && (
                  <button className="btn btn-ghost btn-sm eval eval-wait" disabled title="L'évaluation n'est pas encore ouverte">
                    🕒 Éval · ouvre à {new Date(slot.evalStartsAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </button>
                )}
                {eState === 'ended' && (
                  <button className="btn btn-ghost btn-sm eval eval-ended" disabled title="Le temps de l'évaluation est écoulé">
                    🕒 Éval terminée
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost btn-sm note-btn" onClick={onNote}>
              📝 {note ? 'Ma note' : 'Noter'}
            </button>
          </div>
        )}
        {canManage && (
          <div className="slot-actions" onClick={e => e.stopPropagation()}>
            {slot.coursePostponed ? (
              <button className="btn btn-ghost btn-sm pp-btn" onClick={() => onPostpone(slot, 'course')}>
                Rétablir le cours
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => onPostpone(slot, 'course')}>
                ⏸️ Reporter le cours
              </button>
            )}
            {(slot.evalUrl || slot.evalLinks?.length) && !slot.coursePostponed && (
              slot.evalPostponed ? (
                <button className="btn btn-ghost btn-sm pp-btn" onClick={() => onPostpone(slot, 'eval')}>
                  Rétablir l’éval.
                </button>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => onPostpone(slot, 'eval')}>
                  ⏸️ Reporter l’éval.
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotDetail({ slot, canManage, note, onClose, onEdit, onDelete, onToggle, onPostpone, onNote }: {
  slot: ScheduleSlot;
  canManage: boolean;
  note?: CourseNote;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (slot: ScheduleSlot, key: 'visioOpen' | 'evalOpen') => void;
  onPostpone: (slot: ScheduleSlot, what: 'course' | 'eval', reason?: string) => void;
  onNote: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [ppWhat, setPpWhat] = useState<'course' | 'eval' | null>(null);
  const [ppReason, setPpReason] = useState('');
  const [evalChooser, setEvalChooser] = useState(false);
  const now = Date.now();
  const visioOn = !!slot.visioUrl && (slot.visioOpen ?? true) && !slot.coursePostponed;
  const evalOn = !!(slot.evalUrl || slot.evalLinks?.length) && (slot.evalOpen ?? true) && !slot.evalPostponed;
  const eState = evalStateOf(slot, now);
  const evalLinks = evalLinksOf(slot);

  const openEval = () => {
    if (evalLinks.length <= 1) window.open(evalLinks[0]?.url, '_blank', 'noopener');
    else setEvalChooser(true);
  };

  const evalWindowLabel = () => {
    if (!slot.evalStartsAt || !slot.evalMinutes) return null;
    const start = new Date(slot.evalStartsAt);
    const end = new Date(evalEndsAt(slot));
    return `Fenêtre : ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} → ${end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (${slot.evalMinutes} min)`;
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Détail du cours">
        <div className="modal-handle" />
        <div className="modal-title">
          {slot.discipline}
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✖️</button>
        </div>

        {(slot.coursePostponed || slot.evalPostponed) && (
          <div className="pp-banner">
            ⏸️
            <span><b>{slot.coursePostponed && slot.evalPostponed ? 'Cours et évaluation reportés' : slot.coursePostponed ? 'Cours reporté' : 'Évaluation reportée'}</b>
            {slot.postponedReason ? ` — ${slot.postponedReason}` : null}</span>
          </div>
        )}

        <div className="detail-card" style={{ marginBottom: 14 }}>
          <div className="detail-stripe" style={{ background: slot.coursePostponed ? 'var(--yellow)' : 'var(--primary)' }} />
          <div className="detail-meta" style={{ borderTop: 'none', margin: 0, paddingTop: 4 }}>
            <span className="avatar">{slot.teacherName.replace('Pr. ', '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>
            <span>
              <b style={{ color: 'var(--text)' }}>{slot.teacherName}</b>
              <br />
              {DAY_LABELS[slot.day]} · {slot.start} – {slot.end}{slot.room ? ` · Salle ${slot.room}` : ''}
            </span>
          </div>
          {slot.note && (
            <p className="detail-desc" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><span style={{ flex: 'none', marginTop: 3 }}>📌</span><span>{slot.note}</span></p>
          )}
          {note && (
            <div className={cx('slot-note my-note', note.done && 'done')} style={{ marginTop: 10 }}>
              {note.done ? '✅' : '📝'} <span>{note.body}</span>
            </div>
          )}
        </div>

        <div className="row" style={{ marginBottom: 14 }}>
          <button className="btn btn-ghost grow note-btn" onClick={onNote}>
            📝 {note ? 'Modifier ma note' : 'Ajouter une note perso'}
          </button>
        </div>

        {visioOn && (
          <div className="row" style={{ marginBottom: 10 }}>
            <button className="btn btn-primary grow" onClick={() => window.open(slot.visioUrl, '_blank', 'noopener')}>
              🎥 Rejoindre la visio
            </button>
          </div>
        )}
        {evalChooser && <EvalGroupModal links={evalLinks} onClose={() => setEvalChooser(false)} />}
        {(eState === 'open' || eState === 'plain') && (
          <div style={{ marginBottom: 14 }}>
            {eState === 'open' && (
              <p className="hint row" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                🕒
                <span>Évaluation en cours — fermeture dans <b className="eval-countdown">{evalCountdownLabel(evalEndsAt(slot), now)}</b>. Passe ce délai, le lien sera désactivé.</span>
              </p>
            )}
            <div className="row" style={{ marginBottom: 8 }}>
              <button className="btn btn-ghost grow eval eval-on" onClick={openEval}>
                🔗 Accéder à l’évaluation{evalLinks.length > 1 ? ` · ${evalLinks.length} groupes` : ''}
              </button>
            </div>
            {evalWindowLabel() && <p className="hint">{evalWindowLabel()}</p>}
          </div>
        )}
        {eState === 'upcoming' && (
          <div className="pp-banner" style={{ marginBottom: 14 }}>
            🕒
            <span><b>Évaluation à venir</b> — ouverture {new Date(slot.evalStartsAt!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {new Date(slot.evalStartsAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ({slot.evalMinutes} min). Le lien sera actif uniquement pendant la fenêtre.</span>
          </div>
        )}
        {eState === 'ended' && (
          <div className="pp-banner" style={{ marginBottom: 14 }}>
            🕒
            <span><b>Évaluation terminée</b> — le temps imparti est écoulé, le lien n’est plus accessible.</span>
          </div>
        )}

        {canManage && (
          <>
            <div className="section-title">Pilotage</div>

            {ppWhat ? (
              <div style={{ marginBottom: 12 }}>
                <div className="field">
                  <label>Motif du report (optionnel)</label>
                  <input className="input" value={ppReason} onChange={e => setPpReason(e.target.value)} placeholder="Ex. déplacement du prof, salle indisponible…" autoFocus />
                </div>
                <div className="row">
                  <button className="btn btn-ghost grow" onClick={() => setPpWhat(null)}>Annuler</button>
                  <button className="btn btn-primary grow" onClick={() => onPostpone(slot, ppWhat, ppReason.trim() || undefined)}>
                    Confirmer le report {ppWhat === 'course' ? 'du cours' : 'de l’évaluation'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                <button
                  className={cx('btn btn-ghost grow', slot.coursePostponed && 'pp-btn')}
                  onClick={() => (slot.coursePostponed ? onPostpone(slot, 'course') : (setPpWhat('course'), setPpReason('')))}
                >
                  {slot.coursePostponed ? 'Rétablir le cours' : <>⏸️ Reporter le cours</>}
                </button>
                {(slot.evalUrl || slot.evalLinks?.length) && !slot.coursePostponed && (
                  <button
                    className={cx('btn btn-ghost grow', slot.evalPostponed && 'pp-btn')}
                    onClick={() => (slot.evalPostponed ? onPostpone(slot, 'eval') : (setPpWhat('eval'), setPpReason('')))}
                  >
                    {slot.evalPostponed ? 'Rétablir l’éval.' : <>⏸️ Reporter l’éval.</>}
                  </button>
                )}
              </div>
            )}

            {!slot.coursePostponed && (
              <div className="row" style={{ marginBottom: 12 }}>
                {slot.visioUrl && (
                  <button className={cx('btn btn-ghost grow', visioOn ? 'visio-on' : '')} onClick={() => onToggle(slot, 'visioOpen')}>
                    🎥 Visio : {visioOn ? 'ouverte' : 'fermée'}
                  </button>
                )}
                {(slot.evalUrl || slot.evalLinks?.length) && !slot.evalPostponed && (
                  <button className={cx('btn btn-ghost grow eval', evalOn ? 'eval-on' : '')} onClick={() => onToggle(slot, 'evalOpen')}>
                    🔗 Éval : {evalOn ? 'ouverte' : 'fermée'}
                  </button>
                )}
              </div>
            )}
            <div className="row">
              <button className="btn btn-ghost grow" onClick={onEdit}>Modifier</button>
              {confirmDel ? (
                <>
                  <button className="btn btn-ghost" onClick={() => setConfirmDel(false)}>Annuler</button>
                  <button className="btn btn-danger" onClick={onDelete}>Confirmer</button>
                </>
              ) : (
                <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>Supprimer</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NotesListModal({ notes, onClose, onEdit, onToggleDone, onDelete }: {
  notes: CourseNote[];
  onClose: () => void;
  onEdit: (slot: ScheduleSlot) => void;
  onToggleDone: (note: CourseNote) => void;
  onDelete: (id: string) => void;
}) {
  const { db } = useStore();
  const [delId, setDelId] = useState<string | null>(null);
  useNow(1000);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal sheet-modal" role="dialog" aria-modal="true" aria-label="Mes notes">
        <div className="modal-handle" />
        <div className="modal-title">
          <span className="row" style={{ gap: 8 }}>📝 Mes notes ({notes.length})</span>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✖️</button>
        </div>
        <div className="sheet-scroll">
          {notes.map(n => {
            const s = db.scheduleSlots.find(x => x.id === n.slotId);
            const dueSoon = n.dueAt && !n.done && Date.parse(n.dueAt) - Date.now() <= 48 * 3600_000;
            const cd = n.dueAt && dueSoon ? countdown(n.dueAt) : null;
            return (
              <div key={n.id} className={cx('member-row', n.done && 'note-row-done')} style={{ alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  className="note-check"
                  checked={!!n.done}
                  onChange={() => onToggleDone(n)}
                  aria-label="Traitée"
                  style={{ marginTop: 4 }}
                />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                    <span className="member-name">{s?.discipline ?? 'Cours supprimé'}</span>
                    {dueSoon && cd && <span className={cx('badge', cd.late ? 'badge-contested' : 'badge-reliable')}>{cd.text}</span>}
                    {n.done && <span className="badge badge-reliable">Traitée</span>}
                  </div>
                  <div className="member-sub">{s ? `${DAY_LABELS[s.day]} · ${s.start}` : ''}</div>
                  <div className={cx('note-list-body', n.done && 'done')}>{n.body}</div>
                  {n.dueAt && !n.done && (
                    <div className="member-sub row" style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      🕒 À rendre avant le {new Date(n.dueAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} {new Date(n.dueAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                <div className="list-actions">
                  {s && <button className="text-btn primary" onClick={() => onEdit(s)}>Modifier</button>}
                  {delId === n.id ? (
                    <>
                      <button className="text-btn danger" onClick={() => { onDelete(n.id); setDelId(null); }}>Confirmer ?</button>
                      <button className="text-btn" onClick={() => setDelId(null)}>Annuler</button>
                    </>
                  ) : (
                    <button className="text-btn danger" onClick={() => setDelId(n.id)}>Supprimer</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function toLocalDT(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SlotForm({ slot, subjects, defaultPole, onClose, onSave }: {
  slot: ScheduleSlot | null;
  subjects: Subject[];
  defaultPole: Pole;
  onClose: () => void;
  onSave: (slot: ScheduleSlot) => void;
}) {
  const [pole, setPole] = useState<Pole>(slot?.pole ?? defaultPole);
  const [day, setDay] = useState<WeekDay>(slot?.day ?? 'LUNDI');
  const [start, setStart] = useState(slot?.start ?? '08:00');
  const [end, setEnd] = useState(slot?.end ?? '10:00');
  const [discipline, setDiscipline] = useState(slot?.discipline ?? '');
  const [teacherName, setTeacherName] = useState(slot?.teacherName ?? '');
  const [room, setRoom] = useState(slot?.room ?? '');
  const [visioUrl, setVisioUrl] = useState(slot?.visioUrl ?? '');
  const [evalUrl, setEvalUrl] = useState(slot?.evalUrl ?? '');
  const [evalGroups, setEvalGroups] = useState<Array<{ group: string; url: string }>>(slot?.evalLinks ?? []);
  const [timed, setTimed] = useState(!!slot?.evalStartsAt);
  const [evalDate, setEvalDate] = useState(toLocalDT(slot?.evalStartsAt));
  const [evalMinutes, setEvalMinutes] = useState(String(slot?.evalMinutes ?? 60));
  const [visioOpen, setVisioOpen] = useState(slot?.visioOpen ?? true);
  const [evalOpen, setEvalOpen] = useState(slot?.evalOpen ?? true);
  const [note, setNote] = useState(slot?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const poleSubjects = subjects.filter(s => s.pole === pole);
  const known = poleSubjects.find(s => s.discipline === discipline);

  const setGroup = (i: number, patch: Partial<{ group: string; url: string }>) => {
    setEvalGroups(prev => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  };

  const pickSubject = (id: string) => {
    const s = poleSubjects.find(x => x.id === id);
    if (!s) {
      setDiscipline('');
      return;
    }
    setDiscipline(s.discipline);
    setTeacherName(s.teacherName);
    setRoom(s.room ?? '');
    setVisioUrl(s.visioUrl ?? '');
    setEvalUrl(s.evalUrl ?? '');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discipline.trim()) return setError('La discipline est obligatoire.');
    if (!teacherName.trim()) return setError('Le nom de l’enseignant est obligatoire.');
    if (!start || !end) return setError('Horaires incomplets.');
    if (end <= start) return setError('L’heure de fin doit être après l’heure de début.');
    const cleanGroups = evalGroups
      .filter(g => g.url.trim())
      .map((g, i) => ({ group: g.group.trim() || `Groupe ${i + 1}`, url: g.url.trim() }));
    if (cleanGroups.some(g => !/^https?:\/\/.+/.test(g.url))) return setError('Liens d’évaluation par groupe invalides (http/https requis).');
    let evalStartsAt: string | null = null;
    let evalMinutes: number | undefined;
    if (timed) {
      if (!evalDate) return setError('Indiquez la date et l’heure d’ouverture de l’évaluation.');
      const mins = Number(evalMinutes);
      if (!Number.isFinite(mins) || mins < 1 || mins > 600) return setError('Durée d’évaluation invalide : entre 1 et 600 minutes.');
      evalStartsAt = new Date(evalDate).toISOString();
      evalMinutes = mins;
    }
    // On repart du créneau existant : les champs hors formulaire (reports…)
    // ne doivent pas être perdus à l'édition.
    onSave({
      ...(slot ?? {}),
      id: slot?.id ?? uid('s'),
      pole,
      day,
      start,
      end,
      discipline: discipline.trim(),
      teacherName: teacherName.trim(),
      room: room.trim() || undefined,
      visioUrl: visioUrl.trim() || undefined,
      evalUrl: evalUrl.trim() || undefined,
      evalLinks: cleanGroups.length > 0 ? cleanGroups : undefined,
      evalStartsAt,
      evalMinutes,
      visioOpen,
      evalOpen,
      note: note.trim() || undefined,
      createdAt: slot?.createdAt ?? new Date().toISOString()
    });
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal sheet-modal" role="dialog" aria-modal="true" aria-label="Créneau de cours">
        <div className="modal-handle" />
        <div className="modal-title">
          {slot ? 'Modifier le créneau' : 'Nouveau créneau'}
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✖️</button>
        </div>
        <div className="sheet-scroll">
          <form onSubmit={submit}>
            <div className="field">
              <label>Pôle *</label>
              <div className="chips">
                {POLES.map(p => (
                  <button type="button" key={p} className={cx('chip', pole === p && 'on')} onClick={() => setPole(p)}>{p}</button>
                ))}
              </div>
            </div>

            {poleSubjects.length > 0 && (
              <div className="field">
                <label>Matière enregistrée</label>
                <select className="select" value={known?.id ?? ''} onChange={e => pickSubject(e.target.value)}>
                  <option value="">— Nouvelle matière —</option>
                  {poleSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.discipline} ({s.teacherName})</option>
                  ))}
                </select>
                <p className="hint">Choisir une matière pré-remplit enseignant, salle et liens.</p>
              </div>
            )}

            <div className="field">
              <label>Jour *</label>
              <select className="select" value={day} onChange={e => setDay(e.target.value as WeekDay)}>
                {WEEK_DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
              </select>
            </div>

            <div className="row">
              <div className="field grow">
                <label>Début *</label>
                <input className="input" type="time" value={start} onChange={e => setStart(e.target.value)} />
              </div>
              <div className="field grow">
                <label>Fin *</label>
                <input className="input" type="time" value={end} onChange={e => setEnd(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Discipline *</label>
              <input className="input" value={discipline} onChange={e => setDiscipline(e.target.value)} placeholder="Ex. Algorithmique avancée" />
            </div>

            <div className="field">
              <label>Enseignant *</label>
              <input className="input" value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="Ex. Pr. Pierre Kadet" />
            </div>

            <div className="field">
              <label>Salle</label>
              <input className="input" value={room} onChange={e => setRoom(e.target.value)} placeholder="Ex. B12, Lab 1…" />
            </div>

            <div className="field">
              <label>Lien visio</label>
              <input className="input" type="url" value={visioUrl} onChange={e => setVisioUrl(e.target.value)} placeholder="https://meet.google.com/…" />
              <label className="hint check-row">
                <input type="checkbox" checked={visioOpen} onChange={e => setVisioOpen(e.target.checked)} />
                Visio ouverte aux étudiants
              </label>
            </div>

            <div className="field">
              <label>Lien évaluation</label>
              <input className="input" type="url" value={evalUrl} onChange={e => setEvalUrl(e.target.value)} placeholder="https://moodle.univ.ga/…" />
              <label className="hint check-row">
                <input type="checkbox" checked={evalOpen} onChange={e => setEvalOpen(e.target.checked)} />
                Évaluation ouverte aux étudiants
              </label>
            </div>

            <div className="field">
              <label>Liens par groupe (optionnel)</label>
              {evalGroups.map((g, i) => (
                <div className="link-row" key={i}>
                  <input
                    className="input"
                    style={{ maxWidth: 120 }}
                    value={g.group}
                    onChange={e => setGroup(i, { group: e.target.value })}
                    placeholder={`Groupe ${i + 1}`}
                  />
                  <input
                    className="input"
                    type="url"
                    value={g.url}
                    onChange={e => setGroup(i, { url: e.target.value })}
                    placeholder="https://moodle.univ.ga/…"
                  />
                  <button
                    type="button"
                    className="modal-close"
                    aria-label="Retirer le lien"
                    onClick={() => setEvalGroups(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    ✖️
                  </button>
                </div>
              ))}
              <div className="chips">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEvalGroups(prev => [...prev, { group: `Groupe ${prev.length + 1}`, url: '' }])}>
                  + Ajouter un groupe
                </button>
              </div>
              <p className="hint">Un lien par groupe de TD : les étudiants choisissent leur groupe au moment de l’éval. Si aucun groupe n’est défini, le lien unique ci-dessus est utilisé.</p>
            </div>

            <div className="field">
              <label className="hint check-row">
                <input type="checkbox" checked={timed} onChange={e => { setTimed(e.target.checked); if (!e.target.checked) { setEvalDate(''); setEvalMinutes('60'); } }} />
                Évaluation chronométrée (durée limitée)
              </label>
              {timed && (
                <div className="row" style={{ marginTop: 8 }}>
                  <div className="field grow">
                    <label>Ouverture *</label>
                    <input className="input" type="datetime-local" value={evalDate} onChange={e => setEvalDate(e.target.value)} />
                  </div>
                  <div className="field" style={{ width: 110 }}>
                    <label>Durée (min)</label>
                    <input className="input" type="number" min={1} max={600} value={evalMinutes} onChange={e => setEvalMinutes(e.target.value)} />
                  </div>
                </div>
              )}
              {timed && <p className="hint">Avant l’ouverture le lien est désactivé (« ouvre à HH:MM »), pendant il affiche un compte à rebours, après il devient inaccessible.</p>}
            </div>

            <div className="field">
              <label>Note (optionnel)</label>
              <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex. Apporter la blouse…" />
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="row mt12" style={{ paddingBottom: 8 }}>
              <button type="button" className="btn btn-ghost grow" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary grow">{slot ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

