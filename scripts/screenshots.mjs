#!/usr/bin/env node
/**
 * README screenshot capture. Drives the built React app and writes full-page
 * PNGs to docs/screenshots/ at 1280px logical width @2x (retina). Live odds and
 * scores come from the real ESPN feed, so re-runs vary slightly — that's fine.
 *
 * Requires a server at BASE (default http://localhost:3000). Run:
 *   npm run build && npm run start &   # or point BASE at `npm run dev`
 *   node scripts/screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = "docs/screenshots";
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });

await page.goto(BASE + "/#/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(() => window.TOURNAMENT && Object.keys(window.TOURNAMENT.teams).length === 64, { timeout: 20000 });

// name, hash, selector to await, optional prep(), fullPage (default true).
// List-heavy views (pick'em, schedule) clip to one viewport so the README
// preview stays a reasonable height instead of scrolling every game.
const shots = [
  ["01-home-map.png", "#/", '[data-testid="scoreboard"]', async () => {
    await page.click('[data-seg="map"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="map-pin"]').length === 16, { timeout: 15000 });
  }, true],
  ["02-daily-pickem.png", "#/games", '[data-testid="pick-option"]', null, false],
  ["03-matchup-comparison.png", "#/vs/ucla/saint-marys", '[data-testid="cmp-table"]', null, true],
  ["04-bracket-challenge.png", "#/picks", '[data-testid="pick-node"]', null, true],
  ["05-regional-schedule.png", "#/r/los-angeles", '[data-testid="game-row"]', null, true],
  ["06-team-stats.png", "#/t/ucla", null, null, true],
  ["07-stadium.png", "#/s/ucla", null, null, true],
  ["08-schedule.png", "#/schedule", '[data-testid="schedule-row"]', null, false],
  ["09-rankings.png", "#/rankings", '[data-testid="rankings"] tbody tr', null, true],
];

try {
  for (const [name, hash, waitSel, prep, fullPage] of shots) {
    await page.evaluate(() => { location.hash = "#/"; }); // reset so re-entry re-runs effects
    await settle(250);
    await page.evaluate((h) => { location.hash = h; }, hash);
    if (waitSel) await page.waitForSelector(waitSel, { timeout: 15000 });
    if (prep) await prep();
    await settle(3500); // let the ESPN poll populate odds/scores + transitions settle
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${OUT}/${name}`, fullPage: fullPage !== false });
    console.log("  ✓ " + name);
  }
  console.log("✓ screenshots written to " + OUT);
} catch (e) {
  console.error("✗ screenshot capture failed:", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
