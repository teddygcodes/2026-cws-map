"use client";

import { useEffect, useState } from "react";
import { useData } from "../providers/DataProvider";
import { useGamePicks } from "../providers/GamePicksProvider";
import { useLeagues } from "../providers/LeaguesProvider";
import { useCrumbs } from "../CrumbsContext";
import MatchupCard from "../../components/MatchupCard";
import PickTray from "../../components/PickTray";
import PageHeader from "../../components/PageHeader";
import styles from "./GamesView.module.css";

export default function GamesView() {
  const { TOURNAMENT } = useData();
  const { games, gamePicks, setPick, classOf, localRecord } = useGamePicks();
  const leagues = useLeagues();
  const { set } = useCrumbs();
  const [submitMsg, setSubmitMsg] = useState(null);

  useEffect(() => {
    set([{ text: "Map", href: "#/" }, { text: "Games" }], "#/");
  }, [set]);

  const open = [];
  const liveLocked = [];
  const finals = [];
  const upcoming = [];
  games.forEach((g) => {
    const c = classOf(g);
    if (c === "open") open.push(g);
    else if (c === "upcoming") upcoming.push(g);
    else if (g.state === "post") finals.push(g);
    else liveLocked.push(g);
  });

  const rec = localRecord();
  const made = Object.keys(gamePicks.picks).length;

  const submit = () => {
    leagues.submitGames(gamePicks.picks).then(
      (n) => setSubmitMsg(n ? "Submitted ✓" : "Couldn't submit"),
      () => setSubmitMsg("Couldn't submit")
    );
  };

  return (
    <section className="view">
      <PageHeader kicker="Daily" title="Pick'em" sub="Pick every game as it unlocks · build a W–L record · locked at first pitch" />
      <div className="unofficial-banner">⚠ Predictions only — unofficial. Picks lock at each game&apos;s first pitch.</div>

      <div className={styles.layout}>
        <div className={styles.feed}>
          <Section title="Open — pick now" list={open} mode="open" gamePicks={gamePicks} setPick={setPick} TOURNAMENT={TOURNAMENT} />
          <Section title="In progress / locked" list={liveLocked} mode="locked" gamePicks={gamePicks} setPick={setPick} TOURNAMENT={TOURNAMENT} />
          <Section title="Final" list={finals} mode="final" gamePicks={gamePicks} setPick={setPick} TOURNAMENT={TOURNAMENT} />
          <Section title="Upcoming — matchup TBD" list={upcoming} mode="upcoming" gamePicks={gamePicks} setPick={setPick} TOURNAMENT={TOURNAMENT} />
          {!open.length && !liveLocked.length && !finals.length && (
            <div className={styles.empty}>No games are open yet — the tournament hasn&apos;t started. Check back at first pitch (May 29).</div>
          )}
        </div>

        <div className={styles.side}>
          <PickTray
            heroValue={rec.decided ? `${rec.wins}–${rec.losses}` : "—"}
            heroLabel="Your record (preview)"
            count={`${made} pick${made === 1 ? "" : "s"} made`}
            primary={
              leagues.leagues.joined.length
                ? { label: submitMsg || "Submit to my league" + (leagues.leagues.joined.length > 1 ? "s" : ""), onClick: submit }
                : { label: "Create or join a league →", href: "#/league" }
            }
            note="Preview record can't verify the first-pitch lock — submit to a league for officially-timed scoring."
          />
        </div>
      </div>
    </section>
  );
}

function Section({ title, list, mode, gamePicks, setPick, TOURNAMENT }) {
  if (!list.length) return null;
  return (
    <div className={styles.sec}>
      <div className={styles.secHead}>
        {title} <span className={styles.count}>{list.length}</span>
      </div>
      <div className={styles.grid}>
        {list.map((g) => {
          if (mode === "upcoming") {
            return (
              <div key={g.key} className={styles.tbdCard}>
                <span className={styles.tbdLabel}>{g.label}</span>
                <span className={styles.tbdMatch}>Matchup TBD</span>
              </div>
            );
          }
          const picked = gamePicks.picks[g.key] || null;
          let resultBadge = null;
          if (mode === "final" && g.winner) {
            resultBadge = !picked ? (
              <span className={`${styles.badge} ${styles.badgePending}`}>no pick</span>
            ) : picked === g.winner ? (
              <span className={`${styles.badge} ${styles.badgeOk}`}>✓ correct</span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeNo}`}>✗</span>
            );
          } else if (picked) {
            resultBadge = <span className={`${styles.badge} ${styles.badgePending}`}>your pick</span>;
          }
          return (
            <MatchupCard
              key={g.key}
              a={g.teamA}
              b={g.teamB}
              label={g.label}
              state={g.state}
              detail={mode === "open" ? undefined : mode === "final" ? "Final" : g.state === "in" ? "Live" : "Locked"}
              startMs={g.startMs}
              odds={g.odds}
              winner={g.winner}
              picked={picked}
              onPick={mode === "open" ? (id) => setPick(g.key, id) : null}
              resultBadge={resultBadge}
              compareHref={"#/vs/" + g.teamA + "/" + g.teamB}
            />
          );
        })}
      </div>
    </div>
  );
}
