/**
 * Mojo/Fitness Fame Integration Tests
 * Phase 4.5 - Combined Modifiers
 *
 * Per MOJO_FITNESS_SYSTEM_SPEC.md Section 4:
 * - Fame credit modifiers based on player state at time of achievement
 * - Mojo modifiers: Rattled gives bonus, Jacked gives penalty
 * - Fitness modifiers: Juiced penalized (PED stigma), Strained/Weak get bonus
 * - Modifiers stack multiplicatively
 */

import { describe, test, expect } from 'vitest';

import {
  MojoLevel,
  getMojoFameModifier,
  getMojoWARMultiplier,
  getMojoClutchMultiplier,
  getMojoStatMultiplier,
  MOJO_STATES,
} from '../../../engines/mojoEngine';

import {
  FitnessState,
  getFitnessFameModifier,
  getFitnessWARMultiplier,
  getFitnessStatMultiplier,
  calculateAdjustedFame,
  FITNESS_STATES,
} from '../../../engines/fitnessEngine';

// ============================================
// MOJO FAME MODIFIERS
// ============================================

describe('Mojo Fame Modifiers', () => {
  describe('Achievement Credit by Mojo State', () => {
    test('Rattled (-2) achievement: +30% Fame bonus ("overcoming impossible pressure")', () => {
      expect(getMojoFameModifier(-2)).toBe(1.30);
    });

    test('Tense (-1) achievement: +15% Fame bonus ("fighting through adversity")', () => {
      expect(getMojoFameModifier(-1)).toBe(1.15);
    });

    test('Normal (0) achievement: no modifier', () => {
      expect(getMojoFameModifier(0)).toBe(1.00);
    });

    test('Locked In (+1) achievement: -10% Fame credit ("easy when you\'re hot")', () => {
      expect(getMojoFameModifier(1)).toBe(0.90);
    });

    test('Jacked (+2) achievement: -20% Fame credit ("anyone could do it")', () => {
      expect(getMojoFameModifier(2)).toBe(0.80);
    });
  });

  describe('Philosophy: Worse State = More Impressive Achievement', () => {
    test('worse Mojo states yield higher Fame modifier', () => {
      const rattled = getMojoFameModifier(-2);
      const tense = getMojoFameModifier(-1);
      const normal = getMojoFameModifier(0);
      const lockedIn = getMojoFameModifier(1);
      const jacked = getMojoFameModifier(2);

      // Rattled > Tense > Normal > Locked In > Jacked
      expect(rattled).toBeGreaterThan(tense);
      expect(tense).toBeGreaterThan(normal);
      expect(normal).toBeGreaterThan(lockedIn);
      expect(lockedIn).toBeGreaterThan(jacked);
    });

    test('Rattled modifier is highest, Jacked is lowest', () => {
      const modifiers = [-2, -1, 0, 1, 2].map(m => getMojoFameModifier(m as MojoLevel));

      expect(Math.max(...modifiers)).toBe(getMojoFameModifier(-2));
      expect(Math.min(...modifiers)).toBe(getMojoFameModifier(2));
    });
  });

  describe('WAR Multiplier by Mojo', () => {
    test('Rattled gives +15% WAR bonus', () => {
      expect(getMojoWARMultiplier(-2)).toBe(1.15);
    });

    test('Jacked gives -10% WAR penalty', () => {
      expect(getMojoWARMultiplier(2)).toBe(0.90);
    });

    test('WAR multipliers follow same pattern as Fame', () => {
      const rattledWAR = getMojoWARMultiplier(-2);
      const jackedWAR = getMojoWARMultiplier(2);

      expect(rattledWAR).toBeGreaterThan(jackedWAR);
    });
  });

  describe('Clutch Multiplier by Mojo', () => {
    test('Rattled clutch performance gets +30% credit', () => {
      expect(getMojoClutchMultiplier(-2)).toBe(1.30);
    });

    test('Jacked clutch performance gets -15% credit', () => {
      expect(getMojoClutchMultiplier(2)).toBe(0.85);
    });

    test('Clutch multipliers follow same pattern', () => {
      expect(getMojoClutchMultiplier(-2)).toBeGreaterThan(getMojoClutchMultiplier(2));
    });
  });
});

