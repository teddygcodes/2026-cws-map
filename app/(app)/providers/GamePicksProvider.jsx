"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { useLive } from "./LiveProvider";
import { usePicks } from "./PicksProvider";
import { enumerateGames, gameClass, gamesTruth, scoreGames, scoreLocalGames } from "@/lib/games";

const GAME_PICKS_KEY = "cws-gamepicks-v1";
const RESULTS_KEY = "cws-results-v1";
const PICKS_UPDATED_KEY = "cws-picks-updated-v1";

const GamePicksContext = createContext(null);

function loadGamePicks() {
  try {
    const raw = localStorage.getItem(GAME_PICKS_KEY);
    const g = raw ? JSON.parse(raw) : null;
    if (g && g.v === 1 && g.picks) return { v: 1, picks: g.picks };
  } catch (e) {
    /* ignore */
  }
  return { v: 1, picks: {} };
}
function loadResultsCache() {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    const r = raw ? JSON.parse(raw) : null;
    if (r && typeof r === "object") return r;
  } catch (e) {
    /* ignore */
  }
  return {};
}

export function GamePicksProvider({ children }) {
  const { TOURNAMENT, resolveBracket } = useData();
  const live = useLive();
  const { snap } = usePicks();

  const [gamePicks, setGamePicks] = useState(() => (typeof window === "undefined" ? { v: 1, picks: {} } : loadGamePicks()));
  const cacheRef = useRef(typeof window === "undefined" ? {} : loadResultsCache());

  // Enumerate every game from the live feed; merge newly-decided into the
  // append-only RESULTS_CACHE so finished games keep scoring after they age out.
  const { games, truth } = useMemo(() => {
    const { games, decided } = enumerateGames({
      snapshot: snap,
      round: live.round,
      sites: live.sites,
      bySite: live.live.bySite,
      resolveBracket,
    });
    let dirty = false;
    Object.keys(decided).forEach((k) => {
      if (!cacheRef.current[k]) {
        cacheRef.current[k] = decided[k];
        dirty = true;
      }
    });
    if (dirty) {
      try {
        localStorage.setItem(RESULTS_KEY, JSON.stringify(cacheRef.current));
      } catch (e) {
        /* ignore */
      }
    }
    return { games, truth: gamesTruth(games, cacheRef.current) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, resolveBracket, live.version]);

  const persist = useCallback((next) => {
    setGamePicks(next);
    try {
      localStorage.setItem(GAME_PICKS_KEY, JSON.stringify(next));
      localStorage.setItem(PICKS_UPDATED_KEY, String(Date.now()));
    } catch (e) {
      /* ignore */
    }
  }, []);

  const setPick = useCallback((gameKey, teamId) => persist({ v: 1, picks: { ...gamePicks.picks, [gameKey]: teamId } }), [gamePicks, persist]);

  // Adopt server game picks pushed by PicksProvider's reconcile.
  useEffect(() => {
    const onRemote = (e) => persist({ v: 1, picks: e.detail || {} });
    window.addEventListener("cws-remote-gamepicks", onRemote);
    return () => window.removeEventListener("cws-remote-gamepicks", onRemote);
  }, [persist]);

  // Test hook (smoke): window.__gamepicks
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__gamepicks = {
      get: () => gamePicks,
      set: (g) => persist({ v: 1, picks: (g && g.picks) || {} }),
      enumerate: () => games,
      score: (m) => scoreGames(m, truth),
    };
  }, [gamePicks, games, truth, persist]);

  const value = useMemo(
    () => ({
      gamePicks,
      games,
      truth,
      setPick,
      classOf: (g) => gameClass(g, Date.now()),
      localRecord: () => scoreLocalGames(gamePicks.picks, truth),
      scoreGames: (m) => scoreGames(m, truth),
    }),
    [gamePicks, games, truth, setPick]
  );

  return <GamePicksContext.Provider value={value}>{children}</GamePicksContext.Provider>;
}

export function useGamePicks() {
  const ctx = useContext(GamePicksContext);
  if (!ctx) throw new Error("useGamePicks must be used within <GamePicksProvider>");
  return ctx;
}
