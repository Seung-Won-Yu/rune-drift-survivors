const ICON_PATHS = {
  heart: (
    <path d="M12 20.2 4.7 13A4.8 4.8 0 0 1 11.5 6l.5.6.5-.6a4.8 4.8 0 0 1 6.8 6.9L12 20.2Z" />
  ),
  spark: (
    <>
      <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" />
      <path d="M18.5 3.5v3M20 5h-3" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9h3.2L12 5v14l-4.8-4H4V9Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  muted: (
    <>
      <path d="M4 9h3.2L12 5v14l-4.8-4H4V9Z" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
      <path d="M5 3h6M13 21h6" opacity=".4" />
    </>
  ),
  play: <path d="m8 5 11 7L8 19V5Z" />,
  forward: (
    <>
      <path d="M4 12h15" />
      <path d="m14 7 5 5-5 5" />
    </>
  ),
  restart: (
    <>
      <path d="M19.2 8.2A8 8 0 1 0 20 15" />
      <path d="M19.2 3.8v4.4h-4.4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4v10" />
      <path d="M12 19h.01" />
    </>
  ),
  dash: (
    <>
      <path d="m5 7 5 5-5 5M12 7l5 5-5 5" />
      <path d="M19 7v10" opacity=".5" />
    </>
  ),
  objective: (
    <>
      <path d="m12 3 7 7-7 11-7-11 7-7Z" />
      <path d="m9 11 2 2 4-5" />
    </>
  ),
  circuit: (
    <>
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
      <path d="m12 8 4 4-4 4-4-4 4-4Z" />
      <path d="M12 3h.01M12 21h.01M3 12h.01M21 12h.01" />
    </>
  ),
  warden: (
    <>
      <path d="m5 8 3-4 4 3 4-3 3 4-2 11H7L5 8Z" />
      <path d="M8 13h8M10 16h4" />
    </>
  ),
  shockwave: (
    <>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
      <path d="M4 18h16M6 21h12" opacity=".45" />
    </>
  ),
  summon: (
    <>
      <path d="M12 3v5M5.6 6.2l3.5 3M18.4 6.2l-3.5 3" />
      <path d="M5 20a7 7 0 0 1 14 0H5Z" />
      <path d="M12 13v4M10 15h4" />
    </>
  ),
  ward: (
    <>
      <path d="M12 3 19 6v5c0 4.6-2.8 7.8-7 10-4.2-2.2-7-5.4-7-10V6l7-3Z" />
      <path d="M9 12h6M12 9v6" />
    </>
  ),
  orb: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.8 15 7l5.2 1.7-3.1 4.2.1 5.3-5.2-1.6-5.2 1.6.1-5.3-3.1-4.2L9 7l3-4.2Z" />
    </>
  ),
  storm: (
    <>
      <path d="M6 10.5A5 5 0 0 1 15.5 8 3.5 3.5 0 0 1 18 14H6a3 3 0 0 1 0-6" />
      <path d="m12.5 13-2 4h3l-2 4" />
    </>
  ),
  blade: (
    <>
      <path d="m5 19 4-1 9-11-1-2-2-1L6 15l-1 4Z" />
      <path d="m8 14 3 3M14 6l3 3" />
    </>
  ),
  chain: (
    <>
      <path d="M9.5 14.5 7 17a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0" />
      <path d="m14.5 9.5 2.5-2.5a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" />
      <path d="m8.5 15.5 7-7" />
    </>
  ),
  nova: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" />
    </>
  )
};

export function RuneIcon({ name, className = '' }) {
  return (
    <svg
      className={`runeUiIcon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name] ?? ICON_PATHS.spark}
    </svg>
  );
}