// ============================================
// FITNESS FAME MODIFIERS
// ============================================

describe('Fitness Fame Modifiers', () => {
  describe('Achievement Credit by Fitness State', () => {
    test('Juiced achievement: 50% Fame credit only (PED stigma)', () => {
      expect(getFitnessFameModifier('JUICED')).toBe(0.5);
    });

    test('Fit achievement: baseline (1.0)', () => {
      expect(getFitnessFameModifier('FIT')).toBe(1.0);
    });

    test('Well achievement: no penalty (1.0)', () => {
      expect(getFitnessFameModifier('WELL')).toBe(1.0);
    });

    test('Strained achievement: +15% Fame bonus ("playing hurt")', () => {
      expect(getFitnessFameModifier('STRAINED')).toBe(1.15);
    });

    test('Weak achievement: +25% Fame bonus ("gutsy performance")', () => {
      expect(getFitnessFameModifier('WEAK')).toBe(1.25);
    });

    test('Hurt = 0 (cannot play)', () => {
      expect(getFitnessFameModifier('HURT')).toBe(0);
    });
  });

  describe('WAR Multiplier by Fitness', () => {
    test('Juiced gives -15% WAR (enhanced performance)', () => {
      expect(getFitnessWARMultiplier('JUICED')).toBe(0.85);
    });

    test('Strained gives +10% WAR (playing through pain)', () => {
      expect(getFitnessWARMultiplier('STRAINED')).toBe(1.10);
    });

    test('Weak gives +20% WAR (gutsy performance)', () => {
      expect(getFitnessWARMultiplier('WEAK')).toBe(1.20);
    });
  });

  describe('PED Stigma Philosophy', () => {
    test('Juiced has stat BONUS but Fame PENALTY', () => {
      const statMultiplier = getFitnessStatMultiplier('JUICED');
      const fameModifier = getFitnessFameModifier('JUICED');

      // Stats are better
      expect(statMultiplier).toBeGreaterThan(1.0);
      // But Fame is penalized
      expect(fameModifier).toBeLessThan(1.0);
    });

    test('Weak has stat PENALTY but Fame BONUS', () => {
      const statMultiplier = getFitnessStatMultiplier('WEAK');
      const fameModifier = getFitnessFameModifier('WEAK');

      // Stats are worse
      expect(statMultiplier).toBeLessThan(1.0);
      // But Fame is rewarded
      expect(fameModifier).toBeGreaterThan(1.0);
    });
  });
});

// ============================================
// COMBINED MODIFIER TESTS
// ============================================

