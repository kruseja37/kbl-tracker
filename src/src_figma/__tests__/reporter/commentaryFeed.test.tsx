import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  CommentaryFeed,
  type CommentaryFeedEntry,
} from "../../app/components/CommentaryFeed";
import { CommentaryTypewriter } from "../../app/components/CommentaryTypewriter";
import type { ManagerDecisionRecord } from "../../../types/managerWpa";

function createEntries(): CommentaryFeedEntry[] {
  return [
    {
      id: "entry-oldest",
      commentaryText: "Noelle punched out the side in the top half.",
      halfInningLabel: "T4",
      timestamp: new Date("2026-04-15T19:18:00.000Z").getTime(),
      reporterId: "reporter-1",
    },
    {
      id: "entry-middle",
      commentaryText: "The Blowfish scratched out the first run on a slow roller.",
      halfInningLabel: "B4",
      timestamp: new Date("2026-04-15T19:22:00.000Z").getTime(),
      reporterId: "reporter-1",
    },
    {
      id: "entry-newest",
      commentaryText: "Backman split the gap and this park woke up all at once.",
      halfInningLabel: "B4",
      timestamp: new Date("2026-04-15T19:24:00.000Z").getTime(),
      reporterId: "reporter-1",
      historicalTidbit: {
        factId: "mlb-hank-aaron-755",
        text: "Hank Aaron hit 755 home runs and broke Babe Ruth's record with number 715 on April 8, 1974.",
        sourceLabel: "MLB",
        sourceUrl:
          "https://www.mlb.com/press-release/press-release-brewers-mourn-the-passing-of-hall-of-famer-hank-aaron",
      },
    },
  ];
}

function createEntriesWithPreamble(): CommentaryFeedEntry[] {
  return [
    ...createEntries(),
    {
      id: "entry-pre",
      commentaryText:
        "Good evening everybody, this is Dutch Calloway and the Tank is ready to rattle tonight.",
      halfInningLabel: "PRE",
      timestamp: 0,
      reporterId: "reporter-1",
    },
  ];
}

function createManagerDecision(): ManagerDecisionRecord {
  return {
    decisionId: "game-1:sub-1:pinch_hitter",
    gameId: "game-1",
    managerId: "braves-manager",
    teamId: "braves",
    opponentTeamId: "athletics",
    decisionType: "pinch_hitter",
    inferenceMethod: "automatic",
    decisionSource: "user_action",
    confidence: "high",
    inning: 2,
    half: "bottom",
    outs: 0,
    baseState: "000",
    scoreDifferentialForTeam: -9,
    leverageIndex: 1.2,
    decisionEventId: "sub-1",
    linkedEventIds: ["sub-1", "pa-2"],
    involvedPlayerIds: ["rafael-belliard", "jeff-blauser"],
    teamWinProbabilityBefore: 0.1,
    teamWinProbabilityAfter: 0.128,
    managerWpa: 0.007,
    rawWindowWpa: 0.028,
    managerShare: 0.25,
    resolved: true,
    resolvedAtEventId: "pa-2",
    resolutionWindow: {
      status: "resolved",
      startEventId: "sub-1",
      startEventIndex: 12,
      startSnapshotSource: "event_state",
      expectedEndpoint: "next_pa",
      trackedPlayerIds: ["jeff-blauser"],
      trackedRunnerIds: [],
      maxEventIndex: 13,
    },
    displayTitle: "Pinch hitter",
    displaySummary: "Pinch hitter for braves",
    derivation: {
      derivedFromEventIds: ["sub-1", "pa-2"],
      derivedFromFields: ["substitution.subType"],
      manuallyPinned: false,
      stale: false,
    },
  };
}

