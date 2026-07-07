import {
  LEGAL_ROSTER,
  canCover,
  isLegalRoster,
  type FieldPosition,
  type RosterSlotPlayer,
} from '../../data/rosterConstruction';
import { computeOwnValueFactors, ownNeedMultiplier } from '../auctionMarketModel';
import { teamRosterNeed } from '../rosterNeed';
import { cheapestAuctionSimCompletion } from './legalCompletionCost';
import { playerCompletionPrice } from './reservePrice';
import { adaptEconomyPlayer, rosterEntryToAuctionSimPlayer } from './economyAdapter';
import {
  countBestProjectedRosterValueCacheHit,
  countBestProjectedRosterValueCacheMiss,
  countBestProjectedRosterValueCall,
} from './profiling';
import type {
  AuctionSimConfig,
  AuctionSimPlayer,
  AuctionSimRosterEntry,
  AuctionSimTeamState,
} from './types';

export type AuctionSimRosterValueStatus =
  | 'legalComplete'
  | 'incompleteCompletable'
  | 'invalid';

export interface AuctionSimPlayerValueRead {
  playerId: string;
  baseValue: number;
  archetypeAdjustedValue: number;
  rosterAdjustedValue: number;
  archetypeFitMultiplier: number;
  needMultiplier: number;
  warnings: readonly string[];
}

export interface AuctionSimProjectedRosterValue {
  status: AuctionSimRosterValueStatus;
  feasible: boolean;
  value: number;
  rosterValue: number;
  surplusValue: number;
  completionCost: number;
  completionSurplus: number;
  selectedPlayerIds: readonly string[];
  warnings: readonly string[];
}

const PROJECTED_ROSTER_VALUE_CACHE_LIMIT = 5_000;
const DEFAULT_MAX_CANDIDATES_PER_NEED = 4;
const DEFAULT_BEAM_WIDTH = 1;
const projectedRosterValueCache = new Map<string, AuctionSimProjectedRosterValue>();

export function clearAuctionSimRosterValueCache(): void {
  projectedRosterValueCache.clear();
}

function projectedRosterValueCacheKey(
  roster: readonly AuctionSimRosterEntry[],
  budgetRemaining: number,
  remainingPlayers: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
  team: AuctionSimTeamState,
): string {
  const budgetBucket = Math.floor(budgetRemaining / Math.max(1, config.bidIncrement));
  return [
    team.teamId,
    config.rosterSize,
    config.reserveFractionK,
    config.autoFillPriceMode,
    config.minimumCompletionPrice,
    config.bidIncrement,
    config.poolPolicyName ?? 'unknownPool',
    config.valueBasis ?? 'iv',
    config.completionSearchMode ?? 'beam',
    config.rosterProjectionMode ?? 'beam',
    config.maxCandidatesPerNeed ?? DEFAULT_MAX_CANDIDATES_PER_NEED,
    config.beamWidth ?? DEFAULT_BEAM_WIDTH,
    budgetBucket,
    roster.map((entry) => `${entry.playerId}:${entry.salary}`).join(','),
    remainingPlayers.map((player) => player.playerId).sort().join(','),
  ].join('|');
}

function cacheProjectedRosterValue(key: string, value: AuctionSimProjectedRosterValue): AuctionSimProjectedRosterValue {
  if (projectedRosterValueCache.size >= PROJECTED_ROSTER_VALUE_CACHE_LIMIT) {
    const firstKey = projectedRosterValueCache.keys().next().value;
    if (firstKey !== undefined) projectedRosterValueCache.delete(firstKey);
  }
  projectedRosterValueCache.set(key, value);
  return value;
}

function asRosterEntry(player: AuctionSimPlayer, salary: number): AuctionSimRosterEntry {
  return {
    playerId: player.playerId,
    iv: player.iv,
    numericGrade: player.numericGrade ?? null,
    letterGrade: player.grade,
    grade: player.grade,
    gradeBand: 'core',
    salary,
    source: 'autoFill',
    pos: player.pos,
  };
}

