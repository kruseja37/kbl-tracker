import type {
  AuctionSimConfig,
  AuctionSimGradeBand,
  AuctionSimPlayer,
  AuctionSimPoolMetrics,
  AuctionSimTeamInput,
  NumericGradeHistogramBin,
  NumericGradeRead,
  NumericGradeWindow,
} from './types';
import { cheapestAuctionSimCompletion } from './legalCompletionCost';
import { normalizeAuctionSimConfig } from './types';
import { numericScoreToSmb4Grade, scoreSmb4Player } from '../smb4GradeEmulator';

export const NUMERIC_GRADE_TARGET = {
  histogramMin: 0,
  histogramMax: 100,
  histogramStep: 5,
  lowTailMax: 58,
  middleMin: 58,
  middleMax: 76,
  highTailMin: 76,
  highTailCap: 0.15,
  targetMiddleMass: 0.70,
  targetLowTailShare: 0.10,
  targetHighTailShare: 0.15,
} as const;

export const DEFAULT_NUMERIC_GRADE_WINDOWS: readonly NumericGradeWindow[] = [
  { id: 'low-tail', label: 'low tail', minInclusive: 0, maxExclusive: 58, targetShare: 0.10 },
  { id: 'middle-low', label: 'middle low', minInclusive: 58, maxExclusive: 64, targetShare: 0.22 },
  { id: 'middle-core', label: 'middle core', minInclusive: 64, maxExclusive: 70, targetShare: 0.28 },
  { id: 'middle-high', label: 'middle high', minInclusive: 70, maxExclusive: 76, targetShare: 0.25 },
  { id: 'high-tail', label: 'high tail', minInclusive: 76, maxExclusive: 101, targetShare: 0.15 },
];

export interface CompletionCostDistribution {
  values: readonly number[];
  median: number | null;
  p10: number | null;
  p90: number | null;
  feasibleCount: number;
  infeasibleCount: number;
}

