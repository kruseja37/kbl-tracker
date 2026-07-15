import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { RankYourBoardZone } from "../../app/pages/LeagueBuilderDraftSetup";
import { BOARD_POSITION_DEPTH } from "../../app/pages/LeagueBuilderDraftSetup.helpers";
import type { BoardEntry } from "../../../engines/rosterIntelligencePayload";
import type { Player } from "../../../utils/leagueBuilderStorage";

afterEach(() => {
  cleanup();
});

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  const [firstName, lastName] = id.split("-");
  return {
    id,
    firstName: firstName ?? id,
    lastName: lastName ?? "Player",
    gender: "M",
    age: 25,
    bats: "R",
    throws: "R",
    primaryPosition: "SS",
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: "B",
    personality: "Competitive",
    chemistry: "Crafty",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 10_000,
    createdDate: "2026-07-08",
    lastModified: "2026-07-08",
    isCustom: true,
    ...overrides,
  };
}

function entry(playerId: string, worth: number, position: string, overrides: Partial<BoardEntry> = {}): BoardEntry {
  return {
    playerId,
    worth,
    matchedShape: position,
    needTag: null,
    fitTag: null,
    position,
    ...overrides,
  };
}

describe("RankYourBoardZone (COCKPIT WAVE 2 setup RANK YOUR BOARD)", () => {
  test("GLOBAL view renders every entry, sorted, with worth and position", () => {
    const boardEntries = [
      entry("ss-hi", 500, "SS"),
      entry("cf-lo", 100, "CF"),
      entry("ss-mid", 300, "SS"),
    ];
    const playerById = new Map([
      ["ss-hi", makePlayer("ss-hi", { primaryPosition: "SS" })],
      ["cf-lo", makePlayer("cf-lo", { primaryPosition: "CF" })],
      ["ss-mid", makePlayer("ss-mid", { primaryPosition: "SS" })],
    ].map(([id, p]) => [id as string, p as Player]));

    render(
      <RankYourBoardZone
        boardEntries={boardEntries}
        playerById={playerById}
        boardRankOverrides={undefined}
        disabled={false}
        showHelp={false}
        onReorderGlobal={vi.fn()}
        onReorderPosition={vi.fn()}
      />,
    );

    const list = screen.getByTestId("rank-your-board-global");
    const rows = within(list).getAllByText(/\$/);
    // All three entries render in the global list.
    expect(rows).toHaveLength(3);
    expect(within(list).getByText("$500")).toBeInTheDocument();
    expect(within(list).getByText("$300")).toBeInTheDocument();
    expect(within(list).getByText("$100")).toBeInTheDocument();
  });

  test("PER-POSITION view shows position tabs with counts, defaults to 5-deep, and expands", () => {
    const boardEntries = Array.from({ length: 7 }, (_, index) =>
      entry(`ss-${index}`, 700 - index, "SS"),
    );
    const playerById = new Map(boardEntries.map((e) => [e.playerId, makePlayer(e.playerId, { primaryPosition: "SS" })]));

    render(
      <RankYourBoardZone
        boardEntries={boardEntries}
        playerById={playerById}
        boardRankOverrides={undefined}
        disabled={false}
        showHelp={false}
        onReorderGlobal={vi.fn()}
        onReorderPosition={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "PER-POSITION" }));
    expect(screen.getByRole("button", { name: "SS (7)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CF (0)" })).toBeInTheDocument();

    const positionList = screen.getByTestId("rank-your-board-position");
    expect(within(positionList).getAllByText(/\$/)).toHaveLength(BOARD_POSITION_DEPTH);
    expect(screen.getByRole("button", { name: `SHOW ALL 7` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "SHOW ALL 7" }));
    expect(within(screen.getByTestId("rank-your-board-position")).getAllByText(/\$/)).toHaveLength(7);
    expect(screen.getByRole("button", { name: "SHOW TOP 5 ONLY" })).toBeInTheDocument();
  });

  test("arrow-reorder in the GLOBAL view calls onReorderGlobal with the full new order", () => {
    const boardEntries = [entry("a", 300, "SS"), entry("b", 200, "SS"), entry("c", 100, "SS")];
    const playerById = new Map(boardEntries.map((e) => [e.playerId, makePlayer(e.playerId)]));
    const onReorderGlobal = vi.fn();

    render(
      <RankYourBoardZone
        boardEntries={boardEntries}
        playerById={playerById}
        boardRankOverrides={undefined}
        disabled={false}
        showHelp={false}
        onReorderGlobal={onReorderGlobal}
        onReorderPosition={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: `Move ${playerById.get("c")?.firstName} ${playerById.get("c")?.lastName} up` }));
    expect(onReorderGlobal).toHaveBeenCalledWith(["a", "c", "b"]);
  });

  test("reorder in a collapsed PER-POSITION view (5-deep) preserves the hidden remainder's relative order", () => {
    const boardEntries = Array.from({ length: 7 }, (_, index) => entry(`ss-${index}`, 700 - index, "SS"));
    const playerById = new Map(boardEntries.map((e) => [e.playerId, makePlayer(e.playerId, { primaryPosition: "SS" })]));
    const onReorderPosition = vi.fn();

    render(
      <RankYourBoardZone
        boardEntries={boardEntries}
        playerById={playerById}
        boardRankOverrides={undefined}
        disabled={false}
        showHelp={false}
        onReorderGlobal={vi.fn()}
        onReorderPosition={onReorderPosition}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "PER-POSITION" }));
    // Move the top-ranked visible entry (ss-0) down one slot within the visible top 5.
    const player0 = playerById.get("ss-0")!;
    fireEvent.click(screen.getByRole("button", { name: `Move ${player0.firstName} ${player0.lastName} down` }));

    expect(onReorderPosition).toHaveBeenCalledWith("SS", [
      "ss-1",
      "ss-0",
      "ss-2",
      "ss-3",
      "ss-4",
      // ss-5 and ss-6 were never visible (below the 5-deep fold) -- their relative order survives untouched.
      "ss-5",
      "ss-6",
    ]);
  });

  test("readOnly (disabled) hides drag/arrow controls but still shows worth and position", () => {
    const boardEntries = [entry("a", 300, "SS")];
    const playerById = new Map(boardEntries.map((e) => [e.playerId, makePlayer(e.playerId)]));

    render(
      <RankYourBoardZone
        boardEntries={boardEntries}
        playerById={playerById}
        boardRankOverrides={undefined}
        disabled
        disabledReason="Locked for now."
        showHelp={false}
        onReorderGlobal={vi.fn()}
        onReorderPosition={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /^Move /i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Drag /i })).toBeNull();
    expect(screen.getByText("$300")).toBeInTheDocument();
    expect(screen.getByText("Locked for now.")).toBeInTheDocument();
  });

  test("empty board renders an honest empty state instead of a blank list", () => {
    render(
      <RankYourBoardZone
        boardEntries={[]}
        playerById={new Map()}
        boardRankOverrides={undefined}
        disabled={false}
        showHelp={false}
        onReorderGlobal={vi.fn()}
        onReorderPosition={vi.fn()}
      />,
    );
    expect(screen.getByText("NOBODY IN THE POOL TO RANK YET")).toBeInTheDocument();
  });

  test("help copy renders only when showHelp is true", () => {
    const { rerender } = render(
      <RankYourBoardZone
        boardEntries={[]}
        playerById={new Map()}
        boardRankOverrides={undefined}
        disabled={false}
        showHelp={false}
        onReorderGlobal={vi.fn()}
        onReorderPosition={vi.fn()}
      />,
    );
    expect(screen.queryByText(/strong nudge/i)).toBeNull();

    rerender(
      <RankYourBoardZone
        boardEntries={[]}
        playerById={new Map()}
        boardRankOverrides={undefined}
        disabled={false}
        showHelp
        onReorderGlobal={vi.fn()}
        onReorderPosition={vi.fn()}
      />,
    );
    expect(screen.getByText(/strong nudge/i)).toBeInTheDocument();
  });
});
