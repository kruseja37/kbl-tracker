import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { aggregateGameToSeason } from '../seasonAggregator';
import { getOrCreateBattingStats, getOrCreateFieldingStats } from '../seasonStorage';
import { resetTrackerDbForTests } from '../trackerDb';
import type { AtBatEvent, FieldingEvent, RunnerState } from '../eventLog';
import type { PersistedGameState } from '../gameStorage';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

const DB_NAME = 'kbl-tracker';

type RunnerOutcome = NonNullable<AtBatEvent['runnerOutcomes']>[number];

const noRunners: RunnerState = { first: null, second: null, third: null };

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function playerStats(
  playerName: string,
  teamId: string,
  overrides: Partial<PersistedGameState['playerStats'][string]> = {},
): PersistedGameState['playerStats'][string] {
  return {
    playerName,
    teamId,
    pa: 0,
    ab: 0,
    h: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    r: 0,
    bb: 0,
    hbp: 0,
    k: 0,
    sb: 0,
    cs: 0,
    sf: 0,
    sh: 0,
    gidp: 0,
    putouts: 0,
    assists: 0,
    fieldingErrors: 0,
    grandSlams: 0,
    ...overrides,
  };
}

function gameState(
  gameId: string,
  fieldingEvents: FieldingEvent[],
): PersistedGameState {
  return {
    id: 'current',
    gameId,
    savedAt: 1,
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    homeScore: 0,
    awayScore: 0,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 0,
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away',
    homeTeamName: 'Home',
    seasonNumber: 1,
    playerStats: {
      'player-x': playerStats('Player X', 'away'),
      'player-y': playerStats('Player Y', 'away'),
      'player-z': playerStats('Player Z', 'away'),
    },
    pitcherGameStats: [],
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    fieldingEvents,
  };
}

function fieldingEvent(
  gameId: string,
  sequence: number,
  playerId: string,
  playType: FieldingEvent['playType'],
  overrides: Partial<FieldingEvent> = {},
): FieldingEvent {
  return {
    fieldingEventId: `${gameId}-fielding-${sequence}`,
    gameId,
    atBatEventId: `${gameId}-ab-${sequence}`,
    sequence,
    playerId,
    playerName: playerId,
    position: playerId === 'player-y' ? 'RF' : 'CF',
    teamId: 'away',
    playType,
    difficulty: 'likely',
    ballInPlay: {
      trajectory: 'fly',
      zone: 8,
      velocity: 'medium',
      fielderIds: [playerId],
      primaryFielderId: playerId,
    },
    success: true,
    runsPreventedOrAllowed: playType === 'base_save' ? 1 : 0,
    ...overrides,
  };
}

function runnerOutcome(
  runnerId: string,
  fromBase: RunnerOutcome['fromBase'],
  toBase: RunnerOutcome['toBase'],
  overrides: Partial<RunnerOutcome> = {},
): RunnerOutcome {
  return {
    runnerId,
    runnerName: runnerId,
    fromBase,
    toBase,
    ...overrides,
  };
}

function atBat(
  gameId: string,
  eventIndex: number,
  result: AtBatEvent['result'],
  runnerOutcomes: RunnerOutcome[],
  overrides: Partial<AtBatEvent> = {},
): AtBatEvent {
  return {
    eventId: `${gameId}-ab-${eventIndex}`,
    gameId,
    eventIndex,
    timestamp: eventIndex,
    batterId: 'batter-1',
    batterName: 'Batter One',
    batterTeamId: 'away',
    pitcherId: 'pitcher-1',
    pitcherName: 'Pitcher One',
    pitcherTeamId: 'home',
    result,
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: noRunners,
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: noRunners,
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.5,
    wpa: 0,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    runnerOutcomes,
    ...overrides,
  };
}

function baserunningGameState(gameId: string, atBatEvents: AtBatEvent[]): PersistedGameState {
  return {
    id: 'current',
    gameId,
    savedAt: 1,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 3,
    awayScore: 2,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: atBatEvents.length,
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away',
    homeTeamName: 'Home',
    seasonNumber: 1,
    playerStats: {
      'runner-1': playerStats('Runner One', 'away'),
    },
    pitcherGameStats: [],
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    atBatEvents,
    fieldingEvents: [],
  };
}

