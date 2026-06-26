import { useMemo, useState } from "react";
import {
  FranchiseLensHub,
  type ActiveTeamVM,
  type AlmanacVM,
  type HubVM,
  type PlayerDetailVM,
  type SprayDepth,
  type SprayDirection,
  type SprayDotVM,
  type SprayOutcome,
  type StadiumVM,
  type StandingsRacesVM,
  type TeamPickerVM,
} from "../components/franchise/FranchiseLensHub";

/** Expand a compact [direction, depth, outcome, count] spec into spray dots. */
function mkSpray(spec: Array<[SprayDirection, SprayDepth, SprayOutcome, number]>): SprayDotVM[] {
  const out: SprayDotVM[] = [];
  for (const [direction, depth, outcome, n] of spec) {
    for (let i = 0; i < n; i++) out.push({ direction, depth, outcome });
  }
  return out;
}

/**
 * FranchiseLensPreview — a non-destructive, routable preview of the aged-Fenway
 * team-lens hub (slice 1) fed by MOCK data, at /__preview/franchise-lens. Lets us
 * verify the real React + fenway-theme.css render (and the team re-skin + morale
 * ledger) in-app without a seeded franchise. The real page will swap the mock for
 * the live-data adapter; the FranchiseLensHub component is unchanged.
 */

const PICKER: TeamPickerVM[] = [
  { id: "PC", name: "Page Capitals", abbr: "PC", primary: "#6E2440" },
  { id: "BM", name: "Brass Monkeys", abbr: "BM", primary: "#B06A1E" },
  { id: "RR", name: "River Rats", abbr: "RR", primary: "#2E5E8C" },
];

const ACTIVE: Record<string, ActiveTeamVM> = {
  PC: { id: "PC", name: "Page Capitals", abbr: "PC", recordLabel: "48–32 · 2nd, Eastern", primary: "#6E2440", secondary: "#E3C099", rivalName: "Brass Monkeys", rivalId: "BM", seasonLabel: "Season 3 · Week 9",
    archetype: "Power Club", ballparkNickname: "The Yard", gmName: "The Architect", managerName: "B. Cole", managerStyle: "Balanced", scoutName: "M. Okafor", scoutSpecialty: "infielders", reporter: { name: "J. Tate", mood: "loving this run", avatar: "fedora" } },
  BM: { id: "BM", name: "Brass Monkeys", abbr: "BM", recordLabel: "50–30 · 1st, Eastern", primary: "#B06A1E", secondary: "#2A2A2A", rivalName: "Page Capitals", rivalId: "PC", seasonLabel: "Season 3 · Week 9",
    archetype: "Pitching & Defense", ballparkNickname: "The Foundry", gmName: "C. Diaz", managerName: "R. Vance", managerStyle: "Aggressive", scoutName: "P. Nunn", scoutSpecialty: "arms", reporter: { name: "D. Hale", mood: "writing a coronation", avatar: "headset" } },
  RR: { id: "RR", name: "River Rats", abbr: "RR", recordLabel: "44–36 · 3rd, Eastern", primary: "#2E5E8C", secondary: "#B0B7BC", rivalName: "Sand Gnats", rivalId: "SG", seasonLabel: "Season 3 · Week 9",
    archetype: "Speed & Glove", ballparkNickname: "The Levee", gmName: "T. Webb", managerName: "S. Park", managerStyle: "Small-ball", scoutName: "L. Boyd", scoutSpecialty: "speed", reporter: { name: "G. Ruiz", mood: "frustrated for the fans", avatar: "cap" } },
};

/* League-wide standings/races/all-star — one shared dataset; the lens highlights
 * the active club (yellow) and its rival (red). The real adapter will produce one
 * block from calculateStandings + the awards-preview + getFranchiseAllStarRoster. */
