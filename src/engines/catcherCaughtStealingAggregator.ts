// BUILD-DARK / derive-on-read: catcher arm rate reads RA-8 season fielding fields; SEASON-only (career parity deferred).

export interface CatcherArmRateInput {
  caughtStealingAgainst?: number | null;
  stolenBasesAllowed?: number | null;
}

function finiteOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function catcherCaughtStealingRate(input: CatcherArmRateInput): number | null {
  const cs = finiteOrZero(input.caughtStealingAgainst);
  const sb = finiteOrZero(input.stolenBasesAllowed);
  const numerator = cs * 0.95;
  const denominator = numerator + sb * 0.45;
  return denominator === 0 ? null : numerator / denominator;
}
