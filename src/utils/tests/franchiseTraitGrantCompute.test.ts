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
  getSeasonPitchingStats: vi.fn(),
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
  getSeasonPitchingStats: mocks.getSeasonPitchingStats,
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
  deleteFranchiseDatabase,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from '../franchisePlayerStorage';
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
import { TRAIT_ACQUISITION_TUNING } from '../../engines/traitAcquisition';
import type { Player, Team } from '../leagueBuilderStorage';

const DB_NAME = 'kbl-tracker';
const ROSTER_DB_FRANCHISE_ID = 'franchise-trait-roster-ratings';
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
const trendTiltWeightDefault = TRAIT_ACQUISITION_TUNING.trendTiltWeight;

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

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-trait-ratings',
    name: 'Trait Ratings',
    abbreviation: 'TRR',
    location: 'Trait City',
    nickname: 'Ratings',
    colors: { primary: '#111111', secondary: '#eeeeee' },
    stadium: 'Trait Park',
    leagueIds: ['league-trait-ratings'],
    createdDate: '2026-06-25T00:00:00.000Z',
    lastModified: '2026-06-25T00:00:00.000Z',
    ...overrides,
  } as Team;
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'fielder-ratings',
    firstName: 'Field',
    lastName: 'Rating',
    gender: 'M',
    age: 26,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 64,
    arm: 88,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'C',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 0,
    leagueAssignments: [{
      leagueId: 'league-trait-ratings',
      teamId: 'team-trait-ratings',
      rosterStatus: 'MLB',
    }],
    createdDate: '2026-06-25T00:00:00.000Z',
    lastModified: '2026-06-25T00:00:00.000Z',
    isCustom: true,
    ...overrides,
  } as Player;
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
      scheduleGameId: gameState.scheduleGameId,
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
  mocks.getSeasonPitchingStats.mockResolvedValue([
    { playerId: 'player-alpha', games: 9, gamesStarted: 3, outsRecorded: 54 },
  ]);
}

function seasonGame(gameId: string, scheduleGameId?: string): Record<string, unknown> {
  return {
    gameId,
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
    checksum: `checksum-${gameId}`,
    ...(scheduleGameId ? { scheduleGameId } : {}),
  };
}

