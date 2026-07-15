import type {
  LeagueBuilderMlbDraftSession,
  SnakeDraftTradeRecord,
} from '../utils/leagueBuilderStorage';
import { FARM_SNAKE_SESSION_NUMBER } from '../utils/snakeFarmTransitionContract';
import {
  validateTrade,
  type PickValue,
} from './leagueConstruction';
import {
  proveSimultaneousSnakeSeating,
  validateSnakeSeatingProof,
  type SnakeSeatingProof,
  type SimultaneousSnakeSeatingInput,
} from './snakeSeatingProof';
import { withLatestSnakeCorrection } from './snakeCorrection';

export interface SnakeGuidePackage {
  buyerTeamId: string;
  sellerTeamId: string;
  targetPick: number;
  offerPickNumbers: number[];
  receivePickNumbers: number[];
  offerValue: number;
  receiveValue: number;
  sellerPremium: number;
  sessionRevision: number;
}

export interface SnakeGuideSearchResult {
  package: SnakeGuidePackage | null;
  message: string;
}

interface SnakeGuideCommonInput {
  session: LeagueBuilderMlbDraftSession;
  pickValueChart: readonly PickValue[];
  /** W3's current mid-draft public state; every searched/revalidated package runs this proof. */
  seatingProofInput: SimultaneousSnakeSeatingInput;
}

const seatingProofCache = new WeakMap<SimultaneousSnakeSeatingInput, SnakeSeatingProof>();

function assertMlbGuideSession(session: LeagueBuilderMlbDraftSession): void {
  if (
    session.seasonNumber === FARM_SNAKE_SESSION_NUMBER
    || session.draftPhase === 'FARM'
    || session.draftManifest?.phase === 'FARM'
  ) throw new Error('FARM snake sessions do not allow pick trades.');
}

export function primeSnakeGuideSeatingProof(input: SimultaneousSnakeSeatingInput): SnakeSeatingProof {
  const cached = seatingProofCache.get(input);
  if (cached) return cached;
  const proof = proveSimultaneousSnakeSeating(input);
  seatingProofCache.set(input, proof);
  return proof;
}

/** Accept a durable room certificate only after the same lightweight integrity verification. */
export function seedSnakeGuideSeatingProof(
  input: SimultaneousSnakeSeatingInput,
  proof: SnakeSeatingProof,
): boolean {
  if (!validateSnakeSeatingProof(input, proof)) return false;
  seatingProofCache.set(input, proof);
  return true;
}

export interface SearchSnakeGuidePackageInput extends SnakeGuideCommonInput {
  buyerTeamId: string;
  targetPick: number;
}

function combinations(values: readonly number[], count: number): number[][] {
  const out: number[][] = [];
  const walk = (start: number, picked: number[]) => {
    if (picked.length === count) {
      out.push(picked);
      return;
    }
    for (let index = start; index < values.length; index += 1) {
      walk(index + 1, [...picked, values[index]]);
    }
  };
  walk(0, []);
  return out;
}

function valueMap(chart: readonly PickValue[]): Map<number, number> {
  return new Map(chart.map((row) => [row.pick, row.value]));
}

function packageValue(picks: readonly number[], values: ReadonlyMap<number, number>): number {
  return picks.reduce((sum, pick) => {
    const value = values.get(pick);
    if (value === undefined) throw new Error(`Pick ${pick} is outside this draft.`);
    return sum + value;
  }, 0);
}

type SnakeGuideCandidate = SnakeGuidePackage & { imbalance: number };

function toGuidePackage(candidate: SnakeGuideCandidate): SnakeGuidePackage {
  return {
    buyerTeamId: candidate.buyerTeamId,
    sellerTeamId: candidate.sellerTeamId,
    targetPick: candidate.targetPick,
    offerPickNumbers: candidate.offerPickNumbers,
    receivePickNumbers: candidate.receivePickNumbers,
    offerValue: candidate.offerValue,
    receiveValue: candidate.receiveValue,
    sellerPremium: candidate.sellerPremium,
    sessionRevision: candidate.sessionRevision,
  };
}

