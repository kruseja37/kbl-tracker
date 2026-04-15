import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  RunStandingsTable,
  buildRunStandingsEntries,
} from "../../app/components/RunStandingsTable";
import type { RunFameStanding } from "../../../utils/eliminationRunFameStorage";

const baseStandings: RunFameStanding[] = [
  {
    playerId: "player-a",
    playerName: "Maya Vega",
    totalFame: 6.4,
    gamesPlayed: 3,
    events: [
      {
        id: "event-a1",
        gameId: "game-3",
        eventType: "WALK_OFF",
        playerId: "player-a",
        playerName: "Maya Vega",
        playerTeam: "breakers",
        fameValue: 1.5,
        fameType: "bonus",
        inning: 9,
        halfInning: "BOTTOM",
        timestamp: 30,
        autoDetected: true,
      },
    ],
  },
  {
    playerId: "player-b",
    playerName: "Ivy Knox",
    totalFame: 7.2,
    gamesPlayed: 4,
    events: [
      {
        id: "event-b1",
        gameId: "game-4",
        eventType: "GRAND_SLAM",
        playerId: "player-b",
        playerName: "Ivy Knox",
        playerTeam: "night-shift",
        fameValue: 2.4,
        fameType: "bonus",
        inning: 7,
        halfInning: "BOTTOM",
        timestamp: 40,
        autoDetected: true,
      },
    ],
  },
];

describe("RunStandingsTable", () => {
  test("keeps standings order, maps team names, and flags current-game players", () => {
    const entries = buildRunStandingsEntries(
      baseStandings,
      new Set(["player-a"]),
      {
        breakers: "Bracket Breakers",
        "night-shift": "Night Shift",
      },
    );

    expect(entries.map((entry) => entry.playerName)).toEqual([
      "Ivy Knox",
      "Maya Vega",
    ]);
    expect(entries[1]?.teamName).toBe("Bracket Breakers");
    expect(entries[1]?.isCurrentGamePlayer).toBe(true);
    expect(entries[0]?.isCurrentGamePlayer).toBe(false);
  });

  test("renders sorted rankings with highlighted current-game players", () => {
    render(
      <RunStandingsTable
        standings={buildRunStandingsEntries(baseStandings, new Set(["player-b"]), {
          breakers: "Bracket Breakers",
          "night-shift": "Night Shift",
        })}
      />,
    );

    const rows = screen.getAllByTestId(/run-standings-row-/);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("Ivy Knox")).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/Featured in this game/i)).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Maya Vega")).toBeInTheDocument();
  });

  test("renders empty-state messaging when there is no run Fame yet", () => {
    render(<RunStandingsTable standings={[]} />);

    expect(
      screen.getByText(/No run Fame recorded yet/i),
    ).toBeInTheDocument();
  });
});
