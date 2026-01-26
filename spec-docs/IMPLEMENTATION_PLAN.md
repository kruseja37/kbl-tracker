# KBL Tracker Implementation Plan v5

> **Created**: January 25, 2026
> **Updated**: January 25, 2026 (Post-Day 0 Deep Audit)
> **Status**: Day 0 COMPLETE - Ready for Phase 1
> **Methodology**: ✅ Audit Complete → Connect Orphans → Close Gaps → Fix Bugs → Polish
>
> **Sprint Goal**: Wire all orphaned engines to UI, close known gaps, fix remaining bugs

---

## What Changed (v5 Update)

**Day 0 Deep Audit COMPLETED** - All 3 partial specs fully audited:

1. **STAT_TRACKING_ARCHITECTURE_SPEC.md** - ✅ FULLY VERIFIED
   - All 4 implemented phases match spec
   - 11 IndexedDB stores verified
   - All derived stat formulas match (AVG, OBP, SLG, ERA, WHIP)
   - Phase 5 (Export/Cloud) documented as POST-MVP

2. **OFFSEASON_SYSTEM_SPEC.md** - ⚠️ PARTIALLY IMPLEMENTED (as expected)
   - Phase 1 (Season End Processing): ✅ Working
   - Team MVP/Ace/Cornerstone: ✅ Fully implemented
   - Legacy Status tiers: ✅ Implemented
   - Phases 2-10 (Awards, FA, Draft, etc.): ❌ Explicitly NOT IMPLEMENTED - shown as "Coming Soon" in UI

3. **ADAPTIVE_STANDARDS_ENGINE_SPEC.md** - ✅ FULLY VERIFIED (Static v1)
   - All 22 SMB4_BASELINES constants match
   - All 7 linear weights match (Jester GUTS method)
   - All 6 wOBA weights match
   - All scaling functions verified
   - Phases 2-5 (dynamic learning) documented as POST-MVP

---

## MANDATORY: Three-Tier NFL Verification Protocol

### ⚠️ CRITICAL: Complete ALL THREE tiers BEFORE marking any task complete

```
┌────────────────────────────────────────────────────────────────┐
│  NFL VERIFICATION CHECKLIST (Required for EVERY task)          │
├────────────────────────────────────────────────────────────────┤
│  TIER 1: BUILD & TESTS                                         │
│  □ `npm run build` → Exit code 0                               │
│  □ `npm test` → All tests pass                                 │
│  □ Paste ACTUAL terminal output (not "it passed")              │
│                                                                │
│  TIER 2: DATA FLOW TRACE (file:line for EACH step)            │
│  □ UI INPUT:     [file.tsx]:[line] - Component that collects   │
│  □ STORAGE:      [file.ts]:[line] - Function that writes       │
│  □ CALLED FROM:  [file.tsx]:[line] - Where storage invoked     │
│  □ CALCULATOR:   [file.ts]:[line] - Engine that processes      │
│  □ CALLED FROM:  [file.tsx]:[line] - Where calculator invoked  │
│  □ DISPLAY:      [file.tsx]:[line] - Component that shows      │
│  □ RENDERS IN:   [file.tsx]:[line] - Where display used        │
│                                                                │
│  TIER 3: EXTERNAL VERIFICATION                                 │
│  □ Browser screenshot of feature working, OR                   │
│  □ IndexedDB inspection showing persisted data, OR             │
│  □ Console output showing data flow, OR                        │
│  □ "UNVERIFIED - User should test: [specific steps]"           │
├────────────────────────────────────────────────────────────────┤
│  If ANY tier fails → Status = INCOMPLETE, not "complete"       │
└────────────────────────────────────────────────────────────────┘
```

### Anti-Hallucination Rules

**NEVER say these without PROOF:**
- ❌ "This should work"
- ❌ "The feature is complete"
- ❌ "I've verified this works"

**ALWAYS require ONE of these:**
- ✅ `npm run build` exit 0 (show actual output)
- ✅ `npm test` with passing count (show actual output)
- ✅ Browser screenshot showing feature working
- ✅ Complete file:line trace for data flow

---

## Audit Summary (Day 0 Complete)

### Specs Fully Audited (20 total)

