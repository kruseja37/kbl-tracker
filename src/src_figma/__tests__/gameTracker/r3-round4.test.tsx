import { act, render, renderHook, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

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
  mockGetAllCompletedGames,
  mockGetAllCanonicalPlayers,
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
  mockGetAllCompletedGames: vi.fn().mockResolvedValue([]),
  mockGetAllCanonicalPlayers: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../utils/eventLog", () => ({
  logAtBatEvent: mockLogAtBatEvent,
  logBetweenPlayEvent: mockLogBetweenPlayEvent,
  undoMostRecentGameAction: mockUndoMostRecentGameAction,
  createGameHeader: mockCreateGameHeader,
  completeGame: mockCompleteGame,
  getGameEvents: mockGetGameEvents,
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  getGameFieldingEvents: mockGetGameFieldingEvents,
  getGameHeader: mockGetGameHeader,
  getBetweenPlayEvent: vi.fn().mockResolvedValue(null),
  updateBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  markGameAggregated: mockMarkGameAggregated,
}));

vi.mock("../../utils/gameStorage", () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  saveCurrentGame: mockSaveCurrentGame,
  loadCurrentGame: mockLoadCurrentGame,
  immediateSaveCurrentGame: mockImmediateSaveCurrentGame,
  clearCurrentGame: mockClearCurrentGame,
}));

vi.mock("../../../utils/gameStorage", () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  getAllCompletedGames: mockGetAllCompletedGames,
  resolveExhibitionLeagueId: (game: {
    leagueId?: string;
    competitionId?: string;
    competitionType?: string;
  }) =>
    game.leagueId ??
    (game.competitionType === "exhibition" || !game.competitionType
      ? game.competitionId
      : undefined),
}));

vi.mock("../../../utils/processCompletedGame", () => ({
  processCompletedGame: mockProcessCompletedGame,
}));

vi.mock("../../../utils/playoffStorage", () => ({
  aggregateGameToPlayoffStats: mockAggregateGameToPlayoffStats,
}));

vi.mock("../../../utils/almanacStorage", () => ({
  getAllCanonicalPlayers: mockGetAllCanonicalPlayers,
}));

import { BattingLineupColumn } from "../../app/components/BattingLineupColumn";
import { DefensiveLineupColumn } from "../../app/components/DefensiveLineupColumn";
import { useGameState } from "../../hooks/useGameState";
import { getExhibitionBattingLeaders } from "../../../utils/almanacQueries";

async function initializeGame(
  result: { current: ReturnType<typeof useGameState> },
) {
  await act(async () => {
    await result.current.initializeGame({
      gameId: "game-r3-round4",
      awayTeamId: "away-team",
      awayTeamName: "Away Team",
      homeTeamId: "home-team",
      homeTeamName: "Home Team",
      awayStartingPitcherId: "away-sp",
      awayStartingPitcherName: "Away Starter",
      homeStartingPitcherId: "home-sp",
      homeStartingPitcherName: "Home Starter",
      awayLineup: [
        {
          playerId: "away-batter-1",
          playerName: "Away Batter 1",
          position: "SS",
        },
        {
          playerId: "away-batter-2",
          playerName: "Away Batter 2",
          position: "CF",
        },
      ],
      homeLineup: [
        {
          playerId: "home-batter-1",
          playerName: "Home Batter 1",
          position: "2B",
        },
        {
          playerId: "home-batter-2",
          playerName: "Home Batter 2",
          position: "RF",
        },
      ],
      awayBench: [],
      homeBench: [],
      seasonNumber: 1,
    });
  });
}

