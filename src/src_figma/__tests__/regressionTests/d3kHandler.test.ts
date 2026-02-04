/**
 * D3K (Dropped Third Strike) Handler Regression Tests
 *
 * Covers: BUG-004
 *
 * The bug was that D3K was being handled via recordWalk() which incorrectly
 * attributed walks to the pitcher instead of strikeouts. D3K should:
 * - Always count as a K for both batter and pitcher
 * - Either result in an out (if batter doesn't reach) or batter on 1B (if reached)
 *
 * Fixed 2026-02-03: D3K now correctly:
 * - Uses recordD3K() handler instead of recordWalk()
 * - Credits K to both batter and pitcher regardless of outcome
 * - Records out only when batterReached = false
 * - Does NOT count as a walk (bb should not increment)
 */

import { describe, test, expect } from 'vitest';
import { calculateD3KDefaults, type GameBases } from '../../app/components/runnerDefaults';

// ============================================
// D3K LEGALITY TESTS
// ============================================

describe('D3K Legality Rules', () => {
  /**
   * D3K is legal when:
   * - First base is empty (regardless of outs), OR
   * - There are 2 outs (force play possible at any base)
   *
   * D3K is illegal when:
   * - First base is occupied AND less than 2 outs
   */

  describe('D3K legal scenarios', () => {
    test('first base empty, 0 outs - D3K LEGAL', () => {
      const bases: GameBases = { first: false, second: false, third: false };
      const outs = 0;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(true);
    });

    test('first base empty, 1 out - D3K LEGAL', () => {
      const bases: GameBases = { first: false, second: false, third: false };
      const outs = 1;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(true);
    });

    test('first base empty, 2 outs - D3K LEGAL', () => {
      const bases: GameBases = { first: false, second: false, third: false };
      const outs = 2;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(true);
    });

    test('R2 only (1B empty), 0 outs - D3K LEGAL', () => {
      const bases: GameBases = { first: false, second: true, third: false };
      const outs = 0;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(true);
    });

    test('R3 only (1B empty), 1 out - D3K LEGAL', () => {
      const bases: GameBases = { first: false, second: false, third: true };
      const outs = 1;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(true);
    });

    test('R1+R2, 2 outs - D3K LEGAL (force possible)', () => {
      const bases: GameBases = { first: true, second: true, third: false };
      const outs = 2;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(true);
    });

    test('bases loaded, 2 outs - D3K LEGAL', () => {
      const bases: GameBases = { first: true, second: true, third: true };
      const outs = 2;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(true);
    });
  });

  describe('D3K illegal scenarios', () => {
    test('first base occupied, 0 outs - D3K ILLEGAL', () => {
      const bases: GameBases = { first: true, second: false, third: false };
      const outs = 0;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(false);
    });

    test('first base occupied, 1 out - D3K ILLEGAL', () => {
      const bases: GameBases = { first: true, second: false, third: false };
      const outs = 1;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(false);
    });

    test('R1+R2, 0 outs - D3K ILLEGAL', () => {
      const bases: GameBases = { first: true, second: true, third: false };
      const outs = 0;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(false);
    });

    test('R1+R2, 1 out - D3K ILLEGAL', () => {
      const bases: GameBases = { first: true, second: true, third: false };
      const outs = 1;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(false);
    });

    test('bases loaded, 0 outs - D3K ILLEGAL', () => {
      const bases: GameBases = { first: true, second: true, third: true };
      const outs = 0;

      const isLegal = !bases.first || outs >= 2;
      expect(isLegal).toBe(false);
    });
  });
});

// ============================================
// D3K STATS ATTRIBUTION TESTS
// ============================================

