/**
 * Fitness Engine Tests
 * Phase 4.2 - Fitness System
 *
 * Per MOJO_FITNESS_SYSTEM_SPEC.md Section 3:
 * - 6 categorical states from Juiced (120%) to Hurt (0%)
 * - Fitness degrades based on activity (games played, innings pitched)
 * - Recovery happens on rest days
 * - Juiced requires extended rest or special circumstances
 */

import { describe, test, expect } from 'vitest';
import {
  // Types
  FitnessState,
  FitnessDefinition,
  PlayerFitnessProfile,
  GameActivity,
  InjuryRisk,
  PlayerPosition,
  PositionCategory,

  // Constants
  FITNESS_STATES,
  FITNESS_STATE_ORDER,
  FITNESS_DECAY,
  FITNESS_RECOVERY,
  JUICED_REQUIREMENTS,

  // Core Functions
  getFitnessDefinition,
  getFitnessStateFromValue,
  getFitnessValue,
  canPlay,
  isRiskyToPlay,
  getPositionCategory,

  // Stat Multipliers
  getFitnessStatMultiplier,
  applyFitnessToStat,
  applyCombinedMultiplier,

  // Decay Calculation
  calculateFitnessDecay,
  applyFitnessDecay,

  // Recovery Calculation
  calculateDailyRecovery,
  applyRecovery,

  // Juiced Status
  checkJuicedEligibility,
  applyJuicedStatus,
  updateJuicedStatus,

  // Injury Risk
  calculateInjuryRisk,
  rollForInjury,

  // Fame Integration
  getFitnessFameModifier,
  getFitnessWARMultiplier,
  calculateAdjustedFame,

  // Profile Management
  createFitnessProfile,
  createSeasonStartProfile,

  // Recovery Projection
  projectRecovery,

  // Display Helpers
  getFitnessColor,
  getFitnessEmoji,
  getFitnessBarFill,
  formatFitness,
  getFitnessNarrative,
  getJuicedStigmaNarrative,
  getRandomJuicedNarrative,
} from '../../../engines/fitnessEngine';

// ============================================
// HELPER FUNCTIONS
// ============================================

function createMockProfile(overrides: Partial<PlayerFitnessProfile> = {}): PlayerFitnessProfile {
  return {
    playerId: 'player-001',
    currentFitness: 'FIT',
    currentValue: 100,
    position: 'CF',
    traits: [],
    age: 28,
    consecutiveDaysOff: 0,
    lastGamePlayed: '2026-01-01',
    gamesAtJuiced: 0,
    lastJuicedGame: null,
    juicedCooldown: 0,
    recentlyJuiced: false,
    fitnessHistory: [],
    ...overrides,
  };
}

// ============================================
// FITNESS STATE CONSTANTS
// ============================================

describe('Fitness State Constants', () => {
  describe('State Count', () => {
    test('has 6 fitness states', () => {
      expect(Object.keys(FITNESS_STATES)).toHaveLength(6);
    });

    test('state order is from worst to best', () => {
      expect(FITNESS_STATE_ORDER).toEqual([
        'HURT', 'WEAK', 'STRAINED', 'WELL', 'FIT', 'JUICED'
      ]);
    });
  });

  describe('Juiced State', () => {
    test('Juiced has 120 value and 1.20 multiplier', () => {
      expect(FITNESS_STATES.JUICED.value).toBe(120);
      expect(FITNESS_STATES.JUICED.multiplier).toBe(1.20);
    });

    test('Juiced can play', () => {
      expect(FITNESS_STATES.JUICED.canPlay).toBe(true);
    });

    test('Juiced has lowest injury chance (0.5%)', () => {
      expect(FITNESS_STATES.JUICED.injuryChance).toBe(0.005);
    });
  });

  describe('Fit State', () => {
    test('Fit has 100 value and 1.00 multiplier (baseline)', () => {
      expect(FITNESS_STATES.FIT.value).toBe(100);
      expect(FITNESS_STATES.FIT.multiplier).toBe(1.00);
    });

    test('Fit has 1% injury chance', () => {
      expect(FITNESS_STATES.FIT.injuryChance).toBe(0.01);
    });
  });

  describe('Well State', () => {
    test('Well has 80 value and 0.95 multiplier', () => {
      expect(FITNESS_STATES.WELL.value).toBe(80);
      expect(FITNESS_STATES.WELL.multiplier).toBe(0.95);
    });

    test('Well has 2% injury chance', () => {
      expect(FITNESS_STATES.WELL.injuryChance).toBe(0.02);
    });
  });

  describe('Strained State', () => {
    test('Strained has 60 value and 0.85 multiplier', () => {
      expect(FITNESS_STATES.STRAINED.value).toBe(60);
      expect(FITNESS_STATES.STRAINED.multiplier).toBe(0.85);
    });

    test('Strained has 5% injury chance', () => {
      expect(FITNESS_STATES.STRAINED.injuryChance).toBe(0.05);
    });

    test('Strained can play (but risky)', () => {
      expect(FITNESS_STATES.STRAINED.canPlay).toBe(true);
    });
  });

  describe('Weak State', () => {
    test('Weak has 40 value and 0.70 multiplier', () => {
      expect(FITNESS_STATES.WEAK.value).toBe(40);
      expect(FITNESS_STATES.WEAK.multiplier).toBe(0.70);
    });

    test('Weak has 15% injury chance', () => {
      expect(FITNESS_STATES.WEAK.injuryChance).toBe(0.15);
    });

    test('Weak can play (very risky)', () => {
      expect(FITNESS_STATES.WEAK.canPlay).toBe(true);
    });
  });

  describe('Hurt State', () => {
    test('Hurt has 0 value and 0.00 multiplier', () => {
      expect(FITNESS_STATES.HURT.value).toBe(0);
      expect(FITNESS_STATES.HURT.multiplier).toBe(0.00);
    });

    test('Hurt cannot play', () => {
      expect(FITNESS_STATES.HURT.canPlay).toBe(false);
    });
  });
});

