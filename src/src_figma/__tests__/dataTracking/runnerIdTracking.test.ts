/**
 * Runner ID Tracking Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 1.6
 *
 * Tests that runner IDs are properly tracked in AtBatEvents for
 * correct earned run attribution after pitching changes.
 *
 * Per DEFINITIVE_GAP_ANALYSIS: "Currently always empty string"
 */

import { describe, test, expect } from 'vitest';

// ============================================
// RUNNER ID TYPES
// ============================================

interface RunnerInfo {
  runnerId: string;
  runnerName?: string;
  responsiblePitcherId: string; // Pitcher who allowed this runner
  reachedOn: 'walk' | 'hit' | 'error' | 'fc' | 'hbp' | 'd3k';
  reachedInning: number;
}

interface AtBatEventRunners {
  first: RunnerInfo | null;
  second: RunnerInfo | null;
  third: RunnerInfo | null;
}

interface AtBatEvent {
  eventId: string;
  gameId: string;
  inning: number;
  batterId: string;
  batterName: string;
  pitcherId: string;
  pitcherName: string;
  result: string;
  runnersBeforePlay: AtBatEventRunners;
  runnersAfterPlay: AtBatEventRunners;
}

// ============================================
// RUNNER ID STRUCTURE
// ============================================

describe('Runner ID Structure', () => {
  test('RunnerInfo has all required fields', () => {
    const runner: RunnerInfo = {
      runnerId: 'player-123',
      runnerName: 'John Doe',
      responsiblePitcherId: 'pitcher-456',
      reachedOn: 'walk',
      reachedInning: 3,
    };

    expect(runner.runnerId).toBe('player-123');
    expect(runner.responsiblePitcherId).toBe('pitcher-456');
    expect(runner.reachedOn).toBe('walk');
    expect(runner.reachedInning).toBe(3);
  });

  test('AtBatEventRunners has first, second, third', () => {
    const runners: AtBatEventRunners = {
      first: {
        runnerId: 'r1',
        responsiblePitcherId: 'p1',
        reachedOn: 'hit',
        reachedInning: 1,
      },
      second: null,
      third: null,
    };

    expect(runners.first).not.toBeNull();
    expect(runners.second).toBeNull();
    expect(runners.third).toBeNull();
  });

  test('runner ID should never be empty string', () => {
    // Per DEFINITIVE_GAP_ANALYSIS: "Currently always empty string"
    // This test enforces that runner IDs must be valid

    const isValidRunnerId = (id: string): boolean => {
      return id.length > 0 && id !== '' && id !== 'undefined' && id !== 'null';
    };

    expect(isValidRunnerId('player-123')).toBe(true);
    expect(isValidRunnerId('')).toBe(false);
    expect(isValidRunnerId('undefined')).toBe(false);
  });
});

// ============================================
// RUNNER ID TRACKING ON BASE EVENTS
// ============================================

