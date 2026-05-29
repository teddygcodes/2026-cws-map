"use client";

import { useEffect, useState } from "react";
import { useData } from "../providers/DataProvider";
import { useLive } from "../providers/LiveProvider";
import { useCrumbs } from "../CrumbsContext";
import { roundLabel, formatRecord } from "@/lib/format";
import { teamColor, teamMonogram } from "@/lib/team-colors";
import Scoreboard from "../../components/Scoreboard";
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
    set([{ text: "Map" }], null);
  }, [set]);

  return (
    <section className="view">
      <PageHeader
        title="Road to Omaha"
        sub={`${live.sites.length} ${roundLabel(live.round).toLowerCase()}s · double-elimination · May 29 – June 1`}
      />

      <Scoreboard />

      <div className={styles.toggleRow}>
        <Segmented options={HOME_MODES} value={mode} onChange={setMode} ariaLabel="Home layout" />
      </div>

      {/* Kept mounted (lazy-inits on first show) so toggling away and back
          doesn't re-initialize Leaflet. */}
      <MapCanvas visible={mode === "map"} />

      {mode === "hub" && (
        <>
          <Hero SCHEDULES={SCHEDULES} live={live} team={team} />
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

function Hero({ SCHEDULES, live, team }) {
  // Live games first; otherwise the marquee Friday matchups (ranked by host
  // seed so the biggest games lead). Built only from real feed + published data.
  let cards = [];
  let heading;
  const L = live.live;
  if (L.list.length) {
    heading = L.list.some((g) => g.state === "in") ? "Live now" : "Today's games";
    cards = L.list
      .slice()
      .sort((a, b) => (a.state === "in" ? -1 : 0) - (b.state === "in" ? -1 : 0) || (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0))
      .slice(0, 6)
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
    // biggest games first: lower host seed, then earlier game number
    upcoming.sort((a, b) => a.seed - b.seed);
    cards = upcoming.slice(0, 6);
  }
  if (!cards.length) return null;

  return (
    <>
      <div className="panel-title">{heading}</div>
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
    </>
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
