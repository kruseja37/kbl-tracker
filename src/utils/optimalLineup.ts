import type {
  GameLockLineupSnapshots,
  ManagerDecisionConfidence,
  OpposingPitcherHand,
  OptimalLineupGeneratedFrom,
  OptimalLineupModeContext,
  OptimalLineupSlot,
  OptimalLineupSnapshot,
  OptimalLineupSourceConfidence,
} from "../types/managerWpa";

export const OPTIMAL_LINEUP_ALGORITHM_VERSION =
  "kbl-optimal-lineup-v2-greedy-1";

const FIELD_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"] as const;
const PREMIUM_POSITIONS = new Set(["C", "SS", "CF", "2B"]);
const PITCHER_POSITIONS = new Set(["P", "SP", "RP", "CP", "SP/RP", "TWO-WAY"]);

export interface OptimalLineupCandidate {
  playerId: string;
  playerName: string;
  bats?: "L" | "R" | "S" | string;
  primaryPosition?: string;
  secondaryPosition?: string;
  currentPosition?: string;
  power?: number;
  contact?: number;
  speed?: number;
  fielding?: number;
  arm?: number;
  mojo?: number | string;
  fitness?: string;
  unavailable?: boolean;
}

export interface LineupSlotInput {
  playerId: string;
  playerName: string;
  battingOrderSlot: number;
  defensivePosition: string;
}

export interface BuildOptimalLineupSnapshotInput {
  teamId: string;
  mode: OptimalLineupModeContext;
  opposingPitcherHand: OpposingPitcherHand;
  candidates: OptimalLineupCandidate[];
  dhEnabled?: boolean;
  instanceId?: string;
  rosterVersionId?: string;
  generatedAt?: number;
  generatedFrom: OptimalLineupGeneratedFrom;
  sourceConfidence: OptimalLineupSourceConfidence;
}

export interface BuildLineupSnapshotFromSlotsInput
  extends Omit<BuildOptimalLineupSnapshotInput, "generatedFrom" | "sourceConfidence"> {
  slots: LineupSlotInput[];
  generatedFrom?: OptimalLineupGeneratedFrom;
  sourceConfidence?: OptimalLineupSourceConfidence;
}

export interface LineupSnapshotDeviation {
  chosenSlot: OptimalLineupSlot;
  optimalSlot: OptimalLineupSlot;
  projectedOpportunityCost: number;
}

export type OptimalLineupSnapshotField =
  | "optimalLineupVsRHPWithDH"
  | "optimalLineupVsLHPWithDH"
  | "optimalLineupVsRHPWithoutDH"
  | "optimalLineupVsLHPWithoutDH";

export type OptimalLineupSnapshotCarrier = Partial<
  Record<OptimalLineupSnapshotField, OptimalLineupSnapshot>
>;

export const OPTIMAL_LINEUP_SNAPSHOT_FIELDS: OptimalLineupSnapshotField[] = [
  "optimalLineupVsRHPWithDH",
  "optimalLineupVsLHPWithDH",
  "optimalLineupVsRHPWithoutDH",
  "optimalLineupVsLHPWithoutDH",
];

export function optimalLineupField(
  opposingPitcherHand: OpposingPitcherHand,
  dhEnabled: boolean,
): OptimalLineupSnapshotField {
  if (opposingPitcherHand === "L") {
    return dhEnabled ? "optimalLineupVsLHPWithDH" : "optimalLineupVsLHPWithoutDH";
  }
  return dhEnabled ? "optimalLineupVsRHPWithDH" : "optimalLineupVsRHPWithoutDH";
}

export function optimalLineupFieldsForDh(dhEnabled: boolean): OptimalLineupSnapshotField[] {
  return dhEnabled
    ? ["optimalLineupVsRHPWithDH", "optimalLineupVsLHPWithDH"]
    : ["optimalLineupVsRHPWithoutDH", "optimalLineupVsLHPWithoutDH"];
}

export function markOptimalLineupSnapshotStale(
  snapshot: OptimalLineupSnapshot | undefined,
): OptimalLineupSnapshot | undefined {
  if (!snapshot || snapshot.sourceConfidence === "stale_roster") {
    return snapshot;
  }

  return {
    ...snapshot,
    sourceConfidence: "stale_roster",
    confidence: "low",
  };
}

