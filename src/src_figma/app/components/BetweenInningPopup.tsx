import React from "react";

export interface BetweenInningPopupProps {
  text: string;
  onDismiss: (reason: "auto" | "tap" | "escape") => void;
  autoDismissMs?: number;
  fastDismissMs?: number;
}

const AUTO_COLLAPSE_MS = 360;

export function BetweenInningPopup({
  text,
  onDismiss,
  autoDismissMs = 6000,
  fastDismissMs = 250,
}: BetweenInningPopupProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const autoTimerRef = React.useRef<number | null>(null);
  const dismissTimerRef = React.useRef<number | null>(null);
  const dismissingRef = React.useRef(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [transitionMs, setTransitionMs] = React.useState(AUTO_COLLAPSE_MS);
  const descriptionId = React.useId();

  const clearTimers = React.useCallback(() => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const startDismiss = React.useCallback(
    (reason: "auto" | "tap" | "escape") => {
      if (dismissingRef.current) {
        return;
      }

      dismissingRef.current = true;
      clearTimers();

      const duration = reason === "auto" ? AUTO_COLLAPSE_MS : fastDismissMs;
      setTransitionMs(duration);
      setIsClosing(true);
      dismissTimerRef.current = window.setTimeout(() => {
        onDismiss(reason);
      }, duration);
    },
    [clearTimers, fastDismissMs, onDismiss],
  );

  React.useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    rootRef.current?.focus();
    autoTimerRef.current = window.setTimeout(() => {
      startDismiss("auto");
    }, autoDismissMs);

    return () => {
      clearTimers();
      previousFocusRef.current?.focus?.();
    };
  }, [autoDismissMs, clearTimers, startDismiss]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        startDismiss("escape");
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        rootRef.current?.focus();
      }
    },
    [startDismiss],
  );

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/72 px-4"
      data-testid="between-inning-popup-backdrop"
      onClick={() => startDismiss("tap")}
    >
      <div
        ref={rootRef}
        role="alertdialog"
        aria-modal="true"
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-testid="between-inning-popup"
        onKeyDown={handleKeyDown}
        onClick={(event) => {
          event.stopPropagation();
          startDismiss("tap");
        }}
        className="w-full max-w-xl border px-5 py-5 shadow-[0_24px_64px_rgba(0,0,0,0.45)] outline-none"
        style={{
          borderColor: "#60735F",
          background:
            "linear-gradient(180deg, rgba(21, 28, 21, 0.98) 0%, rgba(35, 46, 34, 0.96) 100%)",
          color: "#F5E8CF",
          fontFamily: "'Moms Typewriter', monospace",
          opacity: isClosing ? 0 : 1,
          transform: isClosing ? "translateY(20px)" : "translateY(0)",
          transition: `opacity ${transitionMs}ms ease, transform ${transitionMs}ms ease`,
        }}
      >
        <div
          className="mb-3 text-center text-[0.72rem] uppercase tracking-[0.2em] text-[#C4A853]"
          style={{ fontFamily: "'Tox Typewriter', monospace" }}
        >
          Between Innings
        </div>
        <p
          id={descriptionId}
          className="m-0 text-center text-[1rem] leading-7 text-[#E7EEDC]"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

export default BetweenInningPopup;