const LEAGUE: StandingsRacesVM = {
  divisions: [
    {
      name: "Eastern",
      rows: [
        { teamId: "BM", name: "Brass Monkeys", abbr: "BM", wins: 50, losses: 30, winPct: 0.625, gamesBack: 0, lastTenWins: 7, streak: { type: "W", count: 4 }, runDiff: 88, home: { wins: 28, losses: 12 }, away: { wins: 22, losses: 18 } },
        { teamId: "PC", name: "Page Capitals", abbr: "PC", wins: 48, losses: 32, winPct: 0.600, gamesBack: 2.0, lastTenWins: 6, streak: { type: "W", count: 3 }, runDiff: 71, home: { wins: 27, losses: 13 }, away: { wins: 21, losses: 19 } },
        { teamId: "RR", name: "River Rats", abbr: "RR", wins: 44, losses: 36, winPct: 0.550, gamesBack: 6.0, lastTenWins: 4, streak: { type: "L", count: 2 }, runDiff: 18, home: { wins: 24, losses: 16 }, away: { wins: 20, losses: 20 } },
        { teamId: "SG", name: "Sand Gnats", abbr: "SG", wins: 39, losses: 41, winPct: 0.488, gamesBack: 11.0, lastTenWins: 5, streak: { type: "W", count: 1 }, runDiff: -12, home: { wins: 22, losses: 18 }, away: { wins: 17, losses: 23 } },
      ],
    },
    {
      name: "Western",
      rows: [
        { teamId: "ST", name: "Steel Tides", abbr: "ST", wins: 47, losses: 33, winPct: 0.588, gamesBack: 0, lastTenWins: 6, streak: { type: "W", count: 2 }, runDiff: 54, home: { wins: 26, losses: 14 }, away: { wins: 21, losses: 19 } },
        { teamId: "DV", name: "Delta Vipers", abbr: "DV", wins: 45, losses: 35, winPct: 0.563, gamesBack: 2.0, lastTenWins: 5, streak: { type: "L", count: 1 }, runDiff: 33, home: { wins: 25, losses: 15 }, away: { wins: 20, losses: 20 } },
        { teamId: "CC", name: "Cactus Cats", abbr: "CC", wins: 41, losses: 39, winPct: 0.513, gamesBack: 6.0, lastTenWins: 6, streak: { type: "W", count: 3 }, runDiff: 5, home: { wins: 23, losses: 17 }, away: { wins: 18, losses: 22 } },
        { teamId: "HB", name: "Harbor Bandits", abbr: "HB", wins: 35, losses: 45, winPct: 0.438, gamesBack: 12.0, lastTenWins: 3, streak: { type: "L", count: 4 }, runDiff: -47, home: { wins: 20, losses: 20 }, away: { wins: 15, losses: 25 } },
      ],
    },
  ],
  races: [
    {
      category: "MVP",
      note: "position players",
      candidates: [
        { teamId: "BM", teamAbbr: "BM", name: "Boomer Vance", statLine: ".308 · 31 HR · 92 RBI", score: 6.4, marginToWinner: 0 },
        { teamId: "PC", teamAbbr: "PC", name: "Dash Okoye", statLine: ".321 · 14 HR · 28 SB", score: 6.1, marginToWinner: 0.3 },
        { teamId: "ST", teamAbbr: "ST", name: "Tessa Crowe", statLine: ".299 · 24 HR", score: 5.7, marginToWinner: 0.7 },
      ],
    },
    {
      category: "Cy Young",
      candidates: [
        { teamId: "BM", teamAbbr: "BM", name: "Cole Vesper", statLine: "2.18 ERA · 214 K", score: 6.6, marginToWinner: 0 },
        { teamId: "PC", teamAbbr: "PC", name: "Rafa Fenomeno", statLine: "2.74 ERA · 188 K", score: 5.9, marginToWinner: 0.7 },
        { teamId: "DV", teamAbbr: "DV", name: "Magnus Roan", statLine: "3.01 ERA · 171 K", score: 5.4, marginToWinner: 1.2 },
      ],
    },
    {
      category: "Rookie of the Year",
      candidates: [
        { teamId: "PC", teamAbbr: "PC", name: "Rafa Fenomeno", statLine: "rookie · 2.74 ERA", score: 4.6, marginToWinner: 0 },
        { teamId: "SG", teamAbbr: "SG", name: "Vito Sand", statLine: ".284 · 12 HR", score: 3.4, marginToWinner: 1.2 },
        { teamId: "CC", teamAbbr: "CC", name: "Kit Bowman", statLine: ".271 · 19 SB", score: 3.1, marginToWinner: 1.5 },
      ],
    },
  ],
  awards: [
    { category: "MVP", emblem: "🏆", frontrunner: "Boomer Vance", teamId: "BM", teamAbbr: "BM", status: "lead" },
    { category: "Cy Young", emblem: "⚾", frontrunner: "Cole Vesper", teamId: "BM", teamAbbr: "BM", status: "lead" },
    { category: "Rookie of the Year", emblem: "🌟", frontrunner: "Rafa Fenomeno", teamId: "PC", teamAbbr: "PC", status: "lead" },
    { category: "Reliever of the Year", emblem: "🔥", frontrunner: "Milo Reyes", teamId: "PC", teamAbbr: "PC", status: "lead" },
    { category: "Silver Slugger", emblem: "🏏", frontrunner: "Boomer Vance", teamId: "BM", teamAbbr: "BM", status: "lead" },
    { category: "Gold Glove", emblem: "🧤", frontrunner: "Tio Marsh", teamId: "BM", teamAbbr: "BM", status: "lead" },
    { category: "Manager of the Year", emblem: "🎩", frontrunner: "R. Vance", teamId: "BM", teamAbbr: "BM", status: "lead" },
    { category: "Comeback Player", emblem: "📈", frontrunner: "Reed Cole", teamId: "ST", teamAbbr: "ST", status: "lead" },
    { category: "Kara Kawaguchi", emblem: "✨", frontrunner: "Dash Okoye", teamId: "PC", teamAbbr: "PC", status: "lead" },
    { category: "Bench Player", emblem: "🪑", frontrunner: "Gil Roy", teamId: "BM", teamAbbr: "BM", status: "lead" },
    { category: "Bust of the Year", emblem: "💸", frontrunner: "Cy Vane", teamId: "PC", teamAbbr: "PC", status: "lead", dubious: true },
    { category: "Booger Glove", emblem: "🧻", frontrunner: "Gil Toe", teamId: "HB", teamAbbr: "HB", status: "lead", dubious: true },
  ],
  allStar: {
    locked: true,
    lockLabel: "Rosters locked · 60% mark reached",
    starters: [
      { position: "C", teamId: "DV", teamAbbr: "DV", name: "Walt Greer", role: "starter" },
      { position: "1B", teamId: "PC", teamAbbr: "PC", name: "Hank Drake", role: "starter" },
      { position: "2B", teamId: "RR", teamAbbr: "RR", name: "Sol Park", role: "starter" },
      { position: "3B", teamId: "CC", teamAbbr: "CC", name: "Cy Bell", role: "starter" },
      { position: "SS", teamId: "ST", teamAbbr: "ST", name: "Tessa Crowe", role: "starter" },
      { position: "LF", teamId: "ST", teamAbbr: "ST", name: "Reed Cole", role: "starter" },
      { position: "CF", teamId: "PC", teamAbbr: "PC", name: "Dash Okoye", role: "starter" },
      { position: "RF", teamId: "BM", teamAbbr: "BM", name: "Boomer Vance", role: "starter" },
      { position: "SP", teamId: "BM", teamAbbr: "BM", name: "Cole Vesper", role: "starter" },
      { position: "SP", teamId: "PC", teamAbbr: "PC", name: "Rafa Fenomeno", role: "starter" },
      { position: "SP", teamId: "DV", teamAbbr: "DV", name: "Magnus Roan", role: "starter" },
      { position: "SP", teamId: "ST", teamAbbr: "ST", name: "Dane Cobb", role: "starter" },
      { position: "RP", teamId: "PC", teamAbbr: "PC", name: "Milo Reyes", role: "starter" },
      { position: "RP", teamId: "BM", teamAbbr: "BM", name: "Pax Holt", role: "starter" },
      { position: "RP", teamId: "SG", teamAbbr: "SG", name: "Lou Vance", role: "starter" },
      { position: "RP", teamId: "CC", teamAbbr: "CC", name: "Tre Diaz", role: "starter" },
      { position: "RP", teamId: "DV", teamAbbr: "DV", name: "Sal Knox", role: "starter" },
    ],
    reserves: [
      { position: "C", teamId: "BM", teamAbbr: "BM", name: "Gil Roy", role: "reserve" },
      { position: "1B", teamId: "ST", teamAbbr: "ST", name: "Ox Mund", role: "reserve" },
      { position: "SS", teamId: "BM", teamAbbr: "BM", name: "Tio Marsh", role: "reserve" },
      { position: "LF", teamId: "CC", teamAbbr: "CC", name: "Kit Bowman", role: "reserve" },
      { position: "CF", teamId: "DV", teamAbbr: "DV", name: "Nyle Fox", role: "reserve" },
      { position: "SP", teamId: "RR", teamAbbr: "RR", name: "Abe Lund", role: "reserve" },
      { position: "RP", teamId: "ST", teamAbbr: "ST", name: "Mo Childs", role: "reserve" },
      { position: "RP", teamId: "RR", teamAbbr: "RR", name: "Sy Booker", role: "reserve" },
      { position: "WILDCARD", teamId: "SG", teamAbbr: "SG", name: "Vito Sand", role: "reserve" },
    ],
    snubs: [
      { position: "LF", teamId: "PC", teamAbbr: "PC", name: "Lars Stad", note: "passed over again — morale 38 ▼" },
      { position: "1B", teamId: "BM", teamAbbr: "BM", name: "Rex Dunn", note: "narrowly missed" },
      { position: "CF", teamId: "SG", teamAbbr: "SG", name: "Jojo Fields", note: "fan favorite left off" },
    ],
  },
};

/* League-wide leaderboards + trophy case (shared; the lens highlights you/rival).
 * Real adapter: getSeasonBattingStats / getSeasonPitchingStats → leaders;
 * museum + offseason awards → trophy case. */
