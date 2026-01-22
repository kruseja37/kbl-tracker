# KBL Tracker - Session Log

> **Purpose**: Running log of work sessions to preserve context across compaction
> **Format**: Reverse chronological (newest first)
>
> **IMPORTANT**: This log is for *what happened* during sessions. For *how things work*,
> see the relevant SPEC docs. Finalized logic should be PROMOTED to specs, not left here.

---

## Session: January 22, 2026 (Continued 3) - Fame System Implementation

### What Was Accomplished

Implemented the complete Fame system (in-game Fame tracking portion) per FAN_HAPPINESS_SPEC.md, which is Phase 1 of the larger Fan Happiness system.

### Files Created

| File | Description |
|------|-------------|
| `FAN_HAPPINESS_SPEC.md` | Comprehensive spec (~900 lines) covering Fame events, auto-detection, UI components |
| `FameEventModal.tsx` | Modal for manual Fame event recording with categories and quick buttons |
| `FameDisplay.tsx` | FamePanel, FameToast, FameBadge, EndGameFameSummary components |
| `useFameDetection.ts` | Hook for auto-detecting Fame events from game state |

### Files Modified

| File | Changes |
|------|---------|
| `game.ts` | Added ~350 lines: FameEventType (58 event types), FAME_VALUES, FAME_EVENT_LABELS, FameEvent interface, helper functions |
| `index.tsx` | Added Fame state, toast toggle button, Fame UI components |
| `fieldingInferenceTests.ts` | Fixed unrelated `inheritedFrom` property issue in test data |

### Key Implementation Details

1. **Fame Event Types** (58 total):
   - 28 Fame Bonuses (+0.5 to +5 Fame value)
   - 30 Fame Boners (-0.5 to -2 Fame value)
   - All values match SPECIAL_EVENTS_SPEC.md

2. **Auto-Detection** (useFameDetection hook):
   - Walk-Off (bottom 9th+, winning run RBI)
   - Cycle (all 4 hit types in game)
   - Multi-HR (2, 3, 4+ in game)
   - Back-to-Back HR
   - Golden/Platinum Sombrero (4/5 K)
   - Meltdown (6+/10+ runs allowed)
   - No-Hitter/Perfect Game (end of game)
   - Batter Out Stretching
   - Deduplication via Set to prevent duplicate events

3. **UI Components**:
   - QuickFameButtons: Fast access to common events (Nut Shot, TOOTBLAN, Web Gem, etc.)
   - FameToast: Auto-dismissing notifications for detected events (5s timeout)
   - FamePanel: Collapsible summary by team with net Fame display
   - EndGameFameSummary: Post-game Fame recap modal
   - Toggle button to enable/disable toast notifications

4. **Design Decisions**:
   - "Full spec + partial implementation" approach (spec covers everything, implementation is in-game only)
   - "Both with toggles" for auto-detection (toast notifications can be disabled)
   - Fame is narrative-only (no gameplay impact) per original design

### NFL Verification Results

| Check | Status | Notes |
|-------|--------|-------|
| Type safety | ✅ | All FameEventType values exhaustive |
| Value accuracy | ✅ | 16 key values verified against spec |
| Build passes | ✅ | `npx tsc --noEmit` clean |
| Bug fixes | ✅ | Fixed useState→useEffect in FameToast |
| Toggle wired | ✅ | Toast toggle button functional |
| Deduplication | ✅ | Set-based per event type per player per inning |

### Known Limitations (Per Spec - Phase 1)

- Auto-detection implemented but not yet wired to at-bat completion flow
- Natural Cycle detection simplified (requires tracking hit order)
- Season-level Fan Happiness deferred to Phase 2 (needs data persistence)

### Cross-Spec Integration

| Spec | Integration |
|------|-------------|
| SPECIAL_EVENTS_SPEC.md | Fame values sourced from here (authoritative) |
| fame_and_events_system.md | Concepts referenced, now aligned with authoritative spec |
| SUBSTITUTION_FLOW_SPEC.md | Pinch hitter Fame events supported |

### Context for Next Session

- Fame system fully implemented for in-game tracking
- TypeScript compiles cleanly
- To activate auto-detection: wire `checkForFameEvents` call into at-bat completion handler
- To add end-game detection: call `checkEndGameFame` when game ends
- Phase 2 (Team Fan Happiness): Requires data persistence layer first

---

## Session: January 22, 2026 (Continued 2) - Substitution System Implementation

### What Was Accomplished

Implemented the full substitution system from SUBSTITUTION_FLOW_SPEC.md, creating modals and state management for all substitution types.

### Files Created

| File | Description |
|------|-------------|
| `PitchingChangeModal.tsx` | Modal for pitching changes with pitch count, inherited runners |
| `PinchHitterModal.tsx` | Modal for pinch hitters with position assignment |
| `PinchRunnerModal.tsx` | Modal for pinch runners with inherited runner tracking |
| `DefensiveSubModal.tsx` | Modal for multiple defensive substitutions |

### Files Modified

| File | Changes |
|------|---------|
| `game.ts` | Added ~250 lines of substitution types (LineupState, BenchPlayer, *Event types) |
| `index.tsx` | Added lineup state, handleSubstitutionComplete, modal rendering |

### Key Implementation Details

1. **Type System**:
   - `LineupState` - Tracks current lineup, bench, used players
   - `PitchingChangeEvent` - Captures pitch count, bequeathed runners
   - `PinchHitterEvent` - Captures batting order slot, defensive position
   - `PinchRunnerEvent` - **Critically** maintains pitcher responsibility for ER
   - `DefensiveSubEvent` - Supports multiple simultaneous subs
   - `applySubstitution()` - Pure function to update lineup state

2. **NFL Validation Results**:
   Initial NFL found 19 issues (3 Critical, 5 High, 6 Medium, 5 Low).

   Critical fixes applied:
   - **C2**: Pinch hitter now updates currentBatter from lineupState
   - **C3**: ~~Pitcher now in lineup (SMB4 has no DH)~~ **CORRECTED**: SMB4 DOES have DH option
   - **H3**: Lineup state now included in undo functionality
   - **M1**: Stats initialized for new players entering game

3. **SMB4 Rule Corrections** (User feedback):
   - SMB4 **DOES** have the DH option (lineup can be 9 fielders + DH)
   - Pitchers **CAN** pinch hit (re-added 'P' to PH position options)
   - All position dropdowns now include 'DH' as an option
   - **M3**: Removed 'P' from PH position options
   - **H1/H2**: howReached now tracked on Runner, passed through events

   Remaining for future:
   - C1: Double Switch modal (not implemented)
   - H5: Outgoing pitcher line not captured (stats not yet tracked)

3. **SMB4 Compliance**:
   - Pitcher bats in lineup (no DH)
   - No re-entry rule enforced
   - Inherited runner responsibility maintained through substitutions

### Cross-Spec Integration

| Spec | Integration |
|------|-------------|
| INHERITED_RUNNERS_SPEC | Pinch runner inherits pitcher responsibility |
| PITCH_COUNT_TRACKING_SPEC | Pitching change captures outgoing pitch count |
| PITCHER_STATS_TRACKING_SPEC | Bequeathed runners tracked for ER attribution |

