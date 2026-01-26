/**
 * Day 5 Engine Tests - Mojo, Fitness, and Salary
 *
 * Test suite for:
 * - mojoEngine.ts
 * - fitnessEngine.ts
 * - salaryCalculator.ts
 *
 * Run with: node mojo-fitness-salary-verify.cjs
 */

const assert = require('assert');

// ============================================
// MOCK IMPLEMENTATIONS (for pure Node.js testing)
// ============================================

// Mojo Engine Mock
const MOJO_STATES = {
  [-2]: { level: -2, name: 'RATTLED', displayName: 'Rattled', statMultiplier: 0.82 },
  [-1]: { level: -1, name: 'TENSE', displayName: 'Tense', statMultiplier: 0.90 },
  [0]: { level: 0, name: 'NORMAL', displayName: 'Normal', statMultiplier: 1.00 },
  [1]: { level: 1, name: 'LOCKED_IN', displayName: 'Locked In', statMultiplier: 1.10 },
  [2]: { level: 2, name: 'JACKED', displayName: 'Jacked', statMultiplier: 1.18 },
};

const MOJO_TRIGGERS = {
  SINGLE: { baseDelta: 0.5 },
  DOUBLE: { baseDelta: 0.75 },
  TRIPLE: { baseDelta: 1.0 },
  HOME_RUN: { baseDelta: 1.5 },
  RBI: { baseDelta: 0.5 },
  STOLEN_BASE: { baseDelta: 0.5 },
  GREAT_DEFENSIVE_PLAY: { baseDelta: 0.5 },
  PITCHER_STRIKEOUT: { baseDelta: 0.5 },
  PITCHER_OUT: { baseDelta: 0.3 },
  PITCHER_CLEAN_INNING: { baseDelta: 0.5 },
  STRIKEOUT: { baseDelta: -0.5 },
  BATTER_OUT: { baseDelta: -0.3 },
  ERROR: { baseDelta: -1.0 },
  CAUGHT_STEALING: { baseDelta: -1.0 },
  PITCHER_WALK: { baseDelta: -0.5 },
  PITCHER_HIT: { baseDelta: -0.3 },
  PITCHER_XBH: { baseDelta: -0.75 },
  PITCHER_RUN: { baseDelta: -1.0 },
  WILD_PITCH: { baseDelta: -0.5 },
  PASSED_BALL: { baseDelta: -0.5 },
};

const MOJO_AMPLIFICATION = {
  tieGameLateInnings: 1.5,
  rispTwoOuts: 1.3,
  closeGame: 1.2,
  playoffGame: 1.5,
  basesLoaded: 1.4,
};

const MOJO_CARRYOVER_RATE = 0.3;

function clampMojo(value) {
  return Math.max(-2, Math.min(2, Math.round(value)));
}

function getMojoStatMultiplier(mojo) {
  return MOJO_STATES[mojo].statMultiplier;
}

function calculateAmplification(situation) {
  let amp = 1.0;
  if (situation.scoreDiff === 0 && situation.inning >= 8) {
    amp *= MOJO_AMPLIFICATION.tieGameLateInnings;
  }
  const hasRISP = situation.runnersOn.includes(2) || situation.runnersOn.includes(3);
  if (hasRISP && situation.outs === 2) {
    amp *= MOJO_AMPLIFICATION.rispTwoOuts;
  }
  if (Math.abs(situation.scoreDiff) <= 2 && situation.scoreDiff !== 0) {
    amp *= MOJO_AMPLIFICATION.closeGame;
  }
  if (situation.isPlayoff) {
    amp *= MOJO_AMPLIFICATION.playoffGame;
  }
  if (situation.runnersOn.length === 3) {
    amp *= MOJO_AMPLIFICATION.basesLoaded;
  }
  return amp;
}

function getMojoDelta(trigger, situation) {
  const triggerData = MOJO_TRIGGERS[trigger];
  if (!triggerData) return 0;
  let delta = triggerData.baseDelta;
  if (situation) {
    delta *= calculateAmplification(situation);
  }
  return delta;
}

