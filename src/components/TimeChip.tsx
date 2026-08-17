import { IconClock } from '../ui/Icons';
import { cx } from '../utils';

// Pastille de date/heure d'envoi : heure précise en gras + jour discret.
export function TimeChip({ iso, seconds = false, className }: { iso: string; seconds?: boolean; className?: string }) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - 24 * 3600_000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}) });
  const day = sameDay ? "auj." : yesterday ? 'hier' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <span className={cx('time-chip', className)} title={d.toLocaleString('fr-FR')}>
      <IconClock size={12} />
      <b>{time}</b>
      <span className="time-chip-day">{day}</span>
    </span>
  );
}
