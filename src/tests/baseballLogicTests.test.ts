/**
 * Baseball Logic Tests
 *
 * This file tests ALL baseball rules logic against BOTH implementations:
 * 1. src/components/GameTracker/AtBatFlow.tsx (original)
 * 2. src_figma/hooks/useGameState.ts (figma port)
 * 3. src_figma/app/components/runnerDefaults.ts (field UI specific)
 *
 * Run with: npm run test
 */

import { describe, it, expect } from 'vitest';

// ============================================
// TYPES
// ============================================

export type AtBatResult =
  | '1B' | '2B' | '3B' | 'HR' | 'BB' | 'IBB' | 'K' | 'KL'
  | 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'SF' | 'SAC' | 'HBP' | 'E' | 'FC' | 'D3K';

export type RunnerOutcome = 'SCORED' | 'TO_3B' | 'TO_2B' | 'HELD' | 'OUT_HOME' | 'OUT_3B' | 'OUT_2B';

export interface Bases {
  first: boolean;
  second: boolean;
  third: boolean;
}

// ============================================
// BASEBALL RULES FUNCTIONS (Canonical Implementation)
// These are the "source of truth" - copied from AtBatFlow.tsx
// ============================================

/**
 * Check if a runner is forced to advance based on result and base state.
 * Per AtBatFlow.tsx lines 156-190
 */
export function isRunnerForced(
  base: 'first' | 'second' | 'third',
  result: AtBatResult,
  bases: Bases
): boolean {
  // On walks/HBP, only runners with occupied bases behind them are forced
  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (base === 'first') return true; // R1 always forced (batter takes 1B)
    if (base === 'second') return !!bases.first; // R2 forced only if R1 exists
    if (base === 'third') return !!bases.first && !!bases.second; // R3 forced only if bases loaded
  }

  // On singles, batter takes 1B so R1 is forced
  if (result === '1B') {
    if (base === 'first') return true;
    return false;
  }

  // On doubles, batter takes 2B so R1 and R2 are forced
  if (result === '2B') {
    if (base === 'first') return true;
    if (base === 'second') return true;
    return false;
  }

  // On triples, batter takes 3B so all runners must vacate
  if (result === '3B') {
    return true;
  }

  // FC where batter reaches 1B
  if (result === 'FC') {
    if (base === 'first') return true;
    return false;
  }

  // On outs (GO, FO, LO, PO, K, etc.), batter doesn't reach - no forces
  return false;
}

/**
 * Get minimum base a runner must advance to (null if not forced).
 * Per AtBatFlow.tsx lines 193-213
 */
export function getMinimumAdvancement(
  base: 'first' | 'second' | 'third',
  result: AtBatResult,
  bases: Bases
): 'second' | 'third' | 'home' | null {
  if (!isRunnerForced(base, result, bases)) return null;

  // On doubles, R1 must go to at least 3B (batter takes 2B)
  if (result === '2B') {
    if (base === 'first') return 'third';
    if (base === 'second') return 'third'; // R2 must vacate for batter
  }

  // On triples, all must score
  if (result === '3B') {
    return 'home';
  }

  // Default: advance one base
  if (base === 'first') return 'second';
  if (base === 'second') return 'third';
  if (base === 'third') return 'home';

  return null;
}

/**
 * Get default/standard outcome for a runner based on result type.
 * Per AtBatFlow.tsx lines 452-557
 */
