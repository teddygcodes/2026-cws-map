"use client";

import { useEffect, useState } from "react";
import { useData } from "../providers/DataProvider";
import { useLive } from "../providers/LiveProvider";
import { useCrumbs } from "../CrumbsContext";
import { useRoute } from "../RouteContext";
import { roundLabel, formatRecord } from "@/lib/format";
import { scoreFor, eventWinner } from "@/lib/live-parse";
import { teamColor, teamMonogram } from "@/lib/team-colors";
import SeedBadge from "../../components/SeedBadge";
import LiveBadge from "../../components/LiveBadge";
import PageHeader from "../../components/PageHeader";
import Segmented from "../../components/Segmented";
import styles from "./RegionalView.module.css";

const REG_MODES = [
  { value: "list", label: "List" },
  { value: "bracket", label: "Bracket" },
];

const DAY_OF = { 1: "Friday, May 29", 2: "Friday, May 29", 3: "Saturday, May 30", 4: "Saturday, May 30", 5: "Sunday, May 31", 6: "Sunday, May 31", 7: "Monday, June 1" };
const NOTE_OF = { 3: "Game 1 loser vs Game 2 loser", 4: "Game 1 winner vs Game 2 winner", 5: "Game 3 winner vs Game 4 loser", 6: "Game 4 winner vs Game 5 winner", 7: "Game 6 rematch (if necessary)" };
const ELIM_OF = { 3: true, 5: true };
const FEEDER = { 3: ["Game 1 loser", "Game 2 loser"], 4: ["Game 1 winner", "Game 2 winner"], 5: ["Game 3 winner", "Game 4 loser"], 6: ["Game 4 winner", "Game 5 winner"], 7: ["Game 6 rematch", "if necessary"] };

export default function RegionalView({ siteId }) {
  const { TOURNAMENT, SCHEDULES, resolveBracket } = useData();
  const live = useLive();
  const { set } = useCrumbs();
  const { navigate } = useRoute();
  const [mode, setMode] = useState("list"); // list | bracket

  const site = live.sites.find((s) => s.id === siteId);

  useEffect(() => {
    if (!site) {
      navigate("#/");
      return;
    }
    set([{ text: "Home", href: "#/" }, { text: site.city + " " + roundLabel(live.round) }], "#/");
  }, [site, set, navigate, live.round]);

  if (!site) return null;
  const team = (id) => TOURNAMENT.teams[id];
  const host = team(site.hostTeamId);
  const games = live.bracketGames(site);
  const simming = !!(live.live.simSite && live.live.simSite.siteId === site.id);
  const champ = live.siteChampion(site);
  const isSuper = live.round === "super-regional" || site.teams.length === 2;

  return (
    <section className="view">
      <PageHeader
        kicker={roundLabel(live.round)}
        title={site.city}
        sub={`Host: ${host.name}${host.seed != null ? " · National No. " + host.seed : ""} · ${host.stadium.name}`}
      />

      {/* Seeded field */}
      <div className={styles.field}>
        {site.teams.map((id, i) => {
          const t = team(id);
          const c = teamColor(id);
          return (
            <a key={id} href={"#/t/" + id} className={styles.teamCard} style={{ "--team": c.primary }} data-testid="regional-team">
              <span className={styles.tcMono} style={{ background: c.primary, color: c.ink }}>
                {teamMonogram(t.name)}
              </span>
              <div className={styles.tcBody}>
                <div className={styles.tcName}>
                  {t.name}
                  {id === site.hostTeamId ? <span className={styles.hostStar} title="Host" aria-label="Host team" role="img">★</span> : null}
                </div>
                <div className={styles.tcMeta}>{t.conference}</div>
                <div className={styles.tcSeed}>
                  Regional <b>No. {i + 1}</b> · <span className="tnum">{formatRecord(t.record) || "TBD"}</span>
                </div>
              </div>
              <SeedBadge national={t.seed != null ? t.seed : undefined} regional={t.seed == null ? i + 1 : undefined} size="sm" />
            </a>
          );
        })}
      </div>

      {champ && (
        <div className={styles.champBanner}>
          <span className={styles.trophy}>🏆</span>
          <b>{team(champ).name}</b> — {site.city} {roundLabel(live.round)} champion
          {simming && <span className={styles.simTag}>Simulated</span>}
        </div>
      )}

      {/* Controls */}
      <div className={styles.controls}>
        {!isSuper && <Segmented options={REG_MODES} value={mode} onChange={setMode} ariaLabel="Regional view" />}
        <button
          className={styles.simBtn}
          onClick={() => (simming ? live.stopRegionalSim() : live.startRegionalSim(site.id))}
          aria-label={simming ? "Stop the simulated result for this regional" : "Simulate a result for this regional"}
        >
          {simming ? "■ Stop sim" : "▶ Simulate this regional"}
        </button>
      </div>

      {isSuper ? (
        <SuperSchedule site={site} games={games} team={team} simming={simming} />
      ) : mode === "bracket" ? (
        <RegionalBracket site={site} games={games} team={team} resolveBracket={resolveBracket} navigate={navigate} />
      ) : (
        <RegionalSchedule site={site} games={games} team={team} SCHEDULES={SCHEDULES} resolveBracket={resolveBracket} simming={simming} navigate={navigate} />
      )}
    </section>
  );
}

