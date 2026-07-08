import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Gavel, RefreshCw, ShieldAlert, UserCheck } from "lucide-react";

import {
  DraftRosterBoard,
  FARM_BOARD_TARGET,
  type BoardPriorityGap,
  type DraftBoardEntry,
} from "../components/DraftRosterBoard";
import { AuctionCoachBanner } from "../components/AuctionCoachBanner";
import { LongPressReveal } from "../components/LongPressReveal";
import { auctionTransitionErrorCopy } from "../hooks/useAuctionDraft";
import { useFarmAuctionDraft } from "../hooks/useFarmAuctionDraft";
import {
  leagueIdFromSearch,
  resolveInitialLeagueId,
  staffHireRouteForLeague,
} from "../utils/draftRouting";
import { normalizeToChemistryCode, type ChemistryCode } from "../../../data/chemistryCanonical";
import {
  getTeamAuctionMaxBid,
  type AuctionPlayer,
  type AuctionResult,
  type AuctionSession,
} from "../../../engines/auctionStateMachine";
import { gradeToTwentyEighty, type Grade } from "../../../engines/gradeEngine";
import { archetypeBandValueRange, type ScoutValueRange } from "../../../engines/scoutValueRange";
import {
  sortByTiltedPriority,
  tiltAnalyzerFindings,
} from "../../../engines/farmArchetypeTilt";
import {
  analyzeDraftRoster,
  type DraftAnalyzerFarmEntry,
  type DraftAnalyzerMlbEntry,
} from "../../../utils/rosterAnalyzerDraftAdapter";
import {
  scoutOverallBandForPosition,
  scoutOverallGradeBand,
  scoutOverallTierForPosition,
  scoutToolBands,
  type DraftPosition,
  type LeagueBuilderProspectPlayerDto,
} from "../../../utils/prospectScoutingDraftEngine";
import type { Player, Team } from "../../hooks/useLeagueBuilderData";

const DEFAULT_FARM_AUCTION_SEED = "farm-auction-v1";
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

function teamDisplayName(team: Team | null | undefined): string {
  if (!team) return "Unknown Team";
  return team.location ? `${team.location} ${team.name}` : team.name;
}

function prospectDisplayName(prospect: LeagueBuilderProspectPlayerDto | null | undefined): string {
  if (!prospect) return "Unknown Prospect";
  return `${prospect.firstName} ${prospect.lastName}`.trim() || "Unknown Prospect";
}

function playerDisplayName(player: Player | null | undefined): string {
  if (!player) return "Unknown Player";
  return `${player.firstName} ${player.lastName}`.trim() || "Unknown Player";
}

function prospectPositions(prospect: LeagueBuilderProspectPlayerDto | null | undefined): string[] {
  return Array.from(new Set([prospect?.primaryPosition, prospect?.secondaryPosition].filter(Boolean) as string[]));
}

function positionBadges(prospect: LeagueBuilderProspectPlayerDto | null | undefined) {
  const positions = prospectPositions(prospect);
  if (positions.length === 0) {
    return <span className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">POS</span>;
  }
  return positions.map((position) => (
    <span key={position} className="bg-[#3B7DD8] px-2 py-0.5 text-xs font-bold">
      {position}
    </span>
  ));
}

function scoutedGrade(prospect: LeagueBuilderProspectPlayerDto | null | undefined): string {
  return prospect?.prospectProfile.scoutedGrade ?? "N/A";
}

function scoutGradeDisplay(prospect: LeagueBuilderProspectPlayerDto | null | undefined): string {
  const grade = scoutedGrade(prospect);
  const storedGrade = prospect?.prospectProfile.scoutedGrade;
  if (!storedGrade) return grade;
  return `${grade} (${gradeToTwentyEighty(storedGrade)})`;
}

type FarmScoutRead = ScoutValueRange & {
  toolBands: Record<string, { lower: number; upper: number }>;
  overallGradeBand: { best: Grade; worst: Grade };
  overallBand: 3 | 5 | 7;
};

