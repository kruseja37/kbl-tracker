import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { AuctionStage, type AuctionStageVM, type RosterSlotVM } from "../AuctionStage";
import { LEGAL_ROSTER } from "../../../../../data/rosterConstruction";
import type { Player } from "../../../../../utils/leagueBuilderStorage";

afterEach(() => {
  cleanup();
});

function makeTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "test-player",
    firstName: "Won",
    lastName: "Player",
    gender: "M",
    age: 27,
    bats: "R",
    throws: "R",
    primaryPosition: "SS",
    power: 65,
    contact: 70,
    speed: 55,
    fielding: 60,
    arm: 50,
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
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    isCustom: true,
    ...overrides,
  };
}

function slot(slotId: string, group: RosterSlotVM["group"], chip: string): RosterSlotVM {
  return {
    slotId,
    pos: slotId === "backupC" ? "BACKUP C" : slotId.startsWith("FLEX") ? "BENCH" : slotId,
    group,
    who: `${slotId} Player`,
    chip,
    filled: true,
    isGap: false,
    gapLabel: null,
  };
}

function legalSlots(): RosterSlotVM[] {
  return [
    ...LEGAL_ROSTER.fieldPositions.map((position) => slot(position, "THE EIGHT", position)),
    ...Array.from({ length: LEGAL_ROSTER.startingPitchers }, (_, index) => slot(`SP${index + 1}`, "ROTATION", "SP")),
    ...Array.from({ length: LEGAL_ROSTER.minRelievers }, (_, index) => slot(`RP${index + 1}`, "BULLPEN", index === 0 ? "CP" : "RP")),
    slot("backupC", "THE BENCH", "C"),
    ...Array.from({ length: LEGAL_ROSTER.minBench }, (_, index) => slot(`FLEX${index + 1}`, "THE BENCH", "IF")),
    slot("SWING", "THE BENCH", "RP"),
  ];
}

function vm(): AuctionStageVM {
  return {
    tier: "mlb",
    status: {
      phaseLabel: "MLB auction",
      lotLabel: "Lot 1 of 1",
      rosterLabel: `${LEGAL_ROSTER.size} of ${LEGAL_ROSTER.size} rostered`,
      nowText: "auction complete",
    },
    lot: {
      name: "Legal Fixture",
      positions: "SS",
      personality: "Competitive",
      chemistry: "Crafty",
      reserveAsk: 65_000,
      highBid: null,
    },
    move: {
      walletLabel: "Budget",
      wallet: 100_000,
      maxBid: 100_000,
      slotsLeft: 0,
      ceilingNote: "Room up to $100,000 while keeping money for the empty slots.",
      presets: [],
      currentBid: 0,
      canBid: false,
      canPass: false,
    },
    board: {
      title: `Caps · ${LEGAL_ROSTER.size} of ${LEGAL_ROSTER.size}`,
      hint: "gaps glow",
      slots: legalSlots(),
      overflow: [],
      needLine: <>Legal {LEGAL_ROSTER.size} — roster complete.</>,
    },
    log: [],
  };
}

