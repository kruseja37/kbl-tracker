import { FAME_TIER_RANK, FAME_TUNING, applyHonorHeatBump } from '../engines/fameModel';
import { getFranchiseFameRecord, saveFranchiseFameRecordRows } from './franchiseFameRecordsStorage';
import { isFranchisePhase2FameEnabled, isFranchisePhase2L12Enabled } from './franchisePhase2Flags';

export type FranchiseHonorTier =
  | 'mvp'
  | 'cyYoung'
  | 'silverSlugger'
  | 'goldGlove'
  | 'rookie'
  | 'reliever'
  | 'benchPlayer'
  | 'boogerGlove'
  | 'allStarStarter'
  | 'allStarReserve';

export const franchiseHonorReachFloorSeam = {
  getRecord: getFranchiseFameRecord,
  saveRecords: saveFranchiseFameRecordRows,
};

export async function applyFranchiseHonorReachFloor(params: {
  honorees: ReadonlyArray<{ playerId: string; honorTier: FranchiseHonorTier }>;
  scope: { franchiseId: string; seasonId: string; statsScopeId: string };
  // e.g. 'season-end-honor' or 'all-star-lock' so the next per-game fame write does not clobber the ratchet.
  checkpointSentinel: string;
}): Promise<{ status: 'dark-noop' | 'ratcheted'; ratchetedCount: number; reason?: string }> {
  if (!isFranchisePhase2L12Enabled()) {
    return { status: 'dark-noop', ratchetedCount: 0, reason: 'L12 disabled' };
  }

  // Fame is the substrate: no Fame flag means there is no per-game fame row to ratchet.
  if (!isFranchisePhase2FameEnabled()) {
    return { status: 'dark-noop', ratchetedCount: 0, reason: 'Fame disabled (no record substrate)' };
  }

  const bumpByPlayerId = new Map<string, number>();
  for (const honoree of params.honorees) {
    bumpByPlayerId.set(
      honoree.playerId,
      (bumpByPlayerId.get(honoree.playerId) ?? 0) + FAME_TUNING.honorHeatBump[honoree.honorTier],
    );
  }

  let ratchetedCount = 0;
  for (const [playerId, summedBump] of bumpByPlayerId) {
    const row = await franchiseHonorReachFloorSeam.getRecord(params.scope, playerId);
    // No fame record yet means there is no existing row to ratchet.
    if (!row) continue;

    const newHeat = applyHonorHeatBump(row.heat, summedBump);
    const newReachFloor = Math.max(row.reachFloor, FAME_TIER_RANK.REGIONAL_STAR);
    await franchiseHonorReachFloorSeam.saveRecords([
      {
        ...row,
        heat: newHeat,
        reachFloor: newReachFloor,
        updatedAtCheckpoint: params.checkpointSentinel,
      },
    ]);
    ratchetedCount += 1;
  }

  return { status: 'ratcheted', ratchetedCount };
}
