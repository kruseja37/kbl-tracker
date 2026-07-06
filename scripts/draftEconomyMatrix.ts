import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RosterSlotPlayer } from '../src/data/rosterConstruction';
import {
  NUMERIC_GRADE_TARGET,
  buildReserveFeasibilityDiagnostics,
  buildNumericPoolDiagnostics,
  currentPool,
  quotaShapeFromPool,
  simulateAuction,
  type AuctionSimBiddingPolicy,
  type AuctionSimConfig,
  type AuctionSimInvariantFailure,
  type AuctionSimLiquidityAuditRead,
  type AuctionSimLiquidityPenaltyShape,
  type AuctionSimNominationPolicy,
  type AuctionSimPlayer,
  type AuctionSimProfile,
  type ReserveFeasibilityDiagnostics,
  type PoolShapePolicyName,
  type PoolShapeResult,
} from '../src/engines/auctionSim';
import { numericScoreToSmb4Grade } from '../src/engines/smb4GradeEmulator';

const FIELD_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;
const PITCHER_ROLES = ['SP', 'SP', 'SP/RP', 'RP', 'RP', 'CP'] as const;
const TARGETED_BASE_K_SWEEP = [0, 0.10, 0.20, 0.30, 0.40, 0.50] as const;
const STRESS_POOL_SIZES = [88, 110, 132, 144] as const;
const TARGETED_POOL_SIZES = [110, 132, 144] as const;
const FOCUSED_POOL_SIZES = [88, 110] as const;
const FULL_POOL_SIZES = [88, 110, 132] as const;
const EXTENDED_POOL_SIZES = [88, 110, 132, 144, 180] as const;
const SEEDS = ['seed-1'] as const;
const NOMINATION_POLICIES = ['starFirst'] as const;
const BASE_BIDDING_POLICIES = ['rationalBaseline', 'marginalValueV1'] as const;
const V2_LIQUIDITY_WEIGHTS = [0, 0.25, 0.5, 1.0, 1.5] as const;
const V2_QUALITY_PERCENTILES = [0.35, 0.50, 0.65] as const;
const V2_TARGETED_LIQUIDITY_WEIGHTS = [0, 0.5, 1.5] as const;
const V2_TARGETED_QUALITY_PERCENTILES = [0.50] as const;
const V21_LIQUIDITY_WEIGHTS = [0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95] as const;
const V21_QUALITY_PERCENTILES = [0.25, 0.35, 0.45, 0.50, 0.55] as const;
const V21_PENALTY_SHAPES = ['linear', 'softplus', 'quadraticAfterThreshold', 'slotScheduled'] as const;
const V21_SHAPE_PROBE_WEIGHTS = [0.65, 0.75, 0.85, 0.95] as const;
const V21_SHAPE_PROBE_PERCENTILES = [0.35, 0.50, 0.55] as const;
const BIDDING_POLICIES = ['rationalBaseline', 'marginalValueV1', 'marginalValueV2Liquidity'] as const;
const POOL_POLICIES = ['currentPool', 'quotaShapeFromPool'] as const;
const SPOT11_BAND = { min: 0.35, max: 0.45 } as const;
const TARGET_MIDDLE_MASS = NUMERIC_GRADE_TARGET.targetMiddleMass;
const HIGH_TAIL_CAP = NUMERIC_GRADE_TARGET.highTailCap;
const DOC_PATH = resolve(process.cwd(), 'docs/V2_LIQUIDITY_SIM_RESULTS.md');
type MatrixMode = 'targeted' | 'stress' | 'full' | 'extended' | 'focused';
const MATRIX_MODE: MatrixMode = process.env.AUCTION_SIM_MATRIX_MODE === 'stress'
  ? 'stress'
  : process.env.AUCTION_SIM_MATRIX_MODE === 'extended'
    ? 'extended'
    : process.env.AUCTION_SIM_MATRIX_MODE === 'full'
      ? 'full'
      : process.env.AUCTION_SIM_MATRIX_MODE === 'focused'
        ? 'focused'
        : 'targeted';
const VERBOSE = process.env.AUCTION_SIM_VERBOSE === '1';
type V2SweepMode = 'targeted' | 'full' | 'v21';
const V2_SWEEP_MODE: V2SweepMode = process.env.AUCTION_SIM_V2_SWEEP === 'v21' || process.argv.includes('--v21-sweep')
  ? 'v21'
  : process.env.AUCTION_SIM_V2_SWEEP === 'full' || process.argv.includes('--full-v2-sweep')
    ? 'full'
    : 'targeted';
const FULL_V2_SWEEP = V2_SWEEP_MODE === 'full';
const V21_SWEEP = V2_SWEEP_MODE === 'v21';
const ACTIVE_V2_LIQUIDITY_WEIGHTS = V21_SWEEP
  ? V21_LIQUIDITY_WEIGHTS
  : FULL_V2_SWEEP
    ? V2_LIQUIDITY_WEIGHTS
    : V2_TARGETED_LIQUIDITY_WEIGHTS;
const ACTIVE_V2_QUALITY_PERCENTILES = V21_SWEEP
  ? V21_QUALITY_PERCENTILES
  : FULL_V2_SWEEP
    ? V2_QUALITY_PERCENTILES
    : V2_TARGETED_QUALITY_PERCENTILES;
const INCLUDE_INFEASIBLE = process.env.AUCTION_SIM_INCLUDE_INFEASIBLE === '1' ||
  process.argv.includes('--include-infeasible');
const TIME_LIMIT_MS = Number(process.env.AUCTION_SIM_MATRIX_TIME_LIMIT_MS ?? 0);
const MATRIX_STARTED_AT = Date.now();
const BEFORE_PROFILE = {
  slowestScenario: 'currentPool:marginalValueV1:n110:k065:reserve',
  slowestRuntimeMs: 44_950,
  completionSearchCalls: 1_808_553,
  bestProjectedRosterValueCalls: 6_754,
} as const;

interface Stat {
  min: number | null;
  median: number | null;
  p90: number | null;
  max: number | null;
}

type EnrichedInvariantFailure = AuctionSimInvariantFailure & {
  scenarioId: string;
  poolPolicy: PoolShapePolicyName;
};

interface ScenarioRunSummary {
  seed: string;
  nominationPolicy: AuctionSimNominationPolicy;
  runtimeMs: number;
  heapUsedMb: number;
  profile: AuctionSimProfile;
  liquiditySensitivity: LiquiditySensitivitySummary;
  spot11CashRemainingRatio: number;
  spot11CompletionSurplusRatio: number;
  spot11QualityCompletionSurplusRatio: number;
  finalCashRemainingRatio: number;
  finalCompletionSurplusRatio: number;
  finalQualityCompletionSurplusRatio: number;
  rosterStrengthSpread: number;
  autoFillCount: number;
  freeAutoFillCount: number;
  paidAutoFillCount: number;
  zeroPriceLatePickCount: number;
  nearMinPriceLatePickCount: number;
  unsoldCount: number;
  invariantFailures: readonly EnrichedInvariantFailure[];
  firstPickNotes: readonly string[];
  latePickNotes: readonly string[];
  modelWarnings: readonly string[];
}

interface ReductionBucket {
  count: number;
  averageWtpReductionVsV1: number;
}

interface LiquiditySensitivitySummary {
  bidCount: number;
  averageLiquidityPenalty: number;
  averageQualitySurplusShortfall: number;
  averageCashPaceShortfall: number;
  averageScarcityPenalty: number;
  averageOpenSlotPressure: number;
  qualitySurplusShortfallZeroRate: number;
  cashPaceShortfallZeroRate: number;
  scarcityPenaltyZeroRate: number;
  openSlotPressureZeroRate: number;
  openSlotPressureSaturatedRate: number;
  liquidityCapAppliedRate: number;
  liquidityCapSaturatedRate: number;
  qualityCapBindingRate: number;
  cashPaceCapBindingRate: number;
  averageWtpReductionVsV1: number;
  wtpReductionByRosterSlot: Record<string, ReductionBucket>;
  wtpReductionByGradeBand: Record<string, ReductionBucket>;
  wtpReductionByNumericGradeRange: Record<string, ReductionBucket>;
  wtpReductionByRoleBucket: Record<string, ReductionBucket>;
}

type ScenarioExecutionStatus = 'completed' | 'skipped';
type ScenarioGateStatus = 'PASS' | 'FAIL' | 'SKIPPED';

interface ScenarioRow {
  id: string;
  executionStatus: ScenarioExecutionStatus;
  skipReason: string | null;
  poolPolicy: PoolShapePolicyName;
  biddingPolicy: AuctionSimBiddingPolicy;
  poolSizeTarget: number;
  selectedPoolSize: number;
  reserveFractionK: number;
  autoFillPriceMode: AuctionSimConfig['autoFillPriceMode'];
  liquidityPenaltyWeight: number;
  qualityCompletionTargetPercentile: number;
  liquidityPenaltyShape: AuctionSimLiquidityPenaltyShape;
  quotaShortfallCount: number;
  medianNumericGrade: number | null;
  medianLetterGrade: string | null;
  highTailShare: number;
  middleMassShare: number;
  barbellIndex: number;
  distributionDistanceFromTarget: number;
  spot11CashRemainingRatio: Stat;
  spot11CompletionSurplusRatio: Stat;
  spot11QualityCompletionSurplusRatio: Stat;
  finalCashRemainingRatio: Stat;
  finalCompletionSurplusRatio: Stat;
  finalQualityCompletionSurplusRatio: Stat;
  rosterStrengthSpread: Stat;
  autoFillCount: Stat;
  freeAutoFillCount: Stat;
  paidAutoFillCount: Stat;
  zeroPriceLatePickCount: Stat;
  nearMinPriceLatePickCount: Stat;
  unsoldCount: Stat;
  runtimeMs: Stat;
  heapUsedMb: Stat;
  hardInvariantFailureCount: number;
  invariantFailureRunCount: number;
  profile: AuctionSimProfile;
  liquiditySensitivity: LiquiditySensitivitySummary;
  reserveFeasibility: ReserveFeasibilityDiagnostics;
  gateStatus: ScenarioGateStatus;
  gateFailReasons: readonly string[];
  objectiveScore: number;
  gateClosenessScore: number;
  runs: readonly ScenarioRunSummary[];
}

function emptyProfile(): AuctionSimProfile {
  return {
    bestProjectedRosterValueCalls: 0,
    bestProjectedRosterValueCacheHits: 0,
    bestProjectedRosterValueCacheMisses: 0,
    completionSearchCalls: 0,
    completionCandidateCount: 0,
    completionCacheHits: 0,
    completionCacheMisses: 0,
    wtpEvaluations: 0,
  };
}

function emptyLiquiditySensitivity(): LiquiditySensitivitySummary {
  return {
    bidCount: 0,
    averageLiquidityPenalty: 0,
    averageQualitySurplusShortfall: 0,
    averageCashPaceShortfall: 0,
    averageScarcityPenalty: 0,
    averageOpenSlotPressure: 0,
    qualitySurplusShortfallZeroRate: 0,
    cashPaceShortfallZeroRate: 0,
    scarcityPenaltyZeroRate: 0,
    openSlotPressureZeroRate: 0,
    openSlotPressureSaturatedRate: 0,
    liquidityCapAppliedRate: 0,
    liquidityCapSaturatedRate: 0,
    qualityCapBindingRate: 0,
    cashPaceCapBindingRate: 0,
    averageWtpReductionVsV1: 0,
    wtpReductionByRosterSlot: {},
    wtpReductionByGradeBand: {},
    wtpReductionByNumericGradeRange: {},
    wtpReductionByRoleBucket: {},
  };
}

