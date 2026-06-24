/**
 * RA-1 expected-stats engine — pure/build-DARK.
 *
 * Source of truth: spec-docs/RA1_FAME_MODEL_PROPOSAL.md Part 1 and
 * RATINGS_ADJUSTMENT_SPEC.md §3A/§3B/§4A.
 *
 * This module consumes already-derived per-category rate stats. It does not
 * read the live league, storage, DB, checkpoints, or stores; RA-2 wires those
 * inputs later.
 */

import { twoSegment } from './ivEngine';
import { getPercentile } from './percentile';
import { IV_CURVES, type IVAttr, type PositionKey } from '../data/ivCurves';
import {
  DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
  scaledThreshold,
  type AdaptiveStandardsConfig,
  type AdaptiveThresholdBasis,
} from '../utils/franchiseAdaptiveStandards';
import { SMB4_BASELINES } from '../types/war';

export type ExpectedStatsPlayerRole = 'hitter' | 'pitcher';
export type ExpectedStatsAgeBand = '18-21' | '22-24' | '25-31' | '32-35' | '36+';

export type ExpectedStatsRatingKey =
  | 'power'
  | 'contact'
  | 'speed'
  | 'fielding'
  | 'arm'
  | 'velocity'
  | 'junk'
  | 'accuracy';

interface ExpectedStatsCategoryMeta {
  ratingKey: ExpectedStatsRatingKey;
  attr: IVAttr;
  basis: AdaptiveThresholdBasis;
  defaultCurveBlock: PositionKey;
}

export const EXPECTED_STATS_CATEGORY_META = {
  // RATINGS_ADJUSTMENT_SPEC §3B: Power = ISO / SLG / HR-rate.
  powerIso: { ratingKey: 'power', attr: 'POW', basis: 'season', defaultCurveBlock: 'SS' },
  powerSlugging: { ratingKey: 'power', attr: 'POW', basis: 'season', defaultCurveBlock: 'SS' },
  powerHomeRunRate: { ratingKey: 'power', attr: 'POW', basis: 'season', defaultCurveBlock: 'SS' },

  // Contact = AVG / OBP / K%; K is exposed as avoidance so higher is better.
  contactAverage: { ratingKey: 'contact', attr: 'CON', basis: 'season', defaultCurveBlock: 'SS' },
  contactOnBase: { ratingKey: 'contact', attr: 'CON', basis: 'season', defaultCurveBlock: 'SS' },
  contactAvoidStrikeoutRate: { ratingKey: 'contact', attr: 'CON', basis: 'season', defaultCurveBlock: 'SS' },
  // RA-2CQ: quality-of-contact rate (good/tracked). basis:'none' => fixed min-sample floor of 10 (JK 2026-06-24, count early on balls-in-play).
  contactQualityRate: { ratingKey: 'contact', attr: 'CON', basis: 'none', defaultCurveBlock: 'SS' },

  // Speed = SB+3B rate / baserunning.
  speedStealTripleRate: { ratingKey: 'speed', attr: 'SPD', basis: 'season', defaultCurveBlock: 'SS' },
  speedBaserunningRate: { ratingKey: 'speed', attr: 'SPD', basis: 'season', defaultCurveBlock: 'SS' },

  // Fielding = fielding% / error-rate / range; error rate is avoidance.
  fieldingFieldingPct: { ratingKey: 'fielding', attr: 'FLD', basis: 'season', defaultCurveBlock: 'SS' },
  fieldingAvoidErrorRate: { ratingKey: 'fielding', attr: 'FLD', basis: 'season', defaultCurveBlock: 'SS' },
  fieldingRangeRate: { ratingKey: 'fielding', attr: 'FLD', basis: 'season', defaultCurveBlock: 'SS' },

  // Arm = C/OF arm signal only. Pitchers are structurally no-signal (§4A).
  armThrowingRate: { ratingKey: 'arm', attr: 'ARM', basis: 'season', defaultCurveBlock: 'C' },

  // Pitching: velocity = K%, junk = weak-contact / HR-suppression, accuracy = BB%.
  pitchingStrikeoutRate: { ratingKey: 'velocity', attr: 'VEL', basis: 'combined', defaultCurveBlock: 'SP' },
  pitchingWeakContactRate: { ratingKey: 'junk', attr: 'JNK', basis: 'combined', defaultCurveBlock: 'SP' },
  pitchingHomeRunSuppressionRate: { ratingKey: 'junk', attr: 'JNK', basis: 'combined', defaultCurveBlock: 'SP' },
  pitchingWalkAvoidanceRate: { ratingKey: 'accuracy', attr: 'ACC', basis: 'combined', defaultCurveBlock: 'SP' },
  pitchingFipPrevention: { ratingKey: 'accuracy', attr: 'ACC', basis: 'combined', defaultCurveBlock: 'SP' },
} as const satisfies Record<string, ExpectedStatsCategoryMeta>;

