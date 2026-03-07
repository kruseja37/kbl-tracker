import React from 'react';

// ──────────────────────────────────────────────────────────────
// PlayLogEntry — Structured play data for the Play Log (§4.2)
// ──────────────────────────────────────────────────────────────

export interface PlayLogEntry {
  id: string;
  eventId?: string;                 // AtBatEvent.eventId — links to IndexedDB for enrichment updates
  inningLabel: string;              // "T7", "B3"
  batterName: string;
  result: string;                   // "1B", "GO", "K", "HR", "BB", etc.
  resultCategory: 'hit' | 'out' | 'walk' | 'error' | 'special';
  rbi: number;
  runsScored: number;

  // Enrichment status
  hasFieldingData: boolean;
  hasLocationData: boolean;
  hasKType: boolean;                // For K: was Kc distinction made?
  hasPitchCount: boolean;           // Has pitchesInAtBat been set?
  hasPitchType: boolean;            // Has pitchType been set?
  isEnrichable: boolean;            // false for BB, HBP, IBB
  isQAB: boolean;                   // Quality at-bat (7+ pitches, walks, hits, productive outs)
  fieldingSequence?: string;        // "6-4-3" if recorded

  timestamp: number;
}

// ──────────────────────────────────────────────────────────────
// Result color mapping
// ──────────────────────────────────────────────────────────────

const RESULT_COLORS: Record<string, string> = {
  // Hits — blue
  '1B': '#60a5fa', '2B': '#60a5fa', '3B': '#60a5fa',
  // HR — purple
  'HR': '#c084fc',
  // GRD — blue (counts as double)
  'GRD': '#60a5fa',
  // Walks — green
  'BB': '#4ade80', 'IBB': '#4ade80', 'HBP': '#4ade80',
  // Outs — red
  'K': '#f87171', 'Kc': '#f87171', 'GO': '#f87171', 'FO': '#f87171',
  'LO': '#f87171', 'PO': '#f87171', 'DP': '#f87171', 'TP': '#f87171',
  'SF': '#f87171', 'SAC': '#f87171', 'FC': '#f87171',
  'D3K': '#f87171', 'WP_K': '#f87171', 'PB_K': '#f87171',
  // Error — yellow
  'E': '#fbbf24',
};

function getResultColor(result: string): string {
  return RESULT_COLORS[result] || '#E8E8D8';
}

// ──────────────────────────────────────────────────────────────
// PlayLogPanel Component
// ──────────────────────────────────────────────────────────────

interface PlayLogPanelProps {
  entries: PlayLogEntry[];
  onEntryTap?: (entry: PlayLogEntry) => void;
  onKToggle?: (entry: PlayLogEntry) => void;  // Ticket 5.2: inline K/Kc toggle
  enrichingEntryId?: string | null;           // Currently open enrichment panel entry
}

export function PlayLogPanel({ entries, onEntryTap, onKToggle, enrichingEntryId }: PlayLogPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#3d5240] border-l-[3px] border-[#2a3a2d] flex flex-col">
      {/* Header */}
      <div className="bg-[#2a3a2d] border-b-[2px] border-[#1a2a1d] px-2 py-1.5 sticky top-0 z-10">
        <div className="text-[#C4A853] text-[9px] font-bold tracking-[0.15em]">PLAY LOG</div>
      </div>

      {/* Entries — most recent at top */}
      <div className="flex-1 overflow-y-auto p-1">
        {entries.length === 0 ? (
          <div className="text-[#E8E8D8]/40 text-[10px] text-center py-4 italic">
            No plays yet
          </div>
        ) : (
          [...entries].reverse().map((entry) => {
            const isActive = enrichingEntryId === entry.id;
            return (
              <div
                key={entry.id}
                className={`py-0.5 px-1 border-b border-[#4a6a4a]/30 cursor-pointer
                  ${isActive ? 'bg-[#4a6a4a]/40 border-l-2 border-l-[#C4A853]' : 'hover:bg-[#4a6a4a]/20'}`}
                onClick={() => entry.isEnrichable && onEntryTap?.(entry)}
              >
                {/* Row 1: Inning + Name + Result + RBI + QAB */}
                <div className="flex items-center gap-1 leading-tight">
                  <span className="text-[8px] text-[#88AA88] font-mono w-[18px] flex-shrink-0">
                    {entry.inningLabel}
                  </span>
                  <span className="text-[9px] text-[#E8E8D8] truncate flex-1 min-w-0">
                    {entry.batterName}
                  </span>
                  <span
                    className="text-[9px] font-bold flex-shrink-0"
                    style={{ color: getResultColor(entry.result) }}
                  >
                    {entry.result}
                  </span>
                  {entry.rbi > 0 && (
                    <span className="text-[7px] text-[#fbbf24] font-bold flex-shrink-0">
                      {entry.rbi}R
                    </span>
                  )}
                  {entry.isQAB && (
                    <span className="text-[6px] text-[#34d399] bg-[#064e3b]/60 px-0.5 rounded flex-shrink-0">
                      Q
                    </span>
                  )}
                </div>

                {/* Row 2: Enrichment badges + fielding sequence (compact) */}
                <div className="flex items-center gap-1 ml-[19px] flex-wrap">
                  {entry.fieldingSequence && (
                    <span className="text-[7px] text-[#88AA88] font-mono">
                      {entry.fieldingSequence}
                    </span>
                  )}
                  {/* Ticket 5.2: K/Kc toggle — inline click to toggle */}
                  {(entry.result === 'K' || entry.result === 'Kc') && !entry.hasKType && onKToggle && (
                    <span
                      className="text-[6px] text-[#f59e0b] bg-[#78350f]/60 px-0.5 rounded cursor-pointer hover:bg-[#78350f] active:scale-95"
                      onClick={(e) => { e.stopPropagation(); onKToggle(entry); }}
                      title="Toggle K (swinging) / Kc (called)"
                    >
                      K?
                    </span>
                  )}
                  {/* Unenriched badges — gray, disappear when filled */}
                  {entry.isEnrichable && !entry.hasFieldingData && !entry.fieldingSequence && (
                    <span className="text-[6px] text-[#6b7280] bg-[#1f2937]/60 px-0.5 rounded">
                      +fld
                    </span>
                  )}
                  {entry.isEnrichable && !entry.hasLocationData && (
                    <span className="text-[6px] text-[#6b7280] bg-[#1f2937]/60 px-0.5 rounded">
                      +loc
                    </span>
                  )}
                  {entry.isEnrichable && !entry.hasPitchType && (
                    <span className="text-[6px] text-[#6b7280] bg-[#1f2937]/60 px-0.5 rounded">
                      +pit
                    </span>
                  )}
                  {entry.isEnrichable && !entry.hasPitchCount && (
                    <span className="text-[6px] text-[#6b7280] bg-[#1f2937]/60 px-0.5 rounded">
                      +#
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PlayLogPanel;
