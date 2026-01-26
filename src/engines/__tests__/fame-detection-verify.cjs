/**
 * Day 4 Verification Tests - Fame Engine & Detection Functions
 * Tests: Fame calculations, milestone detection, prompt detection
 *
 * Run with: node src/engines/__tests__/fame-detection-verify.cjs
 */

// ============================================
// INLINE IMPLEMENTATIONS FOR TESTING
// (Since we can't easily import TS in Node directly)
// ============================================

// FAME_VALUES from types/game.ts
const FAME_VALUES = {
  WALK_OFF: 1,
  WALK_OFF_HR: 1.5,
  WALK_OFF_GRAND_SLAM: 3,
  WEB_GEM: 0.75,
  GOLDEN_SOMBRERO: -1,
  PLATINUM_SOMBRERO: -2,
  TRIPLE_PLAY: 2,
  UNASSISTED_TRIPLE_PLAY: 3,
  ESCAPE_ARTIST: 1,
  CLUTCH_GRAND_SLAM: 1,
};

// From fameEngine.ts
function getLIMultiplier(leverageIndex) {
  const li = Math.max(0.1, Math.min(10.0, leverageIndex));
  return Math.sqrt(li);
}

function getPlayoffMultiplier(context) {
  if (!context.isPlayoffs) return 1.0;
  const baseMultipliers = {
    wild_card: 1.25,
    division_series: 1.5,
    championship_series: 1.75,
    world_series: 2.0,
  };
  let multiplier = baseMultipliers[context.round || 'wild_card'] || 1.25;
  if (context.isEliminationGame) multiplier += 0.5;
  if (context.isClinchGame) multiplier += 0.25;
  return multiplier;
}

function calculateFame(eventType, leverageIndex = 1.0, playoffContext) {
  const baseFame = FAME_VALUES[eventType] || 0;
  const liMultiplier = getLIMultiplier(leverageIndex);
  const playoffMultiplier = playoffContext ? getPlayoffMultiplier(playoffContext) : 1.0;
  const finalFame = baseFame * liMultiplier * playoffMultiplier;
  return {
    baseFame,
    liMultiplier,
    playoffMultiplier,
    finalFame,
    isBonus: baseFame > 0,
    isBoner: baseFame < 0,
  };
}

function getFameTier(totalFame) {
  const tiers = [
    { tier: 'LEGENDARY', label: 'Legend', minFame: 50, maxFame: Infinity },
    { tier: 'SUPERSTAR', label: 'Superstar', minFame: 30, maxFame: 50 },
    { tier: 'STAR', label: 'Star', minFame: 15, maxFame: 30 },
    { tier: 'FAN_FAVORITE', label: 'Fan Favorite', minFame: 5, maxFame: 15 },
    { tier: 'KNOWN', label: 'Known', minFame: 0, maxFame: 5 },
    { tier: 'UNKNOWN', label: 'Unknown', minFame: -5, maxFame: 0 },
    { tier: 'DISLIKED', label: 'Disliked', minFame: -15, maxFame: -5 },
    { tier: 'VILLAIN', label: 'Villain', minFame: -30, maxFame: -15 },
    { tier: 'NOTORIOUS', label: 'Notorious', minFame: -Infinity, maxFame: -30 },
  ];
  for (const t of tiers) {
    if (totalFame >= t.minFame && totalFame < t.maxFame) {
      return t;
    }
  }
  return tiers[tiers.length - 1];
}

// From detectionFunctions.ts
function countRunners(bases) {
  return [bases.first, bases.second, bases.third].filter(r => r !== null).length;
}

function isSaveOpportunity(lead, bases, inning, scheduledInnings = 9) {
  if (lead <= 0) return false;
  if (inning < scheduledInnings - 2) return false;
  if (lead <= 3) return true;
  // Tying run must be on base, at bat, or on deck
  // With 0 runners: tying run would be the 4th batter (not at bat or closer)
  // So 4-run lead with bases empty is NOT a save opportunity
  const runnersCount = countRunners(bases);
  // Tying run is "at bat or closer" if lead <= (runners + 1)
  // E.g., lead=4, runners=3 (loaded): tying run = next batter (at bat) ✓
  // E.g., lead=4, runners=0 (empty): tying run = 4th batter away ✗
  return lead <= (runnersCount + 1);
}

