/**
 * Runner Movement & Force Play Tests
 *
 * Phase 1.1 of Testing Implementation Plan
 *
 * Tests the runnerDefaults.ts engine which calculates where runners
 * should move based on play type and game situation.
 *
 * Core baseball principles tested:
 * - Force play logic (runners must advance when forced)
 * - Hit advancement patterns (single, double, triple, HR)
 * - Out scenarios (ground out, fly out, DP, FC)
 * - Walk/HBP force advancement
 * - Tag-up rules on fly balls
 * - D3K runner movement
 */

import { describe, test, expect } from 'vitest';
import {
  calculateRunnerDefaults,
  calculateWalkDefaults,
  calculateFieldersChoiceDefaults,
  calculateD3KDefaults,
  calculateStolenBaseDefaults,
  type GameBases,
  type RunnerDefaults,
} from '../../app/components/runnerDefaults';
import type { PlayData } from '../../app/components/EnhancedInteractiveField';

// ============================================
// HELPER FUNCTIONS
// ============================================

function createPlayData(overrides: Partial<PlayData>): PlayData {
  return {
    type: 'out',
    hitType: undefined,
    outType: 'GO',
    fieldingSequence: [],
    ...overrides,
  } as PlayData;
}

// ============================================
// HIT DEFAULTS TESTS
// ============================================

describe('Hit Defaults - Single (1B)', () => {
  const singlePlay = createPlayData({ type: 'hit', hitType: '1B' });

  test('bases empty - batter to first', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(singlePlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.batter.reason).toContain('Single');
  });

  test('R1 - R1 to 2B, batter to 1B', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(singlePlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
  });

  test('R2 - R2 to 3B, batter to 1B', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateRunnerDefaults(singlePlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.second?.to).toBe('third');
  });

  test('R3 - R3 scores, batter to 1B', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(singlePlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.third?.to).toBe('home');
  });

  test('R1+R2 - R1 to 2B, R2 to 3B, batter to 1B', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateRunnerDefaults(singlePlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
    expect(result.second?.to).toBe('third');
  });

  test('R1+R3 - R3 scores, R1 to 2B, batter to 1B', () => {
    const bases: GameBases = { first: true, second: false, third: true };
    const result = calculateRunnerDefaults(singlePlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
    expect(result.third?.to).toBe('home');
  });

  test('bases loaded - R3 scores, R2 to 3B, R1 to 2B, batter to 1B', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(singlePlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
    expect(result.second?.to).toBe('third');
    expect(result.third?.to).toBe('home');
  });
});

describe('Hit Defaults - Double (2B)', () => {
  const doublePlay = createPlayData({ type: 'hit', hitType: '2B' });

  test('bases empty - batter to second', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(doublePlay, bases, 0);

    expect(result.batter.to).toBe('second');
    expect(result.batter.reason).toContain('Double');
  });

  test('R1 - R1 to 3B, batter to 2B', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(doublePlay, bases, 0);

    expect(result.batter.to).toBe('second');
    expect(result.first?.to).toBe('third');
  });

  test('R2 - R2 scores, batter to 2B', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateRunnerDefaults(doublePlay, bases, 0);

    expect(result.batter.to).toBe('second');
    expect(result.second?.to).toBe('home');
  });

  test('R3 - R3 scores, batter to 2B', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(doublePlay, bases, 0);

    expect(result.batter.to).toBe('second');
    expect(result.third?.to).toBe('home');
  });

  test('R1+R2 - R2 scores, R1 to 3B, batter to 2B', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateRunnerDefaults(doublePlay, bases, 0);

    expect(result.batter.to).toBe('second');
    expect(result.first?.to).toBe('third');
    expect(result.second?.to).toBe('home');
  });

  test('bases loaded - R3 and R2 score, R1 to 3B, batter to 2B', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(doublePlay, bases, 0);

    expect(result.batter.to).toBe('second');
    expect(result.first?.to).toBe('third');
    expect(result.second?.to).toBe('home');
    expect(result.third?.to).toBe('home');
  });
});

