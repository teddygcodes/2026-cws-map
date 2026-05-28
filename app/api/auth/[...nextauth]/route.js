// Auth.js v5 mounts its sign-in / callback / session endpoints at this
// catch-all route. All provider redirects (Google) land on
// /api/auth/callback/google; the email magic-link verification lands on
// /api/auth/callback/resend.
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
