import { describe, expect, test } from 'vitest';

import {
  aggregateDifficultyFielding,
  MIN_DIFFICULTY_OPPORTUNITIES,
} from '../difficultyFieldingAggregator';
import { mapPersistedSpecialPlayType } from '../fwarCalculator';
import type { FieldingEvent } from '../../utils/eventLog';

let sequence = 0;

function fieldingEvent(overrides: Partial<FieldingEvent> = {}): FieldingEvent {
  sequence += 1;
  const playerId = overrides.playerId ?? 'p1';

  return {
    fieldingEventId: `fe-${sequence}`,
    gameId: 'game-1',
    atBatEventId: `ab-${sequence}`,
    sequence,
    playerId,
    playerName: `${playerId} name`,
    position: 'CF',
    teamId: 'team-a',
    playType: 'putout',
    difficulty: 'routine',
    specialPlayType: null,
    ballInPlay: {
      trajectory: 'fly',
      zone: 8,
      velocity: 'hard',
      fielderIds: [playerId],
      primaryFielderId: playerId,
    },
    success: true,
    runsPreventedOrAllowed: 0,
    ...overrides,
  };
}

describe('aggregateDifficultyFielding A1.5c-1', () => {
  test('empty input returns an empty aggregate map', () => {
    expect(aggregateDifficultyFielding([])).toEqual({});
  });

  test('robbedHR made earns MAX weighted conversion credit', () => {
    const result = aggregateDifficultyFielding([
      fieldingEvent({ specialPlayType: 'Robbed HR', success: true }),
    ]);

    expect(result.p1.CF).toMatchObject({
      weightedConversion: 1,
      difficultyOpportunities: 1,
      difficultyConversions: 1,
      routinePlays: 0,
      totalPlays: 1,
      difficultyWeightedRate: null,
    });
  });

  test('diving, leaping, and over-shoulder conversions use HIGH/MID/LOW weights', () => {
    const result = aggregateDifficultyFielding([
      fieldingEvent({ specialPlayType: 'Diving' }),
      fieldingEvent({ specialPlayType: 'Leaping' }),
      fieldingEvent({ specialPlayType: 'Over Shoulder' }),
    ]);

    expect(result.p1.CF).toMatchObject({
      weightedConversion: 0.75 + 0.5 + 0.25,
      difficultyOpportunities: 3,
      difficultyConversions: 3,
      routinePlays: 0,
      totalPlays: 3,
      difficultyWeightedRate: null,
    });
  });

  test('Wall Catch maps to wall but stays tier 0 and not a difficulty opportunity', () => {
    expect(mapPersistedSpecialPlayType('Wall Catch')).toBe('wall');

    const result = aggregateDifficultyFielding([
      fieldingEvent({ specialPlayType: 'Wall Catch' }),
    ]);

    expect(result.p1.CF).toMatchObject({
      weightedConversion: 0,
      difficultyOpportunities: 0,
      difficultyConversions: 0,
      routinePlays: 1,
      totalPlays: 1,
      difficultyWeightedRate: null,
    });
  });

  test('Robbery Attempt with success false is a MAX opportunity with zero credit', () => {
    expect(mapPersistedSpecialPlayType('Robbery Attempt')).toBe('robbedHR');

    const result = aggregateDifficultyFielding([
      fieldingEvent({ specialPlayType: 'Robbery Attempt', success: false }),
    ]);

    expect(result.p1.CF).toMatchObject({
      weightedConversion: 0,
      difficultyOpportunities: 1,
      difficultyConversions: 0,
      routinePlays: 0,
      totalPlays: 1,
      difficultyWeightedRate: null,
    });
  });

  test('Missed Dive is a HIGH opportunity with zero credit when missed', () => {
    expect(mapPersistedSpecialPlayType('Missed Dive')).toBe('missedDive');

    const result = aggregateDifficultyFielding([
      fieldingEvent({ specialPlayType: 'Missed Dive', success: false }),
    ]);

    expect(result.p1.CF).toMatchObject({
      weightedConversion: 0,
      difficultyOpportunities: 1,
      difficultyConversions: 0,
      routinePlays: 0,
      totalPlays: 1,
      difficultyWeightedRate: null,
    });
  });

  test('Failed Robbery is a MAX opportunity with zero credit when missed', () => {
    expect(mapPersistedSpecialPlayType('Failed Robbery')).toBe('failedRobbery');

    const result = aggregateDifficultyFielding([
      fieldingEvent({ specialPlayType: 'Failed Robbery', difficulty: 'spectacular', success: false }),
    ]);

    expect(result.p1.CF).toMatchObject({
      weightedConversion: 0,
      difficultyOpportunities: 1,
      difficultyConversions: 0,
      routinePlays: 0,
      totalPlays: 1,
      difficultyWeightedRate: null,
    });
  });

  test('Beat Runner and Beat Throw are close-play arm signals, not range opportunities', () => {
    const result = aggregateDifficultyFielding([
      fieldingEvent({ specialPlayType: 'Beat Runner' }),
      fieldingEvent({ specialPlayType: 'Beat Throw', success: false }),
    ]);

    expect(result.p1.CF).toMatchObject({
      weightedConversion: 0,
      difficultyOpportunities: 0,
      difficultyConversions: 0,
      routinePlays: 2,
      totalPlays: 2,
      difficultyWeightedRate: null,
    });
  });

  test('null and Routine play types count total and routine plays but not opportunities', () => {
    const result = aggregateDifficultyFielding([
      fieldingEvent({ specialPlayType: null, playType: 'putout' }),
      fieldingEvent({ specialPlayType: 'Routine', playType: 'putout' }),
    ]);

    expect(result.p1.CF).toMatchObject({
      weightedConversion: 0,
      difficultyOpportunities: 0,
      difficultyConversions: 0,
      routinePlays: 2,
      totalPlays: 2,
      difficultyWeightedRate: null,
    });
  });

  test('field-leak guard uses stamped playerId and position without merging by position', () => {
    const result = aggregateDifficultyFielding([
      fieldingEvent({ playerId: 'p1', position: 'CF', specialPlayType: 'Diving' }),
      fieldingEvent({ playerId: 'p2', position: 'CF', specialPlayType: 'Leaping' }),
      fieldingEvent({ playerId: 'p1', position: 'LF', specialPlayType: 'Running' }),
    ]);

    expect(Object.keys(result).sort()).toEqual(['p1', 'p2']);
    expect(result.p1.CF).toMatchObject({
      weightedConversion: 0.75,
      difficultyOpportunities: 1,
      difficultyConversions: 1,
      totalPlays: 1,
    });
    expect(result.p2.CF).toMatchObject({
      weightedConversion: 0.5,
      difficultyOpportunities: 1,
      difficultyConversions: 1,
      totalPlays: 1,
    });
    expect(result.p1.LF).toMatchObject({
      weightedConversion: 0.25,
      difficultyOpportunities: 1,
      difficultyConversions: 1,
      totalPlays: 1,
    });
  });

  test('minimum sample gate returns null below 5 opportunities and a finite default rate at 5', () => {
    const belowGate = aggregateDifficultyFielding([
      fieldingEvent({ playerId: 'small', specialPlayType: 'Diving' }),
      fieldingEvent({ playerId: 'small', specialPlayType: 'Diving' }),
      fieldingEvent({ playerId: 'small', specialPlayType: 'Leaping' }),
      fieldingEvent({ playerId: 'small', specialPlayType: 'Over Shoulder' }),
    ]);

    const atGate = aggregateDifficultyFielding([
      fieldingEvent({ playerId: 'rated', specialPlayType: 'Diving' }),
      fieldingEvent({ playerId: 'rated', specialPlayType: 'Diving' }),
      fieldingEvent({ playerId: 'rated', specialPlayType: 'Leaping' }),
      fieldingEvent({ playerId: 'rated', specialPlayType: 'Over Shoulder' }),
      fieldingEvent({ playerId: 'rated', specialPlayType: 'Missed Dive', success: false }),
    ]);

    expect(MIN_DIFFICULTY_OPPORTUNITIES).toBe(5);
    expect(belowGate.small.CF.difficultyOpportunities).toBe(4);
    expect(belowGate.small.CF.difficultyWeightedRate).toBeNull();
    expect(atGate.rated.CF.difficultyOpportunities).toBe(5);
    expect(atGate.rated.CF.weightedConversion).toBe(2.25);
    expect(atGate.rated.CF.difficultyWeightedRate).toBeCloseTo(2.25 / 5, 8);
  });

  test('raw components remain exposed for alternate total-play denominator', () => {
    const result = aggregateDifficultyFielding([
      fieldingEvent({ specialPlayType: 'Diving' }),
      fieldingEvent({ specialPlayType: 'Diving' }),
      fieldingEvent({ specialPlayType: 'Leaping' }),
      fieldingEvent({ specialPlayType: 'Over Shoulder' }),
      fieldingEvent({ specialPlayType: 'Missed Dive', success: false }),
      fieldingEvent({ specialPlayType: 'Routine' }),
    ]);

    const aggregate = result.p1.CF;
    const alternateTotalPlayRate = aggregate.weightedConversion / aggregate.totalPlays;

    expect(aggregate).toMatchObject({
      weightedConversion: 2.25,
      difficultyOpportunities: 5,
      difficultyConversions: 4,
      routinePlays: 1,
      totalPlays: 6,
    });
    expect(aggregate.difficultyWeightedRate).toBeCloseTo(2.25 / 5, 8);
    expect(alternateTotalPlayRate).toBeCloseTo(2.25 / 6, 8);
  });
});