const ALMANAC: AlmanacVM = {
  battingLeaders: [
    { stat: "AVG", entries: [
      { rank: 1, name: "D. Okoye", teamId: "PC", teamAbbr: "PC", value: ".321" },
      { rank: 2, name: "B. Vance", teamId: "BM", teamAbbr: "BM", value: ".308" },
      { rank: 3, name: "T. Crowe", teamId: "ST", teamAbbr: "ST", value: ".299" },
    ] },
    { stat: "Home Runs", entries: [
      { rank: 1, name: "B. Vance", teamId: "BM", teamAbbr: "BM", value: "31" },
      { rank: 2, name: "T. Crowe", teamId: "ST", teamAbbr: "ST", value: "24" },
      { rank: 3, name: "H. Drake", teamId: "PC", teamAbbr: "PC", value: "22" },
    ] },
    { stat: "RBI", entries: [
      { rank: 1, name: "B. Vance", teamId: "BM", teamAbbr: "BM", value: "92" },
      { rank: 2, name: "H. Drake", teamId: "PC", teamAbbr: "PC", value: "78" },
      { rank: 3, name: "T. Crowe", teamId: "ST", teamAbbr: "ST", value: "71" },
    ] },
    { stat: "Stolen Bases", entries: [
      { rank: 1, name: "D. Okoye", teamId: "PC", teamAbbr: "PC", value: "28" },
      { rank: 2, name: "S. Park", teamId: "RR", teamAbbr: "RR", value: "19" },
      { rank: 3, name: "K. Bowman", teamId: "CC", teamAbbr: "CC", value: "17" },
    ] },
    { stat: "WAR", entries: [
      { rank: 1, name: "B. Vance", teamId: "BM", teamAbbr: "BM", value: "6.4" },
      { rank: 2, name: "D. Okoye", teamId: "PC", teamAbbr: "PC", value: "6.1" },
      { rank: 3, name: "T. Crowe", teamId: "ST", teamAbbr: "ST", value: "5.7" },
    ] },
  ],
  pitchingLeaders: [
    { stat: "ERA", entries: [
      { rank: 1, name: "C. Vesper", teamId: "BM", teamAbbr: "BM", value: "2.18" },
      { rank: 2, name: "R. Fenomeno", teamId: "PC", teamAbbr: "PC", value: "2.74" },
      { rank: 3, name: "M. Roan", teamId: "DV", teamAbbr: "DV", value: "3.01" },
    ] },
    { stat: "Wins", entries: [
      { rank: 1, name: "C. Vesper", teamId: "BM", teamAbbr: "BM", value: "15" },
      { rank: 2, name: "R. Fenomeno", teamId: "PC", teamAbbr: "PC", value: "13" },
      { rank: 3, name: "M. Roan", teamId: "DV", teamAbbr: "DV", value: "12" },
    ] },
    { stat: "Strikeouts", entries: [
      { rank: 1, name: "C. Vesper", teamId: "BM", teamAbbr: "BM", value: "214" },
      { rank: 2, name: "R. Fenomeno", teamId: "PC", teamAbbr: "PC", value: "188" },
      { rank: 3, name: "M. Roan", teamId: "DV", teamAbbr: "DV", value: "171" },
    ] },
    { stat: "Saves", entries: [
      { rank: 1, name: "M. Reyes", teamId: "PC", teamAbbr: "PC", value: "24" },
      { rank: 2, name: "S. Knox", teamId: "DV", teamAbbr: "DV", value: "21" },
      { rank: 3, name: "M. Childs", teamId: "ST", teamAbbr: "ST", value: "18" },
    ] },
    { stat: "WAR", entries: [
      { rank: 1, name: "C. Vesper", teamId: "BM", teamAbbr: "BM", value: "6.6" },
      { rank: 2, name: "R. Fenomeno", teamId: "PC", teamAbbr: "PC", value: "5.9" },
      { rank: 3, name: "M. Roan", teamId: "DV", teamAbbr: "DV", value: "5.4" },
    ] },
  ],
  trophyCase: [
    { label: "Reigning champs", holder: "Brass Monkeys", teamId: "BM" },
    { label: "Last season MVP", holder: "Boomer Vance · BM", teamId: "BM" },
    { label: "Last season Cy Young", holder: "Cole Vesper · BM", teamId: "BM" },
    { label: "Franchise wins record", holder: "Page Capitals · 104", teamId: "PC" },
  ],
};

/* Per-club ballparks. The real adapter feeds these from
 * buildFranchiseStadiumFoundationReport (spray rows + summary), seed ParkFactors,
 * and the franchise stadium-records catalog. */
const STADIUM_PC: StadiumVM = {
  name: "Page Capitals Park", nickname: "The Yard", city: "Caldwell",
  archetype: "Bandbox · Hitter's Park",
  dims: { lf: 330, cf: 400, rf: 325 },
  factors: { overall: 1.05, runs: 1.06, hr: 1.10, confidence: "LOW", source: "SEED" },
  homeParkRival: { teamId: "BM", teamAbbr: "BM", record: "5–2 here", note: "broke 2 park records" },
  aggregates: [
    { label: "HR hit here", value: "104" },
    { label: "Runs / game", value: "5.4" },
    { label: "Avg. game", value: "2h 41m" },
    { label: "Sellouts", value: "12" },
  ],
  performers: [
    { label: "Best hitter here", name: "B. Vance", teamId: "BM", teamAbbr: "BM", value: "1.140 OPS", kind: "good" },
    { label: "Worst hitter here", name: "G. Hale", teamId: "RR", teamAbbr: "RR", value: ".148 AVG", kind: "bad" },
    { label: "Best pitcher here", name: "R. Fenomeno", teamId: "PC", teamAbbr: "PC", value: "1.62 ERA", kind: "good" },
    { label: "Worst pitcher here", name: "S. Knox", teamId: "DV", teamAbbr: "DV", value: "9.00 ERA", kind: "bad" },
  ],
  opponents: [
    { teamId: "BM", teamAbbr: "BM", record: "5–2", note: "owns it" },
    { teamId: "RR", teamAbbr: "RR", record: "2–5" },
    { teamId: "SG", teamAbbr: "SG", record: "1–4" },
    { teamId: "ST", teamAbbr: "ST", record: "1–2" },
  ],
  spray: [
    {
      role: "batting",
      dots: mkSpray([
        ["pull", "deep", "HR", 6], ["pull_center", "deep", "HR", 4], ["center", "deep", "HR", 4], ["oppo_center", "deep", "HR", 2], ["oppo", "deep", "HR", 2],
        ["pull", "medium", "2B", 4], ["pull_center", "medium", "2B", 3], ["center", "deep", "2B", 2], ["oppo_center", "medium", "2B", 3], ["oppo", "medium", "3B", 2],
        ["pull", "shallow", "1B", 3], ["pull_center", "shallow", "1B", 3], ["center", "shallow", "1B", 4], ["oppo_center", "shallow", "1B", 3], ["oppo", "shallow", "1B", 3], ["center", "medium", "1B", 2],
        ["pull", "infield", "OUT", 4], ["center", "infield", "OUT", 3], ["oppo", "infield", "OUT", 3], ["pull", "shallow", "OUT", 3], ["center", "medium", "OUT", 4], ["oppo_center", "deep", "OUT", 3], ["pull_center", "deep", "OUT", 2],
        ["foul_left", "shallow", "OUT", 2], ["foul_right", "shallow", "OUT", 2],
      ]),
      stats: [{ label: "Batted balls", value: "92" }, { label: "Home runs", value: "18" }, { label: "Pulled", value: "44%" }],
      note: "Power Club through and through — pulls and elevates. Eighteen of ninety-two batted balls left the yard, two-thirds of them to the pull side.",
    },
    {
      role: "pitching",
      dots: mkSpray([
        ["pull", "deep", "HR", 2], ["center", "deep", "HR", 3], ["oppo", "deep", "HR", 2],
        ["center", "medium", "2B", 3], ["oppo_center", "medium", "2B", 2], ["pull", "medium", "2B", 2],
        ["pull", "shallow", "1B", 3], ["center", "shallow", "1B", 4], ["oppo", "shallow", "1B", 3], ["oppo_center", "shallow", "1B", 2],
        ["pull", "infield", "OUT", 5], ["center", "infield", "OUT", 4], ["oppo", "infield", "OUT", 4], ["center", "medium", "OUT", 5], ["pull_center", "deep", "OUT", 3], ["oppo", "medium", "OUT", 3],
      ]),
      stats: [{ label: "Balls in play", value: "88" }, { label: "HR allowed", value: "7" }, { label: "Grounders", value: "51%" }],
      note: "The staff lives down in the zone — more than half the contact stays on the infield, and only seven balls have cleared a fence here.",
    },
    {
      role: "fielding",
      dots: mkSpray([
        ["pull", "infield", "OUT", 6], ["center", "infield", "OUT", 6], ["oppo", "infield", "OUT", 6], ["pull_center", "infield", "OUT", 4], ["oppo_center", "infield", "OUT", 4],
        ["pull", "shallow", "OUT", 4], ["center", "shallow", "OUT", 4], ["oppo", "shallow", "OUT", 4],
        ["center", "medium", "OUT", 4], ["pull", "medium", "OUT", 3], ["oppo", "medium", "OUT", 3],
        ["pull", "deep", "OUT", 2], ["center", "deep", "OUT", 3], ["oppo", "deep", "OUT", 2],
        ["pull", "infield", "ERR", 1], ["center", "shallow", "ERR", 1],
      ]),
      stats: [{ label: "Plays made", value: "70" }, { label: "Errors", value: "2" }, { label: "Fielding", value: ".971" }],
      note: "Glove-first club: seventy plays logged at The Yard, only two of them misplayed.",
    },
  ],
  records: [
    { label: "Longest home run", value: "471 ft", holder: "Boomer Vance · BM", note: "Week 7 — onto Landsdowne St." },
    { label: "Most HR, one game", value: "7", holder: "Page vs Sand Gnats", note: "Week 4" },
    { label: "Most runs, one game", value: "17", holder: "vs Sand Gnats", note: "Week 4" },
    { label: "Wildest slugfest", value: "29", holder: "PC 17, Gnats 12" },
    { label: "Biggest blowout", value: "+15", holder: "vs Harbor Bandits" },
    { label: "Longest game", value: "14 inn", holder: "vs Steel Tides", note: "4h 52m" },
    { label: "Biggest comeback", value: "down 6", holder: "beat Delta Vipers, Wk 6" },
    { label: "Most batted balls", value: "41", holder: "Dash Okoye" },
    { label: "No-hitters", value: "1", holder: "Fenomeno vs River Rats", note: "Week 9" },
    { label: "Perfect games", value: "—", holder: "none yet at The Yard" },
  ],
};

