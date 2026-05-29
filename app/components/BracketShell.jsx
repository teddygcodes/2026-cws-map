"use client";

import { useState } from "react";
import Segmented from "./Segmented";
import styles from "./BracketShell.module.css";

/**
 * Shared bracket layout used by the national bracket (view) and the bracket
 * challenge (edit). Desktop: connected columns (Regionals → Supers → CWS).
 * Mobile: a round STEPPER showing one stage at a time — replaces the old
 * horizontal-scroll-and-clip behaviour.
 *
 * stages: [{ key, title, short?, content }]
 */
export default function BracketShell({ stages, initial }) {
  const [active, setActive] = useState(initial || stages[0].key);
  return (
    <>
      <div className={styles.stepper}>
        <Segmented
          options={stages.map((s) => ({ value: s.key, label: s.short || s.title }))}
          value={active}
          onChange={setActive}
          ariaLabel="Bracket round"
          size="sm"
        />
      </div>
      <div className={styles.scroll}>
        <div className={styles.cols}>
          {stages.map((s) => (
            <div key={s.key} className={`${styles.col} ${active === s.key ? styles.colActive : ""}`} data-stage={s.key}>
              <div className={styles.colTitle}>{s.title}</div>
              {s.content}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
