import type { SeasonNewsEvent } from './seasonNewsGenerator';
import type { NarrativeEventType } from '../../../../engines/narrativeEngine';

// SIM-tuned placeholder dramatic weight for the draft recap (§16; conservative, tunable).
export const DRAFT_RECAP_DRAMATIC_WEIGHT = { base: 0.5, magnitudeScale: 0.3 } as const;

export interface FranchiseDraftRecapNewsInput {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  subjectIds?: string[];            // optional notable drafted player ids
  facts: Record<string, unknown>;   // deterministic draft ground truth lifted verbatim by the caller - never fabricated here
  magnitude?: number;               // optional 0..1 drama (e.g. biggest-signing notability); clamped
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function buildFranchiseDraftRecapSeasonNewsEvent(input: FranchiseDraftRecapNewsInput): SeasonNewsEvent {
  const magnitude = clamp(input.magnitude ?? 0.4, 0, 1);
  const dramaticWeight = clamp(
    DRAFT_RECAP_DRAMATIC_WEIGHT.base + DRAFT_RECAP_DRAMATIC_WEIGHT.magnitudeScale * magnitude,
    0, 1,
  );
  const eventType: NarrativeEventType = 'OFFSEASON_NEWS';
  return {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    seasonNumber: input.seasonNumber,
    eventType,
    subjectIds: input.subjectIds ? [...input.subjectIds] : [],
    facts: { ...input.facts, recapKind: 'DRAFT' },
    dramaticWeight,
  };
}
