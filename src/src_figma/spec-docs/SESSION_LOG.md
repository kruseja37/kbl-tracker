# KBL Tracker Session Log

## Session: 2026-02-03 (Continued)

### Context Recovery
- Session continued from previous context that was compacted
- Previous work: TBL fix, runner outcome persistence, D3K fixes

### Work Completed

#### 1. BASEBALL_LOGIC_AUDIT.md - Major Update
Incorporated three spec documents into the audit:

**RUNNER_ADVANCEMENT_RULES.md findings:**
- D3K exists in SMB4 but **ONLY via K + WP/PB** (swing & miss with 2 strikes)
- Balks, Catcher Interference, Obstruction do NOT exist in SMB4
- Infield Fly Rule IS in SMB4
- Added `isForced()` function documentation
- Added force play validation rules

**AUTO_CORRECTION_SYSTEM_SPEC.md findings:**
- GO → DP auto-correction rules (not yet implemented)
- FO → SF auto-correction (already implemented)
- Button availability rules (WP/PB/SB/CS should be disabled with no runners)
- Force out negates runs on 3rd out rule

**ADAPTIVE_STANDARDS_ENGINE_SPEC.md findings:**
- Opportunity Factor: (games × innings) / (162 × 9)
- SMB4 baselines differ from MLB (.288 AVG vs .250, 4.04 ERA vs 4.25)
- Linear weights calculated via Jester method

#### 2. Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| D3K via K+WP/PB flow | D3K only occurs on strikeout + wild pitch/passed ball in SMB4 |
| Remove Balk option | Balks do NOT exist in SMB4 |
| Keep IFR | Infield Fly Rule IS in SMB4 |
| Add `isForced()` | Need validation to prevent impossible UI states |

#### 3. STAT_TRACKING_ARCHITECTURE_SPEC.md Analysis (Fourth Spec)

Analyzed the stat tracking architecture spec to identify gaps between what the spec requires and what the current UI can capture.

**Critical Tracking Gaps Found (11 total):**

| Gap | Impact |
|-----|--------|
| pitchCount | Field exists but NEVER incremented → Maddux detection fails |
| wildPitches | WP event exists but stats not updated |
| hitBatters (separate) | HBP counted as BB, no separate field |
| basesReachedViaError | Missing from PitcherGameStats → Perfect game fails |
| consecutiveHRsAllowed | Not tracked → Back-to-back HR detection fails |
| inheritedRunners | Not tracked → ER attribution wrong |
| bequeathedRunners | Not tracked → ER attribution wrong |
| ballInPlay.trajectory | Always null → Can't distinguish fly ball vs line drive |
| ballInPlay.velocity | Always null → Hard hit tracking fails |
| fielderIds | Always null → Individual fielding stats impossible |
| hitOrder[] | Not tracked → Cycle detection fails |

**Partial Implementations:**
- SB/CS: Fields exist but `recordEvent` has TODO comment
- Runner IDs: Set to empty string `''` instead of actual IDs
- isStarter/entryInning: Not tracked for pitchers

**Fielding Stats Entirely Missing:**
- Putouts, Assists, Errors per fielder NOT tracked
- Only team-level error exists
- Could be inferred from fielder sequence (6-4-3) but not implemented

**Event Log Gaps:**
- leverageIndex: Should calculate, currently hardcoded 1.0
- winProbability*: Should calculate, currently hardcoded 0.5
- wpa: Should calculate, currently hardcoded 0
- isClutch/isWalkOff: Should detect, currently hardcoded false

**Priority Fixes Added to Audit:**
1. 🔴 CRITICAL: pitchCount input, basesReachedViaError, inherited/bequeathed runners
2. 🟡 HIGH: Separate HBP, hitBatters, hitOrder[], Leverage Index calculation
3. 🟢 MEDIUM: Ball-in-play data, fielding inference, WPA, situational flags

### Pending/Next Steps

1. **CRITICAL**: Remove Balk option from OTHER events
2. Verify D3K is properly integrated into K+WP/PB flow
3. Add `isForced()` validation function to runnerDefaults.ts
4. Hide "Hold" option for forced runners in UI
5. Disable WP/PB/SB/CS buttons when no runners on base
6. Add GO → DP auto-correction
7. **NEW**: Add pitchCount input (for Maddux detection)
8. **NEW**: Add basesReachedViaError to PitcherGameStats (for perfect game)
9. **NEW**: Implement inherited/bequeathed runner tracking (for ER attribution)