const STADIUM_BM: StadiumVM = {
  name: "Brass Monkeys Field", nickname: "The Foundry", city: "Steelton",
  archetype: "Pitcher's Cavern",
  dims: { lf: 345, cf: 410, rf: 340 },
  factors: { overall: 0.93, runs: 0.91, hr: 0.87, confidence: "MEDIUM", source: "SEED" },
  homeParkRival: { teamId: "PC", teamAbbr: "PC", record: "3–4 here", note: "only club to take a series" },
  aggregates: [
    { label: "HR hit here", value: "61" },
    { label: "Runs / game", value: "4.2" },
    { label: "Avg. game", value: "2h 28m" },
    { label: "Shutouts", value: "9" },
  ],
  performers: [
    { label: "Best pitcher here", name: "C. Vesper", teamId: "BM", teamAbbr: "BM", value: "1.41 ERA", kind: "good" },
    { label: "Best hitter here", name: "B. Vance", teamId: "BM", teamAbbr: "BM", value: ".980 OPS", kind: "good" },
    { label: "Worst hitter here", name: "K. Bowman", teamId: "CC", teamAbbr: "CC", value: ".131 AVG", kind: "bad" },
    { label: "Worst pitcher here", name: "A. Lund", teamId: "RR", teamAbbr: "RR", value: "8.31 ERA", kind: "bad" },
  ],
  opponents: [
    { teamId: "PC", teamAbbr: "PC", record: "3–4", note: "took a series" },
    { teamId: "CC", teamAbbr: "CC", record: "0–6" },
    { teamId: "ST", teamAbbr: "ST", record: "2–4" },
    { teamId: "DV", teamAbbr: "DV", record: "1–3" },
  ],
  spray: [
    {
      role: "batting",
      dots: mkSpray([
        ["pull", "deep", "HR", 3], ["center", "deep", "HR", 4], ["oppo", "deep", "HR", 2],
        ["pull", "medium", "2B", 4], ["center", "medium", "2B", 4], ["oppo_center", "deep", "2B", 3],
        ["pull", "shallow", "1B", 4], ["center", "shallow", "1B", 5], ["oppo", "shallow", "1B", 4], ["oppo_center", "shallow", "1B", 3],
        ["pull", "infield", "OUT", 4], ["center", "infield", "OUT", 4], ["oppo", "infield", "OUT", 4], ["center", "medium", "OUT", 4], ["pull_center", "deep", "OUT", 3], ["oppo", "deep", "OUT", 3],
      ]),
      stats: [{ label: "Batted balls", value: "80" }, { label: "Home runs", value: "9" }, { label: "Pulled", value: "37%" }],
      note: "The Foundry is a graveyard for fly balls — deep fences swallow drives that leave other yards. Doubles, not homers, are the currency here.",
    },
    {
      role: "pitching",
      dots: mkSpray([
        ["center", "deep", "HR", 2], ["pull", "deep", "HR", 1],
        ["center", "medium", "2B", 2], ["oppo", "medium", "2B", 2],
        ["pull", "shallow", "1B", 3], ["center", "shallow", "1B", 3], ["oppo", "shallow", "1B", 2],
        ["pull", "infield", "OUT", 6], ["center", "infield", "OUT", 6], ["oppo", "infield", "OUT", 5], ["center", "medium", "OUT", 5], ["pull_center", "deep", "OUT", 4], ["oppo", "deep", "OUT", 4],
      ]),
      stats: [{ label: "Balls in play", value: "85" }, { label: "HR allowed", value: "3" }, { label: "Grounders", value: "55%" }],
      note: "Best run-prevention park in the league: a stingy staff in front of deep walls. Three home runs allowed all season.",
    },
    {
      role: "fielding",
      dots: mkSpray([
        ["pull", "infield", "OUT", 6], ["center", "infield", "OUT", 7], ["oppo", "infield", "OUT", 6], ["pull_center", "infield", "OUT", 5],
        ["center", "shallow", "OUT", 5], ["pull", "shallow", "OUT", 4], ["oppo", "shallow", "OUT", 4],
        ["center", "medium", "OUT", 4], ["pull", "deep", "OUT", 3], ["center", "deep", "OUT", 4], ["oppo", "deep", "OUT", 3],
        ["oppo", "shallow", "ERR", 1],
      ]),
      stats: [{ label: "Plays made", value: "76" }, { label: "Errors", value: "1" }, { label: "Fielding", value: ".987" }],
      note: "Pitching & defense, by the numbers — seventy-six plays, a single error all year.",
    },
  ],
  records: [
    { label: "Longest home run", value: "418 ft", holder: "Tio Marsh · BM", note: "a rocket, for here" },
    { label: "Most runs, one game", value: "12", holder: "vs Cactus Cats" },
    { label: "Lowest-scoring win", value: "1–0", holder: "Vesper, 14 K" },
    { label: "Biggest blowout", value: "+11", holder: "vs Harbor Bandits" },
    { label: "Most contact faced", value: "44", holder: "Cole Vesper" },
    { label: "Most plays made", value: "58", holder: "Tio Marsh" },
    { label: "No-hitters", value: "1", holder: "Vesper vs Cactus Cats" },
    { label: "Perfect games", value: "—", holder: "none yet" },
    { label: "Longest scoreless streak", value: "23 inn", holder: "the staff, Weeks 6–7" },
  ],
};

