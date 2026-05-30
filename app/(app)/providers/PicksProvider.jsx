"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { useLive } from "./LiveProvider";
import { useSession } from "./SessionProvider";
import {
  snapshotPickSites,
  emptyPicks,
  encodePicks,
  decodePicks,
  cleanupPicks,
  scoreBracketCode,
  supWinnerFor,
  champFor,
  regOf,
  supersFor,
} from "@/lib/picks";

const PICKS_KEY = "cws-picks-v1";
const PICKS_UPDATED_KEY = "cws-picks-updated-v1";
// Set once this browser has successfully pushed its picks to the cloud. Lets the
// initial sign-in sync tell "local edits that were never cloud-synced" (a brand
// new / anonymous device — server should win) apart from "local edits this
// account made here" (local may legitimately be newer). Prevents anonymous
// clicking on a 2nd device from clobbering the account's saved bracket.
const PICKS_SYNCED_KEY = "cws-picks-synced-v1";

const PicksContext = createContext(null);

function loadStoredPicks() {
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    if (!raw) return emptyPicks();
    const p = JSON.parse(raw);
    if (p && p.v === 1 && p.reg && p.sup) return { v: 1, reg: p.reg, sup: p.sup, cwsChamp: p.cwsChamp == null ? null : p.cwsChamp };
  } catch (e) {
    /* private mode / corrupt */
  }
  return emptyPicks();
}

