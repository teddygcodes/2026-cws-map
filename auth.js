// Auth.js v5 (next-auth@beta) configuration.
//
// Providers:
//   - Google OAuth (set AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET)
//   - Resend email magic-link (set AUTH_RESEND_KEY + verified `from` domain)
//
// Adapter: official PostgreSQL adapter, backed by the pool in lib/db.js.
// Sessions: database strategy (easy revoke; one extra DB read per request — fine).
//
// Required env vars (see .env.example): AUTH_SECRET, AUTH_GOOGLE_ID,
// AUTH_GOOGLE_SECRET, AUTH_RESEND_KEY, POSTGRES_URL, AUTH_URL (optional).

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [
    Google,
    Resend({
      // Verified sending address (configure SPF/DKIM on the domain in Resend).
      from: process.env.AUTH_EMAIL_FROM || "no-reply@cws-map.app",
    }),
  ],
  session: { strategy: "database" },
  trustHost: true, // Vercel terminates TLS; trust the forwarded host.
  callbacks: {
    // Ensure the integer user id (from the pg adapter) is on session.user.id
    // so /api/picks can key rows by it.
    async session({ session, user }) {
      if (session?.user && user?.id != null) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
