/**
 * BatchOperationOverlay - Progress display for batch simulate/skip
 *
 * Shows a full-screen overlay with a progress bar and counter
 * while batch operations are running.
 */

import { useEffect, useState, useRef, useCallback } from 'react';

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
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isFinished = current >= total && total > 0;
  const label = operationType === 'simulate' ? 'Simulating' : 'Skipping';
  const doneLabel = operationType === 'simulate' ? 'SIMULATION COMPLETE' : 'GAMES SKIPPED';
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  const handleDismiss = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current();
    }
  }, []);

  // Show done state briefly, then auto-dismiss
  useEffect(() => {
    if (isFinished && !showDone && !completedRef.current) {
      setShowDone(true);
      const timer = setTimeout(handleDismiss, 1500);
      return () => clearTimeout(timer);
    }
  }, [isFinished, showDone, handleDismiss]);

  // Reset when overlay closes
  useEffect(() => {
    if (!isOpen) {
      setShowDone(false);
      completedRef.current = false;
    }
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

          {/* Done button (shown when finished) */}
          {showDone && (
            <button
              onClick={handleDismiss}
              className="mt-4 bg-[#3F5A3A] border-[3px] border-[#C4A853] px-6 py-2 text-[10px] text-[#E8E8D8] hover:bg-[#4A6844] active:scale-95 transition-transform"
            >
              CONTINUE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