### Files Modified
- `/spec-docs/BASEBALL_LOGIC_AUDIT.md` - Major update with all three spec docs

### Files Created
- `/spec-docs/SESSION_LOG.md` - This file
- `/spec-docs/CURRENT_STATE.md` - Current state documentation
- `/spec-docs/GAME_TRACKER_MASTER_SPEC.md` - NEW: Single source of truth for GameTracker
- `/spec-docs/FRANCHISE_FLOW_AUDIT.md` - NEW: Data flow audit from game → franchise

---

## Session: 2026-02-03 (Continued - Part 2)

### Context
User requested:
1. Analyze FIELDING_SYSTEM_SPEC.md for fielding logic
2. Create master spec document for GameTracker
3. Audit franchise flow to reconcile data capture vs franchise needs

### Work Completed

#### 1. FIELDING_SYSTEM_SPEC.md Analysis

Identified fielding tracking requirements:
- Fielding chance detection (only when attempt made)
- Fielder inference by direction + ball type
- Assist chain tracking (6-4-3, etc.)
- D3K fielder options (C, P, 3B)
- Star play types (diving, leaping, wall, etc.)
- Error types with context modifiers

**Current Implementation Status**: ENTIRELY MISSING from GameTracker

#### 2. GAME_TRACKER_MASTER_SPEC.md Created

Built a comprehensive 6-part master spec:
1. **Part 1: UI Data Capture** - What frontend must collect
2. **Part 2: Inference Engine** - What engine calculates
3. **Part 3: Validation Rules** - Invalid states to prevent
4. **Part 4: Stat Accumulation** - Data flow layers
5. **Part 5: Fame/Clutch/WAR** - Achievement detection
6. **Part 6: SMB4 Constraints** - What's NOT in the game

This consolidates: RUNNER_ADVANCEMENT_RULES, AUTO_CORRECTION_SYSTEM_SPEC, ADAPTIVE_STANDARDS_ENGINE_SPEC, STAT_TRACKING_ARCHITECTURE_SPEC, FIELDING_SYSTEM_SPEC

#### 3. FRANCHISE_FLOW_AUDIT.md Created

Audited complete data flow from GameTracker to FranchiseHome:

**Key Finding**: Franchise mode mostly uses **MOCK DATA** because:
- Season aggregation not connected on game end
- useSeasonData/Stats hooks incomplete or missing
- PostGameSummary.tsx is 100% hardcoded mock data

**Critical Gaps Identified:**
1. Season aggregation not called on game end
2. Pitcher W/L/S decisions not tracked
3. PostGameSummary not wired to real game data
4. Pitch count never incremented

### Files Examined
- `src_figma/hooks/useFranchiseData.ts` - Franchise data hook
- `src_figma/hooks/useGameState.ts` - Game state hook
- `src_figma/app/pages/PostGameSummary.tsx` - Post-game UI
- `src_figma/app/pages/FranchiseHome.tsx` - Franchise UI
- `src_figma/app/types/index.ts` - Type definitions
- `src_figma/app/routes.tsx` - App routing

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Create fresh master spec | Single source of truth needed |
| 6-part structure | Organizes by data flow |
| Franchise audit | Reveals broken data connections |

### Pending/Next Steps

**CRITICAL:**
1. Connect season aggregation on game end
2. Implement pitcher W/L/S decisions
3. Wire PostGameSummary to real game data

**HIGH:**
4. Separate HBP from BB
5. Track SB/CS events
6. Add pitch count input to UI

**MEDIUM:**
7. Add fielding stats tracking
8. Track games at position

---

## Previous Session Notes (from compaction)

### TBL Fix
- Changed TBL (TOOTBLAN) from "runners advance" group to "runner OUT" group
- Runner is now marked OUT on baserunning blunder

