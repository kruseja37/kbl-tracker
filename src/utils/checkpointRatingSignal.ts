/**
 * RA-2c-1 pure checkpoint rating-signal engine — build-DARK.
 *
 * Source: RATINGS_ADJUSTMENT_SPEC §4 + DECISIONS_LOG 2026-06-24 (RA-2c forks).
 * Given cohort members already classified into §4 RatingsPoolKeys, produces a
 * per-player per-attribute development signal in [-1,1] by: grouping into pools,
 * borrowing a wider reference for thin pools (Fork D ladder), aggregating (RA-2b),
 * running expectedAndSignal (RA-1), and blending each rating's categories
 * (equal weight). No live caller (RA-2c-2 wires it). No I/O.
 */

import {
  aggregatePoolStats,
  classifyStarterRole,
  DEFAULT_STARTER_ROLE_THRESHOLDS,
  type PoolStatsResult,
  type RatingsPoolKey,
  type StarterRoleThresholds,
} from '../engines/expectedStatsPoolAggregator';
import {
  EXPECTED_STATS_CATEGORIES,
  EXPECTED_STATS_CATEGORY_META,
  expectedAndSignal,
  type ExpectedStatsAgeBand,
  type ExpectedStatsCategory,
  type ExpectedStatsRatingKey,
} from '../engines/expectedStatsEngine';
import type { CategoryRateResult } from '../engines/expectedStatsCategoryRates';
import { TRUE_VALUE_MIN_PEER_POOL_SIZE } from '../engines/salaryCalculator';

export interface CheckpointSignalMember {
  playerId: string;
  role: 'hitter' | 'pitcher';
  ageBand: ExpectedStatsAgeBand;
  ratings: Partial<Record<ExpectedStatsRatingKey, number>>;
  poolKey: RatingsPoolKey;
  categoryRates: CategoryRateResult;
}

const HITTER_POOLS: RatingsPoolKey[] = ['C', 'cornerIF', 'middleIF', 'cornerOF', 'CF', 'benchIF', 'benchOF'];
const PITCHER_POOLS: RatingsPoolKey[] = ['SP', 'RP'];

/** Fork D §4:85 ladder. Each entry: ordered rungs of progressively-wider pools; rung 0 = position-pure. Sim-tunable §16. */
export const CHECKPOINT_POOL_LADDER: Record<RatingsPoolKey, RatingsPoolKey[][]> = {
  C: [['C'], ['C', 'cornerIF', 'middleIF'], HITTER_POOLS],
  cornerIF: [['cornerIF'], ['cornerIF', 'middleIF'], HITTER_POOLS],
  middleIF: [['middleIF'], ['cornerIF', 'middleIF'], HITTER_POOLS],
  cornerOF: [['cornerOF'], ['cornerOF', 'CF'], HITTER_POOLS],
  CF: [['CF'], ['cornerOF', 'CF'], HITTER_POOLS],
  benchIF: [['benchIF'], ['benchIF', 'benchOF'], HITTER_POOLS],
  benchOF: [['benchOF'], ['benchIF', 'benchOF'], HITTER_POOLS],
  SP: [['SP'], PITCHER_POOLS],
  RP: [['RP'], PITCHER_POOLS],
};

/**
 * Fork A + B: classify a player into a §4 RatingsPoolKey from the effective-position
 * report. Hitters: starter (classifyStarterRole on startsShare, hysteresis OFF =
 * no priorRole) -> position pool; bench -> benchIF/benchOF. Pitchers: SP->SP,
 * RP/CP/SP-RP->RP. Returns null when the position is unmappable.
 */
export function classifyRatingsPoolKey(input: {
  role: 'hitter' | 'pitcher';
  effectivePosition: string | null | undefined;
  startsShare: number | null | undefined;
  thresholds?: StarterRoleThresholds;
}): RatingsPoolKey | null {
  const pos = (input.effectivePosition ?? '').trim().toUpperCase();
  if (input.role === 'pitcher') {
    if (pos === 'SP') return 'SP';
    if (pos === 'RP' || pos === 'CP' || pos === 'SP/RP') return 'RP';
    return null;
  }
  const role = classifyStarterRole(
    input.startsShare ?? 0,
    undefined,
    input.thresholds ?? DEFAULT_STARTER_ROLE_THRESHOLDS,
  );
  if (role === 'starter') {
    if (pos === 'C') return 'C';
    if (pos === '1B' || pos === '3B') return 'cornerIF';
    if (pos === '2B' || pos === 'SS') return 'middleIF';
    if (pos === 'LF' || pos === 'RF') return 'cornerOF';
    if (pos === 'CF') return 'CF';
    return null;
  }
  if (pos === 'C' || pos === '1B' || pos === '2B' || pos === 'SS' || pos === '3B') return 'benchIF';
  if (pos === 'LF' || pos === 'CF' || pos === 'RF') return 'benchOF';
  return null;
}

function membersInRung(allMembers: readonly CheckpointSignalMember[], rung: readonly RatingsPoolKey[]): CheckpointSignalMember[] {
  const set = new Set<RatingsPoolKey>(rung);
  return allMembers.filter((m) => set.has(m.poolKey));
}

