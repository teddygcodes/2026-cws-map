# Design Brief & Handoff — 2026 Road to Omaha

A redesign brief for the 2026 NCAA Baseball Tournament app. The goal: make every
surface feel like **FanDuel met Kalshi met ESPN** — a broadcast-grade prediction
sportsbook, built by a real team of designers and engineers.

## How to use this document

1. Start a fresh design session (e.g. invoke the **frontend-design** skill).
2. Paste **Section A (North Star)** + **Section B (Design System)** first — this is
   the shared foundation every page inherits. Keep it in context for the whole session.
3. Then paste **one page prompt** from Section C at a time. Each is self-contained
   and references the system, so pages come out cohesive without re-explaining the vision.
4. Build page-by-page; don't try to do all eleven at once.

> **Tech reality (tell the design session):** the app currently runs as one
> vanilla-JS file (`public/legacy/app.js`) inside a Next.js shell on Vercel, with a
> dark "ESPN broadcast" theme in `public/legacy/app.css`, Leaflet for the map, and
> live data from ESPN's public API. The redesign can modernize the CSS/markup freely
> and may introduce a component layer, but must keep: hash routing (`#/`, `#/r/:site`,
> `#/t/:team`, `#/vs/:a/:b`, `#/bracket`, `#/picks`, `#/games`, `#/league`), the live
> ESPN polling, and the **honesty rule** — never invent a stat, score, or odd; missing
> values render as a visible `TBD`/"—", never a fabricated number.

---

## SECTION A — North Star

**One line:** *A broadcast-grade prediction market for the Road to Omaha — the energy
of a live ESPN telecast, the delight of a FanDuel betslip, the credibility of a Kalshi market.*

Decode the three references into intent — every page should answer "which of these am I channeling right now?":

- **ESPN — Broadcast authority & energy.** Bold condensed type, a live scores
  heartbeat, dark "studio" stage, team identity through color, LIVE pulses, the sense
  that *the game is happening right now*. This is the **stage and the energy**.
- **FanDuel — Consumer delight & action.** Vibrant accent moments, big confident tap
  targets, odds chips, a persistent "betslip"-style pick tray, celebratory
  micro-interactions when you make/win a pick, app-grade mobile with a bottom tab bar.
  This is the **interaction and the joy**.
- **Kalshi — Market credibility & data.** Prediction-market polish: probabilities and
  percentages visualized (bars, donuts, sparklines), tabular/monospaced numerics,
  precise grid, restraint, generous whitespace around data, the feeling that *these
  picks have real stakes*. This is the **trust and the data craft**.

**The synthesis rule:** when in doubt, ESPN sets the *stage*, FanDuel drives the
*action*, Kalshi earns the *trust*. A great screen does all three: it feels alive,
it's a joy to act on, and the numbers look serious.

**What we are NOT:** a flat admin dashboard, a generic Bootstrap card grid, a literal
Google-Maps clone, or a gambling-grimy neon casino. Premium, confident, modern.

---

## SECTION B — Shared Design System

### Palette (dark-first; this is a night-game broadcast)

Evolve the current charcoal+red into a richer, layered system:

- **Surfaces (layered depth, not flat black):**
  - `--bg` deep ink: `#0A0B0F` (slightly cool, near-black)
  - `--surface-1`: `#13151B`  ·  `--surface-2`: `#1B1E26`  ·  `--surface-3` (raised cards): `#22262F`
  - Subtle 1px borders `--line: #2A2E38`; raised cards get a faint top highlight + soft shadow for "glass on a dark stage."
- **Primary accent — Broadcast Red** (ESPN heritage, keep it): `--accent: #E8202A`. Use for live, brand, primary CTAs.
- **Money Green** (FanDuel positive / favorite / win): `--up: #18C964`.
- **Market Blue/Cyan** (Kalshi data / probability / neutral action): `--data: #3B9EFF`.
- **Gold** (seeds, championship, trophy moments): `--gold: #F2C14E`.
- **Text:** `--text: #F4F5F7`, `--muted: #9CA3AF`, `--faint: #6B7280`.
- **Gradients (use sparingly, for hero moments only):** red→magenta for the brand/CWS,
  green→teal for "win"/positive states, blue→indigo for market/odds heroes. Never gradient body text or every card.
- **Team color accents:** pull each team's known primary color in as a left-border, glow,
  or chip tint on team cards/matchups. Use color, not copyrighted logos (monogram/wordmark
  treatments are fine; see "Identity" below).

### Typography

- **Display / headlines:** a heavy condensed face (current Anton works, or a
  modern condensed like Druk/Anton/Archivo Expanded). Tight tracking, uppercase for
  section heads. This is the ESPN broadcast voice.
