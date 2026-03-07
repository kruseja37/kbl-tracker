import React from 'react';

interface QuickBarProps {
  onOutcome?: (result: string) => void;
  disabled?: boolean;
}

/** Quick Bar button config per §3.1 — primary row of outcome buttons */
const PRIMARY_BUTTONS = ['K', 'GO', 'FO', 'LO', '1B', 'BB', '2B', 'HR'] as const;

/** Color mapping for button types — SNES retro aesthetic */
const BUTTON_COLORS: Record<string, { bg: string; border: string; activeBg: string }> = {
  K:   { bg: '#8B0000', border: '#FF4444', activeBg: '#AA2222' },
  GO:  { bg: '#8B0000', border: '#FF4444', activeBg: '#AA2222' },
  FO:  { bg: '#8B0000', border: '#FF4444', activeBg: '#AA2222' },
  LO:  { bg: '#8B0000', border: '#FF4444', activeBg: '#AA2222' },
  '1B': { bg: '#1a5276', border: '#5dade2', activeBg: '#2471a3' },
  BB:  { bg: '#1a5276', border: '#5dade2', activeBg: '#2471a3' },
  '2B': { bg: '#1a5276', border: '#5dade2', activeBg: '#2471a3' },
  HR:  { bg: '#6c3483', border: '#af7ac5', activeBg: '#884ea0' },
  '···': { bg: '#333333', border: '#888888', activeBg: '#555555' },
};

/**
 * Quick Bar — Bottom-left zone of the 5-zone GameTracker layout (§3.7).
 * Primary 1-tap outcome input. NOT wired to game logic yet — buttons are visual shells.
 * Future sessions will wire onOutcome to useGameState handlers.
 */
export function QuickBar({ onOutcome, disabled }: QuickBarProps) {
  return (
    <div className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240] p-2 h-full flex flex-col justify-center">
      <div className="flex gap-1 flex-wrap">
        {[...PRIMARY_BUTTONS, '···' as const].map((btn) => {
          const colors = BUTTON_COLORS[btn] || BUTTON_COLORS['···'];
          return (
            <button
              key={btn}
              disabled={disabled}
              onClick={() => onOutcome?.(btn)}
              className="flex-1 min-w-[40px] py-2.5 text-white text-xs font-bold tracking-wide
                         border-[3px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]
                         active:scale-95 active:shadow-none transition-transform
                         disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.border,
              }}
            >
              {btn}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickBar;
