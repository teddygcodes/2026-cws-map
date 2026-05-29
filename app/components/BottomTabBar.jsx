"use client";

import { NAV_ITEMS, activeNavKey } from "./nav-items";
import NavIcon from "./NavIcon";
import styles from "./BottomTabBar.module.css";

/** Mobile app-grade bottom tab bar (thumb-reachable). Hidden on desktop. */
export default function BottomTabBar({ hash }) {
  const active = activeNavKey(hash);
  return (
    <nav className={styles.bar} aria-label="Primary">
      {NAV_ITEMS.map((it) => (
        <a
          key={it.key}
          href={it.href}
          className={`${styles.tab} ${active === it.key ? styles.on : ""}`}
          aria-current={active === it.key ? "page" : undefined}
        >
          <NavIcon name={it.icon} />
          <span className={styles.label}>{it.label}</span>
        </a>
      ))}
    </nav>
  );
}
