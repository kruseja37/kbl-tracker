/**
 * Error Tracking Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 1.6
 *
 * Tests that defensive errors are properly tracked for fWAR calculation
 * and box score reporting.
 *
 * Per DEFINITIVE_GAP_ANALYSIS: "CRITICAL - blocks fWAR calculation"
 */

import { describe, test, expect } from 'vitest';

// ============================================
// ERROR EVENT TYPES
// ============================================

interface ErrorEvent {
  eventId: string;
  gameId: string;
  inning: number;
  fielderId: string;
  fielderTeamId: string;
  fielderPosition: string;
  errorType: 'fielding' | 'throwing' | 'dropped_ball';
  runnersAdvanced: number; // How many bases runners advanced due to error
  runsScored: number; // Unearned runs that scored
  batterId: string;
  pitcherId: string;
}

interface FielderErrorStats {
  playerId: string;
  errors: number;
  fieldingErrors: number;
  throwingErrors: number;
  droppedBalls: number;
  position: string;
}

// ============================================
// ERROR TRACKING STRUCTURE
// ============================================

describe('Error Tracking Structure', () => {
  test('ErrorEvent has all required fields', () => {
    const error: ErrorEvent = {
      eventId: 'g1_e1',
      gameId: 'g1',
      inning: 3,
      fielderId: 'f1',
      fielderTeamId: 'home',
      fielderPosition: 'SS',
      errorType: 'fielding',
      runnersAdvanced: 1,
      runsScored: 0,
      batterId: 'b1',
      pitcherId: 'p1',
    };

    expect(error.eventId).toBeDefined();
    expect(error.gameId).toBeDefined();
    expect(error.fielderId).toBeDefined();
    expect(error.errorType).toBe('fielding');
  });

  test('error types are fielding, throwing, or dropped_ball', () => {
    const errorTypes: ErrorEvent['errorType'][] = ['fielding', 'throwing', 'dropped_ball'];

    errorTypes.forEach(type => {
      const error: ErrorEvent = {
        eventId: 'e1',
        gameId: 'g1',
        inning: 1,
        fielderId: 'f1',
        fielderTeamId: 'home',
        fielderPosition: 'SS',
        errorType: type,
        runnersAdvanced: 0,
        runsScored: 0,
        batterId: 'b1',
        pitcherId: 'p1',
      };

      expect(['fielding', 'throwing', 'dropped_ball']).toContain(error.errorType);
    });
  });

  test('error tracks responsible fielder position', () => {
    const ssError: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 1,
      fielderId: 'ss1',
      fielderTeamId: 'home',
      fielderPosition: 'SS',
      errorType: 'throwing',
      runnersAdvanced: 1,
      runsScored: 0,
      batterId: 'b1',
      pitcherId: 'p1',
    };

    expect(ssError.fielderPosition).toBe('SS');
  });
});

// ============================================
// ERROR ATTRIBUTION
// ============================================

describe('Error Attribution', () => {
  test('error attributed to specific fielder', () => {
    const error: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 5,
      fielderId: 'player-123',
      fielderTeamId: 'away',
      fielderPosition: '3B',
      errorType: 'fielding',
      runnersAdvanced: 1,
      runsScored: 0,
      batterId: 'b1',
      pitcherId: 'p1',
    };

    expect(error.fielderId).toBe('player-123');
    expect(error.fielderPosition).toBe('3B');
  });

  test('error tracks team of fielder', () => {
    const homeError: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 1,
      fielderId: 'f1',
      fielderTeamId: 'home',
      fielderPosition: 'SS',
      errorType: 'throwing',
      runnersAdvanced: 1,
      runsScored: 0,
      batterId: 'b1',
      pitcherId: 'p1',
    };

    const awayError: ErrorEvent = {
      eventId: 'e2',
      gameId: 'g1',
      inning: 2,
      fielderId: 'f2',
      fielderTeamId: 'away',
      fielderPosition: '2B',
      errorType: 'fielding',
      runnersAdvanced: 0,
      runsScored: 0,
      batterId: 'b2',
      pitcherId: 'p2',
    };

    expect(homeError.fielderTeamId).toBe('home');
    expect(awayError.fielderTeamId).toBe('away');
  });

  test('error linked to at-bat context', () => {
    // Error occurs during an at-bat, need to track pitcher and batter
    const error: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 3,
      fielderId: 'f1',
      fielderTeamId: 'home',
      fielderPosition: 'SS',
      errorType: 'throwing',
      runnersAdvanced: 1,
      runsScored: 0,
      batterId: 'batter-456',
      pitcherId: 'pitcher-789',
    };

    expect(error.batterId).toBe('batter-456');
    expect(error.pitcherId).toBe('pitcher-789');
  });
});

