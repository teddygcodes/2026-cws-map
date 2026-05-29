"use client";

import { useData } from "../(app)/providers/DataProvider";
import { teamColor, teamMonogram } from "@/lib/team-colors";
import { formatRecord } from "@/lib/format";
import SeedBadge from "./SeedBadge";
import Tbd from "./Tbd";
import styles from "./TeamToken.module.css";

/**
 * Team identity unit: color monogram + name (+ optional seed badge, record).
 * `variant`: "full" (default) or "compact". Links to the team page unless
 * `link={false}`. Color/monogram come from public brand facts (no logos).
 */
export default function TeamToken({
  teamId,
  variant = "full",
  showSeed = true,
  showRecord = false,
  regionalSeed = null,
  link = true,
  accent = true,
  className = "",
}) {
  const { TOURNAMENT } = useData();
  const t = teamId ? TOURNAMENT.teams[teamId] : null;
  if (!t) {
    return (
      <span className={`${styles.token} ${styles[variant]} ${className}`}>
        <span className={styles.mono} style={{ background: "var(--surface-3)", color: "var(--faint)" }}>?</span>
        <span className={styles.body}>
          <span className={styles.name}>
            <Tbd value={null} />
          </span>
        </span>
      </span>
    );
  }
  const c = teamColor(teamId);
  const rec = formatRecord(t.record);
  const Tag = link ? "a" : "span";
  const props = link ? { href: "#/t/" + teamId } : {};

  return (
    <Tag
      {...props}
      className={`${styles.token} ${styles[variant]} ${className}`}
      style={accent ? { "--team": c.primary, "--team-ink": c.ink } : undefined}
      data-team={teamId}
    >
      <span className={styles.mono} style={{ background: c.primary, color: c.ink }} aria-hidden="true">
        {teamMonogram(t.name)}
      </span>
      <span className={styles.body}>
        <span className={styles.name}>{t.name}</span>
        {variant === "full" && (
          <span className={styles.meta}>
            {t.conference}
            {showRecord && (
              <>
                {" · "}
                <span className="tnum">{rec ? rec : <Tbd value={null} />}</span>
              </>
            )}
          </span>
        )}
      </span>
      {showSeed && (t.seed != null || regionalSeed != null) && (
        <span className={styles.seed}>
          <SeedBadge national={t.seed != null ? t.seed : undefined} regional={t.seed == null ? regionalSeed : undefined} size="sm" />
        </span>
      )}
    </Tag>
  );
}
