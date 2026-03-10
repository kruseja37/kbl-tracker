import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockLogAtBatEvent,
  mockLogBetweenPlayEvent,
  mockUndoMostRecentGameAction,
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
  mockUndoMostRecentGameAction: vi.fn().mockResolvedValue(null),
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockCompleteGame: vi.fn().mockResolvedValue(undefined),
  mockGetGameEvents: vi.fn().mockResolvedValue([]),
  mockGetBetweenPlayEvents: vi.fn().mockResolvedValue([]),
  mockMarkGameAggregated: vi.fn().mockResolvedValue(undefined),
  mockGetGameFieldingEvents: vi.fn().mockResolvedValue([]),
  mockGetGameHeader: vi.fn().mockResolvedValue({ aggregated: false }),
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
  undoMostRecentGameAction: mockUndoMostRecentGameAction,
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

async function initializeGame(result: ReturnType<typeof renderHook<typeof useGameState>>['result']) {
  await act(async () => {
    await result.current.initializeGame({
      gameId: 'game-between-play',
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      awayStartingPitcherId: 'away-sp',
      awayStartingPitcherName: 'Away Starter',
      homeStartingPitcherId: 'home-sp',
      homeStartingPitcherName: 'Home Starter',
      awayLineup: [
        { playerId: 'away-batter-1', playerName: 'Away Batter 1', position: 'SS' },
        { playerId: 'away-batter-2', playerName: 'Away Batter 2', position: 'CF' },
      ],
      homeLineup: [
        { playerId: 'home-batter-1', playerName: 'Home Batter 1', position: '2B' },
        { playerId: 'home-batter-2', playerName: 'Home Batter 2', position: 'RF' },
      ],
      awayBench: [
        { playerId: 'away-bench-1', playerName: 'Away Bench 1', positions: ['IF'] },
      ],
      homeBench: [
        { playerId: 'home-rp', playerName: 'Home Reliever', positions: ['P'] },
      ],
      seasonNumber: 1,
    });
  });
}

describe('useGameState between-play ledger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue({ aggregated: false });
  });

  test('logs stolen-base runner metadata to the between-play ledger', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'hit', hitType: '1B', rbi: 0 });
    });

    mockLogBetweenPlayEvent.mockClear();

    await act(async () => {
      result.current.advanceRunner('first', 'second', 'safe');
      await result.current.recordEvent('SB', 'away-batter-1', {
        runnerId: 'away-batter-1',
        runnerName: 'Away Batter 1',
        fromBase: 'first',
        toBase: 'second',
        outcome: 'safe',
      });
    });

    expect(mockLogBetweenPlayEvent).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'game-between-play',
      type: 'stolen_base',
      stolenBase: expect.objectContaining({
        runnerId: 'away-batter-1',
        fromBase: 1,
        toBase: 2,
        isSuccessful: true,
      }),
      runnerAction: expect.objectContaining({
        runnerId: 'away-batter-1',
        fromBase: 1,
        toBase: 2,
        reason: 'stolen_base',
      }),
    }));
  });

  test('logs roster changes as between-play ledger rows', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    await act(async () => {
      const subResult = result.current.makeSubstitution(
        'away-bench-1',
        'away-batter-1',
        'Away Bench 1',
        'Away Batter 1',
        { subType: 'pinch_hit', isPinchHitter: true, newPosition: 'SS' },
      );
      expect(subResult).toEqual({ success: true });
      result.current.switchPositions([{ playerId: 'home-batter-1', newPosition: 'SS' }]);
      result.current.changePitcher('home-rp', 'home-sp', 'Home Reliever', 'Home Starter');
      result.current.confirmPitchCount('home-sp', 17);
      await Promise.resolve();
    });

    const ledgerTypes = mockLogBetweenPlayEvent.mock.calls.map(call => call[0]?.type);
    expect(ledgerTypes).toEqual(expect.arrayContaining([
      'substitution',
      'position_change',
      'pitcher_change',
    ]));

    expect(mockLogBetweenPlayEvent.mock.calls).toEqual(expect.arrayContaining([
      [expect.objectContaining({
        type: 'substitution',
        substitution: expect.objectContaining({
          subType: 'pinch_hit',
          outPlayerId: 'away-batter-1',
          inPlayerId: 'away-bench-1',
        }),
      })],
      [expect.objectContaining({
        type: 'position_change',
        substitution: expect.objectContaining({
          subType: 'position_change',
          outPlayerId: 'home-batter-1',
          inPosition: 'SS',
        }),
      })],
      [expect.objectContaining({
        type: 'pitcher_change',
        pitcherChange: expect.objectContaining({
          outgoingPitcherId: 'home-sp',
          incomingPitcherId: 'home-rp',
        }),
      })],
    ]));
  });
});
