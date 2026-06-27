/**
 * L13 — dark relationship-edge overtake writer.
 *
 * Stadium-record overtakes form first-class event-driven RIVALRY edges at the
 * game where the overtake happens. Unlike the checkpoint formation tap, this is
 * intentionally per-game and is not checkpoint-bound.
 */

import type { PersistedGameState } from './gameStorage';
import {
  franchiseRelationshipEdgeId,
  getFranchiseRelationshipEdge,
  putFranchiseRelationshipEdge,
  type FranchiseRelationshipEdgeScopeInput,
  type RelationshipEdgeRow,
} from './franchiseRelationshipEdgesStorage';
import {
  resolveCheckpointGameNumber,
  type CompletedGameArchiveOptions,
} from './franchiseCheckpointSweepCompute';
import { isFranchisePhase2L13Enabled } from './franchisePhase2Flags';
import type { FranchiseStadiumRecordChange } from './franchiseStadiumRecordsStorage';

type RelationshipOvertakeScope = FranchiseRelationshipEdgeScopeInput & {
  franchiseId: string;
  seasonNumber: number;
};

export const OVERTAKE_RIVALRY_TUNING = { intensity: 0.5, accuracy: 1 } as const;

export async function persistDarkRelationshipOvertakeForCompletedGame(
  gameState: PersistedGameState,
  scope: RelationshipOvertakeScope,
  stadiumChanges: FranchiseStadiumRecordChange[],
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<{ status: 'dark-noop' | 'written'; written: number; reason?: string }> {
  if (!isFranchisePhase2L13Enabled()) {
    return { status: 'dark-noop', written: 0, reason: 'Phase-2 L13 disabled.' };
  }

  const gameNumber = await resolveCheckpointGameNumber(gameState, archiveOptions);
  if (gameNumber == null) {
    return { status: 'dark-noop', written: 0, reason: 'Unresolved league game number.' };
  }

  const createdAt = resolveDeterministicCreatedAt(gameState, gameNumber);
  const overtakesByEdgeId = new Map<string, { prior: string; new: string }>();
  for (const change of stadiumChanges) {
    if (
      change.changeKind !== 'overtake' ||
      change.priorLeaderPlayerIds.length !== 1 ||
      change.newLeaderPlayerIds.length !== 1 ||
      change.priorLeaderPlayerIds[0] === change.newLeaderPlayerIds[0]
    ) {
      continue;
    }

    const prior = change.priorLeaderPlayerIds[0];
    const newHolder = change.newLeaderPlayerIds[0];
    overtakesByEdgeId.set(
      franchiseRelationshipEdgeId(scope, prior, newHolder, 'RIVALRY'),
      { prior, new: newHolder },
    );
  }

  if (overtakesByEdgeId.size === 0) {
    return { status: 'dark-noop', written: 0, reason: 'No qualifying overtake changes.' };
  }

  let written = 0;
  for (const [id, pair] of Array.from(overtakesByEdgeId.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    const existing = await getFranchiseRelationshipEdge(id);
    const [player1Id, player2Id] = [pair.prior, pair.new].sort((left, right) =>
      left.localeCompare(right),
    ) as [string, string];
    const row: RelationshipEdgeRow = {
      id,
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      seasonNumber: scope.seasonNumber,
      player1Id,
      player2Id,
      type: 'RIVALRY',
      formationSource: 'overtake',
      intensity: Math.max(existing?.intensity ?? 0, OVERTAKE_RIVALRY_TUNING.intensity),
      potential: false,
      accuracy: Math.max(existing?.accuracy ?? 0, OVERTAKE_RIVALRY_TUNING.accuracy),
      formedAtGameNumber: existing?.formedAtGameNumber ?? gameNumber,
      dissolvedAtGameNumber: null,
      createdAt: existing?.createdAt ?? createdAt,
      updatedAt: createdAt,
    };

    await putFranchiseRelationshipEdge(row);
    written += 1;
  }

  return { status: 'written', written };
}

function resolveDeterministicCreatedAt(gameState: PersistedGameState, gameNumber: number): number {
  return Number.isFinite(gameState.savedAt) && gameState.savedAt > 0
    ? gameState.savedAt
    : gameNumber;
}
