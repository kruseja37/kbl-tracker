import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  acceptRebrandOffer,
  getRebrandOffer,
} from '../franchiseRebrandOffer';
import { executeRebrandCascade, type ExecuteRebrandCascadeResult } from '../franchiseRebrandApply';
import {
  REBRAND_DWELL_BAND_MAX,
  REBRAND_DWELL_TRIGGER_GAMES,
} from '../franchiseRebrandDwell';
import {
  setFranchisePhase2L14EnabledForTests,
} from '../franchisePhase2Flags';
import {
  applyFranchiseMoraleEffect,
  resetFranchiseMoraleDatabaseForTests,
  type FranchiseMoraleScope,
} from '../franchiseMoraleState';

vi.mock('../franchiseRebrandApply', () => ({
  executeRebrandCascade: vi.fn(),
}));

const scope: FranchiseMoraleScope = {
  franchiseId: 'franchise-l14-3',
  seasonId: 'franchise-l14-3-season-1',
  statsScopeId: 'franchise-l14-3-season-1',
  seasonNumber: 1,
};

const cascadeInput = {
  scope,
  teamId: 'team-alpha',
  newTeamName: 'New Alpha',
  newCity: 'Fort Collins',
  seasonNumber: 1,
  gameNumber: 42,
  seed: 'l14-3-test-seed',
};

function rockBottomSeries(length: number): number[] {
  return Array.from({ length }, (_unused, index) =>
    REBRAND_DWELL_BAND_MAX - (index % 2),
  );
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

async function resetMoraleDatabase(): Promise<void> {
  resetFranchiseMoraleDatabaseForTests();
  await deleteDatabase('kbl-franchise-morale');
}

async function seedTeamFanHistory(teamId: string, values: readonly number[]): Promise<void> {
  let previousValue = 50;

  for (const [index, value] of values.entries()) {
    await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'team-fan',
      teamId,
      delta: value - previousValue,
      reason: `seed morale ${index + 1}`,
      sourceEventId: `seed:${teamId}:${index + 1}`,
      sourceKind: 'manual-override',
      timestamp: `2026-06-21T00:${String(index).padStart(2, '0')}:00.000Z`,
    });
    previousValue = value;
  }
}

describe('franchise rebrand offer reader', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.mocked(executeRebrandCascade).mockReset();
    setFranchisePhase2L14EnabledForTests(null);
    await resetMoraleDatabase();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2L14EnabledForTests(null);
    await resetMoraleDatabase();
  });

  test('returns an unoffered dark-noop while the L14 flag is disabled', async () => {
    await seedTeamFanHistory('team-alpha', rockBottomSeries(REBRAND_DWELL_TRIGGER_GAMES));

    await expect(getRebrandOffer(scope, 'team-alpha')).resolves.toEqual({
      offered: false,
      consecutiveRockBottomGames: 0,
    });
  });

  test('offers the rebrand when history has the trigger-length rock-bottom dwell', async () => {
    setFranchisePhase2L14EnabledForTests(true);
    await seedTeamFanHistory('team-alpha', rockBottomSeries(REBRAND_DWELL_TRIGGER_GAMES));

    await expect(getRebrandOffer(scope, 'team-alpha')).resolves.toEqual({
      offered: true,
      consecutiveRockBottomGames: REBRAND_DWELL_TRIGGER_GAMES,
    });
  });

  test('does not offer the rebrand when a recovery breaks recent rock-bottom dwell', async () => {
    setFranchisePhase2L14EnabledForTests(true);
    await seedTeamFanHistory('team-alpha', [
      ...rockBottomSeries(REBRAND_DWELL_TRIGGER_GAMES),
      REBRAND_DWELL_BAND_MAX + 1,
      REBRAND_DWELL_BAND_MAX,
      REBRAND_DWELL_BAND_MAX - 1,
    ]);

    await expect(getRebrandOffer(scope, 'team-alpha')).resolves.toEqual({
      offered: false,
      consecutiveRockBottomGames: 2,
    });
  });

  test('accept fails without running the cascade when the team is unarmed', async () => {
    setFranchisePhase2L14EnabledForTests(true);
    await seedTeamFanHistory('team-alpha', [REBRAND_DWELL_BAND_MAX]);

    await expect(acceptRebrandOffer(cascadeInput)).resolves.toEqual({
      status: 'failed',
      teamId: 'team-alpha',
      idempotencyKey: 'rebrand:team-alpha:1:42',
      reason: 'rebrand not offered',
      blockers: ['rebrand not offered'],
    });
    expect(executeRebrandCascade).not.toHaveBeenCalled();
  });

  test('accept delegates to the cascade when the team is armed', async () => {
    setFranchisePhase2L14EnabledForTests(true);
    await seedTeamFanHistory('team-alpha', rockBottomSeries(REBRAND_DWELL_TRIGGER_GAMES));
    const cascadeResult: ExecuteRebrandCascadeResult = {
      status: 'applied',
      teamId: 'team-alpha',
      idempotencyKey: 'rebrand:team-alpha:1:42',
    };
    vi.mocked(executeRebrandCascade).mockResolvedValue(cascadeResult);

    await expect(acceptRebrandOffer(cascadeInput)).resolves.toBe(cascadeResult);
    expect(executeRebrandCascade).toHaveBeenCalledTimes(1);
    expect(executeRebrandCascade).toHaveBeenCalledWith(cascadeInput);
  });
});