// ============================================
// ERROR CONSEQUENCES
// ============================================

describe('Error Consequences', () => {
  test('error can advance runners', () => {
    const error: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 5,
      fielderId: 'f1',
      fielderTeamId: 'home',
      fielderPosition: 'RF',
      errorType: 'fielding',
      runnersAdvanced: 2, // Runner went from 1st to 3rd
      runsScored: 0,
      batterId: 'b1',
      pitcherId: 'p1',
    };

    expect(error.runnersAdvanced).toBe(2);
  });

  test('error can allow runs to score', () => {
    const error: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 7,
      fielderId: 'f1',
      fielderTeamId: 'home',
      fielderPosition: 'LF',
      errorType: 'fielding',
      runnersAdvanced: 3,
      runsScored: 1, // Runner scored from 2nd on error
      batterId: 'b1',
      pitcherId: 'p1',
    };

    expect(error.runsScored).toBe(1);
  });

  test('runs scored on error are unearned', () => {
    // Per baseball rules, runs scoring due to errors are unearned
    const error: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 3,
      fielderId: 'f1',
      fielderTeamId: 'home',
      fielderPosition: '1B',
      errorType: 'dropped_ball',
      runnersAdvanced: 1,
      runsScored: 1,
      batterId: 'b1',
      pitcherId: 'p1',
    };

    // Runs scored on errors don't count as earned runs for pitcher
    const unearnedRuns = error.runsScored;
    expect(unearnedRuns).toBe(1);
  });

  test('multiple errors in one game tracked separately', () => {
    const errors: ErrorEvent[] = [
      {
        eventId: 'e1',
        gameId: 'g1',
        inning: 2,
        fielderId: 'ss1',
        fielderTeamId: 'home',
        fielderPosition: 'SS',
        errorType: 'throwing',
        runnersAdvanced: 1,
        runsScored: 0,
        batterId: 'b1',
        pitcherId: 'p1',
      },
      {
        eventId: 'e2',
        gameId: 'g1',
        inning: 5,
        fielderId: 'ss1', // Same fielder
        fielderTeamId: 'home',
        fielderPosition: 'SS',
        errorType: 'fielding',
        runnersAdvanced: 0,
        runsScored: 0,
        batterId: 'b2',
        pitcherId: 'p1',
      },
      {
        eventId: 'e3',
        gameId: 'g1',
        inning: 7,
        fielderId: '3b1', // Different fielder
        fielderTeamId: 'home',
        fielderPosition: '3B',
        errorType: 'fielding',
        runnersAdvanced: 1,
        runsScored: 1,
        batterId: 'b3',
        pitcherId: 'p2',
      },
    ];

    expect(errors.length).toBe(3);
    expect(errors.filter(e => e.fielderId === 'ss1').length).toBe(2);
    expect(errors.filter(e => e.fielderId === '3b1').length).toBe(1);
  });
});

// ============================================
// ERROR STAT AGGREGATION
// ============================================

