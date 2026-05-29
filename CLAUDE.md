# CLAUDE.md

Guidance for Claude (and other AI agents) working in this repository.

## What this is

A **Next.js 14 (App Router) + React** interactive app for the 2026 NCAA Baseball
Tournament — a broadcast-grade prediction surface (ESPN stage × FanDuel action ×
Kalshi data craft; see `DESIGN_BRIEF.md`). It deploys on **Vercel**. Auth.js (Google +
Postgres) adds optional sign-in for cross-device pick sync; the app works fully
signed-out. Live scores come from ESPN's public API, polled client-side. Build/run with
`npm run dev` / `npm run build` (this is a real build now — not the old static site).

> Migration note: this was previously a single no-build `index.html` IIFE. All view logic
> is now React under `app/(app)/`. The hash routes, ESPN polling, honesty rule, the
> `window.__*` test hooks, the `data.js` serializer contract, and the private-league
> backend are all preserved.

## The one rule that matters most: never fabricate data

This project's whole premise is honest data. **Do not invent stats, records, scores,
dates, odds, or coordinates and present them as real.**

- Real values come from sources (official athletics sites, WarrenNolan, TheBaseballCube,
  D1Baseball, the published bracket, ESPN, Wikimedia).
- Anything not verified renders as a visible `TBD` / "—" / "Not posted yet" via the
  `<Tbd>` component (`app/components/Tbd.jsx`) + `isMissing()` in `lib/format.js` (treats
  `null`/`""`/`"TODO*"` as missing). Use `null` in the data, not a guess.
- Odds: any "OFF"/null line is dropped (`parseOdds` in `lib/live-parse.js`); absent odds
  render "Not posted yet". Implied win-probability is labeled "implied".
- The demo/simulation is allowed **only because it is clearly labeled** ("SIM" badge,
  "Simulated — not a real result"). Keep that labeling if you touch it.
- Team brand colors (`lib/team-colors.js`) are public facts used only for visual identity
  (no copyrighted logos); a missing team falls back to a neutral accent — never invented.

## Architecture (where things live)

- **`app/page.jsx`** — server component; resolves the Auth.js session, renders `<AppShell>`.
- **`app/layout.jsx`** — loads `app/styles/tokens.css` (the design system) + `global.css`,
  and the fonts via `next/font` (Anton display, Inter UI, JetBrains Mono numerics).
- **`app/(app)/AppShell.jsx`** — client root: mounts the provider stack (outer→inner:
  `DataProvider → SessionProvider → LiveProvider → PicksProvider → GamePicksProvider →
  LeaguesProvider`), the masthead + mobile bottom tab bar, and the hash-routed view tree.
- **`app/hooks/useHashRoute.js`** — hash routing + `prevHash` (context-aware back).
  **`app/(app)/Routes.jsx`** — 1:1 hash→view switch.
- **`app/(app)/providers/`** — `DataProvider` (loads the static data globals, see below),
  `LiveProvider` (30s ESPN polling, demo + regional sim, super-regional advance, odds),
  `PicksProvider` (bracket picks + localStorage + `/api/picks` sync), `GamePicksProvider`
  (daily picks + results cache), `LeaguesProvider` (`LEAGUE_API` gate + Worker wrapper).
- **`app/(app)/views/`** — the 11 page views (HomeView, RegionalView, TeamView,
  StadiumView, GameView, CompareView, NationalBracketView, PicksView, H2HView, GamesView,
  LeagueView). **`app/components/`** — the shared component library (TeamToken, OddsChip,
  ProbBar, SeedBadge, LiveBadge, MatchupCard, StatRow, PickTray, StandingsTable,
  Scoreboard, MapCanvas, Tbd, masthead/nav). Each is `*.jsx` + `*.module.css`.
- **`lib/`** — pure, framework-free logic (Node-testable): `format.js`, `picks.js`
  (encode/decode/score), `games.js` (enumerate/score), `live-parse.js` (ESPN parse +
  bracket helpers), `team-colors.js`. Plus `db.js` + `pick-validators.js` (server).
- **`data.js`** — the canonical static `TOURNAMENT` object: `sites` (16) and `teams` (64)
  — names/seeds/conference/record/rpi/stats/players, plus `stadium {name, city, state,
  lat, lng, capacity, opened, blurb}` (`city/state` drive the stadium Location — NOT the
  regional host city) and `seasonNote`. `seasonSummary()` (`lib/format.js`) derives an
  honest narrative purely from these verified fields.
- **`photos.js`** — `STADIUM_PHOTOS[teamId]` (CC attribution required; keep it).
  **`schedule.js`** — `SCHEDULES[siteId]` real Friday games. **`bracket.js`** — pure
  `resolveBracket(teams, games)` double-elim resolver. These four are loaded at runtime by
  `DataProvider` from `public/legacy/` (synced from root by `scripts/sync-legacy.mjs`).
- **`scripts/`** — `validate.mjs`, `test-bracket.mjs`, `test-league.mjs`, `test-lib.mjs`
  (unit tests for `lib/`), `smoke.mjs` (Playwright, runs against the Next server),
  `refresh-stats.mjs` (nightly ESPN record refresh), `sync-legacy.mjs` (predev/prebuild).
