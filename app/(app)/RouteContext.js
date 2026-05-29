"use client";

import { createContext, useContext } from "react";

/** Exposes the active hash route { hash, parts, prevHash, navigate, back }. */
export const RouteContext = createContext(null);

export function useRoute() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error("useRoute must be used within AppShell");
  return ctx;
}