function prospectRatings(prospect: LeagueBuilderProspectPlayerDto): Record<string, number> {
  return {
    power: prospect.power,
    contact: prospect.contact,
    speed: prospect.speed,
    fielding: prospect.fielding,
    arm: prospect.arm,
    velocity: prospect.velocity,
    junk: prospect.junk,
    accuracy: prospect.accuracy,
  };
}

function scoutRangeForProspect(input: {
  prospect: LeagueBuilderProspectPlayerDto | null | undefined;
  auctionPlayer: AuctionPlayer | null | undefined;
  openingAsk: number | null | undefined;
  teamId: string | null | undefined;
  farmArchetypeKey: string | undefined;
  seed: string;
}): FarmScoutRead | null {
  const { prospect, auctionPlayer, openingAsk, teamId, farmArchetypeKey, seed } = input;
  if (!prospect || !auctionPlayer || !teamId) return null;
  if (typeof openingAsk !== "number" || !Number.isFinite(openingAsk) || openingAsk <= 0) return null;
  const position = prospect.primaryPosition as DraftPosition;
  const overallBand = scoutOverallBandForPosition(position, farmArchetypeKey);
  const band = scoutOverallGradeBand(
    prospect.prospectProfile.trueGrade,
    scoutOverallTierForPosition(position, farmArchetypeKey),
    `${seed}:grade-band:${prospect.id}:${teamId}`,
  );
  const range = archetypeBandValueRange(
    openingAsk,
    overallBand,
    `${seed}:value-band:${prospect.id}:${teamId}`,
  );
  return {
    ...range,
    toolBands: scoutToolBands({
      ratings: prospectRatings(prospect),
      position,
      farmArchetypeKey,
      seed: `${seed}:tool-bands:${prospect.id}:${teamId}`,
    }),
    overallGradeBand: band,
    overallBand,
  };
}

function formatScoutRange(range: ScoutValueRange | null): string {
  if (!range) return "N/A";
  return `${formatMoney(range.displayedEstimate)} estimate [${formatMoney(range.low)}-${formatMoney(range.high)}]`;
}

function resultText(
  result: AuctionResult,
  prospectById: Map<string, LeagueBuilderProspectPlayerDto>,
  teamById: Map<string, Team>,
): string {
  const prospectName = prospectDisplayName(prospectById.get(result.playerId));
  if (result.disposition === "SOLD") {
    return `${prospectName} SOLD to ${teamDisplayName(result.winnerTeamId ? teamById.get(result.winnerTeamId) : null)} for ${formatMoney(result.salary)}`;
  }
  if (result.disposition === "SET_ASIDE") return `${prospectName} set aside`;
  return `${prospectName} PASSED`;
}

function resultNoticeClass(disposition: AuctionResult["disposition"] | undefined): string {
  if (disposition === "SOLD") return "bg-[#2F7D46] border-[#E8E8D8]/40 text-[#E8E8D8]";
  if (disposition === "SET_ASIDE") return "bg-[#6B3A3A] border-[#FFD27A] text-[#FFE8B0]";
  return "bg-[#4A6844] border-[#FFD27A] text-[#FFD27A]";
}

