/**
 * Day 3 Verification Script - Leverage, Clutch, and mWAR Calculators
 *
 * Tests:
 * 1. Leverage Index calculation (LI by game state)
 * 2. Clutch attribution (multi-participant, Net Clutch Rating)
 * 3. Manager WAR (decision tracking, evaluation)
 */

// ============================================
// LEVERAGE INDEX TESTS
// ============================================

// LI Constants
const BASE_OUT_LI = [
  [0.86, 0.90, 0.93],  // Empty
  [1.07, 1.10, 1.24],  // 1st
  [1.15, 1.40, 1.56],  // 2nd
  [1.35, 1.55, 1.93],  // 1st+2nd
  [1.08, 1.65, 1.88],  // 3rd
  [1.32, 1.85, 2.25],  // 1st+3rd
  [1.45, 2.10, 2.50],  // 2nd+3rd
  [1.60, 2.25, 2.67],  // Loaded
];

const LI_BOUNDS = { min: 0.1, max: 10.0 };

function encodeBaseState(runners) {
  let state = 0;
  if (runners.first) state += 1;
  if (runners.second) state += 2;
  if (runners.third) state += 4;
  return state;
}

function getBaseOutLI(baseState, outs) {
  return BASE_OUT_LI[baseState][outs];
}

function getInningMultiplier(inning, halfInning, totalInnings, scoreDiff) {
  const gameProgress = inning / totalInnings;
  let walkoffBoost = 1.0;

  let multiplier;
  if (gameProgress < 0.33) multiplier = 0.75;
  else if (gameProgress < 0.66) multiplier = 1.0;
  else if (gameProgress < 0.85) multiplier = 1.3;
  else {
    multiplier = 1.8;
    if (inning > totalInnings) {
      multiplier = Math.min(2.5, 1.8 + (inning - totalInnings) * 0.15);
    }
  }

  if (inning >= totalInnings && halfInning === 'BOTTOM' && scoreDiff <= 0) {
    walkoffBoost = 1.40;
  }

  return { multiplier, walkoffBoost };
}

function getScoreDampener(scoreDiff, inning) {
  const absDiff = Math.abs(scoreDiff);
  if (absDiff >= 7) return 0.10;
  if (absDiff >= 5) return 0.25;
  if (absDiff >= 4) return 0.40;
  if (absDiff === 0) return 1.00;
  if (absDiff === 1) return 0.95;
  if (absDiff === 2) return 0.85;
  if (absDiff === 3) return 0.60 + (0.12 * Math.min(inning, 9) / 9);
  return 0.50;
}

function calculateLeverageIndex(gameState, config = { totalInnings: 9 }) {
  const totalInnings = config.totalInnings ?? 9;
  const { inning, halfInning, outs, runners, homeScore, awayScore } = gameState;

  const isBattingHome = halfInning === 'BOTTOM';
  const scoreDiff = isBattingHome ? homeScore - awayScore : awayScore - homeScore;

  const baseState = encodeBaseState(runners);
  const baseOutLI = getBaseOutLI(baseState, outs);

  const { multiplier: inningMult, walkoffBoost } = getInningMultiplier(
    inning, halfInning, totalInnings, scoreDiff
  );

  const scoreDamp = getScoreDampener(scoreDiff, inning);
  const rawLI = baseOutLI * inningMult * walkoffBoost * scoreDamp;

  return Math.max(LI_BOUNDS.min, Math.min(LI_BOUNDS.max, rawLI));
}

// ============================================
// CLUTCH ATTRIBUTION TESTS
// ============================================

const PLAYOFF_MULTIPLIERS = {
  regular_season: 1.0,
  wild_card: 1.25,
  division_series: 1.5,
  championship_series: 1.75,
  world_series: 2.0,
  elimination_game: 0.5,
  clinch_game: 0.25,
};

function getPlayoffMultiplier(context) {
  if (!context.isPlayoff) return 1.0;
  let mult = PLAYOFF_MULTIPLIERS[context.playoffRound] ?? 1.0;
  if (context.isEliminationGame) mult += PLAYOFF_MULTIPLIERS.elimination_game;
  if (context.isClinchGame) mult += PLAYOFF_MULTIPLIERS.clinch_game;
  return mult;
}

function calculateClutchValue(baseValue, leverageIndex) {
  return baseValue * Math.sqrt(leverageIndex);
}

// ============================================
// mWAR TESTS
// ============================================

const MWAR_WEIGHTS = { decision: 0.60, overperformance: 0.40 };
const MANAGER_OVERPERFORMANCE_CREDIT = 0.30;

const DECISION_VALUES = {
  pitching_change: { success: 0.4, failure: -0.3 },
  pinch_hitter: { success: 0.5, failure: -0.4 },
  steal_call: { success: 0.3, failure: -0.4 },
  intentional_walk: { success: 0.3, failure: -0.5 },
  squeeze_call: { success: 0.6, failure: -0.5 },
};