### Runner Outcome Persistence
- Fixed `handleEndAtBat` to pass `runnerOutcomes` to `onPlayComplete`
- Added `runnerOutcomes?: RunnerDefaults` to `PlayData` interface
- User adjustments to runner outcomes now persist after End At-Bat

### D3K Fixes (VALID FOR SMB4)
- Fixed D3K legality checking (1B empty OR 2 outs)
- Added `calculateD3KDefaults()` function
- **NOTE**: D3K in SMB4 only occurs via K + WP/PB (swing & miss with 2 strikes)
- The legality rules still apply: batter can reach if 1B empty OR 2 outs

---

## Session: 2026-02-03 (Continued - Part 3)

### Context
User requested complete code-level gap analysis of franchise mode vs game tracker.

### CRITICAL DISCOVERY

**The persistence layer doesn't exist.** Four files are imported but never created:

| Missing File | Imported By | Impact |
|--------------|-------------|--------|
| `utils/eventLog.ts` | useGameState.ts:16 | AtBatEvents never saved |
| `utils/seasonStorage.ts` | useFranchiseData.ts:12 | Season stats have nowhere to go |
| `hooks/useSeasonData.ts` | useFranchiseData.ts:10 | Franchise can't load metadata |
| `hooks/useSeasonStats.ts` | useFranchiseData.ts:11 | Franchise can't load leaderboards |

**Result**: Game data lives in React state only, lost on refresh. Franchise falls back to 100% mock data.

### Files Created
- `DEFINITIVE_GAP_ANALYSIS.md` - **AUTHORITATIVE** - Complete code-level gap analysis with exact line references

### Implementation Plan (For Claude Code)

**Phase 1: Create Persistence Layer** (REQUIRED FIRST)
1. Create `utils/eventLog.ts` - IndexedDB for AtBatEvents
2. Create `utils/seasonStorage.ts` - IndexedDB for season stats
3. Create `utils/seasonAggregator.ts` - aggregate game → season

**Phase 2: Create Season Hooks**
4. Create `hooks/useSeasonData.ts` - load season metadata
5. Create `hooks/useSeasonStats.ts` - load leaderboards

**Phase 3: Fix Game Tracker**
6. Fix SB/CS tracking (TODO at useGameState.ts:767)
7. Add pitch count input
8. Add error tracking
9. Add pitcher W/L/S decision logic

**Phase 4: Wire PostGameSummary**
10. Create `hooks/useCompletedGame.ts`
11. Replace mock data with real data

### Handoff Notes

User moving to Claude Code for implementation.

**Key Reference Document**: `DEFINITIVE_GAP_ANALYSIS.md`
- Section 1: What franchise needs (with exact code references)
- Section 2: What game tracker captures (with field-by-field status)
- Section 3: The gaps (missing files and data)
- Section 4: Implementation plan (phased approach)

**All spec docs now in place:**
- `GAME_TRACKER_MASTER_SPEC.md` - What to build
- `DEFINITIVE_GAP_ANALYSIS.md` - What's missing
- `CURRENT_STATE.md` - Current implementation status

---

## Session: 2026-02-03 (Continued - Part 4)

### Context
User provided BASEBALL_STATE_MACHINE_AUDIT.md and asked:
1. How does it compare to findings in master spec?
2. What's missing in master spec?
3. Are there contradictions given UI/UX changes?
4. Update the master spec

### Analysis Results

**Gaps Identified (Missing from Master Spec v1.0):**
1. Complete legal outcome tables per result type (BB, 1B, 2B, 3B, HR, outs, DP, SF, SAC, FC, E)
2. Seven impossible transitions that must be blocked
3. Five improbable transitions requiring extra event inference
4. Extra event prompting rules (when to ask for SB, WP, PB, E)
5. Key function signatures (getMinimumAdvancement, getRunnerOptions, isExtraAdvancement, checkAutoCorrection)
6. Default outcomes table by result type

**Contradictions Check: NONE FOUND**
- Master spec v1.0 was incomplete but NOT contradictory
- All existing validation rules align with state machine audit
- UI/UX changes (TBL = OUT, D3K via K+WP/PB, no Balk) are consistent

### Work Completed

#### 1. GAME_TRACKER_MASTER_SPEC.md - Updated to v1.1