- **UI / body:** a clean grotesk (Inter, or keep Barlow). Comfortable, neutral.
- **Numerics — critical:** all stats, odds, scores, %s, W–L, RPI use **tabular /
  monospaced figures** (e.g. Inter `font-variant-numeric: tabular-nums`, or a mono like
  Söhne Mono / JetBrains Mono for odds). This single choice is what makes the data read
  "Kalshi-serious" instead of "amateur." Numbers should align in columns and never jump.
- Scale: clear hierarchy, big confident headlines, generous line-height on data tables.

### Core components (design these once, reuse everywhere)

- **Odds chip:** pill showing a moneyline (`-180` / `+140`). Favorite tinted green,
  underdog neutral. Tabular figures. **Flashes** (brief green/red tick) when the line
  moves. Drop/"Not posted yet" state per the honesty rule.
- **Probability bar / donut:** a Kalshi-style win-probability visualization (e.g. a
  horizontal split bar "UCLA 78% — 22% Saint Mary's", or a donut). Derived only from
  real odds/seeds — labeled as implied, never invented.
- **Team token:** team color + monogram/wordmark + seed badge + record. The atomic unit
  of matchups, brackets, schedules. Compact and full variants.
- **Live badge:** pulsing dot + "LIVE" + inning; "FINAL" and "UPCOMING (time)" variants.
- **Matchup card:** two team tokens, VS divider, odds chips, first-pitch time, a
  "Compare" affordance. The hero unit of pick'em + scoreboard.
- **Stat row:** label centered, two values flanking, the winning side highlighted
  (used in comparison). Tabular figures, subtle bar fills behind the better value.
- **Pick tray ("betslip"):** a persistent bottom sheet (mobile) / side rail (desktop)
  that collects the picks you've made, shows your running W–L, and has a confident
  primary submit. This is the FanDuel signature — make it feel great.
- **Standings table:** rank, player, W–L, win%, with a podium/medal treatment for top 3.
- **Seed badge / chip:** national seed and regional seed, gold for top seeds.

### Identity / logos (honesty + licensing)

Don't ship copyrighted school logos unless properly sourced. Use **team primary colors**
(publicly known) plus a clean **monogram or wordmark** treatment as the team token. This
keeps the premium feel without a licensing problem and matches the project's
"legit, honest" ethos.

### Motion

- Tasteful, fast (150–250ms), `cubic-bezier(.2,.7,.2,1)`. View transitions slide+fade.
- **Signature moments:** odds-chip tick on line move; a satisfying pick-confirm
  (chip → tray with a small pop); a win celebration (confetti-lite / glow) when a pick
  resolves correct; live-dot pulse; number roll-up on scores/records.
- Respect `prefers-reduced-motion` — disable non-essential animation.

### Mobile (this app is used on phones — design mobile-first)