describe('Hit Defaults - Triple (3B)', () => {
  const triplePlay = createPlayData({ type: 'hit', hitType: '3B' });

  test('bases empty - batter to third', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(triplePlay, bases, 0);

    expect(result.batter.to).toBe('third');
    expect(result.batter.reason).toContain('Triple');
  });

  test('R1 - R1 scores, batter to 3B', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(triplePlay, bases, 0);

    expect(result.batter.to).toBe('third');
    expect(result.first?.to).toBe('home');
  });

  test('R2 - R2 scores, batter to 3B', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateRunnerDefaults(triplePlay, bases, 0);

    expect(result.batter.to).toBe('third');
    expect(result.second?.to).toBe('home');
  });

  test('R3 - R3 scores, batter to 3B', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(triplePlay, bases, 0);

    expect(result.batter.to).toBe('third');
    expect(result.third?.to).toBe('home');
  });

  test('bases loaded - all runners score, batter to 3B', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(triplePlay, bases, 0);

    expect(result.batter.to).toBe('third');
    expect(result.first?.to).toBe('home');
    expect(result.second?.to).toBe('home');
    expect(result.third?.to).toBe('home');
  });
});

// ============================================
// HOME RUN DEFAULTS TESTS
// ============================================

describe('Home Run Defaults', () => {
  const hrPlay = createPlayData({ type: 'hr' });

  test('bases empty - solo HR, batter scores', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(hrPlay, bases, 0);

    expect(result.batter.to).toBe('home');
    expect(result.batter.reason).toContain('Home Run');
    // HR outcomes are NOT adjustable
    expect(result.batter.isDefault).toBe(false);
  });

  test('R1 - 2-run HR, both score', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(hrPlay, bases, 0);

    expect(result.batter.to).toBe('home');
    expect(result.first?.to).toBe('home');
    expect(result.first?.isDefault).toBe(false); // Not adjustable
  });

  test('R2 - 2-run HR, both score', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateRunnerDefaults(hrPlay, bases, 0);

    expect(result.batter.to).toBe('home');
    expect(result.second?.to).toBe('home');
  });

  test('R3 - 2-run HR, both score', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(hrPlay, bases, 0);

    expect(result.batter.to).toBe('home');
    expect(result.third?.to).toBe('home');
  });

  test('bases loaded - grand slam, all 4 score', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(hrPlay, bases, 0);

    expect(result.batter.to).toBe('home');
    expect(result.first?.to).toBe('home');
    expect(result.second?.to).toBe('home');
    expect(result.third?.to).toBe('home');
  });

  test('HR outcomes not adjustable (isDefault = false)', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(hrPlay, bases, 0);

    expect(result.batter.isDefault).toBe(false);
    expect(result.first?.isDefault).toBe(false);
    expect(result.second?.isDefault).toBe(false);
    expect(result.third?.isDefault).toBe(false);
  });
});

// ============================================
// OUT DEFAULTS - GROUND OUT
// ============================================

describe('Out Defaults - Ground Out (GO)', () => {
  const goPlay = createPlayData({ type: 'out', outType: 'GO', fieldingSequence: [6, 3] });

  test('bases empty - batter out', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(goPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.batter.reason).toContain('Ground out');
  });

  test('R1 only, 0 outs - R1 advances (no force), batter out', () => {
    // No DP because only 2 fielders in sequence
    const singleOut = createPlayData({ type: 'out', outType: 'GO', fieldingSequence: [3] });
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(singleOut, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('second');
  });

  test('R2 - R2 advances to 3B on GO', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateRunnerDefaults(goPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.second?.to).toBe('third');
  });

  test('R3, 0 outs - R3 scores on GO (productive out)', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(goPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.third?.to).toBe('home');
  });

  test('R3, 2 outs - R3 holds (run does not count if 3rd out on batter)', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(goPlay, bases, 2);

    expect(result.batter.to).toBe('out');
    expect(result.third?.to).toBe('third');
  });
});

// ============================================
// OUT DEFAULTS - DOUBLE PLAY
// ============================================

