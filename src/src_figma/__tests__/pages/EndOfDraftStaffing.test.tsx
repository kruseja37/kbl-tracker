import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockNavigate = vi.fn();
const mockPersistDraftStaffForLeague = vi.fn();
const mockRefresh = vi.fn();
const mockLeagues = [
  {
    id: "league-page",
    name: "League Page",
    teamIds: ["team-human", "team-cpu"],
    conferences: [],
    divisions: [],
    defaultRulesPreset: "default",
  },
];
const mockTeams = [
  {
    id: "team-human",
    name: "Human Club",
    abbreviation: "HUM",
    location: "Human",
    nickname: "Club",
    colors: { primary: "#123456", secondary: "#abcdef" },
    stadium: "Human Park",
    leagueIds: ["league-page"],
    controlledBy: "human",
  },
  {
    id: "team-cpu",
    name: "CPU Club",
    abbreviation: "CPU",
    location: "CPU",
    nickname: "Club",
    colors: { primary: "#654321", secondary: "#fedcba" },
    stadium: "CPU Park",
    leagueIds: ["league-page"],
    controlledBy: "ai",
  },
];
const mockLeagueHookState: {
  leagues: typeof mockLeagues;
  teams: typeof mockTeams;
  isLoading: boolean;
  error: string | null;
} = {
  leagues: mockLeagues,
  teams: mockTeams,
  isLoading: false,
  error: null,
};

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks/useLeagueBuilderData", () => ({
  useLeagueBuilderData: vi.fn(() => ({
    ...mockLeagueHookState,
    refresh: mockRefresh,
  })),
}));

vi.mock("../../app/utils/draftStaffingPersistence", () => ({
  isHumanControlledTeam: (team: { controlledBy?: string }) => team.controlledBy !== "ai",
  MANAGER_STYLES: ["Balanced", "Aggressive", "Small-ball", "Old-school", "Analytics"],
  persistDraftStaffForLeague: (...args: unknown[]) => mockPersistDraftStaffForLeague(...args),
  REPORTER_AVATARS: [
    { label: "Fedora", era: "fedora" },
    { label: "Headset", era: "headset" },
    { label: "Cap", era: "cap" },
  ],
  REPORTER_PERSONAS: ["Straight shooter", "Homer", "Cynic", "Hype man", "Old hand"],
}));

import { EndOfDraftStaffing } from "../../app/pages/EndOfDraftStaffing";

describe("EndOfDraftStaffing handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockLeagueHookState, {
      leagues: mockLeagues,
      teams: mockTeams,
      isLoading: false,
      error: null,
    });
    mockRefresh.mockResolvedValue(undefined);
    window.history.pushState({}, "", "/league-builder/staff-hire?leagueId=league-page");
    mockPersistDraftStaffForLeague.mockResolvedValue({ managers: [], assignments: [], reporters: [] });
  });

  test("continues to Franchise Setup with the drafted leagueId", async () => {
    render(<EndOfDraftStaffing />);

    fireEvent.click(screen.getByRole("button", { name: /Confirm Staff and Continue to Franchise Setup/i }));

    await waitFor(() => {
      expect(mockPersistDraftStaffForLeague).toHaveBeenCalledWith(
        expect.objectContaining({ leagueId: "league-page" }),
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith("/franchise/setup?leagueId=league-page");
  });

  test("lets the user retry or safely exit when league data fails", () => {
    mockLeagueHookState.error = "league database offline";
    render(<EndOfDraftStaffing />);

    fireEvent.click(screen.getByRole("button", { name: /TRY AGAIN/i }));
    expect(mockRefresh).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /BACK TO LEAGUE BUILDER/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder");
  });

  test("does not staff or navigate an unrelated league when the requested league is missing", () => {
    mockLeagueHookState.leagues = [
      {
        ...mockLeagues[0],
        id: "unrelated-league",
        name: "Unrelated League",
      },
    ];
    render(<EndOfDraftStaffing />);

    expect(screen.getByText(/No league found for staff hire/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirm Staff and Continue to Franchise Setup/i })).not.toBeInTheDocument();
    expect(mockPersistDraftStaffForLeague).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /TRY AGAIN/i }));
    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(mockPersistDraftStaffForLeague).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /BACK TO LEAGUE BUILDER/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder");
    expect(mockNavigate).not.toHaveBeenCalledWith("/franchise/setup?leagueId=unrelated-league");
    expect(mockPersistDraftStaffForLeague).not.toHaveBeenCalled();
  });
});
