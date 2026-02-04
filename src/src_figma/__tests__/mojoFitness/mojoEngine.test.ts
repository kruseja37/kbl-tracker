/**
 * Mojo Engine Tests
 * Phase 4.1 - Mojo System
 *
 * Per MOJO_FITNESS_SYSTEM_SPEC.md Section 2:
 * - 5-level scale from -2 (Rattled) to +2 (Jacked)
 * - Stat multipliers (0.82 to 1.18)
 * - Mojo triggers with base deltas
 * - Situational amplification
 * - 30% carryover between games
 * - "Rattled is sticky" - harder to escape
 */

import { describe, test, expect } from 'vitest';
import {
  // Types
  MojoLevel,
  MojoName,
  MojoTrigger,
  MojoState,
  GameSituation,

  // Constants
  MOJO_STATES,
  MOJO_TRIGGERS,
  MOJO_AMPLIFICATION,
  MOJO_CARRYOVER_RATE,

  // Core Functions
  getMojoState,
  getMojoDisplayName,
  getMojoEmoji,
  clampMojo,
  isValidMojoLevel,

  // Stat Multipliers
  getMojoStatMultiplier,
  applyMojoToStat,
  applyMojoToAllStats,

  // Mojo Change Calculation
  calculateAmplification,
  getMojoDelta,
  applyMojoChange,
  processMojoTriggers,

  // Carryover
  calculateStartingMojo,
  getCarryoverExplanation,

  // Game Tracking
  createMojoEntry,
  updateMojoEntry,
  calculateMojoGameStats,

  // Fame Integration
  getMojoFameModifier,
  getMojoWARMultiplier,
  getMojoClutchMultiplier,

  // Auto-Inference
  inferMojoTriggers,
  suggestMojoChange,

  // Display Helpers
  getMojoColor,
  getMojoBarFill,
  formatMojo,
  getMojoChangeNarrative,
} from '../../../engines/mojoEngine';

// ============================================
// MOJO STATE CONSTANTS
// ============================================

describe('Mojo State Constants', () => {
  describe('Level Bounds', () => {
    test('Minimum level is -2 (Rattled)', () => {
      expect(MOJO_STATES[-2]).toBeDefined();
      expect(MOJO_STATES[-2].name).toBe('RATTLED');
    });

    test('Maximum level is +2 (Jacked)', () => {
      expect(MOJO_STATES[2]).toBeDefined();
      expect(MOJO_STATES[2].name).toBe('JACKED');
    });

    test('Has all 5 levels (-2 to +2)', () => {
      const levels = [-2, -1, 0, 1, 2];
      levels.forEach(level => {
        expect(MOJO_STATES[level as MojoLevel]).toBeDefined();
      });
    });
  });

  describe('State Names', () => {
    test('Rattled at -2', () => {
      expect(MOJO_STATES[-2].name).toBe('RATTLED');
      expect(MOJO_STATES[-2].displayName).toBe('Rattled');
    });

    test('Tense at -1', () => {
      expect(MOJO_STATES[-1].name).toBe('TENSE');
      expect(MOJO_STATES[-1].displayName).toBe('Tense');
    });

    test('Normal at 0', () => {
      expect(MOJO_STATES[0].name).toBe('NORMAL');
      expect(MOJO_STATES[0].displayName).toBe('Normal');
    });

    test('Locked In at +1', () => {
      expect(MOJO_STATES[1].name).toBe('LOCKED_IN');
      expect(MOJO_STATES[1].displayName).toBe('Locked In');
    });

    test('Jacked at +2', () => {
      expect(MOJO_STATES[2].name).toBe('JACKED');
      expect(MOJO_STATES[2].displayName).toBe('Jacked');
    });
  });

  describe('Stat Multipliers', () => {
    test('Rattled (-2) = 0.82× (-18%)', () => {
      expect(MOJO_STATES[-2].statMultiplier).toBe(0.82);
    });

    test('Tense (-1) = 0.90× (-10%)', () => {
      expect(MOJO_STATES[-1].statMultiplier).toBe(0.90);
    });

    test('Normal (0) = 1.00× (baseline)', () => {
      expect(MOJO_STATES[0].statMultiplier).toBe(1.00);
    });

    test('Locked In (+1) = 1.10× (+10%)', () => {
      expect(MOJO_STATES[1].statMultiplier).toBe(1.10);
    });

    test('Jacked (+2) = 1.18× (+18%)', () => {
      expect(MOJO_STATES[2].statMultiplier).toBe(1.18);
    });
  });
});

