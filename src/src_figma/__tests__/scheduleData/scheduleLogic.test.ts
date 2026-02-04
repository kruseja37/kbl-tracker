/**
 * Schedule Data Logic Tests
 *
 * Tests the business logic and helper functions used in useScheduleData hook.
 * These tests verify schedule management, game filtering, and series generation.
 */

import { describe, test, expect } from 'vitest';

// ============================================
// TYPES (from scheduleStorage)
// ============================================

type GameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';

interface ScheduledGame {
  id: string;
  seasonNumber: number;
  gameNumber: number;
  dayNumber: number;
  awayTeam: { teamId: string; teamName: string };
  homeTeam: { teamId: string; teamName: string };
  status: GameStatus;
  result?: {
    awayScore: number;
    homeScore: number;
    winnerId: string;
    loserId: string;
  };
}

interface TeamScheduleStats {
  teamId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  runsScored: number;
  runsAllowed: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Filter games by status
 */
function filterGamesByStatus(games: ScheduledGame[], status: GameStatus): ScheduledGame[] {
  return games.filter(g => g.status === status);
}

/**
 * Filter games by team (home or away)
 */
function filterGamesByTeam(games: ScheduledGame[], teamId: string): ScheduledGame[] {
  return games.filter(g =>
    g.awayTeam.teamId === teamId || g.homeTeam.teamId === teamId
  );
}

/**
 * Get completed games
 */
function getCompletedGames(games: ScheduledGame[]): ScheduledGame[] {
  return filterGamesByStatus(games, 'COMPLETED');
}

/**
 * Get upcoming games (scheduled but not yet played)
 */
function getUpcomingGames(games: ScheduledGame[]): ScheduledGame[] {
  return filterGamesByStatus(games, 'SCHEDULED');
}

/**
 * Get next scheduled game
 */
function getNextGame(games: ScheduledGame[]): ScheduledGame | null {
  const upcoming = getUpcomingGames(games);
  return upcoming.length > 0 ? upcoming[0] : null;
}

/**
 * Calculate team schedule stats from completed games
 */
function calculateTeamStats(games: ScheduledGame[], teamId: string): TeamScheduleStats {
  const teamGames = filterGamesByTeam(games, teamId);
  const completedGames = getCompletedGames(teamGames);

  let wins = 0, losses = 0;
  let homeWins = 0, homeLosses = 0;
  let awayWins = 0, awayLosses = 0;
  let runsScored = 0, runsAllowed = 0;

  for (const game of completedGames) {
    if (!game.result) continue;

    const isHome = game.homeTeam.teamId === teamId;
    const isAway = game.awayTeam.teamId === teamId;
    const won = game.result.winnerId === teamId;

    if (won) {
      wins++;
      if (isHome) homeWins++;
      if (isAway) awayWins++;
    } else {
      losses++;
      if (isHome) homeLosses++;
      if (isAway) awayLosses++;
    }

    if (isHome) {
      runsScored += game.result.homeScore;
      runsAllowed += game.result.awayScore;
    } else if (isAway) {
      runsScored += game.result.awayScore;
      runsAllowed += game.result.homeScore;
    }
  }

  return {
    teamId,
    gamesPlayed: completedGames.length,
    wins,
    losses,
    homeWins,
    homeLosses,
    awayWins,
    awayLosses,
    runsScored,
    runsAllowed,
  };
}

/**
 * Calculate next game number for a season
 */
function getNextGameNumber(games: ScheduledGame[]): number {
  if (games.length === 0) return 1;
  const maxGameNumber = Math.max(...games.map(g => g.gameNumber));
  return maxGameNumber + 1;
}

/**
 * Calculate current day number
 */
function getCurrentDay(games: ScheduledGame[]): number {
  if (games.length === 0) return 1;
  return Math.max(...games.map(g => g.dayNumber));
}

/**
 * Generate a series of games between two teams
 */
function generateSeries(
  awayTeam: { teamId: string; teamName: string },
  homeTeam: { teamId: string; teamName: string },
  seasonNumber: number,
  startGameNumber: number,
  startDay: number,
  seriesLength: number = 3
): Omit<ScheduledGame, 'id'>[] {
  const games: Omit<ScheduledGame, 'id'>[] = [];

  for (let i = 0; i < seriesLength; i++) {
    games.push({
      seasonNumber,
      gameNumber: startGameNumber + i,
      dayNumber: startDay + i,
      awayTeam,
      homeTeam,
      status: 'SCHEDULED',
    });
  }

  return games;
}

/**
 * Check if teams can play (not same team)
 */
function canTeamsPlay(team1Id: string, team2Id: string): boolean {
  return team1Id !== team2Id;
}

/**
 * Get win percentage
 */
function getWinPercentage(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return wins / total;
}

/**
 * Get run differential
 */
function getRunDifferential(runsScored: number, runsAllowed: number): number {
  return runsScored - runsAllowed;
}

// ============================================
// GAME FILTERING TESTS
// ============================================

describe('Game Filtering', () => {
  const mockGames: ScheduledGame[] = [
    { id: 'g1', seasonNumber: 1, gameNumber: 1, dayNumber: 1, awayTeam: { teamId: 't1', teamName: 'Tigers' }, homeTeam: { teamId: 't2', teamName: 'Sox' }, status: 'COMPLETED', result: { awayScore: 5, homeScore: 3, winnerId: 't1', loserId: 't2' } },
    { id: 'g2', seasonNumber: 1, gameNumber: 2, dayNumber: 2, awayTeam: { teamId: 't1', teamName: 'Tigers' }, homeTeam: { teamId: 't2', teamName: 'Sox' }, status: 'COMPLETED', result: { awayScore: 2, homeScore: 6, winnerId: 't2', loserId: 't1' } },
    { id: 'g3', seasonNumber: 1, gameNumber: 3, dayNumber: 3, awayTeam: { teamId: 't1', teamName: 'Tigers' }, homeTeam: { teamId: 't2', teamName: 'Sox' }, status: 'IN_PROGRESS' },
    { id: 'g4', seasonNumber: 1, gameNumber: 4, dayNumber: 4, awayTeam: { teamId: 't3', teamName: 'Bears' }, homeTeam: { teamId: 't1', teamName: 'Tigers' }, status: 'SCHEDULED' },
    { id: 'g5', seasonNumber: 1, gameNumber: 5, dayNumber: 5, awayTeam: { teamId: 't2', teamName: 'Sox' }, homeTeam: { teamId: 't3', teamName: 'Bears' }, status: 'SCHEDULED' },
  ];

  describe('filterGamesByStatus', () => {
    test('finds completed games', () => {
      const completed = filterGamesByStatus(mockGames, 'COMPLETED');
      expect(completed.length).toBe(2);
    });

    test('finds scheduled games', () => {
      const scheduled = filterGamesByStatus(mockGames, 'SCHEDULED');
      expect(scheduled.length).toBe(2);
    });

    test('finds in progress games', () => {
      const inProgress = filterGamesByStatus(mockGames, 'IN_PROGRESS');
      expect(inProgress.length).toBe(1);
    });

    test('finds no postponed games', () => {
      const postponed = filterGamesByStatus(mockGames, 'POSTPONED');
      expect(postponed.length).toBe(0);
    });
  });

  describe('filterGamesByTeam', () => {
    test('finds all Tigers games (home and away)', () => {
      const tigersGames = filterGamesByTeam(mockGames, 't1');
      expect(tigersGames.length).toBe(4);
    });

    test('finds all Sox games', () => {
      const soxGames = filterGamesByTeam(mockGames, 't2');
      expect(soxGames.length).toBe(4);
    });

    test('finds all Bears games', () => {
      const bearsGames = filterGamesByTeam(mockGames, 't3');
      expect(bearsGames.length).toBe(2);
    });

    test('finds no games for unknown team', () => {
      const unknownGames = filterGamesByTeam(mockGames, 'unknown');
      expect(unknownGames.length).toBe(0);
    });
  });

  describe('getCompletedGames', () => {
    test('returns only completed games', () => {
      const completed = getCompletedGames(mockGames);
      expect(completed.length).toBe(2);
      expect(completed.every(g => g.status === 'COMPLETED')).toBe(true);
    });
  });

  describe('getUpcomingGames', () => {
    test('returns only scheduled games', () => {
      const upcoming = getUpcomingGames(mockGames);
      expect(upcoming.length).toBe(2);
      expect(upcoming.every(g => g.status === 'SCHEDULED')).toBe(true);
    });
  });

  describe('getNextGame', () => {
    test('returns first scheduled game', () => {
      const next = getNextGame(mockGames);
      expect(next).not.toBeNull();
      expect(next?.gameNumber).toBe(4);
    });

    test('returns null when no scheduled games', () => {
      const noScheduled = mockGames.filter(g => g.status !== 'SCHEDULED');
      const next = getNextGame(noScheduled);
      expect(next).toBeNull();
    });
  });
});

// ============================================
// TEAM STATS CALCULATION TESTS
// ============================================

describe('Team Stats Calculation', () => {
  const mockGames: ScheduledGame[] = [
    { id: 'g1', seasonNumber: 1, gameNumber: 1, dayNumber: 1, awayTeam: { teamId: 't1', teamName: 'Tigers' }, homeTeam: { teamId: 't2', teamName: 'Sox' }, status: 'COMPLETED', result: { awayScore: 5, homeScore: 3, winnerId: 't1', loserId: 't2' } },
    { id: 'g2', seasonNumber: 1, gameNumber: 2, dayNumber: 2, awayTeam: { teamId: 't1', teamName: 'Tigers' }, homeTeam: { teamId: 't2', teamName: 'Sox' }, status: 'COMPLETED', result: { awayScore: 2, homeScore: 6, winnerId: 't2', loserId: 't1' } },
    { id: 'g3', seasonNumber: 1, gameNumber: 3, dayNumber: 3, awayTeam: { teamId: 't2', teamName: 'Sox' }, homeTeam: { teamId: 't1', teamName: 'Tigers' }, status: 'COMPLETED', result: { awayScore: 4, homeScore: 7, winnerId: 't1', loserId: 't2' } },
  ];

  test('calculates Tigers stats correctly', () => {
    const stats = calculateTeamStats(mockGames, 't1');
    expect(stats.gamesPlayed).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.homeWins).toBe(1);
    expect(stats.homeLosses).toBe(0);
    expect(stats.awayWins).toBe(1);
    expect(stats.awayLosses).toBe(1);
    expect(stats.runsScored).toBe(14); // 5 + 2 + 7
    expect(stats.runsAllowed).toBe(13); // 3 + 6 + 4
  });

  test('calculates Sox stats correctly', () => {
    const stats = calculateTeamStats(mockGames, 't2');
    expect(stats.gamesPlayed).toBe(3);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(2);
    expect(stats.homeWins).toBe(1);
    expect(stats.homeLosses).toBe(1);
    expect(stats.awayWins).toBe(0);
    expect(stats.awayLosses).toBe(1);
    expect(stats.runsScored).toBe(13); // 3 + 6 + 4
    expect(stats.runsAllowed).toBe(14); // 5 + 2 + 7
  });

  test('handles team with no games', () => {
    const stats = calculateTeamStats(mockGames, 'unknown');
    expect(stats.gamesPlayed).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.runsScored).toBe(0);
    expect(stats.runsAllowed).toBe(0);
  });
});

