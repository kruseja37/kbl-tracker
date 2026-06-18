import 'fake-indexeddb/auto';

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../gameStorage';
import {
  CHECKPOINT_DEV_TUNING,
  checkpointSweepSeam,
  isCheckpointBoundary,
  persistDarkCheckpointSweepForCompletedGame,
  resolveCheckpointRoster,
  selectDevelopmentRatingKey,
  type CheckpointRosterEntry,
  type CheckpointSweepScope,
} from '../franchiseCheckpointSweepCompute';
import { computeCheckpointRatingDevelopment, normalizePerformanceSignal } from '../../engines/ratingsDevelopment';
import { setFranchisePhase2CheckpointEnabledForTests } from '../franchisePhase2Flags';
import * as overlayStorage from '../franchiseRatingsOverlayStorage';
import { syncEngine } from '../syncEngine';
import { getSeasonMetadata } from '../seasonStorage';
import { getGame as getScheduledGame } from '../scheduleStorage';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from '../franchisePlayerStorage';
import {
  getPlayerRosterStatusForLeague,
  getPlayerTeamIdForLeague,
} from '../leagueBuilderStorage';
import { getFranchiseTrueValueRows } from '../franchiseTrueValueStorage';
import { getFranchiseMoraleSnapshot } from '../franchiseMoraleState';

vi.mock('../seasonStorage', () => ({
  getSeasonMetadata: vi.fn(),
}));

vi.mock('../scheduleStorage', () => ({
  getGame: vi.fn(),
}));

vi.mock('../franchisePlayerStorage', () => ({
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
}));

vi.mock('../leagueBuilderStorage', () => ({
  getPlayerRosterStatusForLeague: vi.fn(),
  getPlayerTeamIdForLeague: vi.fn(),
}));

vi.mock('../franchiseTrueValueStorage', () => ({
  getFranchiseTrueValueRows: vi.fn(),
}));

