// Root layout. Loads the design-token layer + the broadcast/UI/mono fonts via
// next/font (self-hosted, no CDN, good CLS), then renders the app.
import { Anton, Inter, JetBrains_Mono } from "next/font/google";
import "./styles/tokens.css";
import "./styles/global.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", display: "swap" });

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
    <html lang="en" className={`${anton.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
