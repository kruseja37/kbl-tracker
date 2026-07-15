import {
  LEGAL_ROSTER,
  canCover,
  canRelieve,
  canStart,
  isCloser,
  isLegalRoster,
  type FieldPosition,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';
import type { LuxuryCapRow } from '../data/tierParams';
import { snakeLuxuryCaps, snakePlayerTaxPressure } from './snakeLuxuryTax';
import { cheapestLegalCompletion, type CompletionCandidate } from './auctionCompletionFloor';
import {
  luxuryTax,
  shiftLuxuryCaps,
  type TeamCapIdentity,
} from './leagueConstruction';
import type { SnakeSeatingPlayer } from './snakeSeatingProof';
import { deriveVersionGroupId } from './snakeVersioning';
import { snakeMoneyNonnegative } from './snakeMoney';

export {
  SNAKE_MONEY_EPSILON,
  snakeMoneyAffordable,
  snakeMoneyNonnegative,
  snakeMoneyOverage,
  snakeMoneyRemaining,
} from './snakeMoney';

export interface SnakePlanBill {
  planCost: number;
  planTax: number;
  planCushion: number;
  playerIds: string[];
}

export interface SnakeLegalFinishBill {
  feasible: boolean;
  completionPlayerIds: readonly string[];
  completionCost: number;
  completionTax: number;
  legalFinishCushion: number;
  /** BLOCKED is emitted only after exhaustive exact search; OPEN is never a hard money gate. */
  affordability: 'AFFORDABLE' | 'BLOCKED' | 'OPEN';
}

export interface SnakePlanInput {
  boardPlayerIds: readonly string[];
  players: readonly SnakeSeatingPlayer[];
  budget: number;
  baseCaps: readonly LuxuryCapRow[];
  realTeamCount: number;
  capIdentity?: TeamCapIdentity;
}

function shiftedCaps(input: {
  baseCaps: readonly LuxuryCapRow[];
  realTeamCount: number;
  capIdentity?: TeamCapIdentity;
}): LuxuryCapRow[] {
  const normalized = snakeLuxuryCaps([...input.baseCaps]);
  return input.capIdentity ? shiftLuxuryCaps(normalized, input.capIdentity) : normalized;
}

/** BILL 1: membership only. Slot keys/order never enter this function. */
export function evaluateSnakePlan(input: SnakePlanInput): SnakePlanBill {
  if (input.boardPlayerIds.length !== LEGAL_ROSTER.size) {
    throw new Error('PLAN COST needs exactly 22 board player IDs.');
  }
  if (new Set(input.boardPlayerIds).size !== input.boardPlayerIds.length) {
    throw new Error('PLAN COST needs 22 unique player IDs.');
  }
  const byId = new Map(input.players.map((player) => [player.playerId, player]));
  const planned = input.boardPlayerIds.map((playerId) => {
    const player = byId.get(playerId);
    if (!player) throw new Error(`Board player "${playerId}" is not in the supplied player set.`);
    return player;
  });
  if (new Set(planned.map(deriveVersionGroupId)).size !== planned.length) {
    throw new Error('PLAN COST cannot count two cards of the same human as two roster seats.');
  }
  if (!isLegalRoster(planned.map((player) => player.shape))) {
    throw new Error('PLAN COST needs a canonically legal 22-player roster.');
  }
  const planCost = planned.reduce((sum, player) => sum + player.price, 0);
  const planTax = luxuryTax(
    planned.map((player) => player.construction),
    shiftedCaps(input),
    'taxed',
  ).charged;
  return {
    planCost,
    planTax,
    planCushion: input.budget - planCost - planTax,
    playerIds: [...input.boardPlayerIds],
  };
}

export interface SnakeLegalFinishInput {
  currentRoster: readonly SnakeSeatingPlayer[];
  committedSpent: number;
  availablePool: readonly SnakeSeatingPlayer[];
  budget: number;
  baseCaps: readonly LuxuryCapRow[];
  realTeamCount: number;
  capIdentity?: TeamCapIdentity;
}

function humanRepresentatives(
  players: readonly SnakeSeatingPlayer[],
  effectivePrice: (player: SnakeSeatingPlayer) => number,
): SnakeSeatingPlayer[] {
  const byGroup = new Map<string, SnakeSeatingPlayer>();
  for (const player of [...players].sort((left, right) => (
    effectivePrice(left) - effectivePrice(right)
    || left.price - right.price
    || left.playerId.localeCompare(right.playerId)
  ))) {
    const groupId = deriveVersionGroupId(player);
    if (!byGroup.has(groupId)) byGroup.set(groupId, player);
  }
  return [...byGroup.values()];
}

function infeasibleLegalFinish(): SnakeLegalFinishBill {
  return {
    feasible: false,
    completionPlayerIds: [],
    completionCost: 0,
    completionTax: Number.POSITIVE_INFINITY,
    legalFinishCushion: Number.NEGATIVE_INFINITY,
    affordability: 'BLOCKED',
  };
}

function compareLegalFinishes(left: SnakeLegalFinishBill, right: SnakeLegalFinishBill): number {
  return right.legalFinishCushion - left.legalFinishCushion
    || left.completionCost - right.completionCost
    || left.completionPlayerIds.join('|').localeCompare(right.completionPlayerIds.join('|'));
}

type ExactSuffixStats = {
  hitters: number;
  pitchers: number;
  starters: number;
  relievers: number;
  closers: number;
  catcherCoverers: number;
  primaries: Record<FieldPosition, number>;
};

function emptyExactSuffixStats(): ExactSuffixStats {
  return {
    hitters: 0,
    pitchers: 0,
    starters: 0,
    relievers: 0,
    closers: 0,
    catcherCoverers: 0,
    primaries: Object.fromEntries(
      LEGAL_ROSTER.fieldPositions.map((position) => [position, 0]),
    ) as Record<FieldPosition, number>,
  };
}

function exactGlobalLegalFinish(input: {
  seed: SnakeLegalFinishBill;
  currentRoster: readonly SnakeSeatingPlayer[];
  available: readonly SnakeSeatingPlayer[];
  caps: readonly LuxuryCapRow[];
  currentTax: number;
  committedSpent: number;
  budget: number;
}): SnakeLegalFinishBill {
  const candidates = [...input.available].sort((left, right) => (
    left.price - right.price || left.playerId.localeCompare(right.playerId)
  ));
  const availableById = new Map(candidates.map((player) => [player.playerId, player]));
  const seedCompletion = input.seed.completionPlayerIds
    .map((playerId) => availableById.get(playerId))
    .filter((player): player is SnakeSeatingPlayer => Boolean(player));
  if (seedCompletion.length !== input.seed.completionPlayerIds.length) return input.seed;
  const openSlots = LEGAL_ROSTER.size - input.currentRoster.length;
  if (seedCompletion.length !== openSlots) return input.seed;

  const bill = (players: readonly SnakeSeatingPlayer[]): SnakeLegalFinishBill => {
    const finalTax = luxuryTax([
      ...input.currentRoster.map((player) => player.construction),
      ...players.map((player) => player.construction),
    ], [...input.caps], 'taxed').charged;
    const completionCost = players.reduce((sum, player) => sum + player.price, 0);
    return {
      feasible: true,
      completionPlayerIds: players.map((player) => player.playerId),
      completionCost,
      completionTax: finalTax - input.currentTax,
      legalFinishCushion: input.budget - input.committedSpent - finalTax - completionCost,
      affordability: snakeMoneyNonnegative(input.budget - input.committedSpent - finalTax - completionCost)
        ? 'AFFORDABLE'
        : 'OPEN',
    };
  };

  let best = bill(seedCompletion);
  let bestAllIn = best.completionCost + input.currentTax + best.completionTax;
  const fixedShapes = input.currentRoster.map((player) => player.shape);
  const selected: SnakeSeatingPlayer[] = [];
  const selectedGroups = new Set<string>();
  let visitedNodes = 0;
  let truncated = false;
  const nodeLimit = 25_000;
  const pricePrefix = [0];
  for (const candidate of candidates) {
    pricePrefix.push(pricePrefix[pricePrefix.length - 1] + candidate.price);
  }
  const suffix: ExactSuffixStats[] = Array.from(
    { length: candidates.length + 1 },
    emptyExactSuffixStats,
  );
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const shape = candidates[index].shape;
    const next = suffix[index + 1];
    const current = emptyExactSuffixStats();
    current.hitters = next.hitters + (shape.isPitcher ? 0 : 1);
    current.pitchers = next.pitchers + (shape.isPitcher ? 1 : 0);
    current.starters = next.starters + (canStart(shape) ? 1 : 0);
    current.relievers = next.relievers + (canRelieve(shape) ? 1 : 0);
    current.closers = next.closers + (isCloser(shape) ? 1 : 0);
    current.catcherCoverers = next.catcherCoverers + (canCover(shape, 'C') ? 1 : 0);
    for (const position of LEGAL_ROSTER.fieldPositions) {
      current.primaries[position] = next.primaries[position]
        + (!shape.isPitcher && shape.position === position ? 1 : 0);
    }
    suffix[index] = current;
  }

  const requirementsStillReachable = (start: number, slotsLeft: number): boolean => {
    const shapes: RosterSlotPlayer[] = [...fixedShapes, ...selected.map((player) => player.shape)];
    const hitters = shapes.filter((shape) => !shape.isPitcher).length;
    const pitchers = shapes.length - hitters;
    const remaining = suffix[start];
    const minimumFinalHitters = hitters + Math.max(0, slotsLeft - remaining.pitchers);
    const maximumFinalHitters = hitters + Math.min(slotsLeft, remaining.hitters);
    if (minimumFinalHitters > LEGAL_ROSTER.maxPositionPlayers
      || maximumFinalHitters < LEGAL_ROSTER.minPositionPlayers
      || pitchers > LEGAL_ROSTER.maxPitchers
      || pitchers + Math.min(slotsLeft, remaining.pitchers) < LEGAL_ROSTER.minPitchers) return false;
    for (const position of LEGAL_ROSTER.fieldPositions) {
      if (!shapes.some((shape) => !shape.isPitcher && shape.position === position)
        && remaining.primaries[position] === 0) return false;
    }
    if (shapes.filter((shape) => canCover(shape, 'C')).length
      + Math.min(slotsLeft, remaining.catcherCoverers) < LEGAL_ROSTER.minCatchers) return false;
    if (shapes.filter(canStart).length
      + Math.min(slotsLeft, remaining.starters) < LEGAL_ROSTER.startingPitchers) return false;
    if (shapes.filter(canRelieve).length
      + Math.min(slotsLeft, remaining.relievers) < LEGAL_ROSTER.minRelievers) return false;
    return shapes.filter(isCloser).length
      + Math.min(slotsLeft, remaining.closers) >= LEGAL_ROSTER.minClosers;
  };

  const search = (start: number, slotsLeft: number, selectedCost: number): void => {
    visitedNodes += 1;
    if (visitedNodes > nodeLimit) {
      truncated = true;
      return;
    }
    if (slotsLeft === 0) {
      if (!isLegalRoster([...fixedShapes, ...selected.map((player) => player.shape)])) return;
      const candidateBill = bill(selected);
      if (compareLegalFinishes(candidateBill, best) < 0) {
        best = candidateBill;
        bestAllIn = best.completionCost + input.currentTax + best.completionTax;
      }
      return;
    }
    if (candidates.length - start < slotsLeft || !requirementsStillReachable(start, slotsLeft)) return;
    const optimisticSalary = selectedCost + pricePrefix[start + slotsLeft] - pricePrefix[start];
    if (optimisticSalary > bestAllIn + 1e-9) return;

    for (let index = start; index <= candidates.length - slotsLeft; index += 1) {
      if (truncated) return;
      const candidate = candidates[index];
      const groupId = deriveVersionGroupId(candidate);
      if (selectedGroups.has(groupId)) continue;
      selected.push(candidate);
      selectedGroups.add(groupId);
      search(index + 1, slotsLeft - 1, selectedCost + candidate.price);
      selectedGroups.delete(groupId);
      selected.pop();
    }
  };

  // This path runs only after every fast constructive quote is insolvent. It enumerates the
  // remaining legal membership space with admissible salary and roster-requirement pruning, then
  // settles exact nonlinear tax at each leaf. No local minimum may become a BLOCKED verdict.
  if (openSlots === 0) {
    const completed = isLegalRoster([...fixedShapes]) ? bill([]) : input.seed;
    return {
      ...completed,
      affordability: snakeMoneyNonnegative(completed.legalFinishCushion) ? 'AFFORDABLE' : 'BLOCKED',
    };
  }
  search(0, openSlots, 0);
  return {
    ...best,
    affordability: snakeMoneyNonnegative(best.legalFinishCushion)
      ? 'AFFORDABLE'
      : truncated
        ? 'OPEN'
        : 'BLOCKED',
  };
}

