import type { LeagueBuilderMlbDraftSession, SnakeDraftTradeRecord } from '../utils/leagueBuilderStorage';
import {
  validateTrade,
  type PickValue,
} from './leagueConstruction';
import {
  proveSimultaneousSnakeSeating,
  type SnakeSeatingProof,
  type SimultaneousSnakeSeatingInput,
} from './snakeSeatingProof';
import { withLatestSnakeCorrection } from './snakeSession';

export interface SnakeGuidePackage {
  buyerTeamId: string;
  sellerTeamId: string;
  targetPick: number;
  offerPickNumbers: number[];
  receivePickNumbers: number[];
  offerValue: number;
  receiveValue: number;
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

export function primeSnakeGuideSeatingProof(input: SimultaneousSnakeSeatingInput): SnakeSeatingProof {
  const cached = seatingProofCache.get(input);
  if (cached) return cached;
  const proof = proveSimultaneousSnakeSeating(input);
  seatingProofCache.set(input, proof);
  return proof;
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
  const candidates: Array<SnakeGuidePackage & { imbalance: number }> = [];

  for (let count = 1; count <= 3; count += 1) {
    for (const offerPickNumbers of combinations(buyerPicks, count)) {
      for (const returnExtras of combinations(sellerReturns, count - 1)) {
        const receivePickNumbers = [input.targetPick, ...returnExtras].sort((left, right) => left - right);
        const verdict = validateTrade(
          offerPickNumbers.map((pick) => ({ pick })),
          receivePickNumbers.map((pick) => ({ pick })),
          [...input.pickValueChart],
        );
        if (!verdict.balanced) continue;
        const proposedSession = swapOwnership(input.session, {
          buyerTeamId: input.buyerTeamId,
          sellerTeamId,
          offerPickNumbers,
          receivePickNumbers,
        });
        if (!proveSimultaneousSnakeSeating(input.seatingProofInput).feasible) continue;
        candidates.push({
          buyerTeamId: input.buyerTeamId,
          sellerTeamId,
          targetPick: input.targetPick,
          offerPickNumbers,
          receivePickNumbers,
          offerValue: packageValue(offerPickNumbers, values),
          receiveValue: packageValue(receivePickNumbers, values),
          sessionRevision: input.session.revision ?? 0,
          imbalance: verdict.imbalancePct,
        });
      }
    }
  }

  const best = candidates.sort((left, right) => (
    left.offerPickNumbers.length - right.offerPickNumbers.length
    || left.imbalance - right.imbalance
    || left.offerPickNumbers.join(',').localeCompare(right.offerPickNumbers.join(','))
    || left.receivePickNumbers.join(',').localeCompare(right.receivePickNumbers.join(','))
  ))[0];
  if (!best) return { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
  const { imbalance: _discarded, ...tradePackage } = best;
  return {
    package: tradePackage,
    message: `OFFER ${tradePackage.offerPickNumbers.join('+')}; RECEIVE ${tradePackage.receivePickNumbers.join('+')} — guide-matched and legal now.`,
  };
}

function packageLex(left: readonly number[], right: readonly number[]): number {
  return left.join(',').localeCompare(right.join(','));
}

function closestReceivePackages(input: {
  rows: readonly { picks: number[]; value: number }[];
  offerValue: number;
}): Array<{ picks: number[]; value: number }> {
  if (input.rows.length === 0) return [];
  let low = 0;
  let high = input.rows.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (input.rows[middle].value < input.offerValue) low = middle + 1;
    else high = middle;
  }
  const values = new Set<number>();
  if (low < input.rows.length) values.add(input.rows[low].value);
  if (low > 0) values.add(input.rows[low - 1].value);
  return [...values].flatMap((value) => (
    input.rows.filter((row) => row.value === value).sort((left, right) => packageLex(left.picks, right.picks))[0] ?? []
  ));
}

/**
 * Exact posted-price search. For a fixed offer value, imbalance is monotonic on either side of
 * that value, so only the nearest receive total below and above can win. This prunes the old
 * Cartesian product without changing its length/imbalance/lexicographic winner rules.
 */
export function searchSnakeGuidePackage(input: SearchSnakeGuidePackageInput): SnakeGuideSearchResult {
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
  const candidates: Array<SnakeGuidePackage & { imbalance: number }> = [];

  for (let count = 1; count <= 3; count += 1) {
    const receives = combinations(sellerReturns, count - 1)
      .map((returnExtras) => {
        const picks = [input.targetPick, ...returnExtras].sort((left, right) => left - right);
        return { picks, value: packageValue(picks, values) };
      })
      .sort((left, right) => left.value - right.value || packageLex(left.picks, right.picks));
    for (const offerPickNumbers of combinations(buyerPicks, count)) {
      const offerValue = packageValue(offerPickNumbers, values);
      for (const receive of closestReceivePackages({ rows: receives, offerValue })) {
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
        });
      }
    }
    if (candidates.length > 0) break;
  }

  const best = candidates.sort((left, right) => (
    left.offerPickNumbers.length - right.offerPickNumbers.length
    || left.imbalance - right.imbalance
    || packageLex(left.offerPickNumbers, right.offerPickNumbers)
    || packageLex(left.receivePickNumbers, right.receivePickNumbers)
  ))[0];
  if (!best || !primeSnakeGuideSeatingProof(input.seatingProofInput).feasible) {
    return { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
  }
  const { imbalance: _discarded, ...tradePackage } = best;
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

export function revalidateSnakeGuidePackage(input: SnakeGuideCommonInput & {
  proposal: SnakeGuidePackage;
}): RevalidateSnakeGuideResult {
  if ((input.session.revision ?? 0) !== input.proposal.sessionRevision) {
    return { valid: false, message: 'The draft moved on — refresh.', guideMatched: false, proposedSession: null };
  }
  if (input.proposal.offerPickNumbers.length !== input.proposal.receivePickNumbers.length) {
    return { valid: false, message: 'Both clubs must keep the same number of turns.', guideMatched: false, proposedSession: null };
  }
  const buyerOwned = new Set(futureOwnedPicks(input.session, input.proposal.buyerTeamId));
  const sellerOwned = new Set(futureOwnedPicks(input.session, input.proposal.sellerTeamId));
  if (input.proposal.offerPickNumbers.some((pick) => !buyerOwned.has(pick))
    || input.proposal.receivePickNumbers.some((pick) => !sellerOwned.has(pick))) {
    return { valid: false, message: 'The draft moved on — refresh.', guideMatched: false, proposedSession: null };
  }
  const verdict = validateTrade(
    input.proposal.offerPickNumbers.map((pick) => ({ pick })),
    input.proposal.receivePickNumbers.map((pick) => ({ pick })),
    [...input.pickValueChart],
  );
  if (!verdict.balanced) {
    return { valid: false, message: 'This package no longer matches the posted guide.', guideMatched: false, proposedSession: null };
  }
  const proposedSession = swapOwnership(input.session, input.proposal);
  if (!proveSimultaneousSnakeSeating(input.seatingProofInput).feasible) {
    return { valid: false, message: 'The package would leave a club without a legal finish.', guideMatched: true, proposedSession: null };
  }
  return { valid: true, message: 'Guide-matched and legal now.', guideMatched: true, proposedSession };
}

export function executeSnakeGuidePackage(input: SnakeGuideCommonInput & {
  proposal: SnakeGuidePackage;
}): RevalidateSnakeGuideResult {
  const checked = revalidateSnakeGuidePackage(input);
  if (!checked.valid || !checked.proposedSession || !checked.guideMatched) return checked;
  const base = withLatestSnakeCorrection(input.session, 'trade');
  const owned = swapOwnership(base, input.proposal);
  const trade: SnakeDraftTradeRecord = {
    id: `snake-guide-${input.session.revision ?? 0}-${(input.session.trades?.length ?? 0) + 1}`,
    atPickIndex: input.session.currentPickIndex,
    humanTeamId: input.proposal.buyerTeamId,
    cpuTeamId: input.proposal.sellerTeamId,
    humanPickNumbers: [...input.proposal.offerPickNumbers],
    cpuPickNumbers: [...input.proposal.receivePickNumbers],
    humanValue: input.proposal.offerValue,
    cpuValue: input.proposal.receiveValue,
    greedMargin: 0,
  };
  return {
    ...checked,
    proposedSession: {
      ...owned,
      trades: [...(input.session.trades ?? []), trade],
      revision: (input.session.revision ?? 0) + 1,
    },
  };
}
