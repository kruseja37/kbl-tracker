type TeamSide = "away" | "home";

type RosterEntity = {
  name: string;
  playerId?: string;
};

type PositionPlayer = RosterEntity & {
  throws?: "L" | "R";
  isOutOfGame?: boolean;
};

type Pitcher = RosterEntity & {
  throwingHand?: "L" | "R";
  isActive?: boolean;
  isOutOfGame?: boolean;
};

type LineupSnapshot = {
  lineup: Array<{ playerId: string; playerName: string }>;
  currentPitcher?: { playerId: string; playerName: string } | null;
};

export interface PitchingCandidate {
  id: string;
  name: string;
  hand: "L" | "R";
  source: "pitcher" | "bench_position_player";
}

interface BuildPitchingCandidateOptions {
  fieldingTeam: TeamSide;
  pitchers: Pitcher[];
  positionPlayers: PositionPlayer[];
  fieldingSnapshot: LineupSnapshot;
  currentPitcherId: string;
  getRosterEntityId: (entity: RosterEntity, team: TeamSide) => string;
}

function normalizeHand(hand?: "L" | "R"): "L" | "R" {
  return hand === "L" ? "L" : "R";
}

export function buildAvailablePitchingCandidates({
  fieldingTeam,
  pitchers,
  positionPlayers,
  fieldingSnapshot,
  currentPitcherId,
  getRosterEntityId,
}: BuildPitchingCandidateOptions): PitchingCandidate[] {
  const activeFieldingLineupIds = new Set(
    fieldingSnapshot.lineup.map((player) => player.playerId),
  );
  const activeFieldingLineupNames = new Set(
    fieldingSnapshot.lineup.map((player) => player.playerName),
  );
  if (fieldingSnapshot.currentPitcher) {
    activeFieldingLineupIds.add(fieldingSnapshot.currentPitcher.playerId);
    activeFieldingLineupNames.add(fieldingSnapshot.currentPitcher.playerName);
  }

  const pitcherIds = new Set(
    pitchers.map((pitcher) => getRosterEntityId(pitcher, fieldingTeam)),
  );
  const seenCandidateIds = new Set<string>();
  const candidates: PitchingCandidate[] = [];

  for (const pitcher of pitchers) {
    const pitcherId = getRosterEntityId(pitcher, fieldingTeam);
    if (pitcher.isActive || pitcher.isOutOfGame || seenCandidateIds.has(pitcherId)) {
      continue;
    }
    seenCandidateIds.add(pitcherId);
    candidates.push({
      id: pitcherId,
      name: pitcher.name,
      hand: normalizeHand(pitcher.throwingHand),
      source: "pitcher",
    });
  }

  for (const player of positionPlayers) {
    const playerId = getRosterEntityId(player, fieldingTeam);
    if (
      pitcherIds.has(playerId) ||
      activeFieldingLineupIds.has(playerId) ||
      activeFieldingLineupNames.has(player.name) ||
      player.isOutOfGame ||
      playerId === currentPitcherId ||
      seenCandidateIds.has(playerId)
    ) {
      continue;
    }
    seenCandidateIds.add(playerId);
    candidates.push({
      id: playerId,
      name: player.name,
      hand: normalizeHand(player.throws),
      source: "bench_position_player",
    });
  }

  return candidates;
}
