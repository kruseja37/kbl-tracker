/**
 * Day 6 Engine Tests - Fan Morale & Narrative
 *
 * Test suite for:
 * - fanMoraleEngine.ts
 * - narrativeEngine.ts
 *
 * Run with: node fan-morale-narrative-verify.cjs
 */

const assert = require('assert');

// ============================================
// MOCK IMPLEMENTATIONS (for pure Node.js testing)
// ============================================

// Fan Morale State Thresholds
const FAN_STATE_THRESHOLDS = {
  EUPHORIC: [90, 99],
  EXCITED: [75, 89],
  CONTENT: [55, 74],
  RESTLESS: [40, 54],
  FRUSTRATED: [25, 39],
  APATHETIC: [10, 24],
  HOSTILE: [0, 9],
};

// Base morale impacts
const BASE_MORALE_IMPACTS = {
  WIN: 1,
  LOSS: -1,
  WALK_OFF_WIN: 3,
  WALK_OFF_LOSS: -3,
  NO_HITTER: 5,
  GOT_NO_HIT: -4,
  SHUTOUT_WIN: 2,
  SHUTOUT_LOSS: -2,
  WIN_STREAK_3: 2,
  WIN_STREAK_5: 5,
  WIN_STREAK_7: 8,
  LOSE_STREAK_3: -2,
  LOSE_STREAK_5: -5,
  LOSE_STREAK_7: -10,
  WIN_STREAK_BROKEN: -3,
  LOSE_STREAK_BROKEN: 4,
  TRADE_ACQUIRE_STAR: 8,
  TRADE_LOSE_STAR: -10,
  TRADE_SALARY_DUMP: -8,
  CALL_UP_TOP_PROSPECT: 5,
  CLINCH_PLAYOFF: 15,
  CLINCH_DIVISION: 20,
  ELIMINATED: -15,
  OPENING_DAY: 10,
  RIVALRY_SWEEP: 8,
  SWEPT_BY_RIVAL: -8,
};

// Config
const FAN_MORALE_CONFIG = {
  driftFrequency: 3,
  driftAmount: 1,
  baselineRange: 5,
  maxMomentumBonus: 0.5,
  momentumPerStreak: 0.1,
  tradeScrutinyGames: 14,
  blowoutRunDifferential: 7,
  rivalMultiplier: 1.5,
  playoffRaceMonth: 8,
};

// Reporter personality weights
const REPORTER_PERSONALITY_WEIGHTS = {
  OPTIMIST: 15,
  PESSIMIST: 10,
  BALANCED: 20,
  DRAMATIC: 12,
  ANALYTICAL: 10,
  HOMER: 8,
  CONTRARIAN: 8,
  INSIDER: 7,
  OLD_SCHOOL: 5,
  HOT_TAKE: 5,
};

// Reporter morale influence
const REPORTER_MORALE_INFLUENCE = {
  OPTIMIST: { basePerStory: 0.5, winBoost: 1, lossBuffer: 0.5, streakAmplifier: 1.2 },
  PESSIMIST: { basePerStory: -0.5, winBoost: 0, lossBuffer: -1, streakAmplifier: 0.8 },
  BALANCED: { basePerStory: 0, winBoost: 0.5, lossBuffer: -0.5, streakAmplifier: 1.0 },
  DRAMATIC: { basePerStory: 0, winBoost: 2, lossBuffer: -2, streakAmplifier: 1.5 },
  HOMER: { basePerStory: 1, winBoost: 2, lossBuffer: 0, streakAmplifier: 1.3 },
  HOT_TAKE: { basePerStory: 0, winBoost: 3, lossBuffer: -3, streakAmplifier: 2.0 },
};

const PERSONALITY_ALIGNMENT_RATE = 0.80;

// ============================================
// FAN MORALE ENGINE MOCK FUNCTIONS
// ============================================

function getFanState(morale) {
  if (morale >= 90) return 'EUPHORIC';
  if (morale >= 75) return 'EXCITED';
  if (morale >= 55) return 'CONTENT';
  if (morale >= 40) return 'RESTLESS';
  if (morale >= 25) return 'FRUSTRATED';
  if (morale >= 10) return 'APATHETIC';
  return 'HOSTILE';
}

function getRiskLevel(morale) {
  if (morale >= 40) return 'SAFE';
  if (morale >= 25) return 'WATCH';
  if (morale >= 10) return 'DANGER';
  return 'CRITICAL';
}

function classifyPerformance(differential) {
  if (differential >= 10) return 'VASTLY_EXCEEDING';
  if (differential >= 5) return 'EXCEEDING';
  if (differential >= 1) return 'SLIGHTLY_ABOVE';
  if (differential >= -1) return 'MEETING';
  if (differential >= -4) return 'SLIGHTLY_BELOW';
  if (differential >= -9) return 'UNDERPERFORMING';
  return 'VASTLY_UNDER';
}

function getPerformanceMultiplier(classification, eventImpact) {
  if (eventImpact > 0) {
    switch (classification) {
      case 'VASTLY_EXCEEDING': return 1.5;
      case 'EXCEEDING': return 1.3;
      case 'SLIGHTLY_ABOVE': return 1.1;
      case 'MEETING': return 1.0;
      case 'SLIGHTLY_BELOW': return 0.9;
      case 'UNDERPERFORMING': return 0.7;
      case 'VASTLY_UNDER': return 0.5;
    }
  }
  if (eventImpact < 0) {
    switch (classification) {
      case 'VASTLY_EXCEEDING': return 0.5;
      case 'EXCEEDING': return 0.7;
      case 'SLIGHTLY_ABOVE': return 0.9;
      case 'MEETING': return 1.0;
      case 'SLIGHTLY_BELOW': return 1.1;
      case 'UNDERPERFORMING': return 1.3;
      case 'VASTLY_UNDER': return 1.5;
    }
  }
  return 1.0;
}

