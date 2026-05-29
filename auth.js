// Auth.js v5 (next-auth@beta) configuration.
//
// Provider: Google OAuth (set AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET).
// (Resend email magic-link was considered and removed for simplicity.
// To add it later: install the Resend provider, set AUTH_RESEND_KEY +
// AUTH_EMAIL_FROM, and add `Resend({ from: ... })` to providers.)
//
// Adapter: official PostgreSQL adapter, backed by the pool in lib/db.js.
// Sessions: database strategy (easy revoke; one extra DB read per request).
//
// Required env vars (see .env.example): AUTH_SECRET, AUTH_GOOGLE_ID,
// AUTH_GOOGLE_SECRET, POSTGRES_URL, AUTH_URL (optional).

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [Google],
  session: { strategy: "database" },
  trustHost: true, // Vercel terminates TLS; trust the forwarded host.
  pages: { error: "/auth-error" }, // branded error page with a way back (not a dead-end)
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