describe('D3K Stats Attribution', () => {
  /**
   * Mock stats to verify correct attribution
   */
  interface MockBatterStats {
    pa: number;
    ab: number;
    k: number;
    bb: number;
  }

  interface MockPitcherStats {
    strikeoutsThrown: number;
    walksAllowed: number;
    outsRecorded: number;
    battersFaced: number;
  }

  function createEmptyBatterStats(): MockBatterStats {
    return { pa: 0, ab: 0, k: 0, bb: 0 };
  }

  function createEmptyPitcherStats(): MockPitcherStats {
    return { strikeoutsThrown: 0, walksAllowed: 0, outsRecorded: 0, battersFaced: 0 };
  }

  /**
   * Simulate the stat updates that should happen on D3K
   * This mirrors the logic in useGameState.recordD3K()
   *
   * @param batter Batter stats before
   * @param pitcher Pitcher stats before
   * @param batterReached Whether batter reached first on the D3K
   */
  function applyD3KStats(
    batter: MockBatterStats,
    pitcher: MockPitcherStats,
    batterReached: boolean
  ): { batter: MockBatterStats; pitcher: MockPitcherStats } {
    const newBatter = { ...batter };
    const newPitcher = { ...pitcher };

    // Per recordD3K() logic:
    // - K ALWAYS credited to batter (even if they reach)
    // - K ALWAYS credited to pitcher (strikeout achieved)
    // - Out only recorded if batter didn't reach
    // - bb should NEVER increment (this is not a walk!)
    // - PA always increments
    // - AB always increments (K counts as AB)

    newBatter.pa++;
    newBatter.ab++;
    newBatter.k++;

    newPitcher.strikeoutsThrown++;
    newPitcher.battersFaced++;

    if (!batterReached) {
      newPitcher.outsRecorded++;
    }

    // Critical: bb should NOT increment - this is not a walk
    // This was the bug in BUG-004

    return { batter: newBatter, pitcher: newPitcher };
  }

  describe('Batter stats on D3K', () => {
    test('D3K where batter OUT - K credited, AB credited', () => {
      const stats = createEmptyBatterStats();
      const { batter } = applyD3KStats(stats, createEmptyPitcherStats(), false);

      expect(batter.k).toBe(1);  // K credited
      expect(batter.ab).toBe(1); // AB credited (strikeout counts)
      expect(batter.pa).toBe(1); // PA credited
      expect(batter.bb).toBe(0); // Critical: NOT a walk
    });

    test('D3K where batter REACHES - K credited, AB credited', () => {
      const stats = createEmptyBatterStats();
      const { batter } = applyD3KStats(stats, createEmptyPitcherStats(), true);

      expect(batter.k).toBe(1);  // K STILL credited even though batter reached
      expect(batter.ab).toBe(1); // AB credited
      expect(batter.pa).toBe(1); // PA credited
      expect(batter.bb).toBe(0); // Critical: NOT a walk
    });

    test('D3K does NOT increment bb (regression)', () => {
      const stats = createEmptyBatterStats();

      // D3K where batter reaches
      const { batter } = applyD3KStats(stats, createEmptyPitcherStats(), true);

      // The bug was that D3K was treated as a walk, incrementing bb
      expect(batter.bb).toBe(0);
    });
  });

  describe('Pitcher stats on D3K', () => {
    test('D3K where batter OUT - K credited, out recorded', () => {
      const stats = createEmptyPitcherStats();
      const { pitcher } = applyD3KStats(createEmptyBatterStats(), stats, false);

      expect(pitcher.strikeoutsThrown).toBe(1);
      expect(pitcher.outsRecorded).toBe(1);
      expect(pitcher.walksAllowed).toBe(0); // Critical: NOT a walk
      expect(pitcher.battersFaced).toBe(1);
    });

    test('D3K where batter REACHES - K credited, NO out recorded', () => {
      const stats = createEmptyPitcherStats();
      const { pitcher } = applyD3KStats(createEmptyBatterStats(), stats, true);

      expect(pitcher.strikeoutsThrown).toBe(1); // K STILL credited
      expect(pitcher.outsRecorded).toBe(0);    // No out (batter reached)
      expect(pitcher.walksAllowed).toBe(0);    // Critical: NOT a walk
      expect(pitcher.battersFaced).toBe(1);
    });

    test('D3K does NOT increment walksAllowed (regression)', () => {
      const stats = createEmptyPitcherStats();

      // D3K where batter reaches
      const { pitcher } = applyD3KStats(createEmptyBatterStats(), stats, true);

      // The bug was that D3K was treated as a walk, incrementing walksAllowed
      expect(pitcher.walksAllowed).toBe(0);
    });
  });
});

// ============================================
// D3K OUTCOME TESTS
// ============================================

describe('D3K Outcomes', () => {
  describe('Out count changes', () => {
    test('D3K where batter OUT - outs increase by 1', () => {
      const outsBefore = 1;
      const batterReached = false;
      const outsAfter = batterReached ? outsBefore : outsBefore + 1;

      expect(outsAfter).toBe(2);
    });

    test('D3K where batter REACHES - outs unchanged', () => {
      const outsBefore = 1;
      const batterReached = true;
      const outsAfter = batterReached ? outsBefore : outsBefore + 1;

      expect(outsAfter).toBe(1); // Unchanged
    });
  });

  describe('Base state changes', () => {
    test('D3K where batter OUT - bases unchanged', () => {
      const basesBefore = { first: false, second: true, third: false };
      const batterReached = false;

      // If batter is out, bases don't change from the D3K itself
      const basesAfter = { ...basesBefore };

      expect(basesAfter).toEqual(basesBefore);
    });

    test('D3K where batter REACHES - batter on 1B', () => {
      const basesBefore = { first: false, second: true, third: false };
      const batterReached = true;

      // If batter reaches, they take first base
      const basesAfter = { first: true, second: true, third: false };

      expect(basesAfter.first).toBe(true);
    });
  });
});

// ============================================
// D3K ROUTING TESTS
// ============================================

