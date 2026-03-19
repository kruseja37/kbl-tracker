import type { AtBatEvent } from "../../../utils/eventLog";

interface WinProbChartProps {
  atBatEvents: AtBatEvent[];
}

const SVG_WIDTH = 720;
const SVG_HEIGHT = 260;
const PADDING = { top: 20, right: 20, bottom: 34, left: 44 };

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, value));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function WinProbChart({ atBatEvents }: WinProbChartProps) {
  if (atBatEvents.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center border-[4px] border-[#2f3746] bg-[#0f1116] px-4 text-center text-[9px] leading-5 text-[#9EA7B8]">
        WIN PROBABILITY DATA NOT AVAILABLE FOR THIS GAME.
      </div>
    );
  }

  const plotWidth = SVG_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;
  const domainMax = Math.max(atBatEvents.length, 1);

  const points = atBatEvents.map((event, index) => {
    const x = PADDING.left + (index / domainMax) * plotWidth;
    const probability = clampProbability(event.winProbabilityBefore);
    const y = PADDING.top + (1 - probability) * plotHeight;

    return {
      x,
      y,
      probability,
      event,
      notable: Math.abs(event.wpa) > 0.15,
    };
  });

  const lastEvent = atBatEvents[atBatEvents.length - 1];
  const finalPoint = {
    x: PADDING.left + plotWidth,
    y: PADDING.top + (1 - clampProbability(lastEvent.winProbabilityAfter)) * plotHeight,
    probability: clampProbability(lastEvent.winProbabilityAfter),
  };

  const linePath = [...points, finalPoint]
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const horizontalTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="overflow-hidden border-[4px] border-[#2f3746] bg-[#0f1116] p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.45)]">
      <div className="mb-3 flex items-center justify-between gap-3 text-[8px] uppercase tracking-[0.25em] text-[#AAB4C8]">
        <span>HOME TEAM WIN PROBABILITY</span>
        <span>{formatPercent(finalPoint.probability)}</span>
      </div>

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Home team win probability chart"
      >
        <rect x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} fill="#0f1116" />

        {horizontalTicks.map((tick) => {
          const y = PADDING.top + (1 - tick) * plotHeight;
          const isMidline = tick === 0.5;

          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={SVG_WIDTH - PADDING.right}
                y1={y}
                y2={y}
                stroke={isMidline ? "#7D8798" : "#273041"}
                strokeWidth={isMidline ? 2 : 1}
                strokeDasharray={isMidline ? "6 6" : "3 8"}
              />
              <text
                x={PADDING.left - 10}
                y={y + 3}
                textAnchor="end"
                fill="#AAB4C8"
                fontSize="10"
                fontFamily="monospace"
              >
                {formatPercent(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={PADDING.left}
          x2={SVG_WIDTH - PADDING.right}
          y1={SVG_HEIGHT - PADDING.bottom}
          y2={SVG_HEIGHT - PADDING.bottom}
          stroke="#AAB4C8"
          strokeWidth="1.5"
        />
        <line
          x1={PADDING.left}
          x2={PADDING.left}
          y1={PADDING.top}
          y2={SVG_HEIGHT - PADDING.bottom}
          stroke="#AAB4C8"
          strokeWidth="1.5"
        />

        <path
          d={linePath}
          fill="none"
          stroke="#E0E0E0"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points
          .filter((point) => point.notable)
          .map((point) => (
            <circle
              key={point.event.eventId}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#D8A84A"
              stroke="#0f1116"
              strokeWidth="2"
            />
          ))}

        <circle
          cx={finalPoint.x}
          cy={finalPoint.y}
          r="4"
          fill="#E0E0E0"
          stroke="#0f1116"
          strokeWidth="2"
        />

        <text
          x={SVG_WIDTH / 2}
          y={SVG_HEIGHT - 8}
          textAnchor="middle"
          fill="#AAB4C8"
          fontSize="10"
          fontFamily="monospace"
        >
          AT-BAT SEQUENCE
        </text>
      </svg>
    </div>
  );
}
