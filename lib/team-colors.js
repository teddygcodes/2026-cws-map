/* =============================================================================
   Publicly-known school athletic brand colors — public facts (not stats), used
   purely for visual identity (left-borders, glows, chip tints) alongside a
   monogram/wordmark. No copyrighted logos. A team without an entry falls back to
   a neutral accent — we never invent a color and present it as official.

   { primary, ink } — `ink` is the readable text color on `primary`.
   ============================================================================= */

export const TEAM_COLORS = {
  ucla: { primary: "#2774AE", ink: "#fff" },
  "virginia-tech": { primary: "#861F41", ink: "#fff" },
  "cal-poly": { primary: "#154734", ink: "#fff" },
  "saint-marys": { primary: "#C8102E", ink: "#fff" },
  "georgia-tech": { primary: "#003057", ink: "#fff" },
  oklahoma: { primary: "#841617", ink: "#fff" },
  "the-citadel": { primary: "#003865", ink: "#fff" },
  uic: { primary: "#001E62", ink: "#fff" },
  georgia: { primary: "#BA0C2F", ink: "#fff" },
  "boston-college": { primary: "#98002E", ink: "#fff" },
  liberty: { primary: "#002D62", ink: "#fff" },
  "long-island": { primary: "#00558C", ink: "#fff" },
  auburn: { primary: "#03244D", ink: "#fff" },
  ucf: { primary: "#000000", ink: "#fff" },
  "nc-state": { primary: "#CC0000", ink: "#fff" },
  milwaukee: { primary: "#000000", ink: "#fff" },
  "north-carolina": { primary: "#4B9CD3", ink: "#08263e" },
  tennessee: { primary: "#FF8200", ink: "#1c1c1c" },
  "east-carolina": { primary: "#592A8A", ink: "#fff" },
  vcu: { primary: "#000000", ink: "#fff" },
  texas: { primary: "#BF5700", ink: "#fff" },
  "uc-santa-barbara": { primary: "#003660", ink: "#fff" },
  "tarleton-state": { primary: "#4F2D7F", ink: "#fff" },
  "holy-cross": { primary: "#602D89", ink: "#fff" },
  alabama: { primary: "#9E1B32", ink: "#fff" },
  "oklahoma-state": { primary: "#FF7300", ink: "#1c1c1c" },
  "sc-upstate": { primary: "#00563F", ink: "#fff" },
  "alabama-state": { primary: "#000000", ink: "#fff" },
  florida: { primary: "#0021A5", ink: "#fff" },
  miami: { primary: "#F47321", ink: "#1c1c1c" },
  troy: { primary: "#8A2432", ink: "#fff" },
  rider: { primary: "#6C1D45", ink: "#fff" },
  "southern-miss": { primary: "#000000", ink: "#fff" },
  virginia: { primary: "#232D4B", ink: "#fff" },
  "jacksonville-state": { primary: "#CC0000", ink: "#fff" },
  "little-rock": { primary: "#862633", ink: "#fff" },
  "florida-state": { primary: "#782F40", ink: "#fff" },
  "coastal-carolina": { primary: "#006F71", ink: "#fff" },
  "northern-illinois": { primary: "#C8102E", ink: "#fff" },
  "st-johns": { primary: "#BA0C2F", ink: "#fff" },
  oregon: { primary: "#154733", ink: "#fff" },
  "oregon-state": { primary: "#DC4405", ink: "#fff" },
  "washington-state": { primary: "#981E32", ink: "#fff" },
  yale: { primary: "#00356B", ink: "#fff" },
  "texas-am": { primary: "#500000", ink: "#fff" },
  usc: { primary: "#990000", ink: "#fff" },
  "texas-state": { primary: "#5D1725", ink: "#fff" },
  lamar: { primary: "#D31145", ink: "#fff" },
  nebraska: { primary: "#D00000", ink: "#fff" },
  "ole-miss": { primary: "#CE1126", ink: "#fff" },
  "arizona-state": { primary: "#8C1D40", ink: "#fff" },
  "south-dakota-state": { primary: "#0033A0", ink: "#fff" },
  "mississippi-state": { primary: "#5D1725", ink: "#fff" },
  cincinnati: { primary: "#E00122", ink: "#fff" },
  louisiana: { primary: "#CE181E", ink: "#fff" },
  lipscomb: { primary: "#582C83", ink: "#fff" },
  kansas: { primary: "#0051BA", ink: "#fff" },
  arkansas: { primary: "#9D2235", ink: "#fff" },
  "missouri-state": { primary: "#660000", ink: "#fff" },
  northeastern: { primary: "#C8102E", ink: "#fff" },
  "west-virginia": { primary: "#002855", ink: "#fff" },
  "wake-forest": { primary: "#000000", ink: "#fff" },
  kentucky: { primary: "#0033A0", ink: "#fff" },
  binghamton: { primary: "#005A43", ink: "#fff" },
};

const NEUTRAL = { primary: "#3a3f4c", ink: "#f4f5f7" };

export function teamColor(id) {
  return TEAM_COLORS[id] || NEUTRAL;
}

/** A 1–3 letter monogram from a team name (identity without a logo). */
export function teamMonogram(name) {
  if (!name) return "—";
  const stop = { of: 1, the: 1, at: 1, "&": 1, and: 1 };
  const words = String(name)
    .split(/[\s.'-]+/)
    .filter((w) => w && !stop[w.toLowerCase()]);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0] || name;
  return w.slice(0, 3).toUpperCase();
}
