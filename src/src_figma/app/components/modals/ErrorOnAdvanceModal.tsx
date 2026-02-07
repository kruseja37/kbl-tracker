/**
 * ErrorOnAdvanceModal - Attribute errors when runners advance extra bases
 *
 * EXH-025: When a runner advances further than expected (e.g., 1B→HOME on a single),
 * this modal prompts the user to determine if it was due to a fielding error
 * or good baserunning.
 *
 * Design: Uses SubstitutionModalBase for consistent look-and-feel.
 * This modal is INFORMATIONAL — the play has already been recorded.
 * Error attribution feeds into fielding stats (errors, fWAR) and earned/unearned run tracking.
 */

import { useState, useCallback } from 'react';
import { SubstitutionModalBase, ModalSection, ModalButton, ModalActions } from './SubstitutionModalBase';

// ============================================
// TYPES
// ============================================

/** Info about a runner who advanced further than expected */
export interface RunnerAdvanceInfo {
  runnerName: string;
  fromBase: '1B' | '2B' | '3B';
  toBase: '2B' | '3B' | 'HOME';
  expectedBase: '2B' | '3B' | 'HOME';
}

/** SMB4 error types (per SMB4_GAME_MECHANICS.md) */
type ErrorType = 'FIELDING' | 'THROWING';

/** Result of error attribution for one runner */
export interface ErrorOnAdvanceResult extends RunnerAdvanceInfo {
  wasError: boolean;
  errorType?: ErrorType;
  errorFielder?: string; // Position name (e.g., 'SS', 'LF')
}

// Standard baseball positions
const POSITIONS = [
  { number: 1, label: 'P' },
  { number: 2, label: 'C' },
  { number: 3, label: '1B' },
  { number: 4, label: '2B' },
  { number: 5, label: '3B' },
  { number: 6, label: 'SS' },
  { number: 7, label: 'LF' },
  { number: 8, label: 'CF' },
  { number: 9, label: 'RF' },
];

const ERROR_TYPES: { value: ErrorType; label: string; description: string }[] = [
  { value: 'FIELDING', label: 'Fielding', description: 'Bobble, misplay, or drop' },
  { value: 'THROWING', label: 'Throwing', description: 'Bad throw allowing extra base' },
];

// ============================================
// COMPONENT
// ============================================

interface ErrorOnAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (results: ErrorOnAdvanceResult[]) => void;
  runnersWithExtraAdvance: RunnerAdvanceInfo[];
}

interface RunnerAttribution {
  wasError: boolean;
  errorType?: ErrorType;
  errorFielder?: string;
}