export type ExpectedStatsCategory = keyof typeof EXPECTED_STATS_CATEGORY_META;

type CategoryNumberMap = Partial<Record<ExpectedStatsCategory, number>>;
type CategoryValuesMap = Partial<Record<ExpectedStatsCategory, readonly number[]>>;
type RatingNumberMap = Partial<Record<ExpectedStatsRatingKey, number>>;

export const EXPECTED_STATS_CATEGORIES = Object.keys(
  EXPECTED_STATS_CATEGORY_META,
) as ExpectedStatsCategory[];

export const SMB4_EXPECTED_STATS_BASELINES: Partial<Record<ExpectedStatsCategory, number>> = {
  powerIso: SMB4_BASELINES.leagueSLG - SMB4_BASELINES.leagueAVG,
  powerSlugging: SMB4_BASELINES.leagueSLG,
  powerHomeRunRate: SMB4_BASELINES.hrPerPA,
  contactAverage: SMB4_BASELINES.leagueAVG,
  contactOnBase: SMB4_BASELINES.leagueOBP,
  contactAvoidStrikeoutRate: 1 - SMB4_BASELINES.kPerPA,
  pitchingStrikeoutRate: SMB4_BASELINES.kPerPA,
  pitchingHomeRunSuppressionRate: 1 - SMB4_BASELINES.hrPerPA,
  pitchingWalkAvoidanceRate: 1 - SMB4_BASELINES.bbPerPA,
  pitchingFipPrevention: 1 / SMB4_BASELINES.leagueFIP,
};

const ONE_BY_CATEGORY: Record<ExpectedStatsCategory, number> = {
  powerIso: 1,
  powerSlugging: 1,
  powerHomeRunRate: 1,
  contactAverage: 1,
  contactOnBase: 1,
  contactAvoidStrikeoutRate: 1,
  contactQualityRate: 1,
  speedStealTripleRate: 1,
  speedBaserunningRate: 1,
  fieldingFieldingPct: 1,
  fieldingAvoidErrorRate: 1,
  fieldingRangeRate: 1,
  armThrowingRate: 1,
  pitchingStrikeoutRate: 1,
  pitchingWeakContactRate: 1,
  pitchingHomeRunSuppressionRate: 1,
  pitchingWalkAvoidanceRate: 1,
  pitchingFipPrevention: 1,
};

export interface ExpectedStatsTuning {
  /**
   * §16 sim-tune floor on season/opportunity samples. This is seeded from the
   * traitRealityScorer defaults and season-scaled via scaledThreshold.
   */
  minSampleSeason: number;
  /** §16 sim-tune floor for innings/combined pitcher samples. */
  minSampleCombined: number;
  /** §16 sim-tune floor for explicitly unscaled rate-opportunity samples. */
  minSampleRate: number;
  /** §16 sim-tune minimum peer-pool size before r is trusted. */
  minPeerPool: number;
  /**
   * §16 sim-tune denominator knobs. Defaults are all 1.0, preserving the
   * ratified peer-SD z-score: (actual - expected) / peerSD.
   */
  normalizationScaleByCat: Record<ExpectedStatsCategory, number>;
}

