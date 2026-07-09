import { LEAGUE_MINIMUM_SALARY } from '../data/rosterEngineConstants';
import type { RosterSlotPlayer } from '../data/rosterConstruction';
import type { LuxuryCapRow } from '../data/tierParams';
import {
  luxuryTax,
  shiftLuxuryCaps,
  type ConstructionPlayer,
  type TeamCapIdentity,
} from './leagueConstruction';
import {
  cheapestLegalCompletion,
  conservativePoolReserve,
  type CompletionCandidate,
} from './auctionCompletionFloor';

export type LiquidityBidRecommendation = 'bid' | 'push' | 'claim' | 'pass';
export type LiquidityState = 'aggressive' | 'neutral' | 'constrained' | 'emergency-fill';
export type LiquidityPriceRead = 'value' | 'fair' | 'stretch' | 'pass';

export type LiquidityReasonCode =
  | 'above-remaining-budget'
  | 'above-legal-ceiling'
  | 'below-minimum-bid'
  | 'emergency-fill'
  | 'future-fill-protected'
  | 'late-budget-surplus'
  | 'liquidity-constrained'
  | 'near-complete'
  | 'priority-fit'
  | 'scarce-replacement'
  | 'similar-replacements'
  | 'within-liquidity-ceiling';

export interface LiquidityAwareBidInput {
  playerId: string;
  iv: number;
  nextBid: number;
  currentBid?: number | null;
  bidIncrement?: number;
  legalMaxBid: number | null;
  budgetRemaining: number;
  rosterSlotsRemaining: number;
  minSalary?: number;
  rosterShapes?: readonly RosterSlotPlayer[];
  candidateShape?: RosterSlotPlayer | null;
  remainingPool?: readonly LiquidityCompletionCandidate[];
  completionTaxContext?: LiquidityCompletionTaxContext;
  baseValuation?: number;
  archetypeFitMultiplier?: number;
  needMultiplier?: number;
  riskTolerance?: number;
}

export interface LiquidityCompletionCandidate extends CompletionCandidate {
  value?: number;
}

export interface LiquidityCompletionTaxContext {
  currentRosterWithCandidate: readonly ConstructionPlayer[];
  playerById: ReadonlyMap<string, ConstructionPlayer>;
  capIdentity?: TeamCapIdentity;
  baseCaps: readonly LuxuryCapRow[];
}

export interface LiquidityAwareBidRead {
  playerId: string;
  maxBid: number;
  rawValuation: number;
  liquidityAdjustedValue: number;
  legalMaxBid: number;
  nextBid: number;
  nextBidAllowed: boolean;
  recommendation: LiquidityBidRecommendation;
  priceRead: LiquidityPriceRead;
  liquidityState: LiquidityState;
  discretionaryBudget: number;
  minimumFutureFillReserve: number;
  replacementValueEstimate: number;
  scarcityModifier: number;
  priorityNeedModifier: number;
  affordabilityGuardrail: 'ok' | 'warn' | 'blocked';
  reasonCodes: LiquidityReasonCode[];
}

const DEFAULT_RISK_TOLERANCE = 1;
const QUALITY_COMPLETION_TARGET_PERCENTILE = 0.35;

interface FutureFillReserve {
  reserve: number;
  incrementalTax: number;
}