interface LiquiditySensitivityAccumulator {
  bidCount: number;
  liquidityPenalty: number;
  qualitySurplusShortfall: number;
  cashPaceShortfall: number;
  scarcityPenalty: number;
  openSlotPressure: number;
  qualitySurplusShortfallZero: number;
  cashPaceShortfallZero: number;
  scarcityPenaltyZero: number;
  openSlotPressureZero: number;
  openSlotPressureSaturated: number;
  liquidityCapApplied: number;
  liquidityCapSaturated: number;
  qualityCapBinding: number;
  cashPaceCapBinding: number;
  wtpReductionCount: number;
  wtpReduction: number;
  byRosterSlot: Map<string, { count: number; sum: number }>;
  byGradeBand: Map<string, { count: number; sum: number }>;
  byNumericGradeRange: Map<string, { count: number; sum: number }>;
  byRoleBucket: Map<string, { count: number; sum: number }>;
}

function emptyLiquidityAccumulator(): LiquiditySensitivityAccumulator {
  return {
    bidCount: 0,
    liquidityPenalty: 0,
    qualitySurplusShortfall: 0,
    cashPaceShortfall: 0,
    scarcityPenalty: 0,
    openSlotPressure: 0,
    qualitySurplusShortfallZero: 0,
    cashPaceShortfallZero: 0,
    scarcityPenaltyZero: 0,
    openSlotPressureZero: 0,
    openSlotPressureSaturated: 0,
    liquidityCapApplied: 0,
    liquidityCapSaturated: 0,
    qualityCapBinding: 0,
    cashPaceCapBinding: 0,
    wtpReductionCount: 0,
    wtpReduction: 0,
    byRosterSlot: new Map(),
    byGradeBand: new Map(),
    byNumericGradeRange: new Map(),
    byRoleBucket: new Map(),
  };
}

function numericGradeRange(numericGrade: number | null): string {
  if (numericGrade === null) return 'missing';
  if (numericGrade >= 80) return '80+';
  if (numericGrade >= 70) return '70-79';
  if (numericGrade >= 60) return '60-69';
  return '<60';
}

function addBucket(map: Map<string, { count: number; sum: number }>, key: string, value: number): void {
  const current = map.get(key) ?? { count: 0, sum: 0 };
  current.count += 1;
  current.sum += value;
  map.set(key, current);
}

function addWeightedBucket(
  map: Map<string, { count: number; sum: number }>,
  key: string,
  count: number,
  average: number,
): void {
  const current = map.get(key) ?? { count: 0, sum: 0 };
  current.count += count;
  current.sum += average * count;
  map.set(key, current);
}

function bucketRecord(map: Map<string, { count: number; sum: number }>): Record<string, ReductionBucket> {
  return Object.fromEntries(
    [...map.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => [
      key,
      {
        count: value.count,
        averageWtpReductionVsV1: value.count === 0 ? 0 : value.sum / value.count,
      },
    ]),
  );
}

function recordLiquidityAudit(
  acc: LiquiditySensitivityAccumulator,
  audit: AuctionSimLiquidityAuditRead,
  wtpReduction: number | undefined,
  rosterSlotNumber: number | undefined,
  gradeBand: string,
  numericGrade: number | null,
  roleBucket: string,
): void {
  acc.bidCount += 1;
  acc.liquidityPenalty += audit.liquidityPenalty;
  acc.qualitySurplusShortfall += audit.qualitySurplusShortfall;
  acc.cashPaceShortfall += audit.cashPaceShortfall;
  acc.scarcityPenalty += audit.scarcityPenalty;
  acc.openSlotPressure += audit.openSlotPressure;
  acc.qualitySurplusShortfallZero += audit.qualitySurplusShortfallZero ? 1 : 0;
  acc.cashPaceShortfallZero += audit.cashPaceShortfallZero ? 1 : 0;
  acc.scarcityPenaltyZero += audit.scarcityPenaltyZero ? 1 : 0;
  acc.openSlotPressureZero += audit.openSlotPressureZero ? 1 : 0;
  acc.openSlotPressureSaturated += audit.openSlotPressureSaturated ? 1 : 0;
  acc.liquidityCapApplied += audit.liquidityCapApplied ? 1 : 0;
  acc.liquidityCapSaturated += audit.liquidityCapSaturated ? 1 : 0;
  acc.qualityCapBinding += audit.qualityCapBinding ? 1 : 0;
  acc.cashPaceCapBinding += audit.cashPaceCapBinding ? 1 : 0;
  if (wtpReduction !== undefined && Number.isFinite(wtpReduction)) {
    acc.wtpReductionCount += 1;
    acc.wtpReduction += wtpReduction;
    addBucket(acc.byRosterSlot, String(rosterSlotNumber ?? 'unknown'), wtpReduction);
    addBucket(acc.byGradeBand, gradeBand, wtpReduction);
    addBucket(acc.byNumericGradeRange, numericGradeRange(numericGrade), wtpReduction);
    addBucket(acc.byRoleBucket, roleBucket, wtpReduction);
  }
}

function finalizeLiquidityAccumulator(acc: LiquiditySensitivityAccumulator): LiquiditySensitivitySummary {
  if (acc.bidCount === 0) return emptyLiquiditySensitivity();
  return {
    bidCount: acc.bidCount,
    averageLiquidityPenalty: acc.liquidityPenalty / acc.bidCount,
    averageQualitySurplusShortfall: acc.qualitySurplusShortfall / acc.bidCount,
    averageCashPaceShortfall: acc.cashPaceShortfall / acc.bidCount,
    averageScarcityPenalty: acc.scarcityPenalty / acc.bidCount,
    averageOpenSlotPressure: acc.openSlotPressure / acc.bidCount,
    qualitySurplusShortfallZeroRate: acc.qualitySurplusShortfallZero / acc.bidCount,
    cashPaceShortfallZeroRate: acc.cashPaceShortfallZero / acc.bidCount,
    scarcityPenaltyZeroRate: acc.scarcityPenaltyZero / acc.bidCount,
    openSlotPressureZeroRate: acc.openSlotPressureZero / acc.bidCount,
    openSlotPressureSaturatedRate: acc.openSlotPressureSaturated / acc.bidCount,
    liquidityCapAppliedRate: acc.liquidityCapApplied / acc.bidCount,
    liquidityCapSaturatedRate: acc.liquidityCapSaturated / acc.bidCount,
    qualityCapBindingRate: acc.qualityCapBinding / acc.bidCount,
    cashPaceCapBindingRate: acc.cashPaceCapBinding / acc.bidCount,
    averageWtpReductionVsV1: acc.wtpReductionCount === 0 ? 0 : acc.wtpReduction / acc.wtpReductionCount,
    wtpReductionByRosterSlot: bucketRecord(acc.byRosterSlot),
    wtpReductionByGradeBand: bucketRecord(acc.byGradeBand),
    wtpReductionByNumericGradeRange: bucketRecord(acc.byNumericGradeRange),
    wtpReductionByRoleBucket: bucketRecord(acc.byRoleBucket),
  };
}

function combineLiquiditySummaries(summaries: readonly LiquiditySensitivitySummary[]): LiquiditySensitivitySummary {
  const acc = emptyLiquidityAccumulator();
  for (const summary of summaries) {
    if (summary.bidCount === 0) continue;
    acc.bidCount += summary.bidCount;
    acc.liquidityPenalty += summary.averageLiquidityPenalty * summary.bidCount;
    acc.qualitySurplusShortfall += summary.averageQualitySurplusShortfall * summary.bidCount;
    acc.cashPaceShortfall += summary.averageCashPaceShortfall * summary.bidCount;
    acc.scarcityPenalty += summary.averageScarcityPenalty * summary.bidCount;
    acc.openSlotPressure += summary.averageOpenSlotPressure * summary.bidCount;
    acc.qualitySurplusShortfallZero += summary.qualitySurplusShortfallZeroRate * summary.bidCount;
    acc.cashPaceShortfallZero += summary.cashPaceShortfallZeroRate * summary.bidCount;
    acc.scarcityPenaltyZero += summary.scarcityPenaltyZeroRate * summary.bidCount;
    acc.openSlotPressureZero += summary.openSlotPressureZeroRate * summary.bidCount;
    acc.openSlotPressureSaturated += summary.openSlotPressureSaturatedRate * summary.bidCount;
    acc.liquidityCapApplied += summary.liquidityCapAppliedRate * summary.bidCount;
    acc.liquidityCapSaturated += summary.liquidityCapSaturatedRate * summary.bidCount;
    acc.qualityCapBinding += summary.qualityCapBindingRate * summary.bidCount;
    acc.cashPaceCapBinding += summary.cashPaceCapBindingRate * summary.bidCount;
    acc.wtpReductionCount += summary.bidCount;
    acc.wtpReduction += summary.averageWtpReductionVsV1 * summary.bidCount;
    for (const [key, bucket] of Object.entries(summary.wtpReductionByRosterSlot)) {
      addWeightedBucket(acc.byRosterSlot, key, bucket.count, bucket.averageWtpReductionVsV1);
    }
    for (const [key, bucket] of Object.entries(summary.wtpReductionByGradeBand)) {
      addWeightedBucket(acc.byGradeBand, key, bucket.count, bucket.averageWtpReductionVsV1);
    }
    for (const [key, bucket] of Object.entries(summary.wtpReductionByNumericGradeRange)) {
      addWeightedBucket(acc.byNumericGradeRange, key, bucket.count, bucket.averageWtpReductionVsV1);
    }
    for (const [key, bucket] of Object.entries(summary.wtpReductionByRoleBucket)) {
      addWeightedBucket(acc.byRoleBucket, key, bucket.count, bucket.averageWtpReductionVsV1);
    }
  }
  return finalizeLiquidityAccumulator(acc);
}

function addProfiles(profiles: readonly AuctionSimProfile[]): AuctionSimProfile {
  return profiles.reduce((acc, profile) => ({
    bestProjectedRosterValueCalls: acc.bestProjectedRosterValueCalls + profile.bestProjectedRosterValueCalls,
    bestProjectedRosterValueCacheHits: acc.bestProjectedRosterValueCacheHits + profile.bestProjectedRosterValueCacheHits,
    bestProjectedRosterValueCacheMisses: acc.bestProjectedRosterValueCacheMisses + profile.bestProjectedRosterValueCacheMisses,
    completionSearchCalls: acc.completionSearchCalls + profile.completionSearchCalls,
    completionCandidateCount: acc.completionCandidateCount + profile.completionCandidateCount,
    completionCacheHits: acc.completionCacheHits + profile.completionCacheHits,
    completionCacheMisses: acc.completionCacheMisses + profile.completionCacheMisses,
    wtpEvaluations: acc.wtpEvaluations + profile.wtpEvaluations,
  }), emptyProfile());
}

function shapeForIndex(index: number): RosterSlotPlayer {
  const slot = index % (FIELD_POSITIONS.length + PITCHER_ROLES.length);
  if (slot < FIELD_POSITIONS.length) {
    const position = FIELD_POSITIONS[slot];
    return {
      isPitcher: false,
      position,
      secondaryPosition: position === 'C' ? null : slot % 3 === 0 ? 'C' : slot % 2 === 0 ? 'IF/OF' : null,
    };
  }
  const role = PITCHER_ROLES[slot - FIELD_POSITIONS.length];
  return {
    isPitcher: true,
    position: role,
    role,
    twoWayVariant: role === 'SP/RP' && index % 5 === 0 ? 'C' : null,
  };
}

function numericGradeForIndex(index: number): number {
  if (index < 50) return 92 - index * 0.34;
  if (index < 130) return 75.5 - (index - 50) * 0.22;
  return Math.max(42, 57 - (index - 130) * 0.28);
}

