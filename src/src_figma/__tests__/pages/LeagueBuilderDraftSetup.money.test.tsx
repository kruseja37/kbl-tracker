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
import { poolDemandModel, type ArchetypeCompletionOutlook } from "../../../engines/auctionPoolSizing";
import type { ArchetypeFeasibility } from "../../../engines/poolFeasibility";
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
  evaluatePoolComposition,
  lockLeaguePool,
  removePlayersFromLeaguePool,
  type PoolCompositionReport,
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
    // SETUPTAX Item 4: no existing test in this file ever reaches a `locked` pool (the only
    // gate that fires the REAL evaluatePoolComposition), so mocking it here is additive --
    // every other test in this file still gets `actual`'s other exports and never calls this.
    evaluatePoolComposition: vi.fn(),
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

  test("builds the hard-cap solvency banner when the cheapest legal roster exceeds the league cap", () => {
    const legalPlayers = makeLegalRosterPlayers(2_000_000);

    expect(draftSetupSolvencyBannerText(buildRosterDesignPool(legalPlayers), 1_000_000)).toBe(
      "This pool can't seat a legal roster under your $1,000,000 cap — raise the cap or add cheaper players.",
    );
    expect(draftSetupSolvencyBannerText(buildRosterDesignPool(legalPlayers), 60_000_000)).toBeNull();
  });

  test("renders the pool-size dial and persists the selected stop", async () => {
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        poolSizeMultiplier: 1.35,
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      ],
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("POOL SIZE")).toBeInTheDocument();
    expect(screen.getByText(/PLAYERS · 2 CLUBS × 22/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1.5×" }));
    const onePointFiveButton = screen.getByRole("button", { name: "1.5×" });
    await waitFor(() => {
      expect(onePointFiveButton).not.toBeDisabled();
    });
    fireEvent.click(onePointFiveButton);

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        poolSizeMultiplier: 1.5,
      }));
    });
  });

  test("renders Pool Quality stops with the 68 baseline default", async () => {
    mockLeagueData({
      league: makeLeague({ draftPoolMode: "pool-first" }),
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("POOL QUALITY")).toBeInTheDocument();
    // TEXTLAW-SWEEP: the pool-quality explainer is now Help-gated (byte-identical, relocated only).
    expect(screen.queryByText("Shift the numeric talent curve up or down while preserving the selected pool shape.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "?" }));
    expect(screen.getByText("Shift the numeric talent curve up or down while preserving the selected pool shape.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "64" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "66" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "68 baseline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "70" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "72" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "74" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "76" })).toBeInTheDocument();
    expect(screen.getByText("baseline")).toBeInTheDocument();
  });

  test("renders the advisory Cap Fit diagnostic without reserve-price or apply-recommendation copy", async () => {
    mockLeagueData({
      league: makeLeague({ draftPoolMode: "pool-first", salaryCap: 1_000_000 }),
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    expect(capFitDiagnosticText()).toContain("Cap Fit:");
    expect(capFitDiagnosticText()).toContain("Current Cap: $1,000,000");
    expect(capFitDiagnosticText()).toContain("Suggested Neutral Cap:");
    expect(capFitDiagnosticText()).toContain("expected drafted window");
    expect(capFitDiagnosticText()).toContain("advisory only");
    // TEXTLAW-SWEEP: the two methodology lines (LOCKED) and the fused line's static clause now
    // gate behind Help -- the dynamic {summary} above stays visible without opening it.
    expect(capFitDiagnosticText()).not.toContain("Based on the expected drafted window, not every player in the pool.");
    expect(capFitDiagnosticText()).not.toContain("Pool quality and salary cap are separate.");
    fireEvent.click(screen.getByRole("button", { name: "?" }));
    expect(capFitDiagnosticText()).toContain("Based on the expected drafted window, not every player in the pool.");
    expect(capFitDiagnosticText()).toContain("Uses actual generated pool values");
    expect(capFitDiagnosticText()).toContain("Pool quality and salary cap are separate. Changing Pool Quality does not change the cap.");
    expect(screen.queryByText(/reserve price/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/luxury tax/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /apply recommended cap/i })).not.toBeInTheDocument();
  });

  test("displays the retuned inflationary state as Cap Rich near a 1.30 cap ratio", async () => {
    const legalPlayers = makeLegalRosterPlayers(10_000);
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a"],
        draftPoolMode: "pool-first",
        salaryCap: 1_034_526,
      }),
      teams: [makeTeam("team-a")],
      players: legalPlayers,
      pool: makePool({
        locked: false,
        players: legalPlayers.map((player) => ({ id: player.id, iv: 10_000, salary: 10_000 })),
        totalSlots: legalPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    expect(capFitDiagnosticText()).toContain("Cap Fit: Cap Rich");
    expect(capFitDiagnosticText()).toContain("Suggested Neutral Cap: $795,789");
    expect(capFitDiagnosticText()).toContain("Current Cap: $1,034,526");
    expect(capFitDiagnosticText()).not.toContain("Very Loose");
    expect(saveLeagueTemplate).not.toHaveBeenCalled();
  });

  test("changing Pool Quality does not mutate salary cap while the diagnostic stays visible", async () => {
    mockLeagueData({
      league: makeLeague({ draftPoolMode: "pool-first", salaryCap: 900_000 }),
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "76" }));
    });

    expect(capFitDiagnosticText()).toContain("Current Cap: $900,000");
    expect(saveLeagueTemplate).not.toHaveBeenCalled();
  });

  test("diagnostic recommendation updates from current generated pool values after Pool Quality generation changes composition", async () => {
    const lowPoolPlayers = [
      ...makeQualityRosterPlayerSet("low-one", 30),
      ...makeQualityRosterPlayerSet("low-two", 30),
    ];
    const highPoolPlayers = lowPoolPlayers.map((player) => ({
      ...player,
      power: 90,
      contact: 90,
      speed: 90,
      fielding: 90,
      arm: 90,
      velocity: 90,
      junk: 90,
      accuracy: 90,
    }));
    const league = makeLeague({
      draftPoolMode: "pool-first",
      salaryCap: 1_000_000,
    });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({
      league,
      players: lowPoolPlayers,
      pool: makePool({
        locked: false,
        players: lowPoolPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: lowPoolPlayers.length,
      }),
    });
    await act(async () => {
      rerender(<LeagueBuilderDraftSetup />);
    });

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    const lowDiagnostic = capFitDiagnosticText();

    await clickDraftSetupButton("76");

    mockLeagueData({
      league,
      players: highPoolPlayers,
      pool: makePool({
        locked: false,
        players: highPoolPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: highPoolPlayers.length,
      }),
    });
    await act(async () => {
      rerender(<LeagueBuilderDraftSetup />);
    });

    expect(capFitDiagnosticText()).toContain("Current Cap: $1,000,000");
    expect(capFitDiagnosticText()).not.toBe(lowDiagnostic);
  });

  test("Cap Fit diagnostic survives preset, source, Regenerate, and Reroll without salary cap mutation", async () => {
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

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    await clickDraftSetupButton(/^Grounded$/i);
    await clickDraftSetupButton(/^Full player pool$/i);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).not.toBeDisabled();
    });
    vi.mocked(extractPoolFromDemand).mockClear();
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 0
        && options.poolBalancePreset === "grounded"
        && options.poolSourceMode === "full-pool";
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).not.toBeDisabled();
    });
    expect(capFitDiagnosticText()).toContain("Current Cap: $1,000,000");
    vi.mocked(extractPoolFromDemand).mockClear();

    await clickDraftSetupButton(/Reroll generated players/i);

    await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 1
        && options.poolBalancePreset === "grounded"
        && options.poolSourceMode === "full-pool";
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reroll generated players/i })).not.toBeDisabled();
    });
    expect(capFitDiagnosticText()).toContain("Suggested Neutral Cap:");
    expect(capFitDiagnosticText()).toContain("advisory only");
    expect(saveLeagueTemplate).not.toHaveBeenCalled();
  }, 20_000);

  test("M1 applies THE MONEY and the recheck header follows the persisted cap", async () => {
    const unlockedPool = makePool({ locked: false });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({ pool: unlockedPool });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE MONEY")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("The money salary cap"), { target: { value: "900000" } });
    fireEvent.click(screen.getByRole("button", { name: /^APPLY$/i }));

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        salaryCap: 900_000,
      }));
    });

    mockLeagueData({ league: makeLeague({ salaryCap: 900_000 }), pool: unlockedPool });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/CAN EVERY CLUB BUILD A LEGAL 22 UNDER \$900,000/i)).toBeInTheDocument();
  });

  // SETUPTAX Item 3: the setup screens stop promising what settlement won't honor. THE MONEY
  // gains one ALWAYS-class line naming every club whose identity TARGET overshoots the cap once
  // tax is added -- reusing the SAME buildBest22Target results THE CLUB CHECK already computes,
  // not a new engine call. Not locked-gated (unlike the hard-cap solvency banner): tax insolvency
  // should surface as early as possible, before the pool is even locked.
  test("SETUPTAX: THE MONEY surfaces a TAX WATCH line for a club whose identity target overshoots the cap", async () => {
    vi.mocked(buildBest22Target)
      .mockReturnValueOnce(makeBest22Target())
      .mockReturnValueOnce(makeBest22Target({
        totalSalary: 970_000,
        totalTax: 330_000,
        allIn: 1_300_000,
        budget: 1_000_000,
        feasible: false,
      }));
    mockLeagueData({
      league: makeLeague({ teamIds: ["team-a"], draftPoolMode: "pool-first" }),
      teams: [makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") })],
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE MONEY")).toBeInTheDocument();
    expect(await screen.findByText("TAX WATCH: Caps — You — identity targets overshoot the cap after tax.")).toBeInTheDocument();
  });

  // SETUPTAX Item 4: analyzePoolFeasibility (poolFeasibility.ts) already builds each archetype's
  // roster and keeps `built.totalTax` on the feasibility result -- a SIBLING array on the same
  // PoolCompositionReport the outlook panel already reads -- it just never reached this line.
  // `evaluatePoolComposition` is mocked ONCE (mockResolvedValueOnce) so no other test in this
  // file's default-locked initial render can inherit this fixture's data.
  test("SETUPTAX: Archetype market outlook annotates a tax-owing archetype and leaves a tax-free one alone", async () => {
    const outlooks: ArchetypeCompletionOutlook[] = [
      {
        archetypeId: "murderers-row",
        archetypeName: "Murderers' Row",
        pLegalCompletion: 0.95,
        pIdentityCompletion: 0.95,
        bindingClass: null,
        note: null,
      },
      {
        archetypeId: "whiteyball",
        archetypeName: "Whiteyball",
        pLegalCompletion: 0.4,
        pIdentityCompletion: 0.4,
        bindingClass: "startable arms",
        note: "The market is tightest at startable arms — expect contested prices there.",
      },
    ];
    const feasibilityResults: ArchetypeFeasibility[] = [
      {
        archetypeId: "murderers-row",
        archetypeName: "Murderers' Row",
        support: "supported",
        built: {
          name: "Murderers' Row",
          totalIv: 1_000_000,
          totalSalary: 970_000,
          totalTax: 330_000,
          rosterSize: 22,
          solvent: false,
          legalRoster: true,
        },
        shortfalls: [],
        activationPrompt: null,
      },
      {
        archetypeId: "whiteyball",
        archetypeName: "Whiteyball",
        support: "thin",
        built: {
          name: "Whiteyball",
          totalIv: 800_000,
          totalSalary: 800_000,
          totalTax: 0,
          rosterSize: 22,
          solvent: true,
          legalRoster: true,
        },
        shortfalls: [],
        activationPrompt: null,
      },
    ];
    const composition: PoolCompositionReport = {
      demand: poolDemandModel(1, 0),
      feasibility: { tier: "standard", budget: 1_000_000, poolSize: 100, results: feasibilityResults },
      outlooks,
    };
    // Persistent (not `Once`): the composition effect can legitimately fire more than once
    // (dep-array settles after an initial render), and a stale `undefined` on a later call
    // would clobber the fixture. Reset at the end of this test so no LATER test's own
    // default-locked initial render can inherit this fixture's data.
    vi.mocked(evaluatePoolComposition).mockResolvedValue(composition);
    mockLeagueData({
      league: makeLeague({ teamIds: ["team-a"], draftPoolMode: "pool-first" }),
      // No identity on the club itself -- otherwise its own MLB/farm archetype badge (default
      // murderers-row/whiteyball) collides with this fixture's archetype names elsewhere on
      // the page. This test only needs the market-outlook panel, not a club identity.
      teams: [makeTeam("team-a", { mlbArchetypeKey: undefined, farmArchetypeKey: undefined })],
      pool: makePool({ locked: true }),
    });

    render(<LeagueBuilderDraftSetup />);

    // Scoped to the outlook panel itself: "Murderers' Row" also appears elsewhere on the page
    // (an unrelated draftability headline), so an unscoped screen-wide lookup is ambiguous.
    const outlookHeader = await screen.findByText(/Archetype market outlook/);
    const outlookPanel = outlookHeader.closest("div")!.parentElement!;
    const taxOwingRow = within(outlookPanel).getByText("Murderers' Row").closest("div");
    expect(within(taxOwingRow!).getByText(/~\$330,000 TAX AT TARGET/)).toBeInTheDocument();
    const taxFreeRow = within(outlookPanel).getByText("Whiteyball").closest("div");
    expect(within(taxFreeRow!).queryByText(/TAX AT TARGET/)).not.toBeInTheDocument();

    vi.mocked(evaluatePoolComposition).mockReset();
  });

  test("M2 THE MONEY uses the shared below-floor hard error and disables APPLY", async () => {
    mockLeagueData({ pool: makePool({ locked: false }) });
    render(<LeagueBuilderDraftSetup />);

    fireEvent.change(await screen.findByLabelText("The money salary cap"), { target: { value: String(SALARY_CAP_FLOOR - 1) } });

    expect(screen.getByText(salaryCapHardError(SALARY_CAP_FLOOR - 1)!)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^APPLY$/i })).toBeDisabled();
  });

  test("M3 resets THE MONEY to tier par", async () => {
    mockLeagueData({
      league: makeLeague({ salaryCap: 900_000 }),
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton(/RESET TO TIER/i);

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        salaryCap: undefined,
      }));
    });
  });

  test("M4-M6 extraction basis marks cap, dial, and identity drift without retro-nagging legacy pools", async () => {
    const extractedBasis = {
      cap: 1_000_000,
      poolSizeMultiplier: 1.35,
      identityByTeamId: { "team-a": "murderers-row", "team-b": "whiteyball" },
    };
    const staleLeague = makeLeague({
      draftPoolMode: "design-first",
      poolExtractedAt: "2026-01-02T00:00:00.000Z",
      poolExtractedBasis: extractedBasis,
      salaryCap: 900_000,
      poolSizeMultiplier: 1.5,
    });
    const teams = [
      makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      makeTeam("team-b", {
        mlbArchetypeKey: "murderers-row",
        rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
      }),
    ];
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({ league: staleLeague, teams, pool: makePool() });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/THE CAP MOVED \(\$1,000,000 → \$900,000\) SINCE THE POOL WAS DRAWN/i)).toBeInTheDocument();
    expect(screen.getByText("THE POOL-SIZE DIAL MOVED — RE-EXTRACT TO REDRAW.")).toBeInTheDocument();
    expect(screen.getByText("Keys CHANGED ITS IDENTITY — RE-EXTRACT TO RESTOCK FOR IT.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();

    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      ],
      pool: makePool(),
    });
    rerender(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.queryByText(/THE CAP MOVED/i)).not.toBeInTheDocument();
    });
  });

  test("M6b shill-count basis stales the pool and hides the healed sizing receipt", async () => {
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page&shills=1");
    const players = [
      ...makeLegalRosterPlayerSet("one", 10_000),
      ...makeLegalRosterPlayerSet("two", 10_000),
    ];
    const teams = [
      makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
    ];
    const staleLeague = makeLeague({
      draftPoolMode: "design-first",
      poolExtractedAt: "2026-01-02T00:00:00.000Z",
      poolExtractedBasis: {
        cap: 1_000_000,
        poolSizeMultiplier: 1.35,
        shills: 0,
        identityByTeamId: { "team-a": "murderers-row", "team-b": "murderers-row" },
      },
      salaryCap: 1_000_000,
      poolSizeMultiplier: 1.35,
    });
    const pool = makePool({
      locked: false,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({ league: staleLeague, teams, players, pool });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE SHILL COUNT MOVED — RE-EXTRACT TO REDRAW.")).toBeInTheDocument();
    await waitFor(() => {
      expect(extractPoolFromDemand).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Sized to .*added .* for affordability/i)).not.toBeInTheDocument();

    mockLeagueData({
      league: {
        ...staleLeague,
        poolExtractedBasis: {
          ...staleLeague.poolExtractedBasis!,
          shills: 1,
        },
      },
      teams,
      players,
      pool,
    });
    rerender(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.queryByText("THE SHILL COUNT MOVED — RE-EXTRACT TO REDRAW.")).not.toBeInTheDocument();
    });
    // CONTRACT_FLAKEFIX_2026-07-09: the healed "Sized to... for affordability" receipt is driven by
    // modeAReport, which resolves behind a 0ms setTimeout macrotask -- widen past RTL's default
    // 1000ms findBy budget so batch-load CPU contention can't outrun it.
    expect(await screen.findByText(/Sized to .*added .* for affordability/i, undefined, { timeout: 5000 })).toBeInTheDocument();
  });
});
