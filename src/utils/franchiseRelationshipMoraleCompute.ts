/**
 * L13-5 — per-game relationship morale tap.
 *
 * The only morale write path here is master morale matrix composition followed
 * by applyFranchiseMoraleMatrixConsequence. Recovery reads the already-recorded
 * hit deltas from morale history and writes the exact opposite delta.
 */

import {
  RELATIONSHIP_INTENSITY_TUNING,
} from '../engines/relationshipIntensity';
import {
  composeMoraleConsequence,
  type MoraleMatrixEvent,
} from '../engines/masterMoraleMatrix';
import type { HiddenModifiers } from '../types/game';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  type Player,
} from './franchisePlayerStorage';
import {
  getPlayerRosterStatusForLeague,
  getPlayerTeamIdForLeague,
  type RosterStatus,
} from './leagueBuilderStorage';
import {
  applyFranchiseMoraleMatrixConsequence,
  getFranchiseMoraleSnapshot,
  type FranchiseMoraleSnapshot,
} from './franchiseMoraleState';
import {
  getFranchiseRelationshipEdgesByScope,
  type FranchiseRelationshipEdgeScopeInput,
  type RelationshipEdgeRow,
} from './franchiseRelationshipEdgesStorage';
import {
  isFranchisePhase2L13Enabled,
  isFranchisePhase2MoraleEnabled,
} from './franchisePhase2Flags';
import {
  resolveCheckpointGameNumber,
  type CompletedGameArchiveOptions,
} from './franchiseCheckpointSweepCompute';
import {
  getRelationshipParticipantTeams,
  isChargedRelationshipMatchup,
  type RelationshipParticipantTeams,
} from './franchiseRelationshipIntensityCompute';
import type { PersistedGameState } from './gameStorage';

export type RelationshipMoraleScope = FranchiseRelationshipEdgeScopeInput & {
  franchiseId: string;
  seasonNumber: number;
};

export interface RelationshipMoraleRosterEntry {
  playerId: string;
  teamId: string | null;
  rosterStatus: RosterStatus | null;
  personality?: string | null;
  morale?: number | null;
  hiddenPersonalityModifiers?: Partial<HiddenModifiers> | null;
}

export interface RelationshipMoraleRoster {
  byPlayerId: Map<string, RelationshipMoraleRosterEntry>;
}

export type PersistDarkRelationshipMoraleResult = {
  status: 'dark-noop' | 'applied';
  hitCount: number;
  recoveryCount: number;
  chargedCount: number;
  reason?: string;
};

type ChargedMatchupResult = 'win' | 'loss';

const NEUTRAL_HIDDEN_MODIFIERS: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

export const franchiseRelationshipMoraleSeam = {
  getEdges: getFranchiseRelationshipEdgesByScope,
  resolveRoster: resolveRelationshipMoraleRoster,
  getSnapshot: getFranchiseMoraleSnapshot,
  applyConsequence: applyFranchiseMoraleMatrixConsequence,
};

export function buildRelationshipMoraleEvent(
  edge: Pick<RelationshipEdgeRow, 'type'>,
  relationshipRole: 'player1' | 'player2',
): MoraleMatrixEvent {
  return {
    kind: 'relationship',
    type: edge.type,
    relationshipRole,
  };
}

export function buildRelationshipRecoveryEvent(exactSelfPlayerMoraleDelta: number): MoraleMatrixEvent {
  return {
    kind: 'relationship',
    type: 'relationship.recovery',
    exactSelfPlayerMoraleDelta,
  };
}

export function buildRelationshipChargedMatchupEvent(
  edge: Pick<RelationshipEdgeRow, 'type'>,
  chargedMatchupResult: ChargedMatchupResult,
): MoraleMatrixEvent {
  return {
    kind: 'relationship',
    type: edge.type,
    chargedMatchupResult,
  };
}

export async function resolveRelationshipMoraleRoster(
  scope: FranchiseRelationshipEdgeScopeInput,
): Promise<RelationshipMoraleRoster> {
  const leagueId = (await getAllFranchiseTeams(scope.franchiseId))[0]?.leagueIds?.[0];
  const byPlayerId = new Map<string, RelationshipMoraleRosterEntry>();
  if (!leagueId) return { byPlayerId };

  const players = await getAllFranchisePlayers(scope.franchiseId);
  for (const player of players) {
    byPlayerId.set(player.id, rosterEntryFromPlayer(player, leagueId));
  }

  return { byPlayerId };
}