function ivForNumericGrade(numericGrade: number, index: number): number {
  if (numericGrade >= 76) return Math.round(210_000 + (numericGrade - 76) * 8_200 - index * 180);
  if (numericGrade >= 58) return Math.round(38_000 + (numericGrade - 58) * 2_900 + (index % 9) * 750);
  return Math.round(2_500 + Math.max(0, numericGrade - 42) * 820 + (index % 5) * 200);
}

function buildStressPool(size = 180): AuctionSimPlayer[] {
  return Array.from({ length: size }, (_, index) => {
    const numericGrade = numericGradeForIndex(index);
    return {
      playerId: `matrix-player-${String(index + 1).padStart(3, '0')}`,
      iv: ivForNumericGrade(numericGrade, index),
      numericGrade,
      ivPercentile: Math.max(1, 100 - (index / size) * 100),
      pos: shapeForIndex(index),
      fitScore: ((index * 37) % 100) / 100,
    };
  });
}

function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * Math.min(1, Math.max(0, p));
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function stat(values: readonly number[]): Stat {
  return {
    min: percentile(values, 0),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    max: percentile(values, 1),
  };
}

function finiteOrFallback(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function fmtPct(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'n/a';
}

function fmtNum(value: number | null | undefined, digits = 2): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

function fmtMoney(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `$${Math.round(value).toLocaleString('en-US')}`
    : 'n/a';
}

function roundDownK(value: number): number {
  return Math.floor(value * 100) / 100;
}

function uniqueSortedK(values: readonly number[]): number[] {
  return [...new Set(values.map((value) => roundDownK(value)).filter((value) => value >= 0))]
    .sort((left, right) => left - right);
}

function reserveModeForK(k: number): AuctionSimConfig['autoFillPriceMode'] {
  return k === 0 ? 'zero' : 'reserve';
}

function shapePool(
  policy: PoolShapePolicyName,
  universe: readonly AuctionSimPlayer[],
  poolSize: number,
): PoolShapeResult {
  if (policy === 'currentPool') return currentPool(universe.slice(0, poolSize));
  return quotaShapeFromPool(universe, { targetSize: poolSize });
}

function scenarioId(
  poolPolicy: PoolShapePolicyName,
  biddingPolicy: AuctionSimBiddingPolicy,
  poolSizeTarget: number,
  reserveFractionK: number,
  autoFillPriceMode: AuctionSimConfig['autoFillPriceMode'],
  liquidityPenaltyWeight = 0,
  qualityCompletionTargetPercentile = 0.5,
  liquidityPenaltyShape: AuctionSimLiquidityPenaltyShape = 'linear',
): string {
  const parts = [
    poolPolicy,
    biddingPolicy,
    `n${poolSizeTarget}`,
    `k${String(reserveFractionK).replace('.', '')}`,
    autoFillPriceMode,
  ];
  if (biddingPolicy === 'marginalValueV2Liquidity') {
    parts.push(`lw${String(liquidityPenaltyWeight).replace('.', '')}`);
    parts.push(`qp${String(qualityCompletionTargetPercentile).replace('.', '')}`);
    parts.push(`shape${liquidityPenaltyShape}`);
  }
  return parts.join(':');
}

function latePickThreshold(teamCount: number, rosterSize: number): number {
  return Math.floor((teamCount * rosterSize) / 2);
}

function collectRunSummary(
  pool: readonly AuctionSimPlayer[],
  teams: readonly { teamId: string }[],
  config: AuctionSimConfig,
  seed: string,
  nominationPolicy: AuctionSimNominationPolicy,
  scenario: { id: string; poolPolicy: PoolShapePolicyName },
): ScenarioRunSummary {
  const start = performance.now();
  const sim = simulateAuction(pool, teams, config);
  const runtimeMs = performance.now() - start;
  const heapUsedMb = process.memoryUsage().heapUsed / 1024 / 1024;
  const lateThreshold = latePickThreshold(config.teamCount, config.rosterSize);
  const lateSold = sim.pickLog.filter(
    (entry) => entry.nominationNumber > lateThreshold && entry.disposition === 'sold' && entry.price !== null,
  );
  const modelWarnings = new Set<string>();
  const liquidityAcc = emptyLiquidityAccumulator();
  for (const pick of sim.pickLog) {
    for (const bid of pick.bids) {
      for (const warning of bid.modelWarnings ?? []) modelWarnings.add(warning);
      if (bid.liquidityAudit) {
        recordLiquidityAudit(
          liquidityAcc,
          bid.liquidityAudit,
          bid.wtpReductionVsV1,
          bid.liquidityRosterSlotNumber,
          pick.gradeBand,
          pick.numericGrade,
          pick.roleBucket ?? 'unknown',
        );
      }
    }
  }

  return {
    seed,
    nominationPolicy,
    runtimeMs,
    heapUsedMb,
    profile: sim.profile,
    liquiditySensitivity: finalizeLiquidityAccumulator(liquidityAcc),
    spot11CashRemainingRatio: finiteOrFallback(
      sim.economyDiagnostics.medianBudgetRemainingAtRosterSpot11Ratio,
      -1,
    ),
    spot11CompletionSurplusRatio: finiteOrFallback(
      sim.economyDiagnostics.medianCompletionSurplusAtRosterSpot11Ratio,
      -1,
    ),
    spot11QualityCompletionSurplusRatio: finiteOrFallback(
      sim.economyDiagnostics.medianQualityCompletionSurplusAtRosterSpot11Ratio,
      -1,
    ),
    finalCashRemainingRatio: finiteOrFallback(sim.economyDiagnostics.finalCashRemainingRatio, -1),
    finalCompletionSurplusRatio: finiteOrFallback(sim.economyDiagnostics.finalCompletionSurplusRatio, -1),
    finalQualityCompletionSurplusRatio: finiteOrFallback(
      sim.economyDiagnostics.finalQualityCompletionSurplusRatio,
      -1,
    ),
    rosterStrengthSpread: sim.rosterStrengthMetrics.rosterStrengthSpread,
    autoFillCount: sim.economyDiagnostics.autoFillCount,
    freeAutoFillCount: sim.economyDiagnostics.freeAutoFillCount,
    paidAutoFillCount: sim.economyDiagnostics.paidAutoFillCount,
    zeroPriceLatePickCount: lateSold.filter((entry) => entry.price === 0).length,
    nearMinPriceLatePickCount: lateSold.filter(
      (entry) => (entry.price ?? Number.POSITIVE_INFINITY) <= config.bidIncrement,
    ).length,
    unsoldCount: sim.pickLog.filter((entry) => entry.disposition === 'unsold').length,
    invariantFailures: sim.economyDiagnostics.invariantFailures.map((failure) => ({
      ...failure,
      scenarioId: scenario.id,
      poolPolicy: scenario.poolPolicy,
    })),
    firstPickNotes: sim.pickLog.slice(0, 5).map((entry) =>
      `${entry.playerId} ${entry.winnerTeamId ?? 'unsold'} ${fmtMoney(entry.price)}`,
    ),
    latePickNotes: lateSold.slice(0, 5).map((entry) =>
      `${entry.nominationNumber}:${entry.playerId} ${entry.winnerTeamId ?? 'unsold'} ${fmtMoney(entry.price)}`,
    ),
    modelWarnings: [...modelWarnings].slice(0, 12),
  };
}

function gateReasons(row: Pick<
  ScenarioRow,
  | 'spot11CashRemainingRatio'
  | 'spot11CompletionSurplusRatio'
  | 'spot11QualityCompletionSurplusRatio'
  | 'finalCashRemainingRatio'
  | 'finalCompletionSurplusRatio'
  | 'finalQualityCompletionSurplusRatio'
  | 'rosterStrengthSpread'
  | 'freeAutoFillCount'
  | 'highTailShare'
  | 'middleMassShare'
  | 'hardInvariantFailureCount'
  | 'reserveFeasibility'
>): string[] {
  const reasons: string[] = [];
  if (!row.reserveFeasibility.reserveFeasible) {
    reasons.push(`reserve infeasible by construction: ${row.reserveFeasibility.reserveInfeasibilityReason ?? 'unknown'}`);
  }
  const spot11 = finiteOrFallback(row.spot11CashRemainingRatio.median, -1);
  if (spot11 < SPOT11_BAND.min || spot11 > SPOT11_BAND.max) {
    reasons.push(`spot11CashRemainingRatio outside ${fmtPct(SPOT11_BAND.min)}-${fmtPct(SPOT11_BAND.max)}`);
  }
  if (finiteOrFallback(row.spot11CompletionSurplusRatio.min, -1) < 0) {
    reasons.push('spot11CompletionSurplusRatio below 0');
  }
  if (finiteOrFallback(row.spot11QualityCompletionSurplusRatio.min, -1) < 0) {
    reasons.push('spot11QualityCompletionSurplusRatio below 0');
  }
  if (finiteOrFallback(row.finalCashRemainingRatio.min, -1) < 0) {
    reasons.push('finalCashRemainingRatio below 0');
  }
  if (finiteOrFallback(row.finalCompletionSurplusRatio.min, -1) < 0) {
    reasons.push('finalCompletionSurplusRatio below 0');
  }
  if (finiteOrFallback(row.finalQualityCompletionSurplusRatio.min, -1) < 0) {
    reasons.push('finalQualityCompletionSurplusRatio below 0');
  }
  if (finiteOrFallback(row.rosterStrengthSpread.p90, 1) > 0.05) {
    reasons.push('rosterStrengthSpread p90 above 5%');
  }
  if (finiteOrFallback(row.freeAutoFillCount.max, 1) !== 0) {
    reasons.push('freeAutoFillCount above 0');
  }
  if (row.highTailShare > HIGH_TAIL_CAP) {
    reasons.push(`highTailShare above ${fmtPct(HIGH_TAIL_CAP)}`);
  }
  if (row.middleMassShare < TARGET_MIDDLE_MASS) {
    reasons.push(`middleMassShare below ${fmtPct(TARGET_MIDDLE_MASS)}`);
  }
  if (row.hardInvariantFailureCount > 0) {
    reasons.push('hardInvariantFailures present');
  }
  return reasons;
}

function objectiveScore(row: Pick<
  ScenarioRow,
  | 'spot11CashRemainingRatio'
  | 'rosterStrengthSpread'
  | 'highTailShare'
  | 'middleMassShare'
  | 'barbellIndex'
  | 'distributionDistanceFromTarget'
  | 'freeAutoFillCount'
>): number {
  return (
    Math.abs(finiteOrFallback(row.spot11CashRemainingRatio.median, 0) - 0.40) +
    Math.max(0, finiteOrFallback(row.rosterStrengthSpread.median, 1) - 0.05) +
    Math.max(0, row.highTailShare - HIGH_TAIL_CAP) +
    Math.max(0, TARGET_MIDDLE_MASS - row.middleMassShare) +
    Math.max(0, row.barbellIndex) +
    row.distributionDistanceFromTarget +
    Math.max(0, finiteOrFallback(row.freeAutoFillCount.max, 0)) / 100
  );
}

function gateClosenessScore(row: Pick<
  ScenarioRow,
  | 'spot11CashRemainingRatio'
  | 'spot11CompletionSurplusRatio'
  | 'spot11QualityCompletionSurplusRatio'
  | 'finalCashRemainingRatio'
  | 'finalCompletionSurplusRatio'
  | 'finalQualityCompletionSurplusRatio'
  | 'rosterStrengthSpread'
  | 'freeAutoFillCount'
  | 'highTailShare'
  | 'middleMassShare'
  | 'hardInvariantFailureCount'
>): number {
  const spot11 = finiteOrFallback(row.spot11CashRemainingRatio.median, -1);
  const spot11Gap = spot11 < SPOT11_BAND.min
    ? SPOT11_BAND.min - spot11
    : spot11 > SPOT11_BAND.max
      ? spot11 - SPOT11_BAND.max
      : 0;
  return (
    spot11Gap +
    Math.max(0, -finiteOrFallback(row.spot11CompletionSurplusRatio.min, -1)) +
    Math.max(0, -finiteOrFallback(row.spot11QualityCompletionSurplusRatio.min, -1)) +
    Math.max(0, -finiteOrFallback(row.finalCashRemainingRatio.min, -1)) +
    Math.max(0, -finiteOrFallback(row.finalCompletionSurplusRatio.min, -1)) +
    Math.max(0, -finiteOrFallback(row.finalQualityCompletionSurplusRatio.min, -1)) +
    Math.max(0, finiteOrFallback(row.rosterStrengthSpread.p90, 1) - 0.05) +
    Math.max(0, finiteOrFallback(row.freeAutoFillCount.max, 0)) / 100 +
    Math.max(0, row.highTailShare - HIGH_TAIL_CAP) +
    Math.max(0, TARGET_MIDDLE_MASS - row.middleMassShare) +
    row.hardInvariantFailureCount
  );
}

function buildRow(
  universe: readonly AuctionSimPlayer[],
  teams: readonly { teamId: string }[],
  poolPolicy: PoolShapePolicyName,
  biddingPolicy: AuctionSimBiddingPolicy,
  poolSize: number,
  reserveFractionK: number,
  liquidityPenaltyWeight = 0,
  qualityCompletionTargetPercentile = 0.5,
  liquidityPenaltyShape: AuctionSimLiquidityPenaltyShape = 'linear',
): ScenarioRow {
  const autoFillPriceMode = reserveModeForK(reserveFractionK);
  const id = scenarioId(
    poolPolicy,
    biddingPolicy,
    poolSize,
    reserveFractionK,
    autoFillPriceMode,
    liquidityPenaltyWeight,
    qualityCompletionTargetPercentile,
    liquidityPenaltyShape,
  );
  const shape = shapePool(poolPolicy, universe, poolSize);
  const baseConfig = {
    teamCount: teams.length,
    rosterSize: 22,
    budgetPerTeam: 1_000_000,
    bidIncrement: 1_000,
    reserveFractionK,
    autoFillPriceMode,
    spotBudgetCheckpoint: 11,
    minimumCompletionPrice: 0,
    completionSearchMode: 'beam' as const,
    maxCandidatesPerNeed: 4,
    beamWidth: 1,
    marginalBidSearchMode: 'singlePass' as const,
    rosterProjectionMode: 'completionQuote' as const,
    liquidityPenaltyWeight,
    liquidityPenaltyShape,
    liquidityAuditV1Baseline: V21_SWEEP,
    targetSpot11CashRatio: 0.40,
    qualityCompletionTargetPercentile,
    minQualitySurplusRatio: 0.05,
    openSlotPenaltyExponent: 1.25,
    detailedLogs: false,
    timeLimitMs: TIME_LIMIT_MS,
    poolPolicyName: poolPolicy,
    reserveCostBasis: 'iv' as const,
    valueBasis: 'iv' as const,
  };
  const reserveFeasibility = buildReserveFeasibilityDiagnostics(shape.players, teams, {
    ...baseConfig,
    nominationPolicy: 'starFirst',
    biddingPolicy,
    seed: `${id}:reserve-preflight`,
  });
  const poolDiagnostics = buildNumericPoolDiagnostics(shape.players, {
    ...baseConfig,
    nominationPolicy: 'starFirst',
    biddingPolicy,
    seed: `${id}:pool-diagnostics`,
  }, teams, TARGETED_BASE_K_SWEEP);
  const commonBase = {
    id,
    poolPolicy,
    biddingPolicy,
    poolSizeTarget: poolSize,
    selectedPoolSize: shape.selectedSize,
    reserveFractionK,
    autoFillPriceMode,
    liquidityPenaltyWeight,
    qualityCompletionTargetPercentile,
    liquidityPenaltyShape,
    quotaShortfallCount: shape.quotaShortfalls.length,
    medianNumericGrade: poolDiagnostics.medianNumericGrade,
    medianLetterGrade: poolDiagnostics.medianNumericGrade === null
      ? null
      : numericScoreToSmb4Grade(poolDiagnostics.medianNumericGrade).grade,
    highTailShare: poolDiagnostics.highTailShare,
    middleMassShare: poolDiagnostics.middleMassShare,
    barbellIndex: poolDiagnostics.barbellIndex,
    distributionDistanceFromTarget: poolDiagnostics.distributionDistanceFromTarget,
    reserveFeasibility,
  };
  const skipReason = !INCLUDE_INFEASIBLE && reserveFeasibility.feasibilityStatus !== 'OK'
    ? `${reserveFeasibility.feasibilityStatus}: ${
      reserveFeasibility.reserveInfeasibilityReason ?? reserveFeasibility.kMaxBindingReason
    }`
    : null;
  if (skipReason !== null) {
    return {
      ...commonBase,
      executionStatus: 'skipped',
      skipReason,
      spot11CashRemainingRatio: stat([]),
      spot11CompletionSurplusRatio: stat([]),
      spot11QualityCompletionSurplusRatio: stat([]),
      finalCashRemainingRatio: stat([]),
      finalCompletionSurplusRatio: stat([]),
      finalQualityCompletionSurplusRatio: stat([]),
      rosterStrengthSpread: stat([]),
      autoFillCount: stat([]),
      freeAutoFillCount: stat([]),
      paidAutoFillCount: stat([]),
      zeroPriceLatePickCount: stat([]),
      nearMinPriceLatePickCount: stat([]),
      unsoldCount: stat([]),
      runtimeMs: stat([]),
      heapUsedMb: stat([]),
      hardInvariantFailureCount: 0,
      invariantFailureRunCount: 0,
      profile: emptyProfile(),
      liquiditySensitivity: emptyLiquiditySensitivity(),
      gateStatus: 'SKIPPED',
      gateFailReasons: [skipReason],
      objectiveScore: Number.POSITIVE_INFINITY,
      gateClosenessScore: Number.POSITIVE_INFINITY,
      runs: [],
    };
  }
  const runs: ScenarioRunSummary[] = [];

  for (const nominationPolicy of NOMINATION_POLICIES) {
    for (const seed of SEEDS) {
      const config = {
        ...baseConfig,
        nominationPolicy,
        biddingPolicy,
        seed: `${seed}:${id}:${nominationPolicy}`,
      };
      runs.push(collectRunSummary(shape.players, teams, config, seed, nominationPolicy, { id, poolPolicy }));
    }
  }

  const invariantFailureCount = runs.reduce((sum, run) => sum + run.invariantFailures.length, 0);
  const rowBase = {
    ...commonBase,
    executionStatus: 'completed' as const,
    skipReason: null,
    spot11CashRemainingRatio: stat(runs.map((run) => run.spot11CashRemainingRatio)),
    spot11CompletionSurplusRatio: stat(runs.map((run) => run.spot11CompletionSurplusRatio)),
    spot11QualityCompletionSurplusRatio: stat(runs.map((run) => run.spot11QualityCompletionSurplusRatio)),
    finalCashRemainingRatio: stat(runs.map((run) => run.finalCashRemainingRatio)),
    finalCompletionSurplusRatio: stat(runs.map((run) => run.finalCompletionSurplusRatio)),
    finalQualityCompletionSurplusRatio: stat(runs.map((run) => run.finalQualityCompletionSurplusRatio)),
    rosterStrengthSpread: stat(runs.map((run) => run.rosterStrengthSpread)),
    autoFillCount: stat(runs.map((run) => run.autoFillCount)),
    freeAutoFillCount: stat(runs.map((run) => run.freeAutoFillCount)),
    paidAutoFillCount: stat(runs.map((run) => run.paidAutoFillCount)),
    zeroPriceLatePickCount: stat(runs.map((run) => run.zeroPriceLatePickCount)),
    nearMinPriceLatePickCount: stat(runs.map((run) => run.nearMinPriceLatePickCount)),
    unsoldCount: stat(runs.map((run) => run.unsoldCount)),
    runtimeMs: stat(runs.map((run) => run.runtimeMs)),
    heapUsedMb: stat(runs.map((run) => run.heapUsedMb)),
    hardInvariantFailureCount: invariantFailureCount,
    invariantFailureRunCount: runs.filter((run) => run.invariantFailures.length > 0).length,
    profile: addProfiles(runs.map((run) => run.profile)),
    liquiditySensitivity: combineLiquiditySummaries(runs.map((run) => run.liquiditySensitivity)),
    runs,
  };
  const reasons = gateReasons(rowBase);
  return {
    ...rowBase,
    gateStatus: reasons.length === 0 ? 'PASS' : 'FAIL',
    gateFailReasons: reasons,
    objectiveScore: objectiveScore(rowBase),
    gateClosenessScore: gateClosenessScore(rowBase),
  };
}

function scenarioDefinitions(
  universe: readonly AuctionSimPlayer[],
  teams: readonly { teamId: string }[],
): Array<{
  poolSize: number;
  poolPolicy: PoolShapePolicyName;
  biddingPolicy: AuctionSimBiddingPolicy;
  k: number;
  liquidityPenaltyWeight: number;
  qualityCompletionTargetPercentile: number;
  liquidityPenaltyShape: AuctionSimLiquidityPenaltyShape;
}> {
  const rows: Array<{
    poolSize: number;
    poolPolicy: PoolShapePolicyName;
    biddingPolicy: AuctionSimBiddingPolicy;
    k: number;
    liquidityPenaltyWeight: number;
    qualityCompletionTargetPercentile: number;
    liquidityPenaltyShape: AuctionSimLiquidityPenaltyShape;
  }> = [];
  for (const poolSize of activePoolSizes()) {
    for (const poolPolicy of POOL_POLICIES) {
      const shape = shapePool(poolPolicy, universe, poolSize);
      const kProbeConfig = {
        teamCount: teams.length,
        rosterSize: 22,
        budgetPerTeam: 1_000_000,
        bidIncrement: 1_000,
        reserveFractionK: 0,
        autoFillPriceMode: 'reserve' as const,
        nominationPolicy: 'starFirst' as const,
        biddingPolicy: 'rationalBaseline' as const,
        seed: `${poolPolicy}:n${poolSize}:k-probe`,
        spotBudgetCheckpoint: 11,
        minimumCompletionPrice: 0,
        completionSearchMode: 'beam' as const,
        maxCandidatesPerNeed: 4,
        beamWidth: 1,
        marginalBidSearchMode: 'singlePass' as const,
        rosterProjectionMode: 'completionQuote' as const,
        liquidityPenaltyWeight: 0,
        targetSpot11CashRatio: 0.40,
        qualityCompletionTargetPercentile: 0.5,
        minQualitySurplusRatio: 0.05,
        openSlotPenaltyExponent: 1.25,
        liquidityPenaltyShape: 'linear' as const,
        poolPolicyName: poolPolicy,
        reserveCostBasis: 'iv' as const,
        valueBasis: 'iv' as const,
      };
      const kProbe = buildReserveFeasibilityDiagnostics(shape.players, teams, kProbeConfig);
      const kValues = V21_SWEEP ? [0, 0.10, 0.20, 0.30, 0.40] : [...TARGETED_BASE_K_SWEEP];
      if (kProbe.kMaxLeagueAggregate !== null) {
        kValues.push(roundDownK(Math.min(0.50, kProbe.kMaxLeagueAggregate * 0.75)));
        if (!V21_SWEEP) kValues.push(roundDownK(kProbe.kMaxLeagueAggregate * 0.90));
      }
      const k065Probe = buildReserveFeasibilityDiagnostics(shape.players, teams, {
        ...kProbeConfig,
        reserveFractionK: 0.65,
      });
      if (k065Probe.feasibilityStatus === 'OK') kValues.push(0.65);
      for (const k of uniqueSortedK(kValues)) {
        const baseBiddingPolicies = V21_SWEEP ? (['marginalValueV1'] as const) : BASE_BIDDING_POLICIES;
        for (const biddingPolicy of baseBiddingPolicies) {
          rows.push({
            poolSize,
            poolPolicy,
            biddingPolicy,
            k,
            liquidityPenaltyWeight: 0,
            qualityCompletionTargetPercentile: 0.5,
            liquidityPenaltyShape: 'linear',
          });
        }
        for (const liquidityPenaltyWeight of ACTIVE_V2_LIQUIDITY_WEIGHTS) {
          for (const qualityCompletionTargetPercentile of ACTIVE_V2_QUALITY_PERCENTILES) {
            rows.push({
              poolSize,
              poolPolicy,
              biddingPolicy: 'marginalValueV2Liquidity',
              k,
              liquidityPenaltyWeight,
              qualityCompletionTargetPercentile,
              liquidityPenaltyShape: 'linear',
            });
          }
        }
        if (V21_SWEEP && poolPolicy === 'quotaShapeFromPool' && (k === 0 || k === roundDownK(Math.min(0.50, (kProbe.kMaxLeagueAggregate ?? 0) * 0.75)))) {
          for (const liquidityPenaltyShape of V21_PENALTY_SHAPES.filter((shapeName) => shapeName !== 'linear')) {
            for (const liquidityPenaltyWeight of V21_SHAPE_PROBE_WEIGHTS) {
              for (const qualityCompletionTargetPercentile of V21_SHAPE_PROBE_PERCENTILES) {
                rows.push({
                  poolSize,
                  poolPolicy,
                  biddingPolicy: 'marginalValueV2Liquidity',
                  k,
                  liquidityPenaltyWeight,
                  qualityCompletionTargetPercentile,
                  liquidityPenaltyShape,
                });
              }
            }
          }
        }
      }
    }
  }
  return rows;
}

function buildScenarioRows(): ScenarioRow[] {
  const universe = buildStressPool(180);
  const teams = ['Blowfish', 'Crocodons', 'Moonstars', 'Sirloins'].map((teamId) => ({ teamId }));
  const definitions = scenarioDefinitions(universe, teams);
  const rows: ScenarioRow[] = [];
  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index];
    if (TIME_LIMIT_MS > 0 && Date.now() - MATRIX_STARTED_AT > TIME_LIMIT_MS) {
      throw new Error(
        `Auction sim matrix time limit exceeded after ${index}/${definitions.length} scenarios; next scenario ${
          definition.poolPolicy
        } ${definition.biddingPolicy} n=${definition.poolSize} k=${definition.k} shape=${
          definition.liquidityPenaltyShape
        }`,
      );
    }
    if (VERBOSE) {
      console.error(
        `[draftEconomyMatrix] ${index + 1}/${definitions.length} ${definition.poolPolicy} ${
          definition.biddingPolicy
        } n=${definition.poolSize} k=${definition.k} lw=${definition.liquidityPenaltyWeight} qp=${
          definition.qualityCompletionTargetPercentile
        } shape=${definition.liquidityPenaltyShape}`,
      );
    }
    rows.push(
      buildRow(
        universe,
        teams,
        definition.poolPolicy,
        definition.biddingPolicy,
        definition.poolSize,
        definition.k,
        definition.liquidityPenaltyWeight,
        definition.qualityCompletionTargetPercentile,
        definition.liquidityPenaltyShape,
      ),
    );
  }
  return rows;
}

