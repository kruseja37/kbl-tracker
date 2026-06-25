import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import {
  aggregateCheckpointWindowedCategoryRates,
  collectCheckpointWindowAtBatEvents,
  type WindowedGameAtBatEvents,
} from '../checkpointWindowedCategoryRates';
import type { AtBatResult } from '../../types/game';
import type { AtBatEvent } from '../../utils/eventLog';

function atBat(
  eventId: string,
  result: AtBatResult,
  overrides: Partial<AtBatEvent> = {},
): AtBatEvent {
  const outsRecorded = (overrides as Partial<AtBatEvent> & { outsRecorded?: number }).outsRecorded ?? 0;
  return {
    eventId,
    gameId: overrides.gameId ?? 'game-1',
    eventIndex: overrides.eventIndex ?? 1,
    timestamp: overrides.timestamp ?? 1,
    batterId: overrides.batterId ?? 'hitter-1',
    batterName: overrides.batterName ?? 'Hitter One',
    batterTeamId: overrides.batterTeamId ?? 'team-a',
    pitcherId: overrides.pitcherId ?? 'pitcher-1',
    pitcherName: overrides.pitcherName ?? 'Pitcher One',
    pitcherTeamId: overrides.pitcherTeamId ?? 'team-b',
    result,
    rbiCount: overrides.rbiCount ?? 0,
    runsScored: overrides.runsScored ?? [],
    inning: overrides.inning ?? 1,
    halfInning: overrides.halfInning ?? 'TOP',
    outs: overrides.outs ?? 0,
    runners: overrides.runners ?? { first: null, second: null, third: null },
    awayScore: overrides.awayScore ?? 0,
    homeScore: overrides.homeScore ?? 0,
    outsAfter: overrides.outsAfter ?? Math.min(3, (overrides.outs ?? 0) + outsRecorded),
    runnersAfter: overrides.runnersAfter ?? { first: null, second: null, third: null },
    awayScoreAfter: overrides.awayScoreAfter ?? 0,
    homeScoreAfter: overrides.homeScoreAfter ?? 0,
    leverageIndex: overrides.leverageIndex ?? 1,
    winProbabilityBefore: overrides.winProbabilityBefore ?? 0.5,
    winProbabilityAfter: overrides.winProbabilityAfter ?? 0.5,
    wpa: overrides.wpa ?? 0,
    ballInPlay: overrides.ballInPlay ?? null,
    fameEvents: overrides.fameEvents ?? [],
    isLeadoff: overrides.isLeadoff ?? false,
    isClutch: overrides.isClutch ?? false,
    isWalkOff: overrides.isWalkOff ?? false,
    ...overrides,
  } as AtBatEvent;
}