describe('season aggregator outfield arm capture', () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  test('accumulates outfield assists and baserunners held from FieldingEvent rows across games', async () => {
    const seasonId = 'of-arm-season';

    await expect(
      aggregateGameToSeason(
        gameState('of-arm-game-1', [
          fieldingEvent('of-arm-game-1', 1, 'player-x', 'outfield_assist', { specialPlayType: 'Diving' }),
          fieldingEvent('of-arm-game-1', 2, 'player-x', 'outfield_assist', { specialPlayType: 'Leaping' }),
          fieldingEvent('of-arm-game-1', 3, 'player-y', 'base_save'),
        ]),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    await expect(
      aggregateGameToSeason(
        gameState('of-arm-game-2', [
          fieldingEvent('of-arm-game-2', 1, 'player-x', 'outfield_assist', { specialPlayType: 'Missed Dive', success: false }),
          fieldingEvent('of-arm-game-2', 2, 'player-y', 'base_save', { specialPlayType: 'Over Shoulder' }),
        ]),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    const playerX = await getOrCreateFieldingStats(seasonId, 'player-x', 'Player X', 'away');
    const playerY = await getOrCreateFieldingStats(seasonId, 'player-y', 'Player Y', 'away');

    expect(playerX.outfieldAssists).toBe(3);
    expect(playerX.baserunnersHeld).toBe(0);
    expect(playerX.difficultyWeightedConversion).toBeCloseTo(1.25, 10);
    expect(playerX.difficultyFieldingOpportunities).toBe(3);
    expect(playerY.outfieldAssists).toBe(0);
    expect(playerY.baserunnersHeld).toBe(2);
    expect(playerY.difficultyWeightedConversion).toBeCloseTo(0.25, 10);
    expect(playerY.difficultyFieldingOpportunities).toBe(1);
  });

  test('leaves outfield arm fields at zero when the game has no matching FieldingEvent rows', async () => {
    const seasonId = 'of-arm-empty-season';

    await expect(
      aggregateGameToSeason(
        gameState('of-arm-empty-game', []),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    const playerZ = await getOrCreateFieldingStats(seasonId, 'player-z', 'Player Z', 'away');
    expect(playerZ.outfieldAssists).toBe(0);
    expect(playerZ.baserunnersHeld).toBe(0);
    expect(playerZ.difficultyWeightedConversion).toBe(0);
    expect(playerZ.difficultyFieldingOpportunities).toBe(0);
  });
});

describe('season aggregator baserunning advancement writer', () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  test('accrues extra-base advancement counts from non-undone runner outcomes by runner', async () => {
    const seasonId = 'baserunning-advancement-season';

    const gameOneEvents = [
      atBat('baserunning-advancement-game-1', 1, '1B', [
        runnerOutcome('runner-1', 'first', 'third'),
      ]),
      atBat('baserunning-advancement-game-1', 2, '1B', [
        runnerOutcome('runner-1', 'first', 'second', { heldByOf: true }),
      ]),
      atBat(
        'baserunning-advancement-game-1',
        3,
        '1B',
        [runnerOutcome('runner-1', 'first', 'third')],
        { undoneAt: 123 },
      ),
    ];

    const gameTwoEvents = [
      atBat('baserunning-advancement-game-2', 1, '1B', [
        runnerOutcome('runner-1', 'first', 'third'),
      ]),
      atBat('baserunning-advancement-game-2', 2, '1B', [
        runnerOutcome('runner-1', 'first', 'second', { heldByOf: true }),
      ]),
    ];

    await expect(
      aggregateGameToSeason(baserunningGameState('baserunning-advancement-game-1', gameOneEvents), {
        seasonId,
        detectMilestones: false,
      }),
    ).resolves.toMatchObject({ success: true });

    await expect(
      aggregateGameToSeason(baserunningGameState('baserunning-advancement-game-2', gameTwoEvents), {
        seasonId,
        detectMilestones: false,
      }),
    ).resolves.toMatchObject({ success: true });

    const stats = await getOrCreateBattingStats(seasonId, 'runner-1', 'Runner One', 'away');
    expect(stats.extraBasesTaken).toBe(2);
    expect(stats.advancementOpportunities).toBe(4);
  });
});
