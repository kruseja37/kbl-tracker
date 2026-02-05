/**
 * LineupPreview Component
 *
 * Read-only display of a team's batting lineup for pre-game confirmation.
 * Shows batting order 1-9 with player name, position, and batting hand.
 * Also shows starting pitcher.
 */

import type { Player as RosterPlayer, Pitcher as RosterPitcher } from './TeamRoster';

interface LineupPreviewProps {
  teamName: string;
  lineup: RosterPlayer[];         // Players with battingOrder defined
  bench: RosterPlayer[];          // Players without battingOrder
  startingPitcher?: RosterPitcher;
  teamColor: string;
  teamBorderColor?: string;
  isAway?: boolean;
}

export function LineupPreview({
  teamName,
  lineup,
  bench,
  startingPitcher,
  teamColor,
  teamBorderColor = '#E8E8D8',
  isAway = false,
}: LineupPreviewProps) {
  // Sort lineup by batting order
  const sortedLineup = [...lineup].sort(
    (a, b) => (a.battingOrder || 0) - (b.battingOrder || 0)
  );

  return (
    <div
      className="bg-[#4A6A42] border-4 p-3"
      style={{ borderColor: teamBorderColor }}
    >
      {/* Team Header */}
      <div
        className="text-sm font-bold mb-3 pb-2 border-b-2"
        style={{
          color: teamColor,
          borderColor: teamBorderColor,
          textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
        }}
      >
        {isAway ? '▲' : '▼'} {teamName}
      </div>

      {/* Batting Order */}
      <div className="space-y-1 mb-3">
        {sortedLineup.map((player) => (
          <div
            key={player.name}
            className="flex items-center justify-between bg-[#5A7A52] px-2 py-1.5 border border-[#E8E8D8]"
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold text-[#C4A853] w-4"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                #{player.battingOrder}
              </span>
              <span
                className="text-[10px] text-[#E8E8D8] font-bold"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                {player.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[8px] text-[#E8E8D8]/80"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                {player.position} • {player.battingHand}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Starting Pitcher */}
      {startingPitcher && (
        <div className="mb-3">
          <div
            className="text-[8px] text-[#C4A853] font-bold mb-1"
            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
          >
            STARTING PITCHER
          </div>
          <div className="flex items-center justify-between bg-[#5A7A52] px-2 py-1.5 border-2 border-[#C4A853]">
            <span
              className="text-[10px] text-[#E8E8D8] font-bold"
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
            >
              {startingPitcher.name}
            </span>
            <span
              className="text-[8px] text-[#E8E8D8]/80"
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
            >
              P • {startingPitcher.throwingHand}
            </span>
          </div>
        </div>
      )}

      {/* Bench */}
      {bench.length > 0 && (
        <div>
          <div
            className="text-[8px] text-[#E8E8D8]/60 font-bold mb-1"
            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
          >
            BENCH ({bench.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {bench.slice(0, 5).map((player) => (
              <span
                key={player.name}
                className="text-[7px] text-[#E8E8D8]/60 bg-[#3A5A32] px-1.5 py-0.5 rounded"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                {player.name.split(' ').pop()}
              </span>
            ))}
            {bench.length > 5 && (
              <span className="text-[7px] text-[#E8E8D8]/40">
                +{bench.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
