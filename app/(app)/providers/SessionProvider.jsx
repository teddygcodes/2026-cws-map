"use client";

import { createContext, useContext } from "react";

const SessionContext = createContext({ signedIn: false, user: null });

export function SessionProvider({ session, children }) {
  const value = session?.user
    ? { signedIn: true, user: { email: session.user.email, name: session.user.name, image: session.user.image } }
    : { signedIn: false, user: null };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
