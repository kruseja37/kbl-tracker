import { generateHometown } from '../data/usCities';
import type { PersistedGameState } from './gameStorage';
import { getLeagueTemplate, getPlayer } from './leagueBuilderStorage';
import type { CanonicalPlayer, CanonicalPlayerInstance } from './almanacStorage';
import { getCanonicalPlayer, upsertCanonicalPlayer } from './almanacStorage';

function buildPlayerName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function buildCanonicalId(playerId: string, sourceDatabase?: string): string {
  return sourceDatabase === 'SMB4' ? `smb4_${playerId}` : `custom_${playerId}`;
}

export async function registerAlmanacPlayers(
  gameState: PersistedGameState,
  leagueId: string
): Promise<void> {
  const leagueTemplate = await getLeagueTemplate(leagueId);
  const instanceName = leagueTemplate?.name ?? leagueId;

  const instanceIds = new Set<string>([
    ...Object.keys(gameState.playerStats),
    ...gameState.pitcherGameStats.map((stats) => stats.pitcherId),
  ]);

  for (const playerId of instanceIds) {
    const player = await getPlayer(playerId);

    if (!player) {
      console.warn(`[Almanac] Skipping canonical registration for missing player "${playerId}"`);
      continue;
    }

    const canonicalId = buildCanonicalId(playerId, player.sourceDatabase);
    const playerName = buildPlayerName(player.firstName, player.lastName);
    const exhibitionInstance: CanonicalPlayerInstance = {
      mode: 'exhibition',
      instanceId: leagueId,
      instanceName,
      playerIdInInstance: playerId,
    };

    const existing = await getCanonicalPlayer(canonicalId);

    if (existing) {
      const hasInstance = existing.instances.some((instance) =>
        instance.mode === exhibitionInstance.mode &&
        instance.instanceId === exhibitionInstance.instanceId &&
        instance.playerIdInInstance === exhibitionInstance.playerIdInInstance
      );

      await upsertCanonicalPlayer({
        ...existing,
        playerName: existing.playerName || playerName,
        hometown: existing.hometown || player.hometown || generateHometown(),
        instances: hasInstance
          ? existing.instances
          : [...existing.instances, exhibitionInstance],
      });

      continue;
    }

    const canonicalPlayer: CanonicalPlayer = {
      canonicalId,
      playerName,
      hometown: player.hometown || generateHometown(),
      instances: [exhibitionInstance],
    };

    await upsertCanonicalPlayer(canonicalPlayer);
  }
}
