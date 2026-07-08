import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ScoutHire } from "../../app/pages/ScoutHire";
import { buildLiveScoutPool } from "../../app/utils/draftStaffingPersistence";
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
    farmArchetypeKey: id === "team-a" ? "web-gems" : "bomba-squad",
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

  test("reveals auto-assigned scouts and preserves shill count when continuing to the live auction", async () => {
    render(<ScoutHire />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm Scouts/i })).toBeEnabled();
    });

    expect(screen.getByText(/SCOUT REVEAL/i)).toBeInTheDocument();
    expect(screen.getByText(/Fielding \/ Arm/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hire for/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Confirm Scouts/i }));

    await waitFor(() => {
      expect(persistScoutHiresForLeague).toHaveBeenCalled();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=3");
  });

  test("auto scout assignment is deterministic and archetype-specific", () => {
    const webGemsTeam = makeTeam("team-a");
    const bombaTeam = makeTeam("team-b");
    const first = buildLiveScoutPool("league-page", [webGemsTeam]);
    const second = buildLiveScoutPool("league-page", [webGemsTeam]);
    const different = buildLiveScoutPool("league-page", [bombaTeam]);

    expect(second[0]).toEqual(first[0]);
    expect(first[0].specialties).toEqual(["fielding", "arm"]);
    expect(first[0].weaknesses).toEqual(["power", "contact"]);
    expect(different[0].specialties).toEqual(["power"]);
    expect(different[0].weaknesses).toEqual(["contact", "speed"]);
  });
});
