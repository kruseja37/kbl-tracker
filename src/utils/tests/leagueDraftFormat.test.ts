import { describe, expect, test } from 'vitest';

import { getLeagueDraftFormat } from '../leagueBuilderStorage';

describe('getLeagueDraftFormat AUC-5.1d-3', () => {
  test('defaults missing templates and missing fields to auction', () => {
    expect(getLeagueDraftFormat(undefined)).toBe('auction');
    expect(getLeagueDraftFormat(null)).toBe('auction');
    expect(getLeagueDraftFormat({})).toBe('auction');
  });

  test('returns the persisted auction draft format', () => {
    expect(getLeagueDraftFormat({ draftFormat: 'auction' })).toBe('auction');
  });

  test('returns the persisted snake draft format', () => {
    expect(getLeagueDraftFormat({ draftFormat: 'snake' })).toBe('snake');
  });
});