// ============================================
// FITNESS DECAY CONSTANTS
// ============================================

describe('Fitness Decay Constants', () => {
  describe('Position Player Decay', () => {
    test('started = -3', () => {
      expect(FITNESS_DECAY.positionPlayer.started).toBe(-3);
    });

    test('pinchHit = -1', () => {
      expect(FITNESS_DECAY.positionPlayer.pinchHit).toBe(-1);
    });

    test('didNotPlay = +2 (recovery)', () => {
      expect(FITNESS_DECAY.positionPlayer.didNotPlay).toBe(2);
    });
  });

  describe('Starting Pitcher Decay', () => {
    test('base = -15', () => {
      expect(FITNESS_DECAY.starter.base).toBe(-15);
    });

    test('perInning = -2', () => {
      expect(FITNESS_DECAY.starter.perInning).toBe(-2);
    });

    test('highPitchCount (100+) = -5 additional', () => {
      expect(FITNESS_DECAY.starter.highPitchCount).toBe(-5);
    });
  });

  describe('Reliever Decay', () => {
    test('base = -5', () => {
      expect(FITNESS_DECAY.reliever.base).toBe(-5);
    });

    test('perInning = -3', () => {
      expect(FITNESS_DECAY.reliever.perInning).toBe(-3);
    });

    test('backToBack = -3', () => {
      expect(FITNESS_DECAY.reliever.backToBack).toBe(-3);
    });
  });

  describe('Closer Decay', () => {
    test('base = -8', () => {
      expect(FITNESS_DECAY.closer.base).toBe(-8);
    });

    test('backToBack = -5', () => {
      expect(FITNESS_DECAY.closer.backToBack).toBe(-5);
    });
  });

  describe('Catcher Decay', () => {
    test('started = -5', () => {
      expect(FITNESS_DECAY.catcher.started).toBe(-5);
    });

    test('perInning = -0.5', () => {
      expect(FITNESS_DECAY.catcher.perInning).toBe(-0.5);
    });

    test('didNotPlay = +3', () => {
      expect(FITNESS_DECAY.catcher.didNotPlay).toBe(3);
    });
  });
});

// ============================================
// FITNESS RECOVERY CONSTANTS
// ============================================

describe('Fitness Recovery Constants', () => {
  test('positionPlayer recovery = 5 per day', () => {
    expect(FITNESS_RECOVERY.positionPlayer).toBe(5);
  });

  test('pitcher recovery = 8 per day', () => {
    expect(FITNESS_RECOVERY.pitcher).toBe(8);
  });

  test('catcher recovery = 6 per day', () => {
    expect(FITNESS_RECOVERY.catcher).toBe(6);
  });

  test('max daily recovery = 15', () => {
    expect(FITNESS_RECOVERY.maxDailyRecovery).toBe(15);
  });

  describe('Trait Modifiers', () => {
    test('Durable = 1.5× (50% faster)', () => {
      expect(FITNESS_RECOVERY.traitModifiers.durable).toBe(1.5);
    });

    test('Injury Prone = 0.7× (30% slower)', () => {
      expect(FITNESS_RECOVERY.traitModifiers.injuryProne).toBe(0.7);
    });
  });

  describe('Consecutive Rest Bonus', () => {
    test('2 days off = 1.1× (10% bonus)', () => {
      expect(FITNESS_RECOVERY.consecutiveRestBonus[2]).toBe(1.1);
    });

    test('3 days off = 1.2× (20% bonus)', () => {
      expect(FITNESS_RECOVERY.consecutiveRestBonus[3]).toBe(1.2);
    });

    test('4+ days off = 1.25× (25% bonus max)', () => {
      expect(FITNESS_RECOVERY.consecutiveRestBonus[4]).toBe(1.25);
    });
  });
});

// ============================================
// JUICED REQUIREMENTS
// ============================================

describe('Juiced Requirements', () => {
  test('minimum 5 consecutive days off', () => {
    expect(JUICED_REQUIREMENTS.minConsecutiveDaysOff).toBe(5);
  });

  test('20 game cooldown', () => {
    expect(JUICED_REQUIREMENTS.cooldownGames).toBe(20);
  });

  describe('Juiced Duration by Source', () => {
    test('extended rest = 3 games', () => {
      expect(JUICED_REQUIREMENTS.duration.extendedRest).toBe(3);
    });

    test('all-star break = 10 games', () => {
      expect(JUICED_REQUIREMENTS.duration.allStarBreak).toBe(10);
    });

    test('season start = 10 games', () => {
      expect(JUICED_REQUIREMENTS.duration.seasonStart).toBe(10);
    });

    test('random event ("Hot Streak") = 5 games', () => {
      expect(JUICED_REQUIREMENTS.duration.randomEvent).toBe(5);
    });
  });
});

