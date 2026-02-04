/**
 * Playoff Logic Tests
 *
 * Tests the business logic and helper functions used in usePlayoffData hook.
 * These tests verify playoff bracket generation, series tracking, and round management.
 */

import { describe, test, expect } from 'vitest';

// ============================================
// TYPES (from playoffStorage)
// ============================================

interface PlayoffTeam {
  teamId: string;
  teamName: string;
  seed: number;
  league: 'Eastern' | 'Western';
  regularSeasonRecord: { wins: number; losses: number };
  eliminated: boolean;
}

interface SeriesTeam {
  teamId: string;
  teamName: string;
  seed: number;
  wins: number;
}

type SeriesStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

interface PlayoffSeries {
  id: string;
  playoffId: string;
  round: number;
  seriesNumber: number;
  higherSeed: SeriesTeam;
  lowerSeed: SeriesTeam;
  gamesNeeded: number;
  status: SeriesStatus;
  winnerId?: string;
  completedAt?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the display name for a playoff round
 */
function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) {
    return 'Championship';
  }
  if (round === totalRounds - 1) {
    return 'Conference Finals';
  }
  if (round === totalRounds - 2) {
    return 'Division Series';
  }
  if (round === 1) {
    return 'Wild Card';
  }
  return `Round ${round}`;
}

/**
 * Calculate games needed to win series
 */
function gamesNeededToWin(bestOf: number): number {
  return Math.ceil(bestOf / 2);
}

/**
 * Check if series is complete
 */
function isSeriesComplete(higherSeedWins: number, lowerSeedWins: number, gamesNeeded: number): boolean {
  return higherSeedWins >= gamesNeeded || lowerSeedWins >= gamesNeeded;
}

/**
 * Get series winner
 */
function getSeriesWinner(
  higherSeedId: string,
  lowerSeedId: string,
  higherSeedWins: number,
  lowerSeedWins: number,
  gamesNeeded: number
): string | null {
  if (higherSeedWins >= gamesNeeded) return higherSeedId;
  if (lowerSeedWins >= gamesNeeded) return lowerSeedId;
  return null;
}

/**
 * Generate first round matchups (1v8, 2v7, 3v6, 4v5)
 * For odd numbers of teams, middle seed gets a bye
 */
function generateFirstRoundMatchups(teams: PlayoffTeam[], league: 'Eastern' | 'Western'): Array<[PlayoffTeam, PlayoffTeam]> {
  const leagueTeams = teams
    .filter(t => t.league === league)
    .sort((a, b) => a.seed - b.seed);

  if (leagueTeams.length < 2) return [];

  const matchups: Array<[PlayoffTeam, PlayoffTeam]> = [];
  const numTeams = leagueTeams.length;

  // 1 vs N, 2 vs N-1, etc. Use floor to handle odd numbers (middle gets bye)
  for (let i = 0; i < Math.floor(numTeams / 2); i++) {
    matchups.push([leagueTeams[i], leagueTeams[numTeams - 1 - i]]);
  }

  return matchups;
}

/**
 * Calculate total rounds needed for bracket
 */
function calculateTotalRounds(teamsPerLeague: number, hasChampionship: boolean): number {
  // Number of rounds in each conference
  const conferenceRounds = Math.ceil(Math.log2(teamsPerLeague));
  // Add 1 for championship series between conferences
  return hasChampionship ? conferenceRounds + 1 : conferenceRounds;
}

/**
 * Filter series by status
 */
function filterSeriesByStatus(series: PlayoffSeries[], status: SeriesStatus): PlayoffSeries[] {
  return series.filter(s => s.status === status);
}

/**
 * Filter series by round
 */
function filterSeriesByRound(series: PlayoffSeries[], round: number): PlayoffSeries[] {
  return series.filter(s => s.round === round);
}

/**
 * Check if all series in a round are complete
 */
function isRoundComplete(series: PlayoffSeries[], round: number): boolean {
  const roundSeries = filterSeriesByRound(series, round);
  return roundSeries.length > 0 && roundSeries.every(s => s.status === 'COMPLETED');
}

// ============================================
// ROUND NAME TESTS
// ============================================

