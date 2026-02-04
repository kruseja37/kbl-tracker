/**
 * D3K Tracker Engine Tests
 *
 * Tests for src/src_figma/app/engines/d3kTracker.ts
 *
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 1.2:
 * - D3K Legality Tests
 * - D3K Outcome Tests
 * - D3K Stats Attribution
 * - Stats Aggregation
 */

import { describe, test, expect } from 'vitest';
import {
  isD3KLegal,
  checkD3KLegality,
  createD3KEvent,
  aggregateBatterD3KStats,
  aggregateCatcherD3KStats,
  getD3KDisplayMessage,
  getD3KIcon,
  shouldTriggerD3KFlow,
  getD3KOptions,
  type D3KOutcome,
  type D3KEvent,
} from '../../app/engines/d3kTracker';

// ============================================
// D3K LEGALITY TESTS
// ============================================

describe('D3K Legality (isD3KLegal)', () => {
  describe('D3K legal scenarios', () => {
    test('first base empty, 0 outs - LEGAL', () => {
      expect(isD3KLegal(false, 0)).toBe(true);
    });

    test('first base empty, 1 out - LEGAL', () => {
      expect(isD3KLegal(false, 1)).toBe(true);
    });

    test('first base empty, 2 outs - LEGAL', () => {
      expect(isD3KLegal(false, 2)).toBe(true);
    });

    test('first base occupied, 2 outs - LEGAL (force play possible)', () => {
      expect(isD3KLegal(true, 2)).toBe(true);
    });
  });

  describe('D3K illegal scenarios', () => {
    test('first base occupied, 0 outs - ILLEGAL', () => {
      expect(isD3KLegal(true, 0)).toBe(false);
    });

    test('first base occupied, 1 out - ILLEGAL', () => {
      expect(isD3KLegal(true, 1)).toBe(false);
    });
  });
});

describe('D3K Legality with Explanation (checkD3KLegality)', () => {
  test('first base empty returns legal with reason', () => {
    const result = checkD3KLegality(false, 0);
    expect(result.isLegal).toBe(true);
    expect(result.reason).toContain('First base empty');
  });

  test('2 outs returns legal with reason', () => {
    const result = checkD3KLegality(true, 2);
    expect(result.isLegal).toBe(true);
    expect(result.reason).toContain('2 outs');
    expect(result.reason).toContain('force play');
  });

  test('occupied first with less than 2 outs returns illegal with reason', () => {
    const result = checkD3KLegality(true, 1);
    expect(result.isLegal).toBe(false);
    expect(result.reason).toContain('First base occupied');
    expect(result.reason).toContain('NOT legal');
  });
});

// ============================================
// D3K EVENT CREATION TESTS
// ============================================

