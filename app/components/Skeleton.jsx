"use client";

import styles from "./Skeleton.module.css";

/** A single shimmering placeholder block. Compose into row/card skeletons. */
export default function Skeleton({ w = "100%", h = 14, r = 6, className = "", style }) {
  return <span className={`${styles.sk} ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

/** A card-shaped placeholder matching the matchup/score card footprint. */
export function SkeletonCard({ lines = 2 }) {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton w="40%" h={11} />
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={styles.cardRow}>
          <Skeleton w={32} h={32} r={8} />
          <Skeleton w="55%" h={14} />
          <Skeleton w={48} h={20} r={999} style={{ marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}
