// Server-side pick sync. The bracket is stored as the opaque 26-char string
// emitted by the client's encodePicks(); game picks are { gameKey: teamId }.
// The server does NOT decode or score either — that stays client-side.

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import {
  isValidBracketCode,
  isValidGameKey,
  isValidTeamId,
} from "@/lib/pick-validators";

export const runtime = "nodejs"; // pg pool needs Node runtime, not Edge.

// Caps mirror the league worker (worker.js): keep payloads small and bounded.
const MAX_BODY_BYTES = 8192;
const MAX_GAMES_TOTAL = 160;

// Postgres error codes for a database that hasn't had db/schema.sql applied yet.
// Mirrors the resilience already in app/api/leagues/route.js so a missing
// user_picks table surfaces as a clear, observable response instead of an opaque
// 500 that the client silently swallows (which presents as "picks don't sync").
const UNDEFINED_TABLE = "42P01"; // relation does not exist
const UNDEFINED_COLUMN = "42703"; // column does not exist
const isNotMigrated = (e) => e && (e.code === UNDEFINED_TABLE || e.code === UNDEFINED_COLUMN);

async function readJson(req) {
  // Enforce a body-size cap before parsing.
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    return { error: "payload-too-large" };
  }
  try {
    return { json: JSON.parse(text) };
  } catch (_) {
    return { error: "bad-json" };
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonResponse({ error: "unauthorized" }, 401);

  const userId = session.user.id;
  if (!userId) return jsonResponse({ error: "no-user-id" }, 500);

  try {
    const { rows } = await pool.query(
      "SELECT bracket_code, game_picks, updated_at FROM user_picks WHERE user_id=$1",
      [userId]
    );
    const row = rows[0];
    return jsonResponse(
      row
        ? {
            bracketCode: row.bracket_code || null,
            gamePicks: row.game_picks || {},
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
          }
        : { bracketCode: null, gamePicks: {}, updatedAt: null }
    );
  } catch (e) {
    // DB not migrated (user_picks table/column missing): the app still works
    // offline, but cross-device sync is unavailable until db/schema.sql is run.
    if (isNotMigrated(e)) return jsonResponse({ error: "not-migrated" }, 503);
    return jsonResponse({ error: "server-error" }, 500);
  }
}

export async function PUT(req) {
  const session = await auth();
  if (!session?.user) return jsonResponse({ error: "unauthorized" }, 401);
  const userId = session.user.id;
  if (!userId) return jsonResponse({ error: "no-user-id" }, 500);

  const parsed = await readJson(req);
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);
  const body = parsed.json || {};

  // bracketCode is optional (null clears it). When present, validate shape.
  let bracketCode = null;
  if (body.bracketCode !== undefined && body.bracketCode !== null) {
    if (!isValidBracketCode(body.bracketCode)) {
      return jsonResponse({ error: "bad-bracket" }, 400);
    }
    bracketCode = body.bracketCode;
  }

  // gamePicks: filter to valid (key,value) pairs; cap total entries.
  const cleanGames = {};
  let count = 0;
  if (body.gamePicks && typeof body.gamePicks === "object") {
    for (const [k, v] of Object.entries(body.gamePicks)) {
      if (!isValidGameKey(k) || !isValidTeamId(v)) continue;
      cleanGames[k] = v;
      if (++count > MAX_GAMES_TOTAL) {
        return jsonResponse({ error: "too-many-games" }, 400);
      }
    }
  }

  const now = new Date();
  try {
    await pool.query(
      `INSERT INTO user_picks (user_id, bracket_code, game_picks, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE
         SET bracket_code = EXCLUDED.bracket_code,
             game_picks   = EXCLUDED.game_picks,
             updated_at   = EXCLUDED.updated_at`,
      [userId, bracketCode, JSON.stringify(cleanGames), now]
    );
  } catch (e) {
    if (isNotMigrated(e)) return jsonResponse({ error: "not-migrated" }, 503);
    return jsonResponse({ error: "server-error" }, 500);
  }

  return jsonResponse({ updatedAt: now.getTime() });
}