describe('Round Name Generation', () => {
  describe('4-round playoff (8 teams per league)', () => {
    const totalRounds = 4;

    test('round 1 is Wild Card', () => {
      expect(getRoundName(1, totalRounds)).toBe('Wild Card');
    });

    test('round 2 is Division Series', () => {
      expect(getRoundName(2, totalRounds)).toBe('Division Series');
    });

    test('round 3 is Conference Finals', () => {
      expect(getRoundName(3, totalRounds)).toBe('Conference Finals');
    });

    test('round 4 is Championship', () => {
      expect(getRoundName(4, totalRounds)).toBe('Championship');
    });
  });

  describe('3-round playoff (4 teams per league)', () => {
    const totalRounds = 3;

    test('round 1 is Division Series', () => {
      // 3 rounds: round 1 = totalRounds-2 = Division Series
      expect(getRoundName(1, totalRounds)).toBe('Division Series');
    });

    test('round 2 is Conference Finals', () => {
      expect(getRoundName(2, totalRounds)).toBe('Conference Finals');
    });

    test('round 3 is Championship', () => {
      expect(getRoundName(3, totalRounds)).toBe('Championship');
    });
  });

  describe('2-round playoff (2 teams per league)', () => {
    const totalRounds = 2;

    test('round 1 is Conference Finals', () => {
      // 2 rounds: round 1 = totalRounds-1 = Conference Finals
      expect(getRoundName(1, totalRounds)).toBe('Conference Finals');
    });

    test('round 2 is Championship', () => {
      expect(getRoundName(2, totalRounds)).toBe('Championship');
    });
  });
});

// ============================================
// GAMES NEEDED TESTS
// ============================================

describe('Games Needed to Win Series', () => {
  test('best of 3 needs 2 wins', () => {
    expect(gamesNeededToWin(3)).toBe(2);
  });

  test('best of 5 needs 3 wins', () => {
    expect(gamesNeededToWin(5)).toBe(3);
  });

  test('best of 7 needs 4 wins', () => {
    expect(gamesNeededToWin(7)).toBe(4);
  });

  test('best of 1 needs 1 win', () => {
    expect(gamesNeededToWin(1)).toBe(1);
  });
});

// ============================================
// SERIES COMPLETION TESTS
// ============================================

describe('Series Completion Check', () => {
  describe('best of 7 (need 4)', () => {
    test('4-0 sweep is complete', () => {
      expect(isSeriesComplete(4, 0, 4)).toBe(true);
    });

    test('4-3 game 7 win is complete', () => {
      expect(isSeriesComplete(4, 3, 4)).toBe(true);
    });

    test('3-3 is not complete', () => {
      expect(isSeriesComplete(3, 3, 4)).toBe(false);
    });

    test('0-4 lower seed sweep is complete', () => {
      expect(isSeriesComplete(0, 4, 4)).toBe(true);
    });

    test('2-1 is not complete', () => {
      expect(isSeriesComplete(2, 1, 4)).toBe(false);
    });
  });

  describe('best of 5 (need 3)', () => {
    test('3-0 sweep is complete', () => {
      expect(isSeriesComplete(3, 0, 3)).toBe(true);
    });

    test('3-2 game 5 win is complete', () => {
      expect(isSeriesComplete(3, 2, 3)).toBe(true);
    });

    test('2-2 is not complete', () => {
      expect(isSeriesComplete(2, 2, 3)).toBe(false);
    });
  });
});

// ============================================
// SERIES WINNER TESTS
// ============================================

describe('Series Winner Determination', () => {
  describe('best of 7 (need 4)', () => {
    test('higher seed wins 4-2', () => {
      const winner = getSeriesWinner('team1', 'team2', 4, 2, 4);
      expect(winner).toBe('team1');
    });

    test('lower seed wins 3-4', () => {
      const winner = getSeriesWinner('team1', 'team2', 3, 4, 4);
      expect(winner).toBe('team2');
    });

    test('series tied 3-3 has no winner yet', () => {
      const winner = getSeriesWinner('team1', 'team2', 3, 3, 4);
      expect(winner).toBeNull();
    });

    test('series at 1-0 has no winner yet', () => {
      const winner = getSeriesWinner('team1', 'team2', 1, 0, 4);
      expect(winner).toBeNull();
    });
  });
});

// ============================================
// FIRST ROUND MATCHUP TESTS
// ============================================

