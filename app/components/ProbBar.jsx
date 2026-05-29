"use client";

import styles from "./ProbBar.module.css";

/**
 * Kalshi-style implied win-probability split bar. Pcts are 0..1, derived from
 * real odds/seeds and explicitly labeled "implied" — never presented as fact.
 */
export default function ProbBar({ aPct, bPct, aLabel, bLabel, source = "implied" }) {
  if (aPct == null || bPct == null) return null;
  const a = Math.round(aPct * 100);
  const b = 100 - a;
  return (
    <div className={styles.wrap}>
      <div className={styles.heads}>
        <span className={styles.head}>
          <b className="tnum">{a}%</b> {aLabel}
        </span>
        <span className={styles.tag}>{source}</span>
        <span className={`${styles.head} ${styles.right}`}>
          {bLabel} <b className="tnum">{b}%</b>
        </span>
      </div>
      <div className={styles.bar} role="img" aria-label={`${aLabel} ${a}% implied, ${bLabel} ${b}% implied`}>
        <span className={styles.segA} style={{ width: a + "%" }} />
        <span className={styles.segB} style={{ width: b + "%" }} />
      </div>
    </div>
  );
}
