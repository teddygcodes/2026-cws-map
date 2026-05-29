"use client";

import { useEffect, useMemo } from "react";
import { useData } from "../providers/DataProvider";
import { useLive } from "../providers/LiveProvider";
import { useCrumbs } from "../CrumbsContext";
import { superPairings } from "@/lib/live-parse";
import { teamColor, teamMonogram } from "@/lib/team-colors";
import PageHeader from "../../components/PageHeader";
import styles from "./BracketTree.module.css";

export default function NationalBracketView() {
  const { TOURNAMENT, resolveBracket } = useData();
  const live = useLive();
  const { set } = useCrumbs();
  const team = (id) => TOURNAMENT.teams[id];

  useEffect(() => {
    set([{ text: "Map", href: "#/" }, { text: "Bracket" }], "#/");
  }, [set]);

  const isSuper = live.round === "super-regional";
  const cwsTeams = [];

  // Recompute the regional pairings only when the live feed changes, not on
  // every unrelated re-render.
  const regionalPairs = useMemo(
    () => (isSuper ? [] : superPairings(live.sites, TOURNAMENT.teams, live.live.bySite, resolveBracket)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuper, live.version, TOURNAMENT, resolveBracket]
  );

  let content;
  if (isSuper) {
    const supers = live.sites.map((s) => {
      const champ = live.siteChampion(s);
      if (champ) cwsTeams.push(champ);
      return { site: s, champ };
    });
    content = (
      <div className={styles.cols}>
        <div className={styles.col}>
          <div className={styles.colTitle}>Super Regionals</div>
          {supers.map(({ site, champ }) => (
            <div className={styles.pair} key={site.id}>
              <a className={styles.link} href={"#/r/" + site.id}>
                {[0, 1].map((i) => (
                  <TeamNode key={i} id={site.teams[i]} team={team} win={champ === site.teams[i]} />
                ))}
              </a>
            </div>
          ))}
        </div>
        <CwsColumn cwsTeams={cwsTeams} team={team} />
      </div>
    );
  } else {
    const pairs = regionalPairs;
    content = (
      <div className={styles.cols}>
        <div className={styles.col}>
          <div className={styles.colTitle}>Regionals</div>
          {pairs.map((p) => (
            <div className={styles.pairGroup} key={p.seed}>
              <RegionNode p={p.hi} team={team} />
              <RegionNode p={p.lo} team={team} />
            </div>
          ))}
        </div>
        <div className={styles.col}>
          <div className={styles.colTitle}>Super Regionals</div>
          {pairs.map((p) => (
            <div className={styles.superSlot} key={p.seed}>
              <div className={styles.superNode}>
                <span className={styles.superSeed}>{p.seed}</span>
                <div>
                  <div className={styles.superCity}>{p.hi.site.city} Super</div>
                  <div className={styles.superFeed}>
                    {p.hi.champ ? team(p.hi.champ).name : `Regional ${p.seed} winner`} vs{" "}
                    {p.lo.champ ? team(p.lo.champ).name : `Regional ${17 - p.seed} winner`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <CwsColumn cwsTeams={[]} team={team} />
      </div>
    );
  }

  return (
    <section className="view">
      <PageHeader
        kicker="National Bracket"
        title="Road to Omaha"
        sub={`${isSuper ? "Super Regionals" : "16 regionals"} → 8 super regionals → College World Series`}
        actions={
          <a className="btn primary" href="#/picks">
            📋 Make Your Picks →
          </a>
        }
      />
      <div className={styles.scroll}>{content}</div>
    </section>
  );
}

function TeamNode({ id, team, win }) {
  if (!id) return <div className={`${styles.node} ${styles.nodeTbd}`}>TBD</div>;
  const t = team(id);
  const c = teamColor(id);
  return (
    <div className={`${styles.node} ${win ? styles.nodeWin : ""}`} style={{ "--team": c.primary }}>
      <span className={styles.nodeMono} style={{ background: c.primary, color: c.ink }}>
        {teamMonogram(t.name)}
      </span>
      <span className={styles.nodeName}>{t.name}</span>
      {win && <span className={styles.adv}>▲</span>}
    </div>
  );
}

function RegionNode({ p, team }) {
  const site = p.site;
  const host = team(site.hostTeamId);
  const champ = p.champ;
  const c = teamColor(champ || site.hostTeamId);
  return (
    <a className={`${styles.node} ${champ ? styles.nodeWin : ""}`} href={"#/r/" + site.id} style={{ "--team": c.primary }} data-testid="reg-node">
      <span className={styles.nodeSeed}>{host.seed != null ? host.seed : "·"}</span>
      <div className={styles.nodeBody}>
        <div className={styles.nodeName}>{site.city}</div>
        <div className={styles.nodeSub}>{champ ? `🏆 ${team(champ).name} advances` : `${host.name} (host)`}</div>
      </div>
    </a>
  );
}

function CwsColumn({ cwsTeams, team }) {
  return (
    <div className={`${styles.col} ${styles.cwsCol}`}>
      <div className={styles.colTitle}>College World Series</div>
      <div className={styles.cws}>
        <div className={styles.cwsTrophy}>🏆</div>
        <div className={styles.cwsTitle}>Omaha</div>
        <div className={styles.cwsSub}>
          {cwsTeams.length ? cwsTeams.map((id) => team(id).name).join(" · ") : "8 super-regional winners · TBD"}
        </div>
      </div>
    </div>
  );
}