describe('Combined Modifier Tests', () => {
  describe('calculateAdjustedFame', () => {
    test('applies both Mojo and Fitness modifiers', () => {
      const baseFame = 10;
      const mojoMod = getMojoFameModifier(0); // 1.0
      const fitness: FitnessState = 'FIT'; // 1.0

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      expect(adjusted).toBe(10); // 10 × 1.0 × 1.0 = 10
    });

    test('Rattled + Weak: bonuses stack (worst states = most impressive)', () => {
      const baseFame = 10;
      const mojoMod = getMojoFameModifier(-2); // 1.30
      const fitness: FitnessState = 'WEAK'; // 1.25

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // 10 × 1.30 × 1.25 = 16.25 → 16
      expect(adjusted).toBe(16);
    });

    test('Jacked + Juiced: penalties stack (best states = least credit)', () => {
      const baseFame = 10;
      const mojoMod = getMojoFameModifier(2); // 0.80
      const fitness: FitnessState = 'JUICED'; // 0.50

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // 10 × 0.80 × 0.50 = 4
      expect(adjusted).toBe(4);
    });

    test('Rattled + Juiced: mixed modifiers', () => {
      const baseFame = 10;
      const mojoMod = getMojoFameModifier(-2); // 1.30
      const fitness: FitnessState = 'JUICED'; // 0.50

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // 10 × 1.30 × 0.50 = 6.5 → 7
      expect(adjusted).toBe(7);
    });

    test('Jacked + Weak: mixed modifiers', () => {
      const baseFame = 10;
      const mojoMod = getMojoFameModifier(2); // 0.80
      const fitness: FitnessState = 'WEAK'; // 1.25

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // 10 × 0.80 × 1.25 = 10
      expect(adjusted).toBe(10);
    });
  });

  describe('Spec Examples', () => {
    test('Cycle while Rattled = 2 base × 1.30 = 2.6 Fame', () => {
      const baseFame = 2;
      const mojoMod = getMojoFameModifier(-2); // 1.30
      const fitness: FitnessState = 'FIT'; // 1.0

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // 2 × 1.30 × 1.0 = 2.6 → 3
      expect(adjusted).toBe(3);
    });

    test('Cycle while Juiced = 2 base × 0.50 = 1 Fame (before game penalty)', () => {
      const baseFame = 2;
      const mojoMod = getMojoFameModifier(0); // 1.0
      const fitness: FitnessState = 'JUICED'; // 0.50

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // 2 × 1.0 × 0.50 = 1
      expect(adjusted).toBe(1);
    });
  });

  describe('Extreme Combinations', () => {
    test('Best case for Fame: Rattled + Weak', () => {
      const baseFame = 10;
      const mojoMod = getMojoFameModifier(-2); // 1.30
      const fitness: FitnessState = 'WEAK'; // 1.25

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // Maximum possible modifier: 1.30 × 1.25 = 1.625
      expect(adjusted).toBe(16);
    });

    test('Worst case for Fame: Jacked + Juiced', () => {
      const baseFame = 10;
      const mojoMod = getMojoFameModifier(2); // 0.80
      const fitness: FitnessState = 'JUICED'; // 0.50

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // Minimum possible modifier: 0.80 × 0.50 = 0.40
      expect(adjusted).toBe(4);
    });

    test('modifier range is 0.40 to 1.625', () => {
      const minMojo = getMojoFameModifier(2); // 0.80
      const maxMojo = getMojoFameModifier(-2); // 1.30
      const minFitness = getFitnessFameModifier('JUICED'); // 0.50
      const maxFitness = getFitnessFameModifier('WEAK'); // 1.25

      const minCombined = minMojo * minFitness;
      const maxCombined = maxMojo * maxFitness;

      expect(minCombined).toBeCloseTo(0.40, 2);
      expect(maxCombined).toBeCloseTo(1.625, 2);
    });
  });
});

// ============================================
// STAT MODIFIER VS FAME MODIFIER COMPARISON
// ============================================

describe('Stat vs Fame Modifier Philosophy', () => {
  describe('Mojo: Stats Help, Fame Hurts (when high)', () => {
    test('Jacked (+2) gives best stats but least Fame credit', () => {
      const statMult = getMojoStatMultiplier(2);
      const fameMod = getMojoFameModifier(2);

      expect(statMult).toBe(1.18); // Best stats
      expect(fameMod).toBe(0.80); // Least Fame credit
    });

    test('Rattled (-2) gives worst stats but most Fame credit', () => {
      const statMult = getMojoStatMultiplier(-2);
      const fameMod = getMojoFameModifier(-2);

      expect(statMult).toBe(0.82); // Worst stats
      expect(fameMod).toBe(1.30); // Most Fame credit
    });
  });

  describe('Fitness: Stats Help, Fame Hurts (when Juiced)', () => {
    test('Juiced gives best stats but least Fame credit', () => {
      const statMult = getFitnessStatMultiplier('JUICED');
      const fameMod = getFitnessFameModifier('JUICED');

      expect(statMult).toBe(1.20); // Best stats
      expect(fameMod).toBe(0.50); // Half Fame credit (PED stigma)
    });

    test('Weak gives worst playable stats but high Fame credit', () => {
      const statMult = getFitnessStatMultiplier('WEAK');
      const fameMod = getFitnessFameModifier('WEAK');

      expect(statMult).toBe(0.70); // Worst playable stats
      expect(fameMod).toBe(1.25); // High Fame credit
    });
  });

  describe('Combined Stat Multipliers', () => {
    test('Jacked + Juiced = maximum stat boost (1.18 × 1.20)', () => {
      const mojoStat = getMojoStatMultiplier(2);
      const fitnessStat = getFitnessStatMultiplier('JUICED');

      const combined = mojoStat * fitnessStat;

      expect(combined).toBeCloseTo(1.416, 2); // +41.6% boost
    });

    test('Rattled + Weak = minimum playable stats (0.82 × 0.70)', () => {
      const mojoStat = getMojoStatMultiplier(-2);
      const fitnessStat = getFitnessStatMultiplier('WEAK');

      const combined = mojoStat * fitnessStat;

      expect(combined).toBeCloseTo(0.574, 2); // -42.6% penalty
    });
  });
});

