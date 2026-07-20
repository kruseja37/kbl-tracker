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
const mockRefresh = vi.fn(async () => undefined);
const mockUpdateTeam = vi.fn(async () => undefined);
const storageMocks = vi.hoisted(() => ({
  updateMlbDraftSessionAtomically: vi.fn(async (
    _leagueId: string,
    _seasonNumber: number,
    update: (session: Record<string, unknown>) => Record<string, unknown>,
  ) => update({
    id: "completed-mlb-snake",
    snakeSetup: { clubs: [{ teamId: "team-a", hotseat: true }] },
  })),
}));

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
    getMlbDraftSession: vi.fn(async () => ({ id: "completed-mlb-snake" })),
    updateMlbDraftSessionAtomically: storageMocks.updateMlbDraftSessionAtomically,
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

vi.mock("../../../utils/snakeRosterHandoff", () => ({
  assertSnakeRosterHandoffReady: vi.fn(async () => undefined),
}));

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

function mockLeagueData(league = makeLeague(), team = makeTeam("team-a")) {
  vi.mocked(useLeagueBuilderData).mockReturnValue({
    leagues: [league],
    teams: [team],
    players: [],
    rulesPresets: [],
    isLoading: false,
    error: null,
    refresh: mockRefresh,
    updateTeam: mockUpdateTeam,
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

  test("reveals auto-assigned scouts and continues to the farm auction", async () => {
    render(<ScoutHire />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm Scouts/i })).toBeEnabled();
    });

    expect(screen.getByText(/SCOUT REVEAL/i)).toBeInTheDocument();
    expect(screen.getByText(/Fielding \/ Arm/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hire for/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Each club's scout is assigned/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "SCOUT HIRE HELP" }));
    expect(screen.getByText(/Each club's scout is assigned/i)).toBeInTheDocument();

    const card = screen.getByTestId("scout-card-team-a");
    expect(card).toHaveStyle({ borderColor: "#000000" });

    fireEvent.click(screen.getByRole("button", { name: /Confirm Scouts/i }));

    await waitFor(() => {
      expect(persistScoutHiresForLeague).toHaveBeenCalled();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/farm-auction-draft?leagueId=league-page");
  });

  test("back navigation returns to the MLB auction with the drafted leagueId", async () => {
    render(<ScoutHire />);

    fireEvent.click(screen.getByRole("button", { name: /Back to MLB auction/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=3");
  });

  test("uses a snake-aware back label and route for a snake league", async () => {
    mockLeagueData(makeLeague({ draftFormat: "snake" }));
    render(<ScoutHire />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm Scouts/i })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /Back to MLB snake draft/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/snake-room?leagueId=league-page");
  });

  test("offers a retry when scout hire cannot load", () => {
    vi.mocked(useLeagueBuilderData).mockReturnValue({
      leagues: [],
      teams: [],
      players: [],
      rulesPresets: [],
      isLoading: false,
      error: "OFFLINE",
      refresh: mockRefresh,
    } as unknown as UseLeagueBuilderDataReturn);
    render(<ScoutHire />);

    fireEvent.click(screen.getByRole("button", { name: /RETRY/i }));

    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  test("never strands an invalid scout-hire route", () => {
    vi.mocked(useLeagueBuilderData).mockReturnValue({
      leagues: [],
      teams: [],
      players: [],
      rulesPresets: [],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    } as unknown as UseLeagueBuilderDataReturn);
    render(<ScoutHire />);

    fireEvent.click(screen.getByRole("button", { name: "RETRY" }));
    expect(mockRefresh).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "BACK TO DRAFT SETUP" }));
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/draft-setup");
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

  test("blocks false Generalist scouts and repairs a missing frozen farm identity", async () => {
    mockLeagueData(
      makeLeague({ draftFormat: "snake" }),
      { ...makeTeam("team-a"), farmArchetypeKey: undefined },
    );
    render(<ScoutHire />);

    expect(await screen.findByText("FARM IDENTITIES MISSING")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirm Scouts/i })).not.toBeInTheDocument();
    expect(screen.queryByText("GENERALIST")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: /Farm identity for Page Caps/i }), {
      target: { value: "web-gems" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SAVE FARM IDENTITIES" }));

    await waitFor(() => expect(storageMocks.updateMlbDraftSessionAtomically).toHaveBeenCalledOnce());
    expect(mockUpdateTeam).toHaveBeenCalledWith(expect.objectContaining({
      id: "team-a",
      farmArchetypeKey: "web-gems",
    }));
    expect(mockRefresh).toHaveBeenCalled();
    const update = storageMocks.updateMlbDraftSessionAtomically.mock.calls[0][2];
    expect(update({
      snakeSetup: { clubs: [{ teamId: "team-a", hotseat: true }] },
    })).toEqual(expect.objectContaining({
      snakeSetup: {
        clubs: [expect.objectContaining({ teamId: "team-a", farmArchetypeId: "web-gems" })],
      },
    }));
  });
});
