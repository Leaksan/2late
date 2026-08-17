import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { frNum, weightedAverage, cx, timeAgo } from '../utils';
import { IconChevronLeft, IconClose, IconGraduation, IconPlus } from '../ui/Icons';
import type { Grade } from '../types';

function avgColor(avg: number | null): string {
  if (avg == null) return 'var(--muted)';
  if (avg >= 14) return 'var(--green)';
  if (avg >= 10) return 'var(--primary)';
  return 'var(--red)';
}

function AddGradeModal({ onClose }: { onClose: () => void }) {
  const { db, user, addGrade } = useStore();
  const [discipline, setDiscipline] = useState('');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [coef, setCoef] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const disciplines = useMemo(() => {
    const fromSubjects = user?.pole ? db.subjects.filter(s => s.pole === user.pole).map(s => s.discipline) : [];
    const fromGrades = db.grades.filter(g => g.userId === user?.id).map(g => g.discipline);
    return [...new Set([...fromSubjects, ...fromGrades])].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [db, user]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = Number(value.trim().replace(',', '.'));
    const parsedCoef = Number(coef.trim().replace(',', '.'));
    const err = addGrade({ discipline, title, value: parsedValue, coef: parsedCoef });
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Ajouter une note">
        <div className="modal-handle" />
        <div className="modal-title">
          Ajouter une note
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✖️</button>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label>Matière *</label>
            <input className="input" list="grade-disciplines" value={discipline} onChange={e => setDiscipline(e.target.value)} placeholder="Ex. Algorithmique avancée" />
            <datalist id="grade-disciplines">
              {disciplines.map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div className="field">
            <label>Intitulé du devoir *</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. CC1, TP noté n°3, oral…" maxLength={80} />
          </div>
          <div className="row" style={{ gap: 10 }}>
            <div className="field grow">
              <label>Note / 20 *</label>
              <input className="input" value={value} onChange={e => setValue(e.target.value)} placeholder="Ex. 14,5" inputMode="decimal" />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label>Coefficient</label>
              <input className="input" value={coef} onChange={e => setCoef(e.target.value)} inputMode="decimal" />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="row mt12">
            <button type="button" className="btn btn-ghost grow" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary grow">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GradeRow({ grade, onDelete }: { grade: Grade; onDelete: (id: string) => void }) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="grade-row">
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="grade-row-title">{grade.title}</div>
        <div className="grade-row-sub">
          {timeAgo(grade.createdAt)} · coef ×{frNum(grade.coef)}
        </div>
      </div>
      <span className="grade-val" style={{ color: avgColor(grade.value) }}>
        {frNum(grade.value)}<small>/20</small>
      </span>
      {confirmDel ? (
        <div className="row" style={{ gap: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(false)}>Non</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(grade.id)}>Oui</button>
        </div>
      ) : (
        <button className="grade-del" onClick={() => setConfirmDel(true)} aria-label="Supprimer la note">×</button>
      )}
    </div>
  );
}

export function GradesScreen({ onBack }: { onBack: () => void }) {
  const { db, user, deleteGrade } = useStore();
  const [modal, setModal] = useState(false);

  const myGrades = useMemo(
    () => (user ? db.grades.filter(g => g.userId === user.id) : []),
    [db.grades, user]
  );

  const groups = useMemo(() => {
    const byDiscipline = new Map<string, Grade[]>();
    for (const g of myGrades) {
      const list = byDiscipline.get(g.discipline) ?? [];
      list.push(g);
      byDiscipline.set(g.discipline, list);
    }
    return [...byDiscipline.entries()]
      .map(([discipline, grades]) => ({
        discipline,
        grades: [...grades].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
        avg: weightedAverage(grades)
      }))
      .sort((a, b) => a.discipline.localeCompare(b.discipline, 'fr'));
  }, [myGrades]);

  const globalAvg = useMemo(() => weightedAverage(myGrades), [myGrades]);
  const totalCoef = useMemo(() => myGrades.reduce((s, g) => s + g.coef, 0), [myGrades]);

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <button className="topbar-back" onClick={onBack} style={{ marginBottom: 14 }} aria-label="Retour">
        ←
      </button>

      <div className={cx('grade-hero', globalAvg != null && globalAvg < 10 && 'low')}>
        <div className="grade-hero-label">Moyenne générale pondérée</div>
        <div className="grade-hero-num" style={{ color: avgColor(globalAvg) }}>
          {globalAvg == null ? '—' : frNum(globalAvg)}<small>/20</small>
        </div>
        <div className="grade-hero-sub">
          {myGrades.length === 0
            ? 'Enregistrez vos notes de devoirs pour calculer votre moyenne.'
            : `${myGrades.length} note${myGrades.length > 1 ? 's' : ''} · ${groups.length} matière${groups.length > 1 ? 's' : ''} · coefficient total ×${frNum(totalCoef)}`}
        </div>
      </div>

      {groups.map(g => (
        <div className="grade-group" key={g.discipline}>
          <div className="grade-group-head">
            <span className="grade-group-name">{g.discipline}</span>
            <span className="grade-group-avg" style={{ color: avgColor(g.avg) }}>
              {frNum(g.avg ?? 0)}/20
            </span>
          </div>
          {g.grades.map(grade => (
            <GradeRow key={grade.id} grade={grade} onDelete={deleteGrade} />
          ))}
        </div>
      ))}

      {myGrades.length === 0 && (
        <div className="empty">
          <div className="empty-ico">🎓</div>
          <b>Aucune note enregistrée</b>
          <p>Ajoutez vos notes reçues aux devoirs et contrôles : la moyenne se calcule automatiquement.</p>
        </div>
      )}

      <button className="fab" onClick={() => setModal(true)} aria-label="Ajouter une note">
        ➕
      </button>

      {modal && <AddGradeModal onClose={() => setModal(false)} />}
    </div>
  );
}
