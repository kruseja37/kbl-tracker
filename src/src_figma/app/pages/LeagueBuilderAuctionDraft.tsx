import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Gavel, RefreshCw, ShieldAlert, UserCheck } from "lucide-react";

import {
  auctionTransitionErrorCopy,
  buildSettleFromShillsInput,
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
  type CpuBidOnLotDecision,
  type CpuShillAuctionPlayer,
  type CpuLoneSurvivorDecision,
} from "../../../engines/cpuShillBidding";
import { reservePriceCurve } from "../../../data/rosterEngineConstants";
import { LEGAL_ROSTER, twoWayVariantFromTraits, type RosterSlotPlayer } from "../../../data/rosterConstruction";
import { DEFAULT_AUCTION_SETUP_CONFIG, scaledShillDefault } from "../../../data/auctionEngineConstants";
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
import { settleFromShills } from "../../../engines/auctionSettleFromShills";
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
  getTeamAuctionMaxBid,
  lotOpeningAsk,
  type AuctionPlayer,
  type AuctionResult,
  type AuctionSession,
} from "../../../engines/auctionStateMachine";
import {
  assembleBoard,
  assembleFiveLights,
  assembleRosterIntelligencePayload,
  assembleWorthToYou,
  marketReadFromEstimate,
  type FiveLights,
  type Light,
  type RosterIntelligencePayload,
} from "../../../engines/rosterIntelligencePayload";
import type { LiquidityCompletionCandidate } from "../../../engines/liquidityAwareBidding";
import { historicalToSimArchetype } from "../../../engines/draftabilityRanker";
import { archetypeFitScorer, type SimArchetype, type SimPlayer } from "../../../engines/archetypeBalanceSimulator";
import type { LeagueTemplate, Player, Team, UseLeagueBuilderDataReturn } from "../../hooks/useLeagueBuilderData";

type DraftPool = Awaited<ReturnType<UseLeagueBuilderDataReturn["getRegisteredPool"]>>;

interface DisplayBidVsPassTarget {
  playerId: string;
  name: string;
  player: Player | null;
  surplus: number;
  ownValue: number;
  predictedMedian: number;
  affordable: boolean;
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
}

const CPU_BID_OPTIONS = { needAwareCompletion: true } as const;

const DRAFT_BOARD_GAP_KINDS = new Set([
  "position_coverage",
  "lineup",
  "rotation",
  "bullpen",
  "depth_chart",
]);

const HISTORICAL_ARCHETYPE_BY_ID = new Map(HISTORICAL_ARCHETYPES.map((archetype) => [archetype.id, archetype]));

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

function reserveAsk(player: AuctionPlayer | null | undefined): number | null {
  if (!player) return null;
  return reservePriceCurve(player.ivPercentile) * player.iv;
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
): DisplayBidVsPassBranch {
  const rosterCount = baseRosterCount + (branch.branch === "bid" ? 1 : 0);
  return {
    branch: branch.branch,
    budgetAfter: branch.budgetAfter,
    needAfter: displayBidVsPassNeed(branch.needAfter, rosterCount),
    targets: branch.targets.map((target) => {
      const player = playerById.get(target.playerId) ?? null;
      return {
        playerId: target.playerId,
        name: player ? playerDisplayName(player) : target.playerId,
        player,
        surplus: target.surplus,
        ownValue: target.ownValue,
        predictedMedian: target.predictedMedian,
        affordable: target.affordable,
      };
    }),
  };
}

function displayBidVsPassProjection(
  projection: { bid: BoardProjection; pass: BoardProjection },
  bidAmount: number,
  baseRosterCount: number,
  playerById: Map<string, Player>,
): DisplayBidVsPass {
  return {
    bidAmount,
    bid: displayBidVsPassBranch(projection.bid, baseRosterCount, playerById),
    pass: displayBidVsPassBranch(projection.pass, baseRosterCount, playerById),
  };
}