export function markOptimalLineupSnapshotsStaleForChange<T extends OptimalLineupSnapshotCarrier>(
  carrier: T,
  fields: OptimalLineupSnapshotField[],
  preserveFreshFields: OptimalLineupSnapshotField[] = [],
): T {
  const preserve = new Set(preserveFreshFields);
  const next: OptimalLineupSnapshotCarrier = { ...carrier };

  for (const field of fields) {
    if (preserve.has(field)) continue;
    next[field] = markOptimalLineupSnapshotStale(next[field]);
  }

  return next as T;
}

export function selectOptimalLineupForOpposingPitcher(
  snapshots: { vsRHP?: OptimalLineupSnapshot; vsLHP?: OptimalLineupSnapshot } | undefined,
  opposingPitcher: { throwingHand?: string } | undefined,
): OptimalLineupSnapshot | undefined {
  const hand = opposingPitcher?.throwingHand?.toUpperCase() === "L" ? "L" : "R";
  return hand === "L" ? snapshots?.vsLHP : snapshots?.vsRHP;
}

export function cloneOptimalLineupSnapshot(
  snapshot: OptimalLineupSnapshot | undefined,
): OptimalLineupSnapshot | undefined {
  if (!snapshot) return undefined;
  return {
    ...snapshot,
    slots: snapshot.slots.map((slot) => ({ ...slot })),
  };
}

export function cloneGameLockLineupSnapshots(
  snapshots: GameLockLineupSnapshots | undefined,
): GameLockLineupSnapshots {
  return {
    away: cloneOptimalLineupSnapshot(snapshots?.away),
    home: cloneOptimalLineupSnapshot(snapshots?.home),
  };
}

export function buildOptimalLineupSnapshot(
  input: BuildOptimalLineupSnapshotInput,
): OptimalLineupSnapshot {
  const availableCandidates = input.candidates
    .filter((candidate) => !candidate.unavailable)
    .filter((candidate) => !isPitcherCandidate(candidate));
  const positions = input.dhEnabled ? [...FIELD_POSITIONS, "DH"] : [...FIELD_POSITIONS];
  const assignedPlayerIds = new Set<string>();
  const selected: Array<{
    candidate: OptimalLineupCandidate;
    defensivePosition: string;
    positionalFitScore: number;
  }> = [];

  for (const position of positions.filter((position) => position !== "DH")) {
    const candidate = availableCandidates
      .filter((row) => !assignedPlayerIds.has(row.playerId))
      .map((row) => ({
        candidate: row,
        positionalFitScore: positionalFitScore(row, position),
        totalScore:
          positionalFitScore(row, position) * 55 +
          projectedValueScore(row, input.opposingPitcherHand, position) * 0.45 +
          defensivePriorityBonus(row, position),
      }))
      .sort((left, right) => right.totalScore - left.totalScore)[0];

    if (!candidate) continue;
    assignedPlayerIds.add(candidate.candidate.playerId);
    selected.push({
      candidate: candidate.candidate,
      defensivePosition: position,
      positionalFitScore: candidate.positionalFitScore,
    });
  }

  if (input.dhEnabled) {
    const dhCandidate = availableCandidates
      .filter((row) => !assignedPlayerIds.has(row.playerId))
      .map((row) => ({
        candidate: row,
        positionalFitScore: positionalFitScore(row, "DH"),
        totalScore: projectedValueScore(row, input.opposingPitcherHand, "DH"),
      }))
      .sort((left, right) => right.totalScore - left.totalScore)[0];

    if (dhCandidate) {
      assignedPlayerIds.add(dhCandidate.candidate.playerId);
      selected.push({
        candidate: dhCandidate.candidate,
        defensivePosition: "DH",
        positionalFitScore: dhCandidate.positionalFitScore,
      });
    }
  }

  const ordered = orderLineupSlots(selected, input.opposingPitcherHand);
  const slots = ordered.map((entry, index) =>
    buildSlot({
      candidate: entry.candidate,
      defensivePosition: entry.defensivePosition,
      battingOrderSlot: index + 1,
      opposingPitcherHand: input.opposingPitcherHand,
      positionalFitScore: entry.positionalFitScore,
    }),
  );

  return buildSnapshot({
    ...input,
    slots,
    generatedAt: input.generatedAt ?? Date.now(),
    confidence: slots.length === positions.length ? "high" : "low",
  });
}

