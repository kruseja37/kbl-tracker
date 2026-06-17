import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  clearFranchiseTrustedValueDatabaseForTests,
  freezeTrustedValueArtifactForSeason,
  FRANCHISE_TRUSTED_VALUE_CONTRACT_VERSION,
  FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD,
  getTrustedValueArtifact,
  initFranchiseTrustedValueDatabase,
  persistTrustedValueArtifact,
  resetFranchiseTrustedValueDatabaseForTests,
  type FranchiseTrustedValueArtifact,
} from '../franchiseTrustedValueStorage';

function artifact(overrides: Partial<FranchiseTrustedValueArtifact> = {}): FranchiseTrustedValueArtifact {
  return {
    franchiseId: 'franchise-d6',
    seasonId: 'season-d6',
    statsScopeId: 'season-d6',
    seasonNumber: 1,
    contractVersion: FRANCHISE_TRUSTED_VALUE_CONTRACT_VERSION,
    peerPoolMinThreshold: FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD,
    trustedPlayerIds: ['trusted-1'],
    blockedRows: [
      {
        playerId: 'blocked-1',
        reasons: ['Position SS peer pool size 1 (< 2 required)'],
      },
    ],
    rosterStateSnapshot: [
      { playerId: 'trusted-1', teamId: 'team-1', rosterStatus: 'MLB' },
      { playerId: 'blocked-1', teamId: 'team-2', rosterStatus: 'MLB' },
    ],
    frozen: false,
    frozenAt: null,
    computedAt: 1781568000000,
    ...overrides,
  };
}

describe('franchise trusted value artifact storage', () => {
  beforeEach(async () => {
    resetFranchiseTrustedValueDatabaseForTests();
    await clearFranchiseTrustedValueDatabaseForTests();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearFranchiseTrustedValueDatabaseForTests();
    resetFranchiseTrustedValueDatabaseForTests();
  });

  test('round-trips one live trusted-value artifact per franchise season stats scope', async () => {
    const saved = await persistTrustedValueArtifact(artifact());

    const db = await initFranchiseTrustedValueDatabase();
    expect(db.name).toBe('kbl-tracker');
    expect(Array.from(db.objectStoreNames)).toContain('franchiseTrustedValueArtifacts');

    await expect(getTrustedValueArtifact('franchise-d6', 'season-d6', 'season-d6')).resolves.toEqual(saved);

    const replacement = artifact({
      trustedPlayerIds: ['trusted-2'],
      blockedRows: [],
      computedAt: 1781568060000,
    });
    await persistTrustedValueArtifact(replacement);

    await expect(getTrustedValueArtifact('franchise-d6', 'season-d6', 'season-d6')).resolves.toEqual(replacement);
  });

  test('freezes an existing artifact idempotently without restamping frozenAt', async () => {
    await persistTrustedValueArtifact(artifact());
    let now = 1781654400000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    const firstFreeze = await freezeTrustedValueArtifactForSeason({
      franchiseId: 'franchise-d6',
      seasonId: 'season-d6',
      statsScopeId: 'season-d6',
    });
    now = 1781740800000;
    const secondFreeze = await freezeTrustedValueArtifactForSeason({
      franchiseId: 'franchise-d6',
      seasonId: 'season-d6',
      statsScopeId: 'season-d6',
    });

    expect(firstFreeze).toMatchObject({
      frozen: true,
      frozenAt: 1781654400000,
    });
    expect(secondFreeze?.frozenAt).toBe(1781654400000);
    await expect(getTrustedValueArtifact('franchise-d6', 'season-d6', 'season-d6')).resolves.toMatchObject({
      frozen: true,
      frozenAt: 1781654400000,
    });
  });

  test('refuses to overwrite a frozen artifact with a non-frozen recompute artifact', async () => {
    const frozenArtifact = artifact({
      frozen: true,
      frozenAt: 1781654400000,
      trustedPlayerIds: ['trusted-before-freeze'],
    });
    await persistTrustedValueArtifact(frozenArtifact);

    const warned = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const attemptedThaw = artifact({
      frozen: false,
      frozenAt: null,
      trustedPlayerIds: ['trusted-after-thaw'],
      computedAt: 1781740800000,
    });
    const result = await persistTrustedValueArtifact(attemptedThaw);

    expect(result).toEqual(frozenArtifact);
    expect(warned).toHaveBeenCalledWith(
      '[TrustedValue] refused to overwrite a frozen artifact',
      ['franchise-d6', 'season-d6', 'season-d6'],
    );
    await expect(getTrustedValueArtifact('franchise-d6', 'season-d6', 'season-d6')).resolves.toEqual(frozenArtifact);
  });
});
