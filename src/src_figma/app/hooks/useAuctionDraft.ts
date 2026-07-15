import { useCallback, useMemo, useRef, useState } from "react";

import {
  claimLoneSurvivor,
  createAuctionSessionLaunchNonce,
  resolveLot,
  advanceLot,
  getCurrentBidderTeamId,
  getCurrentNominatorTeamId,
  initAuctionSession,
  isActivePassedResult,
  nominatePlayer,
  nominationBidCeiling,
  passBid,
  passLoneSurvivorOut,
  recordBid,
  surfaceNextPlayer,
  type AuctionTransitionResult,
} from "../../../engines/auctionStateMachine";
import {
  auctionMarginalTaxWithCaps,
  normalizeAuctionLuxuryCapsForLeagueSize,
} from "../../../engines/auctionLuxuryTax";
import type { BandPriorities, ConstructionPlayer, TeamCapIdentity } from "../../../engines/leagueConstruction";
import {
  buildArchetypeShillProfile,
  buildClubCpuProfile,
  type CpuShillAuctionSession,
  type CpuShillProfile,
} from "../../../engines/cpuShillBidding";
import { resolveClubBandPriorities } from "../../../engines/archetypeIdentity";
import {
  classifyCpuTeams,
  deriveControlledCpuTeamIds,
  deriveShillTeamIds,
} from "../../../engines/cpuTeamRoles";
import {
  AUCTION_REBUILD_TUNING,
  DEFAULT_AUCTION_SETUP_CONFIG,
  type AuctionSetupConfig,
} from "../../../data/auctionEngineConstants";
import { LEAGUE_MINIMUM_SALARY } from "../../../data/rosterEngineConstants";
import { LEGAL_ROSTER } from "../../../data/rosterConstruction";
import type { LuxuryCapRow } from "../../../data/tierParams";
import {
  createAuctionSessionId,
  getAuctionSession,
  resolveLeagueSalaryCap,
  saveAuctionSession,
} from "../../../utils/leagueBuilderStorage";
import {
  buildAuctionPlayersWithPositions,
  buildAuctionTeams,
  commitCompletedMlbAuctionSessionToLeagueRosters,
  MLB_AUCTION_SEASON,
} from "../../../utils/leagueBuilderAuctionPipeline";
import { initializeAndPersistDraftPoolPlayerAxes } from "../../../utils/leaguePoolAxisRegenPersist";
import {
  toConstructionPlayer,
  useLeagueBuilderData,
  type Player,
  type RegisteredPool,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

export { getCurrentBidderTeamId, getCurrentNominatorTeamId } from "../../../engines/auctionStateMachine";
export {
  buildAuctionPlayers,
  buildAuctionTeams,
  computeIvPercentiles,
  MLB_AUCTION_SEASON,
} from "../../../utils/leagueBuilderAuctionPipeline";

const MAX_CPU_AUTO_ADVANCE_STEPS = 400;
const UNIFORM_BAND_PRIORITIES: BandPriorities = {
  Power: 1,
  Contact: 1,
  Speed: 1,
  Defense: 1,
  Rotation: 1,
  Bullpen: 1,
};

type AuctionDraftContext = {
  leagueId: string;
  seasonNumber: number;
};

export type AuctionLuxuryTaxContext = {
  poolById: Map<string, RegisteredPool["players"][number]>;
  playerById: Map<string, Player>;
  identityByTeamId: Map<string, TeamCapIdentity | undefined>;
  /**
   * TAXTEETH (2026-07-08): the pool's OWN resolved luxury caps -- the same `baseCaps` LeagueBuilder
   * AuctionDraft.tsx's TRUE COST line now reads too (both route through
   * auctionMarginalTaxWithCaps), so team.projectedTax and the whisper's displayed TRUE COST tax
   * component are always the identical number for the identical roster+candidate, with no
   * tier-vs-pool-caps divergence possible even if a league's caps are ever customized.
   */
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
  currentNominatorTeamId: string | null;
  initAuction: (leagueId: string, partialConfig?: Partial<AuctionSetupConfig>) => Promise<CpuShillAuctionSession | null>;
  loadAuction: (leagueId: string, seasonNumber?: number) => Promise<CpuShillAuctionSession | null>;
  bid: (teamId: string, amount: number) => Promise<CpuShillAuctionSession | null>;
  nominate: (teamId: string, playerId: string, openingBid: number) => Promise<CpuShillAuctionSession | null>;
  nominationCeiling: (teamId: string, playerId: string) => number | null;
  pass: (teamId: string) => Promise<CpuShillAuctionSession | null>;
  claimAtReserve: () => Promise<CpuShillAuctionSession | null>;
  resolve: () => Promise<CpuShillAuctionSession | null>;
  advance: () => Promise<CpuShillAuctionSession | null>;
  isCpuTeam: (teamId: string | null | undefined) => boolean;
  shillTeamIds: string[];
  controlledCpuTeamIds: string[];
}

const AUCTION_TRANSITION_REASON_COPY: Record<string, string> = {
  "auction-uncompletable": "This draft cannot finish a legal roster from the remaining pool.",
  "bid-strands-roster": "That bid would leave you unable to fill a legal roster.",
  "claim-strands-roster": "That claim would leave you unable to fill a legal roster.",
  "bid-below-minimum": "That bid is below the current asking price.",
  "bid-above-max": "That bid is above your room after reserving money for the empty slots.",
  "bidder-not-active": "It is not that club's turn to bid.",
  "manual-nomination-required": "The club on the clock must choose a player and an opening bid.",
  "not-current-nominator": "It is not that club's turn to nominate.",
  "nomination-below-minimum": "The opening bid must be at least the league minimum salary.",
  "nomination-above-solvency-cap": "That opening bid would leave the club unable to finish its roster.",
  "team-not-in-lot": "That club is no longer in this lot.",
  "no-current-lot": "There is no active lot right now.",
  "invalid-state": "The room is not ready for that move yet.",
};

export function auctionTransitionReasonCopy(reason: string): string {
  return AUCTION_TRANSITION_REASON_COPY[reason] ?? reason.replace(/-/g, " ");
}

export function auctionTransitionErrorCopy(message: string): string {
  const match = /^(?:Farm auction transition rejected|Auction transition rejected):\s*(.+)$/.exec(message);
  if (!match) return message;
  return auctionTransitionReasonCopy(match[1]);
}

function transitionOrThrow(result: AuctionTransitionResult): CpuShillAuctionSession {
  if (!result.ok) {
    throw new Error(auctionTransitionReasonCopy(result.reason));
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
    baseCaps: normalizeAuctionLuxuryCapsForLeagueSize(
      input.pool.luxuryCaps,
      input.leagueTeams.length,
    ),
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

/**
 * TAXTEETH (JK ruling 2026-07-08, spec-docs/contracts/CONTRACT_TAXTEETH_2026-07-08.md): this used
 * to compute each team's FULL total roster tax if it won the current lot's candidate (display
 * only, per FABLE-C2B D4 -- "projectedTax stays on the saved team shape, display/advice only").
 * TAXTEETH repoints it at the MARGINAL delta (auctionMarginalTaxWithCaps -- the same underlying
 * formula TRUE COST uses, LeagueBuilderAuctionDraft.tsx, now sharing the pool-caps-based call)
 * because team.projectedTax is now a REAL, consumed quantity: the pure engine
 * (auctionStateMachine.ts) reads it to reserve the marginal tax in the bid ceiling
 * (sessionBidCeiling) and to charge it at settlement (finalizeSoldLot). A "full total" number
 * would double-count every prior lot's tax on every subsequent one; the marginal delta is the
 * honest, once-per-acquisition cost of THIS specific win.
 */
export function applyAuctionLuxuryTaxForLot(
  session: CpuShillAuctionSession,
  ctx: AuctionLuxuryTaxContext | null | undefined,
): CpuShillAuctionSession {
  if (!session.currentLot) return session;
  if (!ctx) return zeroProjectedTax(session);

  const candidate = resolveConstructionPlayer(session.currentLot.playerId, ctx);
  if (!candidate) return zeroProjectedTax(session);
  const nonCompletingTeamIds = new Set(session.config.nonCompletingTeamIds ?? []);

  return {
    ...session,
    teams: session.teams.map((team) => {
      // SHILLTAX captain ruling (CONTRACT_AUCTION_COLLAPSE_DIAG_2026-07-09): explicit pure
      // shills are non-completing price-pressure seats, so their raw-cash ceiling and settlement
      // must stay tax-neutral end to end. Real roster-bearing clubs retain the exact tax path.
      if (nonCompletingTeamIds.has(team.teamId)) return { ...team, projectedTax: 0 };

      const committedRoster: ConstructionPlayer[] = [];

      for (const assignment of team.roster) {
        const player = resolveConstructionPlayer(assignment.playerId, ctx);
        if (!player) return { ...team, projectedTax: 0 };
        committedRoster.push(player);
      }

      return {
        ...team,
        projectedTax: auctionMarginalTaxWithCaps(
          committedRoster,
          candidate,
          ctx.identityByTeamId.get(team.teamId),
          ctx.baseCaps,
        ),
      };
    }),
  };
}

/** Candidate form of the same tax projection, used before a committed nomination opens the lot. */
export function applyAuctionLuxuryTaxForCandidate(
  session: CpuShillAuctionSession,
  playerId: string,
  ctx: AuctionLuxuryTaxContext | null | undefined,
): CpuShillAuctionSession {
  if (!session.players[playerId]) return zeroProjectedTax(session);
  const preview: CpuShillAuctionSession = {
    ...session,
    currentLot: {
      playerId,
      nominatorTeamId: getCurrentNominatorTeamId(session) ?? "",
      openingAsk: LEAGUE_MINIMUM_SALARY,
      highBid: null,
      highBidder: null,
      stillIn: [],
      bidTurnTeamId: null,
      bidLog: [],
    },
  };
  const projected = applyAuctionLuxuryTaxForLot(preview, ctx);
  return { ...projected, currentLot: session.currentLot };
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
      shillMaxWins: AUCTION_REBUILD_TUNING.shillMaxWinsPerShill,
    }];
  }));
}

