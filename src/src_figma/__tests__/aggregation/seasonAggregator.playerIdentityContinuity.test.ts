import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockGetOrCreateSeason,
  mockIncrementSeasonGames,
  mockGetOrCreateBattingStats,
  mockGetOrCreatePitchingStats,
  mockGetOrCreateFieldingStats,
  mockUpdateBattingStats,
  mockUpdatePitchingStats,
  mockUpdateFieldingStats,
  mockAggregateGameWithMilestones,
} = vi.hoisted(() => ({
  mockGetOrCreateSeason: vi.fn().mockResolvedValue(undefined),
  mockIncrementSeasonGames: vi.fn().mockResolvedValue(undefined),
  mockGetOrCreateBattingStats: vi.fn(),
  mockGetOrCreatePitchingStats: vi.fn(),
  mockGetOrCreateFieldingStats: vi.fn(),
  mockUpdateBattingStats: vi.fn().mockResolvedValue(undefined),
  mockUpdatePitchingStats: vi.fn().mockResolvedValue(undefined),
  mockUpdateFieldingStats: vi.fn().mockResolvedValue(undefined),
  mockAggregateGameWithMilestones: vi.fn().mockResolvedValue({
    seasonMilestones: [],
    careerMilestones: [],
    franchiseFirsts: [],
    franchiseLeaderEvents: [],
    fameEvents: [],
    milestonesRecorded: [],
  }),
}));

vi.mock('../../../utils/seasonStorage', () => ({
  getOrCreateBattingStats: mockGetOrCreateBattingStats,
  getOrCreatePitchingStats: mockGetOrCreatePitchingStats,
  getOrCreateFieldingStats: mockGetOrCreateFieldingStats,
  updateBattingStats: mockUpdateBattingStats,
  updatePitchingStats: mockUpdatePitchingStats,
  updateFieldingStats: mockUpdateFieldingStats,
  incrementSeasonGames: mockIncrementSeasonGames,
  getOrCreateSeason: mockGetOrCreateSeason,
}));

vi.mock('../../../utils/milestoneAggregator', () => ({
  aggregateGameWithMilestones: mockAggregateGameWithMilestones,
}));

import { aggregateGameToSeason } from '../../../utils/seasonAggregator';

const createBattingSeasonRow = (playerId: string, playerName: string, teamId: string) => ({
  playerId,
  playerName,
  teamId,
  games: 0,
  pa: 0,
  ab: 0,
  hits: 0,
  singles: 0,
  doubles: 0,
  triples: 0,
  homeRuns: 0,
  rbi: 0,
  runs: 0,
  walks: 0,
  strikeouts: 0,
  hitByPitch: 0,
  sacFlies: 0,
  sacBunts: 0,
  stolenBases: 0,
  caughtStealing: 0,
  gidp: 0,
  d3kOutcomes: 0,
  fameBonuses: 0,
  fameBoners: 0,
  fameNet: 0,
});

const createPitchingSeasonRow = (playerId: string, playerName: string, teamId: string) => ({
  playerId,
  playerName,
  teamId,
  games: 0,
  gamesStarted: 0,
  outsRecorded: 0,
  hitsAllowed: 0,
  runsAllowed: 0,
  earnedRuns: 0,
  walksAllowed: 0,
  strikeouts: 0,
  homeRunsAllowed: 0,
  hitBatters: 0,
  wildPitches: 0,
  comebackerInjuries: 0,
  qualityStarts: 0,
  completeGames: 0,
  shutouts: 0,
  noHitters: 0,
  perfectGames: 0,
  wins: 0,
  losses: 0,
  saves: 0,
  holds: 0,
  blownSaves: 0,
});

const createFieldingSeasonRow = (playerId: string, playerName: string, teamId: string) => ({
  playerId,
  playerName,
  teamId,
  games: 0,
  putouts: 0,
  assists: 0,
  errors: 0,
  divingCatches: 0,
  robberies: 0,
  nutshots: 0,
});