function getTimingMultiplier(seasonContext) {
  if (seasonContext.inPlayoffRace && seasonContext.month >= 8) return 1.5;
  if (seasonContext.eliminated) return 0.5;
  if (seasonContext.gamesPlayed < 20) return 0.8;
  if (seasonContext.isTradeDeadlineWeek) return 1.3;
  return 1.0;
}

function calculateMoraleBaseline(expectedWinsDifferential, divisionRank) {
  const performanceFactor = expectedWinsDifferential * 2;
  const standingsFactor = (3 - divisionRank) * 5;
  return Math.max(20, Math.min(80, 50 + performanceFactor + standingsFactor));
}

function calculateMoraleDrift(currentMorale, baseline) {
  if (currentMorale > baseline + FAN_MORALE_CONFIG.baselineRange) return -1;
  if (currentMorale < baseline - FAN_MORALE_CONFIG.baselineRange) return 1;
  return 0;
}

function applyMomentum(currentTrend, consecutiveChanges, newChange) {
  const { maxMomentumBonus, momentumPerStreak } = FAN_MORALE_CONFIG;

  if (currentTrend === 'RISING' && newChange > 0) {
    const bonus = Math.min(consecutiveChanges * momentumPerStreak, maxMomentumBonus);
    return newChange * (1 + bonus);
  }
  if (currentTrend === 'FALLING' && newChange < 0) {
    const bonus = Math.min(consecutiveChanges * momentumPerStreak, maxMomentumBonus);
    return newChange * (1 + bonus);
  }
  if (currentTrend === 'RISING' && newChange < 0 && consecutiveChanges > 3) {
    return newChange * 1.3;
  }
  if (currentTrend === 'FALLING' && newChange > 0 && consecutiveChanges > 3) {
    return newChange * 1.5;
  }
  return newChange;
}

function calculateFanVerdict(aftermath) {
  const { scrutinyPeriod, expectedWinsChange, acquiredPlayers } = aftermath;

  if (scrutinyPeriod.gamesPlayed < 5) return 'TOO_EARLY';

  const winPct = scrutinyPeriod.wins / scrutinyPeriod.gamesPlayed;
  const acquiredContributions = acquiredPlayers.reduce((sum, p) => sum + p.keyMoments.length, 0);
  const wasSalaryDump = expectedWinsChange < -3;

  if (wasSalaryDump) {
    if (winPct >= 0.6 && acquiredContributions > 0) return 'LOOKING_GOOD';
    if (winPct < 0.4) return 'DISASTER';
    return 'JURY_OUT';
  } else {
    if (winPct >= 0.6) return 'LOOKING_GOOD';
    if (winPct >= 0.4) return 'JURY_OUT';
    if (acquiredContributions > 2) return 'JURY_OUT';
    return 'LOOKING_BAD';
  }
}

function calculateContractionRisk(fanMorale, financialHealth, performanceHealth) {
  const moraleComponent = Math.max(0, (50 - fanMorale) / 50);
  const overallRisk = moraleComponent * 0.30 + (1 - financialHealth) * 0.40 + (1 - performanceHealth) * 0.30;

  return {
    level: overallRisk > 0.7 ? 'CRITICAL' : overallRisk > 0.5 ? 'HIGH' : 'NORMAL',
    moraleContribution: moraleComponent,
    survivalOdds: Math.round(100 - (overallRisk * 35)),
  };
}

function determineFanReaction(oldExpected, newExpected, trigger) {
  const change = newExpected - oldExpected;

  if (trigger === 'TRADE') {
    if (change > 0) return { type: 'OPTIMISTIC', moraleImpact: change * 2 };
    if (change < -3) return { type: 'SUSPICIOUS', moraleImpact: change * 3 };
    return { type: 'WAIT_AND_SEE', moraleImpact: 0 };
  }
  if (trigger === 'CALL_UP') {
    return { type: 'HOPEFUL', moraleImpact: Math.max(change * 1.5, 2) };
  }
  if (trigger === 'INJURY') {
    return { type: 'CONCERNED', moraleImpact: change * 1.5 };
  }
  return { type: 'NEUTRAL', moraleImpact: change };
}

// ============================================
// NARRATIVE ENGINE MOCK FUNCTIONS
// ============================================

function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) return key;
  }
  return entries[0][0];
}

function generateBeatReporter(teamId) {
  return {
    id: `rep_${Date.now()}`,
    firstName: 'Test',
    lastName: 'Reporter',
    teamId,
    personality: weightedRandom(REPORTER_PERSONALITY_WEIGHTS),
    tenure: 0,
    reputation: 'ROOKIE',
    storiesWritten: 0,
    fanMoraleInfluence: 0,
  };
}

function getReporterName(reporter) {
  return `${reporter.firstName} ${reporter.lastName}`;
}

function updateReporterReputation(reporter) {
  let reputation;
  if (reporter.tenure >= 10) reputation = 'LEGENDARY';
  else if (reporter.tenure >= 5) reputation = 'VETERAN';
  else if (reporter.tenure >= 2) reputation = 'ESTABLISHED';
  else reputation = 'ROOKIE';
  return { ...reporter, reputation };
}