describe("CommentaryFeed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("renders a 3-entry stream with the older entries already visible", () => {
    render(
      <CommentaryFeed
        entries={createEntries()}
        soundsOn={false}
      />,
    );

    expect(screen.getByTestId("commentary-feed")).toBeInTheDocument();
    expect(screen.getByText("The Blowfish scratched out the first run on a slow roller.")).toBeInTheDocument();
    expect(screen.getByText("Noelle punched out the side in the top half.")).toBeInTheDocument();
  });

  test("renders reverse-chronological order with newest commentary first", () => {
    const { container } = render(
      <CommentaryFeed
        entries={createEntries()}
        soundsOn={false}
      />,
    );

    const renderedEntries = Array.from(
      container.querySelectorAll('[data-testid^="commentary-entry-"]'),
    ).map((node) => node.getAttribute("data-testid"));

    expect(renderedEntries).toEqual([
      "commentary-entry-entry-newest",
      "commentary-entry-entry-middle",
      "commentary-entry-entry-oldest",
    ]);
  });

  test("inserts half-inning divider rows when the feed rolls from T4 to B4", () => {
    render(
      <CommentaryFeed
        entries={createEntries()}
        soundsOn={false}
      />,
    );

    expect(screen.getByTestId("commentary-divider-B4")).toHaveTextContent(
      "─── B4 ───",
    );
    expect(screen.getByTestId("commentary-divider-T4")).toHaveTextContent(
      "─── T4 ───",
    );
  });

  test("renders a compact source pill for historical tidbits", () => {
    render(
      <CommentaryFeed
        entries={createEntries()}
        soundsOn={false}
      />,
    );

    expect(screen.getByText("History Note")).toBeInTheDocument();
    expect(screen.getByText("MLB")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hank Aaron hit 755 home runs and broke Babe Ruth's record with number 715 on April 8, 1974.",
      ),
    ).toBeInTheDocument();
  });

  test("renders a PRE entry at the bottom with its own divider", () => {
    const { container } = render(
      <CommentaryFeed
        entries={createEntriesWithPreamble()}
        soundsOn={false}
      />,
    );

    expect(screen.getByTestId("commentary-divider-PRE")).toHaveTextContent(
      "─── PRE ───",
    );
    expect(screen.getByTestId("commentary-entry-entry-pre")).toHaveTextContent(
      "Good evening everybody, this is Dutch Calloway and the Tank is ready to rattle tonight.",
    );
    expect(screen.getByTestId("commentary-entry-entry-pre")).toHaveTextContent(
      "pregame",
    );

    const renderedEntries = Array.from(
      container.querySelectorAll('[data-testid^="commentary-entry-"]'),
    ).map((node) => node.getAttribute("data-testid"));

    expect(renderedEntries.at(-1)).toBe("commentary-entry-entry-pre");
  });

  test("typewriter animates only the most recent entry", () => {
    render(
      <CommentaryFeed
        entries={createEntries()}
        soundsOn={false}
        wordDelayMs={120}
      />,
    );

    expect(
      screen.getByTestId("commentary-entry-entry-middle"),
    ).toHaveTextContent(
      "The Blowfish scratched out the first run on a slow roller.",
    );
    expect(
      screen.getByTestId("commentary-entry-entry-newest"),
    ).not.toHaveTextContent("Backman split the gap and this park woke up all at once.");

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(
      screen.getByTestId("commentary-entry-entry-newest"),
    ).toHaveTextContent("Backman");
    expect(
      screen.getByTestId("commentary-entry-entry-middle"),
    ).toHaveTextContent(
      "The Blowfish scratched out the first run on a slow roller.",
    );
  });

  test("soundsOn=false does not invoke the audio callback while typing", () => {
    const onPlayTypeSound = vi.fn();

    render(
      <CommentaryFeed
        entries={createEntries()}
        soundsOn={false}
        onPlayTypeSound={onPlayTypeSound}
        wordDelayMs={20}
        charDelayMs={1}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onPlayTypeSound).not.toHaveBeenCalled();
  });

  test("soundsOn=true invokes the audio callback once per character for the animating entry", () => {
    const onPlayTypeSound = vi.fn();
    const newestEntry = createEntries()[2];
    const expectedCharacterCount = newestEntry.commentaryText.replace(/\s+/g, "").length;

    render(
      <CommentaryFeed
        entries={createEntries()}
        soundsOn={true}
        onPlayTypeSound={onPlayTypeSound}
        wordDelayMs={10}
        charDelayMs={1}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onPlayTypeSound).toHaveBeenCalledTimes(expectedCharacterCount);
  });

  test("renders compact Manager Moment rows with expandable detail", () => {
    render(
      <CommentaryFeed
        entries={[
          {
            id: "manager-pinch-hit",
            commentaryText: "Pinch hitter for braves. +0.007 WPA.",
            halfInningLabel: "B2",
            timestamp: new Date("2026-04-15T19:24:00.000Z").getTime(),
            kind: "manager-user-action",
            managerDecision: createManagerDecision(),
            managerLabel: "Atlanta Manager",
            managerDecisionDetail: "Pinch hitter: Jeff Blauser for Rafael Belliard.",
            managerDecisionOutcome: "Jeff Blauser HR. Manager value +0.007 WPA.",
            canEditAttribution: true,
          },
        ]}
        soundsOn={false}
      />,
    );

    const row = screen.getByTestId("commentary-entry-manager-pinch-hit");
    expect(row).toHaveTextContent("B2");
    expect(row).toHaveTextContent("Atlanta Manager");
    expect(row).toHaveTextContent("+0.7 pp WPA");
    expect(row).not.toHaveTextContent("Jeff Blauser for Rafael Belliard");

    fireEvent.click(
      screen.getByRole("button", {
        name: /open manager moment details for atlanta manager/i,
      }),
    );

    expect(screen.getByRole("dialog", { name: /manager moment details/i }))
      .toBeInTheDocument();
    expect(screen.getByText("Pinch hitter")).toBeInTheDocument();
    expect(screen.getByText("Pinch hitter: Jeff Blauser for Rafael Belliard."))
      .toBeInTheDocument();
    expect(screen.getByText("Jeff Blauser HR. Manager value +0.007 WPA."))
      .toBeInTheDocument();
  });
});

describe("CommentaryTypewriter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("reveals text word-by-word for the active line", () => {
    render(
      <CommentaryTypewriter
        text="Holy cow indeed"
        active={true}
        wordDelayMs={100}
      />,
    );

    expect(screen.getByText("", { selector: "span" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Holy", { selector: "span" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Holy cow", { selector: "span" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Holy cow indeed", { selector: "span" })).toBeInTheDocument();
  });

  test("changing the audio callback identity mid-animation does not restart the text", () => {
    const firstSound = vi.fn();
    const secondSound = vi.fn();
    const { rerender } = render(
      <CommentaryTypewriter
        text="Good evening everybody"
        active={true}
        soundsOn={false}
        onCharacterTyped={firstSound}
        wordDelayMs={100}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Good", { selector: "span" })).toBeInTheDocument();

    rerender(
      <CommentaryTypewriter
        text="Good evening everybody"
        active={true}
        soundsOn={false}
        onCharacterTyped={secondSound}
        wordDelayMs={100}
      />,
    );

    expect(screen.getByText("Good", { selector: "span" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Good evening", { selector: "span" })).toBeInTheDocument();
  });
});
