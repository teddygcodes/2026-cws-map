"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Loads the canonical static data (data.js / photos.js / schedule.js / bracket.js)
 * from /public/legacy/ as window globals, then exposes them via useData().
 *
 * Why window globals instead of ESM imports: data.js is machine-maintained by
 * scripts/refresh-stats.mjs, which re-serializes it BYTE-FOR-BYTE and asserts that
 * form in CI (refresh:check) + rewrites it nightly. Adding `export` would break
 * that contract. Loading the unchanged files here keeps the serializer untouched.
 */

const DataContext = createContext(null);

const SOURCES = ["/legacy/data.js", "/legacy/photos.js", "/legacy/schedule.js", "/legacy/bracket.js"];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-cws-data="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", reject);
      }
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false; // preserve execution order
    el.dataset.cwsData = src;
    el.addEventListener("load", () => {
      el.dataset.loaded = "1";
      resolve();
    });
    el.addEventListener("error", reject);
    document.head.appendChild(el);
  });
}

function readGlobals() {
  if (typeof window === "undefined") return null;
  const { TOURNAMENT, STADIUM_PHOTOS, SCHEDULES, resolveBracket } = window;
  if (!TOURNAMENT || !resolveBracket) return null;
  return {
    TOURNAMENT,
    STADIUM_PHOTOS: STADIUM_PHOTOS || {},
    SCHEDULES: SCHEDULES || {},
    resolveBracket,
  };
}

export function DataProvider({ children }) {
  const [data, setData] = useState(() => readGlobals());

  useEffect(() => {
    if (data) return;
    let cancelled = false;
    Promise.all(SOURCES.map(loadScript))
      .then(() => {
        if (cancelled) return;
        const g = readGlobals();
        if (g) setData(g);
      })
      .catch(() => {
        /* leave splash visible; readGlobals stays null */
      });
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (!data) {
    return (
      <div className="boot-splash" role="status" aria-live="polite">
        <span className="boot-kicker">Road to Omaha</span>
        <span className="boot-dot" aria-hidden="true" />
        <span className="boot-msg">Loading the tournament…</span>
      </div>
    );
  }

  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within <DataProvider>");
  return ctx;
}
