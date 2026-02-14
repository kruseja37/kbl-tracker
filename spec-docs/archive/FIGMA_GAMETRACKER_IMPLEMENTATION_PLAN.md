# Figma GameTracker Implementation Plan

> **Created**: 2026-02-02
> **Purpose**: Close all gaps between legacy GameTracker and Figma implementation
> **Reference**: LEGACY_VS_FIGMA_AUDIT.md

---

## Executive Summary

| Phase | Focus | Tasks | Est. Effort |
|-------|-------|-------|-------------|
| **Phase 1** | Core Game Mechanics | Substitutions, Save/BS detection, ER tracking | 3-4 days |
| **Phase 2** | WAR Integration | Connect all 5 WAR calculators | 2-3 days |
| **Phase 3** | Detection Functions | Port 13 missing auto-detect functions | 2 days |
| **Phase 4** | Fame System Complete | 130+ event types, auto-detection | 2-3 days |
| **Phase 5** | Player State Systems | Mojo, Fitness, Clutch | 2 days |
| **Phase 6** | Enhanced Fielding | D3K, DP roles, error context | 1-2 days |
| **Phase 7** | UI Components | Modals, displays, notifications | 3-4 days |
| **Phase 8** | Polish & Analytics | Beat reporter, fan morale, relationships | 2-3 days |

**Total Estimated Effort: 17-23 days**

---

## Phase 1: Core Game Mechanics (HIGH PRIORITY)

### 1.1 Substitution System

**Goal**: Enable all substitution types with proper tracking

#### Files to Create:
```
src/src_figma/app/components/
├── PitchingChangeModal.tsx      # Pitcher sub with bequeathed runners
├── PinchHitterModal.tsx         # PH with lineup slot tracking
├── PinchRunnerModal.tsx         # PR with ER inheritance
├── DefensiveSubModal.tsx        # Multi-player defensive sub
├── DoubleSwitchModal.tsx        # Pitcher + position player swap
└── PositionSwitchModal.tsx      # Position swap without roster change
```

#### Types to Add (in types or PlayData):
```typescript
interface SubstitutionEvent {
  type: 'PITCH_CHANGE' | 'PINCH_HIT' | 'PINCH_RUN' | 'DEF_SUB' | 'DOUBLE_SWITCH' | 'POS_SWITCH';
  inning: number;
  outs: number;
  playerOut: string;
  playerIn: string;
  position: Position;
  // For pitching changes
  bequeathedRunners?: {
    first?: { playerId: string; howReached: HowReached };
    second?: { playerId: string; howReached: HowReached };
    third?: { playerId: string; howReached: HowReached };
  };
  // For pinch runners
  inheritedFrom?: {
    runnerId: string;
    howReached: HowReached;
    responsiblePitcher: string;
  };
}

type HowReached = 'hit' | 'walk' | 'HBP' | 'error' | 'FC' | 'inherited';
```

#### Integration Points:
- Add "Substitution" button to ActionSelector
- Track substitutions in game state
- Connect to LineupPanel for live updates

### 1.2 Save/Blown Save Detection

**Goal**: Auto-detect save opportunities and blown saves

#### File to Create:
```
src/src_figma/app/engines/saveDetector.ts
```

#### Functions:
```typescript
// From legacy detectionFunctions.ts
export function isSaveOpportunity(context: GameContext): boolean {
  // Conditions: ≤3 run lead, 7th inning+, tying run on/at bat
}

export function detectBlownSave(
  appearance: PitcherAppearance,
  context: GameContext
): { blown: boolean; loss: boolean } {
  // Track when save opp becomes tied/loss
}
```

#### Integration:
- Call on every run scored
- Connect to PitcherAppearance tracking
- Update pitcher stats (SV, BS, BSL)

### 1.3 Inherited/Bequeathed Runner Tracking

**Goal**: Proper ER attribution across pitching changes