describe("AuctionStage roster board", () => {
  test("renders the legal frame headers, backup catcher test id, and no gap test ids for a legal 22", () => {
    render(<AuctionStage vm={vm()} />);

    expect(screen.getByText("THE EIGHT")).toBeInTheDocument();
    expect(screen.getByText("ROTATION")).toBeInTheDocument();
    expect(screen.getByText("BULLPEN")).toBeInTheDocument();
    expect(screen.getByText("THE BENCH")).toBeInTheDocument();
    expect(screen.getByTestId("auction-board-slot-backupC")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/auction-board-gap-/)).toHaveLength(0);
    expect(screen.queryByTestId("auction-board-overflow")).not.toBeInTheDocument();
  });

  test("shows the current lot reserve ask", () => {
    render(<AuctionStage vm={vm()} />);

    expect(screen.getByText("RESERVE")).toBeInTheDocument();
    expect(screen.getByText("$65,000")).toBeInTheDocument();
  });

  test("shows only the public CPU move amount, not private read or cap fields", () => {
    const stageVm = vm();
    stageVm.move.cpuTurnName = "Page Caps";
    stageVm.move.canBid = true;
    stageVm.move.cpuDecision = {
      teamName: "Page Caps",
      roleLabel: "CPU team",
      action: "Page Caps will bid $70,000",
      reason: "CPU team likes the player and bids.",
      amount: "$70,000",
    };

    render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText("Page Caps will bid $70,000")).toBeInTheDocument();
    expect(screen.getByText("CPU team likes the player and bids.")).toBeInTheDocument();
    expect(screen.getByText(/^Move\b/)).toBeInTheDocument();
    expect(screen.queryByText(/^Read\b/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Cap\b/)).not.toBeInTheDocument();
  });

  test("DJ-09 removes the fake identity-tax meter from the help layer", () => {
    const stageVm = vm();
    stageVm.lot.publicMarket = {
      band: { low: 50_000, median: 70_000, high: 90_000 },
      interestedTeams: 2,
      contested: null,
      likelyPass: false,
    };

    const { container } = render(<AuctionStage vm={stageVm} />);
    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    expect(screen.queryByText("On-identity")).not.toBeInTheDocument();
    expect(container.querySelector(".tax .meter i")).toBeNull();
    expect(screen.getByLabelText("Public market price band")).toBeInTheDocument();
  });

  test("DJ-09 sizes the scout band from the real scout range span", () => {
    const stageVm = vm();
    stageVm.tier = "farm";
    stageVm.lot.scout = {
      rangeLow: 90_000,
      rangeHigh: 110_000,
      mid: 100_000,
      grade2080: 55,
      confidence: "High",
    };

    const { container } = render(<AuctionStage vm={stageVm} />);
    fireEvent.click(screen.getByRole("button", { name: "Scout report" }));
    const band = container.querySelector<HTMLElement>(".rangebar i");

    expect(parseFloat(band?.style.left ?? "")).toBeCloseTo(40.91, 2);
    expect(parseFloat(band?.style.right ?? "")).toBeCloseTo(40.91, 2);
  });
});