export function buildLineupSnapshotFromSlots(
  input: BuildLineupSnapshotFromSlotsInput,
): OptimalLineupSnapshot {
  const candidateById = new Map(input.candidates.map((candidate) => [candidate.playerId, candidate]));
  const slots = input.slots
    .filter((slot) => !PITCHER_POSITIONS.has(normalizePosition(slot.defensivePosition)))
    .map((slot) => {
      const candidate =
        candidateById.get(slot.playerId) ??
        ({
          playerId: slot.playerId,
          playerName: slot.playerName,
          currentPosition: slot.defensivePosition,
        } satisfies OptimalLineupCandidate);

      return buildSlot({
        candidate: {
          ...candidate,
          playerName: candidate.playerName || slot.playerName,
          currentPosition: candidate.currentPosition ?? slot.defensivePosition,
        },
        defensivePosition: slot.defensivePosition,
        battingOrderSlot: slot.battingOrderSlot,
        opposingPitcherHand: input.opposingPitcherHand,
        positionalFitScore: positionalFitScore(candidate, slot.defensivePosition),
      });
    })
    .sort((left, right) => left.battingOrderSlot - right.battingOrderSlot);

  return buildSnapshot({
    ...input,
    generatedAt: input.generatedAt ?? Date.now(),
    generatedFrom: input.generatedFrom ?? "game_lock",
    sourceConfidence: input.sourceConfidence ?? "engine_calculated",
    slots,
    confidence: slots.length > 0 ? "medium" : "low",
  });
}

export function mapLineupSnapshotDeviations(input: {
  chosen: OptimalLineupSnapshot;
  optimal: OptimalLineupSnapshot;
}): LineupSnapshotDeviation[] {
  if (lineupSnapshotsMatch(input.chosen, input.optimal)) {
    return [];
  }

  const chosenUnmatched = input.chosen.slots.filter(
    (chosenSlot) =>
      !input.optimal.slots.some((optimalSlot) => slotsMatch(chosenSlot, optimalSlot)),
  );
  const optimalUnmatched = input.optimal.slots.filter(
    (optimalSlot) =>
      !input.chosen.slots.some((chosenSlot) => slotsMatch(chosenSlot, optimalSlot)),
  );
  const usedChosenIds = new Set<string>();
  const usedOptimalKeys = new Set<string>();
  const pairs: LineupSnapshotDeviation[] = [];

  const pairCandidates = chosenUnmatched
    .flatMap((chosenSlot) =>
      optimalUnmatched.map((optimalSlot) => ({
        chosenSlot,
        optimalSlot,
        projectedOpportunityCost: roundWpa(
          chosenSlot.projectedSlotKblWpa - optimalSlot.projectedSlotKblWpa,
        ),
        rankScore: deviationRankScore(chosenSlot, optimalSlot),
      })),
    )
    .sort((left, right) => right.rankScore - left.rankScore);

  for (const candidate of pairCandidates) {
    const chosenKey = slotIdentity(candidate.chosenSlot);
    const optimalKey = slotIdentity(candidate.optimalSlot);
    if (usedChosenIds.has(chosenKey) || usedOptimalKeys.has(optimalKey)) continue;
    usedChosenIds.add(chosenKey);
    usedOptimalKeys.add(optimalKey);
    pairs.push({
      chosenSlot: candidate.chosenSlot,
      optimalSlot: candidate.optimalSlot,
      projectedOpportunityCost: candidate.projectedOpportunityCost,
    });
  }

  return pairs.sort(
    (left, right) =>
      left.projectedOpportunityCost - right.projectedOpportunityCost ||
      left.chosenSlot.battingOrderSlot - right.chosenSlot.battingOrderSlot,
  );
}

export function lineupSnapshotsMatch(
  chosen: OptimalLineupSnapshot,
  optimal: OptimalLineupSnapshot,
): boolean {
  if (chosen.slots.length !== optimal.slots.length) return false;
  return chosen.slots.every((chosenSlot) =>
    optimal.slots.some((optimalSlot) => slotsMatch(chosenSlot, optimalSlot)),
  );
}