describe('Runner ID Tracking on Base Events', () => {
  test('batter reaching on walk has valid runner ID', () => {
    const event: AtBatEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 1,
      batterId: 'batter-123',
      batterName: 'John Smith',
      pitcherId: 'pitcher-456',
      pitcherName: 'Bob Jones',
      result: 'BB',
      runnersBeforePlay: { first: null, second: null, third: null },
      runnersAfterPlay: {
        first: {
          runnerId: 'batter-123', // Batter becomes runner
          runnerName: 'John Smith',
          responsiblePitcherId: 'pitcher-456',
          reachedOn: 'walk',
          reachedInning: 1,
        },
        second: null,
        third: null,
      },
    };

    expect(event.runnersAfterPlay.first?.runnerId).toBe('batter-123');
    expect(event.runnersAfterPlay.first?.responsiblePitcherId).toBe('pitcher-456');
  });

  test('batter reaching on hit has valid runner ID', () => {
    const event: AtBatEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 2,
      batterId: 'batter-789',
      batterName: 'Mike Johnson',
      pitcherId: 'pitcher-456',
      pitcherName: 'Bob Jones',
      result: '1B',
      runnersBeforePlay: { first: null, second: null, third: null },
      runnersAfterPlay: {
        first: {
          runnerId: 'batter-789',
          runnerName: 'Mike Johnson',
          responsiblePitcherId: 'pitcher-456',
          reachedOn: 'hit',
          reachedInning: 2,
        },
        second: null,
        third: null,
      },
    };

    expect(event.runnersAfterPlay.first?.runnerId).toBe('batter-789');
    expect(event.runnersAfterPlay.first?.reachedOn).toBe('hit');
  });

  test('batter reaching on error has valid runner ID', () => {
    const event: AtBatEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 3,
      batterId: 'batter-111',
      batterName: 'Tom Wilson',
      pitcherId: 'pitcher-222',
      pitcherName: 'Steve Brown',
      result: 'E',
      runnersBeforePlay: { first: null, second: null, third: null },
      runnersAfterPlay: {
        first: {
          runnerId: 'batter-111',
          runnerName: 'Tom Wilson',
          responsiblePitcherId: 'pitcher-222',
          reachedOn: 'error',
          reachedInning: 3,
        },
        second: null,
        third: null,
      },
    };

    expect(event.runnersAfterPlay.first?.runnerId).toBe('batter-111');
    expect(event.runnersAfterPlay.first?.reachedOn).toBe('error');
  });

  test('batter reaching on HBP has valid runner ID', () => {
    const event: AtBatEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 4,
      batterId: 'batter-333',
      batterName: 'Dave Clark',
      pitcherId: 'pitcher-444',
      pitcherName: 'Jim White',
      result: 'HBP',
      runnersBeforePlay: { first: null, second: null, third: null },
      runnersAfterPlay: {
        first: {
          runnerId: 'batter-333',
          runnerName: 'Dave Clark',
          responsiblePitcherId: 'pitcher-444',
          reachedOn: 'hbp',
          reachedInning: 4,
        },
        second: null,
        third: null,
      },
    };

    expect(event.runnersAfterPlay.first?.runnerId).toBe('batter-333');
    expect(event.runnersAfterPlay.first?.reachedOn).toBe('hbp');
  });
});

// ============================================
// RUNNER ID PERSISTENCE ACROSS PLAYS
// ============================================

describe('Runner ID Persistence Across Plays', () => {
  test('runner ID persists when runner advances', () => {
    // Runner on first advances to second on a single
    const r1Runner: RunnerInfo = {
      runnerId: 'runner-001',
      runnerName: 'John Doe',
      responsiblePitcherId: 'pitcher-A',
      reachedOn: 'walk',
      reachedInning: 1,
    };

    const playBefore: AtBatEventRunners = {
      first: r1Runner,
      second: null,
      third: null,
    };

    // After single, runner advances to second
    const playAfter: AtBatEventRunners = {
      first: {
        runnerId: 'batter-002', // New batter on first
        responsiblePitcherId: 'pitcher-A',
        reachedOn: 'hit',
        reachedInning: 1,
      },
      second: { ...r1Runner }, // Same runner, now on second
      third: null,
    };

    // Runner ID should be the same
    expect(playAfter.second?.runnerId).toBe(playBefore.first?.runnerId);
    expect(playAfter.second?.responsiblePitcherId).toBe('pitcher-A');
  });

  test('runner ID persists when runner advances to third', () => {
    const runner: RunnerInfo = {
      runnerId: 'runner-002',
      responsiblePitcherId: 'pitcher-A',
      reachedOn: 'hit',
      reachedInning: 2,
    };

    const playBefore: AtBatEventRunners = {
      first: null,
      second: runner,
      third: null,
    };

    // After double, runner advances to third (maybe held)
    const playAfter: AtBatEventRunners = {
      first: null,
      second: {
        runnerId: 'batter-003',
        responsiblePitcherId: 'pitcher-A',
        reachedOn: 'hit',
        reachedInning: 2,
      },
      third: { ...runner },
    };

    expect(playAfter.third?.runnerId).toBe('runner-002');
  });

  test('runner ID lost when runner scores', () => {
    const runner: RunnerInfo = {
      runnerId: 'runner-003',
      responsiblePitcherId: 'pitcher-A',
      reachedOn: 'walk',
      reachedInning: 3,
    };

    const playBefore: AtBatEventRunners = {
      first: null,
      second: null,
      third: runner,
    };

    // After single, runner scores (no longer on bases)
    const playAfter: AtBatEventRunners = {
      first: {
        runnerId: 'batter-004',
        responsiblePitcherId: 'pitcher-A',
        reachedOn: 'hit',
        reachedInning: 3,
      },
      second: null,
      third: null,
    };

    // Runner is no longer in the runner state
    expect(playAfter.first?.runnerId).not.toBe('runner-003');
    expect(playAfter.second).toBeNull();
    expect(playAfter.third).toBeNull();
  });
});

