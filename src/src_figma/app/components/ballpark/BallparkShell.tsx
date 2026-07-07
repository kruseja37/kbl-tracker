import type { ReactNode } from "react";

import "../../../styles/ballpark-kit.css";
import { BallparkButton } from "./BallparkButton";

export interface BallparkShellProps {
  actions?: ReactNode;
  backLabel?: string;
  children: ReactNode;
  className?: string;
  eyebrow?: ReactNode;
  onBack?: () => void;
  title: ReactNode;
}

export function BallparkShell({
  actions,
  backLabel = "Back",
  children,
  className = "",
  eyebrow,
  onBack,
  title,
}: BallparkShellProps) {
  return (
    <div className={`ballpark-page${className ? ` ${className}` : ""}`}>
      <div>
        <header className="ballpark-shell-header">
          <div className="ballpark-title-plate">
            <div>
              {eyebrow ? <div>{eyebrow}</div> : null}
              <h1 className="ballpark-title">{title}</h1>
            </div>
          </div>
          <div>
            {onBack ? (
              <BallparkButton onClick={onBack} variant="secondary">
                {backLabel}
              </BallparkButton>
            ) : null}
            {actions}
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
