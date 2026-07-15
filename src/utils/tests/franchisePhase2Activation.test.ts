import 'fake-indexeddb/auto';

import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  LIVING_SEASON_FLAG_FAMILY,
  hydrateFranchisePhase2ActivationCache,
  resetFranchisePhase2ActivationRecord,
  resetFranchisePhase2ActivationCacheForTests,
  saveFranchisePhase2ActivationRecord,
} from '../franchisePhase2Activation';
import {
  createFranchise,
  LIVING_SEASON_TUNING_PROFILE_VERSION,
  loadFranchise,
} from '../franchiseManager';
import {
  isAuctionAdvisorColorEnabled,
  isFranchisePhase2CheckpointEnabled,
  isFranchisePhase2FameEnabled,
  isFranchisePhase2FlashpointEnabled,
  isFranchisePhase2L10Enabled,
  isFranchisePhase2L11Enabled,
  isFranchisePhase2L12Enabled,
  isFranchisePhase2L13Enabled,
  isFranchisePhase2L14Enabled,
  isFranchisePhase2MoraleEnabled,
  isFranchisePhase2StadiumRecordsEnabled,
  isFranchisePhase2TraitsEnabled,
  setFranchisePhase2CheckpointEnabledForTests,
  setFranchisePhase2FameEnabledForTests,
  setFranchisePhase2FlashpointEnabledForTests,
  setFranchisePhase2L10EnabledForTests,
  setFranchisePhase2L11EnabledForTests,
  setFranchisePhase2L12EnabledForTests,
  setFranchisePhase2L13EnabledForTests,
  setFranchisePhase2L14EnabledForTests,
  setFranchisePhase2MoraleEnabledForTests,
  setFranchisePhase2StadiumRecordsEnabledForTests,
  setFranchisePhase2TraitsEnabledForTests,
  setFranchiseLivingSeasonContext,
  setAuctionAdvisorColorEnabledForTests,
  setSnakeDraftV1EnabledForTests,
} from '../franchisePhase2Flags';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const getters = [
  isFranchisePhase2MoraleEnabled,
  isFranchisePhase2FameEnabled,
  isFranchisePhase2FlashpointEnabled,
  isFranchisePhase2CheckpointEnabled,
  isFranchisePhase2TraitsEnabled,
  isFranchisePhase2L10Enabled,
  isFranchisePhase2L11Enabled,
  isFranchisePhase2L12Enabled,
  isFranchisePhase2L13Enabled,
  isFranchisePhase2L14Enabled,
  isFranchisePhase2StadiumRecordsEnabled,
];

const resetTestSetters = () => {
  setFranchiseLivingSeasonContext(null);
  setFranchisePhase2MoraleEnabledForTests(null);
  setFranchisePhase2FameEnabledForTests(null);
  setFranchisePhase2FlashpointEnabledForTests(null);
  setFranchisePhase2CheckpointEnabledForTests(null);
  setFranchisePhase2TraitsEnabledForTests(null);
  setFranchisePhase2L10EnabledForTests(null);
  setFranchisePhase2L11EnabledForTests(null);
  setFranchisePhase2L12EnabledForTests(null);
  setFranchisePhase2L13EnabledForTests(null);
  setFranchisePhase2L14EnabledForTests(null);
  setFranchisePhase2StadiumRecordsEnabledForTests(null);
  setAuctionAdvisorColorEnabledForTests(null);
  setSnakeDraftV1EnabledForTests(null);
};

