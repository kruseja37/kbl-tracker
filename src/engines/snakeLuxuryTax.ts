import type { LuxuryCapRow } from '../data/tierParams';

/** Snake tax is roster-local; room size never changes a team's rating thresholds. */
export function snakeLuxuryCaps(baseCaps: LuxuryCapRow[]): LuxuryCapRow[] {
  return baseCaps;
}
