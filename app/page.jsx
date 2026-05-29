import { auth } from "@/auth";
import AppShell from "./(app)/AppShell";

// Resolve the session server-side and hand it to the client app (AppShell),
// which owns hash routing + the provider stack.
export default async function Page() {
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    // No DB / env yet — render anonymously. The app works fully signed-out.
    if (process.env.NODE_ENV !== "production") console.warn("[auth] unavailable:", e?.message);
  }
  return <AppShell session={session} />;
}
