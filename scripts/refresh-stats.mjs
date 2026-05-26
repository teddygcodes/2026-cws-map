#!/usr/bin/env node
/**
 * Nightly data refresh: update each team's W-L RECORD from ESPN's team
 * endpoint, then re-serialize data.js deterministically (every other field —
 * conference, rpi, stats, stadium, players — is preserved untouched).
 *
 * ESPN reliably exposes records for college baseball but NOT season rate-stats
 * or RPI/SOS/player lines, so only records are refreshed. A team whose record
 * can't be fetched keeps its existing value (never nulled). If the source is
 * unreachable the script exits non-zero and writes nothing.
 *
 *   node scripts/refresh-stats.mjs           # fetch + rewrite data.js
 *   node scripts/refresh-stats.mjs --check   # no network: assert canonical form
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball";
const CHECK = process.argv.includes("--check");

// teamIds whose ESPN match is ambiguous → pin to an ESPN team id explicitly.
const ALIASES = {};

function loadTournament() {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, "data.js"), "utf8"), ctx, { filename: "data.js" });
  return ctx.window.TOURNAMENT;
}

// ---- canonical serializer (must reproduce data.js byte-for-byte) -----------
const HEADER = `/* =============================================================================
   2026 NCAA Baseball Tournament — static data
   -----------------------------------------------------------------------------
   STATS NOTE (re-verified 2026-05-26; records auto-refreshed nightly)
   - Team records, conferences, RPI, team rate stats (runs / runsAllowed /
     battingAvg / ERA), SOS, and 3-4 key players per team were researched AND
     re-verified against live 2026 sources (official athletics cumulative-stat
     pages, WarrenNolan for record/RPI/SOS, TheBaseballCube, D1Baseball),
     cross-checked across at least two sources. Final regular-season figures as
     of 2026-05-25 (the day the 64-team field was announced).
   - TEAM RECORDS are refreshed nightly from ESPN by scripts/refresh-stats.mjs
     (the only field that changes once the tournament is underway). Everything
     else stays at the verified snapshot; ESPN does not expose RPI/SOS/rate
     stats/players for college baseball.
   - Numbers come only from sources that published them; anything unverifiable is
     left null and renders as a visible "TBD" — nothing is invented.
   - Stadium lat/lng remain best-known approximations (flagged // verify coords).
   - Stadium photos + attribution live in photos.js (images/<teamId>).

   SUPER_REGIONAL_UPGRADE (≈ June 2, 2026) — NOW AUTOMATIC
   - Regionals run May 29 – June 1; super-regional pairings depend on who wins.
   - As of Session 2 the app advances ITSELF: index.html resolves each regional's
     champion from the live ESPN feed (bracket.js) and, once all 16 finish, builds
     the 8 super-regionals in memory (#s vs #17-s, host = higher seed) and flips
     \`round\`. This file's \`round\` stays "regional"; no manual edit is required.
   - The shape is unchanged — a site's \`teams\` simply goes from 4 ids to 2; the
     renderer is count-agnostic.
   ========================================================================== */`;

const S = (v) => JSON.stringify(v);
const num = (v) => (v === null || v === undefined ? "null" : v);

function serialize(T) {
  const out = [HEADER, "", "const TOURNAMENT = {", "  year: " + T.year + ",", "",
    '  // SUPER_REGIONAL_UPGRADE: stays "regional"; the app builds super-regionals in memory.',
    "  round: " + S(T.round) + ",", "",
    "  // SUPER_REGIONAL_UPGRADE: 16 sites now; the app replaces these with 8 automatically.",
    "  sites: ["];
  for (const s of T.sites) out.push("    { id: " + S(s.id) + ", city: " + S(s.city) + ", hostTeamId: " + S(s.hostTeamId) + ", teams: [" + s.teams.map(S).join(", ") + "] },");
  out.push("  ],", "",
    "  /* record {w,l}, rpi (national rank|null), stats {runs, runsAllowed,",
    "     battingAvg, era, sos}, stadium {name,lat,lng,capacity,blurb}, players",
    "     [{name,pos,line}]. seed = national seed (1-16) for hosts, else null. */",
    "  teams: {");
  for (const s of T.sites) {
    out.push("    // ---- " + s.city + " Regional " + "-".repeat(Math.max(2, 52 - s.city.length)));
    for (const tid of s.teams) {
      const t = T.teams[tid], st = t.stadium, ss = t.stats;
      out.push("    " + S(tid) + ": {");
      out.push("      id: " + S(t.id) + ", name: " + S(t.name) + ", seed: " + num(t.seed) + ", conference: " + S(t.conference) + ",");
      out.push("      record: { w: " + num(t.record.w) + ", l: " + num(t.record.l) + " }, rpi: " + num(t.rpi) + ",");
      out.push("      stats: { runs: " + num(ss.runs) + ", runsAllowed: " + num(ss.runsAllowed) + ", battingAvg: " + (ss.battingAvg == null ? "null" : S(ss.battingAvg)) + ", era: " + num(ss.era) + ", sos: " + num(ss.sos) + " },");
      out.push("      stadium: { name: " + S(st.name) + ", lat: " + st.lat + ", lng: " + st.lng + ", capacity: " + num(st.capacity) + ", // verify coords");
      out.push("        blurb: " + S(st.blurb) + " },");
      out.push("      players: [");
      for (const p of t.players) out.push("        { name: " + S(p.name) + ", pos: " + S(p.pos) + ", line: " + S(p.line) + " },");
      out.push("      ],");
      out.push("    },");
    }
  }
  out.push("  },", "};", "", 'if (typeof window !== "undefined") window.TOURNAMENT = TOURNAMENT;');
  return out.join("\n") + "\n";
}

// ---- ESPN fetch ------------------------------------------------------------
function normName(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, ""); }
async function getJSON(url, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "cws-map-refresh/1.0" } });
      if (r.ok) return await r.json();
      last = "HTTP " + r.status;
    } catch (e) { last = e.message; }
    await new Promise((res) => setTimeout(res, 600 * (i + 1)));
  }
  throw new Error("fetch failed (" + last + "): " + url);
}
async function buildEspnIdMap(T) {
  const d = await getJSON(ESPN + "/teams?limit=900");
  const list = d.sports[0].leagues[0].teams.map((x) => x.team);
  const map = {};
  for (const id of Object.keys(T.teams)) {
    if (ALIASES[id]) { map[id] = ALIASES[id]; continue; }
    const nn = normName(T.teams[id].name);
    let exact = null, fuzzy = null;
    for (const t of list) {
      const cands = [t.location, t.displayName, t.shortDisplayName, t.name].filter(Boolean).map(normName);
      if (cands.includes(nn)) { exact = t.id; break; }
      if (!fuzzy) for (const c of cands) { if (nn && (nn.indexOf(c) >= 0 || c.indexOf(nn) >= 0) && Math.abs(nn.length - c.length) <= 12) { fuzzy = t.id; break; } }
    }
    map[id] = exact || fuzzy;
  }
  return map;
}
async function fetchRecord(espnId) {
  const d = await getJSON(ESPN + "/teams/" + espnId);
  const items = ((d.team || {}).record || {}).items || [];
  const tot = items.find((i) => i.type === "total") || items[0];
  if (!tot || !tot.summary) return null;
  const m = String(tot.summary).match(/(\d+)\s*-\s*(\d+)/);
  return m ? { w: +m[1], l: +m[2] } : null;
}

// ---- main ------------------------------------------------------------------
async function main() {
  const T = loadTournament();
  if (CHECK) {
    if (serialize(T) !== readFileSync(join(ROOT, "data.js"), "utf8")) {
      console.error("✗ data.js is not in canonical form — run `npm run refresh` and commit.");
      process.exit(1);
    }
    console.log("✓ data.js is canonical");
    return;
  }
  const idmap = await buildEspnIdMap(T); // throws (exit 1) if the teams list is unreachable
  let changed = 0; const unresolved = [];
  for (const id of Object.keys(T.teams)) {
    const eid = idmap[id];
    if (!eid) { unresolved.push(id + " (no ESPN id)"); continue; }
    let rec = null;
    try { rec = await fetchRecord(eid); } catch (e) { rec = null; }
    if (!rec) { unresolved.push(id + " (no record)"); continue; } // keep existing
    if (rec.w !== T.teams[id].record.w || rec.l !== T.teams[id].record.l) {
      T.teams[id].record = rec; changed++;
    }
  }
  writeFileSync(join(ROOT, "data.js"), serialize(T));
  console.log("✓ records refreshed: " + changed + " changed, " + unresolved.length + " kept-as-is" +
    (unresolved.length ? " (" + unresolved.join(", ") + ")" : "") + ".");
}
main().catch((e) => { console.error("✗ refresh failed:", e.message); process.exit(1); });