function detectTriplePlay(outsOnPlay, assistChain, putoutPositions) {
  if (outsOnPlay !== 3) return null;
  const isUnassisted = assistChain.length === 0 && putoutPositions.length === 1;
  return {
    eventType: isUnassisted ? 'UNASSISTED_TRIPLE_PLAY' : 'TRIPLE_PLAY',
    message: isUnassisted
      ? 'UNASSISTED TRIPLE PLAY!'
      : 'TRIPLE PLAY!',
  };
}

function detectEscapeArtist(pitcherId, pitcherName, basesLoadedNoOutsOccurred, runsAllowedAfter, outsAfter) {
  if (!basesLoadedNoOutsOccurred) return null;
  if (outsAfter >= 3 && runsAllowedAfter === 0) {
    return {
      eventType: 'ESCAPE_ARTIST',
      message: `${pitcherName} escaped!`,
    };
  }
  return null;
}

function detectClutchGrandSlam(result, wasBasesLoaded, rbi, scoreBefore, batterId, batterName) {
  if (result !== 'HR' || !wasBasesLoaded || rbi < 4) return null;
  const deficit = scoreBefore.fielding - scoreBefore.batting;
  const tiedOrTookLead = deficit >= 0 && deficit <= 4;
  if (!tiedOrTookLead) return null;
  return {
    eventType: 'CLUTCH_GRAND_SLAM',
    message: `${batterName} hits a CLUTCH GRAND SLAM!`,
    playerId: batterId,
  };
}

// Career milestone thresholds (partial)
const CAREER_THRESHOLDS = {
  homeRuns: [25, 50, 75, 100, 125, 150, 200, 250, 300],
};

function detectCareerMilestones(stats, previousStats) {
  const results = [];
  for (let i = 0; i < CAREER_THRESHOLDS.homeRuns.length; i++) {
    const threshold = CAREER_THRESHOLDS.homeRuns[i];
    const crossed = stats.homeRuns >= threshold &&
                    (!previousStats || previousStats.homeRuns < threshold);
    if (crossed) {
      results.push({
        eventType: 'CAREER_HR_TIER',
        threshold,
        currentValue: stats.homeRuns,
        tier: i + 1,
        description: `Career HR: ${stats.homeRuns}`,
      });
    }
  }
  return results;
}

function detectFirstCareer(statType, currentCareerTotal, previousCareerTotal) {
  if (currentCareerTotal === 1 && previousCareerTotal === 0) {
    return {
      eventType: 'FIRST_CAREER',
      threshold: 1,
      currentValue: 1,
      tier: 1,
      description: `First career ${statType}!`,
    };
  }
  return null;
}

// Season threshold (partial) - SCALED FOR 50-GAME, 9-INNING SEASON
// Opportunity Factor = 50/162 = 0.309
// MLB 50 HR → KBL 15 HR, MLB 60 HR → KBL 19 HR
const SEASON_THRESHOLDS = {
  homeRuns: { tier1: 15, tier2: 19, tier3: 22 },
  clubs: [
    { hr: 5, sb: 5, event: 'CLUB_15_15' },   // ~16-16 MLB pace
    { hr: 7, sb: 7, event: 'CLUB_20_20' },   // ~22-22 MLB pace
    { hr: 8, sb: 8, event: 'CLUB_25_25' },   // ~26-26 MLB pace
    { hr: 10, sb: 10, event: 'CLUB_30_30' }, // ~32-32 MLB pace
    { hr: 13, sb: 13, event: 'CLUB_40_40' }, // ~42-42 MLB pace
  ],
};

