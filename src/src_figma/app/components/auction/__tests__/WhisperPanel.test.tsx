import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { WhisperPanel } from "../WhisperPanel";
import {
  applyAuctionWhisperRosterCleanGates,
  resolveAuctionWhisperIdentityArchetype,
} from "../../../pages/LeagueBuilderAuctionDraft";
import { assembleFiveLights, type FiveLights } from "../../../../../engines/rosterIntelligencePayload";
import type { SimPlayer } from "../../../../../engines/archetypeBalanceSimulator";
import type { RosterIntelligencePayload } from "../../../../../engines/rosterIntelligencePayload";
import { GRADE_SALARY_BOUNDS } from "../../../../../engines/ratingsAdjustmentEngine";
import type { Player } from "../../../../../utils/leagueBuilderStorage";

/** Mirrors WhisperPanel's money() formatting so the grade-chip locks assert exact rendered text. */
function chipMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function gradeChipPlayer(overallGrade: Player["overallGrade"]): Player {
  return {
    id: "lot-star",
    firstName: "Lot",
    lastName: "Star",
    gender: "M",
    age: 27,
    bats: "R",
    throws: "R",
    primaryPosition: "1B",
    power: 60,
    contact: 60,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade,
    personality: "Competitive",
    chemistry: "Crafty",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 10_000,
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    isCustom: true,
  };
}

afterEach(() => {
  cleanup();
});

function light(status: "green" | "amber" | "red" | "unknown", sentence = `${status} sentence`) {
  return { status, sentence };
}

function simHitter(id: string, power: number, contact: number): SimPlayer {
  return {
    id,
    isPitcher: false,
    position: "1B",
    bat: { POW: power, CON: contact, SPD: 50, FLD: 50, ARM: 50 },
    iv: 1_000,
    salary: 1_000,
  };
}

function identityLightStatus(rosterPlayers: SimPlayer[]) {
  const archetype = resolveAuctionWhisperIdentityArchetype({ mlbArchetypeKey: "murderers-row" });
  if (!archetype) throw new Error("Missing test archetype");
  const comparisonPool = [
    simHitter("pool-power-1", 95, 95),
    simHitter("pool-power-2", 90, 90),
    simHitter("pool-average", 60, 60),
    simHitter("pool-low-1", 30, 30),
    simHitter("pool-low-2", 25, 25),
  ];
  return assembleFiveLights({
    shapePlayers: [],
    chemistryPlayers: [],
    identity: {
      rosterPlayers,
      archetype,
      tier: "standard",
      comparisonPool,
    },
  }).identity.status;
}

function payload(
  verdict: "push" | "cap" | "pass" = "push",
  overrides: Partial<RosterIntelligencePayload> = {},
): RosterIntelligencePayload {
  return {
    seatTeamId: "team-a",
    generatedAtLotIndex: 1,
    market: {
      playerId: "lot-star",
      band: { low: 50_000, median: 70_000, high: 90_000 },
      interestedTeams: 2,
      contested: null,
      likelyPass: false,
    },
    worthToYou: {
      iv: 72_000,
      ownValue: 72_000,
      archetypeFitMultiplier: 1,
      needMultiplier: 1,
      verdict,
      recommendedNumber: verdict === "pass" ? 0 : 75_000,
      capValue: verdict === "pass" ? 45_000 : 75_000,
      suggestedMaxBid: verdict === "pass" ? 0 : 80_000,
      priceRead: verdict === "pass" ? "pass" : "fair",
      liquidityState: "neutral",
      discretionaryBudget: 100_000,
      minimumFutureFillReserve: 20_000,
      replacementValueEstimate: 60_000,
      scarcityModifier: 1,
      reasonCodes: verdict === "pass" ? ["future-fill-protected"] : ["within-liquidity-ceiling"],
      chemistry: {
        premium: 3_000,
        teamLift: 3_000,
        ownContext: 0,
        family: "CMP",
        crossing: null,
        countsBefore: { CMP: 0, CRA: 0, DIS: 0, SPI: 0, SCH: 0 },
        countsAfter: { CMP: 1, CRA: 0, DIS: 0, SPI: 0, SCH: 0 },
        distanceToNextTier: 1,
        liftedTraitCount: 0,
      },
      chemistryContribution: 3_000,
      chemistryReadout: {
        families: [
          {
            family: "SPI",
            word: "Spirited",
            count: 0,
            tier: "L1",
            distanceToNextTier: 3,
            nextTierLabel: "L2",
            isCandidateFamily: false,
          },
          {
            family: "DIS",
            word: "Disciplined",
            count: 1,
            tier: "L1",
            distanceToNextTier: 2,
            nextTierLabel: "L2",
            isCandidateFamily: false,
          },
          {
            family: "CMP",
            word: "Competitive",
            count: 2,
            tier: "L1",
            distanceToNextTier: 1,
            nextTierLabel: "L2",
            isCandidateFamily: true,
          },
          {
            family: "SCH",
            word: "Scholarly",
            count: 4,
            tier: "L2",
            distanceToNextTier: 3,
            nextTierLabel: "L3",
            isCandidateFamily: false,
          },
          {
            family: "CRA",
            word: "Crafty",
            count: 7,
            tier: "L3",
            distanceToNextTier: null,
            nextTierLabel: null,
            isCandidateFamily: false,
          },
        ],
        candidate: {
          family: "CMP",
          word: "Competitive",
          countAfter: 3,
          crossing: "L1->L2",
          distanceToNextTierAfter: 4,
        },
      },
    },
    board: [
      { playerId: "lot-star", worth: 75_000, matchedShape: "SS", needTag: null, fitTag: null, note: "Seat A Star" },
      { playerId: "seat-a-only", worth: 64_000, matchedShape: "CF", needTag: null, fitTag: null, note: "Seat A Slider" },
    ],
    scorecard: {
      shape: light("green", "Shape is clean."),
      identity: light("green", "Identity is clean."),
      chemistry: light("amber", "Chemistry is close."),
      balance: light("unknown"),
      budget: light("red", "Budget is tight."),
    },
    ...overrides,
  };
}

