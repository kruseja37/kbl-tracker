/**
 * LineupPreview Component
 *
 * Displays a team's batting lineup for pre-game confirmation.
 * Supports drag-and-drop reordering on desktop and tap-based interactions on touch:
 *   - Tap batting order # to swap batting order with another player
 *   - Tap position badge to swap defensive positions with another player
 *   - Tap player name to open bench substitution popover
 */

import { useState, useEffect, useRef } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { Player as RosterPlayer, Pitcher as RosterPitcher } from './TeamRoster';

type Selection =
  | { mode: 'reorder'; battingOrder: number }
  | { mode: 'position'; battingOrder: number }
  | null;

interface LineupPreviewProps {
  teamName: string;
  lineup: RosterPlayer[];         // Players with battingOrder defined
  bench: RosterPlayer[];          // Players without battingOrder (position players)
  benchPitchers?: RosterPitcher[];  // Non-active pitchers available for sub
  startingPitcher?: RosterPitcher;
  teamColor: string;
  teamBorderColor?: string;
  isAway?: boolean;
  onReorder?: (reorderedLineup: RosterPlayer[]) => void;
  onPositionSwap?: (playerA: RosterPlayer, playerB: RosterPlayer) => void;
  onBenchSub?: (lineupPlayer: RosterPlayer, benchPlayer: RosterPlayer) => void;
  onPitcherSub?: (newPitcher: RosterPitcher) => void;
}

