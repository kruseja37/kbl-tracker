import { checkpointCountForCadence } from '../data/rosterEngineConstants';
import { applyTraitDisplacement } from '../engines/traitOverlayConfirmation';
import { isCheckpointBoundary } from './franchiseCheckpointSweepCompute';
import {
  applyConfirmedTraitOverlay,
  TraitOverlayPersistenceError,
  TraitOverlayPlayerWriteError,
} from './franchiseTraitConfirmApply';
import {
  compareAndSetFranchisePlayer,
  FranchisePlayerPostCommitError,
  getFranchisePlayer,
  type Player,
} from './franchisePlayerStorage';
import {
  getFranchiseRatingsOverlayById,
  getFranchiseRatingsOverlaysByFranchisePlayer,
  getFranchiseRatingsOverlaysByFranchiseSeason,
  putFranchiseRatingsOverlay,
  type FranchiseRatingsOverlayRow,
} from './franchiseRatingsOverlayStorage';
import {
  getFranchiseTraitOverlayById,
  getFranchiseTraitOverlaysByFranchisePlayer,
  getFranchiseTraitOverlaysByFranchiseSeason,
  putFranchiseTraitOverlay,
  type FranchiseTraitOverlayRow,
  type FranchiseTraitSlotValue,
} from './franchiseTraitOverlayStorage';
import { getSeasonMetadata } from './seasonStorage';

const MAX_APPLY_ERROR_LENGTH = 240;

type ResolutionAction = 'confirm' | 'confirm-adjusted' | 'reject';

interface BaseResolution {
  action: ResolutionAction;
  actor?: string;
  rejectReason?: string;
}

export interface RatingsProposalResolution extends BaseResolution {
  actualValue?: number;
  observedPriorValue?: number;
}

export interface TraitProposalResolution extends BaseResolution {
  actualValue?: FranchiseTraitSlotValue;
  observedPriorValue?: FranchiseTraitSlotValue;
}

export type ConsoleMirrorValidationCode =
  | 'overlay-not-found'
  | 'missing-reject-reason'
  | 'missing-observed-prior-value'
  | 'missing-actual-value'
  | 'invalid-rating-value'
  | 'invalid-trait-value'
  | 'missing-season-metadata'
  | 'invalid-checkpoint-boundary'
  | 'trait-proposal-not-applicable';

export class FranchiseConsoleMirrorValidationError extends Error {
  readonly code: ConsoleMirrorValidationCode;

  constructor(code: ConsoleMirrorValidationCode, message: string) {
    super(message);
    this.name = 'FranchiseConsoleMirrorValidationError';
    this.code = code;
  }
}

export type DevelopmentProposal =
  | {
      kind: 'rating';
      overlay: FranchiseRatingsOverlayRow;
      /** Present only when a prior player write failed and the proposal can be retried safely. */
      retry?: true;
    }
  | {
      kind: 'trait';
      overlay: FranchiseTraitOverlayRow;
      /** Present only when a prior player write failed and the proposal can be retried safely. */
      retry?: true;
    };

export interface UnresolvedDevelopmentCheckpoint {
  /**
   * `0` when sourceEventId cannot be parsed; a parsed stale boundary keeps its
   * original game number. Quarantined groups always use ordinal 0 and set
   * stalePlan so consumers can present them separately from the current plan.
   */
  boundaryGameNumber: number;
  ordinal: number;
  ordinalCount: number;
  proposals: DevelopmentProposal[];
  stalePlan?: true;
}

export type DevelopmentHistoryEntry =
  | { kind: 'rating'; overlay: FranchiseRatingsOverlayRow }
  | { kind: 'trait'; overlay: FranchiseTraitOverlayRow };

export interface ProposalResolutionResult<
  TOverlay extends FranchiseRatingsOverlayRow | FranchiseTraitOverlayRow,
  TValue,
> {
  outcome: 'resolved' | 'conflict' | 'apply-failed' | 'recovered' | 'noop';
  overlay: TOverlay;
  expectedPriorValue?: TValue;
  currentValue?: TValue;
}