describe("WhisperPanel", () => {
  test("SECRECY: only the active seat payload renders and closed removes body nodes", () => {
    render(<WhisperPanel payload={payload()} />);

    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.getByText("Seat A Star")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Seat B Moonshot");
    expect(document.body).not.toHaveTextContent("Seat B Cap Sentence");

    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.queryAllByTestId("whisper-body")).toHaveLength(0);
    expect(document.body).not.toHaveTextContent("Seat A Star");
  });

  test("closed face is neutral across push and pass payloads", () => {
    const { rerender } = render(<WhisperPanel payload={payload("push")} />);
    const pushStrip = screen.getByTestId("whisper-strip").outerHTML;

    rerender(<WhisperPanel payload={payload("pass")} />);

    expect(screen.getByTestId("whisper-strip").outerHTML).toBe(pushStrip);
  });

  test("COCKPIT W1a/b: BALANCE is fully removed (deleted, not hidden), absent scorecard, and absent lot follow the dormant piece rules", () => {
    render(<WhisperPanel payload={payload()} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.queryByRole("button", { name: "BALANCE" })).not.toBeInTheDocument();
    expect(screen.queryByText("Balance read coming.")).not.toBeInTheDocument();

    cleanup();
    render(<WhisperPanel payload={payload("push", { scorecard: undefined })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));
    expect(screen.queryByTestId("whisper-lights")).not.toBeInTheDocument();

    cleanup();
    render(<WhisperPanel payload={payload("push", { worthToYou: undefined, scorecard: undefined })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));
    expect(screen.getByText("Nothing on the block. Best name still out there: Seat A Star.")).toBeInTheDocument();
  });

  test("identity light uses the canonical historical archetype instead of a constant amber raw shift", () => {
    expect(identityLightStatus([simHitter("fit-1", 96, 95), simHitter("fit-2", 91, 92)])).toBe("green");
    expect(identityLightStatus([simHitter("miss-1", 25, 30), simHitter("miss-2", 30, 25)])).toBe("red");
  });

  test("board rows render need and identity chips without replacing shape copy", () => {
    render(<WhisperPanel payload={payload("push", {
      board: [
        {
          playerId: "chip-row",
          worth: 88_000,
          matchedShape: "SS",
          needTag: "FILLS SS",
          fitTag: "IDENTITY",
          note: "Chip Row",
        },
      ],
    })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));
    const board = within(screen.getByTestId("whisper-board"));

    expect(board.getByText("Chip Row")).toBeInTheDocument();
    expect(board.getByText("FILLS SS")).toBeInTheDocument();
    expect(board.getByText("IDENTITY")).toBeInTheDocument();
    expect(board.getByText("SS")).toBeInTheDocument();
  });

  test("BID vs PASS renders both branch projections with targets and surplus", () => {
    render(<WhisperPanel payload={Object.assign(payload(), {
      bidVsPass: {
        bidAmount: 55_000,
        bid: {
          branch: "bid" as const,
          budgetAfter: 145_000,
          needAfter: {
            minimumAdditions: 2,
            deficits: ["Still needs a starting C.", "Needs a true closer (CP)."],
          },
          targets: [
            {
              playerId: "bid-target",
              name: "Bid Target",
              player: null,
              surplus: 12_000,
              ownValue: 82_000,
              predictedMedian: 70_000,
              affordable: true,
            },
          ],
        },
        pass: {
          branch: "pass" as const,
          budgetAfter: 200_000,
          needAfter: {
            minimumAdditions: 3,
            deficits: ["Needs 1 more reliever."],
          },
          targets: [
            {
              playerId: "pass-target",
              name: "Pass Target",
              player: null,
              surplus: -5_000,
              ownValue: 45_000,
              predictedMedian: 50_000,
              affordable: false,
            },
          ],
        },
      },
    })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    const bidVsPass = within(screen.getByTestId("whisper-bid-vs-pass"));
    expect(bidVsPass.getByText("BID vs PASS")).toBeInTheDocument();
    expect(bidVsPass.getByText("BID $55,000")).toBeInTheDocument();
    expect(bidVsPass.getByText("PASS")).toBeInTheDocument();
    expect(bidVsPass.getByText("$145,000")).toBeInTheDocument();
    expect(bidVsPass.getByText("$200,000")).toBeInTheDocument();
    expect(bidVsPass.getByText("Bid Target")).toBeInTheDocument();
    expect(bidVsPass.getByText("Pass Target")).toBeInTheDocument();
    expect(bidVsPass.getByText("+$12,000")).toBeInTheDocument();
    expect(bidVsPass.getByText("-$5,000")).toBeInTheDocument();
    expect(bidVsPass.getByText("can't afford")).toBeInTheDocument();
  });

  test("BID vs PASS is absent when the projection is absent or null", () => {
    const { rerender } = render(<WhisperPanel payload={payload()} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.queryByTestId("whisper-bid-vs-pass")).not.toBeInTheDocument();

    rerender(<WhisperPanel payload={Object.assign(payload(), { bidVsPass: null })} />);

    expect(screen.queryByTestId("whisper-bid-vs-pass")).not.toBeInTheDocument();
  });

  test("chemistry readout renders five rows, marks the candidate family, and shows upward tips", () => {
    render(<WhisperPanel payload={payload()} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    const readout = within(screen.getByTestId("whisper-chemistry-readout"));
    expect(readout.getByText("Spirited")).toBeInTheDocument();
    expect(readout.getByText("Disciplined")).toBeInTheDocument();
    expect(readout.getByText("Competitive")).toBeInTheDocument();
    expect(readout.getByText("Scholarly")).toBeInTheDocument();
    expect(readout.getByText("Crafty")).toBeInTheDocument();
    expect(readout.getByText("1 to L2")).toBeInTheDocument();
    expect(readout.getByText("at max")).toBeInTheDocument();
    expect(readout.getByText("+1 → tips L2")).toBeInTheDocument();

    const candidateRow = readout.getByText("Competitive").closest(".whisper-chemistry-row");
    expect(candidateRow).toHaveAttribute("data-candidate-family", "true");
  });

  test("YOUR NUMBER renders recommendedNumber instead of the affordability ceiling", () => {
    render(<WhisperPanel payload={payload("push", {
      worthToYou: {
        ...payload().worthToYou!,
        recommendedNumber: 96_000,
        capValue: 809_714,
      },
    })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.getByTestId("whisper-your-number")).toHaveTextContent("$96,000");
    expect(screen.getByText("Go get him -- worth about $96,000 to you.")).toBeInTheDocument();
    // F9 ruling: capValue may render ONLY under the separately-labeled Total Capacity line --
    // never silently reused as the headline number.
    expect(screen.getByTestId("whisper-your-number")).not.toHaveTextContent("$809,714");
    expect(screen.getByTestId("whisper-total-capacity")).toHaveTextContent("Total Capacity $809,714");
  });

  describe("F9: one ceiling drives verdict, room-relation, and budget light", () => {
    test("pass verdict, room-relation, and budget light all agree when maxBid sits below the market low, even though the unreserved capacity sits INSIDE the band", () => {
      render(<WhisperPanel payload={payload("pass", {
        worthToYou: {
          ...payload("pass").worthToYou!,
          // The unreserved ceiling sits comfortably inside the market band (50k-90k) -- pre-fix,
          // roomRelation(capValue) would have rendered "inside what the room expects" here.
          capValue: 70_000,
          // The liquidity-reserved ceiling (the one the verdict is actually built from) is well
          // under the market low.
          suggestedMaxBid: 10_000,
        },
      })} />);
      fireEvent.click(screen.getByTestId("whisper-strip"));

      expect(screen.getByText("Let him go.")).toBeInTheDocument();
      expect(screen.getByText("The room wants more than you should give.")).toBeInTheDocument();
      expect(screen.queryByText("That sits inside what the room expects.")).not.toBeInTheDocument();
      // The fixture's scorecard.budget is always red (see payload() above) -- confirming no light
      // anywhere on the panel reads green while the verdict says pass.
      expect(screen.getByRole("button", { name: "BUDGET" })).toHaveAttribute("data-status", "red");
      // capValue still surfaces, but ONLY under its own honestly-labeled line.
      expect(screen.getByTestId("whisper-total-capacity")).toHaveTextContent("Total Capacity $70,000");
    });

    test("room-relation and budget light stay green/consistent when nothing is reserved (maxBid === capValue)", () => {
      render(<WhisperPanel payload={payload("push", {
        worthToYou: {
          ...payload("push").worthToYou!,
          capValue: 75_000,
          suggestedMaxBid: 75_000,
        },
        scorecard: {
          ...payload("push").scorecard!,
          budget: light("green", "You can meet this price and still insure the finish."),
        },
      })} />);
      fireEvent.click(screen.getByTestId("whisper-strip"));

      expect(screen.getByText("That sits inside what the room expects.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "BUDGET" })).toHaveAttribute("data-status", "green");
      expect(screen.getByTestId("whisper-total-capacity")).toHaveTextContent("Total Capacity $75,000");
    });
  });

  test("liquidity row renders max bid, price read, fill reserve, and need signals", () => {
    render(<WhisperPanel payload={payload("push", {
      worthToYou: {
        ...payload().worthToYou!,
        suggestedMaxBid: 88_000,
        priceRead: "stretch",
        liquidityState: "constrained",
        discretionaryBudget: 42_000,
        minimumFutureFillReserve: 58_000,
        reasonCodes: ["future-fill-protected", "liquidity-constrained", "priority-fit"],
        needMultiplier: 1.12,
        archetypeFitMultiplier: 1.08,
      },
    })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    const liquidity = within(screen.getByTestId("whisper-liquidity"));
    expect(liquidity.getByText("MAX BID")).toBeInTheDocument();
    expect(liquidity.getByText("$88,000")).toBeInTheDocument();
    expect(liquidity.getByText("STRETCH")).toBeInTheDocument();
    expect(liquidity.getByText("CONSTRAINED")).toBeInTheDocument();
    expect(liquidity.getByText("Fill Reserve $58,000")).toBeInTheDocument();
    expect(liquidity.getByText("Room $42,000")).toBeInTheDocument();
    expect(screen.getByText("protect fill")).toBeInTheDocument();
    expect(screen.getByText("cash tight")).toBeInTheDocument();
    expect(screen.getByText("priority need")).toBeInTheDocument();
    expect(screen.getByText("NEED +12%")).toBeInTheDocument();
    expect(screen.getByText("FIT +8%")).toBeInTheDocument();
  });

  test("live high bid line reacts below and at the recommended number", () => {
    const { rerender } = render(<WhisperPanel payload={Object.assign(payload("push"), {
      currentHighBid: 70_000,
      objectPronoun: "him" as const,
    })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.getByText("Still under your number -- $5,000 to go")).toBeInTheDocument();

    rerender(<WhisperPanel payload={Object.assign(payload("push"), {
      currentHighBid: 75_000,
      objectPronoun: "him" as const,
    })} />);

    expect(screen.getByText("Past your number -- let him go")).toBeInTheDocument();
  });

  test("FULL BOARD toggle renders the expanded board rows when more than three names remain", () => {
    const { container } = render(<WhisperPanel payload={payload("push", {
      board: [
        { playerId: "top-1", worth: 90_000, matchedShape: "SS", needTag: null, fitTag: null, note: "Top One" },
        { playerId: "top-2", worth: 80_000, matchedShape: "CF", needTag: null, fitTag: null, note: "Top Two" },
        { playerId: "top-3", worth: 70_000, matchedShape: "SP", needTag: null, fitTag: null, note: "Top Three" },
        { playerId: "expanded-4", worth: 60_000, matchedShape: "RP", needTag: null, fitTag: null, note: "Expanded Four" },
      ],
    })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.queryByText("Expanded Four")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "FULL BOARD" }));

    expect(container.querySelector(".whisper-board-well")).toBeInTheDocument();
    expect(screen.getByText("Expanded Four")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FOLD IT UP" })).toBeInTheDocument();
  });

  test("missing roster records make roster-dependent lights hollow", () => {
    const cleanScorecard = payload().scorecard as FiveLights;
    const gated = applyAuctionWhisperRosterCleanGates(cleanScorecard, false);

    render(<WhisperPanel payload={payload("push", { scorecard: gated })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.getByRole("button", { name: "SHAPE" })).toHaveAttribute("data-status", "unknown");
    expect(screen.getByRole("button", { name: "CHEMISTRY" })).toHaveAttribute("data-status", "unknown");
    fireEvent.click(screen.getByRole("button", { name: "CHEMISTRY" }));
    expect(screen.getByText("No read yet -- still doing my homework on this club.")).toBeInTheDocument();
  });
});

describe("CALLFIX 2026-07-08 Item 1 REPRO: the live call must react to the CURRENT bid, not just the static worth verdict", () => {
  test("REPRO (MLB): with currentHighBid far ABOVE recommendedNumber, the strip must NOT still say PUSH and the headline must NOT still say 'Go get him'", () => {
    render(<WhisperPanel payload={Object.assign(payload("push"), {
      currentHighBid: 999_000,
      objectPronoun: "him" as const,
    })} />);

    // Tier-1 strip: always visible, zero taps -- the exact bug JK caught live ("frozen within a lot").
    expect(screen.getByTestId("whisper-tier1-verdict")).not.toHaveTextContent("PUSH");

    fireEvent.click(screen.getByTestId("whisper-strip"));
    expect(screen.queryByText(/^Go get him/)).not.toBeInTheDocument();
  });

  test("REPRO (farm): with currentHighBid far ABOVE recommendedNumber, the shared tap-through headline must NOT still say 'Go get him' (farm has no Tier-1 strip, but shares WhisperHeadline)", () => {
    render(<WhisperPanel payload={Object.assign(payload("push"), {
      currentHighBid: 999_000,
      objectPronoun: "him" as const,
    })} tier="farm" />);

    fireEvent.click(screen.getByTestId("whisper-strip"));
    expect(screen.queryByText(/^Go get him/)).not.toBeInTheDocument();
  });
});

describe("COCKPIT W1a/b: Tier-1 verdict strip + Tier-2 promoted read (MLB only)", () => {
  test("Tier 1 (whisper-tier1) and Tier 2 (whisper-tier2) render without opening the panel", () => {
    render(<WhisperPanel payload={payload("push")} />);

    expect(screen.getByTestId("whisper-tier1")).toBeInTheDocument();
    expect(screen.getByTestId("whisper-tier2")).toBeInTheDocument();
    expect(screen.queryByTestId("whisper-body")).not.toBeInTheDocument();
  });

  test("VERDICT word maps push/cap/pass to PUSH/CAP $X/WALK, and FIT chip promotes the archetype multiplier", () => {
    const { rerender } = render(<WhisperPanel payload={payload("push")} />);
    expect(screen.getByTestId("whisper-tier1-verdict")).toHaveTextContent("PUSH");

    rerender(<WhisperPanel payload={payload("pass")} />);
    expect(screen.getByTestId("whisper-tier1-verdict")).toHaveTextContent("WALK");

    rerender(<WhisperPanel payload={payload("cap", {
      worthToYou: { ...payload("cap").worthToYou!, recommendedNumber: 61_000, archetypeFitMultiplier: 1.08 },
    })} />);
    expect(screen.getByTestId("whisper-tier1-verdict")).toHaveTextContent("CAP $61,000");
    expect(screen.getByTestId("whisper-tier1-fit")).toHaveTextContent("FIT +8%");
  });

  test("ONE reason phrase shows only the top-priority reasonCode; the rest wait behind the tap-through", () => {
    render(<WhisperPanel payload={payload("push", {
      worthToYou: {
        ...payload().worthToYou!,
        reasonCodes: ["future-fill-protected", "liquidity-constrained", "priority-fit"],
      },
    })} />);

    expect(screen.getByTestId("whisper-tier1-reason")).toHaveTextContent("protect fill");
    // The remaining two reason codes are NOT duplicated in the always-visible Tier-1/2 area.
    expect(screen.queryByText("cash tight")).not.toBeInTheDocument();
    expect(screen.queryByText("priority need")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("whisper-strip"));
    // ...but they DO surface in the Tier-3 tap-through, without repeating the promoted one.
    expect(screen.getByText("cash tight")).toBeInTheDocument();
    expect(screen.getByText("priority need")).toBeInTheDocument();
  });

  test("TRUE COST after tax renders only when the marginal tax is nonzero", () => {
    const base = payload("push", {
      worthToYou: { ...payload().worthToYou!, recommendedNumber: 40_000 },
    });

    const { rerender } = render(<WhisperPanel payload={Object.assign(base, { marginalTax: 12_000 })} />);
    expect(screen.getByTestId("whisper-tier1-number")).toHaveTextContent("YOUR NUMBER $40,000");
    expect(screen.getByTestId("whisper-tier1-truecost")).toHaveTextContent("TRUE COST $52,000 AFTER TAX");

    rerender(<WhisperPanel payload={Object.assign(payload("push", {
      worthToYou: { ...payload().worthToYou!, recommendedNumber: 40_000 },
    }), { marginalTax: 0 })} />);
    expect(screen.getByTestId("whisper-tier1-number")).toHaveTextContent("YOUR NUMBER $40,000");
    expect(screen.queryByTestId("whisper-tier1-truecost")).not.toBeInTheDocument();

    cleanup();
    render(<WhisperPanel payload={Object.assign(payload("push", {
      worthToYou: { ...payload().worthToYou!, recommendedNumber: 40_000 },
    }), { marginalTax: null })} />);
    expect(screen.queryByTestId("whisper-tier1-truecost")).not.toBeInTheDocument();
  });

  test("ONE CEILING regression: the Tier-1 number always derives from recommendedNumber (bounded by suggestedMaxBid), never capValue", () => {
    render(<WhisperPanel payload={Object.assign(payload("cap", {
      worthToYou: {
        ...payload("cap").worthToYou!,
        recommendedNumber: 61_000,
        suggestedMaxBid: 61_000,
        // The unreserved completion ceiling is wildly larger than the liquidity-adjusted number --
        // if the Tier-1 strip ever read capValue instead of recommendedNumber this would leak in.
        capValue: 809_714,
      },
    }), { marginalTax: 5_000 })} />);

    const number = screen.getByTestId("whisper-tier1-number");
    expect(number).toHaveTextContent("YOUR NUMBER $61,000");
    expect(screen.getByTestId("whisper-tier1-truecost")).toHaveTextContent("TRUE COST $66,000 AFTER TAX");
    expect(number.textContent ?? "").not.toContain("809,714");
    expect(screen.getByTestId("whisper-tier1-truecost").textContent ?? "").not.toContain("814,714");
  });

  test("WAIT/CHASE chip (nominationOdds) renders when a comparable remains and hides otherwise", () => {
    const { rerender } = render(<WhisperPanel payload={Object.assign(payload("push"), {
      nominationChip: { position: "CF", pWithin: 0.7231, withinLots: 3 },
    })} />);
    expect(screen.getByTestId("whisper-tier2-nomination-odds")).toHaveTextContent("Next CF: ~72% within 3 lots");

    rerender(<WhisperPanel payload={Object.assign(payload("push"), { nominationChip: null })} />);
    expect(screen.queryByTestId("whisper-tier2-nomination-odds")).not.toBeInTheDocument();
  });

  test("grade sanity chip shows the grade's OWN GRADE_SALARY_BOUNDS floor-to-ceiling verbatim (no-new-math regression lock)", () => {
    // Captain ruling 2026-07-08: "normal for a B+" = that grade's own salary floor/ceiling from
    // the tested GRADE_SALARY_BOUNDS table -- never a synthesized window spanning neighboring
    // grades. Assert the displayed dollars equal the table entry verbatim so any drift toward
    // invented band math fails here.
    const lotPlayer = gradeChipPlayer("B+");

    render(<WhisperPanel payload={Object.assign(payload("push"), {
      currentLotPlayerId: "lot-star",
      boardPlayers: { "lot-star": lotPlayer },
    })} />);

    const bounds = GRADE_SALARY_BOUNDS["B+"];
    expect(screen.getByTestId("whisper-tier2-grade")).toHaveTextContent(
      `Normal for a B+: ${chipMoney(bounds.floor)}–${chipMoney(bounds.ceiling)}`,
    );
  });

  test("grade sanity chip falls back to the worst priced tier (D) for storage's 'D-', which the bounds table lacks", () => {
    const lotPlayer = gradeChipPlayer("D-");

    render(<WhisperPanel payload={Object.assign(payload("push"), {
      currentLotPlayerId: "lot-star",
      boardPlayers: { "lot-star": lotPlayer },
    })} />);

    const bounds = GRADE_SALARY_BOUNDS["D"];
    expect(screen.getByTestId("whisper-tier2-grade")).toHaveTextContent(
      `Normal for a D: ${chipMoney(bounds.floor)}–${chipMoney(bounds.ceiling)}`,
    );
    expect(screen.getByTestId("whisper-tier2-grade").textContent ?? "").not.toContain("D-");
  });

  test("lights become compact icons above the fold: sentence hidden until tapped, no sentence shown by default", () => {
    render(<WhisperPanel payload={payload("push")} />);

    // The 4 non-BALANCE lights render inside whisper-tier2 without opening the panel.
    expect(within(screen.getByTestId("whisper-tier2")).getByRole("button", { name: "SHAPE" })).toBeInTheDocument();
    expect(within(screen.getByTestId("whisper-tier2")).getByRole("button", { name: "BUDGET" })).toBeInTheDocument();
    expect(screen.queryByTestId("whisper-tier2-light-sentence")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "IDENTITY" }));
    expect(screen.getByTestId("whisper-tier2-light-sentence")).toHaveTextContent("Identity is clean.");
  });

  test("farm tier still has no MLB-style Tier-1/Tier-2 promotion, and lights stay inside the tap-through body", () => {
    render(<WhisperPanel payload={payload("push")} tier="farm" />);

    expect(screen.queryByTestId("whisper-tier1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("whisper-tier2")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "SHAPE" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("whisper-strip"));
    expect(within(screen.getByTestId("whisper-body")).getByRole("button", { name: "SHAPE" })).toBeInTheDocument();
    expect(within(screen.getByTestId("whisper-body")).getByRole("button", { name: "BUDGET" })).toBeInTheDocument();
  });

  test("COCKPIT W1d: farm renders ONLY the SHAPE + BUDGET lights -- IDENTITY and CHEMISTRY are absent, not stubbed", () => {
    render(<WhisperPanel payload={payload("push")} tier="farm" />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    const body = within(screen.getByTestId("whisper-body"));
    expect(body.getByRole("button", { name: "SHAPE" })).toBeInTheDocument();
    expect(body.getByRole("button", { name: "BUDGET" })).toBeInTheDocument();
    expect(body.queryByRole("button", { name: "IDENTITY" })).not.toBeInTheDocument();
    expect(body.queryByRole("button", { name: "CHEMISTRY" })).not.toBeInTheDocument();
  });

  test("COCKPIT W1d: the farm bridge headline renders always-visible above the strip, and never on MLB", () => {
    const { rerender } = render(
      <WhisperPanel
        payload={Object.assign(payload("push"), { bridgeHeadline: "Board flags C coverage below target -- work the farm floor there first." })}
        tier="farm"
      />,
    );

    expect(screen.getByTestId("whisper-farm-bridge")).toHaveTextContent(
      "Board flags C coverage below target -- work the farm floor there first.",
    );
    // It is visible BEFORE the panel is opened -- zero taps, like Tier 1.
    expect(screen.queryByTestId("whisper-body")).not.toBeInTheDocument();

    rerender(<WhisperPanel payload={Object.assign(payload("push"), { bridgeHeadline: null })} tier="farm" />);
    expect(screen.queryByTestId("whisper-farm-bridge")).not.toBeInTheDocument();

    // Never rendered on the MLB tier even if a payload somehow carried the field.
    rerender(<WhisperPanel payload={Object.assign(payload("push"), { bridgeHeadline: "should never show" })} tier="mlb" />);
    expect(screen.queryByTestId("whisper-farm-bridge")).not.toBeInTheDocument();
  });

  test("COCKPIT W1d fork 3: the dark-first chem-fit chip is absent by default and renders only when the payload carries a label", () => {
    const { rerender } = render(<WhisperPanel payload={payload("push")} tier="farm" />);
    expect(screen.queryByTestId("whisper-farm-chem-fit")).not.toBeInTheDocument();

    rerender(
      <WhisperPanel
        payload={Object.assign(payload("push"), { chemFitLabel: "Chem fit +8% — Spirited room" })}
        tier="farm"
      />,
    );
    expect(screen.getByTestId("whisper-farm-chem-fit")).toHaveTextContent("Chem fit +8% — Spirited room");
  });

  test("COCKPIT W1d rework (audit note g): a farm board row's popover is tier-gated to scout bands even for an UNSET ratingRevealState; MLB keeps the full reveal", () => {
    // Adversarial record: no 'hidden' literal at all (unset) -- before the rework, BoardRow's
    // hardcoded revealFull would have taken draftProfileModel's reveal branch for this player on
    // the FARM tier. The tier gate must hold on its own.
    const boardPlayer: Player = {
      ...gradeChipPlayer("B"),
      id: "seat-a-only",
      ratingRevealState: undefined,
      prospectProfile: {
        scoutedGrade: "B",
        potentialGrade: "A-",
        scoutConfidence: "medium",
        scoutName: "Scout Vale",
      },
    } as Player;
    const boardExtras = {
      boardPlayers: { "seat-a-only": boardPlayer },
      boardMeta: { "seat-a-only": { name: "Seat A Slider" } },
    };

    const { unmount } = render(<WhisperPanel payload={Object.assign(payload("push"), boardExtras)} tier="farm" />);
    fireEvent.click(screen.getByTestId("whisper-strip"));
    fireEvent.click(screen.getByRole("button", { name: "Seat A Slider" }));
    expect(screen.getByText("Farm - scouting only")).toBeInTheDocument();
    expect(screen.queryByText("POW")).not.toBeInTheDocument();
    unmount();

    // MLB control: the SAME record on the MLB tier legitimately reveals full ratings.
    render(<WhisperPanel payload={Object.assign(payload("push"), boardExtras)} tier="mlb" />);
    fireEvent.click(screen.getByTestId("whisper-strip"));
    fireEvent.click(screen.getByRole("button", { name: "Seat A Slider" }));
    expect(screen.getByText("POW")).toBeInTheDocument();
    expect(screen.queryByText("Farm - scouting only")).not.toBeInTheDocument();
  });
});

describe("COCKPIT WAVE 2: THE BOARD (setup + live GM-sortable global/per-position, auto-advance)", () => {
  function positionBoard(): RosterIntelligencePayload["board"] {
    return [
      { playerId: "ss-hi", worth: 90_000, matchedShape: "SS", needTag: null, fitTag: null, note: "Star Short", position: "SS" },
      { playerId: "ss-lo", worth: 40_000, matchedShape: "SS", needTag: null, fitTag: null, note: "Weak Short", position: "SS" },
      { playerId: "cf-hi", worth: 80_000, matchedShape: "CF", needTag: null, fitTag: null, note: "Star Center", position: "CF" },
      { playerId: "cf-lo", worth: 30_000, matchedShape: "CF", needTag: null, fitTag: null, note: "Weak Center", position: "CF" },
    ];
  }

  test("the GLOBAL/PER-POSITION toggle appears on MLB with a non-empty board, and never on farm", () => {
    render(<WhisperPanel payload={payload("push", { board: positionBoard() })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));
    expect(screen.getByTestId("whisper-board-view-toggle")).toBeInTheDocument();
    cleanup();

    render(<WhisperPanel payload={payload("push", { board: positionBoard() })} tier="farm" />);
    fireEvent.click(screen.getByTestId("whisper-strip"));
    expect(screen.queryByTestId("whisper-board-view-toggle")).not.toBeInTheDocument();
  });

  test("PER-POSITION shows a tab per canonical position with counts, and 5-deep + SHOW ALL for a deep position", () => {
    const deepBoard = Array.from({ length: 7 }, (_, index) => ({
      playerId: `ss-${index}`,
      worth: 700_000 - index * 1_000,
      matchedShape: "SS",
      needTag: null,
      fitTag: null,
      note: `Shortstop ${index}`,
      position: "SS",
    }));
    render(<WhisperPanel payload={payload("push", { board: deepBoard })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));
    fireEvent.click(screen.getByTestId("whisper-board-view-toggle").querySelector("button:nth-child(2)")!);

    const positionView = screen.getByTestId("whisper-board-position-view");
    expect(within(positionView).getByRole("button", { name: "SS (7)" })).toBeInTheDocument();
    expect(within(positionView).getByRole("button", { name: "CF (0)" })).toBeInTheDocument();
    // Default-selected position is the first canonical group (C, empty here) -- select SS.
    fireEvent.click(within(positionView).getByRole("button", { name: "SS (7)" }));
    expect(within(positionView).getAllByText(/^\$/)).toHaveLength(5);
    fireEvent.click(within(positionView).getByRole("button", { name: "SHOW ALL 7" }));
    expect(within(positionView).getAllByText(/^\$/)).toHaveLength(7);
  });

  test("GLOBAL expanded reorder calls onBoardReorderGlobal with the full new order", () => {
    const onBoardReorderGlobal = vi.fn();
    render(
      <WhisperPanel
        payload={Object.assign(payload("push", { board: positionBoard() }), { onBoardReorderGlobal })}
      />,
    );
    fireEvent.click(screen.getByTestId("whisper-strip"));
    fireEvent.click(screen.getByRole("button", { name: "FULL BOARD" }));
    // positionBoard() literal order is [ss-hi, ss-lo, cf-hi, cf-lo] -- WhisperPanel renders board
    // exactly as given (the engine, not this component, owns sort order). "Star Center" (cf-hi) is
    // at index 2; moving it up swaps it with ss-lo at index 1.
    fireEvent.click(screen.getByRole("button", { name: "Move Star Center up" }));
    expect(onBoardReorderGlobal).toHaveBeenCalledWith(["ss-hi", "cf-hi", "ss-lo", "cf-lo"]);
  });

  test("BOARDFIX1 wiring: GLOBAL expanded board supports native drag-and-drop end to end, not just arrows", () => {
    const onBoardReorderGlobal = vi.fn();
    const { container } = render(
      <WhisperPanel
        payload={Object.assign(payload("push", { board: positionBoard() }), { onBoardReorderGlobal })}
      />,
    );
    fireEvent.click(screen.getByTestId("whisper-strip"));
    fireEvent.click(screen.getByRole("button", { name: "FULL BOARD" }));

    const dragHandle = screen.getByRole("button", { name: "Drag Weak Center" });
    expect(dragHandle).toHaveAttribute("draggable", "true");
    const dropRow = screen.getByText("Star Short").closest("div") as HTMLElement;
    const dataTransfer = { effectAllowed: "", setData: vi.fn() };
    fireEvent.dragStart(dragHandle, { dataTransfer });
    fireEvent.dragOver(dropRow, { dataTransfer });
    fireEvent.drop(dropRow, { dataTransfer });

    expect(onBoardReorderGlobal).toHaveBeenCalledWith(["cf-lo", "ss-hi", "ss-lo", "cf-hi"]);
    // Sanity check this is the real reorder-list markup, not a fallback static list.
    expect(container.querySelector(".whisper-board-reorder-list")).toBeInTheDocument();
  });

  test("BOARDFIX1: GLOBAL expanded board's rank badge supports type-in edit and send-to-top, with exactly one rank number per row", () => {
    const onBoardReorderGlobal = vi.fn();
    render(
      <WhisperPanel
        payload={Object.assign(payload("push", { board: positionBoard() }), { onBoardReorderGlobal })}
      />,
    );
    fireEvent.click(screen.getByTestId("whisper-strip"));
    fireEvent.click(screen.getByRole("button", { name: "FULL BOARD" }));

    // Exactly one rank number per row -- the interactive RankReorderList badge, not a duplicate
    // static ".whisper-rank" number from BoardRowFields (BOARDFIX1 suppresses the latter here).
    expect(screen.getByRole("button", { name: "Set rank for Weak Center" })).toHaveTextContent("4");
    expect(document.querySelectorAll(".whisper-rank").length).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Send Weak Center to top" }));
    expect(onBoardReorderGlobal).toHaveBeenCalledWith(["cf-lo", "ss-hi", "ss-lo", "cf-hi"]);

    onBoardReorderGlobal.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Set rank for Star Center" }));
    const input = screen.getByRole("spinbutton", { name: "Set rank for Star Center" });
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onBoardReorderGlobal).toHaveBeenCalledWith(["cf-hi", "ss-hi", "ss-lo", "cf-lo"]);
  });

  test("PER-POSITION reorder calls onBoardReorderPosition with the position and preserves the hidden remainder", () => {
    const onBoardReorderPosition = vi.fn();
    const deepBoard = Array.from({ length: 6 }, (_, index) => ({
      playerId: `ss-${index}`,
      worth: 600_000 - index * 1_000,
      matchedShape: "SS",
      needTag: null,
      fitTag: null,
      note: `Shortstop ${index}`,
      position: "SS",
    }));
    render(
      <WhisperPanel payload={Object.assign(payload("push", { board: deepBoard }), { onBoardReorderPosition })} />,
    );
    fireEvent.click(screen.getByTestId("whisper-strip"));
    fireEvent.click(screen.getByTestId("whisper-board-view-toggle").querySelector("button:nth-child(2)")!);
    fireEvent.click(screen.getByRole("button", { name: "Move Shortstop 1 up" }));

    expect(onBoardReorderPosition).toHaveBeenCalledWith("SS", ["ss-1", "ss-0", "ss-2", "ss-3", "ss-4", "ss-5"]);
  });

  test("without reorder callbacks the board renders read-only -- no drag handle or arrow buttons anywhere", () => {
    render(<WhisperPanel payload={payload("push", { board: positionBoard() })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));
    fireEvent.click(screen.getByRole("button", { name: "FULL BOARD" }));
    expect(screen.queryByRole("button", { name: /^Move /i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Drag /i })).not.toBeInTheDocument();
  });

  test("BOARDFIX2 (Item B): PER-POSITION materializes an explicit rank override instead of blending it with worth", () => {
    // Root cause this proves fixed: sortBoardEntriesForPosition's blend is a worth+rank NUDGE, not
    // a positional override -- ranking the objectively weakest SS #1 used to render him wherever
    // his worth deficit left him after the bonus, not literally first. materializeRankOrder
    // (applied in WhisperPanel's boardPositionView memo) places him at his literal index.
    const deepBoard: RosterIntelligencePayload["board"] = [
      { playerId: "ss-star", worth: 500_000, matchedShape: "SS", needTag: null, fitTag: null, note: "Star Short", position: "SS" },
      { playerId: "ss-high", worth: 300_000, matchedShape: "SS", needTag: null, fitTag: null, note: "High Short", position: "SS" },
      { playerId: "ss-mid", worth: 150_000, matchedShape: "SS", needTag: null, fitTag: null, note: "Mid Short", position: "SS" },
      { playerId: "ss-low", worth: 50_000, matchedShape: "SS", needTag: null, fitTag: null, note: "Low Short", position: "SS" },
      { playerId: "ss-weak", worth: 5_000, matchedShape: "SS", needTag: null, fitTag: null, note: "Weak Short", position: "SS" },
    ];
    render(
      <WhisperPanel
        payload={Object.assign(payload("push", { board: deepBoard }), {
          boardRankOverrides: { byPosition: { SS: ["ss-weak"] } },
        })}
      />,
    );
    fireEvent.click(screen.getByTestId("whisper-strip"));
    fireEvent.click(screen.getByTestId("whisper-board-view-toggle").querySelector("button:nth-child(2)")!);
    const positionView = screen.getByTestId("whisper-board-position-view");
    fireEvent.click(within(positionView).getByRole("button", { name: "SS (5)" }));

    const names = Array.from(positionView.querySelectorAll(".whisper-board-name")).map((el) => el.textContent);
    expect(names).toEqual(["Weak Short", "Star Short", "High Short", "Mid Short", "Low Short"]);
  });

  test("the auto-advance 'Next up' Tier-2 line renders on MLB when present, and is absent otherwise / on farm", () => {
    render(
      <WhisperPanel
        payload={Object.assign(payload("push"), { nextUpLine: "Next up at CF: Ramírez — your #2." })}
      />,
    );
    expect(screen.getByTestId("whisper-next-up")).toHaveTextContent("Next up at CF: Ramírez — your #2.");
    cleanup();

    render(<WhisperPanel payload={payload("push")} />);
    expect(screen.queryByTestId("whisper-next-up")).not.toBeInTheDocument();
    cleanup();

    render(
      <WhisperPanel
        payload={Object.assign(payload("push"), { nextUpLine: "Next up at CF: Ramírez — your #2." })}
        tier="farm"
      />,
    );
    expect(screen.queryByTestId("whisper-next-up")).not.toBeInTheDocument();
  });
});