function calculateDecisionClutchImpact(type, outcome, li) {
  if (outcome === 'neutral') return 0;
  const values = DECISION_VALUES[type];
  const baseValue = outcome === 'success' ? values.success : values.failure;
  return baseValue * Math.sqrt(li);
}

function getExpectedWinPct(salaryScore) {
  return 0.35 + (salaryScore * 0.30);
}

function calculateOverperformance(wins, losses, salaryScore, totalGames) {
  const expectedWinPct = getExpectedWinPct(salaryScore);
  const actualWinPct = wins / (wins + losses);
  const overperf = actualWinPct - expectedWinPct;
  const overperfWins = overperf * totalGames;
  return overperfWins * MANAGER_OVERPERFORMANCE_CREDIT;
}

function calculateSeasonMWAR(decisions, teamStats, seasonGames) {
  const rpw = 10 * (seasonGames / 162);
  const totalDecisionValue = decisions.reduce((sum, d) => sum + d.clutchImpact, 0);
  const decisionWAR = totalDecisionValue / rpw;
  const overperfWAR = calculateOverperformance(
    teamStats.wins, teamStats.losses, teamStats.salaryScore, seasonGames
  );
  return (decisionWAR * MWAR_WEIGHTS.decision) + (overperfWAR * MWAR_WEIGHTS.overperformance);
}

// ============================================
// TEST RUNNER
// ============================================