export interface AuctionSimPoolDiagnostics extends AuctionSimPoolMetrics {
  positionRoleBucketCounts: Record<string, number>;
  cheapestLegalCompletionCostDistribution: CompletionCostDistribution;
  reserveCompletionCostDistributionByK: Record<string, CompletionCostDistribution>;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const clamped = Math.min(1, Math.max(0, p));
  const index = (sorted.length - 1) * clamped;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function resolveNumericGrade(player: AuctionSimPlayer): NumericGradeRead {
  if (player.smb4Input) {
    const result = scoreSmb4Player(player.smb4Input);
    return { numericGrade: result.numericScore, letterGrade: result.grade, source: 'smb4' };
  }
  const provided = finiteOrNull(player.numericGrade);
  if (provided !== null) {
    return {
      numericGrade: provided,
      letterGrade: numericScoreToSmb4Grade(provided).grade,
      source: 'providedNumeric',
    };
  }
  return {
    numericGrade: null,
    letterGrade: player.grade ?? null,
    source: player.grade ? 'letterDisplayOnly' : 'missing',
  };
}

export function gradeBandFromNumericGrade(numericGrade: number | null): AuctionSimGradeBand {
  if (numericGrade === null) return 'core';
  if (numericGrade >= NUMERIC_GRADE_TARGET.highTailMin) return 'elite';
  if (numericGrade >= 70) return 'strong';
  if (numericGrade >= NUMERIC_GRADE_TARGET.middleMin) return 'core';
  return 'filler';
}

export function letterGradeForPlayer(player: AuctionSimPlayer): string | null {
  return resolveNumericGrade(player).letterGrade;
}

export function gradeBandForNumericPlayer(player: AuctionSimPlayer): AuctionSimGradeBand {
  return gradeBandFromNumericGrade(resolveNumericGrade(player).numericGrade);
}

export function roleBucketForPlayer(player: AuctionSimPlayer): string {
  if (!player.pos) return 'unknown';
  if (player.pos.isPitcher) return `arm:${player.pos.role ?? 'P'}`;
  return `pos:${player.pos.position}`;
}

function buildNumericHistogram(grades: readonly number[]): NumericGradeHistogramBin[] {
  const bins: NumericGradeHistogramBin[] = [];
  const { histogramMin, histogramMax, histogramStep } = NUMERIC_GRADE_TARGET;
  for (let min = histogramMin; min < histogramMax; min += histogramStep) {
    const max = min + histogramStep;
    const count = grades.filter((grade) => grade >= min && grade < max).length;
    bins.push({
      minInclusive: min,
      maxExclusive: max,
      label: `${min}-${max}`,
      count,
      share: grades.length === 0 ? 0 : count / grades.length,
    });
  }
  return bins;
}

export function numericWindowId(grade: number, windows: readonly NumericGradeWindow[] = DEFAULT_NUMERIC_GRADE_WINDOWS): string | null {
  const found = windows.find((window) => grade >= window.minInclusive && grade < window.maxExclusive);
  return found?.id ?? null;
}

export function distributionDistanceFromTarget(
  grades: readonly number[],
  windows: readonly NumericGradeWindow[] = DEFAULT_NUMERIC_GRADE_WINDOWS,
): number {
  if (grades.length === 0) return windows.reduce((sum, window) => sum + window.targetShare, 0);
  return windows.reduce((sum, window) => {
    const actual = grades.filter((grade) => grade >= window.minInclusive && grade < window.maxExclusive).length / grades.length;
    return sum + Math.abs(actual - window.targetShare);
  }, 0);
}

function buildCompletionDistribution(
  players: readonly AuctionSimPlayer[],
  teams: readonly AuctionSimTeamInput[],
  config: AuctionSimConfig,
): CompletionCostDistribution {
  const teamInputs = teams.length > 0
    ? teams
    : Array.from({ length: config.teamCount }, (_, index) => ({ teamId: `team-${index + 1}` }));
  const values: number[] = [];
  let feasibleCount = 0;
  let infeasibleCount = 0;
  for (const _team of teamInputs) {
    const quote = cheapestAuctionSimCompletion([], players, config);
    values.push(quote.cost);
    if (quote.feasible) feasibleCount += 1;
    else infeasibleCount += 1;
  }
  return {
    values,
    median: percentile(values, 0.5),
    p10: percentile(values, 0.1),
    p90: percentile(values, 0.9),
    feasibleCount,
    infeasibleCount,
  };
}

export function buildNumericPoolDiagnostics(
  players: readonly AuctionSimPlayer[],
  configInput: Partial<AuctionSimConfig> = {},
  teams: readonly AuctionSimTeamInput[] = [],
  reserveKValues: readonly number[] = [0, 0.65],
): AuctionSimPoolDiagnostics {
  const config = normalizeAuctionSimConfig(configInput);
  const gradeReads = players.map(resolveNumericGrade);
  const numericGrades = gradeReads
    .map((read) => read.numericGrade)
    .filter((value): value is number => value !== null);
  const poolSize = players.length;
  const ivs = players.map((player) => player.iv);
  const topByIv = [...players].sort((left, right) => right.iv - left.iv || left.playerId.localeCompare(right.playerId));
  const topRosterSizeIVSum = topByIv.slice(0, config.rosterSize).reduce((sum, player) => sum + player.iv, 0);
  const top22IVSum = topByIv.slice(0, 22).reduce((sum, player) => sum + player.iv, 0);
  const top44IVSum = topByIv.slice(0, 44).reduce((sum, player) => sum + player.iv, 0);

  const letterGradeSummary: Record<string, number> = {};
  const gradeBandCounts: Record<AuctionSimGradeBand, number> = { elite: 0, strong: 0, core: 0, filler: 0 };
  for (let i = 0; i < players.length; i += 1) {
    const read = gradeReads[i];
    const letter = read.letterGrade ?? 'missing';
    letterGradeSummary[letter] = (letterGradeSummary[letter] ?? 0) + 1;
    gradeBandCounts[gradeBandFromNumericGrade(read.numericGrade)] += 1;
  }

  const positionRoleBucketCounts: Record<string, number> = {};
  for (const player of players) {
    const bucket = roleBucketForPlayer(player);
    positionRoleBucketCounts[bucket] = (positionRoleBucketCounts[bucket] ?? 0) + 1;
  }

  const highTailCount = numericGrades.filter((grade) => grade >= NUMERIC_GRADE_TARGET.highTailMin).length;
  const middleMassCount = numericGrades.filter(
    (grade) => grade >= NUMERIC_GRADE_TARGET.middleMin && grade < NUMERIC_GRADE_TARGET.middleMax,
  ).length;
  const lowTailCount = numericGrades.filter((grade) => grade < NUMERIC_GRADE_TARGET.lowTailMax).length;
  const numericDenominator = numericGrades.length || 1;
  const highTailShare = highTailCount / numericDenominator;
  const middleMassShare = middleMassCount / numericDenominator;
  const lowTailShare = lowTailCount / numericDenominator;
  const share = (band: AuctionSimGradeBand) => (poolSize === 0 ? 0 : gradeBandCounts[band] / poolSize);

  const reserveCompletionCostDistributionByK: Record<string, CompletionCostDistribution> = {};
  for (const k of reserveKValues) {
    reserveCompletionCostDistributionByK[String(k)] = buildCompletionDistribution(
      players,
      teams,
      { ...config, reserveFractionK: k, autoFillPriceMode: 'reserve' },
    );
  }

  return {
    poolSize,
    numericGradeHistogram: buildNumericHistogram(numericGrades),
    letterGradeSummary,
    missingNumericGradeCount: gradeReads.filter((read) => read.numericGrade === null).length,
    gradeBandCounts,
    medianIV: percentile(ivs, 0.5) ?? 0,
    meanIV: mean(ivs),
    medianNumericGrade: percentile(numericGrades, 0.5),
    p10NumericGrade: percentile(numericGrades, 0.1),
    p25NumericGrade: percentile(numericGrades, 0.25),
    p75NumericGrade: percentile(numericGrades, 0.75),
    p90NumericGrade: percentile(numericGrades, 0.9),
    top22IVSum,
    top44IVSum,
    topRosterSizeIVSum,
    topRosterSizeIVSumToCap: config.budgetPerTeam <= 0 ? 0 : topRosterSizeIVSum / config.budgetPerTeam,
    highTailShare,
    middleMassShare,
    lowTailShare,
    distributionDistanceFromTarget: distributionDistanceFromTarget(numericGrades),
    eliteShare: highTailShare,
    strongShare: share('strong'),
    coreShare: middleMassShare,
    fillerShare: lowTailShare,
    barbellIndex: highTailShare + lowTailShare - middleMassShare,
    positionRoleBucketCounts,
    cheapestLegalCompletionCostDistribution: buildCompletionDistribution(
      players,
      teams,
      { ...config, reserveFractionK: 0, autoFillPriceMode: 'zero' },
    ),
    reserveCompletionCostDistributionByK,
  };
}
