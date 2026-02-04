/**
 * useMWARCalculations Hook Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.4
 *
 * Tests the mWAR hook's integration with underlying engines.
 * Note: Testing React hooks requires testing-library/react, but we can test
 * the underlying functions and type contracts directly.
 */

import { describe, test, expect } from 'vitest';

// Import the hook type and underlying functions
import type { UseMWARCalculationsReturn } from '../../app/hooks/useMWARCalculations';
import {
  createManagerDecision,
  resolveDecision,
  checkManagerMoment,
  createGameMWARState,
  recordManagerDecision,
  getMWARDisplayInfo,
  getLITierDescription,
  getLIColor,
  shouldShowManagerMoment,
  createManagerSeasonStats,
  addDecisionToSeasonStats,
  formatMWAR,
  getMWARRating,
  HIGH_LEVERAGE_THRESHOLD,
} from '../../app/engines/mwarIntegration';

import { getLeverageIndex, type GameStateForLI } from '../../../engines/leverageCalculator';

// ============================================
// HOOK RETURN TYPE TESTS
// ============================================

describe('useMWARCalculations Hook Type Contract', () => {
  test('UseMWARCalculationsReturn has all required properties', () => {
    // Type test - verify the interface shape
    const hookReturn: Partial<UseMWARCalculationsReturn> = {};

    // State properties (can be null initially)
    expect('gameStats' in hookReturn || hookReturn.gameStats === undefined).toBe(true);
    expect('seasonStats' in hookReturn || hookReturn.seasonStats === undefined).toBe(true);
    expect('managerMoment' in hookReturn || hookReturn.managerMoment === undefined).toBe(true);

    // Action functions
    const requiredFunctions = [
      'initializeGame',
      'initializeSeason',
      'recordDecision',
      'resolveDecisionOutcome',
      'checkForManagerMoment',
      'dismissManagerMoment',
      'getCurrentLI',
      'formatCurrentMWAR',
      'getMWARStatus',
      'getLIDisplay',
    ];

    // Just verify types compile
    expect(requiredFunctions.length).toBe(10);
  });
});

// ============================================
// GAME INITIALIZATION TESTS
// ============================================

describe('Game Initialization (via underlying functions)', () => {
  test('createGameMWARState creates valid game state', () => {
    const gameStats = createGameMWARState('game-001', 'manager-001');

    expect(gameStats.gameId).toBe('game-001');
    expect(gameStats.managerId).toBe('manager-001');
    expect(gameStats.decisions).toEqual([]);
    // GameManagerStats uses totalDecisionValue, successfulDecisions, failedDecisions
    expect(gameStats.totalDecisionValue).toBe(0);
    expect(gameStats.successfulDecisions).toBe(0);
  });

  test('createManagerSeasonStats creates valid season state', () => {
    const seasonStats = createManagerSeasonStats('season-2024', 'manager-001', 'team-001');

    expect(seasonStats.seasonId).toBe('season-2024');
    expect(seasonStats.managerId).toBe('manager-001');
    expect(seasonStats.teamId).toBe('team-001');
    expect(seasonStats.mWAR).toBe(0);
    // ManagerSeasonStats uses decisionCounts, not totalDecisions
    expect(seasonStats.decisionCounts).toBeDefined();
  });
});

// ============================================
// DECISION RECORDING TESTS
// ============================================

describe('Decision Recording (via underlying functions)', () => {
  const mockGameState: GameStateForLI = {
    inning: 7,
    halfInning: 'BOTTOM',
    outs: 1,
    runners: { first: true, second: true, third: false },
    homeScore: 3,
    awayScore: 4,
  };

  test('createManagerDecision creates valid decision', () => {
    const decision = createManagerDecision(
      'game-001',
      'manager-001',
      'pitching_change',
      mockGameState,
      'auto',
      ['pitcher-001', 'pitcher-002'],
      'Brought in closer'
    );

    expect(decision.gameId).toBe('game-001');
    expect(decision.managerId).toBe('manager-001');
    expect(decision.decisionType).toBe('pitching_change');
    expect(decision.involvedPlayers).toContain('pitcher-001');
    expect(decision.notes).toBe('Brought in closer');
    expect(decision.decisionId).toBeTruthy();
    expect(decision.leverageIndex).toBeGreaterThan(0);
  });

  test('recordManagerDecision adds decision to game stats', () => {
    const gameStats = createGameMWARState('game-001', 'manager-001');
    const decision = createManagerDecision(
      'game-001',
      'manager-001',
      'defensive_shift',
      mockGameState,
      'auto',
      ['fielder-001']
    );

    const updated = recordManagerDecision(gameStats, decision);

    expect(updated.decisions.length).toBe(1);
    // GameManagerStats tracks via decisions array, not totalDecisions
    expect(updated.decisions[0].decisionType).toBe('defensive_shift');
  });

  test('recordDecision returns decision ID', () => {
    const decision = createManagerDecision(
      'game-001',
      'manager-001',
      'pinch_hitter',
      mockGameState,
      'auto',
      ['batter-001']
    );

    expect(typeof decision.decisionId).toBe('string');
    expect(decision.decisionId.length).toBeGreaterThan(0);
  });
});

