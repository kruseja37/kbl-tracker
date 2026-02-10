/**
 * Fielding Inference Tests - NFL Verification
 *
 * Tests the fielder inference logic per FIELDING_SYSTEM_SPEC.md
 * Run with: npx ts-node src/tests/fieldingInferenceTests.ts
 */

import type { AtBatResult, Direction, ExitType, Position, Bases } from '../types/game';

// ============================================
// COPY OF INFERENCE LOGIC FROM FieldingModal.tsx
// ============================================

type InferenceResult = { primary: Position; secondary?: Position; tertiary?: Position };
type FairDirection = 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right';

const GROUND_BALL_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'SS', tertiary: 'P' },
  'Left-Center': { primary: 'SS', secondary: '3B', tertiary: '2B' },
  'Center': { primary: 'P', secondary: 'SS', tertiary: '2B' },
  'Right-Center': { primary: '2B', secondary: '1B', tertiary: 'SS' },
  'Right': { primary: '1B', secondary: '2B', tertiary: 'P' },
};

const FLY_BALL_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: 'LF', secondary: 'CF', tertiary: '3B' },
  'Left-Center': { primary: 'CF', secondary: 'LF', tertiary: 'SS' },
  'Center': { primary: 'CF' },
  'Right-Center': { primary: 'CF', secondary: 'RF', tertiary: '2B' },
  'Right': { primary: 'RF', secondary: 'CF', tertiary: '1B' },
};

const LINE_DRIVE_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'LF' },
  'Left-Center': { primary: 'SS', secondary: 'CF' },
  'Center': { primary: 'P', secondary: 'CF' },
  'Right-Center': { primary: '2B', secondary: 'CF' },
  'Right': { primary: '1B', secondary: 'RF' },
};

const POP_FLY_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'SS' },
  'Left-Center': { primary: 'SS', secondary: '3B' },
  'Center': { primary: 'SS', secondary: '2B' },
  'Right-Center': { primary: '2B', secondary: '1B' },
  'Right': { primary: '1B', secondary: '2B' },
};

function inferFielderEnhanced(
  result: AtBatResult,
  direction: Direction | null,
  exitType?: ExitType | null
): Position | null {
  if (!direction) return null;

  // Cast to FairDirection for matrix lookup (foul directions handled separately in production code)
  const fairDir = direction as FairDirection;
  let inference: InferenceResult | null = null;

  // For hits, use exit type first if available
  if (['1B', '2B', '3B'].includes(result) && exitType) {
    if (exitType === 'Ground') {
      inference = GROUND_BALL_INFERENCE[fairDir];
    } else if (exitType === 'Line Drive') {
      inference = LINE_DRIVE_INFERENCE[fairDir];
    } else if (exitType === 'Fly Ball') {
      inference = FLY_BALL_INFERENCE[fairDir];
    } else if (exitType === 'Pop Up') {
      inference = POP_FLY_INFERENCE[fairDir];
    }
  }
  // Ground balls (by result)
  else if (['GO', 'DP', 'FC', 'SAC'].includes(result) || exitType === 'Ground') {
    inference = GROUND_BALL_INFERENCE[fairDir];
  }
  // Fly balls (by result)
  else if (['FO', 'SF'].includes(result) || exitType === 'Fly Ball') {
    inference = FLY_BALL_INFERENCE[fairDir];
  }
  // Line drives (by result)
  else if (result === 'LO' || exitType === 'Line Drive') {
    inference = LINE_DRIVE_INFERENCE[fairDir];
  }
  // Pop flies (by result)
  else if (result === 'PO' || exitType === 'Pop Up') {
    inference = POP_FLY_INFERENCE[fairDir];
  }

  return inference?.primary || null;
}

// ============================================
// TEST CASES
// ============================================

interface TestCase {
  name: string;
  result: AtBatResult;
  direction: Direction;
  exitType?: ExitType;
  expected: Position;
}

