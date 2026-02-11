/**
 * BatchOperationOverlay - Progress display for batch simulate/skip
 *
 * Shows a full-screen overlay with a progress bar and counter
 * while batch operations are running.
 */

import { useEffect, useState } from 'react';

export type BatchOperationType = 'simulate' | 'skip';

interface BatchOperationOverlayProps {
  isOpen: boolean;
  operationType: BatchOperationType;
  current: number;
  total: number;
  onComplete: () => void;
}

export function BatchOperationOverlay({
  isOpen,
  operationType,
  current,
  total,
  onComplete,
}: BatchOperationOverlayProps) {
  const [showDone, setShowDone] = useState(false);

  const isFinished = current >= total && total > 0;
  const label = operationType === 'simulate' ? 'Simulating' : 'Skipping';
  const doneLabel = operationType === 'simulate' ? 'SIMULATION COMPLETE' : 'GAMES SKIPPED';
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  // Show done state briefly after finishing
  useEffect(() => {
    if (isFinished && !showDone) {
      setShowDone(true);
      const timer = setTimeout(() => {
        onComplete();
        setShowDone(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isFinished, showDone, onComplete]);

  // Reset showDone when overlay closes
  useEffect(() => {
    if (!isOpen) setShowDone(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="w-full max-w-md">
        <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6 text-center">
          {/* Header */}
          <div className="text-[10px] text-[#C4A853] tracking-widest mb-4">
            {showDone ? doneLabel : `${label.toUpperCase()}...`}
          </div>

          {/* Counter */}
          <div
            className="text-2xl text-[#E8E8D8] font-bold mb-4"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            {showDone
              ? `${total} game${total !== 1 ? 's' : ''} ${operationType === 'simulate' ? 'simulated' : 'skipped'}`
              : `${label}... ${current}/${total} games`}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#3F5A3A] border-[3px] border-[#4A6844] h-6 mb-4">
            <div
              className="h-full bg-[#C4A853] transition-all duration-150"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Percentage */}
          <div className="text-[10px] text-[#E8E8D8]/60">
            {percent}%
          </div>
        </div>
      </div>
    </div>
  );
}
