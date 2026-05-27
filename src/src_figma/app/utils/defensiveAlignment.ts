import type { Player, Pitcher } from "@/app/components/TeamRoster";
import type { TeamLineupSnapshot } from "@/hooks/useGameState";
import type { Position } from "../../../types/game";

export type DefensiveAlignmentByPosition = Partial<
  Record<Position, { playerId: string; playerName: string }>
>;

type TeamSide = "away" | "home";

type RosterIdentityResolver = (
  entity: { name: string; playerId?: string },
  team: TeamSide,
) => string;

const FIELDING_POSITIONS = new Set<Position>([
  "P",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
]);

function isFieldingPosition(position?: string | null): position is Position {
  return FIELDING_POSITIONS.has(position as Position);
}

export function buildDefensiveAlignmentByPosition(params: {
  fieldingTeam: TeamSide;
  fieldingTeamPlayers: Player[];
  lineupSnapshot?: TeamLineupSnapshot;
  activePitcher?: Pitcher;
  currentPitcherId?: string;
  currentPitcherName?: string;
  getRosterEntityId: RosterIdentityResolver;
}): DefensiveAlignmentByPosition {
  const {
    fieldingTeam,
    fieldingTeamPlayers,
    lineupSnapshot,
    activePitcher,
    currentPitcherId,
    currentPitcherName,
    getRosterEntityId,
  } = params;
  const alignment: DefensiveAlignmentByPosition = {};
  const hasExplicitCurrentPitcher = !!(currentPitcherId && currentPitcherName);

  for (const player of fieldingTeamPlayers) {
    if (
      player.isOutOfGame ||
      player.battingOrder === undefined ||
      !isFieldingPosition(player.position)
    ) {
      continue;
    }
    alignment[player.position] = {
      playerId: getRosterEntityId(player, fieldingTeam),
      playerName: player.name,
    };
  }

  const usedPlayers = new Set(lineupSnapshot?.usedPlayers ?? []);
  for (const player of lineupSnapshot?.lineup ?? []) {
    if (
      usedPlayers.has(player.playerId) ||
      !isFieldingPosition(player.position)
    ) {
      continue;
    }
    alignment[player.position] = {
      playerId: player.playerId,
      playerName: player.playerName,
    };
  }

  if (lineupSnapshot?.currentPitcher) {
    alignment.P = {
      playerId: lineupSnapshot.currentPitcher.playerId,
      playerName: lineupSnapshot.currentPitcher.playerName,
    };
  }

  if (!hasExplicitCurrentPitcher && activePitcher && !activePitcher.isOutOfGame) {
    alignment.P = {
      playerId: getRosterEntityId(activePitcher, fieldingTeam),
      playerName: activePitcher.name,
    };
  }

  if (hasExplicitCurrentPitcher) {
    alignment.P = {
      playerId: currentPitcherId,
      playerName: currentPitcherName,
    };
  }

  return alignment;
}
