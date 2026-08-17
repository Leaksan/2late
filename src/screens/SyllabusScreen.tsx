import { useEffect, useMemo, useState } from 'react';
import { POLES, POLE_LABELS, type Pole, type SyllabusDoc } from '../types';
import { useStore } from '../store';
import { userById } from '../data/db';
import { demoPdf, formatSize, getFile, putFile } from '../data/files';
import { IconBook, IconClose, IconFileText, IconPlus } from '../ui/Icons';
import { cx, timeAgo } from '../utils';

const SORT_KEY = '2late.syl.sort';
type SylSort = 'recent' | 'old' | 'title' | 'discipline';
const SORTS: Array<{ id: SylSort; label: string }> = [
  { id: 'recent', label: 'Plus récents' },
  { id: 'old', label: 'Plus anciens' },
  { id: 'title', label: 'Titre A→Z' },
  { id: 'discipline', label: 'Matière' }
];

// Recherche insensible à la casse et aux accents.
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

const EXT_COLORS: Record<string, string> = {
  pdf: '#FF7A7A',
  png: '#7CD992',
  jpg: '#7CD992',
  jpeg: '#7CD992',
  webp: '#7CD992',
  doc: '#7CB9FF',
  docx: '#7CB9FF',
  ppt: '#E5A458',
  pptx: '#E5A458',
  xls: '#7CD992',
  xlsx: '#7CD992',
  zip: '#B9A4FF'
};

function extOf(doc: SyllabusDoc): string {
  const m = doc.fileName.match(/\.([a-z0-9]+)$/i) ?? doc.fileType.split('/').pop()?.match(/^([a-z0-9]+)/i);
  return (m ? m[1] : 'file').toLowerCase();
}