| Spec File | Status | Notes |
|-----------|--------|-------|
| BWAR_CALCULATION_SPEC.md | ✅ VERIFIED | SMB4 calibrations documented |
| PWAR_CALCULATION_SPEC.md | ✅ VERIFIED | Minor spec inconsistencies resolved |
| FWAR_CALCULATION_SPEC.md | ✅ VERIFIED | ❌ ORPHANED - needs connection |
| RWAR_CALCULATION_SPEC.md | ✅ VERIFIED | ❌ ORPHANED - needs connection |
| MWAR_CALCULATION_SPEC.md | ✅ VERIFIED | ❌ ORPHANED - needs connection |
| LEVERAGE_INDEX_SPEC.md | ✅ VERIFIED | Connected to 8 files |
| CLUTCH_ATTRIBUTION_SPEC.md | ✅ VERIFIED | ❌ ORPHANED - needs connection |
| MOJO_FITNESS_SYSTEM_SPEC.md | ✅ VERIFIED | ❌ ORPHANED - needs connection |
| SALARY_SYSTEM_SPEC.md | ✅ VERIFIED | Blocked on ratings data |
| FAME_SYSTEM_TRACKING.md | ✅ VERIFIED | Connected |
| FIELDING_SYSTEM_SPEC.md | ✅ VERIFIED | 16 requirements verified |
| SUBSTITUTION_FLOW_SPEC.md | ✅ VERIFIED | 7 requirements verified |
| FAN_MORALE_SYSTEM_SPEC.md | ✅ VERIFIED | Connected |
| NARRATIVE_SYSTEM_SPEC.md | ✅ VERIFIED | Templates working, Claude API POST-MVP |
| MILESTONE_SYSTEM_SPEC.md | ✅ VERIFIED | Connected, UI missing |
| SPECIAL_EVENTS_SPEC.md | ✅ VERIFIED | Fame events connected |
| RUNNER_ADVANCEMENT_RULES.md | ✅ VERIFIED | Inference logic working |
| **STAT_TRACKING_ARCHITECTURE_SPEC.md** | ✅ VERIFIED | Phase 5 POST-MVP |
| **OFFSEASON_SYSTEM_SPEC.md** | ⚠️ PARTIAL | Phase 1 only; Phases 2-10 POST-MVP |
| **ADAPTIVE_STANDARDS_ENGINE_SPEC.md** | ✅ VERIFIED | Static v1; Phases 2-5 POST-MVP |

### Critical Finding: 6 Orphaned Engines

| Engine | File | Tests Pass? | Connected? | Target Day |
|--------|------|-------------|------------|------------|
| fWAR Calculator | fwarCalculator.ts | ✅ | ❌ ORPHANED | Day 1 |
| rWAR Calculator | rwarCalculator.ts | ✅ | ❌ ORPHANED | Day 1 |
| mWAR Calculator | mwarCalculator.ts | ✅ | ❌ ORPHANED | Day 2 |
| Clutch Calculator | clutchCalculator.ts | ✅ | ❌ ORPHANED | Day 2 |
| Mojo Engine | mojoEngine.ts | ✅ | ❌ ORPHANED | Day 3 |
| Fitness Engine | fitnessEngine.ts | ✅ | ❌ ORPHANED | Day 3 |

### Known Gaps

| Gap | Spec | Priority | Target Day |
|-----|------|----------|------------|
| IBB Tracking | BWAR_CALCULATION_SPEC | MEDIUM | Day 5 |
| Player Ratings Data | SALARY_SYSTEM_SPEC | HIGH | Day 5 |
| Milestone Watch UI | MILESTONE_SYSTEM_SPEC | MEDIUM | Day 6 |
| Fame Events During Game | SPECIAL_EVENTS_SPEC | MEDIUM | Day 7 |
| Park Factor (Pitching) | PWAR_CALCULATION_SPEC | LOW | POST-MVP |
| Claude API Narrative | NARRATIVE_SYSTEM_SPEC | LOW | POST-MVP |

### Remaining Bugs

| Bug | Description | Priority | Target Day |
|-----|-------------|----------|------------|
| BUG-006 | No Mojo/Fitness in scoreboard | HIGH | Day 3 |
| BUG-007 | No Fame events during game | MEDIUM | Day 7 |
| BUG-008 | End Game modal wrong data | MEDIUM | Day 7 |
| BUG-009 | No undo button | HIGH | Day 4 |
| BUG-011 | No pitch count displayed | MEDIUM | Day 4 |
| BUG-012 | Pitcher exit prompt missing | MEDIUM | Day 8 |
| BUG-014 | No inning summary | LOW | Day 9 |

---

## 2-Week Sprint Plan

### ~~PHASE 0: Complete Partial Audits~~ ✅ COMPLETE

**Status**: Day 0 completed January 25, 2026

All 3 partial specs deep audited with:
- File:line evidence for all requirements
- Grep results showing actual code matches
- POST-MVP items explicitly documented
- Audit report updated

