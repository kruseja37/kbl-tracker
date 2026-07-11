import {
  applyTraitDisplacement,
  confirmTraitOverlay,
} from '../engines/traitOverlayConfirmation';
import {
  putFranchiseTraitOverlay,
  type FranchiseTraitOverlayRow,
  type FranchiseTraitSlotValue,
} from './franchiseTraitOverlayStorage';
import {
  compareAndSetFranchisePlayer,
  getFranchisePlayer,
  type Player,
} from './franchisePlayerStorage';

export type ApplyConfirmedTraitOverlayResult =
  | { status: 'applied'; player: Player; overlay: FranchiseTraitOverlayRow }
  | { status: 'conflict'; player: Player }
  | { status: 'already-applied' | 'no-player' | 'not-applicable'; reason?: string };

export interface ApplyConfirmedTraitOverlayOptions {
  /** Trait state that must still be current when the player row is atomically written. */
  expectedTraitSlots?: FranchiseTraitSlotValue;
  /** Optional post-console state for confirm-adjusted; the service still computes the proposal first. */
  targetTraitSlots?: FranchiseTraitSlotValue;
  /** Optional terminal row supplied by the console-mirror state machine. */
  resolvedOverlay?:
    | FranchiseTraitOverlayRow
    | ((savedPlayer: Player) => FranchiseTraitOverlayRow);
}

export class TraitOverlayPlayerWriteError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('Failed to write the franchise player trait state.');
    this.name = 'TraitOverlayPlayerWriteError';
    this.cause = cause;
  }
}

function traitSlotsFromPlayer(player: Player): FranchiseTraitSlotValue {
  return {
    trait1: player.trait1 ?? null,
    trait2: player.trait2 ?? null,
  };
}

function traitSlotsEqual(left: FranchiseTraitSlotValue, right: FranchiseTraitSlotValue): boolean {
  return left.trait1 === right.trait1 && left.trait2 === right.trait2;
}

export class TraitOverlayPersistenceError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super('Player trait state was written, but the overlay update failed.');
    this.name = 'TraitOverlayPersistenceError';
    this.cause = cause;
  }
}

export async function applyConfirmedTraitOverlay(
  franchiseId: string,
  overlay: FranchiseTraitOverlayRow,
  options: ApplyConfirmedTraitOverlayOptions = {},
): Promise<ApplyConfirmedTraitOverlayResult> {
  if (overlay.applied === true) {
    return { status: 'already-applied' };
  }

  const player = await getFranchisePlayer(franchiseId, overlay.playerId);
  if (player === null) {
    return { status: 'no-player' };
  }

  const expectedTraitSlots = options.expectedTraitSlots ?? traitSlotsFromPlayer(player);
  const result = applyTraitDisplacement(expectedTraitSlots, overlay);

  if (!result.applied) {
    return { status: 'not-applicable', reason: result.reason };
  }

  const targetTraitSlots = options.targetTraitSlots ?? {
    trait1: result.trait1,
    trait2: result.trait2,
  };
  let saved: Player;
  try {
    const write = await compareAndSetFranchisePlayer(
      franchiseId,
      overlay.playerId,
      (current) => traitSlotsEqual(traitSlotsFromPlayer(current), expectedTraitSlots),
      (current) => ({
        ...current,
        trait1: targetTraitSlots.trait1 ?? undefined,
        trait2: targetTraitSlots.trait2 ?? undefined,
      }),
    );
    if (write.status === 'not-found') return { status: 'no-player' };
    if (write.status === 'conflict') return { status: 'conflict', player: write.player };
    saved = write.player;
  } catch (error) {
    throw new TraitOverlayPlayerWriteError(error);
  }

  // The franchise player row and tracker overlay row live in separate browser
  // databases, so no single transaction can span both. The player write is the
  // authoritative trait mutation; the overlay's applied flag guards later calls
  // from repeating the mutation.
  const confirmed = typeof options.resolvedOverlay === 'function'
    ? options.resolvedOverlay(saved)
    : options.resolvedOverlay ?? confirmTraitOverlay(overlay);
  try {
    await putFranchiseTraitOverlay(confirmed);
  } catch (error) {
    throw new TraitOverlayPersistenceError(error);
  }

  return { status: 'applied', player: saved, overlay: confirmed };
}