#### Extend PlayData:
```typescript
interface RunnerState {
  playerId: string;
  base: 'first' | 'second' | 'third';
  howReached: HowReached;
  responsiblePitcher: string;  // NEW: Who gets ER if scores
  inheritedFrom?: string;      // NEW: Previous pitcher if inherited
}
```

#### Logic:
- When pitcher changes, mark current runners as "bequeathed"
- When runner scores, credit ER to `responsiblePitcher`
- When pinch runner enters, track `inheritedFrom`

### 1.4 D3K Full Tracking

**Goal**: Complete dropped 3rd strike outcome tracking

#### Extend PlayData:
```typescript
type D3KOutcome = 'OUT' | 'WP' | 'PB' | 'E_CATCHER' | 'E_1B';

interface PlayData {
  // ... existing
  d3kEvent?: boolean;
  d3kOutcome?: D3KOutcome;
  d3kRunnersAdvanced?: number;  // How many bases runner(s) gained
}
```

#### UI:
- When D3K detected, show outcome selector popup
- Track WP/PB for pitcher/catcher stats
- Track error for fielding stats

---

## Phase 2: WAR Integration (HIGH PRIORITY)

### 2.1 Connect Existing WAR Calculators

**Goal**: Wire existing engines to Figma data flow

#### Files to Modify:
```
src/src_figma/app/hooks/
├── useWARCalculations.ts      # CREATE - Main WAR hook
└── useGameStats.ts            # MODIFY - Add WAR triggers
```

#### Import from Legacy:
```typescript
// Already exist in src/engines/
import { calculateBWAR } from '../../../engines/bwarCalculator';
import { calculatePWAR } from '../../../engines/pwarCalculator';
import { calculateFWAR } from '../../../engines/fwarCalculator';
import { calculateRWAR } from '../../../engines/rwarCalculator';
import { calculateMWAR } from '../../../engines/mwarCalculator';
```

#### Hook Interface:
```typescript
export function useWARCalculations(playerId: string, seasonId: string) {
  return {
    bWAR: number;
    pWAR: number;
    fWAR: number;
    rWAR: number;
    mWAR: number;  // Manager only
    totalWAR: number;
    breakdown: WARBreakdown;
  };
}
```

#### Integration Points:
- Calculate after each at-bat (bWAR, rWAR)
- Calculate after each pitcher appearance (pWAR)
- Calculate after each fielding play (fWAR)
- Aggregate at game end

### 2.2 WAR Display Component

**Goal**: Show WAR breakdown in UI

#### File to Create:
```
src/src_figma/app/components/WARDisplay.tsx
```

#### Features:
- Total WAR with breakdown bars (bWAR, pWAR, fWAR, rWAR)
- Comparison to league average
- Season/career toggle

---

## Phase 3: Detection Functions (MEDIUM PRIORITY)

### 3.1 Port Missing Auto-Detection

**Goal**: Port 13 missing detection functions from legacy

#### File to Create:
```
src/src_figma/app/engines/detectionFunctions.ts
```

#### Functions to Port (from legacy):
```typescript
// Game Situation Detection
export function detectBlownSave(context, appearance);      // HIGH
export function isSaveOpportunity(context);                // HIGH
export function detectTriplePlay(playData, context);       // MEDIUM
export function detectHitIntoTriplePlay(playData);         // MEDIUM
export function detectEscapeArtist(context);               // MEDIUM

// Error Classification
export function detectDroppedFly(playData, context);       // MEDIUM
export function detectBootedGrounder(playData);            // MEDIUM
export function detectWrongBaseThrow(playData);            // MEDIUM
export function detectPassedBallRun(playData, context);    // MEDIUM

// Clutch Events
export function detectWalkedInRun(playData, context);      // MEDIUM
export function detectClutchGrandSlam(playData, context);  // MEDIUM
export function detectThrowOutAtHome(playData);            // MEDIUM

// Rally Events
export function detectRallyStarter(gameState);             // LOW
export function detectRallyKiller(playData, context);      // LOW
export function detectIBBStrikeout(playData, prevPlay);    // LOW

// Special Cases
export function detectPickedOff(playData, context);        // LOW
export function detectPositionPlayerPitching(appearance);  // LOW
```