// ============================================
// CORE FUNCTIONS
// ============================================

describe('Core Fitness Functions', () => {
  describe('getFitnessDefinition', () => {
    test('returns correct definition for each state', () => {
      expect(getFitnessDefinition('JUICED').multiplier).toBe(1.20);
      expect(getFitnessDefinition('FIT').multiplier).toBe(1.00);
      expect(getFitnessDefinition('HURT').multiplier).toBe(0.00);
    });
  });

  describe('getFitnessStateFromValue', () => {
    test('110+ = JUICED', () => {
      expect(getFitnessStateFromValue(120)).toBe('JUICED');
      expect(getFitnessStateFromValue(110)).toBe('JUICED');
    });

    test('90-109 = FIT', () => {
      expect(getFitnessStateFromValue(100)).toBe('FIT');
      expect(getFitnessStateFromValue(90)).toBe('FIT');
    });

    test('70-89 = WELL', () => {
      expect(getFitnessStateFromValue(80)).toBe('WELL');
      expect(getFitnessStateFromValue(70)).toBe('WELL');
    });

    test('50-69 = STRAINED', () => {
      expect(getFitnessStateFromValue(60)).toBe('STRAINED');
      expect(getFitnessStateFromValue(50)).toBe('STRAINED');
    });

    test('1-49 = WEAK', () => {
      expect(getFitnessStateFromValue(40)).toBe('WEAK');
      expect(getFitnessStateFromValue(1)).toBe('WEAK');
    });

    test('0 = HURT', () => {
      expect(getFitnessStateFromValue(0)).toBe('HURT');
    });
  });

  describe('getFitnessValue', () => {
    test('returns value for each state', () => {
      expect(getFitnessValue('JUICED')).toBe(120);
      expect(getFitnessValue('FIT')).toBe(100);
      expect(getFitnessValue('HURT')).toBe(0);
    });
  });

  describe('canPlay', () => {
    test('all states except HURT can play', () => {
      expect(canPlay('JUICED')).toBe(true);
      expect(canPlay('FIT')).toBe(true);
      expect(canPlay('WELL')).toBe(true);
      expect(canPlay('STRAINED')).toBe(true);
      expect(canPlay('WEAK')).toBe(true);
      expect(canPlay('HURT')).toBe(false);
    });
  });

  describe('isRiskyToPlay', () => {
    test('STRAINED is risky', () => {
      expect(isRiskyToPlay('STRAINED')).toBe(true);
    });

    test('WEAK is risky', () => {
      expect(isRiskyToPlay('WEAK')).toBe(true);
    });

    test('other states are not risky', () => {
      expect(isRiskyToPlay('JUICED')).toBe(false);
      expect(isRiskyToPlay('FIT')).toBe(false);
      expect(isRiskyToPlay('WELL')).toBe(false);
    });
  });

  describe('getPositionCategory', () => {
    test('SP = STARTER_PITCHER', () => {
      expect(getPositionCategory('SP')).toBe('STARTER_PITCHER');
    });

    test('RP = RELIEVER', () => {
      expect(getPositionCategory('RP')).toBe('RELIEVER');
    });

    test('CL = CLOSER', () => {
      expect(getPositionCategory('CL')).toBe('CLOSER');
    });

    test('C = CATCHER', () => {
      expect(getPositionCategory('C')).toBe('CATCHER');
    });

    test('position players = POSITION_PLAYER', () => {
      expect(getPositionCategory('1B')).toBe('POSITION_PLAYER');
      expect(getPositionCategory('SS')).toBe('POSITION_PLAYER');
      expect(getPositionCategory('CF')).toBe('POSITION_PLAYER');
    });
  });
});

// ============================================
// STAT MULTIPLIERS
// ============================================

describe('Stat Multiplier Functions', () => {
  describe('getFitnessStatMultiplier', () => {
    test('returns correct multipliers', () => {
      expect(getFitnessStatMultiplier('JUICED')).toBe(1.20);
      expect(getFitnessStatMultiplier('FIT')).toBe(1.00);
      expect(getFitnessStatMultiplier('WELL')).toBe(0.95);
      expect(getFitnessStatMultiplier('STRAINED')).toBe(0.85);
      expect(getFitnessStatMultiplier('WEAK')).toBe(0.70);
      expect(getFitnessStatMultiplier('HURT')).toBe(0.00);
    });
  });

  describe('applyFitnessToStat', () => {
    test('Juiced increases stat by 20%', () => {
      // 80 * 1.20 = 96
      expect(applyFitnessToStat(80, 'JUICED')).toBe(96);
    });

    test('Fit keeps stat at baseline', () => {
      expect(applyFitnessToStat(80, 'FIT')).toBe(80);
    });

    test('Weak reduces stat by 30%', () => {
      // 80 * 0.70 = 56
      expect(applyFitnessToStat(80, 'WEAK')).toBe(56);
    });

    test('Hurt zeros stat', () => {
      expect(applyFitnessToStat(80, 'HURT')).toBe(0);
    });
  });

  describe('applyCombinedMultiplier', () => {
    test('combines Mojo and Fitness multipliers', () => {
      // base 80, mojo 1.10 (Locked In), fitness JUICED (1.20)
      // 80 * 1.10 * 1.20 = 105.6 → 106
      expect(applyCombinedMultiplier(80, 1.10, 'JUICED')).toBe(106);
    });

    test('Rattled Mojo + Strained Fitness compounds penalty', () => {
      // base 80, mojo 0.82 (Rattled), fitness STRAINED (0.85)
      // 80 * 0.82 * 0.85 = 55.76 → 56
      expect(applyCombinedMultiplier(80, 0.82, 'STRAINED')).toBe(56);
    });
  });
});

