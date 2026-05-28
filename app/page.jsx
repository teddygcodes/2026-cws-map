import LegacyApp from "./LegacyApp";

// The root page mounts the legacy vanilla app (markup + IIFE + data scripts)
// inside the Next.js shell. Auth chrome lives in app/layout.jsx; this page
// is the legacy view surface.
export default function Page() {
  return <LegacyApp />;
}
