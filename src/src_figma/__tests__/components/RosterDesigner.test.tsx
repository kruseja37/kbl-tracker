import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

function makeTeam(id: string, name: string, overrides: Partial<Team> = {}): Team {
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
    ...overrides,
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

function shortlistLines(): string[] {
  const rail = screen.getByText("THE ASK'S SHORTLIST").parentElement;
  if (!rail) throw new Error("No shortlist rail found");
  return Array.from(rail.querySelectorAll("span.min-w-0.truncate")).map((element) => element.textContent ?? "");
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

  test("resolves orphaned pin names from the full player universe", () => {
    const pinned = makePlayer("known-pin", {
      firstName: "Known",
      lastName: "Pin",
    });
    const team = makeTeam("team-a", "Alpha", {
      rosterDesign: {
        slots: seedRosterDesignSlots(),
        pins: { SS: pinned.id },
      },
    });

    render(
      <RosterDesigner
        team={team}
        mode="pool-first"
        players={[]}
        allPlayers={[pinned]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText(/Known Pin/)).toBeInTheDocument();
    expect(screen.queryByText(/known-pin/)).not.toBeInTheDocument();
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

  test("C1-C2: CP defaults to avoid-fragile, RP1-3 stay any, and saved CP any survives", () => {
    const fresh = seedRosterDesignSlots();
    expect(fresh.find((slot) => slot.slotId === "CP")?.preference?.personalityTilt).toBe("avoid-fragile");
    for (const slotId of ["RP1", "RP2", "RP3"]) {
      expect(fresh.find((slot) => slot.slotId === slotId)?.preference?.personalityTilt).toBe("any");
    }

    const saved: DesignSlot[] = [{ slotId: "CP", kind: "cp", preference: { personalityTilt: "any" } }];
    expect(seedRosterDesignSlots(saved).find((slot) => slot.slotId === "CP")?.preference?.personalityTilt)
      .toBe("any");

    const legacy: DesignSlot[] = [{ slotId: "RP4", kind: "rp", preference: { shape: "Two-Pitch-Reliever" } }];
    expect(seedRosterDesignSlots(legacy).find((slot) => slot.slotId === "CP")?.preference?.shape)
      .toBe("Two-Pitch-Reliever");
  });

  test("C3: CP renders as the closer label", () => {
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

    expect(screen.getByText("CP · CLOSER")).toBeInTheDocument();
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

    for (const label of ["BACKUP C", "SP1", "SP2", "SP3", "SP4", "RP1", "RP2", "RP3", "CP · CLOSER", "SWING"]) {
      clickSlot(label);
      expect(screen.getByRole("button", { name: /TWO-WAY/ })).toBeInTheDocument();
    }
  }, 10_000);

  test("D2-D3: saved impossible two-way tags are stripped from field and flex slots but preserved on CP", () => {
    const saved = seedRosterDesignSlots([
      { slotId: "LF", kind: "pos", position: "LF", preference: { tags: { twoWay: true } } },
      { slotId: "FLEX1", kind: "flex", preference: { tags: { twoWay: true } } },
      { slotId: "CP", kind: "cp", preference: { tags: { twoWay: true } } },
    ]);
    const lf = saved.find((slot) => slot.slotId === "LF");
    const flex = saved.find((slot) => slot.slotId === "FLEX1");
    const cp = saved.find((slot) => slot.slotId === "CP");

    expect(lf?.preference?.tags?.twoWay).toBeUndefined();
    expect(flex?.preference?.tags?.twoWay).toBeUndefined();
    expect(cp?.preference?.tags?.twoWay).toBe(true);

    const pool = buildRosterDesignPool([makePlayer("lf", { primaryPosition: "LF" })]);
    const classified = pool.map((player) => ({ ...player, classification: classifyPlayerArchetype(player.profile) }));
    expect(countEligibleForAsk(lf!, undefined, classified)).toBeGreaterThan(0);
  });
});

describe("buildRosterDesignPool canonical slot mapping", () => {
  test("maps bare P/TWO-WAY primaries as roleless, while normal arms and Two Way traits stay eligible", () => {
    const pool = buildRosterDesignPool([
      makePlayer("bare-p", { primaryPosition: "P" }),
      makePlayer("bare-two-way", { primaryPosition: "TWO-WAY" }),
      makePlayer("starter", { primaryPosition: "SP" }),
      makePlayer("swing", { primaryPosition: "SP/RP" }),
      makePlayer("closer", { primaryPosition: "CP" }),
      makePlayer("trait-two-way", { primaryPosition: "RP", trait1: "Two Way (C)" }),
    ]);
    const byId = new Map(pool.map((player) => [player.id, player]));

    expect(byId.get("bare-p")?.slotPlayer.role).toBeUndefined();
    expect(byId.get("bare-two-way")?.slotPlayer.role).toBeUndefined();
    expect(byId.get("starter")?.slotPlayer.role).toBe("SP");
    expect(byId.get("swing")?.slotPlayer.role).toBe("SP/RP");
    expect(byId.get("closer")?.slotPlayer.role).toBe("CP");
    expect(byId.get("trait-two-way")?.slotPlayer.role).toBe("RP");
    expect(byId.get("trait-two-way")?.slotPlayer.twoWayVariant).toBe("C");
  });
});

describe("RosterDesigner extracted edit affordances and pins", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test("W1: extracted locked designs expose UNLOCK & EDIT inside the same slot editor", () => {
    const team = makeTeam("team-a", "Alpha", {
      rosterDesign: {
        slots: seedRosterDesignSlots(),
        lockedAt: "2026-07-03T00:00:00.000Z",
      },
    });

    render(
      <RosterDesigner
        team={team}
        mode="design-first"
        players={[makePlayer("shortstop", { primaryPosition: "SS" })]}
        lockedPool={false}
        poolDrawn
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    clickSlot("SS");
    expect(screen.getByText("EDITS RE-OPEN THE PLAN — LOCK AGAIN AND RE-EXTRACT TO APPLY")).toBeInTheDocument();
    expect(screen.getByText("🔒 THE ASK IS LOCKED — THE POOL WAS DRAWN FROM IT")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ANY SHAPE/i })).toBeDisabled();

    const unlockButtons = screen.getAllByRole("button", { name: "UNLOCK & EDIT" });
    fireEvent.click(unlockButtons[unlockButtons.length - 1]);

    expect(screen.getByText("SS — THE ASK")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ANY SHAPE/i })).not.toBeDisabled();
  });

  test("W2: saved-draft readOnly shows the disabled reason without an unlock affordance in the editor", () => {
    render(
      <RosterDesigner
        team={makeTeam("team-a", "Alpha")}
        mode="design-first"
        players={[makePlayer("shortstop", { primaryPosition: "SS" })]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        disabled
        disabledReason="Draft Saved"
        onSave={vi.fn(async () => undefined)}
      />,
    );

    clickSlot("SS");

    expect(screen.getAllByText("Draft Saved").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "UNLOCK & EDIT" })).toBeNull();
    expect(screen.getByRole("button", { name: /ANY SHAPE/i })).toBeDisabled();
  });

  test("P7: saved pins reload and legacy designs without pins load cleanly", async () => {
    const onSave = vi.fn(async () => undefined);
    const player = makePlayer("pin-one", { primaryPosition: "SS" });
    const team = makeTeam("team-a", "Alpha");
    const { unmount } = render(
      <RosterDesigner
        team={team}
        mode="pool-first"
        players={[player]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={onSave}
      />,
    );

    clickSlot("SS");
    fireEvent.click(screen.getByRole("button", { name: "PIN" }));

    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await act(async () => undefined);

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.pins).toEqual({ SS: "pin-one" });

    unmount();
    render(
      <RosterDesigner
        team={makeTeam("team-b", "Beta", { rosterDesign: saved })}
        mode="pool-first"
        players={[player]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    clickSlot("SS");
    expect(screen.getByText("PINNED TO THIS SLOT: Test pin-one · $10,000")).toBeInTheDocument();

    cleanup();
    render(
      <RosterDesigner
        team={makeTeam("team-c", "Gamma", { rosterDesign: { slots: saved.slots } })}
        mode="pool-first"
        players={[player]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    clickSlot("SS");
    expect(screen.queryByText(/PINNED TO THIS SLOT/i)).toBeNull();
  });

  test("P8: editable design-first shortlist can pin candidates from the full player universe", async () => {
    const onSave = vi.fn(async () => undefined);
    const currentPoolReliever = makePlayer("pool-rp", {
      firstName: "Pool",
      lastName: "Reliever",
      primaryPosition: "RP",
      velocity: 60,
      junk: 60,
      accuracy: 60,
      salary: 15_000,
    });
    const universeCloser = makePlayer("universe-cp", {
      firstName: "Kay",
      lastName: "Frequin",
      primaryPosition: "CP",
      velocity: 92,
      junk: 94,
      accuracy: 91,
      salary: 12_000,
    });

    render(
      <RosterDesigner
        team={makeTeam("team-universe", "Universe")}
        mode="design-first"
        players={[currentPoolReliever]}
        allPlayers={[currentPoolReliever, universeCloser]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={onSave}
      />,
    );

    clickSlot("CP · CLOSER");
    expect(shortlistLines().some((line) => line.includes("Kay Frequin"))).toBe(true);

    const row = screen
      .getAllByText(/Kay Frequin ·/)
      .map((element) => element.closest("div"))
      .find((candidate): candidate is HTMLDivElement => Boolean(candidate && within(candidate).queryByRole("button", { name: "PIN" })));
    if (!row) throw new Error("No universe candidate pin row found");
    fireEvent.click(within(row).getByRole("button", { name: "PIN" }));

    expect(screen.getByText("PINNED TO THIS SLOT: Kay Frequin · $12,000")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await act(async () => undefined);

    const saved = onSave.mock.calls[0]?.[0];
    expect(saved.pins).toEqual({ CP: "universe-cp" });
  });

  test("P9: readOnly hides pin chips, orphan pins report, and moving a pin keeps one slot claim", async () => {
    render(
      <RosterDesigner
        team={makeTeam("team-readonly", "Read", {
          rosterDesign: {
            slots: seedRosterDesignSlots(),
            lockedAt: "2026-07-03T00:00:00.000Z",
          },
        })}
        mode="design-first"
        players={[makePlayer("shortstop", { primaryPosition: "SS" })]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    clickSlot("SS");
    expect(screen.queryByRole("button", { name: "PIN" })).toBeNull();
    expect(screen.queryByRole("button", { name: "PINNED ✓" })).toBeNull();

    cleanup();
    const ghostPlayer = makePlayer("ghost", { primaryPosition: "SS" });
    const otherPlayer = makePlayer("other", { primaryPosition: "2B" });
    const pinnedTeam = makeTeam("team-orphan", "Orphan", {
      rosterDesign: {
        slots: seedRosterDesignSlots(),
        pins: { SS: "ghost" },
      },
    });
    const { rerender } = render(
      <RosterDesigner
        team={pinnedTeam}
        mode="pool-first"
        players={[otherPlayer]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    clickSlot("SS");
    expect(screen.getByText("PINNED: ghost — LEFT THE POOL. RE-EXTRACT CAN BRING HIM BACK.")).toBeInTheDocument();
    expect(screen.queryByText(/CAN'T PIN/)).toBeNull();

    rerender(
      <RosterDesigner
        team={pinnedTeam}
        mode="pool-first"
        players={[ghostPlayer, otherPlayer]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.queryByText(/LEFT THE POOL/)).toBeNull();
    expect(screen.getByText("PINNED TO THIS SLOT: Test ghost · $10,000")).toBeInTheDocument();

    cleanup();
    const onSave = vi.fn(async () => undefined);
    const mover = makePlayer("mover", { primaryPosition: "SS", secondaryPosition: "2B" });
    render(
      <RosterDesigner
        team={makeTeam("team-move", "Move")}
        mode="pool-first"
        players={[mover]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={onSave}
      />,
    );

    const clickMoverPin = () => {
      const row = screen
        .getAllByText(/Test mover ·/)
        .map((element) => element.closest("div"))
        .find((candidate): candidate is HTMLDivElement => Boolean(candidate && within(candidate).queryByRole("button", { name: "PIN" })));
      if (!row) throw new Error("No mover pin row found");
      fireEvent.click(within(row).getByRole("button", { name: "PIN" }));
    };

    clickSlot("SS");
    clickMoverPin();
    expect(screen.getByText("PINNED TO THIS SLOT: Test mover · $10,000")).toBeInTheDocument();

    clickSlot("BENCH 1");
    clickMoverPin();
    expect(screen.getByText("PINNED TO THIS SLOT: Test mover · $10,000")).toBeInTheDocument();

    clickSlot("SS");
    expect(screen.queryByText("PINNED TO THIS SLOT: Test mover · $10,000")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await act(async () => undefined);

    const lastSave = onSave.mock.calls[onSave.mock.calls.length - 1]?.[0];
    expect(lastSave.pins).toEqual({ FLEX1: "mover" });
  });

  test("P10: in-pool pins dropped by the engine say can't pin here, not out of the pool", async () => {
    const inPoolButWrongSlot = makePlayer("wrong-slot", { primaryPosition: "SS" });
    render(
      <RosterDesigner
        team={makeTeam("team-dropped", "Dropped", {
          mlbArchetypeKey: "murderers-row",
          rosterDesign: {
            slots: seedRosterDesignSlots(),
            pins: { SP1: "wrong-slot" },
          },
        })}
        mode="pool-first"
        players={[inPoolButWrongSlot]}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await act(async () => undefined);

    clickSlot("SP1");
    expect(screen.getByText("PINNED: Test wrong-slot — CAN'T PIN TO THIS SLOT")).toBeInTheDocument();
    expect(screen.getByText("📌 Test wrong-slot — CAN'T PIN HERE")).toBeInTheDocument();
    expect(screen.queryByText(/OUT OF THE POOL/)).toBeNull();
    expect(screen.queryByText(/LEFT THE POOL/)).toBeNull();
  });
});

describe("RosterDesigner rank override reorder", () => {
  const ssCheap = makePlayer("ss-cheap", { primaryPosition: "SS", salary: 9_000 });
  const ssMid = makePlayer("ss-mid", { primaryPosition: "SS", salary: 10_000 });
  const ssExpensive = makePlayer("ss-expensive", { primaryPosition: "SS", salary: 11_000 });
  const players = [ssExpensive, ssMid, ssCheap];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test("R1: arrow reorder writes the displayed per-position order to rankOverrides", async () => {
    const onSave = vi.fn(async () => undefined);
    render(
      <RosterDesigner
        team={makeTeam("team-rank", "Rank")}
        mode="pool-first"
        players={players}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={onSave}
      />,
    );

    clickSlot("SS");
    expect(shortlistLines()[0]).toContain("Test ss-cheap");

    fireEvent.click(screen.getByRole("button", { name: "Move Test ss-mid up" }));
    expect(shortlistLines().slice(0, 3).map((line) => line.split(" · ")[0])).toEqual([
      "Test ss-mid",
      "Test ss-cheap",
      "Test ss-expensive",
    ]);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await act(async () => undefined);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].rankOverrides?.SS).toEqual(["ss-mid", "ss-cheap", "ss-expensive"]);
  });

  test("R2: preset rankOverrides render the shortlist in the GM order first", () => {
    render(
      <RosterDesigner
        team={makeTeam("team-preset", "Preset", {
          rosterDesign: {
            slots: seedRosterDesignSlots(),
            rankOverrides: { SS: ["ss-expensive", "ss-mid"] },
          },
        })}
        mode="pool-first"
        players={players}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    clickSlot("SS");
    expect(shortlistLines().slice(0, 3).map((line) => line.split(" · ")[0])).toEqual([
      "Test ss-expensive",
      "Test ss-mid",
      "Test ss-cheap",
    ]);
  });

  test("R3: slots without rankOverrides keep the default rankPoolForSlot order", () => {
    render(
      <RosterDesigner
        team={makeTeam("team-default", "Default", {
          rosterDesign: {
            slots: seedRosterDesignSlots(),
            rankOverrides: { RP: ["unused-reliever"] },
          },
        })}
        mode="pool-first"
        players={players}
        lockedPool={false}
        budget={500_000}
        tier="juiced"
        showHelp={false}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    clickSlot("SS");
    expect(shortlistLines().slice(0, 3).map((line) => line.split(" · ")[0])).toEqual([
      "Test ss-cheap",
      "Test ss-mid",
      "Test ss-expensive",
    ]);
  });
});
