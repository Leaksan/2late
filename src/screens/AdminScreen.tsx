import { useMemo, useState } from 'react';
import { POLES, REPEAT_LABELS, ROLE_LABELS, TYPES, TYPE_INFO, type Announcement, type Role, type User } from '../types';
import type { DB } from '../types';
import { isExpired, isPublished, reliabilityOfAnn, userById } from '../data/db';
import { timeLeft } from '../components/AnnouncementCard';
import type { Milestone } from '../types';
import { uid } from '../utils';
import { RoomIcon } from '../components/RoomIcon';
import { CHAT_ROOMS, defaultRoomAccess, roomAccessOf, roomParticipants } from '../data/chat';
import type { ChatRoomInfo } from '../data/chatTypes';
import { useStore } from '../store';
import { cx, formatDateTime, initials, timeAgo } from '../utils';
import { IconChat, IconCheckCircle, IconChevronDown, IconClock, IconClose, IconGauge, IconLink, IconMegaphone, IconUsers, IconVideo } from '../ui/Icons';
import { ReliabilityBadge, RoleBadge } from '../components/Badges';

type AdminTab = 'overview' | 'announcements' | 'users' | 'applications' | 'comments' | 'rooms' | 'milestones';
type RoleFilter = 'ALL' | Role;

const ROLE_ORDER: Role[] = ['ADMIN', 'PROF', 'RELAIS', 'ETUDIANT'];

function readRateOf(db: DB, ann: Announcement): number | null {
  const audience = db.users.filter(u => (u.role === 'ETUDIANT' || u.role === 'RELAIS') && u.pole && ann.poles.includes(u.pole));
  if (audience.length === 0) return null;
  const ids = new Set(audience.map(u => u.id));
  const readers = db.reads.filter(r => r.announcementId === ann.id && ids.has(r.userId)).length;
  return Math.round((readers / audience.length) * 100);
}

function MilestonesAdmin() {
  const { db, upsertMilestone, deleteMilestone, resetMilestoneReached } = useStore();
  const count = db.users.length;

  return (
    <>
      <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
        Le pop-up de remerciement s’affiche automatiquement pour toute la communauté quand le nombre de membres
        atteint un palier (à la prochaine inscription si le seuil est déjà dépassé).{' '}
        Actuellement : <b style={{ color: 'var(--text)' }}>{count} membres</b>.{' '}
        Dans le titre et le message, <code>{'{n}'}</code> est remplacé par le seuil.
      </p>

      {db.milestones.map(m => (
        <MilestoneRow
          key={m.id}
          m={m}
          count={count}
          onSave={upsertMilestone}
          onDelete={deleteMilestone}
          onReset={resetMilestoneReached}
        />
      ))}

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 6 }}
        onClick={() => upsertMilestone({
          id: uid('ms'),
          threshold: (db.milestones.at(-1)?.threshold ?? 10) * 2,
          title: '🎉 {n} membres !',
          message: 'Merci à vous ! La communauté 2late vient d’atteindre {n} membres. Merci de votre confiance — ensemble, rien n’arrive trop tard. 💙'
        })}
      >
        + Ajouter un palier
      </button>
    </>
  );
}

function MilestoneRow({ m, count, onSave, onDelete, onReset }: {
  m: Milestone;
  count: number;
  onSave: (m: Milestone) => void;
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
}) {
  const [threshold, setThreshold] = useState(String(m.threshold));
  const [title, setTitle] = useState(m.title);
  const [message, setMessage] = useState(m.message);
  const [dirty, setDirty] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const patch = (fn: () => void) => {
    fn();
    setDirty(true);
  };

  const save = () => {
    const t = Number(threshold);
    if (!Number.isInteger(t) || t <= 0) return;
    onSave({ ...m, threshold: t, title: title.trim() || '🎉 {n} membres !', message: message.trim() });
    setDirty(false);
  };

  return (
    <div className="list-card" style={{ marginBottom: 12 }}>
      <div style={{ padding: '16px 18px' }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <span className={cx('badge', m.reachedAt ? 'badge-reliable' : 'badge-novote')} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            {m.reachedAt && <IconCheckCircle size={12} />}
            {m.reachedAt ? 'Atteint' : 'En attente'}
          </span>
          <span className="hint" style={{ margin: 0 }}>
            {count >= m.threshold ? 'seuil déjà dépassé' : `dans ${m.threshold - count} membres`}
          </span>
        </div>
        <div className="row">
          <div className="field grow" style={{ marginBottom: 12 }}>
            <label>Seuil (membres)</label>
            <input className="input" type="number" min={1} value={threshold} onChange={e => patch(() => setThreshold(e.target.value))} />
          </div>
          <div className="field grow" style={{ marginBottom: 12 }}>
            <label>Titre du pop-up</label>
            <input className="input" value={title} onChange={e => patch(() => setTitle(e.target.value))} />
          </div>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Message ({'{n}'} = seuil)</label>
          <textarea className="textarea" style={{ minHeight: 80 }} value={message} onChange={e => patch(() => setMessage(e.target.value))} />
        </div>
        <div className="row mt12" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="btn btn-primary btn-sm" disabled={!dirty} onClick={save}>
            {dirty ? 'Enregistrer' : 'Enregistré'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onReset(m.id)}>Réinitialiser le déclenchement</button>
          {confirmDel ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(false)}>Annuler</button>
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(m.id)}>Confirmer</button>
            </>
          ) : (
            <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(true)}>Supprimer</button>
          )}
        </div>
      </div>
    </div>
  );
}

