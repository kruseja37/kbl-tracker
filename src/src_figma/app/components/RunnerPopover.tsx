/**
 * RunnerPopover — Contextual action menu for tapping a runner on the diamond.
 *
 * Per MODE_2_V1_FINAL §5.1:
 * Tap runner → popover: [Steal] [Pickoff] [Wild Pitch] [Passed Ball] [Advance] [Substitute]
 *
 * Tickets: 4.1 (GAP-GT-5-A), 4.2 (GAP-GT-5-B), 4.4 (GAP-GT-5-C)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type RunnerBase = 'first' | 'second' | 'third';

/** D-2: Pickoff outcome sub-options per §5.1 */
export type PickoffOutcome = 'safe' | 'out' | 'error';

export interface RunnerPopoverProps {
  /** Which base the runner is on */
  base: RunnerBase;
  /** Runner's display name */
  runnerName: string;
  /** Anchor position (CSS left/top in %) */
  anchorPosition: { left: string; top: string };
  /** Handler: stolen base attempt */
  onSteal: (base: RunnerBase) => void;
  /** Handler: advance runner. D-11: optional destination for non-standard advance. */
  onAdvance: (base: RunnerBase, destinationBase?: 'second' | 'third' | 'home') => void;
  /** Handler: advance runner because of a fielding/throwing/mental error. */
  onAdvanceOnError?: (base: RunnerBase, destinationBase?: 'second' | 'third' | 'home') => void;
  /** Handler: wild pitch — all runners advance. If destinationBase provided, non-standard advance. */
  onWildPitch: (base: RunnerBase, destinationBase?: 'second' | 'third' | 'home') => void;
  /** Handler: passed ball — same as WP but charged to catcher */
  onPassedBall: (base: RunnerBase, destinationBase?: 'second' | 'third' | 'home') => void;
  /** Handler: pickoff attempt. D-2: outcome = safe (attempt logged) | out | error (runner advances) */
  onPickoff: (base: RunnerBase, outcome: PickoffOutcome) => void;
  /** Handler: pinch runner substitution */
  onSubstitute: (base: RunnerBase) => void;
  /** Open player card for the active runner */
  onViewPlayerCard?: () => void;
  /** Close the popover */
  onClose: () => void;
}

type DestinationMode = 'wp' | 'pb' | 'advance' | 'advance_error' | null;

const BASE_LABELS: Record<RunnerBase, string> = {
  first: '1B',
  second: '2B',
  third: '3B',
};

/** Get the next base for standard advance */
function nextBase(base: RunnerBase): string {
  if (base === 'first') return '2B';
  if (base === 'second') return '3B';
  return 'Score';
}

/** Get possible destination bases for non-standard WP/PB advance (ticket 4.2) */
function getDestinations(base: RunnerBase): Array<{ value: 'second' | 'third' | 'home'; label: string }> {
  if (base === 'first') return [
    { value: 'second', label: '2B' },
    { value: 'third', label: '3B' },
    { value: 'home', label: 'Score' },
  ];
  if (base === 'second') return [
    { value: 'third', label: '3B' },
    { value: 'home', label: 'Score' },
  ];
  // third → can only score
  return [
    { value: 'home', label: 'Score' },
  ];
}

