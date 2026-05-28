# Claude Sessions — Roadmap

This file breaks the "next level" work into **discrete, self-contained sessions**. Each one is scoped to be planned and executed in a single Claude session. Start a session by reading its block here plus [`CLAUDE.md`](CLAUDE.md) (architecture + the non‑negotiable "never fabricate data" rule).

**Ground rules that apply to every session**
- No build step, no backend, no npm deps. Plain HTML/CSS/JS. Keep it that way.
- All rendered values go through `esc()` / `fmt()`; unverifiable data shows `TBD`, never a guess.
- App lives in one IIFE in `index.html`; data in `data.js` / `photos.js` / `schedule.js`.
- Re-render-safe clicks use delegation; bump `?v=` on local scripts when testing cache.
- Verify in a real browser (`python3 -m http.server 4173`) before claiming done.

**Recommended order:** 1 → 2 → 4 → 3 → 5 → 6 → 7 → 8 (1 is the instant win; 2 & 4 are the headline features; the rest are polish/infra and can reorder freely).

| # | Session | Effort | Depends on |
|---|---------|--------|------------|
| 1 | ✅ Ship it live (GitHub Pages + social card) + CI | S | — |
| 2 | ✅ Self-advancing bracket | M | — |
| 3 | ✅ Visual bracket diagram | M | 2 |
| 4 | ✅ Rich live game view | M | — |
| 5 | ✅ Data freshness + CI | M | — |
| 6 | ✅ Map UX (toggle + cleaner pins) | S | — |
| 7 | Visual polish (team colors, a11y, image opt) | M | — |
| 8 | Engagement (favorites, notifications, PWA) | M | 1 |
| 9 | ✅ Stadium & team detail (history + 2026 season) | L | — |
| 10 | "Today" live hub (game-day home) | M | — |
| 11 | Pre-rendered per-view share cards | M | 1 |
| 12 | Verified team history & program context | L | — |
| 13 | ✅ Bracket Challenge — full chain, shareable (static) | L | 2 |
| 14 | ✅ Pick'em backend + private leagues (Cloudflare Worker + KV) | M | 13 |
| 15 | ✅ Daily per-game pick'em (W/L tally + standings) | M | 14 |

---

## Session 1 — Ship it live (GitHub Pages + social card) ✅ SHIPPED
> **Shipped:** commit `25e0bf6` · live at **https://teddygcodes.github.io/2026-cws-map/** · CI (validate → smoke → deploy) green, deploy gated on checks. Delivered: OG/Twitter tags + generated 1200×630 card (`docs/og-card.*`), `.github/workflows/ci.yml`, `scripts/validate.mjs` + `scripts/smoke.mjs` (dev-only `package.json`; runtime app still zero-dep), README live URL + CI badge. Live URL passes the browser smoke test.

**Goal:** Give the app a real, shareable URL with a good link preview.

**Why:** It only runs locally today. A live URL turns the repo into a usable product.

**Scope**
- Enable GitHub Pages (deploy from `main`, root). Confirm the app works from a non-root path (hash routing already does; double-check the `data.js?v=` relative paths resolve under `/2026-cws-map/`).
- Add Open Graph + Twitter meta tags to `index.html` (`og:title`, `og:description`, `og:image`, `twitter:card`).
- Add a 1200×630 social preview image to `docs/` (reuse the home/scoreboard screenshot or make a dedicated card).
- Add the live URL to `README.md` (top, as a badge/link).

**Gotchas**
- Pages serves over HTTPS — the ESPN API and CARTO tiles are HTTPS, fine. The keyless Google Maps embed must stay HTTPS too.
- Verify relative asset paths work under the project subpath (`/2026-cws-map/`), not just `/`.

**Acceptance:** Public URL loads the map + live scoreboard; a pasted link shows a title/description/image preview.

---

## Session 2 — Self-advancing bracket ✅ SHIPPED
> **Shipped:** commit `ec478be` · live + CI green (validate + `npm test` bracket fixtures → smoke (drives `__simAll`, asserts 16→8) → deploy). Delivered: `bracket.js` pure double-elim resolver (unit-tested), per-site live aggregation (`LIVE.bySite`), `renderSchedule` fills Games 3–7 from real finals + champion banner, gold champion map pins, auto super-regional advance (`#s` vs `#17−s`, in-memory), and a clearly-labeled "Simulate this regional" / `__simAll` demo. `data.js` round stays "regional" (advance is automatic from live results).