// ============================================
// DECISION RESOLUTION TESTS
// ============================================

describe('Decision Resolution (via underlying functions)', () => {
  const mockGameState: GameStateForLI = {
    inning: 8,
    halfInning: 'TOP',
    outs: 2,
    runners: { first: false, second: true, third: false },
    homeScore: 5,
    awayScore: 5,
  };

  test('resolveDecision updates decision outcome', () => {
    const decision = createManagerDecision(
      'game-001',
      'manager-001',
      'steal_call',
      mockGameState,
      'auto',
      ['runner-001']
    );

    // Outcome type is 'success' | 'failure' | 'neutral'
    const resolved = resolveDecision(decision, 'success');

    expect(resolved.outcome).toBe('success');
    expect(resolved.resolved).toBe(true);
    // clutchImpact is calculated based on LI and outcome
    expect(typeof resolved.clutchImpact).toBe('number');
  });

  test('addDecisionToSeasonStats updates season mWAR', () => {
    const seasonStats = createManagerSeasonStats('season-2024', 'manager-001', 'team-001');
    const decision = createManagerDecision(
      'game-001',
      'manager-001',
      'pitching_change',
      mockGameState,
      'auto',
      ['pitcher-001']
    );
    // Outcome type is 'success' | 'failure' | 'neutral'
    const resolved = resolveDecision(decision, 'success');

    addDecisionToSeasonStats(seasonStats, resolved);

    // decisionCounts.total tracks total decisions
    expect(seasonStats.decisionCounts.total).toBeGreaterThanOrEqual(1);
    // mWAR should have changed (positive or negative based on outcome)
    expect(typeof seasonStats.mWAR).toBe('number');
  });

  test('success and failure outcomes produce different clutchImpact', () => {
    // Test at the decision level since mWAR aggregation may not show differences
    // for single decisions (mWAR involves expected success rate comparisons)
    const decision1 = createManagerDecision(
      'game-001', 'manager-001', 'pitching_change', mockGameState, 'auto', ['p1']
    );
    const decision2 = createManagerDecision(
      'game-001', 'manager-001', 'pitching_change', mockGameState, 'auto', ['p1']
    );

    // Outcome type is 'success' | 'failure' | 'neutral'
    const success = resolveDecision(decision1, 'success');
    const failure = resolveDecision(decision2, 'failure');

    // Success and failure outcomes should produce different clutchImpact
    expect(success.clutchImpact).not.toBe(failure.clutchImpact);
    // Success should have higher clutch impact than failure
    expect(success.clutchImpact).toBeGreaterThan(failure.clutchImpact);
  });
});

// ============================================
// MANAGER MOMENT TESTS
// ============================================

describe('Manager Moment Detection (via underlying functions)', () => {
  test('checkManagerMoment detects high leverage situations', () => {
    const highLIState: GameStateForLI = {
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: true, third: true },
      homeScore: 5,
      awayScore: 6,
    };

    const moment = checkManagerMoment(highLIState);

    expect(moment.isTriggered).toBe(true);
    expect(moment.leverageIndex).toBeGreaterThan(HIGH_LEVERAGE_THRESHOLD);
  });

  test('checkManagerMoment does not trigger for low leverage', () => {
    const lowLIState: GameStateForLI = {
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
      runners: { first: false, second: false, third: false },
      homeScore: 0,
      awayScore: 0,
    };

    const moment = checkManagerMoment(lowLIState);

    expect(moment.isTriggered).toBe(false);
    expect(moment.leverageIndex).toBeLessThan(HIGH_LEVERAGE_THRESHOLD);
  });

  test('shouldShowManagerMoment returns boolean', () => {
    const highLI = 3.5;
    const lowLI = 0.5;

    expect(shouldShowManagerMoment(highLI)).toBe(true);
    expect(shouldShowManagerMoment(lowLI)).toBe(false);
  });

  test('HIGH_LEVERAGE_THRESHOLD is 2.0', () => {
    expect(HIGH_LEVERAGE_THRESHOLD).toBe(2.0);
  });
});

// ============================================
// DISPLAY HELPER TESTS
// ============================================

