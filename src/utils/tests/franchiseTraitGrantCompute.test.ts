import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  getSeasonMetadata: vi.fn(),
  getSeasonGames: vi.fn(),
  getGameEvents: vi.fn(),
  getBetweenPlayEvents: vi.fn(),
  getGameFieldingEvents: vi.fn(),
  getSeasonInjuryCountsByPlayer: vi.fn(),
  getAllFieldingStats: vi.fn(),
  getSeasonBattingStats: vi.fn(),
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
  getAllFieldingStats: mocks.getAllFieldingStats,
  getSeasonBattingStats: mocks.getSeasonBattingStats,
}));

vi.mock('../eventLog', async () => {
  const actual = await vi.importActual<typeof import('../eventLog')>('../eventLog');
  return {
    ...actual,
    getSeasonGames: mocks.getSeasonGames,
    getGameEvents: mocks.getGameEvents,
    getBetweenPlayEvents: mocks.getBetweenPlayEvents,
    getGameFieldingEvents: mocks.getGameFieldingEvents,
    getSeasonInjuryCountsByPlayer: mocks.getSeasonInjuryCountsByPlayer,
  };
});

vi.mock('../syncEngine', () => ({
  syncEngine: mocks.syncEngine,
}));

import {
  persistDarkTraitGrantForCompletedGame,
  traitGrantSeam,
  type TraitGrantRosterEntry,
  type TraitGrantScope,
} from '../franchiseTraitGrantCompute';
import {
  getFranchiseTraitOverlaysByScope,
  resetFranchiseTraitOverlaysForTests,
} from '../franchiseTraitOverlayStorage';
import { setFranchisePhase2TraitsEnabledForTests } from '../franchisePhase2Flags';
import type { PersistedGameState } from '../gameStorage';
import type {
  SeasonTraitCandidate,
  SeasonTraitCandidateInput,
} from '../../engines/traitCandidateBuilder';
import { SMB4_FULL_GRADE_SCALE } from '../../engines/smb4GradeEmulator';