// WT-D: already-won (rostered) players were plain, unclickable text on both the roster board and
// the overflow rail -- JK 2026-07-08 asked for the existing PlayerProfilePopover on those names so
// GMs can see profile data informing roster construction. These tests cover the component-level
// wiring in isolation (VM -> popover), independent of the page-level playerById/prospectById
// plumbing (covered separately in the page suites).
describe("AuctionStage roster board player popover (WT-D)", () => {
  test("clicking a rostered player's name opens the profile popover with full ratings", () => {
    const stageVm = vm();
    const player = makeTestPlayer({ id: "won-1", firstName: "Won", lastName: "Player" });
    stageVm.board.slots = stageVm.board.slots.map((s) =>
      s.slotId === "SS" ? { ...s, who: "Won Player", player } : s,
    );

    render(<AuctionStage vm={stageVm} />);
    fireEvent.click(screen.getByRole("button", { name: "Won Player" }));

    expect(screen.getByText("POW")).toBeInTheDocument();
    expect(screen.getByText("65")).toBeInTheDocument();
    expect(screen.queryByText("Farm - scouting only")).not.toBeInTheDocument();
  });

  test("a hidden farm prospect's roster-slot popover shows scout bands only -- never true ratings or trait names", () => {
    const stageVm = vm();
    stageVm.tier = "farm";
    const prospect = makeTestPlayer({
      id: "farm-1",
      firstName: "Farm",
      lastName: "Prospect",
      ratingRevealState: "hidden",
      trait1: "Bug Eater",
      trait2: "Iron Man",
      power: 99,
      prospectProfile: {
        scoutedGrade: "B",
        potentialGrade: "A-",
        scoutConfidence: "medium",
        scoutName: "Scout Jones",
        archetypeFamily: "Power Bat",
      },
    });
    stageVm.board.slots = stageVm.board.slots.map((s) =>
      s.slotId === "SS" ? { ...s, who: "Farm Prospect", player: prospect } : s,
    );

    render(<AuctionStage vm={stageVm} />);
    fireEvent.click(screen.getByRole("button", { name: "Farm Prospect" }));

    expect(screen.getByText("Farm - scouting only")).toBeInTheDocument();
    // COCKPIT W1d (WT-D audit follow-up): positive assertions for the FULL band branch, not just
    // the SCOUT cell and the absence of true ratings.
    expect(screen.getByText("SCOUT")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("POT")).toBeInTheDocument();
    expect(screen.getByText("A-")).toBeInTheDocument();
    expect(screen.getByText("CONF")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
    expect(screen.getByText("NAME")).toBeInTheDocument();
    expect(screen.getByText("Scout Jones")).toBeInTheDocument();
    expect(screen.queryByText("POW")).not.toBeInTheDocument();
    expect(screen.queryByText("99")).not.toBeInTheDocument();
    expect(screen.queryByText("Bug Eater")).not.toBeInTheDocument();
    expect(screen.queryByText("Iron Man")).not.toBeInTheDocument();
  });

  test("COCKPIT W1d defense-in-depth: farm tier forces revealFull off even when ratingRevealState is unset (neither 'hidden' nor 'revealed')", () => {
    // A synthetic edge case -- real farm prospects always carry the 'hidden' literal, which
    // already gates this completely (WT-D audit finding). But draftProfileModel's shouldReveal
    // treats an UNSET ratingRevealState as "reveal if revealFull is true" -- so before this
    // hardening, a bare `revealFull` (always true) at this call site would have leaked full
    // ratings for any farm-tier record that somehow lacked the 'hidden' literal. AuctionStage now
    // passes revealFull={vm.tier !== "farm"}, closing that gap independent of the record's own
    // reveal state.
    const stageVm = vm();
    stageVm.tier = "farm";
    const prospect = makeTestPlayer({
      id: "farm-adversarial",
      firstName: "Farm",
      lastName: "Adversarial",
      ratingRevealState: undefined,
      power: 99,
      prospectProfile: {
        scoutedGrade: "B",
        potentialGrade: "A-",
        scoutConfidence: "medium",
        scoutName: "Scout Jones",
        archetypeFamily: "Power Bat",
      },
    });
    stageVm.board.slots = stageVm.board.slots.map((s) =>
      s.slotId === "SS" ? { ...s, who: "Farm Adversarial", player: prospect } : s,
    );

    render(<AuctionStage vm={stageVm} />);
    fireEvent.click(screen.getByRole("button", { name: "Farm Adversarial" }));

    expect(screen.getByText("Farm - scouting only")).toBeInTheDocument();
    expect(screen.getByText("SCOUT")).toBeInTheDocument();
    expect(screen.queryByText("POW")).not.toBeInTheDocument();
    expect(screen.queryByText("99")).not.toBeInTheDocument();
  });

  test("an overflow entry with a resolvable player opens the profile popover", () => {
    const stageVm = vm();
    const player = makeTestPlayer({ id: "overflow-1", firstName: "Over", lastName: "Flow" });
    stageVm.board.overflow = [{ playerId: "overflow-1", name: "Over Flow", chip: "IF", player }];

    render(<AuctionStage vm={stageVm} />);
    fireEvent.click(screen.getByRole("button", { name: "Over Flow" }));

    expect(screen.getByText("POW")).toBeInTheDocument();
  });

  test("a slot or overflow entry without a resolvable player renders plain text and never crashes", () => {
    const stageVm = vm();
    stageVm.board.overflow = [{ playerId: "missing-1", name: "No Record", chip: "IF" }];

    const { container } = render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText("No Record")).toBeInTheDocument();
    // No PlayerProfilePopover trigger anywhere -- neither the missing-player overflow entry nor
    // any of legalSlots()'s player-less roster-board slots render the popover's role="button" span.
    expect(container.querySelector('[role="button"]')).toBeNull();
  });
});
