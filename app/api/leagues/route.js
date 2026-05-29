// Account sync for league memberships ({ code, memberId, displayName }[]). Lets
// a signed-in user carry their joined leagues across devices. Stored in the
// `leagues` JSONB column of user_picks; this route touches ONLY that column, so
// it never clobbers bracket/game picks (and the picks route never touches
// leagues). Resilient to a not-yet-migrated DB (no `leagues` column → no-op).

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { cleanLeaguesPayload } from "@/lib/leagues-sync";

export const runtime = "nodejs"; // pg pool needs Node runtime, not Edge.

const MAX_BODY_BYTES = 8192;
const UNDEFINED_COLUMN = "42703"; // Postgres: column does not exist (pre-migration)

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return jsonResponse({ error: "unauthorized" }, 401);
  const userId = session.user.id;
  if (!userId) return jsonResponse({ error: "no-user-id" }, 500);

  try {
    const { rows } = await pool.query("SELECT leagues FROM user_picks WHERE user_id=$1", [userId]);
    return jsonResponse({ leagues: cleanLeaguesPayload(rows[0] ? rows[0].leagues : []) });
  } catch (e) {
    if (e && e.code === UNDEFINED_COLUMN) return jsonResponse({ leagues: [] });
    return jsonResponse({ error: "server-error" }, 500);
  }
}

export async function PUT(req) {
  const session = await auth();
  if (!session?.user) return jsonResponse({ error: "unauthorized" }, 401);
  const userId = session.user.id;
  if (!userId) return jsonResponse({ error: "no-user-id" }, 500);

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return jsonResponse({ error: "payload-too-large" }, 400);
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    return jsonResponse({ error: "bad-json" }, 400);
  }
  const leagues = cleanLeaguesPayload(body && body.leagues);

  try {
    await pool.query(
      `INSERT INTO user_picks (user_id, leagues) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET leagues = EXCLUDED.leagues`,
      [userId, JSON.stringify(leagues)]
    );
    return jsonResponse({ leagues });
  } catch (e) {
    if (e && e.code === UNDEFINED_COLUMN) return jsonResponse({ leagues: [], skipped: "not-migrated" });
    return jsonResponse({ error: "server-error" }, 500);
  }
}
