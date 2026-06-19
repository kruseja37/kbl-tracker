import type { AllStarCandidate } from '../engines/franchiseAllStarSelector';
import { emitFranchiseHonorNews } from '../src_figma/app/engines/reporter/franchiseHonorEmission';
import { applyFranchiseHonorReachFloor, type FranchiseHonorTier } from './franchiseHonorReachFloor';
import { applyFranchiseRaceSnubMorale } from './franchiseRaceSnubMorale';
import type { FranchiseAllStarSelection } from './franchiseAllStarRostersStorage';

const ALL_STAR_SNUB_TOP_N = 3;

type AllStarPayoutScope = {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
};

export const franchiseAllStarLockPayoutSeam = {
  emit: emitFranchiseHonorNews,
  applyReachFloor: applyFranchiseHonorReachFloor,
  applySnub: applyFranchiseRaceSnubMorale,
};

export function honoreesFromSelections(
  selections: ReadonlyArray<FranchiseAllStarSelection>,
): { playerId: string; honorTier: Extract<FranchiseHonorTier, 'allStarStarter' | 'allStarReserve'> }[] {
  return selections.map((selection) => ({
    playerId: selection.playerId,
    honorTier: selection.role === 'starter' ? 'allStarStarter' : 'allStarReserve',
  }));
}

function allStarSnubMerit(candidate: AllStarCandidate): number {
  return candidate.hittingMerit ?? candidate.startingMerit ?? candidate.reliefMerit ?? 0;
}

export function pickAllStarSnubVictims(
  candidates: ReadonlyArray<AllStarCandidate>,
  selectedIds: ReadonlySet<string>,
  topN: number,
): { playerId: string; teamId: string }[] {
  if (topN <= 0) return [];

  return candidates
    .filter((candidate) => !selectedIds.has(candidate.playerId))
    .slice()
    .sort((left, right) => {
      const meritDiff = allStarSnubMerit(right) - allStarSnubMerit(left);
      if (meritDiff !== 0) return meritDiff;
      return left.playerId.localeCompare(right.playerId);
    })
    .slice(0, topN)
    .map((candidate) => ({
      playerId: candidate.playerId,
      teamId: candidate.teamId,
    }));
}

export function emitTeamId(selections: ReadonlyArray<FranchiseAllStarSelection>): string | null {
  if (selections.length === 0) return null;

  const counts = new Map<string, number>();
  for (const selection of selections) {
    counts.set(selection.teamId, (counts.get(selection.teamId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null;
}

export async function runFranchiseAllStarLockPayouts(params: {
  selections: FranchiseAllStarSelection[];
  candidates: readonly AllStarCandidate[];
  scope: AllStarPayoutScope;
  timestamp: number;
}): Promise<{ emit: string; reachFloor: string; snub: string }> {
  const reachScope = {
    franchiseId: params.scope.franchiseId,
    seasonId: params.scope.seasonId,
    statsScopeId: params.scope.statsScopeId,
  };

  let reachFloor = 'error';
  try {
    const result = await franchiseAllStarLockPayoutSeam.applyReachFloor({
      honorees: honoreesFromSelections(params.selections),
      scope: reachScope,
      checkpointSentinel: 'all-star-lock',
    });
    reachFloor = result.status;
  } catch {
    reachFloor = 'error';
  }

  let snub = 'error';
  try {
    const result = await franchiseAllStarLockPayoutSeam.applySnub({
      victims: pickAllStarSnubVictims(
        params.candidates,
        new Set(params.selections.map((selection) => selection.playerId)),
        ALL_STAR_SNUB_TOP_N,
      ),
      honorKind: 'ALL_STAR',
      scope: params.scope,
      timestamp: params.timestamp,
    });
    snub = result.status;
  } catch {
    snub = 'error';
  }

  let emit = 'no-team';
  const teamId = emitTeamId(params.selections);
  if (teamId) {
    try {
      const result = await franchiseAllStarLockPayoutSeam.emit({
        honorInput: {
          franchiseId: params.scope.franchiseId,
          seasonId: params.scope.seasonId,
          seasonNumber: params.scope.seasonNumber,
          honorKind: 'ALL_STAR',
          triggerPhase: 'all-star-lock',
          subjectIds: params.selections.map((selection) => selection.playerId),
          facts: { selectedCount: params.selections.length },
        },
        teamId,
      });
      emit = result.status;
    } catch {
      emit = 'error';
    }
  }

  return { emit, reachFloor, snub };
}
