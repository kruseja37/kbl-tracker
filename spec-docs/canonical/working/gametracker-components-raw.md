# GameTracker UI Components - Raw Extraction

> Extracted: 2026-02-08
> Source: `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/`

---

## Table of Contents

1. [EnhancedInteractiveField.tsx](#1-enhancedinteractivefieldtsx)
2. [OutcomeButtons.tsx](#2-outcomebuttonstsx)
3. [FinalizeAdvanceFlow.tsx](#3-finalizeadvanceflowtsx)
4. [MiniScoreboard.tsx](#4-miniscoreboardtsx)
5. [SubstitutionModalBase.tsx](#5-substitutionmodalbasetsx)
6. [PitchingChangeModal.tsx](#6-pitchingchangemodaltsx)
7. [DefensiveSubModal.tsx](#7-defensivesubmodaltsx)
8. [PinchHitterModal.tsx](#8-pinchhittermodaltsx)
9. [Files Not Found / Search Results](#9-files-not-found)

---

## 1. EnhancedInteractiveField.tsx

**File**: `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/EnhancedInteractiveField.tsx`
**Lines**: 4,292

### Purpose

The primary interactive baseball field component for the GameTracker. Implements a drag-and-drop field visualization using a continuous coordinate system (0-1.4 for y including stands). Manages a 5-step UX flow for recording plays: (1) HIT/OUT/OTHER selection, (2) field location capture, (3) outcome selection, (4) runner confirmation, (5) end at-bat confirmation. Handles all play types including hits, outs, walks, HBP, stolen bases, errors, home runs, strikeouts, and special events (Web Gem, Robbery, TOOTBLAN, Killed Pitcher, Nut Shot). Enriches play data with advanced metrics (exit type, spray direction, leverage index, fame calculations) and adaptive learning through fielder inference.

### Exported Components and Types

```typescript
// Main component
export function EnhancedInteractiveField(props: EnhancedInteractiveFieldProps): JSX.Element

// Types
export type HitType = '1B' | '2B' | '3B' | 'HR';
export type OutType = 'GO' | 'FO' | 'LO' | 'PO' | 'FLO' | 'DP' | 'TP' | 'K' | 'KL' | 'FC' | 'SAC' | 'SF';
export type WalkType = 'BB' | 'IBB' | 'HBP';
export type HitTrajectory = 'ground' | 'line' | 'fly';
export type QuickResultType = 'BB' | 'IBB' | 'K' | 'KL' | 'HBP' | 'D3K';
export type SpecialEventType =
  | 'WEB_GEM' | 'ROBBERY' | 'TOOTBLAN' | 'KILLED_PITCHER' | 'NUT_SHOT'
  | 'BEAT_THROW' | 'BUNT' | 'STRIKEOUT' | 'STRIKEOUT_LOOKING'
  | 'DROPPED_3RD_STRIKE' | 'SEVEN_PLUS_PITCH_AB';

// Re-exports
export type { RunnerMoveData, BaseId } from './RunnerDragDrop';
```

### Props Interface

```typescript
export interface EnhancedInteractiveFieldProps {
  gameSituation: GameSituation;           // { outs, bases, inning, isTop }
  fieldPositions: FieldPosition[];         // Position data for all 9 fielders
  onPlayComplete: (playData: PlayData) => void;  // Main callback when play is finalized
  onSpecialEvent?: (event: SpecialEventData) => void;  // Fame events callback
  onRunnerMove?: (data: RunnerMoveData) => void;       // Single runner movement
  onBatchRunnerMove?: (                                 // Batch runner movements
    movements: Array<{ from: 'first' | 'second' | 'third'; to: 'second' | 'third' | 'home' | 'out'; outcome: 'safe' | 'out' }>,
    playType: string
  ) => void;
  fielderBorderColors?: [string, string];  // Team colors for fielder icons
  batterBackgroundColor?: string;          // Batting team primary color
  batterBorderColor?: string;              // Batting team secondary color
  playerNames?: Record<number, string>;    // Position number -> player name
  runnerNames?: { first?: string; second?: string; third?: string };
  currentBatterName?: string;              // Display name on batter icon
  zoomLevel?: number;                      // 0=full field, 1=max infield zoom
}
```

### PlayData Interface (output of onPlayComplete)

```typescript
export interface PlayData {
  type: 'hit' | 'out' | 'hr' | 'foul_out' | 'foul_ball' | 'error' | 'walk';
  hitType?: HitType;
  outType?: OutType;
  walkType?: WalkType;
  fieldingSequence: number[];        // Position numbers in order (e.g., [6, 4, 3])
  ballLocation?: FieldCoordinate;
  batterLocation?: FieldCoordinate;
  isFoul?: boolean;
  foulType?: string;
  hrDistance?: number;
  hrType?: string;
  spraySector?: string;
  errorType?: ErrorType;             // 'FIELDING' | 'THROWING' | 'MENTAL'
  errorFielder?: number;
  runnerOutcomes?: RunnerDefaults;   // User-adjusted runner positions
  // Advanced metrics (auto-inferred)
  exitType?: 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up';
  playDifficulty?: 'routine' | 'likely' | 'difficult' | 'impossible';
  sprayDirection?: 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right';
  inferredFielder?: number;
  wasOverridden?: boolean;
  inferenceConfidence?: number;
  dpType?: string;
  // Leverage & Fame context
  leverageIndex?: number;
  leverageCategory?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  gameSituation?: { inning, isTop, outs, bases, homeScore, awayScore };
  isClutchSituation?: boolean;
  playoffContext?: { isPlayoffs, round?, isEliminationGame?, isClinchGame? };
  fameValue?: number;
  fameEventType?: string;
}
```

### Key UI Logic: 5-Step Flow

```typescript
type FlowStep =
  | 'IDLE'              // Step 1: Waiting for HIT/OUT/OTHER selection
  | 'HIT_LOCATION'      // Step 2 (HIT): Waiting for field click
  | 'OUT_FIELDING'      // Step 2 (OUT): Waiting for fielder drag + sequence
  | 'HIT_OUTCOME'       // Step 3 (HIT): Showing hit outcome buttons
  | 'OUT_OUTCOME'       // Step 3 (OUT): Showing out outcome buttons
  | 'RUNNER_CONFIRM'    // Step 4: Confirming runner outcomes
  | 'END_CONFIRM';      // Step 5: End at-bat confirmation
```

### UIPhase Derivation (derived from state, not stored separately)

```typescript
type UIPhase =
  | 'AWAITING_INPUT'     // No drag in progress, no panels open
  | 'DRAGGING'           // Any drag in progress
  | 'TAP_SEQUENCE'       // Fielder dropped, building throw chain
  | 'CLASSIFYING'        // Any panel is open (hit/out/HR)
  | 'RUNNER_OUTCOMES'    // Play classified, adjusting runners
  | 'MODIFIERS_ACTIVE';  // Runners done, modifiers enabled
```

### Major State Variables

- `flowStep` - Current step in 5-step UX flow
- `activeAction` - Which primary action selected (HIT/OUT/OTHER)
- `placedFielders` - Fielders dropped on field with positions
- `throwSequence` - Ordered fielder chain (e.g., [SS, 2B, 1B])
- `batterPosition` / `ballLocation` - Coordinate data
- `lastClassifiedPlay` - PlayData waiting for End At-Bat to persist
- `runnerOutcomes` - Pre-calculated runner defaults (user adjustable)
- `pendingRunnerEvent` - SB/CS/PK/TBL (at-bat continues after these)
- `lastPlayContext` - For contextual button inference (auto-dismiss after 3s)
- `pendingInjuryPrompt` - 'KP' or 'NUT' (triggers InjuryPrompt)
- `showStarPlayPopup` / `isStarPlayRobbery` - Web Gem/Robbery subtype popup

### Key Handlers

| Handler | Trigger | Action |
|---------|---------|--------|
| `handleHitAction` | User taps HIT | flowStep -> HIT_LOCATION |
| `handleOutAction` | User taps OUT | flowStep -> OUT_FIELDING |
| `handleOtherAction(action)` | User taps BB/IBB/HBP/SB/CS/WP/PB/E | Routes to appropriate flow |
| `handleStrikeout(type)` | User taps K or KL | Creates play, sets runner defaults, -> RUNNER_CONFIRM |
| `handleHitLocationClick` | User taps field during HIT_LOCATION | Captures ball position, -> HIT_OUTCOME |
| `handleFielderDrop` | User drags fielder to field | Sets ball location, starts throw sequence |
| `handleFielderClick` | User taps fielder | Adds to throw sequence OR attributes error |
| `handleHitOutcome` | OutcomeButtons fires with hit outcome | Creates PlayData, calculates runner defaults |
| `handleOutOutcome` | OutcomeButtons fires with out outcome | Creates PlayData, runs classifier for prompts |
| `handleEndAtBat` | User taps END AT-BAT | Persists play via onPlayComplete, resets state |
| `handleQuickResult(type)` | BB/IBB/HBP/K/KL/D3K quick buttons | Creates PlayData with walk/out type |
| `handleQuickHomeRun` | User taps HR button | Shows HR location prompt overlay |
| `completePlay(playData)` | Internal - enriches and dispatches play | Adds inference, LI, fame, adaptive learning |
| `handleModifierTap(id)` | Modifier button tapped | Triggers injury/mojo/star play flows |
| `handleContextualEvent(type)` | Contextual special event button | Dispatches special event to parent |

### Contextual Button Inference

```typescript
function inferContextualButtons(ctx: PlayContext | null): SpecialEventType[] {
  // Always: SEVEN_PLUS_PITCH_AB
  // FO/LO + outfielder (7,8,9) + y > 0.9: ROBBERY + WEB_GEM
  // FO/LO + outfielder + y > 0.7: WEB_GEM
  // First fielder = 1 (pitcher): KILLED_PITCHER + NUT_SHOT
  // FO/LO/GO/FC: TOOTBLAN
  // 1B + y < 0.5: BEAT_THROW + BUNT
}
```

### Internal Sub-Components (not exported)

- `FieldDropZone` - Wraps field for react-dnd drop handling
- `BallLandingPromptOverlay` - "TAP WHERE BALL LANDED" overlay
- `HRLocationPromptOverlay` - "TAP WHERE BALL LEFT THE YARD" overlay
- `PlayTypeModal` - HIT/OUT/FOUL_OUT/FOUL_BALL selection
- `HitTypeModal` - Hit trajectory (GROUND/LINE/FLY) + base override
- `OutTypeModal` - Out type selection with suggestions based on throw sequence
- `HRDistanceModal` - HR distance input (300-550 ft)
- `SpecialEventPromptModal` - YES/NO prompt for detected events
- `LeftFoulButtons` - K, KL, BB, HBP, HR buttons (left foul territory)
- `RightFoulButtons` - Special event buttons (right foul territory)
- `BehindHomeButtons` - RESET, CLASSIFY, UNDO buttons
- `QuickButtons` (legacy) - Combined quick action buttons

### Data Flow

**Inputs:**
- `gameSituation` (outs, bases, inning, isTop) from parent GameTracker page
- `fieldPositions` - 9 fielder positions with names/numbers
- `playerNames` - Map of position numbers to player names
- `runnerNames` - Names on each base
- `currentBatterName` - Current batter display name

**Callbacks Fired:**
- `onPlayComplete(PlayData)` - When END AT-BAT is tapped (main data persistence)
- `onSpecialEvent(SpecialEventData)` - When fame events are confirmed
- `onRunnerMove(RunnerMoveData)` - Individual runner movements (WP/PB)
- `onBatchRunnerMove(movements[], playType)` - Batch runner moves (SB/CS/PK/TBL)

### Dependencies

- `react` (useState, useCallback, useEffect)
- `react-dnd` (useDrop)
- `./FieldCanvas` (FieldCanvas, coordinate utils, FIELDER_POSITIONS, SVG dims)
- `./FielderIcon` (FielderIcon, PlacedFielder, BatterIcon, BallLandingMarker, etc.)
- `./playClassifier` (classifyPlay, shouldAutoComplete)
- `./RunnerDragDrop` (RunnerDragDrop, RunnerMoveData, BaseId)
- `./SidePanel` (SidePanel, HitTypeContent, OutTypeContent, HRDistanceContent)
- `./BatterReachedPopup` (BatterReachedPopup, BatterReachedOption)
- `./ModifierButtonBar` (ModifierButtonBar, ModifierId)
- `./InjuryPrompt` (InjuryPrompt, InjuryResult, MojoResult)
- `./StarPlaySubtypePopup` (StarPlaySubtypePopup, StarPlaySubtype)
- `./ErrorTypePopup` (ErrorTypePopup, ErrorType)
- `./runnerDefaults` (calculateRunnerDefaults, calculateWalkDefaults, calculateFieldersChoiceDefaults, calculateD3KDefaults, calculateStolenBaseDefaults)
- `./RunnerOutcomesDisplay`
- `./RunnerOutcomeArrows`
- `./ActionSelector` (ActionSelector, PrimaryAction, OtherAction, StrikeoutType)
- `./fielderInference` (inferFielder, inferExitTypeFromResult, inferDirection, getSuggestedDPChain)
- `../engines/adaptiveLearningEngine` (recordFieldingEvent)
- `../../../engines/leverageCalculator` (calculateLeverageIndex, getLICategory, isClutchSituation)
- `../../../engines/fameEngine` (calculateFame)
- `./OutcomeButtons` (OutcomeButtons, HitOutcome, OutOutcome)

### User Interactions

1. **IDLE state**: User sees ActionSelector (left foul) with HIT, OUT, K/KL, and OTHER menu
2. **HIT flow**: Tap HIT -> tap field location -> OutcomeButtons (1B/2B/3B/HR + modifiers) -> runner outcomes display -> END AT-BAT
3. **OUT flow**: Tap OUT -> drag fielder to ball location -> tap other fielders for throw chain -> ADVANCE -> OutcomeButtons (GO/FO/LO/etc.) -> runner outcomes -> END AT-BAT
4. **K/KL flow**: Tap K or KL -> immediately shows runner outcomes -> END AT-BAT
5. **OTHER flow**: BB/IBB/HBP -> runner outcomes -> END AT-BAT; SB/CS/PK/TBL -> runner outcomes -> END AT-BAT (at-bat continues); WP/PB -> all runners advance (at-bat continues); E -> ball location -> tap fielder -> error type -> runner outcomes -> END AT-BAT
6. **HR flow**: Tap HR button -> tap outfield/stands location -> distance input -> runner outcomes -> END AT-BAT
7. **Special events**: Contextual buttons appear based on play context; prompts for KILLED_PITCHER/NUT_SHOT show InjuryPrompt; WEB_GEM/ROBBERY show StarPlaySubtypePopup

---

## 2. OutcomeButtons.tsx

**File**: `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/OutcomeButtons.tsx`
**Lines**: 479

### Purpose

Step 3 of the GameTracker flow. Shows outcome selection buttons based on whether HIT or OUT was selected in Step 1. Supports multi-select for modifiers and special events. Positioned in right foul corner per GAMETRACKER_UI_DESIGN.md.

### Exported Components and Types

```typescript
export function OutcomeButtons(props: OutcomeButtonsProps): JSX.Element
export default OutcomeButtons;

export type HitType = '1B' | '2B' | '3B' | 'HR';
export type OutType = 'GO' | 'FO' | 'LO' | 'PO' | 'FLO' | 'K' | 'KL' | 'DP' | 'TP' | 'FC' | 'E';
export type HitModifier = 'BUNT' | 'IS' | '7+';
export type OutModifier = 'SF' | 'SAC' | 'IFR' | 'RD' | 'E' | '7+';
export type SpecialEvent = 'KP' | 'NUT' | 'WEB';

export interface HitOutcome {
  type: HitType;
  modifiers: HitModifier[];
  specialEvents: SpecialEvent[];
}

export interface OutOutcome {
  type: OutType;
  modifiers: OutModifier[];
  specialEvents: SpecialEvent[];
}
```

### Props Interface

```typescript
export interface OutcomeButtonsProps {
  mode: 'HIT' | 'OUT';
  onAdvance: (outcome: HitOutcome | OutOutcome) => void;
  onBack: () => void;
  suggestedType?: HitType | OutType;
  fieldingContext?: {
    isPitcherInvolved?: boolean;   // Show KP/NUT options
    isDeepOutfield?: boolean;      // Show WEB option
    isDoublePlay?: boolean;        // Pre-select DP
  };
  gameContext?: {
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
  };
}
```

### Key UI Logic

**State:**
- `selectedType` - Primary type selected (1B/2B/GO/FO/etc.)
- `selectedModifiers` - Set of active modifiers (multi-select)
- `selectedSpecials` - Set of active special events (multi-select)

**Situational disable logic (per MAJ-10):**
- DP/TP disabled when no runners on base
- SAC disabled with 2 outs
- SF disabled without runner on third

**HIT mode layout:**
- Row: 1B, 2B, 3B, HR (type selection)
- Row: BUNT, IS, 7+ (modifiers)
- Row: KP, NUT (special events)
- Row: Back, Advance

**OUT mode layout:**
- Row 1: GO, FO, LO, PO, FLO
- Row 2: K, KL, DP, TP, FC, E
- Row: SF, SAC, IFR, RD, E, 7+ (modifiers)
- Row: WEB (special events)
- Row: Back, Advance

### Data Flow

**Input:** `mode`, `suggestedType`, `fieldingContext`, `gameContext`
**Output:** `onAdvance(HitOutcome | OutOutcome)`, `onBack()`

### Dependencies

- `react` (useState, useEffect)

---

## 3. FinalizeAdvanceFlow.tsx

**File**: `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/FinalizeAdvanceFlow.tsx`
**Lines**: 1,487

### Purpose

A multi-screen modal flow for advancing from one season to the next. Manages the offseason workflow including roster management (call-ups/send-downs), AI team processing, roster validation, transaction reports, season transition processing, chemistry rebalancing, spring training, and advance confirmation. This is a franchise management component, NOT a game-time component.

### Exported Components

```typescript
export function FinalizeAdvanceFlow(props: FinalizeAdvanceFlowProps): JSX.Element
```

### Props Interface

```typescript
interface FinalizeAdvanceFlowProps {
  onClose: () => void;
  onAdvanceComplete: () => void;
}
```

### Key UI Logic: Screen Flow

```typescript
type Screen =
  | "roster-management"        // MLB/Farm roster call-ups and send-downs
  | "ai-processing"           // AI auto-processes non-user teams
  | "validation"              // Validates all rosters (22 MLB + 10 Farm)
  | "transaction-report"      // Summary of all transactions
  | "season-transition"       // 7-step processing (archive, age, salary, mojo reset, etc.)
  | "chemistry-rebalancing"   // Shows chemistry changes per team
  | "spring-training"         // Player development projections
  | "advance-confirmation"    // Final checklist before advancing
  | "post-advance-welcome";   // Welcome to Season N+1
```

**Major state variables:**
- `currentScreen` - Which screen in the flow
- `selectedTeamId` - Which team is being viewed
- `teams` - Array of Team objects with MLB/Farm rosters
- `transactions` - Call-up/send-down/retirement records
- `processingStep` - Animation step counter for processing screens
- `expandedTeams` / `expandedChemistry` - UI expand/collapse state

**Key business logic:**
- `calculateRookieSalary(grade)` - Maps grade to salary (A+ = $1.5M, B = $1.2M, etc.)
- `calculateRetirementRisk(player)` - Based on age, years of service, salary, prior demotions, grade
- `isRosterValid(team)` - Must have exactly 22 MLB + 10 Farm
- `convertToLocalPlayer(offseasonPlayer)` - Converts real data to local format

### User Interactions

1. **Roster Management**: Select team, view MLB/Farm rosters, call up or send down players
2. **Call-Up Modal**: Shows player details, ceiling, salary, roster capacity check
3. **Send-Down Modal**: Shows retirement risk calculation, morale impact (-18), grade warnings
4. **AI Processing**: Animated progress bar showing AI team transactions
5. **Validation**: Shows pass/fail status for each team's roster
6. **Transaction Report**: Print/copy-able summary of all moves
7. **Season Transition**: 7-step animated processing (archive, age, salary, mojo, stats, rookie, service years)
8. **Chemistry Rebalancing**: Expandable per-team chemistry change factors
9. **Spring Training**: Delegates to `SpringTrainingFlow` component
10. **Advance Confirmation**: Checklist + SMB4 sync instructions + BEGIN SEASON button
11. **Post-Advance Welcome**: Rookies to watch, next steps

### Data Flow

**Input:** Reads from `useOffseasonData()` hook (real teams/players), falls back to MOCK_TEAMS
**Output:** `onAdvanceComplete()` when user completes the flow, `onClose()` to exit

### Dependencies

- `react` (useState, useMemo)
- `lucide-react` (X, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Trophy, BarChart3, etc.)
- `@/hooks/useOffseasonData` (useOffseasonData, OffseasonTeam, OffseasonPlayer)
- `./SpringTrainingFlow`

---

## 4. MiniScoreboard.tsx

**File**: `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/MiniScoreboard.tsx`
**Lines**: 100

### Purpose

A compact single-row scoreboard that maximizes field space. Shows away score, inning (top/bottom indicator), outs (colored dots), home score, and an expand button. Height is 40px compared to 240px for the full scoreboard. Sticks to the top of the viewport.

### Exported Components

```typescript
export const MiniScoreboard: React.FC<MiniScoreboardProps>
export default MiniScoreboard;
```

### Props Interface

```typescript
interface MiniScoreboardProps {
  awayTeamName: string;
  homeTeamName: string;
  awayRuns: number;
  homeRuns: number;
  inning: number;
  isTop: boolean;
  outs: number;
  onExpand: () => void;
}
```

### Key UI Logic

- Inning indicator: `isTop ? '▲' : '▼'`
- Outs display: 3 circular dots, filled red (#DC3545) if active, dark (#1a1a1a) if not
- Background: green-themed (#556B55) with blue banner (#85B5E5)
- Score boxes: dark green (#3d5240) with light text (#E8E8D8)
- Sticky positioned at top with z-10

### User Interactions

- View scores, inning, and outs at a glance
- Click EXPAND button to open full scoreboard

### Data Flow

**Input:** All props are display data from parent
**Output:** `onExpand()` callback to toggle to full scoreboard

### Dependencies

- `react`
- `lucide-react` (ChevronDown)

---

## 5. SubstitutionModalBase.tsx

**File**: `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/modals/SubstitutionModalBase.tsx`
**Lines**: 344

### Purpose

Shared base component and sub-components for all 6 substitution modal types. Provides consistent styling (green/gold SMB4 theme), layout structure, and reusable form elements. Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1.

### Exported Components

```typescript
// Modal wrapper
export function SubstitutionModalBase(props: SubstitutionModalBaseProps): JSX.Element | null

// Section container
export function ModalSection(props: SectionProps): JSX.Element

// Form elements
export function PlayerSelect(props: PlayerSelectProps): JSX.Element
export function PositionSelect(props: PositionSelectProps): JSX.Element
export function NumberInput(props: NumberInputProps): JSX.Element

// Button components
export function ModalButton(props: ModalButtonProps): JSX.Element
export function ModalActions(props: ModalActionsProps): JSX.Element

// Display components
export function RunnerDisplay(props: RunnerDisplayProps): JSX.Element
export function PitcherLineDisplay(props: PitcherLineDisplayProps): JSX.Element
```

### Props Interfaces

```typescript
interface SubstitutionModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;        // Default '🔄'
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';  // Default 'lg'
}

interface PlayerSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  players: Array<{ id: string; name: string; position?: string; number?: string }>;
  placeholder?: string;
  disabled?: boolean;
}

interface PitcherLineDisplayProps {
  label: string;
  stats: { ip: number; h: number; r: number; er: number; bb: number; k: number; hr?: number };
}

interface RunnerDisplayProps {
  runners: Array<{ base: '1B' | '2B' | '3B'; runnerId: string; runnerName: string; howReached?: string }>;
  title?: string;
}

interface ModalButtonProps {
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}
```

### Key Features

- Width classes: sm=max-w-sm, md=max-w-md, lg=max-w-lg, xl=max-w-2xl
- Button variants: primary (blue), secondary (green), danger (red)
- PitcherLineDisplay converts outs to IP display (e.g., 7 outs -> 2.1 IP)
- RunnerDisplay shows gold-highlighted base positions with how-reached info

### Dependencies

- `lucide-react` (X)
- `react` (ReactNode)

---

## 6. PitchingChangeModal.tsx

**File**: `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/modals/PitchingChangeModal.tsx`
**Lines**: 275

### Purpose

Handles pitching changes with bequeathed runner tracking. Shows outgoing pitcher's final line and pitch count, identifies inherited runners, and allows selection of incoming pitcher with role assignment (SP/RP/CL). Tracks bequeathed runners for proper ER attribution.

### Exported Components

```typescript
export function PitchingChangeModal(props: PitchingChangeModalProps): JSX.Element
```

### Props Interface

```typescript
interface PitchingChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<PitchingChangeEvent, 'gameId' | 'timestamp'>) => void;
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  currentPitcher: LineupPlayer | null;
  currentPitcherStats: PitcherLine;
  currentPitchCount: number;
  bases: Bases;                     // For building bequeathed runners
  availablePitchers: BenchPlayer[];
}
```

### Key UI Logic

- Builds `bequeathedRunners[]` from current `bases` state
- Shows outgoing pitcher name, position, pitch count, and full line (IP/H/R/ER/BB/K/HR)
- Incoming pitcher selection from bullpen list
- Role selection: SP, RP, CL (toggle buttons)
- Warning when runners will be inherited

### User Interactions

1. View outgoing pitcher's stats
2. See bequeathed runners warning
3. Select incoming pitcher from dropdown
4. Choose role (SP/RP/CL)
5. Confirm Change or Cancel

### Data Flow

**Input:** Current pitcher data, base state, available bullpen
**Output:** `onSubmit(PitchingChangeEvent)` with all pitcher change details

### Dependencies

- `react` (useState, useEffect)
- `./SubstitutionModalBase` (all shared components)
- `../../types/substitution` (PitchingChangeEvent, PitcherLine, BequeathedRunner, etc.)

---

## 7. DefensiveSubModal.tsx

**File**: `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/modals/DefensiveSubModal.tsx`
**Lines**: 345

### Purpose

Handles defensive substitutions with support for multiple substitutions in a single batch. Validates no position duplicates. Shows current lineup with preview of changes.

### Exported Components

```typescript
export function DefensiveSubModal(props: DefensiveSubModalProps): JSX.Element
```

### Props Interface

```typescript
interface DefensiveSubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<DefensiveSubEvent, 'gameId' | 'timestamp'>) => void;
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  lineup: LineupPlayer[];
  availableBench: BenchPlayer[];
}
```

### Key UI Logic

- Supports adding multiple substitutions before confirming
- Filters available bench players (excludes already-used players in batch)
- Filters lineup (excludes already-being-replaced players)
- Position conflict validation against remaining lineup + pending subs
- Auto-sets position to replaced player's position
- Preview of post-substitution lineup in grid format

### User Interactions

1. View pending substitutions (removable)
2. Select Player OUT from lineup
3. Select Player IN from bench
4. Choose defensive position
5. Add Substitution (can repeat)
6. Confirm N Substitutions or Cancel

### Dependencies

- `react` (useState, useEffect)
- `./SubstitutionModalBase` (all shared components)
- `../../types/substitution` (DefensiveSubEvent, DefensiveSub, BenchPlayer, LineupPlayer, Position)

---

## 8. PinchHitterModal.tsx

**File**: `/Users/johnkruse/.claude-worktrees/kbl-tracker/jolly-hertz/src/src_figma/app/components/modals/PinchHitterModal.tsx`
**Lines**: 287

### Purpose

Handles pinch hitter substitutions with opposing pitcher matchup information. Shows L/R matchup context, allows selection of player being replaced and replacement from bench, assigns defensive position for after the at-bat.

### Exported Components

```typescript
export function PinchHitterModal(props: PinchHitterModalProps): JSX.Element
```

### Props Interface

```typescript
interface PinchHitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Omit<PinchHitterEvent, 'gameId' | 'timestamp'>) => void;
  gameId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  lineup: LineupPlayer[];
  availableBench: BenchPlayer[];
  opposingPitcher?: { name: string; throws: 'L' | 'R' };
  defaultReplacedPlayerId?: string;    // Pre-select current batter
}
```

### Key UI Logic

- Shows opposing pitcher name and throws (L/R) with color coding
- Filters bench to position players only (excludes pitchers)
- Displays pinch hitter's batter hand (L/R/Switch) with color coding
- Auto-sets fielding position to replaced player's position
- Pre-selects replaced player from `defaultReplacedPlayerId`

### User Interactions

1. View opposing pitcher matchup info
2. Select player to replace (pre-filled if provided)
3. Select pinch hitter from bench (position players only)
4. View batter hand matchup
5. Assign defensive position after AB
6. Confirm or Cancel

### Dependencies

- `react` (useState, useEffect)
- `./SubstitutionModalBase` (all shared components)
- `../../types/substitution` (PinchHitterEvent, BenchPlayer, LineupPlayer, Position)

---

## 9. Files Not Found / Search Results

### Files That Do NOT Exist

| Requested File | Result |
|----------------|--------|
| `PitchCountPrompt.tsx` | Not found. No *itch*ount*.tsx files exist. Pitch count is tracked within PitchingChangeModal via `currentPitchCount` prop. |
| `GameEventButtons.tsx` | Not found. Functionality split across: `ActionSelector.tsx` (HIT/OUT/OTHER), `LeftFoulButtons` (BB/K/HBP/HR), `RightFoulButtons` (special events), all within EnhancedInteractiveField.tsx. |
| `Scoreboard.tsx` | Not found as standalone. `MiniScoreboard.tsx` found. Full scoreboard likely in a different component or page file. |
| `SubstitutionModal.tsx` | Not found as monolith. Split into 6+ modals in `modals/` directory. |

### Additional Modal Files Found (Not Read in Full)

| File | Purpose |
|------|---------|
| `modals/DoubleSwitchModal.tsx` | Double switch (pitcher + position swap) |
| `modals/ErrorOnAdvanceModal.tsx` | Error during runner advancement |
| `modals/FielderCreditModal.tsx` | Credit fielder for specific plays |
| `modals/PinchRunnerModal.tsx` | Pinch runner substitution |
| `modals/PositionSwitchModal.tsx` | Position swap between existing players |

### Additional Related Components Found (Not Read in Full)

| File | Purpose |
|------|---------|
| `FieldCanvas.tsx` | SVG baseball field rendering, coordinate system |
| `FielderIcon.tsx` | Draggable fielder icons, batter icon, ball markers |
| `RunnerDragDrop.tsx` | Draggable baserunner components with safe/out zones |
| `RunnerOutcomeArrows.tsx` | Visual arrows showing runner default outcomes |
| `RunnerOutcomesDisplay.tsx` | Text display of runner outcomes with adjustment controls |
| `DragDropFieldDemo.tsx` | Demo/test component for drag-drop system |
| `StarPlaySubtypePopup.tsx` | Web Gem/Robbery subtype selection (DIVING, SLIDING, etc.) |
| `AddGameModal.tsx` | Add new game to schedule |

---

## Cross-Component Data Flow Summary

```
GameTracker.tsx (page)
  |
  ├── MiniScoreboard (display: scores, inning, outs)
  |     └── onExpand → toggles to full scoreboard
  |
  ├── EnhancedInteractiveField (main interaction)
  |     ├── ActionSelector (Step 1: HIT/OUT/K/OTHER)
  |     ├── OutcomeButtons (Step 3: type + modifiers + specials)
  |     ├── RunnerOutcomesDisplay (Step 4: runner defaults)
  |     ├── RunnerOutcomeArrows (Step 4: visual arrows on field)
  |     ├── BatterReachedPopup → BallLandingPrompt → HitTypeModal
  |     ├── InjuryPrompt (KP/NUT flow)
  |     ├── StarPlaySubtypePopup (WG/ROB flow)
  |     ├── ErrorTypePopup (Error flow)
  |     ├── SpecialEventPromptModal (auto-detected events)
  |     |
  |     ├── onPlayComplete(PlayData) → parent persists to storage
  |     ├── onSpecialEvent(SpecialEventData) → parent records fame
  |     ├── onRunnerMove(RunnerMoveData) → parent updates bases
  |     └── onBatchRunnerMove(movements, playType) → parent batch updates
  |
  ├── Substitution Modals (triggered from game menu)
  |     ├── PitchingChangeModal → onSubmit(PitchingChangeEvent)
  |     ├── DefensiveSubModal → onSubmit(DefensiveSubEvent)
  |     ├── PinchHitterModal → onSubmit(PinchHitterEvent)
  |     ├── PinchRunnerModal → onSubmit(PinchRunnerEvent)
  |     ├── DoubleSwitchModal → onSubmit(DoubleSwitchEvent)
  |     └── PositionSwitchModal → onSubmit(PositionSwitchEvent)
  |
  └── FinalizeAdvanceFlow (franchise management, end-of-season)
        └── onAdvanceComplete() → parent transitions to next season
```
