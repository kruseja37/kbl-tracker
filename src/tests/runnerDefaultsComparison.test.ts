/**
 * runnerDefaults.ts Comparison Tests
 *
 * Tests that runnerDefaults.ts produces outcomes consistent with
 * the canonical baseball rules in baseballLogicTests.test.ts
 *
 * Note: runnerDefaults.ts uses a different interface (RunnerDefaults with 'to' field)
 * while canonical uses RunnerOutcome ('SCORED', 'TO_2B', etc.)
 * These tests verify the LOGIC matches even though the types differ.
 */

import { describe, it, expect } from 'vitest';

// Import runnerDefaults functions
import calculateRunnerDefaults, {
  calculateWalkDefaults,
  calculateD3KDefaults,
  type GameBases,
  type RunnerDefaults,
  type BaseId,
} from '../src_figma/app/components/runnerDefaults';

// Import canonical implementations for comparison
import {
  getDefaultRunnerOutcome as canonicalGetDefaultOutcome,
  isRunnerForced as canonicalIsRunnerForced,
  type RunnerOutcome as CanonicalOutcome,
  type Bases,
} from './baseballLogicTests.test';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert runnerDefaults.ts 'to' field to canonical RunnerOutcome
 */
function toCanonicalOutcome(to: BaseId, from: 'first' | 'second' | 'third'): CanonicalOutcome {
  if (to === 'home') return 'SCORED';
  if (to === 'out') {
    if (from === 'first') return 'OUT_2B';
    if (from === 'second') return 'OUT_3B';
    if (from === 'third') return 'OUT_HOME';
    return 'OUT_2B'; // Default
  }
  // Check if runner stays at same base (HELD) BEFORE checking for advances
  if (to === from) return 'HELD';
  if (to === 'first' && from === 'first') return 'HELD';
  if (to === 'second' && from === 'second') return 'HELD';
  if (to === 'third' && from === 'third') return 'HELD';
  // Now check for advances
  if (to === 'third') return 'TO_3B';
  if (to === 'second') return 'TO_2B';
  return 'HELD';
}

/**
 * Create PlayData for testing
 */
function createPlayData(type: 'hit' | 'hr' | 'out' | 'error', options?: {
  hitType?: '1B' | '2B' | '3B';
  outType?: 'K' | 'GO' | 'FO' | 'LO' | 'DP' | 'FC';
  fieldingSequence?: number[];
}) {
  return {
    type,
    hitType: options?.hitType,
    outType: options?.outType,
    fieldingSequence: options?.fieldingSequence ?? [],
  };
}

// ============================================
// TESTS
// ============================================

describe('runnerDefaults.ts - Hit Defaults', () => {
  describe('Singles (1B)', () => {
    it('R3 scores on 1B', () => {
      const bases = { first: false, second: false, third: true };
      const defaults = calculateRunnerDefaults(createPlayData('hit', { hitType: '1B' }), bases, 0);
      expect(defaults.third?.to).toBe('home');

      // Compare to canonical
      const canonical = canonicalGetDefaultOutcome('third', '1B', 0, bases);
      expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonical);
    });

    it('R2 to 3B on 1B', () => {
      const bases = { first: false, second: true, third: false };
      const defaults = calculateRunnerDefaults(createPlayData('hit', { hitType: '1B' }), bases, 0);
      expect(defaults.second?.to).toBe('third');

      const canonical = canonicalGetDefaultOutcome('second', '1B', 0, bases);
      expect(toCanonicalOutcome(defaults.second!.to, 'second')).toBe(canonical);
    });

    it('R1 to 2B on 1B', () => {
      const bases = { first: true, second: false, third: false };
      const defaults = calculateRunnerDefaults(createPlayData('hit', { hitType: '1B' }), bases, 0);
      expect(defaults.first?.to).toBe('second');

      const canonical = canonicalGetDefaultOutcome('first', '1B', 0, bases);
      expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonical);
    });
  });

  describe('Doubles (2B)', () => {
    it('R3 scores on 2B', () => {
      const bases = { first: false, second: false, third: true };
      const defaults = calculateRunnerDefaults(createPlayData('hit', { hitType: '2B' }), bases, 0);
      expect(defaults.third?.to).toBe('home');

      const canonical = canonicalGetDefaultOutcome('third', '2B', 0, bases);
      expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonical);
    });

    it('R2 scores on 2B', () => {
      const bases = { first: false, second: true, third: false };
      const defaults = calculateRunnerDefaults(createPlayData('hit', { hitType: '2B' }), bases, 0);
      expect(defaults.second?.to).toBe('home');

      const canonical = canonicalGetDefaultOutcome('second', '2B', 0, bases);
      expect(toCanonicalOutcome(defaults.second!.to, 'second')).toBe(canonical);
    });

    it('R1 to 3B on 2B', () => {
      const bases = { first: true, second: false, third: false };
      const defaults = calculateRunnerDefaults(createPlayData('hit', { hitType: '2B' }), bases, 0);
      expect(defaults.first?.to).toBe('third');

      const canonical = canonicalGetDefaultOutcome('first', '2B', 0, bases);
      expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonical);
    });
  });

  describe('Triples (3B)', () => {
    it('All runners score on 3B', () => {
      const bases = { first: true, second: true, third: true };
      const defaults = calculateRunnerDefaults(createPlayData('hit', { hitType: '3B' }), bases, 0);

      expect(defaults.first?.to).toBe('home');
      expect(defaults.second?.to).toBe('home');
      expect(defaults.third?.to).toBe('home');

      // Compare all to canonical
      expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonicalGetDefaultOutcome('first', '3B', 0, bases));
      expect(toCanonicalOutcome(defaults.second!.to, 'second')).toBe(canonicalGetDefaultOutcome('second', '3B', 0, bases));
      expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonicalGetDefaultOutcome('third', '3B', 0, bases));
    });
  });
});

