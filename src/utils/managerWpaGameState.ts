import {
  getBetweenPlayEvents,
  getGameFieldingEvents,
  getGameHeader,
  getGameEvents,
  type AtBatEvent,
  type BetweenPlayEvent,
  type FieldingEvent,
  type GameHeader,
} from "./eventLog";
import {
  loadCurrentGame,
  saveCurrentGame,
  type PersistedGameState,
} from "./gameStorage";
import type {
  ManagerDecisionRecord,
  ManagerLineupDeltaRecord,
} from "../types/managerWpa";
import {
  deriveManagerDecisionRecords,
  getManagerForTeam,
  type ManagerAssignmentResolutionInput,
} from "./managerWpaDerivation";
import {
  aggregateKblWpaCredits,
  deriveKblWpaCredits,
  type KblWpaStartingLineups,
} from "./kblWpaAttribution";

type ManagerStartingLineups = NonNullable<GameHeader["startingLineups"]>;
type ManagerStartingPitchers = NonNullable<GameHeader["startingPitchers"]>;

const LINEUP_DELTA_MANAGER_SHARE = 0.25;
const LINEUP_DELTA_PLAYER_CAP = 0.25;
const LINEUP_DELTA_TEAM_CAP = 0.75;

export interface CommittedManagerDecisionState {
  managerDecisions: ManagerDecisionRecord[];
  managerLineupDeltas: ManagerLineupDeltaRecord[];
}

export interface DeriveCommittedManagerDecisionStateInput
  extends ManagerAssignmentResolutionInput {
  gameId: string;
  atBatEvents: AtBatEvent[];
  betweenPlayEvents?: BetweenPlayEvent[];
  fieldingEvents?: FieldingEvent[];
  startingLineups?: ManagerStartingLineups | KblWpaStartingLineups;
  startingPitchers?: ManagerStartingPitchers;
  totalInnings?: number;
  gameEnded?: boolean;
}

export interface RefreshCommittedManagerDecisionStateInput
  extends ManagerAssignmentResolutionInput {
  gameId: string;
  startingLineups?: ManagerStartingLineups | KblWpaStartingLineups;
  startingPitchers?: ManagerStartingPitchers;
  totalInnings?: number;
  gameEnded?: boolean;
}

export function deriveCommittedManagerDecisionState(
  input: DeriveCommittedManagerDecisionStateInput,
): CommittedManagerDecisionState {
  return {
    managerDecisions: deriveManagerDecisionRecords(input),
    managerLineupDeltas: input.gameEnded
      ? deriveManagerLineupDeltaRecords(input)
      : [],
  };
}

export function deriveManagerLineupDeltaRecords(
  input: DeriveCommittedManagerDecisionStateInput,
): ManagerLineupDeltaRecord[] {
  if (!input.startingLineups) {
    return [];
  }

  const credits = deriveKblWpaCredits({
    atBatEvents: input.atBatEvents,
    betweenPlayEvents: input.betweenPlayEvents,
    fieldingEvents: input.fieldingEvents,
    totalInnings: input.totalInnings,
    awayTeamId: input.awayTeamId,
    homeTeamId: input.homeTeamId,
    startingLineups: normalizeStartingLineupsForKbl(input.startingLineups),
  });
  const totalsByPlayerId = new Map(
    aggregateKblWpaCredits(credits).map((entry) => [entry.playerId, entry]),
  );

  return [
    ...deriveTeamLineupDeltas({
      side: "away",
      teamId: input.awayTeamId,
      managerId: resolveManagerId(input.awayTeamId, input),
      gameId: input.gameId,
      starters: buildStarterEntries(
        input.startingLineups.away,
        input.startingPitchers?.away,
      ),
      totalsByPlayerId,
    }),
    ...deriveTeamLineupDeltas({
      side: "home",
      teamId: input.homeTeamId,
      managerId: resolveManagerId(input.homeTeamId, input),
      gameId: input.gameId,
      starters: buildStarterEntries(
        input.startingLineups.home,
        input.startingPitchers?.home,
      ),
      totalsByPlayerId,
    }),
  ];
}

interface StarterEntry {
  playerId: string;
  playerName: string;
  battingOrder: number;
  defensivePosition: string;
  starterRole: ManagerLineupDeltaRecord["starterRole"];
}

