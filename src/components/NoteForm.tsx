import { useState } from 'react';
import { DAY_LABELS, type CourseNote, type ScheduleSlot } from '../types';
import { IconClock, IconClose } from '../ui/Icons';
import { uid } from '../utils';

export function NoteForm({ slot, existing, onClose, onSave, onDelete }: {
  slot?: ScheduleSlot;
  existing?: CourseNote;
  onClose: () => void;
  onSave: (note: CourseNote) => void;
  onDelete: (id: string) => void;
}) {
  const [body, setBody] = useState(existing?.body ?? '');
  const [done, setDone] = useState(existing?.done ?? false);
  const [hasDue, setHasDue] = useState(!!existing?.dueAt);
  const [dueDate, setDueDate] = useState(existing?.dueAt ? existing.dueAt.slice(0, 10) : '');
  const [dueTime, setDueTime] = useState(existing?.dueAt ? existing.dueAt.slice(11, 16) : '23:59');
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 3) return setError('Écrivez au moins quelques mots (3 caractères minimum).');
    let dueAt: string | null = null;
    if (hasDue) {
      if (!dueDate || !dueTime) return setError('Date et heure d’échéance incomplètes.');
      const t = new Date(`${dueDate}T${dueTime}`);
      if (Number.isNaN(t.getTime())) return setError('Date d’échéance invalide.');
      dueAt = t.toISOString();
    }
    onSave({
      id: existing?.id ?? uid('cn'),
      userId: '',
      slotId: slot?.id ?? existing?.slotId ?? '',
      body: body.trim(),
      done,
      dueAt,
      createdAt: existing?.createdAt ?? new Date().toISOString()
    });
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Note personnelle">
        <div className="modal-handle" />
        <div className="modal-title">
          Ma note — {slot?.discipline ?? 'Cours supprimé'}
          <button className="modal-close" onClick={onClose} aria-label="Fermer"><IconClose size={16} /></button>
        </div>
        <p className="hint" style={{ marginTop: -6, marginBottom: 14 }}>
          {slot ? `${DAY_LABELS[slot.day]} · ${slot.start}–${slot.end} · ${slot.teacherName}. ` : ''}
          Visible par vous seul·e.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Que faut-il retenir ?</label>
            <textarea
              className="textarea"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Ex. Devoir à rendre sur Moodle avant dimanche 23h59 — exercices 1 à 5 du TD 4. Apporter le polycopié."
              autoFocus
            />
          </div>

          <div className="field">
            <label><span className="row" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><IconClock size={14} /> À rendre avant</span></label>
            <label className="hint check-row">
              <input type="checkbox" checked={hasDue} onChange={e => setHasDue(e.target.checked)} />
              Définir une échéance (rappel automatique 48 h avant)
            </label>
            {hasDue && (
              <div className="row" style={{ marginTop: 10 }}>
                <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} aria-label="Date limite" />
                <input className="input" type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} aria-label="Heure limite" style={{ maxWidth: 130 }} />
              </div>
            )}
            {hasDue && dueDate && dueTime && (
              <p className="hint">
                {new Date(`${dueDate}T${dueTime}`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {dueTime} — un rappel apparaîtra dans les annonces et le planning à moins de 48 h de l’échéance.
              </p>
            )}
          </div>

          <label className="hint check-row">
            <input type="checkbox" checked={done} onChange={e => setDone(e.target.checked)} />
            Traitée (masquée du bandeau et des rappels, affichée cochée sur la carte)
          </label>
          {error && <p className="error-text">{error}</p>}
          <div className="row mt12" style={{ flexWrap: 'wrap', gap: 8 }}>
            {existing && (
              confirmDel ? (
                <>
                  <button type="button" className="btn btn-danger grow" onClick={() => onDelete(existing.id)}>Confirmer la suppression</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(false)}>Annuler</button>
                </>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(true)}>Supprimer</button>
              )
            )}
            <button type="button" className="btn btn-ghost grow" onClick={onClose}>Fermer</button>
            <button type="submit" className="btn btn-primary grow">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
