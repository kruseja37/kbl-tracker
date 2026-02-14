# GameTracker Spec-to-Code Audit Report

> **Purpose**: Reconcile spec documentation with actual GameTracker implementation
> **Created**: January 25, 2026
> **For**: Manual testing checklist - what works vs what's spec-only

---

## Executive Summary

The GameTracker has **core gameplay functional** but several spec-documented features are **not yet implemented in the UI**. The engines (calculators) exist for many systems, but they're not wired to the UI.

### Quick Status

| System | Spec Status | UI Status | Test Priority |
|--------|-------------|-----------|---------------|
| At-Bat Recording | Complete | Functional | HIGH - Test all 19 result types |
| Runner Advancement | Complete | Functional | HIGH - Test force plays, tag-ups |
| Fielding Confirmation | Complete | Functional | HIGH - Test modal flow |
| Substitutions | Complete | Functional | MEDIUM - Test all 4 types |
| Score/Inning Tracking | Complete | Functional | HIGH - Test scoring, inning flip |
| WAR Display | Complete | Functional | MEDIUM - Check leaderboards |
| Fame Detection | Complete | Functional | MEDIUM - Test auto-detection |
| **Field Zone Input (25-zone)** | Complete | **NOT IMPLEMENTED** | N/A - Spec only |
| **Spray Charts** | Complete | **NOT IMPLEMENTED** | N/A - Spec only |
| **Salary Display** | Complete | **BLOCKED** - No ratings data | N/A |
| **Mojo/Fitness UI** | Complete | **NOT IMPLEMENTED** | N/A - Engines exist |
| **Fan Morale UI** | Complete | **NOT IMPLEMENTED** | N/A - Engines exist |

---

## Section 1: At-Bat Flow - FUNCTIONAL

### What the Spec Says (FIELDING_SYSTEM_SPEC, BASEBALL_STATE_MACHINE_AUDIT)

The at-bat flow should:
1. User selects result type (1B, 2B, HR, K, GO, etc.)
2. Modal opens for additional data:
   - Direction (Left, Left-Center, Center, Right-Center, Right)
   - Exit Type (Ground, Line Drive, Fly Ball, Pop Up)
   - HR Distance (for home runs)
   - Fielding Attempt (for hits: Clean, Diving, Leaping, Robbery)
   - Special Play (for outs: Routine, Diving, Wall Catch, Running, Leaping)
3. Runner advancement confirmation (with force play logic)
4. Fielding confirmation modal (for outs/errors)
5. RBI calculation

### What the Code Does (AtBatFlow.tsx:1431 lines)

**IMPLEMENTED:**
- All 19 result types: 1B, 2B, 3B, HR, BB, IBB, K, KL, GO, FO, LO, PO, DP, SF, SAC, HBP, E, FC, D3K
- Direction selection: 5 options (Left → Right)
- Exit Type selection: 4 options (Ground, Line Drive, Fly Ball, Pop Up)
- HR Distance input field
- Fielding Attempt for hits: Clean, Diving, Leaping, Robbery Attempt
- Special Play for outs: Routine, Diving, Wall Catch, Running, Leaping
- Runner advancement with force play logic
- Extra advancement detection (triggers WP/PB/SB/E/Balk prompt)
- RBI auto-calculation
- Auto-correction (FO → SF when R3 scores)
- 7+ Pitch At-Bat checkbox
- Beat Out Single checkbox
- Batter Out Advancing (stretching for extra base)
- FieldingModal integration

**TEST CHECKLIST:**
- [ ] Single - verify direction/exit type modal
- [ ] Double - verify R1 forced to 3B minimum
- [ ] Triple - verify all runners score
- [ ] Home Run - verify RBI count includes batter
- [ ] Walk/HBP - verify forced advancement only
- [ ] Strikeout - verify no runner advancement default
- [ ] Ground Out - verify fielder inference
- [ ] Fly Out with R3 - verify tag-up opportunity
- [ ] Double Play - verify DP type selection
- [ ] Sac Fly - verify auto-correction from FO
- [ ] Sac Bunt - verify advancement
- [ ] Error - verify no RBI credited
- [ ] Fielder's Choice - verify out selection
- [ ] D3K - verify flow
- [ ] Runner scoring from 1B on single (should prompt for extra event)

---

## Section 2: Field Zone Input - NOT IMPLEMENTED

### What the Spec Says (FIELD_ZONE_INPUT_SPEC.md)

A 25-zone clickable baseball field:
- 18 fair territory zones (Z00-Z17): Infield, Shallow OF, Deep OF, Wall
- 7 foul territory zones (F00-F06): RF foul line, LF foul line, Behind home
- Single tap captures: direction, depth, likely fielder
- Visual baseball diamond with SVG polygons
- GameChanger-like UI experience

### What the Code Does

**NOT IMPLEMENTED** - The current UI uses simple button selectors:
- Direction: 5 buttons (Left, Left-Center, Center, Right-Center, Right)
- No visual field representation
- No depth tracking
- No foul territory zones
- No spray chart data collection

