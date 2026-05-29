"use client";

import AuthHeader from "../AuthHeader";
import PrimaryNav from "./PrimaryNav";
import Breadcrumbs from "./Breadcrumbs";
import { useGamePicks } from "../(app)/providers/GamePicksProvider";
import styles from "./Masthead.module.css";

export default function Masthead({ session, hash, prevHash }) {
  const { localRecord } = useGamePicks();
  const rec = localRecord();
  const hasRec = rec.decided > 0;

  return (
    <header className={styles.masthead}>
      <div className={styles.top}>
        <a className={styles.brand} href="#/" aria-label="Road to Omaha — home">
          <span className={styles.kicker}>Road to Omaha</span>
          <span className={styles.title}>
            <span className={styles.yr}>2026</span> NCAA Baseball Tournament
          </span>
        </a>

        <div className={styles.right}>
          <div className={`${styles.rec} tnum`} title="Your daily pick'em record (preview)">
            <span className={styles.recLbl}>Your W–L</span>
            <span className={styles.recVal}>{hasRec ? `${rec.wins}–${rec.losses}` : "—"}</span>
          </div>
          <AuthHeader session={session} />
        </div>
      </div>

      <div className={styles.navRow}>
        <PrimaryNav hash={hash} prevHash={prevHash} />
      </div>
      <div className={styles.crumbRow}>
        <Breadcrumbs />
      </div>
    </header>
  );
}
