import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  CheckpointTakeover,
  FranchiseLensHub,
  type ActiveTeamVM,
  type CheckpointVM,
  type FranchiseLensActions,
  type HubVM,
} from "../../app/components/franchise/FranchiseLensHub";

const active: ActiveTeamVM = {
  id: "home",
  name: "Home Club",
  abbr: "HOM",
  recordLabel: "1-1",
  primary: "#2A4A2F",
  secondary: "#C4A853",
};

function checkpoint(): CheckpointVM {
  return {
    number: 2,
    label: "Checkpoint 2 of 5 — game 24",
    players: [],
    groups: [
      {
        boundaryGameNumber: 24,
        ordinal: 2,
        ordinalCount: 5,
        label: "Checkpoint 2 of 5 — game 24",
        players: [{
          id: "p1",
          name: "Piper Truth",
          position: "CF",
          proposals: [
            {
              id: "rating-1",
              kind: "rating",
              observedPriorValue: 50,
              ratingChange: { label: "Power", from: 50, to: 55 },
            },
            {
              id: "trait-1",
              kind: "trait",
              observedPriorValue: { trait1: null, trait2: null },
              traitChange: {
                valence: "gain",
                trait: "Clutch",
                from: { trait1: null, trait2: null },
                to: { trait1: "Clutch", trait2: null },
              },
            },
          ],
        }],
      },
      {
        boundaryGameNumber: 18,
        ordinal: 0,
        ordinalCount: 5,
        label: "Game 18",
        stalePlan: true,
        players: [{
          id: "p2",
          name: "Legacy Row",
          position: "SP",
          proposals: [{
            id: "retry-1",
            kind: "rating",
            retry: true,
            observedPriorValue: 40,
            ratingChange: { label: "Velocity", from: 40, to: 43 },
          }],
        }],
      },
    ],
  };
}

describe("Franchise Lens console-mirror truth", () => {
  test("renders the true ordinal header, keeps kinds together, and tags stale-plan rows last", () => {
    render(<CheckpointTakeover cp={checkpoint()} onClose={vi.fn()} onResolve={vi.fn()} />);

    const groups = screen.getAllByTestId("checkpoint-group");
    expect(within(groups[0]).getByText("Checkpoint 2 of 5 — game 24")).toBeTruthy();
    expect(within(groups[0]).getByText("Power")).toBeTruthy();
    expect(within(groups[0]).getAllByText("Clutch").length).toBeGreaterThan(0);
    expect(within(groups[1]).getByText(/from an earlier schedule/i)).toBeTruthy();
    expect(within(screen.getByTestId("proposal-retry-1")).getByRole("button", { name: /Retry apply/i })).toBeTruthy();
    expect(within(screen.getByTestId("proposal-retry-1")).queryByRole("button", { name: /Entered in SMB4 as proposed/i })).toBeNull();
  });

  test("sends the adjusted actual value and requires a rejection reason", async () => {
    const onResolve = vi.fn(async () => ({ outcome: "resolved" as const, currentValue: 54 }));
    render(<CheckpointTakeover cp={checkpoint()} onClose={vi.fn()} onResolve={onResolve} />);
    const row = screen.getByTestId("proposal-rating-1");
    const reject = within(row).getByRole("button", { name: /Reject proposal/i });
    expect(reject).toBeDisabled();
    fireEvent.change(within(row).getByLabelText("Reject reason for rating-1"), { target: { value: "Console refused it" } });
    expect(reject).toBeEnabled();
    fireEvent.change(within(row).getByLabelText("Power actual value"), { target: { value: "54" } });
    fireEvent.click(within(row).getByRole("button", { name: /Adjust to actual/i }));

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(expect.objectContaining({
      proposalId: "rating-1",
      action: "confirm-adjusted",
      observedPriorValue: 50,
      actualValue: 54,
    })));
  });

  test("shows a conflict with the refreshed current value and never offers retry", async () => {
    const onResolve = vi.fn(async () => ({ outcome: "conflict" as const, currentValue: 61 }));
    render(<CheckpointTakeover cp={checkpoint()} onClose={vi.fn()} onResolve={onResolve} />);
    const row = screen.getByTestId("proposal-rating-1");
    fireEvent.click(within(row).getByRole("button", { name: /Entered in SMB4 as proposed/i }));

    expect(await within(row).findByText(/changed underneath — showing current value/i)).toBeTruthy();
    expect(within(row).getByText("61")).toBeTruthy();
    expect(within(row).queryByRole("button", { name: /Retry apply/i })).toBeNull();
  });

  test("mark all confirms sequentially and stops before untouched remainder on conflict", async () => {
    const calls: string[] = [];
    const onResolve = vi.fn(async (request: { proposalId: string }) => {
      calls.push(request.proposalId);
      return request.proposalId === "trait-1"
        ? { outcome: "conflict" as const, currentValue: { trait1: "Clutch", trait2: "RBI Hero" } }
        : { outcome: "resolved" as const };
    });
    render(<CheckpointTakeover cp={checkpoint()} onClose={vi.fn()} onResolve={onResolve} />);
    fireEvent.click(screen.getByRole("button", { name: /Mark all entered/i }));

    await waitFor(() => expect(calls).toEqual(["rating-1", "trait-1"]));
    expect(calls).not.toContain("retry-1");
  });
});

