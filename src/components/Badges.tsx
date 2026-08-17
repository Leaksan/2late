import type { Announcement, Role } from '../types';
import { ROLE_SHORT } from '../types';
import { cx } from '../utils';
import { IconAlertCircle, IconCheckCircle } from '../ui/Icons';

const ROLE_STRIPE: Record<Role, string> = {
  PROF: 'var(--primary)',
  RELAIS: 'var(--yellow)',
  ADMIN: '#B9A4FF',
  ETUDIANT: 'var(--stroke)'
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={cx('badge', `badge-role-${role.toLowerCase()}`)}>{ROLE_SHORT[role]}</span>;
}

export function UrgentBadge() {
  return <span className="badge badge-urgent">URGENT</span>;
}

export function TypeBadge({ ann }: { ann: Announcement }) {
  const labels: Record<Announcement['type'], string> = {
    EVALUATION: 'Évaluation',
    DEVOIR: 'Devoir à rendre',
    VISIO: 'Session visio',
    GENERALE: 'Annonce générale',
    EMPLOI_DU_TEMPS: 'Emploi du temps',
    PARTICIPATIVE: 'Collecte participative'
  };
  return <span className={cx('badge badge-type', ann.type === 'PARTICIPATIVE' && 'badge-participative')}>{labels[ann.type]}</span>;
}

export function ReliabilityBadge({ pct, total }: { pct: number | null; total: number }) {
  if (pct !== null && pct >= 70) return <span className="badge badge-reliable">✅ Fiable · {pct}%</span>;
  if (total === 0) return <span className="badge badge-novote">Non notée</span>;
  return <span className="badge badge-contested">⚠️ Contestée · {pct ?? 0}%</span>;
}

export function stripeColor(role: Role): string {
  return ROLE_STRIPE[role];
}
