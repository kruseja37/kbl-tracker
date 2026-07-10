import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react";

import {
  FARM_BOARD_TARGET,
  type BoardPriorityGap,
  type DraftBoardEntry,
} from "../components/DraftRosterBoard";
import {
  AuctionStage,
  type AuctionStageVM,
  type LogItemVM,
  type RosterSlotVM,
} from "../components/auction/AuctionStage";
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
  lotOpeningAsk,
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
  assembleFarmWhisper,
  assembleRosterIntelligencePayload,
  type BoardEntry,
  type RosterIntelligencePayload,
} from "../../../engines/rosterIntelligencePayload";
import { toRosterSlotPlayer } from "../../../engines/rosterNeed";
import type { RosterSlotPlayer } from "../../../data/rosterConstruction";
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
const FARM_STAGE_POSITIONS = ["C", "1B", "2B", "SS", "3B", "LF", "CF", "RF", "SP", "RP"] as const;

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function minimumBid(session: AuctionSession): number | null {
  const lot = session.currentLot;
  if (!lot) return null;
  return lot.highBid === null ? lot.openingAsk : lot.highBid + session.config.bidIncrement;
}

function devSeedFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get("devSeed")?.trim();
  return value || null;
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

function prospectTraitCount(prospect: LeagueBuilderProspectPlayerDto | null | undefined): 0 | 1 | 2 | "N/A" {
  if (!prospect) return "N/A";
  return [prospect.trait1, prospect.trait2].filter(Boolean).length as 0 | 1 | 2;
}

// COCKPIT W1d (the MLB bridge): both the MLB Player and the farm prospect DTO carry the same
// primaryPosition/secondaryPosition/trait1/trait2 shape toRosterSlotPlayer (rosterNeed.ts:48)
// expects -- one mapper covers both sides of the bridge (MLB roster shapes AND the candidate
// prospect's own shape), matching the canonical mapper reuse pattern used elsewhere in the app.
function toBridgeRosterShape(entry: {
  primaryPosition: string;
  secondaryPosition?: string | null;
  trait1?: string | null;
  trait2?: string | null;
}): RosterSlotPlayer {
  return toRosterSlotPlayer({
    primaryPosition: entry.primaryPosition,
    secondaryPosition: entry.secondaryPosition,
    traits: [entry.trait1, entry.trait2],
  });
}

// COCKPIT W1d item 5 (the bridge headline, farm "Tier 1"): promotes the top 1-2 already-tilted
// rosterBoardPriorityGaps into a short, team-conditioned retro-voiced line for the whisper's
// always-visible strip. Anti-generic law (design principle 8): this varies with THIS team's actual
// MLB+farm gap findings -- there is no generic fallback sentence when gaps are absent (the strip
// simply doesn't render, per WhisperPanel's bridgeHeadline-is-falsy guard).
// REWORK (audit note (h), 2026-07-08): the gaps' SOURCE team (rosterBoardTeamState, which falls
// back to the first human club when nobody is "on the clock") can transiently differ from the
// whisper's SEAT team in RESOLVE state (pending-claim team). The whisper is a private, seat-only
// read -- another club's gaps must never render in it, so the headline is suppressed on any
// source/seat mismatch. Exported for its unit test.
export function buildFarmBridgeHeadline(
  gaps: readonly BoardPriorityGap[],
  sourceTeamId: string | null | undefined,
  seatTeamId: string | null | undefined,
): string | null {
  if (!sourceTeamId || !seatTeamId || sourceTeamId !== seatTeamId) return null;
  if (gaps.length === 0) return null;
  // "·" mirrors the separator the existing PRIORITY GAPS needline already uses (buildFarmNeedLine
  // above) -- one visual language for gap lists across the farm floor.
  const top = gaps.slice(0, 2).map((gap) => gap.label.replace(/\.$/, "")).join(" · ");
  return `Board flags: ${top} — work the farm floor there first.`;
}

