import type { KblWpaPlayerTotal } from '../../src/utils/kblWpaAttribution';
import type { PersistedGameState } from '../../src/utils/gameStorage';
import type { Player } from '../../src/utils/leagueBuilderStorage';
import {
  lsimArchiveOptionsFor,
  type LsimArchiveOptions,
  type LsimSandboxContext,
  type LsimTeamSeed,
} from './sandbox';

export interface LsimSyntheticCompletedGame {
  gameState: PersistedGameState;
  archiveOptions: LsimArchiveOptions;
  finalScore: { away: number; home: number };
}

export interface LsimSyntheticGameOptions {
  gameNumber?: number;
  seed?: string;
}

const GAME_STARTED_AT = Date.UTC(2026, 5, 19, 19, 5, 0);
const POSITION_ORDER = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'] as const;
const STRUGGLING_TEAM_IDS = new Set(['lsim-team-02', 'lsim-team-05']);
const CORE_DECLINE_ROSTER_INDEXES = new Set([0, 1, 4, 7, 13, 16]);

function fullName(player: Player): string {
  return `${player.firstName} ${player.lastName}`;
}

function seedHash(seed: string): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function rosterIndexFor(player: Player): number {
  const match = player.id.match(/-mlb-(\d{2})-/);
  return match ? Number(match[1]) - 1 : 99;
}

function declineWindow(gameNumber: number): number {
  if (gameNumber <= 6) return 0.35;
  if (gameNumber <= 38) return 1;
  if (gameNumber <= 50) return 0.65;
  return 0.3;
}

function declineIntensityFor(player: Player, teamId: string, gameNumber: number, hash: number): number {
  const rosterIndex = rosterIndexFor(player);
  const teamDecline = STRUGGLING_TEAM_IDS.has(teamId) ? declineWindow(gameNumber) : 0;
  const personalColdRoll = seedHash(`${player.id}:cold:${gameNumber}:${hash}`) % 100;
  const personalCold = personalColdRoll < 11 ? 0.42 : personalColdRoll < 24 ? 0.24 : 0;
  const coreMultiplier = CORE_DECLINE_ROSTER_INDEXES.has(rosterIndex) ? 0.9 : 0.45;
  return Math.min(1, (teamDecline * coreMultiplier) + personalCold);
}

function teamDeclineIntensity(teamId: string, gameNumber: number): number {
  return STRUGGLING_TEAM_IDS.has(teamId) ? declineWindow(gameNumber) : 0;
}

function lineupFor(seed: LsimTeamSeed): PersistedGameState['awayLineup'] {
  return POSITION_ORDER.map((position) => {
    const player = seed.positionPlayers.find((candidate) => candidate.primaryPosition === position)
      ?? seed.positionPlayers[0];
    return {
      playerId: player.id,
      playerName: fullName(player),
      position,
    };
  });
}

function lineupStateFor(seed: LsimTeamSeed, lineup: NonNullable<PersistedGameState['awayLineup']>): NonNullable<PersistedGameState['awayLineupState']> {
  const starter = seed.pitchers.find((player) => player.primaryPosition === 'SP') ?? seed.pitchers[0];
  const lineupEntries = lineup.map((entry, index) => ({
    ...entry,
    battingOrder: index + 1,
    enteredInning: 1,
    isStarter: true,
  }));

  return {
    lineup: lineupEntries,
    bench: seed.positionPlayers
      .filter((player) => !lineup.some((entry) => entry.playerId === player.id))
      .map((player) => ({
        playerId: player.id,
        playerName: fullName(player),
        positions: [player.primaryPosition, player.secondaryPosition].filter(Boolean) as string[],
        isAvailable: true,
      })),
    usedPlayers: lineupEntries.map((entry) => entry.playerId),
    currentPitcher: {
      playerId: starter.id,
      playerName: fullName(starter),
      position: starter.primaryPosition,
      battingOrder: 10,
      enteredInning: 1,
      isStarter: true,
    },
  };
}

