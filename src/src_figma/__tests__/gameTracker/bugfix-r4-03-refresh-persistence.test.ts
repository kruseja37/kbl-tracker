import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockGetGameHeader,
  mockGetGameEvents,
  mockGetBetweenPlayEvents,
  mockLoadCurrentGame,
  mockClearCurrentGame,
  mockCreateGameHeader,
  mockSaveCurrentGame,
  mockImmediateSaveCurrentGame,
} = vi.hoisted(() => ({
  mockGetGameHeader: vi.fn(),
  mockGetGameEvents: vi.fn(),
  mockGetBetweenPlayEvents: vi.fn(),
  mockLoadCurrentGame: vi.fn(),
  mockClearCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockImmediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../utils/eventLog', () => ({
  getGameHeader: mockGetGameHeader,
  createGameHeader: mockCreateGameHeader,
  getGameEvents: mockGetGameEvents,
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
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
    sessionStorage.clear();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
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

  test('rehydrates the saved current-game snapshot when the event-log header is missing', async () => {
    mockGetGameHeader.mockResolvedValue(null);
    mockLoadCurrentGame.mockResolvedValue({
      id: 'current',
      gameId: 'game-1730000000000',
      savedAt: Date.now(),
      inning: 6,
      halfInning: 'TOP',
      outs: 1,
      homeScore: 4,
      awayScore: 5,
      bases: {
        first: null,
        second: { playerId: 'runner-2', playerName: 'Runner Two' },
        third: null,
      },
      currentBatterIndex: 0,
      atBatCount: 24,
      awayTeamId: 'away-team',
      homeTeamId: 'home-team',
      awayTeamName: 'Away Team',
      homeTeamName: 'Home Team',
      seasonNumber: 1,
      currentBatterId: 'away-batter-1',
      currentBatterName: 'Away Batter 1',
      currentPitcherId: 'home-sp',
      currentPitcherName: 'Home Starter',
      gamePhase: 'LIVE',
      gameStartedAt: Date.now() - 60_000,
      playerStats: {},
      pitcherGameStats: [
        {
          pitcherId: 'home-sp',
          pitcherName: 'Home Starter',
          teamId: 'home-team',
          isStarter: true,
          entryInning: 1,
          outsRecorded: 15,
          hitsAllowed: 5,
          runsAllowed: 5,
          earnedRuns: 5,
          walksAllowed: 1,
          strikeoutsThrown: 4,
          homeRunsAllowed: 1,
          hitBatters: 0,
          basesReachedViaError: 0,
          wildPitches: 0,
          pitchCount: 72,
          battersFaced: 24,
          consecutiveHRsAllowed: 0,
          firstInningRuns: 0,
          basesLoadedWalks: 0,
          inningsComplete: 5,
          decision: null,
          save: false,
          hold: false,
          blownSave: false,
        },
      ],
      fameEvents: [],
      lastHRBatterId: null,
      consecutiveHRCount: 0,
      inningStrikeouts: 0,
      maxDeficitAway: 0,
      maxDeficitHome: 0,
      activityLog: [],
      scoreboard: {
        innings: [
          { away: 2, home: 0 },
          { away: 0, home: 1 },
          { away: 1, home: 2 },
          { away: 0, home: 0 },
          { away: 2, home: 1 },
          { away: undefined, home: undefined },
        ],
        away: { runs: 5, hits: 8, errors: 0 },
        home: { runs: 4, hits: 7, errors: 1 },
      },
      awayLineup: [
        { playerId: 'away-batter-1', playerName: 'Away Batter 1', position: 'SS' },
      ],
      homeLineup: [
        { playerId: 'home-batter-1', playerName: 'Home Batter 1', position: 'CF' },
      ],
      awayLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
      homeLineupState: {
        lineup: [],
        bench: [],
        usedPlayers: [],
        currentPitcher: {
          playerId: 'home-sp',
          playerName: 'Home Starter',
          position: 'P',
          battingOrder: 1,
          enteredInning: 1,
          isStarter: true,
        },
      },
    });

    const { result } = renderHook(() => useGameState('game-1730000000000'));

    let loaded = false;
    await act(async () => {
      loaded = await result.current.loadExistingGame();
    });

    expect(loaded).toBe(true);
    expect(result.current.gameState.gameId).toBe('game-1730000000000');
    expect(result.current.gameState.inning).toBe(6);
    expect(result.current.gameState.outs).toBe(1);
    expect(result.current.gameState.awayScore).toBe(5);
    expect(mockCreateGameHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'game-1730000000000',
        awayTeamId: 'away-team',
        homeTeamId: 'home-team',
        isComplete: false,
      }),
    );
    expect(mockClearCurrentGame).not.toHaveBeenCalled();
  });

  test('overlays durable mojo and fitness changes onto restored snapshot state', async () => {
    mockGetGameHeader.mockResolvedValue({
      gameId: 'game-1730000000000',
      isComplete: false,
      awayTeamId: 'away-team',
      homeTeamId: 'home-team',
      awayTeamName: 'Away Team',
      homeTeamName: 'Home Team',
      competitionType: 'exhibition',
    });
    mockGetBetweenPlayEvents.mockResolvedValue([
      {
        eventId: 'bp-1',
        eventIndex: 1,
        type: 'mojo_change',
        playerStateChange: {
          playerId: 'away-batter-1',
          stateType: 'mojo',
          previousValue: 0,
          newValue: 2,
        },
      },
      {
        eventId: 'bp-2',
        eventIndex: 2,
        type: 'fitness_change',
        playerStateChange: {
          playerId: 'home-sp',
          stateType: 'fitness',
          previousValue: 'FIT',
          newValue: 'STRAINED',
        },
      },
    ]);
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
        first: null,
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
        innings: [{ away: 1, home: 0 }],
        away: { runs: 1, hits: 0, errors: 0 },
        home: { runs: 3, hits: 0, errors: 0 },
      },
      awayLineup: [],
      homeLineup: [],
      awayLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
      homeLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
      playerMojoFitness: {
        'away-batter-1': { mojo: 0, fitness: 'FIT' },
        'home-sp': { mojo: 0, fitness: 'FIT' },
      },
    });

    const { result } = renderHook(() => useGameState('game-1730000000000'));

    await act(async () => {
      await result.current.loadExistingGame();
    });

    expect(result.current.restoredMojoFitness).toEqual({
      'away-batter-1': { mojo: 2, fitness: 'FIT' },
      'home-sp': { mojo: 0, fitness: 'STRAINED' },
    });
  });

  test('ignores a stale PRE_GAME snapshot when durable play activity already exists', async () => {
    mockGetGameHeader.mockResolvedValue({
      gameId: 'game-elim-1',
      isComplete: false,
      eventCount: 1,
      awayTeamId: 'away-team',
      homeTeamId: 'home-team',
      awayTeamName: 'Away Team',
      homeTeamName: 'Home Team',
      competitionType: 'elimination',
      competitionId: 'elim-1',
      startingLineups: {
        away: [{ playerId: 'away-batter-1', playerName: 'Away Batter 1', position: 'SS', battingOrder: 1 }],
        home: [{ playerId: 'home-batter-1', playerName: 'Home Batter 1', position: 'CF', battingOrder: 1 }],
      },
    });
    mockGetGameEvents.mockResolvedValue([
      {
        eventId: 'game-elim-1_1',
        gameId: 'game-elim-1',
        eventIndex: 1,
        timestamp: Date.now(),
        batterId: 'away-batter-1',
        batterName: 'Away Batter 1',
        batterTeamId: 'away-team',
        pitcherId: 'home-sp',
        pitcherName: 'Home Starter',
        pitcherTeamId: 'home-team',
        result: '1B',
        rbiCount: 0,
        runsScored: [],
        inning: 1,
        halfInning: 'TOP',
        outs: 0,
        runners: { first: null, second: null, third: null },
        awayScore: 0,
        homeScore: 0,
        outsAfter: 0,
        runnersAfter: {
          first: { runnerId: 'away-batter-1', runnerName: 'Away Batter 1', responsiblePitcherId: 'home-sp' },
          second: null,
          third: null,
        },
        awayScoreAfter: 0,
        homeScoreAfter: 0,
        leverageIndex: 1,
        winProbabilityBefore: 0.5,
        winProbabilityAfter: 0.5,
        wpa: 0,
        ballInPlay: null,
        fameEvents: [],
        isLeadoff: true,
        isClutch: false,
        isWalkOff: false,
      },
    ]);
    mockLoadCurrentGame.mockResolvedValue({
      id: 'current',
      gameId: 'game-elim-1',
      savedAt: Date.now(),
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
      homeScore: 0,
      awayScore: 0,
      bases: { first: null, second: null, third: null },
      currentBatterIndex: 0,
      atBatCount: 0,
      awayTeamId: 'away-team',
      homeTeamId: 'home-team',
      awayTeamName: 'Away Team',
      homeTeamName: 'Home Team',
      seasonNumber: 1,
      currentBatterId: 'away-batter-1',
      currentBatterName: 'Away Batter 1',
      currentPitcherId: 'home-sp',
      currentPitcherName: 'Home Starter',
      gamePhase: 'PRE_GAME',
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
        innings: [{ away: undefined, home: undefined }],
        away: { runs: 0, hits: 0, errors: 0 },
        home: { runs: 0, hits: 0, errors: 0 },
      },
      awayLineup: [],
      homeLineup: [],
      awayLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
      homeLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
    });

    const { result } = renderHook(() => useGameState('game-elim-1'));

    let loaded = false;
    await act(async () => {
      loaded = await result.current.loadExistingGame();
    });

    expect(loaded).toBe(true);
    expect(result.current.gameState.gamePhase).toBe('LIVE');
    expect(result.current.gameState.bases.first).toBe(true);
    expect(mockClearCurrentGame).toHaveBeenCalledTimes(1);
  });

  test('restores LIVE when Start Game was clicked before any play was recorded', async () => {
    const gameStartedAt = Date.now();
    mockGetGameHeader.mockResolvedValue({
      gameId: 'game-elim-started',
      isComplete: false,
      eventCount: 0,
      awayTeamId: 'away-team',
      homeTeamId: 'home-team',
      awayTeamName: 'Away Team',
      homeTeamName: 'Home Team',
      competitionType: 'elimination',
      competitionId: 'elim-1',
    });
    mockLoadCurrentGame.mockResolvedValue({
      id: 'current',
      gameId: 'game-elim-started',
      savedAt: Date.now(),
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
      homeScore: 0,
      awayScore: 0,
      bases: { first: null, second: null, third: null },
      currentBatterIndex: 0,
      atBatCount: 0,
      awayTeamId: 'away-team',
      homeTeamId: 'home-team',
      awayTeamName: 'Away Team',
      homeTeamName: 'Home Team',
      seasonNumber: 1,
      currentBatterId: 'away-batter-1',
      currentBatterName: 'Away Batter 1',
      currentPitcherId: 'home-sp',
      currentPitcherName: 'Home Starter',
      gamePhase: 'PRE_GAME',
      gameStartedAt,
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
        innings: [{ away: undefined, home: undefined }],
        away: { runs: 0, hits: 0, errors: 0 },
        home: { runs: 0, hits: 0, errors: 0 },
      },
      awayLineup: [],
      homeLineup: [],
      awayLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
      homeLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
    });

    const { result } = renderHook(() => useGameState('game-elim-started'));

    let loaded = false;
    await act(async () => {
      loaded = await result.current.loadExistingGame();
    });

    expect(loaded).toBe(true);
    expect(result.current.gameState.gamePhase).toBe('LIVE');
    expect(mockClearCurrentGame).not.toHaveBeenCalled();
  });
});
