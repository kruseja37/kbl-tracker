import type { AuctionTeamInput } from '../engines/auctionStateMachine';
import { LEAGUE_MINIMUM_SALARY } from '../data/rosterEngineConstants';
import { T3_DERIVATION_INPUTS } from '../data/tierParams';
import { FARM_AUCTION_ROSTER_SLOTS_PER_TEAM } from './farmAuctionPool';

// RB-16 sim-tune §11 (sweep 30/50/70)
export const MLB_TO_FARM_CARRYOVER_PCT = 0.5;

export interface BuildFarmAuctionTeamInputsInput {
  teams: readonly {
    teamId: string;
    farmRosterPlayerIds: readonly string[];
    committedFarmSalaries?: number;
    mlbBudgetCarryover?: number;
  }[];
  farmTierCap: number;
  farmSlots?: number;
  minSalary?: number;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function validatePoolIVs(poolIVs: readonly number[]): void {
  if (poolIVs.length === 0) {
    throw new Error('Farm tier cap requires at least one pool IV.');
  }
  if (poolIVs.some((iv) => !Number.isFinite(iv))) {
    throw new Error('Farm tier cap requires finite pool IVs.');
  }
}

export function computeFarmTierCap(
  poolIVs: readonly number[],
  farmSlots = FARM_AUCTION_ROSTER_SLOTS_PER_TEAM,
): number {
  validatePoolIVs(poolIVs);

  const maxPoolIV = Math.max(...poolIVs);
  const medianPoolIV = median(poolIVs);
  const starBranch = maxPoolIV / T3_DERIVATION_INPUTS.starBudgetShare;
  const rosterBranch = farmSlots * medianPoolIV * T3_DERIVATION_INPUTS.rosterHeadroom;

  return Math.max(starBranch, rosterBranch);
}

export function computeMlbToFarmCarryover(
  unspent: number,
  pct = MLB_TO_FARM_CARRYOVER_PCT,
): number {
  return Number.isFinite(unspent) ? Math.max(0, unspent) * pct : 0;
}

export function buildFarmAuctionTeamInputs(input: BuildFarmAuctionTeamInputsInput): AuctionTeamInput[] {
  const farmSlots = input.farmSlots ?? FARM_AUCTION_ROSTER_SLOTS_PER_TEAM;
  const minSalary = input.minSalary ?? LEAGUE_MINIMUM_SALARY;

  return input.teams.map((team) => {
    const committedFarmSalaries = team.committedFarmSalaries ?? 0;
    const rawMlbBudgetCarryover = team.mlbBudgetCarryover ?? 0;
    const mlbBudgetCarryover = Number.isFinite(rawMlbBudgetCarryover)
      ? Math.max(0, rawMlbBudgetCarryover)
      : 0;

    return {
      teamId: team.teamId,
      budgetRemaining: Math.max(0, input.farmTierCap - committedFarmSalaries) + mlbBudgetCarryover,
      rosterSlotsRemaining: Math.max(0, farmSlots - team.farmRosterPlayerIds.length),
      minSalary,
      projectedTax: 0,
      roster: [],
    };
  });
}
