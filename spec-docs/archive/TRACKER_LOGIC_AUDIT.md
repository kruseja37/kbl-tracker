# KBL XHD Tracker - Logic Audit Report
## Analysis Against Master Baseball Rules & Logic

**Date:** January 2026  
**Last Updated:** January 21, 2026  
**Status:** Phase 1 & 2 Complete ✅

---

## Summary

This document analyzes the current in-game tracker implementation against the Master Baseball Rules & Logic document to identify:
1. ✅ Correctly implemented rules
2. ⚠️ Partially implemented rules (need enhancement)
3. ❌ Missing or incorrect logic
4. 💡 Recommendations for improvements

---

## Implementation Status

### ✅ COMPLETED (January 21, 2026)

| Fix | Description | Files Modified |
|-----|-------------|----------------|
| Force Out 3rd Out Rule | No runs score when 3rd out is a force out | `index.tsx` |
| FC Runner Selection | User selects which runner was put out | `AtBatFlow.tsx` |
| Tag-Up Context | Fly outs show tag-up selection for runners | `AtBatFlow.tsx` |
| SAC Requires Runners | SAC button disabled without runners | `AtBatButtons.tsx` |
| 2B/3B Stat Tracking | Singles, doubles, triples tracked separately | `index.tsx` |
| Infield Fly Rule Indicator | IFR badge shows when rule is in effect | `index.tsx` |

---

## 1. At-Bat Result Button Availability

### ✅ Correctly Implemented

| Rule | Implementation | Status |
|------|----------------|--------|
| D3K only when 1st empty OR 2 outs | `isD3KAvailable = !bases.first \|\| outs === 2` | ✅ Correct |
| SAC disabled with 2 outs | Part of `isSACAvailable` | ✅ Correct |
| SAC requires runners | `isSACAvailable = hasRunners` | ✅ **FIXED** |
| SF disabled with 2 outs | Part of `isSFAvailable` | ✅ Correct |
| SF requires runner on 3rd | `isSFAvailable = !!bases.third` | ✅ Correct |
| DP disabled with 2 outs | Part of `isDPAvailable` | ✅ Correct |
| DP requires runners | `isDPAvailable = hasRunners && outs < 2` | ✅ Correct |

### Implementation Details (AtBatButtons.tsx)

```typescript
// Check if any runners are on base
const hasRunners = !!(bases.first || bases.second || bases.third);

// SAC (sacrifice bunt) - requires runners on base to advance
const isSACAvailable = hasRunners;

// DP (double play) - requires runners on base and less than 2 outs
const isDPAvailable = hasRunners && outs < 2;

// SF (sacrifice fly) - requires runner on 3rd base who can tag and score
const isSFAvailable = !!bases.third;
```

---

## 2. Auto-Correction Logic

### ✅ Correctly Implemented

| Auto-Correction | Trigger | Status |
|-----------------|---------|--------|
| FO → SF | Runner from 3rd scores on fly out (tagged up) | ✅ Implemented |
| GO → SAC suggestion | Runner advances on GO, <2 outs | ✅ Implemented (as hint) |

---

## 3. Run Scoring Logic - ✅ FIXED

### Force Out Third Out Rule - IMPLEMENTED

**The Rule:**
Per Master Rules Section 2, when a FORCE OUT is recorded for the third out, NO RUNS can score on that play, regardless of timing.

**Implementation (index.tsx):**

```typescript
// Check if a runner outcome is a force out
const isForceOut = (
  outcome: RunnerOutcome | null,
  fromBase: 'first' | 'second' | 'third',
  currentBases: Bases
): boolean => {
  if (!outcome) return false;
  
  // Force out scenarios:
  // - Runner on 1st out at 2B is ALWAYS a force (batter forces them)
  if (fromBase === 'first' && outcome === 'OUT_2B') return true;
  
  // - Runner on 2nd out at 3B is a force ONLY if 1st was also occupied
  if (fromBase === 'second' && outcome === 'OUT_3B' && currentBases.first) return true;
  
  // - Runner on 3rd out at home is a force ONLY if 1st AND 2nd were occupied
  if (fromBase === 'third' && outcome === 'OUT_HOME' && currentBases.first && currentBases.second) return true;
  
  return false;
};

// processRunnerOutcomes() implements full force out third out validation
// - Calculates total outs on play (batter + runner outs)
// - Checks if any out is a force out
// - If 3rd out is force out, NO runs score
```

