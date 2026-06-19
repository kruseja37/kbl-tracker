// §16 sim placeholder: the All-Star roster locks at 60% of scheduled games (override of the original 0.5).
export const ALL_STAR_LOCK_FRACTION = 0.6;

/**
 * True iff the completed game at `gameNumber` is AT OR PAST the All-Star lock checkpoint
 * (`Math.round(totalGames * fraction)`). AT-OR-PAST (not cross-from-below): the caller enforces
 * lock-once via the persisted `locked` flag, so this stays correct under skipped / replayed /
 * out-of-order game completion. Pure: no Date.now / Math.random / I/O.
 */
export function isAtOrPastAllStarLockFraction(
  gameNumber: number,
  totalGames: number,
  fraction: number = ALL_STAR_LOCK_FRACTION,
): boolean {
  if (!Number.isFinite(gameNumber) || !Number.isFinite(totalGames) || totalGames <= 0) {
    return false;
  }
  const anchor = Math.round(totalGames * fraction);
  return gameNumber >= anchor;
}
