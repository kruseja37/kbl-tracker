import { describe, expect, test } from 'vitest';

import {
  TRADE_REQUEST_TUNING,
  computeTradeRequestPropensity,
  rankTradeRequestCandidates,
  type TradeRequestPlayer,
  type TradeRequestTuning,
} from '../tradeRequestGeneration';
import type { CanonicalPersonality } from '../masterMoraleMatrix';

const basePlayer: TradeRequestPlayer = {
  personality: 'COMPETITIVE',
  playerMorale: 50,
  loyalty: 50,
};

function player(overrides: Partial<TradeRequestPlayer> = {}): TradeRequestPlayer {
  return { ...basePlayer, ...overrides };
}

function propensity(overrides: Partial<TradeRequestPlayer>, teamFanMorale = 15): number {
  return computeTradeRequestPropensity(player(overrides), teamFanMorale, 'standard').propensity;
}

describe('tradeRequestGeneration L5c pure engine', () => {
  test('happy-fans boundary keeps propensity at zero and requests off for every archetype', () => {
    const personalities = Object.keys(
      TRADE_REQUEST_TUNING.personalitySensitivity,
    ) as CanonicalPersonality[];

    for (const personality of personalities) {
      const result = computeTradeRequestPropensity(
        player({ personality, playerMorale: 0, loyalty: 100 }),
        85,
        'juiced',
      );

      expect(result.propensity).toBe(0);
      expect(result.wouldRequest).toBe(false);
      expect(result.reason).toBe('trade_request.content_no_request');
    }
  });

  test('loyalty inversion points both directions across angry and content fans', () => {
    const angryHighLoyalty = propensity({ playerMorale: 0, loyalty: 100 }, 15);
    const angryLowLoyalty = propensity({ playerMorale: 0, loyalty: 10 }, 15);

    expect(angryHighLoyalty).toBeGreaterThan(angryLowLoyalty);

    const protectiveProbeConfig: TradeRequestTuning = {
      ...TRADE_REQUEST_TUNING,
      baseAngerFloor: 1,
    };
    const happyHighLoyalty = computeTradeRequestPropensity(
      player({ playerMorale: 0, loyalty: 100 }),
      85,
      'standard',
      protectiveProbeConfig,
    ).propensity;
    const happyLowLoyalty = computeTradeRequestPropensity(
      player({ playerMorale: 0, loyalty: 10 }),
      85,
      'standard',
      protectiveProbeConfig,
    ).propensity;

    expect(happyHighLoyalty).toBeLessThan(happyLowLoyalty);
  });

  test('low-morale players bolt first', () => {
    const lowMorale = propensity({ playerMorale: 0, loyalty: 40 });
    const highMorale = propensity({ playerMorale: 45, loyalty: 40 });

    expect(lowMorale).toBeGreaterThan(highMorale);
  });

  test('personality sensitivity creates the expected spread', () => {
    const egotistical = propensity({ personality: 'EGOTISTICAL', playerMorale: 10, loyalty: 40 });
    const relaxed = propensity({ personality: 'RELAXED', playerMorale: 10, loyalty: 40 });

    expect(egotistical).toBeGreaterThan(relaxed);
  });

  test('intensity dial scales propensity juiced greater than standard greater than nerfed', () => {
    const input = player({ personality: 'COMPETITIVE', playerMorale: 5, loyalty: 70 });
    const juiced = computeTradeRequestPropensity(input, 15, 'juiced').propensity;
    const standard = computeTradeRequestPropensity(input, 15, 'standard').propensity;
    const nerfed = computeTradeRequestPropensity(input, 15, 'nerfed').propensity;

    expect(juiced).toBeGreaterThan(standard);
    expect(standard).toBeGreaterThan(nerfed);
  });

  test('same inputs produce the same output', () => {
    const input = player({ personality: 'TIMID', playerMorale: 12, loyalty: 87 });
    const first = computeTradeRequestPropensity(input, 15, 'standard');
    const second = computeTradeRequestPropensity(input, 15, 'standard');

    expect(second).toEqual(first);
  });

  test('rankTradeRequestCandidates returns requesters sorted by propensity desc then id', () => {
    const candidates = rankTradeRequestCandidates(
      [
        { id: 'zeta', personality: 'COMPETITIVE', playerMorale: 0, loyalty: 100 },
        { id: 'quiet', personality: 'RELAXED', playerMorale: 45, loyalty: 0 },
        { id: 'mid', personality: 'EGOTISTICAL', playerMorale: 20, loyalty: 50 },
        { id: 'alpha', personality: 'COMPETITIVE', playerMorale: 0, loyalty: 100 },
      ],
      0,
      'standard',
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual(['alpha', 'zeta', 'mid']);
    expect(candidates.every((candidate) => candidate.wouldRequest)).toBe(true);
    expect(candidates[0].propensity).toBeGreaterThanOrEqual(candidates[1].propensity);
    expect(candidates[1].propensity).toBeGreaterThanOrEqual(candidates[2].propensity);
  });

  test('rankTradeRequestCandidates returns empty when fans are happy', () => {
    const candidates = rankTradeRequestCandidates(
      [
        { id: 'loyal-star', personality: 'EGOTISTICAL', playerMorale: 0, loyalty: 100 },
        { id: 'checked-out', personality: 'COMPETITIVE', playerMorale: 0, loyalty: 0 },
      ],
      85,
      'juiced',
    );

    expect(candidates).toEqual([]);
  });

  test('propensity clamps into the zero-to-one range at extremes', () => {
    const result = computeTradeRequestPropensity(
      player({ personality: 'EGOTISTICAL', playerMorale: 0, loyalty: 100 }),
      0,
      'juiced',
    );

    expect(result.propensity).toBeGreaterThanOrEqual(0);
    expect(result.propensity).toBeLessThanOrEqual(1);
    expect(result.propensity).toBe(1);
  });
});
