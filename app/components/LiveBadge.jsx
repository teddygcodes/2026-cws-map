"use client";

import styles from "./LiveBadge.module.css";

/** Live status pill: pulsing LIVE (+ detail), FINAL, or UPCOMING (time). */
export default function LiveBadge({ state, detail, time }) {
  if (state === "in") {
    return (
      <span className={`${styles.badge} ${styles.live}`}>
        <span className={styles.dot} aria-hidden="true" />
        LIVE{detail ? <span className={styles.detail}>{detail}</span> : null}
      </span>
    );
  }
  if (state === "post") {
    return <span className={`${styles.badge} ${styles.final}`}>{detail || "Final"}</span>;
  }
  return <span className={`${styles.badge} ${styles.pre}`}>{detail || time || "Upcoming"}</span>;
}
