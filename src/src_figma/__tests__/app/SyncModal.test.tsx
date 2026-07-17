import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { SyncModal, SyncStatusIcon } from "../../app/components/SyncModal";

const mocks = vi.hoisted(() => ({
  getDiagnostics: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  replaceCloudWithLocal: vi.fn(),
  replaceLocalWithCloud: vi.fn(),
  pull: vi.fn(),
  init: vi.fn(),
  flush: vi.fn(),
  auth: {
    user: { email: "scorekeeper@example.com" } as { email: string } | null,
    isAuthenticated: true,
    error: null as string | null,
  },
  syncStatus: {
    state: "idle",
    lastPullAt: 0,
    pendingCount: 0,
    error: null,
    pull: vi.fn(),
    replaceCloudWithLocal: vi.fn(),
    replaceLocalWithCloud: vi.fn(),
  },
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: mocks.auth.user,
    isAuthenticated: mocks.auth.isAuthenticated,
    isLoading: false,
    error: mocks.auth.error,
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
    init: mocks.init,
    flush: mocks.flush,
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
    vi.useRealTimers();
    mocks.getDiagnostics.mockReset();
    mocks.signIn.mockReset();
    mocks.init.mockReset();
    mocks.flush.mockReset();
    mocks.pull.mockReset();
    mocks.init.mockResolvedValue(undefined);
    mocks.flush.mockResolvedValue(undefined);
    mocks.pull.mockResolvedValue(undefined);
    mocks.auth.user = { email: "scorekeeper@example.com" };
    mocks.auth.isAuthenticated = true;
    mocks.auth.error = null;
    mocks.syncStatus.state = "idle";
    mocks.syncStatus.pendingCount = 0;
    mocks.syncStatus.error = null;
    mocks.syncStatus.lastPullAt = 0;
    mocks.syncStatus.pull = mocks.pull;
    mocks.syncStatus.replaceCloudWithLocal = mocks.replaceCloudWithLocal;
    mocks.syncStatus.replaceLocalWithCloud = mocks.replaceLocalWithCloud;
  });

  afterEach(() => {
    vi.useRealTimers();
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

    expect(screen.getByText("SYNC ISSUES")).toBeInTheDocument();
    expect(screen.queryByText("SYNCED")).not.toBeInTheDocument();
    expect(screen.getByText("(1 pending)")).toBeInTheDocument();
    expect(mocks.init).toHaveBeenCalled();
    expect(mocks.getDiagnostics).not.toHaveBeenCalled();
  });

  test("runs a non-destructive sync-now pass for pending writes", async () => {
    mocks.syncStatus.pendingCount = 1;
    mocks.getDiagnostics.mockResolvedValue(matchedDiagnostics());

    render(<SyncModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /SYNC NOW/i }));

    await waitFor(() => {
      expect(mocks.init).toHaveBeenCalled();
      expect(mocks.flush).toHaveBeenCalled();
      expect(mocks.pull).toHaveBeenCalled();
    });
  });

  test("confirmed upload replaces the existing cloud snapshot", async () => {
    mocks.replaceCloudWithLocal.mockResolvedValue(undefined);
    mocks.getDiagnostics.mockResolvedValue(matchedDiagnostics());

    render(<SyncModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /UPLOAD TO CLOUD/i }));
    fireEvent.click(screen.getByRole("button", { name: "CONFIRM" }));

    await waitFor(() => {
      expect(mocks.replaceCloudWithLocal).toHaveBeenCalledWith(
        expect.any(Function),
        { replaceExisting: true },
      );
    });
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

  test("surfaces a timeout instead of spinning forever when diagnostics stall", async () => {
    vi.useFakeTimers();
    mocks.getDiagnostics.mockReturnValue(new Promise(() => undefined));

    render(<SyncModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("CHECKING SYNC DATA")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(screen.getByText("SYNC ISSUES")).toBeInTheDocument();
    expect(screen.queryByText("CHECKING SYNC DATA")).not.toBeInTheDocument();
    expect(screen.getByText(/Sync diagnostics timed out/i)).toBeInTheDocument();
  });

  test("header sync icon is yellow while writes are pending", () => {
    mocks.syncStatus.pendingCount = 1;

    const { container } = render(<SyncStatusIcon onClick={vi.fn()} />);
    const icon = container.querySelector("svg");

    expect(icon).toHaveStyle({ color: "#FFFF44" });
  });

  test("keeps the extracted login form behavior on the cloud sync modal", async () => {
    mocks.auth.user = null;
    mocks.auth.isAuthenticated = false;
    mocks.signIn.mockResolvedValue(undefined);

    render(<SyncModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Sign in to sync data across devices.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "scorekeeper@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "SIGN IN" }));

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith("scorekeeper@example.com", "secret"));
  });

  test("shows the existing account-service copy when home sign in rejects at the network boundary", async () => {
    mocks.auth.user = null;
    mocks.auth.isAuthenticated = false;
    mocks.signIn.mockRejectedValue(new TypeError("Load failed"));

    render(<SyncModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "scorekeeper@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "SIGN IN" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AUTH SERVICE UNREACHABLE — CHECK PROJECT CONNECTION.",
    );
    expect(screen.getByRole("button", { name: "SIGN IN" })).toBeEnabled();
  });

  test("ends a stalled home sign in with a retryable timeout", async () => {
    vi.useFakeTimers();
    mocks.auth.user = null;
    mocks.auth.isAuthenticated = false;
    mocks.signIn.mockReturnValue(new Promise(() => undefined));

    render(<SyncModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "scorekeeper@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "SIGN IN" }));
    expect(screen.getByRole("button", { name: "SIGNING IN..." })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(screen.getByRole("alert")).toHaveTextContent("SIGN IN TIMED OUT — TRY AGAIN.");
    expect(screen.getByRole("button", { name: "SIGN IN" })).toBeEnabled();
  });
});
