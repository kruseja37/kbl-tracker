import { describe, expect, test } from 'vitest';

import {
  buildFranchiseFanMoraleBlowoutEffects,
  FRANCHISE_FAN_MORALE_BLOWOUT_FORMULA_VERSION,
  FRANCHISE_FAN_MORALE_BLOWOUT_RUN_DIFFERENTIAL,
} from '../franchiseFanMoraleBlowoutFormula';

function input(overrides = {}) {
  return {
    source: 'gametracker-archive' as const,
    gameId: 'game-1',
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away Club',
    homeTeamName: 'Home Club',
    awayScore: 10,
    homeScore: 2,
    ...overrides,
  };
}

describe('franchise fan morale blowout formula', () => {
  test('7 plus run blowouts create signed win and loss effects', () => {
    const result = buildFranchiseFanMoraleBlowoutEffects(input());

    expect(result.formulaVersion).toBe(FRANCHISE_FAN_MORALE_BLOWOUT_FORMULA_VERSION);
    expect(FRANCHISE_FAN_MORALE_BLOWOUT_RUN_DIFFERENTIAL).toBe(7);
    expect(result.blockers).toEqual([]);
    expect(result.effects).toEqual([
      expect.objectContaining({
        teamId: 'away',
        outcome: 'blowout-win',
        runDifferential: 8,
        delta: 1,
      }),
      expect.objectContaining({
        teamId: 'home',
        outcome: 'blowout-loss',
        runDifferential: 8,
        delta: -1,
      }),
    ]);
  });

  test('6 run games are below the v1 blowout threshold', () => {
    const result = buildFranchiseFanMoraleBlowoutEffects(input({ awayScore: 9, homeScore: 3 }));

    expect(result.effects).toEqual([]);
    expect(result.blockers.join(' ')).toMatch(/below the 7-run blowout threshold/i);
  });

  test('ties invalid scores missing ids blank teams and same-team rows produce no effects', () => {
    const cases = [
      input({ awayScore: 4, homeScore: 4 }),
      input({ awayScore: -1, homeScore: 4 }),
      input({ gameId: ' ' }),
      input({ awayTeamId: ' ' }),
      input({ awayTeamId: 'team-a', homeTeamId: ' team-a ' }),
    ];

    for (const testInput of cases) {
      const result = buildFranchiseFanMoraleBlowoutEffects(testInput);
      expect(result.effects).toEqual([]);
      expect(result.blockers.length).toBeGreaterThan(0);
    }
  });

  test('documents deferred richer modifiers without applying them', () => {
    const result = buildFranchiseFanMoraleBlowoutEffects(input());

    expect(result.limitations.join(' ')).toMatch(/No-hitter and perfect-game achievements are handled by a separate confirmation-gated fan morale prompt formula/i);
    expect(result.limitations.join(' ')).toMatch(/Rival, playoff, comeback, walk-off, expected-wins, and daily snapshot modifiers remain deferred/i);
  });
});