export function evaluateLiquidityAwareBid(input: LiquidityAwareBidInput): LiquidityAwareBidRead {
  const minSalary = finitePositive(input.minSalary) ? input.minSalary! : LEAGUE_MINIMUM_SALARY;
  const openSlotsAfterWin = Math.max(0, input.rosterSlotsRemaining - 1);
  const futureFill = estimateMinimumFutureFillReserve(input, minSalary, openSlotsAfterWin);
  const legalMaxBid = Math.max(
    0,
    Math.min(input.budgetRemaining, input.legalMaxBid ?? input.budgetRemaining) - futureFill.incrementalTax,
  );
  const minimumFutureFillReserve = futureFill.reserve;
  const discretionaryBudget = Math.max(0, input.budgetRemaining - minimumFutureFillReserve);
  const replacementValueEstimate = estimateReplacementValue(input);
  const scarcityModifier = estimateScarcityModifier(input, replacementValueEstimate);
  const priorityNeedModifier = clamp(input.needMultiplier ?? 1, 0.85, 1.35);
  const riskTolerance = clamp(input.riskTolerance ?? DEFAULT_RISK_TOLERANCE, 0.6, 1.25);
  const rawValuation = Math.max(0, input.baseValuation ?? input.iv);
  const liquidityState = resolveLiquidityState(input, discretionaryBudget, minimumFutureFillReserve);
  const liquidityMultiplier = liquidityStateMultiplier(liquidityState, input);
  const liquidityAdjustedValue = Math.max(
    0,
    rawValuation * priorityNeedModifier * scarcityModifier * riskTolerance * liquidityMultiplier,
  );
  const hardCeiling = Math.max(0, Math.min(input.budgetRemaining, legalMaxBid, discretionaryBudget));
  const maxBid = roundDownToIncrement(
    Math.min(hardCeiling, liquidityAdjustedValue),
    input.bidIncrement,
  );
  const nextBidAllowed = input.nextBid <= maxBid;
  const priceRead = classifyPrice(input.nextBid, liquidityAdjustedValue, maxBid, legalMaxBid);
  const recommendation = nextBidAllowed
    ? input.rosterSlotsRemaining <= 1 ? 'claim' : priceRead === 'value' ? 'push' : 'bid'
    : 'pass';
  const reasonCodes = buildReasonCodes({
    input,
    legalMaxBid,
    maxBid,
    nextBidAllowed,
    liquidityState,
    scarcityModifier,
    priorityNeedModifier,
    discretionaryBudget,
    minimumFutureFillReserve,
  });

  return {
    playerId: input.playerId,
    maxBid,
    rawValuation,
    liquidityAdjustedValue,
    legalMaxBid,
    nextBid: input.nextBid,
    nextBidAllowed,
    recommendation,
    priceRead,
    liquidityState,
    discretionaryBudget,
    minimumFutureFillReserve,
    replacementValueEstimate,
    scarcityModifier,
    priorityNeedModifier,
    affordabilityGuardrail: nextBidAllowed ? 'ok' : input.nextBid <= legalMaxBid ? 'warn' : 'blocked',
    reasonCodes,
  };
}

function estimateMinimumFutureFillReserve(
  input: LiquidityAwareBidInput,
  minSalary: number,
  openSlotsAfterWin: number,
): FutureFillReserve {
  const minSalaryReserve = openSlotsAfterWin * minSalary;
  const rosterShapes = input.rosterShapes ?? [];
  const candidateShape = input.candidateShape ?? null;
  const remainingPool = input.remainingPool ?? [];
  if (candidateShape && remainingPool.length >= openSlotsAfterWin) {
    const quote = cheapestLegalCompletion([...rosterShapes, candidateShape], remainingPool, openSlotsAfterWin);
    if (quote.feasible) {
      const incrementalTax = completionTaxForQuote(input.completionTaxContext, quote.pickIds);
      return {
        reserve: Math.max(minSalaryReserve, quote.cost) + incrementalTax,
        incrementalTax,
      };
    }
    return { reserve: Math.max(minSalaryReserve, conservativePoolReserve(remainingPool, openSlotsAfterWin)), incrementalTax: 0 };
  }
  if (remainingPool.length > 0) {
    return { reserve: Math.max(minSalaryReserve, conservativePoolReserve(remainingPool, openSlotsAfterWin)), incrementalTax: 0 };
  }
  return { reserve: minSalaryReserve, incrementalTax: 0 };
}