vi.mock('../franchiseMoraleState', () => ({
  getFranchiseMoraleSnapshot: vi.fn(),
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
  return {
    playerId: overrides.playerId ?? 'player-hitter',
    teamId: overrides.teamId ?? 'team-a',
    isPitcher,
    baseRatings: isPitcher
      ? { velocity: 50, junk: 50, accuracy: 50 }
      : { power: 50, contact: 50, speed: 50, fielding: 50, arm: 50 },
    personality: 'RELAXED',
    modifiers: neutralModifiers,
    playerMorale: 50,
    teamFanMorale: 50,
    performanceSignal: 1,
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
    vi.mocked(getSeasonMetadata).mockResolvedValue({ totalGames: 10 } as never);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2CheckpointEnabledForTests(null);
    await overlayStorage.clearFranchiseRatingsOverlaysForTests();
    overlayStorage.resetFranchiseRatingsOverlaysForTests();
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

  test('selectDevelopmentRatingKey is deterministic and selects a valid pitcher or hitter key', () => {
    const pitcherKey = selectDevelopmentRatingKey(entry({ playerId: 'same-pitcher', isPitcher: true }));
    const hitterKey = selectDevelopmentRatingKey(entry({ playerId: 'same-hitter', isPitcher: false }));

    expect(['velocity', 'junk', 'accuracy']).toContain(pitcherKey);
    expect(['power', 'contact', 'speed', 'fielding', 'arm']).toContain(hitterKey);
    expect(selectDevelopmentRatingKey(entry({ playerId: 'same-pitcher', isPitcher: true }))).toBe(pitcherKey);
    expect(selectDevelopmentRatingKey(entry({ playerId: 'same-hitter', isPitcher: false }))).toBe(hitterKey);
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
    const shifter = entry({ playerId: 'player-shifter', performanceSignal: 1 });
    const nonShifter = entry({ playerId: 'player-no-shift', performanceSignal: 0 });
    vi.spyOn(checkpointSweepSeam, 'resolveCheckpointRoster').mockResolvedValue([shifter, nonShifter]);

    const result = await persistDarkCheckpointSweepForCompletedGame(gameState(), scope);
    const rows = await overlayStorage.getFranchiseRatingsOverlaysByScope(scope);
    const ratingKey = selectDevelopmentRatingKey(shifter);
    const dev = computeCheckpointRatingDevelopment(
      {
        ratingKey,
        baseRatingValue: shifter.baseRatings[ratingKey],
        performanceSignal: shifter.performanceSignal,
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

  test('replaying the same boundary checkpoint overwrites the same overlay id without duplicates', async () => {
    setFranchisePhase2CheckpointEnabledForTests(true);
    const shifter = entry({ playerId: 'player-idempotent', performanceSignal: 1 });
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

  test('resolveCheckpointRoster returns MLB players with TV rows and projected checkpoint inputs', async () => {
    const hitter = player({
      id: 'hitter-tv',
      primaryPosition: 'SS',
      personality: 'Spirited',
      morale: 64,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    });
    const pitcher = player({
      id: 'pitcher-tv',
      primaryPosition: 'SP',
      personality: 'Crafty',
      morale: 42,
      hiddenPersonalityModifiers: { loyalty: 61, ambition: 72, resilience: 83, charisma: 94 },
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-b', rosterStatus: 'MLB' }],
    });
    const noTrueValue = player({
      id: 'no-tv',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    });
    const farm = player({
      id: 'farm-tv',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'FARM' }],
    });

    vi.mocked(getAllFranchiseTeams).mockResolvedValue([{ id: 'team-a', leagueIds: ['league-1'] } as never]);
    vi.mocked(getAllFranchisePlayers).mockResolvedValue([hitter, pitcher, noTrueValue, farm]);
    vi.mocked(getPlayerRosterStatusForLeague).mockImplementation((p) => {
      const id = (p as { id: string }).id;
      return id === 'farm-tv' ? 'FARM' : 'MLB';
    });
    vi.mocked(getPlayerTeamIdForLeague).mockImplementation((p) =>
      (p as { id: string }).id === 'pitcher-tv' ? 'team-b' : 'team-a',
    );
    vi.mocked(getFranchiseTrueValueRows).mockResolvedValue([
      {
        ...scope,
        playerId: 'hitter-tv',
        valueDelta: 100000,
        computedAt: '2026-06-18T01:00:00.000Z',
      },
      {
        ...scope,
        playerId: 'pitcher-tv',
        valueDelta: -300000,
        computedAt: '2026-06-18T02:00:00.000Z',
      },
      {
        ...scope,
        playerId: 'farm-tv',
        valueDelta: 250000,
        computedAt: '2026-06-18T03:00:00.000Z',
      },
    ] as never);
    vi.mocked(getFranchiseMoraleSnapshot).mockImplementation(async (_scope, _targetType, teamId) =>
      teamId === 'team-a' ? ({ currentValue: 71 } as never) : null,
    );

    const roster = await resolveCheckpointRoster(scope, gameState());

    expect(roster).toEqual([
      {
        playerId: 'hitter-tv',
        teamId: 'team-a',
        isPitcher: false,
        baseRatings: {
          power: 50,
          contact: 51,
          speed: 52,
          fielding: 53,
          arm: 54,
        },
        personality: 'JOLLY',
        modifiers: neutralModifiers,
        playerMorale: 64,
        teamFanMorale: 71,
        performanceSignal: normalizePerformanceSignal(100000, CHECKPOINT_DEV_TUNING),
        createdAt: '2026-06-18T01:00:00.000Z',
      },
      {
        playerId: 'pitcher-tv',
        teamId: 'team-b',
        isPitcher: true,
        baseRatings: {
          velocity: 55,
          junk: 56,
          accuracy: 57,
        },
        personality: 'TOUGH',
        modifiers: { loyalty: 61, ambition: 72, resilience: 83 },
        playerMorale: 42,
        teamFanMorale: 50,
        performanceSignal: normalizePerformanceSignal(-300000, CHECKPOINT_DEV_TUNING),
        createdAt: '2026-06-18T02:00:00.000Z',
      },
    ]);
    expect(getFranchiseMoraleSnapshot).toHaveBeenCalledTimes(2);
  });

  test('compute module source stays deterministic and store-safe', () => {
    const source = readFileSync('src/utils/franchiseCheckpointSweepCompute.ts', 'utf8');

    expect(source).not.toMatch(/Math\.random|Date\.now|new Date\(|indexedDB\.open/);
  });
});
