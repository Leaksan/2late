import { useState } from 'react';
import { COLLECT_ACCESS_LABELS, POLES, POLE_LABELS, REPEAT_LABELS, TYPES, TYPE_INFO, type Announcement, type AnnLink, type CollectAccess, type Pole, type RepeatKind } from '../types';
import { useStore } from '../store';
import { IconAlertCircle, IconChevronLeft, IconClock, IconClose, IconInfinity, IconLink } from '../ui/Icons';
import { cx, uid } from '../utils';

const DURATIONS: Array<{ label: string; hours: number }> = [
  { label: '1 heure', hours: 1 },
  { label: '6 heures', hours: 6 },
  { label: '24 heures', hours: 24 },
  { label: '3 jours', hours: 72 },
  { label: '1 semaine', hours: 168 },
  { label: '2 semaines', hours: 336 }
];

const QUICK_LABELS = ['Visio', 'Évaluation', 'Document', 'Groupe WhatsApp'];

function toLocalDT(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PublishScreen({ onDone, onCancel }: { onDone: (id: string) => void; onCancel: () => void }) {
  const { user, publish } = useStore();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Announcement['type']>('GENERALE');
  const [description, setDescription] = useState('');
  const [poles, setPoles] = useState<Pole[]>(user?.pole ? [user.pole] : []);
  const [priority, setPriority] = useState<Announcement['priority']>('NORMALE');
  const [temporary, setTemporary] = useState(false);
  const [durationH, setDurationH] = useState(24);
  const [customH, setCustomH] = useState('');
  const [links, setLinks] = useState<AnnLink[]>([]);
  const [collectAccess, setCollectAccess] = useState<CollectAccess>('PROF');
  const [collectEmail, setCollectEmail] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [repeat, setRepeat] = useState<RepeatKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const canUrgent = user.role === 'PROF' || user.role === 'ADMIN';
  const isRelais = user.role === 'RELAIS';

  const togglePole = (p: Pole) => {
    setPoles(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));
  };

  const setLink = (id: string, patch: Partial<AnnLink>) => {
    setLinks(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    let expiresAt: string | null = null;
    if (temporary) {
      const hours = durationH === -1 ? Number(customH) : durationH;
      if (!Number.isFinite(hours) || hours <= 0) return setError('Durée invalide pour l’annonce temporaire.');
      expiresAt = new Date(Date.now() + hours * 3600_000).toISOString();
    }
    let publishAtIso: string | null = null;
    if (scheduled) {
      if (!publishAt) return setError('Indiquez la date et l’heure de publication programmée.');
      publishAtIso = new Date(publishAt).toISOString();
    }
    const err = publish({ title, type, description, poles, priority, links, expiresAt, collectAccess, collectEmail, publishAt: publishAtIso, repeat });
    if (err) setError(err);
    else onDone('new');
  };

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <button className="topbar-back" onClick={onCancel} style={{ marginBottom: 14 }} aria-label="Annuler">
        <IconChevronLeft size={20} />
      </button>

      {isRelais && (
        <div className="pill-info" style={{ marginBottom: 16 }}>
          Vos publications sont soumises au <b>vote de fiabilité</b> des étudiants du pôle. Renseignez bien la source de l’information dans la description.
        </div>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label>Titre de l’annonce *</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. Report de l’examen de statistiques" maxLength={120} />
        </div>

        <div className="field">
          <label>Type</label>
          <div className="publish-type-grid">
            {TYPES.map(t => (
              <button type="button" key={t} className={cx('type-btn', type === t && 'on')} onClick={() => setType(t)}>
                {TYPE_INFO[t].label}
              </button>
            ))}
          </div>
          {type === 'PARTICIPATIVE' && (
            <p className="hint">Collecte participative : les étudiants déposent leurs documents (exercices, devoirs) directement dans l’annonce — plus de fichiers perdus entre WhatsApp et votre boîte mail. Vous récupérez le tout classé par étudiant, avec l’heure de chaque dépôt.</p>
          )}
        </div>

        {type === 'PARTICIPATIVE' && (
          <>
            <div className="field">
              <label>Qui pourra télécharger les documents collectés ? *</label>
              <div className="chips">
                {(['AUTHOR', 'PROF', 'RELAIS'] as CollectAccess[]).map(a => (
                  <button type="button" key={a} className={cx('chip', collectAccess === a && 'on')} onClick={() => setCollectAccess(a)}>
                    {COLLECT_ACCESS_LABELS[a]}
                  </button>
                ))}
              </div>
              <p className="hint">Réglage modifiable à tout moment depuis l’annonce. L’administration garde toujours un accès de supervision.</p>
            </div>
            <div className="field">
              <label>Réception automatique par e-mail (optionnel)</label>
              <input
                className="input"
                type="email"
                value={collectEmail}
                onChange={e => setCollectEmail(e.target.value)}
                placeholder={user.email}
              />
              <p className="hint">Chaque document déposé par les étudiants vous est transmis automatiquement à cette adresse (votre e-mail de compte par défaut).</p>
            </div>
          </>
        )}

        <div className="field">
          <label>Description / Plus d’infos</label>
          <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails, horaires, salle, lien, source de l’information…" />
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
          <label>Liens (optionnel)</label>
          {links.map(l => (
            <div className="link-row" key={l.id}>
              <input
                className="input"
                value={l.label}
                onChange={e => setLink(l.id, { label: e.target.value })}
                placeholder="Titre du bouton (ex. Visio)"
              />
              <input
                className="input"
                type="url"
                value={l.url}
                onChange={e => setLink(l.id, { url: e.target.value })}
                placeholder="https://…"
              />
              <button
                type="button"
                className="modal-close"
                aria-label="Retirer le lien"
                onClick={() => setLinks(prev => prev.filter(x => x.id !== l.id))}
              >
                <IconClose size={14} />
              </button>
            </div>
          ))}
          <div className="chips">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLinks(prev => [...prev, { id: uid('lnk'), label: '', url: '' }])}>
              + Ajouter un lien
            </button>
            {QUICK_LABELS.map(q => (
              <button
                key={q}
                type="button"
                className="chip"
                onClick={() => setLinks(prev => (prev.some(l => l.label === q) ? prev : [...prev, { id: uid('lnk'), label: q, url: '' }]))}
              >
                + {q}
              </button>
            ))}
          </div>
          <p className="hint">Les URLs ne sont jamais affichées : les lecteurs verront des boutons.</p>
        </div>

        <div className="field">
          <label>Durée de l’annonce *</label>
          <div className="priority-row">
            <button type="button" className={cx('type-btn', !temporary && 'on')} onClick={() => setTemporary(false)}>
              <span className="row" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><IconInfinity size={15} /> Persistante</span>
            </button>
            <button type="button" className={cx('type-btn', temporary && 'on')} onClick={() => setTemporary(true)}>
              <span className="row" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><IconClock size={15} /> Temporaire</span>
            </button>
          </div>
          {temporary && (
            <>
              <select className="select" style={{ marginTop: 8 }} value={durationH} onChange={e => setDurationH(Number(e.target.value))}>
                {DURATIONS.map(d => (
                  <option key={d.hours} value={d.hours}>{d.label}</option>
                ))}
                <option value={-1}>Autre (personnalisé)…</option>
              </select>
              {durationH === -1 && (
                <input
                  className="input"
                  style={{ marginTop: 8 }}
                  type="number"
                  min={1}
                  value={customH}
                  onChange={e => setCustomH(e.target.value)}
                  placeholder="Durée en heures (ex. 48)"
                />
              )}
              <p className="hint">L’annonce disparaîtra automatiquement du feed à l’expiration, sans rien supprimer.</p>
            </>
          )}
          {!temporary && <p className="hint">Reste affichée jusqu’à sa suppression manuelle.</p>}
        </div>

        <div className="field">
          <label>Publication programmée</label>
          <div className="priority-row">
            <button type="button" className={cx('type-btn', !scheduled && 'on')} onClick={() => { setScheduled(false); setPublishAt(''); }}>
              Immédiate
            </button>
            <button type="button" className={cx('type-btn', scheduled && 'on')} onClick={() => setScheduled(true)}>
              Programmer…
            </button>
          </div>
          {scheduled && (
            <>
              <input
                className="input"
                style={{ marginTop: 8 }}
                type="datetime-local"
                value={publishAt}
                onChange={e => setPublishAt(e.target.value)}
              />
              <p className="hint">L’annonce apparaîtra automatiquement dans les fils à cette date et heure — invisible avant.</p>
            </>
          )}
        </div>

        <div className="field">
          <label>Annonce répétée</label>
          <div className="chips">
            <button type="button" className={cx('chip', repeat === null && 'on')} onClick={() => setRepeat(null)}>
              Ponctuelle
            </button>
            {(['DAILY', 'WEEKLY', 'MONTHLY'] as RepeatKind[]).map(r => (
              <button type="button" key={r} className={cx('chip', repeat === r && 'on')} onClick={() => setRepeat(r)}>
                🔄 {REPEAT_LABELS[r]}
              </button>
            ))}
          </div>
          <p className="hint">Une annonce répétée revient automatiquement dans « À lire » à chaque cycle, même après consultation — idéal pour les rappels réguliers.</p>
        </div>

        <div className="field">
          <label>Priorité</label>
          <div className="priority-row">
            <button type="button" className={cx('type-btn', priority === 'NORMALE' && 'on')} onClick={() => setPriority('NORMALE')}>
              Normale
            </button>
            <button
              type="button"
              className={cx('type-btn', priority === 'URGENTE' && 'on')}
              onClick={() => setPriority('URGENTE')}
              disabled={!canUrgent}
              title={canUrgent ? undefined : 'Réservé aux professeurs et à l’administration'}
            >
              <span className="row" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}><IconAlertCircle size={15} /> Urgente</span>
            </button>
          </div>
          {!canUrgent && <p className="hint">La priorité urgente est réservée aux professeurs et à l’administration.</p>}
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="row mt16">
          <button type="button" className="btn btn-ghost grow" onClick={onCancel}>Annuler</button>
          <button type="submit" className="btn btn-primary grow">Publier</button>
        </div>
      </form>
    </div>
  );
}