#### Integration:
- Call after each play in `completePlay()`
- Connect to Fame system for event triggers
- Show prompts for user-confirmation events

### 3.2 Add Inside-the-Park HR Prompt

**Goal**: Add missing IPHR detection

#### Logic:
```typescript
// In playClassifier.ts or detectionFunctions.ts
export function promptInsideParkHR(playData: PlayData, context: GameContext): boolean {
  // HR where ball never left the park
  // Infer from: HR result + no stands zone + high y-value
  return playData.hitType === 'HR' &&
         !playData.ballLocation?.y > 1.0 &&
         playData.fieldingSequence.length > 0;
}
```

#### UI:
- Add "Inside-the-Park" option to HR confirmation
- Different Fame value (+2.5 vs +1.0 for regular HR)

---

## Phase 4: Fame System Complete (MEDIUM PRIORITY)

### 4.1 Add Missing Fame Event Types

**Goal**: Reference all 150+ Fame event types

#### Current State:
- Figma references ~20 events
- Legacy has 150+ in `FAME_VALUES` constant

#### Approach:
1. All events already defined in `src/types/game.ts` (FAME_VALUES)
2. Need to ADD DETECTION for each event type

#### Create Detection Hook:
```
src/src_figma/app/hooks/useFameDetection.ts
```

```typescript
export function useFameDetection(playData: PlayData, gameState: GameState) {
  // Auto-detect fame events after each play
  const fameEvents: FameEvent[] = [];

  // Walk-off detection
  if (isWalkOff(playData, gameState)) {
    if (playData.hitType === 'HR') {
      if (isBatterLoadedGrandSlam(playData)) {
        fameEvents.push({ type: 'WALK_OFF_GRAND_SLAM', value: 3.0 });
      } else {
        fameEvents.push({ type: 'WALK_OFF_HR', value: 2.0 });
      }
    } else {
      fameEvents.push({ type: 'WALK_OFF', value: 1.5 });
    }
  }

  // Continue for all 150+ event types...
  return fameEvents;
}
```

### 4.2 Fame Event Categories

#### Positive Events (implement in priority order):
1. **Walk-off events** (3): WALK_OFF, WALK_OFF_HR, WALK_OFF_GRAND_SLAM
2. **Multi-HR** (6): MULTI_HR_2/3/4, BACK_TO_BACK, B2B2B
3. **Cycle** (2): CYCLE, NATURAL_CYCLE
4. **Pitching excellence** (10): NO_HITTER, PERFECT_GAME, MADDUX, etc.
5. **Defensive gems** (3): TRIPLE_PLAY, UNASSISTED_TP, THROW_OUT_AT_HOME
6. **Career milestones** (20+): All tier-based achievements

#### Negative Events (implement in priority order):
1. **Strikeout shame** (5): HAT_TRICK through TITANIUM_SOMBRERO
2. **Blown saves** (3): BLOWN_SAVE, BLOWN_SAVE_LOSS, BLOWN_LEAD
3. **Meltdowns** (3): MELTDOWN, MELTDOWN_SEVERE, FIRST_INNING_DISASTER
4. **Fielding** (5): DROPPED_FLY, BOOTED_GROUNDER, etc.

### 4.3 Fame Toast Notifications

**Goal**: Show Fame events as they happen

#### File to Create:
```
src/src_figma/app/components/FameEventToast.tsx
```

#### Features:
- Pop-up notification with event type and value
- LI-weighted display (+X Fame × √LI)
- Auto-dismiss after 3 seconds

---

## Phase 5: Player State Systems (MEDIUM PRIORITY)

### 5.1 Connect Mojo Engine

**Goal**: Track player confidence/momentum

#### Import from Legacy:
```typescript
import {
  calculateMojoChange,
  getMojoMultiplier,
  MOJO_LEVELS
} from '../../../engines/mojoEngine';
```

#### Hook to Create:
```
src/src_figma/app/hooks/useMojoState.ts
```

