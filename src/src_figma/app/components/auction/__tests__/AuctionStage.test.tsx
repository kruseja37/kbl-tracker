import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { AuctionStage, type AuctionStageVM, type RosterSlotVM } from "../AuctionStage";
import { HELD_BACK_HELP_LINE, HELP_LINE, NEED_FIT_HELP_LINE } from "../WhisperPanel";
import { LEGAL_ROSTER } from "../../../../../data/rosterConstruction";
import type { Player } from "../../../../../utils/leagueBuilderStorage";
import type { RosterIntelligencePayload } from "../../../../../engines/rosterIntelligencePayload";

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

/** Minimal RosterIntelligencePayload -- only `worthToYou.capValue` is read by AuctionStage itself
 * (everything else just flows through, unread, to WhisperPanel, which isn't opened by these
 * tests). seatTeamId is the interface's one required field. */
function whisperPayloadWithCapValue(capValue: number | null): RosterIntelligencePayload {
  return {
    seatTeamId: "team-a",
    worthToYou: {
      iv: 500_000,
      ownValue: 500_000,
      archetypeFitMultiplier: 1,
      needMultiplier: 1,
      chemistryContribution: 0,
      verdict: "push",
      liveCall: "push",
      recommendedNumber: 61_000,
      capValue,
      suggestedMaxBid: 61_000,
      priceRead: "fair",
      liquidityState: "neutral",
      discretionaryBudget: 100_000,
      minimumFutureFillReserve: 20_000,
      replacementValueEstimate: 60_000,
      reasonCodes: [],
    },
  };
}

// COPY LAW (CONTRACT_VOICE_2026-07-09.md): the auction copy law build lane -- display-layer-only
// relabeling. This describe block covers the pieces that specifically live in AuctionStage.tsx.
describe("AuctionStage COPY LAW 2026-07-09", () => {
  test("1.2: the wallet row's ceiling label reads 'Ceiling', not 'Most you can bid'", () => {
    render(<AuctionStage vm={vm()} />);

    expect(screen.getByText("Ceiling")).toBeInTheDocument();
    expect(screen.queryByText("Most you can bid")).not.toBeInTheDocument();
  });

  test("1.2: the Help surface always carries the HELD BACK and NEED/FIT explainer lines", () => {
    render(<AuctionStage vm={vm()} />);
    expect(screen.queryByText(HELD_BACK_HELP_LINE)).not.toBeInTheDocument();
    expect(screen.queryByText(NEED_FIT_HELP_LINE)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    expect(screen.getByText(HELP_LINE)).toBeInTheDocument();
    expect(screen.getByText(HELD_BACK_HELP_LINE)).toBeInTheDocument();
    expect(screen.getByText(NEED_FIT_HELP_LINE)).toBeInTheDocument();
  });

  test("1.2 (F9 ruling, relocated): the before-tax ceiling renders ONLY inside Help, honestly labeled -- never in the default view", () => {
    const whisperPayload = whisperPayloadWithCapValue(809_714);
    render(<AuctionStage vm={vm()} whisperPayload={whisperPayload} />);

    // Absent before Help is opened.
    expect(screen.queryByTestId("whisper-total-capacity")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("809,714");

    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    expect(screen.getByTestId("whisper-total-capacity")).toHaveTextContent("Before-tax ceiling $809,714");
    expect(screen.getByText("Ignores tax — never bid to this.")).toBeInTheDocument();
  });

  test("1.2: the before-tax ceiling is absent from Help entirely when capValue is null", () => {
    const whisperPayload = whisperPayloadWithCapValue(null);
    render(<AuctionStage vm={vm()} whisperPayload={whisperPayload} />);

    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    expect(screen.queryByTestId("whisper-total-capacity")).not.toBeInTheDocument();
    expect(screen.queryByText("Ignores tax — never bid to this.")).not.toBeInTheDocument();
    // The other two Help lines still render regardless of whisperPayload.
    expect(screen.getByText(HELD_BACK_HELP_LINE)).toBeInTheDocument();
  });

  test("1.7: the overflow note reads 'don't fit a legal 22'", () => {
    const stageVm = vm();
    stageVm.board.overflow = [{ playerId: "over-1", name: "Over Flow", chip: "IF" }];

    render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText("These players don't fit a legal 22 — resolve before launch.")).toBeInTheDocument();
  });

  test("1.7: the handoff override confirm reads 'Franchise setup will refuse them'", () => {
    const stageVm = vm();
    stageVm.complete = {
      clubs: [{ teamId: "a", name: "A", primary: "#000", secondary: "#fff", countLabel: "20 of 22", legal: false, blockers: ["Missing a CP"] }],
      allLegal: false,
      blockedCount: 1,
      summary: "1 club blocked.",
      onProceed: () => {},
      overrideArmed: true,
      onArmOverride: () => {},
      onConfirmOverride: () => {},
    };

    render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText(/Franchise setup will refuse them until they're fixed\. Proceed\?/)).toBeInTheDocument();
    expect(screen.queryByText(/The franchise wizard will refuse them/)).not.toBeInTheDocument();
  });

  test("1.7: the public-market LIVE line names the actual number of interested teams", () => {
    const stageVm = vm();
    stageVm.lot.publicMarket = {
      band: { low: 50_000, median: 70_000, high: 90_000 },
      interestedTeams: 3,
      contested: null,
      likelyPass: false,
    };

    render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText("3 teams can meet the ask.")).toBeInTheDocument();
    expect(screen.queryByText("Teams can meet the ask.")).not.toBeInTheDocument();
  });

  test("1.7: the single-team case still reads 'One team can meet the ask.' (unchanged)", () => {
    const stageVm = vm();
    stageVm.lot.publicMarket = {
      band: { low: 50_000, median: 70_000, high: 90_000 },
      interestedTeams: 1,
      contested: null,
      likelyPass: false,
    };

    render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText("One team can meet the ask.")).toBeInTheDocument();
  });

  test("1.7: the UNSOLD/GONE overlays read 'No takers...'", () => {
    const unsoldVm = vm();
    unsoldVm.overlay = "unsold";
    const { rerender } = render(<AuctionStage vm={unsoldVm} />);
    expect(screen.getByText("No takers at that price — he'll come around again.")).toBeInTheDocument();

    const goneVm = vm();
    goneVm.overlay = "gone";
    rerender(<AuctionStage vm={goneVm} />);
    expect(screen.getByText("No takers — he's off the board for good.")).toBeInTheDocument();
  });
});

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

