// Postgres pool shared by Auth.js (via the pg adapter) and the /api/picks
// route. Vercel Postgres / Neon both speak the standard pg protocol and
// populate POSTGRES_URL (or DATABASE_URL) automatically.
//
// On Vercel serverless, a module-level pool is reused across warm invocations
// of the same container. A small pool size keeps us under Neon's connection
// limit even when many functions spin up at once.

import { Pool } from "pg";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  // Don't throw at import — let routes 500 with a clear server error instead
  // so the rest of the app (which is mostly anonymous) still renders.
  console.warn("[lib/db] No POSTGRES_URL set — auth + /api/picks will fail.");
}

export const pool = new Pool({
  connectionString,
  max: 5,
  ssl:
    connectionString && connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
});