```typescript
export function useMojoState(playerId: string) {
  const [mojo, setMojo] = useState<MojoLevel>('NORMAL');

  const updateMojo = (event: PlayData) => {
    const change = calculateMojoChange(event, currentMojo);
    setMojo(applyMojoChange(currentMojo, change));
  };

  return {
    mojo,
    multiplier: getMojoMultiplier(mojo),
    display: getMojoDisplay(mojo),  // { color, label, emoji }
    updateMojo,
  };
}
```

#### Integration:
- Update after each at-bat result
- Show mojo indicator next to player name
- Apply multiplier to stat displays

### 5.2 Connect Fitness Engine

**Goal**: Track player physical condition

#### Import from Legacy:
```typescript
import {
  calculateFitnessDecay,
  getFitnessMultiplier,
  FITNESS_STATES
} from '../../../engines/fitnessEngine';
```

#### Hook to Create:
```
src/src_figma/app/hooks/useFitnessState.ts
```

### 5.3 Connect Clutch Calculator

**Goal**: Multi-participant clutch attribution

#### Import from Legacy:
```typescript
import {
  calculateClutchValue,
  attributeClutchPoints
} from '../../../engines/clutchCalculator';
```

---

## Phase 6: Enhanced Fielding (LOWER PRIORITY)

### 6.1 DP Role Attribution

**Goal**: Track who started/turned/completed DP

#### Extend PlayData:
```typescript
interface DPAttribution {
  started: number;     // Position who fielded
  turned: number;      // Position who pivoted
  completed: number;   // Position who got final out
  unassisted?: boolean;
}
```

#### Logic:
- Parse from `fieldingSequence` array
- Classic DPs: 6-4-3 → started=6, turned=4, completed=3

### 6.2 Error Context Tracking

**Goal**: Classify error difficulty and impact

#### Extend PlayData:
```typescript
interface ErrorContext {
  type: 'fielding' | 'throwing' | 'mental';
  difficulty: 'routine' | 'difficult' | 'impossible';
  allowedRun: boolean;
  allowedWinningRun: boolean;
}
```

### 6.3 Assist Chain Tracking

**Goal**: Track multi-level relay throws

#### Extend PlayData:
```typescript
interface AssistEntry {
  position: number;
  type: 'direct' | 'relay' | 'cutoff';
  throwStrength?: 'weak' | 'strong' | 'perfect';
}

interface PlayData {
  assistChain?: AssistEntry[];
}
```

---

## Phase 7: UI Components (LOWER PRIORITY)

### 7.1 Missing Modals

| Component | Purpose | Effort |
|-----------|---------|--------|
| GameSetupModal.tsx | Initialize new game | MEDIUM |
| InningEndSummary.tsx | End-of-inning recap | LOW |
| FameEventModal.tsx | Fame event confirmation | LOW |
| WalkoffCelebration.tsx | Walk-off animation | LOW |

### 7.2 Display Components

| Component | Purpose | Effort |
|-----------|---------|--------|
| WARDisplay.tsx | WAR breakdown visualization | MEDIUM |
| FameDisplay.tsx | Fame/reputation tracking | MEDIUM |
| CareerDisplay.tsx | Career stats view | MEDIUM |
| SeasonLeaderboards.tsx | Season leaders | MEDIUM |
| SeasonSummary.tsx | Season recap | MEDIUM |

### 7.3 Notification Components

| Component | Purpose | Effort |
|-----------|---------|--------|
| FameEventToast.tsx | Fame notification popup | LOW |
| MilestoneToast.tsx | Career milestone notification | LOW |

---

## Phase 8: Polish & Analytics (LOWEST PRIORITY)

### 8.1 Beat Reporter System

**Goal**: Personality-driven narrative generation

#### Import from Legacy:
```typescript
import {
  generateNarrative,
  REPORTER_PERSONALITIES
} from '../../../engines/narrativeEngine';
```

### 8.2 Fan Morale System

**Goal**: Track fan sentiment

#### Import from Legacy:
```typescript
import {
  calculateMoraleDrift,
  FAN_STATES
} from '../../../engines/fanMoraleEngine';
```

