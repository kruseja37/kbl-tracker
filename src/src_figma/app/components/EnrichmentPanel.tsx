import React, { useState, useCallback } from 'react';
import type { PlayLogEntry } from './PlayLogPanel';
import type { AtBatEvent } from '../../../utils/eventLog';

// ──────────────────────────────────────────────────────────────
// Pitch Type Constants (§4.3)
// ──────────────────────────────────────────────────────────────

export const PITCH_TYPES = [
  { abbr: '4F', label: 'Four-seam' },
  { abbr: '2F', label: 'Two-seam' },
  { abbr: 'CB', label: 'Curveball' },
  { abbr: 'SL', label: 'Slider' },
  { abbr: 'CH', label: 'Changeup' },
  { abbr: 'FK', label: 'Forkball' },
  { abbr: 'CF', label: 'Cutter' },
  { abbr: 'SB', label: 'Screwball' },
  { abbr: 'UNK', label: 'Unknown' },
] as const;

export type PitchTypeAbbr = typeof PITCH_TYPES[number]['abbr'];

// ──────────────────────────────────────────────────────────────
// Enrichment data that can be saved
// ──────────────────────────────────────────────────────────────

export interface EnrichmentUpdate {
  fieldLocation?: { x: number; y: number };
  fieldingSequence?: number[];
  hrDistance?: number;
  pitchType?: string;
  pitchesInAtBat?: number;
}

// ──────────────────────────────────────────────────────────────
// Mini Diamond SVG for field location (simple tap-to-place)
// ──────────────────────────────────────────────────────────────

