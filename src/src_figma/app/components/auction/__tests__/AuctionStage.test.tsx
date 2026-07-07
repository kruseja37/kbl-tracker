import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { AuctionStage, type AuctionStageVM, type RosterSlotVM } from "../AuctionStage";
import { LEGAL_ROSTER } from "../../../../../data/rosterConstruction";

afterEach(() => {
  cleanup();
});

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
    const band = container.querySelector<HTMLElement>(".rangebar i");

    expect(parseFloat(band?.style.left ?? "")).toBeCloseTo(40.91, 2);
    expect(parseFloat(band?.style.right ?? "")).toBeCloseTo(40.91, 2);
  });
});
