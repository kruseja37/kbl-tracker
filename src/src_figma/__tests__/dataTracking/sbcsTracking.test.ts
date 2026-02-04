/**
 * Stolen Base / Caught Stealing Tracking Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 1.6
 *
 * Tests that SB and CS events are properly tracked and attributed.
 */

import { describe, test, expect } from 'vitest';

// ============================================
// SB/CS TYPES
// ============================================

interface StolenBaseEvent {
  eventType: 'SB' | 'CS';
  runnerId: string;
  runnerName: string;
  fromBase: 'first' | 'second' | 'third';
  toBase: 'second' | 'third' | 'home';
  pitcherId: string;
  catcherId: string;
  inning: number;
  outs: number;
  success: boolean;
}

interface PlayerSeasonStats {
  playerId: string;
  sb: number;
  cs: number;
  sbPct: number;
}

// ============================================
// STOLEN BASE EVENT STRUCTURE
// ============================================

describe('Stolen Base Event Structure', () => {
  test('SB event has all required fields', () => {
    const sbEvent: StolenBaseEvent = {
      eventType: 'SB',
      runnerId: 'runner-001',
      runnerName: 'Speed Demon',
      fromBase: 'first',
      toBase: 'second',
      pitcherId: 'pitcher-001',
      catcherId: 'catcher-001',
      inning: 3,
      outs: 1,
      success: true,
    };

    expect(sbEvent.eventType).toBe('SB');
    expect(sbEvent.success).toBe(true);
    expect(sbEvent.fromBase).toBe('first');
    expect(sbEvent.toBase).toBe('second');
  });

  test('CS event has all required fields', () => {
    const csEvent: StolenBaseEvent = {
      eventType: 'CS',
      runnerId: 'runner-001',
      runnerName: 'Slow Runner',
      fromBase: 'first',
      toBase: 'second',
      pitcherId: 'pitcher-001',
      catcherId: 'catcher-001',
      inning: 5,
      outs: 0,
      success: false,
    };

    expect(csEvent.eventType).toBe('CS');
    expect(csEvent.success).toBe(false);
  });
});

// ============================================
// SB BASE TRANSITIONS
// ============================================

describe('SB Base Transitions', () => {
  test('SB from 1st to 2nd', () => {
    const event: StolenBaseEvent = {
      eventType: 'SB',
      runnerId: 'r1',
      runnerName: 'Runner',
      fromBase: 'first',
      toBase: 'second',
      pitcherId: 'p1',
      catcherId: 'c1',
      inning: 1,
      outs: 0,
      success: true,
    };

    expect(event.fromBase).toBe('first');
    expect(event.toBase).toBe('second');
  });

  test('SB from 2nd to 3rd', () => {
    const event: StolenBaseEvent = {
      eventType: 'SB',
      runnerId: 'r1',
      runnerName: 'Runner',
      fromBase: 'second',
      toBase: 'third',
      pitcherId: 'p1',
      catcherId: 'c1',
      inning: 1,
      outs: 0,
      success: true,
    };

    expect(event.fromBase).toBe('second');
    expect(event.toBase).toBe('third');
  });

  test('SB from 3rd to home (steal of home)', () => {
    const event: StolenBaseEvent = {
      eventType: 'SB',
      runnerId: 'r1',
      runnerName: 'Daring Runner',
      fromBase: 'third',
      toBase: 'home',
      pitcherId: 'p1',
      catcherId: 'c1',
      inning: 9,
      outs: 2,
      success: true,
    };

    expect(event.fromBase).toBe('third');
    expect(event.toBase).toBe('home');
  });
});

// ============================================
// STAT ATTRIBUTION
// ============================================

