import React from 'react';

interface InningLine {
  away: number | undefined;
  home: number | undefined;
}

interface FullFenwayScoreboardProps {
  awayTeamName: string;
  homeTeamName: string;
  awayRecord?: string;
  homeRecord?: string;
  innings: InningLine[];
  awayRuns: number;
  homeRuns: number;
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
  inning: number;
  isTop: boolean;
  outs: number;
  stadiumName?: string | null;
  currentBatterName?: string;
  gameDate?: Date;
  elapsedMinutes?: number;
}

const COLORS = {
  sky: '#2a3530',
  frame: '#1a2420',
  grass: '#3d4a42',
  board: '#364038',
  boardDark: '#2d3530',
  boardCell: '#2a3530',
  boardCellAlt: '#243028',
  cream: '#E8E8D8',
  blackish: '#1a2420',
  yellow: '#F2BF16',
  green: '#00D66B',
  greenBorder: '#009E52',
  red: '#FF3C3C',
  redBorder: '#BE1E1E',
  dim: '#2a3a3d',
} as const;

function abbreviateTeamName(name: string): string {
  const cleaned = name.trim().toUpperCase();
  if (cleaned.length <= 10) return cleaned;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const initials = words.map((word) => word[0]).join('');
    if (initials.length >= 2 && initials.length <= 4) return initials;
  }
  return cleaned.slice(0, 10);
}

function padCellValue(value: number | undefined): string {
  return value === undefined ? '' : `${value}`;
}

