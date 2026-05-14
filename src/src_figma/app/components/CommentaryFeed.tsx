import React from "react";

import type {
  BeatReporter,
  HistoricalTidbit,
} from "../../../types/reporter";
import type { ManagerDecisionRecord } from "../../../types/managerWpa";
import type {
  ManagerRecommendation,
  ManagerRecommendationAction,
  ManagerRecommendationNoChangeAction,
  ManagerRecommendationPrimaryAction,
} from "../../../utils/managerWpaRecommendations";
import { CommentaryTypewriter } from "./CommentaryTypewriter";

export interface CommentaryFeedEntry {
  id: string;
  commentaryText: string;
  halfInningLabel: string;
  timestamp: number;
  reporterId?: string;
  kind?:
    | "play"
    | "preamble"
    | "between-inning"
    | "manager-passive"
    | "manager-user-action"
    | "manager-recommendation-card"
    | "manager-recommendation-note"
    | "manager-recommendation-passive";
  historicalTidbit?: HistoricalTidbit;
  managerDecision?: ManagerDecisionRecord;
  managerRecommendation?: ManagerRecommendation;
  canEditAttribution?: boolean;
  managerLabel?: string;
  managerDecisionDetail?: string;
  managerDecisionOutcome?: string;
}

export interface CommentaryFeedProps {
  entries: CommentaryFeedEntry[];
  reporters?: Record<string, BeatReporter>;
  reporterTeamColors?: Record<string, { primary: string; secondary: string }>;
  soundsOn?: boolean;
  onPlayTypeSound?: () => void;
  wordDelayMs?: number;
  charDelayMs?: number;
  onManagerDecisionEdit?: (decision: ManagerDecisionRecord) => void;
  onManagerRecommendationAction?: (
    recommendation: ManagerRecommendation,
    action: ManagerRecommendationAction,
  ) => void;
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
      hasReporterShift: boolean;
      isAnimating: boolean;
    };

function resolveEntryKind(
  entry: CommentaryFeedEntry,
): CommentaryFeedEntry["kind"] | "play" {
  return entry.kind ?? "play";
}

function isManagerEntry(entry: CommentaryFeedEntry): boolean {
  const kind = resolveEntryKind(entry);
  return (
    kind === "manager-passive" ||
    kind === "manager-user-action" ||
    kind === "manager-recommendation-card" ||
    kind === "manager-recommendation-note" ||
    kind === "manager-recommendation-passive"
  );
}

function toDividerLabel(entry: CommentaryFeedEntry): string {
  if (resolveEntryKind(entry) === "between-inning") {
    return `END ${entry.halfInningLabel}`;
  }

  return entry.halfInningLabel;
}

function formatManagerWpa(decision: ManagerDecisionRecord | undefined): string {
  if (!decision || !decision.resolved || typeof decision.managerWpa !== "number") {
    return "pending";
  }

  return `${decision.managerWpa >= 0 ? "+" : ""}${decision.managerWpa.toFixed(3)}`;
}

function managerWpaColorClass(status: string): string {
  if (status === "pending") return "text-[#fbbf24]";
  return status.startsWith("+") ? "text-[#34d399]" : "text-[#f87171]";
}

function formatDecisionSource(decision: ManagerDecisionRecord): string {
  return decision.decisionSource.replace(/_/g, " ");
}

function isManagerRecommendationEntry(entry: CommentaryFeedEntry): boolean {
  return Boolean(entry.managerRecommendation);
}

function formatRecommendationKind(entry: CommentaryFeedEntry): string {
  switch (resolveEntryKind(entry)) {
    case "manager-recommendation-card":
      return "Recommendation";
    case "manager-recommendation-note":
      return "Quick Note";
    default:
      return "Passive Note";
  }
}

function formatPrimaryActionLabel(
  action: ManagerRecommendationPrimaryAction,
): string {
  switch (action) {
    case "open_pitching_change":
      return "Open Bullpen";
    case "open_pinch_hit":
      return "Open Bench";
    case "open_defensive_sub":
      return "Open Defense";
  }
}

