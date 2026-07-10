import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  LeagueBuilderDraftSetup,
  buildIdentityAutoAssignPlan,
  comparePlayersByIvDesc,
  draftSetupSolvencyBannerText,
} from "../../app/pages/LeagueBuilderDraftSetup";
import { buildRosterDesignPool } from "../../app/components/leagueBuilder/RosterDesigner";
import { describeRosterLawGaps } from "../../../engines/auctionExitGate";
import { buildBest22Target, type Best22Target } from "../../../engines/best22Target";
import { rankAllArchetypesForPool } from "../../../engines/draftabilityRanker";
import { extractPoolFromDemand } from "../../../engines/poolFromDemand";
import { evaluateRosterDesign } from "../../../engines/rosterDesignFeasibility";
import { buildDefaultDesignSlots } from "../../../engines/rosterDesignFeasibility";
import { teamRosterNeed, toRosterSlotPlayer, type RosterPositionMap } from "../../../engines/rosterNeed";
import { poolDemandModel } from "../../../engines/auctionPoolSizing";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Player,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";
import { selectTeamArchetype } from "../../../engines/archetypeIdentity";
import { getAuctionSession, getMlbDraftSession, saveLeagueTemplate, saveTeam } from "../../../utils/leagueBuilderStorage";
import {
  RUN_IT_BACK_FRANCHISE_GUARD_MESSAGE,
  resetCompletedDraftArc,
} from "../../../utils/leagueBuilderAuctionPipeline";
import {
  addPlayersToLeaguePool,
  computePlayerIv,
  lockLeaguePool,
  removePlayersFromLeaguePool,
} from "../../../utils/leagueBuilderPoolBuilder";
import { leagueHasLinkedFranchise } from "../../../utils/franchiseManager";
import { SALARY_CAP_FLOOR, salaryCapHardError } from "../../app/utils/salaryCapInput";

vi.setConfig({ testTimeout: 15000 });

const mockNavigate = vi.fn();

