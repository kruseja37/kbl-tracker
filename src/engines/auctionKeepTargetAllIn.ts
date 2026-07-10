/**
 * STAKES (CONTRACT_STAKES_2026-07-09.md Tier 2): the bounded all-in cost of winning the
 * current lot at a contemplated bid and still landing one named board target later.
 *
 * This module is deliberately session-free. The live page supplies the already-modeled market
 * median for the target plus concrete roster/pool players; every tax number is then recomputed
 * from the canonical luxury-tax engine over the concrete roster state that actually exists at
 * that step. No hypothetical full-roster tax bill enters the quote.
 */

import { LEGAL_ROSTER, type RosterSlotPlayer } from '../data/rosterConstruction';
import type { LuxuryCapRow } from '../data/tierParams';
import { cheapestLegalCompletion } from './auctionCompletionFloor';
import { auctionMarginalTaxWithCaps } from './auctionLuxuryTax';
import {
  luxuryTax,
  shiftLuxuryCaps,
  type ConstructionPlayer,
  type TeamCapIdentity,
} from './leagueConstruction';

export interface KeepTargetPlayer {
  id: string;
  construction: ConstructionPlayer;
  shape: RosterSlotPlayer;
}

export interface KeepTargetMarketPlayer extends KeepTargetPlayer {
  /** The target's predicted median from the existing estimateMarket/projectBidVsPass path. */
  predictedMedian: number;
}

export interface KeepTargetPoolPlayer extends KeepTargetPlayer {
  /** Concrete floor price used by cheapestLegalCompletion (the live lot opening ask). */
  price: number;
}

export interface KeepTargetTeam {
  budgetRemaining: number;
  roster: readonly KeepTargetPlayer[];
  capIdentity?: TeamCapIdentity;
}

export type KeepTargetVerdict = 'still-lands' | 'gone' | 'cant-finish-roster';

export interface KeepTargetAllInResult {
  verdict: KeepTargetVerdict;
  /** Null for cant-finish-roster: infeasibility is a state, never a fabricated dollar quote. */
  allIn: number | null;
  /** Null for cant-finish-roster; otherwise max(0, allIn - budgetRemaining). */
  shortfall: number | null;
  priceY: number;
  completionCost: number | null;
  taxLot: number;
  taxY: number;
  taxFill: number | null;
  taxTotal: number | null;
  completionPickIds: readonly string[];
}

function shiftedCaps(caps: readonly LuxuryCapRow[], capIdentity: TeamCapIdentity | undefined): LuxuryCapRow[] {
  const copy = [...caps];
  return capIdentity ? shiftLuxuryCaps(copy, capIdentity) : copy;
}

/**
 * The all-in cost of the concrete plan "win this lot at bidAmount and still land targetY later."
 */
export function keepTargetAllIn(
  team: KeepTargetTeam,
  lotPlayer: KeepTargetPlayer,
  bidAmount: number,
  targetY: KeepTargetMarketPlayer,
  remainingPool: readonly KeepTargetPoolPlayer[],
  caps: readonly LuxuryCapRow[],
): KeepTargetAllInResult {
  const rosterConstruction = team.roster.map((player) => player.construction);
  const rosterShapes = team.roster.map((player) => player.shape);
  const taxLot = auctionMarginalTaxWithCaps(
    rosterConstruction,
    lotPlayer.construction,
    team.capIdentity,
    [...caps],
  );

  const rosterAfterLotConstruction = [...rosterConstruction, lotPlayer.construction];
  const rosterAfterLotShapes = [...rosterShapes, lotPlayer.shape];
  const taxY = auctionMarginalTaxWithCaps(
    rosterAfterLotConstruction,
    targetY.construction,
    team.capIdentity,
    [...caps],
  );

  const rosterAfterYConstruction = [...rosterAfterLotConstruction, targetY.construction];
  const rosterAfterYShapes = [...rosterAfterLotShapes, targetY.shape];
  const completionPool = remainingPool
    .filter((player) => player.id !== targetY.id)
    .map((player) => ({ id: player.id, price: player.price, shape: player.shape }));
  const openSlots = Math.max(0, LEGAL_ROSTER.size - rosterAfterYShapes.length);
  const completion = cheapestLegalCompletion(rosterAfterYShapes, completionPool, openSlots);

  if (!completion.feasible) {
    return {
      verdict: 'cant-finish-roster',
      allIn: null,
      shortfall: null,
      priceY: targetY.predictedMedian,
      completionCost: null,
      taxLot,
      taxY,
      taxFill: null,
      taxTotal: null,
      completionPickIds: [],
    };
  }

  const completionById = new Map(remainingPool.map((player) => [player.id, player]));
  const completionConstruction: ConstructionPlayer[] = [];
  for (const id of completion.pickIds) {
    const player = completionById.get(id);
    if (!player) {
      return {
        verdict: 'cant-finish-roster',
        allIn: null,
        shortfall: null,
        priceY: targetY.predictedMedian,
        completionCost: null,
        taxLot,
        taxY,
        taxFill: null,
        taxTotal: null,
        completionPickIds: [],
      };
    }
    completionConstruction.push(player.construction);
  }

  const concreteCaps = shiftedCaps(caps, team.capIdentity);
  const taxBeforeFill = luxuryTax(rosterAfterYConstruction, concreteCaps, 'taxed').charged;
  const taxAfterFill = luxuryTax(
    [...rosterAfterYConstruction, ...completionConstruction],
    concreteCaps,
    'taxed',
  ).charged;
  const taxFill = Math.max(0, taxAfterFill - taxBeforeFill);
  const taxTotal = taxLot + taxY + taxFill;
  const allIn = bidAmount + taxLot + targetY.predictedMedian + taxY + completion.cost + taxFill;
  const shortfall = Math.max(0, allIn - team.budgetRemaining);

  return {
    verdict: shortfall === 0 ? 'still-lands' : 'gone',
    allIn,
    shortfall,
    priceY: targetY.predictedMedian,
    completionCost: completion.cost,
    taxLot,
    taxY,
    taxFill,
    taxTotal,
    completionPickIds: completion.pickIds,
  };
}
