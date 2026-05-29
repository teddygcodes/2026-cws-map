"use client";

import styles from "./StandingsTable.module.css";

const MEDAL = ["🥇", "🥈", "🥉"];

/**
 * Sports leaderboard. rows: [{ name, value, pct, highlight }]. Top-3 get a
 * podium/medal treatment; the current user's row is highlighted.
 */
export default function StandingsTable({ rows, valueLabel = "Score", empty = "No entries yet." }) {
  if (!rows.length) {
    return <div className={styles.empty}>{empty}</div>;
  }
  return (
    <table className={`${styles.table} tnum`} data-testid="standings">
      <thead>
        <tr>
          <th className={styles.rank}>#</th>
          <th className={styles.player}>Player</th>
          <th>{valueLabel}</th>
          <th>Win%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={`${i < 3 ? styles["p" + i] : ""} ${r.highlight ? styles.me : ""}`}>
            <td className={styles.rank}>{i < 3 ? MEDAL[i] : i + 1}</td>
            <td className={styles.player}>{r.name}</td>
            <td className={styles.val}>{r.value}</td>
            <td className={styles.pct}>{r.pct}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
