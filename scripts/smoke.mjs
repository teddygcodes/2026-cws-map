#!/usr/bin/env node
/**
 * Browser smoke test — proves the React app actually renders from the static
 * TOURNAMENT data. Deliberately does NOT assert on ESPN/scoreboard network data
 * (flaky in CI). Selectors use stable data-testid hooks; the window.__* globals
 * are the behavioral contract preserved across the vanilla→React migration.
 *
 * Requires a server at BASE (default http://localhost:3000) + the `playwright`
 * dev dependency. Run: `npm run smoke`.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const steps = [];
const ok = (m) => steps.push("  ✓ " + m);

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
let failed = null;

const go = (hash) => page.evaluate((h) => { location.hash = h; }, hash);
const count = (sel) => page.locator(sel).count();

try {
  await page.goto(BASE + "/#/", { waitUntil: "domcontentloaded", timeout: 30000 });

  // data + app boot (DataProvider loads /legacy/*.js, then renders)
  await page.waitForFunction(() => window.TOURNAMENT && Object.keys(window.TOURNAMENT.teams).length === 64, { timeout: 20000 });
  await page.waitForSelector('[data-testid="scoreboard"]', { timeout: 20000 });
  ok("TOURNAMENT data loaded (64 teams) + app boots");

  // HOME — hub: 16 regional cards; map: 16 markers
  await page.waitForSelector('[data-testid="regional-card"]', { timeout: 10000 });
  if ((await count('[data-testid="regional-card"]')) !== 16) throw new Error("expected 16 regional cards");
  await page.evaluate(() => document.querySelector('[data-seg="map"]').click());
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="map-pin"]').length === 16, { timeout: 15000 });
  ok("home: 16 regional cards + 16 map markers");

  // REGIONAL — 4 teams, >=7 schedule rows, bracket diagram >=7 cards
  await go("#/r/athens");
  await page.waitForSelector('[data-testid="regional-team"]', { timeout: 10000 });
  if ((await count('[data-testid="regional-team"]')) !== 4) throw new Error("expected 4 regional teams");
  if ((await count('[data-testid="game-row"]')) < 7) throw new Error("expected >=7 schedule rows");
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Bracket")?.click());
  await page.waitForSelector('[data-testid="bg-card"]', { timeout: 10000 });
  if ((await count('[data-testid="bg-card"]')) < 7) throw new Error("expected >=7 bracket cards");
  ok("regional: 4 teams + schedule + double-elim bracket diagram");

  // TEAM — stat grid + 2026 Season
  await go("#/t/georgia");
  await page.waitForSelector('[data-testid="team-stats"]', { timeout: 10000 });
  ok("team: stat grid renders");

  // STADIUM — photo, City/ST location, history, NO map embed
  await go("#/s/arizona-state");
  await page.waitForSelector(".stadium-photo img", { timeout: 10000 });
  if ((await count("section iframe, .map-embed")) !== 0) throw new Error("stadium has a map embed");
  const loc = (await page.locator(".stadium-facts li", { hasText: "Location" }).innerText()).trim();
  if (!/,\s*[A-Z]{2}\b/.test(loc)) throw new Error(`stadium Location not 'City, ST': ${loc}`);
  ok("stadium: photo + City/State + no map embed");

  // COMPARE — stat table
  await go("#/vs/boston-college/liberty");
  await page.waitForSelector('[data-testid="cmp-table"]', { timeout: 10000 });
  ok("compare: head-to-head stat table");

  // NATIONAL BRACKET — 16 regional nodes
  await go("#/bracket");
  await page.waitForSelector('[data-testid="reg-node"]', { timeout: 10000 });
  if ((await count('[data-testid="reg-node"]')) !== 16) throw new Error("expected 16 regional nodes");
  ok("national bracket: 16 regional nodes feeding the tree");

  // PICKS — 16 pick cards, fill all, encode/decode round-trips to 26 chars
  await go("#/picks");
  await page.waitForSelector('[data-testid="picks-cols"]', { timeout: 10000 });
  if ((await count('[data-testid="pick-reg"]')) !== 16) throw new Error("expected 16 pick cards");
  if ((await count('[data-testid="picks-banner"]')) < 1) throw new Error("missing unofficial banner");
  for (let i = 0; i < 16; i++) {
    await page.evaluate((idx) => document.querySelectorAll('[data-testid="pick-reg"]')[idx].querySelector('[data-testid="pick-node"]').click(), i);
  }
  const rt = await page.evaluate(() => {
    const g = window.__picks.get();
    const code = window.__picks.encode(g);
    return { len: code.length, eq: JSON.stringify(window.__picks.decode(code)) === JSON.stringify(g), bad: window.__picks.decode("garbage"), code };
  });
  if (rt.len !== 26 || !rt.eq || rt.bad !== null) throw new Error(`pick encode/decode failed: ${JSON.stringify(rt)}`);
  ok("bracket challenge: 16 picks, encode/decode round-trips (26 chars)");

  // shared link restores + head-to-head renders
  await go("#/picks/" + rt.code);
  await page.waitForSelector('[data-testid="picks-cols"]', { timeout: 10000 });
  await page.waitForFunction(() => Object.keys(window.__picks.get().reg).length === 16, { timeout: 10000 });
  await go("#/h2h/" + rt.code + "/" + rt.code);
  await page.waitForSelector('[data-testid="h2h-table"]', { timeout: 10000 });
  ok("shared link restores picks + head-to-head renders");

  // LEAGUES — disabled state degrades gracefully
  const errsBefore = pageErrors.length;
  await page.evaluate(() => window.__leagues.setApi(""));
  await go("#/league");
  await page.waitForSelector('[data-testid="lg-unavailable"]', { timeout: 10000 });
  if (pageErrors.length !== errsBefore) throw new Error("league disabled produced errors: " + pageErrors.slice(errsBefore).join("; "));
  ok("leagues: graceful 'unavailable' state when backend off");

  // LEAGUES — full flow against a STATEFUL mocked Worker: view → join →
  // submit DAILY pick'em → it saves → multiple entries show in standings.
  const future = Date.now() + 3 * 86400000;
  const aCode = "1" + "0".repeat(25);
  const bCode = "1" + "1111111111111111000000007";
  const aliceGames = { athens_G1: { pick: "georgia", ts: 1 }, "super-1_G1": { pick: "ucla", ts: 1 } };
  // In-memory league store keyed by memberId (mirrors the real Worker).
  const members = {
    alice00000000: { displayName: "Alice", bracket: aCode, games: aliceGames, updated: 1 },
    bob0000000000: { displayName: "Bob", bracket: bCode, games: {}, updated: 1 },
  };
  let lastGamesPost = null;
  const memberList = () => Object.keys(members).map((id) => ({ displayName: members[id].displayName, bracket: members[id].bracket, games: members[id].games || {}, updated: members[id].updated }));
  await page.route("**/league**", (route) => {
    const r = route.request();
    const u = r.url().split("#")[0];
    const m = r.method();
    let body = {};
    try { body = JSON.parse(r.postData() || "{}"); } catch (e) { body = {}; }
    const reply = (obj) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(obj) });
    if (m === "POST" && /\/league$/.test(u)) return reply({ code: "ABC123", name: "Smoke League", lockTs: future });
    if (m === "GET" && /\/league\/ABC123$/.test(u)) return reply({ name: "Smoke League", lockTs: future, members: memberList() });
    if (m === "POST" && /\/member$/.test(u)) {
      if (body.memberId) members[body.memberId] = { displayName: body.displayName || "Player", bracket: body.bracket, games: (members[body.memberId] || {}).games || {}, updated: Date.now() };
      return reply({ displayName: body.displayName, bracket: body.bracket, updated: Date.now() });
    }
    if (m === "POST" && /\/games$/.test(u)) {
      lastGamesPost = body;
      if (body.memberId) members[body.memberId] = { displayName: body.displayName || "Player", bracket: (members[body.memberId] || {}).bracket || "", games: body.picks || {}, updated: Date.now() };
      return reply({ games: body.picks, updated: Date.now() });
    }
    return route.continue();
  });
  // Real Worker origin (allowlisted by the app's CSP connect-src); page.route
  // intercepts it, so no real network call leaves the browser.
  await page.evaluate(() => window.__leagues.setApi("https://cws-map-leagues.tyler-696.workers.dev"));
  // Seed a local daily pick so "Submit my picks" has something to save.
  await page.evaluate(() => window.__gamepicks.set({ picks: { athens_G1: { pick: "boston-college", ts: 1 } } }));

  // View standings before joining → the two existing members.
  await go("#/league/ABC123");
  await page.waitForSelector('[data-testid="standings"] tbody tr', { timeout: 10000 });
  if ((await count('[data-testid="standings"] tbody tr')) !== 2) throw new Error("expected 2 standings rows before join");

  // Join the league → you register server-side immediately (no separate submit),
  // so a third entry shows up in standings on its own.
  await page.getByRole("button", { name: "Join this league" }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="standings"] tbody tr').length === 3, { timeout: 10000 });
  ok("leagues: joining immediately adds your entry to standings");

  // Daily tab → submit my pick'em → it POSTs my picks and the entry saves.
  await page.evaluate(() => document.querySelector('[data-seg="daily"]').click());
  await page.getByRole("button", { name: "Submit my picks" }).click();
  // Wait (Node-side) for the mocked Worker to receive the games POST, then
  // confirm the submit carried the local daily pick through to the league.
  for (let i = 0; i < 40 && !lastGamesPost; i++) await page.waitForTimeout(100);
  if (!lastGamesPost || !lastGamesPost.picks || ((lastGamesPost.picks.athens_G1 || {}).pick) !== "boston-college") {
    throw new Error("daily pick'em did not save through the league (POST /games body: " + JSON.stringify(lastGamesPost) + ")");
  }
  // All three members still render in the daily standings (allows other entries).
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="standings"] tbody tr').length === 3, { timeout: 10000 });
  ok("leagues: daily pick'em saves through the league + all 3 entries show");

  await page.unroute("**/league**");
  await page.evaluate(() => window.__leagues.setApi(""));

  // DAILY PICK'EM — open games, pick round-trips to GAME_PICKS
  await go("#/games");
  await page.waitForSelector('[data-testid="pick-option"]', { timeout: 10000 });
  await page.evaluate(() => document.querySelector('[data-testid="pick-option"]').click());
  const gpCount = await page.evaluate(() => Object.keys(window.__gamepicks.get().picks).length);
  if (gpCount < 1) throw new Error("game pick did not persist");
  ok("daily pick'em: open games render, pick round-trips");

  // RANKINGS — the 16 national seeds
  await go("#/rankings");
  await page.waitForSelector('[data-testid="rankings"] tbody tr', { timeout: 10000 });
  if ((await count('[data-testid="rankings"] tbody tr')) !== 16) throw new Error("expected 16 seeded rows");
  ok("rankings: 16 national seeds");

  // SCHEDULE — day tabs; selecting Friday lists its 32 matchups in pitch order
  await go("#/schedule");
  await page.waitForSelector('[data-testid="schedule-tab"]', { timeout: 10000 });
  if ((await count('[data-testid="schedule-tab"]')) < 4) throw new Error("expected >=4 day tabs");
  await page.evaluate(() => document.querySelector('[data-testid="schedule-tab"][data-day="fri"]').click());
  await page.waitForSelector('[data-testid="schedule-row"]', { timeout: 10000 });
  if ((await count('[data-testid="schedule-row"]')) !== 32) throw new Error("expected 32 Friday game rows");
  ok("schedule: day tabs + Friday's 32 games in pitch order");

  // LIVE GAME — SIM situation strip (count/outs/diamond)
  await go("#/");
  await page.waitForSelector('[data-demo="start"]', { timeout: 10000 });
  await page.evaluate(() => document.querySelector('[data-demo="start"]').click());
  await page.waitForTimeout(3500);
  await go("#/g/demo");
  await page.waitForSelector('[data-testid="diamond"]', { timeout: 10000 });
  ok("live game view renders SIM situation strip");
  await go("#/");
  await page.evaluate(() => { const b = document.querySelector('[data-demo="stop"]'); if (b) b.click(); });

  // SELF-ADVANCING BRACKET — simulate all 16 regionals → 8 super-regionals
  await page.evaluate(() => window.__simAll());
  await page.waitForFunction(() => window.TOURNAMENT.round === "super-regional", { timeout: 10000 });
  if ((await page.evaluate(() => window.TOURNAMENT.sites.length)) !== 8) throw new Error("expected 8 super-regional sites");
  await go("#/");
  await page.evaluate(() => document.querySelector('[data-seg="map"]')?.click());
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="map-pin"]').length === 8, { timeout: 10000 });
  ok("bracket resolves: 16 regionals → 8 super-regionals");
} catch (e) {
  failed = e;
} finally {
  await browser.close();
}

console.log(steps.join("\n"));
if (failed) {
  console.error("✗ smoke FAILED: " + failed.message);
  process.exit(1);
}
console.log("✓ smoke passed: all core views render in the React app.");
