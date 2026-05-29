/* =============================================================================
   Daily per-game pick'em — pure enumeration + scoring. No DOM/window/localStorage.
   Regionals come from the load-time snapshot (keys survive the super-flip);
   supers are best-of-3. Each game has a STABLE key (siteId_G#, super-<sd>_G#).

   Fairness without a schedule on the server: a pick counts as a WIN only if it
   was recorded before that game's first pitch (ts < startMs) AND matches the
   real winner. The client knows real first-pitch times from the live feed.
   ============================================================================= */

import { eventWinner, scoreFor } from "./live-parse.js";

/**
 * Enumerate every tournament game.
 *   ctx = { snapshot, round, sites, bySite, resolveBracket }
 * Returns { games:[...], decided:{ key:{winner,startMs} } } — `decided` is the
 * set of finished games discovered this pass (caller merges into RESULTS_CACHE).
 */
export function enumerateGames(ctx) {
  const { snapshot, round, sites, bySite, resolveBracket } = ctx;
  const out = [];
  const decided = {};
  const record = (key, winner, startMs) => {
    if (winner) decided[key] = { winner, startMs };
  };

  snapshot.sites.forEach((site) => {
    if (!resolveBracket) return;
    const br = resolveBracket(site.teams, (bySite && bySite[site.id]) || []);
    const g6 = br.slots[5];
    const g6Final = !!(g6 && g6.event && g6.event.state === "post");
    br.slots.forEach((slot) => {
      if (slot.g === 7 && g6Final && !slot.necessary) return; // G7 not needed
      const ev = slot.event;
      const startMs = ev && ev.date ? Date.parse(ev.date) : null;
      const winner = slot.teams ? eventWinner(ev, slot.teams) : null;
      const key = site.id + "_G" + slot.g;
      record(key, winner, startMs);
      out.push({
        key,
        label: site.city.split(",")[0] + " G" + slot.g,
        round: "regional",
        teamA: slot.teams ? slot.teams[0] : null,
        teamB: slot.teams ? slot.teams[1] : null,
        determined: slot.determined,
        state: ev ? ev.state : slot.determined ? "pre" : "tbd",
        startMs,
        winner,
        odds: ev ? ev.odds : null,
        scoreA: ev && ev.comps && slot.teams ? scoreFor(ev, slot.teams[0]) : null,
        scoreB: ev && ev.comps && slot.teams ? scoreFor(ev, slot.teams[1]) : null,
      });
    });
  });

  if (round === "super-regional") {
    sites.forEach((s) => {
      const games = (((bySite && bySite[s.id]) || [])).slice().sort((x, y) => (Date.parse(x.date) || 0) - (Date.parse(y.date) || 0));
      const w = {};
      w[s.teams[0]] = 0;
      w[s.teams[1]] = 0;
      games.forEach((gm) => {
        if (gm.state === "post") {
          const x = eventWinner(gm, s.teams);
          if (x != null && w[x] != null) w[x]++;
        }
      });
      const champ = w[s.teams[0]] >= 2 ? s.teams[0] : w[s.teams[1]] >= 2 ? s.teams[1] : null;
      for (let i = 0; i < 3; i++) {
        if (i === 2 && champ) break; // G3 only if necessary
        const ev = games[i];
        const key = "super-" + s.seed + "_G" + (i + 1);
        const startMs = ev && ev.date ? Date.parse(ev.date) : null;
        const winner = eventWinner(ev, s.teams);
        record(key, winner, startMs);
        out.push({
          key,
          label: s.city.split(",")[0] + " Super G" + (i + 1),
          round: "super",
          teamA: s.teams[0],
          teamB: s.teams[1],
          determined: true,
          state: ev ? ev.state : "pre",
          startMs,
          winner,
          odds: ev ? ev.odds : null,
          scoreA: ev && ev.comps ? scoreFor(ev, s.teams[0]) : null,
          scoreB: ev && ev.comps ? scoreFor(ev, s.teams[1]) : null,
        });
      }
    });
  }

  return { games: out, decided };
}

/** open | locked | upcoming, given "now" (epoch ms). */
export function gameClass(g, now) {
  if (!g.determined) return "upcoming";
  if (g.state === "in" || g.state === "post") return "locked";
  if (g.startMs != null && g.startMs < now) return "locked"; // first pitch passed
  return "open";
}

/** Truth map of decided games (live + append-only cache), for scoring. */
export function gamesTruth(games, resultsCache) {
  const truth = {};
  games.forEach((g) => {
    if (g.state === "post" && g.winner) truth[g.key] = { winner: g.winner, startMs: g.startMs };
  });
  Object.keys(resultsCache || {}).forEach((k) => {
    if (!truth[k] && resultsCache[k].winner) truth[k] = resultsCache[k];
  });
  return truth;
}

/** Score a server-side games map { gameKey:{pick,ts} } against the truth map. */
export function scoreGames(gamesMap, truth) {
  let wins = 0;
  let losses = 0;
  let decided = 0;
  let superWins = 0;
  Object.keys(gamesMap || {}).forEach((k) => {
    const t = truth[k];
    if (!t) return;
    decided++;
    const e = gamesMap[k] || {};
    if (e.ts != null && t.startMs != null && e.ts < t.startMs && e.pick === t.winner) {
      wins++;
      if (k.indexOf("super-") === 0) superWins++;
    } else losses++;
  });
  return { wins, losses, decided, superWins };
}

/** The local user's own (unsubmitted) preview record — no server ts to verify
    the first-pitch lock, so it's labeled "preview" in the UI. */
export function scoreLocalGames(localPicks, truth) {
  let wins = 0;
  let decided = 0;
  Object.keys(localPicks || {}).forEach((k) => {
    const t = truth[k];
    if (!t) return;
    decided++;
    if (localPicks[k] === t.winner) wins++;
  });
  return { wins, losses: decided - wins, decided };
}
