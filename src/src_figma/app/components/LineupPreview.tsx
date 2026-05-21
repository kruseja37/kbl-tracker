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
import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import chalkBgImg from '../../../assets/chalk-bg.png';
import { useTouchInputAvailable } from '../utils/inputMode';

const MOJO_LABELS: Record<MojoLevel, { label: string; color: string }> = {
  [-2]: { label: 'RTL', color: '#7a2f2f' },
  [-1]: { label: 'TNS', color: '#7a3a63' },
  [0]:  { label: 'NRM', color: '#E8E8D8' },
  [1]:  { label: 'LKD', color: '#3a6f8a' },
  [2]:  { label: 'FIR', color: '#3f9a8c' },
  [3]:  { label: 'JKD', color: '#56429a' },
};
const MOJO_ORDER: MojoLevel[] = [-2, -1, 0, 1, 2, 3];

function getMojoOuterOutlineColor(level: MojoLevel): string {
  if (level === -2) {
    return 'rgba(139,111,71,0.95)';
  }
  if (level === -1 || level === 1) {
    return 'rgba(255,255,255,0)';
  }
  if (level === 2) {
    return 'rgba(192,192,192,0.95)';
  }
  return 'rgba(255,255,255,0.9)';
}

const FITNESS_LABELS: Record<FitnessState, { label: string; color: string }> = {
  'JUICED':   { label: 'JCD', color: '#FF44FF' },
  'FIT':      { label: 'FIT', color: '#88DD44' },
  'WELL':     { label: 'WEL', color: '#E8E8D8' },
  'STRAINED': { label: 'STR', color: '#FF8844' },
  'WEAK':     { label: 'WEK', color: '#FF4444' },
  'HURT':     { label: 'HRT', color: '#AA0000' },
};
const FITNESS_ORDER: FitnessState[] = ['JUICED', 'FIT', 'WELL', 'STRAINED', 'WEAK', 'HURT'];

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
  onMojoChange?: (playerId: string, newMojo: MojoLevel) => void;
  onFitnessChange?: (playerId: string, newFitness: FitnessState) => void;
}

