"use client";

import styles from "./Segmented.module.css";

/**
 * One segmented control for the whole app (Home Hub/Map/List, Regional
 * List/Bracket, League Bracket/Daily). Keyboard + aria-pressed; each option
 * exposes `data-seg="<value>"` as a stable test/automation hook.
 */
export default function Segmented({ options, value, onChange, ariaLabel, size = "md" }) {
  return (
    <div className={`${styles.seg} ${styles[size]}`} role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            className={`${styles.opt} ${on ? styles.on : ""}`}
            aria-pressed={on}
            data-seg={o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