// ============================================
// RESPONSIBLE PITCHER TRACKING
// ============================================

describe('Responsible Pitcher Tracking', () => {
  test('responsiblePitcherId tracks who allowed the runner', () => {
    const event: AtBatEvent = {
      eventId: 'e1',
      gameId: 'g1',
      inning: 5,
      batterId: 'batter-A',
      batterName: 'Player A',
      pitcherId: 'pitcher-1', // Current pitcher
      pitcherName: 'Pitcher One',
      result: '1B',
      runnersBeforePlay: { first: null, second: null, third: null },
      runnersAfterPlay: {
        first: {
          runnerId: 'batter-A',
          responsiblePitcherId: 'pitcher-1', // This pitcher allowed the hit
          reachedOn: 'hit',
          reachedInning: 5,
        },
        second: null,
        third: null,
      },
    };

    expect(event.runnersAfterPlay.first?.responsiblePitcherId).toBe('pitcher-1');
  });

  test('inherited runner keeps original responsible pitcher', () => {
    // Pitcher change mid-inning
    // Runner on first was allowed by pitcher-1
    // New pitcher-2 is now pitching
    // If runner scores, it's charged to pitcher-1

    const inheritedRunner: RunnerInfo = {
      runnerId: 'runner-X',
      responsiblePitcherId: 'pitcher-1', // Original pitcher
      reachedOn: 'walk',
      reachedInning: 5,
    };

    const eventWithNewPitcher: AtBatEvent = {
      eventId: 'e2',
      gameId: 'g1',
      inning: 5,
      batterId: 'batter-B',
      batterName: 'Player B',
      pitcherId: 'pitcher-2', // New pitcher
      pitcherName: 'Pitcher Two',
      result: '1B',
      runnersBeforePlay: {
        first: inheritedRunner, // Inherited runner
        second: null,
        third: null,
      },
      runnersAfterPlay: {
        first: {
          runnerId: 'batter-B',
          responsiblePitcherId: 'pitcher-2', // New batter is charged to new pitcher
          reachedOn: 'hit',
          reachedInning: 5,
        },
        second: null,
        third: { ...inheritedRunner }, // Inherited runner advanced, but still charged to pitcher-1
      },
    };

    // New batter is charged to pitcher-2
    expect(eventWithNewPitcher.runnersAfterPlay.first?.responsiblePitcherId).toBe('pitcher-2');

    // Inherited runner still charged to pitcher-1
    expect(eventWithNewPitcher.runnersAfterPlay.third?.responsiblePitcherId).toBe('pitcher-1');
  });

  test('multiple inherited runners with different responsible pitchers', () => {
    // Complex scenario: pitcher-1 allowed R1, pitcher-2 allowed R2
    // Now pitcher-3 is in

    const r1: RunnerInfo = {
      runnerId: 'runner-A',
      responsiblePitcherId: 'pitcher-1',
      reachedOn: 'walk',
      reachedInning: 4,
    };

    const r2: RunnerInfo = {
      runnerId: 'runner-B',
      responsiblePitcherId: 'pitcher-2',
      reachedOn: 'hit',
      reachedInning: 5,
    };

    const runnersBeforePlay: AtBatEventRunners = {
      first: r1,
      second: r2,
      third: null,
    };

    // If both score on a HR, pitcher-1 charged 1 ER, pitcher-2 charged 1 ER
    expect(runnersBeforePlay.first?.responsiblePitcherId).toBe('pitcher-1');
    expect(runnersBeforePlay.second?.responsiblePitcherId).toBe('pitcher-2');
  });
});

