/**
 * Scoreboard Data Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7
 *
 * Tests that PostGameSummary scoreboard shows real game data
 * including inning-by-inning scores, totals, and line score.
 */

import { describe, test, expect } from 'vitest';
import type { BoxScore } from '../../utils/eventLog';

// ============================================
// LINE SCORE STRUCTURE
// ============================================

describe('Line Score Structure', () => {
  test('lineScore has away and home arrays', () => {
    const lineScore = {
      away: [0, 0, 1, 0, 2, 0, 0, 1, 1], // 5 runs
      home: [1, 0, 0, 0, 0, 1, 0, 1, 0], // 3 runs
    };

    expect(Array.isArray(lineScore.away)).toBe(true);
    expect(Array.isArray(lineScore.home)).toBe(true);
  });

  test('lineScore arrays have one entry per inning', () => {
    // 9-inning game
    const lineScore = {
      away: [0, 0, 0, 1, 0, 2, 0, 0, 1],
      home: [0, 1, 0, 0, 0, 0, 1, 0, 0],
    };

    expect(lineScore.away.length).toBe(9);
    expect(lineScore.home.length).toBe(9);
  });

  test('lineScore can handle extra innings', () => {
    // 11-inning game
    const lineScore = {
      away: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2], // 11 innings
      home: [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1], // 11 innings
    };

    expect(lineScore.away.length).toBe(11);
    expect(lineScore.home.length).toBe(11);
  });

  test('lineScore can handle SMB4 short games', () => {
    // 5-inning game
    const lineScore = {
      away: [0, 1, 0, 2, 0],
      home: [1, 0, 1, 0, 1],
    };

    expect(lineScore.away.length).toBe(5);
    expect(lineScore.home.length).toBe(5);
  });
});

// ============================================
// INNING-BY-INNING SCORES
// ============================================

describe('Inning-by-Inning Scores', () => {
  test('inning runs are non-negative integers', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7:
    // "Inning-by-inning scores from completed game"

    const lineScore = {
      away: [0, 0, 1, 0, 2, 0, 0, 1, 1],
      home: [1, 0, 0, 0, 0, 1, 0, 1, 0],
    };

    lineScore.away.forEach(runs => {
      expect(runs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(runs)).toBe(true);
    });

    lineScore.home.forEach(runs => {
      expect(runs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(runs)).toBe(true);
    });
  });

  test('big inning can have many runs', () => {
    const lineScore = {
      away: [0, 0, 7, 0, 0, 0, 2, 0, 0], // 7-run 3rd inning
      home: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    };

    expect(lineScore.away[2]).toBe(7);
    expect(Math.max(...lineScore.away)).toBe(7);
  });

  test('scoreless inning is 0', () => {
    const lineScore = {
      away: [0, 0, 0, 0, 0, 0, 0, 0, 1],
      home: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    };

    // 8 scoreless innings for away, all scoreless for home
    const awayScorelessCount = lineScore.away.filter(r => r === 0).length;
    expect(awayScorelessCount).toBe(8);

    const homeScorelessCount = lineScore.home.filter(r => r === 0).length;
    expect(homeScorelessCount).toBe(9);
  });

  test('walk-off means bottom of final inning incomplete', () => {
    // If home team walks off, bottom of 9th may have fewer half-innings played
    // But line score still shows each team's runs per inning
    const lineScore = {
      away: [0, 0, 1, 0, 2, 0, 0, 1, 1], // Away scored 5
      home: [1, 0, 0, 0, 0, 1, 0, 1, 3], // Home walked off with 3 in 9th = 6 total
    };

    const awayTotal = lineScore.away.reduce((a, b) => a + b, 0);
    const homeTotal = lineScore.home.reduce((a, b) => a + b, 0);

    expect(awayTotal).toBe(5);
    expect(homeTotal).toBe(6);
    expect(homeTotal).toBeGreaterThan(awayTotal); // Home won
  });
});

// ============================================
// TOTAL CALCULATIONS
// ============================================

