"use client";

import { useEffect, useState } from "react";
import { useData } from "../providers/DataProvider";
import { useGamePicks } from "../providers/GamePicksProvider";
import { useCrumbs } from "../CrumbsContext";
import { useRoute } from "../RouteContext";
import PageHeader from "../../components/PageHeader";
import LiveBadge from "../../components/LiveBadge";
import styles from "./ScheduleView.module.css";

// The tournament's fixed first weekend. Each day owns the regional double-elim
// games that fall on it (matchups resolve live; feeder labels until then).
const DAY_DEFS = [
  { key: "fri", weekday: "Fri", date: "May 29", full: "Friday, May 29", m: 4, d: 29, gnums: [1, 2] },
  { key: "sat", weekday: "Sat", date: "May 30", full: "Saturday, May 30", m: 4, d: 30, gnums: [3, 4] },
  { key: "sun", weekday: "Sun", date: "May 31", full: "Sunday, May 31", m: 4, d: 31, gnums: [5, 6] },
  { key: "mon", weekday: "Mon", date: "Jun 1", full: "Monday, June 1", m: 5, d: 1, gnums: [7] },
];
const SUPER_DAY = { key: "super", weekday: "Supers", date: "Super Regionals", full: "Super Regionals", m: null, d: null };
const FEEDER = { 3: ["G1 loser", "G2 loser"], 4: ["G1 winner", "G2 winner"], 5: ["G3 winner", "G4 loser"], 6: ["G4 winner", "G5 winner"], 7: ["G6 rematch", "if necessary"] };
const ELIM = { 3: true, 5: true };

function gameNum(key) {
  const m = key.match(/_G(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

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
  const byDay = { fri: [], sat: [], sun: [], mon: [], super: [] };
  games.forEach((g) => {
    if (g.round === "super") return byDay.super.push(g);
    const def = DAY_DEFS.find((x) => x.gnums.includes(gameNum(g.key)));
    if (def) byDay[def.key].push(g);
  });

  // Days shown in the strip (Super Regionals only once those games exist), each
  // stamped with a real calendar date so "today" can be selected by default.
  const days = [...DAY_DEFS, ...(byDay.super.length ? [SUPER_DAY] : [])].map((d) => ({
    ...d,
    dateMs: d.m == null ? null : new Date(2026, d.m, d.d).getTime(),
    count: byDay[d.key].length,
  }));

  const [selected, setSelected] = useState(() => defaultDayKey(days));
  const day = days.find((d) => d.key === selected) || days[0];

  // Selected day's games, ordered by first pitch (undetermined/no-time last).
  const list = byDay[day.key].slice().sort((a, b) => (a.startMs ?? Infinity) - (b.startMs ?? Infinity));

  const todayMs = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();

  const fridayTime = (g) => {
    const sid = g.key.split("_G")[0];
    const m = (SCHEDULES[sid] || []).find(
      (x) => (x.a[0] === g.teamA && x.b[0] === g.teamB) || (x.a[0] === g.teamB && x.b[0] === g.teamA)
    );
    return m ? m.time + " ET" : null;
  };
  // Time only — the day is already chosen, so no weekday prefix.
  const clock = (ms) => {
    try {
      return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return null;
    }
  };
  const timeFor = (g) => (g.startMs ? clock(g.startMs) || "TBD" : fridayTime(g) || "TBD");

  return (
    <section className="view">
      <PageHeader kicker="Tournament" title="Schedule" sub="Pick a day — games run in first-pitch order; tap a matchup to compare, a team for its page" />

      <div className={styles.tabs} role="tablist" aria-label="Schedule days" data-testid="schedule-tabs">
        {days.map((d) => {
          const isToday = d.dateMs === todayMs;
          const isPast = d.dateMs != null && d.dateMs < todayMs;
          return (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={d.key === day.key}
              className={`${styles.tab} ${d.key === day.key ? styles.tabOn : ""} ${isPast ? styles.tabPast : ""}`}
              data-testid="schedule-tab"
              data-day={d.key}
              onClick={() => setSelected(d.key)}
            >
              <span className={styles.tabWk}>{isToday ? "Today" : d.weekday}</span>
              <span className={styles.tabDate}>{d.date}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.dayHead}>{day.full}</div>

      {list.length ? (
        <div className={styles.rows} data-testid="schedule-day">
          {list.map((g) => (
            <ScheduleRow key={g.key} g={g} team={team} navigate={navigate} time={timeFor(g)} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No games scheduled for this day yet.</p>
      )}
    </section>
  );
}

// Default to today's day; else the most recent past day; else the first.
function defaultDayKey(days) {
  const now = Date.now();
  const todayMs = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const exact = days.find((d) => d.dateMs === todayMs);
  if (exact) return exact.key;
  let last = null;
  days.forEach((d) => {
    if (d.dateMs != null && d.dateMs <= now) last = d;
  });
  return (last || days[0]).key;
}

function ScheduleRow({ g, team, navigate, time }) {
  const determined = !!(g.teamA && g.teamB);
  const n = gameNum(g.key);
  const elim = ELIM[n];
  const open = determined ? () => navigate("#/vs/" + g.teamA + "/" + g.teamB) : null;
  const decided = g.state === "post" || g.state === "in";
  const showScore = decided && g.scoreA != null && g.scoreB != null;

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

      <div className={styles.match}>
        {determined ? (
          <>
            <TeamLine team={team(g.teamA)} score={showScore ? g.scoreA : null} win={g.winner === g.teamA} decided={decided} />
            <TeamLine team={team(g.teamB)} score={showScore ? g.scoreB : null} win={g.winner === g.teamB} decided={decided} />
          </>
        ) : (
          <span className={styles.feeder}>
            {FEEDER[n] ? `${FEEDER[n][0]} vs ${FEEDER[n][1]}` : "Matchup TBD"}
            {elim && <span className={styles.elim}>Elim</span>}
          </span>
        )}
      </div>

      <span className={styles.status}>
        {g.state === "post" ? <LiveBadge state="post" detail="Final" /> : g.state === "in" ? <LiveBadge state="in" /> : determined ? <span className={styles.cmp}>Compare ›</span> : null}
      </span>
    </div>
  );
}

function TeamLine({ team, score, win, decided }) {
  return (
    <div className={`${styles.tl} ${decided && win ? styles.win : ""} ${decided && !win ? styles.lose : ""}`}>
      <a href={"#/t/" + team.id} className={styles.tname}>
        {team.name}
      </a>
      {score != null && <span className={`${styles.sc} tnum`}>{score}</span>}
    </div>
  );
}