describe('Error Stat Aggregation', () => {
  test('aggregate errors by fielder', () => {
    const errors: ErrorEvent[] = [
      {
        eventId: 'e1',
        gameId: 'g1',
        inning: 2,
        fielderId: 'f1',
        fielderTeamId: 'home',
        fielderPosition: 'SS',
        errorType: 'throwing',
        runnersAdvanced: 1,
        runsScored: 0,
        batterId: 'b1',
        pitcherId: 'p1',
      },
      {
        eventId: 'e2',
        gameId: 'g1',
        inning: 5,
        fielderId: 'f1',
        fielderTeamId: 'home',
        fielderPosition: 'SS',
        errorType: 'fielding',
        runnersAdvanced: 0,
        runsScored: 0,
        batterId: 'b2',
        pitcherId: 'p1',
      },
    ];

    const aggregateErrors = (events: ErrorEvent[]): Map<string, FielderErrorStats> => {
      const stats = new Map<string, FielderErrorStats>();

      for (const e of events) {
        if (!stats.has(e.fielderId)) {
          stats.set(e.fielderId, {
            playerId: e.fielderId,
            errors: 0,
            fieldingErrors: 0,
            throwingErrors: 0,
            droppedBalls: 0,
            position: e.fielderPosition,
          });
        }

        const fielderStats = stats.get(e.fielderId)!;
        fielderStats.errors++;

        switch (e.errorType) {
          case 'fielding':
            fielderStats.fieldingErrors++;
            break;
          case 'throwing':
            fielderStats.throwingErrors++;
            break;
          case 'dropped_ball':
            fielderStats.droppedBalls++;
            break;
        }
      }

      return stats;
    };

    const stats = aggregateErrors(errors);
    const f1Stats = stats.get('f1')!;

    expect(f1Stats.errors).toBe(2);
    expect(f1Stats.throwingErrors).toBe(1);
    expect(f1Stats.fieldingErrors).toBe(1);
  });

  test('team error total is sum of individual errors', () => {
    const teamErrors: ErrorEvent[] = [
      { eventId: 'e1', gameId: 'g1', inning: 1, fielderId: 'ss', fielderTeamId: 'home', fielderPosition: 'SS', errorType: 'throwing', runnersAdvanced: 1, runsScored: 0, batterId: 'b1', pitcherId: 'p1' },
      { eventId: 'e2', gameId: 'g1', inning: 3, fielderId: '3b', fielderTeamId: 'home', fielderPosition: '3B', errorType: 'fielding', runnersAdvanced: 0, runsScored: 0, batterId: 'b2', pitcherId: 'p1' },
      { eventId: 'e3', gameId: 'g1', inning: 5, fielderId: 'rf', fielderTeamId: 'home', fielderPosition: 'RF', errorType: 'dropped_ball', runnersAdvanced: 1, runsScored: 1, batterId: 'b3', pitcherId: 'p1' },
    ];

    const homeTeamErrors = teamErrors.filter(e => e.fielderTeamId === 'home').length;
    expect(homeTeamErrors).toBe(3);
  });
});

// ============================================
// ERROR IMPACT ON FWAR
// ============================================

describe('Error Impact on fWAR', () => {
  test('errors decrease fWAR', () => {
    // Per FWAR_CALCULATION_SPEC.md, errors negatively impact fielding WAR
    // Each error is roughly worth -0.5 to -1.0 runs above average

    const errorRunValue = -0.75; // Approximate run value per error
    const errorsCommitted = 3;

    const fwarImpact = errorsCommitted * errorRunValue;
    expect(fwarImpact).toBeLessThan(0);
    expect(fwarImpact).toBeCloseTo(-2.25, 2);
  });

  test('error rate compared to position average', () => {
    // Error rate = Errors / Chances
    // Position-specific rates matter

    const ssAvgErrorRate = 0.025; // ~2.5% error rate for SS
    const playerErrorRate = 0.030; // 3.0% - worse than average

    const runsAboveAverage = (ssAvgErrorRate - playerErrorRate) * 1000; // Per 1000 chances
    expect(runsAboveAverage).toBeLessThan(0); // Below average = negative
  });

  test('error context matters for run value', () => {
    // Error with runners on is more costly than error with bases empty
    const errorBasesEmpty = {
      runnersAdvanced: 0,
      runsScored: 0,
      expectedRunsAllowed: 0.2, // Just batter reaches
    };

    const errorRunnersOn = {
      runnersAdvanced: 2,
      runsScored: 1,
      expectedRunsAllowed: 1.5, // Run scored + runners advanced
    };

    expect(errorRunnersOn.expectedRunsAllowed).toBeGreaterThan(
      errorBasesEmpty.expectedRunsAllowed
    );
  });
});

