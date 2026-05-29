/* =============================================================================
   Bracket Challenge pick'em — pure model, encoding, and scoring. No DOM/window.
   The snapshot captures the ORIGINAL 16-site / 4-team structure (taken before
   the super-regional flip) so codes stay stable and regional picks keep scoring.

   Code format (v1, 26 chars, digits only):
     "1" + 16 regional digits (team index 0-3, 4=none, in national-seed order)
         +  8 super digits (0|1 = which side, 2=none)
         +  1 champion digit (seed-1, i.e. 0-7; 8=none).
   ============================================================================= */

export const REG_SEED = [1, 4, 2, 3]; // regional seed by team-array index (data.js order)

export function emptyPicks() {
  return { v: 1, reg: {}, sup: {}, cwsChamp: null };
}

/** Snapshot the original 16-site structure. teams(id) → team object. */
export function snapshotPickSites(sites, teamsMap) {
  const snap = { sites: [], bySeed: {}, byId: {} };
  snap.sites = sites.map((s) => ({
    id: s.id,
    city: s.city,
    hostTeamId: s.hostTeamId,
    seed: teamsMap[s.hostTeamId].seed,
    teams: s.teams.slice(),
  }));
  snap.sites.forEach((s) => {
    snap.byId[s.id] = s;
    if (s.seed != null) snap.bySeed[s.seed] = s;
  });
  return snap;
}

export function regOf(p, sd, snap) {
  const s = snap.bySeed[sd];
  return s ? p.reg[s.id] || null : null;
}
export function supersFor(p, snap) {
  const out = [];
  for (let sd = 1; sd <= 8; sd++) out.push({ seed: sd, teams: [regOf(p, sd, snap), regOf(p, 17 - sd, snap)] });
  return out;
}
export function supWinnerFor(p, sd, snap) {
  const sv = p.sup[sd];
  if (sv !== 0 && sv !== 1) return null;
  return supersFor(p, snap)[sd - 1].teams[sv] || null;
}
export function champFor(p, snap) {
  return p.cwsChamp == null ? null : supWinnerFor(p, p.cwsChamp, snap);
}

export function encodePicks(p, snap) {
  p = p || emptyPicks();
  let out = "1";
  for (let sd = 1; sd <= 16; sd++) {
    const st = snap.bySeed[sd];
    const pk = st ? p.reg[st.id] : null;
    const i = st && pk != null ? st.teams.indexOf(pk) : -1;
    out += i >= 0 ? i : 4;
  }
  for (let s2 = 1; s2 <= 8; s2++) {
    const sv = p.sup[s2];
    out += sv === 0 || sv === 1 ? sv : 2;
  }
  out += p.cwsChamp >= 1 && p.cwsChamp <= 8 ? p.cwsChamp - 1 : 8;
  return out;
}

export function decodePicks(code, snap) {
  if (typeof code !== "string" || code.length !== 26 || code.charAt(0) !== "1" || !/^[0-9]{26}$/.test(code)) return null;
  const p = emptyPicks();
  let i;
  for (i = 0; i < 16; i++) {
    const d = +code.charAt(1 + i);
    if (d > 4) return null;
    const st = snap.bySeed[i + 1];
    if (d < 4 && st && st.teams[d]) p.reg[st.id] = st.teams[d];
  }
  for (i = 0; i < 8; i++) {
    const sv = +code.charAt(17 + i);
    if (sv > 2) return null;
    if (sv < 2) p.sup[i + 1] = sv;
  }
  const cd = +code.charAt(25);
  if (cd > 8) return null;
  if (cd < 8) p.cwsChamp = cd + 1;
  return p;
}

/** Drop super/champion picks whose feeder regional picks no longer exist. Pure. */
export function cleanupPicks(p, snap) {
  const next = { v: 1, reg: { ...p.reg }, sup: { ...p.sup }, cwsChamp: p.cwsChamp };
  for (let sd = 1; sd <= 8; sd++) {
    if (next.sup[sd] != null && !supersFor(next, snap)[sd - 1].teams[next.sup[sd]]) delete next.sup[sd];
  }
  if (next.cwsChamp != null && !supWinnerFor(next, next.cwsChamp, snap)) next.cwsChamp = null;
  return next;
}

/** How many of the 25 slots are filled. */
export function pickProgress(p, snap) {
  let n = 0;
  for (let sd = 1; sd <= 16; sd++) {
    const s = snap.bySeed[sd];
    if (s && p.reg[s.id]) n++;
  }
  for (let sd = 1; sd <= 8; sd++) if (supWinnerFor(p, sd, snap)) n++;
  if (champFor(p, snap)) n++;
  return n;
}

/**
 * Score a bracket code against actual results. `results` is pure data:
 *   { regChampById: { siteId: teamId }, superWinnerBySeed: { sd: teamId } }
 * Champion stays pending (Omaha not modeled). null if the code is invalid.
 */
export function scoreBracketCode(code, snap, results) {
  const p = decodePicks(code, snap);
  if (!p) return null;
  const reg = { c: 0, d: 0 };
  const sup = { c: 0, d: 0 };
  for (let sd = 1; sd <= 16; sd++) {
    const s = snap.bySeed[sd];
    const a = s ? results.regChampById[s.id] : null;
    if (a != null) {
      reg.d++;
      if (a === regOf(p, sd, snap)) reg.c++;
    }
  }
  for (let sd = 1; sd <= 8; sd++) {
    const aw = results.superWinnerBySeed[sd];
    if (aw != null) {
      sup.d++;
      if (supWinnerFor(p, sd, snap) === aw) sup.c++;
    }
  }
  return { reg: reg.c, regDecided: reg.d, sup: sup.c, supDecided: sup.d, correct: reg.c + sup.c, decided: reg.d + sup.d };
}
