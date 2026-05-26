/* Regional schedules — 2026 NCAA Baseball Tournament.
   Friday May 29 games (matchups, start times, TV) are REAL, as published at the
   bracket reveal (source: 247Sports / ESPN tournament schedule, 2026-05-25).
   Times are ET as published. Games 3-7 are the standard double-elimination
   structure (winners advance, two losses eliminate) — their matchups depend on
   results and exact start times are set day-of, so the app renders them as TBD.

   Shape: SCHEDULES[siteId] = [ day-1 games ], each { g, time, tv, a:[teamId,seed], b:[teamId,seed] }.
   Team display names are looked up from TOURNAMENT at render time.

   SUPER_REGIONAL_UPGRADE: replace with the 8 super-regional schedules (best-of-3,
   typically Sat/Sun + Mon if-necessary). The regional renderer reads from here. */
const SCHEDULES = {
  "los-angeles":     [ { g:1, time:"3:00 PM", tv:"ESPNU",       a:["ucla",1],            b:["saint-marys",4] },
                       { g:2, time:"8:00 PM", tv:"ESPN+",       a:["virginia-tech",2],   b:["cal-poly",3] } ],
  "atlanta":         [ { g:1, time:"12:00 PM", tv:"ACC Network", a:["georgia-tech",1],   b:["uic",4] },
                       { g:2, time:"5:00 PM", tv:"ESPN+",        a:["oklahoma",2],       b:["the-citadel",3] } ],
  "athens":          [ { g:1, time:"2:00 PM", tv:"ESPN+",        a:["boston-college",2], b:["liberty",3] },
                       { g:2, time:"7:00 PM", tv:"SEC Network",  a:["georgia",1],        b:["long-island",4] } ],
  "auburn":          [ { g:1, time:"1:00 PM", tv:"ESPN+",        a:["auburn",1],         b:["milwaukee",4] },
                       { g:2, time:"6:00 PM", tv:"ESPNU",        a:["ucf",2],            b:["nc-state",3] } ],
  "chapel-hill":     [ { g:1, time:"12:00 PM", tv:"ESPNU",       a:["tennessee",2],      b:["east-carolina",3] },
                       { g:2, time:"5:00 PM", tv:"ESPN+",        a:["north-carolina",1], b:["vcu",4] } ],
  "austin":          [ { g:1, time:"1:00 PM", tv:"SEC Network",  a:["texas",1],          b:["holy-cross",4] },
                       { g:2, time:"6:00 PM", tv:"ESPN+",        a:["uc-santa-barbara",2], b:["tarleton-state",3] } ],
  "tuscaloosa":      [ { g:1, time:"2:00 PM", tv:"ESPN+",        a:["oklahoma-state",2], b:["sc-upstate",3] },
                       { g:2, time:"7:00 PM", tv:"ESPN+",        a:["alabama",1],        b:["alabama-state",4] } ],
  "gainesville":     [ { g:1, time:"1:00 PM", tv:"ESPN+",        a:["florida",1],        b:["rider",4] },
                       { g:2, time:"6:00 PM", tv:"ACC Network",  a:["miami",2],          b:["troy",3] } ],
  "hattiesburg":     [ { g:1, time:"2:00 PM", tv:"ESPN+",        a:["southern-miss",1],  b:["little-rock",4] },
                       { g:2, time:"7:00 PM", tv:"ESPN+",        a:["virginia",2],       b:["jacksonville-state",3] } ],
  "tallahassee":     [ { g:1, time:"3:00 PM", tv:"ACC Network",  a:["florida-state",1],  b:["st-johns",4] },
                       { g:2, time:"8:00 PM", tv:"ESPN+",        a:["coastal-carolina",2], b:["northern-illinois",3] } ],
  "eugene":          [ { g:1, time:"3:00 PM", tv:"ESPN+",        a:["oregon-state",2],   b:["washington-state",3] },
                       { g:2, time:"8:00 PM", tv:"ESPN+",        a:["oregon",1],         b:["yale",4] } ],
  "college-station": [ { g:1, time:"4:00 PM", tv:"SEC Network",  a:["texas-am",1],       b:["lamar",4] },
                       { g:2, time:"9:00 PM", tv:"ESPN+",        a:["usc",2],            b:["texas-state",3] } ],
  "lincoln":         [ { g:1, time:"4:00 PM", tv:"ESPN+",        a:["nebraska",1],       b:["south-dakota-state",4] },
                       { g:2, time:"9:00 PM", tv:"ESPN2",        a:["ole-miss",2],       b:["arizona-state",3] } ],
  "starkville":      [ { g:1, time:"2:00 PM", tv:"ESPN+",        a:["mississippi-state",1], b:["lipscomb",4] },
                       { g:2, time:"7:00 PM", tv:"ESPN+",        a:["cincinnati",2],     b:["louisiana",3] } ],
  "lawrence":        [ { g:1, time:"1:00 PM", tv:"ESPN+",        a:["kansas",1],         b:["northeastern",4] },
                       { g:2, time:"6:00 PM", tv:"ESPN+",        a:["arkansas",2],       b:["missouri-state",3] } ],
  "morgantown":      [ { g:1, time:"12:00 PM", tv:"ESPN2",       a:["wake-forest",2],    b:["kentucky",3] },
                       { g:2, time:"5:00 PM", tv:"ESPN+",        a:["west-virginia",1],  b:["binghamton",4] } ],
};
if (typeof window !== "undefined") window.SCHEDULES = SCHEDULES;