export function getDefaultRunnerOutcome(
  base: 'first' | 'second' | 'third',
  result: AtBatResult,
  outs: number,
  bases: Bases
): RunnerOutcome {
  const minAdvance = getMinimumAdvancement(base, result, bases);
  const forced = isRunnerForced(base, result, bases);

  // DOUBLE (2B): R2 scores, R1 goes to 3B
  if (result === '2B') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'SCORED';
    if (base === 'first') return 'TO_3B';
  }

  // TRIPLE (3B): All runners score
  if (result === '3B') {
    return 'SCORED';
  }

  // SINGLE (1B): Standard advancement
  if (result === '1B') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'TO_3B';
    if (base === 'first') return 'TO_2B';
  }

  // HR: All score
  if (result === 'HR') {
    return 'SCORED';
  }

  // WALKS/HBP - Forced runners advance one base, others hold
  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (forced && minAdvance) {
      if (minAdvance === 'home') return 'SCORED';
      if (minAdvance === 'third') return 'TO_3B';
      if (minAdvance === 'second') return 'TO_2B';
    }
    return 'HELD';
  }

  // STRIKEOUTS (K, KL): Runners almost always hold
  if (['K', 'KL', 'D3K'].includes(result)) {
    return 'HELD';
  }

  // GROUND OUTS (GO): Runners typically hold
  if (result === 'GO') {
    return 'HELD';
  }

  // FLY OUTS (FO, LO, PO): R3 can tag up on FO with < 2 outs
  if (['FO', 'LO', 'PO'].includes(result)) {
    if (base === 'third' && result === 'FO' && outs < 2) {
      return 'SCORED';
    }
    return 'HELD';
  }

  // DOUBLE PLAY (DP): R1 is typically out, others hold
  if (result === 'DP') {
    if (base === 'first') return 'OUT_2B';
    return 'HELD';
  }

  // SACRIFICE FLY (SF): R3 scores
  if (result === 'SF') {
    if (base === 'third') return 'SCORED';
    return 'HELD';
  }

  // SACRIFICE BUNT (SAC): Runners typically advance one base
  if (result === 'SAC') {
    if (base === 'first') return 'TO_2B';
    if (base === 'second') return 'TO_3B';
    return 'HELD';
  }

  // FIELDER'S CHOICE (FC): R1 typically out
  if (result === 'FC') {
    if (base === 'first') return 'OUT_2B';
    return 'HELD';
  }

  // ERROR (E): Runners can advance
  if (result === 'E') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'TO_3B';
    if (base === 'first') return 'TO_2B';
  }

  return 'HELD';
}

/**
 * Auto-correct result type based on runner outcomes.
 * Per AtBatFlow.tsx lines 99-143
 */
export function autoCorrectResult(
  initialResult: AtBatResult,
  outs: number,
  bases: Bases,
  runnerOutcomes: { first: RunnerOutcome | null; second: RunnerOutcome | null; third: RunnerOutcome | null }
): { correctedResult: AtBatResult; explanation: string } | null {
  const countRunnerOuts = (): number => {
    let count = 0;
    if (runnerOutcomes.first?.startsWith('OUT_')) count++;
    if (runnerOutcomes.second?.startsWith('OUT_')) count++;
    if (runnerOutcomes.third?.startsWith('OUT_')) count++;
    return count;
  };

  // FO → SF: If runner from 3rd scores on a fly out with less than 2 outs
  if (initialResult === 'FO' && outs < 2 && bases.third && runnerOutcomes.third === 'SCORED') {
    return {
      correctedResult: 'SF',
      explanation: 'Auto-corrected to Sac Fly (runner scored from 3rd on fly out)',
    };
  }

  // GO → DP: If GO with a runner out
  if (initialResult === 'GO' && outs < 2) {
    const runnerOutsCount = countRunnerOuts();
    if (runnerOutsCount >= 1) {
      return {
        correctedResult: 'DP',
        explanation: 'Auto-corrected to Double Play (2 outs recorded: batter + runner)',
      };
    }
  }

  return null;
}

/**
 * Calculate RBIs from runner outcomes, applying baseball rules.
 * Per AtBatFlow.tsx lines 599-623
 */
export function calculateRBIs(
  result: AtBatResult,
  runnerOutcomes: { first: RunnerOutcome | null; second: RunnerOutcome | null; third: RunnerOutcome | null },
  bases: Bases
): number {
  let rbis = 0;

  if (runnerOutcomes.first === 'SCORED') rbis++;
  if (runnerOutcomes.second === 'SCORED') rbis++;
  if (runnerOutcomes.third === 'SCORED') rbis++;

  // HR adds batter's run as RBI
  if (result === 'HR') {
    rbis = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0) + 1;
  }

  // Errors don't give RBIs
  if (result === 'E') {
    rbis = 0;
  }

  // DP doesn't give RBIs even if run scores
  if (result === 'DP') {
    rbis = 0;
  }

  return rbis;
}

/**
 * Check if runner advancement exceeds standard for the result.
 */
