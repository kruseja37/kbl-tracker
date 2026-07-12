import 'fake-indexeddb/auto';

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../gameStorage';
import {
  CHECKPOINT_FULL_SEASON_SAMPLE,
  CHECKPOINT_DEV_TUNING,
  checkpointSweepSeam,
  isCheckpointBoundary,
  persistDarkCheckpointSweepForCompletedGame,
  ratingConfidence,
  resolvePreviousCheckpointGameNumber,
  resolveCheckpointRoster,
  resolveWindowActivePlayerIds,
  type CheckpointRosterEntry,
  type CheckpointSweepScope,
} from '../franchiseCheckpointSweepCompute';
import { computeCheckpointRatingDevelopment } from '../../engines/ratingsDevelopment';
import { setFranchisePhase2CheckpointEnabledForTests } from '../franchisePhase2Flags';
import * as overlayStorage from '../franchiseRatingsOverlayStorage';
import { syncEngine } from '../syncEngine';
import {
  getAllFieldingStats,
  getSeasonBattingStats,
  getSeasonMetadata,
  getSeasonPitchingStats,
} from '../seasonStorage';
import { getGame as getScheduledGame } from '../scheduleStorage';
import { getGameEvents, getGameHeadersForScope } from '../eventLog';
import {
  deleteFranchiseDatabase,
  getFranchisePlayer,
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  saveFranchisePlayer,
} from '../franchisePlayerStorage';
import { resolveRatingsProposal } from '../franchiseConsoleMirror';
import { getPlayerTeamIdForLeague } from '../leagueBuilderStorage';
import { getFranchiseTrueValueRows } from '../franchiseTrueValueStorage';
import { getFranchiseMoraleSnapshot } from '../franchiseMoraleState';
import { buildFranchiseEffectivePositionReport } from '../franchiseEffectivePosition';
import * as checkpointRatingSignal from '../checkpointRatingSignal';
import {
  CHECKPOINT_CADENCE_COUNTS,
  CHECKPOINT_CADENCE_DEFAULT,
  checkpointCountForCadence,
} from '../../data/rosterEngineConstants';

vi.mock('../seasonStorage', async (importActual) => ({
  ...(await importActual<typeof import('../seasonStorage')>()),
  getSeasonMetadata: vi.fn(),
  getSeasonBattingStats: vi.fn(),
  getSeasonPitchingStats: vi.fn(),
  getAllFieldingStats: vi.fn(),
}));

vi.mock('../scheduleStorage', () => ({
  getGame: vi.fn(),
}));

vi.mock('../eventLog', async (importActual) => ({
  ...(await importActual<typeof import('../eventLog')>()),
  getGameHeadersForScope: vi.fn(),
  getGameEvents: vi.fn(),
}));

vi.mock('../franchisePlayerStorage', async (importActual) => ({
  ...(await importActual<typeof import('../franchisePlayerStorage')>()),
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
}));

vi.mock('../leagueBuilderStorage', () => ({
  getPlayerTeamIdForLeague: vi.fn(),
}));

vi.mock('../franchiseTrueValueStorage', () => ({
  getFranchiseTrueValueRows: vi.fn(),
}));

vi.mock('../franchiseMoraleState', () => ({
  getFranchiseMoraleSnapshot: vi.fn(),
}));

vi.mock('../franchiseEffectivePosition', () => ({
  buildFranchiseEffectivePositionReport: vi.fn(),
}));

const scope: CheckpointSweepScope = {
  franchiseId: 'f',
  seasonId: 's',
  statsScopeId: 'ss',
  seasonNumber: 1,
};

const neutralModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'checkpoint-game-1',
    savedAt: 1,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 5,
    awayScore: 2,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 36,
    awayTeamId: 'team-a',
    homeTeamId: 'team-b',
    awayTeamName: 'Team A',
    homeTeamName: 'Team B',
    seasonNumber: 1,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    franchiseId: scope.franchiseId,
    competitionType: 'franchise',
    competitionId: scope.franchiseId,
    scheduleGameId: 'scheduled-checkpoint-2',
    playerStats: {},
    pitcherGameStats: [],
    awayLineup: [],
    homeLineupState: {
      lineup: [],
      bench: [],
      usedPlayers: [],
      currentPitcher: null,
    },
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    ...overrides,
  };
}

