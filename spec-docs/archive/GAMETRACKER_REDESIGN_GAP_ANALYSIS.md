# GameTracker Redesign - Gap Analysis

> **Purpose**: Compare user's UX vision against current implementation
> **Created**: February 2, 2026
> **Status**: Analysis complete, ready for implementation planning

---

## User's UX Vision Summary

### 5-Step Flow

```
Step 1: Initial Action (HIT / OUT / OTHER)
    ↓
Step 2: Location/Fielding Capture
    ↓
Step 3: Outcome Selection (multi-select buttons)
    ↓
Step 4: Runner Outcomes Confirmation
    ↓
Step 5: End At-Bat Confirmation → Log & Advance
```

### Button Placement
- All buttons appear in **lower-left and/or lower-right corners of foul territory**
- Clean, consistent placement

---

## Step-by-Step Gap Analysis

### STEP 1: Initial Action Selection

**User Vision:**
| Button | Expands To |
|--------|------------|
| **HIT** | → Step 2 (location prompt) |
| **OUT** | → Step 2 (fielding sequence) |
| **OTHER** | BB, IBB, HBP, D3K, SB, CS, PK, TBL, PB, WP, E |

**Current Implementation:**
| What Exists | Location | Status |
|-------------|----------|--------|
| BB, IBB, HBP buttons | Foul territory (scattered) | ✅ EXISTS but wrong grouping |
| K, KL buttons | Foul territory | ❌ Should be under OUT flow |
| HR button | Foul territory | ❌ Should be under HIT flow |
| D3K handling | In FieldingModal | ✅ EXISTS but wrong location |
| SB, CS, PK, TBL, PB, WP | RunnerDragDrop component | ✅ EXISTS but wrong grouping |
| Error (E) | In FieldingModal | ✅ EXISTS but wrong location |

**GAP:**
- ❌ No HIT/OUT/OTHER three-button start
- ❌ Buttons scattered across UI, not grouped logically
- ❌ No "OTHER" expansion menu

---

### STEP 2: Location/Fielding Capture

**User Vision - HIT:**
> "Click location of HIT" → user clicks field (or stands for HR)

**Current Implementation:**
| What Exists | Status |
|-------------|--------|
| Field click captures coordinates | ✅ ALIGNED |
| `BallLandingPromptOverlay` shows "TAP WHERE BALL LANDED" | ✅ ALIGNED |
| Spray chart location stored | ✅ ALIGNED |
| Stands detection for HR | ✅ ALIGNED |

**GAP:** ✅ **ALIGNED** - This works as envisioned

---

**User Vision - OUT:**
> "Complete fielding sequence" → drag fielder to spot → click subsequent fielders → click "Advance"

**Current Implementation:**
| What Exists | Status |
|-------------|--------|
| Drag fielder to ball location | ✅ ALIGNED (just fixed today!) |
| Tap subsequent fielders for throw sequence | ✅ ALIGNED |
| Sequence builds (6-4-3, etc.) | ✅ ALIGNED |
| "Advance" button after sequence | ❌ MISSING - currently auto-advances or uses confirm |

**GAP:**
- ❌ No explicit "Advance" button - currently uses auto-complete or immediate confirm
- ✅ Core drag-drop mechanics work

---

### STEP 3: Outcome Selection

**User Vision - HIT outcomes (multi-select):**
| Button | Current Status |
|--------|----------------|
| 1B | ✅ EXISTS in HitTypeModal |
| 2B | ✅ EXISTS in HitTypeModal |
| 3B | ✅ EXISTS in HitTypeModal |
| HR | ✅ EXISTS in HitTypeModal |
| KP (Killed Pitcher) | ✅ EXISTS as contextual prompt |
| NUT (Nutshot) | ✅ EXISTS as contextual prompt |
| Bunt | ✅ EXISTS as contextual prompt (BUNT) |
| IS (Infield Single) | ❌ MISSING - no distinct category |
| 7+ (7+ pitch AB) | ✅ EXISTS as permanent button |

**User Vision - OUT outcomes (multi-select):**
| Button | Current Status |
|--------|----------------|
| K | ✅ EXISTS but in foul buttons, not outcome flow |
| KL (K-looking) | ✅ EXISTS but in foul buttons |
| GO | ✅ EXISTS in OutTypeModal |
| LO | ✅ EXISTS in OutTypeModal |
| FO | ✅ EXISTS in OutTypeModal |
| PO | ✅ EXISTS in OutTypeModal |
| FLO (Foul-out) | ❌ PARTIALLY - auto-detected, not explicit button |
| DP | ✅ EXISTS in OutTypeModal |
| SF | ✅ EXISTS in OutTypeModal |
| SAC | ✅ EXISTS in OutTypeModal |
| E (Error) | ✅ EXISTS in ErrorTypePopup |
| FC | ✅ EXISTS in OutTypeModal |
| IFR (Infield Fly Rule) | ❌ MISSING in Enhanced - only in Legacy FieldingModal |
| RD (Rundown) | ❌ MISSING - no distinct category |
| WEB (Web Gem) | ✅ EXISTS as contextual prompt |

**GAP:**
- ❌ Outcomes appear in modals, not as button array
- ❌ Not multi-select - currently single selection
- ❌ Missing: IS (Infield Single), RD (Rundown)
- ❌ IFR only in Legacy, not Enhanced
- ❌ FLO is auto-detected, not user-selectable
- ❌ No "Advance" button after selection

---

### STEP 4: Runner Outcomes Confirmation

**User Vision:**
> Confirm where each runner ended; click colored outcome in graphic box OR drag runners to safe/out zone

