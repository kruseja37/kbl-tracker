// SEASON-ONLY: career `*ByPosition` difficulty parity is deferred (careerStorage.ts:159-162 has the same unfed maps); a future career consumer must not assume this fills them.

import type { FieldingEvent } from '../utils/eventLog';
import { mapPersistedSpecialPlayType, type Difficulty } from './fwarCalculator';

export const MIN_DIFFICULTY_OPPORTUNITIES = 5;

export type DifficultyConversionTier = 'MAX' | 'HIGH' | 'MID' | 'LOW' | 'routine';

export interface DifficultyConversionLadderEntry {
  tier: DifficultyConversionTier;
  weight: number;
  isDifficultyOpportunity: boolean;
}

export interface DifficultyFieldingAggregate {
  weightedConversion: number;
  difficultyOpportunities: number;
  difficultyConversions: number;
  routinePlays: number;
  totalPlays: number;
  difficultyWeightedRate: number | null;
}

type DifficultyLadderKey = Difficulty | 'null';

export const DIFFICULTY_CONVERSION_LADDER = {
  robbedHR: { tier: 'MAX', weight: 1, isDifficultyOpportunity: true },
  diving: { tier: 'HIGH', weight: 0.75, isDifficultyOpportunity: true },
  sliding: { tier: 'HIGH', weight: 0.75, isDifficultyOpportunity: true },
  missedDive: { tier: 'HIGH', weight: 0.75, isDifficultyOpportunity: true },
  leaping: { tier: 'MID', weight: 0.5, isDifficultyOpportunity: true },
  missedLeap: { tier: 'MID', weight: 0.5, isDifficultyOpportunity: true },
  overShoulder: { tier: 'LOW', weight: 0.25, isDifficultyOpportunity: true },
  running: { tier: 'LOW', weight: 0.25, isDifficultyOpportunity: true },
  routine: { tier: 'routine', weight: 0, isDifficultyOpportunity: false },
  charging: { tier: 'routine', weight: 0, isDifficultyOpportunity: false },
  wall: { tier: 'routine', weight: 0, isDifficultyOpportunity: false },
  beatRunner: { tier: 'routine', weight: 0, isDifficultyOpportunity: false },
  beatThrow: { tier: 'routine', weight: 0, isDifficultyOpportunity: false },
  null: { tier: 'routine', weight: 0, isDifficultyOpportunity: false },
} as const satisfies Record<DifficultyLadderKey, DifficultyConversionLadderEntry>;

function emptyAggregate(): DifficultyFieldingAggregate {
  return {
    weightedConversion: 0,
    difficultyOpportunities: 0,
    difficultyConversions: 0,
    routinePlays: 0,
    totalPlays: 0,
    difficultyWeightedRate: null,
  };
}

function ladderKeyFor(difficulty: Difficulty | null): DifficultyLadderKey {
  return difficulty ?? 'null';
}

export function aggregateDifficultyFielding(
  events: FieldingEvent[],
): Record<string, Record<string, DifficultyFieldingAggregate>> {
  const aggregates: Record<string, Record<string, DifficultyFieldingAggregate>> = {};

  for (const event of events) {
    const playerBucket = aggregates[event.playerId] ??= {};
    const aggregate = playerBucket[event.position] ??= emptyAggregate();
    const mappedDifficulty = mapPersistedSpecialPlayType(event.specialPlayType);
    const ladderEntry = DIFFICULTY_CONVERSION_LADDER[ladderKeyFor(mappedDifficulty)];
    const made = event.success === true;

    aggregate.totalPlays += 1;

    if (ladderEntry.isDifficultyOpportunity) {
      aggregate.difficultyOpportunities += 1;

      if (made) {
        aggregate.difficultyConversions += 1;
        aggregate.weightedConversion += ladderEntry.weight;
      }
    } else {
      aggregate.routinePlays += 1;
    }
  }

  for (const playerBucket of Object.values(aggregates)) {
    for (const aggregate of Object.values(playerBucket)) {
      aggregate.difficultyWeightedRate = aggregate.difficultyOpportunities >= MIN_DIFFICULTY_OPPORTUNITIES
        ? aggregate.weightedConversion / aggregate.difficultyOpportunities
        : null;
    }
  }

  return aggregates;
}