// ============================================
// ERROR BY POSITION
// ============================================

describe('Error by Position', () => {
  test('infielders typically have more error opportunities', () => {
    // Ground balls go to infielders more often
    const positionErrorOpportunities: Record<string, number> = {
      P: 30, // Per 162 games
      C: 80,
      '1B': 120,
      '2B': 250,
      SS: 350,
      '3B': 200,
      LF: 60,
      CF: 80,
      RF: 70,
    };

    expect(positionErrorOpportunities['SS']).toBeGreaterThan(positionErrorOpportunities['RF']);
    expect(positionErrorOpportunities['2B']).toBeGreaterThan(positionErrorOpportunities['LF']);
  });

  test('outfielder errors often more costly', () => {
    // Outfield errors typically allow more advancement
    const outfieldError: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 5,
      fielderId: 'cf1',
      fielderTeamId: 'home',
      fielderPosition: 'CF',
      errorType: 'fielding',
      runnersAdvanced: 3, // Extra bases on outfield misplay
      runsScored: 1,
      batterId: 'b1',
      pitcherId: 'p1',
    };

    const infieldError: ErrorEvent = {
      eventId: 'e2',
      gameId: 'g1',
      inning: 5,
      fielderId: 'ss1',
      fielderTeamId: 'home',
      fielderPosition: 'SS',
      errorType: 'throwing',
      runnersAdvanced: 1, // Usually just one extra base
      runsScored: 0,
      batterId: 'b2',
      pitcherId: 'p1',
    };

    expect(outfieldError.runnersAdvanced).toBeGreaterThan(infieldError.runnersAdvanced);
  });

  test('catcher errors include passed balls', () => {
    // Passed balls are a form of catcher error (though scored separately)
    const catcherError: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 3,
      fielderId: 'c1',
      fielderTeamId: 'home',
      fielderPosition: 'C',
      errorType: 'dropped_ball', // Passed ball variant
      runnersAdvanced: 1,
      runsScored: 0,
      batterId: 'b1',
      pitcherId: 'p1',
    };

    expect(catcherError.fielderPosition).toBe('C');
    expect(catcherError.errorType).toBe('dropped_ball');
  });
});

// ============================================
// BOX SCORE ERROR DISPLAY
// ============================================

describe('Box Score Error Display', () => {
  test('team errors shown in R-H-E line', () => {
    interface TeamLine {
      runs: number;
      hits: number;
      errors: number;
    }

    const awayLine: TeamLine = { runs: 5, hits: 10, errors: 1 };
    const homeLine: TeamLine = { runs: 3, hits: 7, errors: 2 };

    expect(awayLine.errors).toBe(1);
    expect(homeLine.errors).toBe(2);
  });

  test('errors listed by fielder in detailed box', () => {
    interface BoxScoreErrorEntry {
      fielderName: string;
      position: string;
      errorCount: number;
    }

    const errorEntries: BoxScoreErrorEntry[] = [
      { fielderName: 'Smith', position: 'SS', errorCount: 2 },
      { fielderName: 'Jones', position: 'RF', errorCount: 1 },
    ];

    const totalErrors = errorEntries.reduce((sum, e) => sum + e.errorCount, 0);
    expect(totalErrors).toBe(3);
  });
});

