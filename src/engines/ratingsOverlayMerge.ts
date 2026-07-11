import type { FranchiseRatingsOverlayRow } from '../utils/franchiseRatingsOverlayStorage';

/**
 * §11 / L2 ratings-overlay read-path MERGE math.
 *
 * Effective ratings = frozen base ratings + confirmed, active overlay deltas.
 * Temporary overlays expire on an absolute game-number trigger.
 *
 * DEFAULTS-TAKEN: only `confirmed` overlays merge (`pending` is excluded by
 * the §11 two-tier confirmation model); the expiry boundary is
 * `currentGameNumber >= expiresAtGameNumber` (the overlay applies up to but
 * not including the expiry game); a `null` expiry on a temporary is treated as
 * active/never-auto-expiring; an overlay for a ratingKey absent from the base
 * is ignored; the base object is never mutated (oracle/base stays locked).
 *
 * WIRING is a DEFERRED seam, NOT built here: the live read path will load a
 * player's overlays via the L2a store, call `mergeRatingsOverlays` so
 * value/designation/morale see effective ratings, and delete
 * `selectExpiredTemporaryOverlays` ids on load. That activation step touches
 * live value/designation/morale consumers and is pointless while the store is
 * empty (no writer until L8/L9b). Build-dark.
 */

function isTemporaryOverlayExpired(
  overlay: FranchiseRatingsOverlayRow,
  currentGameNumber: number,
): boolean {
  return (
    overlay.kind === 'temporary' &&
    overlay.expiresAtGameNumber !== null &&
    currentGameNumber >= overlay.expiresAtGameNumber
  );
}

function isOverlayActive(
  overlay: FranchiseRatingsOverlayRow,
  currentGameNumber: number,
): boolean {
  return overlay.kind === 'permanent' || !isTemporaryOverlayExpired(overlay, currentGameNumber);
}

export function resolveActiveOverlayDeltas(
  overlays: FranchiseRatingsOverlayRow[],
  currentGameNumber: number,
): Record<string, number> {
  const deltas: Record<string, number> = {};

  for (const overlay of overlays) {
    if (
      overlay.confirmationStatus !== 'confirmed' ||
      overlay.applied === true ||
      !isOverlayActive(overlay, currentGameNumber)
    ) {
      continue;
    }

    deltas[overlay.ratingKey] = (deltas[overlay.ratingKey] ?? 0) + overlay.delta;
  }

  return deltas;
}

export function mergeRatingsOverlays(
  baseRatings: Record<string, number>,
  overlays: FranchiseRatingsOverlayRow[],
  currentGameNumber: number,
): Record<string, number> {
  const effectiveRatings: Record<string, number> = { ...baseRatings };
  const deltas = resolveActiveOverlayDeltas(overlays, currentGameNumber);

  for (const [ratingKey, delta] of Object.entries(deltas)) {
    if (Object.prototype.hasOwnProperty.call(effectiveRatings, ratingKey)) {
      effectiveRatings[ratingKey] += delta;
    }
  }

  return effectiveRatings;
}

export function selectExpiredTemporaryOverlays(
  overlays: FranchiseRatingsOverlayRow[],
  currentGameNumber: number,
): string[] {
  return overlays
    .filter((overlay) => isTemporaryOverlayExpired(overlay, currentGameNumber))
    .map((overlay) => overlay.id);
}
