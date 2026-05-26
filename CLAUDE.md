# CLAUDE.md

Guidance for Claude (and other AI agents) working in this repository.

## What this is

A single‑page, **no‑build, no‑backend** interactive map of the 2026 NCAA Baseball Tournament. Open `index.html` in a browser and it runs. Plain HTML/CSS/JS + Leaflet (CDN). Live scores come from ESPN's public API, polled client‑side.

## The one rule that matters most: never fabricate data

This project's whole premise is honest data. **Do not invent stats, records, scores, dates, or coordinates and present them as real.**

- Real values come from sources (official athletics sites, WarrenNolan, TheBaseballCube, D1Baseball, the published bracket, ESPN, Wikimedia). 
- Anything not verified must render as a visible `TBD` placeholder via the `fmt()` helper (which turns `null`/`""`/`"TODO*"` into a `TBD` badge). Use `null` in the data, not a guess.
- The demo/simulation is allowed **only because it is clearly labeled** ("SIM" badge, "Simulated — not a real result"). Keep that labeling if you touch it.
- If asked to "fill in stats," fetch them live (web tools) and cite/keep them verifiable; leave gaps as `TBD`.

## Architecture (where things live)

- **`index.html`** — everything: markup for the views, the theme CSS, and the entire app inside one IIFE `<script>`. Key pieces, in order: `render()` (safe HTML insert), helpers (`esc`, `fmt`, `fmtRecord`, `seedChip`, `team`, `siteById`, `findSiteForTeam`), `showView()` + the `VIEWS` array, the per‑view renderers (`showMap`, `showRegional`, `showTeam`, `showStadium`, `showGame`, `showCompare`), `renderSchedule()`, the **LIVE** module (ESPN polling, scoreboard, demo), and the hash `router()`.
- **`data.js`** — the static `TOURNAMENT` object: `sites` (16) and `teams` (64). The single source of truth for names/seeds/conference/record/rpi/stats/stadium/players.
- **`photos.js`** — `STADIUM_PHOTOS[teamId]` → `{ file, by, license, licenseUrl, source }`. Attribution is required by the CC licenses; keep it when rendering a photo.
- **`schedule.js`** — `SCHEDULES[siteId]` → the two real Friday games `{ g, time, tv, a:[teamId,seed], b:[teamId,seed] }`. Games 3–7 are generated structurally in `index.html` (`LATER_GAMES`).
- **`images/`** — downloaded stadium photos (so the app works offline).
- **`bracket.js`** — pure `resolveBracket(teams, games)` double‑elimination resolver (regional → champion → super‑regional), unit‑tested by `scripts/test-bracket.mjs`.
- **`scripts/`** — dev/CI only (the app ships zero runtime deps): `validate.mjs` (data integrity + JS parse), `test-bracket.mjs` (resolver fixtures), `smoke.mjs` (Playwright render check), `refresh-stats.mjs` (see below).
- **`.github/workflows/`** — `ci.yml` (validate → smoke → deploy to Pages, gated) and `refresh.yml` (nightly ESPN record refresh → validate → commit to `main`).

## Conventions & gotchas

- **No build, no deps, no frameworks.** Keep it vanilla. Don't add npm/bundlers.
- **DOM rendering** goes through `render(el, html)` (uses `insertAdjacentHTML` after clearing) and **all interpolated values are escaped with `esc()`**. Keep doing this — a hook flags raw `innerHTML`, and escaping prevents issues even though the data is developer‑authored.
- **Event handling for re‑rendered elements uses delegation** (see `wireScoreboard()`), because the polling/demo loops re‑render the scoreboard frequently. If you add clickable elements that live inside a re‑rendered container, delegate rather than attaching per‑node listeners.
- **`showView()` only resets scroll on an actual view change** so the 30s live refresh doesn't yank the page. Don't reintroduce an unconditional `scrollTo`.
- **Cache‑busting:** local scripts are included as `data.js?v=...`, `photos.js?v=...`, `schedule.js?v=...`. If you change those files and need a guaranteed reload during testing, bump the `?v=` token in `index.html` (or hard‑navigate with a `?cb=Date.now()` query).
- **Routing** is hash‑based: `#/`, `#/r/:site`, `#/t/:team`, `#/s/:team`, `#/vs/:a/:b`, `#/g/:eventId`. The router runs on `hashchange` and on `load`.
- **ESPN matching:** `matchTeamId()` maps ESPN team names to our `teamId`s by normalized substring. All 64 teams currently match; if you add/rename teams, re‑verify.
- **`data.js` is canonical (machine‑maintained).** `scripts/refresh-stats.mjs` re‑serializes the whole file deterministically; `npm run refresh:check` asserts byte‑for‑byte canonical form and runs in CI. So **don't hand‑edit `data.js`'s formatting** — change values, then run `npm run refresh` (or, for a no‑network reformat, edit `serialize()`/values and run `node scripts/refresh-stats.mjs` against a local source). Only the `record` field is auto‑refreshed nightly from ESPN; everything else (rpi/sos/stats/players) is the verified snapshot and is preserved untouched. A team whose record can't be fetched **keeps its existing value** — never null it; never invent one.

## Running & verifying

```bash
python3 -m http.server 4173   # then open http://localhost:4173
```

When verifying changes, actually exercise the flow in a browser (the map renders pins, drill‑down works, scoreboard loads upcoming games, comparison/box‑score open). Re‑check the JavaScript parses after edits, e.g.:

```bash
node -e 'const fs=require("fs");const h=fs.readFileSync("index.html","utf8");const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];fs.writeFileSync("/tmp/app.js",m[m.length-1][1])' && node --check /tmp/app.js
node --check data.js && node --check photos.js && node --check schedule.js
```

Or use the CI scripts directly (what the GitHub Actions run):

```bash
npm run validate        # data integrity + JS parse (16 sites, 64 teams, seeds, refs, photos/schedule keys)
npm run refresh:check   # assert data.js is in canonical (auto-refresh) form — fails if hand-edited
npm test                # bracket resolver fixtures
npm run smoke           # Playwright: core views render from static data (ESPN-independent)
npm run refresh         # fetch live records from ESPN and rewrite data.js (network)
```

## Super‑regional upgrade (≈ June 2)

When regionals finish and 8 super‑regionals are set, search for `// SUPER_REGIONAL_UPGRADE`. The change is data‑only:
1. `TOURNAMENT.round` → `"super-regional"`.
2. Replace the 16 `sites` with 8 (each `teams` array goes 4 → 2 IDs; host = higher seed).
3. Swap `SCHEDULES` for the super‑regional (best‑of‑3) games; extend `TOURNEY_DATES` in the live module.

The renderers (`renderTeamList`, schedule, scoreboard) are count‑agnostic and read labels from `roundLabel()`, so no UI rewrite is needed.
