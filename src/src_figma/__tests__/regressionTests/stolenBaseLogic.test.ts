/**
 * Stolen Base Logic Regression Tests
 *
 * Covers: BUG-006
 *
 * The bug was that SB was advancing the LEAD runner instead of the TRAILING runner.
 * In baseball, the trailing runner steals (e.g., R1 steals 2B while R2 holds).
 *
 * Fixed 2026-02-03: SB now correctly:
 * - Defaults to advancing the trailing runner
 * - Shows runner outcome modal for user to confirm/adjust
 * - Does not make any runner disappear
 */

import { describe, test, expect } from 'vitest';
import {
  calculateStolenBaseDefaults,
  type GameBases,
  type RunnerEventType,
} from '../../app/components/runnerDefaults';

// ============================================
// SB RUNNER SELECTION TESTS (TRAILING RUNNER PRIORITY)
// ============================================

describe('SB Runner Selection (Trailing Runner Priority)', () => {
  /**
   * In baseball, the trailing runner (closest to home plate) typically steals.
   * If R1 and R2 are on base, R1 steals 2B (trailing), R2 holds at 3B.
   * The lead runner would only advance if both attempt a double steal.
   */

  describe('Single runner scenarios', () => {
    test('R1 only + SB - R1 advances to 2B', () => {
      const bases: GameBases = { first: true, second: false, third: false };
      const defaults = calculateStolenBaseDefaults('SB', bases);

      expect(defaults.first).toBeDefined();
      expect(defaults.first?.to).toBe('second');
      expect(defaults.first?.reason).toContain('Stolen base');
    });

    test('R2 only + SB - R2 advances to 3B', () => {
      const bases: GameBases = { first: false, second: true, third: false };
      const defaults = calculateStolenBaseDefaults('SB', bases);

      expect(defaults.second).toBeDefined();
      expect(defaults.second?.to).toBe('third');
      expect(defaults.second?.reason).toContain('Stolen base');
    });

    test('R3 only + SB - R3 advances to home (steal of home)', () => {
      const bases: GameBases = { first: false, second: false, third: true };
      const defaults = calculateStolenBaseDefaults('SB', bases);

      expect(defaults.third).toBeDefined();
      expect(defaults.third?.to).toBe('home');
      expect(defaults.third?.reason).toContain('Stolen base');
    });
  });

  describe('Multiple runner scenarios - trailing runner priority', () => {
    test('R1+R2 + SB - R1 advances (trailing), R2 holds', () => {
      const bases: GameBases = { first: true, second: true, third: false };
      const defaults = calculateStolenBaseDefaults('SB', bases);

      // R1 is trailing - should advance
      expect(defaults.first).toBeDefined();
      expect(defaults.first?.to).toBe('second');

      // R2 is leading - should hold by default
      // The modal will let user adjust if they want a double steal
      expect(defaults.second).toBeDefined();
      expect(defaults.second?.to).toBe('second'); // Holds
    });

    test('R1+R3 + SB - R1 advances (trailing), R3 holds (NOT steal of home)', () => {
      const bases: GameBases = { first: true, second: false, third: true };
      const defaults = calculateStolenBaseDefaults('SB', bases);

      // R1 is trailing - should advance
      expect(defaults.first).toBeDefined();
      expect(defaults.first?.to).toBe('second');

      // R3 should NOT automatically steal home - that's extremely rare
      expect(defaults.third).toBeDefined();
      expect(defaults.third?.to).toBe('third'); // Holds
    });

    test('R2+R3 + SB - R2 advances (trailing), R3 holds', () => {
      const bases: GameBases = { first: false, second: true, third: true };
      const defaults = calculateStolenBaseDefaults('SB', bases);

      // R2 is trailing - should advance
      expect(defaults.second).toBeDefined();
      expect(defaults.second?.to).toBe('third');

      // R3 should hold by default
      expect(defaults.third).toBeDefined();
      expect(defaults.third?.to).toBe('third'); // Holds
    });

    test('R1+R2+R3 + SB - R1 advances (trailing), others hold', () => {
      const bases: GameBases = { first: true, second: true, third: true };
      const defaults = calculateStolenBaseDefaults('SB', bases);

      // R1 is trailing - should advance
      expect(defaults.first).toBeDefined();
      expect(defaults.first?.to).toBe('second');

      // R2 holds (would need triple steal for all to move)
      expect(defaults.second).toBeDefined();
      expect(defaults.second?.to).toBe('second');

      // R3 holds
      expect(defaults.third).toBeDefined();
      expect(defaults.third?.to).toBe('third');
    });
  });

  describe('Bug regression: Lead runner should NOT auto-advance', () => {
    test('R1+R2 + SB - R2 does NOT advance to 3B automatically', () => {
      const bases: GameBases = { first: true, second: true, third: false };
      const defaults = calculateStolenBaseDefaults('SB', bases);

      // The bug was R2 (lead) advancing instead of R1 (trailing)
      // R2 should hold by default
      expect(defaults.second?.to).not.toBe('third');
      expect(defaults.second?.to).toBe('second');
    });

    test('R1+R3 + SB - R3 does NOT score automatically', () => {
      const bases: GameBases = { first: true, second: false, third: true };
      const defaults = calculateStolenBaseDefaults('SB', bases);

      // R3 should NOT steal home just because R1 is stealing
      expect(defaults.third?.to).not.toBe('home');
      expect(defaults.third?.to).toBe('third');
    });
  });
});