function shouldAlignWithPersonality() {
  return Math.random() < PERSONALITY_ALIGNMENT_RATE;
}

function calculateStoryMoraleImpact(reporter, personality, context) {
  const config = REPORTER_MORALE_INFLUENCE[personality] || REPORTER_MORALE_INFLUENCE.BALANCED;
  let impact = config.basePerStory;

  if (context.gameResult) {
    impact += context.gameResult.won ? config.winBoost : config.lossBuffer;
  }

  if (context.streakInfo && context.streakInfo.count >= 5) {
    impact *= config.streakAmplifier;
  }

  const reputationMult = { ROOKIE: 0.7, ESTABLISHED: 1.0, VETERAN: 1.2, LEGENDARY: 1.5 };
  impact *= reputationMult[reporter.reputation] || 1.0;

  return Math.round(impact * 10) / 10;
}

// ============================================
// TEST SUITE
// ============================================

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

function assertClose(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`${message}: expected ${expected} ± ${tolerance}, got ${actual}`);
  }
}

// ============================================
// FAN MORALE TESTS
// ============================================

console.log('\n=== FAN MORALE ENGINE TESTS ===\n');

test('Fan states: 7 states from HOSTILE to EUPHORIC', () => {
  assert.strictEqual(Object.keys(FAN_STATE_THRESHOLDS).length, 7);
  assert.strictEqual(getFanState(95), 'EUPHORIC');
  assert.strictEqual(getFanState(80), 'EXCITED');
  assert.strictEqual(getFanState(60), 'CONTENT');
  assert.strictEqual(getFanState(45), 'RESTLESS');
  assert.strictEqual(getFanState(30), 'FRUSTRATED');
  assert.strictEqual(getFanState(15), 'APATHETIC');
  assert.strictEqual(getFanState(5), 'HOSTILE');
});

test('Fan state thresholds: correct boundaries', () => {
  assert.strictEqual(getFanState(90), 'EUPHORIC');
  assert.strictEqual(getFanState(89), 'EXCITED');
  assert.strictEqual(getFanState(75), 'EXCITED');
  assert.strictEqual(getFanState(74), 'CONTENT');
  assert.strictEqual(getFanState(55), 'CONTENT');
  assert.strictEqual(getFanState(54), 'RESTLESS');
  assert.strictEqual(getFanState(40), 'RESTLESS');
  assert.strictEqual(getFanState(39), 'FRUSTRATED');
});

test('Risk level: SAFE for morale >= 40', () => {
  assert.strictEqual(getRiskLevel(50), 'SAFE');
  assert.strictEqual(getRiskLevel(40), 'SAFE');
  assert.strictEqual(getRiskLevel(39), 'WATCH');
});

test('Risk level: CRITICAL for morale < 10', () => {
  assert.strictEqual(getRiskLevel(25), 'WATCH');
  assert.strictEqual(getRiskLevel(10), 'DANGER');
  assert.strictEqual(getRiskLevel(9), 'CRITICAL');
  assert.strictEqual(getRiskLevel(0), 'CRITICAL');
});

test('Base impacts: positive events have positive impact', () => {
  assert(BASE_MORALE_IMPACTS.WIN > 0);
  assert(BASE_MORALE_IMPACTS.WALK_OFF_WIN > 0);
  assert(BASE_MORALE_IMPACTS.NO_HITTER > 0);
  assert(BASE_MORALE_IMPACTS.WIN_STREAK_5 > 0);
  assert(BASE_MORALE_IMPACTS.CLINCH_PLAYOFF > 0);
});

test('Base impacts: negative events have negative impact', () => {
  assert(BASE_MORALE_IMPACTS.LOSS < 0);
  assert(BASE_MORALE_IMPACTS.WALK_OFF_LOSS < 0);
  assert(BASE_MORALE_IMPACTS.GOT_NO_HIT < 0);
  assert(BASE_MORALE_IMPACTS.LOSE_STREAK_5 < 0);
  assert(BASE_MORALE_IMPACTS.ELIMINATED < 0);
});

test('Base impacts: trades have appropriate magnitudes', () => {
  assert.strictEqual(BASE_MORALE_IMPACTS.TRADE_ACQUIRE_STAR, 8);
  assert.strictEqual(BASE_MORALE_IMPACTS.TRADE_LOSE_STAR, -10);
  assert.strictEqual(BASE_MORALE_IMPACTS.TRADE_SALARY_DUMP, -8);
});

test('Base impacts: streaks escalate appropriately', () => {
  assert(BASE_MORALE_IMPACTS.WIN_STREAK_3 < BASE_MORALE_IMPACTS.WIN_STREAK_5);
  assert(BASE_MORALE_IMPACTS.WIN_STREAK_5 < BASE_MORALE_IMPACTS.WIN_STREAK_7);
  assert(BASE_MORALE_IMPACTS.LOSE_STREAK_3 > BASE_MORALE_IMPACTS.LOSE_STREAK_5);
  assert(BASE_MORALE_IMPACTS.LOSE_STREAK_5 > BASE_MORALE_IMPACTS.LOSE_STREAK_7);
});

