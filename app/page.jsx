import { auth } from "@/auth";
import LegacyApp from "./LegacyApp";

// Resolve the session server-side and hand it to the (client) legacy app,
// which both renders the auth control in the masthead and exposes
// window.__session for the vanilla sync shim.
export default async function Page() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    // No DB / env yet — render anonymously. The app works fully signed-out.
    if (process.env.NODE_ENV !== "production") console.warn("[auth] unavailable:", e?.message);
  }
  return <LegacyApp session={session} />;
}
