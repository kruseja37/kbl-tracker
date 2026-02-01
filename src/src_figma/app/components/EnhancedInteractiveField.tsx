/**
 * EnhancedInteractiveField - Drag-drop field using the new FieldCanvas system
 *
 * Per GAMETRACKER_DRAGDROP_SPEC.md v4:
 * - Uses continuous coordinate system (0-1.4 for y including stands)
 * - Fielder drag to ball location → tap throw sequence
 * - Batter drag to hit location OR HR mode
 * - Foul territory auto-detected
 *
 * This component provides the same interface as InteractiveField but with
 * the enhanced coordinate system from Phase 1.
 */

import { useState, useCallback, useEffect } from 'react';
import { useDrop } from 'react-dnd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DndRef = any; // React-dnd connector refs compatibility

import {
  FieldCanvas,
  type FieldCoordinate,
  isFoulTerritory,
  getFoulType,
  getSpraySector,
  classifyHomeRun,
  isInStands,
  FIELDER_POSITIONS,
  svgToNormalized,
} from './FieldCanvas';
import {
  FielderIcon,
  PlacedFielder,
  BatterIcon,
  BallLandingMarker,
  FadingBallMarker,
  DropZoneHighlight,
  ItemTypes,
  type FielderData,
} from './FielderIcon';
import {
  classifyPlay,
  shouldAutoComplete,
  type ClassificationResult,
  type SpecialEventPrompt,
  type PlayType as ClassifiedPlayType,
} from './playClassifier';
import {
  RunnerDragDrop,
  type RunnerMoveData,
  type BaseId,
} from './RunnerDragDrop';
import {
  SidePanel,
  HitTypeContent,
  OutTypeContent,
  HRDistanceContent,
} from './SidePanel';

// ============================================
// TYPES
// ============================================

interface GameSituation {
  outs: number;
  bases: { first: boolean; second: boolean; third: boolean };
  inning: number;
  isTop: boolean;
}

interface FieldPosition {
  name: string;
  position: string;
  number: string;
  svgX: number;
  svgY: number;
}

export type HitType = '1B' | '2B' | '3B' | 'HR';
export type OutType = 'GO' | 'FO' | 'LO' | 'DP' | 'TP' | 'K' | 'FC' | 'SAC';

export interface PlayData {
  type: 'hit' | 'out' | 'hr' | 'foul_out' | 'foul_ball';
  hitType?: HitType;
  outType?: OutType;
  fieldingSequence: number[]; // Position numbers in sequence (e.g., [6, 4, 3])
  ballLocation?: FieldCoordinate;
  batterLocation?: FieldCoordinate;
  isFoul?: boolean;
  foulType?: string;
  hrDistance?: number;
  hrType?: string;
  spraySector?: string;
}

export type SpecialEventType =
  | 'WEB_GEM'
  | 'ROBBERY'
  | 'TOOTBLAN'
  | 'KILLED_PITCHER'
  | 'NUT_SHOT'
  | 'BEAT_THROW'
  | 'BUNT'
  | 'STRIKEOUT'
  | 'STRIKEOUT_LOOKING'
  | 'DROPPED_3RD_STRIKE'
  | 'SEVEN_PLUS_PITCH_AB';

export interface SpecialEventData {
  eventType: SpecialEventType;
  fielderPosition?: number;
  fielderName?: string;
  batterId?: string;
  runnerId?: string;
}

// ============================================
// CONTEXTUAL BUTTONS INFERENCE (Phase 5B)
// ============================================

/**
 * PlayContext captures all data needed to infer which special event buttons to show.
 * Per GAMETRACKER_DRAGDROP_SPEC.md lines 54-65.
 */
interface PlayContext {
  playType: 'FO' | 'LO' | 'GO' | 'K' | '1B' | '2B' | '3B' | 'HR' | 'FC' | null;
  firstFielder: number | null;       // 1-9 position number
  ballLocationY: number | null;      // normalized 0-1 (relative to field depth)
  throwSequence: number[];           // e.g., [2, 3] for strikeout
  runnerOut: boolean;                // was a runner also put out on this play?
  throwTarget: number | null;        // target base if throw after catch
  timestamp: number;                 // when play completed (for auto-dismiss)
}

/**
 * Infer which contextual special event buttons to show based on play context.
 *
 * Inference Logic Table (per GAMETRACKER_DRAGDROP_SPEC.md):
 * | Play Detected | First Fielder | Location (y) | Buttons Shown | Inference |
 * |---------------|---------------|--------------|---------------|-----------|
 * | FO/LO         | 7,8,9         | y > 0.95     | ROBBERY       | Wall catch |
 * | FO/LO         | 7,8,9         | 0.8 < y ≤ 0.95 | WEB_GEM     | Deep catch |
 * | K (2-3 seq)   | 2             | —            | K/Ꝅ           | Strikeout  |
 * | GO/FC (1-X)   | 1             | —            | KILLED/NUTSHOT| Comebacker |
 * | Out + runner  | Any           | —            | TOOTBLAN      | Runner out |
 */
function inferContextualButtons(ctx: PlayContext | null): SpecialEventType[] {
  const buttons: SpecialEventType[] = [];

  // 7+ Pitch is ALWAYS available (no pitch tracking, user knows)
  buttons.push('SEVEN_PLUS_PITCH_AB');

  if (!ctx) return buttons;

  const isOutfielder = [7, 8, 9].includes(ctx.firstFielder ?? 0);
  const isDeepFly = ctx.ballLocationY !== null && ctx.ballLocationY > 0.8;
  const isWallCatch = ctx.ballLocationY !== null && ctx.ballLocationY > 0.95;

  // FO/LO at wall (y > 0.95) → ROBBERY (HR denied)
  if (['FO', 'LO'].includes(ctx.playType ?? '') && isOutfielder && isWallCatch) {
    buttons.push('ROBBERY');
  }
  // FO/LO deep (0.8 < y ≤ 0.95) → WEB GEM (spectacular catch)
  else if (['FO', 'LO'].includes(ctx.playType ?? '') && isOutfielder && isDeepFly) {
    buttons.push('WEB_GEM');
  }

  // Pitcher comebacker (first fielder = 1, GO/FC) → KILLED / NUTSHOT
  if (ctx.firstFielder === 1 && ['GO', 'FC'].includes(ctx.playType ?? '')) {
    buttons.push('KILLED_PITCHER');
    buttons.push('NUT_SHOT');
  }

  // Strikeout sequence (2-3 or 2-3-3) → offer K type selection
  if (ctx.firstFielder === 2 && ctx.playType === 'K') {
    // These are strikeout type options, not special events
    // Handled separately in the strikeout flow
  }

  // Runner out on same play → TOOTBLAN
  if (ctx.runnerOut) {
    buttons.push('TOOTBLAN');
  }

  // Deep fly + throw to base → runner tried to tag, TOOTBLAN
  if (isOutfielder && isDeepFly && ctx.throwTarget !== null) {
    // Check if target was a base (2B=4, 3B=5, HP=2)
    if ([2, 4, 5].includes(ctx.throwTarget)) {
      buttons.push('TOOTBLAN');
    }
  }

  // Infield hit options (y < 0.4)
  if (ctx.playType === '1B' && ctx.ballLocationY !== null && ctx.ballLocationY < 0.4) {
    buttons.push('BEAT_THROW');
    buttons.push('BUNT');
  }

  return buttons;
}

/**
 * Get emoji for special event type
 */
function getEventEmoji(eventType: SpecialEventType): string {
  switch (eventType) {
    case 'ROBBERY': return '🎭';
    case 'WEB_GEM': return '⭐';
    case 'TOOTBLAN': return '🤦';
    case 'KILLED_PITCHER': return '💥';
    case 'NUT_SHOT': return '🥜';
    case 'BEAT_THROW': return '🏃';
    case 'BUNT': return '🏏';
    case 'STRIKEOUT': return 'K';
    case 'STRIKEOUT_LOOKING': return 'Ꝅ';
    case 'DROPPED_3RD_STRIKE': return 'D3K';
    case 'SEVEN_PLUS_PITCH_AB': return '7️⃣';
    default: return '❓';
  }
}

/**
 * Get display label for special event type
 */
function getEventLabel(eventType: SpecialEventType): string {
  switch (eventType) {
    case 'ROBBERY': return 'ROBBERY';
    case 'WEB_GEM': return 'WEB GEM';
    case 'TOOTBLAN': return 'TOOTBLAN';
    case 'KILLED_PITCHER': return 'KILLED';
    case 'NUT_SHOT': return 'NUTSHOT';
    case 'BEAT_THROW': return 'BEAT THROW';
    case 'BUNT': return 'BUNT';
    case 'STRIKEOUT': return 'K';
    case 'STRIKEOUT_LOOKING': return 'LOOKING';
    case 'DROPPED_3RD_STRIKE': return 'D3K';
    case 'SEVEN_PLUS_PITCH_AB': return '7+ PITCH';
    default: return eventType;
  }
}

// Auto-dismiss timeout for contextual buttons (milliseconds)
const CONTEXTUAL_BUTTONS_TIMEOUT = 3000;

export interface EnhancedInteractiveFieldProps {
  gameSituation: GameSituation;
  fieldPositions: FieldPosition[];
  onPlayComplete: (playData: PlayData) => void;
  onSpecialEvent?: (event: SpecialEventData) => void;
  /** Handler for runner movements (SB, CS, WP, PB, etc.) */
  onRunnerMove?: (data: RunnerMoveData) => void;
  fielderBorderColors?: [string, string];
  /** Player names for each position (keyed by position number) */
  playerNames?: Record<number, string>;
}

