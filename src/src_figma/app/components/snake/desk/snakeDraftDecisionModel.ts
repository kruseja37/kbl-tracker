import { validateTrade, type PickValue } from '../../../../../engines/leagueConstruction';
import type { SnakeAssistantUnavailableReason } from '../../../../../engines/snakeAssistantBoard';
import { snakeMoneyNonnegative } from '../../../../../engines/snakeMoney';
import type { SnakeGuidePackage } from '../../../../../engines/snakeGuideTrade';
import { searchSnakeGuidePackage } from '../../../../../engines/snakeGuideTrade';
import type { SnakeRiskRow, SnakeScarcityRow } from '../../../../../engines/snakeRationalRoom';
import type { SimultaneousSnakeSeatingInput } from '../../../../../engines/snakeSeatingProof';
import type { LeagueBuilderMlbDraftSession } from '../../../../../utils/leagueBuilderStorage';
import type { DeskCandidate } from './deskModel';
import type { ChemistryStripRow } from './draftTruthModel';
import type { SelectedPlayerConsequence } from './snakeDeskIntelligenceModel';

export type SnakeDraftDecision =
  | { kind: 'TAKE_NOW'; playerId: string }
  | { kind: 'SAFE_TO_WAIT'; playerId: string; nextPick: number }
  | { kind: 'TRADE_TO_PICK'; playerId: string; targetPick: number; proposal: SnakeGuidePackage }
  | { kind: 'PASS'; playerId: string };

export interface SnakeDecisionCandidateFacts {
  playerId: string;
  contextualWorth: number;
  trueCost: number;
  fit: 1 | 2 | 3;
  chemistry: readonly { family: string; score: number }[];
  legalFinish: true;
  solvent: true;
}

export interface SnakeGuidePublicSession {
  id: string;
  revision: number;
  currentPickIndex: number;
  pickOrder: Array<{ round: number; pick: number; teamId: string }>;
  completedPicks: Array<{
    round: number;
    pick: number;
    teamId: string;
    playerId: string;
    settledSalary?: number;
    marginalTax?: number;
  }>;
  lockedClubs: Array<{ teamId: string; archetypeId?: string }>;
}

export interface SnakeGuideRecommendationRequest {
  /** Public-state key only. Private desk identity is bound locally by the hook and never posted. */
  key: string;
  input: {
    session: SnakeGuidePublicSession;
    buyerTeamId: string;
    earliestThreatPick: number;
    pickValueChart: PickValue[];
    seatingProofInput: SimultaneousSnakeSeatingInput;
  };
}

export type SnakeGuideRecommendationRunResult =
  | { status: 'ready'; proposal: SnakeGuidePackage }
  | { status: 'unavailable' };

export interface SnakeGuideRecommendationState {
  status: 'idle' | 'pending' | 'ready' | 'unavailable';
  proposal: SnakeGuidePackage | null;
}

export interface SnakeDraftDecisionInput {
  selectedPlayerId: string | null;
  askingTeamId: string | null;
  livePickTeamId: string | null;
  assistantPriorityPlayerIds: readonly string[] | null;
  assistantInfeasibleReason: SnakeAssistantUnavailableReason | null;
  infeasibleForPlayerId: string | null;
  selected: SnakeDecisionCandidateFacts | null;
  replacements: readonly SnakeDecisionCandidateFacts[] | null;
  risk: SnakeRiskRow | null;
  scarcity: readonly SnakeScarcityRow[] | null;
  guide: SnakeGuideRecommendationState;
}

const FIT_SCORE: Readonly<Record<string, 1 | 2 | 3>> = {
  'WEAK FIT': 1,
  'SOLID FIT': 2,
  'STRONG FIT': 3,
};

const TIER_SCORE: Readonly<Record<NonNullable<ChemistryStripRow['tier']>, number>> = {
  L1: 1,
  L2: 2,
  L3: 3,
};

