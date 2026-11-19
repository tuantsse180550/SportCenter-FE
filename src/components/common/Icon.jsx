// SVG icon set from the ActiveHub design (Figma Make export).

const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
  user: "M20 21v-2a7 7 0 0 0-14 0v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  calendar:
    "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 M7 14h2 M12 14h2 M7 18h2",
  layers: "m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  sport:
    "M14 3a7 7 0 0 1 7 7c0 4-5 8-8 8a7 7 0 0 1-7-7c0-3 4-8 8-8Z M7 16l-5 5 M4 17l3 3 M11 5l8 8",
  room: "M3 21h18 M5 21V3h14v18 M9 7h6 M9 11h6 M10 21v-6h4v6",
  wallet: "M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6 M16 13h6v4h-6z",
  chart: "M3 3v18h18 M7 16v-5 M12 16V7 M17 16v-9",
  shield: "m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7z M8 12l3 3 5-6",
  history: "M3 10a9 9 0 1 1 2 8 M3 4v6h6 M12 7v5l3 2",
  search: "M21 21l-5-5 M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  down: "m6 9 6 6 6-6",
  right: "m9 5 7 7-7 7",
  left: "m15 5-7 7 7 7",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  close: "m6 6 12 12 M6 18 18 6",
  clock: "M12 8v5l3 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
  check: "m5 12 4 4L19 6",
  checkCircle: "m8 12 3 3 5-6 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
  alert: "m12 3 10 18H2z M12 9v5 M12 17h.01",
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
  download: "M12 3v12 M7 10l5 5 5-5 M3 16v5h18v-5",
  upload: "M12 16V4 M7 9l5-5 5 5 M3 16v5h18v-5",
  file: "M14 2H4v20h16V8z M14 2v6h6 M8 13h8 M8 17h5",
  repeat: "M3 7h16l-4-4 M21 17H5l4 4 M21 7v4 M3 17v-4",
  logout: "M9 21H3V3h6 M8 12h14 M17 7l5 5-5 5",
  help: "M9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3 M12 17h.01 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
  sparkle: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z M20 2v4 M18 4h4",
  filter: "M4 7h16 M7 12h10 M10 17h4",
  edit: "m16 3 5 5-12 12-6 1 1-6z M13 6l5 5",
  mail: "M3 5h18v14H3z m0 0 9 8 9-8",
  send: "m22 2-7 20-4-9L2 9z M11 13 22 2",
  target:
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10 M12 12h.01",
  trend: "m3 17 6-6 4 4 8-10 M15 5h6v6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  book: "M12 5C8 2 3 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-3-2-7-2-10 1Z M12 5v15",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
  lock: "M5 10h14v12H5z M8 10V6a4 4 0 0 1 8 0v4 M12 15v3",
  qr: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h3v3h-3z M20 14v6h-3 M17 20h-3",
  scan: "M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M4 12h16",
};

export function Icon({
  name,
  size = 20,
  style,
  className = "",
}) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
