/**
 * LineupPreview Component
 *
 * Displays a team's batting lineup for pre-game confirmation.
 * Supports optional drag-and-drop reordering when onReorder is provided.
 * Shows batting order 1-9 with player name, position, and batting hand.
 * Also shows starting pitcher and bench.
 */

import { useState } from 'react';
import type { Player as RosterPlayer, Pitcher as RosterPitcher } from './TeamRoster';

interface LineupPreviewProps {
  teamName: string;
  lineup: RosterPlayer[];         // Players with battingOrder defined
  bench: RosterPlayer[];          // Players without battingOrder
  startingPitcher?: RosterPitcher;
  teamColor: string;
  teamBorderColor?: string;
  isAway?: boolean;
  onReorder?: (reorderedLineup: RosterPlayer[]) => void;
}

export function LineupPreview({
  teamName,
  lineup,
  bench,
  startingPitcher,
  teamColor,
  teamBorderColor = '#E8E8D8',
  isAway = false,
  onReorder,
}: LineupPreviewProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Sort lineup by batting order
  const sortedLineup = [...lineup].sort(
    (a, b) => (a.battingOrder || 0) - (b.battingOrder || 0)
  );

  const isDraggable = !!onReorder;

  const handleDragStart = (e: React.DragEvent, battingOrder: number) => {
    setDragFrom(battingOrder);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, battingOrder: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(battingOrder);
  };

  const handleDrop = (e: React.DragEvent, battingOrder: number) => {
    e.preventDefault();
    if (dragFrom === null || dragFrom === battingOrder || !onReorder) {
      setDragFrom(null);
      setDragOver(null);
      return;
    }

    const sorted = [...sortedLineup];
    const fromIdx = sorted.findIndex((p) => p.battingOrder === dragFrom);
    const toIdx = sorted.findIndex((p) => p.battingOrder === battingOrder);
    if (fromIdx < 0 || toIdx < 0) {
      setDragFrom(null);
      setDragOver(null);
      return;
    }

    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);

    const reordered = sorted.map((p, idx) => ({ ...p, battingOrder: idx + 1 }));
    onReorder(reordered);
    setDragFrom(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

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
        {sortedLineup.map((player) => {
          const isDragging = dragFrom === player.battingOrder;
          const isDropTarget = dragOver === player.battingOrder && dragFrom !== player.battingOrder;
          return (
            <div
              key={player.name}
              draggable={isDraggable}
              onDragStart={isDraggable ? (e) => handleDragStart(e, player.battingOrder!) : undefined}
              onDragOver={isDraggable ? (e) => handleDragOver(e, player.battingOrder!) : undefined}
              onDrop={isDraggable ? (e) => handleDrop(e, player.battingOrder!) : undefined}
              onDragEnd={isDraggable ? handleDragEnd : undefined}
              className={`flex items-center justify-between px-2 py-1.5 border transition-all ${
                isDragging
                  ? "bg-[#5A7A52]/50 border-[#E8E8D8]/30 opacity-40"
                  : isDropTarget
                    ? "bg-[#6A8A62] border-[#C4A853] border-2"
                    : "bg-[#5A7A52] border-[#E8E8D8]"
              } ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold text-[#C4A853] w-4"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                >
                  #{player.battingOrder}
                </span>
                {isDraggable && (
                  <span className="text-[#E8E8D8]/30 text-[10px] select-none">⠿</span>
                )}
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
          );
        })}
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