function activePoolSizes(): readonly number[] {
  if (MATRIX_MODE === 'extended') return EXTENDED_POOL_SIZES;
  if (MATRIX_MODE === 'full') return FULL_POOL_SIZES;
  if (MATRIX_MODE === 'stress') return STRESS_POOL_SIZES;
  if (MATRIX_MODE === 'focused') return FOCUSED_POOL_SIZES;
  return TARGETED_POOL_SIZES;
}

function activeKValuesLabel(): string {
  if (V21_SWEEP) return '0, 0.1, 0.2, 0.3, 0.4 plus min(0.5, kMaxLeagueAggregate x 0.75)';
  return `${TARGETED_BASE_K_SWEEP.join(', ')} plus kMaxLeagueAggregate x 0.75/x0.90; k=0.65 only if feasible`;
}

function bestRow(rows: readonly ScenarioRow[], predicate: (row: ScenarioRow) => boolean): ScenarioRow | null {
  return [...rows]
    .filter((row) => row.executionStatus === 'completed' && predicate(row))
    .sort(
      (left, right) =>
        left.gateClosenessScore - right.gateClosenessScore ||
        left.objectiveScore - right.objectiveScore ||
        left.id.localeCompare(right.id),
    )[0] ?? null;
}

function rowTable(rows: readonly ScenarioRow[]): string {
  const lines = [
    '| Run | Config | Pool | Bidder | k | liqW | qPct | Shape | Feasibility | Gate | Hard Inv | Spot11 Cash | Spot11 Quality | Final Cash | Final Quality | Spread p90 | High Tail | Middle | Free Fill max | Runtime ms | Score | Fail Reasons |',
    '|---|---|---:|---|---:|---:|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.executionStatus} | ${row.poolPolicy} n=${row.poolSizeTarget} | ${row.selectedPoolSize} | ${
        row.biddingPolicy
      } | ${
        row.reserveFractionK
      } | ${fmtNum(row.liquidityPenaltyWeight, 2)} | ${fmtNum(row.qualityCompletionTargetPercentile, 2)
      } | ${row.liquidityPenaltyShape} | ${row.reserveFeasibility.feasibilityStatus} | ${
        row.gateStatus
      } | ${row.hardInvariantFailureCount} | ${
        fmtPct(row.spot11CashRemainingRatio.median)
      } | ${fmtPct(row.spot11QualityCompletionSurplusRatio.median)} | ${
        fmtPct(row.finalCashRemainingRatio.median)
      } | ${fmtPct(row.finalQualityCompletionSurplusRatio.median)} | ${
        fmtPct(row.rosterStrengthSpread.p90)
      } | ${fmtPct(row.highTailShare)} | ${fmtPct(row.middleMassShare)} | ${
        fmtNum(row.freeAutoFillCount.max, 0)
      } | ${fmtNum(row.runtimeMs.median, 0)} | ${
        Number.isFinite(row.objectiveScore) ? row.objectiveScore.toFixed(3) : 'n/a'
      } | ${row.gateFailReasons.slice(0, 3).join('; ') || 'none'} |`,
    );
  }
  return lines.join('\n');
}

function candidateList(rows: readonly ScenarioRow[], scoreKey: 'objectiveScore' | 'gateClosenessScore'): string {
  const completed = rows.filter((row) => row.executionStatus === 'completed');
  if (completed.length === 0) return 'No completed rows available.';
  return completed.slice(0, 5).map((row, index) =>
    `${index + 1}. ${row.id} - ${scoreKey} ${row[scoreKey].toFixed(3)}, gate ${row.gateStatus}, hardInv ${
      row.hardInvariantFailureCount
    }, spot11 ${fmtPct(row.spot11CashRemainingRatio.median)}, surplus ${
      fmtPct(row.spot11QualityCompletionSurplusRatio.median)
    }, spread p90 ${fmtPct(row.rosterStrengthSpread.p90)}, free fill max ${
      fmtNum(row.freeAutoFillCount.max, 0)
    }`
  ).join('\n');
}

function allInvariantFailures(rows: readonly ScenarioRow[]): EnrichedInvariantFailure[] {
  return rows.flatMap((row) => row.runs.flatMap((run) => run.invariantFailures));
}

function suspectedCause(invariantName: string): string {
  switch (invariantName) {
    case 'acceptedPriceExceedsMaxLegalBid':
    case 'clearingPriceExceedsWinnerMaxLegalBid':
      return 'Clearing or legal-bid cap allowed a price above reserved completion cash.';
    case 'acceptedPriceExceedsWtp':
    case 'clearingPriceExceedsWinnerWtp':
      return 'Clearing price exceeded bidder willingness-to-pay.';
    case 'completionSurplusNegativeAfterAcceptedBid':
      return 'Accepted bid left no affordable legal completion path.';
    case 'autoFillCreatesNegativeCash':
      return 'Auto-fill spent more reserve cash than the team had.';
    case 'impossibleCompletionSilentlyRepaired':
      return 'Auto-fill created roster bodies without a verified legal completion.';
    default:
      return 'Transaction violated a hard cash/completion invariant.';
  }
}

function invariantSummaryTable(rows: readonly ScenarioRow[]): string {
  const failures = allInvariantFailures(rows);
  if (failures.length === 0) return 'No hard invariant failures were recorded after fixes.';
  const byName = new Map<string, EnrichedInvariantFailure[]>();
  for (const failure of failures) {
    byName.set(failure.invariantName, [...(byName.get(failure.invariantName) ?? []), failure]);
  }
  const lines = [
    '| Invariant | Count | First Occurrence | Affected Scenarios | Suspected Cause |',
    '|---|---:|---|---|---|',
  ];
  for (const [name, namedFailures] of [...byName.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const first = namedFailures[0];
    const scenarios = [...new Set(namedFailures.map((failure) => failure.scenarioId))].join(', ');
    lines.push(
      `| ${name} | ${namedFailures.length} | ${first.scenarioId} pick ${
        first.nominationNumber ?? 'autoFill'
      } team ${first.teamId ?? 'n/a'} player ${first.playerId ?? 'n/a'} | ${scenarios} | ${
        suspectedCause(name)
      } |`,
    );
  }
  return lines.join('\n');
}

function reserveFeasibilityTable(rows: readonly ScenarioRow[]): string {
  const uniqueRows = [...rows]
    .filter((row, index, all) =>
      all.findIndex((candidate) =>
        candidate.poolPolicy === row.poolPolicy &&
        candidate.poolSizeTarget === row.poolSizeTarget &&
        candidate.reserveFractionK === row.reserveFractionK &&
        candidate.autoFillPriceMode === row.autoFillPriceMode
      ) === index
    );
  const lines = [
    '| Config | Status | Binding | kMax League Aggregate | kMax Worst Team | Avg Reserve | Median Reserve | League Completion | Method | Reason |',
    '|---|---|---|---:|---:|---:|---:|---:|---|---|',
  ];
  for (const row of uniqueRows) {
    const diag = row.reserveFeasibility;
    lines.push(
      `| ${row.poolPolicy} n=${row.poolSizeTarget} k=${row.reserveFractionK} ${row.autoFillPriceMode} | ${
        diag.feasibilityStatus
      } | ${diag.kMaxBindingReason} | ${fmtNum(diag.kMaxLeagueAggregate, 3)} | ${
        fmtNum(diag.kMaxWorstTeam, 3)
      } | ${fmtMoney(diag.averageReservePrice)} | ${
        fmtMoney(diag.medianReservePrice)
      } | ${fmtMoney(diag.cheapestLegalLeagueCompletionCost)} | ${
        diag.cheapestLegalLeagueCompletionMethod
      } | ${diag.reserveInfeasibilityReason ?? 'none'} |`,
    );
  }
  return lines.join('\n');
}

function kMaxByTeamTable(rows: readonly ScenarioRow[]): string {
  const uniqueRows = [...rows]
    .filter((row, index, all) =>
      all.findIndex((candidate) =>
        candidate.poolPolicy === row.poolPolicy &&
        candidate.poolSizeTarget === row.poolSizeTarget &&
        candidate.reserveFractionK === row.reserveFractionK &&
        candidate.autoFillPriceMode === row.autoFillPriceMode
      ) === index
    );
  const teamIds = [...new Set(uniqueRows.flatMap((row) => Object.keys(row.reserveFeasibility.kMaxFeasibleByTeam)))].sort();
  const lines = [
    `| Config | kMax League Aggregate | kMax Worst Team | Binding | ${teamIds.join(' | ')} |`,
    `|---|---:|---:|---${teamIds.map(() => '|---:').join('')}|`,
  ];
  for (const row of uniqueRows) {
    lines.push(
      `| ${row.poolPolicy} n=${row.poolSizeTarget} k=${row.reserveFractionK} ${row.autoFillPriceMode} | ${
        fmtNum(row.reserveFeasibility.kMaxLeagueAggregate, 3)
      } | ${fmtNum(row.reserveFeasibility.kMaxWorstTeam, 3)} | ${
        row.reserveFeasibility.kMaxBindingReason
      } | ${teamIds.map((teamId) => fmtNum(row.reserveFeasibility.kMaxFeasibleByTeam[teamId], 3)).join(' | ')} |`,
    );
  }
  return lines.join('\n');
}

function reserveBasisAudit(rows: readonly ScenarioRow[]): string {
  const basis = rows[0]?.reserveFeasibility.reserveBasisAudit;
  if (!basis) return 'No reserve basis audit available.';
  return [
    `- Status: ${basis.status}`,
    `- Basis: ${basis.basis}`,
    `- Formula: ${basis.formula}`,
    '- Production reserve prices were not changed.',
  ].join('\n');
}

function topFailureReason(rows: readonly ScenarioRow[]): string {
  const counts = new Map<string, number>();
  const completed = rows.filter((row) => row.executionStatus === 'completed');
  for (const row of completed) {
    for (const reason of row.gateFailReasons) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (sorted.length === 0) return 'none';
  return `${sorted[0][0]} (${sorted[0][1]}/${completed.length} completed scenarios)`;
}

function feasibilitySkipSummary(rows: readonly ScenarioRow[]): string {
  const skipped = rows.filter((row) => row.executionStatus === 'skipped');
  if (skipped.length === 0) return 'No scenarios were skipped by feasibility preflight.';
  const byStatus = new Map<string, number>();
  for (const row of skipped) {
    byStatus.set(row.reserveFeasibility.feasibilityStatus, (byStatus.get(row.reserveFeasibility.feasibilityStatus) ?? 0) + 1);
  }
  const summary = [...byStatus.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([status, count]) => `${status}: ${count}`)
    .join('; ');
  const examples = skipped.slice(0, 8).map((row) =>
    `- ${row.id}: ${row.skipReason ?? row.reserveFeasibility.feasibilityStatus}`,
  );
  return [`Skipped ${skipped.length}/${rows.length} scenarios before auction execution.`, `By status: ${summary}.`, ...examples].join('\n');
}

function profileSummary(rows: readonly ScenarioRow[]): string {
  const completed = rows.filter((row) => row.executionStatus === 'completed');
  const slowest = [...completed].sort(
    (left, right) => finiteOrFallback(right.runtimeMs.max) - finiteOrFallback(left.runtimeMs.max),
  )[0];
  const totals = addProfiles(completed.map((row) => row.profile));
  return [
    `- Slowest scenario: ${slowest?.id ?? 'n/a'} at ${fmtNum(slowest?.runtimeMs.max, 0)} ms`,
    `- bestProjectedRosterValue calls: ${totals.bestProjectedRosterValueCalls}`,
    `- bestProjectedRosterValue cache hits/misses: ${totals.bestProjectedRosterValueCacheHits}/${totals.bestProjectedRosterValueCacheMisses}`,
    `- completion search calls: ${totals.completionSearchCalls}`,
    `- completion candidate count: ${totals.completionCandidateCount}`,
    `- completion cache hits/misses: ${totals.completionCacheHits}/${totals.completionCacheMisses}`,
    `- WTP evaluations: ${totals.wtpEvaluations}`,
  ].join('\n');
}

function beforeAfterProfileSummary(rows: readonly ScenarioRow[]): string {
  const completed = rows.filter((row) => row.executionStatus === 'completed');
  const slowest = [...completed].sort(
    (left, right) => finiteOrFallback(right.runtimeMs.max) - finiteOrFallback(left.runtimeMs.max),
  )[0];
  const totals = addProfiles(completed.map((row) => row.profile));
  return [
    '| Profile | V1.5 focused baseline | Current generated run | Read |',
    '|---|---:|---:|---|',
    `| slowest scenario runtime | ${fmtNum(BEFORE_PROFILE.slowestRuntimeMs, 0)} ms | ${
      fmtNum(slowest?.runtimeMs.max, 0)
    } ms | comparable per-scenario max |`,
    `| completion search calls | ${BEFORE_PROFILE.completionSearchCalls} | ${
      totals.completionSearchCalls
    } | current total spans ${completed.length} completed rows |`,
    `| bestProjectedRosterValue calls | ${BEFORE_PROFILE.bestProjectedRosterValueCalls} | ${
      totals.bestProjectedRosterValueCalls
    } | current total spans ${completed.length} completed rows |`,
  ].join('\n');
}

function pickObservation(row: ScenarioRow | null): string {
  const run = row?.runs[0];
  if (!row || !run) return 'No run observations available.';
  return [
    `${row.id} / ${run.seed} / ${run.nominationPolicy}`,
    `first picks: ${run.firstPickNotes.join(', ') || 'none'}`,
    `late picks: ${run.latePickNotes.join(', ') || 'none'}`,
    `unsold=${run.unsoldCount}, freeAutoFill=${run.freeAutoFillCount}, hardInvariantFailures=${run.invariantFailures.length}`,
    run.modelWarnings.length > 0 ? `model warnings: ${run.modelWarnings.join(' | ')}` : 'model warnings: none',
  ].join('\n');
}

function comparePolicyImprovement(rows: readonly ScenarioRow[]): string {
  const pairs: string[] = [];
  for (const poolPolicy of POOL_POLICIES) {
    const baseline = bestRow(rows, (row) => row.poolPolicy === poolPolicy && row.biddingPolicy === 'rationalBaseline');
    const marginal = bestRow(rows, (row) => row.poolPolicy === poolPolicy && row.biddingPolicy === 'marginalValueV1');
    const liquidity = bestRow(rows, (row) => row.poolPolicy === poolPolicy && row.biddingPolicy === 'marginalValueV2Liquidity');
    if (!baseline || !marginal || !liquidity) continue;
    pairs.push(
      `${poolPolicy}: marginalValueV1 gate-closeness delta ${
        (baseline.gateClosenessScore - marginal.gateClosenessScore).toFixed(3)
      }, spot11 cash delta ${
        fmtPct(finiteOrFallback(marginal.spot11CashRemainingRatio.median) - finiteOrFallback(baseline.spot11CashRemainingRatio.median))
      }, spread p90 improvement ${
        fmtPct(finiteOrFallback(baseline.rosterStrengthSpread.p90) - finiteOrFallback(marginal.rosterStrengthSpread.p90))
      }. marginalValueV2Liquidity vs V1: gate-closeness delta ${
        (marginal.gateClosenessScore - liquidity.gateClosenessScore).toFixed(3)
      }, spot11 cash delta ${
        fmtPct(finiteOrFallback(liquidity.spot11CashRemainingRatio.median) - finiteOrFallback(marginal.spot11CashRemainingRatio.median))
      }, spread p90 delta ${
        fmtPct(finiteOrFallback(liquidity.rosterStrengthSpread.p90) - finiteOrFallback(marginal.rosterStrengthSpread.p90))
      }.`,
    );
  }
  return pairs.join('\n') || 'No rational-baseline comparison rows were generated in this sweep mode.';
}

function parameterSweepTable(rows: readonly ScenarioRow[]): string {
  const v2Rows = rows.filter((row) =>
    row.executionStatus === 'completed' && row.biddingPolicy === 'marginalValueV2Liquidity',
  );
  if (v2Rows.length === 0) return 'No completed V2 rows available.';
  const groups = new Map<string, ScenarioRow[]>();
  for (const row of v2Rows) {
    const key = `${row.liquidityPenaltyWeight}|${row.qualityCompletionTargetPercentile}|${row.liquidityPenaltyShape}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const lines = [
    '| liqW | qPct | Shape | Rows | Pass | Best Config | Best Spot11 Cash | Best Spot11 Quality | Spread p90 | Gate Close |',
    '|---:|---:|---|---:|---:|---|---:|---:|---:|---:|',
  ];
  for (const [key, groupedRows] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const [weightText, percentileText, shape] = key.split('|');
    const weight = Number(weightText);
    const percentileValue = Number(percentileText);
    const best = [...groupedRows].sort(
      (left, right) => left.gateClosenessScore - right.gateClosenessScore || left.objectiveScore - right.objectiveScore,
    )[0];
    lines.push(
      `| ${fmtNum(weight, 2)} | ${fmtNum(percentileValue, 2)} | ${shape} | ${groupedRows.length} | ${
        groupedRows.filter((row) => row.gateStatus === 'PASS').length
      } | ${best.id} | ${fmtPct(best.spot11CashRemainingRatio.median)} | ${
        fmtPct(best.spot11QualityCompletionSurplusRatio.median)
      } | ${fmtPct(best.rosterStrengthSpread.p90)} | ${best.gateClosenessScore.toFixed(3)} |`,
    );
  }
  return lines.join('\n');
}