export function areRelationshipPlayersCoRostered(
  edge: Pick<RelationshipEdgeRow, 'player1Id' | 'player2Id'>,
  roster: RelationshipMoraleRoster,
): boolean {
  const player1 = roster.byPlayerId.get(edge.player1Id);
  const player2 = roster.byPlayerId.get(edge.player2Id);
  return Boolean(
    player1?.teamId &&
      player2?.teamId &&
      player1.rosterStatus === 'MLB' &&
      player2.rosterStatus === 'MLB' &&
      player1.teamId === player2.teamId,
  );
}

export function relationshipHitSourceEventId(
  scope: RelationshipMoraleScope,
  edge: Pick<RelationshipEdgeRow, 'id'>,
  gameKey: string,
): string {
  return `${relationshipSourcePrefix('relationship-hit', scope, edge)}:${gameKey}`;
}

export function relationshipRecoverySourceEventId(
  scope: RelationshipMoraleScope,
  edge: Pick<RelationshipEdgeRow, 'id'>,
  gameKey: string,
): string {
  return `${relationshipSourcePrefix('relationship-recovery', scope, edge)}:${gameKey}`;
}

export function relationshipChargedSourceEventId(
  scope: RelationshipMoraleScope,
  edge: Pick<RelationshipEdgeRow, 'id'>,
  gameKey: string,
): string {
  return `${relationshipSourcePrefix('relationship-charged', scope, edge)}:${gameKey}`;
}

export async function persistDarkRelationshipMoraleForCompletedGame(
  gameState: PersistedGameState,
  scope: RelationshipMoraleScope,
  archiveOptions?: CompletedGameArchiveOptions,
): Promise<PersistDarkRelationshipMoraleResult> {
  if (!isFranchisePhase2L13Enabled()) {
    return {
      status: 'dark-noop',
      hitCount: 0,
      recoveryCount: 0,
      chargedCount: 0,
      reason: 'Phase-2 L13 disabled.',
    };
  }
  if (!isFranchisePhase2MoraleEnabled()) {
    return {
      status: 'dark-noop',
      hitCount: 0,
      recoveryCount: 0,
      chargedCount: 0,
      reason: 'Phase-2 morale disabled.',
    };
  }

  const edges = await franchiseRelationshipMoraleSeam.getEdges(scope);
  if (edges.length === 0) {
    return {
      status: 'dark-noop',
      hitCount: 0,
      recoveryCount: 0,
      chargedCount: 0,
      reason: 'No relationship edges in scope.',
    };
  }

  const gameNumber = await resolveCheckpointGameNumber(gameState, archiveOptions);
  const gameKey = relationshipGameKey(gameState, gameNumber);
  const timestamp = relationshipTimestamp(gameState, gameNumber);
  const participants = getRelationshipParticipantTeams(gameState);
  const roster = await franchiseRelationshipMoraleSeam.resolveRoster(scope);
  let hitCount = 0;
  let recoveryCount = 0;
  let chargedCount = 0;

  for (const edge of edges) {
    try {
      if (isChargedRelationshipMatchup(edge, participants)) {
        chargedCount += await applyRelationshipChargedMatchup(
          edge,
          scope,
          roster,
          participants,
          gameState,
          gameKey,
          timestamp,
        );
      }

      const coRostered = areRelationshipPlayersCoRostered(edge, roster);
      if (shouldApplyRelationshipHit(edge, coRostered)) {
        hitCount += await applyRelationshipHit(edge, scope, roster, gameKey, timestamp);
        continue;
      }

      if (!coRostered) {
        recoveryCount += await applyRelationshipRecovery(edge, scope, roster, gameKey, timestamp);
      }
    } catch (error) {
      console.warn('[MoraleMatrix] relationship morale event skipped:', error);
    }
  }

  return {
    status: 'applied',
    hitCount,
    recoveryCount,
    chargedCount,
  };
}

function rosterEntryFromPlayer(player: Player, leagueId: string): RelationshipMoraleRosterEntry {
  return {
    playerId: player.id,
    teamId: getPlayerTeamIdForLeague(player, leagueId),
    rosterStatus: getPlayerRosterStatusForLeague(player, leagueId),
    personality: player.personality,
    morale: player.morale,
    hiddenPersonalityModifiers: player.hiddenPersonalityModifiers,
  };
}

function shouldApplyRelationshipHit(
  edge: RelationshipEdgeRow,
  coRostered: boolean,
): boolean {
  return Boolean(
    coRostered &&
      !edge.potential &&
      edge.dissolvedAtGameNumber === null &&
      edge.intensity >= RELATIONSHIP_INTENSITY_TUNING.formThreshold,
  );
}

