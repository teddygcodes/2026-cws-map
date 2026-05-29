"use client";

import { useCallback, useEffect, useState } from "react";
import { usePicks } from "../providers/PicksProvider";
import { useGamePicks } from "../providers/GamePicksProvider";
import { useLeagues } from "../providers/LeaguesProvider";
import { useCrumbs } from "../CrumbsContext";
import { useRoute } from "../RouteContext";
import StandingsTable from "../../components/StandingsTable";
import PageHeader from "../../components/PageHeader";
import Segmented from "../../components/Segmented";
import Skeleton from "../../components/Skeleton";
import styles from "./LeagueView.module.css";

const LEAGUE_TABS = [
  { value: "bracket", label: "Bracket" },
  { value: "daily", label: "Daily" },
];

export default function LeagueView({ code }) {
  const leagues = useLeagues();
  const { set } = useCrumbs();

  useEffect(() => {
    const crumbs = [{ text: "Map", href: "#/" }, { text: "Leagues", href: code ? "#/league" : undefined }];
    if (code) crumbs.push({ text: code.toUpperCase() });
    set(crumbs, code ? "#/league" : "#/");
  }, [set, code]);

  if (!leagues.enabled) {
    return (
      <section className="view">
        <PageHeader title="Private Leagues" />
        <div className={styles.unavailable} data-testid="lg-unavailable">
          <div className={styles.uTitle}>Leagues aren&apos;t turned on yet</div>
          <p>
            League play uses an optional backend that hasn&apos;t been enabled. Your{" "}
            <a href="#/picks" className={styles.link}>
              Bracket Challenge
            </a>{" "}
            still works and is shareable by link.
          </p>
          <div className="btn-row">
            <a className="btn primary" href="#/picks">
              ← Back to my picks
            </a>
          </div>
        </div>
      </section>
    );
  }

  return code ? <Standings code={code.toUpperCase()} /> : <Hub />;
}