describe('D3K Event Creation (createD3KEvent)', () => {
  const batterInfo = { id: 'batter1', name: 'John Smith' };
  const catcherInfo = { id: 'catcher1', name: 'Mike Jones' };
  const pitcherInfo = { id: 'pitcher1', name: 'Bob Wilson' };

  const baseGameState = {
    inning: 5,
    halfInning: 'TOP' as const,
    outs: 1,
    bases: { first: false, second: false, third: false },
  };

  test('D3K_REACHED creates correct event', () => {
    const event = createD3KEvent(
      'D3K_REACHED',
      batterInfo,
      catcherInfo,
      pitcherInfo,
      baseGameState,
      'swinging'
    );

    expect(event.eventType).toBe('D3K');
    expect(event.outcome).toBe('D3K_REACHED');
    expect(event.isLegal).toBe(true);
    expect(event.batterResult).toBe('first');
    expect(event.batterId).toBe('batter1');
    expect(event.catcherId).toBe('catcher1');
    expect(event.pitcherId).toBe('pitcher1');
    expect(event.strikeoutType).toBe('swinging');
  });

  test('D3K_THROWN_OUT creates correct event', () => {
    const event = createD3KEvent(
      'D3K_THROWN_OUT',
      batterInfo,
      catcherInfo,
      pitcherInfo,
      baseGameState,
      'looking'
    );

    expect(event.outcome).toBe('D3K_THROWN_OUT');
    expect(event.batterResult).toBe('out');
    expect(event.strikeoutType).toBe('looking');
  });

  test('D3K_ILLEGAL creates correct event when 1B occupied', () => {
    const occupiedBases = { ...baseGameState, bases: { first: true, second: false, third: false } };
    const event = createD3KEvent(
      'D3K_ILLEGAL',
      batterInfo,
      catcherInfo,
      pitcherInfo,
      occupiedBases,
      'swinging'
    );

    expect(event.outcome).toBe('D3K_ILLEGAL');
    expect(event.batterResult).toBe('out');
    expect(event.isLegal).toBe(false);
  });

  test('D3K_ERROR creates correct event', () => {
    const event = createD3KEvent(
      'D3K_ERROR',
      batterInfo,
      catcherInfo,
      pitcherInfo,
      baseGameState,
      'swinging',
      {
        errorInfo: {
          fielderId: 'catcher1',
          fielderName: 'Mike Jones',
          errorType: 'THROWING',
        },
      }
    );

    expect(event.outcome).toBe('D3K_ERROR');
    expect(event.batterResult).toBe('first');
    expect(event.errorInfo?.errorType).toBe('THROWING');
  });

  test('D3K_WILD_THROW creates correct event with extra base', () => {
    const event = createD3KEvent(
      'D3K_WILD_THROW',
      batterInfo,
      catcherInfo,
      pitcherInfo,
      baseGameState,
      'swinging',
      { batterResult: 'second' }
    );

    expect(event.outcome).toBe('D3K_WILD_THROW');
    expect(event.batterResult).toBe('second');
  });

  test('D3K_WILD_THROW defaults to second if no batterResult specified', () => {
    const event = createD3KEvent(
      'D3K_WILD_THROW',
      batterInfo,
      catcherInfo,
      pitcherInfo,
      baseGameState,
      'swinging'
    );

    expect(event.batterResult).toBe('second');
  });

  test('includes throw sequence when provided', () => {
    const event = createD3KEvent(
      'D3K_THROWN_OUT',
      batterInfo,
      catcherInfo,
      pitcherInfo,
      baseGameState,
      'swinging',
      { throwSequence: ['C', '1B'] }
    );

    expect(event.throwSequence).toEqual(['C', '1B']);
  });

  test('game state is captured correctly', () => {
    const stateWithRunners = {
      inning: 7,
      halfInning: 'BOTTOM' as const,
      outs: 2,
      bases: { first: true, second: true, third: false },
    };

    const event = createD3KEvent(
      'D3K_REACHED',
      batterInfo,
      catcherInfo,
      pitcherInfo,
      stateWithRunners,
      'looking'
    );

    expect(event.inning).toBe(7);
    expect(event.halfInning).toBe('BOTTOM');
    expect(event.outs).toBe(2);
    expect(event.basesBefore.first).toBe(true);
    expect(event.basesBefore.second).toBe(true);
    expect(event.basesBefore.third).toBe(false);
    expect(event.isLegal).toBe(true); // 2 outs makes it legal
  });
});

// ============================================
// D3K STATS AGGREGATION TESTS
// ============================================

describe('Batter D3K Stats Aggregation', () => {
  const createEvent = (outcome: D3KOutcome, batterId: string): D3KEvent => ({
    eventType: 'D3K',
    outcome,
    isLegal: outcome !== 'D3K_ILLEGAL',
    batterId,
    batterName: 'Test Batter',
    catcherId: 'catcher1',
    catcherName: 'Test Catcher',
    pitcherId: 'pitcher1',
    pitcherName: 'Test Pitcher',
    batterResult: outcome === 'D3K_REACHED' || outcome === 'D3K_ERROR' || outcome === 'D3K_WILD_THROW' ? 'first' : 'out',
    strikeoutType: 'swinging',
    inning: 5,
    halfInning: 'TOP',
    outs: 1,
    basesBefore: { first: false, second: false, third: false },
  });

  test('counts all attempts for batter', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_REACHED', 'batter1'),
      createEvent('D3K_THROWN_OUT', 'batter1'),
      createEvent('D3K_REACHED', 'batter2'), // Different batter
    ];

    const stats = aggregateBatterD3KStats(events, 'batter1');
    expect(stats.attempts).toBe(2);
  });

  test('counts reached correctly', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_REACHED', 'batter1'),
      createEvent('D3K_ERROR', 'batter1'),
      createEvent('D3K_WILD_THROW', 'batter1'),
    ];

    const stats = aggregateBatterD3KStats(events, 'batter1');
    expect(stats.reached).toBe(3);
  });

  test('counts thrown out correctly', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_THROWN_OUT', 'batter1'),
      createEvent('D3K_FORCE_OUT', 'batter1'),
    ];

    const stats = aggregateBatterD3KStats(events, 'batter1');
    expect(stats.thrownOut).toBe(2);
  });

  test('counts illegal D3K attempts', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_ILLEGAL', 'batter1'),
    ];

    const stats = aggregateBatterD3KStats(events, 'batter1');
    expect(stats.illegal).toBe(1);
    expect(stats.attempts).toBe(1);
  });

  test('counts errors and wild throws separately', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_ERROR', 'batter1'),
      createEvent('D3K_ERROR', 'batter1'),
      createEvent('D3K_WILD_THROW', 'batter1'),
    ];

    const stats = aggregateBatterD3KStats(events, 'batter1');
    expect(stats.errors).toBe(2);
    expect(stats.wildThrows).toBe(1);
    expect(stats.reached).toBe(3); // All count as reached
  });

  test('returns zero stats for batter with no events', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_REACHED', 'other_batter'),
    ];

    const stats = aggregateBatterD3KStats(events, 'batter1');
    expect(stats.attempts).toBe(0);
    expect(stats.reached).toBe(0);
  });
});

