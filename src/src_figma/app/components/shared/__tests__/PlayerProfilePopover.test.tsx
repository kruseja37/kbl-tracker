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
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByText("91")).not.toBeInTheDocument();
    expect(screen.queryByText("POW")).not.toBeInTheDocument();
  });
});
