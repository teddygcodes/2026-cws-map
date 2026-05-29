"use client";

import { useEffect, useState } from "react";
import { useData } from "../providers/DataProvider";
import { useLive } from "../providers/LiveProvider";
import { useCrumbs } from "../CrumbsContext";
import { roundLabel, formatRecord, dateLabel, timeAgo } from "@/lib/format";
import { teamColor, teamMonogram } from "@/lib/team-colors";
import MatchupCard from "../../components/MatchupCard";
import MapCanvas from "../../components/MapCanvas";
import PageHeader from "../../components/PageHeader";
import Segmented from "../../components/Segmented";
import styles from "./HomeView.module.css";

const HOME_MODES = [
  { value: "hub", label: "Hub" },
  { value: "map", label: "Map" },
];

export default function HomeView() {
  const { TOURNAMENT, SCHEDULES } = useData();
  const live = useLive();
  const { set } = useCrumbs();
  const [mode, setMode] = useState("hub"); // hub | map | list
  const team = (id) => TOURNAMENT.teams[id];

  useEffect(() => {
    set([{ text: "Home" }], null);
  }, [set]);

  return (
    <section className="view">
      <PageHeader
        title="Road to Omaha"
        sub={`${live.sites.length} ${roundLabel(live.round).toLowerCase()}s · double-elimination · May 29 – June 1`}
      />

      {/* Single games strip (replaces the old separate scoreboard ticker). */}
      <TodaysGames SCHEDULES={SCHEDULES} live={live} team={team} />

      <div className={styles.toggleRow}>
        <Segmented options={HOME_MODES} value={mode} onChange={setMode} ariaLabel="Home layout" />
      </div>

      {/* Kept mounted (lazy-inits on first show) so toggling away and back
          doesn't re-initialize Leaflet. */}
      <MapCanvas visible={mode === "map"} />

      {mode === "hub" && (
        <>
          <div className="panel-title">{roundLabel(live.round)} Sites</div>
          <div className={styles.grid}>
            {sortSites(live.sites, team).map((s) => (
              <RegionalCard key={s.id} site={s} team={team} live={live} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function sortSites(sites, team) {
  return sites.slice().sort((a, b) => {
    const sa = team(a.hostTeamId).seed == null ? 99 : team(a.hostTeamId).seed;
    const sb = team(b.hostTeamId).seed == null ? 99 : team(b.hostTeamId).seed;
    return sa !== sb ? sa - sb : a.city.localeCompare(b.city);
  });
}

function TodaysGames({ SCHEDULES, live, team }) {
  // The single games strip: live/today's games (or the marquee Friday matchups
  // pre-tournament), the live heartbeat, the Simulate control, and a link to the
  // full Pick'em slate. Built only from the real feed + published schedule.
  let cards = [];
  let heading;
  const L = live.live;
  if (L.list.length) {
    heading = L.list.some((g) => g.state === "in") ? "Live Now" : "Today's Games";
    cards = L.list
      .slice()
      .sort((a, b) => (a.state === "in" ? -1 : 0) - (b.state === "in" ? -1 : 0) || (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0))
      .slice(0, 8)
      .map((g) => ({
        a: g.comps[0].id,
        b: g.comps[1].id,
        state: g.state,
        detail: g.detail,
        startMs: Date.parse(g.date) || null,
        scoreA: g.comps[0].score,
        scoreB: g.comps[1].score,
        odds: g.odds,
        label: "Live",
      }));
  } else {
    heading = "Featured Friday Matchups";
    const upcoming = [];
    live.sites.forEach((s) => {
      const seed = team(s.hostTeamId).seed == null ? 99 : team(s.hostTeamId).seed;
      (SCHEDULES[s.id] || []).forEach((gm) => {
        upcoming.push({
          a: gm.a[0],
          b: gm.b[0],
          aSeed: gm.a[1],
          bSeed: gm.b[1],
          seed,
          state: "pre",
          detail: "Fri " + gm.time + " ET",
          tv: gm.tv,
          odds: live.oddsForPair(gm.a[0], gm.b[0]),
          label: s.city.split(",")[0] + " G" + gm.g,
        });
      });
    });
    upcoming.sort((a, b) => a.seed - b.seed); // biggest games first
    cards = upcoming.slice(0, 8);
  }

  // Surface the clearly-labeled SIM game alongside the real ones when running.
  if (L.demo) {
    cards = [
      {
        a: L.demo.comps[0].id,
        b: L.demo.comps[1].id,
        state: L.demo.state,
        detail: L.demo.detail,
        scoreA: L.demo.comps[0].score,
        scoreB: L.demo.comps[1].score,
        label: "SIM",
      },
      ...cards,
    ];
  }

  const liveCount = L.list.filter((g) => g.state === "in").length + (L.demo ? 1 : 0);
  const meta = !L.updated
    ? "Loading scores…"
    : `${L.activeDate ? dateLabel(L.activeDate) : ""}${liveCount ? " · " + liveCount + " live" : ""} · updated ${timeAgo(L.updated)}`;

  return (
    <div className={styles.games} data-testid="scoreboard">
      <div className={styles.gamesHead}>
        <div className={styles.gamesHeadL}>
          <span className={styles.gamesTitle}>
            {liveCount > 0 && <span className={styles.dot} />}
            {heading}
          </span>
          <span className={styles.gamesMeta}>{meta}</span>
        </div>
        <div className={styles.gamesHeadR}>
          <button
            className={styles.simBtn}
            onClick={() => (L.demo ? live.stopDemo() : live.startDemo())}
            data-demo={L.demo ? "stop" : "start"}
          >
            {L.demo ? "■ Stop demo" : "▶ Simulate a live game"}
          </button>
          <a className={styles.seeAll} href="#/schedule">
            Full schedule →
          </a>
        </div>
      </div>
      {cards.length ? (
        <div className={styles.heroStrip}>
          {cards.map((c, i) => (
            <div key={i} className={styles.heroCard}>
              <MatchupCard
                a={c.a}
                b={c.b}
                aSeed={c.aSeed}
                bSeed={c.bSeed}
                label={c.label}
                state={c.state}
                detail={c.detail}
                startMs={c.startMs}
                scoreA={c.scoreA}
                scoreB={c.scoreB}
                odds={c.odds}
                compareHref={"#/vs/" + c.a + "/" + c.b}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.gamesEmpty}>No games yet — first pitch Friday, May 29. Scores appear here automatically.</div>
      )}
    </div>
  );
}

function RegionalCard({ site, team, live }) {
  const host = team(site.hostTeamId);
  const champId = live.siteChampion(site);
  const isLive = live.siteIsLive(site);
  return (
    <a className={styles.card} href={"#/r/" + site.id} data-testid="regional-card">
      <div className={styles.cardTop}>
        <div className={styles.cardCity}>{site.city}</div>
        {isLive ? (
          <span className={styles.cardLive}>
            <span className={styles.dot} /> Live
          </span>
        ) : champId ? (
          <span className={styles.cardChamp}>🏆</span>
        ) : (
          <span className={styles.cardPlay}>▶</span>
        )}
      </div>
      <div className={styles.cardHost}>
        {host.name} · {host.conference} · <span className="tnum">{formatRecord(host.record) || "TBD"}</span>
      </div>
      <div className={styles.monos}>
        {site.teams.map((id) => {
          const c = teamColor(id);
          return (
            <span key={id} className={styles.mono} style={{ background: c.primary, color: c.ink }} title={team(id).name}>
              {teamMonogram(team(id).name)}
            </span>
          );
        })}
      </div>
    </a>
  );
}
