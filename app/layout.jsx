// Root layout. Auth chrome + session wiring live inside <LegacyApp> (rendered
// by app/page.jsx) so the sign-in control sits in the app's masthead rather
// than floating over the page.
export const metadata = {
  title: "2026 NCAA Baseball Tournament — Interactive Map",
  description:
    "Live map, double-elimination brackets, head-to-head matchups, daily pick'em, and private leagues for the 2026 NCAA Division I Baseball Tournament.",
  metadataBase: new URL(process.env.AUTH_URL || "https://swishtd.com"),
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/legacy/app.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
