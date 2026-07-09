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
  return auctionShiftedCapsWithBaseCaps(capIdentity, LUXURY_CAP_TABLES[tier]);
}

/**
 * TAXPRECISION (2026-07-09, spec-docs/contracts/CONTRACT_TAXPRECISION_2026-07-09.md): delegate
 * straight to the canonical shiftLuxuryCaps with the FULL capIdentity (not a rebuilt
 * `{ increase, decrease }` literal) so archetype-selected teams' exact `rawShift` percentages win
 * here exactly as they already do for the snake draft (LeagueBuilderSnakeDraft.tsx) and
 * identityCapShift's own rawShift short-circuit (leagueConstruction.ts). Reconstructing the
 * identity object here used to silently drop `rawShift`, forcing every archetype-selected team's
 * auction-side caps through the coarser CAP_MODIFICATION_FRACTIONS per-name table instead of its
 * ratified exact shift -- real dollars since TAXTEETH. capIdentity's extra `bandPriorities` field
 * is inert for shiftLuxuryCaps (IdentityComposition doesn't read it); identities without a
 * rawShift are unaffected -- byte-identical to the pre-fix coarse-table output.
 */
function auctionShiftedCapsWithBaseCaps(
  capIdentity: TeamCapIdentity | undefined,
  baseCaps: LuxuryCapRow[],
): LuxuryCapRow[] {
  return capIdentity ? shiftLuxuryCaps(baseCaps, capIdentity) : baseCaps;
}

export function computeAuctionTeamProjectedTaxWithCaps(
  committedRoster: ConstructionRoster,
  candidate: ConstructionPlayer | null,
  capIdentity: TeamCapIdentity | undefined,
  baseCaps: LuxuryCapRow[],
): number {
  const caps = auctionShiftedCapsWithBaseCaps(capIdentity, baseCaps);
  const roster = candidate ? [...committedRoster, candidate] : committedRoster;
  return luxuryTax(roster, caps, 'taxed').charged;
}

export function computeAuctionTeamProjectedTax(
  committedRoster: ConstructionRoster,
  candidate: ConstructionPlayer | null,
  capIdentity: TeamCapIdentity | undefined,
  tier: TierKey,
): number {
  return computeAuctionTeamProjectedTaxWithCaps(
    committedRoster,
    candidate,
    capIdentity,
    LUXURY_CAP_TABLES[tier],
  );
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

/**
 * The `baseCaps`-taking sibling of `auctionMarginalTax` (TAXTEETH, 2026-07-08), for callers that
 * already hold a pool's own resolved `luxuryCaps` rather than a bare tier key -- e.g. the
 * per-lot session recompute (useAuctionDraft.ts applyAuctionLuxuryTaxForLot), which now feeds the
 * engine's real settlement/bid-ceiling math and must not silently diverge from a league's actual
 * caps the way a tier-keyed re-lookup could if pool-specific cap customization is ever added.
 */
export function auctionMarginalTaxWithCaps(
  committedRoster: ConstructionRoster,
  candidate: ConstructionPlayer,
  capIdentity: TeamCapIdentity | undefined,
  baseCaps: LuxuryCapRow[],
): number {
  return computeAuctionTeamProjectedTaxWithCaps(committedRoster, candidate, capIdentity, baseCaps)
    - computeAuctionTeamProjectedTaxWithCaps(committedRoster, null, capIdentity, baseCaps);
}
