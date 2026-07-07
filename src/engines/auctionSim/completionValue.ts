import { cheapestAuctionSimCompletion } from './legalCompletionCost';
import { bestProjectedRosterValue } from './rosterValue';
import { rosterEntryToAuctionSimPlayer } from './economyAdapter';
import type {
  AuctionSimConfig,
  AuctionSimPlayer,
  AuctionSimRosterEntry,
  AuctionSimTeamState,
} from './types';

export interface AuctionSimCompletionValue {
  feasible: boolean;
  completionCost: number;
  completionSurplus: number;
  pickIds: readonly string[];
  warnings: readonly string[];
}

export interface AuctionSimBestCompletionValue extends AuctionSimCompletionValue {
  projectedRosterValue: number;
  rosterValue: number;
  surplusValue: number;
  selectedPlayerIds: readonly string[];
}

export function cheapestLegalCompletionCost(
  roster: readonly AuctionSimRosterEntry[],
  remainingPlayers: readonly AuctionSimPlayer[],
  budgetRemaining: number,
  config: AuctionSimConfig,
): AuctionSimCompletionValue {
  const quote = cheapestAuctionSimCompletion(
    roster.map(rosterEntryToAuctionSimPlayer),
    remainingPlayers,
    config,
  );
  const completionSurplus = budgetRemaining - quote.cost;
  const warnings: string[] = [];
  if (!quote.feasible) {
    warnings.push('SIM_INFEASIBLE no verified legal completion exists; no silent repair applied');
  }
  if (quote.feasible && completionSurplus < 0) {
    warnings.push('SIM_INFEASIBLE verified legal completion exists but exceeds auctionCash');
  }
  if (quote.mode === 'scalar') {
    warnings.push('SIM_FALLBACK scalar completion used because position/role data is incomplete');
  }
  if (quote.solver === 'approximate') {
    warnings.push('SIM_APPROXIMATION completion solver used deterministic beam/greedy approximation');
  }
  for (const shortfall of quote.missingRequirements) {
    warnings.push(`SIM_SHORTFALL ${shortfall}`);
  }
  return {
    feasible: quote.feasible && completionSurplus >= 0,
    completionCost: quote.cost,
    completionSurplus,
    pickIds: quote.feasible ? quote.pickIds : [],
    warnings,
  };
}

export function bestProjectedCompletionValue(
  roster: readonly AuctionSimRosterEntry[],
  budgetRemaining: number,
  remainingPlayers: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
  team: AuctionSimTeamState,
): AuctionSimBestCompletionValue {
  const projected = bestProjectedRosterValue(roster, budgetRemaining, remainingPlayers, config, team);
  return {
    feasible: projected.feasible,
    completionCost: projected.completionCost,
    completionSurplus: projected.completionSurplus,
    pickIds: projected.selectedPlayerIds,
    projectedRosterValue: projected.value,
    rosterValue: projected.rosterValue,
    surplusValue: projected.surplusValue,
    selectedPlayerIds: projected.selectedPlayerIds,
    warnings: projected.warnings,
  };
}

export function completionCost(value: Pick<AuctionSimCompletionValue, 'completionCost'>): number {
  return value.completionCost;
}

export function completionSurplus(value: Pick<AuctionSimCompletionValue, 'completionSurplus'>): number {
  return value.completionSurplus;
}
