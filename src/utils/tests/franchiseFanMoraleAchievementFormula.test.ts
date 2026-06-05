import { describe, expect, test } from 'vitest';

import {
  buildFranchiseFanMoraleAchievementEffects,
  FRANCHISE_FAN_MORALE_ACHIEVEMENT_FORMULA_VERSION,
} from '../franchiseFanMoraleAchievementFormula';

function game(overrides = {}) {
  return {
    gameId: 'game-1',
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away Club',
    homeTeamName: 'Home Club',
    fameEvents: [{
      id: 'fame-no-hitter-1',
      eventType: 'NO_HITTER',
      playerId: 'pitcher-1',
      playerName: 'Ace One',
      playerTeam: 'away',
    }],
    ...overrides,
  };
}

describe('franchise fan morale achievement formula', () => {
  test('no-hitter emits positive team and negative opponent effects', () => {
    const result = buildFranchiseFanMoraleAchievementEffects(game());

    expect(result.formulaVersion).toBe(FRANCHISE_FAN_MORALE_ACHIEVEMENT_FORMULA_VERSION);
    expect(result.effects).toEqual([
      expect.objectContaining({
        achievementType: 'NO_HITTER',
        outcome: 'no-hitter',
        teamId: 'away',
        opponentTeamId: 'home',
        delta: 5,
      }),
      expect.objectContaining({
        achievementType: 'NO_HITTER',
        outcome: 'getting-no-hit',
        teamId: 'home',
        opponentTeamId: 'away',
        delta: -4,
      }),
    ]);
  });

  test('perfect game emits plus seven for pitcher team and minus four for opponent', () => {
    const result = buildFranchiseFanMoraleAchievementEffects(game({
      fameEvents: [{
        id: 'fame-perfect-1',
        eventType: 'PERFECT_GAME',
        playerId: 'pitcher-1',
        playerName: 'Ace One',
        playerTeam: 'home',
      }],
    }));

    expect(result.effects).toEqual([
      expect.objectContaining({
        achievementType: 'PERFECT_GAME',
        outcome: 'perfect-game',
        teamId: 'home',
        opponentTeamId: 'away',
        delta: 7,
      }),
      expect.objectContaining({
        achievementType: 'PERFECT_GAME',
        outcome: 'getting-perfect-gamed',
        teamId: 'away',
        opponentTeamId: 'home',
        delta: -4,
      }),
    ]);
  });

  test('unknown missing and non-matching fame events produce no effects', () => {
    const unknown = buildFranchiseFanMoraleAchievementEffects(game({
      fameEvents: [{ id: 'ordinary', eventType: 'SHUTOUT', playerTeam: 'away' }],
    }));
    const missingTeam = buildFranchiseFanMoraleAchievementEffects(game({
      fameEvents: [{ id: 'missing-team', eventType: 'NO_HITTER' }],
    }));
    const wrongTeam = buildFranchiseFanMoraleAchievementEffects(game({
      fameEvents: [{ id: 'wrong-team', eventType: 'NO_HITTER', playerTeam: 'other' }],
    }));

    expect(unknown.effects).toEqual([]);
    expect(missingTeam.effects).toEqual([]);
    expect(wrongTeam.effects).toEqual([]);
    expect(wrongTeam.blockers.join(' ')).toMatch(/team does not match either game team/i);
  });

  test('blank ids and same-team games produce no effects', () => {
    const blankId = buildFranchiseFanMoraleAchievementEffects(game({ gameId: ' ' }));
    const blankTeam = buildFranchiseFanMoraleAchievementEffects(game({ awayTeamId: ' ' }));
    const sameTeam = buildFranchiseFanMoraleAchievementEffects(game({ awayTeamId: 'team-a', homeTeamId: ' team-a ' }));

    expect(blankId.effects).toEqual([]);
    expect(blankTeam.effects).toEqual([]);
    expect(sameTeam.effects).toEqual([]);
    expect(blankId.blockers.length).toBeGreaterThan(0);
    expect(blankTeam.blockers.length).toBeGreaterThan(0);
    expect(sameTeam.blockers.length).toBeGreaterThan(0);
  });

  test('duplicate no-hitter events do not double count same team prompts', () => {
    const result = buildFranchiseFanMoraleAchievementEffects(game({
      fameEvents: [
        { id: 'nh-1', eventType: 'NO_HITTER', playerTeam: 'away' },
        { id: 'nh-2', eventType: 'NO_HITTER', playerTeam: 'away' },
      ],
    }));

    expect(result.effects.filter((effect) => effect.outcome === 'no-hitter')).toHaveLength(1);
    expect(result.effects.filter((effect) => effect.outcome === 'getting-no-hit')).toHaveLength(1);
  });

  test('perfect-game events supersede no-hitter prompts for the same team and game', () => {
    const result = buildFranchiseFanMoraleAchievementEffects(game({
      fameEvents: [
        { id: 'nh-1', eventType: 'NO_HITTER', playerTeam: 'away' },
        { id: 'nh-2', eventType: 'NO_HITTER', playerTeam: 'away' },
        { id: 'pg-1', eventType: 'PERFECT_GAME', playerTeam: 'away' },
        { id: 'pg-2', eventType: 'PERFECT_GAME', playerTeam: 'away' },
      ],
    }));

    expect(result.effects.filter((effect) => effect.outcome === 'no-hitter')).toHaveLength(0);
    expect(result.effects.filter((effect) => effect.outcome === 'getting-no-hit')).toHaveLength(0);
    expect(result.effects.filter((effect) => effect.outcome === 'perfect-game')).toHaveLength(1);
    expect(result.effects.filter((effect) => effect.outcome === 'getting-perfect-gamed')).toHaveLength(1);
  });

  test('documents deferred walkoff rivalry playoff and snapshot modifiers', () => {
    const result = buildFranchiseFanMoraleAchievementEffects(game());

    expect(result.limitations.join(' ')).toMatch(/Walk-off, rivalry, playoff, expected-wins, relationship, and daily snapshot modifiers remain deferred/i);
  });
});
