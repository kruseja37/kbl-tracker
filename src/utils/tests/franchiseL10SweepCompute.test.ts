import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  getSeasonMetadata: vi.fn(),
  getSeasonGames: vi.fn(),
  getGameEvents: vi.fn(),
  syncEngine: {
    isSuppressed: vi.fn(() => false),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../scheduleStorage', () => ({
  getGame: mocks.getGame,
}));

vi.mock('../seasonStorage', () => ({
  getSeasonMetadata: mocks.getSeasonMetadata,
}));

vi.mock('../eventLog', async () => {
  const actual = await vi.importActual<typeof import('../eventLog')>('../eventLog');
  return {
    ...actual,
    getSeasonGames: mocks.getSeasonGames,
    getGameEvents: mocks.getGameEvents,
  };
});

vi.mock('../syncEngine', () => ({
  syncEngine: mocks.syncEngine,
}));

import {
  persistDarkL10ForCompletedGame,
  l10SweepSeam,
  type L10SweepScope,
} from '../franchiseL10SweepCompute';
import { computeFranchiseL10Events, type FranchiseL10Candidate } from '../../engines/franchiseL10EventEngine';
import {
  getFranchiseL10OverlaysByScope,
  resetFranchiseL10OverlaysForTests,
} from '../franchiseL10OverlayStorage';
import { setFranchisePhase2L10EnabledForTests } from '../franchisePhase2Flags';
import type { PersistedGameState } from '../gameStorage';

const DB_NAME = 'kbl-tracker';
const scope: L10SweepScope = {
  franchiseId: 'franchise-l10',
  seasonId: 'season-l10',
  statsScopeId: 'scope-l10',
  seasonNumber: 1,
};
const gameState = {
  id: 'current',
  gameId: 'game-20',
  scheduleGameId: 'schedule-20',
  savedAt: 111,
  inning: 9,
  halfInning: 'BOTTOM',
  outs: 3,
  homeScore: 4,
  awayScore: 3,
  bases: { first: null, second: null, third: null },
  currentBatterIndex: 0,
  atBatCount: 0,
  awayTeamId: 'away',
  homeTeamId: 'home',
  awayTeamName: 'Away',
  homeTeamName: 'Home',
  seasonNumber: 1,
  playerStats: {},
  pitcherGameStats: [],
} as unknown as PersistedGameState;
const headerTimestamp = Date.UTC(2026, 5, 18, 12, 0, 0);
const atBatTimestamp = Date.UTC(2026, 5, 18, 12, 30, 0);

// A candidate set engineered to produce fired events under the lowered Q5
// per-game rates for both game 19 and game 20.
const SEEDED_CANDIDATES: FranchiseL10Candidate[] = [
  {
    id: 'l10-seed-82',
    kind: 'player',
    role: 'position',
    personality: 'EGOTISTICAL',
    playerMorale: 100,
    fanMorale: 20,
    performanceSignal: 1,
  },
  {
    id: 'player-bravo',
    kind: 'player',
    role: 'pitcher',
    personality: 'COMPETITIVE',
    playerMorale: 10,
    fanMorale: 20,
    performanceSignal: -0.8,
  },
  {
    // Engineered (with this seedBase) to fire a team-target event so the seam
    // test exercises the targetKind:'team' row-mapping path end-to-end.
    id: 'team-seed-7',
    kind: 'team',
    fanMorale: 0,
  },
  {
    id: 'team-home',
    kind: 'team',
    fanMorale: 15,
  },
];

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function seedCheckpointReads(gameNumber = 20): void {
  mocks.getGame.mockResolvedValue({ id: 'schedule-20', gameNumber });
  mocks.getSeasonMetadata.mockResolvedValue({
    seasonId: scope.seasonId,
    seasonNumber: scope.seasonNumber,
    seasonName: 'L10 Season',
    status: 'active',
    startDate: 1,
    gamesPlayed: gameNumber,
    totalGames: 100,
    gamesPerTeam: null,
  });
  mocks.getSeasonGames.mockResolvedValue([
    {
      gameId: gameState.gameId,
      seasonId: scope.seasonId,
      date: headerTimestamp,
      awayTeamId: 'away',
      awayTeamName: 'Away',
      homeTeamId: 'home',
      homeTeamName: 'Home',
      finalScore: { away: 3, home: 4 },
      finalInning: 9,
      isComplete: true,
      aggregated: true,
      aggregatedAt: headerTimestamp,
      aggregationError: null,
      eventCount: 1,
      checksum: 'checksum',
    },
  ]);
  mocks.getGameEvents.mockResolvedValue([
    { eventId: 'game-20_1', gameId: gameState.gameId, eventIndex: 1, timestamp: atBatTimestamp },
  ]);
}

function stubCandidates(candidates: FranchiseL10Candidate[] = SEEDED_CANDIDATES): void {
  vi.spyOn(l10SweepSeam, 'resolveL10Candidates').mockResolvedValue(candidates);
}

