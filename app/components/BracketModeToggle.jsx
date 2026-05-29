"use client";

import { useRoute } from "../(app)/RouteContext";
import Segmented from "./Segmented";
import styles from "./BracketModeToggle.module.css";

const OPTIONS = [
  { value: "results", label: "Live Results" },
  { value: "mine", label: "My Bracket" },
];

/**
 * Switches the unified bracket surface between the live tournament bracket
 * (#/bracket) and the editable challenge (#/picks). Both are the same tree —
 * one view, one edit — so they live under one "Bracket" tab.
 */
export default function BracketModeToggle({ active }) {
  const { navigate } = useRoute();
  return (
    <div className={styles.wrap}>
      <Segmented
        options={OPTIONS}
        value={active}
        onChange={(v) => navigate(v === "mine" ? "#/picks" : "#/bracket")}
        ariaLabel="Bracket view"
      />
    </div>
  );
}
