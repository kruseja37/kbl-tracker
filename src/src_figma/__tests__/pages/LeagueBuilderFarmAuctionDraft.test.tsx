import "fake-indexeddb/auto";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { LEAGUE_MINIMUM_SALARY } from "../../../data/rosterEngineConstants";
import { gradeToTwentyEighty } from "../../../engines/gradeEngine";
import { archetypeBandValueRange } from "../../../engines/scoutValueRange";
import {
  deriveAuctionSessionNominationSeed,
  seededNominationOrder,
  surfaceNextPlayer,
} from "../../../engines/auctionStateMachine";
import { buildFarmAuctionSession } from "../../../utils/farmAuctionSession";
import {
  __resetLeagueBuilderDatabaseForTests,
  createFarmAuctionSessionId,
  deleteScoutProfilesForLeague,
  saveScoutProfile,
} from "../../../utils/leagueBuilderStorage";
import {
  scoutOverallBandForPosition,
  scoutOverallGradeBand,
  scoutOverallTierForPosition,
  scoutToolBands,
  type DraftPosition,
  type LeagueBuilderProspectPlayerDto,
  type ProspectScoutDescriptor,
} from "../../../utils/prospectScoutingDraftEngine";
import { LeagueBuilderFarmAuctionDraft } from "../../app/pages/LeagueBuilderFarmAuctionDraft";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Team,
  type TeamRoster,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

const mockNavigate = vi.fn();
const TEST_SESSION_LAUNCH_NONCE = "00000000-0000-4000-8000-000000000001";

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../utils/syncEngine", () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
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

const DB_NAME = "kbl-league-builder";
const LEAGUE_ID = "farm-page";
const TEAM_IDS = ["team-a", "team-b"] as const;

