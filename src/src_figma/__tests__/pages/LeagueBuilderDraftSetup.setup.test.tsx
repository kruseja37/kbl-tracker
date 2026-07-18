import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  LeagueBuilderDraftSetup,
} from "../../app/pages/LeagueBuilderDraftSetup";
import {
  buildIdentityAutoAssignPlan,
} from "../../app/pages/LeagueBuilderDraftSetup.helpers";
import { buildBest22Target } from "../../../engines/best22Target";
import { rankAllArchetypesForPool } from "../../../engines/draftabilityRanker";
import { poolDemandModel } from "../../../engines/auctionPoolSizing";
import { extractPoolFromDemand } from "../../../engines/poolFromDemand";
import { selectTeamArchetype } from "../../../engines/archetypeIdentity";
import { getAuctionSession, getMlbDraftSession, getRegisteredPool, saveLeagueTemplate, saveTeam } from "../../../utils/leagueBuilderStorage";
import {
  RUN_IT_BACK_FRANCHISE_GUARD_MESSAGE,
  resetCompletedDraftArc,
} from "../../../utils/leagueBuilderAuctionPipeline";
import {
  addPlayersToLeaguePool,
  lockLeaguePool,
  unlockLeaguePool,
} from "../../../utils/leagueBuilderPoolBuilder";
import { registerLeaguePoolForLeague } from "../../../utils/leagueBuilderPoolRegistration";
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
    getRegisteredPool: vi.fn(async () => null),
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

vi.mock("../../../utils/snakeRosterHandoff", () => ({
  isSnakeRosterHandoffReady: vi.fn(async (session: { currentPickIndex: number; pickOrder: unknown[] } | null) => (
    Boolean(session && session.pickOrder.length > 0 && session.currentPickIndex === session.pickOrder.length)
  )),
}));

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