function buildClubCpuProfileForTeam(leagueId: string, team: Team): CpuShillProfile {
  return buildClubCpuProfile({
    teamId: team.id,
    leagueId,
    bandPriorities: resolveClubBandPriorities(team) ?? UNIFORM_BAND_PRIORITIES,
    archetypeId: team.mlbArchetypeKey ?? null,
  });
}

function buildClubCpuProfiles(leagueId: string, leagueTeams: readonly Team[]): Record<string, CpuShillProfile> {
  return Object.fromEntries(
    leagueTeams
      .filter((team) => team.controlledBy === "ai")
      .map((team) => [team.id, buildClubCpuProfileForTeam(leagueId, team)]),
  );
}

function healMissingClubCpuProfiles(input: {
  session: CpuShillAuctionSession;
  leagueId: string;
  leagueTeams: readonly Team[];
}): { session: CpuShillAuctionSession; changed: boolean } {
  const nominationIds = new Set(input.session.nominationOrder);
  const missingTeams = input.leagueTeams.filter((team) => (
    deriveControlledCpuTeamIds([team]).includes(team.id) &&
    nominationIds.has(team.id) &&
    !input.session.cpuShills?.[team.id]
  ));

  if (missingTeams.length === 0) {
    return { session: input.session, changed: false };
  }

  return {
    changed: true,
    session: {
      ...input.session,
      cpuShills: {
        ...input.session.cpuShills,
        ...Object.fromEntries(
          missingTeams.map((team) => [team.id, buildClubCpuProfileForTeam(input.leagueId, team)]),
        ),
      },
    },
  };
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
    rosterSlotsRemaining: LEGAL_ROSTER.size,
    minSalary: LEAGUE_MINIMUM_SALARY,
    projectedTax: 0,
    roster: [],
  }));
}

