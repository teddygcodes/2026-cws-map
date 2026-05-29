// Friendly, branded replacement for NextAuth's bare default error page (which
// is a dead-end). Shows what went wrong and always offers a way back into the
// app. Wired via `pages: { error: "/auth-error" }` in auth.js.

const MESSAGES = {
  Configuration: "The sign-in service is misconfigured. The app still works without signing in.",
  AccessDenied: "Sign-in was cancelled or access was denied.",
  Verification: "That sign-in link has expired or was already used.",
  OAuthCallback: "Google sign-in didn't complete. This usually means this site's address isn't allow-listed for Google sign-in.",
  OAuthSignin: "Couldn't start Google sign-in. Try again in a moment.",
  default: "Something went wrong during sign-in.",
};

export const metadata = { title: "Sign-in problem — 2026 NCAA Baseball" };

export default async function AuthErrorPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const code = typeof sp.error === "string" ? sp.error : "";
  const message = MESSAGES[code] || MESSAGES.default;

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px", background: "var(--bg, #0a0b0f)", color: "var(--text, #e8e8ea)", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center", border: "1px solid var(--line, #23252d)", borderLeft: "3px solid var(--accent, #e8202a)", borderRadius: "12px", padding: "28px 24px", background: "var(--surface-1, #13151b)" }}>
        <div style={{ fontFamily: "var(--font-ui, inherit)", fontWeight: 800, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent, #e8202a)", marginBottom: 8 }}>Road to Omaha</div>
        <h1 style={{ fontSize: 24, margin: "0 0 10px" }}>Sign-in had a problem</h1>
        <p style={{ color: "var(--muted, #9a9ba3)", margin: "0 0 6px", lineHeight: 1.5 }}>{message}</p>
        {code ? <p style={{ color: "var(--faint, #6b6c75)", fontSize: 12, margin: "0 0 20px" }}>Reference: {code}</p> : <div style={{ height: 12 }} />}
        <a
          href="/"
          style={{ display: "inline-block", background: "var(--accent, #e8202a)", color: "#fff", textDecoration: "none", fontWeight: 700, padding: "10px 20px", borderRadius: "999px", letterSpacing: "0.04em" }}
        >
          ← Back to the app
        </a>
        <p style={{ color: "var(--faint, #6b6c75)", fontSize: 12, marginTop: 16 }}>You can keep using everything signed-out — sign-in only syncs your picks and leagues across devices.</p>
      </div>
    </main>
  );
}