async function applyRelationshipHit(
  edge: RelationshipEdgeRow,
  scope: RelationshipMoraleScope,
  roster: RelationshipMoraleRoster,
  gameKey: string,
  timestamp: string,
): Promise<number> {
  const hitSourceEventId = relationshipHitSourceEventId(scope, edge, gameKey);
  let applied = 0;

  applied += await applyRelationshipParticipantConsequence({
    edge,
    scope,
    roster,
    playerId: edge.player1Id,
    event: buildRelationshipMoraleEvent(edge, 'player1'),
    sourceEventId: hitSourceEventId,
    timestamp,
  });
  applied += await applyRelationshipParticipantConsequence({
    edge,
    scope,
    roster,
    playerId: edge.player2Id,
    event: buildRelationshipMoraleEvent(edge, 'player2'),
    sourceEventId: hitSourceEventId,
    timestamp,
  });

  return applied;
}

async function applyRelationshipRecovery(
  edge: RelationshipEdgeRow,
  scope: RelationshipMoraleScope,
  roster: RelationshipMoraleRoster,
  gameKey: string,
  timestamp: string,
): Promise<number> {
  let applied = 0;

  applied += await applyRelationshipParticipantRecovery(edge, scope, roster, edge.player1Id, gameKey, timestamp);
  applied += await applyRelationshipParticipantRecovery(edge, scope, roster, edge.player2Id, gameKey, timestamp);

  return applied;
}

async function applyRelationshipChargedMatchup(
  edge: RelationshipEdgeRow,
  scope: RelationshipMoraleScope,
  roster: RelationshipMoraleRoster,
  participants: RelationshipParticipantTeams,
  gameState: PersistedGameState,
  gameKey: string,
  timestamp: string,
): Promise<number> {
  const sourceEventId = relationshipChargedSourceEventId(scope, edge, gameKey);
  let applied = 0;

  applied += await applyRelationshipParticipantChargedMatchup({
    edge,
    scope,
    roster,
    participants,
    gameState,
    playerId: edge.player1Id,
    sourceEventId,
    timestamp,
  });
  applied += await applyRelationshipParticipantChargedMatchup({
    edge,
    scope,
    roster,
    participants,
    gameState,
    playerId: edge.player2Id,
    sourceEventId,
    timestamp,
  });

  return applied;
}

async function applyRelationshipParticipantChargedMatchup(params: {
  edge: RelationshipEdgeRow;
  scope: RelationshipMoraleScope;
  roster: RelationshipMoraleRoster;
  participants: RelationshipParticipantTeams;
  gameState: PersistedGameState;
  playerId: string;
  sourceEventId: string;
  timestamp: string;
}): Promise<number> {
  const teamId = params.participants.byPlayerId.get(params.playerId);
  if (!teamId) return 0;

  const chargedMatchupResult = relationshipTeamResult(params.gameState, teamId);
  if (!chargedMatchupResult) return 0;

  return applyRelationshipParticipantConsequence({
    edge: params.edge,
    scope: params.scope,
    roster: params.roster,
    playerId: params.playerId,
    teamId,
    event: buildRelationshipChargedMatchupEvent(params.edge, chargedMatchupResult),
    sourceEventId: params.sourceEventId,
    timestamp: params.timestamp,
  });
}

async function applyRelationshipParticipantRecovery(
  edge: RelationshipEdgeRow,
  scope: RelationshipMoraleScope,
  roster: RelationshipMoraleRoster,
  playerId: string,
  gameKey: string,
  timestamp: string,
): Promise<number> {
  const rosterEntry = roster.byPlayerId.get(playerId);
  if (!rosterEntry?.teamId) return 0;

  const snapshot = await franchiseRelationshipMoraleSeam.getSnapshot(scope, 'player', playerId);
  const unrecoveredDelta = relationshipUnrecoveredDelta(snapshot, scope, edge);
  if (unrecoveredDelta === 0) return 0;

  return applyRelationshipParticipantConsequence({
    edge,
    scope,
    roster,
    playerId,
    event: buildRelationshipRecoveryEvent(roundDelta(-unrecoveredDelta)),
    sourceEventId: relationshipRecoverySourceEventId(scope, edge, gameKey),
    timestamp,
  });
}

