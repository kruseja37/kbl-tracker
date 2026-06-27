/**
 * franchiseLineupDomain — pure, React-free franchise lineup/rotation domain logic.
 *
 * Extracted verbatim from TeamHubContent so the Team Hub editor AND the Lineups tab share one
 * source of truth (no divergent copies). Nothing here touches React, storage, or the engine —
 * it is the lineup/rotation math + the optimizer-candidate mapping + the stale-snapshot rules.
 */
import type { LineupSlot, Player, Position, Team } from "../../../utils/leagueBuilderStorage";
import {
  markOptimalLineupSnapshotsStaleForChange,
  OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
  optimalLineupFieldsForDh,
  type OptimalLineupCandidate,
  type OptimalLineupSnapshotField,
} from "../../../utils/optimalLineup";
import type { OptimalLineupSnapshot } from "../../../types/managerWpa";

export const FRANCHISE_FIELD_POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
export const FRANCHISE_PITCHER_POSITIONS = new Set<Position>(['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY']);
export const FRANCHISE_ROTATION_POSITIONS = new Set<Position>(['SP', 'SP/RP']);
/** SMB4 is always a four-man starting rotation (JK ruling 2026-06-26). */
export const FRANCHISE_ROTATION_SIZE = 4;

export function getFranchisePlayerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

/** MLB-active roster-membership rule for a franchise team (MLB or unset rosterStatus). */
export function isActiveFranchisePlayerForTeam(player: Player, teamId: string, leagueId?: string): boolean {
  return player.leagueAssignments?.some((assignment) =>
    assignment.teamId === teamId &&
    (!leagueId || assignment.leagueId === leagueId) &&
    (assignment.rosterStatus === 'MLB' || assignment.rosterStatus == null),
  ) ?? false;
}

export function toOptimalCandidate(player: Player): OptimalLineupCandidate {
  return {
    playerId: player.id,
    playerName: getFranchisePlayerName(player),
    bats: player.bats,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    arsenal: player.arsenal,
    armSlot: player.armSlot,
    mojo: player.mojo,
    trait1: player.trait1,
    trait2: player.trait2,
    unavailable: false,
  };
}

export function buildOptimalPlayerStates(players: Player[]) {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        mojo: toEffectiveMojo(player.mojo),
        fitness: "FIT" as const,
      },
    ]),
  );
}

export function toEffectiveMojo(mojo: Player["mojo"]) {
  if (mojo === "On Fire") return "On Fire" as const;
  if (mojo === "Hot") return "Locked In" as const;
  if (mojo === "Cold") return "Tense" as const;
  if (mojo === "Ice Cold") return "Rattled" as const;
  return "Normal" as const;
}

export function lineupSlotsFromOptimalSnapshot(snapshot: OptimalLineupSnapshot): LineupSlot[] {
  return snapshot.slots
    .slice()
    .sort((left, right) => left.battingOrderSlot - right.battingOrderSlot)
    .map((slot) => ({
      battingOrder: slot.battingOrderSlot,
      playerId: slot.playerId,
      fieldingPosition: slot.defensivePosition as Position,
    }));
}

export function buildDefaultFranchiseLineupSlots(players: Player[], useDH: boolean): LineupSlot[] {
  const positionPlayers = players.filter((player) => !FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition));
  const assigned = new Set<string>();
  const slots: LineupSlot[] = [];

  for (const position of FRANCHISE_FIELD_POSITIONS) {
    const player =
      positionPlayers.find((candidate) => !assigned.has(candidate.id) && candidate.primaryPosition === position) ??
      positionPlayers.find((candidate) => !assigned.has(candidate.id) && candidate.secondaryPosition === position) ??
      positionPlayers.find((candidate) => !assigned.has(candidate.id));
    if (!player) continue;
    assigned.add(player.id);
    slots.push({
      battingOrder: slots.length + 1,
      playerId: player.id,
      fieldingPosition: position,
    });
  }

  if (useDH) {
    const dhPlayer = positionPlayers.find((candidate) => !assigned.has(candidate.id));
    if (dhPlayer) {
      slots.push({
        battingOrder: slots.length + 1,
        playerId: dhPlayer.id,
        fieldingPosition: 'DH',
      });
    }
  }

  return slots;
}

