import React from 'react';

interface ScoreBugProps {
  awayTeamName: string;
  awayScore: number;
  homeTeamName: string;
  homeScore: number;
  stadiumName?: string;
  inning: number;
  isTop: boolean;
  outs: number;
  bases: { first: boolean; second: boolean; third: boolean };
  isManagerMoment?: boolean;
  saveError?: boolean;
  isSaving?: boolean;
  gameSoundsOn?: boolean;
  beatReporterSoundsOn?: boolean;
  onTap: () => void;
  onToggleGameSounds?: () => void;
  onToggleBeatReporter?: () => void;
  /** §3.5: Stay the Course — passive manager moment decision */
  onStayTheCourse?: () => void;
  /** §5.3: Callback when Ⓜ indicator is tapped to open manager moment panel */
  onManagerMomentTap?: () => void;
}

/** §3.2: Compact diamond graphic — TV broadcast style base-state indicator */
function BaseStateDiamond({ bases }: { bases: { first: boolean; second: boolean; third: boolean } }) {
  const size = 8;
  const filled = '#F2BF16';
  const empty = '#2a3a3d';
  const border = '#2d4030';
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" className="flex-shrink-0">
      {/* Second base (top) */}
      <rect x={12 - size/2} y={2} width={size} height={size} rx={1}
        transform={`rotate(45, 12, ${2 + size/2})`}
        fill={bases.second ? filled : empty} stroke={border} strokeWidth={1} />
      {/* Third base (left) */}
      <rect x={4 - size/2 + 2} y={10} width={size} height={size} rx={1}
        transform={`rotate(45, ${4 - size/2 + 2 + size/2}, ${10 + size/2})`}
        fill={bases.third ? filled : empty} stroke={border} strokeWidth={1} />
      {/* First base (right) */}
      <rect x={20 - size/2 - 2} y={10} width={size} height={size} rx={1}
        transform={`rotate(45, ${20 - size/2 - 2 + size/2}, ${10 + size/2})`}
        fill={bases.first ? filled : empty} stroke={border} strokeWidth={1} />
    </svg>
  );
}