async function applyRelationshipParticipantConsequence(params: {
  edge: RelationshipEdgeRow;
  scope: RelationshipMoraleScope;
  roster: RelationshipMoraleRoster;
  playerId: string;
  teamId?: string;
  event: MoraleMatrixEvent;
  sourceEventId: string;
  timestamp: string;
}): Promise<number> {
  const rosterEntry = params.roster.byPlayerId.get(params.playerId);
  const teamId = params.teamId ?? rosterEntry?.teamId ?? null;
  if (!rosterEntry || !teamId) return 0;

  const currentPlayerMorale =
    (await franchiseRelationshipMoraleSeam.getSnapshot(params.scope, 'player', params.playerId))?.currentValue ??
    rosterEntry.morale ??
    50;
  const currentFanMorale =
    (await franchiseRelationshipMoraleSeam.getSnapshot(params.scope, 'team-fan', teamId))?.currentValue ??
    50;
  const consequence = composeMoraleConsequence(
    params.event,
    rosterEntry.personality ?? undefined,
    resolveHiddenModifiers(rosterEntry.hiddenPersonalityModifiers),
    currentPlayerMorale,
    currentFanMorale,
  );

  if (consequence.isNeutral || consequence.totalPlayerMoraleDelta === 0) return 0;

  const result = await franchiseRelationshipMoraleSeam.applyConsequence({
    ...params.scope,
    playerId: params.playerId,
    teamId,
    consequence,
    sourceEventId: params.sourceEventId,
    timestamp: params.timestamp,
  });

  return result.status === 'failed' ? 0 : 1;
}

function relationshipUnrecoveredDelta(
  snapshot: FranchiseMoraleSnapshot | null,
  scope: RelationshipMoraleScope,
  edge: Pick<RelationshipEdgeRow, 'id'>,
): number {
  if (!snapshot) return 0;

  const hitPrefix = `${relationshipSourcePrefix('relationship-hit', scope, edge)}:`;
  const recoveryPrefix = `${relationshipSourcePrefix('relationship-recovery', scope, edge)}:`;
  const netDelta = snapshot.history.reduce((sum, entry) => {
    if (entry.sourceEventId.startsWith(hitPrefix) || entry.sourceEventId.startsWith(recoveryPrefix)) {
      return sum + entry.delta;
    }
    return sum;
  }, 0);

  return roundDelta(netDelta);
}

function relationshipSourcePrefix(
  kind: 'relationship-hit' | 'relationship-recovery' | 'relationship-charged',
  scope: RelationshipMoraleScope,
  edge: Pick<RelationshipEdgeRow, 'id'>,
): string {
  return [
    kind,
    scope.franchiseId,
    scope.seasonId,
    scope.statsScopeId,
    edge.id,
  ].join(':');
}

function relationshipTeamResult(
  gameState: PersistedGameState,
  teamId: string,
): ChargedMatchupResult | null {
  const homeScore = Number(gameState.homeScore);
  const awayScore = Number(gameState.awayScore);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) {
    return null;
  }
  if (teamId === gameState.homeTeamId) return homeScore > awayScore ? 'win' : 'loss';
  if (teamId === gameState.awayTeamId) return awayScore > homeScore ? 'win' : 'loss';
  return null;
}

function relationshipGameKey(
  gameState: PersistedGameState,
  gameNumber: number | null,
): string {
  if (gameNumber !== null) return `game-${gameNumber}`;
  return gameState.scheduleGameId || gameState.gameId || 'unknown-game';
}

function relationshipTimestamp(
  gameState: PersistedGameState,
  gameNumber: number | null,
): string {
  const timestamp = Number.isFinite(gameState.savedAt) && gameState.savedAt > 0
    ? gameState.savedAt
    : gameNumber ?? 0;
  return new Date(timestamp).toISOString();
}

function resolveHiddenModifiers(modifiers: Partial<HiddenModifiers> | null | undefined): HiddenModifiers {
  return {
    loyalty: Number.isFinite(modifiers?.loyalty) ? Number(modifiers?.loyalty) : NEUTRAL_HIDDEN_MODIFIERS.loyalty,
    ambition: Number.isFinite(modifiers?.ambition) ? Number(modifiers?.ambition) : NEUTRAL_HIDDEN_MODIFIERS.ambition,
    resilience: Number.isFinite(modifiers?.resilience) ? Number(modifiers?.resilience) : NEUTRAL_HIDDEN_MODIFIERS.resilience,
    charisma: Number.isFinite(modifiers?.charisma) ? Number(modifiers?.charisma) : NEUTRAL_HIDDEN_MODIFIERS.charisma,
  };
}

function roundDelta(value: number): number {
  return Math.round(value * 100) / 100;
}