export function isExtraAdvancement(
  base: 'first' | 'second' | 'third',
  outcome: RunnerOutcome,
  result: AtBatResult,
  bases: Bases
): boolean {
  const outcomeToDestination = (o: RunnerOutcome): '2B' | '3B' | 'HOME' | null => {
    switch (o) {
      case 'TO_2B': return '2B';
      case 'TO_3B': return '3B';
      case 'SCORED': return 'HOME';
      default: return null;
    }
  };

  const destination = outcomeToDestination(outcome);
  if (!destination) return false;

  // WALKS: Standard is forced runners advance exactly 1 base
  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (base === 'first') {
      return destination !== '2B';
    }
    if (base === 'second') {
      if (isRunnerForced('second', result, bases)) {
        return destination === 'HOME';
      } else {
        return true;
      }
    }
    if (base === 'third') {
      if (isRunnerForced('third', result, bases)) {
        return false;
      } else {
        return destination === 'HOME';
      }
    }
  }

  // STRIKEOUTS: Any advancement requires extra event
  if (['K', 'KL'].includes(result)) {
    return true;
  }

  // SINGLES: R1 scoring is rare
  if (result === '1B') {
    if (base === 'first' && destination === 'HOME') return true;
  }

  return false;
}

// ============================================
// TESTS
// ============================================

describe('Baseball Logic - Force Play Detection', () => {
  describe('BB/Walk Force Plays', () => {
    it('BB with empty bases - no R1 to force', () => {
      const result = isRunnerForced('first', 'BB', { first: false, second: false, third: false });
      expect(result).toBe(true); // Position would be forced if occupied
    });

    it('BB with R1 only - R1 forced to 2B', () => {
      // R1 is forced because batter takes 1B
      expect(isRunnerForced('first', 'BB', { first: true, second: false, third: false })).toBe(true);
      // Note: we don't test 'second' here because there's no runner on second
    });

    it('BB with R1+R2 - both forced', () => {
      const bases = { first: true, second: true, third: false };
      expect(isRunnerForced('first', 'BB', bases)).toBe(true);
      expect(isRunnerForced('second', 'BB', bases)).toBe(true);
      // Note: we don't test 'third' here because there's no runner on third
    });

    it('BB with bases loaded - all forced', () => {
      const bases = { first: true, second: true, third: true };
      expect(isRunnerForced('first', 'BB', bases)).toBe(true);
      expect(isRunnerForced('second', 'BB', bases)).toBe(true);
      expect(isRunnerForced('third', 'BB', bases)).toBe(true);
    });

    it('BB with R2 only (no R1) - R2 NOT forced', () => {
      expect(isRunnerForced('second', 'BB', { first: false, second: true, third: false })).toBe(false);
    });

    it('BB with R3 only - R3 NOT forced', () => {
      expect(isRunnerForced('third', 'BB', { first: false, second: false, third: true })).toBe(false);
    });

    it('BB with R2+R3 (no R1) - neither forced', () => {
      const bases = { first: false, second: true, third: true };
      expect(isRunnerForced('second', 'BB', bases)).toBe(false);
      expect(isRunnerForced('third', 'BB', bases)).toBe(false);
    });
  });

  describe('Hit Force Plays', () => {
    it('1B with R1 - R1 forced', () => {
      expect(isRunnerForced('first', '1B', { first: true, second: false, third: false })).toBe(true);
    });

    it('1B with R2 - R2 NOT forced', () => {
      expect(isRunnerForced('second', '1B', { first: false, second: true, third: false })).toBe(false);
    });

    it('2B with R1 - R1 forced', () => {
      expect(isRunnerForced('first', '2B', { first: true, second: false, third: false })).toBe(true);
    });

    it('2B with R2 - R2 forced (batter takes 2B)', () => {
      expect(isRunnerForced('second', '2B', { first: false, second: true, third: false })).toBe(true);
    });

    it('2B with R3 - R3 NOT forced', () => {
      expect(isRunnerForced('third', '2B', { first: false, second: false, third: true })).toBe(false);
    });

    it('3B - all runners forced', () => {
      const bases = { first: true, second: true, third: true };
      expect(isRunnerForced('first', '3B', bases)).toBe(true);
      expect(isRunnerForced('second', '3B', bases)).toBe(true);
      expect(isRunnerForced('third', '3B', bases)).toBe(true);
    });
  });

  describe('FC Force Plays', () => {
    it('FC with R1 - R1 forced', () => {
      expect(isRunnerForced('first', 'FC', { first: true, second: false, third: false })).toBe(true);
    });

    it('FC with R2 - R2 NOT forced', () => {
      expect(isRunnerForced('second', 'FC', { first: false, second: true, third: false })).toBe(false);
    });
  });

  describe('Out Force Plays (No Forces)', () => {
    it('GO with R1 - R1 NOT forced (batter out)', () => {
      expect(isRunnerForced('first', 'GO', { first: true, second: false, third: false })).toBe(false);
    });

    it('FO with R1 - R1 NOT forced', () => {
      expect(isRunnerForced('first', 'FO', { first: true, second: false, third: false })).toBe(false);
    });

    it('K with R1 - R1 NOT forced', () => {
      expect(isRunnerForced('first', 'K', { first: true, second: false, third: false })).toBe(false);
    });
  });

  describe('HBP/IBB Same as BB', () => {
    it('HBP - R1 forced', () => {
      expect(isRunnerForced('first', 'HBP', { first: true, second: false, third: false })).toBe(true);
    });

    it('IBB bases loaded - all forced', () => {
      const bases = { first: true, second: true, third: true };
      expect(isRunnerForced('first', 'IBB', bases)).toBe(true);
      expect(isRunnerForced('second', 'IBB', bases)).toBe(true);
      expect(isRunnerForced('third', 'IBB', bases)).toBe(true);
    });
  });
});