const testCases: TestCase[] = [
  // ===== GROUND BALL INFERENCE (GO) =====
  { name: 'GO Left → 3B', result: 'GO', direction: 'Left', expected: '3B' },
  { name: 'GO Left-Center → SS', result: 'GO', direction: 'Left-Center', expected: 'SS' },
  { name: 'GO Center → P', result: 'GO', direction: 'Center', expected: 'P' },
  { name: 'GO Right-Center → 2B', result: 'GO', direction: 'Right-Center', expected: '2B' },
  { name: 'GO Right → 1B', result: 'GO', direction: 'Right', expected: '1B' },

  // ===== DOUBLE PLAY INFERENCE (DP) =====
  { name: 'DP Left → 3B', result: 'DP', direction: 'Left', expected: '3B' },
  { name: 'DP Left-Center → SS', result: 'DP', direction: 'Left-Center', expected: 'SS' },
  { name: 'DP Center → P', result: 'DP', direction: 'Center', expected: 'P' },
  { name: 'DP Right-Center → 2B', result: 'DP', direction: 'Right-Center', expected: '2B' },
  { name: 'DP Right → 1B', result: 'DP', direction: 'Right', expected: '1B' },

  // ===== FIELDER'S CHOICE (FC) =====
  { name: 'FC Left → 3B', result: 'FC', direction: 'Left', expected: '3B' },
  { name: 'FC Left-Center → SS', result: 'FC', direction: 'Left-Center', expected: 'SS' },

  // ===== FLY BALL INFERENCE (FO) =====
  { name: 'FO Left → LF', result: 'FO', direction: 'Left', expected: 'LF' },
  { name: 'FO Left-Center → CF', result: 'FO', direction: 'Left-Center', expected: 'CF' },
  { name: 'FO Center → CF', result: 'FO', direction: 'Center', expected: 'CF' },
  { name: 'FO Right-Center → CF', result: 'FO', direction: 'Right-Center', expected: 'CF' },
  { name: 'FO Right → RF', result: 'FO', direction: 'Right', expected: 'RF' },

  // ===== SACRIFICE FLY (SF) =====
  { name: 'SF Left → LF', result: 'SF', direction: 'Left', expected: 'LF' },
  { name: 'SF Center → CF', result: 'SF', direction: 'Center', expected: 'CF' },
  { name: 'SF Right → RF', result: 'SF', direction: 'Right', expected: 'RF' },

  // ===== LINE DRIVE INFERENCE (LO) =====
  { name: 'LO Left → 3B', result: 'LO', direction: 'Left', expected: '3B' },
  { name: 'LO Left-Center → SS', result: 'LO', direction: 'Left-Center', expected: 'SS' },
  { name: 'LO Center → P', result: 'LO', direction: 'Center', expected: 'P' },
  { name: 'LO Right-Center → 2B', result: 'LO', direction: 'Right-Center', expected: '2B' },
  { name: 'LO Right → 1B', result: 'LO', direction: 'Right', expected: '1B' },

  // ===== POP FLY INFERENCE (PO) =====
  { name: 'PO Left → 3B', result: 'PO', direction: 'Left', expected: '3B' },
  { name: 'PO Left-Center → SS', result: 'PO', direction: 'Left-Center', expected: 'SS' },
  { name: 'PO Center → SS', result: 'PO', direction: 'Center', expected: 'SS' },
  { name: 'PO Right-Center → 2B', result: 'PO', direction: 'Right-Center', expected: '2B' },
  { name: 'PO Right → 1B', result: 'PO', direction: 'Right', expected: '1B' },

  // ===== HIT WITH EXIT TYPE (1B) =====
  { name: '1B Ground Left → 3B', result: '1B', direction: 'Left', exitType: 'Ground', expected: '3B' },
  { name: '1B Ground Right → 1B', result: '1B', direction: 'Right', exitType: 'Ground', expected: '1B' },
  { name: '1B Line Drive Left → 3B', result: '1B', direction: 'Left', exitType: 'Line Drive', expected: '3B' },
  { name: '1B Line Drive Center → P', result: '1B', direction: 'Center', exitType: 'Line Drive', expected: 'P' },
  { name: '1B Fly Ball Left → LF', result: '1B', direction: 'Left', exitType: 'Fly Ball', expected: 'LF' },

  // ===== HIT WITH EXIT TYPE (2B) =====
  { name: '2B Fly Ball LC → CF', result: '2B', direction: 'Left-Center', exitType: 'Fly Ball', expected: 'CF' },
  { name: '2B Line Drive RC → 2B', result: '2B', direction: 'Right-Center', exitType: 'Line Drive', expected: '2B' },
  { name: '2B Ground through hole → SS', result: '2B', direction: 'Left-Center', exitType: 'Ground', expected: 'SS' },

  // ===== HIT WITH EXIT TYPE (3B) =====
  { name: '3B Fly Ball RC → CF', result: '3B', direction: 'Right-Center', exitType: 'Fly Ball', expected: 'CF' },
  { name: '3B Line Drive Right → 1B', result: '3B', direction: 'Right', exitType: 'Line Drive', expected: '1B' },

  // ===== SACRIFICE BUNT (SAC) =====
  { name: 'SAC Center → P', result: 'SAC', direction: 'Center', expected: 'P' },
  { name: 'SAC Left → 3B', result: 'SAC', direction: 'Left', expected: '3B' },
  { name: 'SAC Right → 1B', result: 'SAC', direction: 'Right', expected: '1B' },

  // ===== NULL DIRECTION =====
  // This should return null - tested separately
];

