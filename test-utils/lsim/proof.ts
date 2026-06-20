import {
  getFranchiseDesignationRows,
  type FranchiseDesignationScopeInput,
} from '../../src/utils/franchiseDesignationStorage';
import { getFranchiseFameRecordRowsByScope } from '../../src/utils/franchiseFameRecordsStorage';
import { getFranchiseRatingsOverlaysByScope } from '../../src/utils/franchiseRatingsOverlayStorage';
import { getFranchiseTrueValueRows } from '../../src/utils/franchiseTrueValueStorage';

export interface LsimSoulStoreCounts {
  trueValueRows: number;
  fameRows: number;
  fameRowsWithWpaSpine: number;
  designationRows: number;
  ratingsOverlays: number;
  pendingRatingsDevelopmentOverlays: number;
}

export interface LsimSoulProofState {
  counts: LsimSoulStoreCounts;
  trueValueRows: Awaited<ReturnType<typeof getFranchiseTrueValueRows>>;
  fameRows: Awaited<ReturnType<typeof getFranchiseFameRecordRowsByScope>>;
  designationRows: Awaited<ReturnType<typeof getFranchiseDesignationRows>>;
  ratingsOverlays: Awaited<ReturnType<typeof getFranchiseRatingsOverlaysByScope>>;
}

export async function readLsimSoulProofState(scope: FranchiseDesignationScopeInput): Promise<LsimSoulProofState> {
  const [trueValueRows, fameRows, designationRows, ratingsOverlays] = await Promise.all([
    getFranchiseTrueValueRows(scope),
    getFranchiseFameRecordRowsByScope(scope),
    getFranchiseDesignationRows(scope),
    getFranchiseRatingsOverlaysByScope(scope),
  ]);

  return {
    counts: {
      trueValueRows: trueValueRows.length,
      fameRows: fameRows.length,
      fameRowsWithWpaSpine: fameRows.filter((row) => Number(row.channelByChannel?.wpa_spine) > 0 && row.reachFloor >= 0).length,
      designationRows: designationRows.length,
      ratingsOverlays: ratingsOverlays.length,
      pendingRatingsDevelopmentOverlays: ratingsOverlays.filter(
        (row) =>
          row.source === 'ratings-development' &&
          row.confirmationStatus === 'pending' &&
          row.kind === 'permanent' &&
          row.delta !== 0,
      ).length,
    },
    trueValueRows,
    fameRows,
    designationRows,
    ratingsOverlays,
  };
}

export function summarizeLsimCounts(state: LsimSoulProofState): LsimSoulStoreCounts {
  return state.counts;
}
