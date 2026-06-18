import { describe, expect, test } from 'vitest';

import {
  FLASHPOINT_DECAY_TUNING,
  computeFlashpointGameTax,
  type FlashpointDecayTuning,
} from '../flashpointDecay';

describe('flashpointDecay — pure §13 tooth #2 per-game tax', () => {
  test('kind null → no tax, not applied (a resolved/never-flagged player bleeds nothing)', () => {
    const result = computeFlashpointGameTax({ kind: null, consecutiveGamesUnresolved: 5 });
    expect(result.gameTax).toBe(0);
    expect(result.applied).toBe(false);
    expect(result.clamped).toBe(false);
  });

  test('zero/sub-one unresolved games → no tax even when turned on', () => {
    expect(computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 0 }).gameTax).toBe(0);
    expect(computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 0.4 }).applied).toBe(false);
  });

  test('a turned-on player who stays gets a negative per-game tax (a bleed)', () => {
    const result = computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 1 });
    expect(result.applied).toBe(true);
    expect(result.gameTax).toBeLessThan(0);
    // First unresolved game = the base tax exactly.
    expect(result.gameTax).toBe(FLASHPOINT_DECAY_TUNING.baseGameTax);
  });

  test('the tax COMPOUNDS with consecutive unresolved games (game 3 magnitude > game 1)', () => {
    const game1 = computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 1 });
    const game3 = computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 3 });
    expect(Math.abs(game3.gameTax)).toBeGreaterThan(Math.abs(game1.gameTax));
    // Both still negative (a bleed, never positive).
    expect(game3.gameTax).toBeLessThan(0);
  });

  test('the compounding tax is CLAMPED to maxGameTax — a tax, not a cliff', () => {
    // With default tuning (base -0.5, ramp +0.1/game, cap -3.0), the raw tax reaches
    // -3.0 at game 51 ( -0.5 × (1 + 50×0.1) = -3.0 ). Far past that it never exceeds the cap.
    const farOut = computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 500 });
    expect(farOut.gameTax).toBe(FLASHPOINT_DECAY_TUNING.maxGameTax);
    expect(farOut.clamped).toBe(true);
    expect(farOut.gameTax).toBeGreaterThanOrEqual(FLASHPOINT_DECAY_TUNING.maxGameTax);
  });

  test('trade_demander is taxed like albatross in v1 (shared base)', () => {
    const albatross = computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 4 });
    const demander = computeFlashpointGameTax({ kind: 'trade_demander', consecutiveGamesUnresolved: 4 });
    expect(demander.gameTax).toBe(albatross.gameTax);
  });

  test('respects an injected tuning (Sim-Gate ownership of magnitudes)', () => {
    const tuning: FlashpointDecayTuning = {
      baseGameTax: -1,
      compoundPerGame: 0,
      maxGameTax: -10,
      precision: 1000,
    };
    const result = computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 9 }, tuning);
    // No compounding → still exactly the base, well within the cap.
    expect(result.gameTax).toBe(-1);
    expect(result.clamped).toBe(false);
  });

  test('deterministic — same inputs produce the same output', () => {
    const a = computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 7 });
    const b = computeFlashpointGameTax({ kind: 'albatross', consecutiveGamesUnresolved: 7 });
    expect(a).toEqual(b);
  });
});
