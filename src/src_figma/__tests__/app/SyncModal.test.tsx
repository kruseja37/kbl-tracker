import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SyncModal, SyncStatusIcon } from "../../app/components/SyncModal";

const mocks = vi.hoisted(() => ({
  getDiagnostics: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  replaceCloudWithLocal: vi.fn(),
  replaceLocalWithCloud: vi.fn(),
  syncStatus: {
    state: "idle",
    lastPullAt: 0,
    pendingCount: 0,
    error: null,
    replaceCloudWithLocal: vi.fn(),
    replaceLocalWithCloud: vi.fn(),
  },
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "scorekeeper@example.com" },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    signIn: mocks.signIn,
    signOut: mocks.signOut,
  }),
}));

vi.mock("../../../hooks/useSyncStatus", () => ({
  useSyncStatus: () => mocks.syncStatus,
}));

vi.mock("../../../utils/syncEngine", () => ({
  syncEngine: {
    getDiagnostics: mocks.getDiagnostics,
    init: vi.fn(),
  },
}));

function matchedDiagnostics() {
  return {
    deviceId: "device-1",
    generatedAt: Date.now(),
    build: { mode: "test" },
    lastPullAt: 0,
    pendingCount: 0,
    stores: [
      {
        dbName: "kbl-tracker",
        storeName: "completedGames",
        localCount: 1,
        cloudCount: 1,
        status: "matched",
      },
    ],
    localStorage: {
      localCount: 0,
      cloudCount: 0,
      status: "matched",
    },
    warnings: [],
  };
}

describe("SyncModal diagnostics status", () => {
  beforeEach(() => {
    mocks.getDiagnostics.mockReset();
    mocks.syncStatus.state = "idle";
    mocks.syncStatus.pendingCount = 0;
    mocks.syncStatus.error = null;
    mocks.syncStatus.lastPullAt = 0;
    mocks.syncStatus.replaceCloudWithLocal = mocks.replaceCloudWithLocal;
    mocks.syncStatus.replaceLocalWithCloud = mocks.replaceLocalWithCloud;
  });

  test("does not show SYNCED when diagnostics contain a mismatched store without warnings", async () => {
    mocks.getDiagnostics.mockResolvedValue({
      ...matchedDiagnostics(),
      stores: [
        {
          dbName: "kbl-tracker",
          storeName: "completedGames",
          localCount: 1,
          cloudCount: 1,
          status: "mismatch",
        },
      ],
    });

    render(<SyncModal isOpen onClose={vi.fn()} />);

    expect(await screen.findByText("SYNC ISSUES")).toBeInTheDocument();
    expect(screen.queryByText("SYNCED")).not.toBeInTheDocument();
    expect(screen.getByText("kbl-tracker.completedGames")).toBeInTheDocument();
    expect(screen.getByText("mismatch")).toBeInTheDocument();
  });

  test("does not show SYNCED when live sync status has pending writes", async () => {
    mocks.syncStatus.pendingCount = 1;
    mocks.getDiagnostics.mockResolvedValue(matchedDiagnostics());

    render(<SyncModal isOpen onClose={vi.fn()} />);

    expect(await screen.findByText("SYNC ISSUES")).toBeInTheDocument();
    expect(screen.queryByText("SYNCED")).not.toBeInTheDocument();
    expect(screen.getByText("(1 pending)")).toBeInTheDocument();
  });

  test("does not keep a green headline when a diagnostic refresh fails after a clean snapshot", async () => {
    mocks.getDiagnostics
      .mockResolvedValueOnce(matchedDiagnostics())
      .mockRejectedValueOnce(new Error("Diagnostics failed intentionally"));

    render(<SyncModal isOpen onClose={vi.fn()} />);

    expect(await screen.findByText("SYNCED")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /CHECK SYNC DATA/i }));

    expect(await screen.findByText("SYNC ISSUES")).toBeInTheDocument();
    expect(screen.queryByText("SYNCED")).not.toBeInTheDocument();
    expect(screen.getByText("Diagnostics failed intentionally")).toBeInTheDocument();
  });

  test("does not show SYNCED when the running PWA build is stale", async () => {
    mocks.getDiagnostics.mockResolvedValue({
      ...matchedDiagnostics(),
      build: {
        id: "old-build",
        mode: "production",
        sha: "old-sha",
        latest: {
          id: "new-build",
          sha: "new-sha",
          fetchedAt: Date.now(),
          matchesCurrent: false,
        },
      },
    });

    render(<SyncModal isOpen onClose={vi.fn()} />);

    expect(await screen.findByText("SYNC ISSUES")).toBeInTheDocument();
    expect(screen.queryByText("SYNCED")).not.toBeInTheDocument();
    expect(screen.getByText("Freshness: stale")).toBeInTheDocument();
  });

  test("header sync icon is yellow while writes are pending", () => {
    mocks.syncStatus.pendingCount = 1;

    const { container } = render(<SyncStatusIcon onClick={vi.fn()} />);
    const icon = container.querySelector("svg");

    expect(icon).toHaveStyle({ color: "#FFFF44" });
  });
});
