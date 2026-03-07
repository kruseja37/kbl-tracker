import React, { useState, useRef, useEffect } from 'react';

interface QuickBarProps {
  onOutcome?: (result: string) => void;
  disabled?: boolean;
}

/** Quick Bar button config per §3.1 — primary row of outcome buttons */
const PRIMARY_BUTTONS = ['K', 'GO', 'FO', 'LO', '1B', 'BB', '2B', 'HR'] as const;

/** Secondary outcomes shown in the overflow menu */
const OVERFLOW_BUTTONS = [
  'PO', '3B', 'HBP', 'E', 'FC', 'DP', 'TP',
  'SAC', 'SF', 'IBB', 'WP_K', 'PB_K', 'D3K', 'GRD',
] as const;

/** Color mapping for button types — SNES retro aesthetic */
const BUTTON_COLORS: Record<string, { bg: string; border: string }> = {
  // Outs — red family
  K:    { bg: '#8B0000', border: '#FF4444' },
  GO:   { bg: '#8B0000', border: '#FF4444' },
  FO:   { bg: '#8B0000', border: '#FF4444' },
  LO:   { bg: '#8B0000', border: '#FF4444' },
  PO:   { bg: '#8B0000', border: '#FF4444' },
  DP:   { bg: '#8B0000', border: '#FF4444' },
  TP:   { bg: '#8B0000', border: '#FF4444' },
  SAC:  { bg: '#8B0000', border: '#FF4444' },
  SF:   { bg: '#8B0000', border: '#FF4444' },
  FC:   { bg: '#8B0000', border: '#FF4444' },
  // On-base — blue family
  '1B': { bg: '#1a5276', border: '#5dade2' },
  '2B': { bg: '#1a5276', border: '#5dade2' },
  '3B': { bg: '#1a5276', border: '#5dade2' },
  BB:   { bg: '#1a5276', border: '#5dade2' },
  HBP:  { bg: '#1a5276', border: '#5dade2' },
  IBB:  { bg: '#1a5276', border: '#5dade2' },
  // Special — purple
  HR:   { bg: '#6c3483', border: '#af7ac5' },
  // Hybrid / misc — amber
  E:      { bg: '#7d6608', border: '#f4d03f' },
  D3K:    { bg: '#7d6608', border: '#f4d03f' },
  WP_K:   { bg: '#7d6608', border: '#f4d03f' },
  PB_K:   { bg: '#7d6608', border: '#f4d03f' },
  GRD:  { bg: '#1a5276', border: '#5dade2' }, // Ground Rule Double — blue like other hits
  // Overflow trigger
  '···': { bg: '#333333', border: '#888888' },
};

/**
 * Quick Bar — Bottom-left zone of the 5-zone GameTracker layout (§3.7).
 * Primary 1-tap outcome input wired to handleQuickBarOutcome via onOutcome.
 * The [···] button opens a popover with secondary outcomes (§3.2 overflow).
 */
export function QuickBar({ onOutcome, disabled }: QuickBarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow when clicking outside
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  const renderButton = (btn: string, extraClass?: string) => {
    const colors = BUTTON_COLORS[btn] || BUTTON_COLORS['···'];
    return (
      <button
        key={btn}
        disabled={disabled}
        onClick={() => {
          onOutcome?.(btn);
          setOverflowOpen(false);
        }}
        className={`py-2.5 text-white text-xs font-bold tracking-wide
                   border-[3px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                   active:scale-95 active:shadow-none transition-transform
                   disabled:opacity-40 disabled:cursor-not-allowed
                   ${extraClass || 'flex-1 min-w-[40px]'}`}
        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      >
        {btn}
      </button>
    );
  };

  return (
    <div className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240] p-2 h-full flex flex-col justify-center relative">
      {/* Primary row */}
      <div className="flex gap-1 flex-wrap">
        {PRIMARY_BUTTONS.map((btn) => renderButton(btn))}

        {/* Overflow trigger */}
        <button
          disabled={disabled}
          onClick={() => setOverflowOpen((v) => !v)}
          className={`flex-1 min-w-[40px] py-2.5 text-white text-xs font-bold tracking-wide
                     border-[3px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                     active:scale-95 active:shadow-none transition-transform
                     disabled:opacity-40 disabled:cursor-not-allowed
                     ${overflowOpen ? 'ring-2 ring-white' : ''}`}
          style={{ backgroundColor: '#333333', borderColor: '#888888' }}
        >
          ···
        </button>
      </div>

      {/* Overflow popover — anchored above the Quick Bar */}
      {overflowOpen && (
        <div
          ref={overflowRef}
          className="absolute bottom-full left-0 right-0 mb-1 bg-[#1a2a1d] border-[3px] border-[#3d5240]
                     p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] z-30"
        >
          <div className="text-[8px] text-[#88AA88] font-bold tracking-wider mb-1.5">MORE OUTCOMES</div>
          <div className="grid grid-cols-5 gap-1">
            {OVERFLOW_BUTTONS.map((btn) => renderButton(btn, 'px-1.5 py-2 text-[10px]'))}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickBar;
