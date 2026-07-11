import { useCallback, useLayoutEffect, useState } from 'react';

export interface SeatRevealInput {
  seatId: string | null;
  pickKey: string | number;
  tradeKey: string | number;
  lensId: string | null;
}

/**
 * Privacy cover copied from AuctionStage's proven law: cover in a layout effect before paint,
 * while render also fails closed whenever the revealed seat no longer matches the active seat.
 */
export function useSeatReveal(input: SeatRevealInput) {
  const [revealedSeatId, setRevealedSeatId] = useState<string | null>(null);

  useLayoutEffect(() => {
    setRevealedSeatId(null);
  }, [input.seatId, input.pickKey, input.tradeKey, input.lensId]);

  const reveal = useCallback(() => {
    if (input.seatId) setRevealedSeatId(input.seatId);
  }, [input.seatId]);
  const cover = useCallback(() => setRevealedSeatId(null), []);

  return {
    revealed: Boolean(input.seatId) && revealedSeatId === input.seatId,
    revealedSeatId,
    reveal,
    cover,
  };
}