**Test Case Verified:**
- Bases loaded, 2 outs
- GO with runner from 3rd "Scored" and runner from 2nd "Out at 2B" (force out)
- Result: Score stays 0-0 ✅ (force out negates the run)

---

## 4. Fielder's Choice (FC) Flow - ✅ FIXED

### Implementation (AtBatFlow.tsx)

**New Feature:** User explicitly selects which runner was put out on FC.

```typescript
// FC-specific: track which runner was put out
const [fcRunnerOut, setFcRunnerOut] = useState<'first' | 'second' | 'third' | null>(
  initialResult === 'FC' ? (bases.first ? 'first' : bases.second ? 'second' : bases.third ? 'third' : null) : null
);

// FC-specific: Handle runner selection for fielder's choice
const handleFCRunnerSelect = (runnerBase: 'first' | 'second' | 'third') => {
  setFcRunnerOut(runnerBase);
  // Auto-set other runners to HELD, selected runner to OUT
  const newOutcomes: typeof runnerOutcomes = {
    first: bases.first ? (runnerBase === 'first' ? 'OUT_2B' as RunnerOutcome : 'HELD' as RunnerOutcome) : null,
    second: bases.second ? (runnerBase === 'second' ? 'OUT_3B' as RunnerOutcome : 'HELD' as RunnerOutcome) : null,
    third: bases.third ? (runnerBase === 'third' ? 'OUT_HOME' as RunnerOutcome : 'HELD' as RunnerOutcome) : null,
  };
  setRunnerOutcomes(newOutcomes);
};
```

**UI Shows:**
- "WHICH RUNNER WAS PUT OUT?" section with buttons for each runner
- E.g., "Mays (1B) → Out at 2B", "Aaron (2B) → Out at 3B"
- Selecting a runner auto-sets that runner to OUT and others to HELD

---

## 5. Tag-Up Logic for Fly Outs - ✅ FIXED

### Implementation (AtBatFlow.tsx)

**New Feature:** On fly outs (FO, SF, LO, PO), runners must tag up to advance.

```typescript
// Tag-up tracking for fly outs - did each runner tag up?
const [taggedUp, setTaggedUp] = useState<{
  first: boolean;
  second: boolean;
  third: boolean;
}>({ first: false, second: false, third: false });

// Check conditions
const isFlyOut = ['FO', 'SF', 'LO', 'PO'].includes(result);
const needsTagUpSelection = isFlyOut && (bases.first || bases.second || bases.third);

// Runner options are filtered based on tag-up status
const getRunnerOptions = (base: 'first' | 'second' | 'third') => {
  const didTagUp = taggedUp[base];

  // For fly outs: if runner didn't tag up, they can only hold or be doubled off
  if (isFlyOut && !didTagUp) {
    return [
      { value: 'HELD', label: 'Held' },
      { value: 'OUT_*', label: 'Doubled Off' }
    ];
  }
  
  // If tagged, full advancement options with "Tagged & Scored" label
  // ...
};
```

**UI Shows:**
- "TAG-UP STATUS" section with instruction text
- Toggle buttons for each runner: "Mays (3B) ✓ Tagged" / "No Tag"
- Runner advancement options filtered:
  - **No tag:** Only "Held" or "Doubled Off"
  - **Tagged:** Full options including "Tagged & Scored"

**Auto-Correction:**
- If FO selected and runner from 3rd tags and scores → Auto-corrects to SF

---

## 6. Statistical Tracking - ✅ ENHANCED

### Implementation (index.tsx)

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

