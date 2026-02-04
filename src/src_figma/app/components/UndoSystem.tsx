/**
 * UndoSystem - Undo button and state snapshot management
 *
 * Per GAMETRACKER_DRAGDROP_SPEC.md Phase 7:
 * - Undo button with 5-step stack
 * - Shows "↩ N" count, grayed when empty
 * - Toast notification for undone action
 * - No gestures (too accident-prone)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Undo2 } from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface GameSnapshot {
  timestamp: number;
  playDescription: string;
  gameState: unknown; // The actual game state - kept opaque for flexibility
}

export interface UndoSystemProps {
  /** Maximum number of undo steps to keep */
  maxSteps?: number;
  /** Callback when undo is triggered, returns the state to restore */
  onUndo: (snapshot: GameSnapshot) => void;
  /** Current game state for snapshotting */
  currentState: unknown;
  /** Reference to capture snapshots before actions */
  captureRef?: React.MutableRefObject<(() => void) | undefined>;
}

export interface UndoSystemHandle {
  /** Capture a snapshot before an action */
  captureSnapshot: (description: string) => void;
  /** Check if undo is available */
  canUndo: boolean;
  /** Number of available undo steps */
  undoCount: number;
  /** Clear all undo history */
  clearHistory: () => void;
}

// ============================================
// TOAST NOTIFICATION
// ============================================

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

function UndoToast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-[#333] border-[3px] border-[#C4A853] px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] flex items-center gap-2">
        <Undo2 className="w-4 h-4 text-[#C4A853]" />
        <span className="text-[10px] font-bold text-[#E8E8D8]">{message}</span>
      </div>
    </div>
  );
}

// ============================================
// UNDO BUTTON COMPONENT
// ============================================

interface UndoButtonProps {
  count: number;
  disabled: boolean;
  onClick: () => void;
}