function actions(overrides: Partial<FranchiseLensActions> = {}): FranchiseLensActions {
  return {
    onCallUp: vi.fn(async () => ({ success: true })),
    onSendDown: vi.fn(async () => ({ success: true })),
    onExecuteTrade: vi.fn(async () => ({ success: true })),
    onSetFitness: vi.fn(async () => ({ success: true })),
    ...overrides,
  };
}

describe("Franchise Lens drawer and card truth", () => {
  test("labels a pending trait proposed, keeps history collapsed, and renders rejection evidence", () => {
    const hub: HubVM = {
      pulse: {},
      home: { impactCards: [] },
      roster: [{
        id: "p1",
        name: "Piper Truth",
        position: "CF",
        morale: { value: 50, state: "CONTENT", trend: "flat", history: [] },
        detail: {
          fitnessState: "FIT",
          traitTimeline: [{ valence: "gain", trait: "Clutch", atGame: 24, status: "proposed" }],
          developmentHistory: [{
            id: "history-1",
            kind: "rating",
            change: "Power",
            proposed: "50 → 55",
            status: "rejected",
            resolvedCivilDate: "2026-07-11",
            resolvedBy: "Franchise Lens",
            rejectReason: "SMB4 would not accept 55.",
          }],
        },
      }],
    };
    render(<FranchiseLensHub teams={[{ id: "home", name: "Home Club", abbr: "HOM", primary: "#2A4A2F" }]} active={active} hub={hub} onSelectTeam={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Roster" }));
    fireEvent.click(screen.getByRole("button", { name: "Piper Truth" }));

    expect(screen.getByText(/Proposed/)).toBeTruthy();
    expect(screen.queryByText(/Earned/)).toBeNull();
    const log = screen.getByTestId("development-log");
    expect(log).not.toHaveAttribute("open");
    fireEvent.click(within(log).getByText(/Development log/));
    expect(within(log).getByText(/Reason: SMB4 would not accept 55/i)).toBeTruthy();
  });

  test("reverts a failed fitness pick and surfaces the persistence error", async () => {
    const hub: HubVM = {
      pulse: {},
      home: { impactCards: [] },
      roster: [{ id: "p1", name: "Piper Truth", position: "CF", detail: { fitnessState: "FIT" } }],
    };
    render(
      <FranchiseLensHub
        teams={[{ id: "home", name: "Home Club", abbr: "HOM", primary: "#2A4A2F" }]}
        active={active}
        hub={hub}
        onSelectTeam={vi.fn()}
        actions={actions({ onSetFitness: vi.fn(async () => ({ success: false, message: "Fitness write failed" })) })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Roster" }));
    fireEvent.click(screen.getByRole("button", { name: "Piper Truth" }));
    fireEvent.click(screen.getByRole("button", { name: "Set fitness" }));
    fireEvent.click(screen.getByRole("option", { name: /Hurt/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Fitness write failed");
    expect(screen.getByRole("button", { name: "Set fitness" })).toHaveTextContent("Fit");
  });

  test("highlights the active club on the away side of Tonight", () => {
    const hub: HubVM = {
      pulse: {},
      roster: [],
      home: {
        impactCards: [],
        nextGame: {
          activeTeamId: "home",
          awayTeamId: "home",
          homeTeamId: "away",
          awayName: "Home Club",
          awayAbbr: "HOM",
          awayRecord: "1-1",
          homeName: "Away Club",
          homeAbbr: "AWY",
          homeRecord: "0-2",
        },
      },
    };
    const { container } = render(<FranchiseLensHub teams={[{ id: "home", name: "Home Club", abbr: "HOM", primary: "#2A4A2F" }]} active={active} hub={hub} onSelectTeam={vi.fn()} />);
    expect(container.querySelector(".fen-mt.you")?.textContent).toContain("Home Club");
  });
});