// ============================================
// DECAY CALCULATION
// ============================================

describe('calculateFitnessDecay', () => {
  describe('Position Player', () => {
    test('started game = -3', () => {
      const activity: GameActivity = {
        started: true,
        inningsPlayed: 9,
        isPitcher: false,
        position: 'CF',
      };
      expect(calculateFitnessDecay(activity, 100)).toBe(-3);
    });

    test('pinch hit = -1', () => {
      const activity: GameActivity = {
        started: false,
        inningsPlayed: 2,
        isPitcher: false,
        position: 'CF',
      };
      expect(calculateFitnessDecay(activity, 100)).toBe(-1);
    });

    test('did not play = +2 recovery', () => {
      const activity: GameActivity = {
        started: false,
        inningsPlayed: 0,
        isPitcher: false,
        position: 'CF',
      };
      expect(calculateFitnessDecay(activity, 100)).toBe(2);
    });
  });

  describe('Starting Pitcher', () => {
    test('7 innings pitched, normal pitch count', () => {
      const activity: GameActivity = {
        started: true,
        inningsPlayed: 7,
        isPitcher: true,
        pitchCount: 95,
        position: 'SP',
      };
      // base -15 + (7 * -2) = -15 - 14 = -29
      expect(calculateFitnessDecay(activity, 100)).toBe(-29);
    });

    test('7 innings, high pitch count (100+)', () => {
      const activity: GameActivity = {
        started: true,
        inningsPlayed: 7,
        isPitcher: true,
        pitchCount: 110,
        position: 'SP',
      };
      // base -15 + (7 * -2) + -5 (high pitch count) = -34
      expect(calculateFitnessDecay(activity, 100)).toBe(-34);
    });

    test('SP who did not pitch gets recovery', () => {
      const activity: GameActivity = {
        started: false,
        inningsPlayed: 0,
        isPitcher: true,
        position: 'SP',
      };
      expect(calculateFitnessDecay(activity, 100)).toBe(2);
    });
  });

  describe('Reliever', () => {
    test('2 innings pitched', () => {
      const activity: GameActivity = {
        started: false,
        inningsPlayed: 2,
        isPitcher: true,
        position: 'RP',
      };
      // base -5 + (2 * -3) = -5 - 6 = -11
      expect(calculateFitnessDecay(activity, 100)).toBe(-11);
    });

    test('back-to-back appearance', () => {
      const activity: GameActivity = {
        started: false,
        inningsPlayed: 1,
        isPitcher: true,
        position: 'RP',
        isBackToBack: true,
      };
      // base -5 + (1 * -3) + -3 (b2b) = -11
      expect(calculateFitnessDecay(activity, 100)).toBe(-11);
    });

    test('RP who did not pitch gets enhanced recovery', () => {
      const activity: GameActivity = {
        started: false,
        inningsPlayed: 0,
        isPitcher: true,
        position: 'RP',
      };
      // positionPlayer.didNotPlay * 1.5 = 2 * 1.5 = 3
      expect(calculateFitnessDecay(activity, 100)).toBe(3);
    });
  });

  describe('Closer', () => {
    test('1 inning save', () => {
      const activity: GameActivity = {
        started: false,
        inningsPlayed: 1,
        isPitcher: true,
        position: 'CL',
      };
      // base -8 + (1 * -2) = -10
      expect(calculateFitnessDecay(activity, 100)).toBe(-10);
    });

    test('back-to-back adds -5', () => {
      const activity: GameActivity = {
        started: false,
        inningsPlayed: 1,
        isPitcher: true,
        position: 'CL',
        isBackToBack: true,
      };
      // base -8 + (1 * -2) + -5 = -15
      expect(calculateFitnessDecay(activity, 100)).toBe(-15);
    });
  });

  describe('Catcher', () => {
    test('started game (9 innings)', () => {
      const activity: GameActivity = {
        started: true,
        inningsPlayed: 9,
        isPitcher: false,
        position: 'C',
      };
      // base -5 + (9 * -0.5) = -5 - 4.5 = -9.5
      expect(calculateFitnessDecay(activity, 100)).toBe(-9.5);
    });

    test('catcher did not play = +3', () => {
      const activity: GameActivity = {
        started: false,
        inningsPlayed: 0,
        isPitcher: false,
        position: 'C',
      };
      expect(calculateFitnessDecay(activity, 100)).toBe(3);
    });
  });
});