**IMPACT:**
- Users must mentally translate ball location to direction buttons
- No spray chart visualization possible
- Contact Quality inference is less accurate
- Stadium analytics not possible

---

## Section 3: Fielding System - MOSTLY FUNCTIONAL

### What the Spec Says (FIELDING_SYSTEM_SPEC.md)

**Fielder Inference:**
- Auto-infer fielder from direction + exit type
- Matrix-based inference (direction × exit type → position)

**Fielding Modal:**
- Confirm inferred fielder or override
- Play type: routine, diving, leaping, wall, charging, barehanded
- Difficulty rating: 1-5
- Assist chain for multi-player plays
- Error handling: throwing, fielding, mental

**fWAR Tracking:**
- Per-play value calculation
- Saved run detection
- Position-specific adjustments

### What the Code Does (FieldingModal.tsx, AtBatFlow.tsx)

**IMPLEMENTED:**
- Fielder inference from direction + exit type
- Fielder override capability
- Play types: routine, diving, leaping, wall, charging, barehanded
- Difficulty rating 1-5
- Saved run toggle
- Error type selection
- Assist chain (multi-fielder)
- FieldingData interface with full tracking
- IndexedDB persistence of fielding events

**GAPS:**
- Mental error type not in UI (only throwing/fielding)
- No shift toggle
- Star play types (running/sliding/over_shoulder) not in UI
- DP role tracking (started/turned/completed) not in UI

**TEST CHECKLIST:**
- [ ] Fielding modal appears for ground outs
- [ ] Fielding modal appears for fly outs
- [ ] Fielder inference works correctly
- [ ] Can override inferred fielder
- [ ] Can select play type (diving, etc.)
- [ ] Saved run toggle works
- [ ] Error flow works
- [ ] Assist chain selection works

---

## Section 4: Substitutions - FUNCTIONAL

### What the Spec Says (SUBSTITUTION_FLOW_SPEC.md)

**Four substitution types:**
1. Pitching Change - with pitch count, inherited runners
2. Pinch Hitter - replaces current batter
3. Pinch Runner - replaces runner on base
4. Defensive Substitution - swap fielders

**Constraints:**
- Can't substitute removed players
- Pitcher responsibility for inherited runners
- DH rules enforcement

### What the Code Does

**IMPLEMENTED:**
- PitchingChangeModal with pitch count, inherited runner tracking
- PinchHitterModal with position assignment
- PinchRunnerModal with pitcher responsibility inheritance
- DefensiveSubModal supports multiple subs
- LineupState tracking
- Undo support for substitutions
- Bench player selection

**GAPS:**
- Double Switch not implemented (spec only)

**TEST CHECKLIST:**
- [ ] Pitching Change button works
- [ ] New pitcher appears in game
- [ ] Inherited runners tracked to previous pitcher
- [ ] Pinch Hitter replaces current batter
- [ ] Pinch Runner replaces runner on base
- [ ] Defensive Sub swaps fielders
- [ ] Can't reuse removed players
- [ ] Undo works for substitutions

---

## Section 5: Runner Advancement - FUNCTIONAL

### What the Spec Says (RUNNER_ADVANCEMENT_RULES.md)

**Force Play Rules:**
- Batter takes base → forces runners behind
- Single: R1 forced to 2B
- Double: R1 forced to 3B, R2 forced to 3B
- Triple: All runners must score
- Walk: Only forced runners advance

**Tag-Up Rules:**
- R3 can tag on deep fly with < 2 outs
- Other runners can tag if time permits

**Extra Advancement:**
- Beyond standard requires WP/PB/SB/E/Balk

### What the Code Does (AtBatFlow.tsx:117-241)

**IMPLEMENTED:**
- Full force play logic
- Minimum advancement requirements
- Tag-up opportunity detection (R3 on FO with < 2 outs)
- Extra advancement detection with event prompts
- Per-base outcome selection
- Auto-default outcomes based on result type

**TEST CHECKLIST:**
- [ ] R1 forced to 2B on single
- [ ] R1 forced to 3B on double
- [ ] All runners score on triple
- [ ] Only forced runners advance on walk
- [ ] R3 can tag on fly out
- [ ] Extra advancement prompts for WP/PB/SB/E/Balk
- [ ] Can't select "held" for forced runners

---

## Section 6: Score/Inning Tracking - FUNCTIONAL

### What the Spec Says (BASEBALL_STATE_MACHINE_AUDIT.md)

**Scoreboard:**
- Home/Away score display
- Current inning (1-9+)
- TOP/BOTTOM half indicator
- Outs count (0-3)
- Base runner visualization
- Leverage Index display

**Transitions:**
- 3 outs → flip inning
- Clear bases on inning change
- Reset outs to 0

### What the Code Does

**IMPLEMENTED:**
- Score tracking for both teams
- Inning display with TOP/BOTTOM
- Outs display (0-3)
- Base runner diamond visualization
- Leverage Index in Scoreboard
- Inning flip at 3 outs
- Bases cleared on flip
- Extra innings support

