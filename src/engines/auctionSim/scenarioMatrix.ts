import {
  NUMERIC_GRADE_TARGET,
  buildNumericPoolDiagnostics,
  percentile,
} from './poolDiagnostics';
import {
  currentPool,
  quotaShapeFromPool,
  type PoolShapePolicyName,
  type PoolShapeResult,
} from './poolShapePolicies';
import { simulateAuction } from './runAuctionSim';
import {
  normalizeAuctionSimConfig,
  type AuctionSimConfig,
  type AuctionSimNominationPolicy,
  type AuctionSimPlayer,
  type AuctionSimTeamInput,
} from './types';
import { numericScoreToSmb4Grade } from '../smb4GradeEmulator';

export const AUCTION_SIM_K_SWEEP = [0, 0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9, 1.0] as const;

export interface ScenarioMatrixStat {
  p10: number | null;
  median: number | null;
  p90: number | null;
}

export interface ScenarioMatrixDefinition {
  id: string;
  label: string;
  poolPolicy: PoolShapePolicyName;
  reserveFractionK: number;
  autoFillPriceMode: AuctionSimConfig['autoFillPriceMode'];
}

export interface ScenarioMatrixInput {
  currentPool: readonly AuctionSimPlayer[];
  teams: readonly AuctionSimTeamInput[];
  seeds: readonly string[];
  nominationPolicies: readonly AuctionSimNominationPolicy[];
  baseConfig?: Partial<AuctionSimConfig>;
  quotaTargetSize?: number;
  scenarios?: readonly ScenarioMatrixDefinition[];
}

export interface ScenarioMatrixRow {
  scenarioId: string;
  label: string;
  poolPolicy: PoolShapePolicyName;
  reserveFractionK: number;
  autoFillPriceMode: AuctionSimConfig['autoFillPriceMode'];
  nominationPolicies: readonly AuctionSimNominationPolicy[];
  seeds: readonly string[];
  poolSize: number;
  targetSize: number;
  quotaShortfallCount: number;
  medianNumericGrade: number | null;
  medianLetterGrade: string | null;
  highTailShare: number;
  middleMassShare: number;
  lowTailShare: number;
  barbellIndex: number;
  gradeDistributionDistanceFromTarget: number;
  budgetRemainingAtRosterSpot11Ratio: ScenarioMatrixStat;
  rosterStrengthSpread: ScenarioMatrixStat;
  autoFillCount: ScenarioMatrixStat;
  freeAutoFillCount: ScenarioMatrixStat;
  paidAutoFillCount: ScenarioMatrixStat;
  belowReserveSaleCount: ScenarioMatrixStat;
  eliteConcentration: ScenarioMatrixStat;
  coreBidRate: ScenarioMatrixStat;
  finalBudget: ScenarioMatrixStat;
  objectiveScore: number;
  reachesSpot11BudgetTarget: boolean;
  reachesStrengthSpreadTarget: boolean;
  reachesNoFreeAutoFillTarget: boolean;
  reachesNoBelowReserveSaleTarget: boolean;
  reachesHighTailTarget: boolean;
}

export interface ScenarioMatrixResult {
  rows: ScenarioMatrixRow[];
  topCandidates: ScenarioMatrixRow[];
}

function stat(values: readonly number[]): ScenarioMatrixStat {
  return {
    p10: percentile([...values], 0.1),
    median: percentile([...values], 0.5),
    p90: percentile([...values], 0.9),
  };
}

