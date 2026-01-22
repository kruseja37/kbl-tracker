/**
 * Baseball State Machine Tests
 * 
 * This file contains test cases for the AtBatFlow state machine logic.
 * Run with: npx ts-node src/tests/runStateMachineTests.ts
 */

import type { AtBatResult, Bases, RunnerOutcome } from '../types/game';

// Mock bases helper
export const createBases = (r1: boolean, r2: boolean, r3: boolean): Bases => ({
  first: r1 ? { playerId: '1', playerName: 'Runner 1', inheritedFrom: null } : null,
  second: r2 ? { playerId: '2', playerName: 'Runner 2', inheritedFrom: null } : null,
  third: r3 ? { playerId: '3', playerName: 'Runner 3', inheritedFrom: null } : null,
});

// Test case interface
export interface TestCase {
  name: string;
  result: AtBatResult;
  bases: Bases;
  outs: number;
  expected: {
    r1Default?: RunnerOutcome | null;
    r2Default?: RunnerOutcome | null;
    r3Default?: RunnerOutcome | null;
    r1Forced?: boolean;
    r2Forced?: boolean;
    r3Forced?: boolean;
    r1ExtraOnTo3B?: boolean;
    r1ExtraOnScored?: boolean;
    autoCorrectToSF?: boolean;
  };
}

// =============================================
// TEST CASES
// =============================================

export const testCases: TestCase[] = [
  {
    name: 'TEST 1: Walk with R2 only - R2 defaults to HELD',
    result: 'BB',
    bases: createBases(false, true, false),
    outs: 0,
    expected: { r2Default: 'HELD', r2Forced: false },
  },
  {
    name: 'TEST 2: Walk with R1+R2 - Both forced, advance 1 base',
    result: 'BB',
    bases: createBases(true, true, false),
    outs: 0,
    expected: { r1Default: 'TO_2B', r2Default: 'TO_3B', r1Forced: true, r2Forced: true },
  },
  {
    name: 'TEST 3: FO with R3 (< 2 outs) - R3 scores, auto-converts to SF',
    result: 'FO',
    bases: createBases(false, false, true),
    outs: 1,
    expected: { r3Default: 'SCORED', autoCorrectToSF: true },
  },
  {
    name: 'TEST 4: Strikeout with R1+R2 - All default to HELD',
    result: 'K',
    bases: createBases(true, true, false),
    outs: 0,
    expected: { r1Default: 'HELD', r2Default: 'HELD', r1Forced: false, r2Forced: false },
  },
  {
    name: 'TEST 5: Double with R2 - R2 defaults to SCORED',
    result: '2B',
    bases: createBases(false, true, false),
    outs: 0,
    expected: { r2Default: 'SCORED', r2Forced: true },
  },
  {
    name: 'TEST 6: Walk with R1 - R1→3B requires extra event',
    result: 'BB',
    bases: createBases(true, false, false),
    outs: 0,
    expected: { r1Default: 'TO_2B', r1Forced: true, r1ExtraOnTo3B: true, r1ExtraOnScored: true },
  },
  {
    name: 'TEST 7: Walk with R3 only (not forced) - R3 HELD',
    result: 'BB',
    bases: createBases(false, false, true),
    outs: 0,
    expected: { r3Default: 'HELD', r3Forced: false },
  },
  {
    name: 'TEST 8: Bases loaded walk - All advance, R3 scores',
    result: 'BB',
    bases: createBases(true, true, true),
    outs: 0,
    expected: { r1Default: 'TO_2B', r2Default: 'TO_3B', r3Default: 'SCORED', r1Forced: true, r2Forced: true, r3Forced: true },
  },
  {
    name: 'TEST 9: FO with R3 and 2 outs - R3 HELD (no tag-up)',
    result: 'FO',
    bases: createBases(false, false, true),
    outs: 2,
    expected: { r3Default: 'HELD', autoCorrectToSF: false },
  },
  {
    name: 'TEST 10: Single with bases loaded - Standard advancement',
    result: '1B',
    bases: createBases(true, true, true),
    outs: 0,
    expected: { r1Default: 'TO_2B', r2Default: 'TO_3B', r3Default: 'SCORED' },
  },
  {
    name: 'TEST 11: Triple with R1+R2 - All score',
    result: '3B',
    bases: createBases(true, true, false),
    outs: 0,
    expected: { r1Default: 'SCORED', r2Default: 'SCORED' },
  },
  {
    name: 'TEST 12: DP with R1 - R1 out at 2B',
    result: 'DP',
    bases: createBases(true, false, false),
    outs: 0,
    expected: { r1Default: 'OUT_2B' },
  },
  {
    name: 'TEST 13: SAC with R1 - R1 to 2B',
    result: 'SAC',
    bases: createBases(true, false, false),
    outs: 0,
    expected: { r1Default: 'TO_2B' },
  },
  {
    name: 'TEST 14: FC with R1 - R1 out at 2B',
    result: 'FC',
    bases: createBases(true, false, false),
    outs: 0,
    expected: { r1Default: 'OUT_2B' },
  },
  {
    name: 'TEST 15: GO with R1+R2 - All HELD',
    result: 'GO',
    bases: createBases(true, true, false),
    outs: 0,
    expected: { r1Default: 'HELD', r2Default: 'HELD' },
  },
];

export default testCases;
