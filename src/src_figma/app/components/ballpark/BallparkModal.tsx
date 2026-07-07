import type { ReactNode } from "react";

import "../../../styles/ballpark-kit.css";

export interface BallparkModalProps {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  open: boolean;
  title: ReactNode;
}

export function BallparkModal({
  actions,
  children,
  className = "",
  open,
  title,
}: BallparkModalProps) {
  if (!open) return null;

  return (
    <div>
      <section
        aria-modal="true"
        className={`ballpark-modal${className ? ` ${className}` : ""}`}
        role="dialog"
      >
        <header className="ballpark-modal-title">
          <h2>{title}</h2>
          {actions ? <div>{actions}</div> : null}
        </header>
        <div>{children}</div>
      </section>
    </div>
  );
}