describe("R3 Round 4 bug fixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue({ aggregated: false });
    mockGetAllCompletedGames.mockResolvedValue([]);
    mockGetAllCanonicalPlayers.mockResolvedValue([]);
  });

  test("Bug 1: batting lineup shows the ghost-runner marker when runner identity matches by playerId", () => {
    render(
      <BattingLineupColumn
        players={[
          {
            playerId: "runner-1",
            name: "J. SMITH",
            position: "SS",
            battingOrder: 1,
          },
        ]}
        currentBatterIndex={1}
        runners={{
          second: { playerId: "runner-1", name: "John Smith" },
        }}
        nextLeadoffIndex={1}
        teamPrimaryColor="#123456"
        teamSecondaryColor="#abcdef"
        getMojoForPlayer={() => 0}
        getFitnessForPlayer={() => 'FIT'}
        onPlayerTap={() => undefined}
      />,
    );

    const runnerRow = screen.getByRole("button", { name: /J\. SMITH/i });
    expect(within(runnerRow).getByText("2")).toBeInTheDocument();
  });

  test("Bug 1: lineup columns show compact mojo and fitness indicators", () => {
    render(
      <>
        <BattingLineupColumn
          players={[
            {
              playerId: "batter-1",
              name: "J. SMITH",
              position: "SS",
              battingOrder: 1,
            },
          ]}
          currentBatterIndex={1}
          runners={{}}
          nextLeadoffIndex={2}
          teamPrimaryColor="#123456"
          teamSecondaryColor="#abcdef"
          getMojoForPlayer={() => 2}
          getFitnessForPlayer={() => 'STRAINED'}
          onPlayerTap={() => undefined}
          onMojoAdjust={() => undefined}
        />
        <DefensiveLineupColumn
          players={[
            {
              playerId: "pitcher-1",
              name: "A. ACE",
              position: "P",
              battingOrder: 9,
              isPitcher: true,
              pitchCount: 17,
            },
          ]}
          currentPitcherName="A. ACE"
          nextLeadoffIndex={1}
          teamPrimaryColor="#123456"
          teamSecondaryColor="#abcdef"
          getMojoForPlayer={() => -1}
          getFitnessForPlayer={() => 'HURT'}
          onPlayerTap={() => undefined}
          onMojoAdjust={() => undefined}
        />
      </>,
    );

    const battingRow = screen.getByText("J. SMITH").closest("button");
    expect(battingRow).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Increase mojo for J. SMITH" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Decrease mojo for J. SMITH" }),
    ).toBeInTheDocument();
    expect(
      within(battingRow!).getByTitle("Mojo: On Fire | Fitness: Strained"),
    ).toBeInTheDocument();

    const defensiveRow = screen.getByText("A. ACE").closest("button");
    expect(defensiveRow).not.toBeNull();
    expect(within(defensiveRow!).getByText("PC: 17")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Increase mojo for A. ACE" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Decrease mojo for A. ACE" }),
    ).toBeInTheDocument();
    expect(
      within(defensiveRow!).getByTitle("Mojo: Tense | Fitness: Hurt"),
    ).toBeInTheDocument();
  });

  test("Bug 2: prior-half corrections do not place the now-fielding team on base", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    await act(async () => {
      result.current.endInning();
      result.current.confirmPitchCount("home-sp", 12);
    });

    expect(result.current.gameState.isTop).toBe(false);

    act(() => {
      result.current.applyBasesCorrection(
        { first: false, second: true, third: false },
        {
          first: null,
          second: {
            runnerId: "away-batter-1",
            runnerName: "Away Batter 1",
            responsiblePitcherId: "home-sp",
          },
          third: null,
        },
        {
          inning: 1,
          halfInning: "TOP",
        },
      );
    });

    expect(result.current.gameState.bases).toEqual({
      first: false,
      second: false,
      third: false,
    });
    expect(result.current.getBaseRunnerNames()).toEqual({});
  });

  test("Bug 3: endGame includes leagueId in the initial exhibition archive context", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    let endGamePromise: Promise<void> | undefined;

    await act(async () => {
      endGamePromise = result.current.endGame({
        awaitPitchCountConfirmation: true,
        competitionType: "exhibition",
        competitionId: "league-exh",
        leagueId: "league-exh",
      });
    });

    expect(mockArchiveCompletedGame).toHaveBeenCalled();
    expect(mockArchiveCompletedGame.mock.calls[0]?.[4]).toMatchObject({
      competitionType: "exhibition",
      competitionId: "league-exh",
      leagueId: "league-exh",
    });

    await act(async () => {
      result.current.confirmPitchCount("home-sp", 18);
      await endGamePromise;
    });
  });

  test("Bug 3: endGame falls back from competitionId when leagueId is omitted", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    await act(async () => {
      await result.current.endGame({
        competitionType: "exhibition",
        competitionId: "league-exh",
      });
    });

    expect(mockArchiveCompletedGame).toHaveBeenCalled();
    expect(
      mockArchiveCompletedGame.mock.calls.every(
        (call) => call[4]?.leagueId === "league-exh",
      ),
    ).toBe(true);
    expect(mockProcessCompletedGame).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      "league-exh",
    );
  });

  test("Bug 3: exhibition leaders include archived games scoped by leagueId", async () => {
    mockGetAllCompletedGames.mockResolvedValue([
      {
        gameId: "game-exh-1",
        date: 1_700_000_000_000,
        competitionType: "exhibition",
        leagueId: "league-exh",
        awayTeamId: "away-team",
        homeTeamId: "home-team",
        awayTeamName: "Away Team",
        homeTeamName: "Home Team",
        finalScore: { away: 4, home: 5 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          "player-1": {
            playerName: "Player One",
            teamId: "away-team",
            pa: 4,
            ab: 4,
            h: 3,
            singles: 2,
            doubles: 1,
            triples: 0,
            hr: 0,
            rbi: 2,
            r: 1,
            bb: 0,
            hbp: 0,
            k: 0,
            sb: 0,
            cs: 0,
            sf: 0,
            sh: 0,
            gidp: 0,
            putouts: 0,
            assists: 0,
            fieldingErrors: 0,
          },
        },
        pitcherGameStats: [],
        activityLog: [],
      },
    ]);

    const leaders = await getExhibitionBattingLeaders("h", false, 5);

    expect(leaders).toEqual([
      expect.objectContaining({
        leagueId: "league-exh",
        playerId: "player-1",
        playerName: "Player One",
        teamId: "away-team",
        teamName: "Away Team",
        value: 3,
      }),
    ]);
  });
});
