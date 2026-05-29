"use client";

import { useCrumbs } from "../(app)/CrumbsContext";
import styles from "./Breadcrumbs.module.css";

export default function Breadcrumbs() {
  const { crumbs, back } = useCrumbs();
  if (!crumbs.length) return null;
  return (
    <nav className={styles.bar} aria-label="Breadcrumb">
      {back != null && (
        <a className={styles.back} href={back} aria-label="Back">
          ← Back
        </a>
      )}
      <ol className={styles.trail}>
        {crumbs.map((c, i) => (
          <li key={i} className={styles.item}>
            {c.href ? <a href={c.href}>{c.text}</a> : <b aria-current="page">{c.text}</b>}
            {i < crumbs.length - 1 && <span className={styles.sep} aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
