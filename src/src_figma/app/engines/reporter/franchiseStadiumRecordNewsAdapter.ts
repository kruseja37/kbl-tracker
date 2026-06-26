import type { FranchiseStadiumRecordChange } from '../../../../utils/franchiseStadiumRecordsStorage';
import type { SeasonNewsEvent } from './seasonNewsGenerator';

/**
 * PURE / dormant / build-dark stadium-record reporter adapter.
 *
 * This deterministic half only mints the SeasonNewsEvent facts a later reporter
 * LLM can render. It has no production caller, no LLM/IO, no wall-clock, and no
 * randomness. The flagged emission seam intentionally remains future work:
 * clone franchiseRelationshipFlareEmission's flag gate -> config load -> adapter
 * -> generateSeasonNewsTake/callClaudeMessages -> emission dedup -> persist.
 *
 * playContext is intentionally null in v1. Single-play-swing context lives in
 * CompletedGameRecord.atBatEvents, not on FranchiseStadiumRecordChange; rebuilding
 * that here would break this adapter's pure change -> event contract. A later
 * schema ticket can thread exact play context into the change/record.
 *
 * The future emission dedup key is present in facts:
 * (stadiumId, recordType, recordKey, newValue).
 */

// SIM-tuned placeholder dramatic-weight tuning for stadium-record news (§16).
export const STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT = {
  setBase: 0.5,
  overtakeBase: 0.6,
  magnitudeScale: 0.25,
} as const;

export interface FranchiseStadiumRecordNewsInput {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  change: FranchiseStadiumRecordChange;
  stadiumName?: string | null;
  triggerPhase?: 'in-season' | 'season-end';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function uniquePlayerIds(newLeaderPlayerIds: string[], priorLeaderPlayerIds: string[]): string[] {
  const seen = new Set<string>();
  const subjectIds: string[] = [];

  for (const playerId of [...newLeaderPlayerIds, ...priorLeaderPlayerIds]) {
    if (seen.has(playerId)) {
      continue;
    }
    seen.add(playerId);
    subjectIds.push(playerId);
  }

  return subjectIds;
}

export function buildFranchiseStadiumRecordSeasonNewsEvent(
  input: FranchiseStadiumRecordNewsInput,
): SeasonNewsEvent {
  const { change } = input;
  const base =
    change.changeKind === 'overtake'
      ? STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT.overtakeBase
      : STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT.setBase;
  const magnitude =
    change.priorValue == null
      ? 0.5
      : clamp(
          Math.abs(change.newValue - change.priorValue) /
            Math.max(Math.abs(change.priorValue), 1),
          0,
          1,
        );
  const dramaticWeight = clamp(
    base + STADIUM_RECORD_NEWS_DRAMATIC_WEIGHT.magnitudeScale * magnitude,
    0,
    1,
  );
  const batterHand =
    change.recordType === 'farthest-hr-rhb'
      ? 'R'
      : change.recordType === 'farthest-hr-lhb'
        ? 'L'
        : null;

  return {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    seasonNumber: input.seasonNumber,
    eventType: 'STADIUM_RECORD',
    subjectIds: uniquePlayerIds(
      change.newLeaderPlayerIds,
      change.priorLeaderPlayerIds,
    ),
    facts: {
      recordType: change.recordType,
      recordKey: change.recordKey,
      stadiumId: change.stadiumId,
      stadiumName: input.stadiumName ?? null,
      changeKind: change.changeKind,
      newValue: change.newValue,
      oldValue: change.priorValue,
      newHolderIds: change.newLeaderPlayerIds,
      overtakenHolderIds: change.priorLeaderPlayerIds,
      batterHand,
      playContext: null,
      triggerPhase: input.triggerPhase ?? 'in-season',
    },
    dramaticWeight,
  };
}