/** §3.3: Outs indicator — 3 filled/empty circles */
function OutsIndicator({ outs }: { outs: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: i < outs ? '#FF3C3C' : '#2a3a3d',
            border: `1.5px solid ${i < outs ? '#BE1E1E' : '#2d4030'}`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * §3.1 Score Bug — Single horizontal line, pinned top of GameTracker.
 * Tappable to expand/collapse the retro Fenway scoreboard overlay (§2.4).
 */
export function ScoreBug({
  awayTeamName,
  awayScore,
  homeTeamName,
  homeScore,
  stadiumName,
  inning,
  isTop,
  outs,
  bases,
  isManagerMoment,
  saveError,
  isSaving,
  gameSoundsOn = false,
  beatReporterSoundsOn = false,
  onTap,
  onToggleGameSounds,
  onToggleBeatReporter,
  onStayTheCourse,
  onManagerMomentTap,
}: ScoreBugProps) {
  const [awayScoreFlashKey, setAwayScoreFlashKey] = React.useState(0);
  const [homeScoreFlashKey, setHomeScoreFlashKey] = React.useState(0);
  const previousScores = React.useRef({ awayScore, homeScore });
  const hasSaveError = saveError ?? (isSaving === false);

  React.useEffect(() => {
    if (awayScore !== previousScores.current.awayScore) {
      setAwayScoreFlashKey((value) => value + 1);
    }

    if (homeScore !== previousScores.current.homeScore) {
      setHomeScoreFlashKey((value) => value + 1);
    }

    previousScores.current = { awayScore, homeScore };
  }, [awayScore, homeScore]);

  const halfIndicator = isTop ? 'T' : 'B';

  return (
    <div
      onClick={onTap}
      className="flex-shrink-0 bg-[#3d4a42] px-3 py-1.5
                 flex items-center justify-between gap-4 w-full cursor-pointer select-none
                 hover:bg-[#455550] active:bg-[#354040] transition-colors"
      style={{ fontFamily: "'Moms Typewriter', monospace" }}
    >
      <style>{`
        @keyframes scorebug-score-flash {
          0% {
            color: #f3f5f2;
            transform: scale(1);
          }
          35% {
            color: #ffffff;
            transform: scale(1.12);
          }
          100% {
            color: #F2C041;
            transform: scale(1);
          }
        }
      `}</style>
      <div className="flex min-w-0 flex-1 items-center justify-start gap-4">
        {/* Away team + score */}
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`text-[15px] font-black tracking-wider ${isTop ? 'text-[#E8E8D8]' : 'text-[#88AA88]'}`}>
            {isTop ? '▶' : '\u00A0\u00A0'}
          </span>
          <span
            className="text-[16px] font-black text-[#E8E8D8] tracking-wide whitespace-nowrap"
          >
            {awayTeamName}
          </span>
          <span
            key={`away-score-${awayScoreFlashKey}`}
            className="text-[18px] font-black text-[#F2C041] min-w-[16px] text-center inline-block"
            style={{
              ...(awayScoreFlashKey > 0 ? { animation: 'scorebug-score-flash 200ms ease-out' } : undefined),
            }}
          >
            {awayScore}
          </span>
        </div>

        {/* Inning indicator */}
        <span className="text-[16px] font-black text-[#E8E8D8] tracking-wider min-w-[28px] text-center flex-shrink-0">
          {halfIndicator}{inning}
        </span>

        {/* Home team + score */}
        <div className="flex min-w-0 items-center justify-start gap-1.5">
          <span className={`text-[15px] font-black tracking-wider ${!isTop ? 'text-[#E8E8D8]' : 'text-[#88AA88]'}`}>
            {!isTop ? '▶' : '\u00A0\u00A0'}
          </span>
          <span
            className="text-[16px] font-black text-[#E8E8D8] tracking-wide whitespace-nowrap"
          >
            {homeTeamName}
          </span>
          <span
            key={`home-score-${homeScoreFlashKey}`}
            className="text-[18px] font-black text-[#F2C041] min-w-[16px] text-center inline-block"
            style={{
              ...(homeScoreFlashKey > 0 ? { animation: 'scorebug-score-flash 200ms ease-out' } : undefined),
            }}
          >
            {homeScore}
          </span>
        </div>

        {/* §3.2 Base-state indicator + §3.3 Outs indicator */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <BaseStateDiamond bases={bases} />
          <OutsIndicator outs={outs} />
        </div>

        {stadiumName ? (
          <span className="ml-auto flex-shrink-0 text-right text-[14px] font-bold tracking-wide text-[#CBB89C] whitespace-nowrap">
            {stadiumName}
          </span>
        ) : (
          null
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* §3.6 Save indicator */}
        <span
          className={`text-[14px] ${hasSaveError ? 'text-[#fbbf24]' : 'text-[#88AA88]'}`}
          title={hasSaveError ? 'Save warning' : 'Auto-save active'}
        >
          {hasSaveError ? '⚠' : '✓'}
        </span>

        {/* §3.5 Manager Moment indicator — enhanced with glow when active */}
        {isManagerMoment ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onManagerMomentTap}
              className="text-[16px] text-[#FFD700] font-bold animate-pulse
                         bg-[#FFD700]/15 border border-[#FFD700]/50 rounded px-1
                         hover:bg-[#FFD700]/25 active:scale-95 transition-transform"
              title="Manager Moment — tap to decide"
            >
              Ⓜ
            </button>
            {onStayTheCourse && (
              <button
                onClick={onStayTheCourse}
                className="text-[12px] text-[#E8E8D8] font-bold tracking-wider
                           bg-[#5A8352] border border-[#4A6844] rounded px-1.5 py-0.5
                           hover:bg-[#4F7D4B] active:scale-95 transition-transform"
                title="Stay the Course — no action needed"
              >
                STAY
              </button>
            )}
          </div>
        ) : (
          <span className="text-[14px] text-[#48604A]" title="No manager moment">
            Ⓜ
          </span>
        )}

        {/* §3.7 Audio toggles */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleGameSounds}
            className={`text-[15px] border rounded px-1 py-0.5 transition-colors ${
              gameSoundsOn
                ? 'text-[#E8E8D8] border-[#C4A853] bg-[#C4A853]/20'
                : 'text-[#48604A] border-[#48604A]/60 bg-transparent'
            }`}
            title={gameSoundsOn ? 'Game sounds on' : 'Game sounds off'}
          >
            🔊
          </button>
          <button
            type="button"
            onClick={onToggleBeatReporter}
            className={`text-[15px] border rounded px-1 py-0.5 transition-colors ${
              beatReporterSoundsOn
                ? 'text-[#E8E8D8] border-[#88AA88] bg-[#88AA88]/20'
                : 'text-[#48604A] border-[#48604A]/60 bg-transparent'
            }`}
            title={beatReporterSoundsOn ? 'Beat reporter sounds on' : 'Beat reporter sounds off'}
          >
            📰
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScoreBug;
