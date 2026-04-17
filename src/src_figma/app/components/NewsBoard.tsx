import React from 'react';

import type { BeatReporter } from '../../../types/reporter';
import {
  CommentaryFeed,
  type CommentaryFeedEntry,
} from './CommentaryFeed';

interface NewsBoardProps {
  currentBatterName: string;
  currentBatterLine: string; // e.g., "2-for-3, 1 HR, 2 RBI"
  currentPitcherName: string;
  currentPitcherLine: string; // e.g., "6.1 IP, 3 H, 1 ER, 7 K"
  matchupSummary?: string; // e.g., "vs Bender: 3-for-12, 1 HR, 5 K"
  commentaryEntries?: CommentaryFeedEntry[];
  reporters?: Record<string, BeatReporter>;
  reporterTeamColors?: Record<string, { primary: string; secondary: string }>;
  soundsOn?: boolean;
  onPlayTypeSound?: () => void;
}

/** §6: NewsBoard — pinned stats header + scrollable beat reporter feed. Display only, NO click handlers. */
export function NewsBoard({
  currentBatterName,
  currentBatterLine,
  currentPitcherName,
  currentPitcherLine,
  matchupSummary,
  commentaryEntries = [],
  reporters = {},
  reporterTeamColors = {},
  soundsOn = false,
  onPlayTypeSound,
}: NewsBoardProps) {
  return (
    <div className="bg-[#364038] flex h-full min-h-0 flex-col overflow-hidden">
      {/* §6.1: Pinned header — batter line, pitcher line, matchup */}
      {/* Header row — matches lineup header height */}
      <div className="bg-[#243028] px-2 pt-1.5 pb-1 flex-shrink-0">
        <div className="text-[10px] text-[#88AA88] font-bold tracking-wider">MATCHUP</div>
      </div>

      {/* Content area with recessed border */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-r-[3px] border-[#252b27]" style={{ boxShadow: 'inset 0 0 4px rgba(0,0,0,0.25)' }}>
        {/* §6.1: Pinned stats — batter line, pitcher line, matchup */}
        <div className="bg-[#243028] border-b border-[#3d5240] px-2 pt-1 pb-1.5 flex-shrink-0">
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

        {/* §6.3: Scrollable beat reporter feed */}
        <div
          className="flex-1 min-h-0 max-h-full overflow-y-auto px-2 py-1.5"
          style={{ maxHeight: "100%" }}
        >
          <CommentaryFeed
            entries={commentaryEntries}
            reporters={reporters}
            reporterTeamColors={reporterTeamColors}
            soundsOn={soundsOn}
            onPlayTypeSound={onPlayTypeSound}
          />
        </div>
      </div>
    </div>
  );
}

export default NewsBoard;
