import React, { useState, useRef, useEffect } from 'react';
import type { GamePhase } from '@/hooks/useGameState';

interface GameSituationForQuickBar {
  outs: number;
  bases: { first: boolean; second: boolean; third: boolean };
}

interface QuickBarProps {
  onOutcome?: (result: string) => void;
  disabled?: boolean;
  /** Game situation for context-sensitive button disabling per §6.8 */
  gameSituation?: GameSituationForQuickBar;
  /** §4.6: Three-phase Quick Bar lifecycle */
  gamePhase: GamePhase;
  /** §10.1: Callback to transition PRE_GAME → LIVE */
  onStartGame: () => void;
  /** Callback for END GAME button in POST_FINAL_OUT phase */
  onEndGame?: () => void;
  /** §4.3: Outcome currently being processed — button stays depressed */
  processingOutcome?: string | null;
  /** §4.4: Undo step count */
  undoCount?: number;
  /** §4.4: Whether undo is available */
  canUndo?: boolean;
  /** §4.4: Undo callback */
  onUndo?: () => void;
}

/** Quick Bar button config per §4.1 — primary row of outcome buttons */
const PRIMARY_BUTTONS = ['K', 'Ꝁ', 'GO', 'FO', 'PO', 'BB', '1B', '2B', 'FC', 'HR'] as const;

/** Secondary outcomes shown in the overflow menu */
const OVERFLOW_BUTTONS = [
  'LO', 'FLO', 'SF', '3B', 'HBP', 'E', 'DP', 'TP',
  'SAC', 'IBB', 'WP_K', 'PB_K', 'GRD', 'ITPHR',
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
  'Ꝁ': { bg: '#8B0000', border: '#FF4444' },
  GO:   { bg: '#8B0000', border: '#FF4444' },
  FO:   { bg: '#8B0000', border: '#FF4444' },
  FLO:  { bg: '#8B0000', border: '#FF4444' },
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
  HR:    { bg: '#6c3483', border: '#af7ac5' },
  ITPHR: { bg: '#6c3483', border: '#af7ac5' },
  // Hybrid / misc — amber
  E:      { bg: '#7d6608', border: '#f4d03f' },
  WP_K:   { bg: '#7d6608', border: '#f4d03f' },
  PB_K:   { bg: '#7d6608', border: '#f4d03f' },
  GRD:  { bg: '#1a5276', border: '#5dade2' },
  // Overflow trigger
  '···': { bg: '#333333', border: '#888888' },
};

/**
 * Quick Bar — Full-width pinned bottom zone of the GameTracker layout.
 * Primary 1-tap outcome input wired to handleQuickBarOutcome via onOutcome.
 * Phase-aware: PRE_GAME shows START GAME, LIVE shows outcomes, POST_FINAL_OUT shows END GAME.
 * §4.4: Undo + End Game at far right with visual divider.
 * §4.3: Processing-aware button feedback.
 */
export function QuickBar({
  onOutcome, disabled, gameSituation,
  gamePhase, onStartGame, onEndGame,
  processingOutcome, undoCount = 0, canUndo = false, onUndo,
}: QuickBarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [startGamePending, setStartGamePending] = useState(false);

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
    const isProcessing = processingOutcome === btn;

    // §11.3: Ꝁ renders as mirrored K character
    const displayLabel = btn === 'Ꝁ' ? (
      <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>K</span>
    ) : btn;

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
                   ${isProcessing ? 'scale-95 shadow-none ring-2 ring-white/60' : ''}
                   ${extraClass || 'flex-1 min-w-[40px]'}`}
        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      >
        {displayLabel}
      </button>
    );
  };

  // §4.6 PRE_GAME phase: show START GAME button centered
  if (gamePhase === 'PRE_GAME') {
    return (
      <div className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240] p-2 flex items-center justify-center relative">
        {startGamePending ? (
          <div className="flex items-center gap-3">
            <span className="text-[#E8E8D8] text-sm font-bold tracking-wide">Lock lineups and begin recording?</span>
            <button
              onClick={() => {
                onStartGame();
                setStartGamePending(false);
              }}
              className="px-6 py-2.5 text-[#1E2C23] text-sm font-black tracking-[0.16em]
                         bg-[#34d399] border-[3px] border-[#10b981]
                         shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                         active:scale-95 active:shadow-none transition-transform"
            >
              YES
            </button>
            <button
              onClick={() => setStartGamePending(false)}
              className="px-6 py-2.5 text-[#E8E8D8] text-sm font-bold tracking-wide
                         bg-[#5C7156] border-[3px] border-[#48604A]
                         shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                         active:scale-95 active:shadow-none transition-transform"
            >
              NO
            </button>
          </div>
        ) : (
          <button
            onClick={() => setStartGamePending(true)}
            className="px-8 py-3 text-[#1E2C23] text-lg font-black tracking-[0.16em]
                       bg-[#E8E8D8] border-[3px] border-[#163326]
                       shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                       active:scale-95 active:shadow-none transition-transform
                       hover:bg-[#F0F0E0]"
          >
            START GAME
          </button>
        )}
      </div>
    );
  }

  // §4.6 POST_FINAL_OUT phase: show END GAME button centered
  if (gamePhase === 'POST_FINAL_OUT') {
    return (
      <div className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240] p-2 flex items-center justify-center relative">
        <button
          onClick={onEndGame}
          className="px-8 py-3 text-white text-lg font-black tracking-[0.16em]
                     bg-[#DD0000] border-[3px] border-white
                     shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                     active:scale-95 active:shadow-none transition-transform
                     hover:bg-[#FF0000]"
        >
          END GAME
        </button>
      </div>
    );
  }

  // §4.6 LIVE phase: full outcome buttons + overflow + utility buttons
  return (
    <div className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240] p-2 h-full flex flex-col justify-center relative">
      {/* Primary row + utility buttons */}
      <div className="flex gap-1 flex-wrap items-stretch">
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

        {/* §4.4: Visual divider between outcome and utility buttons */}
        <div className="w-[2px] bg-[#555] mx-1 self-stretch" />

        {/* §4.4: Undo button */}
        <button
          disabled={!canUndo}
          onClick={onUndo}
          className={`px-2 py-2.5 text-[10px] font-bold tracking-wide border-[3px]
                     shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                     active:scale-95 active:shadow-none transition-transform
                     ${canUndo
                       ? 'bg-[#3a3a3a] border-[#C4A853] text-[#C4A853] hover:bg-[#4a4a4a]'
                       : 'bg-[#333] border-[#555] text-[#666] cursor-not-allowed opacity-50'
                     }`}
          title={canUndo ? `Undo (${undoCount} available)` : 'Nothing to undo'}
        >
          ↩ {undoCount}
        </button>

        {/* §4.4: End Game button — smaller, muted to avoid accidental taps */}
        <button
          onClick={onEndGame}
          className="px-2 py-2.5 text-[10px] font-bold tracking-wide
                     bg-[#5a2020] border-[3px] border-[#8B0000] text-[#cc8888]
                     shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                     active:scale-95 active:shadow-none transition-transform
                     hover:bg-[#6a2828] hover:text-white"
          title="End Game"
        >
          END
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