// ============================================
// WAR MODIFIER INTEGRATION
// ============================================

describe('WAR Modifier Integration', () => {
  test('Mojo WAR multipliers exist for all levels', () => {
    [-2, -1, 0, 1, 2].forEach(level => {
      const mult = getMojoWARMultiplier(level as MojoLevel);
      expect(mult).toBeGreaterThan(0);
    });
  });

  test('Fitness WAR multipliers exist for all states', () => {
    const states: FitnessState[] = ['JUICED', 'FIT', 'WELL', 'STRAINED', 'WEAK', 'HURT'];
    states.forEach(state => {
      const mult = getFitnessWARMultiplier(state);
      expect(mult).toBeGreaterThanOrEqual(0);
    });
  });

  test('combined WAR multiplier follows similar pattern to Fame', () => {
    // Rattled + Weak should give highest WAR credit
    const mojoWAR = getMojoWARMultiplier(-2); // 1.15
    const fitnessWAR = getFitnessWARMultiplier('WEAK'); // 1.20
    const combined = mojoWAR * fitnessWAR;

    expect(combined).toBeGreaterThan(1.0);
    expect(combined).toBeCloseTo(1.38, 2);
  });

  test('Jacked + Juiced gives lowest WAR credit', () => {
    const mojoWAR = getMojoWARMultiplier(2); // 0.90
    const fitnessWAR = getFitnessWARMultiplier('JUICED'); // 0.85
    const combined = mojoWAR * fitnessWAR;

    expect(combined).toBeLessThan(1.0);
    expect(combined).toBeCloseTo(0.765, 2);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('HURT fitness zeros out Fame', () => {
    const baseFame = 10;
    const mojoMod = getMojoFameModifier(-2); // 1.30
    const fitness: FitnessState = 'HURT'; // 0

    const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

    expect(adjusted).toBe(0);
  });

  test('handles negative base Fame with modifiers', () => {
    const baseFame = -5; // Boner event
    const mojoMod = getMojoFameModifier(-2); // 1.30
    const fitness: FitnessState = 'FIT'; // 1.0

    const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

    // -5 × 1.30 × 1.0 = -6.5 → Math.round(-6.5) = -6 (rounds toward zero)
    expect(adjusted).toBe(-6);
  });

  test('zero base Fame remains zero', () => {
    const baseFame = 0;
    const mojoMod = getMojoFameModifier(2);
    const fitness: FitnessState = 'JUICED';

    const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

    expect(adjusted).toBe(0);
  });

  test('rounding works correctly for edge values', () => {
    // Test rounding at 0.5
    const baseFame = 3;
    const mojoMod = getMojoFameModifier(1); // 0.90
    const fitness: FitnessState = 'FIT'; // 1.0

    const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

    // 3 × 0.90 × 1.0 = 2.7 → 3 (Math.round)
    expect(adjusted).toBe(3);
  });
});

// ============================================
// CONSTANTS VERIFICATION
// ============================================

describe('Constants Verification', () => {
  describe('MOJO_STATES structure', () => {
    test('has all 5 levels', () => {
      expect(Object.keys(MOJO_STATES)).toHaveLength(5);
    });

    test('each state has required properties', () => {
      [-2, -1, 0, 1, 2].forEach(level => {
        const state = MOJO_STATES[level as MojoLevel];
        expect(state.level).toBe(level);
        expect(state.name).toBeDefined();
        expect(state.displayName).toBeDefined();
        expect(state.statMultiplier).toBeDefined();
        expect(state.emoji).toBeDefined();
      });
    });
  });

  describe('FITNESS_STATES structure', () => {
    test('has all 6 states', () => {
      expect(Object.keys(FITNESS_STATES)).toHaveLength(6);
    });

    test('each state has required properties', () => {
      const states: FitnessState[] = ['JUICED', 'FIT', 'WELL', 'STRAINED', 'WEAK', 'HURT'];
      states.forEach(state => {
        const def = FITNESS_STATES[state];
        expect(def.state).toBe(state);
        expect(def.displayName).toBeDefined();
        expect(def.multiplier).toBeDefined();
        expect(def.canPlay).toBeDefined();
        expect(def.injuryChance).toBeDefined();
      });
    });
  });
});

// ============================================
// PRACTICAL SCENARIOS
// ============================================

describe('Practical Scenarios', () => {
  describe('Walk-off HR Fame calculation', () => {
    test('Walk-off HR while Rattled is highly rewarded', () => {
      // Base: Home Run Fame (assume 1.5)
      const baseFame = 1.5;
      const mojoMod = getMojoFameModifier(-2); // 1.30

      // Without considering LI amplification (separate system)
      const adjusted = baseFame * mojoMod;

      expect(adjusted).toBeCloseTo(1.95, 2);
    });

    test('Walk-off HR while Jacked is less impressive', () => {
      const baseFame = 1.5;
      const mojoMod = getMojoFameModifier(2); // 0.80

      const adjusted = baseFame * mojoMod;

      expect(adjusted).toBeCloseTo(1.2, 2);
    });
  });

  describe('Cycle Fame scenarios', () => {
    test('Cycle while Rattled + Strained is heroic', () => {
      const baseFame = 2; // Cycle base
      const mojoMod = getMojoFameModifier(-2); // 1.30
      const fitness: FitnessState = 'STRAINED'; // 1.15

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // 2 × 1.30 × 1.15 = 2.99 → 3
      expect(adjusted).toBe(3);
    });

    test('Cycle while Jacked + Juiced is suspicious', () => {
      const baseFame = 2;
      const mojoMod = getMojoFameModifier(2); // 0.80
      const fitness: FitnessState = 'JUICED'; // 0.50

      const adjusted = calculateAdjustedFame(baseFame, mojoMod, fitness);

      // 2 × 0.80 × 0.50 = 0.8 → 1
      expect(adjusted).toBe(1);
    });
  });

  describe('Error Fame scenarios (negative Fame)', () => {
    test('Error while Rattled has amplified shame', () => {
      const baseFame = -1; // Error penalty
      const mojoMod = getMojoFameModifier(-2); // 1.30

      // Negative events multiplied by high modifier = MORE negative
      const adjusted = baseFame * mojoMod;

      expect(adjusted).toBeCloseTo(-1.3, 2);
    });

    test('Error while Weak shows determination (less shame)', () => {
      const baseFame = -1;
      const fitnessMod = getFitnessFameModifier('WEAK'); // 1.25

      // Positive fame modifier still makes negative more negative
      // BUT: philosophically, playing hurt means less personal blame
      // In practice, the formula still multiplies
      const adjusted = baseFame * fitnessMod;

      // This shows the formula doesn't distinguish - negative × positive = more negative
      // The actual game logic might treat errors differently
      expect(adjusted).toBeCloseTo(-1.25, 2);
    });
  });
});
