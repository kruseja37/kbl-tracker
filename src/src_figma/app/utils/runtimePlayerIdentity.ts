export type RuntimeRosterSide = 'home' | 'away';

export function buildFallbackRuntimePlayerId(name: string, team: RuntimeRosterSide): string {
  return `${team}-${name.replace(/\s+/g, '-').toLowerCase()}`;
}

export function getRuntimeRosterEntityId(
  entity: { name: string; playerId?: string },
  team: RuntimeRosterSide
): string {
  return entity.playerId || buildFallbackRuntimePlayerId(entity.name, team);
}
