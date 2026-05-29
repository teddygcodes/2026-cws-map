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
import SeedBadge from "../../components/SeedBadge";
import styles from "./HomeView.module.css";

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
      <h1 className="section-head">Road to Omaha</h1>
      <div className="section-sub">
        {live.sites.length} {roundLabel(live.round).toLowerCase()}s · double-elimination · May 29 – June 1
      </div>

      <Scoreboard />

      <div className={styles.toggle}>
        {["hub", "map", "list"].map((m) => (
          <button key={m} className={`${styles.vt} ${mode === m ? styles.vtOn : ""}`} onClick={() => setMode(m)} data-mode={m}>
            {m === "hub" ? "Hub" : m === "map" ? "Map" : "List"}
          </button>
        ))}
      </div>

      {mode === "map" && <MapCanvas />}

      {mode === "list" && <SiteList sites={sortSites(live.sites, team)} team={team} live={live} />}

      {mode === "hub" && (
        <>
          <Hero SCHEDULES={SCHEDULES} live={live} />
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

function Hero({ SCHEDULES, live }) {
  // Live games first; otherwise the next scheduled Friday matchups so the front
  // door always feels alive. Built only from real feed + published schedule.
  let cards = [];
  const L = live.live;
  if (L.list.length) {
    cards = L.list.slice(0, 6).map((g) => ({
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
    const upcoming = [];
    live.sites.forEach((s) => {
      (SCHEDULES[s.id] || []).forEach((gm) => {
        upcoming.push({
          a: gm.a[0],
          b: gm.b[0],
          aSeed: gm.a[1],
          bSeed: gm.b[1],
          state: "pre",
          detail: "Fri " + gm.time + " ET",
          tv: gm.tv,
          odds: live.oddsForPair(gm.a[0], gm.b[0]),
          label: s.city.split(",")[0] + " G" + gm.g,
        });
      });
    });
    cards = upcoming.slice(0, 6);
  }
  if (!cards.length) return null;

  return (
    <>
      <div className="panel-title">Today on the Road to Omaha</div>
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
        {host.name} · {host.conference}
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

function SiteList({ sites, team, live }) {
  return (
    <div className={styles.siteList} data-testid="site-list">
      {sites.map((s) => {
        const host = team(s.hostTeamId);
        const champId = live.siteChampion(s);
        const isLive = live.siteIsLive(s);
        return (
          <a key={s.id} className={styles.siteRow} href={"#/r/" + s.id} data-testid="site-row">
            <SeedBadge national={host.seed != null ? host.seed : undefined} size="sm" />
            <div className={styles.srMain}>
              <div className={styles.srCity}>
                {s.city}
                {champId && <span className={styles.srChamp}>★</span>}
              </div>
              <div className={styles.srHost}>
                {host.name} · {host.conference}
              </div>
            </div>
            {isLive && (
              <span className={styles.srLive}>
                <span className={styles.dot} /> Live
              </span>
            )}
            <span className={`${styles.srRec} tnum`}>{formatRecord(host.record) || "TBD"}</span>
          </a>
        );
      })}
    </div>
  );
}