describe('runnerDefaults.ts - Home Run Defaults', () => {
  it('All runners score on HR', () => {
    const bases = { first: true, second: true, third: true };
    const defaults = calculateRunnerDefaults(createPlayData('hr'), bases, 0);

    expect(defaults.batter.to).toBe('home');
    expect(defaults.first?.to).toBe('home');
    expect(defaults.second?.to).toBe('home');
    expect(defaults.third?.to).toBe('home');

    // Compare to canonical
    expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonicalGetDefaultOutcome('first', 'HR', 0, bases));
    expect(toCanonicalOutcome(defaults.second!.to, 'second')).toBe(canonicalGetDefaultOutcome('second', 'HR', 0, bases));
    expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonicalGetDefaultOutcome('third', 'HR', 0, bases));
  });

  it('Solo HR - batter scores', () => {
    const bases = { first: false, second: false, third: false };
    const defaults = calculateRunnerDefaults(createPlayData('hr'), bases, 0);
    expect(defaults.batter.to).toBe('home');
  });
});

describe('runnerDefaults.ts - Walk Defaults', () => {
  it('BB with R1 only - R1 forced to 2B', () => {
    const bases = { first: true, second: false, third: false };
    const defaults = calculateWalkDefaults(bases);

    expect(defaults.batter.to).toBe('first');
    expect(defaults.first?.to).toBe('second');

    // Compare to canonical
    const canonical = canonicalGetDefaultOutcome('first', 'BB', 0, bases);
    expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonical);
  });

  it('BB with R1+R2 - both forced', () => {
    const bases = { first: true, second: true, third: false };
    const defaults = calculateWalkDefaults(bases);

    expect(defaults.first?.to).toBe('second');
    expect(defaults.second?.to).toBe('third');

    // Compare to canonical
    expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonicalGetDefaultOutcome('first', 'BB', 0, bases));
    expect(toCanonicalOutcome(defaults.second!.to, 'second')).toBe(canonicalGetDefaultOutcome('second', 'BB', 0, bases));
  });

  it('BB with bases loaded - R3 scores', () => {
    const bases = { first: true, second: true, third: true };
    const defaults = calculateWalkDefaults(bases);

    expect(defaults.first?.to).toBe('second');
    expect(defaults.second?.to).toBe('third');
    expect(defaults.third?.to).toBe('home');

    // Compare to canonical
    expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonicalGetDefaultOutcome('third', 'BB', 0, bases));
  });

  it('BB with R2 only (no R1) - R2 NOT forced, holds', () => {
    const bases = { first: false, second: true, third: false };
    const defaults = calculateWalkDefaults(bases);

    expect(defaults.second?.to).toBe('second'); // Holds

    // Compare to canonical
    const canonical = canonicalGetDefaultOutcome('second', 'BB', 0, bases);
    expect(toCanonicalOutcome(defaults.second!.to, 'second')).toBe(canonical);
  });

  it('BB with R3 only - R3 NOT forced, holds', () => {
    const bases = { first: false, second: false, third: true };
    const defaults = calculateWalkDefaults(bases);

    expect(defaults.third?.to).toBe('third'); // Holds

    // Compare to canonical
    const canonical = canonicalGetDefaultOutcome('third', 'BB', 0, bases);
    expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonical);
  });

  it('BB with R2+R3 (no R1) - neither forced, both hold', () => {
    const bases = { first: false, second: true, third: true };
    const defaults = calculateWalkDefaults(bases);

    expect(defaults.second?.to).toBe('second'); // Holds
    expect(defaults.third?.to).toBe('third'); // Holds
  });
});

