import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockGetAllCompletedGames,
  mockListAllGameStories,
  mockListAllCommentaryFeedEntries,
  mockGetTransactionsByFranchiseSeason,
} = vi.hoisted(() => ({
  mockGetAllCompletedGames: vi.fn(),
  mockListAllGameStories: vi.fn(),
  mockListAllCommentaryFeedEntries: vi.fn(),
  mockGetTransactionsByFranchiseSeason: vi.fn(),
}));

vi.mock("../../../utils/gameStorage", () => ({
  getAllCompletedGames: mockGetAllCompletedGames,
}));

vi.mock("../../../utils/gameStoriesStorage", () => ({
  listAllGameStories: mockListAllGameStories,
}));

vi.mock("../../../utils/commentaryFeedStorage", () => ({
  listAllCommentaryFeedEntries: mockListAllCommentaryFeedEntries,
}));

vi.mock("../../../utils/transactionStorage", () => ({
  getTransactionsByFranchiseSeason: mockGetTransactionsByFranchiseSeason,
}));

import { listAlmanacNarrativeArchive } from "../../../utils/almanacNarrativeArchive";

function completedGame(overrides: Record<string, unknown>) {
  return {
    gameId: "game-1",
    date: 1000,
    seasonId: "franchise-a-season-1",
    statsScopeId: "franchise-a-season-1",
    competitionType: "franchise",
    franchiseId: "franchise-a",
    scheduleGameId: "sched-1",
    seasonNumber: 1,
    awayTeamId: "away",
    awayTeamName: "Away",
    homeTeamId: "home",
    homeTeamName: "Home",
    finalScore: { away: 2, home: 3 },
    innings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    ...overrides,
  };
}

function story(overrides: Record<string, unknown>) {
  return {
    id: "story-1",
    gameId: "game-1",
    reporterId: "reporter-1",
    teamId: "home",
    leagueId: "league-1",
    gameMode: "franchise",
    franchiseId: "franchise-a",
    seasonId: "franchise-a-season-1",
    seasonNumber: 1,
    statsScopeId: "franchise-a-season-1",
    scheduleGameId: "sched-1",
    competitionType: "franchise",
    headline: "Home Wins",
    body: "A completed game story.",
    playersMentioned: ["Riley Rake"],
    playerIdsMentioned: ["player-riley"],
    gameDate: "2026-05-01",
    opponentTeamId: "away",
    createdAt: 1000,
    changed_at: 1000,
    ...overrides,
  };
}

describe("almanacNarrativeArchive v1 franchise boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAllCommentaryFeedEntries.mockResolvedValue([]);
    mockGetTransactionsByFranchiseSeason.mockResolvedValue([]);
  });

  test("returns only completed, scoped franchise game-derived stories", async () => {
    mockGetAllCompletedGames.mockResolvedValue([
      completedGame({ gameId: "game-a", date: 3000 }),
      completedGame({
        gameId: "game-incomplete",
        date: 4000,
        aggregationStatus: "incomplete",
      }),
      completedGame({
        gameId: "game-b",
        date: 5000,
        franchiseId: "franchise-b",
        seasonId: "franchise-b-season-1",
        statsScopeId: "franchise-b-season-1",
      }),
      completedGame({
        gameId: "game-playoff",
        date: 6000,
        competitionType: "playoff",
        playoffId: "playoff-1",
      }),
    ]);
    mockListAllGameStories.mockResolvedValue([
      story({ id: "story-a", gameId: "game-a", headline: "A" }),
      story({ id: "story-orphan", gameId: "missing-game", headline: "Orphan" }),
      story({ id: "story-incomplete", gameId: "game-incomplete", headline: "Incomplete" }),
      story({
        id: "story-b",
        gameId: "game-b",
        franchiseId: "franchise-b",
        seasonId: "franchise-b-season-1",
        statsScopeId: "franchise-b-season-1",
        headline: "B",
      }),
      story({ id: "story-playoff", gameId: "game-playoff", headline: "Playoff" }),
    ]);

    const entries = await listAlmanacNarrativeArchive({
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-1",
      statsScopeId: "franchise-a-season-1",
      includePlayoffs: false,
    });

    expect(entries.map((entry) => entry.headline)).toEqual(["A"]);
    expect(mockGetTransactionsByFranchiseSeason).toHaveBeenCalledWith(
      "franchise-a",
      "franchise-a-season-1",
    );
  });

  test("player story history follows playerId across team changes", async () => {
    mockGetAllCompletedGames.mockResolvedValue([
      completedGame({
        gameId: "pre-trade-game",
        date: 1000,
        awayTeamId: "old-team",
        awayTeamName: "Old Team",
      }),
      completedGame({
        gameId: "post-trade-game",
        date: 2000,
        homeTeamId: "new-team",
        homeTeamName: "New Team",
      }),
    ]);
    mockListAllGameStories.mockResolvedValue([
      story({
        id: "pre-trade-story",
        gameId: "pre-trade-game",
        teamId: "old-team",
        playerIdsMentioned: ["player-riley"],
        headline: "Riley Before Trade",
      }),
      story({
        id: "post-trade-story",
        gameId: "post-trade-game",
        teamId: "new-team",
        playerIdsMentioned: ["player-riley"],
        headline: "Riley After Trade",
      }),
    ]);

    const entries = await listAlmanacNarrativeArchive({
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-1",
      playerId: "player-riley",
      kind: "post-game-story",
    });

    expect(entries.map((entry) => entry.headline)).toEqual([
      "Riley After Trade",
      "Riley Before Trade",
    ]);
  });

  test("transaction history projects movement by playerId without morale or relationship mutation", async () => {
    mockGetAllCompletedGames.mockResolvedValue([]);
    mockListAllGameStories.mockResolvedValue([]);
    mockGetTransactionsByFranchiseSeason.mockResolvedValue([
      {
        id: "txn-trade-1",
        timestamp: "2026-05-02T12:00:00.000Z",
        season: 1,
        gameNumber: null,
        phase: "REGULAR_SEASON",
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-1",
        statsScopeId: "franchise-a-season-1",
        type: "trade",
        actor: "USER",
        data: {
          playerIds: ["player-riley", "player-noelle"],
          sourceTeamId: "old-team",
          targetTeamId: "new-team",
          sourcePlayers: [
            {
              playerId: "player-riley",
              playerName: "Riley Rake",
              previousTeamId: "old-team",
              newTeamId: "new-team",
            },
          ],
        },
        previousState: null,
        undone: false,
        undoneAt: null,
        undoneBy: null,
      },
    ]);

    const entries = await listAlmanacNarrativeArchive({
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-1",
      playerId: "player-riley",
      kind: "transaction-history",
    });

    expect(entries).toEqual([
      expect.objectContaining({
        kind: "transaction-history",
        transactionId: "txn-trade-1",
        playerIds: ["player-noelle", "player-riley"],
        teamIds: ["new-team", "old-team"],
      }),
    ]);
    expect(entries[0].body).toContain("playerId");
    expect(entries[0].body).toContain("does not apply morale, chemistry, relationship");
  });
});
