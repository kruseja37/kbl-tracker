import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockCreateGameHeader,
  mockSaveCurrentGame,
  mockImmediateSaveCurrentGame,
  mockLoadCurrentGame,
  mockClearCurrentGame,
} = vi.hoisted(() => ({
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockImmediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockLoadCurrentGame: vi.fn().mockResolvedValue(null),
  mockClearCurrentGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/eventLog', () => ({
  createGameHeader: mockCreateGameHeader,
  getGameHeader: vi.fn().mockResolvedValue(null),
  getGameEvents: vi.fn().mockResolvedValue([]),
  getBetweenPlayEvent: vi.fn().mockResolvedValue(null),
  getBetweenPlayEvents: vi.fn().mockResolvedValue([]),
  getGameFieldingEvents: vi.fn().mockResolvedValue([]),
  logAtBatEvent: vi.fn().mockResolvedValue(undefined),
  logBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  updateBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  undoMostRecentGameAction: vi.fn().mockResolvedValue(null),
  completeGame: vi.fn().mockResolvedValue(undefined),
  markGameAggregated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/gameStorage', () => ({
  saveCurrentGame: mockSaveCurrentGame,
  immediateSaveCurrentGame: mockImmediateSaveCurrentGame,
  loadCurrentGame: mockLoadCurrentGame,
  clearCurrentGame: mockClearCurrentGame,
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

const nineSlotLineup = (prefix: string) => [
  { playerId: `${prefix}-1`, playerName: `${prefix} One`, position: 'CF' },
  { playerId: `${prefix}-2`, playerName: `${prefix} Two`, position: 'SS' },
  { playerId: `${prefix}-3`, playerName: `${prefix} Three`, position: '1B' },
  { playerId: `${prefix}-4`, playerName: `${prefix} Four`, position: 'RF' },
  { playerId: `${prefix}-5`, playerName: `${prefix} Five`, position: 'LF' },
  { playerId: `${prefix}-6`, playerName: `${prefix} Six`, position: '3B' },
  { playerId: `${prefix}-7`, playerName: `${prefix} Seven`, position: '2B' },
  { playerId: `${prefix}-8`, playerName: `${prefix} Eight`, position: 'C' },
  { playerId: `${prefix}-sp`, playerName: `${prefix} Starter`, position: 'P' },
];

describe('useGameState pregame pitching change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('keeps the lineup at nine entries when replacing the pregame starter', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useGameState('pregame-pitching-change'));

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'pregame-pitching-change',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        awayStartingPitcherId: 'away-sp',
        awayStartingPitcherName: 'Away Starter',
        homeStartingPitcherId: 'home-sp',
        homeStartingPitcherName: 'Home Starter',
        awayLineup: nineSlotLineup('away'),
        homeLineup: nineSlotLineup('home'),
        awayBench: [{ playerId: 'away-rp', playerName: 'Away Reliever', positions: ['P'] }],
        homeBench: [{ playerId: 'home-rp', playerName: 'Home Reliever', positions: ['P'] }],
        seasonNumber: 1,
      });
    });

    act(() => {
      result.current.changePitcher('home-rp', 'home-sp', 'Home Reliever', 'Home Starter');
    });

    const homeLineup = result.current.getLineupStateSnapshot().home.lineup;
    expect(homeLineup).toHaveLength(9);
    expect(homeLineup.filter((player) => player.position === 'P')).toHaveLength(1);
    expect(homeLineup.find((player) => player.battingOrder === 9)).toMatchObject({
      playerId: 'home-rp',
      playerName: 'Home Reliever',
      position: 'P',
    });
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('PRE_GAME pitching lineup exceeded 9 entries'),
      expect.anything(),
    );

    consoleErrorSpy.mockRestore();
  });
});