// WT-D: a farm prospect (LeagueBuilderProspectPlayerDto) is a *different* DTO shape from the
// league's `Player` type -- PlayerProfilePopover/buildDraftProfileModel need `Player`. This is a
// presentational-only adapter (page-local, never persisted, never fed back into any engine): a
// prospect's `ratingRevealState` is always the literal 'hidden', so buildDraftProfileModel's
// shouldReveal gate always takes the scout-band branch for these -- the handful of fields with
// widened DTO types (arsenal/personality/chemistry/etc.) are never read on that branch. See
// PlayerProfilePopover.tsx + draftProfileModel.ts (shouldReveal) -- NOT modified by this lane.
function prospectToProfilePlayer(prospect: LeagueBuilderProspectPlayerDto): Player {
  return {
    id: prospect.id,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    gender: prospect.gender,
    jerseyNumber: prospect.jerseyNumber,
    age: prospect.age,
    bats: prospect.bats,
    throws: prospect.throws,
    armSlot: prospect.armSlot,
    primaryPosition: prospect.primaryPosition as Player["primaryPosition"],
    secondaryPosition: prospect.secondaryPosition,
    power: prospect.power,
    contact: prospect.contact,
    speed: prospect.speed,
    fielding: prospect.fielding,
    arm: prospect.arm,
    velocity: prospect.velocity,
    junk: prospect.junk,
    accuracy: prospect.accuracy,
    arsenal: prospect.arsenal as Player["arsenal"],
    overallGrade: prospect.overallGrade as Player["overallGrade"],
    trait1: prospect.trait1,
    trait2: prospect.trait2,
    personality: prospect.personality as Player["personality"],
    chemistry: prospect.chemistry as Player["chemistry"],
    hiddenPersonalityModifiers: prospect.hiddenPersonalityModifiers,
    morale: prospect.morale,
    mojo: prospect.mojo,
    fame: prospect.fame,
    salary: prospect.salary,
    contractYears: prospect.contractYears,
    ratingRevealState: prospect.ratingRevealState,
    isCustom: prospect.isCustom,
    sourceDatabase: prospect.sourceDatabase,
    hometown: prospect.hometown,
    prospectProfile: prospect.prospectProfile,
    createdDate: "",
    lastModified: "",
  };
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
  const ratings = prospectRatings(prospect);
  const overallBand = scoutOverallBandForPosition(position, farmArchetypeKey, ratings);
  const band = scoutOverallGradeBand(
    prospect.prospectProfile.trueGrade,
    scoutOverallTierForPosition(position, farmArchetypeKey, ratings),
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
      ratings,
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

function stagePhaseLabel(state: AuctionSession["state"] | "SETUP"): string {
  if (state === "AUCTION_COMPLETE") return "Farm auction complete";
  if (state === "OPEN_BIDDING") return "Farm auction";
  if (state === "RESOLVE") return "Reserve decision";
  if (state === "SOLD" || state === "PASSED") return "Lot result";
  if (state === "NOMINATION") return "Next nomination";
  return "Farm draft setup";
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
  if (!teamState) return "farm board";
  const filled = FARM_BOARD_TARGET - teamState.rosterSlotsRemaining;
  return `${Math.max(0, filled)} of ${FARM_BOARD_TARGET} farmed`;
}

function farmStageSlotGroup(position: string): RosterSlotVM["group"] {
  const upper = position.toUpperCase();
  if (upper === "SP") return "ROTATION";
  if (upper === "RP" || upper === "CP") return "BULLPEN";
  if (upper.startsWith("FARM")) return "THE BENCH";
  return "THE EIGHT";
}

function buildFarmStageSlots(
  entries: readonly DraftBoardEntry[],
  prospectById: Map<string, LeagueBuilderProspectPlayerDto>,
): RosterSlotVM[] {
  const filled = entries.slice(0, FARM_BOARD_TARGET).map((entry, index) => {
    const pos = entry.primaryPosition || "POS";
    const prospect = prospectById.get(entry.id);
    return {
      slotId: `farm-${index + 1}-${entry.id}`,
      pos,
      group: farmStageSlotGroup(pos),
      who: entry.name,
      chip: prospectPositions({ primaryPosition: entry.primaryPosition, secondaryPosition: entry.secondaryPosition } as LeagueBuilderProspectPlayerDto).join("/") || pos,
      filled: true,
      isGap: false,
      gapLabel: null,
      depthNote: formatMoney(entry.salary),
      // WT-D: resolve the won prospect so the farm roster board can open their (fogged) profile popover.
      player: prospect ? prospectToProfilePlayer(prospect) : null,
    };
  });
  const open = Array.from({ length: Math.max(0, FARM_BOARD_TARGET - filled.length) }, (_, index) => {
    const label = FARM_STAGE_POSITIONS[(filled.length + index) % FARM_STAGE_POSITIONS.length];
    return {
      slotId: `farm-open-${index + 1}`,
      pos: label,
      group: farmStageSlotGroup(label),
      who: "open",
      chip: label,
      filled: false,
      isGap: true,
      gapLabel: "OPEN",
      depthNote: null,
    };
  });
  return [...filled, ...open];
}

function buildFarmNeedLine(
  priorityGaps: readonly BoardPriorityGap[],
  budgetWarning: string | null,
): ReactNode {
  return (
    <>
      {budgetWarning ? <span>{budgetWarning}</span> : <span>Fill 10 farm slots without exposing true prospect numbers.</span>}
      {priorityGaps.length > 0 && (
        <span style={{ display: "block", marginTop: 6 }}>
          <b>PRIORITY GAPS</b>: {priorityGaps.map((gap) => gap.label).join(" · ")}
        </span>
      )}
    </>
  );
}

function buildFarmStageLog(
  session: AuctionSession | null,
  prospectById: Map<string, LeagueBuilderProspectPlayerDto>,
  teamById: Map<string, Team>,
): LogItemVM[] {
  if (!session) return [];
  return session.results.slice(-6).reverse().map((result) => {
    const prospect = prospectById.get(result.playerId);
    const player = prospect ? prospectToProfilePlayer(prospect) : null;
    return {
      kind: result.disposition === "SOLD" ? "won" : result.disposition === "PASSED" ? "gone" : "rival",
      text: resultText(result, prospectById, teamById),
      amount: result.disposition === "SOLD" ? result.salary ?? undefined : undefined,
      // CALLFIX Item 3: the 4th popover surface -- fog-gated same as every other farm popover
      // (AuctionStage passes revealFull={vm.tier !== "farm"}). namePrefix is the exact leading
      // substring of `text` (resultText always starts with prospectDisplayName).
      player,
      ...(prospect ? { namePrefix: prospectDisplayName(prospect) } : {}),
    };
  });
}

export function LeagueBuilderFarmAuctionDraft() {
  const navigate = useNavigate();
  const auction = useFarmAuctionDraft();
  const { leagueData, loadFarmAuction, session } = auction;
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const loadedKeyRef = useRef<string | null>(null);
  const startedKeyRef = useRef<string | null>(null);
  const requestedLeagueId = useMemo(() => leagueIdFromSearch(window.location.search), []);
  const requestedDevSeed = useMemo(() => devSeedFromSearch(window.location.search), []);

  useEffect(() => {
    if (!activeLeagueId && leagueData.leagues.length > 0) {
      setActiveLeagueId(resolveInitialLeagueId(leagueData.leagues, requestedLeagueId));
    }
  }, [activeLeagueId, leagueData.leagues, requestedLeagueId]);

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

  useEffect(() => {
    if (!activeLeagueId || leagueTeams.length === 0) return;
    const key = `${activeLeagueId}:farm:1`;
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    void loadFarmAuction(activeLeagueId).then((loaded) => {
      if (loaded || startedKeyRef.current === key) return;
      startedKeyRef.current = key;
      void auction.initFarmAuction(activeLeagueId, {
        nominationOrderSeed: requestedDevSeed ?? DEFAULT_FARM_AUCTION_SEED,
        bidIncrement: 1000,
        turnTimerSeconds: null,
        excludeFromLeague: true,
      });
    });
  }, [activeLeagueId, auction, leagueTeams.length, loadFarmAuction, requestedDevSeed]);

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
  const activeSeed = session?.config.nominationOrderSeed ?? requestedDevSeed ?? DEFAULT_FARM_AUCTION_SEED;
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

  // P4: Assistant-GM whisper for farm lots (mirrors the MLB whisperPayload useMemo in
  // LeagueBuilderAuctionDraft.tsx, gated the same way -- only the human seat actually on the
  // clock during OPEN_BIDDING/RESOLVE gets a read, never a CPU club).
  const whisperSeatTeamId = useMemo(() => {
    if (!session) return null;
    if (session.state === "OPEN_BIDDING") return auction.currentBidderTeamId;
    if (session.state === "RESOLVE") return session.pendingClaim?.teamId ?? null;
    return null;
  }, [auction.currentBidderTeamId, session]);

  // COCKPIT W1d item 4(i) (REWORKED per audit fog-law finding, 2026-07-08): a REAL farm board --
  // remaining prospects ranked AND displayed by `range.displayedEstimate`, the seeded, jittered,
  // fog-CARRYING scout point estimate (archetypeBandValueRange, the SAME scout math the
  // on-the-block lot already uses). NEVER the band midpoint: the band is built SYMMETRIC around
  // the true opening ask (low = ask*(1-w), high = ask*(1+w)), so (low+high)/2 === lotOpeningAsk
  // === a pure function of TRUE IV -- the midpoint cancels the fog exactly (corrected fog rule,
  // DRAFT_COCKPIT_DESIGN §2.5: on any fogged surface, no derived quantity may be an exact
  // deterministic function of a true-value anchor). Only the current lot carries a live opening
  // ask, so every OTHER remaining prospect gets a hypothetical one via the exported, pure
  // `lotOpeningAsk` -- consumed ONLY as archetypeBandValueRange's input, never surfaced.
  const farmBoardEntries = useMemo<BoardEntry[]>(() => {
    if (!session || !whisperSeatTeamId) return [];
    const farmArchetypeKey = teamById.get(whisperSeatTeamId)?.farmArchetypeKey;
    const currentLotId = session.currentLot?.playerId;
    return session.availablePlayerIds
      .filter((playerId) => playerId !== currentLotId)
      .map((playerId): BoardEntry | null => {
        const auctionPlayer = session.players[playerId];
        const prospect = prospectById.get(playerId);
        if (!auctionPlayer || !prospect) return null;
        const openingAsk = lotOpeningAsk(auctionPlayer, session.config);
        const range = scoutRangeForProspect({
          prospect,
          auctionPlayer,
          openingAsk,
          teamId: whisperSeatTeamId,
          farmArchetypeKey,
          seed: activeSeed,
        });
        if (!range) return null;
        return {
          playerId,
          // Fog law: the displayed/ranking worth is the jittered scout estimate -- NOT the band
          // midpoint, which algebraically reconstructs the true-IV-derived reserve (see the
          // useMemo doc comment above).
          worth: range.displayedEstimate,
          matchedShape: prospect.primaryPosition,
          needTag: null,
          fitTag: null,
          note: prospectDisplayName(prospect),
        };
      })
      .filter((entry): entry is BoardEntry => entry !== null)
      .sort((a, b) => b.worth - a.worth);
  }, [activeSeed, prospectById, session, teamById, whisperSeatTeamId]);

  // WT-D pattern: board rows open the (fogged) profile popover the same way the on-the-block lot
  // and won-roster names already do.
  const farmBoardPlayers = useMemo(() => {
    const map: Record<string, Player> = {};
    for (const entry of farmBoardEntries) {
      const prospect = prospectById.get(entry.playerId);
      if (prospect) map[entry.playerId] = prospectToProfilePlayer(prospect);
    }
    return map;
  }, [farmBoardEntries, prospectById]);

  const farmWhisperPayload = useMemo<RosterIntelligencePayload | null>(() => {
    if (!session || !session.currentLot) return null;
    if (!whisperSeatTeamId || auction.isCpuTeam(whisperSeatTeamId)) return null;
    // currentLotRange/currentLotScoutTeamId are already scoped to whoever's scout lens applies
    // to the CURRENT lot; only build the whisper when that matches the seat on the clock.
    if (currentLotScoutTeamId !== whisperSeatTeamId || !currentLotRange) return null;

    const teamState = teamStateById.get(whisperSeatTeamId);
    const team = teamById.get(whisperSeatTeamId);
    if (!teamState || !team) return null;

    const lotPlayerId = session.currentLot.playerId;

    // COCKPIT W1d (the MLB bridge, §2.5): the seat's ALREADY-COMPLETE MLB roster, mapped through
    // toRosterSlotPlayer (rosterNeed.ts:48) to the SAME legality shape rosterNeedBreakdown /
    // depthReport expect. Empty when the roster can't be resolved -- assembleFarmWhisper falls
    // back permissively (neutral need, SHAPE stays an honest 'unknown' stub).
    const mlbRosterShapes: RosterSlotPlayer[] = (auction.mlbRosterPlayerIdsByTeamId[whisperSeatTeamId] ?? [])
      .map((playerId) => playerById.get(playerId))
      .filter((mlbPlayer): mlbPlayer is Player => Boolean(mlbPlayer))
      .map((mlbPlayer) => toBridgeRosterShape(mlbPlayer));
    const candidateShape = currentLotProspect ? toBridgeRosterShape(currentLotProspect) : null;

    const assembly = assembleFarmWhisper({
      candidateId: lotPlayerId,
      band: {
        low: currentLotRange.low,
        high: currentLotRange.high,
        displayedEstimate: currentLotRange.displayedEstimate,
      },
      budgetRemaining: teamState.budgetRemaining,
      rosterSlotsRemaining: teamState.rosterSlotsRemaining,
      minSalary: teamState.minSalary,
      nextBid: minBid ?? currentLotRange.low,
      currentBid: session.currentLot.highBid,
      bidIncrement: session.config.bidIncrement,
      mlbRosterShapes,
      candidateShape,
      // COCKPIT W1d fork 3 (dark-first): wired but inert while FARM_CHEM_FIT_ENABLED is false.
      prospectChemistry: currentLotProspect?.chemistry ?? null,
      mlbRosterChemistryCounts: auction.mlbRosterChemistryByTeamId[whisperSeatTeamId],
      // CALLFIX Item 1: THE LIVE CALL 'lead' rung -- same ladder as MLB.
      seatIsHighBidder: session.currentLot.highBidder === whisperSeatTeamId,
    });

    return Object.assign(
      assembleRosterIntelligencePayload({
        seatTeamId: whisperSeatTeamId,
        generatedAtLotIndex: session.results.length,
        market: assembly.market,
        worthToYou: assembly.worth,
        board: farmBoardEntries,
        scorecard: assembly.scorecard,
      }),
      {
        seatClubName: teamDisplayName(team),
        seatPrimary: team.colors.primary,
        currentLotPlayerId: lotPlayerId,
        currentHighBid: session.currentLot.highBid,
        objectPronoun: currentLotProspect?.gender === "F" ? "her" : "him",
        boardPlayers: farmBoardPlayers,
        // COCKPIT W1d item 5: the bridge headline, promoted from the already-tilted priority gaps.
        // Suppressed whenever the gaps' source team isn't the whisper's seat team (audit note (h)).
        bridgeHeadline: buildFarmBridgeHeadline(
          rosterBoardPriorityGaps,
          rosterBoardTeamState?.teamId ?? null,
          whisperSeatTeamId,
        ),
        chemFitLabel: assembly.chemFitLabel,
      },
    );
  }, [
    auction,
    currentLotProspect,
    currentLotRange,
    currentLotScoutTeamId,
    farmBoardEntries,
    farmBoardPlayers,
    minBid,
    playerById,
    rosterBoardPriorityGaps,
    rosterBoardTeamState,
    session,
    teamById,
    teamStateById,
    whisperSeatTeamId,
  ]);

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

  const nowAction =
    session?.state === "NOMINATION" ? "surface next lot" :
    session?.state === "OPEN_BIDDING" ? "raise or pass" :
    session?.state === "RESOLVE" && session.pendingClaim ? "claim at reserve or pass" :
    (session?.state === "SOLD" || session?.state === "PASSED") ? "confirm next lot" :
    session?.state === "AUCTION_COMPLETE" ? "auction complete" :
    "setup";
  // FLOORREFIT Move 1: the farm floor's status.teamName is ALWAYS stageFocusTeamName (unlike MLB,
  // which conditions it per-state) -- kept that way here (layout-only scope), just adding the two
  // signals the banner needs on top of the same already-computed "acting team" concept.
  const nowTurnKind: "bid" | "nomination" | undefined =
    session?.state === "NOMINATION" ? "nomination" :
    session?.state === "OPEN_BIDDING" || (session?.state === "RESOLVE" && Boolean(session.pendingClaim)) ? "bid" :
    undefined;

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

  const stageFocusTeamState = currentBidderTeamState ?? (
    session?.pendingClaim ? teamStateById.get(session.pendingClaim.teamId) ?? null : null
  ) ?? (
    latestResult?.disposition === "SOLD" && latestResult.winnerTeamId
      ? teamStateById.get(latestResult.winnerTeamId) ?? null
      : null
  ) ?? rosterBoardTeamState;
  const stageFocusTeam = stageFocusTeamState ? teamById.get(stageFocusTeamState.teamId) ?? null : currentBidder ?? pendingClaimTeam;
  const stageFocusTeamName = stageFocusTeamState
    ? teamDisplayName(teamById.get(stageFocusTeamState.teamId))
    : stageFocusTeam
      ? teamDisplayName(stageFocusTeam)
      : "Farm roster";
  // FLOORREFIT Move 1: an independently-correct CPU/shill signal for the acting team named by
  // status.teamName (stageFocusTeamName above) -- NOT derived from move.cpuTurnName, which this
  // floor always leaves null (see the FLOORREFIT contract's honest finding).
  const stageFocusTeamIsCpu = stageFocusTeam ? auction.isCpuTeam(stageFocusTeam.id) : false;
  const stageMaxBid = session && stageFocusTeamState
    ? getTeamAuctionMaxBid(session, stageFocusTeamState.teamId)
    : currentBidderMaxBid;
  const stageBidAmount = clampBidAmount(Number(bidAmount)) ?? minBid ?? session?.pendingClaim?.price ?? 0;
  const bidIncrement = session?.config.bidIncrement ?? 1000;
  const stageBidPresets = useMemo(() => {
    if (!session || minBid === null) return [];
    const values = [minBid, minBid + bidIncrement, minBid + bidIncrement * 2, minBid + bidIncrement * 5];
    return values.map((amount) => ({
      label: amount === minBid ? "ASK" : `+${formatMoney(amount - minBid)}`,
      amount,
      enabled: stageMaxBid !== null && amount <= stageMaxBid && !auction.isWorking && !currentBidderIsCpu,
      selected: clampBidAmount(Number(bidAmount)) === amount,
    }));
  }, [auction.isWorking, bidAmount, bidIncrement, clampBidAmount, currentBidderIsCpu, minBid, session, stageMaxBid]);
  const stageSlots = useMemo(
    () => buildFarmStageSlots(rosterBoardEntries, prospectById),
    [rosterBoardEntries, prospectById],
  );
  const stageLog = useMemo(
    () => buildFarmStageLog(session, prospectById, teamById),
    [prospectById, session, teamById],
  );
  const stageLotProspect = currentLotProspect ?? (latestResult ? prospectById.get(latestResult.playerId) ?? null : null);
  const stagePendingClaim = session?.pendingClaim ?? null;
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
    session?.state === "AUCTION_COMPLETE" ? "STAFF YOUR CLUBS" :
    undefined;
  const stageSecondaryLabel =
    session?.state === "RESOLVE" && stagePendingClaim ? "Pass on reserve" :
    session?.state === "OPEN_BIDDING" ? "Let prospect go" :
    "No pass";
  const auctionStageVm: AuctionStageVM | null = session ? {
    tier: "farm",
    status: {
      phaseLabel: stagePhaseLabel(session.state),
      lotLabel: stageLotLabel(session),
      rosterLabel: stageRosterLabel(stageFocusTeamState),
      nowText: session.state === "OPEN_BIDDING" && auction.currentBidderTeamId
        ? `${teamDisplayName(teamById.get(auction.currentBidderTeamId))} — ${nowAction}`
        : session.state === "RESOLVE" && session.pendingClaim
          ? `${teamDisplayName(teamById.get(session.pendingClaim.teamId))} — ${nowAction}`
          : nowAction,
      teamName: stageFocusTeamName,
      teamId: stageFocusTeam?.id,
      teamPrimary: stageFocusTeam?.colors.primary ?? "var(--ballpark-brass)",
      teamSecondary: stageFocusTeam?.colors.secondary ?? "var(--ballpark-chalk)",
      turnKind: nowTurnKind,
      actingTeamIsCpu: stageFocusTeamIsCpu,
    },
    lot: {
      lotId: lot?.playerId ?? latestResult?.playerId ?? null,
      // WT-D: lets the on-the-block name open the profile popover -- the prospect's
      // ratingRevealState is always 'hidden' so buildDraftProfileModel always renders the
      // scout-band view (never true ratings/trait names) for a not-yet-revealed prospect.
      player: stageLotProspect ? prospectToProfilePlayer(stageLotProspect) : null,
      name: stageLotProspect ? prospectDisplayName(stageLotProspect) : session.state === "AUCTION_COMPLETE" ? "Farm auction complete" : "Next prospect surfacing",
      positions: prospectPositions(stageLotProspect).join(" / ") || "POS",
      personality: "",
      chemistry: "",
      traitCountLabel: `Traits ${prospectTraitCount(stageLotProspect)}`,
      age: stageLotProspect?.age,
      objectPronoun: "him",
      scout: currentLotRange ? {
        rangeLow: currentLotRange.low,
        rangeHigh: currentLotRange.high,
        mid: currentLotRange.displayedEstimate,
        grade2080: stageLotProspect?.prospectProfile.scoutedGrade
          ? gradeToTwentyEighty(stageLotProspect.prospectProfile.scoutedGrade)
          : 50,
        confidence: currentLotRange.overallBand === 3 ? "High" : currentLotRange.overallBand === 7 ? "Low" : "Medium",
        confidenceNote: "Farm archetype band.",
        valueLabel: formatScoutRange(currentLotRange),
        gradeLabel: stageLotProspect?.prospectProfile.scoutedGrade
          ? `${stageLotProspect.prospectProfile.scoutedGrade} (${gradeToTwentyEighty(stageLotProspect.prospectProfile.scoutedGrade)})`
          : "N/A",
        gradeBandLabel: `${currentLotRange.overallGradeBand.best}-${currentLotRange.overallGradeBand.worst}`,
        confidenceBandLabel: String(currentLotRange.overallBand),
        toolBands: Object.entries(currentLotRange.toolBands).map(([tool, band]) => ({
          label: tool.toUpperCase(),
          lower: band.lower,
          upper: band.upper,
        })),
      } : undefined,
      reserveAsk: lot?.openingAsk ?? stagePendingClaim?.price ?? null,
      reserveLabel: "OPENING",
      highBid: lot?.highBid !== null && lot?.highBid !== undefined
        ? {
            amount: lot.highBid,
            by: lot.highBidder ? teamDisplayName(teamById.get(lot.highBidder)) : "opening",
            isYou: Boolean(lot.highBidder && !auction.isCpuTeam(lot.highBidder)),
            // FLOORREFIT Move 4: holder swatch data -- absent (undefined) when the holder can't be
            // resolved, which renders the name exactly as before, no swatch.
            byTeamPrimary: lot.highBidder ? teamById.get(lot.highBidder)?.colors.primary : undefined,
            byAbbreviation: lot.highBidder ? teamById.get(lot.highBidder)?.abbreviation : undefined,
          }
        : null,
    },
    move: {
      walletLabel: `${stageFocusTeamName} wallet`,
      wallet: stageFocusTeamState?.budgetRemaining ?? 0,
      maxBid: stageMaxBid ?? 0,
      slotsLeft: stageFocusTeamState?.rosterSlotsRemaining ?? 0,
      ceilingNote: session.pendingClaim
        ? `${teamDisplayName(teamById.get(session.pendingClaim.teamId))} can claim at reserve or let the prospect leave the board.`
        : stageMaxBid !== null && minBid !== null && minBid > stageMaxBid
          ? `Can't afford this prospect and still fill the farm - ${formatMoney(minBid - stageMaxBid)} short.`
          : stageMaxBid !== null
            ? `Room up to ${formatMoney(stageMaxBid)} while keeping money for the empty farm slots.`
            : "Farm wallet read pending.",
      presets: stageBidPresets,
      currentBid: stageBidAmount,
      canBid: stageCanPrimary,
      canPass: stageCanPass,
      primaryLabel: stagePrimaryLabel,
      secondaryLabel: stageSecondaryLabel,
      cpuTurnName: null,
      cpuDecision: null,
    },
    board: {
      title: `${stageFocusTeamName} · ${rosterBoardEntries.length} of ${FARM_BOARD_TARGET}`,
      hint: rosterBoardBudgetWarning ? "budget watch" : "farm gaps",
      columns: 5,
      slots: stageSlots,
      needLine: buildFarmNeedLine(rosterBoardPriorityGaps, rosterBoardBudgetWarning),
    },
    log: stageLog,
    help: (
      <>
        <b>Scout report</b> stays covered by default. The range, grade band, confidence band, and tool bands come from the farm archetype.
      </>
    ),
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
      navigate(activeLeague ? staffHireRouteForLeague(activeLeague) : "/league-builder/staff-hire");
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

  const toolbar = (
    <div className="row" style={{ marginBottom: 14 }}>
      <button
        type="button"
        aria-label="Back to League Builder"
        onClick={() => navigate("/league-builder")}
        className="help-toggle"
      >
        <ArrowLeft size={16} /> Back
      </button>
      <span className="chip">Farm auction</span>
      {auction.isWorking && (
        <span className="chip">
          <RefreshCw size={14} className="animate-spin" /> Syncing
        </span>
      )}
      {auction.farmTierCap ? <span className="chip">Farm cap {formatMoney(auction.farmTierCap)}</span> : null}
      {auction.cpuTeamIds.length > 0 ? <span className="chip">AI clubs {auction.cpuTeamIds.length}</span> : null}
    </div>
  );
  if (leagueData.isLoading) {
    return (
      <div className="auc-root">
        <div className="wrap">
          <div className="card">Loading farm auction...</div>
        </div>
      </div>
    );
  }

  if (leagueData.error) {
    return (
      <div className="auc-root">
        <div className="wrap">
          <div className="card loss">Error: {leagueData.error}</div>
        </div>
      </div>
    );
  }

  if (blockers.length > 0) {
    return (
      <div className="auc-root">
        <div className="wrap">
          {toolbar}
          <div className="card">
            <div className="eyebrow">Blocked</div>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {blockers.map((blocker) => (
                <div key={blocker} className="row">
                  <ShieldAlert size={16} />
                  <span>{blocker}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!auctionStageVm) {
    return (
      <div className="auc-root">
        <div className="wrap">
          {toolbar}
          <div className="card">
            <div className="row">
              <RefreshCw size={16} className="animate-spin" />
              <span>{auction.isWorking ? "Starting farm auction..." : "Preparing farm auction..."}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuctionStage
      vm={auctionStageVm}
      whisperPayload={farmWhisperPayload}
      toolbar={(
        <>
          {toolbar}
          {auction.error && (
            <div className="card" style={{ marginBottom: 14, color: "var(--auc-loss)" }}>
              {auctionTransitionErrorCopy(auction.error)}
            </div>
          )}
        </>
      )}
      onSelectPreset={(amount) => setBidAmount(String(Math.round(amount)))}
      onBid={handleStagePrimary}
      onPass={handleStageSecondary}
    />
  );
}
