import { describe, expect, test } from 'vitest';

import type { AtBatEvent } from '../../../../utils/eventLog';
import type { MilestoneWatch } from '../../../../utils/milestoneDetector';
import {
  buildFenwayMatchupSummary,
  formatFenwayMilestoneAlert,
  pickFenwayMilestoneWatches,
} from '../../app/utils/fenwayBoardContext';

function buildAtBatEvent(overrides: Partial<AtBatEvent>): AtBatEvent {
  return {
    eventId: overrides.eventId || 'game-1_1',
    gameId: overrides.gameId || 'game-1',
    eventIndex: overrides.eventIndex || 1,
    timestamp: overrides.timestamp || 1,
    inning: overrides.inning || 1,
    halfInning: overrides.halfInning || 'TOP',
    batterId: overrides.batterId || 'b1',
    batterName: overrides.batterName || 'Batter One',
    pitcherId: overrides.pitcherId || 'p1',
    pitcherName: overrides.pitcherName || 'Pitcher One',
    result: overrides.result || '1B',
    runnersBefore: overrides.runnersBefore || [],
    runnersAfter: overrides.runnersAfter || [],
    runsScored: overrides.runsScored || 0,
    outsBefore: overrides.outsBefore || 0,
    outsAfter: overrides.outsAfter || 0,
    scoreBefore: overrides.scoreBefore || { away: 0, home: 0 },
    scoreAfter: overrides.scoreAfter || { away: 0, home: 0 },
    winExpectancyBefore: overrides.winExpectancyBefore || 0.5,
    winExpectancyAfter: overrides.winExpectancyAfter || 0.5,
    leverageIndex: overrides.leverageIndex || 1,
    createdAt: overrides.createdAt || 1,
    version: overrides.version || 1,
    ...overrides,
  };
}

describe('fenwayBoardContext', () => {
  test('builds matchup summary for official at-bats only', () => {
    const summary = buildFenwayMatchupSummary([
      buildAtBatEvent({ result: '1B', timestamp: 1 }),
      buildAtBatEvent({ eventId: 'game-1_2', eventIndex: 2, result: 'BB', timestamp: 2 }),
      buildAtBatEvent({ eventId: 'game-1_3', eventIndex: 3, result: 'GO', timestamp: 3 }),
      buildAtBatEvent({ eventId: 'game-1_4', eventIndex: 4, batterId: 'other', timestamp: 4 }),
    ], 'b1', 'p1');

    expect(summary).toEqual({
      matchupRecord: '1-2',
      matchupAvg: '.500',
    });
  });

  test('distinguishes no matchup from walk-only matchup', () => {
    expect(buildFenwayMatchupSummary([], 'b1', 'p1')).toEqual({});

    expect(buildFenwayMatchupSummary([
      buildAtBatEvent({ result: 'BB' }),
    ], 'b1', 'p1')).toEqual({
      matchupRecord: '0-0',
      matchupAvg: undefined,
    });
  });

  test('prefers counting milestones and batter tie-breakers', () => {
    const watches: MilestoneWatch[] = [
      {
        playerId: 'pitcher-1',
        playerName: 'Pitcher One',
        statName: 'era',
        currentValue: 2.11,
        threshold: 2,
        neededForMilestone: 0.11,
        eventType: 'SEASON_SUB_2_ERA',
        description: '',
        category: 'season',
        isReachableInGame: true,
      },
      {
        playerId: 'b1',
        playerName: 'Batter One',
        statName: 'hits',
        currentValue: 24,
        threshold: 25,
        neededForMilestone: 1,
        eventType: 'CAREER_HITS',
        description: '',
        category: 'career',
        isReachableInGame: true,
      },
      {
        playerId: 'pitcher-1',
        playerName: 'Pitcher One',
        statName: 'strikeouts',
        currentValue: 199,
        threshold: 200,
        neededForMilestone: 1,
        eventType: 'CAREER_STRIKEOUTS',
        description: '',
        category: 'career',
        isReachableInGame: true,
      },
    ];

    expect(pickFenwayMilestoneWatches(watches, 'b1', 2).map((watch) => watch.playerId)).toEqual([
      'b1',
      'pitcher-1',
    ]);
  });

  test('formats milestone alerts with optional player names', () => {
    const watch: MilestoneWatch = {
      playerId: 'pitcher-1',
      playerName: 'Pitcher One',
      statName: 'strikeouts',
      currentValue: 199,
      threshold: 200,
      neededForMilestone: 1,
      eventType: 'CAREER_STRIKEOUTS',
      description: '',
      category: 'career',
      isReachableInGame: true,
    };

    expect(formatFenwayMilestoneAlert(watch, true)).toBe('Pitcher One: 1 from 200 K');
  });
});
