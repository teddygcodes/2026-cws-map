/* =============================================================================
   Pure helpers for account-synced league memberships. No DOM / network — used
   by both the /api/leagues route (server validation) and LeaguesProvider
   (client merge), and unit-tested in scripts/test-lib.mjs.

   A membership is { code, memberId, displayName }:
   - code:        league code (Crockford base32, the Worker emits 6 chars)
   - memberId:    the device's edit token for that league (8–64 chars)
   - displayName: 1–24 printable chars
   ============================================================================= */

const MAX_LEAGUES = 50; // generous cap; bounds the synced payload

function cleanCode(s) {
  return typeof s === "string" && /^[A-Z0-9]{1,12}$/i.test(s) ? s.toUpperCase() : null;
}
function cleanMemberId(s) {
  return typeof s === "string" && s.length >= 8 && s.length <= 64 && /^[A-Za-z0-9_-]+$/.test(s) ? s : null;
}
function cleanName(s) {
  if (typeof s !== "string") return null;
  let out = "";
  for (let i = 0; i < s.length && out.length < 24; i++) {
    const cc = s.charCodeAt(i);
    if (cc >= 32 && cc !== 127) out += s.charAt(i);
  }
  out = out.trim();
  return out.length ? out : null;
}

/** Validate + normalize an incoming leagues array; drop bad entries, de-dupe by
 *  code (first wins), cap length. Always returns an array (never throws). */
export function cleanLeaguesPayload(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = {};
  const out = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const code = cleanCode(raw.code);
    const memberId = cleanMemberId(raw.memberId);
    const displayName = cleanName(raw.displayName);
    if (!code || !memberId || !displayName) continue;
    if (seen[code]) continue;
    seen[code] = true;
    out.push({ code, memberId, displayName });
    if (out.length >= MAX_LEAGUES) break;
  }
  return out;
}

/** Merge server + local memberships into one set (union by code). The server is
 *  the source of truth for shared identity, so when the same league exists on
 *  both, the server's entry (its memberId) wins — that's how a second device
 *  adopts the same member entry instead of creating a duplicate. Local-only
 *  leagues are kept (and will be pushed up). Returns a cleaned array. */
export function mergeLeagues(local, server) {
  const byCode = {};
  cleanLeaguesPayload(server).forEach((l) => {
    byCode[l.code] = l;
  });
  cleanLeaguesPayload(local).forEach((l) => {
    if (!byCode[l.code]) byCode[l.code] = l;
  });
  return Object.keys(byCode).map((c) => byCode[c]);
}

/** True if the two membership lists differ (order-insensitive by code+memberId+
 *  displayName) — used to decide whether a local save / server push is needed. */
export function leaguesEqual(a, b) {
  const norm = (list) =>
    cleanLeaguesPayload(list)
      .map((l) => l.code + "|" + l.memberId + "|" + l.displayName)
      .sort()
      .join(",");
  return norm(a) === norm(b);
}
