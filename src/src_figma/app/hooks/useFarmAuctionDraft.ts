import { useCallback, useMemo, useRef, useState } from "react";

import {
  claimLoneSurvivor,
  createAuctionSessionLaunchNonce,
  resolveLot,
  advanceLot,
  getCurrentBidderTeamId,
  passBid,
  passLoneSurvivorOut,
  recordBid,
  surfaceNextPlayer,
  type AuctionTransitionResult,
} from "../../../engines/auctionStateMachine";
import {
  cpuBidOnLot,
  cpuDecideLoneSurvivor,
  type CpuShillAuctionSession,
} from "../../../engines/cpuShillBidding";
import { DEFAULT_AUCTION_SETUP_CONFIG, type AuctionSetupConfig } from "../../../data/auctionEngineConstants";
import { normalizeToChemistryCode, type ChemistryCode } from "../../../data/chemistryCanonical";
import { LEAGUE_MINIMUM_SALARY } from "../../../data/rosterEngineConstants";
import { buildFarmAuctionSession } from "../../../utils/farmAuctionSession";
import type { FarmAuctionPool } from "../../../utils/farmAuctionPool";
import { computeFarmTierCap, computeMlbToFarmCarryover } from "../../../utils/farmAuctionWallet";
import {
  createFarmAuctionSessionId,
  getAuctionSession,
  getAuctionSessionById,
  getScoutProfilesForLeague,
  saveAuctionSessionById,
  type LeagueBuilderScoutProfile,
} from "../../../utils/leagueBuilderStorage";
import {
  commitCompletedFarmAuctionSessionToLeagueRosters,
} from "../../../utils/leagueBuilderAuctionPipeline";
import type { ProspectScoutDescriptor } from "../../../utils/prospectScoutingDraftEngine";
import {
  useLeagueBuilderData,
  type Player,
  type Team,
  type TeamRoster,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";
import { buildLiveScoutPool } from "../utils/draftStaffingPersistence";

export { getCurrentBidderTeamId } from "../../../engines/auctionStateMachine";

const FARM_AUCTION_SEASON = 1;
const MAX_CPU_AUTO_ADVANCE_STEPS = 400;
const CPU_BID_OPTIONS = { needAwareCompletion: true } as const;

type FarmAuctionDraftContext = {
  leagueId: string;
  seasonNumber: number;
};

export type FarmAuctionDraftError = string | null;

export interface UseFarmAuctionDraftOptions {
  leagueData?: UseLeagueBuilderDataReturn;
}

export interface UseFarmAuctionDraftReturn {
  session: CpuShillAuctionSession | null;
  pool: FarmAuctionPool | null;
  scoutsByTeamId: Record<string, ProspectScoutDescriptor | undefined> | null;
  mlbRosterChemistryByTeamId: Record<string, Partial<Record<ChemistryCode, number>>>;
  mlbRosterPlayerIdsByTeamId: Record<string, readonly string[]>;
  farmTierCap: number | null;
  seed: string;
  isWorking: boolean;
  error: FarmAuctionDraftError;
  leagueData: UseLeagueBuilderDataReturn;
  activeLeagueId: string | null;
  seasonNumber: number;
  cpuTeamIds: string[];
  currentBidderTeamId: string | null;
  initFarmAuction: (leagueId: string, partialConfig?: Partial<AuctionSetupConfig>) => Promise<CpuShillAuctionSession | null>;
  loadFarmAuction: (leagueId: string, seasonNumber?: number) => Promise<CpuShillAuctionSession | null>;
  bid: (teamId: string, amount: number) => Promise<CpuShillAuctionSession | null>;
  pass: (teamId: string) => Promise<CpuShillAuctionSession | null>;
  claimAtReserve: () => Promise<CpuShillAuctionSession | null>;
  resolve: () => Promise<CpuShillAuctionSession | null>;
  advance: () => Promise<CpuShillAuctionSession | null>;
  isCpuTeam: (teamId: string | null | undefined) => boolean;
}

function transitionOrThrow(result: AuctionTransitionResult): CpuShillAuctionSession {
  if (!result.ok) {
    throw new Error(`Farm auction transition rejected: ${result.reason}`);
  }
  return result.session as CpuShillAuctionSession;
}

function teamDisplayName(team: Team | null | undefined): string {
  if (!team) return "Unknown Team";
  return team.location ? `${team.location} ${team.name}` : team.name;
}

export function deriveFarmCpuTeamIds(session: CpuShillAuctionSession | null, leagueTeams: readonly Team[]): string[] {
  if (!session) return [];
  const ids = new Set<string>();

  for (const team of leagueTeams) {
    if (team.controlledBy === "ai") ids.add(team.id);
  }

  for (const teamId of Object.keys(session.cpuShills ?? {})) {
    ids.add(teamId);
  }

  const count = Math.max(0, Math.min(session.config.cpuShillCount ?? 0, session.nominationOrder.length));
  if (count > 0) {
    for (const teamId of session.nominationOrder.slice(-count)) {
      ids.add(teamId);
    }
  }

  return session.nominationOrder.filter((teamId) => ids.has(teamId));
}

function scoutProfileToDescriptor(scout: LeagueBuilderScoutProfile): ProspectScoutDescriptor {
  return {
    scoutId: scout.id,
    scoutName: scout.name,
    specialties: scout.specialties as ProspectScoutDescriptor["specialties"],
    weaknesses: scout.weaknesses as ProspectScoutDescriptor["weaknesses"],
  };
}

function resolveScoutsByTeamId(
  scouts: readonly LeagueBuilderScoutProfile[],
): Record<string, ProspectScoutDescriptor | undefined> | undefined {
  const byTeamId = new Map<string, LeagueBuilderScoutProfile[]>();

  for (const scout of scouts) {
    if (!scout.teamId) continue;
    byTeamId.set(scout.teamId, [...(byTeamId.get(scout.teamId) ?? []), scout]);
  }

  if (byTeamId.size === 0) return undefined;
  if ([...byTeamId.values()].some((teamScouts) => teamScouts.length > 1)) return undefined;

  return Object.fromEntries(
    [...byTeamId.entries()].map(([teamId, [scout]]) => [teamId, scoutProfileToDescriptor(scout)]),
  );
}

async function loadOptionalFarmScouts(
  leagueId: string,
  leagueTeams: readonly Team[],
): Promise<Record<string, ProspectScoutDescriptor | undefined> | undefined> {
  try {
    return resolveScoutsByTeamId(await getScoutProfilesForLeague(leagueId)) ?? archetypeScoutsByTeamId(leagueId, leagueTeams);
  } catch {
    return archetypeScoutsByTeamId(leagueId, leagueTeams);
  }
}

function archetypeScoutsByTeamId(
  leagueId: string,
  leagueTeams: readonly Team[],
): Record<string, ProspectScoutDescriptor | undefined> {
  return Object.fromEntries(
    buildLiveScoutPool(leagueId, leagueTeams).map((scout) => [scout.teamId, {
      scoutId: scout.id,
      scoutName: scout.name,
      specialties: scout.specialties as ProspectScoutDescriptor["specialties"],
      weaknesses: scout.weaknesses as ProspectScoutDescriptor["weaknesses"],
    }]),
  );
}

async function buildFarmAuctionTeams(input: {
  leagueId: string;
  leagueTeams: readonly Team[];
  getRoster: UseLeagueBuilderDataReturn["getRoster"];
  leaguePlayers: readonly Player[];
}): Promise<{
  teams: Array<{
    teamId: string;
    teamName: string;
    farmRosterPlayerIds: readonly string[];
    committedFarmSalaries: number;
    mlbBudgetCarryover: number;
  }>;
  mlbRosterChemistryByTeamId: Record<string, Partial<Record<ChemistryCode, number>>>;
  mlbRosterPlayerIdsByTeamId: Record<string, readonly string[]>;
}> {
  const chemistryByPlayerId = new Map(
    input.leaguePlayers.map((player) => [player.id, normalizeToChemistryCode(player.chemistry)]),
  );
  const mlbRosterChemistryByTeamId: Record<string, Partial<Record<ChemistryCode, number>>> = {};
  const mlbRosterPlayerIdsByTeamId: Record<string, readonly string[]> = {};
  const mlbSession = await getAuctionSession(input.leagueId);
  const mlbUnspentByTeamId = new Map(
    (mlbSession?.session.state === "AUCTION_COMPLETE" ? mlbSession.session.teams : [])
      .map((team) => [team.teamId, team.budgetRemaining]),
  );
  const teams = await Promise.all(
    input.leagueTeams.map(async (team) => {
      const roster: TeamRoster | null = await input.getRoster(team.id);
      const chemistryCounts: Partial<Record<ChemistryCode, number>> = {};
      const mlbRosterPlayerIds = roster?.mlbRoster ?? [];
      for (const playerId of mlbRosterPlayerIds) {
        const chemistry = chemistryByPlayerId.get(playerId);
        if (!chemistry) continue;
        chemistryCounts[chemistry] = (chemistryCounts[chemistry] ?? 0) + 1;
      }
      mlbRosterChemistryByTeamId[team.id] = chemistryCounts;
      mlbRosterPlayerIdsByTeamId[team.id] = [...mlbRosterPlayerIds];

      return {
        teamId: team.id,
        teamName: teamDisplayName(team),
        farmRosterPlayerIds: roster?.farmRoster ?? [],
        committedFarmSalaries: 0,
        mlbBudgetCarryover: computeMlbToFarmCarryover(mlbUnspentByTeamId.get(team.id) ?? 0),
      };
    }),
  );

  return { teams, mlbRosterChemistryByTeamId, mlbRosterPlayerIdsByTeamId };
}

// Mirrors useAuctionDraft; duplicated intentionally until a shared hot-seat core is extracted.
function stateProgressKey(session: CpuShillAuctionSession): string {
  const lot = session.currentLot;
  return JSON.stringify({
    state: session.state,
    nominationIndex: session.nominationIndex,
    nominationRound: session.nominationRound,
    available: session.availablePlayerIds.length,
    results: session.results.length,
    saleCount: session.saleCount,
    pendingClaim: session.pendingClaim,
    lot: lot
      ? {
          playerId: lot.playerId,
          highBid: lot.highBid,
          highBidder: lot.highBidder,
          stillIn: lot.stillIn,
          bidTurnTeamId: lot.bidTurnTeamId,
        }
      : null,
  });
}

export function useFarmAuctionDraft(options: UseFarmAuctionDraftOptions = {}): UseFarmAuctionDraftReturn {
  const fallbackLeagueData = useLeagueBuilderData();
  const leagueData = options.leagueData ?? fallbackLeagueData;
  const [session, setSession] = useState<CpuShillAuctionSession | null>(null);
  const [pool, setPool] = useState<FarmAuctionPool | null>(null);
  const [scoutsByTeamId, setScoutsByTeamId] = useState<Record<string, ProspectScoutDescriptor | undefined> | null>(null);
  const [mlbRosterChemistryByTeamId, setMlbRosterChemistryByTeamId] = useState<
    Record<string, Partial<Record<ChemistryCode, number>>>
  >({});
  const [mlbRosterPlayerIdsByTeamId, setMlbRosterPlayerIdsByTeamId] = useState<Record<string, readonly string[]>>({});
  const [farmTierCap, setFarmTierCap] = useState<number | null>(null);
  const [context, setContext] = useState<FarmAuctionDraftContext | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<FarmAuctionDraftError>(null);
  const poolRef = useRef<FarmAuctionPool | null>(null);

  const activeLeague = useMemo(
    () => leagueData.leagues.find((league) => league.id === context?.leagueId) ?? null,
    [context?.leagueId, leagueData.leagues],
  );

  const leagueTeams = useMemo(() => {
    if (!activeLeague?.teamIds?.length) return [];
    return activeLeague.teamIds
      .map((teamId) => leagueData.teams.find((team) => team.id === teamId))
      .filter((team): team is Team => Boolean(team));
  }, [activeLeague, leagueData.teams]);

  const cpuTeamIds = useMemo(() => deriveFarmCpuTeamIds(session, leagueTeams), [leagueTeams, session]);
  const cpuTeamIdSet = useMemo(() => new Set(cpuTeamIds), [cpuTeamIds]);
  const currentBidderTeamId = getCurrentBidderTeamId(session);

  const persist = useCallback(async (nextSession: CpuShillAuctionSession, nextContext: FarmAuctionDraftContext) => {
    await saveAuctionSessionById({
      id: createFarmAuctionSessionId(nextContext.leagueId, nextContext.seasonNumber),
      leagueId: nextContext.leagueId,
      seasonNumber: nextContext.seasonNumber,
      seed: nextSession.config.nominationOrderSeed,
      session: nextSession,
      pool: poolRef.current ?? undefined,
    });
    if (nextSession.state === "AUCTION_COMPLETE" && nextSession.saleCount > 0 && poolRef.current) {
      await commitCompletedFarmAuctionSessionToLeagueRosters({
        leagueId: nextContext.leagueId,
        session: nextSession,
        pool: poolRef.current,
      });
    }
    return nextSession;
  }, []);

  // Mirrors useAuctionDraft; the §2 state machine + CPU shill transitions are reused unchanged.
  const autoAdvanceCpu = useCallback(async (
    startSession: CpuShillAuctionSession,
    nextContext: FarmAuctionDraftContext,
    nextLeagueTeams: readonly Team[],
  ) => {
    let next = startSession;
    let previousProgress = stateProgressKey(next);
    const nextCpuTeamIds = new Set(deriveFarmCpuTeamIds(next, nextLeagueTeams));

    for (let step = 0; step < MAX_CPU_AUTO_ADVANCE_STEPS; step += 1) {
      if (next.state === "AUCTION_COMPLETE") return next;

      if (next.state === "NOMINATION") {
        next = transitionOrThrow(surfaceNextPlayer(next));
        await persist(next, nextContext);
      } else if (next.state === "OPEN_BIDDING") {
        if (!next.currentLot) return next;
        if (next.currentLot.stillIn.length <= 1) {
          next = transitionOrThrow(resolveLot(next));
          await persist(next, nextContext);
        } else {
          const bidder = getCurrentBidderTeamId(next);
          if (!nextCpuTeamIds.has(bidder ?? "")) return next;

          const decision = cpuBidOnLot(
            next,
            bidder!,
            `${next.config.nominationOrderSeed}:bid:${step}:${next.currentLot.highBid ?? "open"}`,
            CPU_BID_OPTIONS,
          );
          // FABLE-C3-FIX F3 hardening: a CPU whose chosen bid gets rejected by the strand law
          // passes instead of halting the draft (farm pools carry no position info today, so
          // this cannot fire — symmetry with the MLB hook keeps the seam safe if that changes).
          let attempt = decision.kind === "bid"
            ? recordBid(next, bidder!, decision.bid)
            : passBid(next, bidder!);
          if (!attempt.ok && attempt.reason === "bid-strands-roster") {
            attempt = passBid(next, bidder!);
          }
          next = transitionOrThrow(attempt);
          await persist(next, nextContext);
        }
      } else if (next.state === "RESOLVE") {
        if (next.pendingClaim) {
          if (!nextCpuTeamIds.has(next.pendingClaim.teamId)) return next;
          const decision = cpuDecideLoneSurvivor(
            next,
            next.pendingClaim.teamId,
            `${next.config.nominationOrderSeed}:claim:${step}`,
            CPU_BID_OPTIONS,
          );
          let claimAttempt = decision.kind === "claim" ? claimLoneSurvivor(next) : passLoneSurvivorOut(next);
          if (!claimAttempt.ok && claimAttempt.reason === "bid-strands-roster") {
            claimAttempt = passLoneSurvivorOut(next);
          }
          next = transitionOrThrow(claimAttempt);
          await persist(next, nextContext);
        } else {
          next = transitionOrThrow(resolveLot(next));
          await persist(next, nextContext);
        }
      } else {
        return next;
      }

      const progress = stateProgressKey(next);
      if (progress === previousProgress) {
        throw new Error(`Farm CPU auto-advance made no progress from ${progress}`);
      }
      previousProgress = progress;
    }

    throw new Error(`Farm CPU auto-advance exceeded ${MAX_CPU_AUTO_ADVANCE_STEPS} steps from ${startSession.state}`);
  }, [persist]);

  const runAction = useCallback(async (action: () => Promise<CpuShillAuctionSession | null>) => {
    setIsWorking(true);
    setError(null);
    try {
      const next = await action();
      setSession(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    } finally {
      setIsWorking(false);
    }
  }, []);

  const loadFarmAuction = useCallback(async (leagueId: string, seasonNumber = FARM_AUCTION_SEASON) => runAction(async () => {
    const row = await getAuctionSessionById(createFarmAuctionSessionId(leagueId, seasonNumber));
    const nextContext = { leagueId, seasonNumber };
    const nextLeague = leagueData.leagues.find((candidate) => candidate.id === leagueId);
    const nextLeagueTeams = nextLeague?.teamIds
      .map((teamId) => leagueData.teams.find((team) => team.id === teamId))
      .filter((team): team is Team => Boolean(team)) ?? [];
    setContext(nextContext);
    if (!row) {
      poolRef.current = null;
      setPool(null);
      setScoutsByTeamId(null);
      setMlbRosterChemistryByTeamId({});
      setMlbRosterPlayerIdsByTeamId({});
      setFarmTierCap(null);
      return null;
    }
    const {
      teams,
      mlbRosterChemistryByTeamId: nextMlbRosterChemistryByTeamId,
      mlbRosterPlayerIdsByTeamId: nextMlbRosterPlayerIdsByTeamId,
    } = await buildFarmAuctionTeams({
      leagueId,
      leagueTeams: nextLeagueTeams,
      getRoster: leagueData.getRoster,
      leaguePlayers: leagueData.players,
    });
    const nextScoutsByTeamId = await loadOptionalFarmScouts(leagueId, nextLeagueTeams);
    if (row.pool) {
      const persistedPoolOrder = row.pool.auctionPlayers.map((player) => player.playerId);
      const persistedOrder = row.session.playerOrder;
      const matchesPersistedOrder = persistedPoolOrder.length === persistedOrder.length
        && persistedPoolOrder.every((playerId, index) => playerId === persistedOrder[index]);
      if (!matchesPersistedOrder) {
        console.warn("Farm auction persisted pool order mismatch; resuming persisted session with saved display pool.", {
          leagueId,
          seasonNumber,
          persistedOrder,
          persistedPoolOrder,
        });
      }
      poolRef.current = row.pool;
      const resumed = await autoAdvanceCpu(row.session, nextContext, nextLeagueTeams);
      setPool(row.pool);
      setScoutsByTeamId(nextScoutsByTeamId ?? null);
      setMlbRosterChemistryByTeamId(nextMlbRosterChemistryByTeamId);
      setMlbRosterPlayerIdsByTeamId(nextMlbRosterPlayerIdsByTeamId);
      setFarmTierCap(computeFarmTierCap(row.pool.auctionPlayers.map((player) => player.iv)));
      return resumed;
    }

    const regen = buildFarmAuctionSession({
      leagueId,
      seasonNumber,
      teams,
      scoutsByTeamId: nextScoutsByTeamId,
      seed: row.session.sessionBaseSeed ?? row.session.config.nominationOrderSeed,
      config: row.session.config,
    });
    const regeneratedOrder = regen.pool.auctionPlayers.map((player) => player.playerId);
    const persistedOrder = row.session.playerOrder;
    const matchesPersistedOrder = regeneratedOrder.length === persistedOrder.length
      && regeneratedOrder.every((playerId, index) => playerId === persistedOrder[index]);
    if (!matchesPersistedOrder) {
      console.warn("Farm auction pool regeneration mismatch; resuming persisted session with best-effort display pool.", {
        leagueId,
        seasonNumber,
        persistedOrder,
        regeneratedOrder,
      });
    }
    poolRef.current = regen.pool;
    const resumed = await autoAdvanceCpu(row.session, nextContext, nextLeagueTeams);
    setPool(regen.pool);
    setScoutsByTeamId(nextScoutsByTeamId ?? null);
    setMlbRosterChemistryByTeamId(nextMlbRosterChemistryByTeamId);
    setMlbRosterPlayerIdsByTeamId(nextMlbRosterPlayerIdsByTeamId);
    setFarmTierCap(regen.farmTierCap);
    return resumed;
  }), [autoAdvanceCpu, leagueData.getRoster, leagueData.leagues, leagueData.players, leagueData.teams, runAction]);

  const initFarmAuction = useCallback(async (
    leagueId: string,
    partialConfig: Partial<AuctionSetupConfig> = {},
  ) => runAction(async () => {
    const league = leagueData.leagues.find((candidate) => candidate.id === leagueId);
    if (!league) throw new Error("League not found.");
    const nextLeagueTeams = league.teamIds
      .map((teamId) => leagueData.teams.find((team) => team.id === teamId))
      .filter((team): team is Team => Boolean(team));
    if (nextLeagueTeams.length === 0) throw new Error("Selected league has no teams.");

    const {
      teams,
      mlbRosterChemistryByTeamId: nextMlbRosterChemistryByTeamId,
      mlbRosterPlayerIdsByTeamId: nextMlbRosterPlayerIdsByTeamId,
    } = await buildFarmAuctionTeams({
      leagueId,
      leagueTeams: nextLeagueTeams,
      getRoster: leagueData.getRoster,
      leaguePlayers: leagueData.players,
    });
    const seed = partialConfig.nominationOrderSeed || DEFAULT_AUCTION_SETUP_CONFIG.nominationOrderSeed;
    const sessionId = createFarmAuctionSessionId(leagueId, FARM_AUCTION_SEASON);
    const sessionLaunchNonce = createAuctionSessionLaunchNonce();
    const config: AuctionSetupConfig = {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      ...partialConfig,
      nominationOrderSeed: seed,
      bidIncrement: partialConfig.bidIncrement ?? DEFAULT_AUCTION_SETUP_CONFIG.bidIncrement,
      cpuShillCount: Math.max(0, Math.min(partialConfig.cpuShillCount ?? DEFAULT_AUCTION_SETUP_CONFIG.cpuShillCount, teams.length)),
      turnTimerSeconds: partialConfig.turnTimerSeconds ?? null,
      excludeFromLeague: partialConfig.excludeFromLeague ?? true,
      nominationWeightExponent: 3,
      flatReserveFloor: LEAGUE_MINIMUM_SALARY,
    };
    const nextContext = { leagueId, seasonNumber: FARM_AUCTION_SEASON };
    const nextScoutsByTeamId = await loadOptionalFarmScouts(leagueId, nextLeagueTeams);
    const result = buildFarmAuctionSession({
      leagueId,
      seasonNumber: FARM_AUCTION_SEASON,
      teams,
      scoutsByTeamId: nextScoutsByTeamId,
      seed,
      config,
      sessionId,
      sessionLaunchNonce,
    });

    setContext(nextContext);
    poolRef.current = result.pool;
    await persist(result.session, nextContext);
    const initialized = await autoAdvanceCpu(result.session, nextContext, nextLeagueTeams);
    setPool(result.pool);
    setScoutsByTeamId(nextScoutsByTeamId ?? null);
    setMlbRosterChemistryByTeamId(nextMlbRosterChemistryByTeamId);
    setMlbRosterPlayerIdsByTeamId(nextMlbRosterPlayerIdsByTeamId);
    setFarmTierCap(result.farmTierCap);
    return initialized;
  }), [autoAdvanceCpu, leagueData, persist, runAction]);

  const runSessionTransition = useCallback(async (
    transition: (current: CpuShillAuctionSession) => AuctionTransitionResult,
  ) => runAction(async () => {
    if (!session || !context) throw new Error("Farm auction session is not ready.");
    const transitioned = transitionOrThrow(transition(session));
    await persist(transitioned, context);
    return autoAdvanceCpu(transitioned, context, leagueTeams);
  }), [autoAdvanceCpu, context, leagueTeams, persist, runAction, session]);

  const bid = useCallback((teamId: string, amount: number) => runSessionTransition((current) => recordBid(current, teamId, amount)), [runSessionTransition]);
  const pass = useCallback((teamId: string) => runSessionTransition((current) => {
    if (current.state === "RESOLVE" && current.pendingClaim?.teamId === teamId) {
      return passLoneSurvivorOut(current);
    }
    return passBid(current, teamId);
  }), [runSessionTransition]);
  const claimAtReserve = useCallback(() => runSessionTransition((current) => claimLoneSurvivor(current)), [runSessionTransition]);
  const resolve = useCallback(() => runSessionTransition((current) => resolveLot(current)), [runSessionTransition]);
  const advance = useCallback(() => runSessionTransition((current) => advanceLot(current)), [runSessionTransition]);

  return {
    session,
    pool,
    scoutsByTeamId,
    mlbRosterChemistryByTeamId,
    mlbRosterPlayerIdsByTeamId,
    farmTierCap,
    seed: session?.config.nominationOrderSeed ?? DEFAULT_AUCTION_SETUP_CONFIG.nominationOrderSeed,
    isWorking,
    error,
    leagueData,
    activeLeagueId: context?.leagueId ?? null,
    seasonNumber: context?.seasonNumber ?? FARM_AUCTION_SEASON,
    cpuTeamIds,
    currentBidderTeamId,
    initFarmAuction,
    loadFarmAuction,
    bid,
    pass,
    claimAtReserve,
    resolve,
    advance,
    isCpuTeam: (teamId) => cpuTeamIdSet.has(teamId ?? ""),
  };
}
