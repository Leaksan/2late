export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4.2" y="5.2" width="2.4" height="13.6" rx="1.2" fill="#E5C100" />
      <rect x="7.8" y="5.2" width="12" height="13.6" rx="3.4" fill="#7CB9FF" />
      <rect x="10.2" y="8.6" width="7" height="2" rx="1" fill="#4B6D96" />
      <rect x="10.2" y="12.2" width="4.6" height="2" rx="1" fill="#4B6D96" />
    </svg>
  );
}
