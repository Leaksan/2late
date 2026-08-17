import type { Announcement } from '../types';
import { REPEAT_LABELS } from '../types';
import { commentsOf, isExpired, isReadNow, reliabilityOfAnn, userById } from '../data/db';
import { useStore } from '../store';
import { cx, timeAgo } from '../utils';
import { IconChat, IconClock, IconLink, IconRotate } from '../ui/Icons';
import { ReliabilityBadge, RoleBadge, TypeBadge, UrgentBadge, stripeColor } from './Badges';

interface Props {
  ann: Announcement;
  onOpen: (id: string) => void;
}

export function timeLeft(expiresAt: string): string {
  const ms = Date.parse(expiresAt) - Date.now();
  if (ms <= 0) return 'expirée';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min restantes`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h restantes`;
  return `${Math.floor(h / 24)} j restants`;
}

export function AnnouncementCard({ ann, onOpen }: Props) {
  const { db, user } = useStore();
  const author = userById(db, ann.authorId);
  const read = user ? isReadNow(db, ann, user.id) : false;
  const isRelais = author?.role === 'RELAIS';
  const rel = reliabilityOfAnn(db, ann);
  const nbComments = commentsOf(db, ann.id).length;
  const expired = isExpired(ann);
  const isParticipative = ann.type === 'PARTICIPATIVE';
  const isCollector = !!user && (user.role === 'PROF' || user.role === 'ADMIN' || user.role === 'RELAIS' || ann.authorId === user.id);
  const nbSubs = isParticipative ? db.submissions.filter(s => s.announcementId === ann.id).length : 0;

  return (
    <div
      className={cx('ann-card', !read && !expired && 'unread', expired && 'expired-card')}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(ann.id)}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(ann.id); }}
    >
      <div className="ann-stripe" style={{ background: expired ? 'var(--stroke)' : stripeColor(author?.role ?? 'ETUDIANT') }} />
      <div className="ann-body">
        <div className="ann-badges">
          {author && <RoleBadge role={author.role} />}
          {ann.priority === 'URGENTE' && !expired && <UrgentBadge />}
          <TypeBadge ann={ann} />
          {isParticipative && (
            isCollector ? (
              nbSubs > 0 && <span className="badge badge-reliable">{nbSubs} dépôt{nbSubs > 1 ? 's' : ''} à récupérer</span>
            ) : (
              <span className="badge badge-participative">Je dépose mes documents</span>
            )
          )}
          {ann.repeat && !expired && <span className="badge badge-repeat"><IconRotate size={11} /> {REPEAT_LABELS[ann.repeat]}</span>}
          {isRelais && <ReliabilityBadge pct={rel.pct} total={rel.total} />}
          {expired ? (
            <span className="badge badge-off">Expirée</span>
          ) : (
            ann.expiresAt ? (
              <span className="badge badge-temp" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <IconClock size={11} /> {timeLeft(ann.expiresAt)}
              </span>
            ) : null
          )}
        </div>
        <div className="row">
          {!read && !expired && <span className="ann-unread-dot" aria-label="Non lue" />}
          <span className="ann-title">{ann.title}</span>
        </div>
        {ann.description && <p className="ann-desc">{ann.description}</p>}
        {ann.links && ann.links.length > 0 && (
          <div className="slot-actions" onClick={e => e.stopPropagation()}>
            {ann.links.slice(0, 2).map(l => (
              <button
                key={l.id}
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', gap: 6 }}
                onClick={e => { e.stopPropagation(); window.open(l.url, '_blank', 'noopener'); }}
              >
                <IconLink size={13} /> {l.label}
              </button>
            ))}
            {ann.links.length > 2 && <span className="badge badge-type">+{ann.links.length - 2}</span>}
          </div>
        )}
        <div className="ann-meta">
          <span>{author?.name ?? 'Auteur inconnu'}</span>
          <span className="sep">·</span>
          <span>{timeAgo(ann.createdAt)}</span>
          {nbComments > 0 && (
            <>
              <span className="sep">·</span>
              <span className="ann-threads">
                <IconChat size={13} /> {nbComments}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
