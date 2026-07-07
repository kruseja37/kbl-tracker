import {
  LEGAL_ROSTER,
  canCover,
  isCloser,
  type RosterSlotPlayer,
} from '../../data/rosterConstruction';
import { rosterNeedBreakdown } from '../rosterNeed';
import {
  cheapestLegalCompletion,
  conservativePoolReserve,
  type CompletionCandidate,
} from '../auctionCompletionFloor';
import { playerCompletionPrice } from './reservePrice';
import {
  countCompletionCacheHit,
  countCompletionCacheMiss,
  countCompletionCandidates,
  countCompletionSearchCall,
} from './profiling';
import type {
  AuctionSimConfig,
  AuctionSimPlayer,
  AuctionSimRosterEntry,
  AuctionSimTeamState,
} from './types';

export interface AuctionSimCompletionQuote {
  feasible: boolean;
  cost: number;
  pickIds: readonly string[];
  mode: 'position-aware' | 'scalar';
  solver: 'exact' | 'approximate';
  missingRequirements: readonly string[];
}

const completionQuoteCache = new Map<string, AuctionSimCompletionQuote>();
const DEFAULT_COMPLETION_CANDIDATES_PER_BUCKET = 12;

export function clearAuctionSimCompletionCache(): void {
  completionQuoteCache.clear();
}

function completionCacheKey(
  roster: readonly AuctionSimPlayer[],
  remainingPlayers: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): string {
  const shapeForPlayer = (player: AuctionSimPlayer): string => {
    const pos = player.pos;
    if (!pos) return 'unknown';
    return pos.isPitcher
      ? `P:${pos.role ?? pos.position}:${pos.twoWayVariant ?? ''}`
      : `B:${pos.position}:${pos.secondaryPosition ?? ''}`;
  };
  const remainingSignature = remainingPlayers
    .map((player) => `${player.playerId}:${playerCompletionPrice(player, config)}:${shapeForPlayer(player)}`)
    .sort()
    .join(',');
  return [
    config.rosterSize,
    config.reserveFractionK,
    config.autoFillPriceMode,
    config.minimumCompletionPrice,
    config.bidIncrement,
    config.completionSearchMode ?? 'beam',
    config.reserveCostBasis ?? 'iv',
    roster.map(shapeForPlayer).sort().join(','),
    remainingSignature,
  ].join('|');
}

function rosterEntryToPlayer(entry: AuctionSimRosterEntry): AuctionSimPlayer {
  return {
    playerId: entry.playerId,
    iv: entry.iv,
    grade: entry.grade,
    pos: entry.pos,
  };
}

function scalarCompletionQuote(
  remainingPlayers: readonly AuctionSimPlayer[],
  openSlots: number,
  config: AuctionSimConfig,
): AuctionSimCompletionQuote {
  if (openSlots <= 0) {
    return { feasible: true, cost: 0, pickIds: [], mode: 'scalar', solver: 'exact', missingRequirements: [] };
  }
  if (remainingPlayers.length < openSlots) {
    return {
      feasible: false,
      cost: 0,
      pickIds: [],
      mode: 'scalar',
      solver: 'exact',
      missingRequirements: [`needs ${openSlots} bodies but only ${remainingPlayers.length} remain`],
    };
  }
  const picks = [...remainingPlayers]
    .sort(
      (left, right) =>
        playerCompletionPrice(left, config) - playerCompletionPrice(right, config) ||
        left.playerId.localeCompare(right.playerId),
    )
    .slice(0, openSlots);
  return {
    feasible: true,
    cost: picks.reduce((sum, player) => sum + playerCompletionPrice(player, config), 0),
    pickIds: picks.map((player) => player.playerId),
    mode: 'scalar',
    solver: 'exact',
    missingRequirements: [],
  };
}

function canUsePositionAwareCompletion(
  roster: readonly AuctionSimPlayer[],
  remainingPlayers: readonly AuctionSimPlayer[],
  rosterSize: number,
): boolean {
  return (
    rosterSize === LEGAL_ROSTER.size &&
    roster.every((player) => player.pos !== undefined) &&
    remainingPlayers.every((player) => player.pos !== undefined)
  );
}

