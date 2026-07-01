/**
 * franchiseLensDemoSeed — DEV/TEST-ONLY shared seed for the franchise-lens demo.
 *
 * Writes a small complete league inline (6 teams × 22 MLB + 10 FARM with an exactly-matching
 * farmRoster + 1 scout each + league template, real SMB4 park names so factors derive) and runs
 * the real initializeFranchise. Mirrors the proven seed in franchiseSetupLaunch.integration.test.ts.
 * Used by both the plain seed harness and the played-season harness.
 */
import {
  saveLeagueTemplate,
  savePlayer,
  saveScoutProfile,
  saveTeam,
  saveTeamRoster,
} from "../../../utils/leagueBuilderStorage";
import { initializeFranchise } from "../../../utils/franchiseInitializer";
import type { FranchiseConfig } from "../../../types/franchise";

type SavePlayerInput = Parameters<typeof savePlayer>[0];
type SaveTeamInput = Parameters<typeof saveTeam>[0];

export const LENS_DEMO_LEAGUE_ID = "lens-demo-league";

// `park` is a REAL SMB4 park name so the franchise init derives park factors from the lookup.
export const LENS_DEMO_TEAMS = [
  { id: "lens-demo-team-1", name: "Boulder Baselines", abbr: "BLD", primary: "#1F6F43", secondary: "#0E2A1A", park: "Apple Field", lf: 310, cf: 398, rf: 302 },
  { id: "lens-demo-team-2", name: "Denver Longnames", abbr: "DEN", primary: "#2D5BA8", secondary: "#10213F", park: "Sakura Hills", lf: 347, cf: 415, rf: 350 },
  { id: "lens-demo-team-3", name: "Apple Field Aces", abbr: "AFA", primary: "#B23B3B", secondary: "#3A1010", park: "Colonial Plaza", lf: 335, cf: 404, rf: 330 },
  { id: "lens-demo-team-4", name: "Sirloin City Cuts", abbr: "SIR", primary: "#C4A853", secondary: "#3A2F12", park: "Swagger Center", lf: 330, cf: 408, rf: 325 },
  { id: "lens-demo-team-5", name: "Keystone Combine", abbr: "KEY", primary: "#5B3FA8", secondary: "#1E1238", park: "Motor Yard", lf: 355, cf: 420, rf: 358 },
  { id: "lens-demo-team-6", name: "Granite Pitchers", abbr: "GRA", primary: "#3A8E8E", secondary: "#103030", park: "Red Rock Park", lf: 365, cf: 425, rf: 368 },
];

export type LensDemoTeam = (typeof LENS_DEMO_TEAMS)[number];

function makePlayer(
  teamId: string,
  index: number,
  primaryPosition: SavePlayerInput["primaryPosition"],
  rosterStatus: "MLB" | "FARM" = "MLB",
): SavePlayerInput {
  const isPitcher = ["SP", "RP", "CP", "SP/RP", "P", "TWO-WAY"].includes(String(primaryPosition));
  return {
    id: `${teamId}-${rosterStatus.toLowerCase()}-${isPitcher ? "p" : "b"}-${index}`,
    firstName: rosterStatus === "FARM" ? `Farm${index}` : isPitcher ? `Pitcher${index}` : `Batter${index}`,
    lastName: teamId.replace("lens-demo-", ""),
    gender: "M",
    jerseyNumber: index,
    age: 24 + ((index * 3) % 14),
    bats: index % 2 === 0 ? "L" : "R",
    throws: isPitcher ? "R" : index % 2 === 0 ? "L" : "R",
    primaryPosition,
    secondaryPosition: isPitcher ? "P" : "IF",
    power: isPitcher ? 20 : 50 + ((index * 3) % 40),
    contact: isPitcher ? 20 : 50 + ((index * 5) % 40),
    speed: isPitcher ? 25 : 45 + ((index * 7) % 45),
    fielding: 55 + ((index * 2) % 30),
    arm: 55 + ((index * 4) % 30),
    velocity: isPitcher ? 65 + ((index * 3) % 30) : 0,
    junk: isPitcher ? 60 + ((index * 5) % 30) : 0,
    accuracy: isPitcher ? 60 + ((index * 7) % 30) : 0,
    arsenal: isPitcher ? ["4F", "SL", "CH"] : [],
    overallGrade: "B",
    personality: "Competitive",
    chemistry: "Competitive",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 800_000 + index * 120_000,
    leagueAssignments: [{ leagueId: LENS_DEMO_LEAGUE_ID, teamId, rosterStatus }],
    isCustom: true,
    sourceDatabase: "lens-demo-seed",
  };
}

