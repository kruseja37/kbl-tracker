import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Gavel, RefreshCw, ShieldAlert, UserCheck } from "lucide-react";

import {
  playerDisplayName,
  teamDisplayName,
  useAuctionDraft,
} from "../hooks/useAuctionDraft";
import {
  DraftRosterBoard,
  MLB_BOARD_TARGET,
  MLB_BOARD_SLOTS,
  type BoardPriorityGap,
  type DraftBoardEntry,
} from "../components/DraftRosterBoard";
import {
  AuctionStage,
  type AuctionStageVM,
  type LogItemVM,
  type RosterSlotVM,
} from "../components/auction/AuctionStage";
import DraftGuideCard, {
  type Affordability,
  type DraftGuidePlayer,
} from "../components/draft/DraftGuideCard";
import { AuctionCoachBanner } from "../components/AuctionCoachBanner";
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
  type CpuLoneSurvivorDecision,
} from "../../../engines/cpuShillBidding";
import { reservePriceCurve } from "../../../data/rosterEngineConstants";
import { scaledShillDefault } from "../../../data/auctionEngineConstants";
import { archetypeByKey } from "../data/teamArchetypeCatalog";
import {
  farmDraftRouteForLeague,
  leagueIdFromSearch,
  resolveInitialLeagueId,
  clampDraftShillCount,
  shillCountFromSearch,
} from "../utils/draftRouting";
import { evaluatePoolDemandSufficiency } from "../../../utils/leagueBuilderPoolBuilder";
import {
  getScoutProfilesForLeague,
  type LeagueBuilderScoutProfile,
} from "../../../utils/leagueBuilderStorage";
import {
  getTeamAuctionMaxBid,
  type AuctionPlayer,
  type AuctionResult,
  type AuctionSession,
} from "../../../engines/auctionStateMachine";
import type { LeagueTemplate, Player, RegisteredPool, Team } from "../../hooks/useLeagueBuilderData";

const DEFAULT_AUCTION_SEED = "startup-auction-v1";
const DRAFT_BOARD_GAP_KINDS = new Set([
  "position_coverage",
  "lineup",
  "rotation",
  "bullpen",
  "depth_chart",
]);

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
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

function resultNoticeClass(disposition: AuctionResult["disposition"] | undefined): string {
  if (disposition === "SOLD") return "bg-[#2F7D46] border-[#E8E8D8]/40 text-[#E8E8D8]";
  if (disposition === "SET_ASIDE") return "bg-[#6B3A3A] border-[#FFD27A] text-[#FFE8B0]";
  return "bg-[#4A6844] border-[#FFD27A] text-[#FFD27A]";
}