interface BoundaryResolution {
  boundaryGameNumber: number | undefined;
  ordinal: number | undefined;
}

export const franchiseConsoleMirrorSeam = {
  getSeasonMetadata,
  getFranchisePlayer,
  compareAndSetFranchisePlayer,
  applyConfirmedTraitOverlay,
  getFranchiseRatingsOverlayById,
  getFranchiseRatingsOverlaysByFranchisePlayer,
  getFranchiseRatingsOverlaysByFranchiseSeason,
  putFranchiseRatingsOverlay,
  getFranchiseTraitOverlayById,
  getFranchiseTraitOverlaysByFranchisePlayer,
  getFranchiseTraitOverlaysByFranchiseSeason,
  putFranchiseTraitOverlay,
};

function deviceLocalCivilDate(epoch: number): string {
  const date = new Date(epoch);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function boundedApplyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_APPLY_ERROR_LENGTH);
}

function normalizedActor(actor: string | undefined): string | undefined {
  const value = actor?.trim();
  return value ? value : undefined;
}

function requiredRejectReason(resolution: BaseResolution): string | undefined {
  if (resolution.action !== 'reject') return undefined;
  const reason = resolution.rejectReason?.trim();
  if (!reason) {
    throw new FranchiseConsoleMirrorValidationError(
      'missing-reject-reason',
      'A rejection reason is required when rejecting a development proposal.',
    );
  }
  return reason;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertTraitSlots(value: unknown, fieldName: string): asserts value is FranchiseTraitSlotValue {
  const slots = value as Partial<FranchiseTraitSlotValue> | null;
  if (
    !slots ||
    (slots.trait1 !== null && typeof slots.trait1 !== 'string') ||
    (slots.trait2 !== null && typeof slots.trait2 !== 'string')
  ) {
    throw new FranchiseConsoleMirrorValidationError(
      'invalid-trait-value',
      `${fieldName} must contain trait1 and trait2 as strings or null.`,
    );
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

function parseBoundaryGameNumber(
  row: Pick<FranchiseRatingsOverlayRow | FranchiseTraitOverlayRow, 'sourceEventId'>,
): number | null {
  const match = /^(?:checkpoint|trait-grant)-(\d+)$/.exec(row.sourceEventId);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getBoundaryPlan(seasonId: string): Promise<number[]> {
  const metadata = await franchiseConsoleMirrorSeam.getSeasonMetadata(seasonId);
  if (!metadata || !Number.isInteger(metadata.totalGames) || metadata.totalGames <= 0) {
    throw new FranchiseConsoleMirrorValidationError(
      'missing-season-metadata',
      `Season ${seasonId} has no valid totalGames checkpoint plan.`,
    );
  }

  const checkpointCount = checkpointCountForCadence(metadata.checkpointCadence);
  const boundaries: number[] = [];
  for (let gameNumber = 1; gameNumber <= metadata.totalGames; gameNumber += 1) {
    if (isCheckpointBoundary(gameNumber, metadata.totalGames, checkpointCount)) {
      boundaries.push(gameNumber);
    }
  }
  return boundaries;
}

async function resolveBoundary(
  seasonId: string,
  row: Pick<FranchiseRatingsOverlayRow | FranchiseTraitOverlayRow, 'sourceEventId'>,
): Promise<BoundaryResolution> {
  const boundaryGameNumber = parseBoundaryGameNumber(row);
  const boundaries = await getBoundaryPlan(seasonId);
  const index = boundaryGameNumber === null ? -1 : boundaries.indexOf(boundaryGameNumber);
  if (index < 0 || boundaryGameNumber === null) {
    return { boundaryGameNumber: undefined, ordinal: undefined };
  }
  return {
    boundaryGameNumber,
    ordinal: index + 1,
  };
}

function isTerminalStatus(
  status: FranchiseRatingsOverlayRow['confirmationStatus'] | FranchiseTraitOverlayRow['confirmationStatus'],
): boolean {
  return (
    status === 'confirmed' ||
    status === 'confirmed-applied' ||
    status === 'rejected' ||
    status === 'conflict'
  );
}

function isHistoryStatus(
  status: FranchiseRatingsOverlayRow['confirmationStatus'] | FranchiseTraitOverlayRow['confirmationStatus'],
): boolean {
  return (
    status === 'confirmed-applied' ||
    status === 'rejected' ||
    status === 'conflict' ||
    status === 'apply-failed'
  );
}

function resolutionStamp(resolution: BaseResolution, epoch: number) {
  return {
    resolvedAt: epoch,
    resolvedCivilDate: deviceLocalCivilDate(epoch),
    resolvedBy: normalizedActor(resolution.actor),
  };
}

function hasPendingApplyIntent(
  overlay: FranchiseRatingsOverlayRow | FranchiseTraitOverlayRow,
): boolean {
  return (
    (overlay.confirmationStatus === 'pending' || overlay.confirmationStatus === 'apply-failed') &&
    overlay.resolvedAt !== undefined &&
    overlay.actualEnteredValue !== undefined
  );
}

function pendingIntentStamp(
  overlay: FranchiseRatingsOverlayRow | FranchiseTraitOverlayRow,
  resolution: BaseResolution,
  epoch: number,
) {
  if (
    hasPendingApplyIntent(overlay) &&
    overlay.resolvedAt !== undefined &&
    overlay.resolvedCivilDate !== undefined
  ) {
    return {
      resolvedAt: overlay.resolvedAt,
      resolvedCivilDate: overlay.resolvedCivilDate,
      resolvedBy: overlay.resolvedBy,
    };
  }
  return resolutionStamp(resolution, epoch);
}

export async function listUnresolvedDevelopment(
  franchiseId: string,
  seasonId: string,
): Promise<UnresolvedDevelopmentCheckpoint[]> {
  const [ratings, traits] = await Promise.all([
    franchiseConsoleMirrorSeam.getFranchiseRatingsOverlaysByFranchiseSeason(franchiseId, seasonId),
    franchiseConsoleMirrorSeam.getFranchiseTraitOverlaysByFranchiseSeason(franchiseId, seasonId),
  ]);
  const proposals: DevelopmentProposal[] = [
    ...ratings
      .filter((overlay) =>
        overlay.confirmationStatus === 'pending' || overlay.confirmationStatus === 'apply-failed')
      .map((overlay): DevelopmentProposal => ({
        kind: 'rating',
        overlay,
        ...(overlay.confirmationStatus === 'apply-failed' ? { retry: true as const } : {}),
      })),
    ...traits
      .filter((overlay) =>
        overlay.confirmationStatus === 'pending' || overlay.confirmationStatus === 'apply-failed')
      .map((overlay): DevelopmentProposal => ({
        kind: 'trait',
        overlay,
        ...(overlay.confirmationStatus === 'apply-failed' ? { retry: true as const } : {}),
      })),
  ];
  if (proposals.length === 0) return [];

  const boundaries = await getBoundaryPlan(seasonId);
  const grouped = new Map<number, DevelopmentProposal[]>();
  const quarantined = new Map<number, DevelopmentProposal[]>();
  for (const proposal of proposals) {
    const boundaryGameNumber = parseBoundaryGameNumber(proposal.overlay);
    if (boundaryGameNumber === null || !boundaries.includes(boundaryGameNumber)) {
      const quarantineBoundary = boundaryGameNumber ?? 0;
      const group = quarantined.get(quarantineBoundary) ?? [];
      group.push(proposal);
      quarantined.set(quarantineBoundary, group);
      continue;
    }
    const group = grouped.get(boundaryGameNumber) ?? [];
    group.push(proposal);
    grouped.set(boundaryGameNumber, group);
  }

  const sortProposals = (group: DevelopmentProposal[]) => group.sort((left, right) =>
    left.kind.localeCompare(right.kind) || left.overlay.id.localeCompare(right.overlay.id),
  );
  const validGroups = Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([boundaryGameNumber, group]) => {
      const index = boundaries.indexOf(boundaryGameNumber);
      return {
        boundaryGameNumber,
        ordinal: index + 1,
        ordinalCount: boundaries.length,
        proposals: sortProposals(group),
      };
    });
  const quarantinedGroups = Array.from(quarantined.entries())
    .sort(([left], [right]) => left - right)
    .map(([boundaryGameNumber, group]): UnresolvedDevelopmentCheckpoint => ({
      boundaryGameNumber,
      ordinal: 0,
      ordinalCount: boundaries.length,
      proposals: sortProposals(group),
      stalePlan: true,
    }));
  return [...validGroups, ...quarantinedGroups];
}

export async function resolveRatingsProposal(
  overlayId: string,
  resolution: RatingsProposalResolution,
): Promise<ProposalResolutionResult<FranchiseRatingsOverlayRow, number>> {
  const overlay = await franchiseConsoleMirrorSeam.getFranchiseRatingsOverlayById(overlayId);
  if (!overlay) {
    throw new FranchiseConsoleMirrorValidationError(
      'overlay-not-found',
      `Ratings overlay ${overlayId} was not found.`,
    );
  }
  if (isTerminalStatus(overlay.confirmationStatus)) {
    return { outcome: 'noop', overlay };
  }

  const recoveryIntent = hasPendingApplyIntent(overlay);
  const isReject = !recoveryIntent && resolution.action === 'reject';
  const rejectReason = recoveryIntent ? overlay.rejectReason : requiredRejectReason(resolution);
  if (!recoveryIntent && resolution.action === 'confirm-adjusted' && !isFiniteNumber(resolution.actualValue)) {
    throw new FranchiseConsoleMirrorValidationError(
      'missing-actual-value',
      'confirm-adjusted requires a finite actualValue.',
    );
  }
  const expectedPriorValue = overlay.expectedPriorValue ?? resolution.observedPriorValue;
  if (!isFiniteNumber(expectedPriorValue)) {
    throw new FranchiseConsoleMirrorValidationError(
      'missing-observed-prior-value',
      'This legacy ratings proposal requires observedPriorValue for compare-and-set.',
    );
  }
  const proposedCandidate = overlay.proposedValue ?? expectedPriorValue + overlay.delta;
  const proposedValue = isFiniteNumber(proposedCandidate) ? proposedCandidate : undefined;
  if (proposedValue === undefined && !isReject) {
    throw new FranchiseConsoleMirrorValidationError(
      'invalid-rating-value',
      'The ratings proposal does not resolve to a finite proposed value.',
    );
  }
  const finalValue = recoveryIntent
    ? overlay.actualEnteredValue as number
    : resolution.action === 'confirm-adjusted'
      ? resolution.actualValue as number
      : proposedValue ?? expectedPriorValue;
  if (!isReject && !isFiniteNumber(finalValue)) {
    throw new FranchiseConsoleMirrorValidationError(
      'invalid-rating-value',
      'The ratings resolution does not contain a finite final value.',
    );
  }
  const boundary = await resolveBoundary(overlay.seasonId, overlay);
  const epoch = Date.now();
  const stamp = pendingIntentStamp(overlay, resolution, epoch);

  const complete = async (
    outcome: 'resolved' | 'recovered',
    playerRecordRevision: string | undefined,
    currentValue: number,
  ): Promise<ProposalResolutionResult<FranchiseRatingsOverlayRow, number>> => {
    const confirmed: FranchiseRatingsOverlayRow = {
      ...overlay,
      ...boundary,
      ...stamp,
      confirmationStatus: 'confirmed-applied',
      applied: true,
      expectedPriorValue,
      proposedValue,
      actualEnteredValue: finalValue,
      playerRecordRevision,
      rejectReason: undefined,
      applyError: undefined,
    };
    await franchiseConsoleMirrorSeam.putFranchiseRatingsOverlay(confirmed);
    return { outcome, overlay: confirmed, expectedPriorValue, currentValue };
  };

  const conflict = async (
    currentValue?: number,
    playerRecordRevision?: string,
  ): Promise<ProposalResolutionResult<FranchiseRatingsOverlayRow, number>> => {
    const conflicted: FranchiseRatingsOverlayRow = {
      ...overlay,
      ...boundary,
      ...stamp,
      confirmationStatus: 'conflict',
      applied: false,
      expectedPriorValue,
      proposedValue,
      actualEnteredValue: isReject ? undefined : finalValue,
      rejectReason,
      playerRecordRevision,
      applyError: undefined,
    };
    await franchiseConsoleMirrorSeam.putFranchiseRatingsOverlay(conflicted);
    return {
      outcome: 'conflict',
      overlay: conflicted,
      expectedPriorValue,
      currentValue,
    };
  };

  const player = await franchiseConsoleMirrorSeam.getFranchisePlayer(
    overlay.franchiseId,
    overlay.playerId,
  );

  if (!player) {
    return conflict();
  }

  const rawCurrentValue = (player as unknown as Record<string, unknown>)[overlay.ratingKey];
  if (!isFiniteNumber(rawCurrentValue)) {
    return conflict(undefined, player.lastModified);
  }

  if (recoveryIntent && rawCurrentValue === finalValue) {
    return complete('recovered', player.lastModified, rawCurrentValue);
  }

  if (rawCurrentValue !== expectedPriorValue) {
    return conflict(rawCurrentValue, player.lastModified);
  }

  if (isReject) {
    const rejected: FranchiseRatingsOverlayRow = {
      ...overlay,
      ...boundary,
      ...stamp,
      confirmationStatus: 'rejected',
      applied: false,
      expectedPriorValue,
      proposedValue,
      actualEnteredValue: undefined,
      rejectReason,
      playerRecordRevision: player.lastModified,
      applyError: undefined,
    };
    await franchiseConsoleMirrorSeam.putFranchiseRatingsOverlay(rejected);
    return {
      outcome: 'resolved',
      overlay: rejected,
      expectedPriorValue,
      currentValue: rawCurrentValue,
    };
  }

  const intent: FranchiseRatingsOverlayRow = {
    ...overlay,
    ...boundary,
    ...stamp,
    confirmationStatus: 'pending',
    applied: false,
    expectedPriorValue,
    proposedValue,
    actualEnteredValue: finalValue,
    playerRecordRevision: player.lastModified,
    rejectReason: undefined,
    applyError: undefined,
  };
  if (!recoveryIntent) {
    await franchiseConsoleMirrorSeam.putFranchiseRatingsOverlay(intent);
  }

  let write: Awaited<ReturnType<typeof compareAndSetFranchisePlayer>>;
  try {
    write = await franchiseConsoleMirrorSeam.compareAndSetFranchisePlayer(
      overlay.franchiseId,
      overlay.playerId,
      (current) =>
        (current as unknown as Record<string, unknown>)[overlay.ratingKey] === expectedPriorValue,
      (current) => ({ ...current, [overlay.ratingKey]: finalValue }),
    );
  } catch (error) {
    if (error instanceof FranchisePlayerPostCommitError) {
      return complete('resolved', error.player.lastModified, finalValue);
    }
    const currentAfterError = await franchiseConsoleMirrorSeam.getFranchisePlayer(
      overlay.franchiseId,
      overlay.playerId,
    );
    if (!currentAfterError) return conflict();
    const valueAfterError = (currentAfterError as unknown as Record<string, unknown>)[overlay.ratingKey];
    if (!isFiniteNumber(valueAfterError)) {
      return conflict(undefined, currentAfterError.lastModified);
    }
    if (recoveryIntent && valueAfterError === finalValue) {
      return complete('recovered', currentAfterError.lastModified, valueAfterError);
    }
    if (valueAfterError !== expectedPriorValue) {
      return conflict(valueAfterError, currentAfterError.lastModified);
    }
    const failed: FranchiseRatingsOverlayRow = {
      ...overlay,
      ...boundary,
      ...stamp,
      confirmationStatus: 'apply-failed',
      applied: false,
      expectedPriorValue,
      proposedValue,
      actualEnteredValue: finalValue,
      playerRecordRevision: currentAfterError.lastModified,
      applyError: boundedApplyError(error),
    };
    await franchiseConsoleMirrorSeam.putFranchiseRatingsOverlay(failed);
    return {
      outcome: 'apply-failed',
      overlay: failed,
      expectedPriorValue,
      currentValue: valueAfterError,
    };
  }

  if (write.status === 'not-found') return conflict();
  if (write.status === 'conflict') {
    const concurrentValue = (write.player as unknown as Record<string, unknown>)[overlay.ratingKey];
    if (recoveryIntent && concurrentValue === finalValue) {
      return complete('recovered', write.player.lastModified, finalValue);
    }
    return conflict(
      isFiniteNumber(concurrentValue) ? concurrentValue : undefined,
      write.player.lastModified,
    );
  }
  return complete(
    recoveryIntent ? 'recovered' : 'resolved',
    write.player.lastModified,
    finalValue,
  );
}

export async function resolveTraitProposal(
  overlayId: string,
  resolution: TraitProposalResolution,
): Promise<ProposalResolutionResult<FranchiseTraitOverlayRow, FranchiseTraitSlotValue>> {
  const overlay = await franchiseConsoleMirrorSeam.getFranchiseTraitOverlayById(overlayId);
  if (!overlay) {
    throw new FranchiseConsoleMirrorValidationError(
      'overlay-not-found',
      `Trait overlay ${overlayId} was not found.`,
    );
  }
  if (isTerminalStatus(overlay.confirmationStatus)) {
    return { outcome: 'noop', overlay };
  }

  const recoveryIntent = hasPendingApplyIntent(overlay);
  const isReject = !recoveryIntent && resolution.action === 'reject';
  const rejectReason = recoveryIntent ? overlay.rejectReason : requiredRejectReason(resolution);
  if (!recoveryIntent && resolution.action === 'confirm-adjusted') {
    if (resolution.actualValue === undefined) {
      throw new FranchiseConsoleMirrorValidationError(
        'missing-actual-value',
        'confirm-adjusted requires an actualValue trait state.',
      );
    }
    assertTraitSlots(resolution.actualValue, 'actualValue');
  }
  const expectedPriorValue = overlay.expectedPriorValue ?? resolution.observedPriorValue;
  if (expectedPriorValue === undefined) {
    throw new FranchiseConsoleMirrorValidationError(
      'missing-observed-prior-value',
      'This legacy trait proposal requires observedPriorValue for compare-and-set.',
    );
  }
  assertTraitSlots(expectedPriorValue, 'observedPriorValue');

  let proposedValue = overlay.proposedValue;
  if (proposedValue === undefined) {
    try {
      const proposal = applyTraitDisplacement(expectedPriorValue, overlay);
      if (!proposal.applied) {
        if (!isReject) {
          throw new FranchiseConsoleMirrorValidationError(
            'trait-proposal-not-applicable',
            `Trait proposal is not applicable to the expected prior state: ${proposal.reason ?? 'unknown'}.`,
          );
        }
      } else {
        proposedValue = { trait1: proposal.trait1, trait2: proposal.trait2 };
      }
    } catch (error) {
      if (isReject) {
        proposedValue = undefined;
      } else if (error instanceof FranchiseConsoleMirrorValidationError) {
        throw error;
      } else {
        throw new FranchiseConsoleMirrorValidationError(
          'invalid-trait-value',
          error instanceof Error ? error.message : 'The trait proposal is invalid.',
        );
      }
    }
  }
  if (proposedValue !== undefined) assertTraitSlots(proposedValue, 'proposedValue');
  const finalValue = recoveryIntent
    ? overlay.actualEnteredValue as FranchiseTraitSlotValue
    : resolution.action === 'confirm-adjusted'
      ? resolution.actualValue as FranchiseTraitSlotValue
      : proposedValue ?? expectedPriorValue;
  if (!isReject) assertTraitSlots(finalValue, 'actualEnteredValue');
  const boundary = await resolveBoundary(overlay.seasonId, overlay);
  const epoch = Date.now();
  const stamp = pendingIntentStamp(overlay, resolution, epoch);

  const complete = async (
    outcome: 'resolved' | 'recovered',
    playerRecordRevision: string | undefined,
    currentValue: FranchiseTraitSlotValue,
  ): Promise<ProposalResolutionResult<FranchiseTraitOverlayRow, FranchiseTraitSlotValue>> => {
    const confirmed: FranchiseTraitOverlayRow = {
      ...overlay,
      ...boundary,
      ...stamp,
      confirmationStatus: 'confirmed-applied',
      applied: true,
      expectedPriorValue,
      proposedValue,
      actualEnteredValue: finalValue,
      playerRecordRevision,
      rejectReason: undefined,
      applyError: undefined,
    };
    await franchiseConsoleMirrorSeam.putFranchiseTraitOverlay(confirmed);
    return { outcome, overlay: confirmed, expectedPriorValue, currentValue };
  };

  const conflict = async (
    currentValue?: FranchiseTraitSlotValue,
    playerRecordRevision?: string,
  ): Promise<ProposalResolutionResult<FranchiseTraitOverlayRow, FranchiseTraitSlotValue>> => {
    const conflicted: FranchiseTraitOverlayRow = {
      ...overlay,
      ...boundary,
      ...stamp,
      confirmationStatus: 'conflict',
      applied: false,
      expectedPriorValue,
      proposedValue,
      actualEnteredValue: isReject ? undefined : finalValue,
      rejectReason,
      playerRecordRevision,
      applyError: undefined,
    };
    await franchiseConsoleMirrorSeam.putFranchiseTraitOverlay(conflicted);
    return { outcome: 'conflict', overlay: conflicted, expectedPriorValue, currentValue };
  };

  const player = await franchiseConsoleMirrorSeam.getFranchisePlayer(
    overlay.franchiseId,
    overlay.playerId,
  );

  if (!player) {
    return conflict();
  }

  const currentValue = traitSlotsFromPlayer(player);
  if (recoveryIntent && traitSlotsEqual(currentValue, finalValue)) {
    return complete('recovered', player.lastModified, currentValue);
  }

  if (!traitSlotsEqual(currentValue, expectedPriorValue)) {
    return conflict(currentValue, player.lastModified);
  }

  if (isReject) {
    const rejected: FranchiseTraitOverlayRow = {
      ...overlay,
      ...boundary,
      ...stamp,
      confirmationStatus: 'rejected',
      applied: false,
      expectedPriorValue,
      proposedValue,
      actualEnteredValue: undefined,
      rejectReason,
      playerRecordRevision: player.lastModified,
      applyError: undefined,
    };
    await franchiseConsoleMirrorSeam.putFranchiseTraitOverlay(rejected);
    return {
      outcome: 'resolved',
      overlay: rejected,
      expectedPriorValue,
      currentValue,
    };
  }

  const intent: FranchiseTraitOverlayRow = {
    ...overlay,
    ...boundary,
    ...stamp,
    confirmationStatus: 'pending',
    applied: false,
    expectedPriorValue,
    proposedValue,
    actualEnteredValue: finalValue,
    playerRecordRevision: player.lastModified,
    rejectReason: undefined,
    applyError: undefined,
  };
  if (!recoveryIntent) {
    await franchiseConsoleMirrorSeam.putFranchiseTraitOverlay(intent);
  }

  try {
    const result = await franchiseConsoleMirrorSeam.applyConfirmedTraitOverlay(
      overlay.franchiseId,
      overlay,
      {
        expectedTraitSlots: expectedPriorValue,
        targetTraitSlots: finalValue,
        resolvedOverlay: (savedPlayer) => ({
          ...overlay,
          ...boundary,
          ...stamp,
          confirmationStatus: 'confirmed-applied',
          applied: true,
          expectedPriorValue,
          proposedValue,
          actualEnteredValue: finalValue,
          playerRecordRevision: savedPlayer.lastModified,
          rejectReason: undefined,
          applyError: undefined,
        }),
      },
    );
    if (result.status === 'applied') {
      return {
        outcome: recoveryIntent ? 'recovered' : 'resolved',
        overlay: result.overlay,
        expectedPriorValue,
        currentValue: finalValue,
      };
    }

    if (result.status === 'conflict') {
      const concurrentValue = traitSlotsFromPlayer(result.player);
      if (recoveryIntent && traitSlotsEqual(concurrentValue, finalValue)) {
        return complete('recovered', result.player.lastModified, concurrentValue);
      }
      return conflict(concurrentValue, result.player.lastModified);
    }

    if (result.status === 'no-player') {
      return conflict();
    }

    throw new FranchiseConsoleMirrorValidationError(
      'trait-proposal-not-applicable',
      `Trait proposal did not apply: ${result.status}${result.reason ? ` (${result.reason})` : ''}.`,
    );
  } catch (error) {
    if (error instanceof TraitOverlayPersistenceError) {
      throw error;
    }
    if (!(error instanceof TraitOverlayPlayerWriteError)) {
      throw error;
    }
    if (error.cause instanceof FranchisePlayerPostCommitError) {
      return complete('resolved', error.cause.player.lastModified, finalValue);
    }
    const currentAfterError = await franchiseConsoleMirrorSeam.getFranchisePlayer(
      overlay.franchiseId,
      overlay.playerId,
    );
    if (!currentAfterError) return conflict();
    const valueAfterError = traitSlotsFromPlayer(currentAfterError);
    if (recoveryIntent && traitSlotsEqual(valueAfterError, finalValue)) {
      return complete('recovered', currentAfterError.lastModified, valueAfterError);
    }
    if (!traitSlotsEqual(valueAfterError, expectedPriorValue)) {
      return conflict(valueAfterError, currentAfterError.lastModified);
    }
    const failed: FranchiseTraitOverlayRow = {
      ...overlay,
      ...boundary,
      ...stamp,
      confirmationStatus: 'apply-failed',
      applied: false,
      expectedPriorValue,
      proposedValue,
      actualEnteredValue: finalValue,
      playerRecordRevision: currentAfterError.lastModified,
      applyError: boundedApplyError(error.cause),
    };
    await franchiseConsoleMirrorSeam.putFranchiseTraitOverlay(failed);
    return {
      outcome: 'apply-failed',
      overlay: failed,
      expectedPriorValue,
      currentValue: valueAfterError,
    };
  }
}

export async function getDevelopmentHistory(
  franchiseId: string,
  playerId: string,
): Promise<DevelopmentHistoryEntry[]> {
  const [ratings, traits] = await Promise.all([
    franchiseConsoleMirrorSeam.getFranchiseRatingsOverlaysByFranchisePlayer(franchiseId, playerId),
    franchiseConsoleMirrorSeam.getFranchiseTraitOverlaysByFranchisePlayer(franchiseId, playerId),
  ]);

  return [
    ...ratings
      .filter((overlay) => isHistoryStatus(overlay.confirmationStatus))
      .map((overlay): DevelopmentHistoryEntry => ({ kind: 'rating', overlay })),
    ...traits
      .filter((overlay) => isHistoryStatus(overlay.confirmationStatus))
      .map((overlay): DevelopmentHistoryEntry => ({ kind: 'trait', overlay })),
  ].sort((left, right) =>
    (left.overlay.resolvedAt ?? Number.MAX_SAFE_INTEGER) -
      (right.overlay.resolvedAt ?? Number.MAX_SAFE_INTEGER) ||
    left.overlay.createdAt.localeCompare(right.overlay.createdAt) ||
    left.kind.localeCompare(right.kind) ||
    left.overlay.id.localeCompare(right.overlay.id),
  );
}
