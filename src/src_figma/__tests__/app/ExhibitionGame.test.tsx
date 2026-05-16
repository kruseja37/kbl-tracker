import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ManagerProfile } from "../../../types/managerWpa";

const {
  mockEnsureDefaultManagerProfiles,
  mockListManagerProfiles,
  mockResolveManagerForTeam,
  mockSaveUnassignedManagerProfile,
  mockUseLeagueBuilderData,
  mockNavigate,
  initialManagerProfiles,
  createdManagerProfile,
} = vi.hoisted(() => {
  const initialManagerProfiles: ManagerProfile[] = [
    {
      managerId: "sirloins-manager",
      displayName: "Casey Neutral",
      createdByUser: false,
      defaultManager: true,
    },
    {
      managerId: "beewolves-manager",
      displayName: "Casey Neutral",
      createdByUser: false,
      defaultManager: true,
    },
  ];
  const createdManagerProfile: ManagerProfile = {
    managerId: "manager-sky-rally-a1b2c3d4",
    displayName: "Sky Rally",
    createdByUser: true,
    defaultManager: false,
  };

  return {
    mockEnsureDefaultManagerProfiles: vi.fn(),
    mockListManagerProfiles: vi.fn(),
    mockResolveManagerForTeam: vi.fn(),
    mockSaveUnassignedManagerProfile: vi.fn(),
    mockUseLeagueBuilderData: vi.fn(),
    mockNavigate: vi.fn(),
    initialManagerProfiles,
    createdManagerProfile,
  };
});

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks/useLeagueBuilderData", () => ({
  useLeagueBuilderData: mockUseLeagueBuilderData,
}));

vi.mock("../../utils/lineupLoader", () => ({
  loadTeamLineup: vi.fn().mockResolvedValue({
    players: [],
    pitchers: [],
    hasStoredLineup: false,
    optimalLineups: {},
  }),
}));

vi.mock("../../../utils/playerOverrides", () => ({
  getEffectivePlayer: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../../utils/managerIdentityStorage", () => ({
  ensureDefaultManagerProfiles: mockEnsureDefaultManagerProfiles,
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID: "league-builder",
  listManagerProfiles: mockListManagerProfiles,
  normalizeManagerDisplayName: (displayName: string) =>
    displayName.trim().replace(/\s+/g, " ").toLowerCase(),
  resolveManagerForTeam: mockResolveManagerForTeam,
  saveUnassignedManagerProfile: mockSaveUnassignedManagerProfile,
}));

import { ExhibitionGame } from "../../app/pages/ExhibitionGame";

function getSelectOptionLabels(select: HTMLElement): string[] {
  return Array.from((select as HTMLSelectElement).options).map((option) =>
    option.textContent ?? "",
  );
}

describe("ExhibitionGame manager pool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureDefaultManagerProfiles.mockResolvedValue(initialManagerProfiles);
    mockListManagerProfiles.mockResolvedValue(initialManagerProfiles);
    mockResolveManagerForTeam.mockResolvedValue({
      managerId: "sirloins-manager",
      managerName: "Casey Neutral",
      profile: initialManagerProfiles[0],
    });
    mockSaveUnassignedManagerProfile.mockResolvedValue(createdManagerProfile);
    mockUseLeagueBuilderData.mockReturnValue({
      leagues: [
        {
          id: "sml",
          name: "Super Mega League",
          teamIds: ["sirloins", "beewolves"],
        },
      ],
      teams: [
        {
          id: "sirloins",
          name: "Sirloins",
          abbreviation: "SIR",
          colors: { primary: "#7f1d1d", secondary: "#fef3c7" },
        },
        {
          id: "beewolves",
          name: "Beewolves",
          abbreviation: "BW",
          colors: { primary: "#facc15", secondary: "#111827" },
        },
      ],
      players: [],
      rulesPresets: [],
      isLoading: false,
      error: null,
      getRoster: vi.fn().mockResolvedValue(null),
      updateRoster: vi.fn(),
      getLeague: vi.fn(),
      createLeague: vi.fn(),
      updateLeague: vi.fn(),
      removeLeague: vi.fn(),
      duplicateLeague: vi.fn(),
      getTeamById: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      removeTeam: vi.fn(),
      getPlayerById: vi.fn(),
      getTeamPlayers: vi.fn(),
      createPlayer: vi.fn(),
      updatePlayer: vi.fn(),
      removePlayer: vi.fn(),
      getRulesById: vi.fn(),
      createRulesPreset: vi.fn(),
      updateRulesPreset: vi.fn(),
      removeRulesPreset: vi.fn(),
      removeRoster: vi.fn(),
      seedSMB4Data: vi.fn(),
      isSMB4Seeded: vi.fn(),
      seedMLBData: vi.fn(),
      isMLBSeeded: vi.fn(),
      refresh: vi.fn(),
    });
  });

  test("adds an unassigned manager profile and keeps selector labels disambiguated", async () => {
    render(<ExhibitionGame />);

    fireEvent.click(screen.getByRole("button", { name: /super mega league/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    const [awayTeamSelect] = screen.getAllByRole("combobox");
    fireEvent.change(awayTeamSelect, { target: { value: "sirloins" } });

    const awayManagerSelect = await screen.findByRole("combobox", {
      name: "Away manager selector",
    });
    await waitFor(() =>
      expect(getSelectOptionLabels(awayManagerSelect)).toEqual(
        expect.arrayContaining([
          "CASEY NEUTRAL (SIRLOINS)",
          "CASEY NEUTRAL (BEEWOLVES)",
        ]),
      ),
    );

    fireEvent.change(screen.getByLabelText("New exhibition manager name"), {
      target: { value: "Sky Rally" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ADD" }));

    await waitFor(() =>
      expect(mockSaveUnassignedManagerProfile).toHaveBeenCalledWith({
        displayName: "Sky Rally",
        managementStyle: { label: "Balanced" },
      }),
    );
    expect(await screen.findByText("Sky Rally added to manager pool.")).toBeInTheDocument();

    await waitFor(() =>
      expect(getSelectOptionLabels(awayManagerSelect)).toEqual(
        expect.arrayContaining([
          "CASEY NEUTRAL (SIRLOINS)",
          "CASEY NEUTRAL (BEEWOLVES)",
          "SKY RALLY",
        ]),
      ),
    );
  });
});
