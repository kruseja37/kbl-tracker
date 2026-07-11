import {
  listUnresolvedDevelopment,
  resolveRatingsProposal,
  resolveTraitProposal,
  type DevelopmentProposal,
  type ProposalResolutionResult,
} from '../../src/utils/franchiseConsoleMirror';
import { getFranchisePlayer } from '../../src/utils/franchisePlayerStorage';
import type { FranchiseRatingsOverlayRow } from '../../src/utils/franchiseRatingsOverlayStorage';
import type {
  FranchiseTraitOverlayRow,
  FranchiseTraitSlotValue,
} from '../../src/utils/franchiseTraitOverlayStorage';

export type LsimDevelopmentDecision =
  | { action: 'confirm' }
  | { action: 'reject'; reason: string }
  | { action: 'delay' }
  | { action: 'adjust'; ratingValue?: number; traitValue?: FranchiseTraitSlotValue };

export interface LsimDevelopmentPolicyRule {
  match: {
    kind?: DevelopmentProposal['kind'];
    playerId?: string;
    ratingKey?: string;
    boundaryGameNumber?: number;
  };
  decision: LsimDevelopmentDecision;
}

export interface LsimDevelopmentConfirmPolicy {
  defaultDecision: LsimDevelopmentDecision;
  rules?: LsimDevelopmentPolicyRule[];
  actor?: string;
}

export const CONFIRM_AS_PROPOSED_POLICY: LsimDevelopmentConfirmPolicy = {
  defaultDecision: { action: 'confirm' },
  actor: 'L-SIM FIDELITY-1',
};

export interface LsimDevelopmentResolutionTrace {
  boundaryGameNumber: number;
  proposalKind: DevelopmentProposal['kind'];
  overlayId: string;
  playerId: string;
  ratingKey?: string;
  delta?: number;
  decision: LsimDevelopmentDecision['action'];
  outcome: 'delayed' | ProposalResolutionResult<
    FranchiseRatingsOverlayRow | FranchiseTraitOverlayRow,
    number | FranchiseTraitSlotValue
  >['outcome'];
  expectedPriorValue?: number | FranchiseTraitSlotValue;
  currentValue?: number | FranchiseTraitSlotValue;
  actualEnteredValue?: number | FranchiseTraitSlotValue;
  confirmationStatus?: FranchiseRatingsOverlayRow['confirmationStatus'] | FranchiseTraitOverlayRow['confirmationStatus'];
  idempotencyProbeOutcome?: 'noop';
  postProbeValue?: number;
}

function ruleMatches(
  rule: LsimDevelopmentPolicyRule,
  proposal: DevelopmentProposal,
  boundaryGameNumber: number,
): boolean {
  const match = rule.match;
  return (
    (match.kind === undefined || match.kind === proposal.kind) &&
    (match.playerId === undefined || match.playerId === proposal.overlay.playerId) &&
    (match.boundaryGameNumber === undefined || match.boundaryGameNumber === boundaryGameNumber) &&
    (match.ratingKey === undefined ||
      (proposal.kind === 'rating' && proposal.overlay.ratingKey === match.ratingKey))
  );
}

export function decisionForDevelopmentProposal(
  policy: LsimDevelopmentConfirmPolicy,
  proposal: DevelopmentProposal,
  boundaryGameNumber: number,
): LsimDevelopmentDecision {
  return policy.rules?.find((rule) => ruleMatches(rule, proposal, boundaryGameNumber))?.decision
    ?? policy.defaultDecision;
}

function traitSlots(player: Awaited<ReturnType<typeof getFranchisePlayer>>): FranchiseTraitSlotValue {
  return {
    trait1: player?.trait1 ?? null,
    trait2: player?.trait2 ?? null,
  };
}