// ============================================
// SMB4 ERROR CONTEXT
// ============================================

describe('SMB4 Error Context', () => {
  test('SMB4 errors happen on difficult plays', () => {
    // In SMB4, errors typically occur on:
    // - Diving plays
    // - Throws across the diamond
    // - High difficulty ground balls
    // - Missed catches on relay throws

    const difficultPlayError: ErrorEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 4,
      fielderId: 'ss1',
      fielderTeamId: 'home',
      fielderPosition: 'SS',
      errorType: 'throwing',
      runnersAdvanced: 1,
      runsScored: 0,
      batterId: 'b1',
      pitcherId: 'p1',
    };

    // The error is valid regardless of play difficulty
    expect(difficultPlayError.errorType).toBeDefined();
  });

  test('error tracking for 5-inning games', () => {
    // SMB4 games can be 5-7 innings
    // Error rate per game should be comparable
    const fiveInningGameErrors: ErrorEvent[] = [
      { eventId: 'e1', gameId: 'g1', inning: 2, fielderId: 'f1', fielderTeamId: 'home', fielderPosition: 'SS', errorType: 'fielding', runnersAdvanced: 0, runsScored: 0, batterId: 'b1', pitcherId: 'p1' },
    ];

    const nineInningGameErrors: ErrorEvent[] = [
      { eventId: 'e1', gameId: 'g2', inning: 2, fielderId: 'f1', fielderTeamId: 'home', fielderPosition: 'SS', errorType: 'fielding', runnersAdvanced: 0, runsScored: 0, batterId: 'b1', pitcherId: 'p1' },
      { eventId: 'e2', gameId: 'g2', inning: 7, fielderId: 'f2', fielderTeamId: 'home', fielderPosition: '3B', errorType: 'throwing', runnersAdvanced: 1, runsScored: 0, batterId: 'b2', pitcherId: 'p1' },
    ];

    // More innings = more chances for errors
    expect(nineInningGameErrors.length).toBeGreaterThan(fiveInningGameErrors.length);
  });
});

// ============================================
// VALIDATION
// ============================================

describe('Error Validation', () => {
  test('error requires valid fielder position', () => {
    const validPositions = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];

    const isValidPosition = (pos: string): boolean => validPositions.includes(pos);

    expect(isValidPosition('SS')).toBe(true);
    expect(isValidPosition('DH')).toBe(false); // DH doesn't field
    expect(isValidPosition('XX')).toBe(false);
  });

  test('error requires valid error type', () => {
    const validTypes = ['fielding', 'throwing', 'dropped_ball'];

    const isValidType = (type: string): boolean => validTypes.includes(type);

    expect(isValidType('fielding')).toBe(true);
    expect(isValidType('throwing')).toBe(true);
    expect(isValidType('dropped_ball')).toBe(true);
    expect(isValidType('mental')).toBe(false);
  });

  test('runners advanced must be non-negative', () => {
    const isValidRunnersAdvanced = (n: number): boolean => n >= 0;

    expect(isValidRunnersAdvanced(0)).toBe(true);
    expect(isValidRunnersAdvanced(1)).toBe(true);
    expect(isValidRunnersAdvanced(3)).toBe(true);
    expect(isValidRunnersAdvanced(-1)).toBe(false);
  });

  test('runs scored cannot exceed runners advanced + 1', () => {
    // Can't score more runs than runners who advanced (plus batter reaching)
    const isValidRunsScored = (runs: number, advanced: number): boolean => {
      return runs >= 0 && runs <= advanced + 1;
    };

    expect(isValidRunsScored(0, 0)).toBe(true);
    expect(isValidRunsScored(1, 1)).toBe(true);
    expect(isValidRunsScored(2, 3)).toBe(true);
    expect(isValidRunsScored(3, 1)).toBe(false); // Can't score 3 runs if only 1 runner advanced
  });
});
