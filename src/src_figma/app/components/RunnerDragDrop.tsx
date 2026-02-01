/**
 * RunnerDragDrop - Draggable baserunner system for the Enhanced Field
 *
 * Per GAMETRACKER_DRAGDROP_SPEC.md Phase 5:
 * - Draggable runners at occupied bases
 * - Safe/out zones at each base
 * - SB/CS/WP/PB/Pickoff classification
 * - Error mode for fielding errors on runner plays
 */

import { useState, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { normalizedToSvg, BASE_POSITIONS } from './FieldCanvas';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DndRef = any; // React-dnd connector refs compatibility

// SVG dimensions must match FieldCanvas
const SVG_WIDTH = 1600;
const SVG_HEIGHT = 1000;

// ============================================
// TYPES
// ============================================

export type BaseId = 'first' | 'second' | 'third' | 'home';

export type RunnerPlayType = 'SB' | 'CS' | 'WP' | 'PB' | 'PICK' | 'ERROR' | 'DI' | 'ADV';

export interface RunnerMoveData {
  from: Exclude<BaseId, 'home'>;
  to: BaseId;
  outcome: 'safe' | 'out';
  playType: RunnerPlayType;
  fielderPosition?: number;
  fielderName?: string;
}

export interface RunnerDragDropProps {
  bases: { first: boolean; second: boolean; third: boolean };
  onRunnerMove: (data: RunnerMoveData) => void;
  /** Callback when runner drag starts (to show drop zones) */
  onDragStart?: (from: Exclude<BaseId, 'home'>) => void;
  /** Callback when runner drag ends (to hide drop zones) */
  onDragEnd?: () => void;
  /** Field dimensions for positioning */
  fieldWidth?: number;
  fieldHeight?: number;
}

interface DragItem {
  type: 'RUNNER';
  fromBase: Exclude<BaseId, 'home'>;
}

// ============================================
// CONSTANTS
// ============================================

const ItemTypes = {
  RUNNER: 'RUNNER',
};

// Runner positions - slightly offset from base positions (runners lead off)
// Uses BASE_POSITIONS from FieldCanvas which are computed from real field geometry
const RUNNER_POSITIONS: Record<Exclude<BaseId, 'home'>, { x: number; y: number }> = {
  first: { x: BASE_POSITIONS.first.x - 0.02, y: BASE_POSITIONS.first.y + 0.02 },  // Lead toward 2B
  second: { x: BASE_POSITIONS.second.x, y: BASE_POSITIONS.second.y + 0.04 },       // Lead toward 3B
  third: { x: BASE_POSITIONS.third.x + 0.02, y: BASE_POSITIONS.third.y + 0.02 },  // Lead toward home
};

// Drop zone positions - safe zone on bag, out zone before the bag (toward previous base)
const DROP_ZONES: Record<BaseId, { safe: { x: number; y: number }; out: { x: number; y: number } }> = {
  first: {
    safe: { x: BASE_POSITIONS.first.x, y: BASE_POSITIONS.first.y },              // On the bag
    out: { x: BASE_POSITIONS.first.x - 0.04, y: BASE_POSITIONS.first.y - 0.04 }, // Toward home
  },
  second: {
    safe: { x: BASE_POSITIONS.second.x, y: BASE_POSITIONS.second.y },            // On the bag
    out: { x: BASE_POSITIONS.second.x, y: BASE_POSITIONS.second.y + 0.06 },      // Past the bag
  },
  third: {
    safe: { x: BASE_POSITIONS.third.x, y: BASE_POSITIONS.third.y },              // On the bag
    out: { x: BASE_POSITIONS.third.x + 0.04, y: BASE_POSITIONS.third.y - 0.04 }, // Toward home
  },
  home: {
    safe: { x: BASE_POSITIONS.home.x, y: BASE_POSITIONS.home.y - 0.02 },         // On home plate
    out: { x: BASE_POSITIONS.home.x, y: BASE_POSITIONS.home.y + 0.06 },          // In front of catcher
  },
};

// ============================================
// RUNNER ICON COMPONENT
// ============================================

interface RunnerIconProps {
  base: Exclude<BaseId, 'home'>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function RunnerIcon({ base, onDragStart, onDragEnd }: RunnerIconProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.RUNNER,
    item: (): DragItem => {
      onDragStart?.();
      return { type: 'RUNNER', fromBase: base };
    },
    end: () => {
      onDragEnd?.();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [base, onDragStart, onDragEnd]);

  const position = RUNNER_POSITIONS[base];

  // Convert to percentage using the same coordinate system as FieldCanvas
  const svgCoords = normalizedToSvg(position.x, position.y);
  const left = `${(svgCoords.svgX / SVG_WIDTH) * 100}%`;
  const top = `${(svgCoords.svgY / SVG_HEIGHT) * 100}%`;

  return (
    <div
      ref={drag as DndRef}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-30 ${
        isDragging ? 'opacity-50' : ''
      }`}
      style={{ left, top }}
    >
      <div
        className={`rounded-full flex items-center justify-center font-bold transition-transform ${
          isDragging ? 'scale-110' : 'hover:scale-105'
        }`}
        style={{
          backgroundColor: '#FFD700',
          borderColor: '#B8860B',
          borderWidth: 'max(2px, 0.15cqw)',
          borderStyle: 'solid',
          color: '#000',
          width: 'max(20px, 1.8cqw)',
          height: 'max(20px, 1.8cqw)',
          fontSize: 'max(8px, 0.6cqw)',
          boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.3)',
        }}
      >
        R
      </div>
      {/* Base label below runner */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2"
        style={{
          bottom: 'max(-10px, -0.8cqw)',
          fontSize: 'max(6px, 0.4cqw)',
          color: 'white',
          fontWeight: 'bold',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '0 max(2px, 0.15cqw)',
          borderRadius: '2px',
        }}
      >
        {base === 'first' ? '1B' : base === 'second' ? '2B' : '3B'}
      </div>
    </div>
  );
}

// ============================================
// DROP ZONE COMPONENT
// ============================================

interface DropZoneProps {
  base: BaseId;
  outcome: 'safe' | 'out';
  onDrop: (fromBase: Exclude<BaseId, 'home'>) => void;
  visible: boolean;
}

function DropZone({ base, outcome, onDrop, visible }: DropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.RUNNER,
    drop: (item: DragItem) => {
      onDrop(item.fromBase);
    },
    canDrop: (item: DragItem) => {
      // Can't advance backward (except for pickoff to same base)
      const baseOrder = ['first', 'second', 'third', 'home'];
      const fromIndex = baseOrder.indexOf(item.fromBase);
      const toIndex = baseOrder.indexOf(base);
      return toIndex > fromIndex || (toIndex === fromIndex && outcome === 'out');
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [base, outcome, onDrop]);

  if (!visible) return null;

  const position = DROP_ZONES[base][outcome];
  // Convert using the same coordinate system as FieldCanvas
  const svgCoords = normalizedToSvg(position.x, position.y);
  const left = `${(svgCoords.svgX / SVG_WIDTH) * 100}%`;
  const top = `${(svgCoords.svgY / SVG_HEIGHT) * 100}%`;

  const isSafe = outcome === 'safe';
  const bgColor = isSafe ? '#4CAF50' : '#DD0000';
  const borderColor = isOver && canDrop ? '#FFD700' : '#FFF';
  const opacity = isOver && canDrop ? 1 : 0.7;

  return (
    <div
      ref={drop as DndRef}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto"
      style={{ left, top }}
    >
      <div
        className={`rounded-lg flex items-center justify-center font-bold transition-all ${
          isOver && canDrop ? 'scale-110' : ''
        } ${!canDrop ? 'opacity-30' : ''}`}
        style={{
          backgroundColor: bgColor,
          borderColor,
          borderWidth: 'max(2px, 0.15cqw)',
          borderStyle: 'solid',
          opacity,
          width: 'max(28px, 2.5cqw)',
          height: 'max(28px, 2.5cqw)',
          boxShadow: isOver && canDrop ? '0 0 10px rgba(255,215,0,0.8)' : '2px 2px 0px 0px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ color: 'white', textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{ fontSize: 'max(7px, 0.5cqw)' }}>{isSafe ? 'SAFE' : 'OUT'}</div>
          <div style={{ fontSize: 'max(5px, 0.35cqw)', opacity: 0.8 }}>
            {base === 'home' ? 'HP' : base === 'first' ? '1B' : base === 'second' ? '2B' : '3B'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PLAY TYPE MODAL
// ============================================

interface PlayTypeModalProps {
  from: Exclude<BaseId, 'home'>;
  to: BaseId;
  outcome: 'safe' | 'out';
  onSelect: (playType: RunnerPlayType) => void;
  onClose: () => void;
}

function PlayTypeModal({ from, to, outcome, onSelect, onClose }: PlayTypeModalProps) {
  const isSafe = outcome === 'safe';

  // Different play types based on outcome
  const playTypes: { type: RunnerPlayType; label: string; description: string }[] = isSafe
    ? [
        { type: 'SB', label: 'SB', description: 'Stolen Base' },
        { type: 'WP', label: 'WP', description: 'Wild Pitch' },
        { type: 'PB', label: 'PB', description: 'Passed Ball' },
        { type: 'DI', label: 'DI', description: 'Defensive Indifference' },
        { type: 'ERROR', label: 'E', description: 'Error on throw' },
        { type: 'ADV', label: 'ADV', description: 'Advance on play' },
      ]
    : [
        { type: 'CS', label: 'CS', description: 'Caught Stealing' },
        { type: 'PICK', label: 'PICK', description: 'Pickoff' },
        { type: 'ERROR', label: 'E', description: 'Thrown out on error' },
      ];

  const fromLabel = from === 'first' ? '1B' : from === 'second' ? '2B' : '3B';
  const toLabel = to === 'home' ? 'HP' : to === 'first' ? '1B' : to === 'second' ? '2B' : '3B';

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">
          {isSafe ? 'RUNNER SAFE' : 'RUNNER OUT'}
        </div>
        <div className="text-[8px] text-[#C4A853] mb-3">
          {fromLabel} → {toLabel}
        </div>

        <div className="text-[7px] text-[#888] mb-1">PLAY TYPE</div>
        <div className="grid grid-cols-3 gap-2">
          {playTypes.map(({ type, label, description }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`border-[3px] px-2 py-2 text-[10px] font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] ${
                isSafe
                  ? 'bg-[#4CAF50] border-white text-white'
                  : 'bg-[#DD0000] border-white text-white'
              }`}
              title={description}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full bg-[#666] border-[2px] border-white px-3 py-1 text-white text-[10px] font-bold hover:bg-[#888]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function RunnerDragDrop({
  bases,
  onRunnerMove,
  onDragStart,
  onDragEnd,
}: RunnerDragDropProps) {
  // Track when a runner is being dragged to show drop zones
  const [isDragging, setIsDragging] = useState(false);
  const [draggingFrom, setDraggingFrom] = useState<Exclude<BaseId, 'home'> | null>(null);

  // Pending move state for play type selection
  const [pendingMove, setPendingMove] = useState<{
    from: Exclude<BaseId, 'home'>;
    to: BaseId;
    outcome: 'safe' | 'out';
  } | null>(null);

  const handleDragStart = useCallback((from: Exclude<BaseId, 'home'>) => {
    setIsDragging(true);
    setDraggingFrom(from);
    onDragStart?.(from);
  }, [onDragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggingFrom(null);
    onDragEnd?.();
  }, [onDragEnd]);

  const handleDropSafe = useCallback((base: BaseId) => (fromBase: Exclude<BaseId, 'home'>) => {
    setPendingMove({ from: fromBase, to: base, outcome: 'safe' });
  }, []);

  const handleDropOut = useCallback((base: BaseId) => (fromBase: Exclude<BaseId, 'home'>) => {
    setPendingMove({ from: fromBase, to: base, outcome: 'out' });
  }, []);

  const handlePlayTypeSelect = useCallback((playType: RunnerPlayType) => {
    if (pendingMove) {
      onRunnerMove({
        ...pendingMove,
        playType,
      });
      setPendingMove(null);
      handleDragEnd();
    }
  }, [pendingMove, onRunnerMove, handleDragEnd]);

  const handleModalClose = useCallback(() => {
    setPendingMove(null);
  }, []);

  // Determine which bases can receive runners from current drag
  const getAvailableTargetBases = (from: Exclude<BaseId, 'home'> | null): BaseId[] => {
    if (!from) return [];
    const order: BaseId[] = ['first', 'second', 'third', 'home'];
    const fromIndex = order.indexOf(from);
    // Can advance to any base ahead, or same base for pickoff out
    return order.slice(fromIndex);
  };

  const targetBases = getAvailableTargetBases(draggingFrom);

  return (
    <>
      {/* Runners at occupied bases */}
      {bases.first && (
        <RunnerIcon
          base="first"
          onDragStart={() => handleDragStart('first')}
          onDragEnd={handleDragEnd}
        />
      )}
      {bases.second && (
        <RunnerIcon
          base="second"
          onDragStart={() => handleDragStart('second')}
          onDragEnd={handleDragEnd}
        />
      )}
      {bases.third && (
        <RunnerIcon
          base="third"
          onDragStart={() => handleDragStart('third')}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* Drop zones - shown when dragging */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none z-25">
          {/* Safe zones */}
          {targetBases.map((base) => (
            <DropZone
              key={`safe-${base}`}
              base={base}
              outcome="safe"
              onDrop={handleDropSafe(base)}
              visible={true}
            />
          ))}

          {/* Out zones */}
          {targetBases.map((base) => (
            <DropZone
              key={`out-${base}`}
              base={base}
              outcome="out"
              onDrop={handleDropOut(base)}
              visible={true}
            />
          ))}
        </div>
      )}

      {/* Play type selection modal */}
      {pendingMove && (
        <PlayTypeModal
          from={pendingMove.from}
          to={pendingMove.to}
          outcome={pendingMove.outcome}
          onSelect={handlePlayTypeSelect}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}

export default RunnerDragDrop;
