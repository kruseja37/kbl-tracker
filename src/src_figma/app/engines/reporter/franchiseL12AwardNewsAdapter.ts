import type { SeasonNewsEvent } from './seasonNewsGenerator';
import type { NarrativeEventType } from '../../../../engines/narrativeEngine';

// SIM-tuned placeholder dramatic-weight tuning for L12 marquee honors (§16; conservative).
export const L12_NEWS_DRAMATIC_WEIGHT = {
  base: { MVP: 0.8, CY_YOUNG: 0.7, ALL_STAR: 0.6 },
  magnitudeScale: 0.3,
} as const;

export type FranchiseHonorKind = 'MVP' | 'CY_YOUNG' | 'ALL_STAR';
export type FranchiseHonorTriggerPhase = 'season-end' | 'all-star-lock';

export interface FranchiseHonorNewsInput {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  honorKind: FranchiseHonorKind;
  triggerPhase: FranchiseHonorTriggerPhase;
  subjectIds: string[];          // the honored player ids (MVP/CY = [winnerId]; All-Star = the selected/notable ids)
  facts: Record<string, unknown>;// deterministic ground truth lifted verbatim by the caller — never fabricated here
  magnitude?: number;            // optional 0..1 drama input (award margin / roster notability); clamped
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function buildFranchiseAwardSeasonNewsEvent(input: FranchiseHonorNewsInput): SeasonNewsEvent {
  const magnitude = clamp(input.magnitude ?? 0.4, 0, 1);
  const dramaticWeight = clamp(
    L12_NEWS_DRAMATIC_WEIGHT.base[input.honorKind] + L12_NEWS_DRAMATIC_WEIGHT.magnitudeScale * magnitude,
    0, 1,
  );
  const eventType: NarrativeEventType = 'AWARD_RESULT';
  return {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    seasonNumber: input.seasonNumber,
    eventType,
    subjectIds: [...input.subjectIds],
    facts: {
      ...input.facts,
      honorKind: input.honorKind,
      triggerPhase: input.triggerPhase,
    },
    dramaticWeight,
  };
}
