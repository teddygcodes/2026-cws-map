# 2026 NCAA Baseball Tournament — Interactive Map

**Live site: [teddygcodes.github.io/2026-cws-map](https://teddygcodes.github.io/2026-cws-map/)**

[![CI](https://github.com/teddygcodes/2026-cws-map/actions/workflows/ci.yml/badge.svg)](https://github.com/teddygcodes/2026-cws-map/actions/workflows/ci.yml)
[![Refresh records](https://github.com/teddygcodes/2026-cws-map/actions/workflows/refresh.yml/badge.svg)](https://github.com/teddygcodes/2026-cws-map/actions/workflows/refresh.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An interactive, broadcast-styled guide to the **2026 NCAA Division I Baseball Tournament** — the Road to Omaha. Explore all 16 regional sites on a live map, drill into every bracket, compare teams head-to-head with real betting lines, browse full season stats and home-ballpark pages, and play two prediction games — a full-bracket challenge and a daily per-game pick'em — with optional private leagues. Live scores, innings, and box scores update on their own once games begin.

It is a single static page: **no build step, no framework, and (for the core app) no backend.** Open `index.html` in a browser and it runs.

> **About the data.** The 64-team field was set **May 25, 2026**; regionals run **May 29 – June 1**. Verified season stats and the published Friday schedule are baked in; live scores and odds are fetched at runtime. Anything that could not be verified is shown as a visible `TBD` rather than invented — see [Data and honesty](#data-and-honesty).

---

## Contents

- [Highlights](#highlights)
- [Features](#features)
- [Data and honesty](#data-and-honesty)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Development and testing](#development-and-testing)
- [Private leagues (optional backend)](#private-leagues-optional-backend)
- [Super-regional upgrade](#super-regional-upgrade)
- [Tech stack](#tech-stack)
- [License](#license)
- [Screenshots](#screenshots)

---

## Highlights

- **A live map of all 16 regionals** with self-updating scores, innings, and box scores from ESPN's public feed — no backend required.
- **Two prediction games in one app.** Fill out the whole bracket once, or pick the winner of every individual game as it unlocks and build a running W–L record.
- **Real betting lines.** Moneylines are pulled live from ESPN (DraftKings) and shown on each matchup card and on the head-to-head comparison page — clearly attributed, never fabricated.
- **Honest by design.** Every number is sourced; unverifiable values render as a visible `TBD`. The only simulated content is an explicitly labeled "Simulate a live game" preview.

---

## Features

### Explore the field
- **Map view** — a dark Leaflet / OpenStreetMap map with a compact circular pin on each of the 16 host ballparks. Pins for sites with a game in progress show a pulsing live dot. A top-of-map **Map · List · Bracket** toggle switches to a tidy list of all 16 regionals or jumps straight to the national bracket.
- **Regional view** — the four teams with regional seed (1–4), conference, and record, plus the full **double-elimination schedule** (Friday's real matchups, times, and TV, then the Saturday–Monday winners/losers bracket).
- **National bracket** — the Road to Omaha laid out from 16 regional champions to 8 super-regional winners to a national champion, resolving automatically as results come in.

### Teams and venues
- **Team pages** — a full stat card (record, RPI, runs, runs allowed, team AVG/ERA, strength of schedule), key-player stat lines, and an honest 2026-season write-up generated purely from the verified data.
- **Stadium / About pages** — the home ballpark with a real, attributed photo (Wikimedia Commons), capacity, verified city/state and year opened, and a researched history blurb.

### Live game data
- **Scoreboard ticker** — polls ESPN's public college-baseball feed roughly every 30 seconds and flows every tournament game through Upcoming, to Live (inning and score), to Final on its own. A clearly labeled **Simulate a live game** button previews the live experience before first pitch.
- **Box scores** — open any live or final game for an inning-by-inning linescore with runs, hits, and errors.

### Compare and predict
- **Matchup comparison** — a pregame head-to-head on record, RPI, runs, ERA, batting average, strength of schedule, and key players, with the statistical edge highlighted on each line — plus a **live moneyline** (favorite flagged, spread/total when posted) sourced from ESPN, with attribution and a responsible-gambling note.
- **Bracket Challenge** — predict the entire Road to Omaha (16 regional champions, 8 super-regional winners, one national champion). Your bracket saves to the page and to a **shareable link** (picks are encoded in the URL — no login, no backend), with a head-to-head compare against a friend's link. Picks are scored against real results as games finish, always labeled as unofficial predictions.
- **Daily pick'em** — pick the winner of **every game** as its matchup unlocks (regionals G1–G7, super-regionals best-of-three), building a running W–L record. Each matchup card shows the first-pitch time, the live moneyline, and a one-click link to the full comparison. Picks lock at each game's first pitch.
- **Private leagues** *(optional)* — compete with friends on a shared league code with **two leaderboards in one league**: the Bracket Challenge and the Daily pick'em. This is the only feature with a backend — a small Cloudflare Worker plus KV (all scoring still happens in the browser; per-game fairness is enforced by server-stamped pick timestamps). It is **off by default** and the rest of the app is unaffected; see [`worker/README.md`](worker/README.md) to deploy it.

### Design
ESPN-style dark broadcast theme (charcoal and broadcast red), Anton/Oswald/Barlow display type, smooth view transitions, hash-based routing with working back/forward, and a mobile-friendly responsive layout.

---

## Data and honesty

This project's premise is honest data, so it **never fabricates a value and presents it as fact.**

| Source | Used for |
| --- | --- |
| Official field (set 5/25/2026) | The 16 regionals, 64 teams, national seeds, regional seeds, host parks |
| Official athletics sites, [WarrenNolan](https://www.warrennolan.com), [TheBaseballCube](https://www.thebaseballcube.com), [D1Baseball](https://d1baseball.com) | Records, RPI, team runs/ERA/AVG, strength of schedule, key-player stat lines (as of 5/25/2026) |
| Published bracket (247Sports / ESPN) | Friday matchups, start times (ET), TV networks |
| [ESPN public API](https://site.api.espn.com) | Live scores, innings, box scores, and betting moneylines (fetched at runtime) |
| [Wikimedia Commons](https://commons.wikimedia.org) | Stadium photos (per-image attribution in `photos.js`) |

Any value that could not be verified renders as a visible **`TBD`** badge (for example, a few teams' opponent-run totals), and stadium coordinates are best-known approximations flagged in `data.js`. Later-round bracket matchups stay `TBD` because they depend on results. Betting lines follow the same rule — an absent or "OFF" line is shown as "Not posted yet," never invented.

**Records refresh themselves nightly.** Once games start, the field that goes stale is each team's W–L record. A scheduled GitHub Action (`scripts/refresh-stats.mjs`, see [`refresh.yml`](.github/workflows/refresh.yml)) pulls current records from ESPN each night, re-serializes `data.js`, and — only if a record actually changed and the data still passes validation — commits to `main`, which redeploys. The honesty rule still holds: a team whose record cannot be fetched keeps its existing value (never nulled), and an unreachable source fails the job rather than writing garbage. Everything else (RPI, strength of schedule, rate stats, players) stays at the verified 5/25 snapshot.

This is an unofficial, non-commercial fan and educational project — not affiliated with the NCAA, ESPN, or any school.

---

## Quick start

No dependencies. Either open the file directly or serve it locally:

```bash
# Option A — just open it
open index.html            # macOS (or double-click the file)

# Option B — serve locally (recommended; lets live scores and map tiles load cleanly)
python3 -m http.server 4173
# then visit http://localhost:4173
```

Everything is plain HTML, CSS, and JavaScript.

---

## Project structure

```
.
├── index.html         # The whole app: markup, theme CSS, and all JS (router, map,
│                       # scoreboard polling, comparison + odds, box scores, pick'em)
├── data.js            # Static TOURNAMENT model — 16 sites, 64 teams, stats, stadiums
├── photos.js          # Stadium photo map + Wikimedia attribution (author/license/source)
├── schedule.js        # Real Friday matchups/times/TV per regional (double-elim structure)
├── bracket.js         # Pure double-elimination resolver (regional -> super-regional)
├── images/            # Local stadium photos (so the app works offline)
├── worker/            # Optional private-league backend (Cloudflare Worker + KV)
├── scripts/           # Dev/CI only: validate, test-bracket, test-league, smoke, refresh-stats
├── .github/workflows/ # CI (validate -> smoke -> deploy) + nightly record refresh
└── docs/screenshots/  # Images used in this README
```

The data model is intentionally simple: a **Site** holds a list of team IDs, and the same component renders whether that list has four teams (regional) or two (super-regional).

Routing is hash-based — `#/`, `#/r/:site`, `#/t/:team`, `#/s/:team`, `#/vs/:a/:b`, `#/g/:event`, `#/bracket`, `#/picks`, `#/games`, `#/league` — and runs on `hashchange` and `load`.

---

## Development and testing

The app ships zero runtime dependencies; the scripts below are dev/CI only and mirror what GitHub Actions runs.

```bash
npm run validate        # data integrity + JS parse (16 sites, 64 teams, seeds, refs, photos/schedule keys)
npm run refresh:check   # assert data.js is in canonical (auto-refresh) form
npm test                # bracket resolver + worker validator unit tests
npm run smoke           # Playwright: core views render from static data (ESPN-independent)
npm run refresh         # fetch live records from ESPN and rewrite data.js (network)
```

When verifying changes, exercise the flow in a browser: the map renders pins, drill-down works, the scoreboard loads upcoming games, and comparison and box scores open. CI gates deploys behind `validate` and `smoke`, so a red check never ships.

---

## Private leagues (optional backend)

Private leagues are the one feature with a backend: a small **Cloudflare Worker + KV** in [`worker/`](worker/), deployed separately to your own Cloudflare account. The Worker is a *dumb store* of `league -> members` — it never fetches ESPN and never scores; **all scoring happens in the browser**. It is gated by a single `LEAGUE_API` config line near the top of `index.html`: an empty string disables the feature (the rest of the app is unaffected), and the deployed Worker URL turns it on.

Per-game fairness without a schedule on the server is enforced by **server-stamped pick timestamps**: a daily pick counts only if its recorded timestamp predates that game's real first pitch (which the browser knows from the live feed). See [`worker/README.md`](worker/README.md) for one-time setup and teardown.

---

## Super-regional upgrade

When regionals finish and the eight super-regionals are set (around June 2), the change is **data-only** — search the code for `// SUPER_REGIONAL_UPGRADE`:

1. Set `TOURNAMENT.round` to `"super-regional"`.
2. Replace the 16 `sites` with 8 (each `teams` array goes from 4 IDs to 2; host is the higher seed).
3. Swap `SCHEDULES` for the super-regional best-of-three games and extend the live-module date list.

The renderers are count-agnostic and read labels from `roundLabel()`, so no UI rewrite is needed.

---

## Tech stack

- Plain **HTML / CSS / JavaScript** — no build tooling, no npm dependencies at runtime.
- **Leaflet** (via CDN) with CARTO dark basemap tiles (OpenStreetMap data).
- **ESPN public scoreboard/summary endpoints** for live scores, box scores, and betting lines (CORS-enabled, polled client-side).
- Hash-based single-page routing with working browser back/forward.
- Optional **Cloudflare Worker + KV** for private leagues.

---

## License

The **source code** is released under the [MIT License](LICENSE).

Third-party content is **not** covered by that license and remains under its own terms:

- **Stadium photos** (`images/`) are from [Wikimedia Commons](https://commons.wikimedia.org) under their respective Creative Commons / public-domain licenses. Per-image author and license attribution is recorded in `photos.js`.
- **Live scores, box scores, and betting lines** are fetched at runtime from ESPN's public endpoints and belong to their respective owners. This is an unofficial, non-commercial fan and educational project — not affiliated with or endorsed by the NCAA, ESPN, or any institution.
- **Map tiles** are served by CARTO using OpenStreetMap data (© OpenStreetMap contributors).

Betting lines are shown for entertainment only. 21+. If you or someone you know has a gambling problem, call 1-800-GAMBLER.

---

## Screenshots

### Home — live map and scoreboard ticker
![Home: live scoreboard ticker over the US regional map with circular host-site pins](docs/screenshots/01-home-map.png)

### Daily pick'em — matchup cards with game times and live odds
![Daily pick'em grid: open matchups with first-pitch times and moneyline chips](docs/screenshots/02-daily-pickem.png)

### Matchup comparison — head-to-head with moneyline
![UCLA vs Saint Mary's comparison with a moneyline panel and stat-by-stat edges](docs/screenshots/03-matchup-comparison.png)

### Bracket Challenge — predict the whole Road to Omaha
![Bracket Challenge: pick regional champions, super-regional winners, and a national champion](docs/screenshots/04-bracket-challenge.png)

### Regional view — bracket and double-elimination schedule
![Los Angeles Regional with the full double-elimination schedule](docs/screenshots/05-regional-schedule.png)

### Team view — full 2026 stats and key players
![UCLA team stat card with 2026 season summary and key players](docs/screenshots/06-team-stats.png)

### Stadium / About — photo, capacity, and history
![Jackie Robinson Stadium page with photo, capacity, location, and history](docs/screenshots/07-stadium.png)
