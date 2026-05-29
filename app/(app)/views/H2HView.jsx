"use client";

import { useEffect } from "react";
import { useData } from "../providers/DataProvider";
import { usePicks } from "../providers/PicksProvider";
import { useCrumbs } from "../CrumbsContext";
import styles from "./H2HView.module.css";

export default function H2HView({ a, b }) {
  const { TOURNAMENT } = useData();
  const { snap, results, decode, regOf, supWinnerFor, champFor } = usePicks();
  const { set } = useCrumbs();
  const team = (id) => TOURNAMENT.teams[id];
  const nm = (id) => (id ? team(id).name : "—");

  useEffect(() => {
    set([{ text: "Map", href: "#/" }, { text: "Bracket", href: "#/bracket" }, { text: "Head-to-Head" }], "#/bracket");
  }, [set]);

  const pa = decode(a);
  const pb = decode(b);
  if (!pa || !pb) {
    return (
      <section className="view">
        <h1 className="section-head">Head-to-Head</h1>
        <div className="unofficial-banner">One of those bracket links is invalid.</div>
        <div className="btn-row">
          <a className="btn primary" href="#/picks">
            ← Back to my picks
          </a>
        </div>
      </section>
    );
  }

  const rows = [];
  for (let sd = 1; sd <= 16; sd++) {
    const s = snap.bySeed[sd];
    if (!s) continue;
    rows.push({ label: s.city.split(",")[0] + " Regional", ta: regOf(pa, sd), tb: regOf(pb, sd), actual: results.regChampById[s.id] });
  }
  for (let sd = 1; sd <= 8; sd++) {
    rows.push({ label: "Super Regional " + sd, ta: supWinnerFor(pa, sd), tb: supWinnerFor(pb, sd), actual: results.superWinnerBySeed[sd] });
  }
  rows.push({ label: "CWS Champion", ta: champFor(pa), tb: champFor(pb), actual: TOURNAMENT.omahaChampion || null });

  return (
    <section className="view">
      <h1 className="section-head">Head-to-Head</h1>
      <div className="section-sub">Your bracket vs. a friend&apos;s · ✓ marks the correct pick once a result is in</div>
      <div className="unofficial-banner">⚠ Predictions only — unofficial, not real results.</div>

      <table className={styles.table} data-testid="h2h-table">
        <thead>
          <tr>
            <th>You</th>
            <th className={styles.slot}>Round</th>
            <th>Friend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const aw = r.actual && r.ta === r.actual;
            const bw = r.actual && r.tb === r.actual;
            return (
              <tr key={i}>
                <td className={aw ? styles.win : ""}>
                  {nm(r.ta)} {aw && "✓"}
                </td>
                <td className={styles.slot}>{r.label}</td>
                <td className={bw ? styles.win : ""}>
                  {nm(r.tb)} {bw && "✓"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="btn-row">
        <a className="btn primary" href="#/picks">
          ← Back to my picks
        </a>
      </div>
    </section>
  );
}
