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
  SVG_WIDTH,
  SVG_HEIGHT,
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
  type RunnerPlayType,
} from './RunnerDragDrop';
import {
  SidePanel,
  HitTypeContent,
  OutTypeContent,
  HRDistanceContent,
} from './SidePanel';
import {
  BatterReachedPopup,
  type BatterReachedOption,
} from './BatterReachedPopup';
import {
  ModifierButtonBar,
  type ModifierId,
} from './ModifierButtonBar';
import {
  InjuryPrompt,
  type InjuryResult,
  type MojoResult,
} from './InjuryPrompt';
import {
  StarPlaySubtypePopup,
  type StarPlaySubtype,
} from './StarPlaySubtypePopup';
import {
  ErrorTypePopup,
  type ErrorType,
} from './ErrorTypePopup';
import {
  calculateRunnerDefaults,
  calculateWalkDefaults,
  calculateFieldersChoiceDefaults,
  calculateD3KDefaults,
  calculateStolenBaseDefaults,
  type RunnerDefaults,
  type RunnerOutcome,
  type RunnerEventType,
} from './runnerDefaults';
import { RunnerOutcomesDisplay } from './RunnerOutcomesDisplay';
import { RunnerOutcomeArrows } from './RunnerOutcomeArrows';
import {
  ActionSelector,
  type PrimaryAction,
  type OtherAction,
  type StrikeoutType,
} from './ActionSelector';
import {
  inferFielder,
  inferExitTypeFromResult,
  inferDirection,
  getSuggestedDPChain,
  type ExitType,
  type Direction,
  type PlayDifficulty,
} from './fielderInference';
import { recordFieldingEvent } from '../engines/adaptiveLearningEngine';
import {
  calculateLeverageIndex,
  getLICategory,
  isClutchSituation,
  type GameStateForLI,
  type LIResult,
} from '../../../engines/leverageCalculator';
import {
  calculateFame,
  type FameResult,
} from '../../../engines/fameEngine';
import {
  OutcomeButtons,
  type HitOutcome,
  type OutOutcome,
} from './OutcomeButtons';

// ============================================
// TYPES
// ============================================

/**
 * Flow Step - tracks which step of the 5-step UX flow we're in
 * Per GAMETRACKER_UI_DESIGN.md
 */
type FlowStep =
  | 'IDLE'              // Step 1: Waiting for HIT/OUT/OTHER selection
  | 'HIT_LOCATION'      // Step 2 (HIT): Waiting for field click
  | 'OUT_FIELDING'      // Step 2 (OUT): Waiting for fielder drag + sequence
  | 'HIT_OUTCOME'       // Step 3 (HIT): Showing hit outcome buttons
  | 'OUT_OUTCOME'       // Step 3 (OUT): Showing out outcome buttons
  | 'RUNNER_CONFIRM'    // Step 4: Confirming runner outcomes
  | 'END_CONFIRM';      // Step 5: End at-bat confirmation

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
export type OutType = 'GO' | 'FO' | 'LO' | 'PO' | 'FLO' | 'DP' | 'TP' | 'K' | 'KL' | 'FC' | 'SAC' | 'SF';

export type WalkType = 'BB' | 'IBB' | 'HBP';

export interface PlayData {
  type: 'hit' | 'out' | 'hr' | 'foul_out' | 'foul_ball' | 'error' | 'walk';
  hitType?: HitType;
  outType?: OutType;
  walkType?: WalkType;
  fieldingSequence: number[]; // Position numbers in sequence (e.g., [6, 4, 3])
  ballLocation?: FieldCoordinate;
  batterLocation?: FieldCoordinate;
  isFoul?: boolean;
  foulType?: string;
  hrDistance?: number;
  hrType?: string;
  spraySector?: string;
  /** Error type (FIELDING, THROWING, MENTAL) - only for type: 'error' */
  errorType?: ErrorType;
  /** Position number of fielder who made the error */
  errorFielder?: number;
  /**
   * Runner outcomes - where each runner ends up after the play
   * This captures user adjustments made during RUNNER_CONFIRM step
   * CRITICAL: This field MUST be populated for proper stat tracking
   */
  runnerOutcomes?: RunnerDefaults;

  // ============================================
  // ADVANCED METRICS FIELDS (per INFERENTIAL_LOGIC_GAP_ANALYSIS.md)
  // ============================================

  /**
   * How the ball left the bat - inferred from result or location
   * Used for fielding metrics (UZR, OAA) and spray chart analysis
   */
  exitType?: 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up';

  /**
   * Play difficulty rating based on location and fielder
   * Used for fielding value calculations
   */
  playDifficulty?: 'routine' | 'likely' | 'difficult' | 'impossible';

  /**
   * Spray direction from batter's perspective
   * More granular than spraySector for hitting analysis
   */
  sprayDirection?: 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right';

  /**
   * System's predicted fielder (before user selection)
   * Used for adaptive learning and inference improvement
   */
  inferredFielder?: number;

  /**
   * Whether user overrode the system's inference
   * Used for adaptive learning - if true, system was wrong
   */
  wasOverridden?: boolean;

  /**
   * Confidence level of the inference (0-1)
   * Higher = more certain about fielder prediction
   */
  inferenceConfidence?: number;

  /**
   * For double plays: the DP notation (e.g., '6-4-3')
   */
  dpType?: string;

  // ============================================
  // LEVERAGE INDEX & FAME CONTEXT (per LEVERAGE_INDEX_SPEC.md)
  // ============================================

  /**
   * Leverage Index at time of play (0.1-10.0)
   * Used for LI-weighted Fame calculations
   * Formula: baseFame × √LI × playoffMultiplier
   */
  leverageIndex?: number;

  /**
   * LI category for quick classification
   * LOW (<0.85), MEDIUM (0.85-2.0), HIGH (2.0-5.0), EXTREME (>5.0)
   */
  leverageCategory?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

  /**
   * Game situation snapshot at time of play
   * Required for LI calculation and clutch/choke tracking
   */
  gameSituation?: {
    inning: number;
    isTop: boolean;
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    homeScore: number;
    awayScore: number;
  };

  /**
   * Whether this was a clutch situation (LI >= 1.5)
   */
  isClutchSituation?: boolean;

  /**
   * Playoff context for Fame multiplier
   */
  playoffContext?: {
    isPlayoffs: boolean;
    round?: 'wild_card' | 'division_series' | 'championship_series' | 'world_series';
    isEliminationGame?: boolean;
    isClinchGame?: boolean;
  };

  /**
   * Calculated Fame value for this play (if applicable)
   * Already weighted by LI and playoff multipliers
   */
  fameValue?: number;

  /**
   * Fame event type for special events (WEB_GEM, ROBBERY, etc.)
   */
  fameEventType?: string;
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

  // ============================================
  // LEVERAGE INDEX & FAME CONTEXT
  // Per LEVERAGE_INDEX_SPEC.md and SPECIAL_EVENTS_SPEC.md
  // ============================================

  /** Leverage Index at time of event (0.1-10.0) */
  leverageIndex?: number;
  /** LI category: LOW, MEDIUM, HIGH, EXTREME */
  leverageCategory?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  /** Whether this was a clutch situation (LI >= 1.5) */
  isClutchSituation?: boolean;
  /** Calculated Fame value (base × √LI × playoffMultiplier) */
  fameValue?: number;
  /** Base Fame value before LI weighting */
  baseFame?: number;
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

  if (!ctx) {
    console.log('[ContextualButtons] No context, returning only 7+ PITCH');
    return buttons;
  }

  console.log('[ContextualButtons] Inferring from context:', {
    playType: ctx.playType,
    firstFielder: ctx.firstFielder,
    ballLocationY: ctx.ballLocationY?.toFixed(2),
    throwSequence: ctx.throwSequence,
    runnerOut: ctx.runnerOut,
    throwTarget: ctx.throwTarget,
  });

  const isOutfielder = [7, 8, 9].includes(ctx.firstFielder ?? 0);
  const isInfielder = [1, 2, 3, 4, 5, 6].includes(ctx.firstFielder ?? 0);
  const isDeepFly = ctx.ballLocationY !== null && ctx.ballLocationY > 0.7; // Lowered from 0.8
  const isWallCatch = ctx.ballLocationY !== null && ctx.ballLocationY > 0.9; // Lowered from 0.95

  // FO/LO by outfielder → offer both ROBBERY and WEB GEM
  // Let the user decide which applies based on what they saw
  if (['FO', 'LO'].includes(ctx.playType ?? '') && isOutfielder) {
    if (isWallCatch) {
      buttons.push('ROBBERY');
      buttons.push('WEB_GEM');
    } else if (isDeepFly) {
      buttons.push('WEB_GEM');
    }
  }

  // Any fly ball to outfield deep enough could be a web gem
  // Even if play type isn't exactly FO/LO (might be FC, etc.)
  if (isOutfielder && isDeepFly && !buttons.includes('WEB_GEM')) {
    buttons.push('WEB_GEM');
  }

  // Pitcher involvement (first fielder = 1) → KILLED / NUTSHOT options
  // Any groundball/FC to pitcher could be a comebacker
  if (ctx.firstFielder === 1) {
    buttons.push('KILLED_PITCHER');
    buttons.push('NUT_SHOT');
  }

  // Any out play → offer TOOTBLAN option (user knows if baserunning was bad)
  if (['FO', 'LO', 'GO', 'FC'].includes(ctx.playType ?? '')) {
    buttons.push('TOOTBLAN');
  }

  // Runner out on same play → definitely show TOOTBLAN
  if (ctx.runnerOut && !buttons.includes('TOOTBLAN')) {
    buttons.push('TOOTBLAN');
  }

  // Infield hit options (any hit in infield area)
  if (ctx.playType === '1B' && ctx.ballLocationY !== null && ctx.ballLocationY < 0.5) {
    buttons.push('BEAT_THROW');
    buttons.push('BUNT');
  }