function completionTaxForQuote(
  context: LiquidityCompletionTaxContext | undefined,
  pickIds: readonly string[],
): number {
  if (!context || pickIds.length === 0) return 0;
  const completionPlayers: ConstructionPlayer[] = [];
  for (const id of pickIds) {
    const player = context.playerById.get(id);
    if (!player) return 0;
    completionPlayers.push(player);
  }
  const caps = context.capIdentity
    ? shiftLuxuryCaps([...context.baseCaps], context.capIdentity)
    : [...context.baseCaps];
  const currentTax = luxuryTax([...context.currentRosterWithCandidate], caps, 'taxed').charged;
  const completedTax = luxuryTax(
    [...context.currentRosterWithCandidate, ...completionPlayers],
    caps,
    'taxed',
  ).charged;
  return Math.max(0, completedTax - currentTax);
}

function estimateReplacementValue(input: LiquidityAwareBidInput): number {
  const pool = input.remainingPool ?? [];
  if (pool.length === 0) return 0;
  const values = pool
    .filter((candidate) => candidate.id !== input.playerId)
    .filter((candidate) => sameScarcityClass(candidate.shape, input.candidateShape ?? null))
    .map((candidate) => Math.max(0, candidate.value ?? candidate.price))
    .filter((value) => Number.isFinite(value));
  const usable = values.length > 0 ? values : pool.map((candidate) => Math.max(0, candidate.value ?? candidate.price));
  if (usable.length === 0) return 0;
  return percentile(usable, QUALITY_COMPLETION_TARGET_PERCENTILE);
}

function estimateScarcityModifier(input: LiquidityAwareBidInput, replacementValueEstimate: number): number {
  if ((input.remainingPool?.length ?? 0) === 0 || replacementValueEstimate <= 0 || input.iv <= 0) return 1;
  const replacementRatio = replacementValueEstimate / Math.max(1, input.iv);
  const pool = input.remainingPool ?? [];
  const similarCount = pool.filter((candidate) => (
    candidate.id !== input.playerId &&
    sameScarcityClass(candidate.shape, input.candidateShape ?? null) &&
    (candidate.value ?? candidate.price) >= input.iv * 0.85
  )).length;
  if (similarCount >= Math.min(3, Math.max(2, input.rosterSlotsRemaining - 1))) return 0.92;
  if (replacementRatio < 0.55) return 1.14;
  if (replacementRatio < 0.75) return 1.08;
  if (replacementRatio > 0.95 && similarCount > 0) return 0.95;
  return 1;
}

function resolveLiquidityState(
  input: LiquidityAwareBidInput,
  discretionaryBudget: number,
  minimumFutureFillReserve: number,
): LiquidityState {
  const openSlots = Math.max(0, input.rosterSlotsRemaining);
  if (openSlots <= 1 && discretionaryBudget > 0) return 'aggressive';
  if (input.budgetRemaining <= minimumFutureFillReserve + Math.max(input.nextBid, 0)) return 'emergency-fill';
  const rosterSize = Math.max(1, (input.rosterShapes?.length ?? 0) + openSlots);
  const openRatio = openSlots / rosterSize;
  const budgetRatio = discretionaryBudget / Math.max(1, input.budgetRemaining);
  if (openRatio > 0.45 && budgetRatio < 0.45) return 'constrained';
  if (openRatio <= 0.25 && discretionaryBudget > input.nextBid) return 'aggressive';
  return 'neutral';
}

function liquidityStateMultiplier(state: LiquidityState, input: LiquidityAwareBidInput): number {
  if (state === 'aggressive') return 1.08;
  if (state === 'neutral') return 1;
  if (state === 'emergency-fill') {
    return input.needMultiplier !== undefined && input.needMultiplier > 1 ? 0.96 : 0.78;
  }
  return 0.86;
}

function classifyPrice(nextBid: number, value: number, maxBid: number, legalMaxBid: number): LiquidityPriceRead {
  if (nextBid > maxBid || nextBid > legalMaxBid) return 'pass';
  if (value <= 0) return 'pass';
  const ratio = nextBid / value;
  if (ratio <= 0.82) return 'value';
  if (ratio <= 0.98) return 'fair';
  return 'stretch';
}