function pairKey(a, b) {
  return [a, b].sort().join("|");
}

function GameRow({ num, when, tv, children, live: isLive, tbd, onClick }) {
  // Guard nested team-link clicks so they don't bubble to the row's nav.
  const handleClick = onClick
    ? (e) => {
        if (e.target.closest("a")) return;
        onClick(e);
      }
    : undefined;
  const handleKey = onClick
    ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e);
        }
      }
    : undefined;
  return (
    <div
      className={`${styles.gameRow} ${isLive ? styles.grLive : ""} ${tbd ? styles.grTbd : ""} ${onClick ? styles.grClick : ""}`}
      onClick={handleClick}
      onKeyDown={handleKey}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Open ${num}` : undefined}
      data-testid="game-row"
    >
      <div className={styles.gameNum}>{num}</div>
      <div className={styles.gameMatch}>{children}</div>
      <div className={styles.gameWhen}>
        {when}
        {tv ? <span className={styles.tv}>{tv}</span> : null}
      </div>
    </div>
  );
}

function RegionalSchedule({ site, games, team, SCHEDULES, resolveBracket, simming, navigate }) {
  const d1byPair = {};
  ((SCHEDULES || {})[site.id] || []).forEach((gm) => {
    d1byPair[pairKey(gm.a[0], gm.b[0])] = gm;
  });
  const br = resolveBracket(site.teams, games);
  const g6 = br.slots[5];
  const g6Final = !!(g6 && g6.event && g6.event.state === "post");

  let lastDay = null;
  const rows = [];
  br.slots.forEach((slot) => {
    const g = slot.g;
    const ev = slot.event;
    if (DAY_OF[g] !== lastDay) {
      rows.push(
        <div key={"d" + g} className={styles.schedDay}>
          {DAY_OF[g]}
        </div>
      );
      lastDay = DAY_OF[g];
    }
    const label = "G" + g;

    if (g === 7) {
      if (!g6Final) {
        rows.push(
          <GameRow key={g} num={label} when="Time TBD" tbd>
            <small>{NOTE_OF[7]}</small>
          </GameRow>
        );
        return;
      }
      if (!slot.necessary) {
        rows.push(
          <GameRow key={g} num={label} when="—" tbd>
            <small>Not necessary — champion decided in Game 6</small>
          </GameRow>
        );
        return;
      }
    }

    const matchup = slot.teams ? (
      <>
        <span className={styles.sd}>#{slot.seeds[0]}</span>
        <a href={"#/t/" + slot.teams[0]}>{team(slot.teams[0]).name}</a>
        <span className={styles.vsx}>vs</span>
        <span className={styles.sd}>#{slot.seeds[1]}</span>
        <a href={"#/t/" + slot.teams[1]}>{team(slot.teams[1]).name}</a>
        {ELIM_OF[g] && <span className={styles.elim}>Elim</span>}
      </>
    ) : (
      <>
        <small>{NOTE_OF[g]}</small>
        {ELIM_OF[g] && <span className={styles.elim}>Elim</span>}
      </>
    );

    if (ev && ev.state !== "pre") {
      const sa = scoreFor(ev, slot.teams[0]);
      const sb = scoreFor(ev, slot.teams[1]);
      rows.push(
        <GameRow
          key={g}
          num={label}
          when={
            <span className={styles.whenScore}>
              <LiveBadge state={ev.state} detail={ev.detail} />
              <span className={`${styles.score} tnum`}>
                {sa == null ? "-" : sa}–{sb == null ? "-" : sb}
              </span>
            </span>
          }
          live
          onClick={() => navigate("#/g/" + ev.id)}
        >
          {matchup}
        </GameRow>
      );
    } else if (g <= 2 && slot.teams) {
      const sg = d1byPair[pairKey(slot.teams[0], slot.teams[1])];
      rows.push(
        <GameRow
          key={g}
          num={label}
          when={<span className="tnum">{sg ? sg.time + " ET" : "Time TBD"}</span>}
          tv={sg ? sg.tv : ""}
          onClick={() => navigate("#/vs/" + slot.teams[0] + "/" + slot.teams[1])}
        >
          {matchup}
          <span className={styles.cmpHint}>Compare ›</span>
        </GameRow>
      );
    } else {
      rows.push(
        <GameRow key={g} num={label} when={ev && ev.detail ? ev.detail : "Time TBD"} tbd={!ev}>
          {matchup}
        </GameRow>
      );
    }
  });

  return (
    <>
      <h2 className="panel-title">Regional Schedule — Double Elimination</h2>
      <div className={styles.schedNote}>
        {simming ? "Simulated regional · not a real result" : "Friday matchups, times (ET) & TV as published · live scores update automatically"}
      </div>
      <div className={styles.sched}>{rows}</div>
    </>
  );
}

function GameCard({ slot, d1byPair, team, navigate }) {
  const g = slot.g;
  const ev = slot.event;
  const winId = slot.teams ? eventWinner(ev, slot.teams) : null;
  let status;
  let onClick = null;
  if (ev && ev.state !== "pre") {
    status = <LiveBadge state={ev.state} detail={ev.detail} />;
    onClick = () => navigate("#/g/" + ev.id);
  } else if (g <= 2 && slot.teams) {
    const sg = d1byPair[pairKey(slot.teams[0], slot.teams[1])];
    status = <span className="tnum">{sg ? sg.time + " ET" : "Time TBD"}</span>;
    onClick = () => navigate("#/vs/" + slot.teams[0] + "/" + slot.teams[1]);
  } else status = slot.teams ? "Time TBD" : "—";

  const row = (i) => {
    if (!slot.teams)
      return (
        <div className={`${styles.bgTeam} ${styles.feeder}`}>{(FEEDER[g] || ["TBD", "TBD"])[i]}</div>
      );
    const id = slot.teams[i];
    const sc = ev && ev.state !== "pre" ? scoreFor(ev, id) : null;
    return (
      <div className={`${styles.bgTeam} ${winId === id ? styles.bgWin : ""}`}>
        <span className={styles.sd}>#{slot.seeds[i]}</span>
        <span className={styles.bn}>{team(id).name}</span>
        <span className={`${styles.sc} tnum`}>{sc == null ? "" : sc}</span>
      </div>
    );
  };

  return (
    <div
      className={`${styles.bgCard} ${ELIM_OF[g] ? styles.bgElim : ""} ${onClick ? styles.grClick : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Open game ${g}` : undefined}
      data-testid="bg-card"
    >
      <div className={styles.bgH}>
        G{g}
        {ELIM_OF[g] ? " · Elim" : ""}
      </div>
      {row(0)}
      {row(1)}
      <div className={styles.bgStatus}>{status}</div>
    </div>
  );
}

function RegionalBracket({ site, games, team, resolveBracket, navigate }) {
  const SCHEDULES = useData().SCHEDULES;
  const d1byPair = {};
  ((SCHEDULES || {})[site.id] || []).forEach((gm) => {
    d1byPair[pairKey(gm.a[0], gm.b[0])] = gm;
  });
  const br = resolveBracket(site.teams, games);
  const slot = (n) => br.slots[n - 1];
  const g6 = slot(6);
  const g6Final = !!(g6.event && g6.event.state === "post");

  return (
    <>
      <div className={styles.schedNote}>Double elimination · winners advance, two losses eliminate</div>
      <div className={styles.bracket}>
        <div className={styles.bkSec}>
          <div className={styles.bkTitle}>Winners Bracket</div>
          <div className={styles.bkRounds}>
            <div className={styles.bkCol}>
              <GameCard slot={slot(1)} d1byPair={d1byPair} team={team} navigate={navigate} />
              <GameCard slot={slot(2)} d1byPair={d1byPair} team={team} navigate={navigate} />
            </div>
            <div className={`${styles.bkCol} ${styles.bkMid}`}>
              <GameCard slot={slot(4)} d1byPair={d1byPair} team={team} navigate={navigate} />
            </div>
          </div>
        </div>
        <div className={styles.bkSec}>
          <div className={styles.bkTitle}>Elimination Bracket</div>
          <div className={styles.bkRounds}>
            <div className={styles.bkCol}>
              <GameCard slot={slot(3)} d1byPair={d1byPair} team={team} navigate={navigate} />
            </div>
            <div className={`${styles.bkCol} ${styles.bkMid}`}>
              <GameCard slot={slot(5)} d1byPair={d1byPair} team={team} navigate={navigate} />
            </div>
          </div>
        </div>
        <div className={styles.bkSec}>
          <div className={styles.bkTitle}>Championship</div>
          <div className={styles.bkRounds}>
            <div className={`${styles.bkCol} ${styles.bkMid}`}>
              <GameCard slot={slot(6)} d1byPair={d1byPair} team={team} navigate={navigate} />
              {g6Final && !slot(7).necessary ? (
                <div className={styles.bkNote}>Game 7 not necessary</div>
              ) : (
                <GameCard slot={slot(7)} d1byPair={d1byPair} team={team} navigate={navigate} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SuperSchedule({ site, games, team, simming }) {
  const a = site.teams[0];
  const b = site.teams[1];
  const sorted = games.slice().sort((x, y) => (Date.parse(x.date) || 0) - (Date.parse(y.date) || 0));
  const wins = { [a]: 0, [b]: 0 };
  sorted.forEach((gm) => {
    if (gm.state !== "post") return;
    const w = (gm.comps.find((c) => c.winner) || {}).id;
    if (w != null && wins[w] != null) wins[w]++;
  });
  const champ = wins[a] >= 2 ? a : wins[b] >= 2 ? b : null;

  return (
    <>
      {champ && (
        <div className={styles.champBanner}>
          <span className={styles.trophy}>🏆</span>
          <b>{team(champ).name}</b> — advances to the College World Series
          {simming && <span className={styles.simTag}>Simulated</span>}
        </div>
      )}
      <h2 className="panel-title">Super Regional — Best of 3</h2>
      <div className={styles.schedNote}>
        {team(a).name} <span className="tnum">{wins[a]}</span> – <span className="tnum">{wins[b]}</span> {team(b).name}
        {simming ? " · simulated" : " · first to two wins advances"}
      </div>
      <div className={styles.sched}>
        {[0, 1, 2].map((i) => {
          const ev = sorted[i];
          const label = "G" + (i + 1);
          const matchup = (
            <>
              <a href={"#/t/" + a}>{team(a).name}</a>
              <span className={styles.vsx}>vs</span>
              <a href={"#/t/" + b}>{team(b).name}</a>
              {i === 2 && <span className={styles.elim}>If necessary</span>}
            </>
          );
          if (ev && ev.state !== "pre") {
            const sa = scoreFor(ev, a);
            const sb = scoreFor(ev, b);
            return (
              <GameRow
                key={i}
                num={label}
                live
                when={
                  <span className={styles.whenScore}>
                    <LiveBadge state={ev.state} detail={ev.detail} />
                    <span className={`${styles.score} tnum`}>
                      {sa == null ? "-" : sa}–{sb == null ? "-" : sb}
                    </span>
                  </span>
                }
              >
                {matchup}
              </GameRow>
            );
          }
          return (
            <GameRow key={i} num={label} when="Time TBD" tbd>
              {matchup}
            </GameRow>
          );
        })}
      </div>
    </>
  );
}