describe('persistDarkL10ForCompletedGame', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    resetFranchiseL10OverlaysForTests();
    await deleteDatabase(DB_NAME);
    setFranchisePhase2L10EnabledForTests(null);
  });

  afterEach(async () => {
    setFranchisePhase2L10EnabledForTests(null);
    resetFranchiseL10OverlaysForTests();
    await deleteDatabase(DB_NAME);
  });

  test('flag off returns dark-noop without loading schedule, season, events, or candidates', async () => {
    setFranchisePhase2L10EnabledForTests(false);
    const candidateSpy = vi.spyOn(l10SweepSeam, 'resolveL10Candidates');

    const result = await persistDarkL10ForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'dark-noop', written: 0, reason: 'Phase-2 L10 disabled.' });
    expect(mocks.getGame).not.toHaveBeenCalled();
    expect(mocks.getSeasonMetadata).not.toHaveBeenCalled();
    expect(candidateSpy).not.toHaveBeenCalled();
    expect(await getFranchiseL10OverlaysByScope(scope)).toEqual([]);
  });

  test('Q5: continuous cadence — flag on, a non-20%-boundary game still fires and writes rows', async () => {
    setFranchisePhase2L10EnabledForTests(true);
    seedCheckpointReads(19);
    stubCandidates();

    const result = await persistDarkL10ForCompletedGame(gameState, scope);

    expect(result.status).toBe('written');
    expect(result.written).toBeGreaterThan(0);
    const rows = await getFranchiseL10OverlaysByScope(scope);
    expect(rows.length).toBe(result.written);
    for (const row of rows) {
      expect(row.sourceEventId).toBe('l10-19');
      expect(row.createdAtGameNumber).toBe(19);
    }
  });

  test('checkpoint boundary writes pending L10 overlay rows and replays idempotently', async () => {
    setFranchisePhase2L10EnabledForTests(true);
    seedCheckpointReads();
    stubCandidates();

    const first = await persistDarkL10ForCompletedGame(gameState, scope);
    const afterFirst = await getFranchiseL10OverlaysByScope(scope);
    const second = await persistDarkL10ForCompletedGame(gameState, scope);
    const afterSecond = await getFranchiseL10OverlaysByScope(scope);

    expect(first.status).toBe('written');
    expect(first.written).toBeGreaterThan(0);
    expect(second).toEqual(first);
    expect(afterSecond).toEqual(afterFirst);
    // Every row is doubly-dark: pending + unapplied, sourced from the L10 sweep.
    for (const row of afterFirst) {
      expect(row.confirmationStatus).toBe('pending');
      expect(row.applied).toBe(false);
      expect(row.source).toBe('l10-random-event');
      expect(row.sourceEventId).toBe('l10-20');
      expect(row.createdAtGameNumber).toBe(20);
      expect(row.createdAt).toBe(new Date(atBatTimestamp).toISOString());
      expect(row.id).toBe(
        `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:${row.targetId}:${row.family}:${row.eventType}:l10-20`,
      );
    }
  });

  test('producer -> consumer seam: emitted engine events become correctly shaped pending rows', async () => {
    setFranchisePhase2L10EnabledForTests(true);
    seedCheckpointReads();
    stubCandidates();

    // The expected events come straight from the REAL engine for the same seed.
    const seedBase = `${scope.franchiseId}:${scope.seasonId}:20`;
    const expectedReport = computeFranchiseL10Events({
      candidates: SEEDED_CANDIDATES,
      intensity: 'standard',
      seedBase,
    });

    const result = await persistDarkL10ForCompletedGame(gameState, scope);
    const rows = await getFranchiseL10OverlaysByScope(scope);

    expect(result.written).toBe(expectedReport.events.length);
    expect(rows).toHaveLength(expectedReport.events.length);

    const rowsById = new Map(rows.map((row) => [row.id, row]));
    for (const event of expectedReport.events) {
      const id = `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:${event.targetId}:${event.family}:${event.eventType}:l10-20`;
      const row = rowsById.get(id);
      expect(row).toBeDefined();
      expect(row).toMatchObject({
        targetId: event.targetId,
        targetKind: event.targetKind,
        family: event.family,
        eventType: event.eventType,
        valence: event.valence,
        magnitude: event.magnitude,
        probability: event.probability,
      });
    }
  });

  test('two runs with the same seeded state write identical rows', async () => {
    setFranchisePhase2L10EnabledForTests(true);
    seedCheckpointReads();
    stubCandidates();

    await persistDarkL10ForCompletedGame(gameState, scope);
    const firstRows = await getFranchiseL10OverlaysByScope(scope);

    resetFranchiseL10OverlaysForTests();
    await deleteDatabase(DB_NAME);
    seedCheckpointReads();
    stubCandidates();

    await persistDarkL10ForCompletedGame(gameState, scope);
    const secondRows = await getFranchiseL10OverlaysByScope(scope);

    expect(secondRows).toEqual(firstRows);
  });
});