export function RunnerPopover({
  base,
  runnerName,
  anchorPosition,
  onSteal,
  onAdvance,
  onAdvanceOnError,
  onWildPitch,
  onPassedBall,
  onPickoff,
  onSubstitute,
  onViewPlayerCard,
  onClose,
}: RunnerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [destinationMode, setDestinationMode] = useState<DestinationMode>(null);
  const [pickoffSubMenu, setPickoffSubMenu] = useState(false);

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleWP = useCallback(() => {
    // If runner is on third, standard advance = score, no need for destination picker
    if (base === 'third') {
      onWildPitch(base);
    } else {
      setDestinationMode('wp');
    }
  }, [base, onWildPitch]);

  const handlePB = useCallback(() => {
    if (base === 'third') {
      onPassedBall(base);
    } else {
      setDestinationMode('pb');
    }
  }, [base, onPassedBall]);

  const handleDestination = useCallback((dest: 'second' | 'third' | 'home') => {
    if (destinationMode === 'wp') {
      onWildPitch(base, dest);
    } else if (destinationMode === 'pb') {
      onPassedBall(base, dest);
    } else if (destinationMode === 'advance') {
      onAdvance(base, dest);
    } else if (destinationMode === 'advance_error') {
      onAdvanceOnError?.(base, dest);
    }
  }, [destinationMode, base, onWildPitch, onPassedBall, onAdvance, onAdvanceOnError]);

  // D-11: Advance opens destination picker (unless runner on third → just score)
  const handleAdvance = useCallback(() => {
    if (base === 'third') {
      onAdvance(base);
    } else {
      setDestinationMode('advance');
    }
  }, [base, onAdvance]);

  const handleAdvanceOnError = useCallback(() => {
    if (!onAdvanceOnError) return;
    if (base === 'third') {
      onAdvanceOnError(base);
    } else {
      setDestinationMode('advance_error');
    }
  }, [base, onAdvanceOnError]);

  const displayName = runnerName.split(' ').pop()?.toUpperCase() || `R${BASE_LABELS[base]}`;

  // Destination picker sub-view (ticket 4.2)
  if (destinationMode) {
    const destinations = getDestinations(base);
    const label = destinationMode === 'wp'
      ? 'WILD PITCH'
      : destinationMode === 'pb'
        ? 'PASSED BALL'
        : destinationMode === 'advance_error'
          ? 'ADVANCE ON ERROR'
          : 'ADVANCE';
    return (
      <div
        ref={popoverRef}
        className="absolute z-50 transform -translate-x-1/2"
        style={{ left: anchorPosition.left, top: anchorPosition.top }}
      >
        <div className="bg-[#333] border-[3px] border-[#C4A853] p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] min-w-[140px]">
          <div className="text-[8px] text-[#C4A853] font-bold mb-1.5">{label} — ADVANCE TO?</div>
          <div className="flex gap-1.5">
            {destinations.map(({ value, label: dLabel }) => {
              // First destination is default (one base advance), highlight it
              const isDefault = destinations.indexOf({ value, label: dLabel }) === 0;
              return (
                <button
                  key={value}
                  onClick={() => handleDestination(value)}
                  className={`flex-1 border-[2px] px-2 py-1.5 text-[10px] font-bold hover:scale-105 transition-transform ${
                    isDefault
                      ? 'bg-[#1a5276] border-[#5dade2] text-white'
                      : 'bg-[#444] border-[#888] text-[#E8E8D8]'
                  }`}
                >
                  {dLabel}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setDestinationMode(null)}
            className="mt-1.5 w-full bg-[#555] border-[2px] border-[#888] px-2 py-1 text-[9px] text-[#E8E8D8] font-bold hover:bg-[#666]"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  // D-2: Pickoff sub-menu — Safe / Out / Error
  if (pickoffSubMenu) {
    return (
      <div
        ref={popoverRef}
        className="absolute z-50 transform -translate-x-1/2"
        style={{ left: anchorPosition.left, top: anchorPosition.top }}
      >
        <div className="bg-[#333] border-[3px] border-[#C4A853] p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] min-w-[140px]">
          <div className="text-[8px] text-[#C4A853] font-bold mb-1.5">PICKOFF — RESULT?</div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => onPickoff(base, 'safe')}
              className="bg-[#1a5276] border-[2px] border-[#5dade2] px-2 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform"
            >
              Safe (attempt logged)
            </button>
            <button
              onClick={() => onPickoff(base, 'out')}
              className="bg-[#8B0000] border-[2px] border-[#FF4444] px-2 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform"
            >
              Out
            </button>
            <button
              onClick={() => onPickoff(base, 'error')}
              className="bg-[#7d6608] border-[2px] border-[#f4d03f] px-2 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform"
            >
              Error (runner advances)
            </button>
          </div>
          <button
            onClick={() => setPickoffSubMenu(false)}
            className="mt-1.5 w-full bg-[#555] border-[2px] border-[#888] px-2 py-1 text-[9px] text-[#E8E8D8] font-bold hover:bg-[#666]"
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  // Main popover
  return (
    <div
      ref={popoverRef}
      className="absolute z-50 transform -translate-x-1/2"
      style={{ left: anchorPosition.left, top: anchorPosition.top }}
    >
      <div className="bg-[#333] border-[3px] border-[#C4A853] p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] min-w-[160px]">
        {/* Header */}
        <div className="text-[8px] text-[#C4A853] font-bold mb-1.5 flex items-center gap-1">
          <span className="bg-[#C4A853] text-[#1a1a1a] px-1 rounded text-[7px]">{BASE_LABELS[base]}</span>
          {displayName}
        </div>

        {/* Action buttons — 2-column grid */}
        <div className="grid grid-cols-2 gap-1">
          <PopoverButton
            label="Steal"
            color="bg-[#1a5276]"
            border="border-[#5dade2]"
            onClick={() => onSteal(base)}
          />
          <PopoverButton
            label={nextBase(base) === 'Score' ? 'Score' : 'Advance'}
            color="bg-[#1a5276]"
            border="border-[#5dade2]"
            onClick={handleAdvance}
          />
          {onAdvanceOnError && (
            <PopoverButton
              label="Adv Err"
              color="bg-[#7d6608]"
              border="border-[#f4d03f]"
              onClick={handleAdvanceOnError}
            />
          )}
          <PopoverButton
            label="WP"
            color="bg-[#7d6608]"
            border="border-[#f4d03f]"
            onClick={handleWP}
          />
          <PopoverButton
            label="PB"
            color="bg-[#7d6608]"
            border="border-[#f4d03f]"
            onClick={handlePB}
          />
          <PopoverButton
            label="Pickoff"
            color="bg-[#8B0000]"
            border="border-[#FF4444]"
            onClick={() => setPickoffSubMenu(true)}
          />
          <PopoverButton
            label="Sub"
            color="bg-[#4A6844]"
            border="border-[#88AA88]"
            onClick={() => onSubstitute(base)}
          />
          {onViewPlayerCard && (
            <PopoverButton
              label="Card"
              color="bg-[#6c3483]"
              border="border-[#af7ac5]"
              onClick={onViewPlayerCard}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PopoverButton({ label, color, border, onClick }: {
  label: string;
  color: string;
  border: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} ${border} border-[2px] px-2 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]`}
    >
      {label}
    </button>
  );
}

export default RunnerPopover;
