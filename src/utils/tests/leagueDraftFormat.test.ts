import { describe, expect, test } from 'vitest';

import { TIER_CAPS } from '../../data/tierParams';
import { getLeagueDraftFormat, resolveLeagueSalaryCap } from '../leagueBuilderStorage';

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

describe('resolveLeagueSalaryCap CODEX-HARDCAP-P1', () => {
  test('returns an explicit league salary cap verbatim', () => {
    expect(resolveLeagueSalaryCap({ tier: 'standard', salaryCap: 987_654 })).toBe(987_654);
  });

  test.each(['juiced', 'standard', 'nerfed'] as const)(
    'falls back to the static %s tier reference when salaryCap is absent',
    (tier) => {
      expect(resolveLeagueSalaryCap({ tier })).toBe(TIER_CAPS[tier].tierCap);
    },
  );

  test('falls back to juiced when both salaryCap and tier are absent', () => {
    expect(resolveLeagueSalaryCap({})).toBe(TIER_CAPS.juiced.tierCap);
    expect(resolveLeagueSalaryCap(null)).toBe(TIER_CAPS.juiced.tierCap);
  });
});