function allHaveShapes(players: readonly AuctionSimPlayer[]): players is Array<AuctionSimPlayer & { pos: RosterSlotPlayer }> {
  return players.every((player) => player.pos !== undefined);
}

function rosterNeedForEntries(entries: readonly AuctionSimRosterEntry[]) {
  const positions = entries.reduce<Record<string, RosterSlotPlayer>>((acc, entry) => {
    if (entry.pos !== undefined) acc[entry.playerId] = entry.pos;
    return acc;
  }, {});
  if (Object.keys(positions).length !== entries.length) return null;
  return teamRosterNeed(entries.map((entry) => entry.playerId), positions);
}

function sortByProjectedValue(
  players: readonly AuctionSimPlayer[],
  team: AuctionSimTeamState,
  builtRoster: readonly AuctionSimRosterEntry[],
  config: AuctionSimConfig,
): AuctionSimPlayer[] {
  return [...players].sort((left, right) => {
    const leftValue = playerValueForTeam(left, team, builtRoster, config).rosterAdjustedValue;
    const rightValue = playerValueForTeam(right, team, builtRoster, config).rosterAdjustedValue;
    return (
      rightValue - leftValue ||
      playerCompletionPrice(left, config) - playerCompletionPrice(right, config) ||
      left.playerId.localeCompare(right.playerId)
    );
  });
}

function isFieldPosition(position: string): position is FieldPosition {
  return (LEGAL_ROSTER.fieldPositions as readonly string[]).includes(position);
}

function sideHasRoom(shape: RosterSlotPlayer, roster: readonly AuctionSimRosterEntry[]): boolean {
  const rosterShapes = roster.map((entry) => entry.pos).filter((pos): pos is RosterSlotPlayer => pos !== undefined);
  const hitters = rosterShapes.filter((pos) => !pos.isPitcher).length;
  const pitchers = rosterShapes.filter((pos) => pos.isPitcher).length;
  return shape.isPitcher
    ? pitchers < LEGAL_ROSTER.maxPitchers
    : hitters < LEGAL_ROSTER.maxPositionPlayers;
}

function needBucketForCandidate(
  candidate: AuctionSimPlayer,
  builtRoster: readonly AuctionSimRosterEntry[],
  config: AuctionSimConfig,
): string | null {
  if (!candidate.pos) return 'unknown-shape';
  const need = rosterNeedForEntries(builtRoster);
  if (need === null) return 'unknown-need';
  if (!sideHasRoom(candidate.pos, builtRoster)) return null;

  const openSlots = config.rosterSize - builtRoster.length;
  if (!candidate.pos.isPitcher && isFieldPosition(candidate.pos.position) && need.missingPrimaries.includes(candidate.pos.position)) {
    return `primary:${candidate.pos.position}`;
  }
  if (need.catcherCoverNeed > 0 && canCover(candidate.pos, 'C')) {
    return 'cover:C';
  }
  if (candidate.pos.isPitcher && need.pitcherNeed > 0) {
    if (candidate.pos.role === 'SP' && need.rotationDeficit > 0) return 'arm:rotation';
    if (candidate.pos.role === 'CP' && need.closerDeficit > 0) return 'arm:closer';
    if ((candidate.pos.role === 'RP' || candidate.pos.role === 'CP') && need.bullpenDeficit > 0) return 'arm:bullpen';
    if (candidate.pos.role === 'SP/RP') return 'arm:swing';
  }
  if (!candidate.pos.isPitcher && need.hitterFloorNeed > 0) return 'floor:bat';
  if (candidate.pos.isPitcher && need.pitcherFloorNeed > 0) return 'floor:arm';

  if (need.minimumAdditions < openSlots) {
    return candidate.pos.isPitcher ? 'filler:arm' : 'filler:bat';
  }
  return null;
}