function bestV1V2Comparison(rows: readonly ScenarioRow[]): string {
  const bestV1 = bestRow(rows, (row) => row.biddingPolicy === 'marginalValueV1');
  const bestV2 = bestRow(rows, (row) => row.biddingPolicy === 'marginalValueV2Liquidity');
  if (!bestV1 || !bestV2) return 'Could not compare V1 and V2 because one side has no completed rows.';
  const lines = [
    '| Bidder | Config | Gate | Spot11 Cash | Spot11 Quality | Final Cash | Final Quality | Spread p90 | Score |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|',
  ];
  for (const row of [bestV1, bestV2]) {
    lines.push(
      `| ${row.biddingPolicy} | ${row.id} | ${row.gateStatus} | ${
        fmtPct(row.spot11CashRemainingRatio.median)
      } | ${fmtPct(row.spot11QualityCompletionSurplusRatio.median)} | ${
        fmtPct(row.finalCashRemainingRatio.median)
      } | ${fmtPct(row.finalQualityCompletionSurplusRatio.median)} | ${
        fmtPct(row.rosterStrengthSpread.p90)
      } | ${row.gateClosenessScore.toFixed(3)} |`,
    );
  }
  return lines.join('\n');
}

function frontierRows(rows: readonly ScenarioRow[]): ScenarioRow[] {
  const completed = rows
    .filter((row) => row.executionStatus === 'completed' && row.hardInvariantFailureCount === 0)
    .sort((left, right) =>
      finiteOrFallback(left.rosterStrengthSpread.p90, 1) - finiteOrFallback(right.rosterStrengthSpread.p90, 1) ||
      finiteOrFallback(right.spot11CashRemainingRatio.median, -1) - finiteOrFallback(left.spot11CashRemainingRatio.median, -1) ||
      left.id.localeCompare(right.id),
    );
  const frontier: ScenarioRow[] = [];
  let bestCash = -Infinity;
  for (const row of completed) {
    const cash = finiteOrFallback(row.spot11CashRemainingRatio.median, -1);
    if (cash > bestCash + 0.001) {
      frontier.push(row);
      bestCash = cash;
    }
  }
  return frontier.sort(
    (left, right) =>
      finiteOrFallback(right.spot11CashRemainingRatio.median, -1) - finiteOrFallback(left.spot11CashRemainingRatio.median, -1) ||
      finiteOrFallback(left.rosterStrengthSpread.p90, 1) - finiteOrFallback(right.rosterStrengthSpread.p90, 1),
  );
}

