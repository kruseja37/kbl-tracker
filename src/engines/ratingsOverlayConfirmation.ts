import type { FranchiseRatingsOverlayRow } from '../utils/franchiseRatingsOverlayStorage';

/**
 * §11 / L2 ratings-overlay two-tier confirmation model.
 *
 * Ratings changes require user confirmation in BOTH places: the user's SMB4
 * console (the manual edit; this engine produces the instruction text) and the
 * app database. `confirmOverlay` remains the legacy unapplied transform; the
 * console-mirror service owns the new applied/rejected/conflict state machine.
 * Morale is NOT here: morale is automatic/logged
 * with no confirmation (§11 line 202). Trait confirmation (L9b) reuses this
 * pattern later.
 *
 * DEFAULTS-TAKEN: `confirmOverlay` is a pure idempotent transform (the store
 * `put` plus the user's console edit are the deferred live flow); instruction
 * text is delta-based, with the resulting rating shown when a base value is
 * supplied; temporary overlays carry a console revert reminder.
 *
 * Live UI wiring remains deferred; new callers resolve through
 * `franchiseConsoleMirror` rather than persisting this legacy transform.
 */

export interface OverlayConfirmationRequest {
  overlayId: string;
  playerId: string;
  ratingKey: string;
  delta: number;
  kind: 'permanent' | 'temporary';
  expiresAtGameNumber: number | null;
  resultingRating: number | null;
  consoleInstruction: string;
}

function signDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function buildOverlayConfirmationRequest(
  overlay: FranchiseRatingsOverlayRow,
  baseRatingValue?: number,
): OverlayConfirmationRequest {
  const resultingRating =
    baseRatingValue === undefined ? null : baseRatingValue + overlay.delta;
  const signedDelta = signDelta(overlay.delta);
  const baseInstruction =
    resultingRating !== null
      ? `Set ${overlay.playerId} ${overlay.ratingKey} to ${resultingRating} on your SMB4 console (${signedDelta}).`
      : `Apply ${signedDelta} to ${overlay.playerId} ${overlay.ratingKey} on your SMB4 console.`;
  const temporaryInstruction =
    overlay.kind === 'temporary'
      ? ` Temporary — revert on your console when it expires${
          overlay.expiresAtGameNumber !== null ? ` (game ${overlay.expiresAtGameNumber})` : ''
        }.`
      : '';

  return {
    overlayId: overlay.id,
    playerId: overlay.playerId,
    ratingKey: overlay.ratingKey,
    delta: overlay.delta,
    kind: overlay.kind,
    expiresAtGameNumber: overlay.expiresAtGameNumber,
    resultingRating,
    consoleInstruction: `${baseInstruction}${temporaryInstruction}`,
  };
}

export function confirmOverlay(
  overlay: FranchiseRatingsOverlayRow,
): FranchiseRatingsOverlayRow {
  if (overlay.confirmationStatus !== 'pending') return { ...overlay };
  return {
    ...overlay,
    confirmationStatus: 'confirmed',
  };
}

export function buildExpiryRevertReminder(
  overlay: FranchiseRatingsOverlayRow,
  baseRatingValue?: number,
): string {
  return `Revert ${overlay.playerId} ${overlay.ratingKey} on your SMB4 console — the temporary change (${signDelta(
    overlay.delta,
  )}) has expired${
    baseRatingValue !== undefined ? `; set it back to ${baseRatingValue}` : ''
  }.`;
}

export function summarizeOverlayChangeLog(
  overlays: FranchiseRatingsOverlayRow[],
): Array<{
  overlayId: string;
  playerId: string;
  ratingKey: string;
  delta: number;
  kind: 'permanent' | 'temporary';
  confirmationStatus: FranchiseRatingsOverlayRow['confirmationStatus'];
  summary: string;
}> {
  return overlays
    .slice()
    .sort((left, right) =>
      left.playerId.localeCompare(right.playerId) ||
      left.ratingKey.localeCompare(right.ratingKey) ||
      left.sourceEventId.localeCompare(right.sourceEventId) ||
      left.id.localeCompare(right.id),
    )
    .map((overlay) => ({
      overlayId: overlay.id,
      playerId: overlay.playerId,
      ratingKey: overlay.ratingKey,
      delta: overlay.delta,
      kind: overlay.kind,
      confirmationStatus: overlay.confirmationStatus,
      summary: `${overlay.playerId} ${overlay.ratingKey} ${signDelta(overlay.delta)} [${
        overlay.kind
      }/${overlay.confirmationStatus}]`,
    }));
}
