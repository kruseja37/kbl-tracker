import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { EliminationSetup } from "../../app/pages/EliminationSetup";

const {
  mockNavigate,
  mockCreateEliminationRun,
  mockSeedSMB4Data,
  mockLeagues,
  mockTeams,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockCreateEliminationRun: vi.fn(),
  mockSeedSMB4Data: vi.fn(),
  mockLeagues: [
    {
      id: "league-1",
      name: "Test League",
      teamIds: ["alpha", "beta", "gamma", "delta"],
      conferences: [],
      divisions: [],
    },
  ],
  mockTeams: [
    { id: "alpha", name: "Alpha", location: "Alpha City", abbreviation: "ALP" },
    { id: "beta", name: "Beta", location: "Beta City", abbreviation: "BET" },
    { id: "gamma", name: "Gamma", location: "Gamma City", abbreviation: "GAM" },
    { id: "delta", name: "Delta", location: "Delta City", abbreviation: "DEL" },
  ],
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks/useLeagueBuilderData", () => ({
  useLeagueBuilderData: () => ({
    leagues: mockLeagues,
    teams: mockTeams,
    isLoading: false,
    error: null,
    seedSMB4Data: mockSeedSMB4Data,
  }),
}));

vi.mock("../../../utils/eliminationManager", () => ({
  createEliminationRun: mockCreateEliminationRun,
}));

vi.mock("../../../utils/playoffStorage", () => ({
  getEliminationRoundName: (round: number) => `Round ${round}`,
}));

describe("EliminationSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateEliminationRun.mockResolvedValue({
      eliminationId: "elim-created",
      playoffId: "playoff-created",
    });
  });

  test("allows elimination games from 3 to 9 innings and persists the selected length", async () => {
    render(<EliminationSetup />);

    fireEvent.click(screen.getByRole("button", { name: /TEST LEAGUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));

    const inningsGroup = screen.getByRole("group", { name: /innings per game/i });
    for (const innings of [3, 4, 5, 6, 7, 8, 9]) {
      expect(
        within(inningsGroup).getByRole("button", { name: String(innings) }),
      ).toBeInTheDocument();
    }

    fireEvent.click(within(inningsGroup).getByRole("button", { name: "5" }));
    expect(
      withinGroupButton(inningsGroup, "5"),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));
    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));
    fireEvent.click(screen.getByRole("button", { name: /NEXT/i }));
    fireEvent.click(screen.getByRole("button", { name: /START PLAYOFFS/i }));

    await waitFor(() => expect(mockCreateEliminationRun).toHaveBeenCalled());
    expect(mockCreateEliminationRun).toHaveBeenCalledWith(
      expect.objectContaining({
        inningsPerGame: 5,
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/elimination/elim-created");
  });
});

function withinGroupButton(group: HTMLElement, name: string) {
  return Array.from(group.querySelectorAll("button")).find(
    (button) => button.textContent === name,
  ) as HTMLButtonElement;
}