const PIN_CAUSAL_INFEASIBLE_REASONS = new Set<SnakeAssistantUnavailableReason>([
  'PIN_UNAVAILABLE',
  'PIN_UNMATCHED',
  'DROPPED_PIN',
]);

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function completeChemistry(rows: readonly ChemistryStripRow[]): SnakeDecisionCandidateFacts['chemistry'] | null {
  if (rows.length !== 5) return null;
  const families = new Set<string>();
  const result: Array<{ family: string; score: number }> = [];
  for (const row of rows) {
    if (!row || families.has(row.family) || !finite(row.count) || !row.tier) return null;
    const tier = TIER_SCORE[row.tier];
    if (!tier) return null;
    families.add(row.family);
    result.push({ family: row.family, score: tier * 100 + row.count });
  }
  return result.sort((left, right) => left.family.localeCompare(right.family));
}

/** Converts Batch 3's exact, selected-id-bound consequence into complete resolver facts. */
export function buildSnakeDecisionCandidateFacts(input: {
  playerId: string;
  candidate: DeskCandidate | null;
  consequence: SelectedPlayerConsequence | null;
}): SnakeDecisionCandidateFacts | null {
  const consequence = input.consequence;
  const candidate = input.candidate;
  if (!candidate || candidate.id !== input.playerId
    || !consequence || consequence.status !== 'ready'
    || consequence.selectedPlayerId !== input.playerId
    || !finite(candidate.advisorWorth) || !finite(candidate.trueCost)
    || consequence.after.legalFinish.affordability === 'OPEN'
    || !consequence.after.legalFinish.feasible
    || !finite(consequence.after.legalFinish.moneyLeft)
    || !snakeMoneyNonnegative(consequence.after.legalFinish.moneyLeft)
    || !finite(consequence.after.ledger.moneyLeft)
    || !snakeMoneyNonnegative(consequence.after.ledger.moneyLeft)) return null;
  const fit = FIT_SCORE[consequence.after.fitWord];
  const chemistry = completeChemistry(consequence.after.chemistry);
  if (!fit || !chemistry) return null;
  return {
    playerId: input.playerId,
    contextualWorth: candidate.advisorWorth,
    trueCost: candidate.trueCost,
    fit,
    chemistry,
    legalFinish: true,
    solvent: true,
  };
}

function chemistryNoWorse(
  replacement: SnakeDecisionCandidateFacts['chemistry'],
  selected: SnakeDecisionCandidateFacts['chemistry'],
): { noWorse: boolean; strict: boolean } {
  if (replacement.length !== selected.length) return { noWorse: false, strict: false };
  const replacementByFamily = new Map(replacement.map((row) => [row.family, row.score]));
  let strict = false;
  for (const row of selected) {
    const score = replacementByFamily.get(row.family);
    if (!finite(score) || score < row.score) return { noWorse: false, strict: false };
    if (score > row.score) strict = true;
  }
  return { noWorse: true, strict };
}

export function isStrictlyParetoDominated(input: {
  selected: SnakeDecisionCandidateFacts;
  replacement: SnakeDecisionCandidateFacts;
}): boolean {
  if (input.selected.playerId === input.replacement.playerId) return false;
  const chemistry = chemistryNoWorse(input.replacement.chemistry, input.selected.chemistry);
  if (!chemistry.noWorse
    || input.replacement.contextualWorth < input.selected.contextualWorth
    || input.replacement.trueCost > input.selected.trueCost
    || input.replacement.fit < input.selected.fit
    || !input.replacement.legalFinish || !input.replacement.solvent) return false;
  return chemistry.strict
    || input.replacement.contextualWorth > input.selected.contextualWorth
    || input.replacement.trueCost < input.selected.trueCost
    || input.replacement.fit > input.selected.fit;
}

/** A public replacement suppresses urgency only when its contextual worth is at least the target's. */
export function hasEquivalentViableReplacement(input: {
  selectedPlayerId: string;
  scarcity: readonly SnakeScarcityRow[];
}): boolean {
  return input.scarcity.some((row) => row.playerId === input.selectedPlayerId
    && row.replacementState === 'AVAILABLE'
    && row.replacementPlayerId !== null
    && row.replacementPlayerId !== input.selectedPlayerId
    && finite(row.targetContextualWorth)
    && finite(row.replacementContextualWorth)
    && row.replacementContextualWorth >= row.targetContextualWorth);
}

