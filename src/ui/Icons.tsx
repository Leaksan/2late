interface P {
  size?: number;
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  };
}

export function IconBell(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function IconEye(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconCheck(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconAlert(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconPlus(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function IconUser(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconGauge(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="m12 14 4-4" />
      <path d="M3.3 17a9 9 0 1 1 17.4 0" />
    </svg>
  );
}

export function IconChat(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}

export function IconThumbUp(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}

export function IconThumbDown(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}

export function IconLogout(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconClose(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconChevronLeft(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconChevronRight(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function IconUsers(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconMegaphone(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="m3 11 18-5v12L3 14v-3Z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

export function IconSend(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export function IconDownload(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export function IconCalendar(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function IconVideo(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="m22 8-6 4 6 4V8Z" />
      <rect x="2" y="6" width="14" height="12" rx="3" />
    </svg>
  );
}

export function IconLink(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </svg>
  );
}

export function IconClock(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconNote(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconPause(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9v6M14 9v6" />
    </svg>
  );
}

export function IconCheckCircle(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  );
}

export function IconAlertCircle(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function IconReply(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M9 17 4 12l5-5" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

export function IconGlobe(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
    </svg>
  );
}

export function IconGraduation(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
      <path d="M22 9v6" />
    </svg>
  );
}

export function IconBank(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="m3 9 9-6 9 6" />
      <path d="M4 9v10M8 9v10M12 9v10M16 9v10M20 9v10" />
      <path d="M2 21h20" />
    </svg>
  );
}

export function IconChevronDown(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconPin(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M12 17v5" />
      <path d="M9 10.8V4h6v6.8l2.7 3.2a.6.6 0 0 1-.5 1H6.8a.6.6 0 0 1-.5-1Z" />
    </svg>
  );
}

export function IconInfinity(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M6 16c-2.2 0-4-1.8-4-4s1.8-4 4-4c3.5 0 4.5 8 8 8 2.2 0 4-1.8 4-4s-1.8-4-4-4c-3.5 0-4.5 8-8 8Z" />
    </svg>
  );
}

export function IconLock(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function IconBook(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

export function IconFileText(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5M9 13h6M9 17h6" />
    </svg>
  );
}

export function IconLogo(p: P) {
  const { size = 20 } = p;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4.2" y="5.2" width="2.4" height="13.6" rx="1.2" fill="#E5C100" />
      <rect x="7.8" y="5.2" width="12" height="13.6" rx="3.4" fill="#7CB9FF" />
      <rect x="10.2" y="8.6" width="7" height="2" rx="1" fill="#4B6D96" />
      <rect x="10.2" y="12.2" width="4.6" height="2" rx="1" fill="#4B6D96" />
    </svg>
  );
}

export function IconRotate(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function IconMail(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

export function IconTrophy(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 1.5 4 4 4" />
      <path d="M17 6h3a1 1 0 0 1 1 1c0 2.5-1.5 4-4 4" />
    </svg>
  );
}

export function IconWhatsapp(p: P) {
  const { size = 20 } = p;
  return (
    <svg {...base(size)}>
      <path d="M12 3a9 9 0 0 0-7.8 13.4L3 21l4.7-1.2A9 9 0 1 0 12 3Z" />
      <path d="M9.2 8.6c-.4.1-.9.6-.9 1.4 0 2.4 2.9 5.2 5.3 5.3.8 0 1.4-.6 1.5-1l-1.5-.9-.9.9c-1-.4-2.1-1.4-2.5-2.4l.9-.9-.9-1.5c-.3 0-.7.1-1 .1Z" />
    </svg>
  );
}
