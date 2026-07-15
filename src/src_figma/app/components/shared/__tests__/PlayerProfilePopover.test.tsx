import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { PlayerProfilePopover } from "../PlayerProfilePopover";
import type { Player } from "../../../../../utils/leagueBuilderStorage";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "popover-player",
    firstName: "Mara",
    lastName: "Slate",
    gender: "F",
    age: 24,
    bats: "R",
    throws: "R",
    armSlot: "High",
    primaryPosition: "CF",
    secondaryPosition: "LF",
    power: 91,
    contact: 84,
    speed: 77,
    fielding: 66,
    arm: 55,
    velocity: 44,
    junk: 33,
    accuracy: 22,
    arsenal: ["4F", "SL"],
    overallGrade: "A",
    trait1: "Disciplined",
    trait2: "RBI Man",
    personality: "Competitive",
    chemistry: "Scholarly",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 1_000_000,
    createdDate: "2026-07-04",
    lastModified: "2026-07-04",
    isCustom: true,
    ...overrides,
  };
}

afterEach(() => cleanup());

describe("PlayerProfilePopover", () => {
  test("revealed MLB profile shows rating values", () => {
    render(
      <PlayerProfilePopover player={makePlayer()} revealFull>
        <span>Mara Slate</span>
      </PlayerProfilePopover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mara Slate" }));

    expect(screen.getByText("POW")).toBeInTheDocument();
    expect(screen.getByText("91")).toBeInTheDocument();
    expect(screen.queryByText("Farm - scouting only")).not.toBeInTheDocument();
  });

  test("hidden farm profile shows scout bands without rating values", () => {
    render(
      <PlayerProfilePopover
        player={makePlayer({
          ratingRevealState: "hidden",
          prospectProfile: {
            scoutedGrade: "B",
            potentialGrade: "A-",
            scoutConfidence: "medium",
            scoutName: "Scout Vale",
          },
        })}
        revealFull={false}
      >
        <span>Mara Slate</span>
      </PlayerProfilePopover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mara Slate" }));

    expect(screen.getByText("Farm - scouting only")).toBeInTheDocument();
    // COCKPIT W1d (WT-D audit follow-up): positive assertions that the band branch actually
    // RENDERS its scout bands -- not just that the hidden data is absent. All four band cells
    // (SCOUT/POT/CONF/NAME) and their values must appear.
    expect(screen.getByText("SCOUT")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("POT")).toBeInTheDocument();
    expect(screen.getByText("A-")).toBeInTheDocument();
    expect(screen.getByText("CONF")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
    expect(screen.getByText("NAME")).toBeInTheDocument();
    expect(screen.getByText("Scout Vale")).toBeInTheDocument();
    expect(screen.queryByText("91")).not.toBeInTheDocument();
    expect(screen.queryByText("POW")).not.toBeInTheDocument();
  });

  test("Historical Legends profile surfaces version, confidence, backstory, and connections", () => {
    render(
      <PlayerProfilePopover
        player={makePlayer({
          sourceDatabase: "HISTORICAL_LEGENDS",
          backstory: "A precise evidence-backed career story.",
          historicalProfileType: "Career",
          historicalLegend: {
            playerId: "slatm001",
            displayName: "Mara Slate",
            profileType: "Career",
            sourceCardId: "source:career",
            sourceWindowId: "career",
            sourceVersionClass: "career",
            imageAge: 24,
            lore: {},
            rivalries: [{ rivalName: "June Vale", relationship: "Rivalry" }],
            confidence: { overall: 94, fields: {} },
            personalityEvidence: [],
            researchFlags: [],
            identityClaims: [],
            provenance: {},
          },
        })}
        revealFull
      >
        <span>Mara Slate</span>
      </PlayerProfilePopover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mara Slate" }));

    expect(screen.getByText("Version: Career")).toBeInTheDocument();
    expect(screen.getByText("Overall confidence: 94/99")).toBeInTheDocument();
    expect(screen.getByText("A precise evidence-backed career story.")).toBeInTheDocument();
    expect(screen.getByText("Rivalry: June Vale")).toBeInTheDocument();
  });

  test("ordinary revealed profiles do not gain Historical Legends context", () => {
    render(
      <PlayerProfilePopover player={makePlayer()} revealFull>
        <span>Mara Slate</span>
      </PlayerProfilePopover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mara Slate" }));

    expect(screen.queryByLabelText("Historical Legend context")).not.toBeInTheDocument();
    expect(screen.queryByText(/Overall confidence:/)).not.toBeInTheDocument();
  });
});
