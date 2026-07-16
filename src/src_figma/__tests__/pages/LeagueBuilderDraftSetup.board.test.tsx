import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  LeagueBuilderDraftSetup,
} from "../../app/pages/LeagueBuilderDraftSetup";
import { buildBest22Target } from "../../../engines/best22Target";
import { rankAllArchetypesForPool } from "../../../engines/draftabilityRanker";
import { extractPoolFromDemand } from "../../../engines/poolFromDemand";
import { getAuctionSession, getMlbDraftSession, saveLeagueTemplate, saveTeam } from "../../../utils/leagueBuilderStorage";
import { resetCompletedDraftArc } from "../../../utils/leagueBuilderAuctionPipeline";
import {
  lockLeaguePool,
  unlockLeaguePool,
} from "../../../utils/leagueBuilderPoolBuilder";
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
  clickSlot,
  fiveGradedSsPlayers,
  globalBoardOrder,
  makeBest22Target,
  makeFinalizedDesignFirstPlayers,
  makeLeague,
  makeLegalRosterPlayerSet,
  makeLegalRosterPlayers,
  makeLockedRosterDesign,
  makePlayer,
  makePool,
  makeTeam,
  mockLeagueData,
  shortlistLines,
  type ExtractPoolOptions,
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

  test("COCKPIT WAVE 2: RANK YOUR BOARD scopes candidates to the pool (not the raw player set) and persists a reorder", async () => {
    const starSs = makePlayer(0, {
      id: "star-ss",
      firstName: "Star",
      lastName: "Short",
      primaryPosition: "SS",
      power: 99,
      contact: 99,
      speed: 99,
      fielding: 99,
      arm: 99,
    });
    const weakSs = makePlayer(1, {
      id: "weak-ss",
      firstName: "Weak",
      lastName: "Short",
      primaryPosition: "SS",
      power: 20,
      contact: 20,
      speed: 20,
      fielding: 20,
      arm: 20,
    });
    const outsideSs = makePlayer(2, {
      id: "outside-ss",
      firstName: "Outside",
      lastName: "Short",
      primaryPosition: "SS",
      power: 99,
      contact: 99,
      speed: 99,
      fielding: 99,
      arm: 99,
      leagueAssignments: [], // never joined this league's pool -- must never surface as a candidate
    });

    mockLeagueData({
      players: [starSs, weakSs, outsideSs],
      pool: makePool({
        players: [starSs, weakSs].map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await screen.findByText("3 · THE CLUBS");
    const boardButtons = await screen.findAllByRole("button", { name: "rank your board ›" });
    fireEvent.click(boardButtons[0]);

    const globalList = await screen.findByTestId("rank-your-board-global");
    expect(within(globalList).getByText("Star Short")).toBeInTheDocument();
    expect(within(globalList).getByText("Weak Short")).toBeInTheDocument();
    // UNIVERSE-FIX1 hard rule: automatic candidate feeds are pool-scoped, never the raw player set.
    expect(within(globalList).queryByText("Outside Short")).not.toBeInTheDocument();

    // Star clearly outranks Weak on raw valuation -- promoting Weak to #1 is a GM override.
    fireEvent.click(screen.getByRole("button", { name: "Move Weak Short up" }));

    // BOARDFIX2 (Item C): the reorder now lands in a local pending overlay instantly and
    // saveTeam only fires after the trailing debounce settles -- widen the wait past that delay.
    await waitFor(() => {
      expect(saveTeam).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "team-a",
          boardRankOverrides: { global: ["weak-ss", "star-ss"] },
        }),
      );
    }, { timeout: 2000 });
  });

  test("BOARDFIX1 wiring: RANK YOUR BOARD's global list supports native drag-and-drop reorder end to end (draggable rows, drag/drop events commit through onReorderGlobal)", async () => {
    const starSs = makePlayer(0, {
      id: "star-ss", firstName: "Star", lastName: "Short", primaryPosition: "SS",
      power: 99, contact: 99, speed: 99, fielding: 99, arm: 99,
    });
    const midSs = makePlayer(1, {
      id: "mid-ss", firstName: "Mid", lastName: "Short", primaryPosition: "SS",
      power: 60, contact: 60, speed: 60, fielding: 60, arm: 60,
    });
    const weakSs = makePlayer(2, {
      id: "weak-ss", firstName: "Weak", lastName: "Short", primaryPosition: "SS",
      power: 20, contact: 20, speed: 20, fielding: 20, arm: 20,
    });

    mockLeagueData({
      players: [starSs, midSs, weakSs],
      pool: makePool({
        players: [starSs, midSs, weakSs].map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);
    await screen.findByText("3 · THE CLUBS");
    fireEvent.click((await screen.findAllByRole("button", { name: "rank your board ›" }))[0]);

    const globalList = await screen.findByTestId("rank-your-board-global");
    const dragHandle = within(globalList).getByRole("button", { name: /Drag Weak Short/i });
    expect(dragHandle).toHaveAttribute("draggable", "true");

    const dropRow = within(globalList).getByText("Star Short").closest("div") as HTMLElement;
    const dataTransfer = { effectAllowed: "", setData: vi.fn() };
    fireEvent.dragStart(dragHandle, { dataTransfer });
    fireEvent.dragOver(dropRow, { dataTransfer });
    fireEvent.drop(dropRow, { dataTransfer });

    // BOARDFIX2 (Item C): widen past the trailing debounce (see the comment on the sibling test).
    await waitFor(() => {
      expect(saveTeam).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "team-a",
          boardRankOverrides: { global: ["weak-ss", "star-ss", "mid-ss"] },
        }),
      );
    }, { timeout: 2000 });
  });

  test("BOARDFIX1 repro: design-first — the extracted pool must reach the roster-designer shortlist and the rank-your-board zone once EXTRACT POOL has run, even before the pool is separately locked", async () => {
    const extractedPlayers = makeFinalizedDesignFirstPlayers(); // the drawn pool (55 players)
    const leftoverUniversePlayer = makePlayer(900, {
      id: "leftover-universe-ss",
      firstName: "Leftover",
      lastName: "Universe",
      primaryPosition: "SS",
      // Still part of the checked-league universe (no source-league restriction is set below, so
      // universePlayers = every player in `players`) but was NOT drawn into this league's pool by
      // EXTRACT POOL — must never surface on either ranking widget once the pool has been drawn.
      leagueAssignments: [],
    });
    const players = [...extractedPlayers, leftoverUniversePlayer];
    const extractedAt = "2026-01-05T00:00:00.000Z";
    const designLockedAt = "2026-01-01T00:00:00.000Z"; // predates extraction -- not stale

    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: extractedAt,
        modeAExtractedIds: extractedPlayers.map((player) => player.id),
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
      ],
      players,
      // The exact post-extraction review window JK described ("EXTRACT the pool -> open the club
      // editor's board tab (and the roster designer shortlists)") -- extracted, but the SEPARATE
      // pool-LOCK step has not happened yet.
      pool: makePool({
        locked: false,
        players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: extractedPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);
    await screen.findByText("3 · THE CLUBS");

    // Roster-designer shortlist (team-a): must scope to the extracted pool, not the universe.
    const designButtons = await screen.findAllByRole("button", { name: /design locked/i });
    fireEvent.click(designButtons[0]);
    clickSlot("SS");
    expect(shortlistLines().some((line) => line.includes("Leftover Universe"))).toBe(false);

    // Rank-your-board zone (team-a): same effective-pool rule, same widget family.
    const boardButtons = await screen.findAllByRole("button", { name: "rank your board ›" });
    fireEvent.click(boardButtons[0]);
    const globalList = await screen.findByTestId("rank-your-board-global");
    expect(within(globalList).queryByText("Leftover Universe")).not.toBeInTheDocument();

    // At this stage (pool extracted, not yet pool-locked), start-draft is correctly still
    // disabled -- pool-LOCK is a real, separate required step, not a bug.
    expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
  });

  test("BOARDFIX1: once the pool is ALSO locked (the one remaining required step), start-draft activates -- no separate stuck-start defect once the real workflow completes", async () => {
    const extractedPlayers = makeFinalizedDesignFirstPlayers(); // the drawn pool (55 players)
    const extractedAt = "2026-01-05T00:00:00.000Z";
    const designLockedAt = "2026-01-01T00:00:00.000Z"; // predates extraction -- not stale

    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: extractedAt,
        modeAExtractedIds: extractedPlayers.map((player) => player.id),
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
      ],
      players: extractedPlayers,
      pool: makePool({
        locked: true,
        players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: extractedPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });
  });

  // BOARDFIX2 (Item B): rank-edit lands at the displayed position. Root cause (confirmed via a
  // direct scratch call against the UNTOUCHED assembleBoard/sortByGmBlend engine function before
  // this lane's fix): the blend treats an explicit rank as a worth+rank NUDGE, not a positional
  // materialize -- ranking the objectively weakest of 5 candidates #1 rendered him at position 2,
  // not 1, because his worth deficit outweighed the bonus a rank-0 nudge grants. The fix
  // (materializeRankOrder in RankReorderList.tsx, applied at every board-rendering call site)
  // places override'd ids at their literal index and fills the rest in natural/worth order.
  describe("BOARDFIX2: rank-edit lands at the displayed position (Item B)", () => {
    test("GLOBAL: a mixed board (some explicitly ranked, the rest engine-ordered) renders overrides at their literal position and the rest by worth", async () => {
      const players = fiveGradedSsPlayers();
      mockLeagueData({
        teams: [
          makeTeam("team-a", { boardRankOverrides: { global: ["weak-ss", "star-ss"] } }),
          makeTeam("team-b"),
        ],
        players,
        pool: makePool({ players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })) }),
      });

      render(<LeagueBuilderDraftSetup />);
      await screen.findByText("3 · THE CLUBS");
      fireEvent.click((await screen.findAllByRole("button", { name: "rank your board ›" }))[0]);
      const globalList = await screen.findByTestId("rank-your-board-global");

      // "weak" and "star" are explicitly ranked (in that order); high/mid/low are the
      // engine-ordered rest, filled in by worth.
      expect(globalBoardOrder(globalList)).toEqual(["Weak Short", "Star Short", "High Short", "Mid Short", "Low Short"]);
    });

    test("GLOBAL: typing a target rank lands the player EXACTLY there, even against a large worth gap", async () => {
      const players = fiveGradedSsPlayers();
      mockLeagueData({
        players,
        pool: makePool({ players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })) }),
      });

      render(<LeagueBuilderDraftSetup />);
      await screen.findByText("3 · THE CLUBS");
      fireEvent.click((await screen.findAllByRole("button", { name: "rank your board ›" }))[0]);
      const globalList = await screen.findByTestId("rank-your-board-global");

      expect(globalBoardOrder(globalList)).toEqual(["Star Short", "High Short", "Mid Short", "Low Short", "Weak Short"]);

      // Rank Weak (objectively the worst by a mile) #1 by typing it in.
      fireEvent.click(within(globalList).getByRole("button", { name: "Set rank for Weak Short" }));
      const input = within(globalList).getByRole("spinbutton", { name: "Set rank for Weak Short" });
      fireEvent.change(input, { target: { value: "1" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(globalBoardOrder(globalList)).toEqual(["Weak Short", "Star Short", "High Short", "Mid Short", "Low Short"]);
      });

      // Repeated edit stays consistent: now move Low to #2 (arrows/badge share the same
      // materialize path -- verifies the FULL displayed order persists across successive edits,
      // not just the first).
      fireEvent.click(within(globalList).getByRole("button", { name: "Set rank for Low Short" }));
      const secondInput = within(globalList).getByRole("spinbutton", { name: "Set rank for Low Short" });
      fireEvent.change(secondInput, { target: { value: "2" } });
      fireEvent.keyDown(secondInput, { key: "Enter" });

      await waitFor(() => {
        expect(globalBoardOrder(globalList)).toEqual(["Weak Short", "Low Short", "Star Short", "High Short", "Mid Short"]);
      });

      // Moving DOWN lands exactly too (not just up): send Weak back down to rank 4.
      fireEvent.click(within(globalList).getByRole("button", { name: "Set rank for Weak Short" }));
      const thirdInput = within(globalList).getByRole("spinbutton", { name: "Set rank for Weak Short" });
      fireEvent.change(thirdInput, { target: { value: "4" } });
      fireEvent.keyDown(thirdInput, { key: "Enter" });

      await waitFor(() => {
        expect(globalBoardOrder(globalList)).toEqual(["Low Short", "Star Short", "High Short", "Weak Short", "Mid Short"]);
      });

      // Persistence follows the debounced flush (Item C) -- the FULL final order reaches saveTeam.
      await waitFor(() => {
        expect(saveTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "team-a",
            boardRankOverrides: { global: ["low-ss", "star-ss", "high-ss", "weak-ss", "mid-ss"] },
          }),
        );
      }, { timeout: 2000 });
    });

    test("PER-POSITION: typing a rank beyond the visible 5-deep window clamps to the last VISIBLE position, not the full list", async () => {
      const players = [
        ...fiveGradedSsPlayers(),
        makePlayer(5, { id: "extra-ss", firstName: "Extra", lastName: "Short", primaryPosition: "SS", power: 10, contact: 10, speed: 10, fielding: 10, arm: 10 }),
      ];
      mockLeagueData({
        players,
        pool: makePool({ players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })) }),
      });

      render(<LeagueBuilderDraftSetup />);
      await screen.findByText("3 · THE CLUBS");
      fireEvent.click((await screen.findAllByRole("button", { name: "rank your board ›" }))[0]);
      fireEvent.click(await screen.findByRole("button", { name: "PER-POSITION" }));
      const positionList = await screen.findByTestId("rank-your-board-position");

      // Only the top 5 (of 6) are visible by default -- "Extra Short" (weakest) is folded.
      expect(globalBoardOrder(positionList)).toEqual(["Star Short", "High Short", "Mid Short", "Low Short", "Weak Short"]);

      // Typing 99 on the visible #1 clamps to the last VISIBLE slot (5), not the full list (6).
      fireEvent.click(within(positionList).getByRole("button", { name: "Set rank for Star Short" }));
      const input = within(positionList).getByRole("spinbutton", { name: "Set rank for Star Short" });
      fireEvent.change(input, { target: { value: "99" } });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(() => {
        expect(globalBoardOrder(positionList)).toEqual(["High Short", "Mid Short", "Low Short", "Weak Short", "Star Short"]);
      });
      // Confirms the hidden 6th player's rank was never disturbed by a visible-window edit --
      // persisted via the SAME stable-remainder mechanism BOARDFIX1 already proved.
      await waitFor(() => {
        expect(saveTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "team-a",
            boardRankOverrides: {
              byPosition: { SS: ["high-ss", "mid-ss", "low-ss", "weak-ss", "star-ss", "extra-ss"] },
            },
          }),
        );
      }, { timeout: 2000 });
    });
  });

  // BOARDFIX2 (Item C): reorders update a LOCAL pending overlay instantly; the actual saveTeam
  // write is debounced (trailing ~500ms -- BOARD_RANK_SAVE_DEBOUNCE_MS) so a burst of rapid moves
  // settles into ONE write, not one per click. Before this fix, every click awaited saveTeam then
  // called replaceTeamsLocal synchronously, which reference-invalidated leagueTeams/humanTeams and
  // retriggered every downstream memo keyed on them (see the liveClubVerdicts effect fix, now keyed
  // on the content-based clubTargetDesignKey instead).
  describe("BOARDFIX2: instant reorders with debounced persistence (Item C)", () => {
    test("a burst of 5 rapid moves calls saveTeam ONCE after the debounce settles, not once per move", async () => {
      const players = fiveGradedSsPlayers();
      mockLeagueData({
        players,
        pool: makePool({ players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })) }),
      });

      render(<LeagueBuilderDraftSetup />);
      await screen.findByText("3 · THE CLUBS");
      fireEvent.click((await screen.findAllByRole("button", { name: "rank your board ›" }))[0]);
      const globalList = await screen.findByTestId("rank-your-board-global");

      // Fake timers ONLY from here -- the async findBy*/waitFor navigation above relies on real
      // timers to poll; switching before the burst avoids hanging RTL's own internal polling.
      vi.useFakeTimers();
      try {
        // "Mid Short" starts at rank 3 -- oscillate up/down/up/down/up (5 moves, never touching a
        // boundary) to simulate a realistic rapid-click burst without any click landing on a
        // disabled arrow.
        const clickSequence = ["up", "down", "up", "down", "up"] as const;
        for (const direction of clickSequence) {
          fireEvent.click(within(globalList).getByRole("button", { name: `Move Mid Short ${direction}` }));
        }

        // Still within the debounce window -- nothing persisted yet despite 5 moves.
        expect(saveTeam).not.toHaveBeenCalled();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(700);
        });

        expect(saveTeam).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    // TEXTLAW-SWEEP Item C: pendingBoardRankOverrides is a SINGLE slot. Reordering club A's board,
    // then switching to club B and reordering ITS board inside the same 500ms debounce window,
    // must not silently drop club A's edit. Pre-fix, the debounce effect's cleanup only cleared
    // the stale timer when a different club's pending replaced it -- club A's last edit was never
    // flushed. This is the repro named in the contract; run it against unmodified code first to
    // prove the failure, then again after the fix to prove it passes.
    test("TEXTLAW-SWEEP Item C repro: an unflushed edit from an outgoing club must not be dropped when a different club's edit lands inside the same debounce window", async () => {
      const players = fiveGradedSsPlayers();
      mockLeagueData({
        players,
        pool: makePool({ players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })) }),
      });

      render(<LeagueBuilderDraftSetup />);
      await screen.findByText("3 · THE CLUBS");
      const boardButtons = await screen.findAllByRole("button", { name: "rank your board ›" });

      fireEvent.click(boardButtons[0]);
      const globalListA = await screen.findByTestId("rank-your-board-global");
      expect(globalBoardOrder(globalListA)).toEqual(["Star Short", "High Short", "Mid Short", "Low Short", "Weak Short"]);

      // Fake timers ONLY from here -- see the rationale on the sibling burst test above.
      vi.useFakeTimers();
      try {
        // Club A: one edit starts A's debounce timer, unflushed.
        fireEvent.click(within(globalListA).getByRole("button", { name: "Move Mid Short up" }));

        // Switch to club B INSIDE the debounce window and edit there too -- the single
        // pendingBoardRankOverrides slot now has to hand off from A to B before A ever saved.
        fireEvent.click(boardButtons[1]);
        const globalListB = screen.getByTestId("rank-your-board-global");
        fireEvent.click(within(globalListB).getByRole("button", { name: "Move Low Short up" }));

        // Let every debounce window fully settle.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(700);
        });

        // Both clubs' edits must reach saveTeam. Pre-fix, club A's is silently dropped because its
        // timer was cancelled (by club B's edit replacing the pending slot) with no flush.
        expect(saveTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "team-a",
            boardRankOverrides: { global: ["star-ss", "mid-ss", "high-ss", "low-ss", "weak-ss"] },
          }),
        );
        expect(saveTeam).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "team-b",
            boardRankOverrides: { global: ["star-ss", "high-ss", "low-ss", "mid-ss", "weak-ss"] },
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // BOARDFIX2 (Item A): the readiness panel enumerates EVERY currently-true blocker across LOCK
  // POOL and START THE DRAFT as its own plain-language line, always visible near "5 · THE FLOOR"
  // -- replacing the previous single ~11px startBlocker line that showed only the first-priority
  // reason. Happy path -> the panel is absent entirely.
  //
  // CONTRACT_FLAKEFIX_2026-07-09: the panel mounts on the FIRST render with a transient
  // "Checking for a saved auction before allowing pool edits." reason (readinessReasons always
  // includes it until savedDraftChecked flips) and only swaps to its real reason(s) after that
  // async check resolves. `await screen.findByTestId("draft-readiness-panel")` can therefore
  // resolve on that transient first paint; a SYNCHRONOUS `within(panel).getByText(...)` read right
  // after it races the real content. Every content assertion in this describe block (and in the
  // STALEPARITY describe below, which shares the same panel) now uses the retry-style
  // `within(panel).findByText(...)` so it waits for the settled, final content instead.
  describe("BOARDFIX2: the readiness panel (Item A)", () => {
    test("happy path: once every gate is satisfied, the readiness panel renders nothing", async () => {
      const extractedPlayers = makeFinalizedDesignFirstPlayers();
      const extractedAt = "2026-01-05T00:00:00.000Z";
      const designLockedAt = "2026-01-01T00:00:00.000Z";
      mockLeagueData({
        league: makeLeague({
          draftPoolMode: "design-first",
          poolExtractedAt: extractedAt,
          modeAExtractedIds: extractedPlayers.map((player) => player.id),
        }),
        teams: [
          makeTeam("team-a", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
          makeTeam("team-b", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
        ],
        players: extractedPlayers,
        pool: makePool({
          locked: true,
          players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: extractedPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
      }, { timeout: 5000 });
      expect(screen.queryByTestId("draft-readiness-panel")).not.toBeInTheDocument();
    });

    test("names every club still missing an MLB/farm identity", async () => {
      const extractedPlayers = makeFinalizedDesignFirstPlayers();
      const extractedAt = "2026-01-05T00:00:00.000Z";
      const designLockedAt = "2026-01-01T00:00:00.000Z";
      mockLeagueData({
        league: makeLeague({
          draftPoolMode: "design-first",
          poolExtractedAt: extractedAt,
          modeAExtractedIds: extractedPlayers.map((player) => player.id),
        }),
        teams: [
          makeTeam("team-a", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
          makeTeam("team-b", {
            rosterDesign: makeLockedRosterDesign(designLockedAt),
            farmArchetypeKey: undefined,
          }),
        ],
        players: extractedPlayers,
        pool: makePool({
          locked: true,
          players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: extractedPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      expect(await within(panel).findByText(/Keys — Player 2 \(needs farm\)/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });

    test("names every club whose design isn't locked yet", async () => {
      mockLeagueData({
        league: makeLeague({ draftPoolMode: "design-first" }),
        teams: [
          makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
          makeTeam("team-b"), // no rosterDesign -- not locked
        ],
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      expect(await within(panel).findByText(/1 of 2 club designs not locked yet — waiting on Keys — Player 2/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });

    test("once every design is locked but the pool is only extracted (not yet locked), says so plainly", async () => {
      const extractedPlayers = makeFinalizedDesignFirstPlayers();
      const extractedAt = "2026-01-05T00:00:00.000Z";
      const designLockedAt = "2026-01-01T00:00:00.000Z";
      mockLeagueData({
        league: makeLeague({
          draftPoolMode: "design-first",
          poolExtractedAt: extractedAt,
          modeAExtractedIds: extractedPlayers.map((player) => player.id),
        }),
        teams: [
          makeTeam("team-a", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
          makeTeam("team-b", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
        ],
        players: extractedPlayers,
        pool: makePool({
          locked: false,
          players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: extractedPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      expect(await within(panel).findByText(/extracted but not locked yet — LOCK POOL/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });

    test("names a locked pool that falls short of the required floor", async () => {
      const smallPool = makeFinalizedDesignFirstPlayers().slice(0, 8);
      const extractedAt = "2026-01-05T00:00:00.000Z";
      const designLockedAt = "2026-01-01T00:00:00.000Z";
      mockLeagueData({
        league: makeLeague({
          draftPoolMode: "design-first",
          poolExtractedAt: extractedAt,
          modeAExtractedIds: smallPool.map((player) => player.id),
        }),
        teams: [
          makeTeam("team-a", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
          makeTeam("team-b", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
        ],
        players: smallPool,
        pool: makePool({
          locked: true,
          players: smallPool.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: smallPool.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      // CONTRACT_FIXTUREFIX_2026-07-09: POOLFLOOR (CONTRACT_POOLFLOOR_2026-07-09.md) gave the
      // sufficiency gate a structured per-position reason -- for this 8-player pool (one of each
      // of the 8 field positions, no depth) the FIRST failing floor is the field-position catcher
      // count (1 available for 2 clubs), so the specific "THE POOL IS SHORT ON CATCHERS..." line
      // now legitimately displaces the old generic "short of what the draft needs" fallback (that
      // fallback only renders when positionFloorReasons is empty -- see positionFloorReadinessLine
      // in LeagueBuilderDraftSetup.tsx). This is real, observed copy, not a guess.
      expect(await within(panel).findByText(/THE POOL IS SHORT ON CATCHERS — 1 FOR 2 CLUBS; RE-EXTRACT\./i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });

    test("REAL-BLOCKER HUNT: a locked pool that goes stale AFTER lock (shill count changed since the extract) is a genuine sequence BOARDFIX1's happy-path tests never modeled", async () => {
      // EXTRACT -> LOCK POOL -> a basis input (shills) moves afterward. `poolTrailing` correctly
      // still gates startReady here (confirmed: this is NOT a bug -- the pool genuinely no longer
      // matches the live basis). The pre-existing explanation for this lived only in the "4 · THE
      // POOL" zone's own contextual banner and the tiny single-line startBlocker note; the new
      // panel surfaces the SAME specific reason prominently right next to START THE DRAFT, where
      // JK's literal complaint ("no way to start the draft") was actually looking.
      const extractedPlayers = makeFinalizedDesignFirstPlayers();
      const extractedAt = "2026-01-05T00:00:00.000Z";
      const designLockedAt = "2026-01-01T00:00:00.000Z";
      mockLeagueData({
        league: makeLeague({
          draftPoolMode: "design-first",
          poolExtractedAt: extractedAt,
          modeAExtractedIds: extractedPlayers.map((player) => player.id),
          salaryCap: 1_064_387,
          draftShillCount: 3, // moved AFTER the pool was drawn+locked
          poolExtractedBasis: {
            cap: 1_064_387,
            poolSizeMultiplier: 1.25,
            shills: 0,
            identityByTeamId: { "team-a": "murderers-row", "team-b": "murderers-row" },
          },
        }),
        teams: [
          makeTeam("team-a", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
          makeTeam("team-b", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
        ],
        players: extractedPlayers,
        pool: makePool({
          locked: true,
          players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: extractedPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      expect(await within(panel).findByText(/THE SHILL COUNT MOVED/i)).toBeInTheDocument();
      expect(await within(panel).findByText(/the pool is locked but the plan changed since — UNLOCK, re-extract, then re-lock/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });

    test("REAL-BLOCKER HUNT: a completed (not run-back) draft resolves cleanly -- no hidden residue blocks a fresh start when every gate is otherwise satisfied", async () => {
      const extractedPlayers = makeFinalizedDesignFirstPlayers();
      const extractedAt = "2026-01-05T00:00:00.000Z";
      const designLockedAt = "2026-01-01T00:00:00.000Z";
      vi.mocked(getAuctionSession).mockResolvedValue({ session: { state: "AUCTION_COMPLETE" } } as unknown as Awaited<ReturnType<typeof getAuctionSession>>);
      mockLeagueData({
        league: makeLeague({
          draftPoolMode: "design-first",
          poolExtractedAt: extractedAt,
          modeAExtractedIds: extractedPlayers.map((player) => player.id),
        }),
        teams: [
          makeTeam("team-a", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
          makeTeam("team-b", { rosterDesign: makeLockedRosterDesign(designLockedAt) }),
        ],
        players: extractedPlayers,
        pool: makePool({
          locked: true,
          players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: extractedPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^START THE DRAFT$/i })).toBeEnabled();
      }, { timeout: 5000 });
      expect(screen.queryByTestId("draft-readiness-panel")).not.toBeInTheDocument();
    });

    test("pool-first: a supply-shape-blocked pool names the missing position floors, not the cap (BLOCKFIX 2026-07-12)", async () => {
      // One legal 22 for 2 clubs: the seat check fails on SHAPE (44 slots, 22 bodies), and the
      // whole app universe is the same 22 — so no cap raise can ever fix it. The old copy said
      // "add players or raise the cap" (JK's SML repro: 1.2M -> 10M changed nothing); the new
      // copy must name the missing floors and say the SOURCE UNIVERSE is what's short.
      const expensivePlayers = makeLegalRosterPlayers(2_000_000);
      mockLeagueData({
        league: makeLeague({ draftPoolMode: "pool-first", salaryCap: 1_000_000 }),
        players: expensivePlayers,
        pool: makePool({
          locked: false,
          players: expensivePlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: expensivePlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      expect(await within(panel).findByText(/The source universe itself is short on .*CATCHERS/i)).toBeInTheDocument();
      expect(within(panel).queryByText(/raise the cap/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });

    test("pool-first: a genuinely cap-blocked pool (positions covered, priced over cap) still points at the cap (BLOCKFIX 2026-07-12)", async () => {
      // Same floor-complete 55-player shape the design-first fixture uses, repriced so every legal
      // 22 costs 2.2M against a 1M cap: the seat check fails on BUDGET (failing.overrun), every
      // position floor is met, so the cap advice is the honest one here.
      const cappedPlayers = makeFinalizedDesignFirstPlayers().map((player) => ({ ...player, salary: 100_000 }));
      mockLeagueData({
        league: makeLeague({ draftPoolMode: "pool-first", salaryCap: 1_000_000 }),
        players: cappedPlayers,
        pool: makePool({
          locked: false,
          players: cappedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: cappedPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      expect(await within(panel).findByText(/doesn't fit under the cap for every club — raise the cap or add cheaper players/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });

    test("pool-first: a pool that hasn't been locked yet (and can legally seat every club) gets the generic lock instruction", async () => {
      const legalPlayers = [
        ...makeLegalRosterPlayerSet("one", 10_000),
        ...makeLegalRosterPlayerSet("two", 10_000),
      ];
      mockLeagueData({
        league: makeLeague({ draftPoolMode: "pool-first" }),
        players: legalPlayers,
        pool: makePool({
          locked: false,
          players: legalPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: legalPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      expect(await within(panel).findByText(/pool hasn't been locked yet — LOCK POOL/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });
  });

  // CONTRACT_STALEPARITY_2026-07-09: pool-first mode has ZERO staleness net today -- it stores no
  // basis snapshot at all, basisStaleLines is hard-gated to design-first, and startReady never
  // consults poolTrailing for pool-first. These three repros are written to FAIL against the
  // pre-fix code (see the repro-commit evidence appended to the contract) and PASS once pool-first
  // gets the same basis-snapshot-at-lock + detector + readinessReasons wiring design-first already
  // has.
  describe("STALEPARITY: pool-first gets the same staleness net design-first already has", () => {
    test("REPRO (a): pool-first identity drift after lock names the club and blocks Start Draft", async () => {
      const extractedPlayers = makeFinalizedDesignFirstPlayers();
      const extractedAt = "2026-01-05T00:00:00.000Z";
      mockLeagueData({
        league: makeLeague({
          draftPoolMode: "pool-first",
          salaryCap: 1_064_387,
          poolExtractedAt: extractedAt,
          poolExtractedBasis: {
            cap: 1_064_387,
            poolSizeMultiplier: 1.25,
            shills: 0,
            identityByTeamId: { "team-a": "murderers-row", "team-b": "murderers-row" },
          },
        }),
        teams: [
          makeTeam("team-a"),
          makeTeam("team-b", { mlbArchetypeKey: "whiteyball" }), // drifted since the pool was locked
        ],
        players: extractedPlayers,
        pool: makePool({
          locked: true,
          players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: extractedPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      // Bulleted as "• {reason}" -- two sibling text nodes, so an exact-string match fails even
      // though the text is right there (this panel's OWN convention across every other test in
      // this describe block uses a regex for that reason -- see the "pool-first: names a pool..."
      // tests above).
      expect(await within(panel).findByText(/Keys CHANGED ITS IDENTITY — RE-EXTRACT TO RESTOCK FOR IT\./)).toBeInTheDocument();
      expect(await within(panel).findByText(/the pool is locked but the plan changed since/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });

    test("REPRO (b): a fresh mount whose live pool-quality/balance dials default away from what locked the pool trips staleness lines", async () => {
      const extractedPlayers = makeFinalizedDesignFirstPlayers();
      const extractedAt = "2026-01-05T00:00:00.000Z";
      mockLeagueData({
        league: makeLeague({
          draftPoolMode: "pool-first",
          salaryCap: 1_064_387,
          poolExtractedAt: extractedAt,
          poolExtractedBasis: {
            cap: 1_064_387,
            poolSizeMultiplier: 1.25,
            shills: 0,
            identityByTeamId: { "team-a": "murderers-row", "team-b": "murderers-row" },
            // Locked when the dials sat at 74 / grounded. A fresh mount with empty session
            // storage (a different device, a cleared browser, a second tab) defaults live state
            // back to 68 / balanced -- silent drift the pre-fix code never captures or detects.
            poolQualityCenter: 74,
            poolBalancePreset: "grounded",
          },
        }),
        teams: [makeTeam("team-a"), makeTeam("team-b")],
        players: extractedPlayers,
        pool: makePool({
          locked: true,
          players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: extractedPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      expect(await within(panel).findByText(/THE POOL QUALITY DIAL MOVED — RE-EXTRACT TO REDRAW\./)).toBeInTheDocument();
      expect(await within(panel).findByText(/THE POOL BALANCE DIAL MOVED — RE-EXTRACT TO REDRAW\./)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });

    test("REPRO (c): a chosen pool-balance preset survives a remount instead of silently resetting to Balanced", async () => {
      const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
        makeLegalRosterPlayerSet(prefix, 10_000),
      );
      mockLeagueData({
        league: makeLeague({
          teamIds: ["team-a", "team-b", "team-c", "team-d"],
          draftPoolMode: "pool-first",
        }),
        teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
        players: currentPlayers,
        pool: makePool({
          locked: false,
          players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: currentPlayers.length,
        }),
      });

      const { unmount } = render(<LeagueBuilderDraftSetup />);

      await clickDraftSetupButton(/^Grounded$/i);
      await waitFor(() => {
        expect(window.sessionStorage.getItem("kbl:draft-pool-balance-preset:league-page:auction:pool-first")).toBe("grounded");
      });

      unmount();
      vi.mocked(extractPoolFromDemand).mockClear();

      render(<LeagueBuilderDraftSetup />);
      await clickDraftSetupButton(/Regenerate production-shaped pool/i);

      await waitFor(() => {
        expect(extractPoolFromDemand).toHaveBeenCalled();
      });
      const options = vi.mocked(extractPoolFromDemand).mock.calls.at(-1)?.[4] as { poolBalancePreset?: string };
      expect(options.poolBalancePreset).toBe("grounded");
    });

    test("REPRO (d): asynchronously resolving the active league preserves every keyed setup preference", async () => {
      const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
        makeLegalRosterPlayerSet(prefix, 10_000),
      );
      window.sessionStorage.setItem("kbl:draft-pool-source-mode:league-page:auction:pool-first", "full-pool");
      window.sessionStorage.setItem("kbl:draft-pool-quality-center:league-page:auction:pool-first", "74");
      window.sessionStorage.setItem("kbl:draft-pool-balance-preset:league-page:auction:pool-first", "grounded");
      window.sessionStorage.setItem("kbl:draft-reserve-price-k:league-page:auction:pool-first", "0.8");
      window.sessionStorage.setItem("kbl:draft-identity-auto-fill-nonce:league-page", "7");
      mockLeagueData({
        league: makeLeague({
          teamIds: ["team-a", "team-b", "team-c", "team-d"],
          draftPoolMode: "pool-first",
        }),
        teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
        players: currentPlayers,
        pool: makePool({
          locked: false,
          players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: currentPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);
      await clickDraftSetupButton(/Regenerate production-shaped pool/i);

      await waitFor(() => expect(extractPoolFromDemand).toHaveBeenCalled());
      const options = vi.mocked(extractPoolFromDemand).mock.calls.at(-1)?.[4] as ExtractPoolOptions;
      expect(options.poolSourceMode).toBe("full-pool");
      expect(options.poolQualityCenter).toBe(74);
      expect(options.poolBalancePreset).toBe("grounded");
      expect(window.sessionStorage.getItem("kbl:draft-reserve-price-k:league-page:auction:pool-first")).toBe("0.8");
      expect(window.sessionStorage.getItem("kbl:draft-identity-auto-fill-nonce:league-page")).toBe("7");
    });

    test("SURPRISE FIX: switching pool-first (with lock residue) to design-first clears the basis instead of leaking it across modes", async () => {
      // The pre-existing handlePoolModeChange only cleared poolExtractedAt/poolExtractedBasis when
      // SWITCHING TO pool-first -- safe under the old regime because pool-first never wrote those
      // fields. Once pool-first also snapshots a basis at LOCK time (this contract's Item 1), the
      // asymmetric clear becomes a real cross-mode leak: unlock a pool-first pool that was once
      // locked, switch to design-first, and design-first inherits a basis it never actually built.
      const residueLeague = makeLeague({
        draftPoolMode: "pool-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        poolExtractedBasis: {
          cap: 1_000_000,
          poolSizeMultiplier: 1.25,
          shills: 0,
          identityByTeamId: { "team-a": "murderers-row", "team-b": "murderers-row" },
        },
        modeAExtractedIds: ["some-id"],
      });
      mockLeagueData({
        league: residueLeague,
        teams: [makeTeam("team-a"), makeTeam("team-b")],
        pool: makePool({ locked: false }),
      });

      render(<LeagueBuilderDraftSetup />);

      fireEvent.click(await screen.findByRole("button", { name: /^Design first$/i }));

      await waitFor(() => {
        expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
          draftPoolMode: "design-first",
          poolExtractedAt: undefined,
          poolExtractedBasis: undefined,
          modeAExtractedIds: undefined,
        }));
      });
    });

    test("BACK-COMPAT: a basis saved before poolQualityCenter/poolBalancePreset existed never retro-nags even when the live dials sit off their defaults", async () => {
      // Both fields are undefined-guarded in poolBasisStaleLines (same treatment as `shills`
      // already gets) -- a pre-feature basis (design-first OR pool-first) must stay quiet even
      // when the LIVE quality/balance dials genuinely differ from the hardcoded defaults the old
      // basis implicitly assumed.
      const extractedPlayers = makeFinalizedDesignFirstPlayers();
      const extractedAt = "2026-01-05T00:00:00.000Z";
      window.sessionStorage.setItem("kbl:draft-pool-quality-center:league-page:auction:pool-first", "76");
      window.sessionStorage.setItem("kbl:draft-pool-balance-preset:league-page:auction:pool-first", "juiced");
      mockLeagueData({
        league: makeLeague({
          draftPoolMode: "pool-first",
          salaryCap: 1_064_387,
          poolExtractedAt: extractedAt,
          poolExtractedBasis: {
            // Legacy shape: no poolQualityCenter, no poolBalancePreset -- exactly what a
            // pre-STALEPARITY pool-first basis (or an old design-first one) looked like.
            cap: 1_064_387,
            poolSizeMultiplier: 1.25,
            shills: 0,
            identityByTeamId: { "team-a": "murderers-row", "team-b": "murderers-row" },
          },
        }),
        teams: [makeTeam("team-a"), makeTeam("team-b")],
        players: extractedPlayers,
        pool: makePool({
          locked: true,
          players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
          totalSlots: extractedPlayers.length,
        }),
      });

      render(<LeagueBuilderDraftSetup />);

      // CONTRACT_FLAKEFIX_2026-07-09: widen to match this describe block's own sibling tests
      // (the happy-path and completed-draft cases above both already use {timeout: 5000} for this
      // exact assertion) so batch-load CPU contention can't outrun RTL's default 1000ms budget.
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
      }, { timeout: 5000 });
      expect(screen.queryByTestId("draft-readiness-panel")).not.toBeInTheDocument();
      expect(screen.queryByText(/THE POOL QUALITY DIAL MOVED/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/THE POOL BALANCE DIAL MOVED/i)).not.toBeInTheDocument();
    });

    // CONTRACT_FLAKEFIX_2026-07-09 (deliverable item 3): the STALEPARITY repros above prove
    // pool-first DETECTS drift and BLOCKS start, and "SURPRISE FIX" proves a mode switch clears a
    // leaked basis -- but nothing yet proves the ordinary UNLOCK -> re-LOCK cycle (no mode switch)
    // actually clears the staleness net once the plan is locked back in. handleLock re-snapshots
    // poolExtractedAt/poolExtractedBasis from the CURRENT live state every time it runs (see
    // handleLock in LeagueBuilderDraftSetup.tsx), so relocking against the now-current plan should
    // heal the net even though the drifted identity itself never reverted.
    test("unlock -> relock clears the pool-first staleness net once the plan re-matches", async () => {
      const extractedPlayers = makeFinalizedDesignFirstPlayers();
      const extractedAt = "2026-01-05T00:00:00.000Z";
      const matchedBasis = {
        cap: 1_064_387,
        poolSizeMultiplier: 1.25,
        shills: 0,
        identityByTeamId: { "team-a": "murderers-row", "team-b": "murderers-row" },
      };
      const league = makeLeague({
        draftPoolMode: "pool-first",
        salaryCap: 1_064_387,
        poolExtractedAt: extractedAt,
        poolExtractedBasis: matchedBasis,
      });
      const lockedPool = makePool({
        locked: true,
        players: extractedPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: extractedPlayers.length,
      });
      const teams = [makeTeam("team-a"), makeTeam("team-b", { mlbArchetypeKey: "murderers-row" })];
      mockLeagueData({ league, teams, players: extractedPlayers, pool: lockedPool });

      const { rerender } = render(<LeagueBuilderDraftSetup />);

      // Sanity: basis matches the live plan -- start ready, no staleness net yet.
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
      }, { timeout: 5000 });
      expect(screen.queryByTestId("draft-readiness-panel")).not.toBeInTheDocument();

      // Drift a basis input: team-b's identity moves after the pool was locked.
      const driftedTeams = [teams[0], { ...teams[1], mlbArchetypeKey: "whiteyball" }];
      mockLeagueData({ league, teams: driftedTeams, players: extractedPlayers, pool: lockedPool });
      rerender(<LeagueBuilderDraftSetup />);

      const panel = await screen.findByTestId("draft-readiness-panel");
      expect(await within(panel).findByText(/Keys CHANGED ITS IDENTITY — RE-EXTRACT TO RESTOCK FOR IT\./)).toBeInTheDocument();
      expect(await within(panel).findByText(/the pool is locked but the plan changed since — UNLOCK, re-extract, then re-lock/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();

      // UNLOCK -- flips the pool record's local `locked` state without touching the league basis.
      vi.mocked(unlockLeaguePool).mockResolvedValue({ ...lockedPool, locked: false });
      fireEvent.click(await screen.findByRole("button", { name: /^UNLOCK$/i }));
      await waitFor(() => {
        expect(unlockLeaguePool).toHaveBeenCalledWith("league-page");
      });

      // RE-LOCK -- pool-first's handleLock re-snapshots poolExtractedAt/poolExtractedBasis from
      // the NOW-current (drifted) live state, exactly like the very first lock did.
      vi.mocked(saveLeagueTemplate).mockClear();
      vi.mocked(lockLeaguePool).mockResolvedValue(lockedPool);
      fireEvent.click(await screen.findByRole("button", { name: /^LOCK POOL$/i }));

      await waitFor(() => {
        expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
          poolExtractedBasis: expect.objectContaining({
            identityByTeamId: { "team-a": "murderers-row", "team-b": "whiteyball" },
          }),
        }));
      });
      const relockCall = vi.mocked(saveLeagueTemplate).mock.calls.at(-1)?.[0];
      const relockedBasis = relockCall?.poolExtractedBasis;
      const relockedAt = relockCall?.poolExtractedAt;

      // Simulate the fresh read the app performs after a save (replaceLeagueLocal is a test-mock
      // no-op here, so the app's own re-fetch/rerender path is reproduced explicitly): mount with
      // the freshly re-snapshotted basis and confirm the staleness net has genuinely cleared.
      mockLeagueData({
        league: { ...league, poolExtractedAt: relockedAt, poolExtractedBasis: relockedBasis },
        teams: driftedTeams,
        players: extractedPlayers,
        pool: lockedPool,
      });
      rerender(<LeagueBuilderDraftSetup />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
      }, { timeout: 5000 });
      expect(screen.queryByTestId("draft-readiness-panel")).not.toBeInTheDocument();
      expect(screen.queryByText(/CHANGED ITS IDENTITY/i)).not.toBeInTheDocument();
    });
  });
});
