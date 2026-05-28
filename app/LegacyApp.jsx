"use client";

import Script from "next/script";
import { useEffect } from "react";

/**
 * Mounts the legacy single-page app inside the Next.js shell. The legacy body
 * markup is written directly as JSX (it's mostly empty <section> containers
 * the IIFE renders into); the IIFE + data scripts come from /public/legacy/.
 *
 * Boot order (preserved):
 *   1. Leaflet CSS + JS (CDN) load before the IIFE so window.L is defined.
 *   2. data.js / photos.js / schedule.js / bracket.js load before app.js.
 *   3. app.js runs; reads window.__session for the sync shim, attaches to the
 *      DOM ids below, and starts the existing load-event boot sequence.
 *
 * We expose window.__session synchronously from the hidden input that
 * layout.jsx renders (React safely escapes attribute values).
 */
export default function LegacyApp() {
  useEffect(() => {
    try {
      const el = document.getElementById("__session");
      if (el && el.value) window.__session = JSON.parse(el.value);
      else window.__session = { signedIn: false };
    } catch (e) {
      window.__session = { signedIn: false };
    }
  }, []);

  return (
    <>
      {/* Leaflet (CDN) — beforeInteractive ensures window.L is set before app.js. */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="beforeInteractive"
      />
      {/* Data scripts — order matters. */}
      <Script src="/legacy/data.js" strategy="beforeInteractive" />
      <Script src="/legacy/photos.js" strategy="beforeInteractive" />
      <Script src="/legacy/schedule.js" strategy="beforeInteractive" />
      <Script src="/legacy/bracket.js" strategy="beforeInteractive" />
      {/* The legacy IIFE. */}
      <Script src="/legacy/app.js" strategy="afterInteractive" />

      {/* ===== Legacy body markup (was index.html lines 566-633) ===== */}
      <header className="masthead">
        <div className="brand">
          <span className="kicker">Road to Omaha</span>
          <h1>
            <span className="yr">2026</span> NCAA Baseball Tournament
          </h1>
        </div>
        <div className="navbar">
          <button id="backBtn" hidden>
            &larr; Back
          </button>
          <div className="crumbs" id="crumbs" />
        </div>
      </header>

      <main>
        {/* MAP VIEW (always present so Leaflet stays initialized) */}
        <section id="view-map" className="view">
          <div className="section-head">Regional Host Sites</div>
          <div className="section-sub" id="mapSub">
            16 regionals · double-elimination · May 29 – June 1
          </div>

          <div className="view-toggle map-toggle" id="mapToggle">
            <button className="vt on" data-mode="map">
              Map
            </button>
            <button className="vt" data-mode="list">
              List
            </button>
            <button className="vt" data-mode="bracket">
              Bracket
            </button>
            <button className="vt" data-mode="picks">
              Picks
            </button>
            <button className="vt" data-mode="games">
              Games
            </button>
            <button className="vt" data-mode="league">
              Leagues
            </button>
          </div>

          <div id="scoreboard" className="scoreboard" />
          <div id="map" />
          <div className="map-hint">Tap a host city to open its bracket.</div>
          <div id="siteList" className="site-list" hidden />
        </section>

        {/* Views below are containers the IIFE renders into on demand. */}
        <section id="view-regional" className="view" />
        <section id="view-team" className="view" />
        <section id="view-stadium" className="view" />
        <section id="view-game" className="view" />
        <section id="view-compare" className="view" />
        <section id="view-bracket" className="view" />
        <section id="view-picks" className="view" />
        <section id="view-games" className="view" />
        <section id="view-league" className="view" />
      </main>

      <footer>
        Stats reflect the 2026 season as of May 25, 2026 (sources: official
        athletics sites, WarrenNolan, TheBaseballCube, D1Baseball). Figures
        that couldn&apos;t be verified show{" "}
        <span className="todo">TBD</span>. Stadium photos via Wikimedia Commons.
      </footer>
    </>
  );
}