function byCompletionPrice(
  config: AuctionSimConfig,
): (left: AuctionSimPlayer, right: AuctionSimPlayer) => number {
  return (left, right) =>
    playerCompletionPrice(left, config) - playerCompletionPrice(right, config) ||
    left.playerId.localeCompare(right.playerId);
}

function pruneCompletionCandidates(
  roster: readonly AuctionSimPlayer[],
  remainingPlayers: readonly AuctionSimPlayer[],
  openSlots: number,
  config: AuctionSimConfig,
): readonly AuctionSimPlayer[] {
  if (
    config.completionSearchMode === 'exact' ||
    openSlots <= 0 ||
    !canUsePositionAwareCompletion(roster, remainingPlayers, config.rosterSize)
  ) {
    return remainingPlayers;
  }

  const rosterShapes = roster.map((player) => player.pos) as RosterSlotPlayer[];
  const need = rosterNeedBreakdown(rosterShapes);
  if (need.infeasible) return remainingPlayers;

  const cap = Math.max(
    DEFAULT_COMPLETION_CANDIDATES_PER_BUCKET,
    Math.floor((config.maxCandidatesPerNeed ?? 4) * 3),
  );
  const sorted = [...remainingPlayers].sort(byCompletionPrice(config));
  const selected = new Map<string, AuctionSimPlayer>();
  const addWhere = (predicate: (player: AuctionSimPlayer & { pos: RosterSlotPlayer }) => boolean, limit = cap) => {
    let added = 0;
    for (const player of sorted) {
      if (!player.pos) continue;
      if (!predicate(player as AuctionSimPlayer & { pos: RosterSlotPlayer })) continue;
      selected.set(player.playerId, player);
      added += 1;
      if (added >= limit) break;
    }
  };

  for (const pos of need.missingPrimaries) {
    addWhere((player) => !player.pos.isPitcher && player.pos.position === pos);
  }
  if (need.catcherCoverNeed > 0) {
    addWhere((player) => canCover(player.pos, 'C'));
  }
  if (need.rotationDeficit > 0) {
    addWhere((player) => player.pos.isPitcher && player.pos.role === 'SP');
  }
  if (need.bullpenDeficit > 0) {
    addWhere((player) => player.pos.isPitcher && (player.pos.role === 'RP' || player.pos.role === 'CP'));
  }
  if (need.closerDeficit > 0) {
    addWhere((player) => player.pos.isPitcher && isCloser(player.pos));
  }
  if (need.pitcherNeed > 0) {
    addWhere((player) => player.pos.isPitcher && player.pos.role === 'SP/RP');
  }
  if (need.hitterFloorNeed > 0 || need.minimumAdditions < openSlots) {
    addWhere((player) => !player.pos.isPitcher);
  }
  if (need.pitcherFloorNeed > 0 || need.minimumAdditions < openSlots) {
    addWhere((player) => player.pos.isPitcher);
  }

  const safetyLimit = Math.max(openSlots * 2, cap);
  addWhere(() => true, safetyLimit);

  return selected.size === 0
    ? remainingPlayers
    : [...selected.values()].sort(byCompletionPrice(config));
}

function describeCompletionShortfalls(
  rosterShapes: readonly RosterSlotPlayer[],
  pool: readonly CompletionCandidate[],
  openSlots: number,
): string[] {
  const shortfalls: string[] = [];
  const need = rosterNeedBreakdown([...rosterShapes]);
  if (need.infeasible) shortfalls.push('current roster shape already breaches legal roster ceilings');
  if (need.minimumAdditions > openSlots) {
    shortfalls.push(`needs at least ${need.minimumAdditions} legal additions but only ${openSlots} slots are open`);
  }
  for (const pos of need.missingPrimaries) {
    if (!pool.some((candidate) => !candidate.shape.isPitcher && candidate.shape.position === pos)) {
      shortfalls.push(`missing primary ${pos}`);
    }
  }
  if (need.catcherCoverNeed > 0 && !pool.some((candidate) => canCover(candidate.shape, 'C'))) {
    shortfalls.push('missing catcher-depth coverer');
  }
  if (need.rotationDeficit > 0 && !pool.some((candidate) => candidate.shape.isPitcher && candidate.shape.role === 'SP')) {
    shortfalls.push('missing startable arm');
  }
  if (
    need.bullpenDeficit > 0 &&
    !pool.some((candidate) => candidate.shape.isPitcher && (candidate.shape.role === 'RP' || candidate.shape.role === 'CP'))
  ) {
    shortfalls.push('missing relief arm');
  }
  if (need.closerDeficit > 0 && !pool.some((candidate) => isCloser(candidate.shape))) {
    shortfalls.push('missing closer');
  }
  if (pool.length < openSlots) shortfalls.push(`needs ${openSlots} picks but only ${pool.length} candidates remain`);
  return [...new Set(shortfalls)];
}

