"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";

/**
 * Floating auth chrome in the top-right: shows the signed-in user's avatar +
 * email and a Sign Out button, or a Sign In dropdown (Google + email link).
 * Anonymous use of the legacy app keeps working — this just adds the
 * affordance to sign in for cross-device sync.
 */
export default function AuthHeader({ session }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");

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
      {!open ? (
        <button type="button" className="auth-btn primary" onClick={() => setOpen(true)}>
          Sign in
        </button>
      ) : (
        <div className="auth-menu">
          <button
            type="button"
            className="auth-btn"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Continue with Google
          </button>
          {sentTo ? (
            <div className="auth-msg">
              Link sent to <b>{sentTo}</b>. Check your email.
            </div>
          ) : (
            <form
              className="auth-email"
              onSubmit={async (e) => {
                e.preventDefault();
                const addr = email.trim();
                if (!addr) return;
                try {
                  await signIn("resend", { email: addr, redirect: false, callbackUrl: "/" });
                  setSentTo(addr);
                } catch (_) {
                  /* network — surface? */
                }
              }}
            >
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="auth-btn">
                Email me a link
              </button>
            </form>
          )}
          <button type="button" className="auth-close" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
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
    text-transform: uppercase; padding: 6px 10px; border-radius: 6px; cursor: pointer;
  }
  .auth-btn.primary { background: #c0211b; border-color: #c0211b; }
  .auth-btn:hover { filter: brightness(1.15); }
  .auth-menu {
    background: rgba(15,16,20,.96); border: 1px solid rgba(255,255,255,.12);
    border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;
    min-width: 240px; box-shadow: 0 8px 24px rgba(0,0,0,.5);
  }
  .auth-email { display: flex; gap: 6px; }
  .auth-email input { flex: 1; padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,.14); background: #0f1014; color: #f3f4f6; font: 13px/1.2 system-ui; }
  .auth-msg { color: #cdd1d6; font-size: 12px; }
  .auth-close { background: transparent; border: 0; color: #9aa0a6; font-size: 11px; cursor: pointer; text-transform: uppercase; }
`;
