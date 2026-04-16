import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  CommentaryFeed,
  type CommentaryFeedEntry,
} from "../../app/components/CommentaryFeed";
import { CommentaryTypewriter } from "../../app/components/CommentaryTypewriter";

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
});
