import {
  buildFarmSlotTableFromTarget,
  FARM_SLOT_SALARY_UNIT,
  FARM_SNAKE_SESSION_NUMBER,
  createMlbDraftSessionId,
  type LeagueBuilderMlbDraftSession,
} from '../utils/leagueBuilderStorage';
import { buildSnakeOrder } from './leagueConstruction';
import type { FarmAuctionPool } from '../utils/farmAuctionPool';

/** Separate key in the existing store; preserves the completed MLB record at season 1. */
export { FARM_SLOT_SALARY_UNIT, FARM_SNAKE_SESSION_NUMBER } from '../utils/leagueBuilderStorage';

export function resolveFarmArchetypeIdsForSnakeTransition(input: {
  mlbSession: LeagueBuilderMlbDraftSession;
  teams: ReadonlyArray<{ id: string; name: string; farmArchetypeKey?: string }>;
}): Record<string, string> {
  const frozenClubs = input.mlbSession.snakeSetup?.clubs ?? [];
  const teamById = new Map(input.teams.map((team) => [team.id, team]));
  const frozenClubIds = new Set(frozenClubs.map((club) => club.teamId));
  if (teamById.size !== input.teams.length
    || frozenClubs.length === 0
    || frozenClubIds.size !== frozenClubs.length
    || frozenClubs.length !== teamById.size
    || frozenClubs.some((club) => !teamById.has(club.teamId))) {
    throw new Error('THE FARM IDENTITIES DO NOT MATCH THE COMPLETED MLB DRAFT CLUBS.');
  }

  return Object.fromEntries(frozenClubs.map((club) => {
    const team = teamById.get(club.teamId)!;
    const frozen = club.farmArchetypeId?.trim();
    const persisted = team.farmArchetypeKey?.trim();
    if (frozen && persisted && frozen !== persisted) {
      throw new Error(`THE FARM IDENTITY CHANGED AFTER THE MLB DRAFT STARTED: ${team.name}.`);
    }
    const resolved = frozen || persisted;
    if (!resolved) throw new Error(`FARM IDENTITY MISSING: ${team.name}.`);
    return [club.teamId, resolved];
  }));
}

function roundToUnit(value: number, unit: number): number {
  return Math.round(value / unit) * unit;
}

function buildClubLocalFarmSlotTable(openSlots: number, farmBudget: number): number[] {
  if (!Number.isFinite(farmBudget) || farmBudget < 0) {
    throw new Error('Farm budget must be finite and non-negative.');
  }
  const maximumTarget = Math.floor((farmBudget * 0.75) / FARM_SLOT_SALARY_UNIT)
    * FARM_SLOT_SALARY_UNIT;
  if (maximumTarget < openSlots * FARM_SLOT_SALARY_UNIT) {
    throw new Error('The club cannot fund one salary unit for each open FARM slot.');
  }
  if (openSlots === 1) return [maximumTarget];

  // Rounding can make an exact 3x endpoint ratio unrepresentable at the first
  // 75% unit (most visibly with two picks). Move down only enough salary units
  // to preserve the ratio without ever committing more than the club's target.
  for (let offset = 0; offset <= openSlots * 4; offset += 1) {
    const target = maximumTarget - (offset * FARM_SLOT_SALARY_UNIT);
    if (target < openSlots * FARM_SLOT_SALARY_UNIT) break;
    const table = buildFarmSlotTableFromTarget(openSlots, target, FARM_SLOT_SALARY_UNIT);
    if (table[0] === 3 * table.at(-1)!) return table;
  }
  throw new Error('The club cannot fund a rounded 3x FARM salary curve.');
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
  if (!Number.isInteger(totalPicks) || totalPicks < 1) {
    throw new Error('Farm slot table requires at least one pick.');
  }
  if (!Number.isFinite(salaryUnit) || salaryUnit <= 0) {
    throw new Error('Farm slot salary unit must be positive and finite.');
  }
  if (farmBudgets.length === 0 || farmBudgets.some((budget) => !Number.isFinite(budget) || budget < 0)) {
    throw new Error('Farm slot table requires finite, non-negative club budgets.');
  }

  const target = roundToUnit(farmBudgets.reduce((sum, budget) => sum + budget, 0) * 0.75, salaryUnit);
  if (target <= 0) throw new Error('Farm slot table requires a positive league budget.');

  return buildFarmSlotTableFromTarget(totalPicks, target, salaryUnit);
}

