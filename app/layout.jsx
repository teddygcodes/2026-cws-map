import { Suspense } from "react";
import { auth } from "@/auth";
import AuthHeader from "./AuthHeader";

// Meta moved from index.html:1-35 — drop the /2026-cws-map/ subpath since
// Vercel serves at the root. Update canonical/OG once the prod domain is set.
export const metadata = {
  title: "2026 NCAA Baseball Tournament — Interactive Map",
  description:
    "Live map, double-elimination brackets, head-to-head matchups, daily pick'em, and private leagues for the 2026 NCAA Division I Baseball Tournament.",
  metadataBase: new URL(process.env.AUTH_URL || "http://localhost:3000"),
  openGraph: {
    title: "2026 NCAA Baseball Tournament — Interactive Map",
    description:
      "Live map, brackets, daily pick'em, and private leagues for the 2026 Road to Omaha.",
    images: ["/docs/og-card.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "2026 NCAA Baseball Tournament — Interactive Map",
    description:
      "Live map, brackets, daily pick'em, and private leagues for the 2026 Road to Omaha.",
    images: ["/docs/og-card.png"],
  },
};

async function safeAuth() {
  try {
    return await auth();
  } catch (e) {
    // Without env vars / DB the adapter throws. Anonymous use still works —
    // just keep the legacy app renderable.
    if (process.env.NODE_ENV !== "production") console.warn("[auth] unavailable:", e?.message);
    return null;
  }
}

export default async function RootLayout({ children }) {
  const session = await safeAuth();
  // Pass a minimal session payload to the legacy IIFE via a hidden input;
  // React safely escapes the attribute value, so there's no XSS risk even if
  // a name/email contained markup. The IIFE reads the value at boot.
  const sessionForClient = session?.user
    ? { signedIn: true, user: { email: session.user.email, name: session.user.name } }
    : { signedIn: false };

  return (
    <html lang="en">
      <head>
        {/* Legacy theme CSS — shipped as-is from /public/legacy/. */}
        <link rel="stylesheet" href="/legacy/app.css" />
      </head>
      <body>
        {/*
          Session payload for the legacy app. React JSON-stringifies and
          attribute-escapes the value; the IIFE reads it via
            JSON.parse(document.getElementById("__session").value)
          and assigns to window.__session before its boot logic runs.
        */}
        <input
          type="hidden"
          id="__session"
          readOnly
          value={JSON.stringify(sessionForClient)}
        />
        <Suspense fallback={null}>
          <AuthHeader session={session} />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
