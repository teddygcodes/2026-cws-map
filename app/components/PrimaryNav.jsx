"use client";

import { NAV_ITEMS, activeNavKey } from "./nav-items";
import NavIcon from "./NavIcon";
import styles from "./PrimaryNav.module.css";

/** Desktop: premium broadcast tabs under the masthead. Hidden on mobile (the
    BottomTabBar takes over there). */
export default function PrimaryNav({ hash }) {
  const active = activeNavKey(hash);
  return (
    <nav className={styles.nav} aria-label="Primary">
      {NAV_ITEMS.map((it) => (
        <a
          key={it.key}
          href={it.href}
          className={`${styles.tab} ${active === it.key ? styles.on : ""}`}
          aria-current={active === it.key ? "page" : undefined}
        >
          <NavIcon name={it.icon} />
          <span>{it.label}</span>
        </a>
      ))}
    </nav>
  );
}
