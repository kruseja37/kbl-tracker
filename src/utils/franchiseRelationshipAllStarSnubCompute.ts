import { computeRelationshipIntensity } from '../engines/relationshipIntensity';
import type { PersistedGameState } from './gameStorage';
import {
  franchiseRelationshipEdgeId,
  getFranchiseRelationshipEdge,
  putFranchiseRelationshipEdge,
  type FranchiseRelationshipEdgeScopeInput,
  type RelationshipEdgeRow,
} from './franchiseRelationshipEdgesStorage';
import {
  getRelationshipParticipantTeams,
  isChargedRelationshipMatchup,
} from './franchiseRelationshipIntensityCompute';
import { isFranchisePhase2L13Enabled } from './franchisePhase2Flags';

type AllStarSnubRivalryScope = FranchiseRelationshipEdgeScopeInput & {
  franchiseId: string;
  seasonNumber: number;
};

export const ALL_STAR_SNUB_RIVALRY_TUNING = { accuracy: 1 } as const;
// Intensity is the lifecycle seed baseline, not a tuning knob for All-Star snubs.

export async function persistAllStarSnubRivalryEdges(params: {
  gameState: PersistedGameState;
  pairs: ReadonlyArray<{ snubbedPlayerId: string; selectedPlayerId: string }>;
  scope: AllStarSnubRivalryScope;
  lockGameNumber: number;
  timestamp: number;
}): Promise<{ status: 'dark-noop' | 'written'; written: number; reason?: string }> {
  if (!isFranchisePhase2L13Enabled()) {
    return { status: 'dark-noop', written: 0, reason: 'Phase-2 L13 disabled.' };
  }

  if (!Number.isInteger(params.lockGameNumber) || params.lockGameNumber < 1) {
    return { status: 'dark-noop', written: 0, reason: 'Invalid All-Star lock game number.' };
  }

  const createdAt = params.timestamp > 0 ? params.timestamp : params.lockGameNumber;
  const participants = getRelationshipParticipantTeams(params.gameState);
  const pairsByEdgeId = new Map<string, { snubbed: string; selected: string }>();

  for (const pair of params.pairs) {
    const snubbedPlayerId = pair.snubbedPlayerId;
    const selectedPlayerId = pair.selectedPlayerId;
    if (!snubbedPlayerId || !selectedPlayerId || snubbedPlayerId === selectedPlayerId) continue;

    pairsByEdgeId.set(
      franchiseRelationshipEdgeId(params.scope, snubbedPlayerId, selectedPlayerId, 'RIVALRY'),
      { snubbed: snubbedPlayerId, selected: selectedPlayerId },
    );
  }

  let written = 0;
  for (const [id, pair] of Array.from(pairsByEdgeId.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const existing = await getFranchiseRelationshipEdge(id);
    if (existing) continue;

    const [player1Id, player2Id] = [pair.snubbed, pair.selected].sort((left, right) =>
      left.localeCompare(right),
    ) as [string, string];
    const base: RelationshipEdgeRow = {
      id,
      franchiseId: params.scope.franchiseId,
      seasonId: params.scope.seasonId,
      statsScopeId: params.scope.statsScopeId,
      seasonNumber: params.scope.seasonNumber,
      player1Id,
      player2Id,
      type: 'RIVALRY',
      formationSource: 'asg-snub',
      intensity: 0,
      potential: false,
      accuracy: ALL_STAR_SNUB_RIVALRY_TUNING.accuracy,
      formedAtGameNumber: params.lockGameNumber,
      dissolvedAtGameNumber: null,
      createdAt,
      updatedAt: createdAt,
    };
    const isCharged = isChargedRelationshipMatchup({ player1Id, player2Id }, participants);
    const life = computeRelationshipIntensity(base, {
      gameNumber: params.lockGameNumber,
      isChargedMatchup: isCharged,
    });

    await putFranchiseRelationshipEdge({
      ...base,
      intensity: life.intensity,
      dissolvedAtGameNumber: life.dissolvedAtGameNumber,
    });
    written += 1;
  }

  return {
    status: written > 0 ? 'written' : 'dark-noop',
    written,
    reason: written > 0 ? undefined : 'No new All-Star snub edges.',
  };
}
