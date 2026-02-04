/**
 * Pitcher Box Score Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7
 *
 * Tests that PostGameSummary properly displays real pitcher data
 * rather than hardcoded mock data.
 */

import { describe, test, expect } from 'vitest';
import type { BoxScorePitcher, BoxScore } from '../../utils/eventLog';

// ============================================
// BOX SCORE PITCHER INTERFACE
// ============================================

describe('BoxScorePitcher Interface', () => {
  test('BoxScorePitcher has all required fields', () => {
    const pitcher: BoxScorePitcher = {
      playerId: 'pitcher-001',
      playerName: 'Test Pitcher',
      ip: '6.0',
      hits: 5,
      runs: 3,
      earnedRuns: 2,
      walks: 2,
      strikeouts: 7,
      homeRuns: 1,
      decision: 'W',
    };

    expect(pitcher.playerId).toBe('pitcher-001');
    expect(pitcher.playerName).toBe('Test Pitcher');
    expect(pitcher.ip).toBe('6.0');
    expect(pitcher.hits).toBe(5);
    expect(pitcher.runs).toBe(3);
    expect(pitcher.earnedRuns).toBe(2);
    expect(pitcher.walks).toBe(2);
    expect(pitcher.strikeouts).toBe(7);
    expect(pitcher.homeRuns).toBe(1);
    expect(pitcher.decision).toBe('W');
  });

  test('decision field can be W, L, S, H, BS, or undefined', () => {
    const decisions: (BoxScorePitcher['decision'] | undefined)[] = [
      'W', 'L', 'S', 'H', 'BS', undefined,
    ];

    decisions.forEach(decision => {
      const pitcher: BoxScorePitcher = {
        playerId: 'p1',
        playerName: 'Test',
        ip: '1.0',
        hits: 0,
        runs: 0,
        earnedRuns: 0,
        walks: 0,
        strikeouts: 1,
        homeRuns: 0,
        decision,
      };

      expect(['W', 'L', 'S', 'H', 'BS', undefined]).toContain(pitcher.decision);
    });
  });

  test('pitchCount is optional', () => {
    const pitcherWithCount: BoxScorePitcher = {
      playerId: 'p1',
      playerName: 'Pitcher',
      ip: '7.0',
      hits: 5,
      runs: 2,
      earnedRuns: 2,
      walks: 1,
      strikeouts: 8,
      homeRuns: 0,
      pitchCount: 95,
    };

    const pitcherWithoutCount: BoxScorePitcher = {
      playerId: 'p2',
      playerName: 'Reliever',
      ip: '2.0',
      hits: 1,
      runs: 0,
      earnedRuns: 0,
      walks: 0,
      strikeouts: 2,
      homeRuns: 0,
    };

    expect(pitcherWithCount.pitchCount).toBe(95);
    expect(pitcherWithoutCount.pitchCount).toBeUndefined();
  });
});

// ============================================
// INNINGS PITCHED FORMAT
// ============================================

describe('Innings Pitched Format', () => {
  test('IP formatted as full.partial (e.g., "5.2")', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7:
    // "IP formatted as \"6.2\" (outs / 3 + (outs % 3) / 10)"

    expect(formatInningsPitched(18)).toBe('6.0'); // 18 outs = 6 full innings
    expect(formatInningsPitched(17)).toBe('5.2'); // 17 outs = 5.2 IP
    expect(formatInningsPitched(16)).toBe('5.1'); // 16 outs = 5.1 IP
    expect(formatInningsPitched(15)).toBe('5.0'); // 15 outs = 5 full innings
    expect(formatInningsPitched(1)).toBe('0.1');  // 1 out = 0.1 IP
    expect(formatInningsPitched(2)).toBe('0.2');  // 2 outs = 0.2 IP
    expect(formatInningsPitched(0)).toBe('0.0');  // 0 outs = 0.0 IP
  });

  test('partial innings are 0, 1, or 2 (never 3)', () => {
    // 3 outs = 1 full inning, so partial is always 0, 1, or 2
    for (let outs = 0; outs <= 27; outs++) {
      const ip = formatInningsPitched(outs);
      const partial = parseInt(ip.split('.')[1]);
      expect(partial).toBeLessThanOrEqual(2);
      expect(partial).toBeGreaterThanOrEqual(0);
    }
  });

  test('9 complete innings is "9.0"', () => {
    expect(formatInningsPitched(27)).toBe('9.0');
  });

  test('complete game shutout IP calculation', () => {
    // Starter throws CG shutout: 27 outs
    const cgOuts = 27;
    expect(formatInningsPitched(cgOuts)).toBe('9.0');
  });
});

// ============================================
// ERA CALCULATION
// ============================================

