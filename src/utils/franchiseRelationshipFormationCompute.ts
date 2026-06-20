/**
 * L13-3a — dark relationship-edge formation checkpoint writer.
 *
 * This is the first writer to the L13-1 relationship edge store. It is build-dark
 * behind the default-OFF L13 flag, forms only RIVALRY/FEUD/MENTORSHIP/FRIENDSHIP,
 * and writes deterministic rows at the same cadence-aware checkpoint boundary as
 * the dark ratings-development sweep.
 */

import {
  computeRelationshipFormationEdges,
  type RelationshipFormationPlayer,
} from '../engines/relationshipFormation';
import { checkpointCountForCadence } from '../data/rosterEngineConstants';
import type { HiddenModifiers } from '../types/game';
import type { PersistedGameState } from './gameStorage';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from './franchisePlayerStorage';
import {
  getPlayerRosterStatusForLeague,
  getPlayerTeamIdForLeague,
  type Player,
} from './leagueBuilderStorage';
import {
  franchiseRelationshipEdgeId,
  putFranchiseRelationshipEdge,
  type FranchiseRelationshipEdgeScopeInput,
  type RelationshipEdgeRow,
} from './franchiseRelationshipEdgesStorage';
import {
  isCheckpointBoundary,
  resolveCheckpointGameNumber,
  type CompletedGameArchiveOptions,
} from './franchiseCheckpointSweepCompute';
import { isFranchisePhase2L13Enabled } from './franchisePhase2Flags';
import { getSeasonMetadata } from './seasonStorage';

export type RelationshipFormationScope = FranchiseRelationshipEdgeScopeInput & {
  franchiseId: string;
  seasonNumber: number;
};

export interface RelationshipFormationRosterEntry extends RelationshipFormationPlayer {
  playerId: string;
  teamId: string;
  personality: string;
  age: number;
  modifiers?: HiddenModifiers;
}

export type PersistDarkRelationshipFormationResult = {
  status: 'dark-noop' | 'not-checkpoint' | 'written';
  written: number;
  reason?: string;
};

export async function resolveRelationshipFormationRoster(
  scope: FranchiseRelationshipEdgeScopeInput,
): Promise<RelationshipFormationRosterEntry[]> {
  const leagueId = (await getAllFranchiseTeams(scope.franchiseId))[0]?.leagueIds?.[0];
  if (!leagueId) return [];

  const players = await getAllFranchisePlayers(scope.franchiseId);
  const roster: RelationshipFormationRosterEntry[] = [];

  for (const player of players) {
    if (getPlayerRosterStatusForLeague(player, leagueId) !== 'MLB') continue;

    const teamId = getPlayerTeamIdForLeague(player, leagueId);
    if (!teamId) continue;

    roster.push({
      playerId: player.id,
      teamId,
      personality: player.personality,
      age: resolvePlayerAge(player),
      modifiers: player.hiddenPersonalityModifiers,
    });
  }

  return roster.sort((left, right) =>
    left.teamId.localeCompare(right.teamId) ||
    left.playerId.localeCompare(right.playerId),
  );
}

export const relationshipFormationSeam = {
  resolveRelationshipFormationRoster,
  computeRelationshipFormationEdges,
};

export async function persistDarkRelationshipFormationForCompletedGame(
  gameState: PersistedGameState,
  scope: RelationshipFormationScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkRelationshipFormationResult> {
  if (!isFranchisePhase2L13Enabled()) {
    return { status: 'dark-noop', written: 0, reason: 'Phase-2 L13 disabled.' };
  }

  const gameNumber = await resolveCheckpointGameNumber(gameState, archiveOptions);
  if (gameNumber == null) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'Unresolved league game number; cannot place a relationship-formation checkpoint.',
    };
  }

  const seasonMetadata = await getSeasonMetadata(scope.seasonId);
  const totalGames = seasonMetadata?.totalGames;
  if (!totalGames || totalGames <= 0) {
    return {
      status: 'dark-noop',
      written: 0,
      reason: 'No season totalGames; cannot place a relationship-formation checkpoint.',
    };
  }

  const checkpointCount = checkpointCountForCadence(seasonMetadata?.checkpointCadence);
  if (!isCheckpointBoundary(gameNumber, totalGames, checkpointCount)) {
    return { status: 'not-checkpoint', written: 0 };
  }

  const roster = await relationshipFormationSeam.resolveRelationshipFormationRoster(scope);
  if (roster.length === 0) {
    return { status: 'dark-noop', written: 0, reason: 'Empty relationship-formation roster.' };
  }

  const createdAt = resolveDeterministicCreatedAt(gameState, gameNumber);
  const rows = buildRelationshipEdgeRows(scope, gameNumber, createdAt, roster);

  for (const row of rows) {
    await putFranchiseRelationshipEdge(row);
  }

  return { status: 'written', written: rows.length };
}

function buildRelationshipEdgeRows(
  scope: RelationshipFormationScope,
  gameNumber: number,
  createdAt: number,
  roster: readonly RelationshipFormationRosterEntry[],
): RelationshipEdgeRow[] {
  const byTeam = new Map<string, RelationshipFormationRosterEntry[]>();
  for (const entry of roster) {
    const teamRoster = byTeam.get(entry.teamId) ?? [];
    teamRoster.push(entry);
    byTeam.set(entry.teamId, teamRoster);
  }

  const rows: RelationshipEdgeRow[] = [];
  for (const [teamId, teamRoster] of Array.from(byTeam.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    const edges = relationshipFormationSeam.computeRelationshipFormationEdges(
      teamRoster.sort((left, right) => left.playerId.localeCompare(right.playerId)),
      {
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        gameNumber,
      },
    );

    for (const edge of edges) {
      rows.push({
        id: franchiseRelationshipEdgeId(scope, edge.player1Id, edge.player2Id, edge.type),
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId,
        seasonNumber: scope.seasonNumber,
        player1Id: edge.player1Id,
        player2Id: edge.player2Id,
        type: edge.type,
        intensity: edge.intensity,
        potential: edge.potential,
        accuracy: edge.accuracy,
        formedAtGameNumber: edge.potential ? null : gameNumber,
        dissolvedAtGameNumber: null,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  return rows.sort((left, right) =>
    left.id.localeCompare(right.id) ||
    left.player1Id.localeCompare(right.player1Id) ||
    left.player2Id.localeCompare(right.player2Id),
  );
}

function resolvePlayerAge(player: Player): number {
  return typeof player.age === 'number' && Number.isFinite(player.age) ? player.age : 0;
}

function resolveDeterministicCreatedAt(gameState: PersistedGameState, gameNumber: number): number {
  return Number.isFinite(gameState.savedAt) && gameState.savedAt > 0
    ? gameState.savedAt
    : gameNumber;
}
