import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

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

type NavigationState = {
  awayTeamId?: string;
  homeTeamId?: string;
  awayTeamColor?: string;
  awayTeamBorderColor?: string;
  homeTeamColor?: string;
  homeTeamBorderColor?: string;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
} | null;

const freshGameConfig = {
  gameId: 'game-r3-t0',
  awayTeamId: 'away-team',
  awayTeamName: 'Away Team',
  homeTeamId: 'home-team',
  homeTeamName: 'Home Team',
  awayStartingPitcherId: 'away-sp',
  awayStartingPitcherName: 'Away Starter',
  homeStartingPitcherId: 'home-sp',
  homeStartingPitcherName: 'Home Starter',
  awayLineup: [
    { playerId: 'away-sp', playerName: 'Away Starter', position: 'P' },
    { playerId: 'away-batter-2', playerName: 'Away Batter 2', position: 'SS' },
  ],
  homeLineup: [
    { playerId: 'home-sp', playerName: 'Home Starter', position: 'P' },
    { playerId: 'home-batter-2', playerName: 'Home Batter 2', position: '1B' },
  ],
  awayBench: [
    { playerId: 'away-rp', playerName: 'Away Reliever', positions: ['P'] },
  ],
  homeBench: [
    { playerId: 'home-rp', playerName: 'Home Reliever', positions: ['P'] },
  ],
  seasonNumber: 1,
};

function VerificationHarness({
  navigationState,
  hookGameId = 'game-r3-t0',
}: {
  navigationState: NavigationState;
  hookGameId?: string;
}) {
  const {
    gameState,
    initializeGame,
    loadExistingGame,
    getLineupStateSnapshot,
    changePitcher,
    lineupVersion,
    teamColorsRef: hookTeamColorsRef,
    gameStartTimestampRef: hookGameStartTimestampRef,
    notifyPersistenceMetadataChanged,
  } = useGameState(hookGameId);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [persistedTeamColors, setPersistedTeamColors] = useState<{
    awayTeamColor?: string;
    homeTeamColor?: string;
  }>({});
  const [gameStartTime, setGameStartTime] = useState(() => new Date());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [displayedAwayPitcher, setDisplayedAwayPitcher] = useState('');
  const [displayedHomePitcher, setDisplayedHomePitcher] = useState('');
  const seededNavStateRef = useRef(false);
  const restoredColorsRef = useRef(false);
  const isFreshNavigation = !!(navigationState?.homeTeamId || navigationState?.awayTeamId);

  useEffect(() => {
    const updateElapsedMinutes = () => {
      const now = Date.now();
      const diff = Math.floor((now - gameStartTime.getTime()) / 60000);
      setElapsedMinutes(Math.max(0, diff));
    };

    updateElapsedMinutes();
    const interval = setInterval(updateElapsedMinutes, 60000);
    return () => clearInterval(interval);
  }, [gameStartTime]);

  useEffect(() => {
    if (seededNavStateRef.current || !isFreshNavigation) return;
    seededNavStateRef.current = true;
    hookTeamColorsRef.current = {
      awayTeamColor: navigationState?.awayTeamColor,
      awayTeamBorderColor: navigationState?.awayTeamBorderColor,
      homeTeamColor: navigationState?.homeTeamColor,
      homeTeamBorderColor: navigationState?.homeTeamBorderColor,
    };
    hookGameStartTimestampRef.current = Date.now();
    notifyPersistenceMetadataChanged('test-navigation-seed');
  }, [
    hookGameStartTimestampRef,
    hookTeamColorsRef,
    isFreshNavigation,
    navigationState,
    notifyPersistenceMetadataChanged,
  ]);

  useEffect(() => {
    if (!gameInitialized || isFreshNavigation || restoredColorsRef.current) return;
    restoredColorsRef.current = true;

    const colors = hookTeamColorsRef.current;
    if (colors.awayTeamColor || colors.homeTeamColor) {
      setPersistedTeamColors(colors);
    }

    const persistedStart = hookGameStartTimestampRef.current;
    if (persistedStart && persistedStart < Date.now()) {
      setGameStartTime(new Date(persistedStart));
    }
  }, [
    gameInitialized,
    hookGameStartTimestampRef,
    hookTeamColorsRef,
    isFreshNavigation,
  ]);

  useEffect(() => {
    if (!gameInitialized) return;
    const lineupSnapshot = getLineupStateSnapshot();
    setDisplayedAwayPitcher(lineupSnapshot.away.currentPitcher?.playerName || '');
    setDisplayedHomePitcher(lineupSnapshot.home.currentPitcher?.playerName || '');
  }, [
    gameInitialized,
    gameState.currentPitcherId,
    gameState.gamePhase,
    getLineupStateSnapshot,
    lineupVersion,
  ]);

  return (
    <div>
      <div data-testid="away-color">{persistedTeamColors.awayTeamColor || ''}</div>
      <div data-testid="home-color">{persistedTeamColors.homeTeamColor || ''}</div>
      <div data-testid="elapsed">{String(elapsedMinutes)}</div>
      <div data-testid="displayed-away-pitcher">{displayedAwayPitcher}</div>
      <div data-testid="displayed-home-pitcher">{displayedHomePitcher}</div>
      <div data-testid="active-pitcher">{gameState.currentPitcherName}</div>
      <button
        onClick={async () => {
          await initializeGame(freshGameConfig);
          setGameInitialized(true);
        }}
        type="button"
      >
        initialize fresh
      </button>
      <button
        onClick={async () => {
          const loaded = await loadExistingGame({ preferSnapshot: !isFreshNavigation });
          if (loaded) {
            setGameInitialized(true);
          }
        }}
        type="button"
      >
        load existing
      </button>
      <button
        onClick={() =>
          changePitcher('away-rp', 'away-sp', 'away', 'Away Reliever', 'Away Starter')
        }
        type="button"
      >
        change away pitcher
      </button>
      <button
        onClick={() =>
          changePitcher('home-rp', 'home-sp', 'home', 'Home Reliever', 'Home Starter')
        }
        type="button"
      >
        change home pitcher
      </button>
    </div>
  );
}

