/**
 * BatterReachedPopup - Shows options when batter is dragged to a base
 *
 * Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
 * This REPLACES the current flow where batter drag goes directly to HitTypeContent.
 *
 * Flow: Batter drag to base → BatterReachedPopup → (conditional) → HitTypeContent
 *
 * Options for 1B:
 *   BB, IBB, HBP, 1B, E, FC, D3K
 *
 * Options for 2B:
 *   2B, E
 *
 * Options for 3B:
 *   3B, E
 */

import { useMemo } from 'react';
import { SidePanel } from './SidePanel';

export type BatterReachedOption = 'BB' | 'IBB' | 'HBP' | '1B' | '2B' | '3B' | 'E' | 'FC' | 'D3K';

interface BatterReachedPopupProps {
  targetBase: '1B' | '2B' | '3B';
  gameState: {
    outs: number;
    runners: { first: boolean; second: boolean; third: boolean };
  };
  onSelect: (option: BatterReachedOption) => void;
  onCancel: () => void;
}

/**
 * Check if Dropped Third Strike is legal in current game state.
 * D3K is legal when: first base is empty OR there are 2 outs.
 */
export function isD3KLegal(gameState: {
  outs: number;
  runners: { first: boolean };
}): boolean {
  const firstBaseOccupied = gameState.runners.first;
  const twoOuts = gameState.outs === 2;
  return !firstBaseOccupied || twoOuts;
}

interface OptionConfig {
  id: BatterReachedOption;
  label: string;
  color: string;
  textColor: string;
}

export function BatterReachedPopup({
  targetBase,
  gameState,
  onSelect,
  onCancel,
}: BatterReachedPopupProps) {
  const d3kLegal = isD3KLegal(gameState);
  const hasRunners = gameState.runners.first || gameState.runners.second || gameState.runners.third;

  // Build options based on target base
  const options: OptionConfig[] = useMemo(() => {
    if (targetBase === '1B') {
      const opts: OptionConfig[] = [
        { id: 'BB', label: 'BB', color: '#5599FF', textColor: 'white' },
        { id: 'IBB', label: 'IBB', color: '#5599FF', textColor: 'white' },
        { id: 'HBP', label: 'HBP', color: '#9966FF', textColor: 'white' },
        { id: '1B', label: '1B', color: '#4CAF50', textColor: 'white' },
        { id: 'E', label: 'E', color: '#FF9800', textColor: 'black' },
      ];

      // FC only available if there are runners
      if (hasRunners) {
        opts.push({ id: 'FC', label: 'FC', color: '#FF5722', textColor: 'white' });
      }

      // D3K only if legal
      if (d3kLegal) {
        opts.push({ id: 'D3K', label: 'D3K', color: '#DD0000', textColor: 'white' });
      }

      return opts;
    }

    if (targetBase === '2B') {
      return [
        { id: '2B', label: '2B', color: '#2196F3', textColor: 'white' },
        { id: 'E', label: 'E', color: '#FF9800', textColor: 'black' },
      ];
    }

    if (targetBase === '3B') {
      return [
        { id: '3B', label: '3B', color: '#9C27B0', textColor: 'white' },
        { id: 'E', label: 'E', color: '#FF9800', textColor: 'black' },
      ];
    }

    return [];
  }, [targetBase, hasRunners, d3kLegal]);

  return (
    <SidePanel
      side="left"
      isOpen={true}
      onClose={onCancel}
      title="HOW DID BATTER REACH?"
    >
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="w-full py-3 px-4 border-2 border-white text-sm font-bold
                       hover:scale-[1.02] active:scale-[0.98] transition-transform
                       shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            style={{
              backgroundColor: opt.color,
              color: opt.textColor,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* D3K rule explanation when not legal */}
      {targetBase === '1B' && !d3kLegal && (
        <div className="mt-4 text-[10px] text-[#888] italic">
          D3K unavailable: 1B occupied with less than 2 outs
        </div>
      )}

      {/* FC explanation when no runners */}
      {targetBase === '1B' && !hasRunners && (
        <div className="mt-2 text-[10px] text-[#888] italic">
          FC unavailable: no runners on base
        </div>
      )}
    </SidePanel>
  );
}

export default BatterReachedPopup;
