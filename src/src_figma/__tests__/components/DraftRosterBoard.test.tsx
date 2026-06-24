import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  DraftRosterBoard,
  FARM_BOARD_TARGET,
  MLB_BOARD_TARGET,
  type DraftBoardEntry,
} from "../../app/components/DraftRosterBoard";

describe("DraftRosterBoard", () => {
  test("renders MLB filled slots, highlighted required gaps, and header totals", () => {
    const entries: DraftBoardEntry[] = [
      {
        id: "catcher-1",
        name: "Casey Catcher",
        primaryPosition: "C",
        salary: 50_000,
      },
      {
        id: "starter-1",
        name: "Sam Starter",
        primaryPosition: "SP",
        salary: 70_000,
      },
    ];

    render(
      <DraftRosterBoard
        tier="mlb"
        entries={entries}
        target={MLB_BOARD_TARGET}
        payroll={120_000}
        walletRemaining={880_000}
      />,
    );

    expect(screen.getByText("2/22 slots")).toBeInTheDocument();
    expect(screen.getByText("$120,000")).toBeInTheDocument();
    expect(screen.getByText("$880,000")).toBeInTheDocument();
    expect(screen.queryByText("PRIORITY GAPS")).not.toBeInTheDocument();
    expect(screen.queryByTestId("draft-roster-budget-warning")).not.toBeInTheDocument();

    const catcherSlot = screen.getByTestId("draft-roster-slot-C");
    expect(within(catcherSlot).getByText("Casey Catcher")).toBeInTheDocument();
    expect(within(catcherSlot).getAllByText("C").length).toBeGreaterThan(0);

    const shortstopSlot = screen.getByTestId("draft-roster-slot-SS");
    expect(within(shortstopSlot).getByText("OPEN")).toBeInTheDocument();
    expect(within(shortstopSlot).getByText("SS GAP")).toBeInTheDocument();

    const outfieldSlot = screen.getByTestId("draft-roster-slot-LF");
    expect(within(outfieldSlot).getByText("OPEN")).toBeInTheDocument();
    expect(within(outfieldSlot).getByText("OF GAP")).toBeInTheDocument();
  });

  test("renders farm entries by primary position with generic open slots only", () => {
    const entries: DraftBoardEntry[] = [
      {
        id: "farm-cf",
        name: "Flynn Center",
        primaryPosition: "CF",
        secondaryPosition: "LF",
        salary: 8_000,
      },
      {
        id: "farm-sp",
        name: "Parker Prospect",
        primaryPosition: "SP",
        salary: 10_000,
      },
    ];

    render(
      <DraftRosterBoard
        tier="farm"
        entries={entries}
        target={FARM_BOARD_TARGET}
        payroll={18_000}
        walletRemaining={982_000}
      />,
    );

    expect(screen.getByText("2/10 slots")).toBeInTheDocument();
    expect(screen.getByText("Flynn Center")).toBeInTheDocument();
    expect(screen.getByText("Parker Prospect")).toBeInTheDocument();

    const firstOpenSlot = screen.getByTestId("draft-roster-slot-FARM-1");
    expect(within(firstOpenSlot).getByText("OPEN")).toBeInTheDocument();
    expect(within(firstOpenSlot).getByText("FARM 1 GAP")).toBeInTheDocument();
    expect(screen.getAllByText("OPEN")).toHaveLength(8);
    expect(screen.queryByText(/\b(POW|CON|SPD|FLD|ARM|VEL|JNK|ACC)\b/)).not.toBeInTheDocument();
  });

  test("renders priority gap chips and budget warning when provided", () => {
    render(
      <DraftRosterBoard
        tier="mlb"
        entries={[]}
        target={MLB_BOARD_TARGET}
        payroll={0}
        walletRemaining={20_000}
        priorityGaps={[
          { id: "rotation-gap", severity: "critical", label: "Rotation needs starters" },
          { id: "lineup-gap", severity: "warning", label: "Lineup lacks contact" },
        ]}
        budgetWarning="Filling your remaining slots would exceed your budget"
      />,
    );

    expect(screen.getByText("PRIORITY GAPS")).toBeInTheDocument();
    expect(screen.getByTestId("draft-roster-priority-gap-rotation-gap")).toHaveTextContent(
      "CRITICAL · Rotation needs starters",
    );
    expect(screen.getByTestId("draft-roster-priority-gap-lineup-gap")).toHaveTextContent(
      "WARNING · Lineup lacks contact",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Filling your remaining slots would exceed your budget",
    );
  });
});
