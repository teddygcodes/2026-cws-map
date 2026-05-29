"use client";

import { signIn, signOut } from "next-auth/react";

// Small multicolor Google "G" — subtle affordance without a loud red block.
function GoogleG() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true" style={{ display: "block" }}>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.97 29.93 1 24 1 15.4 1 7.96 5.93 4.34 13.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

/**
 * Auth control that sits in the app masthead (top-right). Compact pill styled
 * to match the existing #backBtn — dark, thin border, red on hover — so it
 * reads as part of the broadcast theme, not a bolted-on button. Anonymous use
 * is unaffected; this just offers sign-in for cross-device pick sync.
 */
export default function AuthHeader({ session }) {
  const signedIn = !!session?.user;

  return (
    <div className="auth">
      {signedIn ? (
        <>
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="auth-av" referrerPolicy="no-referrer" />
          ) : null}
          <span className="auth-nm">{session.user.name || session.user.email}</span>
          <button type="button" className="auth-pill" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </>
      ) : (
        <button
          type="button"
          className="auth-pill auth-signin"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          <GoogleG />
          <span>Sign in</span>
        </button>
      )}

      <style jsx>{`
        .auth {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
          font-family: "Oswald", sans-serif;
        }
        .auth-av {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--line);
        }
        .auth-nm {
          font-size: 12px;
          letter-spacing: 0.04em;
          color: var(--muted);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .auth-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--panel-2);
          color: var(--text);
          border: 1px solid var(--line);
          padding: 7px 14px;
          border-radius: 999px;
          cursor: pointer;
          font-family: "Oswald", sans-serif;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          transition: 0.15s;
          line-height: 1;
        }
        .auth-pill:hover {
          border-color: var(--accent);
          color: #fff;
        }
        /* Hide the long name on narrow screens; keep avatar + Sign out. */
        @media (max-width: 560px) {
          .auth-nm {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