function Hub() {
  const leagues = useLeagues();
  const { navigate } = useRoute();
  const [cName, setCName] = useState("");
  const [lName, setLName] = useState("");
  const [jCode, setJCode] = useState("");
  const [jName, setJName] = useState("");

  const create = () => {
    if (!cName.trim()) return alert("Enter a display name.");
    leagues.create(lName.trim(), cName.trim()).then((c) => navigate("#/league/" + c), leagueErr);
  };
  const join = () => {
    if (!jCode.trim() || !jName.trim()) return alert("Enter a league code and display name.");
    leagues.join(jCode.trim().toUpperCase(), jName.trim()).then((c) => navigate("#/league/" + c), leagueErr);
  };

  return (
    <section className="view">
      <PageHeader title="Private Leagues" sub="Compete with friends on your bracket · one code, everyone joins" />
      <div className="unofficial-banner">⚠ Friendly competition only — league standings are unofficial predictions, not real results.</div>

      <div className={styles.cards}>
        <div className="panel">
          <div className="panel-title" style={{ marginTop: 0 }}>
            Create a league
          </div>
          <div className={styles.form}>
            <input value={cName} onChange={(e) => setCName(e.target.value)} maxLength={24} placeholder="Your display name" />
            <input value={lName} onChange={(e) => setLName(e.target.value)} maxLength={24} placeholder="League name (optional)" />
            <button className="btn primary" onClick={create}>
              Create
            </button>
          </div>
        </div>
        <div className="panel">
          <div className="panel-title" style={{ marginTop: 0 }}>
            Join a league
          </div>
          <div className={styles.form}>
            <input value={jCode} onChange={(e) => setJCode(e.target.value)} maxLength={6} placeholder="Code" className={styles.codeIn} />
            <input value={jName} onChange={(e) => setJName(e.target.value)} maxLength={24} placeholder="Your display name" />
            <button className="btn" onClick={join}>
              Join
            </button>
          </div>
        </div>
      </div>

      <div className="panel-title">Your leagues</div>
      {leagues.leagues.joined.length ? (
        <div className={styles.list}>
          {leagues.leagues.joined.map((j) => (
            <a key={j.code} className={styles.row} href={"#/league/" + j.code}>
              <span className={styles.code}>{j.code}</span>
              <span className={styles.as}>as {j.displayName}</span>
              <span className={styles.go}>Standings →</span>
            </a>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>You haven&apos;t joined a league yet.</div>
      )}
    </section>
  );
}

function Standings({ code }) {
  const leagues = useLeagues();
  const picks = usePicks();
  const gp = useGamePicks();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [tab, setTab] = useState("bracket");
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    leagues.getStandings(code).then(
      (d) => {
        setData(d);
        setStatus("ok");
      },
      (e) => setStatus(e && e.status === 404 ? "notfound" : "error")
    );
  }, [leagues, code]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") {
    return (
      <section className="view">
        <PageHeader title={"League " + code} sub="Loading standings…" />
        <div className={styles.skel} aria-busy="true" aria-label="Loading standings">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={styles.skelRow}>
              <Skeleton w={24} h={24} r={6} />
              <Skeleton w="45%" h={14} />
              <Skeleton w={40} h={14} style={{ marginLeft: "auto" }} />
              <Skeleton w={40} h={14} />
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (status !== "ok") {
    return (
      <section className="view">
        <h1 className="section-head">League {code}</h1>
        <div className={styles.unavailable}>
          <div className={styles.uTitle}>{status === "notfound" ? "League not found" : "Couldn't load standings"}</div>
          <div className="btn-row">
            <a className="btn" href="#/league">
              ← Leagues
            </a>
            <button className="btn" onClick={load}>
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const members = data.members || [];
  const mine = leagues.joinedLeague(code);
  const ls = leagues.lockState(data.lockTs);

  const bracketRows = members
    .map((m) => ({ name: m.displayName, sc: picks.scoreCode(m.bracket) }))
    .sort((a, b) => {
      if (!a.sc && !b.sc) return 0;
      if (!a.sc) return 1;
      if (!b.sc) return -1;
      if (b.sc.correct !== a.sc.correct) return b.sc.correct - a.sc.correct;
      const aw = a.sc.decided ? a.sc.correct / a.sc.decided : 0;
      const bw = b.sc.decided ? b.sc.correct / b.sc.decided : 0;
      return bw - aw;
    })
    .map((r) => ({
      name: r.name,
      value: r.sc ? r.sc.correct : "—",
      pct: r.sc && r.sc.decided ? Math.round((100 * r.sc.correct) / r.sc.decided) + "%" : "–",
      highlight: mine && r.name === mine.displayName,
    }));

  const dailyRows = members
    .map((m) => ({ name: m.displayName, sc: gp.scoreGames(m.games || {}) }))
    .sort((a, b) => {
      if (b.sc.wins !== a.sc.wins) return b.sc.wins - a.sc.wins;
      const aw = a.sc.decided ? a.sc.wins / a.sc.decided : 0;
      const bw = b.sc.decided ? b.sc.wins / b.sc.decided : 0;
      return bw - aw;
    })
    .map((r) => ({
      name: r.name,
      value: r.sc.wins + "–" + r.sc.losses,
      pct: r.sc.decided ? Math.round((100 * r.sc.wins) / r.sc.decided) + "%" : "–",
      highlight: mine && r.name === mine.displayName,
    }));

  const daily = tab === "daily";
  const copyInvite = () => {
    const url = location.origin + location.pathname + "#/league/" + code;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const submitBracket = () => leagues.submitBracket(code, picks.encode(picks.picks)).then(load, leagueErr);
  const submitGames = () => leagues.submitGames(gp.gamePicks.picks).then(load, leagueErr);

  return (
    <section className="view">
      <PageHeader
        title={data.name || "League " + code}
        sub={
          <>
            Code <b>{code}</b> · share it to invite friends
          </>
        }
      />
      <div className="unofficial-banner" data-testid="lg-banner">
        ⚠ Standings are unofficial predictions — not real results.
      </div>

      <div className={styles.subToggle}>
        <Segmented options={LEAGUE_TABS} value={tab} onChange={setTab} ariaLabel="Standings type" />
      </div>

      <div className={styles.bar}>
        <span className={`${styles.lock} ${ls.locked ? styles.locked : ""}`}>{daily ? "Daily — picks open all tournament" : ls.text}</span>
        <span className={styles.actions}>
          {!mine && (
            <button className="btn primary" onClick={() => leagues.join(code, mine?.displayName || "Player").then(load, leagueErr)}>
              Join this league
            </button>
          )}
          {mine && daily && (
            <button className="btn primary" onClick={submitGames}>
              Submit my picks
            </button>
          )}
          {mine && !daily && !ls.locked && (
            <button className="btn primary" onClick={submitBracket}>
              Submit my bracket
            </button>
          )}
          {mine && !daily && ls.locked && (
            <button className="btn" disabled>
              Bracket locked
            </button>
          )}
          <button className="btn" onClick={copyInvite}>
            {copied ? "Copied!" : "Copy invite"}
          </button>
        </span>
      </div>

      {daily ? (
        <>
          <StandingsTable rows={dailyRows} valueLabel="W–L" empty="No picks submitted yet." />
          <div className={styles.note}>
            Daily = winner of each game. A pick counts only if made before that game&apos;s scheduled first pitch. Regionals + super-regionals.
          </div>
        </>
      ) : (
        <>
          <StandingsTable rows={bracketRows} valueLabel="Correct" empty="No entries yet — be the first to submit your bracket." />
          <div className={styles.note}>Bracket = regional + super-regional champions picked. Champion is scored after Omaha.</div>
        </>
      )}

      <div className="btn-row">
        <a className="btn" href={daily ? "#/games" : "#/picks"}>
          ← My {daily ? "game picks" : "bracket"}
        </a>
        <a className="btn" href="#/league">
          All leagues
        </a>
      </div>
    </section>
  );
}

function leagueErr(err) {
  if (err && err.offline) return alert("Leagues aren't enabled yet.");
  if (err && err.status === 409) return alert("Brackets are locked — the tournament has started.");
  if (err && err.status === 429) return alert("Too many requests — please try again later.");
  if (err && err.status === 404) return alert("That league code wasn't found.");
  alert("Couldn't reach the league server. Try again.");
}