function battingStatsFor(
  player: Player,
  teamId: string,
  index: number,
  role: 'home' | 'away',
  starPlayerId: string,
  gameNumber: number,
  hash: number,
): PersistedGameState['playerStats'][string] {
  const isStar = player.id === starPlayerId;
  const isHome = role === 'home';
  const decline = declineIntensityFor(player, teamId, gameNumber, hash);
  const hardCold = decline >= 0.72;
  const mildCold = decline >= 0.35;
  const singles = hardCold ? (index % 7 === 0 ? 1 : 0) : isStar ? 1 : 1;
  const doubles = hardCold ? 0 : mildCold ? (index % 5 === 0 ? 1 : 0) : isStar ? 1 : index % 2;
  const triples = hardCold || mildCold ? 0 : index === 2 && !isStar ? 1 : 0;
  const hr = hardCold ? 0 : mildCold ? (index === 4 && isHome && gameNumber % 5 === 0 ? 1 : 0) : isStar ? 2 : index === 4 && isHome ? 1 : 0;
  const hits = singles + doubles + triples + hr;
  const walks = hardCold ? 0 : isStar ? 0 : 1;
  const sacFlies = index === 5 ? 1 : 0;
  const pa = hardCold ? 4 : isStar ? 5 : 4;
  const strikeouts = hardCold ? 2 + ((hash + index + gameNumber) % 2) : mildCold ? 2 : isStar ? 0 : 1 + (index % 2);
  const fieldingErrors = hardCold && index % 4 === 0 ? 1 : mildCold && index % 6 === 0 ? 1 : 0;

  return {
    playerName: fullName(player),
    teamId,
    pa,
    ab: Math.max(hits, pa - walks - sacFlies),
    h: hits,
    singles,
    doubles,
    triples,
    hr,
    rbi: hardCold ? 0 : isStar ? 6 : isHome ? 1 + (index % 3) : index % 2,
    r: hardCold ? 0 : isStar ? 3 : isHome ? 1 + (index % 2) : index % 2,
    bb: walks,
    hbp: 0,
    k: strikeouts,
    sb: hardCold ? 0 : isStar ? 1 : index % 3 === 0 ? 1 : 0,
    cs: hardCold && index % 5 === 0 ? 1 : 0,
    sf: sacFlies,
    sh: 0,
    gidp: hardCold && index % 3 === 0 ? 1 : 0,
    putouts: Math.max(1, hardCold ? 2 + (index % 3) : isStar ? 9 : 4 + index),
    assists: hardCold ? index % 2 : isStar ? 2 : index % 5,
    fieldingErrors,
    grandSlams: hardCold ? 0 : isStar ? 1 : 0,
    d3kOutcomes: 0,
    divingCatches: hardCold ? 0 : isStar ? 2 : index % 2,
    robberies: hardCold ? 0 : isStar ? 1 : 0,
    nutshots: 0,
  };
}

