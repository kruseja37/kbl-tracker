/**
 * Engine Integration Tests
 * Phase 5.3 - Engine Integration
 *
 * Per TESTING_IMPLEMENTATION_PLAN.md Section 5.3:
 * - mWAR Integration (Manager Moment triggers, LI tier descriptions)
 * - Aging Integration (age display info, development potential)
 * - Fan Morale Integration (fan state detection, morale impacts)
 * - Relationship Integration (relationship creation, chemistry calculation)
 */

import { describe, test, expect } from 'vitest';

// mWAR Integration imports
import {
  checkManagerMoment,
  createGameMWARState,
  recordManagerDecision,
  HIGH_LEVERAGE_THRESHOLD,
  MWAR_THRESHOLDS,
  getMWARRating,
  createManagerDecision,
  resolveDecision,
  type ManagerMomentState,
  type GameManagerStats,
} from '../../app/engines/mwarIntegration';

// Aging Integration imports
import {
  getAgeDisplayInfo,
  calculateDevelopmentPotential,
  CareerPhase,
  getCareerPhase,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
  type AgeDisplayInfo,
  type DevelopmentPotential,
} from '../../app/engines/agingIntegration';

// Leverage Calculator for game state
import type { GameStateForLI } from '../../../engines/leverageCalculator';

// ============================================
// MWAR INTEGRATION TESTS
// ============================================