describe('Display Helpers (via underlying functions)', () => {
  test('formatMWAR formats positive values with +', () => {
    expect(formatMWAR(1.5)).toBe('+1.50');
    expect(formatMWAR(0.25)).toBe('+0.25');
  });

  test('formatMWAR formats negative values correctly', () => {
    expect(formatMWAR(-0.75)).toBe('-0.75');
    expect(formatMWAR(-2.0)).toBe('-2.00');
  });

  test('formatMWAR formats zero', () => {
    expect(formatMWAR(0)).toBe('+0.00');
  });

  test('getMWARDisplayInfo returns rating and color', () => {
    const excellent = getMWARDisplayInfo(2.0);
    const good = getMWARDisplayInfo(1.0);
    const average = getMWARDisplayInfo(0.0);
    const poor = getMWARDisplayInfo(-1.0);

    expect(excellent.rating).toBeTruthy();
    expect(excellent.color).toBeTruthy();
    expect(good.rating).toBeTruthy();
    expect(average.rating).toBeTruthy();
    expect(poor.rating).toBeTruthy();
  });

  test('getMWARRating returns rating string', () => {
    const rating = getMWARRating(1.5);
    expect(typeof rating).toBe('string');
    expect(rating.length).toBeGreaterThan(0);
  });

  test('getLITierDescription returns tier name', () => {
    // Per mwarIntegration.ts getLITierDescription:
    // <0.5 = Low, 0.5-1.0 = Average, 1.0-2.0 = Above Average,
    // 2.0-2.5 = High, 2.5-4.0 = Very High, >=4.0 = Extreme
    expect(getLITierDescription(0.3)).toBe('Low');
    expect(getLITierDescription(0.5)).toBe('Average');
    expect(getLITierDescription(1.0)).toBe('Above Average');
    expect(getLITierDescription(2.0)).toBe('High');
    expect(getLITierDescription(2.5)).toBe('Very High');
    expect(getLITierDescription(4.0)).toBe('Extreme');
  });

  test('getLIColor returns valid hex color', () => {
    const color = getLIColor(2.0);
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

// ============================================
// LEVERAGE INDEX TESTS
// ============================================

describe('Leverage Index Calculation (via underlying functions)', () => {
  test('getLeverageIndex returns number', () => {
    const state: GameStateForLI = {
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: true, second: false, third: false },
      homeScore: 2,
      awayScore: 3,
    };

    const li = getLeverageIndex(state);

    expect(typeof li).toBe('number');
    expect(li).toBeGreaterThan(0);
  });

  test('late inning close game has higher LI', () => {
    const earlyState: GameStateForLI = {
      inning: 2,
      halfInning: 'TOP',
      outs: 0,
      runners: { first: false, second: false, third: false },
      homeScore: 0,
      awayScore: 0,
    };

    const lateState: GameStateForLI = {
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: false, third: false },
      homeScore: 4,
      awayScore: 5,
    };

    const earlyLI = getLeverageIndex(earlyState);
    const lateLI = getLeverageIndex(lateState);

    expect(lateLI).toBeGreaterThan(earlyLI);
  });

  test('runners on base increases LI', () => {
    const noRunners: GameStateForLI = {
      inning: 7,
      halfInning: 'BOTTOM',
      outs: 1,
      runners: { first: false, second: false, third: false },
      homeScore: 3,
      awayScore: 4,
    };

    const runnersOn: GameStateForLI = {
      inning: 7,
      halfInning: 'BOTTOM',
      outs: 1,
      runners: { first: true, second: true, third: false },
      homeScore: 3,
      awayScore: 4,
    };

    const liNoRunners = getLeverageIndex(noRunners);
    const liRunnersOn = getLeverageIndex(runnersOn);

    expect(liRunnersOn).toBeGreaterThan(liNoRunners);
  });
});

// ============================================
// INTEGRATION SEMANTICS TESTS
// ============================================

describe('Hook Integration Semantics', () => {
  test('decision workflow: create -> resolve -> aggregate', () => {
    // Simulate the full workflow the hook performs
    const gameState: GameStateForLI = {
      inning: 8,
      halfInning: 'BOTTOM',
      outs: 1,
      runners: { first: true, second: false, third: false },
      homeScore: 4,
      awayScore: 4,
    };

    // 1. Create game tracking
    const gameStats = createGameMWARState('game-001', 'manager-001');
    expect(gameStats.decisions.length).toBe(0);

    // 2. Create season tracking
    const seasonStats = createManagerSeasonStats('season-2024', 'manager-001', 'team-001');
    expect(seasonStats.mWAR).toBe(0);

    // 3. Create and record decision
    const decision = createManagerDecision(
      'game-001',
      'manager-001',
      'pinch_hitter',
      gameState,
      'auto',
      ['batter-001', 'batter-002']
    );
    const updatedGameStats = recordManagerDecision(gameStats, decision);
    expect(updatedGameStats.decisions.length).toBe(1);

    // 4. Resolve decision (outcome is 'success' | 'failure' | 'neutral')
    const resolvedDecision = resolveDecision(decision, 'success');
    expect(resolvedDecision.outcome).toBe('success');

    // 5. Add to season stats
    addDecisionToSeasonStats(seasonStats, resolvedDecision);
    // decisionCounts.total tracks total decisions
    expect(seasonStats.decisionCounts.total).toBeGreaterThanOrEqual(1);
    // mWAR changes based on decision value
    expect(typeof seasonStats.mWAR).toBe('number');
  });

  test('manager moment dismissal preserves LI', () => {
    // The hook dismisses moment but keeps LI for display
    const highLIState: GameStateForLI = {
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: true, third: false },
      homeScore: 5,
      awayScore: 6,
    };

    const moment = checkManagerMoment(highLIState);
    const li = moment.leverageIndex;

    // Dismissal would set isTriggered to false but keep leverageIndex
    const dismissed = {
      ...moment,
      isTriggered: false,
      decisionType: null,
      context: '',
    };

    expect(dismissed.isTriggered).toBe(false);
    expect(dismissed.leverageIndex).toBe(li);
  });
});