function DocCard({ doc, onOpen }: { doc: SyllabusDoc; onOpen: (doc: SyllabusDoc) => void }) {
  const { db, user, deleteSyllabusDoc } = useStore();
  const [confirmDel, setConfirmDel] = useState(false);
  const author = userById(db, doc.authorId);
  const ext = extOf(doc);
  const canDelete = user && (user.role === 'ADMIN' || user.id === doc.authorId);

  return (
    <div className="syl-card">
      <div className="syl-card-head">
        <span className="syl-ext" style={{ color: EXT_COLORS[ext] ?? '#9AA7B8', borderColor: EXT_COLORS[ext] ?? '#9AA7B8' }}>
          {ext}
        </span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="syl-title">{doc.title}</div>
          <div className="syl-sub">
            {author ? author.name : 'Compte supprimé'} · {timeAgo(doc.createdAt)}
          </div>
        </div>
      </div>
      {doc.description && <p className="syl-desc">{doc.description}</p>}
      <div className="syl-meta">
        {doc.discipline && <span className="syl-tag">{doc.discipline}</span>}
        {doc.poles.length === POLES.length
          ? <span className="syl-tag">Tous pôles</span>
          : doc.poles.map(p => <span key={p} className="syl-tag">{p}</span>)}
        <span className="syl-info">{doc.fileName} · {formatSize(doc.fileSize)}</span>
      </div>
      <div className="row mt12">
        <button className="btn btn-primary btn-sm grow" onClick={() => onOpen(doc)}>
          Ouvrir le document
        </button>
        {canDelete && (
          confirmDel ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(false)}>Annuler</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteSyllabusDoc(doc.id)}>Confirmer</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(true)} aria-label="Supprimer">Supprimer</button>
          )
        )}
      </div>
    </div>
  );
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const { db, user, addSyllabusDoc } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [poles, setPoles] = useState<Pole[]>(user?.pole ? [user.pole] : []);
  const [discipline, setDiscipline] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disciplines = useMemo(() => {
    const list = db.subjects.filter(s => poles.includes(s.pole)).map(s => s.discipline);
    return [...new Set(list)].sort();
  }, [db.subjects, poles]);

  const togglePole = (p: Pole) => setPoles(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await addSyllabusDoc({ title, description, poles, discipline, file: file! });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Déposer un document">
        <div className="modal-handle" />
        <div className="modal-title">
          Déposer un document
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✖️</button>
        </div>
        <form onSubmit={submit}>
          <div className="field">
            <label>Titre du document *</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. Programme du cours, fiche de TP…" maxLength={120} />
          </div>
          <div className="field">
            <label>Description (optionnel)</label>
            <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="À quoi sert ce document ? Consignes, chapitres couverts…" />
          </div>
          <div className="field">
            <label>Pôles cibles *</label>
            <div className="chips">
              {POLES.map(p => (
                <button type="button" key={p} className={cx('chip', poles.includes(p) && 'on')} onClick={() => togglePole(p)} title={POLE_LABELS[p]}>
                  {p}
                </button>
              ))}
            </div>
            <p className="hint">{poles.length === 5 ? 'Tous les pôles' : poles.length === 0 ? 'Sélectionnez au moins un pôle' : poles.map(p => POLE_LABELS[p]).join(' · ')}</p>
          </div>
          <div className="field">
            <label>Discipline (optionnel)</label>
            <input className="input" list="syl-disciplines" value={discipline} onChange={e => setDiscipline(e.target.value)} placeholder="Ex. Algorithmique avancée" />
            <datalist id="syl-disciplines">
              {disciplines.map(d => <option key={d} value={d} />)}
            </datalist>
            <p className="hint">Rattachée aux matières des pôles sélectionnés.</p>
          </div>
          <div className="field">
            <label>Fichier *</label>
            <label className="syl-file-input">
              <input
                type="file"
                accept="application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
              📄
              <span className="grow" style={{ minWidth: 0 }}>
                {file ? file.name : 'Choisir un fichier (PDF, image, document…)'}
                {file && <span className="syl-file-size"> · {formatSize(file.size)}</span>}
              </span>
            </label>
            <p className="hint">20 Mo maximum. Le fichier reste stocké sur cet appareil (démo hors ligne).</p>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="row mt12">
            <button type="button" className="btn btn-ghost grow" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary grow" disabled={busy || !file}>
              {busy ? 'Dépôt…' : 'Déposer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SyllabusScreen() {
  const { db, user } = useStore();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [openErr, setOpenErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SylSort>(() => {
    const saved = localStorage.getItem(SORT_KEY) as SylSort | null;
    return saved && SORTS.some(s => s.id === saved) ? saved : 'recent';
  });
  const canPost = user && (user.role === 'PROF' || user.role === 'RELAIS' || user.role === 'ADMIN');

  useEffect(() => {
    localStorage.setItem(SORT_KEY, sort);
  }, [sort]);

  const visible = useMemo(() => {
    if (!user) return [];
    const list = user.role === 'PROF' || user.role === 'ADMIN'
      ? db.syllabusDocs
      : user.pole
        ? db.syllabusDocs.filter(doc => doc.poles.includes(user.pole!))
        : [];
    const query = norm(q.trim());
    const matching = query
      ? list.filter(doc => {
          const author = userById(db, doc.authorId);
          return [doc.title, doc.description ?? '', doc.discipline ?? '', doc.fileName, author?.name ?? '']
            .some(field => norm(field).includes(query));
        })
      : list;
    const sorted = [...matching];
    if (sort === 'recent') sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    if (sort === 'old') sorted.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    if (sort === 'discipline') {
      sorted.sort((a, b) =>
        (a.discipline ?? 'zz').localeCompare(b.discipline ?? 'zz', 'fr') ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
    }
    return sorted;
  }, [db, user, q, sort]);

  const open = async (doc: SyllabusDoc) => {
    setOpenErr(null);
    try {
      let blob = await getFile(doc.id);
      if (!blob && doc.seed) {
        blob = demoPdf([doc.title, 'Document de démonstration 2late', '', doc.description ?? '', `Pôles : ${doc.poles.join(', ')}`]);
        void putFile(doc.id, blob).catch(() => undefined);
      }
      if (!blob) {
        setOpenErr('Fichier introuvable sur cet appareil (les dépôts ne sont pas partagés entre appareils en mode démo).');
        return;
      }
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setOpenErr('Impossible d’ouvrir ce document.');
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="pill-info row" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ flex: 'none', marginTop: 2, color: 'var(--primary)' }}>📚</span>
        <span>Documents officiels déposés par les <b>enseignants</b> et les <b>relais</b> : programmes, fiches de TP, guides…</span>
      </div>

      <div className="syl-toolbar">
        <div className="syl-search">
          <input
            className="input"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un document, une matière…"
            aria-label="Rechercher dans le syllabus"
          />
          {q && (
            <button className="syl-search-clear" onClick={() => setQ('')} aria-label="Effacer la recherche">
              ✖️
            </button>
          )}
        </div>
        <select className="select syl-sort" value={sort} onChange={e => setSort(e.target.value as SylSort)} aria-label="Trier les documents">
          {SORTS.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      {q.trim() && (
        <p className="syl-count">
          {visible.length} document{visible.length > 1 ? 's' : ''} correspond{visible.length > 1 ? 'ent' : ''} à « {q.trim()} »
        </p>
      )}

      {openErr && <p className="error-text" style={{ marginBottom: 10 }}>{openErr}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map(doc => (
          <DocCard key={doc.id} doc={doc} onOpen={open} />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="empty">
          <div className="empty-ico">📄</div>
          {q.trim() ? (
            <>
              <b>Aucun résultat</b>
              <p>Aucun document ne correspond à votre recherche. Essayez un autre mot-clé ou effacez la recherche.</p>
            </>
          ) : (
            <>
              <b>Aucun document pour l’instant</b>
              <p>{canPost ? 'Déposez le premier document pour votre pôle.' : 'Les documents déposés pour votre pôle apparaîtront ici.'}</p>
            </>
          )}
        </div>
      )}

      {canPost && (
        <button className="fab" onClick={() => setUploadOpen(true)} aria-label="Déposer un document">
          ➕
        </button>
      )}

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </>
  );
}
