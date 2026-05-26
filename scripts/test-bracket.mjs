#!/usr/bin/env node
/**
 * Unit tests for the double-elimination resolver in bracket.js.
 * Loads bracket.js in a vm sandbox (no DOM) and runs fixtures. No deps.
 * Run: `npm test` (or `node scripts/test-bracket.mjs`).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {}, globalThis: {}, module: { exports: {} } };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, "bracket.js"), "utf8"), ctx, { filename: "bracket.js" });
const resolveBracket = ctx.window.resolveBracket;

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; }
  else { fail++; console.error(`  ✗ ${label}\n      got:  ${g}\n      want: ${w}`); }
};

// teams in regional-seed order: seed1..seed4
const T = ["t1", "t2", "t3", "t4"];

// helper to build a final game between two teams with a given winner
let clock = 0;
function game(winId, loseId, ws, ls, state = "post") {
  clock += 3600000; // 1h apart, ascending
  return {
    id: "e" + clock, state, date: new Date(clock).toISOString(),
    comps: [{ id: winId, score: ws, winner: state === "post" }, { id: loseId, score: ls, winner: false }],
  };
}
const teamsOf = (slot) => (slot.teams ? slot.teams.slice().sort() : null);

// ---- Fixture A: full regional, top seed runs the table (no G7) -------------
{
  const games = [
    game("t1", "t4", 6, 2), // G1: 1 beats 4
    game("t2", "t3", 5, 4), // G2: 2 beats 3
    game("t4", "t3", 7, 1), // G3 (elim): loserG1(t4) vs loserG2(t3) -> t4
    game("t1", "t2", 8, 3), // G4: winnerG1(t1) vs winnerG2(t2) -> t1
    game("t2", "t4", 5, 2), // G5 (elim): winnerG3(t4) vs loserG4(t2) -> t2
    game("t1", "t2", 4, 1), // G6: winnerG4(t1) vs winnerG5(t2) -> t1 (champ, no G7)
  ];
  const { slots, champion } = resolveBracket(T, games);
  eq("A champion", champion, "t1");
  eq("A G3 teams", teamsOf(slots[2]), ["t3", "t4"]);
  eq("A G4 teams", teamsOf(slots[3]), ["t1", "t2"]);
  eq("A G5 teams", teamsOf(slots[4]), ["t2", "t4"]);
  eq("A G6 teams", teamsOf(slots[5]), ["t1", "t2"]);
  eq("A G7 necessary", slots[6].necessary, false);
}

// ---- Fixture B: elimination-bracket team forces & wins G7 ------------------
{
  const games = [
    game("t1", "t4", 6, 2), // G1 -> t1
    game("t2", "t3", 5, 4), // G2 -> t2
    game("t4", "t3", 7, 1), // G3 -> t4
    game("t1", "t2", 8, 3), // G4 -> t1
    game("t2", "t4", 5, 2), // G5 -> t2
    game("t2", "t1", 6, 5), // G6: t2 (from elim side) beats t1 -> G7 necessary
    game("t2", "t1", 3, 2), // G7: t2 wins -> champion t2
  ];
  const { slots, champion } = resolveBracket(T, games);
  eq("B G7 necessary", slots[6].necessary, true);
  eq("B G7 teams", teamsOf(slots[6]), ["t1", "t2"]);
  eq("B champion", champion, "t2");
}

// ---- Fixture C: only G1/G2 final — later matchups partially determined -----
{
  const games = [
    game("t1", "t4", 6, 2), // G1 -> t1
    game("t2", "t3", 5, 4), // G2 -> t2
  ];
  const { slots, champion } = resolveBracket(T, games);
  eq("C champion (none yet)", champion, null);
  eq("C G3 determined (losers known)", teamsOf(slots[2]), ["t3", "t4"]);
  eq("C G4 determined (winners known)", teamsOf(slots[3]), ["t1", "t2"]);
  eq("C G5 undetermined", slots[4].determined, false);
  eq("C G3 has no event yet", slots[2].event, null);
}

// ---- Fixture D: nothing played -> only G1/G2 known -------------------------
{
  const { slots, champion } = resolveBracket(T, []);
  eq("D champion none", champion, null);
  eq("D G1 teams", teamsOf(slots[0]), ["t1", "t4"]);
  eq("D G2 teams", teamsOf(slots[1]), ["t2", "t3"]);
  eq("D G3 undetermined", slots[2].determined, false);
}

console.log(`\n${fail ? "✗" : "✓"} bracket resolver: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