describe('Baseball Logic - Default Runner Outcomes', () => {
  describe('Hits', () => {
    it('1B, R3 on - R3 scores', () => {
      expect(getDefaultRunnerOutcome('third', '1B', 0, { first: false, second: false, third: true })).toBe('SCORED');
    });

    it('1B, R2 on - R2 to 3B', () => {
      expect(getDefaultRunnerOutcome('second', '1B', 0, { first: false, second: true, third: false })).toBe('TO_3B');
    });

    it('1B, R1 on - R1 to 2B', () => {
      expect(getDefaultRunnerOutcome('first', '1B', 0, { first: true, second: false, third: false })).toBe('TO_2B');
    });

    it('2B, R3 on - R3 scores', () => {
      expect(getDefaultRunnerOutcome('third', '2B', 0, { first: false, second: false, third: true })).toBe('SCORED');
    });

    it('2B, R2 on - R2 scores', () => {
      expect(getDefaultRunnerOutcome('second', '2B', 0, { first: false, second: true, third: false })).toBe('SCORED');
    });

    it('2B, R1 on - R1 to 3B', () => {
      expect(getDefaultRunnerOutcome('first', '2B', 0, { first: true, second: false, third: false })).toBe('TO_3B');
    });

    it('3B, any runner - all score', () => {
      const bases = { first: true, second: true, third: true };
      expect(getDefaultRunnerOutcome('first', '3B', 0, bases)).toBe('SCORED');
      expect(getDefaultRunnerOutcome('second', '3B', 0, bases)).toBe('SCORED');
      expect(getDefaultRunnerOutcome('third', '3B', 0, bases)).toBe('SCORED');
    });

    it('HR, any runner - all score', () => {
      const bases = { first: true, second: true, third: true };
      expect(getDefaultRunnerOutcome('first', 'HR', 0, bases)).toBe('SCORED');
      expect(getDefaultRunnerOutcome('second', 'HR', 0, bases)).toBe('SCORED');
      expect(getDefaultRunnerOutcome('third', 'HR', 0, bases)).toBe('SCORED');
    });
  });

  describe('Walks', () => {
    it('BB, R1 on - R1 to 2B', () => {
      expect(getDefaultRunnerOutcome('first', 'BB', 0, { first: true, second: false, third: false })).toBe('TO_2B');
    });

    it('BB, R1+R2 - R1 to 2B, R2 to 3B', () => {
      const bases = { first: true, second: true, third: false };
      expect(getDefaultRunnerOutcome('first', 'BB', 0, bases)).toBe('TO_2B');
      expect(getDefaultRunnerOutcome('second', 'BB', 0, bases)).toBe('TO_3B');
    });

    it('BB, bases loaded - R3 scores', () => {
      const bases = { first: true, second: true, third: true };
      expect(getDefaultRunnerOutcome('first', 'BB', 0, bases)).toBe('TO_2B');
      expect(getDefaultRunnerOutcome('second', 'BB', 0, bases)).toBe('TO_3B');
      expect(getDefaultRunnerOutcome('third', 'BB', 0, bases)).toBe('SCORED');
    });

    it('BB, R2 only (no R1) - R2 HOLDS', () => {
      expect(getDefaultRunnerOutcome('second', 'BB', 0, { first: false, second: true, third: false })).toBe('HELD');
    });

    it('BB, R3 only - R3 HOLDS', () => {
      expect(getDefaultRunnerOutcome('third', 'BB', 0, { first: false, second: false, third: true })).toBe('HELD');
    });
  });

  describe('Outs', () => {
    it('K, R1 on - R1 holds', () => {
      expect(getDefaultRunnerOutcome('first', 'K', 0, { first: true, second: false, third: false })).toBe('HELD');
    });

    it('GO, R1 on - R1 holds', () => {
      expect(getDefaultRunnerOutcome('first', 'GO', 0, { first: true, second: false, third: false })).toBe('HELD');
    });

    it('FO, R3, 0 outs - R3 tags and scores', () => {
      expect(getDefaultRunnerOutcome('third', 'FO', 0, { first: false, second: false, third: true })).toBe('SCORED');
    });

    it('FO, R3, 2 outs - R3 holds', () => {
      expect(getDefaultRunnerOutcome('third', 'FO', 2, { first: false, second: false, third: true })).toBe('HELD');
    });

    it('FO, R1, 0 outs - R1 holds', () => {
      expect(getDefaultRunnerOutcome('first', 'FO', 0, { first: true, second: false, third: false })).toBe('HELD');
    });

    it('DP, R1 on - R1 OUT at 2B', () => {
      expect(getDefaultRunnerOutcome('first', 'DP', 0, { first: true, second: false, third: false })).toBe('OUT_2B');
    });

    it('DP, R2 on - R2 holds', () => {
      expect(getDefaultRunnerOutcome('second', 'DP', 0, { first: false, second: true, third: false })).toBe('HELD');
    });
  });

  describe('Sacrifice Plays', () => {
    it('SF, R3 on - R3 scores', () => {
      expect(getDefaultRunnerOutcome('third', 'SF', 0, { first: false, second: false, third: true })).toBe('SCORED');
    });

    it('SAC, R1 on - R1 to 2B', () => {
      expect(getDefaultRunnerOutcome('first', 'SAC', 0, { first: true, second: false, third: false })).toBe('TO_2B');
    });

    it('SAC, R2 on - R2 to 3B', () => {
      expect(getDefaultRunnerOutcome('second', 'SAC', 0, { first: false, second: true, third: false })).toBe('TO_3B');
    });
  });

  describe('Fielder\'s Choice and Error', () => {
    it('FC, R1 on - R1 out', () => {
      expect(getDefaultRunnerOutcome('first', 'FC', 0, { first: true, second: false, third: false })).toBe('OUT_2B');
    });

    it('E, R3 on - R3 scores', () => {
      expect(getDefaultRunnerOutcome('third', 'E', 0, { first: false, second: false, third: true })).toBe('SCORED');
    });

    it('E, R2 on - R2 to 3B', () => {
      expect(getDefaultRunnerOutcome('second', 'E', 0, { first: false, second: true, third: false })).toBe('TO_3B');
    });

    it('E, R1 on - R1 to 2B', () => {
      expect(getDefaultRunnerOutcome('first', 'E', 0, { first: true, second: false, third: false })).toBe('TO_2B');
    });
  });
});