function candidateOptionsForProjection(
  players: readonly AuctionSimPlayer[],
  team: AuctionSimTeamState,
  builtRoster: readonly AuctionSimRosterEntry[],
  config: AuctionSimConfig,
): AuctionSimPlayer[] {
  const sorted = sortByProjectedValue(players, team, builtRoster, config);
  if (config.completionSearchMode === 'exact') return sorted;

  const cap = Math.max(1, Math.floor(config.maxCandidatesPerNeed ?? DEFAULT_MAX_CANDIDATES_PER_NEED));
  const counts = new Map<string, number>();
  const selected: AuctionSimPlayer[] = [];
  for (const candidate of sorted) {
    const bucket = needBucketForCandidate(candidate, builtRoster, config);
    if (bucket === null) continue;
    const count = counts.get(bucket) ?? 0;
    if (count >= cap) continue;
    counts.set(bucket, count + 1);
    selected.push(candidate);
  }
  return selected.length > 0 ? selected : sorted.slice(0, cap);
}

interface ProjectionSearchState {
  selected: Map<string, AuctionSimPlayer>;
  spent: number;
  builtRoster: AuctionSimRosterEntry[];
}

function projectionStateSortKey(
  state: ProjectionSearchState,
  lockedPlayers: readonly AuctionSimPlayer[],
  team: AuctionSimTeamState,
  budgetRemaining: number,
  config: AuctionSimConfig,
): { value: number; id: string } {
  const players = [...lockedPlayers, ...state.selected.values()];
  const value = rosterValueForBuildOrder(players, team, config) + Math.max(0, budgetRemaining - state.spent);
  return {
    value,
    id: [...state.selected.keys()].sort().join(','),
  };
}

function cloneWithPick(
  state: ProjectionSearchState,
  player: AuctionSimPlayer,
  price: number,
): ProjectionSearchState {
  const selected = new Map(state.selected);
  selected.set(player.playerId, player);
  return {
    selected,
    spent: state.spent + price,
    builtRoster: [...state.builtRoster, asRosterEntry(player, price)],
  };
}

export function evaluateRosterValueStatus(
  roster: readonly AuctionSimRosterEntry[],
  remainingPlayers: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): Pick<AuctionSimProjectedRosterValue, 'status' | 'feasible' | 'completionCost' | 'warnings'> {
  const warnings: string[] = [];
  if (roster.length > config.rosterSize) {
    return {
      status: 'invalid',
      feasible: false,
      completionCost: 0,
      warnings: ['SIM_INVALID roster exceeds configured rosterSize'],
    };
  }

  const rosterPlayers = roster.map(rosterEntryToAuctionSimPlayer);
  const hasCompleteShape =
    config.rosterSize === 22 &&
    allHaveShapes(rosterPlayers) &&
    allHaveShapes(remainingPlayers);

  if (!hasCompleteShape) {
    warnings.push('SIM_FALLBACK scalar roster completion because full position/role shapes are unavailable');
  }

  if (roster.length === config.rosterSize) {
    if (hasCompleteShape && !isLegalRoster(rosterPlayers.map((player) => player.pos))) {
      return {
        status: 'invalid',
        feasible: false,
        completionCost: 0,
        warnings: [...warnings, 'SIM_INVALID complete roster fails canonical roster law'],
      };
    }
    return {
      status: 'legalComplete',
      feasible: true,
      completionCost: 0,
      warnings,
    };
  }

  const quote = cheapestAuctionSimCompletion(rosterPlayers, remainingPlayers, config);
  if (!quote.feasible) {
    return {
      status: 'invalid',
      feasible: false,
      completionCost: quote.cost,
      warnings: [...warnings, 'SIM_INFEASIBLE no verified legal completion exists from remaining pool'],
    };
  }

  return {
    status: 'incompleteCompletable',
    feasible: true,
    completionCost: quote.cost,
    warnings,
  };
}

