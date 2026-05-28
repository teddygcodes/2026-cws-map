  (function () {
    "use strict";

    var T = window.TOURNAMENT;
    var map, markersLayer, mapBounds;

    /* Safe HTML render: clears the node then parses a markup string. All
       interpolated values below come from the static, developer-authored
       data.js and are additionally run through esc(), so no untrusted input
       reaches the DOM. */
    function render(el, html) {
      el.replaceChildren();
      el.insertAdjacentHTML("afterbegin", html);
    }

    // ---- helpers ----------------------------------------------------------
    // SUPER_REGIONAL_UPGRADE: returns "Super Regional" automatically when
    // TOURNAMENT.round flips — every label below reads from this.
    function roundLabel() { return T.round === "super-regional" ? "Super Regional" : "Regional"; }

    function team(id) { return T.teams[id]; }
    function siteById(id) { return T.sites.find(function (s) { return s.id === id; }); }
    function findSiteForTeam(teamId) {
      return T.sites.find(function (s) { return s.teams.indexOf(teamId) !== -1; });
    }

    function esc(str) {
      return String(str).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    // Honest placeholder formatter: null / "" / "TODO*" -> visible TBD badge.
    function fmt(v) {
      if (v === null || v === undefined || v === "" || /^TODO/i.test(String(v))) {
        return '<span class="todo">TBD</span>';
      }
      return esc(v);
    }
    function fmtRecord(r) {
      if (r && r.w != null && r.l != null) return esc(r.w + "–" + r.l);
      return '<span class="todo">TBD</span>';
    }
    function seedChip(t) {
      if (t.seed != null) return '<div class="seed-chip national">' + t.seed + "<small>NAT</small></div>";
      return '<div class="seed-chip">&ndash;</div>';
    }

    // ---- view switching ---------------------------------------------------
    var VIEWS = ["map", "regional", "team", "stadium", "game", "compare", "bracket", "picks", "games", "league"];
    var currentView = null;
    var navCurHash = "#/";  // hash currently shown
    var navPrevHash = "#/"; // hash shown before the current one (for context-aware "back")
    var regionalMode = "list"; // "list" | "bracket" — persists across live re-renders
    var mapMode = "map"; // "map" | "list" — host-sites display mode (Map/List/Bracket toggle)
    var leagueTab = "bracket"; // "bracket" | "daily" — which standings the league page shows
    function showView(name) {
      VIEWS.forEach(function (v) {
        document.getElementById("view-" + v).classList.toggle("active", v === name);
      });
      // Only reset scroll on an actual view change — live refreshes re-render
      // the same view in place and must not yank the page to the top.
      if (name !== currentView) { window.scrollTo({ top: 0, behavior: "auto" }); currentView = name; }
      // Leaflet must measure a visible (non-zero) container before fitting, so
      // recompute size AND re-fit bounds whenever the map view is shown.
      if (name === "map" && map) {
        setTimeout(function () {
          map.invalidateSize();
          if (mapBounds && mapBounds.length) map.fitBounds(mapBounds, { padding: [50, 50] });
        }, 60);
      }
    }

    function setCrumbs(parts, parentHash) {
      var back = document.getElementById("backBtn");
      if (parentHash == null) { back.hidden = true; back.onclick = null; }
      else { back.hidden = false; back.onclick = function () { location.hash = parentHash; }; }
      var html = parts.map(function (p) {
        return p.href ? '<a href="' + p.href + '">' + esc(p.text) + "</a>" : "<b>" + esc(p.text) + "</b>";
      }).join('<span class="sep">/</span>');
      render(document.getElementById("crumbs"), html);
    }

    // ---- MAP --------------------------------------------------------------
    function initMap() {
      map = L.map("map", { scrollWheelZoom: true, attributionControl: true })
            .setView([39.5, -98.35], 4);

      // OpenStreetMap data, served via CARTO's dark basemap to fit the theme.
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(map);

      markersLayer = L.layerGroup().addTo(map);
      renderMarkers();
    }

    function renderMarkers() {
      markersLayer.clearLayers();
      var bounds = [];
      // SUPER_REGIONAL_UPGRADE: count-agnostic — iterates T.sites, so 8
      // super-regional sites render here with zero code changes.
      T.sites.forEach(function (s) {
        var host = team(s.hostTeamId);
        var st = host.stadium;
        var champId = siteChampion(s);
        var champTeam = champId ? team(champId) : null;
        var live = siteIsLive(s);
        var icon = L.divIcon({
          className: "",
          html: '<div class="pin' + (champId ? " champ" : "") + (live ? " live" : "") + '"><span>' +
            (champId ? "&#9733;" : (host.seed != null ? host.seed : "&middot;")) + "</span></div>",
          iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -13]
        });
        var m = L.marker([st.lat, st.lng], { icon: icon, title: s.city + " " + roundLabel() });
        m.bindTooltip(
          "<strong>" + esc(s.city) + "</strong><br>" + esc(host.name) +
          " (" + (host.seed != null ? "No. " + host.seed : "host") + ")" +
          (champTeam ? "<br>&#127942; " + esc(champTeam.name) : "") +
          (live ? '<br><span style="color:#28d07a">&#9679; Live now</span>' : ""),
          { direction: "top", offset: [0, -12] }
        );
        m.on("click", function () { location.hash = "#/r/" + s.id; });
        m.addTo(markersLayer);
        bounds.push([st.lat, st.lng]);
      });
      // Stored, not applied here — showView() fits once the container is visible.
      mapBounds = bounds;
    }

    // A site is "live" if any of its games is in progress (real feed or sim).
    function siteIsLive(s) {
      return bracketGames(s).some(function (g) { return g.state === "in"; });
    }

    // List mode: every host site as a clickable row (overlap-proof navigation).
    // SUPER_REGIONAL_UPGRADE: count-agnostic — renders 8 rows just as well as 16.
    function renderSiteList() {
      var sites = T.sites.slice().sort(function (a, b) {
        var sa = team(a.hostTeamId).seed == null ? 99 : team(a.hostTeamId).seed;
        var sb = team(b.hostTeamId).seed == null ? 99 : team(b.hostTeamId).seed;
        return sa !== sb ? sa - sb : a.city.localeCompare(b.city);
      });
      var html = sites.map(function (s) {
        var host = team(s.hostTeamId);
        var champId = siteChampion(s);
        var live = siteIsLive(s);
        return '<button class="site-row" data-site="' + esc(s.id) + '">' +
          seedChip(host) +
          '<div class="sr-main"><div class="sr-city">' + esc(s.city) +
            (champId ? ' <span class="sr-champ" title="Regional champion">&#9733;</span>' : "") + "</div>" +
            '<div class="sr-host">' + esc(host.name) + " &middot; " + esc(host.conference) + "</div></div>" +
          (live ? '<span class="sr-live"><span class="dot"></span>Live</span>' : "") +
          '<span class="sr-rec">' + fmtRecord(host.record) + "</span>" +
        "</button>";
      }).join("");
      render(document.getElementById("siteList"), html);
    }

    // ---- REGIONAL schedule (double-elimination) ---------------------------
    // Per-game metadata for the double-elim schedule (the matchups themselves
    // are resolved live by bracket.js → resolveBracket).
    var DAY_OF = { 1: "Friday, May 29", 2: "Friday, May 29", 3: "Saturday, May 30", 4: "Saturday, May 30", 5: "Sunday, May 31", 6: "Sunday, May 31", 7: "Monday, June 1" };
    var NOTE_OF = { 3: "Game 1 loser vs Game 2 loser", 4: "Game 1 winner vs Game 2 winner", 5: "Game 3 winner vs Game 4 loser", 6: "Game 4 winner vs Game 5 winner", 7: "Game 6 rematch (if necessary)" };
    var ELIM_OF = { 3: true, 5: true };

    // Games feeding the bracket for a site: simulated set if it's being SIM'd,
    // else the real aggregated live events. (resolveBracket only advances finals.)
    function bracketGames(site) {
      if (LIVE.simSite && LIVE.simSite.siteId === site.id) return LIVE.simSite.games;
      return (LIVE.bySite && LIVE.bySite[site.id]) || [];
    }
    // whenHtml is injected as HTML (live overlays build safe markup with esc()).
    function gameRow(label, whenHtml, tv, matchupHtml, opts) {
      opts = opts || {};
      var cls = "game-row" + (opts.live ? " live" : "") + (opts.tbd ? " tbd" : "") +
        (opts.eventId ? " has-live" : "") + (opts.compare ? " has-compare" : "");
      var data = opts.eventId ? ' data-event="' + esc(opts.eventId) + '"' : "";
      if (opts.compare) data += ' data-a="' + esc(opts.compare[0]) + '" data-b="' + esc(opts.compare[1]) + '"';
      var right = '<div class="game-when">' + whenHtml +
        (tv ? '<span class="tv">' + esc(tv) + "</span>" : "") +
        (opts.compare ? '<span class="vsbadge">Compare</span>' : "") + "</div>";
      return '<div class="' + cls + '"' + data + '><div class="game-num">' + label + "</div>" +
        '<div class="game-matchup">' + matchupHtml + "</div>" + right + "</div>";
    }
    function renderSchedule(s) {
      // SUPER_REGIONAL_UPGRADE: best-of-3 layout once the round has flipped.
      if (T.round === "super-regional") return renderSuperSchedule(s);

      // Match the published Friday game to a matchup by TEAMS, not by game
      // number — schedule.js numbers by time slot, the bracket by seed (G1=#1v#4).
      var d1byPair = {};
      ((window.SCHEDULES || {})[s.id] || []).forEach(function (gm) { d1byPair[pairKey(gm.a[0], gm.b[0])] = gm; });
      var br = window.resolveBracket ? window.resolveBracket(s.teams, bracketGames(s)) : { slots: [], champion: null };
      var simming = !!(LIVE.simSite && LIVE.simSite.siteId === s.id);
      var g6 = br.slots[5], g6Final = !!(g6 && g6.event && g6.event.state === "post");

      // champion banner + the Simulate control now live in showRegional (shared by both views).
      var html = '<div class="panel-title" style="margin-top:18px">Regional Schedule &mdash; Double Elimination</div>' +
        '<div class="sched-note">' + (simming
          ? 'Simulated regional &middot; <span class="todo">not a real result</span>'
          : 'Friday matchups, times (ET) &amp; TV as published &middot; live scores update automatically') + "</div>";

      var lastDay = null;
      br.slots.forEach(function (slot) {
        var g = slot.g, ev = slot.event;
        if (DAY_OF[g] !== lastDay) { html += '<div class="sched-day">' + DAY_OF[g] + "</div>"; lastDay = DAY_OF[g]; }
        var label = "G" + g;

        // G7 is conditional ("if necessary")
        if (g === 7) {
          if (!g6Final) { html += gameRow(label, "Time TBD", "", "<small>" + esc(NOTE_OF[7]) + "</small>", { tbd: true }); return; }
          if (!slot.necessary) { html += gameRow(label, "&mdash;", "", "<small>Not necessary &mdash; champion decided in Game 6</small>", { tbd: true }); return; }
        }

        var matchup;
        if (slot.teams) {
          var a = slot.teams[0], b = slot.teams[1];
          matchup =
            '<span class="sd">#' + slot.seeds[0] + "</span>" + '<a href="#/t/' + esc(a) + '">' + esc(team(a).name) + "</a>" +
            '<span class="vs">vs</span>' +
            '<span class="sd">#' + slot.seeds[1] + "</span>" + '<a href="#/t/' + esc(b) + '">' + esc(team(b).name) + "</a>" +
            (ELIM_OF[g] ? ' <span class="todo">Elimination</span>' : "");
        } else {
          matchup = "<small>" + esc(NOTE_OF[g]) + "</small>" + (ELIM_OF[g] ? ' <span class="todo">Elimination</span>' : "");
        }

        if (ev && ev.state !== "pre") {
          var sa = scoreFor(ev, slot.teams[0]), sb = scoreFor(ev, slot.teams[1]);
          var when = (ev.state === "in"
              ? '<span class="st-live">' + esc(ev.detail || "Live") + "</span> "
              : esc(ev.detail || "Final") + " ") +
            '<span class="score">' + (sa == null ? "-" : sa) + "&ndash;" + (sb == null ? "-" : sb) + "</span>";
          html += gameRow(label, when, "", matchup, { live: true, eventId: ev.id });
        } else if (g <= 2 && slot.teams) {
          // Friday pregame: published time/TV for THIS matchup + Compare link.
          var sg = d1byPair[pairKey(slot.teams[0], slot.teams[1])];
          html += gameRow(label, sg ? esc(sg.time) + " ET" : "Time TBD", sg ? sg.tv : "", matchup,
            { live: true, compare: [slot.teams[0], slot.teams[1]] });
        } else if (slot.teams) {
          // matchup known but not yet played
          html += gameRow(label, ev && ev.detail ? esc(ev.detail) : "Time TBD", "", matchup, { tbd: !ev });
        } else {
          html += gameRow(label, "Time TBD", "", matchup, { tbd: true });
        }
      });
      return html;
    }

    // SUPER_REGIONAL_UPGRADE: best-of-3 schedule. Built only after auto-advance;
    // wins are tallied from real finals between the two paired teams.
    function renderSuperSchedule(s) {
      var a = s.teams[0], b = s.teams[1];
      var games = bracketGames(s).slice().sort(function (x, y) { return (Date.parse(x.date) || 0) - (Date.parse(y.date) || 0); });
      var wins = {}; wins[a] = 0; wins[b] = 0;
      games.forEach(function (gm) {
        if (gm.state !== "post") return;
        var w = (gm.comps.find(function (c) { return c.winner; }) || {}).id;
        if (w != null && wins[w] != null) wins[w]++;
      });
      var champ = wins[a] >= 2 ? a : (wins[b] >= 2 ? b : null);
      var simming = !!(LIVE.simSite && LIVE.simSite.siteId === s.id);

      var html = "";
      if (champ) html += '<div class="champ-banner">&#127942; <b>' + esc(team(champ).name) + "</b> &mdash; advances to the College World Series" +
        (simming ? ' <span class="todo">Simulated</span>' : "") + "</div>";
      html += '<div class="panel-title" style="margin-top:22px">Super Regional &mdash; Best of 3</div>' +
        '<div class="sched-note">' + esc(team(a).name) + " " + wins[a] + " &ndash; " + wins[b] + " " + esc(team(b).name) +
        (simming ? ' &middot; <span class="todo">simulated</span>' : " &middot; first to two wins advances") + "</div>";
      for (var i = 0; i < 3; i++) {
        var ev = games[i], label = "G" + (i + 1);
        var matchup = '<a href="#/t/' + esc(a) + '">' + esc(team(a).name) + '</a><span class="vs">vs</span><a href="#/t/' + esc(b) + '">' + esc(team(b).name) + "</a>" +
          (i === 2 ? ' <span class="todo">If necessary</span>' : "");
        if (ev && ev.state !== "pre") {
          var sa = scoreFor(ev, a), sb = scoreFor(ev, b);
          var when = (ev.state === "in" ? '<span class="st-live">' + esc(ev.detail || "Live") + "</span> " : esc(ev.detail || "Final") + " ") +
            '<span class="score">' + (sa == null ? "-" : sa) + "&ndash;" + (sb == null ? "-" : sb) + "</span>";
          html += gameRow(label, when, "", matchup, { live: true, eventId: ev.id });
        } else {
          html += gameRow(label, "Time TBD", "", matchup, { tbd: true });
        }
      }
      return html;
    }

    // ---- regional bracket diagram (toggle alternative to the list) --------
    var FEEDER = { 3: ["Game 1 loser", "Game 2 loser"], 4: ["Game 1 winner", "Game 2 winner"], 5: ["Game 3 winner", "Game 4 loser"], 6: ["Game 4 winner", "Game 5 winner"], 7: ["Game 6 rematch", "if necessary"] };
    function eventWinner(ev, ids) {
      if (!ev || ev.state !== "post") return null;
      var w = (ev.comps.find(function (c) { return c.winner; }) || {}).id;
      if (!w && ids) { var s0 = scoreFor(ev, ids[0]), s1 = scoreFor(ev, ids[1]); if (s0 != null && s1 != null && s0 !== s1) w = s0 > s1 ? ids[0] : ids[1]; }
      return w || null;
    }
    function gameCard(slot, d1byPair) {
      var g = slot.g, ev = slot.event, label = "G" + g, attrs = "", clk = "";
      var winId = slot.teams ? eventWinner(ev, slot.teams) : null;
      var status;
      if (ev && ev.state !== "pre") {
        status = ev.state === "in" ? '<span class="st-live">' + esc(ev.detail || "Live") + "</span>" : esc(ev.detail || "Final");
        attrs = ' data-event="' + esc(ev.id) + '"'; clk = " bg-click";
      } else if (g <= 2 && slot.teams) {
        var sg = d1byPair[pairKey(slot.teams[0], slot.teams[1])];
        status = sg ? esc(sg.time) + " ET" : "Time TBD";
        attrs = ' data-a="' + esc(slot.teams[0]) + '" data-b="' + esc(slot.teams[1]) + '"'; clk = " bg-click";
      } else { status = slot.teams ? "Time TBD" : "&mdash;"; }
      function row(i) {
        if (!slot.teams) return '<div class="bg-team feeder">' + esc((FEEDER[g] || ["TBD", "TBD"])[i]) + "</div>";
        var id = slot.teams[i], sc = (ev && ev.state !== "pre") ? scoreFor(ev, id) : null;
        return '<div class="bg-team' + (winId === id ? " win" : "") + '"><span class="sd">#' + slot.seeds[i] + '</span>' +
          '<span class="bn">' + esc(team(id).name) + '</span><span class="sc">' + (sc == null ? "" : sc) + "</span></div>";
      }
      return '<div class="bg-card' + clk + (ELIM_OF[g] ? " elim" : "") + '"' + attrs + '>' +
        '<div class="bg-h">' + label + (ELIM_OF[g] ? " &middot; Elim" : "") + "</div>" +
        row(0) + row(1) + '<div class="bg-status">' + status + "</div></div>";
    }
    function renderRegionalBracket(s) {
      // SUPER_REGIONAL_UPGRADE: best-of-3 list is already the cleanest super view.
      if (T.round === "super-regional") return renderSuperSchedule(s);
      var d1byPair = {};
      ((window.SCHEDULES || {})[s.id] || []).forEach(function (gm) { d1byPair[pairKey(gm.a[0], gm.b[0])] = gm; });
      var br = window.resolveBracket(s.teams, bracketGames(s));
      var slot = function (n) { return br.slots[n - 1]; };
      var g6 = slot(6), g6Final = !!(g6.event && g6.event.state === "post");

      var html = '<div class="sched-note">Double elimination &middot; winners advance, two losses eliminate</div><div class="bracket">';
      html += '<div class="bk-sec"><div class="bk-title">Winners Bracket</div><div class="bk-rounds">' +
        '<div class="bk-col">' + gameCard(slot(1), d1byPair) + gameCard(slot(2), d1byPair) + "</div>" +
        '<div class="bk-col bk-mid">' + gameCard(slot(4), d1byPair) + "</div></div></div>";
      html += '<div class="bk-sec"><div class="bk-title">Elimination Bracket</div><div class="bk-rounds">' +
        '<div class="bk-col">' + gameCard(slot(3), d1byPair) + "</div>" +
        '<div class="bk-col bk-mid">' + gameCard(slot(5), d1byPair) + "</div></div></div>";
      var champHtml;
      if (g6Final && !slot(7).necessary) champHtml = gameCard(slot(6), d1byPair) + '<div class="bk-note">Game 7 not necessary</div>';
      else champHtml = gameCard(slot(6), d1byPair) + gameCard(slot(7), d1byPair);
      html += '<div class="bk-sec"><div class="bk-title">Championship</div><div class="bk-rounds">' +
        '<div class="bk-col bk-mid">' + champHtml + "</div></div></div>";
      return html + "</div>";
    }

    // ---- REGIONAL ---------------------------------------------------------
    function showRegional(siteId) {
      var s = siteById(siteId);
      if (!s) { location.hash = "#/"; return; }
      var host = team(s.hostTeamId);

      // SUPER_REGIONAL_UPGRADE: this team list renders 4 OR 2 teams — no change.
      // Regional seed (1-4) is the team's position within site.teams.
      var cards = s.teams.map(function (id, i) {
        var t = team(id);
        return (
          '<div class="team-card" data-team="' + esc(id) + '">' +
            seedChip(t) +
            '<div class="team-meta">' +
              '<div class="nm">' + esc(t.name) + (id === s.hostTeamId ? " &#9733;" : "") + "</div>" +
              '<div class="cf">' + esc(t.conference) + "</div>" +
              '<div class="reg-seed">Regional <b>No. ' + (i + 1) + "</b> seed</div>" +
              '<div class="rec">Record: ' + fmtRecord(t.record) + "</div>" +
            "</div>" +
          "</div>"
        );
      }).join("");

      var simming = !!(LIVE.simSite && LIVE.simSite.siteId === s.id);
      var champ = siteChampion(s);
      var banner = champ ? '<div class="champ-banner">&#127942; <b>' + esc(team(champ).name) + "</b> &mdash; " +
        esc(s.city) + " " + roundLabel() + " champion" + (simming ? ' <span class="todo">Simulated</span>' : "") + "</div>" : "";
      var controls = '<div class="reg-controls">' +
        '<div class="view-toggle"><button class="vt' + (regionalMode === "list" ? " on" : "") + '" data-mode="list">List</button>' +
        '<button class="vt' + (regionalMode === "bracket" ? " on" : "") + '" data-mode="bracket">Bracket</button></div>' +
        '<button class="sim-btn" data-sim="' + (simming ? "stop" : "start") + '" data-site="' + esc(s.id) + '">' +
          (simming ? "■ Stop sim" : "▶ Simulate this regional") + "</button></div>";
      var body = regionalMode === "bracket" ? renderRegionalBracket(s) : renderSchedule(s);
      render(document.getElementById("view-regional"),
        '<div class="section-head">' + esc(s.city) + " " + roundLabel() + "</div>" +
        '<div class="section-sub">Host: ' + esc(host.name) +
          (host.seed != null ? " &middot; National No. " + host.seed : "") +
          " &middot; " + esc(host.stadium.name) + "</div>" +
        '<div class="grid">' + cards + "</div>" + banner + controls + body);

      document.querySelectorAll("#view-regional .team-card").forEach(function (el) {
        el.addEventListener("click", function () { location.hash = "#/t/" + el.getAttribute("data-team"); });
      });
      document.querySelectorAll("#view-regional .game-row.has-live").forEach(function (el) {
        el.addEventListener("click", function (e) {
          if (e.target.closest("a")) return;          // let team-name links work
          location.hash = "#/g/" + el.getAttribute("data-event");
        });
      });
      document.querySelectorAll("#view-regional .game-row.has-compare").forEach(function (el) {
        el.addEventListener("click", function (e) {
          if (e.target.closest("a")) return;
          location.hash = "#/vs/" + el.getAttribute("data-a") + "/" + el.getAttribute("data-b");
        });
      });
      var simBtn = document.querySelector("#view-regional .sim-btn");
      if (simBtn) simBtn.addEventListener("click", function () {
        simBtn.getAttribute("data-sim") === "start" ? startRegionalSim(simBtn.getAttribute("data-site")) : stopRegionalSim();
      });
      document.querySelectorAll("#view-regional .view-toggle .vt").forEach(function (el) {
        el.addEventListener("click", function () { regionalMode = el.getAttribute("data-mode"); showRegional(s.id); });
      });
      document.querySelectorAll("#view-regional .bg-card[data-event]").forEach(function (el) {
        el.addEventListener("click", function () { location.hash = "#/g/" + el.getAttribute("data-event"); });
      });
      document.querySelectorAll("#view-regional .bg-card[data-a]").forEach(function (el) {
        el.addEventListener("click", function () { location.hash = "#/vs/" + el.getAttribute("data-a") + "/" + el.getAttribute("data-b"); });
      });

      setCrumbs([{ text: "Map", href: "#/" }, { text: s.city + " " + roundLabel() }], "#/");
      showView("regional");
    }

    // ---- TEAM -------------------------------------------------------------
    // Honest season narrative built ONLY from verified fields we already hold
    // (record / RPI / seed / conference / rate stats). Invents nothing; clauses
    // are omitted when a value is missing rather than printing a TBD mid-sentence.
    function seasonSummary(t) {
      var s = findSiteForTeam(t.id), ss = t.stats || {}, out = [];
      var rec = (t.record && t.record.w != null && t.record.l != null) ? (t.record.w + "–" + t.record.l) : null;
      var lead = esc(t.name) + (rec ? (" went " + rec) : " enters the 2026 NCAA Tournament");
      if (t.rpi != null) lead += " with a No. " + t.rpi + " RPI";
      lead += " out of the " + esc(t.conference);
      if (s) lead += (t.seed != null)
        ? (", earning the national No. " + t.seed + " overall seed and hosting the " + esc(s.city) + " " + roundLabel() + ".")
        : (", reaching the " + esc(s.city) + " " + roundLabel() + ".");
      else lead += ".";
      out.push(lead);
      var off = [];
      if (ss.runs != null) off.push(esc(ss.runs) + " runs");
      if (ss.battingAvg != null) off.push("a " + esc(ss.battingAvg) + " team average");
      if (off.length) out.push("The offense produced " + off.join(" at ") + ".");
      var d = [];
      if (ss.era != null) d.push("a " + esc(ss.era) + " ERA");
      if (ss.runsAllowed != null) d.push(esc(ss.runsAllowed) + " runs allowed");
      if (ss.sos != null) d.push("a No. " + esc(ss.sos) + " strength of schedule");
      if (d.length) out.push("On the other side of the ball: " + d.join(", ") + ".");
      return out.join(" ");
    }

    function showTeam(teamId) {
      var t = team(teamId);
      if (!t) { location.hash = "#/"; return; }
      var s = findSiteForTeam(teamId);

      var statCells = [
        ["Record", fmtRecord(t.record)],
        ["RPI", fmt(t.rpi)],
        ["Nat. Seed", t.seed != null ? "No. " + t.seed : '<span class="todo">Unseeded</span>'],
        ["Runs", fmt(t.stats.runs)],
        ["Runs Allowed", fmt(t.stats.runsAllowed)],
        ["Batting Avg", fmt(t.stats.battingAvg)],
        ["Team ERA", fmt(t.stats.era)],
        ["Strength of Sched.", fmt(t.stats.sos)]
      ].map(function (p) {
        return '<div class="stat"><div class="lbl">' + p[0] + '</div><div class="val">' + p[1] + "</div></div>";
      }).join("");

      var rows = t.players.map(function (p) {
        return "<tr><td class='pos'>" + fmt(p.pos) + "</td><td>" + fmt(p.name) +
               "</td><td>" + fmt(p.line) + "</td></tr>";
      }).join("");

      render(document.getElementById("view-team"),
        '<div class="team-hero">' +
          seedChip(t) +
          "<div>" +
            "<h2>" + esc(t.name) + "</h2>" +
            '<div class="sub">' + esc(t.conference) +
              (s ? " &middot; " + esc(s.city) + " " + roundLabel() : "") + "</div>" +
          "</div>" +
        "</div>" +
        '<div class="panel-title">2026 Season</div>' +
        '<p class="blurb">' + seasonSummary(t) + (t.seasonNote ? " " + esc(t.seasonNote) : "") + "</p>" +
        '<div class="panel-title">Team Stats</div>' +
        '<div class="stat-grid">' + statCells + "</div>" +
        '<div class="panel-title">Key Players</div>' +
        '<table class="players"><thead><tr><th>Pos</th><th>Player</th><th>Stat line</th></tr></thead><tbody>' +
          rows +
        "</tbody></table>" +
        '<div class="btn-row">' +
          '<a class="btn primary" href="#/s/' + esc(teamId) + '">&#9971; Home Stadium &amp; About</a>' +
          (s ? '<a class="btn" href="#/r/' + esc(s.id) + '">&larr; Back to ' + esc(s.city) + " " + roundLabel() + "</a>" : "") +
        "</div>");

      var crumbs = [{ text: "Map", href: "#/" }];
      if (s) crumbs.push({ text: s.city + " " + roundLabel(), href: "#/r/" + s.id });
      crumbs.push({ text: t.name });
      setCrumbs(crumbs, s ? "#/r/" + s.id : "#/");
      showView("team");
    }

    // ---- STADIUM ----------------------------------------------------------
    function showStadium(teamId) {
      var t = team(teamId);
      if (!t) { location.hash = "#/"; return; }
      var st = t.stadium;
      var s = findSiteForTeam(teamId);
      var capacity = (st.capacity != null) ? esc(st.capacity.toLocaleString()) : '<span class="todo">TBD</span>';

      // Real Wikimedia photo + attribution when available; placeholder otherwise.
      var photo = (window.STADIUM_PHOTOS || {})[teamId];
      var photoBlock;
      if (photo) {
        var credit = "Photo: " + esc(photo.by);
        if (photo.license) {
          credit += " &middot; " + (photo.licenseUrl
            ? '<a href="' + photo.licenseUrl + '" target="_blank" rel="noopener">' + esc(photo.license) + "</a>"
            : esc(photo.license));
        }
        if (photo.source) credit += ' &middot; <a href="' + photo.source + '" target="_blank" rel="noopener">Wikimedia</a>';
        photoBlock = '<figure class="stadium-photo">' +
          '<img src="' + esc(photo.file) + '" alt="' + esc(st.name) + '" loading="lazy">' +
          "<figcaption>" + credit + "</figcaption></figure>";
      } else {
        photoBlock = '<div class="photo-ph"><div>' +
          '<span class="todo">Photo TBD</span>' +
          '<div class="cap">// TODO: add a stadium photo</div>' +
          "</div></div>";
      }

      // A few key players as flavor on the "about the team" side.
      var miniPlayers = t.players.slice(0, 3).map(function (p) {
        return '<li><span class="mp-pos">' + fmt(p.pos) + '</span><span class="mp-name">' + fmt(p.name) +
               '</span><span class="mp-line">' + fmt(p.line) + "</span></li>";
      }).join("");

      render(document.getElementById("view-stadium"),
        '<div class="section-head">' + esc(st.name) + "</div>" +
        '<div class="section-sub">Home of ' + esc(t.name) + " &middot; " + esc(t.conference) + "</div>" +
        '<div class="stadium-wrap">' +
          "<div>" +
            photoBlock +
            '<ul class="stadium-facts">' +
              '<li><span class="k">Capacity</span><span class="v">' + capacity + "</span></li>" +
              '<li><span class="k">Location</span><span class="v">' + esc(st.city) + ", " + esc(st.state) + "</span></li>" +
              '<li><span class="k">Opened</span><span class="v">' + fmt(st.opened) + "</span></li>" +
              '<li><span class="k">Conference</span><span class="v">' + esc(t.conference) + "</span></li>" +
            "</ul>" +
          "</div>" +
          "<div>" +
            '<div class="panel-title">History</div>' +
            '<p class="blurb">' + esc(st.blurb) + "</p>" +
            '<div class="panel-title">About ' + esc(t.name) + "</div>" +
            '<p class="blurb">' + seasonSummary(t) + (t.seasonNote ? " " + esc(t.seasonNote) : "") + "</p>" +
            '<ul class="mini-players">' + miniPlayers + "</ul>" +
            '<div class="btn-row">' +
              '<a class="btn primary" href="#/t/' + esc(teamId) + '">&larr; Back to ' + esc(t.name) + "</a>" +
              (s ? '<a class="btn" href="#/r/' + esc(s.id) + '">' + esc(s.city) + " " + roundLabel() + " &rarr;</a>" : "") +
            "</div>" +
          "</div>" +
        "</div>");

      var crumbs = [{ text: "Map", href: "#/" }];
      if (s) crumbs.push({ text: s.city + " " + roundLabel(), href: "#/r/" + s.id });
      crumbs.push({ text: t.name, href: "#/t/" + teamId });
      crumbs.push({ text: st.name });
      setCrumbs(crumbs, "#/t/" + teamId);
      showView("stadium");
    }

    // ---- MATCHUP COMPARISON (pregame head-to-head) ------------------------
    function showCompare(idA, idB) {
      var a = team(idA), b = team(idB);
      if (!a || !b) { location.hash = "#/"; return; }
      var site = findSiteForTeam(idA);
      function val(x) { return (x === null || x === undefined || x === "") ? null : x; }
      function pct(r) { return (r && r.w != null && r.l != null && (r.w + r.l) > 0) ? r.w / (r.w + r.l) : null; }
      function avgNum(s) { if (s == null || s === "") return null; var f = parseFloat(s); return isNaN(f) ? null : f; }
      function regSeed(t) { return site ? site.teams.indexOf(t.id) + 1 : null; }

      // Friday game context (time/TV) if this pairing is a scheduled game.
      var gctx = "";
      if (site) (window.SCHEDULES || {})[site.id] && (window.SCHEDULES[site.id]).forEach(function (gm) {
        var ids = [gm.a[0], gm.b[0]];
        if (ids.indexOf(idA) >= 0 && ids.indexOf(idB) >= 0) gctx = " &middot; Game " + gm.g + " &middot; Fri " + esc(gm.time) + " ET" + (gm.tv ? " &middot; " + esc(gm.tv) : "");
      });

      var seedDisp = function (t) { return t.seed != null ? "No. " + t.seed : '<span class="todo">Unseeded</span>'; };
      var rows = [
        ["National Seed", seedDisp(a), seedDisp(b), val(a.seed), val(b.seed), "low"],
        ["Record", fmtRecord(a.record), fmtRecord(b.record), pct(a.record), pct(b.record), "high"],
        ["RPI", fmt(a.rpi), fmt(b.rpi), val(a.rpi), val(b.rpi), "low"],
        ["Runs Scored", fmt(a.stats.runs), fmt(b.stats.runs), val(a.stats.runs), val(b.stats.runs), "high"],
        ["Runs Allowed", fmt(a.stats.runsAllowed), fmt(b.stats.runsAllowed), val(a.stats.runsAllowed), val(b.stats.runsAllowed), "low"],
        ["Batting Avg", fmt(a.stats.battingAvg), fmt(b.stats.battingAvg), avgNum(a.stats.battingAvg), avgNum(b.stats.battingAvg), "high"],
        ["Team ERA", fmt(a.stats.era), fmt(b.stats.era), val(a.stats.era), val(b.stats.era), "low"],
        ["Strength of Sched.", fmt(a.stats.sos), fmt(b.stats.sos), val(a.stats.sos), val(b.stats.sos), "low"],
      ];
      var rowsHtml = rows.map(function (r) {
        var dispA = r[1], dispB = r[2], cmpA = r[3], cmpB = r[4], better = r[5], winA = false, winB = false;
        if (cmpA != null && cmpB != null && cmpA !== cmpB) { var aw = better === "high" ? cmpA > cmpB : cmpA < cmpB; winA = aw; winB = !aw; }
        return "<tr><td class='cv" + (winA ? " win" : "") + "'>" + dispA + "</td><td class='cl'>" + r[0] +
          "</td><td class='cv" + (winB ? " win" : "") + "'>" + dispB + "</td></tr>";
      }).join("");

      function plist(t) {
        return t.players.map(function (p) {
          return '<div class="cmp-pl"><span class="pos">' + fmt(p.pos) + '</span><span class="pn">' + fmt(p.name) +
            '</span><span class="ln">' + fmt(p.line) + "</span></div>";
        }).join("");
      }
      function teamCol(t, side) {
        return '<div class="cmp-team' + (side === "r" ? " right" : "") + '">' + seedChip(t) +
          "<div><div class='nm'>" + esc(t.name) + "</div><div class='cf'>" + esc(t.conference) +
          " &middot; Reg #" + regSeed(t) + "</div></div></div>";
      }
      // Live betting odds for this matchup (real DraftKings lines via ESPN; honest "—" when not posted).
      function oddsPanel() {
        var ev = (LIVE.byPair && LIVE.byPair[pairKey(idA, idB)]) || null;
        var od = ev && ev.odds;
        if (!od) return '<div class="cmp-odds none"><span class="co-h">Odds</span><span class="co-na">Not posted yet</span></div>';
        function line(t, id) {
          var ml = od.byTeam[id];
          return '<div class="co-row"><span class="co-t">' + esc(t.name) + (od.favoriteId === id ? ' <span class="co-fav">FAV</span>' : "") +
            '</span><span class="co-v">' + (ml ? esc(ml) : "&mdash;") + "</span></div>";
        }
        var extra = "";
        if (od.spread != null) extra += '<span class="co-x">Spread ' + esc(od.spread) + "</span>";
        if (od.overUnder != null) extra += '<span class="co-x">O/U ' + esc(od.overUnder) + "</span>";
        return '<div class="cmp-odds"><div class="co-head"><span class="co-h">Moneyline</span>' + extra + "</div>" +
          line(a, idA) + line(b, idB) +
          '<div class="co-foot">Odds: ' + esc(od.provider) + " via ESPN &middot; for entertainment only &middot; 21+, gamble responsibly</div></div>";
      }

      render(document.getElementById("view-compare"),
        '<div class="section-head">' + esc(a.name) + " vs " + esc(b.name) + "</div>" +
        '<div class="section-sub">' + (site ? esc(site.city) + " " + roundLabel() : "") + gctx + "</div>" +
        '<div class="cmp-head">' + teamCol(a, "l") + '<div class="cmp-vs">VS</div>' + teamCol(b, "r") + "</div>" +
        oddsPanel() +
        '<table class="cmp-table"><tbody>' + rowsHtml + "</tbody></table>" +
        '<div class="cmp-players">' +
          "<div><div class='panel-title'>" + esc(a.name) + " &mdash; Key Players</div>" + plist(a) + "</div>" +
          "<div><div class='panel-title'>" + esc(b.name) + " &mdash; Key Players</div>" + plist(b) + "</div>" +
        "</div>" +
        '<div class="btn-row">' +
          '<a class="btn" href="#/t/' + esc(idA) + '">' + esc(a.name) + " Profile</a>" +
          '<a class="btn" href="#/t/' + esc(idB) + '">' + esc(b.name) + " Profile</a>" +
          (site ? '<a class="btn" href="#/r/' + esc(site.id) + '">&larr; ' + esc(site.city) + " " + roundLabel() + "</a>" : "") +
        "</div>");

      // Context-aware "back": if we arrived from the Daily Pick'em grid, return
      // there; otherwise fall back to the regional (the matchup's home), else Map.
      var fromGames = navPrevHash.indexOf("#/games") === 0;
      var crumbs = [{ text: "Map", href: "#/" }];
      var backHash;
      if (fromGames) { crumbs.push({ text: "Daily Pick'em", href: "#/games" }); backHash = "#/games"; }
      else if (site) { crumbs.push({ text: site.city + " " + roundLabel(), href: "#/r/" + site.id }); backHash = "#/r/" + site.id; }
      else { backHash = "#/"; }
      crumbs.push({ text: a.name + " vs " + b.name });
      setCrumbs(crumbs, backHash);
      showView("compare");
    }

    // ======================================================================
    // LIVE SCORES — self-updating from ESPN's public college-baseball feed.
    // The feed sends Access-Control-Allow-Origin: *, so this static page can
    // poll it directly (no backend). Games flow Upcoming -> Live -> Final on
    // their own. Today there are none (field just set); first pitch is May 29.
    // SUPER_REGIONAL_UPGRADE: add the super-regional dates to TOURNEY_DATES.
    // ======================================================================
    var ESPN = "https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball";
    var POLL_MS = 30000;
    var TOURNEY_DATES = ["20260529", "20260530", "20260531", "20260601"];
    var LIVE = { list: [], byPair: {}, bySite: {}, activeDate: null, updated: null, loading: false, demo: null, demoTimer: null, simSite: null, simTimer: null };
    // Private-league backend (Session 14). Empty string = feature OFF (the app is
    // fully static without it). Set to the deployed Cloudflare Worker URL to enable.
    var LEAGUE_API = "https://cws-map-leagues.tyler-696.workers.dev";
    function leaguesEnabled() { return !!LEAGUE_API; }

    function normName(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, ""); }
    var FIELD_NORM = (function () { var m = {}; Object.keys(T.teams).forEach(function (id) { m[id] = normName(T.teams[id].name); }); return m; })();
    function matchTeamId(espnTeam) {
      if (!espnTeam) return null;
      var cands = [espnTeam.location, espnTeam.displayName, espnTeam.shortDisplayName, espnTeam.name]
        .filter(Boolean).map(normName);
      var best = null;
      for (var id in FIELD_NORM) {
        var nn = FIELD_NORM[id];
        for (var i = 0; i < cands.length; i++) {
          var c = cands[i];
          if (c === nn) return id;
          if (nn && (nn.indexOf(c) >= 0 || c.indexOf(nn) >= 0) && Math.abs(nn.length - c.length) <= 12) best = best || id;
        }
      }
      return best;
    }
    function pairKey(a, b) { return [a, b].sort().join("|"); }
    function ymd(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0"); }
    function dateLabel(s) { var y = +s.slice(0, 4), m = +s.slice(4, 6) - 1, d = +s.slice(6, 8); return new Date(y, m, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
    function timeAgo(dt) { var s = Math.round((Date.now() - dt.getTime()) / 1000); return s < 10 ? "just now" : s < 60 ? s + "s ago" : Math.round(s / 60) + "m ago"; }

    function liveForPair(a, b) {
      if (LIVE.demo && LIVE.demo.pair === pairKey(a, b)) return LIVE.demo;
      return LIVE.byPair[pairKey(a, b)] || null;
    }
    function scoreFor(g, teamId) { for (var i = 0; i < g.comps.length; i++) if (g.comps[i].id === teamId) return g.comps[i].score; return null; }
    function liveTeamName(c) { return c.id && team(c.id) ? team(c.id).name : c.name; }

    function parseEvent(ev) {
      try {
        var comp = ev.competitions[0], st = (ev.status && ev.status.type) || {};
        var comps = comp.competitors.map(function (c) {
          return {
            id: matchTeamId(c.team),
            name: (c.team && (c.team.location || c.team.displayName)) || "?",
            score: (c.score != null && c.score !== "") ? parseInt(c.score, 10) : null,
            home: c.homeAway === "home", winner: !!c.winner,
          };
        });
        var ids = comps.map(function (c) { return c.id; }).filter(Boolean);
        if (ids.length !== 2) return null; // only games between two teams in our field
        return { id: ev.id, state: st.state || "pre", detail: st.shortDetail || st.detail || "", date: ev.date, comps: comps, pair: pairKey(ids[0], ids[1]), odds: parseOdds(comp.odds, comps) };
      } catch (e) { return null; }
    }
    // ESPN betting odds for a game (real DraftKings lines via ESPN). Honest: any
    // "OFF"/missing line is dropped — nothing is invented. Maps moneyline to OUR teamIds.
    function parseOdds(arr, comps) {
      var o = (arr && arr[0]) || null;
      if (!o) return null;
      var clean = function (v) { return (v == null || v === "OFF" || v === "") ? null : v; };
      var ml = o.moneyline || {}, home = null, away = null;
      comps.forEach(function (c) { if (c.home) home = c; else away = c; });
      var byTeam = {};
      var hml = clean(ml.home && ml.home.close && ml.home.close.odds);
      var aml = clean(ml.away && ml.away.close && ml.away.close.odds);
      if (home && home.id && hml) byTeam[home.id] = hml;
      if (away && away.id && aml) byTeam[away.id] = aml;
      var favId = null;
      if (o.homeTeamOdds && o.homeTeamOdds.favorite && home) favId = home.id;
      else if (o.awayTeamOdds && o.awayTeamOdds.favorite && away) favId = away.id;
      var od = {
        provider: (o.provider && o.provider.displayName) || "DraftKings",
        details: clean(o.details), favoriteId: favId, byTeam: byTeam,
        spread: (typeof o.spread === "number" && o.spread !== 0) ? o.spread : null,
        overUnder: (typeof o.overUnder === "number") ? o.overUnder : null,
      };
      od.hasAny = !!(od.details || Object.keys(byTeam).length || od.spread != null || od.overUnder != null);
      return od.hasAny ? od : null;
    }

    function espnScoreboard(date) {
      return fetch(ESPN + "/scoreboard?dates=" + date + "&limit=400", { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("sb " + r.status); return r.json(); });
    }

    // The site (regional or super-regional) a game belongs to: both teams in it.
    function siteForGame(g) {
      var ids = g.comps.map(function (c) { return c.id; });
      return T.sites.find(function (s) { return ids.every(function (id) { return id && s.teams.indexOf(id) >= 0; }); });
    }

    // Fetch every tournament date, aggregate events per site (so the whole
    // bracket is visible — not just one day), and pick an "active date" for the
    // scoreboard (today if it has games, else the next slate). ≤ TOURNEY_DATES
    // requests per poll.
    function refresh() {
      if (LIVE.loading) return; LIVE.loading = true;
      var dates = TOURNEY_DATES.slice();
      Promise.all(dates.map(function (d) {
        return espnScoreboard(d)
          .then(function (data) { return { date: d, games: (data.events || []).map(parseEvent).filter(Boolean) }; })
          .catch(function () { return { date: d, games: [] }; });
      })).then(function (results) {
        // group all events by their site
        var bySite = {};
        results.forEach(function (r) {
          r.games.forEach(function (g) {
            var s = siteForGame(g);
            if (s) (bySite[s.id] = bySite[s.id] || []).push(g);
          });
        });
        LIVE.bySite = bySite;

        // scoreboard active date: today if it has games, else first date with a
        // not-yet-final game (upcoming), else first with any games.
        var today = ymd(new Date());
        var pick = results.find(function (r) { return r.date === today && r.games.length; })
          || results.find(function (r) { return r.games.length && r.games.some(function (g) { return g.state !== "post"; }); })
          || results.find(function (r) { return r.games.length; })
          || { date: today, games: [] };
        LIVE.activeDate = pick.date; LIVE.list = pick.games; LIVE.byPair = {};
        pick.games.forEach(function (g) { LIVE.byPair[g.pair] = g; });

        LIVE.updated = new Date(); LIVE.loading = false;
        maybeAdvanceToSuperRegionals();
        onLiveUpdate();
      }).catch(function () { LIVE.loading = false; });
    }

    function onLiveUpdate() {
      var hash = location.hash || "#/";
      if (hash === "#/" || hash === "") { renderScoreboard(); if (map && markersLayer) renderMarkers(); if (mapMode === "list") renderSiteList(); }
      else if (hash.indexOf("#/r/") === 0) { var s = siteById(hash.slice(4)); if (s) showRegional(s.id); }
      else if (hash.indexOf("#/g/") === 0) {
        var id = hash.slice(4);
        if (id === "demo") { if (LIVE.demo) renderGameDetail(document.getElementById("view-game"), demoSummary()); }
        else refreshOpenGame(id); // live re-fetch of a real game on the 30s poll
      }
      else if (hash.indexOf("#/games") === 0) showGamePicks();   // finals/locks update live
    }

    // ---- scoreboard (home screen) ----------------------------------------
    function sbCard(g) {
      var a = g.comps[0], b = g.comps[1];
      var showScore = g.demo || g.state === "in" || g.state === "post";
      var both = showScore && a.score != null && b.score != null;
      var stat;
      if (g.state === "in" || g.demo) stat = (g.demo ? "" : '<span class="dot"></span>') + '<span class="live">LIVE</span> ' + esc(g.detail || "");
      else if (g.state === "post") stat = '<span class="final">' + esc(g.detail || "Final") + "</span>";
      else stat = esc(g.detail || "Upcoming");
      function row(c) {
        var lead = both && a.score !== b.score && c.score === Math.max(a.score, b.score);
        return '<div class="sb-team' + (lead ? " lead" : "") + '"><span class="nm">' + esc(liveTeamName(c)) +
          '</span><span class="sc">' + (showScore && c.score != null ? c.score : "") + "</span></div>";
      }
      return '<div class="sb-card' + (g.demo ? " demo" : "") + '" data-id="' + esc(g.id) +
        '" data-state="' + esc(g.state || "") + '" data-a="' + esc(a.id || "") + '" data-b="' + esc(b.id || "") + '">' +
        (g.demo ? '<span class="demo-tag">SIM</span>' : "") +
        '<div class="sb-status">' + stat + "</div>" + row(a) + row(b) + "</div>";
    }
    function renderScoreboard() {
      var el = document.getElementById("scoreboard"); if (!el) return;
      var games = LIVE.list.slice();
      if (LIVE.demo) games = [LIVE.demo].concat(games);
      var liveCount = games.filter(function (g) { return g.state === "in" || g.demo; }).length;
      var title = liveCount ? '<span class="dot"></span> Live Scores' : "Scores";
      var meta = !LIVE.updated ? "Loading…"
        : (games.length ? dateLabel(LIVE.activeDate) + (liveCount ? " · " + liveCount + " live" : "") + " · updated " + timeAgo(LIVE.updated)
                        : "Updated " + timeAgo(LIVE.updated));
      var demoBtn = LIVE.demo ? '<button data-demo="stop">■ Stop demo</button>' : '<button data-demo="start">▶ Simulate a live game</button>';
      var head = '<div class="sb-head"><span class="sb-title">' + title + '</span><span class="sb-meta">' + esc(meta) +
        '</span><span class="sb-demo">' + demoBtn + "</span></div>";
      var body = games.length
        ? '<div class="sb-rail">' + games.map(sbCard).join("") + "</div>"
        : (LIVE.updated ? '<div class="sb-empty">No games yet — first pitch Friday, May 29. Scores will appear here automatically.</div>'
                        : '<div class="sb-empty">Loading scores…</div>');
      var simBanner = LIVE.simAll ? '<div class="sim-banner">&#9888; Simulation mode &mdash; not real results</div>' : "";
      render(el, simBanner + head + body);
      // Click handling is delegated once (see wireScoreboard) so it survives
      // the frequent re-renders the polling/demo loops trigger.
    }
    // One delegated listener on the container — robust to card re-renders.
    function wireScoreboard() {
      var el = document.getElementById("scoreboard");
      if (!el || el.__wired) return;
      el.__wired = true;
      el.addEventListener("click", function (e) {
        var btn = e.target.closest(".sb-demo button");
        if (btn) { btn.getAttribute("data-demo") === "start" ? startDemo() : stopDemo(); return; }
        var card = e.target.closest(".sb-card");
        if (card) {
          var st = card.getAttribute("data-state"), ca = card.getAttribute("data-a"), cb = card.getAttribute("data-b");
          // Pregame -> head-to-head comparison; live/final -> box score.
          if (st === "pre" && ca && cb) location.hash = "#/vs/" + ca + "/" + cb;
          else if (card.getAttribute("data-id")) location.hash = "#/g/" + card.getAttribute("data-id");
        }
      });
    }

    // ---- game detail view -------------------------------------------------
    // curated columns kept from ESPN's box-score label sets (stable by name)
    var BAT_COLS = ["AB", "R", "H", "RBI", "HR", "BB", "K", "AVG"];
    var PIT_COLS = ["IP", "H", "R", "ER", "BB", "K", "ERA"];
    function pickCols(labels, want) {
      return want.map(function (w) { return { label: w, idx: (labels || []).indexOf(w) }; }).filter(function (c) { return c.idx >= 0; });
    }
    function parseBox(d) {
      return (((d.boxscore || {}).players) || []).map(function (g) {
        var out = { teamId: matchTeamId(g.team), name: (g.team && (g.team.displayName || g.team.location)) || "?", batting: null, pitching: null };
        (g.statistics || []).forEach(function (st) {
          var cols = pickCols(st.labels, st.type === "batting" ? BAT_COLS : PIT_COLS);
          var rows = (st.athletes || []).map(function (a) {
            return { name: (a.athlete && (a.athlete.shortName || a.athlete.displayName)) || "?", stats: cols.map(function (c) { return (a.stats || [])[c.idx]; }) };
          }).filter(function (r) { return r.name !== "?"; });
          if (st.type === "batting") out.batting = { cols: cols.map(function (c) { return c.label; }), rows: rows };
          else if (st.type === "pitching") out.pitching = { cols: cols.map(function (c) { return c.label; }), rows: rows };
        });
        return out;
      }).filter(function (b) { return b.batting || b.pitching; });
    }
    function parseScoringPlays(d) {
      return (d.plays || []).filter(function (p) { return p.scoringPlay; }).map(function (p) {
        var per = p.period || {};
        return { inn: (per.type === "Top" ? "T" : "B") + (per.number || ""), text: p.text || "", away: p.awayScore, home: p.homeScore };
      }).slice(-15);
    }
    function parseSituation(d, state) {
      if (state !== "in") return null;
      var comp = ((d.header || {}).competitions || [{}])[0];
      var s = comp.situation || d.situation;
      if (!s) {
        var plays = d.plays || [], lp = plays[plays.length - 1];
        if (!lp) return null;
        s = { balls: (lp.resultCount || {}).balls, strikes: (lp.resultCount || {}).strikes, outs: lp.outs, onFirst: lp.onFirst, onSecond: lp.onSecond, onThird: lp.onThird };
      }
      var nm = function (x) { return x && x.athlete && (x.athlete.shortName || x.athlete.displayName) || null; };
      return { balls: s.balls, strikes: s.strikes, outs: s.outs, first: !!s.onFirst, second: !!s.onSecond, third: !!s.onThird, batter: nm(s.batter), pitcher: nm(s.pitcher) };
    }
    function parseSummary(d, eventId) {
      var comp = ((d.header || {}).competitions || [{}])[0], st = (comp.status && comp.status.type) || {};
      var state = st.state || "pre";
      var teams = (comp.competitors || []).map(function (c) {
        return {
          id: matchTeamId(c.team), name: (c.team && (c.team.displayName || c.team.location)) || "?",
          score: c.score != null ? +c.score : null,
          innings: (c.linescores || []).map(function (x) { return x.value; }),
          hits: c.hits, errors: c.errors, home: c.homeAway === "home",
        };
      });
      return {
        id: eventId, state: state, detail: st.shortDetail || st.detail || "", teams: teams, demo: false,
        situation: parseSituation(d, state), scoringPlays: parseScoringPlays(d), box: parseBox(d),
      };
    }

    function outsDots(n) {
      n = n || 0; var o = "";
      for (var i = 0; i < 3; i++) o += '<span class="odot' + (i < n ? " on" : "") + '"></span>';
      return o;
    }
    function baseDiamond(s) {
      return '<div class="diamond">' +
        '<span class="base second' + (s.second ? " on" : "") + '"></span>' +
        '<span class="base third' + (s.third ? " on" : "") + '"></span>' +
        '<span class="base first' + (s.first ? " on" : "") + '"></span></div>';
    }
    function boxStatTable(t) {
      var head = '<tr><th class="pl">Player</th>' + t.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr>";
      var body = t.rows.map(function (r) {
        return '<tr><td class="pl">' + esc(r.name) + "</td>" + r.stats.map(function (v) { return "<td>" + (v == null || v === "" ? "" : esc(String(v))) + "</td>"; }).join("") + "</tr>";
      }).join("");
      return '<table class="box-table"><thead>' + head + "</thead><tbody>" + body + "</tbody></table>";
    }
    function renderGameDetail(box, g) {
      if (!g || g.teams.length < 2) { render(box, '<div class="section-head">Game</div><div class="gd-note">No data for this game.</div>'); return; }
      var a = g.teams[0], b = g.teams[1];
      var statusHtml = g.state === "in"
        ? '<span class="dot"></span><span class="live">LIVE</span> ' + esc(g.detail || "")
        : esc(g.detail || (g.state === "post" ? "Final" : "Upcoming"));
      var nInn = Math.max(a.innings.length, b.innings.length, 9);
      var hasInn = a.innings.concat(b.innings).some(function (v) { return v != null; });
      function nameCell(t) {
        var nm = t.id && team(t.id) ? '<a href="#/t/' + esc(t.id) + '">' + esc(team(t.id).name) + "</a>" : esc(t.name);
        return '<td class="team">' + nm + "</td>";
      }
      function inningCells(t) {
        if (!hasInn) return "";
        var out = "";
        for (var i = 0; i < nInn; i++) out += "<td>" + (t.innings[i] == null ? "" : t.innings[i]) + "</td>";
        return out;
      }
      function rheCells(t) {
        return '<td class="rhe">' + (t.score == null ? "-" : t.score) + "</td><td>" + (t.hits == null ? "-" : t.hits) + "</td><td>" + (t.errors == null ? "-" : t.errors) + "</td>";
      }
      var head = "<tr><th>Team</th>";
      if (hasInn) for (var i = 1; i <= nInn; i++) head += "<th>" + i + "</th>";
      head += "<th>R</th><th>H</th><th>E</th></tr>";
      var title = (a.id && team(a.id) ? team(a.id).name : a.name) + " vs " + (b.id && team(b.id) ? team(b.id).name : b.name);

      var html = '<div class="gd-status">' + statusHtml + (g.demo ? ' <span class="todo">Simulated</span>' : "") + "</div>" +
        '<div class="section-head">' + esc(title) + "</div>";

      // live situation strip
      var sit = g.situation;
      if (sit && g.state === "in") {
        html += '<div class="situation">' +
          '<div class="sit-col"><div class="sit-v">' + (sit.balls == null ? "0" : sit.balls) + "&ndash;" + (sit.strikes == null ? "0" : sit.strikes) + '</div><div class="sit-l">Count</div></div>' +
          '<div class="sit-col"><div class="sit-v">' + outsDots(sit.outs) + '</div><div class="sit-l">Outs</div></div>' +
          baseDiamond(sit) +
          '<div class="sit-bp">' + (sit.batter ? '<div><span class="sit-l">AB</span> ' + esc(sit.batter) + "</div>" : "") +
            (sit.pitcher ? '<div><span class="sit-l">P</span> ' + esc(sit.pitcher) + "</div>" : "") + "</div>" +
          "</div>";
      }

      html += '<table class="linescore"><thead>' + head + "</thead><tbody>" +
        "<tr>" + nameCell(a) + inningCells(a) + rheCells(a) + "</tr>" +
        "<tr>" + nameCell(b) + inningCells(b) + rheCells(b) + "</tr>" +
        "</tbody></table>";

      // scoring plays
      if (g.scoringPlays && g.scoringPlays.length) {
        html += '<div class="panel-title">Scoring Plays</div><div class="plays">' +
          g.scoringPlays.map(function (p) {
            return '<div class="play"><span class="pinn">' + esc(p.inn) + '</span><span class="ptext">' + esc(p.text) +
              '</span><span class="pscore">' + (p.away == null ? "" : p.away) + "&ndash;" + (p.home == null ? "" : p.home) + "</span></div>";
          }).join("") + '</div><div class="plays-legend">score shown away&ndash;home</div>';
      }

      // per-player box score (collapsible per team)
      if (g.box && g.box.length) {
        html += '<div class="panel-title">Box Score</div>';
        g.box.forEach(function (bx) {
          var nm = bx.teamId && team(bx.teamId) ? team(bx.teamId).name : bx.name;
          html += '<details class="boxteam" open><summary>' + esc(nm) + "</summary>" +
            (bx.batting ? '<div class="box-sub">Batting</div>' + boxStatTable(bx.batting) : "") +
            (bx.pitching ? '<div class="box-sub">Pitching</div>' + boxStatTable(bx.pitching) : "") +
            "</details>";
        });
      }

      html += '<div class="gd-note">' + (g.demo
          ? "Simulated game for preview — not a real result."
          : "Live box score via ESPN · updates while you watch") + "</div>" +
        '<div class="btn-row"><a class="btn" href="#/">&larr; Back to scores</a></div>';
      render(box, html);
    }
    function showGame(eventId) {
      setCrumbs([{ text: "Map", href: "#/" }, { text: "Game" }], "#/");
      showView("game");
      var box = document.getElementById("view-game");
      if (eventId === "demo") { if (LIVE.demo) renderGameDetail(box, demoSummary()); else location.hash = "#/"; return; }
      render(box, '<div class="section-head">Game</div><div class="gd-note">Loading box score…</div>');
      fetch(ESPN + "/summary?event=" + encodeURIComponent(eventId), { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (d) { if ((location.hash || "") === "#/g/" + eventId) renderGameDetail(box, parseSummary(d, eventId)); })
        .catch(function () { render(box, '<div class="section-head">Game</div><div class="gd-note">Couldn’t load this game right now.</div><div class="btn-row"><a class="btn" href="#/">&larr; Back</a></div>'); });
    }
    // Re-fetch the currently-open real game on the poll cadence (no Loading flash).
    function refreshOpenGame(id) {
      fetch(ESPN + "/summary?event=" + encodeURIComponent(id), { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (d) { if ((location.hash || "") === "#/g/" + id) renderGameDetail(document.getElementById("view-game"), parseSummary(d, id)); })
        .catch(function () {});
    }

    // ---- demo (clearly-labeled simulation so the live UI is visible today) -
    function ordinal(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
    // pick a plausible batter/pitcher name from a team's real player list (SIM only)
    function pickName(teamId, wantPitcher) {
      var ps = (team(teamId) && team(teamId).players) || [];
      var pool = ps.filter(function (p) { var isP = /HP$/.test(p.pos) || p.pos === "P"; return wantPitcher ? isP : !isP; });
      if (!pool.length) pool = ps;
      return pool.length ? pool[Math.floor(Math.random() * pool.length)].name : (wantPitcher ? "Pitcher" : "Batter");
    }
    function demoPlayText(batId, runs) {
      var k = runs > 1
        ? ["doubled, " + runs + " RBI", "homered (" + runs + "-run)", "cleared the bases, " + runs + " RBI"]
        : ["singled, RBI", "doubled, RBI", "hit a sacrifice fly, RBI", "grounded out, RBI"];
      return pickName(batId, false) + " " + k[Math.floor(Math.random() * k.length)];
    }
    function demoSummary() {
      var d = LIVE.demo;
      return { id: "demo", state: d.state, detail: d.detail, demo: true, teams: [
        { id: d.comps[0].id, name: liveTeamName(d.comps[0]), score: d.comps[0].score, innings: d.aInn, hits: d.hits[0], errors: d.errors[0], home: false },
        { id: d.comps[1].id, name: liveTeamName(d.comps[1]), score: d.comps[1].score, innings: d.bInn, hits: d.hits[1], errors: d.errors[1], home: true },
      ], situation: d.situation, scoringPlays: (d.plays || []).slice(-15), box: null };
    }
    function startDemo() {
      stopDemo();
      var inning = 1, half = "Top";
      LIVE.demo = { id: "demo", demo: true, state: "in", detail: "Top 1st",
        comps: [{ id: "milwaukee", score: 0 }, { id: "auburn", score: 0 }],
        pair: pairKey("auburn", "milwaukee"), aInn: [], bInn: [], hits: [0, 0], errors: [0, 0],
        plays: [], situation: null };
      LIVE.demoTimer = setInterval(function () {
        var d = LIVE.demo, runs = Math.random() < 0.35 ? (Math.random() < 0.6 ? 1 : 2) : 0;
        var batId = half === "Top" ? d.comps[0].id : d.comps[1].id;
        var fldId = half === "Top" ? d.comps[1].id : d.comps[0].id;
        if (half === "Top") { d.comps[0].score += runs; d.aInn.push(runs); d.hits[0] += runs + (Math.random() < 0.5 ? 1 : 0); }
        else { d.comps[1].score += runs; d.bInn.push(runs); d.hits[1] += runs + (Math.random() < 0.5 ? 1 : 0); }
        if (Math.random() < 0.05) d.errors[Math.random() < 0.5 ? 0 : 1]++;
        if (runs > 0) d.plays.push({ inn: (half === "Top" ? "T" : "B") + inning, text: demoPlayText(batId, runs), away: d.comps[0].score, home: d.comps[1].score });
        // current live situation (snapshot)
        d.situation = { balls: Math.floor(Math.random() * 4), strikes: Math.floor(Math.random() * 3), outs: Math.floor(Math.random() * 3),
          first: Math.random() < 0.4, second: Math.random() < 0.3, third: Math.random() < 0.2,
          batter: pickName(batId, false), pitcher: pickName(fldId, true) };
        // advance half / inning
        if (half === "Top") half = "Bottom"; else { half = "Top"; inning++; }
        if (inning > 9) { d.state = "post"; d.detail = "Final"; d.situation = null; clearInterval(LIVE.demoTimer); LIVE.demoTimer = null; }
        else d.detail = half + " " + ordinal(inning);
        onLiveUpdate();
      }, 3000);
      onLiveUpdate();
    }
    function stopDemo() {
      if (LIVE.demoTimer) { clearInterval(LIVE.demoTimer); LIVE.demoTimer = null; }
      var wasDemoView = (location.hash || "") === "#/g/demo";
      LIVE.demo = null;
      if (wasDemoView) { location.hash = "#/"; } else { onLiveUpdate(); }
    }

    // ---- bracket advancement + champions ---------------------------------
    // Champion of any site: regional via resolveBracket, super-regional via best-of-3.
    function siteChampion(site) {
      var games = bracketGames(site);
      if (T.round === "super-regional" || site.teams.length === 2) {
        var w = {}; site.teams.forEach(function (id) { w[id] = 0; });
        games.forEach(function (g) { if (g.state === "post") { var x = (g.comps.find(function (c) { return c.winner; }) || {}).id; if (w[x] != null) w[x]++; } });
        return site.teams.find(function (id) { return w[id] >= 2; }) || null;
      }
      return (window.resolveBracket ? window.resolveBracket(site.teams, games).champion : null);
    }

    // SUPER_REGIONAL_UPGRADE — now AUTOMATIC: once every regional has a champion
    // (from real finals), build the 8 super-regionals by national seed
    // (#s vs #17-s, host = higher seed) and flip the round. In-memory only.
    function maybeAdvanceToSuperRegionals() {
      if (T.round !== "regional") return;
      var champ = {};
      for (var i = 0; i < T.sites.length; i++) {
        var s = T.sites[i];
        var c = window.resolveBracket ? window.resolveBracket(s.teams, (LIVE.bySite[s.id] || [])).champion : null;
        if (!c) return;                       // not all 16 finished
        champ[s.id] = c;
      }
      var bySeed = {};
      T.sites.forEach(function (s) { bySeed[team(s.hostTeamId).seed] = { site: s, champ: champ[s.id] }; });
      var supers = [];
      for (var sd = 1; sd <= 8; sd++) {
        var hi = bySeed[sd], lo = bySeed[17 - sd];
        if (!hi || !lo) return;
        supers.push({ id: "super-" + sd, city: hi.site.city, hostTeamId: hi.site.hostTeamId, teams: [hi.champ, lo.champ], seed: sd });
      }
      T.round = "super-regional";
      T.sites = supers;
      renderMarkers();
      location.hash = "#/";
      if (map && mapBounds && mapBounds.length) setTimeout(function () { map.invalidateSize(); map.fitBounds(mapBounds, { padding: [50, 50] }); }, 60);
    }

    // ---- national "Road to Omaha" bracket (#/bracket) ---------------------
    // Pair the 16 regionals by host national seed (#s vs #17-s). Display-only.
    function superPairings() {
      var bySeed = {};
      T.sites.forEach(function (s) { var hs = team(s.hostTeamId).seed; if (hs != null) bySeed[hs] = s; });
      var pairs = [];
      for (var sd = 1; sd <= 8; sd++) {
        var hi = bySeed[sd], lo = bySeed[17 - sd];
        if (!hi || !lo) continue;
        pairs.push({ seed: sd, hi: { site: hi, champ: siteChampion(hi) }, lo: { site: lo, champ: siteChampion(lo) } });
      }
      return pairs;
    }
    // Top-level nav bar (Map · List · Bracket · Picks · Leagues). Shared by the
    // map, bracket, picks and league views so every feature is one tap from home.
    function navToggle(active) {
      var tabs = [["map", "Map"], ["list", "List"], ["bracket", "Bracket"], ["picks", "Picks"], ["games", "Games"], ["league", "Leagues"]];
      return '<div class="view-toggle map-toggle">' + tabs.map(function (t) {
        return '<button class="vt' + (t[0] === active ? " on" : "") + '" data-mode="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</div>";
    }
    function showBracket() {
      setCrumbs([{ text: "Map", href: "#/" }, { text: "Bracket" }], "#/");
      var html = '<div class="section-head">Road to Omaha</div>' +
        '<div class="section-sub">' + (T.round === "super-regional" ? "Super Regionals" : "16 regionals") +
        " &rarr; 8 super regionals &rarr; College World Series</div>" +
        navToggle("bracket") +
        '<div class="map-actions"><a class="btn primary" href="#/picks">&#128203; Make Your Picks &rarr;</a></div>';

      function regNode(site) {
        if (!site) return "";
        var champ = siteChampion(site), host = team(site.hostTeamId);
        var sub = champ ? '<span class="trophy">&#127942;</span> ' + esc(team(champ).name) + " advances" : esc(host.name) + " (host)";
        return '<div class="nb-node' + (champ ? " champ" : "") + '" data-site="' + esc(site.id) + '">' +
          '<span class="seed">' + (host.seed != null ? host.seed : "&middot;") + "</span>" +
          '<div class="nb-team"><div class="t">' + esc(site.city) + '</div><div class="c">' + sub + "</div></div></div>";
      }
      function teamNode(id, label) {
        if (!id) return '<div class="nb-node"><span class="seed">&middot;</span><div class="nb-team"><div class="t">' + esc(label || "TBD") + "</div></div></div>";
        var t = team(id);
        return '<div class="nb-node' + (t ? "" : "") + '"><span class="seed">' + (t.seed != null ? t.seed : "&middot;") + "</span>" +
          '<div class="nb-team"><div class="t">' + esc(t.name) + "</div></div></div>";
      }

      var regCol = "", superCol = "", cwsTeams = [];
      if (T.round === "super-regional") {
        // 8 super sites are current; show their matchups + winners feeding CWS.
        T.sites.forEach(function (s) {
          var champ = siteChampion(s);
          if (champ) cwsTeams.push(champ);
          superCol += '<div class="nb-pair" data-site="' + esc(s.id) + '">' + teamNode(s.teams[0]) + teamNode(s.teams[1]) +
            "</div>";
        });
        regCol = '<div class="bk-note">Regionals complete</div>';
      } else {
        var pairs = superPairings();
        pairs.forEach(function (p) {
          regCol += '<div class="nb-pair">' + regNode(p.hi.site) + regNode(p.lo.site) + "</div>";
          var hostCity = p.hi.site.city;
          superCol += '<div class="nb-pair"><div class="nb-node"><span class="seed">' + p.seed + "</span>" +
            '<div class="nb-team"><div class="t">' + esc(hostCity) + " Super Regional</div>" +
            '<div class="c">' + (p.hi.champ ? esc(team(p.hi.champ).name) : "Regional " + p.seed + " winner") +
            " vs " + (p.lo.champ ? esc(team(p.lo.champ).name) : "Regional " + (17 - p.seed) + " winner") + "</div></div></div></div>";
        });
      }

      html += '<div class="nb-cols">' +
        '<div class="nb-col"><div class="bk-title">Regionals</div>' + (regCol || '<div class="bk-note">TBD</div>') + "</div>" +
        '<div class="nb-col"><div class="bk-title">Super Regionals</div>' + (superCol || '<div class="bk-note">TBD</div>') + "</div>" +
        '<div class="nb-col"><div class="bk-title">College World Series</div>' +
          '<div class="nb-cws"><div class="ttl">Omaha</div><div class="sub">' +
            (cwsTeams.length ? cwsTeams.map(function (id) { return esc(team(id).name); }).join(" &middot; ") : "8 super-regional winners &middot; TBD") +
          "</div></div></div>" +
        "</div>";

      render(document.getElementById("view-bracket"), html);
      document.querySelectorAll("#view-bracket .nb-node[data-site], #view-bracket .nb-pair[data-site]").forEach(function (el) {
        el.addEventListener("click", function () { location.hash = "#/r/" + el.getAttribute("data-site"); });
      });
      showView("bracket");
    }

    // ---- regional simulation (clearly labeled SIM; QA + preview) ----------
    var simClock = 0;
    function simGame(winId, loseId) {
      simClock += 3600000;
      var ws = 2 + Math.floor(Math.random() * 8), ls = Math.floor(Math.random() * ws);
      return {
        id: "sim-" + winId + "-" + loseId + "-" + simClock, state: "post", detail: "Final",
        date: new Date(Date.now() + simClock).toISOString(),
        comps: [{ id: winId, score: ws, winner: true }, { id: loseId, score: ls, winner: false }],
        pair: pairKey(winId, loseId), sim: true,
      };
    }
    // Play a regional to completion by repeatedly resolving the next open game.
    function simRegionalGames(teams) {
      var games = [];
      for (var guard = 0; guard < 12; guard++) {
        var br = window.resolveBracket(teams, games);
        if (br.champion) break;
        var slot = br.slots.find(function (sl) { return sl.determined && sl.necessary !== false && !sl.event; });
        if (!slot) break;
        var a = slot.teams[0], b = slot.teams[1], w = Math.random() < 0.5 ? a : b;
        games.push(simGame(w, w === a ? b : a));
      }
      return games;
    }
    function startRegionalSim(siteId) {
      stopRegionalSim();
      LIVE.simSite = { siteId: siteId, games: [] };
      location.hash = "#/r/" + siteId;
      LIVE.simTimer = setInterval(function () {
        var s = siteById(LIVE.simSite.siteId);
        var br = window.resolveBracket(s.teams, LIVE.simSite.games);
        var slot = br.slots.find(function (sl) { return sl.determined && sl.necessary !== false && !sl.event; });
        if (br.champion || !slot) { clearInterval(LIVE.simTimer); LIVE.simTimer = null; onLiveUpdate(); return; }
        var a = slot.teams[0], b = slot.teams[1], w = Math.random() < 0.5 ? a : b;
        LIVE.simSite.games.push(simGame(w, w === a ? b : a));
        onLiveUpdate();
      }, 2500);
      onLiveUpdate();
    }
    function stopRegionalSim() {
      if (LIVE.simTimer) { clearInterval(LIVE.simTimer); LIVE.simTimer = null; }
      LIVE.simSite = null;
      onLiveUpdate();
    }
    // Test/preview hook: simulate ALL 16 regionals and trigger the super flip.
    function simulateAllRegionals() {
      LIVE.simAll = true;
      T.sites.forEach(function (s) { LIVE.bySite[s.id] = simRegionalGames(s.teams); });
      maybeAdvanceToSuperRegionals();
      onLiveUpdate();
    }
    if (typeof window !== "undefined") {
      window.__simRegional = startRegionalSim;
      window.__stopSim = stopRegionalSim;
      window.__simAll = simulateAllRegionals;
      window.__picks = { encode: encodePicks, decode: decodePicks, get: function () { return PICKS; }, set: function (p) { PICKS = p; savePicks(); } };
      // Test hook only: LEAGUE_API is a closure-local var, so smoke flips it here.
      window.__leagues = { setApi: function (u) { LEAGUE_API = u; }, get: function () { return LEAGUES; } };
      window.__gamepicks = { get: function () { return GAME_PICKS; }, set: function (g) { GAME_PICKS = g; saveGamePicks(); }, enumerate: enumerateGames, score: scoreGames };
    }

    function startPolling() {
      refresh();
      setInterval(function () { if (!document.hidden) refresh(); }, POLL_MS);
      document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(); });
    }

    // ---- MAP view entry ---------------------------------------------------
    function showMap() {
      setCrumbs([{ text: "Map" }], null);
      render(document.getElementById("mapSub"),
        T.sites.length + " " + roundLabel().toLowerCase() + "s &middot; double-elimination &middot; May 29 – June 1");
      // Reflect mapMode on the Map/List/Bracket toggle and swap map <-> list.
      var listMode = mapMode === "list";
      document.querySelectorAll("#mapToggle .vt").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-mode") === (listMode ? "list" : "map"));
      });
      document.getElementById("map").hidden = listMode;
      document.querySelector("#view-map .map-hint").hidden = listMode;
      document.getElementById("siteList").hidden = !listMode;
      if (listMode) renderSiteList();
      showView("map");
      renderScoreboard();
    }

    // ---- router -----------------------------------------------------------
    // ===================================================================
    // BRACKET CHALLENGE pick'em — fully client-side. Predictions only;
    // scored against real results, never presented as official.
    // ===================================================================
    var REG_SEED = [1, 4, 2, 3];                 // regional seed by team-array index (data.js order)
    var PICK_SITES = [], PICK_BY_SEED = {}, PICK_BY_ID = {};
    // Snapshot the ORIGINAL 16-site/4-team structure at load, BEFORE
    // maybeAdvanceToSuperRegionals() can replace T.sites with 8 supers.
    function snapshotPickSites() {
      PICK_SITES = T.sites.map(function (s) {
        return { id: s.id, city: s.city, hostTeamId: s.hostTeamId, seed: team(s.hostTeamId).seed, teams: s.teams.slice() };
      });
      PICK_BY_SEED = {}; PICK_BY_ID = {};
      PICK_SITES.forEach(function (s) { PICK_BY_ID[s.id] = s; if (s.seed != null) PICK_BY_SEED[s.seed] = s; });
    }

    // ---- model + persistence ----
    var PICKS_KEY = "cws-picks-v1";
    var PICKS = emptyPicks();
    function emptyPicks() { return { v: 1, reg: {}, sup: {}, cwsChamp: null }; }
    function loadPicks() {
      try {
        var raw = localStorage.getItem(PICKS_KEY);
        if (!raw) return;
        var p = JSON.parse(raw);
        if (p && p.v === 1 && p.reg && p.sup) PICKS = { v: 1, reg: p.reg, sup: p.sup, cwsChamp: (p.cwsChamp == null ? null : p.cwsChamp) };
      } catch (e) { /* private mode / corrupt — keep empty */ }
    }
    function savePicks() { try { localStorage.setItem(PICKS_KEY, JSON.stringify(PICKS)); localStorage.setItem(PICKS_UPDATED_KEY, String(Date.now())); } catch (e) { /* ignore */ } syncPush(); }

    // ---- private leagues: persistence + API wrapper (Session 14) ----
    var LEAGUES_KEY = "cws-leagues-v1";
    var LEAGUES = { v: 1, joined: [] };           // [{ code, memberId, displayName }]
    function loadLeagues() {
      try { var raw = localStorage.getItem(LEAGUES_KEY); if (!raw) return; var l = JSON.parse(raw); if (l && l.v === 1 && Array.isArray(l.joined)) LEAGUES = l; } catch (e) { /* ignore */ }
    }
    function saveLeagues() { try { localStorage.setItem(LEAGUES_KEY, JSON.stringify(LEAGUES)); } catch (e) { /* ignore */ } }
    function joinedLeague(code) { return LEAGUES.joined.filter(function (j) { return j.code === code; })[0] || null; }

    // ---- per-game pick'em (Session 15): local picks + append-only results cache ----
    var GAME_PICKS_KEY = "cws-gamepicks-v1";
    var GAME_PICKS = { v: 1, picks: {} };   // { gameKey: teamId } — the pick ts lives only on the server
    function loadGamePicks() {
      try { var raw = localStorage.getItem(GAME_PICKS_KEY); if (!raw) return; var g = JSON.parse(raw); if (g && g.v === 1 && g.picks) GAME_PICKS = { v: 1, picks: g.picks }; } catch (e) { /* ignore */ }
    }
    function saveGamePicks() { try { localStorage.setItem(GAME_PICKS_KEY, JSON.stringify(GAME_PICKS)); localStorage.setItem(PICKS_UPDATED_KEY, String(Date.now())); } catch (e) { /* ignore */ } syncPush(); }
    // Append-only cache of decided games so finished games keep scoring after they
    // age out of the 4-date live-poll window. Only ever adds; never removes.
    var RESULTS_KEY = "cws-results-v1";
    var RESULTS_CACHE = {};   // { gameKey: { winner, startMs } }
    function loadResultsCache() { try { var raw = localStorage.getItem(RESULTS_KEY); if (raw) { var r = JSON.parse(raw); if (r && typeof r === "object") RESULTS_CACHE = r; } } catch (e) { /* ignore */ } }
    function saveResultsCache() { try { localStorage.setItem(RESULTS_KEY, JSON.stringify(RESULTS_CACHE)); } catch (e) { /* ignore */ } }
    function newMemberId() {
      try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* ignore */ }
      return "m-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
    }

    // ============================================================
    // Cloud sync (Vercel/Next migration): if the user is signed in,
    // mirror localStorage picks to /api/picks. Anonymous use is
    // unchanged — picks stay in localStorage only.
    // ============================================================
    var SIGNED_IN = !!(window.__session && window.__session.signedIn);
    var PICKS_UPDATED_KEY = "cws-picks-updated-v1";   // local LWW clock
    var applyingRemote = false;                        // re-entry guard
    var syncTimer = null;
    function localUpdatedAt() {
      try { var v = +localStorage.getItem(PICKS_UPDATED_KEY); return isFinite(v) ? v : 0; } catch (e) { return 0; }
    }
    function _pushPayload() {
      return {
        bracketCode: encodePicks(PICKS),
        gamePicks: GAME_PICKS.picks,
        updatedAt: localUpdatedAt() || Date.now()
      };
    }
    function syncPushNow() {
      if (!SIGNED_IN || applyingRemote) return;
      try {
        fetch("/api/picks", {
          method: "PUT", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(_pushPayload())
        }).catch(function () { /* offline — localStorage already has it */ });
      } catch (e) { /* ignore */ }
    }
    function syncPush() {
      if (!SIGNED_IN || applyingRemote) return;
      clearTimeout(syncTimer);
      syncTimer = setTimeout(syncPushNow, 800);
    }
    // On first sign-in (server empty + local has picks) push local up; otherwise
    // adopt the server state if it's newer than the local clock.
    function reconcileWithServer() {
      if (!SIGNED_IN) return;
      fetch("/api/picks", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (srv) {
          if (!srv) return;
          var serverEmpty = !srv.bracketCode && !(srv.gamePicks && Object.keys(srv.gamePicks).length);
          var localEmpty = !localStorage.getItem(PICKS_KEY) && !Object.keys(GAME_PICKS.picks || {}).length;
          if (serverEmpty && !localEmpty) {
            // Migrate local picks up on first sign-in.
            syncPushNow();
            return;
          }
          if (serverEmpty) return;
          var srvTs = srv.updatedAt || 0;
          var locTs = localUpdatedAt();
          if (srvTs >= locTs) {
            // Adopt server state. Guard prevents re-PUT during local writes.
            applyingRemote = true;
            try {
              if (srv.bracketCode) {
                var p = decodePicks(srv.bracketCode);
                if (p) { PICKS = p; savePicks(); }
              }
              GAME_PICKS = { v: 1, picks: srv.gamePicks || {} };
              saveGamePicks();
              try { localStorage.setItem(PICKS_UPDATED_KEY, String(srvTs || Date.now())); } catch (e) { /* ignore */ }
            } finally { applyingRemote = false; }
            // Re-render the affected views if they're currently showing.
            var h = location.hash || "";
            if (h.indexOf("#/picks") === 0 || h.indexOf("#/games") === 0 || h.indexOf("#/h2h") === 0) router();
          } else {
            // Local is newer — push up.
            syncPushNow();
          }
        })
        .catch(function () { /* offline — fall back to local */ });
    }

    // Fetch wrapper mirroring the ESPN pattern; rejects {offline:true} when disabled,
    // and {status,error} on HTTP errors. Callers always .catch() and degrade gracefully.
    function leagueApi(method, path, body) {
      if (!leaguesEnabled()) return Promise.reject({ offline: true });
      return fetch(LEAGUE_API + path, {
        method: method, cache: "no-store",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          return r.ok ? j : Promise.reject(Object.assign({ status: r.status }, j));
        });
      });
    }

    // ---- stable, versioned URL encoding (v1, 26 chars, digits only) ----
    // Order: "1" + 16 regional digits (seed 1..16; team index 0-3, 4=none)
    //        + 8 super digits (seed 1..8; 0|1, 2=none) + 1 champ digit (seed-1, 8=none).
    function encodePicks(p) {
      p = p || PICKS; var out = "1", sd, s2;
      for (sd = 1; sd <= 16; sd++) { var st = PICK_BY_SEED[sd], pk = st ? p.reg[st.id] : null; var i = (st && pk != null) ? st.teams.indexOf(pk) : -1; out += (i >= 0 ? i : 4); }
      for (s2 = 1; s2 <= 8; s2++) { var sv = p.sup[s2]; out += (sv === 0 || sv === 1) ? sv : 2; }
      out += (p.cwsChamp >= 1 && p.cwsChamp <= 8) ? (p.cwsChamp - 1) : 8;
      return out;
    }
    function decodePicks(code) {
      if (typeof code !== "string" || code.length !== 26 || code.charAt(0) !== "1" || !/^[0-9]{26}$/.test(code)) return null;
      var p = emptyPicks(), i;
      for (i = 0; i < 16; i++) { var d = +code.charAt(1 + i); if (d > 4) return null; var st = PICK_BY_SEED[i + 1]; if (d < 4 && st && st.teams[d]) p.reg[st.id] = st.teams[d]; }
      for (i = 0; i < 8; i++) { var sv = +code.charAt(17 + i); if (sv > 2) return null; if (sv < 2) p.sup[i + 1] = sv; }
      var cd = +code.charAt(25); if (cd > 8) return null; if (cd < 8) p.cwsChamp = cd + 1;
      return p;
    }

    // ---- resolution (generic over a picks object) ----
    function regOf(p, sd) { var s = PICK_BY_SEED[sd]; return s ? (p.reg[s.id] || null) : null; }
    function supersFor(p) { var out = []; for (var sd = 1; sd <= 8; sd++) out.push({ seed: sd, teams: [regOf(p, sd), regOf(p, 17 - sd)] }); return out; }
    function supWinnerFor(p, sd) { var sv = p.sup[sd]; if (sv !== 0 && sv !== 1) return null; return supersFor(p)[sd - 1].teams[sv] || null; }
    function champFor(p) { return p.cwsChamp == null ? null : supWinnerFor(p, p.cwsChamp); }
    function predictedSupers() { return supersFor(PICKS); }
    function predictedSuperWinner(sd) { return supWinnerFor(PICKS, sd); }
    function predictedChampTeam() { return champFor(PICKS); }

    // ---- actual results (honest scoring; robust across the super-flip) ----
    function actualRegChamp(siteId) {
      var s = PICK_BY_ID[siteId];
      if (!s || !window.resolveBracket) return null;
      return window.resolveBracket(s.teams, (LIVE.bySite && LIVE.bySite[siteId]) || []).champion || null;
    }
    function actualSuperWinner(sd) { var ss = siteById("super-" + sd); return ss ? siteChampion(ss) : null; }

    // ---- per-game enumeration + scoring (Session 15) ----
    // Every tournament game with a STABLE key, current state, start time and winner.
    // Regionals come from the load-time snapshot (keys survive the super-flip); supers
    // are best-of-3. Decided games are recorded into the append-only RESULTS_CACHE.
    function enumerateGames() {
      var out = [], dirty = false;
      function record(key, winner, startMs) {
        if (winner && !RESULTS_CACHE[key]) { RESULTS_CACHE[key] = { winner: winner, startMs: startMs }; dirty = true; }
      }
      PICK_SITES.forEach(function (site) {
        if (!window.resolveBracket) return;
        var br = window.resolveBracket(site.teams, (LIVE.bySite && LIVE.bySite[site.id]) || []);
        var g6 = br.slots[5], g6Final = !!(g6 && g6.event && g6.event.state === "post");
        br.slots.forEach(function (slot) {
          if (slot.g === 7 && g6Final && !slot.necessary) return;     // G7 not needed
          var ev = slot.event, startMs = (ev && ev.date) ? Date.parse(ev.date) : null;
          var winner = slot.teams ? eventWinner(ev, slot.teams) : null;
          var key = site.id + "_G" + slot.g;
          record(key, winner, startMs);
          out.push({
            key: key, label: site.city.split(",")[0] + " G" + slot.g, round: "regional",
            teamA: slot.teams ? slot.teams[0] : null, teamB: slot.teams ? slot.teams[1] : null,
            determined: slot.determined, state: ev ? ev.state : (slot.determined ? "pre" : "tbd"),
            startMs: startMs, winner: winner, odds: ev ? ev.odds : null,
          });
        });
      });
      if (T.round === "super-regional") {
        T.sites.forEach(function (s) {
          var games = bracketGames(s).slice().sort(function (x, y) { return (Date.parse(x.date) || 0) - (Date.parse(y.date) || 0); });
          var w = {}; w[s.teams[0]] = 0; w[s.teams[1]] = 0;
          games.forEach(function (gm) { if (gm.state === "post") { var x = eventWinner(gm, s.teams); if (x != null && w[x] != null) w[x]++; } });
          var champ = w[s.teams[0]] >= 2 ? s.teams[0] : (w[s.teams[1]] >= 2 ? s.teams[1] : null);
          for (var i = 0; i < 3; i++) {
            if (i === 2 && champ) break;                               // G3 only if necessary
            var ev = games[i], key = "super-" + s.seed + "_G" + (i + 1);
            var startMs = (ev && ev.date) ? Date.parse(ev.date) : null, winner = eventWinner(ev, s.teams);
            record(key, winner, startMs);
            out.push({
              key: key, label: s.city.split(",")[0] + " Super G" + (i + 1), round: "super",
              teamA: s.teams[0], teamB: s.teams[1], determined: true,
              state: ev ? ev.state : "pre", startMs: startMs, winner: winner, odds: ev ? ev.odds : null,
            });
          }
        });
      }
      if (dirty) saveResultsCache();
      return out;
    }
    function gameClass(g) {
      if (!g.determined) return "upcoming";
      if (g.state === "in" || g.state === "post") return "locked";
      if (g.startMs != null && g.startMs < Date.now()) return "locked";  // first pitch passed
      return "open";
    }
    // Build the truth map of decided games (live + cached), for scoring.
    function gamesTruth() {
      var truth = {};
      enumerateGames().forEach(function (g) { if (g.state === "post" && g.winner) truth[g.key] = { winner: g.winner, startMs: g.startMs }; });
      Object.keys(RESULTS_CACHE).forEach(function (k) { if (!truth[k] && RESULTS_CACHE[k].winner) truth[k] = RESULTS_CACHE[k]; });
      return truth;
    }
    // Score a member's server-side games map {gameKey:{pick,ts}} — a pick counts as a
    // WIN only if it was recorded before that game's first pitch (ts < startMs).
    function scoreGames(gamesMap) {
      var truth = gamesTruth(), wins = 0, losses = 0, decided = 0, superWins = 0;
      Object.keys(gamesMap || {}).forEach(function (k) {
        var t = truth[k]; if (!t) return;
        decided++;
        var e = gamesMap[k] || {};
        if (e.ts != null && t.startMs != null && e.ts < t.startMs && e.pick === t.winner) { wins++; if (k.indexOf("super-") === 0) superWins++; }
        else losses++;
      });
      return { wins: wins, losses: losses, decided: decided, superWins: superWins };
    }
    // The local user's own (unsubmitted) preview record — no server ts, so it can't
    // verify the first-pitch lock; labeled "preview" in the UI.
    function scoreLocalGames() {
      var truth = gamesTruth(), wins = 0, decided = 0;
      Object.keys(GAME_PICKS.picks).forEach(function (k) { var t = truth[k]; if (!t) return; decided++; if (GAME_PICKS.picks[k] === t.winner) wins++; });
      return { wins: wins, losses: decided - wins, decided: decided };
    }

    function regBadge(siteId) {
      var a = actualRegChamp(siteId); if (a == null) return '<span class="pick-badge pending">your pick</span>';
      return a === PICKS.reg[siteId] ? '<span class="pick-badge ok">&#10003; correct</span>'
        : '<span class="pick-badge no">&#10007; ' + esc(team(a).name) + " won</span>";
    }
    function supBadge(sd) {
      var a = actualSuperWinner(sd), pk = predictedSuperWinner(sd);
      if (a == null) return '<span class="pick-badge pending">your pick</span>';
      if (pk === a) return '<span class="pick-badge ok">&#10003; to Omaha</span>';
      var ss = siteById("super-" + sd);
      if (ss && ss.teams.indexOf(pk) === -1) return '<span class="pick-badge off">off-bracket</span>';
      return '<span class="pick-badge no">&#10007;</span>';
    }
    function champBadge() {
      if (T.omahaChampion) return T.omahaChampion === predictedChampTeam()
        ? '<span class="pick-badge ok">&#10003; champion</span>' : '<span class="pick-badge no">&#10007;</span>';
      return '<span class="pick-badge pending">CWS not yet played</span>';
    }

    // ---- fill-out view ----
    function pickRegNode(site, tid) {
      var picked = PICKS.reg[site.id] === tid;
      return '<div class="nb-node pick' + (picked ? " picked" : "") + '" data-site="' + esc(site.id) + '" data-team="' + esc(tid) + '">' +
        '<span class="seed">' + REG_SEED[site.teams.indexOf(tid)] + "</span>" +
        '<div class="nb-team"><div class="t">' + esc(team(tid).name) + "</div>" +
        (picked ? '<div class="c">' + regBadge(site.id) + "</div>" : "") + "</div></div>";
    }
    function pickSupNode(sd, side, tid) {
      if (!tid) return '<div class="nb-node disabled"><span class="seed">&middot;</span><div class="nb-team"><div class="t">Pick Regional ' + (side === 0 ? sd : 17 - sd) + " first</div></div></div>";
      var picked = PICKS.sup[sd] === side;
      return '<div class="nb-node pick' + (picked ? " picked" : "") + '" data-sup="' + sd + '" data-side="' + side + '">' +
        '<span class="seed">' + (side === 0 ? sd : 17 - sd) + "</span>" +
        '<div class="nb-team"><div class="t">' + esc(team(tid).name) + "</div>" +
        (picked ? '<div class="c">' + supBadge(sd) + "</div>" : "") + "</div></div>";
    }
    function pickChampNode(sd) {
      var w = predictedSuperWinner(sd);
      if (!w) return '<div class="nb-node disabled"><span class="seed">' + sd + '</span><div class="nb-team"><div class="t">Pick Super ' + sd + " first</div></div></div>";
      var picked = PICKS.cwsChamp === sd;
      return '<div class="nb-node pick' + (picked ? " picked champ" : "") + '" data-champ="' + sd + '">' +
        '<span class="seed">' + (picked ? "&#127942;" : sd) + "</span>" +
        '<div class="nb-team"><div class="t">' + esc(team(w).name) + "</div>" +
        (picked ? '<div class="c">' + champBadge() + "</div>" : "") + "</div></div>";
    }
    function pickProgress() {
      var n = 0, sd;
      for (sd = 1; sd <= 16; sd++) { var s = PICK_BY_SEED[sd]; if (s && PICKS.reg[s.id]) n++; }
      for (sd = 1; sd <= 8; sd++) if (predictedSuperWinner(sd)) n++;
      if (predictedChampTeam()) n++;
      return n;
    }
    // Score any bracket code against actual results (used by the picks strip AND
    // league standings). Champion stays pending (Omaha not modeled). null if code invalid.
    function scoreBracketCode(code) {
      var p = decodePicks(code);
      if (!p) return null;
      var reg = 0, regD = 0, sup = 0, supD = 0, sd;
      for (sd = 1; sd <= 16; sd++) { var s = PICK_BY_SEED[sd]; var a = actualRegChamp(s.id); if (a != null) { regD++; if (a === regOf(p, sd)) reg++; } }
      for (sd = 1; sd <= 8; sd++) { var aw = actualSuperWinner(sd); if (aw != null) { supD++; if (supWinnerFor(p, sd) === aw) sup++; } }
      return { reg: reg, regDecided: regD, sup: sup, supDecided: supD, correct: reg + sup, decided: regD + supD };
    }
    function scoreStrip() {
      var sc = scoreBracketCode(encodePicks(PICKS));
      if (!sc || (sc.regDecided === 0 && sc.supDecided === 0)) return "";
      return '<div class="pick-score">Your results &middot; Regionals <b>' + sc.reg + "/" + sc.regDecided + "</b> &middot; Super Regionals <b>" + sc.sup + "/" + sc.supDecided + "</b> &middot; Champion: pending</div>";
    }
    function showPicks() {
      setCrumbs([{ text: "Map", href: "#/" }, { text: "Bracket", href: "#/bracket" }, { text: "My Picks" }], "#/bracket");
      var regCol = "", supCol = "", champCol = "", sd;
      for (sd = 1; sd <= 16; sd++) {
        var site = PICK_BY_SEED[sd]; if (!site) continue;
        regCol += '<div class="pick-reg"><div class="pick-reg-h"><span class="nseed">' + sd + "</span>" + esc(site.city) + "</div>" +
          site.teams.map(function (tid) { return pickRegNode(site, tid); }).join("") + "</div>";
      }
      predictedSupers().forEach(function (pr) { supCol += '<div class="nb-pair">' + pickSupNode(pr.seed, 0, pr.teams[0]) + pickSupNode(pr.seed, 1, pr.teams[1]) + "</div>"; });
      for (sd = 1; sd <= 8; sd++) champCol += pickChampNode(sd);
      var html =
        '<div class="section-head">Bracket Challenge</div>' +
        '<div class="section-sub">Predict the Road to Omaha &middot; your picks save to this page &amp; share link</div>' +
        navToggle("picks") +
        '<div class="pick-banner">&#9888; Predictions only — unofficial, not real results. Saved in your browser and in the share link.</div>' +
        '<div class="pick-bar"><div class="pick-progress">' + pickProgress() + ' / 25 picks</div>' +
          '<div class="pick-actions">' +
            '<button class="btn primary" data-act="copy">&#128279; Copy share link</button>' +
            '<button class="btn" data-act="compare">&#9878; Compare a friend</button>' +
            '<a class="btn" href="#/league">&#127942; Leagues</a>' +
            '<button class="btn" data-act="reset">&#8635; Reset</button>' +
          "</div></div>" +
        scoreStrip() +
        '<div class="nb-cols">' +
          '<div class="nb-col"><div class="bk-title">Regionals — pick 16 champions</div>' + regCol + "</div>" +
          '<div class="nb-col"><div class="bk-title">Super Regionals — pick 8 winners</div>' + supCol + "</div>" +
          '<div class="nb-col"><div class="bk-title">CWS Champion</div><div class="nb-cws"><div class="ttl">Omaha</div><div class="sub">' +
            (predictedChampTeam() ? "&#127942; " + esc(team(predictedChampTeam()).name) : "Pick your champion below") + "</div></div>" + champCol + "</div>" +
        "</div>";
      render(document.getElementById("view-picks"), html);
      syncPickUrl();
      showView("picks");
    }
    function cleanupPicks() {
      for (var sd = 1; sd <= 8; sd++) { if (PICKS.sup[sd] != null && !predictedSupers()[sd - 1].teams[PICKS.sup[sd]]) delete PICKS.sup[sd]; }
      if (PICKS.cwsChamp != null && !predictedSuperWinner(PICKS.cwsChamp)) PICKS.cwsChamp = null;
    }
    function syncPickUrl() { try { history.replaceState(null, "", "#/picks/" + encodePicks(PICKS)); } catch (e) { /* ignore */ } }
    function fallbackCopy(text) { try { var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch (e) { /* ignore */ } }
    function copyPickLink(btn) {
      var url = location.origin + location.pathname + "#/picks/" + encodePicks(PICKS);
      function done() { if (btn) { var o = btn.innerHTML; btn.innerHTML = "Copied!"; setTimeout(function () { btn.innerHTML = o; }, 1500); } }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); done(); });
      else { fallbackCopy(url); done(); }
    }
    function promptCompare() {
      var v = prompt("Paste a friend's Bracket Challenge link (or 26-char code):");
      if (!v) return;
      var m = v.match(/picks\/(\d{26})/) || v.match(/(\d{26})/);
      var code = m ? m[1] : null;
      if (!code || !decodePicks(code)) { alert("That doesn't look like a valid bracket link."); return; }
      location.hash = "#/h2h/" + encodePicks(PICKS) + "/" + code;
    }

    // ---- shared link + head-to-head ----
    function picksError(msg) {
      render(document.getElementById("view-picks"),
        '<div class="section-head">Bracket Challenge</div><div class="pick-banner">' + esc(msg) + "</div>" +
        '<div class="map-actions"><a class="btn primary" href="#/picks">Start your bracket &rarr;</a></div>');
      setCrumbs([{ text: "Map", href: "#/" }, { text: "My Picks" }], "#/");
      showView("picks");
    }
    function loadSharedPicks(code) {
      var p = decodePicks(code);
      if (!p) return picksError("That share link is invalid or from an older version.");
      PICKS = p; savePicks();
      try { history.replaceState(null, "", "#/picks"); } catch (e) { /* ignore */ }
      showPicks();
    }
    function showH2H(a, b) {
      var pa = decodePicks(a), pb = decodePicks(b);
      if (!pa || !pb) return picksError("One of those bracket links is invalid.");
      function nm(id) { return id ? esc(team(id).name) : "&mdash;"; }
      function row(label, ta, tb, actual) {
        var aw = actual && ta === actual, bw = actual && tb === actual;
        return "<tr><td class='h2h-a" + (aw ? " win" : "") + "'>" + nm(ta) + (aw ? " &#10003;" : "") + "</td>" +
          "<td class='h2h-slot'>" + esc(label) + "</td>" +
          "<td class='h2h-b" + (bw ? " win" : "") + "'>" + nm(tb) + (bw ? " &#10003;" : "") + "</td></tr>";
      }
      var rows = "", sd;
      for (sd = 1; sd <= 16; sd++) { var s = PICK_BY_SEED[sd]; if (!s) continue; rows += row(s.city.split(",")[0] + " Regional", regOf(pa, sd), regOf(pb, sd), actualRegChamp(s.id)); }
      for (sd = 1; sd <= 8; sd++) rows += row("Super Regional " + sd, supWinnerFor(pa, sd), supWinnerFor(pb, sd), actualSuperWinner(sd));
      rows += row("CWS Champion", champFor(pa), champFor(pb), T.omahaChampion || null);
      render(document.getElementById("view-picks"),
        '<div class="section-head">Head-to-Head</div>' +
        '<div class="section-sub">Your bracket vs. a friend’s &middot; &#10003; marks the correct pick once a result is in</div>' +
        '<div class="pick-banner">&#9888; Predictions only — unofficial, not real results.</div>' +
        '<table class="cmp-table h2h-table"><thead><tr><th>You</th><th>Round</th><th>Friend</th></tr></thead><tbody>' + rows + "</tbody></table>" +
        '<div class="map-actions"><a class="btn primary" href="#/picks">&#8592; Back to my picks</a></div>');
      setCrumbs([{ text: "Map", href: "#/" }, { text: "Bracket", href: "#/bracket" }, { text: "Head-to-Head" }], "#/bracket");
      showView("picks");
    }

    // Delegated click handler for the pick UI (wired once; survives re-renders).
    function wirePicks() {
      var el = document.getElementById("view-picks");
      if (!el || el.__wired) return; el.__wired = true;
      el.addEventListener("click", function (e) {
        var act = e.target.closest("[data-act]");
        if (act) {
          var a = act.getAttribute("data-act");
          if (a === "copy") return copyPickLink(act);
          if (a === "compare") return promptCompare();
          if (a === "reset") { if (confirm("Reset your whole bracket?")) { PICKS = emptyPicks(); savePicks(); showPicks(); } return; }
        }
        var node = e.target.closest(".nb-node.pick");
        if (!node) return;
        if (node.hasAttribute("data-team")) PICKS.reg[node.getAttribute("data-site")] = node.getAttribute("data-team");
        else if (node.hasAttribute("data-sup")) PICKS.sup[+node.getAttribute("data-sup")] = +node.getAttribute("data-side");
        else if (node.hasAttribute("data-champ")) PICKS.cwsChamp = +node.getAttribute("data-champ");
        cleanupPicks(); savePicks(); showPicks();
      });
    }

    // ===================================================================
    // PRIVATE LEAGUES (Session 14) — UI over the Cloudflare Worker.
    // Scoring is client-side (scoreBracketCode); the Worker is a dumb store.
    // ===================================================================
    function leagueBanner() { return '<div class="pick-banner">&#9888; Standings are unofficial predictions — not real results.</div>'; }
    function lockState(lockTs) {
      var ms = (lockTs || 0) - Date.now();
      if (ms <= 0) return { locked: true, text: "Locked — brackets final" };
      var d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
      return { locked: false, text: "Locks in " + (d > 0 ? d + "d " + h + "h" : (h > 0 ? h + "h " + m + "m" : m + "m")) };
    }
    function leagueErr(err) {
      if (err && err.offline) return alert("Leagues aren't enabled yet.");
      if (err && err.status === 409) return alert("Brackets are locked — the tournament has started.");
      if (err && err.status === 429) return alert("Too many requests — please try again later.");
      if (err && err.status === 404) return alert("That league code wasn't found.");
      alert("Couldn't reach the league server. Try again.");
    }
    function showLeagueUnavailable() {
      setCrumbs([{ text: "Map", href: "#/" }, { text: "Leagues" }], "#/");
      render(document.getElementById("view-league"),
        '<div class="section-head">Private Leagues</div>' +
        navToggle("league") +
        '<div class="lg-unavailable"><div class="ttl">Leagues aren’t turned on yet</div>' +
        '<p>League play uses an optional backend that hasn’t been enabled. Your ' +
        '<a href="#/picks">Bracket Challenge</a> still works and is shareable by link.</p>' +
        '<div class="map-actions"><a class="btn primary" href="#/picks">&#8592; Back to my picks</a></div></div>');
      showView("league");
    }
    function showLeagueHub() {
      setCrumbs([{ text: "Map", href: "#/" }, { text: "Leagues" }], "#/");
      var joined = LEAGUES.joined.map(function (j) {
        return '<button class="lg-list-row" data-code="' + esc(j.code) + '"><span class="lg-code">' + esc(j.code) +
          '</span><span class="lg-as">as ' + esc(j.displayName) + '</span><span class="go">Standings &rarr;</span></button>';
      }).join("") || '<div class="lg-empty">You haven’t joined a league yet.</div>';
      render(document.getElementById("view-league"),
        '<div class="section-head">Private Leagues</div>' +
        '<div class="section-sub">Compete with friends on your bracket &middot; one code, everyone joins</div>' +
        navToggle("league") +
        leagueBanner() +
        '<div class="lg-cols">' +
          '<div class="lg-card"><div class="bk-title">Create a league</div><div class="lg-form">' +
            '<input id="lgNewName" type="text" maxlength="24" placeholder="Your display name" autocomplete="off">' +
            '<input id="lgLeagueName" type="text" maxlength="24" placeholder="League name (optional)" autocomplete="off">' +
            '<button class="btn primary" data-act="create">Create</button></div></div>' +
          '<div class="lg-card"><div class="bk-title">Join a league</div><div class="lg-form">' +
            '<input id="lgJoinCode" type="text" maxlength="6" placeholder="Code" autocomplete="off" class="lg-codein">' +
            '<input id="lgJoinName" type="text" maxlength="24" placeholder="Your display name" autocomplete="off">' +
            '<button class="btn" data-act="join">Join</button></div></div>' +
        '</div>' +
        '<div class="bk-title">Your leagues</div><div class="lg-list">' + joined + '</div>' +
        '<div class="map-actions"><a class="btn" href="#/picks">&#8592; Back to my picks</a></div>');
      showView("league");
    }
    function showLeagueStandings(code) {
      code = (code || "").toUpperCase();
      setCrumbs([{ text: "Map", href: "#/" }, { text: "Leagues", href: "#/league" }, { text: code }], "#/league");
      var el = document.getElementById("view-league");
      render(el, '<div class="section-head">League ' + esc(code) + "</div><div class=\"lg-loading\">Loading standings…</div>");
      showView("league");
      leagueApi("GET", "/league/" + encodeURIComponent(code)).then(function (data) {
        var ls = lockState(data.lockTs), mine = joinedLeague(code), members = data.members || [];
        // BRACKET standings (existing)
        var bRows = members.map(function (mm) { return { name: mm.displayName, sc: scoreBracketCode(mm.bracket) }; });
        bRows.sort(function (a, b) {
          if (!a.sc && !b.sc) return 0; if (!a.sc) return 1; if (!b.sc) return -1;
          if (b.sc.correct !== a.sc.correct) return b.sc.correct - a.sc.correct;
          var aw = a.sc.decided ? a.sc.correct / a.sc.decided : 0, bw = b.sc.decided ? b.sc.correct / b.sc.decided : 0;
          if (bw !== aw) return bw - aw;
          return b.sc.sup - a.sc.sup;
        });
        var bBody = bRows.length ? bRows.map(function (r, i) {
          var wp = (r.sc && r.sc.decided) ? Math.round(100 * r.sc.correct / r.sc.decided) + "%" : "&ndash;";
          var corr = r.sc ? r.sc.correct : '<span class="todo">invalid</span>';
          return '<tr><td class="lg-rank">' + (i + 1) + "</td><td>" + esc(r.name) + "</td><td>" + corr + "</td><td>" + wp + "</td></tr>";
        }).join("") : '<tr><td colspan="4" class="lg-empty">No entries yet — be the first to submit your bracket.</td></tr>';
        // DAILY standings (per-game W–L)
        var dRows = members.map(function (mm) { return { name: mm.displayName, sc: scoreGames(mm.games || {}) }; });
        dRows.sort(function (a, b) {
          if (b.sc.wins !== a.sc.wins) return b.sc.wins - a.sc.wins;
          var aw = a.sc.decided ? a.sc.wins / a.sc.decided : 0, bw = b.sc.decided ? b.sc.wins / b.sc.decided : 0;
          if (bw !== aw) return bw - aw;
          return b.sc.superWins - a.sc.superWins;
        });
        var dBody = dRows.length ? dRows.map(function (r, i) {
          var wp = r.sc.decided ? Math.round(100 * r.sc.wins / r.sc.decided) + "%" : "&ndash;";
          return '<tr><td class="lg-rank">' + (i + 1) + "</td><td>" + esc(r.name) + "</td><td>" + r.sc.wins + "–" + r.sc.losses + "</td><td>" + wp + "</td></tr>";
        }).join("") : '<tr><td colspan="4" class="lg-empty">No picks submitted yet.</td></tr>';

        var daily = leagueTab === "daily";
        var subToggle = '<div class="view-toggle lg-subtoggle">' +
          '<button class="vt' + (daily ? "" : " on") + '" data-leaguetab="bracket">Bracket</button>' +
          '<button class="vt' + (daily ? " on" : "") + '" data-leaguetab="daily">Daily</button></div>';
        var actions = (mine ? "" : '<button class="btn primary" data-act="joinhere" data-code="' + esc(code) + '">Join this league</button> ') +
          (daily
            ? (mine && LEAGUE_API ? '<button class="btn primary" data-act="submitgames">Submit my picks</button> ' : "")
            : (mine && !ls.locked ? '<button class="btn primary" data-act="submit" data-code="' + esc(code) + '">Submit my bracket</button> ' : (mine && ls.locked ? '<button class="btn" disabled>Bracket locked</button> ' : ""))) +
          '<button class="btn" data-act="copycode" data-code="' + esc(code) + '">Copy invite</button>';
        var table = daily
          ? '<table class="cmp-table lg-standings"><thead><tr><th>#</th><th>Player</th><th>W–L</th><th>Win%</th></tr></thead><tbody>' + dBody + "</tbody></table>" +
            '<div class="lg-note">Daily = winner of each game. A pick counts only if made before that game’s scheduled first pitch. Regionals + super-regionals (Omaha not modeled).</div>'
          : '<table class="cmp-table lg-standings"><thead><tr><th>#</th><th>Player</th><th>Correct</th><th>Win%</th></tr></thead><tbody>' + bBody + "</tbody></table>" +
            '<div class="lg-note">Bracket = regional + super-regional champions picked. Champion is scored after Omaha.</div>';
        render(el,
          '<div class="section-head">' + esc(data.name || ("League " + code)) + "</div>" +
          '<div class="section-sub">Code <b>' + esc(code) + "</b> &middot; share it to invite friends</div>" +
          navToggle("league") + subToggle +
          leagueBanner() +
          '<div class="lg-bar">' + (daily ? '<span class="lg-lock">Daily — picks open all tournament</span>' : '<span class="lg-lock' + (ls.locked ? " locked" : "") + '">' + ls.text + "</span>") +
            '<span class="lg-actions">' + actions + "</span></div>" +
          table +
          '<div class="map-actions"><a class="btn" href="' + (daily ? "#/games" : "#/picks") + '">&#8592; My ' + (daily ? "game picks" : "bracket") + '</a> <a class="btn" href="#/league">All leagues</a></div>');
        showView("league");
      }).catch(function (err) {
        render(el, '<div class="section-head">League ' + esc(code) + "</div>" +
          '<div class="lg-unavailable"><div class="ttl">' + (err && err.status === 404 ? "League not found" : "Couldn’t load standings") + "</div>" +
          "<p>" + (err && err.offline ? "Leagues aren’t enabled yet." : "Check the code or try again.") + "</p>" +
          '<div class="map-actions"><a class="btn" href="#/league">&#8592; Leagues</a> <a class="btn" href="#/league/' + esc(code) + '">Retry</a></div></div>');
        showView("league");
      });
    }
    function leagueCreate() {
      var dn = ((document.getElementById("lgNewName") || {}).value || "").trim();
      var ln = ((document.getElementById("lgLeagueName") || {}).value || "").trim();
      if (!dn) return alert("Enter a display name.");
      leagueApi("POST", "/league", { name: ln || "League" }).then(function (r) {
        LEAGUES.joined.push({ code: r.code, memberId: newMemberId(), displayName: dn.slice(0, 24) }); saveLeagues();
        location.hash = "#/league/" + r.code;
      }).catch(leagueErr);
    }
    function leagueJoinForm() {
      var code = ((document.getElementById("lgJoinCode") || {}).value || "").toUpperCase().trim();
      var dn = ((document.getElementById("lgJoinName") || {}).value || "").trim();
      if (!code || !dn) return alert("Enter a league code and display name.");
      leagueJoin(code, dn);
    }
    function leagueJoin(code, dn) {
      leagueApi("GET", "/league/" + encodeURIComponent(code)).then(function () {
        if (!joinedLeague(code)) { LEAGUES.joined.push({ code: code, memberId: newMemberId(), displayName: (dn || "Player").slice(0, 24) }); saveLeagues(); }
        location.hash = "#/league/" + code;
      }).catch(leagueErr);
    }
    function leagueSubmit(code, btn) {
      var mine = joinedLeague(code); if (!mine) return alert("Join the league first.");
      var was = btn ? btn.innerHTML : ""; if (btn) { btn.disabled = true; btn.innerHTML = "Submitting…"; }
      leagueApi("POST", "/league/" + encodeURIComponent(code) + "/member", { memberId: mine.memberId, displayName: mine.displayName, bracket: encodePicks(PICKS) })
        .then(function () { showLeagueStandings(code); })
        .catch(function (err) { if (btn) { btn.disabled = false; btn.innerHTML = was; } leagueErr(err); });
    }
    function leagueCopyInvite(code, btn) {
      var url = location.origin + location.pathname + "#/league/" + code;
      function done() { if (btn) { var o = btn.innerHTML; btn.innerHTML = "Copied!"; setTimeout(function () { btn.innerHTML = o; }, 1500); } }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); done(); });
      else { fallbackCopy(url); done(); }
    }
    function wireLeague() {
      var el = document.getElementById("view-league");
      if (!el || el.__wired) return; el.__wired = true;
      el.addEventListener("click", function (e) {
        var tab = e.target.closest("[data-leaguetab]");
        if (tab) {
          leagueTab = tab.getAttribute("data-leaguetab");
          var cm = (location.hash.match(/#\/league\/([^/]+)/) || [])[1];
          if (cm) showLeagueStandings(decodeURIComponent(cm));
          return;
        }
        var row = e.target.closest(".lg-list-row");
        if (row) { location.hash = "#/league/" + row.getAttribute("data-code"); return; }
        var b = e.target.closest("[data-act]"); if (!b) return;
        var act = b.getAttribute("data-act"), code = b.getAttribute("data-code");
        if (act === "create") return leagueCreate();
        if (act === "join") return leagueJoinForm();
        if (act === "joinhere") return leagueJoin(code, (joinedLeague(code) || {}).displayName);
        if (act === "submit") return leagueSubmit(code, b);
        if (act === "submitgames") return submitGamePicks(b);
        if (act === "copycode") return leagueCopyInvite(code, b);
      });
    }

    // ===================================================================
    // DAILY PER-GAME PICK'EM (Session 15) — pick every game as it unlocks.
    // ===================================================================
    function fmtGameTime(ms) {
      if (!ms) return "Time TBD";
      try { return new Date(ms).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }); } catch (e) { return "Time TBD"; }
    }
    function mlChip(odds, tid) {
      if (!odds || !odds.byTeam || !odds.byTeam[tid]) return "";
      return '<span class="ml' + (odds.favoriteId === tid ? " fav" : "") + '">' + esc(odds.byTeam[tid]) + "</span>";
    }
    function gameMetaRow(g, extra) {
      return '<div class="gp-meta"><span class="gp-label">' + esc(g.label) + "</span>" +
        '<span class="gp-when">' + esc(fmtGameTime(g.startMs)) + "</span>" + (extra || "") +
        '<a class="gp-cmp" href="#/vs/' + esc(g.teamA) + "/" + esc(g.teamB) + '">Compare &rsaquo;</a></div>';
    }
    // a selectable team option (keeps .nb-node.pick[data-gamekey][data-team] for the wire handler)
    function gameOpt(g, tid, won) {
      var picked = GAME_PICKS.picks[g.key] === tid;
      return '<button class="nb-node pick gp-opt' + (picked ? " picked" : "") + (won ? " won" : "") + '" data-gamekey="' + esc(g.key) + '" data-team="' + esc(tid) + '">' +
        '<span class="gp-team">' + esc(team(tid).name) + "</span>" + mlChip(g.odds, tid) + "</button>";
    }
    function gameCardRow(g, mode) {
      if (mode === "upcoming") return '<div class="gp-game upcoming"><span class="gp-label">' + esc(g.label) + '</span><span class="gp-tbd">Matchup TBD</span></div>';
      if (mode === "open") {
        return '<div class="gp-game open">' + gameMetaRow(g) +
          '<div class="gp-vs">' + gameOpt(g, g.teamA) + '<span class="gp-vsx">vs</span>' + gameOpt(g, g.teamB) + "</div></div>";
      }
      // locked / final — read-only with your pick + result
      var myPick = GAME_PICKS.picks[g.key] || null, won = g.winner;
      var badge = (mode === "final" && won)
        ? (!myPick ? '<span class="pick-badge pending">no pick</span>' : (myPick === won ? '<span class="pick-badge ok">&#10003; correct</span>' : '<span class="pick-badge no">&#10007;</span>'))
        : (myPick ? '<span class="pick-badge pending">your pick</span>' : '<span class="pick-badge pending">no pick</span>');
      var status = (mode === "final" && won) ? ("Won: " + esc(team(won).name)) : (g.state === "in" ? '<span class="st-live">Live</span>' : "Locked");
      return '<div class="gp-game ' + mode + '">' +
        gameMetaRow(g, '<span class="gp-status">' + status + "</span>") +
        '<div class="gp-vs ro">' +
          '<span class="gp-team' + (won === g.teamA ? " won" : "") + '">' + esc(team(g.teamA).name) + mlChip(g.odds, g.teamA) + "</span>" +
          '<span class="gp-vsx">vs</span>' +
          '<span class="gp-team' + (won === g.teamB ? " won" : "") + '">' + esc(team(g.teamB).name) + mlChip(g.odds, g.teamB) + "</span>" +
        "</div>" +
        '<div class="gp-pickline">Your pick: <b>' + (myPick ? esc(team(myPick).name) : "&mdash;") + "</b> " + badge + "</div></div>";
    }
    function showGamePicks() {
      setCrumbs([{ text: "Map", href: "#/" }, { text: "Games" }], "#/");
      var open = [], live = [], finals = [], upcoming = [];
      enumerateGames().forEach(function (g) {
        var c = gameClass(g);
        if (c === "open") open.push(g);
        else if (c === "upcoming") upcoming.push(g);
        else if (g.state === "post") finals.push(g);
        else live.push(g);
      });
      var rec = scoreLocalGames();
      function section(title, list, mode) {
        if (!list.length) return "";
        return '<div class="gp-sec"><div class="bk-title">' + title + ' <span class="gp-count">' + list.length + "</span></div>" +
          '<div class="gp-grid">' + list.map(function (g) { return gameCardRow(g, mode); }).join("") + "</div></div>";
      }
      var html =
        '<div class="section-head">Daily Pick’em</div>' +
        '<div class="section-sub">Pick every game as it unlocks &middot; build a W&ndash;L record &middot; locked at first pitch</div>' +
        navToggle("games") +
        '<div class="pick-banner">&#9888; Predictions only — unofficial. Picks lock at each game’s first pitch; submit to a league to compete.</div>' +
        '<div class="pick-bar"><div class="pick-progress">' + rec.wins + "–" + rec.losses + ' <span class="gp-prevlbl">your picks (preview)</span></div><div class="pick-actions">' +
          (LEAGUES.joined.length
            ? '<button class="btn primary" data-act="submitgames">&#128228; Submit to my league' + (LEAGUES.joined.length > 1 ? "s" : "") + "</button>"
            : '<a class="btn primary" href="#/league">Create or join a league &rarr;</a>') +
        "</div></div>" +
        section("Open — pick now", open, "open") +
        section("In progress / locked", live, "locked") +
        section("Final", finals, "final") +
        section("Upcoming — matchup TBD", upcoming, "upcoming");
      if (!open.length && !live.length && !finals.length) html += '<div class="lg-empty">No games are open yet — the tournament hasn’t started. Check back at first pitch (May 29).</div>';
      render(document.getElementById("view-games"), html);
      showView("games");
    }
    function submitGamePicks(btn) {
      if (!LEAGUES.joined.length) { location.hash = "#/league"; return; }
      if (!leaguesEnabled()) return leagueErr({ offline: true });
      var was = btn ? btn.innerHTML : ""; if (btn) { btn.disabled = true; btn.innerHTML = "Submitting…"; }
      var jobs = LEAGUES.joined.map(function (j) {
        return leagueApi("POST", "/league/" + encodeURIComponent(j.code) + "/games", { memberId: j.memberId, displayName: j.displayName, picks: GAME_PICKS.picks });
      });
      Promise.allSettled(jobs).then(function (res) {
        var ok = res.filter(function (r) { return r.status === "fulfilled"; }).length;
        if (btn) { btn.disabled = false; btn.innerHTML = ok ? ("Submitted ✓") : was; if (ok) setTimeout(function () { if (btn) btn.innerHTML = was; }, 2000); }
        if (!ok) leagueErr({});
      });
    }
    function wireGames() {
      var el = document.getElementById("view-games");
      if (!el || el.__wired) return; el.__wired = true;
      el.addEventListener("click", function (e) {
        var node = e.target.closest(".nb-node.pick[data-gamekey]");
        if (node) { GAME_PICKS.picks[node.getAttribute("data-gamekey")] = node.getAttribute("data-team"); saveGamePicks(); showGamePicks(); return; }
        var act = e.target.closest("[data-act]");
        if (act && act.getAttribute("data-act") === "submitgames") submitGamePicks(act);
      });
    }

    function router() {
      var hash = location.hash || "#/";
      // Track where we came from so views with an ambiguous logical parent
      // (e.g. the matchup comparison, reachable from a regional, the scoreboard,
      // or the Daily Pick'em grid) can send "back" to the right place. Ignore
      // self-transitions so a live re-render doesn't poison the referrer.
      if (hash !== navCurHash) { navPrevHash = navCurHash; navCurHash = hash; }
      var parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
      if (parts[0] === "r") showRegional(decodeURIComponent(parts[1] || ""));
      else if (parts[0] === "t") showTeam(decodeURIComponent(parts[1] || ""));
      else if (parts[0] === "s") showStadium(decodeURIComponent(parts[1] || ""));
      else if (parts[0] === "g") showGame(decodeURIComponent(parts[1] || ""));
      else if (parts[0] === "vs") showCompare(decodeURIComponent(parts[1] || ""), decodeURIComponent(parts[2] || ""));
      else if (parts[0] === "bracket") showBracket();
      else if (parts[0] === "picks") { if (parts[1]) loadSharedPicks(decodeURIComponent(parts[1])); else showPicks(); }
      else if (parts[0] === "h2h") showH2H(decodeURIComponent(parts[1] || ""), decodeURIComponent(parts[2] || ""));
      else if (parts[0] === "games") showGamePicks();
      else if (parts[0] === "league") {
        if (!leaguesEnabled()) showLeagueUnavailable();
        else if (parts[1]) showLeagueStandings(decodeURIComponent(parts[1]));
        else showLeagueHub();
      }
      else showMap();
    }

    // Delegated handler for the top nav bar (Map · List · Bracket · Picks ·
    // Leagues), present across views, plus the site-list rows — wired once.
    function wireMapNav() {
      document.body.addEventListener("click", function (e) {
        var vt = e.target.closest(".map-toggle .vt");
        if (vt) {
          var mode = vt.getAttribute("data-mode");
          if (mode === "bracket") { location.hash = "#/bracket"; return; }
          if (mode === "picks") { location.hash = "#/picks"; return; }
          if (mode === "games") { location.hash = "#/games"; return; }
          if (mode === "league") { location.hash = "#/league"; return; }
          mapMode = mode; // "map" | "list"
          if (currentView === "map") showMap(); else location.hash = "#/";
          return;
        }
        var row = e.target.closest("#siteList .site-row");
        if (row) { location.hash = "#/r/" + row.getAttribute("data-site"); }
      });
    }

    window.addEventListener("hashchange", router);
    function bootApp() {
      snapshotPickSites();   // capture the original 16-site structure BEFORE any super-flip
      loadPicks();
      loadLeagues();
      loadGamePicks();
      loadResultsCache();
      reconcileWithServer(); // sync shim: pull/merge cloud picks if signed in (no-op otherwise)
      initMap();
      wireScoreboard();
      wireMapNav();
      wirePicks();
      wireLeague();
      wireGames();
      router();
      startPolling();
    }
    // Under Next/next-script (afterInteractive) `load` may have already fired
    // by the time this script executes — run boot immediately in that case.
    if (document.readyState === "complete") bootApp();
    else window.addEventListener("load", bootApp);
  })();
