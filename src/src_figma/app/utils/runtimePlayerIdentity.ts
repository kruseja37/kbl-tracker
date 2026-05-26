export type RuntimeRosterSide = 'home' | 'away';

type RuntimeRosterEntityIdOptions = {
  scopeStoredPlayerIds?: boolean;
};

export function buildFallbackRuntimePlayerId(name: string, team: RuntimeRosterSide): string {
  return `${team}-${name.replace(/\s+/g, '-').toLowerCase()}`;
}

export function buildScopedRuntimePlayerId(playerId: string, team: RuntimeRosterSide): string {
  return `${team}:${playerId}`;
}

export function getRuntimeRosterEntityId(
  entity: { name: string; playerId?: string },
  team: RuntimeRosterSide,
  options: RuntimeRosterEntityIdOptions = {},
): string {
  if (entity.playerId) {
    return options.scopeStoredPlayerIds
      ? buildScopedRuntimePlayerId(entity.playerId, team)
      : entity.playerId;
  }
  return buildFallbackRuntimePlayerId(entity.name, team);
}