---

### PHASE 1: Connect Orphaned Engines (Days 1-4)

#### Day 1: Wire fWAR + rWAR to useWARCalculations

**Goal**: fWAR and rWAR appear in WAR leaderboards alongside bWAR/pWAR

**Tasks**:

| # | Task | File | Change |
|---|------|------|--------|
| 1.1 | Import fwarCalculator | useWARCalculations.ts | Add import |
| 1.2 | Import rwarCalculator | useWARCalculations.ts | Add import |
| 1.3 | Add fWAR calculation call | useWARCalculations.ts | Calculate per-player fWAR |
| 1.4 | Add rWAR calculation call | useWARCalculations.ts | Calculate per-player rWAR |
| 1.5 | Update return type | useWARCalculations.ts | Include fWAR, rWAR |
| 1.6 | Update WARDisplay | WARDisplay.tsx | Show fWAR + rWAR columns |
| 1.7 | Update PlayerCard | PlayerCard.tsx | Show WAR breakdown |

**NFL Verification Required (Day 1)**:

```
TIER 1: BUILD & TESTS
□ npm run build → Exit code: ___
□ npm test → Passing: ___ / ___
□ Paste actual terminal output here

TIER 2: DATA FLOW TRACE (fWAR)
□ UI INPUT:     FieldingModal.tsx:___ - Fielding data collected
□ STORAGE:      eventLog.ts:___ - logFieldingEvent()
□ CALLED FROM:  AtBatFlow.tsx:___ - submitFieldingData()
□ CALCULATOR:   fwarCalculator.ts:___ - calculateFWAR()
□ CALLED FROM:  useWARCalculations.ts:___ - (NEW CALL)
□ DISPLAY:      WARDisplay.tsx:___ - fWAR column
□ RENDERS IN:   index.tsx:___ - WARPanel

TIER 3: EXTERNAL VERIFICATION
□ Browser test: Record 5 fielding plays
□ Verify fWAR appears in WAR panel
□ Screenshot taken: Yes/No

VERDICT: [ VERIFIED | UNVERIFIED | INCOMPLETE ]
```

---

#### Day 2: Wire mWAR + Clutch Calculator

**Goal**: mWAR and Clutch stats visible in displays

**Tasks**:

| # | Task | File | Change |
|---|------|------|--------|
| 2.1 | Create useMWARCalculations hook | hooks/useMWARCalculations.ts | NEW |
| 2.2 | Create useClutchCalculations hook | hooks/useClutchCalculations.ts | NEW |
| 2.3 | Track manager decisions | GameTracker/index.tsx | Call mWAR after subs |
| 2.4 | Display mWAR | SeasonSummary.tsx | Add mWAR section |
| 2.5 | Display Clutch | PlayerCard.tsx | Add clutch section |
| 2.6 | Create ClutchLeaderboard | SeasonLeaderboards.tsx | Add clutch tab |

**NFL Verification Required (Day 2)**:

```
TIER 1: BUILD & TESTS
□ npm run build → Exit code: ___
□ npm test → Passing: ___ / ___
□ Paste actual terminal output here

TIER 2: DATA FLOW TRACE (mWAR)
□ UI INPUT:     index.tsx:___ - Substitution events
□ STORAGE:      transactionStorage.ts:___ - Decision events
□ CALLED FROM:  index.tsx:___ - after handlePinchHitter
□ CALCULATOR:   mwarCalculator.ts:___ - calculateMWAR()
□ CALLED FROM:  useMWARCalculations.ts:___ - (NEW HOOK)
□ DISPLAY:      SeasonSummary.tsx:___ - mWAR section
□ RENDERS IN:   SeasonSummary modal

TIER 2: DATA FLOW TRACE (Clutch)
□ UI INPUT:     AtBatFlow.tsx:___ - At-bat with LI
□ STORAGE:      eventLog.ts:___ - AtBatEvent.leverageIndex
□ CALLED FROM:  AtBatFlow.tsx:___ - handleSubmitAtBat()
□ CALCULATOR:   clutchCalculator.ts:___ - calculateClutchValue()
□ CALLED FROM:  useClutchCalculations.ts:___ - (NEW HOOK)
□ DISPLAY:      PlayerCard.tsx:___ - Clutch section
□ RENDERS IN:   PlayerCard modal

TIER 3: EXTERNAL VERIFICATION
□ Browser test: Make substitutions, verify mWAR
□ Browser test: High LI at-bats, verify clutch
□ Screenshot taken: Yes/No

VERDICT: [ VERIFIED | UNVERIFIED | INCOMPLETE ]
```

