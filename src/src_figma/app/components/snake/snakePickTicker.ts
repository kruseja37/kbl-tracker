import type { SnakeVersionState } from '../../../../utils/leagueBuilderStorage';
import { deriveVersionGroupId } from '../../../../engines/snakeVersioning';

export interface SnakePickTickerPlayer {
  id: string;
  firstName: string;
  lastName: string;
  sourceId?: string | null;
  versionGroupId?: string | null;
}

export interface SnakePickTickerInput {
  picks: readonly { round: number; pick: number; playerId: string; teamId: string }[];
  players: readonly SnakePickTickerPlayer[];
  teams: readonly { id: string; name: string }[];
  versionState?: SnakeVersionState;
  unknownPlayer: string;
  unknownTeam: string;
}

export interface SnakePickTickerItem {
  id: string;
  teamId: string;
  text: string;
}

function fullName(player: SnakePickTickerPlayer): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

/** Derived receipt: undo restores the prior version state, so its retirement line disappears too. */
export function buildSnakePickTicker(input: SnakePickTickerInput): SnakePickTickerItem[] {
  const playerById = new Map(input.players.map((player) => [player.id, player]));
  const teamById = new Map(input.teams.map((team) => [team.id, team]));
  return [...input.picks].reverse().flatMap((pick) => {
    const player = playerById.get(pick.playerId);
    const name = player ? fullName(player) : input.unknownPlayer;
    const selected = {
      id: `${pick.round}-${pick.pick}-${pick.playerId}`,
      teamId: pick.teamId,
      text: `PICK #${pick.pick} · ${(teamById.get(pick.teamId)?.name ?? input.unknownTeam).toUpperCase()} SELECTED ${name.toUpperCase()}`,
    };
    if (!player) return [selected];
    const groupId = deriveVersionGroupId({
      playerId: player.id,
      sourceId: player.sourceId,
      versionGroupId: player.versionGroupId,
    });
    const retiredCount = input.versionState?.retiredPlayerIdsByGroupId[groupId]?.length ?? 0;
    if (retiredCount === 0) return [selected];
    return [selected, {
      id: `${pick.round}-${pick.pick}-${pick.playerId}-versions-retired`,
      teamId: pick.teamId,
      text: `${name.toUpperCase()} DRAFTED — ${retiredCount} OTHER VERSION${retiredCount === 1 ? '' : 'S'} RETIRED.`,
    }];
  });
}