function detectSeasonMilestones(stats) {
  const results = [];
  // Thresholds scaled for 50-game season (tier1=15, tier2=19, tier3=22)
  if (stats.homeRuns >= SEASON_THRESHOLDS.homeRuns.tier3) {
    results.push({ eventType: 'SEASON_22_HR', threshold: 22, currentValue: stats.homeRuns, tier: 3 });
  } else if (stats.homeRuns >= SEASON_THRESHOLDS.homeRuns.tier2) {
    results.push({ eventType: 'SEASON_19_HR', threshold: 19, currentValue: stats.homeRuns, tier: 2 });
  } else if (stats.homeRuns >= SEASON_THRESHOLDS.homeRuns.tier1) {
    results.push({ eventType: 'SEASON_15_HR', threshold: 15, currentValue: stats.homeRuns, tier: 1 });
  }

  for (const club of SEASON_THRESHOLDS.clubs) {
    if (stats.homeRuns >= club.hr && stats.stolenBases >= club.sb) {
      results.push({ eventType: club.event, threshold: club.hr, currentValue: stats.homeRuns, tier: 1 });
    }
  }

  return results;
}

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
// RUN TESTS
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
  assertRange(mult, 1.99, 2.01, 'LI=4.0 multiplier');
});

test('LI multiplier at LI=9.0', () => {
  const mult = getLIMultiplier(9.0);
  assertRange(mult, 2.99, 3.01, 'LI=9.0 multiplier');
});

test('LI multiplier clamped at minimum', () => {
  const mult = getLIMultiplier(0.01);
  assertRange(mult, 0.31, 0.33, 'LI=0.01 clamped to 0.1');
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
  assertRange(result.finalFame, 2.99, 3.01, 'High LI walk-off');
});

test('Fame calculation - Golden Sombrero at LI=2.0', () => {
  const result = calculateFame('GOLDEN_SOMBRERO', 2.0);
  assertTrue(result.isBoner, 'Should be boner');
  assertTrue(result.finalFame < 0, 'Fame should be negative');
  assertRange(result.finalFame, -1.42, -1.40, 'Golden Sombrero shame');
});

test('Fame calculation - World Series with playoff multiplier', () => {
  const result = calculateFame('WALK_OFF_GRAND_SLAM', 4.0, {
    isPlayoffs: true,
    round: 'world_series',
    isEliminationGame: true,
    isClinchGame: true,
  });
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
  const currentStats = { homeRuns: 25 };
  const previousStats = { homeRuns: 24 };
  const results = detectCareerMilestones(currentStats, previousStats);
  assertTrue(results.length > 0, 'Should detect milestone');
  assertEqual(results[0].eventType, 'CAREER_HR_TIER', 'Event type');
  assertEqual(results[0].tier, 1, 'First tier');
});

console.log('\nSEASON MILESTONE TESTS');
console.log('─'.repeat(45));

test('Detect 15 HR season (50-game scaled threshold)', () => {
  // 15 HR in 50 games ≈ 48 HR in 162 games (elite season)
  const stats = { homeRuns: 16, stolenBases: 3 };
  const results = detectSeasonMilestones(stats);
  assertTrue(results.some(r => r.eventType === 'SEASON_15_HR'), 'Should detect 15 HR tier');
});

test('Detect 7/7 club (scaled 20/20 equivalent)', () => {
  // 7/7 in 50 games ≈ 22/22 in 162 games
  const stats = { homeRuns: 8, stolenBases: 8 };
  const results = detectSeasonMilestones(stats);
  assertTrue(results.some(r => r.eventType === 'CLUB_20_20'), 'Should detect 7/7 club');
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
    { batting: 3, fielding: 7 },
    'batter1', 'Test Batter'
  );
  assertNotNull(result, 'Should detect');
  assertEqual(result.eventType, 'CLUTCH_GRAND_SLAM', 'Event type');
});

test('No clutch grand slam - already winning', () => {
  const result = detectClutchGrandSlam(
    'HR', true, 4,
    { batting: 8, fielding: 3 },
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
console.log('Season HR Tiers: 15, 19, 22 (scaled for 50-game season)');
console.log('Save Opportunity: Lead ≤3 OR tying run on base/at bat');
console.log('');

process.exit(failed > 0 ? 1 : 0);
