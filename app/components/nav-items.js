// Shared primary-nav config. Every core contest is one tap from anywhere — no
// hamburger hiding the brackets/pick'em (per the brief).
export const NAV_ITEMS = [
  { key: "map", label: "Map", href: "#/", icon: "map" },
  { key: "bracket", label: "Bracket", href: "#/bracket", icon: "bracket" },
  { key: "games", label: "Pick'em", href: "#/games", icon: "games" },
  { key: "picks", label: "Picks", href: "#/picks", icon: "picks" },
  { key: "league", label: "Leagues", href: "#/league", icon: "league" },
];

// The primary section a hash belongs to, or null for "detail" routes
// (regional/team/stadium/compare/game) that have no single home tab.
function sectionOf(hash) {
  const h = hash || "#/";
  if (h.indexOf("#/bracket") === 0) return "bracket";
  if (h.indexOf("#/games") === 0) return "games";
  if (h.indexOf("#/picks") === 0 || h.indexOf("#/h2h") === 0) return "picks";
  if (h.indexOf("#/league") === 0) return "league";
  if (h === "#/" || h === "") return "map";
  return null; // detail route
}

/**
 * Which primary tab to light. Section routes resolve directly; detail routes
 * (compare/game/team/stadium/regional) inherit the section the user came from
 * (prevHash) so e.g. a Compare opened from Pick'em keeps Pick'em lit instead of
 * jumping to Map. Falls back to Map.
 */
export function activeNavKey(hash, prevHash) {
  return sectionOf(hash) || sectionOf(prevHash) || "map";
}