const STADIUM_RR: StadiumVM = {
  name: "River Rats Stadium", nickname: "The Levee", city: "Marsh Bend",
  archetype: "Neutral · Gap Park",
  dims: { lf: 335, cf: 405, rf: 330 },
  factors: { overall: 1.00, runs: 1.01, hr: 0.96, confidence: "LOW", source: "SEED" },
  homeParkRival: { teamId: "SG", teamAbbr: "SG", record: "4–3 here", note: "the Gnats love these gaps" },
  aggregates: [
    { label: "HR hit here", value: "78" },
    { label: "Runs / game", value: "5.0" },
    { label: "Triples here", value: "31" },
    { label: "Avg. game", value: "2h 36m" },
  ],
  performers: [
    { label: "Best hitter here", name: "S. Park", teamId: "RR", teamAbbr: "RR", value: ".352 AVG", kind: "good" },
    { label: "Worst hitter here", name: "C. Vane", teamId: "PC", teamAbbr: "PC", value: ".121 AVG", kind: "bad" },
    { label: "Best pitcher here", name: "M. Roan", teamId: "DV", teamAbbr: "DV", value: "2.04 ERA", kind: "good" },
    { label: "Worst pitcher here", name: "S. Booker", teamId: "RR", teamAbbr: "RR", value: "7.45 ERA", kind: "bad" },
  ],
  opponents: [
    { teamId: "SG", teamAbbr: "SG", record: "4–3", note: "owns it" },
    { teamId: "PC", teamAbbr: "PC", record: "2–3" },
    { teamId: "CC", teamAbbr: "CC", record: "2–2" },
    { teamId: "HB", teamAbbr: "HB", record: "3–1" },
  ],
  spray: [
    {
      role: "batting",
      dots: mkSpray([
        ["pull", "deep", "HR", 3], ["center", "deep", "HR", 3], ["oppo", "deep", "HR", 1],
        ["pull", "medium", "2B", 3], ["oppo_center", "deep", "3B", 3], ["center", "deep", "3B", 2], ["pull_center", "medium", "2B", 2],
        ["pull", "shallow", "1B", 5], ["center", "shallow", "1B", 6], ["oppo", "shallow", "1B", 5], ["oppo_center", "shallow", "1B", 4], ["pull_center", "shallow", "1B", 3],
        ["pull", "infield", "OUT", 5], ["center", "infield", "OUT", 4], ["oppo", "infield", "OUT", 4], ["center", "medium", "OUT", 3], ["oppo", "deep", "OUT", 3],
      ]),
      stats: [{ label: "Batted balls", value: "78" }, { label: "Home runs", value: "9" }, { label: "Triples", value: "5" }],
      note: "Speed & Glove plays small ball at The Levee — slap singles and leg out triples into the big gaps rather than swing for the seats.",
    },
    {
      role: "pitching",
      dots: mkSpray([
        ["pull", "deep", "HR", 3], ["center", "deep", "HR", 3], ["oppo", "deep", "HR", 2],
        ["center", "medium", "2B", 3], ["pull", "medium", "2B", 3], ["oppo", "deep", "3B", 2],
        ["pull", "shallow", "1B", 4], ["center", "shallow", "1B", 4], ["oppo", "shallow", "1B", 4],
        ["pull", "infield", "OUT", 4], ["center", "infield", "OUT", 4], ["oppo", "infield", "OUT", 3], ["center", "medium", "OUT", 4], ["pull_center", "deep", "OUT", 3],
      ]),
      stats: [{ label: "Balls in play", value: "82" }, { label: "HR allowed", value: "8" }, { label: "Grounders", value: "46%" }],
      note: "A middling staff in a fair park — the bats, not the arms, decide River Rats games.",
    },
    {
      role: "fielding",
      dots: mkSpray([
        ["pull", "infield", "OUT", 6], ["center", "infield", "OUT", 6], ["oppo", "infield", "OUT", 6], ["pull_center", "infield", "OUT", 4], ["oppo_center", "infield", "OUT", 4],
        ["center", "shallow", "OUT", 4], ["pull", "shallow", "OUT", 4], ["oppo", "shallow", "OUT", 3],
        ["center", "medium", "OUT", 4], ["pull", "deep", "OUT", 3], ["oppo", "deep", "OUT", 3], ["center", "deep", "OUT", 3],
        ["pull", "shallow", "ERR", 1], ["oppo", "infield", "ERR", 1],
      ]),
      stats: [{ label: "Plays made", value: "72" }, { label: "Web gems", value: "6" }, { label: "Fielding", value: ".972" }],
      note: "Rangy gloves cover the big outfield — six highlight-reel grabs and counting.",
    },
  ],
  records: [
    { label: "Longest home run", value: "455 ft", holder: "Sol Park · RR", note: "to the gap and gone" },
    { label: "Most runs, one game", value: "14", holder: "vs Harbor Bandits" },
    { label: "Wildest slugfest", value: "26", holder: "RR 14, Bandits 12" },
    { label: "Most triples, one game", value: "4", holder: "Sol Park & co." },
    { label: "Most batted balls", value: "39", holder: "Sol Park" },
    { label: "Most plays made", value: "49", holder: "Sol Park" },
    { label: "No-hitters", value: "—", holder: "none yet" },
    { label: "Perfect games", value: "—", holder: "none yet" },
    { label: "Longest hit streak", value: "18 g", holder: "Sol Park" },
  ],
};

/* Two contrasting player dossiers (the drawer payload). The real adapter feeds
 * these from mergeRatingsOverlays (base→current), FranchiseTrueValueSnapshotRow
 * (sparkline), FranchiseTraitOverlayRow (timeline), the morale history, the
 * relationship edges, and FranchiseFameRecordRow. */
const DETAIL_FENOMENO: PlayerDetailVM = {
  age: 23, bats: "R", throws: "R", grade: "A−",
  bio: "The kid the Capitals stole in the draft — pitching his way up the grades in real time.",
  designationEffect: "Ace: anchors the rotation — his starts carry extra leverage weight.",
  nickname: "The Kid",
  careerPhase: "Development",
  mojo: { label: "Jacked", tone: "up" },
  fitness: { label: "Fit" },
  personality: "Competitive",
  modifiers: [
    { label: "Loyalty", value: 68 },
    { label: "Ambition", value: 84 },
    { label: "Resilience", value: 77 },
    { label: "Charisma", value: 55 },
  ],
  moraleSources: [
    { label: "On the field", value: 9 },
    { label: "Designation", value: 4 },
    { label: "Relationships", value: 2 },
    { label: "Team vibe", value: 3 },
  ],
  careerLine: [
    { label: "Seasons", value: "2" },
    { label: "WAR", value: "9.4" },
    { label: "Wins", value: "24" },
    { label: "K", value: "341" },
    { label: "ERA", value: "2.91" },
  ],
  careerAwards: [
    { label: "All-Star", count: 1 },
    { label: "Pitcher of Week", count: 3 },
  ],
  milestones: [
    { label: "First no-hitter", achieved: true, atLabel: "Wk 9", detail: "vs River Rats" },
    { label: "300 career K", achieved: true, atLabel: "Wk 7" },
    { label: "20-win season", achieved: false, detail: "at 14 — on pace" },
    { label: "Cy Young", achieved: false, detail: "2nd in the race" },
  ],
  valueTrend: [
    { checkpoint: "Draft", value: 980_000 },
    { checkpoint: "CP1", value: 1_060_000 },
    { checkpoint: "CP2", value: 1_180_000 },
    { checkpoint: "CP3", value: 1_310_000 },
    { checkpoint: "Now", value: 1_460_000 },
  ],
  ratings: [
    { label: "Velocity", base: 72, current: 79 },
    { label: "Junk", base: 68, current: 74 },
    { label: "Accuracy", base: 70, current: 71 },
    { label: "Fielding", base: 55, current: 55 },
    { label: "Arm", base: 60, current: 62 },
  ],
  spray: [
    {
      role: "pitching",
      dots: mkSpray([
        ["center", "deep", "HR", 1], ["pull", "deep", "HR", 1],
        ["center", "medium", "2B", 2], ["oppo", "medium", "2B", 1],
        ["pull", "shallow", "1B", 2], ["center", "shallow", "1B", 3], ["oppo", "shallow", "1B", 2],
        ["pull", "infield", "OUT", 5], ["center", "infield", "OUT", 5], ["oppo", "infield", "OUT", 4], ["center", "medium", "OUT", 4], ["pull_center", "deep", "OUT", 3], ["oppo", "deep", "OUT", 2],
      ]),
      stats: [{ label: "Balls in play", value: "42" }, { label: "HR allowed", value: "2" }, { label: "Grounders", value: "57%" }],
      note: "Generates weak contact by the bushel — more than half on the ground, only two balls have left the yard against him.",
    },
    {
      role: "batting",
      dots: mkSpray([
        ["center", "shallow", "1B", 2], ["oppo", "shallow", "1B", 1], ["pull", "shallow", "1B", 1],
        ["pull", "infield", "OUT", 3], ["center", "infield", "OUT", 3], ["oppo", "infield", "OUT", 2], ["center", "shallow", "OUT", 2],
      ]),
      stats: [{ label: "At-bats", value: "18" }, { label: "Hits", value: "4" }, { label: "Avg", value: ".222" }],
      note: "Not helpless with the bat for a pitcher — a few seeing-eye singles up the middle.",
    },
  ],
  traitsCurrent: ["Workhorse", "Magic Hands"],
  traitTimeline: [
    { valence: "gain", trait: "Magic Hands", displaces: "Butter Fingers", atGame: 48 },
    { valence: "gain", trait: "Workhorse", atGame: 22 },
  ],
  ties: [
    { partner: "Milo Reyes", type: "MENTORSHIP", intensity: 0.7, sinceGame: 12 },
    { partner: "Cole Vesper", type: "RIVALRY", intensity: 0.55, sinceGame: 30 },
    { partner: "Dash Okoye", type: "FRIENDSHIP", intensity: 0.6, sinceGame: 5 },
  ],
  fame: {
    heat: 78, immortality: 3, immortalityLabel: "Rising star",
    channels: [
      { label: "wpa spine", value: 34 },
      { label: "iconic", value: 22 },
      { label: "status", value: 12 },
      { label: "defensive", value: 6 },
      { label: "role", value: 4 },
    ],
  },
};