test('Performance classification: correct thresholds', () => {
  assert.strictEqual(classifyPerformance(12), 'VASTLY_EXCEEDING');
  assert.strictEqual(classifyPerformance(7), 'EXCEEDING');
  assert.strictEqual(classifyPerformance(2), 'SLIGHTLY_ABOVE');
  assert.strictEqual(classifyPerformance(0), 'MEETING');
  assert.strictEqual(classifyPerformance(-2), 'SLIGHTLY_BELOW');
  assert.strictEqual(classifyPerformance(-7), 'UNDERPERFORMING');
  assert.strictEqual(classifyPerformance(-12), 'VASTLY_UNDER');
});

test('Performance multiplier: amplifies positive when exceeding', () => {
  assert.strictEqual(getPerformanceMultiplier('VASTLY_EXCEEDING', 1), 1.5);
  assert.strictEqual(getPerformanceMultiplier('EXCEEDING', 1), 1.3);
  assert.strictEqual(getPerformanceMultiplier('MEETING', 1), 1.0);
});

test('Performance multiplier: dampens positive when underperforming', () => {
  assert.strictEqual(getPerformanceMultiplier('UNDERPERFORMING', 1), 0.7);
  assert.strictEqual(getPerformanceMultiplier('VASTLY_UNDER', 1), 0.5);
});

test('Performance multiplier: dampens negative when exceeding', () => {
  assert.strictEqual(getPerformanceMultiplier('VASTLY_EXCEEDING', -1), 0.5);
  assert.strictEqual(getPerformanceMultiplier('EXCEEDING', -1), 0.7);
});

test('Performance multiplier: amplifies negative when underperforming', () => {
  assert.strictEqual(getPerformanceMultiplier('UNDERPERFORMING', -1), 1.3);
  assert.strictEqual(getPerformanceMultiplier('VASTLY_UNDER', -1), 1.5);
});

test('Timing multiplier: playoff race = 1.5x', () => {
  const context = { inPlayoffRace: true, month: 9, eliminated: false, gamesPlayed: 100, isTradeDeadlineWeek: false };
  assert.strictEqual(getTimingMultiplier(context), 1.5);
});

test('Timing multiplier: eliminated = 0.5x', () => {
  const context = { inPlayoffRace: false, month: 9, eliminated: true, gamesPlayed: 100, isTradeDeadlineWeek: false };
  assert.strictEqual(getTimingMultiplier(context), 0.5);
});

test('Timing multiplier: early season = 0.8x', () => {
  const context = { inPlayoffRace: false, month: 4, eliminated: false, gamesPlayed: 10, isTradeDeadlineWeek: false };
  assert.strictEqual(getTimingMultiplier(context), 0.8);
});

test('Timing multiplier: trade deadline = 1.3x', () => {
  const context = { inPlayoffRace: false, month: 7, eliminated: false, gamesPlayed: 100, isTradeDeadlineWeek: true };
  assert.strictEqual(getTimingMultiplier(context), 1.3);
});

test('Morale baseline: 1st place team = higher baseline', () => {
  const firstPlace = calculateMoraleBaseline(5, 1);  // +5 differential, 1st place
  const lastPlace = calculateMoraleBaseline(-5, 5);  // -5 differential, 5th place
  assert(firstPlace > lastPlace, `1st place baseline (${firstPlace}) should exceed 5th place (${lastPlace})`);
});

test('Morale baseline: clamped between 20-80', () => {
  const superHigh = calculateMoraleBaseline(20, 1);
  const superLow = calculateMoraleBaseline(-20, 5);
  assert(superHigh <= 80, `Baseline capped at 80, got ${superHigh}`);
  assert(superLow >= 20, `Baseline floor at 20, got ${superLow}`);
});

test('Morale drift: drifts down when above baseline', () => {
  const drift = calculateMoraleDrift(75, 50);  // Current 75, baseline 50
  assert.strictEqual(drift, -1);
});

test('Morale drift: drifts up when below baseline', () => {
  const drift = calculateMoraleDrift(30, 50);  // Current 30, baseline 50
  assert.strictEqual(drift, 1);
});

test('Morale drift: no drift when near baseline', () => {
  const drift = calculateMoraleDrift(52, 50);  // Within range
  assert.strictEqual(drift, 0);
});

test('Momentum: amplifies continued rising trend', () => {
  const base = 2;
  const amplified = applyMomentum('RISING', 3, base);
  assert(amplified > base, `Amplified (${amplified}) should exceed base (${base})`);
});

test('Momentum: amplifies continued falling trend', () => {
  const base = -2;
  const amplified = applyMomentum('FALLING', 3, base);
  assert(amplified < base, `Amplified (${amplified}) should be more negative than base (${base})`);
});

test('Momentum: turnaround after losing streak gets bonus', () => {
  const base = 2;
  const turnaround = applyMomentum('FALLING', 5, base);
  assertClose(turnaround, base * 1.5, 0.01, 'Turnaround bonus');
});

test('Momentum: capped at 50% bonus', () => {
  const base = 2;
  const maxAmplified = applyMomentum('RISING', 10, base);  // Way more than needed for max
  assert(maxAmplified <= base * 1.5, `Max amplified (${maxAmplified}) should not exceed 50% bonus`);
});

console.log('\n=== TRADE SCRUTINY TESTS ===\n');

test('Trade verdict: TOO_EARLY for < 5 games', () => {
  const aftermath = {
    scrutinyPeriod: { gamesPlayed: 3, wins: 2, losses: 1 },
    expectedWinsChange: 0,
    acquiredPlayers: [],
  };
  assert.strictEqual(calculateFanVerdict(aftermath), 'TOO_EARLY');
});

