import { useEffect, useMemo, useRef, useState } from 'react';
import { canVoteOn, commentsOf, hasRead, isExpired, myVoteOf, reliabilityOfAnn, userById } from '../data/db';
import { timeLeft } from '../components/AnnouncementCard';
import { useStore } from '../store';
import { cx, formatDateTime, initials, timeAgo } from '../utils';
import { IconChat, IconChevronLeft, IconClock, IconLink, IconSend, IconThumbDown, IconThumbUp } from '../ui/Icons';
import { ReliabilityBadge, RoleBadge, TypeBadge, UrgentBadge, stripeColor } from '../components/Badges';

export function DetailScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const { db, user, markRead, vote, addComment } = useStore();
  const [body, setBody] = useState('');
  const commentInputRef = useRef<HTMLInputElement>(null);

  const ann = db.announcements.find(a => a.id === id);
  const author = ann ? userById(db, ann.authorId) : undefined;

  useEffect(() => {
    if (ann && user && !hasRead(db, ann.id, user.id)) markRead(ann.id);
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
        <IconChevronLeft size={20} />
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
            <IconClock size={14} />
            {isExpired(ann) ? 'Cette annonce temporaire a expiré.' : `Annonce temporaire — ${timeLeft(ann.expiresAt)}.`}
          </p>
        )}

        {ann.links && ann.links.length > 0 && (
          <div className="row" style={{ flexWrap: 'wrap', marginTop: 14 }}>
            {ann.links.map(l => (
              <button key={l.id} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', gap: 6 }} onClick={() => window.open(l.url, '_blank', 'noopener')}>
                <IconLink size={13} /> {l.label}
              </button>
            ))}
          </div>
        )}

        <div className="detail-meta">
          <span className="avatar">{initials(author?.name ?? '?')}</span>
          <span>
            <b style={{ color: 'var(--muted)' }}>{author?.name ?? 'Auteur inconnu'}</b>
            <br />
            Publié le {formatDateTime(ann.createdAt)}
          </span>
        </div>
      </div>

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
                <IconThumbUp size={16} /> Fiable
              </button>
              <button className={cx('vote-btn', myVote?.value === -1 && 'on-down')} onClick={() => vote(ann.id, -1)}>
                <IconThumbDown size={16} /> Contester
              </button>
            </div>
          ) : (
            <p className="hint">Le vote est réservé aux étudiants du pôle concerné (hors auteur de l’annonce).</p>
          )}
        </div>
      )}

      <div className="comments-section">
        <h2 className="comments-title">
          <IconChat size={17} /> Discussion {comments.length > 0 && <span className="tab-count">{comments.length}</span>}
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
            <IconSend size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
