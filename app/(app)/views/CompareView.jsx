"use client";

import { useEffect, useMemo } from "react";
import { useData } from "../providers/DataProvider";
import { useLive } from "../providers/LiveProvider";
import { useCrumbs } from "../CrumbsContext";
import { useRoute } from "../RouteContext";
import { roundLabel, recordPct, impliedProbFromMoneyline } from "@/lib/format";
import TeamToken from "../../components/TeamToken";
import OddsChip from "../../components/OddsChip";
import ProbBar from "../../components/ProbBar";
import StatRow from "../../components/StatRow";
import Tbd from "../../components/Tbd";
import PageHeader from "../../components/PageHeader";
import styles from "./CompareView.module.css";

export default function CompareView({ idA, idB }) {
  const { TOURNAMENT, SCHEDULES } = useData();
  const live = useLive();
  const { set } = useCrumbs();
  const { prevHash, navigate } = useRoute();

  const a = TOURNAMENT.teams[idA];
  const b = TOURNAMENT.teams[idB];
  const site = TOURNAMENT.sites.find((s) => s.teams.indexOf(idA) !== -1);

  useEffect(() => {
    if (!a || !b) {
      navigate("#/");
      return;
    }
    const fromGames = prevHash.indexOf("#/games") === 0;
    const crumbs = [{ text: "Map", href: "#/" }];
    let back = "#/";
    if (fromGames) {
      crumbs.push({ text: "Daily Pick'em", href: "#/games" });
      back = "#/games";
    } else if (site) {
      crumbs.push({ text: site.city + " " + roundLabel(TOURNAMENT.round), href: "#/r/" + site.id });
      back = "#/r/" + site.id;
    }
    crumbs.push({ text: a.name + " vs " + b.name });
    set(crumbs, back);
  }, [a, b, site, prevHash, set, navigate, TOURNAMENT.round]);

  // Memoized so the 8-row build doesn't recompute on every 30s live re-render.
  // (Declared before the early return to satisfy rules-of-hooks.)
  const rows = useMemo(() => (a && b ? buildRows(a, b) : []), [a, b]);

  if (!a || !b) return null;

  const od = live.oddsForPair(idA, idB);
  const prev = live.prevOddsForPair(idA, idB);

  // Friday game context (time/TV) if this pairing is a scheduled game.
  let gctx = "";
  if (site && SCHEDULES[site.id]) {
    SCHEDULES[site.id].forEach((gm) => {
      const ids = [gm.a[0], gm.b[0]];
      if (ids.indexOf(idA) >= 0 && ids.indexOf(idB) >= 0) {
        gctx = ` · Game ${gm.g} · Fri ${gm.time} ET${gm.tv ? " · " + gm.tv : ""}`;
      }
    });
  }

  const ia = od ? impliedProbFromMoneyline(od.byTeam[idA]) : null;
  const ib = od ? impliedProbFromMoneyline(od.byTeam[idB]) : null;
  const probs = ia != null && ib != null && ia + ib > 0 ? { a: ia / (ia + ib), b: ib / (ia + ib) } : null;

  return (
    <section className="view">
      <PageHeader
        kicker="Matchup"
        title={
          <>
            {a.name} <span className={styles.vsWord}>vs</span> {b.name}
          </>
        }
        sub={(site ? site.city + " " + roundLabel(TOURNAMENT.round) : "Head-to-head") + gctx}
      />

      {/* Head-to-head hero */}
      <div className={styles.hero}>
        <div className={styles.heroTeam}>
          <TeamToken teamId={idA} variant="full" showRecord />
        </div>
        <div className={styles.vs}>VS</div>
        <div className={`${styles.heroTeam} ${styles.heroRight}`}>
          <TeamToken teamId={idB} variant="full" showRecord />
        </div>
      </div>

      {/* Market panel */}
      <div className={`panel raised ${styles.market}`}>
        <div className={styles.marketHead}>
          <span className="panel-title" style={{ margin: 0 }}>
            Moneyline
          </span>
          <span className={styles.marketX}>
            {od && od.spread != null ? <span className="tnum">Spread {od.spread}</span> : null}
            {od && od.overUnder != null ? <span className="tnum">O/U {od.overUnder}</span> : null}
          </span>
        </div>
        <div className={styles.mlRow}>
          <span className={styles.mlTeam}>{a.name}</span>
          <OddsChip ml={od ? od.byTeam[idA] : null} favorite={od && od.favoriteId === idA} prevMl={prev ? prev[idA] : null} />
        </div>
        <div className={styles.mlRow}>
          <span className={styles.mlTeam}>{b.name}</span>
          <OddsChip ml={od ? od.byTeam[idB] : null} favorite={od && od.favoriteId === idB} prevMl={prev ? prev[idB] : null} />
        </div>
        {probs && (
          <div className={styles.prob}>
            <ProbBar aPct={probs.a} bPct={probs.b} aLabel={a.name} bLabel={b.name} />
          </div>
        )}
        <div className={styles.marketFoot}>
          {od ? `Odds: ${od.provider} via ESPN · ` : ""}for entertainment only · 21+, gamble responsibly
        </div>
      </div>

      {/* Stat comparison */}
      <div className="panel-title">Head-to-Head Stats</div>
      <div className={`panel ${styles.stats}`} data-testid="cmp-table" role="table" aria-label="Head-to-head statistics">
        <div className="sr-only" role="row">
          <span role="columnheader">{a.name}</span>
          <span role="columnheader">Statistic</span>
          <span role="columnheader">{b.name}</span>
        </div>
        {rows.map((r) => (
          <StatRow key={r.label} label={r.label} a={r.aDisp} b={r.bDisp} better={r.better} aFill={r.aFill} bFill={r.bFill} />
        ))}
      </div>

      {/* Key players */}
      <div className={styles.players}>
        <div>
          <div className="panel-title">{a.name} — Key Players</div>
          <PlayerList players={a.players} />
        </div>
        <div>
          <div className="panel-title">{b.name} — Key Players</div>
          <PlayerList players={b.players} />
        </div>
      </div>

      <div className="btn-row">
        <a className="btn" href={"#/t/" + idA}>
          {a.name} Profile
        </a>
        <a className="btn" href={"#/t/" + idB}>
          {b.name} Profile
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

function PlayerList({ players }) {
  return (
    <ul className={styles.plist}>
      {players.map((p, i) => (
        <li key={i}>
          <span className={styles.pos}>
            <Tbd value={p.pos} />
          </span>
          <span className={styles.pn}>
            <Tbd value={p.name} />
          </span>
          <span className={`${styles.ln} tnum`}>
            <Tbd value={p.line} />
          </span>
        </li>
      ))}
    </ul>
  );
}

// Build comparison rows: display nodes + better side + relative bar fills.
function buildRows(a, b) {
  const num = (v) => (v === null || v === undefined || v === "" ? null : v);
  const flt = (v) => {
    if (v == null || v === "") return null;
    const f = parseFloat(v);
    return isNaN(f) ? null : f;
  };
  const defs = [
    ["National Seed", a.seed != null ? "No. " + a.seed : null, b.seed != null ? "No. " + b.seed : null, num(a.seed), num(b.seed), "low"],
    ["Record", fmtRec(a.record), fmtRec(b.record), recordPct(a.record), recordPct(b.record), "high"],
    ["RPI", a.rpi, b.rpi, num(a.rpi), num(b.rpi), "low"],
    ["Runs Scored", a.stats.runs, b.stats.runs, num(a.stats.runs), num(b.stats.runs), "high"],
    ["Runs Allowed", a.stats.runsAllowed, b.stats.runsAllowed, num(a.stats.runsAllowed), num(b.stats.runsAllowed), "low"],
    ["Batting Avg", a.stats.battingAvg, b.stats.battingAvg, flt(a.stats.battingAvg), flt(b.stats.battingAvg), "high"],
    ["Team ERA", a.stats.era, b.stats.era, num(a.stats.era), num(b.stats.era), "low"],
    ["Strength of Sched.", a.stats.sos, b.stats.sos, num(a.stats.sos), num(b.stats.sos), "low"],
  ];
  return defs.map(([label, aRaw, bRaw, aN, bN, dir]) => {
    // National Seed is a label, not a magnitude — highlight the higher seed but
    // draw no proportional bar (a bar for "No.1 vs No.8" is misleading).
    const noBar = label === "National Seed";
    let better = null;
    let aFill = 0;
    let bFill = 0;
    if (aN != null && bN != null) {
      if (aN !== bN) better = (dir === "high" ? aN > bN : aN < bN) ? "a" : "b";
      if (!noBar) {
        const mn = Math.min(Math.abs(aN), Math.abs(bN));
        const mx = Math.max(Math.abs(aN), Math.abs(bN)) || 1;
        const r = mn / mx;
        aFill = better === "a" ? 1 : better === "b" ? r : 0.6;
        bFill = better === "b" ? 1 : better === "a" ? r : 0.6;
      }
    }
    return {
      label,
      aDisp: <Tbd value={aRaw} />,
      bDisp: <Tbd value={bRaw} />,
      better,
      aFill,
      bFill,
    };
  });
}

function fmtRec(r) {
  return r && r.w != null && r.l != null ? r.w + "–" + r.l : null;
}
