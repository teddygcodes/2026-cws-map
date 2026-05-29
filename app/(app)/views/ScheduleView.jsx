"use client";

import { useEffect } from "react";
import { useData } from "../providers/DataProvider";
import { useGamePicks } from "../providers/GamePicksProvider";
import { useCrumbs } from "../CrumbsContext";
import { useRoute } from "../RouteContext";
import { fmtGameTime } from "@/lib/format";
import PageHeader from "../../components/PageHeader";
import LiveBadge from "../../components/LiveBadge";
import styles from "./ScheduleView.module.css";

// Structural day of each regional double-elim game (matchups resolve live).
const DAY_OF = { 1: "Friday, May 29", 2: "Friday, May 29", 3: "Saturday, May 30", 4: "Saturday, May 30", 5: "Sunday, May 31", 6: "Sunday, May 31", 7: "Monday, June 1" };
const FEEDER = { 3: ["G1 loser", "G2 loser"], 4: ["G1 winner", "G2 winner"], 5: ["G3 winner", "G4 loser"], 6: ["G4 winner", "G5 winner"], 7: ["G6 rematch", "if necessary"] };
const ELIM = { 3: true, 5: true };
const DAY_ORDER = ["Friday, May 29", "Saturday, May 30", "Sunday, May 31", "Monday, June 1", "Super Regionals"];

export default function ScheduleView() {
  const { TOURNAMENT, SCHEDULES } = useData();
  const { games } = useGamePicks();
  const { set } = useCrumbs();
  const { navigate } = useRoute();
  const team = (id) => TOURNAMENT.teams[id];

  useEffect(() => {
    set([{ text: "Home", href: "#/" }, { text: "Schedule" }], "#/");
  }, [set]);

  // Bucket every game into its day.
  const buckets = {};
  DAY_ORDER.forEach((d) => (buckets[d] = []));
  games.forEach((g) => {
    const day = g.round === "super" ? "Super Regionals" : DAY_OF[gameNum(g.key)] || "Super Regionals";
    buckets[day].push(g);
  });

  const fridayTime = (g) => {
    const sid = g.key.split("_G")[0];
    const m = (SCHEDULES[sid] || []).find(
      (x) => (x.a[0] === g.teamA && x.b[0] === g.teamB) || (x.a[0] === g.teamB && x.b[0] === g.teamA)
    );
    return m ? m.time + " ET" : null;
  };
  const timeFor = (g) => (g.startMs ? fmtGameTime(g.startMs) : fridayTime(g) || "Time TBD");

  return (
    <section className="view">
      <PageHeader kicker="Tournament" title="Schedule" sub="Every game, by day — tap a matchup to compare, a team to open its page" />
      {DAY_ORDER.map((day) => {
        const list = buckets[day];
        if (!list || !list.length) return null;
        return (
          <div key={day} className={styles.day}>
            <div className={styles.dayHead}>
              {day} <span className={styles.dayCount}>{list.length}</span>
            </div>
            <div className={styles.rows} data-testid="schedule-day">
              {list.map((g) => (
                <ScheduleRow key={g.key} g={g} team={team} navigate={navigate} time={timeFor(g)} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function gameNum(key) {
  const m = key.match(/_G(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

function ScheduleRow({ g, team, navigate, time }) {
  const determined = !!(g.teamA && g.teamB);
  const n = gameNum(g.key);
  const elim = ELIM[n];
  const open = determined ? () => navigate("#/vs/" + g.teamA + "/" + g.teamB) : null;

  const onClick = open
    ? (e) => {
        if (e.target.closest("a")) return; // let team-name links through
        open();
      }
    : undefined;
  const onKeyDown = open
    ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }
    : undefined;

  return (
    <div
      className={`${styles.row} ${open ? styles.click : ""} ${determined ? "" : styles.tbd}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={open ? "button" : undefined}
      tabIndex={open ? 0 : undefined}
      aria-label={open ? `Compare ${team(g.teamA).name} vs ${team(g.teamB).name}` : undefined}
      data-testid="schedule-row"
    >
      <span className={`${styles.time} tnum`}>{time}</span>
      <span className={styles.label}>
        {g.label}
        {elim && <span className={styles.elim}>Elim</span>}
      </span>
      <span className={styles.match}>
        {determined ? (
          <>
            <a href={"#/t/" + g.teamA} className={styles.tname}>
              {team(g.teamA).name}
            </a>
            <span className={styles.vs}>vs</span>
            <a href={"#/t/" + g.teamB} className={styles.tname}>
              {team(g.teamB).name}
            </a>
          </>
        ) : (
          <span className={styles.feeder}>{FEEDER[n] ? `${FEEDER[n][0]} vs ${FEEDER[n][1]}` : "Matchup TBD"}</span>
        )}
      </span>
      <span className={styles.status}>
        {g.state === "post" ? <LiveBadge state="post" detail="Final" /> : g.state === "in" ? <LiveBadge state="in" /> : determined ? <span className={styles.cmp}>Compare ›</span> : null}
      </span>
    </div>
  );
}
