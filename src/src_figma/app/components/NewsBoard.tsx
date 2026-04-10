import React from 'react';

interface NewsBoardProps {
  currentBatterName: string;
  currentBatterLine: string; // e.g., "2-for-3, 1 HR, 2 RBI"
  currentPitcherName: string;
  currentPitcherLine: string; // e.g., "6.1 IP, 3 H, 1 ER, 7 K"
  matchupSummary?: string; // e.g., "vs Bender: 3-for-12, 1 HR, 5 K"
}

/** §6: NewsBoard — pinned stats header + scrollable beat reporter feed. Display only, NO click handlers. */
export function NewsBoard({
  currentBatterName,
  currentBatterLine,
  currentPitcherName,
  currentPitcherLine,
  matchupSummary,
}: NewsBoardProps) {
  return (
    <div className="bg-[#364038] border-r-[3px] border-[#252b27] flex flex-col h-full" style={{ boxShadow: 'inset 0 0 4px rgba(0,0,0,0.25)' }}>
      {/* §6.1: Pinned header — batter line, pitcher line, matchup */}
      <div className="bg-[#243028] border-b border-[#3d5240] px-2 pt-1.5 pb-1.5 flex-shrink-0">
        <div className="text-[10px] text-[#88AA88] font-bold tracking-wider mb-1">MATCHUP</div>

        {/* Current batter game line */}
        <div className="mb-1">
          <div className="text-[8px] text-[#C4A853] font-bold tracking-wider">AT BAT</div>
          <div className="text-[9px] text-[#E8E8D8] font-bold leading-tight">{currentBatterName}</div>
          <div className="text-[8px] text-[#88AA88] leading-tight">{currentBatterLine || '—'}</div>
        </div>

        {/* Current pitcher game line */}
        <div className="mb-1">
          <div className="text-[8px] text-[#C4A853] font-bold tracking-wider">PITCHING</div>
          <div className="text-[9px] text-[#E8E8D8] font-bold leading-tight">{currentPitcherName}</div>
          <div className="text-[8px] text-[#88AA88] leading-tight">{currentPitcherLine || '—'}</div>
        </div>

        {/* Matchup history */}
        {matchupSummary && (
          <div>
            <div className="text-[8px] text-[#C4A853] font-bold tracking-wider">MATCHUP</div>
            <div className="text-[8px] text-[#88AA88] leading-tight">{matchupSummary}</div>
          </div>
        )}
      </div>

      {/* §6.3: Scrollable beat reporter feed — placeholder for now */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        <div className="text-[8px] text-[#6b7b6e] italic">Beat Reporter Feed</div>
      </div>
    </div>
  );
}

export default NewsBoard;