function RoomAdminCard({ room }: { room: ChatRoomInfo }) {
  const { db, user, setRoomAccess } = useStore();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const participants = roomParticipants(db, room.id);
  const outside = db.users.filter(u => u.id !== user.id && u.role !== 'ADMIN' && !roomAccessOf(db, u, room.id));

  return (
    <div className="list-card" style={{ marginBottom: 10 }}>
      <button className="list-row" style={{ width: '100%' }} onClick={() => setOpen(o => !o)}>
        <span className="room-emoji"><RoomIcon room={room} size={20} /></span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="list-label">{room.name}</div>
          <div className="list-sub">{room.description} · {participants.length} membre{participants.length > 1 ? 's' : ''}</div>
        </div>
          <span style={{ color: 'var(--faint)', display: 'inline-flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
          <IconChevronDown size={20} />
        </span>
      </button>

      {open && (
        <div style={{ padding: '4px 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {participants
            .filter(p => p.id !== user.id && p.role !== 'ADMIN')
            .map(p => (
              <div className="row" key={p.id}>
                <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(p.name)}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="comment-author">{p.name}</div>
                  <div className="chat-reply-label">{p.pole ? `Pôle ${p.pole}` : ROLE_LABELS[p.role]}</div>
                </div>
                <button
                  className="text-btn"
                  style={{ color: 'var(--red)' }}
                  onClick={() => setRoomAccess(room.id, p.id, false)}
                >
                  Révoquer
                </button>
              </div>
            ))}
          {participants.filter(p => p.id !== user.id && p.role !== 'ADMIN').length === 0 && (
            <p className="hint" style={{ margin: 0 }}>Aucun membre non-admin dans ce salon.</p>
          )}

          {outside.length > 0 && (
            <>
              <div className="section-title" style={{ margin: '10px 0 4px' }}>Accorder l’accès</div>
              {outside.map(u => (
                <div className="row" key={u.id}>
                  <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(u.name)}</span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="comment-author">{u.name}</div>
                    <div className="chat-reply-label">{u.pole ? `Pôle ${u.pole} · ` : ''}{ROLE_LABELS[u.role]}{defaultRoomAccess(u, room) ? ' · accès par défaut révoqué' : ''}</div>
                  </div>
                  <button className="text-btn primary" onClick={() => setRoomAccess(room.id, u.id, true)}>
                    + Accorder
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmButton({ label, confirm = 'Confirmer ?', danger, onConfirm }: {
  label: string;
  confirm?: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className={cx('text-btn', danger && 'danger')}
      onClick={e => {
        e.stopPropagation();
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
          window.setTimeout(() => setArmed(false), 2600);
        }
      }}
    >
      {armed ? confirm : label}
    </button>
  );
}

export function AdminScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const {
    db, user, decideApplication, createProf, deleteAnnouncement, deleteComment,
    deleteUser, setUserDisabled, setRelaisStatus, setReliability, createResetLink
  } = useStore();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [qAnn, setQAnn] = useState('');
  const [fAnnRole, setFAnnRole] = useState<RoleFilter>('ALL');
  const [qUser, setQUser] = useState('');
  const [fUserRole, setFUserRole] = useState<RoleFilter>('ALL');

  const [profModal, setProfModal] = useState(false);
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPwd, setPPwd] = useState('');
  const [pRole, setPRole] = useState<'PROF' | 'ADMIN'>('PROF');
  const [pErr, setPErr] = useState<string | null>(null);
  const [pOk, setPOk] = useState<string | null>(null);

  const [pwdModal, setPwdModal] = useState<User | null>(null);
  const [pwdVal, setPwdVal] = useState('');
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  const [relModal, setRelModal] = useState<{ id: string; title: string } | null>(null);
  const [relVal, setRelVal] = useState('99');
  const [relErr, setRelErr] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const students = useMemo(() => db.users.filter(u => u.role === 'ETUDIANT' || u.role === 'RELAIS'), [db.users]);
  const relaisCount = useMemo(() => db.users.filter(u => u.role === 'RELAIS').length, [db.users]);
  const urgentCount = useMemo(() => db.announcements.filter(a => a.priority === 'URGENTE').length, [db.announcements]);
  const pending = useMemo(
    () => db.applications.filter(a => a.status === 'PENDING').map(a => ({ app: a, user: userById(db, a.userId) })),
    [db]
  );
  const decided = useMemo(
    () =>
      db.applications
        .filter(a => a.status !== 'PENDING')
        .sort((a, b) => Date.parse(b.decidedAt ?? b.createdAt) - Date.parse(a.decidedAt ?? a.createdAt))
        .map(a => ({ app: a, user: userById(db, a.userId) })),
    [db]
  );
  const byPole = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of students) if (u.pole) m.set(u.pole, (m.get(u.pole) ?? 0) + 1);
    return m;
  }, [students]);
  const byType = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of db.announcements) m.set(a.type, (m.get(a.type) ?? 0) + 1);
    return m;
  }, [db.announcements]);
  const avgRead = useMemo(() => {
    const rates = db.announcements.map(a => readRateOf(db, a)).filter((r): r is number => r !== null);
    return rates.length ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : null;
  }, [db]);
  const contested = useMemo(
    () =>
      db.announcements
        .map(a => ({ ann: a, author: userById(db, a.authorId), rel: reliabilityOfAnn(db, a) }))
        .filter(x => x.author?.role === 'RELAIS' && (x.rel.pct ?? 0) < 70 && x.rel.total > 0)
        .sort((x, y) => (x.rel.pct ?? 0) - (y.rel.pct ?? 0))
        .slice(0, 5),
    [db]
  );
  const filteredAnnouncements = useMemo(() => {
    const q = qAnn.trim().toLowerCase();
    return db.announcements
      .filter(a => {
        const author = userById(db, a.authorId);
        if (fAnnRole !== 'ALL' && author?.role !== fAnnRole) return false;
        if (q && !a.title.toLowerCase().includes(q) && !(author?.name ?? '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [db, qAnn, fAnnRole]);
  const filteredUsers = useMemo(() => {
    const q = qUser.trim().toLowerCase();
    return db.users
      .filter(u => {
        if (fUserRole !== 'ALL' && u.role !== fUserRole) return false;
        if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name));
  }, [db, qUser, fUserRole]);

  if (!user) return null;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2late-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitProf = (e: React.FormEvent) => {
    e.preventDefault();
    const err = createProf(pName, pEmail, pPwd, pRole);
    setPErr(err);
    if (!err) {
      setPOk(`Compte ${pRole === 'ADMIN' ? 'administrateur' : 'professeur'} créé pour ${pName.trim()} (${pEmail.trim().toLowerCase()}).`);
      setPName('');
      setPEmail('');
      setPPwd('');
    }
  };

  const maxPole = Math.max(...POLES.map(p => byPole.get(p) ?? 0), 1);
  const maxType = Math.max(...TYPES.map(t => byType.get(t) ?? 0), 1);

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <div className="tabs admin-tabs">
        <button className={cx('tab', tab === 'overview' && 'active')} onClick={() => setTab('overview')}>Stats</button>
        <button className={cx('tab', tab === 'announcements' && 'active')} onClick={() => setTab('announcements')}>
          Annonces <span className="tab-count">{db.announcements.length}</span>
        </button>
        <button className={cx('tab', tab === 'users' && 'active')} onClick={() => setTab('users')}>Membres</button>
        <button className={cx('tab', tab === 'applications' && 'active')} onClick={() => setTab('applications')}>
          Candidatures {pending.length > 0 && <span className="tab-count">{pending.length}</span>}
        </button>
        <button className={cx('tab', tab === 'comments' && 'active')} onClick={() => setTab('comments')}>
          Comm. <span className="tab-count">{db.comments.length}</span>
        </button>
        <button className={cx('tab', tab === 'rooms' && 'active')} onClick={() => setTab('rooms')}>Salons</button>
        <button className={cx('tab', tab === 'milestones' && 'active')} onClick={() => setTab('milestones')}>Paliers</button>
      </div>

      {/* ================= VUE D'ENSEMBLE ================= */}
      {tab === 'overview' && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label"><IconUsers size={15} /> Étudiants inscrits</div>
              <div className="stat-num">{students.length}</div>
              <div className="stat-sub">{relaisCount} relais actif{relaisCount > 1 ? 's' : ''}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><IconMegaphone size={15} /> Annonces</div>
              <div className="stat-num">{db.announcements.length}</div>
              <div className="stat-sub">{urgentCount} urgente{urgentCount > 1 ? 's' : ''}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><IconChat size={15} /> Commentaires</div>
              <div className="stat-num">{db.comments.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><IconGauge size={15} /> Taux de lecture moyen</div>
              <div className="stat-num">{avgRead === null ? '—' : `${avgRead}%`}</div>
              <div className="stat-sub">publics étudiants ciblés</div>
            </div>
          </div>

          <h2 className="section-title">Répartition par pôle</h2>
          <div className="list-card">
            {POLES.map(p => {
              const n = byPole.get(p) ?? 0;
              return (
                <div className="dist-row" key={p}>
                  <span className="dist-label">{p}</span>
                  <div className="dist-bar"><div className="dist-fill" style={{ width: `${(n / maxPole) * 100}%` }} /></div>
                  <span className="dist-count">{n}</span>
                </div>
              );
            })}
          </div>

          <h2 className="section-title">Types d’annonces</h2>
          <div className="list-card">
            {TYPES.map(t => {
              const n = byType.get(t) ?? 0;
              return (
                <div className="dist-row" key={t}>
                  <span className="dist-label" style={{ width: 130, fontSize: 11 }}>{TYPE_INFO[t].label}</span>
                  <div className="dist-bar"><div className="dist-fill" style={{ width: `${(n / maxType) * 100}%`, background: 'var(--yellow)' }} /></div>
                  <span className="dist-count">{n}</span>
                </div>
              );
            })}
          </div>

          <h2 className="section-title">Annonces relais contestées</h2>
          {contested.length === 0 && <p className="hint" style={{ marginTop: 0 }}>Aucune publication relais contestée.</p>}
          {contested.map(({ ann, rel }) => (
            <div className="list-card" key={ann.id} style={{ marginBottom: 10 }}>
              <div className="list-row">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="list-label" style={{ fontSize: 14 }}>{ann.title}</div>
                  <div className="list-sub">{timeAgo(ann.createdAt)} · {ann.poles.join(' · ')}</div>
                  <div className="row-flags"><ReliabilityBadge pct={rel.pct} total={rel.total} /></div>
                </div>
                <div className="list-actions">
                  <button className="text-btn primary" onClick={() => onOpen(ann.id)}>Ouvrir</button>
                  <ConfirmButton label="Supprimer" danger onConfirm={() => deleteAnnouncement(ann.id)} />
                </div>
              </div>
            </div>
          ))}

          <div className="row mt16">
            <button className="btn btn-ghost btn-sm" onClick={exportJSON}>Exporter les données (JSON)</button>
          </div>
        </>
      )}

      {/* ================= ANNONCES ================= */}
      {tab === 'announcements' && (
        <>
          <div className="admin-toolbar">
            <input className="input" placeholder="Rechercher titre ou auteur…" value={qAnn} onChange={e => setQAnn(e.target.value)} />
            <select className="select" value={fAnnRole} onChange={e => setFAnnRole(e.target.value as RoleFilter)} aria-label="Filtrer par rôle">
              <option value="ALL">Tous rôles</option>
              <option value="PROF">PROF</option>
              <option value="RELAIS">RELAIS</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          {filteredAnnouncements.map(ann => {
            const author = userById(db, ann.authorId);
            const rel = reliabilityOfAnn(db, ann);
            const rate = readRateOf(db, ann);
            const nbComments = db.comments.filter(c => c.announcementId === ann.id).length;
            return (
              <div className="list-card" key={ann.id} style={{ marginBottom: 10 }}>
                <div className="list-row">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="list-label" style={{ fontSize: 14.5 }}>{ann.title}</div>
                    <div className="list-sub">{author?.name ?? '—'} · {timeAgo(ann.createdAt)} · {ann.poles.join(' · ')}</div>
                    <div className="row-flags">
                      {author && <RoleBadge role={author.role} />}
                      {ann.priority === 'URGENTE' && <span className="badge badge-urgent">URGENT</span>}
                      <span className="badge badge-type">{TYPE_INFO[ann.type].label}</span>
                      {!isPublished(ann) && (
                        <span className="badge badge-temp" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconClock size={11} /> programmée · {new Date(ann.publishAt!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} {new Date(ann.publishAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {ann.repeat && <span className="badge badge-repeat">🔄 {REPEAT_LABELS[ann.repeat]}</span>}
                      {author?.role === 'RELAIS' && <ReliabilityBadge pct={rel.pct} total={rel.total} />}
                      {isExpired(ann) ? (
                        <span className="badge badge-off">Expirée</span>
                      ) : (
                        ann.expiresAt ? (
                          <span className="badge badge-temp" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <IconClock size={11} /> {timeLeft(ann.expiresAt)}
                          </span>
                        ) : null
                      )}
                      {rate !== null && <span className="badge badge-type">Lu à {rate}%</span>}
                      {nbComments > 0 && <span className="badge badge-type">{nbComments} comm.</span>}
                    </div>
                  </div>
                  <div className="list-actions">
                    <button className="text-btn primary" onClick={() => onOpen(ann.id)}>Ouvrir</button>
                    {author?.role === 'RELAIS' && (
                      <button
                        className="text-btn"
                        onClick={() => {
                          setRelModal({ id: ann.id, title: ann.title });
                          setRelVal(ann.reliabilityOverride != null ? String(ann.reliabilityOverride) : '99');
                          setRelErr(null);
                        }}
                      >
                        Fiabilité…
                      </button>
                    )}
                    <ConfirmButton label="Supprimer" danger onConfirm={() => deleteAnnouncement(ann.id)} />
                  </div>
                </div>
              </div>
            );
          })}
          {filteredAnnouncements.length === 0 && <p className="hint">Aucune annonce ne correspond à la recherche.</p>}
        </>
      )}

      {/* ================= MEMBRES ================= */}
      {tab === 'users' && (
        <>
          <div className="admin-toolbar">
            <input className="input" placeholder="Rechercher nom ou e-mail…" value={qUser} onChange={e => setQUser(e.target.value)} />
            <select className="select" value={fUserRole} onChange={e => setFUserRole(e.target.value as RoleFilter)} aria-label="Filtrer par rôle">
              <option value="ALL">Tous rôles</option>
              {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>

          <button
            className="btn btn-primary btn-block"
            style={{ marginBottom: 14 }}
            onClick={() => { setProfModal(true); setPErr(null); setPOk(null); }}
          >
            + Créer un compte Prof / Informaticien / Admin
          </button>

          {filteredUsers.map(u => {
            const self = u.id === user.id;
            return (
              <div className="list-card" key={u.id} style={{ marginBottom: 10 }}>
                <div className="list-row">
                  <span className="avatar">{initials(u.name)}</span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row" style={{ flexWrap: 'wrap' }}>
                      <span className="list-label" style={{ fontSize: 14.5 }}>{u.name}</span>
                      {self && <span className="badge badge-type">vous</span>}
                      {u.disabled && <span className="badge badge-off">Désactivé</span>}
                    </div>
                    <div className="list-sub">{u.email}{u.pole ? ` · ${u.pole}` : ''} · {ROLE_LABELS[u.role]}</div>
                  </div>
                  {!self && (
                    <div className="list-actions">
                      {u.role === 'ETUDIANT' && (
                        <button className="text-btn primary" onClick={() => setRelaisStatus(u.id, true)}>Promouvoir Relais</button>
                      )}
                      {u.role === 'RELAIS' && (
                        <button className="text-btn" onClick={() => setRelaisStatus(u.id, false)}>Révoquer Relais</button>
                      )}
                      <button
                        className="text-btn"
                        onClick={() => {
                          setPwdModal(u);
                          setPwdVal(createResetLink(u.id));
                          setPwdErr(null);
                          setLinkCopied(false);
                        }}
                      >
                        Lien de réinitialisation
                      </button>
                      <button className="text-btn" onClick={() => setUserDisabled(u.id, !u.disabled)}>
                        {u.disabled ? 'Réactiver' : 'Désactiver'}
                      </button>
                      <ConfirmButton label="Supprimer" danger onConfirm={() => deleteUser(u.id)} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && <p className="hint">Aucun membre ne correspond à la recherche.</p>}
        </>
      )}

      {/* ================= CANDIDATURES ================= */}
      {tab === 'applications' && (
        <>
          <h2 className="section-title" style={{ marginTop: 0 }}>En attente</h2>
          {pending.length === 0 && <p className="hint" style={{ marginTop: 0, marginBottom: 6 }}>Aucune candidature en attente.</p>}
          {pending.map(({ app, user: u }) => (
            <div className="list-card" key={app.id} style={{ marginBottom: 10 }}>
              <div className="list-row" style={{ alignItems: 'flex-start' }}>
                <span className="avatar" style={{ marginTop: 2 }}>{initials(u?.name ?? '?')}</span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row">
                    <b style={{ fontSize: 14.5 }}>{u?.name ?? 'Utilisateur supprimé'}</b>
                    {u?.pole && <span className="badge badge-type">{u.pole}</span>}
                  </div>
                  <div className="list-sub">Demande envoyée {timeAgo(app.createdAt)}</div>
                  {app.whatsapp && (
                    <div className="row-flags">
                      <span className="badge badge-type row" style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><IconChat size={12} /> {app.whatsapp}</span>
                      <a
                        className="text-btn primary"
                        href={`https://wa.me/${app.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Contacter sur WhatsApp
                      </a>
                    </div>
                  )}
                  {app.message && <p className="comment-body" style={{ marginTop: 8 }}>{app.message}</p>}
                </div>
                <div className="list-actions" style={{ marginTop: 2 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => decideApplication(app.id, false)}>Refuser</button>
                  <button className="btn btn-primary btn-sm" onClick={() => decideApplication(app.id, true)}>Valider</button>
                </div>
              </div>
            </div>
          ))}

          {decided.length > 0 && (
            <>
              <h2 className="section-title">Traitées récemment</h2>
              <div className="list-card">
                {decided.slice(0, 8).map(({ app, user: u }) => (
                  <div className="list-row" key={app.id} style={{ padding: '13px 18px' }}>
                    <div className="list-ico"><IconGauge size={18} /></div>
                    <div className="grow">
                      <div className="list-label" style={{ fontSize: 14 }}>{u?.name ?? '—'}</div>
                  <div className="list-sub row" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {app.status === 'APPROVED' ? <><IconCheckCircle size={14} /> Promu Relais</> : <><IconClose size={14} /> Refusé</>} · {formatDateTime(app.decidedAt ?? app.createdAt)}
                  </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ================= COMMENTAIRES ================= */}
      {tab === 'comments' && (
        <>
          {db.comments.length === 0 && <p className="hint">Aucun commentaire sur la plateforme.</p>}
          {db.comments
            .slice()
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
            .map(c => {
              const author = userById(db, c.authorId);
              const ann = db.announcements.find(a => a.id === c.announcementId);
              return (
                <div className="comment" key={c.id}>
                  <span className="avatar">{initials(author?.name ?? '?')}</span>
                  <div className="grow">
                    <div className="comment-head">
                      <span className="comment-author">{author?.name ?? 'Utilisateur supprimé'}</span>
                      {author && <RoleBadge role={author.role} />}
                      <span className="comment-time">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="comment-body">{c.body}</p>
                    <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                      {ann && <button className="text-btn primary" onClick={() => onOpen(ann.id)}>Sur : {ann.title}</button>}
                      <ConfirmButton label="Supprimer" danger onConfirm={() => deleteComment(c.id)} />
                    </div>
                  </div>
                </div>
              );
            })}
        </>
      )}

      {/* ================= SALONS ================= */}
      {tab === 'rooms' && (
        <>
          <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
            Accès par défaut : étudiants = leur pôle · relais = pôle + général · profs = pôles + général · administration = tout.
            Vous pouvez accorder ou révoquer l’accès individuellement à n’importe quel salon.
          </p>
          {CHAT_ROOMS.map(room => (
            <RoomAdminCard key={room.id} room={room} />
          ))}
        </>
      )}

      {/* ================= PALIERS ================= */}
      {tab === 'milestones' && <MilestonesAdmin />}

      {/* ================= MODAL PROF / ADMIN ================= */}
      {profModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setProfModal(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Créer un compte">
            <div className="modal-handle" />
            <div className="modal-title">
              Nouveau compte
              <button className="modal-close" onClick={() => setProfModal(false)} aria-label="Fermer"><IconClose size={16} /></button>
            </div>
            <form onSubmit={submitProf}>
              <div className="field">
                <label>Nom complet</label>
                <input className="input" value={pName} onChange={e => setPName(e.target.value)} placeholder="Ex. Pr. Anne Mba" />
              </div>
              <div className="field">
                <label>Adresse e-mail</label>
                <input className="input" type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} placeholder="professeur@univ.ga" />
              </div>
              <div className="field">
                <label>Mot de passe provisoire</label>
                <input className="input" value={pPwd} onChange={e => setPPwd(e.target.value)} placeholder="4 caractères minimum" />
              </div>
              <div className="field">
                <label>Rôle</label>
                <div className="priority-row">
                  <button type="button" className={cx('type-btn', pRole === 'PROF' && 'on')} onClick={() => setPRole('PROF')}>Prof / Informaticien</button>
                  <button type="button" className={cx('type-btn', pRole === 'ADMIN' && 'on')} onClick={() => setPRole('ADMIN')}>Administrateur</button>
                </div>
              </div>
              {pErr && <p className="error-text">{pErr}</p>}
              {pOk && <p className="hint" style={{ color: 'var(--green)' }}>{pOk}</p>}
              <div className="row mt12">
                <button type="button" className="btn btn-ghost grow" onClick={() => setProfModal(false)}>Fermer</button>
                <button type="submit" className="btn btn-primary grow">Créer le compte</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL LIEN DE RÉINITIALISATION ================= */}
      {pwdModal && pwdVal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPwdModal(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Lien de réinitialisation">
            <div className="modal-handle" />
            <div className="modal-title">
              Lien de réinitialisation
              <button className="modal-close" onClick={() => setPwdModal(null)} aria-label="Fermer"><IconClose size={16} /></button>
            </div>
            <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
              Pour <b style={{ color: 'var(--text)' }}>{pwdModal.name}</b> — {pwdModal.email}
            </p>
            <div className="link-box">
              <code>{pwdVal}</code>
            </div>
            <div className="row mt12">
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(pwdVal);
                    setLinkCopied(true);
                    window.setTimeout(() => setLinkCopied(false), 2200);
                  } catch {
                    setLinkCopied(false);
                  }
                }}
              >
                {linkCopied ? 'Copié' : 'Copier le lien'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPwdModal(null)}>Fermer</button>
            </div>
            <p className="hint" style={{ textAlign: 'center' }}>
              Lien à usage unique, valable 24 h. Transmettez-le à l’utilisateur (ex. par WhatsApp) : il choisira lui-même son nouveau mot de passe — vous n’y aurez pas accès.
            </p>
          </div>
        </div>
      )}

      {/* ================= MODAL FIABILITÉ ================= */}
      {relModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setRelModal(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Ajuster la fiabilité">
            <div className="modal-handle" />
            <div className="modal-title">
              Fiabilité de l’annonce
              <button className="modal-close" onClick={() => setRelModal(null)} aria-label="Fermer"><IconClose size={16} /></button>
            </div>
            <p className="hint" style={{ marginTop: -8, marginBottom: 14 }}>« {relModal.title} »</p>
            <div className="field">
              <label>Pourcentage affiché (0–100)</label>
              <input className="input" type="number" min={0} max={100} value={relVal} onChange={e => setRelVal(e.target.value)} />
              <p className="hint">
                Vous pouvez par exemple définir 99 % après vérification : la valeur remplace silencieusement le ratio communautaire.
              </p>
            </div>
            {relErr && <p className="error-text">{relErr}</p>}
            <div className="row mt12">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setReliability(relModal.id, null);
                  setRelModal(null);
                }}
              >
                Retirer la surcharge
              </button>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={() => {
                  const n = Number(relVal);
                  if (!Number.isInteger(n) || n < 0 || n > 100) {
                    setRelErr('Entrez un nombre entier entre 0 et 100.');
                    return;
                  }
                  setReliability(relModal.id, n);
                  setRelModal(null);
                }}
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