/** BILL 2: the cheapest verified legal finish available now, including settlement tax. */
export function evaluateSnakeLegalFinish(input: SnakeLegalFinishInput): SnakeLegalFinishBill {
  const openSlots = LEGAL_ROSTER.size - input.currentRoster.length;
  const caps = shiftedCaps(input);
  const currentTax = luxuryTax(input.currentRoster.map((player) => player.construction), caps, 'taxed').charged;
  const occupiedGroups = new Set(input.currentRoster.map(deriveVersionGroupId));
  const available = input.availablePool.filter((player) => !occupiedGroups.has(deriveVersionGroupId(player)));
  const results = [0, 0.5, 1, 2].flatMap((taxWeight): SnakeLegalFinishBill[] => {
    const effectivePrice = (player: SnakeSeatingPlayer): number => (
      player.price + taxWeight * snakePlayerTaxPressure(player.construction, caps)
    );
    const representatives = humanRepresentatives(available, effectivePrice);
    const byId = new Map(representatives.map((player) => [player.playerId, player]));
    const candidates: CompletionCandidate[] = representatives.map((player) => ({
      id: player.playerId,
      price: effectivePrice(player),
      shape: player.shape,
    }));
    const quote = cheapestLegalCompletion(
      input.currentRoster.map((player) => player.shape),
      candidates,
      openSlots,
    );
    const completion = quote.pickIds
      .map((playerId) => byId.get(playerId))
      .filter((player): player is SnakeSeatingPlayer => Boolean(player));
    if (!quote.feasible || completion.length !== openSlots || !isLegalRoster([
      ...input.currentRoster.map((player) => player.shape),
      ...completion.map((player) => player.shape),
    ])) return [];
    const finalTax = luxuryTax([
      ...input.currentRoster.map((player) => player.construction),
      ...completion.map((player) => player.construction),
    ], caps, 'taxed').charged;
    const completionCost = completion.reduce((sum, player) => sum + player.price, 0);
    return [{
      feasible: true,
      completionPlayerIds: completion.map((player) => player.playerId),
      completionCost,
      completionTax: finalTax - currentTax,
      legalFinishCushion: input.budget - input.committedSpent - finalTax - completionCost,
      affordability: snakeMoneyNonnegative(input.budget - input.committedSpent - finalTax - completionCost)
        ? 'AFFORDABLE'
        : 'OPEN',
    }];
  });
  if (!results.length) return infeasibleLegalFinish();
  const seed = results.sort(compareLegalFinishes)[0];
  // The constructive quote is already sufficient when it proves affordable. A negative quote is
  // not proof of insolvency, so run the globally exact membership search before BLOCKED. Avoid
  // that search on every routine positive-cushion render.
  if (snakeMoneyNonnegative(seed.legalFinishCushion)) return {
    ...seed,
    affordability: 'AFFORDABLE',
  };
  return exactGlobalLegalFinish({
    seed,
    currentRoster: input.currentRoster,
    available,
    caps,
    currentTax,
    committedSpent: input.committedSpent,
    budget: input.budget,
  });
}

export function evaluateSnakeBills(input: SnakePlanInput & SnakeLegalFinishInput): {
  plan: SnakePlanBill;
  legalFinish: SnakeLegalFinishBill;
} {
  return {
    plan: evaluateSnakePlan(input),
    legalFinish: evaluateSnakeLegalFinish(input),
  };
}

/** WHAT-IF is deliberately the same membership calculator; KEEP/REVERT belongs to the UI. */
export function evaluateSnakePlanWhatIf(input: SnakePlanInput): SnakePlanBill {
  return evaluateSnakePlan(input);
}
