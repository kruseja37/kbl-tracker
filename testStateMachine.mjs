/**
 * State Machine Test Runner (ES Module)
 * Run with: node testStateMachine.mjs
 */

// =============================================
// EXTRACTED LOGIC FUNCTIONS (from AtBatFlow.tsx)
// =============================================

function isRunnerForced(result, bases, base) {
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

function getMinimumAdvancement(result, bases, base) {
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

function isOut(result) {
  return ['K', 'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'SF', 'SAC'].includes(result);
}

function getDefaultOutcome(result, bases, outs, base) {
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

function isExtraAdvancement(result, bases, base, outcome) {
  const outcomeToDestination = (o) => {
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

function checkAutoCorrection(initialResult, bases, outs, outcomes) {
  if (initialResult === 'FO' && outs < 2 && bases.third && outcomes.third === 'SCORED') {
    return { newResult: 'SF', message: 'Auto-corrected to Sac Fly' };
  }
  return { newResult: initialResult, message: null };
}

// =============================================
// HELPER
// =============================================

const createBases = (r1, r2, r3) => ({
  first: r1 ? { playerId: '1', playerName: 'Runner 1', inheritedFrom: null } : null,
  second: r2 ? { playerId: '2', playerName: 'Runner 2', inheritedFrom: null } : null,
  third: r3 ? { playerId: '3', playerName: 'Runner 3', inheritedFrom: null } : null,
});

// =============================================
// TEST CASES
// =============================================

const testCases = [
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
  // =============================================
  // ADDITIONAL EDGE CASE TESTS
  // =============================================
  {
    name: 'TEST 16: Walk with R2+R3 (no R1) - Neither forced, both HELD',
    result: 'BB',
    bases: createBases(false, true, true),
    outs: 0,
    expected: { r2Default: 'HELD', r3Default: 'HELD', r2Forced: false, r3Forced: false },
  },
  {
    name: 'TEST 17: Walk with R1+R3 (no R2) - R1 forced, R3 not forced',
    result: 'BB',
    bases: createBases(true, false, true),
    outs: 0,
    expected: { r1Default: 'TO_2B', r3Default: 'HELD', r1Forced: true, r3Forced: false },
  },
  {
    name: 'TEST 18: Double with R1 only - R1 to 3B (not just 2B)',
    result: '2B',
    bases: createBases(true, false, false),
    outs: 0,
    expected: { r1Default: 'TO_3B', r1Forced: true },
  },
  {
    name: 'TEST 19: Double with R1+R2+R3 - R1 to 3B, R2+R3 score',
    result: '2B',
    bases: createBases(true, true, true),
    outs: 0,
    expected: { r1Default: 'TO_3B', r2Default: 'SCORED', r3Default: 'SCORED' },
  },
  {
    name: 'TEST 20: HBP same as walk - R1 forced to 2B',
    result: 'HBP',
    bases: createBases(true, false, false),
    outs: 0,
    expected: { r1Default: 'TO_2B', r1Forced: true },
  },
  {
    name: 'TEST 21: IBB same as walk - bases loaded forces R3 score',
    result: 'IBB',
    bases: createBases(true, true, true),
    outs: 0,
    expected: { r1Default: 'TO_2B', r2Default: 'TO_3B', r3Default: 'SCORED' },
  },
  {
    name: 'TEST 22: Error with R1+R2 - both advance one base',
    result: 'E',
    bases: createBases(true, true, false),
    outs: 0,
    expected: { r1Default: 'TO_2B', r2Default: 'TO_3B' },
  },
  {
    name: 'TEST 23: SF with R1+R3 - R3 scores, R1 holds',
    result: 'SF',
    bases: createBases(true, false, true),
    outs: 0,
    expected: { r1Default: 'HELD', r3Default: 'SCORED' },
  },
  {
    name: 'TEST 24: SAC with R1+R2 - both advance one base',
    result: 'SAC',
    bases: createBases(true, true, false),
    outs: 0,
    expected: { r1Default: 'TO_2B', r2Default: 'TO_3B' },
  },
  {
    name: 'TEST 25: Line out with runners - all HELD',
    result: 'LO',
    bases: createBases(true, true, true),
    outs: 0,
    expected: { r1Default: 'HELD', r2Default: 'HELD', r3Default: 'HELD' },
  },
  {
    name: 'TEST 26: Pop out with runners - all HELD',
    result: 'PO',
    bases: createBases(true, true, true),
    outs: 0,
    expected: { r1Default: 'HELD', r2Default: 'HELD', r3Default: 'HELD' },
  },
  {
    name: 'TEST 27: K with advancement requires extra event',
    result: 'K',
    bases: createBases(true, false, false),
    outs: 0,
    expected: { r1Default: 'HELD', r1ExtraOnTo3B: true, r1ExtraOnScored: true },
  },
  {
    name: 'TEST 28: DP with R1+R2 - R1 out, R2 holds',
    result: 'DP',
    bases: createBases(true, true, false),
    outs: 0,
    expected: { r1Default: 'OUT_2B', r2Default: 'HELD' },
  },
  {
    name: 'TEST 29: FC with R1+R2 - R1 out, R2 holds',
    result: 'FC',
    bases: createBases(true, true, false),
    outs: 0,
    expected: { r1Default: 'OUT_2B', r2Default: 'HELD' },
  },
  {
    name: 'TEST 30: Single with R1 scoring requires extra event (error)',
    result: '1B',
    bases: createBases(true, false, false),
    outs: 0,
    expected: { r1Default: 'TO_2B', r1ExtraOnScored: true },
  },
];

// =============================================
// TEST RUNNER
// =============================================

console.log('\n========================================');
console.log('BASEBALL STATE MACHINE TEST RESULTS');
console.log('========================================\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const errors = [];

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

console.log('\n========================================');
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