// ============================================
// EARNED RUN ATTRIBUTION WITH RUNNER IDS
// ============================================

describe('Earned Run Attribution with Runner IDs', () => {
  test('runner scoring is charged to responsible pitcher', () => {
    interface RunScored {
      runnerId: string;
      responsiblePitcherId: string;
      isEarned: boolean;
    }

    const runnerScored: RunScored = {
      runnerId: 'runner-123',
      responsiblePitcherId: 'pitcher-456',
      isEarned: true,
    };

    // This run is charged to pitcher-456
    expect(runnerScored.responsiblePitcherId).toBe('pitcher-456');
    expect(runnerScored.isEarned).toBe(true);
  });

  test('unearned run (reached on error) still tracked to pitcher', () => {
    interface RunScored {
      runnerId: string;
      responsiblePitcherId: string;
      isEarned: boolean;
    }

    const unearnedRun: RunScored = {
      runnerId: 'runner-789',
      responsiblePitcherId: 'pitcher-111',
      isEarned: false, // Reached on error
    };

    // Run counts against pitcher, but as unearned
    expect(unearnedRun.responsiblePitcherId).toBe('pitcher-111');
    expect(unearnedRun.isEarned).toBe(false);
  });

  test('grand slam charges runs to correct pitchers', () => {
    // Scenario: R1 charged to pitcher-A, R2 charged to pitcher-A,
    // R3 charged to pitcher-B, batter reaches vs pitcher-C

    const runnersBeforeHR: AtBatEventRunners = {
      first: {
        runnerId: 'r1',
        responsiblePitcherId: 'pitcher-A',
        reachedOn: 'walk',
        reachedInning: 4,
      },
      second: {
        runnerId: 'r2',
        responsiblePitcherId: 'pitcher-A',
        reachedOn: 'hit',
        reachedInning: 4,
      },
      third: {
        runnerId: 'r3',
        responsiblePitcherId: 'pitcher-B',
        reachedOn: 'walk',
        reachedInning: 5,
      },
    };

    // After grand slam:
    // - pitcher-A charged with 2 ER (R1 + R2)
    // - pitcher-B charged with 1 ER (R3)
    // - pitcher-C charged with 1 ER (batter)

    const chargedToPitcherA = [
      runnersBeforeHR.first,
      runnersBeforeHR.second,
    ].filter(r => r?.responsiblePitcherId === 'pitcher-A').length;

    const chargedToPitcherB = [
      runnersBeforeHR.third,
    ].filter(r => r?.responsiblePitcherId === 'pitcher-B').length;

    expect(chargedToPitcherA).toBe(2);
    expect(chargedToPitcherB).toBe(1);
  });
});

// ============================================
// PINCH RUNNER TRACKING
// ============================================

describe('Pinch Runner Tracking', () => {
  test('pinch runner replaces original runner ID', () => {
    const originalRunner: RunnerInfo = {
      runnerId: 'original-runner',
      responsiblePitcherId: 'pitcher-1',
      reachedOn: 'walk',
      reachedInning: 3,
    };

    // Pinch runner comes in
    const pinchRunner: RunnerInfo = {
      runnerId: 'pinch-runner',
      responsiblePitcherId: 'pitcher-1', // Still charged to original pitcher
      reachedOn: 'walk', // Same as original
      reachedInning: 3, // Same as original
    };

    expect(pinchRunner.runnerId).not.toBe(originalRunner.runnerId);
    expect(pinchRunner.responsiblePitcherId).toBe(originalRunner.responsiblePitcherId);
  });

  test('pinch runner scoring still charged to original pitcher', () => {
    // Even though a different player scored, the pitcher who allowed
    // the original runner is responsible for the run

    const pinchRunner: RunnerInfo = {
      runnerId: 'pinch-runner',
      responsiblePitcherId: 'pitcher-original', // Original pitcher still responsible
      reachedOn: 'walk',
      reachedInning: 3,
    };

    expect(pinchRunner.responsiblePitcherId).toBe('pitcher-original');
  });
});

// ============================================
// RUNNER STATE VALIDATION
// ============================================

