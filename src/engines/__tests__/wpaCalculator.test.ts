/**
 * WPA Calculator Tests
 *
 * Sanity checks for win expectancy table and WPA calculations.
 * Verifies directional correctness and boundary conditions.
 */

import { describe, test, expect } from 'vitest';
import { getHalfInningStartWE, getWinExpectancy, lookupWinExpectancy, buildWEGameState } from '../winExpectancyTable';
import { calculateWPA, calculateHitWPA, calculateOutWPA, calculateWalkWPA, formatWPA, formatWP } from '../wpaCalculator';
import { BaseState } from '../leverageCalculator';

// ============================================
// WIN EXPECTANCY TABLE SANITY
// ============================================

describe('Win Expectancy Table', () => {
  test('tied game at start should match Savant neutral baseline', () => {
    const we = getWinExpectancy({
      inning: 1,
      isTop: true,
      outs: 0,
      baseState: BaseState.EMPTY,
      homeScore: 0,
      awayScore: 0,
    });
    expect(we).toBeCloseTo(0.50, 3);
  });

  test('leading team should have higher WE than trailing team', () => {
    const weLeading = getWinExpectancy({
      inning: 5,
      isTop: true,
      outs: 0,
      baseState: BaseState.EMPTY,
      homeScore: 5,
      awayScore: 2,
    });
    const weTrailing = getWinExpectancy({
      inning: 5,
      isTop: true,
      outs: 0,
      baseState: BaseState.EMPTY,
      homeScore: 2,
      awayScore: 5,
    });
    expect(weLeading).toBeGreaterThan(weTrailing);
  });

  test('non-terminal WE should stay bounded short of certainty', () => {
    // Extreme blowout scenarios
    const weBlowout = getWinExpectancy({
      inning: 9,
      isTop: true,
      outs: 2,
      baseState: BaseState.EMPTY,
      homeScore: 15,
      awayScore: 0,
    });
    expect(weBlowout).toBeLessThan(1);
    expect(weBlowout).toBeGreaterThanOrEqual(0.001);

    const weDeficit = getWinExpectancy({
      inning: 9,
      isTop: true,
      outs: 2,
      baseState: BaseState.EMPTY,
      homeScore: 0,
      awayScore: 15,
    });
    expect(weDeficit).toBeLessThanOrEqual(0.999);
    expect(weDeficit).toBeGreaterThan(0);
  });

  test('more outs should reduce WE for batting team', () => {
    // Home batting (bottom), bases loaded, behind by 1
    const we0outs = lookupWinExpectancy(
      7, false, 0,
      { first: true, second: true, third: true },
      4, 5
    );
    const we2outs = lookupWinExpectancy(
      7, false, 2,
      { first: true, second: true, third: true },
      4, 5
    );
    // 0 outs should give home team better chance than 2 outs (batting team gets more chances)
    expect(we0outs).toBeGreaterThan(we2outs);
  });

  test('runners on base should help the batting team', () => {
    // Home batting (bottom), tied game
    const weEmpty = lookupWinExpectancy(
      7, false, 1,
      { first: false, second: false, third: false },
      5, 5
    );
    const weLoaded = lookupWinExpectancy(
      7, false, 1,
      { first: true, second: true, third: true },
      5, 5
    );
    // Bases loaded should give home (batting) team better WE than bases empty
    expect(weLoaded).toBeGreaterThan(weEmpty);
  });

  test('run differential should have bigger effect late in game', () => {
    // +2 differential in inning 2 vs inning 8
    const weEarly = getWinExpectancy({
      inning: 2, isTop: true, outs: 0,
      baseState: BaseState.EMPTY, homeScore: 4, awayScore: 2,
    });
    const weLate = getWinExpectancy({
      inning: 8, isTop: true, outs: 0,
      baseState: BaseState.EMPTY, homeScore: 4, awayScore: 2,
    });
    // Up 2 in 8th should be worth more than up 2 in 2nd
    expect(weLate).toBeGreaterThan(weEarly);
  });

  test('walk-off state returns 1.0', () => {
    const we = getWinExpectancy({
      inning: 9,
      isTop: false,
      outs: 1,
      baseState: BaseState.EMPTY,
      homeScore: 6,
      awayScore: 5,
    });
    // Bottom 9, home leads — this is a walk-off situation (game over)
    expect(we).toBe(1.0);
  });

  test('variable game length normalization', () => {
    // Final inning of 5-inning game should behave like 9th of 9-inning game
    const we5inn = getWinExpectancy({
      inning: 5, isTop: true, outs: 0,
      baseState: BaseState.EMPTY, homeScore: 3, awayScore: 3,
      totalInnings: 5,
    });
    const we9inn = getWinExpectancy({
      inning: 9, isTop: true, outs: 0,
      baseState: BaseState.EMPTY, homeScore: 3, awayScore: 3,
      totalInnings: 9,
    });
    // Both should be close to 0.50 (tied), but we want to verify normalization works
    expect(Math.abs(we5inn - we9inn)).toBeLessThan(0.05);
  });

  test('lookupWinExpectancy convenience function matches getWinExpectancy', () => {
    const we1 = getWinExpectancy({
      inning: 5, isTop: true, outs: 1,
      baseState: BaseState.FIRST_SECOND,
      homeScore: 3, awayScore: 4,
    });
    const we2 = lookupWinExpectancy(
      5, true, 1,
      { first: true, second: true, third: false },
      3, 4
    );
    expect(we1).toBe(we2);
  });

  test('lookupWinExpectancy accepts extra-inning runner policy options', () => {
    const noRunner = lookupWinExpectancy(
      10,
      true,
      0,
      { first: false, second: false, third: false },
      5,
      5,
      { totalInnings: 9, extraInningRunner: false },
    );
    const automaticRunner = lookupWinExpectancy(
      10,
      true,
      0,
      { first: false, second: false, third: false },
      5,
      5,
      { totalInnings: 9, extraInningRunner: true, extraInningRunnerDelay: 1 },
    );

    expect(noRunner).toBeCloseTo(0.5, 3);
    expect(automaticRunner).toBeCloseTo(0.667, 3);
  });

  test('lookupWinExpectancy lets useGhostRunner override base-placement policy for Savant mapping', () => {
    const noGhostRunnerVariant = lookupWinExpectancy(
      10,
      true,
      0,
      { first: false, second: false, third: false },
      5,
      5,
      {
        totalInnings: 9,
        useGhostRunner: false,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      },
    );
    const ghostRunnerVariant = lookupWinExpectancy(
      10,
      true,
      0,
      { first: false, second: false, third: false },
      5,
      5,
      {
        totalInnings: 9,
        useGhostRunner: true,
        extraInningRunner: false,
        extraInningRunnerDelay: 1,
      },
    );

    expect(noGhostRunnerVariant).toBeCloseTo(0.5, 3);
    expect(ghostRunnerVariant).toBeCloseTo(0.667, 3);
  });

  test('getHalfInningStartWE starts active automatic-runner extras on second base', () => {
    const topExtraWithRunner = getHalfInningStartWE(10, true, 5, 5, {
      totalInnings: 9,
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
    });
    const topExtraDelayed = getHalfInningStartWE(10, true, 5, 5, {
      totalInnings: 9,
      extraInningRunner: true,
      extraInningRunnerDelay: 2,
    });
    const bottomExtraWithRunner = getHalfInningStartWE(10, false, 5, 5, {
      totalInnings: 9,
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
    });

    expect(topExtraWithRunner).toBeCloseTo(0.5, 3);
    expect(topExtraDelayed).toBeCloseTo(0.5, 3);
    expect(bottomExtraWithRunner).toBeCloseTo(0.805, 3);
  });
});

