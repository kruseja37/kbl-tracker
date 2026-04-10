import React from 'react';
import type { PlayLogEntry, RunnerSubEntry } from '../utils/playLogTypes';

// ──────────────────────────────────────────────────────────────
// Result color mapping
// ──────────────────────────────────────────────────────────────

const RESULT_COLORS: Record<string, string> = {
  // Hits — muted blue
  '1B': '#7a9ab8', '2B': '#7a9ab8', '3B': '#7a9ab8',
  // HR — muted purple
  'HR': '#a082b8',
  // GRD — muted blue (counts as double)
  'GRD': '#7a9ab8',
  // Walks — muted green
  'BB': '#6aad82', 'IBB': '#6aad82', 'HBP': '#6aad82',
  // Outs — muted red
  'K': '#b87a7a', 'Kc': '#b87a7a', 'GO': '#b87a7a', 'FO': '#b87a7a', 'FLO': '#b87a7a',
  'LO': '#b87a7a', 'PO': '#b87a7a', 'DP': '#b87a7a', 'TP': '#b87a7a',
  'SF': '#b87a7a', 'SAC': '#b87a7a', 'FC': '#b87a7a',
  'D3K': '#b87a7a', 'WP_K': '#b87a7a', 'PB_K': '#b87a7a',
  // Error — muted yellow
  'E': '#c4a058',
  // Between-play events
  'SB': '#5a9e80', 'CS': '#b87a7a', 'PK': '#c49a4a', 'WP': '#c49a4a', 'PB': '#c49a4a',
  'ADV': '#b0b0a0', 'SUB': '#a09050', 'POS': '#6b8b6b', 'PCHG': '#a09050',
  'MOJO': '#7a9ab8', 'FIT': '#6aad82', 'INJ': '#b87a7a', 'MM': '#a082b8', 'PC': '#5a6a5e',
  'BLK': '#c49a4a',
};

function getResultColor(result: string): string {
  const normalizedResult = result.split(' ')[0];
  if (normalizedResult.startsWith('E')) {
    return RESULT_COLORS.E;
  }
  return RESULT_COLORS[result] || RESULT_COLORS[normalizedResult] || '#E8E8D8';
}

// ──────────────────────────────────────────────────────────────
// Runner sub-entry base label formatting
// ──────────────────────────────────────────────────────────────

const BASE_DISPLAY: Record<string, string> = {
  batter: 'BAT', first: '1B', second: '2B', third: '3B', home: 'HOME', out: 'OUT', end: 'END',
};

function formatRunnerTransition(fromBase: string, toBase: string): string {
  return `${BASE_DISPLAY[fromBase] || fromBase}→${BASE_DISPLAY[toBase] || toBase}`;
}

// ──────────────────────────────────────────────────────────────
// PlayLogPanel Component
// ──────────────────────────────────────────────────────────────

interface PlayLogPanelProps {
  entries: PlayLogEntry[];
  onEntryTap?: (entry: PlayLogEntry) => void;
  onRunnerSubEntryTap?: (subEntry: RunnerSubEntry, parentEntry: PlayLogEntry) => void;
  enrichingEntryId?: string | null;
  enrichingRunnerSubEntryId?: string | null;
  teamColors?: { away: string; home: string };
  isTop?: boolean;
}

function getBattingTeamColor(
  inningLabel: string,
  teamColors?: { away: string; home: string },
  isTop?: boolean,
): string | undefined {
  if (!teamColors) {
    return undefined;
  }

  if (inningLabel.startsWith('T')) {
    return teamColors.away;
  }

  if (inningLabel.startsWith('B')) {
    return teamColors.home;
  }

  return isTop === undefined ? undefined : isTop ? teamColors.away : teamColors.home;
}