### Context for Next Session

- Substitution system functional (3 of 4 sub types working: PH, PR, DEF_SUB, PITCH_CHANGE)
- Double Switch still needs implementation
- Per user's stated order: "pitcher stats → substituation logic → fan happiness"
- Substitution logic is now substantially complete
- Next: Fan Happiness system

---

## Session: January 22, 2026 (Continued) - Pitcher Stats Tracking Spec

### What Was Accomplished

Created comprehensive `PITCHER_STATS_TRACKING_SPEC.md` (~1000 lines) covering all pitcher statistics tracking for in-game use.

### Key Components

1. **Core Counting Stats**: IP, H, R, ER, K, BB, IBB, HBP, HR, PC, TBF
2. **IP Calculation**: Store as outs internally, display as X.X format
3. **Runs/Earned Runs**: Quick reference table with PB correctly marked unearned
4. **Win/Loss/Save Decisions**:
   - Starter 5+ IP rule (scaled for shorter games)
   - Most effective reliever assignment when starter doesn't qualify
   - Critical go-ahead run finder for loss assignment
5. **Hold and Blown Save**: Full rules with save opportunity tracking
6. **Quality Start/Complete Game/Shutout**: With shorter game scaling
7. **Special Achievement Detection**:
   - Maddux: CGSO with < ceil(innings × 9.44) pitches
   - Immaculate Inning: 9 pitches + 3 K + 3 outs (inferred, no strike tracking)
   - 9-Pitch Inning: 9 pitches + 3 outs (non-immaculate)
   - No-Hitter, Perfect Game
8. **Pitcher Game Line Format**: Standard and extended (with IR/IRS)
9. **Data Schema**: PitcherGameStats and PitcherSeasonStats interfaces

### NFL Validation Results

Initial NFL found 29 issues. Critical fixes applied:

| Issue | Fix |
|-------|-----|
| PB ER attribution WRONG | Fixed: PB runs are unearned per MLB Rule 9.16(e) |
| Maddux threshold math error | Fixed: Use Math.ceil not Math.floor |
| InningPitchData missing outsRecorded | Fixed: Added field |
| Immaculate Inning needed strike count | Fixed: Infer from 9 pitches + 3 K |
| findMostEffectiveReliever undefined | Fixed: Added full function definition |
| findCriticalGoAheadRun undefined | Fixed: Added full function definition |
| Perfect Game used pitcher.errors | Fixed: Use game.getErrorsWhilePitcherOnMound() |

Final NFL validation: **No critical or high issues remaining.**

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `PITCHER_STATS_TRACKING_SPEC.md` | **NEW** | ~1000 lines, comprehensive pitcher tracking |
| `CURRENT_STATE.md` | Updated | Added spec to file structure, updated implementation status |
| `SESSION_LOG.md` | Updated | This entry |

### Cross-Spec Integration

| Integration | Notes |
|-------------|-------|
| PWAR_CALCULATION_SPEC | Uses K, BB (not IBB), HBP, HR, IP |
| INHERITED_RUNNERS_SPEC | ER attribution handled there |
| PITCH_COUNT_TRACKING_SPEC | Maddux/Immaculate use pitch counts |
| SPECIAL_EVENTS_SPEC | Fame bonuses: Maddux +3, Immaculate +2, No-Hitter +3, Perfect +5 |
| SUBSTITUTION_FLOW_SPEC | Pitching change flow references |

### Context for Next Session

- Pitcher stats tracking fully specified
- Per user's stated order: "pitcher stats tracking → substituation logic → fan happiness"
- Next: Substitution logic implementation

---

## Session: January 22, 2026 - Cross-Spec Consistency Audit

### What Was Accomplished

Performed comprehensive NFL-style audit of all spec documentation to find gaps, contradictions, and orphaned references.

### Issues Found and Fixed

#### 1. Missing Spec References (5 specs not documented)

The following specs were created but never added to CURRENT_STATE.md or AI_OPERATING_PREFERENCES.md:
- `SPECIAL_EVENTS_SPEC.md`
- `SUBSTITUTION_FLOW_SPEC.md`
- `PITCH_COUNT_TRACKING_SPEC.md`
- `INHERITED_RUNNERS_SPEC.md`
- `fame_and_events_system.md`
- `SMB4_GAME_MECHANICS.md` (only SMB4_GAME_REFERENCE.md was listed)

**Fixed**: Added all specs to both files with proper categorization.

#### 2. Fame Value Contradictions

`fame_and_events_system.md` had different Fame values than `SPECIAL_EVENTS_SPEC.md`:

| Event | Old Value | Correct Value |
|-------|-----------|---------------|
| Robbery | +1 | +1.5 (+2.5 grand slam) |
| Inside-the-Park HR | +1 | +1.5 |
| Cycle | +1 | +3 (+4 natural) |
| Immaculate Inning | +1 | +2 |
| Unassisted Triple Play | +1 | +3 |
| Perfect Game | +3 | +5 |
| Killed Pitcher (batter) | not listed | +3 |
| Nut Shot (batter) | not listed | +1 |

**Fixed**: Updated fame_and_events_system.md with correct values and added missing events.

#### 3. Gold Glove Contradiction

Line 544 of fame_and_events_system.md stated "Eye Test: User override for Gold Glove = Fame + manual adjustment" which contradicted the correct formula (fWAR + LI-weighted clutch plays, NOT Fame) stated elsewhere.

**Fixed**: Corrected line 544 to clarify Gold Glove does NOT use Fame.

#### 4. Master Spec Missing Cross-References

KBL_XHD_TRACKER_MASTER_SPEC_v3.md only referenced 3 specs in its header, despite 15+ related specs existing.

**Fixed**: Expanded header to include all WAR specs, in-game tracking specs, and special events specs.

#### 5. Catcher Interference Error

`INHERITED_RUNNERS_SPEC.md` line 121 listed "Catcher Interference" as an event, but this is NOT possible in SMB4.

**Fixed**: Removed from table and added note referencing SMB4_GAME_MECHANICS.md.

#### 6. SMB4 Reference Inconsistency

Some specs referenced `SMB4_GAME_REFERENCE.md` (older) while newer specs referenced `SMB4_GAME_MECHANICS.md`. Both files exist for different purposes:
- `SMB4_GAME_MECHANICS.md` - Central reference for what IS/ISN'T in SMB4 (limitations)
- `SMB4_GAME_REFERENCE.md` - Game mechanics like Mojo, Chemistry, Traits

**Fixed**: Updated AI_OPERATING_PREFERENCES.md to prioritize SMB4_GAME_MECHANICS.md and clarified purposes.

### Files Modified

| File | Changes |
|------|---------|
| `fame_and_events_system.md` | Fixed 10+ Fame values, added header reference, fixed Gold Glove |
| `CURRENT_STATE.md` | Added 7 missing specs with proper categorization |
| `AI_OPERATING_PREFERENCES.md` | Added in-game tracking specs section, fame specs section |
| `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` | Expanded header with all related specs |
| `INHERITED_RUNNERS_SPEC.md` | Removed catcher interference, added SMB4 reference |
| `SPECIAL_EVENTS_SPEC.md` | Updated killed pitcher from +1 to +3 for batter |

