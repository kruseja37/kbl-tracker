import type {
  Player as RosterPlayer,
  Pitcher as RosterPitcher,
} from "@/app/components/TeamRoster";
import type {
  OptimalLineupModeContext,
  OptimalLineupSnapshot,
  OpposingPitcherHand,
} from "../../../types/managerWpa";
import {
  buildLineupSnapshotFromSlots,
  formatOptimalLineupBenchmarkStatus,
  getOptimalLineupBenchmarkStatus,
  type OptimalLineupBenchmarkStatus,
  type OptimalLineupCandidate,
} from "../../../utils/optimalLineup";

export interface PregameBenchmarkRequirement {
  teamName: string;
  opposingPitcherHand: OpposingPitcherHand;
  dhEnabled?: boolean;
  snapshot?: OptimalLineupSnapshot;
}

export interface PregameBenchmarkRow extends PregameBenchmarkRequirement {
  status: OptimalLineupBenchmarkStatus;
  statusLabel: string;
  contextLabel: string;
  sourceLabel: string;
  issueText?: string;
}

export function buildPregameBenchmarkIssues(
  requirements: PregameBenchmarkRequirement[],
): string[] {
  return buildPregameBenchmarkRows(requirements)
    .map((row) => row.issueText)
    .filter((issue): issue is string => Boolean(issue));
}

export function buildPregameBenchmarkRows(
  requirements: PregameBenchmarkRequirement[],
): PregameBenchmarkRow[] {
  return requirements.map((requirement) => {
    const status = getOptimalLineupBenchmarkStatus(requirement.snapshot);
    const sourceLabel = formatOptimalLineupBenchmarkStatus(requirement.snapshot);
    const contextLabel = formatPregameBenchmarkContext(
      requirement.opposingPitcherHand,
      requirement.dhEnabled,
    );
    return {
      ...requirement,
      status,
      statusLabel: formatPregameBenchmarkStatusLabel(status),
      contextLabel,
      sourceLabel,
      issueText:
        status === "official"
          ? undefined
          : `${requirement.teamName} ${contextLabel}: ${sourceLabel}`,
    };
  });
}

export function formatPregameBenchmarkSource(
  snapshot: OptimalLineupSnapshot | undefined,
): string {
  return formatOptimalLineupBenchmarkStatus(snapshot);
}

export function formatPregameBenchmarkContext(
  opposingPitcherHand: OpposingPitcherHand,
  dhEnabled?: boolean,
): string {
  const handLabel = opposingPitcherHand === "L" ? "vs LHP" : "vs RHP";
  if (dhEnabled === undefined) return handLabel;
  return `${handLabel} (${dhEnabled ? "DH" : "no DH"})`;
}

export function formatPregameBenchmarkStatusLabel(
  status: OptimalLineupBenchmarkStatus,
): string {
  switch (status) {
    case "official":
      return "Ready";
    case "missing":
      return "Missing";
    case "stale":
      return "Needs update";
    case "display_only":
      return "Display only";
  }
}

export function upsertPregameBenchmark(
  current: { vsRHP?: OptimalLineupSnapshot; vsLHP?: OptimalLineupSnapshot } | undefined,
  snapshot: OptimalLineupSnapshot,
): { vsRHP?: OptimalLineupSnapshot; vsLHP?: OptimalLineupSnapshot } {
  return {
    ...current,
    [snapshot.opposingPitcherHand === "L" ? "vsLHP" : "vsRHP"]: snapshot,
  };
}

export function buildCurrentLineupOptimalBenchmark(input: {
  teamId: string;
  mode: OptimalLineupModeContext;
  instanceId?: string;
  opposingPitcherHand: OpposingPitcherHand;
  players: RosterPlayer[];
  pitchers?: RosterPitcher[];
  dhEnabled: boolean;
  rosterVersionId?: string;
}): OptimalLineupSnapshot {
  const lineupPlayers = input.players
    .filter((player) => player.battingOrder != null)
    .slice()
    .sort((left, right) => (left.battingOrder ?? 0) - (right.battingOrder ?? 0));

  return buildLineupSnapshotFromSlots({
    teamId: input.teamId,
    mode: input.mode,
    instanceId: input.instanceId,
    opposingPitcherHand: input.opposingPitcherHand,
    candidates: [
      ...input.players.map(rosterPlayerToOptimalCandidate),
      ...(input.pitchers ?? []).map(rosterPitcherToOptimalCandidate),
    ],
    dhEnabled: input.dhEnabled,
    generatedAt: Date.now(),
    generatedFrom: "user_registered_smb4_optimal",
    sourceConfidence: "user_registered",
    rosterVersionId: input.rosterVersionId,
    slots: lineupPlayers.map((player) => ({
      playerId: player.playerId ?? player.name,
      playerName: player.fullName ?? player.name,
      battingOrderSlot: player.battingOrder ?? 0,
      defensivePosition: player.position ?? "DH",
    })),
  });
}

function rosterPlayerToOptimalCandidate(player: RosterPlayer): OptimalLineupCandidate {
  return {
    playerId: player.playerId ?? player.name,
    playerName: player.fullName ?? player.name,
    bats: player.battingHand,
    primaryPosition: player.primaryPosition ?? player.position,
    secondaryPosition: player.secondaryPosition,
    currentPosition: player.position,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fieldingRating,
    arm: player.arm,
    mojo: player.mojo,
    fitness: player.fitness,
    trait1: player.trait1,
    trait2: player.trait2,
  };
}

function rosterPitcherToOptimalCandidate(pitcher: RosterPitcher): OptimalLineupCandidate {
  return {
    playerId: pitcher.playerId ?? pitcher.name,
    playerName: pitcher.fullName ?? pitcher.name,
    primaryPosition: "P",
    secondaryPosition: pitcher.secondaryPosition,
    currentPosition: "P",
    power: pitcher.power,
    contact: pitcher.contact,
    speed: pitcher.speed,
    fielding: pitcher.fieldingRating,
    arm: pitcher.arm,
    mojo: pitcher.mojo,
    fitness: pitcher.fitness,
    trait1: pitcher.trait1,
    trait2: pitcher.trait2,
  };
}