**Goal:** Fill in Games 3–7 (and eventually super-regionals) automatically from real results instead of showing "TBD."

**Why:** The headline of a *live* tournament map. The feed already knows winners/losers; the bracket should resolve itself.

**Scope**
- In the LIVE module, after each poll, for each site compute game outcomes from matched ESPN events (which `comps` have `winner: true`, final scores).
- Resolve the double-elim logic: G3 = G1 loser vs G2 loser, G4 = G1 winner vs G2 winner, G5 = G3 winner vs G4 loser, G6 = G4 winner vs G5 winner, G7 (if necessary) = G6 rematch. Replace `LATER_GAMES` placeholder text with real team names + scores/status as they become known; keep truly-unknown future games as `TBD`.
- Derive each **regional champion** when the bracket completes; surface it on the regional + map (e.g., a "Clinched" badge on the pin/site).
- Wire the `SUPER_REGIONAL_UPGRADE` path: once all 16 regionals finish, build the 8 super-regional `sites` (host = higher national seed) and flip `round`. Gate behind a check so it only happens with real results.

**Implementation notes**
- Reuse `matchTeamId`, `parseEvent`, `pairKey`, `LIVE.byPair`. Add an outcome map keyed by site → {gameNum → {winnerId, loserId, score, state}}.
- Be careful matching multiple games between the same two teams (G7 is a rematch of G6 — distinguish by date/sequence, not just the team pair).
- Honesty: only assert advancement from `state === "post"` results; never predict.

**Acceptance:** On a day with completed regional games, Games 3–6 show real matchups/scores; a finished regional shows its champion; logic verified against a real past date's scoreboard.

---

## Session 3 — Visual bracket diagram ✅ SHIPPED
> **Shipped:** commit `743df37` · live + CI green. Per-regional **List ⟷ Bracket toggle** (mode persists across live re-renders): double-elim diagram from `resolveBracket` — Winners (G1,G2→G4), Elimination (G3→G5), Championship (G6 + G7-if-necessary) — game cards with winner highlight + status + click-through, feeder text for undetermined slots. New **`#/bracket` "Road to Omaha"** view: 3 responsive columns (16 regionals in the 8 seed pairings → 8 super regionals → CWS/Omaha) with deep-linking nodes + champion badges, reached via a map button. Smoke asserts both. Zero new deps.

**Goal:** Replace (or augment) the schedule list with a visual double-elim bracket per regional, plus a national "Road to Omaha" overview.

**Why:** A bracket *looks* like a tournament; far more legible than a list.

**Scope**
- Per-regional double-elim bracket (winners bracket / elimination bracket / final) rendered in CSS/SVG. Reuse live status + the Session 2 outcomes to light up winners.
- National overview: 16 regionals → 8 super-regionals → CWS, as a zoomable/scrollable tree or column layout. Clicking a node deep-links to that regional/game.
- Keep it responsive (bracket trees are hard on mobile — consider a stacked/accordion fallback under ~700px).

**Gotchas**
- Pure CSS bracket connectors are fiddly; SVG lines or a grid + pseudo-element connectors. No charting libraries (keep deps at zero).
- Reads cleanest if Session 2 is done first (so winners are known), but can ship with current `SCHEDULES` data and TBD slots.

**Acceptance:** Each regional shows a bracket; the national view links through; works on desktop and degrades gracefully on mobile.

---

## Session 4 — Rich live game view ✅ SHIPPED
> **Shipped:** commit `be8dc3b` · live + CI green. Game detail now renders, from ESPN's `summary`: a live **situation strip** (count/outs/base diamond/batter-vs-pitcher), a **scoring-plays feed**, and a **full per-player box score** (batting + pitching, collapsible per team) atop the linescore — all guarded so missing data degrades cleanly. Open real games **auto-refresh** on the 30s poll. SIM extended with a labeled live situation + scoring plays (smoke asserts it). Win probability omitted (ESPN doesn't expose it for college — no fabrication). Verified vs real completed game `401869739`.

**Goal:** Turn the box score into a real live experience.

**Why:** Right now `#/g/:id` is just R/H/E. ESPN's `summary` endpoint has much more.

