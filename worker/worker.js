/**
 * CWS-MAP private-league backend — a tiny Cloudflare Worker + KV store.
 *
 * Design: this Worker is a DUMB STORE. It holds leagues and member entries and
 * enforces a first-pitch lock, but it NEVER fetches ESPN and NEVER scores or
 * resolves brackets — all scoring happens client-side in index.html (reusing
 * the bracket resolver), so "truth" lives in one place. A member's bracket is
 * an opaque 26-char code produced by the app's encodePicks().
 *
 * Endpoints (JSON; CORS locked to the app origins):
 *   POST /league                  {name}                         -> {code,name,lockTs}
 *   GET  /league/<code>                                          -> {name,lockTs,members:[...]}
 *   POST /league/<code>/member    {memberId,displayName,bracket} -> {member} | 409 locked
 *
 * "Auth" is honor-system: the client generates a random memberId and must
 * present it to replace its own entry. This is NOT secure authentication — it
 * is "edit your own pick," matching the app's clearly-unofficial framing.
 *
 * KV value shape (one key per league; member-keyed so the Session-15 per-game
 * pick'em can add a `games` map to the SAME member with no reshaping):
 *   league:<CODE> -> { v, name, created, lockTs,
 *     members: { <memberId>: { memberId, displayName, bracket, updated, games } } }
 */

// ---- config ----------------------------------------------------------------
// Vercel preview/prod origins are added once the project is created; placeholder
// matches `*.vercel.app` is NOT used (CORS demands exact origins) — list each.
const ALLOWED_ORIGINS = [
  "https://teddygcodes.github.io",   // legacy Pages deploy (retire after Vercel cutover)
  "http://localhost:4173",            // legacy smoke test (retire after pipeline cutover)
  "http://127.0.0.1:4173",
  "http://localhost:3000",            // Next dev (next dev default port)
  "http://127.0.0.1:3000",
];
const MAX_MEMBERS_PER_LEAGUE = 200;
const MAX_LEAGUES_PER_IP = 25;          // per rolling window (best-effort backstop)
const IP_WINDOW_SECONDS = 86400;        // 24h
const MAX_BODY_BYTES = 8192;            // a full per-game picks map (~136 keys) + name
const MAX_GAMES_PER_REQUEST = 80;       // games submitted in one POST
const MAX_GAMES_TOTAL = 160;            // total per-game picks a member can hold
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32 (no I L O U)
// Default lock = 2026 regionals first pitch; override with [vars] LOCK_TS in wrangler.toml.
const DEFAULT_LOCK_TS = Date.parse("2026-05-29T16:00:00Z");

// ---- pure validators (exported for Node unit tests; no CF globals here) -----
export function isValidBracketCode(s) {
  return typeof s === "string" && s.length === 26 && s.charAt(0) === "1" && /^[0-9]{26}$/.test(s);
}
// Per-game pick keys: regionals "<siteId>_G<1-7>", supers "super-<1-8>_G<1-3>".
export function isValidGameKey(s) {
  // regional "<siteId>_G1-7" (siteId can't start with "super-") OR super "super-<1-8>_G1-3"
  return typeof s === "string" && s.length <= 40 && /^((?!super-)[a-z0-9-]+_G[1-7]|super-[1-8]_G[1-3])$/.test(s);
}
export function isValidTeamId(s) {
  return typeof s === "string" && /^[a-z0-9-]{1,40}$/.test(s);
}
export function sanitizeDisplayName(s) {
  if (typeof s !== "string") return null;
  // Keep printable chars only: drop ASCII control codes (< 32) and DEL (127).
  var clean = "";
  for (var i = 0; i < s.length && clean.length < 24; i++) {
    var cc = s.charCodeAt(i);
    if (cc >= 32 && cc !== 127) clean += s.charAt(i);
  }
  clean = clean.trim();
  return clean.length ? clean : null;
}
export function makeCode(n) {
  n = n || 6;
  var bytes = new Uint8Array(n);
  (globalThis.crypto || crypto).getRandomValues(bytes);
  var out = "";
  for (var i = 0; i < n; i++) out += CODE_ALPHABET[bytes[i] % 32];
  return out;
}

// ---- helpers ---------------------------------------------------------------
function corsHeaders(origin) {
  var h = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin" };
  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: corsHeaders(origin) });
}
async function readBody(request) {
  var len = +(request.headers.get("content-length") || 0);
  if (len > MAX_BODY_BYTES) return null;
  var text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try { return JSON.parse(text); } catch (e) { return null; }
}
function lockTsFrom(env) {
  var t = env && env.LOCK_TS != null ? Number(env.LOCK_TS) : NaN;
  return Number.isFinite(t) ? t : DEFAULT_LOCK_TS;
}
async function ipAllowsNewLeague(env, ip) {
  if (!ip) return true;
  var key = "ip:" + ip;
  var n = (await env.LEAGUES.get(key, "json")) || 0;
  if (n >= MAX_LEAGUES_PER_IP) return false;
  await env.LEAGUES.put(key, JSON.stringify(n + 1), { expirationTtl: IP_WINDOW_SECONDS });
  return true;
}
// Members are returned without exposing other people's edit tokens (memberId).
function publicMembers(league) {
  return Object.keys(league.members || {}).map(function (id) {
    var m = league.members[id];
    return { displayName: m.displayName, bracket: m.bracket, games: m.games || {}, updated: m.updated };
  });
}