function MiniDiamond({
  location,
  onTap,
}: {
  location?: { x: number; y: number } | null;
  onTap: (pos: { x: number; y: number }) => void;
}) {
  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onTap({ x, y });
  }, [onTap]);

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-[80px] cursor-crosshair bg-[#2a5a2d]/60 rounded border border-[#4a6a4a]"
      onClick={handleClick}
    >
      {/* Outfield arc */}
      <path d="M 10 55 Q 50 5, 90 55" fill="none" stroke="#4a6a4a" strokeWidth="1" />
      {/* Infield diamond */}
      <polygon points="50,85 25,60 50,35 75,60" fill="none" stroke="#88AA88" strokeWidth="1" />
      {/* Base positions */}
      <rect x="48" y="83" width="4" height="4" fill="#E8E8D8" /> {/* Home */}
      <rect x="23" y="58" width="4" height="4" fill="#E8E8D8" /> {/* 3B */}
      <rect x="48" y="33" width="4" height="4" fill="#E8E8D8" /> {/* 2B */}
      <rect x="73" y="58" width="4" height="4" fill="#E8E8D8" /> {/* 1B */}
      {/* Placed dot */}
      {location && (
        <circle cx={location.x} cy={location.y} r="3" fill="#f59e0b" stroke="#fff" strokeWidth="0.5" />
      )}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────
// Fielding Sequence Input
// ──────────────────────────────────────────────────────────────

const FIELDER_POSITIONS = [
  { num: 1, label: 'P' },
  { num: 2, label: 'C' },
  { num: 3, label: '1B' },
  { num: 4, label: '2B' },
  { num: 5, label: '3B' },
  { num: 6, label: 'SS' },
  { num: 7, label: 'LF' },
  { num: 8, label: 'CF' },
  { num: 9, label: 'RF' },
];

function FieldingSequenceInput({
  sequence,
  onChange,
}: {
  sequence: number[];
  onChange: (seq: number[]) => void;
}) {
  return (
    <div>
      <div className="flex gap-0.5 flex-wrap mb-1">
        {FIELDER_POSITIONS.map((f) => (
          <button
            key={f.num}
            className={`text-[7px] px-1 py-0.5 rounded border
              ${sequence.includes(f.num)
                ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
            onClick={() => onChange([...sequence, f.num])}
          >
            {f.num}
          </button>
        ))}
      </div>
      {sequence.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-[#88AA88] font-mono">
            {sequence.join('-')}
          </span>
          <button
            className="text-[7px] text-[#f87171] hover:text-[#ef4444]"
            onClick={() => onChange(sequence.slice(0, -1))}
          >
            undo
          </button>
          <button
            className="text-[7px] text-[#f87171] hover:text-[#ef4444]"
            onClick={() => onChange([])}
          >
            clear
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// EnrichmentPanel Component (§4.2 — opens on Play Log entry tap)
// ──────────────────────────────────────────────────────────────

interface EnrichmentPanelProps {
  entry: PlayLogEntry;
  currentEnrichment?: AtBatEvent['enrichment'];
  onUpdate: (field: keyof EnrichmentUpdate, value: unknown) => void;
  onClose: () => void;
}

export function EnrichmentPanel({ entry, currentEnrichment, onUpdate, onClose }: EnrichmentPanelProps) {
  const [localFieldingSeq, setLocalFieldingSeq] = useState<number[]>(
    currentEnrichment?.fieldingSequence || []
  );

  const isHit = ['1B', '2B', '3B', 'GRD'].includes(entry.result);
  const isHR = entry.result === 'HR';
  const isOut = ['GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'FC', 'SF', 'SAC'].includes(entry.result);
  const isK = entry.result === 'K' || entry.result === 'Kc';
  const showFieldLocation = isHit || isOut || isHR;
  const showFieldingSeq = isHit || isOut;

  const handleFieldingSeqChange = useCallback((seq: number[]) => {
    setLocalFieldingSeq(seq);
    if (seq.length > 0) {
      onUpdate('fieldingSequence', seq);
    }
  }, [onUpdate]);

  return (
    <div className="bg-[#2a3a2d] border-l-2 border-[#C4A853] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#1a2a1d] border-b border-[#4a6a4a]">
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-[#88AA88] font-mono">{entry.inningLabel}</span>
          <span className="text-[9px] text-[#E8E8D8] font-bold">{entry.batterName}</span>
          <span className="text-[9px] font-bold" style={{ color: getResultColorLocal(entry.result) }}>
            {entry.result}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[8px] text-[#E8E8D8] bg-[#3d5240] border border-[#4a6a4a] px-1.5 py-0.5 rounded hover:bg-[#4a6a4a]"
        >
          Done
        </button>
      </div>

      {/* Scrollable enrichment fields */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">

        {/* Field Location (spray chart) */}
        {showFieldLocation && (
          <EnrichmentSection label="Field Location" filled={!!currentEnrichment?.fieldLocation}>
            <MiniDiamond
              location={currentEnrichment?.fieldLocation}
              onTap={(pos) => onUpdate('fieldLocation', pos)}
            />
          </EnrichmentSection>
        )}

        {/* Fielding Sequence */}
        {showFieldingSeq && (
          <EnrichmentSection label="Fielding Sequence" filled={(currentEnrichment?.fieldingSequence?.length ?? 0) > 0}>
            <FieldingSequenceInput
              sequence={localFieldingSeq}
              onChange={handleFieldingSeqChange}
            />
          </EnrichmentSection>
        )}

        {/* HR Distance */}
        {isHR && (
          <EnrichmentSection label="HR Distance (ft)" filled={!!currentEnrichment?.hrDistance}>
            <input
              type="number"
              min={200}
              max={600}
              defaultValue={currentEnrichment?.hrDistance || ''}
              placeholder="350"
              className="w-full bg-[#1f2937] border border-[#4a6a4a] text-[#E8E8D8] text-[10px] px-1.5 py-1 rounded"
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 200 && val <= 600) onUpdate('hrDistance', val);
              }}
            />
          </EnrichmentSection>
        )}

        {/* Pitch Type (§4.3) — for all enrichable plays */}
        <EnrichmentSection label="Pitch Type" filled={!!currentEnrichment?.pitchType}>
          <div className="flex flex-wrap gap-0.5">
            {PITCH_TYPES.map((pt) => (
              <button
                key={pt.abbr}
                className={`text-[7px] px-1 py-0.5 rounded border transition-colors
                  ${currentEnrichment?.pitchType === pt.abbr
                    ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                    : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => onUpdate('pitchType', pt.abbr)}
                title={pt.label}
              >
                {pt.abbr}
              </button>
            ))}
          </div>
        </EnrichmentSection>

        {/* Pitches in At-Bat */}
        <EnrichmentSection label="Pitches in AB" filled={!!currentEnrichment?.pitchesInAtBat}>
          <input
            type="number"
            min={1}
            max={20}
            defaultValue={currentEnrichment?.pitchesInAtBat || ''}
            placeholder="1-20"
            className="w-full bg-[#1f2937] border border-[#4a6a4a] text-[#E8E8D8] text-[10px] px-1.5 py-1 rounded"
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= 1 && val <= 20) onUpdate('pitchesInAtBat', val);
            }}
          />
          {(currentEnrichment?.pitchesInAtBat ?? 0) >= 7 && (
            <div className="text-[7px] text-[#34d399] mt-0.5">Quality At-Bat (7+ pitches)</div>
          )}
        </EnrichmentSection>

        {/* K/Kc distinction (shown only for strikeouts without type set) */}
        {isK && (
          <EnrichmentSection label="Strikeout Type" filled={entry.hasKType}>
            <div className="flex gap-1">
              <button
                className={`text-[8px] px-2 py-1 rounded border flex-1
                  ${entry.result === 'K'
                    ? 'bg-[#f87171]/20 border-[#f87171] text-[#f87171]'
                    : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => {/* K toggle handled by parent */}}
              >
                K (Swinging)
              </button>
              <button
                className={`text-[8px] px-2 py-1 rounded border flex-1
                  ${entry.result === 'Kc'
                    ? 'bg-[#f87171]/20 border-[#f87171] text-[#f87171]'
                    : 'bg-[#1f2937]/60 border-[#4a6a4a] text-[#88AA88] hover:bg-[#4a6a4a]/40'}`}
                onClick={() => {/* K toggle handled by parent */}}
              >
                Kc (Called)
              </button>
            </div>
          </EnrichmentSection>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Enrichment Section wrapper
// ──────────────────────────────────────────────────────────────

function EnrichmentSection({
  label,
  filled,
  children,
}: {
  label: string;
  filled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[8px] text-[#88AA88] font-bold uppercase tracking-wider">{label}</span>
        {filled && (
          <span className="text-[6px] text-[#34d399]">&#10003;</span>
        )}
      </div>
      {children}
    </div>
  );
}

// Local result color (avoid importing circular)
function getResultColorLocal(result: string): string {
  const colors: Record<string, string> = {
    '1B': '#60a5fa', '2B': '#60a5fa', '3B': '#60a5fa', 'GRD': '#60a5fa',
    'HR': '#c084fc',
    'BB': '#4ade80', 'IBB': '#4ade80', 'HBP': '#4ade80',
    'K': '#f87171', 'Kc': '#f87171', 'GO': '#f87171', 'FO': '#f87171',
    'LO': '#f87171', 'PO': '#f87171', 'DP': '#f87171', 'TP': '#f87171',
    'SF': '#f87171', 'SAC': '#f87171', 'FC': '#f87171',
    'E': '#fbbf24',
  };
  return colors[result] || '#E8E8D8';
}

export default EnrichmentPanel;