/**
 * Fork D pool-level ladder (mean members): the NARROWEST rung whose member count
 * reaches the min peer-pool; else the WIDEST rung. The mean stays as position-pure
 * as the floor allows (§4:65).
 */
export function resolvePoolMeanMembers(
  poolKey: RatingsPoolKey,
  allMembers: readonly CheckpointSignalMember[],
  minPeerPool: number = TRUE_VALUE_MIN_PEER_POOL_SIZE,
): { members: CheckpointSignalMember[]; rungIndex: number } {
  const ladder = CHECKPOINT_POOL_LADDER[poolKey];
  for (let i = 0; i < ladder.length; i += 1) {
    const members = membersInRung(allMembers, ladder[i]);
    if (members.length >= minPeerPool) return { members, rungIndex: i };
  }
  const lastIndex = ladder.length - 1;
  return { members: membersInRung(allMembers, ladder[lastIndex]), rungIndex: lastIndex };
}

/** Spread-reference (§4:65 SD borrow): the rung one wider than the mean rung; the mean rung itself when already widest. */
export function resolveSpreadMembers(
  poolKey: RatingsPoolKey,
  allMembers: readonly CheckpointSignalMember[],
  meanRungIndex: number,
): CheckpointSignalMember[] {
  const ladder = CHECKPOINT_POOL_LADDER[poolKey];
  const idx = Math.min(meanRungIndex + 1, ladder.length - 1);
  return membersInRung(allMembers, ladder[idx]);
}

interface PoolSignalCache {
  stats: PoolStatsResult;
  poolMeanRating: Partial<Record<ExpectedStatsRatingKey, number>>;
}

const EXPECTED_STATS_RATING_KEYS = Array.from(
  new Set(
    EXPECTED_STATS_CATEGORIES.map((category) => EXPECTED_STATS_CATEGORY_META[category].ratingKey),
  ),
) as ExpectedStatsRatingKey[];

function finiteMean(values: readonly (number | null | undefined)[]): number | undefined {
  const finite = values.filter((value): value is number => (
    typeof value === 'number' && Number.isFinite(value)
  ));
  if (finite.length === 0) return undefined;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function meanRatingByKey(
  members: readonly CheckpointSignalMember[],
): Partial<Record<ExpectedStatsRatingKey, number>> {
  const result: Partial<Record<ExpectedStatsRatingKey, number>> = {};
  for (const ratingKey of EXPECTED_STATS_RATING_KEYS) {
    const mean = finiteMean(members.map((member) => member.ratings[ratingKey]));
    if (typeof mean === 'number') result[ratingKey] = mean;
  }
  return result;
}

function blendSignalsByRatingKey(
  rByCat: Partial<Record<ExpectedStatsCategory, number | null>>,
): Partial<Record<ExpectedStatsRatingKey, number>> {
  const signal: Partial<Record<ExpectedStatsRatingKey, number>> = {};
  for (const ratingKey of EXPECTED_STATS_RATING_KEYS) {
    const values: number[] = [];
    for (const category of EXPECTED_STATS_CATEGORIES) {
      if (EXPECTED_STATS_CATEGORY_META[category].ratingKey !== ratingKey) continue;
      const value = rByCat[category];
      if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
    }
    if (values.length > 0) {
      signal[ratingKey] = values.reduce((sum, value) => sum + value, 0) / values.length;
    }
  }
  return signal;
}

export function computeCheckpointRatingSignals(
  members: readonly CheckpointSignalMember[],
): Map<string, Partial<Record<ExpectedStatsRatingKey, number>>> {
  const poolCache = new Map<RatingsPoolKey, PoolSignalCache>();
  const distinctPoolKeys = new Set<RatingsPoolKey>(members.map((member) => member.poolKey));

  for (const poolKey of distinctPoolKeys) {
    const { members: meanMembers, rungIndex } = resolvePoolMeanMembers(poolKey, members);
    const spreadMembers = resolveSpreadMembers(poolKey, members, rungIndex);
    const stats = aggregatePoolStats({
      members: meanMembers.map((member) => member.categoryRates),
      spreadReference: spreadMembers.map((member) => member.categoryRates),
    });
    poolCache.set(poolKey, {
      stats,
      poolMeanRating: meanRatingByKey(meanMembers),
    });
  }

  const result = new Map<string, Partial<Record<ExpectedStatsRatingKey, number>>>();
  for (const member of members) {
    const cached = poolCache.get(member.poolKey);
    if (!cached) {
      result.set(member.playerId, {});
      continue;
    }

    const { rByCat } = expectedAndSignal({
      playerRole: member.role,
      ageBand: member.ageBand,
      ratings: member.ratings,
      actualByCat: member.categoryRates.actualByCat,
      sampleSizeByCat: member.categoryRates.sampleSizeByCat,
      poolMeanByCat: cached.stats.poolMeanByCat,
      poolSdByCat: cached.stats.poolSdByCat,
      peerValuesByCat: cached.stats.peerValuesByCat,
      peerPoolSize: cached.stats.peerPoolSize,
      poolMeanRating: cached.poolMeanRating,
    });

    result.set(member.playerId, blendSignalsByRatingKey(rByCat));
  }

  return result;
}
