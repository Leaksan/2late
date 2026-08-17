import { useEffect, useMemo, useRef, useState } from 'react';
import { canVoteOn, commentsOf, isExpired, isReadNow, myVoteOf, reliabilityOfAnn, userById } from '../data/db';
import { timeLeft } from '../components/AnnouncementCard';
import { TimeChip } from '../components/TimeChip';
import { useStore } from '../store';
import { cx, initials, timeAgo } from '../utils';
import { formatSize, getFile } from '../data/files';
import { COLLECT_ACCESS_LABELS, type CollectAccess, type Submission } from '../types';
import { IconChat, IconCheckCircle, IconChevronLeft, IconClock, IconDownload, IconFileText, IconLink, IconLock, IconSend, IconThumbDown, IconThumbUp, IconWhatsapp } from '../ui/Icons';
import { ReliabilityBadge, RoleBadge, TypeBadge, UrgentBadge, stripeColor } from '../components/Badges';

function AccessDots({ access, onChange }: { access: CollectAccess; onChange: (a: CollectAccess) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dots-wrap">
      <button
        className={cx('dots-btn', open && 'on')}
        onClick={() => setOpen(o => !o)}
        aria-label="Régler les droits de téléchargement"
        aria-expanded={open}
        title="Droit de télécharger les devoirs collectés"
      >
        ⋮
      </button>
      {open && (
        <>
          <div className="dots-backdrop" onClick={() => setOpen(false)} />
          <div className="dots-menu" role="menu">
            <div className="dots-menu-title">Droit de télécharger</div>
            {(['AUTHOR', 'PROF', 'RELAIS'] as CollectAccess[]).map(a => (
              <button
                key={a}
                role="menuitemradio"
                aria-checked={access === a}
                className={cx('dots-item', access === a && 'on')}
                onClick={() => { onChange(a); setOpen(false); }}
              >
                <span>{COLLECT_ACCESS_LABELS[a]}</span>
                {access === a && '✅'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

async function downloadSubmission(s: Submission, senderName?: string) {
  const blob = await getFile(s.id);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_');
  // Récolte : le fichier téléchargé porte le nom de l'étudiant émetteur.
  const ext = s.fileName.match(/\.[a-z0-9]+$/i)?.[0] ?? (s.fileType.split('/')[1] ? `.${s.fileType.split('/')[1]}` : '');
  a.download = senderName ? `${safe(senderName)}${ext}` : s.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return true;
}

function waLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

function ParticipativePanel({ annId }: { annId: string }) {
  const { db, user, submitToAnnouncement, deleteSubmission, setCollectAccess, setCollectEmail } = useStore();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missings, setMissings] = useState<string[]>([]);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [mailValue, setMailValue] = useState<string | null>(null);
  const [mailErr, setMailErr] = useState<string | null>(null);

  const ann = db.announcements.find(a => a.id === annId);
  const subs = useMemo(() => db.submissions.filter(s => s.announcementId === annId), [db.submissions, annId]);

  // Récolte : une ligne par document, intitulée du nom de l'étudiant émetteur.
  const ordered = useMemo(
    () =>
      [...subs]
        .map(s => ({ sub: s, student: userById(db, s.userId) }))
        .sort(
          (a, b) =>
            (a.student?.name ?? '').localeCompare(b.student?.name ?? '', 'fr') ||
            Date.parse(b.sub.createdAt) - Date.parse(a.sub.createdAt)
        ),
    [db, subs]
  );

  if (!ann || !user) return null;

  const expired = isExpired(ann);
  const mine = subs.filter(s => s.userId === user.id);
  const nbStudents = new Set(subs.map(s => s.userId)).size;
  const isStudentSide = user.role === 'ETUDIANT' || user.role === 'RELAIS';
  const canSubmit = !expired && isStudentSide && !!user.pole && ann.poles.includes(user.pole);
  const canCollect = user.role === 'PROF' || user.role === 'ADMIN' || user.role === 'RELAIS' || ann.authorId === user.id;
  const access: CollectAccess = ann.collectAccess ?? 'PROF';
  const canManageAccess = user.id === ann.authorId || user.role === 'ADMIN';
  const canDownload =
    user.role === 'ADMIN' ||
    user.id === ann.authorId ||
    (access === 'PROF' && user.role === 'PROF') ||
    (access === 'RELAIS' && (user.role === 'PROF' || user.role === 'RELAIS'));

  const waMessage = (studentName: string, iso: string) =>
    `Bonjour ${studentName.split(' ')[0]}, je te confirme la bonne réception de ton document envoyé le ${new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} via 2late (collecte « ${ann.title} »). — ${user.name}`;

  const send = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    const err = await submitToAnnouncement(annId, pending);
    setBusy(false);
    if (err) setError(err);
    else {
      setPending(null);
      setSentTo(ann.collectEmail ?? null);
    }
  };

  const mailtoLink = () => {
    const to = ann.collectEmail || user.email;
    const subject = encodeURIComponent(`[2late] Récolte « ${ann.title} » — ${subs.length} document(s)`);
    const lines = subs.map(s => {
      const name = userById(db, s.userId)?.name ?? 'Étudiant';
      return `- ${name} : envoyé le ${new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} (${formatSize(s.fileSize)})`;
    });
    const body = encodeURIComponent(`Bonjour,\n\nVoici le récapitulatif de la collecte « ${ann.title} » (${subs.length} document(s), ${nbStudents} étudiant(s)) :\n\n${lines.join('\n')}\n\nLes fichiers (nommés au nom des étudiants) sont téléchargeables depuis 2late.\n\n— ${user.name}, via 2late`);
    return `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const downloadAll = async (list: Submission[]) => {
    const missing: string[] = [];
    const totals = new Map<string, number>();
    for (const s of list) totals.set(s.userId, (totals.get(s.userId) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const s of list) {
      const name = userById(db, s.userId)?.name ?? 'Étudiant';
      const n = (seen.get(s.userId) ?? 0) + 1;
      seen.set(s.userId, n);
      const total = totals.get(s.userId) ?? 1;
      const ok = await downloadSubmission(s, total > 1 ? `${name} (${n})` : name);
      if (!ok) missing.push(s.fileName);
      await new Promise(r => window.setTimeout(r, 500));
    }
    setMissings(missing);
  };

  return (
    <div className="part-panel">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <b style={{ fontSize: 15 }}>📄 Collecte de documents</b>
        {subs.length > 0 && (
          <span className="badge badge-type">{nbStudents} étudiant{nbStudents > 1 ? 's' : ''} · {subs.length} document{subs.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {canSubmit && (
        <div className="sub-dropzone">
          <div className="sub-dropzone-title">📄 Déposer mon document</div>
          <p className="sub-dropzone-hint">
            Sélectionnez votre fichier (PDF, image, document — 20 Mo max) : il est transmis directement, classé à votre nom avec l’heure d’envoi. Plus besoin de WhatsApp.
          </p>
          {!pending ? (
            <label className="btn btn-primary sub-pick">
              <input
                type="file"
                accept="application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                onChange={e => { setPending(e.target.files?.[0] ?? null); e.currentTarget.value = ''; }}
              />
              Choisir mon fichier…
            </label>
          ) : (
            <div className="sub-send">
              <div className="sub-send-file">
                📄 {pending.name}
                <span className="sub-time"> · {formatSize(pending.size)}</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn-ghost grow" onClick={() => setPending(null)} disabled={busy}>Annuler</button>
                <button className="btn btn-primary grow" onClick={() => void send()} disabled={busy}>
                  📤 {busy ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </div>
          )}
          {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
          {sentTo && (
            <div className="sub-sent-ok">
              ✅
              <span>Document envoyé ✓ — une copie est transmise automatiquement à <b>{sentTo}</b>.</span>
            </div>
          )}

          {mine.length > 0 && (
            <div className="sub-mine">
              <div className="sub-mine-title">Mes dépôts ({mine.length})</div>
              {mine.map(s => (
                <div className="sub-row own" key={s.id}>
                  <span className="sub-file">📄 {s.fileName}</span>
                  <span className="sub-time">envoyé <TimeChip iso={s.createdAt} seconds /> · {formatSize(s.fileSize)}</span>
                  <div className="list-actions">
                    <button className="text-btn primary" onClick={() => void downloadSubmission(s)}>Télécharger</button>
                    <button className="text-btn danger" onClick={() => deleteSubmission(s.id)}>Retirer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!canSubmit && !canCollect && isStudentSide && (
        <p className="hint">
          {expired
            ? 'Cette collecte est terminée : les dépôts ne sont plus acceptés.'
            : 'Votre pôle n’est pas concerné par cette collecte.'}
        </p>
      )}

      {canCollect && (
        <div className="sub-collect">
          <div className="sub-collect-head">
            <span className="sub-collect-title">⬇️ Récupérer les devoirs</span>
            <span className="row" style={{ gap: 8 }}>
              {canManageAccess && <AccessDots access={access} onChange={a => setCollectAccess(annId, a)} />}
              {canDownload && subs.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => void downloadAll(subs)}>
                  ⬇️ Tout télécharger
                </button>
              )}
            </span>
          </div>
          <p className="hint">
            Une ligne par document, intitulée du <b>nom de l’étudiant</b> qui l’a envoyé, avec l’heure exacte. Le fichier téléchargé porte aussi son nom. Téléchargement autorisé : <b>{COLLECT_ACCESS_LABELS[access]}</b>
            {canManageAccess && ' — réglez ce droit via le menu ⋮'}.
          </p>
          {!canDownload && (
            <div className="sub-locked">
              🔒
              <span>Consultation seule : le téléchargement est réservé à « {COLLECT_ACCESS_LABELS[access]} ».</span>
            </div>
          )}

          <div className="collect-mail">
            <span className="collect-mail-state">
              📤
              {ann.collectEmail
                ? <>Réception automatique : <b>{ann.collectEmail}</b></>
                : 'Réception automatique : désactivée'}
            </span>
            {canManageAccess && (
              mailValue === null ? (
                <button className="text-btn primary" onClick={() => { setMailValue(ann.collectEmail ?? user.email); setMailErr(null); }}>
                  {ann.collectEmail ? 'Modifier' : 'Activer'}
                </button>
              ) : (
                <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <input
                    className="input"
                    style={{ maxWidth: 210 }}
                    type="email"
                    value={mailValue}
                    onChange={e => { setMailValue(e.target.value); setMailErr(null); }}
                    placeholder="adresse@univ.ga"
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const err = setCollectEmail(annId, mailValue);
                      setMailErr(err);
                      if (!err) setMailValue(null);
                    }}
                  >
                    OK
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setMailValue(null)}>Annuler</button>
                </span>
              )
            )}
            {mailErr && <p className="error-text">{mailErr}</p>}
            {ann.collectEmail && subs.length > 0 && (
              <button className="btn btn-ghost btn-sm collect-mail-btn" onClick={() => window.open(mailtoLink(), '_self')}>
                ✉️ Recevoir le récapitulatif par e-mail
              </button>
            )}
          </div>

          {subs.length === 0 && <p className="hint" style={{ marginTop: 10 }}>Aucun dépôt pour l’instant. Les documents envoyés par les étudiants apparaîtront ici.</p>}

          {ordered.map(({ sub: s, student }) => (
            <div className="sub-row" key={s.id} style={{ alignItems: 'center' }}>
              <span className="avatar" style={{ width: 30, height: 30, fontSize: 11, flex: 'none' }}>{initials(student?.name ?? '?')}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <b className="sub-file">{student?.name ?? 'Compte supprimé'}</b>
                  {student && <RoleBadge role={student.role} />}
                </div>
                <span className="sub-time">envoyé <TimeChip iso={s.createdAt} seconds /> · {formatSize(s.fileSize)}</span>
              </div>
              {student?.whatsapp ? (
                <button
                  className="wa-btn"
                  title={`Contacter ${student.name} sur WhatsApp`}
                  aria-label={`Contacter ${student.name} sur WhatsApp`}
                  onClick={() => window.open(waLink(student.whatsapp!, waMessage(student.name, s.createdAt)), '_blank', 'noopener')}
                >
                  💬
                </button>
              ) : (
                <span className="wa-btn off" title="Numéro WhatsApp non renseigné par l’étudiant">
                  💬
                </span>
              )}
              {canDownload && (
                <button className="text-btn primary" onClick={() => void downloadSubmission(s, student?.name)}>Télécharger</button>
              )}
            </div>
          ))}

          {missings.length > 0 && (
            <p className="error-text">Fichiers introuvables sur cet appareil : {missings.join(', ')} (les dépôts ne sont pas partagés entre appareils en mode démo).</p>
          )}
        </div>
      )}
    </div>
  );
}

export function DetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { db, user, markRead, vote, addComment } = useStore();
  const [body, setBody] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);

  const ann = db.announcements.find(a => a.id === id);
  const author = ann ? userById(db, ann.authorId) : undefined;

  useEffect(() => {
    if (ann && user && !isReadNow(db, ann, user.id)) markRead(ann.id);
  }, [id]);

  const rel = ann ? reliabilityOfAnn(db, ann) : { up: 0, down: 0, total: 0, pct: null, overridden: false };
  const myVote = user && ann ? myVoteOf(db, ann.id, user.id) : undefined;
  const canVote = user && ann ? canVoteOn(db, user, ann) : false;
  const comments = useMemo(() => (ann ? commentsOf(db, ann.id) : []), [db, ann]);

  if (!ann || !user) return null;

  const send = () => {
    if (!body.trim()) return;
    addComment(ann.id, body);
    setBody('');
    commentInputRef.current?.focus();
  };

  return (
    <div className="screen" style={{ paddingTop: 12 }}>
      <button className="topbar-back" onClick={onBack} style={{ marginBottom: 14 }} aria-label="Retour">
        ←
      </button>

      <div className="detail-card">
        <div className="detail-stripe" style={{ background: stripeColor(author?.role ?? 'ETUDIANT') }} />
        <div className="ann-badges">
          {author && <RoleBadge role={author.role} />}
          {ann.priority === 'URGENTE' && <UrgentBadge />}
          <TypeBadge ann={ann} />
          {author?.role === 'RELAIS' && <ReliabilityBadge pct={rel.pct} total={rel.total} />}
        </div>

        <h1 className="detail-title">{ann.title}</h1>
        <p className="detail-desc">{ann.description || 'Pas d’information complémentaire pour cette annonce.'}</p>

        {ann.expiresAt && (
          <p className="hint row" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12 }}>
            🕒
            {isExpired(ann) ? 'Cette annonce temporaire a expiré.' : `Annonce temporaire — ${timeLeft(ann.expiresAt)}.`}
          </p>
        )}

        {ann.links && ann.links.length > 0 && (
          <div className="row" style={{ flexWrap: 'wrap', marginTop: 14 }}>
            {ann.links.map(l => (
              <button key={l.id} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', gap: 6 }} onClick={() => window.open(l.url, '_blank', 'noopener')}>
                🔗 {l.label}
              </button>
            ))}
          </div>
        )}

        <div className="detail-meta">
          <span className="avatar">{initials(author?.name ?? '?')}</span>
          <span>
            <b style={{ color: 'var(--muted)' }}>{author?.name ?? 'Auteur inconnu'}</b>
            <br />
            Publié <TimeChip iso={ann.createdAt} />
          </span>
        </div>
      </div>

      {ann.type === 'PARTICIPATIVE' && <ParticipativePanel annId={ann.id} />}

      {author?.role === 'RELAIS' && (
        <div className="vote-panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b style={{ fontSize: 14.5 }}>Fiabilité communautaire</b>
            <ReliabilityBadge pct={rel.pct} total={rel.total} />
          </div>


          {rel.total > 0 ? (
            <>
              <div className="vote-bar" role="progressbar" aria-valuenow={rel.pct ?? 0} aria-valuemin={0} aria-valuemax={100}>
                <div className="vote-bar-fill" style={{ width: `${rel.pct ?? 0}%` }} />
              </div>
              <div className="vote-stats">
                <span style={{ color: 'var(--green)' }}>{rel.up} fiable{rel.up > 1 ? 's' : ''}</span>
                <span style={{ color: 'var(--red)' }}>{rel.down} contestation{rel.down > 1 ? 's' : ''}</span>
              </div>
            </>
          ) : (
            <p className="hint">Aucun vote pour le moment. Cette annonce vous semble-t-elle fiable ?</p>
          )}

          {canVote ? (
            <div className="vote-actions mt12">
              <button className={cx('vote-btn', myVote?.value === 1 && 'on-up')} onClick={() => vote(ann.id, 1)}>
                👍 Fiable
              </button>
              <button className={cx('vote-btn', myVote?.value === -1 && 'on-down')} onClick={() => vote(ann.id, -1)}>
                👎 Contester
              </button>
            </div>
          ) : (
            <p className="hint">Le vote est réservé aux étudiants du pôle concerné (hors auteur de l’annonce).</p>
          )}
        </div>
      )}

      <div className="comments-section">
        <h2 className="comments-title">
          💬 Discussion {comments.length > 0 && <span className="tab-count">{comments.length}</span>}
        </h2>

        {comments.map(c => {
          const ca = userById(db, c.authorId);
          return (
            <div className="comment" key={c.id}>
              <span className="avatar">{initials(ca?.name ?? '?')}</span>
              <div className="grow">
                <div className="comment-head">
                  <span className="comment-author">{ca?.name ?? 'Utilisateur supprimé'}</span>
                  {ca && <RoleBadge role={ca.role} />}
                  <span className="comment-time">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="comment-body">{c.body}</p>
              </div>
            </div>
          );
        })}

        {comments.length === 0 && (
          <p className="hint" style={{ padding: '4px 2px 10px' }}>Aucun commentaire. Lancez la discussion !</p>
        )}

        <div className="comment-form">
          <input
            ref={commentInputRef}
            className="input"
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            placeholder="Écrire un commentaire…"
            aria-label="Nouveau commentaire"
          />
          <button className="send-btn" onClick={send} disabled={!body.trim()} aria-label="Envoyer">
            📤
          </button>
        </div>
      </div>
    </div>
  );
}
