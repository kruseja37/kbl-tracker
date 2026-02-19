# KBL XHD Tracker - Implementation Guide
## Complete Technical Documentation for Baseball Rules Implementation

**Version:** 1.0  
**Last Updated:** January 21, 2026  
**Author:** Development Session  

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Feature Implementations](#feature-implementations)
   - [Force Out Third Out Rule](#1-force-out-third-out-rule)
   - [Fielder's Choice Flow](#2-fielders-choice-fc-flow)
   - [Tag-Up Context for Fly Outs](#3-tag-up-context-for-fly-outs)
   - [SAC Requires Runners](#4-sac-requires-runners-validation)
   - [Hit Type Statistics](#5-hit-type-statistics-2b3b)
   - [Infield Fly Rule Indicator](#6-infield-fly-rule-ifr-indicator)
4. [Testing Procedures](#testing-procedures)
5. [File Reference](#file-reference)

---

## Overview

This document provides complete technical documentation for the baseball rules implementation in the KBL XHD Tracker. It is designed so that any developer can:

1. Understand exactly what each feature does
2. Locate the relevant code
3. Verify the implementation is correct
4. Make modifications if needed

### Key Principles

- **Baseball Accuracy:** All rules follow official MLB rules
- **User Experience:** Minimal clicks, smart defaults, clear feedback
- **Code Quality:** TypeScript for type safety, clear naming, documented logic

---

## Architecture

### Component Structure

```
src/components/GameTracker/
├── index.tsx          # Main game state, scoring logic, force out validation
├── AtBatFlow.tsx      # At-bat result modal, FC flow, tag-up logic
├── AtBatButtons.tsx   # Result/event buttons, availability rules
├── EventFlow.tsx      # Non-AB events (SB, CS, WP, etc.)
├── Diamond.tsx        # Base diagram visualization
└── Scoreboard.tsx     # Score display
```

### Data Flow

```
User clicks button (AtBatButtons)
    ↓
Modal opens (AtBatFlow)
    ↓
User makes selections
    ↓
handleAtBatFlowComplete() called (index.tsx)
    ↓
processRunnerOutcomes() validates scoring
    ↓
State updated (bases, score, stats)
```

---

## Feature Implementations

### 1. Force Out Third Out Rule

**Baseball Rule:**
> When the third out is a FORCE OUT, no runs can score on that play, regardless of when the runner crossed home plate.

**File:** `src/components/GameTracker/index.tsx`

#### Implementation

**Step 1: Define force out detection**

```typescript
const isForceOut = (
  outcome: RunnerOutcome | null,
  fromBase: 'first' | 'second' | 'third',
  currentBases: Bases
): boolean => {
  if (!outcome) return false;
  
  // Runner on 1st out at 2B is ALWAYS a force (batter forces them)
  if (fromBase === 'first' && outcome === 'OUT_2B') {
    return true;
  }
  
  // Runner on 2nd out at 3B is force ONLY if 1st was also occupied
  if (fromBase === 'second' && outcome === 'OUT_3B' && currentBases.first) {
    return true;
  }
  
  // Runner on 3rd out at home is force ONLY if bases loaded
  if (fromBase === 'third' && outcome === 'OUT_HOME' && 
      currentBases.first && currentBases.second) {
    return true;
  }
  
  return false;
};
```

**Step 2: Process runner outcomes with validation**

```typescript
const processRunnerOutcomes = (
  flowState: AtBatFlowState,
  newBases: Bases,
  batterResult: AtBatResult
): { updatedBases: Bases; runsScored: string[]; outsRecorded: number } => {
  
  // First pass: determine what WOULD happen
  // Track runners who would score and which outs are force outs
  
  // Calculate total outs on play
  const batterOuts = isOut(batterResult) ? (batterResult === 'DP' ? 2 : 1) : 0;
  const totalOutsOnPlay = batterOuts + runnerOutsRecorded;
  const finalOutCount = outs + totalOutsOnPlay;
  
  // Check if any out is a force out
  const hasForceOut = 
    (runnerResults.third?.isForceOut) ||
    (runnerResults.second?.isForceOut) ||
    (runnerResults.first?.isForceOut) ||
    (batterResult === 'GO' || batterResult === 'DP' || batterResult === 'FC');
  
  // CRITICAL: If 3rd out is force out, NO runs score
  const runsNegatedByForceOut = finalOutCount >= 3 && hasForceOut;
  
  // Second pass: execute outcomes, filtering out negated runs
  // ...
};
```

#### Verification Test

1. Set up: Bases loaded, 2 outs
2. Click GO (ground out)
3. Set runner from 3rd to "Scored"
4. Set runner from 2nd to "Out at 2B" (force out)
5. Confirm at-bat
6. **Expected:** Score remains 0-0 (run negated by force out)

---

### 2. Fielder's Choice (FC) Flow

**Baseball Rule:**
> On a Fielder's Choice, the batter reaches first base safely while the defense puts out another baserunner.

**File:** `src/components/GameTracker/AtBatFlow.tsx`

#### Implementation

**Step 1: Add state for tracking which runner was out**

```typescript
// FC-specific: track which runner was put out
const [fcRunnerOut, setFcRunnerOut] = useState<'first' | 'second' | 'third' | null>(
  initialResult === 'FC' 
    ? (bases.first ? 'first' : bases.second ? 'second' : bases.third ? 'third' : null) 
    : null
);
```

**Step 2: Handle runner selection**

```typescript
const handleFCRunnerSelect = (runnerBase: 'first' | 'second' | 'third') => {
  setFcRunnerOut(runnerBase);
  
  // Auto-set outcomes: selected runner OUT, others HELD
  const newOutcomes: typeof runnerOutcomes = {
    first: bases.first 
      ? (runnerBase === 'first' ? 'OUT_2B' : 'HELD') 
      : null,
    second: bases.second 
      ? (runnerBase === 'second' ? 'OUT_3B' : 'HELD') 
      : null,
    third: bases.third 
      ? (runnerBase === 'third' ? 'OUT_HOME' : 'HELD') 
      : null,
  };
  setRunnerOutcomes(newOutcomes);
};
```

**Step 3: Add UI for FC runner selection**

```tsx
{needsFCRunnerSelection && (
  <div>
    <div style={styles.sectionLabel}>WHICH RUNNER WAS PUT OUT?</div>
    <div style={styles.fcInfo}>
      On FC, batter reaches 1st while defense puts out another runner
    </div>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {bases.first && (
        <button onClick={() => handleFCRunnerSelect('first')}>
          {bases.first.playerName} (1B) → Out at 2B
        </button>
      )}
      {bases.second && (
        <button onClick={() => handleFCRunnerSelect('second')}>
          {bases.second.playerName} (2B) → Out at 3B
        </button>
      )}
      {bases.third && (
        <button onClick={() => handleFCRunnerSelect('third')}>
          {bases.third.playerName} (3B) → Out at Home
        </button>
      )}
    </div>
  </div>
)}
```

#### Verification Test

1. Put runner on 1st base (via single or walk)
2. Click FC
3. **Expected:** UI shows "WHICH RUNNER WAS PUT OUT?" with runner option
4. Select the runner
5. **Expected:** Runner set to OUT, batter placed on 1st

---

### 3. Tag-Up Context for Fly Outs

**Baseball Rule:**
> On a fly ball that is caught, runners may only advance AFTER the ball is caught (tag up). If they leave early, they can be doubled off.

**File:** `src/components/GameTracker/AtBatFlow.tsx`

#### Implementation

**Step 1: Add tag-up state**

```typescript
const [taggedUp, setTaggedUp] = useState<{
  first: boolean;
  second: boolean;
  third: boolean;
}>({ first: false, second: false, third: false });

const isFlyOut = ['FO', 'SF', 'LO', 'PO'].includes(result);
const needsTagUpSelection = isFlyOut && (bases.first || bases.second || bases.third);
```

**Step 2: Filter runner options based on tag-up**

```typescript
const getRunnerOptions = (base: 'first' | 'second' | 'third') => {
  const options = [];
  const didTagUp = taggedUp[base];

  // For fly outs: if runner didn't tag up, limited options
  if (isFlyOut && !didTagUp) {
    options.push({ value: 'HELD', label: 'Held' });
    // Can only be doubled off, not advance
    if (base === 'third') options.push({ value: 'OUT_HOME', label: 'Doubled Off' });
    if (base === 'second') options.push({ value: 'OUT_3B', label: 'Doubled Off' });
    if (base === 'first') options.push({ value: 'OUT_2B', label: 'Doubled Off' });
    return options;
  }
  
  // If tagged up, full advancement options
  if (base === 'third') {
    options.push({ value: 'SCORED', label: isFlyOut ? 'Tagged & Scored' : 'Scored' });
  }
  // ... more options
  
  return options;
};
```

**Step 3: Add tag-up selection UI**

```tsx
{needsTagUpSelection && (
  <div>
    <div style={styles.sectionLabel}>TAG-UP STATUS:</div>
    <div style={styles.tagUpInfo}>
      On a fly out, runners must tag up before advancing. Select which runners tagged:
    </div>
    <div style={styles.tagUpContainer}>
      {bases.third && (
        <button
          onClick={() => setTaggedUp(prev => ({ ...prev, third: !prev.third }))}
          style={{
            ...styles.tagUpButton,
            backgroundColor: taggedUp.third ? '#4CAF50' : '#333',
          }}
        >
          {bases.third.playerName} (3B) {taggedUp.third ? '✓ Tagged' : 'No Tag'}
        </button>
      )}
      {/* Similar for second and first */}
    </div>
  </div>
)}
```

**Step 4: Auto-correct FO to SF**

```typescript
// In useEffect watching runnerOutcomes
if (initialResult === 'FO' && outs < 2 && 
    newOutcomes.third === 'SCORED' && taggedUp.third) {
  setResult('SF');
  setAutoCorrection('Auto-corrected to Sac Fly (runner scored from 3rd on fly out)');
}
```

#### Verification Test

1. Put runner on 3rd base
2. Click FO
3. **Expected:** "TAG-UP STATUS" section appears
4. Toggle "Mays (3B) No Tag" → "Mays (3B) ✓ Tagged"
5. **Expected:** Runner advancement options change to include "Tagged & Scored"
6. Select "Tagged & Scored"
7. **Expected:** Result auto-corrects to SF, shows "RBIs: 1"

---

### 4. SAC Requires Runners Validation

**Baseball Rule:**
> A sacrifice bunt is used to advance runners. Without runners, there's nothing to sacrifice for.

**File:** `src/components/GameTracker/AtBatButtons.tsx`

#### Implementation

```typescript
// Check if any runners are on base
const hasRunners = !!(bases.first || bases.second || bases.third);

// SAC (sacrifice bunt) - requires runners on base to advance
const isSACAvailable = hasRunners;

// In button rendering:
if (result === 'SAC' && !isSACAvailable) {
  isButtonDisabled = true;
  disabledReason = 'SAC requires runners on base';
}
```

#### Verification Test

1. Start fresh game (no runners)
2. **Expected:** SAC button is greyed out (opacity 0.3)
3. Hover over SAC
4. **Expected:** Tooltip shows "SAC requires runners on base"
5. Put runner on base
6. **Expected:** SAC button becomes active

---

### 5. Hit Type Statistics (2B/3B)

**Baseball Rule:**
> Batting statistics should track different hit types separately.

**File:** `src/components/GameTracker/index.tsx`

#### Implementation

**Step 1: Update PlayerStats interface**

```typescript
interface PlayerStats {
  pa: number;
  ab: number;
  h: number;
  singles: number;   // 1B - NEW
  doubles: number;   // 2B - NEW
  triples: number;   // 3B - NEW
  hr: number;
  rbi: number;
  r: number;
  bb: number;
  k: number;
  sb: number;
}

const initialStats: PlayerStats = {
  pa: 0, ab: 0, h: 0, 
  singles: 0, doubles: 0, triples: 0,  // NEW
  hr: 0, rbi: 0, r: 0, bb: 0, k: 0, sb: 0,
};
```

**Step 2: Track hit types**

```typescript
if (isHit(result)) {
  stats.h++;
  // Track specific hit types
  if (result === '1B') stats.singles++;
  else if (result === '2B') stats.doubles++;
  else if (result === '3B') stats.triples++;
  else if (result === 'HR') stats.hr++;
}
```

#### Verification Test

1. Record a double (2B)
2. Check player stats
3. **Expected:** `h: 1, doubles: 1, singles: 0, triples: 0`

---

### 6. Infield Fly Rule (IFR) Indicator

**Baseball Rule:**
> The Infield Fly Rule is in effect when:
> - Less than 2 outs
> - Runners on 1st and 2nd (or bases loaded)
> - Fair fly ball (not line drive or bunt) that can be caught with ordinary effort

**File:** `src/components/GameTracker/index.tsx`

#### Implementation

**Step 1: Calculate IFR condition**

```typescript
// Infield Fly Rule is in effect when:
// 1. Less than 2 outs
// 2. Runners on 1st and 2nd, OR bases loaded
const isInfieldFlyRule = outs < 2 && bases.first && bases.second;
```

**Step 2: Add IFR badge to UI**

```tsx
<div style={styles.badges}>
  {situationalContext.isClutchSituation && (
    <span style={styles.clutchBadge}>⚠️ CLUTCH</span>
  )}
  {situationalContext.isRISP && (
    <span style={styles.rispBadge}>RISP</span>
  )}
  {situationalContext.isWalkOffOpportunity && (
    <span style={styles.walkoffBadge}>🎆 WALK-OFF OPP</span>
  )}
  {isInfieldFlyRule && (
    <span style={styles.ifrBadge}>IFR</span>
  )}
</div>
```

**Step 3: Add IFR badge style**

```typescript
ifrBadge: {
  backgroundColor: '#00BCD4',  // Cyan
  color: '#000',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 'bold',
},
```

#### Verification Test

1. Walk first batter (runner on 1st)
2. Walk second batter (runners on 1st and 2nd)
3. **Expected:** Cyan "IFR" badge appears next to other situational badges
4. Record an out
5. **Expected:** IFR badge still shows (1 out < 2)
6. Record another out
7. **Expected:** IFR badge disappears (2 outs = not < 2)

---

## Testing Procedures

### Full Regression Test Checklist

| # | Test | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | Force out negates run | Bases loaded, 2 outs, GO, R3 scores, R2 out at 2B | Score stays 0-0 |
| 2 | FC runner selection | Runner on 1st, FC | Shows runner selection UI |
| 3 | Tag-up required | Runner on 3rd, FO, no tag | Only "Held" and "Doubled Off" options |
| 4 | Tag-up allows scoring | Runner on 3rd, FO, tagged | "Tagged & Scored" option available |
| 5 | FO→SF auto-correct | Runner on 3rd, FO, tag and score | Changes to SF, shows RBI |
| 6 | SAC disabled empty | No runners | SAC button greyed out |
| 7 | SAC enabled with runner | Runner on base | SAC button active |
| 8 | IFR shows | <2 outs, R1 and R2 | Cyan IFR badge visible |
| 9 | IFR hides | 2 outs, R1 and R2 | No IFR badge |
| 10 | Hit stats track | Record 2B | doubles stat increments |

---

## File Reference

### Modified Files Summary

| File | Purpose | Key Changes |
|------|---------|-------------|
| `index.tsx` | Main game logic | Force out validation, IFR indicator, hit type stats |
| `AtBatFlow.tsx` | At-bat modal | FC flow, tag-up tracking |
| `AtBatButtons.tsx` | Button availability | SAC/DP/SF validation |

### Type Definitions

Located in `src/types/game.ts`:

```typescript
type AtBatResult = '1B' | '2B' | '3B' | 'HR' | 'BB' | 'IBB' | 'K' | 'KL' | 
  'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'SF' | 'SAC' | 'HBP' | 'E' | 'FC' | 'D3K';

type RunnerOutcome = 'SCORED' | 'TO_3B' | 'TO_2B' | 'HELD' | 
  'OUT_HOME' | 'OUT_3B' | 'OUT_2B';

interface Bases {
  first: Runner | null;
  second: Runner | null;
  third: Runner | null;
}
```

---

## Troubleshooting

### Common Issues

**Q: SAC button won't enable even with runners**
- Check `hasRunners` calculation includes all three bases
- Verify bases state is being passed to AtBatButtons

**Q: Force out rule not working**
- Verify `isForceOut()` is checking the correct base relationships
- Ensure `processRunnerOutcomes()` is called instead of direct scoring

**Q: IFR badge not showing**
- Check `isInfieldFlyRule` calculation: `outs < 2 && bases.first && bases.second`
- Verify badge is in the JSX and styled correctly

---

*Document created January 21, 2026*