function runTest(name, actual, expectedMin, expectedMax, precision = 2) {
  const pass = actual >= expectedMin && actual <= expectedMax;
  const status = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${name}`);
  console.log(`       Actual: ${actual.toFixed(precision)}, Expected: ${expectedMin.toFixed(precision)}-${expectedMax.toFixed(precision)}`);
  return pass;
}

console.log('═══════════════════════════════════════════════════════════');
console.log('       DAY 3 VERIFICATION - LI, Clutch, mWAR                ');
console.log('═══════════════════════════════════════════════════════════\n');

let allPassed = true;

// ============================================
// LEVERAGE INDEX TESTS
// ============================================
console.log('LEVERAGE INDEX TESTS');
console.log('─────────────────────────────────────────────');

// Test 1: Early game, empty bases, tie
const earlyGame = {
  inning: 1, halfInning: 'TOP', outs: 0,
  runners: { first: false, second: false, third: false },
  homeScore: 0, awayScore: 0
};
const liEarly = calculateLeverageIndex(earlyGame);
allPassed &= runTest('Early game (1st, empty, 0-0)', liEarly, 0.50, 0.75);

// Test 2: Mid-game, runner on 2nd, close
const midGame = {
  inning: 5, halfInning: 'BOTTOM', outs: 1,
  runners: { first: false, second: true, third: false },
  homeScore: 3, awayScore: 4
};
const liMid = calculateLeverageIndex(midGame);
allPassed &= runTest('Mid game (5th, RISP, down 1)', liMid, 1.0, 1.6);

// Test 3: Late game, high leverage
const lateGame = {
  inning: 7, halfInning: 'TOP', outs: 2,
  runners: { first: false, second: true, third: false },
  homeScore: 5, awayScore: 5
};
const liLate = calculateLeverageIndex(lateGame);
allPassed &= runTest('Late game (7th, RISP 2 out, tie)', liLate, 1.8, 2.6);

// Test 4: 9th inning, bases loaded, tie (extreme)
const ninthLoaded = {
  inning: 9, halfInning: 'BOTTOM', outs: 2,
  runners: { first: true, second: true, third: true },
  homeScore: 5, awayScore: 5
};
const liExtreme = calculateLeverageIndex(ninthLoaded);
allPassed &= runTest('Extreme (9th B, loaded, 2 out, tie)', liExtreme, 6.0, 10.0);

// Test 5: Blowout (low leverage)
const blowout = {
  inning: 5, halfInning: 'TOP', outs: 1,
  runners: { first: false, second: false, third: false },
  homeScore: 0, awayScore: 7
};
const liBlowout = calculateLeverageIndex(blowout);
allPassed &= runTest('Blowout (5th, down 7, empty)', liBlowout, 0.1, 0.3);

// Test 6: Closer situation (9th, up 1, loaded, 2 out)
const closerSit = {
  inning: 9, halfInning: 'TOP', outs: 2,
  runners: { first: true, second: true, third: true },
  homeScore: 6, awayScore: 5
};
const liCloser = calculateLeverageIndex(closerSit);
allPassed &= runTest('Closer (9th T, up 1, loaded, 2 out)', liCloser, 4.0, 6.0);

console.log('');

// ============================================
// CLUTCH ATTRIBUTION TESTS
// ============================================
console.log('CLUTCH ATTRIBUTION TESTS');
console.log('─────────────────────────────────────────────');

// Test 7: Base clutch value scaling
const liAvg = 1.0;
const liHigh = 4.0;
const liExtreme2 = 9.0;
const baseValue = 1.0;

const clutchAvg = calculateClutchValue(baseValue, liAvg);
const clutchHigh = calculateClutchValue(baseValue, liHigh);
const clutchExtreme = calculateClutchValue(baseValue, liExtreme2);

allPassed &= runTest('Clutch scaling (LI=1.0)', clutchAvg, 0.99, 1.01);
allPassed &= runTest('Clutch scaling (LI=4.0)', clutchHigh, 1.99, 2.01);
allPassed &= runTest('Clutch scaling (LI=9.0)', clutchExtreme, 2.99, 3.01);

// Test 8: Playoff multipliers
const regularSeason = { isPlayoff: false };
const wildCard = { isPlayoff: true, playoffRound: 'wild_card', isEliminationGame: true };
const worldSeries7 = { isPlayoff: true, playoffRound: 'world_series', isEliminationGame: true, isClinchGame: true };

allPassed &= runTest('Playoff mult (regular)', getPlayoffMultiplier(regularSeason), 1.0, 1.0);
allPassed &= runTest('Playoff mult (WC elim)', getPlayoffMultiplier(wildCard), 1.74, 1.76);
allPassed &= runTest('Playoff mult (WS Game 7)', getPlayoffMultiplier(worldSeries7), 2.74, 2.76);

// Test 9: Walk-off grand slam in WS Game 7 (ultimate clutch)
const walkoffGS_baseValue = 5.0;  // Walk-off (3) + Grand Slam (2)
const walkoffGS_li = 10.0;        // Max leverage
const walkoffGS_playoffMult = 2.75;

const ultimateClutch = walkoffGS_baseValue * Math.sqrt(walkoffGS_li) * walkoffGS_playoffMult;
allPassed &= runTest('WS Game 7 Walk-off Grand Slam', ultimateClutch, 43.0, 45.0);

console.log('');

// ============================================
// mWAR TESTS
// ============================================
console.log('mWAR TESTS');
console.log('─────────────────────────────────────────────');

// Test 10: Decision value calculation
const pitchingChangeSuccess = calculateDecisionClutchImpact('pitching_change', 'success', 2.0);
const pitchingChangeFail = calculateDecisionClutchImpact('pitching_change', 'failure', 2.0);
allPassed &= runTest('Pitching change success (LI=2)', pitchingChangeSuccess, 0.55, 0.58);
allPassed &= runTest('Pitching change failure (LI=2)', pitchingChangeFail, -0.44, -0.40);

// Test 11: Squeeze play (high risk/reward)
const squeezeSuccess = calculateDecisionClutchImpact('squeeze_call', 'success', 3.0);
const squeezeFail = calculateDecisionClutchImpact('squeeze_call', 'failure', 3.0);
allPassed &= runTest('Squeeze success (LI=3)', squeezeSuccess, 1.02, 1.05);
allPassed &= runTest('Squeeze failure (LI=3)', squeezeFail, -0.88, -0.85);

// Test 12: Expected win percentage
const lowPayroll = getExpectedWinPct(0.2);
const avgPayroll = getExpectedWinPct(0.5);
const highPayroll = getExpectedWinPct(0.9);

allPassed &= runTest('Expected WinPct (low payroll)', lowPayroll, 0.40, 0.42);
allPassed &= runTest('Expected WinPct (avg payroll)', avgPayroll, 0.49, 0.51);
allPassed &= runTest('Expected WinPct (high payroll)', highPayroll, 0.61, 0.63);

// Test 13: Full season mWAR calculation
const mockDecisions = [
  { clutchImpact: 0.5 },
  { clutchImpact: 0.3 },
  { clutchImpact: -0.2 },
  { clutchImpact: 0.4 },
  { clutchImpact: -0.1 },
  { clutchImpact: 0.6 },  // Total: 1.5
];
const mockTeamStats = { wins: 32, losses: 16, salaryScore: 0.5 };  // 66.7% vs 50% expected
const seasonGames = 48;

const mwar = calculateSeasonMWAR(mockDecisions, mockTeamStats, seasonGames);
// decisionWAR = 1.5 / 2.96 = 0.507
// overperfWAR = (0.667 - 0.5) * 48 * 0.3 = 2.4
// mWAR = 0.507 * 0.6 + 2.4 * 0.4 = 0.304 + 0.96 = 1.264
allPassed &= runTest('Season mWAR calculation', mwar, 1.1, 1.4);

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

// Show key calculations
console.log('KEY CALCULATIONS:');
console.log('────────────────────');
console.log(`LI Range: ${LI_BOUNDS.min} - ${LI_BOUNDS.max}`);
console.log(`Base-Out LI (loaded, 2 out): ${BASE_OUT_LI[7][2]}`);
console.log(`Clutch scaling: √LI (LI=4 → 2×, LI=9 → 3×)`);
console.log(`mWAR formula: (decisionWAR × 0.6) + (overperfWAR × 0.4)`);
console.log(`Manager overperformance credit: 30%`);
console.log(`RPW (48 games): ${(10 * 48 / 162).toFixed(2)}`);
