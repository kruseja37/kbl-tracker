import "fake-indexeddb/auto";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { reservePriceCurve } from "../../../data/rosterEngineConstants";
import { gradeToTwentyEighty, scoutPriceOpinion } from "../../../engines/scoutPriceOpinion";
import { perceivedValueRange } from "../../../engines/scoutValueRange";
import { seededNominationOrder } from "../../../engines/auctionStateMachine";
import { buildFarmAuctionSession } from "../../../utils/farmAuctionSession";
import {
  __resetLeagueBuilderDatabaseForTests,
  saveScoutProfile,
} from "../../../utils/leagueBuilderStorage";
import {
  scoutAccuracy,
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
    (candidate) => seededNominationOrder(teamIds, candidate)[0] === firstTeamId,
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("LeagueBuilderFarmAuctionDraft", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
    await seedScoutProfiles();
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("renders the obscured farm auction flow with positions and scout ranges only", async () => {
    const { teams } = mockLeagueData();
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
      },
    });
    const prospectById = new Map(expected.pool.prospects.map((prospect) => [prospect.id, prospect]));
    const sortedCandidates = expected.session.availablePlayerIds
      .map((playerId) => expected.session.players[playerId])
      .map((candidate) => {
        const prospect = prospectById.get(candidate.playerId)!;
        const accuracy = scoutAccuracy(prospect.primaryPosition, SCOUTS_BY_TEAM_ID["team-a"]);
        const priceOpinion = scoutPriceOpinion({
          trueIV: candidate.iv,
          scoutAccuracy: accuracy,
          scoutId: SCOUTS_BY_TEAM_ID["team-a"].scoutId,
          candidateId: candidate.playerId,
          seed: `${seed}:team-a`,
        });
        const range = perceivedValueRange(priceOpinion, accuracy, `${seed}:team-a:${candidate.playerId}`);
        return { candidate, prospect, range, priceOpinion };
      })
      .sort((left, right) =>
        right.range.displayedEstimate - left.range.displayedEstimate ||
        prospectDisplayName(left.prospect).localeCompare(prospectDisplayName(right.prospect)),
      );
    const target = sortedCandidates[0];
    const targetName = prospectDisplayName(target.prospect);
    const targetRangeText = formatScoutRange(target.range);
    const targetGradeText = `Scout grade ${target.prospect.prospectProfile.scoutedGrade} (${gradeToTwentyEighty(target.prospect.prospectProfile.scoutedGrade)})`;
    const targetRangeMidpoint = (target.range.low + target.range.high) / 2;
    const expectedSalePrice = formatMoney(Math.ceil(reservePriceCurve(target.candidate.ivPercentile) * target.candidate.iv));

    render(<LeagueBuilderFarmAuctionDraft />);

    expect(screen.getByText("FARM AUCTION - scouted values")).toBeInTheDocument();
    expect(screen.getByText("STATE: SETUP")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("SEED"), { target: { value: seed } });
    fireEvent.click(await screen.findByRole("button", { name: /BEGIN FARM AUCTION/i }));

    await waitFor(() => {
      expect(screen.getByText("STATE: NOMINATION")).toBeInTheDocument();
    });

    const targetButton = screen.getByRole("button", { name: new RegExp(escapeRegExp(targetName)) });
    expect(targetButton).toHaveTextContent(targetName);
    for (const position of prospectPositions(target.prospect)) {
      expect(within(targetButton).getByText(position)).toBeInTheDocument();
    }
    expect(targetButton).toHaveTextContent(targetGradeText);
    expect(targetButton).toHaveTextContent(`Scout value ${targetRangeText}`);
    expect(target.range.low).not.toBe(target.range.high);
    expect(targetRangeMidpoint).toBeCloseTo(target.priceOpinion, 10);
    expect(targetRangeMidpoint).not.toBe(target.candidate.iv);
    expect(targetButton).not.toHaveTextContent(formatMoney(target.candidate.iv));
    expect(targetButton).not.toHaveTextContent(/\b(POW|CON|SPD|FLD|ARM|VEL|JNK|ACC)\b/);
    expect(targetButton).not.toHaveTextContent(/Overall|True grade|Ratings/i);

    fireEvent.click(targetButton);

    await waitFor(() => {
      expect(screen.getByText("STATE: OPEN_BIDDING")).toBeInTheDocument();
    });

    expect(screen.getByText(targetName)).toBeInTheDocument();
    expect(screen.getByText(`Scout value ${targetRangeText}`)).toBeInTheDocument();
    expect(screen.getByText(targetGradeText)).toBeInTheDocument();
    expect(screen.queryByText(formatMoney(target.candidate.iv))).not.toBeInTheDocument();
    expect(screen.getByText("YOUR REMAINING BUDGET")).toBeInTheDocument();
    expect(screen.getByText("YOUR MAX BID")).toBeInTheDocument();
    expect(screen.getByText("ROSTER SLOTS REMAINING")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText("Custom bid amount")).toHaveValue(Number(expectedSalePrice.replace(/[$,]/g, "")));
    });

    fireEvent.click(screen.getByRole("button", { name: /RAISE CUSTOM/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Custom bid amount")).toHaveValue(
        Number(expectedSalePrice.replace(/[$,]/g, "")) + 1000,
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
