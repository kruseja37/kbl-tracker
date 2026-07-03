import { regenerateLeaguePoolPlayerAxes } from '../engines/leaguePoolAxisRegen';
import { getAllPlayers, savePlayer, type Player } from './leagueBuilderStorage';

export async function regenerateAndPersistLeaguePoolAxes(
  leagueId: string,
  playerIds?: readonly string[],
): Promise<{ regeneratedCount: number }> {
  const allPlayers = await getAllPlayers();
  const explicitIds = playerIds ? new Set(playerIds) : null;
  const leaguePlayers = explicitIds
    ? allPlayers.filter((player: Player) => explicitIds.has(player.id))
    : allPlayers.filter((player: Player) =>
        player.leagueAssignments?.some((assignment) => assignment.leagueId === leagueId),
      );
  const regeneratedPlayers = regenerateLeaguePoolPlayerAxes(leaguePlayers, leagueId);

  for (const player of regeneratedPlayers) {
    await savePlayer(player);
  }

  return { regeneratedCount: regeneratedPlayers.length };
}