describe('Out Defaults - Double Play (DP)', () => {
  test('R1, 0 outs, 6-4-3 - DP detected, R1 and batter out', () => {
    const dpPlay = createPlayData({ type: 'out', outType: 'GO', fieldingSequence: [6, 4, 3] });
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(dpPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('out');
    expect(result.batter.reason).toContain('DP');
  });

  test('R1+R3, 0 outs - DP, R3 scores (run counts if before 3rd out)', () => {
    const dpPlay = createPlayData({ type: 'out', outType: 'GO', fieldingSequence: [6, 4, 3] });
    const bases: GameBases = { first: true, second: false, third: true };
    const result = calculateRunnerDefaults(dpPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('out');
    expect(result.third?.to).toBe('home');
  });

  test('R1+R2, 0 outs - DP, R2 advances to 3B', () => {
    const dpPlay = createPlayData({ type: 'out', outType: 'GO', fieldingSequence: [6, 4, 3] });
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateRunnerDefaults(dpPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('out');
    expect(result.second?.to).toBe('third');
  });

  test('explicit DP outType triggers DP logic', () => {
    const dpPlay = createPlayData({ type: 'out', outType: 'DP', fieldingSequence: [6, 4, 3] });
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(dpPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('out');
  });

  test('DP not triggered with 2 outs - R1 advances instead', () => {
    const goPlay = createPlayData({ type: 'out', outType: 'GO', fieldingSequence: [6, 4, 3] });
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(goPlay, bases, 2);

    // With 2 outs, the code doesn't trigger DP (outs < 2 check)
    // Batter is out, R1 advances to 2B (no force since batter out at 1B)
    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('second');
  });
});

// ============================================
// OUT DEFAULTS - TRIPLE PLAY
// ============================================

describe('Out Defaults - Triple Play (TP)', () => {
  test('bases loaded, 0 outs - TP gets all runners and batter', () => {
    const tpPlay = createPlayData({ type: 'out', outType: 'TP', fieldingSequence: [5, 4, 3] });
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateRunnerDefaults(tpPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.batter.reason).toContain('Triple play');
    expect(result.first?.to).toBe('out');
    expect(result.second?.to).toBe('out');
  });
});

// ============================================
// OUT DEFAULTS - FIELDER'S CHOICE
// ============================================

describe('Out Defaults - Fielders Choice (FC)', () => {
  test('R1 with single fielder - batter safe, R1 out', () => {
    // Use single fielder to avoid DP detection
    const fcPlay = createPlayData({ type: 'out', outType: 'FC', fieldingSequence: [4] });
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(fcPlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('out');
  });

  test('R2 only - batter safe, R2 out', () => {
    const fcPlay = createPlayData({ type: 'out', outType: 'FC', fieldingSequence: [5] });
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateRunnerDefaults(fcPlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.second?.to).toBe('out');
  });

  test('R1+R2 with 2+ fielders triggers DP detection over FC', () => {
    // With R1 on, 0 outs, and 2+ fielders, code detects DP over FC
    const fcPlay = createPlayData({ type: 'out', outType: 'FC', fieldingSequence: [6, 4] });
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateRunnerDefaults(fcPlay, bases, 0);

    // DP logic takes precedence: batter out, R1 out, R2 advances
    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('out');
    expect(result.second?.to).toBe('third');
  });

  test('R1+R3 with 2+ fielders triggers DP detection', () => {
    // With R1 on, 0 outs, and 2+ fielders, code detects DP
    const fcPlay = createPlayData({ type: 'out', outType: 'FC', fieldingSequence: [6, 4] });
    const bases: GameBases = { first: true, second: false, third: true };
    const result = calculateRunnerDefaults(fcPlay, bases, 0);

    // DP logic: batter out, R1 out, R3 scores
    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('out');
    expect(result.third?.to).toBe('home');
  });
});

// ============================================
// OUT DEFAULTS - FLY OUT / LINE OUT (TAG UP)
// ============================================

describe('Out Defaults - Fly Out (FO) - Tag Up Rules', () => {
  const foPlay = createPlayData({ type: 'out', outType: 'FO', fieldingSequence: [8] });

  test('R3, 0 outs - R3 tags and scores on fly out', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(foPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.third?.to).toBe('home');
    expect(result.third?.reason).toContain('Tags');
  });

  test('R3, 2 outs - R3 holds (cannot tag with 2 outs, 3rd out ends inning)', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(foPlay, bases, 2);

    expect(result.batter.to).toBe('out');
    expect(result.third?.to).toBe('third');
  });

  test('R2, 0 outs - R2 tags to 3B on deep fly', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateRunnerDefaults(foPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.second?.to).toBe('third');
  });

  test('R2, 2 outs - R2 holds', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateRunnerDefaults(foPlay, bases, 2);

    expect(result.batter.to).toBe('out');
    expect(result.second?.to).toBe('second');
  });

  test('R1 - R1 holds on fly out (rarely advances)', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(foPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('first');
  });
});

describe('Out Defaults - Line Out (LO)', () => {
  const loPlay = createPlayData({ type: 'out', outType: 'LO', fieldingSequence: [4] });

  test('R3, 0 outs - R3 holds on line out (shallow)', () => {
    // Line outs are typically too quick for tagging
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(loPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.third?.to).toBe('third');
  });

  test('R2 - R2 holds on line out', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateRunnerDefaults(loPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.second?.to).toBe('second');
  });
});