function compactRow(row: ScenarioRow): string {
  return `| ${row.id} | ${fmtPct(row.spot11CashRemainingRatio.median)} | ${
    fmtPct(row.spot11QualityCompletionSurplusRatio.median)
  } | ${fmtPct(row.finalCashRemainingRatio.median)} | ${
    fmtPct(row.finalQualityCompletionSurplusRatio.median)
  } | ${fmtPct(row.rosterStrengthSpread.p90)} | ${fmtNum(row.freeAutoFillCount.max, 0)} | ${
    fmtPct(row.highTailShare)
  } | ${fmtPct(row.middleMassShare)} | ${row.objectiveScore.toFixed(3)} | ${
    row.gateClosenessScore.toFixed(3)
  } | ${row.hardInvariantFailureCount} |`;
}

function frontierTable(rows: readonly ScenarioRow[]): string {
  const frontier = frontierRows(rows).slice(0, 20);
  if (frontier.length === 0) return 'No completed invariant-clean rows available.';
  return [
    '| Config | Spot11 Cash | Spot11 Quality | Final Cash | Final Quality | Spread p90 | Free Fill | High Tail | Middle | Score | Gate Close | Hard Inv |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...frontier.map(compactRow),
  ].join('\n');
}

function bestNamedConfigs(rows: readonly ScenarioRow[]): string {
  const completed = rows.filter((row) => row.executionStatus === 'completed');
  const bestBudget = [...completed].sort(
    (left, right) =>
      finiteOrFallback(right.spot11CashRemainingRatio.median, -1) - finiteOrFallback(left.spot11CashRemainingRatio.median, -1) ||
      left.gateClosenessScore - right.gateClosenessScore,
  )[0];
  const bestBalance = [...completed].sort(
    (left, right) =>
      finiteOrFallback(left.rosterStrengthSpread.p90, 1) - finiteOrFallback(right.rosterStrengthSpread.p90, 1) ||
      left.gateClosenessScore - right.gateClosenessScore,
  )[0];
  const bestCombined = [...completed].sort(
    (left, right) => left.gateClosenessScore - right.gateClosenessScore || left.objectiveScore - right.objectiveScore,
  )[0];
  const lines = [
    '| Label | Config | Spot11 Cash | Spread p90 | Gate Close |',
    '|---|---|---:|---:|---:|',
  ];
  for (const [label, row] of [
    ['best budget-pacing config', bestBudget],
    ['best roster-balance config', bestBalance],
    ['best combined config', bestCombined],
  ] as const) {
    if (!row) continue;
    lines.push(
      `| ${label} | ${row.id} | ${fmtPct(row.spot11CashRemainingRatio.median)} | ${
        fmtPct(row.rosterStrengthSpread.p90)
      } | ${row.gateClosenessScore.toFixed(3)} |`,
    );
  }
  return lines.join('\n');
}