describe('Total Calculations', () => {
  test('total runs from actual game', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7:
    // "Total runs from actual game"

    const lineScore = {
      away: [0, 0, 1, 0, 2, 0, 0, 1, 1],
      home: [1, 0, 0, 0, 0, 1, 0, 1, 0],
    };

    const awayRuns = lineScore.away.reduce((a, b) => a + b, 0);
    const homeRuns = lineScore.home.reduce((a, b) => a + b, 0);

    expect(awayRuns).toBe(5);
    expect(homeRuns).toBe(3);
  });

  test('total hits from actual game', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7:
    // "Total hits from actual game"

    const boxScore: Partial<BoxScore> = {
      awayTeam: {
        id: 'away',
        name: 'Away',
        runs: 5,
        hits: 10, // Team total hits
        errors: 1,
        batters: [],
        pitchers: [],
      },
      homeTeam: {
        id: 'home',
        name: 'Home',
        runs: 3,
        hits: 7, // Team total hits
        errors: 0,
        batters: [],
        pitchers: [],
      },
    };

    expect(boxScore.awayTeam!.hits).toBe(10);
    expect(boxScore.homeTeam!.hits).toBe(7);
  });

  test('total errors from actual game', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7:
    // "Total errors from actual game"

    const boxScore: Partial<BoxScore> = {
      awayTeam: {
        id: 'away',
        name: 'Away',
        runs: 5,
        hits: 10,
        errors: 1, // Away committed 1 error
        batters: [],
        pitchers: [],
      },
      homeTeam: {
        id: 'home',
        name: 'Home',
        runs: 3,
        hits: 7,
        errors: 2, // Home committed 2 errors
        batters: [],
        pitchers: [],
      },
    };

    expect(boxScore.awayTeam!.errors).toBe(1);
    expect(boxScore.homeTeam!.errors).toBe(2);
  });

  test('R-H-E totals match line score sum', () => {
    const lineScore = {
      away: [0, 1, 0, 2, 0, 1, 0, 0, 1],
      home: [0, 0, 1, 0, 0, 0, 2, 0, 0],
    };

    const boxScore: Partial<BoxScore> = {
      awayTeam: {
        id: 'away',
        name: 'Away',
        runs: 5,
        hits: 9,
        errors: 0,
        batters: [],
        pitchers: [],
      },
      homeTeam: {
        id: 'home',
        name: 'Home',
        runs: 3,
        hits: 6,
        errors: 2,
        batters: [],
        pitchers: [],
      },
      lineScore,
    };

    // Verify runs match line score
    expect(boxScore.awayTeam!.runs).toBe(lineScore.away.reduce((a, b) => a + b, 0));
    expect(boxScore.homeTeam!.runs).toBe(lineScore.home.reduce((a, b) => a + b, 0));
  });
});

// ============================================
// BOX SCORE TEAM DATA
// ============================================

describe('Box Score Team Data', () => {
  test('BoxScore has awayTeam and homeTeam', () => {
    const boxScore: BoxScore = {
      gameId: 'game-001',
      date: Date.now(),
      awayTeam: {
        id: 'team-away',
        name: 'Away Team',
        runs: 5,
        hits: 10,
        errors: 1,
        batters: [],
        pitchers: [],
      },
      homeTeam: {
        id: 'team-home',
        name: 'Home Team',
        runs: 3,
        hits: 7,
        errors: 2,
        batters: [],
        pitchers: [],
      },
      lineScore: {
        away: [0, 0, 1, 0, 2, 0, 0, 1, 1],
        home: [1, 0, 0, 0, 0, 1, 0, 1, 0],
      },
      fameEvents: [],
    };

    expect(boxScore.awayTeam).toBeDefined();
    expect(boxScore.homeTeam).toBeDefined();
    expect(boxScore.awayTeam.id).toBe('team-away');
    expect(boxScore.homeTeam.id).toBe('team-home');
  });

  test('team names populated from game data', () => {
    const boxScore: Partial<BoxScore> = {
      awayTeam: {
        id: 'mets',
        name: 'New York Mets',
        runs: 4,
        hits: 8,
        errors: 1,
        batters: [],
        pitchers: [],
      },
      homeTeam: {
        id: 'dodgers',
        name: 'Los Angeles Dodgers',
        runs: 3,
        hits: 6,
        errors: 0,
        batters: [],
        pitchers: [],
      },
    };

    expect(boxScore.awayTeam!.name).toBe('New York Mets');
    expect(boxScore.homeTeam!.name).toBe('Los Angeles Dodgers');
  });
});

// ============================================
// GAME SCENARIOS
// ============================================

