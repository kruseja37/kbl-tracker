import { buildBidSheet } from './biddingPolicies';
import { reservePrice, roundToAuctionIncrement } from './reservePrice';
import type {
  AuctionSimBidRead,
  AuctionSimConfig,
  AuctionSimPlayer,
  AuctionSimTeamState,
} from './types';

export interface AuctionSimClearResult {
  playerId: string;
  reserve: number;
  winnerTeamId: string | null;
  price: number | null;
  disposition: 'sold' | 'unsold';
  bids: readonly AuctionSimBidRead[];
}

export function clearAuctionLot(
  player: AuctionSimPlayer,
  teams: readonly AuctionSimTeamState[],
  remainingAfterPlayer: readonly AuctionSimPlayer[],
  config: AuctionSimConfig,
): AuctionSimClearResult {
  const reserve = reservePrice(player, config.reserveFractionK, config.bidIncrement);
  const bids = buildBidSheet(player, teams, remainingAfterPlayer, config);
  const eligible = bids
    .filter((bid) => bid.eligible)
    .sort((left, right) => right.wtp - left.wtp || left.teamId.localeCompare(right.teamId));

  if (eligible.length === 0) {
    return {
      playerId: player.playerId,
      reserve,
      winnerTeamId: null,
      price: null,
      disposition: 'unsold',
      bids,
    };
  }

  const winner = eligible[0];
  const runnerUp = eligible[1] ?? null;
  const clearingTarget = runnerUp === null
    ? reserve
    : Math.max(reserve, runnerUp.wtp + config.bidIncrement);
  const price = Math.min(
    winner.wtp,
    roundToAuctionIncrement(clearingTarget, config.bidIncrement),
  );

  return {
    playerId: player.playerId,
    reserve,
    winnerTeamId: winner.teamId,
    price,
    disposition: 'sold',
    bids,
  };
}