const DB_NAME = 'kbl-tracker';
const scope: TraitGrantScope = {
  franchiseId: 'franchise-trait-grants',
  seasonId: 'season-trait-grants',
  statsScopeId: 'scope-trait-grants',
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

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function candidate(
  traitName: string,
  realityPercentile: number,
): SeasonTraitCandidate {
  return {
    traitName,
    score: {
      traitName,
      realityPercentile,
      sufficient: true,
      sufficiency: 'sufficient',
      scaledMinSample: 10,
      peerPoolSize: 4,
    },
    signalValue: realityPercentile,
    sampleSize: 20,
  };
}

function seedCheckpointReads(gameNumber = 20, metadataOverrides: Record<string, unknown> = {}): void {
  mocks.getGame.mockResolvedValue({
    id: 'schedule-20',
    gameNumber,
  });
  mocks.getSeasonMetadata.mockResolvedValue({
    seasonId: scope.seasonId,
    seasonNumber: scope.seasonNumber,
    seasonName: 'Trait Grant Season',
    status: 'active',
    startDate: 1,
    gamesPlayed: gameNumber,
    totalGames: 100,
    gamesPerTeam: null,
    ...metadataOverrides,
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
    {
      eventId: 'game-20_1',
      gameId: gameState.gameId,
      eventIndex: 1,
      timestamp: atBatTimestamp,
    },
  ]);
  mocks.getBetweenPlayEvents.mockResolvedValue([]);
  mocks.getGameFieldingEvents.mockResolvedValue([]);
  mocks.getSeasonInjuryCountsByPlayer.mockResolvedValue(new Map());
  mocks.getAllFieldingStats.mockResolvedValue([
    { playerId: 'player-alpha', games: 8, outfieldAssists: 1, baserunnersHeld: 2 },
  ]);
  mocks.getSeasonBattingStats.mockResolvedValue([
    { playerId: 'player-alpha', games: 12 },
  ]);
}

function stubTraitPipeline(): void {
  vi.spyOn(traitGrantSeam, 'resolveTraitGrantRoster').mockResolvedValue([
    {
      playerId: 'player-alpha',
      role: 'position',
      personality: 'Competitive',
      modifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
      currentMorale: 50,
      heldTraitNames: ['Choker'],
      bats: 'R',
      throws: 'R',
      primaryPosition: 'CF',
    } satisfies TraitGrantRosterEntry,
  ]);
  vi.spyOn(traitGrantSeam, 'computeSeasonTraitCandidates').mockReturnValue(new Map([
    ['player-alpha', [candidate('Clutch', 0.9), candidate('Choker', 0.2)]],
  ]));
  vi.spyOn(traitGrantSeam, 'computeTraitAcquisition').mockReturnValue({
    proposals: [
      {
        traitName: 'Clutch',
        valence: 'gain',
        imageValence: 'positive',
        probability: 0.81,
        realityPercentile: 0.9,
        factors: {
          ambitionTilt: 1,
          resilienceTilt: 1,
          imageAxisTilt: 1,
          moraleFactor: 1,
          rosterRoleFactor: 1,
        },
        displaces: 'Choker',
      },
    ],
    skipped: [],
  });
}

describe('persistDarkTraitGrantForCompletedGame', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    resetFranchiseTraitOverlaysForTests();
    await deleteDatabase(DB_NAME);
    setFranchisePhase2TraitsEnabledForTests(null);
  });

  afterEach(async () => {
    setFranchisePhase2TraitsEnabledForTests(null);
    resetFranchiseTraitOverlaysForTests();
    await deleteDatabase(DB_NAME);
  });

  test('flag off returns dark-noop without loading schedule, season, events, roster, or overlays', async () => {
    setFranchisePhase2TraitsEnabledForTests(false);

    const result = await persistDarkTraitGrantForCompletedGame(gameState, scope);

    expect(result).toEqual({
      status: 'dark-noop',
      written: 0,
      reason: 'Phase-2 traits disabled.',
    });
    expect(mocks.getGame).not.toHaveBeenCalled();
    expect(mocks.getSeasonMetadata).not.toHaveBeenCalled();
    expect(mocks.getSeasonGames).not.toHaveBeenCalled();
    expect(await getFranchiseTraitOverlaysByScope(scope)).toEqual([]);
  });

  test('flag on but not a checkpoint boundary returns not-checkpoint and writes zero rows', async () => {
    setFranchisePhase2TraitsEnabledForTests(true);
    seedCheckpointReads(19);

    const result = await persistDarkTraitGrantForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'not-checkpoint', written: 0 });
    expect(mocks.getSeasonGames).not.toHaveBeenCalled();
    expect(await getFranchiseTraitOverlaysByScope(scope)).toEqual([]);
  });

  test('checkpoint boundary writes pending trait overlay rows and replays idempotently', async () => {
    setFranchisePhase2TraitsEnabledForTests(true);
    seedCheckpointReads();
    stubTraitPipeline();

    const first = await persistDarkTraitGrantForCompletedGame(gameState, scope);
    const afterFirst = await getFranchiseTraitOverlaysByScope(scope);
    const second = await persistDarkTraitGrantForCompletedGame(gameState, scope);
    const afterSecond = await getFranchiseTraitOverlaysByScope(scope);

    expect(first).toEqual({ status: 'written', written: 1 });
    expect(second).toEqual({ status: 'written', written: 1 });
    expect(afterSecond).toEqual(afterFirst);
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0]).toMatchObject({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:player-alpha:Clutch:trait-grant-20`,
      playerId: 'player-alpha',
      valence: 'gain',
      traitName: 'Clutch',
      displacesTraitName: 'Choker',
      realityPercentile: 0.9,
      probability: 0.81,
      confirmationStatus: 'pending',
      applied: false,
      source: 'trait-grant',
      sourceEventId: 'trait-grant-20',
      createdAtGameNumber: 20,
      createdAt: new Date(atBatTimestamp).toISOString(),
    });
  });

  test('frequent cadence from season metadata makes game 10 of 100 a trait checkpoint', async () => {
    setFranchisePhase2TraitsEnabledForTests(true);
    seedCheckpointReads(10, { checkpointCadence: 'frequent' });
    stubTraitPipeline();

    const result = await persistDarkTraitGrantForCompletedGame(gameState, scope);
    const rows = await getFranchiseTraitOverlaysByScope(scope);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      playerId: 'player-alpha',
      sourceEventId: 'trait-grant-10',
      createdAtGameNumber: 10,
    });
  });

  test('two runs with the same seeded state write identical rows', async () => {
    setFranchisePhase2TraitsEnabledForTests(true);
    seedCheckpointReads();
    stubTraitPipeline();

    await persistDarkTraitGrantForCompletedGame(gameState, scope);
    const firstRows = await getFranchiseTraitOverlaysByScope(scope);

    resetFranchiseTraitOverlaysForTests();
    await deleteDatabase(DB_NAME);
    seedCheckpointReads();
    stubTraitPipeline();

    await persistDarkTraitGrantForCompletedGame(gameState, scope);
    const secondRows = await getFranchiseTraitOverlaysByScope(scope);

    expect(secondRows).toEqual(firstRows);
  });

  test('threads roster handedness, position, and pitcher grade into computeSeasonTraitCandidates maps', async () => {
    setFranchisePhase2TraitsEnabledForTests(true);
    seedCheckpointReads();

    const pitcherGrade = SMB4_FULL_GRADE_SCALE[3]; // 'A-' — a valid Smb4Grade
    vi.spyOn(traitGrantSeam, 'resolveTraitGrantRoster').mockResolvedValue([
      {
        playerId: 'player-batter',
        role: 'position',
        personality: 'Competitive',
        modifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
        currentMorale: 50,
        heldTraitNames: [],
        bats: 'L',
        throws: 'R',
        primaryPosition: '2B',
        // position players carry no grade
      },
      {
        playerId: 'player-pitcher',
        role: 'pitcher',
        personality: 'Egotistical',
        modifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
        currentMorale: 50,
        heldTraitNames: [],
        bats: 'S',
        throws: 'L',
        primaryPosition: 'SP',
        grade: pitcherGrade,
      },
    ] satisfies TraitGrantRosterEntry[]);

    let capturedInput: SeasonTraitCandidateInput | undefined;
    vi.spyOn(traitGrantSeam, 'computeSeasonTraitCandidates').mockImplementation((input) => {
      capturedInput = input;
      return new Map();
    });
    vi.spyOn(traitGrantSeam, 'computeTraitAcquisition').mockReturnValue({
      proposals: [],
      skipped: [],
    });

    const result = await persistDarkTraitGrantForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'written', written: 0 });
    expect(capturedInput).toBeDefined();

    const input = capturedInput as SeasonTraitCandidateInput;

    // batterHandByPlayer carries every roster player's bats hand.
    expect(input.batterHandByPlayer).toBeInstanceOf(Map);
    expect(input.batterHandByPlayer?.get('player-batter')).toBe('L');
    expect(input.batterHandByPlayer?.get('player-pitcher')).toBe('S');
    expect(input.batterHandByPlayer?.size).toBe(2);

    // pitcherHandByPlayer carries every roster player's throws hand (covers position players too).
    expect(input.pitcherHandByPlayer).toBeInstanceOf(Map);
    expect(input.pitcherHandByPlayer?.get('player-batter')).toBe('R');
    expect(input.pitcherHandByPlayer?.get('player-pitcher')).toBe('L');
    expect(input.pitcherHandByPlayer?.size).toBe(2);

    // primaryPositionByPlayer carries every roster player's primary position.
    expect(input.primaryPositionByPlayer).toBeInstanceOf(Map);
    expect(input.primaryPositionByPlayer?.get('player-batter')).toBe('2B');
    expect(input.primaryPositionByPlayer?.get('player-pitcher')).toBe('SP');
    expect(input.primaryPositionByPlayer?.size).toBe(2);

    // pitcherGradeByPlayer carries the Smb4Grade for pitcher-role entries and omits position players.
    expect(input.pitcherGradeByPlayer).toBeInstanceOf(Map);
    expect(input.pitcherGradeByPlayer?.has('player-batter')).toBe(false);
    expect(input.pitcherGradeByPlayer?.get('player-pitcher')).toBe(pitcherGrade);
    expect(input.pitcherGradeByPlayer?.size).toBe(1);
  });
});
