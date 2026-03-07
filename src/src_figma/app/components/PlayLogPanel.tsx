import React from 'react';

interface PlayLogPanelProps {
  entries: string[];
}

/**
 * Play Log — Right panel of the 5-zone GameTracker layout (§3.7).
 * Displays activity log entries, most recent at top. Scrollable.
 * Future sessions will add enrichment badges ([+ fielding], [+ location])
 * and tap-to-enrich functionality per §4.2.
 */
export function PlayLogPanel({ entries }: PlayLogPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#3d5240] border-l-[3px] border-[#2a3a2d] flex flex-col">
      {/* Header */}
      <div className="bg-[#2a3a2d] border-b-[2px] border-[#1a2a1d] px-2 py-1.5 sticky top-0 z-10">
        <div className="text-[#C4A853] text-[9px] font-bold tracking-[0.15em]">PLAY LOG</div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {entries.length === 0 ? (
          <div className="text-[#E8E8D8]/40 text-[10px] text-center py-4 italic">
            No plays yet
          </div>
        ) : (
          [...entries].reverse().map((entry, i) => (
            <div
              key={i}
              className="text-[#E8E8D8] text-[10px] py-1 px-1 border-b border-[#4a6a4a]/30
                         hover:bg-[#4a6a4a]/20 cursor-default leading-tight"
            >
              {entry}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PlayLogPanel;