export function ErrorOnAdvanceModal({
  isOpen,
  onClose,
  onConfirm,
  runnersWithExtraAdvance,
}: ErrorOnAdvanceModalProps) {
  // State: one attribution per runner
  const [attributions, setAttributions] = useState<Record<number, RunnerAttribution>>({});

  const getAttribution = useCallback((index: number): RunnerAttribution => {
    return attributions[index] || { wasError: false };
  }, [attributions]);

  const setWasError = useCallback((index: number, wasError: boolean) => {
    setAttributions(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        wasError,
        // Clear error details when switching to "no error"
        ...(wasError ? {} : { errorType: undefined, errorFielder: undefined }),
      },
    }));
  }, []);

  const setErrorType = useCallback((index: number, errorType: ErrorType) => {
    setAttributions(prev => ({
      ...prev,
      [index]: { ...prev[index], wasError: true, errorType },
    }));
  }, []);

  const setErrorFielder = useCallback((index: number, errorFielder: string) => {
    setAttributions(prev => ({
      ...prev,
      [index]: { ...prev[index], wasError: true, errorFielder },
    }));
  }, []);

  const handleConfirm = useCallback(() => {
    const results: ErrorOnAdvanceResult[] = runnersWithExtraAdvance.map((runner, index) => {
      const attr = getAttribution(index);
      return {
        ...runner,
        wasError: attr.wasError,
        errorType: attr.wasError ? attr.errorType : undefined,
        errorFielder: attr.wasError ? attr.errorFielder : undefined,
      };
    });
    setAttributions({});
    onConfirm(results);
  }, [runnersWithExtraAdvance, getAttribution, onConfirm]);

  const handleClose = useCallback(() => {
    setAttributions({});
    onClose();
  }, [onClose]);

  // Pretty-print a base name
  const formatBase = (base: string) => {
    if (base === 'HOME') return 'Home';
    return base;
  };

  return (
    <SubstitutionModalBase
      isOpen={isOpen}
      onClose={handleClose}
      title="EXTRA ADVANCEMENT"
      icon="🔍"
      width="lg"
    >
      <div className="text-[10px] text-[#E8E8D8]/70 mb-4">
        The following runner(s) advanced further than expected. Was this due to a fielding error or good baserunning?
      </div>

      {runnersWithExtraAdvance.map((runner, index) => {
        const attr = getAttribution(index);
        return (
          <ModalSection
            key={`${runner.runnerName}-${runner.fromBase}`}
            title={`${runner.runnerName} — ${runner.fromBase} → ${formatBase(runner.toBase)}`}
            variant={attr.wasError ? 'highlight' : 'default'}
          >
            <div className="text-[10px] text-[#E8E8D8]/60 mb-3">
              Expected: {runner.fromBase} → {formatBase(runner.expectedBase)} |
              Actual: {runner.fromBase} → {formatBase(runner.toBase)}
            </div>

            {/* Error or good baserunning? */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setWasError(index, false)}
                className={`flex-1 py-2 px-3 text-[10px] font-bold border-[2px] transition-colors ${
                  !attr.wasError
                    ? 'bg-[#228B22] border-[#1a6b1a] text-white'
                    : 'bg-[#2A3424] border-[#3F5A3A] text-[#E8E8D8]/80 hover:border-[#228B22]'
                }`}
              >
                🏃 Good Baserunning
              </button>
              <button
                onClick={() => setWasError(index, true)}
                className={`flex-1 py-2 px-3 text-[10px] font-bold border-[2px] transition-colors ${
                  attr.wasError
                    ? 'bg-[#DD0000] border-[#AA0000] text-white'
                    : 'bg-[#2A3424] border-[#3F5A3A] text-[#E8E8D8]/80 hover:border-[#DD0000]'
                }`}
              >
                ❌ Fielding Error
              </button>
            </div>

            {/* Error details (only shown when error selected) */}
            {attr.wasError && (
              <div className="space-y-3">
                {/* Error Type */}
                <div>
                  <div className="text-[10px] text-[#E8E8D8]/80 mb-2">ERROR TYPE:</div>
                  <div className="flex gap-2">
                    {ERROR_TYPES.map(et => (
                      <button
                        key={et.value}
                        onClick={() => setErrorType(index, et.value)}
                        className={`flex-1 py-2 px-3 text-[10px] font-bold border-[2px] transition-colors ${
                          attr.errorType === et.value
                            ? 'bg-[#5599FF] border-[#3366FF] text-white'
                            : 'bg-[#2A3424] border-[#3F5A3A] text-[#E8E8D8]/80 hover:border-[#5599FF]'
                        }`}
                      >
                        <div>{et.label}</div>
                        <div className="text-[8px] font-normal opacity-70">{et.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Fielder */}
                <div>
                  <div className="text-[10px] text-[#E8E8D8]/80 mb-2">ERROR BY:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {POSITIONS.map(pos => (
                      <button
                        key={`error-${index}-${pos.label}`}
                        onClick={() => setErrorFielder(index, pos.label)}
                        className={`px-3 py-1.5 text-[10px] font-bold border-[2px] transition-colors ${
                          attr.errorFielder === pos.label
                            ? 'bg-[#DD0000] border-[#AA0000] text-white'
                            : 'bg-[#2A3424] border-[#3F5A3A] text-[#E8E8D8]/80 hover:border-[#DD0000]'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                {attr.errorType && attr.errorFielder && (
                  <div className="bg-[#2A3424] border-[2px] border-[#DD0000]/50 p-2">
                    <span className="text-[10px] text-[#DD0000] font-bold">
                      E{POSITIONS.find(p => p.label === attr.errorFielder)?.number || '?'}: {attr.errorType} error by {attr.errorFielder}
                    </span>
                    <span className="text-[10px] text-[#E8E8D8]/60 ml-2">
                      ({runner.runnerName} advances to {formatBase(runner.toBase)})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Good baserunning summary */}
            {!attr.wasError && (
              <div className="bg-[#2A3424] border-[2px] border-[#228B22]/50 p-2">
                <span className="text-[10px] text-[#228B22] font-bold">
                  Good baserunning
                </span>
                <span className="text-[10px] text-[#E8E8D8]/60 ml-2">
                  ({runner.runnerName} hustles from {runner.fromBase} to {formatBase(runner.toBase)})
                </span>
              </div>
            )}
          </ModalSection>
        );
      })}

      <ModalActions>
        <ModalButton variant="secondary" onClick={handleClose}>
          Skip (No Errors)
        </ModalButton>
        <ModalButton variant="primary" onClick={handleConfirm}>
          Confirm
        </ModalButton>
      </ModalActions>
    </SubstitutionModalBase>
  );
}
