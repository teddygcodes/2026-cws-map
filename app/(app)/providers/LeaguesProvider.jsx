"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const LEAGUES_KEY = "cws-leagues-v1";
// Private-league backend (Cloudflare Worker). Empty string = feature OFF. The
// owner's deployed Worker is the committed default; smoke flips it via setApi().
const DEFAULT_LEAGUE_API = "https://cws-map-leagues.tyler-696.workers.dev";

const LeaguesContext = createContext(null);

function loadLeagues() {
  try {
    const raw = localStorage.getItem(LEAGUES_KEY);
    const l = raw ? JSON.parse(raw) : null;
    if (l && l.v === 1 && Array.isArray(l.joined)) return l;
  } catch (e) {
    /* ignore */
  }
  return { v: 1, joined: [] };
}
function newMemberId() {
  try {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {
    /* ignore */
  }
  return "m-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
}

export function lockState(lockTs) {
  const ms = (lockTs || 0) - Date.now();
  if (ms <= 0) return { locked: true, text: "Locked — brackets final" };
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { locked: false, text: "Locks in " + (d > 0 ? d + "d " + h + "h" : h > 0 ? h + "h " + m + "m" : m + "m") };
}

export function LeaguesProvider({ children }) {
  const [api, setApiState] = useState(DEFAULT_LEAGUE_API);
  const [leagues, setLeagues] = useState(() => (typeof window === "undefined" ? { v: 1, joined: [] } : loadLeagues()));

  const enabled = !!api;

  const save = useCallback((next) => {
    setLeagues(next);
    try {
      localStorage.setItem(LEAGUES_KEY, JSON.stringify(next));
    } catch (e) {
      /* ignore */
    }
  }, []);

  const request = useCallback(
    (method, path, body) => {
      if (!api) return Promise.reject({ offline: true });
      return fetch(api + path, {
        method,
        cache: "no-store",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }).then((r) =>
        r
          .json()
          .catch(() => ({}))
          .then((j) => (r.ok ? j : Promise.reject(Object.assign({ status: r.status }, j))))
      );
    },
    [api]
  );

  const joinedLeague = useCallback((code) => leagues.joined.find((j) => j.code === code) || null, [leagues]);

  const create = useCallback(
    (name, displayName) =>
      request("POST", "/league", { name: name || "League" }).then((r) => {
        save({ ...leagues, joined: [...leagues.joined, { code: r.code, memberId: newMemberId(), displayName: displayName.slice(0, 24) }] });
        return r.code;
      }),
    [request, save, leagues]
  );

  const join = useCallback(
    (code, displayName) =>
      request("GET", "/league/" + encodeURIComponent(code)).then(() => {
        if (!joinedLeague(code)) {
          save({ ...leagues, joined: [...leagues.joined, { code, memberId: newMemberId(), displayName: (displayName || "Player").slice(0, 24) }] });
        }
        return code;
      }),
    [request, save, leagues, joinedLeague]
  );

  const getStandings = useCallback((code) => request("GET", "/league/" + encodeURIComponent(code)), [request]);

  const submitBracket = useCallback(
    (code, bracketCode) => {
      const mine = joinedLeague(code);
      if (!mine) return Promise.reject({ offline: false });
      return request("POST", "/league/" + encodeURIComponent(code) + "/member", {
        memberId: mine.memberId,
        displayName: mine.displayName,
        bracket: bracketCode,
      });
    },
    [request, joinedLeague]
  );

  const submitGames = useCallback(
    (picks) => {
      if (!leagues.joined.length) return Promise.resolve(0);
      if (!api) return Promise.reject({ offline: true });
      return Promise.allSettled(
        leagues.joined.map((j) =>
          request("POST", "/league/" + encodeURIComponent(j.code) + "/games", { memberId: j.memberId, displayName: j.displayName, picks })
        )
      ).then((res) => res.filter((r) => r.status === "fulfilled").length);
    },
    [request, leagues, api]
  );

  const setApi = useCallback((u) => setApiState(u), []);

  // Test hook (smoke): window.__leagues
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__leagues = { setApi, get: () => leagues };
  }, [setApi, leagues]);

  const value = useMemo(
    () => ({ enabled, api, leagues, joinedLeague, create, join, getStandings, submitBracket, submitGames, setApi, lockState }),
    [enabled, api, leagues, joinedLeague, create, join, getStandings, submitBracket, submitGames, setApi]
  );

  return <LeaguesContext.Provider value={value}>{children}</LeaguesContext.Provider>;
}

export function useLeagues() {
  const ctx = useContext(LeaguesContext);
  if (!ctx) throw new Error("useLeagues must be used within <LeaguesProvider>");
  return ctx;
}
