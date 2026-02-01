/**
 * FielderIcon - Draggable fielder icon for the GameTracker
 *
 * Per GAMETRACKER_DRAGDROP_SPEC.md v4:
 * - Fielders are draggable to indicate where ball was fielded
 * - Tappable to add to throw sequence
 * - Shows position number (1-9) and player name
 * - Visual states: normal, selected (in sequence), placed
 */

import { useDrag } from 'react-dnd';
import { type FieldCoordinate, FIELDER_POSITIONS, normalizedToSvg } from './FieldCanvas';

// SVG dimensions must match FieldCanvas (updated 2026-02-01 to 1600x1000)
const SVG_WIDTH = 1600;
const SVG_HEIGHT = 1000;

// ============================================
// TYPES
// ============================================

export const ItemTypes = {
  FIELDER: 'fielder',
  BATTER: 'batter',
  RUNNER: 'runner',
} as const;

export interface FielderData {
  positionNumber: number;
  name: string;
  playerId?: string;
}

export interface FielderIconProps {
  /** Fielder data */
  fielder: FielderData;
  /** Current position (for calculating screen position) */
  position?: FieldCoordinate;
  /** Whether this fielder is in the current throw sequence */
  sequenceNumber?: number;
  /** Whether this fielder has been placed (dragged to a location) */
  isPlaced?: boolean;
  /** Border color for team identification */
  borderColor?: string;
  /** Callback when fielder is clicked/tapped */
  onClick?: (fielder: FielderData) => void;
  /** Callback when fielder is dragged to a new location */
  onDrop?: (fielder: FielderData, location: FieldCoordinate) => void;
  /** Container dimensions for position calculation */
  containerWidth?: number;
  containerHeight?: number;
  /** Whether fielder is in error mode (long-pressed) */
  isErrorMode?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DndRef = any; // React-dnd connector refs compatibility

// ============================================
// COMPONENT
// ============================================

export function FielderIcon({
  fielder,
  position,
  sequenceNumber,
  isPlaced = false,
  borderColor = '#E8E8D8',
  onClick,
  containerWidth = 400,
  containerHeight = 560,
  isErrorMode = false,
}: FielderIconProps) {
  // Get default position if not provided
  const defaultPosition = FIELDER_POSITIONS[fielder.positionNumber];
  const fieldPosition = position || { x: defaultPosition.x, y: defaultPosition.y };

  // Calculate screen position using the same coordinate conversion as FieldCanvas
  const svgCoords = normalizedToSvg(fieldPosition.x, fieldPosition.y);
  const leftPercent = (svgCoords.svgX / SVG_WIDTH) * 100;
  const topPercent = (svgCoords.svgY / SVG_HEIGHT) * 100;

  // Setup drag
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.FIELDER,
      item: { fielder, originalPosition: fieldPosition },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [fielder, fieldPosition]
  );

  // Get position label
  const positionLabel = defaultPosition?.label || `P${fielder.positionNumber}`;

  // Determine background color based on state
  let bgColor = '#6B9462'; // Default green
  if (sequenceNumber) {
    bgColor = '#DD0000'; // Red when in sequence
  }
  if (isErrorMode) {
    bgColor = '#FF6600'; // Orange for error mode
  }

