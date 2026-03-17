import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockGetGameHeader,
  mockLoadCurrentGame,
  mockClearCurrentGame,
  mockCreateGameHeader,
  mockSaveCurrentGame,
  mockImmediateSaveCurrentGame,
} = vi.hoisted(() => ({
  mockGetGameHeader: vi.fn(),
  mockLoadCurrentGame: vi.fn(),
  mockClearCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockImmediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/eventLog', () => ({
  getGameHeader: mockGetGameHeader,
  createGameHeader: mockCreateGameHeader,
  getGameEvents: vi.fn().mockResolvedValue([]),
  getBetweenPlayEvents: vi.fn().mockResolvedValue([]),
  getGameFieldingEvents: vi.fn().mockResolvedValue([]),
  logAtBatEvent: vi.fn().mockResolvedValue(undefined),
  logBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  undoMostRecentGameAction: vi.fn().mockResolvedValue(null),
  completeGame: vi.fn().mockResolvedValue(undefined),
  markGameAggregated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/gameStorage', () => ({
  loadCurrentGame: mockLoadCurrentGame,
  clearCurrentGame: mockClearCurrentGame,
  saveCurrentGame: mockSaveCurrentGame,
  immediateSaveCurrentGame: mockImmediateSaveCurrentGame,
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

describe('bugfix R4-03: refresh resumes current in-progress game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('rehydrates the saved current-game snapshot even when the exhibition route id is a placeholder', async () => {
    mockGetGameHeader
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        gameId: 'game-1730000000000',
        isComplete: false,
        awayTeamId: 'away-team',
        homeTeamId: 'home-team',
        awayTeamName: 'Away Team',
        homeTeamName: 'Home Team',
        competitionType: 'exhibition',
      });
    mockLoadCurrentGame.mockResolvedValue({
      id: 'current',
      gameId: 'game-1730000000000',
      savedAt: Date.now(),
      inning: 4,
      halfInning: 'BOTTOM',
      outs: 2,
      homeScore: 3,
      awayScore: 1,
      bases: {
        first: { playerId: 'runner-1', playerName: 'Runner One' },
        second: null,
        third: null,
      },
      currentBatterIndex: 1,
      atBatCount: 12,
      awayTeamId: 'away-team',
      homeTeamId: 'home-team',
      awayTeamName: 'Away Team',
      homeTeamName: 'Home Team',
      seasonNumber: 1,
      currentBatterId: 'home-batter-2',
      currentBatterName: 'Home Batter 2',
      currentPitcherId: 'away-sp',
      currentPitcherName: 'Away Starter',
      playerStats: {},
      pitcherGameStats: [],
      fameEvents: [],
      lastHRBatterId: null,
      consecutiveHRCount: 0,
      inningStrikeouts: 0,
      maxDeficitAway: 0,
      maxDeficitHome: 0,
      activityLog: [],
      scoreboard: {
        innings: [{ away: 1, home: 0 }, { away: 0, home: 2 }, { away: 0, home: 1 }, { away: undefined, home: undefined }],
        away: { runs: 1, hits: 0, errors: 0 },
        home: { runs: 3, hits: 0, errors: 0 },
      },
      awayLineup: [
        { playerId: 'away-batter-1', playerName: 'Away Batter 1', position: 'SS' },
        { playerId: 'away-batter-2', playerName: 'Away Batter 2', position: 'CF' },
      ],
      homeLineup: [
        { playerId: 'home-batter-1', playerName: 'Home Batter 1', position: '2B' },
        { playerId: 'home-batter-2', playerName: 'Home Batter 2', position: 'RF' },
      ],
      awayLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
      homeLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
    });

    const { result } = renderHook(() => useGameState('exhibition-1'));

    let loaded = false;
    await act(async () => {
      loaded = await result.current.loadExistingGame();
    });

    expect(loaded).toBe(true);
    expect(result.current.gameState.gameId).toBe('game-1730000000000');
    expect(result.current.gameState.inning).toBe(4);
    expect(result.current.gameState.outs).toBe(2);
    expect(result.current.gameState.homeScore).toBe(3);
    expect(mockClearCurrentGame).not.toHaveBeenCalled();
  });
});