vi.mock("../../../utils/leagueBuilderPoolRegistration", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/leagueBuilderPoolRegistration")>(
    "../../../utils/leagueBuilderPoolRegistration",
  );
  return {
    ...actual,
    registerLeaguePoolForLeague: vi.fn(actual.registerLeaguePoolForLeague),
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
  makeBest22Target,
  makeFinalizedDesignFirstPlayers,
  makeLeague,
  makeLegalRosterPlayerSet,
  makeLockedRosterDesign,
  makePlayers,
  makePool,
  makePositionDiversePlayers,
  makeTeam,
  mockLeagueData,
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

  test("renders the merged Draft Room zones", async () => {
    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("1 · THE ROOM")).toBeInTheDocument();
    expect(screen.getByText("2 · WHO'S PLAYING")).toBeInTheDocument();
    expect(screen.getByText("3 · THE CLUBS")).toBeInTheDocument();
    expect(screen.getByText("4 · THE POOL")).toBeInTheDocument();
    expect(screen.getByText("5 · THE FLOOR")).toBeInTheDocument();
    expect(screen.queryByText("PLAYER POOL")).not.toBeInTheDocument();
  });

  test("a source-library URL resolves to the draft league and selection keeps the URL honest", async () => {
    const sourceLibrary = makeLeague({
      id: "legends-library-career",
      name: "Legends Library Career",
      teamIds: [],
      sourceLibrary: { kind: "historical-legends", profileType: "Career" },
    });
    const fourTeamLeague = makeLeague({ id: "four-team-mock", name: "4-team mock" });
    const secondDraftLeague = makeLeague({ id: "second-draft", name: "Second Draft" });
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=legends-library-career");
    mockLeagueData({
      league: fourTeamLeague,
      leagues: [sourceLibrary, fourTeamLeague, secondDraftLeague],
    });

    render(<LeagueBuilderDraftSetup />);

    const leagueSelect = await waitFor(() => {
      const match = screen.getAllByRole("combobox")
        .find((element) => (element as HTMLSelectElement).value === "four-team-mock");
      expect(match).toBeDefined();
      return match as HTMLSelectElement;
    });
    expect(leagueSelect).toHaveValue("four-team-mock");
    await act(async () => {
      fireEvent.change(leagueSelect, { target: { value: "second-draft" } });
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      "/league-builder/draft-setup?leagueId=second-draft",
      { replace: true },
    );
  });

  test("auction format renders only the auction adapter", async () => {
    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("ENTER AUCTION DRAFT")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase shill bidders" })).toBeInTheDocument();
    expect(screen.queryByTestId("snake-setup-adapter")).not.toBeInTheDocument();
    expect(screen.queryByText("ENTER SNAKE DRAFT")).not.toBeInTheDocument();
  });

  test("saves the draft method from the unified Draft Setup route", async () => {
    mockLeagueData({ pool: makePool({ locked: false }) });
    render(<LeagueBuilderDraftSetup />);

    const snakeMethod = await screen.findByRole("button", { name: "SNAKE DRAFT", exact: true });
    expect(screen.getByRole("button", { name: "AUCTION DRAFT", exact: true })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(snakeMethod).toBeEnabled());
    fireEvent.click(snakeMethod);

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        draftFormat: "snake",
      }));
    });
  });

  test("freezes the draft method until a locked player pool is explicitly unlocked", async () => {
    mockLeagueData({ pool: makePool({ locked: true }) });
    render(<LeagueBuilderDraftSetup />);

    const auctionMethod = await screen.findByRole("button", { name: "AUCTION DRAFT", exact: true });
    const snakeMethod = screen.getByRole("button", { name: "SNAKE DRAFT", exact: true });
    expect(auctionMethod).toBeDisabled();
    expect(snakeMethod).toBeDisabled();
    fireEvent.click(snakeMethod);
    expect(saveLeagueTemplate).not.toHaveBeenCalledWith(expect.objectContaining({ draftFormat: "snake" }));
  });

  test("snake format renders its panels and no auction-only floor controls", async () => {
    mockLeagueData({ league: makeLeague({ draftFormat: "snake" }) });
    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByTestId("snake-setup-adapter")).toBeInTheDocument();
    for (const heading of ["1 · POOL", "2 · CLUBS", "3 · ORDER", "4 · GO"]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "ENTER SNAKE DRAFT" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Increase shill bidders" })).not.toBeInTheDocument();
    expect(screen.queryByText(/START SNAKE DRAFT \(POC\)/i)).not.toBeInTheDocument();
  });

  test("opens the requested snake league without an intermediate select-league state", async () => {
    mockLeagueData({ league: makeLeague({ draftFormat: "snake" }) });
    render(<LeagueBuilderDraftSetup />);

    expect(screen.queryByText("Select a league first.")).not.toBeInTheDocument();
    expect(await screen.findByText("Snake Draft — Page League")).toBeInTheDocument();
  });

  test("does not auto-build and certify a snake pool while Draft Setup is mounting", async () => {
    const players = makePositionDiversePlayers(300, 8, "mount-pool");
    mockLeagueData({
      league: makeLeague({
        draftFormat: "snake",
        draftPoolMode: "pool-first",
        poolAssemblyMode: "shape-to-teams",
        salaryCap: 10_000_000,
      }),
      players,
      pool: makePool({ locked: false, players: [], totalSlots: 176 }),
    });

    render(<LeagueBuilderDraftSetup />);
    expect(await screen.findByTestId("snake-setup-adapter")).toBeInTheDocument();
    await act(async () => undefined);

    expect(extractPoolFromDemand).not.toHaveBeenCalled();
    expect(addPlayersToLeaguePool).not.toHaveBeenCalled();
  });

  test("snake format keeps source leagues, manual player selection, versions, and club identities in one setup", async () => {
    mockLeagueData({ league: makeLeague({ draftFormat: "snake" }) });
    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("DRAFT POOL SOURCES")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EDIT CAPS IDENTITIES" })).toBeInTheDocument();
    expect(screen.getByText("TEAM IDENTITY")).toBeInTheDocument();
    expect(screen.getByText(/^AVAILABLE PLAYERS \(/)).toBeInTheDocument();
    expect(screen.getByText(/^IN THE POOL \(/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SNAKE DRAFT", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("snake identity picks persist and update the local team without reloading setup data or the pool", async () => {
    const leagueData = mockLeagueData({ league: makeLeague({ draftFormat: "snake" }) });
    render(<LeagueBuilderDraftSetup />);

    const card = await screen.findByRole("button", { name: /Bomba Squad/i });
    await waitFor(() => expect(card).toBeEnabled());
    vi.clearAllMocks();
    fireEvent.click(card);

    await waitFor(() => {
      expect(selectTeamArchetype).toHaveBeenCalledTimes(1);
      expect(leagueData.replaceTeamsLocal).toHaveBeenCalledWith([
        expect.objectContaining({ id: "team-a", mlbArchetypeKey: "bomba-squad" }),
      ]);
    });
    expect(leagueData.refresh).not.toHaveBeenCalled();
    expect(leagueData.getRegisteredPool).not.toHaveBeenCalled();
  });

  test("snake Edit Player opens the shared editor, saves, and refreshes the focused player", async () => {
    const leagueData = mockLeagueData({
      league: makeLeague({ draftFormat: "snake" }),
      pool: makePool({ locked: false }),
    });
    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByText("Avery Anchor"));
    fireEvent.click(await screen.findByRole("button", { name: /Edit Player/i }));
    const firstName = await screen.findByLabelText("First Name");
    fireEvent.change(firstName, { target: { value: "Avery-Snake" } });
    expect(screen.getByText("Avery-Snake Anchor")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => {
      expect(leagueData.updatePlayer).toHaveBeenCalledWith(expect.objectContaining({
        id: "player-0",
        firstName: "Avery-Snake",
      }));
      expect(leagueData.replacePlayersLocal).toHaveBeenCalledWith([
        expect.objectContaining({ id: "player-0", firstName: "Avery-Snake" }),
      ]);
      expect(leagueData.refresh).toHaveBeenCalled();
    });
    expect(screen.queryByText("EDIT PLAYER")).not.toBeInTheDocument();
  });

  test("migrates an unsaved one-card snake lock before Ready can survive", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) => (
      makeLegalRosterPlayerSet(prefix, 10_000)
    ));
    const original = currentPlayers[0];
    const restored = {
      ...original,
      id: "legacy-restored-version",
      firstName: "Restored",
      sourceId: "historical:shared-person",
      versionGroupId: "historical:shared-person",
      leagueAssignments: original.leagueAssignments.filter((assignment) => assignment.leagueId !== "league-page"),
    };
    currentPlayers[0] = {
      ...original,
      sourceId: "historical:shared-person",
      versionGroupId: "historical:shared-person",
    };
    const unlockedRestoredPool = makePool({
      locked: false,
      players: [...currentPlayers, restored].map((player) => ({
        id: player.id,
        iv: player.salary,
        salary: player.salary,
      })),
    });
    const lockedRestoredPool = { ...unlockedRestoredPool, locked: true };
    const league = makeLeague({
      draftFormat: "snake",
      snakeVersionSourcePlayerIds: [restored.id],
    });
    const collapsedPool = makePool({
      locked: true,
      players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });
    mockLeagueData({
      league,
      teams: [
        makeTeam("team-a", { mlbArchetypeKey: undefined }),
        makeTeam("team-b", { mlbArchetypeKey: undefined }),
      ],
      players: [...currentPlayers, restored],
      pool: collapsedPool,
    });
    vi.mocked(getRegisteredPool).mockResolvedValue(collapsedPool);
    vi.mocked(addPlayersToLeaguePool).mockResolvedValue([{ ...restored, leagueAssignments: original.leagueAssignments }]);
    vi.mocked(registerLeaguePoolForLeague).mockResolvedValue(unlockedRestoredPool);
    vi.mocked(lockLeaguePool).mockResolvedValue(lockedRestoredPool);

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/Restoring every player version/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ENTER SNAKE DRAFT" })).toBeDisabled();
    await waitFor(() => {
      expect(addPlayersToLeaguePool).toHaveBeenCalledWith([restored.id], "league-page");
      expect(registerLeaguePoolForLeague).toHaveBeenCalledWith("league-page");
      expect(lockLeaguePool).toHaveBeenCalledWith("league-page", {
        expectedPlayerIds: expect.arrayContaining([...currentPlayers.map((player) => player.id), restored.id]),
      });
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        snakeVersionSourcePlayerIds: [],
      }));
    });
    expect(vi.mocked(lockLeaguePool).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(saveLeagueTemplate).mock.invocationCallOrder.at(-1)!,
    );
    expect(unlockLeaguePool).toHaveBeenCalledWith("league-page");
  });

  test("disables player edits while the pool is locked", async () => {
    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByText("Avery Anchor"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Unlock to Edit/i })).toBeDisabled();
    });
  });

  test("pool shuttle player rows open the full profile including personality and chemistry", async () => {
    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByText("Avery Anchor"));
    expect(await screen.findByText("Competitive")).toBeInTheDocument();
    expect(screen.getByText("Crafty")).toBeInTheDocument();
    expect(screen.getAllByText("POW").length).toBeGreaterThan(1);
  });

  test("starts at the MLB auction once the pool is locked and every club has both identities", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=0&reserveK=0.65");
  });

  test("the retired snake POC button no longer renders (the real snake draft shipped; POC flag compiles OFF)", async () => {
    render(<LeagueBuilderDraftSetup />);

    await screen.findByRole("button", { name: /START THE DRAFT/i });
    expect(screen.queryByRole("button", { name: /START SNAKE DRAFT \(POC\)/i })).not.toBeInTheDocument();
  });

  test("CUT2-1 flips THE FLOOR status in-session after locking the pool", async () => {
    const players = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const unlockedPool = makePool({
      locked: false,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });
    const lockedPool = { ...unlockedPool, locked: true };
    const leagueData = mockLeagueData({ players, pool: unlockedPool });
    vi.mocked(lockLeaguePool).mockResolvedValue(lockedPool);

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/pool open/i)).toBeInTheDocument();
    expect(await screen.findByText(/lock a sufficient player pool first/i)).toBeInTheDocument();

    const lockButton = screen.getByRole("button", { name: /^LOCK POOL$/i });
    expect(lockButton).toBeEnabled();
    fireEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getAllByText(/pool locked/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/lock a sufficient player pool first/i)).not.toBeInTheDocument();
    expect(lockLeaguePool).toHaveBeenCalledWith("league-page", {
      expectedPlayerIds: players.map((player) => player.id).sort(),
    });
    expect(leagueData.refresh).toHaveBeenCalled();
  });

  test("CUT2-1 flips THE FLOOR status in-session after locking the pool", async () => {
    const players = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const unlockedPool = makePool({
      locked: false,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });
    const lockedPool = { ...unlockedPool, locked: true };
    const leagueData = mockLeagueData({ players, pool: unlockedPool });
    vi.mocked(lockLeaguePool).mockResolvedValue(lockedPool);

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/pool open/i)).toBeInTheDocument();
    expect(await screen.findByText(/lock a sufficient player pool first/i)).toBeInTheDocument();

    const lockButton = screen.getByRole("button", { name: /^LOCK POOL$/i });
    expect(lockButton).toBeEnabled();
    fireEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getAllByText(/pool locked/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/lock a sufficient player pool first/i)).not.toBeInTheDocument();
    expect(lockLeaguePool).toHaveBeenCalledWith("league-page", {
      expectedPlayerIds: players.map((player) => player.id).sort(),
    });
    expect(leagueData.refresh).toHaveBeenCalled();
  });

  test("blocks draft start when a club has an MLB identity but no farm identity", async () => {
    mockLeagueData({
      teams: [
        makeTeam("team-a"),
        makeTeam("team-b", { farmArchetypeKey: undefined }),
      ],
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByText(/give every club an MLB and a farm identity first/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    expect(screen.getByText(/set each club's identities/i)).toBeInTheDocument();
  });

  test("P1 planner is deterministic per seed, rerolls away from current auto-filled identities, and skips LOCKED archetypes", () => {
    const seats = makeLeague().draftSeats ?? [];
    const baseTeam = makeTeam("team-b", {
      controlledBy: "ai",
      gmSeatId: undefined,
      gmSeatName: undefined,
      mlbArchetypeKey: undefined,
      farmArchetypeKey: undefined,
    });
    const input = {
      leagueId: "league-page",
      nonce: 7,
      teams: [baseTeam],
      seats,
      draftability: {
        "murderers-row": { band: "LOCKED" as const, reason: "test locked" },
        whiteyball: { band: "LOCKED" as const, reason: "test locked" },
      },
      includeHumanTeams: false,
      mode: "fill-empty" as const,
      poolSourceMode: "full-pool" as const,
      activeLeagueId: "league-page",
      players: makePlayers(6),
    };

    const planA = buildIdentityAutoAssignPlan(input);
    const planB = buildIdentityAutoAssignPlan(input);

    expect(planA).toEqual(planB);
    expect(planA).toHaveLength(1);
    expect([planA[0].mlbKey, planA[0].farmKey]).not.toContain("murderers-row");
    expect([planA[0].mlbKey, planA[0].farmKey]).not.toContain("whiteyball");

    const rerollPlan = buildIdentityAutoAssignPlan({
      ...input,
      nonce: 8,
      teams: [
        makeTeam("team-b", {
          controlledBy: "ai",
          gmSeatId: undefined,
          gmSeatName: undefined,
          mlbArchetypeKey: planA[0].mlbKey,
          farmArchetypeKey: planA[0].farmKey,
        }),
      ],
      autoFilledSlots: new Set(["team-b:mlb", "team-b:farm"]),
      mode: "reroll-team",
      rerollTeamId: "team-b",
    });

    expect(rerollPlan).toHaveLength(1);
    expect(rerollPlan[0].mlbKey).not.toBe(planA[0].mlbKey);
    expect(rerollPlan[0].farmKey).not.toBe(planA[0].farmKey);
  });

  test("P1 auto-fill remaining fills only empty CPU identities and preserves human/user-set picks by default", async () => {
    mockLeagueData({
      league: makeLeague({ teamIds: ["team-a", "team-b", "team-c"] }),
      teams: [
        makeTeam("team-a", {
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
        makeTeam("team-b", {
          controlledBy: "ai",
          gmSeatId: undefined,
          gmSeatName: undefined,
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
        makeTeam("team-c", {
          controlledBy: "ai",
          gmSeatId: undefined,
          gmSeatName: undefined,
          mlbArchetypeKey: "murderers-row",
          farmArchetypeKey: "whiteyball",
        }),
      ],
    });

    render(<LeagueBuilderDraftSetup />);

    const autoFill = await screen.findByRole("button", { name: /Auto-fill remaining/i });
    await waitFor(() => expect(autoFill).toBeEnabled());
    fireEvent.click(autoFill);

    await waitFor(() => {
      expect(selectTeamArchetype).toHaveBeenCalledTimes(1);
    });
    expect(selectTeamArchetype).toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-b" }),
      expect.any(String),
      expect.any(String),
      expect.any(Function),
    );
    expect(selectTeamArchetype).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-a" }),
      expect.any(String),
      expect.any(String),
      expect.any(Function),
    );
    expect(selectTeamArchetype).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-c" }),
      expect.any(String),
      expect.any(String),
      expect.any(Function),
    );
  });

  test("P1 auto-fill includes human empty identities only after explicit opt-in", async () => {
    mockLeagueData({
      teams: [
        makeTeam("team-a", {
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
        makeTeam("team-b", {
          controlledBy: "ai",
          gmSeatId: undefined,
          gmSeatName: undefined,
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
      ],
    });

    render(<LeagueBuilderDraftSetup />);

    const autoFill = await screen.findByRole("button", { name: /Auto-fill remaining/i });
    fireEvent.click(screen.getByLabelText(/include human clubs/i));
    await waitFor(() => expect(autoFill).toBeEnabled());
    fireEvent.click(autoFill);

    await waitFor(() => {
      expect(selectTeamArchetype).toHaveBeenCalledTimes(2);
    });
    expect(selectTeamArchetype).toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-a" }),
      expect.any(String),
      expect.any(String),
      expect.any(Function),
    );
    expect(selectTeamArchetype).toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-b" }),
      expect.any(String),
      expect.any(String),
      expect.any(Function),
    );
  });

  test("carries the selected shill count into the MLB auction", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));
    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));
    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=2&reserveK=0.65");
  });

  test("CUT2-2 persists selected shill count and reloads it without a URL carrier", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({ draftShillCount: 1 }));
    });

    cleanup();
    vi.mocked(saveLeagueTemplate).mockClear();
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page");
    mockLeagueData({ league: makeLeague({ draftShillCount: 1 }) });

    render(<LeagueBuilderDraftSetup />);

    // CONTRACT_FLAKEFIX_2026-07-09: widen to match the file's established 5000ms convention for
    // this exact button-enabled assertion -- a post-remount re-settle under batch-load CPU
    // contention can outrun RTL's default 1000ms waitFor budget.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=1&reserveK=0.65");
  });

  test("CUT2-2 30-club shill pressure does not inflate the pool-lock floor", async () => {
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page&shills=10");
    const teamIds = Array.from({ length: 30 }, (_, index) => `team-${index}`);
    const teams = teamIds.map((teamId) => makeTeam(teamId));
    const realClubFloor = poolDemandModel(30, 0).feasibilityFloor;
    // CONTRACT_FIXTUREFIX_2026-07-09: makePlayers(realClubFloor) was all-CF, satisfying zero of
    // derivePositionSupplyFloorTargets(30); makePositionDiversePlayers keeps the SAME exact
    // headcount (this test asserts poolSize === realClubFloor) but distributes it across every
    // hard position/role at or above the 30-team floor.
    const players = makePositionDiversePlayers(realClubFloor, 30);
    const pool = makePool({
      locked: true,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });

    mockLeagueData({
      league: makeLeague({ teamIds }),
      teams,
      players,
      pool,
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });
    // CONTRACT_FLAKEFIX_2026-07-09: the "Pool X/Y draft slots" and "N clubs + M shills" lines are
    // derived text separate from the START-THE-DRAFT-enabled fact just awaited above -- retry-await
    // them directly instead of racing a synchronous getByText right after an unrelated wait.
    expect(await screen.findByText(new RegExp(`Pool ${realClubFloor} / ${realClubFloor} draft slots`))).toBeInTheDocument();
    expect(await screen.findByText(/30 clubs \+ 10 CPU shills/i)).toBeInTheDocument();
  });

  test("CUT2-2 persists selected shill count and reloads it without a URL carrier", async () => {
    render(<LeagueBuilderDraftSetup />);

    // CONTRACT_FLAKEFIX_2026-07-09: this copy's initial START-THE-DRAFT-enabled wait lacked the
    // {timeout: 5000} its sibling copy (above) already has -- brought in line with the file's own
    // established convention for this exact assertion so it survives batch-load CPU contention.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({ draftShillCount: 1 }));
    });

    cleanup();
    vi.mocked(saveLeagueTemplate).mockClear();
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page");
    mockLeagueData({ league: makeLeague({ draftShillCount: 1 }) });

    render(<LeagueBuilderDraftSetup />);

    // CONTRACT_FLAKEFIX_2026-07-09: widen to match the file's established 5000ms convention for
    // this exact button-enabled assertion -- a post-remount re-settle under batch-load CPU
    // contention can outrun RTL's default 1000ms waitFor budget.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=1&reserveK=0.65");
  });

  test("CUT2-2 30-club shill pressure does not inflate the pool-lock floor", async () => {
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page&shills=10");
    const teamIds = Array.from({ length: 30 }, (_, index) => `team-${index}`);
    const teams = teamIds.map((teamId) => makeTeam(teamId));
    const realClubFloor = poolDemandModel(30, 0).feasibilityFloor;
    // CONTRACT_FIXTUREFIX_2026-07-09: makePlayers(realClubFloor) was all-CF, satisfying zero of
    // derivePositionSupplyFloorTargets(30); makePositionDiversePlayers keeps the SAME exact
    // headcount (this test asserts poolSize === realClubFloor) but distributes it across every
    // hard position/role at or above the 30-team floor.
    const players = makePositionDiversePlayers(realClubFloor, 30);
    const pool = makePool({
      locked: true,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });

    mockLeagueData({
      league: makeLeague({ teamIds }),
      teams,
      players,
      pool,
    });

    render(<LeagueBuilderDraftSetup />);

    // CONTRACT_FLAKEFIX_2026-07-09: this copy lacked the {timeout: 5000} its sibling copy (above)
    // already has -- brought in line with the file's own established convention.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });
    // Same derived-text retry-await cure as the sibling copy above.
    expect(await screen.findByText(new RegExp(`Pool ${realClubFloor} / ${realClubFloor} draft slots`))).toBeInTheDocument();
    expect(await screen.findByText(/30 clubs \+ 10 CPU shills/i)).toBeInTheDocument();
  });

  test("blocks design-first draft start when a locked design changed after pool extraction", async () => {
    const displayedPlayers = makeFinalizedDesignFirstPlayers();
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        modeAExtractedIds: displayedPlayers.map((player) => player.id),
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-03T00:00:00.000Z") }),
      ],
      players: displayedPlayers,
      pool: makePool({
        players: displayedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: displayedPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByText(/finish the re-plan — lock the edits, then re-extract/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    expect(screen.getByText("RE-PLAN IN PROGRESS · EDIT → LOCK → RE-EXTRACT")).toBeInTheDocument();
    expect(screen.getByText(/◉ Keys \(Player 2\) — locked, waiting on re-extract/i)).toBeInTheDocument();
  });

  test("enables design-first draft start when all locked designs predate the extracted pool", async () => {
    const displayedPlayers = makeFinalizedDesignFirstPlayers();
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        modeAExtractedIds: displayedPlayers.map((player) => player.id),
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-02T00:00:00.000Z") }),
      ],
      players: displayedPlayers,
      pool: makePool({
        players: displayedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: displayedPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    // CONTRACT_FLAKEFIX_2026-07-09: design-first START-THE-DRAFT enablement depends on the
    // modeAReport hand-ledger comparison, which resolves behind a 0ms setTimeout macrotask -- under
    // batch-load CPU contention that macrotask can be delayed past RTL's default 1000ms waitFor
    // budget. Widen to the file's established 5000ms convention for this exact assertion.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });
    expect(screen.queryByText(/re-extract the pool/i)).not.toBeInTheDocument();
  });

  test("W3 shows the re-plan rail while editing and flips the action line once every club locks", async () => {
    const league = makeLeague({
      draftPoolMode: "design-first",
      poolExtractedAt: "2026-01-02T00:00:00.000Z",
    });
    const teams = [
      makeTeam("team-a", { rosterDesign: { slots: [] } }),
      makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
    ];
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({ league, teams, pool: makePool({ locked: false }) });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("RE-PLAN IN PROGRESS · EDIT → LOCK → RE-EXTRACT")).toBeInTheDocument();
    expect(screen.getByText(/✎ Caps \(You\) — editing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RE-EXTRACT$/i })).toBeDisabled();
    expect(screen.getByText("The current pool still reflects the old designs. Re-extract when every club locks.")).toBeInTheDocument();

    mockLeagueData({
      league,
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-03T00:00:00.000Z") }),
        teams[1],
      ],
      pool: makePool({ locked: false }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/◉ Caps \(You\) — locked, waiting on re-extract/i)).toBeInTheDocument();
    expect(screen.getByText("EVERY CLUB IS LOCKED — RE-EXTRACT TO APPLY THE NEW PLAN.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RE-EXTRACT$/i })).toBeEnabled();
  });

  test("W5 pool-first mode does not render the re-plan rail", async () => {
    render(<LeagueBuilderDraftSetup />);

    await screen.findByText("4 · THE POOL");

    expect(screen.queryByText("RE-PLAN IN PROGRESS · EDIT → LOCK → RE-EXTRACT")).not.toBeInTheDocument();
  });

  test("persists a changed GM seat name through the existing league and team records", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.queryByText(/Checking for a saved draft before allowing pool edits/i)).not.toBeInTheDocument();
    });
    const youInput = (await screen.findAllByDisplayValue("You")).find(
      (element): element is HTMLInputElement => element.tagName === "INPUT",
    );
    if (!youInput) throw new Error("GM seat input not found");
    fireEvent.change(youInput, { target: { value: "Captain Jane" } });

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        draftSeats: expect.arrayContaining([
          expect.objectContaining({ id: "seat-you", name: "Captain Jane" }),
        ]),
      }));
    });
    expect(saveTeam).toHaveBeenCalledWith(expect.objectContaining({
      id: "team-a",
      gmSeatId: "seat-you",
      gmSeatName: "Captain Jane",
    }));
  });

  test("freezes setup changes while a saved auction is in progress and resumes the live draft", async () => {
    vi.mocked(getAuctionSession).mockResolvedValue({
      leagueId: "league-page",
      season: "MLB_AUCTION",
      session: { state: "OPEN_BIDDING" },
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getAuctionSession>>);

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /RESUME DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });

    expect(screen.getByRole("button", { name: /UNLOCK/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Increase shill bidders/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "SNAKE DRAFT", exact: true })).toBeDisabled();
    expect(screen.getAllByRole("combobox")[1]).toBeDisabled();
    expect(screen.getByRole("button", { name: /Bomba Squad/i })).toBeDisabled();

    expect(selectTeamArchetype).not.toHaveBeenCalled();
    expect(saveTeam).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /RESUME DRAFT/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=0&reserveK=0.65");
    });
  });

  test("D1 freezes setup changes while a saved snake session is in progress and exposes RESUME DRAFT", async () => {
    mockLeagueData({ league: makeLeague({ draftFormat: "snake" }) });
    vi.mocked(getMlbDraftSession).mockResolvedValue({
      id: "league-page:1:mlb-draft",
      leagueId: "league-page",
      seasonNumber: 1,
      seed: "incomplete-snake",
      workflowVersion: "startup-mlb-draft-v1",
      engineMethodVersion: "leagueConstruction.t8d-1",
      tier: "standard",
      balanceMode: "taxed",
      rounds: 1,
      pickOrder: [
        { round: 1, pick: 1, teamId: "team-a" },
        { round: 1, pick: 2, teamId: "team-b" },
      ],
      completedPicks: [{ round: 1, pick: 1, teamId: "team-a", playerId: "player-0" }],
      currentPickIndex: 1,
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /RESUME DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });
    expect(screen.getByRole("button", { name: /UNLOCK/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "AUCTION DRAFT", exact: true })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /RESUME DRAFT/i }));
    await waitFor(() => {
      // An in-progress snake draft resumes in THE ROOM — re-entering setup's GO would
      // overwrite the saved session (walkthrough finding, 2026-07-11).
      expect(mockNavigate).toHaveBeenCalledWith("/snake-room?leagueId=league-page");
    });
  });

  test("R5 completed draft renders RUN IT BACK and resets to a fresh MLB auction start", async () => {
    vi.mocked(getAuctionSession).mockResolvedValue({
      leagueId: "league-page",
      seasonNumber: 1,
      seed: "completed-draft",
      session: { state: "AUCTION_COMPLETE" },
      createdDate: "2026-01-01T00:00:00.000Z",
      lastModified: "2026-01-01T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getAuctionSession>>);

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("Drafted ✓")).toBeInTheDocument();
    const runItBack = await screen.findByRole("button", { name: "RUN IT BACK" });
    expect(runItBack).toBeEnabled();

    fireEvent.click(runItBack);
    expect(screen.getByText("SURE?")).toBeInTheDocument();
    expect(screen.getByText(
      "Clears the finished draft and every roster it handed out. Your pool, prices, designs, and identities stay. You'll draft again from the MLB auction.",
    )).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm run it back" }));

    await waitFor(() => {
      expect(resetCompletedDraftArc).toHaveBeenCalledWith("league-page");
    });
    await waitFor(() => {
      expect(screen.queryByText("Drafted ✓")).not.toBeInTheDocument();
    });

    const start = screen.getByRole("button", { name: /START THE DRAFT/i });
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=0&reserveK=0.65");
  });

  test("D1 repro: completed snake draft renders RUN IT BACK", async () => {
    mockLeagueData({ league: makeLeague({ draftFormat: "snake" }) });
    vi.mocked(getMlbDraftSession).mockResolvedValue({
      id: "league-page::startup-mlb-draft::1",
      leagueId: "league-page",
      seasonNumber: 1,
      seed: "completed-snake",
      workflowVersion: "startup-mlb-draft-v1",
      engineMethodVersion: "leagueConstruction.t8d-1",
      tier: "standard",
      balanceMode: "taxed",
      rounds: 1,
      pickOrder: [{ round: 1, pick: 1, teamId: "team-a" }],
      completedPicks: [{ round: 1, pick: 1, teamId: "team-a", playerId: "player-1" }],
      currentPickIndex: 1,
      createdDate: "2026-01-01T00:00:00.000Z",
      lastModified: "2026-01-01T00:00:00.000Z",
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByRole("button", { name: "RUN IT BACK" })).toBeEnabled();
  });

  test("R4 disables RUN IT BACK when a franchise already references the league", async () => {
    vi.mocked(getAuctionSession).mockResolvedValue({
      leagueId: "league-page",
      seasonNumber: 1,
      seed: "completed-draft",
      session: { state: "AUCTION_COMPLETE" },
      createdDate: "2026-01-01T00:00:00.000Z",
      lastModified: "2026-01-01T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getAuctionSession>>);
    vi.mocked(leagueHasLinkedFranchise).mockResolvedValue(true);

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("Drafted ✓")).toBeInTheDocument();
    expect(await screen.findByText(RUN_IT_BACK_FRANCHISE_GUARD_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RUN IT BACK" })).toBeDisabled();
    expect(resetCompletedDraftArc).not.toHaveBeenCalled();
  });

  test("keeps the pool frozen when saved auction status cannot be verified", async () => {
    vi.mocked(getAuctionSession).mockRejectedValue(new Error("storage unavailable"));

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      // BOARDFIX2: the new readiness panel (Item A) surfaces this SAME message a second time near
      // START THE DRAFT, so this now legitimately renders twice -- assert presence, not uniqueness.
      expect(screen.getAllByText(/Could not confirm whether a saved draft exists/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("button", { name: /UNLOCK/i })).toBeDisabled();

    fireEvent.click(await screen.findByText("Avery Anchor"));

    expect(screen.getByRole("button", { name: /Unlock to Edit/i })).toBeDisabled();
  });
});