describe('Catcher D3K Stats Aggregation', () => {
  const createEvent = (outcome: D3KOutcome, catcherId: string): D3KEvent => ({
    eventType: 'D3K',
    outcome,
    isLegal: outcome !== 'D3K_ILLEGAL',
    batterId: 'batter1',
    batterName: 'Test Batter',
    catcherId,
    catcherName: 'Test Catcher',
    pitcherId: 'pitcher1',
    pitcherName: 'Test Pitcher',
    batterResult: outcome === 'D3K_REACHED' || outcome === 'D3K_ERROR' || outcome === 'D3K_WILD_THROW' ? 'first' : 'out',
    strikeoutType: 'swinging',
    inning: 5,
    halfInning: 'TOP',
    outs: 1,
    basesBefore: { first: false, second: false, third: false },
  });

  test('counts dropped third strikes (excludes illegal)', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_REACHED', 'catcher1'),
      createEvent('D3K_THROWN_OUT', 'catcher1'),
      createEvent('D3K_ILLEGAL', 'catcher1'), // Excluded
    ];

    const stats = aggregateCatcherD3KStats(events, 'catcher1');
    expect(stats.droppedThirdStrikes).toBe(2);
  });

  test('counts throwouts correctly', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_THROWN_OUT', 'catcher1'),
      createEvent('D3K_THROWN_OUT', 'catcher1'),
      createEvent('D3K_REACHED', 'catcher1'),
    ];

    const stats = aggregateCatcherD3KStats(events, 'catcher1');
    expect(stats.throwouts).toBe(2);
  });

  test('counts failed throws correctly', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_REACHED', 'catcher1'),
      createEvent('D3K_WILD_THROW', 'catcher1'),
      createEvent('D3K_ERROR', 'catcher1'),
    ];

    const stats = aggregateCatcherD3KStats(events, 'catcher1');
    expect(stats.failedThrows).toBe(3);
  });

  test('calculates throwout rate correctly', () => {
    const events: D3KEvent[] = [
      createEvent('D3K_THROWN_OUT', 'catcher1'),
      createEvent('D3K_THROWN_OUT', 'catcher1'),
      createEvent('D3K_REACHED', 'catcher1'),
      createEvent('D3K_REACHED', 'catcher1'),
    ];

    const stats = aggregateCatcherD3KStats(events, 'catcher1');
    expect(stats.throwoutRate).toBeCloseTo(0.5, 2);
  });

  test('returns zero rate for no attempts', () => {
    const events: D3KEvent[] = [];
    const stats = aggregateCatcherD3KStats(events, 'catcher1');
    expect(stats.throwoutRate).toBe(0);
  });
});

// ============================================
// UI HELPER TESTS
// ============================================