function seedWindowedCheckpointReads(): PersistedGameState {
  const state40 = {
    ...gameState,
    gameId: 'game-40',
    scheduleGameId: 'schedule-40',
  } as PersistedGameState;
  const gameNumberByScheduleId = new Map([
    ['schedule-20', 20],
    ['schedule-40', 40],
    ['schedule-60', 60],
  ]);

  mocks.getGame.mockImplementation(async (scheduleGameId: string) => ({
    id: scheduleGameId,
    gameNumber: gameNumberByScheduleId.get(scheduleGameId) ?? 0,
  }));
  mocks.getSeasonMetadata.mockResolvedValue({
    seasonId: scope.seasonId,
    seasonNumber: scope.seasonNumber,
    seasonName: 'Trait Grant Season',
    status: 'active',
    startDate: 1,
    gamesPlayed: 40,
    totalGames: 100,
    gamesPerTeam: null,
  });
  mocks.getSeasonGames.mockResolvedValue([
    seasonGame('game-20', 'schedule-20'),
    seasonGame('game-40', 'schedule-40'),
    seasonGame('game-60', 'schedule-60'),
    seasonGame('game-unscheduled'),
  ]);
  mocks.getGameEvents.mockImplementation(async (gameId: string) => {
    if (gameId === 'game-20') return [{ eventId: 'old-ab', gameId, timestamp: atBatTimestamp - 2000 }];
    if (gameId === 'game-40') return [{ eventId: 'recent-ab', gameId, timestamp: atBatTimestamp }];
    if (gameId === 'game-60') return [{ eventId: 'future-ab', gameId, timestamp: atBatTimestamp + 2000 }];
    return [];
  });
  mocks.getBetweenPlayEvents.mockImplementation(async (gameId: string) => {
    if (gameId === 'game-40') return [{ id: 'recent-between', gameId, timestamp: atBatTimestamp }];
    if (gameId === 'game-60') return [{ id: 'future-between', gameId, timestamp: atBatTimestamp + 2000 }];
    return [];
  });
  mocks.getGameFieldingEvents.mockImplementation(async (gameId: string) => {
    if (gameId === 'game-40') return [{ id: 'recent-fielding', gameId, timestamp: atBatTimestamp }];
    if (gameId === 'game-60') return [{ id: 'future-fielding', gameId, timestamp: atBatTimestamp + 2000 }];
    return [];
  });
  mocks.getSeasonInjuryCountsByPlayer.mockResolvedValue(new Map());
  mocks.getAllFieldingStats.mockResolvedValue([
    { playerId: 'player-alpha', games: 8, outfieldAssists: 1, baserunnersHeld: 2 },
    { playerId: 'player-beta', games: 8, outfieldAssists: 0, baserunnersHeld: 0 },
  ]);
  mocks.getSeasonBattingStats.mockResolvedValue([
    { playerId: 'player-alpha', games: 12 },
    { playerId: 'player-beta', games: 12 },
  ]);
  mocks.getSeasonPitchingStats.mockResolvedValue([]);

  return state40;
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
      speed: 70,
      fielding: 72,
      arm: 83,
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
    TRAIT_ACQUISITION_TUNING.trendTiltWeight = trendTiltWeightDefault;
    resetFranchiseTraitOverlaysForTests();
    await deleteDatabase(DB_NAME);
    await deleteFranchiseDatabase(ROSTER_DB_FRANCHISE_ID);
    setFranchisePhase2TraitsEnabledForTests(null);
  });

  afterEach(async () => {
    TRAIT_ACQUISITION_TUNING.trendTiltWeight = trendTiltWeightDefault;
    setFranchisePhase2TraitsEnabledForTests(null);
    resetFranchiseTraitOverlaysForTests();
    await deleteDatabase(DB_NAME);
    await deleteFranchiseDatabase(ROSTER_DB_FRANCHISE_ID);
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
    expect(traitGrantSeam.computeTraitAcquisition).toHaveBeenCalledWith(expect.objectContaining({
      seed: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:player-alpha:trait-grant-20`,
    }));
  });

  test('default trend weight keeps a later checkpoint byte-identical and invokes the candidate builder only once', async () => {
    setFranchisePhase2TraitsEnabledForTests(true);
    seedCheckpointReads(40);
    const aggregateCandidates = [candidate('Clutch', 0.9), candidate('Choker', 0.2)];
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
        speed: 70,
        fielding: 72,
        arm: 83,
      } satisfies TraitGrantRosterEntry,
    ]);
    const candidateSpy = vi.spyOn(traitGrantSeam, 'computeSeasonTraitCandidates').mockReturnValue(new Map([
      ['player-alpha', aggregateCandidates],
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

    const result = await persistDarkTraitGrantForCompletedGame({
      ...gameState,
      gameId: 'game-40',
    } as PersistedGameState, scope);
    const rows = await getFranchiseTraitOverlaysByScope(scope);
    const acquisitionInput = vi.mocked(traitGrantSeam.computeTraitAcquisition).mock.calls[0][0];

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(candidateSpy).toHaveBeenCalledTimes(1);
    expect(acquisitionInput.candidates).toBe(aggregateCandidates);
    expect(acquisitionInput.candidates.some((entry) => 'recentPercentile' in entry)).toBe(false);
    expect(rows).toEqual([
      expect.objectContaining({
        id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:player-alpha:Clutch:trait-grant-40`,
        playerId: 'player-alpha',
        traitName: 'Clutch',
        displacesTraitName: 'Choker',
        realityPercentile: 0.9,
        probability: 0.81,
        confirmationStatus: 'pending',
        applied: false,
        source: 'trait-grant',
        sourceEventId: 'trait-grant-40',
        createdAtGameNumber: 40,
        createdAt: new Date(atBatTimestamp).toISOString(),
      }),
    ]);
  });

  test('positive trend weight reruns the candidate builder on the previous-checkpoint window and supplies recent percentiles', async () => {
    setFranchisePhase2TraitsEnabledForTests(true);
    TRAIT_ACQUISITION_TUNING.trendTiltWeight = 0.5;
    const state40 = seedWindowedCheckpointReads();
    vi.spyOn(traitGrantSeam, 'resolveTraitGrantRoster').mockResolvedValue([
      {
        playerId: 'player-alpha',
        role: 'position',
        personality: 'Competitive',
        modifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
        currentMorale: 50,
        heldTraitNames: [],
        bats: 'R',
        throws: 'R',
        primaryPosition: 'CF',
        speed: 70,
        fielding: 72,
        arm: 83,
      },
      {
        playerId: 'player-beta',
        role: 'position',
        personality: 'Competitive',
        modifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
        currentMorale: 50,
        heldTraitNames: [],
        bats: 'R',
        throws: 'R',
        primaryPosition: 'LF',
        speed: 62,
        fielding: 68,
        arm: 70,
      },
    ] satisfies TraitGrantRosterEntry[]);
    const capturedInputs: SeasonTraitCandidateInput[] = [];
    const aggregateAlpha = candidate('Clutch', 0.6);
    const aggregateBeta = candidate('Clutch', 0.4);
    const recentAlpha = candidate('Clutch', 0.95);
    const candidateSpy = vi.spyOn(traitGrantSeam, 'computeSeasonTraitCandidates').mockImplementation((input) => {
      capturedInputs.push(input);
      if (capturedInputs.length === 1) {
        return new Map([
          ['player-alpha', [aggregateAlpha]],
          ['player-beta', [aggregateBeta]],
        ]);
      }
      return new Map([
        ['player-alpha', [recentAlpha]],
      ]);
    });
    vi.spyOn(traitGrantSeam, 'computeTraitAcquisition').mockReturnValue({
      proposals: [],
      skipped: [],
    });

    const result = await persistDarkTraitGrantForCompletedGame(state40, scope);

    expect(result).toEqual({ status: 'written', written: 0 });
    expect(candidateSpy).toHaveBeenCalledTimes(2);
    expect(capturedInputs[1].atBatEvents.map((event) => event.gameId)).toEqual(['game-40']);
    expect(capturedInputs[1].betweenPlayEvents.map((event) => event.gameId)).toEqual(['game-40']);
    expect(capturedInputs[1].fieldingEvents.map((event) => event.gameId)).toEqual(['game-40']);
    expect(capturedInputs[1].seasonFieldingByPlayer).toBe(capturedInputs[0].seasonFieldingByPlayer);
    expect(capturedInputs[1].seasonPitchingByPlayer).toBe(capturedInputs[0].seasonPitchingByPlayer);
    expect(capturedInputs[1].injuryCountsByPlayer).toBe(capturedInputs[0].injuryCountsByPlayer);
    expect(capturedInputs[1].gamesByPlayer).toBe(capturedInputs[0].gamesByPlayer);

    const acquisitionCalls = vi.mocked(traitGrantSeam.computeTraitAcquisition).mock.calls;
    const alphaInput = acquisitionCalls.find(([input]) => input.seed?.includes(':player-alpha:'))?.[0];
    const betaInput = acquisitionCalls.find(([input]) => input.seed?.includes(':player-beta:'))?.[0];
    const alphaCandidate = alphaInput?.candidates.find((entry) => entry.traitName === 'Clutch');
    const betaCandidate = betaInput?.candidates.find((entry) => entry.traitName === 'Clutch');

    expect(alphaCandidate?.recentPercentile).toBe(0.95);
    expect(Number.isFinite(alphaCandidate?.recentPercentile)).toBe(true);
    expect(betaCandidate).toBe(aggregateBeta);
    expect(betaCandidate && 'recentPercentile' in betaCandidate).toBe(false);
  });

  test('checkpoint one stays neutral and does not rerun recent candidates even when trend weight is enabled', async () => {
    setFranchisePhase2TraitsEnabledForTests(true);
    TRAIT_ACQUISITION_TUNING.trendTiltWeight = 0.5;
    seedCheckpointReads(20);
    const aggregateCandidates = [candidate('Clutch', 0.9)];
    vi.spyOn(traitGrantSeam, 'resolveTraitGrantRoster').mockResolvedValue([
      {
        playerId: 'player-alpha',
        role: 'position',
        personality: 'Competitive',
        modifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
        currentMorale: 50,
        heldTraitNames: [],
        bats: 'R',
        throws: 'R',
        primaryPosition: 'CF',
        speed: 70,
        fielding: 72,
        arm: 83,
      } satisfies TraitGrantRosterEntry,
    ]);
    const candidateSpy = vi.spyOn(traitGrantSeam, 'computeSeasonTraitCandidates').mockReturnValue(new Map([
      ['player-alpha', aggregateCandidates],
    ]));
    vi.spyOn(traitGrantSeam, 'computeTraitAcquisition').mockReturnValue({
      proposals: [],
      skipped: [],
    });

    const result = await persistDarkTraitGrantForCompletedGame(gameState, scope);
    const acquisitionInput = vi.mocked(traitGrantSeam.computeTraitAcquisition).mock.calls[0][0];

    expect(result).toEqual({ status: 'written', written: 0 });
    expect(candidateSpy).toHaveBeenCalledTimes(1);
    expect(acquisitionInput.candidates).toBe(aggregateCandidates);
    expect(acquisitionInput.candidates.some((entry) => 'recentPercentile' in entry)).toBe(false);
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

  test('resolveTraitGrantRoster carries player fielding and arm ratings onto roster entries', async () => {
    await saveFranchiseTeam(ROSTER_DB_FRANCHISE_ID, makeTeam());
    await saveFranchisePlayer(ROSTER_DB_FRANCHISE_ID, makePlayer({
      id: 'fielder-ratings',
      fielding: 64,
      arm: 88,
    }));

    const roster = await traitGrantSeam.resolveTraitGrantRoster({
      franchiseId: ROSTER_DB_FRANCHISE_ID,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
    });

    expect(roster).toHaveLength(1);
    expect(roster[0]).toMatchObject({
      playerId: 'fielder-ratings',
      role: 'position',
      fielding: 64,
      arm: 88,
    });
  });

  test('threads roster handedness, position, and pitcher grade into computeSeasonTraitCandidates maps', async () => {
    setFranchisePhase2TraitsEnabledForTests(true);
    seedCheckpointReads();
    mocks.getSeasonPitchingStats.mockResolvedValue([
      { playerId: 'player-pitcher', games: 9, gamesStarted: 3, outsRecorded: 54 },
    ]);

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
        speed: 68,
        fielding: 64,
        arm: 76,
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
        speed: 40,
        fielding: 51,
        arm: 90,
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

    // speedByPlayer carries current SPD for TRAIT-REALITY-1's steal expectation.
    expect(input.speedByPlayer).toBeInstanceOf(Map);
    expect(input.speedByPlayer?.get('player-batter')).toBe(68);
    expect(input.speedByPlayer?.get('player-pitcher')).toBe(40);
    expect(input.speedByPlayer?.size).toBe(2);

    // fielderRatingsByPlayer carries every roster player's fielding/arm ratings for DT-C2's emission gate.
    expect(input.fielderRatingsByPlayer).toBeInstanceOf(Map);
    expect(input.fielderRatingsByPlayer?.get('player-batter')).toEqual({ fielding: 64, arm: 76 });
    expect(input.fielderRatingsByPlayer?.get('player-pitcher')).toEqual({ fielding: 51, arm: 90 });
    expect(input.fielderRatingsByPlayer?.size).toBe(2);

    // pitcherGradeByPlayer carries the Smb4Grade for pitcher-role entries and omits position players.
    expect(input.pitcherGradeByPlayer).toBeInstanceOf(Map);
    expect(input.pitcherGradeByPlayer?.has('player-batter')).toBe(false);
    expect(input.pitcherGradeByPlayer?.get('player-pitcher')).toBe(pitcherGrade);
    expect(input.pitcherGradeByPlayer?.size).toBe(1);

    // seasonPitchingByPlayer carries the Workhorse input rows from season pitching stats.
    expect(input.seasonPitchingByPlayer).toBeInstanceOf(Map);
    expect(input.seasonPitchingByPlayer?.get('player-pitcher')).toEqual({
      outsRecorded: 54,
      games: 9,
      gamesStarted: 3,
    });
    expect(input.seasonPitchingByPlayer?.size).toBe(1);
  });
});