test('Trade verdict: LOOKING_GOOD for normal trade with 60%+ win rate', () => {
  const aftermath = {
    scrutinyPeriod: { gamesPlayed: 10, wins: 7, losses: 3 },
    expectedWinsChange: 2,  // Not a salary dump
    acquiredPlayers: [],
  };
  assert.strictEqual(calculateFanVerdict(aftermath), 'LOOKING_GOOD');
});

test('Trade verdict: LOOKING_BAD for normal trade with poor performance', () => {
  const aftermath = {
    scrutinyPeriod: { gamesPlayed: 10, wins: 2, losses: 8 },
    expectedWinsChange: 2,
    acquiredPlayers: [],
  };
  assert.strictEqual(calculateFanVerdict(aftermath), 'LOOKING_BAD');
});

test('Trade verdict: DISASTER for salary dump with losing', () => {
  const aftermath = {
    scrutinyPeriod: { gamesPlayed: 10, wins: 3, losses: 7 },
    expectedWinsChange: -5,  // Salary dump
    acquiredPlayers: [],
  };
  assert.strictEqual(calculateFanVerdict(aftermath), 'DISASTER');
});

test('Trade verdict: LOOKING_GOOD for salary dump with winning + contributions', () => {
  const aftermath = {
    scrutinyPeriod: { gamesPlayed: 10, wins: 7, losses: 3 },
    expectedWinsChange: -5,
    acquiredPlayers: [{ keyMoments: ['walk-off hit'] }],
  };
  assert.strictEqual(calculateFanVerdict(aftermath), 'LOOKING_GOOD');
});

console.log('\n=== EXPECTED WINS REACTION TESTS ===\n');

test('Fan reaction: OPTIMISTIC for positive trade change', () => {
  const reaction = determineFanReaction(75, 80, 'TRADE');
  assert.strictEqual(reaction.type, 'OPTIMISTIC');
  assert.strictEqual(reaction.moraleImpact, 10);  // +5 * 2
});

test('Fan reaction: SUSPICIOUS for salary dump trade', () => {
  const reaction = determineFanReaction(80, 72, 'TRADE');  // -8 change
  assert.strictEqual(reaction.type, 'SUSPICIOUS');
  assert.strictEqual(reaction.moraleImpact, -24);  // -8 * 3
});

test('Fan reaction: HOPEFUL for call-up (always positive)', () => {
  const reaction = determineFanReaction(80, 81, 'CALL_UP');
  assert.strictEqual(reaction.type, 'HOPEFUL');
  assert(reaction.moraleImpact >= 2, 'Call-up should give at least +2 morale');
});

test('Fan reaction: CONCERNED for injury', () => {
  const reaction = determineFanReaction(80, 75, 'INJURY');
  assert.strictEqual(reaction.type, 'CONCERNED');
  assert.strictEqual(reaction.moraleImpact, -7.5);  // -5 * 1.5
});

console.log('\n=== CONTRACTION RISK TESTS ===\n');

test('Contraction risk: NORMAL for healthy team', () => {
  const risk = calculateContractionRisk(60, 0.8, 0.7);  // Good morale, finances, performance
  assert.strictEqual(risk.level, 'NORMAL');
  assert(risk.survivalOdds > 90);
});

test('Contraction risk: CRITICAL for struggling team', () => {
  const risk = calculateContractionRisk(10, 0.2, 0.3);  // Bad everything
  assert.strictEqual(risk.level, 'CRITICAL');
  assert(risk.survivalOdds < 80);
});

test('Contraction risk: morale contributes 30%', () => {
  const lowMoraleRisk = calculateContractionRisk(10, 0.5, 0.5);
  const highMoraleRisk = calculateContractionRisk(80, 0.5, 0.5);
  // Low morale should have higher morale contribution
  assert(lowMoraleRisk.moraleContribution > highMoraleRisk.moraleContribution);
});

// ============================================
// NARRATIVE ENGINE TESTS
// ============================================

console.log('\n=== NARRATIVE ENGINE TESTS ===\n');

test('Reporter personalities: 10 types with weights summing to 100', () => {
  const weights = Object.values(REPORTER_PERSONALITY_WEIGHTS);
  assert.strictEqual(weights.length, 10);
  assert.strictEqual(weights.reduce((a, b) => a + b, 0), 100);
});

test('Reporter generation: creates valid reporter', () => {
  const reporter = generateBeatReporter('team1');
  assert(reporter.id);
  assert(reporter.firstName);
  assert(reporter.lastName);
  assert.strictEqual(reporter.teamId, 'team1');
  assert(REPORTER_PERSONALITY_WEIGHTS[reporter.personality] !== undefined);
  assert.strictEqual(reporter.reputation, 'ROOKIE');
});

test('Reporter name: formats correctly', () => {
  const reporter = { firstName: 'John', lastName: 'Smith' };
  assert.strictEqual(getReporterName(reporter), 'John Smith');
});

test('Reporter reputation: ROOKIE for 0-1 tenure', () => {
  const reporter = { tenure: 1 };
  assert.strictEqual(updateReporterReputation(reporter).reputation, 'ROOKIE');
});

test('Reporter reputation: ESTABLISHED for 2-4 tenure', () => {
  const reporter = { tenure: 3 };
  assert.strictEqual(updateReporterReputation(reporter).reputation, 'ESTABLISHED');
});