export function LineupPreview({
  teamName,
  lineup,
  bench,
  benchPitchers = [],
  startingPitcher,
  teamColor,
  teamBorderColor = '#E8E8D8',
  isAway = false,
  onReorder,
  onPositionSwap,
  onBenchSub,
  onPitcherSub,
}: LineupPreviewProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [benchPopoverIndex, setBenchPopoverIndex] = useState<number | null>(null);
  const [pitcherPopoverOpen, setPitcherPopoverOpen] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Sort lineup by batting order
  const sortedLineup = [...lineup].sort(
    (a, b) => (a.battingOrder || 0) - (b.battingOrder || 0)
  );

  const isDraggable = !!onReorder && !isTouch;

  // --- Desktop drag-and-drop handlers (unchanged) ---
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

  // --- Touch tap handlers ---
  const handleBattingOrderTap = (player: RosterPlayer) => {
    if (!onReorder || !player.battingOrder) return;

    if (selection?.mode === 'reorder') {
      if (selection.battingOrder === player.battingOrder) {
        // Tap same player — cancel
        setSelection(null);
        return;
      }
      // Execute swap
      const sorted = [...sortedLineup];
      const fromIdx = sorted.findIndex((p) => p.battingOrder === selection.battingOrder);
      const toIdx = sorted.findIndex((p) => p.battingOrder === player.battingOrder);
      if (fromIdx >= 0 && toIdx >= 0) {
        const [moved] = sorted.splice(fromIdx, 1);
        sorted.splice(toIdx, 0, moved);
        const reordered = sorted.map((p, idx) => ({ ...p, battingOrder: idx + 1 }));
        onReorder(reordered);
      }
      setSelection(null);
    } else {
      // First tap — select for reorder
      setSelection({ mode: 'reorder', battingOrder: player.battingOrder });
      setBenchPopoverIndex(null);
    }
  };

  const handlePositionTap = (player: RosterPlayer) => {
    if (!onPositionSwap || !player.battingOrder) return;

    if (selection?.mode === 'position') {
      if (selection.battingOrder === player.battingOrder) {
        // Tap same player — cancel
        setSelection(null);
        return;
      }
      // Execute position swap
      const playerA = sortedLineup.find((p) => p.battingOrder === selection.battingOrder);
      const playerB = player;
      if (playerA && playerB) {
        onPositionSwap(playerA, playerB);
      }
      setSelection(null);
    } else {
      // First tap — select for position swap
      setSelection({ mode: 'position', battingOrder: player.battingOrder });
      setBenchPopoverIndex(null);
    }
  };

  const handlePlayerNameTap = (idx: number) => {
    if (!onBenchSub || bench.length === 0) return;
    setSelection(null);
    setBenchPopoverIndex(benchPopoverIndex === idx ? null : idx);
  };

  const handleBenchPlayerSelect = (lineupPlayer: RosterPlayer, benchPlayer: RosterPlayer) => {
    if (onBenchSub) {
      onBenchSub(lineupPlayer, benchPlayer);
    }
    setBenchPopoverIndex(null);
  };

  // Clear selection on outside click (selection only, not popover — Radix handles that)
  useEffect(() => {
    if (!selection) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelection(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [selection]);

  const isReorderSelected = (battingOrder: number) =>
    selection?.mode === 'reorder' && selection.battingOrder === battingOrder;
  const isPositionSelected = (battingOrder: number) =>
    selection?.mode === 'position' && selection.battingOrder === battingOrder;

  return (
    <div
      ref={containerRef}
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

      {/* Selection hint banner */}
      {isTouch && selection && (
        <div className="text-[8px] text-[#C4A853] bg-[#3A5A32] px-2 py-1 mb-2 text-center rounded"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          {selection.mode === 'reorder'
            ? 'Tap another # to swap batting order'
            : 'Tap another position to swap'}
          <button
            className="ml-2 text-[#E8E8D8]/60 underline"
            onClick={() => setSelection(null)}
          >
            cancel
          </button>
        </div>
      )}

      {/* Batting Order */}
      <div className="space-y-1 mb-3">
        {sortedLineup.map((player, idx) => {
          const isDragging = dragFrom === player.battingOrder;
          const isDropTarget = dragOver === player.battingOrder && dragFrom !== player.battingOrder;
          const isRowReorderSelected = isReorderSelected(player.battingOrder!);
          const isRowPositionSelected = isPositionSelected(player.battingOrder!);
          const isReorderTarget = selection?.mode === 'reorder' && !isRowReorderSelected;
          const isPositionTarget = selection?.mode === 'position' && !isRowPositionSelected;

          const rowContent = (
            <div
              key={player.playerId || player.name}
              draggable={isDraggable}
              onDragStart={isDraggable ? (e) => handleDragStart(e, player.battingOrder!) : undefined}
              onDragOver={isDraggable ? (e) => handleDragOver(e, player.battingOrder!) : undefined}
              onDrop={isDraggable ? (e) => handleDrop(e, player.battingOrder!) : undefined}
              onDragEnd={isDraggable ? handleDragEnd : undefined}
              className={`flex items-center justify-between px-2 py-1.5 border transition-all ${
                isDragging
                  ? 'bg-[#5A7A52]/50 border-[#E8E8D8]/30 opacity-40'
                  : isDropTarget
                    ? 'bg-[#6A8A62] border-[#C4A853] border-2'
                    : isRowReorderSelected
                      ? 'bg-[#6A8A62] border-[#FFD700] border-2 ring-1 ring-[#FFD700]'
                      : 'bg-[#5A7A52] border-[#E8E8D8]'
              } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Zone 1: Batting order number */}
                {isTouch && onReorder ? (
                  <button
                    type="button"
                    onClick={() => handleBattingOrderTap(player)}
                    className={`text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded transition-all shrink-0 ${
                      isRowReorderSelected
                        ? 'bg-[#FFD700] text-[#3A5A32]'
                        : isReorderTarget
                          ? 'bg-[#C4A853]/30 text-[#C4A853]'
                          : 'text-[#C4A853]'
                    }`}
                    style={{ textShadow: isRowReorderSelected ? 'none' : '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    #{player.battingOrder}
                  </button>
                ) : (
                  <>
                    <span
                      className="text-[10px] font-bold text-[#C4A853] w-4"
                      style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                    >
                      #{player.battingOrder}
                    </span>
                    {isDraggable && (
                      <span className="text-[#E8E8D8]/30 text-[10px] select-none">⠿</span>
                    )}
                  </>
                )}

                {/* Zone 3: Player name (opens bench popover) */}
                {isTouch && onBenchSub && bench.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => handlePlayerNameTap(idx)}
                    className="text-[10px] text-[#E8E8D8] font-bold text-left truncate flex-1 min-w-0"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    {player.name}
                  </button>
                ) : (
                  <span
                    className="text-[10px] text-[#E8E8D8] font-bold truncate"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    {player.name}
                  </span>
                )}
              </div>

              {/* Zone 2: Position badge */}
              <div className="flex items-center gap-2 shrink-0">
                {isTouch && onPositionSwap ? (
                  <button
                    type="button"
                    onClick={() => handlePositionTap(player)}
                    className={`text-[8px] px-1.5 py-0.5 rounded transition-all ${
                      isRowPositionSelected
                        ? 'bg-[#FFD700] text-[#3A5A32] font-bold'
                        : isPositionTarget
                          ? 'bg-[#C4A853]/30 text-[#E8E8D8]'
                          : 'text-[#E8E8D8]/80'
                    }`}
                    style={{ textShadow: isRowPositionSelected ? 'none' : '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    {player.position} • {player.battingHand}
                  </button>
                ) : (
                  <span
                    className="text-[8px] text-[#E8E8D8]/80"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    {player.position} • {player.battingHand}
                  </span>
                )}
              </div>
            </div>
          );

          // Wrap in popover for bench substitution on touch
          const allBenchOptions = [...bench, ...benchPitchers.map(bp => ({
            name: bp.name,
            fullName: bp.fullName,
            playerId: bp.playerId,
            battingHand: (bp.throwingHand || 'R') as 'L' | 'R' | 'S',
            position: undefined,
            battingOrder: undefined,
            stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
            _isPitcher: true,
          } as RosterPlayer & { _isPitcher?: boolean }))];

          if (isTouch && onBenchSub && allBenchOptions.length > 0) {
            return (
              <PopoverPrimitive.Root
                key={player.playerId || player.name}
                open={benchPopoverIndex === idx}
                onOpenChange={(open) => {
                  if (!open) setBenchPopoverIndex(null);
                }}
              >
                <PopoverPrimitive.Anchor asChild>
                  {rowContent}
                </PopoverPrimitive.Anchor>
                <PopoverPrimitive.Portal>
                  <PopoverPrimitive.Content
                    side="right"
                    sideOffset={8}
                    align="start"
                    avoidCollisions
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => {
                      // Let Radix handle dismiss — don't interfere with scroll
                    }}
                    className="z-50 bg-[#3A5A32] border-2 border-[#C4A853] rounded shadow-lg p-2 w-48"
                  >
                    <div
                      className="text-[8px] text-[#C4A853] font-bold mb-1.5 pb-1 border-b border-[#C4A853]/30"
                      style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                    >
                      SUBSTITUTE FOR {player.name.split(' ').pop()?.toUpperCase()}
                    </div>
                    <div
                      className="space-y-0.5 max-h-[50vh] overflow-y-auto overscroll-contain"
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      {allBenchOptions.map((bp) => (
                        <button
                          key={bp.playerId || bp.name}
                          type="button"
                          onClick={() => handleBenchPlayerSelect(player, bp)}
                          className="w-full flex items-center justify-between px-2 py-1.5 text-left bg-[#4A6A42] hover:bg-[#5A7A52] active:bg-[#6A8A62] border border-[#E8E8D8]/20 rounded transition-colors"
                        >
                          <span
                            className="text-[9px] text-[#E8E8D8] font-bold"
                            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                          >
                            {bp.name}
                          </span>
                          <span
                            className="text-[7px] text-[#E8E8D8]/60"
                            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                          >
                            {'_isPitcher' in bp ? 'P' : bp.battingHand}
                          </span>
                        </button>
                      ))}
                    </div>
                  </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
              </PopoverPrimitive.Root>
            );
          }

          return rowContent;
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
          {isTouch && onPitcherSub && benchPitchers.length > 0 ? (
            <PopoverPrimitive.Root
              open={pitcherPopoverOpen}
              onOpenChange={setPitcherPopoverOpen}
            >
              <PopoverPrimitive.Anchor asChild>
                <button
                  type="button"
                  onClick={() => {
                    setSelection(null);
                    setBenchPopoverIndex(null);
                    setPitcherPopoverOpen(!pitcherPopoverOpen);
                  }}
                  className="w-full flex items-center justify-between bg-[#5A7A52] px-2 py-1.5 border-2 border-[#C4A853] active:bg-[#6A8A62] transition-colors"
                >
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
                </button>
              </PopoverPrimitive.Anchor>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  side="right"
                  sideOffset={8}
                  align="start"
                  avoidCollisions
                  className="z-50 bg-[#3A5A32] border-2 border-[#C4A853] rounded shadow-lg p-2 w-48 max-h-64 overflow-y-auto"
                >
                  <div
                    className="text-[8px] text-[#C4A853] font-bold mb-1.5 pb-1 border-b border-[#C4A853]/30"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    CHANGE STARTING PITCHER
                  </div>
                  <div className="space-y-0.5">
                    {benchPitchers.map((bp) => (
                      <button
                        key={bp.playerId || bp.name}
                        type="button"
                        onClick={() => {
                          onPitcherSub(bp);
                          setPitcherPopoverOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-left bg-[#4A6A42] hover:bg-[#5A7A52] active:bg-[#6A8A62] border border-[#E8E8D8]/20 rounded transition-colors"
                      >
                        <span
                          className="text-[9px] text-[#E8E8D8] font-bold"
                          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                        >
                          {bp.name}
                        </span>
                        <span
                          className="text-[7px] text-[#E8E8D8]/60"
                          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                        >
                          {bp.throwingHand}
                        </span>
                      </button>
                    ))}
                  </div>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          ) : (
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
          )}
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
                key={player.playerId || player.name}
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
