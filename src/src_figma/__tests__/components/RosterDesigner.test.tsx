import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  RosterDesigner,
  seedRosterDesignSlots,
} from "../../app/components/leagueBuilder/RosterDesigner";
import {
  countEligibleForAsk,
  type DesignSlot,
} from "../../../engines/rosterDesignFeasibility";
import { classifyPlayerArchetype } from "../../../engines/playerArchetypeClassifier";
import { buildRosterDesignPool } from "../../app/engines/leaguePlayerAdapter";
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

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
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
    ...overrides,
  };
}

function clickTemperament(value: "ANY" | "STEADY") {
  fireEvent.click(screen.getByRole("button", { name: /^CANY/i }));
  fireEvent.click(screen.getByRole("button", { name: value }));
}

function clickSlot(label: string) {
  const slotLabel = screen.getByText(label);
  const button = slotLabel.closest("button");
  if (!button) throw new Error(`No button found for ${label}`);
  fireEvent.click(button);
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
        tier="juiced"
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
        tier="juiced"
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

  test("flushes a pending edit on unmount before the debounce fires", async () => {
    const onSave = vi.fn(async () => undefined);
    const { unmount } = render(
      <RosterDesigner
        team={makeTeam("team-a", "Alpha")}
        mode="pool-first"
        players={players}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={onSave}
      />,
    );

    clickTemperament("STEADY");
    expect(onSave).not.toHaveBeenCalled();

    unmount();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].slots.find((slot) => slot.slotId === "C")?.preference?.personalityTilt)
      .toBe("prefer-steady");
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
        tier="juiced"
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
        tier="juiced"
        showHelp={true}
        onSave={onSave}
      />,
    );

    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await act(async () => undefined);

    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(350);
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
        tier="juiced"
        showHelp={false}
        onSave={onSave}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("RosterDesigner defaults and ask scoping", () => {
  afterEach(() => {
    cleanup();
  });

  test("C1-C2: RP1 defaults to avoid-fragile, RP2-4 stay any, and saved RP1 any survives", () => {
    const fresh = seedRosterDesignSlots();
    expect(fresh.find((slot) => slot.slotId === "RP1")?.preference?.personalityTilt).toBe("avoid-fragile");
    for (const slotId of ["RP2", "RP3", "RP4"]) {
      expect(fresh.find((slot) => slot.slotId === slotId)?.preference?.personalityTilt).toBe("any");
    }

    const saved: DesignSlot[] = [{ slotId: "RP1", kind: "rp", preference: { personalityTilt: "any" } }];
    expect(seedRosterDesignSlots(saved).find((slot) => slot.slotId === "RP1")?.preference?.personalityTilt)
      .toBe("any");
  });

  test("C3: RP1 renders as the closer label without changing the slot id", () => {
    render(
      <RosterDesigner
        team={makeTeam("team-a", "Alpha")}
        mode="pool-first"
        players={[makePlayer("player-1")]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText("RP1 · CLOSER")).toBeInTheDocument();
  });

  test("D1: TWO-WAY toggle only renders where a two-way player is eligible", () => {
    render(
      <RosterDesigner
        team={makeTeam("team-a", "Alpha")}
        mode="pool-first"
        players={[
          makePlayer("lf", { primaryPosition: "LF" }),
          makePlayer("rp", { primaryPosition: "RP", velocity: 70, junk: 70, accuracy: 70 }),
        ]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    for (const label of ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "BENCH 1", "BENCH 2", "BENCH 3", "BENCH 4"]) {
      clickSlot(label);
      expect(screen.queryByRole("button", { name: /TWO-WAY/ })).toBeNull();
    }

    for (const label of ["BACKUP C", "SP1", "SP2", "SP3", "SP4", "RP1 · CLOSER", "RP2", "RP3", "RP4", "SWING"]) {
      clickSlot(label);
      expect(screen.getByRole("button", { name: /TWO-WAY/ })).toBeInTheDocument();
    }
  });

  test("D2-D3: saved impossible two-way tags are stripped from field and flex slots but preserved on RP1", () => {
    const saved = seedRosterDesignSlots([
      { slotId: "LF", kind: "pos", position: "LF", preference: { tags: { twoWay: true } } },
      { slotId: "FLEX1", kind: "flex", preference: { tags: { twoWay: true } } },
      { slotId: "RP1", kind: "rp", preference: { tags: { twoWay: true } } },
    ]);
    const lf = saved.find((slot) => slot.slotId === "LF");
    const flex = saved.find((slot) => slot.slotId === "FLEX1");
    const rp1 = saved.find((slot) => slot.slotId === "RP1");

    expect(lf?.preference?.tags?.twoWay).toBeUndefined();
    expect(flex?.preference?.tags?.twoWay).toBeUndefined();
    expect(rp1?.preference?.tags?.twoWay).toBe(true);

    const pool = buildRosterDesignPool([makePlayer("lf", { primaryPosition: "LF" })]);
    const classified = pool.map((player) => ({ ...player, classification: classifyPlayerArchetype(player.profile) }));
    expect(countEligibleForAsk(lf!, undefined, classified)).toBeGreaterThan(0);
  });
});