function rosterPositionTally(
  team: AuctionSession["teams"][number] | null | undefined,
  playerById: Map<string, Player>,
): Array<[string, number]> {
  const tally = new Map<string, number>();
  for (const assignment of team?.roster ?? []) {
    const position = playerById.get(assignment.playerId)?.primaryPosition ?? "Unknown";
    tally.set(position, (tally.get(position) ?? 0) + 1);
  }
  return [...tally.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

function playerPronouns(player: Player | null | undefined): { subject: "he" | "she"; object: "him" | "her"; possessive: "his" | "her" } {
  return player?.gender === "F"
    ? { subject: "she", object: "her", possessive: "her" }
    : { subject: "he", object: "him", possessive: "his" };
}

const GRADE_TO_2080: Record<string, number> = {
  S: 80,
  "A+": 75,
  A: 70,
  "A-": 65,
  "B+": 60,
  B: 55,
  "B-": 50,
  "C+": 45,
  C: 40,
  "C-": 35,
  "D+": 30,
  D: 25,
  "D-": 20,
};

function clampGrade(grade: number): number {
  return Math.max(20, Math.min(80, Math.round(grade / 5) * 5));
}

function playerGradeToTwentyEighty(player: Player | null | undefined): number {
  return clampGrade(GRADE_TO_2080[player?.overallGrade ?? ""] ?? 50);
}

function averageScoutAccuracy(scout: LeagueBuilderScoutProfile): number {
  const values = Object.values(scout.accuracyByPosition);
  if (values.length === 0) return 65;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scoutAccuracyForPlayer(scout: LeagueBuilderScoutProfile, player: Player | null | undefined): number {
  const positionValues = playerPositions(player)
    .map((position) => scout.accuracyByPosition[position])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (positionValues.length > 0) {
    return positionValues.reduce((sum, value) => sum + value, 0) / positionValues.length;
  }
  return averageScoutAccuracy(scout);
}

function scoutPriceRange(center: number, accuracy: number): { priceLow: string; priceHigh: string } {
  const spread = Math.max(0.08, Math.min(0.36, (100 - accuracy) / 150));
  return {
    priceLow: formatMoney(center * (1 - spread)),
    priceHigh: formatMoney(center * (1 + spread)),
  };
}

function draftGuideAffordability(
  ask: number | null,
  maxBid: number | null,
  teamState: AuctionSession["teams"][number] | null | undefined,
): { affordability: Affordability; affordabilityNote: string } {
  if (ask === null) {
    return { affordability: "yellow", affordabilityNote: "Waiting for current ask." };
  }
  if (maxBid !== null && ask > maxBid) {
    return { affordability: "red", affordabilityNote: `Ask ${formatMoney(ask)} exceeds max ${formatMoney(maxBid)}.` };
  }
  if (!teamState || maxBid === null) {
    return { affordability: "yellow", affordabilityNote: "Budget read pending." };
  }
  const remainingFloor = Math.max(0, teamState.rosterSlotsRemaining - 1) * teamState.minSalary;
  const budgetAfterAsk = teamState.budgetRemaining - ask;
  if (budgetAfterAsk < remainingFloor) {
    return { affordability: "red", affordabilityNote: "Would leave too little for remaining slots." };
  }
  if (ask >= maxBid * 0.85) {
    return { affordability: "yellow", affordabilityNote: `Tight: max bid ${formatMoney(maxBid)}.` };
  }
  return { affordability: "green", affordabilityNote: `Room to bid up to ${formatMoney(maxBid)}.` };
}

function draftGuideTeamFit(player: Player | null | undefined, tally: Array<[string, number]>): DraftGuidePlayer["teamFit"] {
  const position = player?.primaryPosition;
  if (!position) return undefined;
  const currentCount = tally.find(([candidate]) => candidate === position)?.[1] ?? 0;
  if (currentCount === 0) {
    return { fit: true, text: `Fills empty ${position} slot` };
  }
  return { fit: false, text: `${currentCount} current ${position} rostered` };
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
  const current = Math.min(session.results.length + 1, session.playerOrder.length || session.results.length + 1);
  const total = session.playerOrder.length || session.availablePlayerIds.length || current;
  return `Lot ${current} of ${total}`;
}

function stageRosterLabel(teamState: AuctionSession["teams"][number] | null | undefined): string {
  if (!teamState) return "roster board";
  const filled = MLB_BOARD_TARGET - teamState.rosterSlotsRemaining;
  return `${Math.max(0, filled)} of ${MLB_BOARD_TARGET} rostered`;
}

function positionTokens(position: string | undefined): string[] {
  const normalized = position?.trim().toUpperCase();
  if (!normalized) return [];
  return [normalized, ...normalized.split("/").map((part) => part.trim()).filter(Boolean)];
}

function slotMatchesEntry(slotLabel: string, entry: DraftBoardEntry): boolean {
  const tokens = positionTokens(entry.primaryPosition);
  if (slotLabel === "SP") return tokens.includes("SP") || tokens.includes("SP/RP");
  if (slotLabel === "RP") return tokens.includes("RP") || tokens.includes("SP/RP");
  if (slotLabel === "CP") return tokens.includes("CP");
  if (slotLabel === "LF" || slotLabel === "CF" || slotLabel === "RF") {
    return tokens.includes(slotLabel) || tokens.includes("OF");
  }
  if (slotLabel === "DH") return !tokens.some((token) => token === "SP" || token === "RP" || token === "CP" || token === "SP/RP");
  return tokens.includes(slotLabel);
}

function buildStageRosterSlots(entries: readonly DraftBoardEntry[]): RosterSlotVM[] {
  const remaining = [...entries];
  return MLB_BOARD_SLOTS.map((slot) => {
    const index = slot.kind === "depth"
      ? (remaining.length > 0 ? 0 : -1)
      : remaining.findIndex((entry) => slotMatchesEntry(slot.label, entry));
    const entry = index >= 0 ? remaining.splice(index, 1)[0] : null;
    return {
      pos: slot.label,
      who: entry?.name ?? "open",
      filled: Boolean(entry),
      isGap: !entry && slot.kind !== "depth",
    };
  });
}

function buildStageNeedLine(
  gaps: readonly BoardPriorityGap[],
  budgetWarning: string | null,
): ReactNode {
  if (budgetWarning) return <>{budgetWarning}</>;
  if (gaps.length > 0) {
    return <>Priority need: <b>{gaps[0].label}</b></>;
  }
  return <>Roster board is tracking live gaps as the auction fills.</>;
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
    "over-budget": "the bid would break the budget cap",
    "over-valuation": "the ask is above the team's read",
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
  const roleLabel = input.isShill ? "Shill" : "CPU team";
  if (input.bidDecision) {
    const decision = input.bidDecision;
    return decision.kind === "bid"
      ? {
          teamName: input.teamName,
          roleLabel,
          action: `${input.teamName} will bid ${formatMoney(decision.bid)}`,
          reason: `${roleLabel} read values the player around ${formatMoney(decision.valuation)} and still has room to keep bidding.`,
          amount: formatMoney(decision.bid),
          valuation: formatMoney(decision.valuation),
          maxBid: formatMoney(decision.maxBid),
        }
      : {
          teamName: input.teamName,
          roleLabel,
          action: `${input.teamName} will pass`,
          reason: `${roleLabel} read: ${cpuPassReason(decision.reason)}.`,
          valuation: formatMoney(decision.valuation),
          maxBid: formatMoney(decision.maxBid),
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
        reason: `${roleLabel} read values the player around ${formatMoney(decision.valuation)}.`,
        amount: formatMoney(decision.price),
        valuation: formatMoney(decision.valuation),
        maxBid: formatMoney(decision.maxBid),
      }
    : {
        teamName: input.teamName,
        roleLabel,
        action: `${input.teamName} will let the player go`,
        reason: `${roleLabel} read: ${cpuPassReason(decision.reason)}.`,
        valuation: formatMoney(decision.valuation),
        maxBid: formatMoney(decision.maxBid),
      };
}

function bidPresetLabel(amount: number, minBid: number | null, bidIncrement: number): string {
  if (minBid === null || amount <= minBid) return "Min";
  return `+${Math.round((amount - minBid) / bidIncrement)}x`;
}

export function LeagueBuilderAuctionDraft() {
  const navigate = useNavigate();
  const auction = useAuctionDraft();
  const { leagueData, loadAuction, session } = auction;
  const requestedLeagueId = useMemo(() => leagueIdFromSearch(window.location.search), []);
  const requestedShillCount = useMemo(() => shillCountFromSearch(window.location.search), []);
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [seed, setSeed] = useState(DEFAULT_AUCTION_SEED);
  const [cpuCount, setCpuCount] = useState(0);
  const [cpuAdvancePending, setCpuAdvancePending] = useState(false);
  const [bidIncrement, setBidIncrement] = useState(5000);
  const [bidAmount, setBidAmount] = useState("");
  const [scoutProfiles, setScoutProfiles] = useState<LeagueBuilderScoutProfile[]>([]);
  const [registeredPool, setRegisteredPool] = useState<RegisteredPool | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const cpuCountTouchedRef = useRef(false);
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
      setScoutProfiles([]);
      return;
    }
    let cancelled = false;
    void getScoutProfilesForLeague(activeLeagueId).then((profiles) => {
      if (!cancelled) setScoutProfiles(profiles);
    });
    return () => {
      cancelled = true;
    };
  }, [activeLeagueId]);

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
      .filter(Boolean);
  }, [activeLeague, leagueData.teams]);

  useEffect(() => {
    if (session) return;
    if (cpuCountTouchedRef.current) return;
    if (leagueTeams.length === 0) return;
    setCpuCount(clampDraftShillCount(requestedShillCount ?? scaledShillDefault(leagueTeams.length)));
  }, [requestedShillCount, session, leagueTeams.length]);

  const teamById = useMemo(() => new Map(leagueData.teams.map((team) => [team.id, team])), [leagueData.teams]);
  const playerById = useMemo(() => new Map(leagueData.players.map((player) => [player.id, player])), [leagueData.players]);
  const teamStateById = useMemo(() => new Map(session?.teams.map((team) => [team.teamId, team]) ?? []), [session]);
  const latestResult = session?.results.at(-1) ?? null;
  const shillTeamIdSet = useMemo(() => new Set(auction.shillTeamIds), [auction.shillTeamIds]);
  const teamNameById = useCallback((teamId: string | null | undefined): string => {
    if (!teamId) return "Unknown Team";
    if (shillTeamIdSet.has(teamId)) {
      const index = auction.shillTeamIds.indexOf(teamId);
      return `Market Shill ${index >= 0 ? index + 1 : ""}`.trim();
    }
    return teamDisplayName(teamById.get(teamId));
  }, [auction.shillTeamIds, shillTeamIdSet, teamById]);
  const scoutByTeamId = useMemo(() => {
    const map = new Map<string, LeagueBuilderScoutProfile>();
    for (const scout of scoutProfiles) {
      if (scout.teamId) map.set(scout.teamId, scout);
    }
    return map;
  }, [scoutProfiles]);

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
  const currentBidderScout = auction.currentBidderTeamId ? scoutByTeamId.get(auction.currentBidderTeamId) : undefined;
  const currentBidderIsCpu = auction.isCpuTeam(auction.currentBidderTeamId);
  const pendingClaimTeamState = session?.pendingClaim ? teamStateById.get(session.pendingClaim.teamId) ?? null : null;
  const latestWinnerTeamState = session?.state === "SOLD" && latestResult?.disposition === "SOLD" && latestResult.winnerTeamId
    ? teamStateById.get(latestResult.winnerTeamId) ?? null
    : null;
  const currentRosterTally = useMemo(
    () => rosterPositionTally(currentBidderTeamState, playerById),
    [currentBidderTeamState, playerById],
  );
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
  const currentDraftGuidePlayer = useMemo<DraftGuidePlayer | null>(() => {
    if (!lot || !currentLotPlayer) return null;
    const guideAsk = minBid ?? lot.openingAsk;
    const affordability = draftGuideAffordability(guideAsk, currentBidderMaxBid, currentBidderTeamState);
    const scoutAccuracy = currentBidderScout ? scoutAccuracyForPlayer(currentBidderScout, currentLotPlayer) : null;
    const scoutCenter = lotAuctionPlayer?.iv ?? lot.openingAsk;
    const scout = currentBidderScout && Number.isFinite(scoutCenter)
      ? {
          ...scoutPriceRange(scoutCenter, scoutAccuracy ?? 65),
          grade: clampGrade(playerGradeToTwentyEighty(currentLotPlayer) + Math.round(((scoutAccuracy ?? 65) - 65) / 18) * 5),
          confidence: `${currentBidderScout.name} - ${Math.round(scoutAccuracy ?? 65)} eye`,
        }
      : undefined;

    return {
      name: playerDisplayName(currentLotPlayer),
      position: playerPositions(currentLotPlayer).join("/") || "POS",
      personality: currentLotPlayer.personality,
      tier: "mlb",
      ivLabel: formatMoney(lotAuctionPlayer?.iv),
      affordability: affordability.affordability,
      affordabilityNote: affordability.affordabilityNote,
      scout,
      scoutNote: currentBidder
        ? `${teamNameById(currentBidder.id)} has no hired scout read for this nomination.`
        : "Waiting for the controlling bidder.",
      teamFit: draftGuideTeamFit(currentLotPlayer, currentRosterTally),
    };
  }, [
    currentBidder,
    currentBidderMaxBid,
    currentBidderScout,
    currentBidderTeamState,
    currentLotPlayer,
    currentRosterTally,
    lot,
    lotAuctionPlayer?.iv,
    minBid,
    teamNameById,
  ]);
  const scoutInsight = useMemo<AuctionStageVM["scoutInsight"]>(() => {
    if (!session || !lot || !currentLotPlayer || !rosterBoardTeamState) return null;

    const ask = minBid ?? lot.openingAsk;
    const focusTeam = teamById.get(rosterBoardTeamState.teamId);
    const archetype = archetypeByKey(focusTeam?.mlbArchetypeKey);
    const pronouns = playerPronouns(currentLotPlayer);
    const currentRoster = rosterBoardTeamState.roster.map((assignment) => {
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
    const afterReport = analyzeDraftRoster({
      leagueId: activeLeague?.id,
      team: {
        id: rosterBoardTeamState.teamId,
        name: teamNameById(rosterBoardTeamState.teamId),
      },
      mlbWonPlayers: [
        ...currentRoster,
        draftAnalyzerEntryFromPlayer(currentLotPlayer, ask),
      ],
      farmWonPlayers: [],
      walletCap: rosterBoardWalletCap ?? undefined,
    });
    const afterGaps = sortByTiltedPriority(tiltAnalyzerFindings(
      afterReport.findings.filter((finding) => (
        DRAFT_BOARD_GAP_KINDS.has(finding.kind) && finding.severity !== "info"
      )),
      focusTeam?.capIdentity,
    ));
    const topNeed = rosterBoardPriorityGaps[0]?.label ?? "no urgent roster hole";
    const remainingNeed = afterGaps[0]?.finding.title ?? "the board gets cleaner";
    const affordability = draftGuideAffordability(ask, currentBidderMaxBid, rosterBoardTeamState);
    const fit = draftGuideTeamFit(currentLotPlayer, rosterPositionTally(rosterBoardTeamState, playerById));
    const verdict = affordability.affordability === "green"
      ? "Scout Insight: push"
      : affordability.affordability === "yellow"
        ? "Scout Insight: cap"
        : "Scout Insight: pass";
    const summary = fit?.fit
      ? `${currentLotPlayer.firstName} fills a live need`
      : `${currentLotPlayer.firstName} is a roster-shape decision`;
    const identityLine = archetype
      ? `${teamNameById(rosterBoardTeamState.teamId)} is building as ${archetype.name}; ${pronouns.subject} should be judged against that identity, not just the public IV.`
      : `${teamNameById(rosterBoardTeamState.teamId)} has no visible MLB identity in this read, so the advice is based on roster shape and budget.`;
    const budgetLine = affordability.affordability === "green"
      ? `At ${formatMoney(ask)}, ${pronouns.subject} leaves enough room to keep filling the remaining board.`
      : affordability.affordability === "yellow"
        ? `At ${formatMoney(ask)}, this is near the ceiling. Keep the cap firm unless ${pronouns.subject} solves a premium hole.`
        : `At ${formatMoney(ask)}, the bid is past the safe roster-building line. Let ${pronouns.object} go unless the board is desperate.`;

    return {
      verdict,
      summary,
      details: (
        <>
          <p>{identityLine}</p>
          <p>Current board pressure: {topNeed}. If you add {currentLotPlayer.firstName}, the next analyzer concern is {remainingNeed}.</p>
          <p>{budgetLine}</p>
          <p>{fit?.text ?? `${pronouns.subject} does not map cleanly to a single roster hole yet.`}</p>
        </>
      ),
    };
  }, [
    activeLeague?.id,
    currentBidderMaxBid,
    currentLotPlayer,
    lot,
    minBid,
    playerById,
    rosterBoardPriorityGaps,
    rosterBoardTeamState,
    rosterBoardWalletCap,
    session,
    teamById,
    teamNameById,
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
      return "Hold — engine surfacing the next player.";
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
  const setupShillCount = clampDraftShillCount(cpuCount);
  // FABLE-C3-FIX-2 F6: the SAME market-clearing gate as both Draft Setup screens — teams and
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
      nominationOrderSeed: seed,
      cpuShillCount: setupShillCount,
      bidIncrement,
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
  const stageRosterSlots = useMemo(() => buildStageRosterSlots(rosterBoardEntries), [rosterBoardEntries]);
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
    session?.state === "AUCTION_COMPLETE" ? "FARM DRAFT" :
    undefined;
  const stageSecondaryLabel =
    session?.state === "RESOLVE" && stagePendingClaim ? "Pass on reserve" :
    session?.state === "OPEN_BIDDING" ? `Let ${playerPronouns(stageLotPlayer).object} go` :
    "No pass";
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
      name: stageLotPlayer ? playerDisplayName(stageLotPlayer) : session.state === "AUCTION_COMPLETE" ? "MLB auction complete" : "Next player surfacing",
      positions: lotPositions(stageLotPlayer),
      personality: readableTrait(stageLotPlayer?.personality, "Personality —"),
      chemistry: readableTrait(stageLotPlayer?.chemistry, "Chemistry —"),
      batsThrows: stageLotPlayer ? `${stageLotPlayer.bats}/${stageLotPlayer.throws}` : undefined,
      age: stageLotPlayer?.age,
      objectPronoun: playerPronouns(stageLotPlayer).object,
      ivAdvisory: stageLotAuctionPlayer ? formatMoney(stageLotAuctionPlayer.iv) : undefined,
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
        : stageMaxBid !== null
          ? `Capped at ${formatMoney(stageMaxBid)} so the roster can still fill remaining slots.`
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
      title: `${stageFocusTeamName} · ${rosterBoardEntries.length} of ${MLB_BOARD_TARGET}`,
      hint: rosterBoardBudgetWarning ? "budget watch" : "gaps glow",
      slots: stageRosterSlots,
      needLine: buildStageNeedLine(rosterBoardPriorityGaps, rosterBoardBudgetWarning),
    },
    log: stageLog,
    coach: currentDraftGuidePlayer
      ? (
          <>
            <b>{currentDraftGuidePlayer.affordability.toUpperCase()}</b> — {currentDraftGuidePlayer.affordabilityNote}
            {currentDraftGuidePlayer.teamFit ? <> {currentDraftGuidePlayer.teamFit.text}.</> : null}
          </>
        )
      : <AuctionCoachBanner tier="mlb" state={session.state} />,
    scoutInsight,
    overlay: session.state === "SOLD" ? "sold" : session.state === "PASSED" ? "gone" : null,
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
      navigate(activeLeague ? farmDraftRouteForLeague(activeLeague) : "/league-builder/farm-auction-draft");
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
        toolbar={
          <div className="row" style={{ marginBottom: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <button
              type="button"
              className="chip"
              onClick={() => navigate("/league-builder")}
            >
              Back to League Builder
            </button>
            <span className="chip">Seed {session?.config.nominationOrderSeed}</span>
            <span className="chip">{handoffPrompt}</span>
            {auction.error ? (
              <div className="card" style={{ width: "100%", borderColor: "rgba(255,140,140,0.5)", color: "#FFD7D7" }}>
                {auction.error}
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
          {session?.state === "AUCTION_COMPLETE" && (
            <span className="flex items-center gap-2 bg-[#2F7D46] border-4 border-[#E8E8D8]/40 px-4 py-2 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              AUCTION COMPLETE
            </span>
          )}
        </div>

        {auction.error && (
          <div className="mb-6 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4 text-[#FFE8B0] font-bold">
            {auction.error}
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
          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <h2 className="font-bold mb-4 text-lg">SETUP</h2>

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

            <label htmlFor="auction-seed" className="block text-xs text-[#E8E8D8]/70 mb-1">SEED</label>
            <input
              id="auction-seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              disabled={Boolean(session)}
              className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none mb-4 disabled:opacity-60"
            />

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-[#E8E8D8]/70">
                CPU COUNT
                <input
                  value={cpuCount}
                  onChange={(event) => {
                    cpuCountTouchedRef.current = true;
                    setCpuCount(clampDraftShillCount(Number(event.target.value) || 0));
                  }}
                  disabled={Boolean(session)}
                  type="number"
                  min={0}
                  max={12}
                  className="mt-1 w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none disabled:opacity-60"
                />
              </label>
              <label className="block text-xs text-[#E8E8D8]/70">
                BID INCREMENT
                <input
                  value={bidIncrement}
                  onChange={(event) => setBidIncrement(Number(event.target.value) || 0)}
                  disabled={Boolean(session)}
                  type="number"
                  min={1}
                  className="mt-1 w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none disabled:opacity-60"
                />
              </label>
            </div>

            {!session && (
              <button
                onClick={beginAuction}
                disabled={!activeLeagueId || leagueTeams.length === 0 || !setupPoolReady || blockers.length > 0 || auction.isWorking}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#3B7DD8] hover:bg-[#4B8DE8] disabled:opacity-50 disabled:hover:bg-[#3B7DD8] border-4 border-[#E8E8D8] transition font-bold"
              >
                {auction.isWorking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                <span>{auction.isWorking ? "STARTING" : "BEGIN AUCTION DRAFT"}</span>
              </button>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">TEAMS</div>
                <div className="font-bold text-xl">{leagueTeams.length}</div>
              </div>
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">CPU</div>
                <div className="font-bold text-xl">{auction.cpuTeamIds.length || cpuCount}</div>
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
          </section>

          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-bold text-lg">STATE: {session?.state ?? "SETUP"}</h2>
              {session && <div className="text-sm text-[#E8E8D8]/60">Seed {session.config.nominationOrderSeed}</div>}
            </div>

            <AuctionCoachBanner tier="mlb" state={session?.state ?? "SETUP"} />

            {!session && (
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4 text-[#E8E8D8]/80">
                No active auction session. Configure the league, then begin.
              </div>
            )}

            {session?.state === "NOMINATION" && (
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                <div className="text-xs text-[#E8E8D8]/60">ENGINE NOMINATION</div>
                <div className="text-xl font-bold">Surfacing the next player...</div>
                <div className="mt-1 text-sm text-[#E8E8D8]/70">
                  Available pool: {availablePoolCandidates.length} players
                </div>
              </div>
            )}

              {session?.state === "OPEN_BIDDING" && lot && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">ENGINE NOMINATED</div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="text-xl font-bold">{playerDisplayName(currentLotPlayer)}</div>
                        {positionBadges(currentLotPlayer)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-[#E8E8D8]/75">
                        <div>IV {formatMoney(lotAuctionPlayer?.iv)}</div>
                        <div>Reserve {formatMoney(reserveAsk(lotAuctionPlayer) ?? lot.openingAsk)}</div>
                        <div>Opening {formatMoney(lot.openingAsk)}</div>
                      </div>
                    </div>
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">HIGH BID</div>
                      <div className="text-xl font-bold">{lot.highBid === null ? "No bid yet" : formatMoney(lot.highBid)}</div>
                      <div className="text-sm text-[#E8E8D8]/70">
                        {lot.highBidder ? teamNameById(lot.highBidder) : "No bidder yet"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">CURRENT BIDDER</div>
                      <div className="text-xl font-bold">{auction.currentBidderTeamId ? teamNameById(auction.currentBidderTeamId) : teamDisplayName(currentBidder)}</div>
                      <div className="text-sm text-[#E8E8D8]/70">
                        Still in: {lot.stillIn.map((teamId) => teamNameById(teamId)).join(", ")}
                      </div>
                    </div>
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">YOUR REMAINING BUDGET</div>
                      <div className="text-xl font-bold">{formatMoney(currentBidderTeamState?.budgetRemaining)}</div>
                      <div className="text-sm text-[#E8E8D8]/70">{auction.currentBidderTeamId ? teamNameById(auction.currentBidderTeamId) : teamDisplayName(currentBidder)}</div>
                    </div>
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60">YOUR MAX BID</div>
                      <div className="text-xl font-bold">{formatMoney(currentBidderMaxBid)}</div>
                      <div className="text-sm text-[#FFD27A] font-bold">Teams below the current ask are auto-passed.</div>
                    </div>
                  </div>
                  {currentDraftGuidePlayer ? (
                    <DraftGuideCard player={currentDraftGuidePlayer} />
                  ) : null}
                  <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                      <div>
                        <div className="text-xs text-[#E8E8D8]/60">ROSTER SLOTS REMAINING</div>
                        <div className="text-3xl font-bold">{currentBidderTeamState?.rosterSlotsRemaining ?? "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#E8E8D8]/60 mb-2">CURRENT ROSTER POSITION TALLY</div>
                        {currentRosterTally.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {currentRosterTally.map(([position, count]) => (
                              <span key={position} className="bg-[#2d3d2f] border-2 border-[#E8E8D8]/20 px-2 py-1 text-xs font-bold">
                                {position}: {count}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-[#E8E8D8]/70">No MLB auction players rostered yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                  {auction.currentBidderTeamId ? (
                    <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                      <div className="text-xs text-[#E8E8D8]/60 mb-3">RAISE</div>
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_auto] gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {[1, 2, 5].map((multiple) => {
                            const amount = minBid === null ? null : minBid + session.config.bidIncrement * multiple;
                            const disabled = auction.isWorking
                              || currentBidderIsCpu
                              || amount === null
                              || currentBidderMaxBid === null
                              || amount > currentBidderMaxBid;
                            return (
                              <button
                                key={multiple}
                                type="button"
                                onClick={() => amount !== null && void auction.bid(auction.currentBidderTeamId!, amount)}
                                disabled={disabled}
                                className="px-4 py-2 bg-[#2F7D46] hover:bg-[#3F8D56] disabled:opacity-50 disabled:hover:bg-[#2F7D46] border-4 border-[#E8E8D8] font-bold"
                              >
                                +{multiple}× {formatMoney(amount)}
                              </button>
                            );
                          })}
                        </div>
                        <label className="block text-xs text-[#E8E8D8]/70 font-bold">
                          CUSTOM BID
                          <input
                            aria-label="Custom bid amount"
                            value={bidAmount}
                            onChange={(event) => setBidAmount(event.target.value)}
                            onBlur={() => {
                              const clamped = clampBidAmount(Number(bidAmount));
                              if (clamped !== null) setBidAmount(String(clamped));
                            }}
                            type="number"
                            min={minBid ?? undefined}
                            max={currentBidderMaxBid ?? undefined}
                            disabled={auction.isWorking || currentBidderIsCpu}
                            className="mt-1 w-full bg-[#2d3d2f] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none disabled:opacity-50"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const clamped = clampBidAmount(Number(bidAmount));
                            if (clamped === null) return;
                            setBidAmount(String(clamped));
                            void auction.bid(auction.currentBidderTeamId!, clamped);
                          }}
                          disabled={auction.isWorking || currentBidderIsCpu || clampBidAmount(Number(bidAmount)) === null}
                          className="self-end px-4 py-2 bg-[#2F7D46] hover:bg-[#3F8D56] disabled:opacity-50 disabled:hover:bg-[#2F7D46] border-4 border-[#E8E8D8] font-bold"
                        >
                          RAISE CUSTOM
                        </button>
                      </div>
                      <button
                        onClick={() => void auction.pass(auction.currentBidderTeamId!)}
                        disabled={auction.isWorking || currentBidderIsCpu}
                        className="mt-3 px-4 py-2 bg-[#6B3A3A] hover:bg-[#7B4A4A] disabled:opacity-50 border-4 border-[#E8E8D8] font-bold"
                      >
                        PASS
                      </button>
                    </div>
                  ) : (
                    <button
                    onClick={() => void auction.resolve()}
                    disabled={auction.isWorking}
                    className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold"
                  >
                    RESOLVE LOT
                  </button>
                )}
              </div>
            )}

            {session?.state === "RESOLVE" && (
              <div className="space-y-4">
                <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                  <div className="text-xs text-[#E8E8D8]/60">PENDING CLAIM</div>
                  <div className="text-xl font-bold">
                    {session.pendingClaim
                      ? `${teamNameById(session.pendingClaim.teamId)} can claim ${playerDisplayName(currentLotPlayer)} at ${formatMoney(session.pendingClaim.price)}`
                      : "Ready to resolve"}
                  </div>
                </div>
                {session.pendingClaim ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => void auction.claimAtReserve()}
                      disabled={auction.isWorking || auction.isCpuTeam(session.pendingClaim.teamId)}
                      className="px-4 py-2 bg-[#2F7D46] hover:bg-[#3F8D56] disabled:opacity-50 border-4 border-[#E8E8D8] font-bold"
                    >
                      CLAIM AT RESERVE
                    </button>
                    <button
                      onClick={() => void auction.pass(session.pendingClaim!.teamId)}
                      disabled={auction.isWorking || auction.isCpuTeam(session.pendingClaim.teamId)}
                      className="px-4 py-2 bg-[#6B3A3A] hover:bg-[#7B4A4A] disabled:opacity-50 border-4 border-[#E8E8D8] font-bold"
                    >
                      PASS
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => void auction.resolve()}
                    disabled={auction.isWorking}
                    className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold"
                  >
                    RESOLVE
                  </button>
                )}
              </div>
            )}

              {(session?.state === "SOLD" || session?.state === "PASSED") && (
                <div className="space-y-4">
                  <div className={`${resultNoticeClass(latestResult?.disposition)} border-4 p-4`}>
                    <div className="text-xs text-[#E8E8D8]/60">LAST RESULT</div>
                    <div className="text-xl font-bold">{latestResult ? resultText(latestResult, playerById, teamNameById) : session.state}</div>
                  </div>
                  <button
                    onClick={() => void auction.advance()}
                  disabled={auction.isWorking}
                  className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold"
                >
                  NEXT LOT
                </button>
              </div>
            )}

              {session?.state === "AUCTION_COMPLETE" && (
                <div className="bg-[#2F7D46] border-4 border-[#E8E8D8]/40 p-4 font-bold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <span>AUCTION COMPLETE. MLB rosters are filled in the auction session.</span>
                  <button
                    onClick={() => navigate(activeLeague ? farmDraftRouteForLeague(activeLeague) : "/league-builder/farm-auction-draft")}
                    className="px-4 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold whitespace-nowrap"
                  >
                    PROCEED TO FARM AUCTION →
                  </button>
                </div>
              )}
            </section>
          </div>

        {session && (
          <section className="mt-6 bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <h2 className="font-bold text-lg mb-4">LOT LOG</h2>
            <div className="space-y-2">
                {session.results.slice(-12).reverse().map((result, index) => (
                  <div key={`${result.playerId}-${session.results.length - index}`} className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3 text-sm">
                    {resultText(result, playerById, teamNameById)}
                  </div>
                ))}
              {session.results.length === 0 && (
                <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3 text-sm text-[#E8E8D8]/70">
                  No lots resolved yet.
                </div>
              )}
            </div>
          </section>
        )}

        {session && (
          <DraftRosterBoard
            tier="mlb"
            entries={rosterBoardEntries}
            target={MLB_BOARD_TARGET}
            payroll={rosterBoardPayroll}
            walletRemaining={rosterBoardTeamState?.budgetRemaining ?? null}
            priorityGaps={rosterBoardPriorityGaps}
            budgetWarning={rosterBoardBudgetWarning}
          />
        )}
      </div>
    </div>
  );
}
