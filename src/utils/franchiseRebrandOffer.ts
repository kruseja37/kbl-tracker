import {
  executeRebrandCascade,
  type ExecuteRebrandCascadeInput,
  type ExecuteRebrandCascadeResult,
} from './franchiseRebrandApply';
import { computeRebrandDwell } from './franchiseRebrandDwell';
import { isFranchisePhase2L14Enabled } from './franchisePhase2Flags';
import {
  getFranchiseMoraleSnapshot,
  type FranchiseMoraleScope,
  type FranchiseMoraleSnapshot,
} from './franchiseMoraleState';

export interface RebrandOffer {
  offered: boolean;
  consecutiveRockBottomGames: number;
}

function rebrandIdempotencyKey(
  input: Pick<ExecuteRebrandCascadeInput, 'teamId' | 'seasonNumber' | 'gameNumber'>,
): string {
  return `rebrand:${input.teamId}:${input.seasonNumber}:${input.gameNumber}`;
}

function failedRebrandOfferResult(input: ExecuteRebrandCascadeInput): ExecuteRebrandCascadeResult {
  const reason = 'rebrand not offered';
  return {
    status: 'failed',
    teamId: input.teamId,
    idempotencyKey: rebrandIdempotencyKey(input),
    reason,
    blockers: [reason],
  };
}

function currentValueSeriesFromHistory(snapshot: FranchiseMoraleSnapshot | null): number[] {
  if (!snapshot) return [];

  const series = snapshot.history.map((entry) => entry.currentValue);
  return series.every((value) => Number.isFinite(value)) ? series : [];
}

export async function getRebrandOffer(
  scope: FranchiseMoraleScope,
  teamId: string,
): Promise<RebrandOffer> {
  if (!isFranchisePhase2L14Enabled()) {
    return { offered: false, consecutiveRockBottomGames: 0 };
  }

  const snapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', teamId);
  const result = computeRebrandDwell(currentValueSeriesFromHistory(snapshot));

  return {
    offered: result.armed,
    consecutiveRockBottomGames: result.consecutiveRockBottomGames,
  };
}

export async function acceptRebrandOffer(
  input: ExecuteRebrandCascadeInput,
): Promise<ExecuteRebrandCascadeResult> {
  const offer = await getRebrandOffer(input.scope, input.teamId);
  if (!offer.offered) {
    return failedRebrandOfferResult(input);
  }

  return executeRebrandCascade(input);
}
