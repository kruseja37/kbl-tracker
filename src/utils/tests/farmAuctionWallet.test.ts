import { describe, expect, test } from 'vitest';

import { LEAGUE_MINIMUM_SALARY } from '../../data/rosterEngineConstants';
import { T3_DERIVATION_INPUTS } from '../../data/tierParams';
import { FARM_AUCTION_ROSTER_SLOTS_PER_TEAM } from '../farmAuctionPool';
import {
  buildFarmAuctionTeamInputs,
  computeFarmTierCap,
} from '../farmAuctionWallet';

describe('computeFarmTierCap AUC-5.1c', () => {
  test('applies the IV_ENGINE §5.2 cap formula over the farm pool with farm slots', () => {
    const poolIVs = [20_000, 10_000, 40_000, 30_000];
    const maxPoolIV = 40_000;
    const medianPoolIV = 25_000;
    const expected = Math.max(
      maxPoolIV / T3_DERIVATION_INPUTS.starBudgetShare,
      FARM_AUCTION_ROSTER_SLOTS_PER_TEAM * medianPoolIV * T3_DERIVATION_INPUTS.rosterHeadroom,
    );

    expect(T3_DERIVATION_INPUTS.starBudgetShare).toBe(0.33);
    expect(T3_DERIVATION_INPUTS.rosterHeadroom).toBe(1.15);
    expect(computeFarmTierCap(poolIVs)).toBeCloseTo(expected, 2);
    expect(computeFarmTierCap(poolIVs)).toBeCloseTo(287_500, 2);
  });

  test('emergent nerf comes from weaker prospect-pool IVs producing a smaller cap', () => {
    const strongerPool = [20_000, 30_000, 40_000, 50_000, 60_000];
    const weakerProspectPool = strongerPool.map((iv) => iv * 0.4);

    expect(computeFarmTierCap(weakerProspectPool)).toBeLessThan(computeFarmTierCap(strongerPool));
  });

  test('star branch wins for a top-heavy pool and roster branch wins for a flat pool', () => {
    const topHeavyPool = [1_000, 1_000, 1_000, 330_000];
    const flatPool = [10_000, 10_000, 10_000, 10_000];

    const topHeavyStarBranch = 330_000 / T3_DERIVATION_INPUTS.starBudgetShare;
    const flatRosterBranch =
      FARM_AUCTION_ROSTER_SLOTS_PER_TEAM * 10_000 * T3_DERIVATION_INPUTS.rosterHeadroom;

    expect(computeFarmTierCap(topHeavyPool)).toBeCloseTo(topHeavyStarBranch, 2);
    expect(computeFarmTierCap(flatPool)).toBeCloseTo(flatRosterBranch, 2);
  });

  test('uses the standard odd and even sample median for the roster branch', () => {
    const oddMedianPool = [10, 20, 30];
    const evenMedianPool = [10, 20, 40, 80];

    expect(computeFarmTierCap(oddMedianPool)).toBeCloseTo(
      FARM_AUCTION_ROSTER_SLOTS_PER_TEAM * 20 * T3_DERIVATION_INPUTS.rosterHeadroom,
      10,
    );
    expect(computeFarmTierCap(evenMedianPool)).toBeCloseTo(
      FARM_AUCTION_ROSTER_SLOTS_PER_TEAM * 30 * T3_DERIVATION_INPUTS.rosterHeadroom,
      10,
    );
  });

  test('throws on empty or non-finite pool IVs', () => {
    expect(() => computeFarmTierCap([])).toThrow('at least one pool IV');
    expect(() => computeFarmTierCap([10_000, Number.NaN])).toThrow('finite pool IVs');
    expect(() => computeFarmTierCap([10_000, Number.POSITIVE_INFINITY])).toThrow('finite pool IVs');
  });
});

describe('buildFarmAuctionTeamInputs AUC-5.1c', () => {
  test('mirrors the MLB auction adapter on farm wallet budget, farm slots, minimum salary, and tax', () => {
    const teams = buildFarmAuctionTeamInputs({
      farmTierCap: 50_000,
      teams: [
        {
          teamId: 'team-a',
          farmRosterPlayerIds: ['a-farm-1', 'a-farm-2'],
          committedFarmSalaries: 12_500,
        },
        {
          teamId: 'team-b',
          farmRosterPlayerIds: Array.from({ length: 12 }, (_, index) => `b-farm-${index + 1}`),
          committedFarmSalaries: 75_000,
        },
        {
          teamId: 'team-c',
          farmRosterPlayerIds: [],
        },
      ],
    });

    expect(teams).toEqual([
      {
        teamId: 'team-a',
        budgetRemaining: 37_500,
        rosterSlotsRemaining: 8,
        minSalary: LEAGUE_MINIMUM_SALARY,
        projectedTax: 0,
        roster: [],
      },
      {
        teamId: 'team-b',
        budgetRemaining: 0,
        rosterSlotsRemaining: 0,
        minSalary: LEAGUE_MINIMUM_SALARY,
        projectedTax: 0,
        roster: [],
      },
      {
        teamId: 'team-c',
        budgetRemaining: 50_000,
        rosterSlotsRemaining: 10,
        minSalary: LEAGUE_MINIMUM_SALARY,
        projectedTax: 0,
        roster: [],
      },
    ]);
  });

  test('supports explicit farm slots and minSalary overrides for tests or future callers', () => {
    expect(buildFarmAuctionTeamInputs({
      farmTierCap: 20_000,
      farmSlots: 12,
      minSalary: 500,
      teams: [
        {
          teamId: 'team-a',
          farmRosterPlayerIds: ['p1', 'p2', 'p3'],
          committedFarmSalaries: 5_000,
        },
      ],
    })).toEqual([
      {
        teamId: 'team-a',
        budgetRemaining: 15_000,
        rosterSlotsRemaining: 9,
        minSalary: 500,
        projectedTax: 0,
        roster: [],
      },
    ]);
  });
});