export async function driveLsimDevelopmentConfirmPolicy(input: {
  franchiseId: string;
  seasonId: string;
  boundaryGameNumber: number;
  policy?: LsimDevelopmentConfirmPolicy;
}): Promise<LsimDevelopmentResolutionTrace[]> {
  const policy = input.policy ?? CONFIRM_AS_PROPOSED_POLICY;
  const groups = await listUnresolvedDevelopment(input.franchiseId, input.seasonId);
  const proposals = groups
    .filter((candidate) =>
      candidate.boundaryGameNumber <= input.boundaryGameNumber && !candidate.stalePlan,
    )
    .flatMap((candidate) => candidate.proposals);
  if (proposals.length === 0) return [];

  const traces: LsimDevelopmentResolutionTrace[] = [];
  for (const proposal of proposals) {
    const decision = decisionForDevelopmentProposal(policy, proposal, input.boundaryGameNumber);
    if (decision.action === 'delay') {
      traces.push({
        boundaryGameNumber: input.boundaryGameNumber,
        proposalKind: proposal.kind,
        overlayId: proposal.overlay.id,
        playerId: proposal.overlay.playerId,
        ...(proposal.kind === 'rating'
          ? { ratingKey: proposal.overlay.ratingKey, delta: proposal.overlay.delta }
          : {}),
        decision: 'delay',
        outcome: 'delayed',
        confirmationStatus: proposal.overlay.confirmationStatus,
      });
      continue;
    }

    const player = await getFranchisePlayer(input.franchiseId, proposal.overlay.playerId);
    if (!player) throw new Error(`[L-SIM FIDELITY-1] Missing player ${proposal.overlay.playerId}`);

    if (proposal.kind === 'rating') {
      const current = (player as unknown as Record<string, unknown>)[proposal.overlay.ratingKey];
      if (typeof current !== 'number' || !Number.isFinite(current)) {
        throw new Error(`[L-SIM FIDELITY-1] Non-numeric ${proposal.overlay.ratingKey} for ${player.id}`);
      }
      const result = await resolveRatingsProposal(proposal.overlay.id, {
        action: decision.action === 'reject'
          ? 'reject'
          : decision.action === 'adjust'
            ? 'confirm-adjusted'
            : 'confirm',
        actor: policy.actor,
        observedPriorValue: current,
        ...(decision.action === 'reject' ? { rejectReason: decision.reason } : {}),
        ...(decision.action === 'adjust' ? { actualValue: decision.ratingValue } : {}),
      });
      traces.push({
        boundaryGameNumber: input.boundaryGameNumber,
        proposalKind: 'rating',
        overlayId: proposal.overlay.id,
        playerId: proposal.overlay.playerId,
        ratingKey: proposal.overlay.ratingKey,
        delta: proposal.overlay.delta,
        decision: decision.action,
        outcome: result.outcome,
        expectedPriorValue: result.expectedPriorValue,
        currentValue: result.currentValue,
        actualEnteredValue: result.overlay.actualEnteredValue,
        confirmationStatus: result.overlay.confirmationStatus,
      });
      continue;
    }

    const current = traitSlots(player);
    const result = await resolveTraitProposal(proposal.overlay.id, {
      action: decision.action === 'reject'
        ? 'reject'
        : decision.action === 'adjust'
          ? 'confirm-adjusted'
          : 'confirm',
      actor: policy.actor,
      observedPriorValue: current,
      ...(decision.action === 'reject' ? { rejectReason: decision.reason } : {}),
      ...(decision.action === 'adjust' ? { actualValue: decision.traitValue } : {}),
    });
    traces.push({
      boundaryGameNumber: input.boundaryGameNumber,
      proposalKind: 'trait',
      overlayId: proposal.overlay.id,
      playerId: proposal.overlay.playerId,
      decision: decision.action,
      outcome: result.outcome,
      expectedPriorValue: result.expectedPriorValue,
      currentValue: result.currentValue,
      actualEnteredValue: result.overlay.actualEnteredValue,
      confirmationStatus: result.overlay.confirmationStatus,
    });
  }
  return traces;
}
