"use client";

import { signIn, signOut } from "next-auth/react";

/**
 * Floating auth chrome in the top-right: shows the signed-in user's avatar +
 * name (or email) and a Sign Out button, or a single "Sign in with Google"
 * button when anonymous. Anonymous use of the legacy app keeps working —
 * this just adds the affordance to sign in for cross-device sync.
 */
export default function AuthHeader({ session }) {
  if (session?.user) {
    return (
      <div className="auth-chrome" data-signed-in="true">
        <span className="auth-who">
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="auth-avatar" />
          ) : null}
          <span className="auth-name">{session.user.name || session.user.email}</span>
        </span>
        <button
          type="button"
          className="auth-btn"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="auth-chrome" data-signed-in="false">
      <button
        type="button"
        className="auth-btn primary"
        onClick={() => signIn("google", { callbackUrl: "/" })}
      >
        Sign in with Google
      </button>
      <style jsx>{styles}</style>
    </div>
  );
}

// Scoped styles — minimal, matches the dark broadcast theme of the legacy app.
const styles = `
  .auth-chrome {
    position: fixed; top: 10px; right: 12px; z-index: 9999;
    font-family: "Oswald", system-ui, sans-serif; letter-spacing: .04em;
    display: flex; align-items: center; gap: 8px;
  }
  .auth-who { display: inline-flex; align-items: center; gap: 6px; color: #cdd1d6; font-size: 12px; text-transform: uppercase; }
  .auth-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
  .auth-name { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .auth-btn {
    appearance: none; border: 1px solid rgba(255,255,255,.14); background: rgba(20,22,26,.85);
    color: #f3f4f6; font: 600 11px/1 "Oswald", system-ui, sans-serif; letter-spacing: .06em;
    text-transform: uppercase; padding: 8px 12px; border-radius: 6px; cursor: pointer;
  }
  .auth-btn.primary { background: #c0211b; border-color: #c0211b; }
  .auth-btn:hover { filter: brightness(1.15); }
`;
