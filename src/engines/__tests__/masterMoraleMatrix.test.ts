import { describe, expect, test } from 'vitest';

import {
  MORALE_TUNING,
  RELATIONSHIP_MORALE_BASE_DELTAS,
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

  test('fame tap turns positive heatDelta into player morale without fan morale', () => {
    const resolved = composeMoraleConsequence(
      { kind: 'fame', type: 'FAME_HEAT_CHANGED', heatDelta: 8 },
      'RELAXED',
      neutralModifiers,
      50,
      50,
    );

    expect(resolved.isNeutral).toBe(false);
    expect(resolved.selfPlayerMoraleDelta).toBeGreaterThan(0);
    expect(resolved.teamFanMoraleDelta).toBe(0);
    expect(resolved.totalPlayerMoraleDelta).toBeGreaterThan(0);
    expect(resolved.base.reason).toBe('fame.fame_heat_changed');
  });

  test('fame tap turns negative heatDelta into player morale loss without fan morale', () => {
    const resolved = composeMoraleConsequence(
      { kind: 'fame', type: 'FAME_HEAT_CHANGED', heatDelta: -6 },
      'RELAXED',
      neutralModifiers,
      50,
      50,
    );

    expect(resolved.isNeutral).toBe(false);
    expect(resolved.selfPlayerMoraleDelta).toBeLessThan(0);
    expect(resolved.teamFanMoraleDelta).toBe(0);
    expect(resolved.totalPlayerMoraleDelta).toBeLessThan(0);
  });

  test('fame heatDelta base scale comes only from the §16 fame heat-delta constant', () => {
    const heatDelta = 12;
    const base = getBaseMoraleConsequence({ kind: 'fame', type: 'FAME_HEAT_CHANGED', heatDelta });

    expect(base.selfPlayerMoraleDelta).toBe(
      heatDelta * MORALE_TUNING.modifierMultipliers.fameHeatDeltaMoraleScale,
    );
    expect(base.teamFanMoraleDelta).toBe(0);
    expect(base.otherTouched).toEqual([]);
  });

  test('off-kind heatDelta does not alter that tap kind base consequence', () => {
    const withStrayHeatDelta = getBaseMoraleConsequence({
      kind: 'race',
      type: 'ALL_STAR_SNUB',
      heatDelta: 99,
    });
    const withoutHeatDelta = getBaseMoraleConsequence({
      kind: 'race',
      type: 'ALL_STAR_SNUB',
    });

    expect(withStrayHeatDelta).toEqual(withoutHeatDelta);
    expect(withStrayHeatDelta.selfPlayerMoraleDelta).toBe(MORALE_TUNING.eventDelta.raceSnubSelf);
    expect(withStrayHeatDelta.teamFanMoraleDelta).toBe(0);
  });

  test('relationship tap requires kind routing and returns a fresh non-neutral consequence', () => {
    const typeOnly = composeMoraleConsequence(
      { type: 'feud' },
      'EGOTISTICAL',
      neutralModifiers,
      50,
      50,
    );
    const relationship = composeMoraleConsequence(
      { kind: 'relationship', type: 'feud' },
      'EGOTISTICAL',
      neutralModifiers,
      50,
      50,
    );

    expect(typeOnly.isNeutral).toBe(true);
    expect(relationship.isNeutral).toBe(false);
    expect(relationship.base.reason).toBe('relationship.feud.player2');
    expect(relationship.selfPlayerMoraleDelta).toBeLessThan(0);
  });

  test('relationship feud target hit amplifies for egotistical and timid players', () => {
    const event: MoraleMatrixEvent = { kind: 'relationship', type: 'feud' };
    const egotistical = compose(event, {}, 'EGOTISTICAL');
    const relaxed = compose(event, {}, 'RELAXED');
    const timid = compose(event, {}, 'TIMID');
    const tough = compose(event, {}, 'TOUGH');

    expect(egotistical.isNeutral).toBe(false);
    expect(egotistical.selfPlayerMoraleDelta).toBeLessThan(relaxed.selfPlayerMoraleDelta);
    expect(timid.selfPlayerMoraleDelta).toBeLessThan(tough.selfPlayerMoraleDelta);
  });

  test('relationship participant roles preserve asymmetric legacy deltas', () => {
    const feudAggressor = compose({ kind: 'relationship', type: 'FEUD', relationshipRole: 'player1' });
    const feudTarget = compose({ kind: 'relationship', type: 'FEUD', relationshipRole: 'player2' });
    const mentor = compose({ kind: 'relationship', type: 'MENTORSHIP', relationshipRole: 'player1' });
    const protege = compose({ kind: 'relationship', type: 'MENTORSHIP', relationshipRole: 'player2' });

    expect(feudAggressor.base.selfPlayerMoraleDelta).toBe(3);
    expect(feudTarget.base.selfPlayerMoraleDelta).toBe(-10);
    expect(mentor.base.selfPlayerMoraleDelta).toBe(4);
    expect(protege.base.selfPlayerMoraleDelta).toBe(7);
  });

  test('relationship base deltas stay byte-identical after MORALE_EFFECTS de-duplication', () => {
    expect(RELATIONSHIP_MORALE_BASE_DELTAS).toEqual({
      RIVALRY: { player1: -5, player2: -5 },
      FEUD: { player1: 3, player2: -10 },
      FRIENDSHIP: { player1: 6, player2: 6 },
      MENTORSHIP: { player1: 4, player2: 7 },
    });
  });

  test('charged relationship matchup result direction is personality-scaled', () => {
    const winEvent: MoraleMatrixEvent = {
      kind: 'relationship',
      type: 'RIVALRY',
      chargedMatchupResult: 'win',
    };
    const lossEvent: MoraleMatrixEvent = {
      kind: 'relationship',
      type: 'RIVALRY',
      chargedMatchupResult: 'loss',
    };

    const egotisticalWin = compose(winEvent, {}, 'EGOTISTICAL');
    const relaxedWin = compose(winEvent, {}, 'RELAXED');
    const timidLoss = compose(lossEvent, {}, 'TIMID');
    const toughLoss = compose(lossEvent, {}, 'TOUGH');
    const lowFanWin = composeMoraleConsequence(winEvent, 'RELAXED', neutralModifiers, 50, 0);
    const highFanLoss = composeMoraleConsequence(lossEvent, 'TOUGH', neutralModifiers, 50, 99);

    expect(egotisticalWin.base).toMatchObject({
      selfPlayerMoraleDelta: MORALE_TUNING.eventDelta.winSelf,
      reason: 'relationship.charged_matchup.win',
    });
    expect(egotisticalWin.selfPlayerMoraleDelta).toBeGreaterThan(relaxedWin.selfPlayerMoraleDelta);
    expect(egotisticalWin.selfPlayerMoraleDelta).toBeGreaterThan(0);
    expect(lowFanWin.fanMoraleToPlayerMoraleDelta).toBe(0);
    expect(lowFanWin.totalPlayerMoraleDelta).toBeGreaterThan(0);

    expect(timidLoss.base).toMatchObject({
      selfPlayerMoraleDelta: MORALE_TUNING.eventDelta.lossSelf,
      reason: 'relationship.charged_matchup.loss',
    });
    expect(timidLoss.selfPlayerMoraleDelta).toBeLessThan(toughLoss.selfPlayerMoraleDelta);
    expect(timidLoss.selfPlayerMoraleDelta).toBeLessThan(0);
    expect(highFanLoss.fanMoraleToPlayerMoraleDelta).toBe(0);
    expect(highFanLoss.totalPlayerMoraleDelta).toBeLessThan(0);
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
