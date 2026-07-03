import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { RosterDesigner } from "../../app/components/leagueBuilder/RosterDesigner";
import type { Player, Team } from "../../../utils/leagueBuilderStorage";

function makeTeam(id: string, name: string): Team {
  return {
    id,
    name,
    abbreviation: name.slice(0, 3).toUpperCase(),
    location: "Test City",
    nickname: name,
    colors: { primary: "#123456", secondary: "#abcdef" },
    stadium: "Test Park",
    leagueIds: ["league-test"],
    createdDate: "2026-07-02T00:00:00.000Z",
    lastModified: "2026-07-02T00:00:00.000Z",
  };
}

function makePlayer(id: string): Player {
  return {
    id,
    firstName: "Test",
    lastName: id,
    gender: "M",
    age: 27,
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
    personality: "Tough",
    chemistry: "Competitive",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 10_000,
    createdDate: "2026-07-02T00:00:00.000Z",
    lastModified: "2026-07-02T00:00:00.000Z",
    isCustom: true,
  };
}

function clickTemperament(value: "ANY" | "STEADY") {
  fireEvent.click(screen.getByRole("button", { name: /^CANY/i }));
  fireEvent.click(screen.getByRole("button", { name: value }));
}

describe("RosterDesigner debounce saves", () => {
  const players = [makePlayer("player-1")];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test("flushes an edited outgoing club before loading another club", async () => {
    const teamA = makeTeam("team-a", "Alpha");
    const teamB = makeTeam("team-b", "Beta");
    let resolveSave: () => void = () => undefined;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const onSaveA = vi.fn(() => savePromise);
    const onSaveB = vi.fn(async () => undefined);

    const { rerender } = render(
      <RosterDesigner
        team={teamA}
        mode="pool-first"
        players={players}
        lockedPool={false}
        budget={500_000}
        showHelp={false}
        onSave={onSaveA}
      />,
    );

    clickTemperament("STEADY");

    rerender(
      <RosterDesigner
        team={teamB}
        mode="pool-first"
        players={players}
        lockedPool={false}
        budget={500_000}
        showHelp={false}
        onSave={onSaveB}
      />,
    );

    expect(onSaveA).toHaveBeenCalledTimes(1);
    expect(onSaveA.mock.calls[0][0].slots.find((slot) => slot.slotId === "C")?.preference?.personalityTilt)
      .toBe("prefer-steady");

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(onSaveB).not.toHaveBeenCalled();

    resolveSave();
    await act(async () => undefined);
  });

  test("same-team rerender mid-debounce still saves exactly once", async () => {
    const teamA = makeTeam("team-a", "Alpha");
    const onSave = vi.fn(async () => undefined);

    const { rerender } = render(
      <RosterDesigner
        team={teamA}
        mode="pool-first"
        players={players}
        lockedPool={false}
        budget={500_000}
        showHelp={false}
        onSave={onSave}
      />,
    );

    clickTemperament("STEADY");

    rerender(
      <RosterDesigner
        team={teamA}
        mode="pool-first"
        players={players}
        lockedPool={false}
        budget={500_000}
        showHelp={true}
        onSave={onSave}
      />,
    );

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await act(async () => undefined);

    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test("first open of a club does not write the seeded default", async () => {
    const onSave = vi.fn(async () => undefined);

    render(
      <RosterDesigner
        team={makeTeam("team-a", "Alpha")}
        mode="pool-first"
        players={players}
        lockedPool={false}
        budget={500_000}
        showHelp={false}
        onSave={onSave}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});