// ============================================
// OUT DEFAULTS - STRIKEOUT
// ============================================

describe('Out Defaults - Strikeout (K)', () => {
  const kPlay = createPlayData({ type: 'out', outType: 'K', fieldingSequence: [] });

  test('bases empty - batter out, strikeout', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(kPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.batter.reason).toContain('Strikeout');
    // Strikeout not adjustable
    expect(result.batter.isDefault).toBe(false);
  });

  test('runners on base - all hold on K', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(kPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('first');
    expect(result.second?.to).toBe('second');
    expect(result.third?.to).toBe('third');
  });
});

// ============================================
// ERROR DEFAULTS
// ============================================

describe('Error Defaults', () => {
  const errorPlay = createPlayData({ type: 'error' });

  test('bases empty - batter reaches on error', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(errorPlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.batter.reason).toContain('error');
  });

  test('R1 - R1 to 2B, batter to 1B', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(errorPlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
  });

  test('R3 - R3 scores on error', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateRunnerDefaults(errorPlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.third?.to).toBe('home');
  });

  test('bases loaded - R3 scores, others advance, batter to 1B', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(errorPlay, bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
    expect(result.second?.to).toBe('third');
    expect(result.third?.to).toBe('home');
  });
});

// ============================================
// FOUL OUT DEFAULTS
// ============================================

describe('Foul Out Defaults', () => {
  const foulOutPlay = createPlayData({ type: 'foul_out' });

  test('bases empty - batter out', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(foulOutPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.batter.reason).toContain('Foul out');
  });

  test('runners on base - all hold on foul out', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(foulOutPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('first');
    expect(result.second?.to).toBe('second');
    expect(result.third?.to).toBe('third');
  });
});

// ============================================
// WALK DEFAULTS - FORCE PLAY TESTS
// ============================================

describe('Walk Defaults - Force Play Logic', () => {
  test('bases empty - batter to 1B only', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.to).toBe('first');
    expect(result.first).toBeUndefined();
    expect(result.second).toBeUndefined();
    expect(result.third).toBeUndefined();
  });

  test('R1 - R1 forced to 2B, batter to 1B', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
    expect(result.first?.reason).toContain('Forced');
  });

  test('R2 only (no R1) - R2 NOT forced, stays at 2B', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.to).toBe('first');
    expect(result.second?.to).toBe('second');
    expect(result.second?.reason).toContain('Not forced');
  });

  test('R3 only - R3 NOT forced, stays at 3B', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.to).toBe('first');
    expect(result.third?.to).toBe('third');
    expect(result.third?.reason).toContain('Not forced');
  });

  test('R1+R2 - R1 to 2B, R2 forced to 3B', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
    expect(result.second?.to).toBe('third');
    expect(result.second?.reason).toContain('Forced');
  });

  test('R1+R3 - R1 to 2B, R3 NOT forced (no R2)', () => {
    const bases: GameBases = { first: true, second: false, third: true };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
    expect(result.third?.to).toBe('third');
    expect(result.third?.reason).toContain('Not forced');
  });

  test('R2+R3 (no R1) - R2 NOT forced, R3 NOT forced', () => {
    const bases: GameBases = { first: false, second: true, third: true };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.to).toBe('first');
    expect(result.second?.to).toBe('second');
    expect(result.third?.to).toBe('third');
  });

  test('bases loaded - all runners forced, R3 scores', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
    expect(result.second?.to).toBe('third');
    expect(result.third?.to).toBe('home');
    expect(result.third?.reason).toContain('Forced');
  });

  test('walk outcomes are NOT adjustable', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.isDefault).toBe(false);
    expect(result.first?.isDefault).toBe(false);
    expect(result.second?.isDefault).toBe(false);
    expect(result.third?.isDefault).toBe(false);
  });
});