function pitcherStatsFor(
  seed: LsimTeamSeed,
  role: 'home' | 'away',
  gameNumber: number,
): PersistedGameState['pitcherGameStats'] {
  const starter = seed.pitchers.find((player) => player.primaryPosition === 'SP') ?? seed.pitchers[0];
  const reliever = seed.pitchers.find((player) => player.primaryPosition === 'RP') ?? seed.pitchers[1] ?? starter;
  const stress = teamDeclineIntensity(seed.team.id, gameNumber);
  const winning = role === 'home' && stress < 0.7;
  const starterRuns = winning ? 1 + Math.floor(stress * 3) : 8 + Math.floor(stress * 3);
  const relieverRuns = winning ? Math.floor(stress * 2) : 4 + Math.floor(stress * 2);

  return [
    {
      pitcherId: starter.id,
      pitcherName: fullName(starter),
      teamId: seed.team.id,
      isStarter: true,
      entryInning: 1,
      outsRecorded: 18,
      hitsAllowed: winning ? 4 + Math.floor(stress * 3) : 10 + Math.floor(stress * 4),
      runsAllowed: starterRuns,
      earnedRuns: starterRuns,
      walksAllowed: winning ? 1 + Math.floor(stress * 2) : 4 + Math.floor(stress * 3),
      strikeoutsThrown: Math.max(1, winning ? 9 - Math.floor(stress * 3) : 3 - Math.floor(stress * 2)),
      homeRunsAllowed: winning ? Math.floor(stress * 2) : 3 + Math.floor(stress * 2),
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: winning ? 83 : 96,
      battersFaced: winning ? 22 : 31,
      consecutiveHRsAllowed: winning ? 0 : 2 + Math.floor(stress),
      firstInningRuns: winning ? Math.floor(stress) : 2 + Math.floor(stress),
      basesLoadedWalks: 0,
      inningsComplete: 6,
      decision: winning ? 'W' : 'L',
      save: false,
      hold: false,
      blownSave: false,
      comebackerInjuries: 0,
    },
    {
      pitcherId: reliever.id,
      pitcherName: fullName(reliever),
      teamId: seed.team.id,
      isStarter: false,
      entryInning: 7,
      outsRecorded: 9,
      hitsAllowed: winning ? 1 + Math.floor(stress * 2) : 4 + Math.floor(stress * 3),
      runsAllowed: relieverRuns,
      earnedRuns: relieverRuns,
      walksAllowed: winning ? Math.floor(stress * 2) : 2 + Math.floor(stress * 2),
      strikeoutsThrown: Math.max(1, winning ? 4 - Math.floor(stress * 2) : 2 - Math.floor(stress)),
      homeRunsAllowed: winning ? Math.floor(stress) : 1 + Math.floor(stress),
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: winning ? 0 : 1,
      pitchCount: winning ? 34 : 47,
      battersFaced: winning ? 10 : 16,
      consecutiveHRsAllowed: 0,
      firstInningRuns: 0,
      basesLoadedWalks: 0,
      inningsComplete: 3,
      decision: 'ND',
      save: winning,
      hold: false,
      blownSave: false,
      comebackerInjuries: 0,
    },
  ];
}

function roundWpa(value: number): number {
  return Number(value.toFixed(3));
}

function upsertWpa(rows: Map<string, KblWpaPlayerTotal>, row: KblWpaPlayerTotal): void {
  const existing = rows.get(row.playerId);
  if (!existing) {
    rows.set(row.playerId, row);
    return;
  }

  rows.set(row.playerId, {
    ...existing,
    totalWpa: roundWpa(existing.totalWpa + row.totalWpa),
    battingWpa: roundWpa(existing.battingWpa + row.battingWpa),
    pitchingWpa: roundWpa(existing.pitchingWpa + row.pitchingWpa),
    catchingWpa: roundWpa(existing.catchingWpa + row.catchingWpa),
    fieldingWpa: roundWpa(existing.fieldingWpa + row.fieldingWpa),
    baserunningWpa: roundWpa(existing.baserunningWpa + row.baserunningWpa),
    managingWpa: roundWpa(existing.managingWpa + row.managingWpa),
  });
}