describe('applyFitnessDecay', () => {
  test('reduces fitness value correctly', () => {
    const profile = createMockProfile({ currentValue: 100 });
    const activity: GameActivity = {
      started: true,
      inningsPlayed: 9,
      isPitcher: false,
      position: 'CF',
    };

    const updated = applyFitnessDecay(profile, activity, '2026-01-02');

    expect(updated.currentValue).toBe(97); // 100 + -3
    expect(updated.currentFitness).toBe('FIT');
    expect(updated.lastGamePlayed).toBe('2026-01-02');
    expect(updated.consecutiveDaysOff).toBe(0);
  });

  test('changes state when crossing threshold', () => {
    const profile = createMockProfile({ currentValue: 92, currentFitness: 'FIT' });
    const activity: GameActivity = {
      started: true,
      inningsPlayed: 9,
      isPitcher: false,
      position: 'CF',
    };

    const updated = applyFitnessDecay(profile, activity, '2026-01-02');

    expect(updated.currentValue).toBe(89); // 92 - 3
    expect(updated.currentFitness).toBe('WELL');
  });

  test('clamps at 0 minimum', () => {
    const profile = createMockProfile({
      currentValue: 20,
      currentFitness: 'WEAK',
      position: 'SP',
    });
    const activity: GameActivity = {
      started: true,
      inningsPlayed: 7,
      isPitcher: true,
      pitchCount: 110,
      position: 'SP',
    };

    const updated = applyFitnessDecay(profile, activity, '2026-01-02');

    expect(updated.currentValue).toBe(0); // 20 - 34 = -14 → clamped to 0
    expect(updated.currentFitness).toBe('HURT');
  });

  test('adds history entry', () => {
    const profile = createMockProfile();
    const activity: GameActivity = {
      started: true,
      inningsPlayed: 9,
      isPitcher: false,
      position: 'CF',
    };

    const updated = applyFitnessDecay(profile, activity, '2026-01-02');

    expect(updated.fitnessHistory.length).toBe(1);
    expect(updated.fitnessHistory[0].date).toBe('2026-01-02');
    expect(updated.fitnessHistory[0].reason).toBe('GAME_PLAYED');
  });
});

// ============================================
// RECOVERY CALCULATION
// ============================================

describe('calculateDailyRecovery', () => {
  test('position player base recovery = 5', () => {
    expect(calculateDailyRecovery('CF', [], 0)).toBe(5);
  });

  test('pitcher base recovery = 8', () => {
    expect(calculateDailyRecovery('SP', [], 0)).toBe(8);
  });

  test('catcher base recovery = 6', () => {
    expect(calculateDailyRecovery('C', [], 0)).toBe(6);
  });

  test('Durable trait = 1.5× recovery', () => {
    const recovery = calculateDailyRecovery('CF', ['Durable'], 0);
    expect(recovery).toBe(7.5); // 5 * 1.5
  });

  test('Injury Prone trait = 0.7× recovery', () => {
    const recovery = calculateDailyRecovery('CF', ['Injury Prone'], 0);
    expect(recovery).toBeCloseTo(3.5); // 5 * 0.7
  });

  test('2 consecutive days off = 10% bonus', () => {
    const recovery = calculateDailyRecovery('CF', [], 2);
    expect(recovery).toBe(5.5); // 5 * 1.1
  });

  test('3 consecutive days off = 20% bonus', () => {
    const recovery = calculateDailyRecovery('CF', [], 3);
    expect(recovery).toBe(6); // 5 * 1.2
  });

  test('4+ consecutive days off = 25% bonus (max)', () => {
    const recovery = calculateDailyRecovery('CF', [], 4);
    expect(recovery).toBe(6.25); // 5 * 1.25
    expect(calculateDailyRecovery('CF', [], 10)).toBe(6.25); // Still 25%
  });

  test('caps at max daily recovery (15)', () => {
    // Durable pitcher with 4 days off: 8 * 1.5 * 1.25 = 15
    const recovery = calculateDailyRecovery('SP', ['Durable'], 4);
    expect(recovery).toBe(15);
  });
});

describe('applyRecovery', () => {
  test('increases fitness value', () => {
    const profile = createMockProfile({
      currentValue: 80,
      currentFitness: 'WELL',
      position: 'CF',
      consecutiveDaysOff: 0,
    });

    const updated = applyRecovery(profile, '2026-01-02');

    expect(updated.currentValue).toBe(85); // 80 + 5
    expect(updated.consecutiveDaysOff).toBe(1);
  });

  test('cannot exceed 100 (Fit) through normal recovery', () => {
    const profile = createMockProfile({
      currentValue: 98,
      currentFitness: 'FIT',
    });

    const updated = applyRecovery(profile, '2026-01-02');

    expect(updated.currentValue).toBe(100); // Capped at Fit
  });

  test('adds recovery history entry', () => {
    const profile = createMockProfile();
    const updated = applyRecovery(profile, '2026-01-02');

    expect(updated.fitnessHistory.length).toBe(1);
    expect(updated.fitnessHistory[0].reason).toBe('RECOVERY');
  });
});

// ============================================
// JUICED STATUS
// ============================================