export function LineupPreview({
  teamName,
  lineup,
  bench,
  benchPitchers = [],
  startingPitcher,
  teamColor,
  isAway = false,
  onReorder,
  onPositionSwap,
  onBenchSub,
  onPitcherSub,
  onMojoChange,
  onFitnessChange,
}: LineupPreviewProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const isTouch = useTouchInputAvailable();
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleMovePlayer = (player: RosterPlayer, direction: -1 | 1) => {
    if (!onReorder || !player.battingOrder) return;

    const sorted = [...sortedLineup];
    const fromIdx = sorted.findIndex((p) => p.battingOrder === player.battingOrder);
    const toIdx = fromIdx + direction;
    if (fromIdx < 0 || toIdx < 0 || toIdx >= sorted.length) return;

    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);
    onReorder(sorted.map((p, idx) => ({ ...p, battingOrder: idx + 1 })));
    setSelection(null);
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

  // Cycle mojo/fitness on tap
  const cycleMojo = (playerId: string, current: MojoLevel | undefined) => {
    if (!onMojoChange) return;
    const cur = current ?? 0;
    const idx = MOJO_ORDER.indexOf(cur);
    const next = MOJO_ORDER[(idx + 1) % MOJO_ORDER.length];
    onMojoChange(playerId, next);
  };
  const cycleFitness = (playerId: string, current: FitnessState | undefined) => {
    if (!onFitnessChange) return;
    const cur = current ?? 'FIT';
    const idx = FITNESS_ORDER.indexOf(cur);
    const next = FITNESS_ORDER[(idx + 1) % FITNESS_ORDER.length];
    onFitnessChange(playerId, next);
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

  const hintText = selection?.mode === 'reorder' ? 'Tap another # to move this hitter'
    : selection?.mode === 'position' ? 'Tap another position to swap'
    : selection?.mode === 'benchSub' ? 'Tap a bench player to substitute'
    : selection?.mode === 'pitcherSub' ? 'Tap a bullpen pitcher to start'
    : null;

  return (
    <div
      ref={containerRef}
      className="bg-[#3d4a42] border-2 p-3"
      style={{ borderColor: '#556B55', fontFamily: "'Moms Typewriter', monospace", backgroundImage: `url(${chalkBgImg})`, backgroundRepeat: 'repeat' }}
    >
      {/* Team Header */}
      <div
        className="text-sm font-bold mb-3 pb-2 border-b text-[#E8E8D8] tracking-[0.2em]"
        style={{
          borderColor: `${teamColor}60`,
          textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
          backgroundImage: `url(${chalkBgImg}), linear-gradient(${teamColor}40, ${teamColor}40)`,
          backgroundRepeat: 'repeat',
          padding: '6px 8px',
          margin: '-6px -6px 12px -6px',
        }}
      >
        {isAway ? '▲' : '▼'} {teamName}
      </div>

      {/* Selection hint banner */}
      {isTouch && hintText && (
        <div className="text-[8px] text-[#C4A853] bg-[#1f2b21] px-2 py-1 mb-2 text-center rounded border border-[#C4A853]/40">
          {hintText}
          <button className="ml-2 text-[#a0a898] underline" onClick={() => setSelection(null)}>cancel</button>
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
                  ? 'bg-[#1f2b21]/50 border-[#556B55]/30 opacity-40'
                  : isDropTarget
                    ? 'bg-[#2b3a2e] border-[#C4A853] border-2'
                    : isRowReorderSelected || isRowBenchSubSelected
                      ? 'bg-[#2b3a2e] border-[#F2C041] border-2 ring-1 ring-[#F2C041]'
                      : 'bg-[#1f2b21] border-[#556B55]'
              } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Batting order number */}
                {isTouch && onReorder ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${player.name} in batting order`}
                      onClick={() => handleBattingOrderTap(player)}
                      className={`text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded transition-all shrink-0 ${
                        isRowReorderSelected
                          ? 'bg-[#F2C041] text-[#1f2b21]'
                          : isReorderTarget ? 'bg-[#C4A853]/30 text-[#C4A853]' : 'text-[#C4A853]'
                      }`}
                    >
                      #{player.battingOrder}
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${player.name} up in batting order`}
                      disabled={player.battingOrder === 1}
                      onClick={() => handleMovePlayer(player, -1)}
                      className="w-5 h-5 rounded border border-[#556B55] bg-[#253126] text-[9px] font-bold leading-none text-[#C4A853] disabled:opacity-30 disabled:text-[#7a7a68] active:bg-[#3d4a42]"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${player.name} down in batting order`}
                      disabled={player.battingOrder === sortedLineup.length}
                      onClick={() => handleMovePlayer(player, 1)}
                      className="w-5 h-5 rounded border border-[#556B55] bg-[#253126] text-[9px] font-bold leading-none text-[#C4A853] disabled:opacity-30 disabled:text-[#7a7a68] active:bg-[#3d4a42]"
                    >
                      ▼
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-[10px] font-bold text-[#C4A853] w-4">
                      #{player.battingOrder}
                    </span>
                    {isDraggable && <span className="text-[#a0a898]/50 text-[10px] select-none">⠿</span>}
                  </>
                )}

                {/* Player name — tap to select for bench sub */}
                {isTouch && onBenchSub ? (
                  <button
                    type="button"
                    onClick={() => handleLineupPlayerTapForSub(player)}
                    className={`text-[11px] font-bold text-left truncate flex-1 min-w-0 ${
                      isRowBenchSubSelected ? 'text-[#F2C041]' : 'text-[#E8E8D8]'
                    }`}
                    style={{ fontFamily: "'Tox Typewriter', monospace" }}
                  >
                    {player.name}
                  </button>
                ) : (
                  <span className="text-[11px] text-[#E8E8D8] font-bold truncate"
                    style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                    {player.name}
                  </span>
                )}
              </div>

              {/* Position badge + mojo/fitness */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onPositionSwap ? (
                  <button
                    type="button"
                    onClick={() => handlePositionTap(player)}
                    className={`text-[8px] px-1.5 py-0.5 rounded transition-all ${
                      isRowPositionSelected
                        ? 'bg-[#F2C041] text-[#1f2b21] font-bold'
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
                {onMojoChange && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cycleMojo(player.playerId || player.name, player.mojo); }}
                    className="text-[7px] px-1 py-0.5 rounded bg-[#283828] border border-[#556B55] font-bold"
                    style={{
                      color: '#FFFFFF',
                      textShadow:
                        (player.mojo ?? 0) === 0
                          ? 'none'
                          : `-1px 0 0 ${MOJO_LABELS[player.mojo ?? 0].color}, 1px 0 0 ${MOJO_LABELS[player.mojo ?? 0].color}, 0 -1px 0 ${MOJO_LABELS[player.mojo ?? 0].color}, 0 1px 0 ${MOJO_LABELS[player.mojo ?? 0].color}, -1px -1px 0 ${MOJO_LABELS[player.mojo ?? 0].color}, 1px -1px 0 ${MOJO_LABELS[player.mojo ?? 0].color}, -1px 1px 0 ${MOJO_LABELS[player.mojo ?? 0].color}, 1px 1px 0 ${MOJO_LABELS[player.mojo ?? 0].color}, -1.35px 0 0 ${getMojoOuterOutlineColor(player.mojo ?? 0)}, 1.35px 0 0 ${getMojoOuterOutlineColor(player.mojo ?? 0)}, 0 -1.35px 0 ${getMojoOuterOutlineColor(player.mojo ?? 0)}, 0 1.35px 0 ${getMojoOuterOutlineColor(player.mojo ?? 0)}`,
                    }}
                    title={`Mojo: ${MOJO_LABELS[player.mojo ?? 0].label}`}
                  >
                    {MOJO_LABELS[player.mojo ?? 0].label}
                  </button>
                )}
                {onFitnessChange && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cycleFitness(player.playerId || player.name, player.fitness); }}
                    className="text-[7px] px-1 py-0.5 rounded bg-[#283828] border border-[#556B55] font-bold"
                    style={{ color: FITNESS_LABELS[player.fitness ?? 'FIT'].color, textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
                    title={`Fitness: ${FITNESS_LABELS[player.fitness ?? 'FIT'].label}`}
                  >
                    {FITNESS_LABELS[player.fitness ?? 'FIT'].label}
                  </button>
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
          {onPitcherSub && benchPitchers.length > 0 ? (
            <button
              type="button"
              onClick={handleStartingPitcherTap}
              className={`w-full flex items-center justify-between bg-[#2b3a2e] px-2 py-1.5 border-2 transition-all ${
                isPitcherSubMode ? 'border-[#F2C041] ring-1 ring-[#F2C041]' : 'border-[#C4A853]'
              } active:bg-[#3d4a42]`}
            >
              <span className={`text-[10px] font-bold ${isPitcherSubMode ? 'text-[#F2C041]' : 'text-[#E8E8D8]'}`}
                style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                {startingPitcher.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-[#E8E8D8]/80"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  P • {startingPitcher.throwingHand}
                </span>
                {onMojoChange && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cycleMojo(startingPitcher.playerId || startingPitcher.name, startingPitcher.mojo); }}
                    className="text-[7px] px-1 py-0.5 rounded bg-[#283828] border border-[#556B55] font-bold"
                    style={{
                      color: '#FFFFFF',
                      textShadow:
                        (startingPitcher.mojo ?? 0) === 0
                          ? 'none'
                          : `-1px 0 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 1px 0 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 0 -1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 0 1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, -1px -1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 1px -1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, -1px 1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 1px 1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, -1.35px 0 0 ${getMojoOuterOutlineColor(startingPitcher.mojo ?? 0)}, 1.35px 0 0 ${getMojoOuterOutlineColor(startingPitcher.mojo ?? 0)}, 0 -1.35px 0 ${getMojoOuterOutlineColor(startingPitcher.mojo ?? 0)}, 0 1.35px 0 ${getMojoOuterOutlineColor(startingPitcher.mojo ?? 0)}`,
                    }}
                  >
                    {MOJO_LABELS[startingPitcher.mojo ?? 0].label}
                  </button>
                )}
                {onFitnessChange && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cycleFitness(startingPitcher.playerId || startingPitcher.name, startingPitcher.fitness); }}
                    className="text-[7px] px-1 py-0.5 rounded bg-[#283828] border border-[#556B55] font-bold"
                    style={{ color: FITNESS_LABELS[startingPitcher.fitness ?? 'FIT'].color, textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
                  >
                    {FITNESS_LABELS[startingPitcher.fitness ?? 'FIT'].label}
                  </button>
                )}
              </div>
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#2b3a2e] px-2 py-1.5 border-2 border-[#C4A853]">
              <span className="text-[10px] text-[#E8E8D8] font-bold"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}>
                {startingPitcher.name}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-[#E8E8D8]/80"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                  P • {startingPitcher.throwingHand}
                </span>
                {onMojoChange && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cycleMojo(startingPitcher.playerId || startingPitcher.name, startingPitcher.mojo); }}
                    className="text-[7px] px-1 py-0.5 rounded bg-[#283828] border border-[#556B55] font-bold"
                    style={{
                      color: '#FFFFFF',
                      textShadow:
                        (startingPitcher.mojo ?? 0) === 0
                          ? 'none'
                          : `-1px 0 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 1px 0 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 0 -1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 0 1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, -1px -1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 1px -1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, -1px 1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, 1px 1px 0 ${MOJO_LABELS[startingPitcher.mojo ?? 0].color}, -1.35px 0 0 ${getMojoOuterOutlineColor(startingPitcher.mojo ?? 0)}, 1.35px 0 0 ${getMojoOuterOutlineColor(startingPitcher.mojo ?? 0)}, 0 -1.35px 0 ${getMojoOuterOutlineColor(startingPitcher.mojo ?? 0)}, 0 1.35px 0 ${getMojoOuterOutlineColor(startingPitcher.mojo ?? 0)}`,
                    }}
                  >
                    {MOJO_LABELS[startingPitcher.mojo ?? 0].label}
                  </button>
                )}
                {onFitnessChange && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cycleFitness(startingPitcher.playerId || startingPitcher.name, startingPitcher.fitness); }}
                    className="text-[7px] px-1 py-0.5 rounded bg-[#283828] border border-[#556B55] font-bold"
                    style={{ color: FITNESS_LABELS[startingPitcher.fitness ?? 'FIT'].color, textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
                  >
                    {FITNESS_LABELS[startingPitcher.fitness ?? 'FIT'].label}
                  </button>
                )}
              </div>
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
                  className="w-full flex items-center justify-between px-2 py-1 bg-[#1f2b21] hover:bg-[#2b3a2e] active:bg-[#3d4a42] border border-[#C4A853]/40 rounded transition-colors"
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
                  className="flex items-center justify-between px-2 py-1 bg-[#1f2b21] border border-[#556B55]/40 rounded"
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
                  className="w-full flex items-center justify-between px-2 py-1 bg-[#1f2b21] hover:bg-[#2b3a2e] active:bg-[#3d4a42] border border-[#C4A853]/40 rounded transition-colors"
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
                  className="flex items-center justify-between px-2 py-1 bg-[#1f2b21] border border-[#556B55]/40 rounded"
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
