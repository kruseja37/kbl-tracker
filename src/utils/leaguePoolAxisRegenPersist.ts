import { initializeDraftPoolPlayerAxes } from '../engines/leaguePoolAxisRegen';
import { getAllPlayers, savePlayer, type Player } from './leagueBuilderStorage';

export async function initializeAndPersistDraftPoolPlayerAxes(
  leagueId: string,
  playerIds?: readonly string[],
): Promise<{ initializedCount: number }> {
  const allPlayers = await getAllPlayers();
  const explicitIds = playerIds ? new Set(playerIds) : null;
  const leaguePlayers = explicitIds
    ? allPlayers.filter((player: Player) => explicitIds.has(player.id))
    : allPlayers.filter((player: Player) =>
        player.leagueAssignments?.some((assignment) => assignment.leagueId === leagueId),
      );
  const initializedPlayers = initializeDraftPoolPlayerAxes(leaguePlayers, leagueId);

  let initializedCount = 0;
  const sourceById = new Map(leaguePlayers.map((player) => [player.id, player]));
  for (const player of initializedPlayers) {
    const source = sourceById.get(player.id);
    if (source
      && source.personality === player.personality
      && source.chemistry === player.chemistry
      && JSON.stringify(source.hiddenPersonalityModifiers ?? null)
        === JSON.stringify(player.hiddenPersonalityModifiers ?? null)) {
      continue;
    }
    await savePlayer(player);
    initializedCount += 1;
  }

  return { initializedCount };
}
