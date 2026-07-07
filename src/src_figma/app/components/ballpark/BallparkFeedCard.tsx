import type { ReactNode } from "react";

import "../../../styles/ballpark-kit.css";

type BallparkFeedTone = "default" | "info" | "success" | "warn" | "signal";

export interface BallparkFeedCardProps {
  children: ReactNode;
  className?: string;
  meta?: ReactNode;
  title: ReactNode;
  tone?: BallparkFeedTone;
}

export function BallparkFeedCard({
  children,
  className = "",
  meta,
  title,
  tone = "default",
}: BallparkFeedCardProps) {
  const toneLabel = tone === "default" ? null : tone.toUpperCase();

  return (
    <article className={`ballpark-feed-card${className ? ` ${className}` : ""}`}>
      {toneLabel ? <strong>{toneLabel}</strong> : null}
      <div>
        {meta ? <div>{meta}</div> : null}
        <h3>{title}</h3>
        <div>{children}</div>
      </div>
    </article>
  );
}
