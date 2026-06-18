import {
  applyTraitDisplacement,
  confirmTraitOverlay,
} from '../engines/traitOverlayConfirmation';
import {
  putFranchiseTraitOverlay,
  type FranchiseTraitOverlayRow,
} from './franchiseTraitOverlayStorage';
import {
  getFranchisePlayer,
  saveFranchisePlayer,
  type Player,
} from './franchisePlayerStorage';

export type ApplyConfirmedTraitOverlayResult =
  | { status: 'applied'; player: Player; overlay: FranchiseTraitOverlayRow }
  | { status: 'already-applied' | 'no-player' | 'not-applicable'; reason?: string };

export async function applyConfirmedTraitOverlay(
  franchiseId: string,
  overlay: FranchiseTraitOverlayRow,
): Promise<ApplyConfirmedTraitOverlayResult> {
  if (overlay.applied === true) {
    return { status: 'already-applied' };
  }

  const player = await getFranchisePlayer(franchiseId, overlay.playerId);
  if (player === null) {
    return { status: 'no-player' };
  }

  const result = applyTraitDisplacement(
    { trait1: player.trait1 ?? null, trait2: player.trait2 ?? null },
    overlay,
  );

  if (!result.applied) {
    return { status: 'not-applicable', reason: result.reason };
  }

  const saved = await saveFranchisePlayer(franchiseId, {
    ...player,
    trait1: result.trait1 ?? undefined,
    trait2: result.trait2 ?? undefined,
  });

  // The franchise player row and tracker overlay row live in separate browser
  // databases, so no single transaction can span both. The player write is the
  // authoritative trait mutation; the overlay's applied flag guards later calls
  // from repeating the mutation.
  const confirmed = confirmTraitOverlay(overlay);
  await putFranchiseTraitOverlay(confirmed);

  return { status: 'applied', player: saved, overlay: confirmed };
}