// ============================================
// MOJO TRIGGER VALUES
// ============================================

describe('Mojo Trigger Values', () => {
  describe('Positive Triggers', () => {
    test('HOME_RUN = +1.5', () => {
      expect(MOJO_TRIGGERS.HOME_RUN.baseDelta).toBe(1.5);
    });

    test('TRIPLE = +1.0', () => {
      expect(MOJO_TRIGGERS.TRIPLE.baseDelta).toBe(1.0);
    });

    test('DOUBLE = +0.75', () => {
      expect(MOJO_TRIGGERS.DOUBLE.baseDelta).toBe(0.75);
    });

    test('SINGLE = +0.5', () => {
      expect(MOJO_TRIGGERS.SINGLE.baseDelta).toBe(0.5);
    });

    test('RBI = +0.5 (stacks with hit)', () => {
      expect(MOJO_TRIGGERS.RBI.baseDelta).toBe(0.5);
    });

    test('STOLEN_BASE = +0.5', () => {
      expect(MOJO_TRIGGERS.STOLEN_BASE.baseDelta).toBe(0.5);
    });

    test('PITCHER_STRIKEOUT = +0.5', () => {
      expect(MOJO_TRIGGERS.PITCHER_STRIKEOUT.baseDelta).toBe(0.5);
    });

    test('PITCHER_CLEAN_INNING = +0.5', () => {
      expect(MOJO_TRIGGERS.PITCHER_CLEAN_INNING.baseDelta).toBe(0.5);
    });
  });

  describe('Negative Triggers', () => {
    test('STRIKEOUT = -0.5', () => {
      expect(MOJO_TRIGGERS.STRIKEOUT.baseDelta).toBe(-0.5);
    });

    test('ERROR = -1.0', () => {
      expect(MOJO_TRIGGERS.ERROR.baseDelta).toBe(-1.0);
    });

    test('CAUGHT_STEALING = -1.0', () => {
      expect(MOJO_TRIGGERS.CAUGHT_STEALING.baseDelta).toBe(-1.0);
    });

    test('PITCHER_RUN = -1.0', () => {
      expect(MOJO_TRIGGERS.PITCHER_RUN.baseDelta).toBe(-1.0);
    });

    test('PITCHER_XBH = -0.75', () => {
      expect(MOJO_TRIGGERS.PITCHER_XBH.baseDelta).toBe(-0.75);
    });

    test('PITCHER_WALK = -0.5', () => {
      expect(MOJO_TRIGGERS.PITCHER_WALK.baseDelta).toBe(-0.5);
    });
  });

  describe('All Triggers Have Descriptions', () => {
    test('every trigger has a description', () => {
      const triggers = Object.values(MOJO_TRIGGERS);
      triggers.forEach(trigger => {
        expect(trigger.description).toBeDefined();
        expect(trigger.description.length).toBeGreaterThan(0);
      });
    });
  });
});

// ============================================
// MOJO AMPLIFICATION
// ============================================

describe('Mojo Amplification Constants', () => {
  test('Playoff game = 1.5×', () => {
    expect(MOJO_AMPLIFICATION.playoffGame).toBe(1.5);
  });

  test('Bases loaded = 1.4×', () => {
    expect(MOJO_AMPLIFICATION.basesLoaded).toBe(1.4);
  });

  test('Tie game late innings = 1.5×', () => {
    expect(MOJO_AMPLIFICATION.tieGameLateInnings).toBe(1.5);
  });

  test('RISP with 2 outs = 1.3×', () => {
    expect(MOJO_AMPLIFICATION.rispTwoOuts).toBe(1.3);
  });

  test('Close game (1-2 runs) = 1.2×', () => {
    expect(MOJO_AMPLIFICATION.closeGame).toBe(1.2);
  });
});

// ============================================
// CARRYOVER RATE
// ============================================

