export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function countdown(iso: string): { text: string; late: boolean; ms: number } {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return { text: 'échéance dépassée', late: true, ms };
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 1) return { text: `${sec} s`, late: false, ms };
  if (min < 60) return { text: `${min} min ${String(sec).padStart(2, '0')} s`, late: false, ms };
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 48) return { text: `${h} h ${String(m).padStart(2, '0')} min ${String(sec).padStart(2, '0')} s`, late: false, ms };
  return { text: `${Math.floor(h / 24)} j`, late: false, ms };
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Moyenne pondérée par coefficient ; null si aucune note.
export function weightedAverage(grades: Array<{ value: number; coef: number }>): number | null {
  if (grades.length === 0) return null;
  const coefs = grades.reduce((s, g) => s + g.coef, 0);
  if (coefs <= 0) return null;
  return grades.reduce((s, g) => s + g.value * g.coef, 0) / coefs;
}

// 14 → « 14 », 13.5 → « 13,5 »
export function frNum(n: number, maxDecimals = 2): string {
  const fixed = n.toFixed(maxDecimals).replace('.', ',');
  return fixed.replace(/(,\d*?)0+$/, '$1').replace(/,$/, '');
}