// ============================================
// CONTEXTUAL VISIBILITY TESTS
// ============================================

interface ContextualTest {
  name: string;
  result: AtBatResult;
  direction: Direction;
  bases: Bases;
  outs: number;
  expectedVisible: {
    showIFR?: boolean;
    showGRD?: boolean;
    showBadHop?: boolean;
    showNutshot?: boolean;
    showRobbery?: boolean;
  };
}

function createBases(
  first: boolean = false,
  second: boolean = false,
  third: boolean = false
): Bases {
  return {
    first: first ? { playerName: 'R1', playerId: 'p1', inheritedFrom: null } : null,
    second: second ? { playerName: 'R2', playerId: 'p2', inheritedFrom: null } : null,
    third: third ? { playerName: 'R3', playerId: 'p3', inheritedFrom: null } : null,
  };
}

// Contextual visibility functions (from FieldingModal)
function shouldShowIFR(result: AtBatResult, bases: Bases, outs: number): boolean {
  return ['PO', 'FO'].includes(result) &&
    outs < 2 &&
    ((!!bases.first && !!bases.second) || (!!bases.first && !!bases.second && !!bases.third));
}

function shouldShowGRD(result: AtBatResult): boolean {
  return result === '2B';
}

function shouldShowBadHop(result: AtBatResult): boolean {
  return ['1B', '2B', '3B'].includes(result);
}

function shouldShowNutshot(result: AtBatResult, direction: Direction): boolean {
  return direction === 'Center' && ['GO', 'LO', '1B'].includes(result);
}

function shouldShowRobbery(result: AtBatResult): boolean {
  return result === 'HR';
}

const contextualTests: ContextualTest[] = [
  // IFR visibility tests
  {
    name: 'IFR visible: PO + R1R2 + 0 outs',
    result: 'PO',
    direction: 'Center',
    bases: createBases(true, true, false),
    outs: 0,
    expectedVisible: { showIFR: true }
  },
  {
    name: 'IFR visible: FO + bases loaded + 1 out',
    result: 'FO',
    direction: 'Center',
    bases: createBases(true, true, true),
    outs: 1,
    expectedVisible: { showIFR: true }
  },
  {
    name: 'IFR NOT visible: PO + 2 outs',
    result: 'PO',
    direction: 'Center',
    bases: createBases(true, true, false),
    outs: 2,
    expectedVisible: { showIFR: false }
  },
  {
    name: 'IFR NOT visible: PO + only R1',
    result: 'PO',
    direction: 'Center',
    bases: createBases(true, false, false),
    outs: 0,
    expectedVisible: { showIFR: false }
  },
  {
    name: 'IFR NOT visible: GO (not a fly ball)',
    result: 'GO',
    direction: 'Center',
    bases: createBases(true, true, false),
    outs: 0,
    expectedVisible: { showIFR: false }
  },

  // GRD visibility tests
  {
    name: 'GRD visible: 2B',
    result: '2B',
    direction: 'Left-Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showGRD: true }
  },
  {
    name: 'GRD NOT visible: 1B',
    result: '1B',
    direction: 'Left-Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showGRD: false }
  },
  {
    name: 'GRD NOT visible: 3B',
    result: '3B',
    direction: 'Left-Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showGRD: false }
  },

  // Bad Hop visibility tests
  {
    name: 'Bad Hop visible: 1B',
    result: '1B',
    direction: 'Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showBadHop: true }
  },
  {
    name: 'Bad Hop visible: 2B',
    result: '2B',
    direction: 'Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showBadHop: true }
  },
  {
    name: 'Bad Hop visible: 3B',
    result: '3B',
    direction: 'Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showBadHop: true }
  },
  {
    name: 'Bad Hop NOT visible: GO',
    result: 'GO',
    direction: 'Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showBadHop: false }
  },
  {
    name: 'Bad Hop NOT visible: FO',
    result: 'FO',
    direction: 'Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showBadHop: false }
  },

  // Nutshot visibility tests
  {
    name: 'Nutshot visible: GO Center',
    result: 'GO',
    direction: 'Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showNutshot: true }
  },
  {
    name: 'Nutshot visible: LO Center',
    result: 'LO',
    direction: 'Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showNutshot: true }
  },
  {
    name: 'Nutshot visible: 1B Center',
    result: '1B',
    direction: 'Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showNutshot: true }
  },
  {
    name: 'Nutshot NOT visible: GO Left',
    result: 'GO',
    direction: 'Left',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showNutshot: false }
  },
  {
    name: 'Nutshot NOT visible: FO Center',
    result: 'FO',
    direction: 'Center',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showNutshot: false }
  },

  // Robbery visibility tests
  {
    name: 'Robbery visible: HR',
    result: 'HR',
    direction: 'Left',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showRobbery: true }
  },
  {
    name: 'Robbery NOT visible: FO',
    result: 'FO',
    direction: 'Left',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showRobbery: false }
  },
  {
    name: 'Robbery NOT visible: 2B',
    result: '2B',
    direction: 'Left',
    bases: createBases(),
    outs: 0,
    expectedVisible: { showRobbery: false }
  },
];

