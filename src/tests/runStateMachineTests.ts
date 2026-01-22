/**
 * State Machine Test Runner
 * 
 * Extracts the core logic from AtBatFlow and tests it against test cases.
 * Run with: npx ts-node src/tests/runStateMachineTests.ts
 */

import { testCases } from './stateMachineTests';
import type { AtBatResult, Bases, RunnerOutcome } from '../types/game';
import { isOut } from '../types/game';

// =============================================
// EXTRACTED LOGIC FUNCTIONS (from AtBatFlow.tsx)
// =============================================

function isRunnerForced(
  result: AtBatResult,
  bases: Bases,
  base: 'first' | 'second' | 'third'
): boolean {
  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (base === 'first') return true;
    if (base === 'second') return !!bases.first;
    if (base === 'third') return !!bases.first && !!bases.second;
  }
  if (result === '1B') {
    if (base === 'first') return true;
    return false;
  }
  if (result === '2B') {
    if (base === 'first') return true;
    if (base === 'second') return true;
    return false;
  }
  if (result === '3B') return true;
  if (result === 'FC') {
    if (base === 'first') return true;
    return false;
  }
  return false;
}

function getMinimumAdvancement(
  result: AtBatResult,
  bases: Bases,
  base: 'first' | 'second' | 'third'
): 'second' | 'third' | 'home' | null {
  if (!isRunnerForced(result, bases, base)) return null;
  if (result === '2B') {
    if (base === 'first') return 'third';
    if (base === 'second') return 'third';
  }
  if (result === '3B') return 'home';
  if (base === 'first') return 'second';
  if (base === 'second') return 'third';
  if (base === 'third') return 'home';
  return null;
}

function getDefaultOutcome(
  result: AtBatResult,
  bases: Bases,
  outs: number,
  base: 'first' | 'second' | 'third'
): RunnerOutcome | null {
  const minAdvance = getMinimumAdvancement(result, bases, base);
  const forced = isRunnerForced(result, bases, base);

  // DOUBLE
  if (result === '2B') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'SCORED';
    if (base === 'first') return 'TO_3B';
  }
  // TRIPLE
  if (result === '3B') return 'SCORED';
  // SINGLE
  if (result === '1B') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'TO_3B';
    if (base === 'first') return 'TO_2B';
  }
  // HR
  if (result === 'HR') return 'SCORED';
  // WALKS
  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (forced && minAdvance) {
      if (minAdvance === 'home') return 'SCORED';
      if (minAdvance === 'third') return 'TO_3B';
      if (minAdvance === 'second') return 'TO_2B';
    }
    return 'HELD';
  }
  // STRIKEOUTS
  if (['K', 'KL', 'D3K'].includes(result)) return 'HELD';
  // GO
  if (result === 'GO') return 'HELD';
  // FO, LO, PO
  if (['FO', 'LO', 'PO'].includes(result)) {
    if (base === 'third' && result === 'FO' && outs < 2) return 'SCORED';
    return 'HELD';
  }
  // DP
  if (result === 'DP') {
    if (base === 'first') return 'OUT_2B';
    return 'HELD';
  }
  // SF
  if (result === 'SF') {
    if (base === 'third') return 'SCORED';
    return 'HELD';
  }
  // SAC
  if (result === 'SAC') {
    if (base === 'first') return 'TO_2B';
    if (base === 'second') return 'TO_3B';
    return 'HELD';
  }
  // FC
  if (result === 'FC') {
    if (base === 'first') return 'OUT_2B';
    return 'HELD';
  }
  // E
  if (result === 'E') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'TO_3B';
    if (base === 'first') return 'TO_2B';
  }
  if (isOut(result)) return 'HELD';
  return null;
}

function isExtraAdvancement(
  result: AtBatResult,
  bases: Bases,
  base: 'first' | 'second' | 'third',
  outcome: RunnerOutcome
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

  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (base === 'first') return destination !== '2B';
    if (base === 'second') {
      if (isRunnerForced(result, bases, 'second')) {
        return destination === 'HOME';
      } else {
        return true;
      }
    }
    if (base === 'third') {
      if (isRunnerForced(result, bases, 'third')) {
        return false;
      } else {
        return destination === 'HOME';
      }
    }
  }
  if (['K', 'KL'].includes(result)) return true;
  if (result === '1B') {
    if (base === 'first' && destination === 'HOME') return true;
  }
  return false;
}

function checkAutoCorrection(
  initialResult: AtBatResult,
  bases: Bases,
  outs: number,
  outcomes: { first: RunnerOutcome | null; second: RunnerOutcome | null; third: RunnerOutcome | null }
): { newResult: AtBatResult; message: string | null } {
  if (initialResult === 'FO' && outs < 2 && bases.third && outcomes.third === 'SCORED') {
    return { newResult: 'SF', message: 'Auto-corrected to Sac Fly' };
  }
  return { newResult: initialResult, message: null };
}

