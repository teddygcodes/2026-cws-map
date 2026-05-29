#!/usr/bin/env node
/**
 * Data-integrity + syntax checks for the 2026 NCAA Baseball Tournament app.
 * No runtime deps — uses Node's built-in vm to load the data files in a
 * `window` sandbox (they each do `window.X = X`). Exits non-zero on any failure.
 *
 * Run: `npm run validate` (or `node scripts/validate.mjs`)
 */
import { readFileSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (m) => errors.push(m);

// ---- 1. syntax: node --check on each JS file + the inline app script --------
function nodeCheck(label, code) {
  const tmp = join(ROOT, `.validate-tmp.js`);
  try {
    writeFileSync(tmp, code);
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
  } catch (e) {
    fail(`syntax error in ${label}: ${String(e.stderr || e.message).split("\n").slice(0, 3).join(" ")}`);
  } finally {
    rmSync(tmp, { force: true });
  }
}

const files = ["data.js", "photos.js", "schedule.js", "bracket.js"];
for (const f of files) nodeCheck(f, readFileSync(join(ROOT, f), "utf8"));
// The view layer is now a Next.js/React app (app/ + lib/), type-checked by
// `next build` and exercised by smoke.mjs — no inline-script parse needed here.

// ---- 2. load data files into a window sandbox -------------------------------
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const f of files) {
  try { vm.runInContext(readFileSync(join(ROOT, f), "utf8"), ctx, { filename: f }); }
  catch (e) { fail(`failed to evaluate ${f}: ${e.message}`); }
}
const T = ctx.window.TOURNAMENT;
const PHOTOS = ctx.window.STADIUM_PHOTOS || {};
const SCHED = ctx.window.SCHEDULES || {};

// ---- 3. TOURNAMENT integrity ------------------------------------------------
if (!T) {
  fail("window.TOURNAMENT is undefined");
} else {
  const teamIds = Object.keys(T.teams || {});
  const perSite = T.round === "super-regional" ? 2 : 4;

  if (!Array.isArray(T.sites) || T.sites.length !== (perSite === 2 ? 8 : 16))
    fail(`expected ${perSite === 2 ? 8 : 16} sites, got ${T.sites ? T.sites.length : "none"}`);
  if (teamIds.length !== (perSite === 2 ? 16 : 64))
    fail(`expected ${perSite === 2 ? 16 : 64} teams, got ${teamIds.length}`);

  // id integrity on team objects
  for (const id of teamIds) {
    const t = T.teams[id];
    if (t.id !== id) fail(`team key/id mismatch: ${id} vs ${t.id}`);
    const st = t.stadium || {};
    if (typeof st.lat !== "number" || typeof st.lng !== "number") fail(`${id}: bad stadium coords`);
    // verified city/state are required (the stadium page's Location reads these, not the regional city)
    if (typeof st.city !== "string" || !st.city.trim()) fail(`${id}: missing stadium.city`);
    if (typeof st.state !== "string" || !st.state.trim()) fail(`${id}: missing stadium.state`);
    // >=2 verified key players (some teams legitimately had only 2 sourced; we don't fabricate)
    if (!Array.isArray(t.players) || t.players.length < 2) fail(`${id}: expected >=2 players, got ${t.players ? t.players.length : 0}`);
  }

  // sites reference real teams; host present; correct count; each team referenced once
  const referenced = new Set();
  for (const s of T.sites) {
    if (!T.teams[s.hostTeamId]) fail(`${s.id}: host ${s.hostTeamId} not in teams`);
    if (!Array.isArray(s.teams) || s.teams.length !== perSite) fail(`${s.id}: expected ${perSite} teams, got ${s.teams ? s.teams.length : 0}`);
    if (s.teams && s.teams.indexOf(s.hostTeamId) === -1) fail(`${s.id}: host not in its teams[]`);
    for (const id of s.teams || []) {
      if (!T.teams[id]) fail(`${s.id}: references missing team ${id}`);
      if (referenced.has(id)) fail(`team ${id} referenced by more than one site`);
      referenced.add(id);
    }
  }
  if (referenced.size !== teamIds.length) fail(`referenced teams (${referenced.size}) != total teams (${teamIds.length})`);

  // seeds: regionals → national seeds 1..16 unique; super → 1..8
  const maxSeed = perSite === 2 ? 8 : 16;
  const seeds = teamIds.filter((k) => T.teams[k].seed != null).map((k) => T.teams[k].seed).sort((a, b) => a - b);
  const expected = Array.from({ length: maxSeed }, (_, i) => i + 1);
  if (JSON.stringify(seeds) !== JSON.stringify(expected)) fail(`seeds not 1..${maxSeed}: got [${seeds.join(",")}]`);
  if (perSite === 4) {
    const top8 = { 1: "UCLA", 2: "Georgia Tech", 3: "Georgia", 4: "Auburn", 5: "North Carolina", 6: "Texas", 7: "Alabama", 8: "Florida" };
    for (const [seed, name] of Object.entries(top8)) {
      const t = teamIds.map((k) => T.teams[k]).find((t) => t.seed === +seed);
      if (!t || t.name !== name) fail(`national seed ${seed} should be ${name}, got ${t ? t.name : "none"}`);
    }
  }

  // ---- 4. photos.js — valid team ids + files exist on disk ----------------
  for (const id of Object.keys(PHOTOS)) {
    if (!T.teams[id]) fail(`photos.js: unknown team id ${id}`);
    const file = PHOTOS[id].file;
    if (!file || !existsSync(join(ROOT, file))) fail(`photos.js: missing image file for ${id} (${file})`);
    if (!PHOTOS[id].by || !PHOTOS[id].license) fail(`photos.js: ${id} missing attribution (by/license)`);
  }

  // ---- 5. schedule.js — valid site ids + team ids in that site ------------
  for (const sid of Object.keys(SCHED)) {
    const site = T.sites.find((s) => s.id === sid);
    if (!site) { fail(`schedule.js: unknown site id ${sid}`); continue; }
    for (const g of SCHED[sid]) {
      for (const side of ["a", "b"]) {
        const [tid] = g[side] || [];
        if (!T.teams[tid]) fail(`schedule.js ${sid} G${g.g}: unknown team ${tid}`);
        else if (site.teams.indexOf(tid) === -1) fail(`schedule.js ${sid} G${g.g}: ${tid} not in that site`);
      }
    }
  }
}

// ---- report -----------------------------------------------------------------
if (errors.length) {
  console.error(`✗ validate FAILED (${errors.length} issue${errors.length > 1 ? "s" : ""}):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("✓ validate passed:", (T ? Object.keys(T.teams).length : 0) + " teams,",
  (T ? T.sites.length : 0) + " sites, seeds OK,",
  Object.keys(PHOTOS).length + " photos, schedules OK, all JS parses.");