// ============================================
// CS (CAUGHT STEALING) TESTS
// ============================================

describe('CS Runner Selection', () => {
  /**
   * Caught stealing should affect the trailing runner by default
   * (the one attempting to steal gets thrown out)
   */

  test('R1 only + CS - R1 is out', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const defaults = calculateStolenBaseDefaults('CS', bases);

    expect(defaults.first).toBeDefined();
    expect(defaults.first?.to).toBe('out');
    expect(defaults.first?.reason).toContain('Caught stealing');
  });

  test('R2 only + CS - R2 is out', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const defaults = calculateStolenBaseDefaults('CS', bases);

    expect(defaults.second).toBeDefined();
    expect(defaults.second?.to).toBe('out');
  });

  test('R1+R2 + CS - R1 is out (trailing), R2 holds', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const defaults = calculateStolenBaseDefaults('CS', bases);

    // R1 (trailing) was attempting to steal and got caught
    expect(defaults.first).toBeDefined();
    expect(defaults.first?.to).toBe('out');

    // R2 holds
    expect(defaults.second).toBeDefined();
    expect(defaults.second?.to).toBe('second');
  });
});

// ============================================
// PK (PICKOFF) TESTS
// ============================================

describe('PK Runner Selection', () => {
  /**
   * Pickoff should default to the trailing runner
   */

  test('R1 only + PK - R1 is out', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const defaults = calculateStolenBaseDefaults('PK', bases);

    expect(defaults.first).toBeDefined();
    expect(defaults.first?.to).toBe('out');
    expect(defaults.first?.reason).toContain('Picked off');
  });

  test('R2 only + PK - R2 is out', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const defaults = calculateStolenBaseDefaults('PK', bases);

    expect(defaults.second).toBeDefined();
    expect(defaults.second?.to).toBe('out');
  });

  test('R1+R2 + PK - R1 is out (trailing), R2 holds', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const defaults = calculateStolenBaseDefaults('PK', bases);

    // R1 (trailing) picked off
    expect(defaults.first).toBeDefined();
    expect(defaults.first?.to).toBe('out');

    // R2 holds
    expect(defaults.second).toBeDefined();
    expect(defaults.second?.to).toBe('second');
  });
});

// ============================================
// TBL (TOOTBLAN) TESTS
// ============================================

describe('TBL (TOOTBLAN) Runner Selection', () => {
  /**
   * TOOTBLAN (Thrown Out On The Basepaths Like A Nincompoop)
   * Should affect the trailing runner by default
   */

  test('R1 only + TBL - R1 is out', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const defaults = calculateStolenBaseDefaults('TBL', bases);

    expect(defaults.first).toBeDefined();
    expect(defaults.first?.to).toBe('out');
    expect(defaults.first?.reason).toContain('TOOTBLAN');
  });

  test('R2 only + TBL - R2 is out', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const defaults = calculateStolenBaseDefaults('TBL', bases);

    expect(defaults.second).toBeDefined();
    expect(defaults.second?.to).toBe('out');
  });
});

// ============================================
// NO RUNNER DISAPPEARANCE TESTS
// ============================================

