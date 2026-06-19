import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  FAME_TUNING,
  applyHeatUpdate,
  applyHonorHeatBump,
  updateReachFloor,
} from '../../engines/fameModel';
import {
  applyFranchiseHonorReachFloor,
  franchiseHonorReachFloorSeam,
  type FranchiseHonorTier,
} from '../franchiseHonorReachFloor';
import {
  setFranchisePhase2FameEnabledForTests,
  setFranchisePhase2L12EnabledForTests,
} from '../franchisePhase2Flags';
import type { FranchiseFameRecordRow } from '../franchiseFameRecordsStorage';

const scope = {
  franchiseId: 'franchise-honor',
  seasonId: 'season-honor',
  statsScopeId: 'stats-honor',
};

function fameRow(
  playerId: string,
  overrides: Partial<FranchiseFameRecordRow> = {},
): FranchiseFameRecordRow {
  return {
    ...scope,
    playerId,
    heat: 0,
    reachFloor: 0,
    wasNegative: false,
    channelTotal: 0,
    channelByChannel: {
      wpa_spine: 0,
      iconic_event: 0,
      status: 0,
      defensive: 0,
      role_player: 0,
    },
    defensiveFame: 0,
    rolePlayerFame: 0,
    updatedAtCheckpoint: 'pre-honor',
    ...overrides,
  };
}

function mockSeam(rowsByPlayerId: Record<string, FranchiseFameRecordRow | null>) {
  const getRecord = vi
    .spyOn(franchiseHonorReachFloorSeam, 'getRecord')
    .mockImplementation(async (_scope, playerId) => rowsByPlayerId[playerId] ?? null);
  const saveRecords = vi
    .spyOn(franchiseHonorReachFloorSeam, 'saveRecords')
    .mockResolvedValue([]);

  return { getRecord, saveRecords };
}