// ============================================
// WPA CALCULATION
// ============================================

describe('WPA Calculator', () => {
  test('single scores positive WPA for batting team (home)', () => {
    // Home batting, tie game, runner on 2nd scores on single
    const result = calculateWPA(
      {
        inning: 7, isTop: false, outs: 1,
        bases: { first: false, second: true, third: false },
        homeScore: 3, awayScore: 3,
      },
      {
        outs: 1,
        bases: { first: true, second: false, third: false },
        homeScore: 4, awayScore: 3,
      }
    );

    expect(result.wpa).toBeGreaterThan(0);
    expect(result.winProbabilityAfter).toBeGreaterThan(result.winProbabilityBefore);
  });

  test('out scores negative WPA for batting team', () => {
    // Away batting (top), trailing by 1, makes an out
    const result = calculateWPA(
      {
        inning: 8, isTop: true, outs: 1,
        bases: { first: true, second: false, third: false },
        homeScore: 5, awayScore: 4,
      },
      {
        outs: 2,
        bases: { first: true, second: false, third: false },
        homeScore: 5, awayScore: 4,
      }
    );

    // Away batting, made an out — WPA should be negative for batter (away)
    expect(result.wpa).toBeLessThan(0);
    // Home WP should increase (good for home = bad for away batter)
    expect(result.winProbabilityAfter).toBeGreaterThan(result.winProbabilityBefore);
  });

  test('calculateOutWPA can carry automatic-runner policy through inning-ending outs', () => {
    const result = calculateOutWPA(
      9,
      false,
      2,
      3,
      { first: false, second: false, third: false },
      { first: false, second: false, third: false },
      5,
      5,
      0,
      9,
      { extraInningRunner: true, extraInningRunnerDelay: 1 },
    );

    expect(result.winProbabilityAfter).toBeCloseTo(0.5, 3);
    expect(result.wpa).toBeLessThan(0);
  });

  test('walk-off home run gives large positive WPA', () => {
    const result = calculateWPA(
      {
        inning: 9, isTop: false, outs: 2,
        bases: { first: false, second: false, third: false },
        homeScore: 4, awayScore: 4,
      },
      {
        outs: 2,
        bases: { first: false, second: false, third: false },
        homeScore: 5, awayScore: 4,
      }
    );

    // Walk-off = WP goes to 1.0
    expect(result.winProbabilityAfter).toBe(1.0);
    expect(result.wpa).toBeGreaterThan(0.3);
  });

  test('3rd out ends inning, transitions correctly', () => {
    // Top of 5th, 2 outs → 3 outs = inning over → bottom of 5th starts
    const result = calculateWPA(
      {
        inning: 5, isTop: true, outs: 2,
        bases: { first: true, second: false, third: false },
        homeScore: 3, awayScore: 3,
      },
      {
        outs: 3,
        bases: { first: false, second: false, third: false },
        homeScore: 3, awayScore: 3,
      }
    );

    // After away team makes 3rd out, WP "after" should reflect bottom of 5th
    // Home now bats → home WP should be >= 0.50 (tied, home batting)
    expect(result.winProbabilityAfter).toBeGreaterThanOrEqual(0.50);
    // Away batter made the 3rd out, WPA negative for batter
    expect(result.wpa).toBeLessThan(0);
  });

  test('WPA is from batting team perspective (away batter positive on hit)', () => {
    // Away batting (top), hits a single and drives in run
    const result = calculateWPA(
      {
        inning: 3, isTop: true, outs: 0,
        bases: { first: false, second: true, third: false },
        homeScore: 2, awayScore: 2,
      },
      {
        outs: 0,
        bases: { first: true, second: false, third: false },
        homeScore: 2, awayScore: 3,
      }
    );

    // Away scored, so home WP went down — but WPA is from batter's (away's) perspective
    expect(result.wpa).toBeGreaterThan(0);
    // Home WP should have decreased
    expect(result.winProbabilityAfter).toBeLessThan(result.winProbabilityBefore);
  });

  test('game-ending 3rd out in bottom 9 (away wins)', () => {
    // Bottom 9, home trails, makes 3rd out → game over, away wins
    const result = calculateWPA(
      {
        inning: 9, isTop: false, outs: 2,
        bases: { first: false, second: false, third: false },
        homeScore: 3, awayScore: 5,
      },
      {
        outs: 3,
        bases: { first: false, second: false, third: false },
        homeScore: 3, awayScore: 5,
      }
    );

    // Home loses → WP after = 0.0
    expect(result.winProbabilityAfter).toBe(0.0);
    // Home batter made the final out — negative WPA for batter
    expect(result.wpa).toBeLessThan(0);
  });

  test('game-ending 3rd out top 9 (home wins)', () => {
    // Top 9, home leads, away makes 3rd out → game over, home wins
    const result = calculateWPA(
      {
        inning: 9, isTop: true, outs: 2,
        bases: { first: false, second: false, third: false },
        homeScore: 5, awayScore: 3,
      },
      {
        outs: 3,
        bases: { first: false, second: false, third: false },
        homeScore: 5, awayScore: 3,
      }
    );

    // Home wins → WP after = 1.0
    expect(result.winProbabilityAfter).toBe(1.0);
    // Away batter made the final out — negative WPA for batter (away)
    expect(result.wpa).toBeLessThan(0);
  });
});

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

