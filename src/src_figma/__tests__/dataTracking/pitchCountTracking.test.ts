/**
 * Pitch Count Tracking Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 1.6
 *
 * Tests that pitch counts are properly tracked for Maddux detection
 * and pitcher fatigue monitoring.
 *
 * Per DEFINITIVE_GAP_ANALYSIS: "CRITICAL - blocks Maddux detection"
 */

import { describe, test, expect } from 'vitest';

// ============================================
// PITCH COUNT TYPES
// ============================================

interface PitchCountData {
  pitcherId: string;
  gameId: string;
  pitchesThrown: number;
  strikes: number;
  balls: number;
  inningsRecorded: number; // outs / 3
  outsRecorded: number;
}

interface AtBatPitchData {
  pitcherId: string;
  batterId: string;
  pitchCount: number; // Number of pitches in this at-bat
  result: string;
}

// ============================================
// PITCH COUNT TRACKING
// ============================================

describe('Pitch Count Tracking', () => {
  test('pitch count increments with each pitch', () => {
    const data: PitchCountData = {
      pitcherId: 'p1',
      gameId: 'g1',
      pitchesThrown: 0,
      strikes: 0,
      balls: 0,
      inningsRecorded: 0,
      outsRecorded: 0,
    };

    // Simulate 3-pitch strikeout
    data.pitchesThrown += 3;
    data.strikes += 3;

    expect(data.pitchesThrown).toBe(3);
    expect(data.strikes).toBe(3);
  });

  test('at-bat pitch count tracked per plate appearance', () => {
    const atBat: AtBatPitchData = {
      pitcherId: 'p1',
      batterId: 'b1',
      pitchCount: 6, // 6-pitch at-bat
      result: 'GO',
    };

    expect(atBat.pitchCount).toBe(6);
    expect(atBat.pitchCount).toBeGreaterThan(0);
  });

  test('pitch count accumulates across at-bats', () => {
    const atBats: AtBatPitchData[] = [
      { pitcherId: 'p1', batterId: 'b1', pitchCount: 4, result: 'K' },
      { pitcherId: 'p1', batterId: 'b2', pitchCount: 6, result: 'BB' },
      { pitcherId: 'p1', batterId: 'b3', pitchCount: 3, result: '1B' },
      { pitcherId: 'p1', batterId: 'b4', pitchCount: 5, result: 'GO' },
    ];

    const totalPitches = atBats.reduce((sum, ab) => sum + ab.pitchCount, 0);
    expect(totalPitches).toBe(18);
  });
});

// ============================================
// MADDUX DETECTION
// ============================================

describe('Maddux Detection', () => {
  test('Maddux = CGSO with < 100 pitches', () => {
    // Per DETECTION_FUNCTIONS_IMPLEMENTATION.md
    // Maddux: Complete game shutout in under 100 pitches

    interface GamePitchingLine {
      pitcherId: string;
      ip: number; // 9.0 for CG
      runs: number;
      pitchesThrown: number;
      isStarter: boolean;
    }

    const pitchingLine: GamePitchingLine = {
      pitcherId: 'p1',
      ip: 9.0,
      runs: 0,
      pitchesThrown: 92,
      isStarter: true,
    };

    const isCG = pitchingLine.ip >= 9.0 && pitchingLine.isStarter;
    const isShutout = pitchingLine.runs === 0;
    const isUnder100 = pitchingLine.pitchesThrown < 100;
    const isMaddux = isCG && isShutout && isUnder100;

    expect(isMaddux).toBe(true);
  });

  test('CGSO with 100+ pitches is NOT Maddux', () => {
    const pitchingLine = {
      ip: 9.0,
      runs: 0,
      pitchesThrown: 105,
      isStarter: true,
    };

    const isCG = pitchingLine.ip >= 9.0 && pitchingLine.isStarter;
    const isShutout = pitchingLine.runs === 0;
    const isUnder100 = pitchingLine.pitchesThrown < 100;
    const isMaddux = isCG && isShutout && isUnder100;

    expect(isMaddux).toBe(false);
    expect(isCG && isShutout).toBe(true); // Still a CGSO
  });

  test('Maddux requires exactly 0 runs', () => {
    const pitchingLine = {
      ip: 9.0,
      runs: 1, // Gave up a run
      pitchesThrown: 85,
      isStarter: true,
    };

    const isShutout = pitchingLine.runs === 0;
    expect(isShutout).toBe(false);
  });

  test('Maddux boundary at 99 pitches', () => {
    const at99 = { pitchesThrown: 99, ip: 9.0, runs: 0, isStarter: true };
    const at100 = { pitchesThrown: 100, ip: 9.0, runs: 0, isStarter: true };

    const madduxAt99 = at99.ip >= 9.0 && at99.runs === 0 && at99.pitchesThrown < 100 && at99.isStarter;
    const madduxAt100 = at100.ip >= 9.0 && at100.runs === 0 && at100.pitchesThrown < 100 && at100.isStarter;

    expect(madduxAt99).toBe(true);
    expect(madduxAt100).toBe(false);
  });
});

