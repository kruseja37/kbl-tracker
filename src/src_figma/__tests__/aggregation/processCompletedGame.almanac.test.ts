import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockAggregateGameToSeason,
  mockArchiveCompletedGame,
  mockGetEffectivePlayer,
  mockRegisterAlmanacPlayers,
} = vi.hoisted(() => ({
  mockAggregateGameToSeason: vi.fn().mockResolvedValue({
    success: true,
    seasonMilestones: [],
    careerMilestones: [],
    franchiseFirsts: [],
    franchiseLeaderEvents: [],
    fameEvents: [],
    milestonesRecorded: [],
  }),
  mockArchiveCompletedGame: vi.fn().mockResolvedValue(undefined),
  mockGetEffectivePlayer: vi.fn(),
  mockRegisterAlmanacPlayers: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/seasonAggregator', () => ({
  aggregateGameToSeason: mockAggregateGameToSeason,
}));

vi.mock('../../../utils/gameStorage', () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  resolveExhibitionLeagueId: (game: {
    leagueId?: string;
    competitionId?: string;
    competitionType?: string;
  }) =>
    game.leagueId ??
    (game.competitionType === 'exhibition' || !game.competitionType
      ? game.competitionId
      : undefined),
}));

vi.mock('../../../utils/playerOverrides', () => ({
  getEffectivePlayer: mockGetEffectivePlayer,
}));

vi.mock('../../../utils/registerAlmanacPlayers', () => ({
  registerAlmanacPlayers: mockRegisterAlmanacPlayers,
}));

import { processCompletedGame } from '../../../utils/processCompletedGame';

function createGameState() {
  return {
    id: 'current',
    gameId: 'game-exh-1',
    savedAt: Date.now(),
    inning: 9,
    halfInning: 'BOTTOM' as const,
    outs: 3,
    homeScore: 5,
    awayScore: 4,
    bases: {
      first: null,
      second: null,
      third: null,
    },
    currentBatterIndex: 0,
    atBatCount: 27,
    awayTeamId: 'away-team',
    homeTeamId: 'home-team',
    awayTeamName: 'Away Team',
    homeTeamName: 'Home Team',
    seasonNumber: 1,
    competitionType: 'exhibition' as const,
    competitionId: 'league-exh',
    playerStats: {
      'player-1': {
        playerName: 'Player One',
        teamId: 'away-team',
        pa: 4,
        ab: 4,
        h: 2,
        singles: 2,
        doubles: 0,
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
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [
      {
        pitcherId: 'pitcher-1',
        pitcherName: 'Pitcher One',
        teamId: 'home-team',
        isStarter: true,
        entryInning: 1,
        outsRecorded: 27,
        hitsAllowed: 2,
        runsAllowed: 1,
        earnedRuns: 1,
        walksAllowed: 1,
        strikeoutsThrown: 7,
        homeRunsAllowed: 0,
        hitBatters: 0,
        basesReachedViaError: 0,
        wildPitches: 0,
        pitchCount: 96,
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
    activityLog: [],
  };
}

const mockEffectivePlayer = {
  firstName: 'Test',
  lastName: 'Player',
  nickname: 'TP',
  hometown: { city: 'Denver', state: 'CO' },
  age: 27,
  gender: 'M' as const,
  bats: 'R' as const,
  throws: 'R' as const,
  primaryPosition: 'SS' as const,
  secondaryPosition: '2B' as const,
  power: 65,
  contact: 70,
  speed: 60,
  fielding: 58,
  arm: 62,
  velocity: 40,
  junk: 35,
  accuracy: 45,
  arsenal: ['4F'] as const,
  overallGrade: 'B' as const,
  trait1: 'Clutch',
  trait2: 'Sparkplug',
  personality: 'Competitive' as const,
  chemistry: 'Competitive' as const,
  morale: 50,
  mojo: 'Normal' as const,
  fame: 10,
  salary: 1000000,
};

describe('processCompletedGame exhibition almanac registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEffectivePlayer.mockResolvedValue(mockEffectivePlayer);
  });

  test('falls back to competitionId for exhibition league registration', async () => {
    const gameState = createGameState();

    await processCompletedGame(gameState);

    expect(mockGetEffectivePlayer).toHaveBeenCalledWith('player-1', 'league-exh');
    expect(mockGetEffectivePlayer).toHaveBeenCalledWith('pitcher-1', 'league-exh');
    expect(mockArchiveCompletedGame).toHaveBeenCalledWith(
      gameState,
      { away: 4, home: 5 },
      [],
      undefined,
      { leagueId: 'league-exh' }
    );
    expect(mockRegisterAlmanacPlayers).toHaveBeenCalledWith(gameState, 'league-exh');
    expect(gameState.playerRatingsSnapshots).toMatchObject({
      'player-1': expect.objectContaining({ playerId: 'player-1', firstName: 'Test' }),
      'pitcher-1': expect.objectContaining({ playerId: 'pitcher-1', firstName: 'Test' }),
    });
  });

  test('returns soft aggregation failures without writing an aggregated archive', async () => {
    mockAggregateGameToSeason.mockResolvedValueOnce({
      success: false,
      milestones: null,
      error: 'season aggregation failed',
    });
    const gameState = createGameState();

    const result = await processCompletedGame(gameState);

    expect(result.aggregation).toMatchObject({
      success: false,
      error: 'season aggregation failed',
    });
    expect(mockArchiveCompletedGame).not.toHaveBeenCalled();
    expect(mockRegisterAlmanacPlayers).not.toHaveBeenCalled();
    expect(mockGetEffectivePlayer).not.toHaveBeenCalled();
  });
});