---

#### Day 3: Wire Mojo + Fitness Engines (Fixes BUG-006)

**Goal**: Mojo and Fitness visible in Scoreboard

**Tasks**:

| # | Task | File | Change |
|---|------|------|--------|
| 3.1 | Create useMojoState hook | hooks/useMojoState.ts | NEW |
| 3.2 | Create useFitnessState hook | hooks/useFitnessState.ts | NEW |
| 3.3 | Add Mojo triggers | GameTracker/index.tsx | Call after events |
| 3.4 | Add Fitness updates | GameTracker/index.tsx | Call after games |
| 3.5 | Create MojoFitnessDisplay | MojoFitnessDisplay.tsx | NEW component |
| 3.6 | Add to Scoreboard | Scoreboard.tsx | Show mojo/fitness |
| 3.7 | Add to PlayerCard | PlayerCard.tsx | Show mojo history |

**Mojo Triggers** (from MOJO_FITNESS_SYSTEM_SPEC.md):
- HR: +1 (grand slam: +2)
- 3+ hit game: +1
- Strikeout: -1 (3 consecutive: additional -1)
- Error: -1
- Walk-off: +2

**NFL Verification Required (Day 3)**:

```
TIER 1: BUILD & TESTS
□ npm run build → Exit code: ___
□ npm test → Passing: ___ / ___
□ Paste actual terminal output here

TIER 2: DATA FLOW TRACE (Mojo)
□ UI INPUT:     index.tsx:___ - At-bat events
□ STORAGE:      (localStorage or IndexedDB):___ - Mojo states
□ CALLED FROM:  index.tsx:___ - after handleSubmitAtBat()
□ CALCULATOR:   mojoEngine.ts:___ - updateMojoForEvent()
□ CALLED FROM:  useMojoState.ts:___ - (NEW HOOK)
□ DISPLAY:      Scoreboard.tsx:___ - MojoFitnessDisplay
□ RENDERS IN:   Scoreboard component

TIER 3: EXTERNAL VERIFICATION
□ Browser test: HR → verify mojo increases
□ Browser test: K → verify mojo decreases
□ Scoreboard shows mojo/fitness: Yes/No
□ BUG-006 resolved: Yes/No
□ Screenshot taken: Yes/No

VERDICT: [ VERIFIED | UNVERIFIED | INCOMPLETE ]
```

---

#### Day 4: Integration Testing + Bug Fixes (BUG-009, BUG-011)

**Goal**: All engines work end-to-end

**Tasks**:

| # | Task | Description |
|---|------|-------------|
| 4.1 | Integration test | Play full 9-inning game |
| 4.2 | Verify all WAR components | Check bWAR, fWAR, rWAR, pWAR display |
| 4.3 | BUG-009: Add undo button | Visible undo in UI |
| 4.4 | BUG-011: Pitch count display | Show in Scoreboard |

**NFL Verification Required (Day 4)**:

```
TIER 1: BUILD & TESTS
□ npm run build → Exit code: ___
□ npm test → Passing: ___ / ___

TIER 2: FULL GAME TEST
□ Play complete 9-inning game
□ WAR leaderboard shows: bWAR ✓ pWAR ✓ fWAR ✓ rWAR ✓
□ PlayerCard shows: clutch ✓ mojo ✓ fitness ✓
□ Scoreboard shows: mojo ✓ fitness ✓ pitch count ✓
□ Undo button: visible ✓ functional ✓

TIER 3: BUG VERIFICATION
□ BUG-009 (Undo): Works / Still broken
□ BUG-011 (Pitch count): Works / Still broken

VERDICT: [ VERIFIED | UNVERIFIED | INCOMPLETE ]
```

---

### PHASE 2: Close Known Gaps (Days 5-7)

#### Day 5: IBB Tracking + Player Ratings Data Model

**Goal**: IBB tracked for wOBA, ratings available for salary

**Tasks**:

| # | Task | File | Change |
|---|------|------|--------|
| 5.1 | Add IBB to AtBatEvent | game.ts | Ensure isIntentionalWalk exists |
| 5.2 | Track IBB in storage | eventLog.ts | Persist IBB flag |
| 5.3 | Use IBB in bWAR | bwarCalculator.ts | Update wOBA calculation |
| 5.4 | Create PlayerRatings type | types/player.ts | NEW |
| 5.5 | Create ratingsStorage | storage/ratingsStorage.ts | NEW |
| 5.6 | Add ratings to game setup | GameSetup flow | UI for ratings |
| 5.7 | Wire ratings to salary | PlayerCard.tsx | Pass to salary calc |

