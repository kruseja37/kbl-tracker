/**
 * franchiseL11ManagerChangeNewsAdapter — the build-DARK L11 reporter tap.
 *
 * Maps a manager firing/relocation (the deterministic ground truth of an
 * L11-3 fireManager result) into a SeasonNewsEvent — the input shape the beat
 * reporter narrates. This is the final L11 piece (L11-5).
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
 * manager-change input — never fabricated. id/createdAt fields are
 * intentionally NOT produced here; minting those belongs to the live reporter
 * downstream.
 */

import type { SeasonNewsEvent } from './seasonNewsGenerator';
import type { NarrativeEventType } from '../../../../engines/narrativeEngine';
import type {
  ManagerFiredReason,
  ManagerTenureEndReason,
} from '../../../../types/managerWpa';

/**
 * SIM-tuned placeholder dramatic-weight tuning for L11 manager changes.
 * Conservative by design — these are placeholders, kept small until SIM-tuned
 * for real.
 */
export const L11_NEWS_DRAMATIC_WEIGHT = {
  base: {
    neutral: 0.4,
    negative: 0.6,
  },
  magnitudeScale: 0.3,
} as const;

export interface FranchiseManagerChangeNewsInput {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  teamId: string;
  teamName: string;
  firedManagerId: string;
  firedManagerName?: string;
  successorManagerId?: string;
  successorManagerName?: string;
  reason: ManagerFiredReason;
  endDate: string;
  teamFanMoraleAtFiring?: number;
}

/** Local clamp — Math.min/Math.max are pure (no randomness is used). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Build a SeasonNewsEvent from an L11 manager firing/relocation. Pure and
 * deterministic.
 */
export function buildFranchiseManagerChangeSeasonNewsEvent(
  input: FranchiseManagerChangeNewsInput,
): SeasonNewsEvent {
  const endReason: ManagerTenureEndReason =
    input.reason === 'rebrand' ? 'relocated' : 'fired';
  const valence: 'neutral' | 'negative' =
    endReason === 'relocated' ? 'neutral' : 'negative';
  const magnitude =
    input.teamFanMoraleAtFiring != null
      ? clamp((50 - input.teamFanMoraleAtFiring) / 50, 0, 1)
      : 0.4;
  const dramaticWeight = clamp(
    L11_NEWS_DRAMATIC_WEIGHT.base[valence] +
      L11_NEWS_DRAMATIC_WEIGHT.magnitudeScale * magnitude,
    0,
    1,
  );

  const eventType: NarrativeEventType = 'MANAGER_CHANGE';

  return {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    seasonNumber: input.seasonNumber,
    eventType,
    subjectIds: [
      input.firedManagerId,
      ...(input.successorManagerId ? [input.successorManagerId] : []),
    ],
    facts: {
      teamId: input.teamId,
      teamName: input.teamName,
      firedManagerId: input.firedManagerId,
      firedManagerName: input.firedManagerName,
      successorManagerId: input.successorManagerId,
      successorManagerName: input.successorManagerName,
      reason: input.reason,
      endReason,
      endDate: input.endDate,
      teamFanMoraleAtFiring: input.teamFanMoraleAtFiring,
    },
    dramaticWeight,
  };
}
