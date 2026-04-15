import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  FameLeaderboardCard,
  buildFameLeaderboardEntries,
  type FameLeaderboardGameSource,
} from "../../app/components/FameLeaderboardCard";

const baseGame: FameLeaderboardGameSource = {
  gameId: "test-fame-game",
  awayTeamId: "away-team",
  awayTeamName: "Away Team",
  homeTeamId: "home-team",
  homeTeamName: "Home Team",
  competitionType: "exhibition",
  competitionId: "fixture-1",
  fameEvents: [
    {
      id: "away-1",
      gameId: "test-fame-game",
      eventType: "WALK_OFF",
      playerId: "away-a",
      playerName: "A Player",
      playerTeam: "away-team",
      fameValue: 2,
      fameType: "bonus",
      inning: 9,
      halfInning: "BOTTOM",
      timestamp: 3,
      autoDetected: true,
      description: "Won it late.",
    },
    {
      id: "away-2",
      gameId: "test-fame-game",
      eventType: "WEB_GEM",
      playerId: "away-b",
      playerName: "B Player",
      playerTeam: "away-team",
      fameValue: 1,
      fameType: "bonus",
      inning: 4,
      halfInning: "TOP",
      timestamp: 2,
      autoDetected: true,
      description: "Saved a run.",
    },
    {
      id: "away-3",
      gameId: "test-fame-game",
      eventType: "GO_AHEAD_HR",
      playerId: "away-c",
      playerName: "C Player",
      playerTeam: "away-team",
      fameValue: 1,
      fameType: "bonus",
      inning: 6,
      halfInning: "TOP",
      timestamp: 4,
      autoDetected: true,
      description: "Jumped ahead.",
    },
    {
      id: "away-4",
      gameId: "test-fame-game",
      eventType: "TOOTBLAN",
      playerId: "away-d",
      playerName: "D Player",
      playerTeam: "away-team",
      fameValue: -1,
      fameType: "boner",
      inning: 5,
      halfInning: "TOP",
      timestamp: 1,
      autoDetected: true,
      description: "Ran into an out.",
    },
    {
      id: "home-1",
      gameId: "test-fame-game",
      eventType: "GRAND_SLAM",
      playerId: "home-a",
      playerName: "Home Hero",
      playerTeam: "home-team",
      fameValue: 3,
      fameType: "bonus",
      inning: 7,
      halfInning: "BOTTOM",
      timestamp: 5,
      autoDetected: true,
      description: "Blew the game open.",
    },
  ],
};

describe("FameLeaderboardCard", () => {
  test("ranks the top three players per side and breaks ties by event count then name", () => {
    const entries = buildFameLeaderboardEntries({
      ...baseGame,
      fameEvents: [
        ...baseGame.fameEvents,
        {
          id: "away-5",
          gameId: "test-fame-game",
          eventType: "WEB_GEM",
          playerId: "away-b",
          playerName: "B Player",
          playerTeam: "away-team",
          fameValue: 0.2,
          fameType: "bonus",
          inning: 8,
          halfInning: "TOP",
          timestamp: 6,
          autoDetected: true,
          description: "Made another stop.",
        },
      ],
    }, "away-team");

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.playerName)).toEqual([
      "A Player",
      "B Player",
      "C Player",
    ]);
  });

  test("shows empty-state messaging when a game has no fame events", () => {
    render(
      <FameLeaderboardCard
        game={{ ...baseGame, fameEvents: [] }}
        gameMode="exhibition"
      />,
    );

    expect(screen.getByText("No Fame events recorded for Away Team.")).toBeInTheDocument();
    expect(screen.getByText("No Fame events recorded for Home Team.")).toBeInTheDocument();
  });

  test("renders expandable event breakdowns and elimination run-total subtitles", () => {
    render(
      <FameLeaderboardCard
        game={baseGame}
        gameMode="elimination"
        runTotalsByPlayerId={{
          "away-a": 5.5,
          "away-b": 1.0,
          "away-c": 1.8,
          "home-a": 7.2,
        }}
      />,
    );

    expect(screen.getByText(/Run total: \+5.5 \/ \+1.0 \/ \+1.8/i)).toBeInTheDocument();

    const awayColumn = screen.getByTestId("fame-leaderboard-column-away-team");
    fireEvent.click(within(awayColumn).getAllByRole("button", { name: /show events/i })[0]!);

    expect(within(awayColumn).getByText("Won it late.")).toBeInTheDocument();
    expect(within(awayColumn).getAllByText("+2.0")).toHaveLength(2);
  });
});