// ============================================
// GAME NUMBER CALCULATION TESTS
// ============================================

describe('Game Number Calculation', () => {
  test('empty schedule starts at game 1', () => {
    expect(getNextGameNumber([])).toBe(1);
  });

  test('increments from last game', () => {
    const games: ScheduledGame[] = [
      { id: 'g1', seasonNumber: 1, gameNumber: 1, dayNumber: 1, awayTeam: { teamId: 't1', teamName: 'A' }, homeTeam: { teamId: 't2', teamName: 'B' }, status: 'COMPLETED' },
      { id: 'g2', seasonNumber: 1, gameNumber: 2, dayNumber: 2, awayTeam: { teamId: 't1', teamName: 'A' }, homeTeam: { teamId: 't2', teamName: 'B' }, status: 'COMPLETED' },
    ];
    expect(getNextGameNumber(games)).toBe(3);
  });

  test('handles non-sequential game numbers', () => {
    const games: ScheduledGame[] = [
      { id: 'g1', seasonNumber: 1, gameNumber: 5, dayNumber: 5, awayTeam: { teamId: 't1', teamName: 'A' }, homeTeam: { teamId: 't2', teamName: 'B' }, status: 'COMPLETED' },
      { id: 'g2', seasonNumber: 1, gameNumber: 10, dayNumber: 10, awayTeam: { teamId: 't1', teamName: 'A' }, homeTeam: { teamId: 't2', teamName: 'B' }, status: 'COMPLETED' },
    ];
    expect(getNextGameNumber(games)).toBe(11);
  });
});