export function normalizeFranchiseLineupSlots(
  players: Player[],
  storedLineup: LineupSlot[] | undefined,
  useDH: boolean,
): LineupSlot[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const positionPlayers = players.filter((player) => !FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition));
  const assigned = new Set<string>();
  const slots: LineupSlot[] = [];
  const targetNonPitchers = useDH ? 9 : 8;

  for (const slot of [...(storedLineup ?? [])].sort((left, right) => left.battingOrder - right.battingOrder)) {
    if (slots.length === targetNonPitchers) break;
    const player = playerById.get(slot.playerId);
    if (!player || assigned.has(player.id)) continue;
    if (FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition)) continue;
    if (!useDH && slot.fieldingPosition === 'DH') continue;
    assigned.add(player.id);
    slots.push({
      battingOrder: slots.length + 1,
      playerId: player.id,
      fieldingPosition: slot.fieldingPosition,
    });
  }

  const fallbackSlots = buildDefaultFranchiseLineupSlots(players, useDH);
  for (const slot of fallbackSlots) {
    if (slots.length === targetNonPitchers) break;
    if (assigned.has(slot.playerId)) continue;
    assigned.add(slot.playerId);
    slots.push({
      ...slot,
      battingOrder: slots.length + 1,
    });
  }

  if (!useDH && slots.length < 9) {
    const starter =
      players.find((player) => FRANCHISE_ROTATION_POSITIONS.has(player.primaryPosition)) ??
      players.find((player) => FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition));
    if (starter) {
      slots.push({
        battingOrder: slots.length + 1,
        playerId: starter.id,
        fieldingPosition: 'P',
      });
    }
  }

  return slots.slice(0, 9).map((slot, index) => ({
    ...slot,
    battingOrder: index + 1,
  }));
}

export function isFranchisePitcher(player: Player): boolean {
  return FRANCHISE_PITCHER_POSITIONS.has(player.primaryPosition);
}

export function getManualLineupTargetCount(players: Player[], useDH: boolean): number {
  const positionPlayerCount = players.filter((player) => !isFranchisePitcher(player)).length;
  return Math.min(useDH ? 9 : 8, positionPlayerCount);
}

export function buildEditableFranchiseLineupSlots(
  players: Player[],
  storedLineup: LineupSlot[] | undefined,
  useDH: boolean,
): LineupSlot[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const targetCount = getManualLineupTargetCount(players, useDH);
  return normalizeFranchiseLineupSlots(players, storedLineup, useDH)
    .filter((slot) => {
      const player = playerById.get(slot.playerId);
      return Boolean(player && !isFranchisePitcher(player));
    })
    .slice(0, targetCount)
    .map((slot, index) => ({
      ...slot,
      battingOrder: index + 1,
      fieldingPosition: !useDH && slot.fieldingPosition === 'DH' ? players.find((player) => player.id === slot.playerId)?.primaryPosition ?? 'LF' : slot.fieldingPosition,
    }));
}

export function getFranchiseRotationCandidates(players: Player[]): Player[] {
  const rotationEligible = players.filter((player) => FRANCHISE_ROTATION_POSITIONS.has(player.primaryPosition));
  return rotationEligible.length > 0
    ? rotationEligible
    : players.filter((player) => isFranchisePitcher(player));
}

export function normalizeFranchiseRotationIds(players: Player[], storedRotation: string[] | undefined): string[] {
  const candidates = getFranchiseRotationCandidates(players);
  const candidateIds = new Set(candidates.map((player) => player.id));
  const assigned = new Set<string>();
  const normalized: string[] = [];

  for (const playerId of storedRotation ?? []) {
    if (!candidateIds.has(playerId) || assigned.has(playerId)) continue;
    assigned.add(playerId);
    normalized.push(playerId);
  }

  for (const player of candidates) {
    if (assigned.has(player.id)) continue;
    assigned.add(player.id);
    normalized.push(player.id);
  }

  // SMB4 rotations are always four-man — never persist more than four starters.
  return normalized.slice(0, FRANCHISE_ROTATION_SIZE);
}

export function duplicateIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (!id) continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return Array.from(duplicates);
}

export function expectedManualLineupPositions(useDH: boolean): Position[] {
  return useDH ? [...FRANCHISE_FIELD_POSITIONS, 'DH'] : FRANCHISE_FIELD_POSITIONS;
}