function stateProgressKey(session: CpuShillAuctionSession): string {
  const lot = session.currentLot;
  const permanentlyPassedIds = session.results
    .filter((result, index) => isActivePassedResult(session, result, index))
    .map((result) => result.playerId)
    .sort();
  const soldIds = session.results
    .filter((result) => result.disposition === "SOLD")
    .map((result) => result.playerId)
    .sort();
  return JSON.stringify({
    state: session.state,
    nominationIndex: session.nominationIndex,
    nominationRound: session.nominationRound,
    available: session.availablePlayerIds.length,
    saleCount: session.saleCount,
    soldIds,
    permanentlyPassedIds,
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
  const currentNominatorTeamId = getCurrentNominatorTeamId(session);

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
        if (next.config.sequentialNomination) return next;
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

    const healed = healMissingClubCpuProfiles({
      session: row.session,
      leagueId,
      leagueTeams: nextLeagueTeams,
    });
    const withTax = applyAuctionLuxuryTaxForLot(healed.session, taxContextRef.current);
    if (healed.changed) {
      await persist(withTax, nextContext);
    }

    const resumed = await autoAdvanceCpu(
      withTax,
      nextContext,
      nextLeagueTeams,
    );
    return resumed;
  }), [autoAdvanceCpu, leagueData, persist, runAction]);

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

    // Draft Setup redesign: prefer the LOCKED pool snapshot. A locked pool is the exact
    // membership + IV the user reviewed and froze, so consume it as-is instead of
    // re-registering. Unlocked (legacy/direct-entry) → register now, as before.
    const existingPool = await leagueData.getRegisteredPool(leagueId);
    if (existingPool?.locked) {
      await initializeAndPersistDraftPoolPlayerAxes(leagueId, existingPool.players.map((p) => p.id));
    } else {
      await initializeAndPersistDraftPoolPlayerAxes(leagueId);
    }
    const pool = existingPool?.locked
      ? existingPool
      : await leagueData.registerLeaguePool(leagueId);
    if (pool.players.length === 0) throw new Error("RegisteredPool has no players for this league.");
    const sessionPool: RegisteredPool = {
      ...pool,
      tierCap: resolveLeagueSalaryCap(league),
    };

    for (const team of nextLeagueTeams) {
      await leagueData.clearRoster(team.id, leagueId);
    }

    const realTeams = await buildAuctionTeams({
      leagueTeams: nextLeagueTeams,
      pool: sessionPool,
      getRoster: leagueData.getRoster,
    });
    const explicitShillCount = Math.max(0, partialConfig.cpuShillCount ?? DEFAULT_AUCTION_SETUP_CONFIG.cpuShillCount);
    const shillTeams = buildPureShillAuctionTeams({
      leagueId,
      count: explicitShillCount,
      budget: sessionPool.tierCap,
    });
    const teams = [...realTeams, ...shillTeams];
    // FABLE-C1: position-enriched players power the machine's own_need strand guard (spec §5).
    const players = await buildAuctionPlayersWithPositions(sessionPool);
    const sessionId = createAuctionSessionId(leagueId, MLB_AUCTION_SEASON);
    const sessionLaunchNonce = createAuctionSessionLaunchNonce();
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
      sequentialNomination: true,
      cpuNominationOpenFraction: AUCTION_REBUILD_TUNING.cpuNominationOpenFraction,
      shillAnchorFraction: AUCTION_REBUILD_TUNING.shillAnchorFraction,
      shillTotalWinCap: AUCTION_REBUILD_TUNING.shillTotalWinCap,
      // FABLE-C3 end-checkpoint (audit FS-3): pure-pressure shills never need to COMPLETE a
      // roster — the draft ends when every REAL team is full, shills can't be force-filled, and
      // the pool no longer has to carry 22 phantom seats per shill.
      nonCompletingTeamIds: shillTeams.map((team) => team.teamId),
    };
    const nextContext = { leagueId, seasonNumber: MLB_AUCTION_SEASON };
    const initialized = {
      ...(initAuctionSession({
        teams,
        players,
        config,
        sessionId,
        sessionLaunchNonce,
      }) as CpuShillAuctionSession),
      cpuShills: {
        ...buildPureShillProfiles(leagueId, explicitShillCount),
        ...buildClubCpuProfiles(leagueId, nextLeagueTeams),
      },
    };

    setContext(nextContext);
    taxContextRef.current = buildAuctionLuxuryTaxContext({
      pool: sessionPool,
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
  const nominate = useCallback(
    (teamId: string, playerId: string, openingBid: number) =>
      runSessionTransition((current) => {
        const withTax = applyAuctionLuxuryTaxForCandidate(current, playerId, taxContextRef.current);
        return nominatePlayer(withTax, teamId, playerId, openingBid);
      }),
    [runSessionTransition],
  );
  const nominationCeiling = useCallback((teamId: string, playerId: string): number | null => {
    if (!session) return null;
    const withTax = applyAuctionLuxuryTaxForCandidate(session, playerId, taxContextRef.current);
    return nominationBidCeiling(withTax, teamId, playerId);
  }, [session]);
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
    currentNominatorTeamId,
    initAuction,
    loadAuction,
    bid,
    nominate,
    nominationCeiling,
    pass,
    claimAtReserve,
    resolve,
    advance,
    isCpuTeam: (teamId) => cpuTeamIdSet.has(teamId ?? ""),
  };
}
