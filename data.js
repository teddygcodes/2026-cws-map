/* =============================================================================
   2026 NCAA Baseball Tournament — static data
   -----------------------------------------------------------------------------
   STATS NOTE (filled 2026-05-26)
   - Team records, conferences, RPI, team rate stats (runs / runsAllowed /
     battingAvg / ERA) and SOS, plus 3-4 key players per team, were researched
     from live 2026 sources (official athletics cumulative-stat pages,
     WarrenNolan, TheBaseballCube, D1Baseball) reflecting the season as of
     2026-05-25, the day the field was announced.
   - Numbers are taken only from sources that actually published them. Any value
     that could not be verified is left null and renders as a "TBD" placeholder
     in the UI — nothing is invented. `runsAllowed` in particular is null for
     several teams whose opponent-run totals were not exposed by a source.
   - Stadium lat/lng remain best-known approximations (flagged // verify coords).
   - Stadium photos + attribution live in photos.js (images/<teamId>).

   SUPER_REGIONAL_UPGRADE (≈ June 2, 2026) — NOW AUTOMATIC
   - Regionals run May 29 – June 1; super-regional pairings depend on who wins.
   - As of Session 2 the app advances ITSELF: index.html resolves each regional's
     champion from the live ESPN feed (bracket.js) and, once all 16 finish, builds
     the 8 super-regionals in memory (#s vs #17-s, host = higher seed) and flips
     `round`. This file's `round` stays "regional"; no manual edit is required.
   - The shape is unchanged — a site's `teams` simply goes from 4 ids to 2; the
     renderer is count-agnostic.
   ========================================================================== */

