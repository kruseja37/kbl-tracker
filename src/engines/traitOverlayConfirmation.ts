import { CANONICAL_TRAIT_NAMES } from './traitRealityScorer';
import type { FranchiseTraitOverlayRow } from '../utils/franchiseTraitOverlayStorage';

/**
 * §11 / L9b-3c trait-overlay confirmation model.
 *
 * Traits are categorical, not rating deltas: the confirmation transform builds
 * the user's SMB4 console instruction and resolves the app-side two-slot
 * trait1/trait2 result. The storage write lives in franchiseTraitConfirmApply.
 */

export interface TraitSlots {
  trait1: string | null;
  trait2: string | null;
}

export interface TraitDisplacementResult {
  trait1: string | null;
  trait2: string | null;
  applied: boolean;
  reason?: string;
}

export interface TraitConfirmationRequest {
  overlayId: string;
  playerId: string;
  valence: 'gain' | 'lose';
  traitName: string;
  displacesTraitName: string | null;
  resultingTrait1: string | null;
  resultingTrait2: string | null;
  consoleInstruction: string;
}

function assertCanonicalTrait(traitName: string, fieldName: string): void {
  if (!CANONICAL_TRAIT_NAMES.has(traitName)) {
    throw new Error(`Non-canonical ${fieldName}: ${traitName}`);
  }
}

export function applyTraitDisplacement(
  current: TraitSlots,
  overlay: Pick<FranchiseTraitOverlayRow, 'valence' | 'traitName' | 'displacesTraitName'>,
): TraitDisplacementResult {
  assertCanonicalTrait(overlay.traitName, 'traitName');
  if (overlay.displacesTraitName !== null) {
    assertCanonicalTrait(overlay.displacesTraitName, 'displacesTraitName');
  }

  if (overlay.valence === 'gain') {
    if (current.trait1 === overlay.traitName || current.trait2 === overlay.traitName) {
      return { ...current, applied: false, reason: 'already-held' };
    }

    if (overlay.displacesTraitName !== null) {
      if (current.trait1 === overlay.displacesTraitName) {
        return { trait1: overlay.traitName, trait2: current.trait2, applied: true };
      }
      if (current.trait2 === overlay.displacesTraitName) {
        return { trait1: current.trait1, trait2: overlay.traitName, applied: true };
      }
    }

    if (current.trait1 === null) {
      return { trait1: overlay.traitName, trait2: current.trait2, applied: true };
    }
    if (current.trait2 === null) {
      return { trait1: current.trait1, trait2: overlay.traitName, applied: true };
    }

    return { ...current, applied: false, reason: 'cap-no-displacement' };
  }

  if (current.trait1 === overlay.traitName) {
    return { trait1: null, trait2: current.trait2, applied: true };
  }
  if (current.trait2 === overlay.traitName) {
    return { trait1: current.trait1, trait2: null, applied: true };
  }

  return { ...current, applied: false, reason: 'not-held' };
}

export function confirmTraitOverlay(
  overlay: FranchiseTraitOverlayRow,
): FranchiseTraitOverlayRow {
  if (overlay.confirmationStatus !== 'pending') return { ...overlay };
  return {
    ...overlay,
    confirmationStatus: 'confirmed',
    applied: true,
  };
}

export function buildTraitConfirmationRequest(
  overlay: FranchiseTraitOverlayRow,
  current: TraitSlots,
): TraitConfirmationRequest {
  const result = applyTraitDisplacement(current, overlay);
  const displaceInstruction =
    overlay.valence === 'gain' && overlay.displacesTraitName !== null
      ? ` (replacing ${overlay.displacesTraitName})`
      : '';
  const consoleInstruction =
    overlay.valence === 'gain'
      ? `On your SMB4 console, give ${overlay.playerId} the ${overlay.traitName} trait${displaceInstruction}`
      : `On your SMB4 console, remove the ${overlay.traitName} trait from ${overlay.playerId}.`;

  return {
    overlayId: overlay.id,
    playerId: overlay.playerId,
    valence: overlay.valence,
    traitName: overlay.traitName,
    displacesTraitName: overlay.displacesTraitName,
    resultingTrait1: result.trait1,
    resultingTrait2: result.trait2,
    consoleInstruction,
  };
}

export function summarizeTraitOverlayChangeLog(
  overlays: FranchiseTraitOverlayRow[],
): Array<{
  overlayId: string;
  playerId: string;
  valence: 'gain' | 'lose';
  traitName: string;
  displacesTraitName: string | null;
  confirmationStatus: FranchiseTraitOverlayRow['confirmationStatus'];
  applied: boolean;
  summary: string;
}> {
  return overlays
    .slice()
    .sort((left, right) =>
      left.playerId.localeCompare(right.playerId) ||
      left.traitName.localeCompare(right.traitName) ||
      left.sourceEventId.localeCompare(right.sourceEventId) ||
      left.id.localeCompare(right.id),
    )
    .map((overlay) => ({
      overlayId: overlay.id,
      playerId: overlay.playerId,
      valence: overlay.valence,
      traitName: overlay.traitName,
      displacesTraitName: overlay.displacesTraitName,
      confirmationStatus: overlay.confirmationStatus,
      applied: overlay.applied,
      summary: `${overlay.playerId} ${overlay.valence} ${overlay.traitName}${
        overlay.displacesTraitName !== null
          ? ` replacing ${overlay.displacesTraitName}`
          : ''
      } [${overlay.confirmationStatus}/${overlay.applied ? 'applied' : 'unapplied'}]`,
    }));
}