describe('franchise Phase-2 activation', () => {
  beforeAll(async () => {
    await deleteDatabase('kbl-app-meta');
  });

  beforeEach(async () => {
    resetTestSetters();
    resetFranchisePhase2ActivationCacheForTests();
    await resetFranchisePhase2ActivationRecord().catch(() => undefined);
  });

  afterEach(async () => {
    resetTestSetters();
    await resetFranchisePhase2ActivationRecord().catch(() => undefined);
    resetFranchisePhase2ActivationCacheForTests();
  });

  test('compiled defaults remain off without persisted activation', () => {
    expect(getters.map((getter) => getter())).toEqual(Array(getters.length).fill(false));
  });

  test('living-season family is explicit and excludes unrelated draft toggles', () => {
    expect(LIVING_SEASON_FLAG_FAMILY).toEqual([
      'morale', 'fame', 'flashpoint', 'checkpoint', 'traits', 'l10', 'l11',
      'l12', 'l13', 'l14', 'stadiumRecords',
    ]);
    expect(LIVING_SEASON_FLAG_FAMILY).not.toContain('auctionAdvisorColor');
  });

  test('creation stamps the immutable living-season provenance only when enabled', async () => {
    const enabledId = await createFranchise('Living Season', { livingSeason: true });
    const legacyId = await createFranchise('Legacy Season');

    expect(await loadFranchise(enabledId)).toMatchObject({
      livingSeason: {
        enabled: true,
        activatedAt: expect.any(String),
        tuningProfileVersion: LIVING_SEASON_TUNING_PROFILE_VERSION,
      },
    });
    expect(Number.isNaN(Date.parse((await loadFranchise(enabledId))!.livingSeason!.activatedAt))).toBe(false);
    expect((await loadFranchise(legacyId))?.livingSeason).toBeUndefined();
  });

  test('franchise switch enables only the family beneath console activation', () => {
    setFranchiseLivingSeasonContext({ enabled: true });

    expect(getters.map((getter) => getter())).toEqual(Array(getters.length).fill(true));
    expect(isAuctionAdvisorColorEnabled()).toBe(true);
  });

  test('console per-flag overrides win in both directions over the franchise switch', async () => {
    setFranchiseLivingSeasonContext({ enabled: true });
    await saveFranchisePhase2ActivationRecord({
      globalEnabled: null,
      flagOverrides: { fame: false },
    });
    expect(isFranchisePhase2FameEnabled()).toBe(false);

    setFranchiseLivingSeasonContext({ enabled: false });
    await saveFranchisePhase2ActivationRecord({
      globalEnabled: null,
      flagOverrides: { fame: true },
    });
    expect(isFranchisePhase2FameEnabled()).toBe(true);
  });

  test('test overrides remain authoritative over console and franchise context', async () => {
    setFranchiseLivingSeasonContext({ enabled: true });
    await saveFranchisePhase2ActivationRecord({
      globalEnabled: true,
      flagOverrides: { fame: true, l13: false },
    });
    setFranchisePhase2FameEnabledForTests(false);
    setFranchisePhase2L13EnabledForTests(true);

    expect(isFranchisePhase2FameEnabled()).toBe(false);
    expect(isFranchisePhase2L13Enabled()).toBe(true);
  });

  test('a persisted global activation record flips getters after hydrate', async () => {
    await saveFranchisePhase2ActivationRecord({ globalEnabled: true, flagOverrides: {} });
    resetFranchisePhase2ActivationCacheForTests();

    expect(isFranchisePhase2MoraleEnabled()).toBe(false);

    await hydrateFranchisePhase2ActivationCache();

    expect(isFranchisePhase2MoraleEnabled()).toBe(true);
    expect(isFranchisePhase2StadiumRecordsEnabled()).toBe(true);
  });

  test('persisted per-flag overrides win over persisted global activation', async () => {
    await saveFranchisePhase2ActivationRecord({
      globalEnabled: true,
      flagOverrides: {
        l12: false,
        stadiumRecords: false,
      },
    });

    expect(isFranchisePhase2FameEnabled()).toBe(true);
    expect(isFranchisePhase2L12Enabled()).toBe(false);
    expect(isFranchisePhase2StadiumRecordsEnabled()).toBe(false);

    await saveFranchisePhase2ActivationRecord({
      globalEnabled: false,
      flagOverrides: {
        traits: true,
      },
    });

    expect(isFranchisePhase2MoraleEnabled()).toBe(false);
    expect(isFranchisePhase2TraitsEnabled()).toBe(true);
  });

  test('test-only setters stay authoritative over persisted activation', async () => {
    await saveFranchisePhase2ActivationRecord({
      globalEnabled: true,
      flagOverrides: {
        fame: true,
        l13: false,
      },
    });

    setFranchisePhase2FameEnabledForTests(false);
    setFranchisePhase2L13EnabledForTests(true);

    expect(isFranchisePhase2FameEnabled()).toBe(false);
    expect(isFranchisePhase2L13Enabled()).toBe(true);

    setFranchisePhase2FameEnabledForTests(null);
    setFranchisePhase2L13EnabledForTests(null);

    expect(isFranchisePhase2FameEnabled()).toBe(true);
    expect(isFranchisePhase2L13Enabled()).toBe(false);
  });
});
