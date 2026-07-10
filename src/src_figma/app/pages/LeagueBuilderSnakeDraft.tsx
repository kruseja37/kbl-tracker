import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Repeat2,
  ShieldAlert,
  Shuffle,
  TrendingUp,
} from "lucide-react";

import { LEGAL_ROSTER, type RosterSlotPlayer } from "../../../data/rosterConstruction";
import { HISTORICAL_ARCHETYPES } from "../../../data/historicalArchetypes";
import { BEST22_TUNING } from "../../../engines/best22Target";
import { historicalToSimArchetype } from "../../../engines/draftabilityRanker";
import { resolveClubBandPriorities } from "../../../engines/archetypeIdentity";
import { archetypeFitScorer, type SimPlayer } from "../../../engines/archetypeBalanceSimulator";
import {
  auctionMarginalTaxWithCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from "../../../engines/auctionLuxuryTax";
import { cheapestLegalCompletion } from "../../../engines/auctionCompletionFloor";
import { ownNeedMultiplier } from "../../../engines/auctionMarketModel";
import {
  buildSnakeOrder,
  validateTrade,
  type ConstructionPlayer,
  type TradeVerdict,
} from "../../../engines/leagueConstruction";
import { rosterNeedBreakdown, toRosterSlotPlayer } from "../../../engines/rosterNeed";
import { assembleBoard } from "../../../engines/rosterIntelligencePayload";
import {
  SNAKE_POC_TUNING,
  commitSnakeDraftPick,
  detectSnakePositionRun,
  evaluateSnakePick,
  executeSnakePickTrade,
  forecastSnakeAvailability,
  pickSnakeCpuCandidate,
  scoreSnakeCpuCandidate,
  seededSnakeShuffle,
  type SnakeAvailabilityForecast,
  type SnakeDraftPlayerModel,
  type SnakeDraftRosterEntry,
  type SnakePickGuard,
} from "../../../engines/snakeDraftPoc";
import { isSnakeDraftPocEnabled } from "../../../utils/franchisePhase2Flags";
import {
  createMlbDraftSessionId,
  resolveLeagueSalaryCap,
} from "../../../utils/leagueBuilderStorage";
import {
  toConstructionPlayer,
  useLeagueBuilderData,
  type LeagueBuilderMlbDraftSession,
  type LeagueTemplate,
  type Player,
  type RegisteredPool,
  type Team,
} from "../../hooks/useLeagueBuilderData";

const MLB_DRAFT_ROUNDS = LEGAL_ROSTER.size;
const MLB_DRAFT_SEASON = 1;
const MLB_DRAFT_WORKFLOW_VERSION = "snake-draft-poc-v1";
const MLB_DRAFT_ENGINE_METHOD_VERSION = "snakeDraftPoc.v1";
const BOARD_PAGE_SIZE = 36;
const CPU_TICK_MS = 350;

type BoardSort = "STEAL" | "TRUE COST" | "IV" | "POSITION";

interface TeamDraftState {
  team: Team;
  roster: SnakeDraftRosterEntry[];
  spent: number;
  tax: number;
  headroom: number;
}

interface BoardModel {
  player: Player;
  model: SnakeDraftPlayerModel;
  blendedBoardValue: number;
  needMultiplier: number;
  fitMultiplier: number;
  marginalTax: number;
  trueCost: number;
  steal: number;
}

interface VisibleBoardModel extends BoardModel {
  guard: SnakePickGuard;
}

function teamDisplayName(team: Team): string {
  return team.location ? `${team.location} ${team.name}` : team.name;
}

function playerDisplayName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim() || player.id;
}

function leagueIdFromSearch(search: string): string | null {
  return new URLSearchParams(search).get("leagueId");
}