export const EXPECTED_STATS_TUNING: ExpectedStatsTuning = {
  minSampleSeason: 50,
  minSampleCombined: 20,
  minSampleRate: 10,
  minPeerPool: 3,
  normalizationScaleByCat: ONE_BY_CATEGORY,
};

export interface ExpectedStatsInput {
  playerRole: ExpectedStatsPlayerRole;
  ageBand: ExpectedStatsAgeBand;
  /**
   * Optional IV curve block for this position pool. If the requested attribute
   * is absent from that block, the category's own block is used.
   */
  curveBlock?: PositionKey;
  ratings: RatingNumberMap;
  actualByCat: CategoryNumberMap;
  sampleSizeByCat: CategoryNumberMap;
  poolMeanByCat?: CategoryNumberMap;
  poolSdByCat?: CategoryNumberMap;
  /** Optional raw peers; used only to derive missing mean/SD/count inputs. */
  peerValuesByCat?: CategoryValuesMap;
  /** Either one pool mean rating for all categories or per-rating means. */
  poolMeanRating: number | RatingNumberMap;
  /** Either one peer-pool size for all categories or per-category sizes. */
  peerPoolSize?: number | CategoryNumberMap;
}

export interface ExpectedStatsResult {
  expectedByCat: Partial<Record<ExpectedStatsCategory, number | null>>;
  rByCat: Partial<Record<ExpectedStatsCategory, number | null>>;
}

export function expectedAndSignal(
  input: ExpectedStatsInput,
  config: AdaptiveStandardsConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
  tuning: ExpectedStatsTuning = EXPECTED_STATS_TUNING,
): ExpectedStatsResult {
  const expectedByCat: Partial<Record<ExpectedStatsCategory, number | null>> = {};
  const rByCat: Partial<Record<ExpectedStatsCategory, number | null>> = {};

  for (const category of EXPECTED_STATS_CATEGORIES) {
    const meta = EXPECTED_STATS_CATEGORY_META[category];
    const expected = expectedForCategory(input, category, meta);
    expectedByCat[category] = expected;

    if (input.playerRole === 'pitcher' && meta.ratingKey === 'arm') {
      rByCat[category] = null;
      continue;
    }

    const actual = finiteOrNull(input.actualByCat[category]);
    const sample = finiteOrNull(input.sampleSizeByCat[category]) ?? 0;
    const scaledMinSample = scaledMinSampleFor(meta.basis, config, tuning);
    const peerPoolSize = resolvePeerPoolSize(input, category, tuning);
    const peerSd = resolvePeerSd(input, category, tuning);

    if (
      expected === null ||
      actual === null ||
      sample < scaledMinSample ||
      peerPoolSize < tuning.minPeerPool ||
      peerSd === null ||
      peerSd <= 0
    ) {
      rByCat[category] = null;
      continue;
    }

    rByCat[category] = clamp((actual - expected) / peerSd, -1, 1);
  }

  return { expectedByCat, rByCat };
}

function expectedForCategory(
  input: ExpectedStatsInput,
  category: ExpectedStatsCategory,
  meta: ExpectedStatsCategoryMeta,
): number | null {
  if (input.playerRole === 'pitcher' && meta.ratingKey === 'arm') {
    return null;
  }

  const playerRating = finiteOrNull(input.ratings[meta.ratingKey]);
  const poolMeanRating = resolvePoolMeanRating(input.poolMeanRating, meta.ratingKey);
  const poolMeanProd = resolvePoolMeanProduction(input, category);
  const curve = resolveCurve(input.curveBlock, meta);

  if (
    playerRating === null ||
    poolMeanRating === null ||
    poolMeanProd === null ||
    curve === null
  ) {
    return null;
  }

  const playerCurve = twoSegment(playerRating, curve);
  const poolCurve = twoSegment(poolMeanRating, curve);

  if (!Number.isFinite(playerCurve) || !Number.isFinite(poolCurve) || poolCurve === 0) {
    return null;
  }

  return poolMeanProd * playerCurve / poolCurve;
}

