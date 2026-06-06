import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { calculateLeverageIndex } from '../../../engines/leverageCalculator';

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

async function initializeGame(
  result: ReturnType<typeof renderHook<typeof useGameState>>['result'],
  overrides: Partial<Parameters<ReturnType<typeof useGameState>['initializeGame']>[0]> = {},
) {
  await act(async () => {
    await result.current.initializeGame({
      gameId: 'game-wp2',
      ...overrides,
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
      ...overrides,
    });
  });
}

describe('useGameState commitPlateAppearance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue({ aggregated: false });
  });

  test('normalizes UI-native SAC into a canonical at-bat event, auto-advances runners, and seeds bunt enrichment', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    act(() => {
      result.current.restoreState({
        gameState: {
          ...result.current.gameState,
          bases: { first: true, second: true, third: false },
        },
        scoreboard: result.current.scoreboard,
      });
    });

    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'out', outType: 'SAC' });
    });

    expect(mockLogAtBatEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAtBatEvent.mock.calls[0][0]).toMatchObject({
      batterId: 'away-batter-1',
      pitcherId: 'home-sp',
      result: 'SAC',
      outsAfter: 1,
      runnerOutcomes: [
        { fromBase: 'first', toBase: 'second' },
        { fromBase: 'second', toBase: 'third' },
      ],
      enrichment: expect.objectContaining({
        exitType: 'bunt',
      }),
    });
    expect(result.current.playerStats.get('away-batter-1')).toMatchObject({
      pa: 1,
      ab: 0,
      sh: 1,
      k: 0,
    });
    expect(result.current.gameState.outs).toBe(1);
    expect(result.current.gameState.bases).toEqual({
      first: false,
      second: true,
      third: true,
    });
  });

  test('records stable stadium identity and seed factors on at-bat park context', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, {
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      competitionType: 'franchise',
      competitionId: 'franchise-1',
      franchiseId: 'franchise-1',
      stadiumName: 'Apple Field',
    });

    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'hit', hitType: '1B', rbi: 0 });
    });

    expect(mockCreateGameHeader).toHaveBeenCalledWith(expect.objectContaining({
      stadiumName: 'Apple Field',
    }));
    expect(mockLogAtBatEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAtBatEvent.mock.calls[0][0]).toMatchObject({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      parkContext: {
        stadiumId: 'apple-field',
        stadiumName: 'Apple Field',
        parkFactors: expect.objectContaining({
          stadiumId: 'apple-field',
          stadiumName: 'Apple Field',
          source: 'SEED',
        }),
      },
    });
  });

  test('passes spray-enriched at-bat events into completed-game archive context', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, {
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      competitionType: 'franchise',
      competitionId: 'franchise-1',
      franchiseId: 'franchise-1',
      stadiumName: 'Apple Field',
    });

    act(() => {
      result.current.setNextEventEnrichment({
        fieldLocation: { x: 74, y: 48, zone: 'Z05' },
        exitType: 'line_drive',
      });
    });
    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'hit', hitType: '1B', rbi: 0 });
    });

    const sprayEvent = mockLogAtBatEvent.mock.calls[0][0];
    mockGetGameEvents.mockResolvedValue([sprayEvent]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);

    await act(async () => {
      await result.current.endGame();
    });

    const archiveOptions = mockProcessCompletedGame.mock.calls.at(-1)?.[3];
    expect(archiveOptions?.context?.atBatEvents).toEqual([sprayEvent]);
    expect(archiveOptions?.context?.fieldingEvents).toEqual([]);
    expect(archiveOptions?.context?.atBatEvents?.[0]).toMatchObject({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      parkContext: {
        stadiumId: 'apple-field',
        stadiumName: 'Apple Field',
      },
      enrichment: {
        fieldLocation: { zone: 'Z05' },
      },
    });
  });

  test('routes dropped-third-strike metadata through the canonical recorder', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    await act(async () => {
      await result.current.commitPlateAppearance({
        type: 'out',
        outType: 'K',
        batterReached: true,
        isDroppedThirdStrike: true,
      });
    });

    expect(mockLogAtBatEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAtBatEvent.mock.calls[0][0]).toMatchObject({
      batterId: 'away-batter-1',
      pitcherId: 'home-sp',
      result: 'K',
      outsAfter: 0,
    });
    expect(result.current.playerStats.get('away-batter-1')).toMatchObject({
      pa: 1,
      ab: 1,
      k: 1,
    });
    expect(result.current.gameState.outs).toBe(0);
    expect(result.current.gameState.bases.first).toBe(true);
  });

  test('stores full leverage index on at-bat events instead of base-out LI only', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    act(() => {
      result.current.restoreState({
        gameState: {
          ...result.current.gameState,
          inning: 9,
          isTop: false,
          outs: 2,
          bases: { first: true, second: true, third: true },
          awayScore: 3,
          homeScore: 2,
          currentBatterId: 'home-batter-1',
          currentBatterName: 'Home Batter 1',
          currentPitcherId: 'away-sp',
          currentPitcherName: 'Away Starter',
        },
        scoreboard: result.current.scoreboard,
      });
    });

    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'walk', walkType: 'BB' });
    });

    const expectedLI = calculateLeverageIndex({
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: true, third: true },
      homeScore: 2,
      awayScore: 3,
      totalInnings: 9,
    }).leverageIndex;

    expect(mockLogAtBatEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAtBatEvent.mock.calls[0][0].leverageIndex).toBeCloseTo(expectedLI, 5);
    expect(mockLogAtBatEvent.mock.calls[0][0].leverageIndex).toBeGreaterThan(2.67);
  });

  test('marks high-LI dropped-third-strike events as clutch', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    act(() => {
      result.current.restoreState({
        gameState: {
          ...result.current.gameState,
          inning: 9,
          isTop: false,
          outs: 2,
          bases: { first: false, second: true, third: true },
          awayScore: 3,
          homeScore: 2,
          currentBatterId: 'home-batter-1',
          currentBatterName: 'Home Batter 1',
          currentPitcherId: 'away-sp',
          currentPitcherName: 'Away Starter',
        },
        scoreboard: result.current.scoreboard,
      });
    });

    await act(async () => {
      await result.current.commitPlateAppearance({
        type: 'out',
        outType: 'K',
        batterReached: true,
        isDroppedThirdStrike: true,
        dropReason: 'wild_pitch',
      });
    });

    const event = mockLogAtBatEvent.mock.calls[0][0];
    expect(event).toMatchObject({
      result: 'WP_K',
      isClutch: true,
    });
    expect(event.leverageIndex).toBeGreaterThanOrEqual(1.5);
    expect(Number.isFinite(event.wpa)).toBe(true);
  });

  test('marks high-LI reach-on-error events as clutch', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    act(() => {
      result.current.restoreState({
        gameState: {
          ...result.current.gameState,
          inning: 9,
          isTop: false,
          outs: 2,
          bases: { first: true, second: true, third: false },
          awayScore: 3,
          homeScore: 2,
          currentBatterId: 'home-batter-1',
          currentBatterName: 'Home Batter 1',
          currentPitcherId: 'away-sp',
          currentPitcherName: 'Away Starter',
        },
        scoreboard: result.current.scoreboard,
      });
    });

    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'error' });
    });

    const event = mockLogAtBatEvent.mock.calls[0][0];
    expect(event).toMatchObject({
      result: 'E',
      isClutch: true,
    });
    expect(event.leverageIndex).toBeGreaterThanOrEqual(1.5);
    expect(Number.isFinite(event.wpa)).toBe(true);
  });

  test('uses the corrected WEB_GEM fame base value', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    act(() => {
      result.current.restoreState({
        gameState: {
          ...result.current.gameState,
          inning: 9,
          isTop: false,
          outs: 2,
          bases: { first: true, second: false, third: true },
          awayScore: 4,
          homeScore: 3,
        },
        scoreboard: result.current.scoreboard,
      });
    });

    mockArchiveCompletedGame.mockClear();

    await act(async () => {
      await result.current.recordEvent('WEB_GEM', 'home-batter-2');
      await result.current.endGame();
    });

    const expectedLI = calculateLeverageIndex({
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: false, third: true },
      homeScore: 3,
      awayScore: 4,
      totalInnings: 9,
    }).leverageIndex;
    const archivedGame = mockProcessCompletedGame.mock.calls.at(-1)?.[0];

    expect(archivedGame?.fameEvents?.[0]).toMatchObject({
      eventType: 'WEB_GEM',
      playerId: 'home-batter-2',
    });
    expect(archivedGame?.fameEvents?.[0].fameValue).toBeCloseTo(0.75 * Math.sqrt(expectedLI), 5);
  });

  test('stamps canonical franchise identity on at-bat event rows', async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, {
      gameId: 'franchise-game-identity',
      seasonId: 'franchise-abc-season-2',
      statsScopeId: 'franchise-abc-season-2',
      seasonNumber: 2,
      competitionType: 'franchise',
      competitionId: 'franchise-abc',
      franchiseId: 'franchise-abc',
      scheduleGameId: 'schedule-game-7',
      leagueId: 'league-source',
      playoffId: 'playoff-abc-2',
      playoffSeriesId: 'series-abc-1',
      playoffGameNumber: 3,
    });

    await act(async () => {
      await result.current.commitPlateAppearance({ type: 'hit', hitType: '1B', rbi: 0 });
    });

    expect(mockLogAtBatEvent).toHaveBeenCalledWith(expect.objectContaining({
      gameId: 'franchise-game-identity',
      seasonId: 'franchise-abc-season-2',
      seasonNumber: 2,
      statsScopeId: 'franchise-abc-season-2',
      competitionType: 'franchise',
      competitionId: 'franchise-abc',
      franchiseId: 'franchise-abc',
      scheduleGameId: 'schedule-game-7',
      leagueId: 'league-source',
      playoffId: 'playoff-abc-2',
      playoffSeriesId: 'series-abc-1',
      playoffGameNumber: 3,
    }));
  });
});