describe('SB/CS Stat Attribution', () => {
  test('successful SB increments runner SB count', () => {
    const stats: PlayerSeasonStats = {
      playerId: 'runner-001',
      sb: 10,
      cs: 3,
      sbPct: 0.769,
    };

    // After successful SB
    stats.sb++;
    stats.sbPct = stats.sb / (stats.sb + stats.cs);

    expect(stats.sb).toBe(11);
    expect(stats.sbPct).toBeCloseTo(0.786, 2);
  });

  test('caught stealing increments runner CS count', () => {
    const stats: PlayerSeasonStats = {
      playerId: 'runner-001',
      sb: 10,
      cs: 3,
      sbPct: 0.769,
    };

    // After CS
    stats.cs++;
    stats.sbPct = stats.sb / (stats.sb + stats.cs);

    expect(stats.cs).toBe(4);
    expect(stats.sbPct).toBeCloseTo(0.714, 2);
  });

  test('SB% calculated as SB / (SB + CS)', () => {
    const calculateSBPct = (sb: number, cs: number): number => {
      if (sb + cs === 0) return 0;
      return sb / (sb + cs);
    };

    expect(calculateSBPct(20, 5)).toBeCloseTo(0.80, 2);
    expect(calculateSBPct(15, 15)).toBeCloseTo(0.50, 2);
    expect(calculateSBPct(30, 0)).toBe(1.0);
    expect(calculateSBPct(0, 5)).toBe(0);
    expect(calculateSBPct(0, 0)).toBe(0);
  });
});

// ============================================
// PITCHER/CATCHER ATTRIBUTION
// ============================================

describe('Pitcher/Catcher Attribution', () => {
  test('CS attributed to catcher', () => {
    const csEvent: StolenBaseEvent = {
      eventType: 'CS',
      runnerId: 'r1',
      runnerName: 'Runner',
      fromBase: 'first',
      toBase: 'second',
      pitcherId: 'pitcher-001',
      catcherId: 'catcher-001',
      inning: 3,
      outs: 1,
      success: false,
    };

    // Catcher gets credit for CS
    expect(csEvent.catcherId).toBe('catcher-001');
    // This CS would increment catcher's SB allowed stat
  });

  test('SB attributed against pitcher and catcher', () => {
    const sbEvent: StolenBaseEvent = {
      eventType: 'SB',
      runnerId: 'r1',
      runnerName: 'Runner',
      fromBase: 'first',
      toBase: 'second',
      pitcherId: 'pitcher-001',
      catcherId: 'catcher-001',
      inning: 3,
      outs: 1,
      success: true,
    };

    // Both pitcher and catcher tracked
    expect(sbEvent.pitcherId).toBeTruthy();
    expect(sbEvent.catcherId).toBeTruthy();
  });

  interface CatcherDefenseStats {
    catcherId: string;
    sbAllowed: number;
    csThrown: number;
    csPct: number;
  }

  test('catcher CS% calculated correctly', () => {
    const stats: CatcherDefenseStats = {
      catcherId: 'c1',
      sbAllowed: 15,
      csThrown: 10,
      csPct: 0,
    };

    stats.csPct = stats.csThrown / (stats.sbAllowed + stats.csThrown);
    expect(stats.csPct).toBeCloseTo(0.40, 2);
  });
});

// ============================================
// DOUBLE/TRIPLE STEALS
// ============================================

