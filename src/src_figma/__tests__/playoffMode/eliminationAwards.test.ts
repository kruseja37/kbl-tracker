import { beforeEach, describe, expect, it, vi } from 'vitest';

import { computeEliminationAwards } from '../../../utils/eliminationAwards';
import type { PlayoffPlayerStats } from '../../../utils/playoffStorage';

const { mockGetPlayoffStats } = vi.hoisted(() => ({
  mockGetPlayoffStats: vi.fn(),
}));

vi.mock('../../../utils/playoffStorage', () => ({
  getPlayoffStats: mockGetPlayoffStats,
}));

function createPlayoffPlayerStats(overrides: Partial<PlayoffPlayerStats>): PlayoffPlayerStats {
  return {
    id: 'playoff-1-player-1',
    playoffId: 'playoff-1',
    playerId: 'player-1',
    playerName: 'Player One',
    teamId: 'TEAM-A',
    games: 3,
    atBats: 10,
    hits: 4,
    doubles: 1,
    triples: 0,
    homeRuns: 1,
    rbi: 4,
    runs: 2,
    walks: 1,
    strikeouts: 2,
    stolenBases: 0,
    caughtStealing: 0,
    avg: 0.4,
    obp: 0.455,
    slg: 0.8,
    ops: 1.255,
    ...overrides,
  };
}

describe('computeEliminationAwards', () => {
  beforeEach(() => {
    mockGetPlayoffStats.mockReset();
  });

  it('adds a Best Fielder award from bracket-local fielding metrics', async () => {
    mockGetPlayoffStats.mockResolvedValue([
      createPlayoffPlayerStats({
        playerId: 'ss-1',
        playerName: 'Short Stop',
        teamId: 'TEAM-A',
        fieldingPrimaryPosition: 'SS',
        fieldingWAR: 0.42,
        fieldingRunsSaved: 1.35,
        fieldingPlays: 6,
      }),
      createPlayoffPlayerStats({
        id: 'playoff-1-player-2',
        playerId: 'cf-1',
        playerName: 'Center Field',
        teamId: 'TEAM-B',
        fieldingPrimaryPosition: 'CF',
        fieldingWAR: 0.18,
        fieldingRunsSaved: 0.74,
        fieldingPlays: 5,
      }),
    ]);

    const awards = await computeEliminationAwards('playoff-1');
    const bestFielder = awards.find((award) => award.category === 'Best Fielder');

    expect(bestFielder).toEqual({
      category: 'Best Fielder',
      playerName: 'Short Stop',
      playerId: 'ss-1',
      teamId: 'TEAM-A',
      statLine: 'SS · +0.42 fWAR · +1.35 RS',
    });
  });

  it('skips the fielding award when bracket stats have no durable fielding metrics', async () => {
    mockGetPlayoffStats.mockResolvedValue([
      createPlayoffPlayerStats({
        playerId: 'hitter-1',
        playerName: 'Slugger',
        teamId: 'TEAM-A',
      }),
    ]);

    const awards = await computeEliminationAwards('playoff-1');

    expect(awards.some((award) => award.category === 'Best Fielder')).toBe(false);
  });
});