function formatNoChangeActionLabel(
  action: ManagerRecommendationNoChangeAction,
): string {
  switch (action) {
    case "keep_pitcher":
      return "Keep Current";
    case "let_batter_hit":
      return "Let Hit";
    case "decline_defensive_sub":
      return "Keep Defense";
  }
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
  let previousReporterId: string | undefined;

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
      hasReporterShift:
        Boolean(previousReporterId) &&
        Boolean(entry.reporterId) &&
        previousReporterId !== entry.reporterId,
      isAnimating: index === 0,
    });
    previousReporterId = entry.reporterId;
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
  reporters = {},
  reporterTeamColors = {},
  soundsOn = false,
  onPlayTypeSound,
  wordDelayMs,
  charDelayMs,
  onManagerDecisionEdit,
  onManagerRecommendationAction,
}: CommentaryFeedProps) {
  const sortedEntries = React.useMemo(() => sortEntries(entries), [entries]);
  const items = React.useMemo(() => buildFeedItems(sortedEntries), [sortedEntries]);
  const [selectedManagerEntry, setSelectedManagerEntry] =
    React.useState<CommentaryFeedEntry | null>(null);
  const selectedManagerDecision = selectedManagerEntry?.managerDecision;

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
      style={{ fontFamily: "'Tox Typewriter', monospace" }}
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
        const isManagerRow = isManagerEntry(item.entry);
        const isRecommendationRow = isManagerRecommendationEntry(item.entry);
        const reporter = item.entry.reporterId
          ? reporters[item.entry.reporterId]
          : undefined;
        const reporterPalette = item.entry.reporterId
          ? reporterTeamColors[item.entry.reporterId]
          : undefined;
        const isHistoryOnlyEntry =
          isBetweenInning &&
          !item.entry.commentaryText.trim() &&
          Boolean(item.entry.historicalTidbit);
        const accentColor =
          reporterPalette?.primary ??
          (item.entry.managerRecommendation?.confidence === "high"
            ? "#C4A853"
            : item.entry.managerRecommendation?.confidence === "medium"
              ? "#88AA88"
              : item.entry.managerRecommendation
                ? "#6b7b6e"
                : undefined) ??
          (entryKind === "manager-user-action" ? "#C4A853" : undefined) ??
          (isManagerRow ? "#88AA88" : undefined) ??
          (isBetweenInning ? "#88AA88" : "#C4A853");
        const dividerColor = reporterPalette?.secondary ?? "#425546";
        const byline = isManagerRow
          ? isRecommendationRow
            ? "Manager Recommendation"
            : "Manager Moment"
          : isHistoryOnlyEntry
            ? null
            : reporter?.name ?? (item.entry.reporterId ? "Beat Reporter" : null);
        const badgeLabel = isHistoryOnlyEntry
          ? "H"
          : isManagerRow
            ? isRecommendationRow
              ? "R"
              : "M"
          : byline
            ? byline.charAt(0).toUpperCase()
            : "B";
        const managerDecision = item.entry.managerDecision;
        const managerRecommendation = item.entry.managerRecommendation;
        const managerStatus = formatManagerWpa(managerDecision);
        const managerLabel =
          item.entry.managerLabel ||
          managerDecision?.managerId ||
          "Manager";
        const isManagerDecisionRow =
          isManagerRow && Boolean(managerDecision) && !isRecommendationRow;

        if (isManagerDecisionRow && managerDecision) {
          return (
            <article
              key={item.entry.id}
              className="rounded-sm border bg-[#243028]/82 px-2 py-1.5 shadow-[inset_0_0_3px_rgba(0,0,0,0.2)]"
              data-testid={`commentary-entry-${item.entry.id}`}
              style={{
                borderColor: dividerColor,
                borderLeftColor: accentColor,
                borderLeftWidth: 3,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="text-[7px] font-bold uppercase tracking-[0.16em]"
                    style={{
                      color: accentColor,
                      fontFamily: "'Tox Typewriter', monospace",
                    }}
                  >
                    {item.entry.halfInningLabel}
                  </div>
                  <div className="truncate text-[8px] text-[#E8E8D8]">
                    {managerLabel}
                  </div>
                </div>
                <button
                  type="button"
                  className={`shrink-0 rounded-sm border border-[#425546] bg-[#182118] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] hover:bg-[#2f3b21] ${managerWpaColorClass(managerStatus)}`}
                  onClick={() => setSelectedManagerEntry(item.entry)}
                  aria-label={`Open manager moment details for ${managerLabel}`}
                >
                  {managerStatus === "pending" ? "pending" : `${managerStatus} WPA`}
                </button>
              </div>
            </article>
          );
        }

        return (
          <article
            key={item.entry.id}
            className="rounded-sm border bg-[#2a352d]/70 px-2 py-1.5 shadow-[inset_0_0_3px_rgba(0,0,0,0.2)]"
            data-testid={`commentary-entry-${item.entry.id}`}
            style={{
              borderColor: dividerColor,
              borderLeftColor: accentColor,
              borderLeftWidth: item.hasReporterShift ? 4 : 3,
              borderTopWidth: item.hasReporterShift ? 2 : 1,
              background: isBetweenInning
                ? "rgba(35, 49, 38, 0.88)"
                : isManagerRow
                  ? "rgba(47, 59, 33, 0.70)"
                : "rgba(42, 53, 45, 0.70)",
            }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border text-[7px] font-bold"
                  style={{
                    borderColor: dividerColor,
                    color: accentColor,
                    background: "rgba(18, 23, 19, 0.55)",
                  }}
                >
                  {badgeLabel}
                </span>
                <div className="min-w-0">
                  <div
                    className="text-[7px] uppercase tracking-[0.16em]"
                    style={{
                      color: accentColor,
                      fontFamily: "'Tox Typewriter', monospace",
                    }}
                  >
                    {isBetweenInning
                      ? `${item.entry.halfInningLabel}`
                      : item.entry.halfInningLabel}
                  </div>
                  {byline ? (
                    <div
                      className="truncate text-[7px]"
                      style={{ color: accentColor }}
                    >
                      — {byline}
                    </div>
                  ) : null}
                </div>
              </div>
              <span className="text-[7px] text-[#6b7b6e]">
                {formatTimestamp(item.entry.timestamp)}
              </span>
            </div>
            {isManagerRow && managerDecision ? (
              <div className="mb-1 flex items-center justify-between gap-2">
                <span
                  className="rounded-sm border px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-[0.14em]"
                  style={{
                    borderColor: accentColor,
                    color: accentColor,
                    background: "rgba(18, 23, 19, 0.45)",
                  }}
                >
                  {entryKind === "manager-user-action" ? "User Action" : "Passive"}
                </span>
                <span
                  className={`text-[7px] font-bold uppercase tracking-[0.12em] ${managerWpaColorClass(managerStatus)}`}
                >
                  {managerStatus === "pending" ? "Pending WPA" : `${managerStatus} WPA`}
                </span>
              </div>
            ) : null}
            {isRecommendationRow && managerRecommendation ? (
              <div className="mb-1 flex items-center justify-between gap-2">
                <span
                  className="rounded-sm border px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-[0.14em]"
                  style={{
                    borderColor: accentColor,
                    color: accentColor,
                    background: "rgba(18, 23, 19, 0.45)",
                  }}
                >
                  {formatRecommendationKind(item.entry)}
                </span>
                <span className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#C4D9C4]">
                  {managerRecommendation.confidence} confidence
                </span>
              </div>
            ) : null}
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
              {isManagerRow ? (
                item.entry.commentaryText.trim()
              ) : item.entry.commentaryText.trim() ? (
                <CommentaryTypewriter
                  text={item.entry.commentaryText}
                  active={item.isAnimating}
                  soundsOn={soundsOn}
                  onCharacterTyped={onPlayTypeSound}
                  wordDelayMs={wordDelayMs}
                  charDelayMs={charDelayMs}
                />
              ) : null}
            </div>
            {isRecommendationRow && managerRecommendation ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {managerRecommendation.surface !== "feed_passive" ? (
                  <button
                    type="button"
                    className="rounded-sm border border-[#5a6b38] bg-[#2f3b21] px-1.5 py-0.5 text-[7px] font-bold text-[#C4A853] hover:bg-[#3d5240]"
                    onClick={() =>
                      onManagerRecommendationAction?.(
                        managerRecommendation,
                        managerRecommendation.primaryAction,
                      )
                    }
                  >
                    {formatPrimaryActionLabel(managerRecommendation.primaryAction)}
                  </button>
                ) : null}
                {managerRecommendation.surface !== "feed_passive" &&
                managerRecommendation.noChangeAction ? (
                  <button
                    type="button"
                    className="rounded-sm border border-[#425546] bg-[#243028] px-1.5 py-0.5 text-[7px] font-bold text-[#88AA88] hover:bg-[#2f3b21]"
                    onClick={() =>
                      onManagerRecommendationAction?.(
                        managerRecommendation,
                        managerRecommendation.noChangeAction!,
                      )
                    }
                  >
                    {formatNoChangeActionLabel(
                      managerRecommendation.noChangeAction,
                    )}
                  </button>
                ) : null}
                {managerRecommendation.surface !== "feed_passive" ? (
                  <button
                    type="button"
                    className="rounded-sm border border-[#425546] bg-[#202820] px-1.5 py-0.5 text-[7px] font-bold text-[#8ca08f] hover:bg-[#2f3b21]"
                    onClick={() =>
                      onManagerRecommendationAction?.(
                        managerRecommendation,
                        "dismiss",
                      )
                    }
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
            ) : null}
            {isManagerRow &&
            item.entry.canEditAttribution &&
            managerDecision ? (
              <button
                type="button"
                className="mt-1 rounded-sm border border-[#5a6b38] bg-[#2f3b21] px-1.5 py-0.5 text-[7px] font-bold text-[#C4A853] hover:bg-[#3d5240]"
                onClick={() => onManagerDecisionEdit?.(managerDecision)}
              >
                Edit Attribution
              </button>
            ) : null}
            {item.entry.historicalTidbit ? (
              <div
                className="mt-2 border-t border-dashed pt-1.5"
                style={{ borderColor: dividerColor }}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[7px] uppercase tracking-[0.18em] text-[#C4A853]">
                    History Note
                  </span>
                  <span
                    className="rounded-full border px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-[0.16em]"
                    style={{
                      borderColor: accentColor,
                      color: accentColor,
                      background: "rgba(18, 23, 19, 0.5)",
                    }}
                    title={item.entry.historicalTidbit.sourceUrl}
                  >
                    {item.entry.historicalTidbit.sourceLabel}
                  </span>
                </div>
                <p className="m-0 text-[8px] leading-[1.45] text-[#E8E8D8]">
                  {item.entry.historicalTidbit.text}
                </p>
              </div>
            ) : null}
          </article>
        );
      })}
      {selectedManagerDecision ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Manager moment details"
          onClick={() => setSelectedManagerEntry(null)}
        >
          <div
            className="w-full max-w-md border-4 border-[#5a6b38] bg-[#243028] p-4 text-[#E8E8D8] shadow-[6px_6px_0_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-[8px] uppercase tracking-[0.18em] text-[#C4A853]">
                  {selectedManagerEntry?.halfInningLabel} Manager Moment
                </div>
                <h3 className="m-0 mt-1 text-sm text-[#E8E8D8]">
                  {selectedManagerDecision.displayTitle}
                </h3>
              </div>
              <button
                type="button"
                className="border border-[#425546] bg-[#182118] px-2 py-1 text-[8px] text-[#C4A853] hover:bg-[#2f3b21]"
                onClick={() => setSelectedManagerEntry(null)}
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-[9px] leading-[1.45]">
              <div className="flex items-center justify-between gap-3 border-b border-[#425546] pb-2">
                <span className="text-[#88AA88]">
                  {selectedManagerEntry?.managerLabel ||
                    selectedManagerDecision.managerId}
                </span>
                <span
                  className={`font-bold ${managerWpaColorClass(
                    formatManagerWpa(selectedManagerDecision),
                  )}`}
                >
                  {formatManagerWpa(selectedManagerDecision) === "pending"
                    ? "Pending WPA"
                    : `${formatManagerWpa(selectedManagerDecision)} WPA`}
                </span>
              </div>

              <div>
                <div className="text-[7px] uppercase tracking-[0.16em] text-[#C4A853]">
                  Decision
                </div>
                <p className="m-0">
                  {selectedManagerEntry?.managerDecisionDetail ||
                    selectedManagerDecision.displaySummary}
                </p>
              </div>

              <div>
                <div className="text-[7px] uppercase tracking-[0.16em] text-[#C4A853]">
                  Outcome Window
                </div>
                <p className="m-0">
                  {selectedManagerEntry?.managerDecisionOutcome ||
                    (selectedManagerDecision.resolved
                      ? `Resolved at ${selectedManagerDecision.resolvedAtEventId || "the next committed event"}.`
                      : `Waiting for ${selectedManagerDecision.resolutionWindow?.expectedEndpoint?.replace(/_/g, " ") || "the outcome"}.`)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-[#425546] pt-2 text-[8px] text-[#88AA88]">
                <div>
                  <span className="block text-[#C4A853]">Source</span>
                  {formatDecisionSource(selectedManagerDecision)}
                </div>
                <div>
                  <span className="block text-[#C4A853]">Confidence</span>
                  {selectedManagerDecision.confidence}
                </div>
                <div>
                  <span className="block text-[#C4A853]">Players</span>
                  {selectedManagerDecision.involvedPlayerIds.length > 0
                    ? selectedManagerDecision.involvedPlayerIds.join(", ")
                    : "None tracked"}
                </div>
                <div>
                  <span className="block text-[#C4A853]">Share</span>
                  {typeof selectedManagerDecision.managerShare === "number"
                    ? `${Math.round(selectedManagerDecision.managerShare * 100)}%`
                    : "n/a"}
                </div>
              </div>

              {selectedManagerEntry?.canEditAttribution ? (
                <button
                  type="button"
                  className="mt-1 border border-[#5a6b38] bg-[#2f3b21] px-2 py-1 text-[8px] font-bold text-[#C4A853] hover:bg-[#3d5240]"
                  onClick={() => {
                    onManagerDecisionEdit?.(selectedManagerDecision);
                    setSelectedManagerEntry(null);
                  }}
                >
                  Edit Attribution
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CommentaryFeed;