**Scope (from ESPN `/summary?event=ID`)**
- **Situation strip** while live: inning + half, balls/strikes/outs, base runners (diamond graphic), current pitcher vs current batter. (`summary.situation`, `header.competitions[].status`.)
- **Scoring plays** feed (`summary.plays` filtered to scoring) and/or recent plays.
- **Per-player box score**: batting (AB/R/H/RBI/AVG) and pitching (IP/H/R/ER/BB/K/ERA) lines from `summary.boxscore.players`.
- **Win probability** if present (`summary.winprobability`) — small bar or last value.
- Auto-refresh the open game detail on the existing poll cadence (today only the demo re-renders live; real game detail should re-fetch while viewed).

**Gotchas**
- College summaries are less complete than MLB — guard every field, fall back to `TBD`/omit. Don't render empty tables.
- Keep the linescore; add the rest below it.
- Re-fetch politely (only while the detail is the active view; reuse `LIVE` poll timing).

**Acceptance:** A live game shows count/runners/pitcher-batter and scoring plays; a final shows full per-player box; missing data degrades cleanly; verified against a real completed game id.

---

## Session 5 — Data freshness + CI ✅ SHIPPED
> **Shipped:** commit `53df1dd` · live + CI green · `refresh.yml` dispatch green (clean no-op). Delivered: **`scripts/refresh-stats.mjs`** — pulls each team's current W-L record from ESPN (`teams/{id}` totals; dynamic name→id map via `teams?limit=900`) and re-serializes `data.js` **deterministically** (records-only; rpi/sos/rate-stats/players preserved byte-for-byte). Honest fallbacks: a team whose record can't be fetched **keeps its existing value** (18 offseason-gap teams handled this way), and an unreachable source **hard-fails with no write** (verified: exit 1, `data.js` untouched). `--check` asserts canonical form with no network. **`.github/workflows/refresh.yml`** runs nightly (`cron: 0 9 * * *`) + manual dispatch → refresh → validate → commits to `main` **only if a record changed** (redeploys via `ci.yml`); no untrusted `github.event.*` in any `run:`. **`ci.yml`** validate job now runs `npm run refresh:check` so a hand-edit that breaks canonical form fails CI. This run refreshed 4 records from ESPN (UNC 45-11, Florida 39-19, Southern Miss 44-15, Kentucky 31-21). Zero new runtime deps; README/CLAUDE.md document the auto-refresh + canonical-form rule.

**Goal:** Stop the stats from going stale, and add automated safety nets.

**Why:** `data.js` is hand-baked as of 5/25 and there are zero tests.

**Scope**
- **Refresh script** (Node, no deps or a tiny dev-only dep) that regenerates the stats portion of `data.js` from the same sources (WarrenNolan / TheBaseballCube / official) — or fetches team season stats live from ESPN and merges. Preserve the static fields + comments (mirror the generator approach already used once).
- **GitHub Action**: nightly run of the refresh (opens a PR or commits), plus a **CI workflow** on push that runs data-integrity checks: 16 sites, 64 unique teams, seeds 1–16, every `site.teams` id resolves, `photos.js`/`schedule.js` keys are valid team ids, and `node --check` on all JS.
- Optional: a tiny **Playwright smoke test** (map renders 16 pins, drill-down map→regional→team→stadium works, scoreboard loads).

**Gotchas**
- Don't let automation overwrite verified values with garbage — validate before committing; keep the `TBD` discipline.
- Scraping sources may change; make the refresh fail loudly rather than write bad data.

**Acceptance:** CI runs on push and catches a broken data edit; the refresh script reproduces `data.js` deterministically; (optional) nightly Action is green.

---

## Session 6 — Map UX (pin clustering) ✅ SHIPPED
> **Shipped:** commit `96207ff` · live + CI green. Per user direction we **did not cluster** — instead redesigned pins as compact **circular markers** (22px, was a 34px teardrop) so the SEC group reads cleanly, added a top‑of‑map **Map · List · Bracket** segmented toggle (reuses the existing `.view-toggle`/`.vt` component; mirrored on the bracket view) so the national bracket is reachable without scrolling, and a **List** mode (`renderSiteList`) showing all 16 regionals as clickable rows (seed/host/conference/record) — the overlap‑proof navigation that satisfies "every site reachable." Pins for sites with a game in progress get a **pulsing live dot** (`siteIsLive`, refreshes on the 30s poll). New state `mapMode`; one delegated handler `wireMapNav()`. Smoke asserts the 3‑segment toggle + 16 list rows + row navigation and still verifies 16→8 pins. Zero new deps/CDN.

