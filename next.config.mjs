/** @type {import('next').NextConfig} */

// Content-Security-Policy. Scoped to exactly what the app loads:
// - scripts/styles are same-origin; Next injects inline hydration + next/font
//   inline styles, and there's no nonce middleware, so 'unsafe-inline' is
//   required (it still blocks *external* script origins — the main XSS win).
// - connect-src MUST include the ESPN feed (live scores/odds) and the league
//   Worker, or those features break. img-src covers Google avatars + next/image.
// 'unsafe-eval' is needed ONLY by the dev server (React Refresh / HMR). Production
// (next start / Vercel) never needs it, so it's excluded from real deploys.
const scriptSrc = process.env.NODE_ENV === "development" ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'";

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self' https://site.api.espn.com https://cws-map-leagues.tyler-696.workers.dev",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  // The legacy app lives in /public/legacy/. Next serves it as static assets;
  // the root page mounts it via next/script. No transforms needed.
  reactStrictMode: true,
  async headers() {
    return [
      // Security headers on every route.
      { source: "/(.*)", headers: securityHeaders },
      // Long-cache for the static legacy bundle (data.js refreshes nightly via a
      // separate commit, which Vercel auto-deploys, so the URL changes implicitly).
      {
        source: "/legacy/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
