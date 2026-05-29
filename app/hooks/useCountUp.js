"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tween a number from its previous value to the new one (ease-out cubic) so
 * scores/records roll up instead of snapping. Honors prefers-reduced-motion
 * (jumps straight to the target). Returns the current integer to display.
 */
export function useCountUp(target, duration = 450) {
  const [val, setVal] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = to;
    if (to == null || from == null || from === to) {
      setVal(to);
      return;
    }
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVal(to);
      return;
    }
    let raf;
    let start = null;
    const step = (now) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}