describe('D3K Display Message', () => {
  const createEvent = (outcome: D3KOutcome, strikeoutType: 'swinging' | 'looking'): D3KEvent => ({
    eventType: 'D3K',
    outcome,
    isLegal: true,
    batterId: 'b1',
    batterName: 'John Smith',
    catcherId: 'c1',
    catcherName: 'Mike Jones',
    pitcherId: 'p1',
    pitcherName: 'Bob Wilson',
    batterResult: outcome === 'D3K_REACHED' ? 'first' : outcome === 'D3K_WILD_THROW' ? 'second' : 'out',
    strikeoutType,
    inning: 5,
    halfInning: 'TOP',
    outs: 1,
    basesBefore: { first: false, second: false, third: false },
  });

  test('D3K_REACHED shows correct message', () => {
    const event = createEvent('D3K_REACHED', 'swinging');
    const message = getD3KDisplayMessage(event);
    expect(message).toContain('K');
    expect(message).toContain('John Smith');
    expect(message).toContain('reaches');
    expect(message).toContain('dropped third strike');
  });

  test('D3K_THROWN_OUT shows correct message', () => {
    const event = createEvent('D3K_THROWN_OUT', 'swinging');
    const message = getD3KDisplayMessage(event);
    expect(message).toContain('thrown out');
    expect(message).toContain('1B');
  });

  test('D3K_ILLEGAL shows correct message', () => {
    const event = createEvent('D3K_ILLEGAL', 'swinging');
    const message = getD3KDisplayMessage(event);
    expect(message).toContain('out');
    expect(message).toContain('not legal');
  });

  test('looking strikeout uses backwards K', () => {
    const event = createEvent('D3K_REACHED', 'looking');
    const message = getD3KDisplayMessage(event);
    expect(message).toContain('ꓘ');
  });

  test('swinging strikeout uses regular K', () => {
    const event = createEvent('D3K_REACHED', 'swinging');
    const message = getD3KDisplayMessage(event);
    expect(message).toContain('K');
    expect(message).not.toContain('ꓘ');
  });
});

describe('D3K Icon', () => {
  test('returns appropriate icons for each outcome', () => {
    expect(getD3KIcon('D3K_REACHED')).toBeDefined();
    expect(getD3KIcon('D3K_THROWN_OUT')).toBeDefined();
    expect(getD3KIcon('D3K_ILLEGAL')).toBeDefined();
    expect(getD3KIcon('D3K_ERROR')).toBeDefined();
    expect(getD3KIcon('D3K_WILD_THROW')).toBeDefined();
    expect(getD3KIcon('D3K_FORCE_OUT')).toBeDefined();
  });

  test('icons are unique', () => {
    const icons = [
      getD3KIcon('D3K_REACHED'),
      getD3KIcon('D3K_THROWN_OUT'),
      getD3KIcon('D3K_ILLEGAL'),
      getD3KIcon('D3K_ERROR'),
      getD3KIcon('D3K_WILD_THROW'),
      getD3KIcon('D3K_FORCE_OUT'),
    ];
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(6);
  });
});

// ============================================
// INTEGRATION HELPER TESTS
// ============================================

describe('shouldTriggerD3KFlow', () => {
  test('returns true for K with pitch result', () => {
    expect(shouldTriggerD3KFlow('K', true)).toBe(true);
  });

  test('returns true for KL with pitch result', () => {
    expect(shouldTriggerD3KFlow('KL', true)).toBe(true);
  });

  test('returns false for non-strikeout', () => {
    expect(shouldTriggerD3KFlow('GO', true)).toBe(false);
    expect(shouldTriggerD3KFlow('FO', true)).toBe(false);
  });

  test('returns false when not a pitch result', () => {
    expect(shouldTriggerD3KFlow('K', false)).toBe(false);
  });

  test('returns false for undefined outType', () => {
    expect(shouldTriggerD3KFlow(undefined, true)).toBe(false);
  });
});

describe('getD3KOptions', () => {
  test('returns single option when D3K illegal', () => {
    const options = getD3KOptions(false);
    expect(options.length).toBe(1);
    expect(options[0].value).toBe('D3K_ILLEGAL');
    expect(options[0].label).toContain('not legal');
  });

  test('returns multiple options when D3K legal', () => {
    const options = getD3KOptions(true);
    expect(options.length).toBeGreaterThan(1);

    const values = options.map(o => o.value);
    expect(values).toContain('D3K_REACHED');
    expect(values).toContain('D3K_THROWN_OUT');
    expect(values).toContain('D3K_ERROR');
    expect(values).toContain('D3K_WILD_THROW');
  });

  test('all options have icons', () => {
    const legalOptions = getD3KOptions(true);
    const illegalOptions = getD3KOptions(false);

    [...legalOptions, ...illegalOptions].forEach(option => {
      expect(option.icon).toBeDefined();
      expect(option.icon.length).toBeGreaterThan(0);
    });
  });
});
