import { describe, expect, test } from 'vitest';

import {
  buildFranchiseFanMoraleGameResultEffects,
  FRANCHISE_FAN_MORALE_GAME_RESULT_FORMULA_VERSION,
} from '../franchiseFanMoraleGameResultFormula';

describe('franchise fan morale game-result formula', () => {
  test('regular games create signed win and loss effects', () => {
    const result = buildFranchiseFanMoraleGameResultEffects({
      source: 'gametracker-archive',
      gameId: 'game-1',
      awayTeamId: 'away',
      homeTeamId: 'home',
      awayTeamName: 'Away Club',
      homeTeamName: 'Home Club',
      awayScore: 5,
      homeScore: 3,
    });

    expect(result.formulaVersion).toBe(FRANCHISE_FAN_MORALE_GAME_RESULT_FORMULA_VERSION);
    expect(result.blockers).toEqual([]);
    expect(result.effects).toEqual([
      expect.objectContaining({
        teamId: 'away',
        teamName: 'Away Club',
        opponentTeamId: 'home',
        outcome: 'win',
        delta: 1,
      }),
      expect.objectContaining({
        teamId: 'home',
        teamName: 'Home Club',
        opponentTeamId: 'away',
        outcome: 'loss',
        delta: -1,
      }),
    ]);
  });

  test('shutouts create larger signed effects for both teams', () => {
    const result = buildFranchiseFanMoraleGameResultEffects({
      source: 'score-only',
      gameId: 'score-only-1',
      awayTeamId: 'away',
      homeTeamId: 'home',
      awayScore: 0,
      homeScore: 4,
    });

    expect(result.effects).toEqual([
      expect.objectContaining({
        teamId: 'home',
        outcome: 'shutout-win',
        delta: 2,
      }),
      expect.objectContaining({
        teamId: 'away',
        outcome: 'shutout-loss',
        delta: -2,
      }),
    ]);
  });

  test('tied results and invalid scores produce no morale effects', () => {
    const tied = buildFranchiseFanMoraleGameResultEffects({
      source: 'gametracker-archive',
      gameId: 'tie',
      awayTeamId: 'away',
      homeTeamId: 'home',
      awayScore: 3,
      homeScore: 3,
    });
    const invalid = buildFranchiseFanMoraleGameResultEffects({
      source: 'gametracker-archive',
      gameId: 'invalid',
      awayTeamId: 'away',
      homeTeamId: 'home',
      awayScore: -1,
      homeScore: 3,
    });

    expect(tied.effects).toEqual([]);
    expect(tied.blockers.join(' ')).toMatch(/Tied results/i);
    expect(invalid.effects).toEqual([]);
    expect(invalid.blockers.join(' ')).toMatch(/Non-negative integer final scores/i);
  });

  test('documents separate blowout and streak formulas plus deferred richer modifiers', () => {
    const result = buildFranchiseFanMoraleGameResultEffects({
      source: 'gametracker-archive',
      gameId: 'game-2',
      awayTeamId: 'away',
      homeTeamId: 'home',
      awayScore: 1,
      homeScore: 0,
    });

    expect(result.limitations.join(' ')).toMatch(/Blowout modifiers, streaks, and no-hitter\/perfect-game achievements are handled by separate confirmation-gated fan morale prompt formulas/i);
    expect(result.limitations.join(' ')).toMatch(/Walk-offs, rivals, playoff implications, and expected wins remain deferred/i);
  });
});