### Key Finding

**SPECIAL_EVENTS_SPEC.md is the authoritative source** for Fame Bonus/Boner values. fame_and_events_system.md now references it and has been aligned.

### Remaining Items for Future

None from this audit - all contradictions and gaps have been resolved.

---

## Session: January 21, 2026 (Night Continued 15) - Multi-Participant Clutch Attribution + mWAR

### What Was Accomplished

Created two comprehensive new specs extending the Leverage Index system to cover ALL participants on every play and manager decision tracking.

### The Big Picture

User asked: "can we apply [LI-weighted clutch/choke] to all players involved in the play for every play?" This led to a deep NFL analysis of fair attribution, resulting in:

1. **CLUTCH_ATTRIBUTION_SPEC.md** - Multi-participant credit/blame distribution
2. **MWAR_CALCULATION_SPEC.md** - Manager decisions and team overperformance

### Key Concepts Introduced

#### Contact Quality (CQ)

The insight: **credit should flow to whoever controlled the outcome**, not just who benefited. A weak pop fly that drops isn't the batter's doing - it's the pitcher's.

```javascript
const DEFAULT_CONTACT_QUALITY = {
  'home_run': 1.0,        // Batter gets full credit
  'line_drive': 0.85,
  'fly_ball_deep': 0.75,
  'ground_ball_hard': 0.70,
  'popup_infield': 0.10,  // Pitcher gets most credit
  'strikeout': null       // Pure pitcher/catcher credit
};
```

CQ is inferred from trajectory (already tracked) - no new user input needed.

#### Skill-Based vs Outcome-Based Attribution

**Bad outcomes from good attempts should never punish the attempter:**
- Diving play misses → Fielder gets credit (+0.3), not blame
- Robbery attempt fails → Fielder gets credit (+0.5), pitcher blamed
- Bad hop → Fielder NEVER blamed, credit modulated by CQ

#### Multi-Participant Credit Distribution

Every play involves multiple participants who deserve appropriate credit/blame:

| Play Type | Batter | Pitcher | Catcher | Fielder(s) | Runner(s) |
|-----------|--------|---------|---------|------------|-----------|
| K-swinging | -1.0×√LI | +0.8×√LI | +0.2×√LI | — | — |
| K-looking | -0.8×√LI | +0.6×√LI | +0.4×√LI | — | — |
| HR | +(1.5+RBI)×CQ×√LI | -1.5×CQ×√LI | -0.3×√LI | — | +runs×√LI |
| Diving catch | -CQ×√LI | +0.3×√LI | — | +1.2×√LI | — |
| Error | +0.5×CQ×√LI | +0.1×√LI | — | -1.0×√LI | — |

#### Manager Decision Tracking (mWAR)

Auto-inferred decisions (no user input needed):
- Pitching changes (new pitcher ID detected)
- Pinch hitters (different batter than expected)
- Pinch runners (runner substitution)
- Defensive subs (fielder changes mid-game)
- Intentional walks (IBB result)

User-prompted decisions (defaults to player autonomy):
- Steal attempts
- Bunt for hit / sac bunt
- Squeeze plays
- Hit and run

**mWAR Formula**: `(decisionWAR × 0.60) + (overperformanceWAR × 0.40)`

### SMB4-Specific Clarifications (From User)

- **No foul balls in stands** - Can't be caught
- **No interference/obstruction** - Game engine doesn't support it
- **No balk** - But 3 pickoff attempts rule exists (runner advances on 4th)
- **D3K** - Needs to track which fielders were involved
- **No fan interference possible**
- **Pickoff vs CS** - Different credit (pitcher-initiated vs catcher-initiated)
- **Shifts** - Can be tracked as manager decisions

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `CLUTCH_ATTRIBUTION_SPEC.md` | **NEW** | ~800 lines, multi-participant credit distribution |
| `MWAR_CALCULATION_SPEC.md` | **NEW** | ~500 lines, manager decisions and overperformance |
| `CURRENT_STATE.md` | Updated | Added Clutch and mWAR to implementation status |
| `SESSION_LOG.md` | Updated | This session entry |

### Key Implementation Notes

1. **Contact Quality** is inferred from trajectory - no UI changes needed
2. **Manager decisions** are auto-detected by comparing expected vs actual game state
3. **Display threshold**: Clutch rating only shown after 10+ high-leverage PAs (prevents small sample noise)
4. **Fielder arm ratings** will come from player database (for infield single / sac fly evaluation)
5. **CS weights** favor catcher more than pitcher (catcher: +0.7/-0.6, pitcher: +0.2/-0.2)

### Decisions Made

1. **Bad hop = never blame fielder** - Credit modulated by CQ, but fielder always 0
2. **Extraordinary effort = always credit** - Diving attempts, robbery attempts get positive credit even on failure
3. **K-looking gives catcher credit** - Pitch calling/framing contribution (+0.4×√LI)
4. **TOOTBLAN credit goes to fielder who made play** - Not default to catcher
5. **Shifts default to "no shift"** - User prompts when shift is active

### Context for Next Session

- All WAR calculation specs complete (bWAR, fWAR, rWAR, pWAR)
- Clutch/choke system fully specified with LI weighting
- Manager WAR system designed with auto-inference
- SPEC docs are source of truth - SESSION_LOG is historical only
- SMB4-specific impossibilities documented in relevant specs

---

## Session: January 21, 2026 (Night Continued 14) - Leverage Index + Automated Clutch System

### What Was Accomplished

Created comprehensive `LEVERAGE_INDEX_SPEC.md` that enables automated clutch/choke scoring based on real-time game state.

### The Big Picture

User connected the dots: Leverage Index (used in pWAR for relievers) can also automate the entire clutch/choke system from the master spec. Instead of binary "close game within 2 runs" checks, we now have granular LI-weighted values.

### Key Components

1. **Leverage Index Calculation**
   - Uses base-out state (8 states × 3 outs = 24 combinations)
   - Applies inning multiplier (late innings = higher leverage)
   - Applies score dampener (blowouts = minimal leverage)
   - Formula: `LI = boLI × inningMult × scoreDamp`

2. **Base-Out LI Table**
   ```
   | State | 0 Out | 1 Out | 2 Out |
   |-------|-------|-------|-------|
   | Empty | 0.86  | 0.90  | 0.93  |
   | Loaded| 1.60  | 2.25  | 2.67  |
   ```

3. **LI-Weighted Clutch Values**
   - Old: Go-ahead RBI in 7th+ = +1 (if close game)
   - New: Go-ahead RBI = +1 × √(LI)
   - High-leverage moments naturally produce bigger values

4. **Net Clutch Rating (NCR)**
   - `NCR = Σ(clutch points) - Σ(choke points)`
   - Feeds directly into All-Star voting (30% weight)
   - Feeds into MVP/Cy Young voting

5. **Reliever pWAR Integration**
   - Can now track real gmLI (average leverage per appearance)
   - Replaces save-based estimation with actual LI data

### Example Values

