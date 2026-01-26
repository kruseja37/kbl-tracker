/**
 * bWAR Verification Script - SMB4 Calibrated
 *
 * Uses SMB4 baselines from ADAPTIVE_STANDARDS_ENGINE_SPEC.md:
 * - leagueWOBA: 0.329
 * - wobaScale: 1.7821
 * - replacementRunsPer600PA: -12.0
 *
 * Runs Per Win formula per FWAR_CALCULATION_SPEC.md Section 2:
 * RPW = 10 × (seasonGames / 162)
 */

// SMB4 Baselines (from ADAPTIVE_STANDARDS_ENGINE_SPEC.md)
const SMB4_BASELINES = {
  leagueWOBA: 0.329,
  wobaScale: 1.7821,
  replacementRunsPer600PA: -12.0,
};

// MLB baseline for RPW calculation
const MLB_GAMES = 162;
const MLB_RUNS_PER_WIN = 10;

const SMB4_WOBA_WEIGHTS = {
  uBB: 0.521,
  HBP: 0.566,
  single: 0.797,
  double: 1.332,
  triple: 1.813,
  homeRun: 2.495,
};

// wOBA Calculation
function calculateWOBA(stats, weights = SMB4_WOBA_WEIGHTS) {
  const uBB = stats.walks - stats.intentionalWalks;

  const numerator =
    weights.uBB * uBB +
    weights.HBP * stats.hitByPitch +
    weights.single * stats.singles +
    weights.double * stats.doubles +
    weights.triple * stats.triples +
    weights.homeRun * stats.homeRuns;

  const denominator = stats.ab + uBB + stats.sacFlies + stats.hitByPitch;
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// wRAA Calculation
function calculateWRAA(playerWOBA, pa, leagueWOBA = SMB4_BASELINES.leagueWOBA, wobaScale = SMB4_BASELINES.wobaScale) {
  return ((playerWOBA - leagueWOBA) / wobaScale) * pa;
}

// Replacement Level
function getReplacementLevelRuns(pa, replacementRunsPer600PA = SMB4_BASELINES.replacementRunsPer600PA) {
  return (pa / 600) * Math.abs(replacementRunsPer600PA);
}

/**
 * Runs Per Win - CORRECT FORMULA
 * Per FWAR_CALCULATION_SPEC.md Section 2:
 * - MLB: 162 games = 10 RPW
 * - Shorter seasons = fewer runs per win
 * - Each run has MORE impact on win% in shorter seasons
 */
function getRunsPerWin(seasonGames) {
  return MLB_RUNS_PER_WIN * (seasonGames / MLB_GAMES);
}

// Test helper
function runTest(name, actual, expectedMin, expectedMax, precision = 2) {
  const pass = actual >= expectedMin && actual <= expectedMax;
  const status = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${name}`);
  console.log(`       Actual: ${actual.toFixed(precision)}, Expected: ${expectedMin.toFixed(precision)}-${expectedMax.toFixed(precision)}`);
  return pass;
}

console.log('═══════════════════════════════════════════════════════════');
console.log('       bWAR VERIFICATION - SMB4 Calibrated                 ');
console.log('═══════════════════════════════════════════════════════════\n');

let allPassed = true;

// ============================================
// TEST 1: Average Player (.300 BA, modest power)
// ============================================
console.log('TEST 1: Average Player (.300 BA, modest power)');
console.log('─────────────────────────────────────────────');

const avgStats = {
  pa: 200, ab: 180, hits: 54, singles: 36, doubles: 12, triples: 2,
  homeRuns: 4, walks: 15, intentionalWalks: 1, hitByPitch: 3, sacFlies: 2,
  sacBunts: 0, strikeouts: 40, gidp: 5, stolenBases: 3, caughtStealing: 1,
};

const avgWOBA = calculateWOBA(avgStats);
const avgWRAA = calculateWRAA(avgWOBA, avgStats.pa);
const avgReplRuns = getReplacementLevelRuns(avgStats.pa);
const avgRPW = getRunsPerWin(48);
const avgRAR = avgWRAA + avgReplRuns;
const avgBWAR = avgRAR / avgRPW;

// Expected: slightly above league average (0.329), so wOBA ~0.33-0.35
allPassed &= runTest('wOBA (above league avg 0.329)', avgWOBA, 0.330, 0.360, 3);

// wRAA should be positive but modest for average player
allPassed &= runTest('wRAA (modest positive)', avgWRAA, 0.5, 3.5);

// Replacement runs for 200 PA: (200/600) * 12 = 4.0
allPassed &= runTest('Replacement Runs (200 PA)', avgReplRuns, 3.9, 4.1);

// RPW for 48 games: 10 * (48/162) = 2.96
allPassed &= runTest('Runs Per Win (48 games)', avgRPW, 2.90, 3.00);

// bWAR with correct RPW: (1.02 + 4.0) / 2.96 ≈ 1.7 WAR
allPassed &= runTest('bWAR (average player, 48-game)', avgBWAR, 1.4, 2.2);

console.log('');

// ============================================
// TEST 2: Elite Hitter (.350+ BA, strong power)
// ============================================
console.log('TEST 2: Elite Hitter (.350 BA, strong power)');
console.log('─────────────────────────────────────────────');

const eliteStats = {
  pa: 220, ab: 195, hits: 68, singles: 40, doubles: 16, triples: 4,
  homeRuns: 8, walks: 22, intentionalWalks: 3, hitByPitch: 2, sacFlies: 1,
  sacBunts: 0, strikeouts: 30, gidp: 3, stolenBases: 5, caughtStealing: 1,
};

const eliteWOBA = calculateWOBA(eliteStats);
const eliteWRAA = calculateWRAA(eliteWOBA, eliteStats.pa);
const eliteReplRuns = getReplacementLevelRuns(eliteStats.pa);
const eliteRAR = eliteWRAA + eliteReplRuns;
const eliteBWAR = eliteRAR / avgRPW;

// Elite hitter should have wOBA > 0.380 (Great+)
allPassed &= runTest('wOBA (elite, Great+)', eliteWOBA, 0.380, 0.450, 3);

// wRAA should be strongly positive
allPassed &= runTest('wRAA (strongly positive)', eliteWRAA, 5.0, 15.0);

// bWAR with correct RPW: (11.40 + 4.4) / 2.96 ≈ 5.3 WAR for elite hitter
allPassed &= runTest('bWAR (elite hitter, 48-game)', eliteBWAR, 4.5, 6.5);

console.log('');

// ============================================
// TEST 3: Weak Hitter (.200 BA, no power)
// ============================================
console.log('TEST 3: Weak Hitter (.196 BA, minimal power)');
console.log('─────────────────────────────────────────────');

const weakStats = {
  pa: 100, ab: 92, hits: 18, singles: 14, doubles: 3, triples: 0,
  homeRuns: 1, walks: 6, intentionalWalks: 0, hitByPitch: 1, sacFlies: 1,
  sacBunts: 0, strikeouts: 30, gidp: 4, stolenBases: 0, caughtStealing: 2,
};

const weakWOBA = calculateWOBA(weakStats);
const weakWRAA = calculateWRAA(weakWOBA, weakStats.pa);
const weakReplRuns = getReplacementLevelRuns(weakStats.pa);
const weakRAR = weakWRAA + weakReplRuns;
const weakBWAR = weakRAR / avgRPW;

// Weak hitter: well below league average wOBA (Awful tier)
allPassed &= runTest('wOBA (Awful tier, < 0.280)', weakWOBA, 0.200, 0.280, 3);

// wRAA should be significantly negative for this bad of a hitter
allPassed &= runTest('wRAA (significantly negative)', weakWRAA, -8.0, -4.0);

// bWAR with correct RPW: (-6.49 + 2.0) / 2.96 ≈ -1.5 WAR (below replacement)
allPassed &= runTest('bWAR (below replacement, 48-game)', weakBWAR, -2.0, -1.0);

console.log('');

// ============================================
// TEST 4: Edge Cases
// ============================================
console.log('TEST 4: Edge Cases');
console.log('─────────────────────────────────────────────');

// Zero PA should return 0
const zeroStats = { pa: 0, ab: 0, hits: 0, singles: 0, doubles: 0, triples: 0,
  homeRuns: 0, walks: 0, intentionalWalks: 0, hitByPitch: 0, sacFlies: 0 };
const zeroWOBA = calculateWOBA(zeroStats);
allPassed &= runTest('Zero PA wOBA', zeroWOBA, 0, 0);

// RPW scaling (correct formula: 10 * seasonGames / 162)
const rpw20 = getRunsPerWin(20);
const rpw32 = getRunsPerWin(32);
const rpw48 = getRunsPerWin(48);
const rpw50 = getRunsPerWin(50);
const rpw162 = getRunsPerWin(162);

allPassed &= runTest('RPW 20 games (1.23)', rpw20, 1.20, 1.26);
allPassed &= runTest('RPW 32 games (1.98)', rpw32, 1.95, 2.01);
allPassed &= runTest('RPW 48 games (2.96)', rpw48, 2.93, 2.99);
allPassed &= runTest('RPW 50 games (3.09)', rpw50, 3.06, 3.12);
allPassed &= runTest('RPW 162 games (10.00)', rpw162, 9.99, 10.01);

console.log('');

// ============================================
// SUMMARY
// ============================================
console.log('═══════════════════════════════════════════════════════════');
if (allPassed) {
  console.log('       ALL TESTS PASSED ✓                                  ');
} else {
  console.log('       SOME TESTS FAILED ✗                                 ');
}
console.log('═══════════════════════════════════════════════════════════\n');

// Show final calculations for reference
console.log('CALCULATION SUMMARY:');
console.log('────────────────────');
console.log(`RPW (48 games): ${avgRPW.toFixed(2)}`);
console.log(`Average Player: wOBA=${avgWOBA.toFixed(3)}, wRAA=${avgWRAA.toFixed(2)}, bWAR=${avgBWAR.toFixed(2)}`);
console.log(`Elite Hitter:   wOBA=${eliteWOBA.toFixed(3)}, wRAA=${eliteWRAA.toFixed(2)}, bWAR=${eliteBWAR.toFixed(2)}`);
console.log(`Weak Hitter:    wOBA=${weakWOBA.toFixed(3)}, wRAA=${weakWRAA.toFixed(2)}, bWAR=${weakBWAR.toFixed(2)}`);