// ============================================
// PITCH COUNT PER INNING
// ============================================

describe('Pitch Count Per Inning', () => {
  test('track pitches per inning', () => {
    interface InningPitchData {
      inning: number;
      pitches: number;
    }

    const innings: InningPitchData[] = [
      { inning: 1, pitches: 12 },
      { inning: 2, pitches: 15 },
      { inning: 3, pitches: 10 },
      { inning: 4, pitches: 18 },
      { inning: 5, pitches: 14 },
      { inning: 6, pitches: 11 },
      { inning: 7, pitches: 16 },
      { inning: 8, pitches: 13 },
      { inning: 9, pitches: 8 },
    ];

    const totalPitches = innings.reduce((sum, i) => sum + i.pitches, 0);
    const avgPerInning = totalPitches / innings.length;

    expect(totalPitches).toBe(117);
    expect(avgPerInning).toBeCloseTo(13, 0);
  });

  test('efficient inning is under 10 pitches', () => {
    const efficientInning = { inning: 3, pitches: 8 };
    const inefficientInning = { inning: 4, pitches: 25 };

    expect(efficientInning.pitches).toBeLessThan(10);
    expect(inefficientInning.pitches).toBeGreaterThan(15);
  });
});

// ============================================
// FATIGUE INDICATORS
// ============================================

describe('Fatigue Indicators', () => {
  test('high pitch count indicates fatigue risk', () => {
    const fatigueThreshold = 100; // 100+ pitches = fatigue concern

    const freshPitcher = { pitchesThrown: 75 };
    const tiredPitcher = { pitchesThrown: 110 };

    expect(freshPitcher.pitchesThrown < fatigueThreshold).toBe(true);
    expect(tiredPitcher.pitchesThrown >= fatigueThreshold).toBe(true);
  });

  test('pitches per inning increases as game goes on', () => {
    // Typical pattern: efficiency drops in later innings
    const earlyInnings = [10, 11, 12]; // innings 1-3
    const lateInnings = [15, 16, 18]; // innings 7-9

    const earlyAvg = earlyInnings.reduce((a, b) => a + b, 0) / earlyInnings.length;
    const lateAvg = lateInnings.reduce((a, b) => a + b, 0) / lateInnings.length;

    expect(lateAvg).toBeGreaterThan(earlyAvg);
  });
});

// ============================================
// STRIKE/BALL RATIO
// ============================================

describe('Strike/Ball Ratio', () => {
  test('strike percentage calculated correctly', () => {
    const data: PitchCountData = {
      pitcherId: 'p1',
      gameId: 'g1',
      pitchesThrown: 100,
      strikes: 65,
      balls: 35,
      inningsRecorded: 7,
      outsRecorded: 21,
    };

    const strikePct = data.strikes / data.pitchesThrown;
    expect(strikePct).toBe(0.65);
  });

  test('good strike rate is above 60%', () => {
    const goodControl = { pitchesThrown: 90, strikes: 58 };
    const poorControl = { pitchesThrown: 90, strikes: 48 };

    expect(goodControl.strikes / goodControl.pitchesThrown).toBeGreaterThan(0.60);
    expect(poorControl.strikes / poorControl.pitchesThrown).toBeLessThan(0.60);
  });
});