describe('franchise honor reach-floor ratchet', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L12EnabledForTests(null);
    setFranchisePhase2FameEnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L12EnabledForTests(null);
    setFranchisePhase2FameEnabledForTests(null);
  });

  test('applyHonorHeatBump adds without applying the per-game heat decay trap', () => {
    expect(applyHonorHeatBump(10, 5)).toBe(15);
    expect(applyHeatUpdate(10, 5)).toBe(13.5);
    expect(applyHonorHeatBump(10, 5)).not.toBe(applyHeatUpdate(10, 5));
  });

  test('honorHeatBump ladder is monotonic from MVP down through All-Star reserve', () => {
    expect(FAME_TUNING.honorHeatBump.mvp)
      .toBeGreaterThanOrEqual(FAME_TUNING.honorHeatBump.cyYoung);
    expect(FAME_TUNING.honorHeatBump.cyYoung)
      .toBeGreaterThanOrEqual(FAME_TUNING.honorHeatBump.allStarStarter);
    expect(FAME_TUNING.honorHeatBump.allStarStarter)
      .toBeGreaterThanOrEqual(FAME_TUNING.honorHeatBump.allStarReserve);
  });

  test('L12 off returns dark-noop before any seam call', async () => {
    setFranchisePhase2L12EnabledForTests(false);
    setFranchisePhase2FameEnabledForTests(true);
    const getRecord = vi.spyOn(franchiseHonorReachFloorSeam, 'getRecord');
    const saveRecords = vi.spyOn(franchiseHonorReachFloorSeam, 'saveRecords');

    const result = await applyFranchiseHonorReachFloor({
      honorees: [{ playerId: 'mvp', honorTier: 'mvp' }],
      scope,
      checkpointSentinel: 'season-end-honor',
    });

    expect(result).toEqual({ status: 'dark-noop', ratchetedCount: 0, reason: 'L12 disabled' });
    expect(getRecord).not.toHaveBeenCalled();
    expect(saveRecords).not.toHaveBeenCalled();
  });

  test('Fame off returns dark-noop before any seam call', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    setFranchisePhase2FameEnabledForTests(false);
    const getRecord = vi.spyOn(franchiseHonorReachFloorSeam, 'getRecord');
    const saveRecords = vi.spyOn(franchiseHonorReachFloorSeam, 'saveRecords');

    const result = await applyFranchiseHonorReachFloor({
      honorees: [{ playerId: 'mvp', honorTier: 'mvp' }],
      scope,
      checkpointSentinel: 'season-end-honor',
    });

    expect(result).toEqual({
      status: 'dark-noop',
      ratchetedCount: 0,
      reason: 'Fame disabled (no record substrate)',
    });
    expect(getRecord).not.toHaveBeenCalled();
    expect(saveRecords).not.toHaveBeenCalled();
  });

  test('recordless honoree is skipped and not counted', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    setFranchisePhase2FameEnabledForTests(true);
    const { getRecord, saveRecords } = mockSeam({ missing: null });

    const result = await applyFranchiseHonorReachFloor({
      honorees: [{ playerId: 'missing', honorTier: 'cyYoung' }],
      scope,
      checkpointSentinel: 'season-end-honor',
    });

    expect(result).toEqual({ status: 'ratcheted', ratchetedCount: 0 });
    expect(getRecord).toHaveBeenCalledWith(scope, 'missing');
    expect(saveRecords).not.toHaveBeenCalled();
  });

  test('found honoree is heat-bumped, floor-ratcheted, and saved with the checkpoint sentinel', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    setFranchisePhase2FameEnabledForTests(true);
    const oldRow = fameRow('winner', { heat: 4, reachFloor: 1 });
    const { getRecord, saveRecords } = mockSeam({ winner: oldRow });
    const sentinel = 'season-end-honor';
    const newHeat = applyHonorHeatBump(oldRow.heat, FAME_TUNING.honorHeatBump.mvp);
    const newReachFloor = updateReachFloor(oldRow.reachFloor, newHeat);

    const result = await applyFranchiseHonorReachFloor({
      honorees: [{ playerId: 'winner', honorTier: 'mvp' }],
      scope,
      checkpointSentinel: sentinel,
    });

    expect(result).toEqual({ status: 'ratcheted', ratchetedCount: 1 });
    expect(getRecord).toHaveBeenCalledWith(scope, 'winner');
    expect(saveRecords).toHaveBeenCalledWith([
      {
        ...oldRow,
        heat: newHeat,
        reachFloor: newReachFloor,
        updatedAtCheckpoint: sentinel,
      },
    ]);
  });

  test('All-Star starter bump is larger than reserve bump for the same starting heat', () => {
    const startingHeat = 2;
    const starterHeat = applyHonorHeatBump(
      startingHeat,
      FAME_TUNING.honorHeatBump.allStarStarter,
    );
    const reserveHeat = applyHonorHeatBump(
      startingHeat,
      FAME_TUNING.honorHeatBump.allStarReserve,
    );

    expect(starterHeat).toBeGreaterThan(reserveHeat);
    expect(updateReachFloor(0, starterHeat)).toBeGreaterThan(updateReachFloor(0, reserveHeat));
  });

  test('ratchetedCount counts only honorees with existing fame rows', async () => {
    setFranchisePhase2L12EnabledForTests(true);
    setFranchisePhase2FameEnabledForTests(true);
    const found = fameRow('found', { heat: 7, reachFloor: 1 });
    const { saveRecords } = mockSeam({
      found,
      missing: null,
    });

    const result = await applyFranchiseHonorReachFloor({
      honorees: [
        { playerId: 'missing', honorTier: 'allStarReserve' },
        { playerId: 'found', honorTier: 'allStarStarter' },
      ] satisfies Array<{ playerId: string; honorTier: FranchiseHonorTier }>,
      scope,
      checkpointSentinel: 'all-star-lock',
    });

    expect(result).toEqual({ status: 'ratcheted', ratchetedCount: 1 });
    expect(saveRecords).toHaveBeenCalledTimes(1);
    expect(saveRecords.mock.calls[0][0][0]).toMatchObject({
      playerId: 'found',
      heat: applyHonorHeatBump(found.heat, FAME_TUNING.honorHeatBump.allStarStarter),
      reachFloor: updateReachFloor(
        found.reachFloor,
        applyHonorHeatBump(found.heat, FAME_TUNING.honorHeatBump.allStarStarter),
      ),
      updatedAtCheckpoint: 'all-star-lock',
    });
  });
});
