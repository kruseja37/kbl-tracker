import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { Menu, ChevronUp, Loader2, X } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { RunnerPopover, type RunnerBase } from "@/app/components/RunnerPopover";
import {
  FielderPopover,
  type FielderInfo,
  type BenchPlayerInfo,
} from "@/app/components/FielderPopover";
import {
  LineupCard,
  type SubstitutionData,
  type LineupPlayer,
  type BenchPlayer,
  type BullpenPitcher,
} from "@/app/components/LineupCard";
import {
  useUndoSystem,
  type GameSnapshot,
} from "@/app/components/UndoSystem";
import {
  TeamRoster,
  type Player,
  type Pitcher,
} from "@/app/components/TeamRoster";
import { FenwayBoard } from "@/app/components/FenwayBoard";
import { FullFenwayScoreboard } from "@/app/components/FullFenwayScoreboard";
import { ScoreBug } from "@/app/components/ScoreBug";
import { QuickBar } from "@/app/components/QuickBar";
import { PlayLogPanel } from "@/app/components/PlayLogPanel";
import { BattingLineupColumn } from "@/app/components/BattingLineupColumn";
import {
  DefensiveLineupColumn,
  type DefensiveEnrichmentMode,
} from "@/app/components/DefensiveLineupColumn";
import { NewsBoard } from "@/app/components/NewsBoard";
import type { CommentaryFeedEntry } from "@/app/components/CommentaryFeed";
import {
  EnrichmentPanel,
  RunnerEnrichmentPanel,
  PITCH_TYPES,
  type AtBatModifierValue,
  type EnrichmentUpdate,
} from "@/app/components/EnrichmentPanel";
import { RunnerOutcomesDisplay } from "@/app/components/RunnerOutcomesDisplay";
import { HistoricalEventEditor } from "@/app/components/HistoricalEventEditor";
import { LiveRunnerAttributionPanel } from "@/app/components/LiveRunnerAttributionPanel";
// Removed: GameDiamond de-rendered in Step 1.B (UX-004). File preserved for reference.
// import { GameDiamond } from "@/app/components/GameDiamond";
import {
  InjuryPrompt,
  type InjuryResult,
  type MojoResult,
} from "@/app/components/InjuryPrompt";
import {
  getAtBatEvent,
  getBetweenPlayEvent,
  getBetweenPlayEvents,
  getFieldingEventsForAtBat,
  getGameFieldingEvents,
  getGameEvents,
  getGameHeader,
  getMatchupEvents,
  logFieldingEvent,
  updateAtBatEvent,
  updateAtBatEventWithFieldingSync,
  updateBetweenPlayEvent,
  type AtBatEvent,
  type BetweenPlayEvent,
  type FieldingEvent,
  type GameHeader,
} from "../../../utils/eventLog";
import { refreshCurrentGameManagerDecisionState } from "../../../utils/managerWpaGameState";
import {
  buildLineupSnapshotFromSlots,
  buildOptimalLineupSnapshot,
  cloneOptimalLineupSnapshot,
  type LineupSlotInput,
  type OptimalLineupCandidate,
} from "../../../utils/optimalLineup";
import {
  buildManagerRecommendationWatchEvent,
  buildPromptedManagerDecisionFromRecommendation,
  generateManagerRecommendations,
  getPromptedDecisionTypeForRecommendationAction,
  type BenchDefenderRecommendationPlayer,
  type DefenderRecommendationPlayer,
  type HitterRecommendationPlayer,
  type ManagerRecommendation,
  type ManagerRecommendationAction,
} from "../../../utils/managerWpaRecommendations";
import type {
  GameLockLineupSnapshots,
  ManagerDecisionRecord,
  OpposingPitcherHand,
  OptimalLineupModeContext,
} from "../../../types/managerWpa";
import { getTeamColors, getFielderBorderColors } from "@/config/teamColors";
import {
  buildFallbackRuntimePlayerId,
  getRuntimeRosterEntityId,
} from "../utils/runtimePlayerIdentity";
import { buildAvailablePitchingCandidates } from "../utils/pitchingCandidates";
import { getScorebugTeamLabel } from "../utils/scorebugLabel";
import {
  buildSelectedLineupPlayerCard,
  findRunnerBaseForSelectedPlayer,
  resolveSelectedPlayerCardState,
} from "../utils/selectedPlayerState";
import { normalizeSpecialEventType } from "../utils/gameTrackerEventDispatch";
import {
  getDisplayedStadiumName,
  getInitialSelectedStadium,
  shouldSyncSelectedStadium,
} from "../utils/stadiumSelection";
import {
  type PlayData,
  type SpecialEventData,
} from "../utils/gameTrackerFieldTypes";
import {
  buildFieldingErrorAdjustments,
  FIELDING_POSITION_NUMBER_TO_CODE as POSITION_NUMBER_TO_CODE,
  resolveChargedPlayerIdFromDefensiveAlignment,
} from "../utils/fieldingErrorAttribution";
import { buildDefensiveAlignmentByPosition } from "../utils/defensiveAlignment";
import { areRivals } from "../../../data/leagueStructure";
import { getParkNames } from "../../../data/parkLookup";
import {
  useGameState,
  type GameState,
  type GamePhase,
  type GameLineupSnapshot,
  type TeamLineupSnapshot,
  type ScoreboardState,
  type HitType,
  type OutType,
  type WalkType,
  type RunnerAdvancement,
  type PlayerGameStats,
  type PitcherGameStats,
  type PlateAppearanceAction,
} from "@/hooks/useGameState";
import {
  usePlayerState,
  type PlayerStateData,
  getStateBadge,
  formatMultiplier,
} from "@/app/hooks/usePlayerState";
import {
  useCommentaryFeed,
} from "@/app/hooks/useCommentaryFeed";
import type { BeatReporter } from "../../../types/reporter";
import { getReporterForTeam } from "../../../utils/reporterStorage";
import {
  getAllPlayers as getAllLeagueBuilderPlayers,
  getTeam as getLeagueBuilderTeam,
} from "../../../utils/leagueBuilderStorage";
import {
  buildPlayerGemCounts,
  formatPlayerLineupGameLine,
} from "../utils/playerLineupGameLine";
import { resolveGameTrackerManagerIds } from "../utils/gameTrackerManagerIdentity";
import { resolveGameTrackerIdentity } from "../utils/gameTrackerIdentity";

type LineupRosterMeta = {
  jerseyNumber?: number;
  hometown?: { city: string; state: string };
};

type GameTrackerLaunchRosterState = {
  awayPlayers?: Player[];
  awayPitchers?: Pitcher[];
  homePlayers?: Player[];
  homePitchers?: Pitcher[];
};

export const MISSING_GAME_TRACKER_LAUNCH_STATE_TITLE =
  "GameTracker launch data required";

const ordinalSuffix = (num: number) => {
  if (num % 100 >= 11 && num % 100 <= 13) return "th";
  switch (num % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const formatInningLabel = (isTop: boolean, inning: number) => {
  const half = isTop ? "Top" : "Bottom";
  return `${half} ${inning}${ordinalSuffix(inning)}`;
};

const MANAGER_USER_ACTION_DECISION_TYPES = new Set([
  "intentional_walk",
  "pitching_change",
  "pinch_hitter",
  "pinch_runner",
  "defensive_sub",
  "position_change",
]);

function formatManagerDecisionHalfInning(decision: ManagerDecisionRecord): string {
  return `${decision.half === "top" ? "T" : "B"}${decision.inning}`;
}

function formatManagerDecisionWpa(decision: ManagerDecisionRecord): string {
  if (!decision.resolved || typeof decision.managerWpa !== "number") {
    return "WPA pending";
  }

  return `${formatWpaPoints(decision.managerWpa)} WPA`;
}

function titleCaseManagerIdentifier(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function formatManagerDisplayName(params: {
  managerId: string;
  teamId: string;
  teamName: string;
  managerName?: string | null;
}): string {
  if (params.managerName?.trim()) {
    return params.managerName.trim();
  }

  if (params.managerId === `${params.teamId}-manager`) {
    return `${params.teamName} Manager`;
  }

  return titleCaseManagerIdentifier(params.managerId) || `${params.teamName} Manager`;
}

function buildManagerDecisionDetail(
  decision: ManagerDecisionRecord,
  sourceEntry?: PlayLogEntry,
): string {
  const sourceDescription = sourceEntry?.description?.trim();
  if (sourceDescription) {
    return `${decision.displayTitle}: ${sourceDescription}.`;
  }

  return decision.displaySummary;
}

function buildManagerOutcomeDetail(
  decision: ManagerDecisionRecord,
  outcomeEntry?: PlayLogEntry,
): string {
  if (!decision.resolved) {
    const endpoint =
      decision.resolutionWindow?.expectedEndpoint?.replace(/_/g, " ") ||
      "the outcome";
    return `Waiting for ${endpoint}.`;
  }

  const outcomeDescription = outcomeEntry?.description?.trim();
  const outcomeText = outcomeEntry
    ? `${outcomeEntry.batterName} ${outcomeEntry.result}${
        outcomeDescription ? `, ${outcomeDescription}` : ""
      }`
    : decision.resolvedAtEventId
      ? `Resolved at ${decision.resolvedAtEventId}`
      : "Resolved on the committed outcome window";

  return `${outcomeText}. Manager value ${formatManagerDecisionWpa(decision)}.`;
}

function normalizePitcherHandForOptimalLineup(
  pitcher: Pitcher | undefined,
): OpposingPitcherHand {
  return (pitcher?.throwingHand || pitcher?.throws || "R") === "L" ? "L" : "R";
}

function toOptimalLineupModeContext(
  competitionType: string | undefined,
): OptimalLineupModeContext {
  if (competitionType === "elimination") return "elimination";
  if (competitionType === "franchise") return "franchise";
  return "exhibition";
}

function rosterPlayersToOptimalCandidates(
  players: Player[],
  team: "away" | "home",
  getRosterEntityId: (
    entity: { name: string; playerId?: string },
    team: "away" | "home",
  ) => string,
  getCanonicalRosterName: (
    entity: { name: string; fullName?: string } | undefined,
  ) => string,
): OptimalLineupCandidate[] {
  return players.map((player) => ({
    playerId: getRosterEntityId(player, team),
    playerName: getCanonicalRosterName(player),
    bats: player.battingHand,
    primaryPosition: player.primaryPosition ?? player.position,
    currentPosition: player.position,
    secondaryPosition: player.secondaryPosition,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fieldingRating,
    arm: player.arm,
    mojo: player.mojo,
    fitness: player.fitness,
    trait1: player.trait1,
    trait2: player.trait2,
    unavailable: player.isOutOfGame,
  }));
}

function lineupToOptimalSlots(lineup: Array<{
  playerId: string;
  playerName: string;
  position: string;
}>): LineupSlotInput[] {
  return lineup.map((player, index) => ({
    playerId: player.playerId,
    playerName: player.playerName,
    battingOrderSlot: index + 1,
    defensivePosition: player.position,
  }));
}

function isUserActionManagerDecision(decision: ManagerDecisionRecord): boolean {
  return (
    decision.decisionSource === "user_action" ||
    decision.decisionSource === "situational_prompt" ||
    MANAGER_USER_ACTION_DECISION_TYPES.has(decision.decisionType)
  );
}

function buildManagerDecisionFeedEntry(
  decision: ManagerDecisionRecord,
  timestamp: number,
  canEditAttribution: boolean,
  options: {
    managerLabel: string;
    decisionDetail?: string;
    outcomeDetail?: string;
  },
): CommentaryFeedEntry {
  const status = formatManagerDecisionWpa(decision);
  const leverage =
    typeof decision.leverageIndex === "number"
      ? ` LI ${decision.leverageIndex.toFixed(1)}.`
      : "";

  return {
    id: `manager-decision-${decision.decisionId}`,
    kind: isUserActionManagerDecision(decision)
      ? "manager-user-action"
      : "manager-passive",
    commentaryText: `${decision.displayTitle} for ${decision.teamId}. ${status}.${leverage}`,
    halfInningLabel: formatManagerDecisionHalfInning(decision),
    timestamp,
    managerDecision: decision,
    canEditAttribution,
    managerLabel: options.managerLabel,
    managerDecisionDetail: options.decisionDetail,
    managerDecisionOutcome: options.outcomeDetail,
  };
}

function formatManagerRecommendationHalfInning(
  recommendation: ManagerRecommendation,
): string {
  return `${recommendation.half === "top" ? "T" : "B"}${recommendation.inning}`;
}

function buildManagerRecommendationFeedEntry(
  recommendation: ManagerRecommendation,
  timestamp: number,
): CommentaryFeedEntry {
  const kind =
    recommendation.surface === "recommendation_card"
      ? "manager-recommendation-card"
      : recommendation.surface === "feed_quick_action"
        ? "manager-recommendation-note"
        : "manager-recommendation-passive";

  return {
    id: `manager-recommendation-${recommendation.recommendationId}`,
    kind,
    commentaryText: `${recommendation.title}. ${recommendation.rationale}`,
    halfInningLabel: formatManagerRecommendationHalfInning(recommendation),
    timestamp,
    managerRecommendation: recommendation,
  };
}

const runnerBaseToTrackerBase = (
  base: RunnerBase | "first" | "second" | "third",
): "1B" | "2B" | "3B" => {
  if (base === "first") {
    return "1B";
  }
  if (base === "second") {
    return "2B";
  }
  return "3B";
};

const calculateMinimumResultOuts = (result: AtBatEvent["result"]): number => {
  switch (result) {
    case "K":
    case "Kc":
    case "Ꝁ":
    case "GO":
    case "FO":
    case "FLO":
    case "LO":
    case "PO":
    case "SF":
    case "SAC":
    case "D3K":
    case "WP_K":
    case "PB_K":
      return 1;
    case "DP":
      return 2;
    case "TP":
      return 3;
    default:
      return 0;
  }
};

const pushEditHistoryEntry = (
  history: NonNullable<AtBatEvent["editHistory"]>,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  timestamp: number,
) => {
  if (oldValue === newValue) {
    return;
  }

  history.push({
    field,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
    timestamp,
  });
};

const FIELDING_POSITIONS = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "P",
] as const;

const RUNNER_ERROR_TYPES = ["fielding", "throwing", "mental"] as const;

const isRunnerOutcomeOut = (toBase: RunnerSubEntry["toBase"]) => toBase === "out";

const crossesRunnerOutcomeBoundary = (
  previousToBase: RunnerSubEntry["toBase"],
  nextToBase: RunnerSubEntry["toBase"],
) => isRunnerOutcomeOut(previousToBase) !== isRunnerOutcomeOut(nextToBase);

type AtBatWpaEditPolicy = Required<
  Pick<AtBatEvent, "totalInnings" | "extraInningRunner" | "extraInningRunnerDelay">
>;

const getAtBatWpaEditPolicy = (
  atBatEvent: Pick<
    AtBatEvent,
    "totalInnings" | "extraInningRunner" | "extraInningRunnerDelay"
  >,
  fallback: AtBatWpaEditPolicy,
): AtBatWpaEditPolicy => ({
  totalInnings: atBatEvent.totalInnings ?? fallback.totalInnings,
  extraInningRunner:
    atBatEvent.extraInningRunner ?? fallback.extraInningRunner,
  extraInningRunnerDelay:
    atBatEvent.extraInningRunnerDelay ?? fallback.extraInningRunnerDelay,
});

function sameRosterEntity(
  entity: { playerId?: string; name: string } | null | undefined,
  other: { playerId?: string; name: string } | null | undefined,
) {
  if (!entity || !other) return false;
  if (entity.playerId && other.playerId) {
    return entity.playerId === other.playerId;
  }
  return entity.name === other.name;
}

function getLineupRosterMeta(
  entry: { playerId?: string; name: string },
  players: Player[],
  pitchers: Pitcher[],
) {
  const source =
    players.find((player) => sameRosterEntity(player, entry)) ||
    pitchers.find((pitcher) => sameRosterEntity(pitcher, entry));

  return {
    jerseyNumber: source?.jerseyNumber,
    hometown: source?.hometown,
  };
}

function getPreferredActivePitcher<
  T extends {
    playerId?: string;
    name: string;
    isActive?: boolean;
    isStarter?: boolean;
  },
>(pitchers: T[]) {
  return (
    pitchers.find((pitcher) => pitcher.isActive) ||
    pitchers.find((pitcher) => pitcher.isStarter) ||
    pitchers[0]
  );
}

function hasRequiredLaunchPlayers(players: Player[] | undefined): boolean {
  return Boolean(
    Array.isArray(players) &&
      players.length > 0 &&
      players.some((player) => player.battingOrder !== undefined),
  );
}

function hasRequiredLaunchPitcher(pitchers: Pitcher[] | undefined): boolean {
  return Boolean(
    Array.isArray(pitchers) &&
      pitchers.length > 0 &&
      getPreferredActivePitcher(pitchers),
  );
}

export function getMissingGameTrackerLaunchStateMessage(
  state: GameTrackerLaunchRosterState | null | undefined,
): string | null {
  const missing: string[] = [];

  if (!hasRequiredLaunchPlayers(state?.awayPlayers)) {
    missing.push("away batting roster");
  }
  if (!hasRequiredLaunchPitcher(state?.awayPitchers)) {
    missing.push("away starting pitcher");
  }
  if (!hasRequiredLaunchPlayers(state?.homePlayers)) {
    missing.push("home batting roster");
  }
  if (!hasRequiredLaunchPitcher(state?.homePitchers)) {
    missing.push("home starting pitcher");
  }

  if (missing.length === 0) {
    return null;
  }

  return `GameTracker needs real launch rosters before it can create a new game. Missing: ${missing.join(
    ", ",
  )}. Start the game from Exhibition, Franchise, or Elimination setup, or reload a persisted in-progress game.`;
}

function inferTeamUsesDh(
  players: Player[],
  pitchers: Pitcher[],
  explicitUseDh?: boolean,
) {
  if (typeof explicitUseDh === "boolean") {
    return explicitUseDh;
  }

  const lineupPlayers = players.filter(
    (player) => player.battingOrder !== undefined && !player.isOutOfGame,
  );
  const activePitcher = getPreferredActivePitcher(pitchers);
  const pitcherInBattingOrder = activePitcher
    ? lineupPlayers.some((player) => sameRosterEntity(player, activePitcher))
    : lineupPlayers.some((player) => player.position === "P");

  return (
    lineupPlayers.some((player) => player.position === "DH") &&
    !pitcherInBattingOrder
  );
}

function inferSnapshotUsesDh(
  lineupSnapshot?: TeamLineupSnapshot,
): boolean | undefined {
  if (!lineupSnapshot) {
    return undefined;
  }

  if (lineupSnapshot.lineup.some((player) => player.position === "DH")) {
    return true;
  }

  if (lineupSnapshot.lineup.some((player) => player.position === "P")) {
    return false;
  }

  return undefined;
}

function normalizeRosterForDh(
  players: Player[],
  pitchers: Pitcher[],
  explicitUseDh?: boolean,
): Player[] {
  const usesDh = inferTeamUsesDh(players, pitchers, explicitUseDh);
  if (usesDh) {
    return players;
  }

  const activePitcher = getPreferredActivePitcher(pitchers);
  const usedPositions = new Set<string>();

  players
    .filter(
      (player) =>
        player.battingOrder !== undefined &&
        !player.isOutOfGame &&
        player.position &&
        player.position !== "DH",
    )
    .forEach((player) => usedPositions.add(player.position!));

  return players.map((player) => {
    if (player.position !== "DH") {
      return player;
    }

    const isPitcher = sameRosterEntity(player, activePitcher);
    const candidatePositions = [
      isPitcher ? "P" : undefined,
      player.secondaryPosition,
    ].filter(
      (position): position is string =>
        !!position &&
        FIELDING_POSITIONS.includes(
          position as (typeof FIELDING_POSITIONS)[number],
        ),
    );

    const nextPosition =
      candidatePositions.find((position) => !usedPositions.has(position)) ||
      FIELDING_POSITIONS.find((position) => !usedPositions.has(position)) ||
      (isPitcher ? "P" : player.secondaryPosition || "1B");

    if (player.battingOrder !== undefined && !player.isOutOfGame) {
      usedPositions.add(nextPosition);
    }

    return {
      ...player,
      position: nextPosition,
    };
  });
}

function sanitizeIncomingRosterPlayers(
  players: Player[],
  pitchers: Pitcher[],
  explicitUseDh?: boolean,
): Player[] {
  const deduped: Player[] = [];
  const seenIds = new Set<string>();

  for (const player of players) {
    const identity = player.playerId || `${player.name}::${player.position || "UT"}`;
    if (seenIds.has(identity)) {
      continue;
    }
    seenIds.add(identity);
    deduped.push({ ...player });
  }

  const lineupPlayers = deduped
    .filter((player) => player.battingOrder !== undefined)
    .sort((left, right) => (left.battingOrder || 0) - (right.battingOrder || 0));
  const lineupOrderById = new Map(
    lineupPlayers
      .slice(0, 9)
      .map((player, index) => [player.playerId || player.name, index + 1]),
  );

  const normalized = deduped.map((player) => {
    const identity = player.playerId || player.name;
    const battingOrder = lineupOrderById.get(identity);
    if (!battingOrder) {
      return {
        ...player,
        battingOrder: undefined,
      };
    }
    return {
      ...player,
      battingOrder,
    };
  });

  return normalizeRosterForDh(normalized, pitchers, explicitUseDh);
}

function shouldHidePitcherFromBattingDisplay(
  player: Player,
  activePitcher: Pitcher | undefined,
  teamUsesDh: boolean,
) {
  if (!teamUsesDh || !activePitcher) {
    return false;
  }
  return sameRosterEntity(player, activePitcher) && player.position !== "DH";
}

export function buildDefensiveColumnPlayersForDisplay(args: {
  players: Player[];
  pitchers: Pitcher[];
  fieldingTeam: "away" | "home";
  pitcherStats: Map<string, PitcherGameStats>;
  getRosterEntityId: (
    entity: { name: string; playerId?: string },
    team: "away" | "home",
  ) => string;
  explicitUseDh?: boolean;
  lineupSnapshot?: TeamLineupSnapshot;
}) {
  const {
    players,
    pitchers,
    fieldingTeam,
    pitcherStats,
    getRosterEntityId,
    explicitUseDh,
    lineupSnapshot,
  } = args;
  const teamUsesDh =
    explicitUseDh ??
    inferSnapshotUsesDh(lineupSnapshot) ??
    inferTeamUsesDh(players, pitchers);
  const activePitcherEntry =
    pitchers.find((p) => p.isActive) ||
    pitchers.find((p) => p.isStarter) ||
    pitchers[0];
  const snapshotLineup = lineupSnapshot?.lineup
    ?.filter((player) => player.battingOrder !== undefined)
    .sort((a, b) => a.battingOrder - b.battingOrder)
    .map((player) => {
      const meta = getLineupRosterMeta(
        { playerId: player.playerId, name: player.playerName },
        players,
        pitchers,
      );

      return {
        playerId: player.playerId,
        name: player.playerName,
        position: player.position,
        battingOrder: player.battingOrder,
        ...meta,
      };
    });
  const activeLineup =
    snapshotLineup && snapshotLineup.length > 0
      ? snapshotLineup
      : players
          .filter(
            (player) =>
              player.battingOrder !== undefined &&
              !player.isOutOfGame &&
              !shouldHidePitcherFromBattingDisplay(
                player,
                activePitcherEntry,
                teamUsesDh,
              ),
          )
          .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
          .map((player) => ({
            playerId: getRosterEntityId(player, fieldingTeam),
            name: player.name,
            position: player.position,
            battingOrder: player.battingOrder!,
            jerseyNumber: player.jerseyNumber,
            hometown: player.hometown,
          }));

  const defensivePlayers = activeLineup
    .filter((player) => !teamUsesDh || player.position !== "DH")
    .map((player) => ({ ...player }));

  const activePitcherId =
    lineupSnapshot?.currentPitcher?.playerId ||
    (activePitcherEntry
      ? getRosterEntityId(activePitcherEntry, fieldingTeam)
      : undefined);
  const activePitcherName =
    lineupSnapshot?.currentPitcher?.playerName || activePitcherEntry?.name;
  const activePitcherBattingOrder =
    lineupSnapshot?.currentPitcher?.battingOrder ??
    players.find((player) => sameRosterEntity(player, activePitcherEntry))
      ?.battingOrder ??
    9;

  if (!teamUsesDh && activePitcherId && activePitcherName) {
    const pitcherAlreadyDisplayed = defensivePlayers.some(
      (player) => player.playerId === activePitcherId || player.position === "P",
    );
    if (!pitcherAlreadyDisplayed) {
      const positionCounts = defensivePlayers.reduce<Record<string, number>>(
        (counts, player) => {
          if (player.position) {
            counts[player.position] = (counts[player.position] || 0) + 1;
          }
          return counts;
        },
        {},
      );
      let duplicatePositionIndex = -1;
      for (let index = defensivePlayers.length - 1; index >= 0; index -= 1) {
        const position = defensivePlayers[index].position;
        if (position && (positionCounts[position] || 0) > 1) {
          duplicatePositionIndex = index;
          break;
        }
      }
      let lastNonPitcherIndex = -1;
      for (let index = defensivePlayers.length - 1; index >= 0; index -= 1) {
        if (defensivePlayers[index].position !== "P") {
          lastNonPitcherIndex = index;
          break;
        }
      }
      const replacementIndex =
        duplicatePositionIndex >= 0
          ? duplicatePositionIndex
          : lastNonPitcherIndex;

      const pitcherRow = {
        playerId: activePitcherId,
        name: activePitcherName,
        position: "P",
        battingOrder:
          activePitcherBattingOrder > 0 && activePitcherBattingOrder <= 9
            ? activePitcherBattingOrder
            : 9,
        ...getLineupRosterMeta(
          { playerId: activePitcherId, name: activePitcherName },
          players,
          pitchers,
        ),
      };

      if (replacementIndex >= 0 && defensivePlayers.length >= 9) {
        defensivePlayers[replacementIndex] = {
          ...pitcherRow,
          battingOrder: defensivePlayers[replacementIndex].battingOrder,
        };
      } else {
        defensivePlayers.push(pitcherRow);
      }
    }
  }

  if (teamUsesDh && activePitcherId && activePitcherName) {
    if (!defensivePlayers.some((player) => player.playerId === activePitcherId)) {
      defensivePlayers.push({
        playerId: activePitcherId,
        name: activePitcherName,
        position: "P",
        battingOrder: activePitcherBattingOrder,
        ...getLineupRosterMeta(
          { playerId: activePitcherId, name: activePitcherName },
          players,
          pitchers,
        ),
      });
    }
  }

  return defensivePlayers
    .sort((a, b) => a.battingOrder - b.battingOrder)
    .map((player) => {
      const isPitcher = !!activePitcherId && player.playerId === activePitcherId;
      return {
        ...player,
        isPitcher,
        pitchCount:
          isPitcher && activePitcherId
            ? pitcherStats.get(activePitcherId)?.pitchCount ?? 0
            : undefined,
      };
    });
}

// EXH-036: Import Mojo/Fitness types for PlayerCardModal editing
import type { MojoLevel } from "../../../engines/mojoEngine";
import { clampMojo } from "../../../engines/mojoEngine";
import type { FitnessState } from "../../../engines/fitnessEngine";
import {
  MOJO_LEVELS,
  MOJO_STATES,
  getMojoColor,
} from "../../../engines/mojoEngine";
import { FITNESS_STATES } from "../../../engines/fitnessEngine";
import {
  useFameTracking,
  type FameEventDisplay,
  formatFameValue,
  getFameColor,
  getLITier,
} from "@/app/hooks/useFameTracking";
import {
  toMojoLabel,
  toFitnessLabel,
  type FameEventType,
  type Position,
} from "../../../types/game";
// MAJ-02: Wire fan morale to UI
import {
  useFanMorale,
  type GameResult as FanMoraleGameResult,
} from "../hooks/useFanMorale";
// MAJ-04: Wire narrative engine
import { generateGameRecap } from "../engines/narrativeIntegration";
import {
  getLeverageIndex,
  type GameStateForLI,
} from "../../../engines/leverageCalculator";
import {
  getCareerStats,
  type PlayerCareerBatting,
  type PlayerCareerPitching,
} from "../../../utils/careerStorage";
import { getApproachingMilestones } from "../../../utils/milestoneDetector";
import {
  getSeasonBattingStats,
  getSeasonPitchingStats,
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
} from "../../../utils/seasonStorage";
// T0-05: Schedule persistence — mark played games as COMPLETED
import { completeGame as completeScheduleGame } from "../../../utils/scheduleStorage";
import {
  buildSaveAppearanceStartContextFromAtBat,
  buildSaveAppearanceUpdateContextFromAtBat,
  buildSaveAppearanceUpdateContextFromRunnerEvent,
  createSaveAppearanceSnapshot,
  detectBackToBackHREvents,
  detectBlownSaveEvent,
  detectTootblanEvent,
  detectTriplePlayEvents,
  detectWalkOffHREvent,
  getRunsAllowedForSide,
  getTeamWonFromFinalScore,
  updateSaveAppearanceSnapshot,
  type DefensivePlayerIdentity,
  type DetectedFameEvent,
  type SaveAppearanceSnapshot,
} from "../engines/fameAutoDetections";
// Fielding pipeline: extract fielding events from PlayData and log to IndexedDB
import {
  extractFieldingEvents,
  extractSupplementalRunnerOutFieldingEvents,
  type FieldingExtractionContext,
} from "../utils/fieldingEventExtractor";
import {
  captureStartingLineups,
  loadCurrentGame,
  type CompetitionType,
  type LineupEntry,
} from "../../../utils/gameStorage";
import { POSITION_NUMBER } from "../utils/positionConstants";
import {
  calculateRunnerDefaults,
  type RunnerDefaults,
} from "../components/runnerDefaults";
import type { PlayLogEntry, RunnerSubEntry } from "../utils/playLogTypes";
import {
  buildPlayLogEntries,
  mapAtBatEventToPlayLogEntry,
} from "../utils/gameTrackerPlayLog";
import { AudioManager, type AudioSoundName } from "../utils/audioManager";
import {
  reconcileTeamPitchersWithLineupSnapshot,
  reconcileTeamPlayersWithLineupSnapshot,
} from "../utils/gameTrackerRosterSync";
import {
  buildLiveBasesFromRunnerOutcomes,
  buildLiveBasesFromRunnersAfter,
} from "../utils/liveBaseCorrection";
import {
  completeRunnerOutcomesForDerivation,
  deriveEnrichedAtBatState,
} from "../utils/enrichedAtBatStateDerivation";
import {
  mapFieldingPlayTypeToPlayDifficulty,
  type FieldingPlayTypeValue,
} from "../utils/fieldingPlayType";
import {
  buildFenwayMatchupSummary,
  formatFenwayMilestoneAlert,
  pickFenwayMilestoneWatches,
} from "../utils/fenwayBoardContext";
import {
  applyRunnerDefaultsToNames,
  buildRunnerScoreCorrectionPrompt,
  buildRunnerCorrectionForQuickBarOutcome,
  countRbiFromDefaults,
  getBatterDestinationOptions,
  getHeldByOfBaseSaved,
  getRunnerDestinationOptions,
  isCorrectableBatterResult,
  resolveBatterOutcomeResult,
  runnerOutcomeCountsAsOut,
  runnerDefaultsToAdvancement,
  type PendingRunnerCorrectionAction,
} from "../utils/gameTrackerRunnerCorrection";
import { formatWpaPoints } from "../../../utils/wpaDisplay";
import type { FielderCredit } from "../components/modals/FielderCreditModal";

// Note: Using GameState from useGameState hook instead of local interface
// This interface is deprecated but kept for reference during migration
interface _DeprecatedGameState {
  homeScore: number;
  awayScore: number;
  inning: number;
  isTop: boolean;
  outs: number;
  balls: number;
  strikes: number;
  bases: { first: boolean; second: boolean; third: boolean };
  currentBatter: string;
  currentPitcher: string;
}

interface PendingRunnerAttributionAction {
  eventType: "SB" | "ADVANCE" | "ADVANCE_E" | "WP" | "PB" | "PICK" | "PICK_SAFE" | "PICK_E";
  title: string;
  summary: string;
  snapshotLabel: string;
  runnerId?: string;
  runnerName?: string;
  fromBase: RunnerBase;
  recordToBase: "second" | "third" | "home" | "out" | RunnerBase;
  advanceToBase?: "second" | "third" | "home";
  outcome: "safe" | "out";
  pitcherId: string;
  pitcherName?: string;
  catcherId?: string;
  catcherName?: string;
  fielderId?: string;
  errorType?: "fielding" | "throwing" | "mental";
}

interface PendingManualSpecialPrompt {
  type: "KP" | "NUT";
  event: SpecialEventData;
  atBatEventId?: string;
  modifierValue?: AtBatModifierValue;
}

interface HistoricalLineupSlot {
  playerId: string;
  playerName: string;
  position: Position;
}

interface HistoricalPitcher {
  playerId: string;
  playerName: string;
}

function mergeSeasonBattingWithGameStats(
  seasonBatting: PlayerSeasonBatting | null,
  gameStats?: PlayerGameStats,
): PlayerSeasonBatting | null {
  if (!seasonBatting || !gameStats) return seasonBatting;
  return {
    ...seasonBatting,
    pa: seasonBatting.pa + gameStats.pa,
    ab: seasonBatting.ab + gameStats.ab,
    hits: seasonBatting.hits + gameStats.h,
    singles: seasonBatting.singles + gameStats.singles,
    doubles: seasonBatting.doubles + gameStats.doubles,
    triples: seasonBatting.triples + gameStats.triples,
    homeRuns: seasonBatting.homeRuns + gameStats.hr,
    rbi: seasonBatting.rbi + gameStats.rbi,
    runs: seasonBatting.runs + gameStats.r,
    walks: seasonBatting.walks + gameStats.bb,
    strikeouts: seasonBatting.strikeouts + gameStats.k,
    hitByPitch: seasonBatting.hitByPitch + gameStats.hbp,
    sacFlies: seasonBatting.sacFlies + gameStats.sf,
    sacBunts: seasonBatting.sacBunts + gameStats.sh,
    stolenBases: seasonBatting.stolenBases + gameStats.sb,
    caughtStealing: seasonBatting.caughtStealing + gameStats.cs,
    gidp: seasonBatting.gidp + gameStats.gidp,
  };
}

function mergeCareerBattingWithGameStats(
  careerBatting: PlayerCareerBatting | null,
  gameStats?: PlayerGameStats,
): PlayerCareerBatting | null {
  if (!careerBatting || !gameStats) return careerBatting;
  return {
    ...careerBatting,
    pa: careerBatting.pa + gameStats.pa,
    ab: careerBatting.ab + gameStats.ab,
    hits: careerBatting.hits + gameStats.h,
    singles: careerBatting.singles + gameStats.singles,
    doubles: careerBatting.doubles + gameStats.doubles,
    triples: careerBatting.triples + gameStats.triples,
    homeRuns: careerBatting.homeRuns + gameStats.hr,
    rbi: careerBatting.rbi + gameStats.rbi,
    runs: careerBatting.runs + gameStats.r,
    walks: careerBatting.walks + gameStats.bb,
    strikeouts: careerBatting.strikeouts + gameStats.k,
    hitByPitch: careerBatting.hitByPitch + gameStats.hbp,
    sacFlies: careerBatting.sacFlies + gameStats.sf,
    sacBunts: careerBatting.sacBunts + gameStats.sh,
    stolenBases: careerBatting.stolenBases + gameStats.sb,
    caughtStealing: careerBatting.caughtStealing + gameStats.cs,
    gidp: careerBatting.gidp + gameStats.gidp,
  };
}

function mergeSeasonPitchingWithGameStats(
  seasonPitching: PlayerSeasonPitching | null,
  gameStats?: PitcherGameStats,
): PlayerSeasonPitching | null {
  if (!seasonPitching || !gameStats) return seasonPitching;
  return {
    ...seasonPitching,
    outsRecorded: seasonPitching.outsRecorded + gameStats.outsRecorded,
    hitsAllowed: seasonPitching.hitsAllowed + gameStats.hitsAllowed,
    runsAllowed: seasonPitching.runsAllowed + gameStats.runsAllowed,
    earnedRuns: seasonPitching.earnedRuns + gameStats.earnedRuns,
    walksAllowed: seasonPitching.walksAllowed + gameStats.walksAllowed,
    strikeouts: seasonPitching.strikeouts + gameStats.strikeoutsThrown,
    homeRunsAllowed: seasonPitching.homeRunsAllowed + gameStats.homeRunsAllowed,
    hitBatters: seasonPitching.hitBatters + gameStats.hitByPitch,
    wildPitches: seasonPitching.wildPitches + gameStats.wildPitches,
  };
}

function mergeCareerPitchingWithGameStats(
  careerPitching: PlayerCareerPitching | null,
  gameStats?: PitcherGameStats,
): PlayerCareerPitching | null {
  if (!careerPitching || !gameStats) return careerPitching;
  return {
    ...careerPitching,
    outsRecorded: careerPitching.outsRecorded + gameStats.outsRecorded,
    hitsAllowed: careerPitching.hitsAllowed + gameStats.hitsAllowed,
    runsAllowed: careerPitching.runsAllowed + gameStats.runsAllowed,
    earnedRuns: careerPitching.earnedRuns + gameStats.earnedRuns,
    walksAllowed: careerPitching.walksAllowed + gameStats.walksAllowed,
    strikeouts: careerPitching.strikeouts + gameStats.strikeoutsThrown,
    homeRunsAllowed: careerPitching.homeRunsAllowed + gameStats.homeRunsAllowed,
    hitBatters: careerPitching.hitBatters + gameStats.hitByPitch,
    wildPitches: careerPitching.wildPitches + gameStats.wildPitches,
  };
}

export function GameTracker() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const location = useLocation();

  // Get rosters and team info from navigation state; persisted games hydrate separately.
  const navigationState = location.state as (GameTrackerLaunchRosterState & {
    awayTeamName?: string;
    homeTeamName?: string;
    awayTeamAbbreviation?: string;
    homeTeamAbbreviation?: string;
    awayTeamId?: string;
    homeTeamId?: string;
    // Team colors from database (passed from ExhibitionGame)
    awayTeamColor?: string;
    awayTeamBorderColor?: string;
    homeTeamColor?: string;
    homeTeamBorderColor?: string;
    stadiumName?: string;
    awayRecord?: string;
    homeRecord?: string;
    gameMode?: "exhibition" | "franchise" | "playoff" | "elimination";
    leagueId?: string;
    homeManagerId?: string;
    homeManagerName?: string;
    awayManagerId?: string;
    awayManagerName?: string;
    userTeamSide?: "home" | "away";
    // Playoff context (for recording series results)
    playoffSeriesId?: string;
    playoffGameNumber?: number;
    playoffId?: string;
    playoffRound?:
      | "wild_card"
      | "division_series"
      | "championship_series"
      | "world_series";
    isEliminationGame?: boolean;
    isClinchGame?: boolean;
    franchiseId?: string;
    eliminationId?: string;
    seasonId?: string;
    statsScopeId?: string;
    competitionType?: "exhibition" | "franchise" | "playoff" | "elimination";
    competitionId?: string;
    competitionName?: string;
    liveBeatReporterEnabled?: boolean;
    postGameColumnsEnabled?: boolean;
    // T0-05: Schedule persistence context
    scheduleGameId?: string;
    seasonNumber?: number;
    gameNumber?: number;
    // T0-01: Total innings for auto game-end detection
    totalInnings?: number;
    useDH?: boolean;
    extraInningRunner?: boolean;
    extraInningRunnerDelay?: 1 | 2;
    optimalLineupSnapshots?: GameLockLineupSnapshots;
  }) | null;

  // Team IDs - use navigation state or standalone defaults
  let homeTeamId = navigationState?.homeTeamId || "home";
  let awayTeamId = navigationState?.awayTeamId || "away";
  const homeTeamName_ = navigationState?.homeTeamName || "HOME";
  const awayTeamName_ = navigationState?.awayTeamName || "AWAY";
  const parkNames = useMemo(() => getParkNames(), []);
  const [selectedStadium, setSelectedStadium] = useState<string | null>(
    () => getInitialSelectedStadium(navigationState?.stadiumName),
  );
  const showStadiumSelector = !navigationState?.stadiumName;
  const awayRecord = navigationState?.awayRecord || "0-0"; // MAJ-15: Reads actual record from route state; defaults 0-0 for exhibition
  const homeRecord = navigationState?.homeRecord || "0-0"; // MAJ-15: Reads actual record from route state; defaults 0-0 for exhibition
  const leagueId = navigationState?.leagueId || "sml";
  const { awayManagerId, homeManagerId } = resolveGameTrackerManagerIds({
    awayTeamId,
    homeTeamId,
    awayManagerId: navigationState?.awayManagerId,
    homeManagerId: navigationState?.homeManagerId,
  });
  const awayManagerName = formatManagerDisplayName({
    managerId: awayManagerId,
    teamId: awayTeamId,
    teamName: awayTeamName_,
    managerName: navigationState?.awayManagerName,
  });
  const homeManagerName = formatManagerDisplayName({
    managerId: homeManagerId,
    teamId: homeTeamId,
    teamName: homeTeamName_,
    managerName: navigationState?.homeManagerName,
  });
  const userTeamSide = navigationState?.userTeamSide || "home";
  const competitionType =
    navigationState?.competitionType ||
    navigationState?.gameMode ||
    "exhibition";
  const gameMode = navigationState?.gameMode || "exhibition";
  const competitionId =
    navigationState?.competitionId ||
    (competitionType === "elimination"
      ? navigationState?.eliminationId
      : navigationState?.franchiseId);
  const statsScopeId =
    navigationState?.statsScopeId ||
    (competitionType === "elimination" && navigationState?.eliminationId
      ? `elimination-${navigationState.eliminationId}`
      : navigationState?.seasonId);
  const [leagueBuilderLineupMetaById, setLeagueBuilderLineupMetaById] =
    useState<Record<string, LineupRosterMeta>>({});
  const [lineupFieldingEvents, setLineupFieldingEvents] = useState<FieldingEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    getAllLeagueBuilderPlayers()
      .then((players) => {
        if (cancelled) return;

        const next: Record<string, LineupRosterMeta> = {};
        for (const player of players) {
          if (player.jerseyNumber === undefined && !player.hometown) {
            continue;
          }
          next[player.id] = {
            jerseyNumber: player.jerseyNumber,
            hometown: player.hometown,
          };
        }
        setLeagueBuilderLineupMetaById(next);
      })
      .catch((error) => {
        console.warn("[GameTracker] Failed to load lineup player metadata.", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Team colors - navigation state first, persisted colors set via useEffect after hook loads
  const [persistedTeamColors, setPersistedTeamColors] = useState<{
    awayTeamColor?: string;
    awayTeamBorderColor?: string;
    homeTeamColor?: string;
    homeTeamBorderColor?: string;
  }>({});
  const awayTeamColor =
    navigationState?.awayTeamColor || persistedTeamColors.awayTeamColor || getTeamColors(awayTeamId).primary;
  const awayTeamBorderColor =
    navigationState?.awayTeamBorderColor || persistedTeamColors.awayTeamBorderColor || getTeamColors(awayTeamId).secondary;
  const homeTeamColor =
    navigationState?.homeTeamColor || persistedTeamColors.homeTeamColor || getTeamColors(homeTeamId).primary;
  const homeTeamBorderColor =
    navigationState?.homeTeamBorderColor || persistedTeamColors.homeTeamBorderColor || getTeamColors(homeTeamId).secondary;

  // Game timer state
  const [gameStartTime, setGameStartTime] = useState(() => new Date());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [isProcessingEndGame, setIsProcessingEndGame] = useState(false);

  // T1-08 FIX: Guard against double end-game execution
  // The auto-end useEffect can re-fire due to volatile deps in handleEndGame's useCallback.
  // This ref ensures handleEndGame only executes once per game.
  const gameEndingRef = useRef(false);

  // Layer 1C: Captured starting lineups for GameRecord archive
  const startingLineupsRef = useRef<{
    away: LineupEntry[];
    home: LineupEntry[];
  } | null>(null);

  // Update elapsed time every minute
  useEffect(() => {
    const updateElapsedMinutes = () => {
      const now = Date.now();
      const diff = Math.floor((now - gameStartTime.getTime()) / 60000);
      const nextElapsedMinutes = Math.max(0, diff);
      setElapsedMinutes(nextElapsedMinutes);
      console.log("[R3-T0] Timer recomputed from persisted start time", {
        gameStartTime: gameStartTime.toISOString(),
        elapsedMinutes: nextElapsedMinutes,
      });
    };

    updateElapsedMinutes();
    const interval = setInterval(() => {
      updateElapsedMinutes();
    }, 60000);
    return () => clearInterval(interval);
  }, [gameStartTime]);

  // Use the game state hook for real data persistence
  const {
    gameState,
    scoreboard,
    playerStats,
    pitcherStats,
    commitPlateAppearance,
    recordEvent,
    recordPlayerStateChange,
    reassignRunnerEventAttribution,
    recordPromptedManagerDecision,
    recordManagerRecommendationWatch,
    placeGhostRunner,
    advanceRunner,
    advanceRunnersBatch,
    makeSubstitution,
    swapBattingOrder,
    switchPositions,
    changePitcher,
    advanceCount,
    resetCount,
    endInning,
    endGame: hookEndGame,
    applyScoreAdjustment,
    applyBasesCorrection,
    updateTrackedRunnerHowReached,
    applyOutsAdjustment,
    scheduleAutoEndInning,
    forceEndHalfInning,
    setRunnerOutcomeCorrectionActive,
    adjustPlayerFieldingErrors,
    queueAutoEndGame,
    evaluateEndGameTrigger,
    pitchCountPrompt,
    confirmPitchCount,
    dismissPitchCountPrompt,
    deferredPitchCounts,
    openDeferredPitchCount,
    initializeGame,
    loadExistingGame,
    undoLastAction,
    getLineupStateSnapshot,
    getBatterIndicesSnapshot,
    restoreState,
    getRunnerTrackerSnapshot,
    getBaseRunnerNames,
    runnerIdentityVersion,
    lineupVersion,
    substitutionLog,
    notifyPersistenceMetadataChanged,
    isLoading,
    isSaving,
    // §10.1: Three-phase lifecycle
    startGame,
    // T0-01: Auto game-end detection
    showInningEndConfirm,
    confirmInningEnd,
    declineInningEnd,
    showAutoEndPrompt,
    dismissAutoEndPrompt,
    setPlayoffContext,
    setStadiumName,
    setNextEventEnrichment,
    atBatSequence,
    // R3-T0: Persistence refs for exhibition config & mojo/fitness
    totalInningsRef: hookTotalInningsRef,
    extraInningRunnerRef: hookExtraInningRunnerRef,
    extraInningRunnerDelayRef: hookExtraInningRunnerDelayRef,
    teamColorsRef: hookTeamColorsRef,
    playerMojoFitnessGetterRef: hookMojoFitnessGetterRef,
    gameStartTimestampRef: hookGameStartTimestampRef,
    restoredMojoFitness,
    restoredCompetitionContext,
    restoredPlayoffContext,
  } = useGameState(gameId);
  homeTeamId = navigationState?.homeTeamId || gameState.homeTeamId || homeTeamId;
  awayTeamId = navigationState?.awayTeamId || gameState.awayTeamId || awayTeamId;
  const resolvedIdentity = resolveGameTrackerIdentity({
    navigationState,
    restoredContext: restoredCompetitionContext,
    gameState,
    fallbackCompetitionType: competitionType,
    fallbackGameMode: gameMode,
    fallbackCompetitionId: competitionId,
    fallbackStatsScopeId: statsScopeId,
    fallbackLeagueId: leagueId,
  });
  const effectiveCompetitionType = resolvedIdentity.competitionType;
  const effectiveSeasonNumber = resolvedIdentity.seasonNumber;
  const effectiveFranchiseId = resolvedIdentity.franchiseId;
  const effectiveScheduleGameId = resolvedIdentity.scheduleGameId;
  const effectiveLeagueId = resolvedIdentity.leagueId;
  const effectiveCompetitionName = resolvedIdentity.competitionName;
  const effectiveCompetitionId = resolvedIdentity.competitionId;
  const effectiveEliminationId = resolvedIdentity.eliminationId;
  const effectiveSeasonId = resolvedIdentity.seasonId;
  const effectiveStatsScopeId = resolvedIdentity.statsScopeId;
  const effectiveGameMode = resolvedIdentity.gameMode;
  const effectivePlayoffSeriesId =
    navigationState?.playoffSeriesId || restoredPlayoffContext.playoffSeriesId;
  const effectivePlayoffGameNumber =
    navigationState?.playoffGameNumber ??
    restoredPlayoffContext.playoffGameNumber;
  const effectivePlayoffId =
    navigationState?.playoffId || restoredPlayoffContext.playoffId;
  const effectivePlayoffRound =
    navigationState?.playoffRound || restoredPlayoffContext.playoffRound;
  const effectiveIsEliminationGame =
    navigationState?.isEliminationGame ??
    restoredPlayoffContext.isEliminationGame;
  const effectiveIsClinchGame =
    navigationState?.isClinchGame ?? restoredPlayoffContext.isClinchGame;
  const resolvedStadiumName = getDisplayedStadiumName(
    selectedStadium,
    gameState.stadiumName,
  );
  // R3: On refresh, navigationState is null — fall back to gameState (restored from snapshot)
  const homeTeamName = homeTeamName_ !== "HOME" ? homeTeamName_ : (gameState.homeTeamName || "HOME");
  const awayTeamName = awayTeamName_ !== "AWAY" ? awayTeamName_ : (gameState.awayTeamName || "AWAY");
  const [scorebugTeamLabels, setScorebugTeamLabels] = useState(() => ({
    away: getScorebugTeamLabel(navigationState?.awayTeamAbbreviation, awayTeamName_),
    home: getScorebugTeamLabel(navigationState?.homeTeamAbbreviation, homeTeamName_),
  }));
  const [gameInitialized, setGameInitialized] = useState(false);
  const [missingLaunchStateMessage, setMissingLaunchStateMessage] =
    useState<string | null>(null);
  // R3: Persisted DH flag — survives refresh (overrides navigationState?.useDH)
  const [persistedUseDh, setPersistedUseDh] = useState<boolean | undefined>(
    undefined,
  );
  const extraInningRunnerPlacementRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const awayFallbackLabel = getScorebugTeamLabel(
      navigationState?.awayTeamAbbreviation,
      awayTeamName,
    );
    const homeFallbackLabel = getScorebugTeamLabel(
      navigationState?.homeTeamAbbreviation,
      homeTeamName,
    );
    const effectiveAwayTeamId = navigationState?.awayTeamId || gameState.awayTeamId;
    const effectiveHomeTeamId = navigationState?.homeTeamId || gameState.homeTeamId;

    const loadScorebugLabels = async () => {
      if (!effectiveAwayTeamId && !effectiveHomeTeamId) {
        if (!cancelled) {
          setScorebugTeamLabels({
            away: awayFallbackLabel,
            home: homeFallbackLabel,
          });
        }
        return;
      }

      try {
        const [awayTeamData, homeTeamData] = await Promise.all([
          effectiveAwayTeamId ? getLeagueBuilderTeam(effectiveAwayTeamId) : Promise.resolve(null),
          effectiveHomeTeamId ? getLeagueBuilderTeam(effectiveHomeTeamId) : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setScorebugTeamLabels({
          away: getScorebugTeamLabel(
            navigationState?.awayTeamAbbreviation || awayTeamData?.abbreviation,
            awayTeamName,
          ),
          home: getScorebugTeamLabel(
            navigationState?.homeTeamAbbreviation || homeTeamData?.abbreviation,
            homeTeamName,
          ),
        });
      } catch (error) {
        console.warn("[GameTracker] Failed to load team abbreviations for scorebug.", error);
        if (!cancelled) {
          setScorebugTeamLabels({
            away: awayFallbackLabel,
            home: homeFallbackLabel,
          });
        }
      }
    };

    void loadScorebugLabels();

    return () => {
      cancelled = true;
    };
  }, [
    awayTeamName,
    gameState.awayTeamId,
    gameState.homeTeamId,
    homeTeamName,
    navigationState?.awayTeamAbbreviation,
    navigationState?.awayTeamId,
    navigationState?.homeTeamAbbreviation,
    navigationState?.homeTeamId,
  ]);

  // R3-T0: Detect fresh navigation (has real team data) vs refresh (navigationState empty/null)
  const isFreshNavigation = !!(navigationState?.homeTeamId || navigationState?.awayTeamId);

  // R3-T0: Seed persistence refs from navigationState (fresh game only)
  const seededNavStateRef = useRef(false);
  useEffect(() => {
    if (seededNavStateRef.current || !isFreshNavigation) return;
    seededNavStateRef.current = true;
    // Fresh game from exhibition setup — seed refs from navigation
    if (navigationState?.extraInningRunner != null) {
      hookExtraInningRunnerRef.current = navigationState.extraInningRunner;
    }
    if (navigationState?.extraInningRunnerDelay != null) {
      hookExtraInningRunnerDelayRef.current = navigationState.extraInningRunnerDelay;
    }
    hookTeamColorsRef.current = {
      awayTeamColor: navigationState?.awayTeamColor,
      awayTeamBorderColor: navigationState?.awayTeamBorderColor,
      homeTeamColor: navigationState?.homeTeamColor,
      homeTeamBorderColor: navigationState?.homeTeamBorderColor,
    };
    hookGameStartTimestampRef.current = Date.now();
    console.log("[R3-T0] Seeded persistence refs from navigation state", {
      awayTeamColor: hookTeamColorsRef.current.awayTeamColor ?? null,
      homeTeamColor: hookTeamColorsRef.current.homeTeamColor ?? null,
      gameStartTimestamp: hookGameStartTimestampRef.current,
    });
    notifyPersistenceMetadataChanged("navigation-state-seed");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Seed once on mount for fresh games

  // R3-T0: Restore persisted colors + timer AFTER async load completes
  const restoredColorsRef = useRef(false);
  useEffect(() => {
    if (!gameInitialized || isFreshNavigation || restoredColorsRef.current) return;
    restoredColorsRef.current = true;
    // Team colors — refs now populated by loadExistingGame
    const colors = hookTeamColorsRef.current;
    if (colors.awayTeamColor || colors.homeTeamColor) {
      setPersistedTeamColors(colors);
    }
    // Game start time
    const persistedStart = hookGameStartTimestampRef.current;
    if (persistedStart && persistedStart < Date.now()) {
      setGameStartTime(new Date(persistedStart));
    }
    console.log("[R3-T0] Restored GameTracker display state from persisted refs", {
      navigationState: navigationState ?? null,
      isFreshNavigation,
      gameInitialized,
      awayTeamColor: colors.awayTeamColor ?? null,
      homeTeamColor: colors.homeTeamColor ?? null,
      gameStartTimestamp: persistedStart ?? null,
    });
  }, [gameInitialized, isFreshNavigation]); // Runs after loadExistingGame completes

  // Set playoff context from navigation state (if this is a playoff game)
  const isPlayoffGame =
    effectiveCompetitionType === "playoff" ||
    effectiveCompetitionType === "elimination" ||
    !!restoredPlayoffContext.playoffSeriesId;
  useEffect(() => {
    if (navigationState?.playoffSeriesId) {
      setPlayoffContext(
        navigationState.playoffSeriesId,
        navigationState.playoffGameNumber ?? null,
        navigationState.playoffId ?? null,
      );
    }
  }, [
    navigationState?.playoffSeriesId,
    navigationState?.playoffGameNumber,
    navigationState?.playoffId,
    setPlayoffContext,
  ]);

  useEffect(() => {
    // On refresh, navigationState is null — use persisted stadiumName from gameState
    const navStadium = navigationState?.stadiumName || gameState.stadiumName;
    if (navStadium && navStadium !== selectedStadium) {
      setSelectedStadium(navStadium);
    }
  }, [navigationState?.stadiumName, gameState.stadiumName, selectedStadium]);

  useEffect(() => {
    const regulationInnings = navigationState?.totalInnings || hookTotalInningsRef.current || 9;
    const runnerDelay = navigationState?.extraInningRunnerDelay || hookExtraInningRunnerDelayRef.current || 1;
    const extraInningRunnerEnabled = navigationState?.extraInningRunner ?? hookExtraInningRunnerRef.current;
    // Runner rule starts in the Nth extra inning (1 = first extra, 2 = second extra)
    const runnerStartInning = regulationInnings + runnerDelay;
    if (
      !extraInningRunnerEnabled ||
      !gameInitialized ||
      gameState.gamePhase !== "LIVE" ||
      gameState.inning < runnerStartInning ||
      gameState.outs !== 0 ||
      gameState.bases.first ||
      gameState.bases.second ||
      gameState.bases.third
    ) {
      return;
    }

    const halfKey = `${gameState.inning}-${gameState.isTop ? "TOP" : "BOTTOM"}`;
    if (extraInningRunnerPlacementRef.current === halfKey) {
      return;
    }

    let cancelled = false;

    const placeExtraInningRunner = async () => {
      try {
        const lineupSnapshot = getLineupStateSnapshot();
        const batterIndices = getBatterIndicesSnapshot();
        const battingSide = gameState.isTop ? "away" : "home";
        const battingLineup = lineupSnapshot[battingSide].lineup;
        if (battingLineup.length === 0) {
          return;
        }

        const currentBatterIndex =
          battingSide === "away" ? batterIndices.away : batterIndices.home;
        const fallbackIndex =
          (currentBatterIndex - 1 + battingLineup.length) % battingLineup.length;
        let runnerId = battingLineup[fallbackIndex]?.playerId;

        // Find the same team's most recent half-inning (not the opposing team's)
        // T2 Beewolves batting → look at T1 (Beewolves batting), not B1
        // B2 Blowfish batting → look at B1 (Blowfish batting), not T2
        const sameTeamPreviousHalf = gameState.isTop
          ? { inning: gameState.inning - 1, halfInning: "TOP" as const }
          : { inning: gameState.inning - 1, halfInning: "BOTTOM" as const };
        const events = await getGameEvents(gameState.gameId);
        // Find the last completed at-bat for this team in their prior half-inning
        const sameTeamLastBatter = [...events]
          .reverse()
          .find(
            (event) =>
              event.inning === sameTeamPreviousHalf.inning &&
              event.halfInning === sameTeamPreviousHalf.halfInning &&
              event.batterId,
          );

        if (sameTeamLastBatter?.batterId) {
          runnerId = sameTeamLastBatter.batterId;
        }

        if (!runnerId || cancelled) {
          return;
        }

        placeGhostRunner("second", runnerId);
        extraInningRunnerPlacementRef.current = halfKey;
      } catch (error) {
        console.error(
          "[GameTracker] Failed to place extra-inning runner:",
          error,
        );
      }
    };

    void placeExtraInningRunner();

    return () => {
      cancelled = true;
    };
  }, [
    gameInitialized,
    gameState.bases.first,
    gameState.bases.second,
    gameState.bases.third,
    gameState.gameId,
    gameState.gamePhase,
    gameState.inning,
    gameState.isTop,
    gameState.outs,
    getBatterIndicesSnapshot,
    getLineupStateSnapshot,
    navigationState?.extraInningRunner,
    navigationState?.extraInningRunnerDelay,
    navigationState?.totalInnings,
    placeGhostRunner,
  ]);

  useEffect(() => {
    if (shouldSyncSelectedStadium(selectedStadium)) {
      setStadiumName(selectedStadium);
    }
  }, [selectedStadium, setStadiumName]);

  const [activityLog, setActivityLog] = useState<string[]>([]);
  const pushActivityLog = useCallback((entry: string) => {
    setActivityLog((prev) => [entry, ...prev].slice(0, 20));
  }, []);
  const inningLabel = useCallback(() => {
    return formatInningLabel(gameState.isTop, Math.max(1, gameState.inning));
  }, [gameState.inning, gameState.isTop]);
  const showManualEndHalfInningButton =
    gameState.outs >= 3 && gameState.gamePhase === "LIVE";

  // §4.2 Structured Play Log — parallel to activityLog (which other systems still use)
  const [playLogEntries, setPlayLogEntries] = useState<PlayLogEntry[]>([]);
  const [committedManagerDecisions, setCommittedManagerDecisions] = useState<
    ManagerDecisionRecord[]
  >([]);
  const firedInningSummariesRef = useRef<Set<string>>(new Set());
  const lastSeenHalfInningRef = useRef<{ inning: number; isTop: boolean } | null>(null);
  const shortInningLabel = useCallback(() => {
    return `${gameState.isTop ? "T" : "B"}${Math.max(1, gameState.inning)}`;
  }, [gameState.isTop, gameState.inning]);
  const buildEnrichmentCacheSeed = useCallback(
    (event: AtBatEvent): NonNullable<AtBatEvent["enrichment"]> | undefined => {
      const outsRecorded =
        event.outsRecorded ?? Math.max(0, event.outsAfter - event.outs);
      if (!event.enrichment && outsRecorded <= 0) {
        return undefined;
      }

      return {
        ...(outsRecorded > 0 ? { fieldingDifficulty: "ROUTINE" as const } : {}),
        ...(event.enrichment || {}),
      };
    },
    [],
  );
  const appendCommittedAtBatEntry = useCallback(
    async (eventId: string) => {
      const committedEvent = await getAtBatEvent(eventId);
      if (!committedEvent) {
        queuePlayLogRefreshRef.current(0);
        return;
      }

      const nextEntry = mapAtBatEventToPlayLogEntry(committedEvent);
      const enrichmentSeed = buildEnrichmentCacheSeed(committedEvent);
      if (enrichmentSeed) {
        setEnrichmentCache((prev) => ({
          ...prev,
          [eventId]: {
            ...(prev[eventId] || {}),
            ...enrichmentSeed,
          },
        }));
      }
      setPlayLogEntries((prev) => [
        ...prev.filter((entry) => entry.eventId !== eventId),
        nextEntry,
      ]);
      await processCommittedAtBatAutoDetectionsRef.current(committedEvent);
    },
    [buildEnrichmentCacheSeed],
  );
  const playLogRefreshTimeoutRef = useRef<number | null>(null);
  const rebuildPlayLogFromEventLogRef = useRef<() => void | Promise<void>>(
    () => {},
  );
  const queuePlayLogRefreshRef = useRef<(delayMs?: number) => void>(() => {});
  const previousPitchCountPromptRef = useRef<typeof pitchCountPrompt>(null);
  const closedPitchCountPromptTypeRef = useRef<
    "pitching_change" | "end_game" | "end_inning" | null
  >(null);

  // Layer 5: Enrichment Panel state
  const [enrichingEntry, setEnrichingEntry] = useState<PlayLogEntry | null>(
    null,
  );
  const [selectedPlayLogEntry, setSelectedPlayLogEntry] =
    useState<PlayLogEntry | null>(null);
  const [selectedBetweenPlayEvent, setSelectedBetweenPlayEvent] =
    useState<BetweenPlayEvent | null>(null);
  const [selectedBetweenPlayEventLoading, setSelectedBetweenPlayEventLoading] =
    useState(false);
  const [selectedBetweenPlayEventSaving, setSelectedBetweenPlayEventSaving] =
    useState(false);
  const [enrichmentCache, setEnrichmentCache] = useState<
    Record<
      string,
      NonNullable<import("../../../utils/eventLog").AtBatEvent["enrichment"]>
    >
  >({});
  // Runner sub-entry enrichment state (UX-050)
  const [enrichingRunnerSubEntry, setEnrichingRunnerSubEntry] =
    useState<RunnerSubEntry | null>(null);
  const [enrichingRunnerParentEntry, setEnrichingRunnerParentEntry] =
    useState<PlayLogEntry | null>(null);
  // Fix D: Force defensiveColumnPlayers re-evaluation after roster syncs
  const [rosterVersion, setRosterVersion] = useState(0);
  // Between-inning enrichment prompt
  const [showEnrichmentPrompt, setShowEnrichmentPrompt] = useState(false);
  const [unenrichedCount, setUnenrichedCount] = useState(0);
  // Post-game enrichment prompt
  const [showPostGameEnrichPrompt, setShowPostGameEnrichPrompt] =
    useState(false);
  const [postGameUnenrichedCount, setPostGameUnenrichedCount] = useState(0);
  useEffect(() => {
    if (!gameState.gameId) {
      setLineupFieldingEvents([]);
      return;
    }

    let cancelled = false;

    void getGameFieldingEvents(gameState.gameId)
      .then((events) => {
        if (!cancelled) {
          setLineupFieldingEvents(events);
        }
      })
      .catch((error) => {
        console.warn(
          "[GameTracker] Failed to load lineup fielding events.",
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [gameState.gameId, atBatSequence, playLogEntries, substitutionLog.length]);

  useEffect(() => {
    setRunnerOutcomeCorrectionActive(enrichingRunnerSubEntry !== null);
    return () => {
      setRunnerOutcomeCorrectionActive(false);
    };
  }, [enrichingRunnerSubEntry, setRunnerOutcomeCorrectionActive]);

  const logAction = useCallback(
    (entry: string) => {
      pushActivityLog(`${inningLabel()}: ${entry}`);
    },
    [inningLabel, pushActivityLog],
  );

  const buildPlateAppearanceActionFromPlayData = useCallback(
    (
      playData: PlayData,
      runnerAdvancement?: RunnerAdvancement,
    ): PlateAppearanceAction => {
      const batterReached =
        playData.runnerOutcomes?.batter?.to !== "out" &&
        playData.runnerOutcomes?.batter?.to !== undefined;
      const isDroppedThirdStrike =
        (playData.outType === "K" || playData.outType === "Kc") &&
        playData.fieldingSequence.length >= 2 &&
        playData.fieldingSequence[0] === 2 &&
        playData.fieldingSequence[1] === 3;

      switch (playData.type) {
        case "hr":
          return {
            type: "hit",
            hitType: "HR",
            rbi: 0,
            runnerAdvancement,
          };
        case "hit":
          return {
            type: "hit",
            hitType: playData.hitType || "1B",
            rbi: 0,
            runnerAdvancement,
          };
        case "out":
          return {
            type: "out",
            outType: playData.outType || "GO",
            runnerAdvancement,
            batterReached,
            isDroppedThirdStrike,
          };
        case "foul_out":
          return {
            type: "out",
            outType: "FLO",
            runnerAdvancement,
          };
        case "foul_ball":
          return {
            type: "foul_ball",
          };
        case "walk":
          return {
            type: "walk",
            walkType: playData.walkType || "BB",
          };
        case "error":
          return {
            type: "error",
            rbi: 0,
            runnerAdvancement,
          };
      }
    },
    [],
  );

  // Player state management (Mojo, Fitness, Clutch)
  const playerStateHook = usePlayerState({
    gameId: gameId || "demo-game",
    isPlayoffs: isPlayoffGame,
  });

  // R3-T0: Wire mojo/fitness getter for persistence
  useEffect(() => {
    hookMojoFitnessGetterRef.current = () => {
      const result: Record<string, { mojo: number; fitness: string }> = {};
      for (const player of playerStateHook.getAllPlayers()) {
        result[player.playerId] = {
          mojo: player.gameState.currentMojo,
          fitness: player.fitnessProfile.currentFitness,
        };
      }
      return result;
    };
  }, [playerStateHook, hookMojoFitnessGetterRef]);

  useEffect(() => {
    if (!gameInitialized || playerStateHook.players.size === 0) return;
    if (!hasObservedInitialPlayerStateRef.current) {
      hasObservedInitialPlayerStateRef.current = true;
      return;
    }
    notifyPersistenceMetadataChanged("player-state-change");
  }, [gameInitialized, notifyPersistenceMetadataChanged, playerStateHook.players]);

  // Fame tracking
  const fameTrackingHook = useFameTracking({
    gameId: gameId || "demo-game",
    gameMode: effectiveGameMode,
    isPlayoffs: isPlayoffGame,
    playoffRound: effectivePlayoffRound,
    isEliminationGame: effectiveIsEliminationGame,
    isClinchGame: effectiveIsClinchGame,
  });
  const recordedAutoFameKeysRef = useRef<Set<string>>(new Set());
  const processedAutoFameAtBatIdsRef = useRef<Set<string>>(new Set());
  const activeSaveAppearancesRef = useRef<
    Partial<Record<"away" | "home", SaveAppearanceSnapshot>>
  >({});
  const completedSaveAppearancesRef = useRef<SaveAppearanceSnapshot[]>([]);
  const processCommittedAtBatAutoDetectionsRef = useRef<
    (event: AtBatEvent) => Promise<void>
  >(async () => {});

  const recordDetectedFameEvents = useCallback(
    (events: DetectedFameEvent[]) => {
      for (const event of events) {
        if (recordedAutoFameKeysRef.current.has(event.detectionKey)) {
          continue;
        }

        recordedAutoFameKeysRef.current.add(event.detectionKey);
        fameTrackingHook.recordFameEvent(
          event.eventType,
          event.playerId,
          event.playerName,
          event.inning,
          event.halfInning,
          event.leverageIndex,
        );
      }
    },
    [fameTrackingHook],
  );

  useEffect(() => {
    recordedAutoFameKeysRef.current.clear();
    processedAutoFameAtBatIdsRef.current.clear();
    activeSaveAppearancesRef.current = {};
    completedSaveAppearancesRef.current = [];
  }, [gameId]);

  const lastFameKeyRef = useRef<string>("");
  useEffect(() => {
    const event = fameTrackingHook.lastEvent;
    if (!event) {
      lastFameKeyRef.current = "";
      return;
    }
    const key = `${event.label}-${event.finalFame}-${event.icon}`;
    if (lastFameKeyRef.current === key) return;
    lastFameKeyRef.current = key;
    pushActivityLog(
      `✨ ${event.label} (${formatFameValue(event.finalFame)} Fame)`,
    );
  }, [fameTrackingHook.lastEvent, formatFameValue, pushActivityLog]);

  // MAJ-02: Fan morale tracking — one hook per team for dual-team franchise support
  // In exhibition mode these are instantiated but never called (no morale in exhibition)
  const homeFanMorale = useFanMorale(homeTeamId);
  const awayFanMorale = useFanMorale(awayTeamId);

  // Helper to build GameStateForLI from current game state for LI calculations
  const buildGameStateForLI = useCallback(
    (): GameStateForLI => ({
      inning: gameState?.inning ?? 1,
      halfInning: gameState?.isTop ? "TOP" : "BOTTOM",
      outs: (gameState?.outs ?? 0) as 0 | 1 | 2,
      runners: {
        first: !!gameState?.bases?.first,
        second: !!gameState?.bases?.second,
        third: !!gameState?.bases?.third,
      },
      homeScore: gameState?.homeScore ?? 0,
      awayScore: gameState?.awayScore ?? 0,
    }),
    [gameState],
  );

  const getCurrentLeverageIndex = useCallback(() => {
    return getLeverageIndex(
      buildGameStateForLI(),
      hookTotalInningsRef.current || 9,
    );
  }, [buildGameStateForLI, hookTotalInningsRef]);

  // Track selected hit/out/walk details for the two-step record flow
  const [pendingOutcome, setPendingOutcome] = useState<{
    type: "hit" | "out" | "walk";
    subType: string;
    direction?: string;
    rbi?: number;
    modifiers?: { ifr?: boolean }; // GAP-GT-4-H: IFR flag
  } | null>(null);

  // GAP-GT-6-A: Time play override — when user indicates the 3rd-out tag occurred before the runner scored
  const [timePlayNoRun, setTimePlayNoRun] = useState(false);

  const [scoreCorrectionPrompt, setScoreCorrectionPrompt] = useState<null | {
    inning: number;
    halfInning: "TOP" | "BOTTOM";
    current: { away: number; home: number };
    reconciled: { away: number; home: number };
    awayDelta: number;
    homeDelta: number;
  }>(null);

  // GAP-GT-7-C: Track pending PH — PH must bat before they can be removed from lineup
  const [pendingPH, setPendingPH] = useState<string | null>(null);

  // Player card modal state - EXH-036: Added playerId for mojo/fitness editing
  const [selectedPlayer, setSelectedPlayer] = useState<{
    name: string;
    type: "batter" | "pitcher";
    playerId: string;
    runnerBase?: RunnerBase;
  } | null>(null);
  const [
    suppressedManagerRecommendationKeys,
    setSuppressedManagerRecommendationKeys,
  ] = useState<Set<string>>(() => new Set());
  const committedPromptedManagerRecommendationKeysRef = useRef<Set<string>>(
    new Set(),
  );
  const committedManagerRecommendationWatchKeysRef = useRef<Set<string>>(
    new Set(),
  );
  useEffect(() => {
    setSuppressedManagerRecommendationKeys(new Set());
    committedPromptedManagerRecommendationKeysRef.current = new Set();
    committedManagerRecommendationWatchKeysRef.current = new Set();
  }, [gameState.gameId]);
  const lastAppliedRestoredMojoFitnessRef = useRef<
    Record<string, { mojo: number; fitness: string }> | null
  >(null);
  const hasObservedInitialPlayerStateRef = useRef(false);
  const [gameSoundsOn, setGameSoundsOn] = useState(false);
  const [beatReporterSoundsOn, setBeatReporterSoundsOn] = useState(false);
  const audioManagerRef = useRef(new AudioManager());
  const previousScoreRef = useRef({
    away: scoreboard.away.runs,
    home: scoreboard.home.runs,
  });
  const previousHalfInningRef = useRef(
    `${gameState.isTop ? "T" : "B"}-${gameState.inning}`,
  );
  const pendingScoreCelebrationSoundRef = useRef<AudioSoundName | null>(null);
  const suppressNextHalfInningSoundRef = useRef(false);

  // §2.4: Expanded scoreboard overlay toggle
  const [isScoreboardExpanded, setIsScoreboardExpanded] = useState(false);
  const [showDeferredPitchCountList, setShowDeferredPitchCountList] =
    useState(false);

  // §9.3: Swap Order mode — stores first player's ID, null when inactive
  const [swapOrderMode, setSwapOrderMode] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);

  // §9.2: Swap Position mode — like swap order but for fielding positions in live or pre-game
  const [swapPositionMode, setSwapPositionMode] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);

  // End game confirmation state
  const [showEndGameConfirmation, setShowEndGameConfirmation] = useState(false);

  useEffect(() => {
    if (!deferredPitchCounts.length) {
      setShowDeferredPitchCountList(false);
    }
  }, [deferredPitchCounts.length]);

  useEffect(() => {
    if (pitchCountPrompt) {
      setShowDeferredPitchCountList(false);
    }
  }, [pitchCountPrompt]);

  // §4.3: Processing-aware button feedback — tracks which outcome is being processed
  const [processingOutcome, setProcessingOutcome] = useState<string | null>(
    null,
  );

  // Runner names tracking - who is on each base
  // Updated when batters reach base via hit, walk, error, etc.
  const [runnerNames, setRunnerNames] = useState<{
    first?: string;
    second?: string;
    third?: string;
  }>({});

  const battingLineupRunners = useMemo(() => {
    const trackerSnapshot = getRunnerTrackerSnapshot();
    const nextRunners: {
      first?: { name: string; playerId: string };
      second?: { name: string; playerId: string };
      third?: { name: string; playerId: string };
    } = {};

    for (const runner of trackerSnapshot.runners) {
      if (runner.currentBase === "1B") {
        nextRunners.first = {
          name: runner.runnerName,
          playerId: runner.runnerId,
        };
      } else if (runner.currentBase === "2B") {
        nextRunners.second = {
          name: runner.runnerName,
          playerId: runner.runnerId,
        };
      } else if (runner.currentBase === "3B") {
        nextRunners.third = {
          name: runner.runnerName,
          playerId: runner.runnerId,
        };
      }
    }

    return nextRunners;
  }, [
    gameState.bases.first,
    gameState.bases.second,
    gameState.bases.third,
    getRunnerTrackerSnapshot,
    runnerIdentityVersion,
  ]);

  // T1-02/03/04 FIX: Sync runnerNames from the runner tracker whenever bases change.
  // The tracker is the single source of truth for runner identity (handles SB, WP, PB,
  // pinch runners, thrown-out-advancing, etc.). Without this sync, runnerNames would
  // fall out of sync and show "R1"/"R2"/"R3" or ghost runners.
  useEffect(() => {
    const trackerNames = getBaseRunnerNames();
    console.log("[R3-R4] Runner names synced:", {
      names: trackerNames,
      lineupRunners: battingLineupRunners,
    });
    setRunnerNames((prev) => {
      // Only update if different to avoid infinite render loops
      if (
        prev.first !== trackerNames.first ||
        prev.second !== trackerNames.second ||
        prev.third !== trackerNames.third
      ) {
        return trackerNames;
      }
      return prev;
    });
  }, [
    gameState.bases.first,
    gameState.bases.second,
    gameState.bases.third,
    runnerIdentityVersion,
    getBaseRunnerNames,
    battingLineupRunners,
  ]);

  // ============================================
  // POPOVER STATE — Runner & Fielder tap menus (Layer 4)
  // ============================================
  const [activeRunnerPopover, setActiveRunnerPopover] = useState<{
    base: RunnerBase;
    runnerName: string;
    playerId: string;
    anchorPosition: { left: string; top: string };
  } | null>(null);
  const [pendingRunnerAttribution, setPendingRunnerAttribution] =
    useState<PendingRunnerAttributionAction | null>(null);
  const [pendingRunnerAttributionSaving, setPendingRunnerAttributionSaving] =
    useState(false);
  const [activeFielderPopover, setActiveFielderPopover] = useState<{
    fielder: FielderInfo;
    anchorPosition: { left: string; top: string };
  } | null>(null);
  // REMOVED per Cleanup: Lineup overlay replaced by inline lineup columns (Step 1.C).
  // const [showLineupOverlay, setShowLineupOverlay] = useState(false);
  // const [lineupOverlayHint, setLineupOverlayHint] = useState<string | null>(null);
  // REMOVED: Touch play review panel eliminated — play log tap handles review.
  const [pendingManualSpecialPrompt, setPendingManualSpecialPrompt] =
    useState<PendingManualSpecialPrompt | null>(null);
  const [fenwayContext, setFenwayContext] = useState<{
    matchupRecord?: string;
    matchupAvg?: string;
    historicalMatchupRecord?: string;
    historicalMatchupAvg?: string;
    milestoneAlerts: string[];
  }>({ milestoneAlerts: [] });

  // D-4: HR inline prompt state (distance + pitch type before recording)
  const [hrPrompt, setHrPrompt] = useState<{
    rbi: number;
    runnerAdv: RunnerAdvancement | undefined;
    defaults: RunnerDefaults;
    distance: string;
    pitchType: string;
  } | null>(null);

  // D-3: Error flow prompt state (base → fielder → type)
  const [errorFlow, setErrorFlow] = useState<{
    step: "base" | "fielder" | "type";
    baseReached: "1B" | "2B" | "3B";
    fielderPosition: number;
    defaults: RunnerDefaults;
  } | null>(null);

  // D-5: SF prompt state — shown when FO/FLO + R3 + <2 outs
  const [sfPrompt, setSfPrompt] = useState<{
    outType: "FO" | "FLO";
    runnerAdv: RunnerAdvancement | undefined;
    defaults: RunnerDefaults;
  } | null>(null);

  // D-6: GO→DP prompt state — shown when GO + runner out detected
  const [dpPrompt, setDpPrompt] = useState<{
    runnerAdv: RunnerAdvancement | undefined;
    rbi: number;
    defaults: RunnerDefaults;
  } | null>(null);

  // D-7: IFR prompt state — shown when PO + R1+R2 or loaded + <2 outs
  const [ifrPrompt, setIfrPrompt] = useState<{
    runnerAdv: RunnerAdvancement | undefined;
    defaults: RunnerDefaults;
  } | null>(null);
  // REMOVED per UX-022: Pre-commit runner gate eliminated.
  // Runner corrections are now post-commit via play log or lineup column tap.
  // const [pendingRunnerCorrection, setPendingRunnerCorrection] = useState<PendingRunnerCorrectionAction | null>(null);

  // GameDiamond removed in Step 1.B (UX-004) — fieldZoomLevel no longer needed.
  // const fieldZoomLevel = 1;

  const playAudio = useCallback((sound: AudioSoundName) => {
    void audioManagerRef.current.playSound(sound);
  }, []);

  useEffect(() => {
    audioManagerRef.current.setGameSoundsEnabled(gameSoundsOn);
  }, [gameSoundsOn]);

  useEffect(() => {
    audioManagerRef.current.setBeatReporterSoundsEnabled(beatReporterSoundsOn);
  }, [beatReporterSoundsOn]);

  useEffect(() => {
    const currentScore = {
      away: scoreboard.away.runs,
      home: scoreboard.home.runs,
    };

    if (!gameInitialized) {
      previousScoreRef.current = currentScore;
      return;
    }

    const previousScore = previousScoreRef.current;
    const scoredRun =
      currentScore.away > previousScore.away ||
      currentScore.home > previousScore.home;

    if (scoredRun) {
      const overrideSound = pendingScoreCelebrationSoundRef.current;
      if (overrideSound === "homeRun") {
        playAudio("homeRun");
      } else {
        playAudio("runScored");
      }
      pendingScoreCelebrationSoundRef.current = null;
    }

    previousScoreRef.current = currentScore;
  }, [gameInitialized, playAudio, scoreboard.away.runs, scoreboard.home.runs]);

  useEffect(() => {
    const currentHalfInning = `${gameState.isTop ? "T" : "B"}-${gameState.inning}`;

    if (!gameInitialized) {
      previousHalfInningRef.current = currentHalfInning;
      return;
    }

    const previousHalfInning = previousHalfInningRef.current;

    if (currentHalfInning !== previousHalfInning) {
      if (suppressNextHalfInningSoundRef.current) {
        suppressNextHalfInningSoundRef.current = false;
      } else {
        playAudio("halfInning");
      }
    }

    previousHalfInningRef.current = currentHalfInning;
  }, [gameInitialized, gameState.inning, gameState.isTop, playAudio]);

  // Undo system - restore game state on undo
  const handleUndo = useCallback(
    (snapshot: GameSnapshot) => {
      console.log("[R3-R7] Undoing durable game action:", snapshot.playDescription);
      if (playLogRefreshTimeoutRef.current !== null) {
        window.clearTimeout(playLogRefreshTimeoutRef.current);
        playLogRefreshTimeoutRef.current = null;
      }
      pendingScoreCelebrationSoundRef.current = null;
      setProcessingOutcome(null);
      setHrPrompt(null);
      setErrorFlow(null);
      setSfPrompt(null);
      setDpPrompt(null);
      setIfrPrompt(null);
      setScoreCorrectionPrompt(null);

      void (async () => {
        // R3-R7: Check if we have a real snapshot from UndoSystem to restore from
        const snapshotData = snapshot.gameState as {
          gameState?: GameState;
          scoreboard?: ScoreboardState;
          playerStatsEntries?: [string, PlayerGameStats][];
          pitcherStatsEntries?: [string, PitcherGameStats][];
          mojoFitnessEntries?: [
            string,
            { mojo: MojoLevel; fitness: FitnessState },
          ][];
          runnerTrackerSnapshot?: ReturnType<typeof getRunnerTrackerSnapshot>;
          lineupSnapshot?: GameLineupSnapshot;
          batterIndices?: { away: number; home: number };
        } | null;

        const hasValidSnapshot = !!(snapshotData?.gameState && snapshotData?.scoreboard);

        // Mark event as undone in DB. Skip full reload if we have a snapshot to restore from
        // (loadExistingGame reloads stale post-play scores from persisted snapshot)
        const undone = await undoLastAction({ skipReload: hasValidSnapshot });
        if (!undone) {
          console.warn("No durable action available to undo");
          queuePlayLogRefreshRef.current(0);
          return;
        }

        if (hasValidSnapshot) {
          console.log("[R3-R7] Restoring from UndoSystem snapshot — score:",
            snapshotData!.gameState!.awayScore, "-", snapshotData!.gameState!.homeScore,
            "outs:", snapshotData!.gameState!.outs);
          restoreState({
            gameState: snapshotData!.gameState!,
            scoreboard: snapshotData!.scoreboard!,
            playerStats: snapshotData!.playerStatsEntries
              ? new Map(snapshotData!.playerStatsEntries)
              : undefined,
            pitcherStats: snapshotData!.pitcherStatsEntries
              ? new Map(snapshotData!.pitcherStatsEntries)
              : undefined,
            runnerTrackerState: snapshotData!.runnerTrackerSnapshot
              ? {
                  runners: snapshotData!.runnerTrackerSnapshot.runners,
                  currentPitcherId: snapshotData!.runnerTrackerSnapshot.currentPitcherId,
                  currentPitcherName: snapshotData!.runnerTrackerSnapshot.currentPitcherName,
                  pitcherStats: new Map(
                    snapshotData!.runnerTrackerSnapshot.pitcherStatsEntries || [],
                  ),
                  inning: snapshotData!.runnerTrackerSnapshot.inning,
                  atBatNumber: snapshotData!.runnerTrackerSnapshot.atBatNumber,
                }
              : undefined,
            lineupSnapshot: snapshotData!.lineupSnapshot,
            batterIndices: snapshotData!.batterIndices,
          });

          if (snapshotData!.mojoFitnessEntries) {
            for (const [playerId, playerState] of snapshotData!.mojoFitnessEntries) {
              const currentPlayer = playerStateHook.getPlayer(playerId);
              if (!currentPlayer) continue;
              if (currentPlayer.gameState.currentMojo !== playerState.mojo) {
                playerStateHook.setMojo(playerId, playerState.mojo);
              }
              if (
                currentPlayer.fitnessProfile.currentFitness !==
                playerState.fitness
              ) {
                playerStateHook.setFitness(playerId, playerState.fitness);
              }
            }
            setRosterVersion((version) => version + 1);
          }
        }

        playAudio("undoBloop");
        pendingScoreCelebrationSoundRef.current = null;
        suppressNextHalfInningSoundRef.current = true;
        queuePlayLogRefreshRef.current(0);
      })();
    },
    [
      playAudio,
      playerStateHook,
      restoreState,
      undoLastAction,
    ],
  );

  const undoSystem = useUndoSystem(10, handleUndo); // GAP-GT-3-B: increased from 5 to 10

  // Keep undo system current state in sync with game state
  // CRIT-01 fix: Include playerStats and pitcherStats as serializable entries
  // (Maps don't survive JSON.parse(JSON.stringify(...)) used by UndoSystem deep clone)
  useEffect(() => {
    if (!gameInitialized) return;
    undoSystem.setCurrentState({
      gameState,
      scoreboard,
      playerStatsEntries: Array.from(playerStats.entries()),
      pitcherStatsEntries: Array.from(pitcherStats.entries()),
      mojoFitnessEntries: playerStateHook.getAllPlayers().map((player) => [
        player.playerId,
        {
          mojo: player.gameState.currentMojo,
          fitness: player.fitnessProfile.currentFitness,
        },
      ]),
      runnerTrackerSnapshot: getRunnerTrackerSnapshot(),
      lineupSnapshot: getLineupStateSnapshot(),
      batterIndices: getBatterIndicesSnapshot(),
      playLogEntries,
      runnerNames,
    });
  }, [
    gameInitialized,
    gameState,
    scoreboard,
    rosterVersion,
    playerStats,
    pitcherStats,
    playerStateHook,
    getRunnerTrackerSnapshot,
    getLineupStateSnapshot,
    getBatterIndicesSnapshot,
    playLogEntries,
    runnerNames,
  ]);

  useEffect(() => {
    if (!gameInitialized || !gameState.gameId) return;
    console.log("[R3-R5] Rebuilding play log after substitution-aware trigger", {
      gameId: gameState.gameId,
      atBatSequence,
      substitutionCount: substitutionLog.length,
    });
    void rebuildPlayLogFromEventLogRef.current();
  }, [atBatSequence, gameInitialized, gameState.gameId, substitutionLog.length]);

  useEffect(() => {
    return () => {
      if (playLogRefreshTimeoutRef.current !== null) {
        window.clearTimeout(playLogRefreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previousPrompt = previousPitchCountPromptRef.current;
    const hadPrompt = previousPrompt !== null;
    if (hadPrompt && !pitchCountPrompt) {
      closedPitchCountPromptTypeRef.current = previousPrompt?.type ?? null;
      queuePlayLogRefreshRef.current(0);
    }
    previousPitchCountPromptRef.current = pitchCountPrompt;
  }, [pitchCountPrompt]);

  useEffect(() => {
    if (
      !selectedPlayLogEntry?.eventId ||
      selectedPlayLogEntry.eventType === "at_bat"
    ) {
      setSelectedBetweenPlayEvent(null);
      setSelectedBetweenPlayEventLoading(false);
      return;
    }

    let cancelled = false;
    setSelectedBetweenPlayEventLoading(true);
    void getBetweenPlayEvent(selectedPlayLogEntry.eventId)
      .then((event) => {
        if (cancelled) return;
        setSelectedBetweenPlayEvent(event);
      })
      .finally(() => {
        if (cancelled) return;
        setSelectedBetweenPlayEventLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPlayLogEntry]);

  React.useLayoutEffect(() => {
    if (!enrichingEntry?.eventId) {
      return;
    }

    const eventId = enrichingEntry.eventId;
    setEnrichmentCache((prev) => {
      if (prev[eventId]) {
        return prev;
      }

      const enrichmentSeed = buildEnrichmentCacheSeed({
        enrichment: undefined,
        outsRecorded: enrichingEntry.resultCategory === "out" ? 1 : 0,
        outsAfter: 0,
        outs: 0,
      } as AtBatEvent);
      if (!enrichmentSeed) {
        return prev;
      }

      return {
        ...prev,
        [eventId]: enrichmentSeed,
      };
    });

    let cancelled = false;
    void getAtBatEvent(eventId).then((event) => {
      if (cancelled || !event) {
        return;
      }

      const enrichmentSeed = buildEnrichmentCacheSeed(event);
      if (!enrichmentSeed) {
        return;
      }

      setEnrichmentCache((prev) => ({
        ...prev,
        [eventId]: {
          ...(prev[eventId] || {}),
          ...enrichmentSeed,
        },
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [
    buildEnrichmentCacheSeed,
    enrichingEntry?.eventId,
    enrichingEntry?.resultCategory,
  ]);

  useEffect(() => {
    if (!selectedPlayLogEntry) return;
    const nextEntry = playLogEntries.find(
      (entry) => entry.id === selectedPlayLogEntry.id,
    );
    if (!nextEntry) {
      setSelectedPlayLogEntry(null);
      setEnrichingEntry(null);
      setSelectedBetweenPlayEvent(null);
      return;
    }
    if (nextEntry !== selectedPlayLogEntry) {
      setSelectedPlayLogEntry(nextEntry);
      if (nextEntry.eventType === "at_bat") {
        setEnrichingEntry(nextEntry);
      }
    }
  }, [playLogEntries, selectedPlayLogEntry]);

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    hits: false,
    outs: false,
    walks: false,
    events: false,
    substitutions: false,
  });
  const [expandedOutcome, setExpandedOutcome] = useState<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleOutcomeDetail = (outcome: string) => {
    setExpandedOutcome((prev) => (prev === outcome ? null : outcome));
  };

  // Determine which team is batting and which is fielding
  const battingTeamId = gameState.isTop ? awayTeamId : homeTeamId;
  const fieldingTeamId = gameState.isTop ? homeTeamId : awayTeamId;

  // GAP-GT-6-G / GAP-GT-6-C: Derived runner state for button availability
  const hasRunners = !!(
    gameState.bases.first ||
    gameState.bases.second ||
    gameState.bases.third
  );
  const runnerCount =
    (gameState.bases.first ? 1 : 0) +
    (gameState.bases.second ? 1 : 0) +
    (gameState.bases.third ? 1 : 0);

  // Get team colors - use navigation state (from database) if available, fall back to static config
  // This ensures teams loaded from IndexedDB show correct colors
  const battingTeamColors = gameState.isTop
    ? { primary: awayTeamColor, secondary: awayTeamBorderColor }
    : { primary: homeTeamColor, secondary: homeTeamBorderColor };
  const fieldingTeamColors = gameState.isTop
    ? { primary: homeTeamColor, secondary: homeTeamBorderColor }
    : { primary: awayTeamColor, secondary: awayTeamBorderColor };

  // Fielder border colors alternate between primary and secondary
  const fielderColor1 = fieldingTeamColors.primary;
  const fielderColor2 = fieldingTeamColors.secondary;

  // EXH-036: Determine current team batting (for ID generation)
  // When it's top of inning, away team bats; bottom of inning, home team bats
  const battingTeam: "home" | "away" = gameState.isTop ? "away" : "home";
  const fieldingTeam: "home" | "away" = gameState.isTop ? "home" : "away";

  const initialAwayTeamPitchers = navigationState?.awayPitchers ?? [];

  const initialHomeTeamPitchers = navigationState?.homePitchers ?? [];

  // Roster data - use explicit launch state for new games, or hydrate from a persisted game on resume.
  // Use useState so we can update the roster when substitutions are made
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>(() =>
    sanitizeIncomingRosterPlayers(
      navigationState?.awayPlayers ?? [],
      initialAwayTeamPitchers,
      navigationState?.useDH,
    ),
  );

  const [awayTeamPitchers, setAwayTeamPitchers] = useState<Pitcher[]>(
    initialAwayTeamPitchers,
  );

  // Home roster data - explicit launch state for new games, persisted game state on resume.
  // Use useState so we can update the roster when substitutions are made
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>(() =>
    sanitizeIncomingRosterPlayers(
      navigationState?.homePlayers ?? [],
      initialHomeTeamPitchers,
      navigationState?.useDH,
    ),
  );

  const [homeTeamPitchers, setHomeTeamPitchers] = useState<Pitcher[]>(
    initialHomeTeamPitchers,
  );

  const awayTeamPlayersRef = useRef(awayTeamPlayers);
  const homeTeamPlayersRef = useRef(homeTeamPlayers);
  awayTeamPlayersRef.current = awayTeamPlayers;
  homeTeamPlayersRef.current = homeTeamPlayers;

  const getRosterEntityId = useCallback(
    (entity: { name: string; playerId?: string }, team: "away" | "home") => {
      return getRuntimeRosterEntityId(entity, team);
    },
    [],
  );

  const rosterIdLookups = useMemo(
    () => ({
      away: {
        players: new Map(
          awayTeamPlayers.map((player) => [
            player.name,
            getRosterEntityId(player, "away"),
          ]),
        ),
        pitchers: new Map(
          awayTeamPitchers.map((pitcher) => [
            pitcher.name,
            getRosterEntityId(pitcher, "away"),
          ]),
        ),
      },
      home: {
        players: new Map(
          homeTeamPlayers.map((player) => [
            player.name,
            getRosterEntityId(player, "home"),
          ]),
        ),
        pitchers: new Map(
          homeTeamPitchers.map((pitcher) => [
            pitcher.name,
            getRosterEntityId(pitcher, "home"),
          ]),
        ),
      },
    }),
    [
      awayTeamPitchers,
      awayTeamPlayers,
      getRosterEntityId,
      homeTeamPitchers,
      homeTeamPlayers,
    ],
  );

  const getRosterIdFromName = useCallback(
    (
      name: string,
      team: "away" | "home",
      role: "any" | "player" | "pitcher" = "any",
    ) => {
      const teamLookups = rosterIdLookups[team];
      if (role === "player") {
        return (
          teamLookups.players.get(name) ||
          buildFallbackRuntimePlayerId(name, team)
        );
      }
      if (role === "pitcher") {
        return (
          teamLookups.pitchers.get(name) ||
          teamLookups.players.get(name) ||
          buildFallbackRuntimePlayerId(name, team)
        );
      }
      return (
        teamLookups.players.get(name) ||
        teamLookups.pitchers.get(name) ||
        buildFallbackRuntimePlayerId(name, team)
      );
    },
    [rosterIdLookups],
  );

  const rosterNameById = useMemo(() => {
    const entries: Array<[string, string]> = [];
    for (const player of awayTeamPlayers) {
      entries.push([getRosterEntityId(player, "away"), player.name]);
    }
    for (const player of homeTeamPlayers) {
      entries.push([getRosterEntityId(player, "home"), player.name]);
    }
    for (const pitcher of awayTeamPitchers) {
      entries.push([getRosterEntityId(pitcher, "away"), pitcher.name]);
    }
    for (const pitcher of homeTeamPitchers) {
      entries.push([getRosterEntityId(pitcher, "home"), pitcher.name]);
    }
    return new Map(entries);
  }, [
    awayTeamPitchers,
    awayTeamPlayers,
    getRosterEntityId,
    homeTeamPitchers,
    homeTeamPlayers,
  ]);

  const getCanonicalRosterName = useCallback(
    (entity: { name: string; fullName?: string } | undefined) => {
      return entity?.fullName?.trim() || entity?.name || "";
    },
    [],
  );

  const syncDisplayedRostersToLineupSnapshot = useCallback(
    (snapshot?: GameLineupSnapshot) => {
      const lineupSnapshot = snapshot || getLineupStateSnapshot();
      const nextAwayPlayers = reconcileTeamPlayersWithLineupSnapshot(
        awayTeamPlayersRef.current,
        lineupSnapshot.away,
        "away",
        getRosterEntityId,
      );
      const nextHomePlayers = reconcileTeamPlayersWithLineupSnapshot(
        homeTeamPlayersRef.current,
        lineupSnapshot.home,
        "home",
        getRosterEntityId,
      );
      awayTeamPlayersRef.current = nextAwayPlayers;
      homeTeamPlayersRef.current = nextHomePlayers;
      setAwayTeamPlayers(nextAwayPlayers);
      setHomeTeamPlayers(nextHomePlayers);
      // R3-R7: Use functional updater to avoid depending on awayTeamPitchers/homeTeamPitchers
      // in this callback's deps (which caused an infinite re-render loop)
      setAwayTeamPitchers((prev) =>
        reconcileTeamPitchersWithLineupSnapshot(
          prev,
          nextAwayPlayers,
          lineupSnapshot.away,
          "away",
          getRosterEntityId,
        ),
      );
      setHomeTeamPitchers((prev) =>
        reconcileTeamPitchersWithLineupSnapshot(
          prev,
          nextHomePlayers,
          lineupSnapshot.home,
          "home",
          getRosterEntityId,
        ),
      );
    },
    [
      getLineupStateSnapshot,
      getRosterEntityId,
    ],
  );

  useEffect(() => {
    if (!gameInitialized) return;
    // R3-T0: Also sync during PRE_GAME so pre-game pitcher changes appear in UI
    const lineupSnapshot = getLineupStateSnapshot();
    syncDisplayedRostersToLineupSnapshot(lineupSnapshot);
    console.log("[R3-T0] Synced displayed rosters from lineup snapshot", {
      gamePhase: gameState.gamePhase,
      lineupVersion,
      awayCurrentPitcher: lineupSnapshot.away.currentPitcher?.playerName ?? null,
      homeCurrentPitcher: lineupSnapshot.home.currentPitcher?.playerName ?? null,
    });
  }, [
    gameInitialized,
    gameState.currentPitcherId,
    gameState.gamePhase,
    lineupVersion,
    getLineupStateSnapshot,
    syncDisplayedRostersToLineupSnapshot,
  ]);

  useEffect(() => {
    if (
      closedPitchCountPromptTypeRef.current === "pitching_change" &&
      !pitchCountPrompt
    ) {
      closedPitchCountPromptTypeRef.current = null;
      syncDisplayedRostersToLineupSnapshot(getLineupStateSnapshot());
    }
  }, [
    getLineupStateSnapshot,
    pitchCountPrompt,
    syncDisplayedRostersToLineupSnapshot,
  ]);

  const resolveRosterNameByGameId = useCallback(
    (playerId?: string): string | undefined => {
      if (!playerId) return undefined;
      return rosterNameById.get(playerId);
    },
    [rosterNameById],
  );

  const resolveRosterTeamSide = useCallback(
    (playerId?: string, playerName?: string): "away" | "home" | null => {
      if (!playerId && !playerName) return null;

      const matches = (
        teamPlayers: Player[],
        teamPitchers: Pitcher[],
        team: "away" | "home",
      ) => {
        const playerMatch = teamPlayers.some(
          (player) =>
            (playerId && getRosterEntityId(player, team) === playerId) ||
            (playerName && player.name === playerName),
        );
        if (playerMatch) return true;
        return teamPitchers.some(
          (pitcher) =>
            (playerId && getRosterEntityId(pitcher, team) === playerId) ||
            (playerName && pitcher.name === playerName),
        );
      };

      if (matches(awayTeamPlayers, awayTeamPitchers, "away")) return "away";
      if (matches(homeTeamPlayers, homeTeamPitchers, "home")) return "home";
      return null;
    },
    [
      awayTeamPitchers,
      awayTeamPlayers,
      getRosterEntityId,
      homeTeamPitchers,
      homeTeamPlayers,
    ],
  );

  const resolvePitchingTeamSide = useCallback(
    (playerId?: string, playerName?: string): "away" | "home" | null => {
      if (!playerId && !playerName) return null;

      const snapshot = getLineupStateSnapshot();
      const matchesSnapshotPitcher = (team: "away" | "home") => {
        const currentPitcher = snapshot[team].currentPitcher;
        if (
          (playerId && currentPitcher?.playerId === playerId) ||
          (playerName && currentPitcher?.playerName === playerName)
        ) {
          return true;
        }

        return snapshot[team].lineup.some(
          (player) =>
            player.position === "P" &&
            ((playerId && player.playerId === playerId) ||
              (playerName && player.playerName === playerName)),
        );
      };

      if (matchesSnapshotPitcher("away")) return "away";
      if (matchesSnapshotPitcher("home")) return "home";
      return resolveRosterTeamSide(playerId, playerName);
    },
    [getLineupStateSnapshot, resolveRosterTeamSide],
  );

  const selectedHistoricalTeamSide = useMemo(() => {
    if (!selectedBetweenPlayEvent) return null;
    if (selectedBetweenPlayEvent.type === "pitcher_change") {
      return selectedBetweenPlayEvent.gameState?.halfInning === "TOP"
        ? "home"
        : "away";
    }
    if (
      selectedBetweenPlayEvent.type === "stolen_base" ||
      selectedBetweenPlayEvent.type === "caught_stealing" ||
      selectedBetweenPlayEvent.type === "pickoff" ||
      selectedBetweenPlayEvent.type === "wild_pitch" ||
      selectedBetweenPlayEvent.type === "passed_ball" ||
      selectedBetweenPlayEvent.type === "runner_advance"
    ) {
      return selectedBetweenPlayEvent.gameState?.halfInning === "TOP"
        ? "home"
        : "away";
    }
    if (selectedBetweenPlayEvent.substitution) {
      return (
        resolveRosterTeamSide(
          selectedBetweenPlayEvent.substitution.outPlayerId,
          selectedBetweenPlayEvent.substitution.outPlayerName,
        ) ||
        resolveRosterTeamSide(
          selectedBetweenPlayEvent.substitution.inPlayerId,
          selectedBetweenPlayEvent.substitution.inPlayerName,
        )
      );
    }
    return null;
  }, [resolveRosterTeamSide, selectedBetweenPlayEvent]);

  const historicalLineupOptions = useMemo(() => {
    if (!selectedHistoricalTeamSide) return [];
    const players =
      selectedHistoricalTeamSide === "away" ? awayTeamPlayers : homeTeamPlayers;
    return players
      .map((player) => ({
        id: getRosterEntityId(player, selectedHistoricalTeamSide),
        label: player.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [
    awayTeamPlayers,
    getRosterEntityId,
    homeTeamPlayers,
    selectedHistoricalTeamSide,
  ]);

  const historicalPitcherOptions = useMemo(() => {
    if (!selectedHistoricalTeamSide) return [];
    const pitchers =
      selectedHistoricalTeamSide === "away"
        ? awayTeamPitchers
        : homeTeamPitchers;
    return pitchers
      .map((pitcher) => ({
        id: getRosterEntityId(pitcher, selectedHistoricalTeamSide),
        label: pitcher.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [
    awayTeamPitchers,
    getRosterEntityId,
    homeTeamPitchers,
    selectedHistoricalTeamSide,
  ]);

  const historicalCatcherOptions = useMemo(() => {
    if (!selectedHistoricalTeamSide) return [];
    const players =
      selectedHistoricalTeamSide === "away" ? awayTeamPlayers : homeTeamPlayers;
    return players
      .filter((player) => player.position === "C")
      .map((player) => ({
        id: getRosterEntityId(player, selectedHistoricalTeamSide),
        label: player.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [
    awayTeamPlayers,
    getRosterEntityId,
    homeTeamPlayers,
    selectedHistoricalTeamSide,
  ]);

  const historicalFielderOptions = useMemo(() => {
    if (!selectedHistoricalTeamSide) return [];
    const players =
      selectedHistoricalTeamSide === "away" ? awayTeamPlayers : homeTeamPlayers;
    return players
      .map((player) => ({
        id: getRosterEntityId(player, selectedHistoricalTeamSide),
        label: player.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [
    awayTeamPlayers,
    getRosterEntityId,
    homeTeamPlayers,
    selectedHistoricalTeamSide,
  ]);

  const historicalContextValueOptions = useMemo(() => {
    if (!selectedBetweenPlayEvent?.playerStateChange) return [];
    if (selectedBetweenPlayEvent.playerStateChange.stateType === "mojo") {
      return (
        Object.entries(MOJO_STATES) as Array<
          [string, (typeof MOJO_STATES)[MojoLevel]]
        >
      ).map(([value, state]) => ({
        value,
        label: state.displayName,
      }));
    }
    if (selectedBetweenPlayEvent.playerStateChange.stateType === "injury") {
      return [];
    }
    return Object.entries(FITNESS_STATES).map(([value, state]) => ({
      value,
      label: state.displayName,
    }));
  }, [selectedBetweenPlayEvent]);

  const rebuildPlayLogFromEventLog = useCallback(async () => {
    if (!gameState.gameId) return;
    const header = await getGameHeader(gameState.gameId);
    if (header?.aggregated || header?.isComplete) {
      console.log(
        "[BUG-04] Completed game header detected, keeping play log empty",
      );
      setPlayLogEntries([]);
      return;
    }

    const eventStartTimestamp = header?.date ?? 0;
    const [atBatEvents, betweenPlayEvents] = await Promise.all([
      getGameEvents(gameState.gameId),
      getBetweenPlayEvents(gameState.gameId),
    ]);
    setPlayLogEntries(
      buildPlayLogEntries(
        atBatEvents.filter((event) => event.timestamp >= eventStartTimestamp),
        betweenPlayEvents.filter(
          (event) => event.timestamp >= eventStartTimestamp,
        ),
        resolveRosterNameByGameId,
      ),
    );
  }, [gameState.gameId, resolveRosterNameByGameId]);

  const queuePlayLogRefresh = useCallback(
    (delayMs = 40) => {
      if (playLogRefreshTimeoutRef.current !== null) {
        window.clearTimeout(playLogRefreshTimeoutRef.current);
      }
      playLogRefreshTimeoutRef.current = window.setTimeout(() => {
        playLogRefreshTimeoutRef.current = null;
        void rebuildPlayLogFromEventLog();
      }, delayMs);
    },
    [rebuildPlayLogFromEventLog],
  );

  useEffect(() => {
    rebuildPlayLogFromEventLogRef.current = rebuildPlayLogFromEventLog;
    queuePlayLogRefreshRef.current = queuePlayLogRefresh;
  }, [queuePlayLogRefresh, rebuildPlayLogFromEventLog]);

  const recomputeCommittedManagerWpa = useCallback(
    async (reason: string) => {
      if (!gameState.gameId) return;

      try {
        const nextManagerDecisionState =
          await refreshCurrentGameManagerDecisionState({
            gameId: gameState.gameId,
            awayTeamId,
            homeTeamId,
            awayManagerId,
            homeManagerId,
            managerByTeamId: {
              [awayTeamId]: awayManagerId,
              [homeTeamId]: homeManagerId,
            },
            totalInnings:
              hookTotalInningsRef.current || navigationState?.totalInnings || 9,
          });
        setCommittedManagerDecisions(nextManagerDecisionState.managerDecisions);
      } catch (error) {
        console.error(
          `[Manager WPA] Failed to recompute committed truth layer after ${reason}:`,
          error,
        );
      }
    },
    [
      awayManagerId,
      awayTeamId,
      gameState.gameId,
      homeManagerId,
      homeTeamId,
      hookTotalInningsRef,
      navigationState?.totalInnings,
    ],
  );

  useEffect(() => {
    if (!gameInitialized || !gameState.gameId) {
      setCommittedManagerDecisions([]);
      return;
    }

    let cancelled = false;
    void loadCurrentGame()
      .then((currentGame) => {
        if (cancelled || currentGame?.gameId !== gameState.gameId) {
          return;
        }
        setCommittedManagerDecisions(currentGame.managerDecisions ?? []);
      })
      .catch((error) => {
        console.error(
          "[Manager WPA] Failed to hydrate committed truth layer:",
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [gameInitialized, gameState.gameId]);

  const resolvedCurrentBatterName =
    gameState.currentBatterName ||
    resolveRosterNameByGameId(gameState.currentBatterId) ||
    "BATTER";
  const resolvedCurrentPitcherName =
    gameState.currentPitcherName ||
    resolveRosterNameByGameId(gameState.currentPitcherId) ||
    "PITCHER";

  // T0-08: Derive lineup/bench/bullpen from actual team data (dynamic, not hardcoded)
  const battingTeamPlayersRaw = gameState.isTop
    ? awayTeamPlayers
    : homeTeamPlayers;
  const fieldingTeamPlayersRaw = gameState.isTop
    ? homeTeamPlayers
    : awayTeamPlayers;
  const battingTeamPitchersRaw = gameState.isTop
    ? awayTeamPitchers
    : homeTeamPitchers;
  const runtimeLineupSnapshot = getLineupStateSnapshot();
  const battingTeamSnapshot =
    battingTeam === "away"
      ? runtimeLineupSnapshot.away
      : runtimeLineupSnapshot.home;
  const fieldingTeamPitchersRaw = gameState.isTop
    ? homeTeamPitchers
    : awayTeamPitchers;
  const battingActivePitcher = getPreferredActivePitcher(
    battingTeamPitchersRaw,
  );
  const battingTeamUsesDh = inferTeamUsesDh(
    battingTeamPlayersRaw,
    battingTeamPitchersRaw,
    persistedUseDh ??
      inferSnapshotUsesDh(battingTeamSnapshot) ??
      navigationState?.useDH,
  );

  const currentLineupBase = battingTeamPlayersRaw
    .filter(
      (player) =>
        player.battingOrder !== undefined &&
        !player.isOutOfGame &&
        !shouldHidePitcherFromBattingDisplay(
          player,
          battingActivePitcher,
          battingTeamUsesDh,
        ),
    )
    .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
    .map((p) => ({
      playerId: getRosterEntityId(p, battingTeam),
      name: p.name,
      pos: p.position || "DH",
      battingOrder: p.battingOrder!,
      batting: p.name === resolvedCurrentBatterName,
    }));
  const currentLineup = (() => {
    if (
      battingTeamUsesDh ||
      !battingActivePitcher ||
      currentLineupBase.some((player) => player.pos === "P")
    ) {
      return currentLineupBase;
    }

    const pitcherId = getRosterEntityId(battingActivePitcher, battingTeam);
    if (currentLineupBase.some((player) => player.playerId === pitcherId)) {
      return currentLineupBase;
    }

    const positionCounts = currentLineupBase.reduce<Record<string, number>>(
      (counts, player) => {
        counts[player.pos] = (counts[player.pos] || 0) + 1;
        return counts;
      },
      {},
    );
    let duplicatePositionIndex = -1;
    for (let index = currentLineupBase.length - 1; index >= 0; index -= 1) {
      if ((positionCounts[currentLineupBase[index].pos] || 0) > 1) {
        duplicatePositionIndex = index;
        break;
      }
    }
    const replacementIndex =
      duplicatePositionIndex >= 0
        ? duplicatePositionIndex
        : currentLineupBase.length - 1;
    const nextLineup = [...currentLineupBase];
    nextLineup[replacementIndex] = {
      playerId: pitcherId,
      name: battingActivePitcher.name,
      pos: "P",
      battingOrder: nextLineup[replacementIndex]?.battingOrder ?? 9,
      batting: battingActivePitcher.name === resolvedCurrentBatterName,
    };
    return nextLineup;
  })();

  // GAP-GT-7-B: Batting lineup should render as 9 hitters regardless of DH format.
  const lineupSizeOk = currentLineup.length === 9;
  if (!lineupSizeOk && currentLineup.length > 0) {
    console.warn(
      `[GameTracker] Lineup size ${currentLineup.length} — expected 9 active hitters`,
    );
  }

  // GAP-GT-7-D: Include isOutOfGame players — they display with ❌ so user can see who was used
  const benchPlayerEntries = (() => {
    const lineupIds = new Set(currentLineup.map((player) => player.playerId));
    const seenIds = new Set<string>();
    const entries: BenchPlayer[] = [];

    for (const player of battingTeamPlayersRaw) {
      const playerId = getRosterEntityId(player, battingTeam);
      if (player.battingOrder !== undefined || seenIds.has(playerId)) {
        continue;
      }
      seenIds.add(playerId);
      entries.push({
        id: playerId,
        name: player.name,
        positions: [player.position || "UT"],
        battingHand: player.battingHand as "L" | "R" | "S",
        isUsed: player.isOutOfGame || false,
      });
    }

    for (const pitcher of battingTeamPitchersRaw) {
      const pitcherId = getRosterEntityId(pitcher, battingTeam);
      if (lineupIds.has(pitcherId) || seenIds.has(pitcherId) || pitcher.isOutOfGame) {
        continue;
      }
      seenIds.add(pitcherId);
      entries.push({
        id: pitcherId,
        name: pitcher.name,
        positions: Array.from(new Set([pitcher.secondaryPosition, "P"].filter(Boolean))) as string[],
        battingHand: "R",
        isUsed: false,
      });
    }

    return entries;
  })();

  const fieldingTeamSnapshot =
    fieldingTeam === "away"
      ? runtimeLineupSnapshot.away
      : runtimeLineupSnapshot.home;

  const availablePitchers = (() => {
    return buildAvailablePitchingCandidates({
      fieldingTeam,
      pitchers: fieldingTeamPitchersRaw,
      positionPlayers: fieldingTeamPlayersRaw,
      fieldingSnapshot: fieldingTeamSnapshot,
      currentPitcherId: gameState.currentPitcherId,
      getRosterEntityId,
    }).map((candidate) => ({
      ...candidate,
      fitness: "🟢",
    }));
  })();

  // LineupCard data derived from current team data
  // EXH-036: Use consistent IDs that match playerStateHook registration
  const lineupCardData: LineupPlayer[] = currentLineup.map((player, idx) => ({
    id: player.playerId || getRosterIdFromName(player.name, battingTeam),
    name: player.name,
    position: player.pos,
    battingOrder: idx + 1,
    isCurrentBatter: player.batting,
    battingHand: (battingTeamPlayersRaw.find((p) => p.name === player.name)
      ?.battingHand || "R") as "L" | "R" | "S",
  }));

  const benchCardData: BenchPlayer[] = benchPlayerEntries;

  const bullpenCardData: BullpenPitcher[] = availablePitchers.map(
    (pitcher) => ({
      id: pitcher.id,
      name: pitcher.name,
      throwingHand: pitcher.hand as "L" | "R",
      fitness: "FIT" as const,
      isUsed: false,
      isCurrentPitcher: false,
    }),
  );

  // Derive current pitcher from actual pitcher data
  const currentPitcherLineupEntry = fieldingTeamSnapshot.currentPitcher;
  const rosterMatchedCurrentPitcher =
    fieldingTeamPitchersRaw.find(
      (p) => getRosterEntityId(p, fieldingTeam) === gameState.currentPitcherId,
    );
  const activePitcher =
    rosterMatchedCurrentPitcher ||
    (!gameState.currentPitcherId
      ? fieldingTeamPitchersRaw.find((p) => p.isActive) ||
        fieldingTeamPitchersRaw.find((p) => p.isStarter) ||
        fieldingTeamPitchersRaw[0]
      : undefined);
  const currentPitcherId =
    currentPitcherLineupEntry?.playerId ||
    gameState.currentPitcherId ||
    (activePitcher
      ? getRosterEntityId(activePitcher, fieldingTeam)
      : buildFallbackRuntimePlayerId("pitcher", fieldingTeam));
  const currentPitcherName =
    currentPitcherLineupEntry?.playerName ||
    gameState.currentPitcherName ||
    resolveRosterNameByGameId(currentPitcherId) ||
    activePitcher?.name ||
    "PITCHER";
  const currentPitcherData: BullpenPitcher = {
    id: currentPitcherId,
    name: currentPitcherName,
    throwingHand: (activePitcher?.throwingHand || "R") as "L" | "R",
    fitness: "FIT",
    isCurrentPitcher: true,
  };

  // Field positions (defense) - dynamically built from fielding team's live lineup
  // When isTop = true, home team is fielding; when isTop = false, away team is fielding
  const fieldingTeamPlayers =
    fieldingTeam === "home" ? homeTeamPlayers : awayTeamPlayers;
  const fieldingTeamSnapshot =
    fieldingTeam === "away"
      ? runtimeLineupSnapshot.away
      : runtimeLineupSnapshot.home;

  // GameDiamond removed in Step 1.B (UX-004) — gameDiamondFielders no longer needed.
  // const gameDiamondFielders = useMemo(() => { ... }, [fieldingTeam, fieldingTeamPlayers, getRosterEntityId]);

  // Get current pitcher numbers
  const awayPitcher = awayTeamPitchers.find((p) => p.isActive);
  const homePitcher = homeTeamPitchers.find((p) => p.isActive);

  // Find pitcher numbers from player rosters
  const awayPitcherPlayer = awayTeamPlayers.find(
    (p) => p.name === awayPitcher?.name,
  );
  const homePitcherPlayer = homeTeamPlayers.find(
    (p) => p.name === homePitcher?.name,
  );

  const defensiveAlignmentByPosition = useMemo(() => {
    return buildDefensiveAlignmentByPosition({
      fieldingTeam,
      fieldingTeamPlayers,
      lineupSnapshot: fieldingTeamSnapshot,
      activePitcher,
      currentPitcherId: gameState.currentPitcherId,
      currentPitcherName: gameState.currentPitcherName,
      getRosterEntityId,
    });
  }, [
    activePitcher,
    fieldingTeam,
    fieldingTeamPlayers,
    fieldingTeamSnapshot,
    gameState.currentPitcherId,
    gameState.currentPitcherName,
    getRosterEntityId,
  ]);

  const liveRunnerFielderOptions = useMemo(() => {
    return Object.entries(defensiveAlignmentByPosition)
      .map(([position, defender]) => ({
        id: defender.playerId,
        label: `${position} — ${defender.playerName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [defensiveAlignmentByPosition]);

  const liveRunnerFielderById = useMemo(() => {
    const entries = Object.entries(defensiveAlignmentByPosition).map(
      ([position, defender]) =>
        [
          defender.playerId,
          { position: position as Position, name: defender.playerName },
        ] as const,
    );
    return new Map(entries);
  }, [defensiveAlignmentByPosition]);

  const getPendingAtBatIdentity = useCallback(() => {
    const nextAtBatIndex = atBatSequence + 1;
    return {
      atBatEventIndex: nextAtBatIndex,
      atBatEventId: `${gameState.gameId}_${nextAtBatIndex}`,
    };
  }, [atBatSequence, gameState.gameId]);

  const commitPlateAppearanceAndAppend = useCallback(
    async (action: PlateAppearanceAction) => {
      const atBatIdentity = getPendingAtBatIdentity();
      await commitPlateAppearance(action);
      await appendCommittedAtBatEntry(atBatIdentity.atBatEventId);
      await recomputeCommittedManagerWpa("plate appearance commit");
      return atBatIdentity;
    },
    [
      appendCommittedAtBatEntry,
      commitPlateAppearance,
      getPendingAtBatIdentity,
      recomputeCommittedManagerWpa,
    ],
  );

  const buildFieldingContext = useCallback(
    (atBatIdentity: {
      atBatEventId: string;
      atBatEventIndex: number;
    }): FieldingExtractionContext => ({
      gameId: gameState.gameId,
      defensiveTeamId: gameState.isTop
        ? gameState.homeTeamId
        : gameState.awayTeamId,
      atBatEventId: atBatIdentity.atBatEventId,
      atBatEventIndex: atBatIdentity.atBatEventIndex,
      defendersByPosition: defensiveAlignmentByPosition,
    }),
    [
      defensiveAlignmentByPosition,
      gameState.awayTeamId,
      gameState.gameId,
      gameState.homeTeamId,
      gameState.isTop,
    ],
  );

  const persistFieldingEventsForPlayData = useCallback(
    async (
      playData: PlayData,
      sourceLabel?: string,
      atBatIdentity = getPendingAtBatIdentity(),
    ) => {
      if (playData.type === "walk" || playData.type === "foul_ball") {
        return;
      }

      const fieldingContext = buildFieldingContext(atBatIdentity);
      const fieldingEvents = extractFieldingEvents(playData, fieldingContext);
      for (const fe of fieldingEvents) {
        await logFieldingEvent(fe);
      }
      if (fieldingEvents.length > 0) {
        const contextLabel = sourceLabel ? ` via ${sourceLabel}` : "";
        console.log(
          `[Fielding] Logged ${fieldingEvents.length} fielding event(s)${contextLabel}`,
        );
        pushActivityLog(
          `[Fielding] Logged ${fieldingEvents.length} event(s)${contextLabel}`,
        );
      }
    },
    [buildFieldingContext, getPendingAtBatIdentity, pushActivityLog],
  );

  const persistRunnerOutCredits = useCallback(
    async (
      playData: PlayData,
      credits: FielderCredit[],
      atBatIdentity: { atBatEventId: string; atBatEventIndex: number },
      options?: { recordUserEdit?: boolean },
    ) => {
      if (credits.length === 0) {
        return;
      }

      const fieldingContext = buildFieldingContext(atBatIdentity);
      const startingSequence = extractFieldingEvents(
        playData,
        fieldingContext,
      ).length;
      const supplementalEvents = extractSupplementalRunnerOutFieldingEvents(
        playData,
        credits
          .filter(
            (credit) =>
              credit.putoutBy in POSITION_NUMBER &&
              credit.assistBy.every((position) => position in POSITION_NUMBER),
          )
          .map((credit) => ({
            putoutBy: credit.putoutBy as Position,
            assistBy: credit.assistBy as Position[],
          })),
        fieldingContext,
        startingSequence,
      );

      const enrichmentUpdate = {
        fieldingSequence: supplementalEvents.map(
          (event) =>
            POSITION_NUMBER[event.position as keyof typeof POSITION_NUMBER],
        ),
        putouts: credits
          .filter((credit) => credit.putoutBy in POSITION_NUMBER)
          .map(
            (credit) =>
              POSITION_NUMBER[credit.putoutBy as keyof typeof POSITION_NUMBER],
          ),
        assists: credits.flatMap((credit) =>
          credit.assistBy
            .filter((position) => position in POSITION_NUMBER)
            .map(
              (position) =>
                POSITION_NUMBER[position as keyof typeof POSITION_NUMBER],
            ),
        ),
      } as NonNullable<
        import("../../../utils/eventLog").AtBatEvent["enrichment"]
      >;

      if (options?.recordUserEdit) {
        const existingAtBat = await getAtBatEvent(atBatIdentity.atBatEventId);
        const existingFieldingEvents = await getFieldingEventsForAtBat(
          atBatIdentity.atBatEventId,
        );
        if (existingAtBat) {
          const timestamp = Date.now();
          const nextVersion = (existingAtBat.version ?? 1) + 1;
          await updateAtBatEventWithFieldingSync(
            atBatIdentity.atBatEventId,
            {
              enrichment: enrichmentUpdate,
              version: nextVersion,
              editHistory: [
                {
                  field: "enrichment.fieldingSequence",
                  oldValue: existingAtBat.enrichment?.fieldingSequence ?? null,
                  newValue: enrichmentUpdate.fieldingSequence,
                  timestamp,
                },
                {
                  field: "enrichment.putouts",
                  oldValue: existingAtBat.enrichment?.putouts ?? null,
                  newValue: enrichmentUpdate.putouts,
                  timestamp,
                },
                {
                  field: "enrichment.assists",
                  oldValue: existingAtBat.enrichment?.assists ?? null,
                  newValue: enrichmentUpdate.assists,
                  timestamp,
                },
              ],
            },
            [...existingFieldingEvents, ...supplementalEvents],
          );
        }
      } else {
        for (const event of supplementalEvents) {
          await logFieldingEvent(event);
        }

        await updateAtBatEvent(atBatIdentity.atBatEventId, {
          enrichment: enrichmentUpdate,
        });
      }

      setEnrichmentCache((prev) => ({
        ...prev,
        [atBatIdentity.atBatEventId]: {
          ...(prev[atBatIdentity.atBatEventId] || {}),
          ...enrichmentUpdate,
        },
      }));

      pushActivityLog(
        `[Fielding] Logged ${supplementalEvents.length} runner-out credit event(s)`,
      );
    },
    [buildFieldingContext, pushActivityLog],
  );

  const buildPlayDataFromAtBatEvent = useCallback(
    (
      atBatEvent: AtBatEvent,
      overrides?: {
        enrichment?: Partial<NonNullable<AtBatEvent["enrichment"]>>;
        result?: AtBatEvent["result"];
        runnerOutcomes?: AtBatEvent["runnerOutcomes"];
        batterReachedOnError?: AtBatEvent["batterReachedOnError"];
        batterErrorType?: AtBatEvent["batterErrorType"];
        batterErrorChargedToPosition?: AtBatEvent["batterErrorChargedToPosition"];
      },
    ): PlayData | null => {
      const enrichment = {
        ...(atBatEvent.enrichment || {}),
        ...(overrides?.enrichment || {}),
      };
      const resolvedResult = overrides?.result ?? atBatEvent.result;
      const resolvedRunnerOutcomes =
        overrides?.runnerOutcomes ?? atBatEvent.runnerOutcomes;
      const resolvedBatterReachedOnError =
        overrides && "batterReachedOnError" in overrides
          ? overrides.batterReachedOnError
          : atBatEvent.batterReachedOnError;
      const resolvedBatterErrorType =
        overrides && "batterErrorType" in overrides
          ? overrides.batterErrorType
          : atBatEvent.batterErrorType;
      const resolvedBatterErrorChargedToPosition =
        overrides && "batterErrorChargedToPosition" in overrides
          ? overrides.batterErrorChargedToPosition
          : atBatEvent.batterErrorChargedToPosition;
      const ballLocation = enrichment.fieldLocation
        ? { x: enrichment.fieldLocation.x, y: enrichment.fieldLocation.y }
        : undefined;
      // Contact type (normal/weak/hard/bloop/bunt) stored in enrichment.exitType
      // Trajectory is now inferred from result type (GO→ground, FO→fly, etc.)
      // Legacy values (ground_ball, line_drive) are mapped for backward compat
      const exitType =
        enrichment.exitType === "ground_ball"
          ? "Ground"
          : enrichment.exitType === "line_drive"
            ? "Line Drive"
            : enrichment.exitType === "fly_ball"
              ? "Fly Ball"
              : enrichment.exitType === "popup"
                ? "Pop Up"
                : undefined;
      const common = {
        fieldingSequence: enrichment.fieldingSequence || [],
        extraGemCreditPositions:
          ((enrichment as Record<string, unknown>).extraGemCreditPositions as
            | number[]
            | undefined) || [],
        ballLocation,
        spraySector: enrichment.fieldLocation?.zone,
        exitType,
        persistedRunnerOutcomes: resolvedRunnerOutcomes,
        batterReachedOnError: resolvedBatterReachedOnError,
        batterErrorType: resolvedBatterErrorType,
        batterErrorChargedToPosition: resolvedBatterErrorChargedToPosition,
        savedRun: !!enrichment.savedRun,
        playDifficulty: mapFieldingPlayTypeToPlayDifficulty(
          enrichment.fieldingPlayType as FieldingPlayTypeValue | undefined,
        ),
        fieldingPlayType: enrichment.fieldingPlayType as
          | FieldingPlayTypeValue
          | undefined,
      } as const;

      if (["1B", "2B", "3B", "GRD", "ITPHR"].includes(resolvedResult)) {
        return {
          ...common,
          type: "hit",
          hitType: (resolvedResult === "GRD"
            ? "2B"
            : resolvedResult) as PlayData["hitType"],
        };
      }
      if (resolvedResult === "HR") {
        return {
          ...common,
          type: "hr",
          hitType: "HR",
        };
      }
      if (
        [
          "GO",
          "FO",
          "FLO",
          "LO",
          "PO",
          "DP",
          "TP",
          "FC",
          "SF",
          "SAC",
          "K",
          "Kc",
        ].includes(resolvedResult)
      ) {
        return {
          ...common,
          type: "out",
          outType: resolvedResult as PlayData["outType"],
        };
      }
      if (resolvedResult === "E") {
        return {
          ...common,
          type: "error",
          errorFielder: enrichment.errors?.[0]?.position,
          errorType:
            enrichment.errors?.[0]?.type?.toUpperCase() as PlayData["errorType"],
        };
      }
      return null;
    },
    [],
  );

  const buildHistoricalDefensiveAlignment = useCallback(
    async (atBatEvent: AtBatEvent, linkedFieldingEvents: FieldingEvent[]) => {
      const header = await getGameHeader(atBatEvent.gameId);
      const fallbackAlignment = linkedFieldingEvents.reduce<
        Partial<Record<Position, { playerId: string; playerName: string }>>
      >((acc, event) => {
        acc[event.position] = {
          playerId: event.playerId,
          playerName: event.playerName,
        };
        return acc;
      }, {});

      if (!header?.startingLineups) {
        return fallbackAlignment;
      }

      const toSlots = (
        players: NonNullable<GameHeader["startingLineups"]>["away"],
      ): HistoricalLineupSlot[] =>
        players
          .slice()
          .sort((a, b) => a.battingOrder - b.battingOrder)
          .map((player) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            position: player.position as Position,
          }));

      let awayLineup = toSlots(header.startingLineups.away);
      let homeLineup = toSlots(header.startingLineups.home);
      let awayPitcher: HistoricalPitcher | null =
        header.startingPitchers?.away || null;
      let homePitcher: HistoricalPitcher | null =
        header.startingPitchers?.home || null;
      const awayBenchIds = new Set(
        (header.benchRosters?.away || []).map((player) => player.playerId),
      );
      const homeBenchIds = new Set(
        (header.benchRosters?.home || []).map((player) => player.playerId),
      );
      const betweenPlayEvents = await getBetweenPlayEvents(atBatEvent.gameId);

      const findTeamSide = (playerId?: string) => {
        if (!playerId) return null;
        if (
          awayLineup.some((player) => player.playerId === playerId) ||
          awayBenchIds.has(playerId) ||
          awayPitcher?.playerId === playerId
        )
          return "away" as const;
        if (
          homeLineup.some((player) => player.playerId === playerId) ||
          homeBenchIds.has(playerId) ||
          homePitcher?.playerId === playerId
        )
          return "home" as const;
        return null;
      };

      betweenPlayEvents
        .filter(
          (event) =>
            event.eventIndex < atBatEvent.eventIndex ||
            (event.eventIndex === atBatEvent.eventIndex &&
              event.timestamp <= atBatEvent.timestamp),
        )
        .forEach((event) => {
          if (event.type === "substitution" && event.substitution) {
            const substitution = event.substitution;
            const side =
              findTeamSide(substitution.outPlayerId) ||
              findTeamSide(substitution.inPlayerId);
            if (!side) return;
            const lineup = side === "away" ? awayLineup : homeLineup;
            const lineupIndex = lineup.findIndex(
              (player) => player.playerId === substitution.outPlayerId,
            );
            if (lineupIndex >= 0) {
              lineup[lineupIndex] = {
                playerId: substitution.inPlayerId,
                playerName:
                  substitution.inPlayerName || substitution.inPlayerId,
                position: (substitution.inPosition ||
                  substitution.outPosition ||
                  lineup[lineupIndex].position) as Position,
              };
            }
            return;
          }

          if (event.type === "position_change" && event.substitution) {
            const substitution = event.substitution;
            const side =
              findTeamSide(substitution.inPlayerId) ||
              findTeamSide(substitution.outPlayerId);
            if (!side) return;
            const lineup = side === "away" ? awayLineup : homeLineup;
            const lineupIndex = lineup.findIndex(
              (player) => player.playerId === substitution.inPlayerId,
            );
            if (lineupIndex >= 0) {
              lineup[lineupIndex] = {
                ...lineup[lineupIndex],
                position: (substitution.inPosition ||
                  lineup[lineupIndex].position) as Position,
              };
            }
            return;
          }

          if (event.type === "pitcher_change" && event.pitcherChange) {
            const side =
              event.gameState?.halfInning === "TOP" ? "home" : "away";
            const nextPitcher = {
              playerId: event.pitcherChange.incomingPitcherId,
              playerName:
                event.pitcherChange.incomingPitcherName ||
                event.pitcherChange.incomingPitcherId,
            };
            if (side === "away") awayPitcher = nextPitcher;
            else homePitcher = nextPitcher;
          }
        });

      const defensiveSide = atBatEvent.halfInning === "TOP" ? "home" : "away";
      const alignment = (
        defensiveSide === "away" ? awayLineup : homeLineup
      ).reduce<
        Partial<Record<Position, { playerId: string; playerName: string }>>
      >((acc, player) => {
        acc[player.position] = {
          playerId: player.playerId,
          playerName: player.playerName,
        };
        return acc;
      }, {});
      const activePitcher =
        defensiveSide === "away" ? awayPitcher : homePitcher;
      if (activePitcher) {
        alignment.P = {
          playerId: activePitcher.playerId,
          playerName: activePitcher.playerName,
        };
      }

      return {
        ...alignment,
        ...fallbackAlignment,
      };
    },
    [],
  );

  const processCommittedAtBatAutoDetections = useCallback(
    async (committedEvent: AtBatEvent) => {
      if (processedAutoFameAtBatIdsRef.current.has(committedEvent.eventId)) {
        return;
      }
      processedAutoFameAtBatIdsRef.current.add(committedEvent.eventId);

      const scheduledInnings = hookTotalInningsRef.current || 9;
      const gameEvents = await getGameEvents(committedEvent.gameId);
      const currentIndex = gameEvents.findIndex(
        (event) => event.eventId === committedEvent.eventId,
      );
      const previousAtBat =
        currentIndex > 0 ? gameEvents[currentIndex - 1] : null;
      const linkedFieldingEvents = await getFieldingEventsForAtBat(
        committedEvent.eventId,
      );
      const defendersByCode = await buildHistoricalDefensiveAlignment(
        committedEvent,
        linkedFieldingEvents,
      );
      const defendersByPosition = Object.entries(defendersByCode).reduce<
        Record<number, DefensivePlayerIdentity>
      >((acc, [position, defender]) => {
        const positionNumber =
          POSITION_NUMBER[position as keyof typeof POSITION_NUMBER];
        if (positionNumber && defender) {
          acc[positionNumber] = defender;
        }
        return acc;
      }, {});

      recordDetectedFameEvents([
        ...detectTriplePlayEvents(committedEvent, defendersByPosition),
        ...detectBackToBackHREvents(committedEvent, previousAtBat),
        ...detectWalkOffHREvent(committedEvent, scheduledInnings),
      ]);

      const startContext = buildSaveAppearanceStartContextFromAtBat(
        committedEvent,
        scheduledInnings,
      );
      const updateContext = buildSaveAppearanceUpdateContextFromAtBat(
        committedEvent,
        scheduledInnings,
      );
      const activeAppearance =
        activeSaveAppearancesRef.current[startContext.teamSide];

      if (!activeAppearance || activeAppearance.pitcherId !== committedEvent.pitcherId) {
        if (activeAppearance) {
          completedSaveAppearancesRef.current.push(activeAppearance);
        }
        activeSaveAppearancesRef.current[startContext.teamSide] =
          createSaveAppearanceSnapshot(
            committedEvent.pitcherId,
            committedEvent.pitcherName,
            startContext,
          );
      }

      activeSaveAppearancesRef.current[startContext.teamSide] =
        updateSaveAppearanceSnapshot(
          activeSaveAppearancesRef.current[startContext.teamSide]!,
          updateContext,
        );
    },
    [buildHistoricalDefensiveAlignment, hookTotalInningsRef, recordDetectedFameEvents],
  );
  processCommittedAtBatAutoDetectionsRef.current =
    processCommittedAtBatAutoDetections;

  const buildFieldingSyncEventsForSequenceEdit = useCallback(
    async (
      atBatEvent: AtBatEvent,
      overrides: {
        enrichment?: Partial<NonNullable<AtBatEvent["enrichment"]>>;
        result?: AtBatEvent["result"];
        runnerOutcomes?: AtBatEvent["runnerOutcomes"];
        batterReachedOnError?: AtBatEvent["batterReachedOnError"];
        batterErrorType?: AtBatEvent["batterErrorType"];
        batterErrorChargedToPosition?: AtBatEvent["batterErrorChargedToPosition"];
      },
    ) => {
      const linkedFieldingEvents = await getFieldingEventsForAtBat(
        atBatEvent.eventId,
      );
      const defendersByPosition = await buildHistoricalDefensiveAlignment(
        atBatEvent,
        linkedFieldingEvents,
      );
      const fieldingContext: FieldingExtractionContext = {
        gameId: atBatEvent.gameId,
        defensiveTeamId: atBatEvent.pitcherTeamId,
        atBatEventId: atBatEvent.eventId,
        atBatEventIndex: atBatEvent.eventIndex,
        defendersByPosition,
      };
      const previousPlayData = buildPlayDataFromAtBatEvent(atBatEvent);
      const nextPlayData = buildPlayDataFromAtBatEvent(atBatEvent, overrides);
      const previousBaseCount = previousPlayData
        ? extractFieldingEvents(previousPlayData, fieldingContext).length
        : 0;
      const nextBaseEvents = nextPlayData
        ? extractFieldingEvents(nextPlayData, fieldingContext)
        : [];

      const preservedSupplementals = linkedFieldingEvents
        .filter((event) => event.sequence >= previousBaseCount)
        .map((event, index) => {
          const sequence = nextBaseEvents.length + index;
          return {
            ...event,
            sequence,
            fieldingEventId: `${atBatEvent.gameId}_${atBatEvent.eventIndex}_fe_${sequence}`,
          };
        });

      return [...nextBaseEvents, ...preservedSupplementals];
    },
    [buildHistoricalDefensiveAlignment, buildPlayDataFromAtBatEvent],
  );

  const resolveChargedPositionPlayerId = useCallback(
    async (
      atBatEvent: AtBatEvent,
      chargedPosition: number | null | undefined,
    ) => {
      if (
        typeof chargedPosition !== "number" ||
        !(chargedPosition in POSITION_NUMBER_TO_CODE)
      ) {
        return null;
      }
      const linkedFieldingEvents = await getFieldingEventsForAtBat(
        atBatEvent.eventId,
      );
      const defendersByPosition = await buildHistoricalDefensiveAlignment(
        atBatEvent,
        linkedFieldingEvents,
      );
      return resolveChargedPlayerIdFromDefensiveAlignment(
        chargedPosition,
        defendersByPosition,
      );
    },
    [buildHistoricalDefensiveAlignment],
  );

  const resolveRunnerOutcomeErrorPlayerId = useCallback(
    async (
      atBatEvent: AtBatEvent,
      outcome:
        | Pick<
            NonNullable<AtBatEvent["runnerOutcomes"]>[number],
            "errorChargedTo"
          >
        | null
        | undefined,
    ) => {
      return resolveChargedPositionPlayerId(
        atBatEvent,
        outcome?.errorChargedTo,
      );
    },
    [resolveChargedPositionPlayerId],
  );

  const resolveBatterOutcomeErrorPlayerId = useCallback(
    async (atBatEvent: AtBatEvent) => {
      if (!atBatEvent.batterReachedOnError) {
        return null;
      }

      return resolveChargedPositionPlayerId(
        atBatEvent,
        atBatEvent.batterErrorChargedToPosition,
      );
    },
    [resolveChargedPositionPlayerId],
  );

  const appendModifierToAtBatEvent = useCallback(
    async (atBatEventId: string, modifier: AtBatModifierValue) => {
      const existingAtBat = await getAtBatEvent(atBatEventId);
      if (!existingAtBat) {
        return null;
      }

      const existingModifiers = existingAtBat.enrichment?.modifiers || [];
      if (existingModifiers.includes(modifier)) {
        return existingAtBat;
      }

      const nextModifiers = [...existingModifiers, modifier];
      const timestamp = Date.now();
      await updateAtBatEvent(atBatEventId, {
        enrichment: {
          modifiers: nextModifiers,
        },
        version: (existingAtBat.version ?? 1) + 1,
        editHistory: [
          {
            field: "enrichment.modifiers",
            oldValue: existingModifiers,
            newValue: nextModifiers,
            timestamp,
          },
        ],
      });

      setEnrichmentCache((prev) => ({
        ...prev,
        [atBatEventId]: {
          ...(prev[atBatEventId] || {}),
          modifiers: nextModifiers,
        },
      }));

      return {
        ...existingAtBat,
        enrichment: {
          ...(existingAtBat.enrichment || {}),
          modifiers: nextModifiers,
        },
      };
    },
    [],
  );

  // Initialize game with lineup data on mount
  // FIX: BUG-007 - Try loading existing game first, only create new if none found
  // This ensures each batter has a unique ID and stats are tracked separately
  const initInProgressRef = useRef(false);
  const generatedExhibitionGameIdRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      generatedExhibitionGameIdRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (gameInitialized || initInProgressRef.current || missingLaunchStateMessage) return;
    initInProgressRef.current = true;
    let cancelled = false;

    const initializeOrLoadGame = async () => {
      try {
        // BUG-04: Clear stale play log before loading/creating a game.
        setPlayLogEntries([]);
        setMissingLaunchStateMessage(null);

        // Try to load existing game first (handles page refresh)
        // R2-7: When navigationState is present, user clicked START GAME from setup —
        // skip loading the old game entirely so the new lineup from nav state is used.
        const isFreshStart = isFreshNavigation;
        if (!isFreshStart) {
          const hasExistingGame = await loadExistingGame({
            preferSnapshot: true,
          });
          if (cancelled) return;

          if (hasExistingGame) {
            console.log("[GameTracker] Loaded existing game from IndexedDB");
            // R3: Extract persisted DH flags from the snapshot before syncing rosters
            const restoredSnapshot = getLineupStateSnapshot();
            const restoredUseDh =
              restoredSnapshot.awayUsesDh ??
              restoredSnapshot.homeUsesDh ??
              inferSnapshotUsesDh(restoredSnapshot.away) ??
              inferSnapshotUsesDh(restoredSnapshot.home);
            if (restoredUseDh != null) {
              setPersistedUseDh(restoredUseDh);
            }
            syncDisplayedRostersToLineupSnapshot(restoredSnapshot);
            setGameInitialized(true);
            return;
          }
        }

        const missingLaunchState = getMissingGameTrackerLaunchStateMessage(
          navigationState,
        );
        if (missingLaunchState) {
          console.error(
            "[GameTracker] Missing launch roster state; blocking new game initialization.",
            { missingLaunchState },
          );
          if (!cancelled) {
            setMissingLaunchStateMessage(missingLaunchState);
          }
          return;
        }

        // No existing game found - create new one
        console.log(
          "[GameTracker] No existing game found, initializing new game",
        );

        const awayUsesDh = inferTeamUsesDh(
          awayTeamPlayers,
          awayTeamPitchers,
          navigationState?.useDH,
        );
        const homeUsesDh = inferTeamUsesDh(
          homeTeamPlayers,
          homeTeamPitchers,
          navigationState?.useDH,
        );
        const awayActivePitcher = getPreferredActivePitcher(awayTeamPitchers);
        const homeActivePitcher = getPreferredActivePitcher(homeTeamPitchers);

        // Convert roster to lineup format required by initializeGame
        const awayLineup = awayTeamPlayers
          .filter(
            (player) =>
              player.battingOrder &&
              player.position &&
              !shouldHidePitcherFromBattingDisplay(
                player,
                awayActivePitcher,
                awayUsesDh,
              ),
          )
          .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
          .map((p) => ({
            playerId: getRosterEntityId(p, "away"),
            playerName: getCanonicalRosterName(p),
            position: p.position!, // Safe - filtered above
          }));

        const homeLineup = homeTeamPlayers
          .filter(
            (player) =>
              player.battingOrder &&
              player.position &&
              !shouldHidePitcherFromBattingDisplay(
                player,
                homeActivePitcher,
                homeUsesDh,
              ),
          )
          .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
          .map((p) => ({
            playerId: getRosterEntityId(p, "home"),
            playerName: getCanonicalRosterName(p),
            position: p.position!, // Safe - filtered above
          }));

        // MAJ-09: Extract bench players (players without batting order = not in starting lineup)
        const awayStarterIds = new Set(awayLineup.map((p) => p.playerId));
        const awayActivePitcherId = awayActivePitcher
          ? getRosterEntityId(awayActivePitcher, "away")
          : null;
        const awayBenchPosition = awayTeamPlayers
          .filter((p) => !awayStarterIds.has(getRosterEntityId(p, "away")))
          .filter((p) => getRosterEntityId(p, "away") !== awayActivePitcherId)
          .filter((p) => !p.isOutOfGame)
          .map((p) => ({
            playerId: getRosterEntityId(p, "away"),
            playerName: getCanonicalRosterName(p),
            positions: [
              p.position ||
                (awayTeamPitchers.some(
                  (pitcher) =>
                    getRosterEntityId(pitcher, "away") ===
                      getRosterEntityId(p, "away") || pitcher.name === p.name,
                )
                  ? "P"
                  : "DH"),
            ].filter(Boolean),
          }));
        // R3-R7: Include bench pitchers (from pitcher roster, not in starting lineup)
        const awayBenchPitchers = awayTeamPitchers
          .filter((p) => !p.isActive && !p.isOutOfGame)
          .filter((p) => !awayStarterIds.has(getRosterEntityId(p, "away")))
          .map((p) => ({
            playerId: getRosterEntityId(p, "away"),
            playerName: p.name,
            positions: ["P"] as string[],
          }));
        const awayBenchSeenIds = new Set<string>();
        const awayBench = [...awayBenchPosition, ...awayBenchPitchers].filter((p) => {
          if (awayBenchSeenIds.has(p.playerId)) return false;
          awayBenchSeenIds.add(p.playerId);
          return true;
        });

        const homeStarterIds = new Set(homeLineup.map((p) => p.playerId));
        const homeActivePitcherId = homeActivePitcher
          ? getRosterEntityId(homeActivePitcher, "home")
          : null;
        const homeBenchPosition = homeTeamPlayers
          .filter((p) => !homeStarterIds.has(getRosterEntityId(p, "home")))
          .filter((p) => getRosterEntityId(p, "home") !== homeActivePitcherId)
          .filter((p) => !p.isOutOfGame)
          .map((p) => ({
            playerId: getRosterEntityId(p, "home"),
            playerName: getCanonicalRosterName(p),
            positions: [
              p.position ||
                (homeTeamPitchers.some(
                  (pitcher) =>
                    getRosterEntityId(pitcher, "home") ===
                      getRosterEntityId(p, "home") || pitcher.name === p.name,
                )
                  ? "P"
                  : "DH"),
            ].filter(Boolean),
          }));
        // R3-R7: Include bench pitchers
        const homeBenchPitchers = homeTeamPitchers
          .filter((p) => !p.isActive && !p.isOutOfGame)
          .filter((p) => !homeStarterIds.has(getRosterEntityId(p, "home")))
          .map((p) => ({
            playerId: getRosterEntityId(p, "home"),
            playerName: p.name,
            positions: ["P"] as string[],
          }));
        const homeBenchSeenIds = new Set<string>();
        const homeBench = [...homeBenchPosition, ...homeBenchPitchers].filter((p) => {
          if (homeBenchSeenIds.has(p.playerId)) return false;
          homeBenchSeenIds.add(p.playerId);
          return true;
        });

        const lineupSnapshotGeneratedAt = Date.now();
        const modeContext =
          toOptimalLineupModeContext(effectiveCompetitionType);
        const awayCandidates = rosterPlayersToOptimalCandidates(
          awayTeamPlayers,
          "away",
          getRosterEntityId,
          getCanonicalRosterName,
        );
        const homeCandidates = rosterPlayersToOptimalCandidates(
          homeTeamPlayers,
          "home",
          getRosterEntityId,
          getCanonicalRosterName,
        );
        const optimalLineupSnapshots: GameLockLineupSnapshots = {
          away:
            cloneOptimalLineupSnapshot(navigationState?.optimalLineupSnapshots?.away) ??
            buildOptimalLineupSnapshot({
              teamId: awayTeamId,
              mode: modeContext,
              instanceId: effectiveCompetitionId,
              opposingPitcherHand: normalizePitcherHandForOptimalLineup(homePitcher),
              candidates: awayCandidates,
              dhEnabled: awayUsesDh,
              generatedAt: lineupSnapshotGeneratedAt,
              generatedFrom: "game_lock",
              sourceConfidence: "fallback",
            }),
          home:
            cloneOptimalLineupSnapshot(navigationState?.optimalLineupSnapshots?.home) ??
            buildOptimalLineupSnapshot({
              teamId: homeTeamId,
              mode: modeContext,
              instanceId: effectiveCompetitionId,
              opposingPitcherHand: normalizePitcherHandForOptimalLineup(awayPitcher),
              candidates: homeCandidates,
              dhEnabled: homeUsesDh,
              generatedAt: lineupSnapshotGeneratedAt,
              generatedFrom: "game_lock",
              sourceConfidence: "fallback",
            }),
        };
        const chosenLineupSnapshots: GameLockLineupSnapshots = {
          away: buildLineupSnapshotFromSlots({
            teamId: awayTeamId,
            mode: modeContext,
            instanceId: effectiveCompetitionId,
            opposingPitcherHand: normalizePitcherHandForOptimalLineup(homePitcher),
            candidates: awayCandidates,
            dhEnabled: awayUsesDh,
            generatedAt: lineupSnapshotGeneratedAt,
            slots: lineupToOptimalSlots(awayLineup),
          }),
          home: buildLineupSnapshotFromSlots({
            teamId: homeTeamId,
            mode: modeContext,
            instanceId: effectiveCompetitionId,
            opposingPitcherHand: normalizePitcherHandForOptimalLineup(awayPitcher),
            candidates: homeCandidates,
            dhEnabled: homeUsesDh,
            generatedAt: lineupSnapshotGeneratedAt,
            slots: lineupToOptimalSlots(homeLineup),
          }),
        };

        console.log("[GameTracker] Initializing game with lineups:", {
          away: awayLineup.map((p) => p.playerName),
          home: homeLineup.map((p) => p.playerName),
          awayBench: awayBench.map((p) => p.playerName),
          homeBench: homeBench.map((p) => p.playerName),
        });

        if (generatedExhibitionGameIdRef.current === null) {
          generatedExhibitionGameIdRef.current = `game-${Date.now()}`;
        }
        const nextGameId =
          effectiveCompetitionType === "exhibition"
            ? generatedExhibitionGameIdRef.current
            : gameId || generatedExhibitionGameIdRef.current;

        await initializeGame({
          gameId: nextGameId,
          seasonId: effectiveSeasonId,
          statsScopeId: effectiveStatsScopeId || effectiveSeasonId,
          competitionType: effectiveCompetitionType,
          competitionId: effectiveCompetitionId,
          competitionName: effectiveCompetitionName,
          awayTeamId: awayTeamId,
          awayTeamName: awayTeamName,
          homeTeamId: homeTeamId,
          homeTeamName: homeTeamName,
          awayLineup,
          homeLineup,
          awayBench,
          homeBench,
          optimalLineupSnapshots,
          chosenLineupSnapshots,
          awayStartingPitcherId: awayPitcher
            ? getRosterEntityId(awayPitcher, "away")
            : buildFallbackRuntimePlayerId("pitcher", "away"),
          awayStartingPitcherName:
            getCanonicalRosterName(awayPitcher) || "Pitcher",
          homeStartingPitcherId: homePitcher
            ? getRosterEntityId(homePitcher, "home")
            : buildFallbackRuntimePlayerId("pitcher", "home"),
          homeStartingPitcherName:
            getCanonicalRosterName(homePitcher) || "Pitcher",
          // T0-01: Pass total innings for auto game-end detection (default 9 for exhibition)
          totalInnings: navigationState?.totalInnings || 9,
          extraInningRunner: navigationState?.extraInningRunner ?? false,
          extraInningRunnerDelay: navigationState?.extraInningRunnerDelay ?? 1,
          seasonNumber: effectiveSeasonNumber,
          stadiumName: resolvedStadiumName,
          // Layer 1B: Context snapshot config
          franchiseId: effectiveFranchiseId,
          scheduleGameId: effectiveScheduleGameId,
          leagueId: effectiveLeagueId || "sml",
          liveBeatReporterEnabled: navigationState?.liveBeatReporterEnabled,
          postGameColumnsEnabled: navigationState?.postGameColumnsEnabled,
          awayRecord: (() => {
            const [w, l] = awayRecord.split("-").map(Number);
            return { w: w || 0, l: l || 0 };
          })(),
          homeRecord: (() => {
            const [w, l] = homeRecord.split("-").map(Number);
            return { w: w || 0, l: l || 0 };
          })(),
          playoffSeriesId: effectivePlayoffSeriesId ?? undefined,
          playoffGameNumber: effectivePlayoffGameNumber ?? undefined,
          playoffId: effectivePlayoffId ?? undefined,
          playoffRound: effectivePlayoffRound,
          isEliminationGame: effectiveIsEliminationGame,
          isClinchGame: effectiveIsClinchGame,
        });

        // Layer 1C: Snapshot starting lineups for GameRecord archive
        startingLineupsRef.current = captureStartingLineups(
          awayLineup,
          homeLineup,
        );

        // R3: Update URL to match runtime gameId so refresh can find the snapshot
        if (effectiveCompetitionType === "exhibition" && nextGameId !== gameId) {
          window.history.replaceState(null, "", `/game-tracker/${nextGameId}`);
        }

        if (!cancelled) {
          setGameInitialized(true);
        }
      } catch (err) {
        console.error("[GameTracker] Failed to initialize/load game:", err);
        // Fail-open so a transient persistence error cannot black-screen the UI.
        if (!cancelled) {
          setGameInitialized(true);
        }
      } finally {
        initInProgressRef.current = false;
      }
    };

    initializeOrLoadGame();
    return () => {
      cancelled = true;
      initInProgressRef.current = false;
    };
  }, [
    effectiveCompetitionId,
    effectiveCompetitionName,
    effectiveCompetitionType,
    effectiveFranchiseId,
    effectiveIsClinchGame,
    effectiveIsEliminationGame,
    effectiveLeagueId,
    effectivePlayoffGameNumber,
    effectivePlayoffId,
    effectivePlayoffRound,
    effectivePlayoffSeriesId,
    effectiveScheduleGameId,
    effectiveSeasonId,
    effectiveSeasonNumber,
    effectiveStatsScopeId,
    gameId,
    gameInitialized,
    getCanonicalRosterName,
    getRosterEntityId,
    homePitcher,
    homeTeamId,
    homeTeamName,
    homeTeamPlayers,
    initializeGame,
    loadExistingGame,
    navigationState,
    navigationState?.franchiseId,
    navigationState?.optimalLineupSnapshots,
    navigationState?.seasonNumber,
    navigationState?.totalInnings,
    selectedStadium,
    isFreshNavigation,
    missingLaunchStateMessage,
    syncDisplayedRostersToLineupSnapshot,
    getLineupStateSnapshot,
    awayPitcher,
    awayTeamId,
    awayTeamName,
    awayTeamPlayers,
  ]);

  // EXH-036: Register players with playerStateHook for mojo/fitness tracking
  // This runs once after game is initialized to set up all players with default states
  useEffect(() => {
    if (!gameInitialized) return;
    let cancelled = false;

    const registerPlayersWithSnapshots = async () => {
      // Load mojo/fitness from snapshots for elimination games (inter-game persistence per §8)
      let mojoFitnessMap: Map<
        string,
        { mojoLevel: MojoLevel; fitnessState: FitnessState }
      > | null = null;
      if (effectiveGameMode === "elimination" && effectiveEliminationId) {
        try {
          const { loadMojoFitnessSnapshots } =
            await import("../../../utils/mojoFitnessStorage");
          const snapshots = await loadMojoFitnessSnapshots(
            effectiveEliminationId,
          );
          if (cancelled) return;
          mojoFitnessMap = new Map(
            snapshots.map((s) => [
              s.playerId,
              { mojoLevel: s.mojoLevel, fitnessState: s.fitnessState },
            ]),
          );
          console.log(
            `[Elimination] Loaded mojo/fitness snapshots for ${snapshots.length} players`,
          );
        } catch (err) {
          console.error(
            "[Elimination] Failed to load mojo/fitness snapshots:",
            err,
          );
        }
      }

      if (cancelled) return;

      // R3-T0: Use restored mojo/fitness from persisted game state as fallback
      const restoredMF = restoredMojoFitness;
      const shouldApplyRestoredToExisting =
        !!restoredMF &&
        lastAppliedRestoredMojoFitnessRef.current !== restoredMF;

      // Register all away team batters
      // Step 0: Pass real traits and age from League Builder data (no longer hardcoded)
      awayTeamPlayers.forEach((player) => {
        const playerId = getRosterEntityId(player, "away");
        if (!playerStateHook.getPlayer(playerId)) {
          const traits = [player.trait1, player.trait2].filter(
            (t): t is string => !!t,
          );
          const snapshot = mojoFitnessMap?.get(playerId);
          const restored = restoredMF?.[playerId];
          playerStateHook.registerPlayer(
            playerId,
            player.name,
            (player.position ||
              "DH") as import("../../../engines/fitnessEngine").PlayerPosition,
            snapshot?.mojoLevel ?? (restored?.mojo as MojoLevel) ?? player.mojo ?? 0,
            snapshot?.fitnessState ?? (restored?.fitness as FitnessState) ?? player.fitness ?? "FIT",
            traits,
            player.age ?? 25,
          );
        } else if (shouldApplyRestoredToExisting && restoredMF?.[playerId]) {
          // R3-T0-fix: Player already registered with defaults — apply restored mojo/fitness
          const restored = restoredMF[playerId];
          const existing = playerStateHook.getPlayer(playerId)!;
          if (existing.gameState.currentMojo !== restored.mojo) {
            playerStateHook.setMojo(playerId, restored.mojo as MojoLevel);
          }
          if (existing.fitnessProfile.currentFitness !== restored.fitness) {
            playerStateHook.setFitness(playerId, restored.fitness as FitnessState);
          }
        }
      });

      // Register all home team batters
      homeTeamPlayers.forEach((player) => {
        const playerId = getRosterEntityId(player, "home");
        if (!playerStateHook.getPlayer(playerId)) {
          const traits = [player.trait1, player.trait2].filter(
            (t): t is string => !!t,
          );
          const snapshot = mojoFitnessMap?.get(playerId);
          const restored = restoredMF?.[playerId];
          playerStateHook.registerPlayer(
            playerId,
            player.name,
            (player.position ||
              "DH") as import("../../../engines/fitnessEngine").PlayerPosition,
            snapshot?.mojoLevel ?? (restored?.mojo as MojoLevel) ?? player.mojo ?? 0,
            snapshot?.fitnessState ?? (restored?.fitness as FitnessState) ?? player.fitness ?? "FIT",
            traits,
            player.age ?? 25,
          );
        } else if (shouldApplyRestoredToExisting && restoredMF?.[playerId]) {
          const restored = restoredMF[playerId];
          const existing = playerStateHook.getPlayer(playerId)!;
          if (existing.gameState.currentMojo !== restored.mojo) {
            playerStateHook.setMojo(playerId, restored.mojo as MojoLevel);
          }
          if (existing.fitnessProfile.currentFitness !== restored.fitness) {
            playerStateHook.setFitness(playerId, restored.fitness as FitnessState);
          }
        }
      });

      // Register pitchers
      if (awayPitcher) {
        const pitcherId = getRosterEntityId(awayPitcher, "away");
        if (!playerStateHook.getPlayer(pitcherId)) {
          const traits = [awayPitcher.trait1, awayPitcher.trait2].filter(
            (t): t is string => !!t,
          );
          const snapshot = mojoFitnessMap?.get(pitcherId);
          const restored = restoredMF?.[pitcherId];
          playerStateHook.registerPlayer(
            pitcherId,
            awayPitcher.name,
            "SP",
            snapshot?.mojoLevel ?? (restored?.mojo as MojoLevel) ?? awayPitcher.mojo ?? 0,
            snapshot?.fitnessState ?? (restored?.fitness as FitnessState) ?? awayPitcher.fitness ?? "FIT",
            traits,
            awayPitcher.age ?? 25,
          );
        } else if (shouldApplyRestoredToExisting && restoredMF?.[pitcherId]) {
          const restored = restoredMF[pitcherId];
          const existing = playerStateHook.getPlayer(pitcherId)!;
          if (existing.gameState.currentMojo !== restored.mojo) {
            playerStateHook.setMojo(pitcherId, restored.mojo as MojoLevel);
          }
          if (existing.fitnessProfile.currentFitness !== restored.fitness) {
            playerStateHook.setFitness(pitcherId, restored.fitness as FitnessState);
          }
        }
      }
      if (homePitcher) {
        const pitcherId = getRosterEntityId(homePitcher, "home");
        if (!playerStateHook.getPlayer(pitcherId)) {
          const traits = [homePitcher.trait1, homePitcher.trait2].filter(
            (t): t is string => !!t,
          );
          const snapshot = mojoFitnessMap?.get(pitcherId);
          const restored = restoredMF?.[pitcherId];
          playerStateHook.registerPlayer(
            pitcherId,
            homePitcher.name,
            "SP",
            snapshot?.mojoLevel ?? (restored?.mojo as MojoLevel) ?? homePitcher.mojo ?? 0,
            snapshot?.fitnessState ?? (restored?.fitness as FitnessState) ?? homePitcher.fitness ?? "FIT",
            traits,
            homePitcher.age ?? 25,
          );
        } else if (shouldApplyRestoredToExisting && restoredMF?.[pitcherId]) {
          const restored = restoredMF[pitcherId];
          const existing = playerStateHook.getPlayer(pitcherId)!;
          if (existing.gameState.currentMojo !== restored.mojo) {
            playerStateHook.setMojo(pitcherId, restored.mojo as MojoLevel);
          }
          if (existing.fitnessProfile.currentFitness !== restored.fitness) {
            playerStateHook.setFitness(pitcherId, restored.fitness as FitnessState);
          }
        }
      }

      // Diagnostic: dump all registered player IDs and their mojo/fitness
      const allRegistered = playerStateHook.getAllPlayers();
      console.log("[M1-2-DIAG] All registered players:", allRegistered.map(p => ({
        id: p.playerId,
        name: p.playerName,
        mojo: p.gameState.currentMojo,
        fitness: p.fitnessProfile.currentFitness,
      })));
      if (restoredMF) {
        console.log("[M1-2-DIAG] Restored mojo/fitness keys:", Object.keys(restoredMF));
        console.log("[M1-2-DIAG] Restored mojo/fitness sample:", Object.entries(restoredMF).slice(0, 3));
        lastAppliedRestoredMojoFitnessRef.current = restoredMF;
      }
      console.log(
        "[GameTracker] Registered players with playerStateHook for mojo/fitness tracking",
      );
    };

    void registerPlayersWithSnapshots();

    return () => {
      cancelled = true;
    };
  }, [
    awayPitcher,
    awayTeamPlayers,
    gameInitialized,
    getRosterEntityId,
    homePitcher,
    homeTeamPlayers,
    effectiveEliminationId,
    effectiveGameMode,
    playerStateHook,
    restoredMojoFitness,
  ]);

  // EXH-036: Helper functions to get/set mojo/fitness by player name and team
  // These are used by TeamRoster components to enable mojo/fitness editing in player cards
  const getPlayerIdFromName = useCallback(
    (name: string, team: "away" | "home") => {
      return getRosterIdFromName(name, team);
    },
    [getRosterIdFromName],
  );

  const getPitcherIdFromName = useCallback(
    (name: string, team: "away" | "home") => {
      return getRosterIdFromName(name, team, "pitcher");
    },
    [getRosterIdFromName],
  );

  const resolveRosterPlayerState = useCallback(
    (playerId: string) => {
      const directPlayer = playerStateHook.getPlayer(playerId);
      if (directPlayer) {
        return {
          playerData: directPlayer,
          rosterMojo: undefined as MojoLevel | undefined,
          rosterFitness: undefined as FitnessState | undefined,
          resolvedBy: "direct",
        };
      }

      const rosterMatches: Array<{
        entity: { name: string; playerId?: string; mojo?: MojoLevel; fitness?: FitnessState };
        team: "away" | "home";
      }> = [];

      for (const player of awayTeamPlayers) {
        const fallbackId = buildFallbackRuntimePlayerId(player.name, "away");
        if (getRosterEntityId(player, "away") === playerId || fallbackId === playerId) {
          rosterMatches.push({ entity: player, team: "away" });
        }
      }

      for (const player of homeTeamPlayers) {
        const fallbackId = buildFallbackRuntimePlayerId(player.name, "home");
        if (getRosterEntityId(player, "home") === playerId || fallbackId === playerId) {
          rosterMatches.push({ entity: player, team: "home" });
        }
      }

      for (const pitcher of awayTeamPitchers) {
        const fallbackId = buildFallbackRuntimePlayerId(pitcher.name, "away");
        if (getRosterEntityId(pitcher, "away") === playerId || fallbackId === playerId) {
          rosterMatches.push({ entity: pitcher, team: "away" });
        }
      }

      for (const pitcher of homeTeamPitchers) {
        const fallbackId = buildFallbackRuntimePlayerId(pitcher.name, "home");
        if (getRosterEntityId(pitcher, "home") === playerId || fallbackId === playerId) {
          rosterMatches.push({ entity: pitcher, team: "home" });
        }
      }

      for (const match of rosterMatches) {
        const candidateIds = [
          getRosterEntityId(match.entity, match.team),
          buildFallbackRuntimePlayerId(match.entity.name, match.team),
        ];

        for (const candidateId of candidateIds) {
          const candidatePlayer = playerStateHook.getPlayer(candidateId);
          if (candidatePlayer) {
            return {
              playerData: candidatePlayer,
              rosterMojo: match.entity.mojo,
              rosterFitness: match.entity.fitness,
              resolvedBy: candidateId === playerId ? "direct-candidate" : "fallback-id",
            };
          }
        }

        if (match.entity.mojo !== undefined || match.entity.fitness !== undefined) {
          return {
            playerData: undefined,
            rosterMojo: match.entity.mojo,
            rosterFitness: match.entity.fitness,
            resolvedBy: "roster-fallback",
          };
        }
      }

      return {
        playerData: undefined,
        rosterMojo: undefined as MojoLevel | undefined,
        rosterFitness: undefined as FitnessState | undefined,
        resolvedBy: "missing",
      };
    },
    [
      awayTeamPitchers,
      awayTeamPlayers,
      getRosterEntityId,
      homeTeamPitchers,
      homeTeamPlayers,
      playerStateHook,
    ],
  );

  const getMojoForPlayer = useCallback(
    (playerId: string) => {
      const resolved = resolveRosterPlayerState(playerId);
      const mojo = resolved.playerData?.gameState.currentMojo ?? resolved.rosterMojo;
      // Temporary: log as console.log (not debug) so it's visible without verbose mode
      if (mojo !== undefined && mojo !== 0) {
        console.log("[M1-2] getMojoForPlayer NON-DEFAULT:", { playerId, mojo, resolvedBy: resolved.resolvedBy });
      }
      return mojo;
    },
    [resolveRosterPlayerState],
  );

  const getFitnessForPlayer = useCallback(
    (playerId: string) => {
      const resolved = resolveRosterPlayerState(playerId);
      const fitness =
        resolved.playerData?.fitnessProfile.currentFitness ?? resolved.rosterFitness;
      console.debug("[M1-2-fix] Resolved player fitness", {
        playerId,
        fitness,
        resolvedBy: resolved.resolvedBy,
      });
      return fitness;
    },
    [resolveRosterPlayerState],
  );

  const getPlayerMojoByName = useCallback(
    (name: string, team: "away" | "home") => {
      const playerId = getPlayerIdFromName(name, team);
      return getMojoForPlayer(playerId);
    },
    [getMojoForPlayer, getPlayerIdFromName],
  );

  const getPlayerFitnessByName = useCallback(
    (name: string, team: "away" | "home") => {
      const playerId = getPlayerIdFromName(name, team);
      return getFitnessForPlayer(playerId);
    },
    [getFitnessForPlayer, getPlayerIdFromName],
  );

  const setPlayerMojoByName = useCallback(
    (
      name: string,
      team: "away" | "home",
      newMojo: MojoLevel,
      reason: string = "Player card adjustment",
    ) => {
      const playerId = getPlayerIdFromName(name, team);
      const currentPlayer = playerStateHook.getPlayer(playerId);
      const previousMojo = currentPlayer?.gameState.currentMojo;
      console.log("[M1-2-DIAG] setPlayerMojoByName:", {
        name, team, playerId, found: !!currentPlayer, previousMojo, newMojo,
      });
      if (previousMojo === undefined || previousMojo === newMojo) return;

      undoSystem.captureSnapshot(`Mojo: ${name} ${previousMojo} to ${newMojo}`);
      playerStateHook.setMojo(playerId, newMojo);
      // Force a UI refresh by updating a dummy state
      setRosterVersion((v) => v + 1);
      void recordPlayerStateChange(
        playerId,
        name,
        "mojo",
        previousMojo,
        newMojo,
        reason,
      ).then(() => queuePlayLogRefresh(0));
    },
    [
      getPlayerIdFromName,
      playerStateHook,
      queuePlayLogRefresh,
      recordPlayerStateChange,
      undoSystem,
    ],
  );

  const handleLineupMojoAdjust = useCallback(
    (playerId: string, playerName: string, delta: -1 | 1) => {
      const team = resolveRosterTeamSide(playerId, playerName) || "home";
      const currentMojo = getMojoForPlayer(playerId);
      if (currentMojo === undefined) return;

      const nextMojo = clampMojo(currentMojo + delta);
      if (nextMojo === currentMojo) return;

      setPlayerMojoByName(playerName, team, nextMojo, "Lineup quick adjust");
    },
    [getMojoForPlayer, resolveRosterTeamSide, setPlayerMojoByName],
  );

  const setPlayerFitnessByName = useCallback(
    (
      name: string,
      team: "away" | "home",
      newFitness: FitnessState,
      reason: string = "Player card adjustment",
    ) => {
      const playerId = getPlayerIdFromName(name, team);
      const currentPlayer = playerStateHook.getPlayer(playerId);
      const previousFitness = currentPlayer?.fitnessProfile.currentFitness;
      if (!previousFitness || previousFitness === newFitness) return;

      undoSystem.captureSnapshot(
        `Fitness: ${name} ${previousFitness} to ${newFitness}`,
      );
      playerStateHook.setFitness(playerId, newFitness);
      setRosterVersion((v) => v + 1);
      void recordPlayerStateChange(
        playerId,
        name,
        "fitness",
        previousFitness,
        newFitness,
        reason,
      ).then(() => queuePlayLogRefresh(0));
    },
    [
      getPlayerIdFromName,
      playerStateHook,
      queuePlayLogRefresh,
      recordPlayerStateChange,
      undoSystem,
    ],
  );

  // Get current batter's lineup position
  const battingTeamPlayers = gameState.isTop
    ? awayTeamPlayers
    : homeTeamPlayers;
  const pitchingTeamPlayers = gameState.isTop
    ? homeTeamPlayers
    : awayTeamPlayers;
  const currentBatterData = battingTeamPlayers.find(
    (p) =>
      (p.battingOrder && p.name === resolvedCurrentBatterName) ||
      getRosterIdFromName(p.name, battingTeam) === gameState.currentBatterId,
  );
  const currentBatterPosition = currentBatterData?.battingOrder || 1;
  const currentBatterPositionStr = currentBatterPosition.toString();
  const atBatDigit1 =
    currentBatterPositionStr.length > 1 ? currentBatterPositionStr[0] : "";
  const atBatDigit2 =
    currentBatterPositionStr.length > 1
      ? currentBatterPositionStr[1]
      : currentBatterPositionStr[0];

  // Get current batter's game stats from the playerStats Map
  const currentBatterStats = playerStats.get(gameState.currentBatterId);
  const batterHits = currentBatterStats?.h ?? 0;
  const batterAB = currentBatterStats?.ab ?? 0;

  // Get current pitcher's game stats from the pitcherStats Map
  const currentPitcherStats = pitcherStats.get(gameState.currentPitcherId);
  const pitcherPitchCount = currentPitcherStats?.pitchCount ?? 0;

  // Format display name: already-initialed names stay as-is; full names become initial + last name.
  const formatDisplayName = (name: string | undefined): string => {
    if (!name) return "UNKNOWN";
    // If already in "F. LAST" format, return as-is
    if (name.match(/^[A-Z]\.\s[A-Z]+$/)) return name;
    // Otherwise, format "First Last" to "F. LAST"
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}. ${parts[parts.length - 1].toUpperCase()}`;
    }
    return name.toUpperCase();
  };

  const currentBatterDisplayName = formatDisplayName(resolvedCurrentBatterName);
  const currentPitcherDisplayName = formatDisplayName(
    resolvedCurrentPitcherName,
  );
  const getLivePreambleSeed = useCallback(() => {
    if (!gameState.currentBatterId || !gameState.currentPitcherId) {
      return null;
    }

    return {
      gameId: gameState.gameId,
      atBatId: getPendingAtBatIdentity().atBatEventId,
      inning: gameState.inning,
      halfInning: (gameState.isTop ? "TOP" : "BOTTOM") as AtBatEvent["halfInning"],
      outs: gameState.outs,
      bases: {
        first: runnerNames.first ?? null,
        second: runnerNames.second ?? null,
        third: runnerNames.third ?? null,
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      battingTeamId: gameState.isTop ? awayTeamId : homeTeamId,
      battingTeamName: gameState.isTop ? awayTeamName : homeTeamName,
      pitchingTeamId: gameState.isTop ? homeTeamId : awayTeamId,
      pitchingTeamName: gameState.isTop ? homeTeamName : awayTeamName,
      batterId: gameState.currentBatterId,
      batterName: resolvedCurrentBatterName,
      pitcherId: gameState.currentPitcherId,
      pitcherName: resolvedCurrentPitcherName,
      competitionType: effectiveCompetitionType,
      competitionId: effectiveCompetitionId,
      leagueId,
    };
  }, [
    awayTeamId,
    awayTeamName,
    effectiveCompetitionId,
    effectiveCompetitionType,
    gameState.awayScore,
    gameState.currentBatterId,
    gameState.currentPitcherId,
    gameState.gameId,
    gameState.homeScore,
    gameState.inning,
    gameState.isTop,
    gameState.outs,
    getPendingAtBatIdentity,
    homeTeamId,
    homeTeamName,
    leagueId,
    resolvedCurrentBatterName,
    resolvedCurrentPitcherName,
    runnerNames.first,
    runnerNames.second,
    runnerNames.third,
  ]);
  const {
    commentaryEntries,
    fireBetweenInningSummary,
    firePostGameColumns,
    homeDisabled: homeCommentaryDisabled,
    awayDisabled: awayCommentaryDisabled,
  } = useCommentaryFeed({
    gameId: gameState.gameId,
    homeTeamId,
    awayTeamId,
    leagueId,
    gameMode:
      effectiveCompetitionType === "playoff"
        ? "elimination"
        : (effectiveCompetitionType as import("../../../types/reporter").ReporterGameMode),
    getLivePreambleSeed,
  });
  const [reportersForFeed, setReportersForFeed] = useState<
    Record<string, BeatReporter>
  >({});

  useEffect(() => {
    let cancelled = false;

    const resolveFeedReporters = async () => {
      const [homeReporter, awayReporter] = await Promise.all([
        getReporterForTeam(homeTeamId, leagueId),
        getReporterForTeam(awayTeamId, leagueId),
      ]);

      if (cancelled) {
        return;
      }

      const nextReporters: Record<string, BeatReporter> = {};
      if (homeReporter) {
        nextReporters[homeReporter.id] = homeReporter;
      }
      if (awayReporter) {
        nextReporters[awayReporter.id] = awayReporter;
      }
      setReportersForFeed(nextReporters);
    };

    void resolveFeedReporters();

    return () => {
      cancelled = true;
    };
  }, [awayTeamId, homeTeamId, leagueId]);

  const reporterTeamColorsForFeed = useMemo(() => {
    const palettes: Record<string, { primary: string; secondary: string }> = {};

    Object.values(reportersForFeed).forEach((reporter) => {
      if (reporter.teamId === homeTeamId) {
        palettes[reporter.id] = {
          primary: homeTeamColor,
          secondary: homeTeamBorderColor,
        };
        return;
      }

      if (reporter.teamId === awayTeamId) {
        palettes[reporter.id] = {
          primary: awayTeamColor,
          secondary: awayTeamBorderColor,
        };
      }
    });

    return palettes;
  }, [
    awayTeamBorderColor,
    awayTeamColor,
    awayTeamId,
    homeTeamBorderColor,
    homeTeamColor,
    homeTeamId,
    reportersForFeed,
  ]);

  // Live historical tidbits intentionally skip the old scene-setting preamble.
  // We leave the hook-level preamble machinery in place for legacy tests and
  // preview harnesses, but the live GameTracker no longer fires it.

  // Inning-summary watcher: fires at end of bottom-of-N, regardless of which handler
  // triggered the transition (modal YES, force-end button, or auto game-end). Reactive
  // so we catch all paths without touching useGameState.
  useEffect(() => {
    if (gameState.gamePhase === "PRE_GAME") {
      return;
    }
    const prev = lastSeenHalfInningRef.current;
    const curr = { inning: gameState.inning, isTop: gameState.isTop };
    lastSeenHalfInningRef.current = curr;

    if (!prev || !gameState.gameId) {
      return;
    }
    if (!gameState.liveBeatReporterEnabled) {
      return;
    }

    // Detect "we just finished the bottom of inning N". Two signatures:
    //  (a) prev was bottom-of-N, now we're top-of-N+1 (normal transition)
    //  (b) prev was bottom-of-N, now gamePhase is POST_FINAL_OUT (game ended on last inning)
    const wasBottomOfN = !prev.isTop;
    const nowAdvancedToNext = curr.isTop && curr.inning > prev.inning;
    const gameJustEnded = gameState.gamePhase === "POST_FINAL_OUT";
    if (!wasBottomOfN || (!nowAdvancedToNext && !gameJustEnded)) {
      return;
    }

    const completedInning = prev.inning;
    const dedupKey = `${gameState.gameId}:${completedInning}`;
    if (firedInningSummariesRef.current.has(dedupKey)) {
      return;
    }

    const reporterTeam: "home" | "away" =
      completedInning % 2 === 1 ? "home" : "away";
    if (reporterTeam === "home" && homeCommentaryDisabled) return;
    if (reporterTeam === "away" && awayCommentaryDisabled) return;

    firedInningSummariesRef.current.add(dedupKey);
    const targetGameId = gameState.gameId;

    void (async () => {
      try {
        const inningEvents = (await getGameEvents(targetGameId)).filter(
          (event) => !event.undoneAt && event.inning === completedInning,
        );
        await fireBetweenInningSummary(
          targetGameId,
          completedInning,
          inningEvents,
          reporterTeam,
          undefined,
          effectiveCompetitionType,
        );
      } catch (error) {
        console.warn(
          `[reporter:commentary] Failed to fire summary for inning ${completedInning}.`,
          error,
        );
      }
    })();
  }, [
    awayCommentaryDisabled,
    effectiveCompetitionType,
    fireBetweenInningSummary,
    gameState.liveBeatReporterEnabled,
    gameState.gameId,
    gameState.gamePhase,
    gameState.inning,
    gameState.isTop,
    homeCommentaryDisabled,
  ]);

  // Post-game columns watcher. Fires ONCE per gameId when the game reaches
  // POST_FINAL_OUT phase, gated by postGameColumnsEnabled. The hook itself
  // dedups via its own ref (seeded from existing gameStories records), so this
  // watcher can be called repeatedly without double-billing.
  useEffect(() => {
    if (gameState.gamePhase !== "POST_FINAL_OUT") return;
    if (!gameState.gameId) return;
    if (!gameState.postGameColumnsEnabled) return;
    if (homeCommentaryDisabled && awayCommentaryDisabled) return;

    const targetGameId = gameState.gameId;
    const reporterGameMode: import("../../../types/reporter").ReporterGameMode =
      effectiveCompetitionType === "playoff"
        ? "elimination"
        : (effectiveCompetitionType as import("../../../types/reporter").ReporterGameMode);

    void (async () => {
      try {
        const allEvents = (await getGameEvents(targetGameId)).filter(
          (e) => !e.undoneAt,
        );
        await firePostGameColumns({
          targetGameId,
          allInningEvents: allEvents,
          finalScore: {
            home: gameState.homeScore,
            away: gameState.awayScore,
          },
          gameMode: reporterGameMode,
          gameDate: new Date().toISOString().slice(0, 10),
          opponentByReporter: {
            home: awayTeamId,
            away: homeTeamId,
          },
        });
      } catch (error) {
        console.warn(
          "[reporter:post-game] Failed to generate post-game columns.",
          error,
        );
      }
    })();
  }, [
    awayCommentaryDisabled,
    awayTeamId,
    effectiveCompetitionType,
    firePostGameColumns,
    gameState.awayScore,
    gameState.gameId,
    gameState.gamePhase,
    gameState.homeScore,
    gameState.postGameColumnsEnabled,
    homeCommentaryDisabled,
    homeTeamId,
  ]);

  const lineupGemCountsByPlayerId = useMemo(
    () => buildPlayerGemCounts(lineupFieldingEvents),
    [lineupFieldingEvents],
  );

  const lineupGameLineByPlayerId = useMemo(() => {
    const next: Record<string, string> = {};

    const assignPlayers = (
      players: Player[],
      team: "away" | "home",
    ) => {
      for (const player of players) {
        const playerId = getRosterEntityId(player, team);
        next[playerId] = formatPlayerLineupGameLine(
          playerStats.get(playerId),
          lineupGemCountsByPlayerId[playerId] ?? 0,
        );
      }
    };

    const assignPitchers = (
      pitchers: Pitcher[],
      team: "away" | "home",
    ) => {
      for (const pitcher of pitchers) {
        const playerId = getRosterEntityId(pitcher, team);
        next[playerId] = formatPlayerLineupGameLine(
          playerStats.get(playerId),
          lineupGemCountsByPlayerId[playerId] ?? 0,
        );
      }
    };

    assignPlayers(awayTeamPlayers, "away");
    assignPlayers(homeTeamPlayers, "home");
    assignPitchers(awayTeamPitchers, "away");
    assignPitchers(homeTeamPitchers, "home");

    return next;
  }, [
    awayTeamPitchers,
    awayTeamPlayers,
    getRosterEntityId,
    homeTeamPitchers,
    homeTeamPlayers,
    lineupGemCountsByPlayerId,
    playerStats,
  ]);

  // §5: Lineup column data — role-based: column 2 = batting team, column 3 = fielding team
  const battingColumnPlayers = useMemo(() => {
    const players = gameState.isTop ? awayTeamPlayers : homeTeamPlayers;
    const pitchers = gameState.isTop ? awayTeamPitchers : homeTeamPitchers;
    const lineupSnapshot = getLineupStateSnapshot();
    const battingSnapshot =
      battingTeam === "away" ? lineupSnapshot.away : lineupSnapshot.home;
    const activePitcher = getPreferredActivePitcher(pitchers);
    const teamUsesDh = inferTeamUsesDh(
      players,
      pitchers,
      persistedUseDh ??
        inferSnapshotUsesDh(battingSnapshot) ??
        navigationState?.useDH,
    );
    const battingRows = players
      .filter(
        (player) =>
          player.battingOrder !== undefined &&
          !player.isOutOfGame &&
          !shouldHidePitcherFromBattingDisplay(
            player,
            activePitcher,
            teamUsesDh,
          ),
      )
      .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
      .map((p) => {
        const playerId = getRosterEntityId(p, battingTeam);
        const fallbackMeta = leagueBuilderLineupMetaById[playerId];

        return {
          playerId,
          name: p.name,
          position: p.position,
          battingOrder: p.battingOrder!,
          jerseyNumber: p.jerseyNumber ?? fallbackMeta?.jerseyNumber,
          hometown: p.hometown ?? fallbackMeta?.hometown,
          gameLine: lineupGameLineByPlayerId[playerId] ?? "0 for 0",
        };
      });
    if (
      teamUsesDh ||
      !activePitcher ||
      battingRows.some((player) => player.position === "P")
    ) {
      return battingRows;
    }

    const pitcherId = getRosterEntityId(activePitcher, battingTeam);
    if (battingRows.some((player) => player.playerId === pitcherId)) {
      return battingRows;
    }

    const positionCounts = battingRows.reduce<Record<string, number>>(
      (counts, player) => {
        const position = player.position || "UT";
        counts[position] = (counts[position] || 0) + 1;
        return counts;
      },
      {},
    );
    let duplicatePositionIndex = -1;
    for (let index = battingRows.length - 1; index >= 0; index -= 1) {
      const position = battingRows[index].position || "UT";
      if ((positionCounts[position] || 0) > 1) {
        duplicatePositionIndex = index;
        break;
      }
    }
    const replacementIndex =
      duplicatePositionIndex >= 0
        ? duplicatePositionIndex
        : battingRows.length - 1;
    const pitcherMeta = leagueBuilderLineupMetaById[pitcherId];
    const nextRows = [...battingRows];
    nextRows[replacementIndex] = {
      playerId: pitcherId,
      name: activePitcher.name,
      position: "P",
      battingOrder: nextRows[replacementIndex]?.battingOrder ?? 9,
      jerseyNumber: activePitcher.jerseyNumber ?? pitcherMeta?.jerseyNumber,
      hometown: activePitcher.hometown ?? pitcherMeta?.hometown,
      gameLine: lineupGameLineByPlayerId[pitcherId] ?? "0 for 0",
    };
    return nextRows;
  }, [
    gameState.isTop,
    awayTeamPitchers,
    awayTeamPlayers,
    homeTeamPitchers,
    homeTeamPlayers,
    battingTeam,
    getRosterEntityId,
    leagueBuilderLineupMetaById,
    lineupGameLineByPlayerId,
    persistedUseDh,
    navigationState?.useDH,
  ]);

  const defensiveColumnPlayers = useMemo(() => {
    const players = fieldingTeam === "home" ? homeTeamPlayers : awayTeamPlayers;
    const pitchers =
      fieldingTeam === "home" ? homeTeamPitchers : awayTeamPitchers;
    const lineupSnapshot = getLineupStateSnapshot();

    return buildDefensiveColumnPlayersForDisplay({
      players,
      pitchers,
      fieldingTeam,
      pitcherStats,
      getRosterEntityId,
      lineupSnapshot:
        fieldingTeam === "away" ? lineupSnapshot.away : lineupSnapshot.home,
      explicitUseDh:
        fieldingTeam === "away"
          ? lineupSnapshot.awayUsesDh ?? persistedUseDh ?? navigationState?.useDH
          : lineupSnapshot.homeUsesDh ?? persistedUseDh ?? navigationState?.useDH,
    }).map((player) => {
      const fallbackMeta = leagueBuilderLineupMetaById[player.playerId];
      return {
        ...player,
        jerseyNumber: player.jerseyNumber ?? fallbackMeta?.jerseyNumber,
        hometown: player.hometown ?? fallbackMeta?.hometown,
        gameLine: lineupGameLineByPlayerId[player.playerId] ?? "0 for 0",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fieldingTeam,
    getLineupStateSnapshot,
    getRosterEntityId,
    homeTeamPlayers,
    awayTeamPlayers,
    homeTeamPitchers,
    awayTeamPitchers,
    navigationState?.useDH,
    leagueBuilderLineupMetaById,
    lineupGameLineByPlayerId,
    persistedUseDh,
    pitcherStats,
    rosterVersion,
  ]);

  // §5.2: Next-inning leadoff — batter after the last batter of current half-inning
  // This is the batter index that will lead off NEXT time this team bats
  const battingNextLeadoff = useMemo(() => {
    // gameState.currentBatterIndex is 0-based, batting order is 1-based
    // The next leadoff is the current batter (they haven't completed their AB yet)
    // In practice this is an approximation — the exact next leadoff depends on how the inning ends
    return currentBatterPosition;
  }, [currentBatterPosition]);

  // §5.3: Next-inning leadoff for the defensive team — batter AFTER the last one who batted (wrapping 9→1)
  const defensiveNextLeadoff = useMemo(() => {
    const batterIndices = getBatterIndicesSnapshot();
    const nextIndex =
      fieldingTeam === "away" ? batterIndices.away : batterIndices.home;
    // nextIndex is 0-based index of the NEXT batter due up; convert to 1-based batting order with wrap
    return (nextIndex % 9) + 1;
  }, [fieldingTeam, getBatterIndicesSnapshot]);

  // §6.1: NewsBoard data — batter line, pitcher line, matchup summary
  const batterGameLine = useMemo(() => {
    const stats = playerStats.get(gameState.currentBatterId);
    if (!stats) return "—";
    const parts: string[] = [];
    parts.push(`${stats.h}-for-${stats.ab}`);
    if (stats.hr > 0) parts.push(`${stats.hr} HR`);
    if (stats.rbi > 0) parts.push(`${stats.rbi} RBI`);
    if (stats.bb > 0) parts.push(`${stats.bb} BB`);
    if (stats.k > 0) parts.push(`${stats.k} K`);
    if (stats.sb > 0) parts.push(`${stats.sb} SB`);
    return parts.join(", ");
  }, [playerStats, gameState.currentBatterId]);

  const pitcherGameLine = useMemo(() => {
    const stats = pitcherStats.get(gameState.currentPitcherId);
    if (!stats) return "—";
    const ip = `${Math.floor(stats.outsRecorded / 3)}.${stats.outsRecorded % 3}`;
    const parts: string[] = [];
    parts.push(`${ip} IP`);
    parts.push(`${stats.hitsAllowed} H`);
    parts.push(`${stats.earnedRuns} ER`);
    parts.push(`${stats.strikeoutsThrown} K`);
    if (stats.walksAllowed > 0) parts.push(`${stats.walksAllowed} BB`);
    return parts.join(", ");
  }, [pitcherStats, gameState.currentPitcherId]);

  const matchupLine = useMemo(() => {
    if (fenwayContext.matchupRecord) {
      return `vs ${currentPitcherDisplayName}: ${fenwayContext.matchupRecord}${fenwayContext.matchupAvg ? ` (${fenwayContext.matchupAvg})` : ""}`;
    }
    return undefined;
  }, [
    fenwayContext.matchupRecord,
    fenwayContext.matchupAvg,
    currentPitcherDisplayName,
  ]);

  // §9.3: Swap Order handler — swaps batting order between two players
  const handleSwapOrder = useCallback(
    (secondPlayerId: string) => {
      if (!swapOrderMode) return;

      const firstId = swapOrderMode.playerId;
      const swapped = swapBattingOrder(firstId, secondPlayerId);
      if (swapped) {
        syncDisplayedRostersToLineupSnapshot(getLineupStateSnapshot());
        setRosterVersion((v) => v + 1);
      }

      setSwapOrderMode(null);
    },
    [
      getLineupStateSnapshot,
      swapOrderMode,
      swapBattingOrder,
      syncDisplayedRostersToLineupSnapshot,
    ],
  );

  // §9.2: Swap Position handler — swaps fielding positions between two players
  const handleSwapPositionComplete = useCallback(
    (secondPlayerId: string) => {
      if (!swapPositionMode) return;

      const firstId = swapPositionMode.playerId;
      let firstPosition = "";
      let secondPosition = "";
      const updatePositions = (players: Player[]) => {
        const p1 = players.find(
          (p) =>
            getRosterEntityId(p, battingTeam) === firstId ||
            getRosterEntityId(p, fieldingTeam) === firstId,
        );
        const p2 = players.find(
          (p) =>
            getRosterEntityId(p, battingTeam) === secondPlayerId ||
            getRosterEntityId(p, fieldingTeam) === secondPlayerId,
        );
        if (p1 && p2 && p1.position && p2.position) {
          firstPosition = p1.position;
          secondPosition = p2.position;
          const temp = p1.position;
          p1.position = p2.position;
          p2.position = temp;
          return true;
        }
        return false;
      };

      const awayCopy = [...awayTeamPlayers.map((p) => ({ ...p }))];
      if (updatePositions(awayCopy)) {
        setAwayTeamPlayers(awayCopy);
      }
      const homeCopy = [...homeTeamPlayers.map((p) => ({ ...p }))];
      if (updatePositions(homeCopy)) {
        setHomeTeamPlayers(homeCopy);
      }

      // Log via switchPositions hook for BetweenPlayEvent persistence
      if (firstPosition && secondPosition) {
        undoSystem.captureSnapshot(
          `Position swap: ${firstId} with ${secondPlayerId}`,
        );
        switchPositions([
          { playerId: firstId, newPosition: secondPosition },
          { playerId: secondPlayerId, newPosition: firstPosition },
        ]);
        syncDisplayedRostersToLineupSnapshot(getLineupStateSnapshot());
        setRosterVersion((v) => v + 1);
        console.log("[M1-3-fix] Applied player-card position swap", {
          gamePhase: gameState.gamePhase,
          firstPlayerId: firstId,
          secondPlayerId,
          firstNewPosition: secondPosition,
          secondNewPosition: firstPosition,
        });
      }
      queuePlayLogRefresh(80);
      setSwapPositionMode(null);
    },
    [
      swapPositionMode,
      awayTeamPlayers,
      homeTeamPlayers,
      battingTeam,
      fieldingTeam,
      gameState.gamePhase,
      getLineupStateSnapshot,
      getRosterEntityId,
      syncDisplayedRostersToLineupSnapshot,
      switchPositions,
      queuePlayLogRefresh,
      undoSystem,
    ],
  );

  // §14: Fitness change with auto-injury logging
  const handleFitnessChangeWithAutoInjury = useCallback(
    (playerId: string, playerName: string, newFitness: FitnessState) => {
      const currentPlayer = playerStateHook.getPlayer(playerId);
      const previousFitness = currentPlayer?.fitnessProfile.currentFitness;
      if (!previousFitness || previousFitness === newFitness) return;

      const eventGroupId = `${gameState.gameId}_fitness_${playerId}_${Date.now()}`;
      undoSystem.captureSnapshot(
        `Fitness: ${playerName} ${previousFitness} to ${newFitness}`,
      );
      playerStateHook.setFitness(playerId, newFitness);
      setRosterVersion((version) => version + 1);

      // §14: Auto-injury — log injury event when fitness set to WEAK, STRAINED, or HURT
      const injuryStates: FitnessState[] = ["WEAK", "STRAINED", "HURT"];
      void (async () => {
        const fitnessEvent = await recordPlayerStateChange(
          playerId,
          playerName,
          "fitness",
          previousFitness,
          newFitness,
          "Player card adjustment",
          { eventGroupId },
        );

        if (!injuryStates.includes(newFitness)) {
          queuePlayLogRefresh(0);
          return;
        }

        await recordPlayerStateChange(
          playerId,
          playerName,
          "injury",
          previousFitness,
          newFitness,
          `Auto-injury: fitness changed to ${newFitness}`,
          {
            eventGroupId,
            linkedEventId: fitnessEvent.eventId,
          },
        ).then(() => queuePlayLogRefresh(0));
      })().catch((error) => {
        console.error("[GameTracker] Failed to log fitness/injury change:", error);
      });
    },
    [
      gameState.gameId,
      playerStateHook,
      recordPlayerStateChange,
      queuePlayLogRefresh,
      undoSystem,
    ],
  );

  const getRunnerBaseForPlayer = useCallback(
    (playerId: string, playerName?: string): RunnerBase | null => {
      return findRunnerBaseForSelectedPlayer(
        battingLineupRunners,
        playerId,
        playerName,
      );
    },
    [battingLineupRunners],
  );

  const isPitcherPlayer = useCallback(
    (playerId: string, playerName: string) => {
      const matchesPitcher = (
        pitchers: Pitcher[],
        team: "away" | "home",
      ) =>
        pitchers.some(
          (pitcher) =>
            getRosterEntityId(pitcher, team) === playerId ||
            pitcher.name === playerName,
        );
      const matchesPitcherSlot = (
        players: Player[],
        team: "away" | "home",
      ) =>
        players.some(
          (player) =>
            (getRosterEntityId(player, team) === playerId ||
              player.name === playerName) &&
            player.position === "P",
        );

      const lineupSnapshot = getLineupStateSnapshot();
      return (
        matchesPitcher(awayTeamPitchers, "away") ||
        matchesPitcher(homeTeamPitchers, "home") ||
        matchesPitcherSlot(awayTeamPlayers, "away") ||
        matchesPitcherSlot(homeTeamPlayers, "home") ||
        lineupSnapshot.away.currentPitcher?.playerId === playerId ||
        lineupSnapshot.home.currentPitcher?.playerId === playerId
      );
    },
    [
      awayTeamPitchers,
      awayTeamPlayers,
      getLineupStateSnapshot,
      getRosterEntityId,
      homeTeamPitchers,
      homeTeamPlayers,
    ],
  );

  // §9.3: Player tap handler for lineup columns — handles swap mode or opens player card
  const handleLineupPlayerTap = useCallback(
    (playerId: string, playerName: string) => {
      if (swapOrderMode) {
        handleSwapOrder(playerId);
        return;
      }
      if (swapPositionMode) {
        handleSwapPositionComplete(playerId);
        return;
      }
      const isPitcher = isPitcherPlayer(playerId, playerName);
      const runnerBase =
        getRunnerBaseForPlayer(playerId, playerName) || undefined;
      console.log("[R3-T0] Classified lineup player tap", {
        gamePhase: gameState.gamePhase,
        playerId,
        playerName,
        isPitcher,
      });
      setSelectedPlayer(buildSelectedLineupPlayerCard({
        playerId,
        playerName,
        isPitcher,
        runnerBase,
      }));
    },
    [
      swapOrderMode,
      swapPositionMode,
      handleSwapOrder,
      handleSwapPositionComplete,
      gameState.gamePhase,
      isPitcherPlayer,
      getRunnerBaseForPlayer,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    const loadFenwayContext = async () => {
      if (
        !gameState.gameId ||
        !gameState.currentBatterId ||
        !gameState.currentPitcherId
      ) {
        if (!cancelled) {
          setFenwayContext({ milestoneAlerts: [] });
        }
        return;
      }

      try {
        const seasonId =
          effectiveSeasonId ?? effectiveStatsScopeId;
        const [
          currentGameEvents,
          historicalMatchupEvents,
          batterCareer,
          pitcherCareer,
          seasonBattingRows,
          seasonPitchingRows,
        ] = await Promise.all([
          getGameEvents(gameState.gameId),
          getMatchupEvents(
            gameState.currentBatterId,
            gameState.currentPitcherId,
            { excludeGameId: gameState.gameId },
          ),
          getCareerStats(gameState.currentBatterId),
          getCareerStats(gameState.currentPitcherId),
          seasonId ? getSeasonBattingStats(seasonId) : Promise.resolve([]),
          seasonId ? getSeasonPitchingStats(seasonId) : Promise.resolve([]),
        ]);

        if (cancelled) {
          return;
        }

        const currentMatchup = buildFenwayMatchupSummary(
          currentGameEvents,
          gameState.currentBatterId,
          gameState.currentPitcherId,
        );
        const historicalMatchup = buildFenwayMatchupSummary(
          historicalMatchupEvents,
          gameState.currentBatterId,
          gameState.currentPitcherId,
        );

        const batterSeason = seasonId
          ? seasonBattingRows.find(
              (row) => row.playerId === gameState.currentBatterId,
            ) || null
          : null;
        const pitcherSeason = seasonId
          ? seasonPitchingRows.find(
              (row) => row.playerId === gameState.currentPitcherId,
            ) || null
          : null;

        const batterWatches = getApproachingMilestones(
          mergeCareerBattingWithGameStats(
            batterCareer.batting,
            currentBatterStats,
          ),
          null,
          mergeSeasonBattingWithGameStats(batterSeason, currentBatterStats),
          null,
          new Set<string>(),
        );
        const pitcherWatches = getApproachingMilestones(
          null,
          mergeCareerPitchingWithGameStats(
            pitcherCareer.pitching,
            currentPitcherStats,
          ),
          null,
          mergeSeasonPitchingWithGameStats(pitcherSeason, currentPitcherStats),
          new Set<string>(),
        );
        const selectedWatches = pickFenwayMilestoneWatches(
          [...batterWatches, ...pitcherWatches],
          gameState.currentBatterId,
          2,
        );
        const multiplePlayers =
          new Set(selectedWatches.map((watch) => watch.playerId)).size > 1;

        setFenwayContext({
          matchupRecord: currentMatchup.matchupRecord,
          matchupAvg: currentMatchup.matchupAvg,
          historicalMatchupRecord: historicalMatchup.matchupRecord,
          historicalMatchupAvg: historicalMatchup.matchupAvg,
          milestoneAlerts: selectedWatches.map((watch) =>
            formatFenwayMilestoneAlert(
              watch,
              multiplePlayers || watch.playerId !== gameState.currentBatterId,
            ),
          ),
        });
      } catch (error) {
        console.warn(
          "[GameTracker] Failed to build Fenway board context:",
          error,
        );
        if (!cancelled) {
          setFenwayContext({
            matchupRecord: undefined,
            matchupAvg: undefined,
            historicalMatchupRecord: undefined,
            historicalMatchupAvg: undefined,
            milestoneAlerts: [],
          });
        }
      }
    };

    void loadFenwayContext();

    return () => {
      cancelled = true;
    };
  }, [
    currentBatterStats,
    currentPitcherStats,
    gameState.currentBatterId,
    gameState.currentPitcherId,
    gameState.gameId,
    effectiveSeasonId,
    effectiveStatsScopeId,
  ]);

  const openPlayerCard = useCallback(
    (
      playerName: string,
      team: "away" | "home",
      type: "batter" | "pitcher" = "batter",
    ) => {
      const playerId =
        type === "pitcher"
          ? getPitcherIdFromName(playerName, team)
          : getPlayerIdFromName(playerName, team);
      setSelectedPlayer({ name: playerName, type, playerId });
    },
    [getPitcherIdFromName, getPlayerIdFromName],
  );

  // Get current batter's fielding position (e.g., "SS", "CF")
  const batterFieldingPosition = currentBatterData?.position || "?";

  // Get batter's grade (from player data if available)
  const batterGrade = "A"; // TODO: Get from player database when available

  const getRunnerIdentityForBase = useCallback(
    (base: RunnerBase | "first" | "second" | "third") => {
      const normalizedBase = base;
      const trackedRunner = battingLineupRunners[normalizedBase];
      const runnerName =
        trackedRunner?.name ||
        runnerNames[normalizedBase] ||
        `R${normalizedBase === "first" ? "1" : normalizedBase === "second" ? "2" : "3"}`;
      return {
        runnerName,
        runnerId:
          trackedRunner?.playerId ||
          getPlayerIdFromName(runnerName, battingTeam),
      };
    },
    [battingLineupRunners, battingTeam, getPlayerIdFromName, runnerNames],
  );

  const getLeadRunnerIdentity = useCallback(() => {
    const leadRunnerBase = gameState.bases.third
      ? "third"
      : gameState.bases.second
        ? "second"
        : gameState.bases.first
          ? "first"
          : null;
    if (!leadRunnerBase) {
      return { runnerId: undefined, runnerName: undefined };
    }
    return getRunnerIdentityForBase(leadRunnerBase);
  }, [
    gameState.bases.first,
    gameState.bases.second,
    gameState.bases.third,
    getRunnerIdentityForBase,
  ]);

  // Handler for lineup card substitutions (Phase 6)
  const handleLineupCardSubstitution = useCallback(
    (sub: SubstitutionData) => {
      console.log("LineupCard substitution:", sub);

      if (effectiveFranchiseId && sub.type === "double_switch") {
        console.warn(
          "[GameTracker] Double switch is disabled for Mode 2 v1 franchise games",
        );
        return;
      }

      // GAP-GT-7-C: Block substitution if the outgoing player is a pending PH who hasn't batted yet
      if (pendingPH && pendingPH === sub.outgoingPlayerId) {
        console.warn(
          `[GameTracker] Substitution blocked: PH ${sub.outgoingPlayerName} must bat before being replaced`,
        );
        // TODO: Show UI toast to user
        return;
      }

      const findTeamPlayer = (playerId?: string, playerName?: string) => {
        const teams: Array<"away" | "home"> = ["away", "home"];
        for (const team of teams) {
          const players = team === "away" ? awayTeamPlayers : homeTeamPlayers;
          const player = players.find(
            (candidate) =>
              (playerId && getRosterEntityId(candidate, team) === playerId) ||
              (playerName && candidate.name === playerName),
          );
          if (player) {
            return { team, player };
          }
        }
        return null;
      };

      if (sub.type === "pitching_change") {
        const pitchingTeam =
          resolvePitchingTeamSide(sub.outgoingPlayerId, sub.outgoingPlayerName) ||
          resolvePitchingTeamSide(sub.incomingPlayerId, sub.incomingPlayerName);
        if (!pitchingTeam) {
          console.warn(
            "[GameTracker] Pitching change rejected: unable to resolve team",
            sub,
          );
          return;
        }

        const setPitchers =
          pitchingTeam === "away" ? setAwayTeamPitchers : setHomeTeamPitchers;
        const incomingPositionPlayer = (
          pitchingTeam === "away" ? awayTeamPlayers : homeTeamPlayers
        ).find(
          (player) =>
            getRosterEntityId(player, pitchingTeam) === sub.incomingPlayerId ||
            player.name === sub.incomingPlayerName,
        );
        const applyPitcherDisplayChange = () => {
          setPitchers((previous) => {
            let foundIncomingPitcher = false;
            const nextPitchers = previous.map((pitcher) => {
              const pitcherId = getRosterEntityId(pitcher, pitchingTeam);
              if (pitcherId === sub.incomingPlayerId) {
                foundIncomingPitcher = true;
                return {
                  ...pitcher,
                  isActive: true,
                  isOutOfGame: false,
                };
              }
              if (pitcherId === sub.outgoingPlayerId) {
                return {
                  ...pitcher,
                  isActive: false,
                  isOutOfGame: gameState.gamePhase === "LIVE",
                };
              }
              return {
                ...pitcher,
                isActive: false,
              };
            });

            if (!foundIncomingPitcher) {
              nextPitchers.push({
                name:
                  incomingPositionPlayer?.name ||
                  sub.incomingPlayerName ||
                  sub.incomingPlayerId,
                fullName:
                  incomingPositionPlayer?.name ||
                  sub.incomingPlayerName ||
                  sub.incomingPlayerId,
                stats: { ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
                throwingHand: (incomingPositionPlayer?.throws || "R") as "L" | "R",
                throws: incomingPositionPlayer?.throws,
                isStarter: false,
                isActive: true,
                isOutOfGame: false,
                playerId: sub.incomingPlayerId,
                velocity: incomingPositionPlayer?.velocity,
                junk: incomingPositionPlayer?.junk,
                accuracy: incomingPositionPlayer?.accuracy,
                arsenal: incomingPositionPlayer?.arsenal,
                overallGrade: incomingPositionPlayer?.overallGrade,
                secondaryPosition: incomingPositionPlayer?.position,
                power: incomingPositionPlayer?.power,
                contact: incomingPositionPlayer?.contact,
                speed: incomingPositionPlayer?.speed,
                fieldingRating: incomingPositionPlayer?.fieldingRating,
                arm: incomingPositionPlayer?.arm,
              });
            }

            return nextPitchers;
          });
          syncDisplayedRostersToLineupSnapshot(getLineupStateSnapshot());
          setRosterVersion((v) => v + 1);
        };
        changePitcher(
          sub.incomingPlayerId,
          sub.outgoingPlayerId,
          pitchingTeam,
          sub.incomingPlayerName,
          sub.outgoingPlayerName,
          {
            beforeCommit: () => {
              undoSystem.captureSnapshot(
                `${sub.type}: ${sub.incomingPlayerId} for ${sub.outgoingPlayerId}`,
              );
            },
            afterCommit: applyPitcherDisplayChange,
          },
        );
      } else if (sub.type === "position_swap") {
        const incomingContext = findTeamPlayer(
          sub.incomingPlayerId,
          sub.incomingPlayerName,
        );
        const outgoingContext = findTeamPlayer(
          sub.outgoingPlayerId,
          sub.outgoingPlayerName,
        );
        const incomingPosition = incomingContext?.player.position;
        const outgoingPosition = outgoingContext?.player.position;

        if (!incomingPosition || !outgoingPosition) {
          console.warn(
            "[GameTracker] Position swap rejected: missing player context",
          );
          return;
        }

        undoSystem.captureSnapshot(
          `${sub.type}: ${sub.incomingPlayerId} for ${sub.outgoingPlayerId}`,
        );
        switchPositions([
          {
            playerId: sub.incomingPlayerId,
            newPosition: sub.newPosition || outgoingPosition,
          },
          { playerId: sub.outgoingPlayerId, newPosition: incomingPosition },
        ]);
        syncDisplayedRostersToLineupSnapshot(getLineupStateSnapshot());
        setRosterVersion((v) => v + 1);
      } else if (sub.type === "position_change") {
        const playerContext = findTeamPlayer(
          sub.incomingPlayerId,
          sub.incomingPlayerName,
        );
        if (!playerContext) {
          console.warn(
            "[GameTracker] Position change rejected: player not found",
          );
          return;
        }

        const teamPitchers =
          playerContext.team === "away" ? awayTeamPitchers : homeTeamPitchers;
        const teamPlayers =
          playerContext.team === "away" ? awayTeamPlayers : homeTeamPlayers;
        const teamUsesDh = inferTeamUsesDh(
          teamPlayers,
          teamPitchers,
          persistedUseDh ?? navigationState?.useDH,
        );
        const currentPosition = playerContext.player.position || "";

        if (!sub.newPosition || sub.newPosition === currentPosition) {
          return;
        }

        if (!teamUsesDh && sub.newPosition === "DH") {
          console.warn(
            "[GameTracker] Position change rejected: DH is not active in this game",
          );
          return;
        }

        undoSystem.captureSnapshot(
          `${sub.type}: ${sub.incomingPlayerId} for ${sub.outgoingPlayerId}`,
        );
        const occupiedPlayer = teamPlayers.find(
          (candidate) =>
            getRosterEntityId(candidate, playerContext.team) !==
              sub.incomingPlayerId &&
            candidate.battingOrder !== undefined &&
            !candidate.isOutOfGame &&
            candidate.position === sub.newPosition,
        );

        if (occupiedPlayer?.position) {
          switchPositions([
            { playerId: sub.incomingPlayerId, newPosition: sub.newPosition },
            {
              playerId: getRosterEntityId(occupiedPlayer, playerContext.team),
              newPosition: currentPosition,
            },
          ]);
        } else {
          switchPositions([
            { playerId: sub.incomingPlayerId, newPosition: sub.newPosition },
          ]);
        }

        syncDisplayedRostersToLineupSnapshot(getLineupStateSnapshot());
        setRosterVersion((v) => v + 1);
      } else if (sub.type === "player_sub" || sub.type === "double_switch") {
        // MAJ-06: Pass enriched options to makeSubstitution
        // MAJ-09: Check validation result before proceeding
        const isPinchHitter =
          sub.type !== "double_switch" &&
          sub.outgoingPlayerId === gameState?.currentBatterId;
        const subResult = makeSubstitution(
          sub.incomingPlayerId,
          sub.outgoingPlayerId,
          sub.incomingPlayerName,
          sub.outgoingPlayerName,
          {
            subType:
              sub.type === "double_switch"
                ? "double_switch"
                : isPinchHitter
                  ? "pinch_hit"
                  : "player_sub",
            newPosition: sub.newPosition,
            lineupSpot: sub.lineupSpot,
            isPinchHitter,
            beforeCommit: () => {
              undoSystem.captureSnapshot(
                `${sub.type}: ${sub.incomingPlayerId} for ${sub.outgoingPlayerId}`,
              );
            },
          },
        );
        if (!subResult.success) {
          console.warn(
            `[GameTracker] Substitution rejected: ${subResult.error}`,
          );
          // TODO: Show UI toast/notification to user
          return;
        }

        if (isPinchHitter) {
          // GAP-GT-7-C: Mark PH as pending — they must bat before being removed.
          setPendingPH(sub.incomingPlayerId);
        }

        // EXH-018 FIX: Also update local player arrays so UI reflects the substitution
        // Find which team the outgoing player is on and update that team's roster
        const updateTeamRoster = (
          players: Player[],
          setPlayers: React.Dispatch<React.SetStateAction<Player[]>>,
        ) => {
          const outgoingIndex = players.findIndex(
            (p) => p.name === sub.outgoingPlayerName,
          );
          const incomingIndex = players.findIndex(
            (p) => p.name === sub.incomingPlayerName,
          );

          if (outgoingIndex >= 0 && incomingIndex >= 0) {
            setPlayers((prev) => {
              const updated = [...prev];
              // Transfer batting order from outgoing to incoming player
              const outgoingBattingOrder = updated[outgoingIndex].battingOrder;
              const outgoingPosition =
                sub.newPosition || updated[outgoingIndex].position;

              // Incoming player takes the batting order and position
              updated[incomingIndex] = {
                ...updated[incomingIndex],
                battingOrder: outgoingBattingOrder,
                position: outgoingPosition,
              };

              // Outgoing player leaves the lineup slot; only live-game subs burn them.
              updated[outgoingIndex] = {
                ...updated[outgoingIndex],
                battingOrder: undefined,
                position: undefined,
                isOutOfGame: gameState.gamePhase === "LIVE",
              };

              const teamPitchers =
                setPlayers === setAwayTeamPlayers
                  ? awayTeamPitchers
                  : homeTeamPitchers;
              return normalizeRosterForDh(
                updated,
                teamPitchers,
                persistedUseDh ?? navigationState?.useDH,
              );
            });
            return true;
          }
          return false;
        };

        // Try away team first, then home team
        if (!updateTeamRoster(awayTeamPlayers, setAwayTeamPlayers)) {
          updateTeamRoster(homeTeamPlayers, setHomeTeamPlayers);
        }
      }
      queuePlayLogRefresh(80);
    },
    [
      awayTeamPitchers,
      awayTeamPlayers,
      changePitcher,
      effectiveFranchiseId,
      fieldingTeam,
      gameState?.currentBatterId,
      gameState.gamePhase,
      getLineupStateSnapshot,
      getRosterEntityId,
      homeTeamPitchers,
      homeTeamPlayers,
      makeSubstitution,
      persistedUseDh,
      navigationState?.useDH,
      pendingPH,
      queuePlayLogRefresh,
      resolveRosterTeamSide,
      setPendingPH,
      switchPositions,
      syncDisplayedRostersToLineupSnapshot,
      undoSystem,
    ],
  );

  // ══════════════════════════════════════════════════════════════
  // QUICK BAR HANDLER — §3.2 one-tap execution flow
  // Tap → snapshot context → calculateRunnerDefaults → capture undo
  // → calculate RBI → record play → log → update diamond
  // QuickBar remains the canonical live at-bat creation path.
  // ══════════════════════════════════════════════════════════════

  // Outcome classification for Quick Bar buttons
  const QUICK_BAR_HITS: readonly string[] = ["1B", "2B", "3B", "HR", "GRD"]; // GRD = Ground Rule Double
  const QUICK_BAR_OUTS: readonly string[] = [
    "K",
    "GO",
    "FO",
    "FLO",
    "LO",
    "PO",
    "DP",
    "TP",
    "SF",
    "SAC",
  ];
  const QUICK_BAR_WALKS: readonly string[] = ["BB", "HBP", "IBB"];

  // REMOVED per UX-022: Pre-commit runner gate eliminated.
  // Runner corrections are now post-commit via play log or lineup column tap.
  // Keeping commented for reference during Tier 3 runner sub-entry implementation.
  // const handleRunnerCorrectionChange = useCallback((updated: RunnerDefaults) => { ... }, []);
  // const handleRunnerCorrectionCancel = useCallback(() => { ... }, []);
  // const handleRunnerCorrectionCommit = useCallback(async () => { ... }, []);

  const handleRunnerCaughtByChange = useCallback(
    async (caughtBy: number | null) => {
      if (!selectedBetweenPlayEvent?.stolenBase) return;

      const previousValue =
        selectedBetweenPlayEvent.stolenBase.caughtBy ?? null;
      if (previousValue === caughtBy) return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: "stolenBase.caughtBy",
            oldValue: previousValue,
            newValue: caughtBy,
            timestamp,
          },
        ],
        stolenBase: {
          ...selectedBetweenPlayEvent.stolenBase,
          ...(caughtBy == null ? { caughtBy: undefined } : { caughtBy }),
        },
      };

      setSelectedBetweenPlayEventSaving(true);
      try {
        await updateBetweenPlayEvent(selectedBetweenPlayEvent.eventId, {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          stolenBase: nextEvent.stolenBase,
        });
        setSelectedBetweenPlayEvent(nextEvent);
        queuePlayLogRefresh(0);
      } catch (error) {
        console.error(
          "[Historical Runner Edit] Failed to update fielder attribution:",
          error,
        );
      } finally {
        setSelectedBetweenPlayEventSaving(false);
      }
    },
    [queuePlayLogRefresh, selectedBetweenPlayEvent],
  );

  const handleRunnerEventTypeChange = useCallback(
    async (eventType: "wild_pitch" | "passed_ball") => {
      if (
        !selectedBetweenPlayEvent?.runnerAction ||
        (selectedBetweenPlayEvent.type !== "wild_pitch" &&
          selectedBetweenPlayEvent.type !== "passed_ball")
      ) {
        return;
      }
      if (selectedBetweenPlayEvent.type === eventType) return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        type: eventType,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: "type",
            oldValue: selectedBetweenPlayEvent.type,
            newValue: eventType,
            timestamp,
          },
          {
            field: "runnerAction.reason",
            oldValue: selectedBetweenPlayEvent.runnerAction.reason,
            newValue: eventType,
            timestamp,
          },
        ],
        runnerAction: {
          ...selectedBetweenPlayEvent.runnerAction,
          reason: eventType,
        },
        errorChargedTo: eventType === "wild_pitch" ? "pitcher" : "catcher",
        wildPitchOrPassedBall: selectedBetweenPlayEvent.wildPitchOrPassedBall
          ? {
              ...selectedBetweenPlayEvent.wildPitchOrPassedBall,
              wpOrPb: eventType,
            }
          : selectedBetweenPlayEvent.runnerAttribution?.pitcherId
            ? {
                wpOrPb: eventType,
                pitcherId: selectedBetweenPlayEvent.runnerAttribution.pitcherId,
                catcherId: selectedBetweenPlayEvent.runnerAttribution.catcherId,
              }
            : undefined,
      };

      setSelectedBetweenPlayEventSaving(true);
      try {
        await updateBetweenPlayEvent(selectedBetweenPlayEvent.eventId, {
          type: nextEvent.type,
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-2),
          runnerAction: nextEvent.runnerAction,
          errorChargedTo: nextEvent.errorChargedTo,
          wildPitchOrPassedBall: nextEvent.wildPitchOrPassedBall,
        });
        setSelectedBetweenPlayEvent(nextEvent);
        queuePlayLogRefresh(0);
      } catch (error) {
        console.error(
          "[Historical Runner Edit] Failed to update WP/PB event type:",
          error,
        );
      } finally {
        setSelectedBetweenPlayEventSaving(false);
      }
    },
    [queuePlayLogRefresh, selectedBetweenPlayEvent],
  );

  const handleRunnerPitcherAttributionChange = useCallback(
    async (pitcherId: string) => {
      if (!selectedBetweenPlayEvent?.runnerAction) return;
      const previousPitcherId =
        selectedBetweenPlayEvent.runnerAttribution?.pitcherId ||
        selectedBetweenPlayEvent.wildPitchOrPassedBall?.pitcherId;
      if (previousPitcherId === pitcherId) return;

      const pitcherLabel = historicalPitcherOptions.find(
        (option) => option.id === pitcherId,
      )?.label;
      setSelectedBetweenPlayEventSaving(true);
      try {
        const nextEvent = await reassignRunnerEventAttribution(
          selectedBetweenPlayEvent.eventId,
          {
            pitcherId,
            pitcherName: pitcherLabel,
          },
        );
        if (nextEvent) {
          setSelectedBetweenPlayEvent(nextEvent);
        }
        queuePlayLogRefresh(0);
      } catch (error) {
        console.error(
          "[Historical Runner Edit] Failed to update runner-event pitcher attribution:",
          error,
        );
      } finally {
        setSelectedBetweenPlayEventSaving(false);
      }
    },
    [
      historicalPitcherOptions,
      queuePlayLogRefresh,
      reassignRunnerEventAttribution,
      selectedBetweenPlayEvent,
    ],
  );

  const handleRunnerCatcherAttributionChange = useCallback(
    async (catcherId: string) => {
      if (!selectedBetweenPlayEvent?.runnerAction) return;
      const normalizedCatcherId = catcherId || undefined;
      const previousCatcherId =
        selectedBetweenPlayEvent.runnerAttribution?.catcherId ||
        selectedBetweenPlayEvent.wildPitchOrPassedBall?.catcherId;
      if (previousCatcherId === normalizedCatcherId) return;

      const catcherLabel = historicalCatcherOptions.find(
        (option) => option.id === catcherId,
      )?.label;
      setSelectedBetweenPlayEventSaving(true);
      try {
        const nextEvent = await reassignRunnerEventAttribution(
          selectedBetweenPlayEvent.eventId,
          {
            catcherId: normalizedCatcherId,
            catcherName: catcherLabel,
          },
        );
        if (nextEvent) {
          setSelectedBetweenPlayEvent(nextEvent);
        }
        queuePlayLogRefresh(0);
      } catch (error) {
        console.error(
          "[Historical Runner Edit] Failed to update passed-ball catcher attribution:",
          error,
        );
      } finally {
        setSelectedBetweenPlayEventSaving(false);
      }
    },
    [
      historicalCatcherOptions,
      queuePlayLogRefresh,
      reassignRunnerEventAttribution,
      selectedBetweenPlayEvent,
    ],
  );

  const handleRunnerFielderAttributionChange = useCallback(
    async (fielderId: string) => {
      if (!selectedBetweenPlayEvent?.runnerAction) return;
      const normalizedFielderId = fielderId || undefined;
      if (
        selectedBetweenPlayEvent.runnerAttribution?.fielderId ===
        normalizedFielderId
      )
        return;

      const fielderOption = historicalFielderOptions.find(
        (option) => option.id === fielderId,
      );
      setSelectedBetweenPlayEventSaving(true);
      try {
        const nextEvent = await reassignRunnerEventAttribution(
          selectedBetweenPlayEvent.eventId,
          {
            fielderId: normalizedFielderId,
            fielderName: fielderOption?.label,
          },
        );
        if (nextEvent) {
          setSelectedBetweenPlayEvent(nextEvent);
        }
        queuePlayLogRefresh(0);
      } catch (error) {
        console.error(
          "[Historical Runner Edit] Failed to update runner-event fielder attribution:",
          error,
        );
      } finally {
        setSelectedBetweenPlayEventSaving(false);
      }
    },
    [
      historicalFielderOptions,
      queuePlayLogRefresh,
      reassignRunnerEventAttribution,
      selectedBetweenPlayEvent,
    ],
  );

  const applyHistoricalStructuralReplayEdit = useCallback(
    async (
      nextEvent: BetweenPlayEvent,
      updates: Partial<BetweenPlayEvent>,
      errorLabel: string,
    ) => {
      setSelectedBetweenPlayEventSaving(true);
      try {
        await updateBetweenPlayEvent(nextEvent.eventId, updates);
        await recomputeCommittedManagerWpa(errorLabel);

        const reloaded = await loadExistingGame({ preferSnapshot: false });
        if (!reloaded) {
          throw new Error(
            `Failed to reload game from durable event log after ${errorLabel}`,
          );
        }

        syncDisplayedRostersToLineupSnapshot();
        setRosterVersion((v) => v + 1);
        setSelectedBetweenPlayEvent(nextEvent);
        queuePlayLogRefresh(0);
      } catch (error) {
        console.error(
          `[Historical Lineup Edit] Failed to ${errorLabel}:`,
          error,
        );
      } finally {
        setSelectedBetweenPlayEventSaving(false);
      }
    },
    [
      loadExistingGame,
      queuePlayLogRefresh,
      recomputeCommittedManagerWpa,
      syncDisplayedRostersToLineupSnapshot,
    ],
  );

  const applyHistoricalContextEdit = useCallback(
    async (
      nextEvent: BetweenPlayEvent,
      updates: Partial<BetweenPlayEvent>,
      errorLabel: string,
    ) => {
      setSelectedBetweenPlayEventSaving(true);
      try {
        await updateBetweenPlayEvent(nextEvent.eventId, updates);
        await recomputeCommittedManagerWpa(errorLabel);
        if (nextEvent.playerStateChange?.stateType === "mojo") {
          playerStateHook.setMojo(
            nextEvent.playerStateChange.playerId,
            Number(nextEvent.playerStateChange.newValue) as MojoLevel,
          );
        } else if (nextEvent.playerStateChange?.stateType === "fitness") {
          playerStateHook.setFitness(
            nextEvent.playerStateChange.playerId,
            nextEvent.playerStateChange.newValue as FitnessState,
          );
        }
        setSelectedBetweenPlayEvent(nextEvent);
        queuePlayLogRefresh(0);
      } catch (error) {
        console.error(
          `[Historical Context Edit] Failed to ${errorLabel}:`,
          error,
        );
      } finally {
        setSelectedBetweenPlayEventSaving(false);
      }
    },
    [playerStateHook, queuePlayLogRefresh, recomputeCommittedManagerWpa],
  );

  const syncLinkedPlayerStateEvent = useCallback(
    async (
      sourceEvent: BetweenPlayEvent,
      field: "newValue" | "reason" | "stayedIn",
      newValue: string | number | boolean | undefined,
    ) => {
      if (!sourceEvent.linkedEventId) return;

      const linkedEvent = await getBetweenPlayEvent(sourceEvent.linkedEventId);
      if (!linkedEvent?.playerStateChange) return;

      const previousValue = linkedEvent.playerStateChange[field];
      if (previousValue === newValue) return;

      const timestamp = Date.now();
      await updateBetweenPlayEvent(linkedEvent.eventId, {
        version: (linkedEvent.version ?? 1) + 1,
        editHistory: [
          {
            field: `playerStateChange.${field}`,
            oldValue: previousValue,
            newValue,
            timestamp,
          },
        ],
        playerStateChange: {
          ...linkedEvent.playerStateChange,
          [field]: newValue,
        },
      });
    },
    [],
  );

  const handleHistoricalInjuryStayedInChange = useCallback(
    async (stayedIn: boolean) => {
      if (
        selectedBetweenPlayEvent?.type !== "injury" ||
        !selectedBetweenPlayEvent.playerStateChange
      )
        return;
      if (selectedBetweenPlayEvent.playerStateChange.stayedIn === stayedIn)
        return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: "playerStateChange.stayedIn",
            oldValue: selectedBetweenPlayEvent.playerStateChange.stayedIn,
            newValue: stayedIn,
            timestamp,
          },
        ],
        playerStateChange: {
          ...selectedBetweenPlayEvent.playerStateChange,
          stayedIn,
        },
      };

      await applyHistoricalContextEdit(
        nextEvent,
        {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          playerStateChange: nextEvent.playerStateChange,
        },
        "update injury stayed-in flag",
      );
      await syncLinkedPlayerStateEvent(nextEvent, "stayedIn", stayedIn);
    },
    [
      applyHistoricalContextEdit,
      selectedBetweenPlayEvent,
      syncLinkedPlayerStateEvent,
    ],
  );

  const handleHistoricalPositionChange = useCallback(
    async (newPosition: string) => {
      if (
        selectedBetweenPlayEvent?.type !== "position_change" ||
        !selectedBetweenPlayEvent.substitution
      ) {
        return;
      }

      const previousValue =
        selectedBetweenPlayEvent.substitution.inPosition ||
        selectedBetweenPlayEvent.substitution.previousPosition ||
        null;
      if (previousValue === newPosition) return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: "substitution.inPosition",
            oldValue: previousValue,
            newValue: newPosition,
            timestamp,
          },
        ],
        substitution: {
          ...selectedBetweenPlayEvent.substitution,
          inPosition: newPosition,
        },
      };
      await applyHistoricalStructuralReplayEdit(
        nextEvent,
        {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          substitution: nextEvent.substitution,
        },
        "update position change",
      );
    },
    [applyHistoricalStructuralReplayEdit, selectedBetweenPlayEvent],
  );

  const handleHistoricalSubstitutionPlayerChange = useCallback(
    async (field: "outPlayer" | "inPlayer", playerId: string) => {
      if (
        selectedBetweenPlayEvent?.type !== "substitution" ||
        !selectedBetweenPlayEvent.substitution ||
        !selectedHistoricalTeamSide
      ) {
        return;
      }

      const selectedPlayer = historicalLineupOptions.find(
        (option) => option.id === playerId,
      );
      if (!selectedPlayer) return;

      const fieldKey = field === "outPlayer" ? "outPlayerId" : "inPlayerId";
      const nameKey = field === "outPlayer" ? "outPlayerName" : "inPlayerName";
      const previousValue = selectedBetweenPlayEvent.substitution[fieldKey];
      if (previousValue === playerId) return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: `substitution.${fieldKey}`,
            oldValue: previousValue,
            newValue: playerId,
            timestamp,
          },
        ],
        substitution: {
          ...selectedBetweenPlayEvent.substitution,
          [fieldKey]: playerId,
          [nameKey]: selectedPlayer.label,
        },
      };

      await applyHistoricalStructuralReplayEdit(
        nextEvent,
        {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          substitution: nextEvent.substitution,
        },
        "update substitution player",
      );
    },
    [
      applyHistoricalStructuralReplayEdit,
      historicalLineupOptions,
      selectedBetweenPlayEvent,
      selectedHistoricalTeamSide,
    ],
  );

  const handleHistoricalSubstitutionPositionChange = useCallback(
    async (newPosition: string) => {
      if (
        selectedBetweenPlayEvent?.type !== "substitution" ||
        !selectedBetweenPlayEvent.substitution
      ) {
        return;
      }

      const previousValue =
        selectedBetweenPlayEvent.substitution.inPosition ||
        selectedBetweenPlayEvent.substitution.outPosition ||
        null;
      if (previousValue === newPosition) return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: "substitution.inPosition",
            oldValue: previousValue,
            newValue: newPosition,
            timestamp,
          },
        ],
        substitution: {
          ...selectedBetweenPlayEvent.substitution,
          inPosition: newPosition,
        },
      };

      await applyHistoricalStructuralReplayEdit(
        nextEvent,
        {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          substitution: nextEvent.substitution,
        },
        "update substitution position",
      );
    },
    [applyHistoricalStructuralReplayEdit, selectedBetweenPlayEvent],
  );

  const handleHistoricalPitcherChange = useCallback(
    async (field: "outgoingPitcher" | "incomingPitcher", pitcherId: string) => {
      if (
        selectedBetweenPlayEvent?.type !== "pitcher_change" ||
        !selectedBetweenPlayEvent.pitcherChange
      ) {
        return;
      }

      const selectedPitcher = historicalPitcherOptions.find(
        (option) => option.id === pitcherId,
      );
      if (!selectedPitcher) return;

      const fieldKey =
        field === "outgoingPitcher" ? "outgoingPitcherId" : "incomingPitcherId";
      const nameKey =
        field === "outgoingPitcher"
          ? "outgoingPitcherName"
          : "incomingPitcherName";
      const previousValue = selectedBetweenPlayEvent.pitcherChange[fieldKey];
      if (previousValue === pitcherId) return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: `pitcherChange.${fieldKey}`,
            oldValue: previousValue,
            newValue: pitcherId,
            timestamp,
          },
        ],
        pitcherChange: {
          ...selectedBetweenPlayEvent.pitcherChange,
          [fieldKey]: pitcherId,
          [nameKey]: selectedPitcher.label,
        },
      };

      await applyHistoricalStructuralReplayEdit(
        nextEvent,
        {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          pitcherChange: nextEvent.pitcherChange,
        },
        "update pitcher change",
      );
    },
    [
      applyHistoricalStructuralReplayEdit,
      historicalPitcherOptions,
      selectedBetweenPlayEvent,
    ],
  );

  const handleHistoricalContextValueChange = useCallback(
    async (value: string) => {
      if (!selectedBetweenPlayEvent?.playerStateChange) return;
      const { playerStateChange } = selectedBetweenPlayEvent;
      if (playerStateChange.stateType === "injury") return;
      const normalizedValue =
        playerStateChange.stateType === "mojo" ? Number(value) : value;
      if (playerStateChange.newValue === normalizedValue) return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: "playerStateChange.newValue",
            oldValue: playerStateChange.newValue,
            newValue: normalizedValue,
            timestamp,
          },
        ],
        playerStateChange: {
          ...playerStateChange,
          newValue: normalizedValue,
        },
      };

      await applyHistoricalContextEdit(
        nextEvent,
        {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          playerStateChange: nextEvent.playerStateChange,
        },
        "update context value",
      );
      if (
        playerStateChange.stateType === "fitness" &&
        playerStateChange.sourceEventType === "KILLED_PITCHER"
      ) {
        await syncLinkedPlayerStateEvent(
          nextEvent,
          "newValue",
          normalizedValue,
        );
      }
    },
    [
      applyHistoricalContextEdit,
      selectedBetweenPlayEvent,
      syncLinkedPlayerStateEvent,
    ],
  );

  const handleHistoricalContextReasonChange = useCallback(
    async (reason: string) => {
      if (!selectedBetweenPlayEvent?.playerStateChange) return;
      if (
        selectedBetweenPlayEvent.playerStateChange.stateType === "fitness" &&
        selectedBetweenPlayEvent.playerStateChange.sourceEventType ===
          "KILLED_PITCHER" &&
        selectedBetweenPlayEvent.linkedEventId
      ) {
        return;
      }
      const previousReason =
        selectedBetweenPlayEvent.playerStateChange.reason || "";
      if (previousReason === reason) return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: "playerStateChange.reason",
            oldValue: previousReason,
            newValue: reason,
            timestamp,
          },
        ],
        playerStateChange: {
          ...selectedBetweenPlayEvent.playerStateChange,
          reason,
        },
      };

      await applyHistoricalContextEdit(
        nextEvent,
        {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          playerStateChange: nextEvent.playerStateChange,
        },
        "update context reason",
      );
      if (selectedBetweenPlayEvent.playerStateChange.stateType === "injury") {
        await syncLinkedPlayerStateEvent(nextEvent, "reason", reason);
      }
    },
    [
      applyHistoricalContextEdit,
      selectedBetweenPlayEvent,
      syncLinkedPlayerStateEvent,
    ],
  );

  const handleHistoricalManagerMomentChange = useCallback(
    async (
      field: "decisionType" | "context" | "leverageIndex",
      value: string,
    ) => {
      if (
        selectedBetweenPlayEvent?.type !== "manager_moment" ||
        !selectedBetweenPlayEvent.managerMoment
      )
        return;

      const normalizedValue = field === "leverageIndex" ? Number(value) : value;
      if (selectedBetweenPlayEvent.managerMoment[field] === normalizedValue)
        return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: `managerMoment.${field}`,
            oldValue: selectedBetweenPlayEvent.managerMoment[field],
            newValue: normalizedValue,
            timestamp,
          },
        ],
        managerMoment: {
          ...selectedBetweenPlayEvent.managerMoment,
          [field]: normalizedValue,
        },
      };

      await applyHistoricalContextEdit(
        nextEvent,
        {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          managerMoment: nextEvent.managerMoment,
        },
        "update manager moment",
      );
    },
    [applyHistoricalContextEdit, selectedBetweenPlayEvent],
  );

  const handleHistoricalPitchCountValueChange = useCallback(
    async (pitchCount: number) => {
      if (!Number.isFinite(pitchCount)) return;
      if (
        selectedBetweenPlayEvent?.type !== "pitch_count_update" ||
        !selectedBetweenPlayEvent.pitchCountUpdate
      )
        return;
      if (selectedBetweenPlayEvent.pitchCountUpdate.pitchCount === pitchCount)
        return;

      const timestamp = Date.now();
      const nextEvent: BetweenPlayEvent = {
        ...selectedBetweenPlayEvent,
        version: (selectedBetweenPlayEvent.version ?? 1) + 1,
        editHistory: [
          ...(selectedBetweenPlayEvent.editHistory || []),
          {
            field: "pitchCountUpdate.pitchCount",
            oldValue: selectedBetweenPlayEvent.pitchCountUpdate.pitchCount,
            newValue: pitchCount,
            timestamp,
          },
        ],
        pitchCountUpdate: {
          ...selectedBetweenPlayEvent.pitchCountUpdate,
          pitchCount,
        },
      };

      await applyHistoricalContextEdit(
        nextEvent,
        {
          version: nextEvent.version,
          editHistory: nextEvent.editHistory?.slice(-1),
          pitchCountUpdate: nextEvent.pitchCountUpdate,
        },
        "update pitch count",
      );
    },
    [applyHistoricalContextEdit, selectedBetweenPlayEvent],
  );

  const handleQuickBarOutcome = useCallback(
    async (outcome: string) => {
      if (!gameInitialized) return;

      // 1. Snapshot current context
      const bases = { ...gameState.bases };
      const outs = gameState.outs;

      // UX-048: Ꝁ (called strikeout) routes same as Kc for stat/storage purposes
      const effectiveOutcome = outcome === "Ꝁ" ? "Kc" : outcome;
      if (
        effectiveOutcome === "FC" &&
        !bases.first &&
        !bases.second &&
        !bases.third
      ) {
        return;
      }

      playAudio("quickBarTap");

      // §4.3: Set processing feedback — button stays depressed until done
      setProcessingOutcome(outcome);

      if (effectiveOutcome === "K" || effectiveOutcome === "Kc") {
        playAudio("strikeout");
      }
      if (effectiveOutcome === "HR" || effectiveOutcome === "ITPHR") {
        pendingScoreCelebrationSoundRef.current = "homeRun";
      }

      const correction = buildRunnerCorrectionForQuickBarOutcome(
        effectiveOutcome,
        bases,
        outs,
      );
      const defaults = correction?.defaults;
      const promptDefaults =
        defaults ||
        (effectiveOutcome === "HR" || effectiveOutcome === "ITPHR"
          ? calculateRunnerDefaults(
              { type: "hr", hitType: "HR", fieldingSequence: [] } as PlayData,
              bases,
              outs,
            )
          : effectiveOutcome === "E"
            ? calculateRunnerDefaults(
                { type: "error", fieldingSequence: [] } as PlayData,
                bases,
                outs,
              )
            : undefined);

      // 6. Capture undo snapshot
      undoSystem.captureSnapshot(
        `${shortInningLabel()} ${gameState.currentBatterName} ${outcome}`,
      );

      try {
        const effectiveDefaults = defaults || promptDefaults;
        const runnerAdv = effectiveDefaults
          ? runnerDefaultsToAdvancement(effectiveDefaults)
          : undefined;
        const rbi = correction
          ? countRbiFromDefaults(correction.defaults, correction.action)
          : effectiveDefaults
            ? countRbiFromDefaults(effectiveDefaults, {
                type: "hit",
                hitType: effectiveOutcome as HitType,
              })
            : 0;

        // 7. Route to correct recording function
        if (effectiveOutcome === "HR" || effectiveOutcome === "ITPHR") {
          // D-4: Show inline HR prompt for distance + pitch type before recording
          if (!promptDefaults) {
            setProcessingOutcome(null);
            return;
          }
          setHrPrompt({
            rbi,
            runnerAdv,
            defaults: promptDefaults,
            distance: "",
            pitchType: "",
          });
          setProcessingOutcome(null);
          return; // Recording deferred to handleHrPromptDone
        } else if (effectiveOutcome === "E") {
          // D-3: Show error flow prompts (base → fielder → type)
          if (!promptDefaults) {
            setProcessingOutcome(null);
            return;
          }
          setErrorFlow({
            step: "base",
            baseReached: "1B",
            fielderPosition: 0,
            defaults: promptDefaults,
          });
          setProcessingOutcome(null);
          return; // Recording deferred to handleErrorFlowComplete
        } else if (
          (effectiveOutcome === "FO" || effectiveOutcome === "FLO") &&
          bases.third &&
          outs < 2
        ) {
          // D-5: FO/FLO with R3 + <2 outs → SF prompt
          if (!defaults) {
            setProcessingOutcome(null);
            return;
          }
          setSfPrompt({
            outType: effectiveOutcome,
            runnerAdv,
            defaults,
          });
          setProcessingOutcome(null);
          return; // Deferred to handleSfPromptAnswer
        } else if (
          effectiveOutcome === "GO" &&
          (bases.first || bases.second || bases.third) &&
          outs < 2
        ) {
          // D-6: GO with runners + <2 outs → check if runner default shows out → DP prompt
          if (!defaults) {
            setProcessingOutcome(null);
            return;
          }
          const hasRunnerOut =
            defaults.first?.to === "out" ||
            defaults.second?.to === "out" ||
            defaults.third?.to === "out";
          if (hasRunnerOut) {
            setDpPrompt({ runnerAdv, rbi, defaults });
            setProcessingOutcome(null);
            return; // Deferred to handleDpPromptAnswer
          }
          // No runner out in defaults → standard GO, fall through
          await commitPlateAppearanceAndAppend({
            type: "out",
            outType: "GO",
            runnerAdvancement: runnerAdv,
          });
          logAction("GO");
        } else if (
          effectiveOutcome === "PO" &&
          outs < 2 &&
          bases.first &&
          bases.second
        ) {
          // D-7: PO with R1+R2 (or loaded) + <2 outs → IFR prompt
          if (!defaults) {
            setProcessingOutcome(null);
            return;
          }
          setIfrPrompt({ runnerAdv, defaults });
          setProcessingOutcome(null);
          return; // Deferred to handleIfrPromptAnswer
        } else if (correction) {
          // UX-022: Immediate commit — no pre-commit runner correction gate.
          // Runner corrections are post-commit via play log or lineup column tap.
          const runnerAdvancement = runnerDefaultsToAdvancement(
            correction.defaults,
          );
          const immediateRbi = countRbiFromDefaults(
            correction.defaults,
            correction.action,
          );

          if (correction.action.type === "hit") {
            await commitPlateAppearanceAndAppend({
              type: "hit",
              hitType: correction.action.hitType,
              rbi: immediateRbi,
              runnerAdvancement,
            });
          } else if (correction.action.type === "walk") {
            await commitPlateAppearanceAndAppend({
              type: "walk",
              walkType: correction.action.walkType,
            });
          } else {
            await commitPlateAppearanceAndAppend({
              type: "out",
              outType: correction.action.outType,
              runnerAdvancement,
              batterReached: correction.action.batterReached,
              isDroppedThirdStrike: correction.action.isDroppedThirdStrike,
              forceNoRuns: correction.action.forceNoRuns,
              dropReason: correction.action.dropReason,
            });
          }

          const resultText =
            correction.action.type === "hit" && immediateRbi > 0
              ? `${correction.outcomeLabel} — ${immediateRbi} RBI`
              : correction.outcomeLabel;
          logAction(resultText);

          setRunnerNames(
            applyRunnerDefaultsToNames(
              correction.defaults,
              runnerNames,
              gameState.currentBatterName,
            ),
          );
        } else {
          // Unknown — just log
          logAction(`[QB] ${outcome}`);
        }
      } catch (error) {
        if (effectiveOutcome === "HR" || effectiveOutcome === "ITPHR") {
          pendingScoreCelebrationSoundRef.current = null;
        }
        console.error(`[QuickBar] Failed to record ${outcome}:`, error);
      } finally {
        setProcessingOutcome(null);
      }
    },
    [
      commitPlateAppearanceAndAppend,
      gameInitialized,
      gameState,
      logAction,
      playAudio,
      undoSystem,
    ],
  );

  // ═══════════════════════════════════════════════════════════
  // D-4: HR inline prompt completion
  // ═══════════════════════════════════════════════════════════
  const handleHrPromptDone = useCallback(async () => {
    if (!hrPrompt) return;
    const { rbi, runnerAdv, defaults, distance, pitchType } = hrPrompt;
    const atBatEventId = getPendingAtBatIdentity().atBatEventId;

    // Attach enrichment if distance or pitch type provided
    if (distance || pitchType) {
      const enrichment: Record<string, unknown> = {};
      if (distance) enrichment.hrDistance = parseInt(distance, 10);
      if (pitchType) enrichment.pitchType = pitchType;
      setNextEventEnrichment(
        enrichment as NonNullable<
          import("../../../utils/eventLog").AtBatEvent["enrichment"]
        >,
      );
    }

    try {
      await commitPlateAppearance({
        type: "hit",
        hitType: "HR",
        rbi,
        runnerAdvancement: runnerAdv,
      });
      logAction(
        `HR${rbi > 0 ? ` — ${rbi} RBI` : ""}${distance ? ` (${distance} ft)` : ""}`,
      );
      await appendCommittedAtBatEntry(atBatEventId);

      // Update runner names (HR: all score, batter scores)
      setRunnerNames({});
    } catch (error) {
      console.error("[D-4] Failed to record HR:", error);
    }
    setHrPrompt(null);
  }, [
    appendCommittedAtBatEntry,
    commitPlateAppearance,
    getPendingAtBatIdentity,
    hrPrompt,
    logAction,
    setNextEventEnrichment,
  ]);

  const handleHrPromptSkip = useCallback(async () => {
    if (!hrPrompt) return;
    const { rbi, runnerAdv } = hrPrompt;
    const atBatEventId = getPendingAtBatIdentity().atBatEventId;
    try {
      await commitPlateAppearance({
        type: "hit",
        hitType: "HR",
        rbi,
        runnerAdvancement: runnerAdv,
      });
      logAction(`HR${rbi > 0 ? ` — ${rbi} RBI` : ""}`);
      await appendCommittedAtBatEntry(atBatEventId);
      setRunnerNames({});
    } catch (error) {
      console.error("[D-4] Failed to record HR (skip):", error);
    }
    setHrPrompt(null);
  }, [
    appendCommittedAtBatEntry,
    commitPlateAppearance,
    getPendingAtBatIdentity,
    hrPrompt,
    logAction,
  ]);

  const handleQuickErrorDetail = useCallback(
    async (positionLabel: keyof typeof POSITION_NUMBER) => {
      const fielderPosition = POSITION_NUMBER[positionLabel];
      const eventId = getPendingAtBatIdentity().atBatEventId;

      setNextEventEnrichment({
        fieldingSequence: [fielderPosition],
        errorFielder: fielderPosition,
      } as NonNullable<
        import("../../../utils/eventLog").AtBatEvent["enrichment"]
      >);

      try {
        await commitPlateAppearance({ type: "error", rbi: 0 });
        await persistFieldingEventsForPlayData(
          {
            type: "error",
            fieldingSequence: [fielderPosition!],
            errorFielder: fielderPosition,
          },
          "quick error",
        );
        logAction(`E${positionLabel}`);
        await appendCommittedAtBatEntry(eventId);
      } catch (error) {
        console.error("[Quick Error] Failed to record error detail:", error);
      } finally {
        setExpandedOutcome(null);
      }
    },
    [
      appendCommittedAtBatEntry,
      commitPlateAppearance,
      getPendingAtBatIdentity,
      logAction,
      persistFieldingEventsForPlayData,
      setNextEventEnrichment,
    ],
  );

  // ═══════════════════════════════════════════════════════════
  // D-3: Error flow prompt completion
  // ═══════════════════════════════════════════════════════════
  const handleErrorFlowComplete = useCallback(
    async (
      baseReached: string,
      fielderPosition: number,
      errorType: PlayData["errorType"],
    ) => {
      if (!errorFlow) return;
      const atBatEventId = getPendingAtBatIdentity().atBatEventId;

      // Build runner advancement for error (batter reaches specified base)
      // Runners use standard defaults for the error
      const runnerAdv: RunnerAdvancement = {};
      const bases = gameState.bases;
      // On error, advance existing runners by 1 base (standard default)
      if (bases.third) runnerAdv.fromThird = "home";
      if (bases.second) runnerAdv.fromSecond = "third";
      if (bases.first) runnerAdv.fromFirst = "second";

      const rbi = 0; // Errors never get RBI per baseball rules

      // Set enrichment with fielder and error type info
      const enrichment: Record<string, unknown> = {};
      if (fielderPosition > 0) {
        enrichment.fieldingSequence = [fielderPosition];
        enrichment.errorFielder = fielderPosition;
      }
      if (errorType) enrichment.errorType = errorType;
      setNextEventEnrichment(
        enrichment as NonNullable<
          import("../../../utils/eventLog").AtBatEvent["enrichment"]
        >,
      );

      try {
        await commitPlateAppearance({
          type: "error",
          rbi,
          runnerAdvancement: runnerAdv,
        });
        await persistFieldingEventsForPlayData({
          type: "error",
          fieldingSequence: fielderPosition > 0 ? [fielderPosition] : [],
          errorFielder: fielderPosition || undefined,
          errorType: errorType || undefined,
        });
        logAction(
          `E${fielderPosition || ""}${errorType ? ` (${errorType})` : ""} — batter to ${baseReached}`,
        );
        await appendCommittedAtBatEntry(atBatEventId);

        // Update runner names
        const newNames: { first?: string; second?: string; third?: string } =
          {};
        const batterName = gameState.currentBatterName;
        if (bases.second && !bases.third) newNames.third = runnerNames.second;
        if (bases.first && !bases.second) newNames.second = runnerNames.first;
        // Place batter
        if (baseReached === "1B") newNames.first = batterName;
        else if (baseReached === "2B") newNames.second = batterName;
        else if (baseReached === "3B") newNames.third = batterName;
        setRunnerNames(newNames);
      } catch (error) {
        console.error("[D-3] Failed to record error:", error);
      }
      setErrorFlow(null);
    },
    [
      appendCommittedAtBatEntry,
      commitPlateAppearance,
      errorFlow,
      gameState,
      getPendingAtBatIdentity,
      logAction,
      persistFieldingEventsForPlayData,
      runnerNames,
      setNextEventEnrichment,
      undoSystem,
    ],
  );

  // ═══════════════════════════════════════════════════════════
  // D-5: SF prompt answer — "Sac fly — run scores?"
  // ═══════════════════════════════════════════════════════════
  const handleSfPromptAnswer = useCallback(
    async (isYes: boolean) => {
      if (!sfPrompt) return;
      const { outType, runnerAdv, defaults } = sfPrompt;
      const atBatEventId = getPendingAtBatIdentity().atBatEventId;
      try {
        if (isYes) {
          // SF: runner scores from 3rd, batter out, not an AB
          const sfAdv: RunnerAdvancement = { ...runnerAdv, fromThird: "home" };
          await commitPlateAppearance({
            type: "out",
            outType: "SF",
            runnerAdvancement: sfAdv,
          });
          logAction("SF — run scores");
        } else {
          // FO/FLO: runner holds, standard fly out
          const flyOutAdv: RunnerAdvancement = {
            ...runnerAdv,
            fromThird: undefined,
          };
          await commitPlateAppearance({
            type: "out",
            outType,
            runnerAdvancement:
              Object.keys(flyOutAdv).length > 0 ? flyOutAdv : undefined,
          });
          logAction(`${outType} (R3 held)`);
        }
        await appendCommittedAtBatEntry(atBatEventId);

        // Update runner names
        const newNames: { first?: string; second?: string; third?: string } =
          {};
        if (isYes) {
          // R3 scored, others hold on FO/FLO (tag-up default)
          if (defaults.second?.to === "second")
            newNames.second = runnerNames.second;
          if (defaults.first?.to === "first")
            newNames.first = runnerNames.first;
        } else {
          // R3 held
          newNames.third = runnerNames.third;
          if (defaults.second?.to === "second")
            newNames.second = runnerNames.second;
          if (defaults.first?.to === "first")
            newNames.first = runnerNames.first;
        }
        setRunnerNames(newNames);
      } catch (error) {
        console.error("[M1-1][D-5] Failed to record SF/fly out:", error);
      }
      setSfPrompt(null);
    },
    [
      appendCommittedAtBatEntry,
      commitPlateAppearance,
      getPendingAtBatIdentity,
      logAction,
      runnerNames,
      sfPrompt,
    ],
  );

  // ═══════════════════════════════════════════════════════════
  // D-6: GO→DP prompt answer — "Double play?"
  // ═══════════════════════════════════════════════════════════
  const handleDpPromptAnswer = useCallback(
    async (isDP: boolean) => {
      if (!dpPrompt) return;
      const { runnerAdv, rbi, defaults } = dpPrompt;
      const atBatEventId = getPendingAtBatIdentity().atBatEventId;
      try {
        if (isDP) {
          await commitPlateAppearance({
            type: "out",
            outType: "DP",
            runnerAdvancement: runnerAdv,
          });
          logAction(`DP${rbi > 0 ? ` — ${rbi} RBI` : ""}`);
        } else {
          // Standard GO, no DP
          await commitPlateAppearance({
            type: "out",
            outType: "GO",
            runnerAdvancement: runnerAdv,
          });
          logAction("GO");
        }
        await appendCommittedAtBatEntry(atBatEventId);

        // Update runner names from defaults
        const newNames: { first?: string; second?: string; third?: string } =
          {};
        if (defaults.third?.to === "third") newNames.third = runnerNames.third;
        if (defaults.second?.to === "second")
          newNames.second = runnerNames.second;
        if (defaults.second?.to === "third")
          newNames.third = runnerNames.second;
        if (defaults.first?.to === "first") newNames.first = runnerNames.first;
        if (defaults.first?.to === "second")
          newNames.second = runnerNames.first;
        setRunnerNames(newNames);
      } catch (error) {
        console.error("[D-6] Failed to record GO/DP:", error);
      }
      setDpPrompt(null);
    },
    [
      appendCommittedAtBatEntry,
      commitPlateAppearance,
      dpPrompt,
      getPendingAtBatIdentity,
      logAction,
      runnerNames,
    ],
  );

  // ═══════════════════════════════════════════════════════════
  // D-7: IFR prompt answer — "Infield Fly Rule?"
  // ═══════════════════════════════════════════════════════════
  const handleIfrPromptAnswer = useCallback(
    async (isIFR: boolean) => {
      if (!ifrPrompt) return;
      const { runnerAdv, defaults } = ifrPrompt;
      const atBatEventId = getPendingAtBatIdentity().atBatEventId;
      try {
        if (isIFR) {
          // IFR: batter OUT immediately, removes force on runners
          // Set enrichment with IFR modifier
          setNextEventEnrichment({ modifiers: ["ifr"] } as NonNullable<
            import("../../../utils/eventLog").AtBatEvent["enrichment"]
          >);
        }
        // Either way it's a PO — IFR just adds the modifier
        await commitPlateAppearance({
          type: "out",
          outType: "PO",
          runnerAdvancement: runnerAdv,
        });
        logAction(`PO${isIFR ? " (IFR)" : ""}`);
        await appendCommittedAtBatEntry(atBatEventId);

        // Update runner names (runners hold on PO)
        const newNames: { first?: string; second?: string; third?: string } =
          {};
        if (defaults.third?.to === "third") newNames.third = runnerNames.third;
        if (defaults.second?.to === "second")
          newNames.second = runnerNames.second;
        if (defaults.first?.to === "first") newNames.first = runnerNames.first;
        setRunnerNames(newNames);
      } catch (error) {
        console.error("[D-7] Failed to record PO/IFR:", error);
      }
      setIfrPrompt(null);
    },
    [
      appendCommittedAtBatEntry,
      commitPlateAppearance,
      getPendingAtBatIdentity,
      ifrPrompt,
      logAction,
      runnerNames,
      setNextEventEnrichment,
    ],
  );

  // Handle special events (Web Gem, Robbery, TOOTBLAN, etc.) from the canonical tracker modifier flow
  // Phase 5B: Extended to handle all contextual button events
  const handleSpecialEvent = useCallback(
    async (event: SpecialEventData, sourceAtBat?: AtBatEvent) => {
      console.log("Special event:", event);

      try {
        // Capture undo snapshot before recording
        const eventLabel = event.eventType.replace(/_/g, " ");
        const actor = event.fielderName || event.runnerId || "player";
        undoSystem.captureSnapshot(`${eventLabel} by ${actor}`);

        const normalizedEventType = normalizeSpecialEventType(event.eventType);
        if (!normalizedEventType) {
          return;
        }

        const leadRunner = getLeadRunnerIdentity();
        const resolvedRunnerId =
          event.runnerId ||
          (normalizedEventType === "TOOTBLAN"
            ? leadRunner.runnerId
            : undefined);
        const resolvedRunnerName =
          normalizedEventType === "TOOTBLAN"
            ? leadRunner.runnerName
            : undefined;
        const fielderId = event.fielderName
          ? getRosterIdFromName(
              event.fielderName,
              fieldingTeam,
              event.fielderPosition === 1 ? "pitcher" : "player",
            )
          : undefined;
        const actorId =
          normalizedEventType === "WEB_GEM" || normalizedEventType === "ROBBERY"
            ? fielderId
            : resolvedRunnerId;

        await recordEvent(normalizedEventType, actorId, {
          runnerId: resolvedRunnerId,
          runnerName: resolvedRunnerName,
          fielderId,
          fielderName: event.fielderName,
          fielderPosition: event.fielderPosition,
          actorId:
            normalizedEventType === "WEB_GEM" ||
            normalizedEventType === "ROBBERY"
              ? fielderId
              : sourceAtBat?.batterId || event.batterId,
          actorName:
            normalizedEventType === "WEB_GEM" ||
            normalizedEventType === "ROBBERY"
              ? event.fielderName
              : sourceAtBat?.batterName || event.batterName,
          leverageIndex: sourceAtBat?.leverageIndex,
          inning: sourceAtBat?.inning,
          halfInning: sourceAtBat?.halfInning,
        });

        const sourceBatterId =
          sourceAtBat?.batterId || event.batterId || gameState.currentBatterId;
        const sourceBatterName =
          sourceAtBat?.batterName ||
          event.batterName ||
          resolvedCurrentBatterName ||
          gameState.currentBatterName;
        const pitcherId =
          event.fielderPosition === 1 && fielderId
            ? fielderId
            : sourceAtBat?.pitcherId || gameState.currentPitcherId;
        const pitcherName =
          event.fielderPosition === 1 && event.fielderName
            ? event.fielderName
            : sourceAtBat?.pitcherName ||
              resolvedCurrentPitcherName ||
              gameState.currentPitcherName;

        if (
          normalizedEventType === "KILLED" &&
          pitcherId &&
          pitcherName &&
          event.newFitness
        ) {
          const previousFitness =
            playerStateHook.getPlayer(pitcherId)?.fitnessProfile
              .currentFitness ?? "FIT";
          const reason = `Killed pitcher by ${sourceBatterName}`;
          const eventGroupId = `${gameState.gameId}_kp_${Date.now()}`;
          const injuryEvent = await recordPlayerStateChange(
            pitcherId,
            pitcherName,
            "injury",
            previousFitness,
            event.newFitness,
            reason,
            {
              eventType: "injury",
              sourceEventType: "KILLED_PITCHER",
              causedByPlayerId: sourceBatterId,
              causedByPlayerName: sourceBatterName,
              stayedIn: event.injuryStayedIn,
              eventGroupId,
            },
          );
          const fitnessEvent = await recordPlayerStateChange(
            pitcherId,
            pitcherName,
            "fitness",
            previousFitness,
            event.newFitness,
            reason,
            {
              sourceEventType: "KILLED_PITCHER",
              causedByPlayerId: sourceBatterId,
              causedByPlayerName: sourceBatterName,
              stayedIn: event.injuryStayedIn,
              linkedEventId: injuryEvent.eventId,
              eventGroupId,
            },
          );
          await updateBetweenPlayEvent(injuryEvent.eventId, {
            linkedEventId: fitnessEvent.eventId,
          });
          playerStateHook.setFitness(pitcherId, event.newFitness);
          queuePlayLogRefresh(0);
        } else if (
          normalizedEventType === "NUTSHOT" &&
          pitcherId &&
          pitcherName &&
          event.mojoImpact
        ) {
          const previousMojo =
            playerStateHook.getPlayer(pitcherId)?.gameState.currentMojo ?? 0;
          const mojoDelta = event.mojoImpact === "RATTLED" ? -2 : -1;
          const nextMojo = clampMojo(previousMojo + mojoDelta);
          const reason = `Nut shot by ${sourceBatterName}`;

          await recordPlayerStateChange(
            pitcherId,
            pitcherName,
            "mojo",
            previousMojo,
            nextMojo,
            reason,
            {
              sourceEventType: "NUT_SHOT",
              causedByPlayerId: sourceBatterId,
              causedByPlayerName: sourceBatterName,
            },
          );
          playerStateHook.setMojo(pitcherId, nextMojo);
          queuePlayLogRefresh(0);
        }

        console.log(
          `${event.eventType} recorded - fielder: ${event.fielderName}, position: ${event.fielderPosition}, runner: ${event.runnerId}`,
        );
      } catch (error) {
        console.error("Failed to record special event:", error);
      }
    },
    [
      fieldingTeam,
      gameState.currentBatterId,
      gameState.currentBatterName,
      gameState.currentPitcherId,
      gameState.currentPitcherName,
      getLeadRunnerIdentity,
      getRosterIdFromName,
      playerStateHook,
      queuePlayLogRefresh,
      recordEvent,
      recordPlayerStateChange,
      resolvedCurrentBatterName,
      resolvedCurrentPitcherName,
      undoSystem,
    ],
  );

  const handleAtBatModifierRecord = useCallback(
    async (modifier: AtBatModifierValue) => {
      if (!enrichingEntry?.eventId) {
        return;
      }

      const atBatEvent = await getAtBatEvent(enrichingEntry.eventId);
      if (!atBatEvent) {
        return;
      }

      const existingModifiers = atBatEvent.enrichment?.modifiers || [];
      if (existingModifiers.includes(modifier)) {
        return;
      }

      const linkedFieldingEvents = await getFieldingEventsForAtBat(
        atBatEvent.eventId,
      );
      const defenders = await buildHistoricalDefensiveAlignment(
        atBatEvent,
        linkedFieldingEvents,
      );
      const sequence = atBatEvent.enrichment?.fieldingSequence || [];
      const primaryPosition =
        sequence.length > 0
          ? (Object.entries(POSITION_NUMBER).find(
              ([, num]) => num === sequence[0],
            )?.[0] as Position | undefined)
          : undefined;
      const primaryDefender = primaryPosition
        ? defenders[primaryPosition]
        : undefined;
      const runnerOut = atBatEvent.runnerOutcomes?.find(
        (outcome) => outcome.toBase === "out",
      );

      const event: SpecialEventData = {
        eventType: modifier,
        batterId: atBatEvent.batterId,
        batterName: atBatEvent.batterName,
        runnerId: undefined,
        fielderPosition: primaryPosition
          ? POSITION_NUMBER[primaryPosition as keyof typeof POSITION_NUMBER]
          : undefined,
        fielderName: primaryDefender?.playerName,
      };

      if (modifier === "KILLED_PITCHER" || modifier === "NUT_SHOT") {
        setPendingManualSpecialPrompt({
          type: modifier === "KILLED_PITCHER" ? "KP" : "NUT",
          event: {
            ...event,
            fielderPosition: 1,
            fielderName: atBatEvent.pitcherName,
          },
          atBatEventId: atBatEvent.eventId,
          modifierValue: modifier,
        });
        return;
      }

      const updatedAtBat = await appendModifierToAtBatEvent(
        atBatEvent.eventId,
        modifier,
      );
      if (!updatedAtBat) {
        return;
      }
      await handleSpecialEvent(event, updatedAtBat);
    },
    [
      appendModifierToAtBatEvent,
      buildHistoricalDefensiveAlignment,
      enrichingEntry?.eventId,
      handleSpecialEvent,
    ],
  );

  const handleManualSpecialPromptComplete = useCallback(
    (result: InjuryResult | MojoResult) => {
      if (!pendingManualSpecialPrompt) {
        return;
      }

      const baseEvent = pendingManualSpecialPrompt.event;
      const sourceAtBatEventId = pendingManualSpecialPrompt.atBatEventId;
      setPendingManualSpecialPrompt(null);

      const finish = async (nextEvent: SpecialEventData) => {
        const sourceAtBat = sourceAtBatEventId
          ? await getAtBatEvent(sourceAtBatEventId)
          : null;
        const modifierValue = pendingManualSpecialPrompt.modifierValue;
        const updatedAtBat =
          sourceAtBat && modifierValue
            ? await appendModifierToAtBatEvent(
                sourceAtBat.eventId,
                modifierValue,
              )
            : sourceAtBat;
        await handleSpecialEvent(nextEvent, updatedAtBat || undefined);
      };

      if (pendingManualSpecialPrompt.type === "KP") {
        const injuryResult = result as InjuryResult;
        void finish({
          ...baseEvent,
          injuryStayedIn: injuryResult.stayedIn,
          newFitness: injuryResult.newFitness,
        });
        return;
      }

      const mojoResult = result as MojoResult;
      void finish({
        ...baseEvent,
        mojoImpact: mojoResult.mojoImpact,
      });
    },
    [handleSpecialEvent, pendingManualSpecialPrompt],
  );

  const handleSubstitution = useCallback(
    (
      teamType: "away" | "home",
      benchPlayerName: string,
      lineupPlayerName: string,
      options?: {
        subType?: "player_sub" | "pinch_run";
        base?: "1B" | "2B" | "3B";
      },
    ) => {
      console.log(
        `Substitution: ${benchPlayerName} replacing ${lineupPlayerName} on ${teamType} team`,
      );

      const benchPlayerId = getPlayerIdFromName(benchPlayerName, teamType);
      const lineupPlayerId = getPlayerIdFromName(lineupPlayerName, teamType);

      // MAJ-06: Call with enriched options for proper sub type logging
      // MAJ-09: Check validation result before updating UI
      const subResult = makeSubstitution(
        benchPlayerId,
        lineupPlayerId,
        benchPlayerName,
        lineupPlayerName,
        {
          subType: options?.subType || "player_sub",
          base: options?.base,
        },
      );
      if (!subResult.success) {
        console.warn(`[GameTracker] Substitution rejected: ${subResult.error}`);
        // TODO: Show UI toast/notification to user
        return;
      }

      // Update local player state for UI display
      const players = teamType === "away" ? awayTeamPlayers : homeTeamPlayers;
      const setPlayers =
        teamType === "away" ? setAwayTeamPlayers : setHomeTeamPlayers;

      const outgoingIndex = players.findIndex(
        (p) => p.name === lineupPlayerName,
      );
      const incomingIndex = players.findIndex(
        (p) => p.name === benchPlayerName,
      );

      if (outgoingIndex >= 0 && incomingIndex >= 0) {
        setPlayers((prev) => {
          const updated = [...prev];
          // Transfer batting order and position from outgoing to incoming player
          const outgoingBattingOrder = updated[outgoingIndex].battingOrder;
          const outgoingPosition = updated[outgoingIndex].position;

          // Incoming player takes the batting order and position
          updated[incomingIndex] = {
            ...updated[incomingIndex],
            battingOrder: outgoingBattingOrder,
            position: outgoingPosition,
          };

          // Outgoing player leaves the lineup slot; only live-game subs burn them.
          updated[outgoingIndex] = {
            ...updated[outgoingIndex],
            battingOrder: undefined,
            position: undefined, // Remove position so they don't show in field
            isOutOfGame: gameState.gamePhase === "LIVE",
          };

          return updated;
        });
      }
    },
    [
      awayTeamPlayers,
      gameState.gamePhase,
      getPlayerIdFromName,
      homeTeamPlayers,
      makeSubstitution,
    ],
  );

  const handlePitcherSubstitution = (
    teamType: "away" | "home",
    newPitcherName: string,
    replacedName: string,
    replacedType: "player" | "pitcher",
  ) => {
    console.log(
      `Pitcher Substitution: ${newPitcherName} replacing ${replacedName} (${replacedType}) on ${teamType} team`,
    );

    const newPitcherId = getPitcherIdFromName(newPitcherName, teamType);
    const exitingPitcherId = getPitcherIdFromName(replacedName, teamType);
    const pitchingTeamSide =
      resolvePitchingTeamSide(exitingPitcherId, replacedName) ||
      resolvePitchingTeamSide(newPitcherId, newPitcherName) ||
      teamType;

    const setPitchers =
      pitchingTeamSide === "away" ? setAwayTeamPitchers : setHomeTeamPitchers;
    const applyPitcherDisplayChange = () => {
      queuePlayLogRefresh(80);
      setPitchers((previous) =>
        previous.map((pitcher) => {
          if (pitcher.name === newPitcherName) {
            return {
              ...pitcher,
              isActive: true,
              isOutOfGame: false,
            };
          }
          if (pitcher.name === replacedName) {
            return {
              ...pitcher,
              isActive: false,
              isOutOfGame: gameState.gamePhase === "LIVE",
            };
          }
          return {
            ...pitcher,
            isActive: false,
          };
        }),
      );
    };

    // Call the hook's changePitcher function which will:
    // 1. Show pitch count prompt for exiting pitcher
    // 2. After confirmation, update currentPitcherId/currentPitcherName
    changePitcher(
      newPitcherId,
      exitingPitcherId,
      pitchingTeamSide,
      newPitcherName,
      replacedName,
      { afterCommit: applyPitcherDisplayChange },
    );

  };

  // §9.1: Player card Sub Out handler — executes substitution from player card bench list
  const handlePlayerCardSubOut = useCallback(
    (
      outgoingPlayerId: string,
      outgoingName: string,
      incomingName: string,
      isPitcher: boolean,
      incomingPosition?: string,
      runnerBase?: RunnerBase,
    ) => {
      // R3-R8: Determine if this is a defensive pitcher change or a batting substitution.
      // A pitcher change is ONLY when replacing the pitcher currently on the mound
      // (the fielding team's pitcher). When the batting team's pitcher comes up to bat
      // and is subbed out, that's a pinch-hit — even if the incoming player is also a pitcher.
      const currentDefensivePitcherId = gameState.currentPitcherId;
      const isReplacingActivePitcherOnMound =
        outgoingPlayerId === currentDefensivePitcherId ||
        outgoingName === gameState.currentPitcherName ||
        outgoingName === resolvedCurrentPitcherName;
      const isActualPitcherChange = isPitcher && isReplacingActivePitcherOnMound;

      const team = isActualPitcherChange
        ? resolvePitchingTeamSide(outgoingPlayerId, outgoingName)
        : resolveRosterTeamSide(outgoingPlayerId, outgoingName);
      if (!team) {
        // Fallback: try the other resolver
        const fallbackTeam = isActualPitcherChange
          ? resolveRosterTeamSide(outgoingPlayerId, outgoingName)
          : resolvePitchingTeamSide(outgoingPlayerId, outgoingName);
        if (!fallbackTeam) {
          console.warn("[GameTracker] Unable to resolve player-card substitution team", {
            outgoingPlayerId,
            outgoingName,
            incomingName,
            isPitcher,
            incomingPosition,
          });
          return;
        }
        // Use fallback
        if (isActualPitcherChange) {
          handlePitcherSubstitution(fallbackTeam, incomingName, outgoingName, "pitcher");
        } else {
          handleSubstitution(fallbackTeam, incomingName, outgoingName, runnerBase
            ? {
                subType: "pinch_run",
                base: runnerBaseToTrackerBase(runnerBase),
              }
            : undefined);
        }
        return;
      }

      console.log("[R3-R8] handlePlayerCardSubOut:", {
        outgoingName, incomingName, isPitcher, incomingPosition,
        isActualPitcherChange, isReplacingActivePitcherOnMound, team,
      });

      if (isActualPitcherChange) {
        handlePitcherSubstitution(team, incomingName, outgoingName, "pitcher");
      } else {
        // Regular substitution (including pinch-hit for batting-side pitcher)
        handleSubstitution(team, incomingName, outgoingName, runnerBase
          ? {
              subType: "pinch_run",
              base: runnerBaseToTrackerBase(runnerBase),
            }
          : undefined);

        // R3-R8: If the outgoing player was the team's pitcher (batting side),
        // the pinch-hitter becomes the pending pitcher for next defensive half.
        // Update the team's currentPitcher in lineupState so the system knows.
        if (isPitcher) {
          const incomingId = getPlayerIdFromName(incomingName, team);
          console.log("[R3-R8] Pinch-hit for batting-side pitcher — setting pending pitcher:", {
            team, incomingName, incomingId,
          });
          // The pinch-hitter inherits the P position in the lineup.
          // When the half-inning flips and this team takes the field,
          // the user can make a pitching change or leave the pinch-hitter to pitch.
        }
      }
    },
    [
      gameState.currentPitcherId,
      gameState.currentPitcherName,
      resolvePitchingTeamSide,
      resolveRosterTeamSide,
      handlePitcherSubstitution,
      handleSubstitution,
      resolvedCurrentPitcherName,
    ],
  );

  const handlePositionSwap = useCallback(
    (teamType: "away" | "home", player1Name: string, player2Name: string) => {
      console.log(
        `Position Swap: ${player1Name} and ${player2Name} swapping positions on ${teamType} team`,
      );

      // Update local player state for UI display
      const setPlayers =
        teamType === "away" ? setAwayTeamPlayers : setHomeTeamPlayers;

      setPlayers((prev) => {
        const updated = [...prev];
        const player1Index = updated.findIndex((p) => p.name === player1Name);
        const player2Index = updated.findIndex((p) => p.name === player2Name);

        if (player1Index >= 0 && player2Index >= 0) {
          // Swap positions only (not batting order) during live game
          const player1Position = updated[player1Index].position;
          const player2Position = updated[player2Index].position;

          updated[player1Index] = {
            ...updated[player1Index],
            position: player2Position,
          };
          updated[player2Index] = {
            ...updated[player2Index],
            position: player1Position,
          };
        }

        return updated;
      });
    },
    [],
  );

  // ============================================
  // RUNNER POPOVER HANDLERS (Layer 4 — tickets 4.1, 4.2, 4.4)
  // ============================================

  const handleRunnerTap = useCallback(
    (
      base: "first" | "second" | "third",
      anchorPosition: { left: string; top: string },
    ) => {
      setActiveFielderPopover(null); // Close any open fielder popover
      const { runnerId, runnerName } = getRunnerIdentityForBase(base);
      setActiveRunnerPopover({
        base,
        runnerName,
        playerId: runnerId || "",
        anchorPosition,
      });
    },
    [getRunnerIdentityForBase],
  );

  const closeRunnerPopover = useCallback(() => {
    setActiveRunnerPopover(null);
  }, []);

  const beginRunnerAttributionCapture = useCallback(
    (action: PendingRunnerAttributionAction) => {
      setSelectedPlayLogEntry(null);
      setSelectedBetweenPlayEvent(null);
      setEnrichingEntry(null);
      setPendingRunnerAttribution(action);
      setActiveRunnerPopover(null);
    },
    [],
  );

  const handlePendingRunnerFielderChange = useCallback((fielderId: string) => {
    setPendingRunnerAttribution((current) =>
      current ? { ...current, fielderId: fielderId || undefined } : current,
    );
  }, []);

  const handlePendingRunnerErrorTypeChange = useCallback((errorType: "fielding" | "throwing" | "mental") => {
    setPendingRunnerAttribution((current) =>
      current ? { ...current, errorType } : current,
    );
  }, []);

  const handlePendingRunnerAttributionCancel = useCallback(() => {
    setPendingRunnerAttribution(null);
    setPendingRunnerAttributionSaving(false);
  }, []);

  const nextBaseMap: Record<RunnerBase, "second" | "third" | "home"> = {
    first: "second",
    second: "third",
    third: "home",
  };

  const processRunnerEventAutoDetections = useCallback(
    (input: {
      eventType:
        | "SB"
        | "CS"
        | "WP"
        | "PB"
        | "PICK"
        | "PICK_SAFE"
        | "PICK_E"
        | "ADVANCE"
        | "ADVANCE_E";
      runnerId: string;
      runnerName: string;
      leverageIndex?: number;
      outcome: "safe" | "out";
      toBase: "first" | "second" | "third" | "home" | "out";
    }) => {
      const scheduledInnings = hookTotalInningsRef.current || 9;
      const defenseSide = gameState.isTop ? "home" : "away";
      const beforeScore = {
        away: gameState.awayScore,
        home: gameState.homeScore,
      };
      const battingTeamScored =
        input.outcome === "safe" && input.toBase === "home" ? 1 : 0;
      const afterScore = {
        away: gameState.isTop ? gameState.awayScore + battingTeamScored : gameState.awayScore,
        home: gameState.isTop ? gameState.homeScore : gameState.homeScore + battingTeamScored,
      };
      const outsDelta = input.outcome === "out" ? 1 : 0;
      const activeAppearance = activeSaveAppearancesRef.current[defenseSide];
      if (activeAppearance && activeAppearance.pitcherId === gameState.currentPitcherId) {
        activeSaveAppearancesRef.current[defenseSide] =
          updateSaveAppearanceSnapshot(
            activeAppearance,
            buildSaveAppearanceUpdateContextFromRunnerEvent({
              inning: gameState.inning,
              halfInning: gameState.isTop ? "TOP" : "BOTTOM",
              scoreBefore: beforeScore,
              scoreAfter: afterScore,
              outsDelta,
              runsAllowed: getRunsAllowedForSide(
                defenseSide,
                beforeScore,
                afterScore,
              ),
              scheduledInnings,
              leverageIndex: input.leverageIndex ?? getCurrentLeverageIndex(),
            }),
          );
      } else {
        activeSaveAppearancesRef.current[defenseSide] = createSaveAppearanceSnapshot(
          gameState.currentPitcherId,
          resolvedCurrentPitcherName,
          {
            inning: gameState.inning,
            halfInning: gameState.isTop ? "TOP" : "BOTTOM",
            outs: gameState.outs,
            bases: {
              first: gameState.bases.first,
              second: gameState.bases.second,
              third: gameState.bases.third,
            },
            score: beforeScore,
            scheduledInnings,
            teamSide: defenseSide,
          },
        );
        activeSaveAppearancesRef.current[defenseSide] =
          updateSaveAppearanceSnapshot(
            activeSaveAppearancesRef.current[defenseSide]!,
            buildSaveAppearanceUpdateContextFromRunnerEvent({
              inning: gameState.inning,
              halfInning: gameState.isTop ? "TOP" : "BOTTOM",
              scoreBefore: beforeScore,
              scoreAfter: afterScore,
              outsDelta,
              runsAllowed: getRunsAllowedForSide(
                defenseSide,
                beforeScore,
                afterScore,
              ),
              scheduledInnings,
              leverageIndex: input.leverageIndex ?? getCurrentLeverageIndex(),
            }),
          );
      }

      if (input.eventType === "PICK" && input.runnerId) {
        recordDetectedFameEvents(
          detectTootblanEvent({
            runnerId: input.runnerId,
            runnerName: input.runnerName,
            inning: gameState.inning,
            halfInning: gameState.isTop ? "TOP" : "BOTTOM",
            leverageIndex: input.leverageIndex ?? getCurrentLeverageIndex(),
            outsBefore: gameState.outs,
            basesBefore: {
              first: gameState.bases.first,
              second: gameState.bases.second,
              third: gameState.bases.third,
            },
            source: "pickoff",
          }),
        );
      }
    },
    [
      gameState.awayScore,
      gameState.bases.first,
      gameState.bases.second,
      gameState.bases.third,
      gameState.currentPitcherId,
      gameState.homeScore,
      gameState.inning,
      gameState.isTop,
      gameState.outs,
      getCurrentLeverageIndex,
      hookTotalInningsRef,
      recordDetectedFameEvents,
      resolvedCurrentPitcherName,
    ],
  );

  const recordRunnerActionFromPlayerCard = useCallback(
    async (
      eventType:
        | "SB"
        | "CS"
        | "WP"
        | "PB"
        | "PICK"
        | "PICK_SAFE"
        | "PICK_E"
        | "ADVANCE"
        | "ADVANCE_E",
      base: RunnerBase,
      runnerId: string,
      runnerName: string,
    ) => {
      const toBase =
        eventType === "PICK"
          ? "out"
          : eventType === "PICK_SAFE"
            ? base
            : nextBaseMap[base];
      const outcome =
        eventType === "CS" || eventType === "PICK"
          ? ("out" as const)
          : ("safe" as const);
      const shouldAdvanceRunner = eventType !== "PICK_SAFE";

      if (eventType === "ADVANCE_E") {
        beginRunnerAttributionCapture({
          eventType,
          title: "Advance on Error",
          summary: `${runnerName || "Runner"}: ${base.toUpperCase()} -> ${toBase.toUpperCase()}`,
          snapshotLabel: `Advance on error: ${base} → ${toBase}`,
          runnerId,
          runnerName,
          fromBase: base,
          recordToBase: toBase,
          advanceToBase: nextBaseMap[base],
          outcome,
          pitcherId: gameState.currentPitcherId,
          pitcherName: resolvedCurrentPitcherName,
          catcherId: defensiveAlignmentByPosition.C?.playerId,
          catcherName: defensiveAlignmentByPosition.C?.playerName,
          errorType: "fielding",
        });
        setSelectedPlayer(null);
        return;
      }

      undoSystem.captureSnapshot(
        `${eventType}: ${runnerName} ${base} → ${toBase}`,
      );

      if (shouldAdvanceRunner) {
        advanceRunner(base, nextBaseMap[base], outcome);
      }

      await recordEvent(eventType, runnerId, {
        runnerId,
        runnerName,
        fromBase: base,
        toBase,
        outcome,
        pitcherId: gameState.currentPitcherId,
        pitcherName: resolvedCurrentPitcherName,
        catcherId: defensiveAlignmentByPosition.C?.playerId,
        catcherName: defensiveAlignmentByPosition.C?.playerName,
      });
      await recomputeCommittedManagerWpa("runner event commit");
      processRunnerEventAutoDetections({
        eventType,
        runnerId,
        runnerName,
        outcome,
        toBase,
      });

      setSelectedPlayer(null);
      queuePlayLogRefresh();
    },
    [
      advanceRunner,
      defensiveAlignmentByPosition,
      beginRunnerAttributionCapture,
      gameState.currentPitcherId,
      processRunnerEventAutoDetections,
      queuePlayLogRefresh,
      recordEvent,
      recomputeCommittedManagerWpa,
      resolvedCurrentPitcherName,
      undoSystem,
    ],
  );

  const handlePendingRunnerAttributionCommit = useCallback(async () => {
    if (!pendingRunnerAttribution) return;

    const selectedFielder = pendingRunnerAttribution.fielderId
      ? liveRunnerFielderById.get(pendingRunnerAttribution.fielderId)
      : undefined;

    setPendingRunnerAttributionSaving(true);
    try {
      undoSystem.captureSnapshot(pendingRunnerAttribution.snapshotLabel);

      if (pendingRunnerAttribution.advanceToBase) {
        advanceRunner(
          pendingRunnerAttribution.fromBase,
          pendingRunnerAttribution.advanceToBase,
          pendingRunnerAttribution.outcome,
        );
      }

      await recordEvent(
        pendingRunnerAttribution.eventType,
        pendingRunnerAttribution.runnerId,
        {
          runnerId: pendingRunnerAttribution.runnerId,
          runnerName: pendingRunnerAttribution.runnerName,
          fromBase: pendingRunnerAttribution.fromBase,
          toBase: pendingRunnerAttribution.recordToBase,
          outcome: pendingRunnerAttribution.outcome,
          pitcherId: pendingRunnerAttribution.pitcherId,
          pitcherName: pendingRunnerAttribution.pitcherName,
          catcherId: pendingRunnerAttribution.catcherId,
          catcherName: pendingRunnerAttribution.catcherName,
          fielderId: pendingRunnerAttribution.fielderId,
          fielderName: selectedFielder?.name,
          fielderPosition: selectedFielder
            ? POSITION_NUMBER[
                selectedFielder.position as keyof typeof POSITION_NUMBER
              ]
            : undefined,
          errorType: pendingRunnerAttribution.errorType,
        },
      );
      await recomputeCommittedManagerWpa("runner attribution commit");
      if (
        pendingRunnerAttribution.runnerId &&
        pendingRunnerAttribution.runnerName
      ) {
        processRunnerEventAutoDetections({
          eventType: pendingRunnerAttribution.eventType,
          runnerId: pendingRunnerAttribution.runnerId,
          runnerName: pendingRunnerAttribution.runnerName,
          leverageIndex: getCurrentLeverageIndex(),
          outcome: pendingRunnerAttribution.outcome,
          toBase: pendingRunnerAttribution.recordToBase,
        });
      }

      setPendingRunnerAttribution(null);
      queuePlayLogRefresh();
    } catch (error) {
      console.error(
        "[Runner Attribution] Failed to record runner event:",
        error,
      );
    } finally {
      setPendingRunnerAttributionSaving(false);
    }
  }, [
    advanceRunner,
    liveRunnerFielderById,
    pendingRunnerAttribution,
    processRunnerEventAutoDetections,
    queuePlayLogRefresh,
    recordEvent,
    recomputeCommittedManagerWpa,
    undoSystem,
  ]);

  const handleRunnerSteal = useCallback(
    (base: RunnerBase) => {
      beginRunnerAttributionCapture({
        eventType: "SB",
        title: "Stolen Base",
        summary: `${activeRunnerPopover?.runnerName || "Runner"}: ${base.toUpperCase()} -> ${nextBaseMap[base].toUpperCase()}`,
        snapshotLabel: `SB: ${base} → ${nextBaseMap[base]}`,
        runnerId: activeRunnerPopover?.playerId,
        runnerName: activeRunnerPopover?.runnerName,
        fromBase: base,
        recordToBase: nextBaseMap[base],
        advanceToBase: nextBaseMap[base],
        outcome: "safe",
        pitcherId: gameState.currentPitcherId,
        pitcherName: resolvedCurrentPitcherName,
        catcherId: defensiveAlignmentByPosition.C?.playerId,
        catcherName: defensiveAlignmentByPosition.C?.playerName,
      });
    },
    [
      activeRunnerPopover?.playerId,
      activeRunnerPopover?.runnerName,
      beginRunnerAttributionCapture,
      defensiveAlignmentByPosition,
      gameState.currentPitcherId,
      resolvedCurrentPitcherName,
    ],
  );

  const handleRunnerAdvance = useCallback(
    (base: RunnerBase, dest?: "second" | "third" | "home") => {
      const to = dest || nextBaseMap[base];
      beginRunnerAttributionCapture({
        eventType: "ADVANCE",
        title: "Runner Advance",
        summary: `${activeRunnerPopover?.runnerName || "Runner"}: ${base.toUpperCase()} -> ${to.toUpperCase()}`,
        snapshotLabel: `Advance: ${base} → ${to}`,
        runnerId: activeRunnerPopover?.playerId,
        runnerName: activeRunnerPopover?.runnerName,
        fromBase: base,
        recordToBase: to,
        advanceToBase: to,
        outcome: "safe",
        pitcherId: gameState.currentPitcherId,
        pitcherName: resolvedCurrentPitcherName,
        catcherId: defensiveAlignmentByPosition.C?.playerId,
        catcherName: defensiveAlignmentByPosition.C?.playerName,
      });
    },
    [
      activeRunnerPopover?.playerId,
      activeRunnerPopover?.runnerName,
      beginRunnerAttributionCapture,
      defensiveAlignmentByPosition,
      gameState.currentPitcherId,
      resolvedCurrentPitcherName,
    ],
  );

  const handleRunnerAdvanceOnError = useCallback(
    (base: RunnerBase, dest?: "second" | "third" | "home") => {
      const to = dest || nextBaseMap[base];
      beginRunnerAttributionCapture({
        eventType: "ADVANCE_E",
        title: "Advance on Error",
        summary: `${activeRunnerPopover?.runnerName || "Runner"}: ${base.toUpperCase()} -> ${to.toUpperCase()}`,
        snapshotLabel: `Advance on error: ${base} → ${to}`,
        runnerId: activeRunnerPopover?.playerId,
        runnerName: activeRunnerPopover?.runnerName,
        fromBase: base,
        recordToBase: to,
        advanceToBase: to,
        outcome: "safe",
        pitcherId: gameState.currentPitcherId,
        pitcherName: resolvedCurrentPitcherName,
        catcherId: defensiveAlignmentByPosition.C?.playerId,
        catcherName: defensiveAlignmentByPosition.C?.playerName,
        errorType: "fielding",
      });
    },
    [
      activeRunnerPopover?.playerId,
      activeRunnerPopover?.runnerName,
      beginRunnerAttributionCapture,
      defensiveAlignmentByPosition,
      gameState.currentPitcherId,
      resolvedCurrentPitcherName,
    ],
  );

  const handleRunnerWP = useCallback(
    (base: RunnerBase, dest?: "second" | "third" | "home") => {
      const to = dest || nextBaseMap[base];
      beginRunnerAttributionCapture({
        eventType: "WP",
        title: "Wild Pitch",
        summary: `${activeRunnerPopover?.runnerName || "Runner"}: ${base.toUpperCase()} -> ${to.toUpperCase()}`,
        snapshotLabel: `WP: ${base} → ${to}`,
        runnerId: activeRunnerPopover?.playerId,
        runnerName: activeRunnerPopover?.runnerName,
        fromBase: base,
        recordToBase: to,
        advanceToBase: to,
        outcome: "safe",
        pitcherId: gameState.currentPitcherId,
        pitcherName: resolvedCurrentPitcherName,
        catcherId: defensiveAlignmentByPosition.C?.playerId,
        catcherName: defensiveAlignmentByPosition.C?.playerName,
      });
    },
    [
      activeRunnerPopover?.playerId,
      activeRunnerPopover?.runnerName,
      beginRunnerAttributionCapture,
      defensiveAlignmentByPosition,
      gameState.currentPitcherId,
      resolvedCurrentPitcherName,
    ],
  );

  const handleRunnerPB = useCallback(
    (base: RunnerBase, dest?: "second" | "third" | "home") => {
      const to = dest || nextBaseMap[base];
      beginRunnerAttributionCapture({
        eventType: "PB",
        title: "Passed Ball",
        summary: `${activeRunnerPopover?.runnerName || "Runner"}: ${base.toUpperCase()} -> ${to.toUpperCase()}`,
        snapshotLabel: `PB: ${base} → ${to}`,
        runnerId: activeRunnerPopover?.playerId,
        runnerName: activeRunnerPopover?.runnerName,
        fromBase: base,
        recordToBase: to,
        advanceToBase: to,
        outcome: "safe",
        pitcherId: gameState.currentPitcherId,
        pitcherName: resolvedCurrentPitcherName,
        catcherId: defensiveAlignmentByPosition.C?.playerId,
        catcherName: defensiveAlignmentByPosition.C?.playerName,
      });
    },
    [
      activeRunnerPopover?.playerId,
      activeRunnerPopover?.runnerName,
      beginRunnerAttributionCapture,
      defensiveAlignmentByPosition,
      gameState.currentPitcherId,
      resolvedCurrentPitcherName,
    ],
  );

  const handleRunnerPickoff = useCallback(
    (base: RunnerBase, outcome: "safe" | "out" | "error") => {
      if (outcome === "out") {
        beginRunnerAttributionCapture({
          eventType: "PICK",
          title: "Pickoff",
          summary: `${activeRunnerPopover?.runnerName || "Runner"}: ${base.toUpperCase()} -> OUT`,
          snapshotLabel: `Pickoff out: ${base}`,
          runnerId: activeRunnerPopover?.playerId,
          runnerName: activeRunnerPopover?.runnerName,
          fromBase: base,
          recordToBase: "out",
          advanceToBase: nextBaseMap[base],
          outcome: "out",
          pitcherId: gameState.currentPitcherId,
          pitcherName: resolvedCurrentPitcherName,
          catcherId: defensiveAlignmentByPosition.C?.playerId,
          catcherName: defensiveAlignmentByPosition.C?.playerName,
        });
      } else if (outcome === "error") {
        beginRunnerAttributionCapture({
          eventType: "PICK_E",
          title: "Pickoff Error",
          summary: `${activeRunnerPopover?.runnerName || "Runner"}: ${base.toUpperCase()} -> ${nextBaseMap[base].toUpperCase()}`,
          snapshotLabel: `Pickoff error: ${base}`,
          runnerId: activeRunnerPopover?.playerId,
          runnerName: activeRunnerPopover?.runnerName,
          fromBase: base,
          recordToBase: nextBaseMap[base],
          advanceToBase: nextBaseMap[base],
          outcome: "safe",
          pitcherId: gameState.currentPitcherId,
          pitcherName: resolvedCurrentPitcherName,
          catcherId: defensiveAlignmentByPosition.C?.playerId,
          catcherName: defensiveAlignmentByPosition.C?.playerName,
        });
      } else {
        beginRunnerAttributionCapture({
          eventType: "PICK_SAFE",
          title: "Pickoff Attempt",
          summary: `${activeRunnerPopover?.runnerName || "Runner"}: ${base.toUpperCase()} stays`,
          snapshotLabel: `Pickoff safe: ${base}`,
          runnerId: activeRunnerPopover?.playerId,
          runnerName: activeRunnerPopover?.runnerName,
          fromBase: base,
          recordToBase: base,
          outcome: "safe",
          pitcherId: gameState.currentPitcherId,
          pitcherName: resolvedCurrentPitcherName,
          catcherId: defensiveAlignmentByPosition.C?.playerId,
          catcherName: defensiveAlignmentByPosition.C?.playerName,
        });
      }
    },
    [
      activeRunnerPopover?.playerId,
      activeRunnerPopover?.runnerName,
      beginRunnerAttributionCapture,
      defensiveAlignmentByPosition,
      gameState.currentPitcherId,
      resolvedCurrentPitcherName,
    ],
  );

  // REMOVED per Cleanup: Lineup overlay replaced by inline columns. Substitution flow
  // will be reconnected in Group 2.C (player-card-first flow).
  // §9.1 (Group 2.C): Pinch runner — opens player card for runner, user taps Sub Out → bench list
  const handleRunnerSubstitute = useCallback(
    (base: RunnerBase) => {
      const runner = activeRunnerPopover;
      setActiveRunnerPopover(null);
      if (runner) {
        setSelectedPlayer({
          name: runner.runnerName,
          type: "batter",
          playerId: runner.playerId,
          runnerBase: base,
        });
      }
    },
    [activeRunnerPopover],
  );

  // ============================================
  // FIELDER POPOVER HANDLERS (Layer 4 — tickets 4.3, 4.5)
  // ============================================

  const handleFielderPlayerCard = useCallback(() => {
    if (!activeFielderPopover) return;
    openPlayerCard(
      activeFielderPopover.fielder.playerName,
      fieldingTeam,
      activeFielderPopover.fielder.positionNumber === 1 ? "pitcher" : "batter",
    );
    setActiveFielderPopover(null);
  }, [activeFielderPopover, fieldingTeam, openPlayerCard]);

  const handleRunnerPlayerCard = useCallback(() => {
    if (!activeRunnerPopover) return;
    setSelectedPlayer({
      name: activeRunnerPopover.runnerName,
      type: "batter",
      playerId: activeRunnerPopover.playerId,
      runnerBase: activeRunnerPopover.base,
    });
    setActiveRunnerPopover(null);
  }, [activeRunnerPopover]);

  const closeFielderPopover = useCallback(() => {
    setActiveFielderPopover(null);
  }, []);

  const handleFielderSubstitute = useCallback(
    (
      benchPlayerId: string,
      benchPlayerName: string,
      fielderId: string,
      fielderName: string,
    ) => {
      const fieldingPlayers =
        fieldingTeam === "home" ? homeTeamPlayers : awayTeamPlayers;
      const outgoingPlayer = fieldingPlayers.find(
        (player) => player.name === fielderName,
      );

      handleLineupCardSubstitution({
        type: "player_sub",
        incomingPlayerId: benchPlayerId,
        incomingPlayerName: benchPlayerName,
        outgoingPlayerId: fielderId,
        outgoingPlayerName: fielderName,
        newPosition: outgoingPlayer?.position,
        lineupSpot: outgoingPlayer?.battingOrder,
      });
      setActiveFielderPopover(null);
    },
    [
      awayTeamPlayers,
      fieldingTeam,
      handleLineupCardSubstitution,
      homeTeamPlayers,
    ],
  );

  const handleFielderPinchHit = useCallback(
    (
      benchPlayerId: string,
      benchPlayerName: string,
      fielderId: string,
      fielderName: string,
    ) => {
      const battingPlayers =
        battingTeam === "home" ? homeTeamPlayers : awayTeamPlayers;
      const outgoingPlayer = battingPlayers.find(
        (player) => player.name === fielderName,
      );

      handleLineupCardSubstitution({
        type: "player_sub",
        incomingPlayerId: benchPlayerId,
        incomingPlayerName: benchPlayerName,
        outgoingPlayerId: fielderId,
        outgoingPlayerName: fielderName,
        newPosition: outgoingPlayer?.position,
        lineupSpot: outgoingPlayer?.battingOrder,
      });
      setActiveFielderPopover(null);
    },
    [
      awayTeamPlayers,
      battingTeam,
      handleLineupCardSubstitution,
      homeTeamPlayers,
    ],
  );

  const handleFielderMovePosition = useCallback(
    (playerId: string, newPosition: string) => {
      if (newPosition === "P" || newPosition === "DH") {
        console.warn(
          "[GameTracker] Move position rejected: use substitution controls for pitcher/DH changes",
        );
        setActiveFielderPopover(null);
        return;
      }
      if (activeFielderPopover?.fielder.positionLabel === "P") {
        console.warn(
          "[GameTracker] Move position rejected: use a pitching change to move the pitcher",
        );
        setActiveFielderPopover(null);
        return;
      }
      undoSystem.captureSnapshot(`Position change: ${playerId} to ${newPosition}`);
      switchPositions([{ playerId, newPosition }]);
      setActiveFielderPopover(null);
      queuePlayLogRefresh(80);
    },
    [
      activeFielderPopover?.fielder.positionLabel,
      queuePlayLogRefresh,
      switchPositions,
      undoSystem,
    ],
  );

  // ============================================
  // PITCHER TAP HANDLER (Layer 4 — ticket 4.6)
  // ============================================

  const handlePitcherTap = useCallback(() => {
    openPlayerCard(resolvedCurrentPitcherName, fieldingTeam, "pitcher");
  }, [fieldingTeam, openPlayerCard, resolvedCurrentPitcherName]);

  const handleBatterTap = useCallback(() => {
    openPlayerCard(resolvedCurrentBatterName, battingTeam, "batter");
  }, [battingTeam, openPlayerCard, resolvedCurrentBatterName]);

  // Bench players for fielder popover (fielding team bench)
  const fielderPopoverBenchPlayers: BenchPlayerInfo[] = useMemo(() => {
    const fieldingPlayers =
      fieldingTeam === "home" ? homeTeamPlayers : awayTeamPlayers;
    return fieldingPlayers
      .filter((p) => p.battingOrder === undefined)
      .map((p) => ({
        id: getRosterIdFromName(p.name, fieldingTeam),
        name: p.name,
        position: p.position || "UT",
        isUsed: p.isOutOfGame || false,
      }));
  }, [awayTeamPlayers, fieldingTeam, getRosterIdFromName, homeTeamPlayers]);

  const runnerHoldOutfielderOptions = useMemo(() => {
    const fieldingPlayers =
      fieldingTeam === "home" ? homeTeamPlayers : awayTeamPlayers;

    return fieldingPlayers.reduce<
      Partial<
        Record<
          Extract<Position, "LF" | "CF" | "RF">,
          { playerId: string; playerName: string }
        >
      >
    >((acc, player) => {
      if (
        player.isOutOfGame ||
        (player.position !== "LF" &&
          player.position !== "CF" &&
          player.position !== "RF")
      ) {
        return acc;
      }

      acc[player.position] = {
        playerId: getRosterIdFromName(player.name, fieldingTeam),
        playerName: player.name,
      };
      return acc;
    }, {});
  }, [awayTeamPlayers, fieldingTeam, getRosterIdFromName, homeTeamPlayers]);

  // ============================================
  // OUTCOME RECORDING HANDLERS
  // ============================================

  // Start recording a hit - sets pending state, waits for RECORD button
  const handleHitSelect = useCallback((hitType: HitType) => {
    setPendingOutcome({
      type: "hit",
      subType: hitType,
      rbi: hitType === "HR" ? 1 : 0, // Default 1 RBI for HR, 0 for others
    });
    // Keep the outcome detail panel open
  }, []);

  // Start recording an out
  const handleOutSelect = useCallback((outType: OutType) => {
    setPendingOutcome({
      type: "out",
      subType: outType,
    });
  }, []);

  // Start recording a walk
  const handleWalkSelect = useCallback((walkType: WalkType) => {
    setPendingOutcome({
      type: "walk",
      subType: walkType,
    });
  }, []);

  // Update RBI count for pending outcome
  const handleRbiChange = useCallback((rbi: number) => {
    setPendingOutcome((prev) => (prev ? { ...prev, rbi } : null));
  }, []);

  // Record the pending outcome to IndexedDB
  const handleRecordOutcome = useCallback(async () => {
    if (!pendingOutcome) return;

    try {
      const defaultCorrection = buildRunnerCorrectionForQuickBarOutcome(
        pendingOutcome.subType,
        gameState.bases,
        gameState.outs,
      );

      if (pendingOutcome.type === "hit") {
        await commitPlateAppearanceAndAppend({
          type: "hit",
          hitType: pendingOutcome.subType as HitType,
          rbi: pendingOutcome.rbi || 0,
          runnerAdvancement:
            defaultCorrection?.action.type === "hit"
              ? runnerDefaultsToAdvancement(defaultCorrection.defaults)
              : undefined,
        });
        logAction(
          `${pendingOutcome.subType} (manual) — ${pendingOutcome.rbi || 0} RBI`,
        );
      } else if (pendingOutcome.type === "out") {
        // GAP-GT-6-A: Pass forceNoRuns when user has toggled the time play override
        await commitPlateAppearanceAndAppend({
          type: "out",
          outType: pendingOutcome.subType as OutType,
          runnerAdvancement:
            defaultCorrection?.action.type === "out"
              ? runnerDefaultsToAdvancement(defaultCorrection.defaults)
              : undefined,
          batterReached:
            defaultCorrection?.action.type === "out"
              ? defaultCorrection.action.batterReached
              : undefined,
          isDroppedThirdStrike:
            defaultCorrection?.action.type === "out"
              ? defaultCorrection.action.isDroppedThirdStrike
              : undefined,
          dropReason:
            defaultCorrection?.action.type === "out"
              ? defaultCorrection.action.dropReason
              : undefined,
          forceNoRuns: timePlayNoRun,
        });
        logAction(
          `Out (${pendingOutcome.subType}) (manual entry)${timePlayNoRun ? " [time play — no run]" : ""}`,
        );
        setTimePlayNoRun(false); // Reset time play toggle after recording
      } else if (pendingOutcome.type === "walk") {
        await commitPlateAppearanceAndAppend({
          type: "walk",
          walkType: pendingOutcome.subType as WalkType,
        });
        logAction(`${pendingOutcome.subType} walk (manual)`);
      }

      // GAP-GT-7-C: Clear pendingPH after any at-bat result — the PH has batted
      setPendingPH(null);

      // Clear pending outcome and close panels
      setPendingOutcome(null);
      setExpandedOutcome(null);
    } catch (error) {
      console.error("Failed to record outcome:", error);
    }
  }, [
    commitPlateAppearanceAndAppend,
    gameState.bases,
    gameState.outs,
    logAction,
    pendingOutcome,
    timePlayNoRun,
  ]);

  // Cancel pending outcome
  const handleCancelOutcome = useCallback(() => {
    setPendingOutcome(null);
    setExpandedOutcome(null);
    setTimePlayNoRun(false); // GAP-GT-6-A: Always reset on cancel
  }, []);

  // NOTE: Inning-summary firing moved to a reactive useEffect that watches
  // gameState.inning / isTop / gamePhase transitions (see the effect near
  // firePreamble). This catches all transition paths (modal YES, force-end,
  // auto game-end) without requiring a single handler hook.

  // ══════════════════════════════════════════════════════════════
  // LAYER 5: ENRICHMENT HANDLERS
  // ══════════════════════════════════════════════════════════════

  // 5.1: Open enrichment panel for a play log entry
  const handleEntryTap = useCallback((entry: PlayLogEntry) => {
    setSelectedPlayLogEntry((prev) => {
      if (prev?.id === entry.id) {
        setEnrichingEntry(null);
        setSelectedBetweenPlayEvent(null);
        return null;
      }

      if (entry.eventType === "at_bat") {
        setEnrichingEntry(entry);
      } else {
        setEnrichingEntry(null);
      }

      return entry;
    });
  }, []);

  // GameDiamond removed in Step 1.B (UX-004) — activeDiamondFieldingSequence no longer needed.
  // const activeDiamondFieldingSequence = useMemo(() => { ... }, [enrichingEntry?.eventId, enrichmentCache]);

  // 5.1: Save enrichment field immediately (auto-save on change)
  const handleEnrichmentUpdate = useCallback(
    async (field: keyof EnrichmentUpdate, value: unknown) => {
      if (!enrichingEntry?.eventId) return;

      try {
        const existingAtBat = await getAtBatEvent(enrichingEntry.eventId);
        if (!existingAtBat) {
          return;
        }

        const update: Partial<
          import("../../../utils/eventLog").AtBatEvent["enrichment"]
        > = {
          [field]: value,
        };

        if (field === "basesSaved") {
          const basesSaved =
            value === 1 || value === 2 ? (value as 1 | 2) : undefined;
          const savedRun =
            basesSaved === 1
              ? !!existingAtBat.runners.third
              : basesSaved === 2
                ? !!(existingAtBat.runners.third || existingAtBat.runners.second)
                : false;

          update.basesSaved = basesSaved;
          update.savedRun = savedRun;

          console.log("[M3-2] Recorded saved-bases enrichment", {
            eventId: enrichingEntry.eventId,
            basesSaved: basesSaved ?? null,
            savedRun,
          });
        }

        if (field === "batterOutAdvancing") {
          const nextBatterOutAdvancing = Boolean(value);
          const runnerOutcomesForCompletion = nextBatterOutAdvancing
            ? existingAtBat.runnerOutcomes || []
            : (existingAtBat.runnerOutcomes || []).filter(
                (runnerOutcome) => runnerOutcome.fromBase !== "batter",
              );
          const completedOutcomes =
            completeRunnerOutcomesForDerivation(
              existingAtBat,
              runnerOutcomesForCompletion,
            ).runnerOutcomes;
          const nextRunnerOutcomes = [...completedOutcomes];
          const batterOutcomeIndex = nextRunnerOutcomes.findIndex(
            (runnerOutcome) => runnerOutcome.fromBase === "batter",
          );
          if (batterOutcomeIndex < 0) {
            return;
          }
          const currentBatterOutcome = nextRunnerOutcomes[batterOutcomeIndex];
          nextRunnerOutcomes[batterOutcomeIndex] = {
            ...currentBatterOutcome,
            runnerId: existingAtBat.batterId,
            runnerName: existingAtBat.batterName,
            fromBase: "batter",
            toBase: nextBatterOutAdvancing
              ? "out"
              : currentBatterOutcome.toBase,
            isOutAdvancing: nextBatterOutAdvancing ? true : undefined,
            errorType: nextBatterOutAdvancing
              ? undefined
              : currentBatterOutcome.errorType,
            errorChargedTo: nextBatterOutAdvancing
              ? undefined
              : currentBatterOutcome.errorChargedTo,
          };

          const wpaEditPolicy = getAtBatWpaEditPolicy(existingAtBat, {
            totalInnings: hookTotalInningsRef.current,
            extraInningRunner: hookExtraInningRunnerRef.current,
            extraInningRunnerDelay: hookExtraInningRunnerDelayRef.current,
          });
          const derivedAtBatState = deriveEnrichedAtBatState({
            existingAtBat,
            runnerOutcomes: nextRunnerOutcomes,
            result: existingAtBat.result,
            totalInnings: wpaEditPolicy.totalInnings,
          });
          const nextRunnersAfter = derivedAtBatState.runnersAfter;
          const nextOutsAfter = derivedAtBatState.outsAfter;
          const outsAfterDelta = nextOutsAfter - existingAtBat.outsAfter;

          const timestamp = Date.now();
          await updateAtBatEvent(enrichingEntry.eventId, {
            enrichment: update as NonNullable<AtBatEvent["enrichment"]>,
            runnerOutcomes: derivedAtBatState.runnerOutcomes,
            result: derivedAtBatState.result,
            batterReachedOnError: derivedAtBatState.batterReachedOnError,
            batterErrorType: derivedAtBatState.batterErrorType,
            batterErrorChargedToPosition:
              derivedAtBatState.batterErrorChargedToPosition,
            batterCorrectionOriginalResult:
              derivedAtBatState.batterCorrectionOriginalResult,
            rbiCount: derivedAtBatState.rbiCount,
            runsScored: derivedAtBatState.runsScored,
            outsAfter: nextOutsAfter,
            outsRecorded: derivedAtBatState.outsRecorded,
            runnersAfter: nextRunnersAfter,
            awayScoreAfter: derivedAtBatState.awayScoreAfter,
            homeScoreAfter: derivedAtBatState.homeScoreAfter,
            isWalkOff: derivedAtBatState.isWalkOff,
            ...wpaEditPolicy,
            version: (existingAtBat.version ?? 1) + 1,
            editHistory: [
              {
                field: "enrichment.batterOutAdvancing",
                oldValue: existingAtBat.enrichment?.batterOutAdvancing ?? null,
                newValue: nextBatterOutAdvancing,
                timestamp,
              },
            ],
          });
          await recomputeCommittedManagerWpa("at-bat enrichment commit");

          setEnrichmentCache((prev) => ({
            ...prev,
            [enrichingEntry.eventId!]: {
              ...(prev[enrichingEntry.eventId!] || {}),
              ...update,
            },
          }));

          const latestAtBatEntry = [...playLogEntries]
            .reverse()
            .find((entry) => entry.eventType === "at_bat" && entry.eventId);
          const isLatestAtBat =
            latestAtBatEntry?.eventId === existingAtBat.eventId;
          const targetsCurrentLiveHalf =
            existingAtBat.inning === gameState.inning &&
            existingAtBat.halfInning === (gameState.isTop ? "TOP" : "BOTTOM");
          if (isLatestAtBat) {
            applyBasesCorrection(
              buildLiveBasesFromRunnersAfter(nextRunnersAfter),
              nextRunnersAfter,
              {
                inning: existingAtBat.inning,
                halfInning: existingAtBat.halfInning,
              },
              derivedAtBatState.batterReachedOnError ? "error" : undefined,
            );
            if (targetsCurrentLiveHalf && outsAfterDelta !== 0) {
              applyOutsAdjustment(outsAfterDelta);
            }
          }

          return;
        }

        const timestamp = Date.now();
        const nextVersion = (existingAtBat.version ?? 1) + 1;
        const editHistory: NonNullable<AtBatEvent["editHistory"]> = [
          {
            field: `enrichment.${String(field)}`,
            oldValue:
              existingAtBat.enrichment?.[
                field as keyof NonNullable<AtBatEvent["enrichment"]>
              ] ?? null,
            newValue: value,
            timestamp,
          },
        ];
        if (field === "basesSaved") {
          editHistory.push({
            field: "enrichment.savedRun",
            oldValue: existingAtBat.enrichment?.savedRun ?? null,
            newValue: update.savedRun ?? false,
            timestamp,
          });
        }
        const shouldMarkQualityAtBat =
          field === "pitchesInAtBat" &&
          (value as number) >= 7 &&
          !existingAtBat.isQualityAtBat;
        if (shouldMarkQualityAtBat) {
          editHistory.push({
            field: "isQualityAtBat",
            oldValue: existingAtBat.isQualityAtBat ?? false,
            newValue: true,
            timestamp,
          });
        }

        const isFieldingSyncField =
          field === "fieldingSequence" ||
          field === "fieldingPlayType" ||
          field === "fieldingAttemptType" ||
          field === "fieldingAttemptOutcome" ||
          field === "playMechanic" ||
          field === "basesSaved" ||
          field === "extraGemCreditPositions" ||
          field === "rescuedThrow";
        const isFieldingDataField =
          isFieldingSyncField || field === "fieldingDifficulty";
        let fieldingDerivedAtBatState: ReturnType<
          typeof deriveEnrichedAtBatState
        > | null = null;
        if (isFieldingSyncField) {
          const wpaEditPolicy = getAtBatWpaEditPolicy(existingAtBat, {
            totalInnings: hookTotalInningsRef.current,
            extraInningRunner: hookExtraInningRunnerRef.current,
            extraInningRunnerDelay: hookExtraInningRunnerDelayRef.current,
          });
          const hasExplicitRunnerOutcomes =
            Array.isArray(existingAtBat.runnerOutcomes) &&
            existingAtBat.runnerOutcomes.length > 0;
          if (hasExplicitRunnerOutcomes) {
            const completedOutcomesForDerivation =
              completeRunnerOutcomesForDerivation(
                existingAtBat,
                existingAtBat.runnerOutcomes || [],
              ).runnerOutcomes;
            fieldingDerivedAtBatState = deriveEnrichedAtBatState({
              existingAtBat,
              runnerOutcomes: completedOutcomesForDerivation,
              result: existingAtBat.result,
              totalInnings: wpaEditPolicy.totalInnings,
            });
          }

          const syncedFieldingEvents =
            await buildFieldingSyncEventsForSequenceEdit(
              existingAtBat,
              {
                enrichment:
                  update as Partial<NonNullable<AtBatEvent["enrichment"]>>,
                ...(fieldingDerivedAtBatState
                  ? {
                      result: fieldingDerivedAtBatState.result,
                      runnerOutcomes:
                        fieldingDerivedAtBatState.runnerOutcomes,
                      batterReachedOnError:
                        fieldingDerivedAtBatState.batterReachedOnError,
                      batterErrorType:
                        fieldingDerivedAtBatState.batterErrorType,
                      batterErrorChargedToPosition:
                        fieldingDerivedAtBatState.batterErrorChargedToPosition,
                    }
                  : {}),
              },
            );
          await updateAtBatEventWithFieldingSync(
            enrichingEntry.eventId,
            {
              enrichment: update as NonNullable<AtBatEvent["enrichment"]>,
              ...(fieldingDerivedAtBatState
                ? {
                    runnerOutcomes:
                      fieldingDerivedAtBatState.runnerOutcomes,
                    result: fieldingDerivedAtBatState.result,
                    batterReachedOnError:
                      fieldingDerivedAtBatState.batterReachedOnError,
                    batterErrorType:
                      fieldingDerivedAtBatState.batterErrorType,
                    batterErrorChargedToPosition:
                      fieldingDerivedAtBatState.batterErrorChargedToPosition,
                    batterCorrectionOriginalResult:
                      fieldingDerivedAtBatState.batterCorrectionOriginalResult,
                    rbiCount: fieldingDerivedAtBatState.rbiCount,
                    runsScored: fieldingDerivedAtBatState.runsScored,
                    outsAfter: fieldingDerivedAtBatState.outsAfter,
                    outsRecorded: fieldingDerivedAtBatState.outsRecorded,
                    runnersAfter: fieldingDerivedAtBatState.runnersAfter,
                    awayScoreAfter: fieldingDerivedAtBatState.awayScoreAfter,
                    homeScoreAfter: fieldingDerivedAtBatState.homeScoreAfter,
                    isWalkOff: fieldingDerivedAtBatState.isWalkOff,
                    ...wpaEditPolicy,
                  }
                : {}),
              version: nextVersion,
              editHistory,
              ...(shouldMarkQualityAtBat ? { isQualityAtBat: true } : {}),
            },
            syncedFieldingEvents,
          );
        } else {
          await updateAtBatEvent(enrichingEntry.eventId, {
            enrichment: update as NonNullable<AtBatEvent["enrichment"]>,
            version: nextVersion,
            editHistory,
            ...(shouldMarkQualityAtBat ? { isQualityAtBat: true } : {}),
          });
        }
        await recomputeCommittedManagerWpa("at-bat enrichment commit");

        // Update local cache
        setEnrichmentCache((prev) => ({
          ...prev,
          [enrichingEntry.eventId!]: {
            ...(prev[enrichingEntry.eventId!] || {}),
            ...update,
          },
        }));

        if (fieldingDerivedAtBatState) {
          const nextRunnersAfter = fieldingDerivedAtBatState.runnersAfter;
          const scoreDelta =
            existingAtBat.halfInning === "TOP"
              ? fieldingDerivedAtBatState.awayScoreAfter -
                existingAtBat.awayScoreAfter
              : fieldingDerivedAtBatState.homeScoreAfter -
                existingAtBat.homeScoreAfter;
          const outsAfterDelta =
            fieldingDerivedAtBatState.outsAfter - existingAtBat.outsAfter;
          const latestAtBatEntry = [...playLogEntries]
            .reverse()
            .find((entry) => entry.eventType === "at_bat" && entry.eventId);
          const isLatestAtBat =
            latestAtBatEntry?.eventId === existingAtBat.eventId;
          const targetsCurrentLiveHalf =
            existingAtBat.inning === gameState.inning &&
            existingAtBat.halfInning === (gameState.isTop ? "TOP" : "BOTTOM");

          if (scoreDelta !== 0) {
            const prompt = buildRunnerScoreCorrectionPrompt({
              inning: existingAtBat.inning,
              halfInning: existingAtBat.halfInning,
              current: {
                away: gameState.awayScore,
                home: gameState.homeScore,
              },
              scoreDelta,
            });

            if (prompt) {
              setScoreCorrectionPrompt(prompt);
            }
          }

          if (isLatestAtBat) {
            applyBasesCorrection(
              buildLiveBasesFromRunnersAfter(nextRunnersAfter),
              nextRunnersAfter,
              {
                inning: existingAtBat.inning,
                halfInning: existingAtBat.halfInning,
              },
              fieldingDerivedAtBatState.batterReachedOnError
                ? "error"
                : undefined,
            );
          }

          if (isLatestAtBat && targetsCurrentLiveHalf && outsAfterDelta !== 0) {
            applyOutsAdjustment(outsAfterDelta);
          }
        }

        // Update PlayLogEntry flags
        setPlayLogEntries((prev) =>
          prev.map((e) => {
            if (e.id !== enrichingEntry.id) return e;
            const nextAtBat: AtBatEvent = {
              ...existingAtBat,
              ...(fieldingDerivedAtBatState
                ? {
                    runnerOutcomes:
                      fieldingDerivedAtBatState.runnerOutcomes,
                    result: fieldingDerivedAtBatState.result,
                    batterReachedOnError:
                      fieldingDerivedAtBatState.batterReachedOnError,
                    batterErrorType:
                      fieldingDerivedAtBatState.batterErrorType,
                    batterErrorChargedToPosition:
                      fieldingDerivedAtBatState.batterErrorChargedToPosition,
                    batterCorrectionOriginalResult:
                      fieldingDerivedAtBatState.batterCorrectionOriginalResult,
                    rbiCount: fieldingDerivedAtBatState.rbiCount,
                    runsScored: fieldingDerivedAtBatState.runsScored,
                    outsAfter: fieldingDerivedAtBatState.outsAfter,
                    outsRecorded: fieldingDerivedAtBatState.outsRecorded,
                    runnersAfter: fieldingDerivedAtBatState.runnersAfter,
                    awayScoreAfter: fieldingDerivedAtBatState.awayScoreAfter,
                    homeScoreAfter: fieldingDerivedAtBatState.homeScoreAfter,
                    isWalkOff: fieldingDerivedAtBatState.isWalkOff,
                  }
                : {}),
              enrichment: {
                ...(existingAtBat.enrichment || {}),
                ...update,
              },
              isQualityAtBat: shouldMarkQualityAtBat
                ? true
                : existingAtBat.isQualityAtBat,
            };
            const updated = mapAtBatEventToPlayLogEntry(nextAtBat);
            if (field === "fieldLocation") updated.hasLocationData = true;
            if (isFieldingDataField) updated.hasFieldingData = true;
            if (field === "pitchType") updated.hasPitchType = true;
            if (field === "pitchesInAtBat") {
              updated.hasPitchCount = true;
              if (shouldMarkQualityAtBat) {
                updated.isQAB = true;
              }
            }
            return updated;
          }),
        );

        // Update the enrichingEntry itself so panel reflects changes
        setEnrichingEntry((prev) =>
          prev
            ? {
                ...prev,
                hasLocationData:
                  field === "fieldLocation" ? true : prev.hasLocationData,
                hasFieldingData: isFieldingDataField
                  ? true
                  : prev.hasFieldingData,
                hasPitchType: field === "pitchType" ? true : prev.hasPitchType,
                hasPitchCount:
                  field === "pitchesInAtBat" ? true : prev.hasPitchCount,
                isQAB: shouldMarkQualityAtBat ? true : prev.isQAB,
              }
            : null,
        );
      } catch (err) {
        console.error("[Enrichment] Failed to save:", err);
      }
    },
    [
      applyBasesCorrection,
      applyOutsAdjustment,
      buildFieldingSyncEventsForSequenceEdit,
      gameState.awayScore,
      gameState.homeScore,
      gameState.inning,
      gameState.isTop,
      enrichingEntry,
      playLogEntries,
      recomputeCommittedManagerWpa,
    ],
  );

  // GameDiamond removed in Step 1.B (UX-004) — fielding sequence handlers no longer needed.
  // const handleDiamondFieldingSequenceUndo = useCallback(() => { ... }, [...]);
  // const handleDiamondFieldingSequenceClear = useCallback(() => { ... }, [...]);

  const handleFielderTap = useCallback(
    (
      positionNumber: number,
      playerName: string,
      anchorPosition: { left: string; top: string },
    ) => {
      if (enrichingEntry?.eventId) {
        setActiveRunnerPopover(null);
        setActiveFielderPopover(null);
        const currentSequence =
          enrichmentCache[enrichingEntry.eventId]?.fieldingSequence || [];
        void handleEnrichmentUpdate("fieldingSequence", [
          ...currentSequence,
          positionNumber,
        ]);
        return;
      }

      setActiveRunnerPopover(null);
      const posLabels: Record<number, string> = {
        1: "P",
        2: "C",
        3: "1B",
        4: "2B",
        5: "3B",
        6: "SS",
        7: "LF",
        8: "CF",
        9: "RF",
      };
      const positionLabel = posLabels[positionNumber] || `P${positionNumber}`;
      const playerId = getRosterIdFromName(playerName, fieldingTeam);
      const isCurrentBatter = playerName === resolvedCurrentBatterName;

      setActiveFielderPopover({
        fielder: {
          positionNumber,
          positionLabel,
          playerName,
          playerId,
          isCurrentBatter,
        },
        anchorPosition,
      });
    },
    [
      enrichingEntry?.eventId,
      enrichmentCache,
      fieldingTeam,
      getRosterIdFromName,
      handleEnrichmentUpdate,
      resolvedCurrentBatterName,
    ],
  );

  const handleFieldingDifficultySelect = useCallback(
    (difficulty: NonNullable<EnrichmentUpdate["fieldingDifficulty"]>) => {
      if (enrichingEntry?.eventId) {
        void handleEnrichmentUpdate("fieldingDifficulty", difficulty);
        return;
      }

      setNextEventEnrichment({
        fieldingDifficulty: difficulty,
      } as NonNullable<AtBatEvent["enrichment"]>);
    },
    [enrichingEntry?.eventId, handleEnrichmentUpdate, setNextEventEnrichment],
  );

  // 5.2: K/Kc toggle — updates result field on AtBatEvent
  const handleKToggle = useCallback(async (entry: PlayLogEntry) => {
    if (!entry.eventId) return;
    const newResult = entry.result === "K" ? "Kc" : "K";
    try {
      const existingAtBat = await getAtBatEvent(entry.eventId);
      if (!existingAtBat) {
        return;
      }
      const timestamp = Date.now();
      await updateAtBatEvent(entry.eventId, {
        result: newResult as import("../../../types/game").AtBatResult,
        totalInnings: existingAtBat.totalInnings ?? hookTotalInningsRef.current,
        extraInningRunner:
          existingAtBat.extraInningRunner ??
          hookExtraInningRunnerRef.current,
        extraInningRunnerDelay:
          existingAtBat.extraInningRunnerDelay ??
          hookExtraInningRunnerDelayRef.current,
        version: (existingAtBat.version ?? 1) + 1,
        editHistory: [
          {
            field: "result",
            oldValue: existingAtBat.result,
            newValue: newResult,
            timestamp,
          },
        ],
      });
      setPlayLogEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, result: newResult, hasKType: true } : e,
        ),
      );
    } catch (err) {
      console.error("[K Toggle] Failed:", err);
    }
  }, []);

  // 5.1: Close enrichment panel
  const handleEnrichmentClose = useCallback(() => {
    setSelectedPlayLogEntry(null);
    setSelectedBetweenPlayEvent(null);
    setEnrichingEntry(null);
    setEnrichingRunnerSubEntry(null);
    setEnrichingRunnerParentEntry(null);
    setRunnerOutcomeCorrectionActive(false);
    if (gameState.outs >= 3) {
      scheduleAutoEndInning();
    }
  }, [gameState.outs, scheduleAutoEndInning, setRunnerOutcomeCorrectionActive]);

  // §5.4 UX-024: Defensive lineup enrichment mode — toggles column into fielding sequence builder
  const defensiveEnrichmentMode = useMemo(():
    | DefensiveEnrichmentMode
    | undefined => {
    const eventId = enrichingEntry?.eventId;
    if (!eventId) return undefined;
    const currentSequence = enrichmentCache[eventId]?.fieldingSequence || [];
    return {
      active: true,
      sequence: currentSequence,
      onFielderTap: (posNum: number) => {
        const seq = enrichmentCache[eventId]?.fieldingSequence || [];
        void handleEnrichmentUpdate("fieldingSequence", [...seq, posNum]);
      },
      onDone: () => {
        handleEnrichmentClose();
      },
      onClear: () => {
        void handleEnrichmentUpdate("fieldingSequence", []);
      },
    };
  }, [
    enrichingEntry?.eventId,
    enrichmentCache,
    handleEnrichmentUpdate,
    handleEnrichmentClose,
  ]);

  const handleReturnToLiveAtBat = useCallback(() => {
    setSelectedPlayLogEntry(null);
    setSelectedBetweenPlayEvent(null);
    setEnrichingEntry(null);
    setEnrichingRunnerSubEntry(null);
    setEnrichingRunnerParentEntry(null);
  }, []);

  const dismissScoreCorrectionPrompt = useCallback(() => {
    setScoreCorrectionPrompt(null);
  }, []);

  const applyScoreCorrectionPrompt = useCallback(() => {
    if (!scoreCorrectionPrompt) return;

    if (scoreCorrectionPrompt.awayDelta !== 0) {
      applyScoreAdjustment(
        scoreCorrectionPrompt.inning,
        "TOP",
        scoreCorrectionPrompt.awayDelta,
      );
    }

    if (scoreCorrectionPrompt.homeDelta !== 0) {
      applyScoreAdjustment(
        scoreCorrectionPrompt.inning,
        "BOTTOM",
        scoreCorrectionPrompt.homeDelta,
      );
    }

    setScoreCorrectionPrompt(null);
  }, [applyScoreAdjustment, scoreCorrectionPrompt]);

  // 5.8: Runner sub-entry tap — open runner enrichment panel (UX-050)
  const handleRunnerSubEntryTap = useCallback(
    (subEntry: RunnerSubEntry, parentEntry: PlayLogEntry) => {
      if (enrichingRunnerSubEntry?.id === subEntry.id) {
        // Toggle off
        setEnrichingRunnerSubEntry(null);
        setEnrichingRunnerParentEntry(null);
        return;
      }
      // Close at-bat enrichment if open
      setEnrichingEntry(null);
      setSelectedPlayLogEntry(null);
      setSelectedBetweenPlayEvent(null);
      setEnrichingRunnerSubEntry(subEntry);
      setEnrichingRunnerParentEntry(parentEntry);
    },
    [enrichingRunnerSubEntry],
  );

  const findPlayLogEntryForManagerDecision = useCallback(
    (decision: ManagerDecisionRecord): PlayLogEntry | undefined => {
      const eventIds = [
        decision.decisionEventId,
        ...decision.linkedEventIds,
      ].filter((eventId): eventId is string => Boolean(eventId));

      return playLogEntries.find(
        (entry) => entry.eventId && eventIds.includes(entry.eventId),
      );
    },
    [playLogEntries],
  );

  const findRunnerSubEntryForManagerDecision = useCallback(
    (
      decision: ManagerDecisionRecord,
      entry: PlayLogEntry | undefined,
    ): RunnerSubEntry | undefined => {
      if (!entry?.runnerSubEntries?.length) {
        return undefined;
      }

      return entry.runnerSubEntries.find((subEntry) =>
        decision.involvedPlayerIds.includes(subEntry.runnerId),
      );
    },
    [],
  );

  const canEditManagerDecisionAttribution = useCallback(
    (decision: ManagerDecisionRecord): boolean => {
      const entry = findPlayLogEntryForManagerDecision(decision);
      if (!entry?.isSelectable) {
        return false;
      }

      if (
        decision.decisionType === "bunt_call" ||
        decision.decisionType === "squeeze_call"
      ) {
        return entry.eventType === "at_bat" && entry.isEnrichable;
      }

      if (
        decision.decisionType === "out_advancing_send" ||
        decision.decisionType === "runner_hold"
      ) {
        return Boolean(findRunnerSubEntryForManagerDecision(decision, entry));
      }

      return (
        entry.eventType === "substitution" ||
        entry.eventType === "position_change" ||
        entry.eventType === "pitcher_change"
      );
    },
    [findPlayLogEntryForManagerDecision, findRunnerSubEntryForManagerDecision],
  );

  const handleManagerDecisionEdit = useCallback(
    (decision: ManagerDecisionRecord) => {
      const entry = findPlayLogEntryForManagerDecision(decision);
      if (!entry || !canEditManagerDecisionAttribution(decision)) {
        return;
      }

      const runnerSubEntry = findRunnerSubEntryForManagerDecision(
        decision,
        entry,
      );
      if (runnerSubEntry) {
        handleRunnerSubEntryTap(runnerSubEntry, entry);
        return;
      }

      handleEntryTap(entry);
    },
    [
      canEditManagerDecisionAttribution,
      findPlayLogEntryForManagerDecision,
      findRunnerSubEntryForManagerDecision,
      handleEntryTap,
      handleRunnerSubEntryTap,
    ],
  );

  const managerDecisionFeedEntries = useMemo(() => {
    const playLogEntryByEventId = new Map(
      playLogEntries
        .filter((entry) => entry.eventId)
        .map((entry) => [entry.eventId!, entry] as const),
    );

    return committedManagerDecisions.map((decision) => {
      const eventIds = [
        decision.decisionEventId,
        ...decision.linkedEventIds,
      ].filter((eventId): eventId is string => Boolean(eventId));
      const timestamp =
        eventIds
          .map((eventId) => playLogEntryByEventId.get(eventId)?.timestamp)
          .find((value): value is number => typeof value === "number") ?? 0;
      const sourceEntry = decision.decisionEventId
        ? playLogEntryByEventId.get(decision.decisionEventId)
        : undefined;
      const outcomeEntry = decision.resolvedAtEventId
        ? playLogEntryByEventId.get(decision.resolvedAtEventId)
        : undefined;
      const managerLabel =
        decision.teamId === awayTeamId
          ? awayManagerName
          : decision.teamId === homeTeamId
            ? homeManagerName
            : decision.managerId;

      return buildManagerDecisionFeedEntry(
        decision,
        timestamp,
        canEditManagerDecisionAttribution(decision),
        {
          managerLabel,
          decisionDetail: buildManagerDecisionDetail(decision, sourceEntry),
          outcomeDetail: buildManagerOutcomeDetail(decision, outcomeEntry),
        },
      );
    });
  }, [
    awayManagerName,
    awayTeamId,
    canEditManagerDecisionAttribution,
    committedManagerDecisions,
    homeManagerName,
    homeTeamId,
    playLogEntries,
  ]);

  const managerRecommendations = useMemo(() => {
    if (gameState.gamePhase !== "LIVE") {
      return [];
    }

    const leverageIndex = getCurrentLeverageIndex();
    const currentPitcherStats = pitcherStats.get(currentPitcherData.id);
    const currentLineupBatter =
      currentLineup.find((player) => player.batting) ||
      currentLineup.find(
        (player) => player.playerId === gameState.currentBatterId,
      );
    const currentBatterRoster = battingTeamPlayersRaw.find(
      (player) =>
        getRosterEntityId(player, battingTeam) ===
          (currentLineupBatter?.playerId || gameState.currentBatterId) ||
        player.name === resolvedCurrentBatterName,
    );
    const currentBatter: HitterRecommendationPlayer | undefined =
      currentLineupBatter || currentBatterRoster
        ? {
            playerId:
              currentLineupBatter?.playerId ||
              (currentBatterRoster
                ? getRosterEntityId(currentBatterRoster, battingTeam)
                : gameState.currentBatterId),
            playerName:
              currentLineupBatter?.name ||
              currentBatterRoster?.name ||
              resolvedCurrentBatterName,
            battingOrder:
              currentBatterRoster?.battingOrder ??
              currentLineupBatter?.battingOrder,
            contact: currentBatterRoster?.contact,
            power: currentBatterRoster?.power,
            battingHand: currentBatterRoster?.battingHand,
          }
        : undefined;
    const benchHitters: HitterRecommendationPlayer[] = battingTeamPlayersRaw
      .filter((player) => player.battingOrder === undefined)
      .map((player) => ({
        playerId: getRosterEntityId(player, battingTeam),
        playerName: player.name,
        contact: player.contact,
        power: player.power,
        battingHand: player.battingHand,
        isAvailable: !player.isOutOfGame,
      }));

    const defenders: DefenderRecommendationPlayer[] = defensiveColumnPlayers
      .filter((player) => !player.isPitcher)
      .map((player) => {
        const rosterPlayer = fieldingTeamPlayersRaw.find(
          (candidate) =>
            getRosterEntityId(candidate, fieldingTeam) === player.playerId ||
            candidate.name === player.name,
        );
        return {
          playerId: player.playerId,
          playerName: player.name,
          position: player.position,
          fieldingErrors: playerStats.get(player.playerId)?.fieldingErrors ?? 0,
          fieldingRating: rosterPlayer?.fieldingRating,
          arm: rosterPlayer?.arm,
        };
      });
    const fieldingSnapshot = getLineupStateSnapshot()[fieldingTeam];
    const benchDefenders: BenchDefenderRecommendationPlayer[] =
      fieldingSnapshot.bench
        .map((benchPlayer) => {
          const rosterPlayer = fieldingTeamPlayersRaw.find(
            (candidate) =>
              getRosterEntityId(candidate, fieldingTeam) ===
                benchPlayer.playerId ||
              candidate.name === benchPlayer.playerName,
          );
          const positions =
            benchPlayer.positions.length > 0
              ? benchPlayer.positions
              : [
                  rosterPlayer?.position,
                  rosterPlayer?.secondaryPosition,
                ].filter((position): position is string => Boolean(position));
          return {
            playerId: benchPlayer.playerId,
            playerName: benchPlayer.playerName,
            positions,
            fieldingRating: rosterPlayer?.fieldingRating,
            arm: rosterPlayer?.arm,
            isAvailable: benchPlayer.isAvailable,
          };
        })
        .filter(
          (player) =>
            player.positions.some((position) => position !== "P") &&
            player.isAvailable !== false,
        );

    const scoreDifferentialForFieldingTeam =
      fieldingTeam === "home"
        ? gameState.homeScore - gameState.awayScore
        : gameState.awayScore - gameState.homeScore;

    return generateManagerRecommendations({
      gameId: gameState.gameId,
      inning: gameState.inning,
      half: gameState.isTop ? "top" : "bottom",
      outs: gameState.outs,
      totalInnings: hookTotalInningsRef.current || navigationState?.totalInnings || 9,
      leverageIndex,
      battingTeamId,
      fieldingTeamId,
      offensiveManagerId: battingTeam === "away" ? awayManagerId : homeManagerId,
      defensiveManagerId: fieldingTeam === "away" ? awayManagerId : homeManagerId,
      scoreDifferentialForFieldingTeam,
      currentPitcher: currentPitcherData.id
        ? {
            playerId: currentPitcherData.id,
            playerName: currentPitcherData.name,
            pitchCount: currentPitcherStats?.pitchCount,
            isStarter: activePitcher?.isStarter ?? false,
          }
        : undefined,
      availablePitchers: fieldingTeamPitchersRaw
        .filter((pitcher) => !pitcher.isActive && !pitcher.isOutOfGame)
        .map((pitcher) => ({
          playerId: getRosterEntityId(pitcher, fieldingTeam),
          playerName: pitcher.name,
        })),
      currentBatter,
      benchHitters,
      defenders,
      benchDefenders,
      suppressedRecommendationKeys: suppressedManagerRecommendationKeys,
    });
  }, [
    activePitcher,
    awayManagerId,
    battingTeam,
    battingTeamId,
    battingTeamPlayersRaw,
    currentLineup,
    currentPitcherData.id,
    currentPitcherData.name,
    defensiveColumnPlayers,
    fieldingTeam,
    fieldingTeamId,
    fieldingTeamPitchersRaw,
    fieldingTeamPlayersRaw,
    gameState.awayScore,
    gameState.currentBatterId,
    gameState.gameId,
    gameState.gamePhase,
    gameState.homeScore,
    gameState.inning,
    gameState.isTop,
    gameState.outs,
    getCurrentLeverageIndex,
    getLineupStateSnapshot,
    getRosterEntityId,
    homeManagerId,
    hookTotalInningsRef,
    navigationState?.totalInnings,
    pitcherStats,
    playerStats,
    resolvedCurrentBatterName,
    suppressedManagerRecommendationKeys,
  ]);

  const managerRecommendationFeedEntries = useMemo(() => {
    const timestamp = Date.now();
    return managerRecommendations.map((recommendation, index) =>
      buildManagerRecommendationFeedEntry(recommendation, timestamp + index),
    );
  }, [managerRecommendations]);

  useEffect(() => {
    if (gameState.gamePhase !== "LIVE" || managerRecommendations.length === 0) {
      return;
    }

    let cancelled = false;
    const commitShownRecommendations = async () => {
      let committedAny = false;
      for (const recommendation of managerRecommendations) {
        const dedupeKey = `${recommendation.recommendationId}:${recommendation.suppressKey}`;
        if (committedManagerRecommendationWatchKeysRef.current.has(dedupeKey)) {
          continue;
        }

        const watch = buildManagerRecommendationWatchEvent({
          recommendation,
          opponentTeamId:
            recommendation.teamId === awayTeamId ? homeTeamId : awayTeamId,
        });
        committedManagerRecommendationWatchKeysRef.current.add(dedupeKey);
        try {
          await recordManagerRecommendationWatch(watch);
          committedAny = true;
        } catch (error) {
          committedManagerRecommendationWatchKeysRef.current.delete(dedupeKey);
          console.error(
            "[Manager WPA] Failed to persist recommendation watch:",
            error,
          );
        }
      }

      if (!cancelled && committedAny) {
        await recomputeCommittedManagerWpa("manager recommendation shown");
      }
    };

    void commitShownRecommendations();

    return () => {
      cancelled = true;
    };
  }, [
    awayTeamId,
    gameState.gamePhase,
    homeTeamId,
    managerRecommendations,
    recomputeCommittedManagerWpa,
    recordManagerRecommendationWatch,
  ]);

  const handleManagerRecommendationAction = useCallback(
    async (
      recommendation: ManagerRecommendation,
      action: ManagerRecommendationAction,
    ) => {
      setSuppressedManagerRecommendationKeys((previous) => {
        const next = new Set(previous);
        next.add(recommendation.suppressKey);
        return next;
      });

      const promptedDecisionType =
        getPromptedDecisionTypeForRecommendationAction(action);
      if (promptedDecisionType) {
        const dedupeKey = `${recommendation.recommendationId}:${promptedDecisionType}:${recommendation.suppressKey}`;
        if (committedPromptedManagerRecommendationKeysRef.current.has(dedupeKey)) {
          return;
        }

        const promptedDecision =
          buildPromptedManagerDecisionFromRecommendation({
            recommendation,
            action,
            opponentTeamId:
              recommendation.teamId === awayTeamId ? homeTeamId : awayTeamId,
          });
        if (!promptedDecision) {
          return;
        }

        committedPromptedManagerRecommendationKeysRef.current.add(dedupeKey);
        try {
          await recordPromptedManagerDecision(promptedDecision);
          queuePlayLogRefresh();
          await recomputeCommittedManagerWpa(
            `manager recommendation ${action}`,
          );
        } catch (error) {
          committedPromptedManagerRecommendationKeysRef.current.delete(dedupeKey);
          console.error(
            "[Manager WPA] Failed to commit keep-current recommendation:",
            error,
          );
        }
        return;
      }

      if (
        action === "dismiss" ||
        action === "decline_defensive_sub"
      ) {
        return;
      }

      if (action === "open_pitching_change") {
        const pitcherId = recommendation.trackedPlayerIds[0] || currentPitcherData.id;
        const pitcher =
          fieldingTeamPitchersRaw.find(
            (candidate) =>
              getRosterEntityId(candidate, fieldingTeam) === pitcherId ||
              candidate.name === currentPitcherData.name,
          ) || activePitcher;
        setSelectedPlayer({
          name: pitcher?.name || currentPitcherData.name,
          type: "pitcher",
          playerId: pitcherId,
        });
        return;
      }

      if (action === "open_pinch_hit") {
        const batterId = recommendation.trackedPlayerIds[0];
        const batter =
          battingTeamPlayersRaw.find(
            (candidate) =>
              getRosterEntityId(candidate, battingTeam) === batterId ||
              candidate.name === resolvedCurrentBatterName,
          ) || currentLineup.find((player) => player.playerId === batterId);
        if (batter) {
          const playerId =
            "batting" in batter
              ? batter.playerId
              : getRosterEntityId(batter, battingTeam);
          setSelectedPlayer({
            name: batter.name,
            type: "batter",
            playerId,
          });
        }
        return;
      }

      if (action === "open_defensive_sub") {
        const defenderId = recommendation.trackedPlayerIds[0];
        const defender =
          defensiveColumnPlayers.find((player) => player.playerId === defenderId) ||
          fieldingTeamPlayersRaw.find(
            (candidate) =>
              getRosterEntityId(candidate, fieldingTeam) === defenderId,
          );
        if (defender) {
          const playerId =
            "isPitcher" in defender
              ? defender.playerId
              : getRosterEntityId(defender, fieldingTeam);
          setSelectedPlayer({
            name: defender.name,
            type: "batter",
            playerId,
          });
        }
      }
    },
    [
      activePitcher,
      awayTeamId,
      battingTeam,
      battingTeamPlayersRaw,
      currentLineup,
      currentPitcherData.id,
      currentPitcherData.name,
      defensiveColumnPlayers,
      fieldingTeam,
      fieldingTeamPitchersRaw,
      fieldingTeamPlayersRaw,
      getRosterEntityId,
      homeTeamId,
      queuePlayLogRefresh,
      recomputeCommittedManagerWpa,
      recordPromptedManagerDecision,
      resolvedCurrentBatterName,
    ],
  );

  const newsBoardEntries = useMemo(
    () => [
      ...managerRecommendationFeedEntries,
      ...commentaryEntries,
      ...managerDecisionFeedEntries,
    ],
    [
      commentaryEntries,
      managerDecisionFeedEntries,
      managerRecommendationFeedEntries,
    ],
  );

  // 5.9: Runner sub-entry enrichment update — persists to AtBatEvent.runnerOutcomes[] (UX-050)
  const handleRunnerEnrichmentUpdate = useCallback(
    async (
      subEntryId: string,
      field:
        | "fieldingSequence"
        | "playMechanic"
        | "fielderId"
        | "fielderPosition"
        | "heldByOf"
        | "holdingFielder"
        | "baseSaved"
        | "isTootblan"
        | "isOutAdvancing"
        | "managerIntent"
        | "managerRunPlay"
        | "managerDecisionSource"
        | "managerDecisionNote"
        | "errorType"
        | "errorChargedTo"
        | "toBase",
      value: unknown,
    ) => {
      if (!enrichingRunnerSubEntry || !enrichingRunnerParentEntry?.eventId)
        return;

      try {
        const existingAtBat = await getAtBatEvent(
          enrichingRunnerParentEntry.eventId,
        );
        if (!existingAtBat) return;

        const existingOutcomeIndex =
          existingAtBat.runnerOutcomes?.findIndex((outcome) => {
            const sameRunnerId =
              outcome.runnerId &&
              enrichingRunnerSubEntry.runnerId &&
              outcome.runnerId === enrichingRunnerSubEntry.runnerId;
            const sameRunnerName =
              outcome.runnerName === enrichingRunnerSubEntry.runnerName;
            return (
              outcome.fromBase === enrichingRunnerSubEntry.fromBase &&
              (sameRunnerId || sameRunnerName)
            );
          }) ?? -1;

        const updatedOutcomes = [...(existingAtBat.runnerOutcomes || [])];
        const previousOutcome =
          existingOutcomeIndex >= 0
            ? updatedOutcomes[existingOutcomeIndex]
            : {
                runnerId: enrichingRunnerSubEntry.runnerId,
                runnerName: enrichingRunnerSubEntry.runnerName,
                fromBase: enrichingRunnerSubEntry.fromBase,
                toBase: enrichingRunnerSubEntry.toBase,
                fieldingSequence: enrichingRunnerSubEntry.fieldingSequence,
                playMechanic: enrichingRunnerSubEntry.playMechanic,
                fielderId: enrichingRunnerSubEntry.fielderId,
                fielderPosition: enrichingRunnerSubEntry.fielderPosition,
                heldByOf: enrichingRunnerSubEntry.heldByOf,
                holdingFielder: enrichingRunnerSubEntry.holdingFielder,
                baseSaved: enrichingRunnerSubEntry.baseSaved,
                isTootblan: enrichingRunnerSubEntry.isTootblan,
                isOutAdvancing: enrichingRunnerSubEntry.isOutAdvancing,
                managerIntent: enrichingRunnerSubEntry.managerIntent,
                managerRunPlay: enrichingRunnerSubEntry.managerRunPlay,
                managerDecisionSource:
                  enrichingRunnerSubEntry.managerDecisionSource,
                managerDecisionNote: enrichingRunnerSubEntry.managerDecisionNote,
                errorType: enrichingRunnerSubEntry.errorType,
                errorChargedTo: enrichingRunnerSubEntry.errorChargedTo,
                errorAttributions: enrichingRunnerSubEntry.errorAttributions,
              };
        const runnerIdx =
          existingOutcomeIndex >= 0 ? existingOutcomeIndex : updatedOutcomes.length;
        const nextOutcomeDraft = { ...previousOutcome, [field]: value };
        const nextHeldBaseSaved = getHeldByOfBaseSaved(
          nextOutcomeDraft.toBase,
          existingAtBat.result,
        );
        const holdPosition =
          value === "LF" || value === "CF" || value === "RF"
            ? value
            : undefined;
        if (field === "playMechanic" && value !== "hold") {
          nextOutcomeDraft.heldByOf = false;
          nextOutcomeDraft.holdingFielder = undefined;
          nextOutcomeDraft.baseSaved = undefined;
          nextOutcomeDraft.fielderId = undefined;
          nextOutcomeDraft.fielderPosition = undefined;
        }
        if (field === "heldByOf") {
          if (value) {
            nextOutcomeDraft.playMechanic = "hold";
            nextOutcomeDraft.baseSaved = nextHeldBaseSaved ?? undefined;
          } else {
            nextOutcomeDraft.playMechanic = undefined;
            nextOutcomeDraft.holdingFielder = undefined;
            nextOutcomeDraft.baseSaved = undefined;
            nextOutcomeDraft.fielderId = undefined;
            nextOutcomeDraft.fielderPosition = undefined;
          }
        }
        if (field === "holdingFielder") {
          nextOutcomeDraft.heldByOf = true;
          nextOutcomeDraft.playMechanic = "hold";
          nextOutcomeDraft.fielderPosition = holdPosition;
          nextOutcomeDraft.baseSaved = nextHeldBaseSaved ?? undefined;
        }
        if (field === "fielderPosition") {
          nextOutcomeDraft.holdingFielder = holdPosition;
        }
        if (
          field === "toBase" &&
          nextOutcomeDraft.toBase !== nextOutcomeDraft.fromBase
        ) {
          nextOutcomeDraft.playMechanic = undefined;
          nextOutcomeDraft.heldByOf = false;
          nextOutcomeDraft.holdingFielder = undefined;
          nextOutcomeDraft.baseSaved = undefined;
          nextOutcomeDraft.fielderId = undefined;
          nextOutcomeDraft.fielderPosition = undefined;
        }
        if (field === "toBase" && nextOutcomeDraft.heldByOf) {
          nextOutcomeDraft.baseSaved = nextHeldBaseSaved ?? undefined;
        }
        if (field === "toBase" && !nextHeldBaseSaved) {
          nextOutcomeDraft.playMechanic = undefined;
          nextOutcomeDraft.heldByOf = false;
          nextOutcomeDraft.holdingFielder = undefined;
          nextOutcomeDraft.baseSaved = undefined;
          nextOutcomeDraft.fielderId = undefined;
          nextOutcomeDraft.fielderPosition = undefined;
        }
        if (
          field === "toBase" &&
          nextOutcomeDraft.toBase !== "out"
        ) {
          nextOutcomeDraft.isTootblan = false;
          nextOutcomeDraft.isOutAdvancing = false;
          if (nextOutcomeDraft.managerIntent === "manager_send") {
            nextOutcomeDraft.managerIntent = "runner_choice";
            nextOutcomeDraft.managerDecisionSource = "play_log_enhancement";
          }
        }
        if (field === "isOutAdvancing") {
          nextOutcomeDraft.managerIntent = value
            ? "manager_send"
            : "runner_choice";
          nextOutcomeDraft.managerDecisionSource = "play_log_enhancement";
        }
        if (field === "managerIntent") {
          if (
            value === "manager_send" ||
            value === "runner_choice" ||
            value === "runner_responsibility" ||
            value === "manager_hold"
          ) {
            nextOutcomeDraft.managerIntent = value;
            nextOutcomeDraft.managerDecisionSource =
              nextOutcomeDraft.managerDecisionSource ??
              "play_log_enhancement";
          } else {
            nextOutcomeDraft.managerIntent = undefined;
            if (!nextOutcomeDraft.managerRunPlay) {
              nextOutcomeDraft.managerDecisionSource = undefined;
              nextOutcomeDraft.managerDecisionNote = undefined;
            }
          }
        }
        if (field === "managerRunPlay") {
          if (value === "hit_and_run") {
            nextOutcomeDraft.managerRunPlay = value;
            nextOutcomeDraft.managerDecisionSource =
              nextOutcomeDraft.managerDecisionSource ??
              "play_log_enhancement";
          } else {
            nextOutcomeDraft.managerRunPlay = undefined;
            if (!nextOutcomeDraft.managerIntent) {
              nextOutcomeDraft.managerDecisionSource = undefined;
              nextOutcomeDraft.managerDecisionNote = undefined;
            }
          }
        }
        if (
          field === "toBase" &&
          !crossesRunnerOutcomeBoundary(
            previousOutcome.toBase,
            nextOutcomeDraft.toBase,
          )
        ) {
          nextOutcomeDraft.errorType = undefined;
          nextOutcomeDraft.errorChargedTo = undefined;
          nextOutcomeDraft.errorAttributions = undefined;
        }
        if (
          field === "errorType" &&
          (typeof value !== "string" ||
            !RUNNER_ERROR_TYPES.includes(
              value as (typeof RUNNER_ERROR_TYPES)[number],
            ))
        ) {
          nextOutcomeDraft.errorChargedTo = undefined;
          nextOutcomeDraft.errorAttributions = undefined;
        }
        if (
          field === "errorChargedTo" &&
          (typeof value !== "number" ||
            !Object.prototype.hasOwnProperty.call(
              POSITION_NUMBER_TO_CODE,
              value,
            ))
        ) {
          nextOutcomeDraft.errorChargedTo = undefined;
          nextOutcomeDraft.errorAttributions = undefined;
        }
        if (
          nextOutcomeDraft.errorType &&
          typeof nextOutcomeDraft.errorChargedTo === "number"
        ) {
          nextOutcomeDraft.errorAttributions = [{
            type: nextOutcomeDraft.errorType,
            positions: [nextOutcomeDraft.errorChargedTo],
          }];
        }
        updatedOutcomes[runnerIdx] = nextOutcomeDraft;
        const nextOutcome = updatedOutcomes[runnerIdx];
        const completedOutcomesForDerivation =
          completeRunnerOutcomesForDerivation(existingAtBat, updatedOutcomes)
            .runnerOutcomes;

        const previousOutCounted = runnerOutcomeCountsAsOut(previousOutcome);
        const nextOutCounted = runnerOutcomeCountsAsOut(nextOutcome);
        const hadPriorOutToSafeCorrection = (existingAtBat.editHistory || []).some(
          (entry) =>
            entry.field === `runnerOutcomes[${runnerIdx}].toBase` &&
            entry.oldValue === "out" &&
            entry.newValue !== "out",
        );
        const runnerReachedOnError =
          !nextOutCounted &&
          !!nextOutcome.errorType &&
          (previousOutCounted || hadPriorOutToSafeCorrection);
        const derivedOutsRecorded = completedOutcomesForDerivation.filter(
          runnerOutcomeCountsAsOut,
        ).length;
        const storedOriginalBatterResult =
          existingAtBat.batterCorrectionOriginalResult;
        const baseBatterResult =
          storedOriginalBatterResult ?? existingAtBat.result;
        const isCorrectableBatterOutcome =
          nextOutcome.fromBase === "batter" &&
          isCorrectableBatterResult(baseBatterResult);
        let correctedResult: typeof existingAtBat.result | null = null;
        if (isCorrectableBatterOutcome) {
          const shouldPreserveZeroOutFc =
            existingAtBat.result === "FC" &&
            nextOutcome.toBase === "first" &&
            !nextOutcome.errorType &&
            !nextOutCounted &&
            derivedOutsRecorded === 0;
          if (!shouldPreserveZeroOutFc) {
            const resolvedBatterResult = resolveBatterOutcomeResult({
              currentResult: existingAtBat.result,
              originalResult: storedOriginalBatterResult,
              nextOutcome,
              nextOutsRecorded: derivedOutsRecorded,
            });
            if (resolvedBatterResult !== existingAtBat.result) {
              correctedResult = resolvedBatterResult;
            }
          }
        } else if (existingAtBat.result === "GO") {
          if (derivedOutsRecorded >= 2) {
            correctedResult = "DP";
          }
        } else if (existingAtBat.result === "DP") {
          if (derivedOutsRecorded < 2) {
            correctedResult = "GO";
          }
        }
        const wpaEditPolicy = getAtBatWpaEditPolicy(existingAtBat, {
          totalInnings: hookTotalInningsRef.current,
          extraInningRunner: hookExtraInningRunnerRef.current,
          extraInningRunnerDelay: hookExtraInningRunnerDelayRef.current,
        });
        const derivedAtBatState = deriveEnrichedAtBatState({
          existingAtBat,
          runnerOutcomes: completedOutcomesForDerivation,
          result: correctedResult ?? existingAtBat.result,
          totalInnings: wpaEditPolicy.totalInnings,
        });
        const nextRecordedResult = derivedAtBatState.result;
        const nextRunsScored = derivedAtBatState.runsScored;
        const nextRunnersAfter = derivedAtBatState.runnersAfter;
        const nextAwayScoreAfter = derivedAtBatState.awayScoreAfter;
        const nextHomeScoreAfter = derivedAtBatState.homeScoreAfter;
        const nextOutsRecorded = derivedAtBatState.outsRecorded;
        const nextOutsAfter = derivedAtBatState.outsAfter;
        const nextIsWalkOff = derivedAtBatState.isWalkOff;
        const nextBatterReachedOnError =
          derivedAtBatState.batterReachedOnError;
        const nextBatterErrorType = derivedAtBatState.batterErrorType;
        const nextBatterErrorChargedToPosition =
          derivedAtBatState.batterErrorChargedToPosition;
        const nextBatterCorrectionOriginalResult =
          derivedAtBatState.batterCorrectionOriginalResult;
        const scoreDelta =
          existingAtBat.halfInning === "TOP"
            ? nextAwayScoreAfter - existingAtBat.awayScoreAfter
            : nextHomeScoreAfter - existingAtBat.homeScoreAfter;
        const outsAfterDelta = nextOutsAfter - existingAtBat.outsAfter;
        const resultChanged = nextRecordedResult !== existingAtBat.result;
        const nextEndGameEvaluation = evaluateEndGameTrigger({
          inning: existingAtBat.inning,
          isTop: existingAtBat.halfInning === "TOP",
          homeScoreBefore: existingAtBat.homeScore,
          awayScoreBefore: existingAtBat.awayScore,
          homeScoreAfter: nextHomeScoreAfter,
          awayScoreAfter: nextAwayScoreAfter,
          context: "live_play",
        });
        const nextVersionBase = existingAtBat.version ?? 1;

        const timestamp = Date.now();
        const nextVersion =
          nextVersionBase + (resultChanged ? 2 : 1);
        const editHistory: NonNullable<AtBatEvent["editHistory"]> = [];
        pushEditHistoryEntry(
          editHistory,
          `runnerOutcomes[${runnerIdx}].${field}`,
          previousOutcome[
            field as keyof typeof previousOutcome
          ],
          value,
          timestamp,
        );
        pushEditHistoryEntry(
          editHistory,
          `runnerOutcomes[${runnerIdx}].managerIntent`,
          previousOutcome.managerIntent ?? null,
          nextOutcome.managerIntent ?? null,
          timestamp,
        );
        pushEditHistoryEntry(
          editHistory,
          `runnerOutcomes[${runnerIdx}].managerRunPlay`,
          previousOutcome.managerRunPlay ?? null,
          nextOutcome.managerRunPlay ?? null,
          timestamp,
        );
        pushEditHistoryEntry(
          editHistory,
          `runnerOutcomes[${runnerIdx}].managerDecisionSource`,
          previousOutcome.managerDecisionSource ?? null,
          nextOutcome.managerDecisionSource ?? null,
          timestamp,
        );
        if (resultChanged) {
          pushEditHistoryEntry(
            editHistory,
            "result",
            existingAtBat.result,
            correctedResult,
            timestamp,
          );
        }
        if (isCorrectableBatterOutcome) {
          pushEditHistoryEntry(
            editHistory,
            "batterReachedOnError",
            existingAtBat.batterReachedOnError,
            nextBatterReachedOnError,
            timestamp,
          );
          pushEditHistoryEntry(
            editHistory,
            "batterErrorType",
            existingAtBat.batterErrorType,
            nextBatterErrorType,
            timestamp,
          );
          pushEditHistoryEntry(
            editHistory,
            "batterErrorChargedToPosition",
            existingAtBat.batterErrorChargedToPosition,
            nextBatterErrorChargedToPosition,
            timestamp,
          );
          pushEditHistoryEntry(
            editHistory,
            "batterCorrectionOriginalResult",
            existingAtBat.batterCorrectionOriginalResult,
            nextBatterCorrectionOriginalResult,
            timestamp,
          );
        }

        const nextAtBatEvent: AtBatEvent = {
          ...existingAtBat,
          runnerOutcomes: derivedAtBatState.runnerOutcomes,
          batterReachedOnError: nextBatterReachedOnError,
          batterErrorType: nextBatterErrorType,
          batterErrorChargedToPosition: nextBatterErrorChargedToPosition,
          batterCorrectionOriginalResult: nextBatterCorrectionOriginalResult,
          rbiCount: derivedAtBatState.rbiCount,
          runsScored: nextRunsScored,
          outsAfter: nextOutsAfter,
          runnersAfter: nextRunnersAfter,
          awayScoreAfter: nextAwayScoreAfter,
          homeScoreAfter: nextHomeScoreAfter,
          isWalkOff: nextIsWalkOff,
          outsRecorded: nextOutsRecorded,
          result: nextRecordedResult,
          version: nextVersion,
          editHistory: [...(existingAtBat.editHistory || []), ...editHistory],
        };

        const syncedFieldingEvents =
          await buildFieldingSyncEventsForSequenceEdit(existingAtBat, {
            result: nextRecordedResult,
            runnerOutcomes: derivedAtBatState.runnerOutcomes,
            batterReachedOnError: nextAtBatEvent.batterReachedOnError,
            batterErrorType: nextAtBatEvent.batterErrorType,
            batterErrorChargedToPosition:
              nextAtBatEvent.batterErrorChargedToPosition,
          });

        const [
          previousRunnerChargedPlayerId,
          nextRunnerChargedPlayerId,
          previousBatterChargedPlayerId,
          nextBatterChargedPlayerId,
        ] =
          await Promise.all([
            resolveRunnerOutcomeErrorPlayerId(existingAtBat, previousOutcome),
            resolveRunnerOutcomeErrorPlayerId(existingAtBat, nextOutcome),
            resolveBatterOutcomeErrorPlayerId(existingAtBat),
            resolveBatterOutcomeErrorPlayerId(nextAtBatEvent),
          ]);

        await updateAtBatEventWithFieldingSync(
          enrichingRunnerParentEntry.eventId,
          {
            runnerOutcomes: derivedAtBatState.runnerOutcomes,
            batterReachedOnError: nextAtBatEvent.batterReachedOnError,
            batterErrorType: nextAtBatEvent.batterErrorType,
            batterErrorChargedToPosition:
              nextAtBatEvent.batterErrorChargedToPosition,
            batterCorrectionOriginalResult:
              nextAtBatEvent.batterCorrectionOriginalResult,
            rbiCount: nextAtBatEvent.rbiCount,
            runsScored: nextRunsScored,
            outsAfter: nextOutsAfter,
            runnersAfter: nextRunnersAfter,
            awayScoreAfter: nextAwayScoreAfter,
            homeScoreAfter: nextHomeScoreAfter,
            isWalkOff: nextIsWalkOff,
            outsRecorded: nextOutsRecorded,
            ...wpaEditPolicy,
            result: nextRecordedResult,
            version: nextVersion,
            editHistory,
          },
          syncedFieldingEvents,
        );
        await recomputeCommittedManagerWpa("runner enrichment commit");

        for (const adjustment of buildFieldingErrorAdjustments(
          previousRunnerChargedPlayerId,
          nextRunnerChargedPlayerId,
        )) {
          adjustPlayerFieldingErrors(adjustment.playerId, adjustment.delta);
        }
        for (const adjustment of buildFieldingErrorAdjustments(
          previousBatterChargedPlayerId,
          nextBatterChargedPlayerId,
        )) {
          adjustPlayerFieldingErrors(adjustment.playerId, adjustment.delta);
        }

        if (
          nextOutcome.heldByOf &&
          nextOutcome.baseSaved &&
          (nextOutcome.holdingFielder || nextOutcome.fielderPosition)
        ) {
          console.log("[M3-1-fix] Saved OF hold enrichment", {
            eventId: enrichingRunnerParentEntry.eventId,
            runnerId: nextOutcome.runnerId,
            runnerName: nextOutcome.runnerName,
            fromBase: nextOutcome.fromBase,
            toBase: nextOutcome.toBase,
            baseSaved: nextOutcome.baseSaved,
            heldByOf: nextOutcome.heldByOf,
            holdingFielder:
              nextOutcome.holdingFielder ?? nextOutcome.fielderPosition,
            fielderId: nextOutcome.fielderId,
            fielderPosition: nextOutcome.fielderPosition,
          });
        }
        if (nextOutcome.errorType && typeof nextOutcome.errorChargedTo === "number") {
          console.log("[M3-3-v2] Recorded runner outcome error charge", {
            eventId: enrichingRunnerParentEntry.eventId,
            runnerId: nextOutcome.runnerId,
            runnerName: nextOutcome.runnerName,
            fromBase: nextOutcome.fromBase,
            toBase: nextOutcome.toBase,
            errorType: nextOutcome.errorType,
            errorChargedToPosition: nextOutcome.errorChargedTo,
            recordedResult: nextRecordedResult,
          });
        }

        const latestAtBatEntry = [...playLogEntries]
          .reverse()
          .find((entry) => entry.eventType === "at_bat" && entry.eventId);
        const isLatestAtBat =
          latestAtBatEntry?.eventId === existingAtBat.eventId;
        const targetsCurrentLiveHalf =
          existingAtBat.inning === gameState.inning &&
          existingAtBat.halfInning === (gameState.isTop ? "TOP" : "BOTTOM");

        // Score adjustment is scoped to the edited at-bat's batting side.
        if (scoreDelta !== 0) {
          const prompt = buildRunnerScoreCorrectionPrompt({
            inning: existingAtBat.inning,
            halfInning: existingAtBat.halfInning,
            current: {
              away: gameState.awayScore,
              home: gameState.homeScore,
            },
            scoreDelta,
          });

          if (prompt) {
            setScoreCorrectionPrompt(prompt);
          }
        }

        // Fix B: Update live base state for latest at-bat corrections
        if (isLatestAtBat) {
          applyBasesCorrection(
            buildLiveBasesFromRunnersAfter(nextRunnersAfter),
            nextRunnersAfter,
            {
              inning: existingAtBat.inning,
              halfInning: existingAtBat.halfInning,
            },
            nextAtBatEvent.batterReachedOnError ? "error" : undefined,
          );
        }

        if (runnerReachedOnError) {
          updateTrackedRunnerHowReached(
            {
              runnerId: nextOutcome.runnerId,
              runnerName: nextOutcome.runnerName,
            },
            "error",
          );
        }

        // Fix C: Update live outs count for latest at-bat corrections
        if (isLatestAtBat && targetsCurrentLiveHalf && outsAfterDelta !== 0) {
          applyOutsAdjustment(outsAfterDelta);
        }

        if (
          isLatestAtBat &&
          targetsCurrentLiveHalf &&
          scoreDelta !== 0 &&
          gameState.gamePhase === "LIVE" &&
          nextEndGameEvaluation.shouldEndGame
        ) {
          queueAutoEndGame();
        }

        const updatedParentEntry = mapAtBatEventToPlayLogEntry(nextAtBatEvent);
        const updatedSubEntry =
          updatedParentEntry.runnerSubEntries?.find((sub) => sub.id === subEntryId) ??
          null;

        setEnrichingRunnerSubEntry(updatedSubEntry);
        setPlayLogEntries((prev) =>
          prev.map((entry) =>
            entry.id === enrichingRunnerParentEntry.id ? updatedParentEntry : entry,
          ),
        );
        setEnrichingRunnerParentEntry(updatedParentEntry);

        queuePlayLogRefresh(0);
      } catch (err) {
        console.error("[Runner Enrichment] Failed to save:", err);
      }
    },
    [
      adjustPlayerFieldingErrors,
      applyScoreAdjustment,
      applyBasesCorrection,
      applyOutsAdjustment,
      buildFieldingSyncEventsForSequenceEdit,
      evaluateEndGameTrigger,
      gameState.gamePhase,
      gameState.homeScore,
      gameState.awayScore,
      gameState.inning,
      gameState.isTop,
      enrichingRunnerSubEntry,
      enrichingRunnerParentEntry,
      playLogEntries,
      queueAutoEndGame,
      queuePlayLogRefresh,
      recomputeCommittedManagerWpa,
      resolveBatterOutcomeErrorPlayerId,
      resolveRunnerOutcomeErrorPlayerId,
      updateTrackedRunnerHowReached,
    ],
  );

  // 5.7: Dismiss between-inning enrichment prompt
  const handleEnrichmentPromptYes = useCallback(() => {
    setShowEnrichmentPrompt(false);
    // Find first unenriched play and open its panel
    const firstUnenriched = playLogEntries.find(
      (e) =>
        e.isEnrichable &&
        (!e.hasPitchType || !e.hasLocationData || !e.hasFieldingData),
    );
    if (firstUnenriched) {
      setSelectedPlayLogEntry(firstUnenriched);
      setEnrichingEntry(firstUnenriched);
    }
  }, [playLogEntries]);

  const handleEnrichmentPromptSkip = useCallback(() => {
    setShowEnrichmentPrompt(false);
  }, []);

  const handleStartGame = useCallback(() => {
    syncDisplayedRostersToLineupSnapshot(getLineupStateSnapshot());
    setRosterVersion((v) => v + 1);
    playAudio("startGame");
    startGame();
  }, [
    getLineupStateSnapshot,
    playAudio,
    startGame,
    syncDisplayedRostersToLineupSnapshot,
  ]);

  // R3-R7: Prefer UndoSystem snapshot for proper state restore (score, outs).
  // After refresh (snapshot stack empty), allow DB-based undo as fallback
  // but only when there are plays in the log (prevents undoing pre-game events).
  const hasPlaysToUndo = playLogEntries.length > 0;
  const displayedUndoCount = undoSystem.canUndo ? undoSystem.undoCount : (hasPlaysToUndo ? 1 : 0);
  const handleUndoPress = useCallback(() => {
    if (undoSystem.canUndo) {
      undoSystem.performUndo();
    } else if (hasPlaysToUndo) {
      // Fallback: DB undo without snapshot (after refresh). Score won't fully revert
      // but at least the play is removed. Use dummy snapshot so handleUndo runs the DB path.
      handleUndo({
        timestamp: Date.now(),
        playDescription: "Undo durable action (post-refresh)",
        gameState: null,
      } as GameSnapshot);
    } else {
      console.warn("[R3-R7] Undo blocked — no plays to undo");
    }
  }, [handleUndo, undoSystem]);

  // Handle end game with navigation
  const handleEndGame = useCallback(async () => {
    // T1-08 FIX: Prevent double execution from useEffect re-firing
    if (gameEndingRef.current) {
      console.log(
        "[T1-08] handleEndGame already in progress — skipping duplicate call",
      );
      return;
    }
    console.debug("[END-GAME] Step 1: Starting handleEndGame");
    gameEndingRef.current = true;
    // R2-6 FIX: Don't show "Processing game..." overlay yet — it blocks the pitch count modal.
    // It will be shown after hookEndGame completes (pitch count confirmed + stats aggregated).
    let endGameCompleted = false;
    playAudio("endGame");

    try {
      // MAJ-09: End-of-game achievement detection (No-Hitter, Perfect Game, Maddux, CG, Shutout)
      try {
        const finalScore = {
          away: gameState.awayScore,
          home: gameState.homeScore,
        };
        const resolvedBlownSaveEvents = [
          ...completedSaveAppearancesRef.current,
          ...Object.values(activeSaveAppearancesRef.current).filter(
            (
              appearance,
            ): appearance is SaveAppearanceSnapshot => appearance != null,
          ),
        ]
          .map((snapshot) =>
            detectBlownSaveEvent(
              snapshot,
              getTeamWonFromFinalScore(snapshot.teamSide, finalScore),
            ),
          )
          .filter(
            (event): event is DetectedFameEvent => event !== null,
          );
        recordDetectedFameEvents(resolvedBlownSaveEvents);

        const totalGameOuts = gameState.inning * 3; // Approximate from current inning
        for (const [pitcherId, pStats] of pitcherStats.entries()) {
          if (!pStats.isStarter) continue; // Only starters can have CG/NH/PG

          const ipOuts = pStats.outsRecorded;
          // Complete game: starter must have pitched the entire game (≥ scheduled innings × 3 outs)
          const scheduledOuts = 9 * 3; // 9-inning game standard
          const isCompleteGame = ipOuts >= scheduledOuts;
          if (!isCompleteGame) continue;

          const pitcherName = pitcherId; // ID contains name info from game state tracking
          const isShutout = isCompleteGame && pStats.runsAllowed === 0;
          const isNoHitter = isShutout && pStats.hitsAllowed === 0;
          const isPerfectGame =
            isNoHitter &&
            pStats.walksAllowed === 0 &&
            (pStats.hitByPitch || 0) === 0;
          const isMaddux = isShutout && pStats.pitchCount < 100;

          if (isPerfectGame) {
            fameTrackingHook.recordFameEvent(
              "PERFECT_GAME" as FameEventType,
              pitcherId,
              pitcherName,
              gameState.inning,
              gameState.isTop ? "TOP" : "BOTTOM",
              1.0,
            );
            console.log(`[MAJ-09] Perfect Game detected for ${pitcherId}`);
          } else if (isNoHitter) {
            fameTrackingHook.recordFameEvent(
              "NO_HITTER" as FameEventType,
              pitcherId,
              pitcherName,
              gameState.inning,
              gameState.isTop ? "TOP" : "BOTTOM",
              1.0,
            );
            console.log(`[MAJ-09] No-Hitter detected for ${pitcherId}`);
          } else if (isMaddux) {
            fameTrackingHook.recordFameEvent(
              "MADDUX" as FameEventType,
              pitcherId,
              pitcherName,
              gameState.inning,
              gameState.isTop ? "TOP" : "BOTTOM",
              1.0,
            );
            console.log(`[MAJ-09] Maddux detected for ${pitcherId}`);
          } else if (isShutout) {
            fameTrackingHook.recordFameEvent(
              "SHUTOUT" as FameEventType,
              pitcherId,
              pitcherName,
              gameState.inning,
              gameState.isTop ? "TOP" : "BOTTOM",
              1.0,
            );
            console.log(
              `[MAJ-09] Complete Game Shutout detected for ${pitcherId}`,
            );
          } else {
            fameTrackingHook.recordFameEvent(
              "COMPLETE_GAME" as FameEventType,
              pitcherId,
              pitcherName,
              gameState.inning,
              gameState.isTop ? "TOP" : "BOTTOM",
              1.0,
            );
            console.log(`[MAJ-09] Complete Game detected for ${pitcherId}`);
          }
        }
      } catch (detectionError) {
        console.warn(
          "[MAJ-09] End-of-game detection error (non-blocking):",
          detectionError,
        );
      }

      // MAJ-02: Update fan morale at game end (franchise/playoff only — no morale in exhibition)
      if (gameMode !== "exhibition") {
        try {
          const homeWon = gameState.homeScore > gameState.awayScore;
          const homeRunDiff = gameState.homeScore - gameState.awayScore;
          const isBlowout = Math.abs(homeRunDiff) >= 7;
          const isRivalMatchup = areRivals(leagueId, homeTeamId, awayTeamId);

          // Check for special game results from pitcher stats
          let isNoHitter = false;
          let isShutout = false;
          for (const [, pStats] of pitcherStats.entries()) {
            if (pStats.isStarter && pStats.outsRecorded >= 27) {
              if (pStats.hitsAllowed === 0 && pStats.runsAllowed === 0)
                isNoHitter = true;
              if (pStats.runsAllowed === 0) isShutout = true;
            }
          }

          // MAJ-14: Walk-off = home team wins in the bottom half (scored go-ahead run in their last at-bat)
          const isWalkOff = homeWon && !gameState.isTop;

          // Home team perspective
          const homeResult: FanMoraleGameResult = {
            gameId: gameId || "demo-game",
            won: homeWon,
            isWalkOff, // MAJ-14: Use real walk-off detection
            isNoHitter: isNoHitter && homeWon, // Only counts for the winning side
            isShutout: isShutout && homeWon,
            isBlowout,
            vsRival: isRivalMatchup,
            runDifferential: homeRunDiff,
            playerPerformances: [],
          };
          const fanMoraleGameContext = {
            season: effectiveSeasonNumber,
            game: navigationState?.gameNumber ?? navigationState?.playoffGameNumber ?? 1,
          };

          homeFanMorale.processGameResult(
            homeResult,
            fanMoraleGameContext,
            isRivalMatchup ? awayTeamName : undefined,
          );

          // Away team perspective (opposite won/runDiff, mirrored no-hitter/shutout)
          const awayResult: FanMoraleGameResult = {
            gameId: gameId || "demo-game",
            won: !homeWon,
            isWalkOff, // MAJ-14: Same walk-off flag (away team experienced it too)
            isNoHitter: isNoHitter && !homeWon,
            isShutout: isShutout && !homeWon,
            isBlowout,
            vsRival: isRivalMatchup,
            runDifferential: -homeRunDiff,
            playerPerformances: [],
          };
          awayFanMorale.processGameResult(
            awayResult,
            fanMoraleGameContext,
            isRivalMatchup ? homeTeamName : undefined,
          );

          console.log(
            `[MAJ-02] Fan morale updated (both teams) — homeWon: ${homeWon}, diff: ${homeRunDiff}, shutout: ${isShutout}`,
          );
        } catch (moraleError) {
          console.warn(
            "[MAJ-02] Fan morale update error (non-blocking):",
            moraleError,
          );
        }
      }

      // MAJ-04: Generate game recap narratives (dual perspective)
      let gameNarrative = null;
      let awayNarrative = null;
      try {
        const homeWonForNarrative = gameState.homeScore > gameState.awayScore;
        // Home team perspective
        gameNarrative = generateGameRecap({
          teamName: homeTeamName,
          opponentName: awayTeamName,
          teamScore: gameState.homeScore,
          opponentScore: gameState.awayScore,
          isShutout: gameState.awayScore === 0 && homeWonForNarrative,
        });
        // Away team perspective
        awayNarrative = generateGameRecap({
          teamName: awayTeamName,
          opponentName: homeTeamName,
          teamScore: gameState.awayScore,
          opponentScore: gameState.homeScore,
          isShutout: gameState.homeScore === 0 && !homeWonForNarrative,
        });
        console.log(
          `[MAJ-04] Dual narratives: Home "${gameNarrative.headline}", Away "${awayNarrative.headline}"`,
        );
      } catch (narrativeError) {
        console.warn(
          "[MAJ-04] Narrative generation error (non-blocking):",
          narrativeError,
        );
      }

      const computedSeasonId =
        effectiveCompetitionType === "elimination"
          ? undefined
          : effectiveSeasonId;
      const computedStatsScopeId =
        effectiveStatsScopeId ??
        computedSeasonId ??
        `season-${effectiveSeasonNumber}`;
      pushActivityLog(
        `[Game End] ${homeTeamName} ${gameState.homeScore} - ${awayTeamName} ${gameState.awayScore} (Inning ${gameState.inning})`,
      );
      const endGameOptions = {
        activityLog,
        seasonId: computedSeasonId,
        statsScopeId: computedStatsScopeId,
        competitionType: effectiveCompetitionType,
        competitionId: effectiveCompetitionId,
        leagueId: effectiveLeagueId,
        franchiseId: effectiveFranchiseId,
        scheduleGameId: effectiveScheduleGameId,
        currentSeason: effectiveSeasonNumber,
        stadiumName: resolvedStadiumName,
        awaitPitchCountConfirmation: true,
        awayManagerId,
        homeManagerId,
        managerByTeamId: {
          [awayTeamId]: awayManagerId,
          [homeTeamId]: homeManagerId,
        },
      };
      console.debug(
        "[END-GAME] Step 2: Calling hookEndGame and awaiting pitch-count resolution",
      );
      // R3-R7: Await hookEndGame (shows pitch count modal, runs aggregation).
      // Add a 30s safety timeout — game archive already saved above, so if
      // hookEndGame hangs (IndexedDB issue, processCompletedGame timeout),
      // navigation to PostGameSummary proceeds anyway.
      console.debug("[END-GAME] Step 2b: awaiting hookEndGame with 30s safety...");
      try {
        await Promise.race([
          hookEndGame(endGameOptions),
          new Promise<void>((resolve) => setTimeout(() => {
            console.error("[END-GAME] hookEndGame safety timeout — forcing navigation");
            resolve();
          }, 30000)),
        ]);
        console.debug("[END-GAME] Step 3: hookEndGame completed");
      } catch (hookErr) {
        console.error("[END-GAME] hookEndGame failed:", hookErr);
      }
      setIsProcessingEndGame(true);

      // Save mojo/fitness snapshots for elimination inter-game persistence
      if (effectiveGameMode === "elimination" && effectiveEliminationId) {
        try {
          const { saveMojoFitnessSnapshots } =
            await import("../../../utils/mojoFitnessStorage");
          const allPlayers = playerStateHook.getAllPlayers();
          await saveMojoFitnessSnapshots(
            effectiveEliminationId,
            allPlayers.map((p) => ({
              playerId: p.playerId,
              mojoLevel: p.gameState.currentMojo,
              fitnessState: p.fitnessProfile.currentFitness,
            })),
          );
          console.log(
            `[Elimination] Saved mojo/fitness snapshots for ${allPlayers.length} players`,
          );
        } catch (err) {
          console.error(
            "[Elimination] Failed to save mojo/fitness snapshots:",
            err,
          );
        }
      }

      // T0-05 FIX: Mark the schedule game as COMPLETED (franchise mode only)
      const completedGameId = gameState.gameId || gameId;
      if (
        effectiveScheduleGameId &&
        (effectiveGameMode === "franchise" || effectiveGameMode === "playoff")
      ) {
        try {
          const winnerId =
            gameState.homeScore > gameState.awayScore ? homeTeamId : awayTeamId;
          const loserId =
            gameState.homeScore > gameState.awayScore ? awayTeamId : homeTeamId;
          await completeScheduleGame(effectiveScheduleGameId, {
            homeScore: gameState.homeScore,
            awayScore: gameState.awayScore,
            winningTeamId: winnerId,
            losingTeamId: loserId,
            gameLogId: completedGameId,
          });
          console.log(
            `[T0-05] Schedule game ${effectiveScheduleGameId} marked COMPLETED — winner: ${winnerId}`,
          );
        } catch (schedErr) {
          console.error("[T0-05] Schedule completion failed:", schedErr);
        }
      }

      undoSystem.clearHistory();
      console.debug("[END-GAME] Step 4: Post-hook cleanup completed");

      // Fire post-game columns BEFORE navigation. The POST_FINAL_OUT useEffect
      // below is a backup, but (a) gamePhase is only set to POST_FINAL_OUT in
      // the auto-end flow, not in user-triggered endGame, and (b) navigate()
      // unmounts GameTracker before React may have flushed the phase change.
      // Firing directly here guarantees the call lands for every end-game path.
      // Dedup via firedPostGameForGameIdRef in the hook prevents double-fire
      // if the phase-watching effect also happens to run.
      if (gameState.postGameColumnsEnabled && completedGameId) {
        const reporterGameMode: import("../../../types/reporter").ReporterGameMode =
          effectiveCompetitionType === "playoff"
            ? "elimination"
            : (effectiveCompetitionType as import("../../../types/reporter").ReporterGameMode);
        const postGameGameId = completedGameId;
        const snapshotHomeScore = gameState.homeScore;
        const snapshotAwayScore = gameState.awayScore;
        void (async () => {
          try {
            const allEvents = (
              await getGameEvents(postGameGameId)
            ).filter((e) => !e.undoneAt);
            await firePostGameColumns({
              targetGameId: postGameGameId,
              allInningEvents: allEvents,
              finalScore: {
                home: snapshotHomeScore,
                away: snapshotAwayScore,
              },
              gameMode: reporterGameMode,
              gameDate: new Date().toISOString().slice(0, 10),
              opponentByReporter: {
                home: awayTeamId,
                away: homeTeamId,
              },
            });
            console.debug(
              "[END-GAME] Post-game columns fire-and-forget dispatched.",
            );
          } catch (err) {
            console.warn(
              "[reporter:post-game] Failed to generate post-game columns.",
              err,
            );
          }
        })();
      }

      // Navigate immediately — don't wait for aggregation to finish
      console.debug("[END-GAME] Step 5: Navigating to PostGameSummary");
      navigate(`/post-game/${completedGameId}`, {
        state: {
          gameMode: effectiveGameMode || "exhibition",
          franchiseId: effectiveFranchiseId,
          eliminationId: effectiveEliminationId,
          seasonId: computedSeasonId,
          statsScopeId: computedStatsScopeId,
          competitionType: effectiveCompetitionType,
          competitionId: effectiveCompetitionId,
          gameNarrative,
          awayNarrative,
        },
      });
      console.debug("[END-GAME] Step 6: Navigation called");
      endGameCompleted = true;
    } catch (err) {
      console.error("[END-GAME] Flow failed:", err);
      console.error("[GameTracker] End game flow failed:", err);
      setIsProcessingEndGame(false);
    } finally {
      // Release the guard lock if end-game did not complete, so user can retry.
      if (!endGameCompleted) {
        gameEndingRef.current = false;
        setIsProcessingEndGame(false);
      }
    }
  }, [
    hookEndGame,
    navigate,
    effectiveCompetitionId,
    effectiveCompetitionType,
    effectiveEliminationId,
    effectiveFranchiseId,
    effectiveGameMode,
    effectiveLeagueId,
    effectiveScheduleGameId,
    effectiveSeasonId,
    effectiveSeasonNumber,
    effectiveStatsScopeId,
    gameId,
    gameState,
    pitcherStats,
    fameTrackingHook,
    recordDetectedFameEvents,
    homeFanMorale,
    awayFanMorale,
    homeTeamName,
    awayTeamName,
    awayManagerId,
    homeManagerId,
    homeTeamId,
    activityLog,
    pushActivityLog,
    playerStateHook,
    selectedStadium,
    playAudio,
    awayTeamId,
    firePostGameColumns,
  ]);

  // T0-01: Auto-trigger endGame when regulation ends
  useEffect(() => {
    if (showAutoEndPrompt) {
      console.log(
        "[T0-01] Auto game-end detected — showing end-game confirmation",
      );
      dismissAutoEndPrompt();
      setShowEndGameConfirmation(true);
    }
  }, [showAutoEndPrompt, dismissAutoEndPrompt]);

  const rightPanelOwnsInteraction =
    // REMOVED per UX-022: pendingRunnerCorrection no longer exists
    pendingRunnerAttribution !== null ||
    (selectedPlayLogEntry !== null &&
      selectedPlayLogEntry.eventType !== "at_bat");
  const prefersTouchPanels =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;
  // touchReviewEntries removed — play log tap handles review.

  if (missingLaunchStateMessage) {
    return (
      <div className="min-h-screen bg-[#CBB89C] flex items-center justify-center p-6" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
        <div
          role="alert"
          className="max-w-xl bg-[#1a3020] border-4 border-[#C4A853] px-6 py-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)]"
        >
          <div className="text-[#C4A853] text-sm font-bold tracking-[0.18em] mb-3">
            {MISSING_GAME_TRACKER_LAUNCH_STATE_TITLE}
          </div>
          <p className="text-[#E8E8D8] text-sm leading-6 mb-5">
            {missingLaunchStateMessage}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-[#3d4a42] border-2 border-[#C4A853] text-[#E8E8D8] px-4 py-2 text-xs font-bold tracking-[0.16em] hover:bg-[#4a5a50] active:scale-95 transition-transform"
          >
            BACK TO SETUP
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !gameInitialized) {
    return (
      <div className="min-h-screen bg-[#CBB89C] flex items-center justify-center" style={{ fontFamily: "'Moms Typewriter', monospace" }}>
        <div className="bg-[#1a3020] border-4 border-[#C4A853] px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)]">
          <div className="text-[#E8E8D8] text-sm font-bold tracking-wide">
            Loading game...
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Fame Event Popup - Shows when fame events are detected */}
      {fameTrackingHook.showEventPopup && fameTrackingHook.lastEvent && (
        <div
          className="fixed top-20 right-4 z-50 animate-bounce"
          onClick={() => fameTrackingHook.dismissEventPopup()}
        >
          <div
            className="px-4 py-3 border-4 border-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] cursor-pointer"
            style={{
              backgroundColor: getFameColor(
                fameTrackingHook.lastEvent.finalFame,
              ),
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{fameTrackingHook.lastEvent.icon}</span>
              <div>
                <div className="text-white font-bold text-sm">
                  {fameTrackingHook.lastEvent.label}
                </div>
                <div className="text-white/80 text-xs">
                  {formatFameValue(fameTrackingHook.lastEvent.finalFame)} Fame
                  {fameTrackingHook.lastEvent.liMultiplier > 1.0 && (
                    <span className="ml-1">
                      (
                      {getLITier(fameTrackingHook.lastEvent.liMultiplier).label}
                      )
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player State Notifications - Shows Mojo/Fitness changes */}
      {playerStateHook.notifications.length > 0 && (
        <div className="fixed top-20 left-4 z-50 space-y-2">
          {playerStateHook.notifications
            .slice(0, 3)
            .map((notification, idx) => (
              <div
                key={idx}
                className={`px-3 py-2 bg-[#333] border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] cursor-pointer ${
                  notification.severity === "critical"
                    ? "border-red-500"
                    : notification.severity === "warning"
                      ? "border-yellow-500"
                      : "border-[#C4A853]"
                }`}
                onClick={() => playerStateHook.dismissNotification(idx)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{notification.icon}</span>
                  <div className="text-[#E8E8D8] text-xs">
                    {notification.message}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
           §2 THREE-ROW PINNED LAYOUT (Step 1.A)
           ┌─────────────────────────────────────────────────────────────┐
           │ Row 1: ScoreBug (pinned top) — FullFenwayScoreboard for now│
           ├──────────┬──────────┬──────────┬────────────────────────────┤
           │NewsBoard │ Batting  │ Defense  │ Play Log (2/5 width)      │
           │  1/5     │ Lineup   │ Lineup   │                            │
           │          │  1/5     │  1/5     │                            │
           ├──────────┴──────────┴──────────┴────────────────────────────┤
           │ Row 3: QuickBar (pinned bottom, full width)                 │
           └─────────────────────────────────────────────────────────────┘
           ═══════════════════════════════════════════════════════════════ */}
      <div className="game-tracker-font-bump flex flex-col overflow-hidden bg-[#CBB89C] text-white" style={{ height: '100dvh', fontFamily: "'Moms Typewriter', monospace" }}>
        <style>{`
          .game-tracker-font-bump .text-\\[6px\\]:not(.game-tracker-font-no-bump *) { font-size: 12px !important; }
          .game-tracker-font-bump .text-\\[7px\\]:not(.game-tracker-font-no-bump *) { font-size: 13px !important; }
          .game-tracker-font-bump .text-\\[8px\\]:not(.game-tracker-font-no-bump *) { font-size: 14px !important; }
          .game-tracker-font-bump .text-\\[9px\\]:not(.game-tracker-font-no-bump *) { font-size: 15px !important; }
          .game-tracker-font-bump .text-\\[10px\\]:not(.game-tracker-font-no-bump *) { font-size: 16px !important; }
          .game-tracker-font-bump .text-\\[11px\\]:not(.game-tracker-font-no-bump *) { font-size: 17px !important; }
          .game-tracker-font-bump .text-\\[12px\\]:not(.game-tracker-font-no-bump *) { font-size: 18px !important; }
          .game-tracker-font-bump .text-\\[14px\\]:not(.game-tracker-font-no-bump *) { font-size: 20px !important; }
          .game-tracker-font-bump .text-\\[16px\\]:not(.game-tracker-font-no-bump *) { font-size: 22px !important; }
          .game-tracker-font-bump .text-\\[18px\\]:not(.game-tracker-font-no-bump *) { font-size: 24px !important; }
          .game-tracker-font-bump .text-\\[22px\\]:not(.game-tracker-font-no-bump *) { font-size: 28px !important; }
          .game-tracker-font-bump .text-xs:not(.game-tracker-font-no-bump *) { font-size: calc(0.75rem + 6px) !important; }
          .game-tracker-font-bump .text-sm:not(.game-tracker-font-no-bump *) { font-size: calc(0.875rem + 6px) !important; }
          .game-tracker-font-bump .text-base:not(.game-tracker-font-no-bump *) { font-size: calc(1rem + 6px) !important; }
          .game-tracker-font-bump .text-lg:not(.game-tracker-font-no-bump *) { font-size: calc(1.125rem + 6px) !important; }
          .game-tracker-font-bump .text-xl:not(.game-tracker-font-no-bump *) { font-size: calc(1.25rem + 6px) !important; }
          .game-tracker-font-bump .text-2xl:not(.game-tracker-font-no-bump *) { font-size: calc(1.5rem + 6px) !important; }
        `}</style>
        {/* ROW 1: §3.1 ScoreBug (pinned top, single line) */}
        <div className="game-tracker-font-no-bump relative z-40">
          <ScoreBug
            awayTeamName={scorebugTeamLabels.away}
            awayScore={scoreboard.away.runs}
            homeTeamName={scorebugTeamLabels.home}
            homeScore={scoreboard.home.runs}
            homeTeamSecondaryColor={homeTeamBorderColor}
            stadiumName={resolvedStadiumName}
            inning={gameState.inning}
            isTop={gameState.isTop}
            outs={gameState.outs}
            bases={gameState.bases}
            isSaving={isSaving ? undefined : false}
            gameSoundsOn={gameSoundsOn}
            beatReporterSoundsOn={beatReporterSoundsOn}
            onTap={() => setIsScoreboardExpanded((prev) => !prev)}
            onToggleGameSounds={() => setGameSoundsOn((value) => !value)}
            onToggleBeatReporter={() =>
              setBeatReporterSoundsOn((value) => !value)
            }
          />
          {deferredPitchCounts.length > 0 && (
            <div className="absolute right-3 top-full mt-2 flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowDeferredPitchCountList((prev) => !prev)
                }
                className="border-[3px] border-[#8B5A18] bg-[#F0C36B] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2B1B08] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-px hover:bg-[#F6CD79]"
              >
                ! {deferredPitchCounts.length} pending pitch count
                {deferredPitchCounts.length === 1 ? "" : "s"}
              </button>
              {showDeferredPitchCountList && (
                <div className="w-[280px] border-[4px] border-[#8B5A18] bg-[#3B2A17] p-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.45)]">
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#F0C36B]">
                    Deferred Pitch Counts
                  </div>
                  <div className="space-y-2">
                    {deferredPitchCounts.map((entry) => (
                      <button
                        key={`${entry.pitcherId}-${entry.timestamp}`}
                        type="button"
                        onClick={() => {
                          setShowDeferredPitchCountList(false);
                          openDeferredPitchCount(entry.pitcherId);
                        }}
                        className="w-full border-[3px] border-[#A56A1C] bg-[#5C3C16] px-3 py-2 text-left text-[#FFF3D8] transition-colors hover:bg-[#72491B]"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-[0.08em]">
                          {entry.pitcherName}
                        </div>
                        <div className="mt-1 text-[9px] text-[#FFD58A]">
                          {entry.halfInning === "TOP" ? "Top" : "Bottom"}{" "}
                          {entry.inning}, last known {entry.lastKnownCount}{" "}
                          pitches
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {showManualEndHalfInningButton && (
          <div className="shrink-0 bg-[#CBB89C] px-3 pb-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={forceEndHalfInning}
                className="border-[4px] border-[#8B5A18] bg-[#F0C36B] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2B1B08] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-px hover:bg-[#F6CD79]"
              >
                End Half-Inning →
              </button>
            </div>
          </div>
        )}

        {/* ROW 2: 4-Column Content Area (§2.3 — 1fr 1fr 1fr 2fr) + §2.4 Expanded Scoreboard overlay */}
        {/* Overflow propagation chain:
            9925 game-tracker-font-bump flex flex-col overflow-hidden (100dvh root)
            10032 min-h-0 flex-1 flex flex-col overflow-hidden relative (bounded content row)
            10099 min-h-0 flex-1 grid container
            10115 grid cell wrapper min-h-0 overflow-hidden
            NewsBoard.tsx root h-full min-h-0 overflow-hidden
            Broken link was the old h-full grid container inside a plain block parent; it now receives height via flex-1. */}
        <div className="min-h-0 flex flex-1 flex-col overflow-hidden relative bg-[#CBB89C]">
          {/* §2.4 Expanded Scoreboard overlay — drops down from ScoreBug, covers top ~25% of columns */}
          {isScoreboardExpanded && (
            <>
              {/* Transparent backdrop — tap to collapse */}
              <div
                className="absolute inset-0 z-20"
                onClick={() => setIsScoreboardExpanded(false)}
              />
              {/* Retro Fenway scoreboard overlay */}
              <div className="absolute top-0 left-0 right-0 z-30 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                <FullFenwayScoreboard
                  awayTeamName={awayTeamName.toUpperCase()}
                  homeTeamName={homeTeamName.toUpperCase()}
                  awayRecord={awayRecord}
                  homeRecord={homeRecord}
                  innings={scoreboard.innings}
                  awayRuns={scoreboard.away.runs}
                  homeRuns={scoreboard.home.runs}
                  awayHits={scoreboard.away.hits}
                  homeHits={scoreboard.home.hits}
                  awayErrors={scoreboard.away.errors}
                  homeErrors={scoreboard.home.errors}
                  inning={gameState.inning}
                  isTop={gameState.isTop}
                  outs={gameState.outs}
                  stadiumName={resolvedStadiumName}
                  currentBatterName={currentBatterDisplayName}
                  gameDate={gameStartTime}
                  elapsedMinutes={elapsedMinutes}
                />
              </div>
            </>
          )}
          {/* §9.3: Swap Order mode banner */}
          {swapOrderMode && (
            <div className="absolute top-0 left-0 right-0 z-10 bg-[#C4A853] text-[#1a1a1a] text-[10px] font-bold text-center py-1.5 tracking-wider flex items-center justify-center gap-2">
              <span>
                TAP ANOTHER PLAYER TO SWAP BATTING ORDER WITH{" "}
                {swapOrderMode.playerName.toUpperCase()}
              </span>
              <button
                onClick={() => setSwapOrderMode(null)}
                className="text-[9px] bg-[#1a1a1a] text-[#C4A853] px-2 py-0.5 rounded border border-[#1a1a1a] hover:bg-[#333] active:scale-95"
              >
                CANCEL
              </button>
            </div>
          )}
          {/* §9.2: Swap Position banner */}
          {swapPositionMode && (
            <div className="absolute top-0 left-0 right-0 z-10 bg-[#5dade2] text-[#1a1a1a] text-[10px] font-bold text-center py-1.5 tracking-wider flex items-center justify-center gap-2">
              <span>
                TAP ANOTHER PLAYER TO SWAP FIELDING POSITION WITH{" "}
                {swapPositionMode.playerName.toUpperCase()}
              </span>
              <button
                onClick={() => setSwapPositionMode(null)}
                className="text-[9px] bg-[#1a1a1a] text-[#5dade2] px-2 py-0.5 rounded border border-[#1a1a1a] hover:bg-[#333] active:scale-95"
              >
                CANCEL
              </button>
            </div>
          )}
          <div
            className="min-h-0 flex-1 bg-[#CBB89C]"
            style={{
              display: "grid",
              gridTemplateColumns:
                enrichingEntry !== null ||
                enrichingRunnerSubEntry !== null ||
                (selectedPlayLogEntry !== null &&
                  selectedPlayLogEntry.eventType !== "at_bat")
                  ? "0.8fr 1fr 1fr 2.7fr"
                  : "0.8fr 1fr 1fr 2.2fr",
              gridTemplateRows: "minmax(0, 1fr)",
              gap: "0px",
            }}
          >
            {/* Column 1: NewsBoard (§6 — beat reporter and manager feed) */}
            <div className="h-full min-h-0 overflow-hidden">
              <NewsBoard
                currentBatterName={currentBatterDisplayName}
                currentBatterLine={batterGameLine}
                currentPitcherName={currentPitcherDisplayName}
                currentPitcherLine={pitcherGameLine}
                matchupSummary={matchupLine}
                commentaryEntries={newsBoardEntries}
                reporters={reportersForFeed}
                reporterTeamColors={reporterTeamColorsForFeed}
                soundsOn={beatReporterSoundsOn}
                onPlayTypeSound={() => {
                  void audioManagerRef.current.playSound("beatReporterType");
                }}
                onManagerDecisionEdit={handleManagerDecisionEdit}
                onManagerRecommendationAction={handleManagerRecommendationAction}
              />
            </div>

            {/* Column 2: Batting Lineup (§5.2 — always the team at bat) */}
            {/* Build live mojo/fitness data map from playerStateHook */}
            {(() => {
              const playerStatesMap: Record<string, { mojo: MojoLevel; fitness: FitnessState }> = {};
              for (const p of playerStateHook.getAllPlayers()) {
                playerStatesMap[p.playerId] = {
                  mojo: p.gameState.currentMojo,
                  fitness: p.fitnessProfile.currentFitness,
                };
              }
              return (
                <>
                  <div className="h-full min-h-0 overflow-hidden">
                    <BattingLineupColumn
                      players={battingColumnPlayers}
                      currentBatterIndex={currentBatterPosition}
                      runners={battingLineupRunners}
                      nextLeadoffIndex={battingNextLeadoff}
                      teamName={gameState.isTop ? awayTeamName : homeTeamName}
                      teamPrimaryColor={battingTeamColors.primary}
                      teamSecondaryColor={battingTeamColors.secondary}
                      playerStates={playerStatesMap}
                      onPlayerTap={handleLineupPlayerTap}
                      onMojoAdjust={handleLineupMojoAdjust}
                    />
                  </div>

                  {/* Column 3: Defensive Lineup (§5.3 — always the team in field) */}
                  <div className="h-full min-h-0 overflow-hidden">
                    <DefensiveLineupColumn
                      players={defensiveColumnPlayers}
                      currentPitcherName={resolvedCurrentPitcherName}
                      nextLeadoffIndex={defensiveNextLeadoff}
                      teamName={gameState.isTop ? homeTeamName : awayTeamName}
                      teamPrimaryColor={fieldingTeamColors.primary}
                      teamSecondaryColor={fieldingTeamColors.secondary}
                      playerStates={playerStatesMap}
                      onPlayerTap={handleLineupPlayerTap}
                      onMojoAdjust={handleLineupMojoAdjust}
                      enrichmentMode={defensiveEnrichmentMode}
                    />
                  </div>
                </>
              );
            })()}

            {/* Column 4: Play Log + Enrichment Panel (§2.3 — 2/5 width) */}
            <div className="relative z-20 isolate pointer-events-auto flex h-full min-h-0 flex-col overflow-hidden">
              {/* Between-inning enrichment prompt (Ticket 5.7) */}
              {showEnrichmentPrompt && !pendingRunnerAttribution && (
                <div className="bg-[#C4A853]/20 border-b border-[#C4A853] px-2 py-1 flex items-center gap-1 flex-shrink-0">
                  <span className="text-[8px] text-[#C4A853] flex-1">
                    {unenrichedCount} play{unenrichedCount !== 1 ? "s" : ""}{" "}
                    unenriched
                  </span>
                  <button
                    onClick={handleEnrichmentPromptYes}
                    className="text-[7px] text-[#34d399] bg-[#064e3b]/60 px-1.5 py-0.5 rounded hover:bg-[#064e3b]"
                  >
                    Enrich
                  </button>
                  <button
                    onClick={handleEnrichmentPromptSkip}
                    className="text-[7px] text-[#6b7280] bg-[#1f2937]/60 px-1.5 py-0.5 rounded hover:bg-[#1f2937]"
                  >
                    Skip
                  </button>
                </div>
              )}

              {/* REMOVED per UX-022: Pre-commit runner correction panel eliminated.
             Runner corrections are now post-commit via play log or lineup column tap. */}
              {pendingRunnerAttribution !== null ? (
                <LiveRunnerAttributionPanel
                  title={pendingRunnerAttribution.title}
                  summary={pendingRunnerAttribution.summary}
                  pitcherName={pendingRunnerAttribution.pitcherName}
                  catcherName={pendingRunnerAttribution.catcherName}
                  fielderId={pendingRunnerAttribution.fielderId || ""}
                  fielderOptions={liveRunnerFielderOptions}
                  showErrorType={pendingRunnerAttribution.eventType === "ADVANCE_E"}
                  errorType={pendingRunnerAttribution.errorType || "fielding"}
                  saving={pendingRunnerAttributionSaving}
                  onFielderChange={handlePendingRunnerFielderChange}
                  onErrorTypeChange={handlePendingRunnerErrorTypeChange}
                  onCancel={handlePendingRunnerAttributionCancel}
                  onCommit={() => void handlePendingRunnerAttributionCommit()}
                />
              ) : selectedPlayLogEntry !== null &&
                selectedPlayLogEntry.eventType !== "at_bat" ? (
                <HistoricalEventEditor
                  entry={selectedPlayLogEntry}
                  event={selectedBetweenPlayEvent}
                  loading={selectedBetweenPlayEventLoading}
                  saving={selectedBetweenPlayEventSaving}
                  isWithinUndoDepth={
                    undoSystem.undoBoundaryTimestamp !== null &&
                    selectedPlayLogEntry.timestamp >=
                      undoSystem.undoBoundaryTimestamp
                  }
                  onReturnToLive={handleReturnToLiveAtBat}
                  onRunnerCaughtByChange={handleRunnerCaughtByChange}
                  onRunnerEventTypeChange={handleRunnerEventTypeChange}
                  onRunnerPitcherChange={handleRunnerPitcherAttributionChange}
                  onRunnerCatcherChange={handleRunnerCatcherAttributionChange}
                  onRunnerFielderChange={handleRunnerFielderAttributionChange}
                  onLineupPositionChange={handleHistoricalPositionChange}
                  onSubstitutionPlayerChange={
                    handleHistoricalSubstitutionPlayerChange
                  }
                  onSubstitutionPositionChange={
                    handleHistoricalSubstitutionPositionChange
                  }
                  onPitcherChange={handleHistoricalPitcherChange}
                  onContextValueChange={handleHistoricalContextValueChange}
                  onContextReasonChange={handleHistoricalContextReasonChange}
                  onInjuryStayedInChange={handleHistoricalInjuryStayedInChange}
                  onManagerMomentChange={handleHistoricalManagerMomentChange}
                  onPitchCountValueChange={
                    handleHistoricalPitchCountValueChange
                  }
                  lineupOptions={historicalLineupOptions}
                  pitcherOptions={historicalPitcherOptions}
                  catcherOptions={historicalCatcherOptions}
                  fielderOptions={historicalFielderOptions}
                  contextValueOptions={historicalContextValueOptions}
                />
              ) : enrichingEntry !== null ? (
                /* Enrichment panel replaces play log when active */
                <EnrichmentPanel
                  entry={enrichingEntry}
                  currentEnrichment={
                    enrichingEntry.eventId
                      ? enrichmentCache[enrichingEntry.eventId]
                      : undefined
                  }
                  onUpdate={handleEnrichmentUpdate}
                  onModifierRecord={(modifier) =>
                    void handleAtBatModifierRecord(modifier)
                  }
                  onClose={handleEnrichmentClose}
                  closeLabel="Return to live"
                />
              ) : enrichingRunnerSubEntry !== null ? (
                /* Runner enrichment panel replaces play log when active (UX-050) */
                <RunnerEnrichmentPanel
                  subEntry={enrichingRunnerSubEntry}
                  outfielderByPosition={runnerHoldOutfielderOptions}
                  onUpdate={handleRunnerEnrichmentUpdate}
                  onClose={handleEnrichmentClose}
                />
              ) : (
                <PlayLogPanel
                  entries={playLogEntries}
                  onEntryTap={handleEntryTap}
                  onRunnerSubEntryTap={handleRunnerSubEntryTap}
                  enrichingEntryId={selectedPlayLogEntry?.id || null}
                  enrichingRunnerSubEntryId={null}
                />
              )}
            </div>
          </div>
          {/* Close inner 4-column grid */}
        </div>
        {/* Close Row 2 relative container */}

        {/* ROW 3: Quick Bar + Action Buttons (pinned bottom, full width) */}
        <div className="game-tracker-font-no-bump flex-shrink-0 flex items-stretch relative">
          <div className="flex-1 relative">
            <QuickBar
              disabled={
                !gameInitialized ||
                !!pendingRunnerAttribution ||
                !!selectedPlayLogEntry
              }
              onOutcome={handleQuickBarOutcome}
              gameSituation={{ outs: gameState.outs, bases: gameState.bases }}
              gamePhase={gameState.gamePhase}
              onStartGame={handleStartGame}
              onEndGame={() => setShowEndGameConfirmation(true)}
              processingOutcome={processingOutcome}
              undoCount={displayedUndoCount}
              canUndo={undoSystem.canUndo || hasPlaysToUndo}
              onUndo={handleUndoPress}
            />
            {pendingRunnerAttribution ? (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#2f3b21] border border-[#5a6b38] px-2 py-1 text-[8px] text-[#C4A853]">
                Completing live runner attribution. Commit or cancel the runner
                event before scoring the next pitch.
              </div>
            ) : selectedPlayLogEntry ? (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#2f3b21] border border-[#5a6b38] px-2 py-1 text-[8px] text-[#C4A853]">
                Editing historical play. Return to live at-bat to score the next
                pitch.
              </div>
            ) : null}
          </div>
          {/* REMOVED per UX-022/Cleanup: LINEUP, +FLD, +MOD, REVIEW buttons removed.
             LINEUP replaced by inline lineup columns (Step 1.C).
             +FLD/+MOD replaced by play log tap enrichment (Tier 2 Group 2.D). */}
        </div>

        {/* ══════════════════════════════════════════════════════════════
             BELOW: Modals and overlays render inside the grid container
             but are position:fixed so they float above. Also the disabled
             reference code block from the old layout.
           ══════════════════════════════════════════════════════════════ */}

        {/* REMOVED per UX-022: Touch panel runner correction modal eliminated. */}

        {/* Touch play review panel removed — play log tap handles review. */}

        {/* §5.3: Player Card Modal — real stats, sub out, swap position, mojo/fitness */}
        {selectedPlayer &&
          (() => {
            // Find the full Player object for attributes
            const allPlayers = [...awayTeamPlayers, ...homeTeamPlayers];
            const pd = allPlayers.find((p) => p.name === selectedPlayer.name);
            const selectedPlayerState = resolveSelectedPlayerCardState(
              selectedPlayer.playerId,
              resolveRosterPlayerState(selectedPlayer.playerId),
            );
            const resolvedSelectedPlayerId =
              selectedPlayerState.playerId || selectedPlayer.playerId;
            const resolvedSelectedTeam =
              resolveRosterTeamSide(
                resolvedSelectedPlayerId,
                selectedPlayer.name,
              ) ||
              resolveRosterTeamSide(
                selectedPlayer.playerId,
                selectedPlayer.name,
              ) ||
              "home";
            const lineupSnapshot = getLineupStateSnapshot();
            const selectedPlayerTeam =
              (selectedPlayer.type === "pitcher"
                ? resolvePitchingTeamSide(
                    selectedPlayer.playerId,
                    selectedPlayer.name,
                  )
                : resolveRosterTeamSide(
                    selectedPlayer.playerId,
                    selectedPlayer.name,
                  )) || "home";
            const rosterLookup = [
              ...(selectedPlayerTeam === "away"
                ? awayTeamPlayers
                : homeTeamPlayers),
              ...(selectedPlayerTeam === "away"
                ? awayTeamPitchers
                : homeTeamPitchers),
            ];
            console.log("[R3-R7] Bench for", selectedPlayerTeam, ":",
              lineupSnapshot[selectedPlayerTeam].bench.map(b => ({
                name: b.playerName, pos: b.positions, avail: b.isAvailable,
              })));
            const isSelectedActivePitcher =
              selectedPlayer.type === "pitcher" &&
              (
                selectedPlayer.playerId === gameState.currentPitcherId ||
                selectedPlayer.name === gameState.currentPitcherName ||
                selectedPlayer.name === resolvedCurrentPitcherName
              );
            const playerCardBenchEntries = lineupSnapshot[
              selectedPlayerTeam
            ].bench
              .map((benchPlayer) => {
                const rosterPlayer = rosterLookup.find(
                  (candidate) =>
                    getRosterEntityId(candidate, selectedPlayerTeam) ===
                      benchPlayer.playerId ||
                    candidate.name === benchPlayer.playerName,
                );
                const hand =
                  rosterPlayer && "throwingHand" in rosterPlayer
                    ? rosterPlayer.throwingHand
                    : rosterPlayer?.battingHand || "R";
                const rosterPosition =
                  rosterPlayer && "position" in rosterPlayer
                    ? rosterPlayer.position
                    : undefined;
                return {
                  name: benchPlayer.playerName,
                  pos: benchPlayer.positions[0] || rosterPosition || "UT",
                  hand,
                  isOutOfGame: !benchPlayer.isAvailable,
                };
              })
              .filter(
              (entry, index, entries) =>
                entries.findIndex(
                  (candidate) => candidate.name === entry.name,
                ) === index,
              );
            const playerCardBullpenEntries =
              selectedPlayer.type === "pitcher"
                ? (
                    isSelectedActivePitcher
                      ? availablePitchers.map((pitcher) => ({
                          name: pitcher.name,
                          hand: pitcher.hand,
                        }))
                      : (selectedPlayerTeam === "away"
                          ? awayTeamPitchers
                          : homeTeamPitchers
                        )
                          .filter((pitcher) => !pitcher.isActive && !pitcher.isOutOfGame)
                          .map((pitcher) => ({
                            name: pitcher.name,
                            hand: pitcher.throwingHand || pitcher.throws || "R",
                          }))
                  )
                    .filter(
                      (entry, index, entries) =>
                        entries.findIndex(
                          (candidate) => candidate.name === entry.name,
                        ) === index,
                    )
                : undefined;
            // Find real game stats from the hook's Maps
            const bgs =
              selectedPlayer.type === "batter"
                ? playerStats.get(selectedPlayer.playerId)
                : undefined;
            const pgs =
              selectedPlayer.type === "pitcher"
                ? pitcherStats.get(selectedPlayer.playerId)
                : undefined;
            const latestRunnerOutcome = selectedPlayer.runnerBase
              ? [...playLogEntries]
                  .reverse()
                  .flatMap((entry) =>
                    (entry.runnerSubEntries || []).map((sub) => ({
                      entry,
                      sub,
                    })),
                  )
                  .find(
                    ({ sub }) =>
                      sub.runnerId === selectedPlayer.playerId ||
                      sub.runnerName === selectedPlayer.name,
                  )
              : undefined;

            return (
              <PlayerCardModal
                player={selectedPlayer}
                playerData={pd}
                onClose={() => setSelectedPlayer(null)}
                batterGameStats={bgs}
                pitcherGameStats={pgs}
                currentMojo={selectedPlayerState.currentMojo ?? 0}
                currentFitness={selectedPlayerState.currentFitness ?? "FIT"}
                onMojoChange={(newMojo) => {
                  setPlayerMojoByName(
                    selectedPlayer.name,
                    resolvedSelectedTeam,
                    newMojo,
                  );
                }}
                onFitnessChange={(newFitness) => {
                  handleFitnessChangeWithAutoInjury(
                    resolvedSelectedPlayerId,
                    selectedPlayer.name,
                    newFitness,
                  );
                }}
                onSubOut={handlePlayerCardSubOut}
                benchPlayers={playerCardBenchEntries}
                bullpenPitchers={playerCardBullpenEntries}
                isActivePitcher={isSelectedActivePitcher}
                onSwapPosition={(playerId, playerName) => {
                  console.log("[M1-3-fix] Entering player-card position swap mode", {
                    gamePhase: gameState.gamePhase,
                    playerId,
                    playerName,
                  });
                  setSwapPositionMode({ playerId, playerName });
                }}
                showSwapPosition={
                  gameState.gamePhase === "LIVE" ||
                  gameState.gamePhase === "PRE_GAME"
                }
                showSwapOrder={gameState.gamePhase === "PRE_GAME"}
                onSwapOrder={(playerId, playerName) => {
                  setSwapOrderMode({ playerId, playerName });
                }}
                runnerBase={selectedPlayer.runnerBase}
                onRunnerAction={recordRunnerActionFromPlayerCard}
                onCorrectOutcome={
                  latestRunnerOutcome
                    ? () => {
                        setEnrichingEntry(null);
                        setSelectedPlayLogEntry(null);
                        setSelectedBetweenPlayEvent(null);
                        setEnrichingRunnerParentEntry(
                          latestRunnerOutcome.entry,
                        );
                        setEnrichingRunnerSubEntry(latestRunnerOutcome.sub);
                      }
                    : undefined
                }
                gamePhase={gameState.gamePhase}
              />
            );
          })()}

        {/* REMOVED per Cleanup: Lineup overlay modal eliminated.
           Lineup is now always visible in inline columns (Step 1.C).
           Substitution flow via LineupCard will be reconnected in Group 2.C.
           BROKEN SUBSTITUTION PATHS that referenced this overlay:
           - handleRunnerSubstitute (pinch runner requests) — line ~3946
           - handleLineupCardSubstitution (drag-drop subs in modal) — now only used in disabled reference block
           These will be reconnected via the player-card-first flow in Group 2.C. */}

        {/* Play Location Overlay - REMOVED (now using drag-drop interface) */}

        {showInningEndConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
            onClick={() => declineInningEnd()}
          >
            <div
              className="w-[320px] border-[6px] border-[#4A6844] bg-[#556B55] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 border-[4px] border-[#E8E8D8] bg-[#3d5240] p-2">
                <div className="text-xs font-bold text-[#E8E8D8]">
                  END OF INNING?
                </div>
              </div>

              <div className="space-y-3 text-[9px] text-[#E8E8D8]">
                <p>
                  Three outs are on the board. Confirm before the half-inning
                  transitions.
                </p>
                <p className="text-[#C4A853]">
                  Choose NO to stay in this half-inning and correct runner
                  outcomes from the play log.
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => declineInningEnd()}
                  className="flex-1 border-[5px] border-[#E8E8D8] bg-[#3d5240] py-3 text-sm text-[#E8E8D8] hover:bg-[#4A6844]"
                >
                  NO
                </button>
                <button
                  type="button"
                  onClick={() => confirmInningEnd()}
                  className="flex-1 border-[5px] border-white bg-[#DD0000] py-3 text-sm text-white hover:bg-[#FF0000]"
                >
                  YES
                </button>
              </div>
            </div>
          </div>
        )}

        {scoreCorrectionPrompt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
            onClick={dismissScoreCorrectionPrompt}
          >
            <div
              className="w-[360px] border-[6px] border-[#4A6844] bg-[#556B55] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 border-[4px] border-[#E8E8D8] bg-[#3d5240] p-2">
                <div className="text-xs font-bold text-[#E8E8D8]">
                  SCORE VERIFICATION
                </div>
              </div>

              <div className="space-y-3 text-[9px] text-[#E8E8D8]">
                <p>
                  Current score: {awayTeamName} {scoreCorrectionPrompt.current.away}, {homeTeamName} {scoreCorrectionPrompt.current.home}
                </p>
                <p>
                  Event log after this edit: {awayTeamName} {scoreCorrectionPrompt.reconciled.away}, {homeTeamName} {scoreCorrectionPrompt.reconciled.home}
                </p>
                <p className="text-[#C4A853]">
                  Apply correction will update the scoreboard to match the edited event log.
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={dismissScoreCorrectionPrompt}
                  className="flex-1 border-[5px] border-[#E8E8D8] bg-[#3d5240] py-3 text-sm text-[#E8E8D8] hover:bg-[#4A6844]"
                >
                  KEEP CURRENT
                </button>
                <button
                  type="button"
                  onClick={applyScoreCorrectionPrompt}
                  className="flex-1 border-[5px] border-white bg-[#DD0000] py-3 text-sm text-white hover:bg-[#FF0000]"
                >
                  APPLY CORRECTION
                </button>
              </div>
            </div>
          </div>
        )}

        {/* End Game Confirmation — with post-game enrichment prompt (Ticket 5.8) */}
        {showEndGameConfirmation && !showPostGameEnrichPrompt && (
          <div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            onClick={() => setShowEndGameConfirmation(false)}
          >
            <div
              className="bg-[#556B55] border-[6px] border-[#4A6844] p-4 w-[340px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#3d5240] border-[4px] border-[#E8E8D8] p-2 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[#E8E8D8] font-bold">
                      END GAME CONFIRMATION
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEndGameConfirmation(false)}
                    className="bg-[#5A8352] border-[3px] border-[#E8E8D8] px-2 py-1 text-[#E8E8D8] text-xs hover:bg-[#4A6844]"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Confirmation Message */}
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-4">
                Are you sure you want to end the game? This action cannot be
                undone.
              </div>

              {/* Unenriched count (Ticket 5.8) */}
              {(() => {
                const totalEnrichable = playLogEntries.filter(
                  (e) => e.isEnrichable,
                ).length;
                const unenriched = playLogEntries.filter(
                  (e) =>
                    e.isEnrichable && (!e.hasPitchType || !e.hasLocationData),
                ).length;
                return unenriched > 0 ? (
                  <div className="text-[8px] text-[#C4A853] mb-3">
                    {unenriched} of {totalEnrichable} plays unenriched.
                  </div>
                ) : null;
              })()}

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEndGameConfirmation(false)}
                  className="flex-1 bg-[#3d5240] border-[5px] border-[#E8E8D8] py-4 text-[#E8E8D8] text-sm hover:bg-[#4A6844] active:scale-95 transition-transform"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    // Check for unenriched plays
                    const unenriched = playLogEntries.filter(
                      (e) =>
                        e.isEnrichable &&
                        (!e.hasPitchType || !e.hasLocationData),
                    ).length;
                    if (unenriched > 0) {
                      setPostGameUnenrichedCount(unenriched);
                      setShowPostGameEnrichPrompt(true);
                    } else {
                      handleEndGame();
                    }
                  }}
                  className="flex-1 bg-[#DD0000] border-[5px] border-white py-4 text-white text-sm hover:bg-[#FF0000] active:scale-95 transition-transform"
                >
                  END GAME
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Post-game enrichment prompt (Ticket 5.8) */}
        {showPostGameEnrichPrompt && (
          <div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            onClick={() => {
              setShowPostGameEnrichPrompt(false);
              handleEndGame();
            }}
          >
            <div
              className="bg-[#556B55] border-[6px] border-[#4A6844] p-4 w-[340px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#3d5240] border-[4px] border-[#E8E8D8] p-2 mb-3">
                <div className="text-xs text-[#E8E8D8] font-bold">
                  ENRICHMENT
                </div>
              </div>
              <div className="text-[9px] text-[#E8E8D8] mb-4">
                {postGameUnenrichedCount} play
                {postGameUnenrichedCount !== 1 ? "s" : ""} unenriched. Enrich
                now or continue?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPostGameEnrichPrompt(false);
                    setShowEndGameConfirmation(false);
                    // Open enrichment on first unenriched play
                    const firstUnenriched = playLogEntries.find(
                      (e) =>
                        e.isEnrichable &&
                        (!e.hasPitchType || !e.hasLocationData),
                    );
                    if (firstUnenriched) setEnrichingEntry(firstUnenriched);
                  }}
                  className="flex-1 bg-[#3d5240] border-[5px] border-[#C4A853] py-3 text-[#C4A853] text-sm hover:bg-[#4A6844] active:scale-95 transition-transform"
                >
                  ENRICH
                </button>
                <button
                  onClick={() => {
                    setShowPostGameEnrichPrompt(false);
                    handleEndGame();
                  }}
                  className="flex-1 bg-[#DD0000] border-[5px] border-white py-3 text-white text-sm hover:bg-[#FF0000] active:scale-95 transition-transform"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Undo toast notification */}
        <undoSystem.ToastComponent />

        {pendingManualSpecialPrompt && (
          <InjuryPrompt
            type={pendingManualSpecialPrompt.type}
            pitcherName={resolvedCurrentPitcherName}
            onComplete={handleManualSpecialPromptComplete}
            onCancel={() => setPendingManualSpecialPrompt(null)}
          />
        )}

        {/* Pitch Count Prompt Modal (per PITCH_COUNT_TRACKING_SPEC.md) */}
        {pitchCountPrompt && (
          <PitchCountModal
            prompt={pitchCountPrompt}
            onConfirm={(pitcherId: string, finalCount: number) => {
              const result = confirmPitchCount(pitcherId, finalCount);
              if (result.immaculateInning) {
                fameTrackingHook.recordFameEvent(
                  "IMMACULATE_INNING" as FameEventType,
                  result.immaculateInning.pitcherId,
                  result.immaculateInning.pitcherName,
                  gameState.inning,
                  gameState.isTop ? "TOP" : "BOTTOM",
                  1.0,
                );
              }
            }}
            onDismiss={dismissPitchCountPrompt}
          />
        )}

        {/* D-4: HR Inline Prompt — distance + pitch type (both optional) */}
        {hrPrompt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={handleHrPromptSkip}
          >
            <div
              className="bg-[#1a2a1d] border-[3px] border-[#C4A853] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[280px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-bold text-[#C4A853] tracking-wider mb-3">
                HOME RUN
              </div>
              <div className="mb-3">
                <label className="text-[9px] text-[#88AA88] font-bold tracking-wider block mb-1">
                  DISTANCE (ft)
                </label>
                <input
                  type="number"
                  min={200}
                  max={600}
                  value={hrPrompt.distance}
                  onChange={(e) =>
                    setHrPrompt((p) =>
                      p ? { ...p, distance: e.target.value } : p,
                    )
                  }
                  placeholder="e.g. 420"
                  className="w-full bg-[#0d1a0f] border-2 border-[#3d5240] text-white text-sm px-2 py-1.5 rounded focus:border-[#C4A853] outline-none"
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="text-[9px] text-[#88AA88] font-bold tracking-wider block mb-1">
                  PITCH TYPE
                </label>
                <div className="flex flex-wrap gap-1">
                  {PITCH_TYPES.filter((pt) => pt.abbr !== "UNK").map((pt) => (
                    <button
                      key={pt.abbr}
                      onClick={() =>
                        setHrPrompt((p) =>
                          p
                            ? {
                                ...p,
                                pitchType:
                                  p.pitchType === pt.abbr ? "" : pt.abbr,
                              }
                            : p,
                        )
                      }
                      className={`text-[8px] px-1.5 py-0.5 rounded border transition-colors
                        ${
                          hrPrompt.pitchType === pt.abbr
                            ? "bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]"
                            : "bg-[#333] border-[#555] text-[#888] hover:border-[#777]"
                        }`}
                    >
                      {pt.abbr}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleHrPromptDone}
                  className="flex-1 px-3 py-1.5 bg-[#6c3483] text-white text-[10px] font-bold uppercase rounded border border-[#af7ac5] hover:bg-[#7d3c98] active:scale-95 transition-all"
                >
                  Done
                </button>
                <button
                  onClick={handleHrPromptSkip}
                  className="flex-1 px-3 py-1.5 bg-[#333] text-[#888] text-[10px] font-bold uppercase rounded border border-[#555] hover:bg-[#444] active:scale-95 transition-all"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* D-3: Error Flow Prompt — base → fielder → type */}
        {errorFlow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#1a2a1d] border-[3px] border-[#f4d03f] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[280px]">
              <div className="text-xs font-bold text-[#f4d03f] tracking-wider mb-3">
                ERROR
              </div>

              {errorFlow.step === "base" && (
                <>
                  <div className="text-[10px] text-[#ccc] mb-2">
                    Batter reached which base?
                  </div>
                  <div className="flex gap-2">
                    {(["1B", "2B", "3B"] as const).map((b) => (
                      <button
                        key={b}
                        onClick={() =>
                          setErrorFlow((f) =>
                            f ? { ...f, step: "fielder", baseReached: b } : f,
                          )
                        }
                        className="flex-1 px-3 py-2 bg-[#7d6608] text-white text-xs font-bold rounded border-2 border-[#f4d03f] hover:bg-[#8d7618] active:scale-95 transition-all"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {errorFlow.step === "fielder" && (
                <>
                  <div className="text-[10px] text-[#ccc] mb-2">
                    Error by which fielder?
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { pos: 1, label: "P" },
                      { pos: 2, label: "C" },
                      { pos: 3, label: "1B" },
                      { pos: 4, label: "2B" },
                      { pos: 5, label: "3B" },
                      { pos: 6, label: "SS" },
                      { pos: 7, label: "LF" },
                      { pos: 8, label: "CF" },
                      { pos: 9, label: "RF" },
                    ].map(({ pos, label }) => (
                      <button
                        key={pos}
                        onClick={() =>
                          setErrorFlow((f) =>
                            f
                              ? { ...f, step: "type", fielderPosition: pos }
                              : f,
                          )
                        }
                        className="px-2 py-1.5 bg-[#333] text-white text-[10px] font-bold rounded border border-[#555] hover:border-[#f4d03f] hover:bg-[#444] active:scale-95 transition-all"
                      >
                        {pos} {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {errorFlow.step === "type" && (
                <>
                  <div className="text-[10px] text-[#ccc] mb-2">
                    Error type?
                  </div>
                  <div className="flex gap-2">
                    {["Fielding", "Throwing", "Mental"].map((t) => (
                      <button
                        key={t}
                        onClick={() =>
                          handleErrorFlowComplete(
                            errorFlow.baseReached,
                            errorFlow.fielderPosition,
                            t.toUpperCase() as PlayData["errorType"],
                          )
                        }
                        className="flex-1 px-2 py-2 bg-[#7d6608] text-white text-[10px] font-bold rounded border-2 border-[#f4d03f] hover:bg-[#8d7618] active:scale-95 transition-all"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => setErrorFlow(null)}
                className="w-full mt-3 px-3 py-1 bg-[#333] text-[#888] text-[9px] font-bold uppercase rounded border border-[#555] hover:bg-[#444] active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* D-5: SF Prompt — "Sac fly — run scores?" */}
        {sfPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#1a2a1d] border-[3px] border-[#FF4444] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[260px]">
              <div className="text-xs font-bold text-[#FF4444] tracking-wider mb-2">
                FLY OUT + R3
              </div>
              <div className="text-[11px] text-[#ccc] mb-3">
                Sac fly — run scores?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSfPromptAnswer(true)}
                  className="flex-1 px-3 py-2 bg-[#2E7D32] text-white text-xs font-bold uppercase rounded border border-[#4CAF50] hover:bg-[#388E3C] active:scale-95 transition-all"
                >
                  Yes — SF
                </button>
                <button
                  onClick={() => handleSfPromptAnswer(false)}
                  className="flex-1 px-3 py-2 bg-[#8B0000] text-white text-xs font-bold uppercase rounded border border-[#FF4444] hover:bg-[#a00] active:scale-95 transition-all"
                >
                  {`No — ${sfPrompt.outType}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* D-6: GO→DP Prompt — "Double play?" */}
        {dpPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#1a2a1d] border-[3px] border-[#FF4444] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[260px]">
              <div className="text-xs font-bold text-[#FF4444] tracking-wider mb-2">
                GROUND OUT + RUNNER OUT
              </div>
              <div className="text-[11px] text-[#ccc] mb-3">Double play?</div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDpPromptAnswer(true)}
                  className="flex-1 px-3 py-2 bg-[#8B0000] text-white text-xs font-bold uppercase rounded border border-[#FF4444] hover:bg-[#a00] active:scale-95 transition-all"
                >
                  Yes — DP
                </button>
                <button
                  onClick={() => handleDpPromptAnswer(false)}
                  className="flex-1 px-3 py-2 bg-[#333] text-white text-xs font-bold uppercase rounded border border-[#555] hover:bg-[#444] active:scale-95 transition-all"
                >
                  No — GO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* D-7: IFR Prompt — "Infield Fly Rule?" */}
        {ifrPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#1a2a1d] border-[3px] border-[#6666FF] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[260px]">
              <div className="text-xs font-bold text-[#AAAAFF] tracking-wider mb-2">
                POP OUT — R1 + R2
              </div>
              <div className="text-[11px] text-[#ccc] mb-3">
                Infield Fly Rule?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleIfrPromptAnswer(true)}
                  className="flex-1 px-3 py-2 bg-[#4444AA] text-white text-xs font-bold uppercase rounded border border-[#6666FF] hover:bg-[#5555BB] active:scale-95 transition-all"
                >
                  Yes — IFR
                </button>
                <button
                  onClick={() => handleIfrPromptAnswer(false)}
                  className="flex-1 px-3 py-2 bg-[#333] text-white text-xs font-bold uppercase rounded border border-[#555] hover:bg-[#444] active:scale-95 transition-all"
                >
                  No — PO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
           PRESERVED: Old below-field content (disabled reference code).
           Kept as reference for future Layer 2 sessions that will
           wire the Quick Bar to these handlers.
         ══════════════════════════════════════════════════════════════ */}
        {false && (
          <div>
            {/* Expandable sections - REMOVED, replaced with drag-drop interface */}
            {/* The game tracker now uses direct field interaction instead of buttons */}
            {false && (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {/* HITS Section */}
                <ExpandablePanel
                  title="HITS"
                  isExpanded={expandedSections.hits}
                  onToggle={() => toggleSection("hits")}
                >
                  <div className="space-y-1">
                    <div className="grid grid-cols-5 gap-1">
                      <OutcomeButton
                        label="1B"
                        color="lightblue"
                        isExpanded={expandedOutcome === "1B"}
                        onClick={() => {
                          toggleOutcomeDetail("1B");
                          handleHitSelect("1B");
                        }}
                      />
                      <OutcomeButton
                        label="2B"
                        color="lightblue"
                        isExpanded={expandedOutcome === "2B"}
                        onClick={() => {
                          toggleOutcomeDetail("2B");
                          handleHitSelect("2B");
                        }}
                      />
                      <OutcomeButton
                        label="3B"
                        color="lightblue"
                        isExpanded={expandedOutcome === "3B"}
                        onClick={() => {
                          toggleOutcomeDetail("3B");
                          handleHitSelect("3B");
                        }}
                      />
                      <OutcomeButton
                        label="HR"
                        color="magenta"
                        isExpanded={expandedOutcome === "HR"}
                        onClick={() => {
                          toggleOutcomeDetail("HR");
                          handleHitSelect("HR");
                        }}
                      />
                      <OutcomeButton
                        label="E"
                        color="purple"
                        isExpanded={expandedOutcome === "E"}
                        onClick={() => toggleOutcomeDetail("E")}
                      />
                    </div>

                    {/* HR Details */}
                    {expandedOutcome === "HR" && (
                      <OutcomeDetailPanel title="HOME RUN DETAILS">
                        <div className="space-y-2">
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              DIRECTION:
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              <DetailButton label="L" onClick={() => {}} />
                              <DetailButton label="LC" onClick={() => {}} />
                              <DetailButton label="C" onClick={() => {}} />
                              <DetailButton label="RC" onClick={() => {}} />
                              <DetailButton label="R" onClick={() => {}} />
                            </div>
                          </div>
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              DISTANCE (FT):
                            </div>
                            <input
                              type="number"
                              placeholder="e.g., 420"
                              className="w-full bg-[#1A1A2E] border-2 border-white text-white text-xs p-1"
                            />
                          </div>
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              HOW DID IT CLEAR:
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <DetailButton label="FENCE" onClick={() => {}} />
                              <DetailButton label="ROBBED" onClick={() => {}} />
                              <DetailButton label="WALL" onClick={() => {}} />
                            </div>
                          </div>
                          {/* RBI Selection */}
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              RBI:
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              {[1, 2, 3, 4].map((num) => (
                                <DetailButton
                                  key={num}
                                  label={num.toString()}
                                  isSelected={pendingOutcome?.rbi === num}
                                  onClick={() => handleRbiChange(num)}
                                />
                              ))}
                            </div>
                          </div>
                          {/* RECORD Button */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              onClick={handleCancelOutcome}
                              className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={handleRecordOutcome}
                              disabled={isSaving}
                              className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                            >
                              {isSaving ? "SAVING..." : "RECORD HR"}
                            </button>
                          </div>
                        </div>
                      </OutcomeDetailPanel>
                    )}

                    {/* 1B, 2B, 3B Details */}
                    {(expandedOutcome === "1B" ||
                      expandedOutcome === "2B" ||
                      expandedOutcome === "3B") && (
                      <OutcomeDetailPanel title={`${expandedOutcome} DETAILS`}>
                        <div className="space-y-2">
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              DIRECTION:
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              <DetailButton label="L" onClick={() => {}} />
                              <DetailButton label="LC" onClick={() => {}} />
                              <DetailButton label="C" onClick={() => {}} />
                              <DetailButton label="RC" onClick={() => {}} />
                              <DetailButton label="R" onClick={() => {}} />
                            </div>
                          </div>
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              HIT TYPE:
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <DetailButton label="GROUND" onClick={() => {}} />
                              <DetailButton label="LINE" onClick={() => {}} />
                              <DetailButton label="FLY" onClick={() => {}} />
                            </div>
                          </div>
                          {/* RBI Selection */}
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              RBI:
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              {[0, 1, 2, 3, 4].map((num) => (
                                <DetailButton
                                  key={num}
                                  label={num.toString()}
                                  isSelected={pendingOutcome?.rbi === num}
                                  onClick={() => handleRbiChange(num)}
                                />
                              ))}
                            </div>
                          </div>
                          {/* RECORD Button */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              onClick={handleCancelOutcome}
                              className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={handleRecordOutcome}
                              disabled={isSaving}
                              className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                            >
                              {isSaving
                                ? "SAVING..."
                                : `RECORD ${expandedOutcome}`}
                            </button>
                          </div>
                        </div>
                      </OutcomeDetailPanel>
                    )}

                    {/* Error Details — T0-04 FIX: Wire position buttons to recordError */}
                    {expandedOutcome === "E" && (
                      <OutcomeDetailPanel title="ERROR DETAILS">
                        <div className="space-y-2">
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              FIELDED BY:
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              <DetailButton
                                label="P"
                                onClick={() => {
                                  void handleQuickErrorDetail("P");
                                }}
                              />
                              <DetailButton
                                label="C"
                                onClick={() => {
                                  void handleQuickErrorDetail("C");
                                }}
                              />
                              <DetailButton
                                label="1B"
                                onClick={() => {
                                  void handleQuickErrorDetail("1B");
                                }}
                              />
                              <DetailButton
                                label="2B"
                                onClick={() => {
                                  void handleQuickErrorDetail("2B");
                                }}
                              />
                              <DetailButton
                                label="3B"
                                onClick={() => {
                                  void handleQuickErrorDetail("3B");
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-4 gap-1 mt-1">
                              <DetailButton
                                label="SS"
                                onClick={() => {
                                  void handleQuickErrorDetail("SS");
                                }}
                              />
                              <DetailButton
                                label="LF"
                                onClick={() => {
                                  void handleQuickErrorDetail("LF");
                                }}
                              />
                              <DetailButton
                                label="CF"
                                onClick={() => {
                                  void handleQuickErrorDetail("CF");
                                }}
                              />
                              <DetailButton
                                label="RF"
                                onClick={() => {
                                  void handleQuickErrorDetail("RF");
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </OutcomeDetailPanel>
                    )}

                    <div className="grid grid-cols-2 gap-1">
                      <OutcomeButton
                        label="BB"
                        color="blue"
                        isExpanded={expandedOutcome === "BB"}
                        onClick={() => {
                          toggleOutcomeDetail("BB");
                          handleWalkSelect("BB");
                        }}
                      />
                      <OutcomeButton
                        label="HBP"
                        color="blue"
                        isExpanded={expandedOutcome === "HBP"}
                        onClick={() => {
                          toggleOutcomeDetail("HBP");
                          handleWalkSelect("HBP");
                        }}
                      />
                    </div>

                    {/* BB/HBP Quick Record */}
                    {(expandedOutcome === "BB" ||
                      expandedOutcome === "HBP") && (
                      <OutcomeDetailPanel
                        title={
                          expandedOutcome === "BB" ? "WALK" : "HIT BY PITCH"
                        }
                      >
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={handleCancelOutcome}
                            className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                          >
                            CANCEL
                          </button>
                          <button
                            onClick={handleRecordOutcome}
                            disabled={isSaving}
                            className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                          >
                            {isSaving
                              ? "SAVING..."
                              : `RECORD ${expandedOutcome}`}
                          </button>
                        </div>
                      </OutcomeDetailPanel>
                    )}
                  </div>
                </ExpandablePanel>

                {/* OUTS Section */}
                <ExpandablePanel
                  title="OUTS"
                  isExpanded={expandedSections.outs}
                  onToggle={() => toggleSection("outs")}
                >
                  <div className="space-y-1">
                    <div className="grid grid-cols-5 gap-1">
                      <OutcomeButton
                        label="K"
                        color="red"
                        isExpanded={expandedOutcome === "K"}
                        onClick={() => {
                          toggleOutcomeDetail("K");
                          handleOutSelect("K");
                        }}
                      />
                      <OutcomeButton
                        label="Kc"
                        color="red"
                        isExpanded={expandedOutcome === "Kc"}
                        onClick={() => {
                          toggleOutcomeDetail("Kc");
                          handleOutSelect("Kc");
                        }}
                      />
                      <OutcomeButton
                        label="GO"
                        color="red"
                        isExpanded={expandedOutcome === "GO"}
                        onClick={() => {
                          toggleOutcomeDetail("GO");
                          handleOutSelect("GO");
                        }}
                      />
                      <OutcomeButton
                        label="FO"
                        color="red"
                        isExpanded={expandedOutcome === "FO"}
                        onClick={() => {
                          toggleOutcomeDetail("FO");
                          handleOutSelect("FO");
                        }}
                      />
                      <OutcomeButton
                        label="LO"
                        color="red"
                        isExpanded={expandedOutcome === "LO"}
                        onClick={() => {
                          toggleOutcomeDetail("LO");
                          handleOutSelect("LO");
                        }}
                      />
                    </div>

                    {/* K/KL Quick Record (no additional details needed) */}
                    {(expandedOutcome === "K" || expandedOutcome === "Kc") && (
                      <OutcomeDetailPanel
                        title={
                          expandedOutcome === "K"
                            ? "STRIKEOUT (SWINGING)"
                            : "STRIKEOUT (LOOKING)"
                        }
                      >
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={handleCancelOutcome}
                            className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                          >
                            CANCEL
                          </button>
                          <button
                            onClick={handleRecordOutcome}
                            disabled={isSaving}
                            className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                          >
                            {isSaving
                              ? "SAVING..."
                              : `RECORD ${expandedOutcome}`}
                          </button>
                        </div>
                      </OutcomeDetailPanel>
                    )}

                    {/* FO Details */}
                    {expandedOutcome === "FO" && (
                      <OutcomeDetailPanel title="FLY OUT DETAILS">
                        <div className="space-y-2">
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              DIRECTION:
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              <DetailButton label="L" onClick={() => {}} />
                              <DetailButton label="LC" onClick={() => {}} />
                              <DetailButton label="C" onClick={() => {}} />
                              <DetailButton label="RC" onClick={() => {}} />
                              <DetailButton label="R" onClick={() => {}} />
                            </div>
                          </div>
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              FIELDED BY:
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              <DetailButton label="P" onClick={() => {}} />
                              <DetailButton label="C" onClick={() => {}} />
                              <DetailButton label="1B" onClick={() => {}} />
                              <DetailButton label="2B" onClick={() => {}} />
                              <DetailButton label="3B" onClick={() => {}} />
                            </div>
                            <div className="grid grid-cols-4 gap-1 mt-1">
                              <DetailButton label="SS" onClick={() => {}} />
                              <DetailButton label="LF" onClick={() => {}} />
                              <DetailButton label="CF" onClick={() => {}} />
                              <DetailButton label="RF" onClick={() => {}} />
                            </div>
                          </div>
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              SPECIAL PLAY:
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <DetailButton
                                label="ROUTINE"
                                onClick={() =>
                                  handleFieldingDifficultySelect("ROUTINE")
                                }
                              />
                              <DetailButton
                                label="DIVING"
                                onClick={() =>
                                  handleFieldingDifficultySelect("DIVING")
                                }
                              />
                              <DetailButton
                                label="WALL"
                                onClick={() =>
                                  handleFieldingDifficultySelect("WALL")
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-1 mt-1">
                              <DetailButton
                                label="RUNNING"
                                onClick={() =>
                                  handleFieldingDifficultySelect("RUNNING")
                                }
                              />
                              <DetailButton
                                label="LEAPING"
                                onClick={() =>
                                  handleFieldingDifficultySelect("LEAPING")
                                }
                              />
                            </div>
                          </div>
                          {/* GAP-GT-3-H: Sac fly prompt — FO with R3 occupied and <2 outs */}
                          {gameState.bases.third && gameState.outs < 2 && (
                            <div className="p-1 bg-[#2a4a2a] border border-[#44AA44] mt-1">
                              <div className="text-[8px] text-[#88FF88] font-bold mb-1">
                                🏃 RUNNER ON 3RD — SAC FLY?
                              </div>
                              <button
                                onClick={async () => {
                                  // Record as SF directly (cleaner than mutating pendingOutcome)
                                  try {
                                    await commitPlateAppearanceAndAppend({
                                      type: "out",
                                      outType: "SF",
                                    });
                                    logAction("SF (sac fly via prompt)");
                                    setPendingOutcome(null);
                                    setExpandedOutcome(null);
                                  } catch (e) {
                                    console.error("Failed to record SF:", e);
                                  }
                                }}
                                disabled={isSaving}
                                className="w-full text-[9px] py-1 bg-[#336633] border border-[#44AA44] text-[#88FF88] font-bold hover:bg-[#447744] disabled:opacity-50"
                              >
                                RECORD AS SAC FLY (SF)
                              </button>
                            </div>
                          )}
                          {/* GAP-GT-6-A: Time play toggle — only relevant on 3rd out with runners */}
                          {gameState.outs === 2 && hasRunners && (
                            <div className="p-1 bg-[#3a2a1a] border border-[#AA6644] mt-1">
                              <div className="text-[8px] text-[#FFAA66] font-bold mb-1">
                                ⏱ TIME PLAY — 3RD OUT
                              </div>
                              <button
                                onClick={() =>
                                  setTimePlayNoRun((prev) => !prev)
                                }
                                className={`w-full text-[9px] py-1 border font-bold ${timePlayNoRun ? "bg-[#8B4513] border-[#AA6644] text-[#FFD700]" : "bg-[#333] border-[#555] text-[#AAA]"}`}
                              >
                                {timePlayNoRun
                                  ? "✓ OUT BEFORE RUN — NO RUNS COUNT"
                                  : "Runner scored before out? (tap to negate)"}
                              </button>
                            </div>
                          )}
                          {/* RECORD Button */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              onClick={handleCancelOutcome}
                              className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={handleRecordOutcome}
                              disabled={isSaving}
                              className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                            >
                              {isSaving ? "SAVING..." : "RECORD FO"}
                            </button>
                          </div>
                        </div>
                      </OutcomeDetailPanel>
                    )}

                    {/* GO, LO Details */}
                    {(expandedOutcome === "GO" || expandedOutcome === "LO") && (
                      <OutcomeDetailPanel
                        title={`${expandedOutcome === "GO" ? "GROUND" : "LINE"} OUT DETAILS`}
                      >
                        <div className="space-y-2">
                          <div>
                            <div className="text-[7px] text-white mb-1">
                              FIELDED BY:
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              <DetailButton label="P" onClick={() => {}} />
                              <DetailButton label="C" onClick={() => {}} />
                              <DetailButton label="1B" onClick={() => {}} />
                              <DetailButton label="2B" onClick={() => {}} />
                              <DetailButton label="3B" onClick={() => {}} />
                            </div>
                            <div className="grid grid-cols-4 gap-1 mt-1">
                              <DetailButton label="SS" onClick={() => {}} />
                              <DetailButton label="LF" onClick={() => {}} />
                              <DetailButton label="CF" onClick={() => {}} />
                              <DetailButton label="RF" onClick={() => {}} />
                            </div>
                          </div>
                          {/* GAP-GT-6-A: Time play toggle — only relevant on 3rd out with runners */}
                          {gameState.outs === 2 && hasRunners && (
                            <div className="p-1 bg-[#3a2a1a] border border-[#AA6644]">
                              <div className="text-[8px] text-[#FFAA66] font-bold mb-1">
                                ⏱ TIME PLAY — 3RD OUT
                              </div>
                              <button
                                onClick={() =>
                                  setTimePlayNoRun((prev) => !prev)
                                }
                                className={`w-full text-[9px] py-1 border font-bold ${timePlayNoRun ? "bg-[#8B4513] border-[#AA6644] text-[#FFD700]" : "bg-[#333] border-[#555] text-[#AAA]"}`}
                              >
                                {timePlayNoRun
                                  ? "✓ OUT BEFORE RUN — NO RUNS COUNT"
                                  : "Runner scored before out? (tap to negate)"}
                              </button>
                            </div>
                          )}
                          {/* RECORD Button */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                              onClick={handleCancelOutcome}
                              className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                            >
                              CANCEL
                            </button>
                            <button
                              onClick={handleRecordOutcome}
                              disabled={isSaving}
                              className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                            >
                              {isSaving
                                ? "SAVING..."
                                : `RECORD ${expandedOutcome}`}
                            </button>
                          </div>
                        </div>
                      </OutcomeDetailPanel>
                    )}

                    {/* GAP-GT-6-G / GAP-GT-6-C: Button availability enforcement */}
                    <div className="grid grid-cols-5 gap-1">
                      <OutcomeButton
                        label="PO"
                        color="red"
                        isExpanded={expandedOutcome === "PO"}
                        onClick={() => {
                          toggleOutcomeDetail("PO");
                          handleOutSelect("PO");
                        }}
                      />
                      <OutcomeButton
                        label="DP"
                        color="red"
                        isExpanded={expandedOutcome === "DP"}
                        onClick={() => {
                          toggleOutcomeDetail("DP");
                          handleOutSelect("DP");
                        }}
                        disabled={gameState.outs >= 2} // DP impossible with 2 outs
                      />
                      <OutcomeButton
                        label="FC"
                        color="purple"
                        isExpanded={expandedOutcome === "FC"}
                        onClick={() => {
                          toggleOutcomeDetail("FC");
                          handleOutSelect("FC");
                        }}
                      />
                      <OutcomeButton
                        label="SF"
                        color="purple"
                        isExpanded={expandedOutcome === "SF"}
                        onClick={() => {
                          toggleOutcomeDetail("SF");
                          handleOutSelect("SF");
                        }}
                        disabled={gameState.outs >= 2} // SF impossible with 2 outs
                      />
                      <OutcomeButton
                        label="SH"
                        color="purple"
                        isExpanded={expandedOutcome === "SH"}
                        onClick={() => {
                          toggleOutcomeDetail("SH");
                          handleOutSelect("SH");
                        }}
                        disabled={!hasRunners} // GAP-GT-6-C: SAC requires runners
                      />
                    </div>

                    {/* TP button — needs ≥2 runners AND 0 outs (GAP-GT-6-G) */}
                    <div className="grid grid-cols-2 gap-1">
                      <OutcomeButton
                        label="TP"
                        color="red"
                        isExpanded={expandedOutcome === "TP"}
                        onClick={() => {
                          toggleOutcomeDetail("TP");
                          handleOutSelect("TP");
                        }}
                        disabled={runnerCount < 2 || gameState.outs > 0}
                      />
                      <OutcomeButton
                        label="D3K"
                        color="purple"
                        isExpanded={expandedOutcome === "D3K"}
                        onClick={() => {
                          toggleOutcomeDetail("D3K");
                          handleOutSelect("D3K");
                        }}
                        disabled={!!gameState.bases.first && gameState.outs < 2} // D3K illegal when 1B occupied & <2 outs
                      />
                    </div>

                    {/* PO/DP/FC/SF/SH/TP Quick Record */}
                    {(expandedOutcome === "PO" ||
                      expandedOutcome === "DP" ||
                      expandedOutcome === "FC" ||
                      expandedOutcome === "SF" ||
                      expandedOutcome === "SH" ||
                      expandedOutcome === "TP") && (
                      <OutcomeDetailPanel title={`${expandedOutcome} DETAILS`}>
                        {/* GAP-GT-4-H: IFR auto-prompt when PO + R1+R2 (or loaded) + <2 outs */}
                        {expandedOutcome === "PO" &&
                          runnerCount >= 2 &&
                          gameState.outs < 2 && (
                            <div className="mb-2 p-1 bg-[#2a2a4a] border border-[#8888FF]">
                              <div className="text-[8px] text-[#AAAAFF] font-bold mb-1">
                                ⚑ INFIELD FLY RULE?
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  onClick={() => {
                                    setPendingOutcome((prev) =>
                                      prev
                                        ? ({
                                            ...prev,
                                            modifiers: {
                                              ...prev.modifiers,
                                              ifr: true,
                                            },
                                          } as typeof prev)
                                        : prev,
                                    );
                                  }}
                                  className={`text-[9px] py-1 border font-bold ${(pendingOutcome as { modifiers?: { ifr?: boolean } })?.modifiers?.ifr ? "bg-[#6666FF] border-[#4444DD] text-white" : "bg-[#333] border-[#555] text-[#AAA]"}`}
                                >
                                  YES — IFR
                                </button>
                                <button
                                  onClick={() => {
                                    setPendingOutcome((prev) =>
                                      prev
                                        ? ({
                                            ...prev,
                                            modifiers: {
                                              ...prev.modifiers,
                                              ifr: false,
                                            },
                                          } as typeof prev)
                                        : prev,
                                    );
                                  }}
                                  className={`text-[9px] py-1 border font-bold ${(pendingOutcome as { modifiers?: { ifr?: boolean } })?.modifiers?.ifr === false ? "bg-[#555] border-[#777] text-white" : "bg-[#333] border-[#555] text-[#AAA]"}`}
                                >
                                  NO
                                </button>
                              </div>
                            </div>
                          )}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={handleCancelOutcome}
                            className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                          >
                            CANCEL
                          </button>
                          <button
                            onClick={handleRecordOutcome}
                            disabled={isSaving}
                            className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                          >
                            {isSaving
                              ? "SAVING..."
                              : `RECORD ${expandedOutcome}`}
                          </button>
                        </div>
                      </OutcomeDetailPanel>
                    )}

                    {/* D3K Quick Record */}
                    {expandedOutcome === "D3K" && (
                      <OutcomeDetailPanel title="DROPPED 3RD STRIKE">
                        <div className="text-[8px] text-[#AAAACC] mb-1">
                          {gameState.bases.first && gameState.outs < 2
                            ? "⚠ D3K disabled: 1B occupied with <2 outs (batter is automatically out)"
                            : "Batter may run to 1B"}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={handleCancelOutcome}
                            className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                          >
                            CANCEL
                          </button>
                          <button
                            onClick={handleRecordOutcome}
                            disabled={isSaving}
                            className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                          >
                            {isSaving ? "SAVING..." : "RECORD D3K"}
                          </button>
                        </div>
                      </OutcomeDetailPanel>
                    )}
                  </div>
                </ExpandablePanel>

                {/* EVENTS Section */}
                <ExpandablePanel
                  title="EVENTS"
                  isExpanded={expandedSections.events}
                  onToggle={() => toggleSection("events")}
                >
                  <div className="space-y-1">
                    <div className="grid grid-cols-4 gap-1">
                      <OutcomeButton
                        label="SB"
                        color="lightblue"
                        isExpanded={expandedOutcome === "SB"}
                        onClick={() => toggleOutcomeDetail("SB")}
                      />
                      <OutcomeButton
                        label="CS"
                        color="red"
                        isExpanded={expandedOutcome === "CS"}
                        onClick={() => toggleOutcomeDetail("CS")}
                      />
                      <OutcomeButton
                        label="WP"
                        color="purple"
                        isExpanded={expandedOutcome === "WP"}
                        onClick={() => toggleOutcomeDetail("WP")}
                      />
                      <OutcomeButton
                        label="PB"
                        color="purple"
                        isExpanded={expandedOutcome === "PB"}
                        onClick={() => toggleOutcomeDetail("PB")}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <OutcomeButton
                        label="PICK"
                        color="red"
                        isExpanded={expandedOutcome === "PICK"}
                        onClick={() => toggleOutcomeDetail("PICK")}
                      />
                      <OutcomeButton
                        label="KILLED"
                        color="purple"
                        isExpanded={expandedOutcome === "KILLED"}
                        onClick={() => toggleOutcomeDetail("KILLED")}
                      />
                      <OutcomeButton
                        label="NUTSHOT"
                        color="purple"
                        isExpanded={expandedOutcome === "NUTSHOT"}
                        onClick={() => toggleOutcomeDetail("NUTSHOT")}
                      />
                    </div>
                  </div>
                </ExpandablePanel>

                {/* LINEUP Section - Drag-and-Drop Only */}
                <ExpandablePanel
                  title="LINEUP"
                  isExpanded={expandedSections.substitutions}
                  onToggle={() => toggleSection("substitutions")}
                >
                  {/* GAP-GT-7-B: Lineup size warning — display if not 9 or 10 players */}
                  {!lineupSizeOk && currentLineup.length > 0 && (
                    <div className="mb-1 px-2 py-1 bg-[#4A2A00] border border-[#FF8800] text-[#FFAA44] text-[8px] font-bold">
                      ⚠ LINEUP SIZE: {currentLineup.length} — expected 9 active
                      hitters
                    </div>
                  )}
                  {/* LineupCard - Drag-drop substitution interface (Per spec: no buttons) */}
                  {/* EXH-036: Added onPlayerClick to allow mojo/fitness editing from lineup cards */}
                  <LineupCard
                    lineup={lineupCardData}
                    bench={benchCardData}
                    bullpen={bullpenCardData}
                    currentPitcher={currentPitcherData}
                    onSubstitution={handleLineupCardSubstitution}
                    isExpanded={true}
                    onPlayerClick={(playerId, playerName, type) =>
                      setSelectedPlayer({ name: playerName, type, playerId })
                    }
                  />
                </ExpandablePanel>
              </div>
            )}

            {/* Control buttons - UNDO and END GAME */}
            <div className="flex gap-3 items-center">
              <button className="flex-1 bg-[#808080] border-[5px] border-white py-4 text-white text-base font-bold hover:bg-[#999999] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
                ⟲ UNDO
              </button>

              {/* Logo between buttons */}
              <div className="bg-white border-[4px] border-[#0066FF] px-3 py-1 shadow-[4px_4px_0px_0px_#DD0000]">
                <div className="text-xs text-[#DD0000] tracking-wide leading-tight">
                  SUPER MEGA
                </div>
                <div className="text-sm text-[#0066FF] tracking-wide leading-tight">
                  BASEBALL
                </div>
              </div>

              <button
                onClick={() => setShowEndGameConfirmation(true)}
                className="flex-1 bg-[#DD0000] border-[5px] border-white py-4 text-white text-base font-bold hover:bg-[#FF0000] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_#0066FF]"
              >
                🏁 END GAME
              </button>
            </div>
          </div>
        )}
        {/* Close outer {false && (<div>)} disabled reference block */}
      </div>
      {isProcessingEndGame && (
        <div className="fixed inset-0 z-[100] bg-[#081a2b]/90 flex items-center justify-center px-6">
          <div className="bg-[#10273f] border-4 border-[#C4A853] shadow-[0_0_32px_rgba(0,0,0,0.55)] px-8 py-6 text-center max-w-sm w-full">
            <div className="flex items-center justify-center gap-3 text-[#F4E7B7]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg font-bold tracking-wide">
                Processing game...
              </span>
            </div>
            <div className="mt-3 text-sm text-[#D6E2F0]">
              Finalizing stats and loading the post-game report.
            </div>
          </div>
        </div>
      )}
    </DndProvider>
  );
}

// Pitch Count Modal Component (per PITCH_COUNT_TRACKING_SPEC.md §5)
interface PitchCountModalProps {
  prompt: {
    type: "pitching_change" | "end_game" | "end_inning";
    pitcherId: string;
    pitcherName: string;
    currentCount: number;
    lastVerifiedInning: number;
  };
  onConfirm: (pitcherId: string, finalCount: number) => void;
  onDismiss: () => void;
}

function PitchCountModal({
  prompt,
  onConfirm,
  onDismiss,
}: PitchCountModalProps) {
  const [pitchCount, setPitchCount] = React.useState(
    prompt.currentCount.toString(),
  );

  const handleConfirm = () => {
    const count = parseInt(pitchCount, 10);
    if (!isNaN(count) && count >= 0) {
      onConfirm(prompt.pitcherId, count);
    }
  };

  const title =
    prompt.type === "pitching_change"
      ? "⚠️ PITCHING CHANGE - PITCH COUNT REQUIRED"
      : prompt.type === "end_game"
        ? "🏁 FINAL PITCH COUNT"
        : "📊 END OF INNING - UPDATE PITCH COUNT?";

  const isRequired = prompt.type !== "end_inning";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#556B55] border-4 border-[#3d5240] p-4 max-w-md w-full mx-4 shadow-lg">
        <div className="text-[#FFD700] text-sm font-bold mb-3">{title}</div>

        <div className="bg-[#3d5240] p-3 mb-3">
          <div className="text-[#E8E8D8] text-xs mb-1">
            {prompt.type === "pitching_change" ? "Outgoing Pitcher" : "Pitcher"}
            :
          </div>
          <div className="text-white font-bold">{prompt.pitcherName}</div>
        </div>

        <div className="text-[#E8E8D8] text-xs mb-2">
          Last recorded:{" "}
          <span className="text-white font-bold">{prompt.currentCount}</span>{" "}
          pitches (after inning {prompt.lastVerifiedInning})
        </div>

        <button
          type="button"
          onClick={() => onConfirm(prompt.pitcherId, prompt.currentCount + 1)}
          className="mb-3 w-full bg-[#2a3a2d] border-2 border-[#C4A853] text-[#C4A853] py-2 px-4 text-xs font-bold tracking-[0.12em] hover:bg-[#344a3a]"
        >
          ONE-PITCH AB (+1)
        </button>

        <div className="mb-4">
          <label className="text-[#E8E8D8] text-xs block mb-1">
            Enter CURRENT pitch count:
          </label>
          <input
            type="number"
            min={prompt.currentCount}
            value={pitchCount}
            onChange={(e) => setPitchCount(e.target.value)}
            className="w-full bg-[#2a3a2d] border-2 border-[#1a3020] text-white text-lg font-bold p-2 text-center"
            autoFocus
          />
          <div className="text-[#88AA88] text-[10px] mt-1">
            💡 Check the broadcast or scoreboard for current count
          </div>
        </div>

        {isRequired && (
          <div className="text-[#FF6666] text-xs mb-3">
            ⚠️ Cannot proceed without pitch count.
          </div>
        )}

        <div className="flex gap-2">
          {!isRequired && (
            <button
              onClick={onDismiss}
              className="flex-1 bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] py-2 px-4 font-bold hover:bg-[#4a6a4a]"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="flex-1 bg-[#FFD700] border-2 border-[#CC9900] text-[#1a3020] py-2 px-4 font-bold hover:bg-[#FFE44D]"
          >
            {isRequired ? "Confirm & Continue" : "Update"}
          </button>
          {isRequired && (
            <button
              onClick={onDismiss}
              className="bg-[#663333] border-2 border-[#4a2424] text-[#E8E8D8] py-2 px-4 font-bold hover:bg-[#884444]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlayerBoxProps {
  name: string;
  number: string;
  position: string;
  style?: React.CSSProperties;
  highlighted?: boolean;
}

function PlayerBox({
  name,
  number,
  position,
  style,
  highlighted = false,
}: PlayerBoxProps) {
  return (
    <div
      className="absolute pointer-events-auto cursor-pointer bg-[#3366FF] border-[#5599FF] border-[3px] px-3 py-2 text-[9px] text-white hover:scale-110 transition-transform"
      style={style}
    >
      <div className="whitespace-nowrap font-bold">{name}</div>
      <div className="text-[8px] text-white">
        {position} {number}
      </div>
    </div>
  );
}

interface SNESButtonProps {
  label: string;
  color: "blue" | "red" | "purple" | "lightblue" | "magenta";
  onClick: () => void;
}

function SNESButton({ label, color, onClick }: SNESButtonProps) {
  const colorClasses = {
    blue: "bg-[#3366FF] border-[#1A44BB] text-white hover:bg-[#4477FF]",
    red: "bg-[#DD0000] border-[#AA0000] text-white hover:bg-[#FF0000]",
    purple: "bg-[#7733DD] border-[#5522AA] text-white hover:bg-[#8844EE]",
    lightblue: "bg-[#5599FF] border-[#3366CC] text-white hover:bg-[#66AAFF]",
    magenta: "bg-[#CC44CC] border-[#992299] text-white hover:bg-[#DD55DD]",
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} border-[5px] py-4 text-base active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]`}
    >
      {label}
    </button>
  );
}

interface ExpandablePanelProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ExpandablePanel({
  title,
  isExpanded,
  onToggle,
  children,
}: ExpandablePanelProps) {
  return (
    <div className="bg-[#3366FF] border-[4px] border-white p-2">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="text-[8px] text-white font-bold">{title}</div>
        <div className="text-[8px] text-white font-bold">
          {isExpanded ? "▲" : "▼"}
        </div>
      </div>
      {isExpanded && <div className="mt-2">{children}</div>}
    </div>
  );
}

interface PlayerCardBenchEntry {
  name: string;
  pos: string;
  hand: string;
  isOutOfGame: boolean;
}

interface PlayerCardModalProps {
  player: { name: string; type: "batter" | "pitcher"; playerId: string };
  playerData?: Player; // Full player object with position, ratings, traits
  onClose: () => void;
  // §5.3: Real game stats from playerStats/pitcherStats Maps
  batterGameStats?: PlayerGameStats;
  pitcherGameStats?: PitcherGameStats;
  // EXH-036: Mojo/Fitness
  currentMojo?: MojoLevel;
  currentFitness?: FitnessState;
  onMojoChange?: (newMojo: MojoLevel) => void;
  onFitnessChange?: (newFitness: FitnessState) => void;
  // §9.1: Substitution
  onSubOut?: (
    outgoingPlayerId: string,
    outgoingName: string,
    incomingName: string,
    isPitcher: boolean,
    incomingPosition?: string,
    runnerBase?: RunnerBase,
  ) => void;
  benchPlayers?: PlayerCardBenchEntry[];
  bullpenPitchers?: Array<{ name: string; hand: string }>;
  isActivePitcher?: boolean;
  // §9.2: Swap Position
  showSwapPosition?: boolean;
  onSwapPosition?: (playerId: string, playerName: string) => void;
  // §9.3: Swap Order (pre-game only)
  showSwapOrder?: boolean;
  onSwapOrder?: (playerId: string, playerName: string) => void;
  runnerBase?: RunnerBase;
  onRunnerAction?: (
    eventType:
      | "SB"
      | "CS"
      | "WP"
      | "PB"
      | "PICK"
      | "PICK_SAFE"
      | "PICK_E"
      | "ADVANCE"
      | "ADVANCE_E",
    base: RunnerBase,
    runnerId: string,
    runnerName: string,
  ) => void;
  onCorrectOutcome?: () => void;
  // Phase
  gamePhase?: GamePhase;
}

/** §5.3: Stat cell helper — avoids repeating verbose Tailwind */
function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div
        className="text-xs text-[#E8E8D8] font-bold"
        style={{ textShadow: "1px 1px 0px rgba(0,0,0,0.3)" }}
      >
        {value}
      </div>
      <div
        className="text-[7px] text-[#E8E8D8]"
        style={{ textShadow: "1px 1px 0px rgba(0,0,0,0.3)" }}
      >
        {label}
      </div>
    </div>
  );
}

export function PlayerCardModal({
  player,
  playerData,
  onClose,
  batterGameStats,
  pitcherGameStats,
  currentMojo,
  currentFitness,
  onMojoChange,
  onFitnessChange,
  onSubOut,
  benchPlayers,
  bullpenPitchers,
  isActivePitcher,
  showSwapPosition,
  onSwapPosition,
  showSwapOrder,
  onSwapOrder,
  runnerBase,
  onRunnerAction,
  onCorrectOutcome,
  gamePhase,
}: PlayerCardModalProps) {
  // §9.1: Sub Out flow state — 'card' shows normal card, 'bench' shows bench list
  const [cardView, setCardView] = useState<"card" | "bench">("card");
  // §5.5: Discrete mojo/fitness editing panels
  const [isEditingMojo, setIsEditingMojo] = useState(false);
  const [isEditingFitness, setIsEditingFitness] = useState(false);

  const isLive = gamePhase === "LIVE";
  const isPostFinalOut = gamePhase === "POST_FINAL_OUT";
  const showMojoFitness = isLive || isPostFinalOut;

  // §5.3: Derive display stats from real game data
  const position =
    playerData?.position || (player.type === "pitcher" ? "P" : "—");
  const battingHand = playerData?.battingHand || "R";
  const throwingHand =
    playerData?.throws || (player.type === "pitcher" ? "R" : "—");
  const secondaryPos = playerData?.secondaryPosition;
  const overallGrade = playerData?.overallGrade;
  const age = playerData?.age;
  const trait1 = playerData?.trait1;
  const trait2 = playerData?.trait2;

  // §2.7: Compute batter stats from PlayerGameStats
  const bAB = batterGameStats?.ab ?? 0;
  const bH = batterGameStats?.h ?? 0;
  const bHR = batterGameStats?.hr ?? 0;
  const bRBI = batterGameStats?.rbi ?? 0;
  const bBB = batterGameStats?.bb ?? 0;
  const bK = batterGameStats?.k ?? 0;
  const bSB = batterGameStats?.sb ?? 0;
  const bSF = batterGameStats?.sf ?? 0;
  const bHBP = batterGameStats?.hbp ?? 0;
  const bAVG = bAB > 0 ? (bH / bAB).toFixed(3) : ".000";
  // OPS = OBP + SLG
  const obpDenom = bAB + bBB + bHBP + bSF;
  const obp = obpDenom > 0 ? (bH + bBB + bHBP) / obpDenom : 0;
  const singles = batterGameStats?.singles ?? 0;
  const doubles = batterGameStats?.doubles ?? 0;
  const triples = batterGameStats?.triples ?? 0;
  const totalBases = singles + doubles * 2 + triples * 3 + bHR * 4;
  const slg = bAB > 0 ? totalBases / bAB : 0;
  const bOPS = (obp + slg).toFixed(3);

  // §2.7: Compute pitcher stats from PitcherGameStats
  const pOuts = pitcherGameStats?.outsRecorded ?? 0;
  const pIP = `${Math.floor(pOuts / 3)}.${pOuts % 3}`;
  const pFullInnings = pOuts / 3;
  const pHA = pitcherGameStats?.hitsAllowed ?? 0;
  const pER = pitcherGameStats?.earnedRuns ?? 0;
  const pK = pitcherGameStats?.strikeoutsThrown ?? 0;
  const pBB = pitcherGameStats?.walksAllowed ?? 0;
  const pPitches = pitcherGameStats?.pitchCount ?? 0;
  const pERA =
    pFullInnings > 0 ? ((pER / pFullInnings) * 9).toFixed(2) : "0.00";
  // WHIP = (BB + H) / IP
  const pWHIP =
    pFullInnings > 0 ? ((pBB + pHA) / pFullInnings).toFixed(2) : "0.00";

  // §9.1: Bench list for Sub Out flow
  const isPitchingSubstitution =
    player.type === "pitcher" &&
    (isActivePitcher || playerData?.battingOrder === undefined);
  const availableBench =
    isPitchingSubstitution
      ? (bullpenPitchers || []).map((pitcher) => ({
          name: pitcher.name,
          pos: "P",
          hand: pitcher.hand,
          isOutOfGame: false,
        }))
      : (benchPlayers || []).filter((p) => !p.isOutOfGame);

  // §9.1: BENCH VIEW — replaces card content when Sub Out is tapped
  if (cardView === "bench") {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-[#3d4a42] border-[6px] border-[#243028] p-4 w-[480px] max-w-[95vw] flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]"
          style={{ fontFamily: "'Moms Typewriter', monospace" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Bench list header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div
                className="text-[8px] text-[#88AA88] font-bold tracking-wider"
              >
                SELECT REPLACEMENT FOR
              </div>
              <div
                className="text-xs text-[#E8E8D8] font-bold"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}
              >
                {player.name}
              </div>
            </div>
            <button
              onClick={() => setCardView("card")}
              className="bg-[#243028] border-[3px] border-[#4a6a4a] px-2 py-1 text-[#88AA88] text-[9px] font-bold hover:bg-[#2d3530]"
            >
              BACK
            </button>
          </div>

          {/* Scrollable bench player list */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {availableBench.length === 0 ? (
              <div className="text-[10px] text-[#E8E8D8]/70 text-center py-4">
                No available players
              </div>
            ) : (
              availableBench.map((bp) => (
                <button
                  key={bp.name}
                  onClick={() => {
                    onSubOut?.(
                      player.playerId,
                      player.name,
                      bp.name,
                      isPitchingSubstitution,
                      bp.pos,
                      runnerBase,
                    );
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 bg-[#2a3530] border-[3px] border-[#4a6a4a]/50 p-2
                             hover:bg-[#364038] hover:border-[#4a6a4a] active:scale-[0.98] transition-all text-left"
                >
                  <div className="bg-[#C4A853]/30 text-[#C4A853] text-[8px] font-bold px-1.5 py-0.5 min-w-[24px] text-center">
                    {bp.pos}
                  </div>
                  <div className="flex-1">
                    <div
                      className="text-[11px] text-[#E8E8D8] font-bold"
                      style={{ fontFamily: "'Tox Typewriter', monospace" }}
                    >
                      {bp.name}
                    </div>
                  </div>
                  <div className="text-[8px] text-[#88AA88]/70">{bp.hand}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // §5.3: NORMAL CARD VIEW
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#3d4a42] border-[6px] border-[#243028] p-4 w-[480px] max-w-[95vw] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]"
        style={{ fontFamily: "'Moms Typewriter', monospace" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — name, position, hand, grade, traits */}
        <div className="bg-[#243028] border-[4px] border-[#2d3530] p-2 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <div
                className="text-xs text-[#E8E8D8] font-bold"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}
              >
                {player.name}
              </div>
              <div
                className="text-[8px] text-[#88AA88]"
              >
                {position}
                {secondaryPos ? `/${secondaryPos}` : ""} {" • "} {battingHand}/
                {throwingHand}
                {overallGrade ? ` • ${overallGrade}` : ""}
                {age ? ` • Age ${age}` : ""}
              </div>
              {(trait1 || trait2) && (
                <div
                  className="text-[7px] text-[#C4A853] mt-0.5"
                >
                  {[trait1, trait2].filter(Boolean).join(" • ")}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="bg-[#243028] border-[3px] border-[#4a6a4a] px-2 py-1 text-[#88AA88] text-xs hover:bg-[#2d3530]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* §5.3 + §2.8: Stats — game stats shown with "THIS GAME" header */}
        {/* TODO: Wire season stats from franchise data store when available */}
        {player.type === "batter" ? (
          <div className="bg-[#2a3530] border-[4px] border-[#2d3530] p-2 mb-2">
            <div
              className="text-[8px] text-[#88AA88] font-bold mb-1"
            >
              THIS GAME
            </div>
            <div className="grid grid-cols-4 gap-2 text-center mb-1">
              <StatCell value={bAVG} label="AVG" />
              <StatCell value={bHR} label="HR" />
              <StatCell value={bRBI} label="RBI" />
              <StatCell value={bSB} label="SB" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <StatCell value={bOPS} label="OPS" />
              <StatCell value={bAB} label="AB" />
              <StatCell value={bBB} label="BB" />
              <StatCell value={bK} label="K" />
            </div>
            {/* WAR not available from in-game stats */}
            <div className="text-[7px] text-[#E8E8D8]/50 mt-1 text-right">
              WAR: —
            </div>
          </div>
        ) : (
          <div className="bg-[#2a3530] border-[4px] border-[#2d3530] p-2 mb-2">
            <div
              className="text-[8px] text-[#88AA88] font-bold mb-1"
            >
              THIS GAME
            </div>
            <div className="grid grid-cols-4 gap-2 text-center mb-1">
              <StatCell value={pERA} label="ERA" />
              <StatCell value={pIP} label="IP" />
              <StatCell value={pK} label="K" />
              <StatCell value={pBB} label="BB" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <StatCell value={pWHIP} label="WHIP" />
              <StatCell value={pHA} label="H" />
              <StatCell value={pER} label="ER" />
              <StatCell value={pPitches} label="P" />
            </div>
            {/* pWAR not available from in-game stats */}
            <div className="text-[7px] text-[#E8E8D8]/50 mt-1 text-right">
              pWAR: —
            </div>
          </div>
        )}

        {/* §5.5: Condition — current mojo/fitness display (read-only summary) */}
        {showMojoFitness && (currentMojo !== undefined || currentFitness !== undefined) && (
          <div className="bg-[#2a3530] border-[4px] border-[#2d3530] p-2 mb-2">
            <div
              className="text-[8px] text-[#88AA88] font-bold mb-1"
            >
              CONDITION
            </div>
            <div className="flex items-center gap-3">
              {currentMojo !== undefined && (
                <span
                  className="text-[10px] font-bold"
                  style={{
                    color: getMojoColor(currentMojo),
                    textShadow: "1px 1px 0px rgba(0,0,0,0.5)",
                  }}
                >
                  {MOJO_STATES[currentMojo].emoji}{" "}
                  {MOJO_STATES[currentMojo].displayName}
                </span>
              )}
              {currentFitness !== undefined && (
                <span
                  className="text-[10px] font-bold"
                  style={{
                    color: FITNESS_STATES[currentFitness].color,
                    textShadow: "1px 1px 0px rgba(0,0,0,0.5)",
                  }}
                >
                  {FITNESS_STATES[currentFitness].emoji}{" "}
                  {FITNESS_STATES[currentFitness].displayName}
                </span>
              )}
            </div>
          </div>
        )}

        {/* §5.5: Action Buttons */}
        <div className="space-y-1.5 mt-2">
          {/* §9.1: SUB OUT — all phases */}
          {onSubOut && (
            <button
              onClick={() => setCardView("bench")}
              className="w-full bg-[#8B0000] border-[3px] border-[#FF4444] text-white text-[10px] font-bold tracking-wider py-2
                         hover:bg-[#AA0000] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
            >
              SUB OUT
            </button>
          )}

          {/* §9.2: SWAP POSITION — shared player-card flow for live and pre-game */}
          {showSwapPosition && onSwapPosition && (
            <button
              onClick={() => {
                onSwapPosition(player.playerId, player.name);
                onClose();
              }}
              className="w-full bg-[#1a5276] border-[3px] border-[#5dade2] text-white text-[10px] font-bold tracking-wider py-2
                         hover:bg-[#21618c] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
            >
              SWAP POSITION
            </button>
          )}

          {/* §9.3: SWAP ORDER — PRE_GAME only */}
          {showSwapOrder && onSwapOrder && (
            <button
              onClick={() => {
                onSwapOrder(player.playerId, player.name);
                onClose();
              }}
              className="w-full bg-[#C4A853] border-[3px] border-[#8B7A2E] text-[#1a1a1a] text-[10px] font-bold tracking-wider py-2
                         hover:bg-[#D4B863] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
            >
              SWAP ORDER
            </button>
          )}

          {isLive && runnerBase && onRunnerAction && (
            <div className="grid grid-cols-2 gap-1.5">
              {[
                ["SB", "STEAL"],
                ["CS", "CAUGHT STEALING"],
                ["WP", "WILD PITCH"],
                ["PB", "PASSED BALL"],
                ["ADVANCE", "ADVANCE"],
                ["ADVANCE_E", "ADV ERROR"],
                ["PICK", "PICKOFF OUT"],
                ["PICK_SAFE", "PICKOFF SAFE"],
                ["PICK_E", "PICKOFF ERROR"],
              ].map(([eventType, label]) => (
                <button
                  key={eventType}
                  onClick={() => {
                    onRunnerAction(
                      eventType as
                        | "SB"
                        | "CS"
                        | "WP"
                        | "PB"
                        | "PICK"
                        | "PICK_SAFE"
                        | "PICK_E"
                        | "ADVANCE"
                        | "ADVANCE_E",
                      runnerBase,
                      player.playerId,
                      player.name,
                    );
                    onClose();
                  }}
                  className="w-full bg-[#1f3b57] border-[3px] border-[#5dade2] text-white text-[9px] font-bold tracking-wide py-2 hover:bg-[#275177] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {isLive && runnerBase && onCorrectOutcome && (
            <button
              onClick={() => {
                onCorrectOutcome();
                onClose();
              }}
              className="w-full bg-[#5a3f1f] border-[3px] border-[#C4A853] text-[#E8E8D8] text-[10px] font-bold tracking-wider py-2 hover:bg-[#6c4d26] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
            >
              CORRECT OUTCOME
            </button>
          )}

          {/* §5.5: UPDATE MOJO — LIVE + POST only */}
          {showMojoFitness && currentMojo !== undefined && onMojoChange && (
            <>
              <button
                onClick={() => {
                  setIsEditingMojo(!isEditingMojo);
                  setIsEditingFitness(false);
                }}
                className="w-full bg-[#5A4A20] border-[3px] border-[#C4A853] text-[#C4A853] text-[10px] font-bold tracking-wider py-2
                           hover:bg-[#6B5A30] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
              >
                UPDATE MOJO
              </button>
              {isEditingMojo && (
                <div className="flex gap-1 flex-wrap bg-[#243028] border-[2px] border-[#C4A853]/50 p-2">
                  {MOJO_LEVELS.map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        onMojoChange(level);
                        setIsEditingMojo(false);
                      }}
                      className={`px-2 py-1 text-[8px] font-bold border-2 transition-all ${
                        level === currentMojo
                          ? "border-[#C4A853] bg-[#C4A853]/30"
                          : "border-[#4a6a4a] hover:border-[#88AA88]"
                      }`}
                      style={{ color: getMojoColor(level) }}
                    >
                      {MOJO_STATES[level].emoji}{" "}
                      {MOJO_STATES[level].displayName}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* §5.5: UPDATE FITNESS — LIVE + POST only, with auto-injury */}
          {showMojoFitness &&
            currentFitness !== undefined &&
            onFitnessChange && (
              <>
                <button
                  onClick={() => {
                    setIsEditingFitness(!isEditingFitness);
                    setIsEditingMojo(false);
                  }}
                  className="w-full bg-[#2A4A2A] border-[3px] border-[#4CAF50] text-[#4CAF50] text-[10px] font-bold tracking-wider py-2
                           hover:bg-[#3A5A3A] active:scale-95 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                >
                  UPDATE FITNESS
                </button>
                {isEditingFitness && (
                  <div className="flex gap-1 flex-wrap bg-[#243028] border-[2px] border-[#4CAF50]/50 p-2">
                    {(
                      [
                        "JUICED",
                        "FIT",
                        "WELL",
                        "STRAINED",
                        "WEAK",
                        "HURT",
                      ] as FitnessState[]
                    ).map((state) => (
                      <button
                        key={state}
                        onClick={() => {
                          onFitnessChange(state);
                          setIsEditingFitness(false);
                        }}
                        className={`px-2 py-1 text-[8px] font-bold border-2 transition-all ${
                          state === currentFitness
                            ? "border-[#C4A853] bg-[#C4A853]/30"
                            : "border-[#4a6a4a] hover:border-[#88AA88]"
                        }`}
                        style={{ color: FITNESS_STATES[state].color }}
                      >
                        {FITNESS_STATES[state].emoji}{" "}
                        {FITNESS_STATES[state].displayName}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
}

interface OutcomeButtonProps {
  label: string;
  color: "blue" | "red" | "purple" | "lightblue" | "magenta";
  isExpanded: boolean;
  onClick: () => void;
  disabled?: boolean; // GAP-GT-6-G / GAP-GT-6-C: button availability enforcement
}

function OutcomeButton({
  label,
  color,
  isExpanded,
  onClick,
  disabled,
}: OutcomeButtonProps) {
  const colorClasses = {
    blue: "bg-[#3366FF] border-[#1A44BB] text-white hover:bg-[#4477FF]",
    red: "bg-[#DD0000] border-[#AA0000] text-white hover:bg-[#FF0000]",
    purple: "bg-[#7733DD] border-[#5522AA] text-white hover:bg-[#8844EE]",
    lightblue: "bg-[#5599FF] border-[#3366CC] text-white hover:bg-[#66AAFF]",
    magenta: "bg-[#CC44CC] border-[#992299] text-white hover:bg-[#DD55DD]",
  };

  if (disabled) {
    return (
      <button
        disabled
        className="bg-[#333] border-[#444] text-[#555] border-[5px] py-4 text-base cursor-not-allowed shadow-none opacity-50"
        title={`${label} not available in this situation`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} border-[5px] py-4 text-base active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${isExpanded ? "border-[#FF0000]" : ""}`}
    >
      {label}
    </button>
  );
}

interface OutcomeDetailPanelProps {
  title: string;
  children: React.ReactNode;
}

function OutcomeDetailPanel({ title, children }: OutcomeDetailPanelProps) {
  return (
    <div className="bg-[#3366FF] border-[4px] border-white p-2 mt-1">
      <div className="text-[8px] text-white font-bold mb-1">{title}</div>
      {children}
    </div>
  );
}

interface DetailButtonProps {
  label: string;
  onClick: () => void;
  isSelected?: boolean;
}

function DetailButton({ label, onClick, isSelected }: DetailButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${isSelected ? "bg-[#FFD700] border-[#CC9900] text-black" : "bg-[#5599FF] border-[#3366CC] text-white hover:bg-[#66AAFF]"} border-[5px] py-4 text-base active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]`}
    >
      {label}
    </button>
  );
}
