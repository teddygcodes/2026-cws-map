/* =============================================================================
   Pure ESPN-feed parsing + bracket helpers. No DOM, no window, no module-level
   mutable state — everything takes data as arguments so it is unit-testable in
   Node and safe to bundle for the browser.

   Honesty rule: a team only "advances" from a game whose state === "post"; any
   "OFF"/missing odds line is dropped (never invented).
   ============================================================================= */

export function normName(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Build a { teamId: normalizedName } lookup from the TOURNAMENT.teams map. */
export function buildFieldNorm(teams) {
  const m = {};
  Object.keys(teams).forEach((id) => {
    m[id] = normName(teams[id].name);
  });
  return m;
}

/** Map an ESPN team object to one of our teamIds by normalized substring match. */
export function matchTeamId(espnTeam, fieldNorm) {
  if (!espnTeam) return null;
  const cands = [espnTeam.location, espnTeam.displayName, espnTeam.shortDisplayName, espnTeam.name]
    .filter(Boolean)
    .map(normName);
  let best = null;
  for (const id in fieldNorm) {
    const nn = fieldNorm[id];
    for (let i = 0; i < cands.length; i++) {
      const c = cands[i];
      if (c === nn) return id;
      if (nn && (nn.indexOf(c) >= 0 || c.indexOf(nn) >= 0) && Math.abs(nn.length - c.length) <= 12) {
        best = best || id;
      }
    }
  }
  return best;
}

export function pairKey(a, b) {
  return [a, b].sort().join("|");
}

export function scoreFor(g, teamId) {
  for (let i = 0; i < g.comps.length; i++) if (g.comps[i].id === teamId) return g.comps[i].score;
  return null;
}

/** Winner teamId of a finished game, or null if not decided / can't tell. */
export function eventWinner(ev, ids) {
  if (!ev || ev.state !== "post") return null;
  let w = (ev.comps.find((c) => c.winner) || {}).id;
  if (!w && ids) {
    const s0 = scoreFor(ev, ids[0]);
    const s1 = scoreFor(ev, ids[1]);
    if (s0 != null && s1 != null && s0 !== s1) w = s0 > s1 ? ids[0] : ids[1];
  }
  return w || null;
}

/** ESPN betting odds → our teamIds. Returns null when nothing real is posted. */
export function parseOdds(arr, comps) {
  const o = (arr && arr[0]) || null;
  if (!o) return null;
  const clean = (v) => (v == null || v === "OFF" || v === "" ? null : v);
  const ml = o.moneyline || {};
  let home = null;
  let away = null;
  comps.forEach((c) => {
    if (c.home) home = c;
    else away = c;
  });
  const byTeam = {};
  const hml = clean(ml.home && ml.home.close && ml.home.close.odds);
  const aml = clean(ml.away && ml.away.close && ml.away.close.odds);
  if (home && home.id && hml) byTeam[home.id] = hml;
  if (away && away.id && aml) byTeam[away.id] = aml;
  let favId = null;
  if (o.homeTeamOdds && o.homeTeamOdds.favorite && home) favId = home.id;
  else if (o.awayTeamOdds && o.awayTeamOdds.favorite && away) favId = away.id;
  const od = {
    provider: (o.provider && o.provider.displayName) || "DraftKings",
    details: clean(o.details),
    favoriteId: favId,
    byTeam,
    spread: typeof o.spread === "number" && o.spread !== 0 ? o.spread : null,
    overUnder: typeof o.overUnder === "number" ? o.overUnder : null,
  };
  od.hasAny = !!(od.details || Object.keys(byTeam).length || od.spread != null || od.overUnder != null);
  return od.hasAny ? od : null;
}

/** Normalize one ESPN scoreboard event → our shape, or null if not a 2-team
    game between teams in our field. */
export function parseEvent(ev, fieldNorm) {
  try {
    const comp = ev.competitions[0];
    const st = (ev.status && ev.status.type) || {};
    const comps = comp.competitors.map((c) => ({
      id: matchTeamId(c.team, fieldNorm),
      name: (c.team && (c.team.location || c.team.displayName)) || "?",
      score: c.score != null && c.score !== "" ? parseInt(c.score, 10) : null,
      home: c.homeAway === "home",
      winner: !!c.winner,
    }));
    const ids = comps.map((c) => c.id).filter(Boolean);
    if (ids.length !== 2) return null;
    return {
      id: ev.id,
      state: st.state || "pre",
      detail: clampStr(st.shortDetail || st.detail || "", 60),
      date: ev.date,
      comps,
      pair: pairKey(ids[0], ids[1]),
      odds: parseOdds(comp.odds, comps),
    };
  } catch (e) {
    return null;
  }
}

/** The site (regional or super-regional) a game belongs to: both teams in it. */
export function siteForGame(g, sites) {
  const ids = g.comps.map((c) => c.id);
  return sites.find((s) => ids.every((id) => id && s.teams.indexOf(id) >= 0));
}

/** Champion of a site. resolveBracket for 4-team regionals; best-of-3 for supers. */
export function siteChampion(site, games, round, resolveBracket) {
  if (round === "super-regional" || site.teams.length === 2) {
    const w = {};
    site.teams.forEach((id) => {
      w[id] = 0;
    });
    games.forEach((g) => {
      if (g.state === "post") {
        const x = (g.comps.find((c) => c.winner) || {}).id;
        if (w[x] != null) w[x]++;
      }
    });
    return site.teams.find((id) => w[id] >= 2) || null;
  }
  return resolveBracket ? resolveBracket(site.teams, games).champion : null;
}

// ---- game-detail summary parsing (box score / linescore / situation) ----
const BAT_COLS = ["AB", "R", "H", "RBI", "HR", "BB", "K", "AVG"];
const PIT_COLS = ["IP", "H", "R", "ER", "BB", "K", "ERA"];
function pickCols(labels, want) {
  return want.map((w) => ({ label: w, idx: (labels || []).indexOf(w) })).filter((c) => c.idx >= 0);
}
// Defensive clamp for ESPN-sourced display strings: drop ASCII control codes,
// DEL, zero-width and bidi-override chars, and cap length. React already escapes
// these (no XSS); this just stops junk/RTL-override/oversized values from
// breaking layout. Regex-free to match the Worker's sanitize style.
function clampStr(s, n) {
  if (typeof s !== "string") return s;
  const max = n || 40;
  let out = "";
  for (let i = 0; i < s.length && out.length < max; i++) {
    const cc = s.charCodeAt(i);
    const bad = cc < 32 || cc === 127 || (cc >= 0x200b && cc <= 0x200f) || (cc >= 0x202a && cc <= 0x202e);
    if (!bad) out += s.charAt(i);
  }
  return out.trim();
}
function parseBox(d, fieldNorm) {
  return (((d.boxscore || {}).players) || [])
    .map((g) => {
      const out = { teamId: matchTeamId(g.team, fieldNorm), name: clampStr((g.team && (g.team.displayName || g.team.location)) || "?"), batting: null, pitching: null };
      (g.statistics || []).forEach((st) => {
        const cols = pickCols(st.labels, st.type === "batting" ? BAT_COLS : PIT_COLS);
        const rows = (st.athletes || [])
          .map((a) => ({ name: clampStr((a.athlete && (a.athlete.shortName || a.athlete.displayName)) || "?"), stats: cols.map((c) => (a.stats || [])[c.idx]) }))
          .filter((r) => r.name !== "?");
        if (st.type === "batting") out.batting = { cols: cols.map((c) => c.label), rows };
        else if (st.type === "pitching") out.pitching = { cols: cols.map((c) => c.label), rows };
      });
      return out;
    })
    .filter((b) => b.batting || b.pitching);
}
function parseScoringPlays(d) {
  return (d.plays || [])
    .filter((p) => p.scoringPlay)
    .map((p) => {
      const per = p.period || {};
      return { inn: (per.type === "Top" ? "T" : "B") + (per.number || ""), text: p.text || "", away: p.awayScore, home: p.homeScore };
    })
    .slice(-15);
}
function parseSituation(d, state) {
  if (state !== "in") return null;
  const comp = ((d.header || {}).competitions || [{}])[0];
  let s = comp.situation || d.situation;
  if (!s) {
    const plays = d.plays || [];
    const lp = plays[plays.length - 1];
    if (!lp) return null;
    s = { balls: (lp.resultCount || {}).balls, strikes: (lp.resultCount || {}).strikes, outs: lp.outs, onFirst: lp.onFirst, onSecond: lp.onSecond, onThird: lp.onThird };
  }
  const nm = (x) => clampStr((x && x.athlete && (x.athlete.shortName || x.athlete.displayName)) || "") || null;
  return { balls: s.balls, strikes: s.strikes, outs: s.outs, first: !!s.onFirst, second: !!s.onSecond, third: !!s.onThird, batter: nm(s.batter), pitcher: nm(s.pitcher) };
}
export function parseSummary(d, eventId, fieldNorm) {
  const comp = ((d.header || {}).competitions || [{}])[0];
  const st = (comp.status && comp.status.type) || {};
  const state = st.state || "pre";
  const teams = (comp.competitors || []).map((c) => ({
    id: matchTeamId(c.team, fieldNorm),
    name: clampStr((c.team && (c.team.displayName || c.team.location)) || "?"),
    score: c.score != null ? +c.score : null,
    innings: (c.linescores || []).map((x) => x.value),
    hits: c.hits,
    errors: c.errors,
    home: c.homeAway === "home",
  }));
  return { id: eventId, state, detail: clampStr(st.shortDetail || st.detail || "", 60), teams, demo: false, situation: parseSituation(d, state), scoringPlays: parseScoringPlays(d), box: parseBox(d, fieldNorm) };
}

/** Pair the 16 regionals by host national seed (#s vs #17-s). Display-only. */
export function superPairings(sites, teams, bySite, resolveBracket) {
  const bySeed = {};
  sites.forEach((s) => {
    const hs = teams[s.hostTeamId].seed;
    if (hs != null) bySeed[hs] = s;
  });
  const pairs = [];
  for (let sd = 1; sd <= 8; sd++) {
    const hi = bySeed[sd];
    const lo = bySeed[17 - sd];
    if (!hi || !lo) continue;
    pairs.push({
      seed: sd,
      hi: { site: hi, champ: siteChampion(hi, bySite[hi.id] || [], "regional", resolveBracket) },
      lo: { site: lo, champ: siteChampion(lo, bySite[lo.id] || [], "regional", resolveBracket) },
    });
  }
  return pairs;
}

/** If every regional has a champion, build the 8 super-regional sites (by seed,
    host = higher seed) and return them; else null. Pure — caller swaps state. */
export function computeSuperRegionals(sites, teams, bySite, resolveBracket) {
  const champ = {};
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i];
    const c = resolveBracket ? resolveBracket(s.teams, bySite[s.id] || []).champion : null;
    if (!c) return null; // not all finished
    champ[s.id] = c;
  }
  const bySeed = {};
  sites.forEach((s) => {
    bySeed[teams[s.hostTeamId].seed] = { site: s, champ: champ[s.id] };
  });
  const supers = [];
  for (let sd = 1; sd <= 8; sd++) {
    const hi = bySeed[sd];
    const lo = bySeed[17 - sd];
    if (!hi || !lo) return null;
    supers.push({
      id: "super-" + sd,
      city: hi.site.city,
      hostTeamId: hi.site.hostTeamId,
      teams: [hi.champ, lo.champ],
      seed: sd,
    });
  }
  return supers;
}
