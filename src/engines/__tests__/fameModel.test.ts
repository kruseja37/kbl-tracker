import { describe, expect, test } from 'vitest';

import {
  FAME_TIER_RANK,
  FAME_TUNING,
  aggregateChannelFame,
  aggregateDefensiveFame,
  aggregateRolePlayerFame,
  applyHeatUpdate,
  applyTradeReset,
  applyWarLegitimacyGravity,
  classifyFameVsMerit,
  createIconicEventFameInput,
  getBaseIconicFameValue,
  resolveFameTier,
  updateReachFloor,
  type ChannelTaggedFameInput,
  type FameModelRecord,
} from '../fameModel';

describe('fameModel L6a pure engine', () => {
  test('same input resolves deterministically', () => {
    const first = applyHeatUpdate(12, 2.5);
    const second = applyHeatUpdate(12, 2.5);

    expect(second).toBe(first);
  });

  test('heat decays toward neutral over updates', () => {
    const positive = applyHeatUpdate(20, 0);
    const negative = applyHeatUpdate(-20, 0);

    expect(positive).toBeLessThan(20);
    expect(positive).toBeGreaterThan(0);
    expect(negative).toBeGreaterThan(-20);
    expect(negative).toBeLessThan(0);
  });

  test('reach ratchets up and never erodes in-season', () => {
    const localFloor = updateReachFloor(FAME_TIER_RANK.UNKNOWN, 4);
    const nationalFloor = updateReachFloor(localFloor, 18);
    const stillNational = updateReachFloor(nationalFloor, 1);

    expect(localFloor).toBe(FAME_TIER_RANK.LOCAL_HERO);
    expect(nationalFloor).toBe(FAME_TIER_RANK.NATIONAL_ICON);
    expect(stillNational).toBe(FAME_TIER_RANK.NATIONAL_ICON);
  });

  test('display tier is Heat floored at Reach', () => {
    const tier = resolveFameTier(4, FAME_TIER_RANK.NATIONAL_ICON);

    expect(tier).toBe('NATIONAL_ICON');
  });

  test('trade reset drops reach floor and pulls Heat toward Unknown while retaining some', () => {
    const record: FameModelRecord = {
      heat: 24,
      reachFloor: FAME_TIER_RANK.NATIONAL_ICON,
      wasNegative: false,
    };

    const reset = applyTradeReset(record);

    expect(reset.reachFloor).toBe(FAME_TUNING.tradeReset.reachFloorAfterTrade);
    expect(reset.heat).toBeLessThan(record.heat);
    expect(reset.heat).toBeGreaterThan(0);
    expect(reset.wasNegative).toBe(false);
  });

  test('WAR legitimacy floor gravity lifts Heat toward the floor but never lowers it', () => {
    const quietStarHeat = applyWarLegitimacyGravity(0, 'elite');
    const overexposedLowMeritHeat = applyWarLegitimacyGravity(20, 'low');

    expect(quietStarHeat).toBeGreaterThan(0);
    expect(overexposedLowMeritHeat).toBe(20);
  });

  test('WAR legitimacy gravity never decreases Heat across merit and raw floor inputs', () => {
    const lowMeritAtOrAboveFloor = applyWarLegitimacyGravity(20, 'low');
    const eliteMeritBelowFloor = applyWarLegitimacyGravity(0, 'elite');
    const rawFloorBelowCurrent = applyWarLegitimacyGravity(15, 5);
    const rawFloorAboveCurrent = applyWarLegitimacyGravity(5, 15);

    expect(lowMeritAtOrAboveFloor).toBe(20);
    expect(eliteMeritBelowFloor).toBeGreaterThan(0);
    expect(eliteMeritBelowFloor).toBeLessThanOrEqual(FAME_TUNING.warGravity.meritHeatTarget.elite);
    expect(rawFloorBelowCurrent).toBe(15);
    expect(rawFloorAboveCurrent).toBeGreaterThan(5);
    expect(rawFloorAboveCurrent).toBeLessThanOrEqual(15);
  });

  test('fame-vs-merit classifies snub and bust', () => {
    expect(classifyFameVsMerit('UNKNOWN', 'elite')).toBe('snub');
    expect(classifyFameVsMerit('NATIONAL_ICON', 'low')).toBe('bust');
  });

  test('channel aggregation sums with channel sub-aggregates', () => {
    const inputs: ChannelTaggedFameInput[] = [
      { channel: 'wpa_spine', fame: 1.5 },
      { channel: 'defensive', fame: 2 },
      { channel: 'role_player', fame: 3 },
      { channel: 'defensive', fame: 0.5 },
    ];

    const aggregate = aggregateChannelFame(inputs);

    expect(aggregate.total).toBe(7);
    expect(aggregate.byChannel.defensive).toBe(2.5);
    expect(aggregateDefensiveFame(inputs)).toBe(2.5);
    expect(aggregateRolePlayerFame(inputs)).toBe(3);
  });

  test('iconic-event helper retains the FAME_VALUES catalog and calculateFame scoring', () => {
    const base = getBaseIconicFameValue('WALK_OFF_HR');
    const input = createIconicEventFameInput({ eventType: 'WALK_OFF_HR', leverageIndex: 4 });

    expect(base).toBe(1.5);
    expect(input).toEqual({
      channel: 'iconic_event',
      fame: 3,
    });
  });
});