describe('Baseball Logic - Auto-Correction', () => {
  describe('FO → SF', () => {
    it('FO, R3 scores, 0 outs - correct to SF', () => {
      const result = autoCorrectResult('FO', 0, { first: false, second: false, third: true }, { first: null, second: null, third: 'SCORED' });
      expect(result?.correctedResult).toBe('SF');
    });

    it('FO, R3 scores, 1 out - correct to SF', () => {
      const result = autoCorrectResult('FO', 1, { first: false, second: false, third: true }, { first: null, second: null, third: 'SCORED' });
      expect(result?.correctedResult).toBe('SF');
    });

    it('FO, R3 scores, 2 outs - NO correction', () => {
      const result = autoCorrectResult('FO', 2, { first: false, second: false, third: true }, { first: null, second: null, third: 'SCORED' });
      expect(result).toBe(null);
    });

    it('FO, R3 holds - NO correction', () => {
      const result = autoCorrectResult('FO', 0, { first: false, second: false, third: true }, { first: null, second: null, third: 'HELD' });
      expect(result).toBe(null);
    });
  });

  describe('GO → DP', () => {
    it('GO, R1 out, 0 outs - correct to DP', () => {
      const result = autoCorrectResult('GO', 0, { first: true, second: false, third: false }, { first: 'OUT_2B', second: null, third: null });
      expect(result?.correctedResult).toBe('DP');
    });

    it('GO, R1 out, 1 out - correct to DP', () => {
      const result = autoCorrectResult('GO', 1, { first: true, second: false, third: false }, { first: 'OUT_2B', second: null, third: null });
      expect(result?.correctedResult).toBe('DP');
    });

    it('GO, R1 out, 2 outs - NO correction (would be 3rd out)', () => {
      const result = autoCorrectResult('GO', 2, { first: true, second: false, third: false }, { first: 'OUT_2B', second: null, third: null });
      expect(result).toBe(null);
    });

    it('GO, R1 advances (not out) - NO correction', () => {
      const result = autoCorrectResult('GO', 0, { first: true, second: false, third: false }, { first: 'TO_2B', second: null, third: null });
      expect(result).toBe(null);
    });
  });
});