function buildReasonCodes(input: {
  input: LiquidityAwareBidInput;
  legalMaxBid: number;
  maxBid: number;
  nextBidAllowed: boolean;
  liquidityState: LiquidityState;
  scarcityModifier: number;
  priorityNeedModifier: number;
  discretionaryBudget: number;
  minimumFutureFillReserve: number;
}): LiquidityReasonCode[] {
  const reasons = new Set<LiquidityReasonCode>();
  if (input.input.nextBid > input.input.budgetRemaining) reasons.add('above-remaining-budget');
  if (input.input.nextBid > input.legalMaxBid) reasons.add('above-legal-ceiling');
  if (input.input.currentBid != null && input.input.nextBid <= input.input.currentBid) reasons.add('below-minimum-bid');
  if (input.input.nextBid > input.maxBid) reasons.add('future-fill-protected');
  if (input.liquidityState === 'aggressive') reasons.add('near-complete');
  if (input.liquidityState === 'constrained') reasons.add('liquidity-constrained');
  if (input.liquidityState === 'emergency-fill') reasons.add('emergency-fill');
  if (input.scarcityModifier > 1.02) reasons.add('scarce-replacement');
  if (input.scarcityModifier < 0.98) reasons.add('similar-replacements');
  if (input.priorityNeedModifier > 1.02) reasons.add('priority-fit');
  if (input.discretionaryBudget > input.minimumFutureFillReserve && input.input.rosterSlotsRemaining <= 3) {
    reasons.add('late-budget-surplus');
  }
  if (input.nextBidAllowed) reasons.add('within-liquidity-ceiling');
  return [...reasons].sort(compareReasonPriority);
}

/**
 * CALLFIX (2026-07-08) Item 2: explicit reason-priority order for the Tier-1 "one reason" chip
 * (WhisperPanel.tsx topReason = reasonCodes[0]). The OLD `[...reasons].sort()` ordered codes
 * ALPHABETICALLY -- an accident of spelling, not priority (e.g. 'above-legal-ceiling' only beat
 * 'emergency-fill' because 'a' < 'e'). This mirrors the hand-ordered Set insertion order in
 * buildReasonCodes below (which already encoded the intended severity), promoted to an explicit,
 * directly-testable table: hard ceiling blockers > liquidity emergencies > scarcity > fit/need >
 * everything informational/mechanical.
 */
export const REASON_PRIORITY: readonly LiquidityReasonCode[] = [
  // Hard blockers: which ceiling stopped this bid.
  'above-legal-ceiling',
  'above-remaining-budget',
  'future-fill-protected',
  // Liquidity emergencies: the seat's overall cash/slot state.
  'emergency-fill',
  'liquidity-constrained',
  // Scarcity: how replaceable this candidate is.
  'scarce-replacement',
  // Fit/need: this candidate's fit for a roster gap.
  'priority-fit',
  // Informational / mechanical: everything else.
  'within-liquidity-ceiling',
  'late-budget-surplus',
  'below-minimum-bid',
  'near-complete',
  'similar-replacements',
];

function reasonPriorityIndex(code: LiquidityReasonCode): number {
  const index = REASON_PRIORITY.indexOf(code);
  return index === -1 ? REASON_PRIORITY.length : index;
}

/** Unknown codes (not yet added to REASON_PRIORITY) sort last; Array.prototype.sort's spec-guaranteed
 * stability keeps ties (including any future/unclassified codes) in their original insertion order. */
function compareReasonPriority(a: LiquidityReasonCode, b: LiquidityReasonCode): number {
  return reasonPriorityIndex(a) - reasonPriorityIndex(b);
}

function sameScarcityClass(left: RosterSlotPlayer | undefined, right: RosterSlotPlayer | null): boolean {
  if (!left || !right) return true;
  if (left.isPitcher || right.isPitcher) {
    return left.isPitcher === right.isPitcher && left.role === right.role;
  }
  return left.position === right.position;
}

function percentile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * clamp(p, 0, 1))));
  return sorted[index];
}

function roundDownToIncrement(value: number, increment: number | undefined): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const step = finitePositive(increment) ? increment! : 1;
  return Math.floor(value / step) * step;
}

function finitePositive(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