export function describeStoredLineupRotationWarnings(
  players: Player[],
  storedLineup: LineupSlot[] | undefined,
  storedRotation: string[] | undefined,
  useDH: boolean,
): string[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const rotationCandidateIds = new Set(getFranchiseRotationCandidates(players).map((player) => player.id));
  const warnings: string[] = [];
  const staleLineupIds = (storedLineup ?? [])
    .filter((slot) => {
      const playerId = slot.playerId;
      const player = playerById.get(playerId);
      if (!player) return true;
      if (isFranchisePitcher(player)) return useDH || slot?.fieldingPosition !== 'P';
      if (!useDH && slot?.fieldingPosition === 'DH') return true;
      return false;
    })
    .map((slot) => slot.playerId);
  const duplicateLineupIds = duplicateIds((storedLineup ?? []).map((slot) => slot.playerId));
  const staleRotationIds = (storedRotation ?? []).filter((playerId) => !rotationCandidateIds.has(playerId));
  const duplicateRotationIds = duplicateIds(storedRotation ?? []);

  if (staleLineupIds.length > 0) {
    warnings.push(`Saved lineup includes non-current MLB players: ${Array.from(new Set(staleLineupIds)).join(', ')}.`);
  }
  if (duplicateLineupIds.length > 0) {
    warnings.push(`Saved lineup includes duplicate players: ${duplicateLineupIds.join(', ')}.`);
  }
  if (staleRotationIds.length > 0) {
    warnings.push(`Saved rotation includes non-current MLB pitchers: ${Array.from(new Set(staleRotationIds)).join(', ')}.`);
  }
  if (duplicateRotationIds.length > 0) {
    warnings.push(`Saved rotation includes duplicate pitchers: ${duplicateRotationIds.join(', ')}.`);
  }

  return warnings;
}

export function buildManualLineupForSave(
  players: Player[],
  editableSlots: LineupSlot[],
  rotationIds: string[],
  useDH: boolean,
): LineupSlot[] {
  const activePlayerIds = new Set(players.map((player) => player.id));
  const playerById = new Map(players.map((player) => [player.id, player]));
  const targetCount = getManualLineupTargetCount(players, useDH);
  const slots: LineupSlot[] = editableSlots
    .filter((slot) => activePlayerIds.has(slot.playerId))
    .filter((slot) => {
      const player = playerById.get(slot.playerId);
      return Boolean(player && !isFranchisePitcher(player));
    })
    .slice(0, targetCount)
    .map((slot, index) => ({
      ...slot,
      battingOrder: index + 1,
      fieldingPosition: !useDH && slot.fieldingPosition === 'DH' ? playerById.get(slot.playerId)?.primaryPosition ?? 'LF' : slot.fieldingPosition,
    }));

  if (!useDH) {
    const rotationCandidates = getFranchiseRotationCandidates(players);
    const starterId =
      rotationIds.find((playerId) => rotationCandidates.some((candidate) => candidate.id === playerId)) ??
      rotationCandidates[0]?.id;
    if (starterId) {
      slots.push({
        battingOrder: slots.length + 1,
        playerId: starterId,
        fieldingPosition: 'P',
      });
    }
  }

  return slots.slice(0, 9).map((slot, index) => ({
    ...slot,
    battingOrder: index + 1,
  }));
}

export function getFreshOptimalLineupFields(update: Partial<Team>): OptimalLineupSnapshotField[] {
  return OPTIMAL_LINEUP_SNAPSHOT_FIELDS.filter((field) => field in update);
}

export function applyFranchiseTeamUpdateWithStaleOptimalSnapshots(
  team: Team,
  update: Partial<Team>,
): Team {
  const staleFields = new Set<OptimalLineupSnapshotField>();
  const preserveFields = getFreshOptimalLineupFields(update);

  if ('lineupWithDH' in update) {
    for (const field of optimalLineupFieldsForDh(true)) staleFields.add(field);
  }

  if ('lineupWithoutDH' in update) {
    for (const field of optimalLineupFieldsForDh(false)) staleFields.add(field);
  }

  if ('startingRotation' in update) {
    for (const field of optimalLineupFieldsForDh(false)) staleFields.add(field);
  }

  return markOptimalLineupSnapshotsStaleForChange(
    { ...team, ...update },
    Array.from(staleFields),
    preserveFields,
  );
}