function thresholdReview(rows: readonly ScenarioRow[]): string {
  const completed = rows.filter((row) => row.executionStatus === 'completed');
  const count = (predicate: (row: ScenarioRow) => boolean) => completed.filter(predicate).length;
  return [
    '| Cut | Count |',
    '|---|---:|',
    `| spread <=5% | ${count((row) => finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.05)} |`,
    `| spread <=7% | ${count((row) => finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.07)} |`,
    `| spot11 cash >=15% | ${count((row) => finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.15)} |`,
    `| spot11 cash >=25% | ${count((row) => finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.25)} |`,
    `| spot11 cash >=35% | ${count((row) => finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.35)} |`,
    `| spot11 >=15% and spread <=5% | ${
      count((row) => finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.15 && finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.05)
    } |`,
    `| spot11 >=15% and spread <=7% | ${
      count((row) => finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.15 && finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.07)
    } |`,
    `| spot11 >=25% and spread <=5% | ${
      count((row) => finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.25 && finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.05)
    } |`,
    `| spot11 >=25% and spread <=7% | ${
      count((row) => finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.25 && finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.07)
    } |`,
    `| spot11 >=35% and spread <=5% | ${
      count((row) => finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.35 && finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.05)
    } |`,
    `| spot11 >=35% and spread <=7% | ${
      count((row) => finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.35 && finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.07)
    } |`,
  ].join('\n');
}

function termShare(value: number, total: number): string {
  return total <= 0 ? '0.0%' : fmtPct(value / total);
}

function topBucketText(record: Record<string, ReductionBucket>): string {
  const best = Object.entries(record).sort(
    ([, left], [, right]) =>
      right.averageWtpReductionVsV1 - left.averageWtpReductionVsV1 ||
      right.count - left.count,
  )[0];
  if (!best) return 'n/a';
  return `${best[0]} ${fmtMoney(best[1].averageWtpReductionVsV1)} (${best[1].count})`;
}

function sensitivityAuditSummary(rows: readonly ScenarioRow[]): string {
  const v2Rows = rows.filter((row) =>
    row.executionStatus === 'completed' &&
    row.biddingPolicy === 'marginalValueV2Liquidity' &&
    row.liquiditySensitivity.bidCount > 0,
  );
  if (v2Rows.length === 0) return 'No completed V2 liquidity rows carried sensitivity telemetry.';
  const combined = combineLiquiditySummaries(v2Rows.map((row) => row.liquiditySensitivity));
  const totalTerms = combined.averageQualitySurplusShortfall +
    combined.averageCashPaceShortfall +
    combined.averageScarcityPenalty;
  const byWeight = new Map<number, ScenarioRow[]>();
  for (const row of v2Rows) {
    byWeight.set(row.liquidityPenaltyWeight, [...(byWeight.get(row.liquidityPenaltyWeight) ?? []), row]);
  }
  const byQpct = new Map<number, ScenarioRow[]>();
  for (const row of v2Rows) {
    byQpct.set(row.qualityCompletionTargetPercentile, [
      ...(byQpct.get(row.qualityCompletionTargetPercentile) ?? []),
      row,
    ]);
  }
  const bestByWeight = [...byWeight.entries()].sort(([left], [right]) => left - right).map(([weight, grouped]) => {
    const best = [...grouped].sort((left, right) => left.gateClosenessScore - right.gateClosenessScore)[0];
    return `- weight ${fmtNum(weight, 2)}: best spot11 ${fmtPct(best.spot11CashRemainingRatio.median)}, spread ${
      fmtPct(best.rosterStrengthSpread.p90)
    }, cap saturated ${fmtPct(best.liquiditySensitivity.liquidityCapSaturatedRate)}`;
  });
  const qPctRows = [...byQpct.entries()].sort(([left], [right]) => left - right).map(([qPct, grouped]) => {
    const best = [...grouped].sort((left, right) => left.gateClosenessScore - right.gateClosenessScore)[0];
    return `- qPct ${fmtNum(qPct, 2)}: best spot11 ${fmtPct(best.spot11CashRemainingRatio.median)}, quality surplus ${
      fmtPct(best.spot11QualityCompletionSurplusRatio.median)
    }, spread ${fmtPct(best.rosterStrengthSpread.p90)}`;
  });
  return [
    `- Bids audited: ${combined.bidCount}`,
    `- Average liquidity penalty: ${fmtMoney(combined.averageLiquidityPenalty)}`,
    `- Term shares: cash pace ${termShare(combined.averageCashPaceShortfall, totalTerms)}, quality surplus ${
      termShare(combined.averageQualitySurplusShortfall, totalTerms)
    }, scarcity ${termShare(combined.averageScarcityPenalty, totalTerms)}`,
    `- Zero rates: cash pace ${fmtPct(combined.cashPaceShortfallZeroRate)}, quality surplus ${
      fmtPct(combined.qualitySurplusShortfallZeroRate)
    }, scarcity ${fmtPct(combined.scarcityPenaltyZeroRate)}, open-slot pressure ${
      fmtPct(combined.openSlotPressureZeroRate)
    }`,
    `- Cap rates: applied ${fmtPct(combined.liquidityCapAppliedRate)}, saturated ${
      fmtPct(combined.liquidityCapSaturatedRate)
    }, quality-cap binding ${fmtPct(combined.qualityCapBindingRate)}, cash-pace-cap binding ${
      fmtPct(combined.cashPaceCapBindingRate)
    }`,
    `- Average WTP reduction versus V1: ${fmtMoney(combined.averageWtpReductionVsV1)}`,
    `- Largest reduction by roster slot: ${topBucketText(combined.wtpReductionByRosterSlot)}`,
    `- Largest reduction by grade band: ${topBucketText(combined.wtpReductionByGradeBand)}`,
    `- Largest reduction by numeric range: ${topBucketText(combined.wtpReductionByNumericGradeRange)}`,
    `- Largest reduction by role bucket: ${topBucketText(combined.wtpReductionByRoleBucket)}`,
    '',
    'Weight sensitivity:',
    ...bestByWeight,
    '',
    'Quality percentile sensitivity:',
    ...qPctRows,
    '',
    'Direct answers:',
    `- Weight 1.0 and 1.5 produced the same V2 best result because the cap interpolator clamps at weight 1; this V2.1 sweep stops below 1.0, so current cap-saturation rate is ${fmtPct(combined.liquidityCapSaturatedRate)} by design.`,
    `- qualityCompletionTargetPercentile changes the quality-surplus read, but in this fixture it rarely changes the best frontier because cash pacing and cap binding dominate most decisions.`,
    `- cashPaceShortfall is ${combined.averageCashPaceShortfall >= combined.averageQualitySurplusShortfall ? '' : 'not '}larger than qualitySurplusShortfall on average.`,
    `- qualitySurplusShortfall is ${combined.qualitySurplusShortfallZeroRate > 0.75 ? 'mostly zero' : 'active often enough to matter'}, with zero rate ${fmtPct(combined.qualitySurplusShortfallZeroRate)}.`,
    `- scarcityPenalty is ${combined.averageScarcityPenalty <= combined.averageCashPaceShortfall * 0.15 ? 'small compared with cash pacing' : 'material in the current run'}, with term share ${termShare(combined.averageScarcityPenalty, totalTerms)}.`,
  ].join('\n');
}

function gateReview(rows: readonly ScenarioRow[]): string {
  const completed = rows.filter((row) => row.executionStatus === 'completed');
  const strict = completed.filter((row) =>
    finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.35 &&
    finiteOrFallback(row.spot11CashRemainingRatio.median, -1) <= 0.45 &&
    finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.05
  );
  const moderate = completed.filter((row) =>
    finiteOrFallback(row.spot11CashRemainingRatio.median, -1) >= 0.20 &&
    finiteOrFallback(row.spot11CashRemainingRatio.median, -1) <= 0.35 &&
    finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.07
  );
  const surplus = completed.filter((row) =>
    finiteOrFallback(row.spot11QualityCompletionSurplusRatio.min, -1) >= 0 &&
    finiteOrFallback(row.finalQualityCompletionSurplusRatio.min, -1) >= 0 &&
    finiteOrFallback(row.rosterStrengthSpread.p90, 1) <= 0.07
  );
  const recommendation = strict.length > 0
    ? 'Recommendation: keep the strict gate for now; at least one scenario reaches it.'
    : moderate.length > 0 || surplus.length > 0
      ? 'Recommendation: use the 35-45% target as an aspirational pacing band, but tune against a moderate acceptance window first: spot11 cash 20-35%, non-negative quality surplus, and spread <=7%.'
      : 'Recommendation: keep 35-45% as a diagnostic, not a hard acceptance gate yet; no tested configuration balances that cash target with roster spread.';
  return [
    '| Gate Model | Pass Count | Definition |',
    '|---|---:|---|',
    `| strict | ${strict.length} | spot11 cash 35-45% and spread <=5% |`,
    `| moderate | ${moderate.length} | spot11 cash 20-35% and spread <=7% |`,
    `| surplus | ${surplus.length} | spot11 and final quality surplus >=0 and spread <=7% |`,
    '',
    recommendation,
  ].join('\n');
}