describe('season aggregator player identity continuity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrCreateBattingStats.mockImplementation(async (seasonId: string, playerId: string, playerName: string, teamId: string) =>
      createBattingSeasonRow(playerId, playerName, teamId)
    );
    mockGetOrCreatePitchingStats.mockImplementation(async (seasonId: string, playerId: string, playerName: string, teamId: string) =>
      createPitchingSeasonRow(playerId, playerName, teamId)
    );
    mockGetOrCreateFieldingStats.mockImplementation(async (seasonId: string, playerId: string, playerName: string, teamId: string) =>
      createFieldingSeasonRow(playerId, playerName, teamId)
    );
  });

  test('uses stable playerIds for season rows and career milestone aggregation input', async () => {
    const gameState = {
      id: 'current',
      gameId: 'game-wp1',
      savedAt: Date.now(),
      inning: 9,
      halfInning: 'BOTTOM' as const,
      outs: 3,
      homeScore: 4,
      awayScore: 2,
      bases: { first: null, second: null, third: null },
      currentBatterIndex: 0,
      atBatCount: 27,
      awayTeamId: 'away-team',
      homeTeamId: 'home-team',
      awayTeamName: 'Away Team',
      homeTeamName: 'Home Team',
      seasonNumber: 1,
      playerStats: {
        'lb-away-ss': {
          playerName: 'Away Shortstop',
          teamId: 'away-team',
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
          sb: 0,
          cs: 0,
          sf: 0,
          sh: 0,
          gidp: 0,
          putouts: 1,
          assists: 2,
          fieldingErrors: 0,
        },
      },
      pitcherGameStats: [
        {
          pitcherId: 'lb-home-sp',
          pitcherName: 'Home Starter',
          teamId: 'home-team',
          isStarter: true,
          entryInning: 1,
          outsRecorded: 27,
          hitsAllowed: 2,
          runsAllowed: 2,
          earnedRuns: 2,
          walksAllowed: 1,
          strikeoutsThrown: 8,
          homeRunsAllowed: 0,
          hitBatters: 0,
          basesReachedViaError: 0,
          wildPitches: 0,
          pitchCount: 98,
          battersFaced: 30,
          consecutiveHRsAllowed: 0,
          firstInningRuns: 0,
          basesLoadedWalks: 0,
          inningsComplete: 9,
          decision: 'W' as const,
          save: false,
          hold: false,
          blownSave: false,
        },
      ],
      fameEvents: [],
      lastHRBatterId: null,
      consecutiveHRCount: 0,
      inningStrikeouts: 0,
      maxDeficitAway: 0,
      maxDeficitHome: 0,
      activityLog: [],
    };

    const result = await aggregateGameToSeason(gameState, {
      seasonId: 'elim-42',
      detectMilestones: true,
    });

    expect(result.success).toBe(true);
    expect(mockGetOrCreateBattingStats).toHaveBeenCalledWith(
      'elim-42',
      'lb-away-ss',
      'Away Shortstop',
      'away-team'
    );
    expect(mockUpdateBattingStats).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 'lb-away-ss',
        teamId: 'away-team',
      })
    );
    expect(mockGetOrCreatePitchingStats).toHaveBeenCalledWith(
      'elim-42',
      'lb-home-sp',
      'Home Starter',
      'home-team'
    );
    expect(mockUpdatePitchingStats).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 'lb-home-sp',
        teamId: 'home-team',
      })
    );
    expect(mockAggregateGameWithMilestones).toHaveBeenCalledWith(
      expect.objectContaining({
        playerStats: expect.objectContaining({
          'lb-away-ss': expect.any(Object),
        }),
        pitcherGameStats: expect.arrayContaining([
          expect.objectContaining({
            pitcherId: 'lb-home-sp',
          }),
        ]),
      }),
      'elim-42',
      undefined,
      expect.objectContaining({})
    );
  });
});
