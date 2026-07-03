import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ArchetypePicker } from "../../app/components/draft/ArchetypePicker";
import { TEAM_ARCHETYPES } from "../../app/data/teamArchetypeCatalog";

describe("ArchetypePicker draftability", () => {
  afterEach(() => {
    cleanup();
  });

  test("B1 blocks a LOCKED card for the MLB slot but keeps it pickable for the farm slot", () => {
    const onPick = vi.fn();
    const locked = TEAM_ARCHETYPES[0];

    render(
      <ArchetypePicker
        onPick={onPick}
        draftability={{
          [locked.key]: { band: "LOCKED", reason: "the pool cannot field a legal roster for this identity" },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: new RegExp(locked.name) }));
    expect(onPick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /FARM IDENTITY/i }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(locked.name) }));

    expect(onPick).toHaveBeenCalledWith("farm", locked.key);
  });

  test("B2 renders GREEN silently and shows the first YELLOW/LOCKED reason", () => {
    const [green, yellow, locked] = TEAM_ARCHETYPES;

    render(
      <ArchetypePicker
        onPick={vi.fn()}
        draftability={{
          [green.key]: { band: "GREEN", reason: "green should stay silent" },
          [yellow.key]: { band: "YELLOW", reason: "fragile once its top targets are gone" },
          [locked.key]: { band: "LOCKED", reason: "the pool cannot field a legal roster for this identity" },
        }}
      />,
    );

    expect(screen.queryByText("▲ green should stay silent")).not.toBeInTheDocument();
    expect(screen.getByText("▲ fragile once its top targets are gone")).toBeInTheDocument();
    expect(screen.getByText("✕ the pool cannot field a legal roster for this identity")).toBeInTheDocument();
  });

  test("B3 keeps catalog grid order regardless of draftability bands", () => {
    const draftability = Object.fromEntries(
      TEAM_ARCHETYPES.map((archetype, index) => [
        archetype.key,
        {
          band: index % 3 === 0 ? "LOCKED" : index % 3 === 1 ? "YELLOW" : "GREEN",
          reason: `reason ${index}`,
        },
      ]),
    ) as Record<string, { band: "GREEN" | "YELLOW" | "LOCKED"; reason: string }>;

    const { container } = render(<ArchetypePicker onPick={vi.fn()} draftability={draftability} />);
    const cardButtons = [...container.querySelectorAll("button")].slice(2);

    expect(cardButtons).toHaveLength(TEAM_ARCHETYPES.length);
    TEAM_ARCHETYPES.forEach((archetype, index) => {
      expect(cardButtons[index]).toHaveTextContent(archetype.name);
    });
  });

  test("B4 absent draftability prop preserves the default DOM snapshot", () => {
    const { container } = render(<ArchetypePicker onPick={vi.fn()} />);

    expect(screen.queryByText("Draftability reads appear once your player list is in.")).not.toBeInTheDocument();
    expect(container.firstChild).toMatchSnapshot();
  });

  test("shows one quiet pending line when draftability is present but empty", () => {
    render(<ArchetypePicker onPick={vi.fn()} draftability={{}} />);

    expect(screen.getByText("Draftability reads appear once your player list is in.")).toBeInTheDocument();
  });
});