// ============================================
// FIELDER'S CHOICE DEFAULTS (SPECIFIC RUNNER OUT)
// ============================================

describe('Fielders Choice Defaults - Specific Runner Out', () => {
  test('R1 out - batter safe, R1 out', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateFieldersChoiceDefaults(bases, 'first');

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('out');
    expect(result.first?.isDefault).toBe(false); // Not adjustable
  });

  test('R1+R2, R1 out - R2 advances', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateFieldersChoiceDefaults(bases, 'first');

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('out');
    expect(result.second?.to).toBe('third');
  });

  test('R1+R2, R2 out - R1 advances', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateFieldersChoiceDefaults(bases, 'second');

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('second');
    expect(result.second?.to).toBe('out');
  });

  test('R1+R3, R1 out - R3 scores', () => {
    const bases: GameBases = { first: true, second: false, third: true };
    const result = calculateFieldersChoiceDefaults(bases, 'first');

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('out');
    expect(result.third?.to).toBe('home');
  });

  test('R3 out at home - batter safe', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateFieldersChoiceDefaults(bases, 'third');

    expect(result.batter.to).toBe('first');
    expect(result.third?.to).toBe('out');
  });
});

// ============================================
// D3K DEFAULTS
// ============================================

describe('D3K Defaults', () => {
  test('bases empty, 0 outs - D3K legal, batter reaches', () => {
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateD3KDefaults(bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.batter.reason).toContain('D3K');
  });

  test('R1 on base, 0 outs - D3K NOT legal, batter out', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateD3KDefaults(bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.batter.reason).toContain('not legal');
  });

  test('R1 on base, 2 outs - D3K IS legal, batter reaches', () => {
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateD3KDefaults(bases, 2);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('out'); // R1 forced out
  });

  test('R2 only, 0 outs - D3K legal (no R1)', () => {
    const bases: GameBases = { first: false, second: true, third: false };
    const result = calculateD3KDefaults(bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.second?.to).toBe('third');
  });

  test('R3 only - D3K legal, R3 may score', () => {
    const bases: GameBases = { first: false, second: false, third: true };
    const result = calculateD3KDefaults(bases, 0);

    expect(result.batter.to).toBe('first');
    expect(result.third?.to).toBe('home');
  });

  test('R1+R2, 1 out - D3K NOT legal', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateD3KDefaults(bases, 1);

    expect(result.batter.to).toBe('out');
  });

  test('R1+R2, 2 outs - D3K IS legal', () => {
    const bases: GameBases = { first: true, second: true, third: false };
    const result = calculateD3KDefaults(bases, 2);

    expect(result.batter.to).toBe('first');
    expect(result.first?.to).toBe('out'); // Force out
    expect(result.second?.to).toBe('third');
  });
});

// ============================================
// EDGE CASES AND SPECIAL SCENARIOS
// ============================================

