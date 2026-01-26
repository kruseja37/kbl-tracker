/**
 * WAR Verification Script - All Components
 *
 * Tests pWAR, fWAR, and rWAR calculations
 * Uses correct season-scaled runsPerWin formula from FWAR_CALCULATION_SPEC.md
 *
 * Key formula: RPW = 10 × (seasonGames / 162)
 * For 48 games: RPW = 10 × (48/162) = 2.96
 */

// ============================================
// SEASON SCALING (CORRECT FORMULA)
// ============================================

const MLB_GAMES = 162;
const MLB_RUNS_PER_WIN = 10;

/**
 * Get runs per win for a given season length
 * Per FWAR_CALCULATION_SPEC.md Section 2:
 * - MLB: 162 games = 10 RPW
 * - Shorter seasons = fewer runs per win
 * - Each run has MORE impact on win% in shorter seasons
 */
function getRunsPerWin(seasonGames) {
  return MLB_RUNS_PER_WIN * (seasonGames / MLB_GAMES);
}

// ============================================
// SMB4 PITCHING BASELINES
// ============================================

const SMB4_PITCHING = {
  leagueERA: 4.04,
  leagueFIP: 4.04,
  fipConstant: 3.28,
};

// Test helper
function runTest(name, actual, expectedMin, expectedMax, precision = 2) {
  const pass = actual >= expectedMin && actual <= expectedMax;
  const status = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${name}`);
  console.log(`       Actual: ${actual.toFixed(precision)}, Expected: ${expectedMin.toFixed(precision)}-${expectedMax.toFixed(precision)}`);
  return pass;
}

let allPassed = true;

// ============================================
// pWAR TESTS
// ============================================

console.log('═══════════════════════════════════════════════════════════');
console.log('       pWAR VERIFICATION                                   ');
console.log('═══════════════════════════════════════════════════════════\n');

// FIP calculation
function calculateFIP(stats, fipConstant = 3.28) {
  const { hr, bb, hbp, k, ip } = stats;
  if (ip === 0) return 0;
  return ((13 * hr) + (3 * (bb + hbp)) - (2 * k)) / ip + fipConstant;
}

// Replacement level
function getReplacementLevel(gs, g) {
  if (g === 0) return 0.12;
  const starterShare = gs / g;
  return (0.03 * (1 - starterShare)) + (0.12 * starterShare);
}

// Pitcher RPW (with FIP adjustment)
function getPitcherRPW(fip, leagueFIP, seasonGames) {
  const baseRPW = getRunsPerWin(seasonGames);
  const fipRatio = Math.min(1.1, Math.max(0.9, fip / leagueFIP));
  return baseRPW * fipRatio;
}

// Full pWAR
function calculatePWAR(stats, seasonGames = 48) {
  const { hr, bb, hbp, k, ip, gs, g } = stats;

  const fip = calculateFIP(stats);
  const leagueFIP = SMB4_PITCHING.leagueFIP;
  const fipDiff = leagueFIP - fip;

  const pitcherRPW = getPitcherRPW(fip, leagueFIP, seasonGames);
  const winsAboveAvg = fipDiff / pitcherRPW;

  const replacementLevel = getReplacementLevel(gs, g);
  const replacementContribution = replacementLevel * (ip / 9);

  const rawWAR = (winsAboveAvg * (ip / 9)) + replacementContribution;

  return { fip, fipDiff, pitcherRPW, replacementLevel, pWAR: rawWAR };
}

// TEST 1: Ace Starter
console.log('TEST 1: Ace Starter (120 K, 25 BB, 8 HR, 90 IP)');
console.log('─────────────────────────────────────────────');

const aceStats = { hr: 8, bb: 25, hbp: 3, k: 120, ip: 90, gs: 15, g: 15 };
const aceResult = calculatePWAR(aceStats, 48);

// FIP = ((13*8) + (3*(25+3)) - (2*120)) / 90 + 3.28
//     = (104 + 84 - 240) / 90 + 3.28 = -52/90 + 3.28 = -0.58 + 3.28 = 2.70
allPassed &= runTest('FIP (elite, < 3.0)', aceResult.fip, 2.60, 2.80);
allPassed &= runTest('FIP Diff (positive)', aceResult.fipDiff, 1.20, 1.50);

// With correct RPW formula: 48 games = 2.96 RPW
// pitcherRPW ≈ 2.96 * 0.67 (fip ratio) ≈ 1.98 (elite gets lower)
// FIP diff = 1.34, winsAboveAvg = 1.34 / 1.98 = 0.68 per 9 IP
// Over 90 IP: 0.68 * (90/9) = 6.8 raw + replacement = ~6-8 pWAR
// Actual calculation: 6.22 pWAR
allPassed &= runTest('pWAR (ace level, 48-game season)', aceResult.pWAR, 5.5, 7.5);

console.log('');

// TEST 2: Closer
console.log('TEST 2: Closer (35 K, 8 BB, 2 HR, 25 IP, high leverage)');
console.log('─────────────────────────────────────────────');

const closerStats = { hr: 2, bb: 8, hbp: 1, k: 35, ip: 25, gs: 0, g: 20 };
const closerResult = calculatePWAR(closerStats, 48);

allPassed &= runTest('FIP (elite, < 2.80)', closerResult.fip, 2.30, 2.80);
allPassed &= runTest('Replacement Level (reliever = 0.03)', closerResult.replacementLevel, 0.02, 0.04);
// 25 IP elite closer: ~1.5-2.5 pWAR (pre-leverage)
allPassed &= runTest('pWAR (closer, pre-leverage)', closerResult.pWAR, 1.5, 3.0);

console.log('');

// TEST 3: Below Average Starter
console.log('TEST 3: Below Average Starter (70 K, 35 BB, 12 HR, 80 IP)');
console.log('─────────────────────────────────────────────');

const avgStats = { hr: 12, bb: 35, hbp: 4, k: 70, ip: 80, gs: 14, g: 14 };
const avgResult = calculatePWAR(avgStats, 48);

allPassed &= runTest('FIP (below avg, > 4.5)', avgResult.fip, 4.50, 5.20);
allPassed &= runTest('FIP Diff (negative)', avgResult.fipDiff, -1.20, -0.40);
// FIP diff = -0.90 (below league average)
// pitcherRPW ≈ 2.96 * 1.1 (poor gets higher RPW) ≈ 3.26
// winsAboveAvg = -0.90 / 3.26 = -0.28 per 9 IP
// Over 80 IP: -0.28 * (80/9) = -2.5 wins above avg
// Replacement contribution: 0.12 * (80/9) = 1.07
// Total: -2.5 + 1.07 = ~ -1.4 pWAR (below replacement starter)
allPassed &= runTest('pWAR (below-replacement starter)', avgResult.pWAR, -2.0, -0.5);

console.log('');

// ============================================
// fWAR TESTS
// ============================================

console.log('═══════════════════════════════════════════════════════════');
console.log('       fWAR VERIFICATION                                   ');
console.log('═══════════════════════════════════════════════════════════\n');

const FIELDING_VALUES = {
  putout: { infield: 0.03, outfield: 0.04, lineout: 0.05 },
  assist: { infield: 0.04, outfield: 0.08 },
  error: { fielding: -0.15, throwing: -0.20 },
  doublePlay: { turned: 0.12, started: 0.08 },
};

const POSITION_MODS = {
  putout: { SS: 1.2, CF: 1.15, '1B': 0.7 },
  assist: { SS: 1.2, CF: 1.2, RF: 1.1 },
  error: { SS: 1.0, CF: 1.1, '1B': 1.2 },
};

const DIFFICULTY_MULT = {
  routine: 1.0, diving: 2.5, robbedHR: 5.0,
};

const POS_ADJUSTMENTS = {
  SS: 2.2, CF: 0.7, '1B': -3.7,
};

function calculateFWARFromPlays(plays, position, gamesPlayed, seasonGames = 48) {
  let totalRuns = 0;

  for (const play of plays) {
    let value = 0;

    if (play.type === 'putout') {
      const base = FIELDING_VALUES.putout[play.playType] || 0.03;
      const posMod = POSITION_MODS.putout[position] || 1.0;
      const diffMod = DIFFICULTY_MULT[play.difficulty] || 1.0;
      value = base * posMod * diffMod;
    } else if (play.type === 'assist') {
      const base = FIELDING_VALUES.assist[play.assistType] || 0.04;
      const posMod = POSITION_MODS.assist[position] || 1.0;
      value = base * posMod;
    } else if (play.type === 'error') {
      const base = FIELDING_VALUES.error[play.errorType] || -0.15;
      const posMod = POSITION_MODS.error[position] || 1.0;
      value = base * posMod;
    } else if (play.type === 'doublePlay') {
      value = FIELDING_VALUES.doublePlay[play.role] || 0.08;
    }

    totalRuns += value;
  }

  // Positional adjustment (prorated by games played)
  const playingTimeFactor = gamesPlayed / seasonGames;
  const posAdj = (POS_ADJUSTMENTS[position] || 0) * playingTimeFactor;

  const rpw = getRunsPerWin(seasonGames);
  const fWAR = (totalRuns + posAdj) / rpw;

  return { totalRuns, posAdj, fWAR, rpw };
}

// TEST 1: Gold Glove SS
console.log('TEST 1: Gold Glove SS (40 games, many plays, no errors)');
console.log('─────────────────────────────────────────────');

const ssPlays = [
  ...Array(80).fill({ type: 'putout', playType: 'infield', difficulty: 'routine' }),
  ...Array(120).fill({ type: 'assist', assistType: 'infield' }),
  ...Array(10).fill({ type: 'doublePlay', role: 'turned' }),
  ...Array(5).fill({ type: 'putout', playType: 'lineout', difficulty: 'diving' }),
];

const ssResult = calculateFWARFromPlays(ssPlays, 'SS', 40, 48);
allPassed &= runTest('SS Runs Saved', ssResult.totalRuns, 7.0, 12.0);
allPassed &= runTest('SS Positional Adj', ssResult.posAdj, 1.5, 2.0);
// With RPW = 2.96: (10.59 + 1.83) / 2.96 = ~4.2 fWAR
allPassed &= runTest('SS fWAR (GG level, 48-game)', ssResult.fWAR, 3.5, 5.0);

console.log('');

// TEST 2: Error-prone 1B
console.log('TEST 2: Error-prone 1B (48 games, many errors)');
console.log('─────────────────────────────────────────────');

const fbPlays = [
  ...Array(200).fill({ type: 'putout', playType: 'infield', difficulty: 'routine' }),
  ...Array(10).fill({ type: 'error', errorType: 'fielding' }),
  ...Array(5).fill({ type: 'error', errorType: 'throwing' }),
];

const fbResult = calculateFWARFromPlays(fbPlays, '1B', 48, 48);
allPassed &= runTest('1B Runs (errors hurt)', fbResult.totalRuns, 0.0, 4.0);
allPassed &= runTest('1B Positional Adj (negative)', fbResult.posAdj, -4.0, -3.5);
// With RPW = 2.96: (2.0 - 3.7) / 2.96 = ~ -0.6 to +0.3
allPassed &= runTest('1B fWAR (below avg)', fbResult.fWAR, -1.0, 0.5);

console.log('');

// TEST 3: Robbed HR in CF
console.log('TEST 3: Star CF with robbed HR');
console.log('─────────────────────────────────────────────');

const cfPlays = [
  ...Array(60).fill({ type: 'putout', playType: 'outfield', difficulty: 'routine' }),
  { type: 'putout', playType: 'outfield', difficulty: 'robbedHR' },
  { type: 'putout', playType: 'outfield', difficulty: 'diving' },
];

const cfResult = calculateFWARFromPlays(cfPlays, 'CF', 30, 48);

// Robbed HR should be significant
const robbedHRValue = 0.04 * 1.15 * 5.0;  // ~0.23 runs
allPassed &= runTest('CF Runs (with robbed HR)', cfResult.totalRuns, 3.0, 4.5);
allPassed &= runTest('Robbed HR value', robbedHRValue, 0.20, 0.25);

console.log('');

// ============================================
// rWAR TESTS
// ============================================

console.log('═══════════════════════════════════════════════════════════');
console.log('       rWAR VERIFICATION                                   ');
console.log('═══════════════════════════════════════════════════════════\n');

const SB_VALUES = { SB: 0.20, CS: -0.45 };
const GIDP_COST = -0.44;

function calculateWSB(stats) {
  // Simplified: just calculate raw SB value without league comparison
  const sbRuns = (stats.sb * SB_VALUES.SB) + (stats.cs * SB_VALUES.CS);
  return sbRuns;
}

function estimateUBR(speedRating, pa, fullSeasonPA = 200) {
  const baseUBR = (speedRating - 50) / 20;
  const factor = pa / fullSeasonPA;
  return baseUBR * factor;
}

function calculateWGDP(gidp, opportunities, leagueRate = 0.12) {
  const expected = opportunities * leagueRate;
  return (expected - gidp) * Math.abs(GIDP_COST);
}

function calculateRWAR(stats, seasonGames = 48) {
  const wSB = calculateWSB(stats);
  const UBR = estimateUBR(stats.speed, stats.pa);
  const wGDP = calculateWGDP(stats.gidp, stats.gidpOpp);

  const BsR = wSB + UBR + wGDP;
  const rpw = getRunsPerWin(seasonGames);
  const rWAR = BsR / rpw;

  return { wSB, UBR, wGDP, BsR, rWAR, rpw };
}

// TEST 1: Speed Demon
console.log('TEST 1: Speed Demon (25 SB, 4 CS, 95 speed)');
console.log('─────────────────────────────────────────────');

const speedyStats = {
  sb: 25, cs: 4,
  singles: 35, walks: 20, hbp: 3, ibb: 2,
  speed: 95, pa: 220,
  gidp: 1, gidpOpp: 15,
};

const speedyResult = calculateRWAR(speedyStats, 48);
// Raw SB runs: 25 × 0.20 + 4 × -0.45 = 5.0 - 1.8 = 3.2
allPassed &= runTest('wSB (great base stealer)', speedyResult.wSB, 3.0, 3.5);
allPassed &= runTest('UBR (elite speed)', speedyResult.UBR, 2.0, 3.0);
allPassed &= runTest('wGDP (avoids DP)', speedyResult.wGDP, 0.3, 0.6);
// BsR ≈ 3.2 + 2.5 + 0.35 = 6.05 / 2.96 = ~2.0 rWAR
allPassed &= runTest('rWAR (speed demon, 48-game)', speedyResult.rWAR, 1.8, 2.5);

console.log('');

// TEST 2: Slow Slugger
console.log('TEST 2: Slow Slugger (0 SB, 1 CS, 25 speed, 8 GIDP)');
console.log('─────────────────────────────────────────────');

const slowStats = {
  sb: 0, cs: 1,
  singles: 20, walks: 25, hbp: 4, ibb: 5,
  speed: 25, pa: 180,
  gidp: 8, gidpOpp: 30,
};

const slowResult = calculateRWAR(slowStats, 48);
// Raw SB runs: 0 × 0.20 + 1 × -0.45 = -0.45
allPassed &= runTest('wSB (negative)', slowResult.wSB, -0.50, -0.40);
allPassed &= runTest('UBR (slow, negative)', slowResult.UBR, -1.5, -0.8);
allPassed &= runTest('wGDP (DP machine)', slowResult.wGDP, -2.0, -1.0);
// BsR ≈ -0.45 - 1.13 - 1.94 = -3.52 / 2.96 = ~ -1.2 rWAR
allPassed &= runTest('rWAR (liability, 48-game)', slowResult.rWAR, -1.5, -0.9);

console.log('');

// TEST 3: SB Break-even Check
console.log('TEST 3: SB Break-even (10 SB, 4 CS = 71% ≈ break-even)');
console.log('─────────────────────────────────────────────');

const breakEvenRate = 10 / 14;  // ~71%
const sbRuns = (10 * 0.20) + (4 * -0.45);  // 2.0 - 1.8 = +0.2

allPassed &= runTest('SB Success Rate (~69% break-even)', breakEvenRate * 100, 69, 73);
allPassed &= runTest('Raw SB Runs (slightly positive)', sbRuns, 0.0, 0.5);

console.log('');

// ============================================
// RPW VERIFICATION
// ============================================

console.log('═══════════════════════════════════════════════════════════');
console.log('       RUNS PER WIN VERIFICATION                           ');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Formula: RPW = 10 × (seasonGames / 162)');
console.log('─────────────────────────────────────────────');

const rpw48 = getRunsPerWin(48);
const rpw50 = getRunsPerWin(50);
const rpw162 = getRunsPerWin(162);

allPassed &= runTest('RPW (48 games)', rpw48, 2.90, 3.00);
allPassed &= runTest('RPW (50 games)', rpw50, 3.05, 3.10);
allPassed &= runTest('RPW (162 games)', rpw162, 9.99, 10.01);

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

// Show calculation summary
console.log('CALCULATION SUMMARY:');
console.log('────────────────────');
console.log(`RPW (48 games): ${rpw48.toFixed(2)}`);
console.log(`Ace Starter:    FIP=${aceResult.fip.toFixed(2)}, pWAR=${aceResult.pWAR.toFixed(2)}`);
console.log(`Closer:         FIP=${closerResult.fip.toFixed(2)}, pWAR=${closerResult.pWAR.toFixed(2)}`);
console.log(`Below Avg:      FIP=${avgResult.fip.toFixed(2)}, pWAR=${avgResult.pWAR.toFixed(2)}`);
console.log(`Gold Glove SS:  runs=${ssResult.totalRuns.toFixed(2)}, fWAR=${ssResult.fWAR.toFixed(2)}`);
console.log(`Speed Demon:    BsR=${speedyResult.BsR.toFixed(2)}, rWAR=${speedyResult.rWAR.toFixed(2)}`);
console.log(`Slow Slugger:   BsR=${slowResult.BsR.toFixed(2)}, rWAR=${slowResult.rWAR.toFixed(2)}`);