- **`.github/workflows/`** — `ci.yml` (validate → build+smoke) and `refresh.yml`
  (nightly record refresh → validate → commit). **NOTE:** CI no longer deploys — the old
  GitHub Pages `deploy` job was removed (it uploaded the repo as a static artifact, which
  can't serve a Next.js build). Vercel's Git integration handles deploys; treat Vercel as
  the source of truth.
- **`worker/`** — optional private-league backend (Cloudflare Worker + KV), deployed
  separately to the owner's account; pure validators unit-tested by `test-league.mjs`.

## Conventions & gotchas

- **It's a build now.** Next.js + React, CSS Modules + a design-token layer
  (`app/styles/tokens.css`), `next/font`. Leaflet is loaded on demand by `MapCanvas`. Keep
  dependencies lean; don't add a CSS framework — the bespoke token system is the design.
- **React renders the DOM** — no more `render()`/`insertAdjacentHTML`/manual escaping/event
  delegation. JSX auto-escapes; use the `<Tbd>` honesty gate for any value that may be
  missing.
- **Data access** is via `useData()` (`TOURNAMENT`, `SCHEDULES`, `STADIUM_PHOTOS`,
  `resolveBracket`). Components never touch `window.*` directly.
- **`data.js` is canonical (machine-maintained).** `refresh-stats.mjs` re-serializes it
  byte-for-byte; `npm run refresh:check` asserts that form in CI and `refresh.yml` rewrites
  it nightly. **Never hand-edit `data.js`'s formatting** — change values then run
  `npm run refresh`. Only `record` is auto-refreshed; a team whose record can't be fetched
  keeps its existing value (never null/invent). `predev`/`prebuild` run `sync-legacy.mjs`
  to copy the four data files into `public/legacy/` for `DataProvider`.
- **Hash routing** (preserved): `#/`, `#/r/:site`, `#/t/:team`, `#/s/:team`, `#/vs/:a/:b`,
  `#/g/:eventId`, `#/bracket`, `#/picks` + `#/picks/:code`, `#/h2h/:a/:b`, `#/games`,
  `#/league` + `#/league/:code`. Primary nav is the desktop tab row + mobile bottom tab bar.
- **Live module** (`LiveProvider`): 30s ESPN poll (paused on `document.hidden`), `byPair`/
  `bySite`/`odds`, demo simulator, and `maybeAdvance` (computes 8 super-regionals once all
  16 regional champions resolve). It mirrors `round`/`sites` back to `window.TOURNAMENT` so
  test hooks keep working. Odds-chip flashes on line move via `prevOdds`.
- **Test hooks (smoke depends on these):** `window.__picks` (encode/decode/get/set),
  `window.__gamepicks` (get/set/enumerate/score), `window.__leagues` (setApi/get),
  `window.__simAll`/`__simRegional`/`__stopSim`, and the `window.TOURNAMENT` mirror. Views
  expose stable `data-testid`s (e.g. `scoreboard`, `regional-card`, `regional-team`,
  `game-row`, `bg-card`, `cmp-table`, `reg-node`, `pick-reg`, `pick-node`, `pick-option`,
  `standings`, `diamond`). Keep these when refactoring or update `smoke.mjs` in lockstep.
- **Private leagues** (`#/league`): the Cloudflare Worker is a *dumb store* of
  `league → members` — **all scoring is client-side** (`scoreBracketCode`/`scoreGames`).
  Gated by `LEAGUE_API` in `LeaguesProvider`; `window.__leagues.setApi()` overrides it at
  runtime (smoke flips it). Lock is server-authoritative at `lockTs` (first pitch).
- **Daily pick'em** (`#/games`): `enumerateGames` (`lib/games.js`) lists every game with a
  stable key (`siteId_G#`, `super-<sd>_G#`); fairness = a pick wins only if
  `ts < gameStartMs && pick === winner`. `RESULTS_CACHE` (`localStorage["cws-results-v1"]`)
  keeps decided games scored after they age out of the poll window.
- **Bracket Challenge** (`#/picks`): `PICKS` → `localStorage["cws-picks-v1"]`, encoded to a
  stable 26-char URL code (`lib/picks.js`; bump the version char if `data.js` ordering
  changes). Snapshots the original 16 sites at mount so regional scoring survives the
  super-flip. CWS champion stays a labeled "pending" prediction until `T.omahaChampion` is
  set. A persistent unofficial-predictions banner is required on `#/picks` and `#/h2h`.

## Running & verifying

```bash
npm run dev            # Next dev server on http://localhost:3000 (syncs data first)
```

Exercise the flow in a browser (map renders pins, drill-down works, scoreboard loads,
compare/box-score open, picks save + share). Then run the CI checks:

```bash
npm run validate        # data integrity (16 sites, 64 teams, seeds, refs, photos/schedule)
npm run refresh:check   # assert data.js is canonical (fails if hand-edited)
npm test                # bracket + league + lib/ unit tests
npm run build           # production build (also runs the data sync)
npm run smoke           # Playwright vs the Next server (BASE=http://localhost:3000)
npm run refresh         # fetch live records from ESPN and rewrite data.js (network)
```

For smoke locally: `npm run build && npm run start &` then `npm run smoke` (or point
`BASE` at a running `npm run dev`).

## Super-regional upgrade (≈ June 2)

This is now **automatic**: when all 16 regional champions resolve from real finals,
`LiveProvider`'s `maybeAdvance` (via `computeSuperRegionals` in `lib/live-parse.js`) builds
the 8 super-regionals (host = higher seed) and flips `round` to `"super-regional"` in
provider state (mirrored to `window.TOURNAMENT`). Views read sites/round from `LiveProvider`
and are count-agnostic, so no UI change is needed. To hard-code the final field instead,
set `TOURNAMENT.round`/`sites` in `data.js` (then `npm run refresh`). Extend `TOURNEY_DATES`
in `LiveProvider` when super-regional dates are known. Set `TOURNAMENT.omahaChampion` once
Omaha is decided to score the CWS champion pick.