function entry(overrides: Partial<CheckpointRosterEntry> = {}): CheckpointRosterEntry {
  const isPitcher = overrides.isPitcher ?? false;
  const signalByRatingKey =
    overrides.signalByRatingKey ?? (isPitcher ? { velocity: 1 } : { power: 1 });
  const sampleByRatingKey =
    overrides.sampleByRatingKey ??
    Object.fromEntries(
      Object.keys(signalByRatingKey).map((ratingKey) => [ratingKey, 9999]),
    ) as CheckpointRosterEntry['sampleByRatingKey'];

  return {
    playerId: overrides.playerId ?? 'player-hitter',
    teamId: overrides.teamId ?? 'team-a',
    isPitcher,
    baseRatings: isPitcher
      ? { power: 50, contact: 50, speed: 50, fielding: 50, velocity: 50, junk: 50, accuracy: 50 }
      : { power: 50, contact: 50, speed: 50, fielding: 50, arm: 50 },
    personality: 'RELAXED',
    modifiers: neutralModifiers,
    playerMorale: 50,
    teamFanMorale: 50,
    ageBand: '25-31',
    signalByRatingKey,
    recentSignalByRatingKey: {},
    sampleByRatingKey,
    createdAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

function player(overrides: Record<string, unknown>) {
  return {
    id: 'player',
    firstName: 'Test',
    lastName: 'Player',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    power: 50,
    contact: 51,
    speed: 52,
    fielding: 53,
    arm: 54,
    velocity: 55,
    junk: 56,
    accuracy: 57,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Relaxed',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1000000,
    leagueAssignments: [],
    createdDate: '2026-06-18T00:00:00.000Z',
    lastModified: '2026-06-18T00:00:00.000Z',
    ...overrides,
  } as never;
}

describe('franchise dark ratings-development checkpoint sweep', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    overlayStorage.resetFranchiseRatingsOverlaysForTests();
    await deleteDatabase('kbl-tracker');
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
    vi.mocked(getScheduledGame).mockResolvedValue({ id: 'scheduled-checkpoint-2', gameNumber: 2 } as never);
    vi.mocked(getGameHeadersForScope).mockResolvedValue([]);
    vi.mocked(getGameEvents).mockResolvedValue([]);
    vi.mocked(getSeasonMetadata).mockResolvedValue({ totalGames: 10 } as never);
    vi.mocked(getSeasonBattingStats).mockResolvedValue([]);
    vi.mocked(getSeasonPitchingStats).mockResolvedValue([]);
    vi.mocked(getAllFieldingStats).mockResolvedValue([]);
    vi.mocked(buildFranchiseEffectivePositionReport).mockResolvedValue({ playerPositions: {} } as never);
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-07-11T18:00:00.000Z'));
    vi.spyOn(checkpointSweepSeam, 'resolveWindowActivePlayerIds').mockResolvedValue({
      hitters: new Set([
        'player-shifter',
        'player-no-shift',
        'player-frequent',
        'player-idempotent',
        'player-fanout',
        'player-hitter',
      ]),
      pitchers: new Set(['pitcher-signal']),
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2CheckpointEnabledForTests(null);
    await overlayStorage.clearFranchiseRatingsOverlaysForTests();
    overlayStorage.resetFranchiseRatingsOverlaysForTests();
    await deleteFranchiseDatabase(scope.franchiseId);
    await deleteDatabase('kbl-tracker');
  });

  test('isCheckpointBoundary uses integer-only 20 percent league-wide checkpoints', () => {
    const trueFor10 = [2, 4, 6, 8, 10];
    for (let gameNumber = 1; gameNumber <= 10; gameNumber += 1) {
      expect(isCheckpointBoundary(gameNumber, 10)).toBe(trueFor10.includes(gameNumber));
    }

    const trueFor32 = [7, 13, 20, 26, 32];
    for (let gameNumber = 1; gameNumber <= 32; gameNumber += 1) {
      expect(isCheckpointBoundary(gameNumber, 32)).toBe(trueFor32.includes(gameNumber));
    }

    const trueFor162 = [33, 65, 98, 130, 162];
    for (let gameNumber = 1; gameNumber <= 162; gameNumber += 1) {
      expect(isCheckpointBoundary(gameNumber, 162)).toBe(trueFor162.includes(gameNumber));
    }

    expect(isCheckpointBoundary(0, 10)).toBe(false);
    expect(isCheckpointBoundary(-1, 10)).toBe(false);
    expect(isCheckpointBoundary(2.5, 10)).toBe(false);
    expect(isCheckpointBoundary(2, 0)).toBe(false);
  });

  test('checkpoint cadence constants default to the original five-boundary standard cadence', () => {
    expect(CHECKPOINT_CADENCE_DEFAULT).toBe('standard');
    expect(CHECKPOINT_CADENCE_COUNTS).toEqual({ standard: 5, frequent: 10 });
    expect(checkpointCountForCadence(undefined)).toBe(5);
    expect(checkpointCountForCadence('standard')).toBe(5);
    expect(checkpointCountForCadence('frequent')).toBe(10);
  });

  test('ratingConfidence scales sample against the season-scaled full-season denominator', () => {
    expect(CHECKPOINT_FULL_SEASON_SAMPLE.power).toBe(502);
    expect(ratingConfidence('power', 0, 162)).toBe(0);
    expect(ratingConfidence('power', 251, 162)).toBeCloseTo(0.5);
    expect(ratingConfidence('power', 502, 162)).toBe(1);
    expect(ratingConfidence('power', 9999, 162)).toBe(1);
    expect(ratingConfidence('contact', 251, 81)).toBe(1);
    expect(ratingConfidence('velocity', 200, 162)).toBeCloseTo(0.5);
  });

  test('isCheckpointBoundary supports frequent ten-boundary cadence via the third parameter', () => {
    const trueFor10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let gameNumber = 1; gameNumber <= 10; gameNumber += 1) {
      expect(isCheckpointBoundary(gameNumber, 10, 10)).toBe(trueFor10.includes(gameNumber));
    }

    const trueFor32 = [4, 7, 10, 13, 16, 20, 23, 26, 29, 32];
    for (let gameNumber = 1; gameNumber <= 32; gameNumber += 1) {
      expect(isCheckpointBoundary(gameNumber, 32, 10)).toBe(trueFor32.includes(gameNumber));
    }

    const trueFor60 = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60];
    for (let gameNumber = 1; gameNumber <= 60; gameNumber += 1) {
      expect(isCheckpointBoundary(gameNumber, 60, 10)).toBe(trueFor60.includes(gameNumber));
    }
  });

  test('resolvePreviousCheckpointGameNumber finds the prior boundary for each cadence', () => {
    expect(resolvePreviousCheckpointGameNumber(6, 10, 5)).toBe(4);
    expect(resolvePreviousCheckpointGameNumber(2, 10, 5)).toBe(0);
    expect(resolvePreviousCheckpointGameNumber(3, 10, 10)).toBe(2);
    expect(resolvePreviousCheckpointGameNumber(1, 10, 10)).toBe(0);
  });

  test('flag OFF returns dark-noop without calling the seam or overlay writer', async () => {
    setFranchisePhase2CheckpointEnabledForTests(false);
    const seam = vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster');
    const put = vi.spyOn(overlayStorage, 'putFranchiseRatingsOverlay');

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);

    expect(result).toEqual({
      status: 'dark-noop',
      written: 0,
      reason: 'Phase-2 checkpoint disabled; no ratings-development sweep.',
    });
    expect(seam).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  test('flag ON but non-boundary gameNumber returns not-checkpoint without calling the seam', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    vi.mocked(getScheduledGame).mockResolvedValue({ id: 'scheduled-checkpoint-3', gameNumber: 3 } as never);
    const seam = vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster');

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);

    expect(result).toEqual({ status: 'not-checkpoint', written: 0 });
    expect(seam).not.toHaveBeenCalled();
  });

  test('flag ON but unresolved gameNumber returns dark-noop', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    vi.mocked(getScheduledGame).mockResolvedValue(null);

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);

    expect(result).toEqual({
      status: 'dark-noop',
      written: 0,
      reason: 'Unresolved league game number; cannot place a checkpoint.',
    });
  });

  test('boundary sweep writes one pending permanent overlay per shifter', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const shifter = entry({ playerId: 'player-shifter', signalByRatingKey: { power: 1 } });
    const nonShifter = entry({ playerId: 'player-no-shift', signalByRatingKey: { power: 0 } });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter, nonShifter]);

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);
    const ratingKey = 'power';
    const dev = computeCheckpointRatingDevelopment(
      {
        ratingKey,
        baseRatingValue: shifter.baseRatings[ratingKey],
        performanceSignal: shifter.signalByRatingKey[ratingKey]!,
        playerMorale: shifter.playerMorale,
        teamFanMorale: shifter.teamFanMorale,
        personality: shifter.personality,
        modifiers: shifter.modifiers,
      },
      CHECKPOINT_DEV_TUNING,
    );

    expect(dev.shouldShift).toBe(true);
    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows).toEqual([
      {
        id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:${shifter.playerId}:${ratingKey}:checkpoint-2`,
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        playerId: shifter.playerId,
        ratingKey,
        delta: dev.appliedDelta,
        expectedPriorValue: shifter.baseRatings[ratingKey],
        proposedValue: shifter.baseRatings[ratingKey] + dev.appliedDelta,
        kind: 'permanent',
        expiresAtGameNumber: null,
        confirmationStatus: 'pending',
        source: 'ratings-development',
        sourceEventId: 'checkpoint-2',
        createdAtGameNumber: 2,
        createdAt: shifter.createdAt,
      },
    ]);
  });

  test('S3(a) stamped and unstamped twins resolve byte-identically when the player has not drifted', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const shifter = entry({ playerId: 'player-equivalence', signalByRatingKey: { power: 1 } });
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set([shifter.playerId]),
      pitchers: new Set(),
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter]);
    await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const [stamped] = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);
    const { expectedPriorValue: _expected, proposedValue: _proposed, ...unstamped } = stamped;
    const fixedEpoch = Date.parse('2026-07-11T18:00:00.000Z');
    const RealDate = Date;
    vi.stubGlobal('Date', class extends RealDate {
      constructor(value?: string | number) {
        super(value ?? fixedEpoch);
      }

      static now(): number {
        return fixedEpoch;
      }
    });

    const resolveVariant = async (row: typeof stamped) => {
      await overlayStorage.clearFranchiseRatingsOverlaysForTests();
      await deleteFranchiseDatabase(scope.franchiseId);
      await saveFranchisePlayer(scope.franchiseId, player({ id: row.playerId, power: 50 }));
      await overlayStorage.putFranchiseRatingsOverlay(row);
      const result = await resolveRatingsProposal(row.id, {
        action: 'confirm',
        observedPriorValue: 50,
      });
      return {
        result,
        player: await getFranchisePlayer(scope.franchiseId, row.playerId),
      };
    };

    try {
      const stampedOutcome = await resolveVariant(stamped);
      const unstampedOutcome = await resolveVariant(unstamped);

      expect(unstampedOutcome).toEqual(stampedOutcome);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('S3(b) fail-before/pass-after: a sweep stamp conflicts on post-sweep rating drift while its unstamped twin silently applies', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const shifter = entry({ playerId: 'player-drift', signalByRatingKey: { power: 1 } });
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set([shifter.playerId]),
      pitchers: new Set(),
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter]);
    await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const [stamped] = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);
    const { expectedPriorValue: _expected, proposedValue: _proposed, ...unstamped } = stamped;
    const driftedValue = 61;

    const resolveVariant = async (row: typeof stamped) => {
      await overlayStorage.clearFranchiseRatingsOverlaysForTests();
      await deleteFranchiseDatabase(scope.franchiseId);
      await saveFranchisePlayer(scope.franchiseId, player({ id: row.playerId, power: driftedValue }));
      await overlayStorage.putFranchiseRatingsOverlay(row);
      const result = await resolveRatingsProposal(row.id, {
        action: 'confirm',
        observedPriorValue: driftedValue,
      });
      return {
        result,
        power: (await getFranchisePlayer(scope.franchiseId, row.playerId))?.power,
      };
    };

    const stampedOutcome = await resolveVariant(stamped);
    const unstampedOutcome = await resolveVariant(unstamped);

    expect(stampedOutcome).toMatchObject({
      result: {
        outcome: 'conflict',
        expectedPriorValue: 50,
        currentValue: driftedValue,
      },
      power: driftedValue,
    });
    expect(unstampedOutcome).toMatchObject({
      result: {
        outcome: 'resolved',
        expectedPriorValue: driftedValue,
      },
      power: driftedValue + stamped.delta,
    });
  });

  test('S3(c) identical sweep inputs produce identical CAS stamps', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const shifter = entry({ playerId: 'player-stamp-determinism', signalByRatingKey: { power: 1 } });
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set([shifter.playerId]),
      pitchers: new Set(),
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter]);

    await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const [first] = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);
    await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const [second] = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect({
      expectedPriorValue: second.expectedPriorValue,
      proposedValue: second.proposedValue,
    }).toEqual({
      expectedPriorValue: first.expectedPriorValue,
      proposedValue: first.proposedValue,
    });
    expect(first.expectedPriorValue).toBe(50);
    expect(first.proposedValue).toBe(50 + first.delta);
  });

  test('checkpoint-one keeps recent rates empty so default overlays stay cumulative-only', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const shifter = entry({ playerId: 'player-hitter', signalByRatingKey: { power: 1 } });
    const rosterSpy = vi
      .spyOn(checkpointSweepSeam, 'resolveCheckpointRoster')
      .mockResolvedValue([shifter]);
    const eventSpy = vi.spyOn(checkpointSweepSeam, 'resolveWindowAtBatEvents');

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);
    const cumulativeOnly = computeCheckpointRatingDevelopment(
      {
        ratingKey: 'power',
        baseRatingValue: shifter.baseRatings.power,
        performanceSignal: shifter.signalByRatingKey.power!,
        playerMorale: shifter.playerMorale,
        teamFanMorale: shifter.teamFanMorale,
        personality: shifter.personality,
        modifiers: shifter.modifiers,
        confidence: 1,
      },
      CHECKPOINT_DEV_TUNING,
    );

    expect(resolvePreviousCheckpointGameNumber(2, 10, 5)).toBe(0);
    expect(eventSpy).not.toHaveBeenCalled();
    expect(rosterSpy.mock.calls[0][2]).toEqual({ recentCategoryRatesByPlayerId: undefined });
    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows[0].delta).toBe(cumulativeOnly.appliedDelta);
  });

  test('trendTiltWeight zero keeps overlays identical even when a recent signal is present', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    vi.mocked(getScheduledGame).mockResolvedValue({ id: 'scheduled-checkpoint-4', gameNumber: 4 } as never);
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set(['player-default-recent']),
      pitchers: new Set(),
    });
    vi.spyOn(checkpointSweepSeam, 'resolveWindowAtBatEvents').mockResolvedValue([
      { eventId: 'recent-hot', gameId: 'g', eventIndex: 1, batterId: 'player-default-recent', pitcherId: 'p' },
    ] as never);
    const shifter = entry({
      playerId: 'player-default-recent',
      signalByRatingKey: { power: 0.4 },
      recentSignalByRatingKey: { power: 1 },
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter]);
    const cumulativeOnly = computeCheckpointRatingDevelopment(
      {
        ratingKey: 'power',
        baseRatingValue: shifter.baseRatings.power,
        performanceSignal: shifter.signalByRatingKey.power!,
        playerMorale: shifter.playerMorale,
        teamFanMorale: shifter.teamFanMorale,
        personality: shifter.personality,
        modifiers: shifter.modifiers,
        confidence: 1,
      },
      CHECKPOINT_DEV_TUNING,
    );

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(CHECKPOINT_DEV_TUNING.trendTiltWeight).toBe(0);
    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0].delta).toBe(cumulativeOnly.appliedDelta);
  });

  test('test-only positive trendTiltWeight makes a hot recent stretch move more than cumulative-only', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    vi.mocked(getScheduledGame).mockResolvedValue({ id: 'scheduled-checkpoint-4', gameNumber: 4 } as never);
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set(['player-hot-recent']),
      pitchers: new Set(),
    });
    vi.spyOn(checkpointSweepSeam, 'resolveWindowAtBatEvents').mockResolvedValue([
      { eventId: 'recent-hot', gameId: 'g', eventIndex: 1, batterId: 'player-hot-recent', pitcherId: 'p' },
    ] as never);
    const shifter = entry({
      playerId: 'player-hot-recent',
      signalByRatingKey: { power: 0.4 },
      recentSignalByRatingKey: { power: 1 },
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter]);
    const cumulativeOnly = computeCheckpointRatingDevelopment(
      {
        ratingKey: 'power',
        baseRatingValue: shifter.baseRatings.power,
        performanceSignal: shifter.signalByRatingKey.power!,
        playerMorale: shifter.playerMorale,
        teamFanMorale: shifter.teamFanMorale,
        personality: shifter.personality,
        modifiers: shifter.modifiers,
        confidence: 1,
      },
      { ...CHECKPOINT_DEV_TUNING, trendTiltWeight: 0.5 },
    );
    const blended = computeCheckpointRatingDevelopment(
      {
        ratingKey: 'power',
        baseRatingValue: shifter.baseRatings.power,
        performanceSignal: shifter.signalByRatingKey.power!,
        recentSignal: shifter.recentSignalByRatingKey.power,
        playerMorale: shifter.playerMorale,
        teamFanMorale: shifter.teamFanMorale,
        personality: shifter.personality,
        modifiers: shifter.modifiers,
        confidence: 1,
      },
      { ...CHECKPOINT_DEV_TUNING, trendTiltWeight: 0.5 },
    );
    const originalTrendTiltWeight = CHECKPOINT_DEV_TUNING.trendTiltWeight;

    try {
      CHECKPOINT_DEV_TUNING.trendTiltWeight = 0.5;
      const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
      const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

      expect(blended.appliedDelta).toBeGreaterThan(cumulativeOnly.appliedDelta);
      expect(result).toEqual({ status: 'written', written: 1 });
      expect(rows).toHaveLength(1);
      expect(rows[0].delta).toBe(blended.appliedDelta);
    } finally {
      CHECKPOINT_DEV_TUNING.trendTiltWeight = originalTrendTiltWeight;
    }
  });

  test('age gravity writes negative old and positive young neutral-signal overlays', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set(['player-old-38', 'player-young-20']),
      pitchers: new Set(),
    });
    const old = entry({
      playerId: 'player-old-38',
      ageBand: '36+',
      signalByRatingKey: { power: 0 },
      teamFanMorale: 20,
    });
    const young = entry({
      playerId: 'player-young-20',
      ageBand: '18-21',
      signalByRatingKey: { power: 0 },
      teamFanMorale: 80,
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([old, young]);

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(result).toEqual({ status: 'written', written: 2 });
    expect(rows.map((row) => [row.playerId, row.delta]).sort()).toEqual([
      ['player-old-38', -1],
      ['player-young-20', 1],
    ]);
  });

  test('prime-age sweep remains byte-identical to omitted age-band development', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set(['player-prime-28']),
      pitchers: new Set(),
    });
    const prime = entry({
      playerId: 'player-prime-28',
      ageBand: '25-31',
      signalByRatingKey: { power: 1 },
      teamFanMorale: 80,
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([prime]);
    const preRa5Dev = computeCheckpointRatingDevelopment(
      {
        ratingKey: 'power',
        baseRatingValue: prime.baseRatings.power,
        performanceSignal: 1,
        playerMorale: prime.playerMorale,
        teamFanMorale: prime.teamFanMorale,
        personality: prime.personality,
        modifiers: prime.modifiers,
        confidence: 1,
      },
      CHECKPOINT_DEV_TUNING,
    );

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(preRa5Dev.rawDelta).toBe(3);
    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0].playerId).toBe('player-prime-28');
    expect(rows[0].delta).toBe(preRa5Dev.appliedDelta);
  });

  test('confidence dead-band blocks thin checkpoint samples but lets full samples shift', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set(['player-thin', 'player-full']),
      pitchers: new Set(),
    });
    const thin = entry({
      playerId: 'player-thin',
      signalByRatingKey: { power: 1 },
      sampleByRatingKey: { power: 1 },
    });
    const full = entry({
      playerId: 'player-full',
      signalByRatingKey: { power: 1 },
      sampleByRatingKey: { power: 9999 },
    });
    const rosterSpy = vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster');

    rosterSpy.mockResolvedValueOnce([thin]);
    const thinResult = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const thinRows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(thinResult).toEqual({ status: 'written', written: 0 });
    expect(thinRows).toEqual([]);

    rosterSpy.mockResolvedValueOnce([full]);
    const fullResult = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const fullRows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(fullResult.status).toBe('written');
    expect(fullResult.written).toBeGreaterThanOrEqual(1);
    expect(fullRows.some((row) => row.playerId === 'player-full')).toBe(true);
    expect(fullRows.some((row) => row.playerId === 'player-thin')).toBe(false);
  });

  test('frequent cadence from season metadata makes game 3 of 10 a checkpoint boundary', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    vi.mocked(getScheduledGame).mockResolvedValue({ id: 'scheduled-checkpoint-3', gameNumber: 3 } as never);
    vi.mocked(getSeasonMetadata).mockResolvedValue({ totalGames: 10, checkpointCadence: 'frequent' } as never);
    const shifter = entry({ playerId: 'player-frequent', signalByRatingKey: { power: 1 } });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter]);

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      playerId: 'player-frequent',
      sourceEventId: 'checkpoint-3',
      createdAtGameNumber: 3,
    });
  });

  test('replaying the same boundary checkpoint overwrites the same overlay id without duplicates', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const shifter = entry({ playerId: 'player-idempotent', signalByRatingKey: { power: 1 } });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter]);

    const first = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const second = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(first).toEqual({ status: 'written', written: 1 });
    expect(second).toEqual({ status: 'written', written: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(
      `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:${shifter.playerId}:${rows[0].ratingKey}:checkpoint-2`,
    );
    expect(rows[0]).toMatchObject({
      playerId: shifter.playerId,
      kind: 'permanent',
      confirmationStatus: 'pending',
      sourceEventId: 'checkpoint-2',
    });
  });

  test('boundary sweep fans out one overlay per finite moved rating signal', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const shifter = entry({
      playerId: 'player-fanout',
      signalByRatingKey: { power: 1, contact: 1 },
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter]);

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(result).toEqual({ status: 'written', written: 2 });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.ratingKey).sort()).toEqual(['contact', 'power']);
    expect(new Set(rows.map((row) => row.id)).size).toBe(2);
    expect(rows.map((row) => row.id).sort()).toEqual([
      `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:player-fanout:contact:checkpoint-2`,
      `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:player-fanout:power:checkpoint-2`,
    ]);
  });

  test('pitcher seam entry writes velocity only and never writes arm', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const pitcher = entry({
      playerId: 'pitcher-signal',
      isPitcher: true,
      signalByRatingKey: { velocity: 1 },
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([pitcher]);

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0].ratingKey).toBe('velocity');
    expect(rows.some((row) => row.ratingKey === 'arm')).toBe(false);
  });

  test('pitcher checkpoint writes non-pitching overlays and still never writes arm', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set(),
      pitchers: new Set(['pitcher-non-pitching']),
    });
    const pitcher = entry({
      playerId: 'pitcher-non-pitching',
      isPitcher: true,
      signalByRatingKey: { power: 1, contact: 1, speed: 1, fielding: 1, arm: 1 },
    });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([pitcher]);

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(result).toEqual({ status: 'written', written: 4 });
    expect(rows.map((row) => row.ratingKey).sort()).toEqual(['contact', 'fielding', 'power', 'speed']);
    expect(rows.some((row) => row.ratingKey === 'arm')).toBe(false);
  });

  test('window-inactive roster entries remain cohort members but write no overlays', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const inactive = entry({ playerId: 'player-window-inactive', signalByRatingKey: { power: 1 } });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([inactive]);
    vi.mocked(checkpointSweepSeam.resolveWindowActivePlayerIds).mockResolvedValue({
      hitters: new Set(),
      pitchers: new Set(),
    });

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(result).toEqual({ status: 'written', written: 0 });
    expect(rows).toEqual([]);
  });

  test('resolveWindowActivePlayerIds reads only completed games inside the checkpoint window by scheduled gameNumber', async () => {
    vi.mocked(getGameHeadersForScope).mockResolvedValue([
      {
        gameId: 'out-before',
        scheduleGameId: 'schedule-4',
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        isComplete: true,
        date: 4,
      },
      {
        gameId: 'in-five',
        scheduleGameId: 'schedule-5',
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        isComplete: true,
        date: 5,
      },
      {
        gameId: 'in-six',
        scheduleGameId: 'schedule-6',
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        isComplete: true,
        date: 6,
      },
      {
        gameId: 'unresolved',
        scheduleGameId: 'schedule-missing',
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        isComplete: true,
        date: 7,
      },
    ] as never);
    vi.mocked(getScheduledGame).mockImplementation(async (scheduleGameId: string) => {
      const gameNumbers: Record<string, number> = {
        'schedule-4': 4,
        'schedule-5': 5,
        'schedule-6': 6,
      };
      const gameNumber = gameNumbers[scheduleGameId];
      return gameNumber ? ({ id: scheduleGameId, gameNumber } as never) : null;
    });
    vi.mocked(getGameEvents).mockImplementation(async (gameId: string) => {
      const eventsByGameId: Record<string, Array<{ batterId: string; pitcherId: string }>> = {
        'out-before': [{ batterId: 'hitter-before', pitcherId: 'pitcher-before' }],
        'in-five': [{ batterId: 'hitter-five', pitcherId: 'pitcher-five' }],
        'in-six': [
          { batterId: 'hitter-six', pitcherId: 'pitcher-six' },
          { batterId: 'hitter-five', pitcherId: 'pitcher-six' },
        ],
      };
      return (eventsByGameId[gameId] ?? []).map((event, index) => ({
        eventId: `${gameId}-${index + 1}`,
        gameId,
        eventIndex: index + 1,
        ...event,
      })) as never;
    });

    const active = await resolveWindowActivePlayerIds(scope, 4, 6);

    expect(getGameHeadersForScope).toHaveBeenCalledWith({
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      isComplete: true,
    });
    expect(getGameEvents).toHaveBeenCalledTimes(2);
    expect(vi.mocked(getGameEvents).mock.calls.map(([gameId]) => gameId).sort()).toEqual([
      'in-five',
      'in-six',
    ]);
    expect([...active.hitters].sort()).toEqual(['hitter-five', 'hitter-six']);
    expect([...active.pitchers].sort()).toEqual(['pitcher-five', 'pitcher-six']);
    expect(active.hitters.has('hitter-before')).toBe(false);
    expect(active.pitchers.has('pitcher-before')).toBe(false);
  });

  test('empty roster and cohort-only members no-throw without overlays', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const seam = vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster');
    seam.mockResolvedValueOnce([]);

    const emptyResult = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const emptyRows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(emptyResult).toEqual({
      status: 'dark-noop',
      written: 0,
      reason: 'Empty checkpoint roster.',
    });
    expect(emptyRows).toEqual([]);

    seam.mockResolvedValueOnce([
      entry({
        playerId: 'cohort-only',
        signalByRatingKey: { power: 1 },
        createdAt: null,
      }),
    ]);

    const cohortOnlyResult = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const cohortOnlyRows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);

    expect(cohortOnlyResult).toEqual({ status: 'written', written: 0 });
    expect(cohortOnlyRows).toEqual([]);
  });

  test('resolveCheckpointRoster supplies pitcher non-pitching ratings and category rates without arm', async () => {
    const pitcherId = 'pitcher-sp';
    vi.mocked(getAllFranchiseTeams).mockResolvedValue([{ id: 'team-a', leagueIds: ['league-1'] } as never]);
    vi.mocked(getAllFranchisePlayers).mockResolvedValue([
      player({
        id: pitcherId,
        primaryPosition: 'SP',
        power: 31,
        contact: 32,
        speed: 33,
        fielding: 34,
        arm: 0,
        velocity: 72,
        junk: 68,
        accuracy: 64,
        leagueAssignments: [{
          leagueId: 'league-1',
          teamId: 'team-a',
          rosterStatus: 'MLB',
        }],
      }),
    ]);
    vi.mocked(getPlayerTeamIdForLeague).mockReturnValue('team-a');
    vi.mocked(getFranchiseTrueValueRows).mockResolvedValue([
      {
        ...scope,
        playerId: pitcherId,
        valueDelta: 0,
        computedAt: '2026-06-18T02:00:00.000Z',
      },
    ] as never);
    vi.mocked(getSeasonBattingStats).mockResolvedValue([
      {
        seasonId: scope.seasonId,
        playerId: pitcherId,
        playerName: pitcherId,
        teamId: 'team-a',
        games: 8,
        pa: 24,
        ab: 20,
        hits: 8,
        singles: 5,
        doubles: 1,
        triples: 1,
        homeRuns: 1,
        rbi: 0,
        runs: 0,
        walks: 3,
        strikeouts: 4,
        hitByPitch: 1,
        sacFlies: 0,
        sacBunts: 0,
        stolenBases: 2,
        caughtStealing: 0,
        gidp: 0,
        fameBonuses: 0,
        fameBoners: 0,
        fameNet: 0,
        contactQualityGood: 8,
        contactQualityTracked: 12,
        extraBasesTaken: 3,
        advancementOpportunities: 6,
        lastUpdated: 1,
      },
    ] as never);
    vi.mocked(getSeasonPitchingStats).mockResolvedValue([
      {
        seasonId: scope.seasonId,
        playerId: pitcherId,
        playerName: pitcherId,
        teamId: 'team-a',
        games: 8,
        gamesStarted: 8,
        outsRecorded: 40,
        hitsAllowed: 12,
        runsAllowed: 0,
        earnedRuns: 0,
        walksAllowed: 4,
        strikeouts: 15,
        homeRunsAllowed: 3,
        hitBatters: 2,
        wildPitches: 0,
        wins: 0,
        losses: 0,
        saves: 0,
        holds: 0,
        blownSaves: 0,
        qualityStarts: 0,
        completeGames: 0,
        shutouts: 0,
        noHitters: 0,
        perfectGames: 0,
        fameBonuses: 0,
        fameBoners: 0,
        fameNet: 0,
        weakContactInduced: 7,
        weakContactTracked: 14,
        lastUpdated: 1,
      },
    ] as never);
    vi.mocked(getAllFieldingStats).mockResolvedValue([
      {
        seasonId: scope.seasonId,
        playerId: pitcherId,
        playerName: pitcherId,
        teamId: 'team-a',
        games: 8,
        putouts: 9,
        assists: 4,
        errors: 1,
        doublePlays: 0,
        gamesByPosition: { SP: 8 },
        putoutsByPosition: { SP: 9 },
        assistsByPosition: { SP: 4 },
        errorsByPosition: { SP: 1 },
        difficultyWeightedConversion: 5,
        difficultyFieldingOpportunities: 10,
        lastUpdated: 1,
      },
    ] as never);
    vi.mocked(buildFranchiseEffectivePositionReport).mockResolvedValue({
      playerPositions: {
        [pitcherId]: { effectivePosition: 'SP', startsShare: null },
      },
    } as never);
    vi.mocked(getFranchiseMoraleSnapshot).mockResolvedValue({ currentValue: 55 } as never);
    const signalSpy = vi.spyOn(checkpointRatingSignal, 'computeCheckpointRatingSignals');

    const roster = await resolveCheckpointRoster(scope, gameState());
    const members = signalSpy.mock.calls[0][0];
    const member = members[0];

    expect(member).toMatchObject({
      playerId: pitcherId,
      role: 'pitcher',
      poolKey: 'SP',
      ratings: {
        power: 31,
        contact: 32,
        speed: 33,
        fielding: 34,
        velocity: 72,
        junk: 68,
        accuracy: 64,
      },
    });
    expect('arm' in member.ratings).toBe(false);
    expect(member.categoryRates.actualByCat.powerSlugging).toBeCloseTo(14 / 20, 10);
    expect(member.categoryRates.actualByCat.powerHomeRunRate).toBeCloseTo(1 / 24, 10);
    expect(member.categoryRates.actualByCat.contactAvoidStrikeoutRate).toBeCloseTo(1 - (4 / 24), 10);
    expect(member.categoryRates.actualByCat.contactQualityRate).toBeCloseTo(8 / 12, 10);
    expect(member.categoryRates.actualByCat.speedStealTripleRate).toBeCloseTo(3 / 24, 10);
    expect(member.categoryRates.actualByCat.speedBaserunningRate).toBeCloseTo(3 / 6, 10);
    expect(member.categoryRates.actualByCat.fieldingFieldingPct).toBeCloseTo(13 / 14, 10);
    expect(member.categoryRates.actualByCat.fieldingRangeRate).toBeCloseTo(5 / 10, 10);
    expect(member.categoryRates.actualByCat.pitchingStrikeoutRate).toBeCloseTo(15 / 58, 10);
    expect(member.categoryRates.actualByCat.pitchingWalkAvoidanceRate).toBeCloseTo(1 - (4 / 58), 10);
    expect(member.categoryRates.actualByCat.pitchingHomeRunSuppressionRate).toBeCloseTo(1 - (3 / 58), 10);
    expect(member.categoryRates.actualByCat.pitchingWeakContactRate).toBeCloseTo(7 / 14, 10);
    expect(member.categoryRates.sampleSizeByCat).toMatchObject({
      powerSlugging: 24,
      powerHomeRunRate: 24,
      contactAvoidStrikeoutRate: 24,
      contactQualityRate: 12,
      speedStealTripleRate: 3,
      speedBaserunningRate: 6,
      fieldingFieldingPct: 14,
      fieldingRangeRate: 10,
      pitchingStrikeoutRate: 58,
      pitchingWalkAvoidanceRate: 58,
      pitchingHomeRunSuppressionRate: 58,
      pitchingWeakContactRate: 14,
    });

    expect(roster).toHaveLength(1);
    expect(roster[0].baseRatings).toEqual({
      power: 31,
      contact: 32,
      speed: 33,
      fielding: 34,
      velocity: 72,
      junk: 68,
      accuracy: 64,
    });
    expect('arm' in roster[0].baseRatings).toBe(false);
    expect(roster[0].sampleByRatingKey).toMatchObject({
      power: 24,
      contact: 24,
      speed: 6,
      fielding: 14,
      arm: 0,
      velocity: 58,
      junk: 58,
      accuracy: 58,
    });
  });

  test('resolveCheckpointRoster assembles roster-agnostic classifiable members with RA-2c signals', async () => {
    const playerIds = ['hitter-tv', 'farm-no-tv', 'peer-1', 'peer-2', 'peer-3', 'peer-4'];
    const hitters = playerIds.map((id, index) => player({
      id,
      age: index === 0 ? 38 : index === 1 ? 20 : 28,
      primaryPosition: 'SS',
      personality: index === 0 ? 'Spirited' : 'Relaxed',
      morale: index === 0 ? 64 : 50,
      power: 48 + index,
      contact: 50 + index,
      speed: 52 + index,
      fielding: 54 + index,
      arm: 56 + index,
      leagueAssignments: [{
        leagueId: 'league-1',
        teamId: 'team-a',
        rosterStatus: id === 'farm-no-tv' ? 'FARM' : 'MLB',
      }],
    }));
    const battingProfiles = [
      { singles: 9, doubles: 4, triples: 1, homeRuns: 3, strikeouts: 1, contactQualityGood: 11 },
      { singles: 8, doubles: 3, triples: 1, homeRuns: 2, strikeouts: 2, contactQualityGood: 10 },
      { singles: 7, doubles: 2, triples: 0, homeRuns: 1, strikeouts: 3, contactQualityGood: 8 },
      { singles: 6, doubles: 2, triples: 0, homeRuns: 1, strikeouts: 4, contactQualityGood: 7 },
      { singles: 5, doubles: 1, triples: 0, homeRuns: 0, strikeouts: 5, contactQualityGood: 6 },
      { singles: 4, doubles: 1, triples: 0, homeRuns: 0, strikeouts: 6, contactQualityGood: 5 },
    ];

    vi.mocked(getAllFranchiseTeams).mockResolvedValue([{ id: 'team-a', leagueIds: ['league-1'] } as never]);
    vi.mocked(getAllFranchisePlayers).mockResolvedValue(hitters);
    vi.mocked(getPlayerTeamIdForLeague).mockImplementation((p) =>
      (p as { leagueAssignments?: Array<{ teamId?: string }> }).leagueAssignments?.[0]?.teamId ?? null,
    );
    vi.mocked(getFranchiseTrueValueRows).mockResolvedValue([
      {
        ...scope,
        playerId: 'hitter-tv',
        valueDelta: 100000,
        computedAt: '2026-06-18T01:00:00.000Z',
      },
    ] as never);
    vi.mocked(getSeasonBattingStats).mockResolvedValue(playerIds.map((playerId, index) => {
      const profile = battingProfiles[index];
      const hits = profile.singles + profile.doubles + profile.triples + profile.homeRuns;
      return {
        seasonId: scope.seasonId,
        playerId,
        playerName: playerId,
        teamId: 'team-a',
        games: 8,
        pa: 24,
        ab: 22,
        hits,
        singles: profile.singles,
        doubles: profile.doubles,
        triples: profile.triples,
        homeRuns: profile.homeRuns,
        rbi: 0,
        runs: 0,
        walks: 2,
        strikeouts: profile.strikeouts,
        hitByPitch: 0,
        sacFlies: 0,
        sacBunts: 0,
        stolenBases: 2,
        caughtStealing: 0,
        gidp: 0,
        fameBonuses: 0,
        fameBoners: 0,
        fameNet: 0,
        contactQualityGood: profile.contactQualityGood,
        contactQualityTracked: 12,
        lastUpdated: 1,
      };
    }) as never);
    vi.mocked(getAllFieldingStats).mockResolvedValue(playerIds.map((playerId, index) => ({
      seasonId: scope.seasonId,
      playerId,
      playerName: playerId,
      teamId: 'team-a',
      games: 8,
      putouts: 8 + index,
      assists: 4,
      errors: index % 2,
      doublePlays: 0,
      gamesByPosition: { SS: 8 },
      putoutsByPosition: { SS: 8 + index },
      assistsByPosition: { SS: 4 },
      errorsByPosition: { SS: index % 2 },
      lastUpdated: 1,
    })) as never);
    vi.mocked(buildFranchiseEffectivePositionReport).mockResolvedValue({
      playerPositions: Object.fromEntries(playerIds.map((playerId) => [
        playerId,
        { effectivePosition: 'SS', startsShare: 0.75 },
      ])),
    } as never);
    vi.mocked(getFranchiseMoraleSnapshot).mockImplementation(async (_scope, targetType, targetId) => {
      if (targetType === 'team-fan') return { currentValue: 71 } as never;
      if (targetId === 'hitter-tv') return { currentValue: 71 } as never;
      return null;
    });
    const signalSpy = vi.spyOn(checkpointRatingSignal, 'computeCheckpointRatingSignals');
    const recentRates = {
      actualByCat: {
        powerSlugging: 1.250,
        powerHomeRunRate: 0.250,
        contactAvoidStrikeoutRate: 0.950,
      },
      sampleSizeByCat: {
        powerSlugging: 12,
        powerHomeRunRate: 12,
        contactAvoidStrikeoutRate: 12,
      },
    };
    const recentCategoryRatesByPlayerId = {
      hitters: new Map([['hitter-tv', recentRates]]),
      pitchers: new Map(),
    };

    const roster = await resolveCheckpointRoster(
      scope,
      gameState(),
      { recentCategoryRatesByPlayerId },
    );

    expect(signalSpy).toHaveBeenCalledTimes(1);
    const members = signalSpy.mock.calls[0][0];
    expect(members.map((member) => member.playerId).sort()).toEqual([...playerIds].sort());
    expect(members.find((member) => member.playerId === 'hitter-tv')?.poolKey).toBe('middleIF');
    expect(members.find((member) => member.playerId === 'hitter-tv')?.ageBand).toBe('36+');
    expect(members.find((member) => member.playerId === 'hitter-tv')?.recentCategoryRates).toBe(recentRates);
    expect(members.find((member) => member.playerId === 'farm-no-tv')?.recentCategoryRates).toBeUndefined();
    expect(members.find((member) => member.playerId === 'farm-no-tv')?.ageBand).toBe('18-21');
    expect(members.find((member) => member.playerId === 'farm-no-tv')?.poolKey).toBe('middleIF');
    expect(buildFranchiseEffectivePositionReport).toHaveBeenCalledWith({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      players: playerIds.map((playerId) => ({
        playerId,
        profilePosition: 'SS',
        currentTeamId: 'team-a',
        trait1: null,
        trait2: null,
        pitcherRole: 'SS',
      })),
    });

    expect(roster.map((row) => row.playerId).sort()).toEqual([...playerIds].sort());
    const hitterEntry = roster.find((row) => row.playerId === 'hitter-tv');
    const farmEntry = roster.find((row) => row.playerId === 'farm-no-tv');

    expect(hitterEntry).toMatchObject({
      playerId: 'hitter-tv',
      teamId: 'team-a',
      isPitcher: false,
      ageBand: '36+',
      baseRatings: {
        power: 48,
        contact: 50,
        speed: 52,
        fielding: 54,
        arm: 56,
      },
      personality: 'JOLLY',
      modifiers: neutralModifiers,
      playerMorale: 71,
      teamFanMorale: 71,
      createdAt: '2026-06-18T01:00:00.000Z',
    });
    expect(hitterEntry?.signalByRatingKey).toEqual(expect.any(Object));
    expect(hitterEntry?.recentSignalByRatingKey).toEqual(expect.any(Object));
    expect(Object.keys(hitterEntry?.recentSignalByRatingKey ?? {})).toEqual(
      expect.arrayContaining(['power', 'contact']),
    );
    expect(Object.keys(hitterEntry?.signalByRatingKey ?? {})).toEqual(
      expect.arrayContaining(['power', 'contact']),
    );
    expect(hitterEntry?.sampleByRatingKey).toMatchObject({
      power: 24,
      contact: 24,
      speed: 3,
      fielding: 12,
      arm: 0,
    });
    expect(farmEntry?.createdAt).toBeNull();
    expect(farmEntry?.playerMorale).toBe(50);
    expect(farmEntry?.signalByRatingKey).toEqual(expect.any(Object));
    expect(getFranchiseMoraleSnapshot).toHaveBeenCalledTimes(7);
  });

  test('compute module source stays deterministic and store-safe', () => {
    const source = readFileSync('src/utils/franchiseCheckpointSweepCompute.ts', 'utf8');

    expect(source).not.toMatch(/Math\.random|Date\.now|new Date\(|indexedDB\.open/);
  });

  test('L10 sweep remains age-neutral and does not call rating development', () => {
    const source = readFileSync('src/utils/franchiseL10SweepCompute.ts', 'utf8');

    expect(source).not.toMatch(/ageBand\s*:/);
    expect(source).not.toMatch(/computeCheckpointRatingDevelopment/);
  });
});
