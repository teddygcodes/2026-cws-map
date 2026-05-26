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
| 2 | Self-advancing bracket | M | — |
| 3 | Visual bracket diagram | M | 2 (nice-to-have) |
| 4 | Rich live game view | M | — |
| 5 | Data freshness + CI | M | — |
| 6 | Map UX (pin clustering) | S | — |
| 7 | Visual polish (team colors, a11y, image opt) | M | — |
| 8 | Engagement (favorites, notifications, PWA) | M | 1 |

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

## Session 2 — Self-advancing bracket
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

## Session 3 — Visual bracket diagram
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

## Session 4 — Rich live game view
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

## Session 5 — Data freshness + CI
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

## Session 6 — Map UX (pin clustering)
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

### How to use this file
- Pick a session, open a new Claude session, and paste/point it at that block.
- Keep entries updated: when a session ships, note the commit/PR and check it off (e.g., strike through the table row or add a ✅).
- New ideas go at the bottom as future sessions; keep each one single-session sized.
