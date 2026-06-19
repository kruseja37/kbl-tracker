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
  calculateAndPersistSeasonWAR: vi.fn(),
  calculateAndPersistFranchiseTrueValueForSeason: vi.fn(),
  saveFranchiseTrueValueSnapshotRows: vi.fn(),
  calculateAndPersistProjectedFranchiseDesignationsForSeason: vi.fn(),
  getScheduledGame: vi.fn(),
}));

vi.mock('../seasonAggregator', () => ({
  aggregateGameToSeason: mocks.aggregateGameToSeason,
}));

vi.mock('../gameStorage', () => ({
  archiveCompletedGame: mocks.archiveCompletedGame,
  getCompletedGameById: mocks.getCompletedGameById,
  resolveExhibitionLeagueId: mocks.resolveExhibitionLeagueId,
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
}));

vi.mock('../../src_figma/app/engines/warOrchestrator', () => ({
  calculateAndPersistSeasonWAR: mocks.calculateAndPersistSeasonWAR,
}));

vi.mock('../franchiseTrueValueStorage', () => ({
  calculateAndPersistFranchiseTrueValueForSeason: mocks.calculateAndPersistFranchiseTrueValueForSeason,
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
}));

vi.mock('../scheduleStorage', () => ({
  getGame: mocks.getScheduledGame,
}));

import { processCompletedGame } from '../processCompletedGame';

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
    mocks.aggregateGameToSeason.mockResolvedValue({ success: true, milestones: null });
    mocks.archiveCompletedGame.mockResolvedValue(undefined);
    mocks.getCompletedGameById.mockResolvedValue(null);
    mocks.resolveExhibitionLeagueId.mockReturnValue(null);
    mocks.getGameHeader.mockResolvedValue(null);
    mocks.markAggregationFailed.mockResolvedValue(undefined);
    mocks.markGameAggregated.mockResolvedValue(undefined);
    mocks.registerAlmanacPlayers.mockResolvedValue(undefined);
    mocks.getEffectivePlayer.mockResolvedValue(null);
    mocks.getSeasonMetadata.mockResolvedValue({ seasonId: 'season-1', gamesPerTeam: 32 });
    mocks.saveSeasonMetadata.mockResolvedValue(undefined);
    mocks.calculateAndPersistSeasonWAR.mockResolvedValue(undefined);
    mocks.calculateAndPersistFranchiseTrueValueForSeason.mockResolvedValue({ rows: [{ playerId: 'batter-1' }], skippedRows: [], persisted: true, blockers: [] });
    mocks.saveFranchiseTrueValueSnapshotRows.mockResolvedValue([]);
    mocks.calculateAndPersistProjectedFranchiseDesignationsForSeason.mockResolvedValue({ rows: [], skippedRows: [], persisted: true, blockers: [] });
    mocks.getScheduledGame.mockResolvedValue(null);
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
});
