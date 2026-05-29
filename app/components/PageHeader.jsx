"use client";

import styles from "./PageHeader.module.css";

/**
 * The standard page-heading zone every view shares — kicker → display title →
 * sub, with an optional actions slot and a hero/children slot below. The <h1>
 * carries `data-view-heading` + tabIndex=-1 so route changes can move focus to
 * it (keyboard/screen-reader flow). Keeps a plain page and a hero page on the
 * same rhythm.
 */
export default function PageHeader({ kicker, title, sub, actions, children }) {
  return (
    <header className={styles.header}>
      <div className={styles.row}>
        <div className={styles.head}>
          {kicker && <div className={styles.kicker}>{kicker}</div>}
          <h1 className="section-head" tabIndex={-1} data-view-heading>
            {title}
          </h1>
          {sub && <div className="section-sub">{sub}</div>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </header>
  );
}
