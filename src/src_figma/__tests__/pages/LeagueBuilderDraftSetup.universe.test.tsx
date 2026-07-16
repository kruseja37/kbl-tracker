import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  LeagueBuilderDraftSetup,
} from "../../app/pages/LeagueBuilderDraftSetup";
import { buildRosterDesignPool } from "../../app/components/leagueBuilder/RosterDesigner";
import { describeRosterLawGaps } from "../../../engines/auctionExitGate";
import { buildBest22Target } from "../../../engines/best22Target";
import { rankAllArchetypesForPool } from "../../../engines/draftabilityRanker";
import { extractPoolFromDemand } from "../../../engines/poolFromDemand";
import { evaluateRosterDesign } from "../../../engines/rosterDesignFeasibility";
import { buildDefaultDesignSlots } from "../../../engines/rosterDesignFeasibility";
import { teamRosterNeed, toRosterSlotPlayer, type RosterPositionMap } from "../../../engines/rosterNeed";
import { getAuctionSession, getMlbDraftSession, saveLeagueTemplate } from "../../../utils/leagueBuilderStorage";
import { addPlayersToLeaguePool } from "../../../utils/leagueBuilderPoolBuilder";
import { resetCompletedDraftArc } from "../../../utils/leagueBuilderAuctionPipeline";
import { leagueHasLinkedFranchise } from "../../../utils/franchiseManager";

vi.setConfig({ testTimeout: 15000 });

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useLocation: () => ({ search: window.location.search }),
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../engines/archetypeIdentity", async () => {
  const actual = await vi.importActual<typeof import("../../../engines/archetypeIdentity")>(
    "../../../engines/archetypeIdentity",
  );
  return {
    ...actual,
    selectTeamArchetype: vi.fn(async (team, mlbKey: string, farmKey?: string) => ({
      ...team,
      mlbArchetypeKey: mlbKey,
      farmArchetypeKey: farmKey ?? team.farmArchetypeKey,
    })),
  };
});

vi.mock("../../../engines/best22Target", async () => {
  const actual = await vi.importActual<typeof import("../../../engines/best22Target")>(
    "../../../engines/best22Target",
  );
  return {
    ...actual,
    buildBest22Target: vi.fn(actual.buildBest22Target),
  };
});

vi.mock("../../../engines/draftabilityRanker", async () => {
  const actual = await vi.importActual<typeof import("../../../engines/draftabilityRanker")>(
    "../../../engines/draftabilityRanker",
  );
  return {
    ...actual,
    rankAllArchetypesForPool: vi.fn(actual.rankAllArchetypesForPool),
  };
});

vi.mock("../../../engines/poolFromDemand", async () => {
  const actual = await vi.importActual<typeof import("../../../engines/poolFromDemand")>(
    "../../../engines/poolFromDemand",
  );
  return {
    ...actual,
    extractPoolFromDemand: vi.fn(actual.extractPoolFromDemand),
  };
});

vi.mock("../../../utils/leagueBuilderStorage", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/leagueBuilderStorage")>(
    "../../../utils/leagueBuilderStorage",
  );
  return {
    ...actual,
    getAuctionSession: vi.fn(async () => null),
    getMlbDraftSession: vi.fn(async () => null),
    saveLeagueTemplate: vi.fn(async (league) => league),
    saveTeam: vi.fn(async (team) => team),
  };
});

vi.mock("../../../utils/leagueBuilderAuctionPipeline", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/leagueBuilderAuctionPipeline")>(
    "../../../utils/leagueBuilderAuctionPipeline",
  );
  return {
    ...actual,
    resetCompletedDraftArc: vi.fn(async () => undefined),
  };
});

vi.mock("../../../utils/franchiseManager", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/franchiseManager")>(
    "../../../utils/franchiseManager",
  );
  return {
    ...actual,
    leagueHasLinkedFranchise: vi.fn(async () => false),
  };
});

vi.mock("../../../utils/leagueBuilderPoolBuilder", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/leagueBuilderPoolBuilder")>(
    "../../../utils/leagueBuilderPoolBuilder",
  );
  return {
    ...actual,
    addPlayersToLeaguePool: vi.fn(async () => undefined),
    removePlayersFromLeaguePool: vi.fn(async () => undefined),
    importRosteredPlayersToLeaguePool: vi.fn(async () => 0),
    lockLeaguePool: vi.fn(async () => undefined),
    unlockLeaguePool: vi.fn(async () => undefined),
  };
});

vi.mock("../../hooks/useLeagueBuilderData", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/useLeagueBuilderData")>(
    "../../hooks/useLeagueBuilderData",
  );
  return {
    ...actual,
    useLeagueBuilderData: vi.fn(),
  };
});

import {
  clickDraftSetupButton,
  makeBest22Target,
  makeLeague,
  makeLegalRosterPlayerSet,
  makeLegalRosterPlayers,
  makeLockedRosterDesign,
  makePlayer,
  makePlayers,
  makePool,
  makePositionDiversePlayers,
  makeTeam,
  mockLeagueData,
  waitForExtractPoolOptions,
} from "./LeagueBuilderDraftSetup.testUtils";

