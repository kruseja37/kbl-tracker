/**
 * Baseball Logic Comparison Tests
 *
 * This file compares the src_figma implementations against the canonical
 * baseball rules to ensure they produce identical results.
 */

import { describe, it, expect } from 'vitest';

// Import canonical implementations (from test file)
import {
  isRunnerForced as canonicalIsRunnerForced,
  getDefaultRunnerOutcome as canonicalGetDefaultRunnerOutcome,
  autoCorrectResult as canonicalAutoCorrectResult,
  calculateRBIs as canonicalCalculateRBIs,
  isExtraAdvancement as canonicalIsExtraAdvancement,
  type AtBatResult,
  type RunnerOutcome,
  type Bases,
} from './baseballLogicTests.test';

// Import src_figma implementations
import {
  isRunnerForced as figmaIsRunnerForced,
  getDefaultRunnerOutcome as figmaGetDefaultRunnerOutcome,
  autoCorrectResult as figmaAutoCorrectResult,
  calculateRBIs as figmaCalculateRBIs,
  isExtraAdvancement as figmaIsExtraAdvancement,
} from '../src_figma/hooks/useGameState';

// ============================================
// TEST DATA
// ============================================

interface TestScenario {
  name: string;
  result: AtBatResult;
  bases: Bases;
  outs: number;
  runnerOutcomes?: { first: RunnerOutcome | null; second: RunnerOutcome | null; third: RunnerOutcome | null };
}

// Comprehensive test scenarios covering all common game situations
const TEST_SCENARIOS: TestScenario[] = [
  // Empty bases
  { name: 'Empty bases, 0 outs, 1B', result: '1B', bases: { first: false, second: false, third: false }, outs: 0 },
  { name: 'Empty bases, 0 outs, 2B', result: '2B', bases: { first: false, second: false, third: false }, outs: 0 },
  { name: 'Empty bases, 0 outs, 3B', result: '3B', bases: { first: false, second: false, third: false }, outs: 0 },
  { name: 'Empty bases, 0 outs, HR', result: 'HR', bases: { first: false, second: false, third: false }, outs: 0 },
  { name: 'Empty bases, 0 outs, BB', result: 'BB', bases: { first: false, second: false, third: false }, outs: 0 },
  { name: 'Empty bases, 0 outs, K', result: 'K', bases: { first: false, second: false, third: false }, outs: 0 },
  { name: 'Empty bases, 0 outs, GO', result: 'GO', bases: { first: false, second: false, third: false }, outs: 0 },
  { name: 'Empty bases, 0 outs, FO', result: 'FO', bases: { first: false, second: false, third: false }, outs: 0 },

  // R1 only
  { name: 'R1 only, 0 outs, 1B', result: '1B', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, 2B', result: '2B', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, 3B', result: '3B', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, HR', result: 'HR', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, BB', result: 'BB', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, K', result: 'K', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, GO', result: 'GO', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, FO', result: 'FO', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, DP', result: 'DP', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, FC', result: 'FC', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, SAC', result: 'SAC', bases: { first: true, second: false, third: false }, outs: 0 },
  { name: 'R1 only, 0 outs, E', result: 'E', bases: { first: true, second: false, third: false }, outs: 0 },

  // R2 only
  { name: 'R2 only, 0 outs, 1B', result: '1B', bases: { first: false, second: true, third: false }, outs: 0 },
  { name: 'R2 only, 0 outs, 2B', result: '2B', bases: { first: false, second: true, third: false }, outs: 0 },
  { name: 'R2 only, 0 outs, BB', result: 'BB', bases: { first: false, second: true, third: false }, outs: 0 },
  { name: 'R2 only, 0 outs, FO', result: 'FO', bases: { first: false, second: true, third: false }, outs: 0 },
  { name: 'R2 only, 0 outs, SAC', result: 'SAC', bases: { first: false, second: true, third: false }, outs: 0 },

  // R3 only
  { name: 'R3 only, 0 outs, 1B', result: '1B', bases: { first: false, second: false, third: true }, outs: 0 },
  { name: 'R3 only, 0 outs, FO', result: 'FO', bases: { first: false, second: false, third: true }, outs: 0 },
  { name: 'R3 only, 2 outs, FO', result: 'FO', bases: { first: false, second: false, third: true }, outs: 2 },
  { name: 'R3 only, 0 outs, SF', result: 'SF', bases: { first: false, second: false, third: true }, outs: 0 },
  { name: 'R3 only, 0 outs, BB', result: 'BB', bases: { first: false, second: false, third: true }, outs: 0 },
  { name: 'R3 only, 0 outs, GO', result: 'GO', bases: { first: false, second: false, third: true }, outs: 0 },

  // R1+R2
  { name: 'R1+R2, 0 outs, 1B', result: '1B', bases: { first: true, second: true, third: false }, outs: 0 },
  { name: 'R1+R2, 0 outs, 2B', result: '2B', bases: { first: true, second: true, third: false }, outs: 0 },
  { name: 'R1+R2, 0 outs, BB', result: 'BB', bases: { first: true, second: true, third: false }, outs: 0 },
  { name: 'R1+R2, 0 outs, DP', result: 'DP', bases: { first: true, second: true, third: false }, outs: 0 },

  // R1+R3
  { name: 'R1+R3, 0 outs, 1B', result: '1B', bases: { first: true, second: false, third: true }, outs: 0 },
  { name: 'R1+R3, 0 outs, FO', result: 'FO', bases: { first: true, second: false, third: true }, outs: 0 },
  { name: 'R1+R3, 0 outs, DP', result: 'DP', bases: { first: true, second: false, third: true }, outs: 0 },

  // R2+R3
  { name: 'R2+R3, 0 outs, 1B', result: '1B', bases: { first: false, second: true, third: true }, outs: 0 },
  { name: 'R2+R3, 0 outs, BB', result: 'BB', bases: { first: false, second: true, third: true }, outs: 0 },
  { name: 'R2+R3, 0 outs, FO', result: 'FO', bases: { first: false, second: true, third: true }, outs: 0 },

  // Bases loaded
  { name: 'Bases loaded, 0 outs, 1B', result: '1B', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, 2B', result: '2B', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, 3B', result: '3B', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, HR', result: 'HR', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, BB', result: 'BB', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, IBB', result: 'IBB', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, HBP', result: 'HBP', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, K', result: 'K', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, GO', result: 'GO', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, FO', result: 'FO', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 0 outs, DP', result: 'DP', bases: { first: true, second: true, third: true }, outs: 0 },
  { name: 'Bases loaded, 2 outs, DP', result: 'DP', bases: { first: true, second: true, third: true }, outs: 2 },
  { name: 'Bases loaded, 0 outs, E', result: 'E', bases: { first: true, second: true, third: true }, outs: 0 },

  // Various out counts
  { name: 'R1 only, 1 out, GO', result: 'GO', bases: { first: true, second: false, third: false }, outs: 1 },
  { name: 'R1 only, 2 outs, GO', result: 'GO', bases: { first: true, second: false, third: false }, outs: 2 },
  { name: 'R3 only, 1 out, FO', result: 'FO', bases: { first: false, second: false, third: true }, outs: 1 },
];

