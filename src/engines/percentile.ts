/**
 * Shared percentile primitives.
 *
 * Lifted verbatim (L9b-1) from the module-private helpers in
 * `salaryCalculator.ts` so the trait-from-reality scorer can consume the
 * EXACT same ranking math the True Value system uses — one truth, not a
 * re-implementation (drift risk). salaryCalculator re-imports these; the
 * behavior is byte-identical to the prior inlined definitions.
 *
 * CONTRACT (unchanged from the original): both helpers ASSUME the input array
 * is already sorted ASCENDING. Callers sort before calling.
 */

/**
 * Get the percentile rank of `value` within a sorted-ascending array.
 *
 * Returns the fraction of entries `<= value`, in [0, 1]. An empty array
 * returns the neutral 0.5 (no peers → no signal).
 */
export function getPercentile(value: number, sortedArray: number[]): number {
  if (sortedArray.length === 0) return 0.5;

  let count = 0;
  for (const v of sortedArray) {
    if (v <= value) count++;
    else break;
  }

  return count / sortedArray.length;
}

/**
 * Get the value at a given percentile within a sorted-ascending array.
 *
 * `percentile` is in [0, 1]. An empty array returns 0.
 */
export function getValueAtPercentile(percentile: number, sortedArray: number[]): number {
  if (sortedArray.length === 0) return 0;

  const index = Math.min(
    Math.floor(percentile * sortedArray.length),
    sortedArray.length - 1,
  );

  return sortedArray[index];
}
