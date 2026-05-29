"use client";

import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import statesTopo from "us-atlas/states-10m.json";
import { useData } from "../(app)/providers/DataProvider";
import { useLive } from "../(app)/providers/LiveProvider";
import { roundLabel } from "@/lib/format";
import styles from "./MapCanvas.module.css";

// Build the projection + paths once (static data) — geoAlbersUsa is US-only and
// laid out for a 975×610 viewBox; markers use the SAME projection so the seed
// dots land in the right place.
const VB = [975, 610];
let GEO;
function geo() {
  if (GEO) return GEO;
  const nation = feature(statesTopo, statesTopo.objects.nation);
  const states = feature(statesTopo, statesTopo.objects.states).features;
  const projection = geoAlbersUsa().fitSize(VB, nation);
  const path = geoPath(projection);
  GEO = { nation, states, projection, path };
  return GEO;
}

export default function UsMap() {
  const { TOURNAMENT } = useData();
  const live = useLive();
  const team = (id) => TOURNAMENT.teams[id];
  const { nation, states, projection, path } = geo();

  return (
    <div className={styles.wrap} data-testid="map">
      <svg className={styles.svg} viewBox={`0 0 ${VB[0]} ${VB[1]}`} role="img" aria-label="Map of the regional host sites across the continental United States">
        <g className={styles.states}>
          {states.map((f, i) => (
            <path key={i} d={path(f)} className={styles.state} />
          ))}
        </g>
        <path d={path(nation)} className={styles.nation} />

        {live.sites.map((s) => {
          const host = team(s.hostTeamId);
          const st = host.stadium;
          const xy = projection([st.lng, st.lat]);
          if (!xy) return null;
          const champ = live.siteChampion(s);
          const isLive = live.siteIsLive(s);
          const cls = `${styles.pin} ${champ ? styles.pinChamp : ""} ${isLive ? styles.pinLive : ""}`;
          return (
            <a key={s.id} href={"#/r/" + s.id} transform={`translate(${xy[0]},${xy[1]})`} className={cls} data-testid="map-pin" data-site={s.id} aria-label={`${s.city} ${roundLabel(live.round)} — ${host.name}`}>
              <title>{`${s.city} · ${host.name}${host.seed != null ? " (No. " + host.seed + ")" : ""}`}</title>
              {isLive && <circle className={styles.ping} r="13" />}
              <circle className={styles.dot} r="13" />
              <text className={styles.lbl} dy="0.34em">
                {champ ? "★" : host.seed != null ? host.seed : "·"}
              </text>
            </a>
          );
        })}
      </svg>
    </div>
  );
}
