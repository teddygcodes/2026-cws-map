"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hash-based routing (preserves every shareable URL from the legacy app):
 *   #/  #/r/:site  #/t/:team  #/s/:team  #/g/:eventId  #/vs/:a/:b
 *   #/bracket  #/picks (+/:code)  #/h2h/:a/:b  #/games  #/league (+/:code)
 *
 * Returns { hash, parts, prevHash, navigate, back }. `prevHash` tracks the page
 * shown before the current one (ignoring self-transitions from live re-renders)
 * so views with an ambiguous parent (compare, game) can send "back" correctly —
 * mirrors the legacy navPrevHash/navCurHash.
 */
export function useHashRoute() {
  const read = () => (typeof window === "undefined" ? "#/" : window.location.hash || "#/");
  const [hash, setHash] = useState(read);
  const curRef = useRef(read());
  const prevRef = useRef("#/");

  useEffect(() => {
    const onChange = () => {
      const next = window.location.hash || "#/";
      if (next !== curRef.current) {
        prevRef.current = curRef.current;
        curRef.current = next;
      }
      setHash(next);
    };
    // `load` may already have fired under next/script; sync immediately.
    onChange();
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((h) => {
    if (typeof window !== "undefined") window.location.hash = h;
  }, []);

  const back = useCallback(
    (fallback) => {
      navigate(fallback || prevRef.current || "#/");
    },
    [navigate]
  );

  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { hash, parts, prevHash: prevRef.current, navigate, back };
}
