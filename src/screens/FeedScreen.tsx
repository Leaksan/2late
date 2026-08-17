import { useMemo, useState } from 'react';
import { feeds, visibleAnnouncements } from '../data/db';
import { useStore } from '../store';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { NoteForm } from '../components/NoteForm';
import { IconAlertCircle, IconBell, IconClock, IconEye, IconPlus } from '../ui/Icons';
import { countdown, cx } from '../utils';
import { useNow } from '../hooks/useNow';
import { DAY_LABELS, type CourseNote, type ScheduleSlot } from '../types';

export function FeedScreen({ onOpen, onPublish }: { onOpen: (id: string) => void; onPublish: () => void }) {
  const { db, user, upsertCourseNote, deleteCourseNote } = useStore();
  const [tab, setTab] = useState<'toRead' | 'seen'>('toRead');
  const [editing, setEditing] = useState<{ note: CourseNote; slot?: ScheduleSlot } | null>(null);
  useNow(1000);

  const { toRead, seen } = useMemo(() => (user ? feeds(db, user) : { toRead: [], seen: [] }), [db, user]);
  const list = tab === 'toRead' ? toRead : seen;
  const nbUrgent = toRead.filter(a => a.priority === 'URGENTE').length;
  const canPublish = user && (user.role === 'PROF' || user.role === 'RELAIS' || user.role === 'ADMIN');
  const hasAny = user && visibleAnnouncements(db, user).length > 0;

  const reminders = useMemo<Array<{ note: CourseNote; slot?: ScheduleSlot }>>(() => {
    if (!user) return [];
    return db.courseNotes
      .filter(n => n.userId === user.id && !n.done && n.dueAt)
      .filter(n => {
        const left = Date.parse(n.dueAt!) - Date.now();
        return left >= -3600_000 && left <= 48 * 3600_000;
      })
      .sort((a, b) => Date.parse(a.dueAt!) - Date.parse(b.dueAt!))
      .map(n => ({ note: n, slot: db.scheduleSlots.find(x => x.id === n.slotId) }));
  }, [db, user]);

  return (
    <>
      <div className="tabs">
        <button className={cx('tab', tab === 'toRead' && 'active')} onClick={() => setTab('toRead')}>
          <IconBell size={15} /> À lire <span className="tab-count">{toRead.length}</span>
        </button>
        <button className={cx('tab', tab === 'seen' && 'active')} onClick={() => setTab('seen')}>
          <IconEye size={15} /> Vu récemment <span className="tab-count">{seen.length}</span>
        </button>
      </div>

      {nbUrgent > 0 && tab === 'toRead' && (
        <div className="pill-info row" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 14 }}>
          <span style={{ flex: 'none', marginTop: 2, color: 'var(--red)' }}><IconAlertCircle size={15} /></span>
          <span><b style={{ color: 'var(--red)' }}>{nbUrgent}</b> annonce{nbUrgent > 1 ? 's' : ''} urgente{nbUrgent > 1 ? 's' : ''} non lue{nbUrgent > 1 ? 's' : ''} — elles apparaissent en tête de liste.</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'toRead' &&
          reminders.map(({ note, slot }) => {
            const cd = countdown(note.dueAt!);
            return (
              <div
                key={note.id}
                className={cx('reminder-task', cd.late && 'late')}
                role="button"
                tabIndex={0}
                onClick={() => setEditing({ note, slot })}
                onKeyDown={e => { if (e.key === 'Enter') setEditing({ note, slot }); }}
              >
                <div className="reminder-head">
                  <span className="reminder-kicker"><IconClock size={13} /> Rappel · note perso</span>
                  <span className={cx('reminder-timer', cd.late && 'late')}>
                    {cd.late ? 'dépassé' : cd.text}
                  </span>
                </div>
                <p className="reminder-body">N’oublie pas : {note.body}</p>
                <div className="reminder-foot">
                  <span>{slot ? `${slot.discipline} · ${DAY_LABELS[slot.day]}${slot.start ? ` ${slot.start}` : ''}` : 'Cours'}</span>
                  <span className="sep">·</span>
                  <span>Rendre avant le {new Date(note.dueAt!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} {new Date(note.dueAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span className="reminder-hint">Toucher pour modifier ou supprimer</span>
              </div>
            );
          })}
        {list.map(ann => (
          <AnnouncementCard key={ann.id} ann={ann} onOpen={onOpen} />
        ))}
      </div>

      {list.length === 0 && reminders.length === 0 && (
        <div className="empty">
          <div className="empty-ico">{tab === 'toRead' ? <IconBell size={26} /> : <IconEye size={26} />}</div>
          {tab === 'toRead' ? (
            hasAny ? (
              <>
                <b>Tout est lu</b>
                <p>Aucune annonce en attente pour votre pôle. Revenez plus tard.</p>
              </>
            ) : (
              <>
                <b>Aucune annonce pour l’instant</b>
                <p>Les publications concernant votre pôle apparaîtront ici automatiquement.</p>
              </>
            )
          ) : (
            <>
              <b>Historique vide</b>
              <p>Les annonces consultées basculent ici, triées par date de lecture.</p>
            </>
          )}
        </div>
      )}

      {editing && user && (
        <NoteForm
          slot={editing.slot}
          existing={editing.note}
          onClose={() => setEditing(null)}
          onSave={note => { upsertCourseNote({ ...note, userId: user.id }); setEditing(null); }}
          onDelete={id => { deleteCourseNote(id); setEditing(null); }}
        />
      )}

      {canPublish && (
        <button className="fab" onClick={onPublish} aria-label="Publier une annonce">
          <IconPlus size={26} />
        </button>
      )}
    </>
  );
}