// ============================================
// COMPARISON TESTS
// ============================================

describe('Baseball Logic Comparison: src_figma vs Canonical', () => {
  describe('isRunnerForced() - Force Play Detection', () => {
    const bases: ('first' | 'second' | 'third')[] = ['first', 'second', 'third'];

    TEST_SCENARIOS.forEach(scenario => {
      bases.forEach(base => {
        if (scenario.bases[base]) {
          it(`${scenario.name}: ${base} runner`, () => {
            const canonical = canonicalIsRunnerForced(base, scenario.result, scenario.bases);
            const figma = figmaIsRunnerForced(base, scenario.result as any, scenario.bases);
            expect(figma).toBe(canonical);
          });
        }
      });
    });
  });

  describe('getDefaultRunnerOutcome() - Default Outcomes', () => {
    const bases: ('first' | 'second' | 'third')[] = ['first', 'second', 'third'];

    TEST_SCENARIOS.forEach(scenario => {
      bases.forEach(base => {
        if (scenario.bases[base]) {
          it(`${scenario.name}: ${base} runner`, () => {
            const canonical = canonicalGetDefaultRunnerOutcome(base, scenario.result, scenario.outs, scenario.bases);
            const figma = figmaGetDefaultRunnerOutcome(base, scenario.result as any, scenario.outs, scenario.bases);
            expect(figma).toBe(canonical);
          });
        }
      });
    });
  });

  describe('calculateRBIs() - RBI Calculation', () => {
    const rbiScenarios: TestScenario[] = [
      {
        name: '1B, R3 scores',
        result: '1B',
        bases: { first: false, second: false, third: true },
        outs: 0,
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
      },
      {
        name: '2B, R2+R3 score',
        result: '2B',
        bases: { first: false, second: true, third: true },
        outs: 0,
        runnerOutcomes: { first: null, second: 'SCORED', third: 'SCORED' },
      },
      {
        name: 'HR, empty bases',
        result: 'HR',
        bases: { first: false, second: false, third: false },
        outs: 0,
        runnerOutcomes: { first: null, second: null, third: null },
      },
      {
        name: 'HR, bases loaded',
        result: 'HR',
        bases: { first: true, second: true, third: true },
        outs: 0,
        runnerOutcomes: { first: 'SCORED', second: 'SCORED', third: 'SCORED' },
      },
      {
        name: 'E, R3 scores',
        result: 'E',
        bases: { first: false, second: false, third: true },
        outs: 0,
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
      },
      {
        name: 'DP, R3 scores',
        result: 'DP',
        bases: { first: true, second: false, third: true },
        outs: 0,
        runnerOutcomes: { first: 'OUT_2B', second: null, third: 'SCORED' },
      },
      {
        name: 'SF, R3 scores',
        result: 'SF',
        bases: { first: false, second: false, third: true },
        outs: 0,
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
      },
      {
        name: 'BB, bases loaded',
        result: 'BB',
        bases: { first: true, second: true, third: true },
        outs: 0,
        runnerOutcomes: { first: 'TO_2B', second: 'TO_3B', third: 'SCORED' },
      },
    ];

    rbiScenarios.forEach(scenario => {
      it(scenario.name, () => {
        const canonical = canonicalCalculateRBIs(scenario.result, scenario.runnerOutcomes!, scenario.bases);
        const figma = figmaCalculateRBIs(scenario.result as any, scenario.runnerOutcomes as any, scenario.bases);
        expect(figma).toBe(canonical);
      });
    });
  });

  describe('autoCorrectResult() - Auto-Correction', () => {
    const autoCorrectScenarios: TestScenario[] = [
      {
        name: 'FO, R3 scores, 0 outs - should correct to SF',
        result: 'FO',
        bases: { first: false, second: false, third: true },
        outs: 0,
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
      },
      {
        name: 'FO, R3 scores, 1 out - should correct to SF',
        result: 'FO',
        bases: { first: false, second: false, third: true },
        outs: 1,
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
      },
      {
        name: 'FO, R3 scores, 2 outs - NO correction',
        result: 'FO',
        bases: { first: false, second: false, third: true },
        outs: 2,
        runnerOutcomes: { first: null, second: null, third: 'SCORED' },
      },
      {
        name: 'FO, R3 holds - NO correction',
        result: 'FO',
        bases: { first: false, second: false, third: true },
        outs: 0,
        runnerOutcomes: { first: null, second: null, third: 'HELD' },
      },
      {
        name: 'GO, R1 out, 0 outs - should correct to DP',
        result: 'GO',
        bases: { first: true, second: false, third: false },
        outs: 0,
        runnerOutcomes: { first: 'OUT_2B', second: null, third: null },
      },
      {
        name: 'GO, R1 out, 1 out - should correct to DP',
        result: 'GO',
        bases: { first: true, second: false, third: false },
        outs: 1,
        runnerOutcomes: { first: 'OUT_2B', second: null, third: null },
      },
      {
        name: 'GO, R1 out, 2 outs - NO correction',
        result: 'GO',
        bases: { first: true, second: false, third: false },
        outs: 2,
        runnerOutcomes: { first: 'OUT_2B', second: null, third: null },
      },
      {
        name: 'GO, R1 advances - NO correction',
        result: 'GO',
        bases: { first: true, second: false, third: false },
        outs: 0,
        runnerOutcomes: { first: 'TO_2B', second: null, third: null },
      },
    ];

    autoCorrectScenarios.forEach(scenario => {
      it(scenario.name, () => {
        const canonical = canonicalAutoCorrectResult(scenario.result, scenario.outs, scenario.bases, scenario.runnerOutcomes!);
        const figma = figmaAutoCorrectResult(scenario.result as any, scenario.outs, scenario.bases, scenario.runnerOutcomes as any);

        if (canonical === null) {
          expect(figma).toBe(null);
        } else {
          expect(figma?.correctedResult).toBe(canonical.correctedResult);
        }
      });
    });
  });
});
