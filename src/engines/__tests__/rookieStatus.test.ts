import { describe, expect, test } from 'vitest';

import { isPlayerRookie } from '../rookieStatus';

describe('rookieStatus', () => {
  test('returns true during the activated season', () => {
    expect(isPlayerRookie({ activatedSeasonId: 'franchise-1-season-1' }, 'franchise-1-season-1')).toBe(true);
  });

  test('returns false after the debut season', () => {
    expect(isPlayerRookie({ activatedSeasonId: 'franchise-1-season-1' }, 'franchise-1-season-2')).toBe(false);
  });

  test('returns false when status is missing', () => {
    expect(isPlayerRookie(undefined, 'franchise-1-season-1')).toBe(false);
    expect(isPlayerRookie(null, 'franchise-1-season-1')).toBe(false);
  });

  test('returns false when current season is missing', () => {
    expect(isPlayerRookie({ activatedSeasonId: 'franchise-1-season-1' }, null)).toBe(false);
    expect(isPlayerRookie({ activatedSeasonId: 'franchise-1-season-1' }, '')).toBe(false);
  });
});
