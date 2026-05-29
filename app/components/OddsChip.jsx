"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./OddsChip.module.css";

/**
 * Moneyline pill (e.g. -180 / +140). Favorite tinted money-green. Flashes
 * green/red briefly when the line moves (prevMl differs). Honesty: no posted
 * line → "Not posted yet" (never a fabricated number).
 */
export default function OddsChip({ ml, favorite = false, prevMl = null, size = "md" }) {
  const [flash, setFlash] = useState(null);
  const seen = useRef(prevMl);

  useEffect(() => {
    if (ml == null) return;
    if (seen.current != null && seen.current !== ml) {
      const up = numeric(ml) > numeric(seen.current);
      setFlash(up ? "up" : "down");
      const id = setTimeout(() => setFlash(null), 900);
      seen.current = ml;
      return () => clearTimeout(id);
    }
    seen.current = ml;
  }, [ml]);

  if (ml == null) {
    return <span className={`${styles.chip} ${styles.none} ${styles[size]}`}>Not posted yet</span>;
  }
  return (
    <span
      className={`${styles.chip} ${styles[size]} ${favorite ? styles.fav : ""} ${flash ? styles["flash-" + flash] : ""} tnum`}
      title={favorite ? "Favorite" : "Underdog"}
    >
      {favorite && <span className={styles.dot} aria-hidden="true" />}
      {String(ml)}
    </span>
  );
}

function numeric(ml) {
  const n = parseInt(String(ml).replace(/[^0-9+-]/g, ""), 10);
  return isFinite(n) ? n : 0;
}
