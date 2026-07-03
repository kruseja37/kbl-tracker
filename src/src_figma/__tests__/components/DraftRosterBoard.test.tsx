import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  DraftRosterBoard,
  FARM_BOARD_TARGET,
  type DraftBoardEntry,
} from "../../app/components/DraftRosterBoard";

describe("DraftRosterBoard", () => {
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
        tier="farm"
        entries={[]}
        target={FARM_BOARD_TARGET}
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
