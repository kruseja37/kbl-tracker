import type {
  AuctionSimPlayer,
  NumericGradeWindow,
} from './types';
import {
  DEFAULT_NUMERIC_GRADE_WINDOWS,
  buildNumericPoolDiagnostics,
  numericWindowId,
  resolveNumericGrade,
  roleBucketForPlayer,
} from './poolDiagnostics';

export type PoolShapePolicyName = 'currentPool' | 'quotaShapeFromPool' | 'quotaShapeFromUniverse';

export interface QuotaShortfallDiagnostic {
  roleBucket: string;
  windowId: string;
  range: { minInclusive: number; maxExclusive: number };
  targetCount: number;
  availableCount: number;
  selectedCount: number;
}

export interface PoolShapePolicyOptions {
  targetSize: number;
  windows?: readonly NumericGradeWindow[];
  seed?: string;
}

export interface PoolShapeResult {
  policy: PoolShapePolicyName;
  players: AuctionSimPlayer[];
  targetSize: number;
  selectedSize: number;
  quotaShortfalls: QuotaShortfallDiagnostic[];
}

function byFitThenId(a: AuctionSimPlayer, b: AuctionSimPlayer): number {
  return (b.fitScore ?? 0) - (a.fitScore ?? 0) || a.playerId.localeCompare(b.playerId);
}

function targetCountsByBucket(
  candidates: readonly AuctionSimPlayer[],
  targetSize: number,
): Record<string, number> {
  const buckets: Record<string, AuctionSimPlayer[]> = {};
  for (const candidate of candidates) {
    const bucket = roleBucketForPlayer(candidate);
    (buckets[bucket] ??= []).push(candidate);
  }
  const bucketEntries = Object.entries(buckets).sort(([left], [right]) => left.localeCompare(right));
  const raw = bucketEntries.map(([bucket, players]) => ({
    bucket,
    base: (players.length / Math.max(1, candidates.length)) * targetSize,
  }));
  const counts = Object.fromEntries(raw.map((entry) => [entry.bucket, Math.floor(entry.base)]));
  let assigned = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const remainders = raw
    .map((entry) => ({ bucket: entry.bucket, remainder: entry.base - Math.floor(entry.base) }))
    .sort((left, right) => right.remainder - left.remainder || left.bucket.localeCompare(right.bucket));
  for (const entry of remainders) {
    if (assigned >= targetSize) break;
    counts[entry.bucket] += 1;
    assigned += 1;
  }
  return counts;
}

function targetWindowCounts(bucketTarget: number, windows: readonly NumericGradeWindow[]): Record<string, number> {
  const raw = windows.map((window) => ({
    window,
    base: bucketTarget * window.targetShare,
  }));
  const counts = Object.fromEntries(raw.map((entry) => [entry.window.id, Math.floor(entry.base)]));
  let assigned = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const remainders = raw
    .map((entry) => ({ windowId: entry.window.id, remainder: entry.base - Math.floor(entry.base) }))
    .sort((left, right) => right.remainder - left.remainder || left.windowId.localeCompare(right.windowId));
  for (const entry of remainders) {
    if (assigned >= bucketTarget) break;
    counts[entry.windowId] += 1;
    assigned += 1;
  }
  return counts;
}

function selectableInWindow(
  candidates: readonly AuctionSimPlayer[],
  window: NumericGradeWindow,
  alreadySelected: Set<string>,
): AuctionSimPlayer[] {
  return candidates
    .filter((candidate) => {
      if (alreadySelected.has(candidate.playerId)) return false;
      const grade = resolveNumericGrade(candidate).numericGrade;
      return grade !== null && grade >= window.minInclusive && grade < window.maxExclusive;
    })
    .sort(byFitThenId);
}

export function currentPool(candidates: readonly AuctionSimPlayer[]): PoolShapeResult {
  return {
    policy: 'currentPool',
    players: [...candidates],
    targetSize: candidates.length,
    selectedSize: candidates.length,
    quotaShortfalls: [],
  };
}

export function quotaShapeFromPool(
  candidates: readonly AuctionSimPlayer[],
  options: PoolShapePolicyOptions,
): PoolShapeResult {
  const windows = options.windows ?? DEFAULT_NUMERIC_GRADE_WINDOWS;
  const targetSize = Math.min(candidates.length, Math.max(0, Math.floor(options.targetSize)));
  const bucketTargets = targetCountsByBucket(candidates, targetSize);
  const byBucket: Record<string, AuctionSimPlayer[]> = {};
  for (const candidate of candidates) {
    const numeric = resolveNumericGrade(candidate).numericGrade;
    if (numeric === null || numericWindowId(numeric, windows) === null) continue;
    (byBucket[roleBucketForPlayer(candidate)] ??= []).push(candidate);
  }

  const selected = new Map<string, AuctionSimPlayer>();
  const shortfalls: QuotaShortfallDiagnostic[] = [];
  for (const [bucket, bucketTarget] of Object.entries(bucketTargets).sort(([left], [right]) => left.localeCompare(right))) {
    const bucketCandidates = byBucket[bucket] ?? [];
    const windowTargets = targetWindowCounts(bucketTarget, windows);
    for (const window of windows) {
      const targetCount = windowTargets[window.id] ?? 0;
      if (targetCount <= 0) continue;
      const available = selectableInWindow(bucketCandidates, window, new Set(selected.keys()));
      const picks = available.slice(0, targetCount);
      for (const pick of picks) selected.set(pick.playerId, pick);
      if (picks.length < targetCount) {
        shortfalls.push({
          roleBucket: bucket,
          windowId: window.id,
          range: { minInclusive: window.minInclusive, maxExclusive: window.maxExclusive },
          targetCount,
          availableCount: available.length,
          selectedCount: picks.length,
        });
      }
    }
  }

  return {
    policy: 'quotaShapeFromPool',
    players: [...selected.values()].sort((left, right) => left.playerId.localeCompare(right.playerId)),
    targetSize,
    selectedSize: selected.size,
    quotaShortfalls: shortfalls,
  };
}

export function quotaShapeFromUniverse(
  universe: readonly AuctionSimPlayer[],
  options: PoolShapePolicyOptions,
): PoolShapeResult {
  const result = quotaShapeFromPool(universe, options);
  return { ...result, policy: 'quotaShapeFromUniverse' };
}

export function summarizePoolShape(result: PoolShapeResult): {
  policy: PoolShapePolicyName;
  selectedSize: number;
  targetSize: number;
  shortfallCount: number;
  medianNumericGrade: number | null;
  barbellIndex: number;
} {
  const diagnostics = buildNumericPoolDiagnostics(result.players);
  return {
    policy: result.policy,
    selectedSize: result.selectedSize,
    targetSize: result.targetSize,
    shortfallCount: result.quotaShortfalls.length,
    medianNumericGrade: diagnostics.medianNumericGrade,
    barbellIndex: diagnostics.barbellIndex,
  };
}