// =============================================
// TEST RUNNER
// =============================================

function runTests(): void {
  console.log('\\n========================================');
  console.log('BASEBALL STATE MACHINE TEST RESULTS');
  console.log('========================================\\n');

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const errors: string[] = [];

    // Test R1 default
    if (tc.expected.r1Default !== undefined && tc.bases.first) {
      const actual = getDefaultOutcome(tc.result, tc.bases, tc.outs, 'first');
      if (actual !== tc.expected.r1Default) {
        errors.push(`R1 default: expected ${tc.expected.r1Default}, got ${actual}`);
      }
    }

    // Test R2 default
    if (tc.expected.r2Default !== undefined && tc.bases.second) {
      const actual = getDefaultOutcome(tc.result, tc.bases, tc.outs, 'second');
      if (actual !== tc.expected.r2Default) {
        errors.push(`R2 default: expected ${tc.expected.r2Default}, got ${actual}`);
      }
    }

    // Test R3 default
    if (tc.expected.r3Default !== undefined && tc.bases.third) {
      const actual = getDefaultOutcome(tc.result, tc.bases, tc.outs, 'third');
      if (actual !== tc.expected.r3Default) {
        errors.push(`R3 default: expected ${tc.expected.r3Default}, got ${actual}`);
      }
    }

    // Test R1 forced
    if (tc.expected.r1Forced !== undefined && tc.bases.first) {
      const actual = isRunnerForced(tc.result, tc.bases, 'first');
      if (actual !== tc.expected.r1Forced) {
        errors.push(`R1 forced: expected ${tc.expected.r1Forced}, got ${actual}`);
      }
    }

    // Test R2 forced
    if (tc.expected.r2Forced !== undefined && tc.bases.second) {
      const actual = isRunnerForced(tc.result, tc.bases, 'second');
      if (actual !== tc.expected.r2Forced) {
        errors.push(`R2 forced: expected ${tc.expected.r2Forced}, got ${actual}`);
      }
    }

    // Test R3 forced
    if (tc.expected.r3Forced !== undefined && tc.bases.third) {
      const actual = isRunnerForced(tc.result, tc.bases, 'third');
      if (actual !== tc.expected.r3Forced) {
        errors.push(`R3 forced: expected ${tc.expected.r3Forced}, got ${actual}`);
      }
    }

    // Test R1 extra advancement on TO_3B
    if (tc.expected.r1ExtraOnTo3B !== undefined && tc.bases.first) {
      const actual = isExtraAdvancement(tc.result, tc.bases, 'first', 'TO_3B');
      if (actual !== tc.expected.r1ExtraOnTo3B) {
        errors.push(`R1 extra on TO_3B: expected ${tc.expected.r1ExtraOnTo3B}, got ${actual}`);
      }
    }

    // Test R1 extra advancement on SCORED
    if (tc.expected.r1ExtraOnScored !== undefined && tc.bases.first) {
      const actual = isExtraAdvancement(tc.result, tc.bases, 'first', 'SCORED');
      if (actual !== tc.expected.r1ExtraOnScored) {
        errors.push(`R1 extra on SCORED: expected ${tc.expected.r1ExtraOnScored}, got ${actual}`);
      }
    }

    // Test auto-correction to SF
    if (tc.expected.autoCorrectToSF !== undefined) {
      const outcomes = {
        first: tc.bases.first ? getDefaultOutcome(tc.result, tc.bases, tc.outs, 'first') : null,
        second: tc.bases.second ? getDefaultOutcome(tc.result, tc.bases, tc.outs, 'second') : null,
        third: tc.bases.third ? getDefaultOutcome(tc.result, tc.bases, tc.outs, 'third') : null,
      };
      const correction = checkAutoCorrection(tc.result, tc.bases, tc.outs, outcomes);
      const didCorrect = correction.newResult === 'SF';
      if (didCorrect !== tc.expected.autoCorrectToSF) {
        errors.push(`Auto-correct to SF: expected ${tc.expected.autoCorrectToSF}, got ${didCorrect}`);
      }
    }

    // Report results
    if (errors.length === 0) {
      console.log(`✅ PASS: ${tc.name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${tc.name}`);
      errors.forEach(e => console.log(`   - ${e}`));
      failed++;
    }
  }

  console.log('\\n========================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('========================================\\n');

  // Use globalThis for cross-environment compatibility
  if (typeof globalThis !== 'undefined' && 'process' in globalThis) {
    (globalThis as any).process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