| Situation | LI | Event | Base Value | Weighted Value |
|-----------|-----|-------|------------|----------------|
| 9th, tie, loaded, 2 out | 6.9 | Walk-off HR | +3.0 | **+7.9** |
| 9th, tie, loaded, 2 out | 6.9 | K (game over) | -2.0 | **-5.3** |
| 7th, down 1, runner on 1st | 1.3 | Go-ahead HR | +1.0 | **+1.1** |
| 3rd, down 5, empty | 0.2 | K with RISP | -1.0 | **-0.4** |

### Why This Matters

1. **Automates clutch detection** - No manual "CLUTCH SITUATION" badges
2. **Proportional rewards** - More important moments = bigger impact
3. **Fair penalties** - Blowout chokes barely count
4. **Completes the loop** - LI → pWAR (relievers) + Clutch Rating → All-Star/Awards

### Files Created/Modified

- `spec-docs/LEVERAGE_INDEX_SPEC.md` - **NEW** (comprehensive LI + clutch spec)
- `spec-docs/CURRENT_STATE.md` - Updated implementation status (Clutch now ✅ Ready)
- `spec-docs/AI_OPERATING_PREFERENCES.md` - Added LI spec to key calculation specs

### Implementation Status

All game state data needed for LI is already tracked (inning, outs, runners, score). This is fully implementable now.

---

## Session: January 21, 2026 (Night Continued 13) - Pitching WAR (pWAR) Spec

### What Was Accomplished

Created comprehensive `PWAR_CALCULATION_SPEC.md` documenting pitching WAR calculations based on FanGraphs FIP methodology.

### Key Components

1. **FIP (Fielding Independent Pitching)**
   - Formula: `((13×HR) + (3×(BB+HBP)) - (2×K)) / IP + FIPconstant`
   - FIP constant typically ~3.10-3.20, calibrated to match league ERA
   - Isolates pitcher skill from defense and luck on balls in play

2. **Pitcher-Specific Runs Per Win**
   - Better pitchers have lower RPW thresholds (their runs saved count more)
   - Simplified formula: `baseRPW × (pitcherFIP / leagueFIP)` clamped to 0.9-1.1

3. **Replacement Level by Role**
   - Starter: 0.12 wins per 9 IP above replacement
   - Reliever: 0.03 wins per 9 IP above replacement
   - Mixed: Weighted by GS/G ratio

4. **Leverage Index (Relievers)**
   - High-leverage relievers get more credit
   - Multiplier: `(avgLI + 1) / 2` (regressed halfway toward 1.0)
   - Closer (LI=1.8) → 1.40× multiplier

5. **Complete Formula**
   ```
   pWAR = ((lgFIP - FIP) / pitcherRPW + replacementLevel) × (IP/9) × leverageMultiplier
   ```

### SMB4 Implementation

- **Phase 1 (Now)**: FIP, basic pWAR, starter/reliever split, save-based leverage estimation
- **Phase 2 (Later)**: Full situational leverage tracking, park factors

### Example Values (48-game season)

| Pitcher Type | FIP | IP | pWAR |
|--------------|-----|-----|------|
| Ace starter | 2.57 | 90 | ~6.3 |
| Solid starter | 3.50 | 75 | ~2.8 |
| Elite closer | 2.47 | 25 | ~2.3 |
| Below-avg starter | 4.81 | 80 | ~-1.2 |

### Files Created/Modified

- `spec-docs/PWAR_CALCULATION_SPEC.md` - **NEW** (comprehensive spec)
- `spec-docs/CURRENT_STATE.md` - Updated implementation phases table
- `spec-docs/AI_OPERATING_PREFERENCES.md` - Added pWAR spec to key calculation specs

### WAR Suite Complete

All four WAR components now have comprehensive specs:
- **bWAR**: BWAR_CALCULATION_SPEC.md (wOBA, wRAA, replacement level)
- **fWAR**: FWAR_CALCULATION_SPEC.md (per-play run values)
- **rWAR**: RWAR_CALCULATION_SPEC.md (wSB, UBR, wGDP)
- **pWAR**: PWAR_CALCULATION_SPEC.md (FIP-based pitching WAR)

---

## Session: January 21, 2026 (Night Continued 12) - Future-Proofing Implementation Notes

### What Was Accomplished

Added consolidated "WAR Calculation Implementation Phases" section to CURRENT_STATE.md for discoverability.

### Why This Was Done

User asked if implementation notes (Phase 1 vs Phase 2 tracking requirements) were documented somewhere for future-proofing. While the notes existed in individual spec files (RWAR_CALCULATION_SPEC.md §8), they needed a consolidated view in CURRENT_STATE.md so any future AI or developer can quickly understand:

- What can be calculated NOW with current tracking
- What requires enhanced tracking (Phase 2)
- Where to find detailed implementation info

### Files Modified

- `spec-docs/CURRENT_STATE.md` - Added WAR Calculation Implementation Phases section with:
  - Summary table showing all WAR components and their status
  - Phase 1 vs Phase 2 breakdown
  - Cross-references to spec sections

### Next Up

- pWAR (Pitching WAR) spec still needs to be created

---

## Session: January 21, 2026 (Night Continued 11) - rWAR Calculation Spec

### What Was Accomplished

Created comprehensive `RWAR_CALCULATION_SPEC.md` documenting baserunning WAR calculations based on FanGraphs BsR methodology.

### Key Components (BsR = wSB + UBR + wGDP)

1. **wSB (Weighted Stolen Base Runs)**
   - SB value: +0.20 runs
   - CS penalty: -0.45 runs
   - Break-even rate: ~69% (2 SB per CS)

2. **UBR (Ultimate Base Running)**
   - Extra bases taken on hits (1st→3rd: +0.40, 2nd→Home: +0.55)
   - Tag-up scoring: +0.45 runs
   - Thrown out advancing: -0.60 to -0.80 runs

3. **wGDP (Double Play Avoidance)**
   - GIDP run cost: -0.44 runs
   - Compares player vs. league average rate

### SMB4-Specific Notes

- **Phase 1**: Can calculate wSB and wGDP now (data already tracked)
- **Phase 2**: Full UBR requires enhanced runner advancement tracking
- **Workaround**: Use Speed rating as UBR proxy until full tracking implemented

### Example rWAR Values (48-game season)

| Player Type | BsR | rWAR |
|-------------|-----|------|
| Speed demon (95 spd) | +7.9 | +2.67 |
| Average runner (50 spd) | -0.9 | -0.30 |
| Slow slugger (25 spd) | -3.7 | -1.26 |

### Files Created/Modified

- `spec-docs/RWAR_CALCULATION_SPEC.md` - **NEW** (comprehensive spec)
- `spec-docs/CURRENT_STATE.md` - Updated file structure
- `spec-docs/AI_OPERATING_PREFERENCES.md` - Updated session start protocol

### WAR Specs Status

| Spec | Status |
|------|--------|
| BWAR_CALCULATION_SPEC.md | ✅ Done |
| FWAR_CALCULATION_SPEC.md | ✅ Done |
| RWAR_CALCULATION_SPEC.md | ✅ Done |
| PWAR_CALCULATION_SPEC.md | ❌ TBD |

---

