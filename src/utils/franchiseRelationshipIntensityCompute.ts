/**
 * L13-4 — dark per-game relationship intensity writer.
 *
 * Reads existing L13 relationship edges, recomputes intensity from stable edge
 * fields plus the completed game's number/participants, and overwrites the
 * same edge row. No accumulator field, no Date.now, no morale/reporter writes.
 */

import {
  computeRelationshipIntensity,
  type RelationshipIntensityResult,
} from '../engines/relationshipIntensity';
import type { PersistedGameState } from './gameStorage';
import {
  getFranchiseRelationshipEdgesByScope,
  putFranchiseRelationshipEdge,
  type FranchiseRelationshipEdgeScopeInput,
  type RelationshipEdgeRow,
} from './franchiseRelationshipEdgesStorage';
import {
  resolveCheckpointGameNumber,
  type CompletedGameArchiveOptions,
} from './franchiseCheckpointSweepCompute';
import { isFranchisePhase2L13Enabled } from './franchisePhase2Flags';

export type RelationshipIntensityScope = FranchiseRelationshipEdgeScopeInput & {
  franchiseId: string;
  seasonNumber: number;
};

export type PersistDarkRelationshipIntensityResult = {
  status: 'dark-noop' | 'written';
  written: number;
  chargedMatchups: number;
  dissolved: number;
  reason?: string;
};

export interface RelationshipParticipantTeams {
  byPlayerId: Map<string, string>;
}

export interface RelationshipIntensityWritePreview {
  edge: RelationshipEdgeRow;
  result: RelationshipIntensityResult;
  isChargedMatchup: boolean;
}

function addParticipant(
  byPlayerId: Map<string, string>,
  playerId: unknown,
  teamId: unknown,
): void {
  if (
    typeof playerId !== 'string' ||
    !playerId.trim() ||
    typeof teamId !== 'string' ||
    !teamId.trim()
  ) {
    return;
  }
  byPlayerId.set(playerId, teamId);
}

export function getRelationshipParticipantTeams(
  gameState: PersistedGameState,
): RelationshipParticipantTeams {
  const byPlayerId = new Map<string, string>();

  for (const [playerId, stats] of Object.entries(gameState.playerStats ?? {})) {
    addParticipant(byPlayerId, playerId, stats.teamId);
  }
  for (const stats of gameState.pitcherGameStats ?? []) {
    addParticipant(byPlayerId, stats.pitcherId, stats.teamId);
  }
  for (const entry of gameState.awayLineup ?? []) {
    addParticipant(byPlayerId, entry.playerId, gameState.awayTeamId);
  }
  for (const entry of gameState.homeLineup ?? []) {
    addParticipant(byPlayerId, entry.playerId, gameState.homeTeamId);
  }
  for (const entry of gameState.awayLineupState?.lineup ?? []) {
    addParticipant(byPlayerId, entry.playerId, gameState.awayTeamId);
  }
  for (const entry of gameState.homeLineupState?.lineup ?? []) {
    addParticipant(byPlayerId, entry.playerId, gameState.homeTeamId);
  }
  addParticipant(
    byPlayerId,
    gameState.awayLineupState?.currentPitcher?.playerId,
    gameState.awayTeamId,
  );
  addParticipant(
    byPlayerId,
    gameState.homeLineupState?.currentPitcher?.playerId,
    gameState.homeTeamId,
  );

  return { byPlayerId };
}

export function isChargedRelationshipMatchup(
  edge: Pick<RelationshipEdgeRow, 'player1Id' | 'player2Id'>,
  participants: RelationshipParticipantTeams,
): boolean {
  const player1TeamId = participants.byPlayerId.get(edge.player1Id);
  const player2TeamId = participants.byPlayerId.get(edge.player2Id);
  return Boolean(player1TeamId && player2TeamId && player1TeamId !== player2TeamId);
}

function deterministicUpdatedAt(gameState: PersistedGameState, gameNumber: number): number {
  return Number.isFinite(gameState.savedAt) && gameState.savedAt > 0
    ? gameState.savedAt
    : gameNumber;
}

export function previewRelationshipIntensityWrites(
  edges: readonly RelationshipEdgeRow[],
  gameState: PersistedGameState,
  gameNumber: number,
): RelationshipIntensityWritePreview[] {
  const participants = getRelationshipParticipantTeams(gameState);
  return edges.map((edge) => {
    const isChargedMatchup = isChargedRelationshipMatchup(edge, participants);
    return {
      edge,
      isChargedMatchup,
      result: computeRelationshipIntensity(edge, {
        gameNumber,
        isChargedMatchup,
      }),
    };
  });
}

export async function persistDarkRelationshipIntensityForCompletedGame(
  gameState: PersistedGameState,
  scope: RelationshipIntensityScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkRelationshipIntensityResult> {
  if (!isFranchisePhase2L13Enabled()) {
    return {
      status: 'dark-noop',
      written: 0,
      chargedMatchups: 0,
      dissolved: 0,
      reason: 'Phase-2 L13 disabled.',
    };
  }

  const gameNumber = await resolveCheckpointGameNumber(gameState, archiveOptions);
  if (gameNumber == null) {
    return {
      status: 'dark-noop',
      written: 0,
      chargedMatchups: 0,
      dissolved: 0,
      reason: 'Unresolved league game number; cannot recompute relationship intensity.',
    };
  }

  const edges = await getFranchiseRelationshipEdgesByScope(scope);
  if (edges.length === 0) {
    return {
      status: 'dark-noop',
      written: 0,
      chargedMatchups: 0,
      dissolved: 0,
      reason: 'No relationship edges in scope.',
    };
  }

  const updatedAt = deterministicUpdatedAt(gameState, gameNumber);
  const previews = previewRelationshipIntensityWrites(edges, gameState, gameNumber);

  for (const preview of previews) {
    await putFranchiseRelationshipEdge({
      ...preview.edge,
      intensity: preview.result.intensity,
      dissolvedAtGameNumber: preview.result.dissolvedAtGameNumber,
      updatedAt,
    });
  }

  return {
    status: 'written',
    written: previews.length,
    chargedMatchups: previews.filter((preview) => preview.isChargedMatchup).length,
    dissolved: previews.filter((preview) => preview.result.state === 'dissolved').length,
  };
}
