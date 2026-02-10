/**
 * Failed HR Robbery Detection Tests
 * Phase B - Tier 2.1 (GAP-B3-017)
 */

import { describe, test, expect } from 'vitest';
import {
  shouldPromptForRobbery,
  evaluateFailedRobbery,
} from '../../../engines/fameEngine';
import { FAME_VALUES } from '../../../types/game';

describe('shouldPromptForRobbery (GAP-B3-017)', () => {
  test('HR in deep zone should prompt', () => {
    expect(shouldPromptForRobbery('HR', 0.95)).toBe(true);
  });

  test('HR without zone info should prompt', () => {
    expect(shouldPromptForRobbery('HR')).toBe(true);
  });

  test('HR in shallow zone should not prompt', () => {
    expect(shouldPromptForRobbery('HR', 0.5)).toBe(false);
  });

  test('non-HR should not prompt', () => {
    expect(shouldPromptForRobbery('FO', 0.95)).toBe(false);
    expect(shouldPromptForRobbery('1B')).toBe(false);
  });
});

describe('evaluateFailedRobbery (GAP-B3-017)', () => {
  test('robbery attempted + failed → FAILED_ROBBERY', () => {
    expect(evaluateFailedRobbery(true, true)).toBe('FAILED_ROBBERY');
  });

  test('robbery not attempted → null', () => {
    expect(evaluateFailedRobbery(false, false)).toBeNull();
  });

  test('robbery attempted but succeeded → null', () => {
    expect(evaluateFailedRobbery(true, false)).toBeNull();
  });
});

describe('FAILED_ROBBERY Fame value', () => {
  test('FAILED_ROBBERY is -1 Fame', () => {
    expect(FAME_VALUES.FAILED_ROBBERY).toBe(-1);
  });
});
