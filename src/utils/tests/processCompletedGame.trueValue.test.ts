import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../gameStorage';

const mocks = vi.hoisted(() => ({
  aggregateGameToSeason: vi.fn(),
  archiveCompletedGame: vi.fn(),
  getCompletedGameById: vi.fn(),
  resolveExhibitionLeagueId: vi.fn(),
  getGameHeader: vi.fn(),
  markAggregationFailed: vi.fn(),
  markGameAggregated: vi.fn(),
  registerAlmanacPlayers: vi.fn(),
  getEffectivePlayer: vi.fn(),
  getSeasonMetadata: vi.fn(),
  saveSeasonMetadata: vi.fn(),
  getSeasonPitchingStats: vi.fn(),
  calculateAndPersistSeasonWAR: vi.fn(),
  calculateAndPersistFranchiseTrueValueForSeason: vi.fn(),
  getFranchiseTrueValueRows: vi.fn(),
  saveFranchiseTrueValueSnapshotRows: vi.fn(),
  calculateAndPersistProjectedFranchiseDesignationsForSeason: vi.fn(),
  getScheduledGame: vi.fn(),
  patchCompletedGameLivingSeasonProcessing: vi.fn(),
  persistDarkFameRecordsForCompletedGame: vi.fn(),
  persistDarkFlashpointDecayForCompletedGame: vi.fn(),
  persistDarkCheckpointSweepForCompletedGame: vi.fn(),
  persistDarkTraitGrantForCompletedGame: vi.fn(),
  persistDarkRelationshipFormationForCompletedGame: vi.fn(),
  persistDarkRelationshipOvertakeForCompletedGame: vi.fn(),
  persistDarkRelationshipIntensityForCompletedGame: vi.fn(),
  persistDarkRelationshipMoraleForCompletedGame: vi.fn(),
  persistDarkL10ForCompletedGame: vi.fn(),
  persistDarkL11AutoBackstopForCompletedGame: vi.fn(),
  recomputeFranchiseL12StandingsForCompletedGame: vi.fn(),
  persistFranchiseAllStarRosterForCompletedGame: vi.fn(),
  persistDarkStadiumRecordsForCompletedGame: vi.fn(),
  persistDarkHomeParkRivalForCompletedGame: vi.fn(),
  archiveRecord: null as Record<string, unknown> | null,
}));

vi.mock('../seasonAggregator', () => ({
  aggregateGameToSeason: mocks.aggregateGameToSeason,
  isCompleteGameByContext: vi.fn((stats, context = {}) =>
    stats.isStarter && stats.outsRecorded >= (context.scheduledInnings ?? 9) * 3,
  ),
}));

vi.mock('../gameStorage', () => ({
  archiveCompletedGame: mocks.archiveCompletedGame,
  getCompletedGameById: mocks.getCompletedGameById,
  resolveExhibitionLeagueId: mocks.resolveExhibitionLeagueId,
  LIVING_SEASON_PROCESSING_VERSION: '1',
  SOUL_BRANCH_KEYS: [
    'fame', 'moraleAuto', 'checkpointDev', 'traits', 'L10', 'L11',
    'L12raceAllstar', 'L13', 'stadium', 'trueValueSnapshot',
  ],
  getSoulOutcomes: (record: { livingSeasonProcessing?: unknown }) => record.livingSeasonProcessing ?? null,
  patchCompletedGameLivingSeasonProcessing: mocks.patchCompletedGameLivingSeasonProcessing,
  // A1.5d-1b: the dark stadium-records tap (transitively imported via
  // processCompletedGame) reads getRecentGames at module-load; stub it.
  getRecentGames: vi.fn().mockResolvedValue([]),
}));

vi.mock('../eventLog', () => ({
  getGameHeader: mocks.getGameHeader,
  markAggregationFailed: mocks.markAggregationFailed,
  markGameAggregated: mocks.markGameAggregated,
}));

vi.mock('../registerAlmanacPlayers', () => ({
  registerAlmanacPlayers: mocks.registerAlmanacPlayers,
}));

vi.mock('../playerOverrides', () => ({
  getEffectivePlayer: mocks.getEffectivePlayer,
}));

vi.mock('../seasonStorage', () => ({
  getSeasonMetadata: mocks.getSeasonMetadata,
  saveSeasonMetadata: mocks.saveSeasonMetadata,
  getSeasonPitchingStats: mocks.getSeasonPitchingStats,
}));

vi.mock('../../src_figma/app/engines/warOrchestrator', () => ({
  calculateAndPersistSeasonWAR: mocks.calculateAndPersistSeasonWAR,
}));