function playerWpaTotalsFor(
  homeSeed: LsimTeamSeed,
  awaySeed: LsimTeamSeed,
  spotlightPlayer: Player,
  gameNumber: number,
  hash: number,
): KblWpaPlayerTotal[] {
  const homeStarter = homeSeed.pitchers.find((player) => player.primaryPosition === 'SP') ?? homeSeed.pitchers[0];
  const homeReliever = homeSeed.pitchers.find((player) => player.primaryPosition === 'RP') ?? homeSeed.pitchers[1] ?? homeStarter;
  const awayStarter = awaySeed.pitchers.find((player) => player.primaryPosition === 'SP') ?? awaySeed.pitchers[0];
  const awayReliever = awaySeed.pitchers.find((player) => player.primaryPosition === 'RP') ?? awaySeed.pitchers[1] ?? awayStarter;
  const rows = new Map<string, KblWpaPlayerTotal>();
  const addPositionRows = (seed: LsimTeamSeed, sign: 1 | -1) => {
    for (const [index, player] of seed.positionPlayers.slice(0, 9).entries()) {
      const magnitude = 0.04 + (((hash + gameNumber + index * 17) % 13) / 100);
      const decline = declineIntensityFor(player, seed.team.id, gameNumber, hash);
      const coldPenalty = decline > 0 ? -(0.08 + (decline * 0.34) + (((hash + index) % 5) / 100)) : null;
      const battingWpa = roundWpa(coldPenalty ?? sign * magnitude);
      const fieldingWpa = roundWpa(decline > 0.5
        ? -(0.02 + (((hash + index * 7) % 7) / 100))
        : sign * (((hash + index * 7) % 5) / 100));
      const baserunningWpa = roundWpa(decline > 0.65
        ? -(0.01 + (((gameNumber + index) % 3) / 100))
        : sign * (((gameNumber + index) % 3) / 100));
      upsertWpa(rows, {
        playerId: player.id,
        playerName: fullName(player),
        teamId: seed.team.id,
        totalWpa: roundWpa(battingWpa + fieldingWpa + baserunningWpa),
        battingWpa,
        pitchingWpa: 0,
        catchingWpa: player.primaryPosition === 'C' ? fieldingWpa : 0,
        fieldingWpa,
        baserunningWpa,
        managingWpa: 0,
      });
    }
  };

  addPositionRows(homeSeed, 1);
  addPositionRows(awaySeed, -1);

  if (declineIntensityFor(spotlightPlayer, homeSeed.team.id, gameNumber, hash) < 0.5) {
    upsertWpa(rows, {
      playerId: spotlightPlayer.id,
      playerName: fullName(spotlightPlayer),
      teamId: homeSeed.team.id,
      totalWpa: 0.95,
      battingWpa: 0.78,
      pitchingWpa: 0,
      catchingWpa: 0.05,
      fieldingWpa: 0.08,
      baserunningWpa: 0.04,
      managingWpa: 0,
    });
  }
  for (const row of [
    [
      homeStarter,
      homeSeed.team.id,
      STRUGGLING_TEAM_IDS.has(homeSeed.team.id) ? -0.72 : 0.58,
    ] as const,
    [
      homeReliever,
      homeSeed.team.id,
      STRUGGLING_TEAM_IDS.has(homeSeed.team.id) ? -0.38 : 0.31,
    ] as const,
    [
      awayStarter,
      awaySeed.team.id,
      STRUGGLING_TEAM_IDS.has(awaySeed.team.id) ? -0.82 : -0.34,
    ] as const,
    [
      awayReliever,
      awaySeed.team.id,
      STRUGGLING_TEAM_IDS.has(awaySeed.team.id) ? -0.44 : -0.19,
    ] as const,
  ]) {
    const [player, teamId, pitchingWpa] = row;
    upsertWpa(rows, {
      playerId: player.id,
      playerName: fullName(player),
      teamId,
      totalWpa: roundWpa(pitchingWpa),
      battingWpa: 0,
      pitchingWpa: roundWpa(pitchingWpa),
      catchingWpa: 0,
      fieldingWpa: 0,
      baserunningWpa: 0,
      managingWpa: 0,
    });
  }

  return [...rows.values()].sort((left, right) => left.playerId.localeCompare(right.playerId));
}