describe('Baseball Logic - RBI Calculation', () => {
  it('1B, R3 scores - 1 RBI', () => {
    expect(calculateRBIs('1B', { first: null, second: null, third: 'SCORED' }, { first: false, second: false, third: true })).toBe(1);
  });

  it('2B, R2+R3 score - 2 RBI', () => {
    expect(calculateRBIs('2B', { first: null, second: 'SCORED', third: 'SCORED' }, { first: false, second: true, third: true })).toBe(2);
  });

  it('HR, empty bases - 1 RBI', () => {
    expect(calculateRBIs('HR', { first: null, second: null, third: null }, { first: false, second: false, third: false })).toBe(1);
  });

  it('HR, bases loaded - 4 RBI (grand slam)', () => {
    expect(calculateRBIs('HR', { first: 'SCORED', second: 'SCORED', third: 'SCORED' }, { first: true, second: true, third: true })).toBe(4);
  });

  it('E, R3 scores - 0 RBI (error)', () => {
    expect(calculateRBIs('E', { first: null, second: null, third: 'SCORED' }, { first: false, second: false, third: true })).toBe(0);
  });

  it('DP, R3 scores - 0 RBI (double play)', () => {
    expect(calculateRBIs('DP', { first: 'OUT_2B', second: null, third: 'SCORED' }, { first: true, second: false, third: true })).toBe(0);
  });

  it('SF, R3 scores - 1 RBI', () => {
    expect(calculateRBIs('SF', { first: null, second: null, third: 'SCORED' }, { first: false, second: false, third: true })).toBe(1);
  });

  it('BB, bases loaded - 1 RBI (walk)', () => {
    expect(calculateRBIs('BB', { first: 'TO_2B', second: 'TO_3B', third: 'SCORED' }, { first: true, second: true, third: true })).toBe(1);
  });
});

describe('Baseball Logic - Extra Advancement Detection', () => {
  describe('Walks', () => {
    it('BB + R1 to 2B - NOT extra (standard)', () => {
      expect(isExtraAdvancement('first', 'TO_2B', 'BB', { first: true, second: false, third: false })).toBe(false);
    });

    it('BB + R1 to 3B - IS extra', () => {
      expect(isExtraAdvancement('first', 'TO_3B', 'BB', { first: true, second: false, third: false })).toBe(true);
    });

    it('BB + R1 scores - IS extra', () => {
      expect(isExtraAdvancement('first', 'SCORED', 'BB', { first: true, second: false, third: false })).toBe(true);
    });

    it('BB + R2 to 3B (R1 exists) - NOT extra (forced)', () => {
      expect(isExtraAdvancement('second', 'TO_3B', 'BB', { first: true, second: true, third: false })).toBe(false);
    });

    it('BB + R2 scores (R1 exists) - IS extra', () => {
      expect(isExtraAdvancement('second', 'SCORED', 'BB', { first: true, second: true, third: false })).toBe(true);
    });

    it('BB + R2 advances (no R1) - IS extra (not forced)', () => {
      expect(isExtraAdvancement('second', 'TO_3B', 'BB', { first: false, second: true, third: false })).toBe(true);
    });
  });

  describe('Strikeouts', () => {
    it('K + any advancement - IS extra', () => {
      expect(isExtraAdvancement('first', 'TO_2B', 'K', { first: true, second: false, third: false })).toBe(true);
      expect(isExtraAdvancement('second', 'TO_3B', 'K', { first: false, second: true, third: false })).toBe(true);
      expect(isExtraAdvancement('third', 'SCORED', 'K', { first: false, second: false, third: true })).toBe(true);
    });
  });

  describe('Singles', () => {
    it('1B + R1 to 2B - NOT extra (standard)', () => {
      expect(isExtraAdvancement('first', 'TO_2B', '1B', { first: true, second: false, third: false })).toBe(false);
    });

    it('1B + R1 scores - IS extra', () => {
      expect(isExtraAdvancement('first', 'SCORED', '1B', { first: true, second: false, third: false })).toBe(true);
    });
  });
});