function statMedian(value: ScenarioMatrixStat): number {
  return value.median ?? 0;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function defaultScenarioDefinitions(): ScenarioMatrixDefinition[] {
  return [
    {
      id: 'current-k0-zero',
      label: 'current pool + k=0 + zero fill',
      poolPolicy: 'currentPool',
      reserveFractionK: 0,
      autoFillPriceMode: 'zero',
    },
    {
      id: 'current-k065-reserve',
      label: 'current pool + k=0.65 + reserve fill',
      poolPolicy: 'currentPool',
      reserveFractionK: 0.65,
      autoFillPriceMode: 'reserve',
    },
    {
      id: 'quota-k0-zero',
      label: 'quota numeric curve + k=0 + zero fill',
      poolPolicy: 'quotaShapeFromPool',
      reserveFractionK: 0,
      autoFillPriceMode: 'zero',
    },
    {
      id: 'quota-k065-reserve',
      label: 'quota numeric curve + k=0.65 + reserve fill',
      poolPolicy: 'quotaShapeFromPool',
      reserveFractionK: 0.65,
      autoFillPriceMode: 'reserve',
    },
    ...AUCTION_SIM_K_SWEEP
      .filter((k) => k !== 0 && k !== 0.65)
      .map((k) => ({
        id: `quota-sweep-k${String(k).replace('.', '')}`,
        label: `quota numeric curve + k=${k} + reserve fill`,
        poolPolicy: 'quotaShapeFromPool' as const,
        reserveFractionK: k,
        autoFillPriceMode: 'reserve' as const,
      })),
  ];
}

function shapePool(
  policy: PoolShapePolicyName,
  candidates: readonly AuctionSimPlayer[],
  targetSize: number,
): PoolShapeResult {
  if (policy === 'currentPool') return currentPool(candidates);
  return quotaShapeFromPool(candidates, { targetSize });
}

function objectiveScore(row: Pick<
  ScenarioMatrixRow,
  | 'budgetRemainingAtRosterSpot11Ratio'
  | 'rosterStrengthSpread'
  | 'highTailShare'
  | 'middleMassShare'
  | 'barbellIndex'
  | 'gradeDistributionDistanceFromTarget'
  | 'eliteConcentration'
  | 'freeAutoFillCount'
>): number {
  const medianSpot11 = statMedian(row.budgetRemainingAtRosterSpot11Ratio);
  const medianSpread = statMedian(row.rosterStrengthSpread);
  const eliteConcentration = statMedian(row.eliteConcentration);
  const freeAutoFill = statMedian(row.freeAutoFillCount);
  return (
    Math.abs(medianSpot11 - 0.40) +
    Math.max(0, medianSpread - 0.05) +
    Math.max(0, row.highTailShare - NUMERIC_GRADE_TARGET.highTailCap) +
    Math.max(0, NUMERIC_GRADE_TARGET.targetMiddleMass - row.middleMassShare) +
    row.barbellIndex +
    row.gradeDistributionDistanceFromTarget +
    Math.max(0, eliteConcentration - 0.40) +
    (freeAutoFill > 0 ? freeAutoFill / 100 : 0)
  );
}

export function runScenarioMatrix(input: ScenarioMatrixInput): ScenarioMatrixResult {
  const baseConfig = normalizeAuctionSimConfig(input.baseConfig);
  const quotaTargetSize =
    input.quotaTargetSize ??
    Math.min(
      input.currentPool.length,
      Math.ceil(baseConfig.teamCount * baseConfig.rosterSize * 1.25),
    );
  const scenarios = input.scenarios ?? defaultScenarioDefinitions();
  const rows: ScenarioMatrixRow[] = [];

  for (const scenario of scenarios) {
    const shape = shapePool(scenario.poolPolicy, input.currentPool, quotaTargetSize);
    const poolDiagnostics = buildNumericPoolDiagnostics(shape.players, baseConfig, input.teams, AUCTION_SIM_K_SWEEP);
    const spot11: number[] = [];
    const strengthSpread: number[] = [];
    const autoFillCount: number[] = [];
    const freeAutoFillCount: number[] = [];
    const paidAutoFillCount: number[] = [];
    const belowReserveSaleCount: number[] = [];
    const eliteConcentration: number[] = [];
    const coreBidRate: number[] = [];
    const finalBudget: number[] = [];

    for (const nominationPolicy of input.nominationPolicies) {
      for (const seed of input.seeds) {
        const sim = simulateAuction(shape.players, input.teams, {
          ...baseConfig,
          nominationPolicy,
          seed: `${seed}:${scenario.id}:${nominationPolicy}`,
          reserveFractionK: scenario.reserveFractionK,
          autoFillPriceMode: scenario.autoFillPriceMode,
        });
        spot11.push(sim.economyDiagnostics.medianBudgetRemainingAtRosterSpot11Ratio ?? 0);
        strengthSpread.push(sim.rosterStrengthMetrics.rosterStrengthSpread);
        autoFillCount.push(sim.economyDiagnostics.autoFillCount);
        freeAutoFillCount.push(sim.economyDiagnostics.freeAutoFillCount);
        paidAutoFillCount.push(sim.economyDiagnostics.paidAutoFillCount);
        belowReserveSaleCount.push(sim.economyDiagnostics.belowReserveSaleCount);
        eliteConcentration.push(sim.rosterStrengthMetrics.eliteConcentration);
        coreBidRate.push(sim.economyDiagnostics.coreBidRate ?? 0);
        finalBudget.push(mean(Object.values(sim.economyDiagnostics.finalBudgetByTeam)));
      }
    }

    const rowBase = {
      scenarioId: scenario.id,
      label: scenario.label,
      poolPolicy: scenario.poolPolicy,
      reserveFractionK: scenario.reserveFractionK,
      autoFillPriceMode: scenario.autoFillPriceMode,
      nominationPolicies: input.nominationPolicies,
      seeds: input.seeds,
      poolSize: shape.selectedSize,
      targetSize: shape.targetSize,
      quotaShortfallCount: shape.quotaShortfalls.length,
      medianNumericGrade: poolDiagnostics.medianNumericGrade,
      medianLetterGrade: poolDiagnostics.medianNumericGrade === null
        ? null
        : numericScoreToSmb4Grade(poolDiagnostics.medianNumericGrade).grade,
      highTailShare: poolDiagnostics.highTailShare,
      middleMassShare: poolDiagnostics.middleMassShare,
      lowTailShare: poolDiagnostics.lowTailShare,
      barbellIndex: poolDiagnostics.barbellIndex,
      gradeDistributionDistanceFromTarget: poolDiagnostics.distributionDistanceFromTarget,
      budgetRemainingAtRosterSpot11Ratio: stat(spot11),
      rosterStrengthSpread: stat(strengthSpread),
      autoFillCount: stat(autoFillCount),
      freeAutoFillCount: stat(freeAutoFillCount),
      paidAutoFillCount: stat(paidAutoFillCount),
      belowReserveSaleCount: stat(belowReserveSaleCount),
      eliteConcentration: stat(eliteConcentration),
      coreBidRate: stat(coreBidRate),
      finalBudget: stat(finalBudget),
    };
    const score = objectiveScore(rowBase);
    rows.push({
      ...rowBase,
      objectiveScore: score,
      reachesSpot11BudgetTarget:
        statMedian(rowBase.budgetRemainingAtRosterSpot11Ratio) >= 0.35 &&
        statMedian(rowBase.budgetRemainingAtRosterSpot11Ratio) <= 0.45,
      reachesStrengthSpreadTarget: statMedian(rowBase.rosterStrengthSpread) <= 0.05,
      reachesNoFreeAutoFillTarget: statMedian(rowBase.freeAutoFillCount) === 0,
      reachesNoBelowReserveSaleTarget: statMedian(rowBase.belowReserveSaleCount) === 0,
      reachesHighTailTarget: rowBase.highTailShare <= NUMERIC_GRADE_TARGET.highTailCap,
    });
  }

  const topCandidates = [...rows].sort(
    (left, right) => left.objectiveScore - right.objectiveScore || left.scenarioId.localeCompare(right.scenarioId),
  ).slice(0, 5);
  return { rows, topCandidates };
}

function fmtPct(value: number | null): string {
  return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function fmtNum(value: number | null, digits = 2): string {
  return value === null ? 'n/a' : value.toFixed(digits);
}

export function formatScenarioMatrixMarkdown(result: ScenarioMatrixResult): string {
  const lines = [
    '| Scenario | k | Pool | Median Grade | High Tail | Middle Mass | Barbell | Spot11 Med | Strength Spread Med | Free Fill Med | Below Reserve Med | Score |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const row of result.rows) {
    lines.push(
      `| ${row.label} | ${row.reserveFractionK} | ${row.poolSize}/${row.targetSize} | ${
        row.medianNumericGrade === null ? 'n/a' : `${row.medianNumericGrade.toFixed(1)} (${row.medianLetterGrade})`
      } | ${fmtPct(row.highTailShare)} | ${fmtPct(row.middleMassShare)} | ${fmtNum(row.barbellIndex)} | ${
        fmtPct(row.budgetRemainingAtRosterSpot11Ratio.median)
      } | ${fmtPct(row.rosterStrengthSpread.median)} | ${fmtNum(row.freeAutoFillCount.median, 0)} | ${
        fmtNum(row.belowReserveSaleCount.median, 0)
      } | ${
        row.objectiveScore.toFixed(3)
      } |`,
    );
  }

  lines.push('', 'Top 5 candidate configs:', '');
  for (let i = 0; i < result.topCandidates.length; i += 1) {
    const row = result.topCandidates[i];
    lines.push(
      `${i + 1}. ${row.label} — score ${row.objectiveScore.toFixed(3)}; spot11 ${
        fmtPct(row.budgetRemainingAtRosterSpot11Ratio.median)
      }; spread ${fmtPct(row.rosterStrengthSpread.median)}; median grade ${
        row.medianNumericGrade === null ? 'n/a' : `${row.medianNumericGrade.toFixed(1)} (${row.medianLetterGrade})`
      }; free fill ${fmtNum(row.freeAutoFillCount.median, 0)}; below reserve ${
        fmtNum(row.belowReserveSaleCount.median, 0)
      }`,
    );
  }
  return lines.join('\n');
}