- **Bottom tab bar** for primary nav (Map · Bracket · Pick'em · Leagues · Me) — replaces
  the horizontally-scrolling pill row. Thumb-reachable, app-grade. This alone makes it
  feel like FanDuel instead of a website.
- Pick tray = bottom sheet. Big tap targets (≥44px). Sticky section headers. Horizontal
  scroll only where intentional (bracket pan).

### Accessibility (non-negotiable, a real team would ship this)

WCAG AA contrast on all text/odds; visible focus rings; keyboard-operable picks &
bracket; screen-reader labels on live/odds/probability; color never the *only* signal
(pair favorite-green with a label/icon).

---

## SECTION C — Per-Page Prompts

Each prompt assumes Sections A + B are in context. Paste one at a time.

### 1. Global shell — masthead, navigation, mobile tab bar

> Design the app shell that wraps every view. **Desktop:** a slim sticky masthead — left:
> the "ROAD TO OMAHA / 2026 NCAA Baseball Tournament" brand lockup in condensed display
> type with the red accent; right: the auth control (signed-out: a subtle "Sign in"
> pill; signed-in: avatar + name + sign-out) and the user's live W–L pick record as a
> small stat. Below it, a breadcrumb row. The primary section nav (Map, Bracket, Pick'em,
> Leagues) should feel like premium broadcast tabs, not generic buttons. **Mobile:**
> move primary nav to a **bottom tab bar** (icons + labels, thumb-reachable, active tab
> in accent) — this is the single biggest "real app" upgrade. Keep the brand compact up
> top. Include a thin global live-scores ticker option that can ride under the masthead.
> Signature: the shell should feel like a live broadcast lower-third + a sportsbook app
> chrome. Avoid: a hamburger menu hiding the core contests; the current scrolling pill row.

### 2. Home — Map + live scoreboard (the "old GPS" fix)

> This is the front door and currently the weakest screen — it looks like a stock GPS
> map. Reimagine it as a **broadcast "war room" of the 16 regional sites.** Two ideas to
> push (pick the stronger or blend):
> (a) **Custom-styled map** — a branded dark vector map (MapLibre/Mapbox custom style or a
> stylized US silhouette), muted desaturated land, no default Google-ish tiles, with
> **glowing branded site markers** that pulse when a game is live, cluster cleanly, and
> open a rich popover (the two Friday matchups, odds chips, live score). The map is a
> *designed object*, not a utility.
> (b) **Hub layout** — a hero "Today on the Road to Omaha" strip (live + next games as
> big matchup cards) above a responsive grid of 16 regional cards, each with host city,
> the 4 team tokens, and a live/▶ status; the geographic map becomes a secondary,
> beautifully-styled view toggle.
> Keep the live scoreboard ticker but make it premium: auto-advancing matchup cards,
> LIVE pulses, score roll-ups, FINAL/UPCOMING states. Keep the "Simulate a live game"
> button but style it as a tasteful secondary control. Signature: arriving here, you
> instantly feel the tournament is *alive right now*. Avoid: default map tiles, generic
> pin teardrops, a dead static map.

### 3. National Bracket — Road to Omaha (make it a REAL bracket)

> The current bracket is just columns; make it **function and feel like an actual
> tournament bracket.** Render the full Road to Omaha as a connected tree: 16 regional
> champions → 8 super-regional winners → College World Series → national champion, with
> **drawn connector lines** linking each matchup to the next round, teams visually
> *advancing* along the lines as results come in. Desktop: a pannable/zoomable horizontal
> bracket with a sticky round-label header (Regionals · Super Regionals · CWS · Champion);
> the championship slot gets a **gold spotlight / trophy** treatment. Mobile: a
> round-by-round stepper (swipe between rounds) or vertical accordion — never a tiny
> unreadable squish. Undetermined matchups show feeder labels ("Winner Athens" /
> "Loser G2") and TBD tokens per the honesty rule. Use team tokens with seed badges and
> team-color accents; the path of the eventual champion should glow. Motion: a satisfying
> advance animation when a team wins (slides into the next slot, connector lights up).
> Signature: it reads like the printed March-style bracket you'd pin to a wall, but live.
> Avoid: disconnected columns, no connector lines, a layout that can't show who plays whom next.

### 4. Daily Pick'em — "Games" (make ESPN/FanDuel proud — this is the marquee surface)

> The most-used screen. Make it a **best-in-class daily pick'em** that ESPN or FanDuel
> would ship. Layout: a feed of **matchup cards** grouped by status (Open now · Locked /
> Live · Final · Upcoming) with sticky date/section headers. Each open card: two team
> tokens (color + monogram + seed + record), a clear **PICK** affordance per side (big
> tap targets, selected side fills with team color / money-green), the live **moneyline
> odds chip** (favorite tinted, flashes on move), first-pitch time, and a "Compare ›"
> link. Make the act of picking *delightful* — selecting animates the chip into a
> persistent **pick tray** (bottom sheet on mobile, side rail on desktop) that shows your
> running **W–L record as a hero stat**, current streak, and a confident "Submit picks"
> button. Resolved games flash ✓/✗ with a micro-celebration on wins; show a "late pick"
> flag honestly. A top stats bar: your record, win%, rank in your league. Signature: it
> should feel like opening the FanDuel app on game day — alive, tappable, rewarding.
> Honesty: odds that aren't posted read "Not posted yet"; never invent a line or a result.
> Avoid: tiny radio buttons, a lifeless table, burying the W–L record.

### 5. Bracket Challenge — "Picks" (predict the whole field)

> A focused, premium flow to predict the entire Road to Omaha (16 regional champions →
> 8 super-regional winners → CWS champion). Mirror the real bracket's connected-tree feel
> (Section 3) but in an **editable** mode: tap to advance your pick through each round,
> with later rounds cascading from earlier choices. A progress indicator ("12/25 picks
> made"), a confident "Lock in / Share" action that produces a shareable link, and a
> **head-to-head compare** view (your bracket vs a friend's, differences highlighted).
> As real results land, picks score ✓/✗ against reality with a clear, always-visible
> "unofficial predictions" banner (honesty). The CWS champion stays a labeled "pending"
> prediction. Signature: filling it out feels like the satisfying ritual of a March
> bracket; sharing feels like a flex. Avoid: a wall of dropdowns; losing the bracket-tree
> mental model.

### 6. Matchup Comparison — head-to-head + odds (the Kalshi moment)

> The most data-rich screen — make it feel like a **prediction-market matchup page.** Top:
> a bold head-to-head hero — two team tokens flanking a VS, each with seed, record,
> conference, team-color accents. Directly below, the **market panel**: moneyline per team
> (favorite in money-green), a **win-probability bar/donut** derived from the line
> (labeled "implied"), spread/total when posted, with DraftKings-via-ESPN attribution and a
> tasteful "21+, for entertainment" note. Then the **stat comparison**: record, RPI, runs,
> ERA, AVG, SOS, key players — each as a stat row with the better value highlighted and a
> subtle bar fill behind it, all in tabular figures. Signature: it should feel like a
> serious market card you'd trust to place a position on — data-forward, precise, calm.
> Honesty: "OFF"/missing lines → "Not posted yet"; unverifiable stats → TBD. Avoid: a flat
> two-column text table; gambling-grimy styling.

### 7. Regional view — 4 teams + double-elimination schedule

> A regional's home page. Hero: host city + ballpark + round label, with the 4 team tokens
> (seeds 1–4, color accents, records) presented as a clean seeded field. Below, the
> **double-elimination schedule** as a readable bracket/timeline: Friday's real matchups
> (time, TV, odds chip) flowing into the Sat–Mon winners/losers games, with connector
> logic and live/final states. Each matchup links to comparison + box score. Signature:
> at a glance you understand the field, who plays whom, and what's live. Avoid: a plain
> list that hides the double-elim structure.

### 8. Team page — stat card + 2026 season + key players

> A team's profile, broadcast-graphic style. Hero band in the team's color: name, seed,
> conference, regional. A **stat card** of the season line (record, RPI, runs, runs
> allowed, AVG, ERA, SOS) in big tabular figures with small sparkline/bar accents. A
> short, honest "2026 season" write-up. **Key players** as clean stat-line rows (pos, name,
> slash/ERA). Links to the home stadium + back to the regional. Signature: feels like the
> player/team card ESPN flashes on broadcast. Avoid: a generic profile with tiny gray text.

### 9. Stadium / About — photo, capacity, history

> The home-ballpark page — the most editorial, magazine-like surface. A large attributed
> hero photo (Wikimedia, keep attribution), the ballpark name + "home of [team]," and a
> tidy facts strip (capacity, location, opened) in tabular figures. A researched history
> blurb set in comfortable editorial type, plus an "about the team" panel. Signature: a
> premium long-read moment that rewards exploration — a breather from the data screens.
> Avoid: a cramped card; stretched/low-quality imagery.

### 10. Game detail — live box score / linescore

> The live game screen. A broadcast scorebug hero: both teams (color, score, record), the
> live situation (inning, outs, bases, count) with a LIVE pulse, or FINAL/UPCOMING. Below,
> an inning-by-inning **linescore** with R/H/E in tabular figures, and the scoring plays.
> Real-time: scores roll up, the situation animates on update. Signature: it feels like
> the score overlay on a live telecast. Avoid: a static table; no sense of "live."

### 11. Private Leagues — hub + standings (Bracket | Daily)

> The social/competitive layer. **Hub:** create or join a league (code), see your leagues,
> with a premium empty state that sells the feature. **Standings:** a real sports
> leaderboard with a **Bracket | Daily** segmented toggle. Rank, player, W–L, win% — top 3
> get a podium/medal treatment, the current user's row highlighted. A lock countdown to
> first pitch, an invite/share affordance, and "submit my picks." Daily standings rank by
> wins; bracket by score. Signature: opening it feels like checking your fantasy
> league standings — competitive, social, alive. Honesty: clearly label unofficial; show
> server-stamped pick fairness honestly. Avoid: a plain table that feels like a spreadsheet.

---

## SECTION D — Definition of done (every page)

A page is "team-of-designers" done when:
- It clearly channels ESPN (stage/energy) + FanDuel (action/joy) + Kalshi (trust/data) — not generic.
- All numbers are tabular and aligned; nothing jumps on update.
- It's mobile-first excellent (bottom nav, big tap targets, bottom-sheet trays).
- Live/odds/probability states animate tastefully; `prefers-reduced-motion` respected.
- WCAG AA contrast, visible focus, keyboard + screen-reader support.
- The honesty rule holds: no fabricated stat/score/odd; gaps render as TBD/"Not posted yet."
- It would look at home in a screenshot next to the FanDuel, Kalshi, and ESPN apps.