describe('WPA Convenience Functions', () => {
  test('calculateHitWPA returns positive WPA for beneficial hit', () => {
    const result = calculateHitWPA(
      5, false, 1,  // inning 5, bottom, 1 out
      { first: false, second: true, third: false },  // runner on 2nd
      { first: true, second: false, third: false },   // runner scored, batter on 1st
      3, 3,  // tied
      1      // 1 run scored
    );
    expect(result.wpa).toBeGreaterThan(0);
  });

  test('calculateHitWPA carries automatic-runner policy options', () => {
    const result = calculateHitWPA(
      10,
      true,
      0,
      { first: false, second: true, third: false },
      { first: true, second: false, third: false },
      5,
      5,
      1,
      9,
      { extraInningRunner: true, extraInningRunnerDelay: 1 },
    );

    expect(result.winExpectancyTraceBefore?.rowKey).toBe(
      '10|Top|0|2|batDiff=0',
    );
    expect(result.wpa).toBeGreaterThan(0);
  });

  test('calculateOutWPA returns negative WPA for batter', () => {
    const result = calculateOutWPA(
      5, true, 1, 2,  // inning 5, top, 1→2 outs
      { first: true, second: false, third: false },
      { first: true, second: false, third: false },
      3, 3,  // tied
      0      // no runs scored
    );
    expect(result.wpa).toBeLessThan(0);
  });

  test('calculateWalkWPA with bases loaded scores a run', () => {
    const result = calculateWalkWPA(
      7, false, 1,  // inning 7, bottom, 1 out
      { first: true, second: true, third: true },   // bases loaded
      { first: true, second: true, third: true },   // still loaded
      4, 5,  // home trailing by 1
      1      // 1 run scores (ties game)
    );
    expect(result.wpa).toBeGreaterThan(0);
  });

  test('calculateWalkWPA carries automatic-runner policy options', () => {
    const result = calculateWalkWPA(
      10,
      true,
      0,
      { first: true, second: true, third: true },
      { first: true, second: true, third: true },
      5,
      5,
      1,
      9,
      { extraInningRunner: true, extraInningRunnerDelay: 1 },
    );

    expect(result.winExpectancyTraceBefore?.rowKey).toBe(
      '10|Top|0|7|batDiff=0',
    );
    expect(result.winExpectancyTraceAfter?.rowKey).toBe(
      '10|Top|0|7|batDiff=1',
    );
    expect(result.wpa).toBeGreaterThan(0);
  });
});

