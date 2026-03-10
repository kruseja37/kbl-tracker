import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockLogAtBatEvent,
  mockLogBetweenPlayEvent,
  mockCreateGameHeader,
  mockCompleteGame,
  mockGetGameEvents,
  mockGetBetweenPlayEvents,
  mockMarkGameAggregated,
  mockGetGameFieldingEvents,
  mockGetGameHeader,
  mockArchiveCompletedGame,
  mockSaveCurrentGame,
  mockLoadCurrentGame,
  mockImmediateSaveCurrentGame,
  mockClearCurrentGame,
  mockProcessCompletedGame,
  mockAggregateGameToPlayoffStats,
} = vi.hoisted(() => ({
  mockLogAtBatEvent: vi.fn().mockResolvedValue(undefined),
  mockLogBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockCompleteGame: vi.fn().mockResolvedValue(undefined),
  mockGetGameEvents: vi.fn().mockResolvedValue([]),
  mockGetBetweenPlayEvents: vi.fn().mockResolvedValue([]),
  mockMarkGameAggregated: vi.fn().mockResolvedValue(undefined),
  mockGetGameFieldingEvents: vi.fn().mockResolvedValue([]),
  mockGetGameHeader: vi.fn().mockResolvedValue(null),
  mockArchiveCompletedGame: vi.fn().mockResolvedValue(undefined),
  mockSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockLoadCurrentGame: vi.fn().mockResolvedValue(null),
  mockImmediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockClearCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockProcessCompletedGame: vi.fn().mockResolvedValue({
    aggregation: { success: true, milestones: null },
  }),
  mockAggregateGameToPlayoffStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/eventLog', () => ({
  logAtBatEvent: mockLogAtBatEvent,
  logBetweenPlayEvent: mockLogBetweenPlayEvent,
  createGameHeader: mockCreateGameHeader,
  completeGame: mockCompleteGame,
  getGameEvents: mockGetGameEvents,
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  markGameAggregated: mockMarkGameAggregated,
  getGameFieldingEvents: mockGetGameFieldingEvents,
  getGameHeader: mockGetGameHeader,
}));

vi.mock('../../utils/gameStorage', () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  saveCurrentGame: mockSaveCurrentGame,
  loadCurrentGame: mockLoadCurrentGame,
  immediateSaveCurrentGame: mockImmediateSaveCurrentGame,
  clearCurrentGame: mockClearCurrentGame,
}));

vi.mock('../../../utils/processCompletedGame', () => ({
  processCompletedGame: mockProcessCompletedGame,
}));

vi.mock('../../../utils/playoffStorage', () => ({
  aggregateGameToPlayoffStats: mockAggregateGameToPlayoffStats,
}));

import { useGameState } from '../../hooks/useGameState';

describe('useGameState recover between-play ledger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockLoadCurrentGame.mockResolvedValue(null);
    mockGetGameHeader.mockResolvedValue({
      gameId: 'recovery-game',
      date: Date.now(),
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      stadiumName: 'Test Park',
      finalScore: null,
      finalInning: 1,
      isComplete: false,
      aggregated: false,
      aggregatedAt: null,
      aggregationError: null,
      eventCount: 1,
      checksum: '',
    });
    mockGetGameEvents.mockResolvedValue([
      {
        eventId: 'recovery-game_1',
        gameId: 'recovery-game',
        eventIndex: 1,
        timestamp: 1000,
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
          first: {
            runnerId: 'away-batter-1',
            runnerName: 'Away Batter 1',
            responsiblePitcherId: 'home-sp',
          },
          second: null,
          third: null,
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
      },
    ]);
    mockGetBetweenPlayEvents.mockResolvedValue([
      {
        eventId: 'recovery-game_bp_1',
        gameId: 'recovery-game',
        timestamp: 1100,
        eventIndex: 1.001,
        type: 'stolen_base',
        gameState: {
          inning: 1,
          halfInning: 'TOP',
          outs: 0,
          score: { away: 0, home: 0 },
          runnersOn: { first: 'away-batter-1' },
        },
        stolenBase: {
          runnerId: 'away-batter-1',
          runnerName: 'Away Batter 1',
          fromBase: 1,
          toBase: 2,
          isSuccessful: true,
        },
        runnerAction: {
          runnerId: 'away-batter-1',
          runnerName: 'Away Batter 1',
          fromBase: 1,
          toBase: 2,
          outcome: 'safe',
          reason: 'stolen_base',
        },
      },
      {
        eventId: 'recovery-game_bp_2',
        gameId: 'recovery-game',
        timestamp: 1200,
        eventIndex: 1.002,
        type: 'pitcher_change',
        gameState: {
          inning: 1,
          halfInning: 'TOP',
          outs: 0,
          score: { away: 0, home: 0 },
          runnersOn: { second: 'away-batter-1' },
        },
        pitcherChange: {
          outgoingPitcherId: 'home-sp',
          outgoingPitcherName: 'Home Starter',
          incomingPitcherId: 'home-rp',
          incomingPitcherName: 'Home Reliever',
          inheritedRunners: 1,
          outgoingPitchCount: 12,
        },
      },
    ]);
  });

  test('rehydrates tail runner moves and current pitcher from between-play events', async () => {
    const { result } = renderHook(() => useGameState('recovery-game'));

    await act(async () => {
      const loaded = await result.current.loadExistingGame();
      expect(loaded).toBe(true);
      await vi.runAllTimersAsync();
    });

    expect(result.current.gameState.currentPitcherId).toBe('home-rp');
    expect(result.current.gameState.currentPitcherName).toBe('Home Reliever');
    expect(result.current.gameState.bases).toEqual({
      first: false,
      second: true,
      third: false,
    });
    expect(result.current.getBaseRunnerNames()).toEqual({
      second: 'Away Batter 1',
    });
  });
});
