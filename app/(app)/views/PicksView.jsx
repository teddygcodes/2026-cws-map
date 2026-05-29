"use client";

import { useEffect, useState } from "react";
import { useData } from "../providers/DataProvider";
import { usePicks } from "../providers/PicksProvider";
import { useLive } from "../providers/LiveProvider";
import { useCrumbs } from "../CrumbsContext";
import { useRoute } from "../RouteContext";
import { REG_SEED } from "@/lib/picks";
import { teamColor, teamMonogram } from "@/lib/team-colors";
import PickTray from "../../components/PickTray";
import styles from "./PicksView.module.css";

export default function PicksView({ code }) {
  const { TOURNAMENT } = useData();
  const picksCtx = usePicks();
  const { set } = useCrumbs();
  const { navigate } = useRoute();
  const [copied, setCopied] = useState(false);
  const { snap, picks, results, setRegional, setSuper, setChamp, reset, loadFromCode, encode, scoreCode, regOf, supersFor, supWinnerFor, champFor } = picksCtx;
  const team = (id) => TOURNAMENT.teams[id];

  // Shared link: load the code into local picks, then strip it from the URL.
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (code) {
      const ok = loadFromCode(code);
      if (!ok) setInvalid(true);
      else {
        try {
          history.replaceState(null, "", "#/picks");
        } catch (e) {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    set([{ text: "Map", href: "#/" }, { text: "Bracket", href: "#/bracket" }, { text: "My Picks" }], "#/bracket");
  }, [set]);

  // Keep a shareable code in the URL as picks change.
  useEffect(() => {
    if (code) return;
    try {
      history.replaceState(null, "", "#/picks/" + encode(picks));
    } catch (e) {}
  }, [picks, encode, code]);

  if (invalid) {
    return (
      <section className="view">
        <h1 className="section-head">Bracket Challenge</h1>
        <div className="unofficial-banner">That share link is invalid or from an older version.</div>
        <div className="btn-row">
          <a className="btn primary" href="#/picks">
            Start your bracket →
          </a>
        </div>
      </section>
    );
  }

  const progress =
    (() => {
      let n = 0;
      for (let sd = 1; sd <= 16; sd++) if (regOf(picks, sd)) n++;
      for (let sd = 1; sd <= 8; sd++) if (supWinnerFor(picks, sd)) n++;
      if (champFor(picks)) n++;
      return n;
    })();

  const sc = scoreCode(encode(picks));
  const champTeam = champFor(picks);

  const copyLink = () => {
    const url = location.origin + location.pathname + "#/picks/" + encode(picks);
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, done);
    else done();
  };
  const compareFriend = () => {
    const v = prompt("Paste a friend's Bracket Challenge link (or 26-char code):");
    if (!v) return;
    const m = v.match(/(\d{26})/);
    if (!m) {
      alert("That doesn't look like a valid bracket link.");
      return;
    }
    navigate("#/h2h/" + encode(picks) + "/" + m[1]);
  };

  // ---- badges ----
  const regBadge = (siteId) => {
    const a = results.regChampById[siteId];
    if (a == null) return null;
    return a === picks.reg[siteId] ? (
      <span className={`${styles.badge} ${styles.ok}`}>✓ correct</span>
    ) : (
      <span className={`${styles.badge} ${styles.no}`}>✗ {team(a).name} won</span>
    );
  };
  const supBadge = (sd) => {
    const a = results.superWinnerBySeed[sd];
    const pk = supWinnerFor(picks, sd);
    if (a == null) return null;
    return pk === a ? <span className={`${styles.badge} ${styles.ok}`}>✓ to Omaha</span> : <span className={`${styles.badge} ${styles.no}`}>✗</span>;
  };

  return (
    <section className="view">
      <h1 className="section-head">Bracket Challenge</h1>
      <div className="section-sub">Predict the Road to Omaha · your picks save to this page &amp; share link</div>
      <div className="unofficial-banner" data-testid="picks-banner">
        ⚠ Predictions only — unofficial, not real results. Saved in your browser and in the share link.
      </div>

      <div className={styles.layout}>
        <div className={styles.cols} data-testid="picks-cols">
          {/* Regionals */}
          <div className={styles.col}>
            <div className={styles.colTitle}>Regionals — pick 16 champions</div>
            {Array.from({ length: 16 }, (_, i) => i + 1).map((sd) => {
              const site = snap.bySeed[sd];
              if (!site) return null;
              return (
                <div key={site.id} className={styles.regCard} data-testid="pick-reg">
                  <div className={styles.regHead}>
                    <span className={styles.nseed}>{sd}</span>
                    {site.city}
                  </div>
                  {site.teams.map((tid) => {
                    const picked = picks.reg[site.id] === tid;
                    const c = teamColor(tid);
                    return (
                      <button
                        key={tid}
                        className={`${styles.node} ${styles.pick} ${picked ? styles.picked : ""}`}
                        style={{ "--team": c.primary }}
                        onClick={() => setRegional(site.id, tid)}
                        data-testid="pick-node"
                        data-team={tid}
                      >
                        <span className={styles.nodeSeed}>{REG_SEED[site.teams.indexOf(tid)]}</span>
                        <span className={styles.nodeName}>{team(tid).name}</span>
                        {picked && regBadge(site.id)}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Super Regionals */}
          <div className={styles.col}>
            <div className={styles.colTitle}>Super Regionals — pick 8 winners</div>
            {supersFor(picks).map((pr) => (
              <div key={pr.seed} className={styles.pair}>
                {[0, 1].map((side) => {
                  const tid = pr.teams[side];
                  const seedLabel = side === 0 ? pr.seed : 17 - pr.seed;
                  if (!tid)
                    return (
                      <div key={side} className={`${styles.node} ${styles.disabled}`}>
                        <span className={styles.nodeSeed}>{seedLabel}</span>
                        <span className={styles.nodeName}>Pick Regional {seedLabel} first</span>
                      </div>
                    );
                  const picked = picks.sup[pr.seed] === side;
                  return (
                    <button
                      key={side}
                      className={`${styles.node} ${styles.pick} ${picked ? styles.picked : ""}`}
                      onClick={() => setSuper(pr.seed, side)}
                    >
                      <span className={styles.nodeSeed}>{seedLabel}</span>
                      <span className={styles.nodeName}>{team(tid).name}</span>
                      {picked && supBadge(pr.seed)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* CWS Champion */}
          <div className={styles.col}>
            <div className={styles.colTitle}>CWS Champion</div>
            <div className={styles.cws}>
              <div className={styles.cwsTrophy}>🏆</div>
              <div className={styles.cwsTitle}>Omaha</div>
              <div className={styles.cwsSub}>{champTeam ? "🏆 " + team(champTeam).name : "Pick your champion below"}</div>
            </div>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((sd) => {
              const w = supWinnerFor(picks, sd);
              if (!w)
                return (
                  <div key={sd} className={`${styles.node} ${styles.disabled}`}>
                    <span className={styles.nodeSeed}>{sd}</span>
                    <span className={styles.nodeName}>Pick Super {sd} first</span>
                  </div>
                );
              const picked = picks.cwsChamp === sd;
              return (
                <button key={sd} className={`${styles.node} ${styles.pick} ${picked ? styles.pickedGold : ""}`} onClick={() => setChamp(sd)}>
                  <span className={styles.nodeSeed}>{picked ? "🏆" : sd}</span>
                  <span className={styles.nodeName}>{team(w).name}</span>
                  {picked && <span className={`${styles.badge} ${styles.pending}`}>CWS not yet played</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.side}>
          <PickTray
            heroValue={progress + " / 25"}
            heroLabel="Picks made"
            heroTone="data"
            count={sc && sc.decided ? `Correct so far: ${sc.correct}/${sc.decided}` : "Champion: pending"}
            primary={{ label: copied ? "Copied!" : "🔗 Copy share link", onClick: copyLink }}
            secondary={[
              { label: "⚖ Compare a friend", onClick: compareFriend },
              { label: "🏆 Leagues", href: "#/league" },
              { label: "↺ Reset", onClick: () => window.confirm("Reset your whole bracket?") && reset() },
            ]}
            note="Champion is scored after Omaha. Regionals + super-regionals score against real results as they finish."
          />
        </div>
      </div>
    </section>
  );
}
