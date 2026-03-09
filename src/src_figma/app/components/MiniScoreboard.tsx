import React from 'react';
import { ChevronDown } from 'lucide-react';

function abbreviateTeamName(name: string): string {
  const cleaned = name.trim().toUpperCase();
  if (cleaned.length <= 4) return cleaned;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const initials = words.map((word) => word[0]).join('');
    if (initials.length >= 2 && initials.length <= 4) return initials;
  }
  return cleaned.slice(0, 4);
}

interface MiniScoreboardProps {
  awayTeamName: string;
  homeTeamName: string;
  awayRuns: number;
  homeRuns: number;
  awayErrors: number;
  homeErrors: number;
  inning: number;
  isTop: boolean;
  outs: number;
  onExpand: () => void;
}

/**
 * Compact single-row scoreboard for maximizing field space.
 * Shows: Away Score | Inning (▲/▼) | Outs | Home Score | Expand Button
 * Height: 40px (vs 240px full scoreboard)
 */
export const MiniScoreboard: React.FC<MiniScoreboardProps> = ({
  awayTeamName,
  homeTeamName,
  awayRuns,
  homeRuns,
  awayErrors,
  homeErrors,
  inning,
  isTop,
  outs,
  onExpand,
}) => {
  const inningIndicator = isTop ? '▲' : '▼';
  const awayLabel = abbreviateTeamName(awayTeamName);
  const homeLabel = abbreviateTeamName(homeTeamName);

  return (
    <div className="bg-[#556B55] border-[4px] border-[#3d5240] px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.35)]">
      <div>
        <div className="flex items-center justify-between gap-2 bg-[rgb(133,181,229)] border-[3px] border-[#1a3020] px-3 py-1.5">
          {/* Away Team */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[#1a3020] text-xs font-bold tracking-wide truncate">{awayLabel}</span>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] px-2 py-0.5 min-w-[32px] text-center">
              <span className="text-[#E8E8D8] text-base font-bold">{awayRuns}</span>
            </div>
            {awayErrors > 0 && (
              <span className="text-[#DC3545] text-[10px] font-bold flex-shrink-0">E:{awayErrors}</span>
            )}
          </div>

          {/* Inning */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[#1a3020] text-base font-bold">{inningIndicator}</span>
            <span className="text-[#1a3020] text-base font-bold">{inning}</span>
          </div>

          {/* Outs */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[#1a3020] text-[10px] font-bold">O:</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border-2 ${
                    i < outs
                      ? 'bg-[#DC3545] border-[#8B0000]'
                      : 'bg-[#1a1a1a] border-[#2a3a2d]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Home Team */}
          <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
            {homeErrors > 0 && (
              <span className="text-[#DC3545] text-[10px] font-bold flex-shrink-0">E:{homeErrors}</span>
            )}
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] px-2 py-0.5 min-w-[32px] text-center">
              <span className="text-[#E8E8D8] text-base font-bold">{homeRuns}</span>
            </div>
            <span className="text-[#1a3020] text-xs font-bold tracking-wide truncate">{homeLabel}</span>
          </div>

          {/* Expand Button */}
          <button
            onClick={onExpand}
            className="ml-1 flex items-center gap-1 px-2 py-0.5 bg-[#3d5240] border-2 border-[#2a3a2d] hover:bg-[#4a6a4a] transition-colors flex-shrink-0"
            title="Toggle field zoom"
          >
            <ChevronDown className="w-3.5 h-3.5 text-[#E8E8D8]" />
            <span className="text-[#E8E8D8] text-[10px] font-bold">ZOOM</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniScoreboard;