export function PicksProvider({ children }) {
  const { TOURNAMENT, resolveBracket } = useData();
  const live = useLive();
  const { signedIn } = useSession();

  // Snapshot the ORIGINAL 16-site structure once, before any super-flip.
  const snap = useMemo(() => snapshotPickSites(TOURNAMENT.sites, TOURNAMENT.teams), [TOURNAMENT]);

  const [picks, setPicks] = useState(() => (typeof window === "undefined" ? emptyPicks() : loadStoredPicks()));
  const applyingRemote = useRef(false);
  const syncTimer = useRef(null);

  // Actual results for scoring (recomputed when the live feed updates).
  const results = useMemo(() => {
    const regChampById = {};
    snap.sites.forEach((s) => {
      regChampById[s.id] = resolveBracket(s.teams, (live.live.bySite && live.live.bySite[s.id]) || []).champion || null;
    });
    const superWinnerBySeed = {};
    for (let sd = 1; sd <= 8; sd++) {
      const ss = live.sites.find((x) => x.id === "super-" + sd);
      superWinnerBySeed[sd] = ss ? live.siteChampion(ss) : null;
    }
    return { regChampById, superWinnerBySeed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, resolveBracket, live.version]);

  const persist = useCallback(
    (next) => {
      setPicks(next);
      try {
        localStorage.setItem(PICKS_KEY, JSON.stringify(next));
        localStorage.setItem(PICKS_UPDATED_KEY, String(Date.now()));
      } catch (e) {
        /* ignore */
      }
      if (signedIn && !applyingRemote.current) syncPush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signedIn]
  );

  // ---- cloud sync (signed-in only; anonymous is localStorage-only) ----
  const localUpdatedAt = () => {
    try {
      const v = +localStorage.getItem(PICKS_UPDATED_KEY);
      return isFinite(v) ? v : 0;
    } catch (e) {
      return 0;
    }
  };
  const pushNow = useCallback(() => {
    if (!signedIn || applyingRemote.current) return;
    try {
      fetch("/api/picks", {
        method: "PUT",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bracketCode: encodePicks(picks, snap),
          gamePicks: readGamePicks(),
          updatedAt: localUpdatedAt() || Date.now(),
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          if (!res || res.error) return; // not-migrated / server-error: stay local-only
          // Adopt the server's authoritative timestamp so future comparisons use
          // one clock (not this device's), and record that we've synced at least once.
          try {
            if (res.updatedAt) localStorage.setItem(PICKS_UPDATED_KEY, String(res.updatedAt));
            localStorage.setItem(PICKS_SYNCED_KEY, "1");
          } catch (e) {
            /* ignore */
          }
        })
        .catch(() => {});
    } catch (e) {
      /* ignore */
    }
  }, [signedIn, picks, snap]);
  const syncPush = useCallback(() => {
    if (!signedIn || applyingRemote.current) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(pushNow, 800);
  }, [signedIn, pushNow]);

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/picks", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((srv) => {
        if (!srv) return;
        const serverEmpty = !srv.bracketCode && !(srv.gamePicks && Object.keys(srv.gamePicks).length);
        const localEmpty = !localStorage.getItem(PICKS_KEY) && !Object.keys(readGamePicks()).length;
        if (serverEmpty && !localEmpty) {
          pushNow();
          return;
        }
        if (serverEmpty) return;
        // Server has this account's picks. Apply them unless THIS device has
        // previously synced AND its local copy is strictly newer — otherwise a
        // fresh/anonymous device (which never pushed) would clobber the account's
        // saved bracket with whatever was clicked locally before signing in.
        const srvTs = srv.updatedAt || 0;
        const everSynced = localStorage.getItem(PICKS_SYNCED_KEY) === "1";
        const localIsNewer = everSynced && srvTs < localUpdatedAt();
        if (!localIsNewer) {
          applyingRemote.current = true;
          try {
            if (srv.bracketCode) {
              const p = decodePicks(srv.bracketCode, snap);
              if (p) {
                setPicks(p);
                localStorage.setItem(PICKS_KEY, JSON.stringify(p));
              }
            }
            window.dispatchEvent(new CustomEvent("cws-remote-gamepicks", { detail: srv.gamePicks || {} }));
            localStorage.setItem(PICKS_UPDATED_KEY, String(srvTs || Date.now()));
            localStorage.setItem(PICKS_SYNCED_KEY, "1");
          } finally {
            applyingRemote.current = false;
          }
        } else {
          pushNow();
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // ---- actions ----
  const setRegional = useCallback((siteId, teamId) => persist(cleanupPicks({ ...picks, reg: { ...picks.reg, [siteId]: teamId } }, snap)), [picks, snap, persist]);
  const setSuper = useCallback((sd, side) => persist(cleanupPicks({ ...picks, sup: { ...picks.sup, [sd]: side } }, snap)), [picks, snap, persist]);
  const setChamp = useCallback((sd) => persist({ ...picks, cwsChamp: sd }), [picks, persist]);
  const reset = useCallback(() => persist(emptyPicks()), [persist]);
  const loadFromCode = useCallback(
    (code) => {
      const p = decodePicks(code, snap);
      if (p) persist(p);
      return !!p;
    },
    [snap, persist]
  );

  // Test hook (smoke): window.__picks
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__picks = {
      encode: (p) => encodePicks(p || picks, snap),
      decode: (c) => decodePicks(c, snap),
      get: () => picks,
      set: (p) => persist(p),
    };
  }, [picks, snap, persist]);

  const value = useMemo(
    () => ({
      snap,
      picks,
      results,
      setRegional,
      setSuper,
      setChamp,
      reset,
      loadFromCode,
      encode: (p) => encodePicks(p || picks, snap),
      decode: (c) => decodePicks(c, snap),
      scoreCode: (code) => scoreBracketCode(code, snap, results),
      regOf: (p, sd) => regOf(p, sd, snap),
      supersFor: (p) => supersFor(p, snap),
      supWinnerFor: (p, sd) => supWinnerFor(p, sd, snap),
      champFor: (p) => champFor(p, snap),
    }),
    [snap, picks, results, setRegional, setSuper, setChamp, reset, loadFromCode]
  );

  return <PicksContext.Provider value={value}>{children}</PicksContext.Provider>;
}

function readGamePicks() {
  try {
    const raw = localStorage.getItem("cws-gamepicks-v1");
    const g = raw ? JSON.parse(raw) : null;
    return g && g.picks ? g.picks : {};
  } catch (e) {
    return {};
  }
}

export function usePicks() {
  const ctx = useContext(PicksContext);
  if (!ctx) throw new Error("usePicks must be used within <PicksProvider>");
  return ctx;
}