function formatElapsed(minutes = 0): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}:00`;
}

function formatGameDate(date?: Date): string {
  if (!date) {
    return '';
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

function CountDots({
  count,
  total,
  fill,
  border,
}: {
  count: number;
  total: number;
  fill: string;
  border: string;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className="h-3.5 w-3.5 rounded-full border-[2px]"
          style={{
            backgroundColor: index < count ? fill : COLORS.dim,
            borderColor: index < count ? border : COLORS.boardDark,
          }}
        />
      ))}
    </div>
  );
}

function TeamRow({
  indicator,
  name,
  innings,
  totals,
  record,
}: {
  indicator: string;
  name: string;
  innings: Array<number | undefined>;
  totals: { runs: number; hits: number; errors: number };
  record?: string;
}) {
  return (
    <div
      className="grid items-center gap-0.5"
      style={{
        gridTemplateColumns: `28px minmax(110px, 1.4fr) repeat(${innings.length}, minmax(20px, 1fr)) repeat(3, minmax(26px, 0.9fr)) minmax(52px, 1fr)`,
      }}
    >
      <div className="text-center text-[11px] font-black text-[#E8E8D8]">{indicator}</div>
      <div className="truncate bg-[#2a3530] px-2 py-1 text-left text-[10px] font-black text-[#E8E8D8]">
        {abbreviateTeamName(name)}
      </div>
      {innings.map((value, index) => (
        <div key={index} className="bg-[#2a3530] py-1 text-center text-[10px] font-black text-[#E8E8D8]">
          {padCellValue(value)}
        </div>
      ))}
      <div className="bg-[#243028] py-1 text-center text-[10px] font-black text-[#E8E8D8]">{totals.runs}</div>
      <div className="bg-[#243028] py-1 text-center text-[10px] font-black text-[#E8E8D8]">{totals.hits}</div>
      <div className="bg-[#243028] py-1 text-center text-[10px] font-black text-[#E8E8D8]">{totals.errors}</div>
      <div className="bg-[#2a3530] py-1 text-center text-[10px] font-black text-[#E8E8D8]">{record || '0-0'}</div>
    </div>
  );
}

export function FullFenwayScoreboard({
  awayTeamName,
  homeTeamName,
  awayRecord,
  homeRecord,
  innings,
  awayRuns,
  homeRuns,
  awayHits,
  homeHits,
  awayErrors,
  homeErrors,
  inning,
  isTop,
  outs,
  stadiumName,
  currentBatterName,
  gameDate,
  elapsedMinutes,
}: FullFenwayScoreboardProps) {
  const displayedInnings = Math.max(10, innings.length, inning);
  const inningLabels = Array.from({ length: displayedInnings }, (_, index) => index + 1);
  const awayLine = inningLabels.map((_, index) => innings[index]?.away);
  const homeLine = inningLabels.map((_, index) => innings[index]?.home);

  return (
    <div
      className="border-b-[4px] border-[#1a2420] bg-[#2a3530] px-3 py-2 text-white shadow-[0_4px_0_0_rgba(0,0,0,0.25)]"
      style={{ fontFamily: "'Moms Typewriter', monospace" }}
    >
      <div className="rounded-[10px] border-[4px] border-[#1a2420] bg-[#3d4a42] p-2 shadow-[inset_0_0_0_2px_rgba(22,51,38,0.35)]">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <button
            type="button"
            disabled
            className="h-10 min-w-[76px] border-[3px] border-[#E8E8D8] bg-[#1a2420] px-3 text-[11px] font-black tracking-[0.16em] text-[#E8E8D8] opacity-70"
            title="MINI toggle reserved for later layout work"
          >
            MINI
          </button>

          <div className="rounded-[8px] border-[4px] border-[#2d3530] bg-[#364038] px-3 py-2">
            <div className="text-center text-[16px] font-black tracking-[0.24em] text-[#E8E8D8]">
              {stadiumName ? stadiumName.toUpperCase() : 'BALLPARK'}
            </div>

            <div className="mt-2 rounded-[6px] border-[3px] border-[#2d3530] bg-[#2d3530] p-2">
              <div
                className="grid items-end gap-0.5 pb-1"
                style={{
                  gridTemplateColumns: `28px minmax(110px, 1.4fr) repeat(${inningLabels.length}, minmax(20px, 1fr)) repeat(3, minmax(26px, 0.9fr)) minmax(52px, 1fr)`,
                }}
              >
                <div className="text-center text-[11px] font-black text-[#E8E8D8]">P</div>
                <div />
                {inningLabels.map((value) => (
                  <div key={value} className="text-center text-[10px] font-black text-[#E8E8D8]">
                    {value}
                  </div>
                ))}
                {['R', 'H', 'E', 'REC'].map((value) => (
                  <div key={value} className="text-center text-[10px] font-black text-[#E8E8D8]">
                    {value}
                  </div>
                ))}
              </div>

              <div className="space-y-0.5">
                <TeamRow
                  indicator={isTop ? '▶' : ''}
                  name={awayTeamName}
                  innings={awayLine}
                  totals={{ runs: awayRuns, hits: awayHits, errors: awayErrors }}
                  record={awayRecord}
                />
                <TeamRow
                  indicator={!isTop ? '▶' : ''}
                  name={homeTeamName}
                  innings={homeLine}
                  totals={{ runs: homeRuns, hits: homeHits, errors: homeErrors }}
                  record={homeRecord}
                />
              </div>

              <div className="my-2 h-[2px] bg-[#E8E8D8]" />

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#E8E8D8]">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black tracking-[0.16em]">AT BAT</span>
                  <div className="min-w-[120px] bg-[#243028] px-2 py-1 text-[11px] font-black">
                    {currentBatterName || '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black tracking-[0.16em]">OUT</span>
                  <CountDots count={outs} total={3} fill={COLORS.red} border={COLORS.redBorder} />
                </div>
                <div className="bg-[#243028] px-2 py-1 text-[10px] font-black">
                  {isTop ? 'TOP' : 'BOT'} {inning}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] font-black tracking-[0.08em] text-[#E8E8D8]">
              <div>{formatGameDate(gameDate)}</div>
              <div>TIME: {formatElapsed(elapsedMinutes)}</div>
            </div>
          </div>

          <div className="h-10 w-10 border-[3px] border-[#1a2420] bg-[#364038] text-center text-[22px] font-black leading-[34px] text-[#E8E8D8]">
            ≡
          </div>
        </div>
      </div>
    </div>
  );
}

export default FullFenwayScoreboard;
