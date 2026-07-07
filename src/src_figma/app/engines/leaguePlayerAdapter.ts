import type { DemandUniversePlayer } from "../../../engines/poolFromDemand";
import type { DesignPoolPlayer } from "../../../engines/rosterDesignFeasibility";
import { toRosterSlotPlayer } from "../../../engines/rosterNeed";
import { computePlayerIv } from "../../../utils/leagueBuilderPoolBuilder";
import type { Player } from "../../../utils/leagueBuilderStorage";

const PITCHER_POSITIONS = new Set<string>(["SP", "SP/RP", "RP", "CP", "P", "TWO-WAY"]);

function playerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

function isPitcher(player: Player): boolean {
  return PITCHER_POSITIONS.has(player.primaryPosition);
}

export function buildRosterDesignPool(players: readonly Player[]): DesignPoolPlayer[] {
  return players.map((player) => {
    const pitcher = isPitcher(player);
    const traits = [player.trait1, player.trait2];
    const slotPlayer = toRosterSlotPlayer({
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition ?? null,
      traits,
    });
    return {
      id: player.id,
      name: playerName(player),
      salary: player.salary,
      profile: {
        isPitcher: pitcher,
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        bats: player.bats,
        throws: player.throws,
        age: player.age,
        power: player.power,
        contact: player.contact,
        speed: player.speed,
        fielding: player.fielding,
        arm: player.arm,
        velocity: player.velocity,
        junk: player.junk,
        accuracy: player.accuracy,
        traits,
        arsenal: player.arsenal,
        personality: player.personality,
      },
      slotPlayer,
    };
  });
}

export function demandPlayerFromLeaguePlayer(player: Player): DemandUniversePlayer {
  const designPlayer = buildRosterDesignPool([player])[0];
  const iv = computePlayerIv(player);
  const shape = toRosterSlotPlayer({
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition ?? null,
    traits: [player.trait1, player.trait2],
  });
  return {
    id: player.id,
    name: playerName(player),
    iv,
    salary: player.salary,
    isPitcher: shape.isPitcher,
    position: shape.position,
    role: shape.role as DemandUniversePlayer["role"],
    secondaryPosition: shape.secondaryPosition,
    twoWayVariant: shape.twoWayVariant,
    bat: {
      POW: player.power,
      CON: player.contact,
      SPD: player.speed,
      FLD: player.fielding,
      ARM: player.arm,
    },
    pit: shape.isPitcher
      ? { VEL: player.velocity, JNK: player.junk, ACC: player.accuracy }
      : undefined,
    profile: designPlayer.profile,
  };
}

export function demandUniverseFromPlayers(sourcePlayers: readonly Player[]): DemandUniversePlayer[] {
  return sourcePlayers.map(demandPlayerFromLeaguePlayer);
}
