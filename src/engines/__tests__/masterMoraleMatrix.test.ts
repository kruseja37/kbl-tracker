import { describe, expect, test } from 'vitest';

import {
  MORALE_TUNING,
  composeMoraleConsequence,
  getBaseMoraleConsequence,
  normalizePersonality,
  type MoraleMatrixEvent,
} from '../masterMoraleMatrix';
import type { HiddenModifiers } from '../../types/game';

const neutralModifiers: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

function compose(
  event: MoraleMatrixEvent,
  overrides: Partial<HiddenModifiers> = {},
  personality = 'COMPETITIVE',
) {
  return composeMoraleConsequence(
    event,
    personality,
    { ...neutralModifiers, ...overrides },
    MORALE_TUNING.scale.fanMoraleNeutral,
    MORALE_TUNING.scale.fanMoraleNeutral,
  );
}

describe('masterMoraleMatrix L3a pure engine', () => {
  test('same input resolves deterministically', () => {
    const event: MoraleMatrixEvent = { type: 'CLUTCH_HIT' };
    const modifiers = { ...neutralModifiers, ambition: 77, resilience: 22, charisma: 64 };

    const first = composeMoraleConsequence(event, 'FIERY', modifiers, 45, 72);
    const second = composeMoraleConsequence(event, 'FIERY', modifiers, 45, 72);

    expect(second).toEqual(first);
  });

  test('base lookup returns the authoritative event row', () => {
    const base = getBaseMoraleConsequence({ type: 'WALK_OFF_WIN' });

    expect(base.selfPlayerMoraleDelta).toBe(MORALE_TUNING.eventDelta.walkOffWinSelf);
    expect(base.teamFanMoraleDelta).toBe(MORALE_TUNING.eventDelta.walkOffWinFan);
    expect(base.otherTouched).toEqual([
      { relation: 'clubhouse', delta: MORALE_TUNING.eventDelta.mediumTeammateLift },
    ]);
    expect(base.reason).toBe('game.walk_off_win');
  });

  test('personality changes the resolved multiplier', () => {
    const competitive = compose({ type: 'CLUTCH_HIT' }, {}, 'COMPETITIVE');
    const relaxed = compose({ type: 'CLUTCH_HIT' }, {}, 'RELAXED');

    expect(competitive.selfPlayerMoraleDelta).not.toBe(relaxed.selfPlayerMoraleDelta);
    expect(competitive.selfPlayerMoraleDelta).toBeGreaterThan(relaxed.selfPlayerMoraleDelta);
  });

  test('ambition scales positive moves while resilience does not', () => {
    const highAmbition = compose({ type: 'CLUTCH_HIT' }, { ambition: 90, resilience: 10 });
    const lowAmbition = compose({ type: 'CLUTCH_HIT' }, { ambition: 10, resilience: 90 });
    const differentResilienceOnly = compose({ type: 'CLUTCH_HIT' }, { ambition: 90, resilience: 90 });

    expect(highAmbition.selfPlayerMoraleDelta).toBeGreaterThan(lowAmbition.selfPlayerMoraleDelta);
    expect(differentResilienceOnly.selfPlayerMoraleDelta).toBe(highAmbition.selfPlayerMoraleDelta);
  });

  test('resilience scales negative moves while ambition does not', () => {
    const highResilience = compose({ type: 'PLAYER_SLUMP' }, { resilience: 90, ambition: 10 });
    const lowResilience = compose({ type: 'PLAYER_SLUMP' }, { resilience: 10, ambition: 90 });
    const differentAmbitionOnly = compose({ type: 'PLAYER_SLUMP' }, { resilience: 90, ambition: 90 });

    expect(highResilience.selfPlayerMoraleDelta).toBeGreaterThan(lowResilience.selfPlayerMoraleDelta);
    expect(differentAmbitionOnly.selfPlayerMoraleDelta).toBe(highResilience.selfPlayerMoraleDelta);
  });

  test('charisma moves otherTouched teammate deltas, not self morale', () => {
    const highCharisma = compose({ type: 'CAPTAIN_BIG_GAME' }, { charisma: 95 });
    const lowCharisma = compose({ type: 'CAPTAIN_BIG_GAME' }, { charisma: 5 });

    expect(highCharisma.selfPlayerMoraleDelta).toBe(lowCharisma.selfPlayerMoraleDelta);
    expect(highCharisma.otherTouched[0].delta).toBeGreaterThan(lowCharisma.otherTouched[0].delta);
  });

  test('default-neutral future taps return zero even with non-neutral fan morale input', () => {
    const resolved = composeMoraleConsequence(
      { kind: 'fame', type: 'FAME_HEAT_CHANGED' },
      'EGOTISTICAL',
      neutralModifiers,
      44,
      90,
    );

    expect(resolved.isNeutral).toBe(true);
    expect(resolved.selfPlayerMoraleDelta).toBe(0);
    expect(resolved.teamFanMoraleDelta).toBe(0);
    expect(resolved.totalPlayerMoraleDelta).toBe(0);
    expect(resolved.projectedPlayerMorale).toBe(44);
    expect(resolved.projectedFanMorale).toBe(90);
  });

  test('unknown events resolve neutral and never throw', () => {
    const resolved = composeMoraleConsequence(
      { type: 'UNMATCHED_EVENT_FROM_FUTURE' },
      'COMPETITIVE',
      neutralModifiers,
      35,
      12,
    );

    expect(resolved.isNeutral).toBe(true);
    expect(resolved.selfPlayerMoraleDelta).toBe(0);
    expect(resolved.teamFanMoraleDelta).toBe(0);
    expect(resolved.totalPlayerMoraleDelta).toBe(0);
    expect(resolved.projectedPlayerMorale).toBe(35);
    expect(resolved.projectedFanMorale).toBe(12);
  });

  test('legacy playerMorale personalities reconcile to canonical seven', () => {
    expect(normalizePersonality('GRUMPY')).toBe('DROOPY');
    expect(normalizePersonality('FIERY')).toBe('COMPETITIVE');
    expect(normalizePersonality('SPIRITED')).toBe('JOLLY');
  });
});
