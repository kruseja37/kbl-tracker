import { LEGAL_ROSTER, isLegalRoster } from '../data/rosterConstruction';
import type { LuxuryCapRow } from '../data/tierParams';
import { snakeLuxuryCaps } from './snakeLuxuryTax';
import { cheapestLegalCompletion, type CompletionCandidate } from './auctionCompletionFloor';
import {
  luxuryTax,
  shiftLuxuryCaps,
  type TeamCapIdentity,
} from './leagueConstruction';
import type { SnakeSeatingPlayer } from './snakeSeatingProof';
import { deriveVersionGroupId } from './snakeVersioning';

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

function cheapestHumanRepresentatives(players: readonly SnakeSeatingPlayer[]): SnakeSeatingPlayer[] {
  const byGroup = new Map<string, SnakeSeatingPlayer>();
  for (const player of [...players].sort((left, right) => left.price - right.price || left.playerId.localeCompare(right.playerId))) {
    const groupId = deriveVersionGroupId(player);
    if (!byGroup.has(groupId)) byGroup.set(groupId, player);
  }
  return [...byGroup.values()];
}

/** BILL 2: the cheapest verified legal finish available now, including settlement tax. */
export function evaluateSnakeLegalFinish(input: SnakeLegalFinishInput): SnakeLegalFinishBill {
  const openSlots = LEGAL_ROSTER.size - input.currentRoster.length;
  const representatives = cheapestHumanRepresentatives(input.availablePool);
  const candidates: CompletionCandidate[] = representatives.map((player) => ({
    id: player.playerId,
    price: player.price,
    shape: player.shape,
  }));
  const quote = cheapestLegalCompletion(
    input.currentRoster.map((player) => player.shape),
    candidates,
    openSlots,
  );
  const completion = quote.pickIds
    .map((playerId) => representatives.find((player) => player.playerId === playerId))
    .filter((player): player is SnakeSeatingPlayer => Boolean(player));
  if (!quote.feasible || completion.length !== openSlots || !isLegalRoster([
    ...input.currentRoster.map((player) => player.shape),
    ...completion.map((player) => player.shape),
  ])) {
    return {
      feasible: false,
      completionPlayerIds: [],
      completionCost: 0,
      completionTax: Number.POSITIVE_INFINITY,
      legalFinishCushion: Number.NEGATIVE_INFINITY,
    };
  }
  const caps = shiftedCaps(input);
  const currentTax = luxuryTax(input.currentRoster.map((player) => player.construction), caps, 'taxed').charged;
  const finalTax = luxuryTax([
    ...input.currentRoster.map((player) => player.construction),
    ...completion.map((player) => player.construction),
  ], caps, 'taxed').charged;
  const completionCost = completion.reduce((sum, player) => sum + player.price, 0);
  const completionTax = finalTax - currentTax;
  return {
    feasible: true,
    completionPlayerIds: completion.map((player) => player.playerId),
    completionCost,
    completionTax,
    legalFinishCushion: input.budget - input.committedSpent - finalTax - completionCost,
  };
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