**NFL Verification Required (Day 5)**: Same template as above

---

#### Day 6: Milestone Watch UI

**Goal**: Show approaching milestones during game

**Tasks**:

| # | Task | File | Change |
|---|------|------|--------|
| 6.1 | Create MilestoneWatch component | MilestoneWatch.tsx | NEW |
| 6.2 | Create useMilestoneWatch hook | useMilestoneWatch.ts | NEW |
| 6.3 | Integrate with game flow | index.tsx | Show alerts |
| 6.4 | Add to Scoreboard | Scoreboard.tsx | Display proximity |

**NFL Verification Required (Day 6)**: Same template as above

---

#### Day 7: Fame Events During Game + End Game Fix (BUG-007, BUG-008)

**Goal**: Fame toasts during game, correct end game summary

**Tasks**:

| # | Task | File | Change |
|---|------|------|--------|
| 7.1 | BUG-007: Fame during game | index.tsx | Show notifications |
| 7.2 | Create FameToast component | FameToast.tsx | NEW |
| 7.3 | Wire to useFameDetection | index.tsx | Trigger toasts |
| 7.4 | BUG-008: Fix End Game modal | EndGameSummary | Correct data |

**NFL Verification Required (Day 7)**: Same template as above

---

### PHASE 3: Bug Fixes & Polish (Days 8-10)

#### Day 8: Pitcher Management (BUG-012)

**Tasks**:
- Pitcher exit prompt when tiring
- Pitch count thresholds (85, 100, 115)
- Fatigue indicator in Scoreboard

#### Day 9: UI Polish (BUG-014)

**Tasks**:
- Inning summary at inning end
- Flow improvements
- Confirmation dialogs
- Responsive layout

#### Day 10: Final Integration Testing

**Full Verification Checklist**:
```
□ npm run build → Exit 0
□ All tests pass
□ Full 9-inning game played
□ All WAR components display (bWAR, pWAR, fWAR, rWAR)
□ Mojo/Fitness visible in scoreboard
□ Clutch stats in PlayerCard
□ mWAR in SeasonSummary
□ Fame events toast during game
□ Milestone watch working
□ Pitch count displayed
□ Undo button functional
□ End game summary correct
□ Data persists after refresh
```

---

### PHASE 4: Buffer / Stretch Goals (Days 11-14)

**Reserved for:**
- Bug fixes discovered during testing
- Performance optimization
- Documentation updates

**Post-MVP Items (explicitly deferred)**:
- OFFSEASON_SYSTEM: Phases 2-10 (Awards, FA, Draft, Trades, etc.)
- ADAPTIVE_STANDARDS: Phases 2-5 (Dynamic league learning)
- STAT_TRACKING: Phase 5 (Export/Cloud sync)
- Park factor for pitching
- Claude API for narrative

---

## Engine Connection Status Matrix

| Engine | UI Hook | Storage | Calculator | Display | Status |
|--------|---------|---------|------------|---------|--------|
| bWAR | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| pWAR | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| fWAR | ❌ | ✅ | ✅ | ❌ | Day 1 |
| rWAR | ❌ | ⚠️ | ✅ | ❌ | Day 1 |
| mWAR | ❌ | ⚠️ | ✅ | ❌ | Day 2 |
| Clutch | ❌ | ✅ | ✅ | ❌ | Day 2 |
| Mojo | ❌ | ❌ | ✅ | ❌ | Day 3 |
| Fitness | ❌ | ❌ | ✅ | ❌ | Day 3 |
| Leverage | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Fame | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Salary | ⚠️ | ❌ | ✅ | ✅ | Day 5 |
| Fan Morale | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Narrative | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Milestone | ✅ | ✅ | ✅ | ❌ | Day 6 |

---

## Success Criteria (v5)

Sprint complete when:

1. ✅ **All audits complete**: Day 0 finished - all specs audited
2. **All engines connected**: fWAR, rWAR, mWAR, Clutch, Mojo, Fitness wired to UI
3. **Gaps closed**: IBB tracking, Player ratings, Milestone watch
4. **Bugs fixed**: BUG-006, 007, 008, 009, 011, 012, 014
5. **Build succeeds**: `npm run build` exits 0
6. **All tests pass**: 267+ tests green
7. **End-to-end tested**: Full game with all features visible
8. **NFL verified**: Each day's completion includes 3-tier verification

---

*Last Updated: January 25, 2026 (v5 - Post Day 0 Deep Audit)*
