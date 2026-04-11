import React, { useState, useRef, useEffect } from 'react';
import type { GamePhase } from '@/hooks/useGameState';
import chalkBgFaintImg from '../../../assets/chalk-bg-faint.png';

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
const PRIMARY_BUTTONS = ['K', 'Ꝁ', 'GO', 'FC', 'PO', 'LO', 'FO', 'BB', '1B', '2B', 'HR'] as const;

/** Secondary outcomes shown in the overflow menu */
const OVERFLOW_BUTTONS = [
  'FLO', 'SF', '3B', 'HBP', 'E', 'DP', 'TP',
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

/** Color mapping — Chalk scoreboard theme with gravity-based shading.
 *  Greens darken with outcome gravity (GO darkest → FO lightest).
 *  Golds brighten with on-base value (BB muted → HR vivid).
 *  K/Ꝁ deep red. Errors amber. All text chalk white. */
const BUTTON_COLORS: Record<string, { bg: string; border: string }> = {
  // Strikeouts — deep red
  K:    { bg: '#4A1818', border: '#6B2222' },
  'Ꝁ': { bg: '#4A1818', border: '#6B2222' },
  // Outs — green gradient: darker = worse for batter
  GO:   { bg: '#152a1a', border: '#253a2a' },  // darkest — routine ground out
  FC:   { bg: '#1c3222', border: '#2c4232' },  // dark — out + runner advance
  PO:   { bg: '#243a2a', border: '#344a3a' },  // medium-dark
  LO:   { bg: '#2c4232', border: '#3c5a42' },  // medium
  FO:   { bg: '#344a3a', border: '#44624a' },  // lightest — can be productive
  // Overflow outs — same gravity logic
  DP:   { bg: '#102218', border: '#203228' },  // devastating
  TP:   { bg: '#0c1c14', border: '#1c2c24' },  // most devastating
  FLO:  { bg: '#2c4232', border: '#3c5a42' },  // like LO
  SF:   { bg: '#344a3a', border: '#44624a' },  // productive out
  SAC:  { bg: '#344a3a', border: '#44624a' },  // productive out
  // On-base — warm gold gradient: brighter = better for batter
  BB:   { bg: '#2e2a18', border: '#4a4228' },  // muted — free base
  '1B': { bg: '#38301a', border: '#55481e' },  // warm
  '2B': { bg: '#44381c', border: '#604e1e' },  // bright
  '3B': { bg: '#4a3a1c', border: '#6a5420' },  // vivid
  HBP:  { bg: '#2e2a18', border: '#4a4228' },  // like BB
  IBB:  { bg: '#2e2a18', border: '#4a4228' },  // like BB
  GRD:  { bg: '#44381c', border: '#604e1e' },  // like 2B
  // HR — brightest gold
  HR:    { bg: '#524018', border: '#6a5420' },
  ITPHR: { bg: '#524018', border: '#6a5420' },
  // Errors / misc — amber
  E:      { bg: '#4a3510', border: '#7a5818' },
  WP_K:   { bg: '#4A1818', border: '#6B2222' },  // strikeout variant — red
  PB_K:   { bg: '#4A1818', border: '#6B2222' },  // strikeout variant — red
  // Overflow trigger
  '···': { bg: '#1a2a1d', border: '#3d5240' },
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
        className={`py-2.5 text-white text-[14px] font-bold tracking-wide
                   border-[3px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                   active:scale-95 active:shadow-none transition-transform
                   disabled:opacity-40 disabled:cursor-not-allowed
                   ${isProcessing ? 'scale-95 shadow-none ring-2 ring-white/60' : ''}
                   ${extraClass || 'flex-1 min-w-[40px]'}`}
        style={{ backgroundColor: colors.bg, borderColor: colors.border, backgroundImage: `url(${chalkBgFaintImg})`, backgroundRepeat: 'repeat' }}
      >
        {displayLabel}
      </button>
    );
  };

  // §4.6 PRE_GAME phase: show START GAME button centered
  if (gamePhase === 'PRE_GAME') {
    return (
      <div className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240] p-2 flex items-center justify-center relative" style={{ fontFamily: "'Moms Typewriter', monospace", fontWeight: 700 }}>
        {startGamePending ? (
          <div className="flex items-center gap-3">
            <span className="text-[#E8E8D8] text-[16px] font-bold tracking-wide">Lock lineups and begin recording?</span>
            <button
              onClick={() => {
                onStartGame();
                setStartGamePending(false);
              }}
              className="px-6 py-2.5 text-[#1E2C23] text-[16px] font-black tracking-[0.16em]
                         bg-[#34d399] border-[3px] border-[#10b981]
                         shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                         active:scale-95 active:shadow-none transition-transform"
            >
              YES
            </button>
            <button
              onClick={() => setStartGamePending(false)}
              className="px-6 py-2.5 text-[#E8E8D8] text-[16px] font-bold tracking-wide
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
            className="px-8 py-3 text-[#1E2C23] text-[20px] font-black tracking-[0.16em]
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
      <div className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240] p-2 flex items-center justify-center relative" style={{ fontFamily: "'Moms Typewriter', monospace", fontWeight: 700 }}>
        <button
          onClick={onEndGame}
          className="px-8 py-3 text-white text-[20px] font-black tracking-[0.16em]
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
    <div className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240] p-2 h-full flex flex-col justify-center relative" style={{ fontFamily: "'Moms Typewriter', monospace", fontWeight: 700 }}>
      {/* Primary row + utility buttons */}
      <div className="flex gap-1 flex-wrap items-stretch">
        {PRIMARY_BUTTONS.map((btn) => renderButton(btn))}

        {/* Overflow trigger */}
        <button
          disabled={disabled}
          onClick={() => setOverflowOpen((v) => !v)}
          className={`flex-1 min-w-[40px] py-2.5 text-white text-[14px] font-bold tracking-wide
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
          className={`px-2 py-2.5 text-[12px] font-bold tracking-wide border-[3px]
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
          className="px-2 py-2.5 text-[12px] font-bold tracking-wide
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
          <div className="text-[10px] text-[#88AA88] font-bold tracking-wider mb-1.5">MORE OUTCOMES</div>
          <div className="grid grid-cols-5 gap-1">
            {OVERFLOW_BUTTONS.map((btn) => renderButton(btn, 'px-1.5 py-2 text-[12px]'))}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickBar;