describe('checkpointWindowedCategoryRates RA-9b', () => {
  test('collectCheckpointWindowAtBatEvents keeps exactly (prevBoundary, current]', () => {
    const games: WindowedGameAtBatEvents[] = [
      { gameNumber: 4, events: [atBat('g4', '1B', { gameId: 'game-4' })] },
      { gameNumber: 5, events: [atBat('g5', '2B', { gameId: 'game-5' })] },
      { gameNumber: 6, events: [atBat('g6', '3B', { gameId: 'game-6' })] },
      { gameNumber: 7, events: [atBat('g7', 'HR', { gameId: 'game-7' })] },
    ];

    const windowEvents = collectCheckpointWindowAtBatEvents(games, 4, 6);

    expect(windowEvents.map((event) => event.eventId)).toEqual(['g5', 'g6']);
  });

  test('aggregateCheckpointWindowedCategoryRates filters undone events before counting', () => {
    const result = aggregateCheckpointWindowedCategoryRates([
      atBat('undone', 'HR', { undoneAt: 10 }),
      atBat('active', '2B'),
    ]);
    const hitter = result.hitters.get('hitter-1');

    expect(hitter?.sampleSizeByCat.powerSlugging).toBe(1);
    expect(hitter?.actualByCat.powerSlugging).toBe(2);
    expect(hitter?.actualByCat.powerHomeRunRate).toBe(0);
  });

  test('event counting maps to the same batting and pitching fields consumed by the category adapter', () => {
    const events: AtBatEvent[] = [
      atBat('single', '1B'),
      atBat('double', '2B'),
      atBat('ground-rule-double', 'GRD'),
      atBat('triple', '3B'),
      atBat('hr', 'HR'),
      atBat('inside-park-hr', 'ITPHR'),
      atBat('walk', 'BB'),
      atBat('intentional-walk', 'IBB'),
      atBat('hbp', 'HBP'),
      atBat('sac-fly', 'SF', { outsRecorded: 1 }),
      atBat('sac-bunt', 'SAC', { outsRecorded: 1 }),
      atBat('strikeout', 'K', { outsRecorded: 1 }),
      atBat('double-play', 'DP', { outsRecorded: 2 }),
    ];

    const result = aggregateCheckpointWindowedCategoryRates(events);
    const hitter = result.hitters.get('hitter-1');
    const pitcher = result.pitchers.get('pitcher-1');
    const pitcherAdapterBattersFaced = 5 + 6 + 2 + 1;

    expect(hitter?.actualByCat.powerSlugging).toBeCloseTo(16 / 8, 10);
    expect(hitter?.actualByCat.powerHomeRunRate).toBeCloseTo(2 / 13, 10);
    expect(hitter?.actualByCat.contactAvoidStrikeoutRate).toBeCloseTo(1 - (1 / 13), 10);
    expect(hitter?.actualByCat.speedStealTripleRate).toBeCloseTo(1 / 13, 10);
    expect(hitter?.sampleSizeByCat).toMatchObject({
      powerSlugging: 13,
      powerHomeRunRate: 13,
      contactAvoidStrikeoutRate: 13,
      speedStealTripleRate: 1,
    });

    expect(pitcher?.sampleSizeByCat.pitchingStrikeoutRate).toBe(pitcherAdapterBattersFaced);
    expect(pitcher?.actualByCat.pitchingStrikeoutRate).toBeCloseTo(1 / pitcherAdapterBattersFaced, 10);
    expect(pitcher?.actualByCat.pitchingWalkAvoidanceRate).toBeCloseTo(1 - (2 / pitcherAdapterBattersFaced), 10);
    expect(pitcher?.actualByCat.pitchingHomeRunSuppressionRate).toBeCloseTo(1 - (2 / pitcherAdapterBattersFaced), 10);
  });

  test('reuses contact-quality and UBR tally semantics in the temporary window rows', () => {
    const result = aggregateCheckpointWindowedCategoryRates([
      atBat('hard-contact', 'GO', {
        batterId: 'hitter-contact',
        pitcherId: 'pitcher-contact',
        enrichment: { exitType: 'hard' },
        outsRecorded: 1,
      }),
      atBat('weak-contact', 'GO', {
        batterId: 'hitter-contact',
        pitcherId: 'pitcher-contact',
        enrichment: { exitType: 'weak' },
        outsRecorded: 1,
      }),
      atBat('runner-pa', 'K', {
        batterId: 'runner-1',
        pitcherId: 'pitcher-contact',
        outsRecorded: 1,
      }),
      atBat('runner-first-to-third', '1B', {
        batterId: 'hitter-contact',
        pitcherId: 'pitcher-contact',
        runnerOutcomes: [
          {
            runnerId: 'runner-1',
            runnerName: 'Runner One',
            fromBase: 'first',
            toBase: 'third',
          },
        ],
      }),
    ]);

    expect(result.hitters.get('hitter-contact')?.actualByCat.contactQualityRate).toBeCloseTo(1 / 2, 10);
    expect(result.hitters.get('hitter-contact')?.sampleSizeByCat.contactQualityRate).toBe(2);
    expect(result.pitchers.get('pitcher-contact')?.actualByCat.pitchingWeakContactRate).toBeCloseTo(1 / 2, 10);
    expect(result.pitchers.get('pitcher-contact')?.sampleSizeByCat.pitchingWeakContactRate).toBe(2);
    expect(result.hitters.get('runner-1')?.actualByCat.speedBaserunningRate).toBe(1);
    expect(result.hitters.get('runner-1')?.sampleSizeByCat.speedBaserunningRate).toBe(1);
  });

  test('leaves hitter fielding actuals absent because recent fielding has no at-bat-event source', () => {
    const result = aggregateCheckpointWindowedCategoryRates([
      atBat('fielding-source-missing', '1B'),
    ]);
    const hitter = result.hitters.get('hitter-1');

    expect(hitter?.actualByCat.fieldingFieldingPct).toBeUndefined();
    expect(hitter?.actualByCat.fieldingRangeRate).toBeUndefined();
    expect(hitter?.sampleSizeByCat.fieldingFieldingPct).toBe(0);
    expect(hitter?.sampleSizeByCat.fieldingRangeRate).toBe(0);
  });

  test('source stays pure and routes rates through the shared category adapter and tally helpers', () => {
    const source = readFileSync('src/engines/checkpointWindowedCategoryRates.ts', 'utf8');

    expect(source).toMatch(/toExpectedStatsCategoryRates/);
    expect(source).toMatch(/tallyContactQualityByPlayer/);
    expect(source).toMatch(/aggregateUbrFromEvents/);
    expect(source).not.toMatch(/updateBattingStats|updatePitchingStats|updateFieldingStats|putFranchiseRatingsOverlay|indexedDB\.open/);
  });
});