function resolveInitialLeagueId(
  leagues: readonly Pick<LeagueTemplate, "id">[],
  requestedLeagueId: string | null,
): string {
  if (requestedLeagueId && leagues.some((league) => league.id === requestedLeagueId)) {
    return requestedLeagueId;
  }
  return leagues[0]?.id ?? "";
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function playerToSimPlayer(player: Player, iv: number): SimPlayer {
  const construction = toConstructionPlayer(player);
  const shape = toRosterSlotPlayer({
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition ?? null,
    traits: [player.trait1, player.trait2],
  });
  return {
    ...construction,
    iv,
    salary: iv,
    position: player.primaryPosition,
    secondaryPosition: player.secondaryPosition ?? null,
    twoWayVariant: shape.twoWayVariant,
  };
}

function modelFromPlayer(player: Player, poolPlayer: RegisteredPool["players"][number]): SnakeDraftPlayerModel {
  return {
    playerId: player.id,
    iv: poolPlayer.iv,
    position: player.primaryPosition,
    shape: toRosterSlotPlayer({
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition ?? null,
      traits: [player.trait1, player.trait2],
    }),
    construction: toConstructionPlayer(player),
  };
}

function forecastBand(survival: number | null): { label: string; className: string } {
  if (survival === null) return { label: "FORECAST BUILDING", className: "text-[var(--ballpark-chalk)]/55" };
  if (survival >= 0.85) return { label: "SAFE", className: "text-[var(--ballpark-boost-green)]" };
  if (survival >= 0.6) return { label: "LIKELY", className: "text-[#C4A853]" };
  if (survival >= 0.35) return { label: "COIN FLIP", className: "text-[#E8A15A]" };
  return { label: "GONE", className: "text-[#E67D6F]" };
}

function guardClass(guard: SnakePickGuard): string {
  if (guard.tone === "blocked") return "bg-[#4A1F1F] text-[#FFD27A] border-[#9B2F2F]";
  if (guard.tone === "tight") return "bg-[#4D4325] text-[#F3DB8E] border-[#C4A853]";
  return "bg-[#223D28] text-[#BEE8C2] border-[#5E9B69]";
}

function guardLabel(guard: SnakePickGuard): string {
  if (guard.tone === "blocked") return "NO ROOM";
  if (guard.tone === "tight") return "TIGHT";
  return "CLEAR";
}

function togglePick(current: readonly number[], pick: number, max = 3): number[] {
  if (current.includes(pick)) return current.filter((value) => value !== pick);
  return current.length >= max ? [...current] : [...current, pick].sort((a, b) => a - b);
}

function buildTeamState(input: {
  team: Team;
  session: LeagueBuilderMlbDraftSession | null;
  modelById: ReadonlyMap<string, SnakeDraftPlayerModel>;
  pool: RegisteredPool | null;
  tierCap: number;
  realTeamCount: number;
}): TeamDraftState {
  const picks = input.session?.completedPicks.filter((pick) => pick.teamId === input.team.id) ?? [];
  const roster: SnakeDraftRosterEntry[] = picks.flatMap((pick) => {
    const model = input.modelById.get(pick.playerId);
    return model ? [{ ...model, settledSalary: pick.settledSalary ?? model.iv }] : [];
  });
  let tax = 0;
  const constructions: ConstructionPlayer[] = [];
  const normalizedBaseCaps = input.pool
    ? normalizeAuctionLuxuryCapsForLeagueSize(input.pool.luxuryCaps, input.realTeamCount)
    : [];
  for (const pick of picks) {
    const model = input.modelById.get(pick.playerId);
    if (!model || !input.pool) continue;
    const marginal = pick.marginalTax ?? auctionMarginalTaxWithCaps(
      constructions,
      model.construction,
      input.team.capIdentity,
      normalizedBaseCaps,
    );
    tax += marginal;
    constructions.push(model.construction);
  }
  const spent = roster.reduce((sum, entry) => sum + entry.settledSalary, 0);
  return {
    team: input.team,
    roster,
    spent,
    tax,
    headroom: input.tierCap - spent - tax,
  };
}

function buildBoardModels(input: {
  teamState: TeamDraftState;
  available: readonly SnakeDraftPlayerModel[];
  playerById: ReadonlyMap<string, Player>;
  tier: RegisteredPool["tier"];
  pool: RegisteredPool;
  useRankOverrides: boolean;
  realTeamCount: number;
}): BoardModel[] {
  const rosterPlayers = input.teamState.roster.flatMap((entry) => {
    const player = input.playerById.get(entry.playerId);
    return player ? [player] : [];
  });
  const need = rosterNeedBreakdown(input.teamState.roster.map((entry) => entry.shape));
  const historical = input.teamState.team.mlbArchetypeKey
    ? HISTORICAL_ARCHETYPES.find((row) => row.id === input.teamState.team.mlbArchetypeKey)
    : undefined;
  const fitScorer = historical ? archetypeFitScorer(historicalToSimArchetype(historical), input.tier) : null;
  const fitRows = input.available.map((model) => {
    const player = input.playerById.get(model.playerId);
    return {
      playerId: model.playerId,
      score: fitScorer && player ? fitScorer(playerToSimPlayer(player, model.iv)) : 0,
    };
  });
  const fitMean = fitRows.length
    ? fitRows.reduce((sum, row) => sum + row.score, 0) / fitRows.length
    : 0;
  const fitSigma = standardDeviation(fitRows.map((row) => row.score));
  const fitZById = new Map(fitRows.map((row) => [
    row.playerId,
    fitSigma > 0 ? (row.score - fitMean) / fitSigma : 0,
  ]));
  const board = assembleBoard({
    candidates: input.available.flatMap((model) => {
      const player = input.playerById.get(model.playerId);
      if (!player) return [];
      return [{
        playerId: model.playerId,
        iv: model.iv,
        candidate: player,
        shape: model.shape,
        identityZ: fitZById.get(model.playerId) ?? 0,
      }];
    }),
    rosterPlayers,
    need,
    rankOverrides: input.useRankOverrides ? input.teamState.team.boardRankOverrides : undefined,
  });
  const worthScale = standardDeviation(board.map((entry) => entry.worth)) || 1;
  const worthById = new Map(board.map((entry) => [entry.playerId, entry.worth]));
  const bandPriorities = resolveClubBandPriorities(input.teamState.team);
  const openSlots = Math.max(1, LEGAL_ROSTER.size - input.teamState.roster.length);
  const normalizedBaseCaps = normalizeAuctionLuxuryCapsForLeagueSize(
    input.pool.luxuryCaps,
    input.realTeamCount,
  );

  return input.available.flatMap((model) => {
    const player = input.playerById.get(model.playerId);
    if (!player) return [];
    const rank = input.useRankOverrides
      ? input.teamState.team.boardRankOverrides?.global?.indexOf(model.playerId) ?? -1
      : -1;
    const rankBonus = rank >= 0 ? (BEST22_TUNING.gmPreferenceWeight / (1 + rank)) * worthScale : 0;
    const blendedBoardValue = (worthById.get(model.playerId) ?? model.iv) + rankBonus;
    const fitZ = fitZById.get(model.playerId) ?? 0;
    const fitMultiplier = bandPriorities
      ? Math.max(0.88, Math.min(1.12, 1 + fitZ * 0.06))
      : 1;
    const needMultiplier = ownNeedMultiplier(need, model.shape, openSlots);
    const marginalTax = auctionMarginalTaxWithCaps(
      input.teamState.roster.map((entry) => entry.construction),
      model.construction,
      input.teamState.team.capIdentity,
      normalizedBaseCaps,
    );
    const trueCost = model.iv + marginalTax;
    return [{
      player,
      model,
      blendedBoardValue,
      needMultiplier,
      fitMultiplier,
      marginalTax,
      trueCost,
      steal: blendedBoardValue * needMultiplier * fitMultiplier - trueCost,
    }];
  });
}

export function LeagueBuilderSnakeDraft() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    leagues,
    teams,
    players,
    isLoading,
    error,
    getRegisteredPool,
    getMlbDraftSession,
    saveMlbDraftSession,
  } = useLeagueBuilderData();
  const requestedLeagueId = useMemo(() => leagueIdFromSearch(location.search), [location.search]);
  const [activeLeagueId, setActiveLeagueId] = useState("");
  const [seed, setSeed] = useState("snake-poc-1");
  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [pool, setPool] = useState<RegisteredPool | null>(null);
  const [session, setSession] = useState<LeagueBuilderMlbDraftSession | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cpuTicker, setCpuTicker] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [boardSort, setBoardSort] = useState<BoardSort>("STEAL");
  const [boardPage, setBoardPage] = useState(0);
  const [forecast, setForecast] = useState<SnakeAvailabilityForecast | null>(null);
  const [forecastBusy, setForecastBusy] = useState(false);
  const forecastCacheRef = useRef(new Map<string, SnakeAvailabilityForecast>());
  const [tradeCpuTeamId, setTradeCpuTeamId] = useState("");
  const [humanTradePicks, setHumanTradePicks] = useState<number[]>([]);
  const [cpuTradePicks, setCpuTradePicks] = useState<number[]>([]);
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeLeagueId && leagues.length > 0) {
      setActiveLeagueId(resolveInitialLeagueId(leagues, requestedLeagueId));
    }
  }, [activeLeagueId, leagues, requestedLeagueId]);

  const activeLeague = useMemo(
    () => leagues.find((league) => league.id === activeLeagueId) ?? null,
    [activeLeagueId, leagues],
  );
  const leagueTeams = useMemo(() => {
    if (!activeLeague?.teamIds.length) return [];
    return activeLeague.teamIds.flatMap((teamId) => {
      const team = teams.find((candidate) => candidate.id === teamId);
      return team ? [team] : [];
    });
  }, [activeLeague, teams]);
  const humanTeam = useMemo(
    () => leagueTeams.find((team) => team.controlledBy === "human")
      ?? leagueTeams.find((team) => team.controlledBy !== "ai")
      ?? null,
    [leagueTeams],
  );
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const poolById = useMemo(() => new Map((pool?.players ?? []).map((row) => [row.id, row])), [pool]);
  const modelById = useMemo(() => new Map((pool?.players ?? []).flatMap((poolPlayer) => {
    const player = playerById.get(poolPlayer.id);
    return player ? [[poolPlayer.id, modelFromPlayer(player, poolPlayer)] as const] : [];
  })), [playerById, pool]);
  const tierCap = activeLeague ? resolveLeagueSalaryCap(activeLeague) : pool?.tierCap ?? 0;

  const loadDraftState = useCallback(async (leagueId: string) => {
    setActionError(null);
    try {
      const existingPool = await getRegisteredPool(leagueId);
      const nextPool = existingPool;
      const nextSession = await getMlbDraftSession(leagueId, MLB_DRAFT_SEASON);
      setPool(nextPool ? {
        ...nextPool,
        tierCap: resolveLeagueSalaryCap(leagues.find((row) => row.id === leagueId) ?? null),
      } : null);
      setSession(nextSession);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [getMlbDraftSession, getRegisteredPool, leagues]);

  useEffect(() => {
    setTeamOrder(leagueTeams.map((team) => team.id));
    setTradeCpuTeamId(leagueTeams.find((team) => team.controlledBy === "ai")?.id ?? "");
    if (activeLeagueId) void loadDraftState(activeLeagueId);
  }, [activeLeagueId, leagueTeams.length, loadDraftState]);

  const teamStateById = useMemo(() => new Map(leagueTeams.map((team) => [
    team.id,
    buildTeamState({ team, session, modelById, pool, tierCap, realTeamCount: leagueTeams.length }),
  ])), [leagueTeams, modelById, pool, session, tierCap]);
  const currentPick = session?.pickOrder[session.currentPickIndex] ?? null;
  const currentTeam = currentPick ? teamStateById.get(currentPick.teamId)?.team ?? null : null;
  const draftComplete = Boolean(session && session.currentPickIndex >= session.pickOrder.length);
  const completedPlayerIds = useMemo(
    () => new Set(session?.completedPicks.map((pick) => pick.playerId) ?? []),
    [session],
  );
  const availableModels = useMemo(
    () => [...modelById.values()].filter((model) => !completedPlayerIds.has(model.playerId)),
    [completedPlayerIds, modelById],
  );
  const viewingTeamState = humanTeam ? teamStateById.get(humanTeam.id) ?? null : null;
  const currentTeamState = currentTeam ? teamStateById.get(currentTeam.id) ?? null : null;

  const boardModels = useMemo(() => {
    if (!currentTeamState || !pool) return [];
    return buildBoardModels({
      teamState: currentTeamState,
      available: availableModels,
      playerById,
      tier: pool.tier,
      pool,
      useRankOverrides: currentTeamState.team.id === humanTeam?.id,
      realTeamCount: leagueTeams.length,
    });
  }, [availableModels, currentTeamState, humanTeam?.id, leagueTeams.length, playerById, pool]);

  const guardForCandidate = useCallback((candidate: BoardModel): SnakePickGuard => {
    if (!currentTeamState || !pool) throw new Error("The draft is not ready.");
    return evaluateSnakePick({
      roster: currentTeamState.roster,
      candidate: candidate.model,
      remainingPool: availableModels,
      committedSpent: currentTeamState.spent,
      tierCap,
      baseCaps: pool.luxuryCaps,
      capIdentity: currentTeamState.team.capIdentity,
      realTeamCount: leagueTeams.length,
    });
  }, [availableModels, currentTeamState, leagueTeams.length, pool, tierCap]);

  const forecastByPlayerId = useMemo(
    () => new Map(forecast?.rows.map((row) => [row.playerId, row]) ?? []),
    [forecast],
  );
  const stealLeaders = useMemo(
    () => new Set([...boardModels].sort((a, b) => b.steal - a.steal).slice(0, 3).map((row) => row.model.playerId)),
    [boardModels],
  );
  const filteredBoard = useMemo(() => {
    const filtered = boardModels.filter((row) => positionFilter === "ALL" || row.model.position === positionFilter);
    return [...filtered].sort((left, right) => {
      if (boardSort === "TRUE COST") return left.trueCost - right.trueCost || left.model.playerId.localeCompare(right.model.playerId);
      if (boardSort === "IV") return right.model.iv - left.model.iv || left.model.playerId.localeCompare(right.model.playerId);
      if (boardSort === "POSITION") return left.model.position.localeCompare(right.model.position) || right.steal - left.steal;
      return right.steal - left.steal || right.blendedBoardValue - left.blendedBoardValue || left.model.playerId.localeCompare(right.model.playerId);
    });
  }, [boardModels, boardSort, positionFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredBoard.length / BOARD_PAGE_SIZE));
  const pageRows = useMemo(
    () => filteredBoard.slice(boardPage * BOARD_PAGE_SIZE, (boardPage + 1) * BOARD_PAGE_SIZE),
    [boardPage, filteredBoard],
  );
  const visibleRows = useMemo<VisibleBoardModel[]>(
    () => pageRows.map((row) => ({ ...row, guard: guardForCandidate(row) })),
    [guardForCandidate, pageRows],
  );

  useEffect(() => {
    setBoardPage(0);
  }, [boardSort, positionFilter, session?.currentPickIndex]);
  useEffect(() => {
    if (boardPage >= pageCount) setBoardPage(pageCount - 1);
  }, [boardPage, pageCount]);

  const startDraft = async () => {
    if (!activeLeague || !pool) return;
    if (!pool.locked) {
      setActionError("Lock the pool on Draft Setup before entering the POC room.");
      return;
    }
    if (teamOrder.length === 0) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const next = await saveMlbDraftSession({
        id: createMlbDraftSessionId(activeLeague.id, MLB_DRAFT_SEASON),
        leagueId: activeLeague.id,
        seasonNumber: MLB_DRAFT_SEASON,
        seed,
        workflowVersion: MLB_DRAFT_WORKFLOW_VERSION,
        engineMethodVersion: MLB_DRAFT_ENGINE_METHOD_VERSION,
        tier: pool.tier,
        balanceMode: pool.balanceMode,
        rounds: MLB_DRAFT_ROUNDS,
        pickOrder: buildSnakeOrder(teamOrder, MLB_DRAFT_ROUNDS),
        completedPicks: [],
        trades: [],
        currentPickIndex: 0,
      });
      setSession(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsWorking(false);
    }
  };

  const commitPlayer = useCallback(async (candidate: BoardModel, guard: SnakePickGuard) => {
    if (!session || !guard.confirmable) return;
    setIsWorking(true);
    setActionError(null);
    try {
      const next = commitSnakeDraftPick({
        session,
        playerId: candidate.model.playerId,
        settledSalary: candidate.model.iv,
        marginalTax: guard.marginalTax,
      });
      const saved = await saveMlbDraftSession(next);
      setSession(saved);
      setTradeMessage(null);
      setHumanTradePicks([]);
      setCpuTradePicks([]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsWorking(false);
    }
  }, [saveMlbDraftSession, session]);

  const draftHumanPlayer = (candidate: BoardModel) => {
    const guard = guardForCandidate(candidate);
    if (!guard.confirmable) {
      setActionError(guard.reason);
      return;
    }
    void commitPlayer(candidate, guard);
  };

  const draftCpuPlayer = useCallback(async () => {
    if (!session || !currentTeamState || currentTeamState.team.controlledBy !== "ai") return;
    let candidates = boardModels.map((candidate) => ({
      playerId: candidate.model.playerId,
      blendedBoardValue: candidate.blendedBoardValue,
      needMultiplier: candidate.needMultiplier,
      fitMultiplier: candidate.fitMultiplier,
      marginalTax: candidate.marginalTax,
      selectable: true,
    }));
    while (candidates.length > 0) {
      const picked = pickSnakeCpuCandidate({
        seed: session.seed,
        pickIndex: session.currentPickIndex,
        teamId: currentTeamState.team.id,
        candidates,
      });
      if (!picked) break;
      const candidate = boardModels.find((row) => row.model.playerId === picked.playerId);
      if (!candidate) break;
      const guard = guardForCandidate(candidate);
      if (guard.confirmable) {
        await commitPlayer(candidate, guard);
        return;
      }
      candidates = candidates.map((row) => row.playerId === picked.playerId ? { ...row, selectable: false } : row);
    }
    setActionError(`${teamDisplayName(currentTeamState.team)} has no pick that keeps a legal, affordable 22. The POC is stopped here.`);
  }, [boardModels, commitPlayer, currentTeamState, guardForCandidate, session]);

  useEffect(() => {
    if (!session || !currentTeamState || currentTeamState.team.controlledBy !== "ai" || isWorking || draftComplete) {
      if (!currentTeamState || currentTeamState.team.controlledBy !== "ai") setCpuTicker(null);
      return undefined;
    }
    setCpuTicker(`${teamDisplayName(currentTeamState.team)} is weighing the board.`);
    const timer = window.setTimeout(() => {
      void draftCpuPlayer();
    }, CPU_TICK_MS);
    return () => window.clearTimeout(timer);
  }, [currentTeamState, draftComplete, draftCpuPlayer, isWorking, session]);

  useEffect(() => {
    if (
      !session
      || !humanTeam
      || currentTeam?.id !== humanTeam.id
      || !pool
      || availableModels.length === 0
      || draftComplete
    ) {
      setForecast(null);
      setForecastBusy(false);
      return undefined;
    }
    const cacheKey = [
      session.id,
      session.currentPickIndex,
      session.trades?.length ?? 0,
      session.completedPicks.map((pick) => pick.playerId).join(","),
      session.pickOrder.map((pick) => `${pick.pick}-${pick.teamId}`).join(","),
    ].join("|");
    const cached = forecastCacheRef.current.get(cacheKey);
    if (cached) {
      setForecast(cached);
      setForecastBusy(false);
      return undefined;
    }
    setForecastBusy(true);
    setForecast(null);
    // Deferred to the post-render task queue so card pagination and the human turn paint first.
    const timer = window.setTimeout(() => {
      const boardByTeam = new Map(leagueTeams.map((team) => {
        const teamState = teamStateById.get(team.id)!;
        return [team.id, buildBoardModels({
          teamState,
          available: availableModels,
          playerById,
          tier: pool.tier,
          pool,
          useRankOverrides: team.id === humanTeam.id,
          realTeamCount: leagueTeams.length,
        })] as const;
      }));
      const rowsByTeam = new Map([...boardByTeam.entries()].map(([teamId, rows]) => [
        teamId,
        new Map(rows.map((row) => [row.model.playerId, row])),
      ]));
      const next = forecastSnakeAvailability({
        seed: session.seed,
        currentPickIndex: session.currentPickIndex,
        pickOrder: session.pickOrder,
        userTeamId: humanTeam.id,
        candidates: availableModels.map((model) => ({
          playerId: model.playerId,
          byTeamId: Object.fromEntries(leagueTeams.flatMap((team) => {
            const row = rowsByTeam.get(team.id)?.get(model.playerId);
            return row ? [[team.id, {
              blendedBoardValue: row.blendedBoardValue,
              needMultiplier: row.needMultiplier,
              fitMultiplier: row.fitMultiplier,
              marginalTax: row.marginalTax,
              selectable: true,
            }]] : [];
          })),
        })),
        rollouts: SNAKE_POC_TUNING.forecastRollouts,
      });
      forecastCacheRef.current.set(cacheKey, next);
      setForecast(next);
      setForecastBusy(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [availableModels, currentTeam?.id, draftComplete, humanTeam, leagueTeams, playerById, pool, session, teamStateById]);

  const humanFuturePicks = useMemo(() => session && humanTeam
    ? session.pickOrder.slice(session.currentPickIndex + 1).filter((slot) => slot.teamId === humanTeam.id)
    : [], [humanTeam, session]);
  const cpuFuturePicks = useMemo(() => session && tradeCpuTeamId
    ? session.pickOrder.slice(session.currentPickIndex + 1).filter((slot) => slot.teamId === tradeCpuTeamId)
    : [], [session, tradeCpuTeamId]);
  const tradeVerdict = useMemo<TradeVerdict | null>(() => {
    if (!pool || humanTradePicks.length === 0 || cpuTradePicks.length === 0) return null;
    try {
      return validateTrade(
        humanTradePicks.map((pick) => ({ pick })),
        cpuTradePicks.map((pick) => ({ pick })),
        pool.pickValueChart,
      );
    } catch {
      return null;
    }
  }, [cpuTradePicks, humanTradePicks, pool]);
  const cpuTradeDecisionValueByPick = useMemo<Record<number, number>>(() => {
    if (!session || !pool || !tradeCpuTeamId) return {};
    const teamState = teamStateById.get(tradeCpuTeamId);
    if (!teamState) return {};
    const ranked = buildBoardModels({
      teamState,
      available: availableModels,
      playerById,
      tier: pool.tier,
      pool,
      useRankOverrides: false,
      realTeamCount: leagueTeams.length,
    }).map((row) => ({
      row,
      value: Math.max(1, scoreSnakeCpuCandidate({
        playerId: row.model.playerId,
        blendedBoardValue: row.blendedBoardValue,
        needMultiplier: row.needMultiplier,
        fitMultiplier: row.fitMultiplier,
        marginalTax: row.marginalTax,
        selectable: true,
      })),
    })).sort((left, right) => right.value - left.value || left.row.model.playerId.localeCompare(right.row.model.playerId));
    const future = session.pickOrder.slice(session.currentPickIndex + 1);
    return Object.fromEntries(future.map((slot, index) => {
      const boardIndex = Math.min(
        Math.max(0, ranked.length - 1),
        Math.floor((index / Math.max(1, future.length - 1)) * Math.max(0, ranked.length - 1)),
      );
      return [slot.pick, ranked[boardIndex]?.value ?? 1];
    }));
  }, [availableModels, leagueTeams.length, playerById, pool, session, teamStateById, tradeCpuTeamId]);
  const tradeMustFillSurvives = useMemo(() => {
    if (!humanTeam || !tradeCpuTeamId) return false;
    const completionPool = availableModels.map((model) => ({
      id: model.playerId,
      price: model.iv,
      shape: model.shape,
    }));
    return [humanTeam.id, tradeCpuTeamId].every((teamId) => {
      const state = teamStateById.get(teamId);
      if (!state) return false;
      return cheapestLegalCompletion(
        state.roster.map((entry) => entry.shape),
        completionPool,
        LEGAL_ROSTER.size - state.roster.length,
      ).feasible;
    });
  }, [availableModels, humanTeam, teamStateById, tradeCpuTeamId]);

  const executeTrade = async () => {
    if (!session || !humanTeam || !pool || !tradeCpuTeamId) return;
    const result = executeSnakePickTrade({
      session,
      humanTeamId: humanTeam.id,
      cpuTeamId: tradeCpuTeamId,
      humanPickNumbers: humanTradePicks,
      cpuPickNumbers: cpuTradePicks,
      pickValueChart: pool.pickValueChart,
      cpuDecisionValueByPick: cpuTradeDecisionValueByPick,
      mustFillSurvives: tradeMustFillSurvives,
    });
    setTradeMessage(result.reason);
    if (!result.accepted) return;
    setIsWorking(true);
    try {
      const saved = await saveMlbDraftSession(result.session);
      setSession(saved);
      setHumanTradePicks([]);
      setCpuTradePicks([]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsWorking(false);
    }
  };

  const run = useMemo(() => detectSnakePositionRun({
    completedPlayerIds: session?.completedPicks.map((pick) => pick.playerId) ?? [],
    positionByPlayerId: new Map([...modelById.values()].map((model) => [model.playerId, model.position])),
    availablePlayerIds: availableModels.map((model) => model.playerId),
  }), [availableModels, modelById, session]);
  const blockers = useMemo(() => {
    const rows: string[] = [];
    if (!isSnakeDraftPocEnabled()) rows.push("The snake draft POC flag is off.");
    if (!activeLeague) rows.push("Choose a league.");
    if (leagueTeams.length === 0) rows.push("This league has no clubs.");
    if (!pool) rows.push("No locked player pool is registered for this league yet. Return to Draft Setup first.");
    if (pool && !pool.locked) rows.push("The player pool is not locked yet. Return to Draft Setup and lock it first.");
    if (pool && pool.players.length < leagueTeams.length * MLB_DRAFT_ROUNDS) {
      rows.push(`The pool needs at least ${leagueTeams.length * MLB_DRAFT_ROUNDS} players for 22 rounds.`);
    }
    if (modelById.size !== (pool?.players.length ?? 0)) rows.push("Some pool players are missing their full player card.");
    return rows;
  }, [activeLeague, leagueTeams.length, modelById.size, pool]);

  if (isLoading) {
    return <div className="min-h-screen bg-[#243028] text-[#E8E8D8] grid place-items-center">LOADING THE ROOM...</div>;
  }
  if (error) {
    return <div className="min-h-screen bg-[#243028] text-[#FFD27A] grid place-items-center">{error}</div>;
  }

  return (
    <main className="min-h-screen bg-[#243028] text-[#E8E8D8] p-4 md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-[6px] border-[#E8E8D8] bg-[#3D4A42] p-4 shadow-[7px_7px_0_#111]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to Draft Setup"
              onClick={() => navigate(`/league-builder/draft-setup?leagueId=${encodeURIComponent(activeLeagueId)}`)}
              className="border-4 border-[#E8E8D8] bg-[#2F3F32] p-2 active:translate-y-0.5"
            >
              <ArrowLeft />
            </button>
            <div>
              <div className="text-[10px] font-bold tracking-[0.2em] text-[#C4A853]">ISOLATED VIABILITY TEST</div>
              <h1 className="font-['Moms_Typewriter'] text-3xl">MLB SNAKE DRAFT POC</h1>
            </div>
          </div>
          <div className="border-4 border-[#C4A853] bg-[#1F2922] px-4 py-2 text-sm font-bold">
            {draftComplete ? "22 ROUNDS COMPLETE · NO SEASON HANDOFF" : currentPick ? `PICK ${currentPick.pick} · ROUND ${currentPick.round}` : "SET THE ORDER"}
          </div>
        </header>

        {actionError ? (
          <div className="border-4 border-[#9B2F2F] bg-[#4A1F1F] p-4 font-bold text-[#FFD27A]">{actionError}</div>
        ) : null}
        {run ? (
          <div className="border-4 border-[#C4A853] bg-[#40381F] p-3 font-bold text-[#F3DB8E]">
            A RUN ON {run.position} — {run.count} went in the last 5 picks, {run.remaining} left.
          </div>
        ) : null}
        {cpuTicker ? (
          <div data-testid="cpu-pick-ticker" className="border-4 border-[#6F8FAF] bg-[#24384A] p-3 font-bold text-[#D9EDFF]">
            {cpuTicker}
          </div>
        ) : null}

        {!session ? (
          <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="border-[6px] border-[#4A6844] bg-[#3D4A42] p-5 shadow-[7px_7px_0_#111]">
              <label className="mb-1 block text-xs font-bold text-[#C4A853]" htmlFor="snake-league">LEAGUE</label>
              <select
                id="snake-league"
                value={activeLeagueId}
                onChange={(event) => setActiveLeagueId(event.target.value)}
                className="mb-4 w-full border-4 border-[#8A9A86] bg-[#1F2922] p-2 font-bold"
              >
                {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
              <label className="mb-1 block text-xs font-bold text-[#C4A853]" htmlFor="snake-seed">SEED</label>
              <input
                id="snake-seed"
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                className="mb-3 w-full border-4 border-[#8A9A86] bg-[#1F2922] p-2 font-bold"
              />
              <button
                type="button"
                onClick={() => setTeamOrder(seededSnakeShuffle(teamOrder, seed))}
                className="mb-5 flex w-full items-center justify-center gap-2 border-4 border-[#E8E8D8] bg-[#31527A] px-3 py-2 font-bold"
              >
                <Shuffle className="h-4 w-4" /> SEEDED SHUFFLE
              </button>
              <button
                type="button"
                onClick={() => void startDraft()}
                disabled={blockers.length > 0 || isWorking}
                className="flex w-full items-center justify-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-4 py-3 font-bold text-[#1A1A1A] disabled:opacity-40"
              >
                {isWorking ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />} BEGIN 22 ROUNDS
              </button>
              {pool ? <div className="mt-4 text-xs text-[#E8E8D8]/70">{pool.players.length} PLAYERS · CAP {formatMoney(tierCap)}</div> : null}
            </div>
            <div className="border-[6px] border-[#4A6844] bg-[#3D4A42] p-5 shadow-[7px_7px_0_#111]">
              <h2 className="mb-3 text-lg font-bold text-[#C4A853]">DRAFT ORDER</h2>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {teamOrder.map((teamId, index) => {
                  const team = leagueTeams.find((row) => row.id === teamId);
                  return (
                    <div key={teamId} className="flex items-center justify-between border-4 border-[#71806F] bg-[#28352C] p-2">
                      <span className="truncate text-sm font-bold">#{index + 1} {team ? teamDisplayName(team) : teamId}</span>
                      <span className="flex gap-1">
                        <button type="button" aria-label={`Move ${teamId} up`} onClick={() => setTeamOrder((rows) => {
                          if (index === 0) return rows;
                          const next = [...rows];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          return next;
                        })} className="border-2 border-[#71806F] px-2">↑</button>
                        <button type="button" aria-label={`Move ${teamId} down`} onClick={() => setTeamOrder((rows) => {
                          if (index >= rows.length - 1) return rows;
                          const next = [...rows];
                          [next[index + 1], next[index]] = [next[index], next[index + 1]];
                          return next;
                        })} className="border-2 border-[#71806F] px-2">↓</button>
                      </span>
                    </div>
                  );
                })}
              </div>
              {blockers.length > 0 ? (
                <div className="mt-4 border-4 border-[#9B2F2F] bg-[#4A1F1F] p-3 text-sm text-[#FFD27A]">
                  {blockers.map((row) => <div key={row}>• {row}</div>)}
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <>
            <section className="border-[6px] border-[#4A6844] bg-[#3D4A42] p-4 shadow-[7px_7px_0_#111]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[#C4A853]">CAP LEDGER</h2>
                <div className="font-bold text-[#F3DB8E]">
                  {currentTeam ? `ON THE CLOCK · ${teamDisplayName(currentTeam)}` : "POC COMPLETE"}
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                {[...teamStateById.values()].map((state) => (
                  <div key={state.team.id} className={`border-4 p-3 ${state.team.id === currentTeam?.id ? "border-[#C4A853] bg-[#354B39]" : "border-[#71806F] bg-[#28352C]"}`}>
                    <div className="truncate font-bold">{teamDisplayName(state.team)}</div>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-[11px] tabular-nums">
                      <div className="min-w-0"><span className="block whitespace-nowrap text-[#E8E8D8]/55">SPENT</span><span className="block whitespace-nowrap">{formatMoney(state.spent)}</span></div>
                      <div className="min-w-0"><span className="block whitespace-nowrap text-[#E8E8D8]/55">HEADROOM</span><span className="block whitespace-nowrap">{formatMoney(state.headroom)}</span></div>
                      <div className="min-w-0"><span className="block whitespace-nowrap text-[#E8E8D8]/55">TAX SO FAR</span><span className="block whitespace-nowrap">{formatMoney(state.tax)}</span></div>
                    </div>
                    <div className="mt-2 text-xs text-[#E8E8D8]/60">{state.roster.length}/22 players</div>
                  </div>
                ))}
              </div>
            </section>

            {draftComplete ? (
              <section className="border-[6px] border-[#5E9B69] bg-[#223D28] p-8 text-center shadow-[7px_7px_0_#111]">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#BEE8C2]" />
                <h2 className="text-2xl font-bold">POC COMPLETE</h2>
                <p className="mt-2 text-[#E8E8D8]/70">The result stays in this draft session. Nothing moves to farm or the season.</p>
              </section>
            ) : null}

            {!draftComplete && currentTeam?.controlledBy !== "ai" ? (
              <section className="border-[6px] border-[#4A6844] bg-[#3D4A42] p-5 shadow-[7px_7px_0_#111]">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#C4A853]">COMPLETE-INFORMATION BOARD</h2>
                    <div className="text-xs text-[#E8E8D8]/60">
                      Forecast {forecastBusy ? "running" : `uses ${forecast?.rollouts ?? SNAKE_POC_TUNING.forecastRollouts} seeded rollouts`} · {filteredBoard.length} available here
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="text-xs font-bold">POSITION
                      <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className="ml-2 border-2 border-[#8A9A86] bg-[#1F2922] p-2">
                        <option value="ALL">ALL</option>
                        {[...new Set(boardModels.map((row) => row.model.position))].sort().map((position) => <option key={position} value={position}>{position}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-bold">SORT
                      <select value={boardSort} onChange={(event) => setBoardSort(event.target.value as BoardSort)} className="ml-2 border-2 border-[#8A9A86] bg-[#1F2922] p-2">
                        <option value="STEAL">STEAL</option>
                        <option value="TRUE COST">TRUE COST</option>
                        <option value="IV">IV</option>
                        <option value="POSITION">POSITION</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div data-testid="snake-board-page" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleRows.map((row) => {
                    const forecastRow = forecastByPlayerId.get(row.model.playerId);
                    const survival = forecastRow?.survivalPct ?? null;
                    const band = forecastBand(survival);
                    return (
                      <article key={row.model.playerId} className="border-4 border-[#71806F] bg-[#28352C] p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold">{playerDisplayName(row.player)}</div>
                            <div className="text-xs text-[#E8E8D8]/55">{row.model.position} · AGE {row.player.age}</div>
                          </div>
                          {stealLeaders.has(row.model.playerId) ? <span className="border-2 border-[#C4A853] px-2 py-1 text-[10px] font-bold text-[#F3DB8E]">TOP-3 STEAL</span> : null}
                        </div>
                        <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                          <div><span className="block text-[#E8E8D8]/50">TRUE COST</span>{formatMoney(row.trueCost)}</div>
                          <div><span className="block text-[#E8E8D8]/50">STEAL</span>{formatMoney(row.steal)}</div>
                          <div><span className="block text-[#E8E8D8]/50">IV</span>{formatMoney(row.model.iv)}</div>
                        </div>
                        <div className="mb-3 grid grid-cols-5 gap-1 text-center text-[10px]">
                          {row.model.shape.isPitcher ? (
                            <>
                              <span>VEL {row.player.velocity}</span><span>JNK {row.player.junk}</span><span>ACC {row.player.accuracy}</span><span>POW {row.player.power}</span><span>CON {row.player.contact}</span>
                            </>
                          ) : (
                            <>
                              <span>POW {row.player.power}</span><span>CON {row.player.contact}</span><span>SPD {row.player.speed}</span><span>FLD {row.player.fielding}</span><span>ARM {row.player.arm}</span>
                            </>
                          )}
                        </div>
                        <div className="mb-3 border-2 border-[#627362] bg-[#1F2922] p-2 text-xs">
                          <div className={`font-bold ${band.className}`}>
                            {band.label}{survival === null ? "" : ` · ${Math.round(survival * 100)}% TO PICK ${forecastRow?.nextPick ?? "—"}`}
                          </div>
                          <div className="mt-1 text-[#E8E8D8]/65">LAST REALISTIC PICK · {forecastRow?.lastRealisticPick ?? "NONE"}</div>
                        </div>
                        <div className={`mb-3 border-2 p-2 text-xs ${guardClass(row.guard)}`}>
                          <div className="font-bold">{guardLabel(row.guard)}{row.guard.mustFill ? " · MUST FILL" : ""}</div>
                          <div className="mt-1">{row.guard.reason}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => draftHumanPlayer(row)}
                          disabled={isWorking || !row.guard.confirmable}
                          className="w-full border-4 border-[#E8E8D8] bg-[#C4A853] px-3 py-2 font-bold text-[#1A1A1A] disabled:opacity-35"
                        >
                          DRAFT {row.player.lastName.toUpperCase()}
                        </button>
                      </article>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button type="button" aria-label="Previous board page" disabled={boardPage === 0} onClick={() => setBoardPage((page) => page - 1)} className="border-4 border-[#E8E8D8] bg-[#31527A] p-2 disabled:opacity-30"><ChevronLeft /></button>
                  <span className="font-bold">PAGE {boardPage + 1} OF {pageCount}</span>
                  <button type="button" aria-label="Next board page" disabled={boardPage >= pageCount - 1} onClick={() => setBoardPage((page) => page + 1)} className="border-4 border-[#E8E8D8] bg-[#31527A] p-2 disabled:opacity-30"><ChevronRight /></button>
                </div>
              </section>
            ) : null}

            {!draftComplete && currentTeam?.id === humanTeam?.id && pool ? (
              <section className="border-[6px] border-[#4A6844] bg-[#3D4A42] p-5 shadow-[7px_7px_0_#111]">
                <div className="mb-3 flex items-center gap-2"><Repeat2 className="text-[#C4A853]" /><h2 className="text-lg font-bold">TRADE FUTURE PICKS</h2></div>
                <p className="mb-4 text-sm text-[#E8E8D8]/65">Swap one owned future turn with another club. Add up to two picks on each side; roster spots must stay even.</p>
                <label className="mb-3 block text-xs font-bold">OTHER CLUB
                  <select value={tradeCpuTeamId} onChange={(event) => { setTradeCpuTeamId(event.target.value); setCpuTradePicks([]); setTradeMessage(null); }} className="ml-2 border-2 border-[#8A9A86] bg-[#1F2922] p-2">
                    {leagueTeams.filter((team) => team.controlledBy === "ai").map((team) => <option key={team.id} value={team.id}>{teamDisplayName(team)}</option>)}
                  </select>
                </label>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-bold text-[#C4A853]">YOUR FUTURE PICKS</div>
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                      {humanFuturePicks.map((slot) => <button key={slot.pick} type="button" onClick={() => setHumanTradePicks((rows) => togglePick(rows, slot.pick))} className={`border-2 px-2 py-1 text-xs font-bold ${humanTradePicks.includes(slot.pick) ? "border-[#C4A853] bg-[#5A4D25]" : "border-[#71806F] bg-[#28352C]"}`}>#{slot.pick}</button>)}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-bold text-[#C4A853]">THEIR FUTURE PICKS</div>
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                      {cpuFuturePicks.map((slot) => <button key={slot.pick} type="button" onClick={() => setCpuTradePicks((rows) => togglePick(rows, slot.pick))} className={`border-2 px-2 py-1 text-xs font-bold ${cpuTradePicks.includes(slot.pick) ? "border-[#C4A853] bg-[#5A4D25]" : "border-[#71806F] bg-[#28352C]"}`}>#{slot.pick}</button>)}
                    </div>
                  </div>
                </div>
                {tradeVerdict ? (
                  <div className="mt-4 border-4 border-[#71806F] bg-[#28352C] p-3 text-sm">
                    <span className="font-bold">FAIRNESS · {tradeVerdict.balanced ? "IN RANGE" : `${Math.round(tradeVerdict.imbalancePct * 100)}% APART`}</span>
                    <span className="ml-3 text-[#E8E8D8]/60">The other club still asks for 5% in its favor.</span>
                  </div>
                ) : null}
                {tradeMessage ? <div className="mt-3 border-2 border-[#C4A853] bg-[#40381F] p-3 text-sm text-[#F3DB8E]">{tradeMessage}</div> : null}
                <button type="button" onClick={() => void executeTrade()} disabled={isWorking || !tradeVerdict} className="mt-4 border-4 border-[#E8E8D8] bg-[#31527A] px-4 py-2 font-bold disabled:opacity-35">MAKE THE OFFER</button>
                {session.trades?.length ? (
                  <div className="mt-4 text-xs text-[#E8E8D8]/60">{session.trades.length} accepted trade{session.trades.length === 1 ? "" : "s"} recorded in this POC session.</div>
                ) : null}
              </section>
            ) : null}

            {session.completedPicks.length > 0 ? (
              <section className="border-[6px] border-[#4A6844] bg-[#3D4A42] p-5 shadow-[7px_7px_0_#111]">
                <div className="mb-3 flex items-center gap-2"><ClipboardList className="text-[#C4A853]" /><h2 className="text-lg font-bold">PICK TICKER</h2></div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {session.completedPicks.slice(-16).reverse().map((pick) => {
                    const player = playerById.get(pick.playerId);
                    const team = leagueTeams.find((row) => row.id === pick.teamId);
                    return (
                      <div key={`${pick.pick}-${pick.playerId}`} className="border-4 border-[#71806F] bg-[#28352C] p-3 text-sm">
                        <div className="font-bold">#{pick.pick} · {player ? playerDisplayName(player) : pick.playerId}</div>
                        <div className="text-[#E8E8D8]/60">{team ? teamDisplayName(team) : pick.teamId}</div>
                        <div className="mt-1 text-[#BEE8C2]">SETTLED {formatMoney(pick.settledSalary ?? poolById.get(pick.playerId)?.iv ?? 0)}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        )}

        <footer className="border-4 border-[#71806F] bg-[#1F2922] p-4 text-xs text-[#E8E8D8]/60">
          <div className="mb-1 flex items-center gap-2 font-bold text-[#C4A853]"><TrendingUp className="h-4 w-4" /> POC BOUNDARY</div>
          Complete ratings, IV settlement, tax, legal rosters, CPU picks, forecasts, runs, and pick trades live here. Farm, privacy ceremony, LLM color, and season handoff do not.
          {viewingTeamState ? ` Your club currently has ${viewingTeamState.roster.length} of 22 players.` : ""}
        </footer>
      </div>
    </main>
  );
}

export default LeagueBuilderSnakeDraft;
