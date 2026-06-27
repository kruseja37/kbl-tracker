/**
 * franchiseL3MatrixNewsAdapter — the build-DARK L4b reporter tap.
 *
 * Maps a significant L3 master-morale-matrix consequence (the deterministic
 * ground truth of what happened) into a SeasonNewsEvent — the input shape the
 * beat reporter narrates as a season-level take over the L4a bus.
 *
 * PURE: no LLM call, no network, no I/O, no wall-clock, no randomness, fully
 * synchronous. Given the same input it always produces a deeply-equal
 * SeasonNewsEvent or null.
 *
 * DARK / ORPHANED-PENDING: there is NO production caller yet. This adapter does
 * NOT invoke the live reporter, does NOT wire into any emission path, and the
 * live reporter (seasonNewsGenerator.ts), reporterIntensity.ts, and
 * narrativeEngine.ts are untouched. The post-D13/browser emission seam is where
 * a caller will eventually plug this in.
 *
 * DEFAULTS TAKEN:
 * 1. Reuse the existing 'SEASON_SUMMARY' NarrativeEventType for the matrix
 *    season-take, avoiding a new NarrativeEventType and exhaustive-Record churn.
 * 2. The significance threshold and dramatic-weight numbers are §16 sim-tune
 *    placeholders: the line between per-play morale noise and a season take.
 * 3. This adapter is dormant. The live LLM emission, processCompletedGame
 *    wiring, and an isFranchisePhase2L4bEnabled flag are the browser/LLM-pending
 *    "reporter words" half, flagged for JK and intentionally not built here.
 *
 * The facts payload is deterministic ground truth lifted verbatim from the
 * matrix consequence input — never fabricated. id/createdAt fields are
 * intentionally NOT produced here; minting those belongs to the live reporter
 * downstream.
 */

import type { SeasonNewsEvent } from './seasonNewsGenerator';
import type { NarrativeEventType } from '../../../../engines/narrativeEngine';

export const L4B_MATRIX_NEWS_TUNING = {
  /** §16 placeholder — the line between per-play morale noise and a season-level take (abs morale points). */
  seasonTakeSignificanceThreshold: 5,
  base: 0.35,
  magnitudeScale: 0.35,
  /** §16 placeholder — magnitude denominator that maps an abs morale delta onto [0..1]. */
  magnitudeDenominator: 10,
} as const;

export interface FranchiseMatrixMoraleNewsInput {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  matrixEventType: string;
  personality: string;
  playerId: string;
  teamId: string;
  selfPlayerMoraleDelta: number;
  teamFanMoraleDelta: number;
  totalPlayerMoraleDelta: number;
  reason: string;
  isNeutral: boolean;
  sourceEventId: string;
}

/** Local clamp — Math.min/Math.max are pure (no randomness is used). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Build a SeasonNewsEvent from a significant L3 matrix morale consequence.
 * Pure and deterministic. Returns null when the tick is not a season-level take.
 */
export function buildFranchiseMatrixMoraleSeasonNewsEvent(
  input: FranchiseMatrixMoraleNewsInput,
): SeasonNewsEvent | null {
  const magnitude = Math.max(
    Math.abs(input.totalPlayerMoraleDelta),
    Math.abs(input.teamFanMoraleDelta),
  );

  if (
    input.isNeutral ||
    magnitude < L4B_MATRIX_NEWS_TUNING.seasonTakeSignificanceThreshold
  ) {
    return null;
  }

  const dramaticWeight = clamp(
    L4B_MATRIX_NEWS_TUNING.base +
      L4B_MATRIX_NEWS_TUNING.magnitudeScale *
        clamp(
          magnitude / L4B_MATRIX_NEWS_TUNING.magnitudeDenominator,
          0,
          1,
        ),
    0,
    1,
  );
  const eventType = 'SEASON_SUMMARY' as NarrativeEventType;

  return {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    seasonNumber: input.seasonNumber,
    eventType,
    subjectIds: [input.playerId, input.teamId],
    facts: {
      matrixEventType: input.matrixEventType,
      personality: input.personality,
      selfPlayerMoraleDelta: input.selfPlayerMoraleDelta,
      teamFanMoraleDelta: input.teamFanMoraleDelta,
      totalPlayerMoraleDelta: input.totalPlayerMoraleDelta,
      reason: input.reason,
      sourceEventId: input.sourceEventId,
    },
    dramaticWeight,
  };
}
