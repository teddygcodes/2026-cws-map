-- Schema for the Vercel Postgres / Neon database.
--
-- Run this ONCE after provisioning the database (e.g. via the Vercel
-- dashboard SQL editor, or `psql $POSTGRES_URL -f db/schema.sql`).
--
-- It creates the four tables the @auth/pg-adapter expects (column names
-- exactly as the adapter queries them, including the double-quoted camelCase),
-- plus the app's user_picks table.

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  token      TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS accounts (
  id                  SERIAL PRIMARY KEY,
  "userId"            INTEGER NOT NULL,
  type                VARCHAR(255) NOT NULL,
  provider            VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  id_token            TEXT,
  scope               TEXT,
  session_state       TEXT,
  token_type          TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id             SERIAL PRIMARY KEY,
  "userId"       INTEGER NOT NULL,
  expires        TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255),
  email           VARCHAR(255),
  "emailVerified" TIMESTAMPTZ,
  image           TEXT
);

-- App-specific: opaque per-user picks. Server NEVER decodes these — bracket_code
-- is the 26-char encodePicks() output and game_picks is GAME_PICKS.picks
-- ({ gameKey: teamId }). Mirrors how the league Worker stores opaque codes.
CREATE TABLE IF NOT EXISTS user_picks (
  user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bracket_code TEXT,
  game_picks   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Account-synced league memberships: [{ code, memberId, displayName }]. Lets a
-- signed-in user see/edit the same league entries on every device. Idempotent —
-- upgrades the table in place for databases created before this migration.
ALTER TABLE user_picks ADD COLUMN IF NOT EXISTS leagues JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Integrity + performance hardening (idempotent; upgrades pre-existing tables
-- too, since CREATE TABLE IF NOT EXISTS above won't alter them).
-- Foreign keys so deleting a user cleans up their accounts/sessions; indexes on
-- the adapter's lookup columns; uniqueness on session tokens.
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions("userId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions("sessionToken");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_user_fk') THEN
    ALTER TABLE accounts ADD CONSTRAINT accounts_user_fk
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_fk') THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_user_fk
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
