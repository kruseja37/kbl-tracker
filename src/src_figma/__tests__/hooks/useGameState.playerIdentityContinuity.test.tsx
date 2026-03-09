import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockCreateGameHeader,
  mockCompleteGame,
  mockGetGameEvents,
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
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockCompleteGame: vi.fn().mockResolvedValue(undefined),
  mockGetGameEvents: vi.fn().mockResolvedValue([]),
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
  logAtBatEvent: vi.fn(),
  createGameHeader: mockCreateGameHeader,
  completeGame: mockCompleteGame,
  getGameEvents: mockGetGameEvents,
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

describe('useGameState player identity continuity', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue({ aggregated: false });
  });

  test('keeps stable playerIds through completed-game and playoff persistence', async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'game-wp1',
        seasonId: 'season-1',
        statsScopeId: 'elim-42',
        competitionType: 'elimination',
        competitionId: 'elim-42',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        awayStartingPitcherId: 'lb-away-sp',
        awayStartingPitcherName: 'Away Starter',
        homeStartingPitcherId: 'lb-home-sp',
        homeStartingPitcherName: 'Home Starter',
        awayLineup: [
          { playerId: 'lb-away-ss', playerName: 'Away Shortstop', position: 'SS' },
          { playerId: 'lb-away-cf', playerName: 'Away Center', position: 'CF' },
        ],
        homeLineup: [
          { playerId: 'lb-home-2b', playerName: 'Home Second', position: '2B' },
          { playerId: 'lb-home-cf', playerName: 'Home Center', position: 'CF' },
        ],
        awayBench: [
          { playerId: 'lb-away-bench', playerName: 'Away Bench', positions: ['IF'] },
        ],
        homeBench: [
          { playerId: 'lb-home-bench', playerName: 'Home Bench', positions: ['OF'] },
        ],
        seasonNumber: 1,
      });
    });

    await act(async () => {
      result.current.setPlayoffContext(null, null, 'playoff-42');
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await result.current.recordEvent('KILLED');
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      await result.current.endGame({
        competitionType: 'elimination',
        competitionId: 'elim-42',
        statsScopeId: 'elim-42',
      });
      await vi.runAllTimersAsync();
    });

    expect(mockProcessCompletedGame).toHaveBeenCalledTimes(1);
    const completedState = mockProcessCompletedGame.mock.calls[0][0];

    expect(completedState.playerStats['lb-away-ss']).toMatchObject({
      playerName: 'Away Shortstop',
      teamId: 'away-team',
    });
    expect(completedState.playerStats['lb-home-cf']).toMatchObject({
      playerName: 'Home Center',
      teamId: 'home-team',
    });
    expect(completedState.fameEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 'lb-away-ss',
          playerName: 'Away Shortstop',
          playerTeam: 'away-team',
        }),
      ])
    );
    expect(completedState.pitcherGameStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pitcherId: 'lb-away-sp',
          pitcherName: 'Away Starter',
          teamId: 'away-team',
        }),
        expect.objectContaining({
          pitcherId: 'lb-home-sp',
          pitcherName: 'Home Starter',
          teamId: 'home-team',
        }),
      ])
    );

    expect(mockAggregateGameToPlayoffStats).toHaveBeenCalledTimes(1);
    const playoffState = mockAggregateGameToPlayoffStats.mock.calls[0][1];
    expect(playoffState.playerStats['lb-away-cf'].teamId).toBe('away-team');
    expect(
      playoffState.pitcherGameStats.find((pitcher: { pitcherId: string }) => pitcher.pitcherId === 'lb-home-sp')?.teamId
    ).toBe('home-team');
  });
});