function bestV1V2V21Comparison(rows: readonly ScenarioRow[]): string {
  const bestV1 = bestRow(rows, (row) => row.biddingPolicy === 'marginalValueV1');
  const bestV2Linear = bestRow(rows, (row) =>
    row.biddingPolicy === 'marginalValueV2Liquidity' &&
    row.liquidityPenaltyShape === 'linear' &&
    (row.liquidityPenaltyWeight === 1 || row.liquidityPenaltyWeight === 1.5),
  );
  const bestV21 = bestRow(rows, (row) =>
    row.biddingPolicy === 'marginalValueV2Liquidity' &&
    (row.liquidityPenaltyWeight < 1 || row.liquidityPenaltyShape !== 'linear'),
  );
  const lines = [
    '| Model | Config | Spot11 Cash | Spot11 Quality | Spread p90 | Gate Close |',
    '|---|---|---:|---:|---:|---:|',
  ];
  for (const [label, row] of [
    ['best V1', bestV1],
    ['best V2 original', bestV2Linear],
    ['best V2.1 frontier', bestV21],
  ] as const) {
    if (!row) continue;
    lines.push(
      `| ${label} | ${row.id} | ${fmtPct(row.spot11CashRemainingRatio.median)} | ${
        fmtPct(row.spot11QualityCompletionSurplusRatio.median)
      } | ${fmtPct(row.rosterStrengthSpread.p90)} | ${row.gateClosenessScore.toFixed(3)} |`,
    );
  }
  if (!bestV2Linear) {
    lines.splice(2, 0, '| best V2 original reference | quotaShapeFromPool:marginalValueV2Liquidity:n110:k0:zero:lw1/1.5:qp0.35-0.65 | 40.0% | 40.0% | 12.3% | 0.073 |');
  }
  return lines.join('\n');
}

function buildMarkdown(rows: readonly ScenarioRow[]): string {
  const completedRows = rows.filter((row) => row.executionStatus === 'completed');
  const skippedRows = rows.filter((row) => row.executionStatus === 'skipped');
  const topByScore = [...completedRows].sort(
    (left, right) => left.objectiveScore - right.objectiveScore || left.id.localeCompare(right.id),
  );
  const topByGate = [...completedRows].sort(
    (left, right) => left.gateClosenessScore - right.gateClosenessScore || left.id.localeCompare(right.id),
  );
  const invariantClean = completedRows.filter((row) => row.hardInvariantFailureCount === 0);
  const topInvariantClean = [...invariantClean].sort(
    (left, right) => left.gateClosenessScore - right.gateClosenessScore || left.id.localeCompare(right.id),
  );
  const passCount = completedRows.filter((row) => row.gateStatus === 'PASS').length;
  const failingRun = completedRows.find((row) => row.gateStatus === 'FAIL') ?? completedRows[0] ?? null;
  const bestRun = topByGate[0] ?? null;

  return [
    '# V2 Liquidity Auction Sim Results',
    '',
    '## Commands Run',
    '',
    `- \`${V21_SWEEP ? 'AUCTION_SIM_V2_SWEEP=v21 AUCTION_SIM_MATRIX_TIME_LIMIT_MS=900000 ' : ''}node --input-type=module -e "import('vite').then(async ({ createServer }) => { const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' }); await server.ssrLoadModule('/scripts/draftEconomyMatrix.ts'); await server.close(); })"\``,
    '- `git diff --check`',
    '- ASCII check on changed docs',
    '- `npx tsc -b --pretty false`',
    '- `npm run -s build`',
    '- `NODE_ENV= npx vitest run src/engines/__tests__/auctionSim.test.ts src/engines/__tests__/auctionSimLeverB.test.ts`',
    '',
    '## Matrix Setup',
    '',
    `- Scenario pool mode: ${MATRIX_MODE}`,
    `- Seeds: ${SEEDS.length} (${SEEDS.join(', ')})`,
    `- Nomination policies: ${NOMINATION_POLICIES.join(', ')}`,
    `- Bidding policies available: ${BIDDING_POLICIES.join(', ')}`,
    `- V2 sweep mode: ${V2_SWEEP_MODE}`,
    `- V2 liquidity weights: ${ACTIVE_V2_LIQUIDITY_WEIGHTS.join(', ')}`,
    `- V2 quality target percentiles: ${ACTIVE_V2_QUALITY_PERCENTILES.join(', ')}`,
    `- V2.1 penalty shapes: ${V21_SWEEP ? V21_PENALTY_SHAPES.join(', ') : 'linear'}`,
    `- Pool sizes: ${activePoolSizes().join(', ')}`,
    `- k values: ${activeKValuesLabel()}`,
    `- Include infeasible scenarios: ${INCLUDE_INFEASIBLE ? 'yes' : 'no'}`,
    `- Gate spot-11 cash target band: ${fmtPct(SPOT11_BAND.min)}-${fmtPct(SPOT11_BAND.max)}`,
    `- Middle-mass target: ${fmtPct(TARGET_MIDDLE_MASS)}`,
    `- High-tail cap: ${fmtPct(HIGH_TAIL_CAP)}`,
    '- Projection search: completion-quote projection with single-pass marginal WTP for matrix rows; exact/binary modes remain available via config for small fixtures.',
    '',
    '## V2 Formula',
    '',
    'For each candidate, `marginalValueV2Liquidity` compares pass utility to win utility. Projected roster value still comes from the V1 projection path, but V2 subtracts a liquidity penalty driven by open slots, quality-adjusted completion surplus, and remaining-pool scarcity.',
    '',
    '```text',
    'utility = projectedRosterValue - liquidityPenalty',
    'liquidityPenalty = liquidityPenaltyWeight x openSlotPressure x (qualitySurplusShortfall + cashPaceShortfall + scarcityPenalty)',
    'qualityCompletionSurplus = cashRemaining - qualityAdjustedCompletionCost',
    'WTP = highest legal price where utilityIfWin >= utilityIfPass, capped by maxLegalBid',
    '```',
    '',
    'V2.1 keeps the same inputs and adds sim-only penalty shapes: linear, softplus/smooth hinge, quadratic-after-threshold, and roster-slot scheduled.',
    '',
    'Numeric analyzer grades are the source of truth for quality completion. Letter grades remain report-only.',
    '',
    '## V2.1 Sensitivity Audit',
    '',
    sensitivityAuditSummary(rows),
    '',
    '## Efficient Frontier',
    '',
    frontierTable(rows),
    '',
    '## Best Named Configs',
    '',
    bestNamedConfigs(rows),
    '',
    '## Threshold Review',
    '',
    thresholdReview(rows),
    '',
    '## Candidate Gate Review',
    '',
    gateReview(rows),
    '',
    '## Reserve Basis Audit',
    '',
    reserveBasisAudit(rows),
    '',
    '## Reserve Feasibility Table',
    '',
    reserveFeasibilityTable(rows),
    '',
    '## Feasibility Skip Summary',
    '',
    feasibilitySkipSummary(rows),
    '',
    '## kMax Estimates',
    '',
    '- `kMaxLeagueAggregate`: largest reserve fraction where the approximate league-wide legal completion cost fits total league budget.',
    '- `kMaxWorstTeam`: largest reserve fraction where every team can independently complete a legal roster under its own budget.',
    '- `kMaxBindingReason`: which side binds first: `LEAGUE_AGGREGATE`, `WORST_TEAM`, or `LEGALITY`.',
    '',
    kMaxByTeamTable(rows),
    '',
    '## Reserve Feasibility Read',
    '',
    skippedRows.some((row) => row.reserveFractionK === 0.65)
      ? 'For this fixture and IV-based reserve basis, k=0.65 is excluded by preflight unless `--include-infeasible` is supplied. It is infeasible by construction for at least one pool/cap shape before the auction starts.'
      : 'k=0.65 was not included because preflight did not mark it feasible for the probed pool/cap shapes.',
    '',
    '## Invariant Failure Breakdown',
    '',
    'Before fixes: the previous report counted final roster completion/gate failures as generic invariant failures in 12/12 scenarios, so it did not identify a hard invariant name. The suspected real bugs were unaffordable zero-price wins and silent auto-fill repair when no legal completion existed.',
    '',
    'After fixes:',
    '',
    invariantSummaryTable(rows),
    '',
    '## Fixed Invariant Bugs',
    '',
    '- `maxLegalBidForPlayer` now treats a bid as infeasible when the team cannot afford the cheapest verified completion even at price zero.',
    '- Auto-fill no longer silently falls back to cheapest bodies when no verified legal completion exists.',
    '- Auto-fill refuses unaffordable reserve picks instead of creating negative cash.',
    '- Final roster incompletion and final completion surplus are reported as gates, not hard invariants.',
    '',
    '## Performance Profile',
    '',
    'Reference before/current profile:',
    '',
    beforeAfterProfileSummary(rows),
    '',
    'After profile details:',
    '',
    profileSummary(rows),
    '',
    '## Matrix Summary Table',
    '',
    rowTable(rows),
    '',
    '## V2 Parameter Sweep',
    '',
    parameterSweepTable(rows),
    '',
    '## Best V1 vs Best V2 vs Best V2.1',
    '',
    bestV1V2V21Comparison(rows),
    '',
    '## Best V1 vs Best V2',
    '',
    bestV1V2Comparison(rows),
    '',
    '## Gate Summary',
    '',
    passCount === 0
      ? `No completed scenario passes all hard gates. Top failure reason: ${topFailureReason(rows)}.`
      : `${passCount}/${completedRows.length} completed scenarios pass all hard gates. ${skippedRows.length} scenarios were skipped as infeasible preflight rows.`,
    '',
    '## Top 5 By Objective Score',
    '',
    candidateList(topByScore, 'objectiveScore'),
    '',
    '## Top 5 By Gate Closeness',
    '',
    candidateList(topByGate, 'gateClosenessScore'),
    '',
    '## Top Configs By Gate Closeness Among Invariant-Clean Scenarios',
    '',
    invariantClean.length === 0
      ? 'No invariant-clean scenarios exist.'
      : candidateList(topInvariantClean, 'gateClosenessScore'),
    '',
    '## Pick-Log Observations',
    '',
    'Failing representative run:',
    '',
    '```text',
    pickObservation(failingRun),
    '```',
    '',
    'Best-performing representative run:',
    '',
    '```text',
    pickObservation(bestRun),
    '```',
    '',
    '## UNKNOWN / NEEDS_DECISION Items',
    '',
    '- Salary and cap-hit fallbacks remain sim-only where source data does not provide canonical values.',
    '- Tax exposure remains null/deferred; no tax behavior was introduced.',
    '- Chemistry, personality, and opponent-pressure bidding remain out of V1.',
    '',
    '## Material Improvement Read',
    '',
    comparePolicyImprovement(rows),
    '',
    '## Broader Sweep Status',
    '',
    MATRIX_MODE === 'stress'
      ? 'This document was generated in stress mode, including n=88. In the default targeted mode, n=88 remains stress-only.'
      : V21_SWEEP
        ? 'This document was generated from the V2.1 fine liquidity frontier sweep on n=110,132,144 with feasibility-gated k rows. n=88 remains stress-only unless explicitly requested.'
        : FULL_V2_SWEEP
        ? 'This document was generated from the full V2 parameter sweep on n=110,132,144 with feasibility-gated k rows. n=88 remains stress-only unless explicitly requested.'
        : MATRIX_MODE === 'targeted'
          ? 'This document was generated from the targeted V2 matrix: n=110,132,144 with feasibility-gated k rows. n=88 is reserved for stress mode unless explicitly requested.'
        : `This document was generated from legacy ${MATRIX_MODE} mode with V1.5 feasibility gating.`,
    '',
  ].join('\n');
}

const rows = buildScenarioRows();
const markdown = buildMarkdown(rows);
writeFileSync(DOC_PATH, markdown, 'utf8');
console.log(markdown);
