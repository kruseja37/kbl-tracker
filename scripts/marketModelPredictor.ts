/**
 * FABLE-C2B: the REAL Second-Price band predictor plugged into the FABLE-C2A tuning harness.
 *
 * Honesty rules (what the predictor may know, mirroring the live information surface):
 * - REAL teams' band priorities + personality ARE consumed — the live analog (a team's league-setup
 *   archetype / capIdentity) is public league data. Their seeded noise/interest rolls are NOT read.
 * - SHILL entries are MASKED: the predictor never touches their profiles; shill demand is priced as
 *   the uniform distribution over the locked 24 archetypes (JK ruling 2026-07-01).
 * - No pool/position data exists in the harness context, so needMultiplier stays 1 and solvency is
 *   the scalar reserve — the same degraded tier the live model uses on unenriched sessions.
 */

import { auctionMaxBid } from '../src/data/rosterEngineConstants';
import {
  buildArchetypeLiftTable,
  estimateMarketWithInternals,
  type ArchetypeLiftTable,
  type MarketBidderView,
} from '../src/engines/auctionMarketModel';
import type { AuctionPriceBandPredictor } from './auctionTuningHarness';
import { BANDS, type Band } from '../src/engines/leagueConstruction';

let liftTable: ArchetypeLiftTable | null = null;

function table(): ArchetypeLiftTable {
  if (liftTable === null) liftTable = buildArchetypeLiftTable();
  return liftTable;
}

function normalizeBandWeights(
  weights: Partial<Record<Band, number>> | undefined,
): Record<Band, number> | null {
  if (weights === undefined) return null;
  const normalized = Object.fromEntries(
    BANDS.map((band) => [band, Math.min(1, Math.max(0, weights[band] ?? 0))]),
  ) as Record<Band, number>;
  return BANDS.some((band) => normalized[band] > 0) ? normalized : null;
}

export const marketModelBandPredictor: AuctionPriceBandPredictor = (context) => {
  const shillSet = new Set(context.shillTeamIds);
  const bidders: MarketBidderView[] = context.teamStates
    .filter((team) => context.lot.stillIn.includes(team.teamId))
    .map((team) => {
      const isShill = shillSet.has(team.teamId);
      const profile = isShill ? null : context.teamProfiles[team.teamId] ?? null;
      return {
        teamId: team.teamId,
        kind: isShill ? ('shill' as const) : ('cpu' as const),
        slotsRemaining: team.rosterSlotsRemaining,
        maxBid: auctionMaxBid(team.budgetRemaining, team.rosterSlotsRemaining, team.minSalary, 0),
        bandPriorities: profile?.bandPriorities ?? null,
        personality: profile?.personality ?? null,
        needMultiplier: 1,
        wouldStrand: false,
      };
    });

  // The harness-only channel (C2B-FIX F4): the calibration layer MAY read the modeled second
  // price via `.internals`; the GM-facing `estimateMarket` no longer carries it. The gate itself
  // scores bands only, so the returned shape below is unchanged.
  const estimate = estimateMarketWithInternals(
    {
      playerId: context.player.playerId,
      iv: context.player.iv,
      bandWeights: normalizeBandWeights(context.player.archetypeWeights),
      openingAsk: context.lot.openingAsk,
      bidIncrement: context.bidIncrement,
      bidders,
      advisedTeamId: null,
      openSlotsTotal: context.teamStates.reduce(
        (sum, team) => sum + Math.max(0, team.rosterSlotsRemaining),
        0,
      ),
      availablePlayerCount: context.availablePlayerCount,
    },
    table(),
  );

  return {
    low: estimate.market.band.low,
    median: estimate.market.band.median,
    high: estimate.market.band.high,
    predictorId: 'second-price-v1',
  };
};