export function playerValueForTeam(
  player: AuctionSimPlayer,
  team: AuctionSimTeamState,
  currentRoster: readonly AuctionSimRosterEntry[],
  config: AuctionSimConfig,
): AuctionSimPlayerValueRead {
  const openSlots = Math.max(1, config.rosterSize - currentRoster.length);
  const needBreakdown = rosterNeedForEntries(currentRoster);
  const baseValue = player.baseValue ?? player.iv;
  const warnings: string[] = [];
  let archetypeFitMultiplier = 1;

  if (team.bandPriorities !== undefined && player.archetypeWeights !== undefined) {
    archetypeFitMultiplier = computeOwnValueFactors({
      archetypeWeights: player.archetypeWeights,
      ownBandPriorities: team.bandPriorities,
      needBreakdown: null,
      shape: null,
      openSlots,
    }).archetypeFitMultiplier;
  } else if (team.bandPriorities !== undefined || player.archetypeWeights !== undefined) {
    warnings.push('SIM_FALLBACK archetypeAdjustedValue is neutral because team priorities or player weights are missing');
  }

  const needMultiplier = ownNeedMultiplier(needBreakdown, player.pos ?? null, openSlots);
  const archetypeAdjustedValue = baseValue * archetypeFitMultiplier;
  const rosterAdjustedValue = archetypeAdjustedValue * needMultiplier;
  const economy = adaptEconomyPlayer(player, config, { archetypeAdjustedValue });

  return {
    playerId: player.playerId,
    baseValue: economy.baseValue,
    archetypeAdjustedValue,
    rosterAdjustedValue,
    archetypeFitMultiplier,
    needMultiplier,
    warnings: [...economy.warnings, ...warnings],
  };
}

export function rosterValueForBuildOrder(
  players: readonly AuctionSimPlayer[],
  team: AuctionSimTeamState,
  config: AuctionSimConfig,
): number {
  const built: AuctionSimRosterEntry[] = [];
  let value = 0;
  for (const player of players) {
    value += playerValueForTeam(player, team, built, config).rosterAdjustedValue;
    built.push(asRosterEntry(player, player.salary ?? playerCompletionPrice(player, config)));
  }
  return value;
}