describe('Carryover Rate', () => {
  test('Carryover rate = 30% (NOT 50%)', () => {
    expect(MOJO_CARRYOVER_RATE).toBe(0.3);
  });
});

// ============================================
// CORE FUNCTIONS
// ============================================

describe('Core Mojo Functions', () => {
  describe('getMojoState', () => {
    test('returns correct state for each level', () => {
      expect(getMojoState(-2).name).toBe('RATTLED');
      expect(getMojoState(-1).name).toBe('TENSE');
      expect(getMojoState(0).name).toBe('NORMAL');
      expect(getMojoState(1).name).toBe('LOCKED_IN');
      expect(getMojoState(2).name).toBe('JACKED');
    });
  });

  describe('getMojoDisplayName', () => {
    test('returns correct display names', () => {
      expect(getMojoDisplayName(-2)).toBe('Rattled');
      expect(getMojoDisplayName(0)).toBe('Normal');
      expect(getMojoDisplayName(1)).toBe('Locked In');
    });
  });

  describe('clampMojo', () => {
    test('clamps values above +2 to +2', () => {
      expect(clampMojo(3)).toBe(2);
      expect(clampMojo(5)).toBe(2);
      expect(clampMojo(100)).toBe(2);
    });

    test('clamps values below -2 to -2', () => {
      expect(clampMojo(-3)).toBe(-2);
      expect(clampMojo(-5)).toBe(-2);
      expect(clampMojo(-100)).toBe(-2);
    });

    test('rounds fractional values', () => {
      expect(clampMojo(0.6)).toBe(1);
      expect(clampMojo(0.4)).toBe(0);
      expect(clampMojo(-0.6)).toBe(-1);
    });

    test('preserves valid values', () => {
      expect(clampMojo(-2)).toBe(-2);
      expect(clampMojo(0)).toBe(0);
      expect(clampMojo(2)).toBe(2);
    });
  });

  describe('isValidMojoLevel', () => {
    test('returns true for valid levels', () => {
      expect(isValidMojoLevel(-2)).toBe(true);
      expect(isValidMojoLevel(-1)).toBe(true);
      expect(isValidMojoLevel(0)).toBe(true);
      expect(isValidMojoLevel(1)).toBe(true);
      expect(isValidMojoLevel(2)).toBe(true);
    });

    test('returns false for invalid levels', () => {
      expect(isValidMojoLevel(-3)).toBe(false);
      expect(isValidMojoLevel(3)).toBe(false);
      expect(isValidMojoLevel(0.5)).toBe(false);
    });
  });
});

// ============================================
// STAT MULTIPLIERS
// ============================================

describe('Stat Multiplier Functions', () => {
  describe('getMojoStatMultiplier', () => {
    test('returns correct multipliers', () => {
      expect(getMojoStatMultiplier(-2)).toBe(0.82);
      expect(getMojoStatMultiplier(-1)).toBe(0.90);
      expect(getMojoStatMultiplier(0)).toBe(1.00);
      expect(getMojoStatMultiplier(1)).toBe(1.10);
      expect(getMojoStatMultiplier(2)).toBe(1.18);
    });
  });

  describe('applyMojoToStat', () => {
    test('applies Rattled penalty correctly', () => {
      // 80 * 0.82 = 65.6 → 66
      expect(applyMojoToStat(80, -2)).toBe(66);
    });

    test('applies Jacked bonus correctly', () => {
      // 80 * 1.18 = 94.4 → 94
      expect(applyMojoToStat(80, 2)).toBe(94);
    });

    test('Normal keeps stat unchanged', () => {
      expect(applyMojoToStat(80, 0)).toBe(80);
    });

    test('rounds properly', () => {
      // 75 * 0.82 = 61.49999... (floating point) → 61
      expect(applyMojoToStat(75, -2)).toBe(61);
    });
  });

  describe('applyMojoToAllStats', () => {
    test('applies multiplier to all stats', () => {
      const baseStats = {
        power: 80,
        contact: 70,
        speed: 60,
        fielding: 50,
        arm: 40,
      };

      const jacked = applyMojoToAllStats(baseStats, 2);

      expect(jacked.power).toBe(94);  // 80 * 1.18
      expect(jacked.contact).toBe(83); // 70 * 1.18 = 82.6 → 83
      expect(jacked.speed).toBe(71);  // 60 * 1.18 = 70.8 → 71
      expect(jacked.fielding).toBe(59); // 50 * 1.18 = 59
      expect(jacked.arm).toBe(47);    // 40 * 1.18 = 47.2 → 47
    });

    test('applies to pitcher stats when present', () => {
      const baseStats = {
        power: 20,
        contact: 30,
        speed: 40,
        fielding: 60,
        arm: 70,
        velocity: 80,
        junk: 75,
        accuracy: 85,
      };

      const rattled = applyMojoToAllStats(baseStats, -2);

      expect(rattled.velocity).toBe(66); // 80 * 0.82
      expect(rattled.junk).toBe(61);    // 75 * 0.82 = 61.49... → 61
      expect(rattled.accuracy).toBe(70); // 85 * 0.82 = 69.7 → 70
    });
  });
});

