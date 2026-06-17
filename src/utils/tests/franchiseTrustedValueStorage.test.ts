import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  clearFranchiseTrustedValueDatabaseForTests,
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
});
