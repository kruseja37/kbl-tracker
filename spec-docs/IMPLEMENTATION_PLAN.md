# KBL Tracker Implementation Plan v5

> **Created**: January 25, 2026
> **Updated**: February 12, 2026 (Reconciled against actual implementation state)
> **Status**: Phase 1 MOSTLY COMPLETE — 4/6 orphaned engines wired, 5/7 bugs fixed
> **Methodology**: ✅ Audit Complete → Connect Orphans → Close Gaps → Fix Bugs → Polish
>
> **Sprint Goal**: Wire all orphaned engines to UI, close known gaps, fix remaining bugs

---

## What Changed (Feb 12, 2026 Update)

Reconciled this plan against actual codebase state. Many items marked as TODO were
already completed in recent sessions but never updated here.

**Engines wired since Jan 25:**
- ✅ mWAR — `useMWARCalculations` hook wired to GameTracker.tsx:199
- ✅ Mojo — `usePlayerState` hook integrates mojoEngine → GameTracker.tsx:181
- ✅ Fitness — `usePlayerState` hook integrates fitnessEngine → GameTracker.tsx:181

**Still orphaned:**
- ❌ fWAR — calculator runs via useWARCalculations but no UI display column
- ❌ rWAR — calculator runs via useWARCalculations but no UI display column
- ❌ Clutch — `useClutchCalculations.ts` hook exists but NOT imported in GameTracker

**Bugs fixed since Jan 25:**
- ✅ BUG-009 (Undo button) — UndoSystem.tsx → GameTracker.tsx:317
- ✅ BUG-011 (Pitch count) — useGameState.ts pitchCountPrompt
- ✅ BUG-012 (Pitcher exit prompt) — useGameState.ts:3311

**Data integrity fixes (Feb 12, Batches 1A-F3):**
- ✅ 21/21 issues resolved (see DATA_INTEGRITY_FIX_REPORT.md)
- Including: WPA system, substitution validation, autoCorrectResult, walk-off, isPlayoff, SB/CS

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
| FWAR_CALCULATION_SPEC.md | ✅ VERIFIED | ⚠️ No UI display — calculator runs but results hidden |
| RWAR_CALCULATION_SPEC.md | ✅ VERIFIED | ⚠️ No UI display — calculator runs but results hidden |
| MWAR_CALCULATION_SPEC.md | ✅ VERIFIED | ✅ WIRED — useMWARCalculations hook |
| LEVERAGE_INDEX_SPEC.md | ✅ VERIFIED | Connected to 8 files |
| CLUTCH_ATTRIBUTION_SPEC.md | ✅ VERIFIED | ❌ ORPHANED — hook exists but not imported |
| MOJO_FITNESS_SYSTEM_SPEC.md | ✅ VERIFIED | ✅ WIRED — usePlayerState hook |
| SALARY_SYSTEM_SPEC.md | ✅ VERIFIED | Blocked on ratings data |
| FAME_SYSTEM_TRACKING.md | ✅ VERIFIED | Connected |
| FIELDING_SYSTEM_SPEC.md | ✅ VERIFIED | 16 requirements verified |
| SUBSTITUTION_FLOW_SPEC.md | ✅ VERIFIED | ✅ Validation wired (Feb 12 Batch F3) |
| FAN_MORALE_SYSTEM_SPEC.md | ✅ VERIFIED | Connected |
| NARRATIVE_SYSTEM_SPEC.md | ✅ VERIFIED | Templates working, Claude API POST-MVP |
| MILESTONE_SYSTEM_SPEC.md | ✅ VERIFIED | Connected, UI missing |
| SPECIAL_EVENTS_SPEC.md | ✅ VERIFIED | Fame events connected |
| RUNNER_ADVANCEMENT_RULES.md | ✅ VERIFIED | Inference logic working |
| **STAT_TRACKING_ARCHITECTURE_SPEC.md** | ✅ VERIFIED | Phase 5 POST-MVP |
| **OFFSEASON_SYSTEM_SPEC.md** | ⚠️ PARTIAL | Phase 1 only; Phases 2-10 POST-MVP |
| **ADAPTIVE_STANDARDS_ENGINE_SPEC.md** | ✅ VERIFIED | Static v1; Phases 2-5 POST-MVP |

### Engine Connection Status (Updated Feb 12)

| Engine | File | Tests Pass? | Connected? | Status |
|--------|------|-------------|------------|--------|
| fWAR Calculator | fwarCalculator.ts | ✅ | ⚠️ Runs but no UI display | Needs display column |
| rWAR Calculator | rwarCalculator.ts | ✅ | ⚠️ Runs but no UI display | Needs display column |
| mWAR Calculator | mwarCalculator.ts | ✅ | ✅ WIRED | useMWARCalculations hook |
| Clutch Calculator | clutchCalculator.ts | ✅ | ❌ ORPHANED | Hook exists, not imported |
| Mojo Engine | mojoEngine.ts | ✅ | ✅ WIRED | usePlayerState hook |
| Fitness Engine | fitnessEngine.ts | ✅ | ✅ WIRED | usePlayerState hook |

### Known Gaps