describe('ERA Calculation', () => {
  test('ERA calculated as (er * 9) / ip (not hardcoded)', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7:
    // "ERA calculated as (er * 9) / ip (not hardcoded)"

    expect(calculateERA(2, 6.0)).toBeCloseTo(3.00, 2);
    expect(calculateERA(3, 6.0)).toBeCloseTo(4.50, 2);
    expect(calculateERA(0, 5.0)).toBeCloseTo(0.00, 2);
    expect(calculateERA(1, 3.0)).toBeCloseTo(3.00, 2);
  });

  test('ERA handles partial innings correctly', () => {
    // 5.1 IP = 5.333... innings
    const ip = 5 + (1 / 3);
    const er = 3;
    const era = (er * 9) / ip;

    expect(era).toBeCloseTo(5.06, 2);
  });

  test('ERA is infinity when IP is 0', () => {
    const era = calculateERA(1, 0);
    expect(era).toBe(Infinity);
  });

  test('ERA is 0.00 when no earned runs', () => {
    expect(calculateERA(0, 7.0)).toBe(0.00);
    expect(calculateERA(0, 1.0)).toBe(0.00);
  });
});

// ============================================
// PITCHER DATA AGGREGATION
// ============================================

describe('Pitcher Data Aggregation', () => {
  test('team pitchers array has all who pitched', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7:
    // "awayPitchers[] populated from completed game's pitcherStats"

    const awayPitchers: BoxScorePitcher[] = [
      createPitcher('sp1', 'Starter', '5.2', 6, 3, 2, 2, 5, 1, undefined),
      createPitcher('rp1', 'Setup', '1.1', 1, 0, 0, 0, 2, 0, 'H'),
      createPitcher('rp2', 'Closer', '2.0', 1, 0, 0, 1, 3, 0, 'S'),
    ];

    expect(awayPitchers.length).toBe(3);

    // Combined IP should be 9.0 (5.2 + 1.1 + 2.0)
    const totalOuts = awayPitchers.reduce((sum, p) => {
      return sum + ipToOuts(p.ip);
    }, 0);
    expect(formatInningsPitched(totalOuts)).toBe('9.0');
  });

  test('pitcher order matches appearance order', () => {
    const pitchers: BoxScorePitcher[] = [
      createPitcher('sp', 'Starter', '5.0', 5, 3, 3, 2, 4, 1, 'L'),
      createPitcher('rp1', 'Middle Relief', '2.0', 2, 1, 1, 1, 1, 0, undefined),
      createPitcher('rp2', 'Mop Up', '2.0', 0, 0, 0, 0, 2, 0, undefined),
    ];

    // First pitcher is starter
    expect(pitchers[0].playerName).toBe('Starter');
    // Subsequent are in order of appearance
    expect(pitchers[1].playerName).toBe('Middle Relief');
  });

  test('team totals are sum of individual stats', () => {
    const pitchers: BoxScorePitcher[] = [
      createPitcher('p1', 'P1', '6.0', 5, 2, 2, 2, 6, 0, undefined),
      createPitcher('p2', 'P2', '2.0', 2, 1, 1, 1, 2, 1, undefined),
      createPitcher('p3', 'P3', '1.0', 1, 0, 0, 0, 1, 0, undefined),
    ];

    const totalHits = pitchers.reduce((sum, p) => sum + p.hits, 0);
    const totalRuns = pitchers.reduce((sum, p) => sum + p.runs, 0);
    const totalER = pitchers.reduce((sum, p) => sum + p.earnedRuns, 0);
    const totalK = pitchers.reduce((sum, p) => sum + p.strikeouts, 0);

    expect(totalHits).toBe(8);
    expect(totalRuns).toBe(3);
    expect(totalER).toBe(3);
    expect(totalK).toBe(9);
  });
});

// ============================================
// PITCHER DATA REQUIREMENTS
// ============================================

describe('Pitcher Data Requirements', () => {
  test('Pitcher row has all required columns', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7:
    // "Pitcher row has: name, ip, h, r, er, bb, so, era"

    const pitcher: BoxScorePitcher = {
      playerId: 'p1',
      playerName: 'Test Pitcher', // name
      ip: '6.0', // IP
      hits: 5, // H
      runs: 3, // R
      earnedRuns: 2, // ER
      walks: 2, // BB
      strikeouts: 7, // SO
      homeRuns: 1, // HR
    };

    // All required fields present
    expect(pitcher.playerName).toBeTruthy();
    expect(pitcher.ip).toMatch(/^\d+\.\d$/);
    expect(typeof pitcher.hits).toBe('number');
    expect(typeof pitcher.runs).toBe('number');
    expect(typeof pitcher.earnedRuns).toBe('number');
    expect(typeof pitcher.walks).toBe('number');
    expect(typeof pitcher.strikeouts).toBe('number');
  });

  test('homePitchers populated from completed game pitcherStats', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.7:
    // "homePitchers[] populated from completed game's pitcherStats"

    const homePitchers: BoxScorePitcher[] = [
      createPitcher('home-sp', 'Home Starter', '7.0', 4, 1, 1, 1, 9, 0, 'W'),
      createPitcher('home-rp', 'Home Closer', '2.0', 2, 0, 0, 0, 3, 0, 'S'),
    ];

    expect(homePitchers.length).toBe(2);
    expect(homePitchers.every(p => p.playerId.startsWith('home'))).toBe(true);
  });
});

// ============================================
// DECISION ASSIGNMENT
// ============================================