// Re-export RunnerMoveData for consumers
export type { RunnerMoveData, BaseId } from './RunnerDragDrop';

interface PlacedFielderState {
  fielder: FielderData;
  position: FieldCoordinate;
  sequenceNumber: number;
}

// ============================================
// DROP ZONE WRAPPER
// ============================================

interface FieldDropZoneProps {
  children: React.ReactNode;
  onFielderDrop: (fielder: FielderData, position: FieldCoordinate) => void;
  onBatterDrop: (position: FieldCoordinate) => void;
  /** Callback when batter drag state changes (Story 10) */
  onBatterDragChange?: (isDragging: boolean) => void;
}

function FieldDropZone({ children, onFielderDrop, onBatterDrop, onBatterDragChange }: FieldDropZoneProps) {
  const [{ isOver, canDrop, itemType }, drop] = useDrop(
    () => ({
      accept: [ItemTypes.FIELDER, ItemTypes.BATTER],
      drop: (item: { fielder?: FielderData; type?: string }, monitor) => {
        const offset = monitor.getClientOffset();
        const element = document.getElementById('enhanced-field-drop-zone');
        if (offset && element) {
          const rect = element.getBoundingClientRect();
          const relX = offset.x - rect.left;
          const relY = offset.y - rect.top;

          // GT-001 FIX: Use same coordinate conversion as FielderIcon
          // Convert screen coords to SVG coords, then to normalized
          // Updated 2026-02-01 to match FieldCanvas (1600x1000)
          const SVG_WIDTH = 1600;
          const SVG_HEIGHT = 1000;
          const svgX = (relX / rect.width) * SVG_WIDTH;
          const svgY = (relY / rect.height) * SVG_HEIGHT;
          const position = svgToNormalized(svgX, svgY);

          if (item.fielder) {
            onFielderDrop(item.fielder, position);
          } else if (item.type === 'batter') {
            onBatterDrop(position);
          }
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
        itemType: monitor.getItemType(),
      }),
    }),
    [onFielderDrop, onBatterDrop]
  );

  // Story 10: Notify parent when batter is being dragged
  const isBatterDragging = canDrop && itemType === ItemTypes.BATTER;

  // Use effect to notify parent of drag state changes
  useState(() => {
    onBatterDragChange?.(isBatterDragging);
  });

  return (
    <div
      id="enhanced-field-drop-zone"
      ref={drop as DndRef}
      className="relative w-full h-full"
      style={{
        outline: isOver ? '3px dashed #5599FF' : 'none',
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// MODALS
// ============================================

interface PlayTypeModalProps {
  onSelect: (type: 'hit' | 'out' | 'foul_out' | 'foul_ball') => void;
  isFoul: boolean;
  isInStands: boolean;
  onClose: () => void;
}

// ============================================
// BALL LANDING PROMPT OVERLAY
// ============================================

interface BallLandingPromptProps {
  onLocationTap: (position: FieldCoordinate) => void;
  onCancel: () => void;
  destinationBase: '1B' | '2B' | '3B';
}

function BallLandingPromptOverlay({ onLocationTap, onCancel, destinationBase }: BallLandingPromptProps) {
  // GT-011: Track tap position for visual feedback
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // GT-011: Show visual feedback at click location
    setTapPosition({ x: relX, y: relY });

    // GT-001 FIX: Use same coordinate conversion as FielderIcon
    // Updated 2026-02-01 to match FieldCanvas (1600x1000)
    const SVG_WIDTH = 1600;
    const SVG_HEIGHT = 1000;
    const svgX = (relX / rect.width) * SVG_WIDTH;
    const svgY = (relY / rect.height) * SVG_HEIGHT;
    const position = svgToNormalized(svgX, svgY);

    // Don't allow tapping in stands for ball location (that's HR territory)
    if (isInStands(position.y)) {
      // GT-011: Clear feedback and show warning
      setTimeout(() => setTapPosition(null), 300);
      return;
    }

    onLocationTap(position);
  };

  return (
    <div
      className="absolute inset-0 z-40 cursor-crosshair"
      onClick={handleClick}
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* GT-011: Visual feedback pulse at tap location */}
      {tapPosition && (
        <div
          className="absolute pointer-events-none animate-ping"
          style={{
            left: tapPosition.x - 10,
            top: tapPosition.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 215, 0, 0.6)',
            border: '2px solid #FFD700',
          }}
        />
      )}
      {/* Prompt banner */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="bg-[#3366FF] border-[4px] border-white px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] text-center">
          <div className="text-[14px] font-bold text-white mb-2">
            {destinationBase} HIT
          </div>
          <div className="text-[11px] font-bold text-[#FFD700] animate-pulse">
            👆 TAP WHERE THE BALL LANDED
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="bg-[#666] border-[3px] border-white px-4 py-2 text-white text-[10px] font-bold hover:bg-[#888] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

// GT-009: HR Location Prompt Overlay - prompts user to tap where HR left the yard
interface HRLocationPromptProps {
  onLocationTap: (position: FieldCoordinate) => void;
  onCancel: () => void;
}

function HRLocationPromptOverlay({ onLocationTap, onCancel }: HRLocationPromptProps) {
  // GT-011: Track tap position for visual feedback
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);
  const [showInfieldWarning, setShowInfieldWarning] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // GT-011: Show visual feedback at click location
    setTapPosition({ x: relX, y: relY });

    // Use same coordinate conversion as other overlays
    // Updated 2026-02-01 to match FieldCanvas (1600x1000)
    const SVG_WIDTH = 1600;
    const SVG_HEIGHT = 1000;
    const svgX = (relX / rect.width) * SVG_WIDTH;
    const svgY = (relY / rect.height) * SVG_HEIGHT;
    const position = svgToNormalized(svgX, svgY);

    // HR should be in outfield/stands area (y > 0.7)
    // Allow some flexibility for wall scrapers
    if (position.y < 0.6) {
      // GT-011: Show warning for invalid tap
      setShowInfieldWarning(true);
      setTimeout(() => {
        setShowInfieldWarning(false);
        setTapPosition(null);
      }, 1000);
      console.log('[HRLocationPrompt] Tap too close to infield, ignoring');
      return;
    }

    onLocationTap(position);
  };

  return (
    <div
      className="absolute inset-0 z-40 cursor-crosshair"
      onClick={handleClick}
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* GT-011: Visual feedback pulse at tap location */}
      {tapPosition && (
        <div
          className="absolute pointer-events-none animate-ping"
          style={{
            left: tapPosition.x - 10,
            top: tapPosition.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: showInfieldWarning ? 'rgba(255, 0, 0, 0.6)' : 'rgba(255, 215, 0, 0.6)',
            border: showInfieldWarning ? '2px solid #FF0000' : '2px solid #FFD700',
          }}
        />
      )}

      {/* GT-011: Warning message for invalid tap */}
      {showInfieldWarning && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-50">
          <div className="bg-[#DD0000] border-[2px] border-white px-3 py-1 text-white text-[10px] font-bold animate-pulse">
            TAP IN OUTFIELD OR STANDS
          </div>
        </div>
      )}

      {/* Prompt banner */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="bg-[#FFD700] border-[4px] border-white px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] text-center">
          <div className="text-[14px] font-bold text-black mb-2">
            ⚾ HOME RUN
          </div>
          <div className="text-[11px] font-bold text-[#333] animate-pulse">
            👆 TAP WHERE BALL LEFT THE YARD
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="bg-[#666] border-[3px] border-white px-4 py-2 text-white text-[10px] font-bold hover:bg-[#888] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

function PlayTypeModal({ onSelect, isFoul, isInStands: inStands, onClose }: PlayTypeModalProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-3">
          {isFoul ? 'FOUL TERRITORY' : inStands ? 'HOME RUN' : 'PLAY TYPE'}
        </div>
        <div className="flex flex-col gap-2">
          {isFoul ? (
            <>
              <button
                onClick={() => onSelect('foul_out')}
                className="bg-[#4CAF50] border-[3px] border-white px-4 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                FOUL OUT (Caught)
              </button>
              <button
                onClick={() => onSelect('foul_ball')}
                className="bg-[#FF9800] border-[3px] border-white px-4 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                FOUL BALL (Strike)
              </button>
            </>
          ) : inStands ? (
            <button
              onClick={() => onSelect('hit')}
              className="bg-[#FFD700] border-[3px] border-white px-4 py-2 text-black text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              HOME RUN
            </button>
          ) : (
            <>
              <button
                onClick={() => onSelect('hit')}
                className="bg-[#4CAF50] border-[3px] border-white px-4 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                HIT (Batter Reached)
              </button>
              <button
                onClick={() => onSelect('out')}
                className="bg-[#DD0000] border-[3px] border-white px-4 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
              >
                OUT
              </button>
            </>
          )}
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

interface HRDistanceModalProps {
  onSubmit: (distance: number) => void;
  onClose: () => void;
  hrType: string;
}

function HRDistanceModal({ onSubmit, onClose, hrType }: HRDistanceModalProps) {
  const [distance, setDistance] = useState('');

  const handleSubmit = () => {
    const d = parseInt(distance);
    if (d > 0) {
      onSubmit(d);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">HOME RUN DISTANCE</div>
        <div className="text-[8px] text-[#C4A853] mb-3">Type: {hrType.toUpperCase()}</div>
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="feet"
            min="300"
            max="550"
            className="w-20 px-2 py-1 bg-[#1a1a1a] border-2 border-[#E8E8D8] text-[#E8E8D8] text-sm"
          />
          <span className="text-[#E8E8D8] text-sm self-center">ft</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!distance || parseInt(distance) < 300}
            className="flex-1 bg-[#FFD700] border-[2px] border-white px-3 py-1 text-black text-xs font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            CONFIRM
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[#666] border-[2px] border-white px-3 py-1 text-white text-xs font-bold hover:bg-[#888]"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}

// GT-006 FIX: HitTypeModal now shows trajectory (Ground/Line/Fly) instead of base (1B/2B/3B)
// The base is already known from where the batter was dropped
export type HitTrajectory = 'ground' | 'line' | 'fly';

interface HitTypeModalProps {
  onSelect: (hitType: HitType, trajectory?: HitTrajectory) => void;
  onClose: () => void;
  spraySector?: string;
  /** The base inferred from drop location */
  inferredBase?: '1B' | '2B' | '3B';
}

function HitTypeModal({ onSelect, onClose, spraySector, inferredBase }: HitTypeModalProps) {
  // When trajectory is selected, combine with inferred base
  const handleTrajectorySelect = (trajectory: HitTrajectory) => {
    const base = inferredBase || '1B';
    onSelect(base as HitType, trajectory);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">HIT TRAJECTORY</div>
        {/* Show inferred base from drop location */}
        <div className="text-[8px] text-[#C4A853] mb-3">
          Base: {inferredBase || '?'} {spraySector && `• Location: ${spraySector}`}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleTrajectorySelect('ground')}
            className="bg-[#8B4513] border-[3px] border-white px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
          >
            GROUND
          </button>
          <button
            onClick={() => handleTrajectorySelect('line')}
            className="bg-[#2196F3] border-[3px] border-white px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
          >
            LINE
          </button>
          <button
            onClick={() => handleTrajectorySelect('fly')}
            className="bg-[#4CAF50] border-[3px] border-white px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
          >
            FLY
          </button>
        </div>
        {/* Still allow manual base override */}
        <div className="text-[7px] text-[#888] mt-3 mb-1">OR CHANGE BASE:</div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => onSelect('1B')}
            className="bg-[#4CAF50] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105 transition-transform"
          >
            1B
          </button>
          <button
            onClick={() => onSelect('2B')}
            className="bg-[#2196F3] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105 transition-transform"
          >
            2B
          </button>
          <button
            onClick={() => onSelect('3B')}
            className="bg-[#9C27B0] border-[2px] border-white px-2 py-1 text-white text-[8px] font-bold hover:scale-105 transition-transform"
          >
            3B
          </button>
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

interface OutTypeModalProps {
  onSelect: (outType: OutType) => void;
  onClose: () => void;
  throwSequence: number[];
  spraySector?: string;
}

function OutTypeModal({ onSelect, onClose, throwSequence, spraySector }: OutTypeModalProps) {
  // Determine likely out types based on throw sequence
  const sequenceLength = throwSequence.length;
  const hasInfielder = throwSequence.some(pos => [3, 4, 5, 6].includes(pos));
  const hasOutfielder = throwSequence.some(pos => [7, 8, 9].includes(pos));

  // Suggest out types based on sequence
  const suggestedTypes: OutType[] = [];

  if (sequenceLength === 1) {
    // Single fielder - likely fly out or line out
    if (hasOutfielder) {
      suggestedTypes.push('FO', 'LO');
    } else if (hasInfielder) {
      suggestedTypes.push('LO', 'GO');
    }
  } else if (sequenceLength === 2) {
    // Two fielders - ground out or fielder's choice
    suggestedTypes.push('GO', 'FC');
  } else if (sequenceLength >= 3) {
    // Three+ fielders - double play or triple play
    if (sequenceLength === 3) {
      suggestedTypes.push('DP', 'GO');
    } else {
      suggestedTypes.push('TP', 'DP');
    }
  }

  // Add common types not already suggested
  const allTypes: OutType[] = ['GO', 'FO', 'LO', 'DP', 'FC', 'SAC'];
  const otherTypes = allTypes.filter(t => !suggestedTypes.includes(t));

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#E8E8D8] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
        <div className="text-[10px] text-[#E8E8D8] font-bold mb-2">OUT TYPE</div>
        <div className="text-[8px] text-[#C4A853] mb-3">
          Sequence: {throwSequence.join('-') || 'None'}
          {spraySector && ` • ${spraySector}`}
        </div>

        {/* Suggested types (highlighted) */}
        {suggestedTypes.length > 0 && (
          <div className="mb-2">
            <div className="text-[7px] text-[#888] mb-1">SUGGESTED</div>
            <div className="grid grid-cols-3 gap-2">
              {suggestedTypes.map(type => (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  className="bg-[#DD0000] border-[3px] border-[#FFD700] px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Other types */}
        <div className="text-[7px] text-[#888] mb-1">OTHER</div>
        <div className="grid grid-cols-3 gap-2">
          {otherTypes.map(type => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="bg-[#8B0000] border-[3px] border-white px-3 py-2 text-white text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              {type}
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

interface SpecialEventPromptModalProps {
  prompt: SpecialEventPrompt;
  onAnswer: (confirmed: boolean) => void;
}

function SpecialEventPromptModal({ prompt, onAnswer }: SpecialEventPromptModalProps) {
  // Map event types to emojis
  const eventEmojis: Record<string, string> = {
    WEB_GEM: '⭐',
    ROBBERY: '🎭',
    TOOTBLAN: '🤦',
    KILLED_PITCHER: '💥',
    NUT_SHOT: '🥜',
    DIVING_CATCH: '🏊',
    INSIDE_PARK_HR: '🏠',
  };

  const emoji = eventEmojis[prompt.eventType] || '❓';

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-[#333] border-[4px] border-[#C4A853] p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] max-w-xs">
        <div className="text-center mb-3">
          <span className="text-3xl">{emoji}</span>
        </div>
        <div className="text-[12px] text-[#E8E8D8] font-bold mb-2 text-center">
          {prompt.question}
        </div>
        <div className="text-[8px] text-[#C4A853] mb-4 text-center">
          {prompt.fameImpact}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAnswer(true)}
            className={`flex-1 border-[3px] px-3 py-2 text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] ${
              prompt.defaultAnswer
                ? 'bg-[#4CAF50] border-[#FFD700] text-white'
                : 'bg-[#4CAF50] border-white text-white'
            }`}
          >
            YES
          </button>
          <button
            onClick={() => onAnswer(false)}
            className={`flex-1 border-[3px] px-3 py-2 text-xs font-bold hover:scale-105 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] ${
              !prompt.defaultAnswer
                ? 'bg-[#DD0000] border-[#FFD700] text-white'
                : 'bg-[#DD0000] border-white text-white'
            }`}
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CONTEXTUAL QUICK BUTTONS COMPONENT (v2)
// ============================================

/**
 * Per GAMETRACKER_DRAGDROP_SPEC.md v2:
 * Contextual buttons appear after play completion in the foul territory area.
 * They're quick one-tap refinements based on the play type detected.
 */

interface ContextualButton {
  id: SpecialEventType;
  label: string;
  emoji: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  enabled: boolean;
  title: string;
}

// GT-007: Quick result type for non-ball-in-play outcomes
export type QuickResultType = 'BB' | 'IBB' | 'K' | 'KL' | 'HBP' | 'D3K';

interface QuickButtonsProps {
  onSpecialEvent: (eventType: SpecialEventType) => void;
  onHomeRun: () => void;
  /** GT-007: Handler for quick result buttons (BB, K, HBP, etc.) */
  onQuickResult?: (resultType: QuickResultType) => void;
  /** Name of fielder who can be credited for Web Gem/Robbery (from last play) */
  webGemFielderName?: string;
  /** Ball location from last play (y > 0.95 = robbery, y > 0.8 = web gem) */
  lastPlayBallY?: number;
  /** First fielder position from last play (1 = pitcher comebacker) */
  lastPlayFirstFielder?: number;
  /** Was last play an infield hit? (y < 0.4) */
  wasInfieldHit?: boolean;
  /** Was last play a strikeout sequence (2-3 or 2-3-3)? */
  strikeoutType?: 'K' | 'D3K' | null;
  /** Was there a runner out on the play (non-DP)? */
  hadRunnerOut?: boolean;
}

function QuickButtons({
  onSpecialEvent,
  onHomeRun,
  onQuickResult,
  webGemFielderName,
  lastPlayBallY,
  lastPlayFirstFielder,
  wasInfieldHit,
  strikeoutType,
  hadRunnerOut,
}: QuickButtonsProps) {
  // Build contextual buttons based on last play
  const contextualButtons: ContextualButton[] = [];

  // Web Gem / Robbery (deep outfield catch)
  const canWebGem = !!webGemFielderName && lastPlayBallY !== undefined && lastPlayBallY > 0.8;
  const isRobbery = lastPlayBallY !== undefined && lastPlayBallY > 0.95;

  if (canWebGem) {
    if (isRobbery) {
      contextualButtons.push({
        id: 'ROBBERY',
        label: webGemFielderName || 'ROBBERY',
        emoji: '🎭',
        bgColor: '#9C27B0', // Purple
        borderColor: '#FFD700',
        textColor: 'white',
        enabled: true,
        title: `Credit HR Robbery to ${webGemFielderName}`,
      });
    } else {
      contextualButtons.push({
        id: 'WEB_GEM',
        label: webGemFielderName || 'WEB GEM',
        emoji: '⭐',
        bgColor: '#4169E1', // Blue
        borderColor: '#FFD700',
        textColor: 'white',
        enabled: true,
        title: `Credit Web Gem to ${webGemFielderName}`,
      });
    }
  }

  // Killed Pitcher / Nut Shot (pitcher comebacker)
  const isPitcherComebacker = lastPlayFirstFielder === 1;
  if (isPitcherComebacker) {
    contextualButtons.push({
      id: 'KILLED_PITCHER',
      label: 'KILLED',
      emoji: '💥',
      bgColor: '#FF5722', // Deep Orange
      borderColor: '#FFD700',
      textColor: 'white',
      enabled: true,
      title: 'Knocked pitcher down (+3 Fame)',
    });
    contextualButtons.push({
      id: 'NUT_SHOT',
      label: 'NUTSHOT',
      emoji: '🥜',
      bgColor: '#795548', // Brown
      borderColor: '#FFD700',
      textColor: 'white',
      enabled: true,
      title: 'Nut shot (+1 Fame)',
    });
  }

  // Strikeout type selection (2-3 or 2-3-3 sequence)
  if (strikeoutType === 'K') {
    contextualButtons.push({
      id: 'STRIKEOUT',
      label: 'K',
      emoji: 'K',
      bgColor: '#DD0000', // Red
      borderColor: 'white',
      textColor: 'white',
      enabled: true,
      title: 'Strikeout swinging',
    });
    contextualButtons.push({
      id: 'STRIKEOUT_LOOKING',
      label: 'Ꝅ',
      emoji: 'Ꝅ',
      bgColor: '#8B0000', // Dark Red
      borderColor: 'white',
      textColor: 'white',
      enabled: true,
      title: 'Strikeout looking',
    });
  } else if (strikeoutType === 'D3K') {
    contextualButtons.push({
      id: 'STRIKEOUT',
      label: 'K',
      emoji: 'K',
      bgColor: '#DD0000',
      borderColor: 'white',
      textColor: 'white',
      enabled: true,
      title: 'Dropped 3rd strike - swinging',
    });
    contextualButtons.push({
      id: 'STRIKEOUT_LOOKING',
      label: 'Ꝅ',
      emoji: 'Ꝅ',
      bgColor: '#8B0000',
      borderColor: 'white',
      textColor: 'white',
      enabled: true,
      title: 'Dropped 3rd strike - looking',
    });
    contextualButtons.push({
      id: 'DROPPED_3RD_STRIKE',
      label: 'D3K',
      emoji: '⬇️',
      bgColor: '#FF9800', // Orange
      borderColor: '#FFD700',
      textColor: 'black',
      enabled: true,
      title: 'Dropped 3rd strike',
    });
  }

  // Infield hit refinement (beat throw vs bunt)
  if (wasInfieldHit) {
    contextualButtons.push({
      id: 'BEAT_THROW',
      label: 'BEAT THROW',
      emoji: '🏃',
      bgColor: '#4CAF50', // Green
      borderColor: 'white',
      textColor: 'white',
      enabled: true,
      title: 'Beat the throw - speed',
    });
    contextualButtons.push({
      id: 'BUNT',
      label: 'BUNT',
      emoji: '🏏',
      bgColor: '#607D8B', // Blue Grey
      borderColor: 'white',
      textColor: 'white',
      enabled: true,
      title: 'Bunt single',
    });
  }

  // TOOTBLAN (runner out on play, non-DP)
  if (hadRunnerOut) {
    contextualButtons.push({
      id: 'TOOTBLAN',
      label: 'TOOTBLAN',
      emoji: '🤦',
      bgColor: '#E91E63', // Pink
      borderColor: '#FFD700',
      textColor: 'white',
      enabled: true,
      title: 'Baserunning blunder (-3 Fame)',
    });
  }

  // Always show: 7+ Pitch AB (user just knows, no tracking needed)
  contextualButtons.push({
    id: 'SEVEN_PLUS_PITCH_AB',
    label: '7+ PITCH',
    emoji: '7️⃣',
    bgColor: '#2196F3', // Blue
    borderColor: 'white',
    textColor: 'white',
    enabled: true,
    title: 'Tough at-bat (7+ pitches)',
  });

  return (
    <div className="space-y-1.5">
      {/* GT-007: Primary action buttons for non-ball-in-play outcomes */}
      {onQuickResult && (
        <div className="flex flex-wrap gap-1 justify-center">
          <button
            onClick={() => onQuickResult('BB')}
            className="bg-[#4CAF50] border-[2px] border-white px-3 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            title="Walk (Base on Balls)"
          >
            BB
          </button>
          <button
            onClick={() => onQuickResult('K')}
            className="bg-[#DD0000] border-[2px] border-white px-3 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            title="Strikeout Swinging"
          >
            K
          </button>
          <button
            onClick={() => onQuickResult('KL')}
            className="bg-[#8B0000] border-[2px] border-white px-3 py-1.5 text-[10px] font-bold text-white hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            title="Strikeout Looking"
          >
            Ꝅ
          </button>
          <button
            onClick={() => onQuickResult('HBP')}
            className="bg-[#FF9800] border-[2px] border-white px-3 py-1.5 text-[10px] font-bold text-black hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            title="Hit By Pitch"
          >
            HBP
          </button>
          <button
            onClick={onHomeRun}
            className="bg-[#FFD700] border-[2px] border-white px-3 py-1.5 text-[10px] font-bold text-black hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            title="Home Run"
          >
            HR
          </button>
        </div>
      )}

      {/* Contextual buttons for special events */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {contextualButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => onSpecialEvent(btn.id)}
            disabled={!btn.enabled}
            className={`border-[2px] px-2 py-1 text-[9px] font-bold transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] flex items-center gap-0.5 ${
              btn.enabled
                ? 'hover:scale-105'
                : 'opacity-50 cursor-not-allowed'
            }`}
            style={{
              backgroundColor: btn.bgColor,
              borderColor: btn.borderColor,
              color: btn.textColor,
            }}
            title={btn.title}
          >
            <span>{btn.emoji}</span>
            <span>{btn.label}</span>
          </button>
        ))}

        {/* HR button in contextual row if no onQuickResult handler */}
        {!onQuickResult && (
          <button
            onClick={onHomeRun}
            className="bg-[#FFD700] border-[2px] border-white px-2 py-1 text-[9px] font-bold text-black hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] flex items-center gap-0.5"
            title="Home Run (quick entry)"
          >
            <span>💣</span>
            <span>HR</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function EnhancedInteractiveField({
  gameSituation,
  fieldPositions,
  onPlayComplete,
  onSpecialEvent,
  onRunnerMove,
  fielderBorderColors = ['#E8E8D8', '#E8E8D8'],
  playerNames = {},
}: EnhancedInteractiveFieldProps) {
  // Play state
  const [placedFielders, setPlacedFielders] = useState<PlacedFielderState[]>([]);
  const [throwSequence, setThrowSequence] = useState<FielderData[]>([]);
  const [batterPosition, setBatterPosition] = useState<FieldCoordinate | null>(null);
  const [ballLocation, setBallLocation] = useState<FieldCoordinate | null>(null);

  // Track last play context for contextual button inference
  const [lastPlayFirstFielder, setLastPlayFirstFielder] = useState<FielderData | null>(null);
  const [lastPlayBallLocation, setLastPlayBallLocation] = useState<FieldCoordinate | null>(null);
  const [lastPlayWasInfieldHit, setLastPlayWasInfieldHit] = useState<boolean>(false);
  const [lastPlayStrikeoutType, setLastPlayStrikeoutType] = useState<'K' | 'D3K' | null>(null);
  const [lastPlayHadRunnerOut, setLastPlayHadRunnerOut] = useState<boolean>(false);

  // Phase 5B: Full play context for contextual button inference (southern foul territory buttons)
  const [lastPlayContext, setLastPlayContext] = useState<PlayContext | null>(null);

  // Phase 5B: Auto-dismiss contextual buttons after timeout
  // This useEffect triggers a re-render to hide buttons after CONTEXTUAL_BUTTONS_TIMEOUT
  useEffect(() => {
    if (lastPlayContext) {
      const timer = setTimeout(() => {
        setLastPlayContext(null);
      }, CONTEXTUAL_BUTTONS_TIMEOUT);
      return () => clearTimeout(timer);
    }
  }, [lastPlayContext]);

  // Modal state
  const [showPlayTypeModal, setShowPlayTypeModal] = useState(false);
  const [showHitTypeModal, setShowHitTypeModal] = useState(false);
  const [showOutTypeModal, setShowOutTypeModal] = useState(false);
  const [showHRDistanceModal, setShowHRDistanceModal] = useState(false);
  const [showSpecialEventPrompt, setShowSpecialEventPrompt] = useState(false);
  const [pendingPlayType, setPendingPlayType] = useState<'hit' | 'out' | 'foul_out' | 'foul_ball' | null>(null);
  const [pendingHRData, setPendingHRData] = useState<{
    location: FieldCoordinate;
    hrType: string;
  } | null>(null);

  // Phase 2: Side panel state - modals appear in foul territory instead of center overlay
  // Left panel (LF foul territory): Hit type selection
  // Right panel (RF foul territory): Out type selection, HR distance
  const [sidePanelOpen, setSidePanelOpen] = useState<'left' | 'right' | null>(null);

  // Ball landing prompt state - for capturing ball location after batter reaches base
  const [showBallLandingPrompt, setShowBallLandingPrompt] = useState(false);
  const [pendingBatterBase, setPendingBatterBase] = useState<'1B' | '2B' | '3B' | null>(null);

  // GT-009: HR location prompt state - prompts for HR location before distance
  const [showHRLocationPrompt, setShowHRLocationPrompt] = useState(false);

  // Classification state
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [pendingPrompts, setPendingPrompts] = useState<SpecialEventPrompt[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // CLASSIFY button feedback state - shows "CLASSIFYING..." animation before result
  const [isClassifying, setIsClassifying] = useState(false);

  // Story 9: Fading ball marker state
  const [fadingBallPosition, setFadingBallPosition] = useState<FieldCoordinate | null>(null);
  const [showFadingBall, setShowFadingBall] = useState(false);

  // Story 10: Drop zone highlighting (tracked via isDragging from useDrop)
  const [isDraggingBatter, setIsDraggingBatter] = useState(false);

  // GT-015: Auto-inference confirmation toast
  const [inferenceToast, setInferenceToast] = useState<string | null>(null);

  // Build fielders from fieldPositions prop
  const fielders: FielderData[] = Object.values(FIELDER_POSITIONS).map((pos) => {
    const fieldPos = fieldPositions.find(
      (fp) => fp.number === String(pos.positionNumber)
    );
    return {
      positionNumber: pos.positionNumber,
      name: playerNames[pos.positionNumber] || fieldPos?.name || pos.label,
      playerId: `player-${pos.positionNumber}`,
    };
  });

  // Complete a play and save context for contextual button inference
  const completePlay = useCallback((playData: PlayData) => {
    // Save the first fielder from this play for Web Gem/Killed/Nutshot attribution
    if (throwSequence.length > 0) {
      setLastPlayFirstFielder(throwSequence[0]);
    } else {
      setLastPlayFirstFielder(null);
    }

    // Save ball location to determine if it was a robbery (y > 0.95) or web gem (y > 0.8)
    const location = playData.ballLocation || playData.batterLocation;
    if (location) {
      setLastPlayBallLocation(location);
    } else {
      setLastPlayBallLocation(null);
    }

    // Track if this was an infield hit (for beat throw / bunt buttons)
    const isInfieldHit = playData.type === 'hit' && location !== undefined && location.y < 0.4;
    setLastPlayWasInfieldHit(isInfieldHit ?? false);

    // Track if this was a strikeout sequence (2-3 = K, 2-3-3 = D3K)
    const seq = playData.fieldingSequence;
    const notation = seq.join('-');
    if (notation === '2-3') {
      setLastPlayStrikeoutType('K');
    } else if (notation === '2-3-3') {
      setLastPlayStrikeoutType('D3K');
    } else {
      setLastPlayStrikeoutType(null);
    }

    // Track if there was a runner out (for TOOTBLAN) - this would need additional data
    // For now, we check if it's a fly out to deep outfield (potential tag-up TOOTBLAN)
    const isDeepFlyOut = playData.type === 'out' &&
      playData.outType === 'FO' &&
      location !== undefined &&
      location.y > 0.8 &&
      seq.length > 1; // Throw was made after catch
    setLastPlayHadRunnerOut(isDeepFlyOut ?? false);

    // Phase 5B: Build full PlayContext for contextual button inference
    // This enables the southern foul territory buttons to appear based on play type
    const playTypeMap: Record<string, PlayContext['playType']> = {
      'FO': 'FO',
      'LO': 'LO',
      'GO': 'GO',
      'FC': 'FC',
      'K': 'K',
    };

    const hitTypeMap: Record<string, PlayContext['playType']> = {
      '1B': '1B',
      '2B': '2B',
      '3B': '3B',
      'HR': 'HR',
    };

    let inferredPlayType: PlayContext['playType'] = null;
    if (playData.type === 'out' && playData.outType) {
      inferredPlayType = playTypeMap[playData.outType] || null;
    } else if (playData.type === 'hit' && playData.hitType) {
      inferredPlayType = hitTypeMap[playData.hitType] || null;
    } else if (playData.type === 'hr') {
      inferredPlayType = 'HR';
    }

    // Determine throw target (for TOOTBLAN detection after deep fly)
    let throwTarget: number | null = null;
    if (seq.length > 1) {
      // Last fielder in sequence is the throw target position
      throwTarget = seq[seq.length - 1];
    }

    const playContext: PlayContext = {
      playType: inferredPlayType,
      firstFielder: throwSequence.length > 0 ? throwSequence[0].positionNumber : null,
      ballLocationY: location?.y ?? null,
      throwSequence: seq,
      runnerOut: isDeepFlyOut ?? false,
      throwTarget,
      timestamp: Date.now(),
    };

    setLastPlayContext(playContext);

    onPlayComplete(playData);
  }, [throwSequence, onPlayComplete]);

  // GT-014 FIX: Determine base using proximity to visual drop zone positions
  // These match the DropZoneHighlight positions shown during batter drag
  const BASE_POSITIONS = {
    '1B': { x: 0.75, y: 0.15 },  // 1st base area
    '2B': { x: 0.5, y: 0.35 },   // 2nd base/center area
    '3B': { x: 0.25, y: 0.15 },  // 3rd base area
  };

  const determineBatterBase = useCallback((position: FieldCoordinate): '1B' | '2B' | '3B' | null => {
    // If dropped in stands (y > 1.0), it's a HR
    if (isInStands(position.y)) {
      return null;  // HR, not a base hit
    }

    // If clearly in foul territory
    if (isFoulTerritory(position.x, position.y)) {
      return null;
    }

    // GT-014: Use proximity-based detection with depth consideration
    // Deeper hits (outfield) tend to be extra-base hits
    // But we also consider x-position for left/right

    // For deep outfield (y > 0.7): Triple territory
    if (position.y > 0.7) {
      return '3B';
    }

    // For medium outfield (0.5 < y <= 0.7): Double territory
    if (position.y > 0.5) {
      return '2B';
    }

    // For infield/shallow outfield (y <= 0.5): Use proximity to bases
    // Calculate distance to each base position
    const distances = {
      '1B': Math.sqrt(
        Math.pow(position.x - BASE_POSITIONS['1B'].x, 2) +
        Math.pow(position.y - BASE_POSITIONS['1B'].y, 2)
      ),
      '2B': Math.sqrt(
        Math.pow(position.x - BASE_POSITIONS['2B'].x, 2) +
        Math.pow(position.y - BASE_POSITIONS['2B'].y, 2)
      ),
      '3B': Math.sqrt(
        Math.pow(position.x - BASE_POSITIONS['3B'].x, 2) +
        Math.pow(position.y - BASE_POSITIONS['3B'].y, 2)
      ),
    };

    // Find closest base
    let closestBase: '1B' | '2B' | '3B' = '1B';
    let minDistance = distances['1B'];
    if (distances['2B'] < minDistance) {
      closestBase = '2B';
      minDistance = distances['2B'];
    }
    if (distances['3B'] < minDistance) {
      closestBase = '3B';
    }

    return closestBase;
  }, []);

  // Handle fielder drop (ball fielded location)
  const handleFielderDrop = useCallback(
    (fielder: FielderData, position: FieldCoordinate) => {
      // Add to placed fielders with sequence number 1
      setPlacedFielders([{ fielder, position, sequenceNumber: 1 }]);
      // Start throw sequence
      setThrowSequence([fielder]);
      // Store ball location
      setBallLocation(position);

      // Story 9: Show fading ball marker at drop location
      setFadingBallPosition(position);
      setShowFadingBall(true);
      // Trigger fade after 1 second
      setTimeout(() => {
        setShowFadingBall(false);
      }, 1000);
    },
    []
  );

  // Handle batter drop (hit location) - now uses classifier for inference
  const handleBatterDrop = useCallback((position: FieldCoordinate) => {
    setBatterPosition(position);

    // Use classifier to determine play type
    const result = classifyPlay({
      batterPosition: position,
      ballLocation: ballLocation || undefined,
      fieldingSequence: throwSequence.map((f) => f.positionNumber),
      gameContext: {
        outs: gameSituation.outs,
        bases: gameSituation.bases,
        inning: gameSituation.inning,
        isTop: gameSituation.isTop,
      },
    });

    setClassificationResult(result);

    // Check if in stands (HR) - always need distance input
    if (isInStands(position.y)) {
      const hrType = classifyHomeRun(position.y);
      setPendingHRData({ location: position, hrType });
      setShowHRDistanceModal(true);
      return;
    }

    // Check for foul territory - auto-complete if caught
    if (isFoulTerritory(position.x, position.y)) {
      if (throwSequence.length > 0) {
        // Foul out - auto-complete
        const sector = getSpraySector(position.x, position.y);
        const playData: PlayData = {
          type: 'foul_out',
          outType: 'FO',
          fieldingSequence: throwSequence.map((f) => f.positionNumber),
          ballLocation: ballLocation || position,
          batterLocation: position,
          isFoul: true,
          foulType: getFoulType(position.x, position.y) ?? undefined,
          spraySector: sector.sector,
        };
        completePlay(playData);

        // Check for prompts (e.g., web gem on foul catch)
        if (result.prompts.length > 0) {
          setPendingPrompts(result.prompts);
          setCurrentPromptIndex(0);
          setShowSpecialEventPrompt(true);
        } else {
          handleReset();
        }
        return;
      } else {
        // Foul ball (no catch) - no fielder to attribute
        const playData: PlayData = {
          type: 'foul_ball',
          fieldingSequence: [],
          batterLocation: position,
          isFoul: true,
          foulType: getFoulType(position.x, position.y) ?? undefined,
        };
        onPlayComplete(playData); // Direct call - no fielder for Web Gem
        handleReset();
        return;
      }
    }

    // NEW FLOW: If no fielder sequence, this is a HIT - show ball landing prompt
    // Per GAMETRACKER_DRAGDROP_SPEC.md: Batter drag to base → "Touch where ball landed"
    if (throwSequence.length === 0) {
      const destinationBase = determineBatterBase(position);
      if (destinationBase) {
        // This is a hit - show ball landing prompt
        setPendingBatterBase(destinationBase);
        setShowBallLandingPrompt(true);
        return;
      }
    }

    // If fielder sequence exists, this is an OUT - check auto-complete
    if (shouldAutoComplete(result)) {
      const sector = getSpraySector(position.x, position.y);
      const playData: PlayData = {
        type: result.playType as PlayData['type'],
        hitType: result.hitType,
        outType: result.outType,
        fieldingSequence: throwSequence.map((f) => f.positionNumber),
        ballLocation: ballLocation || position,
        batterLocation: position,
        spraySector: sector.sector,
      };
      completePlay(playData);

      // GT-015: Show inference confirmation toast
      const notation = throwSequence.map(f => f.positionNumber).join('-');
      const outTypeLabel = result.outType === 'GO' ? 'Ground Out' :
                           result.outType === 'FO' ? 'Fly Out' :
                           result.outType === 'LO' ? 'Line Out' : result.outType;
      setInferenceToast(`${notation} ${outTypeLabel}`);
      setTimeout(() => setInferenceToast(null), 2000);

      // Check for prompts
      if (result.prompts.length > 0) {
        setPendingPrompts(result.prompts);
        setCurrentPromptIndex(0);
        setShowSpecialEventPrompt(true);
      } else {
        handleReset();
      }
      return;
    }

    // Store prompts for later
    if (result.prompts.length > 0) {
      setPendingPrompts(result.prompts);
    }

    // Not auto-complete - show appropriate modal
    setShowPlayTypeModal(true);
  }, [ballLocation, throwSequence, gameSituation, onPlayComplete, completePlay, determineBatterBase]);

  // Handle ball location tap (after ball landing prompt for hits)
  const handleBallLocationTap = useCallback((position: FieldCoordinate) => {
    // Store the ball location
    setBallLocation(position);
    setShowBallLandingPrompt(false);

    // Now show hit type modal with the captured location
    // The batter position was stored when they were dragged
    // Use classifier to help suggest hit type
    const result = classifyPlay({
      batterPosition: batterPosition || undefined,
      ballLocation: position,
      fieldingSequence: [], // No fielders involved in a hit
      gameContext: {
        outs: gameSituation.outs,
        bases: gameSituation.bases,
        inning: gameSituation.inning,
        isTop: gameSituation.isTop,
      },
    });

    setClassificationResult(result);

    // Store any prompts (e.g., infield hit = beat throw / bunt?)
    if (result.prompts.length > 0) {
      setPendingPrompts(result.prompts);
    }

    // Show hit type modal
    setPendingPlayType('hit');
    setShowHitTypeModal(true);
  }, [batterPosition, gameSituation]);

  // Handle ball landing prompt cancel - inline reset to avoid dependency issues
  const handleBallLandingCancel = useCallback(() => {
    setShowBallLandingPrompt(false);
    setPendingBatterBase(null);
    // Inline reset state instead of calling handleReset (defined later)
    setPlacedFielders([]);
    setThrowSequence([]);
    setBatterPosition(null);
    setBallLocation(null);
    setPendingPlayType(null);
    setPendingHRData(null);
    setShowPlayTypeModal(false);
    setShowHitTypeModal(false);
    setShowOutTypeModal(false);
    setShowHRDistanceModal(false);
    setShowSpecialEventPrompt(false);
    setClassificationResult(null);
    setPendingPrompts([]);
    setCurrentPromptIndex(0);
  }, []);

  // Handle fielder click (add to throw sequence)
  const handleFielderClick = useCallback(
    (fielder: FielderData) => {
      // Only allow clicking to add to sequence if there's already a placed fielder
      if (placedFielders.length === 0) return;

      // Don't add if already in sequence
      if (throwSequence.some((f) => f.positionNumber === fielder.positionNumber)) return;

      // Add to throw sequence
      const newSequence = [...throwSequence, fielder];
      setThrowSequence(newSequence);
    },
    [placedFielders.length, throwSequence]
  );

  // Get sequence number for a fielder
  const getSequenceNumber = (fielder: FielderData): number | undefined => {
    const index = throwSequence.findIndex(
      (f) => f.positionNumber === fielder.positionNumber
    );
    return index >= 0 ? index + 1 : undefined;
  };

  // Check if fielder is placed
  const isFielderPlaced = (fielder: FielderData): boolean => {
    return placedFielders.some(
      (pf) => pf.fielder.positionNumber === fielder.positionNumber
    );
  };

  // Handle play type selection from modal - chains to hit/out type modals
  const handlePlayTypeSelect = useCallback(
    (type: 'hit' | 'out' | 'foul_out' | 'foul_ball') => {
      setPendingPlayType(type);
      setShowPlayTypeModal(false);

      if (type === 'hit') {
        // Chain to hit type modal
        setShowHitTypeModal(true);
      } else if (type === 'out') {
        // Chain to out type modal
        setShowOutTypeModal(true);
      } else {
        // Foul out or foul ball - complete immediately
        if (batterPosition) {
          const isFoul = isFoulTerritory(batterPosition.x, batterPosition.y);
          const foulType = isFoul ? getFoulType(batterPosition.x, batterPosition.y) : undefined;
          const sector = getSpraySector(batterPosition.x, batterPosition.y);

          const playData: PlayData = {
            type: type,
            fieldingSequence: throwSequence.map((f) => f.positionNumber),
            ballLocation: ballLocation || batterPosition,
            batterLocation: batterPosition,
            isFoul,
            foulType: foulType ?? undefined,
            spraySector: sector.sector,
          };

          completePlay(playData);
          handleReset();
        }
      }
    },
    [batterPosition, ballLocation, throwSequence, completePlay]
  );

  // Handle hit type selection
  // GT-006: Handle hit type selection with optional trajectory
  const handleHitTypeSelect = useCallback(
    (hitType: HitType, trajectory?: HitTrajectory) => {
      setShowHitTypeModal(false);

      if (batterPosition) {
        const isFoul = isFoulTerritory(batterPosition.x, batterPosition.y);
        const foulType = isFoul ? getFoulType(batterPosition.x, batterPosition.y) : undefined;
        const sector = getSpraySector(batterPosition.x, batterPosition.y);

        const playData: PlayData = {
          type: 'hit',
          hitType,
          fieldingSequence: throwSequence.map((f) => f.positionNumber),
          ballLocation: ballLocation || batterPosition,
          batterLocation: batterPosition,
          isFoul,
          foulType: foulType ?? undefined,
          spraySector: sector.sector,
        };

        // Log trajectory for spray chart analysis (if needed for future use)
        if (trajectory) {
          console.log(`[Hit] ${hitType} - ${trajectory} ball to ${sector.sector}`);
        }

        // Hits can still have fielding sequences (e.g., single with throw home)
        completePlay(playData);
        handleReset();
      }
    },
    [batterPosition, ballLocation, throwSequence, completePlay]
  );

  // Handle out type selection
  const handleOutTypeSelect = useCallback(
    (outType: OutType) => {
      setShowOutTypeModal(false);

      if (batterPosition) {
        const isFoul = isFoulTerritory(batterPosition.x, batterPosition.y);
        const foulType = isFoul ? getFoulType(batterPosition.x, batterPosition.y) : undefined;
        const sector = getSpraySector(batterPosition.x, batterPosition.y);

        const playData: PlayData = {
          type: 'out',
          outType,
          fieldingSequence: throwSequence.map((f) => f.positionNumber),
          ballLocation: ballLocation || batterPosition,
          batterLocation: batterPosition,
          isFoul,
          foulType: foulType ?? undefined,
          spraySector: sector.sector,
        };

        completePlay(playData);
        handleReset();
      }
    },
    [batterPosition, ballLocation, throwSequence, completePlay]
  );

  // Handle HR distance submission
  const handleHRDistance = useCallback(
    (distance: number) => {
      if (pendingHRData) {
        const sector = getSpraySector(pendingHRData.location.x, pendingHRData.location.y);

        const playData: PlayData = {
          type: 'hr',
          fieldingSequence: [],
          ballLocation: pendingHRData.location,
          batterLocation: pendingHRData.location,
          hrDistance: distance,
          hrType: pendingHRData.hrType,
          spraySector: sector.sector,
        };

        // HR has no fielding sequence - direct call
        onPlayComplete(playData);
        handleReset();
      }
      setShowHRDistanceModal(false);
      setPendingHRData(null);
    },
    [pendingHRData, onPlayComplete]
  );

  // Reset state (but keep lastPlay* context for contextual buttons)
  const handleReset = useCallback(() => {
    setPlacedFielders([]);
    setThrowSequence([]);
    setBatterPosition(null);
    setBallLocation(null);
    setPendingPlayType(null);
    setPendingHRData(null);
    setShowPlayTypeModal(false);
    setShowHitTypeModal(false);
    setShowOutTypeModal(false);
    setShowHRDistanceModal(false);
    setShowSpecialEventPrompt(false);
    setClassificationResult(null);
    setPendingPrompts([]);
    setCurrentPromptIndex(0);
    // Reset ball landing prompt state
    setShowBallLandingPrompt(false);
    setPendingBatterBase(null);
    // GT-009: Reset HR location prompt state
    setShowHRLocationPrompt(false);
    // NOTE: lastPlay* state is intentionally NOT reset here
    // so contextual buttons can attribute events to previous play
    // They are cleared individually when the user taps a contextual button
    // or when a new play is completed (overwriting the previous context)
  }, []);

  // GT-002 FIX: Wire CLASSIFY button to actually use the classifier
  // GT-003 FIX: Route to appropriate modal based on context (skip PlayTypeModal)
  // GT-004 FIX: Enable fielder-only out recording
  const handleClassifyPlay = useCallback(() => {
    // Show "CLASSIFYING..." animation briefly before processing
    setIsClassifying(true);

    // Use setTimeout to show the animation for 200ms before classification
    setTimeout(() => {
      setIsClassifying(false);
      performClassification();
    }, 200);
  }, []);

  // Actual classification logic (extracted for animation timing)
  const performClassification = useCallback(() => {
    // Get ball location - use placed fielder position or batter position
    const effectiveBallLocation = ballLocation || (placedFielders[0]?.position);

    // Call the classifier
    const result = classifyPlay({
      batterPosition: batterPosition || undefined,
      ballLocation: effectiveBallLocation,
      fieldingSequence: throwSequence.map(f => f.positionNumber),
      gameContext: {
        outs: gameSituation.outs,
        bases: gameSituation.bases,
        inning: gameSituation.inning,
        isTop: gameSituation.isTop,
      },
    });

    setClassificationResult(result);

    // Store any prompts for later
    if (result.prompts.length > 0) {
      setPendingPrompts(result.prompts);
    }

    // Auto-complete if high confidence
    if (shouldAutoComplete(result)) {
      const sector = effectiveBallLocation
        ? getSpraySector(effectiveBallLocation.x, effectiveBallLocation.y)
        : { sector: 'CF' };

      const playData: PlayData = {
        type: result.playType as PlayData['type'],
        hitType: result.hitType,
        outType: result.outType,
        fieldingSequence: throwSequence.map(f => f.positionNumber),
        ballLocation: effectiveBallLocation || undefined,
        batterLocation: batterPosition || undefined,
        spraySector: sector.sector,
      };

      completePlay(playData);

      // Show prompts if any, otherwise reset
      if (result.prompts.length > 0) {
        setCurrentPromptIndex(0);
        setShowSpecialEventPrompt(true);
      } else {
        handleReset();
      }
      return;
    }

    // Not auto-complete - route to appropriate modal based on context
    // Per GT-003: Fielder drag = OUT, Batter drag = HIT (skip PlayTypeModal)
    if (throwSequence.length > 0 && !batterPosition) {
      // Fielder-only sequence = definitely an OUT
      setShowOutTypeModal(true);
    } else if (batterPosition && throwSequence.length === 0) {
      // Batter-only position = definitely a HIT (unless in stands)
      if (batterPosition && isInStands(batterPosition.y)) {
        // HR - already handled in handleBatterDrop, but just in case
        const hrType = classifyHomeRun(batterPosition.y);
        setPendingHRData({ location: batterPosition, hrType });
        setShowHRDistanceModal(true);
      } else {
        setShowHitTypeModal(true);
      }
    } else if (batterPosition && throwSequence.length > 0) {
      // Both fielder and batter - ambiguous, could be hit with throw or out
      // Show PlayTypeModal only for this edge case
      setShowPlayTypeModal(true);
    } else {
      // No data - shouldn't happen but handle gracefully
      console.warn('CLASSIFY called with no batter or fielder data');
    }
  }, [batterPosition, ballLocation, throwSequence, placedFielders, gameSituation, completePlay]);

  // Determine if we can classify
  const canClassify = batterPosition !== null || placedFielders.length > 0;

  // Contextual button handler for all special events
  const handleContextualEvent = useCallback((eventType: SpecialEventType) => {
    const event: SpecialEventData = {
      eventType,
      fielderPosition: lastPlayFirstFielder?.positionNumber,
      fielderName: lastPlayFirstFielder?.name,
    };

    console.log(`[SpecialEvent] ${eventType}`, {
      fielder: lastPlayFirstFielder?.name,
      position: lastPlayFirstFielder?.positionNumber,
      ballY: lastPlayBallLocation?.y?.toFixed(2),
    });

    if (onSpecialEvent) {
      onSpecialEvent(event);
    }

    // Clear context after event is recorded (prevent double-credit)
    // But keep the context for a moment so user can still tap other buttons
    // Clear all state after a short delay would be ideal, but for now clear immediately
    // for events that consume the fielder (Web Gem, Robbery, Killed, Nutshot)
    if (['WEB_GEM', 'ROBBERY', 'KILLED_PITCHER', 'NUT_SHOT'].includes(eventType)) {
      setLastPlayFirstFielder(null);
      setLastPlayBallLocation(null);
    }

    // Clear strikeout type after K selection
    if (['STRIKEOUT', 'STRIKEOUT_LOOKING', 'DROPPED_3RD_STRIKE'].includes(eventType)) {
      setLastPlayStrikeoutType(null);
    }

    // Clear infield hit state after selection
    if (['BEAT_THROW', 'BUNT'].includes(eventType)) {
      setLastPlayWasInfieldHit(false);
    }

    // Clear TOOTBLAN state after selection
    if (eventType === 'TOOTBLAN') {
      setLastPlayHadRunnerOut(false);
    }
  }, [lastPlayFirstFielder, lastPlayBallLocation, onSpecialEvent]);

  // GT-009 FIX: HR button prompts for location first, then distance
  const handleQuickHomeRun = useCallback(() => {
    // Show HR location prompt - user taps where ball left yard
    // Distance modal will show after location is tapped
    setShowHRLocationPrompt(true);
  }, []);

  // GT-009: Handle HR location tap from HRLocationPromptOverlay
  const handleHRLocationTap = useCallback((position: FieldCoordinate) => {
    // Classify HR type based on Y coordinate
    const hrType = classifyHomeRun(position.y);

    // Store location and show distance modal
    setPendingHRData({ location: position, hrType });
    setShowHRLocationPrompt(false);
    setShowHRDistanceModal(true);

    console.log('[HRLocation] HR location tapped:', position, 'Type:', hrType);
  }, []);

  // GT-007: Handle quick result buttons (BB, K, HBP, etc.)
  const handleQuickResult = useCallback((resultType: QuickResultType) => {
    // Map quick result to play data
    const playData: PlayData = {
      type: 'out',
      fieldingSequence: [],
      spraySector: 'CF', // Default
    };

    switch (resultType) {
      case 'BB':
        playData.type = 'hit';
        playData.hitType = '1B';
        // Log as walk - in real impl, would have separate BB type
        console.log('[QuickResult] Walk (BB)');
        break;
      case 'IBB':
        playData.type = 'hit';
        playData.hitType = '1B';
        console.log('[QuickResult] Intentional Walk (IBB)');
        break;
      case 'K':
        playData.type = 'out';
        playData.outType = 'K';
        playData.fieldingSequence = [2]; // Catcher
        console.log('[QuickResult] Strikeout Swinging (K)');
        break;
      case 'KL':
        playData.type = 'out';
        playData.outType = 'K';
        playData.fieldingSequence = [2]; // Catcher
        console.log('[QuickResult] Strikeout Looking (Ꝅ)');
        break;
      case 'D3K':
        playData.type = 'out';
        playData.outType = 'K';
        playData.fieldingSequence = [2, 3]; // Catcher to 1B
        console.log('[QuickResult] Dropped 3rd Strike (D3K)');
        break;
      case 'HBP':
        playData.type = 'hit';
        playData.hitType = '1B';
        console.log('[QuickResult] Hit By Pitch (HBP)');
        break;
    }

    onPlayComplete(playData);
    handleReset();
  }, [onPlayComplete, handleReset]);

  // Determine ball marker type
  const ballMarkerType = batterPosition
    ? isInStands(batterPosition.y)
      ? 'hr'
      : 'hit'
    : 'hit';

  // Get border color for position
  const getBorderColor = (positionNumber: number) => {
    return fielderBorderColors[positionNumber % 2];
  };

  return (
    <div className="flex flex-col w-full h-full" style={{ containerType: 'inline-size' }}>
      {/* GT-010: Field area fills available space while maintaining aspect ratio */}
      {/* Uses flex-1 to take remaining vertical space after buttons */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
        {/* Inner container maintains 8:5 aspect ratio (SVG is 1600x1000) */}
        <div className="relative w-full h-full" style={{ maxWidth: '100%', aspectRatio: '8/5' }}>
          <FieldDropZone
          onFielderDrop={handleFielderDrop}
          onBatterDrop={handleBatterDrop}
          onBatterDragChange={setIsDraggingBatter}
        >
          <FieldCanvas
            showStands={true}
            shadeFoulTerritory={true}
            className="w-full h-full"
          >
          {/* Story 10: Drop zone highlights during batter drag */}
          {isDraggingBatter && (
            <>
              <DropZoneHighlight
                position={{ x: 0.75, y: 0.15 }}
                type="safe"
                label="1B"
                size="medium"
              />
              <DropZoneHighlight
                position={{ x: 0.5, y: 0.35 }}
                type="safe"
                label="2B"
                size="medium"
              />
              <DropZoneHighlight
                position={{ x: 0.25, y: 0.15 }}
                type="safe"
                label="3B"
                size="medium"
              />
            </>
          )}

          {/* Fielders at original positions */}
          {fielders.map((fielder) => (
            <FielderIcon
              key={fielder.positionNumber}
              fielder={fielder}
              sequenceNumber={getSequenceNumber(fielder)}
              isPlaced={isFielderPlaced(fielder)}
              onClick={handleFielderClick}
              borderColor={getBorderColor(fielder.positionNumber)}
            />
          ))}

          {/* Placed fielders */}
          {placedFielders.map((pf, index) => (
            <PlacedFielder
              key={`placed-${index}`}
              fielder={pf.fielder}
              placedPosition={pf.position}
              sequenceNumber={pf.sequenceNumber}
              onClick={handleFielderClick}
              borderColor="#C4A853"
            />
          ))}

          {/* Batter at home */}
          <BatterIcon
            name="BATTER"
            isDragged={batterPosition !== null}
          />

          {/* Ball landing marker */}
          {batterPosition && (
            <BallLandingMarker
              position={batterPosition}
              type={ballMarkerType}
            />
          )}

          {/* Ball fielded marker (when no batter position) */}
          {ballLocation && !batterPosition && (
            <BallLandingMarker
              position={ballLocation}
              type="fielded"
            />
          )}

          {/* Story 9: Fading ball marker - shows where fielder was dropped */}
          {fadingBallPosition && (
            <FadingBallMarker
              position={fadingBallPosition}
              isVisible={showFadingBall}
              onFadeComplete={() => setFadingBallPosition(null)}
            />
          )}

          {/* Draggable baserunners with safe/out drop zones */}
          {onRunnerMove && (
            <RunnerDragDrop
              bases={gameSituation.bases}
              onRunnerMove={onRunnerMove}
            />
          )}
        </FieldCanvas>
      </FieldDropZone>
        </div>

        {/* Ball Landing Prompt Overlay - shown after batter drag for hits */}
        {showBallLandingPrompt && pendingBatterBase && (
          <BallLandingPromptOverlay
            onLocationTap={handleBallLocationTap}
            onCancel={handleBallLandingCancel}
            destinationBase={pendingBatterBase}
          />
        )}

        {/* GT-009: HR Location Prompt Overlay - shown after HR button click */}
        {showHRLocationPrompt && (
          <HRLocationPromptOverlay
            onLocationTap={handleHRLocationTap}
            onCancel={() => setShowHRLocationPrompt(false)}
          />
        )}

        {/* Throw Sequence Display */}
        {throwSequence.length > 0 && (
          <div className="absolute top-2 left-2 bg-[#3366FF] border-[3px] border-white px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] z-20">
            <div className="text-[8px] text-white font-bold">THROW SEQUENCE</div>
            <div className="text-sm text-white font-bold">
              {throwSequence.map((f) => f.positionNumber).join('-')}
            </div>
          </div>
        )}

        {/* GT-015: Inference confirmation toast */}
        {inferenceToast && (
          <div className="absolute top-2 right-2 bg-[#4CAF50] border-[3px] border-white px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] z-30 animate-pulse">
            <div className="text-[10px] text-white font-bold">✓ {inferenceToast}</div>
          </div>
        )}

        {/* Phase 2: Side Panels in Foul Territory */}
        {/* Left Panel - Hit Type Selection (LF foul territory) */}
        <SidePanel
          side="left"
          isOpen={showHitTypeModal}
          onClose={() => {
            setShowHitTypeModal(false);
            handleReset();
          }}
          title="SELECT HIT TYPE"
        >
          <HitTypeContent
            onSelect={(hitType) => {
              handleHitTypeSelect(hitType);
              setShowHitTypeModal(false);
            }}
            spraySector={batterPosition ? getSpraySector(batterPosition.x, batterPosition.y).sector : undefined}
            inferredBase={batterPosition ? determineBatterBase(batterPosition) || undefined : undefined}
          />
        </SidePanel>

        {/* Right Panel - Out Type Selection (RF foul territory) */}
        <SidePanel
          side="right"
          isOpen={showOutTypeModal}
          onClose={() => {
            setShowOutTypeModal(false);
            handleReset();
          }}
          title="SELECT OUT TYPE"
        >
          <OutTypeContent
            onSelect={(outType) => {
              handleOutTypeSelect(outType);
              setShowOutTypeModal(false);
            }}
            fieldingSequence={throwSequence.map((f) => f.positionNumber)}
          />
        </SidePanel>

        {/* Right Panel - HR Distance Input */}
        <SidePanel
          side="right"
          isOpen={showHRDistanceModal && pendingHRData !== null}
          onClose={() => {
            setShowHRDistanceModal(false);
            setPendingHRData(null);
            handleReset();
          }}
          title="HOME RUN DISTANCE"
        >
          {pendingHRData && (
            <HRDistanceContent
              onSubmit={(distance) => {
                handleHRDistance(distance);
                setShowHRDistanceModal(false);
              }}
              onCancel={() => {
                setShowHRDistanceModal(false);
                setPendingHRData(null);
                handleReset();
              }}
              hrType={pendingHRData.hrType}
            />
          )}
        </SidePanel>
      </div>

      {/* Phase 5B: Contextual buttons in southern foul territory - appear after play completion */}
      {/* These buttons auto-dismiss after 3 seconds and show based on inference logic */}
      {lastPlayContext && (Date.now() - lastPlayContext.timestamp < CONTEXTUAL_BUTTONS_TIMEOUT) && (
        <div className="flex-shrink-0 bg-[#1a1a1a]/80 border-t-2 border-[#C4A853] px-4 py-2">
          <div className="flex flex-wrap justify-center gap-2">
            {inferContextualButtons(lastPlayContext).map((eventType) => (
              <button
                key={eventType}
                onClick={() => {
                  handleContextualEvent(eventType);
                  // Clear context after selection to hide buttons
                  setLastPlayContext(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6600] hover:bg-[#FF8800] border-2 border-[#C4A853] text-white text-[11px] font-bold rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:scale-95 transition-all"
              >
                <span>{getEventEmoji(eventType)}</span>
                <span>{getEventLabel(eventType)}</span>
              </button>
            ))}
            {/* Dismiss button */}
            <button
              onClick={() => setLastPlayContext(null)}
              className="px-2 py-1.5 bg-[#666] hover:bg-[#888] border-2 border-[#999] text-white text-[10px] font-bold rounded-md active:scale-95 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Action buttons area - fixed at bottom, outside field canvas */}
      <div className="flex-shrink-0 bg-[#333] px-2 py-2 space-y-2">
        {/* Contextual Quick Buttons for special events (legacy - keeping for fallback) */}
        <QuickButtons
          onSpecialEvent={handleContextualEvent}
          onHomeRun={handleQuickHomeRun}
          onQuickResult={handleQuickResult}
          webGemFielderName={lastPlayFirstFielder?.name}
          lastPlayBallY={lastPlayBallLocation?.y}
          lastPlayFirstFielder={lastPlayFirstFielder?.positionNumber}
          wasInfieldHit={lastPlayWasInfieldHit}
          strikeoutType={lastPlayStrikeoutType}
          hadRunnerOut={lastPlayHadRunnerOut}
        />

        {/* Control buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 bg-[#808080] border-[3px] border-white px-3 py-1.5 text-white text-[10px] font-bold hover:bg-[#999999] active:scale-95 transition-transform shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
          >
            RESET
          </button>
          {canClassify && (
            <button
              onClick={handleClassifyPlay}
              disabled={isClassifying}
              className={`flex-1 border-[3px] border-white px-3 py-1.5 text-white text-[10px] font-bold transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] ${
                isClassifying
                  ? 'bg-[#FF6600] animate-pulse cursor-wait'
                  : 'bg-[#DD0000] hover:bg-[#FF0000] active:scale-95'
              }`}
            >
              {isClassifying ? 'CLASSIFYING...' : 'CLASSIFY'}
            </button>
          )}
        </div>
      </div>

      {/* Play Type Modal */}
      {showPlayTypeModal && batterPosition && (
        <PlayTypeModal
          onSelect={handlePlayTypeSelect}
          isFoul={isFoulTerritory(batterPosition.x, batterPosition.y)}
          isInStands={isInStands(batterPosition.y)}
          onClose={() => setShowPlayTypeModal(false)}
        />
      )}

      {/*
        Hit Type Modal, Out Type Modal, and HR Distance Modal are now handled by SidePanels
        (Phase 2 - modals in foul territory) - see the SidePanel components above.
        The old center-overlay modals are removed to avoid duplication and keep field visible.
      */}

      {/* Special Event Prompt Modal */}
      {showSpecialEventPrompt && pendingPrompts.length > 0 && (
        <SpecialEventPromptModal
          prompt={pendingPrompts[currentPromptIndex]}
          onAnswer={(confirmed) => {
            // Log the special event response
            console.log(
              `Special Event: ${pendingPrompts[currentPromptIndex].eventType} - ${confirmed ? 'YES' : 'NO'}`
            );

            // Move to next prompt or finish
            if (currentPromptIndex < pendingPrompts.length - 1) {
              setCurrentPromptIndex(currentPromptIndex + 1);
            } else {
              setShowSpecialEventPrompt(false);
              handleReset();
            }
          }}
        />
      )}
    </div>
  );
}

export default EnhancedInteractiveField;