describe('Juiced Status Functions', () => {
  describe('checkJuicedEligibility', () => {
    test('eligible when Fit and 5+ days rest, no recent Juiced', () => {
      const profile = createMockProfile({
        currentValue: 100,
        consecutiveDaysOff: 5,
        recentlyJuiced: false,
        juicedCooldown: 0,
      });

      expect(checkJuicedEligibility(profile)).toBe(true);
    });

    test('not eligible if not at Fit (100+)', () => {
      const profile = createMockProfile({
        currentValue: 90,
        consecutiveDaysOff: 5,
        recentlyJuiced: false,
      });

      expect(checkJuicedEligibility(profile)).toBe(false);
    });

    test('not eligible if fewer than 5 days rest', () => {
      const profile = createMockProfile({
        currentValue: 100,
        consecutiveDaysOff: 4,
        recentlyJuiced: false,
      });

      expect(checkJuicedEligibility(profile)).toBe(false);
    });

    test('not eligible if recently Juiced', () => {
      const profile = createMockProfile({
        currentValue: 100,
        consecutiveDaysOff: 5,
        recentlyJuiced: true,
      });

      expect(checkJuicedEligibility(profile)).toBe(false);
    });

    test('not eligible if cooldown active', () => {
      const profile = createMockProfile({
        currentValue: 100,
        consecutiveDaysOff: 5,
        recentlyJuiced: false,
        juicedCooldown: 10,
      });

      expect(checkJuicedEligibility(profile)).toBe(false);
    });
  });

  describe('applyJuicedStatus', () => {
    test('sets player to Juiced state', () => {
      const profile = createMockProfile();
      const updated = applyJuicedStatus(profile, '2026-01-02', 5, 'Hot Streak');

      expect(updated.currentFitness).toBe('JUICED');
      expect(updated.currentValue).toBe(120);
      expect(updated.recentlyJuiced).toBe(true);
      expect(updated.juicedCooldown).toBe(20);
      expect(updated.gamesAtJuiced).toBe(0);
    });

    test('adds history entry with reason', () => {
      const profile = createMockProfile();
      const updated = applyJuicedStatus(profile, '2026-01-02', 5, 'Hot Streak');

      expect(updated.fitnessHistory[0].details).toBe('Hot Streak');
      expect(updated.fitnessHistory[0].state).toBe('JUICED');
    });
  });

  describe('updateJuicedStatus', () => {
    test('decrements cooldown', () => {
      const profile = createMockProfile({
        juicedCooldown: 10,
        recentlyJuiced: true,
      });

      const updated = updateJuicedStatus(profile, false);

      expect(updated.juicedCooldown).toBe(9);
    });

    test('clears recentlyJuiced when cooldown reaches 0', () => {
      const profile = createMockProfile({
        juicedCooldown: 1,
        recentlyJuiced: true,
      });

      const updated = updateJuicedStatus(profile, false);

      expect(updated.juicedCooldown).toBe(0);
      expect(updated.recentlyJuiced).toBe(false);
    });

    test('tracks games played while Juiced', () => {
      const profile = createMockProfile({
        currentFitness: 'JUICED',
        gamesAtJuiced: 0,
      });

      const updated = updateJuicedStatus(profile, true);

      expect(updated.gamesAtJuiced).toBe(1);
    });
  });
});

// ============================================
// INJURY RISK
// ============================================

describe('Injury Risk Functions', () => {
  describe('calculateInjuryRisk', () => {
    test('JUICED has lowest base risk', () => {
      const profile = createMockProfile({ currentFitness: 'JUICED' });
      const risk = calculateInjuryRisk(profile);

      expect(risk.chance).toBeLessThan(0.01);
      expect(risk.riskLevel).toBe('LOW');
    });

    test('WEAK has elevated risk', () => {
      const profile = createMockProfile({ currentFitness: 'WEAK' });
      const risk = calculateInjuryRisk(profile);

      expect(risk.chance).toBeGreaterThanOrEqual(0.10);
      expect(risk.riskLevel).toBe('EXTREME');
    });

    test('catchers have 1.3× risk modifier', () => {
      const positionPlayer = createMockProfile({
        currentFitness: 'FIT',
        position: 'CF',
      });
      const catcher = createMockProfile({
        currentFitness: 'FIT',
        position: 'C',
      });

      const posRisk = calculateInjuryRisk(positionPlayer);
      const catcherRisk = calculateInjuryRisk(catcher);

      expect(catcherRisk.chance).toBeCloseTo(posRisk.chance * 1.3);
    });

    test('pitchers have 1.1× risk modifier', () => {
      const positionPlayer = createMockProfile({
        currentFitness: 'FIT',
        position: 'CF',
      });
      const pitcher = createMockProfile({
        currentFitness: 'FIT',
        position: 'SP',
      });

      const posRisk = calculateInjuryRisk(positionPlayer);
      const pitcherRisk = calculateInjuryRisk(pitcher);

      expect(pitcherRisk.chance).toBeCloseTo(posRisk.chance * 1.1);
    });

    test('Durable trait reduces risk by 40%', () => {
      const normalPlayer = createMockProfile({ currentFitness: 'FIT' });
      const durablePlayer = createMockProfile({
        currentFitness: 'FIT',
        traits: ['Durable'],
      });

      const normalRisk = calculateInjuryRisk(normalPlayer);
      const durableRisk = calculateInjuryRisk(durablePlayer);

      expect(durableRisk.chance).toBeCloseTo(normalRisk.chance * 0.6);
    });

    test('Injury Prone trait increases risk by 80%', () => {
      const normalPlayer = createMockProfile({ currentFitness: 'FIT' });
      const fragilePlayer = createMockProfile({
        currentFitness: 'FIT',
        traits: ['Injury Prone'],
      });

      const normalRisk = calculateInjuryRisk(normalPlayer);
      const fragileRisk = calculateInjuryRisk(fragilePlayer);

      expect(fragileRisk.chance).toBeCloseTo(normalRisk.chance * 1.8);
    });

    test('age 35+ increases risk by 30%', () => {
      const youngPlayer = createMockProfile({ age: 28, currentFitness: 'FIT' });
      const olderPlayer = createMockProfile({ age: 35, currentFitness: 'FIT' });

      const youngRisk = calculateInjuryRisk(youngPlayer);
      const olderRisk = calculateInjuryRisk(olderPlayer);

      expect(olderRisk.chance).toBeCloseTo(youngRisk.chance * 1.3);
    });

    test('age 38+ increases risk by 60%', () => {
      const youngPlayer = createMockProfile({ age: 28, currentFitness: 'FIT' });
      const oldPlayer = createMockProfile({ age: 38, currentFitness: 'FIT' });

      const youngRisk = calculateInjuryRisk(youngPlayer);
      const oldRisk = calculateInjuryRisk(oldPlayer);

      expect(oldRisk.chance).toBeCloseTo(youngRisk.chance * 1.6);
    });

    test('provides appropriate recommendation', () => {
      const weakProfile = createMockProfile({ currentFitness: 'WEAK' });
      const risk = calculateInjuryRisk(weakProfile);

      expect(risk.recommendation).toContain('rest');
    });
  });

  describe('rollForInjury', () => {
    test('returns boolean', () => {
      const risk: InjuryRisk = {
        chance: 0.5,
        severityModifier: 1,
        riskLevel: 'MODERATE',
        recommendation: 'Test',
      };

      const result = rollForInjury(risk);
      expect(typeof result).toBe('boolean');
    });
  });
});