describe('runnerDefaults.ts - Out Defaults', () => {
  describe('Strikeouts (K)', () => {
    it('K with runners - all hold', () => {
      const bases = { first: true, second: true, third: true };
      const defaults = calculateRunnerDefaults(createPlayData('out', { outType: 'K' }), bases, 0);

      expect(defaults.first?.to).toBe('first');
      expect(defaults.second?.to).toBe('second');
      expect(defaults.third?.to).toBe('third');

      // Compare to canonical
      expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonicalGetDefaultOutcome('first', 'K', 0, bases));
      expect(toCanonicalOutcome(defaults.second!.to, 'second')).toBe(canonicalGetDefaultOutcome('second', 'K', 0, bases));
      expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonicalGetDefaultOutcome('third', 'K', 0, bases));
    });
  });

  describe('Fly Outs (FO)', () => {
    it('FO with R3, 0 outs - R3 tags and scores', () => {
      const bases = { first: false, second: false, third: true };
      const defaults = calculateRunnerDefaults(createPlayData('out', { outType: 'FO' }), bases, 0);

      expect(defaults.third?.to).toBe('home');

      // Compare to canonical
      const canonical = canonicalGetDefaultOutcome('third', 'FO', 0, bases);
      expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonical);
    });

    it('FO with R3, 2 outs - R3 holds', () => {
      const bases = { first: false, second: false, third: true };
      const defaults = calculateRunnerDefaults(createPlayData('out', { outType: 'FO' }), bases, 2);

      expect(defaults.third?.to).toBe('third');

      // Compare to canonical
      const canonical = canonicalGetDefaultOutcome('third', 'FO', 2, bases);
      expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonical);
    });

    it('FO with R1, 0 outs - R1 holds', () => {
      const bases = { first: true, second: false, third: false };
      const defaults = calculateRunnerDefaults(createPlayData('out', { outType: 'FO' }), bases, 0);

      expect(defaults.first?.to).toBe('first');

      // Compare to canonical
      const canonical = canonicalGetDefaultOutcome('first', 'FO', 0, bases);
      expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonical);
    });
  });

  describe('Double Plays (DP)', () => {
    it('Explicit DP with R1 - R1 out at 2B', () => {
      const bases = { first: true, second: false, third: false };
      const defaults = calculateRunnerDefaults(
        createPlayData('out', { outType: 'DP', fieldingSequence: [6, 4, 3] }),
        bases,
        0
      );

      expect(defaults.batter.to).toBe('out');
      expect(defaults.first?.to).toBe('out');

      // Compare to canonical
      const canonical = canonicalGetDefaultOutcome('first', 'DP', 0, bases);
      expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonical);
    });

    it('GO with R1 and 2+ fielders, 0 outs - inferred DP, R1 out', () => {
      const bases = { first: true, second: false, third: false };
      const defaults = calculateRunnerDefaults(
        createPlayData('out', { outType: 'GO', fieldingSequence: [6, 4, 3] }),
        bases,
        0
      );

      expect(defaults.batter.to).toBe('out');
      expect(defaults.first?.to).toBe('out'); // DP inferred
    });

    it('GO with R1 and 1 fielder - NOT a DP, R1 may advance', () => {
      const bases = { first: true, second: false, third: false };
      const defaults = calculateRunnerDefaults(
        createPlayData('out', { outType: 'GO', fieldingSequence: [3] }),
        bases,
        0
      );

      // With only 1 fielder, it's a simple ground out, not a DP
      // runnerDefaults.ts treats this as regular GO - R1 advances
      expect(defaults.first?.to).toBe('second');
    });

    it('GO with R1, 2 outs - no DP possible, R1 holds/advances', () => {
      const bases = { first: true, second: false, third: false };
      const defaults = calculateRunnerDefaults(
        createPlayData('out', { outType: 'GO', fieldingSequence: [6, 4, 3] }),
        bases,
        2
      );

      // With 2 outs, no DP can occur - ground out ends inning
      // runnerDefaults.ts should NOT mark as DP when outs >= 2
      // Looking at the code, it checks `outs < 2` for DP detection
      expect(defaults.first?.to).not.toBe('out'); // Should not be out as DP
    });
  });

  describe('Fielder\'s Choice (FC)', () => {
    it('FC with R1 - R1 out, batter reaches', () => {
      const bases = { first: true, second: false, third: false };
      const defaults = calculateRunnerDefaults(
        createPlayData('out', { outType: 'FC', fieldingSequence: [6] }),
        bases,
        0
      );

      expect(defaults.batter.to).toBe('first');
      expect(defaults.first?.to).toBe('out');

      // Compare to canonical
      const canonical = canonicalGetDefaultOutcome('first', 'FC', 0, bases);
      expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonical);
    });
  });
});

