import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockNavigate = vi.fn();
const mockPersistDraftStaffForLeague = vi.fn();
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

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks/useLeagueBuilderData", () => ({
  useLeagueBuilderData: vi.fn(() => ({
    leagues: mockLeagues,
    teams: mockTeams,
    isLoading: false,
    error: null,
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
});