function auctionExitRepairGuidance(
  report: ReturnType<typeof buildAuctionExitReport>,
  hasSettleableClub = false,
): string {
  if (report.clubs.some((club) => !club.known)) {
    return "Some player records are missing position data. Check THE POOL in Draft Setup.";
  }
  if (report.clubs.some((club) => !club.legal && club.rosterCount < club.target)) {
    if (hasSettleableClub) {
      return "The pool ran dry before this club reached 22. Settle the empty seats from Market Shills below, or add players in Draft Setup and re-run.";
    }
    return "The pool ran dry before this club reached 22. Add more players in Draft Setup and run the draft again.";
  }
  return "This roster can't take the field as drafted. Re-run the draft — positions now read correctly — or hand off anyway and fix it before the season.";
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
  return session.results.slice(-6).reverse().map((result) => ({
    kind: result.disposition === "PASSED" || result.disposition === "SET_ASIDE"
      ? "gone"
      : result.winnerTeamId === focusTeamId
        ? "won"
        : "rival",
    text: resultText(result, playerById, teamNameById),
    amount: result.salary ?? undefined,
  }));
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
    "no-interest": "the price is not attractive enough for this profile",
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
  const [registeredPool, setRegisteredPool] = useState<DraftPool>(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [exitOverrideArmed, setExitOverrideArmed] = useState(false);
  const [exitOverrideConfirmed, setExitOverrideConfirmed] = useState(false);
  const [settleArmed, setSettleArmed] = useState(false);
  const loadedKeyRef = useRef<string | null>(null);
  const cpuAdvanceInFlightRef = useRef(false);

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
  const settlePreview = useMemo(() => {
    if (session?.state !== "AUCTION_COMPLETE") return null;
    return settleFromShills(buildSettleFromShillsInput({
      session,
      leagueTeams,
      players: leagueData.players,
    }));
  }, [leagueData.players, leagueTeams, session]);
  const settledResultLine = useMemo(() => {
    if (session?.state !== "AUCTION_COMPLETE") return null;
    const count = session.results.filter((result) => result.settled).length;
    if (count === 0) return null;
    return `Settled ${count} seat${count === 1 ? "" : "s"} from Market Shills at league minimum.`;
  }, [session]);

  const canProceedToFarm = Boolean(exitReport && (exitReport.allLegal || exitOverrideConfirmed));

  useEffect(() => {
    if (session?.state !== "AUCTION_COMPLETE") {
      setExitOverrideArmed(false);
      setExitOverrideConfirmed(false);
      setSettleArmed(false);
      return;
    }
    if (exitReport?.allLegal) {
      setExitOverrideArmed(false);
      setExitOverrideConfirmed(false);
      setSettleArmed(false);
    }
  }, [exitReport?.allLegal, session?.state]);

  useEffect(() => {
    if (!exitOverrideArmed) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-auction-exit-override]")) return;
      setExitOverrideArmed(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [exitOverrideArmed]);

  useEffect(() => {
    if (!settleArmed) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-auction-settle]")) return;
      setSettleArmed(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [settleArmed]);

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
  const rosterBoardPayroll = useMemo(
    () => rosterBoardEntries.reduce((sum, entry) => sum + entry.salary, 0),
    [rosterBoardEntries],
  );
  const rosterBoardWalletCap = useMemo(
    () => rosterBoardTeamState ? rosterBoardTeamState.budgetRemaining + rosterBoardPayroll : null,
    [rosterBoardPayroll, rosterBoardTeamState],
  );
  const rosterBoardReport = useMemo(() => {
    if (!session || !rosterBoardTeamState) return null;

    const mlbWonPlayers: DraftAnalyzerMlbEntry[] = rosterBoardTeamState.roster.map((assignment) => {
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
        id: rosterBoardTeamState.teamId,
        name: teamNameById(rosterBoardTeamState.teamId),
      },
      mlbWonPlayers,
      farmWonPlayers: [],
      walletCap: rosterBoardWalletCap ?? undefined,
    });
  }, [activeLeague?.id, playerById, rosterBoardTeamState, rosterBoardWalletCap, session, teamNameById]);
  const rosterBoardPriorityGaps = useMemo<BoardPriorityGap[]>(() => {
    if (!rosterBoardReport) return [];

    const gapFindings = rosterBoardReport.findings.filter((finding) => (
      DRAFT_BOARD_GAP_KINDS.has(finding.kind) && finding.severity !== "info"
    ));

    const focusTeam = rosterBoardTeamState ? teamById.get(rosterBoardTeamState.teamId) : undefined;
    return sortByTiltedPriority(tiltAnalyzerFindings(gapFindings, focusTeam?.capIdentity))
      .slice(0, 5)
      .map((tilted) => ({
        id: tilted.finding.id,
        severity: tilted.finding.severity,
        label: tilted.finding.title,
      }));
  }, [rosterBoardReport, rosterBoardTeamState, teamById]);
  const rosterBoardBudgetWarning = useMemo(() => {
    if (!rosterBoardTeamState) return null;
    return rosterBoardTeamState.budgetRemaining < rosterBoardTeamState.rosterSlotsRemaining * rosterBoardTeamState.minSalary
      ? "Filling your remaining slots would exceed your budget"
      : null;
  }, [rosterBoardTeamState]);
  const publicMarket = useMemo<EstimatedMarket | null>(() => {
    if (!session) return null;
    const view = buildLotViewFromSession(session, {
      shillTeamIds: shillTeamIdSet,
      advisedTeamId: null,
      bandPrioritiesByTeamId: marketBandPrioritiesByTeamId,
      humanTeamIds: marketHumanTeamIds,
    });
    return view ? estimateMarket(view, marketLiftTable) : null;
  }, [
    marketBandPrioritiesByTeamId,
    marketHumanTeamIds,
    marketLiftTable,
    session,
    shillTeamIdSet,
  ]);
  useEffect(() => {
    if (minBid !== null) setBidAmount(String(Math.ceil(minBid)));
  }, [minBid]);

  const clampBidAmount = (amount: number): number | null => {
    if (minBid === null || currentBidderMaxBid === null || !Number.isFinite(amount)) return null;
    const lower = Math.ceil(minBid);
    const upper = Math.floor(currentBidderMaxBid);
    if (upper < lower) return null;
    return Math.min(Math.max(Math.round(amount), lower), upper);
  };

  const nowTeam =
    session?.state === "OPEN_BIDDING" ? currentBidder :
    session?.state === "RESOLVE" && session.pendingClaim ? pendingClaimTeam :
    null;
  const nowAction =
    session?.state === "NOMINATION" ? "surface next lot" :
    session?.state === "OPEN_BIDDING" ? "raise or pass" :
    session?.state === "RESOLVE" && session.pendingClaim ? "claim at reserve or pass" :
    (session?.state === "SOLD" || session?.state === "PASSED") ? "confirm next lot" :
    session?.state === "AUCTION_COMPLETE" ? "auction complete" :
    "setup";
  const cpuDecisionVm = useMemo<AuctionStageVM["move"]["cpuDecision"]>(() => {
    if (!session) return null;
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
  }, [auction, currentBidderIsCpu, session, shillTeamIdSet, teamNameById]);

  const handoffPrompt = useMemo(() => {
    if (!session) return "Host setup";
    if (session.state === "NOMINATION") {
      return "Hold — up next.";
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
  ]);

  const availablePoolCandidates = useMemo(() => {
    if (!session) return [];
    return session.availablePlayerIds
      .map((playerId) => session.players[playerId])
      .filter(Boolean);
  }, [session]);
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
    const marketView = buildLotViewFromSession(session, marketOptions);
    const market = marketView ? marketReadFromEstimate(marketView, marketLiftTable) : undefined;

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
          ownBandPriorities,
          archetypeWeights: lotArchetypeWeights,
          needBreakdown,
          candidateShape: lotShape,
          market,
        })
      : undefined;
    const bidAmount = session.currentLot.highBid ?? session.currentLot.openingAsk;
    const bidVsPass = ownBandPriorities
      ? (() => {
          const projection = projectBidVsPass({
            session,
            options: marketOptions,
            teamId: team.id,
            bidAmount,
            ownBandPriorities,
            topN: 5,
          });
          return projection
            ? displayBidVsPassProjection(projection, bidAmount, teamState.roster.length, playerById)
            : null;
        })()
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
    const identityTier = registeredPool?.tier ?? "standard";
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
    const board = assembleBoard({
      candidates: boardCandidates,
      rosterPlayers,
      // Gate need on rosterShapeClean like the sibling reads (worthToYou/scorecard/budget): a
      // position-blind roster member truncates rosterShapes, which would fabricate false FILLS/deficit
      // tags. Undefined → boardNeedTag returns null (byte-identical to the no-need board).
      need: needBreakdown ?? undefined,
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
      },
    );
  }, [
    auction,
    marketBandPrioritiesByTeamId,
    marketHumanTeamIds,
    marketLiftTable,
    playerById,
    registeredPool?.tier,
    session,
    shillTeamIdSet,
    teamById,
    teamStateById,
  ]);
  const bidIncrement = session?.config.bidIncrement ?? DEFAULT_AUCTION_SETUP_CONFIG.bidIncrement;
  const setupShillCount = useMemo(
    () => clampDraftShillCount(requestedShillCount ?? scaledShillDefault(leagueTeams.length)),
    [leagueTeams.length, requestedShillCount],
  );
  // FABLE-C3-FIX-2 F6: the SAME market-clearing check as both Draft Setup screens — teams and
  // shills are separate demand kinds (shills demand their capped WINS, never 22 seats each). All
  // three Start-Draft gates now agree at every shill count.
  const setupPoolSufficiency = useMemo(
    () => evaluatePoolDemandSufficiency(registeredPool?.players.length ?? 0, leagueTeams.length, setupShillCount),
    [leagueTeams.length, registeredPool?.players.length, setupShillCount],
  );
  const setupPoolReady = Boolean(registeredPool?.locked) && setupPoolSufficiency.meetsFloor;

  const blockers = useMemo(() => {
    const messages: string[] = [];
    if (!activeLeagueId) messages.push("Select a league to load the auction draft.");
    if (activeLeagueId && leagueTeams.length === 0) messages.push("Selected league has no teams.");
    if (!session && activeLeagueId && leagueTeams.length > 0) {
      if (poolLoading) {
        messages.push("Loading locked player pool.");
      } else if (poolError) {
        messages.push(poolError);
      } else if (!registeredPool?.locked) {
        messages.push("Lock a sufficient player pool before starting the auction.");
      } else if (!setupPoolSufficiency.meetsFloor) {
        messages.push(`Locked player pool needs ${Math.abs(setupPoolSufficiency.surplus)} more player(s) for ${leagueTeams.length + setupShillCount} drafting teams.`);
      }
    }
    if (session?.state === "NOMINATION" && availablePoolCandidates.length === 0) messages.push("No nominatable players remain.");
    return messages;
  }, [
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
  const stageFocusTeamState =
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
    ? getTeamAuctionMaxBid(session, stageFocusTeamState.teamId)
    : currentBidderMaxBid;
  const stageBidAmount = clampBidAmount(Number(bidAmount)) ?? minBid ?? session?.pendingClaim?.price ?? 0;
  const stageBidPresets = useMemo(() => {
    if (!session || minBid === null) return [];
    const values = [minBid, minBid + bidIncrement, minBid + bidIncrement * 2, minBid + bidIncrement * 5];
    return values.map((amount) => ({
      label: bidPresetLabel(amount, minBid, bidIncrement),
      amount,
      enabled: stageMaxBid !== null && amount <= stageMaxBid && !auction.isWorking && !currentBidderIsCpu,
      selected: clampBidAmount(Number(bidAmount)) === amount,
    }));
  }, [auction.isWorking, bidAmount, bidIncrement, clampBidAmount, currentBidderIsCpu, minBid, session, stageMaxBid]);
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
  const stageLotPlayer = currentLotPlayer ?? (latestResult ? playerById.get(latestResult.playerId) ?? null : null);
  const stageLotAuctionPlayer = lotAuctionPlayer ?? (latestResult ? session?.players[latestResult.playerId] ?? null : null);
  const stageIsCpuTurn = session?.state === "OPEN_BIDDING"
    ? currentBidderIsCpu
    : session?.state === "RESOLVE" && session.pendingClaim
      ? auction.isCpuTeam(session.pendingClaim.teamId)
      : false;
  const stageCanPrimary =
    Boolean(session) &&
    !auction.isWorking &&
    (
      (session?.state === "OPEN_BIDDING" && Boolean(auction.currentBidderTeamId) && !currentBidderIsCpu && clampBidAmount(stageBidAmount) !== null) ||
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
    session?.state === "RESOLVE" && stagePendingClaim ? `CLAIM ${formatMoney(stagePendingClaim.price)}` :
    session?.state === "RESOLVE" ? "RESOLVE LOT" :
    session?.state === "SOLD" || session?.state === "PASSED" ? "NEXT LOT" :
    session?.state === "AUCTION_COMPLETE" ? (canProceedToFarm ? "SCOUT REVEAL" : "REVIEW ROSTERS") :
    undefined;
  const stageSecondaryLabel =
    session?.state === "RESOLVE" && stagePendingClaim ? "Pass on reserve" :
    session?.state === "OPEN_BIDDING" ? `Let ${playerPronouns(stageLotPlayer).object} go` :
    "No pass";
  const stageCompleteVm = useMemo<AuctionStageVM["complete"]>(() => {
    if (!session || !exitReport) return undefined;
    const order = new Map(session.nominationOrder.map((teamId, index) => [teamId, index]));
    const settledOutcomes = settlePreview?.outcomes.filter((outcome) => outcome.status === "settled") ?? [];
    const settleSeatTotal = settledOutcomes.reduce((sum, outcome) => sum + outcome.seatsFilled, 0);
    const unsettledShort = (settlePreview?.outcomes ?? []).find((outcome) => {
      if (outcome.status === "settled" || outcome.status === "already-complete") return false;
      const verdict = exitReport.clubs.find((club) => club.teamId === outcome.teamId);
      return Boolean(verdict && !verdict.legal && verdict.rosterCount < verdict.target);
    });
    const settlePartialLine = unsettledShort
      ? `${teamNameById(unsettledShort.teamId)} still can't reach a legal 22 from what's left — settle the rest, then use the override or re-run.`
      : undefined;
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
        : `${exitReport.blockedCount} of ${exitReport.clubs.length} clubs can't field a legal 22. ${auctionExitRepairGuidance(exitReport, settleSeatTotal > 0)}`,
      onProceed: requestFarmDraftExit,
      proceedLabel: "SCOUT REVEAL",
      overrideArmed: exitOverrideArmed,
      onArmOverride: () => setExitOverrideArmed(true),
      onConfirmOverride: () => {
        setExitOverrideConfirmed(true);
        navigateToScoutReveal();
      },
      onStayOverride: () => setExitOverrideArmed(false),
      settle: {
        seatTotal: settleSeatTotal,
        perClubLabel: settledOutcomes
          .map((outcome) => `${teamNameById(outcome.teamId)} ${outcome.seatsFilled} seat${outcome.seatsFilled === 1 ? "" : "s"}`)
          .join(" · "),
        partial: Boolean(unsettledShort),
        partialLine: settlePartialLine,
        armed: settleArmed,
        busy: auction.isWorking,
        onArm: () => setSettleArmed(true),
        onConfirm: () => {
          setSettleArmed(false);
          void auction.settleShortClubs();
        },
        onStay: () => setSettleArmed(false),
        resultLine: settledResultLine,
      },
    };
  }, [
    auction,
    exitOverrideArmed,
    exitReport,
    navigateToScoutReveal,
    requestFarmDraftExit,
    settleArmed,
    settledResultLine,
    settlePreview,
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
      teamPrimary: nowTeam?.colors.primary ?? (stageFocusTeam?.colors.primary ?? "#C4A853"),
      teamSecondary: nowTeam?.colors.secondary ?? (stageFocusTeam?.colors.secondary ?? "#E8E8D8"),
    },
    lot: {
      player: stageLotPlayer,
      name: stageLotPlayer ? playerDisplayName(stageLotPlayer) : session.state === "AUCTION_COMPLETE" ? "MLB auction complete" : "Next player surfacing",
      positions: lotPositions(stageLotPlayer),
      personality: readableTrait(stageLotPlayer?.personality, "Personality —"),
      chemistry: readableTrait(stageLotPlayer?.chemistry, "Chemistry —"),
      batsThrows: stageLotPlayer ? `${stageLotPlayer.bats}/${stageLotPlayer.throws}` : undefined,
      age: stageLotPlayer?.age,
      objectPronoun: playerPronouns(stageLotPlayer).object,
      publicMarket: publicMarket?.playerId === stageLotAuctionPlayer?.playerId
        ? lotPublicMarket(publicMarket)
        : undefined,
      reserveAsk: lot?.openingAsk ?? stagePendingClaim?.price ?? null,
      highBid: lot?.highBid !== null && lot?.highBid !== undefined
        ? {
            amount: lot.highBid,
            by: lot.highBidder ? teamNameById(lot.highBidder) : "opening",
            isYou: Boolean(lot.highBidder && !auction.isCpuTeam(lot.highBidder)),
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
        : stageMaxBid !== null && minBid !== null && minBid > stageMaxBid
          ? `Can't afford ${playerPronouns(stageLotPlayer).object} and still fill the roster - ${formatMoney(minBid - stageMaxBid)} short.`
          : stageMaxBid !== null
          ? `Room up to ${formatMoney(stageMaxBid)} while keeping money for the empty slots.`
          : "Budget read pending.",
      presets: stageBidPresets,
      currentBid: stageBidAmount,
      canBid: stageIsCpuTurn ? Boolean(cpuDecisionVm) && !auction.isWorking && !cpuAdvancePending : stageCanPrimary,
      canPass: stageCanPass,
      primaryLabel: stagePrimaryLabel,
      secondaryLabel: stageSecondaryLabel,
      cpuTurnName: stageIsCpuTurn
        ? (session.state === "OPEN_BIDDING" && auction.currentBidderTeamId
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
    // TRUTH-1 (JK ruling 2026-07-08): since the reserve-price feature (2026-07-07), a PASSED lot
    // with reserve pricing enabled is recycled back into availablePlayerIds for exactly one more
    // pass (finalizePassedLot, auctionStateMachine.ts) at the same price -- "gone for good" is a
    // lie on that first pass. availablePlayerIds.includes(...) IS the engine's own recycled/
    // permanent predicate (see isActivePassedResult), so reading it here can't drift from the
    // engine's actual behavior.
    overlay: session.state === "SOLD"
      ? "sold"
      : session.state === "PASSED"
        ? (session.currentLot && session.availablePlayerIds.includes(session.currentLot.playerId) ? "unsold" : "gone")
        : null,
  } : null;

  const handleStagePrimary = () => {
    if (!session) return;
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
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-lg">Loading auction draft...</div>
      </div>
    );
  }

  if (leagueData.error) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-xl text-red-400">Error: {leagueData.error}</div>
      </div>
    );
  }

  if (auctionStageVm) {
    return (
      <AuctionStage
        vm={auctionStageVm}
        whisperPayload={whisperPayload}
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
            {auction.error ? (
              <div className="card" style={{ width: "100%", borderColor: "rgba(255,140,140,0.5)", color: "#FFD7D7" }}>
                {auctionTransitionErrorCopy(auction.error)}
              </div>
            ) : null}
          </div>
        }
        onSelectPreset={(amount) => setBidAmount(String(amount))}
        onBid={handleStagePrimary}
        onPass={handleStageSecondary}
        onAdvanceCpu={handleAdvanceCpuDecision}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              aria-label="Back to League Builder"
              onClick={() => navigate("/league-builder")}
              className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              <ArrowLeft className="w-6 h-6 text-[#E8E8D8]" />
            </button>
            <div className="flex items-center gap-3 bg-[#5A8352] border-[6px] border-[#E8E8D8] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
              <Gavel className="w-6 h-6" style={{ color: "#FFD27A" }} />
              <h1
                className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
              >
                MLB AUCTION DRAFT
              </h1>
            </div>
          </div>
        </div>

        {auction.error && (
          <div className="mb-6 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4 text-[#FFE8B0] font-bold">
            {auctionTransitionErrorCopy(auction.error)}
          </div>
        )}

        <div className="mb-6 bg-[#3B7DD8] border-[6px] border-[#E8E8D8] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
          <div className="text-xs text-[#E8E8D8]/70 font-bold">HANDOFF</div>
          <div className="text-xl font-bold">
            Now: {session?.state === "OPEN_BIDDING" && auction.currentBidderTeamId ? teamNameById(auction.currentBidderTeamId) : nowTeam ? teamDisplayName(nowTeam) : "Host"} — {nowAction}
          </div>
          <div className="mt-1 text-sm text-[#E8E8D8]/85 font-bold">{handoffPrompt}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <PanelWithHeaderStrip title="SETUP">
            <label htmlFor="auction-league" className="block text-xs text-[#E8E8D8]/70 mb-1">LEAGUE</label>
            <select
              id="auction-league"
              value={activeLeagueId}
              onChange={(event) => {
                setActiveLeagueId(event.target.value);
                loadedKeyRef.current = null;
              }}
              className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none mb-4"
            >
              {leagueData.leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">ROOM SETTINGS</div>
                <div className="font-bold">Ready for the selected league</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                  <div className="text-xs text-[#E8E8D8]/60">MARKET SHILLS</div>
                  <div className="font-bold text-xl">{setupShillCount}</div>
                </div>
                <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                  <div className="text-xs text-[#E8E8D8]/60">BID STEP</div>
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
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">TEAMS</div>
                <div className="font-bold text-xl">{leagueTeams.length}</div>
              </div>
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">MARKET SHILLS</div>
                <div className="font-bold text-xl">{setupShillCount}</div>
              </div>
            </div>

            {blockers.length ? (
              <div className="mt-5 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  BLOCKED
                </div>
                <ul className="space-y-1 text-sm text-[#FFE8B0]">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </PanelWithHeaderStrip>

          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-bold text-lg">STATE: {session?.state ?? "SETUP"}</h2>
            </div>

            {!session && (
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4 text-[#E8E8D8]/80">
                The room is ready when the locked player pool can support every drafting club.
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
