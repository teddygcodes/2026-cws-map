/* =============================================================================
   Pure schedule / day helpers — no DOM, no window, Node-testable. Shared by the
   Schedule view (day tabs, ordering) and the Home cold-open countdown. Times are
   the real published ET (EDT, UTC−4) start times; nothing here invents a value.
   ============================================================================= */

/** Game number from a stable game key ("athens_G3" → 3, "super-1_G2" → 2). */
export function gameNum(key) {
  const m = String(key || "").match(/_G(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

/** "12:00 PM" → minutes-since-midnight (720); null if unparseable. */
export function parseClockToMins(str) {
  const m = String(str || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h * 60 + parseInt(m[2], 10);
}

/**
 * First pitch (epoch ms) = the earliest published start time across SCHEDULES on
 * the opening Friday. Returns null if no time parses, so callers can stay honest.
 */
export function firstPitchMs(SCHEDULES, isoDay = "2026-05-29", etOffset = "-04:00") {
  let best = null;
  Object.values(SCHEDULES || {}).forEach((list) =>
    (list || []).forEach((g) => {
      const mins = parseClockToMins(g && g.time);
      if (mins != null && (best == null || mins < best)) best = mins;
    })
  );
  if (best == null) return null;
  const hh = String(Math.floor(best / 60)).padStart(2, "0");
  const mm = String(best % 60).padStart(2, "0");
  const t = Date.parse(`${isoDay}T${hh}:${mm}:00${etOffset}`);
  return isFinite(t) ? t : null;
}

/**
 * Which day tab to show by default: today's day if present, else the most recent
 * past day (so you land on the last day with results), else the first day.
 * `days` are objects with `{ key, dateMs }`; pass midnight-today and now as ms.
 */
export function defaultDayKey(days, todayMs, nowMs) {
  if (!days || !days.length) return null;
  const exact = days.find((d) => d.dateMs === todayMs);
  if (exact) return exact.key;
  let last = null;
  days.forEach((d) => {
    if (d.dateMs != null && d.dateMs <= nowMs) last = d;
  });
  return (last || days[0]).key;
}