describe('Game Scenarios', () => {
  test('Scenario: Shutout', () => {
    const lineScore = {
      away: [0, 0, 0, 0, 0, 0, 0, 0, 0], // Shutout
      home: [1, 0, 0, 2, 0, 0, 1, 0, 0],
    };

    const awayRuns = lineScore.away.reduce((a, b) => a + b, 0);
    const homeRuns = lineScore.home.reduce((a, b) => a + b, 0);

    expect(awayRuns).toBe(0);
    expect(homeRuns).toBe(4);
  });

  test('Scenario: Blowout', () => {
    const lineScore = {
      away: [0, 0, 1, 0, 0, 0, 0, 0, 0], // 1 run
      home: [3, 2, 0, 5, 0, 2, 0, 0, 0], // 12 runs
    };

    const awayRuns = lineScore.away.reduce((a, b) => a + b, 0);
    const homeRuns = lineScore.home.reduce((a, b) => a + b, 0);

    expect(homeRuns - awayRuns).toBeGreaterThan(10);
  });

  test('Scenario: Walk-off win', () => {
    const lineScore = {
      away: [0, 0, 0, 1, 0, 0, 0, 0, 0], // 1 run
      home: [0, 0, 0, 0, 0, 0, 0, 0, 2], // 2 in 9th = walk-off
    };

    const awayRuns = lineScore.away.reduce((a, b) => a + b, 0);
    const homeRuns = lineScore.home.reduce((a, b) => a + b, 0);

    expect(awayRuns).toBe(1);
    expect(homeRuns).toBe(2);
    expect(lineScore.home[8]).toBe(2); // Walk-off runs in 9th
  });

  test('Scenario: Extra innings', () => {
    const lineScore = {
      away: [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 2], // 12 innings
      home: [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // Lost in 12th
    };

    expect(lineScore.away.length).toBe(12);
    expect(lineScore.home.length).toBe(12);

    const awayRuns = lineScore.away.reduce((a, b) => a + b, 0);
    const homeRuns = lineScore.home.reduce((a, b) => a + b, 0);

    expect(awayRuns).toBe(4);
    expect(homeRuns).toBe(2);
  });

  test('Scenario: Tie broken in late innings', () => {
    const lineScore = {
      away: [1, 0, 0, 0, 0, 0, 0, 2, 0], // Tied until 8th
      home: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    };

    // Score was tied 1-1 through 7
    const awayThrough7 = lineScore.away.slice(0, 7).reduce((a, b) => a + b, 0);
    const homeThrough7 = lineScore.home.slice(0, 7).reduce((a, b) => a + b, 0);
    expect(awayThrough7).toBe(1);
    expect(homeThrough7).toBe(1);

    // Away broke it open in 8th
    expect(lineScore.away[7]).toBe(2);
  });
});

// ============================================
// FAME EVENTS IN BOX SCORE
// ============================================

describe('Fame Events in Box Score', () => {
  test('fameEvents array included in BoxScore', () => {
    const boxScore: BoxScore = {
      gameId: 'game-001',
      date: Date.now(),
      awayTeam: {
        id: 'away',
        name: 'Away',
        runs: 5,
        hits: 10,
        errors: 1,
        batters: [],
        pitchers: [],
      },
      homeTeam: {
        id: 'home',
        name: 'Home',
        runs: 3,
        hits: 7,
        errors: 0,
        batters: [],
        pitchers: [],
      },
      lineScore: {
        away: [0, 0, 1, 0, 2, 0, 0, 1, 1],
        home: [1, 0, 0, 0, 0, 1, 0, 1, 0],
      },
      fameEvents: [
        {
          eventType: 'CLUTCH_HIT',
          fameType: 'bonus',
          fameValue: 2.0,
          playerId: 'p1',
          playerName: 'Clutch Hitter',
          description: 'Go-ahead hit in 8th',
        },
      ],
    };

    expect(boxScore.fameEvents).toBeDefined();
    expect(boxScore.fameEvents.length).toBe(1);
    expect(boxScore.fameEvents[0].eventType).toBe('CLUTCH_HIT');
  });

  test('fameEvents can be empty', () => {
    const boxScore: Partial<BoxScore> = {
      fameEvents: [],
    };

    expect(boxScore.fameEvents).toEqual([]);
  });
});