describe('First Round Matchup Generation', () => {
  const mockTeams: PlayoffTeam[] = [
    { teamId: 'e1', teamName: 'Tigers', seed: 1, league: 'Eastern', regularSeasonRecord: { wins: 56, losses: 34 }, eliminated: false },
    { teamId: 'e2', teamName: 'Sox', seed: 2, league: 'Eastern', regularSeasonRecord: { wins: 52, losses: 38 }, eliminated: false },
    { teamId: 'e3', teamName: 'Moonstars', seed: 3, league: 'Eastern', regularSeasonRecord: { wins: 48, losses: 42 }, eliminated: false },
    { teamId: 'e4', teamName: 'Bears', seed: 4, league: 'Eastern', regularSeasonRecord: { wins: 46, losses: 44 }, eliminated: false },
    { teamId: 'w1', teamName: 'Herbisaurs', seed: 1, league: 'Western', regularSeasonRecord: { wins: 58, losses: 32 }, eliminated: false },
    { teamId: 'w2', teamName: 'Wild Pigs', seed: 2, league: 'Western', regularSeasonRecord: { wins: 53, losses: 37 }, eliminated: false },
    { teamId: 'w3', teamName: 'Hot Corners', seed: 3, league: 'Western', regularSeasonRecord: { wins: 50, losses: 40 }, eliminated: false },
    { teamId: 'w4', teamName: 'Sand Cats', seed: 4, league: 'Western', regularSeasonRecord: { wins: 48, losses: 42 }, eliminated: false },
  ];

  test('Eastern 4-team bracket: 1v4, 2v3', () => {
    const matchups = generateFirstRoundMatchups(mockTeams, 'Eastern');
    expect(matchups.length).toBe(2);
    expect(matchups[0][0].seed).toBe(1);
    expect(matchups[0][1].seed).toBe(4);
    expect(matchups[1][0].seed).toBe(2);
    expect(matchups[1][1].seed).toBe(3);
  });

  test('Western 4-team bracket: 1v4, 2v3', () => {
    const matchups = generateFirstRoundMatchups(mockTeams, 'Western');
    expect(matchups.length).toBe(2);
    expect(matchups[0][0].seed).toBe(1);
    expect(matchups[0][1].seed).toBe(4);
    expect(matchups[1][0].seed).toBe(2);
    expect(matchups[1][1].seed).toBe(3);
  });

  test('higher seed is always first in matchup', () => {
    const matchups = generateFirstRoundMatchups(mockTeams, 'Eastern');
    for (const [higher, lower] of matchups) {
      expect(higher.seed).toBeLessThan(lower.seed);
    }
  });

  test('empty league returns no matchups', () => {
    const matchups = generateFirstRoundMatchups([], 'Eastern');
    expect(matchups.length).toBe(0);
  });
});

// ============================================
// TOTAL ROUNDS CALCULATION TESTS
// ============================================

describe('Total Rounds Calculation', () => {
  describe('with championship series', () => {
    test('2 teams per league = 2 rounds', () => {
      expect(calculateTotalRounds(2, true)).toBe(2);
    });

    test('4 teams per league = 3 rounds', () => {
      expect(calculateTotalRounds(4, true)).toBe(3);
    });

    test('8 teams per league = 4 rounds', () => {
      expect(calculateTotalRounds(8, true)).toBe(4);
    });
  });

  describe('without championship (single conference)', () => {
    test('2 teams = 1 round', () => {
      expect(calculateTotalRounds(2, false)).toBe(1);
    });

    test('4 teams = 2 rounds', () => {
      expect(calculateTotalRounds(4, false)).toBe(2);
    });

    test('8 teams = 3 rounds', () => {
      expect(calculateTotalRounds(8, false)).toBe(3);
    });
  });
});

// ============================================
// SERIES FILTERING TESTS
// ============================================