  console.log('[ContextualButtons] Inferred buttons:', buttons);
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
  /** Handler for single runner movements (SB, CS, WP, PB, etc.) */
  onRunnerMove?: (data: RunnerMoveData) => void;
  /** Handler for batch runner movements (SB/CS/PK/TBL with multiple runners) */
  onBatchRunnerMove?: (
    movements: Array<{ from: 'first' | 'second' | 'third'; to: 'second' | 'third' | 'home' | 'out'; outcome: 'safe' | 'out' }>,
    playType: string
  ) => void;
  fielderBorderColors?: [string, string];
  /** Background color for the batter icon (batting team primary color) */
  batterBackgroundColor?: string;
  /** Border color for the batter icon (batting team secondary color) */
  batterBorderColor?: string;
  /** Player names for each position (keyed by position number) */
  playerNames?: Record<number, string>;
  /** Runner names for each occupied base */
  runnerNames?: { first?: string; second?: string; third?: string };
  /** Current batter's name (for display on batter icon) */
  currentBatterName?: string;
  /**
   * Zoom level for the field view (0-1)
   * 0 = full field view (shows fence and stands)
   * 1 = maximum infield zoom (shows just the diamond)
   * Default: 0 (full field view)
   */
  zoomLevel?: number;
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
          // Uses SVG_WIDTH and SVG_HEIGHT imported from FieldCanvas (single source of truth)
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
  useEffect(() => {
    onBatterDragChange?.(isBatterDragging);
  }, [isBatterDragging, onBatterDragChange]);

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
    // Uses SVG_WIDTH and SVG_HEIGHT imported from FieldCanvas (single source of truth)
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
    // Uses SVG_WIDTH and SVG_HEIGHT imported from FieldCanvas (single source of truth)
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

// ============================================
// LEFT FOUL ZONE: Result Buttons (BB, K, HBP, HR)
// Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
// K/Ꝅ are PERMANENT buttons that trigger Play Lifecycle
// ============================================

interface LeftFoulButtonsProps {
  onQuickResult: (resultType: QuickResultType) => void;
  onHomeRun: () => void;
  /** NEW: Strikeout handler using Play Lifecycle (K/Ꝅ → RUNNER_OUTCOMES) */
  onStrikeout: (looking: boolean) => void;
}

function LeftFoulButtons({ onQuickResult, onHomeRun, onStrikeout }: LeftFoulButtonsProps) {
  // Chalkboard-style button base - retro baseball aesthetic
  const btnBase = `
    border-2 border-[#C4A853] rounded-md
    px-3 py-1.5 text-xs font-bold uppercase tracking-wide
    hover:scale-105 active:scale-95 transition-all
    shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]
    bg-gradient-to-b from-[rgba(255,255,255,0.1)] to-transparent
  `;

  // K/Ꝅ buttons - larger, prominent strikeout buttons
  const strikeoutBtnBase = `
    w-12 h-12 rounded-lg
    border-3 border-[#C4A853]
    text-xl font-black
    hover:scale-105 active:scale-95 transition-all
    shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]
    bg-gradient-to-b from-[#B22222] to-[#8B0000]
    text-[#FFE4B5]
  `;

  return (
    <div className="flex flex-col gap-1.5 p-2 bg-[#1a1a1a]/80 rounded-lg border border-[#C4A853]/30">
      {/* K/Ꝅ PERMANENT BUTTONS - Per spec: bottom left, always visible */}
      <div className="flex gap-1.5 mb-1">
        <button
          onClick={() => onStrikeout(false)}
          className={strikeoutBtnBase}
          title="Strikeout Swinging"
        >
          K
        </button>
        <button
          onClick={() => onStrikeout(true)}
          className={`${strikeoutBtnBase} [text-decoration:line-through]`}
          title="Strikeout Looking"
          style={{ textDecorationColor: '#C4A853', textDecorationThickness: '3px' }}
        >
          K
        </button>
      </div>
      {/* Other result buttons */}
      <button
        onClick={() => onQuickResult('BB')}
        className={`${btnBase} bg-[#2E7D32] text-[#E8F5E9] border-[#4CAF50]`}
        title="Walk (Base on Balls)"
      >
        BB
      </button>
      <button
        onClick={() => onQuickResult('HBP')}
        className={`${btnBase} bg-[#E65100] text-[#FFF3E0] border-[#FF9800]`}
        title="Hit By Pitch"
      >
        HBP
      </button>
      <button
        onClick={onHomeRun}
        className={`${btnBase} bg-[#5D4037] text-[#FFD700] border-[#C4A853]`}
        title="Home Run"
      >
        ⚾ HR
      </button>
    </div>
  );
}

// ============================================
// RIGHT FOUL ZONE: Special Event Buttons
// ============================================

interface RightFoulButtonsProps {
  onSpecialEvent: (eventType: SpecialEventType) => void;
}

function RightFoulButtons({ onSpecialEvent }: RightFoulButtonsProps) {
  // Chalkboard-style circular buttons for special events
  const btnBase = `
    w-9 h-9 rounded-full
    border-2 border-[#C4A853]
    flex items-center justify-center
    text-base
    hover:scale-110 active:scale-95 transition-all
    shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]
  `;

  return (
    <div className="flex flex-col gap-1.5 p-1.5 bg-[#1a1a1a]/80 rounded-lg border border-[#C4A853]/30">
      <button
        onClick={() => onSpecialEvent('NUT_SHOT')}
        className={`${btnBase} bg-[#5D4037]`}
        title="Nut Shot (+1 Fame)"
      >
        🥜
      </button>
      <button
        onClick={() => onSpecialEvent('KILLED_PITCHER')}
        className={`${btnBase} bg-[#BF360C]`}
        title="Killed Pitcher (+3 Fame)"
      >
        💥
      </button>
      <button
        onClick={() => onSpecialEvent('TOOTBLAN')}
        className={`${btnBase} bg-[#880E4F]`}
        title="TOOTBLAN (-3 Fame)"
      >
        🤦
      </button>
      <button
        onClick={() => onSpecialEvent('WEB_GEM')}
        className={`${btnBase} bg-[#1565C0]`}
        title="Web Gem (+1 Fame)"
      >
        ⭐
      </button>
      <button
        onClick={() => onSpecialEvent('SEVEN_PLUS_PITCH_AB')}
        className={`${btnBase} bg-[#0277BD]`}
        title="7+ Pitch At-Bat"
      >
        7️⃣
      </button>
    </div>
  );
}

// ============================================
// BEHIND HOME: Game Control Buttons
// ============================================

interface BehindHomeButtonsProps {
  onReset: () => void;
  onClassify?: () => void;
  canClassify?: boolean;
  isClassifying?: boolean;
  undoCount?: number;
  onUndo?: () => void;
}

function BehindHomeButtons({
  onReset,
  onClassify,
  canClassify = false,
  isClassifying = false,
  undoCount = 0,
  onUndo,
}: BehindHomeButtonsProps) {
  // Chalkboard button style
  const btnBase = `
    border-2 border-[#C4A853] rounded-md
    px-4 py-2 text-xs font-bold uppercase tracking-wide
    hover:scale-105 active:scale-95 transition-all
    shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]
  `;

  return (
    <div className="flex gap-2 items-center p-2 bg-[#1a1a1a]/80 rounded-lg border border-[#C4A853]/30">
      {/* Undo button */}
      {onUndo && undoCount > 0 && (
        <button
          onClick={onUndo}
          className={`${btnBase} bg-[#37474F] text-[#B0BEC5] border-[#546E7A]`}
          title={`Undo last action (${undoCount} available)`}
        >
          ↩ {undoCount}
        </button>
      )}
      {/* Reset button */}
      <button
        onClick={onReset}
        className={`${btnBase} bg-[#424242] text-[#BDBDBD] border-[#616161]`}
        title="Reset current play"
      >
        ✕ RESET
      </button>
      {/* Classify button */}
      {canClassify && onClassify && (
        <button
          onClick={onClassify}
          disabled={isClassifying}
          className={`${btnBase} ${
            isClassifying
              ? 'bg-[#E65100] text-white animate-pulse cursor-wait'
              : 'bg-gradient-to-b from-[#C62828] to-[#B71C1C] text-[#FFCDD2] hover:from-[#D32F2F] hover:to-[#C62828]'
          }`}
          title="Classify the current play"
        >
          {isClassifying ? '...' : '▶ CLASSIFY'}
        </button>
      )}
    </div>
  );
}

// ============================================
// LEGACY: QuickButtons (now split into zones above)
// Kept for backwards compatibility during transition
// ============================================

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
  /** Compact mode for vertical layout in foul territory */
  compact?: boolean;
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
  compact = false,
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