// ============================================
// AMPLIFICATION CALCULATION
// ============================================

describe('calculateAmplification', () => {
  test('baseline situation returns 1.0', () => {
    const situation: GameSituation = {
      inning: 5,
      isBottom: false,
      outs: 1,
      runnersOn: [],
      scoreDiff: 3,
      isPlayoff: false,
    };

    expect(calculateAmplification(situation)).toBe(1.0);
  });

  test('playoff game adds 1.5× multiplier', () => {
    const situation: GameSituation = {
      inning: 5,
      isBottom: false,
      outs: 1,
      runnersOn: [],
      scoreDiff: 3,
      isPlayoff: true,
    };

    expect(calculateAmplification(situation)).toBe(1.5);
  });

  test('tie game in 9th adds 1.5× multiplier', () => {
    const situation: GameSituation = {
      inning: 9,
      isBottom: true,
      outs: 2,
      runnersOn: [],
      scoreDiff: 0,
      isPlayoff: false,
    };

    expect(calculateAmplification(situation)).toBe(1.5);
  });

  test('RISP with 2 outs adds 1.3× multiplier', () => {
    const situation: GameSituation = {
      inning: 5,
      isBottom: false,
      outs: 2,
      runnersOn: [2], // Runner on 2nd
      scoreDiff: 3,
      isPlayoff: false,
    };

    expect(calculateAmplification(situation)).toBe(1.3);
  });

  test('bases loaded adds 1.4× multiplier', () => {
    const situation: GameSituation = {
      inning: 5,
      isBottom: false,
      outs: 1,
      runnersOn: [1, 2, 3],
      scoreDiff: 3,
      isPlayoff: false,
    };

    expect(calculateAmplification(situation)).toBe(1.4);
  });

  test('close game (1-2 runs) adds 1.2× multiplier', () => {
    const situation: GameSituation = {
      inning: 5,
      isBottom: false,
      outs: 1,
      runnersOn: [],
      scoreDiff: 1,
      isPlayoff: false,
    };

    expect(calculateAmplification(situation)).toBe(1.2);
  });

  test('multiple factors stack multiplicatively', () => {
    // Playoff + bases loaded + RISP 2 outs + close game
    const situation: GameSituation = {
      inning: 8,
      isBottom: true,
      outs: 2,
      runnersOn: [1, 2, 3],
      scoreDiff: 1,
      isPlayoff: true,
    };

    // 1.5 (playoff) × 1.4 (bases loaded) × 1.3 (RISP 2 outs) × 1.2 (close)
    const expected = 1.5 * 1.4 * 1.3 * 1.2;
    expect(calculateAmplification(situation)).toBeCloseTo(expected, 5);
  });
});

// ============================================
// MOJO DELTA CALCULATION
// ============================================