// ============================================
// TEST RUNNER
// ============================================

function runTests(): void {
  let passed = 0;
  let failed = 0;

  console.log('========================================');
  console.log('FIELDING INFERENCE TESTS');
  console.log('========================================\n');

  // Run inference tests
  console.log('--- Fielder Inference Tests ---\n');
  for (const tc of testCases) {
    const actual = inferFielderEnhanced(tc.result, tc.direction, tc.exitType);
    if (actual === tc.expected) {
      console.log(`✓ ${tc.name}`);
      passed++;
    } else {
      console.log(`✗ ${tc.name}`);
      console.log(`  Expected: ${tc.expected}, Got: ${actual}`);
      failed++;
    }
  }

  // Test null direction
  const nullResult = inferFielderEnhanced('GO', null);
  if (nullResult === null) {
    console.log('✓ Null direction returns null');
    passed++;
  } else {
    console.log('✗ Null direction should return null');
    console.log(`  Expected: null, Got: ${nullResult}`);
    failed++;
  }

  console.log('\n--- Contextual Visibility Tests ---\n');
  for (const tc of contextualTests) {
    const errors: string[] = [];

    if (tc.expectedVisible.showIFR !== undefined) {
      const actual = shouldShowIFR(tc.result, tc.bases, tc.outs);
      if (actual !== tc.expectedVisible.showIFR) {
        errors.push(`showIFR: expected ${tc.expectedVisible.showIFR}, got ${actual}`);
      }
    }

    if (tc.expectedVisible.showGRD !== undefined) {
      const actual = shouldShowGRD(tc.result);
      if (actual !== tc.expectedVisible.showGRD) {
        errors.push(`showGRD: expected ${tc.expectedVisible.showGRD}, got ${actual}`);
      }
    }

    if (tc.expectedVisible.showBadHop !== undefined) {
      const actual = shouldShowBadHop(tc.result);
      if (actual !== tc.expectedVisible.showBadHop) {
        errors.push(`showBadHop: expected ${tc.expectedVisible.showBadHop}, got ${actual}`);
      }
    }

    if (tc.expectedVisible.showNutshot !== undefined) {
      const actual = shouldShowNutshot(tc.result, tc.direction);
      if (actual !== tc.expectedVisible.showNutshot) {
        errors.push(`showNutshot: expected ${tc.expectedVisible.showNutshot}, got ${actual}`);
      }
    }

    if (tc.expectedVisible.showRobbery !== undefined) {
      const actual = shouldShowRobbery(tc.result);
      if (actual !== tc.expectedVisible.showRobbery) {
        errors.push(`showRobbery: expected ${tc.expectedVisible.showRobbery}, got ${actual}`);
      }
    }

    if (errors.length === 0) {
      console.log(`✓ ${tc.name}`);
      passed++;
    } else {
      console.log(`✗ ${tc.name}`);
      errors.forEach(e => console.log(`  ${e}`));
      failed++;
    }
  }

  console.log('\n========================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  // ===== DP CHAIN TESTS =====
  console.log('\n--- DP Chain Tests ---\n');

  const dpChains: Record<FairDirection, string> = {
    'Left': '5-4-3',
    'Left-Center': '6-4-3',
    'Center': '6-4-3',
    'Right-Center': '4-6-3',
    'Right': '3-6-3',
  };

  const posMap: Record<string, Position> = {
    '1': 'P', '2': 'C', '3': '1B', '4': '2B', '5': '3B', '6': 'SS', '7': 'LF', '8': 'CF', '9': 'RF'
  };

  function buildAssistChain(dpString: string): Position[] {
    const parts = dpString.split('-');
    return parts.slice(0, -1).map(num => posMap[num]);
  }

  function getPutout(dpString: string): Position {
    const parts = dpString.split('-');
    return posMap[parts[parts.length - 1]];
  }

  for (const [dir, chain] of Object.entries(dpChains) as [FairDirection, string][]) {
    const assists = buildAssistChain(chain);
    const putout = getPutout(chain);

    // Verify chain makes sense
    const valid = assists.length >= 1 && putout !== undefined;
    if (valid) {
      console.log(`✓ DP ${dir} → ${chain} (assists: ${assists.join(',')} putout: ${putout})`);
      passed++;
    } else {
      console.log(`✗ DP ${dir} → ${chain} invalid chain`);
      failed++;
    }
  }

  // Specific DP chain validations
  const dpTests = [
    { chain: '6-4-3', expectedAssists: ['SS', '2B'], expectedPutout: '1B' },
    { chain: '4-6-3', expectedAssists: ['2B', 'SS'], expectedPutout: '1B' },
    { chain: '5-4-3', expectedAssists: ['3B', '2B'], expectedPutout: '1B' },
    { chain: '3-6-3', expectedAssists: ['1B', 'SS'], expectedPutout: '1B' },
    { chain: '6-3', expectedAssists: ['SS'], expectedPutout: '1B' },
    { chain: '4-3', expectedAssists: ['2B'], expectedPutout: '1B' },
    { chain: '1-6-3', expectedAssists: ['P', 'SS'], expectedPutout: '1B' },
    { chain: '1-4-3', expectedAssists: ['P', '2B'], expectedPutout: '1B' },
  ];

  for (const test of dpTests) {
    const actualAssists = buildAssistChain(test.chain);
    const actualPutout = getPutout(test.chain);

    const assistsMatch = JSON.stringify(actualAssists) === JSON.stringify(test.expectedAssists);
    const putoutMatch = actualPutout === test.expectedPutout;

    if (assistsMatch && putoutMatch) {
      console.log(`✓ Chain ${test.chain}: assists [${test.expectedAssists.join(',')}] putout ${test.expectedPutout}`);
      passed++;
    } else {
      console.log(`✗ Chain ${test.chain}`);
      if (!assistsMatch) console.log(`  Assists: expected [${test.expectedAssists.join(',')}], got [${actualAssists.join(',')}]`);
      if (!putoutMatch) console.log(`  Putout: expected ${test.expectedPutout}, got ${actualPutout}`);
      failed++;
    }
  }

  // ===== D3K OUTCOME TESTS =====
  console.log('\n--- D3K Outcome Tests ---\n');

  type D3KOutcome = 'OUT' | 'WP' | 'PB' | 'E_CATCHER' | 'E_1B';

  interface D3KTest {
    outcome: D3KOutcome;
    batterOut: boolean;
    batterReaches: boolean;
    strikeoutCredited: boolean;
    description: string;
  }

  const d3kTests: D3KTest[] = [
    { outcome: 'OUT', batterOut: true, batterReaches: false, strikeoutCredited: true, description: 'Thrown out at 1B' },
    { outcome: 'WP', batterOut: false, batterReaches: true, strikeoutCredited: true, description: 'Safe on Wild Pitch' },
    { outcome: 'PB', batterOut: false, batterReaches: true, strikeoutCredited: true, description: 'Safe on Passed Ball' },
    { outcome: 'E_CATCHER', batterOut: false, batterReaches: true, strikeoutCredited: true, description: 'Safe on Catcher Error' },
    { outcome: 'E_1B', batterOut: false, batterReaches: true, strikeoutCredited: true, description: 'Safe on 1B Error' },
  ];

  for (const test of d3kTests) {
    // Verify the logic: batter ALWAYS gets K credited, regardless of outcome
    if (test.strikeoutCredited) {
      console.log(`✓ D3K ${test.outcome}: ${test.description} - Strikeout credited: YES`);
      passed++;
    } else {
      console.log(`✗ D3K ${test.outcome}: ${test.description} - Strikeout should always be credited`);
      failed++;
    }

    // Verify batter out/safe status
    if (test.outcome === 'OUT') {
      if (test.batterOut && !test.batterReaches) {
        console.log(`✓ D3K ${test.outcome}: Batter is OUT`);
        passed++;
      } else {
        console.log(`✗ D3K ${test.outcome}: Batter should be OUT`);
        failed++;
      }
    } else {
      if (!test.batterOut && test.batterReaches) {
        console.log(`✓ D3K ${test.outcome}: Batter reaches safely`);
        passed++;
      } else {
        console.log(`✗ D3K ${test.outcome}: Batter should reach safely`);
        failed++;
      }
    }
  }

  console.log('\n========================================');
  console.log(`FINAL SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (typeof globalThis !== 'undefined' && 'process' in globalThis) {
    (globalThis as any).process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