export function UndoButton({ count, disabled, onClick }: UndoButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-2 py-1 border-[2px] font-bold text-[10px] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] ${
        disabled
          ? 'bg-[#444] border-[#555] text-[#666] cursor-not-allowed'
          : 'bg-[#3a3a3a] border-[#C4A853] text-[#C4A853] hover:bg-[#4a4a4a] active:scale-95'
      }`}
      title={disabled ? 'Nothing to undo' : `Undo (${count} available)`}
    >
      <Undo2 className="w-3 h-3" />
      <span>{count}</span>
    </button>
  );
}

// ============================================
// UNDO SYSTEM HOOK
// ============================================

export function useUndoSystem(
  maxSteps: number = 5,
  onUndo: (snapshot: GameSnapshot) => void
): UndoSystemHandle & {
  UndoButtonComponent: React.FC;
  ToastComponent: React.FC;
  setCurrentState: (state: unknown) => void;
} {
  const [stack, setStack] = useState<GameSnapshot[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const currentStateRef = useRef<unknown>(null);

  // Capture a snapshot before an action
  const captureSnapshot = useCallback((description: string) => {
    if (currentStateRef.current === null) return;

    const snapshot: GameSnapshot = {
      timestamp: Date.now(),
      playDescription: description,
      gameState: JSON.parse(JSON.stringify(currentStateRef.current)), // Deep clone
    };

    setStack(prev => {
      const newStack = [...prev, snapshot];
      // Limit to maxSteps
      if (newStack.length > maxSteps) {
        return newStack.slice(-maxSteps);
      }
      return newStack;
    });
  }, [maxSteps]);

  // Perform undo
  const performUndo = useCallback(() => {
    if (stack.length === 0) return;

    const snapshot = stack[stack.length - 1];
    setStack(prev => prev.slice(0, -1));
    setToastMessage(`Undone: ${snapshot.playDescription}`);
    onUndo(snapshot);
  }, [stack, onUndo]);

  // Clear history
  const clearHistory = useCallback(() => {
    setStack([]);
  }, []);

  // Dismiss toast
  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // Update current state ref
  const setCurrentState = useCallback((state: unknown) => {
    currentStateRef.current = state;
  }, []);

  // Undo button component
  const UndoButtonComponent = useCallback(() => (
    <UndoButton
      count={stack.length}
      disabled={stack.length === 0}
      onClick={performUndo}
    />
  ), [stack.length, performUndo]);

  // Toast component
  const ToastComponent = useCallback(() => (
    toastMessage ? <UndoToast message={toastMessage} onDismiss={dismissToast} /> : null
  ), [toastMessage, dismissToast]);

  return {
    captureSnapshot,
    canUndo: stack.length > 0,
    undoCount: stack.length,
    clearHistory,
    UndoButtonComponent,
    ToastComponent,
    setCurrentState,
  };
}

// ============================================
// STANDALONE UNDO SYSTEM COMPONENT
// ============================================

/**
 * Standalone undo system that can be rendered alongside the game tracker.
 * Provides the undo button and manages state snapshots.
 */
export function UndoSystem({
  maxSteps = 5,
  onUndo,
  currentState,
}: UndoSystemProps) {
  const [stack, setStack] = useState<GameSnapshot[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Capture a snapshot before an action
  const captureSnapshot = useCallback((description: string) => {
    const snapshot: GameSnapshot = {
      timestamp: Date.now(),
      playDescription: description,
      gameState: JSON.parse(JSON.stringify(currentState)), // Deep clone
    };

    setStack(prev => {
      const newStack = [...prev, snapshot];
      if (newStack.length > maxSteps) {
        return newStack.slice(-maxSteps);
      }
      return newStack;
    });
  }, [currentState, maxSteps]);

  // Perform undo
  const performUndo = useCallback(() => {
    if (stack.length === 0) return;

    const snapshot = stack[stack.length - 1];
    setStack(prev => prev.slice(0, -1));
    setToastMessage(`Undone: ${snapshot.playDescription}`);
    onUndo(snapshot);
  }, [stack, onUndo]);

  // Dismiss toast
  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // Expose captureSnapshot for external use via window (temporary pattern)
  useEffect(() => {
    // @ts-expect-error - Temporary global exposure
    window.__undoCapture = captureSnapshot;
    return () => {
      // @ts-expect-error - Cleanup
      delete window.__undoCapture;
    };
  }, [captureSnapshot]);

  return (
    <>
      <UndoButton
        count={stack.length}
        disabled={stack.length === 0}
        onClick={performUndo}
      />
      {toastMessage && <UndoToast message={toastMessage} onDismiss={dismissToast} />}
    </>
  );
}

// ============================================
// CONTEXT-BASED UNDO SYSTEM (RECOMMENDED)
// ============================================

import { createContext, useContext, type ReactNode } from 'react';

interface UndoContextValue {
  captureSnapshot: (description: string, state: unknown) => void;
  performUndo: () => void;
  canUndo: boolean;
  undoCount: number;
  clearHistory: () => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

interface UndoProviderProps {
  children: ReactNode;
  maxSteps?: number;
  onUndo: (snapshot: GameSnapshot) => void;
}

export function UndoProvider({ children, maxSteps = 5, onUndo }: UndoProviderProps) {
  const [stack, setStack] = useState<GameSnapshot[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const captureSnapshot = useCallback((description: string, state: unknown) => {
    const snapshot: GameSnapshot = {
      timestamp: Date.now(),
      playDescription: description,
      gameState: JSON.parse(JSON.stringify(state)),
    };

    setStack(prev => {
      const newStack = [...prev, snapshot];
      if (newStack.length > maxSteps) {
        return newStack.slice(-maxSteps);
      }
      return newStack;
    });
  }, [maxSteps]);

  const performUndo = useCallback(() => {
    if (stack.length === 0) return;

    const snapshot = stack[stack.length - 1];
    setStack(prev => prev.slice(0, -1));
    setToastMessage(`Undone: ${snapshot.playDescription}`);
    onUndo(snapshot);
  }, [stack, onUndo]);

  const clearHistory = useCallback(() => {
    setStack([]);
  }, []);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const value: UndoContextValue = {
    captureSnapshot,
    performUndo,
    canUndo: stack.length > 0,
    undoCount: stack.length,
    clearHistory,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
      {/* Render undo button at top-left */}
      <div className="fixed top-4 left-4 z-40">
        <UndoButton
          count={stack.length}
          disabled={stack.length === 0}
          onClick={performUndo}
        />
      </div>
      {/* Toast notification */}
      {toastMessage && <UndoToast message={toastMessage} onDismiss={dismissToast} />}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}

export default UndoSystem;