type LeaguePoolRecord = {
  leagueId: string;
  tier: "standard";
  balanceMode: "taxed";
  players: Array<{ id: string; iv: number; salary: number }>;
  tierCap: number;
  luxuryCaps: never[];
  pickValueChart: never[];
  totalSlots: number;
  poolSurplusWarning: boolean;
  locked?: boolean;
};

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
  DEFAULT_TEST_POOL_SIZE,
  capFitDiagnosticText,
  clickDraftSetupButton,
  clickSlot,
  extractPoolOptions,
  fiveGradedSsPlayers,
  globalBoardOrder,
  makeBest22Target,
  makeFinalizedDesignFirstPlayers,
  makeLeague,
  makeLegalRosterPlayerSet,
  makeLegalRosterPlayers,
  makeLockedRosterDesign,
  makePlayer,
  makePlayers,
  makePool,
  makeQualityRosterPlayerSet,
  makeTeam,
  mockLeagueData,
  shortlistLines,
  waitForExtractPoolOptions,
  type ExtractPoolOptions,
  type LeaguePoolRecord,
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

  test("F20 design-first blocks lock when the displayed pool is not the finalized pool", async () => {
    const displayedPlayers = makePlayers(DEFAULT_TEST_POOL_SIZE);
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        salaryCap: 1_000_000,
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      ],
      players: displayedPlayers,
      pool: makePool({
        locked: false,
        players: displayedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: displayedPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    // BOARDFIX2: the new readiness panel (Item A) surfaces this SAME reason a second time near
    // START THE DRAFT, so this now legitimately renders twice -- assert presence, not uniqueness.
    await waitFor(() => {
      expect(screen.getAllByText(/re-extract so the displayed pool matches the final pool/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("button", { name: /^LOCK POOL$/i })).toBeDisabled();
    expect(screen.queryByText(/Sized to/i)).not.toBeInTheDocument();
  });

  test("F20 design-first lock persists the displayed finalized pool without re-extracting", async () => {
    const displayedPlayers = makeFinalizedDesignFirstPlayers();
    const unlockedPool = makePool({
      locked: false,
      players: displayedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      totalSlots: displayedPlayers.length,
    });
    vi.mocked(lockLeaguePool).mockResolvedValue({ ...unlockedPool, locked: true });
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        modeAExtractedIds: displayedPlayers.map((player) => player.id),
        salaryCap: 1_000_000,
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      ],
      players: displayedPlayers,
      pool: unlockedPool,
    });

    render(<LeagueBuilderDraftSetup />);

    // CONTRACT_FLAKEFIX_2026-07-09: LOCK POOL enablement in design-first mode depends on the
    // modeAReport hand-ledger comparison, which resolves behind a 0ms setTimeout macrotask -- widen
    // past RTL's default 1000ms waitFor budget so batch-load CPU contention can't outrun it.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^LOCK POOL$/i })).not.toBeDisabled();
    }, { timeout: 5000 });
    vi.mocked(extractPoolFromDemand).mockClear();

    fireEvent.click(screen.getByRole("button", { name: /^LOCK POOL$/i }));

    await waitFor(() => {
      expect(lockLeaguePool).toHaveBeenCalledWith("league-page", {
        expectedPlayerIds: displayedPlayers.map((player) => player.id).sort(),
      });
    }, { timeout: 5000 });
    expect(extractPoolFromDemand).not.toHaveBeenCalled();
  });

  test("pool-first regeneration uses numeric-shaped slack target instead of exact roster demand", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    const players = [...currentPlayers, ...candidatePlayers];
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
        poolSizeMultiplier: 1.25,
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players,
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    await waitFor(() => {
      expect(extractPoolFromDemand).toHaveBeenCalled();
      expect(addPlayersToLeaguePool).toHaveBeenCalled();
    }, { timeout: 7000 });
    const extractMock = vi.mocked(extractPoolFromDemand);
    const matchingCall = extractMock.mock.calls.find((call) => {
      const options = call[4] as { teams?: number; poolBalancePreset?: string; poolSizeMultiplier?: number; pinnedIds?: string[]; poolSourceMode?: string };
      return options.teams === 4 && options.poolBalancePreset === "balanced" && options.poolSizeMultiplier === 1.25;
    });
    expect(matchingCall).toBeTruthy();
    const matchingOptions = matchingCall?.[4] as { pinnedIds?: string[]; priorityIds?: string[]; poolSourceMode?: string };
    expect(matchingOptions.poolSourceMode).toBe("team-roster-priority");
    expect(matchingOptions.priorityIds).toHaveLength(88);
    expect(matchingOptions.pinnedIds).toHaveLength(0);
    const addedIds = vi.mocked(addPlayersToLeaguePool).mock.calls[0]?.[0] ?? [];
    const removedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    // CONTRACT_FIXTUREFIX_2026-07-09: re-pinned to real observed output after POOLFLOOR's position
    // supply floors (CONTRACT_POOLFLOOR_2026-07-09.md) topped this pool up further -- the source
    // universe (4 legal-roster prefixes: one/two/three/four/five/six) previously satisfied the
    // count-only target (110) but was short on several hard positions, so extraction now pulls in
    // 8 more bodies (118 actual vs 110 target) to clear derivePositionSupplyFloorTargets(4). Net
    // add/remove delta moved from 22 to 30 (32 added, 2 removed) accordingly.
    expect(addedIds.length - removedIds.length).toBe(30);
    // CONTRACT_FLAKEFIX_2026-07-09: widen past RTL's default 1000ms findBy budget -- this receipt
    // text settles from the same class of async pool-shape computation as the design-first
    // modeAReport, and can lag under batch-load CPU contention.
    expect(await screen.findByText(/Sized to 118 \(1\.34×\)/i, undefined, { timeout: 5000 })).toBeInTheDocument();
    // SETUPHELP: the raw "Production shape" diagnostic dump now hides behind Help.
    expect(screen.queryByText((content) => content.includes("Production shape: Balanced"))).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "?" }));
    expect(screen.getByText((content) =>
      content.includes("Production shape: Balanced") &&
      content.includes("demand 88") &&
      content.includes("target 110") &&
      content.includes("actual 118") &&
      content.includes("source Team roster priority"),
    )).toBeInTheDocument();
  });

  test("pool-first regeneration carries the selected balance preset into numeric shaping", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
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

    fireEvent.click(await screen.findByRole("button", { name: /^Grounded$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitFor(() => {
      expect(extractPoolFromDemand).toHaveBeenCalled();
    });
    const options = vi.mocked(extractPoolFromDemand).mock.calls.at(-1)?.[4] as {
      poolBalancePreset?: string;
      poolSizeMultiplier?: number;
    };
    expect(options.poolBalancePreset).toBe("grounded");
    expect(options.poolSizeMultiplier).toBe(1.2);
    // CONTRACT_FIXTUREFIX_2026-07-09: re-pinned to real observed output -- POOLFLOOR's position
    // supply floors (CONTRACT_POOLFLOOR_2026-07-09.md) top this pool up past the count-only target
    // (106) to 115 to clear derivePositionSupplyFloorTargets(4).
    expect(await screen.findByText(/Sized to 115 \(1\.31×\)/i)).toBeInTheDocument();
  });

  test("pool-first regeneration carries the selected pool quality center without saving salary cap", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
        salaryCap: 1_000_000,
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

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    const options = await waitForExtractPoolOptions((callOptions) =>
      callOptions.poolQualityCenter === 72
        && callOptions.poolBalancePreset === "balanced"
        && callOptions.poolSizeMultiplier === 1.25,
    );
    expect(options.poolQualityCenter).toBe(72);
    expect(options.poolBalancePreset).toBe("balanced");
    expect(options.poolSizeMultiplier).toBe(1.25);
    expect(saveLeagueTemplate).not.toHaveBeenCalled();
    // SETUPHELP: the raw "Production shape" diagnostic dump now hides behind Help.
    fireEvent.click(screen.getByRole("button", { name: "?" }));
    // CONTRACT_FLAKEFIX_2026-07-09: widen past RTL's default 1000ms findBy budget for the same
    // async pool-shape-settle reason as the sibling regeneration tests above.
    expect(await screen.findByText((content) =>
      content.includes("Production shape: Balanced") &&
      content.includes("quality 72") &&
      content.includes("achieved"),
    undefined, { timeout: 5000 })).toBeInTheDocument();
  });

  test("pool quality center restores from session and feeds regeneration", async () => {
    window.sessionStorage.setItem("kbl:draft-pool-quality-center:league-page:pool-first", "74");
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
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

    fireEvent.click(await screen.findByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitForExtractPoolOptions((options) => options.poolQualityCenter === 74);
    expect(screen.getByText("highest")).toBeInTheDocument();
  });

  test("repeated pool-first regenerate is idempotent for engine-generated players", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    const players = [...currentPlayers, ...candidatePlayers];
    const league = makeLeague({
      teamIds: ["team-a", "team-b", "team-c", "team-d"],
      draftPoolMode: "pool-first",
      poolSizeMultiplier: 1.25,
    });
    const teams = ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId));
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({
      league,
      teams,
      players,
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitFor(() => {
      expect(addPlayersToLeaguePool).toHaveBeenCalled();
    });
    const firstAddedIds = vi.mocked(addPlayersToLeaguePool).mock.calls[0]?.[0] ?? [];
    const firstRemovedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    // CONTRACT_FIXTUREFIX_2026-07-09: re-pinned to real observed output -- same fixture shape as
    // the sibling "numeric-shaped slack target" test above (4 teams, poolSizeMultiplier 1.25, same
    // one/two/three/four current + five/six candidate legal-roster prefixes), so POOLFLOOR's
    // position supply floors move this delta from 22 to 30 the same way.
    expect(firstAddedIds.length - firstRemovedIds.length).toBe(30);

    vi.mocked(addPlayersToLeaguePool).mockClear();
    vi.mocked(removePlayersFromLeaguePool).mockClear();
    const firstFinalIds = [
      ...currentPlayers.map((player) => player.id).filter((id) => !firstRemovedIds.includes(id)),
      ...firstAddedIds,
    ];
    const assignedPlayers = players.map((player) => {
      if (firstRemovedIds.includes(player.id)) return { ...player, leagueAssignments: [] };
      if (firstAddedIds.includes(player.id)) {
        return { ...player, leagueAssignments: [{ leagueId: "league-page", teamId: "", rosterStatus: "FREE_AGENT" as const }] };
      }
      return player;
    });
    mockLeagueData({
      league,
      teams,
      players: assignedPlayers,
      pool: makePool({
        locked: false,
        players: firstFinalIds.map((id) => ({ id, iv: 10_000, salary: 10_000 })),
        // CONTRACT_FIXTUREFIX_2026-07-09: was a hardcoded 110 (the pre-POOLFLOOR delta's target
        // size); now derived from firstFinalIds itself so it always matches the actual regenerated
        // pool regardless of exactly how many bodies the position-floor top-up added.
        totalSlots: firstFinalIds.length,
      }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    fireEvent.click(screen.getByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitFor(() => {
      expect(extractPoolFromDemand).toHaveBeenCalledTimes(2);
    });
    // CONTRACT_FIXTUREFIX_2026-07-09: re-verified per contract instruction -- this idempotency
    // assertion never actually executed pre-fix (the test aborted on the delta assertion above
    // before reaching here). With the delta re-pinned to 30, this DOES now execute and DOES pass:
    // regenerating again from the already-regenerated pool calls neither add nor remove, confirming
    // the idempotency claim holds for real (not just a stale pin masking an untested path).
    expect(addPlayersToLeaguePool).not.toHaveBeenCalled();
    expect(removePlayersFromLeaguePool).not.toHaveBeenCalled();
  });

  test("reroll advances the deterministic generation nonce without converting roster priority into hard keeps", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
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

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);
    await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 0
        && options.poolQualityCenter === 72
        && options.poolSourceMode === "team-roster-priority";
    });

    vi.mocked(extractPoolFromDemand).mockClear();
    await clickDraftSetupButton(/Reroll generated players/i);

    const rerollOptions = await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 1
        && options.poolQualityCenter === 72
        && options.poolSourceMode === "team-roster-priority"
        && options.priorityIds?.length === 88
        && options.pinnedIds?.length === 0;
    });
    expect(rerollOptions.priorityIds).toHaveLength(88);
    expect(rerollOptions.pinnedIds).toHaveLength(0);
  });

  test("reroll preserves roster-design pinned players as hard keeps", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const pinnedPlayer = currentPlayers.find((player) => player.primaryPosition === "C")!;
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: [
        makeTeam("team-a", {
          rosterDesign: {
            slots: [],
            pins: { C: pinnedPlayer.id },
          },
        }),
        ...["team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      ],
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);
    await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 0
        && options.poolQualityCenter === 72
        && Boolean(options.pinnedIds?.includes(pinnedPlayer.id));
    });

    vi.mocked(removePlayersFromLeaguePool).mockClear();
    vi.mocked(extractPoolFromDemand).mockClear();
    await clickDraftSetupButton(/Reroll generated players/i);

    const rerollOptions = await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 1
        && options.poolQualityCenter === 72
        && Boolean(options.pinnedIds?.includes(pinnedPlayer.id))
        && !options.excludedIds?.includes(pinnedPlayer.id);
    });
    expect(rerollOptions.pinnedIds).toContain(pinnedPlayer.id);
    expect(rerollOptions.excludedIds).not.toContain(pinnedPlayer.id);
    const removedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls.flatMap((call) => call[0] ?? []);
    expect(removedIds).not.toContain(pinnedPlayer.id);
  });

  test("manual exclusion does not beat a roster-design pin during regeneration", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const pinnedPlayer = currentPlayers.find((player) => player.primaryPosition === "C")!;
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    window.sessionStorage.setItem("kbl:draft-pool-provenance:league-page:pool-first", JSON.stringify({
      engineGeneratedIds: currentPlayers.map((player) => player.id),
      userAddedIds: [],
      manualExcludedIds: [pinnedPlayer.id],
      seedProtectedIds: [],
      generationNonce: 0,
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: [
        makeTeam("team-a", {
          rosterDesign: {
            slots: [],
            pins: { C: pinnedPlayer.id },
          },
        }),
        ...["team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      ],
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    const options = await waitForExtractPoolOptions((candidate) => (
      candidate.poolQualityCenter === 72
      && Boolean(candidate.pinnedIds?.includes(pinnedPlayer.id))
      && !candidate.excludedIds?.includes(pinnedPlayer.id)
    ));
    expect(options.poolQualityCenter).toBe(72);
    expect(options.pinnedIds).toContain(pinnedPlayer.id);
    expect(options.excludedIds).not.toContain(pinnedPlayer.id);
  });

  test("quality-center changes preserve user-added hard keeps and manual exclusions", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const userAdded = currentPlayers[0];
    const manualExcluded = currentPlayers[1];
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    window.sessionStorage.setItem("kbl:draft-pool-provenance:league-page:pool-first", JSON.stringify({
      engineGeneratedIds: currentPlayers.map((player) => player.id).filter((id) => id !== userAdded.id),
      userAddedIds: [userAdded.id],
      manualExcludedIds: [manualExcluded.id],
      seedProtectedIds: [],
      generationNonce: 0,
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
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

    fireEvent.click(await screen.findByRole("button", { name: "72" }));
    fireEvent.click(screen.getByRole("button", { name: /Regenerate production-shaped pool/i }));

    const options = await waitForExtractPoolOptions((candidate) => (
      candidate.poolQualityCenter === 72
      && Boolean(candidate.pinnedIds?.includes(userAdded.id))
      && Boolean(candidate.excludedIds?.includes(manualExcluded.id))
    ));
    expect(options.pinnedIds).toContain(userAdded.id);
    expect(options.excludedIds).toContain(manualExcluded.id);
  });

  test("source mode switching rebuilds disposable engine players without preserving roster priority as hard keep", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
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

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Full player pool/i);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).not.toBeDisabled();
    });
    vi.mocked(extractPoolFromDemand).mockClear();
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    const options = await waitForExtractPoolOptions((callOptions) => {
      return callOptions.poolSourceMode === "full-pool"
        && callOptions.poolQualityCenter === 72
        && callOptions.priorityIds?.length === 88
        && callOptions.pinnedIds?.length === 0;
    });
    expect(options.poolQualityCenter).toBe(72);
    expect(options.poolSourceMode).toBe("full-pool");
    expect(options.priorityIds).toHaveLength(88);
    expect(options.pinnedIds).toHaveLength(0);
  });

  test("session provenance keeps remounted generated players disposable", async () => {
    const seedPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const generatedPlayers = makeLegalRosterPlayerSet("generated", 10_000).map((player) => ({
      ...player,
      leagueAssignments: [{ leagueId: "league-page", teamId: "", rosterStatus: "FREE_AGENT" as const }],
    }));
    const extraGeneratedPlayers = makeLegalRosterPlayerSet("generated-extra", 10_000).map((player) => ({
      ...player,
      leagueAssignments: [{ leagueId: "league-page", teamId: "", rosterStatus: "FREE_AGENT" as const }],
    }));
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    window.sessionStorage.setItem("kbl:draft-pool-provenance:league-page:pool-first", JSON.stringify({
      engineGeneratedIds: [...generatedPlayers, ...extraGeneratedPlayers].map((player) => player.id),
      userAddedIds: [],
      manualExcludedIds: [],
      seedProtectedIds: seedPlayers.map((player) => player.id),
      generationNonce: 0,
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...seedPlayers, ...generatedPlayers, ...extraGeneratedPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: [...seedPlayers, ...generatedPlayers, ...extraGeneratedPlayers].map((player) => ({
          id: player.id,
          iv: player.salary,
          salary: player.salary,
        })),
        totalSlots: seedPlayers.length + generatedPlayers.length + extraGeneratedPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton(/^Grounded$/i);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).not.toBeDisabled();
    });
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    await waitFor(() => {
      expect(removePlayersFromLeaguePool).toHaveBeenCalled();
    });
    const options = await waitForExtractPoolOptions((callOptions) => callOptions.poolBalancePreset === "grounded");
    expect(options.pinnedIds).toHaveLength(88);
    const removedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    expect(removedIds.some((id) => generatedPlayers.some((player) => player.id === id) || extraGeneratedPlayers.some((player) => player.id === id))).toBe(true);
  });

  test("switching from balanced to grounded can shrink engine-generated slack", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    const players = [...currentPlayers, ...candidatePlayers];
    const league = makeLeague({
      teamIds: ["team-a", "team-b", "team-c", "team-d"],
      draftPoolMode: "pool-first",
      poolSizeMultiplier: 1.25,
    });
    const teams = ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId));
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({
      league,
      teams,
      players,
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /Regenerate production-shaped pool/i }));
    await waitFor(() => {
      expect(addPlayersToLeaguePool).toHaveBeenCalled();
    });
    const balancedAddedIds = vi.mocked(addPlayersToLeaguePool).mock.calls[0]?.[0] ?? [];
    const balancedRemovedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    // CONTRACT_FIXTUREFIX_2026-07-09: re-pinned to real observed output -- same fixture shape as
    // the sibling "numeric-shaped slack target" / "idempotent" tests above (4 teams,
    // poolSizeMultiplier 1.25, same one/two/three/four current + five/six candidate legal-roster
    // prefixes), so POOLFLOOR's position supply floors move this delta from 22 to 30 the same way.
    expect(balancedAddedIds.length - balancedRemovedIds.length).toBe(30);

    vi.mocked(addPlayersToLeaguePool).mockClear();
    vi.mocked(removePlayersFromLeaguePool).mockClear();
    const balancedFinalIds = [
      ...currentPlayers.map((player) => player.id).filter((id) => !balancedRemovedIds.includes(id)),
      ...balancedAddedIds,
    ];
    const assignedPlayers = players.map((player) => {
      if (balancedRemovedIds.includes(player.id)) return { ...player, leagueAssignments: [] };
      if (balancedAddedIds.includes(player.id)) {
        return { ...player, leagueAssignments: [{ leagueId: "league-page", teamId: "", rosterStatus: "FREE_AGENT" as const }] };
      }
      return player;
    });
    mockLeagueData({
      league,
      teams,
      players: assignedPlayers,
      pool: makePool({
        locked: false,
        players: balancedFinalIds.map((id) => ({ id, iv: 10_000, salary: 10_000 })),
        // CONTRACT_FIXTUREFIX_2026-07-09: was a hardcoded 110 (the pre-POOLFLOOR delta's target
        // size); now derived from balancedFinalIds itself so it always matches the actual
        // regenerated pool regardless of exactly how many bodies the position-floor top-up added.
        totalSlots: balancedFinalIds.length,
      }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    fireEvent.click(screen.getByRole("button", { name: /^Grounded$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitFor(() => {
      expect(removePlayersFromLeaguePool).toHaveBeenCalled();
    });
    const removedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    expect(removedIds.length).toBeGreaterThan(0);
    expect(removedIds.every((id) => balancedFinalIds.includes(id))).toBe(true);
  });

  test("manual pool diagnostics report illegal completion and block locking only for legality", async () => {
    const shortPool = makeLegalRosterPlayers(10_000).slice(0, 8);
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a"],
        draftPoolMode: "pool-first",
      }),
      teams: [makeTeam("team-a")],
      players: shortPool,
      pool: makePool({
        locked: false,
        players: shortPool.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: shortPool.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    // SETUPHELP: the raw "Manual pool" diagnostic dump (and its embedded legality warning) now
    // hides behind Help.
    expect(screen.queryByText((content) => content.includes("Manual pool: Balanced"))).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "?" }));
    expect(await screen.findByText((content) =>
      content.includes("Manual pool: Balanced") && content.includes("legal no"),
    )).toBeInTheDocument();
    expect(screen.getByText(/Pool cannot legally seat every club at 22 under the cap/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /LOCK POOL/i })).toBeDisabled();
  });

  test("available player rows expose IV instead of letter grade for swap decisions", async () => {
    const available = makePlayer(77, {
      id: "available-iv",
      firstName: "Ivy",
      lastName: "Value",
      salary: 42_000,
      overallGrade: "A+",
      leagueAssignments: [],
    });
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "pool-first",
      }),
      players: [available],
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("Ivy Value")).toBeInTheDocument();
    expect(screen.getByText(`$${Math.round(computePlayerIv(available)).toLocaleString()}`)).toBeInTheDocument();
  });

  test("available players default-sort by numeric IV high to low instead of first name", async () => {
    const highValue = makePlayer(201, {
      id: "available-high-iv",
      firstName: "Zed",
      lastName: "High",
      salary: 95_000,
      power: 99,
      contact: 99,
      speed: 99,
      fielding: 99,
      arm: 99,
      leagueAssignments: [],
    });
    const lowValue = makePlayer(202, {
      id: "available-low-iv",
      firstName: "Aaron",
      lastName: "Low",
      salary: 1_000,
      power: 10,
      contact: 10,
      speed: 10,
      fielding: 10,
      arm: 10,
      leagueAssignments: [],
    });
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "pool-first",
      }),
      players: [lowValue, highValue],
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    const highNode = await screen.findByText("Zed High");
    const lowNode = await screen.findByText("Aaron Low");
    expect(highNode.compareDocumentPosition(lowNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("IV comparator sorts invalid values last and uses deterministic name/id ties", () => {
    const alpha = makePlayer(301, { id: "alpha-id", firstName: "Alpha", lastName: "Tie", leagueAssignments: [] });
    const zed = makePlayer(302, { id: "zed-id", firstName: "Zed", lastName: "Tie", leagueAssignments: [] });
    const high = makePlayer(303, { id: "high-id", firstName: "High", lastName: "Value", leagueAssignments: [] });
    const invalid = makePlayer(304, { id: "invalid-id", firstName: "Invalid", lastName: "Value", leagueAssignments: [] });
    const sorted = [invalid, zed, high, alpha].sort(comparePlayersByIvDesc(new Map([
      [alpha.id, 50_000],
      [zed.id, 50_000],
      [high.id, 90_000],
      [invalid.id, Number.NaN],
    ])));

    expect(sorted.map((player) => player.id)).toEqual([high.id, alpha.id, zed.id, invalid.id]);
  });

  test("M7 locked pool renders THE MONEY read-only with the unlock hint", async () => {
    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("UNLOCK THE POOL TO MOVE THE MONEY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^APPLY$/i })).toBeDisabled();
  });

  test("P8 locked design pins ride extraction and beat hand-removes", async () => {
    const pinnedPlayer = makePlayer(999, { id: "pinned-player", primaryPosition: "SS" });
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        modeAExtractedIds: ["player-0"],
        modeAHandRemoves: ["pinned-player"],
      }),
      teams: [
        makeTeam("team-a", {
          rosterDesign: {
            slots: [],
            lockedAt: "2026-01-03T00:00:00.000Z",
            pins: { SS: "pinned-player" },
          },
        }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-03T00:00:00.000Z") }),
      ],
      players: [...makePlayers(80), pinnedPlayer],
      pool: makePool({
        locked: false,
        players: [{ id: "player-0", iv: 100_000, salary: 10_000 }],
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /^RE-EXTRACT$/i }));

    await waitFor(() => {
      const extractMock = vi.mocked(extractPoolFromDemand);
      const matchingIndex = extractMock.mock.calls.findIndex((call) => {
        const options = call[4] as { pinnedIds?: string[]; excludedIds?: string[] };
        return options.pinnedIds?.includes("pinned-player");
      });
      expect(matchingIndex).toBeGreaterThanOrEqual(0);
      const options = extractMock.mock.calls[matchingIndex][4] as { pinnedIds?: string[]; excludedIds?: string[] };
      expect(options.excludedIds).not.toContain("pinned-player");
      const result = extractMock.mock.results[matchingIndex]?.value as ReturnType<typeof extractPoolFromDemand>;
      expect(result.players.map((player) => player.id)).toContain("pinned-player");
    });
  });

  test("design-first extraction protects identity-critical target picks from the full eligible universe", async () => {
    const criticalCloser = makePlayer(999, {
      id: "critical-cp",
      firstName: "Kay",
      lastName: "Frequin",
      primaryPosition: "CP",
      salary: 10_000,
    });
    const sourcePlayers = [
      ...makeLegalRosterPlayerSet("alpha", 10_000),
      ...makeLegalRosterPlayerSet("beta", 10_000),
      criticalCloser,
    ];
    vi.mocked(buildBest22Target).mockReturnValue(makeBest22Target({
      picks: [{
        slotId: "CP",
        playerId: "critical-cp",
        playerName: "Kay Frequin",
        salary: 10_000,
        honorsAsk: true,
        pinned: false,
      }],
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b"],
        draftPoolMode: "design-first",
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
      players: sourcePlayers,
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    const extractButton = await screen.findByRole("button", { name: /EXTRACT POOL/i });
    await waitFor(() => {
      expect(extractButton).not.toBeDisabled();
    });
    vi.mocked(extractPoolFromDemand).mockClear();
    fireEvent.click(extractButton);

    await waitFor(() => {
      const matchingCallIndex = vi.mocked(extractPoolFromDemand).mock.calls.findIndex((call) => {
        const options = call[4] as { designPriorityIds?: string[] };
        return options.designPriorityIds?.includes("critical-cp");
      });
      expect(matchingCallIndex).toBeGreaterThanOrEqual(0);
    });
    const matchingCallIndex = vi.mocked(extractPoolFromDemand).mock.calls.findIndex((call) => {
      const options = call[4] as { designPriorityIds?: string[] };
      return options.designPriorityIds?.includes("critical-cp");
    });
    const result = vi.mocked(extractPoolFromDemand).mock.results[matchingCallIndex]?.value as ReturnType<typeof extractPoolFromDemand>;
    expect(result.players.map((player) => player.id)).toContain("critical-cp");
    expect(result.numericShape?.identityCriticalCandidateCount).toBe(1);
    expect(result.numericShape?.identityCriticalIncludedCount).toBe(1);
    expect(result.numericShape?.identityCriticalMissingCount).toBe(0);
  });
});