function rosterPositionTally(
  team: AuctionSession["teams"][number] | null | undefined,
  prospectById: Map<string, LeagueBuilderProspectPlayerDto>,
): Array<[string, number]> {
  const tally = new Map<string, number>();
  for (const assignment of team?.roster ?? []) {
    const position = prospectById.get(assignment.playerId)?.primaryPosition ?? "Unknown";
    tally.set(position, (tally.get(position) ?? 0) + 1);
  }
  return [...tally.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

export function LeagueBuilderFarmAuctionDraft() {
  const navigate = useNavigate();
  const auction = useFarmAuctionDraft();
  const { leagueData, loadFarmAuction, session } = auction;
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [seed, setSeed] = useState(DEFAULT_FARM_AUCTION_SEED);
  const [bidIncrement, setBidIncrement] = useState(1000);
  const [bidAmount, setBidAmount] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const loadedKeyRef = useRef<string | null>(null);
  const requestedLeagueId = useMemo(() => leagueIdFromSearch(window.location.search), []);

  useEffect(() => {
    if (!activeLeagueId && leagueData.leagues.length > 0) {
      setActiveLeagueId(resolveInitialLeagueId(leagueData.leagues, requestedLeagueId));
    }
  }, [activeLeagueId, leagueData.leagues, requestedLeagueId]);

  useEffect(() => {
    if (!activeLeagueId) return;
    const key = `${activeLeagueId}:farm:1`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    void loadFarmAuction(activeLeagueId);
  }, [activeLeagueId, loadFarmAuction]);

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
  const prospectById = useMemo(
    () => new Map((auction.pool?.prospects ?? []).map((prospect) => [prospect.id, prospect])),
    [auction.pool],
  );
  const teamStateById = useMemo(() => new Map(session?.teams.map((team) => [team.teamId, team]) ?? []), [session]);

  const currentBidder = auction.currentBidderTeamId ? teamById.get(auction.currentBidderTeamId) : null;
  const lot = session?.currentLot ?? null;
  const lotAuctionPlayer = lot ? session?.players[lot.playerId] ?? null : null;
  const currentLotProspect = lot ? prospectById.get(lot.playerId) ?? null : null;
  const activeSeed = session?.config.nominationOrderSeed ?? seed;
  const currentLotScoutTeamId = auction.currentBidderTeamId ?? session?.pendingClaim?.teamId ?? null;
  const currentLotScoutFarmArchetypeKey = currentLotScoutTeamId
    ? teamById.get(currentLotScoutTeamId)?.farmArchetypeKey
    : undefined;
  const currentLotRange = scoutRangeForProspect({
    prospect: currentLotProspect,
    auctionPlayer: lotAuctionPlayer,
    openingAsk: lot?.openingAsk,
    teamId: currentLotScoutTeamId,
    farmArchetypeKey: currentLotScoutFarmArchetypeKey,
    seed: activeSeed,
  });
  const minBid = session ? minimumBid(session) : null;
  const pendingClaimTeam = session?.pendingClaim ? teamById.get(session.pendingClaim.teamId) : null;
  const currentBidderTeamState = auction.currentBidderTeamId ? teamStateById.get(auction.currentBidderTeamId) : null;
  const currentBidderMaxBid = session && auction.currentBidderTeamId
    ? getTeamAuctionMaxBid(session, auction.currentBidderTeamId)
    : null;
  const currentBidderIsCpu = auction.isCpuTeam(auction.currentBidderTeamId);
  const currentRosterTally = useMemo(
    () => rosterPositionTally(currentBidderTeamState, prospectById),
    [currentBidderTeamState, prospectById],
  );
  const rosterBoardTeamState = useMemo(() => {
    if (currentBidderTeamState) return currentBidderTeamState;
    const humanTeam = leagueData.teams.find((team) => team.controlledBy === "human");
    return humanTeam ? teamStateById.get(humanTeam.id) ?? null : null;
  }, [currentBidderTeamState, leagueData.teams, teamStateById]);
  const rosterBoardEntries = useMemo<DraftBoardEntry[]>(() => (
    (rosterBoardTeamState?.roster ?? []).map((assignment) => {
      const prospect = prospectById.get(assignment.playerId);
      return {
        id: assignment.playerId,
        name: prospectDisplayName(prospect),
        primaryPosition: prospect?.primaryPosition ?? "Unknown",
        secondaryPosition: prospect?.secondaryPosition,
        salary: assignment.salary,
      };
    })
  ), [prospectById, rosterBoardTeamState]);
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

    const boardTeam = teamById.get(rosterBoardTeamState.teamId);
    const mlbWonPlayers: DraftAnalyzerMlbEntry[] = (auction.mlbRosterPlayerIdsByTeamId[rosterBoardTeamState.teamId] ?? [])
      .map((playerId) => playerById.get(playerId))
      .filter((player): player is Player => Boolean(player))
      .map((player) => ({
        id: player.id,
        name: playerDisplayName(player),
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition,
        salary: 0,
      }));
    if (mlbWonPlayers.length === 0) return null;

    const farmWonPlayers: DraftAnalyzerFarmEntry[] = rosterBoardEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      primaryPosition: entry.primaryPosition,
      secondaryPosition: entry.secondaryPosition,
      salary: entry.salary,
    }));

    return analyzeDraftRoster({
      leagueId: activeLeague?.id,
      team: {
        id: rosterBoardTeamState.teamId,
        name: teamDisplayName(boardTeam),
      },
      mlbWonPlayers,
      farmWonPlayers,
      walletCap: rosterBoardWalletCap ?? undefined,
    });
  }, [
    activeLeague?.id,
    auction.mlbRosterPlayerIdsByTeamId,
    playerById,
    rosterBoardEntries,
    rosterBoardTeamState,
    rosterBoardWalletCap,
    session,
    teamById,
  ]);
  const rosterBoardPriorityGaps = useMemo<BoardPriorityGap[]>(() => {
    if (!rosterBoardReport || !rosterBoardTeamState) return [];

    const boardTeam = teamById.get(rosterBoardTeamState.teamId);
    if (!boardTeam?.farmCapIdentity) return [];

    const gapFindings = rosterBoardReport.findings.filter((finding) => (
      DRAFT_BOARD_GAP_KINDS.has(finding.kind) && finding.severity !== "info"
    ));

    return sortByTiltedPriority(tiltAnalyzerFindings(gapFindings, boardTeam.farmCapIdentity))
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
  const latestResult = session?.results.at(-1) ?? null;

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

  const handoffPrompt = useMemo(() => {
    if (!session) return "Host setup";
    if (session.state === "NOMINATION") {
      return "Hold - up next.";
    }
    if (session.state === "OPEN_BIDDING") {
      if (auction.currentBidderTeamId && !auction.isCpuTeam(auction.currentBidderTeamId)) {
        return `Pass device to ${teamDisplayName(currentBidder)}`;
      }
      return "Hold - CPUs resolving";
    }
    if (session.state === "RESOLVE" && session.pendingClaim) {
      if (!auction.isCpuTeam(session.pendingClaim.teamId)) return `Pass device to ${teamDisplayName(pendingClaimTeam)}`;
      return "Hold - CPUs resolving";
    }
    if (session.state === "SOLD" || session.state === "PASSED") {
      return "Confirm next lot.";
    }
    if (session.state === "AUCTION_COMPLETE") return "Auction complete.";
    return "Hold - CPUs resolving";
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

  const blockers = useMemo(() => {
    const messages: string[] = [];
    if (!activeLeagueId) messages.push("Select a league to load the farm auction.");
    if (activeLeagueId && leagueTeams.length === 0) messages.push("Selected league has no teams.");
    if (session?.state === "NOMINATION" && availablePoolCandidates.length === 0) messages.push("No nominatable prospects remain.");
    return messages;
  }, [activeLeagueId, availablePoolCandidates.length, leagueTeams.length, session?.state]);

  const beginAuction = () => {
    void auction.initFarmAuction(activeLeagueId, {
      nominationOrderSeed: seed,
      bidIncrement,
      turnTimerSeconds: null,
      excludeFromLeague: true,
    });
  };

  if (leagueData.isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8 flex items-center justify-center">
        <div className="text-lg">Loading farm auction...</div>
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
                FARM AUCTION - scouted values
              </h1>
            </div>
          </div>
          {session?.state === "AUCTION_COMPLETE" && (
            <span className="flex items-center gap-2 bg-[#2F7D46] border-4 border-[#E8E8D8]/40 px-4 py-2 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              FARM AUCTION COMPLETE
            </span>
          )}
        </div>

        {auction.error && (
          <div className="mb-6 bg-[#6B3A3A] border-4 border-[#FFD27A] p-4 text-[#FFE8B0] font-bold">
            {auctionTransitionErrorCopy(auction.error)}
          </div>
        )}

        <div className="mb-6 bg-[#3B7DD8] border-[6px] border-[#E8E8D8] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
          <div className="text-xs text-[#E8E8D8]/70 font-bold">HANDOFF</div>
          <div className="text-xl font-bold">
            Now: {nowTeam ? teamDisplayName(nowTeam) : "Host"} — {nowAction}
          </div>
          <div className="mt-1 text-sm text-[#E8E8D8]/85 font-bold">{handoffPrompt}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <section className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
            <h2 className="font-bold mb-4 text-lg">SETUP</h2>

            <label htmlFor="farm-auction-league" className="block text-xs text-[#E8E8D8]/70 mb-1">LEAGUE</label>
            <select
              id="farm-auction-league"
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

            <label htmlFor="farm-auction-seed" className="block text-xs text-[#E8E8D8]/70 mb-1">SEED</label>
            <input
              id="farm-auction-seed"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              disabled={Boolean(session)}
              className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-3 py-2 text-[#E8E8D8] font-bold focus:border-[#E8E8D8]/60 outline-none mb-4 disabled:opacity-60"
            />

            <div className="grid grid-cols-1 gap-3">
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
                disabled={!activeLeagueId || leagueTeams.length === 0 || auction.isWorking}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#3B7DD8] hover:bg-[#4B8DE8] disabled:opacity-50 disabled:hover:bg-[#3B7DD8] border-4 border-[#E8E8D8] transition font-bold"
              >
                {auction.isWorking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                <span>{auction.isWorking ? "STARTING" : "BEGIN FARM AUCTION"}</span>
              </button>
            )}

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">TEAMS</div>
                <div className="font-bold text-xl">{leagueTeams.length}</div>
              </div>
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">AI CLUBS</div>
                <div className="font-bold text-xl">{auction.cpuTeamIds.length}</div>
              </div>
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3">
                <div className="text-xs text-[#E8E8D8]/60">FARM CAP</div>
                <div className="font-bold text-xl">{auction.farmTierCap ? formatMoney(auction.farmTierCap) : "Pending"}</div>
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
              <button
                type="button"
                aria-label={helpOpen ? "Hide farm auction help" : "Show farm auction help"}
                onClick={() => setHelpOpen((open) => !open)}
                className="ml-auto h-9 w-9 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold"
              >
                ?
              </button>
            </div>

            {helpOpen && (
              <div className="mb-4 space-y-3">
                <AuctionCoachBanner tier="farm" state={session?.state ?? "SETUP"} />
                <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-3 text-sm text-[#E8E8D8]/80">
                  Press and hold Scout report to reveal your scout's private range and grade.
                </div>
              </div>
            )}

            {!session && (
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4 text-[#E8E8D8]/80">
                No active farm auction session. Configure the league, then begin.
              </div>
            )}

            {session?.state === "NOMINATION" && (
              <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                <div className="text-xs text-[#E8E8D8]/60">UP NEXT</div>
                <div className="text-xl font-bold">Next prospect is coming up...</div>
                <div className="mt-1 text-sm text-[#E8E8D8]/70">
                  Available pool: {availablePoolCandidates.length} prospects
                </div>
              </div>
            )}

            {session?.state === "OPEN_BIDDING" && lot && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                    <div className="text-xs text-[#E8E8D8]/60">UP NOW</div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="text-xl font-bold">{prospectDisplayName(currentLotProspect)}</div>
                      {positionBadges(currentLotProspect)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm text-[#E8E8D8]/75">
                      <div>Age {currentLotProspect?.age ?? "N/A"}</div>
                      <LongPressReveal
                        label="Scout report"
                        className="sm:col-span-2 text-left bg-transparent border-0 p-0 text-[#E8E8D8]/75 cursor-pointer hover:text-[#E8E8D8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8E8D8]"
                      >
                        <span className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <span>Scout value {formatScoutRange(currentLotRange)}</span>
                          <span>Scout grade {scoutGradeDisplay(currentLotProspect)}</span>
                          {currentLotRange ? (
                            <>
                              <span>Grade band {currentLotRange.overallGradeBand.best}-{currentLotRange.overallGradeBand.worst}</span>
                              <span>Confidence band {currentLotRange.overallBand}</span>
                              {Object.entries(currentLotRange.toolBands).map(([tool, band]) => (
                                <span key={tool}>{tool.toUpperCase()} {band.lower}-{band.upper}</span>
                              ))}
                            </>
                          ) : null}
                        </span>
                      </LongPressReveal>
                      <div>Opening {formatMoney(lot.openingAsk)}</div>
                    </div>
                  </div>
                  <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                    <div className="text-xs text-[#E8E8D8]/60">HIGH BID</div>
                    <div className="text-xl font-bold">{lot.highBid === null ? "No bid yet" : formatMoney(lot.highBid)}</div>
                    <div className="text-sm text-[#E8E8D8]/70">
                      {lot.highBidder ? teamDisplayName(teamById.get(lot.highBidder)) : "No bidder yet"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                    <div className="text-xs text-[#E8E8D8]/60">CURRENT BIDDER</div>
                    <div className="text-xl font-bold">{teamDisplayName(currentBidder)}</div>
                    <div className="text-sm text-[#E8E8D8]/70">
                      Still in: {lot.stillIn.map((teamId) => teamDisplayName(teamById.get(teamId))).join(", ")}
                    </div>
                  </div>
                  <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                    <div className="text-xs text-[#E8E8D8]/60">YOUR REMAINING BUDGET</div>
                    <div className="text-xl font-bold">{formatMoney(currentBidderTeamState?.budgetRemaining)}</div>
                    <div className="text-sm text-[#E8E8D8]/70">{teamDisplayName(currentBidder)}</div>
                  </div>
                  <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                    <div className="text-xs text-[#E8E8D8]/60">YOUR MAX BID</div>
                    <div className="text-xl font-bold">{formatMoney(currentBidderMaxBid)}</div>
                    <div className="text-sm text-[#FFD27A] font-bold">Teams below the current ask are auto-passed.</div>
                  </div>
                </div>
                <div className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                    <div>
                      <div className="text-xs text-[#E8E8D8]/60">ROSTER SLOTS REMAINING</div>
                      <div className="text-3xl font-bold">{currentBidderTeamState?.rosterSlotsRemaining ?? "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#E8E8D8]/60 mb-2">CURRENT FARM POSITION TALLY</div>
                      {currentRosterTally.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {currentRosterTally.map(([position, count]) => (
                            <span key={position} className="bg-[#2d3d2f] border-2 border-[#E8E8D8]/20 px-2 py-1 text-xs font-bold">
                              {position}: {count}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-[#E8E8D8]/70">No farm auction prospects rostered yet.</div>
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
                              +{multiple}x {formatMoney(amount)}
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
                      ? `${teamDisplayName(pendingClaimTeam)} can claim ${prospectDisplayName(currentLotProspect)} at ${formatMoney(session.pendingClaim.price)}`
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
                  <div className="text-xl font-bold">{latestResult ? resultText(latestResult, prospectById, teamById) : session.state}</div>
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
              <div className="bg-[#2F7D46] border-4 border-[#E8E8D8]/40 p-4 font-bold">
                FARM AUCTION COMPLETE. Farm rosters are filled in the auction session.
                <div className="mt-2 text-sm text-[#E8E8D8]/85">
                  Draft complete. Next: set your league's starting team morale and fan morale, then launch the franchise.
                </div>
                <button
                  onClick={() => navigate(activeLeague ? staffHireRouteForLeague(activeLeague) : "/league-builder/staff-hire")}
                  className="mt-4 px-4 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-4 border-[#E8E8D8] font-bold"
                >
                  Continue to Staff Your Clubs
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
                  {resultText(result, prospectById, teamById)}
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
            tier="farm"
            entries={rosterBoardEntries}
            target={FARM_BOARD_TARGET}
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