test('Reporter reputation: VETERAN for 5-9 tenure', () => {
  const reporter = { tenure: 7 };
  assert.strictEqual(updateReporterReputation(reporter).reputation, 'VETERAN');
});

test('Reporter reputation: LEGENDARY for 10+ tenure', () => {
  const reporter = { tenure: 15 };
  assert.strictEqual(updateReporterReputation(reporter).reputation, 'LEGENDARY');
});

test('80/20 rule: personality alignment is probabilistic', () => {
  // Run multiple times and verify roughly 80% alignment
  let alignments = 0;
  const runs = 1000;
  for (let i = 0; i < runs; i++) {
    if (shouldAlignWithPersonality()) alignments++;
  }
  const rate = alignments / runs;
  assert(rate > 0.7 && rate < 0.9, `Alignment rate ${rate} should be ~0.80`);
});

test('Morale influence: OPTIMIST has positive base impact', () => {
  const reporter = { reputation: 'ESTABLISHED' };
  const context = { gameResult: { won: true } };
  const impact = calculateStoryMoraleImpact(reporter, 'OPTIMIST', context);
  assert(impact > 0, `OPTIMIST impact (${impact}) should be positive`);
});

test('Morale influence: PESSIMIST has negative base impact', () => {
  const reporter = { reputation: 'ESTABLISHED' };
  const context = { gameResult: { won: false } };
  const impact = calculateStoryMoraleImpact(reporter, 'PESSIMIST', context);
  assert(impact < 0, `PESSIMIST impact (${impact}) should be negative`);
});

test('Morale influence: DRAMATIC has extreme swings', () => {
  const reporter = { reputation: 'ESTABLISHED' };
  const winContext = { gameResult: { won: true } };
  const lossContext = { gameResult: { won: false } };

  const winImpact = calculateStoryMoraleImpact(reporter, 'DRAMATIC', winContext);
  const lossImpact = calculateStoryMoraleImpact(reporter, 'DRAMATIC', lossContext);

  assert.strictEqual(winImpact, 2);   // basePerStory(0) + winBoost(2)
  assert.strictEqual(lossImpact, -2); // basePerStory(0) + lossBuffer(-2)
});

test('Morale influence: HOMER protects from loss impact', () => {
  const reporter = { reputation: 'ESTABLISHED' };
  const context = { gameResult: { won: false } };
  const impact = calculateStoryMoraleImpact(reporter, 'HOMER', context);
  assert.strictEqual(impact, 1);  // basePerStory(1) + lossBuffer(0)
});

test('Morale influence: HOT_TAKE has most extreme swings', () => {
  const reporter = { reputation: 'ESTABLISHED' };
  const winContext = { gameResult: { won: true } };
  const lossContext = { gameResult: { won: false } };

  const winImpact = calculateStoryMoraleImpact(reporter, 'HOT_TAKE', winContext);
  const lossImpact = calculateStoryMoraleImpact(reporter, 'HOT_TAKE', lossContext);

  assert.strictEqual(winImpact, 3);   // basePerStory(0) + winBoost(3)
  assert.strictEqual(lossImpact, -3); // basePerStory(0) + lossBuffer(-3)
});

test('Morale influence: reputation scales impact', () => {
  const rookieReporter = { reputation: 'ROOKIE' };
  const legendaryReporter = { reputation: 'LEGENDARY' };
  const context = { gameResult: { won: true } };

  const rookieImpact = calculateStoryMoraleImpact(rookieReporter, 'BALANCED', context);
  const legendaryImpact = calculateStoryMoraleImpact(legendaryReporter, 'BALANCED', context);

  assert(legendaryImpact > rookieImpact, 'LEGENDARY should have more influence');
});

test('Morale influence: streak amplifier works', () => {
  const reporter = { reputation: 'ESTABLISHED' };
  const noStreakContext = { gameResult: { won: true }, streakInfo: { type: 'WIN', count: 2 } };
  const streakContext = { gameResult: { won: true }, streakInfo: { type: 'WIN', count: 6 } };

  const noStreakImpact = calculateStoryMoraleImpact(reporter, 'DRAMATIC', noStreakContext);
  const streakImpact = calculateStoryMoraleImpact(reporter, 'DRAMATIC', streakContext);

  assert(streakImpact > noStreakImpact, `Streak impact (${streakImpact}) should exceed non-streak (${noStreakImpact})`);
});

// ============================================
// REPORTER RELIABILITY SYSTEM TESTS
// ============================================

// Reliability constants
const REPORTER_ACCURACY_RATES = {
  INSIDER: 0.95,
  ANALYTICAL: 0.92,
  BALANCED: 0.90,
  OLD_SCHOOL: 0.88,
  OPTIMIST: 0.85,
  PESSIMIST: 0.85,
  HOMER: 0.80,
  DRAMATIC: 0.78,
  CONTRARIAN: 0.75,
  HOT_TAKE: 0.65,
};

const CONFIDENCE_THRESHOLDS = {
  CONFIRMED: { min: 0.90, language: ['has confirmed', 'officially', 'announced'] },
  LIKELY: { min: 0.80, language: ['is expected to', 'all but certain', 'barring surprises'] },
  SOURCES_SAY: { min: 0.70, language: ["sources say", "I'm told", 'per sources'] },
  RUMORED: { min: 0.50, language: ['rumored to', 'could potentially', 'whispers suggest'] },
  SPECULATING: { min: 0.00, language: ["wouldn't be surprised if", 'my guess is', 'speculation'] },
};

