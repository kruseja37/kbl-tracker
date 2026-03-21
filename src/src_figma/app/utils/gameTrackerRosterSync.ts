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

  // R3: If no existing players match any snapshot entry, existing data is stale/fallback.
  // Build the roster entirely from the snapshot to avoid mixing fallback + real players.
  const anyExistingMatchesSnapshot = existingPlayers.some((player) => {
    const playerId = getRosterEntityId(player, team);
    return lineupById.has(playerId) || benchById.has(playerId) ||
      (snapshot.currentPitcher && playerId === snapshot.currentPitcher.playerId);
  });
  if (!anyExistingMatchesSnapshot && snapshot.lineup.length > 0) {
    const freshPlayers: Player[] = [];
    for (const entry of snapshot.lineup) {
      freshPlayers.push({
        name: entry.playerName,
        playerId: entry.playerId,
        position: entry.position,
        battingOrder: entry.battingOrder,
        stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
        battingHand: 'R',
        isOutOfGame: false,
      });
    }
    for (const entry of snapshot.bench) {
      freshPlayers.push({
        name: entry.playerName,
        playerId: entry.playerId,
        position: entry.positions[0],
        stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
        battingHand: 'R',
        isOutOfGame: !entry.isAvailable,
      });
    }
    // Add pitcher if not already in lineup (DH game)
    if (snapshot.currentPitcher && !lineupById.has(snapshot.currentPitcher.playerId)) {
      freshPlayers.push({
        name: snapshot.currentPitcher.playerName,
        playerId: snapshot.currentPitcher.playerId,
        position: 'P',
        battingOrder: snapshot.currentPitcher.battingOrder,
        stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
        battingHand: 'R',
        isOutOfGame: false,
      });
    }
    return freshPlayers.sort((a, b) => (a.battingOrder || 99) - (b.battingOrder || 99));
  }
  const usedPlayers = new Set(snapshot.usedPlayers);
  const seenPlayerIds = new Set<string>();
  const currentPitcher = snapshot.currentPitcher;
  const currentPitcherAlreadyInLineup = !!(currentPitcher && lineupById.has(currentPitcher.playerId));
  const separateDhInLineup = snapshot.lineup.some((player) =>
    player.position === 'DH' && player.playerId !== currentPitcher?.playerId
  );
  const shouldInjectPitcherIntoLineup = !!(currentPitcher && !currentPitcherAlreadyInLineup && !separateDhInLineup);

  const nextPlayers = existingPlayers.map((player) => {
    const playerId = getRosterEntityId(player, team);
    seenPlayerIds.add(playerId);

    if (
      shouldInjectPitcherIntoLineup &&
      (
        playerId === currentPitcher.playerId ||
        player.position === 'P' ||
        player.battingOrder === currentPitcher.battingOrder
      )
    ) {
      return {
        ...player,
        playerId: currentPitcher.playerId,
        name: currentPitcher.playerName,
        position: 'P',
        battingOrder: currentPitcher.battingOrder,
        isOutOfGame: false,
      };
    }

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

  if (
    shouldInjectPitcherIntoLineup &&
    !nextPlayers.some((player) => getRosterEntityId(player, team) === currentPitcher.playerId)
  ) {
    nextPlayers.push({
      name: currentPitcher.playerName,
      playerId: currentPitcher.playerId,
      position: 'P',
      battingOrder: currentPitcher.battingOrder,
      stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
      battingHand: 'R',
      isOutOfGame: false,
    });
  }

  if (shouldInjectPitcherIntoLineup) {
    const existingPitcherSlot = nextPlayers.find((player) => {
      const playerId = getRosterEntityId(player, team);
      return (
        playerId === currentPitcher.playerId ||
        player.position === 'P' ||
        player.battingOrder === currentPitcher.battingOrder
      );
    });

    const normalizedPitcherSlot: Player = {
      ...(existingPitcherSlot || {
        stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
        battingHand: 'R' as const,
      }),
      playerId: currentPitcher.playerId,
      name: currentPitcher.playerName,
      position: 'P',
      battingOrder: currentPitcher.battingOrder,
      isOutOfGame: false,
    };

    return nextPlayers
      .filter((player) => {
        const playerId = getRosterEntityId(player, team);
        return !(
          playerId === currentPitcher.playerId ||
          player.position === 'P' ||
          player.battingOrder === currentPitcher.battingOrder
        );
      })
      .concat(normalizedPitcherSlot)
      .sort((left, right) => (left.battingOrder || 99) - (right.battingOrder || 99));
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

  // R3: If no existing pitchers match the snapshot's current pitcher, existing data is stale.
  // Build from snapshot to avoid mixing fallback + real pitchers.
  const anyPitcherMatches = existingPitchers.some((pitcher) => {
    const pitcherId = getRosterEntityId(pitcher, team);
    return pitcherId === currentPitcherId || usedPlayers.has(pitcherId);
  });
  if (!anyPitcherMatches && snapshot.currentPitcher) {
    const freshPitcher: Pitcher = {
      name: snapshot.currentPitcher.playerName,
      playerId: snapshot.currentPitcher.playerId,
      stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
      throwingHand: 'R',
      isStarter: true,
      isActive: true,
      isOutOfGame: false,
    };
    return [freshPitcher];
  }

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
