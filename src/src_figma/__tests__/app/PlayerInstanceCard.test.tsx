import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { CanonicalPlayerInstance } from "../../../utils/almanacStorage";
import type {
  LeaguePlayerOverrideRecord,
  Player,
} from "../../../utils/leagueBuilderStorage";

const {
  mockUseParams,
  mockGetCanonicalPlayer,
  mockFindCanonicalByPlayerId,
  mockGetPlayerDisplayStats,
  mockGetPlayer,
  mockGetLeaguePlayerOverride,
  mockGetEffectivePlayer,
  mockGetPlayerInstanceContext,
  mockGetPlayerInstanceWpaSummary,
} = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockGetCanonicalPlayer: vi.fn(),
  mockFindCanonicalByPlayerId: vi.fn(),
  mockGetPlayerDisplayStats: vi.fn(),
  mockGetPlayer: vi.fn(),
  mockGetLeaguePlayerOverride: vi.fn(),
  mockGetEffectivePlayer: vi.fn(),
  mockGetPlayerInstanceContext: vi.fn(),
  mockGetPlayerInstanceWpaSummary: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );

  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

vi.mock("../../../utils/almanacStorage", () => ({
  getCanonicalPlayer: mockGetCanonicalPlayer,
  findCanonicalByPlayerId: mockFindCanonicalByPlayerId,
}));

vi.mock("../../../utils/almanacQueries", () => ({
  getPlayerInstanceStats: vi.fn(),
  getPlayerEliminationAllTimeStats: vi.fn(),
  getPlayerInstanceWpaSummary: mockGetPlayerInstanceWpaSummary,
}));

vi.mock("../../../utils/leagueBuilderStorage", () => ({
  getPlayer: mockGetPlayer,
  getLeaguePlayerOverride: mockGetLeaguePlayerOverride,
}));

vi.mock("../../../utils/playerOverrides", () => ({
  getEffectivePlayer: mockGetEffectivePlayer,
}));

vi.mock("../../app/utils/almanacPlayerViews", async () => {
  const actual = await vi.importActual<
    typeof import("../../app/utils/almanacPlayerViews")
  >("../../app/utils/almanacPlayerViews");

  return {
    ...actual,
    getPlayerDisplayStats: mockGetPlayerDisplayStats,
    getPlayerInstanceContext: mockGetPlayerInstanceContext,
  };
});

import {
  getPlayerInstanceCardFameTier,
  PlayerInstanceCard,
} from "../../app/pages/PlayerInstanceCard";

function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-1",
    firstName: "Skylar",
    lastName: "Vega",
    baseFameTier: 4,
    gender: "F",
    age: 26,
    bats: "R",
    throws: "R",
    primaryPosition: "SS",
    power: 63,
    contact: 71,
    speed: 68,
    fielding: 70,
    arm: 69,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: "B+",
    personality: "Competitive",
    chemistry: "Competitive",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 1200000,
    createdDate: "2026-04-14T00:00:00.000Z",
    lastModified: "2026-04-14T00:00:00.000Z",
    isCustom: true,
    hometown: {
      city: "Denver",
      state: "CO",
    },
    ...overrides,
  };
}

function createInstance(
  mode: CanonicalPlayerInstance["mode"],
): CanonicalPlayerInstance {
  return {
    mode,
    instanceId: "league-1",
    instanceName: "Spring Exhibition",
    playerIdInInstance: "player-1",
  };
}

function createOverride(
  fameTierOverride?: LeaguePlayerOverrideRecord["fameTierOverride"],
): LeaguePlayerOverrideRecord {
  return {
    id: "league-1::player-1",
    leagueId: "league-1",
    playerId: "player-1",
    overrides: {},
    fameTierOverride,
    lastModified: "2026-04-14T00:00:00.000Z",
  };
}

describe("PlayerInstanceCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const player = createPlayer();
    const exhibitionInstance = createInstance("exhibition");

    mockUseParams.mockReturnValue({
      canonicalId: "canonical-1",
      instanceId: "league-1",
    });
    mockGetCanonicalPlayer.mockResolvedValue({
      canonicalId: "canonical-1",
      playerName: "Skylar Vega",
      hometown: {
        city: "Denver",
        state: "CO",
      },
      instances: [exhibitionInstance],
    });
    mockFindCanonicalByPlayerId.mockResolvedValue(null);
    mockGetPlayer.mockResolvedValue(player);
    mockGetLeaguePlayerOverride.mockResolvedValue(createOverride(5));
    mockGetPlayerDisplayStats.mockResolvedValue({
      instanceBatting: null,
      instancePitching: null,
      allTimeEliminationBatting: null,
      allTimeEliminationPitching: null,
    });
    mockGetPlayerInstanceContext.mockResolvedValue({
      mode: "exhibition",
      games: [],
      latestGame: null,
      latestSnapshot: null,
      playerIds: ["player-1"],
      teamNames: new Map(),
    });
    mockGetPlayerInstanceWpaSummary.mockResolvedValue(null);
    mockGetEffectivePlayer.mockResolvedValue(player);
  });

  test("renders the fame tier row in the header using the exhibition base tier", async () => {
    render(
      <MemoryRouter>
        <PlayerInstanceCard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("SKYLAR VEGA")).toBeInTheDocument();
    expect(
      screen.getByTestId("player-instance-card-fame-tier-row"),
    ).toBeInTheDocument();
    expect(screen.getByText("CAPTAIN")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Fame tier Captain (4/5)"),
    ).toBeInTheDocument();
    expect(screen.queryByText("SUPERSTAR")).not.toBeInTheDocument();
    expect(screen.getByTestId("player-instance-wpa-unavailable")).toHaveTextContent(
      "WPA unavailable for score-only/manual-result games",
    );
  });

  test("renders archived WPA totals for the selected player instance", async () => {
    mockGetPlayerInstanceWpaSummary.mockResolvedValue({
      gamesWithWpa: 2,
      gamesWithoutWpa: 1,
      latestGameId: "game-franchise-2",
      latestGameDate: Date.UTC(2026, 4, 12),
      totalWpa: 0.184,
      battingWpa: 0.12,
      pitchingWpa: 0.04,
      catchingWpa: 0,
      fieldingWpa: 0.014,
      baserunningWpa: 0.01,
      managingWpa: 0,
    });

    render(
      <MemoryRouter>
        <PlayerInstanceCard />
      </MemoryRouter>,
    );

    expect(await screen.findByText("SKYLAR VEGA")).toBeInTheDocument();
    const wpaSummary = screen.getByTestId("player-instance-wpa-summary");
    expect(wpaSummary).toHaveTextContent("Archived KBL WPA");
    expect(wpaSummary).toHaveTextContent("+18.4 pp");
    expect(wpaSummary).toHaveTextContent("2 scored games | 1 without WPA");
    expect(wpaSummary).toHaveTextContent("BAT");
    expect(wpaSummary).toHaveTextContent("+12.0 pp");
  });

  test("uses the instance override only for elimination context", () => {
    const player = createPlayer({ baseFameTier: 4 });
    const override = createOverride(5);

    expect(
      getPlayerInstanceCardFameTier(player, createInstance("exhibition"), override),
    ).toBe(4);
    expect(
      getPlayerInstanceCardFameTier(player, createInstance("elimination"), override),
    ).toBe(5);
  });
});