// ============================================
// FAME INTEGRATION
// ============================================

describe('Fame Integration', () => {
  describe('getFitnessFameModifier', () => {
    test('JUICED = 50% Fame (PED stigma)', () => {
      expect(getFitnessFameModifier('JUICED')).toBe(0.5);
    });

    test('FIT = baseline (1.0)', () => {
      expect(getFitnessFameModifier('FIT')).toBe(1.0);
    });

    test('WELL = baseline (no penalty)', () => {
      expect(getFitnessFameModifier('WELL')).toBe(1.0);
    });

    test('STRAINED = +15% ("playing hurt")', () => {
      expect(getFitnessFameModifier('STRAINED')).toBe(1.15);
    });

    test('WEAK = +25% ("gutsy performance")', () => {
      expect(getFitnessFameModifier('WEAK')).toBe(1.25);
    });

    test('HURT = 0 (cannot play)', () => {
      expect(getFitnessFameModifier('HURT')).toBe(0);
    });
  });

  describe('getFitnessWARMultiplier', () => {
    test('JUICED = -15% WAR (enhanced performance)', () => {
      expect(getFitnessWARMultiplier('JUICED')).toBe(0.85);
    });

    test('FIT = baseline', () => {
      expect(getFitnessWARMultiplier('FIT')).toBe(1.0);
    });

    test('STRAINED = +10% WAR (playing through pain)', () => {
      expect(getFitnessWARMultiplier('STRAINED')).toBe(1.10);
    });

    test('WEAK = +20% WAR (gutsy performance)', () => {
      expect(getFitnessWARMultiplier('WEAK')).toBe(1.20);
    });
  });

  describe('calculateAdjustedFame', () => {
    test('applies both Mojo and Fitness modifiers', () => {
      // baseFame 10, Mojo 1.3 (Rattled), Fitness WEAK (1.25)
      // 10 * 1.3 * 1.25 = 16.25 → 16
      expect(calculateAdjustedFame(10, 1.3, 'WEAK')).toBe(16);
    });

    test('Juiced heavily penalizes Fame', () => {
      // baseFame 10, Mojo 0.8 (Jacked), Fitness JUICED (0.5)
      // 10 * 0.8 * 0.5 = 4
      expect(calculateAdjustedFame(10, 0.8, 'JUICED')).toBe(4);
    });
  });
});

// ============================================
// PROFILE MANAGEMENT
// ============================================

describe('Profile Management', () => {
  describe('createFitnessProfile', () => {
    test('creates profile with default values', () => {
      const profile = createFitnessProfile('player-001', 'CF');

      expect(profile.playerId).toBe('player-001');
      expect(profile.position).toBe('CF');
      expect(profile.currentFitness).toBe('FIT');
      expect(profile.currentValue).toBe(100);
      expect(profile.age).toBe(25);
      expect(profile.fitnessHistory).toHaveLength(1);
      expect(profile.fitnessHistory[0].reason).toBe('SEASON_START');
    });

    test('accepts custom starting values', () => {
      const profile = createFitnessProfile(
        'player-001',
        'SP',
        ['Durable'],
        30,
        'WELL'
      );

      expect(profile.traits).toEqual(['Durable']);
      expect(profile.age).toBe(30);
      expect(profile.currentFitness).toBe('WELL');
      expect(profile.currentValue).toBe(80);
    });
  });

  describe('createSeasonStartProfile', () => {
    test('starts all players Juiced for first 10 games', () => {
      const profile = createSeasonStartProfile('player-001', 'CF');

      expect(profile.currentFitness).toBe('JUICED');
      expect(profile.currentValue).toBe(120);
      expect(profile.juicedCooldown).toBe(10); // Duration
      expect(profile.recentlyJuiced).toBe(false); // Fresh season
      expect(profile.fitnessHistory[0].details).toContain('first 10 games');
    });
  });
});

// ============================================
// RECOVERY PROJECTION
// ============================================