describe('Series Filtering', () => {
  const mockSeries: PlayoffSeries[] = [
    { id: 's1', playoffId: 'p1', round: 1, seriesNumber: 1, higherSeed: { teamId: 't1', teamName: 'A', seed: 1, wins: 4 }, lowerSeed: { teamId: 't2', teamName: 'B', seed: 8, wins: 1 }, gamesNeeded: 4, status: 'COMPLETED', winnerId: 't1' },
    { id: 's2', playoffId: 'p1', round: 1, seriesNumber: 2, higherSeed: { teamId: 't3', teamName: 'C', seed: 2, wins: 4 }, lowerSeed: { teamId: 't4', teamName: 'D', seed: 7, wins: 2 }, gamesNeeded: 4, status: 'COMPLETED', winnerId: 't3' },
    { id: 's3', playoffId: 'p1', round: 2, seriesNumber: 1, higherSeed: { teamId: 't1', teamName: 'A', seed: 1, wins: 2 }, lowerSeed: { teamId: 't3', teamName: 'C', seed: 2, wins: 2 }, gamesNeeded: 4, status: 'IN_PROGRESS' },
    { id: 's4', playoffId: 'p1', round: 3, seriesNumber: 1, higherSeed: { teamId: 'tbd', teamName: 'TBD', seed: 0, wins: 0 }, lowerSeed: { teamId: 'tbd2', teamName: 'TBD', seed: 0, wins: 0 }, gamesNeeded: 4, status: 'PENDING' },
  ];

  describe('filterSeriesByStatus', () => {
    test('finds all completed series', () => {
      const completed = filterSeriesByStatus(mockSeries, 'COMPLETED');
      expect(completed.length).toBe(2);
    });

    test('finds in progress series', () => {
      const inProgress = filterSeriesByStatus(mockSeries, 'IN_PROGRESS');
      expect(inProgress.length).toBe(1);
    });

    test('finds pending series', () => {
      const pending = filterSeriesByStatus(mockSeries, 'PENDING');
      expect(pending.length).toBe(1);
    });
  });

  describe('filterSeriesByRound', () => {
    test('finds round 1 series', () => {
      const round1 = filterSeriesByRound(mockSeries, 1);
      expect(round1.length).toBe(2);
    });

    test('finds round 2 series', () => {
      const round2 = filterSeriesByRound(mockSeries, 2);
      expect(round2.length).toBe(1);
    });

    test('finds round 3 series', () => {
      const round3 = filterSeriesByRound(mockSeries, 3);
      expect(round3.length).toBe(1);
    });
  });

  describe('isRoundComplete', () => {
    test('round 1 is complete', () => {
      expect(isRoundComplete(mockSeries, 1)).toBe(true);
    });

    test('round 2 is not complete', () => {
      expect(isRoundComplete(mockSeries, 2)).toBe(false);
    });

    test('round 3 is not complete (pending)', () => {
      expect(isRoundComplete(mockSeries, 3)).toBe(false);
    });

    test('non-existent round is not complete', () => {
      expect(isRoundComplete(mockSeries, 5)).toBe(false);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('single elimination (best of 1)', () => {
    expect(gamesNeededToWin(1)).toBe(1);
    expect(isSeriesComplete(1, 0, 1)).toBe(true);
    expect(isSeriesComplete(0, 1, 1)).toBe(true);
    expect(isSeriesComplete(0, 0, 1)).toBe(false);
  });

  test('odd team count (5 teams)', () => {
    const teams: PlayoffTeam[] = [
      { teamId: 'e1', teamName: 'A', seed: 1, league: 'Eastern', regularSeasonRecord: { wins: 50, losses: 40 }, eliminated: false },
      { teamId: 'e2', teamName: 'B', seed: 2, league: 'Eastern', regularSeasonRecord: { wins: 48, losses: 42 }, eliminated: false },
      { teamId: 'e3', teamName: 'C', seed: 3, league: 'Eastern', regularSeasonRecord: { wins: 46, losses: 44 }, eliminated: false },
      { teamId: 'e4', teamName: 'D', seed: 4, league: 'Eastern', regularSeasonRecord: { wins: 44, losses: 46 }, eliminated: false },
      { teamId: 'e5', teamName: 'E', seed: 5, league: 'Eastern', regularSeasonRecord: { wins: 42, losses: 48 }, eliminated: false },
    ];
    // With 5 teams, we get 2 matchups (1v5, 2v4) and 3-seed gets a bye
    const matchups = generateFirstRoundMatchups(teams, 'Eastern');
    expect(matchups.length).toBe(2);
    expect(matchups[0][0].seed).toBe(1);
    expect(matchups[0][1].seed).toBe(5);
    expect(matchups[1][0].seed).toBe(2);
    expect(matchups[1][1].seed).toBe(4);
  });
});