function compareGuideCandidates(left: SnakeGuideCandidate, right: SnakeGuideCandidate): number {
  return left.sellerPremium - right.sellerPremium
    || left.imbalance - right.imbalance
    || left.offerPickNumbers.length - right.offerPickNumbers.length
    || packageLex(left.offerPickNumbers, right.offerPickNumbers)
    || packageLex(left.receivePickNumbers, right.receivePickNumbers);
}

function swapOwnership(
  session: LeagueBuilderMlbDraftSession,
  proposal: Pick<SnakeGuidePackage, 'buyerTeamId' | 'sellerTeamId' | 'offerPickNumbers' | 'receivePickNumbers'>,
): LeagueBuilderMlbDraftSession {
  const offered = new Set(proposal.offerPickNumbers);
  const received = new Set(proposal.receivePickNumbers);
  return {
    ...session,
    pickOrder: session.pickOrder.map((slot) => {
      if (offered.has(slot.pick)) return { ...slot, teamId: proposal.sellerTeamId };
      if (received.has(slot.pick)) return { ...slot, teamId: proposal.buyerTeamId };
      return slot;
    }),
  };
}

function futureOwnedPicks(session: LeagueBuilderMlbDraftSession, teamId: string): number[] {
  return session.pickOrder
    .slice(session.currentPickIndex)
    .filter((slot) => slot.teamId === teamId)
    .map((slot) => slot.pick)
    .sort((left, right) => left - right);
}

/**
 * Human guide search adapted from executeSnakePickTrade's ownership/count/turn skeleton. CPU greed
 * and decision-value layers are intentionally absent. Equal pick counts preserve snake geometry;
 * balancing return picks are searched explicitly and every candidate package is rechecked by W3.
 */