export function PlayLogPanel({
  entries,
  onEntryTap,
  onRunnerSubEntryTap,
  enrichingEntryId,
  enrichingRunnerSubEntryId,
  teamColors,
  isTop,
}: PlayLogPanelProps) {
  const [showSystemRows, setShowSystemRows] = React.useState(false);
  const [animatingEntryId, setAnimatingEntryId] = React.useState<string | null>(null);
  const [lockedResultTooltipEntryId, setLockedResultTooltipEntryId] = React.useState<string | null>(null);
  const prefersTouchMode =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const visibleEntries = showSystemRows ? entries : entries.filter((entry) => entry.visibility === 'default');
  const systemRowCount = entries.filter((entry) => entry.visibility === 'system').length;
  const newestVisibleEntryId = visibleEntries.length > 0 ? visibleEntries[visibleEntries.length - 1].id : null;
  const previousNewestEntryId = React.useRef<string | null>(newestVisibleEntryId);

  React.useEffect(() => {
    if (newestVisibleEntryId && previousNewestEntryId.current && newestVisibleEntryId !== previousNewestEntryId.current) {
      setAnimatingEntryId(newestVisibleEntryId);
    }

    previousNewestEntryId.current = newestVisibleEntryId;
  }, [newestVisibleEntryId]);

  React.useEffect(() => {
    if (!lockedResultTooltipEntryId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setLockedResultTooltipEntryId(null);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [lockedResultTooltipEntryId]);

  const handleLockedResultTooltip = React.useCallback((
    event: React.MouseEvent<HTMLElement>,
    entry: PlayLogEntry,
  ) => {
    const resultField = (event.target as HTMLElement).closest('[data-play-log-result="true"]');
    const isLockedAtBatResult = entry.eventType === 'at_bat' && !entry.isEnrichable;

    if (!resultField || !isLockedAtBatResult) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setLockedResultTooltipEntryId(entry.id);
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-[#364038] border-l-[3px] border-[#252b27] flex flex-col" style={{ boxShadow: 'inset 0 0 4px rgba(0,0,0,0.25)', fontFamily: "'Moms Typewriter', monospace" }}>
      <style>{`
        @keyframes playlog-entry-fade-in {
          0% {
            opacity: 0;
            transform: translateY(-6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Header */}
      <div className="bg-[#243028] border-b-[2px] border-[#1a1e1b] px-2 py-1.5 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[#7a857c] text-[10px] font-bold tracking-[0.15em]">PLAY LOG</div>
          {systemRowCount > 0 && (
            <button
              onClick={() => setShowSystemRows((prev) => !prev)}
              className="text-[7px] text-[#88AA88] border border-[#4a6a4a] px-1.5 py-0.5 rounded hover:bg-[#4a6a4a]/40"
            >
              {showSystemRows ? 'Hide system' : `Show all (${systemRowCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Entries — most recent at top */}
      <div className="flex-1 overflow-y-auto p-1">
        {visibleEntries.length === 0 ? (
          <div className="text-[#E8E8D8]/40 text-[10px] text-center py-4 italic">
            No plays yet
          </div>
        ) : (
          [...visibleEntries].reverse().map((entry) => {
            const isActive = enrichingEntryId === entry.id;
            const teamColor = getBattingTeamColor(entry.inningLabel, teamColors, isTop);
            const shouldAnimateEntry = animatingEntryId === entry.id;
            const rowContent = (
              <>
                {/* Row 1: Inning + Name + Result + RBI + QAB */}
                <div className="flex items-center gap-1 leading-tight">
                  <span className="text-[10px] text-[#6b7b6e] w-[24px] flex-shrink-0">
                    {entry.inningLabel}
                  </span>
                  <span
                    className="text-[10px] truncate flex-1 min-w-0"
                    style={{ color: teamColor ?? '#a0a898', fontFamily: "'Tox Typewriter', monospace" }}
                  >
                    {entry.batterName}
                  </span>
                  <span
                    data-play-log-result="true"
                    className="relative text-[10px] font-bold flex-shrink-0"
                    style={{ color: getResultColor(entry.result) }}
                  >
                    {entry.result === 'Kc' || entry.result === 'Ꝁ'
                      ? <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>K</span>
                      : entry.result}
                    {lockedResultTooltipEntryId === entry.id && (
                      <span className="absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded border border-[#C4A853] bg-[#1f2a20] px-2 py-1 text-[8px] font-medium text-[#E8E8D8] shadow-[0_2px_6px_rgba(0,0,0,0.35)] pointer-events-none">
                        Use ↩ Undo to change result
                      </span>
                    )}
                  </span>
                  {entry.rbi > 0 && (
                    <span className="text-[8px] text-[#fbbf24] font-bold flex-shrink-0">
                      {entry.rbi}R
                    </span>
                  )}
                  {entry.isQAB && (
                    <span className="text-[8px] text-[#34d399] bg-[#064e3b]/60 px-1 rounded flex-shrink-0">
                      Q
                    </span>
                  )}
                  {prefersTouchMode && entry.isSelectable && (
                    <span className="ml-auto flex-shrink-0 rounded border border-[#5a6b38] bg-[#2f3b21] px-1.5 py-0.5 text-[7px] font-bold text-[#C4A853]">
                      OPEN
                    </span>
                  )}
                </div>

                {/* Row 2: Enrichment badges + fielding sequence (compact) */}
                <div className="flex items-center gap-1 ml-[25px] flex-wrap">
                  {entry.description ? (
                    <span className="text-[8px] text-[#6b7b6e]">
                      {entry.description}
                    </span>
                  ) : entry.fieldingSequence ? (
                    <span className="text-[8px] text-[#6b7b6e]">
                      {entry.fieldingSequence}
                    </span>
                  ) : null}
                  {/* K/Kc toggle removed per UX-048: K and Ꝁ are now separate Quick Bar buttons */}
                  {entry.eventType === 'at_bat' && entry.isEnrichable && !entry.hasFieldingData && !entry.fieldingSequence && (
                    <span className="text-[8px] text-[#6b7280] bg-[#1f2937]/60 px-1 rounded">
                      +fld
                    </span>
                  )}
                  {entry.eventType === 'at_bat' && entry.isEnrichable && !entry.hasLocationData && (
                    <span className="text-[8px] text-[#6b7280] bg-[#1f2937]/60 px-1 rounded">
                      +loc
                    </span>
                  )}
                  {entry.eventType === 'at_bat' && entry.isEnrichable && !entry.hasPitchType && (
                    <span className="text-[8px] text-[#6b7280] bg-[#1f2937]/60 px-1 rounded">
                      +pit
                    </span>
                  )}
                  {entry.eventType === 'at_bat' && entry.isEnrichable && !entry.hasPitchCount && (
                    <span className="text-[8px] text-[#6b7280] bg-[#1f2937]/60 px-1 rounded">
                      +#
                    </span>
                  )}
                </div>
              </>
            );

            // Render runner sub-entries below the parent at-bat
            const runnerSubRows = entry.runnerSubEntries?.map((sub) => {
              const isSubActive = enrichingRunnerSubEntryId === sub.id;
              const isScored = sub.toBase === 'home';
              const isOut = sub.toBase === 'out';
              const isInningEnd = sub.toBase === 'end';
              const hasEnrichment = !!(
                sub.fieldingSequence?.length ||
                sub.playMechanic ||
                sub.fielderPosition ||
                sub.heldByOf ||
                sub.holdingFielder ||
                sub.baseSaved ||
                sub.isTootblan ||
                sub.isOutAdvancing ||
                sub.errorType ||
                typeof sub.errorChargedTo === 'number'
              );
              const subjectLabel = sub.fromBase === 'batter'
                ? `Batter: ${sub.runnerName}`
                : sub.runnerName;

              const subContent = (
                <div className="flex items-center gap-1 leading-tight">
                  <span className="text-[9px] text-[#6b7280] w-[24px] flex-shrink-0 text-right pr-0.5">└</span>
                  <span className={`text-[9px] truncate flex-1 min-w-0 ${
                    isScored ? 'text-[#34d399]' : isOut ? 'text-[#f87171]/80' : isInningEnd ? 'text-[#fbbf24]/90' : 'text-[#E8E8D8]/70'
                  }`} style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                    {subjectLabel}
                  </span>
                  <span className={`text-[8px] flex-shrink-0 ${
                    isScored ? 'text-[#34d399]' : isOut ? 'text-[#f87171]/80' : isInningEnd ? 'text-[#fbbf24]/90' : 'text-[#88AA88]'
                  }`}>
                    {sub.transitionLabel ?? formatRunnerTransition(sub.fromBase, sub.toBase)}
                  </span>
                  {sub.isTootblan && (
                    <span className="text-[7px] text-[#f87171] bg-[#7f1d1d]/40 px-0.5 rounded flex-shrink-0">TB</span>
                  )}
                  {sub.isOutAdvancing && (
                    <span className="text-[7px] text-[#f59e0b] bg-[#78350f]/40 px-0.5 rounded flex-shrink-0">OA</span>
                  )}
                  {hasEnrichment ? (
                    <span className="text-[6px] text-[#34d399] flex-shrink-0">&#10003;</span>
                  ) : (
                    <span className="text-[7px] text-[#6b7280] bg-[#1f2937]/60 px-0.5 rounded flex-shrink-0">+</span>
                  )}
                </div>
              );

              return (
                <div
                  key={sub.id}
                  data-runner-sub-entry={sub.id}
                  className={`py-0.5 pl-3 pr-1 cursor-pointer
                    ${isSubActive ? 'bg-[#4a6a4a]/40 border-l-2 border-l-[#C4A853]' : 'hover:bg-[#4a6a4a]/15'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunnerSubEntryTap?.(sub, entry);
                  }}
                >
                  {subContent}
                </div>
              );
            });

            if (prefersTouchMode && entry.isSelectable) {
              return (
                <div
                  key={entry.id}
                  style={shouldAnimateEntry ? { animation: 'playlog-entry-fade-in 300ms ease-out' } : undefined}
                  onAnimationEnd={() => {
                    if (shouldAnimateEntry) {
                      setAnimatingEntryId(null);
                    }
                  }}
                >
                  <button
                    type="button"
                    data-play-log-entry={entry.id}
                    className={`w-full py-0.5 px-1 text-left border-b border-[#4a6a4a]/30 relative z-10 touch-manipulation
                      ${isActive ? 'bg-[#4a6a4a]/40 border-l-2 border-l-[#C4A853]' : 'hover:bg-[#4a6a4a]/20'}`}
                    onClickCapture={(event) => handleLockedResultTooltip(event, entry)}
                    onClick={() => onEntryTap?.(entry)}
                  >
                    {rowContent}
                  </button>
                  {runnerSubRows}
                </div>
              );
            }

            return (
              <div
                key={entry.id}
                style={shouldAnimateEntry ? { animation: 'playlog-entry-fade-in 300ms ease-out' } : undefined}
                onAnimationEnd={() => {
                  if (shouldAnimateEntry) {
                    setAnimatingEntryId(null);
                  }
                }}
              >
                <div
                  data-play-log-entry={entry.id}
                  className={`py-0.5 px-1 border-b border-[#4a6a4a]/30 ${entry.isSelectable ? 'cursor-pointer' : 'cursor-default'}
                    ${isActive ? 'bg-[#4a6a4a]/40 border-l-2 border-l-[#C4A853]' : entry.isSelectable ? 'hover:bg-[#4a6a4a]/20' : ''} relative z-10 pointer-events-auto touch-manipulation`}
                  onClickCapture={(event) => handleLockedResultTooltip(event, entry)}
                  onClick={() => entry.isSelectable && onEntryTap?.(entry)}
                >
                  {rowContent}
                </div>
                {runnerSubRows}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PlayLogPanel;
