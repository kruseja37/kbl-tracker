import { createMlbDraftSessionId, type LeagueBuilderMlbDraftSession } from '../utils/leagueBuilderStorage';
import { buildSnakeOrder, validateTrade, type PickValue } from './leagueConstruction';
import type { SnakeGuidePackage } from './snakeGuideTrade';
import { withLatestSnakeCorrection } from './snakeSession';

export const FARM_SLOT_SALARY_UNIT = 1_000;
/** Separate key in the existing store; preserves the completed MLB record at season 1. */
export const FARM_SNAKE_SESSION_NUMBER = 2;

function roundToUnit(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

/**
 * S6's frozen rookie chart. The curve is geometric before display-unit rounding; the
 * remainder is then spread across interior picks so the two calibration laws remain exact.
 */
export function buildFarmSlotTable(
  totalPicks: number,
  farmBudgets: readonly number[],
  salaryUnit = FARM_SLOT_SALARY_UNIT,
): number[] {
  if (!Number.isInteger(totalPicks) || totalPicks < 2) {
    throw new Error('Farm slot table requires at least two picks.');
  }
  if (!Number.isFinite(salaryUnit) || salaryUnit <= 0) {
    throw new Error('Farm slot salary unit must be positive and finite.');
  }
  if (farmBudgets.length === 0 || farmBudgets.some((budget) => !Number.isFinite(budget) || budget < 0)) {
    throw new Error('Farm slot table requires finite, non-negative club budgets.');
  }

  const target = roundToUnit(farmBudgets.reduce((sum, budget) => sum + budget, 0) * 0.75, salaryUnit);
  if (target <= 0) throw new Error('Farm slot table requires a positive league budget.');

  const ratio = 3 ** (-1 / (totalPicks - 1));
  const weights = Array.from({ length: totalPicks }, (_, index) => ratio ** index);
  const scale = target / weights.reduce((sum, weight) => sum + weight, 0);
  const last = Math.max(salaryUnit, roundToUnit(scale * weights.at(-1)!, salaryUnit));
  const table = weights.map((weight) => Math.max(salaryUnit, roundToUnit(scale * weight, salaryUnit)));
  table[0] = 3 * last;
  table[table.length - 1] = last;

  let remainder = target - table.reduce((sum, salary) => sum + salary, 0);
  const direction = Math.sign(remainder);
  let guard = 0;
  while (remainder !== 0 && guard < totalPicks * totalPicks * 20) {
    let changed = false;
    const indexes = direction > 0
      ? Array.from({ length: totalPicks - 2 }, (_, index) => index + 1)
      : Array.from({ length: totalPicks - 2 }, (_, index) => totalPicks - 2 - index);
    for (const index of indexes) {
      if (remainder === 0) break;
      const next = table[index] + direction * salaryUnit;
      if (next <= 0 || next > table[index - 1] || next < table[index + 1]) continue;
      table[index] = next;
      remainder -= direction * salaryUnit;
      changed = true;
    }
    if (!changed) break;
    guard += 1;
  }
  if (remainder !== 0) {
    throw new Error('Farm slot table could not satisfy its rounded 75% calibration.');
  }
  return table;
}

export function createFarmSnakeSession(input: {
  mlbSession: LeagueBuilderMlbDraftSession;
  teamOrder: readonly string[];
  existingFarmRosterCountsByTeamId: Readonly<Record<string, number>>;
  farmBudgetsByTeamId: Readonly<Record<string, number>>;
  prospectIds: readonly string[];
  now: string;
}): LeagueBuilderMlbDraftSession {
  if (input.mlbSession.currentPickIndex < input.mlbSession.pickOrder.length) {
    throw new Error('Finish the MLB snake draft before opening the farm room.');
  }
  const rawOrder = buildSnakeOrder([...input.teamOrder], 10).filter((slot) => (
    slot.round <= Math.max(0, 10 - (input.existingFarmRosterCountsByTeamId[slot.teamId] ?? 0))
  ));
  const pickOrder = rawOrder.map((slot, index) => ({ ...slot, pick: index + 1 }));
  if (pickOrder.length < 2) throw new Error('The farm snake needs at least two open roster spots.');
  if (input.prospectIds.length < pickOrder.length) {
    throw new Error('The farm pool cannot fill every open roster spot.');
  }
  const farmSlotSalaries = buildFarmSlotTable(pickOrder.length, input.teamOrder.map((teamId) => {
    const budget = input.farmBudgetsByTeamId[teamId];
    if (!Number.isFinite(budget)) throw new Error(`Farm budget is missing for ${teamId}.`);
    return budget;
  }));
  for (const teamId of input.teamOrder) {
    const owed = pickOrder.filter((slot) => slot.teamId === teamId)
      .reduce((sum, slot) => sum + farmSlotSalaries[slot.pick - 1], 0);
    if (owed > input.farmBudgetsByTeamId[teamId]) {
      throw new Error(`${teamId} cannot afford its frozen farm slots at session creation.`);
    }
  }
  return {
    ...input.mlbSession,
    id: createMlbDraftSessionId(input.mlbSession.leagueId, FARM_SNAKE_SESSION_NUMBER),
    seasonNumber: FARM_SNAKE_SESSION_NUMBER,
    seed: `${input.mlbSession.seed}:farm`,
    workflowVersion: 'snake-v1-farm',
    engineMethodVersion: 'snake-s6',
    rounds: 10,
    draftPhase: 'FARM',
    farmSlotSalaries,
    pickOrder,
    completedPicks: [],
    trades: [],
    versionState: undefined,
    correctionSnapshots: [],
    currentPickIndex: 0,
    revision: 0,
    snakeSetup: input.mlbSession.snakeSetup ? {
      ...input.mlbSession.snakeSetup,
      poolPlayerIds: [...input.prospectIds],
      versionSelections: {},
    } : undefined,
    createdDate: input.now,
    lastModified: input.now,
  };
}

export function farmPickSalary(session: LeagueBuilderMlbDraftSession, absolutePick: number): number {
  const salary = session.farmSlotSalaries?.[absolutePick - 1];
  if (!Number.isFinite(salary) || salary! < 0) {
    throw new Error(`Farm pick ${absolutePick} has no frozen slot salary.`);
  }
  return salary!;
}

export interface FarmMoneyLedger {
  draftedCount: number;
  draftedSpend: number;
  moneyLeft: number;
  plannedCount: number;
  futureSlotCost: number;
  moneyAfterOwedSlots: number;
}

/** Public frozen-slot money only. Candidate ordering never changes these amounts. */
export function buildFarmMoneyLedger(
  session: LeagueBuilderMlbDraftSession,
  teamId: string,
  farmBudget: number,
): FarmMoneyLedger {
  const drafted = session.completedPicks.filter((pick) => pick.teamId === teamId);
  const draftedSpend = drafted.reduce((sum, pick) => sum + farmPickSalary(session, pick.pick), 0);
  const futureSlots = session.pickOrder.slice(session.currentPickIndex).filter((slot) => slot.teamId === teamId);
  const futureSlotCost = futureSlots.reduce((sum, slot) => sum + farmPickSalary(session, slot.pick), 0);
  const moneyLeft = farmBudget - draftedSpend;
  return {
    draftedCount: drafted.length,
    draftedSpend,
    moneyLeft,
    plannedCount: futureSlots.length,
    futureSlotCost,
    moneyAfterOwedSlots: moneyLeft - futureSlotCost,
  };
}

function ownershipAfterTrade(input: {
  session: LeagueBuilderMlbDraftSession;
  buyerTeamId: string;
  sellerTeamId: string;
  offerPickNumbers: readonly number[];
  receivePickNumbers: readonly number[];
}): LeagueBuilderMlbDraftSession['pickOrder'] {
  const offered = new Set(input.offerPickNumbers);
  const received = new Set(input.receivePickNumbers);
  return input.session.pickOrder.map((slot) => {
    if (offered.has(slot.pick)) return { ...slot, teamId: input.sellerTeamId };
    if (received.has(slot.pick)) return { ...slot, teamId: input.buyerTeamId };
    return slot;
  });
}

export interface FarmPickTradeVerdict {
  valid: boolean;
  reason: string;
}

/** Exact S6 money/count gate. Prices ride absolute slots, never owners. */
export function validateFarmPickTrade(input: {
  session: LeagueBuilderMlbDraftSession;
  buyerTeamId: string;
  sellerTeamId: string;
  offerPickNumbers: readonly number[];
  receivePickNumbers: readonly number[];
  farmBudgetsByTeamId: Readonly<Record<string, number>>;
  remainingUniqueProspects: number;
}): FarmPickTradeVerdict {
  if (input.session.draftPhase !== 'FARM' || !input.session.farmSlotSalaries) {
    return { valid: false, reason: 'This is not a farm snake session.' };
  }
  if (input.offerPickNumbers.length !== input.receivePickNumbers.length) {
    return { valid: false, reason: 'Both clubs must keep the same number of farm turns.' };
  }
  const remaining = input.session.pickOrder.slice(input.session.currentPickIndex);
  const ownerByPick = new Map(remaining.map((slot) => [slot.pick, slot.teamId]));
  if (input.offerPickNumbers.some((pick) => ownerByPick.get(pick) !== input.buyerTeamId)
    || input.receivePickNumbers.some((pick) => ownerByPick.get(pick) !== input.sellerTeamId)) {
    return { valid: false, reason: 'The draft moved on — refresh.' };
  }
  if (input.remainingUniqueProspects < remaining.length) {
    return { valid: false, reason: 'The remaining farm pool cannot fill every open roster spot.' };
  }

  const spentByTeamId = new Map<string, number>();
  for (const pick of input.session.completedPicks) {
    spentByTeamId.set(pick.teamId, (spentByTeamId.get(pick.teamId) ?? 0) + farmPickSalary(input.session, pick.pick));
  }
  const proposed = ownershipAfterTrade(input).slice(input.session.currentPickIndex);
  for (const teamId of Object.keys(input.farmBudgetsByTeamId)) {
    const remainingBudget = input.farmBudgetsByTeamId[teamId] - (spentByTeamId.get(teamId) ?? 0);
    const owed = proposed
      .filter((slot) => slot.teamId === teamId)
      .reduce((sum, slot) => sum + farmPickSalary(input.session, slot.pick), 0);
    if (owed > remainingBudget) {
      return { valid: false, reason: `${teamId} does not have enough farm budget for its remaining picks.` };
    }
  }
  return { valid: true, reason: 'Guide-matched and affordable now.' };
}

export function farmSlotPickValueChart(session: LeagueBuilderMlbDraftSession): PickValue[] {
  return session.pickOrder.map((slot) => ({ pick: slot.pick, value: farmPickSalary(session, slot.pick) }));
}

function combinations(values: readonly number[], count: number): number[][] {
  const result: number[][] = [];
  const walk = (start: number, picked: number[]) => {
    if (picked.length === count) { result.push(picked); return; }
    for (let index = start; index < values.length; index += 1) walk(index + 1, [...picked, values[index]]);
  };
  walk(0, []);
  return result;
}

function swapFarmPickOwnership(session: LeagueBuilderMlbDraftSession, proposal: SnakeGuidePackage): LeagueBuilderMlbDraftSession {
  return { ...session, pickOrder: ownershipAfterTrade({
    session,
    buyerTeamId: proposal.buyerTeamId,
    sellerTeamId: proposal.sellerTeamId,
    offerPickNumbers: proposal.offerPickNumbers,
    receivePickNumbers: proposal.receivePickNumbers,
  }) };
}

export function searchFarmGuidePackage(input: {
  session: LeagueBuilderMlbDraftSession;
  buyerTeamId: string;
  targetPick: number;
  farmBudgetsByTeamId: Readonly<Record<string, number>>;
  remainingUniqueProspects: number;
}): { package: SnakeGuidePackage | null; message: string } {
  const remaining = input.session.pickOrder.slice(input.session.currentPickIndex);
  const target = remaining.find((slot) => slot.pick === input.targetPick);
  if (!target || target.teamId === input.buyerTeamId) return { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
  const buyerPicks = remaining.filter((slot) => slot.teamId === input.buyerTeamId).map((slot) => slot.pick);
  const sellerReturns = remaining.filter((slot) => slot.teamId === target.teamId && slot.pick !== target.pick).map((slot) => slot.pick);
  const chart = farmSlotPickValueChart(input.session);
  const valueByPick = new Map(chart.map((row) => [row.pick, row.value]));
  const packages: SnakeGuidePackage[] = [];
  for (let count = 1; count <= 3; count += 1) {
    for (const offers of combinations(buyerPicks, count)) {
      for (const extras of combinations(sellerReturns, count - 1)) {
        const receives = [target.pick, ...extras].sort((a, b) => a - b);
        if (!validateTrade(offers.map((pick) => ({ pick })), receives.map((pick) => ({ pick })), chart).balanced) continue;
        const verdict = validateFarmPickTrade({ ...input, offerPickNumbers: offers, receivePickNumbers: receives, sellerTeamId: target.teamId });
        if (!verdict.valid) continue;
        packages.push({
          buyerTeamId: input.buyerTeamId,
          sellerTeamId: target.teamId,
          targetPick: target.pick,
          offerPickNumbers: offers,
          receivePickNumbers: receives,
          offerValue: offers.reduce((sum, pick) => sum + (valueByPick.get(pick) ?? 0), 0),
          receiveValue: receives.reduce((sum, pick) => sum + (valueByPick.get(pick) ?? 0), 0),
          sessionRevision: input.session.revision ?? 0,
        });
      }
    }
  }
  const best = packages.sort((a, b) => a.offerPickNumbers.length - b.offerPickNumbers.length || a.offerPickNumbers.join(',').localeCompare(b.offerPickNumbers.join(',')))[0];
  return best
    ? { package: best, message: `OFFER ${best.offerPickNumbers.join('+')}; RECEIVE ${best.receivePickNumbers.join('+')} — guide-matched and affordable now.` }
    : { package: null, message: `No legal guide trade reaches pick ${input.targetPick}.` };
}

export function executeFarmGuidePackage(input: {
  session: LeagueBuilderMlbDraftSession;
  proposal: SnakeGuidePackage;
  farmBudgetsByTeamId: Readonly<Record<string, number>>;
  remainingUniqueProspects: number;
}): { valid: boolean; message: string; session: LeagueBuilderMlbDraftSession | null } {
  if ((input.session.revision ?? 0) !== input.proposal.sessionRevision) {
    return { valid: false, message: 'The draft moved on — refresh.', session: null };
  }
  const verdict = validateFarmPickTrade({ ...input, ...input.proposal });
  if (!verdict.valid) return { valid: false, message: verdict.reason, session: null };
  const guide = validateTrade(
    input.proposal.offerPickNumbers.map((pick) => ({ pick })),
    input.proposal.receivePickNumbers.map((pick) => ({ pick })),
    farmSlotPickValueChart(input.session),
  );
  if (!guide.balanced) return { valid: false, message: 'This package no longer matches the posted guide.', session: null };
  const base = withLatestSnakeCorrection(input.session, 'trade');
  const swapped = swapFarmPickOwnership(base, input.proposal);
  return {
    valid: true,
    message: 'Guide-matched and affordable now.',
    session: {
      ...swapped,
      trades: [...(input.session.trades ?? []), {
        id: `snake-farm-guide-${input.session.revision ?? 0}-${(input.session.trades?.length ?? 0) + 1}`,
        atPickIndex: input.session.currentPickIndex,
        humanTeamId: input.proposal.buyerTeamId,
        cpuTeamId: input.proposal.sellerTeamId,
        humanPickNumbers: [...input.proposal.offerPickNumbers],
        cpuPickNumbers: [...input.proposal.receivePickNumbers],
        humanValue: input.proposal.offerValue,
        cpuValue: input.proposal.receiveValue,
        greedMargin: 0,
      }],
      revision: (input.session.revision ?? 0) + 1,
    },
  };
}
