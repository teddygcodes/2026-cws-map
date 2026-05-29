"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "../providers/DataProvider";
import { useCrumbs } from "../CrumbsContext";
import { formatRecord } from "@/lib/format";
import { teamColor, teamMonogram } from "@/lib/team-colors";
import PageHeader from "../../components/PageHeader";
import Segmented from "../../components/Segmented";
import Tbd from "../../components/Tbd";
import styles from "./RankingsView.module.css";

const MODES = [
  { value: "seeds", label: "National Seeds" },
  { value: "rpi", label: "By RPI" },
];

/**
 * The field at a glance — the 16 national seeds, or every team by RPI. Surfaces
 * data that previously only existed as seed badges; gives a no-league user a
 * real ranked view. Honesty-safe: only teams with a verified value are ranked.
 */
export default function RankingsView() {
  const { TOURNAMENT } = useData();
  const { set } = useCrumbs();
  const [mode, setMode] = useState("seeds");

  useEffect(() => {
    set([{ text: "Home", href: "#/" }, { text: "Rankings" }], "#/");
  }, [set]);

  const rows = useMemo(() => {
    const arr = Object.values(TOURNAMENT.teams);
    if (mode === "seeds") {
      return arr
        .filter((t) => t.seed != null)
        .sort((a, b) => a.seed - b.seed)
        .map((t) => ({ t, rank: t.seed }));
    }
    return arr
      .filter((t) => typeof t.rpi === "number")
      .sort((a, b) => a.rpi - b.rpi)
      .map((t, i) => ({ t, rank: i + 1 }));
  }, [TOURNAMENT, mode]);

  return (
    <section className="view">
      <PageHeader kicker="The Field" title="Rankings" sub={mode === "seeds" ? "The 16 national seeds" : `All ${rows.length} teams by RPI`} />
      <div className={styles.toggleRow}>
        <Segmented options={MODES} value={mode} onChange={setMode} ariaLabel="Ranking type" />
      </div>
      <table className={`${styles.table} tnum`} data-testid="rankings">
        <thead>
          <tr>
            <th scope="col" className={styles.rank}>
              #
            </th>
            <th scope="col" className={styles.teamCol}>
              Team
            </th>
            <th scope="col" className={styles.confCol}>
              Conf
            </th>
            <th scope="col">Record</th>
            <th scope="col">RPI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ t, rank }) => {
            const c = teamColor(t.id);
            return (
              <tr key={t.id}>
                <td className={styles.rank}>{rank}</td>
                <td className={styles.teamCol}>
                  <a className={styles.team} href={"#/t/" + t.id}>
                    <span className={styles.mono} style={{ background: c.primary, color: c.ink }} aria-hidden="true">
                      {teamMonogram(t.name)}
                    </span>
                    <span className={styles.teamName}>{t.name}</span>
                  </a>
                </td>
                <td className={styles.confCol}>{t.conference}</td>
                <td>{formatRecord(t.record) || <Tbd value={null} />}</td>
                <td>
                  <Tbd value={t.rpi} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
