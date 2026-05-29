"use client";

import { useEffect, useRef } from "react";
import { useData } from "../(app)/providers/DataProvider";
import { useLive } from "../(app)/providers/LiveProvider";
import { useRoute } from "../(app)/RouteContext";
import { roundLabel } from "@/lib/format";
import styles from "./MapCanvas.module.css";

let leafletPromise = null;
function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.dataset.leaflet = "1";
      document.head.appendChild(link);
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return leafletPromise;
}

export default function MapCanvas({ visible = true }) {
  const { TOURNAMENT, SCHEDULES } = useData();
  const live = useLive();
  const { navigate } = useRoute();
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const navRef = useRef(navigate);
  navRef.current = navigate;

  // Lazy-init on first show, then KEEP the map across Home toggles (no Leaflet
  // re-init flash). When shown again, just re-measure + refit.
  useEffect(() => {
    if (!visible) return;
    if (mapRef.current) {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          renderMarkers();
        }
      }, 60);
      return;
    }
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !elRef.current || mapRef.current) return;
      const map = L.map(elRef.current, { scrollWheelZoom: true, attributionControl: true }).setView([39.5, -98.35], 4);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      renderMarkers();
      setTimeout(() => map.invalidateSize(), 60);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Destroy Leaflet only when the component truly unmounts (leaving Home).
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Re-render markers when sites / live state change.
  useEffect(() => {
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.version]);

  function renderMarkers() {
    const L = window.L;
    if (!L || !mapRef.current || !layerRef.current) return;
    const team = (id) => TOURNAMENT.teams[id];
    layerRef.current.clearLayers();
    const bounds = [];
    live.sites.forEach((s) => {
      const host = team(s.hostTeamId);
      const st = host.stadium;
      const champId = live.siteChampion(s);
      const isLive = live.siteIsLive(s);
      const icon = L.divIcon({
        className: "",
        html: `<div class="${styles.pin} ${champId ? styles.champ : ""} ${isLive ? styles.live : ""}"><span>${champId ? "★" : host.seed != null ? host.seed : "·"}</span></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
      });
      const m = L.marker([st.lat, st.lng], { icon, title: s.city + " " + roundLabel(live.round) });
      m.bindTooltip(`<strong>${esc(s.city)}</strong> · ${esc(host.name)}`, { direction: "top", offset: [0, -12] });
      // Rich popover: the site's matchups + odds + a regional CTA (the map is a
      // designed object, not just a link grid).
      const ml = (od, id) =>
        od && od.byTeam[id]
          ? `<span class="${styles.popMl}${od.favoriteId === id ? " " + styles.popFav : ""}">${esc(od.byTeam[id])}</span>`
          : "";
      const gameLink = (a, b, when) => {
        const od = live.oddsForPair(a, b);
        return `<a class="${styles.popGame}" href="#/vs/${esc(a)}/${esc(b)}">
          <span class="${styles.popRow}"><span class="${styles.popName}">${esc(team(a).name)}</span>${ml(od, a)}</span>
          <span class="${styles.popRow}"><span class="${styles.popName}">${esc(team(b).name)}</span>${ml(od, b)}</span>
          ${when ? `<span class="${styles.popWhen}">${esc(when)}</span>` : ""}
        </a>`;
      };
      const sched = SCHEDULES[s.id] || [];
      let gamesHtml = sched.map((gm) => gameLink(gm.a[0], gm.b[0], "Fri " + gm.time + " ET" + (gm.tv ? " · " + gm.tv : ""))).join("");
      if (!gamesHtml && s.teams.length === 2) gamesHtml = gameLink(s.teams[0], s.teams[1], "Best of 3");
      const html = `<div class="${styles.pop}">
        <div class="${styles.popTitle}">${esc(s.city)} ${esc(roundLabel(live.round))}</div>
        <div class="${styles.popHost}">${esc(host.name)}${host.seed != null ? " · No. " + host.seed : ""}${isLive ? ` · <span style="color:var(--up)">● Live</span>` : ""}</div>
        ${champId ? `<div class="${styles.popChamp}">🏆 ${esc(team(champId).name)} advances</div>` : ""}
        ${gamesHtml || `<div class="${styles.popEmpty}">Matchups TBD</div>`}
        <a class="${styles.popCta}" href="#/r/${esc(s.id)}">View regional →</a>
      </div>`;
      m.bindPopup(html, { maxWidth: 300, className: styles.popup });
      m.addTo(layerRef.current);
      bounds.push([st.lat, st.lng]);
    });
    if (bounds.length) mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  }

  return <div ref={elRef} className={styles.map} data-testid="map" style={visible ? undefined : { display: "none" }} />;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