function calculateStartingMojo(endMojo) {
  const carryover = endMojo * MOJO_CARRYOVER_RATE;
  return clampMojo(Math.round(carryover));
}

function getMojoFameModifier(mojo) {
  const modifiers = { [-2]: 1.30, [-1]: 1.15, [0]: 1.00, [1]: 0.90, [2]: 0.80 };
  return modifiers[mojo];
}

// Fitness Engine Mock
const FITNESS_STATES = {
  JUICED: { value: 120, multiplier: 1.20, canPlay: true, injuryChance: 0.005 },
  FIT: { value: 100, multiplier: 1.00, canPlay: true, injuryChance: 0.01 },
  WELL: { value: 80, multiplier: 0.95, canPlay: true, injuryChance: 0.02 },
  STRAINED: { value: 60, multiplier: 0.85, canPlay: true, injuryChance: 0.05 },
  WEAK: { value: 40, multiplier: 0.70, canPlay: true, injuryChance: 0.15 },
  HURT: { value: 0, multiplier: 0.00, canPlay: false, injuryChance: 1.0 },
};

function getFitnessStateFromValue(value) {
  if (value >= 110) return 'JUICED';
  if (value >= 90) return 'FIT';
  if (value >= 70) return 'WELL';
  if (value >= 50) return 'STRAINED';
  if (value > 0) return 'WEAK';
  return 'HURT';
}

function getFitnessStatMultiplier(state) {
  return FITNESS_STATES[state].multiplier;
}

function getFitnessFameModifier(fitness) {
  const modifiers = {
    JUICED: 0.5,
    FIT: 1.0,
    WELL: 1.0,
    STRAINED: 1.15,
    WEAK: 1.25,
    HURT: 0,
  };
  return modifiers[fitness];
}

// Salary Calculator Mock
// CORRECTED per SALARY_SYSTEM_SPEC.md: Position players 3:3:2:1:1, Pitchers 1:1:1
const BATTER_RATING_WEIGHTS = {
  power: 0.30,      // 3/10 - per spec
  contact: 0.30,    // 3/10 - per spec
  speed: 0.20,      // 2/10 - per spec
  fielding: 0.10,   // 1/10 - per spec
  arm: 0.10,        // 1/10 - per spec
};

const PITCHER_RATING_WEIGHTS = {
  velocity: 1/3,    // Equal weighting per spec
  junk: 1/3,        // Equal weighting per spec
  accuracy: 1/3,    // Equal weighting per spec
};

const PERSONALITY_MODIFIERS = {
  Egotistical: 1.15,
  Competitive: 1.05,
  Tough: 1.00,
  Relaxed: 0.95,
  Jolly: 0.90,
  Timid: 0.85,
  Droopy: 1.00,
};

function calculateWeightedRating(ratings, isPitcher) {
  if (isPitcher) {
    return (
      (ratings.velocity || 0) * PITCHER_RATING_WEIGHTS.velocity +
      (ratings.junk || 0) * PITCHER_RATING_WEIGHTS.junk +
      (ratings.accuracy || 0) * PITCHER_RATING_WEIGHTS.accuracy
    );
  }
  // Use combined power/contact or average of L/R splits
  const power = ratings.power ?? ((ratings.powerL || 0) + (ratings.powerR || 0)) / 2;
  const contact = ratings.contact ?? ((ratings.contactL || 0) + (ratings.contactR || 0)) / 2;
  return (
    power * BATTER_RATING_WEIGHTS.power +
    contact * BATTER_RATING_WEIGHTS.contact +
    (ratings.speed || 0) * BATTER_RATING_WEIGHTS.speed +
    (ratings.fielding || 0) * BATTER_RATING_WEIGHTS.fielding +
    (ratings.arm || 0) * BATTER_RATING_WEIGHTS.arm
  );
}

function calculateBaseRatingSalary(ratings, isPitcher) {
  const weighted = calculateWeightedRating(ratings, isPitcher);
  const base = Math.pow(weighted / 100, 2.5) * 50;
  return Math.round(base * 10) / 10;
}