## Session: January 21, 2026 (Night Continued 10) - bWAR Calculation Spec

### What Was Accomplished

Created comprehensive `BWAR_CALCULATION_SPEC.md` documenting complete batting WAR calculations based on FanGraphs methodology.

### Key Components

1. **Linear Weights** - Run value per offensive event (1B: 0.87, HR: 2.01, BB: 0.69, etc.)
2. **wOBA** - Weighted on-base average combining all events
3. **wRAA** - Weighted runs above average (converts wOBA to cumulative runs)
4. **Replacement Level** - Starting at -17.5 runs per 600 PA (MLB baseline)
5. **Calibration System** - Adjusts weights and replacement level based on league data over time

### The bWAR Formula

```
bWAR = (wRAA + Replacement Level Runs) / Runs Per Win
```

### Season Length Scaling

Uses same scaling as fWAR (10 runs per win for 162 games, 2.96 for 48 games, etc.)

### Calibration System

The spec includes a self-calibrating system that:
- Collects league-wide event frequencies and run totals
- Recalculates linear weights based on actual run environment
- Adjusts replacement level based on bottom-20% performer data
- Blends new calibrations with existing (30% new, 70% existing)

This allows the system to adapt to SMB4's unique run-scoring environment over time rather than blindly using MLB weights.

### Files Created/Modified

- `spec-docs/BWAR_CALCULATION_SPEC.md` - **NEW** (comprehensive spec)
- `spec-docs/CURRENT_STATE.md` - Updated file structure
- `spec-docs/AI_OPERATING_PREFERENCES.md` - Updated session start protocol

### What's Next

Remaining WAR components to spec out:
- `RWAR_CALCULATION_SPEC.md` - Baserunning WAR (stolen bases, advancement, outs on bases)
- `PWAR_CALCULATION_SPEC.md` - Pitching WAR (FIP-based or RA9-based)

---

## Session: January 21, 2026 (Night Continued 9) - Fielding Tracking Gaps

### What Was Accomplished

Identified and fixed gaps in fielding data tracking required for accurate fWAR calculations. Updated both FIELDING_SYSTEM_SPEC.md and FWAR_CALCULATION_SPEC.md.

### Gap Analysis Summary

| Gap | Status |
|-----|--------|
| Missing play types (running, sliding, over_shoulder) | ✅ Added |
| Missing mental error type | ✅ Added |
| Missing DP role tracking (turned, completed) | ✅ Added |
| Missing error context flags | ✅ Added |
| Naming inconsistency (jumping → leaping) | ✅ Fixed |
| Barehanded plays (not possible in SMB4) | ✅ Removed |
| Assist type + target base tracking | ✅ Added |
| Outfield assist breakdown by base | ✅ Added |

### Schema Changes (FIELDING_SYSTEM_SPEC.md)

**FieldingPlay record additions:**
```typescript
// Play types expanded
playType: 'routine' | 'diving' | 'leaping' | 'wall' | 'charging' |
          'running' | 'sliding' | 'over_shoulder' | ...

// Error types expanded
errorType?: 'fielding' | 'throwing' | 'mental' | ...

// Error context (NEW)
errorContext?: {
  allowedRun: boolean;   // 1.5x penalty
  wasRoutine: boolean;   // 1.2x penalty
  wasDifficult: boolean; // 0.7x penalty (reduced)
}

// Assist tracking expanded
assists: Array<{
  assistType: 'infield' | 'outfield' | 'relay' | 'cutoff';
  targetBase?: '1B' | '2B' | '3B' | 'HOME';
}>

// DP role tracking (NEW)
dpRole?: 'started' | 'turned' | 'completed' | 'unassisted';
```

**PlayerFieldingStats additions:**
- `doublePlaysTurned`, `doublePlaysCompleted`
- `runningCatches`, `slidingCatches`, `overShoulderCatches`
- `outfieldAssistsToSecond`, `outfieldAssistsToThird`, `outfieldAssistsToHome`
- `mentalErrors`
- Renamed `jumpingCatches` → `leapingCatches`
- Removed `barehandedPlays` (not possible in SMB4)

### SMB4-Specific Note

Barehanded plays are impossible in SMB4's game engine, so all references have been removed from both specs.

### Files Modified

- `spec-docs/FIELDING_SYSTEM_SPEC.md` - Schema updates, star play table, error categories
- `spec-docs/FWAR_CALCULATION_SPEC.md` - Removed barehanded multiplier, added SMB4 note

---

## Session: January 21, 2026 (Night Continued 8) - Season Length Scaling

### What Was Accomplished

Added season-length scaling to fWAR calculations. In shorter seasons, each run saved has proportionally more impact on winning percentage.

### The Key Insight

MLB uses **10 runs = 1 WAR** for a 162-game season. For SMB4's shorter seasons, runs-per-win scales proportionally:

| Season | Games | Runs Per Win | Impact Multiplier |
|--------|-------|--------------|-------------------|
| MLB | 162 | 10.00 | 1.0x |
| Long SMB4 | 48 | 2.96 | 3.4x |
| Standard SMB4 | 32 | 1.98 | 5.1x |
| Short SMB4 | 20 | 1.23 | 8.1x |

**Formula**: `Runs Per Win = 10 × (seasonGames / 162)`

### Example Impact

A SS diving catch (0.090 runs saved):
- In 48-game season: 0.090 / 2.96 = **+0.030 fWAR**
- In 20-game season: 0.090 / 1.23 = **+0.073 fWAR**

Same play, same runs saved, but 2.4x more fWAR in the shorter season!

### Files Modified

- `spec-docs/FWAR_CALCULATION_SPEC.md` - Added Section 2 (Season Length Scaling), updated all tables to show runs with fWAR conversion examples
- `spec-docs/KBL_XHD_TRACKER_MASTER_SPEC_v3.md` - Updated 10+ UI example fWAR values to use 48-game scaled values

### Why This Matters

This ensures that elite fielders show appropriate fWAR totals regardless of season length. An elite defender in a 20-game season might have +0.4 fWAR, while the same performance in a 48-game season would show +0.17 fWAR - both representing the same percentile of defensive value.

---

## Session: January 21, 2026 (Night Continued 7) - fWAR Value Reconciliation

### What Was Accomplished

Identified and fixed contradictions between Master Spec v3 UI examples and the new FWAR_CALCULATION_SPEC.

### The Contradiction

Master Spec v3 had **placeholder fWAR values** in UI examples that were ~7-20x higher than MLB-calibrated values:

| Event | Master Spec (OLD) | FWAR Spec (CORRECT) |
|-------|-------------------|---------------------|
| Diving catch saves run | +1.5 fWAR | +0.08 fWAR |
| Outfield putout | +0.3 fWAR | +0.04 fWAR |
| Outfield assist | +1.5 fWAR | +0.13 fWAR |
| Star play | +0.25 fWAR | +0.08 fWAR |
| Robbed HR | +0.5 fWAR | +0.15 fWAR |
| Fielding error | -1.5 fWAR | -0.15 fWAR |

### Why Master Spec Was Wrong