describe("LeagueBuilderDraftSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuctionSession).mockResolvedValue(null);
    vi.mocked(getMlbDraftSession).mockResolvedValue(null);
    vi.mocked(leagueHasLinkedFranchise).mockResolvedValue(false);
    vi.mocked(resetCompletedDraftArc).mockResolvedValue(undefined);
    vi.mocked(buildBest22Target).mockReturnValue(makeBest22Target());
    vi.mocked(rankAllArchetypesForPool).mockReturnValue([]);
    window.sessionStorage.clear();
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page");
    mockLeagueData();
  });

  afterEach(async () => {
    // BOARDFIX2: a defensive safety net -- one test in this file (Item C's debounce perf test)
    // uses vi.useFakeTimers() scoped to itself with a try/finally restore; this guarantees any
    // leaked fake-timer state can never bleed into the next test's own (real-timer) waitFor calls.
    vi.useRealTimers();
    cleanup();
    await act(async () => undefined);
    window.sessionStorage.clear();
  });

  // -----------------------------------------------------------------------------------------
  // UNIVERSE-FIX1 (2026-07-08) — automatic candidate-sourcing paths (archetype auto-fit target
  // picks, roster-design feasibility, archetype draftability ranking) must respect the checked
  // source leagues, exactly like the two extraction call sites already do.
  // -----------------------------------------------------------------------------------------

  test("SNAKE POOL GUIDE: eight clubs get 212/238/264/full-source controls and Competitive shapes at 1.35x", async () => {
    const teamIds = Array.from({ length: 8 }, (_, index) => `team-${index}`);
    const teams = teamIds.map((id, index) => makeTeam(id, {
      name: `Club ${index + 1}`,
      controlledBy: "ai",
      gmSeatId: undefined,
      gmSeatName: undefined,
    }));
    const players = makePositionDiversePlayers(300, 8, "snake-guide");
    mockLeagueData({
      league: makeLeague({
        teamIds,
        draftFormat: "snake",
        draftPoolMode: "pool-first",
        poolAssemblyMode: "shape-to-teams",
        poolSizeMultiplier: 1.35,
        salaryCap: 10_000_000,
      }),
      teams,
      players,
      pool: makePool({ locked: false, players: [], totalSlots: 176 }),
    });

    render(<LeagueBuilderDraftSetup />);

    const assembly = await screen.findByTestId("snake-pool-assembly");
    expect(within(assembly).getByRole("button", { name: /TIGHT.*212/i })).toBeInTheDocument();
    expect(within(assembly).getByRole("button", { name: /COMPETITIVE.*REC.*238/i })).toHaveAttribute("aria-pressed", "true");
    expect(within(assembly).getByRole("button", { name: /LOOSE.*264/i })).toBeInTheDocument();
    expect(within(assembly).getByRole("button", { name: /FULL SOURCES.*300/i })).toBeInTheDocument();

    await clickDraftSetupButton("BUILD COMPETITIVE POOL");
    const options = await waitForExtractPoolOptions((candidate) => candidate.poolSizeMultiplier === 1.35);
    expect(options.poolSizeMultiplier).toBe(1.35);
  }, 20_000);

  test("FULL SOURCES loads the exact selected source union instead of running the curve", async () => {
    const sourcePlayers = makePositionDiversePlayers(90, 2, "full-source").map((player) => ({
      ...player,
      leagueAssignments: [{ leagueId: "source-league", teamId: "", rosterStatus: "FREE_AGENT" as const }],
    }));
    const league = makeLeague({
      draftFormat: "snake",
      draftPoolMode: "pool-first",
      poolAssemblyMode: "full-sources",
      sourceLeagueIds: ["source-league"],
      includeUnassignedSourcePlayers: false,
      salaryCap: 10_000_000,
    });
    const sourceLeague = makeLeague({
      id: "source-league",
      name: "Source League",
      teamIds: [],
      sourceLibrary: { kind: "historical-legends", profileType: "Draft Pool" },
    });
    mockLeagueData({
      league,
      leagues: [league, sourceLeague],
      players: sourcePlayers,
      pool: makePool({ locked: false, players: [], totalSlots: 44 }),
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(vi.mocked(addPlayersToLeaguePool)).toHaveBeenCalledWith(
        sourcePlayers.map((player) => player.id).sort((a, b) => a.localeCompare(b)),
        "league-page",
      );
    });
    expect(vi.mocked(extractPoolFromDemand)).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ poolSizeMultiplier: 1.35 }),
    );
  }, 20_000);

  test("FULL SOURCES advertises the post-override result count", async () => {
    const sourcePlayers = makePositionDiversePlayers(50, 2, "full-count").map((player) => ({
      ...player,
      leagueAssignments: [{ leagueId: "source-league", teamId: "", rosterStatus: "FREE_AGENT" as const }],
    }));
    const outside = makePlayer(999, {
      id: "outside-add",
      leagueAssignments: [{ leagueId: "other-league", teamId: "", rosterStatus: "FREE_AGENT" }],
    });
    const league = makeLeague({
      draftFormat: "snake",
      draftPoolMode: "pool-first",
      poolAssemblyMode: "full-sources",
      sourceLeagueIds: ["source-league"],
      snakeIncludeUnassignedSourcePlayers: false,
      poolFirstHandAdds: [outside.id],
      poolFirstHandRemoves: [sourcePlayers[0].id, sourcePlayers[1].id],
      salaryCap: 10_000_000,
    });
    mockLeagueData({
      league,
      leagues: [
        league,
        makeLeague({ id: "source-league", name: "Source", teamIds: [] }),
        makeLeague({ id: "other-league", name: "Other", teamIds: [] }),
      ],
      players: [...sourcePlayers, outside],
      pool: makePool({ locked: false, players: [], totalSlots: 44 }),
    });

    render(<LeagueBuilderDraftSetup />);

    const assembly = await screen.findByTestId("snake-pool-assembly");
    await waitFor(() => {
      expect(within(assembly).getByRole("button", { name: /FULL SOURCES.*49/i })).toBeInTheDocument();
    });
  }, 20_000);

  test("VERSION-LABELS: identical Legend names stay distinguishable by Draft, Career, and Peak profile", async () => {
    const versions = ([
      ["legend-draft", "Draft Pool", "legends-library-draft"],
      ["legend-career", "Career", "legends-library-career"],
      ["legend-peak", "Peak", "legends-library-peak"],
    ] as const).map(([id, historicalProfileType, leagueId], index) => makePlayer(index + 1, {
      id,
      firstName: "Eric",
      lastName: "Gagne",
      historicalProfileType,
      leagueAssignments: [{ leagueId, teamId: "", rosterStatus: "FREE_AGENT" }],
    }));
    mockLeagueData({
      league: makeLeague({
        sourceLeagueIds: [
          "legends-library-draft",
          "legends-library-career",
          "legends-library-peak",
        ],
        includeUnassignedSourcePlayers: false,
      }),
      players: versions,
      pool: makePool({ players: [], totalSlots: 0, locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByRole("button", { name: "Select Eric Gagne — DRAFT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Eric Gagne — CAREER" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Eric Gagne — PEAK" })).toBeInTheDocument();
  });

  test("UNIVERSE-FIX1: design-first identity-critical auto-fit target only draws candidates from the checked source-league universe", async () => {
    const outsideCloser = makePlayer(999, {
      id: "outside-cp",
      firstName: "Kay",
      lastName: "Frequin",
      primaryPosition: "CP",
      salary: 10_000,
      // Curated OUT: this player belongs only to a league that is not in sourceLeagueIds below.
      leagueAssignments: [{ leagueId: "other-league", teamId: "", rosterStatus: "FREE_AGENT" }],
    });
    const sourcePlayers = [
      ...makeLegalRosterPlayerSet("alpha", 10_000),
      ...makeLegalRosterPlayerSet("beta", 10_000),
      outsideCloser,
    ];
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b"],
        draftPoolMode: "design-first",
        sourceLeagueIds: ["league-page"],
        salaryCap: 1_000_000,
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      ],
      players: sourcePlayers,
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(vi.mocked(buildBest22Target).mock.calls.length).toBeGreaterThan(0);
    });

    const simPools = vi.mocked(buildBest22Target).mock.calls.map(
      (call) => call[1] as Array<{ id: string }>,
    );
    // At least one call actually saw a substantive candidate pool (proves the identity-critical
    // loop ran for real, not a vacuous pass because the effect never fired).
    expect(simPools.some((pool) => pool.some((player) => player.id.startsWith("alpha-") || player.id.startsWith("beta-")))).toBe(true);
    // No call's candidate pool includes the curated-out closer — the auto-fit never even had the
    // chance to recommend a player the checked source leagues didn't offer.
    for (const pool of simPools) {
      expect(pool.some((player) => player.id === "outside-cp")).toBe(false);
    }
  });

  test("UNIVERSE-FIX1: absent sourceLeagueIds stays unfiltered — identity-critical auto-fit sees the same candidates as pre-fix", async () => {
    const outsideCloser = makePlayer(999, {
      id: "outside-cp",
      firstName: "Kay",
      lastName: "Frequin",
      primaryPosition: "CP",
      salary: 10_000,
      leagueAssignments: [{ leagueId: "other-league", teamId: "", rosterStatus: "FREE_AGENT" }],
    });
    const sourcePlayers = [
      ...makeLegalRosterPlayerSet("alpha", 10_000),
      ...makeLegalRosterPlayerSet("beta", 10_000),
      outsideCloser,
    ];
    mockLeagueData({
      // No sourceLeagueIds field at all — the default, back-compat unfiltered case.
      league: makeLeague({
        teamIds: ["team-a", "team-b"],
        draftPoolMode: "design-first",
        salaryCap: 1_000_000,
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      ],
      players: sourcePlayers,
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(vi.mocked(buildBest22Target).mock.calls.length).toBeGreaterThan(0);
    });

    const simPools = vi.mocked(buildBest22Target).mock.calls.map(
      (call) => call[1] as Array<{ id: string }>,
    );
    // Unfiltered default: the "other-league" closer is exactly as visible to the auto-fit as it
    // was pre-feature — proves the fix didn't silently narrow the default (no-op) case.
    expect(simPools.some((pool) => pool.some((player) => player.id === "outside-cp"))).toBe(true);
  });

  test("design-first diagnostics name manual exclusions that block identity-critical target picks", async () => {
    const criticalReliever = makePlayer(1000, {
      id: "critical-rp",
      firstName: "LaTroy",
      lastName: "Hawkins",
      primaryPosition: "RP",
      salary: 10_000,
    });
    const sourcePlayers = [
      ...makeLegalRosterPlayerSet("alpha", 10_000),
      ...makeLegalRosterPlayerSet("beta", 10_000),
      criticalReliever,
    ];
    vi.mocked(buildBest22Target).mockReturnValue(makeBest22Target({
      picks: [{
        slotId: "RP1",
        playerId: "critical-rp",
        playerName: "LaTroy Hawkins",
        salary: 10_000,
        honorsAsk: true,
        pinned: false,
      }],
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b"],
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        modeAExtractedIds: sourcePlayers.filter((player) => player.id !== "critical-rp").map((player) => player.id),
        modeAHandRemoves: ["critical-rp"],
        salaryCap: 1_000_000,
      }),
      teams: [
        makeTeam("team-a", {
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
        makeTeam("team-b", {
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
      ],
      players: sourcePlayers.map((player) => player.id === "critical-rp"
        ? { ...player, leagueAssignments: [] }
        : player),
      pool: makePool({
        locked: false,
        players: sourcePlayers
          .filter((player) => player.id !== "critical-rp")
          .map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /^RE-EXTRACT$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Design targets 0\/1 included/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing design targets: LaTroy Hawkins: manual exclusion/i)).toBeInTheDocument();
    });
  });

  test("renders RE-CHECK with roster-law blocker wording", async () => {
    const shortPool = makeLegalRosterPlayers(10_000).filter((player) => player.id !== "legal-h-RF");
    const positions: RosterPositionMap = Object.fromEntries(shortPool.map((player) => [
      player.id,
      toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        traits: [player.trait1, player.trait2],
      }),
    ]));
    const attempt = evaluateRosterDesign(buildDefaultDesignSlots(), buildRosterDesignPool(shortPool), 1_000_000);
    const attemptIds = attempt.slots.map((slot) => slot.playerId).filter((id): id is string => Boolean(id));
    const need = teamRosterNeed(attemptIds, positions);
    if (!need) throw new Error("Expected roster need");
    const expectedLawLine = describeRosterLawGaps(attemptIds.length, need).join(" ");

    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a"],
        draftPoolMode: "pool-first",
      }),
      teams: [makeTeam("team-a")],
      players: shortPool,
      pool: makePool({ locked: false, players: shortPool.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })) }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/CAN EVERY CLUB BUILD A LEGAL 22 UNDER/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /RE-CHECK/i }));

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes(expectedLawLine))).toBeInTheDocument();
    });
  });

  test("renders shared-pool floor failures as pool-level budget overflow rows", async () => {
    const cheapRoster = makeLegalRosterPlayerSet("cheap", 10_000);
    const expensiveRoster = [
      ...makeLegalRosterPlayerSet("expensive-a", 70_000),
      ...makeLegalRosterPlayerSet("expensive-b", 70_000),
    ];
    const poolPlayers = [...cheapRoster, ...expensiveRoster];
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c"],
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        salaryCap: 1_000_000,
      }),
      teams: [
        makeTeam("team-a", {
          name: "Caps",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
        makeTeam("team-b", {
          name: "Keys",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
        makeTeam("team-c", {
          name: "CPU Blues",
          controlledBy: "ai",
        }),
      ],
      players: poolPlayers,
      pool: makePool({
        locked: false,
        players: poolPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("CAN EVERY CLUB BUILD A LEGAL 22 UNDER $1,000,000?")).toBeInTheDocument();
    // TEXTLAW-SWEEP: the room-check explainer is now Help-gated (byte-identical, relocated only).
    expect(screen.queryByText(
      "Each club is checked drafting alone from the full pool; the last line checks all clubs sharing one pool.",
    )).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "?" }));
    expect(screen.getByText(
      "Each club is checked drafting alone from the full pool; the last line checks all clubs sharing one pool.",
    )).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /RE-CHECK/i }));

    const floorMessage = await screen.findByText((content) =>
      content.includes("The shared pool seats 1 of 3 clubs, then can't seat the next:"),
    );
    const floorRow = floorMessage.closest("div");
    expect(floorRow).toHaveTextContent("ALL CLUBS · ONE POOL");
    expect(floorRow).toHaveTextContent("SHARED POOL");
    expect(floorRow).toHaveTextContent("seats 1 of 3 clubs");
    expect(floorRow).toHaveTextContent("the balanced legal 22 for that club costs $1,180,000");
    expect(floorRow).toHaveTextContent("against the $1,000,000 cap ($180,000 over)");
    expect(floorRow).toHaveTextContent("the affordable players are used up");
    expect(floorRow).not.toHaveTextContent("Priciest asks");
    expect(floorRow).not.toHaveTextContent("CPU Blues");
    expect(floorRow).not.toHaveTextContent("club 2");
    expect(screen.getAllByText("BUILDS · $660,000 to spare")).toHaveLength(2);
  });

  test("renders CLUB CHECK target segments without changing the floor dot gate", async () => {
    const legalPlayers = [
      ...makeLegalRosterPlayers(1_000),
      ...Array.from({ length: 60 }, (_, index) =>
        makePlayer(100 + index, {
          id: `depth-${index}`,
          primaryPosition: "CF",
          salary: 1_000,
        }),
      ),
    ];
    vi.mocked(buildBest22Target)
      .mockReturnValueOnce(makeBest22Target())
      .mockReturnValueOnce(makeBest22Target())
      .mockReturnValueOnce(makeBest22Target({ allIn: 30_000, feasible: true }))
      .mockReturnValueOnce(makeBest22Target({ allIn: 45_000, feasible: false }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c"],
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
      }),
      teams: [
        makeTeam("team-a", {
          name: "Target Ready",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: "murderers-row",
          farmArchetypeKey: "whiteyball",
        }),
        makeTeam("team-b", {
          name: "No Identity",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: undefined,
        }),
        makeTeam("team-c", {
          name: "Target Trouble",
          gmSeatId: "seat-you",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: "whiteyball",
          farmArchetypeKey: "murderers-row",
        }),
      ],
      players: legalPlayers,
      pool: makePool({
        locked: false,
        players: legalPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE CLUB CHECK")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("TARGET $30,000")).toBeInTheDocument();
      expect(screen.getAllByText("TARGET $30,000").length).toBeGreaterThan(0);
      expect(screen.getByText("NO IDENTITY")).toBeInTheDocument();
      expect(screen.getByText("IDENTITY WON'T EXPRESS")).toBeInTheDocument();
    });

    const troubleRow = screen.getByText((content) => content.includes("Target Trouble · Player 2")).closest("div");
    expect(troubleRow?.querySelector("[aria-hidden='true']")?.className).toContain("bg-[var(--ballpark-status-green)]");
  });

  // SETUPTAX Item 1: the setup screens stop promising what settlement won't honor. A club whose
  // FLOOR still builds (cheapest legal 22 under the salary-only diagnostic) but whose identity
  // TARGET overshoots the cap once tax is added must not read as unqualified green.
  test("SETUPTAX: CLUB CHECK row de-greens when the identity TARGET is insolvent from tax alone", async () => {
    const legalPlayers = [
      ...makeLegalRosterPlayers(1_000),
      ...Array.from({ length: 60 }, (_, index) =>
        makePlayer(200 + index, {
          id: `taxdepth-${index}`,
          primaryPosition: "CF",
          salary: 1_000,
        }),
      ),
    ];
    vi.mocked(buildBest22Target)
      .mockReturnValueOnce(makeBest22Target())
      .mockReturnValueOnce(makeBest22Target())
      .mockReturnValueOnce(makeBest22Target({ allIn: 30_000, feasible: true }))
      .mockReturnValueOnce(makeBest22Target({
        totalSalary: 970_000,
        totalTax: 330_000,
        allIn: 1_300_000,
        budget: 1_000_000,
        feasible: false,
      }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c"],
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
      }),
      teams: [
        makeTeam("team-a", {
          name: "Target Ready",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: "murderers-row",
          farmArchetypeKey: "whiteyball",
        }),
        makeTeam("team-b", {
          name: "No Identity",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: undefined,
        }),
        makeTeam("team-c", {
          name: "Tax Trouble",
          gmSeatId: "seat-you",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: "whiteyball",
          farmArchetypeKey: "murderers-row",
        }),
      ],
      players: legalPlayers,
      pool: makePool({
        locked: false,
        players: legalPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE CLUB CHECK")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("TARGET OVERSHOOTS WITH TAX · $1,300,000 ALL-IN vs $1,000,000 BUDGET")).toBeInTheDocument();
    });

    const troubleRow = screen.getByText((content) => content.includes("Tax Trouble ·")).closest("div");
    // The dot can no longer read as unqualified green while the identity target owes more tax
    // than the budget can absorb -- even though the salary-only floor still builds.
    expect(troubleRow?.querySelector("[aria-hidden='true']")?.className).not.toContain("bg-[var(--ballpark-status-green)]");
    expect(troubleRow?.querySelector("[aria-hidden='true']")?.className).toContain("bg-[var(--ballpark-status-warn)]");
    // The floor truth survives as the secondary, labeled clause.
    expect(within(troubleRow!).getByText(/^FLOOR BUILDS/)).toBeInTheDocument();
  });

  // SETUPTAX rework (audit Finding 1, captain ruling 2026-07-09): causal honesty cuts both
  // ways. When SALARY ALONE blows the budget (tax $0), the tax treatment must NOT fire -- the
  // row renders exactly the pre-lane behavior for that case: green floor dot (the floor still
  // builds), the generic "IDENTITY WON'T EXPRESS" target segment, and no TAX text anywhere.
  test("SETUPTAX: CLUB CHECK row keeps pre-lane behavior when salary alone blows the budget", async () => {
    const legalPlayers = [
      ...makeLegalRosterPlayers(1_000),
      ...Array.from({ length: 60 }, (_, index) =>
        makePlayer(300 + index, {
          id: `salarydepth-${index}`,
          primaryPosition: "CF",
          salary: 1_000,
        }),
      ),
    ];
    vi.mocked(buildBest22Target)
      .mockReturnValueOnce(makeBest22Target())
      .mockReturnValueOnce(makeBest22Target())
      .mockReturnValueOnce(makeBest22Target({ allIn: 30_000, feasible: true }))
      // The auditor's fixture: pure salary overshoot, zero tax.
      .mockReturnValueOnce(makeBest22Target({
        totalSalary: 1_300_000,
        totalTax: 0,
        allIn: 1_300_000,
        budget: 1_000_000,
        feasible: false,
      }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c"],
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
      }),
      teams: [
        makeTeam("team-a", {
          name: "Target Ready",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: "murderers-row",
          farmArchetypeKey: "whiteyball",
        }),
        makeTeam("team-b", {
          name: "No Identity",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: undefined,
        }),
        makeTeam("team-c", {
          name: "Salary Trouble",
          gmSeatId: "seat-you",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: "whiteyball",
          farmArchetypeKey: "murderers-row",
        }),
      ],
      players: legalPlayers,
      pool: makePool({
        locked: false,
        players: legalPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE CLUB CHECK")).toBeInTheDocument();
    // Pre-lane target segment for an infeasible-with-identity club (byte-identical copy path).
    await waitFor(() => {
      expect(screen.getByText("IDENTITY WON'T EXPRESS")).toBeInTheDocument();
    });

    const salaryRow = screen.getByText((content) => content.includes("Salary Trouble ·")).closest("div");
    // Pre-lane dot: the floor-only gate, green because the cheapest legal 22 still builds.
    expect(salaryRow?.querySelector("[aria-hidden='true']")?.className).toContain("bg-[var(--ballpark-status-green)]");
    // No tax treatment anywhere in the row: no overshoot headline, no demoted-floor clause.
    expect(within(salaryRow!).queryByText(/OVERSHOOTS WITH TAX/)).not.toBeInTheDocument();
    expect(within(salaryRow!).queryByText(/^FLOOR BUILDS/)).not.toBeInTheDocument();
    // And THE MONEY's tax-watch line must not name this club either.
    expect(screen.queryByText(/TAX WATCH:/)).not.toBeInTheDocument();
  });

  test("B5 recomputes draftability on pool membership changes, not roster-design edits", async () => {
    const basePlayers = makePlayers(24);
    const baseTeams = [makeTeam("team-a"), makeTeam("team-b")];
    mockLeagueData({ players: basePlayers, teams: baseTeams, pool: makePool({ locked: false }) });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(1);
    });

    mockLeagueData({
      players: basePlayers,
      teams: [
        makeTeam("team-a", {
          rosterDesign: {
            slots: buildDefaultDesignSlots(),
            lockedAt: "2026-01-03T00:00:00.000Z",
          },
        }),
        makeTeam("team-b"),
      ],
      pool: makePool({ locked: false }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    });
    expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(1);

    const ratingEditedPlayers = basePlayers.map((player, index) =>
      index === 0 ? { ...player, power: player.power + 1 } : player,
    );
    const ratingEditData = mockLeagueData({
      players: ratingEditedPlayers,
      teams: baseTeams,
      pool: makePool({ locked: false }),
    });
    await act(async () => {
      await ratingEditData.updatePlayer(ratingEditedPlayers[0]);
    });
    expect(ratingEditData.updatePlayer).toHaveBeenCalledWith(ratingEditedPlayers[0]);
    rerender(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(2);
    });

    mockLeagueData({
      players: [
        ...ratingEditedPlayers,
        makePlayer(200, { id: "new-pool-member", primaryPosition: "SS" }),
      ],
      teams: baseTeams,
      pool: makePool({ locked: false }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(3);
    });
  });

  test("source-cohort roster and IV inputs invalidate the visible Snake draftability snapshot", async () => {
    vi.mocked(rankAllArchetypesForPool).mockReturnValue([{
      archetypeId: "murderers-row",
      name: "Murderers' Row",
      band: "YELLOW",
      resilience: 1,
      noTaxBuilds: 1,
      taxedBuilds: 0,
      embodimentZ: 0.5,
      taxHeadroom: 10_000,
      reasons: ["CURRENT SNAPSHOT"],
      rank: 1,
    }]);
    const poolPlayers = makePlayers(24);
    const referenceOnly = makePlayer(900, {
      id: "reference-only",
      leagueAssignments: [{ leagueId: "source-only", teamId: "", rosterStatus: "FREE_AGENT" }],
    });
    const league = makeLeague({
      draftFormat: "snake",
      draftPoolMode: "pool-first",
      sourceLeagueIds: ["league-page", "source-only"],
    });
    const sourceLeague = makeLeague({ id: "source-only", name: "Reference Source", teamIds: [] });
    mockLeagueData({
      league,
      leagues: [league, sourceLeague],
      players: [...poolPlayers, referenceOnly],
      teams: [
        makeTeam("team-a", {
          controlledBy: "ai",
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
        makeTeam("team-b"),
      ],
      pool: makePool({ locked: false }),
    });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    await waitFor(() => expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("▲ CURRENT SNAPSHOT")).toBeInTheDocument();

    const structurallyEditedReference = {
      ...referenceOnly,
      bats: "S" as const,
      secondaryPosition: "C" as const,
      trait1: "Utility",
      arsenal: [...referenceOnly.arsenal, "CH" as const],
    };

    mockLeagueData({
      league,
      leagues: [league, sourceLeague],
      players: [...poolPlayers, structurallyEditedReference],
      teams: [
        makeTeam("team-a", {
          controlledBy: "ai",
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
        makeTeam("team-b"),
      ],
      pool: makePool({ locked: false }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    expect(screen.queryByText("▲ CURRENT SNAPSHOT")).not.toBeInTheDocument();
    await waitFor(() => expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("▲ CURRENT SNAPSHOT")).toBeInTheDocument();
  });

  test("draftability worker failure falls back and releases identity auto-fill", async () => {
    class FailingDraftabilityWorker {
      static instance: FailingDraftabilityWorker | null = null;
      onmessage: ((event: MessageEvent<{ rows: unknown[] }>) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      constructor() {
        FailingDraftabilityWorker.instance = this;
      }
      postMessage() {}
      terminate() {}
    }
    vi.stubGlobal("Worker", FailingDraftabilityWorker as unknown as typeof Worker);
    const players = makePlayers(24);
    mockLeagueData({
      players,
      teams: [makeTeam("team-a", {
        controlledBy: "ai",
        mlbArchetypeKey: undefined,
        farmArchetypeKey: undefined,
      })],
      pool: makePool({ locked: false }),
    });
    try {
      render(<LeagueBuilderDraftSetup />);
      const autoFill = await screen.findByRole("button", { name: /Auto-fill remaining/i });
      expect(autoFill).toBeDisabled();
      act(() => FailingDraftabilityWorker.instance?.onerror?.(new Event("error")));
      await waitFor(() => expect(rankAllArchetypesForPool).toHaveBeenCalled());
      await waitFor(() => expect(autoFill).toBeEnabled());
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // -----------------------------------------------------------------------------------------
  // DRAFT_POOL_UNIVERSE_SPEC_2026-07-08 — draft-available player universe.
  // -----------------------------------------------------------------------------------------

  test("UNIVERSE renders every league with a player count; ALL leagues checked by default (unfiltered), none locked", async () => {
    const nativePlayers = makePlayers(5);
    const otherLeaguePlayers = Array.from({ length: 3 }, (_, index) =>
      makePlayer(100 + index, {
        id: `other-${index}`,
        leagueAssignments: [{ leagueId: "other-league", teamId: "", rosterStatus: "FREE_AGENT" as const }],
      }),
    );
    const league = makeLeague();
    const otherLeague = makeLeague({ id: "other-league", name: "Legends League", teamIds: [] });
    mockLeagueData({
      league,
      leagues: [league, otherLeague],
      players: [...nativePlayers, ...otherLeaguePlayers],
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    const ownCheckbox = await screen.findByLabelText(/Page League/i);
    const otherCheckbox = screen.getByLabelText(/Legends League/i);
    const unassignedCheckbox = screen.getByLabelText(/Unassigned Players/i);
    // Captain rework 2026-07-08: absent field = unfiltered = every league renders checked.
    expect(ownCheckbox).toBeChecked();
    expect(otherCheckbox).toBeChecked();
    expect(unassignedCheckbox).toBeChecked();
    expect(ownCheckbox.closest("label")?.textContent).toContain(`${nativePlayers.length} player`);
    expect(otherCheckbox.closest("label")?.textContent).toContain(`${otherLeaguePlayers.length} player`);
    // Enablement settles once the pool-lock status and saved-auction check both resolve (async on mount).
    await waitFor(() => {
      expect(ownCheckbox).toBeEnabled();
    });
  });

  test("UNIVERSE: source libraries feed the pool but cannot become the draft target", async () => {
    const league = makeLeague();
    const sourceLibrary = makeLeague({
      id: "legends-library-career",
      name: "Legends Library — Career",
      teamIds: [],
      sourceLibrary: { kind: "historical-legends", profileType: "Career" },
    });
    mockLeagueData({
      league,
      leagues: [league, sourceLibrary],
      players: [],
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByLabelText(/Legends Library — Career/i)).toBeInTheDocument();
    const roomSelect = screen.getAllByRole("combobox").find((select) =>
      within(select).queryByRole("option", { name: "PAGE LEAGUE" }),
    );
    expect(roomSelect).toBeDefined();
    expect(within(roomSelect!).queryByRole("option", { name: /LEGENDS LIBRARY/i })).not.toBeInTheDocument();
  });

  test("UNIVERSE: unassigned switch produces an exact checked-source extraction", async () => {
    const assigned = makeLegalRosterPlayerSet("career", 10_000).map((player) => ({
      ...player,
      leagueAssignments: [{ leagueId: "legends-library-career", teamId: "", rosterStatus: "FREE_AGENT" as const }],
    }));
    const unassigned = makeLegalRosterPlayerSet("stock", 10_000).map((player) => ({
      ...player,
      leagueAssignments: [],
    }));
    const league = makeLeague();
    const sourceLibrary = makeLeague({
      id: "legends-library-career",
      name: "Legends Library — Career",
      teamIds: [],
      sourceLibrary: { kind: "historical-legends", profileType: "Career" },
    });
    mockLeagueData({
      league,
      leagues: [league, sourceLibrary],
      players: [...assigned, ...unassigned],
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByLabelText(/Unassigned Players/i));
    await waitFor(() => expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
      includeUnassignedSourcePlayers: false,
      sourceLeagueIds: ["league-page", "legends-library-career"],
    })));

    const exactLeague = {
      ...league,
      includeUnassignedSourcePlayers: false,
      sourceLeagueIds: ["legends-library-career"],
    };
    mockLeagueData({
      league: exactLeague,
      leagues: [exactLeague, sourceLibrary],
      players: [...assigned, ...unassigned],
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });
    rerender(<LeagueBuilderDraftSetup />);
    vi.mocked(extractPoolFromDemand).mockClear();

    await clickDraftSetupButton(/Regenerate production-shaped pool/i);
    await waitFor(() => expect(extractPoolFromDemand).toHaveBeenCalled());
    const extractedIds = new Set(
      (vi.mocked(extractPoolFromDemand).mock.calls.at(-1)?.[0] as Array<{ id: string }>).map((player) => player.id),
    );
    for (const player of assigned) expect(extractedIds.has(player.id)).toBe(true);
    for (const player of unassigned) expect(extractedIds.has(player.id)).toBe(false);
  });

  test("UNIVERSE: absent field extracts from the FULL player set byte-identically; first toggle writes the explicit list and switches to filtered", async () => {
    const nativePlayers = makeLegalRosterPlayerSet("native", 10_000);
    const curatedPlayers = makeLegalRosterPlayerSet("curated", 10_000).map((player) => ({
      ...player,
      leagueAssignments: [{ leagueId: "other-league", teamId: "", rosterStatus: "FREE_AGENT" as const }],
    }));
    const league = makeLeague();
    const otherLeague = makeLeague({ id: "other-league", name: "Legends League", teamIds: [] });
    const allPlayers = [...nativePlayers, ...curatedPlayers];

    mockLeagueData({
      league,
      leagues: [league, otherLeague],
      players: allPlayers,
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    const { rerender } = render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton(/Regenerate production-shaped pool/i);
    await waitFor(() => expect(extractPoolFromDemand).toHaveBeenCalled());
    // Byte-identical assertion: with the field absent, the extraction universe IS the full
    // player set — every id, exactly, no filter applied (pre-feature behavior).
    const universeBefore = (vi.mocked(extractPoolFromDemand).mock.calls.at(-1)?.[0] as Array<{ id: string }>)
      .map((p) => p.id)
      .sort();
    expect(universeBefore).toEqual(allPlayers.map((p) => p.id).sort());

    // First toggle: un-check the other league → writes the explicit full list minus the toggled
    // league (from then on the record carries an explicit array).
    const otherCheckbox = await screen.findByLabelText(/Legends League/i);
    fireEvent.click(otherCheckbox);
    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ sourceLeagueIds: ["league-page"] }),
      );
    });

    vi.mocked(extractPoolFromDemand).mockClear();
    const nextLeague = { ...league, sourceLeagueIds: ["league-page"] };
    mockLeagueData({
      league: nextLeague,
      leagues: [nextLeague, otherLeague],
      players: allPlayers,
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton(/Regenerate production-shaped pool/i);
    await waitFor(() => expect(extractPoolFromDemand).toHaveBeenCalled());
    const universeAfter = new Set(
      (vi.mocked(extractPoolFromDemand).mock.calls.at(-1)?.[0] as Array<{ id: string }>).map((p) => p.id),
    );
    // Explicit array behavior: curated-league players excluded, native players kept.
    for (const player of nativePlayers) expect(universeAfter.has(player.id)).toBe(true);
    for (const player of curatedPlayers) expect(universeAfter.has(player.id)).toBe(false);
  });

  test("UNIVERSE: empty resolved universe disables extraction and shows a plain cause hint", async () => {
    const claimedElsewhere = makeLegalRosterPlayerSet("elsewhere", 10_000).map((player) => ({
      ...player,
      leagueAssignments: [{ leagueId: "some-other-league", teamId: "", rosterStatus: "FREE_AGENT" as const }],
    }));
    const league = makeLeague({ sourceLeagueIds: [] });
    mockLeagueData({
      league,
      leagues: [league],
      players: claimedElsewhere,
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/No draft pool sources are checked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Reroll generated players/i })).toBeDisabled();
  });

  test("UNIVERSE: explicit zero leagues checked but free agents present keeps extraction enabled with an honest info line", async () => {
    // Audit Finding 3 honesty tweak (captain 2026-07-08): warn-don't-block stands — never-claimed
    // free agents keep the universe alive, so extraction stays enabled, but the UI says so plainly.
    const freeAgents = makeLegalRosterPlayerSet("fa", 10_000).map((player) => ({
      ...player,
      leagueAssignments: [],
    }));
    const league = makeLeague({ sourceLeagueIds: [] });
    mockLeagueData({
      league,
      leagues: [league],
      players: freeAgents,
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("No league sources checked — drafting from unclaimed free agents only.")).toBeInTheDocument();
    expect(screen.queryByText(/No draft pool sources are checked/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).toBeEnabled();
    });
    expect(screen.getByRole("button", { name: /Reroll generated players/i })).toBeEnabled();
  });

  test("UNIVERSE: thin universe surfaces a plain engine-generated count instead of a bare number", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({ ...player, leagueAssignments: [] })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
        poolSizeMultiplier: 1.25,
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    expect(await screen.findByText(/players? engine-generated to help fill the roster demand/i)).toBeInTheDocument();
  });

  test("F20 UNIVERSE: a source-league change trips THE DRAFT POOL SOURCES CHANGED and blocks lock; legacy unfiltered records never retro-nag", async () => {
    const teams = [
      makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
    ];
    const otherLeague = makeLeague({ id: "other-league", name: "Legends League", teamIds: [] });

    // Phase 1 — legacy/no-touch: extracted basis has NO sourceLeagueIds (pre-feature record) and
    // the league field is absent (untouched unfiltered default). Both mean "drawn from
    // everything" — provably equivalent, so no retro-nag.
    const legacyLeague = makeLeague({
      draftPoolMode: "design-first",
      poolExtractedAt: "2026-01-02T00:00:00.000Z",
      poolExtractedBasis: {
        cap: 1_000_000,
        poolSizeMultiplier: 1.35,
        identityByTeamId: { "team-a": "murderers-row", "team-b": "murderers-row" },
      },
      salaryCap: 1_000_000,
      poolSizeMultiplier: 1.35,
    });
    mockLeagueData({ league: legacyLeague, leagues: [legacyLeague, otherLeague], teams, pool: makePool() });
    const { rerender } = render(<LeagueBuilderDraftSetup />);
    await waitFor(() => {
      expect(screen.queryByText(/THE DRAFT POOL SOURCES CHANGED/i)).not.toBeInTheDocument();
    });

    // Phase 2 — explicit-and-matching: extracted with an explicit set, live set unchanged → quiet.
    const matchedLeague = {
      ...legacyLeague,
      poolExtractedBasis: { ...legacyLeague.poolExtractedBasis!, sourceLeagueIds: ["league-page"] },
      sourceLeagueIds: ["league-page"],
    };
    mockLeagueData({ league: matchedLeague, leagues: [matchedLeague, otherLeague], teams, pool: makePool() });
    rerender(<LeagueBuilderDraftSetup />);
    await waitFor(() => {
      expect(screen.queryByText(/THE DRAFT POOL SOURCES CHANGED/i)).not.toBeInTheDocument();
    });

    // Phase 3 — the live set moves off the extracted set → staleness line + start blocked.
    const changedLeague = { ...matchedLeague, sourceLeagueIds: ["league-page", "other-league"] };
    mockLeagueData({ league: changedLeague, leagues: [changedLeague, otherLeague], teams, pool: makePool() });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE DRAFT POOL SOURCES CHANGED — RE-EXTRACT TO PULL FROM THE NEW SET.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
  });
});