describe('getMojoDelta', () => {
  test('returns base delta without situation', () => {
    expect(getMojoDelta('HOME_RUN')).toBe(1.5);
    expect(getMojoDelta('STRIKEOUT')).toBe(-0.5);
  });

  test('applies amplification with situation', () => {
    const playoffSituation: GameSituation = {
      inning: 5,
      isBottom: false,
      outs: 1,
      runnersOn: [],
      scoreDiff: 3,
      isPlayoff: true,
    };

    // 1.5 (HR base) × 1.5 (playoff) = 2.25
    expect(getMojoDelta('HOME_RUN', playoffSituation)).toBe(2.25);
  });

  test('amplifies negative triggers too', () => {
    const clutchSituation: GameSituation = {
      inning: 9,
      isBottom: true,
      outs: 2,
      runnersOn: [2, 3], // RISP
      scoreDiff: 0, // Tied
      isPlayoff: false,
    };

    // -0.5 (K base) × 1.5 (tied late) × 1.3 (RISP 2 outs)
    const expected = -0.5 * 1.5 * 1.3;
    expect(getMojoDelta('STRIKEOUT', clutchSituation)).toBeCloseTo(expected, 5);
  });
});

// ============================================
// APPLYING MOJO CHANGES
// ============================================

describe('applyMojoChange', () => {
  test('increases Mojo on positive trigger', () => {
    const result = applyMojoChange(0, 'HOME_RUN');
    expect(result.newMojo).toBe(2); // 0 + 1.5 = 1.5 → rounds to 2
  });

  test('decreases Mojo on negative trigger', () => {
    const result = applyMojoChange(0, 'ERROR');
    expect(result.newMojo).toBe(-1); // 0 + -1.0 = -1
  });

  test('clamps at maximum +2', () => {
    const result = applyMojoChange(2, 'HOME_RUN');
    expect(result.newMojo).toBe(2);
    expect(result.actualDelta).toBe(0);
  });

  test('clamps at minimum -2', () => {
    const result = applyMojoChange(-2, 'ERROR');
    expect(result.newMojo).toBe(-2);
    expect(result.actualDelta).toBe(0);
  });

  describe('Rattled is Sticky', () => {
    test('positive changes reduced by 30% when Rattled', () => {
      // At -2, trying to increase with HOME_RUN (1.5)
      // Adjusted: 1.5 * 0.7 = 1.05 → rounds to 1
      const result = applyMojoChange(-2, 'HOME_RUN');

      // -2 + 1.05 = -0.95 → rounds to -1
      expect(result.newMojo).toBe(-1);
    });

    test('multiple positive events needed to escape Rattled', () => {
      let mojo: MojoLevel = -2;

      // First HR: -2 + (1.5 * 0.7) = -0.95 → -1
      const result1 = applyMojoChange(mojo, 'HOME_RUN');
      mojo = result1.newMojo;
      expect(mojo).toBe(-1);

      // Second HR (no longer Rattled): -1 + 1.5 = 0.5 → 1
      const result2 = applyMojoChange(mojo, 'HOME_RUN');
      expect(result2.newMojo).toBe(1);
    });
  });

  test('supports custom delta override', () => {
    const result = applyMojoChange(0, 'USER_ADJUSTMENT', undefined, 1);
    expect(result.newMojo).toBe(1);
  });
});

// ============================================
// CARRYOVER CALCULATION
// ============================================

describe('calculateStartingMojo', () => {
  test('+2 ending → +1 starting (2 × 0.3 = 0.6 rounds to 1)', () => {
    expect(calculateStartingMojo(2)).toBe(1);
  });

  test('-2 ending → -1 starting (-2 × 0.3 = -0.6 rounds to -1)', () => {
    expect(calculateStartingMojo(-2)).toBe(-1);
  });

  test('+1 ending → 0 starting (1 × 0.3 = 0.3 rounds to 0)', () => {
    expect(calculateStartingMojo(1)).toBe(0);
  });

  test('-1 ending → 0 starting (-1 × 0.3 = -0.3 rounds to 0)', () => {
    // Math.round(-0.3) = -0 in JavaScript, which is equal to 0 in == comparison
    const result = calculateStartingMojo(-1);
    expect(result == 0).toBe(true);  // -0 == 0 is true
    expect(result >= -1 && result <= 1).toBe(true); // Valid Mojo level
  });

  test('0 ending → 0 starting', () => {
    expect(calculateStartingMojo(0)).toBe(0);
  });
});

