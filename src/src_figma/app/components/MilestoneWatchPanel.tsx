/**
 * MilestoneWatchPanel
 *
 * Displays approaching milestones for players before a game.
 * Shows career and season milestones that are reachable in the upcoming game.
 */

import type { MilestoneWatch } from '../../../utils/milestoneDetector';

interface MilestoneWatchPanelProps {
  watches: MilestoneWatch[];
  isLoading?: boolean;
}

export function MilestoneWatchPanel({ watches, isLoading = false }: MilestoneWatchPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-[#3A5A32] border border-[#E8E8D8]/30 p-3 rounded">
        <div className="text-[10px] text-[#C4A853] font-bold mb-2"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          MILESTONE WATCH
        </div>
        <div className="text-[9px] text-[#E8E8D8]/50">Loading...</div>
      </div>
    );
  }

  if (watches.length === 0) {
    return null; // Don't show panel if no milestones approaching
  }

  return (
    <div className="bg-[#3A5A32] border border-[#C4A853]/50 p-3 rounded">
      <div className="text-[10px] text-[#C4A853] font-bold mb-2"
        style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
        MILESTONE WATCH
      </div>
      <div className="space-y-1.5">
        {watches.slice(0, 5).map((watch, i) => (
          <div
            key={`${watch.playerId}-${watch.statName}-${watch.threshold}`}
            className="flex items-center justify-between bg-[#4A6A42] px-2 py-1 border border-[#E8E8D8]/20 rounded"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#E8E8D8] font-bold truncate"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  {watch.playerName}
                </span>
                <span className={`text-[7px] px-1 py-0.5 rounded font-bold ${
                  watch.category === 'career'
                    ? 'bg-[#C4A853]/30 text-[#C4A853]'
                    : 'bg-[#6B8A63]/50 text-[#E8E8D8]/70'
                }`}>
                  {watch.category.toUpperCase()}
                </span>
              </div>
              <div className="text-[8px] text-[#E8E8D8]/60"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {watch.description}
              </div>
            </div>
            <div className="text-right ml-2">
              <div className="text-[11px] font-bold text-[#C4A853]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {watch.neededForMilestone}
              </div>
              <div className="text-[7px] text-[#E8E8D8]/40">
                needed
              </div>
            </div>
          </div>
        ))}
        {watches.length > 5 && (
          <div className="text-[8px] text-[#E8E8D8]/40 text-center">
            +{watches.length - 5} more approaching
          </div>
        )}
      </div>
    </div>
  );
}