| Gap | Spec | Priority | Status |
|-----|------|----------|--------|
| IBB Tracking | BWAR_CALCULATION_SPEC | MEDIUM | TODO |
| Player Ratings Data | SALARY_SYSTEM_SPEC | HIGH | TODO |
| Milestone Watch UI | MILESTONE_SYSTEM_SPEC | MEDIUM | TODO |
| Fame Events During Game | SPECIAL_EVENTS_SPEC | MEDIUM | TODO |
| Park Factor (Pitching) | PWAR_CALCULATION_SPEC | LOW | POST-MVP |
| Claude API Narrative | NARRATIVE_SYSTEM_SPEC | LOW | POST-MVP |

### Bug Status (Updated Feb 12)

| Bug | Description | Priority | Status |
|-----|-------------|----------|--------|
| BUG-006 | No Mojo/Fitness in scoreboard | HIGH | **TODO** — usePlayerState wired but scoreboard display missing |
| BUG-007 | No Fame events during game | MEDIUM | **TODO** |
| BUG-008 | End Game modal wrong data | MEDIUM | **TODO** |
| BUG-009 | No undo button | HIGH | ✅ **FIXED** — UndoSystem.tsx → GameTracker.tsx:317 |
| BUG-011 | No pitch count displayed | MEDIUM | ✅ **FIXED** — useGameState.ts pitchCountPrompt |
| BUG-012 | Pitcher exit prompt missing | MEDIUM | ✅ **FIXED** — useGameState.ts:3311 |
| BUG-014 | No inning summary | LOW | **TODO** |

---

## Remaining Sprint Work

### Still TODO — Orphan Wiring

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 1 | Wire Clutch Calculator | SMALL | Import useClutchCalculations in GameTracker, add display |
| 2 | Add fWAR/rWAR display columns | SMALL | Data already flowing, just no UI column |
| 3 | BUG-006: Mojo/Fitness scoreboard display | MEDIUM | usePlayerState wired, need scoreboard component |

### Still TODO — Gap Closure

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 4 | IBB Tracking in bWAR | SMALL | Ensure isIntentionalWalk persists and feeds wOBA |
| 5 | Player Ratings Data Model | MEDIUM | Types + storage + game setup UI |
| 6 | Milestone Watch UI | MEDIUM | Component + hook + scoreboard integration |
| 7 | Fame Events During Game (BUG-007) | MEDIUM | Toast notifications + detection wiring |
| 8 | End Game Modal Fix (BUG-008) | SMALL | Correct data sources |
| 9 | Inning Summary (BUG-014) | SMALL | Display at inning end |

---

## Engine Connection Status Matrix (Updated Feb 12)

| Engine | UI Hook | Storage | Calculator | Display | Status |
|--------|---------|---------|------------|---------|--------|
| bWAR | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| pWAR | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| fWAR | ✅ | ✅ | ✅ | ❌ | Needs display |
| rWAR | ✅ | ⚠️ | ✅ | ❌ | Needs display |
| mWAR | ✅ | ✅ | ✅ | ⚠️ | ✅ Hook wired, display TBD |
| Clutch | ❌ | ✅ | ✅ | ❌ | Hook orphaned |
| Mojo | ✅ | ✅ | ✅ | ⚠️ | ✅ Wired, scoreboard display missing |
| Fitness | ✅ | ✅ | ✅ | ⚠️ | ✅ Wired, scoreboard display missing |
| Leverage | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| WPA | ✅ | ✅ | ✅ | ⚠️ | ✅ DONE (Feb 12) — display TBD |
| Fame | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Salary | ⚠️ | ❌ | ✅ | ✅ | Blocked on ratings data |
| Fan Morale | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Narrative | ✅ | ✅ | ✅ | ✅ | ✅ DONE |
| Milestone | ✅ | ✅ | ✅ | ❌ | Needs UI |

---

## Success Criteria (Updated Feb 12)

Sprint complete when:

1. ✅ **All audits complete**: Day 0 finished - all specs audited
2. ⚠️ **All engines connected**: 4/6 wired (fWAR/rWAR need display, Clutch orphaned)
3. ❌ **Gaps closed**: IBB tracking, Player ratings, Milestone watch still TODO
4. ⚠️ **Bugs fixed**: 3/7 fixed (BUG-009, 011, 012). BUG-006, 007, 008, 014 remain.
5. ✅ **Build succeeds**: `npm run build` exits 0
6. ✅ **All tests pass**: 5,653 tests green (Feb 12)
7. ❌ **End-to-end tested**: Full game with all features visible
8. ✅ **NFL verified**: Data integrity batches 1A-F3 all verified

---

## Post-MVP Items (Explicitly Deferred)

- OFFSEASON_SYSTEM: Phases 2-10 (Awards, FA, Draft, Trades, etc.)
- ADAPTIVE_STANDARDS: Phases 2-5 (Dynamic league learning)
- STAT_TRACKING: Phase 5 (Export/Cloud sync)
- Park factor for pitching (requires ~30 home games of data)
- Park factor adjustment for bWAR/pWAR (same prerequisite)
- Adaptive league calibration (SMB4 static baselines sufficient for MVP)
- Claude API for narrative

---

*Last Updated: February 12, 2026 (Reconciled against actual codebase state)*
