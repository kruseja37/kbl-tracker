/**
 * RA-2b expected-stats peer-pool aggregator — pure / build-DARK.
 *
 * Source of truth: RATINGS_ADJUSTMENT_SPEC.md §4 + DECISIONS_LOG 2026-06-23 (RA-2,
 * wf_1598c5dc) + 2026-06-24 (RA-2b scope: pure cohort-math; role-derivation,
 * ladder membership + hysteresis STATE deferred to RA-2c).
 *
 * Given a cohort the caller has already grouped, this produces the per-category
 * peer-pool maps the expected-stats engine's resolve* helpers consume
 * (poolMeanByCat / poolSdByCat / peerPoolSize). It does NOT read the live league,
 * storage, DB, rosters, or prior-cohort state — RA-2c wires those. The MEAN is
 * position-pure (from members); the SD may be borrowed from a wider reference.
 */

import { TRUE_VALUE_MIN_PEER_POOL_SIZE } from './salaryCalculator';
import {
  EXPECTED_STATS_CATEGORIES,
  winsorizedStandardDeviation,
  type ExpectedStatsCategory,
} from './expectedStatsEngine';
import type { CategoryRateResult } from './expectedStatsCategoryRates';

/** §4 ratings-specific position pools — DECOUPLED from the TV-reserve TrueValuePoolKey. */
export type RatingsPoolKey =
  | 'C'
  | 'cornerIF'
  | 'middleIF'
  | 'cornerOF'
  | 'CF'
  | 'benchIF'
  | 'benchOF'
  | 'SP'
  | 'RP';

export type StarterRole = 'starter' | 'bench';

/** §4:80 sticky hysteresis thresholds (~0.55-0.60 promote / <0.45 demote). §16 sim-tune. */
export interface StarterRoleThresholds {
  promote: number;
  demote: number;
}

export const DEFAULT_STARTER_ROLE_THRESHOLDS: StarterRoleThresholds = {
  promote: 0.6,
  demote: 0.45,
};

/**
 * §4:80 sticky starter classifier with a promote/demote dead-band. In the
 * dead-band the prior cohort is retained (hysteresis); with no prior role a
 * dead-band player defaults to 'bench' (conservative — the everyday bar is not
 * granted to an unproven part-time player). priorRole + the start-share
 * numerator are supplied by RA-2c.
 */
export function classifyStarterRole(
  startShare: number,
  priorRole?: StarterRole,
  thresholds: StarterRoleThresholds = DEFAULT_STARTER_ROLE_THRESHOLDS,
): StarterRole {
  if (!Number.isFinite(startShare)) return priorRole ?? 'bench';
  if (startShare >= thresholds.promote) return 'starter';
  if (startShare < thresholds.demote) return 'bench';
  return priorRole ?? 'bench';
}

/** True when a category's finite-member count is below the min peer-pool floor (RA-2c climbs the §4 ladder). */
export function isPeerPoolBelowFloor(
  count: number,
  minPeerPool: number = TRUE_VALUE_MIN_PEER_POOL_SIZE,
): boolean {
  return !Number.isFinite(count) || count < minPeerPool;
}

export interface PoolAggregatorInput {
  /** Cohort members, each already mapped through RA-2a toExpectedStatsCategoryRates. */
  members: readonly CategoryRateResult[];
  /**
   * Optional wider reference for the winsorized SD ONLY (§4:65 "borrow a stable
   * SPREAD from a wider reference when the pool is thin"). The MEAN stays
   * position-pure (from members). Falls back to members when omitted.
   */
  spreadReference?: readonly CategoryRateResult[];
}

export interface PoolStatsResult {
  /** Position-pure mean of finite member rates, per category (engine poolMeanByCat). */
  poolMeanByCat: Partial<Record<ExpectedStatsCategory, number>>;
  /** Winsorized SD of the spread-reference rates, per category (engine poolSdByCat). */
  poolSdByCat: Partial<Record<ExpectedStatsCategory, number>>;
  /** Per-category count of finite member rates (engine peerPoolSize map form). */
  peerPoolSize: Partial<Record<ExpectedStatsCategory, number>>;
  /** Echo: sorted-ascending finite member rates per category (audit only). */
  peerValuesByCat: Partial<Record<ExpectedStatsCategory, number[]>>;
}

function finiteValuesForCategory(
  rows: readonly CategoryRateResult[],
  category: ExpectedStatsCategory,
): number[] {
  const values: number[] = [];
  for (const row of rows) {
    const value = row.actualByCat[category];
    if (typeof value === 'number' && Number.isFinite(value)) values.push(value);
  }
  return values;
}

/**
 * Aggregate one already-grouped cohort into the engine's peer-pool maps. Emits a
 * category only when it has >=1 finite member rate (honors RA-1/RA-2a null-gating
 * — e.g. armThrowingRate stays empty pre-RA-8). SD is emitted only when the
 * winsorized estimate is defined (needs >=2 finite spread values).
 */
export function aggregatePoolStats(input: PoolAggregatorInput): PoolStatsResult {
  const result: PoolStatsResult = {
    poolMeanByCat: {},
    poolSdByCat: {},
    peerPoolSize: {},
    peerValuesByCat: {},
  };

  const spreadRows = input.spreadReference ?? input.members;

  for (const category of EXPECTED_STATS_CATEGORIES) {
    const memberValues = finiteValuesForCategory(input.members, category);
    if (memberValues.length === 0) continue;

    const sum = memberValues.reduce((acc, value) => acc + value, 0);
    result.poolMeanByCat[category] = sum / memberValues.length;
    result.peerPoolSize[category] = memberValues.length;
    result.peerValuesByCat[category] = [...memberValues].sort((a, b) => a - b);

    const sd = winsorizedStandardDeviation(finiteValuesForCategory(spreadRows, category));
    if (sd !== null) {
      result.poolSdByCat[category] = sd;
    }
  }

  return result;
}
