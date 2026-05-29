// One-off (idempotent) database migration runner.
//
//   node scripts/db-setup.mjs
//
// Reads the Postgres connection string from the environment (loading
// .env.local if present) and applies db/schema.sql. The schema uses
// CREATE TABLE IF NOT EXISTS, so re-running is safe.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Minimal .env.local loader (no dependency on dotenv).
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
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error("✗ No POSTGRES_URL / DATABASE_URL found. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

const schema = readFileSync(join(ROOT, "db", "schema.sql"), "utf8");

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(schema);
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' ORDER BY table_name`
  );
  console.log("✓ schema applied. Public tables:");
  for (const r of rows) console.log("  -", r.table_name);
} catch (e) {
  console.error("✗ migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
