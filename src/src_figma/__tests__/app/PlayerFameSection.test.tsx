import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { PlayerFameGameSource } from "../../app/components/PlayerFameSection";

const {
  mockGetPlayerGameFame,
  mockGetPlayerGameEvents,
  mockGetPlayerRunFame,
} = vi.hoisted(() => ({
  mockGetPlayerGameFame: vi.fn(),
  mockGetPlayerGameEvents: vi.fn(),
  mockGetPlayerRunFame: vi.fn(),
}));

vi.mock("../../app/engines/fameIntegration", async () => {
  const actual = await vi.importActual<
    typeof import("../../app/engines/fameIntegration")
  >("../../app/engines/fameIntegration");

  return {
    ...actual,
    getPlayerGameFame: mockGetPlayerGameFame,
    getPlayerGameEvents: mockGetPlayerGameEvents,
  };
});

vi.mock("../../../utils/eliminationRunFameStorage", () => ({
  getPlayerRunFame: mockGetPlayerRunFame,
}));

import { PlayerFameSection } from "../../app/components/PlayerFameSection";

function createGame(events: PlayerFameGameSource["fameEvents"]): PlayerFameGameSource {
  return {
    gameId: "preview-game",
    fameEvents: events,
  };
}

describe("PlayerFameSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerRunFame.mockResolvedValue({
      totalFame: 0,
      events: [],
      gamesPlayed: 0,
    });
  });

  test("renders exhibition game fame totals and event rows from fameIntegration helpers", () => {
    mockGetPlayerGameFame.mockReturnValue(2);
    mockGetPlayerGameEvents.mockReturnValue([
      {
        eventType: "WALK_OFF",
        icon: "🏆",
        label: "WALK OFF",
        description: "Delivered the winning swing in the ninth.",
        baseFame: 1.5,
        finalFame: 1.5,
        liMultiplier: 1,
        playoffMultiplier: 1,
        isBonus: true,
        isBoner: false,
        attribution: "player",
      },
      {
        eventType: "WEB_GEM",
        icon: "✨",
        label: "WEB GEM",
        description: "Laid out in the hole to steal a hit.",
        baseFame: 0.5,
        finalFame: 0.5,
        liMultiplier: 1,
        playoffMultiplier: 1,
        isBonus: true,
        isBoner: false,
        attribution: "player",
      },
    ]);

    render(
      <PlayerFameSection
        game={createGame([
          {
            id: "fame-1",
            gameId: "preview-game",
            eventType: "WALK_OFF",
            playerId: "player-1",
            playerName: "Maya Vega",
            playerTeam: "PRESS",
            fameValue: 1.5,
            fameType: "bonus",
            inning: 9,
            halfInning: "BOTTOM",
            timestamp: Date.parse("2026-04-14T19:04:00.000Z"),
            autoDetected: true,
            description: "Delivered the winning swing in the ninth.",
          },
          {
            id: "fame-2",
            gameId: "preview-game",
            eventType: "WEB_GEM",
            playerId: "player-1",
            playerName: "Maya Vega",
            playerTeam: "PRESS",
            fameValue: 0.5,
            fameType: "bonus",
            inning: 7,
            halfInning: "TOP",
            timestamp: Date.parse("2026-04-14T18:42:00.000Z"),
            autoDetected: true,
            description: "Laid out in the hole to steal a hit.",
          },
        ])}
        gameMode="exhibition"
        playerId="player-1"
      />,
    );

    expect(screen.getByText("This Game")).toBeInTheDocument();
    expect(screen.getByText("+2.0")).toBeInTheDocument();
    expect(screen.getByText("WALK OFF")).toBeInTheDocument();
    expect(screen.getByText("WEB GEM")).toBeInTheDocument();
    expect(screen.getByText(/Bot 9/i)).toBeInTheDocument();
    expect(screen.getByText(/Top 7/i)).toBeInTheDocument();
    expect(mockGetPlayerGameFame).toHaveBeenCalled();
    expect(mockGetPlayerGameEvents).toHaveBeenCalled();
    expect(mockGetPlayerGameFame.mock.calls[0][1]).toBe("player-1");
  });

  test("renders elimination mode with the run-to-date aggregate", async () => {
    mockGetPlayerGameFame.mockReturnValue(1.9);
    mockGetPlayerGameEvents.mockReturnValue([
      {
        eventType: "GO_AHEAD_HR",
        icon: "📈",
        label: "GO AHEAD HR",
        description: "Turned the bracket game with a late homer.",
        baseFame: 1.5,
        finalFame: 1.9,
        liMultiplier: 1,
        playoffMultiplier: 1.25,
        isBonus: true,
        isBoner: false,
        attribution: "player",
      },
    ]);
    mockGetPlayerRunFame.mockResolvedValue({
      totalFame: 4.4,
      events: [],
      gamesPlayed: 2,
    });

    render(
      <PlayerFameSection
        game={createGame([
          {
            id: "elim-1",
            gameId: "preview-game",
            eventType: "GO_AHEAD_HR",
            playerId: "player-1",
            playerName: "Maya Vega",
            playerTeam: "PRESS",
            fameValue: 1.9,
            fameType: "bonus",
            inning: 8,
            halfInning: "BOTTOM",
            timestamp: Date.parse("2026-04-14T20:12:00.000Z"),
            autoDetected: true,
            description: "Turned the bracket game with a late homer.",
          },
        ])}
        gameMode="elimination"
        playerId="player-1"
        runId="preview-elimination"
      />,
    );

    expect(screen.getByText("Run To Date")).toBeInTheDocument();
    expect(screen.getByText("GO AHEAD HR")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("+4.4")).toBeInTheDocument();
    });
    expect(mockGetPlayerRunFame).toHaveBeenCalledWith(
      "preview-elimination",
      "player-1",
    );
  });

  test("renders the franchise placeholder without consulting game fame helpers", () => {
    render(
      <PlayerFameSection
        game={null}
        gameMode="franchise"
        playerId="player-1"
      />,
    );

    expect(
      screen.getByText("Franchise Fame rollup — coming soon."),
    ).toBeInTheDocument();
    expect(mockGetPlayerGameFame).not.toHaveBeenCalled();
    expect(mockGetPlayerGameEvents).not.toHaveBeenCalled();
  });
});
