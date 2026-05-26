#!/usr/bin/env node
/**
 * Browser smoke test — proves the app actually renders, using only the static
 * TOURNAMENT data. Deliberately does NOT assert on ESPN/scoreboard data or
 * console errors (those depend on external network and would be flaky in CI).
 *
 * Requires a server running at BASE (default http://localhost:4173) and the
 * `playwright` dev dependency. Run: `npm run smoke`.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:4173";
const steps = [];
const ok = (m) => steps.push("  ✓ " + m);

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
let failed = null;

async function go(hash) {
  // set hash on the live document (avoids full reloads for hash-only nav)
  await page.evaluate((h) => { location.hash = h; }, hash);
}

try {
  await page.goto(BASE + "/#/", { waitUntil: "domcontentloaded", timeout: 30000 });

  // data loaded
  await page.waitForFunction(
    () => window.TOURNAMENT && Object.keys(window.TOURNAMENT.teams).length === 64,
    { timeout: 20000 }
  );
  ok("TOURNAMENT data loaded (64 teams)");

  // map: 16 pins
  await page.waitForSelector(".leaflet-marker-icon", { timeout: 20000 });
  const markers = await page.locator(".leaflet-marker-icon").count();
  if (markers !== 16) throw new Error(`expected 16 map pins, got ${markers}`);
  ok("map renders 16 pins");

  // Top nav bar: Map · List · Bracket · Picks · Leagues (5 tabs)
  const segs = await page.locator("#mapToggle .vt").count();
  if (segs !== 5) throw new Error(`expected 5 nav tabs, got ${segs}`);
  for (const m of ["map", "list", "bracket", "picks", "league"]) {
    if (await page.locator(`#mapToggle .vt[data-mode="${m}"]`).count() !== 1) throw new Error(`missing nav tab: ${m}`);
  }
  // switch to List → 16 clickable site rows
  await page.evaluate(() => { document.querySelector('#mapToggle .vt[data-mode="list"]').click(); });
  await page.waitForSelector("#siteList .site-row", { timeout: 10000 });
  const siteRows = await page.locator("#siteList .site-row").count();
  if (siteRows !== 16) throw new Error(`expected 16 site rows in list mode, got ${siteRows}`);
  // a row navigates to that regional
  await page.evaluate(() => { document.querySelector("#siteList .site-row").click(); });
  await page.waitForSelector("#view-regional.active .team-card", { timeout: 10000 });
  // Picks tab navigates to the bracket challenge
  await go("#/");
  await page.evaluate(() => { document.querySelector('#mapToggle .vt[data-mode="picks"]').click(); });
  await page.waitForSelector("#view-picks.active .nb-cols", { timeout: 10000 });
  // back to map mode → pins return
  await go("#/");
  await page.evaluate(() => { document.querySelector('#mapToggle .vt[data-mode="map"]').click(); });
  await page.waitForFunction(() => document.querySelectorAll(".leaflet-marker-icon").length === 16, { timeout: 10000 });
  ok(`top nav: ${segs} tabs (Map/List/Bracket/Picks/Leagues), List shows ${siteRows} rows, Picks tab navigates`);

  // regional → 4 team cards + schedule rows
  await go("#/r/athens");
  await page.waitForSelector("#view-regional .team-card", { timeout: 10000 });
  const cards = await page.locator("#view-regional .team-card").count();
  if (cards !== 4) throw new Error(`expected 4 team cards in regional, got ${cards}`);
  const rows = await page.locator("#view-regional .game-row").count();
  if (rows < 7) throw new Error(`expected >=7 schedule rows, got ${rows}`);
  ok(`regional renders ${cards} teams + ${rows} schedule rows`);

  // team → stat grid + 2026 Season narrative
  await go("#/t/georgia");
  await page.waitForSelector("#view-team .stat-grid", { timeout: 10000 });
  const teamSeason = await page.locator("#view-team .panel-title", { hasText: "2026 Season" }).count();
  if (teamSeason < 1) throw new Error("team view missing 2026 Season section");
  ok("team view renders stat grid + 2026 Season");

  // stadium → photo, City/State location, history/about, and NO google map
  await go("#/s/arizona-state");
  await page.waitForSelector("#view-stadium .stadium-photo img", { timeout: 10000 });
  if (await page.locator("#view-stadium .map-embed, #view-stadium iframe").count() !== 0)
    throw new Error("stadium view still has a map embed");
  const locText = (await page.locator("#view-stadium .stadium-facts li").filter({ hasText: "Location" }).innerText()).trim();
  if (!/,\s*[A-Z]{2}\b/.test(locText)) throw new Error(`stadium Location not 'City, ST': ${locText}`);
  if (/Lincoln/.test(locText)) throw new Error("stadium Location wrongly shows the regional host city");
  const hist = await page.locator("#view-stadium .panel-title", { hasText: "History" }).count();
  if (hist < 1) throw new Error("stadium view missing History section");
  ok("stadium view renders photo + City/State + history (no map)");

  // comparison → table
  await go("#/vs/boston-college/liberty");
  await page.waitForSelector("#view-compare .cmp-table", { timeout: 10000 });
  ok("matchup comparison renders table");

  // regional bracket toggle renders the visual double-elim diagram
  await go("#/r/athens");
  await page.waitForSelector("#view-regional .view-toggle .vt", { timeout: 10000 });
  await page.evaluate(() => { var b = [...document.querySelectorAll('#view-regional .view-toggle .vt')].find(x => x.getAttribute('data-mode') === 'bracket'); if (b) b.click(); });
  await page.waitForSelector("#view-regional .bracket .bg-card", { timeout: 10000 });
  const bgCards = await page.locator("#view-regional .bracket .bg-card").count();
  if (bgCards < 7) throw new Error(`expected >=7 bracket cards, got ${bgCards}`);
  ok("regional bracket diagram renders (" + bgCards + " games)");
  await page.evaluate(() => { var b = [...document.querySelectorAll('#view-regional .view-toggle .vt')].find(x => x.getAttribute('data-mode') === 'list'); if (b) b.click(); });

  // national Road-to-Omaha bracket
  await go("#/bracket");
  await page.waitForSelector("#view-bracket .nb-cols", { timeout: 10000 });
  const cols = await page.locator("#view-bracket .nb-col").count();
  if (cols !== 3) throw new Error(`expected 3 national columns, got ${cols}`);
  await page.waitForSelector('#view-bracket .map-toggle .vt.on[data-mode="bracket"]', { timeout: 5000 });
  ok("national bracket renders 3 columns + toggle (Bracket active)");

  // Bracket Challenge pick'em (client-side; ESPN-independent)
  await go("#/picks");
  await page.waitForSelector("#view-picks.active .nb-cols", { timeout: 10000 });
  const pCols = await page.locator("#view-picks .nb-col").count();
  if (pCols !== 3) throw new Error(`expected 3 pick columns, got ${pCols}`);
  const regCards = await page.locator("#view-picks .pick-reg").count();
  if (regCards !== 16) throw new Error(`expected 16 regional pick cards, got ${regCards}`);
  if (await page.locator("#view-picks .pick-banner").count() < 1) throw new Error("missing unofficial predictions banner");
  // fill all 16 regional champions (re-query each time — view re-renders per pick)
  for (let i = 0; i < 16; i++) {
    await page.evaluate((idx) => document.querySelectorAll("#view-picks .pick-reg")[idx].querySelector(".nb-node.pick[data-team]").click(), i);
  }
  const pickedReg = await page.locator("#view-picks .pick-reg .nb-node.picked").count();
  if (pickedReg !== 16) throw new Error(`expected 16 picked regionals, got ${pickedReg}`);
  // encode -> decode round-trips exactly; garbage decodes to null
  const rt = await page.evaluate(() => {
    const g = window.__picks.get(), code = window.__picks.encode(g);
    return { len: code.length, eq: JSON.stringify(window.__picks.decode(code)) === JSON.stringify(g), bad: window.__picks.decode("garbage"), code };
  });
  if (rt.len !== 26 || !rt.eq || rt.bad !== null) throw new Error(`pick encode/decode round-trip failed: ${JSON.stringify(rt)}`);
  ok("bracket challenge: 3 columns, 16 picks, encode/decode round-trips");

  // shared link loads the bracket; head-to-head renders
  await go("#/picks/" + rt.code);
  await page.waitForSelector("#view-picks.active .nb-cols", { timeout: 10000 });
  const loadedPicks = await page.locator("#view-picks .pick-reg .nb-node.picked").count();
  if (loadedPicks !== 16) throw new Error(`shared link did not restore picks, got ${loadedPicks}`);
  await go("#/h2h/" + rt.code + "/" + rt.code);
  await page.waitForSelector("#view-picks .h2h-table", { timeout: 10000 });
  ok("shared link restores picks + head-to-head renders");

  // Private leagues — disabled state must degrade gracefully (force-disable for this check)
  const errsBefore = pageErrors.length;
  await page.evaluate(() => window.__leagues.setApi(""));
  await go("#/league");
  await page.waitForSelector("#view-league.active .lg-unavailable", { timeout: 10000 });
  if (pageErrors.length !== errsBefore) throw new Error("league disabled state produced page errors: " + pageErrors.slice(errsBefore).join("; "));
  ok("private leagues: graceful 'unavailable' state when backend off");

  // Private leagues — enabled flow against a mocked Worker (no real backend in CI)
  const future = Date.now() + 3 * 86400000;
  const aCode = "1" + "0".repeat(25), bCode = "1" + "1111111111111111000000007";
  await page.route("**/league**", (route) => {
    const r = route.request(), u = r.url().split("#")[0], m = r.method();
    if (m === "POST" && /\/league$/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ code: "ABC123", name: "Smoke League", lockTs: future }) });
    if (m === "GET" && /\/league\/ABC123$/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ name: "Smoke League", lockTs: future, members: [{ displayName: "Alice", bracket: aCode }, { displayName: "Bob", bracket: bCode }] }) });
    if (m === "POST" && /\/member$/.test(u)) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ displayName: "Me", bracket: aCode, updated: Date.now() }) });
    return route.continue();
  });
  await page.evaluate(() => window.__leagues.setApi("https://mock.test"));
  await go("#/league/ABC123");
  await page.waitForSelector("#view-league .lg-standings tbody tr", { timeout: 10000 });
  const lgRows = await page.locator("#view-league .lg-standings tbody tr").count();
  if (lgRows !== 2) throw new Error(`expected 2 league standings rows, got ${lgRows}`);
  if (await page.locator("#view-league .pick-banner").count() < 1) throw new Error("league standings missing unofficial banner");
  await page.unroute("**/league**");
  await page.evaluate(() => window.__leagues.setApi(""));
  ok("private leagues: mocked standings render ranked rows");

  // rich game detail: SIM situation strip (count/outs/diamond) renders
  await go("#/");
  await page.evaluate(() => { var b = document.querySelector('#scoreboard .sb-demo button'); if (b) b.click(); }); // start single-game sim
  await page.waitForTimeout(3500); // let one tick set the live situation
  await go("#/g/demo");
  await page.waitForSelector("#view-game .situation .diamond", { timeout: 8000 });
  ok("live game view renders SIM situation strip");
  await go("#/");
  await page.evaluate(() => { var b = document.querySelector('#scoreboard .sb-demo button'); if (b && b.getAttribute('data-demo') === 'stop') b.click(); }); // stop sim

  // self-advancing bracket: simulate all 16 regionals -> auto-advance to 8 super-regionals
  await go("#/");
  await page.evaluate(() => window.__simAll());
  await page.waitForFunction(() => window.TOURNAMENT && window.TOURNAMENT.round === "super-regional", { timeout: 8000 });
  const superSites = await page.evaluate(() => window.TOURNAMENT.sites.length);
  if (superSites !== 8) throw new Error(`expected 8 super-regional sites, got ${superSites}`);
  await page.waitForFunction(() => document.querySelectorAll(".leaflet-marker-icon").length === 8, { timeout: 8000 });
  ok("bracket resolves: 16 regionals -> 8 super-regionals");
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
console.log("✓ smoke passed: all core views render from static data.");
