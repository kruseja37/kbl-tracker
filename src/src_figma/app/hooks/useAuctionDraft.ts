import { useCallback, useMemo, useRef, useState } from "react";

import {
  claimLoneSurvivor,
  resolveLot,
  advanceLot,
  getCurrentBidderTeamId,
  initAuctionSession,
  passBid,
  passLoneSurvivorOut,
  recordBid,
  surfaceNextPlayer,
  type AuctionTransitionResult,
} from "../../../engines/auctionStateMachine";
import { computeAuctionTeamProjectedTaxWithCaps } from "../../../engines/auctionLuxuryTax";
import type { ConstructionPlayer, TeamCapIdentity } from "../../../engines/leagueConstruction";
import {
  buildArchetypeShillProfile,
  type CpuShillAuctionSession,
  type CpuShillProfile,
} from "../../../engines/cpuShillBidding";
import { SIZING_TUNING } from "../../../engines/auctionPoolSizing";
import {
  classifyCpuTeams,
  deriveShillTeamIds,
} from "../../../engines/cpuTeamRoles";
import { DEFAULT_AUCTION_SETUP_CONFIG, type AuctionSetupConfig } from "../../../data/auctionEngineConstants";
import { LEAGUE_MINIMUM_SALARY } from "../../../data/rosterEngineConstants";
import type { LuxuryCapRow } from "../../../data/tierParams";
import {
  createAuctionSessionId,
  getAuctionSession,
  saveAuctionSession,
} from "../../../utils/leagueBuilderStorage";
import {
  buildAuctionPlayers,
  buildAuctionPlayersWithPositions,
  buildAuctionTeams,
  commitCompletedMlbAuctionSessionToLeagueRosters,
  computeIvPercentiles,
  MLB_AUCTION_SEASON,
} from "../../../utils/leagueBuilderAuctionPipeline";
import { regenerateAndPersistLeaguePoolAxes } from "../../../utils/leaguePoolAxisRegenPersist";
import {
  toConstructionPlayer,
  useLeagueBuilderData,
  type Player,
  type RegisteredPool,
  type Team,
  type TeamRoster,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

export { getCurrentBidderTeamId } from "../../../engines/auctionStateMachine";
export {
  buildAuctionPlayers,
  buildAuctionTeams,
  computeIvPercentiles,
  MLB_AUCTION_SEASON,
} from "../../../utils/leagueBuilderAuctionPipeline";

const MAX_CPU_AUTO_ADVANCE_STEPS = 400;

type AuctionDraftContext = {
  leagueId: string;
  seasonNumber: number;
};

type AuctionLuxuryTaxContext = {
  poolById: Map<string, RegisteredPool["players"][number]>;
  playerById: Map<string, Player>;
  identityByTeamId: Map<string, TeamCapIdentity | undefined>;
  baseCaps: LuxuryCapRow[];
};

export type AuctionDraftError = string | null;

export interface UseAuctionDraftOptions {
  leagueData?: UseLeagueBuilderDataReturn;
}

export interface UseAuctionDraftReturn {
  session: CpuShillAuctionSession | null;
  seed: string;
  isWorking: boolean;
  error: AuctionDraftError;
  leagueData: UseLeagueBuilderDataReturn;
  activeLeagueId: string | null;
  seasonNumber: number;
  cpuTeamIds: string[];
  currentBidderTeamId: string | null;
  initAuction: (leagueId: string, partialConfig?: Partial<AuctionSetupConfig>) => Promise<CpuShillAuctionSession | null>;
  loadAuction: (leagueId: string, seasonNumber?: number) => Promise<CpuShillAuctionSession | null>;
  bid: (teamId: string, amount: number) => Promise<CpuShillAuctionSession | null>;
  pass: (teamId: string) => Promise<CpuShillAuctionSession | null>;
  claimAtReserve: () => Promise<CpuShillAuctionSession | null>;
  resolve: () => Promise<CpuShillAuctionSession | null>;
  advance: () => Promise<CpuShillAuctionSession | null>;
  isCpuTeam: (teamId: string | null | undefined) => boolean;
  shillTeamIds: string[];
  controlledCpuTeamIds: string[];
}

function transitionOrThrow(result: AuctionTransitionResult): CpuShillAuctionSession {
  if (!result.ok) {
    throw new Error(`Auction transition rejected: ${result.reason}`);
  }
  return result.session as CpuShillAuctionSession;
}

/**
 * FABLE-C3-FIX F3: the pool-aware strand law can reject a CPU's chosen bid mid-auto-advance; a
 * CPU converts exactly that rejection into its PASS (the sweep harness's
 * recordBidOrPassIfStranded semantics) so the draft keeps moving. Humans keep the rejection — it
 * surfaces as UI feedback, never a silent pass. Every OTHER rejection reason passes through
 * untouched (and still throws upstream). Pure and exported for direct testing.
 */
export function strandSafeBidTransition(
  current: CpuShillAuctionSession,
  teamId: string,
  amount: number,
  isCpuActor: boolean,
): AuctionTransitionResult {
  const attempt = recordBid(current, teamId, amount);
  if (!attempt.ok && attempt.reason === "bid-strands-roster" && isCpuActor) {
    return passBid(current, teamId);
  }
  return attempt;
}

/** The lone-survivor equivalent of `strandSafeBidTransition` (FABLE-C3-FIX F3). */
export function strandSafeClaimTransition(
  current: CpuShillAuctionSession,
  isCpuClaimant: boolean,
): AuctionTransitionResult {
  const attempt = claimLoneSurvivor(current);
  if (!attempt.ok && attempt.reason === "bid-strands-roster" && isCpuClaimant) {
    return passLoneSurvivorOut(current);
  }
  return attempt;
}

export function teamDisplayName(team: Team | null | undefined): string {
  if (!team) return "Unknown Team";
  return team.location ? `${team.location} ${team.name}` : team.name;
}

export function playerDisplayName(player: Player | null | undefined): string {
  if (!player) return "Unknown Player";
  return `${player.firstName} ${player.lastName}`.trim() || player.id;
}

function buildAuctionLuxuryTaxContext(input: {
  pool: RegisteredPool;
  leagueTeams: readonly Team[];
  players: readonly Player[];
}): AuctionLuxuryTaxContext {
  return {
    poolById: new Map(input.pool.players.map((player) => [player.id, player])),
    playerById: new Map(input.players.map((player) => [player.id, player])),
    identityByTeamId: new Map(input.leagueTeams.map((team) => [team.id, team.capIdentity])),
    baseCaps: input.pool.luxuryCaps,
  };
}

function zeroProjectedTax(session: CpuShillAuctionSession): CpuShillAuctionSession {
  return {
    ...session,
    teams: session.teams.map((team) => ({ ...team, projectedTax: 0 })),
  };
}

function resolveConstructionPlayer(
  playerId: string,
  ctx: AuctionLuxuryTaxContext,
): ConstructionPlayer | null {
  if (!ctx.poolById.has(playerId)) return null;
  const player = ctx.playerById.get(playerId);
  return player ? toConstructionPlayer(player) : null;
}

export function applyAuctionLuxuryTaxForLot(
  session: CpuShillAuctionSession,
  ctx: AuctionLuxuryTaxContext | null | undefined,
): CpuShillAuctionSession {
  if (!session.currentLot) return session;
  if (!ctx) return zeroProjectedTax(session);

  const candidate = resolveConstructionPlayer(session.currentLot.playerId, ctx);
  if (!candidate) return zeroProjectedTax(session);

  return {
    ...session,
    teams: session.teams.map((team) => {
      const committedRoster: ConstructionPlayer[] = [];

      for (const assignment of team.roster) {
        const player = resolveConstructionPlayer(assignment.playerId, ctx);
        if (!player) return { ...team, projectedTax: 0 };
        committedRoster.push(player);
      }

      return {
        ...team,
        projectedTax: computeAuctionTeamProjectedTaxWithCaps(
          committedRoster,
          candidate,
          ctx.identityByTeamId.get(team.teamId),
          ctx.baseCaps,
        ),
      };
    }),
  };
}

export function deriveCpuTeamIds(session: CpuShillAuctionSession | null, leagueTeams: readonly Team[]): string[] {
  return classifyCpuTeams(session, leagueTeams).allCpuTeamIds;
}

function shillTeamId(leagueId: string, index: number): string {
  return `__auction_shill__${leagueId}__${index + 1}`;
}

/**
 * FABLE-C2B (audit AUC-5, spec §6:195-197): each shill gets its own HIDDEN archetype seeded from
 * the locked 24, replacing the old hand-rolled band vectors. Deterministic per (league, seat).
 */
function buildPureShillProfiles(leagueId: string, count: number): Record<string, CpuShillProfile> {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => {
    const teamId = shillTeamId(leagueId, index);
    return [teamId, {
      ...buildArchetypeShillProfile(teamId, `${leagueId}:shill-archetype`),
      // FABLE-C3: cap shill appetite — uncapped end-checkpoint shills hoard ~a full roster.
      shillMaxWins: SIZING_TUNING.winsPerShill,
    }];
  }));
}