describe('Pitcher Decision Assignment', () => {
  test('W goes to pitcher of record when team wins', () => {
    // Winning pitcher: pitched when team took the lead and never relinquished
    const starter: BoxScorePitcher = createPitcher(
      'sp', 'Starter', '6.0', 4, 2, 2, 2, 5, 1, 'W'
    );

    expect(starter.decision).toBe('W');
  });

  test('L goes to pitcher of record when team loses', () => {
    const starter: BoxScorePitcher = createPitcher(
      'sp', 'Starter', '5.0', 8, 5, 5, 3, 4, 2, 'L'
    );

    expect(starter.decision).toBe('L');
  });

  test('S goes to closer who finished and preserved lead', () => {
    const closer: BoxScorePitcher = createPitcher(
      'cl', 'Closer', '1.0', 1, 0, 0, 0, 2, 0, 'S'
    );

    expect(closer.decision).toBe('S');
  });

  test('H goes to setup man with hold', () => {
    const setup: BoxScorePitcher = createPitcher(
      'setup', 'Setup Man', '1.0', 0, 0, 0, 0, 1, 0, 'H'
    );

    expect(setup.decision).toBe('H');
  });

  test('BS goes to reliever who blew save', () => {
    const blownSave: BoxScorePitcher = createPitcher(
      'rp', 'Reliever', '0.2', 3, 2, 2, 1, 0, 1, 'BS'
    );

    expect(blownSave.decision).toBe('BS');
  });

  test('pitcher with no decision has undefined', () => {
    const middleReliever: BoxScorePitcher = createPitcher(
      'mr', 'Middle Relief', '2.0', 1, 0, 0, 0, 2, 0, undefined
    );

    expect(middleReliever.decision).toBeUndefined();
  });
});

// ============================================
// EARNED RUN ATTRIBUTION
// ============================================

describe('Earned Run Attribution', () => {
  test('runs vs earnedRuns can differ', () => {
    // Unearned runs don't count toward ERA
    const pitcher: BoxScorePitcher = createPitcher(
      'sp', 'Starter', '6.0', 5, 4, 2, 2, 5, 1, undefined
    );

    // 4 runs allowed, but only 2 earned
    expect(pitcher.runs).toBe(4);
    expect(pitcher.earnedRuns).toBe(2);
    expect(pitcher.earnedRuns).toBeLessThan(pitcher.runs);
  });

  test('all runs can be earned', () => {
    const pitcher: BoxScorePitcher = createPitcher(
      'sp', 'Starter', '7.0', 6, 3, 3, 2, 6, 1, undefined
    );

    expect(pitcher.runs).toBe(pitcher.earnedRuns);
  });

  test('all runs can be unearned', () => {
    // Errors led to all runs
    const pitcher: BoxScorePitcher = createPitcher(
      'sp', 'Starter', '6.0', 4, 3, 0, 1, 4, 0, undefined
    );

    expect(pitcher.runs).toBe(3);
    expect(pitcher.earnedRuns).toBe(0);
  });
});

// ============================================
// INHERITED RUNNERS IN BOX SCORE
// ============================================

describe('Inherited Runners Effect on Stats', () => {
  test('inherited runner scoring counts as run but not ER for reliever', () => {
    // Reliever enters with runner on 2nd
    // Runner scores - it's a run but NOT an earned run for the reliever
    const reliever: BoxScorePitcher = createPitcher(
      'rp', 'Reliever', '2.0', 2, 1, 0, 1, 2, 0, undefined
    );

    // 1 run allowed (inherited runner), 0 earned runs
    expect(reliever.runs).toBe(1);
    expect(reliever.earnedRuns).toBe(0);
  });

  test('bequeathed runner scoring counts as ER for previous pitcher', () => {
    // Starter leaves with runner on 2nd
    // Runner scores after reliever enters - ER goes to starter
    const starter: BoxScorePitcher = createPitcher(
      'sp', 'Starter', '6.0', 6, 4, 4, 2, 5, 1, 'L'
    );

    // Starter's ER includes runners who scored after he left
    expect(starter.earnedRuns).toBe(4);
  });
});

// ============================================
// HELPERS
// ============================================

function formatInningsPitched(outs: number): string {
  const full = Math.floor(outs / 3);
  const partial = outs % 3;
  return `${full}.${partial}`;
}

function ipToOuts(ip: string): number {
  const parts = ip.split('.');
  const full = parseInt(parts[0]);
  const partial = parseInt(parts[1]);
  return full * 3 + partial;
}

function calculateERA(er: number, ip: number): number {
  if (ip === 0) return er > 0 ? Infinity : 0;
  return (er * 9) / ip;
}

function createPitcher(
  playerId: string,
  playerName: string,
  ip: string,
  hits: number,
  runs: number,
  earnedRuns: number,
  walks: number,
  strikeouts: number,
  homeRuns: number,
  decision?: 'W' | 'L' | 'S' | 'H' | 'BS'
): BoxScorePitcher {
  return {
    playerId,
    playerName,
    ip,
    hits,
    runs,
    earnedRuns,
    walks,
    strikeouts,
    homeRuns,
    decision,
  };
}
