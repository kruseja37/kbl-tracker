import { describe, expect, test } from 'vitest';

import {
  getDisplayedStadiumName,
  getInitialSelectedStadium,
  shouldSyncSelectedStadium,
} from '../../app/utils/stadiumSelection';

describe('stadiumSelection', () => {
  test('does not default an empty selection to the first park on refresh', () => {
    expect(getInitialSelectedStadium(undefined)).toBeNull();
    expect(getInitialSelectedStadium(null)).toBeNull();
    expect(getInitialSelectedStadium('Swagger Center')).toBe('Swagger Center');
  });

  test('only syncs back into game state when the user has an explicit selection', () => {
    expect(shouldSyncSelectedStadium(null)).toBe(false);
    expect(shouldSyncSelectedStadium(undefined)).toBe(false);
    expect(shouldSyncSelectedStadium('Swagger Center')).toBe(true);
  });

  test('falls back to the persisted stadium name for display when no local selection exists', () => {
    expect(getDisplayedStadiumName(null, 'Swagger Center')).toBe('Swagger Center');
    expect(getDisplayedStadiumName('Founders Field', 'Swagger Center')).toBe('Founders Field');
    expect(getDisplayedStadiumName(null, null)).toBeUndefined();
  });

  test('keeps the persisted stadium visible across repeated local resets', () => {
    let selected = getInitialSelectedStadium('Fenway Park');
    expect(getDisplayedStadiumName(selected, 'Fenway Park')).toBe('Fenway Park');

    selected = getInitialSelectedStadium(null);
    expect(getDisplayedStadiumName(selected, 'Fenway Park')).toBe('Fenway Park');

    selected = null;
    expect(getDisplayedStadiumName(selected, 'Fenway Park')).toBe('Fenway Park');
  });
});
