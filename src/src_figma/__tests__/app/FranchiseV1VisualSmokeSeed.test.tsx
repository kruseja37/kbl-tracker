import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

const {
  mockArchiveCompletedGame,
  mockSaveCurrentGame,
} = vi.hoisted(() => ({
  mockArchiveCompletedGame: vi.fn(),
  mockSaveCurrentGame: vi.fn(),
}));

vi.mock("../../../utils/gameStorage", () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  saveCurrentGame: mockSaveCurrentGame,
}));

import { FranchiseV1VisualSmokeSeed } from "../../app/pages/FranchiseV1VisualSmokeSeed";

describe("FranchiseV1VisualSmokeSeed", () => {
  test("renders read-only preview data without writing to live storage", () => {
    render(
      <MemoryRouter>
        <FranchiseV1VisualSmokeSeed />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mode 1/2 Visual Smoke Preview")).toBeInTheDocument();
    expect(screen.getByText("READ ONLY / NO STORAGE WRITES")).toBeInTheDocument();
    expect(screen.getByText("GameTracker name-wrap preview")).toBeInTheDocument();
    expect(screen.getByText("Game Detail evidence preview")).toBeInTheDocument();
    expect(
      screen.getByText(/Populated Team Hub roster-row screenshots still require an external seeded fixture/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("SEEDING")).not.toBeInTheDocument();
    expect(screen.queryByText("READY")).not.toBeInTheDocument();
    expect(mockSaveCurrentGame).not.toHaveBeenCalled();
    expect(mockArchiveCompletedGame).not.toHaveBeenCalled();
  });
});
