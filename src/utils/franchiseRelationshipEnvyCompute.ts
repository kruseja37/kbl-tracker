import { computeRelationshipIntensity } from '../engines/relationshipIntensity';
import {
  franchiseRelationshipEdgeId,
  getFranchiseRelationshipEdge,
  putFranchiseRelationshipEdge,
  type FranchiseRelationshipEdgeScopeInput,
  type RelationshipEdgeRow,
} from './franchiseRelationshipEdgesStorage';
import { isFranchisePhase2L13Enabled } from './franchisePhase2Flags';
import { getSeasonMetadata } from './seasonStorage';

type RaceSnubRivalryScope = FranchiseRelationshipEdgeScopeInput & {
  franchiseId: string;
  seasonNumber: number;
};

export const ENVY_RIVALRY_TUNING = { accuracy: 1 } as const;
// Intensity is not an envy knob: it is the lifecycle seed baseline computed by
// computeRelationshipIntensity, matching every other active relationship edge.

export async function persistRaceSnubRivalryEdges(params: {
  pairs: ReadonlyArray<{ snubbedPlayerId: string; honoredPlayerId: string }>;
  scope: RaceSnubRivalryScope;
  timestamp: number;
}): Promise<{ status: 'dark-noop' | 'written'; written: number; reason?: string }> {
  if (!isFranchisePhase2L13Enabled()) {
    return { status: 'dark-noop', written: 0, reason: 'Phase-2 L13 disabled.' };
  }

  const meta = await getSeasonMetadata(params.scope.seasonId);
  const lastGameNumber = meta?.totalGames;
  if (!Number.isInteger(lastGameNumber) || (lastGameNumber as number) < 1) {
    return { status: 'dark-noop', written: 0, reason: 'Unresolved season length.' };
  }

  const resolvedLastGameNumber = lastGameNumber as number;
  const createdAt = params.timestamp > 0 ? params.timestamp : resolvedLastGameNumber;
  const pairsByEdgeId = new Map<string, { a: string; b: string }>();

  for (const pair of params.pairs) {
    const snubbedPlayerId = pair.snubbedPlayerId;
    const honoredPlayerId = pair.honoredPlayerId;
    if (!snubbedPlayerId || !honoredPlayerId || snubbedPlayerId === honoredPlayerId) continue;

    pairsByEdgeId.set(
      franchiseRelationshipEdgeId(params.scope, snubbedPlayerId, honoredPlayerId, 'RIVALRY'),
      { a: snubbedPlayerId, b: honoredPlayerId },
    );
  }

  let written = 0;
  for (const [id, pair] of Array.from(pairsByEdgeId.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const existing = await getFranchiseRelationshipEdge(id);
    if (existing) continue;

    const [player1Id, player2Id] = [pair.a, pair.b].sort((left, right) =>
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
      formationSource: 'envy',
      intensity: 0,
      potential: false,
      accuracy: ENVY_RIVALRY_TUNING.accuracy,
      formedAtGameNumber: resolvedLastGameNumber,
      dissolvedAtGameNumber: null,
      createdAt,
      updatedAt: createdAt,
    };
    const life = computeRelationshipIntensity(base, {
      gameNumber: resolvedLastGameNumber,
      isChargedMatchup: false,
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
    reason: written > 0 ? undefined : 'No new envy edges.',
  };
}
