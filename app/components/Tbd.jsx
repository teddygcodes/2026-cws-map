"use client";

import { isMissing } from "@/lib/format";
import styles from "./Tbd.module.css";

/**
 * The honesty gate. Renders the value, or a visible TBD badge when it's missing
 * (null / "" / "TODO*"). Never fabricates. Use `label="Not posted yet"` for odds.
 */
export default function Tbd({ value, label = "TBD" }) {
  if (isMissing(value)) return <span className={styles.todo}>{label}</span>;
  return <>{value}</>;
}
