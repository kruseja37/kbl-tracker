import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { buildSnakeOrder } from "../../../engines/leagueConstruction";
import { LUXURY_CAP_TABLES } from "../../../data/tierParams";
import { LeagueBuilderSnakeDraft } from "../../app/pages/LeagueBuilderSnakeDraft";
import {
  useLeagueBuilderData,
  type LeagueBuilderMlbDraftSession,
  type LeagueTemplate,
  type Player,
  type RegisteredPool,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: "?leagueId=snake-league" }),
}));

vi.mock("../../hooks/useLeagueBuilderData", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/useLeagueBuilderData")>("../../hooks/useLeagueBuilderData");
  return { ...actual, useLeagueBuilderData: vi.fn() };
});

function makeLeague(): LeagueTemplate {
  return {
    id: "snake-league",
    name: "Snake Test League",
    teamIds: ["team-a", "team-b"],
    conferences: [],
    divisions: [],
    defaultRulesPreset: "standard",
    tier: "standard",
    salaryCap: 1_000_000,
    balanceMode: "taxed",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function makeTeam(id: string): Team {
  return {
    id,
    name: id === "team-a" ? "Captains" : "Robots",
    abbreviation: id === "team-a" ? "CAP" : "ROB",
    location: "Page",
    nickname: id,
    colors: { primary: "#334433", secondary: "#eeeeee" },
    stadium: "Test Park",
    // Keep both manual in this page test so the CPU timer cannot race the human-pick assertion.
    controlledBy: "human",
    leagueIds: ["snake-league"],
    mlbArchetypeKey: "balanced",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function makePlayer(
  id: string,
  primaryPosition: Player["primaryPosition"],
  secondaryPosition?: Player["secondaryPosition"],
): Player {
  return {
    id,
    firstName: "Player",
    lastName: id,
    gender: "M",
    age: 25,
    bats: "R",
    throws: "R",
    primaryPosition,
    ...(secondaryPosition ? { secondaryPosition } : {}),
    power: 55,
    contact: 55,
    speed: 55,
    fielding: 55,
    arm: 55,
    velocity: 55,
    junk: 55,
    accuracy: 55,
    arsenal: ["4F"],
    overallGrade: "B-",
    personality: "Competitive",
    chemistry: "Crafty",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 1_000,
    leagueAssignments: [{ leagueId: "snake-league", teamId: "team-a", rosterStatus: "FREE_AGENT" }],
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    isCustom: true,
  };
}

function makePlayers(): Player[] {
  const players: Player[] = [];
  const field = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"] as const;
  for (let copy = 0; copy < 2; copy += 1) {
    for (const position of field) players.push(makePlayer(`${position}-${copy}`, position));
  }
  for (let index = 0; index < 18; index += 1) {
    players.push(makePlayer(`bench-${index}`, "CF", index < 2 ? "C" : undefined));
  }
  for (let index = 0; index < 8; index += 1) players.push(makePlayer(`SP-${index}`, "SP"));
  for (let index = 0; index < 6; index += 1) players.push(makePlayer(`RP-${index}`, "RP"));
  for (let index = 0; index < 2; index += 1) players.push(makePlayer(`CP-${index}`, "CP"));
  expect(players).toHaveLength(50);
  return players;
}

function makePool(players: Player[]): RegisteredPool {
  return {
    leagueId: "snake-league",
    tier: "standard",
    balanceMode: "taxed",
    players: players.map((player, index) => ({ id: player.id, iv: 10_000 + index * 100, salary: 999_999 })),
    tierCap: 1_000_000,
    luxuryCaps: [],
    pickValueChart: players.map((_, index) => ({ pick: index + 1, value: 50_000 - index * 500 })),
    totalSlots: 44,
    poolSurplusWarning: false,
    locked: true,
    lockedAt: 1,
  };
}

function makeSession(players: Player[]): LeagueBuilderMlbDraftSession {
  const pickOrder = buildSnakeOrder(["team-a", "team-b"], 22);
  return {
    id: "mlb-draft:snake-league:1",
    leagueId: "snake-league",
    seasonNumber: 1,
    seed: "page-seed",
    workflowVersion: "snake-draft-poc-v1",
    engineMethodVersion: "snakeDraftPoc.v1",
    tier: "standard",
    balanceMode: "taxed",
    rounds: 22,
    pickOrder,
    completedPicks: [
      { ...pickOrder[0], playerId: players[0].id, settledSalary: 10_000, marginalTax: 0 },
      { ...pickOrder[1], playerId: players[34].id, settledSalary: 13_400, marginalTax: 0 },
      { ...pickOrder[2], playerId: players[48].id, settledSalary: 14_800, marginalTax: 0 },
      { ...pickOrder[3], playerId: players[1].id, settledSalary: 10_100, marginalTax: 0 },
    ],
    trades: [],
    currentPickIndex: 4,
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
  };
}

function setupPageMocks(overrides: {
  players?: Player[];
  pool?: RegisteredPool;
  savedSession?: LeagueBuilderMlbDraftSession;
} = {}) {
  const players = overrides.players ?? makePlayers();
  const pool = overrides.pool ?? makePool(players);
  const savedSession = overrides.savedSession ?? makeSession(players);
  const saveMlbDraftSession = vi.fn(async (input: LeagueBuilderMlbDraftSession) => ({
    ...input,
    createdDate: input.createdDate ?? savedSession.createdDate,
    lastModified: "2026-01-02T00:00:00.000Z",
  }));
  const value = {
    leagues: [makeLeague()],
    teams: [makeTeam("team-a"), makeTeam("team-b")],
    players,
    isLoading: false,
    error: null,
    getRegisteredPool: vi.fn(async () => pool),
    registerLeaguePool: vi.fn(async () => pool),
    getMlbDraftSession: vi.fn(async () => savedSession),
    saveMlbDraftSession,
  } as unknown as UseLeagueBuilderDataReturn;
  vi.mocked(useLeagueBuilderData).mockReturnValue(value);
  return { value, saveMlbDraftSession, savedSession };
}

describe("LeagueBuilderSnakeDraft POC page", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    vi.mocked(useLeagueBuilderData).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders and resumes a persisted mid-draft session", async () => {
    const { value } = setupPageMocks();
    render(<LeagueBuilderSnakeDraft />);

    expect(await screen.findByText(/ON THE CLOCK · PAGE CAPTAINS/i)).toBeInTheDocument();
    expect(screen.getByText(/PICK 5 · ROUND 3/i)).toBeInTheDocument();
    expect(screen.getByText("CAP LEDGER")).toBeInTheDocument();
    expect(value.getMlbDraftSession).toHaveBeenCalledWith("snake-league", 1);
  });

  test("SNAKEFIX repro: cap-ledger labels and values cannot collide in narrow team cards", async () => {
    setupPageMocks();
    render(<LeagueBuilderSnakeDraft />);

    await screen.findByText("CAP LEDGER");
    for (const label of screen.getAllByText("TAX SO FAR")) {
      expect(label).toHaveClass("whitespace-nowrap");
    }
  });

  test("SNAKEFIX: the visible two-team board uses the auction-equivalent normalized tax", async () => {
    const players = makePlayers();
    const fenomeno: Player = {
      ...makePlayer("fenomeno", "SP/RP"),
      lastName: "Fenomeno",
      power: 77,
      contact: 79,
      speed: 23,
      fielding: 78,
      velocity: 54,
      junk: 76,
      accuracy: 67,
      trait1: "Elite 4F",
      trait2: "Two Way (IF)",
    };
    players.push(fenomeno);
    const unpricedPool = makePool(players);
    const pool: RegisteredPool = {
      ...unpricedPool,
      luxuryCaps: LUXURY_CAP_TABLES.standard,
      players: unpricedPool.players.map((row) => row.id === fenomeno.id
        ? { ...row, iv: 124_165 }
        : row),
    };
    setupPageMocks({ players, pool });
    render(<LeagueBuilderSnakeDraft />);

    await screen.findByText(/COMPLETE-INFORMATION BOARD/i);
    fireEvent.change(screen.getByRole("combobox", { name: "SORT" }), { target: { value: "IV" } });
    const draftButton = await screen.findByRole("button", { name: "DRAFT FENOMENO" });
    const card = draftButton.closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).getAllByText("$124,165")).toHaveLength(2);
  });

  test("a human pick stamps IV in the persisted session without a roster or franchise write", async () => {
    const { saveMlbDraftSession, savedSession } = setupPageMocks();
    render(<LeagueBuilderSnakeDraft />);

    await screen.findByText(/COMPLETE-INFORMATION BOARD/i);
    const draftButtons = screen.getAllByRole("button", { name: /^DRAFT /i }).filter((button) => !button.hasAttribute("disabled"));
    expect(draftButtons.length).toBeGreaterThan(0);
    fireEvent.click(draftButtons[0]);

    await waitFor(() => expect(saveMlbDraftSession).toHaveBeenCalledTimes(1));
    const saved = saveMlbDraftSession.mock.calls[0][0];
    expect(saved.currentPickIndex).toBe(savedSession.currentPickIndex + 1);
    expect(saved.completedPicks).toHaveLength(savedSession.completedPicks.length + 1);
    expect(saved.completedPicks.at(-1)?.settledSalary).toBeGreaterThan(0);
  });

  test("paginates the complete board without rendering the full pool at once", async () => {
    setupPageMocks();
    render(<LeagueBuilderSnakeDraft />);

    const board = await screen.findByTestId("snake-board-page");
    expect(screen.getByText("PAGE 1 OF 2")).toBeInTheDocument();
    expect(within(board).getAllByRole("article")).toHaveLength(36);

    fireEvent.click(screen.getByRole("button", { name: "Next board page" }));
    expect(screen.getByText("PAGE 2 OF 2")).toBeInTheDocument();
    expect(within(board).getAllByRole("article")).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Next board page" })).toBeDisabled();
  });
});
