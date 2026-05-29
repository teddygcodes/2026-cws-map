"use client";

import { useCountUp } from "../hooks/useCountUp";

/** Renders a number that rolls up to its value on change (reduced-motion safe).
    Renders the `blank` placeholder when value is null/undefined. */
export default function CountUp({ value, className, blank = "" }) {
  const n = useCountUp(typeof value === "number" ? value : null);
  return <span className={className}>{value == null ? blank : n}</span>;
}