The old values were illustrative placeholders that "looked reasonable" but weren't derived from sabermetric principles. Using them would make a fielder with 10 star plays accumulate +2.5 fWAR, when elite MLB fielders only accumulate ~+1.5 fWAR across a 162-game season.

### Resolution

1. **Updated Master Spec v3 UI examples** to use correct fWAR values
2. **Added cross-reference header** at top of Master Spec pointing to FWAR_CALCULATION_SPEC as authoritative source
3. **FWAR_CALCULATION_SPEC.md is now the single source of truth** for all fWAR calculations

### Files Modified

- `spec-docs/KBL_XHD_TRACKER_MASTER_SPEC_v3.md` - Fixed 8 fWAR values in UI examples, added cross-reference header

---

## Session: January 21, 2026 (Night Continued 6) - fWAR Calculation Spec

### What Was Accomplished

Created comprehensive `FWAR_CALCULATION_SPEC.md` documenting complete per-play fWAR calculations based on MLB methodologies (OAA, DRS, UZR).

### Key Deliverables

1. **Per-play run values** for putouts, assists, double plays, errors
2. **Positional adjustments** (C=1.3x, SS=1.2x, 1B=0.7x, etc.)
3. **Star play multipliers** (diving=2.5x, robbed HR=5.0x)
4. **Error penalties** with context modifiers
5. **Integration with EOS salary percentile system** from Master Spec v3
6. **Quick reference tables** for all calculations

### MLB Research Summary

- OAA to Runs: OF = 0.9 runs/out, IF = 0.75 runs/out
- 10 fielding runs = 1 fWAR
- Scaled for 48-game SMB4 season (29.6% of MLB 162 games)

### Why This Matters

This closes the gap where our specs showed fWAR *values* scattered in UI examples but had no consolidated calculation methodology. A new AI can now:
- Look up exact run value for any fielding play
- Understand position modifiers
- Calculate season fWAR from play-by-play data
- Integrate with EOS salary adjustment system

### Files Created/Modified

- `spec-docs/FWAR_CALCULATION_SPEC.md` - **NEW** (comprehensive spec)
- `spec-docs/FIELDING_SYSTEM_SPEC.md` - Added cross-reference
- `spec-docs/CURRENT_STATE.md` - Updated file structure
- `spec-docs/AI_OPERATING_PREFERENCES.md` - Updated session start protocol

---

## Session: January 21, 2026 (Night Continued 5) - SMB4 Reference Integration

### What Was Accomplished

1. Read and analyzed two key SMB4 reference documents provided by user
2. Created comprehensive `SMB4_GAME_REFERENCE.md` spec extracting key mechanics
3. Copied reference documents to `reference-docs/` folder in project
4. Updated session start protocol to include SMB4 reference

### Reference Documents Added

- **BillyYank Super Mega Baseball Guide 3rd Edition.docx** - 90+ page comprehensive guide
- **Jester's Super Mega Baseball Reference V2 clean.xlsx** - Season-over-season stat tracking with ~220 columns

### Key SMB4 Concepts Now Documented

- **Mojo System**: 6 levels (Jacked → Rattled), affects Fame tracking
- **Chemistry & Traits**: 5 types, 3 potency levels, 40+ traits documented
- **Pitcher Arsenal**: 8 pitch types with mechanics
- **Position Requirements**: Minimum FLD/SPD/ARM by position
- **Stats to Track**: Full list from Jester's reference (batting, pitching, fielding, calculated stats, awards)

### Files Modified/Created

- `spec-docs/SMB4_GAME_REFERENCE.md` - NEW comprehensive spec
- `reference-docs/` - NEW folder with source documents
- `spec-docs/AI_OPERATING_PREFERENCES.md` - Updated session start protocol
- `spec-docs/CURRENT_STATE.md` - Updated file structure, clarified SMB4 focus

### Context for Next Session

- SMB4 mechanics are now documented in specs
- Reference docs available for deep dives on traits, WAR calculations, etc.
- Project is explicitly for SMB4, not generic baseball

---

## Session: January 21, 2026 (Night Continued 4) - Knowledge Promotion Protocol

### What Was Accomplished

Added "Knowledge Promotion Protocol" to AI_OPERATING_PREFERENCES.md Section 10.5-10.6 to ensure documentation stays aggregate and doesn't degrade over time.

### The Problem

User identified risk: SESSION_LOG captures what happened, but critical implementation details could stay buried there. New AI sessions might miss context or repeat mistakes.

### The Solution

Added two new sections to AI_OPERATING_PREFERENCES.md:

1. **Section 10.5 - Knowledge Promotion Protocol**: Rules for moving finalized logic from session notes to proper SPEC docs
2. **Section 10.6 - SPEC Doc Quality Standards**: Template and requirements for spec sections

### Key Rules Established

- SESSION_LOG = *what happened* (historical)
- SPEC docs = *how things work* (source of truth)
- After any significant work, PROMOTE knowledge to specs
- SPEC docs must be self-contained, code-linked, decision-explained, example-rich

### Files Modified

- `spec-docs/AI_OPERATING_PREFERENCES.md` - Added 10.5-10.6, updated session start protocol

### Context for Next Session

- Knowledge protocol is now documented
- Future AI should always ask: "Should anything from SESSION_LOG be promoted to a SPEC doc?"
- FIELDING_SYSTEM_SPEC.md Section 1.1 is the canonical location for fielding chance logic

---

## Session: January 21, 2026 (Night Continued 3) - Fielding Attempt on Hits

### What Was Accomplished

Added "FIELDING ATTEMPT?" options for hits to properly track fielding chances when a fielder attempts a play but the ball still falls for a hit.

### The Problem

