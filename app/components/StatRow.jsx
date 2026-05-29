"use client";

import styles from "./StatRow.module.css";

/**
 * Comparison stat row: value A | centered label | value B, with the better side
 * highlighted and a subtle bar fill behind it. `better` is "a" | "b" | null.
 * `aFill`/`bFill` are 0..1 (relative magnitude) for the bar fills.
 */
export default function StatRow({ label, a, b, better = null, aFill = 0, bFill = 0 }) {
  return (
    <div className={styles.row} role="row">
      <div className={`${styles.val} ${styles.left} ${better === "a" ? styles.win : ""} tnum`} role="cell">
        <span className={styles.fill} style={{ width: pct(aFill) }} />
        <span className={styles.num}>{a}</span>
      </div>
      <div className={styles.label} role="rowheader">
        {label}
      </div>
      <div className={`${styles.val} ${styles.right} ${better === "b" ? styles.win : ""} tnum`} role="cell">
        <span className={styles.fill} style={{ width: pct(bFill) }} />
        <span className={styles.num}>{b}</span>
      </div>
    </div>
  );
}

function pct(v) {
  const n = Math.max(0, Math.min(1, v || 0));
  return (n * 100).toFixed(1) + "%";
}