const SCOUTS_BY_TEAM_ID: Record<string, ProspectScoutDescriptor> = {
  "team-a": {
    scoutId: `${LEAGUE_ID}-team-a-scout`,
    scoutName: "TEAM-A Scout",
    specialties: ["outfield"],
    weaknesses: ["CP"],
  },
  "team-b": {
    scoutId: `${LEAGUE_ID}-team-b-scout`,
    scoutName: "TEAM-B Scout",
    specialties: ["pitching"],
    weaknesses: ["1B"],
  },
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function makeLeague(): LeagueTemplate {
  return {
    id: LEAGUE_ID,
    name: "Farm Page League",
    teamIds: [...TEAM_IDS],
    conferences: [],
    divisions: [],
    defaultRulesPreset: "rules",
    tier: "standard",
    balanceMode: "taxed",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function makeTeam(id: string): Team {
  return {
    id,
    name: id === "team-a" ? "Caps" : "Keys",
    abbreviation: id.toUpperCase(),
    location: "Farm",
    nickname: id,
    colors: { primary: "#000000", secondary: "#ffffff" },
    stadium: "Farm Park",
    controlledBy: "human",
    leagueIds: [LEAGUE_ID],
    farmArchetypeKey: id === "team-a" ? "web-gems" : "bomba-squad",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function emptyRoster(teamId: string): TeamRoster {
  return {
    teamId,
    mlbRoster: [],
    farmRoster: [],
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
    longRelievers: [],
    closingPitcher: "",
    setupPitchers: [],
    depthChart: {
      C: [],
      "1B": [],
      "2B": [],
      SS: [],
      "3B": [],
      LF: [],
      CF: [],
      RF: [],
      DH: [],
      SP: [],
      RP: [],
      CP: [],
    },
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: "2026-01-01",
  };
}

function teamDisplayName(team: Team): string {
  return `${team.location} ${team.name}`;
}

function mockLeagueData() {
  const teams = TEAM_IDS.map((teamId) => makeTeam(teamId));
  const leagueData = {
    leagues: [makeLeague()],
    teams,
    players: [],
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRoster: vi.fn(async (teamId: string) => emptyRoster(teamId)),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;

  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return { leagueData, teams };
}

function seedWithFirst(teamIds: readonly string[], firstTeamId: string): string {
  const seed = Array.from({ length: 1_000 }, (_, index) => `farm-page-seed-${index}`).find(
    (candidate) => {
      const sessionSeed = deriveAuctionSessionNominationSeed({
        sessionId: createFarmAuctionSessionId(LEAGUE_ID, 1),
        launchNonce: TEST_SESSION_LAUNCH_NONCE,
        baseSeed: candidate,
      });
      return seededNominationOrder(teamIds, sessionSeed)[0] === firstTeamId;
    },
  );
  if (!seed) throw new Error(`No seed found for first team ${firstTeamId}`);
  return seed;
}

async function seedScoutProfiles(): Promise<void> {
  await Promise.all(
    TEAM_IDS.map((teamId) => saveScoutProfile({
      id: `${LEAGUE_ID}-${teamId}-scout`,
      leagueId: LEAGUE_ID,
      teamId,
      name: `${teamId.toUpperCase()} Scout`,
      specialties: SCOUTS_BY_TEAM_ID[teamId].specialties ?? [],
      weaknesses: SCOUTS_BY_TEAM_ID[teamId].weaknesses ?? [],
      accuracyByPosition: { CF: 82, SP: 78, CP: 58, "1B": 65 },
      seed: `${LEAGUE_ID}:${teamId}:scout`,
      createdDate: "2026-01-01",
      lastModified: "2026-01-01",
    })),
  );
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

function prospectDisplayName(prospect: LeagueBuilderProspectPlayerDto): string {
  return `${prospect.firstName} ${prospect.lastName}`.trim();
}

function prospectPositions(prospect: LeagueBuilderProspectPlayerDto): string[] {
  return Array.from(new Set([prospect.primaryPosition, prospect.secondaryPosition].filter(Boolean) as string[]));
}

function formatScoutRange(range: { displayedEstimate: number; low: number; high: number }): string {
  return `${formatMoney(range.displayedEstimate)} estimate [${formatMoney(range.low)}-${formatMoney(range.high)}]`;
}

function openEngineLot(session: ReturnType<typeof buildFarmAuctionSession>["session"]) {
  const result = surfaceNextPlayer(session);
  if (!result.ok || !result.session.currentLot) {
    throw new Error("Expected farm auction engine to surface an open lot.");
  }
  return result.session;
}

describe("LeagueBuilderFarmAuctionDraft", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(TEST_SESSION_LAUNCH_NONCE);
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
    await seedScoutProfiles();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("renders the obscured farm auction flow with positions and scout ranges only", async () => {
    const { leagueData, teams } = mockLeagueData();
    await deleteScoutProfilesForLeague(LEAGUE_ID);
    teams[0].farmCapIdentity = {
      increase: ["Defense First"],
      decrease: [],
    };
    const seed = seedWithFirst(TEAM_IDS, "team-a");
    const expected = buildFarmAuctionSession({
      leagueId: LEAGUE_ID,
      seasonNumber: 1,
      teams: teams.map((team) => ({
        teamId: team.id,
        teamName: teamDisplayName(team),
      })),
      scoutsByTeamId: SCOUTS_BY_TEAM_ID,
      seed,
      config: {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1000,
        turnTimerSeconds: null,
        excludeFromLeague: true,
        nominationWeightExponent: 3,
        flatReserveFloor: LEAGUE_MINIMUM_SALARY,
      },
      sessionId: createFarmAuctionSessionId(LEAGUE_ID, 1),
      sessionLaunchNonce: TEST_SESSION_LAUNCH_NONCE,
    });
    const surfaced = openEngineLot(expected.session);
    const surfacedLot = surfaced.currentLot!;
    const prospectById = new Map(expected.pool.prospects.map((prospect) => [prospect.id, prospect]));
    const baseCandidates = expected.session.availablePlayerIds
      .map((playerId) => expected.session.players[playerId])
      .map((candidate) => {
        const prospect = prospectById.get(candidate.playerId)!;
        return { candidate, prospect };
      });
    const mlbPlayers = [
      { id: "mlb-c", firstName: "Mlb", lastName: "Catcher", primaryPosition: "C" },
      { id: "mlb-1b", firstName: "Mlb", lastName: "First", primaryPosition: "1B" },
      { id: "mlb-2b", firstName: "Mlb", lastName: "Second", primaryPosition: "2B" },
      { id: "mlb-3b", firstName: "Mlb", lastName: "Third", primaryPosition: "3B" },
      { id: "mlb-lf", firstName: "Mlb", lastName: "Left", primaryPosition: "LF" },
    ];
    const mlbRosterPlayerIds = mlbPlayers.map((player) => player.id);
    leagueData.players = mlbPlayers.map((player) => ({
      ...player,
      chemistry: baseCandidates[0].prospect.chemistry,
    })) as unknown as UseLeagueBuilderDataReturn["players"];
    leagueData.getRoster = vi.fn(async (teamId: string) => ({
      ...emptyRoster(teamId),
      mlbRoster: teamId === "team-a" ? mlbRosterPlayerIds : [],
    }));
    const target = baseCandidates.find((candidate) => candidate.candidate.playerId === surfacedLot.playerId);
    if (!target) throw new Error("Expected the engine-surfaced farm lot in the candidate list.");
    const targetTeamId = surfacedLot.bidTurnTeamId ?? "team-a";
    const targetFarmArchetypeKey = teams.find((team) => team.id === targetTeamId)?.farmArchetypeKey;
    const targetSessionSeed = deriveAuctionSessionNominationSeed({
      sessionId: createFarmAuctionSessionId(LEAGUE_ID, 1),
      launchNonce: TEST_SESSION_LAUNCH_NONCE,
      baseSeed: seed,
    });
    const targetBand = scoutOverallGradeBand(
      target.prospect.prospectProfile.trueGrade,
      scoutOverallTierForPosition(target.prospect.primaryPosition as DraftPosition, targetFarmArchetypeKey),
      `${targetSessionSeed}:grade-band:${target.prospect.id}:${targetTeamId}`,
    );
    const targetOverallBand = scoutOverallBandForPosition(target.prospect.primaryPosition as DraftPosition, targetFarmArchetypeKey);
    const targetRange = archetypeBandValueRange(
      surfacedLot.openingAsk,
      targetOverallBand,
      `${targetSessionSeed}:value-band:${target.prospect.id}:${targetTeamId}`,
    );
    const targetToolBands = scoutToolBands({
      ratings: {
        power: target.prospect.power,
        contact: target.prospect.contact,
        speed: target.prospect.speed,
        fielding: target.prospect.fielding,
        arm: target.prospect.arm,
        velocity: target.prospect.velocity,
        junk: target.prospect.junk,
        accuracy: target.prospect.accuracy,
      },
      position: target.prospect.primaryPosition as DraftPosition,
      farmArchetypeKey: targetFarmArchetypeKey,
      seed: `${targetSessionSeed}:tool-bands:${target.prospect.id}:${targetTeamId}`,
    });
    const targetName = prospectDisplayName(target.prospect);
    const targetRangeText = formatScoutRange(targetRange);
    const targetGradeText = `Scout grade ${target.prospect.prospectProfile.scoutedGrade} (${gradeToTwentyEighty(target.prospect.prospectProfile.scoutedGrade)})`;
    const targetAgeText = `Age ${target.prospect.age}`;
    const targetRangeMidpoint = (targetRange.low + targetRange.high) / 2;
    const expectedOpeningPrice = formatMoney(surfacedLot.openingAsk);
    const expectedBidAmount = Math.ceil(surfacedLot.openingAsk);
    const expectedSalePrice = formatMoney(expectedBidAmount);

    render(<LeagueBuilderFarmAuctionDraft />);

    expect(screen.getByText("FARM AUCTION - scouted values")).toBeInTheDocument();
    expect(screen.getByText("STATE: SETUP")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("SEED"), { target: { value: seed } });
    fireEvent.click(await screen.findByRole("button", { name: /BEGIN FARM AUCTION/i }));

    await waitFor(() => {
      expect(screen.getByText("STATE: OPEN_BIDDING")).toBeInTheDocument();
    });

    expect(screen.getByText("UP NOW")).toBeInTheDocument();
    expect(screen.queryByLabelText("Position filter")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SCOUT SORT/i })).not.toBeInTheDocument();
    expect(screen.getByText(targetName)).toBeInTheDocument();
    for (const position of prospectPositions(target.prospect)) {
      expect(screen.getAllByText(position).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(targetAgeText)).toBeInTheDocument();
    expect(screen.queryByText("Press and hold Scout report to reveal your scout's private range and grade.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show farm auction help" }));
    expect(screen.getByText("Press and hold Scout report to reveal your scout's private range and grade.")).toBeInTheDocument();
    const scoutReportControl = screen.getByRole("button", { name: "Scout report" });
    expect(scoutReportControl).toBeInTheDocument();
    expect(screen.queryByText(`Scout value ${targetRangeText}`)).not.toBeInTheDocument();
    expect(screen.queryByText(targetGradeText)).not.toBeInTheDocument();
    expect(screen.getByText(`Opening ${expectedOpeningPrice}`)).toBeInTheDocument();
    fireEvent.pointerDown(scoutReportControl);
    expect(screen.getByText(`Scout value ${targetRangeText}`)).toBeInTheDocument();
    expect(screen.getByText(targetGradeText)).toBeInTheDocument();
    expect(screen.getByText(`Grade band ${targetBand.best}-${targetBand.worst}`)).toBeInTheDocument();
    expect(screen.getByText(`Confidence band ${targetOverallBand}`)).toBeInTheDocument();
    for (const [tool, band] of Object.entries(targetToolBands)) {
      expect(screen.getByText(`${tool.toUpperCase()} ${band.lower}-${band.upper}`)).toBeInTheDocument();
    }
    fireEvent.pointerUp(scoutReportControl);
    expect(screen.queryByText(`Scout value ${targetRangeText}`)).not.toBeInTheDocument();
    expect(screen.queryByText(targetGradeText)).not.toBeInTheDocument();
    expect(targetRange.low).not.toBe(targetRange.high);
    expect(targetRange.low).toBeLessThanOrEqual(surfacedLot.openingAsk);
    expect(targetRange.high).toBeGreaterThanOrEqual(surfacedLot.openingAsk);
    expect(targetRangeMidpoint).toBeCloseTo(surfacedLot.openingAsk, 10);
    expect(targetRange.displayedEstimate).toBeGreaterThan(targetRange.low);
    expect(targetRange.displayedEstimate).toBeLessThan(targetRange.high);
    expect(screen.queryByText(/True grade|Ratings/i)).not.toBeInTheDocument();
    expect(screen.getByText("YOUR REMAINING BUDGET")).toBeInTheDocument();
    expect(screen.getByText("YOUR MAX BID")).toBeInTheDocument();
    expect(screen.getByText("ROSTER SLOTS REMAINING")).toBeInTheDocument();
    expect(screen.getByText("PRIORITY GAPS")).toBeInTheDocument();
    expect(screen.getByText(/SS coverage below target/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText("Custom bid amount")).toHaveValue(expectedBidAmount);
    });

    fireEvent.click(screen.getByRole("button", { name: /RAISE CUSTOM/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Custom bid amount")).toHaveValue(
        expectedBidAmount + 1000,
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "PASS" }));

    await waitFor(() => {
      expect(screen.getByText("STATE: SOLD")).toBeInTheDocument();
    });

    expect(
      screen.getAllByText(`${targetName} SOLD to Farm Caps for ${expectedSalePrice}`).length,
    ).toBeGreaterThan(0);
  });
});
