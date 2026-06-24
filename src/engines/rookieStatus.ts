export interface RookieStatusValue { activatedSeasonId: string; }

// Debut-season-only (JK 2026-06-23): a player is a rookie ONLY during the season the status was activated.
export function isPlayerRookie(
  rookieStatus: RookieStatusValue | null | undefined,
  currentSeasonId: string | null | undefined,
): boolean {
  if (!rookieStatus || !currentSeasonId) return false;
  return rookieStatus.activatedSeasonId === currentSeasonId;
}
