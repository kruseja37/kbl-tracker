import React from 'react';
import { MiniScoreboard } from './MiniScoreboard';

interface FenwayBoardProps {
  awayTeamName: string;
  homeTeamName: string;
  awayRuns: number;
  homeRuns: number;
  awayErrors: number;
  homeErrors: number;
  inning: number;
  isTop: boolean;
  outs: number;
  // Current batter/pitcher context (shell — wired later)
  currentBatterName?: string;
  currentPitcherName?: string;
}

/**
 * Fenway Board — Top-left zone of the 5-zone GameTracker layout (§3.7).
 * Contains: scoreboard, pitcher context, batter context, matchup history, milestone proximity.
 * For now: renders MiniScoreboard in compact mode. Later sessions add context cards.
 */
export function FenwayBoard({
  awayTeamName,
  homeTeamName,
  awayRuns,
  homeRuns,
  awayErrors,
  homeErrors,
  inning,
  isTop,
  outs,
  currentBatterName,
  currentPitcherName,
}: FenwayBoardProps) {
  return (
    <div className="bg-[#556B55] border-[3px] border-[#3d5240] h-full overflow-hidden flex flex-col">
      {/* Compact scoreboard — no expand/collapse in grid mode */}
      <div className="bg-[rgb(133,181,229)] border-b-[3px] border-[#1a3020] px-3 py-1.5">
        <div className="flex items-center justify-center gap-3">
          {/* Away */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#1a3020] text-xs font-bold tracking-wide">{awayTeamName}</span>
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] px-2 py-0.5 min-w-[28px] text-center">
              <span className="text-[#E8E8D8] text-sm font-bold">{awayRuns}</span>
            </div>
            {awayErrors > 0 && (
              <span className="text-[#DC3545] text-[9px] font-bold">E:{awayErrors}</span>
            )}
          </div>

          <span className="text-[#1a3020] text-sm font-bold">|</span>

          {/* Inning + Outs */}
          <div className="flex items-center gap-1">
            <span className="text-[#1a3020] text-sm font-bold">{isTop ? '▲' : '▼'}{inning}</span>
            <div className="flex gap-0.5 ml-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-[1.5px] ${
                    i < outs
                      ? 'bg-[#DC3545] border-[#8B0000]'
                      : 'bg-[#1a1a1a] border-[#2a3a2d]'
                  }`}
                />
              ))}
            </div>
          </div>

          <span className="text-[#1a3020] text-sm font-bold">|</span>

          {/* Home */}
          <div className="flex items-center gap-1.5">
            {homeErrors > 0 && (
              <span className="text-[#DC3545] text-[9px] font-bold">E:{homeErrors}</span>
            )}
            <div className="bg-[#3d5240] border-2 border-[#2a3a2d] px-2 py-0.5 min-w-[28px] text-center">
              <span className="text-[#E8E8D8] text-sm font-bold">{homeRuns}</span>
            </div>
            <span className="text-[#1a3020] text-xs font-bold tracking-wide">{homeTeamName}</span>
          </div>
        </div>
      </div>

      {/* Batter/Pitcher context — shell for now */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {/* Batter context card */}
        <div className="bg-[#3d5240] border-2 border-[#2a3a2d] p-2">
          <div className="text-[8px] text-[#88AA88] font-bold tracking-wider">▶ AT BAT</div>
          <div className="text-xs text-[#E8E8D8] font-bold">{currentBatterName || '—'}</div>
          {/* TODO: AVG, HR, Mojo, milestone proximity, vs pitcher history */}
        </div>

        {/* Pitcher context card */}
        <div className="bg-[#3d5240] border-2 border-[#2a3a2d] p-2">
          <div className="text-[8px] text-[#88AA88] font-bold tracking-wider">PITCHING</div>
          <div className="text-xs text-[#E8E8D8] font-bold">{currentPitcherName || '—'}</div>
          {/* TODO: PC, ERA, Mojo, pitch repertoire */}
        </div>

        {/* TODO: Matchup history card */}
        {/* TODO: Milestone proximity card */}
      </div>
    </div>
  );
}

export default FenwayBoard;
