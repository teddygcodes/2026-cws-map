"use client";

import { useEffect, useState } from "react";
import { useData } from "../providers/DataProvider";
import { useLive } from "../providers/LiveProvider";
import { useCrumbs } from "../CrumbsContext";
import { parseSummary } from "@/lib/live-parse";
import { teamColor, teamMonogram } from "@/lib/team-colors";
import Tbd from "../../components/Tbd";
import styles from "./GameView.module.css";

export default function GameView({ eventId }) {
  const { TOURNAMENT } = useData();
  const live = useLive();
  const { set } = useCrumbs();
  const [game, setGame] = useState(null);
  const [error, setError] = useState(false);

  const isDemo = eventId === "demo";

  useEffect(() => {
    set([{ text: "Map", href: "#/" }, { text: "Game" }], "#/");
  }, [set]);

  // Demo game updates live from the LiveProvider's simulator.
  useEffect(() => {
    if (!isDemo) return;
    setGame(live.demoSummary());
  }, [isDemo, live.version, live]);

  // Real game: fetch the ESPN summary, then re-fetch on each 30s poll tick.
  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    setError(false);
    fetch(live.espnBase + "/summary?event=" + encodeURIComponent(eventId), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setGame(parseSummary(d, eventId, live.fieldNorm));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, isDemo, live.espnBase, live.fieldNorm, live.version]);

  if (error) {
    return (
      <section className="view">
        <h1 className="section-head">Game</h1>
        <p className={styles.note}>Couldn&apos;t load this game right now.</p>
        <div className="btn-row">
          <a className="btn" href="#/">
            ← Back to scores
          </a>
        </div>
      </section>
    );
  }
  if (!game || game.teams.length < 2) {
    return (
      <section className="view">
        <h1 className="section-head">Game</h1>
        <p className={styles.note}>{isDemo ? "No simulated game running." : "Loading box score…"}</p>
      </section>
    );
  }

  const [a, b] = game.teams;
  const nInn = Math.max(a.innings.length, b.innings.length, 9);
  const hasInn = a.innings.concat(b.innings).some((v) => v != null);
  const teamName = (t) => (t.id && TOURNAMENT.teams[t.id] ? TOURNAMENT.teams[t.id].name : t.name);
  const regionalSite =
    a.id && b.id ? TOURNAMENT.sites.find((s) => s.teams.indexOf(a.id) >= 0 && s.teams.indexOf(b.id) >= 0) : null;

  return (
    <section className="view">
      <h1 className="sr-only" tabIndex={-1} data-view-heading>
        {teamName(a)} vs {teamName(b)} — {game.detail || (game.state === "post" ? "Final" : game.state === "in" ? "Live" : "Upcoming")}
      </h1>
      {/* Broadcast scorebug */}
      <div className={`${styles.bug} ${game.state === "in" ? styles.bugLive : ""}`}>
        <ScoreSide team={a} name={teamName(a)} lead={a.score != null && b.score != null && a.score > b.score} />
        <div className={styles.bugMid}>
          {game.state === "in" ? (
            <span className={styles.bugStatusLive}>
              <span className={styles.dot} /> {game.detail || "Live"}
            </span>
          ) : (
            <span className={styles.bugStatus}>{game.detail || (game.state === "post" ? "Final" : "Upcoming")}</span>
          )}
          {game.demo && <span className={styles.simTag}>SIM</span>}
        </div>
        <ScoreSide team={b} name={teamName(b)} lead={a.score != null && b.score != null && b.score > a.score} right />
      </div>

      {/* Live situation strip */}
      {game.situation && game.state === "in" && (
        <div className={styles.situation}>
          <div className={styles.sitCol}>
            <div className={`${styles.sitV} tnum`}>
              {game.situation.balls ?? 0}–{game.situation.strikes ?? 0}
            </div>
            <div className={styles.sitL}>Count</div>
          </div>
          <div className={styles.sitCol}>
            <div className={styles.outs}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`${styles.odot} ${i < (game.situation.outs || 0) ? styles.odotOn : ""}`} />
              ))}
            </div>
            <div className={styles.sitL}>Outs</div>
          </div>
          <div className={styles.diamond} data-testid="diamond">
            <span className={`${styles.base} ${styles.second} ${game.situation.second ? styles.baseOn : ""}`} />
            <span className={`${styles.base} ${styles.third} ${game.situation.third ? styles.baseOn : ""}`} />
            <span className={`${styles.base} ${styles.first} ${game.situation.first ? styles.baseOn : ""}`} />
          </div>
          <div className={styles.sitBp}>
            {game.situation.batter && (
              <div>
                <span className={styles.sitL}>AB</span> {game.situation.batter}
              </div>
            )}
            {game.situation.pitcher && (
              <div>
                <span className={styles.sitL}>P</span> {game.situation.pitcher}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Linescore */}
      <div className="panel-title">Linescore</div>
      <div className={styles.lineWrap}>
        <table className={`${styles.line} tnum`}>
          <thead>
            <tr>
              <th className={styles.teamCol}>Team</th>
              {hasInn && Array.from({ length: nInn }, (_, i) => <th key={i}>{i + 1}</th>)}
              <th className={styles.rhe}>R</th>
              <th>H</th>
              <th>E</th>
            </tr>
          </thead>
          <tbody>
            {[a, b].map((t, ti) => (
              <tr key={ti}>
                <td className={styles.teamCol}>
                  {t.id && TOURNAMENT.teams[t.id] ? <a href={"#/t/" + t.id}>{teamName(t)}</a> : t.name}
                </td>
                {hasInn && Array.from({ length: nInn }, (_, i) => <td key={i}>{t.innings[i] == null ? "" : t.innings[i]}</td>)}
                <td className={styles.rhe}>{t.score == null ? "-" : t.score}</td>
                <td>{t.hits == null ? "-" : t.hits}</td>
                <td>{t.errors == null ? "-" : t.errors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scoring plays */}
      {game.scoringPlays && game.scoringPlays.length > 0 && (
        <>
          <div className="panel-title">Scoring Plays</div>
          <div className={styles.plays}>
            {game.scoringPlays.map((p, i) => (
              <div key={i} className={styles.play}>
                <span className={styles.pinn}>{p.inn}</span>
                <span className={styles.ptext}>{p.text}</span>
                <span className={`${styles.pscore} tnum`}>
                  {p.away == null ? "" : p.away}–{p.home == null ? "" : p.home}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.legend}>score shown away–home</div>
        </>
      )}

      {/* Box score */}
      {game.box && game.box.length > 0 && (
        <>
          <div className="panel-title">Box Score</div>
          {game.box.map((bx, i) => (
            <details key={i} className={styles.boxteam} open>
              <summary>{bx.teamId && TOURNAMENT.teams[bx.teamId] ? TOURNAMENT.teams[bx.teamId].name : bx.name}</summary>
              {bx.batting && (
                <>
                  <div className={styles.boxSub}>Batting</div>
                  <BoxTable t={bx.batting} />
                </>
              )}
              {bx.pitching && (
                <>
                  <div className={styles.boxSub}>Pitching</div>
                  <BoxTable t={bx.pitching} />
                </>
              )}
            </details>
          ))}
        </>
      )}

      <p className={styles.note}>
        {game.demo ? "Simulated game for preview — not a real result." : "Live box score via ESPN · updates while you watch."}
      </p>
      <div className="btn-row">
        {a.id && TOURNAMENT.teams[a.id] && (
          <a className="btn" href={"#/t/" + a.id}>
            {teamName(a)}
          </a>
        )}
        {b.id && TOURNAMENT.teams[b.id] && (
          <a className="btn" href={"#/t/" + b.id}>
            {teamName(b)}
          </a>
        )}
        {regionalSite && (
          <a className="btn" href={"#/r/" + regionalSite.id}>
            {regionalSite.city} Regional
          </a>
        )}
        <a className="btn" href="#/">
          ← Back to scores
        </a>
      </div>
    </section>
  );
}

function ScoreSide({ team, name, lead, right }) {
  const c = teamColor(team.id);
  return (
    <div className={`${styles.bugTeam} ${right ? styles.bugRight : ""}`}>
      <span className={styles.bugMono} style={{ background: c.primary, color: c.ink }}>
        {team.id ? teamMonogram(name) : "?"}
      </span>
      <div className={styles.bugInfo}>
        <span className={styles.bugName}>{name}</span>
      </div>
      <span className={`${styles.bugScore} tnum ${lead ? styles.bugLead : ""}`}>{team.score == null ? "–" : team.score}</span>
    </div>
  );
}

function BoxTable({ t }) {
  return (
    <table className={`${styles.box} tnum`}>
      <thead>
        <tr>
          <th className={styles.pl}>Player</th>
          {t.cols.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {t.rows.map((r, i) => (
          <tr key={i}>
            <td className={styles.pl}>{r.name}</td>
            {r.stats.map((v, j) => (
              <td key={j}>{v == null || v === "" ? "" : String(v)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
