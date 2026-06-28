import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ScoutHire } from "../../app/pages/ScoutHire";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";
import { persistScoutHiresForLeague } from "../../app/utils/draftStaffingPersistence";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks/useLeagueBuilderData", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/useLeagueBuilderData")>(
    "../../hooks/useLeagueBuilderData",
  );
  return {
    ...actual,
    useLeagueBuilderData: vi.fn(),
  };
});

vi.mock("../../../utils/leagueBuilderStorage", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/leagueBuilderStorage")>(
    "../../../utils/leagueBuilderStorage",
  );
  return {
    ...actual,
    getScoutProfilesForLeague: vi.fn(async () => [
      {
        id: "live-scout-league-page-1",
        leagueId: "league-page",
        teamId: "team-a",
        name: "Test Scout",
        specialties: [],
        weaknesses: [],
        accuracyByPosition: {},
        seed: "test-scout",
        hiredPick: { round: 1, pickNumber: 1, teamId: "team-a" },
        createdDate: "2026-01-01",
        lastModified: "2026-01-01",
      },
    ]),
  };
});

vi.mock("../../app/utils/draftStaffingPersistence", async () => {
  const actual = await vi.importActual<typeof import("../../app/utils/draftStaffingPersistence")>(
    "../../app/utils/draftStaffingPersistence",
  );
  return {
    ...actual,
    persistScoutHiresForLeague: vi.fn(async () => []),
  };
});

function makeLeague(overrides: Partial<LeagueTemplate> = {}): LeagueTemplate {
  return {
    id: "league-page",
    name: "Page League",
    teamIds: ["team-a"],
    conferences: [],
    divisions: [],
    defaultRulesPreset: "rules",
    tier: "standard",
    balanceMode: "taxed",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    ...overrides,
  };
}

function makeTeam(id: string): Team {
  return {
    id,
    name: "Caps",
    abbreviation: "CAP",
    location: "Page",
    nickname: "Caps",
    colors: { primary: "#000000", secondary: "#ffffff" },
    stadium: "Page Park",
    controlledBy: "human",
    leagueIds: ["league-page"],
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function mockLeagueData() {
  vi.mocked(useLeagueBuilderData).mockReturnValue({
    leagues: [makeLeague()],
    teams: [makeTeam("team-a")],
    players: [],
    rulesPresets: [],
    isLoading: false,
    error: null,
  } as unknown as UseLeagueBuilderDataReturn);
}

describe("ScoutHire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/league-builder/scout-hire?leagueId=league-page&shills=3");
    mockLeagueData();
  });

  afterEach(() => {
    cleanup();
  });

  test("preserves shill count when continuing to the live auction", async () => {
    render(<ScoutHire />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue to MLB Auction/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Continue to MLB Auction/i }));

    await waitFor(() => {
      expect(persistScoutHiresForLeague).toHaveBeenCalled();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=3");
  });
});
