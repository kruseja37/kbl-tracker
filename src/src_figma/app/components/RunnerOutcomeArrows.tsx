/**
 * RunnerOutcomeArrows - Visual arrows and draggable runners for RUNNER_OUTCOMES phase
 *
 * Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
 * Shows arrows indicating where each runner is going, AND allows user to
 * drag runners to different bases (SAFE/OUT zones) to adjust outcomes.
 *
 * Components:
 * 1. Runner icons at START positions (draggable)
 * 2. Arrows from start → destination
 * 3. Drop zones appear when dragging
 * 4. Batter icon at home plate (also draggable)
 */

import { useState, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import {
  BASE_POSITIONS,
  normalizedToSvg,
  useViewBox,
  svgToViewBoxPercent,
} from './FieldCanvas';
import type { RunnerDefaults, RunnerOutcome, BaseId } from './runnerDefaults';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DndRef = any;

// ============================================
// TYPES
// ============================================

interface RunnerOutcomeArrowsProps {
  outcomes: RunnerDefaults;
  onOutcomeChange: (updated: RunnerDefaults) => void;
  bases: { first: boolean; second: boolean; third: boolean };
}

type RunnerId = 'batter' | 'first' | 'second' | 'third';

interface DragItem {
  type: 'OUTCOME_RUNNER';
  runnerId: RunnerId;
}

// ============================================
// CONSTANTS
// ============================================

const ItemTypes = {
  OUTCOME_RUNNER: 'OUTCOME_RUNNER',
};

// Start positions for runners (where they were before the play)
const RUNNER_START_POSITIONS: Record<RunnerId, { x: number; y: number }> = {
  batter: BASE_POSITIONS.home,
  first: BASE_POSITIONS.first,
  second: BASE_POSITIONS.second,
  third: BASE_POSITIONS.third,
};

// Destination positions for display
const DESTINATION_POSITIONS: Record<Exclude<BaseId, 'out'>, { x: number; y: number }> = {
  first: BASE_POSITIONS.first,
  second: BASE_POSITIONS.second,
  third: BASE_POSITIONS.third,
  home: BASE_POSITIONS.home,
};

// Colors for different outcomes
const OUTCOME_COLORS = {
  safe: '#4CAF50',
  out: '#DD0000',
  scoring: '#9C27B0',
};

// ============================================
// ARROW COMPONENT (SVG)
// ============================================

interface OutcomeArrowProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  isOut: boolean;
}

function OutcomeArrow({ from, to, color, isOut }: OutcomeArrowProps) {
  const viewBox = useViewBox();

  // Convert normalized to viewBox percentages
  const fromSvg = normalizedToSvg(from.x, from.y);
  const toSvg = normalizedToSvg(to.x, to.y);

  const fromPct = svgToViewBoxPercent(fromSvg.svgX, fromSvg.svgY, viewBox);
  const toPct = svgToViewBoxPercent(toSvg.svgX, toSvg.svgY, viewBox);

  // Skip drawing if same position or out (out shows X instead)
  if (isOut || (from.x === to.x && from.y === to.y)) {
    return null;
  }

  // Calculate arrow ID for unique marker
  const arrowId = `arrow-${color.replace('#', '')}`;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-15"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <marker
          id={arrowId}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={color} />
        </marker>
      </defs>
      <line
        x1={`${fromPct.leftPercent}%`}
        y1={`${fromPct.topPercent}%`}
        x2={`${toPct.leftPercent}%`}
        y2={`${toPct.topPercent}%`}
        stroke={color}
        strokeWidth="3"
        strokeDasharray="8,4"
        markerEnd={`url(#${arrowId})`}
        opacity="0.8"
      />
    </svg>
  );
}

// ============================================
// OUT MARKER COMPONENT
// ============================================

interface OutMarkerProps {
  position: { x: number; y: number };
}

