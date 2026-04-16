import React from "react";

import { CommentaryTypewriter } from "./CommentaryTypewriter";

export interface CommentaryFeedEntry {
  id: string;
  commentaryText: string;
  halfInningLabel: string;
  timestamp: number;
  reporterId?: string;
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
      halfInningLabel: string;
    }
  | {
      type: "entry";
      entry: CommentaryFeedEntry;
      isAnimating: boolean;
    };

function sortEntries(entries: CommentaryFeedEntry[]): CommentaryFeedEntry[] {
  return entries
    .slice()
    .sort((left, right) => right.timestamp - left.timestamp);
}

function buildFeedItems(entries: CommentaryFeedEntry[]): CommentaryFeedItem[] {
  const items: CommentaryFeedItem[] = [];
  let previousHalfInningLabel: string | null = null;

  entries.forEach((entry, index) => {
    if (entry.halfInningLabel !== previousHalfInningLabel) {
      items.push({
        type: "divider",
        id: `divider-${entry.halfInningLabel}-${entry.timestamp}`,
        halfInningLabel: entry.halfInningLabel,
      });
      previousHalfInningLabel = entry.halfInningLabel;
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
              data-testid={`commentary-divider-${item.halfInningLabel}`}
              style={{ fontFamily: "'Tox Typewriter', monospace" }}
            >
              {`─── ${item.halfInningLabel} ───`}
            </div>
          );
        }

        return (
          <article
            key={item.entry.id}
            className="rounded-sm border border-[#2f3a31] bg-[#2a352d]/70 px-2 py-1.5 shadow-[inset_0_0_3px_rgba(0,0,0,0.2)]"
            data-testid={`commentary-entry-${item.entry.id}`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span
                className="text-[7px] uppercase tracking-[0.16em] text-[#88AA88]"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}
              >
                {item.entry.halfInningLabel}
              </span>
              <span className="text-[7px] text-[#6b7b6e]">
                {formatTimestamp(item.entry.timestamp)}
              </span>
            </div>
            <div className="text-[9px] leading-[1.45] text-[#E8E8D8]">
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