Added new sections §3.6-3.10 (State Machine Validation):
- §3.6: Legal Outcome Tables - Complete tables for all 11 result types
- §3.7: Impossible Transitions - 7 blocked states with implementation code
- §3.8: Improbable Transitions - 7 inference-required cases with prompting rules
- §3.9: Default Outcomes - Complete defaults table by result type
- §3.10: Key Function Signatures - 6 core functions for state machine

**Version bumped to 1.1**

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Integrate into Part 3 | State machine is validation, fits logically |
| Add §3.6-3.10 | Detailed enough for Claude Code implementation |
| Include function signatures | Enables direct implementation without ambiguity |
| No contradictions found | UI/UX changes align with state machine rules |

### Files Modified
- `/spec-docs/GAME_TRACKER_MASTER_SPEC.md` - Major update (v1.0 → v1.1)
- `/spec-docs/SESSION_LOG.md` - This entry

### Handoff Ready

**For Claude Code Implementation:**
1. `GAME_TRACKER_MASTER_SPEC.md` v1.1 - Complete spec with state machine
2. `DEFINITIVE_GAP_ANALYSIS.md` - Persistence layer gaps
3. `CURRENT_STATE.md` - What's working vs broken

**Priority Order:**
1. Create persistence layer (eventLog.ts, seasonStorage.ts, etc.)
2. Implement state machine functions (isRunnerForced, getRunnerOptions, etc.)
3. Fix stat tracking gaps (pitchCount, SB/CS, HBP separation)
4. Wire franchise mode to real data

---

## Session: 2026-02-03 (Continued - Part 5)

### Context
User uploaded 7 WAR/tracking spec documents and requested comprehensive audit comparing what specs require vs what in-game tracking can capture.

### Documents Analyzed
1. **FWAR_CALCULATION_SPEC.md** - Fielding WAR (OAA/DRS adapted)
2. **BWAR_CALCULATION_SPEC.md** - Batting WAR (wOBA/wRAA based)
3. **PWAR_CALCULATION_SPEC.md** - Pitching WAR (FIP based)
4. **RWAR_CALCULATION_SPEC.md** - Baserunning WAR (wSB + UBR + wGDP)
5. **MWAR_CALCULATION_SPEC.md** - Manager WAR (decision + overperformance)
6. **PITCH_COUNT_TRACKING_SPEC.md** - Pitch count capture requirements
7. **PITCHER_STATS_TRACKING_SPEC.md** - Complete pitcher tracking spec

### Audit Results Summary

| WAR Component | Trackable Status |
|---------------|-----------------|
| bWAR (Batting) | ✅ FULLY TRACKABLE |
| fWAR (Fielding) | ✅ MOSTLY TRACKABLE |
| pWAR (Pitching) | ⚠️ PARTIALLY - pitch count missing |
| rWAR (Baserunning) | ⚠️ PARTIALLY - SB/CS not persisted |
| mWAR (Manager) | ❌ MOSTLY NOT TRACKABLE |

### Critical Gaps Identified

1. **Pitch Count** - `PitcherGameStats.pitchCount` field exists but NEVER incremented
   - Blocks: pWAR, Maddux detection, Immaculate Inning detection
   - Fix: Add pitch count prompts at pitching changes and end of game

2. **SB/CS Persistence** - Toggles exist in UI but events never saved
   - Blocks: rWAR (wSB component)
   - Fix: Persist SB/CS events to event log

3. **W/L/S Decisions** - Logic not implemented
   - Blocks: Season standings, award voting, pitcher records
   - Fix: Implement decision logic per PITCHER_STATS_TRACKING_SPEC.md §5

4. **Persistence Layer** - Files still don't exist
   - Blocks: ALL franchise data
   - Fix: Create eventLog.ts, seasonStorage.ts, etc.

### Files Created
- `/spec-docs/SPEC_VS_TRACKING_AUDIT.md` - Complete audit comparing all 7 specs to tracking capabilities

### Key Insight
**bWAR and fWAR can be calculated NOW** with current tracking data. The tracking captures all required inputs (PA, H, 2B, 3B, HR, BB, HBP, K, SF, SAC, errors, putouts, assists, star plays). The gap is in the persistence and aggregation layer, not the data capture layer.

