// Shared primary-nav config. Every core contest is one tap from anywhere — no
// hamburger hiding the brackets/pick'em (per the brief).
export const NAV_ITEMS = [
  { key: "map", label: "Map", href: "#/", icon: "map" },
  { key: "bracket", label: "Bracket", href: "#/bracket", icon: "bracket" },
  { key: "games", label: "Pick'em", href: "#/games", icon: "games" },
  { key: "picks", label: "Picks", href: "#/picks", icon: "picks" },
  { key: "league", label: "Leagues", href: "#/league", icon: "league" },
];

export function activeNavKey(hash) {
  const h = hash || "#/";
  if (h.indexOf("#/bracket") === 0) return "bracket";
  if (h.indexOf("#/games") === 0) return "games";
  if (h.indexOf("#/picks") === 0 || h.indexOf("#/h2h") === 0) return "picks";
  if (h.indexOf("#/league") === 0) return "league";
  // map is the home/default; regional/team/etc. drill-downs keep Map lit.
  return "map";
}
