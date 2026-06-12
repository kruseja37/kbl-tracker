import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOrCreateSeason: vi.fn(),
  getSeasonMetadata: vi.fn(),
  getAllBattingStats: vi.fn(),
  getAllPitchingStats: vi.fn(),
  getAllFieldingStats: vi.fn(),
  calculateBattingDerived: vi.fn(),
  calculatePitchingDerived: vi.fn(),
  calculateFieldingDerived: vi.fn(),
  getFieldingEventsForScope: vi.fn(),
  calculateBWARSimplified: vi.fn(),
  calculateRWARSimplified: vi.fn(),
  calculatePWARSimplified: vi.fn(),
  calculatePreferredFWARFromPersistedFieldingSet: vi.fn(),
}));

vi.mock('../../utils/seasonStorage', () => ({
  getOrCreateSeason: mocks.getOrCreateSeason,
  getSeasonMetadata: mocks.getSeasonMetadata,
  getAllBattingStats: mocks.getAllBattingStats,
  getAllPitchingStats: mocks.getAllPitchingStats,
  getAllFieldingStats: mocks.getAllFieldingStats,
  calculateBattingDerived: mocks.calculateBattingDerived,
  calculatePitchingDerived: mocks.calculatePitchingDerived,
  calculateFieldingDerived: mocks.calculateFieldingDerived,
}));

vi.mock('../../utils/eventLog', () => ({
  getFieldingEventsForScope: mocks.getFieldingEventsForScope,
}));

vi.mock('../../engines/bwarCalculator', () => ({
  calculateBWARSimplified: mocks.calculateBWARSimplified,
}));

vi.mock('../../engines/rwarCalculator', () => ({
  calculateRWARSimplified: mocks.calculateRWARSimplified,
}));

vi.mock('../../engines/pwarCalculator', () => ({
  calculatePWARSimplified: mocks.calculatePWARSimplified,
}));

vi.mock('../../engines/fwarCalculator', () => ({
  calculatePreferredFWARFromPersistedFieldingSet: mocks.calculatePreferredFWARFromPersistedFieldingSet,
}));

import { resolveSeasonGamesForWAR, useSeasonStats } from '../useSeasonStats';

function metadata(overrides: Partial<{
  seasonId: string;
  gamesPerTeam: number | null;
  totalGames: number;
}> = {}) {
  return {
    seasonId: overrides.seasonId ?? `season-${Math.random()}`,
    seasonNumber: 1,
    seasonName: 'Season 1',
    status: 'active' as const,
    startDate: 1,
    gamesPlayed: 0,
    totalGames: overrides.totalGames ?? 0,
    gamesPerTeam: overrides.gamesPerTeam ?? null,
  };
}

const battingRow = {
  seasonId: 'season-hook',
  playerId: 'player-bat',
  playerName: 'Batter One',
  teamId: 'team-a',
  games: 1,
  pa: 4,
  ab: 4,
  hits: 2,
  singles: 1,
  doubles: 1,
  triples: 0,
  homeRuns: 0,
  rbi: 1,
  runs: 1,
  walks: 0,
  strikeouts: 1,
  hitByPitch: 0,
  sacFlies: 0,
  sacBunts: 0,
  stolenBases: 1,
  caughtStealing: 1,
  gidp: 1,
  d3kOutcomes: 0,
  fameBonuses: 0,
  fameBoners: 0,
  fameNet: 0,
  lastUpdated: 1,
};

const pitchingRow = {
  seasonId: 'season-hook',
  playerId: 'player-pitch',
  playerName: 'Pitcher One',
  teamId: 'team-a',
  games: 1,
  gamesStarted: 1,
  outsRecorded: 9,
  hitsAllowed: 1,
  runsAllowed: 0,
  earnedRuns: 0,
  walksAllowed: 1,
  strikeouts: 4,
  homeRunsAllowed: 0,
  hitBatters: 0,
  wildPitches: 0,
  comebackerInjuries: 0,
  wins: 1,
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
  lastUpdated: 1,
};

const fieldingRow = {
  seasonId: 'season-hook',
  playerId: 'player-bat',
  playerName: 'Batter One',
  teamId: 'team-a',
  games: 1,
  putouts: 10,
  assists: 2,
  errors: 0,
  doublePlays: 1,
  divingCatches: 0,
  robberies: 0,
  nutshots: 0,
  gamesByPosition: { SS: 1 },
  putoutsByPosition: { SS: 10 },
  assistsByPosition: { SS: 2 },
  errorsByPosition: { SS: 0 },
  lastUpdated: 1,
};