function OutMarker({ position }: OutMarkerProps) {
  const viewBox = useViewBox();
  const svgCoords = normalizedToSvg(position.x, position.y);
  const { leftPercent, topPercent } = svgToViewBoxPercent(svgCoords.svgX, svgCoords.svgY, viewBox);

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-25
                 text-[#DD0000] font-bold pointer-events-none"
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        fontSize: 'max(24px, 2cqw)',
        textShadow: '2px 2px 0 #000, -1px -1px 0 #000',
      }}
    >
      ✗
    </div>
  );
}

// ============================================
// DRAGGABLE RUNNER ICON
// ============================================

interface DraggableRunnerProps {
  runnerId: RunnerId;
  position: { x: number; y: number };
  destination: BaseId;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function DraggableRunner({
  runnerId,
  position,
  destination,
  onDragStart,
  onDragEnd,
}: DraggableRunnerProps) {
  const viewBox = useViewBox();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.OUTCOME_RUNNER,
    item: (): DragItem => {
      onDragStart?.();
      return { type: 'OUTCOME_RUNNER', runnerId };
    },
    end: () => {
      onDragEnd?.();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [runnerId, onDragStart, onDragEnd]);

  const svgCoords = normalizedToSvg(position.x, position.y);
  const { leftPercent, topPercent } = svgToViewBoxPercent(svgCoords.svgX, svgCoords.svgY, viewBox);

  const isOut = destination === 'out';
  const isBatter = runnerId === 'batter';
  const label = isBatter ? 'B' : runnerId === 'first' ? '1' : runnerId === 'second' ? '2' : '3';

  // Chalkboard-style colors
  const bgColor = isOut ? '#B71C1C' : isBatter ? '#1565C0' : '#C4A853';
  const borderColor = isOut ? '#FF5252' : '#C4A853';
  const textColor = isOut ? '#FFCDD2' : isBatter ? '#BBDEFB' : '#1a1a1a';

  return (
    <div
      ref={drag as DndRef}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2
                  cursor-grab active:cursor-grabbing z-30
                  ${isDragging ? 'opacity-50 scale-125' : 'hover:scale-110'}
                  transition-transform`}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
      }}
    >
      {/* Diamond-shaped runner icon for chalkboard aesthetic */}
      <div
        className="flex items-center justify-center font-black
                   shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 'max(2px, 0.15cqw)',
          borderStyle: 'solid',
          width: 'max(24px, 2cqw)',
          height: 'max(24px, 2cqw)',
          fontSize: 'max(11px, 0.85cqw)',
          color: textColor,
          borderRadius: '4px',
          transform: 'rotate(45deg)',
        }}
      >
        <span style={{ transform: 'rotate(-45deg)' }}>{label}</span>
      </div>
      {/* Destination label */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap"
        style={{
          top: 'calc(100% + 4px)',
          fontSize: 'max(8px, 0.5cqw)',
          color: isOut ? '#FF5252' : '#C4A853',
          fontWeight: 'bold',
          backgroundColor: '#1a1a1a',
          padding: '2px 6px',
          borderRadius: '3px',
          border: `1px solid ${isOut ? '#FF5252' : '#C4A853'}`,
          letterSpacing: '0.5px',
        }}
      >
        {isOut ? 'OUT' : `→${destination.toUpperCase()}`}
      </div>
    </div>
  );
}

// ============================================
// DROP ZONE COMPONENT
// ============================================

interface DropZoneProps {
  base: Exclude<BaseId, 'out'>;
  outcome: 'safe' | 'out';
  onDrop: (runnerId: RunnerId) => void;
  visible: boolean;
  draggingRunner: RunnerId | null;
}

function DropZone({ base, outcome, onDrop, visible, draggingRunner }: DropZoneProps) {
  const viewBox = useViewBox();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.OUTCOME_RUNNER,
    drop: (item: DragItem) => {
      onDrop(item.runnerId);
    },
    canDrop: (item: DragItem) => {
      // Can drop anywhere for outcome adjustment
      // Batter can go to any base
      // Runners can advance or be out at any base
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [base, outcome, onDrop]);

  if (!visible) return null;

  const basePos = DESTINATION_POSITIONS[base];
  // Offset safe/out zones slightly
  const offset = outcome === 'safe' ? 0 : 0.03;
  const position = {
    x: basePos.x + (base === 'third' ? offset : base === 'first' ? -offset : 0),
    y: basePos.y + (outcome === 'out' ? offset : 0),
  };

  const svgCoords = normalizedToSvg(position.x, position.y);
  const { leftPercent, topPercent } = svgToViewBoxPercent(svgCoords.svgX, svgCoords.svgY, viewBox);

  const isSafe = outcome === 'safe';
  const bgColor = isSafe ? '#4CAF50' : '#DD0000';
  const borderColor = isOver && canDrop ? '#FFD700' : '#FFF';

  return (
    <div
      ref={drop as DndRef}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
      }}
    >
      <div
        className={`rounded-lg flex items-center justify-center font-bold
                   transition-all
                   ${isOver && canDrop ? 'scale-125' : 'scale-100'}
                   shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]`}
        style={{
          backgroundColor: bgColor,
          borderColor,
          borderWidth: 'max(2px, 0.15cqw)',
          borderStyle: 'solid',
          opacity: isOver && canDrop ? 1 : 0.7,
          width: 'max(36px, 3cqw)',
          height: 'max(36px, 3cqw)',
        }}
      >
        <div style={{ color: 'white', textAlign: 'center', lineHeight: 1.1 }}>
          <div style={{ fontSize: 'max(8px, 0.6cqw)' }}>
            {isSafe ? 'SAFE' : 'OUT'}
          </div>
          <div style={{ fontSize: 'max(6px, 0.4cqw)', opacity: 0.8 }}>
            {base === 'home' ? 'HP' : base.toUpperCase().slice(0, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function RunnerOutcomeArrows({
  outcomes,
  onOutcomeChange,
  bases,
}: RunnerOutcomeArrowsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggingRunner, setDraggingRunner] = useState<RunnerId | null>(null);

  const handleDragStart = useCallback((runnerId: RunnerId) => {
    setIsDragging(true);
    setDraggingRunner(runnerId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggingRunner(null);
  }, []);

  // Handle drop on a zone
  const handleDrop = useCallback((
    runnerId: RunnerId,
    targetBase: Exclude<BaseId, 'out'>,
    outcome: 'safe' | 'out'
  ) => {
    const currentOutcome = runnerId === 'batter' ? outcomes.batter : outcomes[runnerId];
    if (!currentOutcome) return;

    const updatedOutcome: RunnerOutcome = {
      from: currentOutcome.from,
      to: outcome === 'out' ? 'out' : targetBase,
      isDefault: false,
      reason: outcome === 'out'
        ? `Out at ${targetBase}`
        : targetBase === 'home'
          ? 'Scored'
          : `Safe at ${targetBase.toUpperCase()}`,
    };

    const updatedOutcomes: RunnerDefaults = {
      ...outcomes,
      [runnerId]: updatedOutcome,
    };

    onOutcomeChange(updatedOutcomes);
    handleDragEnd();
  }, [outcomes, onOutcomeChange, handleDragEnd]);

  // Get arrow color based on outcome
  const getArrowColor = (outcome: RunnerOutcome): string => {
    if (outcome.to === 'out') return OUTCOME_COLORS.out;
    if (outcome.to === 'home') return OUTCOME_COLORS.scoring;
    return OUTCOME_COLORS.safe;
  };

  // Available bases for drop zones
  const dropBases: Exclude<BaseId, 'out'>[] = ['first', 'second', 'third', 'home'];

  return (
    <>
      {/* ARROWS - Draw first (behind runners) */}
      {/* Batter arrow - only if not out and moving somewhere */}
      {outcomes.batter && outcomes.batter.to !== 'out' && (
        <OutcomeArrow
          from={RUNNER_START_POSITIONS.batter}
          to={DESTINATION_POSITIONS[outcomes.batter.to]}
          color={getArrowColor(outcomes.batter)}
          isOut={false}
        />
      )}

      {/* R1 arrow - only if advancing (not staying at first or out) */}
      {outcomes.first && outcomes.first.to !== 'out' && outcomes.first.to !== 'first' && (
        <OutcomeArrow
          from={RUNNER_START_POSITIONS.first}
          to={DESTINATION_POSITIONS[outcomes.first.to]}
          color={getArrowColor(outcomes.first)}
          isOut={false}
        />
      )}

      {/* R2 arrow - only if advancing (not staying at second or out) */}
      {outcomes.second && outcomes.second.to !== 'out' && outcomes.second.to !== 'second' && (
        <OutcomeArrow
          from={RUNNER_START_POSITIONS.second}
          to={DESTINATION_POSITIONS[outcomes.second.to]}
          color={getArrowColor(outcomes.second)}
          isOut={false}
        />
      )}

      {/* R3 arrow - only if advancing (not staying at third or out) */}
      {outcomes.third && outcomes.third.to !== 'out' && outcomes.third.to !== 'third' && (
        <OutcomeArrow
          from={RUNNER_START_POSITIONS.third}
          to={DESTINATION_POSITIONS[outcomes.third.to]}
          color={getArrowColor(outcomes.third)}
          isOut={false}
        />
      )}

      {/* OUT MARKERS */}
      {outcomes.batter?.to === 'out' && (
        <OutMarker position={RUNNER_START_POSITIONS.batter} />
      )}
      {outcomes.first?.to === 'out' && (
        <OutMarker position={RUNNER_START_POSITIONS.first} />
      )}
      {outcomes.second?.to === 'out' && (
        <OutMarker position={RUNNER_START_POSITIONS.second} />
      )}
      {outcomes.third?.to === 'out' && (
        <OutMarker position={RUNNER_START_POSITIONS.third} />
      )}

      {/* DRAGGABLE RUNNERS - Shown at their DESTINATION positions */}
      {/* Per design: runners should be shown where they're advancing TO */}

      {/* Batter - show at destination (if not out) */}
      {outcomes.batter.to !== 'out' && (
        <DraggableRunner
          runnerId="batter"
          position={DESTINATION_POSITIONS[outcomes.batter.to]}
          destination={outcomes.batter.to}
          onDragStart={() => handleDragStart('batter')}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* R1 - show at destination (if not out) */}
      {outcomes.first && bases.first && outcomes.first.to !== 'out' && (
        <DraggableRunner
          runnerId="first"
          position={outcomes.first.to === 'first'
            ? DESTINATION_POSITIONS.first
            : DESTINATION_POSITIONS[outcomes.first.to as Exclude<BaseId, 'out'>]}
          destination={outcomes.first.to}
          onDragStart={() => handleDragStart('first')}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* R2 - show at destination (if not out) */}
      {outcomes.second && bases.second && outcomes.second.to !== 'out' && (
        <DraggableRunner
          runnerId="second"
          position={outcomes.second.to === 'second'
            ? DESTINATION_POSITIONS.second
            : DESTINATION_POSITIONS[outcomes.second.to as Exclude<BaseId, 'out'>]}
          destination={outcomes.second.to}
          onDragStart={() => handleDragStart('second')}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* R3 - show at destination (if not out) */}
      {outcomes.third && bases.third && outcomes.third.to !== 'out' && (
        <DraggableRunner
          runnerId="third"
          position={outcomes.third.to === 'third'
            ? DESTINATION_POSITIONS.third
            : DESTINATION_POSITIONS[outcomes.third.to as Exclude<BaseId, 'out'>]}
          destination={outcomes.third.to}
          onDragStart={() => handleDragStart('third')}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* DROP ZONES - Only visible when dragging */}
      {isDragging && (
        <>
          {dropBases.map((base) => (
            <DropZone
              key={`safe-${base}`}
              base={base}
              outcome="safe"
              onDrop={(runnerId) => handleDrop(runnerId, base, 'safe')}
              visible={true}
              draggingRunner={draggingRunner}
            />
          ))}
          {dropBases.map((base) => (
            <DropZone
              key={`out-${base}`}
              base={base}
              outcome="out"
              onDrop={(runnerId) => handleDrop(runnerId, base, 'out')}
              visible={true}
              draggingRunner={draggingRunner}
            />
          ))}
        </>
      )}
    </>
  );
}

export default RunnerOutcomeArrows;