// ============================================
// SERIES GENERATION TESTS
// ============================================

describe('Series Generation', () => {
  const awayTeam = { teamId: 't1', teamName: 'Tigers' };
  const homeTeam = { teamId: 't2', teamName: 'Sox' };

  test('generates 3-game series by default', () => {
    const series = generateSeries(awayTeam, homeTeam, 1, 1, 1);
    expect(series.length).toBe(3);
  });

  test('generates correct game numbers', () => {
    const series = generateSeries(awayTeam, homeTeam, 1, 5, 10);
    expect(series[0].gameNumber).toBe(5);
    expect(series[1].gameNumber).toBe(6);
    expect(series[2].gameNumber).toBe(7);
  });

  test('generates correct day numbers', () => {
    const series = generateSeries(awayTeam, homeTeam, 1, 1, 15);
    expect(series[0].dayNumber).toBe(15);
    expect(series[1].dayNumber).toBe(16);
    expect(series[2].dayNumber).toBe(17);
  });

  test('all games start as SCHEDULED', () => {
    const series = generateSeries(awayTeam, homeTeam, 1, 1, 1);
    expect(series.every(g => g.status === 'SCHEDULED')).toBe(true);
  });

  test('generates 4-game series', () => {
    const series = generateSeries(awayTeam, homeTeam, 1, 1, 1, 4);
    expect(series.length).toBe(4);
  });

  test('generates 2-game series', () => {
    const series = generateSeries(awayTeam, homeTeam, 1, 1, 1, 2);
    expect(series.length).toBe(2);
  });

  test('preserves team info', () => {
    const series = generateSeries(awayTeam, homeTeam, 1, 1, 1);
    for (const game of series) {
      expect(game.awayTeam.teamId).toBe('t1');
      expect(game.homeTeam.teamId).toBe('t2');
    }
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe('Validation', () => {
  describe('canTeamsPlay', () => {
    test('different teams can play', () => {
      expect(canTeamsPlay('t1', 't2')).toBe(true);
    });

    test('same team cannot play itself', () => {
      expect(canTeamsPlay('t1', 't1')).toBe(false);
    });
  });
});

// ============================================
// STAT CALCULATION TESTS
// ============================================

describe('Stat Calculations', () => {
  describe('getWinPercentage', () => {
    test('50% win rate', () => {
      expect(getWinPercentage(5, 5)).toBe(0.5);
    });

    test('perfect record', () => {
      expect(getWinPercentage(10, 0)).toBe(1);
    });

    test('no wins', () => {
      expect(getWinPercentage(0, 10)).toBe(0);
    });

    test('no games played', () => {
      expect(getWinPercentage(0, 0)).toBe(0);
    });

    test('real example: 56-34', () => {
      const pct = getWinPercentage(56, 34);
      expect(pct).toBeCloseTo(0.622, 3);
    });
  });

  describe('getRunDifferential', () => {
    test('positive differential', () => {
      expect(getRunDifferential(500, 400)).toBe(100);
    });

    test('negative differential', () => {
      expect(getRunDifferential(400, 500)).toBe(-100);
    });

    test('even differential', () => {
      expect(getRunDifferential(450, 450)).toBe(0);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('single game "series"', () => {
    const awayTeam = { teamId: 't1', teamName: 'A' };
    const homeTeam = { teamId: 't2', teamName: 'B' };
    const series = generateSeries(awayTeam, homeTeam, 1, 1, 1, 1);
    expect(series.length).toBe(1);
  });

  test('long series (7 games)', () => {
    const awayTeam = { teamId: 't1', teamName: 'A' };
    const homeTeam = { teamId: 't2', teamName: 'B' };
    const series = generateSeries(awayTeam, homeTeam, 1, 1, 1, 7);
    expect(series.length).toBe(7);
    expect(series[6].gameNumber).toBe(7);
    expect(series[6].dayNumber).toBe(7);
  });

  test('stats with only scheduled games (no completed)', () => {
    const games: ScheduledGame[] = [
      { id: 'g1', seasonNumber: 1, gameNumber: 1, dayNumber: 1, awayTeam: { teamId: 't1', teamName: 'A' }, homeTeam: { teamId: 't2', teamName: 'B' }, status: 'SCHEDULED' },
    ];
    const stats = calculateTeamStats(games, 't1');
    expect(stats.gamesPlayed).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
  });

  test('getCurrentDay with empty schedule', () => {
    expect(getCurrentDay([])).toBe(1);
  });
});
