import { describe, expect, test } from 'vitest';

import { getLeagueDraftFormat } from '../leagueBuilderStorage';

describe('getLeagueDraftFormat AUC-5.1d-3', () => {
  test('defaults missing templates and missing fields to snake', () => {
    expect(getLeagueDraftFormat(undefined)).toBe('snake');
    expect(getLeagueDraftFormat(null)).toBe('snake');
    expect(getLeagueDraftFormat({})).toBe('snake');
  });

  test('returns the persisted auction draft format', () => {
    expect(getLeagueDraftFormat({ draftFormat: 'auction' })).toBe('auction');
  });

  test('returns the persisted snake draft format', () => {
    expect(getLeagueDraftFormat({ draftFormat: 'snake' })).toBe('snake');
  });
});