export function generateLsimSyntheticCompletedGame(
  context: LsimSandboxContext,
  optionsOrSeed: LsimSyntheticGameOptions | string = 'lsim-h1-preflight',
): LsimSyntheticCompletedGame {
  const options: LsimSyntheticGameOptions = typeof optionsOrSeed === 'string'
    ? { seed: optionsOrSeed }
    : optionsOrSeed;
  const gameNumber = options.gameNumber ?? context.ids.checkpointGameNumber;
  const seed = options.seed ?? `lsim-h2-g${gameNumber}`;
  const scheduleGame = context.scheduleByGameNumber.get(gameNumber);
  if (!scheduleGame) {
    throw new Error(`[L-SIM] Missing schedule row for gameNumber ${gameNumber}`);
  }

  const homeSeed = context.teamSeeds.find((candidate) => candidate.team.id === scheduleGame.homeTeamId);
  const awaySeed = context.teamSeeds.find((candidate) => candidate.team.id === scheduleGame.awayTeamId);
  if (!homeSeed || !awaySeed) {
    throw new Error('[L-SIM-H1] Schedule team IDs do not match seeded franchise teams');
  }

  const homeLineup = lineupFor(homeSeed);
  const awayLineup = lineupFor(awaySeed);
  const homeLineupState = lineupStateFor(homeSeed, homeLineup);
  const awayLineupState = lineupStateFor(awaySeed, awayLineup);
  const trueValueStarPlayer = context.teamSeeds
    .flatMap((teamSeed) => teamSeed.positionPlayers)
    .find((player) => player.id === context.trueValueCandidatePlayerId)
    ?? context.teamSeeds[0].positionPlayers[0];
  const spotlightPlayer = homeSeed.positionPlayers.find((player) => player.id === context.trueValueCandidatePlayerId)
    ?? homeSeed.positionPlayers[0];
  const hash = seedHash(seed);
  const homeDecline = teamDeclineIntensity(homeSeed.team.id, gameNumber);
  const awayDecline = teamDeclineIntensity(awaySeed.team.id, gameNumber);
  const homeRuns = Math.max(1, 5 + ((hash + gameNumber) % 8) - Math.floor(homeDecline * 5) + Math.floor(awayDecline * 2));
  let awayRuns = Math.max(1, 3 + ((hash >>> 3) % 7) - Math.floor(awayDecline * 4) + Math.floor(homeDecline * 2));
  if (awayRuns === homeRuns) awayRuns += 1;
  const finalScore = { away: awayRuns, home: homeRuns };
  const playerStats: PersistedGameState['playerStats'] = {};

  for (const [index, player] of homeSeed.positionPlayers.entries()) {
    playerStats[player.id] = battingStatsFor(player, homeSeed.team.id, index, 'home', trueValueStarPlayer.id, gameNumber, hash);
  }
  for (const [index, player] of awaySeed.positionPlayers.entries()) {
    playerStats[player.id] = battingStatsFor(player, awaySeed.team.id, index, 'away', trueValueStarPlayer.id, gameNumber, hash);
  }

  const pitcherGameStats = [
    ...pitcherStatsFor(awaySeed, 'away', gameNumber),
    ...pitcherStatsFor(homeSeed, 'home', gameNumber),
  ];
  const playerWpaTotals = playerWpaTotalsFor(homeSeed, awaySeed, spotlightPlayer, gameNumber, hash);
  const savedAt = GAME_STARTED_AT + (gameNumber * 60_000) + (hash % 1000);
  const gameId = `lsim-h2-${context.ids.franchiseId}-g${String(gameNumber).padStart(3, '0')}-${hash}`;
  const spotlightDecline = declineIntensityFor(spotlightPlayer, homeSeed.team.id, gameNumber, hash);
  const fameEvents = ((hash + gameNumber) % 3 === 0 || spotlightDecline >= 0.72)
    ? [
        {
          id: `lsim-fame-${spotlightPlayer.id}-${gameNumber}`,
          gameId,
          eventType: spotlightDecline >= 0.72 ? 'DROPPED_FLY' : 'WEB_GEM',
          playerId: spotlightPlayer.id,
          playerName: fullName(spotlightPlayer),
          playerTeam: homeSeed.team.id,
          teamId: homeSeed.team.id,
          teamName: homeSeed.team.name,
          opponentTeamId: awaySeed.team.id,
          opponentTeamName: awaySeed.team.name,
          franchiseId: context.ids.franchiseId,
          seasonId: context.ids.seasonId,
          statsScopeId: context.ids.statsScopeId,
          competitionType: 'franchise',
          competitionId: context.ids.franchiseId,
          scheduleGameId: scheduleGame.id,
          fameValue: spotlightDecline >= 0.72 ? -3 : 6,
          fameType: spotlightDecline >= 0.72 ? 'boner' as const : 'bonus' as const,
          inning: 8,
          halfInning: 'TOP',
          timestamp: savedAt,
          autoDetected: true,
          description: spotlightDecline >= 0.72
            ? 'L-SIM Step 3 synthetic slump misplay fame event'
            : 'L-SIM Step 3 synthetic defensive fame event',
        },
      ]
    : [];

  const gameState: PersistedGameState = {
    id: 'current',
    gameId,
    savedAt,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: finalScore.home,
    awayScore: finalScore.away,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: Object.values(playerStats).reduce((sum, stats) => sum + stats.pa, 0),
    awayTeamId: awaySeed.team.id,
    homeTeamId: homeSeed.team.id,
    awayTeamName: awaySeed.team.name,
    homeTeamName: homeSeed.team.name,
    seasonNumber: context.ids.seasonNumber,
    stadiumName: homeSeed.team.stadium,
    stadiumId: homeSeed.team.stadiumId,
    parkFactors: homeSeed.team.parkFactors,
    gamePhase: 'FINALIZED',
    gameStartedAt: GAME_STARTED_AT,
    currentBatterId: spotlightPlayer.id,
    currentBatterName: fullName(spotlightPlayer),
    currentPitcherId: pitcherGameStats[pitcherGameStats.length - 1].pitcherId,
    currentPitcherName: pitcherGameStats[pitcherGameStats.length - 1].pitcherName,
    playerStats,
    pitcherGameStats,
    fameEvents,
    playerWpaTotals,
    moraleShifts: [{ teamId: homeSeed.team.id, shiftAmount: 2, triggerEvent: 'synthetic-checkpoint-win' }],
    lastHRBatterId: spotlightPlayer.id,
    consecutiveHRCount: 2,
    inningStrikeouts: 1,
    maxDeficitAway: 2,
    maxDeficitHome: 1,
    activityLog: [`L-SIM synthetic completed game ${gameNumber}`],
    currentInningPitches: null,
    scoreboard: {
      innings: [
        { away: 1, home: 2 },
        { away: 0, home: 1 },
        { away: 2, home: 0 },
        { away: 0, home: 3 },
        { away: 1, home: 0 },
        { away: 0, home: 2 },
        { away: 2, home: 1 },
        { away: 0, home: 1 },
        { away: 0, home: 2 },
      ],
      away: { runs: finalScore.away, hits: 10, errors: 0 },
      home: { runs: finalScore.home, hits: 16, errors: 0 },
    },
    seasonId: context.ids.seasonId,
    statsScopeId: context.ids.statsScopeId,
    franchiseId: context.ids.franchiseId,
    scheduleGameId: scheduleGame.id,
    competitionType: 'franchise',
    competitionId: context.ids.franchiseId,
    competitionName: 'L-SIM H1 Sandbox',
    leagueId: context.ids.leagueId,
    totalInnings: context.ids.inningsPerGame,
    awayUsesDh: true,
    homeUsesDh: true,
    awayLineup,
    homeLineup,
    awayLineupState,
    homeLineupState,
    runnerTrackerSnapshot: {
      runners: [],
      currentPitcherId: pitcherGameStats[pitcherGameStats.length - 1].pitcherId,
      currentPitcherName: pitcherGameStats[pitcherGameStats.length - 1].pitcherName,
      pitcherStatsEntries: pitcherGameStats.map((stats) => [stats.pitcherId, stats]),
      inning: 9,
      atBatNumber: 74,
    },
    pitcherNamesEntries: pitcherGameStats.map((stats) => [stats.pitcherId, stats.pitcherName]),
    substitutionLog: [],
    useGhostRunner: false,
    extraInningRunner: false,
    extraInningRunnerDelay: 2,
    awayTeamColor: awaySeed.team.colors.primary,
    homeTeamColor: homeSeed.team.colors.primary,
  };

  return {
    gameState,
    finalScore,
    archiveOptions: lsimArchiveOptionsFor(scheduleGame, finalScore),
  };
}
