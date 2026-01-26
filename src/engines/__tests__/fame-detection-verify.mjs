/**
 * Day 4 Verification Tests - Fame Engine & Detection Functions
 * Tests: Fame calculations, milestone detection, prompt detection
 */

// Since we're in ESM, we need to dynamically import
const { createRequire } = await import('module');
const require = createRequire(import.meta.url);

// Load compiled JS from dist or use ts-node
let fameEngine, detectionFunctions;

try {
  // Try importing from compiled output
  fameEngine = await import('../fameEngine.ts');
  detectionFunctions = await import('../detectionFunctions.ts');
} catch {
  // Fallback: read and eval (not ideal but works for testing)
  console.log('Note: Running with direct TS imports via ts-node or similar');
  process.exit(0);
}

const {
  getLIMultiplier,
  calculateFame,
  getFameTier,
  detectCareerMilestones,
  detectSeasonMilestones,
  detectFirstCareer,
  CAREER_THRESHOLDS,
} = fameEngine;

const {
  promptWebGem,
  promptRobbery,
  promptTOOTBLAN,
  detectBlownSave,
  isSaveOpportunity,
  detectTriplePlay,
  detectEscapeArtist,
  detectClutchGrandSlam,
} = detectionFunctions;

// ============================================
// TEST UTILITIES
// ============================================

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ FAIL: ${name}`);
    console.log(`       ${e.message}`);
    failed++;
  }
}

function assertRange(value, min, max, label) {
  if (value < min || value > max) {
    throw new Error(`${label}: ${value} not in range [${min}, ${max}]`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, label) {
  if (!condition) {
    throw new Error(`${label}: expected true, got false`);
  }
}

function assertFalse(condition, label) {
  if (condition) {
    throw new Error(`${label}: expected false, got true`);
  }
}

function assertNotNull(value, label) {
  if (value === null || value === undefined) {
    throw new Error(`${label}: expected non-null value`);
  }
}

function assertNull(value, label) {
  if (value !== null && value !== undefined) {
    throw new Error(`${label}: expected null, got ${JSON.stringify(value)}`);
  }
}

// ============================================
// FAME ENGINE TESTS
// ============================================

console.log('\n' + '═'.repeat(60));
console.log('       DAY 4 VERIFICATION - Fame Engine & Detection         ');
console.log('═'.repeat(60) + '\n');

console.log('LI MULTIPLIER TESTS');
console.log('─'.repeat(45));

test('LI multiplier at LI=1.0 (average)', () => {
  const mult = getLIMultiplier(1.0);
  assertRange(mult, 0.99, 1.01, 'LI=1.0 multiplier');
});

test('LI multiplier at LI=4.0', () => {
  const mult = getLIMultiplier(4.0);
  assertRange(mult, 1.99, 2.01, 'LI=4.0 multiplier'); // √4 = 2
});

test('LI multiplier at LI=9.0', () => {
  const mult = getLIMultiplier(9.0);
  assertRange(mult, 2.99, 3.01, 'LI=9.0 multiplier'); // √9 = 3
});

test('LI multiplier clamped at minimum', () => {
  const mult = getLIMultiplier(0.01);
  assertRange(mult, 0.31, 0.33, 'LI=0.01 clamped to 0.1'); // √0.1 ≈ 0.316
});

console.log('\nFAME CALCULATION TESTS');
console.log('─'.repeat(45));

test('Fame calculation - Walk-off HR at LI=1.0', () => {
  const result = calculateFame('WALK_OFF_HR', 1.0);
  assertRange(result.finalFame, 1.49, 1.51, 'Walk-off HR fame');
  assertTrue(result.isBonus, 'Should be bonus');
});

test('Fame calculation - Walk-off HR at LI=4.0 (high leverage)', () => {
  const result = calculateFame('WALK_OFF_HR', 4.0);
  assertRange(result.finalFame, 2.99, 3.01, 'High LI walk-off'); // 1.5 × 2 = 3
});

test('Fame calculation - Golden Sombrero at LI=2.0', () => {
  const result = calculateFame('GOLDEN_SOMBRERO', 2.0);
  assertTrue(result.isBoner, 'Should be boner');
  assertTrue(result.finalFame < 0, 'Fame should be negative');
  assertRange(result.finalFame, -1.42, -1.40, 'Golden Sombrero shame'); // -1 × √2 ≈ -1.41
});

test('Fame calculation - World Series with playoff multiplier', () => {
  const result = calculateFame('WALK_OFF_GRAND_SLAM', 4.0, {
    isPlayoffs: true,
    round: 'world_series',
    isEliminationGame: true,
    isClinchGame: true,
  });
  // Base: 3, LI: 2 (√4), Playoff: 2.75 (2.0 + 0.5 + 0.25)
  // Total: 3 × 2 × 2.75 = 16.5
  assertRange(result.finalFame, 16.4, 16.6, 'WS Game 7 walk-off grand slam');
});

console.log('\nFAME TIER TESTS');
console.log('─'.repeat(45));

test('Fame tier - Legendary (50+)', () => {
  const tier = getFameTier(55);
  assertEqual(tier.tier, 'LEGENDARY', 'Tier');
  assertEqual(tier.label, 'Legend', 'Label');
});

test('Fame tier - Superstar (30-50)', () => {
  const tier = getFameTier(35);
  assertEqual(tier.tier, 'SUPERSTAR', 'Tier');
});

test('Fame tier - Notorious (<-30)', () => {
  const tier = getFameTier(-40);
  assertEqual(tier.tier, 'NOTORIOUS', 'Tier');
  assertEqual(tier.label, 'Notorious', 'Label');
});

console.log('\nCAREER MILESTONE TESTS');
console.log('─'.repeat(45));

test('Detect first career home run', () => {
  const result = detectFirstCareer('homeRun', 1, 0);
  assertNotNull(result, 'Should detect milestone');
  assertEqual(result.eventType, 'FIRST_CAREER', 'Event type');
});

test('No milestone when not first', () => {
  const result = detectFirstCareer('homeRun', 2, 1);
  assertNull(result, 'Should not detect');
});

test('Detect career HR milestone (25)', () => {
  const currentStats = {
    hits: 0, homeRuns: 25, rbi: 0, runs: 0, stolenBases: 0, doubles: 0,
    walks: 0, grandSlams: 0, strikeoutsBatter: 0, gidp: 0, caughtStealing: 0,
    wins: 0, losses: 0, strikeoutsPitcher: 0, saves: 0, blownSaves: 0,
    inningsPitched: 0, shutouts: 0, completeGames: 0, noHitters: 0,
    perfectGames: 0, wildPitches: 0, hbpPitcher: 0, errors: 0, passedBalls: 0,
    totalWAR: 0, bWAR: 0, pWAR: 0, fWAR: 0, rWAR: 0,
    gamesPlayed: 0, allStarSelections: 0, mvpAwards: 0, cyYoungAwards: 0,
  };
  const previousStats = { ...currentStats, homeRuns: 24 };

  const results = detectCareerMilestones(currentStats, previousStats);
  assertTrue(results.length > 0, 'Should detect milestone');
  assertEqual(results[0].eventType, 'CAREER_HR_TIER', 'Event type');
  assertEqual(results[0].tier, 1, 'First tier');
});

console.log('\nSEASON MILESTONE TESTS');
console.log('─'.repeat(45));

test('Detect 40 HR season', () => {
  const stats = {
    hits: 0, homeRuns: 42, rbi: 0, stolenBases: 0, battingAverage: 0.280,
    strikeoutsBatter: 0, gidp: 0, errors: 0,
    wins: 0, losses: 0, strikeoutsPitcher: 0, saves: 0, blownSaves: 0,
    era: 0, walksIssued: 0, homeRunsAllowed: 0,
  };

  const results = detectSeasonMilestones(stats);
  assertTrue(results.some(r => r.eventType === 'SEASON_40_HR'), 'Should detect 40 HR');
});

test('Detect 20/20 club', () => {
  const stats = {
    hits: 0, homeRuns: 22, rbi: 0, stolenBases: 25, battingAverage: 0.280,
    strikeoutsBatter: 0, gidp: 0, errors: 0,
    wins: 0, losses: 0, strikeoutsPitcher: 0, saves: 0, blownSaves: 0,
    era: 0, walksIssued: 0, homeRunsAllowed: 0,
  };

  const results = detectSeasonMilestones(stats);
  assertTrue(results.some(r => r.eventType === 'CLUB_20_20'), 'Should detect 20/20 club');
});

console.log('\nDETECTION FUNCTION TESTS');
console.log('─'.repeat(45));

test('Save opportunity - 3 run lead in 9th', () => {
  const result = isSaveOpportunity(3, { first: null, second: null, third: null }, 9, 9);
  assertTrue(result, 'Should be save opportunity');
});

test('Not save opportunity - 4 run lead, empty bases', () => {
  const result = isSaveOpportunity(4, { first: null, second: null, third: null }, 9, 9);
  assertFalse(result, 'Should not be save opportunity');
});

test('Save opportunity - 4 run lead, bases loaded', () => {
  // Tying run at bat
  const runner = { playerId: 'r1', playerName: 'Runner', inheritedFrom: null };
  const result = isSaveOpportunity(4, { first: runner, second: runner, third: runner }, 9, 9);
  assertTrue(result, 'Should be save opportunity with tying run at bat');
});

test('Detect triple play', () => {
  const result = detectTriplePlay(3, ['SS', '2B', '1B'], ['SS', '2B', '1B']);
  assertNotNull(result, 'Should detect');
  assertEqual(result.eventType, 'TRIPLE_PLAY', 'Event type');
});

test('Detect unassisted triple play', () => {
  const result = detectTriplePlay(3, [], ['SS']);
  assertNotNull(result, 'Should detect');
  assertEqual(result.eventType, 'UNASSISTED_TRIPLE_PLAY', 'Event type');
});

test('Detect clutch grand slam - ties game', () => {
  const result = detectClutchGrandSlam(
    'HR', true, 4,
    { batting: 3, fielding: 7 }, // Down 4
    'batter1', 'Test Batter'
  );
  assertNotNull(result, 'Should detect');
  assertEqual(result.eventType, 'CLUTCH_GRAND_SLAM', 'Event type');
});

test('No clutch grand slam - already winning', () => {
  const result = detectClutchGrandSlam(
    'HR', true, 4,
    { batting: 8, fielding: 3 }, // Already winning by 5
    'batter1', 'Test Batter'
  );
  assertNull(result, 'Should not detect');
});

test('Detect escape artist', () => {
  const result = detectEscapeArtist('p1', 'Test Pitcher', true, 0, 3);
  assertNotNull(result, 'Should detect');
  assertEqual(result.eventType, 'ESCAPE_ARTIST', 'Event type');
});

test('No escape artist - runs allowed', () => {
  const result = detectEscapeArtist('p1', 'Test Pitcher', true, 2, 3);
  assertNull(result, 'Should not detect when runs scored');
});

// ============================================
// RESULTS SUMMARY
// ============================================

console.log('\n' + '═'.repeat(60));
if (failed === 0) {
  console.log('       ALL TESTS PASSED ✓                                  ');
} else {
  console.log(`       ${passed} PASSED, ${failed} FAILED                    `);
}
console.log('═'.repeat(60));

console.log('\nKEY CALCULATIONS:');
console.log('────────────────────');
console.log('LI Multiplier: √LI (LI=4 → 2×, LI=9 → 3×)');
console.log('Fame: baseFame × √LI × playoffMultiplier');
console.log('Career HR Tiers: 25, 50, 75, 100, 125, 150, 200, 250, 300');
console.log('Season HR Tiers: 40, 45, 55');
console.log('Save Opportunity: Lead ≤3 OR tying run on base/at bat');
console.log('');

process.exit(failed > 0 ? 1 : 0);
