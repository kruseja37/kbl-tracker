import { describe, expect, test } from 'vitest';

import { scoreSmb4Player } from '../src/engines/smb4GradeEmulator';
import { buildFarmAuctionSession } from '../src/utils/farmAuctionSession';
import type { LeagueBuilderProspectPlayerDto } from '../src/utils/prospectScoutingDraftEngine';

const RUN_DISTRIBUTION_CHECK = process.env.RUN_FARM_PROSPECT_DISTRIBUTION === '1';
const FARM_PROSPECT_SAMPLE_SIZE = 500;
const FARM_PROSPECT_TEAM_COUNT = 10;
const FARM_PROSPECT_POOL_MULTIPLIER = 5;
// Mirrors LeagueBuilderFarmAuctionDraft.tsx's routed farm-auction default seed.
const FARM_AUCTION_DEFAULT_UI_SEED = 'farm-auction-v1';
const MAX_BUCKET_DEVIATION_PP = 1.5;
const MAX_TOTAL_ABS_DEVIATION_PP = 8;

const SPEC_GRADE_CURVE = [
  ['A+', 0],
  ['A', 0.02],
  ['A-', 0.05],
  ['B+', 0.10],
  ['B', 0.15],
  ['B-', 0.15],
  ['C+', 0.15],
  ['C', 0.18],
  ['C-', 0.12],
  ['D', 0.08],
] as const;

type SpecGradeBucket = typeof SPEC_GRADE_CURVE[number][0];

function scoreGeneratedProspect(prospect: LeagueBuilderProspectPlayerDto) {
  return scoreSmb4Player({
    primaryPosition: prospect.primaryPosition,
    secondaryPosition: prospect.secondaryPosition,
    bats: prospect.bats,
    throws: prospect.throws,
    power: prospect.power,
    contact: prospect.contact,
    speed: prospect.speed,
    fielding: prospect.fielding,
    arm: prospect.arm,
    velocity: prospect.velocity,
    junk: prospect.junk,
    accuracy: prospect.accuracy,
    arsenal: prospect.arsenal,
    trait1: prospect.trait1,
    trait2: prospect.trait2,
  });
}

function bucketOracleGrade(grade: string): SpecGradeBucket {
  if (grade === 'S' || grade === 'A+') return 'A+';
  if (grade === 'A' || grade === 'A-' || grade === 'B+' || grade === 'B' || grade === 'B-') {
    return grade;
  }
  if (grade === 'C+' || grade === 'C' || grade === 'C-') return grade;
  return 'D';
}

const describeIf = RUN_DISTRIBUTION_CHECK ? describe : describe.skip;

describeIf('F4 farm prospect oracle-grade distribution invariant', () => {
  test('production farm pool generation matches PROSPECT_GENERATION_SPEC §3.2 within N=500 tolerance', () => {
    const teams = Array.from({ length: FARM_PROSPECT_TEAM_COUNT }, (_, index) => ({
      teamId: `f4-farm-team-${index + 1}`,
      teamName: `F4 Farm Team ${index + 1}`,
      farmRosterPlayerIds: [],
      committedFarmSalaries: 0,
      mlbBudgetCarryover: 0,
    }));
    const result = buildFarmAuctionSession({
      leagueId: 'f4-farm-prospect-distribution',
      seasonNumber: 1,
      seed: FARM_AUCTION_DEFAULT_UI_SEED,
      teams,
      poolMultiplier: FARM_PROSPECT_POOL_MULTIPLIER,
    });
    const counts = Object.fromEntries(
      SPEC_GRADE_CURVE.map(([grade]) => [grade, 0]),
    ) as Record<SpecGradeBucket, number>;

    expect(result.pool.prospects).toHaveLength(FARM_PROSPECT_SAMPLE_SIZE);

    for (const prospect of result.pool.prospects) {
      const scored = scoreGeneratedProspect(prospect);
      counts[bucketOracleGrade(scored.grade)] += 1;
    }

    const rows = SPEC_GRADE_CURVE.map(([grade, targetShare]) => {
      const observedCount = counts[grade];
      const observedPct = (observedCount / FARM_PROSPECT_SAMPLE_SIZE) * 100;
      const targetPct = targetShare * 100;
      return {
        grade,
        observedCount,
        observedPct: Number(observedPct.toFixed(1)),
        targetPct: Number(targetPct.toFixed(1)),
        deviationPp: Number((observedPct - targetPct).toFixed(1)),
      };
    });
    const totalAbsDeviationPp = Number(
      rows.reduce((sum, row) => sum + Math.abs(row.deviationPp), 0).toFixed(1),
    );

    console.info('F4 farm prospect distribution N=500', rows);
    console.info('F4 tolerance', {
      maxBucketDeviationPp: MAX_BUCKET_DEVIATION_PP,
      maxTotalAbsDeviationPp: MAX_TOTAL_ABS_DEVIATION_PP,
      totalAbsDeviationPp,
    });

    for (const row of rows) {
      expect(Math.abs(row.deviationPp)).toBeLessThanOrEqual(MAX_BUCKET_DEVIATION_PP);
    }
    expect(totalAbsDeviationPp).toBeLessThanOrEqual(MAX_TOTAL_ABS_DEVIATION_PP);
  }, 120_000);
});