**Current Implementation:**
| What Exists | Status |
|-------------|--------|
| `RunnerOutcomesDisplay` component | ✅ EXISTS |
| Dropdown for each runner's end base | ✅ EXISTS (as shown in screenshot) |
| Drag runners to bases | ✅ EXISTS in RunnerDragDrop |
| Visual arrows showing movement | ✅ EXISTS in RunnerOutcomeArrows |

**GAP:** ✅ **MOSTLY ALIGNED**
- Current implementation matches vision
- May need UI cleanup for consistency

---

### STEP 5: End At-Bat Confirmation

**User Vision:**
> "End at-bat?" prompt → logs events → updates scores/outs/inning → advances lineup

**Current Implementation:**
| What Exists | Status |
|-------------|--------|
| "END AT-BAT" button | ✅ EXISTS |
| Logs to useGameState | ✅ EXISTS |
| Updates scoreboard | ✅ EXISTS |
| Advances lineup | ✅ EXISTS |
| Explicit "End at-bat?" confirmation prompt | ❌ MISSING - button directly ends |

**GAP:**
- ❌ No confirmation prompt before ending
- ✅ Core logging/advancing mechanics exist

---

## Summary: What Needs to Change

### ✅ ALIGNED (Keep As-Is)
1. Field click for hit location capture
2. Drag-drop fielder to ball location
3. Tap sequence for throws
4. Runner outcome dropdowns
5. Runner drag-drop to bases
6. Core data logging to useGameState
7. Scoreboard/lineup advancement

### ⚠️ PARTIALLY ALIGNED (Needs Modification)
1. **Outcome modals** → Convert to button arrays
2. **Contextual prompts** → Make always-visible in Step 3
3. **Foul-out detection** → Add explicit FLO button
4. **K/KL buttons** → Move from Step 1 to Step 3 (OUT outcomes)

### ❌ NOT ALIGNED (Needs Removal/Replacement)
1. **Scattered foul territory buttons** → Replace with HIT/OUT/OTHER
2. **Auto-complete logic** → Remove; user explicitly selects everything
3. **Multiple modals** → Replace with single-page button flows
4. **Contextual button appearance** → All options always visible

### ❌ MISSING (Needs Building)
| Feature | Priority |
|---------|----------|
| HIT / OUT / OTHER three-button start | HIGH |
| "OTHER" expansion menu | HIGH |
| "Advance" button between steps | HIGH |
| Multi-select outcome buttons | HIGH |
| "End at-bat?" confirmation prompt | MEDIUM |
| IS (Infield Single) category | MEDIUM |
| RD (Rundown) category | MEDIUM |
| IFR button in Enhanced field | MEDIUM |
| Clean button placement in foul corners | HIGH (UI) |

---

## UI Cleanup Needs

Current UI is described as "messy" - specific issues:

1. **Button scatter**: Buttons in multiple locations (foul territory, side panels, modals)
2. **Inconsistent styling**: Different button styles across components
3. **Modal overload**: Too many pop-ups interrupting flow
4. **No clear visual hierarchy**: User doesn't know what to do next

**Proposed UI Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│                         FIELD                                │
│                    (drag-drop area)                          │
│                                                              │
│  [Fielder icons at positions]                                │
│                                                              │
│                                                              │
├──────────────┬────────────────────────────┬─────────────────┤
│   LEFT FOUL  │      HOME PLATE AREA       │   RIGHT FOUL    │
│   BUTTONS    │   (batter info, count)     │   BUTTONS       │
│              │                            │                  │
│  [HIT]       │   [Current Batter Card]    │  [Contextual    │
│  [OUT]       │   [Runners Display]        │   outcomes      │
│  [OTHER]     │                            │   appear here]  │
│              │                            │                  │
└──────────────┴────────────────────────────┴─────────────────┘
```

---

## Files That Will Need Changes

### Core Components (Significant Changes)
| File | Change Type |
|------|-------------|
| `EnhancedInteractiveField.tsx` | Major restructure - new flow |
| `GameTracker.tsx` | Remove scattered buttons, add new flow |
| `playClassifier.ts` | Remove auto-complete, simplify to validation |

### Components to Create
| New Component | Purpose |
|---------------|---------|
| `ActionSelector.tsx` | HIT/OUT/OTHER buttons |
| `OtherActionsMenu.tsx` | BB, IBB, HBP, D3K, SB, etc. |
| `OutcomeButtons.tsx` | Multi-select outcome array |
| `StepIndicator.tsx` | Shows current step (1-5) |
| `ConfirmationPrompt.tsx` | "End at-bat?" dialog |

### Components to Keep (Minor Changes)
| File | Change Type |
|------|-------------|
| `FieldCanvas.tsx` | Keep as-is |
| `FielderIcon.tsx` | Keep drag-drop, minor styling |
| `RunnerDragDrop.tsx` | Keep as-is |
| `RunnerOutcomesDisplay.tsx` | Keep, improve styling |

### Components to Remove/Deprecate
| File | Reason |
|------|--------|
| `HitTypeModal.tsx` | Replace with OutcomeButtons |
| `OutTypeModal.tsx` | Replace with OutcomeButtons |
| `PlayTypeModal.tsx` | Replace with ActionSelector |
| `BatterReachedPopup.tsx` | Fold into new flow |
| Foul territory button sections | Replace with clean HIT/OUT/OTHER |

---

## Next Steps

1. **Confirm this analysis** with user
2. **Prioritize**: Which gaps are must-have vs. nice-to-have?
3. **Design UI mockups** for the new button layout
4. **Create implementation plan** with phases
5. **Build incrementally**, testing each step

---

*End of Gap Analysis*
