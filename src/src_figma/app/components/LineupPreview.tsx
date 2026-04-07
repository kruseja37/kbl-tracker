/**
 * LineupPreview Component
 *
 * Displays a team's batting lineup for pre-game confirmation.
 * Supports drag-and-drop reordering on desktop and tap-based interactions on touch:
 *   - Tap batting order # to swap batting order with another player
 *   - Tap position badge to swap defensive positions with another player
 *   - Tap a lineup player then tap a bench/bullpen player to substitute
 *   - Tap starting pitcher then tap a bullpen pitcher to change starter
 */

import { useState, useEffect, useRef } from 'react';
import type { Player as RosterPlayer, Pitcher as RosterPitcher } from './TeamRoster';

type Selection =
  | { mode: 'reorder'; battingOrder: number }
  | { mode: 'position'; battingOrder: number }
  | { mode: 'benchSub'; playerId: string }
  | { mode: 'pitcherSub' }
  | null;

interface LineupPreviewProps {
  teamName: string;
  lineup: RosterPlayer[];
  bench: RosterPlayer[];
  benchPitchers?: RosterPitcher[];
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
  const [isTouch, setIsTouch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const sortedLineup = [...lineup].sort(
    (a, b) => (a.battingOrder || 0) - (b.battingOrder || 0)
  );

  const isDraggable = !!onReorder && !isTouch;

  // --- Desktop drag-and-drop handlers ---
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
    if (fromIdx < 0 || toIdx < 0) { setDragFrom(null); setDragOver(null); return; }
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);
    onReorder(sorted.map((p, idx) => ({ ...p, battingOrder: idx + 1 })));
    setDragFrom(null);
    setDragOver(null);
  };

  const handleDragEnd = () => { setDragFrom(null); setDragOver(null); };

  // --- Touch tap handlers ---
  const handleBattingOrderTap = (player: RosterPlayer) => {
    if (!onReorder || !player.battingOrder) return;
    if (selection?.mode === 'reorder') {
      if (selection.battingOrder === player.battingOrder) { setSelection(null); return; }
      const sorted = [...sortedLineup];
      const fromIdx = sorted.findIndex((p) => p.battingOrder === selection.battingOrder);
      const toIdx = sorted.findIndex((p) => p.battingOrder === player.battingOrder);
      if (fromIdx >= 0 && toIdx >= 0) {
        const [moved] = sorted.splice(fromIdx, 1);
        sorted.splice(toIdx, 0, moved);
        onReorder(sorted.map((p, idx) => ({ ...p, battingOrder: idx + 1 })));
      }
      setSelection(null);
    } else {
      setSelection({ mode: 'reorder', battingOrder: player.battingOrder });
    }
  };

  const handlePositionTap = (player: RosterPlayer) => {
    if (!onPositionSwap || !player.battingOrder) return;
    if (selection?.mode === 'position') {
      if (selection.battingOrder === player.battingOrder) { setSelection(null); return; }
      const playerA = sortedLineup.find((p) => p.battingOrder === selection.battingOrder);
      if (playerA) onPositionSwap(playerA, player);
      setSelection(null);
    } else {
      setSelection({ mode: 'position', battingOrder: player.battingOrder });
    }
  };

  const handleLineupPlayerTapForSub = (player: RosterPlayer) => {
    if (!onBenchSub) return;
    if (selection?.mode === 'benchSub' && selection.playerId === (player.playerId || player.name)) {
      setSelection(null); return;
    }
    setSelection({ mode: 'benchSub', playerId: player.playerId || player.name });
  };

  const handleBenchPlayerTap = (benchPlayer: RosterPlayer) => {
    if (selection?.mode === 'benchSub' && onBenchSub) {
      const lineupPlayer = sortedLineup.find(
        (p) => (p.playerId || p.name) === selection.playerId
      );
      if (lineupPlayer) onBenchSub(lineupPlayer, benchPlayer);
      setSelection(null);
    }
  };

  const handleStartingPitcherTap = () => {
    if (!onPitcherSub || benchPitchers.length === 0) return;
    if (selection?.mode === 'pitcherSub') { setSelection(null); return; }
    setSelection({ mode: 'pitcherSub' });
  };

  const handleBullpenPitcherTap = (pitcher: RosterPitcher) => {
    if (selection?.mode === 'pitcherSub' && onPitcherSub) {
      onPitcherSub(pitcher);
      setSelection(null);
    }
  };

  // Clear selection on outside click
  useEffect(() => {
    if (!selection) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelection(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('mousedown', handleClick); };
  }, [selection]);

  const isReorderSelected = (bo: number) => selection?.mode === 'reorder' && selection.battingOrder === bo;
  const isPositionSelected = (bo: number) => selection?.mode === 'position' && selection.battingOrder === bo;
  const isBenchSubSelected = (id: string) => selection?.mode === 'benchSub' && selection.playerId === id;
  const isBenchSubMode = selection?.mode === 'benchSub';
  const isPitcherSubMode = selection?.mode === 'pitcherSub';

  const hintText = selection?.mode === 'reorder' ? 'Tap another # to swap batting order'
    : selection?.mode === 'position' ? 'Tap another position to swap'
    : selection?.mode === 'benchSub' ? 'Tap a bench player to substitute'
    : selection?.mode === 'pitcherSub' ? 'Tap a bullpen pitcher to start'
    : null;

  return (
    <div
      ref={containerRef}
      className="bg-[#4A6A42] border-4 p-3"
      style={{ borderColor: teamBorderColor }}
    >
      {/* Team Header */}
      <div
        className="text-sm font-bold mb-3 pb-2 border-b-2"
        style={{ color: teamColor, borderColor: teamBorderColor, textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
      >
        {isAway ? '▲' : '▼'} {teamName}
      </div>

      {/* Selection hint banner */}
      {isTouch && hintText && (
        <div className="text-[8px] text-[#C4A853] bg-[#3A5A32] px-2 py-1 mb-2 text-center rounded"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          {hintText}
          <button className="ml-2 text-[#E8E8D8]/60 underline" onClick={() => setSelection(null)}>cancel</button>
        </div>
      )}

      {/* Batting Order */}
      <div className="space-y-1 mb-3">
        {sortedLineup.map((player) => {
          const isDragging = dragFrom === player.battingOrder;
          const isDropTarget = dragOver === player.battingOrder && dragFrom !== player.battingOrder;
          const isRowReorderSelected = isReorderSelected(player.battingOrder!);
          const isRowPositionSelected = isPositionSelected(player.battingOrder!);
          const isRowBenchSubSelected = isBenchSubSelected(player.playerId || player.name);
          const isReorderTarget = selection?.mode === 'reorder' && !isRowReorderSelected;
          const isPositionTarget = selection?.mode === 'position' && !isRowPositionSelected;

          return (
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
                    : isRowReorderSelected || isRowBenchSubSelected
                      ? 'bg-[#6A8A62] border-[#FFD700] border-2 ring-1 ring-[#FFD700]'
                      : 'bg-[#5A7A52] border-[#E8E8D8]'
              } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Batting order number */}
                {isTouch && onReorder ? (
                  <button
                    type="button"
                    onClick={() => handleBattingOrderTap(player)}
                    className={`text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded transition-all shrink-0 ${
                      isRowReorderSelected
                        ? 'bg-[#FFD700] text-[#3A5A32]'
                        : isReorderTarget ? 'bg-[#C4A853]/30 text-[#C4A853]' : 'text-[#C4A853]'
                    }`}
                    style={{ textShadow: isRowReorderSelected ? 'none' : '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    #{player.battingOrder}
                  </button>
                ) : (
                  <>
                    <span className="text-[10px] font-bold text-[#C4A853] w-4"
                      style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                      #{player.battingOrder}
                    </span>
                    {isDraggable && <span className="text-[#E8E8D8]/30 text-[10px] select-none">⠿</span>}
                  </>
                )}

                {/* Player name — tap to select for bench sub */}
                {isTouch && onBenchSub ? (
                  <button
                    type="button"
                    onClick={() => handleLineupPlayerTapForSub(player)}
                    className={`text-[10px] font-bold text-left truncate flex-1 min-w-0 ${
                      isRowBenchSubSelected ? 'text-[#FFD700]' : 'text-[#E8E8D8]'
                    }`}
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    {player.name}
                  </button>
                ) : (
                  <span className="text-[10px] text-[#E8E8D8] font-bold truncate"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {player.name}
                  </span>
                )}
              </div>

              {/* Position badge */}
              <div className="flex items-center gap-2 shrink-0">
                {isTouch && onPositionSwap ? (
                  <button
                    type="button"
                    onClick={() => handlePositionTap(player)}
                    className={`text-[8px] px-1.5 py-0.5 rounded transition-all ${
                      isRowPositionSelected
                        ? 'bg-[#FFD700] text-[#3A5A32] font-bold'
                        : isPositionTarget ? 'bg-[#C4A853]/30 text-[#E8E8D8]' : 'text-[#E8E8D8]/80'
                    }`}
                    style={{ textShadow: isRowPositionSelected ? 'none' : '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    {player.position} • {player.battingHand}
                  </button>
                ) : (
                  <span className="text-[8px] text-[#E8E8D8]/80"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {player.position} • {player.battingHand}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Starting Pitcher */}
      {startingPitcher && (
        <div className="mb-3">
          <div className="text-[8px] text-[#C4A853] font-bold mb-1"
            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
            STARTING PITCHER
          </div>
          {isTouch && onPitcherSub && benchPitchers.length > 0 ? (
            <button
              type="button"
              onClick={handleStartingPitcherTap}
              className={`w-full flex items-center justify-between bg-[#5A7A52] px-2 py-1.5 border-2 transition-all ${
                isPitcherSubMode ? 'border-[#FFD700] ring-1 ring-[#FFD700]' : 'border-[#C4A853]'
              } active:bg-[#6A8A62]`}
            >
              <span className={`text-[10px] font-bold ${isPitcherSubMode ? 'text-[#FFD700]' : 'text-[#E8E8D8]'}`}
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {startingPitcher.name}
              </span>
              <span className="text-[8px] text-[#E8E8D8]/80"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                P • {startingPitcher.throwingHand}
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#5A7A52] px-2 py-1.5 border-2 border-[#C4A853]">
              <span className="text-[10px] text-[#E8E8D8] font-bold"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {startingPitcher.name}
              </span>
              <span className="text-[8px] text-[#E8E8D8]/80"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                P • {startingPitcher.throwingHand}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bench Players — inline, tappable for substitution */}
      {bench.length > 0 && (
        <div className="mb-3">
          <div className="text-[8px] text-[#E8E8D8]/60 font-bold mb-1"
            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
            BENCH ({bench.length})
          </div>
          <div className="space-y-0.5">
            {bench.map((player) => (
              isTouch && isBenchSubMode ? (
                <button
                  key={player.playerId || player.name}
                  type="button"
                  onClick={() => handleBenchPlayerTap(player)}
                  className="w-full flex items-center justify-between px-2 py-1 bg-[#3A5A32] hover:bg-[#4A6A42] active:bg-[#5A7A52] border border-[#C4A853]/40 rounded transition-colors"
                >
                  <span className="text-[9px] text-[#E8E8D8] font-bold"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {player.name}
                  </span>
                  <span className="text-[7px] text-[#E8E8D8]/60"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {player.battingHand}
                  </span>
                </button>
              ) : (
                <div
                  key={player.playerId || player.name}
                  className="flex items-center justify-between px-2 py-1 bg-[#3A5A32] border border-[#E8E8D8]/10 rounded"
                >
                  <span className="text-[9px] text-[#E8E8D8]/60 font-bold"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {player.name}
                  </span>
                  <span className="text-[7px] text-[#E8E8D8]/40"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {player.battingHand}
                  </span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Bullpen Pitchers — inline, tappable for pitcher substitution */}
      {benchPitchers.length > 0 && (
        <div>
          <div className="text-[8px] text-[#E8E8D8]/60 font-bold mb-1"
            style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
            BULLPEN ({benchPitchers.length})
          </div>
          <div className="space-y-0.5">
            {benchPitchers.map((pitcher) => (
              isTouch && isPitcherSubMode ? (
                <button
                  key={pitcher.playerId || pitcher.name}
                  type="button"
                  onClick={() => handleBullpenPitcherTap(pitcher)}
                  className="w-full flex items-center justify-between px-2 py-1 bg-[#3A5A32] hover:bg-[#4A6A42] active:bg-[#5A7A52] border border-[#C4A853]/40 rounded transition-colors"
                >
                  <span className="text-[9px] text-[#E8E8D8] font-bold"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {pitcher.name}
                  </span>
                  <span className="text-[7px] text-[#E8E8D8]/60"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {pitcher.throwingHand}
                  </span>
                </button>
              ) : (
                <div
                  key={pitcher.playerId || pitcher.name}
                  className="flex items-center justify-between px-2 py-1 bg-[#3A5A32] border border-[#E8E8D8]/10 rounded"
                >
                  <span className="text-[9px] text-[#E8E8D8]/60 font-bold"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {pitcher.name}
                  </span>
                  <span className="text-[7px] text-[#E8E8D8]/40"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {pitcher.throwingHand}
                  </span>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