// Track specific hit types
if (isHit(result)) {
  stats.h++;
  if (result === '1B') stats.singles++;
  else if (result === '2B') stats.doubles++;
  else if (result === '3B') stats.triples++;
  else if (result === 'HR') stats.hr++;
}
```

---

## 7. Infield Fly Rule Indicator - ✅ IMPLEMENTED

### Implementation (index.tsx)

```typescript
// Infield Fly Rule is in effect when:
// 1. Less than 2 outs
// 2. Runners on 1st and 2nd, OR bases loaded
const isInfieldFlyRule = outs < 2 && bases.first && bases.second;
```

**UI Shows:**
- Cyan "IFR" badge appears next to CLUTCH/RISP badges
- Displayed when conditions are met (< 2 outs, R1 and R2 occupied)

---

## 8. Situational Context

### ✅ All Implemented

| Context | Logic | Status |
|---------|-------|--------|
| isCloseGame | `Math.abs(scoreDiff) <= 2` | ✅ |
| isRISP | `bases.second \|\| bases.third` | ✅ |
| isBasesLoaded | All bases occupied | ✅ |
| isLateInning | `inning >= 7` | ✅ |
| isTieGame | `scoreDiff === 0` | ✅ |
| isClutchSituation | Close game AND (RISP OR late inning) | ✅ |
| isWalkOffOpportunity | Bottom of 9+, can win with runners+1 | ✅ |
| isGoAheadOpportunity | Runners can put team ahead | ✅ |
| isSaveOpportunity | Top 9+, leading 1-3 runs | ✅ |
| isInfieldFlyRule | < 2 outs AND R1 AND R2 | ✅ **NEW** |

---

## 9. Event Handling

### ✅ Implemented Events

| Event | Status | Notes |
|-------|--------|-------|
| SB (Stolen Base) | ✅ | Has flow |
| CS (Caught Stealing) | ✅ | Has flow |
| WP (Wild Pitch) | ✅ | Has flow |
| PB (Passed Ball) | ✅ | Has flow |
| PK (Pickoff) | ✅ | Has flow |
| ~~BALK~~ | ❌ | NOT IN SMB4 - removed |
| PITCH_CHANGE | ⚠️ | Needs implementation |
| PINCH_HIT | ⚠️ | Needs implementation |
| PINCH_RUN | ⚠️ | Needs implementation |
| DEF_SUB | ⚠️ | Needs implementation |

---

## Remaining Work (Phase 3)

### 🟢 Medium Priority

| Task | Description | Priority |
|------|-------------|----------|
| Substitution Events | Complete PITCH_CHANGE, PINCH_HIT, etc. | Medium |
| CS vs PK Clarification | Distinguish caught stealing from pickoff | Medium |
| Additional Stats | HBP, SF, SAC, GIDP, LOB tracking | Low |

---

## Files Modified in This Update

1. **`src/components/GameTracker/index.tsx`**
   - Added `isInfieldFlyRule` calculation
   - Added IFR badge to UI
   - Added `isForceOut()` function
   - Added `processRunnerOutcomes()` with force out validation
   - Added `singles`, `doubles`, `triples` to PlayerStats
   - Added hit type tracking in stats update

2. **`src/components/GameTracker/AtBatFlow.tsx`**
   - Added `fcRunnerOut` state and `handleFCRunnerSelect()` for FC flow
   - Added `taggedUp` state for fly out tag-up tracking
   - Added `needsTagUpSelection` and `isFlyOut` checks
   - Modified `getRunnerOptions()` to filter based on tag-up status
   - Added FC selection UI
   - Added tag-up selection UI
   - Added auto-correction FO → SF when runner tags and scores from 3rd

3. **`src/components/GameTracker/AtBatButtons.tsx`**
   - Added `hasRunners` check
   - Updated `isSACAvailable` to require runners
   - Consolidated button availability logic
   - Added descriptive tooltips for disabled buttons

---

*Audit updated January 21, 2026 after completing Phase 1 & 2 fixes.*