### 8.3 Relationship Engine

**Goal**: Track player/team dynamics

#### Import from Legacy:
```typescript
import {
  updateRelationship,
  getRelationshipModifier
} from '../../../engines/relationshipEngine';
```

---

## Implementation Order

### Sprint 1 (Days 1-4): Core Mechanics
- [ ] 1.1 Substitution System (modals)
- [ ] 1.2 Save/Blown Save Detection
- [ ] 1.3 ER Tracking (inherited/bequeathed)
- [ ] 1.4 D3K Full Tracking

### Sprint 2 (Days 5-7): WAR Integration
- [ ] 2.1 Connect WAR calculators
- [ ] 2.2 WAR Display component
- [ ] 2.3 Integrate with game flow

### Sprint 3 (Days 8-10): Detection & Fame
- [ ] 3.1 Port detection functions
- [ ] 4.1 Fame event detection hook
- [ ] 4.2 Fame toast notifications

### Sprint 4 (Days 11-13): Player State
- [ ] 5.1 Mojo Engine integration
- [ ] 5.2 Fitness Engine integration
- [ ] 5.3 Clutch Calculator integration

### Sprint 5 (Days 14-17): Enhanced Fielding & UI
- [ ] 6.1-6.3 Enhanced fielding data
- [ ] 7.1-7.3 Missing UI components

### Sprint 6 (Days 18-20): Polish
- [ ] 8.1 Beat Reporter
- [ ] 8.2 Fan Morale
- [ ] 8.3 Relationships

---

## Verification Protocol

### For Each Task:

```
VERIFICATION CHECKLIST:

BUILD:
□ `npm run build` → Exit code 0
□ `npm test` → All tests pass

DATA FLOW (file:line for each):
□ UI INPUT: ___
□ STORAGE: ___
□ ENGINE: ___
□ DISPLAY: ___

EXTERNAL:
□ Browser test / screenshot
□ IndexedDB verification
□ Console output check

STATUS: [ VERIFIED | UNVERIFIED ]
```

---

## Files Summary

### New Files to Create:
```
src/src_figma/app/
├── components/
│   ├── PitchingChangeModal.tsx
│   ├── PinchHitterModal.tsx
│   ├── PinchRunnerModal.tsx
│   ├── DefensiveSubModal.tsx
│   ├── DoubleSwitchModal.tsx
│   ├── PositionSwitchModal.tsx
│   ├── WARDisplay.tsx
│   ├── FameEventToast.tsx
│   ├── InningEndSummary.tsx
│   └── GameSetupModal.tsx
├── engines/
│   ├── detectionFunctions.ts
│   └── saveDetector.ts
└── hooks/
    ├── useWARCalculations.ts
    ├── useFameDetection.ts
    ├── useMojoState.ts
    ├── useFitnessState.ts
    └── useClutchCalculations.ts
```

### Files to Modify:
```
src/src_figma/app/components/
├── EnhancedInteractiveField.tsx   # Add new PlayData fields
├── ActionSelector.tsx              # Add substitution option
├── playClassifier.ts              # Add detection triggers
└── runnerDefaults.ts              # Add ER tracking
```

---

## Success Criteria

### Phase 1 Complete When:
- [ ] All 6 substitution types work
- [ ] Save opportunities detected automatically
- [ ] Blown saves tracked with SV/BS/BSL stats
- [ ] ER attributed to correct pitcher
- [ ] D3K outcomes fully tracked

### Phase 2 Complete When:
- [ ] All 5 WAR types calculate correctly
- [ ] WAR updates after each relevant play
- [ ] WAR Display shows breakdown

### Full Implementation Complete When:
- [ ] All 150+ Fame events detectable
- [ ] Mojo/Fitness affect gameplay
- [ ] No orphaned engines remain
- [ ] All legacy features ported or documented as intentionally excluded

---

**Last Updated:** 2026-02-02
**Owner:** [TBD]
**Review Cadence:** After each sprint