function validRiskForSelected(risk: SnakeRiskRow | null, selectedPlayerId: string): risk is SnakeRiskRow {
  return Boolean(risk
    && risk.playerId === selectedPlayerId
    && Number.isInteger(risk.nextPick) && risk.nextPick > 0
    && Number.isInteger(risk.latestSelectingPick)
    && (risk.risk === 'SAFE_TO_WAIT'
      ? risk.earliestSelectingPick === null
      : Number.isInteger(risk.earliestSelectingPick)));
}

export function snakeGuideThreatPick(input: Omit<SnakeDraftDecisionInput, 'guide' | 'replacements'>): number | null {
  const playerId = input.selectedPlayerId;
  if (!playerId || !input.askingTeamId || !input.livePickTeamId
    || input.askingTeamId === input.livePickTeamId
    || !input.selected || input.selected.playerId !== playerId
    || !input.assistantPriorityPlayerIds?.includes(playerId)
    || !validRiskForSelected(input.risk, playerId)
    || input.risk.risk === 'SAFE_TO_WAIT'
    || !input.scarcity
    || hasEquivalentViableReplacement({ selectedPlayerId: playerId, scarcity: input.scarcity })) return null;
  return input.risk.earliestSelectingPick;
}

export function resolveSnakeDraftDecision(input: SnakeDraftDecisionInput): SnakeDraftDecision | null {
  const playerId = input.selectedPlayerId;
  if (!playerId) return null;
  if (input.infeasibleForPlayerId === playerId && input.assistantInfeasibleReason
    && PIN_CAUSAL_INFEASIBLE_REASONS.has(input.assistantInfeasibleReason)) {
    return { kind: 'PASS', playerId };
  }
  if (input.selected && input.selected.playerId === playerId && input.replacements) {
    if (input.replacements.some((replacement) => isStrictlyParetoDominated({
      selected: input.selected!,
      replacement,
    }))) return { kind: 'PASS', playerId };
  }
  if (!input.askingTeamId || !input.livePickTeamId
    || !input.selected || input.selected.playerId !== playerId
    || !input.assistantPriorityPlayerIds?.includes(playerId)
    || !validRiskForSelected(input.risk, playerId)
    || !input.scarcity) return null;
  if (input.risk.risk === 'SAFE_TO_WAIT') {
    return { kind: 'SAFE_TO_WAIT', playerId, nextPick: input.risk.nextPick };
  }
  if (hasEquivalentViableReplacement({ selectedPlayerId: playerId, scarcity: input.scarcity })) return null;
  if (input.askingTeamId === input.livePickTeamId) return { kind: 'TAKE_NOW', playerId };
  if (input.guide.status !== 'ready' || !input.guide.proposal) return null;
  return {
    kind: 'TRADE_TO_PICK',
    playerId,
    targetPick: input.guide.proposal.targetPick,
    proposal: input.guide.proposal,
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
  return value;
}

function requestHash(value: unknown): string {
  const source = JSON.stringify(stableValue(value));
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash = Math.imul(hash ^ source.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function cloneSerializable<T>(value: T): T {
  return structuredClone(value);
}

function hasExactOwnKeys(value: object, expected: readonly string[]): boolean {
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== 'string')) return false;
  const keys = (ownKeys as string[]).sort();
  return keys.length === expected.length
    && [...expected].sort().every((key, index) => keys[index] === key);
}

export function sanitizeSnakeGuideSession(session: LeagueBuilderMlbDraftSession): SnakeGuidePublicSession {
  return {
    id: session.id,
    revision: session.revision ?? 0,
    currentPickIndex: session.currentPickIndex,
    pickOrder: session.pickOrder.map(({ round, pick, teamId }) => ({ round, pick, teamId })),
    completedPicks: session.completedPicks.map(({ round, pick, teamId, playerId, settledSalary, marginalTax }) => ({
      round,
      pick,
      teamId,
      playerId,
      ...(settledSalary === undefined ? {} : { settledSalary }),
      ...(marginalTax === undefined ? {} : { marginalTax }),
    })),
    lockedClubs: (session.snakeSetup?.clubs ?? []).map(({ teamId, archetypeId }) => ({
      teamId,
      ...(archetypeId === undefined ? {} : { archetypeId }),
    })),
  };
}

export function buildSnakeGuideRecommendationRequest(input: {
  session: LeagueBuilderMlbDraftSession;
  buyerTeamId: string;
  earliestThreatPick: number;
  pickValueChart: readonly PickValue[];
  seatingProofInput: SimultaneousSnakeSeatingInput;
}): SnakeGuideRecommendationRequest {
  const requestInput = cloneSerializable({
    session: sanitizeSnakeGuideSession(input.session),
    buyerTeamId: input.buyerTeamId,
    earliestThreatPick: input.earliestThreatPick,
    pickValueChart: [...input.pickValueChart],
    seatingProofInput: input.seatingProofInput,
  });
  return { key: requestHash(requestInput), input: requestInput };
}

function validSnakeGuideClubTopology(input: SnakeGuideRecommendationRequest['input']): boolean {
  const publicClubIds = new Set<string>();
  for (const slot of input.session.pickOrder) {
    if (!slot.teamId) return false;
    publicClubIds.add(slot.teamId);
  }
  if (publicClubIds.size === 0 || !publicClubIds.has(input.buyerTeamId)
    || input.session.completedPicks.some((pick) => !publicClubIds.has(pick.teamId))) return false;
  const lockedIds = input.session.lockedClubs.map((club) => club.teamId);
  const proofIds = input.seatingProofInput.clubs.map((club) => club.teamId);
  return lockedIds.every(Boolean) && proofIds.every(Boolean)
    && lockedIds.length === publicClubIds.size && new Set(lockedIds).size === publicClubIds.size
    && proofIds.length === publicClubIds.size && new Set(proofIds).size === publicClubIds.size
    && lockedIds.every((teamId) => publicClubIds.has(teamId))
    && proofIds.every((teamId) => publicClubIds.has(teamId))
    && input.seatingProofInput.realTeamCount === publicClubIds.size;
}

export function expectedSnakeGuideDestinations(input: SnakeGuideRecommendationRequest['input']): number[] {
  const { session } = input;
  if (!validSnakeGuideClubTopology(input)
    || !Number.isInteger(session.currentPickIndex) || session.currentPickIndex < 0
    || session.currentPickIndex >= session.pickOrder.length
    || !Number.isInteger(input.earliestThreatPick) || input.earliestThreatPick <= 0) return [];
  return session.pickOrder
    .slice(session.currentPickIndex)
    .filter((slot) => slot.pick < input.earliestThreatPick && slot.teamId !== input.buyerTeamId)
    .map((slot) => slot.pick)
    .sort((left, right) => right - left);
}

function currentOwner(input: SnakeGuideRecommendationRequest['input'], pick: number): string | null {
  return input.session.pickOrder.slice(input.session.currentPickIndex).find((slot) => slot.pick === pick)?.teamId ?? null;
}

function chartValue(chart: readonly PickValue[], picks: readonly number[]): number | null {
  const byPick = new Map(chart.map((row) => [row.pick, row.value]));
  let total = 0;
  for (const pick of picks) {
    const value = byPick.get(pick);
    if (!finite(value)) return null;
    total += value;
  }
  return total;
}

export function validateSnakeGuideRecommendationPackage(
  request: SnakeGuideRecommendationRequest,
  proposal: unknown,
): proposal is SnakeGuidePackage {
  if (!proposal || typeof proposal !== 'object') return false;
  const value = proposal as SnakeGuidePackage;
  if (!hasExactOwnKeys(proposal, [
    'buyerTeamId',
    'sellerTeamId',
    'targetPick',
    'offerPickNumbers',
    'receivePickNumbers',
    'offerValue',
    'receiveValue',
    'sellerPremium',
    'sessionRevision',
  ])) return false;
  const destinations = expectedSnakeGuideDestinations(request.input);
  if (value.buyerTeamId !== request.input.buyerTeamId
    || !value.sellerTeamId || value.sellerTeamId === value.buyerTeamId
    || !destinations.includes(value.targetPick)
    || currentOwner(request.input, value.targetPick) !== value.sellerTeamId
    || value.sessionRevision !== request.input.session.revision
    || !Array.isArray(value.offerPickNumbers) || !Array.isArray(value.receivePickNumbers)
    || value.offerPickNumbers.length < 1 || value.offerPickNumbers.length > 3
    || value.offerPickNumbers.length !== value.receivePickNumbers.length
    || new Set(value.offerPickNumbers).size !== value.offerPickNumbers.length
    || new Set(value.receivePickNumbers).size !== value.receivePickNumbers.length
    || !value.receivePickNumbers.includes(value.targetPick)
    || value.offerPickNumbers.some((pick) => value.receivePickNumbers.includes(pick))) return false;
  const future = request.input.session.pickOrder.slice(request.input.session.currentPickIndex);
  const ownerByPick = new Map(future.map((slot) => [slot.pick, slot.teamId]));
  if (value.offerPickNumbers.some((pick) => ownerByPick.get(pick) !== value.buyerTeamId)
    || value.receivePickNumbers.some((pick) => ownerByPick.get(pick) !== value.sellerTeamId)) return false;
  const offerValue = chartValue(request.input.pickValueChart, value.offerPickNumbers);
  const receiveValue = chartValue(request.input.pickValueChart, value.receivePickNumbers);
  if (offerValue === null || receiveValue === null
    || value.offerValue !== offerValue || value.receiveValue !== receiveValue
    || !finite(value.sellerPremium) || value.sellerPremium !== offerValue - receiveValue
    || offerValue < receiveValue) return false;
  try {
    return validateTrade(
      value.offerPickNumbers.map((pick) => ({ pick })),
      value.receivePickNumbers.map((pick) => ({ pick })),
      [...request.input.pickValueChart],
    ).balanced;
  } catch {
    return false;
  }
}

function publicSessionAsLeagueSession(session: SnakeGuidePublicSession): LeagueBuilderMlbDraftSession {
  return {
    id: session.id,
    leagueId: '__public__',
    seasonNumber: 0,
    seed: '__public__',
    workflowVersion: 'snake-guide-public.v1',
    engineMethodVersion: 'snake-guide-public.v1',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: Math.max(1, ...session.pickOrder.map((slot) => slot.round)),
    pickOrder: session.pickOrder,
    completedPicks: session.completedPicks,
    snakeSetup: {
      poolPlayerIds: [],
      versionSelections: {},
      clubs: session.lockedClubs.map((club) => ({ ...club, hotseat: false })),
      orderSeed: '__public__',
    },
    revision: session.revision,
    currentPickIndex: session.currentPickIndex,
    createdDate: '',
    lastModified: '',
  };
}

export function runSnakeGuideRecommendationRequest(
  request: SnakeGuideRecommendationRequest,
): SnakeGuideRecommendationRunResult {
  if (!validSnakeGuideClubTopology(request.input)) return { status: 'unavailable' };
  const destinations = expectedSnakeGuideDestinations(request.input);
  if (!request.input.buyerTeamId || destinations.length === 0
    || request.input.pickValueChart.length === 0) return { status: 'unavailable' };
  const session = publicSessionAsLeagueSession(request.input.session);
  for (const targetPick of destinations) {
    let result;
    try {
      result = searchSnakeGuidePackage({
        session,
        pickValueChart: request.input.pickValueChart,
        seatingProofInput: request.input.seatingProofInput,
        buyerTeamId: request.input.buyerTeamId,
        targetPick,
      });
    } catch {
      return { status: 'unavailable' };
    }
    if (!result.package) continue;
    if (result.package.targetPick !== targetPick
      || !validateSnakeGuideRecommendationPackage(request, result.package)) return { status: 'unavailable' };
    return { status: 'ready', proposal: result.package };
  }
  return { status: 'unavailable' };
}