function resolveCurve(
  curveBlock: PositionKey | undefined,
  meta: ExpectedStatsCategoryMeta,
) {
  const preferred = curveBlock ? IV_CURVES[curveBlock]?.attributes[meta.attr] : undefined;
  const fallback = IV_CURVES[meta.defaultCurveBlock].attributes[meta.attr];
  return (preferred ?? fallback)?.primary ?? null;
}

function resolvePoolMeanProduction(
  input: ExpectedStatsInput,
  category: ExpectedStatsCategory,
): number | null {
  const provided = finiteOrNull(input.poolMeanByCat?.[category]);
  if (provided !== null) return provided;

  const peerMean = mean(input.peerValuesByCat?.[category]);
  if (peerMean !== null) return peerMean;

  return finiteOrNull(SMB4_EXPECTED_STATS_BASELINES[category]);
}

function resolvePoolMeanRating(
  poolMeanRating: number | RatingNumberMap,
  ratingKey: ExpectedStatsRatingKey,
): number | null {
  if (typeof poolMeanRating === 'number') return finiteOrNull(poolMeanRating);
  return finiteOrNull(poolMeanRating[ratingKey]);
}

function resolvePeerPoolSize(
  input: ExpectedStatsInput,
  category: ExpectedStatsCategory,
  tuning: ExpectedStatsTuning,
): number {
  const explicit =
    typeof input.peerPoolSize === 'number'
      ? input.peerPoolSize
      : input.peerPoolSize?.[category];
  const finiteExplicit = finiteOrNull(explicit);
  if (finiteExplicit !== null) return finiteExplicit;

  const peerValues = finiteSorted(input.peerValuesByCat?.[category]);
  return peerValues.length > 0 ? peerValues.length : tuning.minPeerPool;
}

function resolvePeerSd(
  input: ExpectedStatsInput,
  category: ExpectedStatsCategory,
  tuning: ExpectedStatsTuning,
): number | null {
  const scale = finiteOrNull(tuning.normalizationScaleByCat[category]) ?? 1;
  const provided = finiteOrNull(input.poolSdByCat?.[category]);
  if (provided !== null) return provided * scale;

  const derived = winsorizedStandardDeviation(input.peerValuesByCat?.[category]);
  return derived === null ? null : derived * scale;
}

function scaledMinSampleFor(
  basis: AdaptiveThresholdBasis,
  config: AdaptiveStandardsConfig,
  tuning: ExpectedStatsTuning,
): number {
  const base =
    basis === 'none'
      ? tuning.minSampleRate
      : basis === 'season'
        ? tuning.minSampleSeason
        : tuning.minSampleCombined;
  return basis === 'none' ? base : scaledThreshold(base, config, basis);
}

export function winsorizedStandardDeviation(values: readonly number[] | undefined): number | null {
  const sorted = finiteSorted(values);
  if (sorted.length < 2) return null;

  const central = sorted.filter((value) => {
    const percentile = getPercentile(value, sorted);
    return percentile >= 0.05 && percentile <= 0.95;
  });
  const valuesForSpread = central.length >= 2 ? central : sorted;
  return standardDeviation(valuesForSpread);
}

function standardDeviation(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const average = mean(values);
  if (average === null) return null;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function mean(values: readonly number[] | undefined): number | null {
  const finite = finiteSorted(values);
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function finiteSorted(values: readonly number[] | undefined): number[] {
  return [...(values ?? [])]
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