function deriveTeamLineupDeltas(input: {
  side: "away" | "home";
  gameId: string;
  teamId: string;
  managerId: string;
  starters: StarterEntry[];
  totalsByPlayerId: Map<string, ReturnType<typeof aggregateKblWpaCredits>[number]>;
}): ManagerLineupDeltaRecord[] {
  const uncapped = input.starters.map((starter) => {
    const actualPlayerKblWpa =
      input.totalsByPlayerId.get(starter.playerId)?.totalWpa ?? 0;
    const replacementExpectedKblWpa = 0;
    const rawPerformanceDelta = roundWpa(
      actualPlayerKblWpa - replacementExpectedKblWpa,
    );
    const playerCappedManagerWpa = clamp(
      roundWpa(rawPerformanceDelta * LINEUP_DELTA_MANAGER_SHARE),
      -LINEUP_DELTA_PLAYER_CAP,
      LINEUP_DELTA_PLAYER_CAP,
    );

    return {
      starter,
      actualPlayerKblWpa,
      replacementExpectedKblWpa,
      rawPerformanceDelta,
      playerCappedManagerWpa,
    };
  });

  const teamTotal = uncapped.reduce(
    (sum, row) => sum + row.playerCappedManagerWpa,
    0,
  );
  const teamScale =
    Math.abs(teamTotal) > LINEUP_DELTA_TEAM_CAP
      ? LINEUP_DELTA_TEAM_CAP / Math.abs(teamTotal)
      : 1;

  return uncapped.map((row) => ({
    decisionId: `${input.gameId}:${input.teamId}:${row.starter.playerId}:lineup_delta`,
    gameId: input.gameId,
    managerId: input.managerId,
    teamId: input.teamId,
    decisionType: "lineup_construction",
    inferenceMethod: "automatic",
    confidence: "low",
    starterPlayerId: row.starter.playerId,
    starterPlayerName: row.starter.playerName,
    battingOrderSlot: row.starter.battingOrder,
    defensivePosition: row.starter.defensivePosition,
    starterRole: row.starter.starterRole,
    actualPlayerKblWpa: roundWpa(row.actualPlayerKblWpa),
    replacementExpectedKblWpa: row.replacementExpectedKblWpa,
    replacementBaselineSource: "v1_zero_default",
    replacementBaselineConfidence: "low",
    rawPerformanceDelta: row.rawPerformanceDelta,
    managerShare: LINEUP_DELTA_MANAGER_SHARE,
    managerWpa: roundWpa(row.playerCappedManagerWpa * teamScale),
  }));
}

function buildStarterEntries(
  lineup: ManagerStartingLineups["away"] | KblWpaStartingLineups["away"],
  startingPitcher?: ManagerStartingPitchers["away"],
): StarterEntry[] {
  const starters = lineup.map((player, index) => {
    const defensivePosition =
      ("fieldPosition" in player ? player.fieldPosition : undefined) ??
      player.position ??
      "DH";
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      battingOrder: "battingOrder" in player ? player.battingOrder ?? index + 1 : index + 1,
      defensivePosition,
      starterRole: starterRoleForPosition(defensivePosition),
    };
  });

  if (
    startingPitcher &&
    !starters.some((starter) => starter.playerId === startingPitcher.playerId)
  ) {
    starters.push({
      playerId: startingPitcher.playerId,
      playerName: startingPitcher.playerName,
      battingOrder: 0,
      defensivePosition: "P",
      starterRole: "starting_pitcher",
    });
  }

  return starters;
}

function starterRoleForPosition(
  position: string,
): ManagerLineupDeltaRecord["starterRole"] {
  const normalized = position.trim().toUpperCase();
  if (normalized === "DH") return "designated_hitter";
  if (normalized === "P" || normalized === "SP" || normalized === "RP") {
    return "starting_pitcher";
  }
  return "position_player";
}

function normalizeStartingLineupsForKbl(
  startingLineups: ManagerStartingLineups | KblWpaStartingLineups,
): KblWpaStartingLineups {
  return {
    away: startingLineups.away.map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      position:
        ("position" in player ? player.position : undefined) ??
        ("fieldPosition" in player ? player.fieldPosition : undefined),
      fieldPosition:
        ("fieldPosition" in player ? player.fieldPosition : undefined) ??
        ("position" in player ? player.position : undefined),
    })),
    home: startingLineups.home.map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      position:
        ("position" in player ? player.position : undefined) ??
        ("fieldPosition" in player ? player.fieldPosition : undefined),
      fieldPosition:
        ("fieldPosition" in player ? player.fieldPosition : undefined) ??
        ("position" in player ? player.position : undefined),
    })),
  };
}

function resolveManagerId(
  teamId: string,
  input: ManagerAssignmentResolutionInput,
): string {
  return getManagerForTeam(teamId, {
    managerByTeamId: {
      ...(input.managerByTeamId ?? {}),
      [input.awayTeamId]:
        input.managerByTeamId?.[input.awayTeamId] ?? input.awayManagerId,
      [input.homeTeamId]:
        input.managerByTeamId?.[input.homeTeamId] ?? input.homeManagerId,
    },
    managerAssignments: input.managerAssignments,
    mode: input.mode,
    instanceId: input.instanceId,
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundWpa(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export async function deriveCommittedManagerDecisionStateForGame(
  input: RefreshCommittedManagerDecisionStateInput,
): Promise<CommittedManagerDecisionState> {
  const [atBatEvents, betweenPlayEvents, fieldingEvents, gameHeader] = await Promise.all([
    getGameEvents(input.gameId),
    getBetweenPlayEvents(input.gameId),
    getGameFieldingEvents(input.gameId),
    getGameHeader(input.gameId).catch(() => null),
  ]);

  return deriveCommittedManagerDecisionState({
    ...input,
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
    startingLineups: input.startingLineups ?? gameHeader?.startingLineups,
    startingPitchers: input.startingPitchers ?? gameHeader?.startingPitchers,
  });
}

export async function refreshCurrentGameManagerDecisionState(
  input: RefreshCommittedManagerDecisionStateInput,
): Promise<CommittedManagerDecisionState> {
  const nextState = await deriveCommittedManagerDecisionStateForGame(input);
  const currentGame = await loadCurrentGame();

  if (currentGame?.gameId === input.gameId) {
    const updatedCurrentGame: PersistedGameState = {
      ...currentGame,
      managerDecisions: nextState.managerDecisions,
      managerLineupDeltas: nextState.managerLineupDeltas,
    };
    await saveCurrentGame(updatedCurrentGame);
  }

  return nextState;
}
