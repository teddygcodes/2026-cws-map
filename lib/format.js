/* =============================================================================
   Formatting + the honesty gate. Pure, no DOM. `isMissing` is the single source
   of truth for "this value is not verified" — null / "" / "TODO*". Components
   render a visible TBD badge (<Tbd>) for missing values; they never fabricate.
   ============================================================================= */

export function isMissing(v) {
  return v === null || v === undefined || v === "" || /^TODO/i.test(String(v));
}

/** "w–l" or null (caller renders TBD when null). */
export function formatRecord(r) {
  if (r && r.w != null && r.l != null) return r.w + "–" + r.l;
  return null;
}

/** Win pct from a {w,l} record, or null. */
export function recordPct(r) {
  return r && r.w != null && r.l != null && r.w + r.l > 0 ? r.w / (r.w + r.l) : null;
}

export function roundLabel(round) {
  return round === "super-regional" ? "Super Regional" : "Regional";
}

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** ESPN date string (YYYYMMDD) → "Sat, May 30". */
export function dateLabel(s) {
  const y = +s.slice(0, 4);
  const m = +s.slice(4, 6) - 1;
  const d = +s.slice(6, 8);
  return new Date(y, m, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function ymd(d) {
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}

/** First-pitch time from epoch ms → "Fri, 6:00 PM" (local). */
export function fmtGameTime(ms) {
  if (!ms) return "Time TBD";
  try {
    return new Date(ms).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  } catch (e) {
    return "Time TBD";
  }
}

export function timeAgo(dt, now) {
  const s = Math.round(((now == null ? Date.now() : now) - dt.getTime()) / 1000);
  return s < 10 ? "just now" : s < 60 ? s + "s ago" : Math.round(s / 60) + "m ago";
}

/** Implied win probability from an American moneyline (e.g. -180 → 0.643). */
export function impliedProbFromMoneyline(ml) {
  if (ml == null) return null;
  const n = typeof ml === "number" ? ml : parseInt(String(ml).replace(/[^0-9+-]/g, ""), 10);
  if (!isFinite(n) || n === 0) return null;
  return n < 0 ? -n / (-n + 100) : 100 / (n + 100);
}

/**
 * Honest season narrative built ONLY from verified fields (record / RPI / seed /
 * conference / rate stats). Invents nothing; clauses are omitted when a value is
 * missing rather than printing a TBD mid-sentence. Returns a plain string.
 */
export function seasonSummary(t, site, round) {
  const ss = t.stats || {};
  const out = [];
  const rec = t.record && t.record.w != null && t.record.l != null ? t.record.w + "–" + t.record.l : null;
  let lead = t.name + (rec ? " went " + rec : " enters the 2026 NCAA Tournament");
  if (t.rpi != null) lead += " with a No. " + t.rpi + " RPI";
  lead += " out of the " + t.conference;
  if (site) {
    lead +=
      t.seed != null
        ? ", earning the national No. " + t.seed + " overall seed and hosting the " + site.city + " " + roundLabel(round) + "."
        : ", reaching the " + site.city + " " + roundLabel(round) + ".";
  } else lead += ".";
  out.push(lead);
  const off = [];
  if (ss.runs != null) off.push(ss.runs + " runs");
  if (ss.battingAvg != null) off.push("a " + ss.battingAvg + " team average");
  if (off.length) out.push("The offense produced " + off.join(" at ") + ".");
  const d = [];
  if (ss.era != null) d.push("a " + ss.era + " ERA");
  if (ss.runsAllowed != null) d.push(ss.runsAllowed + " runs allowed");
  if (ss.sos != null) d.push("a No. " + ss.sos + " strength of schedule");
  if (d.length) out.push("On the other side of the ball: " + d.join(", ") + ".");
  return out.join(" ");
}