const DETAIL_STAD: PlayerDetailVM = {
  age: 31, bats: "L", throws: "L", grade: "C+",
  bio: "A veteran bat losing his role — and, lately, his cool.",
  nickname: "Larry",
  careerPhase: "Decline",
  retirementNote: "Retirement risk rising",
  mojo: { label: "Rattled", tone: "down" },
  fitness: { label: "Strained", tone: "down" },
  personality: "Egotistical",
  modifiers: [
    { label: "Loyalty", value: 32 },
    { label: "Ambition", value: 61 },
    { label: "Resilience", value: 38 },
    { label: "Charisma", value: 44 },
  ],
  moraleSources: [
    { label: "Manager", value: -9 },
    { label: "Front office", value: -6 },
    { label: "On the field", value: -4 },
    { label: "Snub", value: -7 },
  ],
  careerLine: [
    { label: "Seasons", value: "9" },
    { label: "WAR", value: "28.6" },
    { label: "HR", value: "214" },
    { label: "Hits", value: "1,107" },
    { label: "AVG", value: ".271" },
  ],
  careerAwards: [
    { label: "All-Star", count: 4 },
    { label: "Silver Slugger", count: 2 },
  ],
  milestones: [
    { label: "200 career HR", achieved: true, atLabel: "S8" },
    { label: "1000 career hits", achieved: true, atLabel: "S7" },
    { label: "250 HR", achieved: false, detail: "at 214" },
    { label: "1500 hits", achieved: false, detail: "at 1,107" },
  ],
  valueTrend: [
    { checkpoint: "Draft", value: 690_000 },
    { checkpoint: "CP1", value: 640_000 },
    { checkpoint: "CP2", value: 560_000 },
    { checkpoint: "CP3", value: 480_000 },
    { checkpoint: "Now", value: 420_000 },
  ],
  ratings: [
    { label: "Power", base: 74, current: 70 },
    { label: "Contact", base: 66, current: 61 },
    { label: "Speed", base: 48, current: 44 },
    { label: "Fielding", base: 55, current: 53 },
    { label: "Arm", base: 60, current: 60 },
  ],
  spray: [
    {
      role: "batting",
      dots: mkSpray([
        ["pull", "deep", "HR", 3], ["pull_center", "deep", "HR", 2], ["center", "deep", "HR", 1],
        ["pull", "medium", "2B", 3], ["pull_center", "medium", "2B", 2],
        ["pull", "shallow", "1B", 2], ["center", "shallow", "1B", 2], ["oppo", "shallow", "1B", 1],
        ["pull", "infield", "OUT", 5], ["pull", "shallow", "OUT", 4], ["center", "medium", "OUT", 4], ["pull_center", "deep", "OUT", 3], ["center", "infield", "OUT", 3],
      ]),
      stats: [{ label: "Batted balls", value: "40" }, { label: "Home runs", value: "6" }, { label: "Pull%", value: "58%" }],
      note: "Dead-pull all the way — when he connects it's into right field, but the bat speed isn't what it was.",
    },
    {
      role: "fielding",
      dots: mkSpray([
        ["pull", "medium", "OUT", 3], ["center", "medium", "OUT", 3], ["oppo", "medium", "OUT", 2],
        ["pull", "deep", "OUT", 2], ["center", "deep", "OUT", 2], ["oppo", "deep", "OUT", 2],
        ["pull", "shallow", "OUT", 2],
        ["center", "deep", "ERR", 1], ["pull", "deep", "ERR", 1],
      ]),
      stats: [{ label: "Chances", value: "18" }, { label: "Errors", value: "2" }, { label: "Range", value: "−4" }],
      note: "Range has slipped in left — a couple of catchable balls have fallen, and two clean misplays.",
    },
  ],
  traitsCurrent: ["Mr. Wrong"],
  traitTimeline: [
    { valence: "lose", trait: "Clutch", atGame: 41 },
    { valence: "gain", trait: "Mr. Wrong", displaces: "Utility", atGame: 41 },
  ],
  ties: [
    { partner: "B. Cole (Mgr)", type: "FEUD", intensity: 0.8, sinceGame: 44 },
    { partner: "Cy Vane", type: "FRIENDSHIP", intensity: 0.5, sinceGame: 8 },
    { partner: "Front office", type: "HISTORY", intensity: 0.4, sinceGame: 49, potential: true },
  ],
  fame: {
    heat: 22, immortality: 1, immortalityLabel: "Local",
    channels: [
      { label: "wpa spine", value: 8 },
      { label: "iconic", value: 3 },
      { label: "status", value: 9 },
      { label: "defensive", value: 1 },
      { label: "role", value: 1 },
    ],
  },
};

