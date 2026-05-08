import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockCreateGameHeader,
  mockGetGameEvents,
  mockGetBetweenPlayEvents,
  mockGetGameFieldingEvents,
  mockGetGameHeader,
  mockArchiveCompletedGame,
  mockSaveCurrentGame,
  mockLoadCurrentGame,
  mockImmediateSaveCurrentGame,
  mockClearCurrentGame,
} = vi.hoisted(() => ({
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockGetGameEvents: vi.fn().mockResolvedValue([]),
  mockGetBetweenPlayEvents: vi.fn().mockResolvedValue([]),
  mockGetGameFieldingEvents: vi.fn().mockResolvedValue([]),
  mockGetGameHeader: vi.fn().mockResolvedValue({ aggregated: false }),
  mockArchiveCompletedGame: vi.fn().mockResolvedValue(undefined),
  mockSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockLoadCurrentGame: vi.fn().mockResolvedValue(null),
  mockImmediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockClearCurrentGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/eventLog', () => ({
  logAtBatEvent: vi.fn().mockResolvedValue(undefined),
  logBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  undoMostRecentGameAction: vi.fn().mockResolvedValue(null),
  createGameHeader: mockCreateGameHeader,
  completeGame: vi.fn().mockResolvedValue(undefined),
  getGameEvents: mockGetGameEvents,
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  markGameAggregated: vi.fn().mockResolvedValue(undefined),
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
  processCompletedGame: vi.fn().mockResolvedValue({
    aggregation: { success: true, milestones: null },
  }),
}));

vi.mock('../../../utils/playoffStorage', () => ({
  aggregateGameToPlayoffStats: vi.fn().mockResolvedValue(undefined),
}));

import { useGameState } from '../../hooks/useGameState';

describe('useGameState reporter flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  test('initializeGame honors explicit live and post-game reporter flags over pending session values', async () => {
    sessionStorage.setItem(
      'kbl-pending-live-beat-reporter-enabled',
      JSON.stringify(false),
    );
    sessionStorage.setItem(
      'kbl-pending-post-game-columns-enabled',
      JSON.stringify(true),
    );

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'game-reporter-flags',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        awayStartingPitcherId: 'away-sp',
        awayStartingPitcherName: 'Away Starter',
        homeStartingPitcherId: 'home-sp',
        homeStartingPitcherName: 'Home Starter',
        awayLineup: [
          { playerId: 'away-batter-1', playerName: 'Away Batter 1', position: 'CF' },
        ],
        homeLineup: [
          { playerId: 'home-batter-1', playerName: 'Home Batter 1', position: 'SS' },
        ],
        awayBench: [],
        homeBench: [],
        seasonNumber: 1,
        liveBeatReporterEnabled: true,
        postGameColumnsEnabled: false,
      });
    });

    expect(result.current.gameState.liveBeatReporterEnabled).toBe(true);
    expect(result.current.gameState.postGameColumnsEnabled).toBe(false);
  });

  test('startGame immediately persists a LIVE current-game snapshot', async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'game-live-transition',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        awayStartingPitcherId: 'away-sp',
        awayStartingPitcherName: 'Away Starter',
        homeStartingPitcherId: 'home-sp',
        homeStartingPitcherName: 'Home Starter',
        awayLineup: [
          { playerId: 'away-batter-1', playerName: 'Away Batter 1', position: 'CF' },
        ],
        homeLineup: [
          { playerId: 'home-batter-1', playerName: 'Home Batter 1', position: 'SS' },
        ],
        awayBench: [],
        homeBench: [],
        seasonNumber: 1,
      });
    });

    mockImmediateSaveCurrentGame.mockClear();

    act(() => {
      result.current.startGame();
    });

    expect(result.current.gameState.gamePhase).toBe('LIVE');
    expect(mockImmediateSaveCurrentGame).toHaveBeenCalledTimes(1);
    expect(mockImmediateSaveCurrentGame).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'game-live-transition',
        gamePhase: 'LIVE',
        gameStartedAt: expect.any(Number),
      }),
    );
    expect(sessionStorage.getItem('kbl-game-started:game-live-transition')).toBe('true');
  });

  test('startGame prevents a delayed PRE_GAME autosave from overwriting LIVE', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'game-live-autosave-race',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        awayStartingPitcherId: 'away-sp',
        awayStartingPitcherName: 'Away Starter',
        homeStartingPitcherId: 'home-sp',
        homeStartingPitcherName: 'Home Starter',
        awayLineup: [
          { playerId: 'away-batter-1', playerName: 'Away Batter 1', position: 'CF' },
        ],
        homeLineup: [
          { playerId: 'home-batter-1', playerName: 'Home Batter 1', position: 'SS' },
        ],
        awayBench: [],
        homeBench: [],
        seasonNumber: 1,
      });
    });

    mockImmediateSaveCurrentGame.mockClear();
    mockSaveCurrentGame.mockClear();

    act(() => {
      result.current.startGame();
    });
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current.gameState.gamePhase).toBe('LIVE');
    expect(mockImmediateSaveCurrentGame).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'game-live-autosave-race',
        gamePhase: 'LIVE',
        gameStartedAt: expect.any(Number),
      }),
    );
    expect(mockSaveCurrentGame).not.toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'game-live-autosave-race',
        gamePhase: 'PRE_GAME',
      }),
    );
  });
});
