"use client";

import styles from "./SeedBadge.module.css";

/**
 * Seed chip. `national` shows "N · NAT" (gold for top-8 national seeds);
 * `regional` shows the 1–4 regional seed. Renders an em-dash chip when unseeded.
 */
export default function SeedBadge({ national, regional, size = "md" }) {
  if (national != null) {
    const gold = national <= 8;
    return (
      <span className={`${styles.chip} ${styles.national} ${gold ? styles.gold : ""} ${styles[size]} tnum`} title={`National No. ${national} seed`}>
        {national}
        <small>NAT</small>
      </span>
    );
  }
  if (regional != null) {
    return (
      <span className={`${styles.chip} ${styles.regional} ${styles[size]} tnum`} title={`Regional No. ${regional} seed`}>
        {regional}
      </span>
    );
  }
  return <span className={`${styles.chip} ${styles.none} ${styles[size]}`} aria-label="Unseeded">–</span>;
}
