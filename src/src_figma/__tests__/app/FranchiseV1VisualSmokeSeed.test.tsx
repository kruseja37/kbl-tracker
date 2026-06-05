import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

const {
  mockArchiveCompletedGame,
  mockGetAllGamesByFranchise,
  mockGetAllFranchisePlayers,
  mockListFranchiseMoraleSnapshots,
  mockSaveCurrentGame,
} = vi.hoisted(() => ({
  mockArchiveCompletedGame: vi.fn(),
  mockGetAllGamesByFranchise: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockListFranchiseMoraleSnapshots: vi.fn(),
  mockSaveCurrentGame: vi.fn(),
}));

vi.mock("../../../utils/gameStorage", () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  saveCurrentGame: mockSaveCurrentGame,
}));

vi.mock("../../../utils/scheduleStorage", () => ({
  getAllGamesByFranchise: mockGetAllGamesByFranchise,
}));

vi.mock("../../../utils/franchisePlayerStorage", () => ({
  getAllFranchisePlayers: mockGetAllFranchisePlayers,
}));

vi.mock("../../../utils/franchiseMoraleState", () => ({
  listFranchiseMoraleSnapshots: mockListFranchiseMoraleSnapshots,
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
    expect(screen.getByText("Populated schedule row visual smoke")).toBeInTheDocument();
    expect(screen.getByText("Populated Team Hub roster rows")).toBeInTheDocument();
    expect(screen.getByText("Denver Longnames")).toBeInTheDocument();
    expect(screen.getByText("Boulder Baselines")).toBeInTheDocument();
    expect(screen.getByText("Catalina Fullname-Rivera")).toBeInTheDocument();
    expect(screen.getByTestId("visual-roster-row-farm-hidden")).toHaveTextContent("FARM / hidden");
    expect(screen.getByTestId("visual-roster-row-farm-hidden")).toHaveTextContent("HIDDEN SAFE");
    expect(screen.getByTestId("visual-roster-row-farm-hidden")).toHaveTextContent("Ratings truth blocked");
    expect(screen.getByTestId("visual-roster-row-farm-hidden")).not.toHaveTextContent("true grade");
    expect(screen.getByTestId("visual-roster-row-farm-hidden")).not.toHaveTextContent("hidden scout truth");
    expect(screen.getByText("GameTracker name-wrap preview")).toBeInTheDocument();
    expect(screen.getByText("Game Detail evidence preview")).toBeInTheDocument();
    expect(screen.queryByText("SEEDING")).not.toBeInTheDocument();
    expect(screen.queryByText("READY")).not.toBeInTheDocument();
    expect(mockSaveCurrentGame).not.toHaveBeenCalled();
    expect(mockArchiveCompletedGame).not.toHaveBeenCalled();
    expect(mockGetAllGamesByFranchise).not.toHaveBeenCalled();
    expect(mockGetAllFranchisePlayers).not.toHaveBeenCalled();
    expect(mockListFranchiseMoraleSnapshots).not.toHaveBeenCalled();
  });
});