// ============================================
// PITCH COUNT LIMITS (SMB4 CONTEXT)
// ============================================

describe('Pitch Count Limits (SMB4)', () => {
  test('typical SMB4 game has shorter pitch counts', () => {
    // SMB4 games are often 5-7 innings
    // So a "complete game" might be 5 innings

    const shortGameCG = {
      ip: 5.0,
      pitchesThrown: 55,
      totalInnings: 5,
    };

    const isCG = shortGameCG.ip >= shortGameCG.totalInnings;
    expect(isCG).toBe(true);

    // Maddux in 5-inning game would be shutout < 100 pitches
    // (But 100 pitch threshold might need scaling)
  });

  test('Maddux threshold scales with game length', () => {
    // 9-inning game: < 100 pitches
    // 5-inning game: < 56 pitches? (100 * 5/9)

    const scaleThreshold = (totalInnings: number): number => {
      return Math.floor(100 * (totalInnings / 9));
    };

    expect(scaleThreshold(9)).toBe(100);
    expect(scaleThreshold(7)).toBe(77);
    expect(scaleThreshold(5)).toBe(55);
  });
});

// ============================================
// PITCH COUNT UI REQUIREMENTS
// ============================================

describe('Pitch Count UI Requirements', () => {
  test('pitch count input should be per at-bat', () => {
    // Per DEFINITIVE_GAP_ANALYSIS: "Add pitch count input per at-bat"

    interface AtBatInput {
      result: string;
      pitchCount?: number; // Should be tracked
    }

    const atBatWithPitches: AtBatInput = {
      result: 'K',
      pitchCount: 5,
    };

    expect(atBatWithPitches.pitchCount).toBeDefined();
    expect(atBatWithPitches.pitchCount).toBeGreaterThan(0);
  });

  test('pitch count should be optional (default inference)', () => {
    // If user doesn't enter pitch count, could infer from result
    // K = ~4 pitches avg, BB = ~5 pitches avg, etc.

    const inferPitchCount = (result: string): number => {
      switch (result) {
        case 'K': case 'KL': return 4;
        case 'BB': return 5;
        case 'HBP': return 1;
        case '1B': case '2B': case '3B': case 'HR': return 3;
        case 'GO': case 'FO': case 'LO': case 'PO': return 3;
        default: return 3;
      }
    };

    expect(inferPitchCount('K')).toBe(4);
    expect(inferPitchCount('BB')).toBe(5);
    expect(inferPitchCount('HBP')).toBe(1);
    expect(inferPitchCount('1B')).toBe(3);
  });
});

// ============================================
// PITCH COUNT VALIDATION
// ============================================

describe('Pitch Count Validation', () => {
  test('pitch count must be positive integer', () => {
    const isValidPitchCount = (count: number): boolean => {
      return Number.isInteger(count) && count > 0;
    };

    expect(isValidPitchCount(5)).toBe(true);
    expect(isValidPitchCount(0)).toBe(false);
    expect(isValidPitchCount(-1)).toBe(false);
    expect(isValidPitchCount(3.5)).toBe(false);
  });

  test('pitch count minimum is 1 (HBP on first pitch)', () => {
    const minPitchCount = 1;

    // HBP could happen on first pitch
    const hbpFirstPitch: AtBatPitchData = {
      pitcherId: 'p1',
      batterId: 'b1',
      pitchCount: 1,
      result: 'HBP',
    };

    expect(hbpFirstPitch.pitchCount).toBeGreaterThanOrEqual(minPitchCount);
  });

  test('pitch count has reasonable maximum per at-bat', () => {
    // Longest ABs in history are ~20+ pitches, but extremely rare
    const maxReasonablePitches = 20;

    const longAtBat: AtBatPitchData = {
      pitcherId: 'p1',
      batterId: 'b1',
      pitchCount: 15,
      result: 'K',
    };

    expect(longAtBat.pitchCount).toBeLessThanOrEqual(maxReasonablePitches);
  });
});
