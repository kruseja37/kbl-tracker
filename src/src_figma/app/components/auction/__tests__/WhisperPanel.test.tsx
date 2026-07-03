import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
      verdict,
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
      { playerId: "lot-star", worth: 75_000, matchedShape: "SS", note: "Seat A Star" },
      { playerId: "seat-a-only", worth: 64_000, matchedShape: "CF", note: "Seat A Slider" },
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