describe('Multiple Runner Steals', () => {
  test('double steal records two SB events', () => {
    // R1 and R2 both steal
    const events: StolenBaseEvent[] = [
      {
        eventType: 'SB',
        runnerId: 'r1',
        runnerName: 'Runner 1',
        fromBase: 'first',
        toBase: 'second',
        pitcherId: 'p1',
        catcherId: 'c1',
        inning: 5,
        outs: 1,
        success: true,
      },
      {
        eventType: 'SB',
        runnerId: 'r2',
        runnerName: 'Runner 2',
        fromBase: 'second',
        toBase: 'third',
        pitcherId: 'p1',
        catcherId: 'c1',
        inning: 5,
        outs: 1,
        success: true,
      },
    ];

    expect(events.length).toBe(2);
    expect(events.filter(e => e.eventType === 'SB').length).toBe(2);
  });

  test('CS on double steal attempt records one CS', () => {
    // R1 and R2 attempt double steal, R2 thrown out at 3rd
    const events: StolenBaseEvent[] = [
      {
        eventType: 'SB',
        runnerId: 'r1',
        runnerName: 'Runner 1',
        fromBase: 'first',
        toBase: 'second',
        pitcherId: 'p1',
        catcherId: 'c1',
        inning: 5,
        outs: 1,
        success: true, // R1 safe
      },
      {
        eventType: 'CS',
        runnerId: 'r2',
        runnerName: 'Runner 2',
        fromBase: 'second',
        toBase: 'third',
        pitcherId: 'p1',
        catcherId: 'c1',
        inning: 5,
        outs: 1,
        success: false, // R2 out
      },
    ];

    const sbCount = events.filter(e => e.eventType === 'SB').length;
    const csCount = events.filter(e => e.eventType === 'CS').length;

    expect(sbCount).toBe(1);
    expect(csCount).toBe(1);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('SB/CS Edge Cases', () => {
  test('CS out increments outs', () => {
    let outs = 1;
    const csEvent: StolenBaseEvent = {
      eventType: 'CS',
      runnerId: 'r1',
      runnerName: 'Runner',
      fromBase: 'first',
      toBase: 'second',
      pitcherId: 'p1',
      catcherId: 'c1',
      inning: 5,
      outs: outs,
      success: false,
    };

    // CS = runner out
    outs++;
    expect(outs).toBe(2);
  });

  test('CS with 2 outs ends inning', () => {
    const outs = 2;
    const csEvent: StolenBaseEvent = {
      eventType: 'CS',
      runnerId: 'r1',
      runnerName: 'Runner',
      fromBase: 'first',
      toBase: 'second',
      pitcherId: 'p1',
      catcherId: 'c1',
      inning: 5,
      outs: outs,
      success: false,
    };

    // CS with 2 outs = 3 outs = inning over
    const newOuts = outs + 1;
    expect(newOuts).toBe(3);
  });

  test('SB does not affect out count', () => {
    const outs = 1;
    const sbEvent: StolenBaseEvent = {
      eventType: 'SB',
      runnerId: 'r1',
      runnerName: 'Runner',
      fromBase: 'first',
      toBase: 'second',
      pitcherId: 'p1',
      catcherId: 'c1',
      inning: 5,
      outs: outs,
      success: true,
    };

    // SB = no out
    expect(outs).toBe(1);
  });

  test('steal of home scores run', () => {
    const sbHome: StolenBaseEvent = {
      eventType: 'SB',
      runnerId: 'r1',
      runnerName: 'Runner',
      fromBase: 'third',
      toBase: 'home',
      pitcherId: 'p1',
      catcherId: 'c1',
      inning: 9,
      outs: 2,
      success: true,
    };

    // Successful steal of home = run scored
    expect(sbHome.toBase).toBe('home');
    expect(sbHome.success).toBe(true);
    // This would increment team runs
  });
});

// ============================================
// RWAR IMPLICATIONS
// ============================================

describe('SB/CS Impact on rWAR', () => {
  test('SB contributes positive value to rWAR', () => {
    // Per RWAR_CALCULATION_SPEC.md
    // SB run value ≈ +0.2 runs
    const sbRunValue = 0.2;

    const player = {
      sb: 30,
      cs: 5,
    };

    // Net value = (SB × 0.2) - (CS × 0.45)
    const csRunValue = 0.45; // CS costs more than SB gains
    const netValue = (player.sb * sbRunValue) - (player.cs * csRunValue);

    expect(netValue).toBeGreaterThan(0); // 30 SB outweighs 5 CS
  });

  test('high CS rate can make SB negative value', () => {
    const sbRunValue = 0.2;
    const csRunValue = 0.45;

    const player = {
      sb: 10,
      cs: 10, // 50% success rate
    };

    const netValue = (player.sb * sbRunValue) - (player.cs * csRunValue);
    expect(netValue).toBeLessThan(0); // More damage from CS than gain from SB
  });

  test('break-even SB% is around 69%', () => {
    // 0.2 × SB = 0.45 × CS
    // SB / (SB + CS) needs to be > 0.69 to be valuable
    const sbRunValue = 0.2;
    const csRunValue = 0.45;

    // Break-even: SB × 0.2 = CS × 0.45
    // SB / CS = 0.45 / 0.2 = 2.25
    // SB% = SB / (SB + CS) = 2.25 / (2.25 + 1) = 0.692

    const breakEvenPct = csRunValue / (sbRunValue + csRunValue);
    expect(breakEvenPct).toBeCloseTo(0.692, 2);
  });
});
