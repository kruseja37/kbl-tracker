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

  test("hollow balance, absent scorecard, and absent lot follow the dormant piece rules", () => {
    render(<WhisperPanel payload={payload()} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.getByRole("button", { name: "BALANCE" })).toHaveAttribute("data-status", "unknown");

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

  test("YOUR NUMBER renders recommendedNumber instead of the affordability ceiling", () => {
    render(<WhisperPanel payload={payload("push", {
      worthToYou: {
        ...payload().worthToYou!,
        recommendedNumber: 96_000,
        capValue: 809_714,
      },
    })} />);
    fireEvent.click(screen.getByTestId("whisper-strip"));

    expect(screen.getByText("$96,000")).toBeInTheDocument();
    expect(screen.getByText("Go get him -- worth about $96,000 to you.")).toBeInTheDocument();
    expect(screen.queryByText("$809,714")).not.toBeInTheDocument();
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