### Implementation Priority (Refined)

**Phase 1: Core Persistence (CRITICAL)**
1. Create persistence layer files
2. Fix SB/CS/PK persistence
3. Add pitch count tracking prompts

**Phase 2: Pitcher Decisions (HIGH)**
1. Implement W/L/S/H/BS decision logic
2. Implement inherited runner ER attribution
3. Track games started vs appeared

**Phase 3: WAR Calculations (MEDIUM)**
1. bWAR calculator (all data available NOW)
2. fWAR calculator (all data available NOW)
3. pWAR calculator (needs pitch count first)
4. rWAR calculator (needs SB/CS first)

**Phase 4: Advanced Features (LOW)**
1. Park factor tracking
2. Manager decision attribution
3. mWAR implementation

---

## Session: 2026-02-03 (Implementation Planning)

### Documents Reorganized

Renamed source-of-truth document:
- `GAME_TRACKER_MASTER_SPEC.md` → `WHAT_TO_BUILD_MASTER_SPEC.md`

Two documents are now the authoritative source:
1. **WHAT_TO_BUILD_MASTER_SPEC.md** - What to build (complete spec)
2. **DEFINITIVE_GAP_ANALYSIS.md** - What's missing + implementation plan

### Implementation Plan Created

Added detailed implementation plan to DEFINITIVE_GAP_ANALYSIS.md Section 4.

**5 Phases:**
1. Persistence Layer (4 files to create)
2. Season Hooks (2 files to create)
3. Game Tracker Fixes (modify useGameState.ts)
4. Wire PostGameSummary (1 file + modify)
5. Verification checklist

**File Creation Order:**
```
utils/eventLog.ts → utils/seasonStorage.ts → utils/seasonAggregator.ts →
hooks/useSeasonData.ts → hooks/useSeasonStats.ts → hooks/useCompletedGame.ts →
MODIFY: useGameState.ts → MODIFY: PostGameSummary.tsx
```

### Next Steps

User will take DEFINITIVE_GAP_ANALYSIS.md to Claude Code for implementation. Return for verification together afterward.

---

## Session: 2026-02-03 (Button Audit Plan)

### Created BUTTON_AUDIT_PLAN.md

Comprehensive test plan covering every button in GameTracker UI.

**10 Sections, 100+ Test Cases:**
1. Primary Action Buttons (HIT, OUT, OTHER)
2. Hit Outcome Buttons (1B, 2B, 3B, HR + modifiers)
3. Out Outcome Buttons (GO, FO, LO, PO, K, KL, DP, FC + modifiers)
4. OTHER Menu Buttons (BB, IBB, HBP, D3K, SB, CS, PK, TBL, PB, WP, E)
5. Modifier Button Bar (7+, WG, ROB, KP, NUT, BT, BUNT, TOOTBLAN)
6. Runner Outcome Controls (drag-drop, force validation)
7. Game State Controls (count, inning, substitutions, undo)
8. Stat Tracking Verification (batter, pitcher, scoreboard)
9. Known Bugs to Verify
10. Post-Persistence Tests

**Pre-identified Known Bugs:**
| Bug ID | Issue |
|--------|-------|
| BUG-01 | sb never incremented (line 767 TODO) |
| BUG-02 | cs never incremented (line 767 TODO) |
| BUG-03 | pitchCount never incremented (no UI) |
| BUG-04 | scoreboard.errors never incremented |
| BUG-05 | Balk button should not exist (SMB4) |
| BUG-06 | logAtBatEvent undefined (file missing) |
| BUG-07 | Runner IDs always empty string |

### Files Referenced for Audit

| File | Purpose |
|------|---------|
| `GameTracker.tsx` | Main page (32k+ tokens) |
| `OutcomeButtons.tsx` | Hit/Out type selection |
| `ActionSelector.tsx` | HIT/OUT/OTHER primary buttons |
| `ModifierButtonBar.tsx` | Post-at-bat modifiers |
| `useGameState.ts` | All state management functions |

### Ready for Testing

After Claude Code implements persistence, use `BUTTON_AUDIT_PLAN.md` to systematically verify every button works correctly. Record findings in the document, then create implementation plan for bugs.
