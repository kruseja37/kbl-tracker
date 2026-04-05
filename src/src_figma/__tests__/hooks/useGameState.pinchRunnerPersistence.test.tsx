import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockLogAtBatEvent,
  mockGetGameHeader,
  mockGetGameEvents,
  mockGetBetweenPlayEvents,
  mockLoadCurrentGame,
  mockClearCurrentGame,
} = vi.hoisted(() => ({
  mockLogAtBatEvent: vi.fn().mockResolvedValue(undefined),
  mockGetGameHeader: vi.fn(),
  mockGetGameEvents: vi.fn(),
  mockGetBetweenPlayEvents: vi.fn(),
  mockLoadCurrentGame: vi.fn(),
  mockClearCurrentGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/eventLog', () => ({
  getGameHeader: mockGetGameHeader,
  getGameEvents: mockGetGameEvents,
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  getGameFieldingEvents: vi.fn().mockResolvedValue([]),
  logAtBatEvent: mockLogAtBatEvent,
  logBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  undoMostRecentGameAction: vi.fn().mockResolvedValue(null),
  createGameHeader: vi.fn().mockResolvedValue(undefined),
  completeGame: vi.fn().mockResolvedValue(undefined),
  markGameAggregated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/gameStorage', () => ({
  loadCurrentGame: mockLoadCurrentGame,
  clearCurrentGame: mockClearCurrentGame,
  saveCurrentGame: vi.fn().mockResolvedValue(undefined),
  immediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  archiveCompletedGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/processCompletedGame', () => ({
  processCompletedGame: vi.fn().mockResolvedValue({
    aggregation: { success: true, milestones: null },
  }),
}));

vi.mock('../../../utils/playoffStorage', () => ({
  aggregateGameToPlayoffStats: vi.fn().mockResolvedValue(undefined),
}));

import { useGameState } from '../../hooks/useGameState';

describe('useGameState pinch-runner persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadCurrentGame.mockResolvedValue(null);
  });

  test('replays pinch-runner substitutions into the recovered runner tracker', async () => {
    mockGetGameHeader.mockResolvedValue({
      gameId: 'game-pr-1',
      isComplete: false,
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      competitionType: 'exhibition',
      date: 0,
      startingLineups: {
        away: [
          { playerId: 'away-batter-1', playerName: 'Away Batter 1', position: 'SS', battingOrder: 1 },
          { playerId: 'away-batter-2', playerName: 'Away Batter 2', position: 'CF', battingOrder: 2 },
        ],
        home: [
          { playerId: 'home-batter-1', playerName: 'Home Batter 1', position: '2B', battingOrder: 1 },
          { playerId: 'home-batter-2', playerName: 'Home Batter 2', position: 'RF', battingOrder: 2 },
        ],
      },
      benchRosters: {
        away: [{ playerId: 'away-pr-1', playerName: 'Away Pinch Runner', positions: ['OF'] }],
        home: [],
      },
      startingPitchers: {
        away: { playerId: 'away-sp', playerName: 'Away Starter' },
        home: { playerId: 'home-sp', playerName: 'Home Starter' },
      },
    });

    mockGetGameEvents.mockResolvedValue([
      {
        eventId: 'ab-1',
        gameId: 'game-pr-1',
        eventIndex: 1,
        timestamp: 100,
        batterId: 'away-batter-1',
        batterName: 'Away Batter 1',
        batterTeamId: 'away-team',
        pitcherId: 'home-sp',
        pitcherName: 'Home Starter',
        pitcherTeamId: 'home-team',
        result: '1B',
        rbiCount: 0,
        runsScored: 0,
        inning: 1,
        halfInning: 'TOP',
        outs: 0,
        runners: { first: null, second: null, third: null },
        awayScore: 0,
        homeScore: 0,
        outsAfter: 0,
        runnersAfter: {
          first: null,
          second: null,
          third: {
            runnerId: 'away-runner-old',
            runnerName: 'Original Runner',
            responsiblePitcherId: 'home-sp',
          },
        },
        awayScoreAfter: 0,
        homeScoreAfter: 0,
        leverageIndex: 1,
        winProbabilityBefore: 0.5,
        winProbabilityAfter: 0.5,
        wpa: 0,
        ballInPlay: null,
        fameEvents: [],
        isLeadoff: true,
        isClutch: false,
        isWalkOff: false,
        batterContext: {
          playerId: 'away-batter-1',
          playerName: 'Away Batter 1',
          battingOrder: 1,
          enteredAs: 'starter',
        },
      },
    ]);

    mockGetBetweenPlayEvents.mockResolvedValue([
      {
        eventId: 'bp-sub-1',
        gameId: 'game-pr-1',
        eventIndex: 2,
        timestamp: 200,
        type: 'substitution',
        gameState: {
          inning: 1,
          halfInning: 'TOP',
          outs: 0,
          score: { away: 0, home: 0 },
          runnersOn: { first: null, second: null, third: 'away-runner-old' },
        },
        substitution: {
          subType: 'pinch_run',
          outPlayerId: 'away-runner-old',
          outPlayerName: 'Original Runner',
          outPosition: 'CF',
          inPlayerId: 'away-pr-1',
          inPlayerName: 'Away Pinch Runner',
        },
      },
    ]);

    const { result } = renderHook(() => useGameState('game-pr-1'));

    let loaded = false;
    await act(async () => {
      loaded = await result.current.loadExistingGame();
    });

    expect(loaded).toBe(true);
    expect(result.current.getBaseRunnerNames().third).toBe('Away Pinch Runner');

    await act(async () => {
      await result.current.commitPlateAppearance({
        type: 'hit',
        hitType: '1B',
        runnerAdvancement: { fromThird: 'home' },
      });
    });

    expect(mockLogAtBatEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAtBatEvent.mock.calls[0][0]).toMatchObject({
      runnerOutcomes: [
        expect.objectContaining({
          runnerId: 'away-pr-1',
          runnerName: 'Away Pinch Runner',
          fromBase: 'third',
          toBase: 'home',
        }),
      ],
      runsScored: 1,
    });
  });
});
