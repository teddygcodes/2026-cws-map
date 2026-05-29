"use client";

import dynamic from "next/dynamic";
import styles from "./MapCanvas.module.css";

// Static SVG US map — lazy-loaded so d3-geo + the topojson don't ride in the
// home bundle until the Map view is actually opened.
const UsMap = dynamic(() => import("./UsMap"), {
  ssr: false,
  loading: () => <div className={styles.wrap} data-testid="map" aria-busy="true" />,
});

export default function MapCanvas({ visible = true }) {
  if (!visible) return null;
  return <UsMap />;
}
