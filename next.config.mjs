/** @type {import('next').NextConfig} */
const nextConfig = {
  // The legacy app lives in /public/legacy/. Next serves it as static assets;
  // the root page mounts it via next/script. No transforms needed.
  reactStrictMode: true,
  // Long-cache for the static legacy bundle (data.js refreshes nightly via a
  // separate commit, which Vercel auto-deploys, so the URL changes implicitly).
  async headers() {
    return [
      {
        source: "/legacy/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
