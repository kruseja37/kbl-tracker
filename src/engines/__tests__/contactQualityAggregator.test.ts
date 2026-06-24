import { describe, expect, test } from 'vitest';

import {
  DEFAULT_CONTACT_QUALITY_MIN_SAMPLE,
  aggregateBatterContactQuality,
  aggregatePitcherWeakContact,
  classifyContactQuality,
  type ContactQualityEvent,
} from '../contactQualityAggregator';
import type { AtBatResult } from '../../types/game';

function event(result: AtBatResult, contactType: ContactQualityEvent['contactType']): ContactQualityEvent {
  return { result, contactType };
}

describe('classifyContactQuality RA-2CQ-1', () => {
  test('classifies ordinary balls in play by the HARD-only good cut', () => {
    expect(classifyContactQuality('hard', 'GO')).toBe('good');
    expect(classifyContactQuality('normal', 'GO')).toBe('neutral');
    expect(classifyContactQuality('weak', 'GO')).toBe('weak');
    expect(classifyContactQuality('bloop', 'FO')).toBe('weak');
  });

  test('hard PO is neutral, while non-hard PO remains weak', () => {
    expect(classifyContactQuality('hard', 'PO')).toBe('neutral');
    expect(classifyContactQuality('weak', 'PO')).toBe('weak');
  });

  test('FLO is graded by contactType instead of capped', () => {
    expect(classifyContactQuality('hard', 'FLO')).toBe('good');
    expect(classifyContactQuality('weak', 'FLO')).toBe('weak');
    expect(classifyContactQuality('normal', 'FLO')).toBe('neutral');
  });

  test('bunts, strikeouts, and missing tags are excluded', () => {
    expect(classifyContactQuality('bunt', '1B')).toBe('excluded');
    expect(classifyContactQuality('hard', 'K')).toBe('excluded');
    expect(classifyContactQuality(undefined, '1B')).toBe('excluded');
    expect(classifyContactQuality(null, '1B')).toBe('excluded');
  });

  test('explicit contact-bearing edge results are classified and not delegated to helper sets', () => {
    expect(classifyContactQuality('hard', 'ITPHR')).toBe('good');
    expect(classifyContactQuality('normal', 'GRD')).toBe('neutral');
    expect(classifyContactQuality('weak', 'SF')).toBe('weak');
    expect(classifyContactQuality('bloop', 'FC')).toBe('weak');
    expect(classifyContactQuality('hard', 'E')).toBe('good');
  });
});

describe('aggregateBatterContactQuality RA-2CQ-1', () => {
  test('uses good divided by tracked contact when sample gate is met', () => {
    const events: ContactQualityEvent[] = [
      event('GO', 'hard'),
      event('LO', 'hard'),
      event('FLO', 'hard'),
      event('HR', 'hard'),
      event('1B', 'normal'),
      event('2B', 'normal'),
      event('PO', 'hard'),
      event('FO', 'weak'),
      event('GO', 'bloop'),
      event('FLO', 'weak'),
      event('K', 'hard'),
      event('1B', 'bunt'),
      event('GO', undefined),
    ];

    expect(aggregateBatterContactQuality(events)).toEqual({
      rate: 4 / 10,
      trackedCount: 10,
      goodCount: 4,
      neutralCount: 3,
      weakCount: 3,
    });
  });

  test('returns null rate below the minimum tracked sample', () => {
    expect(aggregateBatterContactQuality([
      event('GO', 'hard'),
      event('GO', 'normal'),
      event('GO', 'weak'),
    ])).toEqual({
      rate: null,
      trackedCount: 3,
      goodCount: 1,
      neutralCount: 1,
      weakCount: 1,
    });
  });

  test('all-normal contact has a zero batter quality-contact rate at sample', () => {
    const events = Array.from({ length: DEFAULT_CONTACT_QUALITY_MIN_SAMPLE }, () => event('GO', 'normal'));

    expect(aggregateBatterContactQuality(events)).toEqual({
      rate: 0,
      trackedCount: 10,
      goodCount: 0,
      neutralCount: 10,
      weakCount: 0,
    });
  });

  test('empty input returns null with zero tracked components', () => {
    expect(aggregateBatterContactQuality([])).toEqual({
      rate: null,
      trackedCount: 0,
      goodCount: 0,
      neutralCount: 0,
      weakCount: 0,
    });
  });
});

describe('aggregatePitcherWeakContact RA-2CQ-1', () => {
  test('uses weak divided by tracked contact when sample gate is met', () => {
    const events: ContactQualityEvent[] = [
      event('GO', 'hard'),
      event('LO', 'hard'),
      event('FLO', 'hard'),
      event('HR', 'hard'),
      event('1B', 'normal'),
      event('2B', 'normal'),
      event('PO', 'hard'),
      event('FO', 'weak'),
      event('GO', 'bloop'),
      event('FLO', 'weak'),
      event('K', 'hard'),
      event('1B', 'bunt'),
    ];

    expect(aggregatePitcherWeakContact(events)).toEqual({
      rate: 3 / 10,
      trackedCount: 10,
      goodCount: 4,
      neutralCount: 3,
      weakCount: 3,
    });
  });

  test('returns null rate below the minimum tracked sample', () => {
    expect(aggregatePitcherWeakContact([
      event('GO', 'hard'),
      event('GO', 'normal'),
      event('GO', 'weak'),
    ])).toEqual({
      rate: null,
      trackedCount: 3,
      goodCount: 1,
      neutralCount: 1,
      weakCount: 1,
    });
  });
});