const INACCURACY_TYPE_WEIGHTS = {
  INSIDER: { FABRICATED: 60, OUTDATED: 30, PREMATURE: 10 },
  ANALYTICAL: { MISATTRIBUTED: 50, OUTDATED: 30, EXAGGERATED: 20 },
  BALANCED: { OUTDATED: 40, PREMATURE: 30, MISATTRIBUTED: 30 },
  OLD_SCHOOL: { OUTDATED: 60, MISATTRIBUTED: 25, EXAGGERATED: 15 },
  OPTIMIST: { PREMATURE: 50, EXAGGERATED: 40, FABRICATED: 10 },
  PESSIMIST: { PREMATURE: 50, EXAGGERATED: 40, FABRICATED: 10 },
  HOMER: { EXAGGERATED: 50, FABRICATED: 30, PREMATURE: 20 },
  DRAMATIC: { EXAGGERATED: 60, PREMATURE: 30, FABRICATED: 10 },
  CONTRARIAN: { FABRICATED: 40, PREMATURE: 35, EXAGGERATED: 25 },
  HOT_TAKE: { FABRICATED: 45, EXAGGERATED: 35, PREMATURE: 20 },
};

// Reliability functions (mock implementation matching actual engine)
function determineStoryAccuracy(personality) {
  const accuracyRate = REPORTER_ACCURACY_RATES[personality];
  return Math.random() < accuracyRate;
}

function determineInaccuracyType(personality) {
  const weights = INACCURACY_TYPE_WEIGHTS[personality];
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (const [type, weight] of entries) {
    random -= weight;
    if (random <= 0) {
      return type;
    }
  }
  return 'OUTDATED';
}

function determineConfidenceLevel(personality, eventType) {
  const baseAccuracy = REPORTER_ACCURACY_RATES[personality];

  const hedgingModifier = {
    GAME_RECAP: 1.0,
    PRE_GAME: 0.95,
    TRADE_REACTION: 0.90,
    CALL_UP: 0.98,
    INJURY_REPORT: 0.85,
    MILESTONE: 1.0,
    STREAK: 1.0,
    PLAYOFF_RACE: 0.90,
    SEASON_SUMMARY: 1.0,
    OFFSEASON_NEWS: 0.75,
    RANDOM_EVENT: 0.85,
  };

  const effectiveConfidence = baseAccuracy * (hedgingModifier[eventType] || 1.0);

  if (effectiveConfidence >= CONFIDENCE_THRESHOLDS.CONFIRMED.min) return 'CONFIRMED';
  if (effectiveConfidence >= CONFIDENCE_THRESHOLDS.LIKELY.min) return 'LIKELY';
  if (effectiveConfidence >= CONFIDENCE_THRESHOLDS.SOURCES_SAY.min) return 'SOURCES_SAY';
  if (effectiveConfidence >= CONFIDENCE_THRESHOLDS.RUMORED.min) return 'RUMORED';
  return 'SPECULATING';
}

function requiresRetraction(inaccuracyType, eventType) {
  const highStakesEvents = ['TRADE_REACTION', 'INJURY_REPORT', 'CALL_UP', 'OFFSEASON_NEWS'];
  const severeInaccuracies = ['FABRICATED', 'PREMATURE'];

  if (severeInaccuracies.includes(inaccuracyType) && highStakesEvents.includes(eventType)) {
    return true;
  }

  if (inaccuracyType === 'EXAGGERATED' || inaccuracyType === 'MISATTRIBUTED') {
    return Math.random() < 0.30;
  }

  return Math.random() < 0.10;
}

function calculateCredibilityHit(inaccuracyType) {
  const hits = {
    FABRICATED: -15,
    PREMATURE: -10,
    MISATTRIBUTED: -5,
    EXAGGERATED: -3,
    OUTDATED: -1,
  };
  return hits[inaccuracyType];
}

// Reliability Tests
console.log('\n--- REPORTER RELIABILITY SYSTEM TESTS ---\n');

test('Accuracy rates: INSIDER is most accurate (95%)', () => {
  assert.strictEqual(REPORTER_ACCURACY_RATES.INSIDER, 0.95);
});

test('Accuracy rates: HOT_TAKE is least accurate (65%)', () => {
  assert.strictEqual(REPORTER_ACCURACY_RATES.HOT_TAKE, 0.65);
});

test('Accuracy rates: ANALYTICAL beats HOMER', () => {
  assert(REPORTER_ACCURACY_RATES.ANALYTICAL > REPORTER_ACCURACY_RATES.HOMER,
    'ANALYTICAL should be more accurate than HOMER');
});

test('Accuracy rates: All personalities have defined rates', () => {
  const personalities = Object.keys(REPORTER_PERSONALITY_WEIGHTS);
  for (const p of personalities) {
    assert(REPORTER_ACCURACY_RATES[p] !== undefined, `${p} should have accuracy rate`);
    assert(REPORTER_ACCURACY_RATES[p] >= 0.5 && REPORTER_ACCURACY_RATES[p] <= 1.0,
      `${p} rate ${REPORTER_ACCURACY_RATES[p]} should be between 0.5 and 1.0`);
  }
});

test('Story accuracy: INSIDER rarely wrong over 1000 runs', () => {
  let accurate = 0;
  const runs = 1000;
  for (let i = 0; i < runs; i++) {
    if (determineStoryAccuracy('INSIDER')) accurate++;
  }
  const rate = accurate / runs;
  assert(rate > 0.90 && rate < 1.0, `INSIDER accuracy ${rate} should be ~0.95`);
});

