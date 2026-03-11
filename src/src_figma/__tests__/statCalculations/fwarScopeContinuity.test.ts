import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
  calculatePreferredFWARFromPersistedFieldingSet,
  calculateFWARFromScopedEvents,
  calculateSeasonFWAR,
  convertPersistedEventsToCalculator,
} from '../../../engines/fwarCalculator';
import type { FieldingEvent as PersistedFieldingEvent } from '../../../utils/eventLog';

const { mockGetFieldingEventsForScope } = vi.hoisted(() => ({
  mockGetFieldingEventsForScope: vi.fn(),
}));

vi.mock('../../../utils/eventLog', () => ({
  getFieldingEventsForScope: mockGetFieldingEventsForScope,
}));

function makePersistedFieldingEvent(
  overrides: Partial<PersistedFieldingEvent> = {}
): PersistedFieldingEvent {
  return {
    fieldingEventId: overrides.fieldingEventId || `fe-${Math.random().toString(36).slice(2, 8)}`,
    gameId: overrides.gameId || 'game-1',
    atBatEventId: overrides.atBatEventId || 'ab-1',
    sequence: overrides.sequence || 1,
    playerId: overrides.playerId || 'player-1',
    playerName: overrides.playerName || 'Player One',
    position: overrides.position || 'SS',
    teamId: overrides.teamId || 'team-a',
    playType: overrides.playType || 'putout',
    difficulty: overrides.difficulty || 'routine',
    ballInPlay: overrides.ballInPlay || ({
      hitType: 'groundball',
      direction: 'left',
      depth: 'normal',
    } as PersistedFieldingEvent['ballInPlay']),
    success: overrides.success ?? true,
    runsPreventedOrAllowed: overrides.runsPreventedOrAllowed ?? 0.03,
    specialPlayType: overrides.specialPlayType ?? null,
  };
}

describe('calculateFWARFromScopedEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('queries scoped fielding events with competition filters and prefers stable playerId', async () => {
    const stablePlayerEvent = makePersistedFieldingEvent({
      fieldingEventId: 'stable-1',
      playerId: 'player-ss',
      playerName: 'Stable Shortstop',
      teamId: 'team-a',
      position: 'SS',
      playType: 'putout',
    });
    const unrelatedLegacyEvent = makePersistedFieldingEvent({
      fieldingEventId: 'legacy-other-team',
      playerId: 'SS',
      playerName: 'Other Team Shortstop',
      teamId: 'team-b',
      position: 'SS',
      playType: 'assist',
    });

    mockGetFieldingEventsForScope.mockResolvedValue([
      stablePlayerEvent,
      unrelatedLegacyEvent,
    ]);

    const result = await calculateFWARFromScopedEvents('player-ss', 'SS', 12, 48, {
      statsScopeId: 'franchise-7-season-2',
      seasonId: 'franchise-7-season-2',
      competitionType: 'franchise',
      teamId: 'team-a',
    });

    expect(mockGetFieldingEventsForScope).toHaveBeenCalledWith(expect.objectContaining({
      statsScopeId: 'franchise-7-season-2',
      seasonId: 'franchise-7-season-2',
      competitionType: 'franchise',
      isComplete: true,
    }));

    const expected = calculateSeasonFWAR(
      convertPersistedEventsToCalculator([stablePlayerEvent]),
      'SS',
      12,
      48
    );

    expect(result?.fWAR).toBeCloseTo(expected.fWAR, 5);
    expect(result?.totalRunsSaved).toBeCloseTo(expected.totalRunsSaved, 5);
  });

  test('ignores legacy position-coded fielding rows without a stable player id match', async () => {
    const sameTeamLegacyEvent = makePersistedFieldingEvent({
      fieldingEventId: 'legacy-same-team',
      playerId: 'SS',
      playerName: 'Legacy Shortstop',
      teamId: 'team-a',
      position: 'SS',
      playType: 'assist',
    });
    const otherTeamLegacyEvent = makePersistedFieldingEvent({
      fieldingEventId: 'legacy-other-team',
      playerId: 'SS',
      playerName: 'Other Shortstop',
      teamId: 'team-b',
      position: 'SS',
      playType: 'putout',
    });

    mockGetFieldingEventsForScope.mockResolvedValue([
      sameTeamLegacyEvent,
      otherTeamLegacyEvent,
    ]);

    const result = await calculateFWARFromScopedEvents('stable-player-id', 'SS', 8, 48, {
      statsScopeId: 'season-legacy',
      seasonId: 'season-legacy',
      competitionType: 'franchise',
      teamId: 'team-a',
    });

    expect(result).toBeNull();
  });

  test('returns null when the scope has no matching fielding events for the player', async () => {
    mockGetFieldingEventsForScope.mockResolvedValue([
      makePersistedFieldingEvent({
        fieldingEventId: 'other-player',
        playerId: 'other-player',
        teamId: 'team-z',
      }),
    ]);

    const result = await calculateFWARFromScopedEvents('missing-player', 'CF', 6, 48, {
      statsScopeId: 'season-empty',
      competitionType: 'franchise',
      teamId: 'team-a',
    });

    expect(result).toBeNull();
  });

  test('prefers persisted events and only falls back to counting stats when none match', () => {
    const stablePlayerEvent = makePersistedFieldingEvent({
      fieldingEventId: 'stable-2',
      playerId: 'player-ss',
      teamId: 'team-a',
      position: 'SS',
      playType: 'assist',
    });

    const preferred = calculatePreferredFWARFromPersistedFieldingSet(
      [stablePlayerEvent],
      'player-ss',
      'SS',
      12,
      48,
      {
        teamId: 'team-a',
        fallbackStats: {
          putouts: 99,
          assists: 99,
          errors: 0,
          doublePlays: 99,
        },
      }
    );

    const expected = calculateSeasonFWAR(
      convertPersistedEventsToCalculator([stablePlayerEvent]),
      'SS',
      12,
      48
    );

    expect(preferred?.fWAR).toBeCloseTo(expected.fWAR, 5);

    const fallback = calculatePreferredFWARFromPersistedFieldingSet(
      [],
      'player-ss',
      'SS',
      12,
      48,
      {
        fallbackStats: {
          putouts: 24,
          assists: 30,
          errors: 2,
          doublePlays: 7,
        },
      }
    );

    expect(fallback).not.toBeNull();
    expect(fallback?.starPlayRuns).toBe(0);
  });
});