describe('Edge Cases', () => {
  test('default play type returns standard out pattern', () => {
    const unknownPlay = createPlayData({ type: 'unknown' as PlayData['type'] });
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(unknownPlay, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('first');
    expect(result.second?.to).toBe('second');
    expect(result.third?.to).toBe('third');
  });

  test('foul ball same as foul out', () => {
    const foulBall = createPlayData({ type: 'foul_ball' as PlayData['type'] });
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(foulBall, bases, 0);

    expect(result.batter.to).toBe('out');
    expect(result.first?.to).toBe('first');
  });

  test('all runner outcomes include from field', () => {
    const hitPlay = createPlayData({ type: 'hit', hitType: '1B' });
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(hitPlay, bases, 0);

    expect(result.batter.from).toBe('batter');
    expect(result.first?.from).toBe('first');
    expect(result.second?.from).toBe('second');
    expect(result.third?.from).toBe('third');
  });

  test('empty bases returns only batter outcome', () => {
    const hitPlay = createPlayData({ type: 'hit', hitType: '1B' });
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(hitPlay, bases, 0);

    expect(result.batter).toBeDefined();
    expect(result.first).toBeUndefined();
    expect(result.second).toBeUndefined();
    expect(result.third).toBeUndefined();
  });
});

// ============================================
// RUNNER PRESERVATION TESTS
// ============================================

describe('Runner Preservation', () => {
  test('single with runners - all accounted for', () => {
    const singlePlay = createPlayData({ type: 'hit', hitType: '1B' });
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(singlePlay, bases, 0);

    // All 4 people accounted for (batter + 3 runners)
    expect(result.batter).toBeDefined();
    expect(result.first).toBeDefined();
    expect(result.second).toBeDefined();
    expect(result.third).toBeDefined();
  });

  test('DP with runners - all accounted for', () => {
    const dpPlay = createPlayData({ type: 'out', outType: 'DP', fieldingSequence: [6, 4, 3] });
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateRunnerDefaults(dpPlay, bases, 0);

    expect(result.batter).toBeDefined();
    expect(result.first).toBeDefined();
    expect(result.second).toBeDefined();
    expect(result.third).toBeDefined();
  });

  test('walk with bases loaded - all runners move correctly', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateWalkDefaults(bases);

    // Count outcomes
    let toFirst = 0, toSecond = 0, toThird = 0, toHome = 0;

    if (result.batter.to === 'first') toFirst++;
    if (result.first?.to === 'second') toSecond++;
    if (result.second?.to === 'third') toThird++;
    if (result.third?.to === 'home') toHome++;

    // Exactly one person at each destination
    expect(toFirst).toBe(1);
    expect(toSecond).toBe(1);
    expect(toThird).toBe(1);
    expect(toHome).toBe(1);
  });
});

// ============================================
// isDefault FLAG TESTS
// ============================================

describe('isDefault Flag Semantics', () => {
  test('hits are adjustable (isDefault = true)', () => {
    const singlePlay = createPlayData({ type: 'hit', hitType: '1B' });
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(singlePlay, bases, 0);

    expect(result.batter.isDefault).toBe(true);
    expect(result.first?.isDefault).toBe(true);
  });

  test('home runs NOT adjustable (isDefault = false)', () => {
    const hrPlay = createPlayData({ type: 'hr' });
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(hrPlay, bases, 0);

    expect(result.batter.isDefault).toBe(false);
    expect(result.first?.isDefault).toBe(false);
  });

  test('walks NOT adjustable (isDefault = false)', () => {
    const bases: GameBases = { first: true, second: true, third: true };
    const result = calculateWalkDefaults(bases);

    expect(result.batter.isDefault).toBe(false);
    expect(result.first?.isDefault).toBe(false);
    expect(result.second?.isDefault).toBe(false);
    expect(result.third?.isDefault).toBe(false);
  });

  test('strikeouts NOT adjustable (isDefault = false)', () => {
    const kPlay = createPlayData({ type: 'out', outType: 'K', fieldingSequence: [] });
    const bases: GameBases = { first: false, second: false, third: false };
    const result = calculateRunnerDefaults(kPlay, bases, 0);

    expect(result.batter.isDefault).toBe(false);
  });

  test('ground outs ARE adjustable', () => {
    const goPlay = createPlayData({ type: 'out', outType: 'GO', fieldingSequence: [6, 3] });
    const bases: GameBases = { first: true, second: false, third: false };
    const result = calculateRunnerDefaults(goPlay, bases, 0);

    expect(result.first?.isDefault).toBe(true);
  });
});
