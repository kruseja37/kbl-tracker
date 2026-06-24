import { type ReactNode, useState } from "react";

interface LongPressRevealProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function LongPressReveal({ label, children, className }: LongPressRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const buttonClassName = ["select-none", className].filter(Boolean).join(" ");
  const cover = () => setRevealed(false);

  return (
    <button
      type="button"
      aria-label={label}
      className={buttonClassName}
      onPointerDown={() => setRevealed(true)}
      onPointerUp={cover}
      onPointerLeave={cover}
      onPointerCancel={cover}
      onContextMenu={(event) => event.preventDefault()}
    >
      {revealed ? (
        children
      ) : (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true">🔒</span>
          <span>{label}</span>
        </span>
      )}
    </button>
  );
}
