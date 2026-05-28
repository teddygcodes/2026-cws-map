// Pure validators ported VERBATIM from worker/worker.js:42-52 so the sync
// endpoint enforces the same shape rules as the league worker.
//
// NOTE: keep these in sync with the worker copies. The worker tests
// (scripts/test-league.mjs) cover the source of truth.

export function isValidBracketCode(s) {
  return (
    typeof s === "string" &&
    s.length === 26 &&
    s.charAt(0) === "1" &&
    /^[0-9]{26}$/.test(s)
  );
}

// Per-game pick keys: regionals "<siteId>_G<1-7>", supers "super-<1-8>_G<1-3>".
export function isValidGameKey(s) {
  return (
    typeof s === "string" &&
    s.length <= 40 &&
    /^((?!super-)[a-z0-9-]+_G[1-7]|super-[1-8]_G[1-3])$/.test(s)
  );
}

export function isValidTeamId(s) {
  return typeof s === "string" && /^[a-z0-9-]{1,40}$/.test(s);
}