export function bestProjectedRosterValue(
  roster: readonly AuctionSimRosterEntry[],
  budgetRemaining: number,
  remainingPlayers: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
  team: AuctionSimTeamState,
): AuctionSimProjectedRosterValue {
  countBestProjectedRosterValueCall();
  const key = projectedRosterValueCacheKey(roster, budgetRemaining, remainingPlayers, config, team);
  const cached = projectedRosterValueCache.get(key);
  if (cached !== undefined) {
    countBestProjectedRosterValueCacheHit();
    return cached;
  }
  countBestProjectedRosterValueCacheMiss();

  const warnings: string[] = [];
  const status = evaluateRosterValueStatus(roster, remainingPlayers, config);
  warnings.push(...status.warnings);

  if (!status.feasible || status.completionCost > budgetRemaining) {
    if (status.feasible && status.completionCost > budgetRemaining) {
      warnings.push('SIM_INFEASIBLE cheapest legal completion exceeds auctionCash');
    }
    return cacheProjectedRosterValue(key, {
      status: status.status,
      feasible: false,
      value: Number.NEGATIVE_INFINITY,
      rosterValue: 0,
      surplusValue: 0,
      completionCost: status.completionCost,
      completionSurplus: budgetRemaining - status.completionCost,
      selectedPlayerIds: [],
      warnings,
    });
  }

  const lockedPlayers = roster.map(rosterEntryToAuctionSimPlayer);
  if (config.rosterProjectionMode === 'completionQuote' && config.completionSearchMode !== 'exact') {
    const quote = cheapestAuctionSimCompletion(lockedPlayers, remainingPlayers, config);
    if (!quote.feasible || quote.cost > budgetRemaining) {
      return cacheProjectedRosterValue(key, {
        status: quote.feasible ? status.status : 'invalid',
        feasible: false,
        value: Number.NEGATIVE_INFINITY,
        rosterValue: 0,
        surplusValue: 0,
        completionCost: quote.cost,
        completionSurplus: budgetRemaining - quote.cost,
        selectedPlayerIds: [],
        warnings: [
          ...warnings,
          'SIM_APPROXIMATION completion-quote projection found no affordable legal path',
          ...quote.missingRequirements.map((shortfall) => `SIM_SHORTFALL ${shortfall}`),
        ],
      });
    }

    const remainingByIdForQuote = new Map(remainingPlayers.map((player) => [player.playerId, player]));
    const selectedPlayers = quote.pickIds
      .map((playerId) => remainingByIdForQuote.get(playerId))
      .filter((player): player is AuctionSimPlayer => player !== undefined);
    const builtRoster = [
      ...roster,
      ...selectedPlayers.map((player) => asRosterEntry(player, playerCompletionPrice(player, config))),
    ];
    const finalStatus = evaluateRosterValueStatus(builtRoster, [], config);
    if (selectedPlayers.length !== quote.pickIds.length || builtRoster.length !== config.rosterSize || !finalStatus.feasible) {
      return cacheProjectedRosterValue(key, {
        status: 'invalid',
        feasible: false,
        value: Number.NEGATIVE_INFINITY,
        rosterValue: 0,
        surplusValue: 0,
        completionCost: quote.cost,
        completionSurplus: budgetRemaining - quote.cost,
        selectedPlayerIds: selectedPlayers.map((player) => player.playerId),
        warnings: [
          ...warnings,
          ...finalStatus.warnings,
          'SIM_INFEASIBLE completion-quote projection did not produce a legal full roster',
        ],
      });
    }

    const finalPlayers = builtRoster.map(rosterEntryToAuctionSimPlayer);
    const rosterValue = rosterValueForBuildOrder(finalPlayers, team, config);
    const surplusValue = Math.max(0, budgetRemaining - quote.cost);
    return cacheProjectedRosterValue(key, {
      status: 'legalComplete',
      feasible: true,
      value: rosterValue + surplusValue,
      rosterValue,
      surplusValue,
      completionCost: quote.cost,
      completionSurplus: budgetRemaining - quote.cost,
      selectedPlayerIds: selectedPlayers.map((player) => player.playerId),
      warnings: [
        ...warnings,
        'SIM_APPROXIMATION completion-quote roster projection used for matrix performance',
        ...(quote.solver === 'approximate'
          ? ['SIM_APPROXIMATION completion solver used deterministic beam/greedy approximation']
          : []),
      ],
    });
  }

  const remainingById = new Map(remainingPlayers.map((player) => [player.playerId, player]));
  const beamWidth = config.completionSearchMode === 'exact'
    ? Number.POSITIVE_INFINITY
    : Math.max(1, Math.floor(config.beamWidth ?? DEFAULT_BEAM_WIDTH));
  let states: ProjectionSearchState[] = [{
    selected: new Map<string, AuctionSimPlayer>(),
    spent: 0,
    builtRoster: [...roster],
  }];

  while (states.some((state) => state.builtRoster.length < config.rosterSize)) {
    const nextStates: ProjectionSearchState[] = [];

    for (const state of states) {
      if (state.builtRoster.length >= config.rosterSize) {
        nextStates.push(state);
        continue;
      }

      const available = [...remainingById.values()].filter((player) => !state.selected.has(player.playerId));
      const builtPlayers = [...lockedPlayers, ...state.selected.values()];
      const quote = cheapestAuctionSimCompletion(builtPlayers, available, config);
      if (!quote.feasible || state.spent + quote.cost > budgetRemaining) {
        continue;
      }

      let expanded = false;
      const options = candidateOptionsForProjection(available, team, state.builtRoster, config);
      for (const candidate of options) {
        const price = playerCompletionPrice(candidate, config);
        if (state.spent + price > budgetRemaining) continue;
        const nextPlayers = [...builtPlayers, candidate];
        const nextAvailable = available.filter((player) => player.playerId !== candidate.playerId);
        const nextQuote = cheapestAuctionSimCompletion(nextPlayers, nextAvailable, config);
        if (!nextQuote.feasible || state.spent + price + nextQuote.cost > budgetRemaining) continue;
        nextStates.push(cloneWithPick(state, candidate, price));
        expanded = true;
      }

      if (!expanded) {
        let filled = state;
        for (const pickId of quote.pickIds) {
          const pick = remainingById.get(pickId);
          if (!pick || filled.selected.has(pickId)) continue;
          filled = cloneWithPick(filled, pick, playerCompletionPrice(pick, config));
        }
        nextStates.push(filled);
      }
    }

    if (nextStates.length === 0) {
      warnings.push('SIM_INFEASIBLE projected roster cannot finish without silent repair');
      const firstState = states[0];
      return cacheProjectedRosterValue(key, {
        status: 'invalid',
        feasible: false,
        value: Number.NEGATIVE_INFINITY,
        rosterValue: 0,
        surplusValue: 0,
        completionCost: 0,
        completionSurplus: budgetRemaining - (firstState?.spent ?? 0),
        selectedPlayerIds: firstState ? [...firstState.selected.keys()] : [],
        warnings,
      });
    }

    states = nextStates
      .sort((left, right) => {
        const leftKey = projectionStateSortKey(left, lockedPlayers, team, budgetRemaining, config);
        const rightKey = projectionStateSortKey(right, lockedPlayers, team, budgetRemaining, config);
        return rightKey.value - leftKey.value || left.spent - right.spent || leftKey.id.localeCompare(rightKey.id);
      })
      .slice(0, Number.isFinite(beamWidth) ? beamWidth : nextStates.length);
  }

  const completedStates = states.filter((state) => state.builtRoster.length === config.rosterSize);
  const bestState = completedStates
    .sort((left, right) => {
      const leftKey = projectionStateSortKey(left, lockedPlayers, team, budgetRemaining, config);
      const rightKey = projectionStateSortKey(right, lockedPlayers, team, budgetRemaining, config);
      return rightKey.value - leftKey.value || left.spent - right.spent || leftKey.id.localeCompare(rightKey.id);
    })[0];
  const selected = bestState?.selected ?? new Map<string, AuctionSimPlayer>();
  const spent = bestState?.spent ?? 0;
  const builtRoster = bestState?.builtRoster ?? [...roster];

  if (builtRoster.length !== config.rosterSize) {
    warnings.push('SIM_INFEASIBLE projected roster did not reach configured rosterSize');
    return cacheProjectedRosterValue(key, {
      status: 'invalid',
      feasible: false,
      value: Number.NEGATIVE_INFINITY,
      rosterValue: 0,
      surplusValue: 0,
      completionCost: 0,
      completionSurplus: budgetRemaining - spent,
      selectedPlayerIds: [...selected.keys()],
      warnings,
    });
  }

  const finalPlayers = builtRoster.map(rosterEntryToAuctionSimPlayer);
  const finalStatus = evaluateRosterValueStatus(builtRoster, [], config);
  if (!finalStatus.feasible) {
    return cacheProjectedRosterValue(key, {
      status: 'invalid',
      feasible: false,
      value: Number.NEGATIVE_INFINITY,
      rosterValue: 0,
      surplusValue: 0,
      completionCost: 0,
      completionSurplus: budgetRemaining - spent,
      selectedPlayerIds: [...selected.keys()],
      warnings: [...warnings, ...finalStatus.warnings],
    });
  }

  const rosterValue = rosterValueForBuildOrder(finalPlayers, team, config);
  const surplusValue = Math.max(0, budgetRemaining - spent);

  return cacheProjectedRosterValue(key, {
    status: 'legalComplete',
    feasible: true,
    value: rosterValue + surplusValue,
    rosterValue,
    surplusValue,
    completionCost: spent,
    completionSurplus: budgetRemaining - spent,
    selectedPlayerIds: [...selected.keys()],
    warnings,
  });
}
