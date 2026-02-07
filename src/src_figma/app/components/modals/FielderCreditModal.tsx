/**
 * FielderCreditModal - Assign fielding credits (putouts/assists) for thrown-out runners
 *
 * EXH-016: When a runner is thrown out on a play, this modal prompts the user
 * to assign which fielder recorded the putout and which fielders assisted.
 *
 * Design: Uses SubstitutionModalBase for consistent look-and-feel.
 */

import { useState, useCallback } from 'react';
import { SubstitutionModalBase, ModalSection, ModalButton, ModalActions } from './SubstitutionModalBase';

// ============================================
// TYPES
// ============================================

/** Info about a runner who was thrown out on the play */
export interface RunnerOutInfo {
  runnerName: string;
  fromBase: '1B' | '2B' | '3B';
  outAtBase: '1B' | '2B' | '3B' | 'HOME';
}

/** Completed fielder credit for one thrown-out runner */
export interface FielderCredit extends RunnerOutInfo {
  putoutBy: string;  // Position name (e.g., 'C', 'SS', '1B')
  assistBy: string[]; // Position names
}

// Standard baseball positions (number → abbreviation)
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

// ============================================
// COMPONENT
// ============================================

interface FielderCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (credits: FielderCredit[]) => void;
  runnersOut: RunnerOutInfo[];
}

export function FielderCreditModal({
  isOpen,
  onClose,
  onConfirm,
  runnersOut,
}: FielderCreditModalProps) {
  // State: one credit entry per runner
  const [credits, setCredits] = useState<Record<number, { putoutBy: string; assistBy: string[] }>>({});

  // Get credit for a runner index (with defaults based on typical plays)
  const getCredit = useCallback((index: number, runner: RunnerOutInfo) => {
    if (credits[index]) return credits[index];
    // Sensible defaults based on where the runner was thrown out
    const defaultPutout = runner.outAtBase === 'HOME' ? 'C'
      : runner.outAtBase === '3B' ? '3B'
      : runner.outAtBase === '2B' ? 'SS'
      : '1B';
    return { putoutBy: defaultPutout, assistBy: [] as string[] };
  }, [credits]);

  const setPutout = useCallback((index: number, runner: RunnerOutInfo, position: string) => {
    const current = getCredit(index, runner);
    setCredits(prev => ({ ...prev, [index]: { ...current, putoutBy: position } }));
  }, [getCredit]);

  const toggleAssist = useCallback((index: number, runner: RunnerOutInfo, position: string) => {
    const current = getCredit(index, runner);
    const assists = current.assistBy.includes(position)
      ? current.assistBy.filter(p => p !== position)
      : [...current.assistBy, position];
    setCredits(prev => ({ ...prev, [index]: { ...current, assistBy: assists } }));
  }, [getCredit]);

  const handleConfirm = useCallback(() => {
    const result: FielderCredit[] = runnersOut.map((runner, index) => {
      const credit = getCredit(index, runner);
      return {
        ...runner,
        putoutBy: credit.putoutBy,
        assistBy: credit.assistBy,
      };
    });
    setCredits({});
    onConfirm(result);
  }, [runnersOut, getCredit, onConfirm]);

  const handleClose = useCallback(() => {
    setCredits({});
    onClose();
  }, [onClose]);

  return (
    <SubstitutionModalBase
      isOpen={isOpen}
      onClose={handleClose}
      title="FIELDER CREDITS"
      icon="🧤"
      width="lg"
    >
      <div className="text-[10px] text-[#E8E8D8]/70 mb-4">
        Assign putouts and assists for each thrown-out runner.
      </div>

      {runnersOut.map((runner, index) => {
        const credit = getCredit(index, runner);
        return (
          <ModalSection
            key={`${runner.runnerName}-${runner.fromBase}`}
            title={`${runner.runnerName} — OUT at ${runner.outAtBase}`}
            variant="highlight"
          >
            <div className="text-[10px] text-[#E8E8D8]/60 mb-3">
              Was on {runner.fromBase} → Thrown out at {runner.outAtBase}
            </div>

            {/* Putout By */}
            <div className="mb-3">
              <div className="text-[10px] text-[#E8E8D8]/80 mb-2">PUTOUT BY:</div>
              <div className="flex flex-wrap gap-1.5">
                {POSITIONS.map(pos => (
                  <button
                    key={`putout-${index}-${pos.label}`}
                    onClick={() => setPutout(index, runner, pos.label)}
                    className={`px-3 py-1.5 text-[10px] font-bold border-[2px] transition-colors ${
                      credit.putoutBy === pos.label
                        ? 'bg-[#5599FF] border-[#3366FF] text-white'
                        : 'bg-[#2A3424] border-[#3F5A3A] text-[#E8E8D8]/80 hover:border-[#5599FF]'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assists (multi-select) */}
            <div>
              <div className="text-[10px] text-[#E8E8D8]/80 mb-2">
                ASSISTS ({credit.assistBy.length > 0 ? credit.assistBy.join(' → ') : 'none'}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POSITIONS.filter(pos => pos.label !== credit.putoutBy).map(pos => (
                  <button
                    key={`assist-${index}-${pos.label}`}
                    onClick={() => toggleAssist(index, runner, pos.label)}
                    className={`px-3 py-1.5 text-[10px] font-bold border-[2px] transition-colors ${
                      credit.assistBy.includes(pos.label)
                        ? 'bg-[#228B22] border-[#1a6b1a] text-white'
                        : 'bg-[#2A3424] border-[#3F5A3A] text-[#E8E8D8]/80 hover:border-[#228B22]'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {(credit.putoutBy || credit.assistBy.length > 0) && (
              <div className="mt-3 bg-[#2A3424] border-[2px] border-[#3F5A3A] p-2">
                <span className="text-[10px] text-[#E8E8D8]/60">Play: </span>
                <span className="text-[10px] text-[#E8E8D8] font-bold">
                  {credit.assistBy.length > 0
                    ? `${credit.assistBy.join('-')}-${credit.putoutBy}`
                    : `Unassisted (${credit.putoutBy})`
                  }
                </span>
              </div>
            )}
          </ModalSection>
        );
      })}

      <ModalActions>
        <ModalButton variant="secondary" onClick={handleClose}>
          Skip
        </ModalButton>
        <ModalButton variant="primary" onClick={handleConfirm}>
          Confirm Credits
        </ModalButton>
      </ModalActions>
    </SubstitutionModalBase>
  );
}