function buildSnapshot(
  input: BuildOptimalLineupSnapshotInput & {
    generatedAt: number;
    slots: OptimalLineupSlot[];
    confidence: ManagerDecisionConfidence;
  },
): OptimalLineupSnapshot {
  const projectedTeamLineupKblWpa = roundWpa(
    input.slots.reduce((sum, slot) => sum + slot.projectedSlotKblWpa, 0),
  );

  return {
    snapshotId: [
      input.teamId,
      input.opposingPitcherHand,
      input.dhEnabled ? "dh" : "no-dh",
      input.generatedFrom,
      input.generatedAt,
    ].join(":"),
    teamId: input.teamId,
    mode: input.mode,
    instanceId: input.instanceId,
    opposingPitcherHand: input.opposingPitcherHand,
    rosterVersionId: input.rosterVersionId,
    algorithmVersion: OPTIMAL_LINEUP_ALGORITHM_VERSION,
    generatedAt: input.generatedAt,
    generatedFrom: input.generatedFrom,
    sourceConfidence: input.sourceConfidence,
    dhEnabled: input.dhEnabled,
    slots: input.slots,
    projectedTeamLineupKblWpa,
    confidence: input.confidence,
  };
}

function buildSlot(input: {
  candidate: OptimalLineupCandidate;
  defensivePosition: string;
  battingOrderSlot: number;
  opposingPitcherHand: OpposingPitcherHand;
  positionalFitScore: number;
}): OptimalLineupSlot {
  const projectedValue = projectedValueScore(
    input.candidate,
    input.opposingPitcherHand,
    input.defensivePosition,
  );

  return {
    playerId: input.candidate.playerId,
    playerName: input.candidate.playerName,
    battingOrderSlot: input.battingOrderSlot,
    defensivePosition: normalizePosition(input.defensivePosition),
    projectedSlotKblWpa: projectedSlotKblWpa(projectedValue, input.battingOrderSlot),
    projectedValueScore: roundScore(projectedValue),
    positionalFitScore: roundScore(input.positionalFitScore),
    confidence: input.candidate.power === undefined || input.candidate.contact === undefined
      ? "low"
      : "medium",
  };
}

function orderLineupSlots(
  entries: Array<{
    candidate: OptimalLineupCandidate;
    defensivePosition: string;
    positionalFitScore: number;
  }>,
  opposingPitcherHand: OpposingPitcherHand,
) {
  return [...entries].sort((left, right) => {
    const leftScore = battingOrderValue(left.candidate, opposingPitcherHand);
    const rightScore = battingOrderValue(right.candidate, opposingPitcherHand);
    return rightScore - leftScore || left.candidate.playerName.localeCompare(right.candidate.playerName);
  });
}

function battingOrderValue(
  candidate: OptimalLineupCandidate,
  opposingPitcherHand: OpposingPitcherHand,
): number {
  const contact = rating(candidate.contact, 50);
  const power = rating(candidate.power, 50);
  const speed = rating(candidate.speed, 50);
  return contact * 0.38 + power * 0.34 + speed * 0.18 + platoonBonus(candidate, opposingPitcherHand);
}

function projectedValueScore(
  candidate: OptimalLineupCandidate,
  opposingPitcherHand: OpposingPitcherHand,
  defensivePosition: string,
): number {
  const position = normalizePosition(defensivePosition);
  const contact = rating(candidate.contact, 50);
  const power = rating(candidate.power, 50);
  const speed = rating(candidate.speed, 50);
  const fielding = rating(candidate.fielding, 50);
  const arm = rating(candidate.arm, 50);
  const offense = contact * 0.36 + power * 0.36 + speed * 0.12;
  const defense = defensiveWeight(position) * (fielding * 0.65 + arm * 0.35);
  const fitness = fitnessAdjustment(candidate.fitness);
  const mojo = mojoAdjustment(candidate.mojo);

  return clamp(
    offense + defense + platoonBonus(candidate, opposingPitcherHand) + fitness + mojo,
    0,
    100,
  );
}

function positionalFitScore(
  candidate: OptimalLineupCandidate,
  defensivePosition: string,
): number {
  const position = normalizePosition(defensivePosition);
  if (position === "DH") return 1;
  if (normalizePosition(candidate.primaryPosition) === position) return 1;
  if (normalizePosition(candidate.currentPosition) === position) return 0.9;
  if (normalizePosition(candidate.secondaryPosition) === position) return 0.72;
  if (position === "LF" || position === "RF") {
    if (normalizePosition(candidate.primaryPosition) === "OF") return 0.68;
    if (normalizePosition(candidate.secondaryPosition) === "OF") return 0.62;
    if (normalizePosition(candidate.primaryPosition) === "CF") return 0.62;
  }
  if (position === "CF" && normalizePosition(candidate.primaryPosition) === "OF") return 0.55;
  if (["1B", "LF", "RF"].includes(position)) return 0.35;
  return 0.2;
}

