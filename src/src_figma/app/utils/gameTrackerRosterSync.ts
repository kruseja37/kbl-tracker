import type { Pitcher, Player } from "@/app/components/TeamRoster";
import type { TeamLineupSnapshot } from "@/hooks/useGameState";

type TeamSide = 'away' | 'home';

type RosterIdentityResolver = (
  entity: { name: string; playerId?: string },
  team: TeamSide,
) => string;

const EMPTY_PLAYER_STATS = { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 };
const EMPTY_PITCHER_STATS = { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 };

function compareRosterOrder(left: Player, right: Player): number {
  const leftOrder = left.battingOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.battingOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.name.localeCompare(right.name);
}

function createSnapshotPitcher(
  pitcherId: string,
  pitcherName: string,
  existingPitcher?: Pitcher,
  matchingPlayer?: Player,
  overrides?: Partial<Pitcher>,
): Pitcher {
  return {
    name: pitcherName,
    playerId: pitcherId,
    stats: existingPitcher?.stats ?? { ...EMPTY_PITCHER_STATS },
    throwingHand:
      existingPitcher?.throwingHand ||
      matchingPlayer?.throws ||
      'R',
    throws: existingPitcher?.throws ?? matchingPlayer?.throws,
    isStarter: existingPitcher?.isStarter ?? false,
    isActive: existingPitcher?.isActive ?? false,
    isOutOfGame: existingPitcher?.isOutOfGame ?? false,
    velocity: existingPitcher?.velocity ?? matchingPlayer?.velocity,
    junk: existingPitcher?.junk ?? matchingPlayer?.junk,
    accuracy: existingPitcher?.accuracy ?? matchingPlayer?.accuracy,
    arsenal: existingPitcher?.arsenal ?? matchingPlayer?.arsenal,
    overallGrade: existingPitcher?.overallGrade ?? matchingPlayer?.overallGrade,
    trait1: existingPitcher?.trait1 ?? matchingPlayer?.trait1,
    trait2: existingPitcher?.trait2 ?? matchingPlayer?.trait2,
    personality: existingPitcher?.personality ?? matchingPlayer?.personality,
    chemistry: existingPitcher?.chemistry ?? matchingPlayer?.chemistry,
    age: existingPitcher?.age ?? matchingPlayer?.age,
    secondaryPosition:
      existingPitcher?.secondaryPosition ?? matchingPlayer?.secondaryPosition,
    power: existingPitcher?.power ?? matchingPlayer?.power,
    contact: existingPitcher?.contact ?? matchingPlayer?.contact,
    speed: existingPitcher?.speed ?? matchingPlayer?.speed,
    fieldingRating:
      existingPitcher?.fieldingRating ?? matchingPlayer?.fieldingRating,
    arm: existingPitcher?.arm ?? matchingPlayer?.arm,
    ...overrides,
  };
}

function createSnapshotPlayer(
  player: {
    playerId: string;
    playerName: string;
    position?: string;
    battingOrder?: number;
  },
  isOutOfGame: boolean,
): Player {
  return {
    name: player.playerName,
    playerId: player.playerId,
    position: player.position,
    battingOrder: player.battingOrder,
    stats: { ...EMPTY_PLAYER_STATS },
    battingHand: 'R',
    isOutOfGame,
  };
}

