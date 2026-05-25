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
      result.current.changePitcher('home-rp', 'home-sp', 'home', 'Home Reliever', 'Home Starter');
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

  test('removes the original pregame starter from stats and persists the updated starter on game start', async () => {
    const { result } = renderHook(() => useGameState('pregame-pitching-persist'));

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'pregame-pitching-persist',
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

    mockCreateGameHeader.mockClear();
    mockImmediateSaveCurrentGame.mockClear();

    act(() => {
      result.current.changePitcher('home-rp', 'home-sp', 'home', 'Home Reliever', 'Home Starter');
    });

    expect(result.current.pitcherStats.has('home-sp')).toBe(false);
    expect(result.current.pitcherStats.get('home-rp')).toMatchObject({
      isStarter: true,
      entryInning: 1,
      entryOuts: 0,
    });

    act(() => {
      result.current.startGame();
    });

    const savedSnapshot = mockImmediateSaveCurrentGame.mock.calls.at(-1)?.[0];
    expect(savedSnapshot).toMatchObject({
      gameId: 'pregame-pitching-persist',
      gamePhase: 'LIVE',
      currentPitcherId: 'home-rp',
      currentPitcherName: 'Home Reliever',
    });
    expect(savedSnapshot.homeLineupState.currentPitcher).toMatchObject({
      playerId: 'home-rp',
      playerName: 'Home Reliever',
      position: 'P',
    });
    expect(savedSnapshot.pitcherGameStats.map((pitcher) => pitcher.pitcherId)).toContain('home-rp');
    expect(savedSnapshot.pitcherGameStats.map((pitcher) => pitcher.pitcherId)).not.toContain('home-sp');

    const headerDraft = mockCreateGameHeader.mock.calls.at(-1)?.[0];
    expect(headerDraft.startingPitchers.home).toMatchObject({
      playerId: 'home-rp',
      playerName: 'Home Reliever',
    });
    expect(headerDraft.startingLineups.home.find((player) => player.position === 'P')).toMatchObject({
      playerId: 'home-rp',
    });
  });

  test('allows a pitcher-roster player to enter the pregame lineup at a non-pitcher position', async () => {
    const { result } = renderHook(() => useGameState('pregame-pitcher-as-fielder'));

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'pregame-pitcher-as-fielder',
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
      result.current.makeSubstitution('home-rp', 'home-5', 'Home Reliever', 'home Five', {
        newPosition: 'LF',
      });
    });

    const snapshot = result.current.getLineupStateSnapshot().home;
    expect(snapshot.currentPitcher).toMatchObject({
      playerId: 'home-sp',
      position: 'P',
    });
    expect(snapshot.lineup.find((player) => player.playerId === 'home-rp')).toMatchObject({
      playerId: 'home-rp',
      playerName: 'Home Reliever',
      position: 'LF',
      battingOrder: 5,
    });
    expect(snapshot.bench.find((player) => player.playerId === 'home-5')).toMatchObject({
      playerId: 'home-5',
    });
  });

  test('updates the pregame lineup snapshot immediately after a position swap', async () => {
    const { result } = renderHook(() => useGameState('pregame-position-swap'));

    await act(async () => {
      await result.current.initializeGame({
        gameId: 'pregame-position-swap',
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
      result.current.switchPositions([
        { playerId: 'home-2', newPosition: 'C' },
        { playerId: 'home-8', newPosition: 'SS' },
      ]);
    });

    const homeLineup = result.current.getLineupStateSnapshot().home.lineup;
    expect(homeLineup.find((player) => player.playerId === 'home-2')).toMatchObject({
      playerId: 'home-2',
      position: 'C',
    });
    expect(homeLineup.find((player) => player.playerId === 'home-8')).toMatchObject({
      playerId: 'home-8',
      position: 'SS',
    });
    expect(result.current.gameState.currentCatcherId).toBe('home-2');
    expect(result.current.gameState.currentCatcherName).toBe('home Two');
  });
});
