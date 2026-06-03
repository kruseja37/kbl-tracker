import { describe, expect, test } from 'vitest';

import {
  buildFranchiseFanMoraleStreakEffects,
  FRANCHISE_FAN_MORALE_STREAK_FORMULA_VERSION,
  type FranchiseFanMoraleStreakGameEvidence,
} from '../franchiseFanMoraleStreakFormula';

function game(
  index: number,
  awayScore: number,
  homeScore: number,
  overrides: Partial<FranchiseFanMoraleStreakGameEvidence> = {},
): FranchiseFanMoraleStreakGameEvidence {
  return {
    evidenceId: `game-${index}`,
    source: 'gametracker-archive',
    order: index,
    awayTeamId: 'team-a',
    homeTeamId: 'team-b',
    awayTeamName: 'Alpha',
    homeTeamName: 'Beta',
    awayScore,
    homeScore,
    ...overrides,
  };
}

describe('franchise fan morale streak formula', () => {
  test('3 5 and 7 game win streaks produce spec deltas', () => {
    const result = buildFranchiseFanMoraleStreakEffects([
      game(1, 5, 1),
      game(2, 4, 2),
      game(3, 3, 1),
      game(4, 6, 2),
      game(5, 7, 2),
      game(6, 2, 1),
      game(7, 8, 4),
    ]);

    expect(result.formulaVersion).toBe(FRANCHISE_FAN_MORALE_STREAK_FORMULA_VERSION);
    expect(result.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ teamId: 'team-a', type: 'win-streak-3', streakLength: 3, delta: 2 }),
      expect.objectContaining({ teamId: 'team-a', type: 'win-streak-5', streakLength: 5, delta: 5 }),
      expect.objectContaining({ teamId: 'team-a', type: 'win-streak-7', streakLength: 7, delta: 8 }),
    ]));
  });

  test('3 5 and 7 game losing streaks produce spec deltas', () => {
    const result = buildFranchiseFanMoraleStreakEffects([
      game(1, 1, 5),
      game(2, 2, 4),
      game(3, 1, 3),
      game(4, 2, 6),
      game(5, 2, 7),
      game(6, 1, 2),
      game(7, 4, 8),
    ]);

    expect(result.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ teamId: 'team-a', type: 'loss-streak-3', streakLength: 3, delta: -2 }),
      expect.objectContaining({ teamId: 'team-a', type: 'loss-streak-5', streakLength: 5, delta: -5 }),
      expect.objectContaining({ teamId: 'team-a', type: 'loss-streak-7', streakLength: 7, delta: -10 }),
    ]));
  });

  test('streak breaks after 5 plus games produce relief and disappointment prompts', () => {
    const lossBreak = buildFranchiseFanMoraleStreakEffects([
      game(1, 1, 5),
      game(2, 2, 4),
      game(3, 1, 3),
      game(4, 2, 6),
      game(5, 2, 7),
      game(6, 4, 1),
    ]);
    const winBreak = buildFranchiseFanMoraleStreakEffects([
      game(1, 5, 1),
      game(2, 4, 2),
      game(3, 3, 1),
      game(4, 6, 2),
      game(5, 7, 2),
      game(6, 1, 4),
    ]);

    expect(lossBreak.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ teamId: 'team-a', type: 'loss-streak-broken', streakLength: 5, delta: 4 }),
    ]));
    expect(winBreak.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ teamId: 'team-a', type: 'win-streak-broken', streakLength: 5, delta: -3 }),
    ]));
  });

  test('repeated streak milestones generate distinct effects after a streak resets', () => {
    const result = buildFranchiseFanMoraleStreakEffects([
      game(1, 5, 1),
      game(2, 4, 2),
      game(3, 3, 1),
      game(4, 1, 4),
      game(5, 6, 2),
      game(6, 5, 3),
      game(7, 4, 1),
    ]);
    const winThreeEffects = result.effects.filter((effect) =>
      effect.teamId === 'team-a' &&
      effect.type === 'win-streak-3'
    );

    expect(winThreeEffects).toHaveLength(2);
    expect(winThreeEffects.map((effect) => effect.evidenceGameId)).toEqual(['game-3', 'game-7']);
  });

  test('ties and invalid rows are ignored with blockers', () => {
    const result = buildFranchiseFanMoraleStreakEffects([
      game(1, 4, 4),
      game(2, -1, 2),
      game(3, 3, 1),
    ]);

    expect(result.effects.filter((effect) => effect.teamId === 'team-a')).toEqual([]);
    expect(result.blockers.join(' ')).toMatch(/Ignored invalid or tied streak evidence row/i);
  });

  test('whitespace-equivalent same-team ids are invalid', () => {
    const result = buildFranchiseFanMoraleStreakEffects([
      game(1, 5, 1, { awayTeamId: 'team-a', homeTeamId: ' team-a ' }),
      game(2, 4, 2),
      game(3, 3, 1),
    ]);

    expect(result.effects.filter((effect) => effect.teamId === 'team-a')).toEqual([]);
    expect(result.blockers.join(' ')).toMatch(/Ignored invalid or tied streak evidence row/i);
  });

  test('mixed archive and score-only rows sort deterministically before deriving streaks', () => {
    const result = buildFranchiseFanMoraleStreakEffects([
      game(30, 7, 1, { evidenceId: 'late-archive', source: 'gametracker-archive', order: 30 }),
      game(10, 3, 0, { evidenceId: 'early-score', source: 'score-only', order: 10 }),
      game(20, 4, 2, { evidenceId: 'middle-archive', source: 'gametracker-archive', order: 20 }),
    ]);
    const streak = result.effects.find((effect) => effect.teamId === 'team-a' && effect.type === 'win-streak-3');

    expect(streak).toMatchObject({
      evidenceGameId: 'late-archive',
      streakLength: 3,
      delta: 2,
    });
  });
});
