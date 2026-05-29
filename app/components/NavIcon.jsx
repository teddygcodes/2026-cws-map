// Lightweight inline icons for the primary nav (stroke = currentColor).
export default function NavIcon({ name }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  switch (name) {
    case "map":
      return (
        <svg {...common}>
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
          <path d="M9 4v14M15 6v14" />
        </svg>
      );
    case "bracket":
      return (
        <svg {...common}>
          <path d="M4 5h5v5M4 19h5v-5M9 7.5h4v9h4M17 12h3" />
        </svg>
      );
    case "games":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M9 14h2M14 14h1" />
        </svg>
      );
    case "picks":
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "league":
      return (
        <svg {...common}>
          <path d="M6 9H4a2 2 0 0 1-2-2V5h4M18 9h2a2 2 0 0 0 2-2V5h-4" />
          <path d="M6 5h12v4a6 6 0 0 1-12 0V5ZM9 21h6M12 15v6" />
        </svg>
      );
    default:
      return null;
  }
}