describe('getCarryoverExplanation', () => {
  test('provides explanation for positive carryover', () => {
    const result = getCarryoverExplanation(2);
    expect(result.startingMojo).toBe(1);
    expect(result.explanation).toContain('Jacked');
    expect(result.explanation).toContain('30%');
  });

  test('provides explanation for negative carryover', () => {
    const result = getCarryoverExplanation(-2);
    expect(result.startingMojo).toBe(-1);
    expect(result.explanation).toContain('Rattled');
  });

  test('provides explanation for normal', () => {
    const result = getCarryoverExplanation(0);
    expect(result.startingMojo).toBe(0);
    expect(result.explanation).toContain('Normal');
  });
});

// ============================================
// GAME TRACKING
// ============================================

describe('Game Tracking Functions', () => {
  describe('createMojoEntry', () => {
    test('creates entry with initial values', () => {
      const entry = createMojoEntry('game-001', 'player-001', 0);

      expect(entry.gameId).toBe('game-001');
      expect(entry.playerId).toBe('player-001');
      expect(entry.startingMojo).toBe(0);
      expect(entry.endingMojo).toBe(0);
      expect(entry.peakMojo).toBe(0);
      expect(entry.lowMojo).toBe(0);
      expect(entry.events).toHaveLength(0);
    });
  });

  describe('updateMojoEntry', () => {
    test('updates entry with new event', () => {
      const entry = createMojoEntry('game-001', 'player-001', 0);
      const event = {
        playerId: 'player-001',
        gameId: 'game-001',
        previousMojo: 0 as MojoLevel,
        newMojo: 1 as MojoLevel,
        trigger: 'HOME_RUN' as MojoTrigger,
        delta: 1,
        timestamp: Date.now(),
      };

      const updated = updateMojoEntry(entry, event);

      expect(updated.endingMojo).toBe(1);
      expect(updated.peakMojo).toBe(1);
      expect(updated.events).toHaveLength(1);
    });

    test('tracks peak and low Mojo', () => {
      let entry = createMojoEntry('game-001', 'player-001', 0);

      // Go up to +2
      entry = updateMojoEntry(entry, {
        playerId: 'player-001',
        gameId: 'game-001',
        previousMojo: 0,
        newMojo: 2,
        trigger: 'HOME_RUN',
        delta: 2,
        timestamp: Date.now(),
      });

      // Then down to -1
      entry = updateMojoEntry(entry, {
        playerId: 'player-001',
        gameId: 'game-001',
        previousMojo: 2,
        newMojo: -1,
        trigger: 'ERROR',
        delta: -3,
        timestamp: Date.now(),
      });

      expect(entry.peakMojo).toBe(2);
      expect(entry.lowMojo).toBe(-1);
      expect(entry.endingMojo).toBe(-1);
    });
  });

  describe('calculateMojoGameStats', () => {
    test('calculates stats from entry', () => {
      let entry = createMojoEntry('game-001', 'player-001', 0);

      entry = updateMojoEntry(entry, {
        playerId: 'player-001',
        gameId: 'game-001',
        previousMojo: 0,
        newMojo: 1,
        trigger: 'HOME_RUN',
        delta: 1,
        timestamp: Date.now(),
      });

      entry = updateMojoEntry(entry, {
        playerId: 'player-001',
        gameId: 'game-001',
        previousMojo: 1,
        newMojo: 0,
        trigger: 'STRIKEOUT',
        delta: -1,
        timestamp: Date.now(),
      });

      const stats = calculateMojoGameStats(entry);

      expect(stats.startingMojo).toBe(0);
      expect(stats.endingMojo).toBe(0);
      expect(stats.peakMojo).toBe(1);
      expect(stats.lowMojo).toBe(0);
      expect(stats.positiveEvents).toBe(1);
      expect(stats.negativeEvents).toBe(1);
      expect(stats.netChange).toBe(0);
    });
  });
});

// ============================================
// FAME INTEGRATION
// ============================================

