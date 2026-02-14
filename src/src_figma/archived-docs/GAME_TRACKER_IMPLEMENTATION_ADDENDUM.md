# GameTracker Implementation Addendum

> **Purpose**: Resolve all ambiguities from the main Implementation Guide
> **Version**: 1.0
> **Created**: 2026-02-01
> **Status**: REQUIRED READING before implementation

---

## Table of Contents

1. [Canonical File Declaration](#canonical-file-declaration)
2. [State Integration Strategy](#state-integration-strategy)
3. [The Play Lifecycle](#the-play-lifecycle)
4. [Wireframes](#wireframes)
5. [Batter Reaches Base Flow](#batter-reaches-base-flow)
6. [Classify Play Edge Cases](#classify-play-edge-cases)
7. [End At-Bat Exact Timing](#end-at-bat-exact-timing)
8. [Modifier Button Rules (Resolved)](#modifier-button-rules-resolved)
9. [KP/NUT Exact Timing](#kpnut-exact-timing)
10. [Runner Outcome Visuals](#runner-outcome-visuals)
11. [Error Handling](#error-handling)
12. [D3K Implementation Location](#d3k-implementation-location)
13. [Data Persistence Moment](#data-persistence-moment)
14. [Undo Integration](#undo-integration)

---

## Canonical File Declaration

> **CRITICAL**: Only modify these files. Ignore others.

| Purpose | Canonical File | DO NOT MODIFY |
|---------|----------------|---------------|
| Main GameTracker | `EnhancedInteractiveField.tsx` | ~~DragDropGameTracker.tsx~~ |
| Field rendering | `FieldCanvas.tsx` | - |
| Play classification | `playClassifier.ts` | - |
| Runner drag-drop | `RunnerDragDrop.tsx` | - |
| Side panels | `SidePanel.tsx` | - |
| Fielder icons | `FielderIcon.tsx` | - |

**`DragDropGameTracker.tsx` is DEAD CODE. Do not read it, do not modify it, do not reference it.**

---

## State Integration Strategy

### DO NOT create a parallel state machine

The existing code uses these useState calls (in EnhancedInteractiveField.tsx):

```typescript
// EXISTING - DO NOT DUPLICATE
const [placedFielders, setPlacedFielders] = useState<PlacedFielderData[]>([]);
const [throwSequence, setThrowSequence] = useState<number[]>([]);
const [showHitPanel, setShowHitPanel] = useState(false);
const [showOutPanel, setShowOutPanel] = useState(false);
const [showHRPanel, setShowHRPanel] = useState(false);
const [ballLocation, setBallLocation] = useState<FieldCoordinate | null>(null);
const [lastPlayContext, setLastPlayContext] = useState<PlayContext | null>(null);
// ... more
```

### DO add a single derived state variable

```typescript
// ADD THIS - derives from existing state, does not duplicate
type UIPhase =
  | 'AWAITING_INPUT'      // No drag in progress, no panels open
  | 'DRAGGING'            // Any drag in progress
  | 'TAP_SEQUENCE'        // Fielder dropped, building throw chain
  | 'CLASSIFYING'         // Any panel is open (hit/out/HR)
  | 'RUNNER_OUTCOMES'     // Play classified, adjusting runners
  | 'MODIFIERS_ACTIVE';   // Runners done, modifiers enabled

// Derive from existing state - DO NOT store separately
function getUIPhase(): UIPhase {
  if (showHitPanel || showOutPanel || showHRPanel) return 'CLASSIFYING';
  if (placedFielders.length > 0 && !lastClassifiedPlay) return 'TAP_SEQUENCE';
  if (lastClassifiedPlay && !playCommitted) return 'RUNNER_OUTCOMES';
  if (playCommitted && !atBatComplete) return 'MODIFIERS_ACTIVE';
  return 'AWAITING_INPUT';
}
```

### New state variables to ADD (not replace)

```typescript
// ADD these new variables
const [lastClassifiedPlay, setLastClassifiedPlay] = useState<PlayData | null>(null);
const [playCommitted, setPlayCommitted] = useState(false);
const [atBatComplete, setAtBatComplete] = useState(false);
const [activeModifiers, setActiveModifiers] = useState<Set<string>>(new Set());
const [pendingInjuryPrompt, setPendingInjuryPrompt] = useState<'KP' | 'NUT' | null>(null);
```

---

## The Play Lifecycle

### Explicit Timeline

```
TIME →

1. AWAITING_INPUT
   ├─ User can: drag batter, drag fielder, tap K/Ꝅ
   └─ Visible: K/Ꝅ buttons, field, batter, fielders

2. USER ACTION (one of three paths)

   PATH A: Strikeout
   ├─ User taps [K] or [Ꝅ]
   ├─ IMMEDIATELY: Create play record with type='strikeout'
   ├─ IMMEDIATELY: Set lastClassifiedPlay
   └─ GOTO: RUNNER_OUTCOMES

   PATH B: Batter Drag
   ├─ User drags batter to base/fence
   ├─ On release: Show BatterReachedPopup (NOT HitTypeContent yet!)
   ├─ User selects: BB/IBB/HBP/1B/E/FC/D3K
   │   ├─ If BB/IBB/HBP/D3K: No ball location needed
   │   │   └─ GOTO: RUNNER_OUTCOMES
   │   └─ If 1B/E/FC: Ball was in play
   │       ├─ Show: "Tap ball location" prompt
   │       ├─ User taps field
   │       ├─ Show: HitTypeContent (ground/line/fly)
   │       ├─ If E: Show ErrorTypePopup
   │       └─ GOTO: RUNNER_OUTCOMES
   └─ If past fence (HR): Show HR distance → GOTO: RUNNER_OUTCOMES

   PATH C: Fielder Drag
   ├─ User drags fielder to ball location
   ├─ On release: Enter TAP_SEQUENCE
   │   ├─ User can tap fielders (adds to sequence)
   │   ├─ [Classify Play] button visible
   │   └─ User taps [Classify Play]
   ├─ Show: OutTypeContent (GO/FO/LO/PO + DP/TP checkboxes)
   ├─ User selects out type
   └─ GOTO: RUNNER_OUTCOMES

3. RUNNER_OUTCOMES
   ├─ Calculate default outcomes based on play type
   ├─ Display: Runners with destination arrows
   ├─ Display: [End At-Bat] button (ALWAYS, even if no runners)
   ├─ User can: Drag runners to adjust
   └─ User taps [End At-Bat]

4. PLAY COMMITTED (this is when data is saved)
   ├─ Persist play to game state
   ├─ Create undo snapshot BEFORE persist
   ├─ Enable applicable modifier buttons
   └─ GOTO: MODIFIERS_ACTIVE

5. MODIFIERS_ACTIVE
   ├─ User can: Tap any enabled modifier
   ├─ User can: Start next at-bat (tap field or next action)
   │
   ├─ If user taps [KP]:
   │   ├─ IMMEDIATELY show InjuryPrompt
   │   ├─ Disable [NUT] (mutual exclusivity)
   │   ├─ Record +3.0 Fame to batter
   │   └─ Complete prompt flow, then return to MODIFIERS_ACTIVE
   │
   ├─ If user taps [NUT]:
   │   ├─ IMMEDIATELY show MojoPrompt
   │   ├─ Disable [KP] (mutual exclusivity)
   │   ├─ Record +1.0 Fame to batter
   │   └─ Complete prompt flow, then return to MODIFIERS_ACTIVE
   │
   ├─ If user taps [WG]:
   │   ├─ Show StarPlaySubtypePopup
   │   ├─ Apply to FIRST fielder in sequence
   │   └─ Return to MODIFIERS_ACTIVE
   │
   └─ When next play starts:
       ├─ Clear all modifiers
       └─ GOTO: AWAITING_INPUT
```

---

## Wireframes

### Main Layout (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                              FIELD CANVAS                               │
│                                                                         │
│    [Undo ↩3]                                            [Scoreboard]   │
│                                                                         │
│                           ┌─────────────┐                               │
│                           │   STANDS    │                               │
│                           │  (y > 1.0)  │                               │
│                           └─────────────┘                               │
│                          ╱               ╲                              │
│                         ╱                 ╲                             │
│                        ╱    OUTFIELD       ╲                            │
│                       ╱   [7]  [8]  [9]     ╲                           │
│                      ╱                       ╲                          │
│                     ╱      [6]    [4]         ╲                         │
│                    ╱   [5]            [3]      ╲                        │
│                   ╱          [1]                ╲                       │
│                  ╱           [2]                 ╲                      │
│                 ╱        [BATTER]                 ╲                     │
│                ╱                                   ╲                    │
│               ╱         FOUL TERRITORY              ╲                   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PERMANENT        THROW           ACTION           MODIFIERS            │
│  ┌─────┬─────┐   SEQUENCE        ┌──────────┐     (enabled/disabled)   │
│  │  K  │  Ꝅ  │   ┌────────┐      │ CLASSIFY │     ┌────┬────┬────┐    │
│  └─────┴─────┘   │ 6-4-3  │      │   PLAY   │     │ 7+ │ WG │ROB │    │
│                  └────────┘      └──────────┘     ├────┼────┼────┤    │
│                                  ┌──────────┐     │ KP │NUT │ BT │    │
│                                  │ END      │     ├────┼────┴────┤    │
│                                  │ AT-BAT   │     │BUNT│TOOTBLAN │    │
│                                  └──────────┘     └────┴─────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Button Positions (Exact)

```typescript
// In EnhancedInteractiveField.tsx, add after field canvas

// PERMANENT BUTTONS - Bottom left, always visible in AWAITING_INPUT
<div className="absolute bottom-4 left-4 flex gap-2">
  <button className="w-14 h-14 bg-[#DD0000] border-4 border-white text-white text-xl font-bold">
    K
  </button>
  <button className="w-14 h-14 bg-[#DD0000] border-4 border-white text-white text-xl font-bold">
    Ꝅ
  </button>
</div>

// THROW SEQUENCE - Top left, visible when placedFielders.length > 0
{throwSequence.length > 0 && (
  <div className="absolute top-4 left-4 bg-[#3366FF] border-4 border-white px-3 py-2">
    <div className="text-xs text-white font-bold">SEQUENCE:</div>
    <div className="text-lg text-white font-bold">{throwSequence.join('-')}</div>
  </div>
)}

// CLASSIFY PLAY - Bottom center, visible in TAP_SEQUENCE
{getUIPhase() === 'TAP_SEQUENCE' && (
  <button className="absolute bottom-4 left-1/2 -translate-x-1/2
                     bg-[#DD0000] border-4 border-white px-6 py-3
                     text-white text-sm font-bold">
    ▶ CLASSIFY PLAY
  </button>
)}

// END AT-BAT - Bottom center, visible in RUNNER_OUTCOMES
{getUIPhase() === 'RUNNER_OUTCOMES' && (
  <button className="absolute bottom-4 left-1/2 -translate-x-1/2
                     bg-[#4CAF50] border-4 border-white px-6 py-3
                     text-white text-sm font-bold">
    ✓ END AT-BAT
  </button>
)}

// MODIFIERS - Bottom right, visible in MODIFIERS_ACTIVE
{getUIPhase() === 'MODIFIERS_ACTIVE' && (
  <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1">
    {/* Each button: enabled/disabled based on enabledModifiers */}
    <ModifierButton id="7+" enabled={enabledModifiers.has('7+')} />
    <ModifierButton id="WG" enabled={enabledModifiers.has('WG')} />
    <ModifierButton id="ROB" enabled={enabledModifiers.has('ROB')} />
    <ModifierButton id="KP" enabled={enabledModifiers.has('KP')} disabled={activeModifiers.has('NUT')} />
    <ModifierButton id="NUT" enabled={enabledModifiers.has('NUT')} disabled={activeModifiers.has('KP')} />
    <ModifierButton id="BT" enabled={enabledModifiers.has('BT')} disabled={activeModifiers.has('BUNT')} />
    <ModifierButton id="BUNT" enabled={enabledModifiers.has('BUNT')} disabled={activeModifiers.has('BT')} />
    <ModifierButton id="TOOTBLAN" enabled={enabledModifiers.has('TOOTBLAN')} colSpan={2} />
  </div>
)}
```

### Button States Visual

```
ENABLED (can tap):
┌─────────┐
│   WG    │  bg-[#C4A853] border-white text-black
└─────────┘

DISABLED (grayed, cannot tap):
┌─────────┐
│   WG    │  bg-[#444] border-[#666] text-[#666] opacity-50
└─────────┘

SELECTED (already tapped):
┌─────────┐
│  ✓ WG   │  bg-[#4CAF50] border-white text-white
└─────────┘

BLOCKED (mutually exclusive with selected):
┌─────────┐
│   NUT   │  bg-[#333] border-[#555] text-[#555] opacity-30 cursor-not-allowed
└─────────┘
```

---

## Batter Reaches Base Flow

### This REPLACES the current HitTypeContent flow

**CURRENT (wrong):**
```
Batter drag to 1B → HitTypeContent (1B/2B/3B/HR)
```

**CORRECT (implement this):**
```
Batter drag to 1B → BatterReachedPopup → (conditional) → HitTypeContent
```

### BatterReachedPopup Component (NEW)

```typescript
// NEW FILE: app/components/BatterReachedPopup.tsx

interface BatterReachedPopupProps {
  targetBase: '1B' | '2B' | '3B' | 'HOME';
  gameState: { outs: number; runners: { first: boolean; second: boolean; third: boolean } };
  onSelect: (option: BatterReachedOption) => void;
  onCancel: () => void;
}

type BatterReachedOption = 'BB' | 'IBB' | 'HBP' | '1B' | '2B' | '3B' | 'E' | 'FC' | 'D3K';

function BatterReachedPopup({ targetBase, gameState, onSelect, onCancel }: BatterReachedPopupProps) {
  // D3K is only legal if: (1B empty) OR (2 outs)
  const isD3KLegal = !gameState.runners.first || gameState.outs === 2;

  // Options depend on target base
  const options = useMemo(() => {
    if (targetBase === '1B') {
      const opts: { id: BatterReachedOption; label: string; color: string; enabled: boolean }[] = [
        { id: 'BB', label: 'BB', color: '#5599FF', enabled: true },
        { id: 'IBB', label: 'IBB', color: '#5599FF', enabled: true },
        { id: 'HBP', label: 'HBP', color: '#9966FF', enabled: true },
        { id: '1B', label: '1B', color: '#4CAF50', enabled: true },
        { id: 'E', label: 'E', color: '#FF9800', enabled: true },
        { id: 'FC', label: 'FC', color: '#FF5722', enabled: gameState.runners.first || gameState.runners.second || gameState.runners.third },
        { id: 'D3K', label: 'D3K', color: '#DD0000', enabled: isD3KLegal },
      ];
      return opts.filter(o => o.enabled);
    }
    if (targetBase === '2B') {
      return [
        { id: '2B', label: '2B', color: '#2196F3', enabled: true },
        { id: 'E', label: 'E', color: '#FF9800', enabled: true },
      ];
    }
    if (targetBase === '3B') {
      return [
        { id: '3B', label: '3B', color: '#9C27B0', enabled: true },
        { id: 'E', label: 'E', color: '#FF9800', enabled: true },
      ];
    }
    // HOME = inside-the-park HR
    return [
      { id: 'HR', label: 'Inside-Park HR', color: '#FFD700', enabled: true },
    ];
  }, [targetBase, gameState, isD3KLegal]);

  return (
    <SidePanel side="left" isOpen={true} onClose={onCancel} title="HOW DID BATTER REACH?">
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="w-full py-2 px-3 border-2 border-white text-white text-sm font-bold"
            style={{ backgroundColor: opt.color }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </SidePanel>
  );
}
```

### Flow After Selection

```typescript
function handleBatterReachedSelect(option: BatterReachedOption) {
  switch (option) {
    case 'BB':
    case 'IBB':
    case 'HBP':
    case 'D3K':
      // NO ball in play - skip spray chart
      setLastClassifiedPlay({
        type: option === 'D3K' ? 'strikeout' : 'walk',
        subtype: option,
        ballInPlay: false,
        ballLocation: null,
      });
      // → RUNNER_OUTCOMES
      break;

    case '1B':
    case '2B':
    case '3B':
      // Ball in play - need spray chart location
      setNeedsBallLocation(true);
      setPendingHitType(option);
      // Show: "Tap where ball landed" prompt
      // After tap: show hit type (ground/line/fly)
      break;

    case 'E':
      // Ball in play + error
      // FLOW:
      // 1. Show "Tap where ball landed" prompt
      // 2. User taps ball location
      // 3. Show "Tap fielder who made the error" prompt
      // 4. User taps fielder icon on field (same as out sequence)
      // 5. Show ErrorTypePopup (FIELDING/THROWING/MENTAL)
      // 6. → RUNNER_OUTCOMES
      setNeedsBallLocation(true);
      setPendingError(true);
      break;

    case 'FC':
      // Fielder's choice - batter safe, runner out
      setNeedsBallLocation(true);
      setPendingFC(true);
      // After tap: show which runner was out
      break;
  }
}
```

---

## Classify Play Edge Cases

### Edge Case 1: Empty Sequence

**Scenario**: User drops fielder, immediately taps [Classify Play] without tapping any other fielders.

**Behavior**:
- Sequence = [firstFielderPosition] (just the one who was dropped)
- This is valid - represents unassisted out (e.g., "U-3" for first baseman)
- Show OutTypeContent with notation "U-{position}"

```typescript
if (throwSequence.length === 1) {
  // Unassisted out
  const notation = `U-${throwSequence[0]}`;
}
```

### Edge Case 2: Tap After Classify

**Scenario**: User taps [Classify Play], OutTypeContent appears, user taps another fielder.

**Behavior**:
- IGNORE the tap
- OutTypeContent is modal - blocks field interaction
- Use `pointer-events: none` on field while panel is open

```typescript
// In FieldCanvas or field overlay
<div
  className={`absolute inset-0 ${showOutPanel ? 'pointer-events-none' : ''}`}
>
  {/* Field content */}
</div>
```

### Edge Case 3: Drag After Drop

**Scenario**: User drops fielder A at position X, then drags fielder B.

**Behavior**:
- This is a RESET - user changed their mind
- Clear placedFielders
- Clear throwSequence
- Start fresh with fielder B's drop

```typescript
function handleFielderDrop(fielder: FielderData, location: FieldCoordinate) {
  // If there's already a placed fielder, this is a new play
  if (placedFielders.length > 0) {
    // Reset previous state
    setPlacedFielders([]);
    setThrowSequence([]);
  }

  // Start new sequence
  setPlacedFielders([{ ...fielder, location, sequenceNumber: 1 }]);
  setThrowSequence([fielder.positionNumber]);
}
```

### Edge Case 4: Cancel Mid-Sequence

**Scenario**: User drops fielder, taps a few others, then wants to cancel.

**Behavior**:
- [RESET] button always visible when placedFielders.length > 0
- Tapping RESET clears everything, returns to AWAITING_INPUT

```typescript
{placedFielders.length > 0 && (
  <button
    onClick={handleReset}
    className="absolute bottom-4 left-4 bg-[#666] border-2 border-white px-4 py-2 text-white"
  >
    ✕ RESET
  </button>
)}

function handleReset() {
  setPlacedFielders([]);
  setThrowSequence([]);
  setBallLocation(null);
  setLastClassifiedPlay(null);
  // Return to AWAITING_INPUT (derived automatically)
}
```

---

## End At-Bat Exact Timing

### When Does It Appear?

```typescript
// ALWAYS show End At-Bat when:
// 1. A play has been classified (lastClassifiedPlay !== null)
// 2. AND play has not been committed yet (playCommitted === false)

const showEndAtBat = lastClassifiedPlay !== null && !playCommitted;
```

### Yes, Even With No Runners

**Q**: What if there are no runners? Does End At-Bat still show?

**A**: YES. The user must explicitly end the at-bat even if there's nothing to adjust. This is intentional because:
1. Consistent UX - always same flow
2. Allows user to review before committing
3. Gives opportunity to RESET if wrong

### What Happens When Tapped?

```typescript
function handleEndAtBat() {
  // 1. Create undo snapshot FIRST
  undoSystem.snapshot({
    description: getPlayDescription(lastClassifiedPlay),
    gameState: { ...currentGameState },
  });

  // 2. Apply runner outcomes to game state
  applyRunnerOutcomes(runnerOutcomes);

  // 3. Apply batter outcome
  applyBatterOutcome(lastClassifiedPlay);

  // 4. Update outs count
  updateOuts(lastClassifiedPlay);

  // 5. Mark play as committed
  setPlayCommitted(true);

  // 6. Calculate enabled modifiers based on play
  const enabled = getEnabledModifiers(lastClassifiedPlay, currentGameState);
  setEnabledModifiers(enabled);

  // 7. Clear temporary state
  setPlacedFielders([]);
  setThrowSequence([]);
  setBallLocation(null);
  // NOTE: Do NOT clear lastClassifiedPlay yet - modifiers need it
}
```

---

## Modifier Button Rules (Resolved)

### Auto-Dismiss: RESOLVED

**Decision**: Modifiers do NOT auto-dismiss. They stay enabled until next at-bat starts.

**Implementation**:
```typescript
// REMOVE the timestamp field from PlayContext
// REMOVE any setTimeout for auto-dismiss

// Modifiers persist until:
function startNextAtBat() {
  setEnabledModifiers(new Set());
  setActiveModifiers(new Set());
  setLastClassifiedPlay(null);
  setPlayCommitted(false);
  setAtBatComplete(false);
}
```

### Mutual Exclusivity Implementation

```typescript
function handleModifierTap(modifierId: string) {
  // Check if blocked
  if (modifierId === 'KP' && activeModifiers.has('NUT')) return;
  if (modifierId === 'NUT' && activeModifiers.has('KP')) return;
  if (modifierId === 'BT' && activeModifiers.has('BUNT')) return;
  if (modifierId === 'BUNT' && activeModifiers.has('BT')) return;

  // Add to active
  setActiveModifiers(prev => new Set([...prev, modifierId]));

  // Handle specific modifiers
  switch (modifierId) {
    case 'KP':
      setPendingInjuryPrompt('KP');
      break;
    case 'NUT':
      setPendingInjuryPrompt('NUT');
      break;
    case 'WG':
      setShowStarPlayPopup(true);
      break;
    case '7+':
      // Just toggle, no popup
      recordSevenPlusPitch();
      break;
    // ... etc
  }
}
```

### WG Attribution: First Fielder

```typescript
function handleStarPlaySelect(subtype: StarPlaySubtype) {
  // Get FIRST fielder in the throw sequence
  const firstFielderPosition = lastClassifiedPlay.fielderSequence[0];
  const firstFielder = getFielderByPosition(firstFielderPosition);

  recordStarPlay({
    fielderId: firstFielder.id,
    fielderPosition: firstFielderPosition,
    playType: subtype, // 'DIVING' | 'SLIDING' | etc.
    fameBonus: 1.0, // +1.0 for WG, or +1.5 if also ROB
  });

  setShowStarPlayPopup(false);
}
```

---

## KP/NUT Exact Timing

### "Immediately" Defined

**When user taps [KP]:**

1. IMMEDIATELY (same frame):
   - Disable [NUT] button (visual: grayed, blocked)
   - Add 'KP' to activeModifiers
   - Record +3.0 Fame to batter

2. THEN (next render):
   - Show InjuryPrompt popup

3. User completes InjuryPrompt:
   - If "STAYED IN": Close popup, return to MODIFIERS_ACTIVE
   - If "LEFT GAME":
     - Show injury severity selection
     - After selection: Auto-open substitution flow
     - After substitution: Return to MODIFIERS_ACTIVE

### InjuryPrompt Component

```typescript
// NEW FILE: app/components/InjuryPrompt.tsx

interface InjuryPromptProps {
  type: 'KP' | 'NUT';
  pitcherId: string;
  pitcherName: string;
  onComplete: (result: InjuryResult) => void;
}

interface InjuryResult {
  stayedIn: boolean;
  severity?: 'HURT' | 'INJURED' | 'WOUNDED';  // Only if left game (KP)
  mojoImpact?: 'NONE' | 'TENSE' | 'RATTLED';  // Only for NUT
}

function InjuryPrompt({ type, pitcherId, pitcherName, onComplete }: InjuryPromptProps) {
  const [step, setStep] = useState<'left_game' | 'severity' | 'mojo'>('left_game');
  const [leftGame, setLeftGame] = useState<boolean | null>(null);

  if (type === 'KP') {
    // Step 1: Did pitcher leave?
    if (step === 'left_game') {
      return (
        <Modal title="KILLED PITCHER">
          <p>+3.0 Fame to batter</p>
          <p>Did {pitcherName} leave the game?</p>
          <div className="flex gap-2">
            <button onClick={() => onComplete({ stayedIn: true })}>
              STAYED IN
            </button>
            <button onClick={() => { setLeftGame(true); setStep('severity'); }}>
              LEFT GAME
            </button>
          </div>
        </Modal>
      );
    }

    // Step 2: Injury severity
    if (step === 'severity') {
      return (
        <Modal title="INJURY SEVERITY">
          <div className="space-y-2">
            <button onClick={() => onComplete({ stayedIn: false, severity: 'HURT' })}>
              HURT (minor)
            </button>
            <button onClick={() => onComplete({ stayedIn: false, severity: 'INJURED' })}>
              INJURED (moderate)
            </button>
            <button onClick={() => onComplete({ stayedIn: false, severity: 'WOUNDED' })}>
              WOUNDED (severe)
            </button>
          </div>
        </Modal>
      );
    }
  }

  if (type === 'NUT') {
    // NUT: Just mojo impact
    return (
      <Modal title="NUTSHOT">
        <p>+1.0 Fame to batter</p>
        <p>Mojo impact on pitcher?</p>
        <div className="space-y-2">
          <button onClick={() => onComplete({ stayedIn: true, mojoImpact: 'NONE' })}>
            NONE (shook it off)
          </button>
          <button onClick={() => onComplete({ stayedIn: true, mojoImpact: 'TENSE' })}>
            TENSE
          </button>
          <button onClick={() => onComplete({ stayedIn: true, mojoImpact: 'RATTLED' })}>
            RATTLED
          </button>
        </div>
      </Modal>
    );
  }
}
```

---

## Runner Outcome Visuals

### Overview

During RUNNER_OUTCOMES phase, show:
1. **Visual arrows** indicating where each runner is going
2. **Draggable runner icons** at their START positions (pre-play)
3. **Drop zones** (SAFE/OUT) at each base for adjustment
4. **RunnerOutcomesDisplay panel** (top-right) showing text summary

### User Adjustment Flow

The system calculates defaults, but user can DRAG TO ADJUST:

```
1. Play classified → Runner defaults calculated
2. Arrows show default paths (current base → destination)
3. User can DRAG any runner icon to:
   - A different base's SAFE zone (changes destination)
   - A base's OUT zone (marks runner out at that base)
4. Changes update BOTH the arrows AND the RunnerOutcomesDisplay panel
5. User taps "End At-Bat" when outcomes are correct
```

### New Component: RunnerOutcomeArrows.tsx

```typescript
interface RunnerOutcomeArrowsProps {
  outcomes: RunnerDefaults;
  onOutcomeChange: (updated: RunnerDefaults) => void;
  gameSituation: GameSituation;
}

// Renders for EACH runner/batter:
// 1. Runner icon at START position (draggable)
// 2. Arrow from start → destination
// 3. Drop zones appear when dragging
```

### Arrow Rendering

```typescript
function OutcomeArrow({ from, to, isOut }: {
  from: 'home' | 'first' | 'second' | 'third';
  to: BaseId;
  isOut: boolean;
}) {
  const fromPos = BASE_POSITIONS[from];
  const toPos = BASE_POSITIONS[to === 'out' ? from : to]; // OUT shows X at current base

  const color = isOut ? '#DD0000' : '#4CAF50';

  return (
    <svg className="absolute inset-0 pointer-events-none z-20">
      <defs>
        <marker id={`arrowhead-${color}`} markerWidth="10" markerHeight="7"
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={color} />
        </marker>
      </defs>
      {!isOut && from !== to && (
        <line
          x1={fromSvg.x} y1={fromSvg.y}
          x2={toSvg.x} y2={toSvg.y}
          stroke={color}
          strokeWidth="3"
          strokeDasharray="8,4"
          markerEnd={`url(#arrowhead-${color})`}
          opacity="0.8"
        />
      )}
      {isOut && (
        <text x={fromSvg.x} y={fromSvg.y} fill="#DD0000" fontSize="24"
              textAnchor="middle" dominantBaseline="middle">
          ✗
        </text>
      )}
    </svg>
  );
}
```

### Drop Zone Pattern (Reuse from RunnerDragDrop)

During RUNNER_OUTCOMES, when user drags a runner icon:
- Show SAFE zones at each base ahead of runner's start
- Show OUT zones at each base (runner out at that location)
- Use same visual style as existing RunnerDragDrop

```typescript
// Drop handlers update runnerOutcomes state
const handleRunnerDrop = (runnerId: 'batter' | 'first' | 'second' | 'third',
                          targetBase: BaseId,
                          outcome: 'safe' | 'out') => {
  const updatedOutcome: RunnerOutcome = {
    from: runnerId === 'batter' ? 'batter' : runnerId,
    to: outcome === 'out' ? 'out' : targetBase,
    isDefault: false,
    reason: outcome === 'out' ? `Out at ${targetBase}` : `Safe at ${targetBase}`,
  };

  onOutcomeChange({
    ...outcomes,
    [runnerId]: updatedOutcome,
  });
};
```

### Batter Icon (New Addition)

In RUNNER_OUTCOMES phase, show batter icon at home plate:
- Draggable to any base or out zone
- Arrow shows default destination

```typescript
// BatterOutcomeIcon - shown at home plate during RUNNER_OUTCOMES
function BatterOutcomeIcon({ outcome, onDragEnd }) {
  return (
    <div className="absolute" style={{ left: HOME_POSITION.x, top: HOME_POSITION.y }}>
      <div className="w-6 h-6 bg-[#4169E1] border-2 border-white rounded-full
                      flex items-center justify-center text-white font-bold text-xs
                      cursor-grab active:cursor-grabbing">
        B
      </div>
    </div>
  );
}
```

### Hint Banner

```typescript
{getUIPhase() === 'RUNNER_OUTCOMES' && (
  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50
                  bg-black/80 px-4 py-2 rounded text-white text-xs
                  border border-[#C4A853]">
    <span className="text-[#C4A853] font-bold">RUNNER OUTCOMES</span>
    <span className="ml-2">Drag to adjust • Tap END AT-BAT when correct</span>
  </div>
)}
```

### State Synchronization

Both RunnerOutcomesDisplay (panel) and RunnerOutcomeArrows (field) share the same state:

```typescript
const [runnerOutcomes, setRunnerOutcomes] = useState<RunnerDefaults | null>(null);

// Changes from EITHER component update the shared state
// Both components react to state changes
<RunnerOutcomeArrows
  outcomes={runnerOutcomes}
  onOutcomeChange={setRunnerOutcomes}
  gameSituation={gameSituation}
/>
<RunnerOutcomesDisplay
  outcomes={runnerOutcomes}
  onOutcomeChange={setRunnerOutcomes}
  playType={lastClassifiedPlay?.type}
/>
```

---

## Error Handling

### What Can Go Wrong and How to Handle

| Error | Detection | Recovery |
|-------|-----------|----------|
| Fielder drop outside field | `isFoulTerritory()` AND y < 0 | Cancel drop, show toast |
| Batter drop in stands with y > 1.4 | y > 1.4 | Clamp to 1.4, treat as deep HR |
| Tap fielder not in game | fielderId not in currentRoster | Ignore tap |
| D3K when not legal | `!isD3KLegal()` | Don't show option (already handled) |
| Empty fielder sequence on Classify | sequence.length === 0 | Disable Classify button |
| HR distance < 300 or > 600 | Validation in input | Show error, don't submit |

### Toast Notifications

```typescript
// Use existing toast system if available, or add:
function showToast(message: string, type: 'error' | 'info' | 'success') {
  // Implementation depends on existing UI library
}

// Call on errors:
showToast("Drop cancelled - outside field boundary", 'error');
showToast("Play recorded", 'success');
showToast("Undo: Single to LF by J. Smith", 'info');
```

---

## D3K Implementation Location

### Where to Put the Legal Check

```typescript
// ADD TO: playClassifier.ts (near the top, with other helpers)

/**
 * Check if Dropped Third Strike is legal in current game state.
 * D3K is legal when: first base is empty OR there are 2 outs.
 */
export function isD3KLegal(gameState: {
  outs: number;
  runners: { first: boolean }
}): boolean {
  const firstBaseOccupied = gameState.runners.first;
  const twoOuts = gameState.outs === 2;
  return !firstBaseOccupied || twoOuts;
}
```

### Where to Use It

```typescript
// In BatterReachedPopup.tsx (as shown above)
const isD3KLegal = !gameState.runners.first || gameState.outs === 2;

// Filter options to exclude D3K when not legal
const options = baseOptions.filter(o => o.id !== 'D3K' || isD3KLegal);
```

---

## Data Persistence Moment

### Exactly When Is Data Saved?

**Answer**: When user taps [End At-Bat].

NOT before. Not during Classify Play. Not during runner adjustment.

```typescript
function handleEndAtBat() {
  // THIS is the persistence moment

  // 1. Snapshot for undo (BEFORE changes)
  undoSystem.snapshot(currentState);

  // 2. Persist to game state
  gameState.recordPlay({
    inning: currentInning,
    halfInning: isTop ? 'top' : 'bottom',
    batter: currentBatter,
    pitcher: currentPitcher,
    play: lastClassifiedPlay,
    runnerOutcomes: runnerOutcomes,
    ballLocation: ballLocation,
  });

  // 3. Update cumulative stats
  updateBatterStats(currentBatter, lastClassifiedPlay);
  updatePitcherStats(currentPitcher, lastClassifiedPlay);

  // 4. Update fielder stats (if applicable)
  if (lastClassifiedPlay.fielderSequence) {
    updateFielderStats(lastClassifiedPlay.fielderSequence);
  }

  // 5. Mark committed
  setPlayCommitted(true);
}
```

### What About Modifiers?

Modifiers are persisted immediately when tapped (after End At-Bat has already been tapped):

```typescript
function handleModifierTap(modifierId: string) {
  // ... validation ...

  // Persist modifier immediately
  gameState.addModifier(lastPlayId, modifierId, {
    fielder: modifierId === 'WG' ? lastClassifiedPlay.fielderSequence[0] : null,
    // ... other data
  });
}
```

---

## Undo Integration

### How UndoSystem.tsx Connects

```typescript
// In EnhancedInteractiveField.tsx

import { useUndo } from '../hooks/useUndo';  // or wherever UndoSystem exports from

function EnhancedInteractiveField() {
  const { snapshot, undo, canUndo, undoCount } = useUndo();

  // Before any state-changing operation:
  function handleEndAtBat() {
    snapshot({
      description: getPlayDescription(lastClassifiedPlay),
      // Include ALL state that needs to be restored
      gameState: { ...fullGameState },
      uiState: {
        placedFielders,
        throwSequence,
        lastClassifiedPlay,
        runnerOutcomes,
      },
    });

    // ... then apply changes
  }

  // Undo button (top-left)
  return (
    <>
      <button
        onClick={undo}
        disabled={!canUndo}
        className="absolute top-4 left-4"
      >
        ↩ {undoCount}
      </button>
      {/* ... rest of UI */}
    </>
  );
}
```

### What Gets Restored on Undo

- Full game state (outs, runners, score)
- UI state (which panels were open)
- Last classified play (so modifiers work correctly)
- All modifier applications from that play

---

## Summary Checklist

Before implementation, confirm understanding of:

- [ ] Only modify `EnhancedInteractiveField.tsx`, not `DragDropGameTracker.tsx`
- [ ] State is derived from existing useState, not parallel
- [ ] BatterReachedPopup is NEW, comes BEFORE HitTypeContent
- [ ] End At-Bat shows ALWAYS during RUNNER_OUTCOMES, even if no runners
- [ ] Modifiers do NOT auto-dismiss
- [ ] KP prompt appears IMMEDIATELY when tapped
- [ ] WG applies to FIRST fielder in sequence
- [ ] Data persists on End At-Bat tap, not before
- [ ] Undo snapshot happens BEFORE changes

---

*End of Addendum*
