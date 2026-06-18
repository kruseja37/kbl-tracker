/**
 * franchiseL10NewsAdapter — the build-DARK L10 reporter tap.
 *
 * Maps a fired L10 random event (FranchiseL10EventCandidate) into a
 * SeasonNewsEvent — the deterministic ground-truth input the beat reporter
 * narrates. This is the final L10 piece (L10-5).
 *
 * PURE: no LLM call, no network, no I/O, no wall-clock, no randomness, fully
 * synchronous. Given the same input it always produces a deeply-equal
 * SeasonNewsEvent.
 *
 * DARK / ORPHANED-PENDING: there is NO production caller yet. This adapter does
 * NOT invoke the live reporter, does NOT wire into any emission path, and the
 * live reporter (seasonNewsGenerator.ts) plus reporterIntensity.ts are
 * untouched. The post-D13 emission seam is where a caller will eventually plug
 * this in. Reporter heat stays hardcoded 'medium' in v1 (this adapter does not
 * set heat — it only produces the news event).
 *
 * The facts payload is the deterministic ground truth lifted verbatim from the
 * fired event — never fabricated. id/createdAt fields are intentionally NOT
 * produced here; minting those belongs to the live reporter downstream.
 */

import type { SeasonNewsEvent } from './seasonNewsGenerator';
import type { FranchiseL10EventCandidate } from '../../../../engines/franchiseL10EventEngine';
import type { NarrativeEventType } from '../../../../engines/narrativeEngine';

/**
 * SIM-tuned placeholder dramatic-weight tuning for L10 events. Conservative by
 * design — these are placeholders, kept small until SIM-tuned for real.
 */
export const L10_NEWS_DRAMATIC_WEIGHT = {
  base: {
    neutral: 0.3,
    positive: 0.45,
    negative: 0.5,
  },
  magnitudeScale: 0.15,
} as const;

/** Local clamp — Math.min/Math.max are pure (no randomness is used). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Build a SeasonNewsEvent from a fired L10 event. Pure and deterministic.
 */
export function buildFranchiseL10SeasonNewsEvent(input: {
  event: FranchiseL10EventCandidate;
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
}): SeasonNewsEvent {
  const { event, franchiseId, seasonId, seasonNumber } = input;

  const eventType: NarrativeEventType = 'RANDOM_EVENT';

  const dramaticWeight = clamp(
    L10_NEWS_DRAMATIC_WEIGHT.base[event.valence] +
      L10_NEWS_DRAMATIC_WEIGHT.magnitudeScale * event.magnitude,
    0,
    1,
  );

  return {
    franchiseId,
    seasonId,
    seasonNumber,
    eventType,
    subjectIds: [event.targetId],
    facts: {
      family: event.family,
      eventType: event.eventType,
      valence: event.valence,
      magnitude: event.magnitude,
      probability: event.probability,
      targetKind: event.targetKind,
      targetId: event.targetId,
    },
    dramaticWeight,
  };
}