  return (
    <div
      ref={drag as DndRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(fielder);
      }}
      style={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'pointer',
        // GT-005 FIX: Fully hide fielder at original position when placed
        // Previously showed at 0.3 opacity which caused duplication confusion
        opacity: isPlaced ? 0 : isDragging ? 0.5 : 1,
        pointerEvents: isPlaced ? 'none' : 'auto',
        zIndex: isDragging ? 100 : 35,
        transition: isDragging ? 'none' : 'opacity 0.2s',
      }}
    >
      <div
        className="transition-all hover:scale-105"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: '2px',
          borderStyle: 'solid',
          padding: '2px 4px',
          boxShadow: '1px 1px 0px 0px rgba(0,0,0,0.3)',
        }}
      >
        {/* Player name */}
        <div
          style={{
            color: sequenceNumber || isErrorMode ? 'white' : '#E8E8D8',
            textShadow: '1px 1px 0px rgba(0,0,0,0.3)',
            fontSize: '9px',
            fontWeight: 'bold',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          {fielder.name}
        </div>

        {/* Position and number */}
        <div
          style={{
            color: sequenceNumber || isErrorMode ? 'white' : '#E8E8D8',
            textShadow: '1px 1px 0px rgba(0,0,0,0.3)',
            fontSize: '7px',
            fontWeight: 'bold',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          {positionLabel} • {fielder.positionNumber}
        </div>

        {/* Sequence badge */}
        {sequenceNumber && (
          <div
            className="absolute rounded-full bg-[#C4A853] flex items-center justify-center"
            style={{
              top: '-4px',
              right: '-4px',
              width: '12px',
              height: '12px',
              border: '1px solid black',
            }}
          >
            <span style={{ fontSize: '8px', fontWeight: 'bold', color: 'black' }}>{sequenceNumber}</span>
          </div>
        )}

        {/* Error mode indicator */}
        {isErrorMode && (
          <div
            className="absolute rounded-full bg-[#FF0000] flex items-center justify-center"
            style={{
              top: '-4px',
              left: '-4px',
              width: '12px',
              height: '12px',
              border: '1px solid white',
            }}
          >
            <span style={{ fontSize: '8px', fontWeight: 'bold', color: 'white' }}>E</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// PLACED FIELDER VARIANT
// ============================================

export interface PlacedFielderProps {
  fielder: FielderData;
  /** Position where fielder was placed (ball location) */
  placedPosition: FieldCoordinate;
  sequenceNumber?: number;
  borderColor?: string;
  onClick?: (fielder: FielderData) => void;
  containerWidth?: number;
  containerHeight?: number;
}

/**
 * PlacedFielder - Shows where a fielder was dropped (ball fielded location)
 */
export function PlacedFielder({
  fielder,
  placedPosition,
  sequenceNumber,
  borderColor = '#E8E8D8',
  onClick,
}: PlacedFielderProps) {
  // Calculate screen position using the same coordinate conversion as FieldCanvas
  const svgCoords = normalizedToSvg(placedPosition.x, placedPosition.y);
  const leftPercent = (svgCoords.svgX / SVG_WIDTH) * 100;
  const topPercent = (svgCoords.svgY / SVG_HEIGHT) * 100;

  // Get position label
  const defaultPosition = FIELDER_POSITIONS[fielder.positionNumber];
  const positionLabel = defaultPosition?.label || `P${fielder.positionNumber}`;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(fielder);
      }}
      style={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: 40,
      }}
    >
      <div
        className="transition-all hover:scale-110"
        style={{
          backgroundColor: sequenceNumber ? '#DD0000' : '#6B9462',
          borderColor: borderColor + 'B0',
          borderWidth: '2px',
          borderStyle: 'solid',
          padding: '2px 4px',
          boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.3)',
        }}
      >
        {/* Player name */}
        <div
          style={{
            color: sequenceNumber ? 'white' : '#E8E8D8',
            textShadow: '1px 1px 0px rgba(0,0,0,0.3)',
            fontSize: '9px',
            fontWeight: 'bold',
            lineHeight: 1.2,
            textAlign: 'center',
          }}
        >
          {fielder.name}
        </div>

        {/* Position and number */}
        <div
          style={{
            color: sequenceNumber ? 'white' : '#E8E8D8',
            textShadow: '1px 1px 0px rgba(0,0,0,0.3)',
            fontSize: '7px',
            fontWeight: 'bold',
            lineHeight: 1.2,
            textAlign: 'center',
          }}
        >
          {positionLabel} • {fielder.positionNumber}
        </div>

        {/* Sequence badge */}
        {sequenceNumber && (
          <div
            className="absolute rounded-full bg-[#C4A853] border-black flex items-center justify-center"
            style={{
              top: '-4px',
              right: '-4px',
              width: '14px',
              height: '14px',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            <span style={{ fontSize: '8px', fontWeight: 'bold', color: 'black' }}>{sequenceNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// BATTER ICON
// ============================================

export interface BatterIconProps {
  /** Player name */
  name?: string;
  /** Whether batter has been dragged somewhere */
  isDragged?: boolean;
  /** Click handler */
  onClick?: () => void;
}

/**
 * BatterIcon - Draggable batter at home plate
 */
export function BatterIcon({ name = 'BATTER', isDragged = false, onClick }: BatterIconProps) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.BATTER,
      item: { type: 'batter', name },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [name]
  );

  if (isDragged) return null;

  // Position batter near home plate using the same coordinate system
  const homeCoords = normalizedToSvg(0.5, 0.02); // Just slightly in front of home
  const leftPercent = (homeCoords.svgX / SVG_WIDTH) * 100;
  const topPercent = (homeCoords.svgY / SVG_HEIGHT) * 100;

  return (
    <div
      ref={drag as DndRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        zIndex: 35,
      }}
    >
      <div
        style={{
          backgroundColor: '#CC44CC',
          borderColor: 'white',
          borderWidth: '2px',
          borderStyle: 'solid',
          padding: '4px 6px',
          boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            fontSize: '9px',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            textShadow: '1px 1px 0px rgba(0,0,0,0.3)',
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: '12px', textAlign: 'center' }}>🏏</div>
      </div>
    </div>
  );
}

// ============================================
// BALL LANDING MARKER
// ============================================

export interface BallLandingMarkerProps {
  /** Position where ball landed */
  position: FieldCoordinate;
  /** Type of ball: hit, HR, error, etc. */
  type?: 'hit' | 'hr' | 'error' | 'fielded';
}

/**
 * BallLandingMarker - Shows where a ball landed on the field
 */
export function BallLandingMarker({ position, type = 'hit' }: BallLandingMarkerProps) {
  // Calculate screen position using the same coordinate conversion as FieldCanvas
  const svgCoords = normalizedToSvg(position.x, position.y);
  const leftPercent = (svgCoords.svgX / SVG_WIDTH) * 100;
  const topPercent = (svgCoords.svgY / SVG_HEIGHT) * 100;

  // Color based on type
  const colors = {
    hit: { fill: '#CC44CC', stroke: 'white' },
    hr: { fill: '#FFD700', stroke: '#FF6600' },
    error: { fill: '#FF0000', stroke: 'white' },
    fielded: { fill: '#3366FF', stroke: 'white' },
  };

  const { fill, stroke } = colors[type];

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 50,
        width: '18px',
        height: '18px',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill={fill}
          stroke={stroke}
          strokeWidth="3"
          opacity="0.9"
        />
        {type === 'hr' && (
          <>
            {/* Baseball stitching for HR */}
            <path
              d="M 6 8 Q 12 6 18 8"
              stroke="#DD0000"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M 6 16 Q 12 18 18 16"
              stroke="#DD0000"
              strokeWidth="1.5"
              fill="none"
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ============================================
// FADING BALL MARKER (Story 9)
// ============================================

export interface FadingBallMarkerProps {
  /** Position where ball was fielded */
  position: FieldCoordinate;
  /** Whether the marker is visible (triggers fade) */
  isVisible: boolean;
  /** Callback when fade animation completes */
  onFadeComplete?: () => void;
}

/**
 * FadingBallMarker - Shows where a ball was fielded, then fades out
 * Per Story 9: Ball indicator fades after 1 second
 */
export function FadingBallMarker({ position, isVisible, onFadeComplete }: FadingBallMarkerProps) {
  // Calculate screen position
  const svgCoords = normalizedToSvg(position.x, position.y);
  const leftPercent = (svgCoords.svgX / SVG_WIDTH) * 100;
  const topPercent = (svgCoords.svgY / SVG_HEIGHT) * 100;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 45,
        width: '24px',
        height: '24px',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
      }}
      onTransitionEnd={() => {
        if (!isVisible && onFadeComplete) {
          onFadeComplete();
        }
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 24 24">
        {/* Outer glow ring */}
        <circle
          cx="12"
          cy="12"
          r="11"
          fill="none"
          stroke="#FFD700"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Inner ball indicator */}
        <circle
          cx="12"
          cy="12"
          r="8"
          fill="#3366FF"
          stroke="white"
          strokeWidth="2"
          opacity="0.9"
        />
        {/* Center dot */}
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="white"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

// ============================================
// DROP ZONE HIGHLIGHT (Story 10)
// ============================================

export interface DropZoneHighlightProps {
  /** Center position of the zone */
  position: FieldCoordinate;
  /** Type of zone: safe (green) or out (red) */
  type: 'safe' | 'out' | 'neutral';
  /** Whether zone is currently being hovered */
  isActive?: boolean;
  /** Whether to show the highlight */
  isVisible?: boolean;
  /** Size of the zone highlight */
  size?: 'small' | 'medium' | 'large';
  /** Label to show */
  label?: string;
}

/**
 * DropZoneHighlight - Highlights valid drop zones during drag
 * Per Story 10: Safe zones glow green, out zones glow red
 */
export function DropZoneHighlight({
  position,
  type,
  isActive = false,
  isVisible = true,
  size = 'medium',
  label,
}: DropZoneHighlightProps) {
  // Calculate screen position
  const svgCoords = normalizedToSvg(position.x, position.y);
  const leftPercent = (svgCoords.svgX / SVG_WIDTH) * 100;
  const topPercent = (svgCoords.svgY / SVG_HEIGHT) * 100;

  // Size mapping
  const sizeMap = {
    small: { width: 40, height: 40 },
    medium: { width: 60, height: 60 },
    large: { width: 80, height: 80 },
  };

  // Color mapping
  const colorMap = {
    safe: { fill: '#4CAF50', stroke: '#66FF66', glow: 'rgba(76, 175, 80, 0.4)' },
    out: { fill: '#DD0000', stroke: '#FF6666', glow: 'rgba(221, 0, 0, 0.4)' },
    neutral: { fill: '#3366FF', stroke: '#6699FF', glow: 'rgba(51, 102, 255, 0.4)' },
  };

  const { width, height } = sizeMap[size];
  const { fill, stroke, glow } = colorMap[type];

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 25,
        width: `${width}px`,
        height: `${height}px`,
        opacity: isActive ? 1 : 0.5,
        transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
        animation: isActive ? 'pulse 0.8s ease-in-out infinite' : 'none',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* Glow effect */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill={glow}
          opacity={isActive ? 0.8 : 0.4}
        />
        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={stroke}
          strokeWidth={isActive ? 4 : 2}
          strokeDasharray="10 5"
          opacity={isActive ? 1 : 0.6}
        />
        {/* Inner circle */}
        <circle
          cx="50"
          cy="50"
          r="30"
          fill={fill}
          opacity={isActive ? 0.5 : 0.3}
        />
      </svg>
      {/* Label */}
      {label && (
        <div
          style={{
            position: 'absolute',
            bottom: '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            fontWeight: 'bold',
            color: stroke,
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export default FielderIcon;