describe('R3-T0 verification harness', () => {
  let mockNow = 1774872000000;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow);
    mockGetGameHeader.mockResolvedValue(null);
    mockLoadCurrentGame.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('persists navigation-seeded team colors and timer metadata into currentGame autosaves', async () => {
    const seededStart = Date.now();
    render(
      <VerificationHarness
        navigationState={{
          awayTeamId: 'away-team',
          homeTeamId: 'home-team',
          awayTeamColor: '#112233',
          awayTeamBorderColor: '#223344',
          homeTeamColor: '#445566',
          homeTeamBorderColor: '#556677',
          extraInningRunner: true,
          extraInningRunnerDelay: 2,
        }}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'initialize fresh' }));
    });

    await waitFor(() => {
      expect(mockCreateGameHeader).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSaveCurrentGame).toHaveBeenCalled();
    });

    const persistedSnapshot = mockSaveCurrentGame.mock.calls.at(-1)?.[0];
    expect(persistedSnapshot.awayTeamColor).toBe('#112233');
    expect(persistedSnapshot.homeTeamColor).toBe('#445566');
    expect(persistedSnapshot.gameStartTimestamp).toBe(seededStart);
  });

  test('restores persisted team colors and elapsed timer after refresh', async () => {
    const restoredStart = Date.now() - 2 * 60 * 1000;
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
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
      homeScore: 0,
      awayScore: 0,
      bases: {
        first: null,
        second: null,
        third: null,
      },
      currentBatterIndex: 0,
      atBatCount: 0,
      awayTeamId: 'away-team',
      homeTeamId: 'home-team',
      awayTeamName: 'Away Team',
      homeTeamName: 'Home Team',
      seasonNumber: 1,
      currentBatterId: 'away-sp',
      currentBatterName: 'Away Starter',
      currentPitcherId: 'home-sp',
      currentPitcherName: 'Home Starter',
      awayTeamColor: '#112233',
      awayTeamBorderColor: '#223344',
      homeTeamColor: '#445566',
      homeTeamBorderColor: '#556677',
      gameStartTimestamp: restoredStart,
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
        innings: [{ away: 0, home: 0 }],
        away: { runs: 0, hits: 0, errors: 0 },
        home: { runs: 0, hits: 0, errors: 0 },
      },
      awayLineup: [
        { playerId: 'away-sp', playerName: 'Away Starter', position: 'P' },
        { playerId: 'away-batter-2', playerName: 'Away Batter 2', position: 'SS' },
      ],
      homeLineup: [
        { playerId: 'home-sp', playerName: 'Home Starter', position: 'P' },
        { playerId: 'home-batter-2', playerName: 'Home Batter 2', position: '1B' },
      ],
      awayLineupState: {
        lineup: [
          {
            playerId: 'away-sp',
            playerName: 'Away Starter',
            position: 'P',
            battingOrder: 1,
            enteredInning: 1,
            isStarter: true,
          },
        ],
        bench: [],
        usedPlayers: [],
        currentPitcher: {
          playerId: 'away-sp',
          playerName: 'Away Starter',
          position: 'P',
          battingOrder: 1,
          enteredInning: 1,
          isStarter: true,
        },
      },
      homeLineupState: {
        lineup: [
          {
            playerId: 'home-sp',
            playerName: 'Home Starter',
            position: 'P',
            battingOrder: 1,
            enteredInning: 1,
            isStarter: true,
          },
        ],
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

    render(
      <VerificationHarness
        navigationState={null}
        hookGameId="exhibition-1"
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'load existing' }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('away-color').textContent).toBe('#112233');
    });
    await waitFor(() => {
      expect(screen.getByTestId('home-color').textContent).toBe('#445566');
    });
    await waitFor(() => {
      expect(screen.getByTestId('elapsed').textContent).toBe('2');
    });
  });

  test('re-syncs PRE_GAME pitcher displays for both away and home changes', async () => {
    render(
      <VerificationHarness
        navigationState={{
          awayTeamId: 'away-team',
          homeTeamId: 'home-team',
          awayTeamColor: '#112233',
          homeTeamColor: '#445566',
        }}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'initialize fresh' }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('displayed-away-pitcher').textContent).toBe('Away Starter');
    });
    await waitFor(() => {
      expect(screen.getByTestId('displayed-home-pitcher').textContent).toBe('Home Starter');
    });
    expect(screen.getByTestId('active-pitcher').textContent).toBe('Home Starter');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'change away pitcher' }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('displayed-away-pitcher').textContent).toBe('Away Reliever');
    });
    expect(screen.getByTestId('active-pitcher').textContent).toBe('Home Starter');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'change home pitcher' }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('displayed-home-pitcher').textContent).toBe('Home Reliever');
    });
    expect(screen.getByTestId('active-pitcher').textContent).toBe('Home Reliever');
  });
});