describe('Fame Integration', () => {
  describe('getMojoFameModifier', () => {
    test('Rattled gives +30% Fame (hardest to overcome)', () => {
      expect(getMojoFameModifier(-2)).toBe(1.30);
    });

    test('Tense gives +15% Fame', () => {
      expect(getMojoFameModifier(-1)).toBe(1.15);
    });

    test('Normal is baseline', () => {
      expect(getMojoFameModifier(0)).toBe(1.00);
    });

    test('Locked In gives -10% Fame', () => {
      expect(getMojoFameModifier(1)).toBe(0.90);
    });

    test('Jacked gives -20% Fame (easiest)', () => {
      expect(getMojoFameModifier(2)).toBe(0.80);
    });
  });

  describe('getMojoWARMultiplier', () => {
    test('Rattled gives +15% WAR', () => {
      expect(getMojoWARMultiplier(-2)).toBe(1.15);
    });

    test('Normal is baseline', () => {
      expect(getMojoWARMultiplier(0)).toBe(1.00);
    });

    test('Jacked gives -10% WAR', () => {
      expect(getMojoWARMultiplier(2)).toBe(0.90);
    });
  });

  describe('getMojoClutchMultiplier', () => {
    test('Rattled clutch performance gets +30% credit', () => {
      expect(getMojoClutchMultiplier(-2)).toBe(1.30);
    });

    test('Jacked clutch performance gets -15% credit', () => {
      expect(getMojoClutchMultiplier(2)).toBe(0.85);
    });
  });
});

// ============================================
// AUTO-INFERENCE
// ============================================

