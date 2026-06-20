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

const GAME_STARTED_AT = Date.UTC(2026, 5, 19, 19, 5, 0);
const POSITION_ORDER = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'] as const;

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

function battingStatsFor(player: Player, teamId: string, index: number, role: 'home' | 'away', starPlayerId: string): PersistedGameState['playerStats'][string] {
  const isStar = player.id === starPlayerId;
  const isHome = role === 'home';
  return {
    playerName: fullName(player),
    teamId,
    pa: isStar ? 5 : 4,
    ab: isStar ? 5 : 3,
    h: isStar ? 5 : isHome ? 1 + (index % 2) : 1,
    singles: isStar ? 1 : 1,
    doubles: isStar ? 1 : index % 2,
    triples: 0,
    hr: isStar ? 3 : index === 4 && isHome ? 1 : 0,
    rbi: isStar ? 8 : isHome ? 1 + (index % 3) : index % 2,
    r: isStar ? 4 : isHome ? 1 + (index % 2) : index % 2,
    bb: isStar ? 0 : 1,
    hbp: 0,
    k: isStar ? 0 : 1 + (index % 2),
    sb: isStar ? 1 : index % 3 === 0 ? 1 : 0,
    cs: 0,
    sf: index === 5 ? 1 : 0,
    sh: 0,
    gidp: 0,
    putouts: isStar ? 9 : 4 + index,
    assists: isStar ? 2 : index % 5,
    fieldingErrors: 0,
    grandSlams: isStar ? 1 : 0,
    d3kOutcomes: 0,
    divingCatches: isStar ? 2 : index % 2,
    robberies: isStar ? 1 : 0,
    nutshots: 0,
  };
}

