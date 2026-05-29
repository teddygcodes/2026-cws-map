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
  const { TOURNAMENT } = useData();
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
      m.bindTooltip(
        `<strong>${esc(s.city)}</strong><br>${esc(host.name)} (${host.seed != null ? "No. " + host.seed : "host"})` +
          (champId ? `<br>🏆 ${esc(team(champId).name)}` : "") +
          (isLive ? '<br><span style="color:#18C964">● Live now</span>' : ""),
        { direction: "top", offset: [0, -12] }
      );
      m.on("click", () => navRef.current("#/r/" + s.id));
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
