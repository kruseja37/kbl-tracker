import { maxLegalBidForPlayer } from './legalCompletionCost';
import { buildMarginalValueBidSheet } from './marginalValueBidder';
import { reservePrice } from './reservePrice';
import { rawWillingnessToPay } from './valuation';
import type {
  AuctionSimBidRead,
  AuctionSimConfig,
  AuctionSimPlayer,
  AuctionSimTeamState,
} from './types';

export function buildBidSheet(
  player: AuctionSimPlayer,
  teams: readonly AuctionSimTeamState[],
  remainingAfterPlayer: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): AuctionSimBidRead[] {
  if (config.biddingPolicy === 'marginalValueV1' || config.biddingPolicy === 'marginalValueV2Liquidity') {
    return buildMarginalValueBidSheet(player, teams, remainingAfterPlayer, config);
  }

  const reserve = reservePrice(player, config.reserveFractionK, config.bidIncrement);
  return teams.map((team) => {
    const legal = maxLegalBidForPlayer(team, player, remainingAfterPlayer, config);
    const raw = rawWillingnessToPay(team, player, remainingAfterPlayer, teams, reserve, config);
    const wtp = Math.min(raw, legal.maxBid);
    return {
      teamId: team.teamId,
      rawWillingness: raw,
      maxLegalBid: legal.maxBid,
      wtp,
      eligible: team.roster.length < config.rosterSize && legal.feasible && wtp >= reserve,
    };
  });
}
