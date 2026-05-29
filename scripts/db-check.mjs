// Read-only sanity check of the auth + sync tables.
//   node scripts/db-check.mjs
// Loads .env.local and prints row counts + the current saved picks.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnvLocal() {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}
loadEnvLocal();

const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  const users = await client.query("SELECT id, name, email FROM users ORDER BY id");
  console.log(`users: ${users.rows.length}`);
  for (const u of users.rows) console.log(`  #${u.id}  ${u.name || "(no name)"}  <${u.email}>`);

  const picks = await client.query(
    "SELECT user_id, bracket_code, game_picks, updated_at FROM user_picks ORDER BY user_id"
  );
  console.log(`\nuser_picks rows: ${picks.rows.length}`);
  for (const p of picks.rows) {
    const gpCount = p.game_picks ? Object.keys(p.game_picks).length : 0;
    console.log(
      `  user #${p.user_id}  bracket=${p.bracket_code ? p.bracket_code : "(none)"}  gamePicks=${gpCount}  updated=${p.updated_at?.toISOString?.() || p.updated_at}`
    );
  }
} catch (e) {
  console.error("✗", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