export function cheapestAuctionSimCompletion(
  roster: readonly AuctionSimPlayer[],
  remainingPlayers: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): AuctionSimCompletionQuote {
  countCompletionSearchCall();
  const key = completionCacheKey(roster, remainingPlayers, config);
  const cached = completionQuoteCache.get(key);
  if (cached !== undefined) {
    countCompletionCacheHit();
    return cached;
  }
  countCompletionCacheMiss();

  const openSlots = config.rosterSize - roster.length;
  if (openSlots < 0) {
    const quote = {
      feasible: false,
      cost: 0,
      pickIds: [],
      mode: 'scalar' as const,
      solver: 'exact' as const,
      missingRequirements: ['roster exceeds configured roster size'],
    };
    completionQuoteCache.set(key, quote);
    return quote;
  }

  const completionPlayers = pruneCompletionCandidates(roster, remainingPlayers, openSlots, config);
  countCompletionCandidates(completionPlayers.length);

  if (!canUsePositionAwareCompletion(roster, completionPlayers, config.rosterSize)) {
    const quote = scalarCompletionQuote(completionPlayers, openSlots, config);
    completionQuoteCache.set(key, quote);
    return quote;
  }

  const rosterShapes = roster.map((player) => player.pos) as RosterSlotPlayer[];
  const pool: CompletionCandidate[] = completionPlayers.map((player) => ({
    id: player.playerId,
    price: playerCompletionPrice(player, config),
    shape: player.pos as RosterSlotPlayer,
  }));
  const quote = cheapestLegalCompletion(rosterShapes, pool, openSlots);
  if (quote.feasible) {
    const simQuote = {
      feasible: true,
      cost: quote.cost,
      pickIds: quote.pickIds,
      mode: 'position-aware' as const,
      solver: config.completionSearchMode === 'exact' ? 'exact' as const : 'approximate' as const,
      missingRequirements: [],
    };
    completionQuoteCache.set(key, simQuote);
    return simQuote;
  }

  // Keep the sim measurable even when a fixture is position-infeasible: reserve the cheapest
  // real prices left, matching the live auction's conservative fallback direction.
  const simQuote = {
    feasible: false,
    cost: conservativePoolReserve(pool, openSlots),
    pickIds: [],
    mode: 'position-aware' as const,
    solver: 'approximate' as const,
    missingRequirements: describeCompletionShortfalls(rosterShapes, pool, openSlots),
  };
  completionQuoteCache.set(key, simQuote);
  return simQuote;
}

export function maxLegalBidForPlayer(
  team: AuctionSimTeamState,
  player: AuctionSimPlayer,
  remainingAfterPlayer: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): { feasible: boolean; maxBid: number; completionCost: number } {
  if (team.roster.length >= config.rosterSize) {
    return { feasible: false, maxBid: 0, completionCost: 0 };
  }

  const rosterAfterWin = [...team.roster.map(rosterEntryToPlayer), player];
  const quote = cheapestAuctionSimCompletion(rosterAfterWin, remainingAfterPlayer, config);
  const completionSurplusAtZero = team.budgetRemaining - quote.cost;
  const maxBid = Math.max(0, completionSurplusAtZero);
  return { feasible: quote.feasible && completionSurplusAtZero >= 0, maxBid, completionCost: quote.cost };
}
