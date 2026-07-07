import type { AuctionSimConfig, AuctionSimPlayer } from './types';

export function roundToAuctionIncrement(value: number, increment: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const step = Number.isFinite(increment) && increment > 0 ? increment : 1;
  return Math.ceil(value / step) * step;
}

export function reservePrice(
  player: Pick<AuctionSimPlayer, 'iv'>,
  reserveFractionK: number,
  bidIncrement: number,
): number {
  const k = Number.isFinite(reserveFractionK) ? Math.max(0, reserveFractionK) : 0;
  return roundToAuctionIncrement(player.iv * k, bidIncrement);
}

export function playerCompletionPrice(
  player: AuctionSimPlayer,
  config: Pick<AuctionSimConfig, 'autoFillPriceMode' | 'reserveFractionK' | 'bidIncrement' | 'minimumCompletionPrice'>,
): number {
  if (config.autoFillPriceMode === 'zero') return 0;
  return Math.max(
    config.minimumCompletionPrice,
    reservePrice(player, config.reserveFractionK, config.bidIncrement),
  );
}