  // Button base classes - smaller in compact mode
  const btnBase = compact
    ? 'border-[2px] px-2 py-1 text-[9px] font-bold hover:scale-105 transition-transform shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)]'
    : 'border-[2px] px-3 py-1.5 text-[10px] font-bold hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]';

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {/* GT-007: Primary action buttons for non-ball-in-play outcomes */}
      {onQuickResult && (
        <div className={compact ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1 justify-center'}>
          <button
            onClick={() => onQuickResult('BB')}
            className={`bg-[#4CAF50] border-white text-white ${btnBase}`}
            title="Walk (Base on Balls)"
          >
            BB
          </button>
          <button
            onClick={() => onQuickResult('K')}
            className={`bg-[#DD0000] border-white text-white ${btnBase}`}
            title="Strikeout Swinging"
          >
            K
          </button>
          <button
            onClick={() => onQuickResult('KL')}
            className={`bg-[#8B0000] border-white text-white ${btnBase}`}
            title="Strikeout Looking"
          >
            Ꝅ
          </button>
          <button
            onClick={() => onQuickResult('HBP')}
            className={`bg-[#FF9800] border-white text-black ${btnBase}`}
            title="Hit By Pitch"
          >
            HBP
          </button>
          <button
            onClick={onHomeRun}
            className={`bg-[#FFD700] border-white text-black ${btnBase}`}
            title="Home Run"
          >
            HR
          </button>
        </div>
      )}

      {/* Contextual buttons for special events */}
      <div className={compact ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1.5 justify-center'}>
        {contextualButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => onSpecialEvent(btn.id)}
            disabled={!btn.enabled}
            className={`border-[2px] font-bold transition-transform flex items-center gap-0.5 ${
              compact
                ? 'px-2 py-1 text-[8px] shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)]'
                : 'px-2 py-1 text-[9px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
            } ${
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
            {!compact && <span>{btn.label}</span>}
          </button>
        ))}

        {/* HR button in contextual row if no onQuickResult handler */}
        {!onQuickResult && (
          <button
            onClick={onHomeRun}
            className={`bg-[#FFD700] border-[2px] border-white font-bold text-black hover:scale-105 transition-transform flex items-center gap-0.5 ${
              compact
                ? 'px-2 py-1 text-[8px] shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)]'
                : 'px-2 py-1 text-[9px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'
            }`}
            title="Home Run (quick entry)"
          >
            <span>💣</span>
            {!compact && <span>HR</span>}
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
  onBatchRunnerMove,
  fielderBorderColors = ['#E8E8D8', '#E8E8D8'],
  batterBackgroundColor = '#2563EB',
  batterBorderColor = '#C4A853',
  playerNames = {},
  runnerNames = {},
  currentBatterName = 'BATTER',
  zoomLevel = 0,
}: EnhancedInteractiveFieldProps) {
  // ============================================
  // NEW 5-STEP FLOW STATE (per GAMETRACKER_UI_DESIGN.md)
  // ============================================
  const [flowStep, setFlowStep] = useState<FlowStep>('IDLE');
  const [activeAction, setActiveAction] = useState<PrimaryAction | null>(null);

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

  // NEW: BatterReachedPopup state - shows when batter is dragged to a base
  // Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md: This comes BEFORE HitTypeContent
  const [showBatterReachedPopup, setShowBatterReachedPopup] = useState(false);
  const [batterReachedBase, setBatterReachedBase] = useState<'1B' | '2B' | '3B' | null>(null);

  // NEW: Error flow state
  // Flow: BatterReachedPopup "E" → Ball location → Tap fielder → ErrorTypePopup
  const [pendingError, setPendingError] = useState(false);
  const [awaitingErrorFielder, setAwaitingErrorFielder] = useState(false);
  const [errorFielder, setErrorFielder] = useState<FielderData | null>(null);
  const [showErrorTypePopup, setShowErrorTypePopup] = useState(false);

  // ============================================
  // RUNNER OUTCOME STATE (per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md)
  // ============================================
  // Pre-calculated defaults that user can adjust before End At-Bat
  const [runnerOutcomes, setRunnerOutcomes] = useState<RunnerDefaults | null>(null);

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

  // ============================================
  // NEW STATE: Play Lifecycle (per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md)
  // ============================================
  // These enable the RUNNER_OUTCOMES and MODIFIERS_ACTIVE phases
  const [lastClassifiedPlay, setLastClassifiedPlay] = useState<PlayData | null>(null);
  const [playCommitted, setPlayCommitted] = useState(false);
  const [atBatComplete, setAtBatComplete] = useState(false);
  const [activeModifiers, setActiveModifiers] = useState<Set<ModifierId>>(new Set());
  /** Track pending runner event type (SB/CS/PK/TBL) - at-bat continues after these */
  const [pendingRunnerEvent, setPendingRunnerEvent] = useState<RunnerEventType | null>(null);
  /** Which modifiers are available based on the current play type */
  const [enabledModifiers, setEnabledModifiers] = useState<Set<ModifierId>>(new Set());
  const [pendingInjuryPrompt, setPendingInjuryPrompt] = useState<'KP' | 'NUT' | null>(null);
  /** Show StarPlaySubtypePopup for WG/ROB modifier */
  const [showStarPlayPopup, setShowStarPlayPopup] = useState(false);
  /** Is the current star play a robbery (for ROB modifier)? */
  const [isStarPlayRobbery, setIsStarPlayRobbery] = useState(false);

  // ============================================
  // UIPHASE DERIVATION (per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md)
  // ============================================
  // DO NOT store phase separately - derive from existing state
  type UIPhase =
    | 'AWAITING_INPUT'      // No drag in progress, no panels open
    | 'DRAGGING'            // Any drag in progress
    | 'TAP_SEQUENCE'        // Fielder dropped, building throw chain
    | 'CLASSIFYING'         // Any panel is open (hit/out/HR)
    | 'RUNNER_OUTCOMES'     // Play classified, adjusting runners
    | 'MODIFIERS_ACTIVE';   // Runners done, modifiers enabled

  const getUIPhase = useCallback((): UIPhase => {
    if (showHitTypeModal || showOutTypeModal || showHRDistanceModal) return 'CLASSIFYING';
    if (placedFielders.length > 0 && !lastClassifiedPlay) return 'TAP_SEQUENCE';
    if (lastClassifiedPlay && !playCommitted) return 'RUNNER_OUTCOMES';
    if (playCommitted && !atBatComplete) return 'MODIFIERS_ACTIVE';
    return 'AWAITING_INPUT';
  }, [showHitTypeModal, showOutTypeModal, showHRDistanceModal, placedFielders.length, lastClassifiedPlay, playCommitted, atBatComplete]);

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

    // ============================================
    // INFERENCE & ADVANCED METRICS ENRICHMENT
    // Per INFERENTIAL_LOGIC_GAP_ANALYSIS.md
    // ============================================

    // Enrich PlayData with inferred fields if not already set
    const enrichedPlayData = { ...playData };

    if (location) {
      // Infer exit type if not provided
      if (!enrichedPlayData.exitType) {
        const resultType = playData.outType || playData.hitType || '';
        const inferred = inferExitTypeFromResult(resultType);
        if (inferred) {
          enrichedPlayData.exitType = inferred;
        } else {
          // Use location-based inference for hits
          const isOut = playData.type === 'out';
          if (location.y < 0.35) {
            enrichedPlayData.exitType = isOut ? 'Line Drive' : 'Ground';
          } else if (location.y < 0.6) {
            enrichedPlayData.exitType = 'Line Drive';
          } else {
            enrichedPlayData.exitType = 'Fly Ball';
          }
        }
      }

      // Infer spray direction (only fair-territory directions for spray chart)
      if (!enrichedPlayData.sprayDirection) {
        const sector = getSpraySector(location.x, location.y);
        const dir = inferDirection(sector);
        // Spray direction only tracks fair-territory directions
        if (dir !== 'Foul-Left' && dir !== 'Foul-Right') {
          enrichedPlayData.sprayDirection = dir;
        }
      }

      // Run fielder inference for learning
      const inferenceResult = inferFielder(location, {
        resultType: playData.outType || playData.hitType,
        exitType: enrichedPlayData.exitType as ExitType,
        isOut: playData.type === 'out',
      });

      // Set inference fields
      enrichedPlayData.inferredFielder = inferenceResult.inferredFielder;
      enrichedPlayData.inferenceConfidence = inferenceResult.confidence;
      enrichedPlayData.playDifficulty = inferenceResult.difficulty;

      // Check if user overrode the inference
      const actualFirstFielder = playData.fieldingSequence[0];
      if (actualFirstFielder) {
        enrichedPlayData.wasOverridden = actualFirstFielder !== inferenceResult.inferredFielder;

        // Calculate LI context BEFORE recording (so it's included in learning data)
        let liContext: {
          leverageIndex: number;
          leverageCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
          isClutchSituation: boolean;
          gameSituation?: {
            inning: number;
            isTop: boolean;
            outs: number;
            bases: { first: boolean; second: boolean; third: boolean };
            homeScore: number;
            awayScore: number;
          };
        } | undefined = undefined;

        if (gameSituation) {
          try {
            const gameStateForLI: GameStateForLI = {
              inning: gameSituation.inning,
              halfInning: gameSituation.isTop ? 'TOP' : 'BOTTOM',
              outs: (gameSituation.outs as 0 | 1 | 2) || 0,
              runners: {
                first: gameSituation.bases.first,
                second: gameSituation.bases.second,
                third: gameSituation.bases.third,
              },
              homeScore: 0,
              awayScore: 0,
            };

            const liResult = calculateLeverageIndex(gameStateForLI);
            liContext = {
              leverageIndex: liResult.leverageIndex,
              leverageCategory: liResult.category,
              isClutchSituation: isClutchSituation(liResult.leverageIndex),
              gameSituation: {
                inning: gameSituation.inning,
                isTop: gameSituation.isTop,
                outs: gameSituation.outs,
                bases: { ...gameSituation.bases },
                homeScore: 0,
                awayScore: 0,
              },
            };

            // Also set on enrichedPlayData here (will be set again later but ensures it's available)
            enrichedPlayData.leverageIndex = liResult.leverageIndex;
            enrichedPlayData.leverageCategory = liResult.category;
            enrichedPlayData.isClutchSituation = liContext.isClutchSituation;
          } catch (e) {
            console.warn('[completePlay] Failed to calculate LI for adaptive learning:', e);
          }
        }

        // Record for adaptive learning (with LI context)
        if (enrichedPlayData.exitType) {
          try {
            recordFieldingEvent(
              `game_${Date.now()}`, // TODO: Get actual game ID
              location,
              enrichedPlayData.exitType as ExitType,
              inferenceResult.inferredFielder,
              actualFirstFielder,
              liContext
            );
          } catch (e) {
            console.warn('[completePlay] Failed to record for adaptive learning:', e);
          }
        }
      }
    }

    // Track DP type if applicable
    const seq = enrichedPlayData.fieldingSequence;
    const notation = seq.join('-');
    if (playData.outType === 'DP' && seq.length >= 3) {
      enrichedPlayData.dpType = notation;
    }

    // Track if this was an infield hit (for beat throw / bunt buttons)
    const isInfieldHit = playData.type === 'hit' && location !== undefined && location.y < 0.4;
    setLastPlayWasInfieldHit(isInfieldHit ?? false);

    // Track if this was a strikeout sequence (2-3 = K, 2-3-3 = D3K)
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
    // Map all out types - some like DP/TP/SAC map to GO since they're ground ball variations
    const playTypeMap: Record<string, PlayContext['playType']> = {
      'FO': 'FO',
      'LO': 'LO',
      'GO': 'GO',
      'FC': 'FC',
      'K': 'K',
      'DP': 'GO',  // Double play = ground out variant
      'TP': 'GO',  // Triple play = ground out variant
      'SAC': 'GO', // Sacrifice = ground out variant
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

    console.log('[completePlay] Setting playContext:', playContext);
    console.log('[completePlay] inferredPlayType:', inferredPlayType);
    setLastPlayContext(playContext);

    // ============================================
    // LEVERAGE INDEX & FAME CALCULATION
    // Per LEVERAGE_INDEX_SPEC.md and SPECIAL_EVENTS_SPEC.md
    // ============================================

    // Calculate LI from current game situation (if not already calculated for adaptive learning)
    if (gameSituation && !enrichedPlayData.leverageIndex) {
      try {
        // Convert gameSituation to LI format
        const gameStateForLI: GameStateForLI = {
          inning: gameSituation.inning,
          halfInning: gameSituation.isTop ? 'TOP' : 'BOTTOM',
          outs: (gameSituation.outs as 0 | 1 | 2) || 0,
          runners: {
            first: gameSituation.bases.first,
            second: gameSituation.bases.second,
            third: gameSituation.bases.third,
          },
          // Note: Scores not in current gameSituation, using 0-0 for now
          // TODO: Add score tracking to gameSituation
          homeScore: 0,
          awayScore: 0,
        };

        const liResult = calculateLeverageIndex(gameStateForLI);

        // Enrich PlayData with LI context
        enrichedPlayData.leverageIndex = liResult.leverageIndex;
        enrichedPlayData.leverageCategory = liResult.category;
        enrichedPlayData.isClutchSituation = isClutchSituation(liResult.leverageIndex);

        console.log('[completePlay] LI calculated:', {
          leverageIndex: liResult.leverageIndex,
          category: liResult.category,
          isClutchSituation: enrichedPlayData.isClutchSituation,
        });
      } catch (e) {
        console.warn('[completePlay] Failed to calculate LI:', e);
      }
    }

    // Store game situation snapshot (if not already set)
    if (gameSituation && !enrichedPlayData.gameSituation) {
      enrichedPlayData.gameSituation = {
        inning: gameSituation.inning,
        isTop: gameSituation.isTop,
        outs: gameSituation.outs,
        bases: { ...gameSituation.bases },
        homeScore: 0,
        awayScore: 0,
      };
    }

    // Note: Fame calculation for special events (WEB_GEM, ROBBERY, etc.)
    // happens when the user clicks those buttons in the contextual UI,
    // not here. This just provides the LI context for those calculations.

    console.log('[completePlay] enrichedPlayData:', enrichedPlayData);

    // Pass the enriched play data with all inference fields populated
    onPlayComplete(enrichedPlayData);
  }, [throwSequence, gameSituation, onPlayComplete]);

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

    // FIXED: Per design feedback - batter should be dragged to a BASE ZONE, not outfield.
    // The drop zones are at specific positions (matching DropZoneHighlight positions).
    // Use PURE proximity detection - find which base zone is closest.
    // The BatterReachedPopup will then ask HOW they reached that base.

    // Calculate distance to each base drop zone
    // NOTE: Uses local BASE_POSITIONS defined above with '1B', '2B', '3B' keys
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
      // NEW 5-STEP FLOW: Only allow fielder drops in OUT_FIELDING step
      if (flowStep !== 'OUT_FIELDING') {
        console.log('[handleFielderDrop] Ignored - not in OUT_FIELDING step');
        return;
      }

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
    [flowStep]
  );

  // Handle batter drop (hit location) - DISABLED in new 5-step flow
  // The new flow uses HIT_LOCATION click overlay instead of batter drag
  const handleBatterDrop = useCallback((position: FieldCoordinate) => {
    // NEW 5-STEP FLOW: Batter drag is disabled
    console.log('[handleBatterDrop] Disabled in new 5-step flow - use HIT button + click instead');
    return;

    // Legacy code below - kept for reference but unreachable
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

    // NEW FLOW per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
    // Batter drag to base → BatterReachedPopup (NOT directly to HitTypeContent)
    // BatterReachedPopup shows: BB, IBB, HBP, 1B, E, FC, D3K
    if (throwSequence.length === 0) {
      const destinationBase = determineBatterBase(position);
      if (destinationBase) {
        // Show BatterReachedPopup - user selects HOW batter reached
        setBatterReachedBase(destinationBase);
        setShowBatterReachedPopup(true);
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

  // Handle ball location tap (after ball landing prompt for hits or errors)
  const handleBallLocationTap = useCallback((position: FieldCoordinate) => {
    // Store the ball location
    setBallLocation(position);
    setShowBallLandingPrompt(false);

    // ERROR FLOW: If pending error, show fielder tap prompt instead of hit type
    if (pendingError) {
      console.log('[BallLocationTap] Error flow - waiting for fielder tap');
      setAwaitingErrorFielder(true);
      return;
    }

    // NORMAL HIT FLOW: Show hit type modal with the captured location
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
  }, [batterPosition, gameSituation, pendingError]);

  // Handle ball landing prompt cancel - inline reset to avoid dependency issues
  const handleBallLandingCancel = useCallback(() => {
    setShowBallLandingPrompt(false);
    setPendingBatterBase(null);
    setFlowStep('IDLE');
    setActiveAction(null);
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
    setPendingError(false);
    setAwaitingErrorFielder(false);
    setErrorFielder(null);
    setShowErrorTypePopup(false);
  }, []);

  // ============================================
  // NEW: Handle BatterReachedPopup selection
  // Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
  // - BB/IBB/HBP/D3K: No ball location needed → RUNNER_OUTCOMES
  // - 1B/2B/3B/E/FC: Ball in play → show ball location prompt → HitTypeContent
  // ============================================
  const handleBatterReachedSelect = useCallback((option: BatterReachedOption) => {
    setShowBatterReachedPopup(false);

    console.log(`[BatterReached] Selected: ${option}, base: ${batterReachedBase}`);

    switch (option) {
      case 'BB':
      case 'IBB':
      case 'HBP':
        // Walk/HBP - No ball in play, go directly to RUNNER_OUTCOMES
        // FIX: BUG-001/002/003 - Walks must use type: 'walk' NOT type: 'hit'
        // This routes to recordWalk() which correctly tracks PA without AB or H
        {
          const playData: PlayData = {
            type: 'walk',
            walkType: option as WalkType,
            fieldingSequence: [],
            ballLocation: undefined,
            batterLocation: batterPosition || undefined,
            spraySector: 'CF',
          };
          console.log(`[BatterReached] ${option} - walk type, setting lastClassifiedPlay`);
          setLastClassifiedPlay(playData);
          // Calculate runner defaults for walk (only forced runners advance)
          const defaults = calculateWalkDefaults(gameSituation.bases);
          setRunnerOutcomes(defaults);
          console.log('[BatterReached] Runner defaults:', defaults);
          setBatterReachedBase(null);
        }
        break;

      case 'D3K':
        // Dropped third strike - technically a strikeout but batter reached
        {
          const playData: PlayData = {
            type: 'out', // Still counts as strikeout
            outType: 'K',
            fieldingSequence: [2, 3], // Catcher to 1B (batter safe)
            ballLocation: undefined,
            batterLocation: batterPosition || undefined,
            spraySector: 'CF',
          };
          console.log(`[BatterReached] D3K - setting lastClassifiedPlay`);
          setLastClassifiedPlay(playData);
          // Calculate runner defaults for D3K
          const defaults = calculateD3KDefaults(gameSituation.bases, gameSituation.outs);
          setRunnerOutcomes(defaults);
          console.log('[BatterReached] D3K runner defaults:', defaults);
          setBatterReachedBase(null);
        }
        break;

      case '1B':
      case '2B':
      case '3B':
        // Base hit - ball was in play, need location
        // Show ball landing prompt, then HitTypeContent
        setPendingBatterBase(batterReachedBase);
        setShowBallLandingPrompt(true);
        break;

      case 'E':
        // Error - ball was in play, need location, then fielder tap, then error type
        // Flow: Ball location → Tap fielder → ErrorTypePopup → RUNNER_OUTCOMES
        setPendingBatterBase(batterReachedBase);
        setPendingError(true);
        setShowBallLandingPrompt(true);
        break;

      case 'FC':
        // Fielder's choice - ball was in play, batter safe, runner out
        // Need ball location
        setPendingBatterBase(batterReachedBase);
        setShowBallLandingPrompt(true);
        // TODO: Set flag to show which runner was out
        break;
    }
  }, [batterPosition, batterReachedBase]);

  // Handle BatterReachedPopup cancel
  const handleBatterReachedCancel = useCallback(() => {
    setShowBatterReachedPopup(false);
    setBatterReachedBase(null);
    // Reset batter position since they cancelled
    setBatterPosition(null);
  }, []);

  // Handle fielder click (add to throw sequence OR attribute error)
  const handleFielderClick = useCallback(
    (fielder: FielderData) => {
      // Error flow: If awaiting error fielder, capture it and show ErrorTypePopup
      if (awaitingErrorFielder) {
        console.log('[handleFielderClick] Error attributed to:', fielder.name, `(#${fielder.positionNumber})`);
        setErrorFielder(fielder);
        setAwaitingErrorFielder(false);
        setShowErrorTypePopup(true);
        return;
      }

      // Only allow clicking to add to sequence if there's already a placed fielder
      if (placedFielders.length === 0) return;

      // Don't add if already in sequence
      if (throwSequence.some((f) => f.positionNumber === fielder.positionNumber)) return;

      // Add to throw sequence
      const newSequence = [...throwSequence, fielder];
      setThrowSequence(newSequence);
    },
    [placedFielders.length, throwSequence, awaitingErrorFielder]
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
  // UPDATED: Now uses Play Lifecycle - sets lastClassifiedPlay → RUNNER_OUTCOMES
  const handleHitTypeSelect = useCallback(
    (hitType: HitType, trajectory?: HitTrajectory) => {
      setShowHitTypeModal(false);

      // Use batter position, ball location, or first fielder as effective location
      const effectiveLocation = batterPosition || ballLocation || placedFielders[0]?.position;

      if (!effectiveLocation) {
        console.warn('[handleHitTypeSelect] No location available for hit');
        // Reset state manually since handleReset isn't available here
        setPlacedFielders([]);
        setThrowSequence([]);
        setBatterPosition(null);
        setBallLocation(null);
        return;
      }

      const isFoul = isFoulTerritory(effectiveLocation.x, effectiveLocation.y);
      const foulType = isFoul ? getFoulType(effectiveLocation.x, effectiveLocation.y) : undefined;
      const sector = getSpraySector(effectiveLocation.x, effectiveLocation.y);

      const playData: PlayData = {
        type: 'hit',
        hitType,
        fieldingSequence: throwSequence.map((f) => f.positionNumber),
        ballLocation: effectiveLocation,
        batterLocation: batterPosition || effectiveLocation,
        isFoul,
        foulType: foulType ?? undefined,
        spraySector: sector.sector,
      };

      // Log trajectory for spray chart analysis (if needed for future use)
      if (trajectory) {
        console.log(`[Hit] ${hitType} - ${trajectory} ball to ${sector.sector}`);
      }

      // NEW: Use Play Lifecycle - set lastClassifiedPlay instead of completePlay
      // This triggers RUNNER_OUTCOMES phase. Data persists on End At-Bat.
      console.log('[handleHitTypeSelect] Setting lastClassifiedPlay for RUNNER_OUTCOMES');
      setLastClassifiedPlay(playData);

      // Calculate runner defaults for hit
      const defaults = calculateRunnerDefaults(playData, gameSituation.bases, gameSituation.outs);
      setRunnerOutcomes(defaults);
      console.log('[handleHitTypeSelect] Runner defaults:', defaults);
      // Note: Don't call handleReset - field state cleared on startNextAtBat
    },
    [batterPosition, ballLocation, throwSequence, placedFielders, gameSituation.bases, gameSituation.outs]
  );

  // Handle out type selection
  // UPDATED: Now uses Play Lifecycle - sets lastClassifiedPlay → RUNNER_OUTCOMES
  const handleOutTypeSelect = useCallback(
    (outType: OutType) => {
      setShowOutTypeModal(false);

      // GT-004 FIX: Handle fielder-only out recording (no batter position needed)
      // Use first placed fielder position as ball location if no batter/ball location
      const effectiveLocation = batterPosition || ballLocation || placedFielders[0]?.position;

      // Build play data - works even without batter position
      const playData: PlayData = {
        type: 'out',
        outType,
        fieldingSequence: throwSequence.map((f) => f.positionNumber),
        ballLocation: effectiveLocation,
        batterLocation: batterPosition || undefined,
        spraySector: effectiveLocation
          ? getSpraySector(effectiveLocation.x, effectiveLocation.y).sector
          : 'CF',
      };

      // Add foul territory info if we have a location
      if (effectiveLocation) {
        const isFoul = isFoulTerritory(effectiveLocation.x, effectiveLocation.y);
        if (isFoul) {
          playData.isFoul = true;
          const foulType = getFoulType(effectiveLocation.x, effectiveLocation.y);
          if (foulType) {
            playData.foulType = foulType;
          }
        }
      }

      // NEW: Use Play Lifecycle - set lastClassifiedPlay instead of completePlay
      // This triggers RUNNER_OUTCOMES phase. Data persists on End At-Bat.
      console.log('[handleOutTypeSelect] Setting lastClassifiedPlay for RUNNER_OUTCOMES:', outType);
      setLastClassifiedPlay(playData);

      // Calculate runner defaults for out
      const defaults = calculateRunnerDefaults(playData, gameSituation.bases, gameSituation.outs);
      setRunnerOutcomes(defaults);
      console.log('[handleOutTypeSelect] Runner defaults:', defaults);

      // EXH-033 FIX: Show any pending prompts (KILLED_PITCHER, NUT_SHOT, etc.)
      // These prompts were generated by the classifier but not shown yet
      if (pendingPrompts.length > 0) {
        console.log('[handleOutTypeSelect] Showing pending prompts:', pendingPrompts.map(p => p.eventType));
        setCurrentPromptIndex(0);
        setShowSpecialEventPrompt(true);
      }
      // Note: Don't call handleReset - field state cleared on startNextAtBat
    },
    [batterPosition, ballLocation, throwSequence, placedFielders, gameSituation.bases, gameSituation.outs, pendingPrompts]
  );

  // Handle HR distance submission
  // UPDATED: Now uses Play Lifecycle - sets lastClassifiedPlay → RUNNER_OUTCOMES
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

        // NEW: Use Play Lifecycle - set lastClassifiedPlay instead of onPlayComplete
        // This triggers RUNNER_OUTCOMES phase. Data persists on End At-Bat.
        console.log('[handleHRDistance] Setting lastClassifiedPlay for RUNNER_OUTCOMES');
        setLastClassifiedPlay(playData);

        // Calculate runner defaults for HR (everyone scores)
        const defaults = calculateRunnerDefaults(playData, gameSituation.bases, gameSituation.outs);
        setRunnerOutcomes(defaults);
        console.log('[handleHRDistance] Runner defaults:', defaults);

        // Transition to RUNNER_CONFIRM step
        setFlowStep('RUNNER_CONFIRM');
        console.log('[handleHRDistance] → RUNNER_CONFIRM');
      }
      setShowHRDistanceModal(false);
      setPendingHRData(null);
    },
    [pendingHRData, gameSituation.bases, gameSituation.outs]
  );

  // Reset state (but keep lastPlay* context for contextual buttons)
  const handleReset = useCallback(() => {
    // Reset 5-step flow state
    setFlowStep('IDLE');
    setActiveAction(null);
    // Reset field state
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
    // Reset error-related state
    setPendingError(false);
    setAwaitingErrorFielder(false);
    setErrorFielder(null);
    setShowErrorTypePopup(false);
    // Reset BatterReachedPopup state
    setShowBatterReachedPopup(false);
    setBatterReachedBase(null);
    // NOTE: lastPlay* state is intentionally NOT reset here
    // so contextual buttons can attribute events to previous play
    // They are cleared individually when the user taps a contextual button
    // or when a new play is completed (overwriting the previous context)
  }, []);

  // Actual classification logic (extracted for animation timing)
  // GT-002 FIX: Wire CLASSIFY button to actually use the classifier
  // GT-003 FIX: Route to appropriate modal based on context (skip PlayTypeModal)
  // GT-004 FIX: Enable fielder-only out recording
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

  // Wrapper with animation timing
  const handleClassifyPlay = useCallback(() => {
    // Show "CLASSIFYING..." animation briefly before processing
    setIsClassifying(true);

    // Use setTimeout to show the animation for 200ms before classification
    setTimeout(() => {
      setIsClassifying(false);
      performClassification();
    }, 200);
  }, [performClassification]);

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

  // ============================================
  // NEW 5-STEP FLOW HANDLERS (per GAMETRACKER_UI_DESIGN.md)
  // ============================================

  /**
   * Step 1 Handler: HIT selected
   * Transitions to HIT_LOCATION step to capture where ball was hit
   */
  const handleHitAction = useCallback(() => {
    console.log('[Flow] HIT selected → HIT_LOCATION');
    setFlowStep('HIT_LOCATION');
    setActiveAction('HIT');
    // Reset any previous play state
    setPlacedFielders([]);
    setThrowSequence([]);
    setBallLocation(null);
  }, []);

  /**
   * Step 1 Handler: OUT selected
   * Transitions to OUT_FIELDING step to capture fielding sequence
   */
  const handleOutAction = useCallback(() => {
    console.log('[Flow] OUT (Ball in Play) selected → OUT_FIELDING');
    setFlowStep('OUT_FIELDING');
    setActiveAction('OUT');
    // Reset any previous play state
    setPlacedFielders([]);
    setThrowSequence([]);
    setBallLocation(null);
  }, []);

  /**
   * Step 3 Handler: HIT outcome selected
   * Receives selected hit type and modifiers, then transitions to runner confirmation
   */
  const handleHitOutcome = useCallback((outcome: HitOutcome) => {
    console.log('[Flow] HIT outcome selected:', outcome);

    // Build play data from outcome
    const playData: PlayData = {
      type: outcome.type === 'HR' ? 'hr' : 'hit',
      hitType: outcome.type,
      fieldingSequence: placedFielders.map(pf => pf.fielder.positionNumber),
      ballLocation: ballLocation || undefined,
      spraySector: ballLocation ? getSpraySector(ballLocation.x, ballLocation.y).sector : undefined,
    };

    // Check for special events
    if (outcome.specialEvents.includes('KP')) {
      onSpecialEvent?.({ eventType: 'KILLED_PITCHER' });
    }
    if (outcome.specialEvents.includes('NUT')) {
      onSpecialEvent?.({ eventType: 'NUT_SHOT' });
    }

    // Handle HR - needs distance input
    if (outcome.type === 'HR') {
      setPendingHRData({
        location: ballLocation || { x: 0.5, y: 1.0 },
        hrType: 'deep',
      });
      setShowHRDistanceModal(true);
      return;
    }

    // Calculate runner defaults and transition to confirmation
    setLastClassifiedPlay(playData);
    const defaults = calculateRunnerDefaults(playData, gameSituation.bases, gameSituation.outs);
    setRunnerOutcomes(defaults);
    setFlowStep('RUNNER_CONFIRM');
    console.log('[Flow] → RUNNER_CONFIRM with defaults:', defaults);
  }, [ballLocation, placedFielders, gameSituation, onSpecialEvent]);

  /**
   * Step 3 Handler: OUT outcome selected
   * Receives selected out type and modifiers, then transitions to runner confirmation
   * EXH-033 FIX: Now runs classifier to generate KILLED_PITCHER / NUT_SHOT prompts
   */
  const handleOutOutcome = useCallback((outcome: OutOutcome) => {
    console.log('[Flow] OUT outcome selected:', outcome);

    const fieldingSequence = placedFielders.map(pf => pf.fielder.positionNumber);

    // Handle E (Reached On Error) - batter reaches base due to error
    // Must handle BEFORE building playData since 'E' is not in PlayData.OutType
    // This triggers the error fielder selection flow
    if (outcome.type === 'E') {
      console.log('[Flow] E (ROE) selected - starting error fielder selection');
      // Store the play data and trigger error fielder selection
      setPendingError(true);
      setAwaitingErrorFielder(true);
      // Keep showing fielding area so user can tap the fielder who made the error
      setFlowStep('OUT_FIELDING');
      return; // Exit early - will continue in handleFielderClick → handleErrorTypeSelect
    }

    // Build play data from outcome (E/ROE already handled above)
    const playData: PlayData = {
      type: 'out',
      outType: outcome.type as OutType, // Cast is safe since E is handled above
      fieldingSequence,
      ballLocation: ballLocation || undefined,
      spraySector: ballLocation ? getSpraySector(ballLocation.x, ballLocation.y).sector : undefined,
    };

    // Handle foul out
    if (outcome.type === 'FLO') {
      playData.type = 'foul_out';
      playData.isFoul = true;
    }

    // Check for special events
    if (outcome.specialEvents.includes('WEB')) {
      onSpecialEvent?.({ eventType: 'WEB_GEM' });
    }

    // Handle error modifier (error ON an out, not ROE)
    if (outcome.modifiers.includes('E')) {
      playData.type = 'error';
    }

    // EXH-033 FIX: Run classifier to generate prompts (KILLED_PITCHER, NUT_SHOT, etc.)
    // This is critical for pitcher comebacker detection
    const classificationResult = classifyPlay({
      batterPosition: undefined,
      ballLocation: ballLocation || undefined,
      fieldingSequence,
      gameContext: {
        outs: gameSituation.outs,
        bases: gameSituation.bases,
        inning: gameSituation.inning,
        isTop: gameSituation.isTop,
      },
    });

    // Store prompts for display after play data is set
    if (classificationResult.prompts.length > 0) {
      console.log('[handleOutOutcome] Classifier generated prompts:', classificationResult.prompts.map(p => p.eventType));
      setPendingPrompts(classificationResult.prompts);
    }

    // Calculate runner defaults and set play data
    setLastClassifiedPlay(playData);
    const defaults = calculateRunnerDefaults(playData, gameSituation.bases, gameSituation.outs);
    setRunnerOutcomes(defaults);

    // EXH-033 FIX: If there are prompts (e.g., KILLED_PITCHER, NUT_SHOT), show them
    // before transitioning to runner confirmation
    if (classificationResult.prompts.length > 0) {
      setCurrentPromptIndex(0);
      setShowSpecialEventPrompt(true);
      console.log('[handleOutOutcome] Showing special event prompts before runner confirmation');
    } else {
      setFlowStep('RUNNER_CONFIRM');
      console.log('[Flow] → RUNNER_CONFIRM with defaults:', defaults);
    }
  }, [ballLocation, placedFielders, gameSituation, onSpecialEvent]);

  /**
   * Handler: Go back from outcome selection to location/fielding
   */
  const handleOutcomeBack = useCallback(() => {
    if (activeAction === 'HIT') {
      setFlowStep('HIT_LOCATION');
    } else if (activeAction === 'OUT') {
      setFlowStep('OUT_FIELDING');
    } else {
      setFlowStep('IDLE');
      setActiveAction(null);
    }
  }, [activeAction]);

  /**
   * Handler: Field clicked during HIT_LOCATION step
   * Captures ball location and transitions to HIT_OUTCOME
   */
  const handleHitLocationClick = useCallback((position: FieldCoordinate) => {
    if (flowStep !== 'HIT_LOCATION') return;

    console.log('[Flow] Hit location clicked:', position);
    setBallLocation(position);

    // Check if HR (in stands)
    if (isInStands(position.y)) {
      const hrType = classifyHomeRun(position.y);
      setPendingHRData({ location: position, hrType });
      setShowHRDistanceModal(true);
      return;
    }

    // Transition to outcome selection
    setFlowStep('HIT_OUTCOME');
  }, [flowStep]);

  /**
   * Handler: Fielder dropped during OUT_FIELDING step
   * Transitions to OUT_OUTCOME after ADVANCE is clicked
   */
  const handleOutAdvance = useCallback(() => {
    if (flowStep !== 'OUT_FIELDING') return;
    if (placedFielders.length === 0) {
      console.log('[Flow] Cannot advance - no fielders placed');
      return;
    }
    console.log('[Flow] OUT fielding complete, advancing to outcome');
    setFlowStep('OUT_OUTCOME');
  }, [flowStep, placedFielders]);

  // GT-007: Handle quick result buttons (BB, K, HBP, etc.)
  // UPDATED: Now uses Play Lifecycle - BB/HBP go to RUNNER_OUTCOMES
  // K/KL now handled by handleStrikeout instead
  const handleQuickResult = useCallback((resultType: QuickResultType) => {
    // Map quick result to play data
    const playData: PlayData = {
      type: 'out',
      fieldingSequence: [],
      spraySector: 'CF', // Default
    };

    switch (resultType) {
      case 'BB':
        // FIX: BUG-001 - Walks must use type: 'walk' NOT type: 'hit'
        // This routes to recordWalk() which correctly tracks PA without AB or H
        playData.type = 'walk';
        playData.walkType = 'BB';
        console.log('[QuickResult] Walk (BB) → RUNNER_OUTCOMES');
        // Use Play Lifecycle - set lastClassifiedPlay and runnerOutcomes
        setLastClassifiedPlay(playData);
        const bbDefaults = calculateWalkDefaults(gameSituation.bases);
        setRunnerOutcomes(bbDefaults);
        console.log('[QuickResult] BB runner defaults:', bbDefaults);
        return; // Exit early - don't call onPlayComplete

      case 'IBB':
        // FIX: BUG-003 - IBB must use type: 'walk' NOT type: 'hit'
        playData.type = 'walk';
        playData.walkType = 'IBB';
        console.log('[QuickResult] Intentional Walk (IBB) → RUNNER_OUTCOMES');
        setLastClassifiedPlay(playData);
        const ibbDefaults = calculateWalkDefaults(gameSituation.bases);
        setRunnerOutcomes(ibbDefaults);
        console.log('[QuickResult] IBB runner defaults:', ibbDefaults);
        return;

      case 'HBP':
        // FIX: BUG-002 - HBP must use type: 'walk' NOT type: 'hit'
        playData.type = 'walk';
        playData.walkType = 'HBP';
        console.log('[QuickResult] Hit By Pitch (HBP) → RUNNER_OUTCOMES');
        setLastClassifiedPlay(playData);
        const hbpDefaults = calculateWalkDefaults(gameSituation.bases);
        setRunnerOutcomes(hbpDefaults);
        console.log('[QuickResult] HBP runner defaults:', hbpDefaults);
        return;

      case 'K':
        // K now handled by handleStrikeout, but keep as fallback
        playData.type = 'out';
        playData.outType = 'K';
        playData.fieldingSequence = []; // Empty - no fielding on regular strikeout
        console.log('[QuickResult] Strikeout Swinging (K) → RUNNER_OUTCOMES');
        setLastClassifiedPlay(playData);
        const kDefaults = calculateRunnerDefaults(playData, gameSituation.bases, gameSituation.outs);
        setRunnerOutcomes(kDefaults);
        return;

      case 'KL':
        // KL now handled by handleStrikeout, but keep as fallback
        playData.type = 'out';
        playData.outType = 'KL';
        playData.fieldingSequence = []; // Empty - no fielding on regular strikeout
        console.log('[QuickResult] Strikeout Looking (KL) → RUNNER_OUTCOMES');
        setLastClassifiedPlay(playData);
        const klDefaults = calculateRunnerDefaults(playData, gameSituation.bases, gameSituation.outs);
        setRunnerOutcomes(klDefaults);
        return;

      case 'D3K':
        playData.type = 'out';
        playData.outType = 'K';
        playData.fieldingSequence = [2, 3]; // Catcher to 1B
        console.log('[QuickResult] Dropped 3rd Strike (D3K) → RUNNER_OUTCOMES');
        setLastClassifiedPlay(playData);
        const d3kDefaults = calculateD3KDefaults(gameSituation.bases, gameSituation.outs);
        setRunnerOutcomes(d3kDefaults);
        return;
    }
  }, [gameSituation.bases, gameSituation.outs]);

  /**
   * Step 1 Handler: OTHER action selected (BB, IBB, HBP, D3K, SB, CS, PK, TBL, PB, WP, E)
   * These bypass the location/fielding steps and go directly to runner outcomes
   */
  const handleOtherAction = useCallback((action: OtherAction) => {
    console.log('[Flow] OTHER action selected:', action);
    setActiveAction('OTHER');

    // Most OTHER actions map to the existing handleQuickResult logic
    // Route through existing handlers where available
    switch (action) {
      case 'BB':
      case 'IBB':
      case 'HBP':
        handleQuickResult(action);
        setFlowStep('RUNNER_CONFIRM');
        break;
      case 'D3K':
        // D3K has special handling - needs catcher/1B selection
        // For now, route to existing flow
        handleQuickResult('D3K' as QuickResultType);
        setFlowStep('RUNNER_CONFIRM');
        break;
      case 'WP':
      case 'PB':
        // Wild Pitch / Passed Ball - all runners advance one base
        // These events don't end the at-bat
        console.log('[Flow] All runners advance event:', action);
        {
          const bases = gameSituation.bases;
          const movements: Array<{
            from: 'first' | 'second' | 'third';
            to: 'second' | 'third' | 'home' | 'out';
            outcome: 'safe' | 'out';
          }> = [];

          // Process from lead runner first so state updates stay baseball-correct.
          if (bases.third) {
            movements.push({ from: 'third', to: 'home', outcome: 'safe' });
          }
          if (bases.second) {
            movements.push({ from: 'second', to: 'third', outcome: 'safe' });
          }
          if (bases.first) {
            movements.push({ from: 'first', to: 'second', outcome: 'safe' });
          }

          if (onBatchRunnerMove && movements.length > 0) {
            onBatchRunnerMove(movements, action);
          } else if (onRunnerMove) {
            for (const movement of movements) {
              onRunnerMove({
                from: movement.from,
                to: movement.to === 'out' ? movement.from : movement.to,
                outcome: movement.outcome,
                playType: action as 'WP' | 'PB',
              });
            }
          }
        }
        // Stay in IDLE - at-bat continues
        setFlowStep('IDLE');
        setActiveAction(null);
        break;
      case 'SB':
      case 'CS':
      case 'PK':
      case 'TBL':
        // Stolen Base / Caught Stealing / Pickoff / TOOTBLAN
        // FIX: BUG-006 - Show runner outcome modal so user can choose which runner and outcomes
        // Instead of auto-advancing, calculate defaults and show RUNNER_CONFIRM modal
        console.log('[Flow] Runner event:', action, '- showing runner outcome modal');
        {
          const bases = gameSituation.bases;
          // Calculate runner defaults using new function
          const runnerEventDefaults = calculateStolenBaseDefaults(
            action as RunnerEventType,
            bases
          );

          // Create a minimal PlayData for this runner event
          // The batter stays at bat, so we use a special type
          const runnerPlayData: PlayData = {
            type: 'out', // For CS/PK/TBL - runner is out; for SB this is ignored
            outType: 'CS' as OutType, // Caught stealing - closest out type
            fieldingSequence: [],
            spraySector: 'CF',
          };

          // Store the runner event type for handleEndAtBat to process correctly
          setLastClassifiedPlay(runnerPlayData);
          setRunnerOutcomes(runnerEventDefaults);

          // Store the runner event type so we know how to process it
          setPendingRunnerEvent(action as RunnerEventType);

          // Show runner outcome modal
          setFlowStep('RUNNER_CONFIRM');
          console.log('[Flow] → RUNNER_CONFIRM with runner event defaults:', runnerEventDefaults);
        }
        break;
      case 'E':
        // Error (ROE) - start error flow
        // Flow: Show ball landing prompt → user clicks location → user taps fielder → error type → runner outcomes
        console.log('[Flow] Error (ROE) selected - starting error flow with ball location prompt');
        setPendingError(true);
        setPendingBatterBase('1B'); // Default: batter reaches first on error
        setShowBallLandingPrompt(true); // First: get ball location
        // After ball location is set, awaitingErrorFielder will be set in handleBallLandingConfirm
        break;
      default:
        setFlowStep('IDLE');
        setActiveAction(null);
    }
  }, [handleQuickResult, onRunnerMove, onBatchRunnerMove, gameSituation.bases]);

  // ============================================
  // NEW: Strikeout handler using Play Lifecycle
  // Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
  // K/Ꝅ tap → IMMEDIATELY create play record → RUNNER_OUTCOMES
  // Updated to accept StrikeoutType from ActionSelector submenu
  // ============================================
  const handleStrikeout = useCallback((type: StrikeoutType) => {
    const looking = type === 'KL';
    const playData: PlayData = {
      type: 'out',
      outType: looking ? 'KL' : 'K',
      fieldingSequence: [], // Empty - no fielding on regular strikeout (D3K uses [2, 3])
      spraySector: 'CF',
    };

    console.log(`[Strikeout] ${looking ? 'Looking (KL)' : 'Swinging (K)'}`);

    // Set lastClassifiedPlay - this triggers RUNNER_OUTCOMES phase
    // Data is NOT persisted yet - that happens on End At-Bat
    setLastClassifiedPlay(playData);

    // Calculate runner defaults for strikeout (runners hold)
    const defaults = calculateRunnerDefaults(playData, gameSituation.bases, gameSituation.outs);
    setRunnerOutcomes(defaults);
    console.log('[Strikeout] Runner defaults:', defaults);

    // Clear any existing field state
    setPlacedFielders([]);
    setThrowSequence([]);
    setBatterPosition(null);
    setBallLocation(null);

    // Transition to RUNNER_CONFIRM step - no fielder interaction needed for K
    setFlowStep('RUNNER_CONFIRM');
    setActiveAction('OUT');
    console.log('[Strikeout] → RUNNER_CONFIRM (skipping fielder step)');
  }, [gameSituation.bases, gameSituation.outs]);

  // ============================================
  // NEW: End At-Bat handler - THIS IS WHEN DATA PERSISTS
  // Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
  // 1. Create undo snapshot BEFORE persist
  // 2. Persist play to game state
  // 3. Mark play as committed
  // 4. Enable applicable modifier buttons
  // ============================================
  const handleEndAtBat = useCallback(() => {
    if (!lastClassifiedPlay) {
      console.warn('[EndAtBat] No classified play to commit');
      return;
    }

    console.log('[EndAtBat] Committing play:', lastClassifiedPlay);
    console.log('[EndAtBat] Runner outcomes:', runnerOutcomes);
    console.log('[EndAtBat] Pending runner event:', pendingRunnerEvent);

    // Check if this is a runner event (SB/CS/PK/TBL) - at-bat continues
    const isRunnerEvent = pendingRunnerEvent !== null;

    if (isRunnerEvent && runnerOutcomes) {
      // For runner events, use batch update to process all runners atomically
      // This prevents race conditions when multiple runners move
      console.log('[EndAtBat] Processing runner event:', pendingRunnerEvent);

      // Collect all runner movements
      const movements: Array<{ from: 'first' | 'second' | 'third'; to: 'second' | 'third' | 'home' | 'out'; outcome: 'safe' | 'out' }> = [];
      const runnerKeys: ('first' | 'second' | 'third')[] = ['first', 'second', 'third'];

      for (const base of runnerKeys) {
        const outcome = runnerOutcomes[base];
        if (outcome && outcome.from !== 'batter') {
          // Check if runner actually moved or is out
          const isSafe = outcome.to !== 'out';
          const stayedAtBase = outcome.from === outcome.to;

          // Only add movement if runner moved to a different base OR was out
          if (!stayedAtBase || !isSafe) {
            const toBase = outcome.to as 'second' | 'third' | 'home' | 'out';
            console.log(`[EndAtBat] Runner movement: ${outcome.from} → ${toBase} (${isSafe ? 'safe' : 'out'})`);

            movements.push({
              from: outcome.from as 'first' | 'second' | 'third',
              to: toBase,
              outcome: isSafe ? 'safe' : 'out',
            });
          } else {
            console.log(`[EndAtBat] Runner holds: ${outcome.from} stays at ${outcome.to}`);
          }
        }
      }

      // Use batch handler if available, otherwise fall back to individual calls
      if (onBatchRunnerMove && movements.length > 0) {
        console.log('[EndAtBat] Using batch runner move for', movements.length, 'movements');
        onBatchRunnerMove(movements, pendingRunnerEvent);
      } else if (onRunnerMove) {
        // Fallback: process in reverse order (third, second, first) to avoid conflicts
        console.log('[EndAtBat] Fallback: processing movements individually in reverse order');
        const sortedMovements = [...movements].sort((a, b) => {
          const order = { third: 0, second: 1, first: 2 };
          return order[a.from] - order[b.from];
        });
        for (const move of sortedMovements) {
          const playType = pendingRunnerEvent === 'PK' ? 'PICK' :
                          pendingRunnerEvent === 'TBL' ? 'ADV' :
                          pendingRunnerEvent as RunnerPlayType;
          onRunnerMove({
            from: move.from,
            to: move.to === 'out' ? move.from : move.to,
            outcome: move.outcome,
            playType,
          });
        }
      }

      // At-bat continues after runner event - just reset flow state
      console.log('[EndAtBat] Runner event processed, at-bat continues');
    } else {
      // Regular at-bat completion - persist to game state
      // CRITICAL: Include runnerOutcomes so user adjustments are persisted!
      const completePlayData: PlayData = {
        ...lastClassifiedPlay,
        runnerOutcomes: runnerOutcomes || undefined,
      };
      console.log('[EndAtBat] Complete play data with runner outcomes:', completePlayData);
      onPlayComplete(completePlayData);
      console.log('[EndAtBat] Play committed, resetting for next at-bat');
    }

    // Reset 5-step flow state
    setFlowStep('IDLE');
    setActiveAction(null);
    setPendingRunnerEvent(null);

    // Clear all play state
    setLastClassifiedPlay(null);
    setPlayCommitted(false);
    setRunnerOutcomes(null);
    setPlacedFielders([]);
    setThrowSequence([]);
    setBatterPosition(null);
    setBallLocation(null);

    // Clear any modals
    setShowHRDistanceModal(false);
    setPendingHRData(null);

    console.log('[EndAtBat] Ready for next at-bat');
  }, [lastClassifiedPlay, onPlayComplete, runnerOutcomes, pendingRunnerEvent, onRunnerMove, onBatchRunnerMove]);

  // ============================================
  // NEW: Handle modifier button tap
  // Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
  // - KP/NUT are mutually exclusive (selecting one disables the other)
  // - KP shows InjuryPrompt immediately
  // - NUT shows MojoPrompt immediately
  // - WG shows StarPlaySubtypePopup
  // ============================================
  const handleModifierTap = useCallback((modifierId: ModifierId) => {
    // Check if blocked by mutual exclusivity
    if (modifierId === 'KP' && activeModifiers.has('NUT')) {
      console.log('[ModifierTap] KP blocked - NUT already selected');
      return;
    }
    if (modifierId === 'NUT' && activeModifiers.has('KP')) {
      console.log('[ModifierTap] NUT blocked - KP already selected');
      return;
    }

    console.log(`[ModifierTap] Tapped: ${modifierId}`);

    // Add to active modifiers
    setActiveModifiers(prev => new Set([...prev, modifierId]));

    // Handle specific modifier flows
    switch (modifierId) {
      case 'KP':
        // IMMEDIATELY show InjuryPrompt
        // Record +3.0 Fame to batter (handled in prompt completion)
        setPendingInjuryPrompt('KP');
        break;

      case 'NUT':
        // IMMEDIATELY show MojoPrompt
        // Record +1.0 Fame to batter (handled in prompt completion)
        setPendingInjuryPrompt('NUT');
        break;

      case 'WG':
        // Show StarPlaySubtypePopup
        // WG applies to FIRST fielder in sequence
        console.log('[ModifierTap] WG - showing StarPlaySubtypePopup');
        setIsStarPlayRobbery(false);
        setShowStarPlayPopup(true);
        break;

      case 'ROB':
        // HR Robbery - show StarPlaySubtypePopup with robbery flag
        // ROB applies to first fielder, gets +1.5 Fame instead of +1.0
        console.log('[ModifierTap] ROB - showing StarPlaySubtypePopup (robbery)');
        setIsStarPlayRobbery(true);
        setShowStarPlayPopup(true);
        break;

      case '7+':
        // 7+ pitch at-bat - just record it
        console.log('[ModifierTap] 7+ pitch at-bat recorded');
        break;

      case 'BT':
        // Beat throw
        console.log('[ModifierTap] Beat throw recorded');
        break;

      case 'BUNT':
        // Bunt hit
        console.log('[ModifierTap] Bunt recorded');
        break;

      case 'TOOTBLAN':
        // TOOTBLAN - baserunning blunder
        console.log('[ModifierTap] TOOTBLAN recorded');
        break;
    }

    // Notify parent of special event
    if (onSpecialEvent) {
      const eventTypeMap: Record<ModifierId, SpecialEventType | null> = {
        'KP': 'KILLED_PITCHER',
        'NUT': 'NUT_SHOT',
        'WG': 'WEB_GEM',
        'ROB': 'ROBBERY',
        'BT': 'BEAT_THROW',
        'BUNT': 'BUNT',
        'TOOTBLAN': 'TOOTBLAN',
        '7+': 'SEVEN_PLUS_PITCH_AB',
      };

      const eventType = eventTypeMap[modifierId];
      if (eventType) {
        onSpecialEvent({
          eventType,
          fielderPosition: lastClassifiedPlay?.fieldingSequence?.[0],
          fielderName: lastClassifiedPlay?.fieldingSequence?.[0]
            ? playerNames[lastClassifiedPlay.fieldingSequence[0]]
            : undefined,
        });
      }
    }
  }, [activeModifiers, lastClassifiedPlay, onSpecialEvent, playerNames]);

  // ============================================
  // NEW: Handle InjuryPrompt completion (KP or NUT)
  // EXH-033/EXH-034 FIX: Handle injury/mojo updates and continue with remaining prompts
  // ============================================
  const handleInjuryPromptComplete = useCallback((result: InjuryResult | MojoResult) => {
    console.log('[InjuryPrompt] Complete:', result, 'Type:', pendingInjuryPrompt);

    if (pendingInjuryPrompt === 'KP') {
      const injuryResult = result as InjuryResult;
      if (injuryResult.stayedIn) {
        console.log('[KP] Pitcher stayed in game');
      } else {
        console.log('[KP] Pitcher left game with severity:', injuryResult.severity);
        // EXH-034: Fitness update would go here
        // The InjuryPrompt already captures the severity (HURT/INJURED/WOUNDED)
        // which maps to fitness states. Parent component should handle the actual
        // fitness update via onSpecialEvent callback.
      }
    } else if (pendingInjuryPrompt === 'NUT') {
      const mojoResult = result as MojoResult;
      console.log('[NUT] Mojo impact:', mojoResult.mojoImpact);
      // EXH-034: Mojo update would go here
      // The InjuryPrompt already captures the mojo impact (NONE/TENSE/RATTLED)
      // Parent component should handle the actual mojo update.
    }

    // Clear the prompt
    setPendingInjuryPrompt(null);

    // FIX: KILLED_PITCHER and NUT_SHOT are mutually exclusive
    // If we just completed KILLED_PITCHER, skip any remaining NUT_SHOT prompt
    let nextPromptIndex = currentPromptIndex + 1;
    if (pendingInjuryPrompt === 'KP') {
      // Skip NUT_SHOT if it's the next prompt (they're mutually exclusive)
      while (nextPromptIndex < pendingPrompts.length &&
             pendingPrompts[nextPromptIndex].eventType === 'NUT_SHOT') {
        console.log('[InjuryPrompt] Skipping NUT_SHOT prompt (mutually exclusive with KILLED_PITCHER)');
        nextPromptIndex++;
      }
    }

    // Continue with remaining prompts if any, otherwise finish
    if (nextPromptIndex < pendingPrompts.length) {
      // More prompts to show
      setCurrentPromptIndex(nextPromptIndex);
      setShowSpecialEventPrompt(true);
    } else {
      // All prompts done
      // EXH-033 FIX: If we have a classified play waiting, transition to RUNNER_CONFIRM
      // instead of resetting (this happens when we came from handleOutOutcome)
      if (lastClassifiedPlay && runnerOutcomes) {
        setFlowStep('RUNNER_CONFIRM');
        console.log('[InjuryPrompt] Done, transitioning to RUNNER_CONFIRM');
      } else {
        handleReset();
      }
    }
  }, [pendingInjuryPrompt, currentPromptIndex, pendingPrompts, handleReset, lastClassifiedPlay, runnerOutcomes]);

  // Handle InjuryPrompt cancel
  const handleInjuryPromptCancel = useCallback(() => {
    console.log('[InjuryPrompt] Cancelled');
    // Remove the modifier from active since they cancelled
    if (pendingInjuryPrompt) {
      setActiveModifiers(prev => {
        const next = new Set(prev);
        next.delete(pendingInjuryPrompt as ModifierId);
        return next;
      });
    }
    setPendingInjuryPrompt(null);
  }, [pendingInjuryPrompt]);

  // ============================================
  // NEW: Handle StarPlaySubtypePopup selection (WG or ROB)
  // ============================================
  const handleStarPlaySelect = useCallback((subtype: StarPlaySubtype) => {
    const firstFielderPos = lastClassifiedPlay?.fieldingSequence?.[0];
    const firstFielderName = firstFielderPos ? playerNames[firstFielderPos] : 'Unknown';
    const eventType = isStarPlayRobbery ? 'ROBBERY' : 'WEB_GEM';

    // Calculate LI-weighted Fame value
    // Per SPECIAL_EVENTS_SPEC.md v3.3: ROBBERY = +1.0, WEB_GEM = +0.75 base fame (CRIT-06 fix)
    const baseFame = isStarPlayRobbery ? 1.0 : 0.75;
    let finalFameValue = baseFame;
    let liValue: number | undefined;
    let liCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' | undefined;
    let clutchSituation = false;

    // Get LI from lastClassifiedPlay (if available)
    if (lastClassifiedPlay?.leverageIndex !== undefined) {
      liValue = lastClassifiedPlay.leverageIndex;
      liCategory = lastClassifiedPlay.leverageCategory;
      clutchSituation = lastClassifiedPlay.isClutchSituation || false;

      // Use fameEngine's calculateFame for proper LI weighting
      try {
        const fameEventType = isStarPlayRobbery ? 'ROBBERY' : 'WEB_GEM';
        const fameResult = calculateFame(fameEventType as 'ROBBERY' | 'WEB_GEM', liValue);
        finalFameValue = fameResult.finalFame;
      } catch (e) {
        // Fallback to manual calculation: baseFame × √LI
        finalFameValue = baseFame * Math.sqrt(liValue);
      }
    }

    console.log(`[StarPlay] ${eventType} - ${subtype} by ${firstFielderName} (#${firstFielderPos}), +${finalFameValue.toFixed(2)} Fame (base: ${baseFame}, LI: ${liValue?.toFixed(2) || 'N/A'})`);

    // Notify parent of the special event with Fame context
    if (onSpecialEvent) {
      onSpecialEvent({
        eventType: eventType as SpecialEventType,
        fielderPosition: firstFielderPos,
        fielderName: firstFielderName,
        leverageIndex: liValue,
        leverageCategory: liCategory,
        isClutchSituation: clutchSituation,
        fameValue: finalFameValue,
        baseFame: baseFame,
      });
    }

    // Close the popup
    setShowStarPlayPopup(false);
    setIsStarPlayRobbery(false);
  }, [lastClassifiedPlay, playerNames, isStarPlayRobbery, onSpecialEvent]);

  // Handle StarPlaySubtypePopup cancel
  const handleStarPlayCancel = useCallback(() => {
    console.log('[StarPlay] Cancelled');
    // Remove the modifier from active since they cancelled
    const modToRemove = isStarPlayRobbery ? 'ROB' : 'WG';
    setActiveModifiers(prev => {
      const next = new Set(prev);
      next.delete(modToRemove as ModifierId);
      return next;
    });
    setShowStarPlayPopup(false);
    setIsStarPlayRobbery(false);
  }, [isStarPlayRobbery]);

  // ============================================
  // ErrorTypePopup handlers
  // ============================================
  const handleErrorTypeSelect = useCallback((errorType: ErrorType) => {
    if (!errorFielder) {
      console.warn('[ErrorType] No error fielder set');
      return;
    }

    console.log(`[ErrorType] ${errorType} error by ${errorFielder.name} (#${errorFielder.positionNumber})`);

    // Create the play data for an error
    const playData: PlayData = {
      type: 'error',
      fieldingSequence: [errorFielder.positionNumber],
      ballLocation: ballLocation || batterPosition || { x: 0.5, y: 0.5 },
      batterLocation: batterPosition || { x: 0.5, y: 0.5 },
      isFoul: false,
      errorType: errorType,
      errorFielder: errorFielder.positionNumber,
    };

    // Set the classified play for runner outcomes
    setLastClassifiedPlay(playData);

    // Calculate runner defaults for error (batter reaches, runners advance)
    const defaults = calculateRunnerDefaults(playData, gameSituation.bases, gameSituation.outs);
    setRunnerOutcomes(defaults);
    console.log('[ErrorType] Runner defaults:', defaults);

    // Clear error state
    setShowErrorTypePopup(false);
    setPendingError(false);
    setErrorFielder(null);

    // Transition to RUNNER_CONFIRM to show runner outcomes modal
    setFlowStep('RUNNER_CONFIRM');
    console.log('[ErrorType] → RUNNER_CONFIRM phase');
  }, [errorFielder, ballLocation, batterPosition, gameSituation.bases, gameSituation.outs]);

  const handleErrorTypeCancel = useCallback(() => {
    console.log('[ErrorType] Cancelled');
    setShowErrorTypePopup(false);
    setPendingError(false);
    setAwaitingErrorFielder(false);
    setErrorFielder(null);
    // Reset batter position since they cancelled the whole flow
    setBatterPosition(null);
    setBatterReachedBase(null);
  }, []);

  // ============================================
  // NEW: Start next at-bat - clears all state for new batter
  // ============================================
  const startNextAtBat = useCallback(() => {
    // Clear 5-step flow state
    setFlowStep('IDLE');
    setActiveAction(null);

    // Clear all play lifecycle state
    setLastClassifiedPlay(null);
    setPlayCommitted(false);
    setAtBatComplete(false);
    setActiveModifiers(new Set());
    setEnabledModifiers(new Set());
    setPendingInjuryPrompt(null);

    // Clear field state
    setPlacedFielders([]);
    setThrowSequence([]);
    setBatterPosition(null);
    setBallLocation(null);

    // Clear modals
    setShowPlayTypeModal(false);
    setShowHitTypeModal(false);
    setShowOutTypeModal(false);
    setShowHRDistanceModal(false);
    setShowSpecialEventPrompt(false);
    setShowBallLandingPrompt(false);
    setShowHRLocationPrompt(false);

    // Clear classification state
    setClassificationResult(null);
    setPendingPrompts([]);
    setCurrentPromptIndex(0);
    setPendingBatterBase(null);
    setPendingPlayType(null);
    setPendingHRData(null);

    // Clear error-related state
    setPendingError(false);
    setAwaitingErrorFielder(false);
    setErrorFielder(null);
    setShowErrorTypePopup(false);

    // Clear star play state
    setShowStarPlayPopup(false);
    setIsStarPlayRobbery(false);

    // Clear BatterReachedPopup state
    setShowBatterReachedPopup(false);
    setBatterReachedBase(null);

    // Clear runner outcomes state
    setRunnerOutcomes(null);

    // Clear context (hides contextual buttons)
    setLastPlayContext(null);

    console.log('[startNextAtBat] Ready for new batter');
  }, []);

  // Determine ball marker type
  const ballMarkerType = batterPosition
    ? isInStands(batterPosition.y)
      ? 'hr'
      : 'hit'
    : 'hit';

  // Get border color for fielders - use primary team color for all fielders
  const getBorderColor = (_positionNumber: number) => {
    // All fielders use the primary team color (first color in the array)
    return fielderBorderColors[0];
  };

  return (
    <div className="flex flex-col w-full h-full" style={{ containerType: 'inline-size' }}>
      {/* GT-010: Field area fills available space while maintaining aspect ratio */}
      {/* Uses flex-1 to take remaining vertical space after buttons */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
        {/* Inner container maintains 16:9 aspect ratio (SVG is 1600x900) */}
        <div className="relative w-full h-full" style={{ maxWidth: '100%', aspectRatio: '16/9' }}>
          <FieldDropZone
          onFielderDrop={handleFielderDrop}
          onBatterDrop={handleBatterDrop}
          onBatterDragChange={setIsDraggingBatter}
        >
          <FieldCanvas
            showStands={true}
            shadeFoulTerritory={true}
            className="w-full h-full"
            zoomLevel={zoomLevel}
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
            name={currentBatterName}
            isDragged={batterPosition !== null}
            backgroundColor={batterBackgroundColor}
            borderColor={batterBorderColor}
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
          {/* Only show during normal play (not RUNNER_OUTCOMES phase) */}
          {onRunnerMove && getUIPhase() !== 'RUNNER_OUTCOMES' && (
            <RunnerDragDrop
              bases={gameSituation.bases}
              runnerNames={runnerNames}
              onRunnerMove={onRunnerMove}
            />
          )}

          {/* Runner Outcome Arrows - During RUNNER_OUTCOMES phase */}
          {/* Shows arrows for default outcomes, allows drag-to-adjust */}
          {getUIPhase() === 'RUNNER_OUTCOMES' && runnerOutcomes && (
            <RunnerOutcomeArrows
              outcomes={runnerOutcomes}
              onOutcomeChange={setRunnerOutcomes}
              bases={gameSituation.bases}
              isRunnerEvent={pendingRunnerEvent !== null}
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

        {/* NEW 5-STEP FLOW: Step 2 (HIT) - Click to set hit location */}
        {flowStep === 'HIT_LOCATION' && (
          <div
            className="absolute inset-0 z-40 cursor-crosshair"
            onClick={(e) => {
              const element = e.currentTarget;
              const rect = element.getBoundingClientRect();
              const relX = e.clientX - rect.left;
              const relY = e.clientY - rect.top;
              const svgX = (relX / rect.width) * SVG_WIDTH;
              const svgY = (relY / rect.height) * SVG_HEIGHT;
              const position = svgToNormalized(svgX, svgY);
              handleHitLocationClick(position);
            }}
            style={{ background: 'rgba(0, 100, 0, 0.2)' }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="bg-[#2E7D32] border-[4px] border-white px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] text-center">
                <div className="text-[14px] font-bold text-white mb-2">
                  ⚾ HIT
                </div>
                <div className="text-[11px] font-bold text-[#A5D6A7] animate-pulse">
                  👆 TAP WHERE THE BALL LANDED
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFlowStep('IDLE');
                setActiveAction(null);
              }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto
                         bg-[#666] border-[3px] border-white px-4 py-2 text-white text-[10px] font-bold
                         hover:bg-[#888] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              CANCEL
            </button>
          </div>
        )}

        {/* NEW 5-STEP FLOW: Step 2 (OUT) - Prompt for fielding sequence */}
        {flowStep === 'OUT_FIELDING' && placedFielders.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
            <div className="bg-[#C62828] border-[4px] border-white px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] text-center">
              <div className="text-[14px] font-bold text-white mb-2">
                🧤 OUT
              </div>
              <div className="text-[11px] font-bold text-[#FFCDD2] animate-pulse">
                DRAG FIELDER TO BALL LOCATION
              </div>
            </div>
          </div>
        )}

        {/* NEW 5-STEP FLOW: Advance button after fielding sequence complete (Step 2 OUT) */}
        {flowStep === 'OUT_FIELDING' && placedFielders.length > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 flex gap-2">
            <button
              onClick={() => {
                setFlowStep('IDLE');
                setActiveAction(null);
                setPlacedFielders([]);
                setThrowSequence([]);
                setBallLocation(null);
                setFadingBallPosition(null);
                setShowFadingBall(false);
              }}
              className="bg-[#666] border-[3px] border-white px-4 py-2 text-white text-[10px] font-bold
                         hover:bg-[#888] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]"
            >
              CANCEL
            </button>
            <button
              onClick={handleOutAdvance}
              className="bg-gradient-to-b from-[#C62828] to-[#B71C1C] border-[3px] border-[#C4A853]
                         px-6 py-2 text-white text-sm font-bold uppercase
                         hover:scale-105 active:scale-95 transition-transform
                         shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)]"
            >
              ADVANCE →
            </button>
          </div>
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

        {/* NEW: BatterReachedPopup - shows BEFORE HitTypeContent */}
        {/* Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md: */}
        {/* Batter drag → BatterReachedPopup → (conditional) → HitTypeContent */}
        {showBatterReachedPopup && batterReachedBase && (
          <BatterReachedPopup
            targetBase={batterReachedBase}
            gameState={{
              outs: gameSituation.outs,
              runners: {
                first: gameSituation.bases.first,
                second: gameSituation.bases.second,
                third: gameSituation.bases.third,
              },
            }}
            onSelect={handleBatterReachedSelect}
            onCancel={handleBatterReachedCancel}
          />
        )}

        {/* HR Distance Input Panel - used when hit location is in stands */}
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

        {/* ============================================ */}
        {/* THREE-ZONE FOUL TERRITORY BUTTON LAYOUT */}
        {/* ============================================ */}

        {/* LEFT FOUL ZONE: Action Selection (Step 1) */}
        <div className="absolute bottom-16 left-2 z-30">
          {flowStep === 'IDLE' && (
            <ActionSelector
              onHit={handleHitAction}
              onOut={handleOutAction}
              onStrikeout={handleStrikeout}
              onOtherAction={handleOtherAction}
              disabled={false}
              activeAction={activeAction}
            />
          )}
        </div>

        {/* RIGHT FOUL ZONE: Outcome Buttons (Step 3) or Special Event Buttons */}
        <div className="absolute bottom-16 right-2 z-30">
          {/* NEW 5-STEP FLOW: Show OutcomeButtons in HIT_OUTCOME or OUT_OUTCOME step */}
          {flowStep === 'HIT_OUTCOME' && (
            <OutcomeButtons
              mode="HIT"
              onAdvance={(outcome) => handleHitOutcome(outcome as HitOutcome)}
              onBack={handleOutcomeBack}
              fieldingContext={{
                isPitcherInvolved: placedFielders.some(pf => pf.fielder.positionNumber === 1),
              }}
              gameContext={{
                outs: gameSituation.outs,
                bases: gameSituation.bases,
              }}
            />
          )}
          {flowStep === 'OUT_OUTCOME' && (
            <OutcomeButtons
              mode="OUT"
              onAdvance={(outcome) => handleOutOutcome(outcome as OutOutcome)}
              onBack={handleOutcomeBack}
              fieldingContext={{
                isDoublePlay: placedFielders.length >= 3,
                isDeepOutfield: ballLocation && ballLocation.y > 0.8 ? true : undefined,
              }}
              gameContext={{
                outs: gameSituation.outs,
                bases: gameSituation.bases,
              }}
            />
          )}
        </div>

        {/* RESET BUTTON - Positioned below left foul zone (below OTHER button area) */}
        {flowStep !== 'IDLE' && (
          <div className="absolute bottom-2 left-2 z-30">
            <button
              onClick={handleReset}
              className="bg-[#333] border-[2px] border-[#C4A853] px-3 py-1.5 text-white text-[10px] font-bold
                         hover:bg-[#444] active:scale-95 transition-all
                         shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
            >
              ↩ RESET
            </button>
          </div>
        )}

        {/* RUNNER OUTCOMES HINT BANNER - Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md */}
        {/* Top center hint for user during RUNNER_OUTCOMES or RUNNER_CONFIRM phase */}
        {(getUIPhase() === 'RUNNER_OUTCOMES' || flowStep === 'RUNNER_CONFIRM') && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50
                          bg-black/80 px-4 py-2 rounded text-white text-xs
                          border border-[#C4A853]">
            <span className="text-[#C4A853] font-bold">RUNNER OUTCOMES</span>
            <span className="ml-2">Drag to adjust</span>
            <span className="mx-1">•</span>
            <span>Tap END AT-BAT when correct</span>
          </div>
        )}

        {/* RUNNER OUTCOMES DISPLAY - Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md */}
        {/* Shows calculated runner defaults in RUNNER_OUTCOMES or RUNNER_CONFIRM phase */}
        {/* User can adjust before tapping End At-Bat */}
        {(getUIPhase() === 'RUNNER_OUTCOMES' || flowStep === 'RUNNER_CONFIRM') && runnerOutcomes && (
          <div className="absolute top-16 right-4 z-40 max-w-xs">
            <RunnerOutcomesDisplay
              outcomes={runnerOutcomes}
              onOutcomeChange={setRunnerOutcomes}
              playType={pendingRunnerEvent || lastClassifiedPlay?.type || 'unknown'}
              isRunnerEvent={pendingRunnerEvent !== null}
            />
          </div>
        )}

        {/* END AT-BAT BUTTON - Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md */}
        {/* Visible in RUNNER_OUTCOMES or RUNNER_CONFIRM phase */}
        {/* ALWAYS shows - even if no runners on base */}
        {(getUIPhase() === 'RUNNER_OUTCOMES' || flowStep === 'RUNNER_CONFIRM') && (
          <button
            onClick={handleEndAtBat}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40
                       bg-gradient-to-b from-[#2E7D32] to-[#1B5E20]
                       border-3 border-[#C4A853] rounded-lg
                       px-8 py-3
                       text-[#E8F5E9] text-sm font-bold uppercase tracking-wide
                       hover:from-[#388E3C] hover:to-[#2E7D32]
                       active:scale-95 transition-all
                       shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
          >
            ✓ END AT-BAT
          </button>
        )}

        {/* LEGACY MODIFIERS_ACTIVE and CONTEXTUAL BUTTONS REMOVED */}
        {/* New 5-step flow handles modifiers in Step 3 (OutcomeButtons) */}
      </div>

      {/* Special Event Prompt Modal */}
      {showSpecialEventPrompt && pendingPrompts.length > 0 && (
        <SpecialEventPromptModal
          prompt={pendingPrompts[currentPromptIndex]}
          onAnswer={(confirmed) => {
            const currentPrompt = pendingPrompts[currentPromptIndex];
            console.log(
              `Special Event: ${currentPrompt.eventType} - ${confirmed ? 'YES' : 'NO'}`
            );

            // EXH-033 FIX: If user confirms KILLED_PITCHER or NUT_SHOT, show InjuryPrompt
            if (confirmed) {
              if (currentPrompt.eventType === 'KILLED_PITCHER') {
                // Close the prompt modal, show InjuryPrompt for KP
                setShowSpecialEventPrompt(false);
                setPendingInjuryPrompt('KP');
                // Record the special event
                if (onSpecialEvent) {
                  onSpecialEvent({
                    eventType: 'KILLED_PITCHER',
                    fielderPosition: lastPlayFirstFielder?.positionNumber,
                    fielderName: lastPlayFirstFielder?.name,
                  });
                }
                return; // Don't move to next prompt yet - InjuryPrompt will handle completion
              } else if (currentPrompt.eventType === 'NUT_SHOT') {
                // Close the prompt modal, show InjuryPrompt for NUT
                setShowSpecialEventPrompt(false);
                setPendingInjuryPrompt('NUT');
                // Record the special event
                if (onSpecialEvent) {
                  onSpecialEvent({
                    eventType: 'NUT_SHOT',
                    fielderPosition: lastPlayFirstFielder?.positionNumber,
                    fielderName: lastPlayFirstFielder?.name,
                  });
                }
                return; // Don't move to next prompt yet - InjuryPrompt will handle completion
              }
            }

            // Move to next prompt or finish
            if (currentPromptIndex < pendingPrompts.length - 1) {
              setCurrentPromptIndex(currentPromptIndex + 1);
            } else {
              setShowSpecialEventPrompt(false);
              // EXH-033 FIX: If we have a classified play waiting, transition to RUNNER_CONFIRM
              // instead of resetting (this happens when we came from handleOutOutcome)
              if (lastClassifiedPlay && runnerOutcomes) {
                setFlowStep('RUNNER_CONFIRM');
                console.log('[SpecialEventPrompt] Prompts done, transitioning to RUNNER_CONFIRM');
              } else {
                handleReset();
              }
            }
          }}
        />
      )}

      {/* InjuryPrompt - KP (Killed Pitcher) or NUT (Nut Shot) flow */}
      {/* Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md: Shows IMMEDIATELY when modifier tapped */}
      {pendingInjuryPrompt && (
        <InjuryPrompt
          type={pendingInjuryPrompt}
          pitcherName={playerNames[1] || 'Pitcher'}
          onComplete={handleInjuryPromptComplete}
          onCancel={handleInjuryPromptCancel}
        />
      )}

      {/* StarPlaySubtypePopup - WG (Web Gem) or ROB (Robbery) flow */}
      {/* Shows subtype options: DIVING, SLIDING, LEAPING, OVER_SHOULDER, RUNNING, WALL */}
      {showStarPlayPopup && lastClassifiedPlay?.fieldingSequence?.[0] && (
        <StarPlaySubtypePopup
          fielderName={playerNames[lastClassifiedPlay.fieldingSequence[0]] || 'Fielder'}
          fielderPosition={lastClassifiedPlay.fieldingSequence[0]}
          isRobbery={isStarPlayRobbery}
          onSelect={handleStarPlaySelect}
          onCancel={handleStarPlayCancel}
        />
      )}

      {/* ErrorTypePopup - Error attribution flow */}
      {/* User selects "E" → taps ball location → taps fielder → this popup */}
      {/* Error types: FIELDING, THROWING, MENTAL */}
      {showErrorTypePopup && errorFielder && (
        <ErrorTypePopup
          fielderName={errorFielder.name}
          fielderPosition={errorFielder.positionNumber}
          onSelect={handleErrorTypeSelect}
          onCancel={handleErrorTypeCancel}
        />
      )}
    </div>
  );
}

export default EnhancedInteractiveField;
