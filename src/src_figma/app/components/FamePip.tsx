import type { CSSProperties } from "react";

import { FAME_TIER_LABEL, type FameTier } from "../../../types/reporter";

export interface FamePipProps {
  tier: FameTier;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
}

const PALETTE = {
  roadGray: "#B0B7BC",
  darkCream: "#CBB89C",
  histYellow: "#F2C041",
  marqueeRed: "#CC3433",
  chalk: "#F5E8CF",
  ink: "#34261B",
  glow: "#F6D86E",
} as const;

const STAR_PATH =
  "M32 6.5 L39.8 22.2 L57 24.7 L44.5 36.9 L47.4 54.3 L32 46.1 L16.6 54.3 L19.5 36.9 L7 24.7 L24.2 22.2 Z";

const SIZE_CONFIG: Record<
  NonNullable<FamePipProps["size"]>,
  {
    iconSize: number;
    labelSize: number;
    gap: number;
    captionSpacing: number;
  }
> = {
  sm: {
    iconSize: 28,
    labelSize: 9,
    gap: 3,
    captionSpacing: -1,
  },
  md: {
    iconSize: 40,
    labelSize: 11,
    gap: 4,
    captionSpacing: 0,
  },
  lg: {
    iconSize: 54,
    labelSize: 13,
    gap: 5,
    captionSpacing: 1,
  },
};

function getTierLabel(tier: FameTier) {
  return `${FAME_TIER_LABEL[tier]} (${tier}/5)`;
}

export function FamePip({
  tier,
  size = "md",
  showCount = false,
}: FamePipProps) {
  const config = SIZE_CONFIG[size];
  const wrapperStyle: CSSProperties = {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    gap: config.gap,
    lineHeight: 1,
  };

  const countStyle: CSSProperties = {
    color: PALETTE.chalk,
    fontFamily: "'Moms Typewriter', monospace",
    fontSize: `${config.labelSize}px`,
    letterSpacing: "0.12em",
    textShadow: "1px 1px 0 rgba(32, 22, 14, 0.55)",
    transform: `translateY(${config.captionSpacing}px)`,
    textTransform: "uppercase",
  };

  return (
    <div
      aria-label={`Fame tier ${getTierLabel(tier)}`}
      data-testid={`fame-pip-tier-${tier}`}
      style={wrapperStyle}
    >
      <svg
        aria-hidden="true"
        data-testid="fame-pip-svg"
        height={config.iconSize}
        viewBox="0 0 64 64"
        width={config.iconSize}
      >
        <defs>
          <filter
            id="fame-superstar-glow"
            colorInterpolationFilters="sRGB"
            x="-35%"
            y="-35%"
            width="170%"
            height="170%"
          >
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="2.3" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0.08 0 1 0 0 0.06 0 0 1 0 0 0 0 0 0.55 0"
            />
          </filter>
        </defs>

        {tier === 1 ? (
          <circle
            cx="32"
            cy="32"
            r="14"
            data-testid="fame-outline-circle"
            fill="none"
            stroke={PALETTE.roadGray}
            strokeWidth="4"
          />
        ) : (
          <>
            {tier === 5 && (
              <>
                <ellipse
                  cx="31"
                  cy="34"
                  rx="22"
                  ry="17"
                  data-testid="fame-chalk-backing"
                  fill={PALETTE.chalk}
                  opacity="0.24"
                  transform="rotate(-8 31 34)"
                />
                <ellipse
                  cx="34"
                  cy="32"
                  rx="20"
                  ry="14"
                  fill={PALETTE.chalk}
                  opacity="0.16"
                  transform="rotate(11 34 32)"
                />
                <path
                  d={STAR_PATH}
                  data-testid="fame-superstar-glow"
                  fill={PALETTE.glow}
                  filter="url(#fame-superstar-glow)"
                  opacity="0.5"
                />
              </>
            )}

            <path
              d={STAR_PATH}
              data-testid="fame-star"
              fill={
                tier === 2
                  ? "none"
                  : tier === 5
                    ? "#F7C948"
                    : PALETTE.histYellow
              }
              stroke={tier === 2 ? PALETTE.darkCream : PALETTE.ink}
              strokeLinejoin="round"
              strokeWidth={tier === 2 ? 3.2 : 1.8}
            />

            {tier === 4 && (
              <path
                d={STAR_PATH}
                data-testid="fame-inner-border"
                fill="none"
                stroke={PALETTE.marqueeRed}
                strokeLinejoin="round"
                strokeWidth="5.2"
                style={{ transformOrigin: "32px 32px" }}
                transform="scale(0.76)"
              />
            )}

            {tier === 5 && (
              <circle
                cx="32"
                cy="32"
                r="22.5"
                data-testid="fame-stitch-ring"
                fill="none"
                stroke={PALETTE.marqueeRed}
                strokeDasharray="2.2 4.4"
                strokeLinecap="round"
                strokeWidth="2.8"
              />
            )}
          </>
        )}
      </svg>

      {showCount && <div style={countStyle}>{tier}/5</div>}
    </div>
  );
}
