import React from "react";

import { CommentaryTypewriter } from "./CommentaryTypewriter";

export interface CommentaryFeedEntry {
  id: string;
  commentaryText: string;
  halfInningLabel: string;
  timestamp: number;
  reporterId?: string;
  kind?: "play" | "preamble" | "between-inning";
}

export interface CommentaryFeedProps {
  entries: CommentaryFeedEntry[];
  soundsOn?: boolean;
  onPlayTypeSound?: () => void;
  wordDelayMs?: number;
  charDelayMs?: number;
}

type CommentaryFeedItem =
  | {
      type: "divider";
      id: string;
      label: string;
      testIdLabel: string;
      accentColor?: string;
    }
  | {
      type: "entry";
      entry: CommentaryFeedEntry;
      isAnimating: boolean;
    };

function resolveEntryKind(
  entry: CommentaryFeedEntry,
): CommentaryFeedEntry["kind"] | "play" {
  return entry.kind ?? "play";
}

function toDividerLabel(entry: CommentaryFeedEntry): string {
  if (resolveEntryKind(entry) === "between-inning") {
    return `END ${entry.halfInningLabel}`;
  }

  return entry.halfInningLabel;
}

function toDividerTestIdLabel(label: string): string {
  return label.replace(/\s+/g, "-");
}

function sortEntries(entries: CommentaryFeedEntry[]): CommentaryFeedEntry[] {
  return entries
    .slice()
    .sort((left, right) => right.timestamp - left.timestamp);
}

function buildFeedItems(entries: CommentaryFeedEntry[]): CommentaryFeedItem[] {
  const items: CommentaryFeedItem[] = [];
  let previousDividerLabel: string | null = null;

  entries.forEach((entry, index) => {
    const dividerLabel = toDividerLabel(entry);
    if (dividerLabel !== previousDividerLabel) {
      items.push({
        type: "divider",
        id: `divider-${dividerLabel}-${entry.timestamp}`,
        label: dividerLabel,
        testIdLabel: toDividerTestIdLabel(dividerLabel),
        accentColor:
          resolveEntryKind(entry) === "between-inning" ? "#88AA88" : "#C4A853",
      });
      previousDividerLabel = dividerLabel;
    }

    items.push({
      type: "entry",
      entry,
      isAnimating: index === 0,
    });
  });

  return items;
}

function formatTimestamp(timestamp: number): string {
  if (timestamp <= 0) {
    return "pregame";
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CommentaryFeed({
  entries,
  soundsOn = false,
  onPlayTypeSound,
  wordDelayMs,
  charDelayMs,
}: CommentaryFeedProps) {
  const sortedEntries = React.useMemo(() => sortEntries(entries), [entries]);
  const items = React.useMemo(() => buildFeedItems(sortedEntries), [sortedEntries]);

  if (sortedEntries.length === 0) {
    return (
      <div
        className="text-[8px] italic text-[#6b7b6e]"
        data-testid="commentary-feed-empty"
      >
        Beat Reporter: OFFLINE
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2"
      data-testid="commentary-feed"
      style={{ fontFamily: "'Moms Typewriter', monospace" }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#3d5240] pb-1">
        <span className="text-[8px] font-bold tracking-[0.18em] text-[#C4A853]">
          BEAT REPORTER
        </span>
        <span className="text-[7px] uppercase tracking-[0.16em] text-[#88AA88]">
          {soundsOn ? "sound on" : "sound off"}
        </span>
      </div>

      {items.map((item) => {
        if (item.type === "divider") {
          return (
            <div
              key={item.id}
              className="pt-1 text-center text-[8px] font-bold tracking-[0.18em] text-[#C4A853]"
              data-testid={`commentary-divider-${item.testIdLabel}`}
              style={{ fontFamily: "'Tox Typewriter', monospace" }}
            >
              <span style={{ color: item.accentColor }}>
                {item.label.startsWith("END ")
                  ? `··· ${item.label} ···`
                  : `─── ${item.label} ───`}
              </span>
            </div>
          );
        }

        const entryKind = resolveEntryKind(item.entry);
        const isBetweenInning = entryKind === "between-inning";

        return (
          <article
            key={item.entry.id}
            className="rounded-sm border border-[#2f3a31] bg-[#2a352d]/70 px-2 py-1.5 shadow-[inset_0_0_3px_rgba(0,0,0,0.2)]"
            data-testid={`commentary-entry-${item.entry.id}`}
            style={
              isBetweenInning
                ? {
                    borderColor: "#425546",
                    background: "rgba(35, 49, 38, 0.88)",
                  }
                : undefined
            }
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span
                className="text-[7px] uppercase tracking-[0.16em] text-[#88AA88]"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}
              >
                {isBetweenInning
                  ? `END ${item.entry.halfInningLabel}`
                  : item.entry.halfInningLabel}
              </span>
              <span className="text-[7px] text-[#6b7b6e]">
                {formatTimestamp(item.entry.timestamp)}
              </span>
            </div>
            <div
              className="text-[9px] leading-[1.45] text-[#E8E8D8]"
              style={
                isBetweenInning
                  ? {
                      color: "#C4D9C4",
                      fontStyle: "italic",
                    }
                  : undefined
              }
            >
              <CommentaryTypewriter
                text={item.entry.commentaryText}
                active={item.isAnimating}
                soundsOn={soundsOn}
                onCharacterTyped={onPlayTypeSound}
                wordDelayMs={wordDelayMs}
                charDelayMs={charDelayMs}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default CommentaryFeed;