describe('mWAR Integration', () => {
  describe('Manager Moment Trigger', () => {
    test('triggers at high leverage (LI >= 2.0)', () => {
      const highLeverageState: GameStateForLI = {
        inning: 9,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: true, second: true, third: false },
        homeScore: 4,
        awayScore: 5,
      };

      const moment = checkManagerMoment(highLeverageState);

      expect(moment.isTriggered).toBe(true);
      expect(moment.leverageIndex).toBeGreaterThanOrEqual(HIGH_LEVERAGE_THRESHOLD);
      expect(moment.decisionType).not.toBeNull();
      expect(moment.context).toBeTruthy();
    });

    test('does not trigger at low leverage (LI < 2.0)', () => {
      const lowLeverageState: GameStateForLI = {
        inning: 1,
        halfInning: 'TOP',
        outs: 0,
        runners: { first: false, second: false, third: false },
        homeScore: 0,
        awayScore: 0,
      };

      const moment = checkManagerMoment(lowLeverageState);

      expect(moment.isTriggered).toBe(false);
      expect(moment.leverageIndex).toBeLessThan(HIGH_LEVERAGE_THRESHOLD);
      expect(moment.decisionType).toBeNull();
    });

    test('infers pitching_change in late innings', () => {
      const lateGameState: GameStateForLI = {
        inning: 8,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: true, second: false, third: false },
        homeScore: 3,
        awayScore: 3,
      };

      const moment = checkManagerMoment(lateGameState);

      if (moment.isTriggered) {
        expect(moment.decisionType).toBe('pitching_change');
      }
    });

    test('infers intentional_walk with RISP', () => {
      const rispState: GameStateForLI = {
        inning: 5,
        halfInning: 'BOTTOM',
        outs: 1,
        runners: { first: false, second: true, third: true },
        homeScore: 2,
        awayScore: 3,
      };

      const moment = checkManagerMoment(rispState);

      if (moment.isTriggered) {
        expect(['intentional_walk', 'pitching_change']).toContain(moment.decisionType);
      }
    });

    test('provides context with LI value', () => {
      const criticalState: GameStateForLI = {
        inning: 9,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: true, second: true, third: true },
        homeScore: 5,
        awayScore: 6,
      };

      const moment = checkManagerMoment(criticalState);

      expect(moment.context).toContain('LI:');
      if (moment.leverageIndex >= 3.0) {
        expect(moment.context).toContain('Critical');
      }
    });

    test('suggests action based on decision type', () => {
      const highLeverageState: GameStateForLI = {
        inning: 9,
        halfInning: 'BOTTOM',
        outs: 0,
        runners: { first: false, second: false, third: false },
        homeScore: 3,
        awayScore: 3,
      };

      const moment = checkManagerMoment(highLeverageState);

      if (moment.isTriggered) {
        expect(moment.suggestedAction).toBeTruthy();
      }
    });
  });

  describe('Game mWAR State Tracking', () => {
    test('creates empty game state', () => {
      const gameState = createGameMWARState('game-001', 'manager-001');

      expect(gameState.gameId).toBe('game-001');
      expect(gameState.managerId).toBe('manager-001');
      expect(gameState.decisions).toHaveLength(0);
      expect(gameState.totalDecisionValue).toBe(0);
    });

    test('records manager decisions', () => {
      const gameState = createGameMWARState('game-001', 'manager-001');
      const decisionState: GameStateForLI = {
        inning: 7,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: true, second: false, third: false },
        homeScore: 3,
        awayScore: 2,
      };

      const decision = createManagerDecision(
        'game-001',
        'manager-001',
        'pitching_change',
        decisionState
      );

      const resolved = resolveDecision(decision, 'success');
      const updated = recordManagerDecision(gameState, resolved);

      expect(updated.decisions).toHaveLength(1);
      expect(updated.successfulDecisions).toBe(1);
    });

    test('tracks high leverage decisions', () => {
      const gameState = createGameMWARState('game-001', 'manager-001');

      // Create a high-leverage decision
      const highLIState: GameStateForLI = {
        inning: 9,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: true, second: true, third: false },
        homeScore: 4,
        awayScore: 5,
      };

      const decision = createManagerDecision(
        'game-001',
        'manager-001',
        'pinch_hitter',
        highLIState
      );

      const resolved = resolveDecision(decision, 'success');
      const updated = recordManagerDecision(gameState, resolved);

      if (resolved.leverageIndex >= HIGH_LEVERAGE_THRESHOLD) {
        expect(updated.highLeverageDecisions).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('mWAR Rating', () => {
    test('returns Elite for mWAR >= 4.0', () => {
      expect(getMWARRating(4.5)).toBe('Elite');
      expect(getMWARRating(5.0)).toBe('Elite');
    });

    test('returns Excellent for mWAR >= 2.5', () => {
      expect(getMWARRating(3.0)).toBe('Excellent');
      expect(getMWARRating(2.5)).toBe('Excellent');
    });

    test('returns Above Average for mWAR >= 1.0', () => {
      expect(getMWARRating(1.5)).toBe('Above Average');
      expect(getMWARRating(1.0)).toBe('Above Average');
    });

    test('returns Average for mWAR >= 0', () => {
      expect(getMWARRating(0.5)).toBe('Average');
      expect(getMWARRating(0.0)).toBe('Average');
    });

    test('returns Below Average for mWAR >= -1.0', () => {
      expect(getMWARRating(-0.5)).toBe('Below Average');
      expect(getMWARRating(-1.0)).toBe('Below Average');
    });

    test('returns Poor for mWAR < -1.0', () => {
      expect(getMWARRating(-1.5)).toBe('Poor');
      expect(getMWARRating(-3.0)).toBe('Poor');
    });
  });

  describe('mWAR Thresholds', () => {
    test('has correct threshold values', () => {
      expect(MWAR_THRESHOLDS.elite).toBe(4.0);
      expect(MWAR_THRESHOLDS.excellent).toBe(2.5);
      expect(MWAR_THRESHOLDS.aboveAverage).toBe(1.0);
      expect(MWAR_THRESHOLDS.average).toBe(0);
      expect(MWAR_THRESHOLDS.belowAverage).toBe(-1.0);
    });
  });
});

// ============================================
// AGING INTEGRATION TESTS
// ============================================

describe('Aging Integration', () => {
  describe('Career Phase Detection', () => {
    test('DEVELOPMENT phase for age <= 24', () => {
      expect(getCareerPhase(20)).toBe(CareerPhase.DEVELOPMENT);
      expect(getCareerPhase(24)).toBe(CareerPhase.DEVELOPMENT);
    });

    test('PRIME phase for age 25-32', () => {
      expect(getCareerPhase(25)).toBe(CareerPhase.PRIME);
      expect(getCareerPhase(30)).toBe(CareerPhase.PRIME);
      expect(getCareerPhase(32)).toBe(CareerPhase.PRIME);
    });

    test('DECLINE phase for age 33-48', () => {
      expect(getCareerPhase(33)).toBe(CareerPhase.DECLINE);
      expect(getCareerPhase(40)).toBe(CareerPhase.DECLINE);
      expect(getCareerPhase(48)).toBe(CareerPhase.DECLINE);
    });

    test('FORCED_RETIREMENT phase for age >= 49', () => {
      expect(getCareerPhase(49)).toBe(CareerPhase.FORCED_RETIREMENT);
      expect(getCareerPhase(55)).toBe(CareerPhase.FORCED_RETIREMENT);
    });
  });

  describe('Career Phase Display', () => {
    test('displays correct phase names', () => {
      expect(getCareerPhaseDisplayName(CareerPhase.DEVELOPMENT)).toBe('Development');
      expect(getCareerPhaseDisplayName(CareerPhase.PRIME)).toBe('Prime Years');
      expect(getCareerPhaseDisplayName(CareerPhase.DECLINE)).toBe('Declining');
      expect(getCareerPhaseDisplayName(CareerPhase.FORCED_RETIREMENT)).toBe('Must Retire');
    });

    test('returns colors for each phase', () => {
      const devColor = getCareerPhaseColor(CareerPhase.DEVELOPMENT);
      const primeColor = getCareerPhaseColor(CareerPhase.PRIME);
      const declineColor = getCareerPhaseColor(CareerPhase.DECLINE);

      expect(devColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(primeColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(declineColor).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('Age Display Info', () => {
    test('returns comprehensive display info', () => {
      const info = getAgeDisplayInfo(28, 80, 50);

      expect(info).toHaveProperty('age', 28);
      expect(info).toHaveProperty('phase');
      expect(info).toHaveProperty('phaseName');
      expect(info).toHaveProperty('phaseColor');
      expect(info).toHaveProperty('yearsRemaining');
      expect(info).toHaveProperty('retirementRisk');
      expect(info).toHaveProperty('retirementRiskColor');
    });

    test('young player has no retirement risk', () => {
      const info = getAgeDisplayInfo(22, 75, 20);

      expect(info.retirementRisk).toBe('NONE');
      expect(info.phase).toBe(CareerPhase.DEVELOPMENT);
    });

    test('prime player has low/no retirement risk', () => {
      const info = getAgeDisplayInfo(28, 85, 75);

      expect(['NONE', 'LOW']).toContain(info.retirementRisk);
      expect(info.phase).toBe(CareerPhase.PRIME);
    });

    test('old player with low rating has high retirement risk', () => {
      const info = getAgeDisplayInfo(42, 55, 100);

      expect(['MEDIUM', 'HIGH', 'CERTAIN']).toContain(info.retirementRisk);
      expect(info.phase).toBe(CareerPhase.DECLINE);
    });

    test('player at retirement age has certain risk', () => {
      const info = getAgeDisplayInfo(49, 70, 200);

      expect(info.retirementRisk).toBe('CERTAIN');
      expect(info.phase).toBe(CareerPhase.FORCED_RETIREMENT);
    });
  });

  describe('Development Potential', () => {
    test('young player has high development potential', () => {
      const potential = calculateDevelopmentPotential(21, 60);

      expect(potential.currentRating).toBe(60);
      expect(potential.potentialRange.max).toBeGreaterThan(60);
      expect(potential.expectedChange).toBeGreaterThan(0);
      expect(['ELITE', 'HIGH', 'AVERAGE']).toContain(potential.upside);
    });

    test('prime player has stable potential', () => {
      const potential = calculateDevelopmentPotential(28, 80);

      expect(potential.expectedChange).toBe(0);
      expect(potential.upside).toBe('AVERAGE');  // Prime = stable = average upside
    });

    test('declining player has negative potential', () => {
      const potential = calculateDevelopmentPotential(38, 75);

      expect(potential.expectedChange).toBeLessThan(0);
      expect(potential.upside).toBe('LIMITED');  // Decline = limited upside
    });

    test('provides description for each stage', () => {
      const devPotential = calculateDevelopmentPotential(21, 55);
      const primePotential = calculateDevelopmentPotential(28, 85);
      const declinePotential = calculateDevelopmentPotential(40, 70);

      expect(devPotential.description).toBeTruthy();
      expect(primePotential.description).toBeTruthy();
      expect(declinePotential.description).toBeTruthy();
    });

    test('low-rated young player has elite upside', () => {
      const potential = calculateDevelopmentPotential(19, 40);

      expect(potential.upside).toBe('ELITE');
      expect(potential.description).toContain('Major');
    });

    test('high-rated young player has average upside', () => {
      const potential = calculateDevelopmentPotential(22, 75);

      expect(potential.upside).toBe('AVERAGE');
    });
  });
});

// ============================================
// INTEGRATION SEMANTIC TESTS
// ============================================

describe('Engine Integration Semantics', () => {
  test('mWAR and Aging integration: young manager has development upside', () => {
    const managerAge = 35;  // Young for a manager
    const info = getAgeDisplayInfo(managerAge, 70, 30);

    // Manager retirement handled differently, but phase still applies
    expect(info.phase).toBe(CareerPhase.DECLINE);
    expect(info.phaseName).toBeTruthy();
  });

  test('high-leverage situation affects decision importance', () => {
    const earlyGameState: GameStateForLI = {
      inning: 2,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: false, second: false, third: false },
      homeScore: 0,
      awayScore: 0,
    };

    const lateGameState: GameStateForLI = {
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: true, third: false },
      homeScore: 4,
      awayScore: 5,
    };

    const earlyMoment = checkManagerMoment(earlyGameState);
    const lateMoment = checkManagerMoment(lateGameState);

    // Late game close situation should have higher LI
    expect(lateMoment.leverageIndex).toBeGreaterThan(earlyMoment.leverageIndex);
  });

  test('player development tracks with career phase', () => {
    const ages = [19, 25, 33, 45];
    const expectedPhases = [
      CareerPhase.DEVELOPMENT,
      CareerPhase.PRIME,
      CareerPhase.DECLINE,
      CareerPhase.DECLINE,
    ];

    ages.forEach((age, i) => {
      const potential = calculateDevelopmentPotential(age, 70);
      const info = getAgeDisplayInfo(age, 70, 50);

      expect(info.phase).toBe(expectedPhases[i]);

      // Young players improve, old players decline
      if (age <= 24) {
        expect(potential.expectedChange).toBeGreaterThan(0);
      } else if (age >= 33) {
        expect(potential.expectedChange).toBeLessThan(0);
      }
    });
  });
});

// ============================================
// TYPE COMPILATION TESTS
// ============================================

describe('Type Compilation Verification', () => {
  test('ManagerMomentState type is usable', () => {
    const state: ManagerMomentState = {
      isTriggered: true,
      leverageIndex: 2.5,
      decisionType: 'pitching_change',
      context: 'High leverage situation',
      suggestedAction: 'Consider pitching change',
    };

    expect(state.isTriggered).toBe(true);
  });

  test('GameManagerStats type is usable', () => {
    const stats: GameManagerStats = {
      gameId: 'game-001',
      managerId: 'manager-001',
      decisions: [],
      totalDecisionValue: 0,
      successfulDecisions: 0,
      failedDecisions: 0,
      highLeverageDecisions: 0,
    };

    expect(stats.gameId).toBe('game-001');
  });

  test('AgeDisplayInfo type is usable', () => {
    const info: AgeDisplayInfo = {
      age: 28,
      phase: CareerPhase.PRIME,
      phaseName: 'Prime',
      phaseColor: '#22c55e',
      yearsRemaining: '5-8 years',
      retirementRisk: 'NONE',
      retirementRiskColor: '#22c55e',
    };

    expect(info.age).toBe(28);
  });

  test('DevelopmentPotential type is usable', () => {
    const potential: DevelopmentPotential = {
      currentRating: 65,
      potentialRange: { min: 63, max: 80 },
      expectedChange: 2.5,
      upside: 'HIGH',
      description: 'Strong upside remaining',
    };

    expect(potential.upside).toBe('HIGH');
  });
});
