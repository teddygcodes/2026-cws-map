"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { useData } from "./DataProvider";
import {
  buildFieldNorm,
  parseEvent,
  pairKey,
  siteForGame,
  siteChampion as champOf,
  computeSuperRegionals,
  eventWinner,
  tourneyDates,
} from "@/lib/live-parse";
import { ordinal } from "@/lib/format";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball";
const POLL_MS = 30000;
// Dates to poll are computed per-refresh as a rolling window (tourneyDates),
// so coverage follows the calendar through super-regionals + the CWS with no
// hardcoded end date to maintain.

const LiveContext = createContext(null);

export function LiveProvider({ children }) {
  const { TOURNAMENT, resolveBracket } = useData();
  const fieldNorm = useMemo(() => buildFieldNorm(TOURNAMENT.teams), [TOURNAMENT]);
  const team = useCallback((id) => TOURNAMENT.teams[id], [TOURNAMENT]);

  // Mutable live state (mirrors the legacy LIVE object); bump() forces a re-render.
  const liveRef = useRef({
    list: [],
    byPair: {},
    bySite: {},
    prevOdds: {}, // pair -> previous moneyline map, for odds-chip flash
    activeDate: null,
    updated: null,
    loading: false,
    demo: null,
    demoTimer: null,
    simSite: null,
    simTimer: null,
    simClock: 0,
    simAll: false,
  });
  const sitesRef = useRef(TOURNAMENT.sites);
  const roundRef = useRef(TOURNAMENT.round);
  const [version, bump] = useReducer((x) => x + 1, 0);

  // Mirror round/sites back to window.TOURNAMENT so smoke's test hooks survive.
  useEffect(() => {
    if (typeof window !== "undefined" && window.TOURNAMENT) {
      window.TOURNAMENT.round = roundRef.current;
      window.TOURNAMENT.sites = sitesRef.current;
    }
  }, [version]);

  const bracketGames = useCallback((site) => {
    const L = liveRef.current;
    if (L.simSite && L.simSite.siteId === site.id) return L.simSite.games;
    return (L.bySite && L.bySite[site.id]) || [];
  }, []);

  const siteIsLive = useCallback((site) => bracketGames(site).some((g) => g.state === "in"), [bracketGames]);
  const siteChampion = useCallback(
    (site) => champOf(site, bracketGames(site), roundRef.current, resolveBracket),
    [bracketGames, resolveBracket]
  );

  const maybeAdvance = useCallback(() => {
    if (roundRef.current !== "regional") return;
    const supers = computeSuperRegionals(sitesRef.current, TOURNAMENT.teams, liveRef.current.bySite, resolveBracket);
    if (!supers) return;
    roundRef.current = "super-regional";
    sitesRef.current = supers;
  }, [TOURNAMENT, resolveBracket]);

  // ---- ESPN polling ----
  const refresh = useCallback(() => {
    const L = liveRef.current;
    if (L.loading) return;
    L.loading = true;
    Promise.all(
      tourneyDates().map((d) =>
        fetch(ESPN + "/scoreboard?dates=" + d + "&limit=400", { cache: "no-store" })
          .then((r) => {
            if (!r.ok) throw new Error("sb " + r.status);
            return r.json();
          })
          .then((data) => ({ date: d, games: (data.events || []).map((ev) => parseEvent(ev, fieldNorm)).filter(Boolean) }))
          .catch(() => ({ date: d, games: [] }))
      )
    )
      .then((results) => {
        const bySite = {};
        results.forEach((r) => {
          r.games.forEach((g) => {
            const s = siteForGame(g, sitesRef.current);
            if (s) (bySite[s.id] = bySite[s.id] || []).push(g);
          });
        });
        L.bySite = bySite;
        const today = ymdNow();
        const pick =
          results.find((r) => r.date === today && r.games.length) ||
          results.find((r) => r.games.length && r.games.some((g) => g.state !== "post")) ||
          results.find((r) => r.games.length) || { date: today, games: [] };
        // capture previous odds for line-move flash before overwriting byPair
        const prev = {};
        Object.keys(L.byPair).forEach((k) => {
          const od = L.byPair[k] && L.byPair[k].odds;
          if (od) prev[k] = od.byTeam;
        });
        L.prevOdds = prev;
        L.activeDate = pick.date;
        L.list = pick.games;
        L.byPair = {};
        pick.games.forEach((g) => {
          L.byPair[g.pair] = g;
        });
        L.updated = new Date();
        L.loading = false;
        maybeAdvance();
        bump();
      })
      .catch(() => {
        L.loading = false;
      });
  }, [fieldNorm, maybeAdvance]);

  useEffect(() => {
    refresh();
    const t = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_MS);
    const onVis = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  // ---- demo simulation (clearly labeled SIM) ----
  const pickName = useCallback(
    (teamId, wantPitcher) => {
      const ps = (team(teamId) && team(teamId).players) || [];
      let pool = ps.filter((p) => {
        const isP = /HP$/.test(p.pos) || p.pos === "P";
        return wantPitcher ? isP : !isP;
      });
      if (!pool.length) pool = ps;
      return pool.length ? pool[Math.floor(Math.random() * pool.length)].name : wantPitcher ? "Pitcher" : "Batter";
    },
    [team]
  );

  const stopDemo = useCallback(() => {
    const L = liveRef.current;
    if (L.demoTimer) {
      clearInterval(L.demoTimer);
      L.demoTimer = null;
    }
    L.demo = null;
    bump();
  }, []);

  const startDemo = useCallback(() => {
    const L = liveRef.current;
    if (L.demoTimer) clearInterval(L.demoTimer);
    let inning = 1;
    let half = "Top";
    L.demo = {
      id: "demo",
      demo: true,
      state: "in",
      detail: "Top 1st",
      comps: [{ id: "milwaukee", score: 0 }, { id: "auburn", score: 0 }],
      pair: pairKey("auburn", "milwaukee"),
      aInn: [],
      bInn: [],
      hits: [0, 0],
      errors: [0, 0],
      plays: [],
      situation: null,
    };
    L.demoTimer = setInterval(() => {
      const d = L.demo;
      if (!d) return;
      const runs = Math.random() < 0.35 ? (Math.random() < 0.6 ? 1 : 2) : 0;
      const batId = half === "Top" ? d.comps[0].id : d.comps[1].id;
      const fldId = half === "Top" ? d.comps[1].id : d.comps[0].id;
      if (half === "Top") {
        d.comps[0].score += runs;
        d.aInn.push(runs);
        d.hits[0] += runs + (Math.random() < 0.5 ? 1 : 0);
      } else {
        d.comps[1].score += runs;
        d.bInn.push(runs);
        d.hits[1] += runs + (Math.random() < 0.5 ? 1 : 0);
      }
      if (Math.random() < 0.05) d.errors[Math.random() < 0.5 ? 0 : 1]++;
      if (runs > 0) {
        const k =
          runs > 1
            ? ["doubled, " + runs + " RBI", "homered (" + runs + "-run)", "cleared the bases, " + runs + " RBI"]
            : ["singled, RBI", "doubled, RBI", "hit a sacrifice fly, RBI", "grounded out, RBI"];
        d.plays.push({
          inn: (half === "Top" ? "T" : "B") + inning,
          text: pickName(batId, false) + " " + k[Math.floor(Math.random() * k.length)],
          away: d.comps[0].score,
          home: d.comps[1].score,
        });
      }
      d.situation = {
        balls: Math.floor(Math.random() * 4),
        strikes: Math.floor(Math.random() * 3),
        outs: Math.floor(Math.random() * 3),
        first: Math.random() < 0.4,
        second: Math.random() < 0.3,
        third: Math.random() < 0.2,
        batter: pickName(batId, false),
        pitcher: pickName(fldId, true),
      };
      if (half === "Top") half = "Bottom";
      else {
        half = "Top";
        inning++;
      }
      if (inning > 9) {
        d.state = "post";
        d.detail = "Final";
        d.situation = null;
        clearInterval(L.demoTimer);
        L.demoTimer = null;
      } else d.detail = half + " " + ordinal(inning);
      bump();
    }, 3000);
    bump();
  }, [pickName]);

  // ---- regional simulation (clearly labeled SIM; QA + preview) ----
  const simGame = useCallback((winId, loseId) => {
    const L = liveRef.current;
    L.simClock += 3600000;
    const ws = 2 + Math.floor(Math.random() * 8);
    const ls = Math.floor(Math.random() * ws);
    return {
      id: "sim-" + winId + "-" + loseId + "-" + L.simClock,
      state: "post",
      detail: "Final",
      date: new Date(Date.now() + L.simClock).toISOString(),
      comps: [{ id: winId, score: ws, winner: true }, { id: loseId, score: ls, winner: false }],
      pair: pairKey(winId, loseId),
      sim: true,
    };
  }, []);

  const simRegionalGames = useCallback(
    (teams) => {
      const games = [];
      for (let guard = 0; guard < 12; guard++) {
        const br = resolveBracket(teams, games);
        if (br.champion) break;
        const slot = br.slots.find((sl) => sl.determined && sl.necessary !== false && !sl.event);
        if (!slot) break;
        const a = slot.teams[0];
        const b = slot.teams[1];
        const w = Math.random() < 0.5 ? a : b;
        games.push(simGame(w, w === a ? b : a));
      }
      return games;
    },
    [resolveBracket, simGame]
  );

  const stopRegionalSim = useCallback(() => {
    const L = liveRef.current;
    if (L.simTimer) {
      clearInterval(L.simTimer);
      L.simTimer = null;
    }
    L.simSite = null;
    bump();
  }, []);

  const startRegionalSim = useCallback(
    (siteId) => {
      const L = liveRef.current;
      if (L.simTimer) clearInterval(L.simTimer);
      L.simSite = { siteId, games: [] };
      L.simTimer = setInterval(() => {
        const s = sitesRef.current.find((x) => x.id === L.simSite.siteId);
        const br = resolveBracket(s.teams, L.simSite.games);
        const slot = br.slots.find((sl) => sl.determined && sl.necessary !== false && !sl.event);
        if (br.champion || !slot) {
          clearInterval(L.simTimer);
          L.simTimer = null;
          bump();
          return;
        }
        const a = slot.teams[0];
        const b = slot.teams[1];
        const w = Math.random() < 0.5 ? a : b;
        L.simSite.games.push(simGame(w, w === a ? b : a));
        bump();
      }, 2500);
      bump();
    },
    [resolveBracket, simGame]
  );

  const simulateAllRegionals = useCallback(() => {
    const L = liveRef.current;
    L.simAll = true;
    sitesRef.current.forEach((s) => {
      L.bySite[s.id] = simRegionalGames(s.teams);
    });
    maybeAdvance();
    bump();
  }, [simRegionalGames, maybeAdvance]);

  // Test/preview hooks (smoke depends on these).
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__simAll = simulateAllRegionals;
    window.__simRegional = startRegionalSim;
    window.__stopSim = stopRegionalSim;
  }, [simulateAllRegionals, startRegionalSim, stopRegionalSim]);

  const value = useMemo(() => {
    const L = liveRef.current;
    return {
      version,
      sites: sitesRef.current,
      round: roundRef.current,
      live: L,
      espnBase: ESPN,
      fieldNorm,
      bracketGames,
      siteIsLive,
      siteChampion,
      oddsForPair: (a, b) => (L.byPair[pairKey(a, b)] || {}).odds || null,
      prevOddsForPair: (a, b) => L.prevOdds[pairKey(a, b)] || null,
      eventForPair: (a, b) => L.byPair[pairKey(a, b)] || null,
      demoSummary: () => {
        const d = L.demo;
        if (!d) return null;
        const nm = (c) => (c.id && TOURNAMENT.teams[c.id] ? TOURNAMENT.teams[c.id].name : c.id);
        return {
          id: "demo",
          state: d.state,
          detail: d.detail,
          demo: true,
          teams: [
            { id: d.comps[0].id, name: nm(d.comps[0]), score: d.comps[0].score, innings: d.aInn, hits: d.hits[0], errors: d.errors[0], home: false },
            { id: d.comps[1].id, name: nm(d.comps[1]), score: d.comps[1].score, innings: d.bInn, hits: d.hits[1], errors: d.errors[1], home: true },
          ],
          situation: d.situation,
          scoringPlays: (d.plays || []).slice(-15),
          box: null,
        };
      },
      refresh,
      startDemo,
      stopDemo,
      startRegionalSim,
      stopRegionalSim,
      simulateAllRegionals,
      eventWinner,
    };
  }, [version, bracketGames, siteIsLive, siteChampion, refresh, startDemo, stopDemo, startRegionalSim, stopRegionalSim, simulateAllRegionals]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

function ymdNow() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive must be used within <LiveProvider>");
  return ctx;
}
