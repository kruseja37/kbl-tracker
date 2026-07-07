import type { ReactNode } from "react";

import "../../../styles/ballpark-kit.css";

export interface BallparkPanelProps {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
}

export function BallparkPanel({
  actions,
  children,
  className = "",
  eyebrow,
  title,
}: BallparkPanelProps) {
  return (
    <section className={`ballpark-panel${className ? ` ${className}` : ""}`}>
      <header className="ballpark-panel-strip">
        <div>
          {eyebrow ? <div>{eyebrow}</div> : null}
          <h2>{title}</h2>
        </div>
        {actions ? <div>{actions}</div> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}
