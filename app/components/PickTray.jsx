"use client";

import styles from "./PickTray.module.css";

/**
 * The FanDuel-signature betslip: a persistent tray (bottom sheet on mobile,
 * side rail on desktop) showing a hero record stat, a count line, an optional
 * streak, and a confident primary action.
 */
export default function PickTray({ heroValue, heroLabel, heroTone = "up", count, streak, primary, secondary, note }) {
  return (
    <aside className={styles.tray} data-testid="pick-tray">
      <div className={styles.hero}>
        <span className={`${styles.heroVal} ${styles["tone-" + heroTone]} tnum`}>{heroValue}</span>
        <span className={styles.heroLbl}>{heroLabel}</span>
      </div>
      <div className={styles.rows}>
        {count != null && <div className={styles.row}>{count}</div>}
        {streak != null && (
          <div className={styles.row}>
            Streak <b className="tnum">{streak}</b>
          </div>
        )}
      </div>
      <div className={styles.actions}>
        {primary &&
          (primary.href ? (
            <a className="btn primary" href={primary.href}>
              {primary.label}
            </a>
          ) : (
            <button className="btn primary" onClick={primary.onClick} disabled={primary.disabled} data-testid="tray-submit">
              {primary.label}
            </button>
          ))}
        {secondary &&
          secondary.map((s, i) =>
            s.href ? (
              <a key={i} className="btn" href={s.href}>
                {s.label}
              </a>
            ) : (
              <button key={i} className="btn" onClick={s.onClick}>
                {s.label}
              </button>
            )
          )}
      </div>
      {note && <div className={styles.note}>{note}</div>}
    </aside>
  );
}
