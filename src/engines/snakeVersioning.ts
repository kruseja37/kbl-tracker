import type { SnakeVersionState } from '../utils/leagueBuilderStorage';

export interface VersionedPlayerIdentity {
  playerId: string;
  sourceId?: string | null;
  versionGroupId?: string | null;
}

/**
 * CT3 shim. Historical adapters expose `namespace:personKey`; only the terminal person key is
 * shared by versions. Missing source identity falls back to the card id, so names are never used
 * and natural same-name players cannot be merged accidentally.
 */
export function deriveVersionGroupId(player: VersionedPlayerIdentity): string {
  if (player.versionGroupId?.trim()) return player.versionGroupId.trim();
  const source = player.sourceId?.trim();
  if (source) {
    const separator = source.lastIndexOf(':');
    const personKey = (separator >= 0 ? source.slice(separator + 1) : source).trim();
    if (personKey) return `source:${personKey}`;
  }
  return `player:${player.playerId}`;
}

export function countUniqueVersionHumans(players: readonly VersionedPlayerIdentity[]): number {
  return new Set(players.map(deriveVersionGroupId)).size;
}

export function dedupeVersionedPlayers<T extends VersionedPlayerIdentity>(
  players: readonly T[],
): T[] {
  const sorted = [...players].sort((left, right) => left.playerId.localeCompare(right.playerId));
  const seen = new Set<string>();
  return sorted.filter((player) => {
    const groupId = deriveVersionGroupId(player);
    if (seen.has(groupId)) return false;
    seen.add(groupId);
    return true;
  });
}

export function emptySnakeVersionState(): SnakeVersionState {
  return { draftedPlayerIdByGroupId: {}, retiredPlayerIdsByGroupId: {} };
}

export function retireDraftedVersion<T extends VersionedPlayerIdentity>(input: {
  state: SnakeVersionState;
  drafted: T;
  pool: readonly T[];
}): { state: SnakeVersionState; retiredPlayerIds: string[] } {
  const groupId = deriveVersionGroupId(input.drafted);
  const retiredPlayerIds = input.pool
    .filter((player) => (
      player.playerId !== input.drafted.playerId && deriveVersionGroupId(player) === groupId
    ))
    .map((player) => player.playerId)
    .sort();
  return {
    state: {
      draftedPlayerIdByGroupId: {
        ...input.state.draftedPlayerIdByGroupId,
        [groupId]: input.drafted.playerId,
      },
      retiredPlayerIdsByGroupId: {
        ...input.state.retiredPlayerIdsByGroupId,
        [groupId]: retiredPlayerIds,
      },
    },
    retiredPlayerIds,
  };
}

export function unavailableVersionPlayerIds(state: SnakeVersionState | undefined): Set<string> {
  return new Set(Object.values(state?.retiredPlayerIdsByGroupId ?? {}).flat());
}
