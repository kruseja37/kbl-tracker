import {
  getLeaguePlayerOverride,
  getPlayer,
  type Player,
  type PlayerAttributes,
} from './leagueBuilderStorage';

export function mergePlayerOverrides(
  base: Player,
  overrides: Partial<PlayerAttributes> | null,
): Player {
  if (!overrides || Object.keys(overrides).length === 0) {
    return base;
  }

  return { ...base, ...overrides };
}

export async function getEffectivePlayer(playerId: string, leagueId: string): Promise<Player | null> {
  const base = await getPlayer(playerId);

  if (!base) {
    return null;
  }

  const overrideRecord = await getLeaguePlayerOverride(leagueId, playerId);
  return mergePlayerOverrides(base, overrideRecord?.overrides ?? null);
}
