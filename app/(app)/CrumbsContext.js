"use client";

import { createContext, useContext } from "react";

/** Views declare their breadcrumb trail + back target via useCrumbs().set(...). */
export const CrumbsContext = createContext({ crumbs: [], back: null, set: () => {} });

export function useCrumbs() {
  return useContext(CrumbsContext);
}