const TOURNAMENT = {
  year: 2026,

  // SUPER_REGIONAL_UPGRADE: flip to "super-regional" on ~June 2.
  round: "regional",

  // SUPER_REGIONAL_UPGRADE: replace these 16 regional sites with 8 super-
  // regional sites. Keep the shape identical; teams[] just goes from 4 -> 2.
  // The host of each super regional is the higher national seed of the pairing.
  sites: [
    { id: "los-angeles", city: "Los Angeles, CA", hostTeamId: "ucla", teams: ["ucla", "virginia-tech", "cal-poly", "saint-marys"] },
    { id: "atlanta", city: "Atlanta, GA", hostTeamId: "georgia-tech", teams: ["georgia-tech", "oklahoma", "the-citadel", "uic"] },
    { id: "athens", city: "Athens, GA", hostTeamId: "georgia", teams: ["georgia", "boston-college", "liberty", "long-island"] },
    { id: "auburn", city: "Auburn, AL", hostTeamId: "auburn", teams: ["auburn", "ucf", "nc-state", "milwaukee"] },
    { id: "chapel-hill", city: "Chapel Hill, NC", hostTeamId: "north-carolina", teams: ["north-carolina", "tennessee", "east-carolina", "vcu"] },
    { id: "austin", city: "Austin, TX", hostTeamId: "texas", teams: ["texas", "uc-santa-barbara", "tarleton-state", "holy-cross"] },
    { id: "tuscaloosa", city: "Tuscaloosa, AL", hostTeamId: "alabama", teams: ["alabama", "oklahoma-state", "sc-upstate", "alabama-state"] },
    { id: "gainesville", city: "Gainesville, FL", hostTeamId: "florida", teams: ["florida", "miami", "troy", "rider"] },
    { id: "hattiesburg", city: "Hattiesburg, MS", hostTeamId: "southern-miss", teams: ["southern-miss", "virginia", "jacksonville-state", "little-rock"] },
    { id: "tallahassee", city: "Tallahassee, FL", hostTeamId: "florida-state", teams: ["florida-state", "coastal-carolina", "northern-illinois", "st-johns"] },
    { id: "eugene", city: "Eugene, OR", hostTeamId: "oregon", teams: ["oregon", "oregon-state", "washington-state", "yale"] },
    { id: "college-station", city: "College Station, TX", hostTeamId: "texas-am", teams: ["texas-am", "usc", "texas-state", "lamar"] },
    { id: "lincoln", city: "Lincoln, NE", hostTeamId: "nebraska", teams: ["nebraska", "ole-miss", "arizona-state", "south-dakota-state"] },
    { id: "starkville", city: "Starkville, MS", hostTeamId: "mississippi-state", teams: ["mississippi-state", "cincinnati", "louisiana", "lipscomb"] },
    { id: "lawrence", city: "Lawrence, KS", hostTeamId: "kansas", teams: ["kansas", "arkansas", "missouri-state", "northeastern"] },
    { id: "morgantown", city: "Morgantown, WV", hostTeamId: "west-virginia", teams: ["west-virginia", "wake-forest", "kentucky", "binghamton"] },
  ],

  /* Each team: record {w,l}, rpi (national RPI rank|null), stats {runs,
     runsAllowed, battingAvg, era, sos}, stadium {name,lat,lng,capacity,blurb},
     players [{name,pos,line}]. seed = national seed (1-16) for hosts, else null.
     Values sourced from live 2026 data; nulls are honest "not verified". */
  teams: {
    // ---- Los Angeles, CA Regional -----------------------------------------
    "ucla": {
      id: "ucla", name: "UCLA", seed: 1, conference: "Big Ten",
      record: { w: 51, l: 6 }, rpi: 1,
      stats: { runs: 463, runsAllowed: 214, battingAvg: ".294", era: 3.27, sos: 25 },
      stadium: { name: "Jackie Robinson Stadium", lat: 34.0712, lng: -118.453, capacity: 1820, // verify coords
        blurb: "Named for the UCLA alumnus who broke Major League Baseball's color barrier. Opened in 1981 in the hills above campus, it is the Bruins' home park and the national No. 1 seed's regional host site." },
      players: [
        { name: "Roch Cholowsky", pos: "SS", line: ".329, 21 HR, 59 RBI" },
        { name: "Mulivai Levu", pos: "1B", line: ".342, 17 HR, 62 RBI" },
        { name: "Will Gasparino", pos: "OF", line: ".316, 19 HR, 62 RBI" },
        { name: "Logan Reddemann", pos: "RHP", line: "8-0, 2.87 ERA, 84 K" },
      ],
    },
    "virginia-tech": {
      id: "virginia-tech", name: "Virginia Tech", seed: null, conference: "ACC",
      record: { w: 30, l: 24 }, rpi: 42,
      stats: { runs: 358, runsAllowed: 381, battingAvg: ".280", era: 6.88, sos: 14 },
      stadium: { name: "English Field at Atlantic Union Bank Park", lat: 37.216, lng: -80.418, capacity: 4000, // verify coords
        blurb: "The Hokies' home in Blacksburg, Virginia. // TODO verify history details." },
      players: [
        { name: "Ethan Ball", pos: "INF", line: ".310, 16 HR, 51 RBI" },
        { name: "Brett Renfrow", pos: "RHP", line: "5-4, 4.65 ERA, 86 K" },
      ],
    },
    "cal-poly": {
      id: "cal-poly", name: "Cal Poly", seed: null, conference: "Big West",
      record: { w: 36, l: 22 }, rpi: 73,
      stats: { runs: 379, runsAllowed: 310, battingAvg: ".304", era: 4.85, sos: 121 },
      stadium: { name: "Baggett Stadium", lat: 35.2998, lng: -120.658, capacity: 3138, // verify coords
        blurb: "Home of the Mustangs in San Luis Obispo, California. // TODO verify history details." },
      players: [
        { name: "Ryan Tayman", pos: "C", line: ".355, 16 HR, 53 RBI" },
        { name: "Alejandro Garza", pos: "INF", line: ".327, 5 HR, 47 RBI" },
        { name: "Carson Turnquist", pos: "RHP", line: "8-2, 3.50 ERA, 83 K" },
        { name: "Nick Bonn", pos: "RHP", line: "15 SV, 3.74 ERA" },
      ],
    },
    "saint-marys": {
      id: "saint-marys", name: "Saint Mary's", seed: null, conference: "WCC",
      record: { w: 34, l: 25 }, rpi: null,
      stats: { runs: 441, runsAllowed: 356, battingAvg: ".332", era: 5.62, sos: null },
      stadium: { name: "Louis Guisto Field", lat: 37.842, lng: -122.109, capacity: 1500, // verify coords
        blurb: "The Gaels' ballpark in Moraga, California. // TODO verify history details." },
      players: [
        { name: "Diego Castellanos", pos: "INF", line: ".384, 6 HR, 49 RBI" },
        { name: "Makoa Sniffen", pos: "C", line: ".358, 11 HR, 61 RBI" },
        { name: "Ian Armstrong", pos: "1B", line: ".358, 15 HR, 49 RBI" },
        { name: "John Damozonio", pos: "RHP", line: "7-2, 2.71 ERA, 81 K" },
      ],
    },
    // ---- Atlanta, GA Regional ---------------------------------------------
    "georgia-tech": {
      id: "georgia-tech", name: "Georgia Tech", seed: 2, conference: "ACC",
      record: { w: 48, l: 9 }, rpi: 2,
      stats: { runs: 616, runsAllowed: 274, battingAvg: ".358", era: 4.66, sos: 15 },
      stadium: { name: "Russ Chandler Stadium", lat: 33.7768, lng: -84.3925, capacity: 4157, // verify coords
        blurb: "Opened in 2002 on the Atlanta campus, it replaced the historic Rose Bowl Field. A frequent NCAA regional host and home of the Yellow Jackets." },
      players: [
        { name: "Jarren Advincula", pos: "INF", line: ".431, 9 HR, 63 RBI" },
        { name: "Vahn Lackey", pos: "C", line: ".410, 18 HR, 72 RBI" },
        { name: "Drew Burress", pos: "OF", line: ".362, 13 HR" },
        { name: "Jackson Blakely", pos: "RHP", line: "8-1, 2.79 ERA, 64 K" },
      ],
    },
    "oklahoma": {
      id: "oklahoma", name: "Oklahoma", seed: null, conference: "SEC",
      record: { w: 32, l: 21 }, rpi: 24,
      stats: { runs: 351, runsAllowed: 297, battingAvg: ".280", era: 5.33, sos: 6 },
      stadium: { name: "L. Dale Mitchell Park", lat: 35.201, lng: -97.442, capacity: 3180, // verify coords
        blurb: "Home of the Sooners in Norman, Oklahoma. // TODO verify history details." },
      players: [
        { name: "Deiten Lachance", pos: "C", line: ".335, 12 HR, 51 RBI" },
        { name: "Camden Johnson", pos: "INF", line: ".323, 8 HR, 43 RBI" },
        { name: "Cameron Johnson", pos: "RHP", line: "6-1, 4.02 ERA, 72 K" },
        { name: "Jackson Cleveland", pos: "RHP", line: "8 SV, 5.64 ERA" },
      ],
    },
    "the-citadel": {
      id: "the-citadel", name: "The Citadel", seed: null, conference: "SoCon",
      record: { w: 35, l: 24 }, rpi: 41,
      stats: { runs: 385, runsAllowed: 302, battingAvg: ".275", era: 4.7, sos: 54 },
      stadium: { name: "Joseph P. Riley Jr. Park", lat: 32.798, lng: -79.961, capacity: 6000, // verify coords
        blurb: "The Bulldogs play at 'The Joe' in Charleston, South Carolina. // TODO verify history details." },
      players: [
        { name: "Michael Gibson", pos: "1B", line: ".394, 5 HR, 40 RBI" },
        { name: "Christian Stratis", pos: "OF", line: ".342, 4 HR, 41 RBI" },
        { name: "Will Holmes", pos: "RHP", line: "7-4, 4.38 ERA, 112 K" },
        { name: "Michael Gibson", pos: "RHP", line: "10 SV, 4.84 ERA" },
      ],
    },
    "uic": {
      id: "uic", name: "UIC", seed: null, conference: "Missouri Valley",
      record: { w: 27, l: 27 }, rpi: 227,
      stats: { runs: 343, runsAllowed: 337, battingAvg: ".274", era: 5.84, sos: 274 },
      stadium: { name: "Les Miller Field at Curtis Granderson Stadium", lat: 41.865, lng: -87.673, capacity: 2000, // verify coords
        blurb: "The Flames' home in Chicago, named in part for alumnus Curtis Granderson. // TODO verify history details." },
      players: [
        { name: "Ashton Kampa", pos: "OF", line: ".367, 16 HR, 47 RBI" },
        { name: "Thomas Curry", pos: "C", line: ".317, 13 HR, 53 RBI" },
        { name: "Jake Busson", pos: "2B", line: ".273, 18 HR, 52 RBI" },
        { name: "Mason Lei", pos: "RHP", line: "8-4, 3.47 ERA, 85 K" },
      ],
    },
    // ---- Athens, GA Regional ----------------------------------------------
    "georgia": {
      id: "georgia", name: "Georgia", seed: 3, conference: "SEC",
      record: { w: 46, l: 12 }, rpi: 7,
      stats: { runs: 509, runsAllowed: 291, battingAvg: ".329", era: 4.96, sos: 24 },
      stadium: { name: "Foley Field", lat: 33.942, lng: -83.3739, capacity: 3291, // verify coords
        blurb: "Opened in 1990 and named for longtime coach Jim Foley, it is the Bulldogs' home in Athens and a regular postseason host." },
      players: [
        { name: "Daniel Jackson", pos: "OF", line: ".391, 27 HR, 79 RBI" },
        { name: "Tre Phelps", pos: "OF", line: ".376, 18 HR, 55 RBI" },
        { name: "Kolby Branch", pos: "INF", line: ".302, 17 HR, 53 RBI" },
        { name: "Joey Volchko", pos: "RHP", line: "9-2, 4.18 ERA, 88 K" },
      ],
    },
    "boston-college": {
      id: "boston-college", name: "Boston College", seed: null, conference: "ACC",
      record: { w: 36, l: 21 }, rpi: 34,
      stats: { runs: 382, runsAllowed: 294, battingAvg: ".275", era: 4.86, sos: 52 },
      stadium: { name: "Harrington Athletics Village", lat: 42.337, lng: -71.167, capacity: 1000, // verify coords
        blurb: "The Eagles' home in Chestnut Hill, Massachusetts. // TODO verify history details." },
      players: [
        { name: "Julio Solier", pos: "INF", line: ".357, 1 HR, 31 RBI" },
        { name: "Nick Wang", pos: "1B", line: ".303, 16 HR, 61 RBI" },
        { name: "Ty Mainolfi", pos: "INF", line: ".320, 1 HR, 47 RBI" },
        { name: "A.J. Colarusso", pos: "RHP", line: "5-4, 4.62 ERA, 71 K" },
      ],
    },
    "liberty": {
      id: "liberty", name: "Liberty", seed: null, conference: "Conference USA",
      record: { w: 41, l: 19 }, rpi: 32,
      stats: { runs: 386, runsAllowed: 305, battingAvg: ".272", era: 4.74, sos: 64 },
      stadium: { name: "Liberty Baseball Stadium", lat: 37.35, lng: -79.175, capacity: 4000, // verify coords
        blurb: "Home of the Flames in Lynchburg, Virginia. // TODO verify history details." },
      players: [
        { name: "Tanner Marsh", pos: "INF", line: ".333, 5 HR, 44 RBI" },
        { name: "Nick Barone", pos: "OF", line: ".320, 12 HR, 55 RBI" },
        { name: "Josh Campos", pos: "INF", line: ".266, 11 HR, 50 RBI" },
        { name: "Ben Blair", pos: "RHP", line: "7-5, 3.61 ERA, 106 K" },
        { name: "Cooper Harrington", pos: "RHP", line: "13 SV, 3.80 ERA" },
      ],
    },
    "long-island": {
      id: "long-island", name: "Long Island", seed: null, conference: "Northeast Conference",
      record: { w: 30, l: 20 }, rpi: 199,
      stats: { runs: 453, runsAllowed: 343, battingAvg: ".301", era: 6.72, sos: 297 },
      stadium: { name: "LIU Baseball Stadium", lat: 40.734, lng: -73.594, capacity: 1000, // verify coords
        blurb: "The Sharks' home on Long Island, New York. // TODO verify history details." },
      players: [
        { name: "Nick Matson", pos: "INF", line: ".364, 3 HR, 43 RBI" },
        { name: "Elijah Fairchild", pos: "OF", line: ".357, 3 HR, 46 RBI" },
        { name: "Ryan Rivera", pos: "INF", line: ".351, 7 HR, 47 RBI" },
        { name: "Nicholas Finarelli", pos: "RHP", line: "9-2, 4.96 ERA, 91 K" },
      ],
    },
    // ---- Auburn, AL Regional ----------------------------------------------
    "auburn": {
      id: "auburn", name: "Auburn", seed: 4, conference: "SEC",
      record: { w: 38, l: 19 }, rpi: 3,
      stats: { runs: 387, runsAllowed: 212, battingAvg: ".297", era: 3.47, sos: 1 },
      stadium: { name: "Plainsman Park", lat: 32.5935, lng: -85.4858, capacity: 4096, // verify coords
        blurb: "One of the most picturesque parks in college baseball, with its hand-operated scoreboard and brick facade. The Tigers' home in Auburn, Alabama." },
      players: [
        { name: "Eric Guevara", pos: "INF", line: ".335, 12 HR, 49 RBI" },
        { name: "Chase Fralick", pos: "OF", line: ".311, 14 HR, 45 RBI" },
        { name: "Bub Terrell", pos: "INF", line: ".303, 16 HR, 43 RBI" },
        { name: "Jake Marciano", pos: "RHP", line: "5-2, 2.64 ERA, 100 K" },
        { name: "Alex Petrovic", pos: "RHP", line: "9-2, 3.21 ERA, 81 K" },
      ],
    },
    "ucf": {
      id: "ucf", name: "UCF", seed: null, conference: "Big 12",
      record: { w: 31, l: 21 }, rpi: 36,
      stats: { runs: 361, runsAllowed: 249, battingAvg: ".292", era: 4.37, sos: 21 },
      stadium: { name: "John Euliano Park", lat: 28.605, lng: -81.197, capacity: 3841, // verify coords
        blurb: "Home of the Knights in Orlando, Florida. // TODO verify history details." },
      players: [
        { name: "Zak Skinner", pos: "C", line: ".365, 5 HR, 39 RBI" },
        { name: "John Smith III", pos: "OF", line: ".328, 12 HR, 49 RBI" },
        { name: "Javier Crespo", pos: "3B", line: ".335, 5 HR, 26 RBI" },
        { name: "Camden Wicker", pos: "RHP", line: "5-3, 4.00 ERA, 61 K" },
        { name: "Kris Sosnowski", pos: "RHP", line: "1-0, 2.10 ERA (closer)" },
      ],
    },
    "nc-state": {
      id: "nc-state", name: "NC State", seed: null, conference: "ACC",
      record: { w: 32, l: 22 }, rpi: 51,
      stats: { runs: 441, runsAllowed: 322, battingAvg: ".307", era: 5.63, sos: 34 },
      stadium: { name: "Doak Field at Dail Park", lat: 35.79, lng: -78.72, capacity: 3000, // verify coords
        blurb: "The Wolfpack's home in Raleigh, North Carolina. // TODO verify history details." },
      players: [
        { name: "Rett Johnson", pos: "INF", line: ".392, 1 HR, 31 RBI" },
        { name: "Luke Nixon", pos: "INF", line: ".361, 9 HR, 44 RBI" },
        { name: "Ty Head", pos: "INF", line: ".294, 14 HR, 48 RBI" },
        { name: "Ryan Marohn", pos: "LHP", line: "6-1, 3.18 ERA, 62 K" },
        { name: "Jacob Dudan", pos: "RHP", line: "4-1, 3.60 ERA, 62 K" },
      ],
    },
    "milwaukee": {
      id: "milwaukee", name: "Milwaukee", seed: null, conference: "Horizon League",
      record: { w: 25, l: 31 }, rpi: 238,
      stats: { runs: 369, runsAllowed: 437, battingAvg: ".275", era: 7.01, sos: 278 },
      stadium: { name: "Henry Aaron Field", lat: 43.079, lng: -87.881, capacity: 1000, // verify coords
        blurb: "The Panthers' home in Milwaukee, Wisconsin. // TODO verify history details." },
      players: [
        { name: "Dylan O'Connell", pos: "OF", line: ".338, 8 HR, 42 RBI" },
        { name: "Dominic Kibler", pos: "C", line: ".317, 11 HR, 59 RBI" },
        { name: "Charlie Marion", pos: "INF", line: ".310, 12 HR, 54 RBI" },
        { name: "Camden Kuhnke", pos: "RHP", line: "6 SV, 3.38 ERA, 33 K" },
      ],
    },
    // ---- Chapel Hill, NC Regional -----------------------------------------
    "north-carolina": {
      id: "north-carolina", name: "North Carolina", seed: 5, conference: "ACC",
      record: { w: 45, l: 11 }, rpi: 4,
      stats: { runs: 450, runsAllowed: null, battingAvg: ".290", era: 3.71, sos: 13 },
      stadium: { name: "Boshamer Stadium", lat: 35.9047, lng: -79.0476, capacity: 5000, // verify coords
        blurb: "Named for benefactor Cary Boshamer, the Tar Heels' Chapel Hill ballpark was extensively rebuilt in 2009 and regularly hosts NCAA regionals." },
      players: [
        { name: "Owen Hull", pos: "INF", line: ".370, 6 HR, 67 RBI" },
        { name: "Cooper Nicholson", pos: "INF", line: ".273, 14 HR, 44 RBI" },
        { name: "Macon Winslow", pos: "OF", line: ".307, 9 HR, 51 RBI" },
        { name: "Jason DeCaro", pos: "RHP", line: "2-2, 2.03 ERA, 69 K" },
      ],
    },
    "tennessee": {
      id: "tennessee", name: "Tennessee", seed: null, conference: "SEC",
      record: { w: 38, l: 20 }, rpi: 31,
      stats: { runs: 426, runsAllowed: null, battingAvg: ".278", era: 4.7, sos: 28 },
      stadium: { name: "Lindsey Nelson Stadium", lat: 35.951, lng: -83.927, capacity: 4283, // verify coords
        blurb: "The Volunteers' home in Knoxville, Tennessee. // TODO verify history details." },
      players: [
        { name: "Henry Ford", pos: "3B", line: ".300, 19 HR, 56 RBI" },
        { name: "Garrett Wright", pos: "CF", line: ".346, 9 HR, 30 RBI" },
        { name: "Reese Chapman", pos: "RF", line: ".315, 10 HR, 44 RBI" },
        { name: "Tegan Kuhns", pos: "RHP", line: "5-4, 3.39 ERA, 100 K" },
      ],
    },
    "east-carolina": {
      id: "east-carolina", name: "East Carolina", seed: null, conference: "American",
      record: { w: 33, l: 21 }, rpi: 45,
      stats: { runs: 424, runsAllowed: null, battingAvg: ".297", era: 4.29, sos: null },
      stadium: { name: "Lewis Field at Clark-LeClair Stadium", lat: 35.601, lng: -77.366, capacity: 6000, // verify coords
        blurb: "The Pirates' home in Greenville, North Carolina. // TODO verify history details." },
      players: [
        { name: "Jack Herring", pos: "INF", line: ".358, 9 HR, 51 RBI" },
        { name: "Davin Whitaker", pos: "OF", line: ".339, 9 HR, 43 RBI" },
        { name: "Ethan Norby", pos: "LHP", line: "7-3, 4.20 ERA, 120 K" },
        { name: "Sean Jenkins", pos: "RHP", line: "6 SV, 2.61 ERA, 54 K" },
      ],
    },
    "vcu": {
      id: "vcu", name: "VCU", seed: null, conference: "Atlantic 10",
      record: { w: 37, l: 23 }, rpi: 82,
      stats: { runs: 438, runsAllowed: null, battingAvg: ".281", era: 4.45, sos: 132 },
      stadium: { name: "The Diamond", lat: 37.576, lng: -77.447, capacity: 9560, // verify coords
        blurb: "The Rams share Richmond's historic ballpark, The Diamond. // TODO verify history details." },
      players: [
        { name: "Jacob Lee", pos: "C", line: ".342, 17 HR, 56 RBI" },
        { name: "Nate Kirkpatrick", pos: "3B", line: ".308, 9 HR, 56 RBI" },
        { name: "Nick Flores", pos: "LF", line: ".322, 5 HR, 38 RBI" },
        { name: "Zachary Peters", pos: "RHP", line: "8-1, 1.60 ERA, 6 SV" },
      ],
    },
    // ---- Austin, TX Regional ----------------------------------------------
    "texas": {
      id: "texas", name: "Texas", seed: 6, conference: "SEC",
      record: { w: 40, l: 13 }, rpi: 5,
      stats: { runs: 423, runsAllowed: null, battingAvg: ".294", era: 4.17, sos: 9 },
      stadium: { name: "UFCU Disch–Falk Field", lat: 30.2858, lng: -97.719, capacity: 7373, // verify coords
        blurb: "One of college baseball's premier venues, home of the tradition-rich Longhorns in Austin. Named for former coaches Billy Disch and Bibb Falk." },
      players: [
        { name: "Carson Tinney", pos: "C", line: ".316, 20 HR, 54 RBI" },
        { name: "Aiden Robbins", pos: "CF", line: ".341, 19 HR, 53 RBI" },
        { name: "Anthony Pack Jr.", pos: "LF", line: ".353, 7 HR, 45 RBI" },
        { name: "Dylan Volantis", pos: "LHP", line: "8-1, 2.00 ERA, 109 K" },
      ],
    },
    "uc-santa-barbara": {
      id: "uc-santa-barbara", name: "UC Santa Barbara", seed: null, conference: "Big West",
      record: { w: 38, l: 18 }, rpi: 38,
      stats: { runs: 340, runsAllowed: null, battingAvg: ".274", era: 3.45, sos: 82 },
      stadium: { name: "Caesar Uyesaka Stadium", lat: 34.415, lng: -119.848, capacity: 1000, // verify coords
        blurb: "The Gauchos' home in Santa Barbara, California. // TODO verify history details." },
      players: [
        { name: "Rowan Kelly", pos: "INF", line: ".336, 3 HR, 43 RBI" },
        { name: "Will Vasseur", pos: "INF", line: ".323, 2 HR, 29 RBI" },
        { name: "Jackson Flora", pos: "RHP", line: "11-0, 1.05 ERA, 124 K" },
        { name: "Chase Hoover", pos: "RHP", line: "4 SV, 3.07 ERA, 54 K" },
      ],
    },
    "tarleton-state": {
      id: "tarleton-state", name: "Tarleton State", seed: null, conference: "WAC",
      record: { w: 37, l: 19 }, rpi: 56,
      stats: { runs: 408, runsAllowed: null, battingAvg: ".294", era: 5.59, sos: 106 },
      stadium: { name: "Cecil Ballow Baseball Complex", lat: 32.215, lng: -98.218, capacity: 1000, // verify coords
        blurb: "Home of the Texans in Stephenville, Texas. // TODO verify history details." },
      players: [
        { name: "Rayner Heinrich", pos: "INF", line: ".375, 12 HR, 62 RBI" },
        { name: "Slade McCloud", pos: "OF", line: ".356, 6 HR, 54 RBI" },
        { name: "Sergio Guerra", pos: "INF", line: ".299, 7 HR, 44 RBI" },
        { name: "Anthony Treto", pos: "RHP", line: "7 SV, 3.12 ERA, 62 K" },
      ],
    },
    "holy-cross": {
      id: "holy-cross", name: "Holy Cross", seed: null, conference: "Patriot League",
      record: { w: 25, l: 28 }, rpi: 201,
      stats: { runs: 336, runsAllowed: null, battingAvg: ".255", era: 6.42, sos: 251 },
      stadium: { name: "Hanover Insurance Park at Fitton Field", lat: 42.238, lng: -71.805, capacity: 1000, // verify coords
        blurb: "The Crusaders' home in Worcester, Massachusetts. // TODO verify history details." },
      players: [
        { name: "CJ Egrie", pos: "CF", line: ".338, 3 HR, 22 RBI" },
        { name: "Gianni Royer", pos: "OF", line: ".313, 6 HR, 28 RBI" },
        { name: "Alex Sandell", pos: "2B", line: ".276, 5 HR, 35 RBI" },
        { name: "Jaden Wywoda", pos: "RHP", line: "6-4, 3.76 ERA, 79 K" },
      ],
    },
    // ---- Tuscaloosa, AL Regional ------------------------------------------
    "alabama": {
      id: "alabama", name: "Alabama", seed: 7, conference: "SEC",
      record: { w: 37, l: 19 }, rpi: 6,
      stats: { runs: 355, runsAllowed: 278, battingAvg: ".253", era: 4.26, sos: 3 },
      stadium: { name: "Sewell–Thomas Stadium", lat: 33.2092, lng: -87.5372, capacity: 5790, // verify coords
        blurb: "Known as 'The Joe,' the Crimson Tide's Tuscaloosa park was rebuilt in 2016 and is named for former coaches Joe Sewell and Frank Thomas." },
      players: [
        { name: "Brady Neal", pos: "C", line: ".328, 8 HR, 43 RBI" },
        { name: "Justin Lebron", pos: "SS", line: ".266, 14 HR, 40 RBI" },
        { name: "Bryce Fowler", pos: "OF", line: ".316, 5 HR, 35 RBI" },
        { name: "Tyler Fay", pos: "RHP", line: "9-4, 4.70 ERA, 104 K" },
      ],
    },
    "oklahoma-state": {
      id: "oklahoma-state", name: "Oklahoma State", seed: null, conference: "Big 12",
      record: { w: 37, l: 20 }, rpi: 29,
      stats: { runs: 485, runsAllowed: 370, battingAvg: ".280", era: 6.21, sos: 48 },
      stadium: { name: "O'Brate Stadium", lat: 36.117, lng: -97.064, capacity: 8000, // verify coords
        blurb: "The Cowboys' home in Stillwater, opened in 2020. // TODO verify history details." },
      players: [
        { name: "Kollin Ritchie", pos: "OF", line: ".335, 29 HR, 73 RBI" },
        { name: "Alex Conover", pos: "INF", line: ".383, 14 HR, 36 RBI" },
        { name: "Aidan Meola", pos: "INF", line: ".320, 17 HR, 69 RBI" },
        { name: "Hudson Barrett", pos: "RHP", line: "5-1, 3.05 ERA, 54 K" },
      ],
    },
    "sc-upstate": {
      id: "sc-upstate", name: "SC Upstate", seed: null, conference: "Big South",
      record: { w: 33, l: 28 }, rpi: 85,
      stats: { runs: 472, runsAllowed: 389, battingAvg: ".291", era: 5.89, sos: 114 },
      stadium: { name: "Cleveland S. Harley Park", lat: 34.995, lng: -81.932, capacity: 1000, // verify coords
        blurb: "Home of the Spartans in Spartanburg, South Carolina. // TODO verify history details." },
      players: [
        { name: "Henry Zenor", pos: "INF", line: ".346, 8 HR, 51 RBI" },
        { name: "Jake Armsey", pos: "INF", line: ".309, 4 HR, 50 RBI" },
        { name: "Maloy Heaghney", pos: "OF", line: ".303, 6 HR, 50 RBI" },
        { name: "Chris Torres", pos: "RHP", line: "5-4, 5.42 ERA, 69 K" },
      ],
    },
    "alabama-state": {
      id: "alabama-state", name: "Alabama State", seed: null, conference: "SWAC",
      record: { w: 34, l: 21 }, rpi: 177,
      stats: { runs: 373, runsAllowed: 377, battingAvg: ".281", era: 6.07, sos: 270 },
      stadium: { name: "Wheeler-Watkins Baseball Complex", lat: 32.364, lng: -86.295, capacity: 1500, // verify coords
        blurb: "The Hornets' home in Montgomery, Alabama. // TODO verify history details." },
      players: [
        { name: "Miguel Oropeza", pos: "INF", line: ".366, 11 HR, 65 RBI" },
        { name: "Niguel Jenkins", pos: "OF", line: ".331, 6 HR, 29 RBI" },
        { name: "Fabian Santana", pos: "INF", line: ".322, 1 HR, 23 RBI" },
        { name: "James Peterson", pos: "RHP", line: "7-1, 3.32 ERA, 4 SV" },
      ],
    },
    // ---- Gainesville, FL Regional -----------------------------------------
    "florida": {
      id: "florida", name: "Florida", seed: 8, conference: "SEC",
      record: { w: 39, l: 19 }, rpi: 11,
      stats: { runs: 416, runsAllowed: 254, battingAvg: ".278", era: 4.12, sos: 2 },
      stadium: { name: "Condron Family Ballpark", lat: 29.6516, lng: -82.3479, capacity: 7000, // verify coords
        blurb: "The Gators' modern home in Gainesville, opened in 2021 to replace McKethan Stadium. One of the SEC's premier facilities." },
      players: [
        { name: "Blake Cyr", pos: "INF", line: ".338, 13 HR, 56 RBI" },
        { name: "Ethan Surowiec", pos: "OF", line: ".328, 11 HR, 61 RBI" },
        { name: "Kyle Jones", pos: "INF", line: ".305, 5 HR, 37 RBI" },
        { name: "Aidan King", pos: "RHP", line: "8-2, 2.68 ERA, 89 K" },
      ],
    },
    "miami": {
      id: "miami", name: "Miami", seed: null, conference: "ACC",
      record: { w: 38, l: 18 }, rpi: 30,
      stats: { runs: 476, runsAllowed: 317, battingAvg: ".304", era: 4.99, sos: 49 },
      stadium: { name: "Mark Light Field at Alex Rodriguez Park", lat: 25.718, lng: -80.279, capacity: 5000, // verify coords
        blurb: "The Hurricanes' historic home in Coral Gables, Florida. // TODO verify history details." },
      players: [
        { name: "Derek Williams", pos: "OF", line: ".374, 15 HR, 66 RBI" },
        { name: "Alex Sosa", pos: "INF", line: ".332, 17 HR, 66 RBI" },
        { name: "Jake Ogden", pos: "INF", line: ".307, 5 HR, 34 RBI" },
        { name: "Rob Evans", pos: "RHP", line: "10-3, 3.16 ERA, 94 K" },
      ],
    },
    "troy": {
      id: "troy", name: "Troy", seed: null, conference: "Sun Belt",
      record: { w: 32, l: 29 }, rpi: 35,
      stats: { runs: 412, runsAllowed: 367, battingAvg: ".285", era: 5.67, sos: 8 },
      stadium: { name: "Riddle-Pace Field", lat: 31.798, lng: -85.954, capacity: 2000, // verify coords
        blurb: "The Trojans' home in Troy, Alabama. // TODO verify history details." },
      players: [
        { name: "Jimmy Janicki", pos: "INF", line: ".350, 17 HR, 73 RBI" },
        { name: "Aaron Piasecki", pos: "OF", line: ".338, 9 HR, 42 RBI" },
        { name: "Steven Meier", pos: "INF", line: ".309, 9 HR, 39 RBI" },
        { name: "Tommy Egan", pos: "RHP", line: "5-4, 4.94 ERA, 87 K" },
      ],
    },
    "rider": {
      id: "rider", name: "Rider", seed: null, conference: "MAAC",
      record: { w: 33, l: 18 }, rpi: 119,
      stats: { runs: 393, runsAllowed: 285, battingAvg: ".299", era: 5.01, sos: 271 },
      stadium: { name: "Sonny Pittaro Field", lat: 40.281, lng: -74.741, capacity: 1000, // verify coords
        blurb: "The Broncs' home in Lawrenceville, New Jersey. // TODO verify history details." },
      players: [
        { name: "Kyle Neri", pos: "INF", line: ".352, 7 HR, 49 RBI" },
        { name: "Charley Magoulick", pos: "INF", line: ".345, 9 HR, 48 RBI" },
        { name: "Nick Shuhet", pos: "OF", line: ".343, 5 HR, 46 RBI" },
        { name: "PJ Craig", pos: "RHP", line: "9-3, 3.39 ERA, 88 K" },
      ],
    },
    // ---- Hattiesburg, MS Regional -----------------------------------------
    "southern-miss": {
      id: "southern-miss", name: "Southern Miss", seed: 9, conference: "Sun Belt",
      record: { w: 44, l: 15 }, rpi: 12,
      stats: { runs: 346, runsAllowed: 215, battingAvg: ".285", era: 3.55, sos: 35 },
      stadium: { name: "Pete Taylor Park (Hill Denson Field)", lat: 31.3288, lng: -89.336, capacity: 5200, // verify coords
        blurb: "The Golden Eagles' home in Hattiesburg, Mississippi, known for one of the most raucous atmospheres outside the power conferences." },
      players: [
        { name: "Davis Gillespie", pos: "INF", line: ".324, 12 HR, 43 RBI" },
        { name: "Joey Urban", pos: "INF", line: ".312, 13 HR, 45 RBI" },
        { name: "Matthew Russo", pos: "INF", line: ".313, 10 HR, 50 RBI" },
        { name: "Grayden Harris", pos: "RHP", line: "8-1, 3.10 ERA, 93 K" },
      ],
    },
    "virginia": {
      id: "virginia", name: "Virginia", seed: null, conference: "ACC",
      record: { w: 36, l: 21 }, rpi: 26,
      stats: { runs: 455, runsAllowed: 340, battingAvg: ".276", era: 5.15, sos: 16 },
      stadium: { name: "Disharoon Park", lat: 38.031, lng: -78.517, capacity: 5919, // verify coords
        blurb: "The Cavaliers' home in Charlottesville, Virginia. // TODO verify history details." },
      players: [
        { name: "A.J. Gracia", pos: "OF", line: ".338, 14 HR, 42 RBI" },
        { name: "Joe Tiroly", pos: "INF", line: ".313, 14 HR, 58 RBI" },
        { name: "Harrison Didawick", pos: "OF", line: ".313, 9 HR, 53 RBI" },
        { name: "Lucas Hartman", pos: "RHP", line: "10-2, 3.69 ERA, 65 K" },
      ],
    },
    "jacksonville-state": {
      id: "jacksonville-state", name: "Jacksonville State", seed: null, conference: "Conference USA",
      record: { w: 46, l: 13 }, rpi: 25,
      stats: { runs: 431, runsAllowed: 247, battingAvg: ".299", era: 3.77, sos: 112 },
      stadium: { name: "Rudy Abbott Field at Jim Case Stadium", lat: 33.82, lng: -85.767, capacity: 1500, // verify coords
        blurb: "The Gamecocks' home in Jacksonville, Alabama. // TODO verify history details." },
      players: [
        { name: "Grayson Ashe", pos: "INF", line: ".328, 8 HR, 61 RBI" },
        { name: "Jaxon Pate", pos: "INF", line: ".351, 2 HR, 28 RBI" },
        { name: "Trey King", pos: "INF", line: ".338, 4 HR, 42 RBI" },
        { name: "Steven Cash", pos: "LHP", line: "8-2, 2.94 ERA, 93 K" },
      ],
    },
    "little-rock": {
      id: "little-rock", name: "Little Rock", seed: null, conference: "Ohio Valley",
      record: { w: 36, l: 26 }, rpi: 89,
      stats: { runs: 370, runsAllowed: 341, battingAvg: ".289", era: 5.06, sos: 123 },
      stadium: { name: "Gary Hogan Field", lat: 34.711, lng: -92.349, capacity: 1500, // verify coords
        blurb: "The Trojans' home in Little Rock, Arkansas. // TODO verify history details." },
      players: [
        { name: "Kade Smith", pos: "OF", line: ".340, 13 2B, 42 RBI" },
        { name: "Nolan Freund", pos: "3B", line: ".308, 8 HR, 36 RBI" },
        { name: "Brannon Westmoreland", pos: "RHP", line: "2.98 ERA, 72 K, 84.2 IP" },
        { name: "Tag Andrews", pos: "RHP", line: "4 SV, 3.86 ERA, 31 K" },
      ],
    },
    // ---- Tallahassee, FL Regional -----------------------------------------
    "florida-state": {
      id: "florida-state", name: "Florida State", seed: 10, conference: "ACC",
      record: { w: 38, l: 17 }, rpi: 8,
      stats: { runs: 389, runsAllowed: 233, battingAvg: ".284", era: 4.01, sos: 5 },
      stadium: { name: "Dick Howser Stadium", lat: 30.436, lng: -84.3033, capacity: 6700, // verify coords
        blurb: "Named for the late Seminole great and MLB manager Dick Howser, the Tallahassee ballpark has hosted countless NCAA regionals." },
      players: [
        { name: "Myles Bailey", pos: "LF", line: ".363, 13 HR, 33 RBI" },
        { name: "Brody DeLamielleure", pos: "INF", line: ".342, 7 HR, 26 RBI" },
        { name: "Brayden Dowd", pos: "INF", line: ".301, 10 HR, 34 RBI" },
        { name: "Wes Mendes", pos: "LHP", line: "9-3, 2.68 ERA, 109 K" },
      ],
    },
    "coastal-carolina": {
      id: "coastal-carolina", name: "Coastal Carolina", seed: null, conference: "Sun Belt",
      record: { w: 37, l: 21 }, rpi: 27,
      stats: { runs: 407, runsAllowed: 313, battingAvg: ".269", era: 5.08, sos: 27 },
      stadium: { name: "Springs Brooks Stadium", lat: 33.793, lng: -79.012, capacity: 5500, // verify coords
        blurb: "Home of the 2016 national champion Chanticleers in Conway, South Carolina. // TODO verify history details." },
      players: [
        { name: "Walker Mitchell", pos: "C", line: ".314, 1 HR, 54 RBI" },
        { name: "Blake Barthol", pos: "INF", line: ".311, 6 HR, 38 RBI" },
        { name: "Dean Mihos", pos: "OF", line: ".305, 5 HR, 39 RBI" },
        { name: "Darin Horn", pos: "RHP", line: "8-1, 3.17 ERA, 90 K" },
      ],
    },
    "northern-illinois": {
      id: "northern-illinois", name: "Northern Illinois", seed: null, conference: "MAC",
      record: { w: 35, l: 17 }, rpi: 78,
      stats: { runs: 380, runsAllowed: 288, battingAvg: ".279", era: 5.69, sos: 218 },
      stadium: { name: "Ralph McKinzie Field", lat: 41.932, lng: -88.772, capacity: 1000, // verify coords
        blurb: "The Huskies' home in DeKalb, Illinois. // TODO verify history details." },
      players: [
        { name: "Wyatt Wawro", pos: "OF", line: ".374, 1 HR, 24 RBI" },
        { name: "Cole Smith", pos: "INF", line: ".364, 6 HR, 47 RBI" },
        { name: "Marcus Romero", pos: "INF", line: ".338, 1 HR, 20 RBI" },
        { name: "Max Vaisvila", pos: "RHP", line: "8-0, 3.04 ERA, 85 K" },
      ],
    },
    "st-johns": {
      id: "st-johns", name: "St. John's", seed: null, conference: "Big East",
      record: { w: 32, l: 24 }, rpi: null,
      stats: { runs: 352, runsAllowed: 323, battingAvg: ".279", era: 5.31, sos: null },
      stadium: { name: "Jack Kaiser Stadium", lat: 40.723, lng: -73.796, capacity: 3500, // verify coords
        blurb: "The Red Storm's home in Queens, New York. // TODO verify history details." },
      players: [
        { name: "Jayder Raifstanger", pos: "INF", line: ".328, 3 HR, 47 RBI" },
        { name: "Shaun McMillan", pos: "INF", line: ".320, 10 HR, 41 RBI" },
        { name: "Jon LeGrande", pos: "INF", line: ".317, 6 HR, 42 RBI" },
        { name: "Liam O'Leary", pos: "LHP", line: "4-2, 2.97 ERA, 68 K" },
      ],
    },
    // ---- Eugene, OR Regional ----------------------------------------------
    "oregon": {
      id: "oregon", name: "Oregon", seed: 11, conference: "Big Ten",
      record: { w: 40, l: 16 }, rpi: 15,
      stats: { runs: 381, runsAllowed: 247, battingAvg: ".284", era: 4.25, sos: 29 },
      stadium: { name: "PK Park", lat: 44.0583, lng: -123.0681, capacity: 4000, // verify coords
        blurb: "The Ducks' home in Eugene, adjacent to Autzen Stadium. Opened in 2009 when Oregon revived its baseball program." },
      players: [
        { name: "Drew Smith", pos: "INF", line: ".327, 14 HR, 53 RBI" },
        { name: "Ryan Cooney", pos: "OF", line: ".340, 8 HR, 38 RBI" },
        { name: "Angel Laya", pos: "INF", line: ".296, 13 HR, 41 RBI" },
        { name: "Will Sanford", pos: "RHP", line: "7-2, 4.08 ERA, 96 K" },
      ],
    },
    "oregon-state": {
      id: "oregon-state", name: "Oregon State", seed: null, conference: "Independent",
      record: { w: 43, l: 12 }, rpi: 18,
      stats: { runs: 369, runsAllowed: 206, battingAvg: ".271", era: 3.29, sos: 62 },
      stadium: { name: "Goss Stadium at Coleman Field", lat: 44.561, lng: -123.282, capacity: 4022, // verify coords
        blurb: "The three-time national champion Beavers' home in Corvallis, Oregon. // TODO verify history details." },
      players: [
        { name: "AJ Singer", pos: "INF", line: ".290, 8 HR, 54 RBI" },
        { name: "Easton Talt", pos: "INF", line: ".261, 5 HR, 40 RBI" },
        { name: "Dax Whitney", pos: "RHP", line: "6-1, 2.00 ERA, 104 K" },
        { name: "Albert Roblez", pos: "RHP", line: "14 SV, 1.67 ERA" },
      ],
    },
    "washington-state": {
      id: "washington-state", name: "Washington State", seed: null, conference: "Mountain West",
      record: { w: 30, l: 26 }, rpi: 83,
      stats: { runs: null, runsAllowed: null, battingAvg: null, era: null, sos: 96 },
      stadium: { name: "Bailey–Brayton Field", lat: 46.732, lng: -117.162, capacity: 3500, // verify coords
        blurb: "The Cougars' home in Pullman, Washington. // TODO verify history details." },
      players: [
        { name: "Gavin Roy", pos: "INF", line: ".365, 2 HR, 42 RBI" },
        { name: "Ryan Skjonsby", pos: "1B", line: ".327, 8 HR, 55 RBI" },
        { name: "Max Hartman", pos: "OF", line: ".338, 8 3B, 46 RBI" },
        { name: "Nick Lewis", pos: "LHP", line: "9-2, 3.07 ERA, 65 K" },
      ],
    },
    "yale": {
      id: "yale", name: "Yale", seed: null, conference: "Ivy League",
      record: { w: 30, l: 13 }, rpi: null,
      stats: { runs: 346, runsAllowed: 230, battingAvg: ".285", era: 4.71, sos: null },
      stadium: { name: "Yale Field", lat: 41.312, lng: -72.962, capacity: 6200, // verify coords
        blurb: "The Bulldogs play at historic Yale Field in New Haven, Connecticut, one of the oldest ballparks in the country. // TODO verify history details." },
      players: [
        { name: "Garrett Larsen", pos: "INF", line: ".374, 2 HR, 31 RBI" },
        { name: "Chris DiPrima", pos: "OF", line: ".356, 0 HR, 40 RBI" },
        { name: "Kaiden Dossa", pos: "INF", line: ".321, 6 HR, 40 RBI" },
        { name: "Tate Evans", pos: "RHP", line: "7-1, 2.72 ERA, 78 K" },
      ],
    },
    // ---- College Station, TX Regional -------------------------------------
    "texas-am": {
      id: "texas-am", name: "Texas A&M", seed: 12, conference: "SEC",
      record: { w: 39, l: 14 }, rpi: 14,
      stats: { runs: 477, runsAllowed: 279, battingAvg: ".301", era: 5.13, sos: 17 },
      stadium: { name: "Olsen Field at Blue Bell Park", lat: 30.61, lng: -96.352, capacity: 7300, // verify coords
        blurb: "The Aggies' home in College Station, rebuilt in 2012. One of the largest and loudest crowds in college baseball." },
      players: [
        { name: "Caden Sorrell", pos: "OF", line: ".341, 23 HR, 74 RBI" },
        { name: "Gavin Grahovac", pos: "INF", line: ".344, 19 HR, 71 RBI" },
        { name: "Aiden Sims", pos: "RHP", line: "8-1, 3.84 ERA, 73 K" },
        { name: "Clayton Freshcorn", pos: "RHP", line: "12 SV, 2.36 ERA" },
      ],
    },
    "usc": {
      id: "usc", name: "USC", seed: null, conference: "Big Ten",
      record: { w: 43, l: 15 }, rpi: 9,
      stats: { runs: 393, runsAllowed: 220, battingAvg: ".273", era: 3.47, sos: 37 },
      stadium: { name: "Dedeaux Field", lat: 34.022, lng: -118.288, capacity: 2500, // verify coords
        blurb: "Home of the most decorated program in college baseball history, in Los Angeles. // TODO verify history details." },
      players: [
        { name: "Jack Basseer", pos: "INF", line: ".356, 10 HR, 36 RBI" },
        { name: "Adrian Lopez", pos: "INF", line: ".300, 11 HR, 41 RBI" },
        { name: "Mason Edwards", pos: "RHP", line: "8-0, 1.43 ERA, 160 K" },
        { name: "Grant Govel", pos: "RHP", line: "10-2, 2.84 ERA, 86 K" },
      ],
    },
    "texas-state": {
      id: "texas-state", name: "Texas State", seed: null, conference: "Sun Belt",
      record: { w: 36, l: 24 }, rpi: 43,
      stats: { runs: 411, runsAllowed: 362, battingAvg: ".276", era: 5.4, sos: 32 },
      stadium: { name: "Bobcat Ballpark", lat: 29.889, lng: -97.938, capacity: 2500, // verify coords
        blurb: "The Bobcats' home in San Marcos, Texas. // TODO verify history details." },
      players: [
        { name: "Rashawn Galloway", pos: "OF", line: ".324, 12 HR, 48 RBI" },
        { name: "Ethan Farris", pos: "INF", line: ".337, 8 HR, 26 RBI" },
        { name: "Clayton Namken", pos: "INF", line: ".317, 11 HR, 34 RBI" },
        { name: "Jesus Tovar", pos: "RHP", line: "9-3, 5.24 ERA, 65 K" },
      ],
    },
    "lamar": {
      id: "lamar", name: "Lamar", seed: null, conference: "Southland",
      record: { w: 34, l: 25 }, rpi: 90,
      stats: { runs: 328, runsAllowed: 292, battingAvg: ".273", era: 4.47, sos: 117 },
      stadium: { name: "Vincent–Beck Stadium", lat: 30.042, lng: -94.075, capacity: 3500, // verify coords
        blurb: "The Cardinals' home in Beaumont, Texas. // TODO verify history details." },
      players: [
        { name: "Tab Tracy", pos: "INF", line: ".336, 2 HR, 32 RBI" },
        { name: "Jake Wagoner", pos: "OF", line: ".347, 1 HR, 16 RBI" },
        { name: "Chris Olivier", pos: "RHP", line: "7-4, 2.66 ERA, 103 K" },
        { name: "Travis Lutz", pos: "RHP", line: "4-2, 2.28 ERA, 67 K" },
      ],
    },
    // ---- Lincoln, NE Regional ---------------------------------------------
    "nebraska": {
      id: "nebraska", name: "Nebraska", seed: 13, conference: "Big Ten",
      record: { w: 42, l: 15 }, rpi: 10,
      stats: { runs: 429, runsAllowed: 298, battingAvg: ".312", era: 4.89, sos: 40 },
      stadium: { name: "Haymarket Park", lat: 40.8197, lng: -96.7113, capacity: 8486, // verify coords
        blurb: "The Cornhuskers' home in Lincoln, opened in 2002 and consistently among the national attendance leaders." },
      players: [
        { name: "Dylan Carey", pos: "INF", line: ".342, 14 HR, 63 RBI" },
        { name: "Case Sanderson", pos: "INF", line: ".370, 6 HR, 48 RBI" },
        { name: "Carson Jasa", pos: "RHP", line: "9-2, 3.87 ERA, 109 K" },
        { name: "Gavin Blachowicz", pos: "RHP", line: "4-3, 3.93 ERA, 79 K" },
      ],
    },
    "ole-miss": {
      id: "ole-miss", name: "Ole Miss", seed: null, conference: "SEC",
      record: { w: 36, l: 21 }, rpi: 16,
      stats: { runs: 393, runsAllowed: 278, battingAvg: ".266", era: 4.45, sos: 4 },
      stadium: { name: "Swayze Field", lat: 34.364, lng: -89.534, capacity: 11477, // verify coords
        blurb: "The 2022 national champion Rebels' home in Oxford, Mississippi. // TODO verify history details." },
      players: [
        { name: "Judd Utermark", pos: "INF", line: ".318, 20 HR, 48 RBI" },
        { name: "Tristan Bissetta", pos: "OF", line: ".288, 20 HR, 57 RBI" },
        { name: "Will Furniss", pos: "INF", line: ".315, 7 HR, 52 RBI" },
        { name: "Cade Townsend", pos: "LHP", line: "5-3, 3.81 ERA, 81 K" },
      ],
    },
    "arizona-state": {
      id: "arizona-state", name: "Arizona State", seed: null, conference: "Big 12",
      record: { w: 37, l: 19 }, rpi: 44,
      stats: { runs: 467, runsAllowed: 322, battingAvg: ".320", era: 5.44, sos: 74 },
      stadium: { name: "Phoenix Municipal Stadium", lat: 33.457, lng: -111.987, capacity: 8775, // verify coords
        blurb: "The tradition-rich Sun Devils play at 'Muni' in Phoenix, Arizona. // TODO verify history details." },
      players: [
        { name: "Landon Hairston", pos: "INF", line: ".413, 28 HR, 79 RBI" },
        { name: "Nu'u Contrades", pos: "INF", line: ".373, 17 HR, 53 RBI" },
        { name: "Cole Carlon", pos: "RHP", line: "5-2, 3.51 ERA, 124 K" },
        { name: "Taylor Penn", pos: "RHP", line: "6-1, 3.22 ERA, 47 K" },
      ],
    },
    "south-dakota-state": {
      id: "south-dakota-state", name: "South Dakota State", seed: null, conference: "The Summit League",
      record: { w: 24, l: 31 }, rpi: 239,
      stats: { runs: 380, runsAllowed: 398, battingAvg: ".275", era: 7.15, sos: 262 },
      stadium: { name: "Erv Huether Field", lat: 44.321, lng: -96.766, capacity: 1000, // verify coords
        blurb: "The Jackrabbits' home in Brookings, South Dakota. // TODO verify history details." },
      players: [
        { name: "Luke Luskey", pos: "INF", line: ".303, 13 HR, 55 RBI" },
        { name: "Nolan Grawe", pos: "INF", line: ".315, 7 HR, 49 RBI" },
        { name: "Drew McDowell", pos: "RHP", line: "4-2, 3.95 ERA, 43 K" },
        { name: "Ty Madison", pos: "RHP", line: "4-5, 4.75 ERA, 51 K" },
      ],
    },
    // ---- Starkville, MS Regional ------------------------------------------
    "mississippi-state": {
      id: "mississippi-state", name: "Mississippi State", seed: 14, conference: "SEC",
      record: { w: 40, l: 17 }, rpi: 13,
      stats: { runs: 486, runsAllowed: 259, battingAvg: ".313", era: 4.3, sos: 7 },
      stadium: { name: "Dudy Noble Field (Polk–DeMent Stadium)", lat: 33.4558, lng: -88.7905, capacity: 15000, // verify coords
        blurb: "The largest on-campus venue in college baseball and the 2021 national champion Bulldogs' home in Starkville, famous for its 'Left Field Lounge.'" },
      players: [
        { name: "Ace Reese", pos: "INF", line: ".327, 20 HR, 69 RBI" },
        { name: "Noah Sullivan", pos: "OF", line: ".348, 12 HR, 45 RBI" },
        { name: "Jacob Parker", pos: "OF", line: ".315, 13 HR, 51 RBI" },
        { name: "Tomas Valincius", pos: "RHP", line: "10-2, 2.93 ERA, 120 K" },
      ],
    },
    "cincinnati": {
      id: "cincinnati", name: "Cincinnati", seed: null, conference: "Big 12",
      record: { w: 37, l: 20 }, rpi: 22,
      stats: { runs: 419, runsAllowed: 311, battingAvg: ".300", era: 4.96, sos: 39 },
      stadium: { name: "UC Baseball Stadium (Marge Schott Stadium)", lat: 39.13, lng: -84.516, capacity: 3085, // verify coords
        blurb: "The Bearcats' home in Cincinnati, Ohio. // TODO verify history details." },
      players: [
        { name: "Quinton Coats", pos: "INF", line: ".346, 28 HR, 78 RBI" },
        { name: "Enzo Infelise", pos: "OF", line: ".371, 9 HR, 44 RBI" },
        { name: "Jack Natili", pos: "INF", line: ".336, 16 HR, 59 RBI" },
        { name: "Nathan Taylor", pos: "RHP", line: "6-3, 3.86 ERA, 112 K" },
      ],
    },
    "louisiana": {
      id: "louisiana", name: "Louisiana", seed: null, conference: "Sun Belt",
      record: { w: 39, l: 23 }, rpi: 33,
      stats: { runs: 378, runsAllowed: 324, battingAvg: ".268", era: 4.86, sos: 38 },
      stadium: { name: "M.L. 'Tigue' Moore Field at Russo Park", lat: 30.215, lng: -92.019, capacity: 6015, // verify coords
        blurb: "The Ragin' Cajuns' home in Lafayette, Louisiana, one of the most passionate fan bases in the Sun Belt. // TODO verify history details." },
      players: [
        { name: "Lee Amedee", pos: "INF", line: ".311, 7 HR, 52 RBI" },
        { name: "Colt Brown", pos: "INF", line: ".307, 5 HR, 50 RBI" },
        { name: "Cody Brasch", pos: "RHP", line: "6-2, 2.04 ERA, 77 K" },
        { name: "Andrew Herrmann", pos: "LHP", line: "7-5, 4.43 ERA, 108 K" },
      ],
    },
    "lipscomb": {
      id: "lipscomb", name: "Lipscomb", seed: null, conference: "ASUN",
      record: { w: 29, l: 24 }, rpi: 155,
      stats: { runs: 320, runsAllowed: 361, battingAvg: ".292", era: 6.26, sos: 195 },
      stadium: { name: "Ken Dugan Field at Stephen L. Marsh Stadium", lat: 36.105, lng: -86.796, capacity: 1000, // verify coords
        blurb: "The Bisons' home in Nashville, Tennessee. // TODO verify history details." },
      players: [
        { name: "Cam Pruitt", pos: "INF", line: ".356, 2 HR, 48 RBI" },
        { name: "Hutson Miles", pos: "OF", line: ".351, 1 HR, 20 RBI" },
        { name: "Adam Jamison", pos: "RHP", line: "4-0, 2.88 ERA, 45 K" },
        { name: "Kaleb Kantola", pos: "RHP", line: "9 SV, 1.69 ERA, 1-0" },
      ],
    },
    // ---- Lawrence, KS Regional --------------------------------------------
    "kansas": {
      id: "kansas", name: "Kansas", seed: 15, conference: "Big 12",
      record: { w: 42, l: 16 }, rpi: 19,
      stats: { runs: 448, runsAllowed: 333, battingAvg: ".289", era: 5.31, sos: 60 },
      stadium: { name: "Hoglund Ballpark", lat: 38.954, lng: -95.253, capacity: 2500, // verify coords
        blurb: "The Jayhawks' home in Lawrence, Kansas. // TODO verify history details." },
      players: [
        { name: "Tyson LeBlanc", pos: "C", line: ".339, 21 HR, 60 RBI" },
        { name: "Augusto Mungarrieta", pos: "OF", line: ".300, 15 HR, 47 RBI" },
        { name: "Cade Baldridge", pos: "INF", line: ".318, 7 HR, 42 RBI" },
        { name: "Mason Cook", pos: "RHP", line: "5-1, 4.26 ERA, 64 K" },
      ],
    },
    "arkansas": {
      id: "arkansas", name: "Arkansas", seed: null, conference: "SEC",
      record: { w: 39, l: 20 }, rpi: 21,
      stats: { runs: 421, runsAllowed: 293, battingAvg: ".275", era: 4.59, sos: 10 },
      stadium: { name: "Baum–Walker Stadium", lat: 36.048, lng: -94.183, capacity: 11531, // verify coords
        blurb: "One of the nation's elite venues and the Razorbacks' home in Fayetteville, Arkansas. // TODO verify history details." },
      players: [
        { name: "Camden Kozeal", pos: "INF", line: ".322, 20 HR, 70 RBI" },
        { name: "Damian Ruiz", pos: "INF", line: ".315, 5 HR, 27 RBI" },
        { name: "Hunter Dietz", pos: "RHP", line: "7-3, 3.40 ERA, 117 K" },
        { name: "Parker Coil", pos: "RHP", line: "3-0, 3.65 ERA, 2 SV" },
      ],
    },
    "missouri-state": {
      id: "missouri-state", name: "Missouri State", seed: null, conference: "Conference USA",
      record: { w: 34, l: 19 }, rpi: 23,
      stats: { runs: 421, runsAllowed: 325, battingAvg: ".299", era: 6.09, sos: 44 },
      stadium: { name: "Hammons Field", lat: 37.208, lng: -93.286, capacity: 7986, // verify coords
        blurb: "The Bears share Springfield's professional-grade Hammons Field. // TODO verify history details." },
      players: [
        { name: "Logan Fyffe", pos: "INF", line: ".364, 8 HR, 42 RBI" },
        { name: "Bryce Cermenelli", pos: "OF", line: ".353, 2 HR, 21 RBI" },
        { name: "Curry Sutherland", pos: "INF", line: ".317, 15 HR, 51 RBI" },
        { name: "Brock Lucas", pos: "RHP", line: "6-4, 4.84 ERA, 53 K" },
      ],
    },
    "northeastern": {
      id: "northeastern", name: "Northeastern", seed: null, conference: "Coastal Athletic",
      record: { w: 38, l: 20 }, rpi: 88,
      stats: { runs: 428, runsAllowed: 313, battingAvg: ".280", era: 5.04, sos: 190 },
      stadium: { name: "Friedman Diamond", lat: 42.311, lng: -71.253, capacity: 1000, // verify coords
        blurb: "The Huskies' home in the Boston, Massachusetts area. // TODO verify history details." },
      players: [
        { name: "Harrison Feinberg", pos: "INF", line: ".330, 16 HR, 63 RBI" },
        { name: "Ryan Gerety", pos: "OF", line: ".323, 5 HR, 37 RBI" },
        { name: "Matt Brinker", pos: "INF", line: ".310, 8 HR, 59 RBI" },
        { name: "Robbie O'Connor", pos: "RHP", line: "9-2, 4.31 ERA, 56 K" },
      ],
    },
    // ---- Morgantown, WV Regional ------------------------------------------
    "west-virginia": {
      id: "west-virginia", name: "West Virginia", seed: 16, conference: "Big 12",
      record: { w: 39, l: 14 }, rpi: 17,
      stats: { runs: 389, runsAllowed: 200, battingAvg: ".303", era: 3.84, sos: 56 },
      stadium: { name: "Monongalia County Ballpark (Wagener Field)", lat: 39.647, lng: -79.929, capacity: 3500, // verify coords
        blurb: "The Mountaineers play just outside Morgantown at the county ballpark, which opened in 2015 and is shared with a minor-league club." },
      players: [
        { name: "Gavin Kelly", pos: "INF", line: ".379, 13 HR, 48 RBI" },
        { name: "Paul Schoenfeld", pos: "INF", line: ".350, 3 HR, 43 RBI" },
        { name: "Sean Smith", pos: "OF", line: ".325, 8 HR, 45 RBI" },
        { name: "Chansen Cole", pos: "RHP", line: "8-1, 3.04 ERA, 83 K" },
      ],
    },
    "wake-forest": {
      id: "wake-forest", name: "Wake Forest", seed: null, conference: "ACC",
      record: { w: 38, l: 19 }, rpi: 20,
      stats: { runs: 451, runsAllowed: 275, battingAvg: ".297", era: 4.62, sos: 20 },
      stadium: { name: "David F. Couch Ballpark", lat: 36.134, lng: -80.278, capacity: 3823, // verify coords
        blurb: "The Demon Deacons' home in Winston-Salem, North Carolina. // TODO verify history details." },
      players: [
        { name: "Kade Lewis", pos: "INF", line: ".362, 13 HR, 55 RBI" },
        { name: "Lucas Costello", pos: "OF", line: ".320, 17 HR, 61 RBI" },
        { name: "Javar Williams", pos: "OF", line: ".338, 9 HR, 39 RBI" },
        { name: "Chris Levonas", pos: "RHP", line: "10-3, 2.90 ERA, 110 K" },
      ],
    },
    "kentucky": {
      id: "kentucky", name: "Kentucky", seed: null, conference: "SEC",
      record: { w: 31, l: 20 }, rpi: 37,
      stats: { runs: 360, runsAllowed: 294, battingAvg: ".286", era: 5.31, sos: 31 },
      stadium: { name: "Kentucky Proud Park", lat: 38.021, lng: -84.529, capacity: 4500, // verify coords
        blurb: "The Wildcats' home in Lexington, opened in 2019. // TODO verify history details." },
      players: [
        { name: "Jayce Tharnish", pos: "OF", line: ".356, 5 HR, 36 RBI" },
        { name: "Luke Lawrence", pos: "INF", line: ".338, 3 HR, 39 RBI" },
        { name: "Ethan Hindle", pos: "INF", line: ".313, 11 HR, 47 RBI" },
        { name: "Jaxon Jelkin", pos: "RHP", line: "8-2, 3.61 ERA, 94 K" },
      ],
    },
    "binghamton": {
      id: "binghamton", name: "Binghamton", seed: null, conference: "America East",
      record: { w: 31, l: 20 }, rpi: 118,
      stats: { runs: 362, runsAllowed: 326, battingAvg: ".269", era: 6.18, sos: 231 },
      stadium: { name: "Bearcats Sports Complex", lat: 42.089, lng: -75.968, capacity: 1000, // verify coords
        blurb: "The Bearcats' home in Vestal, New York. // TODO verify history details." },
      players: [
        { name: "Sean Sweeney", pos: "INF", line: ".360, 1 HR, 31 RBI" },
        { name: "Matt Bolton", pos: "OF", line: ".349, 6 HR, 44 RBI" },
        { name: "Tommy Popoff", pos: "INF", line: ".291, 7 HR, 52 RBI" },
        { name: "Jackson Mitchell", pos: "RHP", line: "3-1, 4.21 ERA, 49 K" },
      ],
    },
  },
};

// Expose for the app (and for quick console sanity checks).
if (typeof window !== "undefined") window.TOURNAMENT = TOURNAMENT;
