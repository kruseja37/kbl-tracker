import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logAtBatEvent: vi.fn().mockResolvedValue(undefined),
  logBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  undoMostRecentGameAction: vi.fn().mockResolvedValue(null),
  createGameHeader: vi.fn().mockResolvedValue(undefined),
  completeGame: vi.fn().mockResolvedValue(undefined),
  getGameEvents: vi.fn().mockResolvedValue([]),
  getBetweenPlayEvents: vi.fn().mockResolvedValue([]),
  getBetweenPlayEvent: vi.fn().mockResolvedValue(null),
  markGameAggregated: vi.fn().mockResolvedValue(undefined),
  getGameFieldingEvents: vi.fn().mockResolvedValue([]),
  getGameHeader: vi.fn().mockResolvedValue({ aggregated: false }),
  archiveCompletedGame: vi.fn().mockResolvedValue(undefined),
  saveCurrentGame: vi.fn().mockResolvedValue(undefined),
  loadCurrentGame: vi.fn().mockResolvedValue(null),
  immediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  clearCurrentGame: vi.fn().mockResolvedValue(undefined),
  processCompletedGame: vi.fn().mockResolvedValue({
    aggregation: { success: true, milestones: null },
  }),
  aggregateGameToPlayoffStats: vi.fn().mockResolvedValue(undefined),
  appendEliminationGameFameToRun: vi.fn().mockResolvedValue(undefined),
  appendEliminationGameToAllTimeStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/eventLog', () => ({
  logAtBatEvent: mocks.logAtBatEvent,
  logBetweenPlayEvent: mocks.logBetweenPlayEvent,
  undoMostRecentGameAction: mocks.undoMostRecentGameAction,
  createGameHeader: mocks.createGameHeader,
  completeGame: mocks.completeGame,
  getGameEvents: mocks.getGameEvents,
  getBetweenPlayEvents: mocks.getBetweenPlayEvents,
  getBetweenPlayEvent: mocks.getBetweenPlayEvent,
  markGameAggregated: mocks.markGameAggregated,
  getGameFieldingEvents: mocks.getGameFieldingEvents,
  getGameHeader: mocks.getGameHeader,
}));

vi.mock('../../utils/gameStorage', () => ({
  archiveCompletedGame: mocks.archiveCompletedGame,
  saveCurrentGame: mocks.saveCurrentGame,
  loadCurrentGame: mocks.loadCurrentGame,
  immediateSaveCurrentGame: mocks.immediateSaveCurrentGame,
  clearCurrentGame: mocks.clearCurrentGame,
}));

vi.mock('../../../utils/processCompletedGame', () => ({
  processCompletedGame: mocks.processCompletedGame,
}));

vi.mock('../../../utils/playoffStorage', () => ({
  aggregateGameToPlayoffStats: mocks.aggregateGameToPlayoffStats,
}));

vi.mock('../../../utils/eliminationRunFameStorage', () => ({
  appendEliminationGameFameToRun: mocks.appendEliminationGameFameToRun,
}));

vi.mock('../../../utils/eliminationAllTimeStatsStorage', () => ({
  appendEliminationGameToAllTimeStats: mocks.appendEliminationGameToAllTimeStats,
}));

import { useGameState, type GameInitConfig } from '../../hooks/useGameState';

export function getHarnessMocks() {
  return mocks;
}

export function renderGameStateHook(gameId?: string) {
  return renderHook(() => useGameState(gameId));
}

export async function initializeGame(
  result: ReturnType<typeof renderGameStateHook>['result'],
  gameId = 'huntfix-game',
  overrides: Partial<GameInitConfig> = {},
) {
  await act(async () => {
    await result.current.initializeGame({
      gameId,
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
        { playerId: 'away-batter-3', playerName: 'Away Batter 3', position: 'C' },
        { playerId: 'away-batter-4', playerName: 'Away Batter 4', position: '1B' },
      ],
      homeLineup: [
        { playerId: 'home-batter-1', playerName: 'Home Batter 1', position: '2B' },
        { playerId: 'home-batter-2', playerName: 'Home Batter 2', position: 'RF' },
        { playerId: 'home-batter-3', playerName: 'Home Batter 3', position: 'C' },
        { playerId: 'home-batter-4', playerName: 'Home Batter 4', position: '1B' },
      ],
      awayBench: [],
      homeBench: [],
      seasonNumber: 1,
      ...overrides,
    });
  });
}

export function resetHarnessMocks() {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.getGameEvents.mockResolvedValue([]);
  mocks.getBetweenPlayEvents.mockResolvedValue([]);
  mocks.getBetweenPlayEvent.mockResolvedValue(null);
  mocks.getGameFieldingEvents.mockResolvedValue([]);
  mocks.getGameHeader.mockResolvedValue({ aggregated: false });
  mocks.loadCurrentGame.mockResolvedValue(null);
  mocks.undoMostRecentGameAction.mockResolvedValue(null);
  mocks.processCompletedGame.mockResolvedValue({
    aggregation: { success: true, milestones: null },
  });
}
