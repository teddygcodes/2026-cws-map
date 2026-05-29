#!/usr/bin/env node
/**
 * Unit tests for the pure lib/ modules extracted from the legacy app
 * (picks encoding/scoring, game enumeration/scoring, format helpers).
 * Loads data.js + bracket.js in a vm sandbox to get TOURNAMENT + resolveBracket,
 * then imports the ESM lib modules directly. No deps. Run: `npm test`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

import {
  snapshotPickSites,
  emptyPicks,
  encodePicks,
  decodePicks,
  scoreBracketCode,
  pickProgress,
  cleanupPicks,
} from "../lib/picks.js";
import { enumerateGames, gameClass, gamesTruth, scoreGames, scoreLocalGames } from "../lib/games.js";
import { impliedProbFromMoneyline, formatRecord, isMissing } from "../lib/format.js";
import { fieldRanks } from "../lib/ranks.js";
import { gameNum, parseClockToMins, firstPitchMs, defaultDayKey } from "../lib/schedule.js";
import { isValidBracketCode, isValidGameKey, isValidTeamId } from "../lib/pick-validators.js";
import { cleanLeaguesPayload, mergeLeagues, leaguesEqual } from "../lib/leagues-sync.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
function loadInSandbox(file) {
  const ctx = { window: {}, module: { exports: {} } };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, file), "utf8"), ctx, { filename: file });
  return ctx.window;
}
const dataWin = loadInSandbox("data.js");
const TOURNAMENT = dataWin.TOURNAMENT;
const resolveBracket = loadInSandbox("bracket.js").resolveBracket;

let pass = 0;
let fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) pass++;
  else {
    fail++;
    console.error(`  ✗ ${label}\n      got:  ${g}\n      want: ${w}`);
  }
};
const ok = (label, cond) => {
  if (cond) pass++;
  else {
    fail++;
    console.error(`  ✗ ${label}`);
  }
};

const snap = snapshotPickSites(TOURNAMENT.sites, TOURNAMENT.teams);

// ---- snapshot ----
eq("snapshot has 16 sites", snap.sites.length, 16);
ok("snapshot bySeed has 1..16", Array.from({ length: 16 }, (_, i) => i + 1).every((sd) => !!snap.bySeed[sd]));

// ---- encode/decode ----
const empty = emptyPicks();
const emptyCode = encodePicks(empty, snap);
eq("empty code length is 26", emptyCode.length, 26);
ok("empty code is all-no", /^1{1}4{16}2{8}8$/.test(emptyCode));

const p = emptyPicks();
p.reg[snap.bySeed[1].id] = snap.bySeed[1].teams[2]; // a regional champ
p.reg[snap.bySeed[16].id] = snap.bySeed[16].teams[1];
p.sup[1] = 0;
p.cwsChamp = 1;
const code = encodePicks(p, snap);
eq("populated code length is 26", code.length, 26);
eq("round-trips exactly", JSON.stringify(decodePicks(code, snap)), JSON.stringify(p));
eq("garbage decodes to null", decodePicks("garbage", snap), null);
eq("wrong-length decodes to null", decodePicks("1234", snap), null);
eq("bad prefix decodes to null", decodePicks("2" + "4".repeat(24) + "8", snap), null);
eq("progress counts reg+sup+champ", pickProgress(p, snap), 4);

// cleanup drops a super pick whose feeder regional was removed
const p2 = { v: 1, reg: {}, sup: { 1: 0 }, cwsChamp: 1 };
const cleaned = cleanupPicks(p2, snap);
eq("cleanup drops orphan super", cleaned.sup[1], undefined);
eq("cleanup drops orphan champ", cleaned.cwsChamp, null);

// ---- scoreBracketCode ----
const noResults = { regChampById: {}, superWinnerBySeed: {} };
eq("nothing decided yet", scoreBracketCode(code, snap, noResults).decided, 0);
const s1 = snap.bySeed[1];
const results = { regChampById: { [s1.id]: p.reg[s1.id] }, superWinnerBySeed: {} };
const sc = scoreBracketCode(code, snap, results);
eq("one regional decided", sc.regDecided, 1);
eq("that pick is correct", sc.reg, 1);

// ---- enumerateGames / scoreGames ----
const ctx = { snapshot: snap, round: "regional", sites: TOURNAMENT.sites, bySite: {}, resolveBracket };
const { games, decided } = enumerateGames(ctx);
ok("enumerates >= 16*7 regional games", games.length >= 16 * 7);
eq("nothing decided with empty feed", Object.keys(decided).length, 0);
const g1 = games.find((g) => /_G1$/.test(g.key));
ok("G1 is determined", g1 && g1.determined === true);
ok("G1 classed open pre-tournament (future first pitch)", gameClass({ ...g1, startMs: Date.now() + 1e6 }, Date.now()) === "open");

// fairness: a pick made before first pitch that matches the winner is a win;
// the same pick made after first pitch does not count.
const truth = { athens_G1: { winner: "georgia", startMs: 1000 } };
eq("on-time correct pick wins", scoreGames({ athens_G1: { pick: "georgia", ts: 500 } }, truth), {
  wins: 1,
  losses: 0,
  decided: 1,
  superWins: 0,
});
eq("late pick loses", scoreGames({ athens_G1: { pick: "georgia", ts: 1500 } }, truth).wins, 0);
eq("local preview ignores ts", scoreLocalGames({ athens_G1: "georgia" }, truth), { wins: 1, losses: 0, decided: 1 });

// ---- format ----
eq("formatRecord", formatRecord({ w: 40, l: 12 }), "40–12");
eq("formatRecord missing", formatRecord(null), null);
ok("isMissing catches TODO + empty + null", isMissing("TODO") && isMissing("") && isMissing(null) && !isMissing("ok"));
ok("implied prob of -180 ≈ 0.643", Math.abs(impliedProbFromMoneyline("-180") - 0.6428) < 0.01);
ok("implied prob of +140 ≈ 0.417", Math.abs(impliedProbFromMoneyline("+140") - 0.4167) < 0.01);

// ---- fieldRanks ----
const ranks = fieldRanks(TOURNAMENT.teams);
const teamsArr = Object.entries(TOURNAMENT.teams);
// RPI is "low is better": the #1-ranked team must have the minimum RPI.
const rpiTeams = teamsArr.filter(([, t]) => typeof t.rpi === "number");
const minRpi = Math.min(...rpiTeams.map(([, t]) => t.rpi));
const rpiLeader = teamsArr.find(([id]) => ranks[id].rpi && ranks[id].rpi.rank === 1);
ok("rpi rank #1 has the minimum RPI", rpiLeader && TOURNAMENT.teams[rpiLeader[0]].rpi === minRpi);
ok("rpi 'of' equals the count of teams with an RPI", rpiLeader && ranks[rpiLeader[0]].rpi.of === rpiTeams.length);
// runs is "high is better": rank #1 has the max runs.
const runTeams = teamsArr.filter(([, t]) => t.stats && t.stats.runs != null);
const maxRuns = Math.max(...runTeams.map(([, t]) => t.stats.runs));
const runLeader = teamsArr.find(([id]) => ranks[id].runs && ranks[id].runs.rank === 1);
ok("runs rank #1 has the most runs", runLeader && TOURNAMENT.teams[runLeader[0]].stats.runs === maxRuns);

// ---- schedule helpers (Schedule view + Home cold-open) ----
eq("gameNum parses regional key", gameNum("athens_G3"), 3);
eq("gameNum parses super key", gameNum("super-1_G2"), 2);
eq("gameNum of junk is 0", gameNum("nope"), 0);
eq("parseClockToMins noon", parseClockToMins("12:00 PM"), 720);
eq("parseClockToMins midnight-ish 12:30 AM", parseClockToMins("12:30 AM"), 30);
eq("parseClockToMins 6:05 PM", parseClockToMins("6:05 PM"), 1085);
eq("parseClockToMins junk -> null", parseClockToMins("soon"), null);
// firstPitchMs picks the earliest published time on the opening Friday.
const fp = firstPitchMs({ a: [{ time: "3:00 PM" }, { time: "12:00 PM" }], b: [{ time: "6:00 PM" }] });
eq("firstPitchMs = 12:00 PM ET = 16:00Z", fp, Date.parse("2026-05-29T12:00:00-04:00"));
eq("firstPitchMs empty -> null", firstPitchMs({}), null);
eq("firstPitchMs all-unparseable -> null", firstPitchMs({ a: [{ time: "TBD" }] }), null);
// defaultDayKey: exact today, else most-recent past, else first.
const days = [
  { key: "fri", dateMs: 100 },
  { key: "sat", dateMs: 200 },
  { key: "sun", dateMs: 300 },
];
eq("defaultDayKey exact today", defaultDayKey(days, 200, 250), "sat");
eq("defaultDayKey most-recent past", defaultDayKey(days, 999, 250), "sat");
eq("defaultDayKey before first -> first", defaultDayKey(days, 50, 50), "fri");
eq("defaultDayKey empty -> null", defaultDayKey([], 1, 1), null);

// ---- pick validators (mirror of the worker store; gate /api/picks) ----
ok("valid bracket code accepted", isValidBracketCode("1" + "4".repeat(16) + "2".repeat(8) + "8"));
ok("short bracket code rejected", !isValidBracketCode("1234"));
ok("non-digit bracket code rejected", !isValidBracketCode("x".repeat(26)));
ok("regional game key valid", isValidGameKey("athens_G3"));
ok("super game key valid", isValidGameKey("super-1_G2"));
ok("bad game key rejected", !isValidGameKey("athens_G9") && !isValidGameKey("../etc"));
ok("team id valid", isValidTeamId("georgia-tech"));
ok("team id rejects junk/too-long", !isValidTeamId("UPPER") && !isValidTeamId("x".repeat(60)));

// ---- leagues account-sync helpers ----
const goodEntry = { code: "abc123", memberId: "member-000001", displayName: "Tyler" };
eq("cleanLeaguesPayload uppercases code + keeps valid entry", cleanLeaguesPayload([goodEntry]), [{ code: "ABC123", memberId: "member-000001", displayName: "Tyler" }]);
eq("cleanLeaguesPayload drops bad entries", cleanLeaguesPayload([{ code: "!!", memberId: "x", displayName: "" }, null, 5]), []);
eq("cleanLeaguesPayload de-dupes by code (first wins)", cleanLeaguesPayload([goodEntry, { ...goodEntry, displayName: "Other" }]).length, 1);
eq("cleanLeaguesPayload non-array → []", cleanLeaguesPayload("nope"), []);
// merge: server wins on shared code; local-only kept
const localL = [{ code: "AAA111", memberId: "local-aaaaaa", displayName: "Me" }, { code: "BBB222", memberId: "local-bbbbbb", displayName: "Me" }];
const serverL = [{ code: "AAA111", memberId: "server-aaaaa", displayName: "Me2" }, { code: "CCC333", memberId: "server-ccccc", displayName: "Me3" }];
const merged = mergeLeagues(localL, serverL);
eq("merge has all three codes", merged.map((l) => l.code).sort().join(","), "AAA111,BBB222,CCC333");
eq("merge: server memberId wins on shared code", merged.find((l) => l.code === "AAA111").memberId, "server-aaaaa");
eq("merge: local-only league kept", !!merged.find((l) => l.code === "BBB222"), true);
ok("leaguesEqual ignores order", leaguesEqual(localL, [localL[1], localL[0]]));
ok("leaguesEqual detects difference", !leaguesEqual(localL, serverL));

console.log(`\n${fail ? "✗" : "✓"} lib modules: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