export function searchSnakeGuidePackageBruteForce(input: SearchSnakeGuidePackageInput): SnakeGuideSearchResult {
  assertMlbGuideSession(input.session);
  const targetSlot = input.session.pickOrder
    .slice(input.session.currentPickIndex)
    .find((slot) => slot.pick === input.targetPick);
  if (!targetSlot || targetSlot.teamId === input.buyerTeamId) {
    return { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
  }
  const sellerTeamId = targetSlot.teamId;
  const buyerPicks = futureOwnedPicks(input.session, input.buyerTeamId);
  const sellerReturns = futureOwnedPicks(input.session, sellerTeamId).filter((pick) => pick !== input.targetPick);
  const values = valueMap(input.pickValueChart);
  const candidates: SnakeGuideCandidate[] = [];

  if (!primeSnakeGuideSeatingProof(input.seatingProofInput).feasible) {
    return { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
  }

  for (let count = 1; count <= 3; count += 1) {
    for (const offerPickNumbers of combinations(buyerPicks, count)) {
      for (const returnExtras of combinations(sellerReturns, count - 1)) {
        const receivePickNumbers = [input.targetPick, ...returnExtras].sort((left, right) => left - right);
        const offerValue = packageValue(offerPickNumbers, values);
        const receiveValue = packageValue(receivePickNumbers, values);
        if (offerValue < receiveValue) continue;
        const verdict = validateTrade(
          offerPickNumbers.map((pick) => ({ pick })),
          receivePickNumbers.map((pick) => ({ pick })),
          [...input.pickValueChart],
        );
        if (!verdict.balanced) continue;
        candidates.push({
          buyerTeamId: input.buyerTeamId,
          sellerTeamId,
          targetPick: input.targetPick,
          offerPickNumbers,
          receivePickNumbers,
          offerValue,
          receiveValue,
          sessionRevision: input.session.revision ?? 0,
          imbalance: verdict.imbalancePct,
          sellerPremium: offerValue - receiveValue,
        });
      }
    }
  }

  const best = candidates.sort(compareGuideCandidates)[0];
  if (!best) return { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
  const tradePackage = toGuidePackage(best);
  return {
    package: tradePackage,
    message: `OFFER ${tradePackage.offerPickNumbers.join('+')}; RECEIVE ${tradePackage.receivePickNumbers.join('+')} — guide-matched and legal now.`,
  };
}

function packageLex(left: readonly number[], right: readonly number[]): number {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function closestSellerProtectedReceivePackages(input: {
  rows: readonly { picks: number[]; value: number }[];
  offerValue: number;
}): Array<{ picks: number[]; value: number }> {
  if (input.rows.length === 0) return [];
  let low = 0;
  let high = input.rows.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (input.rows[middle].value <= input.offerValue) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return [];
  const value = input.rows[low - 1].value;
  const best = input.rows
    .filter((row) => row.value === value)
    .sort((left, right) => packageLex(left.picks, right.picks))[0];
  return best ? [best] : [];
}

/**
 * Exact posted-price search. Seller protection removes receive totals above the buyer's offer;
 * among the survivors, only the nearest receive total can minimize the raw seller premium. This
 * prunes the Cartesian product without changing the premium/imbalance/complexity/lexicographic
 * winner rules shared with the brute-force oracle.
 */
export function searchSnakeGuidePackage(input: SearchSnakeGuidePackageInput): SnakeGuideSearchResult {
  assertMlbGuideSession(input.session);
  const targetSlot = input.session.pickOrder
    .slice(input.session.currentPickIndex)
    .find((slot) => slot.pick === input.targetPick);
  if (!targetSlot || targetSlot.teamId === input.buyerTeamId) {
    return { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
  }
  const sellerTeamId = targetSlot.teamId;
  const buyerPicks = futureOwnedPicks(input.session, input.buyerTeamId);
  const sellerReturns = futureOwnedPicks(input.session, sellerTeamId).filter((pick) => pick !== input.targetPick);
  const values = valueMap(input.pickValueChart);
  const candidates: SnakeGuideCandidate[] = [];

  if (!primeSnakeGuideSeatingProof(input.seatingProofInput).feasible) {
    return { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
  }

  for (let count = 1; count <= 3; count += 1) {
    const receives = combinations(sellerReturns, count - 1)
      .map((returnExtras) => {
        const picks = [input.targetPick, ...returnExtras].sort((left, right) => left - right);
        return { picks, value: packageValue(picks, values) };
      })
      .sort((left, right) => left.value - right.value || packageLex(left.picks, right.picks));
    for (const offerPickNumbers of combinations(buyerPicks, count)) {
      const offerValue = packageValue(offerPickNumbers, values);
      for (const receive of closestSellerProtectedReceivePackages({ rows: receives, offerValue })) {
        const verdict = validateTrade(
          offerPickNumbers.map((pick) => ({ pick })),
          receive.picks.map((pick) => ({ pick })),
          [...input.pickValueChart],
        );
        if (!verdict.balanced) continue;
        candidates.push({
          buyerTeamId: input.buyerTeamId,
          sellerTeamId,
          targetPick: input.targetPick,
          offerPickNumbers,
          receivePickNumbers: receive.picks,
          offerValue,
          receiveValue: receive.value,
          sessionRevision: input.session.revision ?? 0,
          imbalance: verdict.imbalancePct,
          sellerPremium: offerValue - receive.value,
        });
      }
    }
  }

  const best = candidates.sort(compareGuideCandidates)[0];
  if (!best) {
    return { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
  }
  const tradePackage = toGuidePackage(best);
  return {
    package: tradePackage,
    message: `OFFER ${tradePackage.offerPickNumbers.join('+')}; RECEIVE ${tradePackage.receivePickNumbers.join('+')} — guide-matched and legal now.`,
  };
}

export interface RevalidateSnakeGuideResult {
  valid: boolean;
  message: string;
  guideMatched: boolean;
  proposedSession: LeagueBuilderMlbDraftSession | null;
}

type RevalidateSnakeGuideSnapshotResult = RevalidateSnakeGuideResult & {
  canonicalValues?: Readonly<{ offer: number; receive: number }>;
};

type RevalidateSnakeGuideInput = SnakeGuideCommonInput & {
  proposal: SnakeGuidePackage;
};

function snapshotSnakeGuidePackage(proposal: SnakeGuidePackage): SnakeGuidePackage | null {
  try {
    const buyerTeamId = proposal.buyerTeamId;
    const sellerTeamId = proposal.sellerTeamId;
    const targetPick = proposal.targetPick;
    const offerSource = proposal.offerPickNumbers;
    const receiveSource = proposal.receivePickNumbers;
    const offerValue = proposal.offerValue;
    const receiveValue = proposal.receiveValue;
    const sellerPremium = proposal.sellerPremium;
    const sessionRevision = proposal.sessionRevision;
    if (!Array.isArray(offerSource) || !Array.isArray(receiveSource)
      || !Number.isFinite(sellerPremium)) return null;
    const offerPickNumbers = Object.freeze([...offerSource]) as unknown as number[];
    const receivePickNumbers = Object.freeze([...receiveSource]) as unknown as number[];
    return Object.freeze({
      buyerTeamId,
      sellerTeamId,
      targetPick,
      offerPickNumbers,
      receivePickNumbers,
      offerValue,
      receiveValue,
      sellerPremium,
      sessionRevision,
    });
  } catch {
    return null;
  }
}

function snapshotSnakeGuideInput(input: RevalidateSnakeGuideInput): RevalidateSnakeGuideInput | null {
  try {
    const session = input.session;
    const pickValueChart = input.pickValueChart;
    const seatingProofInput = input.seatingProofInput;
    const proposal = snapshotSnakeGuidePackage(input.proposal);
    if (!proposal) return null;
    return Object.freeze({ session, pickValueChart, seatingProofInput, proposal });
  } catch {
    return null;
  }
}

function invalidGuidePackage(message: string, guideMatched = false): RevalidateSnakeGuideResult {
  return { valid: false, message, guideMatched, proposedSession: null };
}

function revalidateSnakeGuidePackageSnapshot(input: RevalidateSnakeGuideInput): RevalidateSnakeGuideSnapshotResult {
  const { proposal } = input;
  if ((input.session.revision ?? 0) !== proposal.sessionRevision) {
    return { valid: false, message: 'The draft moved on — refresh.', guideMatched: false, proposedSession: null };
  }
  if (proposal.buyerTeamId === proposal.sellerTeamId) {
    return { valid: false, message: 'A trade needs two different clubs.', guideMatched: false, proposedSession: null };
  }
  const offerSet = new Set(proposal.offerPickNumbers);
  const receiveSet = new Set(proposal.receivePickNumbers);
  if (offerSet.size === 0
    || offerSet.size > 3
    || offerSet.size !== proposal.offerPickNumbers.length
    || receiveSet.size !== proposal.receivePickNumbers.length
    || offerSet.size !== receiveSet.size) {
    return { valid: false, message: 'Both clubs must keep the same number of turns.', guideMatched: false, proposedSession: null };
  }
  if ([...offerSet].some((pick) => receiveSet.has(pick))) {
    return { valid: false, message: 'A pick cannot appear on both sides.', guideMatched: false, proposedSession: null };
  }
  if (!receiveSet.has(proposal.targetPick)) {
    return { valid: false, message: 'The requested target pick is not in this package.', guideMatched: false, proposedSession: null };
  }
  const targetSlots = input.session.pickOrder
    .slice(input.session.currentPickIndex)
    .filter((slot) => slot.pick === proposal.targetPick);
  if (targetSlots.length !== 1 || targetSlots[0].teamId !== proposal.sellerTeamId) {
    return { valid: false, message: 'The draft moved on — refresh.', guideMatched: false, proposedSession: null };
  }
  const buyerOwned = new Set(futureOwnedPicks(input.session, proposal.buyerTeamId));
  const sellerOwned = new Set(futureOwnedPicks(input.session, proposal.sellerTeamId));
  if (proposal.offerPickNumbers.some((pick) => !buyerOwned.has(pick))
    || proposal.receivePickNumbers.some((pick) => !sellerOwned.has(pick))) {
    return { valid: false, message: 'The draft moved on — refresh.', guideMatched: false, proposedSession: null };
  }
  const values = valueMap(input.pickValueChart);
  let offerValue: number;
  let receiveValue: number;
  try {
    offerValue = packageValue(proposal.offerPickNumbers, values);
    receiveValue = packageValue(proposal.receivePickNumbers, values);
  } catch {
    return { valid: false, message: 'This package no longer matches the posted guide.', guideMatched: false, proposedSession: null };
  }
  const sellerPremium = offerValue - receiveValue;
  if (offerValue !== proposal.offerValue
    || receiveValue !== proposal.receiveValue
    || sellerPremium !== proposal.sellerPremium) {
    return { valid: false, message: 'This package no longer matches the posted guide.', guideMatched: false, proposedSession: null };
  }
  const verdict = validateTrade(
    proposal.offerPickNumbers.map((pick) => ({ pick })),
    proposal.receivePickNumbers.map((pick) => ({ pick })),
    [...input.pickValueChart],
  );
  if (!verdict.balanced || offerValue < receiveValue) {
    return { valid: false, message: 'This package no longer matches the posted guide.', guideMatched: false, proposedSession: null };
  }
  const proposedSession = swapOwnership(input.session, proposal);
  if (!primeSnakeGuideSeatingProof(input.seatingProofInput).feasible) {
    return { valid: false, message: 'The package would leave a club without a legal finish.', guideMatched: true, proposedSession: null };
  }
  return {
    valid: true,
    message: 'Guide-matched and legal now.',
    guideMatched: true,
    proposedSession,
    canonicalValues: Object.freeze({ offer: offerValue, receive: receiveValue }),
  };
}

export function revalidateSnakeGuidePackage(input: RevalidateSnakeGuideInput): RevalidateSnakeGuideResult {
  assertMlbGuideSession(input.session);
  const snapshot = snapshotSnakeGuideInput(input);
  if (!snapshot) return invalidGuidePackage('This package no longer matches the posted guide.');
  const checked = revalidateSnakeGuidePackageSnapshot(snapshot);
  return {
    valid: checked.valid,
    message: checked.message,
    guideMatched: checked.guideMatched,
    proposedSession: checked.proposedSession,
  };
}

export function executeSnakeGuidePackage(input: RevalidateSnakeGuideInput): RevalidateSnakeGuideResult {
  assertMlbGuideSession(input.session);
  const snapshot = snapshotSnakeGuideInput(input);
  if (!snapshot) return invalidGuidePackage('This package no longer matches the posted guide.');
  const { proposal, session } = snapshot;
  const checked = revalidateSnakeGuidePackageSnapshot(snapshot);
  if (!checked.valid || !checked.proposedSession || !checked.guideMatched || !checked.canonicalValues) return checked;
  const base = withLatestSnakeCorrection(session, 'trade');
  const owned = { ...base, pickOrder: checked.proposedSession.pickOrder };
  const trade: SnakeDraftTradeRecord = {
    id: `snake-guide-${session.revision ?? 0}-${(session.trades?.length ?? 0) + 1}`,
    atPickIndex: session.currentPickIndex,
    humanTeamId: proposal.buyerTeamId,
    cpuTeamId: proposal.sellerTeamId,
    humanPickNumbers: [...proposal.offerPickNumbers],
    cpuPickNumbers: [...proposal.receivePickNumbers],
    humanValue: checked.canonicalValues.offer,
    cpuValue: checked.canonicalValues.receive,
    greedMargin: 0,
  };
  return {
    valid: checked.valid,
    message: checked.message,
    guideMatched: checked.guideMatched,
    proposedSession: {
      ...owned,
      trades: [...(session.trades ?? []), trade],
      openTradeOffers: [],
      revision: (session.revision ?? 0) + 1,
    },
  };
}
