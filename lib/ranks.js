/* =============================================================================
   Field ranks — for each comparable stat, rank every team that HAS a verified
   value (teams missing the stat get no rank — honesty rule, no fabricated rank).
   Pure; derived entirely from the static TOURNAMENT.teams data.
   ============================================================================= */

import { recordPct } from "./format.js";

// stat key → direction ("high" = bigger is better, "low" = smaller is better)
export const RANKABLE = {
  recordPct: "high",
  rpi: "low",
  runs: "high",
  runsAllowed: "low",
  battingAvg: "high",
  era: "low",
  sos: "low",
};

function rawVal(t, key) {
  if (key === "recordPct") return recordPct(t.record);
  if (key === "rpi") return typeof t.rpi === "number" ? t.rpi : null;
  const v = t.stats ? t.stats[key] : null;
  if (v == null || v === "") return null;
  const f = typeof v === "number" ? v : parseFloat(v);
  return isFinite(f) ? f : null;
}

/**
 * Returns { teamId: { statKey: { rank, of } } }. Only ranks teams with a value
 * for that stat; `of` is how many teams were ranked (the comparable field size).
 */
export function fieldRanks(teamsMap) {
  const ids = Object.keys(teamsMap);
  const out = {};
  ids.forEach((id) => {
    out[id] = {};
  });
  Object.keys(RANKABLE).forEach((key) => {
    const dir = RANKABLE[key];
    const valid = ids.map((id) => ({ id, v: rawVal(teamsMap[id], key) })).filter((x) => x.v != null);
    valid.sort((a, b) => (dir === "high" ? b.v - a.v : a.v - b.v));
    const of = valid.length;
    valid.forEach((x, i) => {
      out[x.id][key] = { rank: i + 1, of };
    });
  });
  return out;
}