function buildPureShillAuctionTeams(input: {
  leagueId: string;
  count: number;
  budget: number;
}): Array<{
  teamId: string;
  budgetRemaining: number;
  rosterSlotsRemaining: number;
  minSalary: number;
  projectedTax: number;
  roster: [];
}> {
  return Array.from({ length: input.count }, (_, index) => ({
    teamId: shillTeamId(input.leagueId, index),
    budgetRemaining: input.budget,
    rosterSlotsRemaining: 22,
    minSalary: LEAGUE_MINIMUM_SALARY,
    projectedTax: 0,
    roster: [],
  }));
}

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

export function useAuctionDraft(options: UseAuctionDraftOptions = {}): UseAuctionDraftReturn {
  const fallbackLeagueData = useLeagueBuilderData();
  const leagueData = options.leagueData ?? fallbackLeagueData;
  const [session, setSession] = useState<CpuShillAuctionSession | null>(null);
  const [context, setContext] = useState<AuctionDraftContext | null>(null);
  const taxContextRef = useRef<AuctionLuxuryTaxContext | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<AuctionDraftError>(null);

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

  const cpuRoles = useMemo(() => classifyCpuTeams(session, leagueTeams), [leagueTeams, session]);
  const cpuTeamIds = cpuRoles.allCpuTeamIds;
  const shillTeamIds = cpuRoles.shillTeamIds;
  const controlledCpuTeamIds = cpuRoles.controlledCpuTeamIds;
  const cpuTeamIdSet = useMemo(() => new Set(cpuTeamIds), [cpuTeamIds]);
  const currentBidderTeamId = getCurrentBidderTeamId(session);

  const persist = useCallback(async (nextSession: CpuShillAuctionSession, nextContext: AuctionDraftContext) => {
    await saveAuctionSession({
      id: createAuctionSessionId(nextContext.leagueId, nextContext.seasonNumber),
      leagueId: nextContext.leagueId,
      seasonNumber: nextContext.seasonNumber,
      seed: nextSession.config.nominationOrderSeed,
      session: nextSession,
    });
    if (nextSession.state === "AUCTION_COMPLETE" && nextSession.saleCount > 0) {
      await commitCompletedMlbAuctionSessionToLeagueRosters({
        leagueId: nextContext.leagueId,
        session: nextSession,
        excludeTeamIds: deriveShillTeamIds(nextSession, leagueTeams),
      });
    }
    return nextSession;
  }, [leagueTeams]);

  const autoAdvanceCpu = useCallback(async (
    startSession: CpuShillAuctionSession,
    nextContext: AuctionDraftContext,
    nextLeagueTeams: readonly Team[],
  ) => {
    let next = startSession;
    let previousProgress = stateProgressKey(next);
    const nextCpuTeamIds = new Set(deriveCpuTeamIds(next, nextLeagueTeams));

    for (let step = 0; step < MAX_CPU_AUTO_ADVANCE_STEPS; step += 1) {
      if (next.state === "AUCTION_COMPLETE") return next;

      if (next.state === "NOMINATION") {
        next = transitionOrThrow(surfaceNextPlayer(next));
        next = applyAuctionLuxuryTaxForLot(next, taxContextRef.current);
        await persist(next, nextContext);
      } else if (next.state === "OPEN_BIDDING") {
        if (!next.currentLot) return next;
        if (next.currentLot.stillIn.length <= 1) {
          next = transitionOrThrow(resolveLot(next));
          await persist(next, nextContext);
        } else {
          const bidder = getCurrentBidderTeamId(next);
          if (!nextCpuTeamIds.has(bidder ?? "")) return next;
          return next;
        }
      } else if (next.state === "RESOLVE") {
        if (next.pendingClaim) {
          if (!nextCpuTeamIds.has(next.pendingClaim.teamId)) return next;
          return next;
        } else {
          next = transitionOrThrow(resolveLot(next));
          await persist(next, nextContext);
        }
      } else {
        return next;
      }

      const progress = stateProgressKey(next);
      if (progress === previousProgress) {
        throw new Error(`CPU auto-advance made no progress from ${progress}`);
      }
      previousProgress = progress;
    }

    throw new Error(`CPU auto-advance exceeded ${MAX_CPU_AUTO_ADVANCE_STEPS} steps from ${startSession.state}`);
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

  const loadAuction = useCallback(async (leagueId: string, seasonNumber = MLB_AUCTION_SEASON) => runAction(async () => {
    const row = await getAuctionSession(leagueId, seasonNumber);
    const nextContext = { leagueId, seasonNumber };
    const nextLeague = leagueData.leagues.find((candidate) => candidate.id === leagueId);
    const nextLeagueTeams = nextLeague?.teamIds
      .map((teamId) => leagueData.teams.find((team) => team.id === teamId))
      .filter((team): team is Team => Boolean(team)) ?? [];
    setContext(nextContext);
    if (!row) {
      taxContextRef.current = null;
      return null;
    }
    if (row.session.state === "AUCTION_COMPLETE" && row.session.saleCount === 0 && row.session.results.length === 0) {
      taxContextRef.current = null;
      return null;
    }

    const existingPool = await leagueData.getRegisteredPool(leagueId);
    const pool = existingPool ?? await leagueData.registerLeaguePool(leagueId);
    taxContextRef.current = buildAuctionLuxuryTaxContext({
      pool,
      leagueTeams: nextLeagueTeams,
      players: leagueData.players,
    });

    const resumed = await autoAdvanceCpu(
      applyAuctionLuxuryTaxForLot(row.session, taxContextRef.current),
      nextContext,
      nextLeagueTeams,
    );
    return resumed;
  }), [autoAdvanceCpu, leagueData, runAction]);

  const initAuction = useCallback(async (
    leagueId: string,
    partialConfig: Partial<AuctionSetupConfig> = {},
  ) => runAction(async () => {
    const league = leagueData.leagues.find((candidate) => candidate.id === leagueId);
    if (!league) throw new Error("League not found.");
    const nextLeagueTeams = league.teamIds
      .map((teamId) => leagueData.teams.find((team) => team.id === teamId))
      .filter((team): team is Team => Boolean(team));
    if (nextLeagueTeams.length === 0) throw new Error("Selected league has no teams.");

    await regenerateAndPersistLeaguePoolAxes(leagueId);
    // Draft Setup redesign: prefer the LOCKED pool snapshot. A locked pool is the exact
    // membership + IV the user reviewed and froze, so consume it as-is instead of
    // re-registering. Unlocked (legacy/direct-entry) → register now, as before.
    const existingPool = await leagueData.getRegisteredPool(leagueId);
    const pool = existingPool?.locked
      ? existingPool
      : await leagueData.registerLeaguePool(leagueId);
    if (pool.players.length === 0) throw new Error("RegisteredPool has no players for this league.");

    for (const team of nextLeagueTeams) {
      await leagueData.clearRoster(team.id, leagueId);
    }

    const realTeams = await buildAuctionTeams({
      leagueTeams: nextLeagueTeams,
      pool,
      getRoster: leagueData.getRoster,
    });
    const explicitShillCount = Math.max(0, partialConfig.cpuShillCount ?? DEFAULT_AUCTION_SETUP_CONFIG.cpuShillCount);
    const shillTeams = buildPureShillAuctionTeams({
      leagueId,
      count: explicitShillCount,
      budget: pool.tierCap,
    });
    const teams = [...realTeams, ...shillTeams];
    // FABLE-C1: position-enriched players power the machine's own_need strand guard (spec §5).
    const players = await buildAuctionPlayersWithPositions(pool);
    const config: AuctionSetupConfig = {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      ...partialConfig,
      nominationOrderSeed: partialConfig.nominationOrderSeed || DEFAULT_AUCTION_SETUP_CONFIG.nominationOrderSeed,
      bidIncrement: partialConfig.bidIncrement ?? DEFAULT_AUCTION_SETUP_CONFIG.bidIncrement,
      // Pure shills are explicit session participants in cpuShills. Keep the legacy
      // "last N nomination-order teams" selector off so real clubs are never borrowed.
      cpuShillCount: 0,
      turnTimerSeconds: partialConfig.turnTimerSeconds ?? null,
      excludeFromLeague: partialConfig.excludeFromLeague ?? true,
      nominationWeightExponent: 2,
      // FABLE-C3 end-checkpoint (audit FS-3): pure-pressure shills never need to COMPLETE a
      // roster — the draft ends when every REAL team is full, shills can't be force-filled, and
      // the pool no longer has to carry 22 phantom seats per shill.
      nonCompletingTeamIds: shillTeams.map((team) => team.teamId),
    };
    const nextContext = { leagueId, seasonNumber: MLB_AUCTION_SEASON };
    const initialized = {
      ...(initAuctionSession({ teams, players, config }) as CpuShillAuctionSession),
      cpuShills: buildPureShillProfiles(leagueId, explicitShillCount),
    };

    setContext(nextContext);
    taxContextRef.current = buildAuctionLuxuryTaxContext({
      pool,
      leagueTeams: nextLeagueTeams,
      players: leagueData.players,
    });
    await persist(initialized, nextContext);
    return autoAdvanceCpu(initialized, nextContext, nextLeagueTeams);
  }), [autoAdvanceCpu, leagueData, persist, runAction]);

  const runSessionTransition = useCallback(async (
    transition: (current: CpuShillAuctionSession) => AuctionTransitionResult,
  ) => runAction(async () => {
    if (!session || !context) throw new Error("Auction session is not ready.");
    const transitioned = transitionOrThrow(transition(session));
    await persist(transitioned, context);
    return autoAdvanceCpu(transitioned, context, leagueTeams);
  }), [autoAdvanceCpu, context, leagueTeams, persist, runAction, session]);

  const bid = useCallback(
    (teamId: string, amount: number) =>
      runSessionTransition((current) => strandSafeBidTransition(current, teamId, amount, cpuTeamIdSet.has(teamId))),
    [cpuTeamIdSet, runSessionTransition],
  );
  const pass = useCallback((teamId: string) => runSessionTransition((current) => {
    if (current.state === "RESOLVE" && current.pendingClaim?.teamId === teamId) {
      return passLoneSurvivorOut(current);
    }
    return passBid(current, teamId);
  }), [runSessionTransition]);
  const claimAtReserve = useCallback(
    () =>
      runSessionTransition((current) =>
        strandSafeClaimTransition(current, cpuTeamIdSet.has(current.pendingClaim?.teamId ?? "")),
      ),
    [cpuTeamIdSet, runSessionTransition],
  );
  const resolve = useCallback(() => runSessionTransition((current) => resolveLot(current)), [runSessionTransition]);
  const advance = useCallback(() => runSessionTransition((current) => advanceLot(current)), [runSessionTransition]);

  return {
    session,
    seed: session?.config.nominationOrderSeed ?? DEFAULT_AUCTION_SETUP_CONFIG.nominationOrderSeed,
    isWorking,
    error,
    leagueData,
    activeLeagueId: context?.leagueId ?? null,
    seasonNumber: context?.seasonNumber ?? MLB_AUCTION_SEASON,
    cpuTeamIds,
    shillTeamIds,
    controlledCpuTeamIds,
    currentBidderTeamId,
    initAuction,
    loadAuction,
    bid,
    pass,
    claimAtReserve,
    resolve,
    advance,
    isCpuTeam: (teamId) => cpuTeamIdSet.has(teamId ?? ""),
  };
}
