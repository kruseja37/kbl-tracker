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
          teamName: "Boulder Baselines",
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
          teamName: "Denver Longnames",
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
  test("renders the identity eyebrow and compact team → player rows in natural order", () => {
    render(<CheckpointTakeover cp={checkpoint()} onClose={vi.fn()} onResolve={vi.fn()} />);

    const groups = screen.getAllByTestId("checkpoint-group");
    // D11 copy-test justification: the approved cockpit identity replaces the former dramatic modal banner.
    expect(screen.getByText("CHECKPOINT 2 OF 5 — GAME 24")).toBeTruthy();
    expect(screen.getByText(/Record what SMB4 actually accepted/i)).not.toBeVisible();
    expect(screen.getByText("0 of 3 entered")).toBeTruthy();
    expect(within(groups[0]).getByText("Boulder Baselines")).toBeTruthy();
    expect(within(groups[0]).getByText(/Power 50 → 55 \(\+5\)/)).toBeTruthy();
    expect(within(groups[0]).getByText(/no traits → Clutch/)).toBeTruthy();
    expect(within(groups[1]).getByText(/Earlier schedule/)).toBeTruthy();
    expect(within(screen.getByTestId("proposal-retry-1")).getByRole("button", { name: /Retry apply/i })).toBeTruthy();
    expect(within(screen.getByTestId("proposal-retry-1")).queryByRole("button", { name: /Mark .* entered/i })).toBeNull();
  });

  test("keeps takeover text to worklist identity, state, values, and actions", () => {
    const { container } = render(<CheckpointTakeover cp={checkpoint()} onClose={vi.fn()} onResolve={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    const visibleLeafText = Array.from(dialog.querySelectorAll<HTMLElement>("*"))
      .filter((element) => element.children.length === 0 && window.getComputedStyle(element).display !== "none")
      .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter(Boolean);
    const allowedVisibleText = [
      /^CHECKPOINT 2 OF 5 — GAME 24$/,
      /^0 of 3 entered$/,
      /^(Boulder Baselines|Denver Longnames)$/,
      /^(Piper Truth|Legacy Row|CF|SP)$/,
      /^(↕|✦)$/,
      /^(Power 50 → 55 \(\+5\)|no traits → Clutch|Velocity 40 → 43 \(\+3\))$/,
      /^(Earlier schedule|3 remaining)$/,
      /^(\u00d7|\u2713 Entered|Adjust|Reject|↻ Retry apply|Mark all entered|Close for now)$/,
    ];
    const outsideAllowlist = visibleLeafText.filter((text) => !allowedVisibleText.some((pattern) => pattern.test(text)));

    // Amendment 1 allowlist: eyebrow/counts identify the checkpoint; team/player names,
    // proposal-type glyphs, and summaries identify the work; state/action labels operate it.
    // Any explanatory sentence added inline becomes an unexpected visible leaf and trips here.
    expect(outsideAllowlist).toEqual([]);
    expect(container.querySelector(".fen-help-b")?.textContent).toBe(
      "Record what SMB4 actually accepted. Every proposal gets its own durable receipt.",
    );
  });

  test("mounts adjustment controls only on expansion and sends both rating and trait resolution kinds", async () => {
    const onResolve = vi.fn(async () => ({ outcome: "resolved" as const, currentValue: 54 }));
    const { container } = render(<CheckpointTakeover cp={checkpoint()} onClose={vi.fn()} onResolve={onResolve} />);
    expect(container.querySelectorAll("select")).toHaveLength(0);
    const ratingRow = screen.getByTestId("proposal-rating-1");
    fireEvent.click(within(ratingRow).getByRole("button", { name: "Adjust" }));
    fireEvent.change(within(ratingRow).getByLabelText("Power actual value"), { target: { value: "54" } });
    fireEvent.click(within(ratingRow).getByRole("button", { name: /Save adjustment/i }));

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(expect.objectContaining({
      proposalId: "rating-1",
      action: "confirm-adjusted",
      observedPriorValue: 50,
      actualValue: 54,
    })));

    const traitRow = screen.getByTestId("proposal-trait-1");
    fireEvent.click(within(traitRow).getByRole("button", { name: "Adjust" }));
    expect(container.querySelectorAll("select")).toHaveLength(2);
    fireEvent.change(within(traitRow).getAllByRole("combobox")[0], { target: { value: "Clutch" } });
    fireEvent.click(within(traitRow).getByRole("button", { name: /Save adjustment/i }));

    await waitFor(() => expect(onResolve).toHaveBeenLastCalledWith(expect.objectContaining({
      proposalId: "trait-1",
      kind: "trait",
      action: "confirm-adjusted",
      actualValue: { trait1: "Clutch", trait2: null },
    })));
  });

  test("requires a rejection reason only after the reject row is opened", () => {
    render(<CheckpointTakeover cp={checkpoint()} onClose={vi.fn()} onResolve={vi.fn()} />);
    const row = screen.getByTestId("proposal-rating-1");
    fireEvent.click(within(row).getByRole("button", { name: "Reject" }));
    const reject = within(row).getByRole("button", { name: /Reject proposal/i });
    expect(reject).toBeDisabled();
    fireEvent.change(within(row).getByLabelText("Reject reason for rating-1"), { target: { value: "Console refused it" } });
    expect(reject).toBeEnabled();
  });

  test("shows a conflict with the refreshed current value and never offers retry", async () => {
    const onResolve = vi.fn(async () => ({ outcome: "conflict" as const, currentValue: 61 }));
    render(<CheckpointTakeover cp={checkpoint()} onClose={vi.fn()} onResolve={onResolve} />);
    const row = screen.getByTestId("proposal-rating-1");
    // D11 copy-test justification: the approved compact primary action is “✓ ENTERED”.
    fireEvent.click(within(row).getByRole("button", { name: /Mark Piper Truth.*entered/i }));

    expect(await within(row).findByText(/changed underneath — showing current value/i)).toBeTruthy();
    expect(within(row).getByText(/Power 61 → 55/)).toBeTruthy();
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

  test("keeps a 37-proposal collapsed modal free of mounted trait selects", () => {
    const players = Array.from({ length: 37 }, (_, index) => ({
      id: `player-${index + 1}`,
      name: `Batter${index + 1}`,
      position: "CF",
      teamName: "Boulder Baselines",
      proposals: [{
        id: `trait-${index + 1}`,
        kind: "trait" as const,
        observedPriorValue: { trait1: null, trait2: null },
        traitChange: { valence: "gain" as const, trait: "Clutch", from: { trait1: null, trait2: null }, to: { trait1: "Clutch", trait2: null } },
      }],
    }));
    const { container } = render(<CheckpointTakeover cp={{ number: 4, label: "Checkpoint 4 of 5 — game 24", players, groups: [{ boundaryGameNumber: 24, ordinal: 4, ordinalCount: 5, label: "Checkpoint 4 of 5 — game 24", players }] }} onClose={vi.fn()} onResolve={vi.fn()} />);
    expect(container.querySelectorAll("select")).toHaveLength(0);
  });

  test("Enter confirms and advances through three focused rows while Tab cycles rows", async () => {
    const onResolve = vi.fn(async () => ({ outcome: "resolved" as const }));
    const players = ["Batter10", "Batter2", "Batter1"].map((name, index) => ({
      id: `keyboard-player-${index}`,
      name,
      position: "CF",
      teamName: "Boulder Baselines",
      proposals: [{ id: `keyboard-${index}`, kind: "rating" as const, observedPriorValue: 50, ratingChange: { label: "Contact", from: 50, to: 51 } }],
    }));
    render(<CheckpointTakeover cp={{ number: 4, label: "Checkpoint 4 of 5 — game 24", players, groups: [{ boundaryGameNumber: 24, ordinal: 4, ordinalCount: 5, label: "Checkpoint 4 of 5 — game 24", players }] }} onClose={vi.fn()} onResolve={onResolve} />);
    const first = screen.getByTestId("proposal-keyboard-2");
    const second = screen.getByTestId("proposal-keyboard-1");
    const third = screen.getByTestId("proposal-keyboard-0");
    first.focus();
    fireEvent.keyDown(first, { key: "Tab" });
    await waitFor(() => expect(document.activeElement).toBe(second));
    first.focus();
    fireEvent.keyDown(first, { key: "Enter" });
    await waitFor(() => expect(onResolve).toHaveBeenNthCalledWith(1, expect.objectContaining({ proposalId: "keyboard-2", action: "confirm" })));
    await waitFor(() => expect(document.activeElement).toBe(second));
    fireEvent.keyDown(second, { key: "Enter" });
    await waitFor(() => expect(document.activeElement).toBe(third));
    fireEvent.keyDown(third, { key: "Enter" });
    await waitFor(() => expect(onResolve).toHaveBeenCalledTimes(3));
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

  test("labels every Clubhouse and takeover interactive element", () => {
    const hub: HubVM = {
      pulse: {},
      roster: [],
      checkpoint: checkpoint(),
      bigMoments: [{ id: "checkpoint", icon: "🔔", kicker: "Checkpoint", title: "3 changes across 2 players", detail: "Open the worklist.", action: "checkpoint", tone: "urgent" }],
      home: {
        impactCards: [{ kind: "dated", icon: "📋", title: "Checkpoint ready", detail: "3 changes across 2 players.", cta: "Open the worklist", action: "checkpoint" }],
      },
    };
    render(<FranchiseLensHub teams={[{ id: "home", name: "Home Club", abbr: "HOM", primary: "#2A4A2F" }]} active={active} hub={hub} onSelectTeam={vi.fn()} />);
    for (const control of screen.getAllByRole("button")) expect(control).toHaveAccessibleName();
    fireEvent.click(screen.getByRole("button", { name: /Checkpoint ready/i }));
    fireEvent.click(within(screen.getByTestId("proposal-trait-1")).getByRole("button", { name: "Adjust" }));
    for (const control of [
      ...screen.getAllByRole("button"),
      ...screen.queryAllByRole("spinbutton"),
      ...screen.getAllByRole("combobox"),
    ]) expect(control).toHaveAccessibleName();
  });

  test("reveals the takeover instructions only through the Lens Help affordance", () => {
    const hub: HubVM = {
      pulse: {},
      roster: [],
      checkpoint: checkpoint(),
      home: {
        impactCards: [{ kind: "dated", icon: "📋", title: "Checkpoint ready", detail: "3 changes across 2 players.", cta: "Open the worklist", action: "checkpoint" }],
      },
    };
    render(<FranchiseLensHub teams={[{ id: "home", name: "Home Club", abbr: "HOM", primary: "#2A4A2F" }]} active={active} hub={hub} onSelectTeam={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Checkpoint ready/i }));
    const instructions = screen.getByText(/Record what SMB4 actually accepted/i);
    expect(instructions).not.toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Help/i }));

    expect(instructions).toBeVisible();
  });

  test("keeps the active club visible in the compact next-game strip", () => {
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
    expect(container.querySelector(".fen-next-opponent")?.textContent).toContain("Away Club");
  });
});
