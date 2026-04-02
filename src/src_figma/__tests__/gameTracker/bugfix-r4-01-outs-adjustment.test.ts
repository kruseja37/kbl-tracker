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

async function initializeGame(result: { current: ReturnType<typeof useGameState> }) {
  await act(async () => {
    await result.current.initializeGame({
      gameId: 'game-r4-outs',
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
}

describe('bugfix R4-01: outs adjustment ending the inning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  test('turns a correction-created third out into an inning-end confirmation before transition', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    await act(async () => {
      result.current.applyOutsAdjustment(2);
    });

    expect(result.current.gameState.outs).toBe(2);
    expect(result.current.gameState.isTop).toBe(true);

    await act(async () => {
      result.current.applyOutsAdjustment(1);
      await vi.runAllTimersAsync();
    });

    expect(result.current.showInningEndConfirm).toBe(true);
    expect(result.current.gameState.isTop).toBe(true);

    await act(async () => {
      result.current.confirmInningEnd();
    });

    expect(result.current.pitchCountPrompt?.type).toBe('end_inning');

    await act(async () => {
      result.current.dismissPitchCountPrompt();
    });

    expect(result.current.gameState.outs).toBe(0);
    expect(result.current.gameState.isTop).toBe(false);
  });

  test('declining the inning-end confirmation keeps the current half-inning active', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    await act(async () => {
      result.current.applyOutsAdjustment(3);
      await vi.runAllTimersAsync();
    });

    expect(result.current.showInningEndConfirm).toBe(true);
    expect(result.current.gameState.isTop).toBe(true);

    await act(async () => {
      result.current.declineInningEnd();
    });

    expect(result.current.showInningEndConfirm).toBe(false);
    expect(result.current.pitchCountPrompt).toBeNull();
    expect(result.current.gameState.outs).toBe(3);
    expect(result.current.gameState.isTop).toBe(true);

    await act(async () => {
      result.current.applyOutsAdjustment(-1);
    });

    expect(result.current.gameState.outs).toBe(2);
  });
});