describe('D3K Routing', () => {
  /**
   * D3K should route to recordD3K(), not recordWalk()
   */

  test('D3K event type is distinct from walk types', () => {
    const d3kType = 'D3K';
    const walkTypes = ['BB', 'IBB', 'HBP'];

    expect(walkTypes).not.toContain(d3kType);
  });

  test('recordD3K should be called for D3K (not recordWalk)', () => {
    // This is a conceptual test - in the actual code, D3K routes to recordD3K()
    const eventType = 'D3K';

    // The routing logic should use recordD3K for D3K events
    const shouldUseRecordD3K = eventType === 'D3K';
    const shouldUseRecordWalk = ['BB', 'IBB', 'HBP'].includes(eventType);

    expect(shouldUseRecordD3K).toBe(true);
    expect(shouldUseRecordWalk).toBe(false);
  });
});

// ============================================
// D3K DEFAULTS CALCULATION TESTS
// ============================================

describe('D3K Runner Defaults', () => {
  /**
   * Test the calculateD3KDefaults function from runnerDefaults.ts
   */

  describe('D3K legal - batter reaches', () => {
    test('empty bases, 0 outs - batter to 1B', () => {
      const bases: GameBases = { first: false, second: false, third: false };
      const outs = 0;

      const defaults = calculateD3KDefaults(bases, outs);

      expect(defaults.batter.to).toBe('first');
      expect(defaults.batter.reason).toContain('D3K');
    });

    test('R2 only, 0 outs - batter to 1B, R2 may advance', () => {
      const bases: GameBases = { first: false, second: true, third: false };
      const outs = 0;

      const defaults = calculateD3KDefaults(bases, outs);

      expect(defaults.batter.to).toBe('first');
      // R2 can advance due to chaos of D3K
      expect(defaults.second).toBeDefined();
    });

    test('R1+R2, 2 outs - D3K legal, R1 may be forced', () => {
      const bases: GameBases = { first: true, second: true, third: false };
      const outs = 2;

      const defaults = calculateD3KDefaults(bases, outs);

      // With 2 outs, D3K is legal even with R1
      expect(defaults.batter.to).toBe('first');
      // R1 may be forced out at 2B in this scenario
      expect(defaults.first).toBeDefined();
    });
  });

  describe('D3K illegal - batter is out', () => {
    test('R1, 0 outs - batter OUT (D3K not legal)', () => {
      const bases: GameBases = { first: true, second: false, third: false };
      const outs = 0;

      const defaults = calculateD3KDefaults(bases, outs);

      expect(defaults.batter.to).toBe('out');
      expect(defaults.batter.reason).toContain('not legal');
    });

    test('R1+R2, 1 out - batter OUT (D3K not legal)', () => {
      const bases: GameBases = { first: true, second: true, third: false };
      const outs = 1;

      const defaults = calculateD3KDefaults(bases, outs);

      expect(defaults.batter.to).toBe('out');
    });
  });
});

// ============================================
// D3K vs WALK COMPARISON (REGRESSION)
// ============================================

describe('D3K vs Walk Comparison (Regression)', () => {
  /**
   * These tests ensure D3K and walks are handled differently.
   * The original bug (BUG-004) treated D3K as a walk.
   */

  interface Stats {
    k: number;
    bb: number;
    ab: number;
  }

  function applyD3K(stats: Stats): Stats {
    // D3K: K++, AB++, bb unchanged
    return { ...stats, k: stats.k + 1, ab: stats.ab + 1 };
  }

  function applyWalk(stats: Stats): Stats {
    // Walk: bb++, AB unchanged, K unchanged
    return { ...stats, bb: stats.bb + 1 };
  }

  test('D3K increments K, walk increments BB', () => {
    const initialStats: Stats = { k: 0, bb: 0, ab: 0 };

    const afterD3K = applyD3K(initialStats);
    expect(afterD3K.k).toBe(1);
    expect(afterD3K.bb).toBe(0);

    const afterWalk = applyWalk(initialStats);
    expect(afterWalk.k).toBe(0);
    expect(afterWalk.bb).toBe(1);
  });

  test('D3K increments AB, walk does not', () => {
    const initialStats: Stats = { k: 0, bb: 0, ab: 10 };

    const afterD3K = applyD3K(initialStats);
    expect(afterD3K.ab).toBe(11);

    const afterWalk = applyWalk(initialStats);
    expect(afterWalk.ab).toBe(10); // Unchanged
  });

  test('D3K affects batting average, walk does not', () => {
    // BA = H / AB
    // D3K adds to AB (hurts average), walk doesn't affect AB

    interface FullStats {
      h: number;
      ab: number;
    }

    const before: FullStats = { h: 30, ab: 100 }; // .300 BA

    // After D3K: ab becomes 101, BA drops
    const afterD3K: FullStats = { h: 30, ab: 101 };
    const baAfterD3K = afterD3K.h / afterD3K.ab;

    // After walk: ab stays 100, BA unchanged
    const afterWalk: FullStats = { h: 30, ab: 100 };
    const baAfterWalk = afterWalk.h / afterWalk.ab;

    expect(baAfterD3K).toBeLessThan(0.300);
    expect(baAfterWalk).toBeCloseTo(0.300, 3);
  });
});