function calculateAgeFactor(age) {
  if (age <= 24) return 0.70;
  if (age <= 26) return 0.85;
  if (age <= 29) return 1.00;
  if (age <= 32) return 1.10;
  if (age <= 35) return 1.00;
  if (age <= 38) return 0.85;
  return 0.70;
}

function calculatePerformanceModifier(actualWAR, expectedWAR) {
  const delta = actualWAR - expectedWAR;
  const modifier = 1 + (delta * 0.10);
  return Math.max(0.5, Math.min(1.5, modifier));
}

function calculateFameModifier(fame) {
  const modifier = 1 + (fame * 0.03);
  return Math.max(0.7, Math.min(1.3, modifier));
}

function calculateTrueValue(salary, war) {
  const roi = salary > 0 ? war / salary : 0;
  let tier;
  if (roi >= 1.0) tier = 'ELITE_VALUE';
  else if (roi >= 0.5) tier = 'GREAT_VALUE';
  else if (roi >= 0.25) tier = 'GOOD_VALUE';
  else if (roi >= 0.15) tier = 'FAIR_VALUE';
  else if (roi >= 0.05) tier = 'POOR_VALUE';
  else tier = 'BUST';
  return { salary, war, roiWARPerMillion: roi, roiTier: tier };
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

console.log('\n=== MOJO ENGINE TESTS ===\n');

test('Mojo states: 5 levels from -2 to +2', () => {
  assert.strictEqual(Object.keys(MOJO_STATES).length, 5);
  assert.strictEqual(MOJO_STATES[-2].name, 'RATTLED');
  assert.strictEqual(MOJO_STATES[-1].name, 'TENSE');
  assert.strictEqual(MOJO_STATES[0].name, 'NORMAL');
  assert.strictEqual(MOJO_STATES[1].name, 'LOCKED_IN');
  assert.strictEqual(MOJO_STATES[2].name, 'JACKED');
});

test('Mojo stat multipliers: correct values', () => {
  assertClose(getMojoStatMultiplier(-2), 0.82, 0.001, 'Rattled');
  assertClose(getMojoStatMultiplier(-1), 0.90, 0.001, 'Tense');
  assertClose(getMojoStatMultiplier(0), 1.00, 0.001, 'Normal');
  assertClose(getMojoStatMultiplier(1), 1.10, 0.001, 'Locked In');
  assertClose(getMojoStatMultiplier(2), 1.18, 0.001, 'Jacked');
});

test('Mojo triggers: positive triggers have positive deltas', () => {
  const positiveTriggers = ['SINGLE', 'DOUBLE', 'TRIPLE', 'HOME_RUN', 'RBI', 'STOLEN_BASE'];
  for (const trigger of positiveTriggers) {
    assert(MOJO_TRIGGERS[trigger].baseDelta > 0, `${trigger} should be positive`);
  }
});

test('Mojo triggers: negative triggers have negative deltas', () => {
  const negativeTriggers = ['STRIKEOUT', 'ERROR', 'CAUGHT_STEALING', 'PITCHER_RUN'];
  for (const trigger of negativeTriggers) {
    assert(MOJO_TRIGGERS[trigger].baseDelta < 0, `${trigger} should be negative`);
  }
});

test('Mojo amplification: tie game late innings = 1.5x', () => {
  const situation = { inning: 9, scoreDiff: 0, runnersOn: [], outs: 2, isPlayoff: false };
  assertClose(calculateAmplification(situation), 1.5, 0.001, 'Late inning tie');
});

test('Mojo amplification: playoff game = 1.5x', () => {
  const situation = { inning: 1, scoreDiff: 0, runnersOn: [], outs: 0, isPlayoff: true };
  assertClose(calculateAmplification(situation), 1.5, 0.001, 'Playoff');
});

test('Mojo amplification: bases loaded = 1.4x', () => {
  const situation = { inning: 5, scoreDiff: 3, runnersOn: [1, 2, 3], outs: 1, isPlayoff: false };
  assertClose(calculateAmplification(situation), 1.4, 0.001, 'Bases loaded');
});

test('Mojo amplification: multiple factors stack', () => {
  // Playoff game, tie, 9th inning, bases loaded, 2 outs, RISP
  const situation = { inning: 9, scoreDiff: 0, runnersOn: [1, 2, 3], outs: 2, isPlayoff: true };
  // 1.5 (tie late) * 1.5 (playoff) * 1.4 (loaded) * 1.3 (RISP 2 out) = 4.095
  const amp = calculateAmplification(situation);
  assert(amp > 4.0, `Expected high amplification, got ${amp}`);
});

test('Mojo carryover: 30% rate', () => {
  assert.strictEqual(calculateStartingMojo(2), 1);   // +2 * 0.3 = 0.6 → rounds to 1
  assert.strictEqual(calculateStartingMojo(-2), -1); // -2 * 0.3 = -0.6 → rounds to -1
  assert.strictEqual(calculateStartingMojo(0), 0);   // 0 * 0.3 = 0
});

test('Mojo Fame modifier: Rattled gets 30% bonus', () => {
  assertClose(getMojoFameModifier(-2), 1.30, 0.001, 'Rattled');
});

test('Mojo Fame modifier: Jacked gets 20% penalty', () => {
  assertClose(getMojoFameModifier(2), 0.80, 0.001, 'Jacked');
});

test('Mojo clamp: stays in -2 to +2 range', () => {
  assert.strictEqual(clampMojo(5), 2);
  assert.strictEqual(clampMojo(-5), -2);
  assert.strictEqual(clampMojo(0.4), 0);
  assert.strictEqual(clampMojo(1.6), 2);
});

console.log('\n=== FITNESS ENGINE TESTS ===\n');

test('Fitness states: 6 states from HURT to JUICED', () => {
  assert.strictEqual(Object.keys(FITNESS_STATES).length, 6);
  assert(FITNESS_STATES.HURT !== undefined);
  assert(FITNESS_STATES.WEAK !== undefined);
  assert(FITNESS_STATES.STRAINED !== undefined);
  assert(FITNESS_STATES.WELL !== undefined);
  assert(FITNESS_STATES.FIT !== undefined);
  assert(FITNESS_STATES.JUICED !== undefined);
});

test('Fitness stat multipliers: correct values', () => {
  assertClose(getFitnessStatMultiplier('JUICED'), 1.20, 0.001, 'Juiced');
  assertClose(getFitnessStatMultiplier('FIT'), 1.00, 0.001, 'Fit');
  assertClose(getFitnessStatMultiplier('WELL'), 0.95, 0.001, 'Well');
  assertClose(getFitnessStatMultiplier('STRAINED'), 0.85, 0.001, 'Strained');
  assertClose(getFitnessStatMultiplier('WEAK'), 0.70, 0.001, 'Weak');
  assertClose(getFitnessStatMultiplier('HURT'), 0.00, 0.001, 'Hurt');
});

test('Fitness state from value: correct mapping', () => {
  assert.strictEqual(getFitnessStateFromValue(120), 'JUICED');
  assert.strictEqual(getFitnessStateFromValue(115), 'JUICED');
  assert.strictEqual(getFitnessStateFromValue(100), 'FIT');
  assert.strictEqual(getFitnessStateFromValue(90), 'FIT');
  assert.strictEqual(getFitnessStateFromValue(80), 'WELL');
  assert.strictEqual(getFitnessStateFromValue(70), 'WELL');
  assert.strictEqual(getFitnessStateFromValue(60), 'STRAINED');
  assert.strictEqual(getFitnessStateFromValue(50), 'STRAINED');
  assert.strictEqual(getFitnessStateFromValue(40), 'WEAK');
  assert.strictEqual(getFitnessStateFromValue(20), 'WEAK');
  assert.strictEqual(getFitnessStateFromValue(0), 'HURT');
});

test('Fitness canPlay: HURT cannot play', () => {
  assert.strictEqual(FITNESS_STATES.HURT.canPlay, false);
  assert.strictEqual(FITNESS_STATES.WEAK.canPlay, true);
  assert.strictEqual(FITNESS_STATES.FIT.canPlay, true);
});

test('Fitness injury chance: increases as fitness decreases', () => {
  assert(FITNESS_STATES.JUICED.injuryChance < FITNESS_STATES.FIT.injuryChance);
  assert(FITNESS_STATES.FIT.injuryChance < FITNESS_STATES.WELL.injuryChance);
  assert(FITNESS_STATES.WELL.injuryChance < FITNESS_STATES.STRAINED.injuryChance);
  assert(FITNESS_STATES.STRAINED.injuryChance < FITNESS_STATES.WEAK.injuryChance);
});

test('Fitness Fame modifier: Juiced gets 50% penalty', () => {
  assertClose(getFitnessFameModifier('JUICED'), 0.5, 0.001, 'Juiced');
});

test('Fitness Fame modifier: Weak gets 25% bonus (gutsy)', () => {
  assertClose(getFitnessFameModifier('WEAK'), 1.25, 0.001, 'Weak');
});

test('Fitness Fame modifier: Fit is baseline (1.0)', () => {
  assertClose(getFitnessFameModifier('FIT'), 1.0, 0.001, 'Fit');
});

console.log('\n=== SALARY CALCULATOR TESTS ===\n');

test('Weighted rating: batter weights sum to 1.0', () => {
  const sum = Object.values(BATTER_RATING_WEIGHTS).reduce((a, b) => a + b, 0);
  assertClose(sum, 1.0, 0.001, 'Batter weights');
});

test('Weighted rating: pitcher weights sum to 1.0', () => {
  const sum = Object.values(PITCHER_RATING_WEIGHTS).reduce((a, b) => a + b, 0);
  assertClose(sum, 1.0, 0.001, 'Pitcher weights');
});

test('Base salary: elite player (95 rating) ≈ $42-46M', () => {
  const ratings = {
    powerL: 95, powerR: 95,
    contactL: 95, contactR: 95,
    speed: 95, fielding: 95, arm: 95,
  };
  const salary = calculateBaseRatingSalary(ratings, false);
  assert(salary >= 40 && salary <= 50, `Expected $40-50M, got $${salary}M`);
});

test('Base salary: average player (70 rating) ≈ $20M (exponential formula)', () => {
  // Exponential formula: (rating/100)^2.5 * 50
  // 70 rating: (0.7)^2.5 * 50 ≈ $20.5M
  const ratings = {
    powerL: 70, powerR: 70,
    contactL: 70, contactR: 70,
    speed: 70, fielding: 70, arm: 70,
  };
  const salary = calculateBaseRatingSalary(ratings, false);
  assert(salary >= 18 && salary <= 23, `Expected $18-23M, got $${salary}M`);
});

test('Base salary: low player (50 rating) ≈ $8-9M (exponential formula)', () => {
  // Exponential formula: (rating/100)^2.5 * 50
  // 50 rating: (0.5)^2.5 * 50 ≈ $8.8M
  const ratings = {
    powerL: 50, powerR: 50,
    contactL: 50, contactR: 50,
    speed: 50, fielding: 50, arm: 50,
  };
  const salary = calculateBaseRatingSalary(ratings, false);
  assert(salary >= 7 && salary <= 11, `Expected $7-11M, got $${salary}M`);
});

test('Age factor: rookie (22) gets 0.70x', () => {
  assertClose(calculateAgeFactor(22), 0.70, 0.001, 'Rookie');
});

test('Age factor: prime (28) gets 1.00x', () => {
  assertClose(calculateAgeFactor(28), 1.00, 0.001, 'Prime');
});

test('Age factor: peak earning (31) gets 1.10x', () => {
  assertClose(calculateAgeFactor(31), 1.10, 0.001, 'Peak earning');
});

test('Age factor: twilight (40) gets 0.70x', () => {
  assertClose(calculateAgeFactor(40), 0.70, 0.001, 'Twilight');
});

test('Performance modifier: +2 WAR overperformance = 1.20x', () => {
  assertClose(calculatePerformanceModifier(4.0, 2.0), 1.20, 0.001, '+2 WAR');
});

test('Performance modifier: -3 WAR underperformance = 0.70x', () => {
  assertClose(calculatePerformanceModifier(1.0, 4.0), 0.70, 0.001, '-3 WAR');
});

test('Performance modifier: capped at 1.50x', () => {
  assertClose(calculatePerformanceModifier(10.0, 2.0), 1.50, 0.001, 'Max cap');
});

test('Performance modifier: capped at 0.50x', () => {
  assertClose(calculatePerformanceModifier(0.0, 6.0), 0.50, 0.001, 'Min cap');
});

test('Fame modifier: +5 Fame = 1.15x', () => {
  assertClose(calculateFameModifier(5), 1.15, 0.001, '+5 Fame');
});

test('Fame modifier: -3 Fame = 0.91x', () => {
  assertClose(calculateFameModifier(-3), 0.91, 0.001, '-3 Fame');
});

test('Fame modifier: capped at 1.30x', () => {
  assertClose(calculateFameModifier(15), 1.30, 0.001, 'Max cap');
});

test('Fame modifier: capped at 0.70x', () => {
  assertClose(calculateFameModifier(-15), 0.70, 0.001, 'Min cap');
});

test('Personality modifier: Egotistical = 1.15x', () => {
  assertClose(PERSONALITY_MODIFIERS.Egotistical, 1.15, 0.001, 'Egotistical');
});

test('Personality modifier: Timid = 0.85x', () => {
  assertClose(PERSONALITY_MODIFIERS.Timid, 0.85, 0.001, 'Timid');
});

test('True Value: high ROI = ELITE_VALUE', () => {
  const result = calculateTrueValue(2.0, 3.0);  // $2M for 3 WAR = 1.5 ROI
  assert.strictEqual(result.roiTier, 'ELITE_VALUE');
});

test('True Value: low ROI = BUST', () => {
  const result = calculateTrueValue(30.0, 0.5);  // $30M for 0.5 WAR = 0.017 ROI
  assert.strictEqual(result.roiTier, 'BUST');
});

test('True Value: medium ROI = GOOD_VALUE', () => {
  const result = calculateTrueValue(10.0, 3.0);  // $10M for 3 WAR = 0.3 ROI
  assert.strictEqual(result.roiTier, 'GOOD_VALUE');
});

console.log('\n=== INTEGRATION TESTS ===\n');

test('Combined Mojo + Fitness multiplier: Jacked + Juiced = maximum boost', () => {
  const mojoMult = getMojoStatMultiplier(2);   // 1.18
  const fitMult = getFitnessStatMultiplier('JUICED');  // 1.20
  const combined = mojoMult * fitMult;
  assertClose(combined, 1.416, 0.01, 'Combined multiplier');
});

test('Combined Mojo + Fitness multiplier: Rattled + Weak = heavy penalty', () => {
  const mojoMult = getMojoStatMultiplier(-2);   // 0.82
  const fitMult = getFitnessStatMultiplier('WEAK');  // 0.70
  const combined = mojoMult * fitMult;
  assertClose(combined, 0.574, 0.01, 'Combined multiplier');
});

test('Fame calculation: achievements while disadvantaged are rewarded', () => {
  // Rattled = +30% Fame
  // Juiced = 50% Fame (penalty)
  // So Rattled + Fit > Normal + Juiced
  const rattledFitFame = 10 * getMojoFameModifier(-2) * getFitnessFameModifier('FIT');  // 10 * 1.3 * 1.0 = 13
  const normalJuicedFame = 10 * getMojoFameModifier(0) * getFitnessFameModifier('JUICED');  // 10 * 1.0 * 0.5 = 5
  assert(rattledFitFame > normalJuicedFame, `Rattled+Fit (${rattledFitFame}) should beat Normal+Juiced (${normalJuicedFame})`);
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