describe('Runner Preservation (No Disappearing Runners)', () => {
  /**
   * A critical part of the BUG-006 fix was ensuring runners don't disappear.
   * All runners should be accounted for in the defaults.
   */

  test('SB with R1+R2 - both runners accounted for', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const defaults = calculateStolenBaseDefaults('SB', bases);

    // Both runners should be in the defaults
    expect(defaults.first).toBeDefined();
    expect(defaults.second).toBeDefined();

    // Batter field exists (required for modal display)
    expect(defaults.batter).toBeDefined();
  });

  test('SB with R1+R2+R3 - all runners accounted for', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const defaults = calculateStolenBaseDefaults('SB', bases);

    expect(defaults.first).toBeDefined();
    expect(defaults.second).toBeDefined();
    expect(defaults.third).toBeDefined();
  });

  test('CS with R1+R2 - both runners accounted for', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const defaults = calculateStolenBaseDefaults('CS', bases);

    // R1 is out, R2 holds - but both are present
    expect(defaults.first).toBeDefined();
    expect(defaults.second).toBeDefined();
  });

  test('empty bases - returns minimal defaults (no crash)', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const defaults = calculateStolenBaseDefaults('SB', bases);

    // Should not crash, returns batter placeholder
    expect(defaults.batter).toBeDefined();
    expect(defaults.first).toBeUndefined();
    expect(defaults.second).toBeUndefined();
    expect(defaults.third).toBeUndefined();
  });
});

// ============================================
// RUNNER EVENT TYPE TESTS
// ============================================

describe('Runner Event Types', () => {
  /**
   * Test that different event types produce correct outcomes
   */

  const bases: GameBases = { first: true, second: false, third: false };

  test('SB results in safe advance', () => {
    const defaults = calculateStolenBaseDefaults('SB', bases);
    expect(defaults.first?.to).toBe('second'); // Advances safely
  });

  test('CS results in out', () => {
    const defaults = calculateStolenBaseDefaults('CS', bases);
    expect(defaults.first?.to).toBe('out');
  });

  test('PK results in out', () => {
    const defaults = calculateStolenBaseDefaults('PK', bases);
    expect(defaults.first?.to).toBe('out');
  });

  test('TBL results in out', () => {
    const defaults = calculateStolenBaseDefaults('TBL', bases);
    expect(defaults.first?.to).toBe('out');
  });
});

// ============================================
// TARGET BASE CALCULATION TESTS
// ============================================

describe('Target Base Calculation', () => {
  /**
   * Verify correct target bases for each starting position
   */

  test('R1 stealing goes to 2B', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const defaults = calculateStolenBaseDefaults('SB', bases);

    expect(defaults.first?.from).toBe('first');
    expect(defaults.first?.to).toBe('second');
  });

  test('R2 stealing goes to 3B', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const defaults = calculateStolenBaseDefaults('SB', bases);

    expect(defaults.second?.from).toBe('second');
    expect(defaults.second?.to).toBe('third');
  });

  test('R3 stealing goes to home', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const defaults = calculateStolenBaseDefaults('SB', bases);

    expect(defaults.third?.from).toBe('third');
    expect(defaults.third?.to).toBe('home');
  });
});

// ============================================
// MODAL DISPLAY INTEGRATION TESTS
// ============================================

describe('Modal Display Integration', () => {
  /**
   * The fix shows a runner outcome modal so user can adjust outcomes.
   * These tests verify the defaults provide good starting points.
   */

  test('defaults are marked as changeable (isDefault: true)', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const defaults = calculateStolenBaseDefaults('SB', bases);

    // All runner outcomes should be adjustable by user
    expect(defaults.first?.isDefault).toBe(true);
    expect(defaults.second?.isDefault).toBe(true);
  });

  test('defaults include reason text for display', () => {
    const bases: GameBases = { first: true, second: false, third: false };

    const sbDefaults = calculateStolenBaseDefaults('SB', bases);
    expect(sbDefaults.first?.reason).toBeDefined();
    expect(sbDefaults.first?.reason?.length).toBeGreaterThan(0);

    const csDefaults = calculateStolenBaseDefaults('CS', bases);
    expect(csDefaults.first?.reason).toBeDefined();
    expect(csDefaults.first?.reason?.length).toBeGreaterThan(0);
  });
});
