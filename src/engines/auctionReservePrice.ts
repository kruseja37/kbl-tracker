import { LEAGUE_MINIMUM_SALARY } from '../data/rosterEngineConstants';

export const RESERVE_PRICE_K_STOPS = [0, 0.5, 0.65, 0.8] as const;
export type ReservePriceK = typeof RESERVE_PRICE_K_STOPS[number];

export const DEFAULT_RESERVE_PRICE_K: ReservePriceK = 0.65;
export const RESERVE_PRICE_OFF_K: ReservePriceK = 0;

export interface ReservePriceInput {
  iv: number;
  k: number;
  minimumSalary?: number;
  /**
   * k=0 is the off switch. Callers pass their historical opening ask here so the
   * old auction path can remain byte-for-byte when the dial is off.
   */
  passthroughPrice?: number | null;
}

export function isReservePriceKStop(value: number): value is ReservePriceK {
  return RESERVE_PRICE_K_STOPS.some((stop) => Math.abs(stop - value) < 0.000001);
}

export function normalizeReservePriceK(
  value: number | null | undefined,
  fallback: ReservePriceK = DEFAULT_RESERVE_PRICE_K,
): ReservePriceK {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return isReservePriceKStop(value) ? value : fallback;
}

export function reserveP(input: ReservePriceInput): number {
  const k = Math.max(0, Number.isFinite(input.k) ? input.k : 0);
  if (k === RESERVE_PRICE_OFF_K) return finiteNonNegative(input.passthroughPrice) ? input.passthroughPrice! : 0;

  const minimumSalary = finiteNonNegative(input.minimumSalary)
    ? input.minimumSalary!
    : LEAGUE_MINIMUM_SALARY;
  const iv = finiteNonNegative(input.iv) ? input.iv : 0;
  return Math.max(minimumSalary, Math.round(k * iv));
}

function finiteNonNegative(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
