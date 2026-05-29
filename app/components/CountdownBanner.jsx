"use client";

import { useEffect, useState } from "react";
import styles from "./CountdownBanner.module.css";

/**
 * Pre-tournament cold-open banner: a live countdown to first pitch. Presentational
 * on purpose — it renders nothing unless given a real future `target` (epoch ms),
 * so it can never invent a clock. The caller decides when to show it (no live games
 * yet) and derives `target` from the published schedule.
 */
export default function CountdownBanner({ target, label }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (target == null || !isFinite(target)) return null;
  const diff = target - now;
  if (diff <= 0) return null; // first pitch reached — let the live strip take over

  return (
    <div className={styles.banner} role="status" aria-label={`First pitch in ${ariaParts(diff)}`}>
      <span className={styles.kicker}>Road to Omaha</span>
      <span className={styles.headline}>
        First pitch in <span className={styles.count}>{countParts(diff)}</span>
      </span>
      {label && <span className={styles.sub}>{label}</span>}
    </div>
  );
}

function units(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
  };
}

function countParts(ms) {
  const { d, h, m } = units(ms);
  const out = [];
  if (d) out.push(d + "d");
  if (d || h) out.push(h + "h");
  out.push(m + "m");
  return out.join(" ");
}

function ariaParts(ms) {
  const { d, h, m } = units(ms);
  const out = [];
  if (d) out.push(`${d} day${d === 1 ? "" : "s"}`);
  if (d || h) out.push(`${h} hour${h === 1 ? "" : "s"}`);
  out.push(`${m} minute${m === 1 ? "" : "s"}`);
  return out.join(", ");
}
