#!/usr/bin/env node
/**
 * Unit tests for the league Worker's pure validators (no Cloudflare bindings).
 * These guard the exact shapes the Worker accepts/rejects.
 */
import { isValidBracketCode, sanitizeDisplayName, makeCode, isValidGameKey, isValidTeamId } from "../worker/worker.js";

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; }
  else { fail++; console.error(`  ✗ ${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

// isValidBracketCode — must match the app's encodePicks() output (26 digits, leading "1")
eq(isValidBracketCode("1" + "0".repeat(25)), true, "valid all-zero bracket");
eq(isValidBracketCode("1" + "4444444444444444222222228"), true, "valid empty-picks bracket");
eq(isValidBracketCode("garbage"), false, "reject non-numeric");
eq(isValidBracketCode("2" + "0".repeat(25)), false, "reject wrong version char");
eq(isValidBracketCode("1" + "0".repeat(24)), false, "reject wrong length (25)");
eq(isValidBracketCode("1" + "0".repeat(26)), false, "reject wrong length (27)");
eq(isValidBracketCode(null), false, "reject null");
eq(isValidBracketCode(12345), false, "reject non-string");

// sanitizeDisplayName — trim, strip control chars, cap 24, null if empty
eq(sanitizeDisplayName("  Tyler  "), "Tyler", "trim whitespace");
eq(sanitizeDisplayName("a".repeat(40)), "a".repeat(24), "cap at 24 chars");
eq(sanitizeDisplayName("   "), null, "empty after trim -> null");
eq(sanitizeDisplayName(""), null, "empty string -> null");
eq(sanitizeDisplayName(42), null, "non-string -> null");
eq(sanitizeDisplayName("Tab\tHere"), "TabHere", "strip control chars");

// makeCode — 6 Crockford base32 chars, no ambiguous I/L/O/U
const code = makeCode(6);
eq(typeof code === "string" && code.length === 6, true, "makeCode length 6");
eq(/^[0-9A-HJKMNP-TV-Z]{6}$/.test(code), true, "makeCode uses Crockford alphabet");

// isValidGameKey — regional "<site>_G1-7" or super "super-1-8_G1-3"
eq(isValidGameKey("athens_G3"), true, "regional game key");
eq(isValidGameKey("los-angeles_G7"), true, "hyphenated site key");
eq(isValidGameKey("super-1_G2"), true, "super game key");
eq(isValidGameKey("athens_G8"), false, "reject G8");
eq(isValidGameKey("athens_G0"), false, "reject G0");
eq(isValidGameKey("super-9_G1"), false, "reject super seed 9");
eq(isValidGameKey("super-1_G4"), false, "reject super G4");
eq(isValidGameKey("athens_G3; DROP TABLE"), false, "reject injection");
eq(isValidGameKey("a".repeat(45) + "_G1"), false, "reject overlong key");
eq(isValidGameKey(42), false, "reject non-string");

// isValidTeamId — lowercase id format only
eq(isValidTeamId("georgia-tech"), true, "team id");
eq(isValidTeamId("Bad Id"), false, "reject space");
eq(isValidTeamId("UPPER"), false, "reject uppercase");
eq(isValidTeamId("a".repeat(50)), false, "reject overlong");
eq(isValidTeamId(null), false, "reject null");

console.log(`\n${fail === 0 ? "✓" : "✗"} league worker: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
