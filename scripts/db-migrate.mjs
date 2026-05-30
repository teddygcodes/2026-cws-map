// Apply db/schema.sql to the configured Postgres database.
//
//   node scripts/db-migrate.mjs      (or: npm run db:migrate)
//
// db/schema.sql is idempotent (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT
// EXISTS), so this is safe to run repeatedly and after every deploy that touches
// the schema. The repo previously had NO automated migration — the schema was a
// manual "run once" file — which let production drift behind the code: the
// user_picks table was missing in prod, so /api/picks 500'd and cross-device
// pick sync silently failed even though sign-in worked.
//
// Connection string resolution mirrors lib/db.js: POSTGRES_URL, then
// DATABASE_URL, then POSTGRES_PRISMA_URL. Loads .env.local for local runs.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Minimal .env.local loader (no dependency) — only fills vars that aren't set.
try {
  const raw = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    process.env[key] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local (e.g. CI / Vercel) — rely on the real environment */
}

const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error("[db-migrate] No POSTGRES_URL / DATABASE_URL set — nothing to migrate.");
  process.exit(1);
}

const schema = readFileSync(join(root, "db", "schema.sql"), "utf8");

const pool = new pg.Pool({
  connectionString,
  max: 1,
  ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

// node-postgres runs a multi-statement string in one round trip via the simple
// query protocol (no bound params), which handles the whole idempotent
// db/schema.sql — including the DO $$ ... END $$ block — as a single batch.
try {
  await pool.query(schema);
  console.log("[db-migrate] Applied db/schema.sql successfully.");
} catch (e) {
  console.error("[db-migrate] FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
