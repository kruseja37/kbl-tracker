import React from 'react';

interface DefensiveLineupPlayer {
  playerId: string;
  name: string;
  position?: string;
  battingOrder: number;
  isPitcher: boolean;
  pitchCount?: number;
}

// UX-024: Position number lookup for enrichment mode
const POSITION_TO_NUMBER: Record<string, number> = {
  P: 1, C: 2, '1B': 3, '2B': 4, '3B': 5, SS: 6, LF: 7, CF: 8, RF: 9,
};

/** §5.4: Enrichment mode config — passed from GameTracker when enriching fielding sequence */
export interface DefensiveEnrichmentMode {
  active: boolean;
  sequence: number[];
  onFielderTap: (posNum: number) => void;
  onDone: () => void;
  onClear: () => void;
}

interface DefensiveLineupColumnProps {
  players: DefensiveLineupPlayer[];
  currentPitcherName: string;
  nextLeadoffIndex: number; // 1-based batting order of next inning's leadoff
  teamPrimaryColor: string;
  teamSecondaryColor: string;
  onPlayerTap: (playerId: string, playerName: string) => void;
  /** §5.4: When set, column toggles into fielding sequence enrichment mode */
  enrichmentMode?: DefensiveEnrichmentMode;
}

/** §5.3: Defensive Lineup Column — ordered by batting order, 9 players always visible */
export function DefensiveLineupColumn({
  players,
  currentPitcherName,
  nextLeadoffIndex,
  teamPrimaryColor,
  teamSecondaryColor,
  onPlayerTap,
  enrichmentMode,
}: DefensiveLineupColumnProps) {
  const isEnriching = enrichmentMode?.active ?? false;

  return (
    <div className="bg-[#2a3a2d] border border-[#3d5240] flex flex-col h-full">
      {/* Header — switches between DEFENSE and FIELDING SEQUENCE */}
      <div className={`text-[10px] font-bold tracking-wider px-2 pt-1.5 pb-1 border-b border-[#3d5240] ${
        isEnriching ? 'text-[#C4A853]' : 'text-[#88AA88]'
      }`}>
        {isEnriching ? 'FIELDING SEQUENCE' : 'DEFENSE'}
      </div>

      {/* Sequence display + controls when enriching */}
      {isEnriching && enrichmentMode && (
        <div className="px-2 py-1 border-b border-[#4a6a4a] bg-[#1a2a1d]">
          <div className="text-[9px] text-[#E8E8D8] font-mono min-h-[14px]">
            {enrichmentMode.sequence.length > 0
              ? enrichmentMode.sequence.join(' → ')
              : <span className="text-[#6b7280] italic">Tap fielders below</span>}
          </div>
          <div className="flex gap-1 mt-1">
            <button
              onClick={enrichmentMode.onDone}
              className="text-[7px] text-[#34d399] bg-[#064e3b]/60 border border-[#34d399]/40 px-2 py-0.5 rounded hover:bg-[#064e3b]"
            >
              Done
            </button>
            <button
              onClick={enrichmentMode.onClear}
              disabled={enrichmentMode.sequence.length === 0}
              className="text-[7px] text-[#f87171] bg-[#7f1d1d]/30 border border-[#f87171]/30 px-2 py-0.5 rounded hover:bg-[#7f1d1d]/50 disabled:opacity-30"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 justify-evenly">
        {players.map((player) => {
          const isPitching = player.name === currentPitcherName;
          const isNextLeadoff = player.battingOrder === nextLeadoffIndex && !isPitching;
          const posNum = POSITION_TO_NUMBER[player.position || ''] || 0;
          // In enrichment mode, highlight positions already in the sequence
          const isInSequence = isEnriching && posNum > 0 && enrichmentMode!.sequence.includes(posNum);

          const handleClick = () => {
            if (isEnriching && posNum > 0) {
              enrichmentMode!.onFielderTap(posNum);
            } else {
              onPlayerTap(player.playerId, player.name);
            }
          };

          return (
            <button
              key={player.playerId}
              onClick={handleClick}
              className={`text-left px-2 py-0.5 transition-colors ${
                isEnriching
                  ? 'hover:bg-[#C4A853]/20 active:bg-[#C4A853]/30'
                  : 'hover:bg-[#3d5240]/50 active:bg-[#3d5240]'
              }`}
              style={{
                borderLeft: isEnriching
                  ? isInSequence
                    ? '3px solid #C4A853'
                    : '3px solid transparent'
                  : undefined,
                border: !isEnriching
                  ? isPitching
                    ? `2px solid ${teamPrimaryColor}`
                    : isNextLeadoff
                      ? `2px dotted ${teamSecondaryColor}`
                      : '2px solid transparent'
                  : undefined,
              }}
            >
              {/* Top row: order + position + name */}
              <div className={`text-[9px] leading-tight tracking-wide font-bold ${
                isEnriching && isInSequence ? 'text-[#C4A853]' : 'text-[#E8E8D8]'
              }`}>
                <span className="text-[#88AA88] mr-0.5">{player.battingOrder}.</span>
                {player.position && (
                  <span className={`mr-1 ${isEnriching ? 'text-[#C4A853]' : 'text-[#C4A853]'}`}>
                    {player.position}
                  </span>
                )}
                <span>{player.name}</span>
              </div>
              {/* Bottom row: in enrichment mode show position number, else pitch count / dash */}
              <div className="text-[7px] text-[#6b7b6e] leading-tight">
                {isEnriching
                  ? posNum > 0
                    ? <span className="text-[#C4A853]/60">#{posNum}</span>
                    : '—'
                  : player.isPitcher && player.pitchCount !== undefined
                    ? `PC: ${player.pitchCount}`
                    : '—'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DefensiveLineupColumn;
