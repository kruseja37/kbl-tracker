import {
  luxuryTax,
  shiftLuxuryCaps,
  type ConstructionPlayer,
  type ConstructionRoster,
  type TeamCapIdentity,
} from './leagueConstruction';
import { LUXURY_CAP_TABLES, type LuxuryCapRow, type TierKey } from '../data/tierParams';

/**
 * Auction projectedTax is the would-be total team tax after winning the candidate.
 * That matches the auction's single projectedTax field better than the snake draft's
 * committed/marginal split because auction budgetRemaining is salary-only today.
 */
export function auctionShiftedCaps(
  capIdentity: TeamCapIdentity | undefined,
  tier: TierKey,
): LuxuryCapRow[] {
  return capIdentity
    ? shiftLuxuryCaps(LUXURY_CAP_TABLES[tier], {
        increase: capIdentity.increase,
        decrease: capIdentity.decrease,
      })
    : LUXURY_CAP_TABLES[tier];
}

export function computeAuctionTeamProjectedTax(
  committedRoster: ConstructionRoster,
  candidate: ConstructionPlayer | null,
  capIdentity: TeamCapIdentity | undefined,
  tier: TierKey,
): number {
  const caps = auctionShiftedCaps(capIdentity, tier);
  const roster = candidate ? [...committedRoster, candidate] : committedRoster;
  return luxuryTax(roster, caps, 'taxed').charged;
}

export function auctionMarginalTax(
  committedRoster: ConstructionRoster,
  candidate: ConstructionPlayer,
  capIdentity: TeamCapIdentity | undefined,
  tier: TierKey,
): number {
  return computeAuctionTeamProjectedTax(committedRoster, candidate, capIdentity, tier)
    - computeAuctionTeamProjectedTax(committedRoster, null, capIdentity, tier);
}
