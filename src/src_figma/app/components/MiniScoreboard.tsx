import React from 'react';
import { ChevronDown } from 'lucide-react';

interface MiniScoreboardProps {
  awayTeamName: string;
  homeTeamName: string;
  awayRuns: number;
  homeRuns: number;
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
  inning,
  isTop,
  outs,
  onExpand,
}) => {
  const inningIndicator = isTop ? '▲' : '▼';

  return (
    <div className="bg-[#556B55] border-b-[4px] border-[#3d5240] px-4 py-1 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-4 bg-[rgb(133,181,229)] border-[3px] border-[#1a3020] px-4 py-1.5">
          {/* Away Team */}
          <div className="flex items-center gap-2">
            <span className="text-[#1a3020] text-sm font-bold tracking-wide">{awayTeamName}</span>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] px-3 py-0.5 min-w-[36px] text-center">
              <span className="text-[#E8E8D8] text-lg font-bold">{awayRuns}</span>
            </div>
          </div>

          {/* Divider */}
          <span className="text-[#1a3020] text-lg font-bold">│</span>

          {/* Inning */}
          <div className="flex items-center gap-1">
            <span className="text-[#1a3020] text-lg font-bold">{inningIndicator}</span>
            <span className="text-[#1a3020] text-lg font-bold">{inning}</span>
          </div>

          {/* Divider */}
          <span className="text-[#1a3020] text-lg font-bold">│</span>

          {/* Outs */}
          <div className="flex items-center gap-1">
            <span className="text-[#1a3020] text-xs font-bold">O:</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 ${
                    i < outs
                      ? 'bg-[#DC3545] border-[#8B0000]'
                      : 'bg-[#1a1a1a] border-[#2a3a2d]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <span className="text-[#1a3020] text-lg font-bold">│</span>

          {/* Home Team */}
          <div className="flex items-center gap-2">
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] px-3 py-0.5 min-w-[36px] text-center">
              <span className="text-[#E8E8D8] text-lg font-bold">{homeRuns}</span>
            </div>
            <span className="text-[#1a3020] text-sm font-bold tracking-wide">{homeTeamName}</span>
          </div>

          {/* Expand Button */}
          <button
            onClick={onExpand}
            className="ml-4 flex items-center gap-1 px-2 py-0.5 bg-[#3d5240] border-2 border-[#2a3a2d] hover:bg-[#4a6a4a] transition-colors"
            title="Expand Scoreboard"
          >
            <ChevronDown className="w-4 h-4 text-[#E8E8D8]" />
            <span className="text-[#E8E8D8] text-xs font-bold">EXPAND</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniScoreboard;