// ---- request handler -------------------------------------------------------
export default {
  async fetch(request, env) {
    var origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

    var url = new URL(request.url);
    var parts = url.pathname.split("/").filter(Boolean); // e.g. ["league","ABC123","member"]
    var method = request.method;

    try {
      // POST /league — create
      if (method === "POST" && parts.length === 1 && parts[0] === "league") {
        var body = await readBody(request);
        if (!body) return json({ error: "bad_request" }, 400, origin);
        var name = sanitizeDisplayName(body.name) || "League";
        var ip = request.headers.get("CF-Connecting-IP") || "";
        if (!(await ipAllowsNewLeague(env, ip))) return json({ error: "rate_limited" }, 429, origin);
        var lockTs = lockTsFrom(env), code = "";
        for (var attempt = 0; attempt < 5; attempt++) {
          var c = makeCode(6);
          if (!(await env.LEAGUES.get("league:" + c))) { code = c; break; }
        }
        if (!code) return json({ error: "try_again" }, 503, origin);
        var league = { v: 1, name: name, created: Date.now(), lockTs: lockTs, members: {} };
        await env.LEAGUES.put("league:" + code, JSON.stringify(league));
        return json({ code: code, name: name, lockTs: lockTs }, 200, origin);
      }

      // GET /league/<code>
      if (method === "GET" && parts.length === 2 && parts[0] === "league") {
        var lg = await env.LEAGUES.get("league:" + parts[1].toUpperCase(), "json");
        if (!lg) return json({ error: "not_found" }, 404, origin);
        return json({ name: lg.name, lockTs: lg.lockTs, members: publicMembers(lg) }, 200, origin);
      }

      // POST /league/<code>/member — join / replace own entry
      if (method === "POST" && parts.length === 3 && parts[0] === "league" && parts[2] === "member") {
        var codeU = parts[1].toUpperCase();
        var key = "league:" + codeU;
        var L = await env.LEAGUES.get(key, "json");
        if (!L) return json({ error: "not_found" }, 404, origin);
        if (Date.now() > L.lockTs) return json({ error: "locked", lockTs: L.lockTs }, 409, origin);
        var b = await readBody(request);
        if (!b) return json({ error: "bad_request" }, 400, origin);
        var memberId = typeof b.memberId === "string" && b.memberId.length >= 8 && b.memberId.length <= 64 ? b.memberId : null;
        var dn = sanitizeDisplayName(b.displayName);
        if (!memberId || !dn || !isValidBracketCode(b.bracket)) return json({ error: "invalid_entry" }, 400, origin);
        L.members = L.members || {};
        var existing = L.members[memberId];
        if (!existing && Object.keys(L.members).length >= MAX_MEMBERS_PER_LEAGUE) return json({ error: "league_full" }, 409, origin);
        L.members[memberId] = {
          memberId: memberId, displayName: dn, bracket: b.bracket, updated: Date.now(),
          games: (existing && existing.games) || {},   // preserve S15 per-game picks on edit
        };
        await env.LEAGUES.put(key, JSON.stringify(L));
        return json({ displayName: dn, bracket: b.bracket, updated: L.members[memberId].updated }, 200, origin);
      }

      // POST /league/<code>/games — submit/merge per-game picks. NOT lock-gated:
      // daily picks stay open all tournament; fairness is enforced per-pick at
      // scoring time (a pick counts only if its ts predates that game's first pitch).
      if (method === "POST" && parts.length === 3 && parts[0] === "league" && parts[2] === "games") {
        var gKey = "league:" + parts[1].toUpperCase();
        var GL = await env.LEAGUES.get(gKey, "json");
        if (!GL) return json({ error: "not_found" }, 404, origin);
        var gb = await readBody(request);
        if (!gb) return json({ error: "bad_request" }, 400, origin);
        var gMemberId = typeof gb.memberId === "string" && gb.memberId.length >= 8 && gb.memberId.length <= 64 ? gb.memberId : null;
        var gName = sanitizeDisplayName(gb.displayName);
        if (!gMemberId || !gName || !gb.picks || typeof gb.picks !== "object") return json({ error: "invalid_entry" }, 400, origin);
        var keys = Object.keys(gb.picks);
        if (keys.length > MAX_GAMES_PER_REQUEST) return json({ error: "too_many" }, 400, origin);
        GL.members = GL.members || {};
        var gm = GL.members[gMemberId];
        if (!gm && Object.keys(GL.members).length >= MAX_MEMBERS_PER_LEAGUE) return json({ error: "league_full" }, 409, origin);
        gm = gm || { memberId: gMemberId, displayName: gName, bracket: null, games: {}, updated: Date.now() };
        gm.displayName = gName;
        gm.games = gm.games || {};
        var now = Date.now();
        for (var k = 0; k < keys.length; k++) {
          var gk = keys[k], pick = gb.picks[gk];
          if (!isValidGameKey(gk) || !isValidTeamId(pick)) continue;
          var prev = gm.games[gk];
          if (prev && prev.pick === pick) continue;           // unchanged → keep original ts (lock integrity)
          gm.games[gk] = { pick: pick, ts: now };
        }
        if (Object.keys(gm.games).length > MAX_GAMES_TOTAL) return json({ error: "too_many" }, 400, origin);
        gm.gamesUpdated = now;
        GL.members[gMemberId] = gm;
        await env.LEAGUES.put(gKey, JSON.stringify(GL));
        return json({ games: gm.games, updated: now }, 200, origin);
      }

      return json({ error: "not_found" }, 404, origin);
    } catch (e) {
      return json({ error: "server_error" }, 500, origin);
    }
  },
};