describe('projectRecovery', () => {
  test('calculates days to Fit', () => {
    const profile = createMockProfile({
      currentValue: 70, // WELL
      currentFitness: 'WELL',
    });

    const projection = projectRecovery(profile);

    // (100 - 70) / 5 = 6 days
    expect(projection.daysToFit).toBe(6);
  });

  test('already Fit has 0 days to Fit', () => {
    const profile = createMockProfile({
      currentValue: 100,
      currentFitness: 'FIT',
    });

    const projection = projectRecovery(profile);
    expect(projection.daysToFit).toBe(0);
  });

  test('calculates days to Juiced when eligible', () => {
    const profile = createMockProfile({
      currentValue: 100,
      currentFitness: 'FIT',
      consecutiveDaysOff: 2,
      recentlyJuiced: false,
    });

    const projection = projectRecovery(profile);

    // Need 5 consecutive days off, have 2, so 3 more
    expect(projection.daysToJuiced).toBe(3);
  });

  test('daysToJuiced null when on cooldown', () => {
    const profile = createMockProfile({
      currentValue: 100,
      currentFitness: 'FIT',
      consecutiveDaysOff: 5,
      recentlyJuiced: true,
    });

    const projection = projectRecovery(profile);
    expect(projection.daysToJuiced).toBeNull();
  });

  test('provides recommended rest days by fitness', () => {
    const strainedProfile = createMockProfile({
      currentValue: 60,
      currentFitness: 'STRAINED',
    });
    const weakProfile = createMockProfile({
      currentValue: 40,
      currentFitness: 'WEAK',
    });

    expect(projectRecovery(strainedProfile).recommendedRestDays).toBe(2);
    expect(projectRecovery(weakProfile).recommendedRestDays).toBe(4);
  });
});

// ============================================
// DISPLAY HELPERS
// ============================================

describe('Display Helpers', () => {
  describe('getFitnessColor', () => {
    test('JUICED is purple', () => {
      expect(getFitnessColor('JUICED')).toBe('#a855f7');
    });

    test('FIT is green', () => {
      expect(getFitnessColor('FIT')).toBe('#22c55e');
    });

    test('HURT is red', () => {
      expect(getFitnessColor('HURT')).toBe('#dc2626');
    });
  });

  describe('getFitnessEmoji', () => {
    test('JUICED emoji', () => {
      expect(getFitnessEmoji('JUICED')).toBe('💉');
    });

    test('FIT emoji', () => {
      expect(getFitnessEmoji('FIT')).toBe('✓');
    });

    test('HURT emoji', () => {
      expect(getFitnessEmoji('HURT')).toBe('🏥');
    });
  });

  describe('getFitnessBarFill', () => {
    test('120 maps to 100%', () => {
      expect(getFitnessBarFill(120)).toBe(100);
    });

    test('60 maps to 50%', () => {
      expect(getFitnessBarFill(60)).toBe(50);
    });

    test('0 maps to 0%', () => {
      expect(getFitnessBarFill(0)).toBe(0);
    });
  });

  describe('formatFitness', () => {
    test('formats with emoji and name', () => {
      expect(formatFitness('JUICED')).toBe('💉 Juiced');
      expect(formatFitness('FIT')).toBe('✓ Fit');
      expect(formatFitness('HURT')).toBe('🏥 Hurt');
    });
  });

  describe('getFitnessNarrative', () => {
    test('provides narrative for each state', () => {
      const juicedNarrative = getFitnessNarrative('JUICED', 'Mike');
      expect(juicedNarrative).toContain('peak');
      expect(juicedNarrative).toContain('Mike');

      const hurtNarrative = getFitnessNarrative('HURT', 'Mike');
      expect(hurtNarrative).toContain('injured');
    });
  });

  describe('getJuicedStigmaNarrative', () => {
    test('returns array of narratives', () => {
      const narratives = getJuicedStigmaNarrative();

      expect(Array.isArray(narratives)).toBe(true);
      expect(narratives.length).toBeGreaterThan(0);
      narratives.forEach(n => {
        expect(n).toContain('{player}');
      });
    });
  });

  describe('getRandomJuicedNarrative', () => {
    test('replaces {player} with name', () => {
      const narrative = getRandomJuicedNarrative('Mike');
      expect(narrative).toContain('Mike');
      expect(narrative).not.toContain('{player}');
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('fitness value clamped at 0', () => {
    const profile = createMockProfile({ currentValue: 5 });
    const activity: GameActivity = {
      started: true,
      inningsPlayed: 9,
      isPitcher: true,
      pitchCount: 120,
      position: 'SP',
    };

    const updated = applyFitnessDecay(profile, activity, '2026-01-02');

    expect(updated.currentValue).toBe(0);
    expect(updated.currentFitness).toBe('HURT');
  });

  test('fitness value clamped at 120', () => {
    const profile = createMockProfile({
      currentValue: 120,
      currentFitness: 'JUICED',
    });

    // Even with high recovery, can't exceed 120
    // (but applyRecovery caps at 100 anyway)
    const activity: GameActivity = {
      started: false,
      inningsPlayed: 0,
      isPitcher: false,
      position: 'CF',
    };

    const updated = applyFitnessDecay(profile, activity, '2026-01-02');
    expect(updated.currentValue).toBeLessThanOrEqual(120);
  });

  test('handles empty traits array', () => {
    const recovery = calculateDailyRecovery('CF', [], 0);
    expect(recovery).toBe(5);
  });

  test('handles unknown position gracefully', () => {
    const category = getPositionCategory('DH' as PlayerPosition);
    expect(category).toBe('POSITION_PLAYER');
  });
});
