import { regenerateLeaguePoolPlayerAxes } from '../engines/leaguePoolAxisRegen';
import { getAllPlayers, savePlayer, type Player } from './leagueBuilderStorage';

export async function regenerateAndPersistLeaguePoolAxes(
  leagueId: string,
): Promise<{ regeneratedCount: number }> {
  const allPlayers = await getAllPlayers();
  const leaguePlayers = allPlayers.filter((player: Player) =>
    player.leagueAssignments?.some((assignment) => assignment.leagueId === leagueId),
  );
  const regeneratedPlayers = regenerateLeaguePoolPlayerAxes(leaguePlayers, leagueId);

  for (const player of regeneratedPlayers) {
    await savePlayer(player);
  }

  return { regeneratedCount: regeneratedPlayers.length };
}