vi.mock('../franchiseTrueValueStorage', () => ({
  calculateAndPersistFranchiseTrueValueForSeason: mocks.calculateAndPersistFranchiseTrueValueForSeason,
  getFranchiseTrueValueRows: mocks.getFranchiseTrueValueRows,
}));

vi.mock('../franchiseTrueValueSnapshotsStorage', () => ({
  saveFranchiseTrueValueSnapshotRows: mocks.saveFranchiseTrueValueSnapshotRows,
  // L12-3b: processCompletedGame now statically imports franchiseRaceStandingsCompute,
  // which imports this reader for its seam (flag default OFF → never called here). Stub so
  // the module graph resolves under this partial mock.
  getFranchiseTrueValueSnapshotRowsByScope: vi.fn(async () => []),
}));

vi.mock('../franchiseDesignationStorage', () => ({
  calculateAndPersistProjectedFranchiseDesignationsForSeason: mocks.calculateAndPersistProjectedFranchiseDesignationsForSeason,
  getFranchiseDesignationRow: vi.fn(async () => null),
}));

vi.mock('../scheduleStorage', () => ({
  getGame: mocks.getScheduledGame,
}));

vi.mock('../franchiseFameCompute', () => ({
  persistDarkFameRecordsForCompletedGame: mocks.persistDarkFameRecordsForCompletedGame,
}));
vi.mock('../franchiseFlashpointDecayCompute', () => ({
  persistDarkFlashpointDecayForCompletedGame: mocks.persistDarkFlashpointDecayForCompletedGame,
}));
vi.mock('../franchiseCheckpointSweepCompute', () => ({
  persistDarkCheckpointSweepForCompletedGame: mocks.persistDarkCheckpointSweepForCompletedGame,
}));
vi.mock('../franchiseTraitGrantCompute', () => ({
  persistDarkTraitGrantForCompletedGame: mocks.persistDarkTraitGrantForCompletedGame,
}));
vi.mock('../franchiseRelationshipFormationCompute', () => ({
  persistDarkRelationshipFormationForCompletedGame: mocks.persistDarkRelationshipFormationForCompletedGame,
}));
vi.mock('../franchiseRelationshipOvertakeCompute', () => ({
  persistDarkRelationshipOvertakeForCompletedGame: mocks.persistDarkRelationshipOvertakeForCompletedGame,
}));
vi.mock('../franchiseRelationshipIntensityCompute', () => ({
  persistDarkRelationshipIntensityForCompletedGame: mocks.persistDarkRelationshipIntensityForCompletedGame,
}));
vi.mock('../franchiseRelationshipMoraleCompute', () => ({
  persistDarkRelationshipMoraleForCompletedGame: mocks.persistDarkRelationshipMoraleForCompletedGame,
}));
vi.mock('../franchiseL10SweepCompute', () => ({
  persistDarkL10ForCompletedGame: mocks.persistDarkL10ForCompletedGame,
}));
vi.mock('../franchiseManagerAutoBackstop', () => ({
  persistDarkL11AutoBackstopForCompletedGame: mocks.persistDarkL11AutoBackstopForCompletedGame,
}));
vi.mock('../franchiseRaceStandingsCompute', () => ({
  recomputeFranchiseL12StandingsForCompletedGame: mocks.recomputeFranchiseL12StandingsForCompletedGame,
}));
vi.mock('../franchiseAllStarRosterCompute', () => ({
  persistFranchiseAllStarRosterForCompletedGame: mocks.persistFranchiseAllStarRosterForCompletedGame,
}));
vi.mock('../franchiseStadiumRecordsTap', () => ({
  persistDarkStadiumRecordsForCompletedGame: mocks.persistDarkStadiumRecordsForCompletedGame,
}));
vi.mock('../franchiseHomeParkRivalTap', () => ({
  persistDarkHomeParkRivalForCompletedGame: mocks.persistDarkHomeParkRivalForCompletedGame,
}));
vi.mock('../franchiseHomeParkRivalStorage', () => ({
  getHomeParkRival: vi.fn(async () => null),
}));
vi.mock('../franchiseManager', () => ({
  getFranchiseConfig: vi.fn(async () => null),
}));
vi.mock('../franchisePlayerStorage', () => ({
  getAllFranchiseTeams: vi.fn(async () => []),
  getFranchisePlayer: vi.fn(async () => null),
}));
vi.mock('../franchiseTradeDemandStorage', () => ({
  getFranchiseTradeDemandRowsByScope: vi.fn(async () => []),
}));

