import React, { useState, useRef, useEffect } from 'react';

interface GameSituationForQuickBar {
  outs: number;
  bases: { first: boolean; second: boolean; third: boolean };
}

interface QuickBarProps {
  onOutcome?: (result: string) => void;
  disabled?: boolean;
  /** Game situation for context-sensitive button disabling per §6.8 */
  gameSituation?: GameSituationForQuickBar;
  /** D-17: Manager Moment indicator — pulsing border when active */
  managerMomentActive?: boolean;
  /** D-17: Callback when lightning indicator is tapped */
  onManagerMomentTap?: () => void;
}

/** Quick Bar button config per §3.1 — primary row of outcome buttons */
const PRIMARY_BUTTONS = ['K', 'GO', 'FO', 'LO', '1B', 'BB', '2B', 'HR'] as const;

/** Secondary outcomes shown in the overflow menu (D3K removed per D-13: redundant with WP_K/PB_K) */
const OVERFLOW_BUTTONS = [
  'PO', '3B', 'HBP', 'E', 'FC', 'DP', 'TP',
  'SAC', 'SF', 'IBB', 'WP_K', 'PB_K', 'GRD',
] as const;

/** §6.8 Button availability rules — returns true if button should be disabled */
function isContextDisabled(btn: string, situation?: GameSituationForQuickBar): boolean {
  if (!situation) return false;
  const { outs, bases } = situation;
  const runnerCount = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0);
  switch (btn) {
    case 'SAC': return outs >= 2;
    case 'SF':  return outs >= 2 || !bases.third;
    case 'DP':  return outs >= 2 || runnerCount === 0;
    case 'TP':  return runnerCount < 2;
    default:    return false;
  }
}

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
export function QuickBar({ onOutcome, disabled, gameSituation, managerMomentActive, onManagerMomentTap }: QuickBarProps) {
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
    const contextOff = isContextDisabled(btn, gameSituation);
    return (
      <button
        key={btn}
        disabled={disabled || contextOff}
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
    <div className={`bg-[#2a3a2d] border-t-[3px] p-2 h-full flex flex-col justify-center relative ${
      managerMomentActive
        ? 'border-[#FFD700] animate-pulse shadow-[inset_0_0_12px_rgba(255,215,0,0.3)]'
        : 'border-[#3d5240]'
    }`}>
      {/* D-17: Manager Moment lightning indicator */}
      {managerMomentActive && (
        <button
          onClick={onManagerMomentTap}
          className="absolute -top-3 right-2 z-40 bg-[#FFD700] text-[#1a1a1a] text-[10px] font-bold px-1.5 py-0.5 rounded-sm border-2 border-[#B8960A] hover:bg-[#E8C400] active:scale-95 transition-transform animate-bounce"
          title="Manager Moment — tap to decide"
        >
          &#9889; MM
        </button>
      )}
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