**TEST CHECKLIST:**
- [ ] Score updates on runs
- [ ] Outs increment correctly
- [ ] DP adds 2 outs
- [ ] 3 outs flips inning
- [ ] Bases clear on flip
- [ ] TOP/BOTTOM indicator correct
- [ ] Leverage Index updates

---

## Section 7: WAR Display - FUNCTIONAL

### What the Spec Says (BWAR/PWAR/FWAR/RWAR/MWAR specs)

**Display Components:**
- WAR leaderboards (Batting WAR, Pitching WAR)
- WAR badges on player cards
- WAR tier classification

### What the Code Does (WARDisplay.tsx, useWARCalculations.ts)

**IMPLEMENTED:**
- WARPanel component with tabs
- Batting WAR leaderboard
- Pitching WAR leaderboard
- WAR tier badges (MVP, Elite, Star, etc.)
- Connected to seasonStorage

**TEST CHECKLIST:**
- [ ] Batting WAR tab shows leaderboard
- [ ] Pitching WAR tab shows leaderboard
- [ ] WAR values update after at-bats
- [ ] Clicking player name opens PlayerCard

---

## Section 8: Fame Detection - FUNCTIONAL

### What the Spec Says (FAME_SYSTEM_TRACKING.md, SPECIAL_EVENTS_SPEC.md)

**Auto-Detect Events:**
- Home runs
- Strikeouts
- Walks
- Hits
- RBIs
- First career X

**Prompt-Detect Events:**
- Web Gem
- TOOTBLAN
- Nut Shot
- Robbery

### What the Code Does (useFameDetection.ts, fameEngine.ts)

**IMPLEMENTED:**
- Auto-detection for stat achievements
- Fame value calculation with LI weighting
- Milestone detection
- FameEventModal for manual entry
- QuickFameButtons for common events
- Toast notifications

**TEST CHECKLIST:**
- [ ] Home run triggers fame event
- [ ] Strikeout triggers fame for pitcher
- [ ] Can manually add Web Gem
- [ ] Can manually add TOOTBLAN
- [ ] Fame values show in UI

---

## Section 9: Persistence - FUNCTIONAL

### What the Spec Says (STAT_TRACKING_ARCHITECTURE_SPEC.md)

**4-Layer System:**
1. Event Log (source of truth)
2. Game-level aggregation
3. Season-level aggregation
4. Career-level aggregation

**Storage:**
- IndexedDB for persistence
- Auto-save during game
- Recovery on refresh

### What the Code Does

**IMPLEMENTED:**
- eventLog.ts - bulletproof event logging
- gameStorage.ts - current game persistence
- seasonStorage.ts - season stats aggregation
- careerStorage.ts - career stats aggregation
- useGamePersistence.ts - auto-load, recovery prompt
- useDataIntegrity.ts - startup recovery

**TEST CHECKLIST:**
- [ ] Refresh page mid-game → game recovers
- [ ] End game → stats persist to season
- [ ] Season stats show in leaderboards
- [ ] Can start new game after ending previous

---

## Section 10: Missing/Blocked Features

### Field Zone Input (SPEC ONLY)
- 25-zone clickable field not built
- Would replace direction buttons
- Required for spray charts

### Spray Charts (SPEC ONLY)
- Visual hit location display
- Depends on field zone input

### Salary Display (BLOCKED)
- Engine complete (salaryCalculator.ts)
- UI component exists (SalaryDisplay.tsx)
- **BLOCKED**: No player ratings in data model
- Need: power, contact, speed, fielding, arm for position players
- Need: velocity, junk, accuracy for pitchers

### Mojo/Fitness UI (ENGINES ONLY)
- Engines exist (mojoEngine.ts, fitnessEngine.ts)
- No UI to display mojo/fitness state
- No UI to trigger mojo changes

### Fan Morale UI (ENGINES ONLY)
- Engine exists (fanMoraleEngine.ts)
- No UI to display morale
- No integration with game events

### Narrative System (ENGINES ONLY)
- Engine exists (narrativeEngine.ts)
- No beat reporter UI
- No story display

---

## Summary for Manual Testing

### HIGH Priority (Core Gameplay)
1. **All 19 at-bat result types work**
2. **Runner advancement follows force rules**
3. **Scoring and outs track correctly**
4. **Inning flip works at 3 outs**
5. **Fielding modal appears and captures data**
6. **Substitutions work (all 4 types)**
7. **Game persists on refresh**
8. **Stats aggregate to season**

### MEDIUM Priority (Supporting Features)
1. **WAR leaderboards display**
2. **Fame detection fires**
3. **Undo works**
4. **Activity log shows plays**
5. **Leverage Index updates**

### NOT TESTABLE (Spec Only / Blocked)
1. Field Zone Input (25-zone field)
2. Spray Charts
3. Salary Display (blocked on ratings)
4. Mojo/Fitness display
5. Fan Morale display
6. Narrative/Reporter stories

---

*Document bugs found during testing in a separate file or share them for implementation.*