import { processCompletedGame } from '../processCompletedGame';
import { SOUL_BRANCH_KEYS } from '../gameStorage';
import {
  setFranchisePhase2CheckpointEnabledForTests,
  setFranchisePhase2FameEnabledForTests,
  setFranchisePhase2FlashpointEnabledForTests,
  setFranchisePhase2L10EnabledForTests,
  setFranchisePhase2L11EnabledForTests,
  setFranchisePhase2L12EnabledForTests,
  setFranchisePhase2L13EnabledForTests,
  setFranchisePhase2MoraleEnabledForTests,
  setFranchisePhase2StadiumRecordsEnabledForTests,
  setFranchisePhase2TraitsEnabledForTests,
} from '../franchisePhase2Flags';

function setAllLivingSeasonFlags(enabled: boolean | null): void {
  setFranchisePhase2CheckpointEnabledForTests(enabled);
  setFranchisePhase2FameEnabledForTests(enabled);
  setFranchisePhase2FlashpointEnabledForTests(enabled);
  setFranchisePhase2L10EnabledForTests(enabled);
  setFranchisePhase2L11EnabledForTests(enabled);
  setFranchisePhase2L12EnabledForTests(enabled);
  setFranchisePhase2L13EnabledForTests(enabled);
  setFranchisePhase2MoraleEnabledForTests(enabled);
  setFranchisePhase2StadiumRecordsEnabledForTests(enabled);
  setFranchisePhase2TraitsEnabledForTests(enabled);
}

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'tv-game-1',
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
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    franchiseId: 'franchise-1',
    competitionType: 'franchise',
    competitionId: 'franchise-1',
    playerStats: {
      'batter-1': {
        playerName: 'Batter One',
        teamId: 'team-a',
        pa: 4,
        ab: 4,
        h: 2,
        singles: 1,
        doubles: 1,
        triples: 0,
        hr: 0,
        rbi: 1,
        r: 1,
        bb: 0,
        hbp: 0,
        k: 1,
        sb: 1,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 2,
        assists: 1,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [{
      pitcherId: 'pitcher-1',
      pitcherName: 'Pitcher One',
      teamId: 'team-b',
      isStarter: true,
      entryInning: 1,
      outsRecorded: 18,
      hitsAllowed: 4,
      runsAllowed: 2,
      earnedRuns: 2,
      walksAllowed: 1,
      strikeoutsThrown: 6,
      homeRunsAllowed: 0,
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: 88,
      battersFaced: 24,
      consecutiveHRsAllowed: 0,
      firstInningRuns: 0,
      basesLoadedWalks: 0,
      inningsComplete: 6,
      decision: 'W',
      save: false,
      hold: false,
      blownSave: false,
    }],
    awayLineup: [{ playerId: 'batter-1', playerName: 'Batter One', position: 'SS' }],
    homeLineupState: {
      lineup: [],
      bench: [],
      usedPlayers: [],
      currentPitcher: {
        playerId: 'pitcher-1',
        playerName: 'Pitcher One',
        position: 'SP',
        battingOrder: 10,
        enteredInning: 1,
        isStarter: true,
      },
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

describe('processCompletedGame True Value persistence gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAllLivingSeasonFlags(false);
    mocks.archiveRecord = null;
    mocks.aggregateGameToSeason.mockResolvedValue({ success: true, milestones: null });
    mocks.archiveCompletedGame.mockImplementation(async (
      state: PersistedGameState,
      _score: unknown,
      _innings: unknown,
      seasonId: string | undefined,
      context: Record<string, unknown> | undefined,
    ) => {
      mocks.archiveRecord = {
        gameId: state.gameId,
        aggregationStatus: 'aggregated',
        seasonId,
        statsScopeId: context?.statsScopeId ?? state.statsScopeId ?? seasonId,
        franchiseId: context?.franchiseId ?? state.franchiseId,
        seasonNumber: state.seasonNumber,
        livingSeasonProcessing: context?.livingSeasonProcessing,
      };
    });
    mocks.getCompletedGameById.mockImplementation(async (gameId: string) => (
      mocks.archiveRecord?.gameId === gameId ? mocks.archiveRecord : null
    ));
    mocks.patchCompletedGameLivingSeasonProcessing.mockImplementation(async (
      _gameId: string,
      update: (current: Record<string, unknown>) => Record<string, unknown>,
    ) => {
      const current = mocks.archiveRecord?.livingSeasonProcessing as Record<string, unknown>;
      mocks.archiveRecord = {
        ...mocks.archiveRecord,
        livingSeasonProcessing: update(current),
      };
      return mocks.archiveRecord;
    });
    mocks.resolveExhibitionLeagueId.mockReturnValue(null);
    mocks.getGameHeader.mockResolvedValue(null);
    mocks.markAggregationFailed.mockResolvedValue(undefined);
    mocks.markGameAggregated.mockResolvedValue(undefined);
    mocks.registerAlmanacPlayers.mockResolvedValue(undefined);
    mocks.getEffectivePlayer.mockResolvedValue(null);
    mocks.getSeasonMetadata.mockResolvedValue({ seasonId: 'season-1', gamesPerTeam: 32 });
    mocks.saveSeasonMetadata.mockResolvedValue(undefined);
    mocks.getSeasonPitchingStats.mockResolvedValue([]);
    mocks.calculateAndPersistSeasonWAR.mockResolvedValue(undefined);
    mocks.calculateAndPersistFranchiseTrueValueForSeason.mockResolvedValue({ rows: [{ playerId: 'batter-1' }], skippedRows: [], persisted: true, blockers: [] });
    mocks.getFranchiseTrueValueRows.mockResolvedValue([]);
    mocks.saveFranchiseTrueValueSnapshotRows.mockResolvedValue([]);
    mocks.calculateAndPersistProjectedFranchiseDesignationsForSeason.mockResolvedValue({ rows: [], skippedRows: [], persisted: true, blockers: [] });
    mocks.getScheduledGame.mockResolvedValue(null);
    mocks.persistDarkFameRecordsForCompletedGame.mockResolvedValue({
      written: 0,
      playerHeatDeltas: [],
      moraleRelevantPlayerHeatDeltas: [],
    });
    mocks.persistDarkFlashpointDecayForCompletedGame.mockResolvedValue({ changes: 0 });
    mocks.persistDarkCheckpointSweepForCompletedGame.mockResolvedValue({ changes: 0 });
    mocks.persistDarkTraitGrantForCompletedGame.mockResolvedValue({ changes: 0 });
    mocks.persistDarkRelationshipFormationForCompletedGame.mockResolvedValue({ changes: 0 });
    mocks.persistDarkRelationshipOvertakeForCompletedGame.mockResolvedValue({ changes: 0 });
    mocks.persistDarkRelationshipIntensityForCompletedGame.mockResolvedValue({ changes: 0 });
    mocks.persistDarkRelationshipMoraleForCompletedGame.mockResolvedValue({ changes: 0 });
    mocks.persistDarkL10ForCompletedGame.mockResolvedValue({ changes: 0 });
    mocks.persistDarkL11AutoBackstopForCompletedGame.mockResolvedValue({ fired: 0 });
    mocks.recomputeFranchiseL12StandingsForCompletedGame.mockResolvedValue({ status: 'computed' });
    mocks.persistFranchiseAllStarRosterForCompletedGame.mockResolvedValue({ status: 'persisted' });
    mocks.persistDarkStadiumRecordsForCompletedGame.mockResolvedValue({ changeList: [] });
    mocks.persistDarkHomeParkRivalForCompletedGame.mockResolvedValue({ written: 0 });
  });

  test('persists True Value and projected designations immediately after successful season WAR persistence', async () => {
    await processCompletedGame(gameState(), {
      seasonId: 'season-1',
      detectMilestones: false,
    });

    expect(mocks.calculateAndPersistSeasonWAR).toHaveBeenCalledWith(
      'season-1',
      32,
      ['batter-1', 'pitcher-1'],
      expect.any(Map),
      expect.objectContaining({
        franchiseId: 'franchise-1',
        homeTeamId: 'team-b',
      }),
    );
    expect(mocks.calculateAndPersistFranchiseTrueValueForSeason).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });
    expect(mocks.calculateAndPersistSeasonWAR.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.calculateAndPersistFranchiseTrueValueForSeason.mock.invocationCallOrder[0]);
    expect(mocks.calculateAndPersistProjectedFranchiseDesignationsForSeason).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });
    expect(mocks.calculateAndPersistFranchiseTrueValueForSeason.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.calculateAndPersistProjectedFranchiseDesignationsForSeason.mock.invocationCallOrder[0]);
  });

  test('skips True Value persistence when season WAR persistence fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.calculateAndPersistSeasonWAR.mockRejectedValueOnce(new Error('war write failed'));

    await processCompletedGame(gameState({ gameId: 'tv-game-war-fail' }), {
      seasonId: 'season-1',
      detectMilestones: false,
    });

    expect(mocks.calculateAndPersistFranchiseTrueValueForSeason).not.toHaveBeenCalled();
    expect(mocks.calculateAndPersistProjectedFranchiseDesignationsForSeason).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      '[WAR] failed to persist season WAR for completed game tv-game-war-fail:',
      expect.any(Error),
    );
    warn.mockRestore();
  });

  test('skips projected designations when True Value persistence does not write rows', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.calculateAndPersistFranchiseTrueValueForSeason.mockResolvedValueOnce({
      rows: [],
      skippedRows: [],
      persisted: false,
      blockers: ['No current MLB players had canonical salary and persisted numeric season WAR inputs for True Value.'],
    });

    await processCompletedGame(gameState({ gameId: 'tv-game-no-tv' }), {
      seasonId: 'season-1',
      detectMilestones: false,
    });

    expect(mocks.calculateAndPersistProjectedFranchiseDesignationsForSeason).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      '[Designations] skipped: True Value did not persist for completed game tv-game-no-tv',
      ['No current MLB players had canonical salary and persisted numeric season WAR inputs for True Value.'],
    );
    warn.mockRestore();
  });

  test('records every enabled branch as TV_SCOPE_UNAVAILABLE after franchise WAR failure, then completes on retry', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setAllLivingSeasonFlags(true);
    mocks.calculateAndPersistSeasonWAR.mockRejectedValueOnce(new Error('war write failed'));

    const completedGame = gameState({ gameId: 'tv-scope-retry' });
    await processCompletedGame(completedGame, { seasonId: 'season-1', detectMilestones: false });

    const firstProcessing = mocks.archiveRecord?.livingSeasonProcessing as {
      overall: string;
      branches: Record<string, { status: string; errorCode?: string }>;
    };
    expect(firstProcessing.overall).toBe('partial-failure');
    for (const branch of SOUL_BRANCH_KEYS) {
      expect(firstProcessing.branches[branch]).toMatchObject({
        status: 'FAILED',
        errorCode: 'TV_SCOPE_UNAVAILABLE',
      });
    }

    mocks.getFranchiseTrueValueRows.mockResolvedValueOnce([{
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      playerId: 'batter-1',
      trueValue: 12,
      valueDelta: 1,
      warPercentile: 0.6,
      computedAt: '2026-07-11T00:00:00.000Z',
    }]);
    await processCompletedGame(completedGame, { seasonId: 'season-1', detectMilestones: false });

    const retriedProcessing = mocks.archiveRecord?.livingSeasonProcessing as {
      overall: string;
      branches: Record<string, { status: string }>;
    };
    expect(Object.entries(retriedProcessing.branches).filter(([, outcome]) => outcome.status === 'FAILED')).toEqual([]);
    expect(retriedProcessing.overall).toBe('complete');
    for (const branch of SOUL_BRANCH_KEYS) {
      expect(retriedProcessing.branches[branch]?.status).not.toBe('FAILED');
    }
    expect(mocks.aggregateGameToSeason).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  test('records nine OFF receipts plus a failed unconditional snapshot when franchise scope is transiently unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.calculateAndPersistSeasonWAR.mockRejectedValueOnce(new Error('war write failed'));

    await processCompletedGame(gameState({ gameId: 'tv-scope-flags-off' }), {
      seasonId: 'season-1',
      detectMilestones: false,
    });

    const processing = mocks.archiveRecord?.livingSeasonProcessing as {
      overall: string;
      branches: Record<string, { status: string; errorCode?: string }>;
    };
    expect(processing.overall).toBe('partial-failure');
    expect(processing.branches.trueValueSnapshot).toMatchObject({
      status: 'FAILED',
      errorCode: 'TV_SCOPE_UNAVAILABLE',
    });
    const flagControlledBranches = SOUL_BRANCH_KEYS.filter((branch) => branch !== 'trueValueSnapshot');
    expect(flagControlledBranches).toHaveLength(9);
    for (const branch of flagControlledBranches) {
      expect(processing.branches[branch]).toEqual({ status: 'OFF' });
    }
    warn.mockRestore();
  });

  test('archives a non-franchise regular-season game without a living-season ledger and treats resume as finished', async () => {
    const genericGame = gameState({
      gameId: 'generic-regular-season',
      franchiseId: undefined,
      competitionType: undefined,
      competitionId: undefined,
    });

    await processCompletedGame(genericGame, { seasonId: 'season-1', detectMilestones: false });

    expect(mocks.archiveRecord?.livingSeasonProcessing).toBeUndefined();
    expect(mocks.patchCompletedGameLivingSeasonProcessing).not.toHaveBeenCalled();

    await processCompletedGame(genericGame, { seasonId: 'season-1', detectMilestones: false });
    expect(mocks.aggregateGameToSeason).toHaveBeenCalledTimes(1);
    expect(mocks.patchCompletedGameLivingSeasonProcessing).not.toHaveBeenCalled();
  });
});