function pitcherStatsFor(seed: LsimTeamSeed, role: 'home' | 'away'): PersistedGameState['pitcherGameStats'] {
  const starter = seed.pitchers.find((player) => player.primaryPosition === 'SP') ?? seed.pitchers[0];
  const reliever = seed.pitchers.find((player) => player.primaryPosition === 'RP') ?? seed.pitchers[1] ?? starter;
  const winning = role === 'home';

  return [
    {
      pitcherId: starter.id,
      pitcherName: fullName(starter),
      teamId: seed.team.id,
      isStarter: true,
      entryInning: 1,
      outsRecorded: 18,
      hitsAllowed: winning ? 4 : 10,
      runsAllowed: winning ? 1 : 8,
      earnedRuns: winning ? 1 : 8,
      walksAllowed: winning ? 1 : 4,
      strikeoutsThrown: winning ? 9 : 3,
      homeRunsAllowed: winning ? 0 : 3,
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: winning ? 83 : 96,
      battersFaced: winning ? 22 : 31,
      consecutiveHRsAllowed: winning ? 0 : 2,
      firstInningRuns: winning ? 0 : 2,
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
      hitsAllowed: winning ? 1 : 4,
      runsAllowed: winning ? 0 : 4,
      earnedRuns: winning ? 0 : 4,
      walksAllowed: winning ? 0 : 2,
      strikeoutsThrown: winning ? 4 : 2,
      homeRunsAllowed: winning ? 0 : 1,
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

function playerWpaTotalsFor(homeSeed: LsimTeamSeed, awaySeed: LsimTeamSeed, starPlayer: Player): KblWpaPlayerTotal[] {
  const homeStarter = homeSeed.pitchers.find((player) => player.primaryPosition === 'SP') ?? homeSeed.pitchers[0];
  const homeReliever = homeSeed.pitchers.find((player) => player.primaryPosition === 'RP') ?? homeSeed.pitchers[1] ?? homeStarter;
  const awayStarter = awaySeed.pitchers.find((player) => player.primaryPosition === 'SP') ?? awaySeed.pitchers[0];

  return [
    {
      playerId: starPlayer.id,
      playerName: fullName(starPlayer),
      teamId: homeSeed.team.id,
      totalWpa: 1.85,
      battingWpa: 1.65,
      pitchingWpa: 0,
      catchingWpa: 0.08,
      fieldingWpa: 0.09,
      baserunningWpa: 0.03,
      managingWpa: 0,
    },
    {
      playerId: homeStarter.id,
      playerName: fullName(homeStarter),
      teamId: homeSeed.team.id,
      totalWpa: 0.82,
      battingWpa: 0,
      pitchingWpa: 0.82,
      catchingWpa: 0,
      fieldingWpa: 0,
      baserunningWpa: 0,
      managingWpa: 0,
    },
    {
      playerId: homeReliever.id,
      playerName: fullName(homeReliever),
      teamId: homeSeed.team.id,
      totalWpa: 0.46,
      battingWpa: 0,
      pitchingWpa: 0.46,
      catchingWpa: 0,
      fieldingWpa: 0,
      baserunningWpa: 0,
      managingWpa: 0,
    },
    {
      playerId: awayStarter.id,
      playerName: fullName(awayStarter),
      teamId: awaySeed.team.id,
      totalWpa: -0.42,
      battingWpa: 0,
      pitchingWpa: -0.42,
      catchingWpa: 0,
      fieldingWpa: 0,
      baserunningWpa: 0,
      managingWpa: 0,
    },
  ];
}

export function generateLsimSyntheticCompletedGame(
  context: LsimSandboxContext,
  seed = 'lsim-h1-preflight',
): LsimSyntheticCompletedGame {
  const gameNumber = context.ids.checkpointGameNumber;
  const scheduleGame = context.scheduleByGameNumber.get(gameNumber);
  if (!scheduleGame) {
    throw new Error(`[L-SIM-H1] Missing schedule row for checkpoint gameNumber ${gameNumber}`);
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
  const starPlayer = homeSeed.positionPlayers.find((player) => player.id === context.trueValueCandidatePlayerId)
    ?? homeSeed.positionPlayers[0];
  const hash = seedHash(seed);
  const finalScore = { away: 6, home: 12 };
  const playerStats: PersistedGameState['playerStats'] = {};

  for (const [index, player] of homeSeed.positionPlayers.entries()) {
    playerStats[player.id] = battingStatsFor(player, homeSeed.team.id, index, 'home', starPlayer.id);
  }
  for (const [index, player] of awaySeed.positionPlayers.entries()) {
    playerStats[player.id] = battingStatsFor(player, awaySeed.team.id, index, 'away', starPlayer.id);
  }

  const pitcherGameStats = [
    ...pitcherStatsFor(awaySeed, 'away'),
    ...pitcherStatsFor(homeSeed, 'home'),
  ];
  const playerWpaTotals = playerWpaTotalsFor(homeSeed, awaySeed, starPlayer);

  const gameState: PersistedGameState = {
    id: 'current',
    gameId: `lsim-h1-${context.ids.franchiseId}-g${gameNumber}-${hash}`,
    savedAt: GAME_STARTED_AT + hash,
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
    currentBatterId: starPlayer.id,
    currentBatterName: fullName(starPlayer),
    currentPitcherId: pitcherGameStats[pitcherGameStats.length - 1].pitcherId,
    currentPitcherName: pitcherGameStats[pitcherGameStats.length - 1].pitcherName,
    playerStats,
    pitcherGameStats,
    fameEvents: [
      {
        id: `lsim-fame-${starPlayer.id}-${gameNumber}`,
        gameId: `lsim-h1-${gameNumber}`,
        eventType: 'WEB_GEM',
        playerId: starPlayer.id,
        playerName: fullName(starPlayer),
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
        fameValue: 8,
        fameType: 'bonus',
        inning: 8,
        halfInning: 'TOP',
        timestamp: GAME_STARTED_AT + (gameNumber * 60_000),
        autoDetected: true,
        description: 'L-SIM H1 synthetic defensive fame event',
      },
    ],
    playerWpaTotals,
    moraleShifts: [{ teamId: homeSeed.team.id, shiftAmount: 2, triggerEvent: 'synthetic-checkpoint-win' }],
    lastHRBatterId: starPlayer.id,
    consecutiveHRCount: 2,
    inningStrikeouts: 1,
    maxDeficitAway: 2,
    maxDeficitHome: 1,
    activityLog: ['L-SIM H1 synthetic checkpoint completed game'],
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