export function createFarmSnakeSession(input: {
  mlbSession: LeagueBuilderMlbDraftSession;
  teamOrder: readonly string[];
  existingFarmRosterCountsByTeamId: Readonly<Record<string, number>>;
  farmBudgetsByTeamId: Readonly<Record<string, number>>;
  farmArchetypeIdByTeamId: Readonly<Record<string, string | undefined>>;
  prospectIds: readonly string[];
  prospects: FarmAuctionPool['prospects'];
  now: string;
}): LeagueBuilderMlbDraftSession {
  if (!input.mlbSession.draftManifest && input.mlbSession.currentPickIndex < input.mlbSession.pickOrder.length) {
    throw new Error('Finish the MLB snake draft before opening the farm room.');
  }
  if (input.teamOrder.length === 0 || new Set(input.teamOrder).size !== input.teamOrder.length) {
    throw new Error('The farm snake needs a unique canonical club order.');
  }
  for (const teamId of input.teamOrder) {
    const count = input.existingFarmRosterCountsByTeamId[teamId];
    if (!Number.isInteger(count) || count < 0 || count > 10) {
      throw new Error(`${teamId} must begin the farm snake with 0–10 rostered prospects.`);
    }
  }
  const rawOrder = buildSnakeOrder([...input.teamOrder], 10).filter((slot) => (
    slot.round <= Math.max(0, 10 - (input.existingFarmRosterCountsByTeamId[slot.teamId] ?? 0))
  ));
  const pickOrder = rawOrder.map((slot, index) => ({ ...slot, pick: index + 1 }));
  if (input.prospectIds.length < pickOrder.length) {
    throw new Error('The farm pool cannot fill every open roster spot.');
  }
  if (
    input.prospects.length !== input.prospectIds.length
    || input.prospects.some((prospect, index) => prospect.id !== input.prospectIds[index])
  ) throw new Error('The farm prospect snapshot does not match the frozen prospect ids.');
  let farmSlotSalaries: number[];
  if (pickOrder.length === 0) {
    farmSlotSalaries = [];
  } else {
    farmSlotSalaries = Array.from({ length: pickOrder.length }, () => 0);
    for (const teamId of input.teamOrder) {
      const ownedSlots = pickOrder.filter((slot) => slot.teamId === teamId);
      if (ownedSlots.length === 0) continue;
      const budget = input.farmBudgetsByTeamId[teamId];
      if (!Number.isFinite(budget) || budget < 0) throw new Error(`Farm budget is missing for ${teamId}.`);
      let localTable: number[];
      try {
        localTable = buildClubLocalFarmSlotTable(ownedSlots.length, budget);
      } catch {
        throw new Error(`${teamId} cannot fund its rounded 3x FARM salary curve.`);
      }
      ownedSlots.forEach((slot, index) => { farmSlotSalaries[slot.pick - 1] = localTable[index]; });
    }
  }
  for (const teamId of input.teamOrder) {
    const owed = pickOrder.filter((slot) => slot.teamId === teamId)
      .reduce((sum, slot) => sum + farmSlotSalaries[slot.pick - 1], 0);
    if (owed > input.farmBudgetsByTeamId[teamId]) {
      throw new Error(`${teamId} cannot afford its frozen farm slots at session creation.`);
    }
  }
  return {
    leagueId: input.mlbSession.leagueId,
    tier: input.mlbSession.tier,
    balanceMode: input.mlbSession.balanceMode,
    id: createMlbDraftSessionId(input.mlbSession.leagueId, FARM_SNAKE_SESSION_NUMBER),
    seasonNumber: FARM_SNAKE_SESSION_NUMBER,
    seed: `${input.mlbSession.draftManifest?.seed ?? input.mlbSession.seed}:farm`,
    workflowVersion: 'snake-v1-farm',
    engineMethodVersion: 'snake-s6',
    rounds: 10,
    draftPhase: 'FARM',
    farmSlotSalaries,
    farmProspectSnapshot: input.prospects.map((prospect) => structuredClone(prospect)),
    pickOrder,
    completedPicks: [],
    trades: [],
    correctionSnapshots: [],
    currentPickIndex: 0,
    revision: 0,
    snakeSetup: (input.mlbSession.draftManifest || input.mlbSession.snakeSetup) ? {
      poolPlayerIds: [...input.prospectIds],
      versionSelections: {},
      orderSeed: input.mlbSession.draftManifest?.seed ?? input.mlbSession.snakeSetup!.orderSeed,
      clubs: input.teamOrder.map((teamId) => {
        const source = input.mlbSession.draftManifest?.lockedClubs.find((club) => club.teamId === teamId)
          ?? input.mlbSession.snakeSetup?.clubs.find((club) => club.teamId === teamId);
        const farmArchetypeId = input.farmArchetypeIdByTeamId[teamId];
        return {
          teamId,
          ...(source?.gmName ? { gmName: source.gmName } : {}),
          hotseat: source?.hotseat ?? false,
          ...(farmArchetypeId ? { archetypeId: farmArchetypeId } : {}),
        };
      }),
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
