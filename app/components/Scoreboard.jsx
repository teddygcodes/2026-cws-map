"use client";

import { useData } from "../(app)/providers/DataProvider";
import { useLive } from "../(app)/providers/LiveProvider";
import { useRoute } from "../(app)/RouteContext";
import { dateLabel, timeAgo } from "@/lib/format";
import styles from "./Scoreboard.module.css";

/** Premium live-scores ticker: auto-advancing score cards, LIVE pulses,
    FINAL/UPCOMING states, plus the clearly-labeled "Simulate a live game". */
export default function Scoreboard() {
  const { TOURNAMENT } = useData();
  const live = useLive();
  const { navigate } = useRoute();
  const L = live.live;

  let games = L.list.slice();
  if (L.demo) games = [L.demo].concat(games);
  const liveCount = games.filter((g) => g.state === "in" || g.demo).length;
  const teamName = (c) => (c.id && TOURNAMENT.teams[c.id] ? TOURNAMENT.teams[c.id].name : c.name);

  const onCard = (g) => {
    if (g.state === "pre" && g.comps[0].id && g.comps[1].id) navigate("#/vs/" + g.comps[0].id + "/" + g.comps[1].id);
    else navigate("#/g/" + g.id);
  };

  return (
    <div className={styles.board} data-testid="scoreboard">
      <div className={styles.head}>
        <span className={styles.title}>
          {liveCount > 0 && <span className={styles.dot} />}
          {liveCount > 0 ? "Live Scores" : "Scores"}
        </span>
        <span className={styles.meta}>
          {!L.updated
            ? "Loading…"
            : games.length
            ? `${dateLabel(L.activeDate)}${liveCount ? " · " + liveCount + " live" : ""} · updated ${timeAgo(L.updated)}`
            : "Updated " + timeAgo(L.updated)}
        </span>
        <button
          className={styles.demoBtn}
          onClick={() => (L.demo ? live.stopDemo() : live.startDemo())}
          data-demo={L.demo ? "stop" : "start"}
        >
          {L.demo ? "■ Stop demo" : "▶ Simulate a live game"}
        </button>
      </div>

      {L.simAll && <div className={styles.simBanner}>⚠ Simulation mode — not real results</div>}

      {games.length ? (
        <div className={styles.rail}>
          {games.map((g) => {
            const a = g.comps[0];
            const b = g.comps[1];
            const show = g.demo || g.state === "in" || g.state === "post";
            const both = show && a.score != null && b.score != null;
            return (
              <button key={g.id} className={`${styles.card} ${g.demo ? styles.demo : ""}`} onClick={() => onCard(g)}>
                {g.demo && <span className={styles.simTag}>SIM</span>}
                <div className={styles.status}>
                  {g.state === "in" || g.demo ? (
                    <>
                      {!g.demo && <span className={styles.dot} />}
                      <span className={styles.live}>LIVE</span> {g.detail || ""}
                    </>
                  ) : g.state === "post" ? (
                    <span className={styles.final}>{g.detail || "Final"}</span>
                  ) : (
                    g.detail || "Upcoming"
                  )}
                </div>
                {[a, b].map((c, i) => {
                  const lead = both && a.score !== b.score && c.score === Math.max(a.score, b.score);
                  return (
                    <div key={i} className={`${styles.team} ${lead ? styles.teamLead : ""}`}>
                      <span className={styles.tn}>{teamName(c)}</span>
                      <span className={`${styles.sc} tnum`}>{show && c.score != null ? c.score : ""}</span>
                    </div>
                  );
                })}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          {L.updated ? "No games yet — first pitch Friday, May 29. Scores appear here automatically." : "Loading scores…"}
        </div>
      )}
    </div>
  );
}
