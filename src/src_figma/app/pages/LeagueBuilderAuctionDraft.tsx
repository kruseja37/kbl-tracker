import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Gavel, RefreshCw, ShieldAlert, UserCheck } from "lucide-react";

import {
  auctionTransitionErrorCopy,
  playerDisplayName,
  teamDisplayName,
  useAuctionDraft,
} from "../hooks/useAuctionDraft";
import {
  type BoardPriorityGap,
  type DraftBoardEntry,
} from "../components/DraftRosterBoard";
import {
  AuctionStage,
  type AdvisorMomentVM,
  type AuctionStageVM,
  type LogItemVM,
  type RosterSlotVM,
} from "../components/auction/AuctionStage";
import {
  PanelWithHeaderStrip,
  PressButton,
} from "../components/ballpark";
import {
  analyzeDraftRoster,
  type DraftAnalyzerMlbEntry,
} from "../../../utils/rosterAnalyzerDraftAdapter";
import {
  sortByTiltedPriority,
  tiltAnalyzerFindings,
} from "../../../engines/farmArchetypeTilt";
import {
  cpuBidOnLot,
  cpuDecideLoneSurvivor,
  selectCpuNomination,
  type CpuBidOnLotDecision,
  type CpuShillAuctionPlayer,
  type CpuLoneSurvivorDecision,
} from "../../../engines/cpuShillBidding";
import { LEAGUE_MINIMUM_SALARY } from "../../../data/rosterEngineConstants";
import { LEGAL_ROSTER, twoWayVariantFromTraits, type RosterSlotPlayer } from "../../../data/rosterConstruction";
import {
  DEFAULT_AUCTION_SETUP_CONFIG,
  scaledShillDefault,
} from "../../../data/auctionEngineConstants";
import { HISTORICAL_ARCHETYPES } from "../../../data/historicalArchetypes";
import {
  buildArchetypeLiftTable,
  buildLotViewFromSession,
  estimateMarket,
  projectBidVsPass,
  type BoardProjection,
  type EstimatedMarket,
  type SessionMarketOptions,
} from "../../../engines/auctionMarketModel";
import {
  auctionMarginalTaxWithCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from "../../../engines/auctionLuxuryTax";
import {
  keepTargetAllIn,
  type KeepTargetAllInResult,
  type KeepTargetPlayer,
  type KeepTargetPoolPlayer,
} from "../../../engines/auctionKeepTargetAllIn";
import { LUXURY_CAP_TABLES } from "../../../data/tierParams";
import { resolveClubBandPriorities } from "../../../engines/archetypeIdentity";
import {
  buildAuctionBoardFrame,
  type AuctionBoardFrame,
  type AuctionBoardRosterEntry,
} from "../../../engines/auctionBoardFrame";
import { buildAuctionExitReport, describeRosterLawGaps } from "../../../engines/auctionExitGate";
import { deriveShillTeamIds } from "../../../engines/cpuTeamRoles";
import { rosterNeedBreakdown, toRosterSlotPlayer, type RosterNeedBreakdown, type RosterPositionMap } from "../../../engines/rosterNeed";
import type { BandPriorities } from "../../../engines/leagueConstruction";
import {
  leagueIdFromSearch,
  reservePriceKFromSearch,
  resolveInitialLeagueId,
  clampDraftShillCount,
  scoutHireRouteForLeague,
  shillCountFromSearch,
} from "../utils/draftRouting";
import { DEFAULT_RESERVE_PRICE_K } from "../../../engines/auctionReservePrice";
import { evaluatePoolDemandSufficiency } from "../../../utils/leagueBuilderPoolBuilder";
import {
  derivePositionSupplyFloorTargets,
  matchesPositionSupplyFloor,
} from "../../../engines/poolFromDemand";
import {
  getTeamAuctionMaxBid,
  lotOpeningAsk,
  type AuctionPlayer,
  type AuctionResult,
  type AuctionResultDisposition,
  type AuctionSession,
} from "../../../engines/auctionStateMachine";
import {
  assembleBoard,
  assembleFiveLights,
  assembleRosterIntelligencePayload,
  assembleWorthToYou,
  sortBoardEntriesForPosition,
  type BoardEntry,
  type FiveLights,
  type Light,
  type MarketRead,
  type RosterIntelligencePayload,
} from "../../../engines/rosterIntelligencePayload";
import { materializeRankOrder } from "../components/shared/RankReorderList";
import type { TaxonomyPosition } from "../../../data/playerArchetypeTaxonomy";
import { saveTeam } from "../../../utils/leagueBuilderStorage";
import type { LiquidityCompletionCandidate } from "../../../engines/liquidityAwareBidding";
import {
  buildDraftRecapAdvisorFacts,
  buildPostLotAdvisorFacts,
  buildPreDraftAdvisorFacts,
  type AdvisorTargetFact,
  type AuctionAdvisorFactPayload,
} from "../../../engines/auctionAdvisorColor";
import { emitAuctionAdvisorMoment } from "../engines/reporter/auctionAdvisorColorEmission";
import { historicalToSimArchetype } from "../../../engines/draftabilityRanker";
import { archetypeFitScorer, type SimArchetype, type SimPlayer } from "../../../engines/archetypeBalanceSimulator";
import {
  toConstructionPlayer,
  type LeagueTemplate,
  type Player,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

type DraftPool = Awaited<ReturnType<UseLeagueBuilderDataReturn["getRegisteredPool"]>>;

interface DisplayBidVsPassTarget {
  playerId: string;
  name: string;
  player: Player | null;
  surplus: number;
  ownValue: number;
  predictedMedian: number;
  affordable: boolean;
  dropsOutAtBidAmount: number | null;
}

interface DisplayKeepTarget {
  playerId: string;
  name: string;
  rank: number;
  verdict: KeepTargetAllInResult["verdict"];
  allIn: number | null;
  shortfall: number | null;
  taxTotal: number | null;
}

interface DisplayBidVsPassNeed {
  minimumAdditions: number;
  deficits: readonly string[];
}

interface DisplayBidVsPassBranch {
  branch: BoardProjection["branch"];
  budgetAfter: number;
  needAfter: DisplayBidVsPassNeed | null;
  targets: readonly DisplayBidVsPassTarget[];
}

interface DisplayBidVsPass {
  bidAmount: number;
  bid: DisplayBidVsPassBranch;
  pass: DisplayBidVsPassBranch;
  keepTargets: readonly DisplayKeepTarget[];
}

const STAKES_BID_DEBOUNCE_MS = 150;

const CPU_BID_OPTIONS = { needAwareCompletion: true } as const;

const DRAFT_BOARD_GAP_KINDS = new Set([
  "position_coverage",
  "lineup",
  "rotation",
  "bullpen",
  "depth_chart",
]);

const HISTORICAL_ARCHETYPE_BY_ID = new Map(HISTORICAL_ARCHETYPES.map((archetype) => [archetype.id, archetype]));

// COCKPIT W1b Tier-2 WAIT/CHASE chip (nominationOdds, auctionMarketModel.ts:613): "within K lots"
// horizon. K=3 per DRAFT_COCKPIT_DESIGN_2026-07-08.md §2 Tier 2 example ("within 3 lots").

const UNKNOWN_SHAPE_LIGHT: Light = {
  status: "unknown",
  sentence: "Shape read needs the full roster.",
  detailKey: "shape",
};

const UNKNOWN_CHEMISTRY_LIGHT: Light = {
  status: "unknown",
  sentence: "Chemistry read needs the full roster.",
  detailKey: "chemistry",
};

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function devSeedFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get("devSeed")?.trim();
  return value || null;
}

function minimumBid(session: AuctionSession): number | null {
  const lot = session.currentLot;
  if (!lot) return null;
  return lot.highBid === null ? lot.openingAsk : lot.highBid + session.config.bidIncrement;
}

function playerPositions(player: Player | null | undefined): string[] {
  return Array.from(new Set([player?.primaryPosition, player?.secondaryPosition].filter(Boolean) as string[]));
}

function positionBadges(player: Player | null | undefined) {
  const positions = playerPositions(player);
  if (positions.length === 0) {
    return <span className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">POS</span>;
  }
  return positions.map((position) => (
    <span key={position} className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">
      {position}
    </span>
  ));
}

function resultText(result: AuctionResult, playerById: Map<string, Player>, teamNameById: (teamId: string | null | undefined) => string): string {
  const playerName = playerDisplayName(playerById.get(result.playerId));
  if (result.disposition === "SOLD") {
    return `${playerName} SOLD to ${teamNameById(result.winnerTeamId)} for ${formatMoney(result.salary)}`;
  }
  if (result.disposition === "SET_ASIDE") return `${playerName} set aside`;
  return `${playerName} PASSED`;
}

function playerPronouns(player: Player | null | undefined): { subject: "he" | "she"; object: "him" | "her"; possessive: "his" | "her" } {
  return player?.gender === "F"
    ? { subject: "she", object: "her", possessive: "her" }
    : { subject: "he", object: "him", possessive: "his" };
}

function readableTrait(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return value
    .toString()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function lotPositions(player: Player | null | undefined): string {
  return playerPositions(player).join(" / ") || "POS";
}

function stagePhaseLabel(state: AuctionSession["state"] | "SETUP"): string {
  if (state === "AUCTION_COMPLETE") return "MLB Draft complete";
  if (state === "OPEN_BIDDING") return "MLB auction";
  if (state === "RESOLVE") return "Reserve decision";
  if (state === "SOLD" || state === "PASSED") return "Lot result";
  if (state === "NOMINATION") return "Next nomination";
  return "MLB draft setup";
}

function stageLotLabel(session: AuctionSession | null): string {
  if (!session) return "No active lot";
  const isResolvedBeat = session.state === "SOLD" || session.state === "PASSED";
  const nextLotNumber = session.results.length + (isResolvedBeat ? 0 : 1);
  const current = Math.min(Math.max(1, nextLotNumber), session.playerOrder.length || Math.max(1, nextLotNumber));
  const total = session.playerOrder.length || session.availablePlayerIds.length || current;
  return `Lot ${current} of ${total}`;
}

function stageRosterLabel(teamState: AuctionSession["teams"][number] | null | undefined): string {
  if (!teamState) return "roster board";
  const filled = LEGAL_ROSTER.size - teamState.rosterSlotsRemaining;
  return `${Math.max(0, filled)} of ${LEGAL_ROSTER.size} rostered`;
}

function buildLawNeedLine(frame: AuctionBoardFrame): ReactNode {
  const need = frame.need;
  if (!need) return <>Roster law read needs player position data.</>;
  const rosterCount = frame.seats.filter((seat) => seat.player).length + frame.overflow.length;
  const lawGaps = describeRosterLawGaps(rosterCount, need);
  if (lawGaps[0]) return <>{lawGaps[0]}</>;
  return <>Legal {LEGAL_ROSTER.size} — roster complete.</>;
}

function displayBidVsPassNeed(
  need: RosterNeedBreakdown | null,
  rosterCount: number,
): DisplayBidVsPassNeed | null {
  if (!need) return null;
  return {
    minimumAdditions: need.minimumAdditions,
    deficits: describeRosterLawGaps(rosterCount, need),
  };
}

function displayBidVsPassBranch(
  branch: BoardProjection,
  baseRosterCount: number,
  playerById: Map<string, Player>,
  boardIndexByPlayerId: ReadonlyMap<string, number>,
  passAffordableByPlayerId: ReadonlyMap<string, boolean>,
  bidAmount: number,
): DisplayBidVsPassBranch {
  const rosterCount = baseRosterCount + (branch.branch === "bid" ? 1 : 0);
  return {
    branch: branch.branch,
    budgetAfter: branch.budgetAfter,
    needAfter: displayBidVsPassNeed(branch.needAfter, rosterCount),
    targets: [...branch.targets]
      .sort((left, right) => (
        (boardIndexByPlayerId.get(left.playerId) ?? Number.MAX_SAFE_INTEGER)
        - (boardIndexByPlayerId.get(right.playerId) ?? Number.MAX_SAFE_INTEGER)
        || left.playerId.localeCompare(right.playerId)
      ))
      .slice(0, 5)
      .map((target) => {
        const player = playerById.get(target.playerId) ?? null;
        return {
          playerId: target.playerId,
          name: player ? playerDisplayName(player) : target.playerId,
          player,
          surplus: target.surplus,
          ownValue: target.ownValue,
          predictedMedian: target.predictedMedian,
          affordable: target.affordable,
          dropsOutAtBidAmount: branch.branch === "bid"
            && passAffordableByPlayerId.get(target.playerId) === true
            && !target.affordable
            ? bidAmount
            : null,
        };
      }),
  };
}

function displayBidVsPassProjection(
  projection: { bid: BoardProjection; pass: BoardProjection },
  bidAmount: number,
  baseRosterCount: number,
  playerById: Map<string, Player>,
  board: readonly BoardEntry[],
  keepTargets: readonly DisplayKeepTarget[],
): DisplayBidVsPass {
  const boardIndexByPlayerId = new Map(board.map((entry, index) => [entry.playerId, index]));
  const passAffordableByPlayerId = new Map(
    projection.pass.targets.map((target) => [target.playerId, target.affordable]),
  );
  return {
    bidAmount,
    bid: displayBidVsPassBranch(
      projection.bid,
      baseRosterCount,
      playerById,
      boardIndexByPlayerId,
      passAffordableByPlayerId,
      bidAmount,
    ),
    pass: displayBidVsPassBranch(
      projection.pass,
      baseRosterCount,
      playerById,
      boardIndexByPlayerId,
      passAffordableByPlayerId,
      bidAmount,
    ),
    keepTargets,
  };
}

function buildStageNeedLine(
  frame: AuctionBoardFrame,
  gaps: readonly BoardPriorityGap[],
  budgetWarning: string | null,
): ReactNode {
  const lawLine = buildLawNeedLine(frame);
  const advisorLine = budgetWarning
    ? budgetWarning
    : gaps.length > 0
      ? <>Priority need: <b>{gaps[0].label}</b></>
      : null;
  return (
    <>
      {lawLine}
      {advisorLine && <><br />{advisorLine}</>}
    </>
  );
}

function buildStageRosterSlots(frame: AuctionBoardFrame, playerById: Map<string, Player>): RosterSlotVM[] {
  return frame.seats.map((seat) => ({
    slotId: seat.slotId,
    pos: seat.label,
    group: seat.group,
    who: seat.player?.name ?? "open",
    chip: seat.player?.chip,
    filled: Boolean(seat.player),
    isGap: seat.isGap,
    gapLabel: seat.gapLabel,
    depthNote: seat.depthNote,
    // WT-D: resolve the won player so the roster board can open their profile popover.
    player: seat.player ? playerById.get(seat.player.playerId) ?? null : null,
  }));
}

function buildStageOverflow(
  frame: AuctionBoardFrame,
  playerById: Map<string, Player>,
): NonNullable<AuctionStageVM["board"]["overflow"]> {
  return frame.overflow.map((entry) => ({
    ...entry,
    player: playerById.get(entry.playerId) ?? null,
  }));
}

function buildStageLog(
  session: AuctionSession | null,
  playerById: Map<string, Player>,
  teamNameById: (teamId: string | null | undefined) => string,
  focusTeamId: string | null | undefined,
): LogItemVM[] {
  if (!session) return [];
  return session.results.slice(-6).reverse().map((result) => {
    const player = playerById.get(result.playerId) ?? null;
    return {
      kind: result.disposition === "PASSED" || result.disposition === "SET_ASIDE"
        ? "gone"
        : result.winnerTeamId === focusTeamId
          ? "won"
          : "rival",
      text: resultText(result, playerById, teamNameById),
      amount: result.salary ?? undefined,
      // CALLFIX Item 3: the 4th popover surface -- namePrefix is the exact leading substring of
      // `text` (resultText always starts with playerDisplayName), so the render wraps just that.
      player,
      ...(player ? { namePrefix: playerDisplayName(player) } : {}),
    };
  });
}

function draftAnalyzerEntryFromPlayer(player: Player, salary: number): DraftAnalyzerMlbEntry {
  return {
    id: player.id,
    name: playerDisplayName(player),
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    bats: player.bats,
    throws: player.throws,
    ratings: {
      power: player.power,
      contact: player.contact,
      speed: player.speed,
      fielding: player.fielding,
      arm: player.arm,
      velocity: player.velocity,
      junk: player.junk,
      accuracy: player.accuracy,
    },
    arsenal: player.arsenal,
    traits: [player.trait1, player.trait2].filter(Boolean) as string[],
    chemistry: player.chemistry,
    personality: player.personality,
    salary,
  };
}

function cpuDecisionSeed(session: AuctionSession, kind: "bid" | "claim", teamId: string): string {
  const lot = session.currentLot;
  return [
    session.config.nominationOrderSeed,
    "preview",
    kind,
    session.results.length,
    teamId,
    lot?.playerId ?? session.pendingClaim?.playerId ?? "no-player",
    lot?.highBid ?? "open",
    lot?.stillIn.join("-") ?? "resolve",
  ].join(":");
}

function cpuPassReason(reason: string): string {
  const labels: Record<string, string> = {
    "already-high-bidder": "already holds the high bid",
    "missing-lot": "there is no active lot",
    "no-interest": "the price is not attractive enough for this club's plan",
    "not-open-bidding": "bidding is not open",
    "over-budget": "the bid would break the team's budget",
    "over-valuation": "the ask is above this team's comfort level",
    "team-full": "the roster has no open slots",
    "team-not-found": "the bidder is missing from the session",
    "team-not-in-lot": "the bidder is already out",
    "unknown-player": "the player record is missing",
    "not-resolve": "this is not a reserve decision",
    "no-pending-claim": "there is no reserve claim",
    "not-this-team": "the reserve claim belongs to another team",
  };
  return labels[reason] ?? reason.replace(/-/g, " ");
}

function buildCpuDecisionVm(input: {
  teamName: string;
  isShill: boolean;
  bidDecision?: CpuBidOnLotDecision;
  claimDecision?: CpuLoneSurvivorDecision;
}): NonNullable<AuctionStageVM["move"]["cpuDecision"]> {
  const roleLabel = input.isShill ? "Market Shill" : "CPU team";
  if (input.bidDecision) {
    const decision = input.bidDecision;
    return decision.kind === "bid"
      ? {
          teamName: input.teamName,
          roleLabel,
          action: `${input.teamName} will bid ${formatMoney(decision.bid)}`,
          reason: `${roleLabel} likes the player and bids.`,
          amount: formatMoney(decision.bid),
        }
      : {
          teamName: input.teamName,
          roleLabel,
          action: `${input.teamName} will pass`,
          reason: `${roleLabel} passes because ${cpuPassReason(decision.reason)}.`,
        };
  }

  const decision = input.claimDecision;
  if (!decision) {
    return {
      teamName: input.teamName,
      roleLabel,
      action: `${input.teamName} is waiting`,
      reason: "No automated decision is pending.",
    };
  }
  return decision.kind === "claim"
    ? {
        teamName: input.teamName,
        roleLabel,
        action: `${input.teamName} will claim at ${formatMoney(decision.price)}`,
        reason: `${roleLabel} likes the player and claims.`,
        amount: formatMoney(decision.price),
      }
    : {
        teamName: input.teamName,
        roleLabel,
        action: `${input.teamName} will let the player go`,
        reason: `${roleLabel} is at its limit and lets it go.`,
      };
}

function bidPresetLabel(amount: number, minBid: number | null, bidIncrement: number): string {
  if (minBid === null || amount <= minBid) return "Min";
  return `+${Math.round((amount - minBid) / bidIncrement)}x`;
}

function lotPublicMarket(market: EstimatedMarket | null): AuctionStageVM["lot"]["publicMarket"] {
  if (!market) return undefined;
  return {
    band: market.band,
    interestedTeams: market.interestedTeams,
    contested: market.contested,
    likelyPass: market.likelyPass,
  };
}

function playerToSimPlayer(player: Player, iv: number): SimPlayer {
  const isPitcher = ["SP", "RP", "CP", "SP/RP", "P"].includes(player.primaryPosition);
  const role = player.primaryPosition === "SP" || player.primaryPosition === "RP" || player.primaryPosition === "CP" || player.primaryPosition === "SP/RP"
    ? player.primaryPosition
    : undefined;
  return {
    id: player.id,
    isPitcher,
    role,
    bat: {
      POW: player.power,
      CON: player.contact,
      SPD: player.speed,
      FLD: player.fielding,
      ARM: player.arm,
    },
    pit: {
      VEL: player.velocity,
      JNK: player.junk,
      ACC: player.accuracy,
    },
    iv,
    salary: iv,
    position: player.primaryPosition,
    secondaryPosition: player.secondaryPosition ?? null,
    twoWayVariant: twoWayVariantFromTraits([player.trait1, player.trait2]),
  };
}

export function resolveAuctionWhisperIdentityArchetype(
  team: Pick<Team, "mlbArchetypeKey">,
): SimArchetype | undefined {
  const historical = team.mlbArchetypeKey ? HISTORICAL_ARCHETYPE_BY_ID.get(team.mlbArchetypeKey) : undefined;
  return historical ? historicalToSimArchetype(historical) : undefined;
}

export function applyAuctionWhisperRosterCleanGates(
  scorecard: FiveLights,
  rosterPlayersClean: boolean,
): FiveLights {
  if (rosterPlayersClean) return scorecard;
  return {
    ...scorecard,
    shape: UNKNOWN_SHAPE_LIGHT,
    chemistry: UNKNOWN_CHEMISTRY_LIGHT,
  };
}

export function buildMarketBandPrioritiesByTeamId(leagueTeams: readonly Team[]): Map<string, BandPriorities> {
  const map = new Map<string, BandPriorities>();
  for (const team of leagueTeams) {
    const priorities = resolveClubBandPriorities(team);
    if (priorities) {
      map.set(team.id, priorities);
    }
  }
  return map;
}

function boardPositionLabel(player: Player | null | undefined): string {
  return playerPositions(player).join("/") || "POS";
}

function isRosterSlotPlayer(shape: RosterSlotPlayer | undefined): shape is RosterSlotPlayer {
  return Boolean(shape);
}

// BOARDFIX2 (Item C): trailing debounce for the live board's boardRankOverrides persistence --
// see pendingBoardRankOverrides below for the full rationale. Mirrors
// LeagueBuilderDraftSetup.tsx's own BOARD_RANK_SAVE_DEBOUNCE_MS constant (kept local rather than
// cross-imported between sibling pages).
const BOARD_RANK_SAVE_DEBOUNCE_MS = 500;

/**
 * COCKPIT WAVE 2 (B3/S3.4 auto-advance): when the MOST RECENTLY resolved lot was a SALE of the
 * GM's OWN explicit #1 at that position, name the promoted next target. SOLD-ONLY GATE (Wave-2
 * audit Note 1, captain-ratified 2026-07-08): only a SOLD disposition permanently removes the
 * player from availablePlayerIds — `finalizePassedLot` (auctionStateMachine.ts:919-953) RECYCLES a
 * first-pass player BACK into availablePlayerIds under reserve pricing (ON by default,
 * MAX_RESERVE_RENOMINATION_PASSES=2), so a PASSED result's player can still be on the board and
 * announcing a "promotion" for him would be false. Scoped deliberately to the GM-ranked case only
 * (the spec's OR clause also allows the engine's own natural top pick when the GM never ranked
 * anyone, but that needs cross-turn history tracking this lane does not build -- see the build
 * report). No new engine math: this is pure selection over the already-ranked board. Extracted as
 * a pure function (no React, no session plumbing) so it is directly unit-testable without driving
 * a full auction through the UI.
 *
 * Line variants (Wave-2 audit Note 5, captain design ruling): when the promoted target IS the
 * player on the block RIGHT NOW (the board includes the current lot), say so — that is the single
 * most valuable state to announce; otherwise the standard "Next up" promotion copy.
 */
export function computeBoardAutoAdvanceLine(input: {
  latestResultPlayerId: string | undefined;
  latestResultDisposition: AuctionResultDisposition | undefined;
  soldPosition: TaxonomyPosition | undefined;
  currentLotPlayerId: string | undefined;
  board: readonly BoardEntry[];
  boardRankOverrides: Team["boardRankOverrides"] | undefined;
  boardMeta: Record<string, { name?: string; positions?: string }>;
}): string | null {
  const {
    latestResultPlayerId,
    latestResultDisposition,
    soldPosition,
    currentLotPlayerId,
    board,
    boardRankOverrides,
    boardMeta,
  } = input;
  if (!latestResultPlayerId || !soldPosition) return null;
  // Audit Note 1: SOLD only. A PASSED lot may have been recycled back onto the board (reserve
  // pricing), and SET_ASIDE is not a competitive departure either — announce neither.
  if (latestResultDisposition !== 'SOLD') return null;
  const positionOverride = boardRankOverrides?.byPosition?.[soldPosition];
  if (!positionOverride?.length) return null;
  // Reconstruct "available immediately before this resolution" = current available + the
  // just-departed player -- the GM's effective current #1 is the first override entry still in
  // that set. If it isn't the player who just left, this departure isn't the GM's own top target
  // leaving (either a lower-ranked name went, or an earlier gap already promoted someone else) --
  // stay quiet (anti-generic law, design §1.8).
  const priorAvailableIds = new Set<string>([...board.map((entry) => entry.playerId), latestResultPlayerId]);
  const gmsEffectiveTopBeforeThisResolution = positionOverride.find((id) => priorAvailableIds.has(id));
  if (gmsEffectiveTopBeforeThisResolution !== latestResultPlayerId) return null;
  // BOARDFIX2 (Item B): `sortBoardEntriesForPosition`'s blend is a worth+rank NUDGE, not a
  // positional override -- it can pick a DIFFERENT "#1" than the one the GM's override (and the
  // materialized board the GM actually sees) literally names. Materialize the same way the
  // rendered board does so the citation always matches what's on screen.
  const promoted = materializeRankOrder(
    sortBoardEntriesForPosition(board, soldPosition, undefined),
    (entry) => entry.playerId,
    positionOverride,
  )[0];
  if (!promoted) return null;
  const rankLabel = positionOverride.indexOf(promoted.playerId) + 1;
  const promotedName = boardMeta[promoted.playerId]?.name ?? promoted.note ?? promoted.playerId;
  // Audit Note 5: the promoted target may be the player being auctioned RIGHT NOW.
  if (promoted.playerId === currentLotPlayerId) {
    return rankLabel > 0
      ? `On the block now: ${promotedName} — your #${rankLabel} at ${soldPosition}.`
      : `On the block now: ${promotedName} at ${soldPosition}.`;
  }
  return rankLabel > 0
    ? `Next up at ${soldPosition}: ${promotedName} — your #${rankLabel}.`
    : `Next up at ${soldPosition}: ${promotedName}.`;
}

/**
 * CALLFIX (2026-07-08) Item 4: after a live rank edit, the board renders instantly from the local
 * `pendingBoardRankOverrides` overlay (see the perf note on `displayedWhisperPayload` below), but
 * BEFORE this fix the auto-advance "Next up" line stayed baked into the heavier `whisperPayload`
 * memo, computed against the PERSISTED `team.boardRankOverrides` -- stale for up to
 * BOARD_RANK_SAVE_DEBOUNCE_MS after the edit. If a lot resolved in that window, the citation could
 * name the pre-edit "#1" even though the board on screen already showed the new order.
 *
 * This recomputes `board` AND `nextUpLine` from the SAME live overlay together, so they can never
 * disagree -- exported standalone (no React) so the recompute itself is directly unit-testable,
 * mirroring computeBoardAutoAdvanceLine's own "pure function, no session plumbing" discipline
 * above. `boardMeta` is intentionally omitted from the computeBoardAutoAdvanceLine call: every
 * BoardEntry.note already carries the same display name boardMeta would have looked up (see
 * assembleBoard's boardCandidates construction in the whisperPayload memo), so the name-lookup
 * fallback chain resolves identically without needing to thread it through here.
 */
export function applyLiveBoardRankOverlay(
  payload: RosterIntelligencePayload,
  overlay: { overrides: NonNullable<Team["boardRankOverrides"]> },
  latestResult: {
    latestResultPlayerId: string | undefined;
    latestResultDisposition: AuctionResultDisposition | undefined;
    soldPosition: TaxonomyPosition | undefined;
    currentLotPlayerId: string | undefined;
  },
): RosterIntelligencePayload & { boardRankOverrides?: Team["boardRankOverrides"] | null; nextUpLine?: string | null } {
  const overrideBoard = materializeRankOrder(
    payload.board ?? [],
    (entry) => entry.playerId,
    overlay.overrides.global,
  );
  const nextUpLine = computeBoardAutoAdvanceLine({
    latestResultPlayerId: latestResult.latestResultPlayerId,
    latestResultDisposition: latestResult.latestResultDisposition,
    soldPosition: latestResult.soldPosition,
    currentLotPlayerId: latestResult.currentLotPlayerId,
    board: overrideBoard,
    boardRankOverrides: overlay.overrides,
    boardMeta: {},
  });
  return Object.assign({}, payload, {
    board: overrideBoard,
    boardRankOverrides: overlay.overrides,
    nextUpLine,
  });
}

export function LeagueBuilderAuctionDraft() {
  const navigate = useNavigate();
  const auction = useAuctionDraft();
  const { leagueData, loadAuction, session } = auction;
  const requestedLeagueId = useMemo(() => leagueIdFromSearch(window.location.search), []);
  const requestedShillCount = useMemo(() => shillCountFromSearch(window.location.search), []);
  const requestedReservePriceK = useMemo(
    () => reservePriceKFromSearch(window.location.search) ?? DEFAULT_RESERVE_PRICE_K,
    [],
  );
  const requestedDevSeed = useMemo(() => devSeedFromSearch(window.location.search), []);
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [cpuAdvancePending, setCpuAdvancePending] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [debouncedContemplatedBid, setDebouncedContemplatedBid] = useState<{
    lotPlayerId: string;
    amount: number;
  } | null>(null);
  const [registeredPool, setRegisteredPool] = useState<DraftPool>(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [nominationPlayerId, setNominationPlayerId] = useState("");
  const [nominationOpen, setNominationOpen] = useState(String(Math.ceil(LEAGUE_MINIMUM_SALARY)));
  const [advisorMomentsBySeat, setAdvisorMomentsBySeat] = useState<Record<string, AdvisorMomentVM[]>>({});
  const loadedKeyRef = useRef<string | null>(null);
  const cpuAdvanceInFlightRef = useRef(false);
  const advisorRequestedKeysRef = useRef(new Set<string>());
  const advisorDraftIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeLeagueId && leagueData.leagues.length > 0) {
      setActiveLeagueId(resolveInitialLeagueId(leagueData.leagues, requestedLeagueId));
    }
  }, [activeLeagueId, leagueData.leagues, requestedLeagueId]);

  useEffect(() => {
    if (!activeLeagueId) return;
    const key = `${activeLeagueId}:1`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    void loadAuction(activeLeagueId);
  }, [activeLeagueId, loadAuction]);

  useEffect(() => {
    if (!activeLeagueId) {
      setRegisteredPool(null);
      setPoolError(null);
      setPoolLoading(false);
      return;
    }

    let cancelled = false;
    setPoolLoading(true);
    setPoolError(null);
    void leagueData.getRegisteredPool(activeLeagueId)
      .then((pool) => {
        if (!cancelled) setRegisteredPool(pool);
      })
      .catch((caught) => {
        if (!cancelled) {
          setRegisteredPool(null);
          setPoolError(caught instanceof Error ? caught.message : "Could not load player pool.");
        }
      })
      .finally(() => {
        if (!cancelled) setPoolLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeLeagueId, leagueData.getRegisteredPool]);

  const activeLeague = useMemo(
    () => leagueData.leagues.find((league) => league.id === activeLeagueId) ?? null,
    [activeLeagueId, leagueData.leagues],
  );

  const leagueTeams = useMemo(() => {
    if (!activeLeague?.teamIds?.length) return [];
    return activeLeague.teamIds
      .map((teamId) => leagueData.teams.find((team) => team.id === teamId))
      .filter((team): team is Team => Boolean(team));
  }, [activeLeague, leagueData.teams]);

  const teamById = useMemo(() => new Map(leagueData.teams.map((team) => [team.id, team])), [leagueData.teams]);
  const playerById = useMemo(() => new Map(leagueData.players.map((player) => [player.id, player])), [leagueData.players]);
  const constructionPlayerById = useMemo(
    () => new Map(leagueData.players.map((player) => [player.id, toConstructionPlayer(player)])),
    [leagueData.players],
  );
  const teamStateById = useMemo(() => new Map(session?.teams.map((team) => [team.teamId, team]) ?? []), [session]);
  const latestResult = session?.results.at(-1) ?? null;
  const shillTeamIdSet = useMemo(() => new Set(auction.shillTeamIds), [auction.shillTeamIds]);
  const marketLiftTable = useMemo(() => buildArchetypeLiftTable(), []);
  const marketBandPrioritiesByTeamId = useMemo(
    () => buildMarketBandPrioritiesByTeamId(leagueTeams),
    [leagueTeams],
  );
  const marketHumanTeamIds = useMemo(
    () => new Set(leagueTeams.filter((team) => team.controlledBy !== "ai").map((team) => team.id)),
    [leagueTeams],
  );
  const humanAdvisorSeats = useMemo(
    () => leagueTeams
      .filter((team) => team.controlledBy !== "ai")
      .map((team) => ({ teamId: team.id, teamName: teamDisplayName(team) })),
    [leagueTeams],
  );
  const advisorDraftId = useMemo(() => {
    if (!session || !activeLeagueId) return null;
    return `${activeLeagueId}:${session.sessionLaunchNonce ?? session.sessionBaseSeed ?? "session"}`;
  }, [activeLeagueId, session]);
  const advisorKnownEntityNames = useMemo(
    () => [
      ...leagueTeams.map((team) => teamDisplayName(team)),
      ...leagueData.players.map((player) => playerDisplayName(player)),
    ],
    [leagueData.players, leagueTeams],
  );
  const advisorTargetsByTeamId = useMemo(() => {
    const map = new Map<string, AdvisorTargetFact[]>();
    for (const team of leagueTeams) {
      const targets = (team.boardRankOverrides?.global ?? [])
        .slice(0, 5)
        .map((playerId, index) => {
          const player = playerById.get(playerId);
          return player
            ? { rank: index + 1, playerId, playerName: playerDisplayName(player) }
            : null;
        })
        .filter((target): target is AdvisorTargetFact => Boolean(target));
      map.set(team.id, targets);
    }
    return map;
  }, [leagueTeams, playerById]);

  const queueAdvisorPayload = useCallback((payload: AuctionAdvisorFactPayload) => {
    if (advisorRequestedKeysRef.current.has(payload.cacheKey)) return;
    advisorRequestedKeysRef.current.add(payload.cacheKey);

    const putMoment = (moment: AdvisorMomentVM) => {
      if (advisorDraftIdRef.current !== payload.draftId) return;
      setAdvisorMomentsBySeat((current) => {
        const existing = current[payload.seatTeamId] ?? [];
        const withoutCurrent = existing.filter((item) => item.key !== moment.key);
        return {
          ...current,
          [payload.seatTeamId]: [...withoutCurrent, moment],
        };
      });
    };

    putMoment({
      key: payload.cacheKey,
      title: payload.title,
      text: payload.fallback,
      source: "template",
    });
    void emitAuctionAdvisorMoment(payload).then((result) => {
      putMoment({
        key: payload.cacheKey,
        title: payload.title,
        text: result.text,
        source: result.source,
      });
    });
  }, []);

  useEffect(() => {
    if (advisorDraftIdRef.current === advisorDraftId) return;
    advisorDraftIdRef.current = advisorDraftId;
    advisorRequestedKeysRef.current.clear();
    setAdvisorMomentsBySeat({});
  }, [advisorDraftId]);
  const teamNameById = useCallback((teamId: string | null | undefined): string => {
    if (!teamId) return "Unknown Team";
    if (shillTeamIdSet.has(teamId)) {
      const index = auction.shillTeamIds.indexOf(teamId);
      return `Market Shill ${index >= 0 ? index + 1 : ""}`.trim();
    }
    return teamDisplayName(teamById.get(teamId));
  }, [auction.shillTeamIds, shillTeamIdSet, teamById]);

  const exitControlledClubs = useMemo(() => {
    if (session?.state !== "AUCTION_COMPLETE") return [];
    const shills = new Set(deriveShillTeamIds(session, leagueTeams));
    return session.teams
      .filter((team) => !shills.has(team.teamId))
      .map((team) => ({
        teamId: team.teamId,
        rosterIds: team.roster.map((assignment) => assignment.playerId),
      }));
  }, [leagueTeams, session]);

  const exitPositionMap = useMemo<RosterPositionMap>(() => {
    const map: Record<string, RosterSlotPlayer> = {};
    for (const club of exitControlledClubs) {
      for (const playerId of club.rosterIds) {
        if (map[playerId]) continue;
        const player = playerById.get(playerId);
        if (!player) continue;
        map[playerId] = toRosterSlotPlayer({
          primaryPosition: player.primaryPosition,
          secondaryPosition: player.secondaryPosition,
          traits: [player.trait1, player.trait2],
        });
      }
    }
    return map;
  }, [exitControlledClubs, playerById]);

  const exitReport = useMemo(() => {
    if (session?.state !== "AUCTION_COMPLETE") return null;
    return buildAuctionExitReport(exitControlledClubs, exitPositionMap);
  }, [exitControlledClubs, exitPositionMap, session?.state]);
  const canProceedToFarm = Boolean(exitReport?.allLegal);

  const focusExitPanel = useCallback(() => {
    const panel = document.querySelector<HTMLElement>('[data-testid="auction-complete-panel"]');
    panel?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    panel?.focus({ preventScroll: true });
  }, []);

  const navigateToScoutReveal = useCallback(() => {
    navigate(
      activeLeague
        ? scoutHireRouteForLeague(activeLeague, {
            shillCount: requestedShillCount,
            reservePriceK: requestedReservePriceK,
          })
        : "/league-builder/scout-hire",
    );
  }, [activeLeague, navigate, requestedReservePriceK, requestedShillCount]);

  const requestFarmDraftExit = useCallback(() => {
    if (canProceedToFarm) {
      navigateToScoutReveal();
      return;
    }
    focusExitPanel();
  }, [canProceedToFarm, focusExitPanel, navigateToScoutReveal]);

  const currentBidder = auction.currentBidderTeamId ? teamById.get(auction.currentBidderTeamId) : null;
  const currentLotPlayer = session?.currentLot ? playerById.get(session.currentLot.playerId) : null;
  const minBid = session ? minimumBid(session) : null;
  const lot = session?.currentLot ?? null;
  const lotAuctionPlayer = lot ? session?.players[lot.playerId] ?? null : null;
  const pendingClaimTeam = session?.pendingClaim ? teamById.get(session.pendingClaim.teamId) : null;
  const currentBidderTeamState = auction.currentBidderTeamId ? teamStateById.get(auction.currentBidderTeamId) : null;
  const currentBidderMaxBid = session && auction.currentBidderTeamId
    ? getTeamAuctionMaxBid(session, auction.currentBidderTeamId)
    : null;
  const currentBidderIsCpu = auction.isCpuTeam(auction.currentBidderTeamId);
  const pendingClaimTeamState = session?.pendingClaim ? teamStateById.get(session.pendingClaim.teamId) ?? null : null;
  const latestWinnerTeamState = session?.state === "SOLD" && latestResult?.disposition === "SOLD" && latestResult.winnerTeamId
    ? teamStateById.get(latestResult.winnerTeamId) ?? null
    : null;
  // PRIVACY (2026-07-09): the private board/advisor lens exists ONLY for the acting human seat.
  // The public roster frame below may still fall back to the latest winner/first human so the
  // table can see who each club has won; private gaps, budget warnings, and analysis never do.
  const activeWhisperSeatTeamId = useMemo(() => {
    if (!session) return null;
    const seatTeamId =
      session.state === "NOMINATION"
        ? auction.currentNominatorTeamId
        : session.state === "OPEN_BIDDING"
        ? auction.currentBidderTeamId
        : session.state === "RESOLVE"
          ? session.pendingClaim?.teamId ?? null
          : null;
    return seatTeamId && !auction.isCpuTeam(seatTeamId) ? seatTeamId : null;
  }, [auction, session]);

  const preDraftAdvisorPayloadByTeamId = useMemo(() => {
    const map = new Map<string, AuctionAdvisorFactPayload>();
    if (!session || !advisorDraftId) return map;
    const poolIds = [...new Set([
      ...session.availablePlayerIds,
      ...(session.currentLot ? [session.currentLot.playerId] : []),
    ])];
    const poolShapes = poolIds
      .map((playerId) => session.players[playerId]?.pos)
      .filter((shape): shape is RosterSlotPlayer => Boolean(shape));
    const floorRows = derivePositionSupplyFloorTargets(leagueTeams.length).map((target) => ({
      position: target.label,
      available: poolShapes.filter((shape) => matchesPositionSupplyFloor(shape, target)).length,
      required: target.needed,
    }));

    for (const seat of humanAdvisorSeats) {
      const team = teamById.get(seat.teamId);
      if (!team) continue;
      const archetype = team.mlbArchetypeKey
        ? HISTORICAL_ARCHETYPE_BY_ID.get(team.mlbArchetypeKey)?.name
        : null;
      map.set(seat.teamId, buildPreDraftAdvisorFacts({
        draftId: advisorDraftId,
        seatTeamId: seat.teamId,
        seatTeamName: seat.teamName,
        identityName: archetype ?? (team.capIdentity ? "Custom club identity" : "Balanced"),
        poolPositionCounts: floorRows.map((row) => ({ position: row.position, count: row.available })),
        topTargets: advisorTargetsByTeamId.get(seat.teamId) ?? [],
        scarcePositions: floorRows.filter((row) => row.available <= row.required),
        knownEntityNames: advisorKnownEntityNames,
      }));
    }
    return map;
  }, [
    advisorDraftId,
    advisorKnownEntityNames,
    advisorTargetsByTeamId,
    humanAdvisorSeats,
    leagueTeams.length,
    session,
    teamById,
  ]);

  useEffect(() => {
    if (!session || !advisorDraftId || session.results.length === 0) return;
    const resultIndex = session.results.length - 1;
    const result = session.results[resultIndex];
    const leftBoard = result.disposition === "SOLD" || !session.availablePlayerIds.includes(result.playerId);
    for (const seat of humanAdvisorSeats) {
      const target = (advisorTargetsByTeamId.get(seat.teamId) ?? [])
        .find((candidate) => candidate.playerId === result.playerId);
      if (!target) continue;
      const payload = buildPostLotAdvisorFacts({
        draftId: advisorDraftId,
        lotId: `${resultIndex}:${result.playerId}`,
        seatTeamId: seat.teamId,
        seatTeamName: seat.teamName,
        target,
        disposition: result.disposition,
        winnerTeamId: result.winnerTeamId,
        winnerTeamName: result.winnerTeamId ? teamNameById(result.winnerTeamId) : null,
        salary: result.salary,
        leftBoard,
        knownEntityNames: advisorKnownEntityNames,
      });
      if (payload) queueAdvisorPayload(payload);
    }
  }, [
    advisorDraftId,
    advisorKnownEntityNames,
    advisorTargetsByTeamId,
    humanAdvisorSeats,
    queueAdvisorPayload,
    session,
    teamNameById,
  ]);

  const handleRevealAdvisorSeat = useCallback((teamId: string) => {
    if (!session || !advisorDraftId) return;
    if (session.state !== "AUCTION_COMPLETE") {
      if (session.results.length === 0) {
        const preDraft = preDraftAdvisorPayloadByTeamId.get(teamId);
        if (preDraft) queueAdvisorPayload(preDraft);
      }
      return;
    }

    const seat = humanAdvisorSeats.find((candidate) => candidate.teamId === teamId);
    const teamState = teamStateById.get(teamId);
    if (!seat || !teamState) return;
    const targets = advisorTargetsByTeamId.get(teamId) ?? [];
    const rosterIds = new Set(teamState.roster.map((assignment) => assignment.playerId));
    const landedTargets = targets.filter((target) => rosterIds.has(target.playerId)).map((target) => target.playerName);
    const lostTargets = targets.filter((target) => !rosterIds.has(target.playerId)).map((target) => target.playerName);
    const spend = teamState.roster.reduce((sum, assignment) => sum + assignment.salary, 0);
    queueAdvisorPayload(buildDraftRecapAdvisorFacts({
      draftId: advisorDraftId,
      seatTeamId: teamId,
      seatTeamName: seat.teamName,
      seatsFilled: teamState.roster.length,
      seatTarget: LEGAL_ROSTER.size,
      spend,
      startingBudget: registeredPool?.tierCap ?? spend + teamState.budgetRemaining + teamState.projectedTax,
      taxBill: teamState.projectedTax,
      landedTargets,
      lostTargets,
      knownEntityNames: advisorKnownEntityNames,
    }));
  }, [
    advisorDraftId,
    advisorKnownEntityNames,
    advisorTargetsByTeamId,
    humanAdvisorSeats,
    preDraftAdvisorPayloadByTeamId,
    queueAdvisorPayload,
    registeredPool?.tierCap,
    session,
    teamStateById,
  ]);
  const privateRosterBoardTeamState = activeWhisperSeatTeamId
    ? teamStateById.get(activeWhisperSeatTeamId) ?? null
    : null;
  const rosterBoardTeamState = useMemo(() => {
    if (currentBidderTeamState) return currentBidderTeamState;
    if (pendingClaimTeamState) return pendingClaimTeamState;
    if (latestWinnerTeamState) return latestWinnerTeamState;
    const humanTeam = leagueData.teams.find((team) => team.controlledBy === "human");
    return humanTeam ? teamStateById.get(humanTeam.id) ?? null : null;
  }, [currentBidderTeamState, latestWinnerTeamState, leagueData.teams, pendingClaimTeamState, teamStateById]);
  const rosterBoardEntries = useMemo<DraftBoardEntry[]>(() => (
    (rosterBoardTeamState?.roster ?? []).map((assignment) => {
      const player = playerById.get(assignment.playerId);
      return {
        id: assignment.playerId,
        name: playerDisplayName(player),
        primaryPosition: player?.primaryPosition ?? "Unknown",
        secondaryPosition: player?.secondaryPosition,
        salary: assignment.salary,
      };
    })
  ), [playerById, rosterBoardTeamState]);
  const rosterBoardFrameInput = useMemo<AuctionBoardRosterEntry[]>(() => (
    (rosterBoardTeamState?.roster ?? []).map((assignment) => {
      const player = playerById.get(assignment.playerId);
      return {
        playerId: assignment.playerId,
        name: playerDisplayName(player),
        salary: assignment.salary,
      };
    })
  ), [playerById, rosterBoardTeamState]);
  const rosterBoardPositionMap = useMemo<RosterPositionMap>(() => {
    const map: Record<string, RosterSlotPlayer> = {};
    for (const assignment of rosterBoardTeamState?.roster ?? []) {
      const player = playerById.get(assignment.playerId);
      if (!player) continue;
      map[assignment.playerId] = toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition,
        traits: [player.trait1, player.trait2],
      });
    }
    return map;
  }, [playerById, rosterBoardTeamState]);
  const rosterBoardFrame = useMemo(
    () => buildAuctionBoardFrame(rosterBoardFrameInput, rosterBoardPositionMap),
    [rosterBoardFrameInput, rosterBoardPositionMap],
  );
  const privateRosterBoardPayroll = useMemo(
    () => (privateRosterBoardTeamState?.roster ?? []).reduce((sum, entry) => sum + entry.salary, 0),
    [privateRosterBoardTeamState],
  );
  const privateRosterBoardWalletCap = useMemo(
    () => privateRosterBoardTeamState
      ? privateRosterBoardTeamState.budgetRemaining + privateRosterBoardPayroll
      : null,
    [privateRosterBoardPayroll, privateRosterBoardTeamState],
  );
  const rosterBoardReport = useMemo(() => {
    if (!session || !privateRosterBoardTeamState) return null;

    const mlbWonPlayers: DraftAnalyzerMlbEntry[] = privateRosterBoardTeamState.roster.map((assignment) => {
      const player = playerById.get(assignment.playerId);
      return player
        ? draftAnalyzerEntryFromPlayer(player, assignment.salary)
        : {
            id: assignment.playerId,
            name: assignment.playerId,
            primaryPosition: "Unknown",
            salary: assignment.salary,
          };
    });

    return analyzeDraftRoster({
      leagueId: activeLeague?.id,
      team: {
        id: privateRosterBoardTeamState.teamId,
        name: teamNameById(privateRosterBoardTeamState.teamId),
      },
      mlbWonPlayers,
      farmWonPlayers: [],
      walletCap: privateRosterBoardWalletCap ?? undefined,
    });
  }, [activeLeague?.id, playerById, privateRosterBoardTeamState, privateRosterBoardWalletCap, session, teamNameById]);
  const rosterBoardPriorityGaps = useMemo<BoardPriorityGap[]>(() => {
    if (!rosterBoardReport) return [];

    const gapFindings = rosterBoardReport.findings.filter((finding) => (
      DRAFT_BOARD_GAP_KINDS.has(finding.kind) && finding.severity !== "info"
    ));

    const focusTeam = privateRosterBoardTeamState ? teamById.get(privateRosterBoardTeamState.teamId) : undefined;
    return sortByTiltedPriority(tiltAnalyzerFindings(gapFindings, focusTeam?.capIdentity))
      .slice(0, 5)
      .map((tilted) => ({
        id: tilted.finding.id,
        severity: tilted.finding.severity,
        label: tilted.finding.title,
      }));
  }, [privateRosterBoardTeamState, rosterBoardReport, teamById]);
  const rosterBoardBudgetWarning = useMemo(() => {
    if (!privateRosterBoardTeamState) return null;
    return privateRosterBoardTeamState.budgetRemaining < privateRosterBoardTeamState.rosterSlotsRemaining * privateRosterBoardTeamState.minSalary
      ? "Filling your remaining slots would exceed your budget"
      : null;
  }, [privateRosterBoardTeamState]);
  // COCKPIT WAVE 2 (B3/Correction 5/7): mirrors the seatTeamId derivation inside whisperPayload
  // below, kept as its own memo so the board-reorder persistence callbacks (and now publicMarket)
  // can resolve "which team's perspective applies" without duplicating the whisperPayload memo
  // itself. Moved above publicMarket (CALLFIX Item 5(d)) so the market read below can consume it.
  const publicMarket = useMemo<EstimatedMarket | null>(() => {
    if (!session) return null;
    const view = buildLotViewFromSession(session, {
      shillTeamIds: shillTeamIdSet,
      // CALLFIX Item 5(d): market single-source. When a human seat is active, this banner now
      // consumes the SAME per-seat market read the whisper payload assembly reuses below (one
      // estimateMarket call feeding both, so the CONTESTED/LIVE/QUIET banner and the whisper's own
      // market-driven reads can never disagree). No active seat keeps the prior neutral
      // (advisedTeamId: null) behavior byte-identical.
      advisedTeamId: activeWhisperSeatTeamId,
      bandPrioritiesByTeamId: marketBandPrioritiesByTeamId,
      humanTeamIds: marketHumanTeamIds,
    });
    return view ? estimateMarket(view, marketLiftTable) : null;
  }, [
    activeWhisperSeatTeamId,
    marketBandPrioritiesByTeamId,
    marketHumanTeamIds,
    marketLiftTable,
    session,
    shillTeamIdSet,
  ]);
  useEffect(() => {
    if (minBid !== null) setBidAmount(String(Math.ceil(minBid)));
  }, [minBid]);

  // STAKES Tier 1: the expensive board re-projection follows settled bid-step intent, not every
  // render. The lot id travels with the value so a next-lot paint can never reuse the prior lot's
  // contemplated amount while this trailing debounce settles.
  useEffect(() => {
    const lotPlayerId = session?.currentLot?.playerId;
    const amount = Number(bidAmount);
    if (!lotPlayerId || !Number.isFinite(amount) || amount < 0) return undefined;
    const timer = window.setTimeout(() => {
      setDebouncedContemplatedBid({ lotPlayerId, amount });
    }, STAKES_BID_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [bidAmount, session?.currentLot?.playerId]);

  const contemplatedBidAmount = session?.currentLot
    ? debouncedContemplatedBid?.lotPlayerId === session.currentLot.playerId
      ? debouncedContemplatedBid.amount
      : session.currentLot.highBid ?? session.currentLot.openingAsk
    : 0;

  const clampBidAmount = (amount: number): number | null => {
    if (minBid === null || currentBidderMaxBid === null || !Number.isFinite(amount)) return null;
    const lower = Math.ceil(minBid);
    const upper = Math.floor(currentBidderMaxBid);
    if (upper < lower) return null;
    return Math.min(Math.max(Math.round(amount), lower), upper);
  };

  // FLOORREFIT Move 1: extended to also resolve during NOMINATION (the team whose turn it is in
  // the nomination rotation) -- previously only OPEN_BIDDING/RESOLVE-claim resolved a team here, so
  // the ON THE CLOCK banner had nobody to name during nomination. teamName/teamPrimary/teamSecondary
  // below already fall back through this same `nowTeam`, so this one change cascades correctly.
  const nominatingTeam = session?.state === "NOMINATION" && auction.currentNominatorTeamId
    ? teamById.get(auction.currentNominatorTeamId) ?? null
    : null;
  const nowTeam =
    session?.state === "OPEN_BIDDING" ? currentBidder :
    session?.state === "RESOLVE" && session.pendingClaim ? pendingClaimTeam :
    session?.state === "NOMINATION" ? nominatingTeam :
    null;
  // FLOORREFIT Move 1: an independently-correct CPU/shill signal for the acting team named by
  // `nowTeam` above -- NOT derived from move.cpuTurnName (the farm floor always leaves that null;
  // see the FLOORREFIT contract's honest finding).
  const nowTeamIsCpu = nowTeam ? auction.isCpuTeam(nowTeam.id) : false;
  const nowTurnKind: "bid" | "nomination" | undefined =
    session?.state === "NOMINATION" ? "nomination" :
    session?.state === "OPEN_BIDDING" || (session?.state === "RESOLVE" && Boolean(session.pendingClaim)) ? "bid" :
    undefined;
  const nowAction =
    session?.state === "NOMINATION" ? "choose a player and opening bid" :
    session?.state === "OPEN_BIDDING" ? "raise or pass" :
    session?.state === "RESOLVE" && session.pendingClaim ? "claim at reserve or pass" :
    (session?.state === "SOLD" || session?.state === "PASSED") ? "confirm next lot" :
    session?.state === "AUCTION_COMPLETE" ? "auction complete" :
    "setup";
  const cpuNominationDecision = useMemo(() => {
    if (!session || session.state !== "NOMINATION" || !auction.currentNominatorTeamId) return null;
    if (!auction.isCpuTeam(auction.currentNominatorTeamId)) return null;
    return selectCpuNomination(
      session,
      auction.currentNominatorTeamId,
      `${session.config.nominationOrderSeed}:nomination:${session.results.length}`,
      { openingCeiling: (playerId) => auction.nominationCeiling(auction.currentNominatorTeamId!, playerId) },
    );
  }, [auction, session]);
  const cpuDecisionVm = useMemo<AuctionStageVM["move"]["cpuDecision"]>(() => {
    if (!session) return null;
    if (session.state === "NOMINATION" && cpuNominationDecision) {
      return {
        teamName: teamNameById(cpuNominationDecision.teamId),
        roleLabel: "CPU team",
        action: `${teamNameById(cpuNominationDecision.teamId)} nominates ${playerDisplayName(playerById.get(cpuNominationDecision.playerId))}`,
        reason: `The club's board value, roster need, and fit point here. The opening bid is committed.`,
        amount: formatMoney(cpuNominationDecision.openingBid),
      };
    }
    if (session.state === "OPEN_BIDDING" && auction.currentBidderTeamId && currentBidderIsCpu) {
      const decision = cpuBidOnLot(
        session,
        auction.currentBidderTeamId,
        cpuDecisionSeed(session, "bid", auction.currentBidderTeamId),
        CPU_BID_OPTIONS,
      );
      return buildCpuDecisionVm({
        teamName: teamNameById(auction.currentBidderTeamId),
        isShill: shillTeamIdSet.has(auction.currentBidderTeamId),
        bidDecision: decision,
      });
    }
    if (session.state === "RESOLVE" && session.pendingClaim && auction.isCpuTeam(session.pendingClaim.teamId)) {
      const decision = cpuDecideLoneSurvivor(
        session,
        session.pendingClaim.teamId,
        cpuDecisionSeed(session, "claim", session.pendingClaim.teamId),
        CPU_BID_OPTIONS,
      );
      return buildCpuDecisionVm({
        teamName: teamNameById(session.pendingClaim.teamId),
        isShill: shillTeamIdSet.has(session.pendingClaim.teamId),
        claimDecision: decision,
      });
    }
    return null;
  }, [auction, cpuNominationDecision, currentBidderIsCpu, playerById, session, shillTeamIdSet, teamNameById]);

  const handoffPrompt = useMemo(() => {
    if (!session) return "Host setup";
    if (session.state === "NOMINATION") {
      if (auction.currentNominatorTeamId && !auction.isCpuTeam(auction.currentNominatorTeamId)) {
        return `Pass device to ${teamNameById(auction.currentNominatorTeamId)}`;
      }
      return "Review CPU nomination";
    }
    if (session.state === "OPEN_BIDDING") {
      if (auction.currentBidderTeamId && !auction.isCpuTeam(auction.currentBidderTeamId)) {
        return `Pass device to ${teamNameById(auction.currentBidderTeamId)}`;
      }
      return "Review CPU decision";
    }
    if (session.state === "RESOLVE" && session.pendingClaim) {
      if (!auction.isCpuTeam(session.pendingClaim.teamId)) return `Pass device to ${teamNameById(session.pendingClaim.teamId)}`;
      return "Review CPU decision";
    }
    if (session.state === "SOLD" || session.state === "PASSED") {
      return "Confirm next lot.";
    }
    if (session.state === "AUCTION_COMPLETE") return "Auction complete.";
    return "Review CPU decision";
  }, [
    auction,
    currentBidder,
    pendingClaimTeam,
    session,
    teamNameById,
  ]);

  const availablePoolCandidates = useMemo(() => {
    if (!session) return [];
    return session.availablePlayerIds
      .map((playerId) => session.players[playerId])
      .filter(Boolean);
  }, [session]);
  const nominationCandidateIds = useMemo(() => {
    if (!session || session.state !== "NOMINATION") return [];
    return [...session.availablePlayerIds].sort((left, right) => {
      const leftPlayer = session.players[left];
      const rightPlayer = session.players[right];
      return (rightPlayer?.iv ?? 0) - (leftPlayer?.iv ?? 0) || left.localeCompare(right);
    });
  }, [session]);

  useEffect(() => {
    if (!session || session.state !== "NOMINATION") return;
    if (cpuNominationDecision) {
      setNominationPlayerId(cpuNominationDecision.playerId);
      setNominationOpen(String(Math.round(cpuNominationDecision.openingBid)));
      return;
    }
    if (!nominationCandidateIds.includes(nominationPlayerId)) {
      setNominationPlayerId(nominationCandidateIds[0] ?? "");
      setNominationOpen(String(Math.ceil(LEAGUE_MINIMUM_SALARY)));
    }
  }, [cpuNominationDecision, nominationCandidateIds, nominationPlayerId, session]);

  // BOARDFIX2 (Item C, perf): reorders on the LIVE board update this local, in-memory overlay
  // INSTANTLY; the actual `saveTeam` write is debounced (trailing, see the effect below) so a
  // burst of rapid moves fires ONE write after the burst settles, not one per click. Each
  // synchronous `saveTeam` + `replaceTeamsLocal` used to reference-invalidate `teamById`, which is
  // a dependency of the entire `whisperPayload` memo below (worth/scorecard/market/chemistry/
  // liquidity engine calls) -- every rank click was recomputing the FULL whisper intelligence
  // payload from scratch. Scoped by team object so switching seats never applies a stale pending
  // write to the wrong team.
  const [pendingBoardRankOverrides, setPendingBoardRankOverrides] = useState<{ team: Team; overrides: NonNullable<Team["boardRankOverrides"]> } | null>(null);

  const flushBoardRankOverrides = useCallback(async (team: Team, boardRankOverrides: NonNullable<Team["boardRankOverrides"]>) => {
    const saved = await saveTeam({ ...team, boardRankOverrides });
    leagueData.replaceTeamsLocal([saved]);
  }, [leagueData]);

  const pendingBoardRankOverridesRef = useRef(pendingBoardRankOverrides);
  useEffect(() => {
    pendingBoardRankOverridesRef.current = pendingBoardRankOverrides;
  });

  // Trailing debounce: only the FINAL state after a burst of rapid moves settles reaches saveTeam.
  useEffect(() => {
    if (!pendingBoardRankOverrides) return undefined;
    const timer = window.setTimeout(() => {
      void flushBoardRankOverrides(pendingBoardRankOverrides.team, pendingBoardRankOverrides.overrides).then(() => {
        setPendingBoardRankOverrides((current) => (current === pendingBoardRankOverrides ? null : current));
      });
    }, BOARD_RANK_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [pendingBoardRankOverrides, flushBoardRankOverrides]);

  // Flush on unmount / tab-hide so a reorder made just before navigating away isn't dropped.
  useEffect(() => {
    const flushOnHide = () => {
      const pending = pendingBoardRankOverridesRef.current;
      if (document.visibilityState === "hidden" && pending) {
        void flushBoardRankOverrides(pending.team, pending.overrides);
        setPendingBoardRankOverrides(null);
      }
    };
    document.addEventListener("visibilitychange", flushOnHide);
    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      const pending = pendingBoardRankOverridesRef.current;
      if (pending) void flushBoardRankOverrides(pending.team, pending.overrides);
    };
  }, [flushBoardRankOverrides]);

  const handleBoardReorderGlobal = useCallback((orderedIds: readonly string[]) => {
    const team = activeWhisperSeatTeamId ? teamById.get(activeWhisperSeatTeamId) : null;
    if (!team) return;
    const current = pendingBoardRankOverridesRef.current?.team.id === team.id
      ? pendingBoardRankOverridesRef.current.overrides
      : team.boardRankOverrides;
    setPendingBoardRankOverrides({ team, overrides: { ...current, global: [...orderedIds] } });
  }, [activeWhisperSeatTeamId, teamById]);

  const handleBoardReorderPosition = useCallback((position: TaxonomyPosition, orderedIds: readonly string[]) => {
    const team = activeWhisperSeatTeamId ? teamById.get(activeWhisperSeatTeamId) : null;
    if (!team) return;
    const current = pendingBoardRankOverridesRef.current?.team.id === team.id
      ? pendingBoardRankOverridesRef.current.overrides
      : team.boardRankOverrides;
    setPendingBoardRankOverrides({
      team,
      overrides: {
        ...current,
        byPosition: { ...current?.byPosition, [position]: [...orderedIds] },
      },
    });
  }, [activeWhisperSeatTeamId, teamById]);

  const whisperPayload = useMemo<RosterIntelligencePayload | null>(() => {
    if (!session || !session.currentLot) return null;

    const seatTeamId =
      session.state === "OPEN_BIDDING"
        ? auction.currentBidderTeamId
        : session.state === "RESOLVE"
          ? session.pendingClaim?.teamId ?? null
          : null;
    if (!seatTeamId || auction.isCpuTeam(seatTeamId)) return null;

    const teamState = teamStateById.get(seatTeamId);
    const team = teamById.get(seatTeamId);
    if (!teamState || !team) return null;

    const lotPlayerId = session.currentLot.playerId;
    const lotAuction = session.players[lotPlayerId];
    const lotArchetypeWeights = (lotAuction as CpuShillAuctionPlayer | undefined)?.archetypeWeights;
    const lotPlayer = playerById.get(lotPlayerId) ?? null;
    const lotShape = lotAuction?.pos;

    const rosterPlayers = teamState.roster
      .map((assignment) => playerById.get(assignment.playerId))
      .filter((player): player is Player => Boolean(player));
    const rosterShapes = teamState.roster
      .map((assignment) => session.players[assignment.playerId]?.pos)
      .filter(isRosterSlotPlayer);
    const rosterShapeClean = rosterShapes.length === teamState.roster.length;
    const rosterPlayersClean = rosterPlayers.length === teamState.roster.length && rosterShapeClean;
    const rosterWithCandidate = lotShape ? [...rosterShapes, lotShape] : rosterShapes;
    const openSlotsAfterWin = Math.max(0, teamState.rosterSlotsRemaining - 1);
    const needBreakdown = rosterShapeClean ? rosterNeedBreakdown(rosterShapes) : null;
    const ownBandPriorities = marketBandPrioritiesByTeamId.get(team.id) ?? null;

    const remainingPool: LiquidityCompletionCandidate[] = [];
    let remainingPoolClean = true;
    for (const playerId of session.availablePlayerIds) {
      const auctionPlayer = session.players[playerId];
      if (!auctionPlayer?.pos) {
        remainingPoolClean = false;
        continue;
      }
      remainingPool.push({
        id: playerId,
        price: lotOpeningAsk(auctionPlayer, session.config),
        value: auctionPlayer.iv,
        shape: auctionPlayer.pos,
      });
    }

    const marketOptions: SessionMarketOptions = {
      shillTeamIds: shillTeamIdSet,
      advisedTeamId: team.id,
      bandPrioritiesByTeamId: marketBandPrioritiesByTeamId,
      humanTeamIds: marketHumanTeamIds,
    };
    // CALLFIX Item 5(d): market single-source. `publicMarket` (above) is already computed with
    // THIS SAME seat as advisedTeamId (team.id === activeWhisperSeatTeamId whenever this memo
    // reaches this point) -- reuse it instead of a second, independent estimateMarket() call that
    // could disagree with the stage's own CONTESTED/LIVE/QUIET banner. marketOptions itself is
    // still needed below for projectBidVsPass, an unrelated engine call.
    const market: MarketRead | undefined = publicMarket && publicMarket.playerId === lotPlayerId
      ? {
          playerId: publicMarket.playerId,
          band: publicMarket.band,
          interestedTeams: publicMarket.interestedTeams,
          contested: publicMarket.contested,
          likelyPass: publicMarket.likelyPass,
        }
      : undefined;

    const identityTier = registeredPool?.tier ?? "standard";

    // TAXTEETH (2026-07-08): TRUE COST's marginal tax, computed BEFORE worthToYou so it can be
    // folded into the whisper's OWN ceiling (see the `marginalTax` field on WorthToYouInput below)
    // -- not just displayed alongside it. Without this, worthToYou.suggestedMaxBid (assembled from
    // capValue/completionBidCeiling, which knows nothing about tax) could show a number the now
    // tax-aware engine ceiling (sessionBidCeiling) would reject -- reproducing the exact
    // whisper-vs-floor disagreement the F9 one-ceiling law exists to prevent. Reuses the existing
    // tested auctionMarginalTaxWithCaps engine; gated on the same roster-clean signal the sibling
    // reads use so a truncated roster mapping never fabricates a tax figure. Reads the pool's own
    // resolved luxuryCaps (falling back to the tier default before a pool is registered), normalized
    // with the same real-club count as settlement before any shifted-cap tax math runs.
    const rawAdvisoryBaseCaps = registeredPool?.luxuryCaps ?? LUXURY_CAP_TABLES[identityTier];
    const normalizedAdvisoryBaseCaps = normalizeAuctionLuxuryCapsForLeagueSize(
      rawAdvisoryBaseCaps,
      leagueTeams.length,
    );
    const marginalTax = lotPlayer && rosterPlayersClean
      ? auctionMarginalTaxWithCaps(
          rosterPlayers.map(toConstructionPlayer),
          toConstructionPlayer(lotPlayer),
          team.capIdentity,
          normalizedAdvisoryBaseCaps,
        )
      : null;
    const completionTaxContext = lotPlayer && rosterPlayersClean
      ? {
          currentRosterWithCandidate: [
            ...rosterPlayers.map(toConstructionPlayer),
            toConstructionPlayer(lotPlayer),
          ],
          playerById: constructionPlayerById,
          capIdentity: team.capIdentity,
          baseCaps: rawAdvisoryBaseCaps,
          realTeamCount: leagueTeams.length,
        }
      : undefined;

    const worthToYou = lotPlayer && lotAuction && lotShape && rosterShapeClean && remainingPoolClean && ownBandPriorities
      ? assembleWorthToYou({
          candidate: lotPlayer,
          iv: lotAuction.iv,
          rosterPlayers,
          budgetRemaining: teamState.budgetRemaining,
          rosterWithCandidate,
          remainingPool,
          openSlotsAfterWin,
          nextBid: minBid,
          currentBid: session.currentLot.highBid,
          bidIncrement: session.config.bidIncrement,
          // CALLFIX Item 1: THE LIVE CALL 'lead' rung -- this seat already holds the current
          // lot's high bid.
          seatIsHighBidder: session.currentLot.highBidder === seatTeamId,
          ownBandPriorities,
          archetypeWeights: lotArchetypeWeights,
          needBreakdown,
          candidateShape: lotShape,
          market,
          // TAXTEETH: fold the marginal tax into the ceiling this feeds (see assembleWorthToYou's
          // fallbackLegalMax); null-coalesced since rosterPlayersClean can gate marginalTax off
          // independently of the sibling worthToYou gates.
          marginalTax: marginalTax ?? undefined,
          completionTaxContext,
        })
      : undefined;
    const bidVsPassProjection = ownBandPriorities
      ? projectBidVsPass({
          session,
          options: marketOptions,
          teamId: team.id,
          bidAmount: contemplatedBidAmount,
          ownBandPriorities,
          // projectBidVsPass already sweeps the whole pool. Keep its complete result long enough
          // for the page to apply the GM's literal board order, then render the same top five.
          topN: session.availablePlayerIds.length,
        })
      : null;

    const boardIds = Array.from(new Set([lotPlayerId, ...session.availablePlayerIds]));
    const comparisonPool = boardIds
      .map((playerId) => {
        const player = playerById.get(playerId);
        const auctionPlayer = session.players[playerId];
        return player && auctionPlayer ? playerToSimPlayer(player, auctionPlayer.iv) : null;
      })
      .filter((player): player is SimPlayer => Boolean(player));
    const identityRoster = teamState.roster
      .map((assignment) => {
        const player = playerById.get(assignment.playerId);
        const auctionPlayer = session.players[assignment.playerId];
        return player && auctionPlayer ? playerToSimPlayer(player, auctionPlayer.iv) : null;
      })
      .filter((player): player is SimPlayer => Boolean(player));
    if (lotPlayer && lotAuction) {
      identityRoster.push(playerToSimPlayer(lotPlayer, lotAuction.iv));
    }
    const identityArchetype = resolveAuctionWhisperIdentityArchetype(team);
    const identityZByPlayerId = identityArchetype && comparisonPool.length > 0
      ? (() => {
          const scorer = archetypeFitScorer(identityArchetype, identityTier);
          const scoredPool = comparisonPool.map((player) => ({ player, score: scorer(player) }));
          const mean = scoredPool.reduce((sum, item) => sum + item.score, 0) / scoredPool.length;
          const variance = scoredPool.reduce((sum, item) => sum + (item.score - mean) ** 2, 0) / scoredPool.length;
          const sigma = Math.sqrt(variance);
          return new Map(scoredPool.map(({ player, score }) => [player.id, sigma > 0 ? (score - mean) / sigma : 0]));
        })()
      : null;

    const boardMeta: Record<string, { name?: string; positions?: string }> = {};
    const boardPlayers: Record<string, Player> = {};
    const boardCandidates = boardIds
      .map((playerId) => {
        const auctionPlayer = session.players[playerId];
        if (!auctionPlayer) return null;
        const player = playerById.get(playerId) ?? null;
        const identityZ = identityZByPlayerId?.get(playerId);
        boardMeta[playerId] = {
          name: player ? playerDisplayName(player) : playerId,
          positions: boardPositionLabel(player),
        };
        if (player) boardPlayers[playerId] = player;
        return {
          playerId,
          iv: auctionPlayer.iv,
          candidate: player ?? undefined,
          matchedShape: boardPositionLabel(player),
          ...(auctionPlayer.pos ? { shape: auctionPlayer.pos } : {}),
          ...(identityZ !== undefined ? { identityZ } : {}),
          note: player ? playerDisplayName(player) : playerId,
        };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
    // BOARDFIX2 (Item B): assembleBoard's own `rankOverrides` param feeds `sortByGmBlend` -- a
    // worth+rank NUDGE, not a positional override (engine math, out of this lane's allowed-edit
    // surface -- see materializeRankOrder's doc comment in RankReorderList.tsx for the full
    // root-cause writeup). Every non-overridden entry's blend bonus is 0 regardless of whether an
    // override is passed here, so calling WITHOUT one yields the same worth-ranked "natural" order
    // for anyone not explicitly ranked -- then materializeRankOrder places the GM's real global
    // override at its literal index on top, so a typed/dragged rank lands exactly where the GM
    // put it (and computeBoardAutoAdvanceLine's citation, below, stays consistent with it).
    const naturalBoard = assembleBoard({
      candidates: boardCandidates,
      rosterPlayers,
      // Gate need on rosterShapeClean like the sibling reads (worthToYou/scorecard/budget): a
      // position-blind roster member truncates rosterShapes, which would fabricate false FILLS/deficit
      // tags. Undefined → boardNeedTag returns null (byte-identical to the no-need board).
      need: needBreakdown ?? undefined,
    });
    const board = materializeRankOrder(naturalBoard, (entry) => entry.playerId, team.boardRankOverrides?.global);

    const keepTargets: DisplayKeepTarget[] = [];
    if (
      bidVsPassProjection
      && lotPlayer
      && lotShape
      && rosterPlayersClean
      && rosterShapeClean
      && remainingPoolClean
    ) {
      const projectedTargetById = new Map(
        [...bidVsPassProjection.pass.targets, ...bidVsPassProjection.bid.targets]
          .map((target) => [target.playerId, target] as const),
      );
      const keepRoster: KeepTargetPlayer[] = teamState.roster.flatMap((assignment) => {
        const player = playerById.get(assignment.playerId);
        const construction = constructionPlayerById.get(assignment.playerId);
        const shape = session.players[assignment.playerId]?.pos;
        return player && construction && shape
          ? [{ id: assignment.playerId, construction, shape }]
          : [];
      });
      const keepPool: KeepTargetPoolPlayer[] = remainingPool.flatMap((candidate) => {
        const construction = constructionPlayerById.get(candidate.id);
        return construction
          ? [{ id: candidate.id, construction, shape: candidate.shape, price: candidate.price }]
          : [];
      });
      const lotConstruction = constructionPlayerById.get(lotPlayerId);
      const inputsClean = keepRoster.length === teamState.roster.length
        && keepPool.length === remainingPool.length
        && Boolean(lotConstruction);

      if (inputsClean && lotConstruction) {
        const lotInput: KeepTargetPlayer = { id: lotPlayerId, construction: lotConstruction, shape: lotShape };
        for (let boardIndex = 0; boardIndex < board.length && keepTargets.length < 3; boardIndex += 1) {
          const entry = board[boardIndex];
          if (entry.playerId === lotPlayerId) continue;
          const projected = projectedTargetById.get(entry.playerId);
          const construction = constructionPlayerById.get(entry.playerId);
          const shape = session.players[entry.playerId]?.pos;
          if (!projected || !construction || !shape) continue;
          const quote = keepTargetAllIn(
            {
              budgetRemaining: teamState.budgetRemaining,
              roster: keepRoster,
              capIdentity: team.capIdentity,
            },
            lotInput,
            contemplatedBidAmount,
            {
              id: entry.playerId,
              construction,
              shape,
              predictedMedian: projected.predictedMedian,
            },
            keepPool,
            rawAdvisoryBaseCaps,
            leagueTeams.length,
          );
          keepTargets.push({
            playerId: entry.playerId,
            name: boardMeta[entry.playerId]?.name ?? entry.note ?? entry.playerId,
            rank: boardIndex + 1,
            verdict: quote.verdict,
            allIn: quote.allIn,
            shortfall: quote.shortfall,
            taxTotal: quote.taxTotal,
          });
        }
      }
    }
    const bidVsPass = bidVsPassProjection
      ? displayBidVsPassProjection(
          bidVsPassProjection,
          contemplatedBidAmount,
          teamState.roster.length,
          playerById,
          board,
          keepTargets,
        )
      : null;

    // COCKPIT WAVE 2 (B3/S3.4 auto-advance): see computeBoardAutoAdvanceLine's doc comment.
    const latestResult = session.results[session.results.length - 1];
    const soldPosition = latestResult
      ? (session.players[latestResult.playerId]?.pos?.position as TaxonomyPosition | undefined)
      : undefined;
    const nextUpLine = computeBoardAutoAdvanceLine({
      latestResultPlayerId: latestResult?.playerId,
      latestResultDisposition: latestResult?.disposition,
      soldPosition,
      currentLotPlayerId: lotPlayerId,
      board,
      boardRankOverrides: team.boardRankOverrides,
      boardMeta,
    });

    const positionMap: Record<string, NonNullable<AuctionPlayer["pos"]>> = {};
    for (const assignment of teamState.roster) {
      const shape = session.players[assignment.playerId]?.pos;
      if (shape) positionMap[assignment.playerId] = shape;
    }
    for (const playerId of boardIds) {
      const shape = session.players[playerId]?.pos;
      if (shape) positionMap[playerId] = shape;
    }

    const scorecard = applyAuctionWhisperRosterCleanGates(assembleFiveLights({
      shapePlayers: rosterWithCandidate,
      chemistryPlayers: lotPlayer ? [...rosterPlayers, lotPlayer] : rosterPlayers,
      shape: lotShape && rosterPlayersClean
        ? {
            rosterIds: teamState.roster.map((assignment) => assignment.playerId),
            candidateId: lotPlayerId,
            positionMap,
          }
        : undefined,
      budget: lotShape && rosterShapeClean && remainingPoolClean
        ? {
            budgetRemaining: teamState.budgetRemaining,
            rosterWithCandidate,
            remainingPool,
            openSlotsAfterWin,
            market,
            // F9 RULING: the budget light must agree with the verdict/room-relation reads, so it
            // is driven by the SAME liquidity-adjusted ceiling (worthToYou.suggestedMaxBid), not
            // a second unreserved completionBidCeiling call. null when worthToYou itself could
            // not be assembled (e.g. missing ownBandPriorities) -- the light renders 'unknown'
            // rather than fabricate a status off the wrong number.
            liquidityMaxBid: worthToYou?.suggestedMaxBid ?? null,
          }
        : undefined,
      identity: identityArchetype && identityRoster.length > 0 && comparisonPool.length > 0
        ? {
            rosterPlayers: identityRoster,
            archetype: identityArchetype,
            tier: identityTier,
            comparisonPool,
          }
        : undefined,
    }), rosterPlayersClean);

    return Object.assign(
      assembleRosterIntelligencePayload({
        seatTeamId,
        generatedAtLotIndex: session.results.length,
        market,
        worthToYou,
        board,
        scorecard,
      }),
      {
        seatClubName: teamDisplayName(team),
        seatPrimary: team.colors.primary,
        currentLotPlayerId: lotPlayerId,
        currentHighBid: session.currentLot.highBid,
        objectPronoun: playerPronouns(lotPlayer).object,
        boardMeta,
        boardPlayers,
        bidVsPass,
        marginalTax,
        // COCKPIT WAVE 2 (B3/Correction 5/7): the live Tier-3 board's GM order + write-back +
        // auto-advance line.
        boardRankOverrides: team.boardRankOverrides ?? null,
        onBoardReorderGlobal: handleBoardReorderGlobal,
        onBoardReorderPosition: handleBoardReorderPosition,
        nextUpLine,
      },
    );
  }, [
    auction,
    handleBoardReorderGlobal,
    handleBoardReorderPosition,
    marketBandPrioritiesByTeamId,
    marketHumanTeamIds,
    constructionPlayerById,
    playerById,
    publicMarket,
    registeredPool?.luxuryCaps,
    registeredPool?.tier,
    contemplatedBidAmount,
    session,
    shillTeamIdSet,
    teamById,
    teamStateById,
  ]);

  // BOARDFIX2 (Item C, perf): a CHEAP overlay -- re-sequencing an already-computed small array,
  // spreading an object -- applied on top of the (heavy, rarely-recomputed) `whisperPayload`
  // above. This is what makes a reorder feel instant: `pendingBoardRankOverrides` changes on every
  // click, but only THIS lightweight memo reruns per click, never the engine calls
  // (worth/scorecard/market/chemistry/liquidity) inside `whisperPayload` itself.
  const displayedWhisperPayload = useMemo<RosterIntelligencePayload | null>(() => {
    if (!whisperPayload) return whisperPayload;
    if (!pendingBoardRankOverrides || pendingBoardRankOverrides.team.id !== whisperPayload.seatTeamId) {
      return whisperPayload;
    }
    // CALLFIX Item 4: recompute the auto-advance line from THIS SAME live overlay -- cheap (pure
    // array lookups over already-computed session/board data, no engine calls), and keeps the
    // "your #N" citation honest even when a sale resolves in the same tick as an unflushed edit.
    const latestResult = session?.results[session.results.length - 1];
    const soldPosition = latestResult && session
      ? (session.players[latestResult.playerId]?.pos?.position as TaxonomyPosition | undefined)
      : undefined;
    return applyLiveBoardRankOverlay(whisperPayload, pendingBoardRankOverrides, {
      latestResultPlayerId: latestResult?.playerId,
      latestResultDisposition: latestResult?.disposition,
      soldPosition,
      currentLotPlayerId: session?.currentLot?.playerId,
    });
  }, [whisperPayload, pendingBoardRankOverrides, session]);

  const bidIncrement = session?.config.bidIncrement ?? DEFAULT_AUCTION_SETUP_CONFIG.bidIncrement;
  const setupShillCount = useMemo(
    () => clampDraftShillCount(requestedShillCount ?? scaledShillDefault(leagueTeams.length)),
    [leagueTeams.length, requestedShillCount],
  );
  const setupPoolRosterShapes = useMemo(() => (
    (registeredPool?.players ?? []).flatMap((poolPlayer) => {
      const player = playerById.get(poolPlayer.id);
      if (!player) return [];
      return [toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition,
        traits: [player.trait1, player.trait2],
      })];
    })
  ), [playerById, registeredPool?.players]);
  // FABLE-C3-FIX-2 F6: the SAME market-clearing check as both Draft Setup screens — teams and
  // shills are separate demand kinds (shills demand their capped WINS, never 22 seats each). All
  // three Start-Draft gates now agree at every shill count.
  const setupPoolSufficiency = useMemo(
    () => evaluatePoolDemandSufficiency(
      registeredPool?.players.length ?? 0,
      leagueTeams.length,
      setupShillCount,
      undefined,
      setupPoolRosterShapes,
    ),
    [leagueTeams.length, registeredPool?.players.length, setupPoolRosterShapes, setupShillCount],
  );
  const setupPoolReady = Boolean(registeredPool?.locked) && setupPoolSufficiency.meetsFloor;

  const blockers = useMemo(() => {
    const messages: string[] = [];
    if (!activeLeagueId) messages.push("Select a league to load the auction draft.");
    if (activeLeague?.draftFormat === "snake") messages.push("This league is configured for a snake draft.");
    if (activeLeagueId && leagueTeams.length === 0) messages.push("Selected league has no teams.");
    if (!session && activeLeagueId && leagueTeams.length > 0) {
      if (poolLoading) {
        messages.push("Loading locked player pool.");
      } else if (poolError) {
        messages.push(poolError);
      } else if (!registeredPool?.locked) {
        messages.push("Lock a sufficient player pool before starting the auction.");
      } else if (!setupPoolSufficiency.meetsFloor) {
        const floor = setupPoolSufficiency.positionFloorReasons[0];
        messages.push(
          floor
            ? `Locked player pool is short on ${floor.label.toLowerCase()} (${floor.available}/${floor.needed}). Re-extract before starting the auction.`
            : `Locked player pool needs ${Math.abs(setupPoolSufficiency.surplus)} more player(s) for ${leagueTeams.length + setupShillCount} drafting teams.`,
        );
      }
    }
    if (session?.state === "NOMINATION" && availablePoolCandidates.length === 0) messages.push("No nominatable players remain.");
    return messages;
  }, [
    activeLeague,
    activeLeagueId,
    availablePoolCandidates.length,
    leagueTeams.length,
    poolError,
    poolLoading,
    registeredPool?.locked,
    session,
    session?.state,
    setupPoolSufficiency.meetsFloor,
    setupPoolSufficiency.surplus,
    setupShillCount,
  ]);

  const beginAuction = () => {
    if (!setupPoolReady || blockers.length > 0) return;
    void auction.initAuction(activeLeagueId, {
      nominationOrderSeed: requestedDevSeed ?? DEFAULT_AUCTION_SETUP_CONFIG.nominationOrderSeed,
      cpuShillCount: setupShillCount,
      reserveFractionK: requestedReservePriceK,
      turnTimerSeconds: null,
      excludeFromLeague: true,
    });
  };

  const stagePendingClaim = session?.pendingClaim ?? null;
  const nominationTeamState = session?.state === "NOMINATION" && auction.currentNominatorTeamId
    ? teamStateById.get(auction.currentNominatorTeamId) ?? null
    : null;
  const selectedNominationPlayer = session?.state === "NOMINATION" && nominationPlayerId
    ? playerById.get(nominationPlayerId) ?? null
    : null;
  const selectedNominationAuctionPlayer = session?.state === "NOMINATION" && nominationPlayerId
    ? session.players[nominationPlayerId] ?? null
    : null;
  const stageFocusTeamState =
    nominationTeamState ??
    currentBidderTeamState ??
    pendingClaimTeamState ??
    latestWinnerTeamState ??
    rosterBoardTeamState;
  const stageFocusTeam = stageFocusTeamState ? teamById.get(stageFocusTeamState.teamId) ?? null : currentBidder ?? pendingClaimTeam;
  const stageFocusTeamName = stageFocusTeamState
    ? teamNameById(stageFocusTeamState.teamId)
    : stageFocusTeam
      ? teamDisplayName(stageFocusTeam)
      : "Roster";
  const stageMaxBid = session && stageFocusTeamState
    ? session.state === "NOMINATION" && nominationPlayerId
      ? auction.nominationCeiling(stageFocusTeamState.teamId, nominationPlayerId)
      : getTeamAuctionMaxBid(session, stageFocusTeamState.teamId)
    : currentBidderMaxBid;
  const actionMinimumBid = session?.state === "NOMINATION" ? Math.ceil(LEAGUE_MINIMUM_SALARY) : minBid;
  const rawStageAmount = session?.state === "NOMINATION" ? Number(nominationOpen) : Number(bidAmount);
  const stageBidAmount = session?.state === "NOMINATION"
    ? Math.max(Math.ceil(LEAGUE_MINIMUM_SALARY), Math.round(rawStageAmount))
    : clampBidAmount(rawStageAmount) ?? minBid ?? session?.pendingClaim?.price ?? 0;
  const stageBidPresets = useMemo(() => {
    if (!session || actionMinimumBid === null) return [];
    const values = [
      actionMinimumBid,
      actionMinimumBid + bidIncrement,
      actionMinimumBid + bidIncrement * 2,
      actionMinimumBid + bidIncrement * 5,
    ];
    return values.map((amount) => ({
      label: session.state === "NOMINATION"
        ? (amount === actionMinimumBid ? "MINIMUM" : formatMoney(amount))
        : bidPresetLabel(amount, actionMinimumBid, bidIncrement),
      amount,
      enabled: stageMaxBid !== null && amount <= stageMaxBid && !auction.isWorking && !nowTeamIsCpu,
      selected: Math.round(rawStageAmount) === amount,
    }));
  }, [actionMinimumBid, auction.isWorking, bidIncrement, nowTeamIsCpu, rawStageAmount, session, stageMaxBid]);
  const stageRosterSlots = useMemo(
    () => buildStageRosterSlots(rosterBoardFrame, playerById),
    [rosterBoardFrame, playerById],
  );
  const stageOverflow = useMemo(
    () => buildStageOverflow(rosterBoardFrame, playerById),
    [rosterBoardFrame, playerById],
  );
  const stageLog = useMemo(
    () => buildStageLog(session, playerById, teamNameById, stageFocusTeamState?.teamId),
    [playerById, session, stageFocusTeamState?.teamId, teamNameById],
  );
  const stageLotPlayer = selectedNominationPlayer ?? currentLotPlayer ?? (latestResult ? playerById.get(latestResult.playerId) ?? null : null);
  const stageLotAuctionPlayer = selectedNominationAuctionPlayer ?? lotAuctionPlayer ?? (latestResult ? session?.players[latestResult.playerId] ?? null : null);
  const stageIsCpuTurn = session?.state === "NOMINATION"
    ? nowTeamIsCpu
    : session?.state === "OPEN_BIDDING"
      ? currentBidderIsCpu
    : session?.state === "RESOLVE" && session.pendingClaim
      ? auction.isCpuTeam(session.pendingClaim.teamId)
      : false;
  const stageCanPrimary =
    Boolean(session) &&
    !auction.isWorking &&
    (
      (session?.state === "OPEN_BIDDING" && Boolean(auction.currentBidderTeamId) && !currentBidderIsCpu && clampBidAmount(stageBidAmount) !== null) ||
      (session?.state === "NOMINATION" && Boolean(auction.currentNominatorTeamId) && !nowTeamIsCpu && Boolean(nominationPlayerId) && stageMaxBid !== null && stageBidAmount >= LEAGUE_MINIMUM_SALARY && stageBidAmount <= stageMaxBid) ||
      (session?.state === "RESOLVE" && (!session.pendingClaim || !auction.isCpuTeam(session.pendingClaim.teamId))) ||
      session?.state === "SOLD" ||
      session?.state === "PASSED" ||
      session?.state === "AUCTION_COMPLETE"
    );
  const stageCanPass =
    Boolean(session) &&
    !auction.isWorking &&
    (
      (session?.state === "OPEN_BIDDING" && Boolean(auction.currentBidderTeamId) && !currentBidderIsCpu) ||
      (session?.state === "RESOLVE" && Boolean(stagePendingClaim) && !auction.isCpuTeam(stagePendingClaim?.teamId))
    );
  const stagePrimaryLabel =
    session?.state === "NOMINATION" ? `NOMINATE · ${formatMoney(stageBidAmount)}` :
    session?.state === "RESOLVE" && stagePendingClaim ? `CLAIM ${formatMoney(stagePendingClaim.price)}` :
    session?.state === "RESOLVE" ? "RESOLVE LOT" :
    session?.state === "SOLD" || session?.state === "PASSED" ? "NEXT LOT" :
    session?.state === "AUCTION_COMPLETE" ? (canProceedToFarm ? "SCOUT REVEAL" : "REVIEW ROSTERS") :
    undefined;
  const stageSecondaryLabel =
    session?.state === "RESOLVE" && stagePendingClaim ? "Pass on reserve" :
    session?.state === "OPEN_BIDDING" ? `Let the bid stand` :
    "No pass";
  const stageCompleteVm = useMemo<AuctionStageVM["complete"]>(() => {
    if (!session || !exitReport) return undefined;
    const order = new Map(session.nominationOrder.map((teamId, index) => [teamId, index]));
    const clubs = exitReport.clubs
      .map((club) => {
        const team = teamById.get(club.teamId);
        return {
          teamId: club.teamId,
          name: teamNameById(club.teamId),
          primary: team?.colors.primary ?? "var(--ballpark-brass)",
          secondary: team?.colors.secondary ?? "var(--ballpark-chalk)",
          countLabel: `${club.rosterCount} of ${club.target}`,
          legal: club.legal,
          blockers: club.blockers,
        };
      })
      .sort((left, right) => {
        if (left.legal !== right.legal) return left.legal ? 1 : -1;
        return (order.get(left.teamId) ?? Number.MAX_SAFE_INTEGER)
          - (order.get(right.teamId) ?? Number.MAX_SAFE_INTEGER);
      });
    return {
      clubs,
      allLegal: exitReport.allLegal,
      blockedCount: exitReport.blockedCount,
      summary: exitReport.allLegal
        ? "Every club fields a legal 22. Scout reveal is next."
        : `${exitReport.blockedCount} of ${exitReport.clubs.length} clubs can't field a legal 22. The auction may not hand off this session.`,
      onProceed: requestFarmDraftExit,
      proceedLabel: "SCOUT REVEAL",
    };
  }, [
    exitReport,
    requestFarmDraftExit,
    session,
    teamById,
    teamNameById,
  ]);
  const auctionStageVm: AuctionStageVM | null = session ? {
    tier: "mlb",
    status: {
      phaseLabel: stagePhaseLabel(session.state),
      lotLabel: stageLotLabel(session),
      rosterLabel: stageRosterLabel(stageFocusTeamState),
      nowText: session.state === "OPEN_BIDDING" && auction.currentBidderTeamId
        ? `${teamNameById(auction.currentBidderTeamId)} — ${nowAction}`
        : session.state === "RESOLVE" && session.pendingClaim
          ? `${teamNameById(session.pendingClaim.teamId)} — ${nowAction}`
          : nowTeam
            ? `${teamDisplayName(nowTeam)} — ${nowAction}`
            : nowAction,
      teamName: session.state === "OPEN_BIDDING" && auction.currentBidderTeamId
        ? teamNameById(auction.currentBidderTeamId)
        : session.state === "RESOLVE" && session.pendingClaim
          ? teamNameById(session.pendingClaim.teamId)
          : nowTeam ? teamDisplayName(nowTeam) : undefined,
      teamId: session.state === "OPEN_BIDDING" && auction.currentBidderTeamId
        ? auction.currentBidderTeamId
        : session.state === "RESOLVE" && session.pendingClaim
          ? session.pendingClaim.teamId
          : nowTeam?.id,
      teamPrimary: nowTeam?.colors.primary ?? (stageFocusTeam?.colors.primary ?? "var(--ballpark-brass)"),
      teamSecondary: nowTeam?.colors.secondary ?? (stageFocusTeam?.colors.secondary ?? "var(--ballpark-chalk)"),
      turnKind: nowTurnKind,
      actingTeamIsCpu: nowTeamIsCpu,
    },
    lot: {
      lotId: session.state === "NOMINATION" ? nominationPlayerId : lot?.playerId ?? latestResult?.playerId ?? null,
      player: stageLotPlayer,
      name: stageLotPlayer
        ? playerDisplayName(stageLotPlayer)
        : session.state === "AUCTION_COMPLETE"
          ? "MLB auction complete"
          : session.state === "NOMINATION"
            ? "Choose the nomination"
            : "Next player",
      positions: lotPositions(stageLotPlayer),
      personality: readableTrait(stageLotPlayer?.personality, "Personality —"),
      chemistry: readableTrait(stageLotPlayer?.chemistry, "Chemistry —"),
      batsThrows: stageLotPlayer ? `${stageLotPlayer.bats}/${stageLotPlayer.throws}` : undefined,
      age: stageLotPlayer?.age,
      objectPronoun: playerPronouns(stageLotPlayer).object,
      publicMarket: publicMarket?.playerId === stageLotAuctionPlayer?.playerId
        ? lotPublicMarket(publicMarket)
        : undefined,
      reserveAsk: session.state === "NOMINATION"
        ? (Number.isFinite(stageBidAmount) ? stageBidAmount : Math.ceil(LEAGUE_MINIMUM_SALARY))
        : lot?.openingAsk ?? stagePendingClaim?.price ?? null,
      reserveLabel: session.state === "NOMINATION"
        ? "YOUR OPEN"
        : session.config.sequentialNomination
          ? "OPEN"
          : undefined,
      highBid: lot?.highBid !== null && lot?.highBid !== undefined
        ? {
            amount: lot.highBid,
            by: lot.highBidder ? teamNameById(lot.highBidder) : "opening",
            isYou: Boolean(lot.highBidder && !auction.isCpuTeam(lot.highBidder)),
            // FLOORREFIT Move 4: holder swatch data -- absent (undefined) when the holder can't be
            // resolved, which renders the name exactly as before, no swatch.
            byTeamPrimary: lot.highBidder ? teamById.get(lot.highBidder)?.colors.primary : undefined,
            byAbbreviation: lot.highBidder ? teamById.get(lot.highBidder)?.abbreviation : undefined,
          }
        : null,
    },
    move: {
      walletLabel: `${stageFocusTeamName} budget`,
      wallet: stageFocusTeamState?.budgetRemaining ?? 0,
      maxBid: stageMaxBid ?? 0,
      slotsLeft: stageFocusTeamState?.rosterSlotsRemaining ?? 0,
      ceilingNote: session.pendingClaim
        ? `${teamNameById(session.pendingClaim.teamId)} can claim at reserve or let the player leave the board.`
        : session.state === "NOMINATION" && stageMaxBid !== null
          ? `Choose anyone still on the board. Your opening bid is live and committed; you can open up to ${formatMoney(stageMaxBid)}.`
        : stageMaxBid !== null && minBid !== null && minBid > stageMaxBid
          ? `Can't afford ${playerPronouns(stageLotPlayer).object} and still fill the roster — ${formatMoney(minBid - stageMaxBid)} short.`
          : stageMaxBid !== null
          ? `You can go to ${formatMoney(stageMaxBid)} and still cover your empty seats.`
          : "Budget read pending.",
      presets: stageBidPresets,
      currentBid: stageBidAmount,
      canBid: stageIsCpuTurn ? Boolean(cpuDecisionVm) && !auction.isWorking && !cpuAdvancePending : stageCanPrimary,
      canPass: stageCanPass,
      primaryLabel: stagePrimaryLabel,
      secondaryLabel: stageSecondaryLabel,
      cpuTurnName: stageIsCpuTurn
        ? (session.state === "NOMINATION" && auction.currentNominatorTeamId
          ? teamNameById(auction.currentNominatorTeamId)
          : session.state === "OPEN_BIDDING" && auction.currentBidderTeamId
          ? teamNameById(auction.currentBidderTeamId)
          : session.pendingClaim
            ? teamNameById(session.pendingClaim.teamId)
            : "CPU")
        : null,
      cpuDecision: cpuDecisionVm,
    },
    board: {
      title: `${stageFocusTeamName} · ${rosterBoardEntries.length} of ${LEGAL_ROSTER.size}`,
      hint: rosterBoardBudgetWarning ? "budget watch" : "gaps glow",
      slots: stageRosterSlots,
      overflow: stageOverflow,
      needLine: buildStageNeedLine(rosterBoardFrame, rosterBoardPriorityGaps, rosterBoardBudgetWarning),
    },
    log: stageLog,
    complete: session.state === "AUCTION_COMPLETE" ? stageCompleteVm : undefined,
    help: (
      <>
        <b>Market band</b> is the public room read. Low / expected / stretch are estimates.
        CONTESTED means multiple clubs can push the room.
      </>
    ),
    overlay: session.state === "SOLD"
      ? "sold"
      : !session.config.sequentialNomination && session.state === "PASSED"
        ? (session.currentLot && session.availablePlayerIds.includes(session.currentLot.playerId) ? "unsold" : "gone")
        : null,
  } : null;

  const handleStagePrimary = () => {
    if (!session) return;
    if (session.state === "NOMINATION" && auction.currentNominatorTeamId && nominationPlayerId) {
      if (!Number.isFinite(stageBidAmount)) return;
      void auction.nominate(auction.currentNominatorTeamId, nominationPlayerId, stageBidAmount);
      return;
    }
    if (session.state === "OPEN_BIDDING" && auction.currentBidderTeamId) {
      const clamped = clampBidAmount(Number(bidAmount)) ?? clampBidAmount(stageBidAmount);
      if (clamped === null) return;
      setBidAmount(String(clamped));
      void auction.bid(auction.currentBidderTeamId, clamped);
      return;
    }
    if (session.state === "RESOLVE") {
      void (session.pendingClaim ? auction.claimAtReserve() : auction.resolve());
      return;
    }
    if (session.state === "SOLD" || session.state === "PASSED") {
      void auction.advance();
      return;
    }
    if (session.state === "AUCTION_COMPLETE") {
      requestFarmDraftExit();
    }
  };

  const handleStageSecondary = () => {
    if (!session) return;
    if (session.state === "NOMINATION") return;
    if (session.state === "OPEN_BIDDING" && auction.currentBidderTeamId) {
      void auction.pass(auction.currentBidderTeamId);
      return;
    }
    if (session.state === "RESOLVE" && session.pendingClaim) {
      void auction.pass(session.pendingClaim.teamId);
    }
  };

  const handleAdvanceCpuDecision = () => {
    if (!session) return;
    if (auction.isWorking || cpuAdvanceInFlightRef.current) return;
    const runCpuAction = (action: Promise<unknown>) => {
      cpuAdvanceInFlightRef.current = true;
      setCpuAdvancePending(true);
      void action.finally(() => {
        cpuAdvanceInFlightRef.current = false;
        setCpuAdvancePending(false);
      });
    };

    if (session.state === "NOMINATION" && cpuNominationDecision) {
      runCpuAction(auction.nominate(
        cpuNominationDecision.teamId,
        cpuNominationDecision.playerId,
        cpuNominationDecision.openingBid,
      ));
      return;
    }

    if (session.state === "OPEN_BIDDING" && auction.currentBidderTeamId && currentBidderIsCpu) {
      const decision = cpuBidOnLot(
        session,
        auction.currentBidderTeamId,
        cpuDecisionSeed(session, "bid", auction.currentBidderTeamId),
        CPU_BID_OPTIONS,
      );
      if (decision.kind === "bid") {
        setBidAmount(String(decision.bid));
        runCpuAction(auction.bid(auction.currentBidderTeamId, decision.bid));
      } else {
        runCpuAction(auction.pass(auction.currentBidderTeamId));
      }
      return;
    }

    if (session.state === "RESOLVE" && session.pendingClaim && auction.isCpuTeam(session.pendingClaim.teamId)) {
      const decision = cpuDecideLoneSurvivor(
        session,
        session.pendingClaim.teamId,
        cpuDecisionSeed(session, "claim", session.pendingClaim.teamId),
        CPU_BID_OPTIONS,
      );
      if (decision.kind === "claim") {
        runCpuAction(auction.claimAtReserve());
      } else {
        runCpuAction(auction.pass(session.pendingClaim.teamId));
      }
    }
  };

  if (leagueData.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ballpark-page-bg)] text-[var(--ballpark-chalk)] p-8 flex items-center justify-center">
        <div className="text-lg">Loading auction draft...</div>
      </div>
    );
  }

  if (leagueData.error) {
    return (
      <div className="min-h-screen bg-[var(--ballpark-page-bg)] text-[var(--ballpark-chalk)] p-8 flex items-center justify-center">
        <div className="text-xl text-red-400">Error: {leagueData.error}</div>
      </div>
    );
  }

  if (auctionStageVm) {
    return (
      <AuctionStage
        vm={auctionStageVm}
        whisperPayload={displayedWhisperPayload}
        activeSeatTeamId={activeWhisperSeatTeamId}
        advisorMomentsBySeat={advisorMomentsBySeat}
        completeAdvisorSeats={session?.state === "AUCTION_COMPLETE" ? humanAdvisorSeats : []}
        onRevealAdvisorSeat={handleRevealAdvisorSeat}
        toolbar={
          <div className="row" style={{ marginBottom: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <button
              type="button"
              className="chip"
              onClick={() => navigate("/league-builder")}
            >
              Back to League Builder
            </button>
            <span className="chip">{handoffPrompt}</span>
            {session?.state === "NOMINATION" && auction.currentNominatorTeamId && !nowTeamIsCpu ? (
              <div className="card" data-testid="auction-nomination-controls" style={{ width: "100%" }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Choose the nomination</div>
                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <label style={{ flex: "1 1 320px" }}>
                    <span className="faint">Player</span>
                    <select
                      aria-label="Nomination player"
                      value={nominationPlayerId}
                      onChange={(event) => {
                        setNominationPlayerId(event.target.value);
                        setNominationOpen(String(Math.ceil(LEAGUE_MINIMUM_SALARY)));
                      }}
                      style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
                    >
                      {nominationCandidateIds.map((playerId) => {
                        const player = playerById.get(playerId);
                        return (
                          <option key={playerId} value={playerId}>
                            {player ? `${playerDisplayName(player)} · ${lotPositions(player)}` : playerId}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  <label style={{ flex: "0 1 220px" }}>
                    <span className="faint">Committed opening bid</span>
                    <input
                      aria-label="Nomination opening bid"
                      type="number"
                      min={Math.ceil(LEAGUE_MINIMUM_SALARY)}
                      step={bidIncrement}
                      value={nominationOpen}
                      onChange={(event) => setNominationOpen(event.target.value)}
                      style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
                    />
                  </label>
                </div>
              </div>
            ) : null}
            {auction.error ? (
              <div className="card" style={{ width: "100%", borderColor: "rgba(255,140,140,0.5)", color: "#FFD7D7" }}>
                {auctionTransitionErrorCopy(auction.error)}
              </div>
            ) : null}
          </div>
        }
        onSelectPreset={(amount) => {
          if (session?.state === "NOMINATION") setNominationOpen(String(amount));
          else setBidAmount(String(amount));
        }}
        onBid={handleStagePrimary}
        onPass={handleStageSecondary}
        onAdvanceCpu={handleAdvanceCpuDecision}
      />
    );
  }

  if (activeLeague?.draftFormat === "snake") {
    return <main className="ballpark-page"><div className="ballpark-panel"><h1 className="ballpark-title">AUCTION ROOM BLOCKED</h1><p>THIS LEAGUE IS CONFIGURED FOR A SNAKE DRAFT.</p></div></main>;
  }

  return (
    <div className="min-h-screen bg-[var(--ballpark-page-bg)] text-[var(--ballpark-chalk)] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              aria-label="Back to League Builder"
              onClick={() => navigate("/league-builder")}
              className="p-3 bg-[var(--ballpark-action-green)] hover:bg-[var(--ballpark-action-green-hover)] border-4 border-[var(--ballpark-chalk)] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <ArrowLeft className="w-6 h-6 text-[var(--ballpark-chalk)]" />
            </button>
            <div className="flex items-center gap-3 bg-[var(--ballpark-action-green-hover)] border-[6px] border-[var(--ballpark-chalk)] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
              <Gavel className="w-6 h-6" style={{ color: "var(--ballpark-warn-border)" }} />
              <h1
                className="text-2xl font-bold text-[var(--ballpark-chalk)] tracking-wider"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                MLB AUCTION DRAFT
              </h1>
            </div>
          </div>
        </div>

        {auction.error && (
          <div className="mb-6 bg-[var(--ballpark-warn-panel)] border-4 border-[var(--ballpark-warn-border)] p-4 text-[var(--ballpark-warn-text)] font-bold">
            {auctionTransitionErrorCopy(auction.error)}
          </div>
        )}

        <div className="mb-6 bg-[var(--ballpark-action-green)] border-[6px] border-[var(--ballpark-brass)] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
          <div className="text-xs text-[var(--ballpark-chalk)]/70 font-bold">HANDOFF</div>
          <div className="text-xl font-bold">
            Now: {session?.state === "OPEN_BIDDING" && auction.currentBidderTeamId ? teamNameById(auction.currentBidderTeamId) : nowTeam ? teamDisplayName(nowTeam) : "Host"} — {nowAction}
          </div>
          <div className="mt-1 text-sm text-[var(--ballpark-chalk)]/85 font-bold">{handoffPrompt}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <PanelWithHeaderStrip title="SETUP">
            <label htmlFor="auction-league" className="block text-xs text-[var(--ballpark-chalk)]/70 mb-1">LEAGUE</label>
            <select
              id="auction-league"
              value={activeLeagueId}
              onChange={(event) => {
                setActiveLeagueId(event.target.value);
                loadedKeyRef.current = null;
              }}
              className="w-full bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)]/30 px-3 py-2 text-[var(--ballpark-chalk)] font-bold focus:border-[var(--ballpark-chalk)]/60 outline-none mb-4"
            >
              {leagueData.leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)]/30 p-3">
                <div className="text-xs text-[var(--ballpark-chalk)]/60">ROOM SETTINGS</div>
                <div className="font-bold">Ready for the selected league</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)]/30 p-3">
                  <div className="text-xs text-[var(--ballpark-chalk)]/60">MARKET SHILLS</div>
                  <div className="font-bold text-xl">{setupShillCount}</div>
                </div>
                <div className="bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)]/30 p-3">
                  <div className="text-xs text-[var(--ballpark-chalk)]/60">BID STEP</div>
                  <div className="font-bold text-xl">{formatMoney(DEFAULT_AUCTION_SETUP_CONFIG.bidIncrement)}</div>
                </div>
              </div>
            </div>

            {!session && (
              <PressButton
                onClick={beginAuction}
                disabled={!activeLeagueId || leagueTeams.length === 0 || !setupPoolReady || blockers.length > 0 || auction.isWorking}
                variant="gold"
                size="lg"
                shadow={4}
                className="mt-5 w-full"
              >
                {auction.isWorking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                <span>{auction.isWorking ? "STARTING" : "BEGIN AUCTION DRAFT"}</span>
              </PressButton>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)]/30 p-3">
                <div className="text-xs text-[var(--ballpark-chalk)]/60">TEAMS</div>
                <div className="font-bold text-xl">{leagueTeams.length}</div>
              </div>
              <div className="bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)]/30 p-3">
                <div className="text-xs text-[var(--ballpark-chalk)]/60">MARKET SHILLS</div>
                <div className="font-bold text-xl">{setupShillCount}</div>
              </div>
            </div>

            {blockers.length ? (
              <div className="mt-5 bg-[var(--ballpark-warn-panel)] border-4 border-[var(--ballpark-warn-border)] p-4">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  BLOCKED
                </div>
                <ul className="space-y-1 text-sm text-[var(--ballpark-warn-text)]">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </PanelWithHeaderStrip>

          <section className="bg-[var(--ballpark-panel)] border-[6px] border-[var(--ballpark-panel-border)] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-bold text-lg">STATE: {session?.state ?? "SETUP"}</h2>
            </div>

            {!session && (
              <div className="bg-[var(--ballpark-action-green)] border-4 border-[var(--ballpark-chalk)]/30 p-4 text-[var(--ballpark-chalk)]/80">
                The room is ready when the locked player pool can support every drafting club.
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
