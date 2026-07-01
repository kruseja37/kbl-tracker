/**
 * franchiseLensSyntheticGame — DEV-ONLY browser-safe synthetic completed-game generator for the
 * played-season demo seed. Produces a valid PersistedGameState (real franchise player IDs, internally
 * consistent box scores, pitching-derived score) + archiveOptions for processCompletedGame.
 *
 * Per-player "form" trends over the season so True Value / morale drift for the review. Deterministic
 * by gameNumber + player id. NOT production logic — a review fixture only.
 */
import type { Player, Team } from "../../../utils/leagueBuilderStorage";
import type { PersistedGameState } from "../../../utils/gameStorage";

export interface LensTeamSide {
  team: Team;
  positionPlayers: Player[];
  pitchers: Player[];
}

export interface SyntheticGameResult {
  gameState: PersistedGameState;
  finalScore: { away: number; home: number };
  archiveOptions: {
    finalScore: { away: number; home: number };
    seasonId: string;
    context: {
      statsScopeId: string;
      competitionType: "franchise";
      competitionId: string;
      leagueId: string;
      franchiseId: string;
      scheduleGameId: string;
    };
  };
}

const GAME_STARTED_AT = Date.parse("2026-04-01T18:00:00.000Z");

function hashStr(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fullName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

/** 0..1 form that trends up or down across the season (drives True Value / morale drift). */
function formFactor(player: Player, gameNumber: number): number {
  const base = (hashStr(player.id) % 1000) / 1000;
  const trend = (hashStr(`${player.id}:trend`) % 3) - 1; // -1, 0, +1
  return Math.max(0, Math.min(1, 0.35 + base * 0.4 + trend * (gameNumber / 120)));
}

interface BattingLine {
  playerName: string;
  teamId: string;
  pa: number; ab: number; h: number; singles: number; doubles: number; triples: number; hr: number;
  rbi: number; r: number; bb: number; hbp: number; k: number; sb: number; cs: number; sf: number; sh: number;
  gidp: number; putouts: number; assists: number; fieldingErrors: number;
}

function battingLine(player: Player, teamId: string, gameNumber: number, rand: () => number): BattingLine {
  const form = formFactor(player, gameNumber);
  const powerBias = (player.power ?? 50) / 99;
  const contactBias = (player.contact ?? 50) / 99;
  const pa = 4 + (rand() < 0.3 ? 1 : 0);
  const bb = rand() < 0.08 + form * 0.07 ? 1 : 0;
  const ab = pa - bb;
  let h = 0;
  for (let i = 0; i < ab; i += 1) {
    if (rand() < 0.18 + contactBias * 0.16 + form * 0.1) h += 1;
  }
  let hr = 0;
  let doubles = 0;
  let triples = 0;
  for (let i = 0; i < h; i += 1) {
    const roll = rand();
    if (roll < powerBias * 0.28) hr += 1;
    else if (roll < powerBias * 0.28 + 0.16) doubles += 1;
    else if (roll < powerBias * 0.28 + 0.18) triples += 1;
  }
  const singles = Math.max(0, h - hr - doubles - triples);
  const nonHitOuts = ab - h;
  let k = 0;
  for (let i = 0; i < nonHitOuts; i += 1) {
    if (rand() < 0.34 - contactBias * 0.12) k += 1;
  }
  const sb = rand() < ((player.speed ?? 50) / 99) * 0.14 ? 1 : 0;
  return {
    playerName: fullName(player),
    teamId,
    pa, ab, h, singles, doubles, triples, hr,
    rbi: hr + (doubles + triples > 0 && rand() < 0.4 ? 1 : 0),
    r: h > 0 && rand() < 0.4 ? 1 : 0,
    bb, hbp: 0, k, sb, cs: 0, sf: 0, sh: 0, gidp: 0,
    putouts: 0, assists: 0, fieldingErrors: rand() < 0.03 ? 1 : 0,
  };
}

function pitcherLine(
  pitcher: Player,
  teamId: string,
  isStarter: boolean,
  entryInning: number,
  outs: number,
  rand: () => number,
  gameNumber: number,
) {
  const form = formFactor(pitcher, gameNumber);
  const innings = outs / 3;
  const runsAllowed = Math.max(0, Math.round((isStarter ? 3 : 1.5) * (1.3 - form) + (rand() < 0.3 ? 1 : 0)));
  const hitsAllowed = Math.max(runsAllowed, Math.round(innings * (0.9 - form * 0.4) + rand() * 2));
  const walks = Math.round(innings * 0.3 * (1.2 - form));
  const strikeouts = Math.round(innings * (0.9 + form * 0.6));
  const homeRunsAllowed = rand() < 0.3 ? 1 : 0;
  return {
    pitcherId: pitcher.id,
    pitcherName: fullName(pitcher),
    teamId,
    isStarter,
    entryInning,
    outsRecorded: outs,
    hitsAllowed,
    runsAllowed,
    earnedRuns: runsAllowed,
    walksAllowed: walks,
    strikeoutsThrown: strikeouts,
    homeRunsAllowed,
    hitBatters: 0,
    basesReachedViaError: 0,
    wildPitches: 0,
    pitchCount: Math.round(outs * 5.2),
    battersFaced: outs + hitsAllowed + walks,
    consecutiveHRsAllowed: 0,
    firstInningRuns: 0,
    basesLoadedWalks: 0,
    inningsComplete: Math.floor(innings),
    decision: "ND" as "W" | "L" | "ND" | null,
    save: false,
    hold: false,
    blownSave: false,
  };
}

function lineupEntries(side: LensTeamSide) {
  const batters = side.positionPlayers.slice(0, 9);
  const starter = side.pitchers[0];
  const lineup = batters.map((player, index) => ({
    playerId: player.id,
    playerName: fullName(player),
    position: player.primaryPosition,
    battingOrder: index + 1,
    enteredInning: 1,
    isStarter: true,
  }));
  const flat = batters.map((player, index) => ({
    battingOrder: index + 1,
    playerId: player.id,
    fieldingPosition: player.primaryPosition,
  }));
  const bench = side.positionPlayers.slice(9).map((player) => ({
    playerId: player.id,
    playerName: fullName(player),
    positions: [player.primaryPosition],
    isAvailable: true,
  }));
  return { lineup, flat, bench, starter };
}

export function buildSyntheticFranchiseGame(args: {
  gameNumber: number;
  franchiseId: string;
  leagueId: string;
  seasonId: string;
  seasonNumber: number;
  scheduleGameId: string;
  home: LensTeamSide;
  away: LensTeamSide;
}): SyntheticGameResult {
  const { gameNumber, franchiseId, leagueId, seasonId, seasonNumber, scheduleGameId, home, away } = args;
  const rand = mulberry(hashStr(`${franchiseId}:g${gameNumber}:${home.team.id}:${away.team.id}`));

  // Pitchers first → score derives from runs allowed (starter 6ip + reliever 3ip).
  const awayPitchers = [
    pitcherLine(away.pitchers[0], away.team.id, true, 1, 18, rand, gameNumber),
    pitcherLine(away.pitchers[4] ?? away.pitchers[1] ?? away.pitchers[0], away.team.id, false, 7, 9, rand, gameNumber),
  ];
  const homePitchers = [
    pitcherLine(home.pitchers[0], home.team.id, true, 1, 18, rand, gameNumber),
    pitcherLine(home.pitchers[4] ?? home.pitchers[1] ?? home.pitchers[0], home.team.id, false, 7, 9, rand, gameNumber),
  ];
  let awayScore = homePitchers.reduce((sum, p) => sum + p.runsAllowed, 0);
  let homeScore = awayPitchers.reduce((sum, p) => sum + p.runsAllowed, 0);
  if (awayScore === homeScore) {
    // break ties via game parity so home isn't always favored
    if (gameNumber % 2 === 0) homeScore += 1;
    else awayScore += 1;
  }
  const homeWon = homeScore > awayScore;
  awayPitchers[0].decision = homeWon ? "L" : "W";
  homePitchers[0].decision = homeWon ? "W" : "L";

  const playerStats: PersistedGameState["playerStats"] = {};
  for (const player of away.positionPlayers.slice(0, 9)) {
    playerStats[player.id] = battingLine(player, away.team.id, gameNumber, rand);
  }
  for (const player of home.positionPlayers.slice(0, 9)) {
    playerStats[player.id] = battingLine(player, home.team.id, gameNumber, rand);
  }

  const awayLine = lineupEntries(away);
  const homeLine = lineupEntries(home);
  const winningSide = homeWon ? home : away;
  const standout = winningSide.positionPlayers[0];
  const savedAt = GAME_STARTED_AT + gameNumber * 60_000;
  const gameId = `lens-demo-${franchiseId}-g${String(gameNumber).padStart(3, "0")}`;

  const playerWpaTotals = [
    {
      playerId: standout.id,
      playerName: fullName(standout),
      teamId: winningSide.team.id,
      totalWpa: 0.32,
      battingWpa: 0.28,
      pitchingWpa: 0,
      catchingWpa: 0,
      fieldingWpa: 0.02,
      baserunningWpa: 0.02,
      managingWpa: 0,
    },
  ];

  const fameEvents = (hashStr(gameId) % 4 === 0)
    ? [
        {
          id: `lens-fame-${standout.id}-${gameNumber}`,
          gameId,
          eventType: "WEB_GEM",
          playerId: standout.id,
          playerName: fullName(standout),
          playerTeam: winningSide.team.id,
          teamId: winningSide.team.id,
          fameValue: 4,
          fameType: "bonus" as const,
          inning: 7,
          halfInning: "TOP" as const,
          timestamp: savedAt,
          autoDetected: true,
          description: "Lens demo synthetic web gem.",
        },
      ]
    : [];

  const gameState = {
    id: "current",
    gameId,
    savedAt,
    inning: 9,
    halfInning: "BOTTOM",
    outs: 3,
    homeScore,
    awayScore,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: Object.values(playerStats).reduce((sum, stats) => sum + stats.pa, 0),
    awayTeamId: away.team.id,
    homeTeamId: home.team.id,
    awayTeamName: away.team.name,
    homeTeamName: home.team.name,
    seasonNumber,
    stadiumName: home.team.stadium,
    stadiumId: home.team.stadiumId,
    parkFactors: home.team.parkFactors,
    gamePhase: "FINALIZED",
    gameStartedAt: GAME_STARTED_AT,
    currentBatterId: standout.id,
    currentBatterName: fullName(standout),
    currentPitcherId: homePitchers[homePitchers.length - 1].pitcherId,
    currentPitcherName: homePitchers[homePitchers.length - 1].pitcherName,
    playerStats,
    pitcherGameStats: [...awayPitchers, ...homePitchers],
    fameEvents,
    playerWpaTotals,
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [`Lens demo synthetic game ${gameNumber}`],
    seasonId,
    statsScopeId: seasonId,
    franchiseId,
    scheduleGameId,
    competitionType: "franchise",
    competitionId: franchiseId,
    leagueId,
    totalInnings: 9,
    awayUsesDh: true,
    homeUsesDh: true,
    awayLineup: awayLine.flat,
    homeLineup: homeLine.flat,
    awayLineupState: {
      lineup: awayLine.lineup,
      bench: awayLine.bench,
      usedPlayers: awayLine.lineup.map((e) => e.playerId),
      currentPitcher: null,
    },
    homeLineupState: {
      lineup: homeLine.lineup,
      bench: homeLine.bench,
      usedPlayers: homeLine.lineup.map((e) => e.playerId),
      currentPitcher: null,
    },
  } as unknown as PersistedGameState;

  return {
    gameState,
    finalScore: { away: awayScore, home: homeScore },
    archiveOptions: {
      finalScore: { away: awayScore, home: homeScore },
      seasonId,
      context: {
        statsScopeId: seasonId,
        competitionType: "franchise",
        competitionId: franchiseId,
        leagueId,
        franchiseId,
        scheduleGameId,
      },
    },
  };
}