**Goal:** Fix the overlapping pins (the SEC cluster is unreadable) and improve map navigation.

**Why:** Several Southeast sites stack on top of each other at the default zoom.

**Scope**
- Add marker clustering / spiderfy on overlap. Prefer a tiny vanilla approach or Leaflet.markercluster via CDN (allowed — it's a Leaflet plugin, still no build step). Decluster on zoom-in.
- Add a **site list** toggle (a sidebar/list of all 16 regionals) so users can navigate without fighting the map.
- Optional: hover/tooltip preview of the regional's top seed + live status; pin shows a live dot when that site has a game in progress.

**Acceptance:** No two pins are unclickable due to overlap; list toggle navigates to any regional; live sites are visually flagged.

---

## Session 7 — Visual polish (team colors, accessibility, image optimization)
**Goal:** Make it feel premium and usable by everyone, and load fast.

**Scope**
- **Team color theming:** add primary/secondary colors per team to `data.js` (or a `colors.js`); tint team cards, stat accents, comparison columns. Keep the red broadcast theme as the chrome.
- **Accessibility pass:** keyboard navigation for cards/rows, focus management on view changes (move focus to the view heading), ARIA roles/labels for the scoreboard and tables, audit contrast on muted/`TBD` text, `prefers-reduced-motion` already handled — verify.
- **Image optimization:** convert `images/*.jpg` to WebP (with jpg fallback or just WebP), generate ~800px and ~1600px variants, add `loading="lazy"` + `srcset`. Cuts the ~15 MB footprint significantly for Pages.

**Gotchas**
- Colors must keep text legible (contrast) — don't tint backgrounds so hard the white text fails AA.
- Don't break the existing photo attribution in `photos.js` when re-encoding (keep author/license/source).

**Acceptance:** Cards reflect team colors with passing contrast; full keyboard traversal works; Lighthouse a11y + performance noticeably improved.

---

## Session 8 — Engagement (favorites, notifications, PWA)
**Goal:** Give people a reason to come back and a way to keep it open during the tournament.

**Scope**
- **Favorite teams:** star a team (persist in `localStorage`); pin favorites to the top of the scoreboard and highlight their pins/cards.
- **Browser notifications:** with permission, notify when a favorite's game goes **live** or **final** (driven off the existing poll — diff state between polls).
- **PWA:** add a `manifest.webmanifest` (name, icons, theme color) and a service worker that caches the shell + `images/` for **offline/installable** use. (Service worker is a static file — still no build step.)

**Gotchas**
- Notifications require HTTPS + user gesture for permission — depends on Session 1 (Pages) for a real origin.
- Service-worker caching must not serve stale live scores — cache the shell/assets, always network-first for ESPN calls.
- Respect the no-spam principle: only notify on state transitions, not every poll.

**Acceptance:** Favorites persist and reorder the board; a state change fires exactly one notification; the app installs and the shell loads offline.

---

## Session 9 — Stadium & team detail pages (history + 2026 season) ✅ SHIPPED
> **Shipped:** commit `ab7ea9e` · live + CI green. Fixed the stadium-page **Location bug** (it showed the *regional host* city — e.g. Arizona State read "Lincoln, NE" instead of Phoenix, AZ): added verified `city`/`state`/`opened` to every stadium and the page now reads those. **Removed** the Google Maps embed + "Open in Google Maps"/"Street View" buttons. Researched + **verified all 64 stadiums** (names, cities, coords, opened year, 2–3-sentence history) via 8 parallel agents — caught real corrections (Milwaukee now plays at **Franklin Field**, not Henry Aaron Field; Oklahoma→Kimrey Family Stadium; Cincinnati drops "Marge Schott"; Yale→Bush Field; WVU→Kendrick; Binghamton→Bearcats Baseball Complex; BC/Virginia/Miami/USC-Upstate name fixes). Added an honest **`seasonSummary()`** (built only from verified record/RPI/seed/conference/rate-stats — invents nothing) rendered as a "2026 Season" panel on the team page and an "About the team" panel on the stadium page, plus 21 source-verified `seasonNote`s (cross-checked W–L against `data.js`; rest honestly `null`). Schema (`stadium.city/state/opened`, `team.seasonNote`) is canonical via `refresh-stats.mjs` (now exports `serialize`/`loadTournament`); `validate.mjs` requires non-empty city/state; smoke asserts no map embed + "City, ST" Location + history/season sections. Honesty rule held throughout — every fact is sourced or left blank.

---

## Session 10 — "Today" live hub (game-day home)
**Goal:** One focused, self-updating screen of every tournament game across all 16 sites.

**Why:** The live scoreboard exists but is buried at the top of the map view. On game days people want a single hub — what's live now, what's next, what just finished — not to scroll the map.

**Scope**
- New `#/today` view: all games grouped **Live / Upcoming / Final**, with countdowns to first pitch and a "live now" count + last-updated stamp. Filters: live-only, by conference/region.
- Reuse the existing engine — `LIVE.bySite`/`LIVE.list`, `parseEvent`, `sbCard`/`renderScoreboard`, the 30s poll, and `onLiveUpdate` routing. Deep-link each game to `#/g/:id` (pregame → `#/vs/:a/:b`).
- Surface it in the top toggle (Today · Map · List · Bracket) and consider making it the default landing during the tournament window.

**Gotchas**
- Don't yank scroll on the 30s refresh (reuse the `showView` change-guard). 
- Smoke must stay ESPN-independent: assert the hub renders structure from the static schedule, not live results.

**Acceptance:** the hub lists all scheduled games, updates itself, filters work, deep links navigate; smoke covers the view.

---

## Session 11 — Pre-rendered per-view share cards
**Goal:** Sharing a team or regional link unfurls with *that* entity's card, not the one generic card.

**Why:** Rich social previews drive clicks; we already have the `og-card.html` + Playwright render pipeline and a GitHub Action — extend them.

**Scope**
- Parameterize `og-card.html` (`?team=<id>` / `?site=<id>`) to render per-entity cards; an Action step renders `docs/og/team-<id>.png` (64) + `docs/og/site-<id>.png` (16) on each data refresh.
- **SPA caveat:** crawlers don't run our hash router, so per-page OG needs static stubs — generate `share/t/<id>.html` / `share/r/<id>.html` (and team/regional) carrying the right `og:image`/title/description + a redirect into the hash route. Link those as the canonical share URLs.
- Regenerate cards in CI/`refresh.yml` when data changes; optimize PNG size.

**Gotchas**
- Hash-routed SPA → real per-entity OG requires the static stub pages above. Keep images cache-busted; don't bloat the repo.

**Acceptance:** a team/regional share URL shows its own card in a link preview (validate with a debugger); cards regenerate in CI.

---

## Session 12 — Verified team history & program context
**Goal:** Deepen team pages with verified program history (CWS appearances, last national title, all-time NCAA-tournament record).

**Why:** Team pages now carry the current season; historical context reinforces the project's real-data identity and rewards drill-down.

**Scope**
- Add a verified `history` object per team (e.g. `{ cwsApps, titles, lastTitle, ncaaApps }`), `null` where unverifiable.
- Research pass via parallel agents (like Session 9), strictly sourced; honest `TBD` for gaps. Update `serialize()` + `validate.mjs`; keep `data.js` canonical.
- Render a "Program history" panel on the team page (and/or the stadium About panel).

**Gotchas**
- Honesty first — only sourced facts, never invented; research-heavy; re-verify canonical form (`refresh:check`).

**Acceptance:** team pages show verified program history with visible `TBD` for gaps; canonical + CI green.

---

> **Two pick'em contests, one league.** The app runs two complementary games: the **Bracket Challenge** (predict the whole field once, up front — foresight) and the **Daily Pick'em** (pick each game's winner as matchups unlock — a rolling W/L record). A friend joins **one private league code** and is ranked in **both** (two standings, one group). Sessions 13 → 14 → 15 build this in order: static bracket, then the shared backend, then per-game.

## Session 13 — Bracket Challenge (full chain, shareable; static) ✅ SHIPPED
> **Shipped:** commit `996eeff` · live + CI green. New `#/picks` view: predict all 16 regional champions → cascading predicted super-regional matchups (reusing the seed logic) → 8 super winners → CWS champion. Picks persist to `localStorage["cws-picks-v1"]` and encode into a stable, versioned **26-char URL** (`encodePicks`/`decodePicks`, exact round-trip, malformed→null); shared `#/picks/<code>` links load into the viewer's editable copy, and `#/h2h/<a>/<b>` compares two brackets. Scores ✓/✗ against real results — and critically **survives the destructive super-flip** by snapshotting the original 16 sites at load (`snapshotPickSites`) and scoring via `resolveBracket` on `LIVE.bySite` (verified: after `__simAll`, all 16 regional picks score, 6✓/10✗). The **CWS champion stays a labeled "pending" prediction** (Omaha isn't modeled — a one-line `T.omahaChampion` lights it up later). A persistent "unofficial predictions" banner enforces the honesty rule. Reused the `.nb-cols` bracket UI + delegated-handler pattern; **no `data.js` change** (refresh:check stays canonical). smoke adds: 3 columns + 16 pick cards + encode/decode round-trip + shared-link restore + head-to-head. `window.__picks` test hook added.

**Goal:** Let anyone predict the whole Road to Omaha; the "save" is a shareable URL — no backend.

**Why:** Turns spectators into participants and its value peaks **before the 5/29 first pitch**, so it ships first and stand-alone.

**Scope**
- Pick mode built on the `#/bracket` view: pick all **16 regional champions** → app computes predicted **super-regional** matchups (reuse `superPairings`, #s vs #17-s) → pick **8 super winners** → pick the **CWS champion**.
- Encode picks compactly into the hash (`#/picks/<code>`, versioned); persist in `localStorage`; "copy link" + reset.
- **Score each round independently against actual results** as games finish (`siteChampion`/`LIVE.bySite`): a super pick only counts if that team actually got there and won. Running score + busted picks, clearly labeled **prediction vs reality** (same honesty discipline as the SIM badge).
- **Head-to-head:** paste a friend's link to compare two brackets side-by-side (works pre-backend).

**Gotchas**
- Cascading picks (super matchups depend on regional picks); stable/versioned encoding; predictions must be visually distinct from real results; honor-system locking on a static site — snapshot/label accordingly (real locking arrives with the backend in Session 14).

**Acceptance:** a full bracket fills out, the link round-trips the picks exactly, scoring matches actual results, head-to-head compares two links; smoke covers fill + encode/decode round-trip.

---

## Session 14 — Pick'em backend + private leagues (Cloudflare Worker + KV) ✅ SHIPPED
> **Shipped:** commit `3ef9fbf` · ships **dark** (`LEAGUE_API=""`) — CI/Pages green and unaffected until the owner deploys the Worker. New `worker/` (Worker + `wrangler.toml` + setup README): a **dumb KV store** of `league → members` with endpoints create / GET / submit-member, **server-side first-pitch lock** (409 after `LOCK_TS`), CORS allow-list, per-IP + per-league caps, and honor-system `memberId` edit tokens (not auth). **All scoring is client-side** — extracted `scoreBracketCode()` (re-used by the picks strip; behaviour-neutral) ranks each member's stored 26-char bracket via the existing resolver, so the Worker never touches ESPN. Client: `#/league` hub (create/join/list) + `#/league/<code>` standings (correct desc, win% tiebreak), lock countdown, submit/update, copy-invite; graceful `.lg-unavailable` when disabled; `cws-leagues-v1` persistence; `leagueApi()` wrapper; entry button on the picks bar. Member object reserves a `games:{}` field so **Session 15 drops into the same league** with no reshaping. Verified: worker handler e2e in Node (create/member/get/lock/CORS/404 all correct; memberId not exposed), `scripts/test-league.mjs` (16 validator assertions in `npm test`), smoke covers the disabled state (no page errors) + a mocked enabled standings flow. **Owner step:** create the Cloudflare account/KV, `wrangler deploy`, paste the URL into `LEAGUE_API` — ideally before 5/29 for the bracket-league to be usable.

**Goal:** The shared-state foundation a static site can't provide — **private leagues** (one code) plus **first-pitch locking** — powering standings for *both* contests.

**Why:** A real "winner" needs persistent multi-user standings and fair locking. Scoped to private leagues (smaller abuse surface than a global board); seasonal, low-commitment infra.

**Scope**
- **Cloudflare Worker + KV** (owner creates the account/namespace + provides the Worker URL; all code written here). Endpoints: create league (returns code) · join + submit/replace your **bracket** entry (display name + versioned pick code) · read **standings** for a code. Designed so per-game picks (Session 15) drop into the same league + KV with no reshaping.
- **One league, two standings:** a single league code; the league page shows a **Bracket Challenge** leaderboard now (per-game board added in 15). Bracket scoring reuses Session 13.
- **First-pitch locking, server-side:** the Worker rejects/ignores picks for games already started or final (uses the live feed / game start times) — the fairness piece a static honor-system can't enforce.
- Guardrails: validate pick-code shape, rate-limit by IP, cap entries/league, display name only (no PII), optional Turnstile; CORS locked to the Pages origin.
- **Isolation:** app stays static on Pages; only this feature calls the Worker and it must **degrade gracefully** if the endpoint is down. Tear down after Omaha.

**Gotchas**
- Public-endpoint abuse/spam; CORS + secrets/config; clock/locking correctness; don't let a backend outage break the static app.

**Acceptance:** create a league → friends join + submit brackets → standings update vs real results; picks lock at first pitch; abuse guards in place; the static app is unaffected if the Worker is unreachable.
**Depends on:** Session 13.

---

## Session 15 — Daily per-game pick'em (W/L tally + standings) ✅ SHIPPED
> **Shipped:** commit `<pending>` · live + CI green (Worker redeployed). New **`#/games`** view (6th nav tab) + a **Daily** standings tab in the existing private leagues. `enumerateGames()` lists every game with a stable key (`siteId_G#` regionals from the snapshot, `super-<sd>_G#` supers) classified Open/Locked/Upcoming via `resolveBracket` + best-of-3; pick winners → `localStorage["cws-gamepicks-v1"]` → `POST /league/<code>/games` (new Worker endpoint that stamps a server `ts` per pick, **not** lock-gated). **Fair locking without a server schedule:** `scoreGames()` counts a pick a win only if `ts < first-pitch && pick === winner` (client knows real start times from the live feed). Append-only `RESULTS_CACHE` keeps decided games scored after they leave the 30s poll window. Scope = regionals + super-regionals (Omaha not modeled). Bracket contest untouched (separate key/endpoint/scorer). Verified: worker `/games` e2e (post-lock accepted, ts preserved on unchanged picks, invalid keys rejected, memberId hidden); 31 worker unit asserts; smoke covers 6 tabs + Games view (32 open pre-tournament, 103 final after `__simAll`, pick round-trip) + Bracket|Daily standings.

**Goal:** Pick the winner of **every tournament game** as matchups unlock; build a **W/L record**; crown the league's per-game champion.

**Why:** The engagement engine — a reason to come back daily for two weeks. Complements the one-shot Bracket Challenge.

**Scope**
- **Pick-as-you-go:** a game becomes pickable once both teams are determined (matchup known) and it's still **pre-game**; future games show feeder placeholders ("Loser G1 vs Loser G2"). Reuse `resolveBracket` + `LIVE.bySite` + the existing feeder logic — same machinery as the bracket diagram. Covers all rounds: regional Games 1–7, super-regional best-of-3, CWS.
- **Submit picks to the Session 14 backend** (same league code, same KV); the Worker **locks each pick at that game's first pitch**. Score = **total correct picks** (a W/L record like 38–12); tie-break by win % then later-round accuracy.
- **UI:** a "Pick'em" view listing open games (pickable now) + your pending/locked picks + your record; the league page gains a **second standings tab** (Daily Pick'em) beside the Bracket Challenge board. Clearly label predictions vs results.
- Optional solo fallback: your own W/L tracked in `localStorage` if not in a league.

**Gotchas**
- Matchup availability cascades with live results (don't let a pick persist if its game's teams change); lock exactly at first pitch (server-authoritative); ~150 games over the event — keep the open-games list tight and the standings query cheap.

**Acceptance:** open games are pickable and lock at first pitch; finals update each player's W/L; the per-game leaderboard ranks the league by total correct; smoke covers the open-games render + pick round-trip (static/ESPN-independent).
**Depends on:** Session 14.

---

### How to use this file
- Pick a session, open a new Claude session, and paste/point it at that block.
- Keep entries updated: when a session ships, note the commit/PR and check it off (e.g., strike through the table row or add a ✅).
- New ideas go at the bottom as future sessions; keep each one single-session sized.