describe('Auto-Inference', () => {
  describe('inferMojoTriggers', () => {
    test('infers batting triggers', () => {
      expect(inferMojoTriggers({ type: 'BATTING', result: '1B' })).toContain('SINGLE');
      expect(inferMojoTriggers({ type: 'BATTING', result: 'HR' })).toContain('HOME_RUN');
      expect(inferMojoTriggers({ type: 'BATTING', result: 'K' })).toContain('STRIKEOUT');
    });

    test('infers RBI triggers stacking with hits', () => {
      const triggers = inferMojoTriggers({ type: 'BATTING', result: 'HR', rbis: 2 });

      expect(triggers).toContain('HOME_RUN');
      expect(triggers.filter(t => t === 'RBI')).toHaveLength(2);
    });

    test('infers pitching triggers', () => {
      expect(inferMojoTriggers({ type: 'PITCHING', result: 'K' })).toContain('PITCHER_STRIKEOUT');
      expect(inferMojoTriggers({ type: 'PITCHING', result: 'BB' })).toContain('PITCHER_WALK');
      expect(inferMojoTriggers({ type: 'PITCHING', result: 'HR' })).toContain('PITCHER_XBH');
    });

    test('infers clean inning', () => {
      const triggers = inferMojoTriggers({
        type: 'PITCHING',
        result: 'GO',
        isCleanInning: true,
      });

      expect(triggers).toContain('PITCHER_OUT');
      expect(triggers).toContain('PITCHER_CLEAN_INNING');
    });

    test('infers fielding triggers', () => {
      expect(inferMojoTriggers({ type: 'FIELDING', result: 'error', isError: true }))
        .toContain('ERROR');
      expect(inferMojoTriggers({ type: 'FIELDING', result: 'GREAT_PLAY' }))
        .toContain('GREAT_DEFENSIVE_PLAY');
    });
  });

  describe('suggestMojoChange', () => {
    test('suggests increase after good plays', () => {
      const suggestion = suggestMojoChange(0, [
        { type: 'BATTING', result: 'HR', rbis: 2 },
      ]);

      expect(suggestion.suggestedMojo).toBeGreaterThan(0);
      expect(suggestion.triggers).toContain('HOME_RUN');
    });

    test('suggests decrease after bad plays', () => {
      const suggestion = suggestMojoChange(0, [
        { type: 'BATTING', result: 'K' },
        { type: 'FIELDING', result: 'error', isError: true },
      ]);

      expect(suggestion.suggestedMojo).toBeLessThan(0);
    });

    test('provides reason for suggestion', () => {
      const suggestion = suggestMojoChange(0, [
        { type: 'BATTING', result: 'HR', rbis: 4 },
      ]);

      expect(suggestion.reason).toBeDefined();
      expect(suggestion.reason.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// DISPLAY HELPERS
// ============================================

describe('Display Helpers', () => {
  describe('getMojoColor', () => {
    test('Rattled is red', () => {
      expect(getMojoColor(-2)).toBe('#dc2626');
    });

    test('Normal is gray', () => {
      expect(getMojoColor(0)).toBe('#6b7280');
    });

    test('Jacked is green', () => {
      expect(getMojoColor(2)).toBe('#16a34a');
    });
  });

  describe('getMojoBarFill', () => {
    test('-2 maps to 0%', () => {
      expect(getMojoBarFill(-2)).toBe(0);
    });

    test('0 maps to 50%', () => {
      expect(getMojoBarFill(0)).toBe(50);
    });

    test('+2 maps to 100%', () => {
      expect(getMojoBarFill(2)).toBe(100);
    });
  });

  describe('formatMojo', () => {
    test('formats positive Mojo with plus sign', () => {
      expect(formatMojo(2)).toBe('Jacked (+2)');
      expect(formatMojo(1)).toBe('Locked In (+1)');
    });

    test('formats negative Mojo correctly', () => {
      expect(formatMojo(-2)).toBe('Rattled (-2)');
    });

    test('formats zero without sign', () => {
      expect(formatMojo(0)).toBe('Normal (0)');
    });
  });

  describe('getMojoChangeNarrative', () => {
    test('describes increase', () => {
      const narrative = getMojoChangeNarrative(0, 1, 'HOME_RUN');
      expect(narrative).toContain('rises');
      expect(narrative).toContain('home run');
    });

    test('describes decrease', () => {
      const narrative = getMojoChangeNarrative(1, 0, 'STRIKEOUT');
      expect(narrative).toContain('drops');
      expect(narrative).toContain('striking out');
    });

    test('describes staying same', () => {
      const narrative = getMojoChangeNarrative(2, 2, 'SINGLE');
      expect(narrative).toContain('Stays');
    });
  });
});

// ============================================
// PROCESS MULTIPLE TRIGGERS
// ============================================

describe('processMojoTriggers', () => {
  test('processes multiple triggers sequentially', () => {
    const triggers = [
      { trigger: 'HOME_RUN' as MojoTrigger },
      { trigger: 'RBI' as MojoTrigger },
      { trigger: 'RBI' as MojoTrigger },
    ];

    const result = processMojoTriggers(0, triggers, 'game-001', 'player-001');

    // 0 + 1.5 (HR) = 1.5 → 2
    // Then RBIs don't change because already at max
    expect(result.finalMojo).toBe(2);
    expect(result.events.length).toBeGreaterThanOrEqual(1);
  });

  test('tracks all change events', () => {
    // Use triggers that create level changes (not just fractional changes)
    const triggers = [
      { trigger: 'HOME_RUN' as MojoTrigger },  // 0 + 1.5 → +2
      { trigger: 'ERROR' as MojoTrigger },     // +2 - 1.0 → +1
    ];

    const result = processMojoTriggers(0, triggers, 'game-001', 'player-001');

    // Implementation only logs events when Mojo LEVEL changes (actualDelta != 0)
    expect(result.events.length).toBe(2);
    expect(result.finalMojo).toBe(1);
  });

  test('applies situation amplification', () => {
    const clutchSituation: GameSituation = {
      inning: 9,
      isBottom: true,
      outs: 2,
      runnersOn: [2, 3],
      scoreDiff: 0,
      isPlayoff: true,
    };

    const triggers = [
      { trigger: 'HOME_RUN' as MojoTrigger, situation: clutchSituation },
    ];

    const result = processMojoTriggers(-1, triggers, 'game-001', 'player-001');

    // High amplification should push to max
    expect(result.finalMojo).toBe(2);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('handles empty trigger list', () => {
    const result = processMojoTriggers(0, [], 'game-001', 'player-001');

    expect(result.finalMojo).toBe(0);
    expect(result.events).toHaveLength(0);
  });

  test('handles unknown trigger gracefully', () => {
    // USER_ADJUSTMENT has baseDelta of 0
    const delta = getMojoDelta('USER_ADJUSTMENT');
    expect(delta).toBe(0);
  });

  test('consecutive games with carryover', () => {
    // Game 1: Start at 0, end at +2
    let mojo: MojoLevel = 2;

    // Game 2: Start with carryover
    mojo = calculateStartingMojo(mojo);
    expect(mojo).toBe(1);

    // Game 2: End at -2
    mojo = -2;

    // Game 3: Start with carryover from -2
    mojo = calculateStartingMojo(mojo);
    expect(mojo).toBe(-1);
  });
});
