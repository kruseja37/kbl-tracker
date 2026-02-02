/**
 * RunnerOutcomesDisplay - Shows calculated runner outcomes in RUNNER_OUTCOMES phase
 *
 * Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
 * After a play is classified, we show pre-calculated defaults for where
 * runners end up. The user can adjust these before tapping "End At-Bat".
 *
 * This component displays:
 * - Batter outcome (where they end up)
 * - Each runner's outcome (where they end up)
 * - Allow quick adjustments via tap
 */

import { useState, useCallback } from 'react';
import type { RunnerDefaults, RunnerOutcome, BaseId } from './runnerDefaults';

// ============================================
// TYPES
// ============================================

interface RunnerOutcomesDisplayProps {
  outcomes: RunnerDefaults;
  onOutcomeChange: (updated: RunnerDefaults) => void;
  playType: string;
}

interface OutcomeRowProps {
  label: string;
  outcome: RunnerOutcome;
  onToggle: () => void;
  possibleDestinations: BaseId[];
}

// ============================================
// CONSTANTS
// ============================================

const BASE_LABELS: Record<BaseId, string> = {
  first: '1B',
  second: '2B',
  third: '3B',
  home: 'HOME',
  out: 'OUT',
};

const BASE_COLORS: Record<BaseId, string> = {
  first: '#4CAF50',
  second: '#2196F3',
  third: '#FF9800',
  home: '#9C27B0',
  out: '#DD0000',
};

const BASE_EMOJI: Record<BaseId, string> = {
  first: '1️⃣',
  second: '2️⃣',
  third: '3️⃣',
  home: '🏠',
  out: '❌',
};

// ============================================
// OUTCOME ROW COMPONENT
// ============================================

function OutcomeRow({ label, outcome, onToggle, possibleDestinations }: OutcomeRowProps) {
  const destination = outcome.to;
  const bgColor = BASE_COLORS[destination];
  const isAdjustable = outcome.isDefault && possibleDestinations.length > 1;

  return (
    <div className="flex items-center justify-between py-2 border-b border-[#444] last:border-b-0">
      {/* Runner label */}
      <div className="flex items-center gap-2">
        <span className="text-white font-bold text-sm">{label}</span>
        {outcome.reason && (
          <span className="text-[#888] text-xs">({outcome.reason})</span>
        )}
      </div>

      {/* Outcome button - tappable to cycle through destinations */}
      <button
        onClick={isAdjustable ? onToggle : undefined}
        disabled={!isAdjustable}
        className={`flex items-center gap-1 px-3 py-1 rounded
                   font-bold text-white text-sm
                   border-2 border-white
                   transition-all
                   ${isAdjustable ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'opacity-80 cursor-default'}
                   shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]`}
        style={{ backgroundColor: bgColor }}
      >
        <span>{BASE_EMOJI[destination]}</span>
        <span>{BASE_LABELS[destination]}</span>
        {isAdjustable && <span className="text-xs ml-1">▼</span>}
      </button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function RunnerOutcomesDisplay({
  outcomes,
  onOutcomeChange,
  playType,
}: RunnerOutcomesDisplayProps) {
  // Get possible destinations for each runner
  const getBatterDestinations = (): BaseId[] => {
    // Batter can go to any base or be out
    return ['out', 'first', 'second', 'third', 'home'];
  };

  const getRunnerDestinations = (from: 'first' | 'second' | 'third'): BaseId[] => {
    // Runners can stay, advance forward, or be out
    const baseOrder: BaseId[] = ['first', 'second', 'third', 'home'];
    const fromIndex = baseOrder.indexOf(from);
    // Can stay at current base, advance to any forward base, or be out
    return ['out', ...baseOrder.slice(fromIndex)];
  };

  // Cycle through destinations
  const cycleDestination = useCallback(
    (key: 'batter' | 'first' | 'second' | 'third') => {
      const outcome = key === 'batter' ? outcomes.batter : outcomes[key];
      if (!outcome) return;

      const destinations = key === 'batter'
        ? getBatterDestinations()
        : getRunnerDestinations(key as 'first' | 'second' | 'third');

      const currentIndex = destinations.indexOf(outcome.to);
      const nextIndex = (currentIndex + 1) % destinations.length;
      const newDestination = destinations[nextIndex];

      const updatedOutcome: RunnerOutcome = {
        ...outcome,
        to: newDestination,
        isDefault: false, // User has adjusted this
        reason: newDestination === 'out' ? 'Out (adjusted)' : `To ${BASE_LABELS[newDestination]} (adjusted)`,
      };

      const updatedOutcomes: RunnerDefaults = {
        ...outcomes,
        [key]: updatedOutcome,
      };

      onOutcomeChange(updatedOutcomes);
    },
    [outcomes, onOutcomeChange]
  );

  // Count runs scored
  const runsScored = [
    outcomes.batter?.to === 'home' ? 1 : 0,
    outcomes.first?.to === 'home' ? 1 : 0,
    outcomes.second?.to === 'home' ? 1 : 0,
    outcomes.third?.to === 'home' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Count outs
  const outsOnPlay = [
    outcomes.batter?.to === 'out' ? 1 : 0,
    outcomes.first?.to === 'out' ? 1 : 0,
    outcomes.second?.to === 'out' ? 1 : 0,
    outcomes.third?.to === 'out' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="bg-[#333] border-2 border-[#C4A853] p-3 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#555]">
        <div className="text-[#C4A853] font-bold text-sm uppercase">
          Runner Outcomes
        </div>
        <div className="flex gap-2 text-xs">
          {runsScored > 0 && (
            <span className="bg-[#9C27B0] text-white px-2 py-0.5 rounded font-bold">
              {runsScored} RUN{runsScored > 1 ? 'S' : ''}
            </span>
          )}
          {outsOnPlay > 0 && (
            <span className="bg-[#DD0000] text-white px-2 py-0.5 rounded font-bold">
              {outsOnPlay} OUT{outsOnPlay > 1 ? 'S' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Play type indicator */}
      <div className="text-[#888] text-xs mb-2">
        Play: <span className="text-white">{playType}</span>
      </div>

      {/* Outcome rows */}
      <div className="space-y-0">
        {/* Batter outcome - always shown */}
        <OutcomeRow
          label="BATTER"
          outcome={outcomes.batter}
          onToggle={() => cycleDestination('batter')}
          possibleDestinations={getBatterDestinations()}
        />

        {/* Runner on first */}
        {outcomes.first && (
          <OutcomeRow
            label="R1 (1B)"
            outcome={outcomes.first}
            onToggle={() => cycleDestination('first')}
            possibleDestinations={getRunnerDestinations('first')}
          />
        )}

        {/* Runner on second */}
        {outcomes.second && (
          <OutcomeRow
            label="R2 (2B)"
            outcome={outcomes.second}
            onToggle={() => cycleDestination('second')}
            possibleDestinations={getRunnerDestinations('second')}
          />
        )}

        {/* Runner on third */}
        {outcomes.third && (
          <OutcomeRow
            label="R3 (3B)"
            outcome={outcomes.third}
            onToggle={() => cycleDestination('third')}
            possibleDestinations={getRunnerDestinations('third')}
          />
        )}
      </div>

      {/* Instructions */}
      <div className="mt-2 pt-2 border-t border-[#555] text-[10px] text-[#888]">
        Tap outcomes to adjust • Press END AT-BAT when correct
      </div>
    </div>
  );
}

export default RunnerOutcomesDisplay;