// ============================================
// FORMATTING
// ============================================

describe('WPA Formatting', () => {
  test('formatWPA positive', () => {
    expect(formatWPA(0.073)).toBe('+0.073');
  });

  test('formatWPA negative', () => {
    expect(formatWPA(-0.041)).toBe('-0.041');
  });

  test('formatWPA zero', () => {
    expect(formatWPA(0)).toBe('+0.000');
  });

  test('formatWP percentage', () => {
    expect(formatWP(0.653)).toBe('65.3%');
  });

  test('formatWP with precision', () => {
    expect(formatWP(0.8723, 2)).toBe('87.23%');
  });
});

// ============================================
// SYMMETRY / CONSISTENCY CHECKS
// ============================================

describe('WPA Consistency', () => {
  test('WPA magnitude larger in high-leverage vs low-leverage', () => {
    // Same play (out), but different leverage context
    const lowLev = calculateWPA(
      {
        inning: 2, isTop: true, outs: 0,
        bases: { first: false, second: false, third: false },
        homeScore: 0, awayScore: 5,  // blowout
      },
      {
        outs: 1,
        bases: { first: false, second: false, third: false },
        homeScore: 0, awayScore: 5,
      }
    );

    const highLev = calculateWPA(
      {
        inning: 9, isTop: false, outs: 1,
        bases: { first: true, second: true, third: false },
        homeScore: 4, awayScore: 5,  // close game, late
      },
      {
        outs: 2,
        bases: { first: true, second: true, third: false },
        homeScore: 4, awayScore: 5,
      }
    );

    // High leverage out should have larger magnitude WPA
    expect(Math.abs(highLev.wpa)).toBeGreaterThan(Math.abs(lowLev.wpa));
  });

  test('scoring a run always improves batting team WPA', () => {
    // Test across multiple situations
    const situations = [
      { inning: 1, isTop: true, homeScore: 0, awayScore: 0 },
      { inning: 5, isTop: false, homeScore: 3, awayScore: 3 },
      { inning: 9, isTop: true, homeScore: 2, awayScore: 4 },
      { inning: 7, isTop: false, homeScore: 1, awayScore: 3 },
    ];

    for (const sit of situations) {
      const result = calculateWPA(
        {
          inning: sit.inning,
          isTop: sit.isTop,
          outs: 1,
          bases: { first: false, second: false, third: true },
          homeScore: sit.homeScore,
          awayScore: sit.awayScore,
        },
        {
          outs: 1,
          bases: { first: false, second: false, third: false },
          homeScore: sit.isTop ? sit.homeScore : sit.homeScore + 1,
          awayScore: sit.isTop ? sit.awayScore + 1 : sit.awayScore,
        }
      );
      expect(result.wpa).toBeGreaterThan(0);
    }
  });
});