async function seedLeagueTeam(team: LensDemoTeam): Promise<void> {
  const teamId = team.id;
  const lineupPositions = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;
  const benchPositions = ["C", "IF", "OF", "1B/OF"] as const;
  const pitcherPositions = ["SP", "SP", "SP", "SP", "RP", "RP", "RP", "CP", "SP/RP"] as const;
  const farmPositions = ["C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "SP", "RP"] as const;

  const batterIds = lineupPositions.map((_, index) => `${teamId}-mlb-b-${index + 1}`);
  const benchIds = benchPositions.map((_, index) => `${teamId}-mlb-b-${lineupPositions.length + index + 1}`);
  const pitcherIds = pitcherPositions.map((_, index) => `${teamId}-mlb-p-${index + 1}`);
  const farmIds = farmPositions.map(
    (position, index) =>
      `${teamId}-farm-${["SP", "RP", "CP", "SP/RP", "P", "TWO-WAY"].includes(position) ? "p" : "b"}-${index + 1}`,
  );
  const starterId = pitcherIds[0];

  const teamRecord: SaveTeamInput = {
    id: teamId,
    name: team.name,
    abbreviation: team.abbr,
    location: team.name,
    nickname: team.name,
    colors: { primary: team.primary, secondary: team.secondary },
    stadium: team.park,
    ballparkNickname: `The ${team.abbr} Yard`,
    stadiumDimensions: {
      name: team.park,
      lf: team.lf,
      cf: team.cf,
      rf: team.rf,
      lfWall: "medium",
      cfWall: "medium",
      rfWall: "high",
    },
    leagueIds: [LENS_DEMO_LEAGUE_ID],
    lineupWithDH: lineupPositions.map((fieldingPosition, index) => ({
      battingOrder: index + 1,
      playerId: batterIds[index],
      fieldingPosition,
    })),
    lineupWithoutDH: [
      ...lineupPositions.slice(0, 8).map((fieldingPosition, index) => ({
        battingOrder: index + 1,
        playerId: batterIds[index],
        fieldingPosition,
      })),
      { battingOrder: 9, playerId: starterId, fieldingPosition: "P" },
    ],
    startingRotation: [starterId],
  };
  await saveTeam(teamRecord);

  for (const [index, position] of lineupPositions.entries()) {
    await savePlayer(makePlayer(teamId, index + 1, position));
  }
  for (const [index, position] of benchPositions.entries()) {
    await savePlayer(makePlayer(teamId, lineupPositions.length + index + 1, position));
  }
  for (const [index, position] of pitcherPositions.entries()) {
    await savePlayer(makePlayer(teamId, index + 1, position));
  }
  for (const [index, position] of farmPositions.entries()) {
    await savePlayer(makePlayer(teamId, index + 1, position, "FARM"));
  }
  await saveScoutProfile({
    id: `${teamId}-scout-1`,
    leagueId: LENS_DEMO_LEAGUE_ID,
    teamId,
    name: `${team.name} Scout`,
    specialties: ["outfield"],
    weaknesses: ["CP"],
    accuracyByPosition: { CF: 84, SP: 80, CP: 55, "1B": 64 },
    seed: `${teamId}:scout:1`,
    hiredPick: { round: 1, pickNumber: 1, teamId },
  });
  await saveTeamRoster({
    teamId,
    mlbRoster: [...batterIds, ...benchIds, ...pitcherIds],
    farmRoster: farmIds,
    lineupWithDH: teamRecord.lineupWithDH ?? [],
    lineupWithoutDH: teamRecord.lineupWithoutDH ?? [],
    startingRotation: [starterId],
    longRelievers: [],
    closingPitcher: pitcherIds[7],
    setupPitchers: [pitcherIds[6]],
    depthChart: {
      C: [], "1B": [], "2B": [], SS: [], "3B": [], LF: [], CF: [], RF: [], DH: [], SP: [], RP: [], CP: [],
    },
    pinchHitOrder: benchIds,
    pinchRunOrder: benchIds,
    defensiveSubOrder: benchIds,
    lastModified: new Date().toISOString(),
  });
}

function makeConfig(gamesPerTeam: number): FranchiseConfig {
  return {
    franchiseName: "Lens Demo Franchise",
    league: LENS_DEMO_LEAGUE_ID,
    leagueDetails: { name: "Lens Demo League", teams: LENS_DEMO_TEAMS.length, conferences: 0, divisions: 0 },
    season: {
      gamesPerTeam,
      inningsPerGame: 9,
      extraInningsRule: "standard",
      scheduleType: "balanced",
      useDH: true,
      allStarGame: false,
      tradeDeadline: false,
      mercyRule: false,
    },
    playoffs: {
      teamsQualifying: 2,
      format: "conference",
      seriesLengths: {
        wildCard: "best-of-3",
        divisionSeries: "best-of-5",
        championship: "best-of-7",
        worldSeries: "best-of-7",
      },
      homeFieldAdvantage: "higher-seed",
    },
    teams: { selectedTeams: [LENS_DEMO_TEAMS[0].id], mode: "single", playerAssignments: {} },
    roster: { mode: "existing" },
  };
}

export interface SeededDemoFranchise {
  franchiseId: string;
  leagueId: string;
  seasonNumber: number;
  gamesPerTeam: number;
}

/** Seed the league + run the real initializeFranchise; returns the generated franchiseId. */
export async function seedDemoFranchise(gamesPerTeam = 30): Promise<SeededDemoFranchise> {
  for (const team of LENS_DEMO_TEAMS) {
    await seedLeagueTeam(team);
  }
  await saveLeagueTemplate({
    id: LENS_DEMO_LEAGUE_ID,
    name: "Lens Demo League",
    teamIds: LENS_DEMO_TEAMS.map((team) => team.id),
    conferences: [],
    divisions: [],
    defaultRulesPreset: "default",
  });
  const franchiseId = await initializeFranchise(makeConfig(gamesPerTeam));
  return { franchiseId, leagueId: LENS_DEMO_LEAGUE_ID, seasonNumber: 1, gamesPerTeam };
}