describe('runnerDefaults.ts - Error Defaults', () => {
  it('Error with R3 - R3 scores', () => {
    const bases = { first: false, second: false, third: true };
    const defaults = calculateRunnerDefaults(createPlayData('error'), bases, 0);

    expect(defaults.third?.to).toBe('home');

    // Compare to canonical
    const canonical = canonicalGetDefaultOutcome('third', 'E', 0, bases);
    expect(toCanonicalOutcome(defaults.third!.to, 'third')).toBe(canonical);
  });

  it('Error with R2 - R2 to 3B', () => {
    const bases = { first: false, second: true, third: false };
    const defaults = calculateRunnerDefaults(createPlayData('error'), bases, 0);

    expect(defaults.second?.to).toBe('third');

    // Compare to canonical
    const canonical = canonicalGetDefaultOutcome('second', 'E', 0, bases);
    expect(toCanonicalOutcome(defaults.second!.to, 'second')).toBe(canonical);
  });

  it('Error with R1 - R1 to 2B', () => {
    const bases = { first: true, second: false, third: false };
    const defaults = calculateRunnerDefaults(createPlayData('error'), bases, 0);

    expect(defaults.first?.to).toBe('second');

    // Compare to canonical
    const canonical = canonicalGetDefaultOutcome('first', 'E', 0, bases);
    expect(toCanonicalOutcome(defaults.first!.to, 'first')).toBe(canonical);
  });
});

describe('runnerDefaults.ts - D3K Defaults', () => {
  it('D3K legal (no R1) - batter reaches', () => {
    const bases = { first: false, second: true, third: true };
    const defaults = calculateD3KDefaults(bases, 0);

    expect(defaults.batter.to).toBe('first');
    expect(defaults.third?.to).toBe('home');
    expect(defaults.second?.to).toBe('third');
  });

  it('D3K legal (2 outs with R1) - batter reaches, R1 forced out', () => {
    const bases = { first: true, second: false, third: false };
    const defaults = calculateD3KDefaults(bases, 2);

    expect(defaults.batter.to).toBe('first');
    expect(defaults.first?.to).toBe('out'); // Force out at 2B
  });

  it('D3K not legal (R1 with < 2 outs) - batter out', () => {
    const bases = { first: true, second: false, third: false };
    const defaults = calculateD3KDefaults(bases, 0);

    expect(defaults.batter.to).toBe('out'); // D3K not legal
    expect(defaults.first?.to).toBe('first'); // Holds
  });
});

describe('runnerDefaults.ts - Comprehensive Scenarios', () => {
  it('Bases loaded, 0 outs, DP - R1 out, R2 advances, R3 scores', () => {
    const bases = { first: true, second: true, third: true };
    const defaults = calculateRunnerDefaults(
      createPlayData('out', { outType: 'DP', fieldingSequence: [6, 4, 3] }),
      bases,
      0
    );

    expect(defaults.batter.to).toBe('out');
    expect(defaults.first?.to).toBe('out');
    expect(defaults.second?.to).toBe('third');
    expect(defaults.third?.to).toBe('home');
  });

  it('R1+R3, 1 out, 1B - R3 scores, R1 to 2B', () => {
    const bases = { first: true, second: false, third: true };
    const defaults = calculateRunnerDefaults(createPlayData('hit', { hitType: '1B' }), bases, 1);

    expect(defaults.third?.to).toBe('home');
    expect(defaults.first?.to).toBe('second');
  });
});