After fixing the fielding chance bug (hits don't require fielding confirmation), we had no way to track scenarios like:
- SS dives for a grounder, ball gets through → 1B (fielding chance should count)
- CF attempts HR robbery, fails → HR (fielding chance should count)

### The Solution

1. **Added new SpecialPlayType values**: `'Clean'` and `'Robbery Attempt'`
2. **Created separate button arrays**:
   - For outs: `['Routine', 'Diving', 'Wall Catch', 'Running', 'Leaping']`
   - For hits: `['Clean', 'Diving', 'Leaping', 'Robbery Attempt']`
3. **Auto-default to "Clean"** for hits (assumes no fielding attempt unless user intervenes)
4. **Updated needsFieldingConfirmation logic**:
   ```typescript
   const hitWithFieldingAttempt = isHitResult && specialPlay !== null && specialPlay !== 'Clean';
   const needsFieldingConfirmation =
     (isOutOrErrorResult && !['K', 'KL'].includes(result)) || hitWithFieldingAttempt;
   ```

### UI Changes

- Hits now show "FIELDING ATTEMPT?" section with Clean/Diving/Leaping/Robbery Attempt
- "Clean" is auto-selected (green) by default
- Selecting non-Clean option shows orange hint: "Fielder will be credited with a fielding chance"
- Non-Clean selection triggers fielding confirmation flow

### Browser Verification

| Test | Status | Notes |
|------|--------|-------|
| 1B with Clean (default) | ✓ Pass | Direct "Confirm At-Bat" button |
| 1B with Diving selected | ✓ Pass | Shows warning + "Continue to Fielding →" |
| HR with Clean (default) | ✓ Pass | Direct "Confirm At-Bat" button |
| HR with Robbery Attempt | ✓ Pass | Shows warning + "Continue to Fielding →" |

### Files Modified

- `src/types/game.ts` - Extended SpecialPlayType with 'Clean' and 'Robbery Attempt'
- `src/components/GameTracker/AtBatFlow.tsx` - Added fielding attempt UI and logic

---

## Session: January 21, 2026 (Night Continued) - Browser Testing & Connector Documentation

### What Was Accomplished

1. **Completed end-to-end browser testing of FieldingModal**:
   - Verified fielder inference (Left-Center + Ground → SS auto-selected)
   - Verified FieldingModal opens from AtBatFlow
   - Verified contextual UI (special situations hidden when not applicable)
   - Verified confirmation flow (yellow warning → green confirmation)
   - Verified activity log records fielding data correctly ("Willie Mays: Grounds out to SS.")

2. **Updated AI_OPERATING_PREFERENCES.md** with Section 11: AI Connector Capabilities:
   - Documented Desktop Commander (MCP) capabilities
   - Documented Claude in Chrome browser automation tools
   - Created testing protocol with connectors
   - Added example workflow for future AI sessions

### Browser Testing Results

| Test | Status | Notes |
|------|--------|-------|
| Click GO button | ✓ Pass | AtBatFlow modal opens |
| Select Left-Center + Ground | ✓ Pass | SS auto-inferred correctly |
| "Continue to Fielding" button | ✓ Pass | FieldingModal opens |
| FieldingModal shows inferred fielder | ✓ Pass | SS selected, "(inferred)" label shown |
| Contextual toggles hidden | ✓ Pass | "No special situations" displayed (correct for 0 outs, no runners) |
| "Confirm Fielding" button | ✓ Pass | Returns to AtBatFlow with green confirmation |
| "Confirm At-Bat" button | ✓ Pass | Play recorded, outs increment, batter advances |
| Activity log | ✓ Pass | "Willie Mays: Grounds out to SS." displayed |

### Testing Method

Used AI connectors directly:
- **Desktop Commander**: Started dev server on user's Mac via `source ~/.zshrc && cd /Users/johnkruse/Projects/kbl-tracker && npm run dev`
- **Claude in Chrome**: Navigated to localhost:5173, took screenshots, executed JavaScript to interact with UI

### Context for Next Session

- Fielding system is fully functional end-to-end
- AI_OPERATING_PREFERENCES.md now documents connector capabilities for future sessions
- Next priority: data persistence to store fielding records with games

---

## Session: January 21, 2026 (Night Continued 2) - Fielding Chance Bug Fix

### What Was Accomplished

**Fixed critical fielding chance bug**: Hits (1B, 2B, 3B, HR) were incorrectly requiring fielding confirmation, which would have credited fielders with fielding chances even when no play was attempted.

### The Bug

The `needsFieldingConfirmation` check was including all ball-in-play results, which meant:
- HR to center field → CF credited with fielding chance (WRONG)
- Clean single to left → LF credited with fielding chance (WRONG)

### The Fix

Changed logic in AtBatFlow.tsx:
```typescript
// Before (WRONG):
const needsFieldingConfirmation = requiresBallInPlayData(result) || result === 'D3K';

// After (CORRECT):
const isOutOrErrorResult = isOut(result) || result === 'E' || result === 'D3K';
const needsFieldingConfirmation = isOutOrErrorResult && !['K', 'KL'].includes(result);
```

### Fielding Chance Logic

| Result | Fielding Confirmation | Fielding Chance | Reason |
|--------|----------------------|-----------------|--------|
| HR | ❌ Not required | ❌ No | Ball over fence, no play |
| 1B | ❌ Not required | ❌ No | Clean hit, ball got through |
| 2B | ❌ Not required | ❌ No | Clean hit, ball got through |
| 3B | ❌ Not required | ❌ No | Clean hit, ball got through |
| GO | ✅ Required | ✅ Yes | Fielder made the play |
| FO | ✅ Required | ✅ Yes | Fielder made the play |
| LO | ✅ Required | ✅ Yes | Fielder made the play |
| PO | ✅ Required | ✅ Yes | Fielder made the play |
| E | ✅ Required | ✅ Yes | Fielder attempted but failed |
| D3K | ✅ Required | ✅ Yes | Catcher involved |
| K/KL | ❌ Not required | ❌ No | Strikeout, no batted ball |

### Browser Verification

Tested via Chrome automation:
- HR → Direct "Confirm At-Bat" button (no fielding modal) ✓
- 1B → Direct "Confirm At-Bat" button (no fielding modal) ✓
- GO → "Continue to Fielding →" button (fielding modal required) ✓

### Files Modified

- `src/components/GameTracker/AtBatFlow.tsx` - Fixed needsFieldingConfirmation logic

---

## Session: January 21, 2025 (Night) - Fielding Implementation

### What Was Accomplished

1. **Updated FIELDING_SYSTEM_SPEC.md** with edge cases:
   - Complete D3K scenarios (thrown out, safe on WP/PB/Error)
   - Infield Fly Rule tracking (IFR)
   - Ground Rule Double tracking (GRD)
   - Bad Hop tracking (for Moneyball-type analysis)
   - Contextual UI principles (show toggles only when relevant)

2. **Created FieldingModal.tsx** - New component for fielding confirmation:
   - Enhanced fielder inference matrices (ground balls, fly balls, line drives, pop flies)
   - DP chain selection with all common combinations
   - Play type selection (routine, diving, leaping, wall, charging, barehanded)
   - Contextual toggles: IFR, GRD, Bad Hop, Nutshot, Comebacker Injury, HR Robbery
   - D3K outcome tracking (thrown out, WP, PB, C error, 1B error)

3. **Updated types/game.ts** with new fielding types:
   - `PlayType`, `ErrorType`, `D3KOutcome`
   - `AssistChainEntry`, `FieldingData` interfaces
   - Extended `AtBatFlowState` to include `fieldingData`

4. **Integrated fielding modal into AtBatFlow.tsx**:
   - Added "Continue to Fielding →" button after basic inputs
   - Fielding status indicator showing confirmation state
   - Edit button to modify fielding data
   - Two-step flow: basic at-bat → fielding confirmation → submit

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `FIELDING_SYSTEM_SPEC.md` | Updated | Added sections 14-18 (IFR, GRD, Shift, Adaptive, Contextual UI) |
| `FieldingModal.tsx` | Created | New fielding confirmation component |
| `types/game.ts` | Updated | Added fielding types and interfaces |
| `AtBatFlow.tsx` | Updated | Integrated fielding modal, two-step flow |

### Key Implementation Details

- **Fielder inference**: Uses direction + exit type to infer most likely fielder
- **Contextual UI**: Toggles only appear when applicable (IFR only with R1&R2 + <2 outs)
- **wasOverridden tracking**: For adaptive learning - know when user corrects inference
- **D3K handling**: Distinguishes between thrown out and safe (WP/PB/Error)

### Pending/Next Steps

1. ~~**Test fielding tracking** - NFL verification through browser testing~~ ✓ DONE
2. **Implement data persistence** - Store fielding data with game records
3. **Build spray chart** - Visualize batted ball locations using fielding data
4. **Implement shift toggle** - Modify inference when shift is active

### NFL Verification Complete

Created comprehensive test suite (`fieldingInferenceTests.ts`) with **88 tests**, all passing:

**Fielder Inference Tests (44 tests)**:
- Ground ball inference by direction (GO, DP, FC, SAC)
- Fly ball inference by direction (FO, SF)
- Line drive inference by direction (LO)
- Pop fly inference by direction (PO)
- Hit tracking with exit type (1B, 2B, 3B)
- Null direction handling

**Contextual Visibility Tests (21 tests)**:
- IFR toggle visibility (PO/FO + R1&R2 + <2 outs)
- GRD toggle visibility (2B only)
- Bad Hop toggle visibility (hits only)
- Nutshot toggle visibility (Center + GO/LO/1B)
- Robbery toggle visibility (HR only)

**DP Chain Tests (13 tests)**:
- All standard DP chains (6-4-3, 4-6-3, 5-4-3, etc.)
- Assist chain parsing
- Putout position determination

**D3K Outcome Tests (10 tests)**:
- All 5 D3K outcomes verified
- Strikeout always credited regardless of outcome
- Batter out/safe status correct

### Bug Fix Applied

Fixed boolean coercion issue in IFR visibility check:
```typescript
// Before (returned object instead of boolean)
((bases.first && bases.second) || ...)

// After (proper boolean)
((!!bases.first && !!bases.second) || ...)
```

### Context for Next Session

- TypeScript compiles successfully ✓
- 88 fielding tests pass ✓
- Dev server has platform-specific rollup issue (node_modules from macOS)
- Browser testing recommended on user's local machine to verify UI flow
- Next priority: data persistence to store fielding records

---

## Session: January 21, 2025 (Evening) - Fielding System Specification

### What Was Accomplished

1. **Created AI_OPERATING_PREFERENCES.md** - Documented user's core operating principles (NFL, scope discipline, completion protocol, etc.)
2. **Updated CURRENT_STATE.md** - Added session start protocol directing future AI to read operating preferences
3. **Conducted deep MLB fielding research** - Position responsibilities, batted ball distributions, assist chains, error types
4. **Created comprehensive FIELDING_SYSTEM_SPEC.md** covering:
   - Fielder inference logic by batted ball type + direction
   - Catcher & pitcher fielding scenarios (including strikeout putouts)
   - Foul ball handling with zone breakdown
   - Hit tracking (1B, 2B, 3B) for spray charts
   - Sacrifice fly and fielder's choice flows
   - Assist chain tracking (including all DP combinations)
   - Star plays & exceptional fielding categories
   - SMB4-specific events (nutshots, comebacker injuries, failed HR robberies)
   - Shift handling
   - Adaptive learning system design
   - Complete data schema

### Decisions Made

1. **Adaptive Learning Architecture** - All inference systems will track expected vs. actual and improve over time. Applies to fielding, park factors, player tendencies, etc.
2. **UI/UX Deferred** - Complete backend logic first, then do comprehensive design pass
3. **Fielding before Persistence** - Get data structure right before persisting incomplete records

### Key Design Elements

- **Inference with override**: System guesses most likely fielder, user confirms or changes
- **Strikeout putouts**: Catcher automatically credited with PO on every K
- **Foul territory**: Added FL (foul left) and FR (foul right) zones
- **SMB4 events**: Nutshot (mojo impact), comebacker injuries (fitness impact), failed HR robberies (-1 Fame)
- **Learning system**: Track wasOverridden to identify weak inference areas

### Pending/Next Steps

1. Implement fielding tracking in UI (add fielding confirmation modal)
2. Implement data persistence (now more critical with adaptive learning)
3. Build spray chart visualization (future UI/UX phase)
4. Implement shift toggle functionality

### Context for Next Session

- FIELDING_SYSTEM_SPEC.md is the source of truth for fielding implementation
- User wants fielding to be as comprehensive as batting/pitching tracking
- Adaptive learning is a core architectural principle across all systems
- SMB4-specific events (nutshot, comebacker injury) must be tracked

---

## Session: January 21, 2025 (Afternoon) - Comprehensive UI Testing

### What Was Accomplished

1. **Completed full UI test suite** - 17 scenarios tested through browser automation
2. **All critical/high/medium/low risk scenarios verified**
3. **Updated WORST_CASE_SCENARIOS.md** with detailed test results
4. **Created institutional knowledge documentation**:
   - CURRENT_STATE.md
   - DECISIONS_LOG.md
   - REQUIREMENTS.md
   - SESSION_LOG.md (this file)

### Test Results Summary

| Category | Tests | Passed | Failed | Not Impl |
|----------|-------|--------|--------|----------|
| Critical (C1-C4) | 4 | 4 | 0 | 0 |
| High (H1-H2) | 2 | 2 | 0 | 0 |
| Medium (M1-M6) | 6 | 5 | 0 | 1 |
| Low (L1-L5) | 5 | 5 | 0 | 0 |
| **Total** | **17** | **16** | **0** | **1** |

### Key Findings

1. **Pinch Hitter button exists but has no modal/logic** - Marked as not implemented
2. **All RBI logic correct** - Verified for walks, HBP, errors, productive outs
3. **All runner advancement logic correct** - Force plays, base clearing, etc.
4. **All event types work** - SB, CS, WP, PB, Balk all tested

### Decisions Made

- Established **Institutional Knowledge Protocol** for future sessions
- Created documentation structure to survive context compaction
- Confirmed app is for **video game baseball**, not real baseball

### Pending/Next Steps

1. Implement substitution system (Pinch Hitter, Pinch Runner, Def Sub)
2. Add data persistence (localStorage or IndexedDB)
3. Consider pitcher stat tracking

### Context for Next Session

- App is in stable, working state
- All core functionality tested and passing
- Main gap is substitution system (buttons exist, no logic)
- User values thoroughness and documentation

---

## Session: January 21, 2025 (Morning) - Bug Fixes

### What Was Accomplished

1. **Fixed DP out counting bug** - Was adding 3 outs instead of 2
2. **Fixed base clearing bug** - Wrong base cleared when R2 scored
3. **Fixed extra events processing** - Events during at-bat now applied
4. **Started UI testing protocol**

### Bugs Fixed

| Bug | Root Cause | Fix |
|-----|------------|-----|
| DP adds 3 outs | Runner "Out" double-counted | Don't add out for runner on DP |
| Wrong base cleared | Line 183 said `third` not `second` | Changed to `second` |
| Extra events lost | Not processed in handleAtBatFlowComplete | Added processing loop |

---

## Template for New Sessions

```markdown
## Session: [Date] - [Brief Description]

### What Was Accomplished
- [Bullet points of completed work]

### Decisions Made
- [Key decisions with brief rationale]

### Bugs Found/Fixed
- [Any issues discovered]

### Pending/Next Steps
- [What's left to do]

### Context for Next Session
- [Important state/information to preserve]
```

---

*Add new sessions at the top of this document.*
