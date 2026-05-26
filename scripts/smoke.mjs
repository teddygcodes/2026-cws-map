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

  // regional → 4 team cards + schedule rows
  await go("#/r/athens");
  await page.waitForSelector("#view-regional .team-card", { timeout: 10000 });
  const cards = await page.locator("#view-regional .team-card").count();
  if (cards !== 4) throw new Error(`expected 4 team cards in regional, got ${cards}`);
  const rows = await page.locator("#view-regional .game-row").count();
  if (rows < 7) throw new Error(`expected >=7 schedule rows, got ${rows}`);
  ok(`regional renders ${cards} teams + ${rows} schedule rows`);

  // team → stat grid
  await go("#/t/georgia");
  await page.waitForSelector("#view-team .stat-grid", { timeout: 10000 });
  ok("team view renders stat grid");

  // stadium → photo
  await go("#/s/georgia");
  await page.waitForSelector("#view-stadium .stadium-photo img", { timeout: 10000 });
  ok("stadium view renders photo");

  // comparison → table
  await go("#/vs/boston-college/liberty");
  await page.waitForSelector("#view-compare .cmp-table", { timeout: 10000 });
  ok("matchup comparison renders table");
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
