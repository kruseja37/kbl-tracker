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

describe('useGameState undoLastAction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue({ aggregated: false });
    mockLoadCurrentGame.mockResolvedValue(null);
  });

  test('rehydrates from the durable ledger after undoing the last at-bat', async () => {
    const { result } = renderHook(() => useGameState('game-undo'));

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'game-undo',
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
        awayBench: [],
        homeBench: [],
        seasonNumber: 1,
      });
    });

    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'hit', hitType: '1B', rbi: 0 });
    });

    mockUndoMostRecentGameAction.mockClear();
    mockClearCurrentGame.mockClear();
    mockUndoMostRecentGameAction.mockResolvedValueOnce({
      kind: 'atBat',
      eventId: 'game-undo_1',
      eventIndex: 1,
    });
    mockGetGameHeader.mockResolvedValueOnce({
      gameId: 'game-undo',
      date: Date.now(),
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      stadiumName: 'Undo Park',
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
        away: [],
        home: [],
      },
      startingPitchers: {
        away: { playerId: 'away-sp', playerName: 'Away Starter' },
        home: { playerId: 'home-sp', playerName: 'Home Starter' },
      },
      finalScore: null,
      finalInning: 1,
      isComplete: false,
      aggregated: false,
      aggregatedAt: null,
      aggregationError: null,
      eventCount: 0,
      checksum: '',
    });
    mockGetGameEvents.mockResolvedValueOnce([]);
    mockGetBetweenPlayEvents.mockResolvedValueOnce([]);

    let undone = false;
    await act(async () => {
      undone = await result.current.undoLastAction();
    });

    expect(undone).toBe(true);
    expect(mockUndoMostRecentGameAction).toHaveBeenCalledWith('game-undo');
    expect(mockClearCurrentGame).toHaveBeenCalledTimes(1);
    expect(result.current.gameState.currentBatterId).toBe('away-batter-1');
    expect(result.current.gameState.currentBatterName).toBe('Away Batter 1');
    expect(result.current.gameState.currentPitcherId).toBe('home-sp');
    expect(result.current.gameState.currentPitcherName).toBe('Home Starter');
    expect(result.current.gameState.outs).toBe(0);
    expect(result.current.gameState.bases).toEqual({
      first: false,
      second: false,
      third: false,
    });
  });

  test('undoes a pitch-count between-play row without also undoing the prior at-bat', async () => {
    const { result } = renderHook(() => useGameState('game-undo-pitch-count'));

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'game-undo-pitch-count',
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
        ],
        homeLineup: [
          { playerId: 'home-batter-1', playerName: 'Home Batter 1', position: '2B' },
        ],
        awayBench: [],
        homeBench: [],
        seasonNumber: 1,
      });
    });

    mockUndoMostRecentGameAction.mockClear();
    mockClearCurrentGame.mockClear();
    mockUndoMostRecentGameAction.mockResolvedValueOnce({
      kind: 'betweenPlay',
      eventId: 'game-undo-pitch-count_bp_pitch_count',
      eventIndex: 1.001,
    });

    let undone = false;
    await act(async () => {
      undone = await result.current.undoLastAction({ skipReload: true });
    });

    expect(undone).toBe(true);
    expect(mockUndoMostRecentGameAction).toHaveBeenCalledTimes(1);
    expect(mockUndoMostRecentGameAction).toHaveBeenCalledWith('game-undo-pitch-count');
    expect(mockClearCurrentGame).not.toHaveBeenCalled();
  });
});