// FLOORREFIT (2026-07-09) Move 5: the three unlabeled market boxes + the reserve chip consolidate
// into one quiet mono line; no number lost either way.
describe("AuctionStage FLOORREFIT Move 5 -- market line consolidation", () => {
  test("folds the reserve ask into the one market line when both a public-market read and a reserve exist", () => {
    const stageVm = vm();
    stageVm.lot.publicMarket = {
      band: { low: 50_000, median: 70_000, high: 90_000 },
      interestedTeams: 2,
      contested: null,
      likelyPass: false,
    };
    stageVm.lot.reserveAsk = 65_000;

    const { container } = render(<AuctionStage vm={stageVm} />);

    const line = screen.getByLabelText("Public market price band");
    expect(line.textContent).toBe("MARKET $50,000 · $70,000 · $90,000 — RESERVE $65,000");
    // No standalone reserve-ask chip duplicating the number the line already carries.
    expect(container.querySelectorAll(".reserve-ask")).toHaveLength(0);
  });

  test("renders the market line without a reserve suffix when there is no reserve to fold in", () => {
    const stageVm = vm();
    stageVm.lot.publicMarket = {
      band: { low: 50_000, median: 70_000, high: 90_000 },
      interestedTeams: 2,
      contested: null,
      likelyPass: false,
    };
    stageVm.lot.reserveAsk = null;

    render(<AuctionStage vm={stageVm} />);

    const line = screen.getByLabelText("Public market price band");
    expect(line.textContent).toBe("MARKET $50,000 · $70,000 · $90,000");
  });

  test("keeps the standalone RESERVE chip when there's a reserve but no public-market read (e.g. farm)", () => {
    const stageVm = vm();
    stageVm.tier = "farm";
    stageVm.lot.publicMarket = undefined;
    stageVm.lot.reserveAsk = 40_000;

    render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText("RESERVE")).toBeInTheDocument();
    expect(screen.getByText("$40,000")).toBeInTheDocument();
    expect(screen.queryByLabelText("Public market price band")).not.toBeInTheDocument();
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

// FLOORREFIT (2026-07-09): the ON THE CLOCK banner (Move 1) and the high-bid holder swatch (Move 4).
describe("AuctionStage FLOORREFIT Move 1 -- ON THE CLOCK banner", () => {
  test("renders above the lot with team-colored copy for a human turn", () => {
    const stageVm = vm();
    stageVm.status.teamName = "Page Caps";
    stageVm.status.teamPrimary = "#001489";
    stageVm.status.teamSecondary = "#FFFFFF";
    stageVm.status.turnKind = "bid";
    stageVm.status.actingTeamIsCpu = false;

    render(<AuctionStage vm={stageVm} />);

    const banner = screen.getByTestId("on-the-clock-banner");
    expect(banner).toHaveTextContent("YOU'RE UP — PAGE CAPS");
    expect(banner.className).toContain("otc-team");
  });

  test("falls back to the brass-on-ink band when the status carries the default CSS-var colors (no real team hex)", () => {
    const stageVm = vm();
    stageVm.status.teamName = "Page Caps";
    stageVm.status.teamPrimary = "var(--ballpark-brass)";
    stageVm.status.teamSecondary = "var(--ballpark-chalk)";
    stageVm.status.actingTeamIsCpu = false;

    render(<AuctionStage vm={stageVm} />);

    const banner = screen.getByTestId("on-the-clock-banner");
    expect(banner.className).toContain("otc-fallback");
  });

  test("CPU turns show the existing calm-wait nowText, not the punchy copy", () => {
    const stageVm = vm();
    stageVm.status.nowText = "Page Caps — raise or pass";
    stageVm.status.teamName = "Page Caps";
    stageVm.status.teamPrimary = "#FF6600";
    stageVm.status.teamSecondary = "#001489";
    stageVm.status.actingTeamIsCpu = true;

    render(<AuctionStage vm={stageVm} />);

    const banner = screen.getByTestId("on-the-clock-banner");
    expect(banner).toHaveTextContent("Page Caps — raise or pass");
    expect(banner).not.toHaveTextContent("YOU'RE UP");
  });

  test("does not render on the complete-screen handoff check (no lot, nothing on the clock)", () => {
    const stageVm = vm();
    stageVm.complete = {
      clubs: [],
      allLegal: true,
      blockedCount: 0,
      summary: "Every club fields a legal 22. Scout reveal is next.",
      onProceed: () => {},
      overrideArmed: false,
      onArmOverride: () => {},
      onConfirmOverride: () => {},
    };

    render(<AuctionStage vm={stageVm} />);

    expect(screen.queryByTestId("on-the-clock-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("auction-complete-panel")).toBeInTheDocument();
  });
});

describe("AuctionStage FLOORREFIT Move 4 -- high-bid holder swatch", () => {
  test("shows a colored swatch + abbreviation when the holder's team colors are resolvable", () => {
    const stageVm = vm();
    stageVm.lot.highBid = { amount: 50_000, by: "Page Caps", isYou: false, byTeamPrimary: "#001489", byAbbreviation: "CAP" };

    render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText("CAP")).toBeInTheDocument();
    expect(screen.getByText("Page Caps")).toBeInTheDocument();
    const holderRow = screen.getByText("Page Caps").closest(".by");
    expect(holderRow?.className).toContain("swatch");
  });

  test("falls back to the plain name (no swatch) when holder colors/abbreviation are absent", () => {
    const stageVm = vm();
    stageVm.lot.highBid = { amount: 50_000, by: "Page Caps", isYou: false };

    render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText("Page Caps")).toBeInTheDocument();
    const holderRow = screen.getByText("Page Caps").closest(".by");
    expect(holderRow?.className).not.toContain("swatch");
  });
});

// FLOORREFIT (2026-07-09) Move 6: the roster fill board now lives in the left column under the bid
// controls, but stays independently visible on the complete-screen handoff check (matching prior
// right-column behavior -- see the WT-D popover coverage above and in the page-level suites).
describe("AuctionStage FLOORREFIT Move 6 -- roster board placement", () => {
  test("renders the board on both the normal stage and the complete-screen handoff check", () => {
    const nonComplete = render(<AuctionStage vm={vm()} />);
    expect(nonComplete.getByTestId("auction-board-slot-backupC")).toBeInTheDocument();
    nonComplete.unmount();

    const stageVm = vm();
    stageVm.complete = {
      clubs: [],
      allLegal: true,
      blockedCount: 0,
      summary: "Every club fields a legal 22. Scout reveal is next.",
      onProceed: () => {},
      overrideArmed: false,
      onArmOverride: () => {},
      onConfirmOverride: () => {},
    };
    render(<AuctionStage vm={stageVm} />);
    expect(screen.getByTestId("auction-complete-panel")).toBeInTheDocument();
    expect(screen.getByTestId("auction-board-slot-backupC")).toBeInTheDocument();
  });
});

// CALLFIX 2026-07-08 Item 3: the lot log is the 4th popover surface (never built) -- JK's audit
// found the roster board slot, the overflow rail, and the on-the-block lot already popover-wrapped,
// but a resolved lot's headline name in the log stayed plain text. Same WT-D wiring pattern.
describe("AuctionStage lot log player popover (CALLFIX Item 3, the 4th popover surface)", () => {
  test("a log row with a resolvable player opens the profile popover on just the name, leaving the rest of the sentence intact", () => {
    const stageVm = vm();
    const player = makeTestPlayer({ id: "log-1", firstName: "Log", lastName: "Winner" });
    stageVm.log = [{
      kind: "won",
      text: "Log Winner SOLD to Caps for $12,000",
      amount: 12_000,
      player,
      namePrefix: "Log Winner",
    }];

    render(<AuctionStage vm={stageVm} />);
    fireEvent.click(screen.getByRole("button", { name: "Log Winner" }));

    expect(screen.getByText("POW")).toBeInTheDocument();
    expect(
      screen.getAllByText((_content, element) => (element?.textContent ?? "").includes("SOLD to Caps for $12,000")).length,
    ).toBeGreaterThan(0);
  });

  test("a farm log row's popover is tier-gated to scout bands, never true ratings", () => {
    const stageVm = vm();
    stageVm.tier = "farm";
    const prospect = makeTestPlayer({
      id: "log-farm-1",
      firstName: "Log",
      lastName: "Prospect",
      ratingRevealState: "hidden",
      power: 99,
      prospectProfile: {
        scoutedGrade: "B",
        potentialGrade: "A-",
        scoutConfidence: "medium",
        scoutName: "Scout Jones",
      },
    });
    stageVm.log = [{
      kind: "won",
      text: "Log Prospect SOLD to Caps for $12,000",
      amount: 12_000,
      player: prospect,
      namePrefix: "Log Prospect",
    }];

    render(<AuctionStage vm={stageVm} />);
    fireEvent.click(screen.getByRole("button", { name: "Log Prospect" }));

    expect(screen.getByText("Farm - scouting only")).toBeInTheDocument();
    expect(screen.queryByText("POW")).not.toBeInTheDocument();
    expect(screen.queryByText("99")).not.toBeInTheDocument();
  });

  test("a system log row with no resolvable player renders plain text -- no popover trigger, never crashes", () => {
    const stageVm = vm();
    stageVm.log = [{ kind: "gone", text: "Somebody PASSED" }];

    const { container } = render(<AuctionStage vm={stageVm} />);

    expect(screen.getByText("Somebody PASSED")).toBeInTheDocument();
    expect(container.querySelector('.logitem [role="button"]')).toBeNull();
  });
});