describe('useSeasonStats WAR season-length resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrCreateSeason.mockResolvedValue(undefined);
    mocks.getAllBattingStats.mockResolvedValue([battingRow]);
    mocks.getAllPitchingStats.mockResolvedValue([pitchingRow]);
    mocks.getAllFieldingStats.mockResolvedValue([fieldingRow]);
    mocks.getFieldingEventsForScope.mockResolvedValue([]);
    mocks.calculateBattingDerived.mockReturnValue({ avg: 0.5, obp: 0.5, slg: 0.75, ops: 1.25 });
    mocks.calculatePitchingDerived.mockReturnValue({ era: 0, whip: 0.67 });
    mocks.calculateFieldingDerived.mockReturnValue({ fieldingPct: 1 });
    mocks.calculateBWARSimplified.mockReturnValue({ bWAR: 1.25 });
    mocks.calculateRWARSimplified.mockReturnValue({ rWAR: 0.25 });
    mocks.calculatePWARSimplified.mockReturnValue({ pWAR: 2.5 });
    mocks.calculatePreferredFWARFromPersistedFieldingSet.mockReturnValue({ fWAR: 0.75 });
  });

  test('FINDING-137/R1: gamesPerTeam beats league-row counts for WAR scaling', () => {
    expect(resolveSeasonGamesForWAR(metadata({
      seasonId: 'resolver-64',
      gamesPerTeam: 64,
      totalGames: 512,
    }))).toBe(64);
  });

  test('FINDING-137/R1: missing gamesPerTeam ignores nonzero league-row counts', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveSeasonGamesForWAR(metadata({
      seasonId: 'resolver-null-512',
      gamesPerTeam: null,
      totalGames: 512,
    }))).toBe(162);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  test('FINDING-137/R1: missing gamesPerTeam ignores zero league-row counts', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveSeasonGamesForWAR(metadata({
      seasonId: 'resolver-null-zero',
      gamesPerTeam: null,
      totalGames: 0,
    }))).toBe(162);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  test('FINDING-137/R1: absent season metadata falls back to the default', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveSeasonGamesForWAR(null)).toBe(162);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  test('FINDING-137/R1: hook passes gamesPerTeam to every WAR calculator path', async () => {
    mocks.getSeasonMetadata.mockResolvedValue(metadata({
      seasonId: 'season-hook',
      gamesPerTeam: 64,
      totalGames: 512,
    }));

    const { result } = renderHook(() => useSeasonStats('season-hook'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.getBattingLeaders('totalWAR', 10);
    result.current.getPitchingLeaders('pWAR', 10);

    expect(mocks.calculateBWARSimplified).toHaveBeenCalledWith(expect.any(Object), 64);
    expect(mocks.calculateRWARSimplified).toHaveBeenCalledWith(expect.any(Object), 64);
    expect(mocks.calculatePWARSimplified).toHaveBeenCalledWith(expect.any(Object), 64);
    expect(mocks.calculatePreferredFWARFromPersistedFieldingSet).toHaveBeenCalledWith(
      expect.any(Array),
      'player-bat',
      'SS',
      1,
      64,
      expect.any(Object),
    );
  });

  test('FINDING-137/R1: non-finite WAR component outputs are clamped at leaderboard assignment', async () => {
    mocks.getSeasonMetadata.mockResolvedValue(metadata({
      seasonId: 'season-finite-clamp',
      gamesPerTeam: 64,
      totalGames: 512,
    }));
    mocks.calculateBWARSimplified.mockReturnValue({ bWAR: Infinity });
    mocks.calculateRWARSimplified.mockReturnValue({ rWAR: -Infinity });
    mocks.calculatePWARSimplified.mockReturnValue({ pWAR: Infinity });
    mocks.calculatePreferredFWARFromPersistedFieldingSet.mockReturnValue({ fWAR: Infinity });

    const { result } = renderHook(() => useSeasonStats('season-finite-clamp'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const [battingLeader] = result.current.getBattingLeaders('totalWAR', 10);
    const [pitchingLeader] = result.current.getPitchingLeaders('pWAR', 10);

    expect(battingLeader.bWAR).toBe(0);
    expect(battingLeader.rWAR).toBe(0);
    expect(battingLeader.fWAR).toBe(0);
    expect(battingLeader.totalWAR).toBe(0);
    expect(pitchingLeader.pWAR).toBe(0);
  });
});