const HUB: Record<string, HubVM> = {
  PC: {
    standings: LEAGUE,
    almanac: ALMANAC,
    stadium: STADIUM_PC,
    schedule: {
      deadlineNote: "Trade deadline in 6 games — Page is a buyer.",
      upcoming: [
        { date: "Wk 9 · Thu", opponent: "RR", home: true, isNext: true },
        { date: "Wk 9 · Fri", opponent: "BM", home: false },
        { date: "Wk 9 · Sat", opponent: "BM", home: false },
        { date: "Wk 9 · Sun", opponent: "SG", home: true },
        { date: "Wk 10 · Tue", opponent: "ST", home: true },
      ],
      recent: [
        { date: "Wk 9 · Wed", opponent: "RR", home: true, result: { teamScore: 5, oppScore: 2, win: true } },
        { date: "Wk 9 · Tue", opponent: "RR", home: true, result: { teamScore: 4, oppScore: 3, win: true } },
        { date: "Wk 8 · Sun", opponent: "BM", home: false, result: { teamScore: 6, oppScore: 7, win: false } },
        { date: "Wk 8 · Sat", opponent: "BM", home: false, result: { teamScore: 8, oppScore: 3, win: true } },
        { date: "Wk 8 · Fri", opponent: "SG", home: true, result: { teamScore: 9, oppScore: 1, win: true } },
      ],
    },
    checkpoint: {
      number: 3, label: "Checkpoint 3 of 5", pctLabel: "the 60% mark",
      players: [
        { id: "p1", name: "Rafa Fenomeno", position: "SP",
          ratingChanges: [{ label: "Velocity", from: 76, to: 79 }, { label: "Junk", from: 71, to: 74 }],
          traitChanges: [{ valence: "gain", trait: "Magic Hands", displaces: "Butter Fingers" }] },
        { id: "p2", name: "Dash Okoye", position: "CF",
          ratingChanges: [{ label: "Speed", from: 88, to: 90 }, { label: "Contact", from: 79, to: 81 }],
          traitChanges: [] },
        { id: "p4", name: "Lars Stad", position: "LF",
          ratingChanges: [{ label: "Power", from: 72, to: 70 }, { label: "Contact", from: 63, to: 61 }],
          traitChanges: [{ valence: "lose", trait: "Clutch" }] },
        { id: "p5", name: "Cy Vane", position: "C",
          ratingChanges: [{ label: "Fielding", from: 58, to: 55 }],
          traitChanges: [{ valence: "gain", trait: "Butter Fingers", displaces: "Cannon Arm" }] },
      ],
    },
    home: {
      leadStory: { kicker: "The Arc · Season 3, Week 9", headline: "FENOMENO TAKES THE LEAP — ARM CLIMBING TOWARD AN A", body: "Five starts, one earned run. The kid the Capitals stole in the draft is pitching his way up the grades in real time — and Thursday's checkpoint may make it official. \"He doesn't pitch like a B anymore,\" the skipper admitted.", byline: "By J. Tate, Tootwhistle Times" },
      impactCards: [
        { kind: "dated", icon: "🔔", title: "Ratings checkpoint — ready to enter", detail: "The league just shifted: four of your players changed. Tap to enter the new numbers into SMB4.", cta: "open the worklist", action: "checkpoint" },
        { kind: "crisis", icon: "⚠️", title: "Lars Stad — morale cratering (38 ▼)", detail: "Benched again, and the Times floated a trade. He wants out; a move may be coming.", cta: "see the ledger" },
        { kind: "good", icon: "▲", title: "Okoye climbs to #2 in the MVP race", detail: "Two big nights and your center fielder is in the conversation.", cta: "the races" },
      ],
      nextGame: { awayName: "River Rats", awayAbbr: "RR", awayRecord: "44–36", homeName: "Page Capitals", homeAbbr: "PC", homeRecord: "48–32", pulse: (<>Clubhouse <b>buzzing</b> · fans <b style={{ color: "#F2C041" }}>62 ▲</b> · 2.0 back of 1st</>) },
    },
    news: {
      editionLabel: "Season 3 · Week 9", volumeLabel: "Vol. III — No. 61", priceLabel: "Price: Two Bits",
      lead: { kicker: "Pennant Race", headline: "CAPITALS RIDE FENOMENO TO FOURTH STRAIGHT", body: "Rafa Fenomeno carried a no-hitter into the seventh as Page surged within two of the division-leading Monkeys, sending a sellout crowd home hoarse and happy.", byline: "By J. Tate", dramaticWeight: 0.92 },
      stories: [
        { category: "Trade buzz", headline: "Capitals scouting bullpen help before the deadline", excerpt: "With room under the tax line, Page is \"kicking tires\" on a setup arm.", byline: "Beat report · 2 days ago", dramaticWeight: 0.55 },
        { category: "Clubhouse", headline: "Stad's frustration boils over after another benching", excerpt: "The veteran left fielder wants a clearer role — or a ticket out of town.", byline: "Beat report · 3 days ago", dramaticWeight: 0.74 },
        { category: "On the field", headline: "Okoye's 28 steals quietly lead the league", excerpt: "The leadoff man has been a menace; teams are throwing over more than ever.", byline: "Beat report · 4 days ago", dramaticWeight: 0.38 },
        { category: "The race", headline: "MVP ballots starting to swing Okoye's way", excerpt: "Two big nights vault the center fielder into the top three.", byline: "League notebook · 5 days ago", dramaticWeight: 0.62 },
      ],
      recaps: [
        { date: "Wk 9 · Wed", away: "RR", home: "PC", awayScore: 2, homeScore: 5, headline: "Fenomeno flirts with history in a gem", win: "home" },
        { date: "Wk 9 · Tue", away: "RR", home: "PC", awayScore: 3, homeScore: 4, headline: "Okoye steals home to walk it off", win: "home" },
        { date: "Wk 8 · Sun", away: "PC", home: "BM", awayScore: 6, homeScore: 7, headline: "Capitals fall in a Foundry slugfest", win: "home" },
        { date: "Wk 8 · Sat", away: "PC", home: "BM", awayScore: 8, homeScore: 3, headline: "Page bats erupt to split the set", win: "away" },
        { date: "Wk 8 · Fri", away: "SG", home: "PC", awayScore: 1, homeScore: 9, headline: "Drake's grand slam buries the Gnats", win: "home" },
      ],
    },
    pulse: {
      fanMorale: { value: 62, trend: "up", history: [
        { delta: 6, reason: "Walk-off win over the rival", week: "Week 8" },
        { delta: -4, reason: "Three-game skid on the road", week: "Week 6" },
        { delta: 8, reason: "Signed a fan-favorite at the deadline", week: "Week 5" },
      ] },
      payrollLabel: "$5.42M · 22", clubhouseLabel: "Buzzing", clubhouseAvg: 58, standingLabel: "48–32 · 2nd East",
    },
    roster: [
      { id: "p1", number: "21", position: "SP", name: "Rafa Fenomeno", war: 5.8, salary: 1_200_000, trueValue: 1_460_000, valueGap: 260_000, designation: { label: "★ Ace", kind: "gold" }, morale: { value: 74, state: "Locked in · ▲ rising", trend: "up", arc: "up from 66 over 3 weeks · baseline 50", history: [
        { delta: 5, reason: "Complete-game shutout", week: "Week 8" },
        { delta: 4, reason: "Named pitcher of the week", week: "Week 7" },
      ] }, detail: DETAIL_FENOMENO },
      { id: "p2", number: "7", position: "CF", name: "Dash Okoye", war: 5.1, salary: 960_000, trueValue: 1_310_000, valueGap: 350_000, designation: { label: "MVP", kind: "gold" }, morale: { value: 69, state: "Happy · ▲ rising", trend: "up", history: [
        { delta: 3, reason: "20th stolen base", week: "Week 8" },
      ] } },
      { id: "p3", number: "3", position: "1B", name: "Hank Drake", war: 4.4, salary: 840_000, trueValue: 770_000, valueGap: -70_000, morale: { value: 53, state: "Steady", trend: "flat", history: [] } },
      { id: "p4", number: "28", position: "LF", name: "Lars Stad", war: 2.7, salary: 610_000, trueValue: 420_000, valueGap: -190_000, morale: { value: 38, state: "Frustrated · ▼ falling", trend: "down", arc: "down from 51 over 3 weeks · baseline 50", history: [
        { delta: -9, reason: "Benched against a lefty in the opener", week: "Week 8 · Mgr decision" },
        { delta: -6, reason: "Trade rumor in the Tootwhistle Times", week: "Week 7 · Front office" },
        { delta: 4, reason: "Walk-off homer vs River Rats", week: "Week 6 · On the field" },
        { delta: -7, reason: "Passed over for the All-Star nod", week: "Week 5 · League" },
      ] }, detail: DETAIL_STAD },
      { id: "p5", number: "44", position: "C", name: "Cy Vane", war: 0.4, salary: 1_400_000, trueValue: 300_000, valueGap: -1_100_000, designation: { label: "Albatross", kind: "albatross" }, morale: { value: 41, state: "Sulking · ▼ falling", trend: "down", history: [
        { delta: -5, reason: "Lost the starting job", week: "Week 7" },
      ] } },
      { id: "p6", number: "11", position: "CP", name: "Milo Reyes", war: 2.9, salary: 410_000, trueValue: 660_000, valueGap: 250_000, designation: { label: "Fan Fav", kind: "gold" }, morale: { value: 66, state: "Happy · ▲ rising", trend: "up", history: [] } },
    ],
  },
  BM: {
    standings: LEAGUE,
    almanac: ALMANAC,
    stadium: STADIUM_BM,
    schedule: {
      upcoming: [
        { date: "Wk 9 · Thu", opponent: "DV", home: true, isNext: true },
        { date: "Wk 9 · Fri", opponent: "PC", home: true },
        { date: "Wk 9 · Sat", opponent: "PC", home: true },
        { date: "Wk 10 · Tue", opponent: "ST", home: false },
      ],
      recent: [
        { date: "Wk 9 · Wed", opponent: "CC", home: true, result: { teamScore: 1, oppScore: 0, win: true } },
        { date: "Wk 9 · Tue", opponent: "CC", home: true, result: { teamScore: 6, oppScore: 2, win: true } },
        { date: "Wk 8 · Sun", opponent: "PC", home: true, result: { teamScore: 7, oppScore: 6, win: true } },
      ],
    },
    home: {
      leadStory: { kicker: "Season 3, Week 9", headline: "VESPER MAKES HIS CY YOUNG CASE AS MONKEYS PULL AWAY", body: "A 2.18 ERA and a fourteen-strikeout gem have the Brass ace atop every ballot — and the East comfortably in hand.", byline: "By D. Hale, Tootwhistle Times" },
      impactCards: [
        { kind: "good", icon: "🏆", title: "Magic number down to nine", detail: "First place is nearly clinched in the East.", cta: "the races" },
        { kind: "dated", icon: "🔔", title: "Ratings checkpoint in 2 games", detail: "A league-wide development sweep is coming up.", cta: "opens at the break" },
      ],
      nextGame: { awayName: "Page Capitals", awayAbbr: "PC", awayRecord: "48–32", homeName: "Brass Monkeys", homeAbbr: "BM", homeRecord: "50–30", pulse: (<>Clubhouse <b>confident</b> · fans <b style={{ color: "#F2C041" }}>71 ▲</b> · 1st in the East</>) },
    },
    news: { editionLabel: "Season 3 · Week 9", volumeLabel: "Vol. III — No. 61", lead: { kicker: "Coronation", headline: "VESPER STAKES HIS CY YOUNG CLAIM AS MONKEYS ROLL", body: "A fourteen-strikeout gem dropped the ace's ERA to 2.18 and pushed the magic number into single digits.", byline: "By D. Hale", dramaticWeight: 0.85 }, stories: [
      { category: "The race", headline: "Magic number down to nine in the East", excerpt: "First place is all but wrapped up.", byline: "League notebook · 1 day ago", dramaticWeight: 0.7 },
      { category: "Clubhouse", headline: "A confident room eyes the postseason", excerpt: "The Brass are loose, healthy, and rolling.", byline: "Beat report · 3 days ago", dramaticWeight: 0.45 },
    ], recaps: [
      { date: "Wk 9 · Wed", away: "CC", home: "BM", awayScore: 0, homeScore: 1, headline: "Vesper's 14 K's win a 1–0 duel", win: "home" },
      { date: "Wk 9 · Tue", away: "CC", home: "BM", awayScore: 2, homeScore: 6, headline: "Vance goes deep twice", win: "home" },
      { date: "Wk 8 · Sun", away: "PC", home: "BM", awayScore: 6, homeScore: 7, headline: "Monkeys outlast Page in a slugfest", win: "home" },
    ] },
    pulse: { fanMorale: { value: 71, trend: "up", history: [{ delta: 5, reason: "First place clinched the week", week: "Week 8" }] }, payrollLabel: "$6.10M · 22", clubhouseLabel: "Confident", clubhouseAvg: 64, standingLabel: "50–30 · 1st East" },
    roster: [
      { id: "b1", number: "9", position: "SP", name: "Cole Vesper", war: 6.2, salary: 1_500_000, trueValue: 1_700_000, valueGap: 200_000, designation: { label: "★ Ace", kind: "gold" }, morale: { value: 78, state: "Locked in · ▲ rising", trend: "up", history: [{ delta: 6, reason: "14-strikeout gem", week: "Week 8" }] } },
      { id: "b2", number: "24", position: "RF", name: "Boomer Vance", war: 4.9, salary: 1_100_000, trueValue: 1_250_000, valueGap: 150_000, designation: { label: "MVP", kind: "gold" }, morale: { value: 70, state: "Happy", trend: "flat", history: [] } },
      { id: "b3", number: "5", position: "SS", name: "Tio Marsh", war: 3.3, salary: 720_000, trueValue: 640_000, valueGap: -80_000, morale: { value: 55, state: "Steady", trend: "flat", history: [] } },
    ],
  },
  RR: {
    standings: LEAGUE,
    almanac: ALMANAC,
    stadium: STADIUM_RR,
    schedule: {
      deadlineNote: "Trade deadline in 6 games — sellers? The GM says not yet.",
      upcoming: [
        { date: "Wk 9 · Thu", opponent: "PC", home: false, isNext: true },
        { date: "Wk 9 · Fri", opponent: "SG", home: true },
        { date: "Wk 10 · Tue", opponent: "CC", home: false },
      ],
      recent: [
        { date: "Wk 9 · Wed", opponent: "PC", home: false, result: { teamScore: 2, oppScore: 5, win: false } },
        { date: "Wk 9 · Tue", opponent: "PC", home: false, result: { teamScore: 3, oppScore: 4, win: false } },
        { date: "Wk 8 · Sun", opponent: "SG", home: true, result: { teamScore: 2, oppScore: 5, win: false } },
        { date: "Wk 8 · Sat", opponent: "SG", home: true, result: { teamScore: 7, oppScore: 1, win: true } },
      ],
    },
    home: {
      leadStory: { kicker: "Season 3, Week 9", headline: "RATS SLIP OUT OF THE WILD-CARD PICTURE", body: "A four-game skid has dropped River Rats below the line, and the front office is fielding calls. \"We're not sellers yet,\" the GM insisted — for now.", byline: "By G. Ruiz, Tootwhistle Times" },
      impactCards: [
        { kind: "crisis", icon: "⚠️", title: "Gus Hale — 0-for-18 and pressing", detail: "Your left fielder's morale is sliding with the slump.", cta: "see the ledger" },
        { kind: "info", icon: "🔻", title: "Two games back of the wild card", detail: "The next homestand matters.", cta: "standings" },
      ],
      nextGame: { awayName: "Sand Gnats", awayAbbr: "SG", awayRecord: "39–41", homeName: "River Rats", homeAbbr: "RR", homeRecord: "44–36", pulse: (<>Clubhouse <b>restless</b> · fans <b style={{ color: "#CC3433" }}>49 ▼</b> · 6.0 back</>) },
    },
    news: { editionLabel: "Season 3 · Week 9", volumeLabel: "Vol. III — No. 61", lead: { kicker: "Slump", headline: "RATS SLIDE OUT OF THE WILD-CARD PICTURE", body: "A four-game skid has the front office fielding calls and the clubhouse pressing.", byline: "By G. Ruiz", dramaticWeight: 0.8 }, stories: [
      { category: "Clubhouse", headline: "Hale's 0-for-18 weighs on a restless room", excerpt: "The left fielder is pressing as the losses mount.", byline: "Beat report · 2 days ago", dramaticWeight: 0.68 },
      { category: "Front office", headline: "\"We're not sellers yet,\" GM insists", excerpt: "For now, River Rats are holding — but the deadline looms.", byline: "Beat report · 4 days ago", dramaticWeight: 0.5 },
    ], recaps: [
      { date: "Wk 9 · Wed", away: "RR", home: "PC", awayScore: 2, homeScore: 5, headline: "Rats stranded in the opener", win: "home" },
      { date: "Wk 9 · Tue", away: "RR", home: "PC", awayScore: 3, homeScore: 4, headline: "Walk-off sinks River Rats", win: "home" },
      { date: "Wk 8 · Sun", away: "SG", home: "RR", awayScore: 5, homeScore: 2, headline: "Gnats hand the Rats a fourth straight loss", win: "away" },
      { date: "Wk 8 · Sat", away: "SG", home: "RR", awayScore: 1, homeScore: 7, headline: "Park's three hits snap the skid briefly", win: "home" },
    ] },
    pulse: { fanMorale: { value: 49, trend: "down", history: [{ delta: -6, reason: "Fell out of the wild-card spot", week: "Week 8" }] }, payrollLabel: "$4.30M · 22", clubhouseLabel: "Restless", clubhouseAvg: 47, standingLabel: "44–36 · 3rd East" },
    roster: [
      { id: "r1", number: "2", position: "2B", name: "Sol Park", war: 3.8, salary: 680_000, trueValue: 710_000, valueGap: 30_000, morale: { value: 52, state: "Steady", trend: "flat", history: [] } },
      { id: "r2", number: "17", position: "LF", name: "Gus Hale", war: 2.1, salary: 540_000, trueValue: 410_000, valueGap: -130_000, morale: { value: 44, state: "Frustrated · ▼ falling", trend: "down", history: [{ delta: -5, reason: "0-for-18 cold streak", week: "Week 8" }] } },
    ],
  },
};

export function FranchiseLensPreview() {
  const [teamId, setTeamId] = useState("PC");
  const active = ACTIVE[teamId];
  const hub = useMemo(() => HUB[teamId], [teamId]);
  return <FranchiseLensHub teams={PICKER} active={active} hub={hub} onSelectTeam={setTeamId} />;
}

export default FranchiseLensPreview;