function defensivePriorityBonus(
  candidate: OptimalLineupCandidate,
  defensivePosition: string,
): number {
  const position = normalizePosition(defensivePosition);
  if (!PREMIUM_POSITIONS.has(position)) return 0;
  return (rating(candidate.fielding, 50) + rating(candidate.arm, 50)) * 0.08;
}

function projectedSlotKblWpa(projectedValue: number, battingOrderSlot: number): number {
  const orderWeight = Math.max(0.88, 1.06 - (Math.max(1, battingOrderSlot) - 1) * 0.018);
  return roundWpa(((projectedValue - 55) / 500) * orderWeight);
}

function deviationRankScore(
  chosenSlot: OptimalLineupSlot,
  optimalSlot: OptimalLineupSlot,
): number {
  const opportunityCost = Math.abs(
    chosenSlot.projectedSlotKblWpa - optimalSlot.projectedSlotKblWpa,
  );
  const samePlayerBonus = chosenSlot.playerId === optimalSlot.playerId ? 10 : 0;
  const samePositionBonus =
    chosenSlot.defensivePosition === optimalSlot.defensivePosition ? 4 : 0;
  const sameOrderBonus =
    chosenSlot.battingOrderSlot === optimalSlot.battingOrderSlot ? 2 : 0;
  return opportunityCost * 1000 + samePlayerBonus + samePositionBonus + sameOrderBonus;
}

function slotsMatch(left: OptimalLineupSlot, right: OptimalLineupSlot): boolean {
  return (
    left.playerId === right.playerId &&
    left.battingOrderSlot === right.battingOrderSlot &&
    normalizePosition(left.defensivePosition) === normalizePosition(right.defensivePosition)
  );
}

function slotIdentity(slot: OptimalLineupSlot): string {
  return `${slot.playerId}:${slot.battingOrderSlot}:${normalizePosition(slot.defensivePosition)}`;
}

function isPitcherCandidate(candidate: OptimalLineupCandidate): boolean {
  const positions = [
    candidate.primaryPosition,
    candidate.currentPosition,
    candidate.secondaryPosition,
  ].map(normalizePosition);
  return positions.some((position) => PITCHER_POSITIONS.has(position));
}

function normalizePosition(position: string | undefined): string {
  return (position || "").trim().toUpperCase();
}

function defensiveWeight(position: string): number {
  if (position === "DH") return 0;
  if (position === "C" || position === "SS" || position === "CF") return 0.28;
  if (position === "2B" || position === "3B") return 0.22;
  return 0.14;
}

function platoonBonus(
  candidate: OptimalLineupCandidate,
  opposingPitcherHand: OpposingPitcherHand,
): number {
  const bats = (candidate.bats || "").toUpperCase();
  if (bats === "S") return 2.2;
  if (bats === "L" && opposingPitcherHand === "R") return 3.4;
  if (bats === "R" && opposingPitcherHand === "L") return 3.0;
  if (bats === "L" && opposingPitcherHand === "L") return -3.0;
  if (bats === "R" && opposingPitcherHand === "R") return -1.1;
  return 0;
}

function mojoAdjustment(mojo: OptimalLineupCandidate["mojo"]): number {
  if (typeof mojo === "number") return clamp((mojo - 50) / 12, -4, 4);
  if (!mojo) return 0;
  const normalized = String(mojo).toLowerCase();
  if (normalized.includes("fire")) return 4;
  if (normalized.includes("hot")) return 2;
  if (normalized.includes("cold")) return -2;
  if (normalized.includes("ice")) return -4;
  return 0;
}

function fitnessAdjustment(fitness: string | undefined): number {
  if (!fitness) return 0;
  const normalized = fitness.toLowerCase();
  if (normalized.includes("locked") || normalized.includes("well")) return 1.2;
  if (normalized.includes("strained") || normalized.includes("hurt")) return -4;
  if (normalized.includes("tense") || normalized.includes("low")) return -2;
  return 0;
}

function rating(value: number | undefined, fallback: number): number {
  return clamp(typeof value === "number" && Number.isFinite(value) ? value : fallback, 0, 99);
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundWpa(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
