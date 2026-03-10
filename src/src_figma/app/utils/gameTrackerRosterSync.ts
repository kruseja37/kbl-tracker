import type { Pitcher, Player } from "@/app/components/TeamRoster";
import type { TeamLineupSnapshot } from "@/hooks/useGameState";

type TeamSide = 'away' | 'home';

type RosterIdentityResolver = (
  entity: { name: string; playerId?: string },
  team: TeamSide,
) => string;

export function reconcileTeamPlayersWithLineupSnapshot(
  existingPlayers: Player[],
  snapshot: TeamLineupSnapshot,
  team: TeamSide,
  getRosterEntityId: RosterIdentityResolver,
): Player[] {
  const lineupById = new Map(snapshot.lineup.map(player => [player.playerId, player]));
  const benchById = new Map(snapshot.bench.map(player => [player.playerId, player]));
  const usedPlayers = new Set(snapshot.usedPlayers);
  const seenPlayerIds = new Set<string>();

  const nextPlayers = existingPlayers.map((player) => {
    const playerId = getRosterEntityId(player, team);
    seenPlayerIds.add(playerId);

    const lineupEntry = lineupById.get(playerId);
    if (lineupEntry) {
      return {
        ...player,
        playerId: lineupEntry.playerId,
        name: lineupEntry.playerName,
        position: lineupEntry.position,
        battingOrder: lineupEntry.battingOrder,
        isOutOfGame: false,
      };
    }

    const benchEntry = benchById.get(playerId);
    if (benchEntry) {
      return {
        ...player,
        playerId: benchEntry.playerId,
        name: benchEntry.playerName,
        battingOrder: undefined,
        position: player.position || benchEntry.positions[0] || player.position,
        isOutOfGame: !benchEntry.isAvailable,
      };
    }

    if (usedPlayers.has(playerId)) {
      return {
        ...player,
        playerId,
        battingOrder: undefined,
        isOutOfGame: true,
      };
    }

    return player;
  });

  for (const lineupEntry of snapshot.lineup) {
    if (seenPlayerIds.has(lineupEntry.playerId)) continue;
    nextPlayers.push({
      name: lineupEntry.playerName,
      playerId: lineupEntry.playerId,
      position: lineupEntry.position,
      battingOrder: lineupEntry.battingOrder,
      stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
      battingHand: 'R',
      isOutOfGame: false,
    });
  }

  for (const benchEntry of snapshot.bench) {
    if (seenPlayerIds.has(benchEntry.playerId)) continue;
    nextPlayers.push({
      name: benchEntry.playerName,
      playerId: benchEntry.playerId,
      position: benchEntry.positions[0],
      stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
      battingHand: 'R',
      isOutOfGame: !benchEntry.isAvailable,
    });
  }

  return nextPlayers;
}

export function reconcileTeamPitchersWithLineupSnapshot(
  existingPitchers: Pitcher[],
  players: Player[],
  snapshot: TeamLineupSnapshot,
  team: TeamSide,
  getRosterEntityId: RosterIdentityResolver,
): Pitcher[] {
  const currentPitcherId = snapshot.currentPitcher?.playerId || null;
  const usedPlayers = new Set(snapshot.usedPlayers);
  const seenPitcherIds = new Set<string>();

  const nextPitchers = existingPitchers.map((pitcher, index) => {
    const pitcherId = getRosterEntityId(pitcher, team);
    seenPitcherIds.add(pitcherId);

    return {
      ...pitcher,
      playerId: pitcherId,
      isStarter: index === 0,
      isActive: currentPitcherId === pitcherId,
      isOutOfGame: currentPitcherId === pitcherId ? false : usedPlayers.has(pitcherId),
    };
  });

  if (currentPitcherId && !seenPitcherIds.has(currentPitcherId)) {
    const matchingPlayer = players.find((player) => getRosterEntityId(player, team) === currentPitcherId);
    nextPitchers.push({
      name: snapshot.currentPitcher?.playerName || matchingPlayer?.name || currentPitcherId,
      playerId: currentPitcherId,
      stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
      throwingHand: matchingPlayer?.throws || 'R',
      isStarter: false,
      isActive: true,
      isOutOfGame: false,
      velocity: matchingPlayer?.velocity,
      junk: matchingPlayer?.junk,
      accuracy: matchingPlayer?.accuracy,
      arsenal: matchingPlayer?.arsenal,
      overallGrade: matchingPlayer?.overallGrade,
      trait1: matchingPlayer?.trait1,
      trait2: matchingPlayer?.trait2,
      personality: matchingPlayer?.personality,
      chemistry: matchingPlayer?.chemistry,
      age: matchingPlayer?.age,
      secondaryPosition: matchingPlayer?.secondaryPosition,
      power: matchingPlayer?.power,
      contact: matchingPlayer?.contact,
      speed: matchingPlayer?.speed,
      fieldingRating: matchingPlayer?.fieldingRating,
      arm: matchingPlayer?.arm,
    });
  }

  return nextPitchers;
}
