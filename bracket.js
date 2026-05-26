/* =============================================================================
   Double-elimination bracket resolver — pure logic, no DOM.
   Loaded by index.html (sets window.resolveBracket) AND unit-tested in Node
   (scripts/test-bracket.mjs loads this file in a vm sandbox).

   A regional is 4 teams, double elimination:
     G1: seed1 vs seed4   G2: seed2 vs seed3            (Fri)
     G3: loser G1 vs loser G2   (elim)                  (Sat)
     G4: winner G1 vs winner G2                         (Sat)
     G5: winner G3 vs loser G4  (elim)                  (Sun)
     G6: winner G4 vs winner G5                         (Sun)
     G7: rematch of G6, ONLY if the G5-side team wins G6 (Mon, "if necessary")
   Champion = winner(G6) if that's the G4 winner (still undefeated), else winner(G7).

   resolveBracket(teams, games):
     teams  = [id1,id2,id3,id4] in regional-seed order (seed = index+1)
     games  = [{ id, state:'pre'|'in'|'post', detail, date, comps:[{id,score,winner}] }, ...]
              (order doesn't matter — sorted here by date; only finals advance the bracket)
   returns { slots:[g1..g7], champion } where each slot is
     { g, teams:[a,b]|null, seeds:[sa,sb]|null, event|null, state, determined, necessary }
   Honesty: a team only "advances" from a game with state === 'post'.
   ============================================================================ */
(function (root) {
  function byDate(a, b) {
    var ta = Date.parse(a && a.date) || 0, tb = Date.parse(b && b.date) || 0;
    return ta - tb;
  }
  function hasBoth(g, aId, bId) {
    if (!g || !g.comps) return false;
    var ids = g.comps.map(function (c) { return c.id; });
    return ids.indexOf(aId) >= 0 && ids.indexOf(bId) >= 0;
  }
  function winnerId(g) {
    if (!g || g.state !== "post" || !g.comps) return null;
    var w = g.comps.find(function (c) { return c.winner; });
    if (w) return w.id;
    var a = g.comps[0], b = g.comps[1];
    if (a && b && a.score != null && b.score != null && a.score !== b.score)
      return a.score > b.score ? a.id : b.id;
    return null; // not decided / can't tell — do not guess
  }
  function otherId(g, id) {
    var o = (g.comps || []).find(function (c) { return c.id !== id; });
    return o ? o.id : null;
  }

  function resolveBracket(teams, games) {
    teams = teams || [];
    var sorted = (games || []).slice().sort(byDate);
    var used = new Set();
    var seedOf = function (id) { var i = teams.indexOf(id); return i < 0 ? null : i + 1; };

    function findEvent(aId, bId) {
      if (!aId || !bId) return null;
      for (var i = 0; i < sorted.length; i++) {
        var g = sorted[i];
        if (!used.has(g) && hasBoth(g, aId, bId)) { used.add(g); return g; }
      }
      return null;
    }
    // a slot whose two teams are known (determined); finds its event if played
    function slot(g, aId, bId, opts) {
      opts = opts || {};
      var determined = !!(aId && bId);
      var ev = determined && opts.necessary !== false ? findEvent(aId, bId) : null;
      return {
        g: g,
        teams: determined ? [aId, bId] : null,
        seeds: determined ? [seedOf(aId), seedOf(bId)] : null,
        event: ev,
        state: ev ? ev.state : (determined ? "scheduled" : "tbd"),
        determined: determined,
        necessary: opts.necessary !== false,
      };
    }

    var s1 = slot(1, teams[0], teams[3]);
    var s2 = slot(2, teams[1], teams[2]);
    var w1 = winnerId(s1.event), l1 = w1 ? otherId(s1.event, w1) : null;
    var w2 = winnerId(s2.event), l2 = w2 ? otherId(s2.event, w2) : null;

    var s3 = slot(3, l1, l2);                 // elimination
    var s4 = slot(4, w1, w2);
    var w3 = winnerId(s3.event);
    var w4 = winnerId(s4.event), l4 = w4 ? otherId(s4.event, w4) : null;

    var s5 = slot(5, w3, l4);                 // elimination
    var w5 = winnerId(s5.event);

    var s6 = slot(6, w4, w5);
    var w6 = winnerId(s6.event);

    // G7 only happens if the elimination-bracket team (w5) beat the unbeaten (w4) in G6.
    var g7Necessary = !!(w6 && w5 && w6 === w5);
    var s7 = slot(7, w4 && w5 ? w4 : null, w4 && w5 ? w5 : null, { necessary: g7Necessary });
    var w7 = winnerId(s7.event);

    var champion = null;
    if (w6 && w4 && w6 === w4) champion = w4;        // G4 winner ran the table
    else if (g7Necessary && w7) champion = w7;        // decider game

    return { slots: [s1, s2, s3, s4, s5, s6, s7], champion: champion };
  }

  root.resolveBracket = resolveBracket;
  if (typeof module !== "undefined" && module.exports) module.exports = { resolveBracket: resolveBracket };
})(typeof window !== "undefined" ? window : globalThis);
