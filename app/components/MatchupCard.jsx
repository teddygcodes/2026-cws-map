"use client";

import { useData } from "../(app)/providers/DataProvider";
import { teamColor, teamMonogram } from "@/lib/team-colors";
import { formatRecord, fmtGameTime } from "@/lib/format";
import OddsChip from "./OddsChip";
import LiveBadge from "./LiveBadge";
import styles from "./MatchupCard.module.css";

/**
 * The hero unit of pick'em + scoreboard: two team sides, a VS divider, odds
 * chips / scores, status, first-pitch time and a Compare affordance.
 *
 * Modes:
 *  - pickable (onPick set): each side is a big tap target; selected side fills
 *    with team color / money-green.
 *  - display: shows live/final scores or pregame odds.
 */
export default function MatchupCard({
  a,
  b,
  aSeed = null,
  bSeed = null,
  label,
  state = "pre",
  detail,
  startMs,
  scoreA = null,
  scoreB = null,
  odds = null,
  winner = null,
  picked = null,
  onPick = null,
  compareHref,
  resultBadge = null,
}) {
  const { TOURNAMENT } = useData();
  const ta = a ? TOURNAMENT.teams[a] : null;
  const tb = b ? TOURNAMENT.teams[b] : null;
  const showScore = state === "in" || state === "post";

  const side = (id, t, seed, score, lead) => {
    const c = teamColor(id);
    const isPicked = picked === id;
    const isWinner = winner === id;
    const inner = (
      <>
        <span className={styles.mono} style={{ background: c.primary, color: c.ink }} aria-hidden="true">
          {t ? teamMonogram(t.name) : "?"}
        </span>
        <span className={styles.sideBody}>
          <span className={styles.sideName}>{t ? t.name : "TBD"}</span>
          <span className={styles.sideMeta}>
            {seed != null && <span className={styles.seedTag}>#{seed}</span>}
            {t && <span className="tnum">{formatRecord(t.record) || "—"}</span>}
          </span>
        </span>
        {showScore ? (
          <span className={`${styles.score} tnum ${lead ? styles.lead : ""}`}>{score == null ? "–" : score}</span>
        ) : odds ? (
          <OddsChip ml={odds.byTeam[id]} favorite={odds.favoriteId === id} size="sm" />
        ) : null}
      </>
    );
    if (onPick) {
      return (
        <button
          type="button"
          className={`${styles.side} ${styles.pickable} ${isPicked ? styles.picked : ""} ${isWinner ? styles.won : ""}`}
          style={{ "--team": c.primary, "--team-ink": c.ink }}
          onClick={() => onPick(id)}
          data-testid="pick-option"
          data-team={id}
          aria-pressed={isPicked}
        >
          {inner}
          {isPicked && <span className={styles.check} aria-hidden="true">✓</span>}
        </button>
      );
    }
    return (
      <div className={`${styles.side} ${isWinner ? styles.won : ""}`} style={{ "--team": c.primary }}>
        {inner}
      </div>
    );
  };

  return (
    <article className={`${styles.card} ${state === "in" ? styles.cardLive : ""}`} data-state={state}>
      <header className={styles.head}>
        <span className={styles.label}>{label}</span>
        <LiveBadge state={state} detail={detail} time={fmtGameTime(startMs)} />
      </header>

      <div className={styles.body}>
        {side(a, ta, aSeed, scoreA, showScore && scoreA != null && scoreB != null && scoreA > scoreB)}
        <div className={styles.vs}>
          <span>VS</span>
        </div>
        {side(b, tb, bSeed, scoreB, showScore && scoreA != null && scoreB != null && scoreB > scoreA)}
      </div>

      <footer className={styles.foot}>
        <span className={styles.footTime}>{!showScore && <span className="tnum">{fmtGameTime(startMs)}</span>}</span>
        {resultBadge}
        {compareHref && (
          <a className={styles.compare} href={compareHref}>
            Compare ›
          </a>
        )}
      </footer>
    </article>
  );
}
