"use client";

import { useEffect } from "react";
import { useData } from "../providers/DataProvider";
import { useCrumbs } from "../CrumbsContext";
import { useRoute } from "../RouteContext";
import { roundLabel, seasonSummary, formatRecord } from "@/lib/format";
import { teamColor } from "@/lib/team-colors";
import SeedBadge from "../../components/SeedBadge";
import Tbd from "../../components/Tbd";
import styles from "./TeamView.module.css";

export default function TeamView({ teamId }) {
  const { TOURNAMENT } = useData();
  const { set } = useCrumbs();
  const { navigate } = useRoute();
  const t = TOURNAMENT.teams[teamId];
  const site = TOURNAMENT.sites.find((s) => s.teams.indexOf(teamId) !== -1);

  useEffect(() => {
    if (!t) {
      navigate("#/");
      return;
    }
    const crumbs = [{ text: "Map", href: "#/" }];
    if (site) crumbs.push({ text: site.city + " " + roundLabel(TOURNAMENT.round), href: "#/r/" + site.id });
    crumbs.push({ text: t.name });
    set(crumbs, site ? "#/r/" + site.id : "#/");
  }, [t, site, set, navigate, TOURNAMENT.round]);

  if (!t) return null;
  const c = teamColor(teamId);

  const stats = [
    ["Record", formatRecord(t.record)],
    ["RPI", t.rpi],
    ["Nat. Seed", t.seed != null ? "No. " + t.seed : null],
    ["Runs", t.stats.runs],
    ["Runs Allowed", t.stats.runsAllowed],
    ["Batting Avg", t.stats.battingAvg],
    ["Team ERA", t.stats.era],
    ["Strength of Sched.", t.stats.sos],
  ];

  return (
    <section className="view">
      <div className={styles.hero} style={{ "--team": c.primary, "--team-ink": c.ink }}>
        <div className={styles.heroAccent} aria-hidden="true" />
        <SeedBadge national={t.seed != null ? t.seed : undefined} size="lg" />
        <div className={styles.heroBody}>
          <h1 className={styles.name}>{t.name}</h1>
          <div className={styles.sub}>
            {t.conference}
            {site ? " · " + site.city + " " + roundLabel(TOURNAMENT.round) : ""}
          </div>
        </div>
      </div>

      <div className="panel-title">2026 Season</div>
      <p className={styles.blurb}>
        {seasonSummary(t, site, TOURNAMENT.round)}
        {t.seasonNote ? " " + t.seasonNote : ""}
      </p>

      <div className="panel-title">Team Stats</div>
      <div className={styles.statGrid} data-testid="team-stats">
        {stats.map(([label, val]) => (
          <div key={label} className={`panel ${styles.stat}`}>
            <div className={styles.statLbl}>{label}</div>
            <div className={`${styles.statVal} tnum`}>
              <Tbd value={val} />
            </div>
          </div>
        ))}
      </div>

      <div className="panel-title">Key Players</div>
      <table className={styles.players}>
        <thead>
          <tr>
            <th>Pos</th>
            <th>Player</th>
            <th>Stat line</th>
          </tr>
        </thead>
        <tbody>
          {t.players.map((p, i) => (
            <tr key={i}>
              <td className={styles.pos}>
                <Tbd value={p.pos} />
              </td>
              <td>
                <Tbd value={p.name} />
              </td>
              <td className="tnum">
                <Tbd value={p.line} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="btn-row">
        <a className="btn primary" href={"#/s/" + teamId}>
          ⚾ Home Stadium &amp; About
        </a>
        {site && (
          <a className="btn" href={"#/r/" + site.id}>
            ← {site.city} {roundLabel(TOURNAMENT.round)}
          </a>
        )}
      </div>
    </section>
  );
}