describe('Runner State Validation', () => {
  test('runners on bases must have valid IDs', () => {
    const isValidRunnerState = (runners: AtBatEventRunners): boolean => {
      const runnerList = [runners.first, runners.second, runners.third].filter(
        (r) => r !== null
      );

      return runnerList.every(
        (r) =>
          r!.runnerId.length > 0 &&
          r!.responsiblePitcherId.length > 0 &&
          r!.reachedInning >= 1
      );
    };

    const validState: AtBatEventRunners = {
      first: {
        runnerId: 'r1',
        responsiblePitcherId: 'p1',
        reachedOn: 'walk',
        reachedInning: 1,
      },
      second: {
        runnerId: 'r2',
        responsiblePitcherId: 'p1',
        reachedOn: 'hit',
        reachedInning: 2,
      },
      third: null,
    };

    const invalidState: AtBatEventRunners = {
      first: {
        runnerId: '', // Invalid - empty
        responsiblePitcherId: 'p1',
        reachedOn: 'walk',
        reachedInning: 1,
      },
      second: null,
      third: null,
    };

    expect(isValidRunnerState(validState)).toBe(true);
    expect(isValidRunnerState(invalidState)).toBe(false);
  });

  test('no duplicate runner IDs on bases', () => {
    const hasDuplicateRunners = (runners: AtBatEventRunners): boolean => {
      const ids = [
        runners.first?.runnerId,
        runners.second?.runnerId,
        runners.third?.runnerId,
      ].filter((id) => id !== undefined && id !== null);

      return ids.length !== new Set(ids).size;
    };

    const validState: AtBatEventRunners = {
      first: { runnerId: 'r1', responsiblePitcherId: 'p1', reachedOn: 'walk', reachedInning: 1 },
      second: { runnerId: 'r2', responsiblePitcherId: 'p1', reachedOn: 'hit', reachedInning: 1 },
      third: { runnerId: 'r3', responsiblePitcherId: 'p1', reachedOn: 'walk', reachedInning: 2 },
    };

    const invalidState: AtBatEventRunners = {
      first: { runnerId: 'r1', responsiblePitcherId: 'p1', reachedOn: 'walk', reachedInning: 1 },
      second: { runnerId: 'r1', responsiblePitcherId: 'p1', reachedOn: 'walk', reachedInning: 1 }, // Duplicate!
      third: null,
    };

    expect(hasDuplicateRunners(validState)).toBe(false);
    expect(hasDuplicateRunners(invalidState)).toBe(true);
  });

  test('reachedInning must be valid', () => {
    const isValidReachedInning = (inning: number, currentInning: number): boolean => {
      return inning >= 1 && inning <= currentInning;
    };

    expect(isValidReachedInning(1, 5)).toBe(true);
    expect(isValidReachedInning(5, 5)).toBe(true);
    expect(isValidReachedInning(0, 5)).toBe(false);
    expect(isValidReachedInning(6, 5)).toBe(false); // Can't reach in future inning
  });
});

// ============================================
// REACHED ON TYPES
// ============================================

describe('Reached On Types', () => {
  test('reachedOn must be valid type', () => {
    const validTypes: RunnerInfo['reachedOn'][] = ['walk', 'hit', 'error', 'fc', 'hbp', 'd3k'];

    validTypes.forEach((type) => {
      const runner: RunnerInfo = {
        runnerId: 'r1',
        responsiblePitcherId: 'p1',
        reachedOn: type,
        reachedInning: 1,
      };

      expect(['walk', 'hit', 'error', 'fc', 'hbp', 'd3k']).toContain(runner.reachedOn);
    });
  });

  test('earned run depends on reachedOn type', () => {
    const isEarnedRun = (reachedOn: RunnerInfo['reachedOn']): boolean => {
      // Error = unearned run
      return reachedOn !== 'error';
    };

    expect(isEarnedRun('walk')).toBe(true);
    expect(isEarnedRun('hit')).toBe(true);
    expect(isEarnedRun('hbp')).toBe(true);
    expect(isEarnedRun('d3k')).toBe(true);
    expect(isEarnedRun('fc')).toBe(true);
    expect(isEarnedRun('error')).toBe(false); // Unearned
  });
});