export function reconcileTeamPlayersWithLineupSnapshot(
  existingPlayers: Player[],
  snapshot: TeamLineupSnapshot,
  team: TeamSide,
  getRosterEntityId: RosterIdentityResolver,
): Player[] {
  const lineupById = new Map(snapshot.lineup.map(player => [player.playerId, player]));
  const benchById = new Map(snapshot.bench.map(player => [player.playerId, player]));
  const currentPitcher = snapshot.currentPitcher;
  const currentPitcherAlreadyInLineup = !!(currentPitcher && lineupById.has(currentPitcher.playerId));
  const separateDhInLineup = snapshot.lineup.some((player) =>
    player.position === 'DH' && player.playerId !== currentPitcher?.playerId
  );
  const shouldInjectPitcherIntoLineup = !!(currentPitcher && !currentPitcherAlreadyInLineup && !separateDhInLineup);
  const outgoingPitcherEntry = shouldInjectPitcherIntoLineup
    ? snapshot.lineup.find((player) =>
        player.playerId === currentPitcher.playerId ||
        player.position === 'P' ||
        player.battingOrder === currentPitcher.battingOrder
      )
    : null;
  const oldPitcherId = outgoingPitcherEntry?.playerId ?? null;
  const usedPlayers = new Set(snapshot.usedPlayers);
  const existingById = new Map(
    existingPlayers.map((player) => [getRosterEntityId(player, team), player]),
  );
  const existingByName = new Map(existingPlayers.map((player) => [player.name, player]));
  const seenPlayerIds = new Set<string>();
  const nextPlayers: Player[] = [];

  const findExistingPlayer = (playerId: string, playerName: string) =>
    existingById.get(playerId) || existingByName.get(playerName);

  const pushPlayer = (
    playerId: string,
    playerName: string,
    position: string | undefined,
    battingOrder: number | undefined,
    isOutOfGame: boolean,
    existingOverride?: Player,
  ) => {
    if (seenPlayerIds.has(playerId)) {
      return;
    }
    const existing = existingOverride || findExistingPlayer(playerId, playerName);
    nextPlayers.push({
      ...(existing || {
        stats: { ...EMPTY_PLAYER_STATS },
        battingHand: 'R' as const,
      }),
      playerId,
      name: playerName,
      position,
      battingOrder,
      isOutOfGame,
    });
    seenPlayerIds.add(playerId);
  };

  const normalizedLineup = shouldInjectPitcherIntoLineup
    ? snapshot.lineup.map((entry) =>
        oldPitcherId && entry.playerId === oldPitcherId
          ? {
              ...entry,
              playerId: currentPitcher.playerId,
              playerName: currentPitcher.playerName,
              position: 'P',
              battingOrder: currentPitcher.battingOrder,
            }
          : entry,
      )
    : snapshot.lineup;

  for (const lineupEntry of normalizedLineup) {
    pushPlayer(
      lineupEntry.playerId,
      lineupEntry.playerName,
      lineupEntry.position,
      lineupEntry.battingOrder,
      false,
    );
  }

  for (const benchEntry of snapshot.bench) {
    pushPlayer(
      benchEntry.playerId,
      benchEntry.playerName,
      benchEntry.positions[0],
      undefined,
      !benchEntry.isAvailable,
    );
  }

  if (
    currentPitcher &&
    !seenPlayerIds.has(currentPitcher.playerId)
  ) {
    const existingPitcherSlot = existingPlayers.find((player) => {
      const playerId = getRosterEntityId(player, team);
      return (
        playerId === currentPitcher.playerId ||
        (oldPitcherId ? playerId === oldPitcherId : false) ||
        player.battingOrder === currentPitcher.battingOrder
      );
    });
    pushPlayer(
      currentPitcher.playerId,
      currentPitcher.playerName,
      'P',
      currentPitcher.battingOrder,
      false,
      existingPitcherSlot,
    );
  }

  for (const player of existingPlayers) {
    const playerId = getRosterEntityId(player, team);
    if (!usedPlayers.has(playerId) || seenPlayerIds.has(playerId)) {
      continue;
    }
    pushPlayer(
      playerId,
      player.name,
      player.position,
      undefined,
      true,
      player,
    );
  }

  return nextPlayers.sort(compareRosterOrder);
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
  const benchPitchers = snapshot.bench.filter((entry) =>
    entry.positions.some((position) => position.includes('P')),
  );
  const benchPitcherById = new Map(benchPitchers.map((pitcher) => [pitcher.playerId, pitcher]));
  const existingPitcherById = new Map(
    existingPitchers.map((pitcher) => [getRosterEntityId(pitcher, team), pitcher]),
  );
  const playerById = new Map(
    players.map((player) => [getRosterEntityId(player, team), player]),
  );
  const orderedPitcherIds: string[] = [];
  const seenPitcherIds = new Set<string>();

  const pushPitcherId = (pitcherId?: string | null) => {
    if (!pitcherId || seenPitcherIds.has(pitcherId)) {
      return;
    }
    orderedPitcherIds.push(pitcherId);
    seenPitcherIds.add(pitcherId);
  };

  for (const pitcher of existingPitchers) {
    const pitcherId = getRosterEntityId(pitcher, team);
    if (
      pitcherId === currentPitcherId ||
      usedPlayers.has(pitcherId) ||
      benchPitcherById.has(pitcherId)
    ) {
      pushPitcherId(pitcherId);
    }
  }

  for (const benchPitcher of benchPitchers) {
    pushPitcherId(benchPitcher.playerId);
  }
  pushPitcherId(currentPitcherId);

  return orderedPitcherIds.map((pitcherId, index) => {
    const existingPitcher = existingPitcherById.get(pitcherId);
    const benchPitcher = benchPitcherById.get(pitcherId);
    const matchingPlayer = playerById.get(pitcherId);
    const pitcherName =
      existingPitcher?.name ??
      (snapshot.currentPitcher?.playerId === pitcherId
        ? snapshot.currentPitcher?.playerName
        : undefined) ??
      benchPitcher?.playerName ??
      matchingPlayer?.name ??
      pitcherId;
    const isActive = currentPitcherId === pitcherId;
    const isUnavailableFromBench = benchPitcher ? !benchPitcher.isAvailable : false;

    return createSnapshotPitcher(
      pitcherId,
      pitcherName as string,
      existingPitcher,
      matchingPlayer,
      {
        isStarter: existingPitcher?.isStarter ?? index === 0,
        isActive,
        isOutOfGame: isActive ? false : usedPlayers.has(pitcherId) || isUnavailableFromBench,
      },
    );
  });
}