test('Story accuracy: HOT_TAKE often wrong over 1000 runs', () => {
  let accurate = 0;
  const runs = 1000;
  for (let i = 0; i < runs; i++) {
    if (determineStoryAccuracy('HOT_TAKE')) accurate++;
  }
  const rate = accurate / runs;
  assert(rate > 0.55 && rate < 0.75, `HOT_TAKE accuracy ${rate} should be ~0.65`);
});

test('Inaccuracy types: INSIDER errors are mostly FABRICATED (bad sources)', () => {
  const weights = INACCURACY_TYPE_WEIGHTS.INSIDER;
  const maxType = Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
  assert.strictEqual(maxType, 'FABRICATED', 'INSIDER errors should mostly be FABRICATED');
});

test('Inaccuracy types: DRAMATIC errors are mostly EXAGGERATED', () => {
  const weights = INACCURACY_TYPE_WEIGHTS.DRAMATIC;
  const maxType = Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
  assert.strictEqual(maxType, 'EXAGGERATED', 'DRAMATIC errors should mostly be EXAGGERATED');
});

test('Inaccuracy types: OLD_SCHOOL errors are mostly OUTDATED', () => {
  const weights = INACCURACY_TYPE_WEIGHTS.OLD_SCHOOL;
  const maxType = Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
  assert.strictEqual(maxType, 'OUTDATED', 'OLD_SCHOOL errors should mostly be OUTDATED');
});

test('Inaccuracy types: valid types returned', () => {
  const validTypes = ['PREMATURE', 'EXAGGERATED', 'MISATTRIBUTED', 'FABRICATED', 'OUTDATED'];
  for (let i = 0; i < 100; i++) {
    const type = determineInaccuracyType('HOT_TAKE');
    assert(validTypes.includes(type), `${type} should be valid inaccuracy type`);
  }
});

test('Confidence level: INSIDER + GAME_RECAP = CONFIRMED', () => {
  const confidence = determineConfidenceLevel('INSIDER', 'GAME_RECAP');
  assert.strictEqual(confidence, 'CONFIRMED');
});

test('Confidence level: HOT_TAKE + OFFSEASON_NEWS = lower confidence', () => {
  const confidence = determineConfidenceLevel('HOT_TAKE', 'OFFSEASON_NEWS');
  // 0.65 * 0.75 = 0.4875 → RUMORED
  assert(['RUMORED', 'SPECULATING'].includes(confidence),
    `HOT_TAKE offseason news should be RUMORED or lower, got ${confidence}`);
});

test('Confidence level: ANALYTICAL + MILESTONE = CONFIRMED', () => {
  const confidence = determineConfidenceLevel('ANALYTICAL', 'MILESTONE');
  assert.strictEqual(confidence, 'CONFIRMED', 'Stats-based ANALYTICAL on facts should be CONFIRMED');
});

test('Confidence level: BALANCED + INJURY_REPORT = hedged', () => {
  const confidence = determineConfidenceLevel('BALANCED', 'INJURY_REPORT');
  // 0.90 * 0.85 = 0.765 → SOURCES_SAY
  assert(['LIKELY', 'SOURCES_SAY'].includes(confidence),
    `BALANCED injury report should be hedged, got ${confidence}`);
});

test('Retraction: FABRICATED + TRADE_REACTION always needs retraction', () => {
  // This should always return true
  assert.strictEqual(requiresRetraction('FABRICATED', 'TRADE_REACTION'), true);
});

test('Retraction: PREMATURE + OFFSEASON_NEWS always needs retraction', () => {
  assert.strictEqual(requiresRetraction('PREMATURE', 'OFFSEASON_NEWS'), true);
});

test('Retraction: OUTDATED + GAME_RECAP rarely needs retraction', () => {
  // Should return true ~10% of the time
  let retractions = 0;
  const runs = 1000;
  for (let i = 0; i < runs; i++) {
    if (requiresRetraction('OUTDATED', 'GAME_RECAP')) retractions++;
  }
  const rate = retractions / runs;
  assert(rate > 0.03 && rate < 0.20, `OUTDATED retraction rate ${rate} should be ~0.10`);
});

test('Credibility hit: FABRICATED is most severe (-15)', () => {
  assert.strictEqual(calculateCredibilityHit('FABRICATED'), -15);
});

test('Credibility hit: OUTDATED is least severe (-1)', () => {
  assert.strictEqual(calculateCredibilityHit('OUTDATED'), -1);
});

test('Credibility hit: severity order is correct', () => {
  const fab = calculateCredibilityHit('FABRICATED');
  const prem = calculateCredibilityHit('PREMATURE');
  const mis = calculateCredibilityHit('MISATTRIBUTED');
  const exag = calculateCredibilityHit('EXAGGERATED');
  const out = calculateCredibilityHit('OUTDATED');

  assert(fab < prem, 'FABRICATED should be more severe than PREMATURE');
  assert(prem < mis, 'PREMATURE should be more severe than MISATTRIBUTED');
  assert(mis < exag, 'MISATTRIBUTED should be more severe than EXAGGERATED');
  assert(exag < out, 'EXAGGERATED should be more severe than OUTDATED');
});

// ============================================
// SUMMARY
// ============================================

console.log('\n' + '='.repeat(50));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  process.exit(1);
}
