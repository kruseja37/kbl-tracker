# KBL Tracker - Current State

> **Purpose**: Single source of truth for what's implemented, what's not, and known issues
> **Last Updated**: February 9, 2026 (Pipeline CRIT fixes — 10/11 pipelines INTACT, 0 TS errors, 5094 tests passing)

---

## Data Pipeline Critical Fixes (February 9, 2026) 🔧

**Pipeline trace report**: `spec-docs/DATA_PIPELINE_TRACE_REPORT.md`
**Machine-readable**: `test-utils/pipeline-trace-data.json`

| CRIT ID | Pipeline | Issue | Status |
|---------|----------|-------|--------|
| CRIT-01 | PL-03 Standings | `seasonId` never set on `CompletedGameRecord` — standings always mock | ✅ Fixed |
| CRIT-03 | PL-01/02 Team Assignment | All batters → away team, all pitchers → home team | ✅ Fixed |
| CRIT-04 | PL-01/02 Player Names | Names stored as player IDs in season stats | ✅ Fixed |
| CRIT-02 | PL-09 Pitcher Decisions | W/L/SV/H/BS never serialized or aggregated to season stats | ✅ Fixed |
| CRIT-05 | PL-05 Fielding Stats | putouts/assists/errors always 0 — infrastructure orphaned | ⚠️ NEEDS FEATURE WORK |

**Pipeline health**: 10/11 INTACT, 1 NEEDS FEATURE WORK (fielding inference)

### Remaining Data Quality Issues (MEDIUM)
- HBP/SF/SAC/GIDP not tracked in game-level batting stats (affects wOBA accuracy slightly)
- Division assignment for standings is arbitrary (no league/division config exists)
- `playerTeam` always '' in fame events (doesn't affect aggregation)

---

## GameTracker Canonical Bug Fixes (February 9, 2026) 🐛

**Logic matrix**: 480/480 tests pass (20 outcomes × 8 base states × 3 out counts)
**Report**: `spec-docs/LOGIC_MATRIX_REPORT.md`

| Bug ID | Description | Fix Summary | Status |
|--------|-------------|-------------|--------|
| D-04 | Error RBI credited | `recordError` ignores rbi parameter; errors never credit RBI | ✅ Fixed |
| D-05 | D3K leverageIndex hardcoded 1.0 | Uses `getBaseOutLI(baseState, outs)` like other at-bats | ✅ Fixed |
| D-07 | TOOTBLAN fame flat -3.0 | Tiered: -0.5 base, -2.0 rally killer (scoring pos + <2 outs) | ✅ Fixed |
| D-01 | Pitcher W/L = most runsAllowed | Lead-change tracking via AtBatEvents; falls back to heuristic | ✅ Fixed |

**Test infrastructure created**: `test-utils/run-logic-matrix.ts` (harness), `test-utils/golden-cases.json` (30 golden cases)

---

## Spec-UI Alignment Audit (February 5, 2026) 🔍

**Full report**: `spec-docs/SPEC_UI_ALIGNMENT_REPORT.md`

### Critical Bugs Found (6) — All 6 Fixed
| ID | Issue | Location | Status |
|----|-------|----------|--------|
| CRIT-01 | Undo doesn't restore player/pitcher stats | useGameState.ts, GameTracker.tsx | ✅ Fixed (Map serialization) |
| CRIT-02 | All runs marked earned (no ER/UER) | useGameState.ts | ✅ Fixed (Tier 2: wired inheritedRunnerTracker via shadow state pattern) |
| CRIT-03 | FC runs incorrectly unearned | inheritedRunnerTracker.ts:216 | ✅ Fixed (removed FC exclusion) |
| CRIT-04 | TP silently mapped to DP | game.ts, useGameState.ts | ✅ Fixed (TP now first-class AtBatResult) |
| CRIT-05 | Mojo applies uniformly (should differ) | mojoEngine.ts | ✅ Fixed (added applyCombinedModifiers) |
| CRIT-06 | Robbery fame values wrong | types/game.ts + 6 files | ✅ Fixed (1.5/2.5 → 1/1 per spec v3.3) |

### Tier 2 Wiring Fixes (February 5, 2026)
| ID | Issue | Location | Status |
|----|-------|----------|--------|
| MAJ-10 + MIN-01 + MIN-03 | OutcomeButtons: situational disable, ROE→E, add TP | OutcomeButtons.tsx, EnhancedInteractiveField.tsx | ✅ Fixed |
| CRIT-02 + MAJ-05 | Wire inheritedRunnerTracker for ER/UER attribution | useGameState.ts (11 integration points) | ✅ Fixed |

**Fix report**: `spec-docs/FIX_EXECUTION_REPORT_2026-02-05.md`

### Orphaned Systems Status (Updated Feb 7, Part 2)
- ~~WAR calculators (bWAR, pWAR, fWAR, rWAR)~~ — ✅ NOW WIRED to 3 UI surfaces (League Leaders, Team Hub, Season Leaderboards)
- ~~mWAR~~ — ✅ NOW WIRED (full pipeline: decisions → storage → aggregation → MOY → display)
- ~~Fan Morale engine~~ — ✅ WIRED (useFanMorale.processGameResult → GameTracker.handleEndGame + rival detection)
- ~~Narrative engine~~ — ✅ WIRED (home + away narratives → GameTracker.handleEndGame)
- ~~Detection Functions~~ — ✅ WIRED (runPlayDetections → GameTracker.handleEnhancedPlayComplete)
- ~~Inherited Runner Tracker~~ — ✅ WIRED (shadow state pattern, 11 integration points)
- ~~Relationship engine~~ — ✅ NOW WIRED (through useFranchiseData context)
- **No remaining orphaned systems** 🎉

### Spec Alignment Score (Updated Feb 7)
| System | Constants | Connectivity |
|--------|-----------|-------------|
| WAR (bWAR/pWAR/fWAR/rWAR) | 100% | ✅ Connected (3 UI surfaces) |
| mWAR | 100% | ✅ Connected (decisions → storage → aggregation → MOY → display) |
| Mojo/Fitness/Salary | 100% | Connected |
| Fame | 84% | Connected (detection wired) |
| Fan Morale | 100% | Connected (processGameResult wired + rival detection) |
| Narrative | 100% | Connected (home + away recaps) |
| Leverage | 100% | Connected |
| GameTracker | 95% | 6 critical bugs FIXED, detection+achievements wired |
| Substitution | — | ✅ Backend + UI triggers wired (subType, position_swap) |
| PitcherGameStats | 100% | Expanded 9→29 fields, W/L/SV decisions tracked |
| Relationship Engine | 100% | ✅ Connected (through useFranchiseData) |

---

## Testing Implementation Plan Status

### Phase 0, 1 & 2 COMPLETE ✅

**Document**: `spec-docs/TESTING_IMPLEMENTATION_PLAN.md`

The testing plan now covers the **complete Figma UI**, not just GameTracker:

| Phase | Coverage | Status |
|-------|----------|--------|
| Phase 0 | Bug Regression Tests | ✅ **COMPLETE** (106 tests) |
| Phase 1 | Baseball Rules Logic | ✅ **COMPLETE** (273 tests) |
| Phase 2 | Statistical Calculations | ✅ **COMPLETE** (365 tests) |
| Phase 3-5 | Engines, Stats, Persistence | ❌ Not started |
| Phase 6 | GameTracker UI Components (35 components) | ❌ Not started |
| Phase 7 | League Builder (7 pages + 1 hook) | ❌ Not started |
| Phase 8 | Franchise Mode (15 components + 6 hooks) | ❌ Not started |
| Phase 9 | Exhibition Mode (2 pages + 1 component) | ❌ Not started |
| Phase 10 | Playoff/World Series (1 page + 4 subcomponents) | ❌ Not started |
| Phase 11 | App Home & Navigation | ❌ Not started |

**Current Total**: 5094 tests passing (106 test files, 0 failures)

**Next Step**: Continue with Phase 3+ as needed

### Phase 0 Regression Test Files Created
```
src/src_figma/__tests__/regressionTests/
├── walkClassification.test.ts   ✅ 26 tests (BUG-001/002/003/007)
├── d3kHandler.test.ts           ✅ 32 tests (BUG-004)
├── stolenBaseLogic.test.ts      ✅ 30 tests (BUG-006)
└── minorBugFixes.test.ts        ✅ 18 tests (BUG-008/009)
```

**Total**: 106 regression tests covering 9 fixed bugs

### Phase 1 Baseball Logic Test Files Created
```
src/src_figma/__tests__/baseballLogic/
├── runnerMovement.test.ts         ✅ 87 tests (force plays, hit/out defaults, walks)
├── d3kTracker.test.ts             ✅ 43 tests (D3K engine functions)
├── infieldFlyRule.test.ts         ✅ 46 tests (IFR conditions and outcomes)
├── saveDetector.test.ts           ✅ 50 tests (save/blown save/hold detection)
└── inheritedRunnerTracker.test.ts ✅ 47 tests (ER attribution, inherited runners)
```

**Total**: 273 tests covering baseball rules logic engines

### Phase 2 Statistical Calculations Test Files Created
```
src/src_figma/__tests__/statCalculations/
├── bwarCalculator.test.ts       ✅ 54 tests (wOBA, wRAA, RPW, bWAR)
├── pwarCalculator.test.ts       ✅ 67 tests (FIP, replacement level, pWAR)
├── fwarCalculator.test.ts       ✅ 131 tests (fielding runs, position mods, fWAR)
└── leverageCalculator.test.ts   ✅ 113 tests (LI, gmLI, clutch detection)
```

**Total**: 365 tests covering WAR calculations and leverage index

### Coverage Verified

- **Pages**: 14/14 covered
- **Business Components**: 33/35 covered (2 demo/utility skipped)
- **Modals**: 6/7 covered (base class via derivatives)
- **Hooks**: 8/8 covered
- **Target Tests**: 3000+ (up from 1800+)
- **Target Test Files**: 120+ (up from 55+)

---

## Recent Fixes (February 5, 2026)

### Exhibition Mode Bug Fixes ✅

**Post-Game Summary (EXH-011)**:
- ✅ Game archived BEFORE navigation (was showing "Game not found")
- ✅ Team hits calculated from player stats (was showing 0)
- ✅ Pitcher names display correctly (was showing IDs)
- ✅ Player names properly formatted from IDs
- ✅ Stale data cleared on new game initialization

**Runner/Scoring Fixes**:
- ✅ Error (E) no longer wipes runners from bases
- ✅ WP/PB runs now update inning-by-inning scoreboard
- ✅ Inside-the-park HR properly scores all runners (EXH-008)
- ✅ Pitcher included in batting lineup at #9 (EXH-009)

**Key Technical Changes**:
- Added `pitcherNamesRef` to track pitcher ID → name mapping
- `advanceRunner` and `advanceRunnersBatch` now update scoreboard innings
- `initializeGame` clears all previous game state

---

## Recent Fixes (February 3, 2026 Continuation)

### League Builder Integration Complete ✅

**Exhibition and Franchise modes now use League Builder data:**
- ✅ Removed all hardcoded dummy teams/players from Exhibition mode
- ✅ Removed MOCK_TEAMS arrays from Franchise mode
- ✅ Added league selection step to Exhibition flow
- ✅ Both modes load teams/players from IndexedDB via useLeagueBuilderData hook
- ✅ SMB4 database seeding available in League Builder (20 teams, 506 players)

**Files Updated:**
- `ExhibitionGame.tsx` - Complete rewrite with league→team→lineup flow
- `FranchiseSetup.tsx` - Uses League Builder leagues and teams
- `leagueBuilderStorage.ts` - Added `seedFromSMB4Database()`, `isSMB4DatabaseSeeded()`
- `useLeagueBuilderData.ts` - Exports seeding functions

### TradeFlow React Hooks Fix
- Fixed "Rendered more hooks than during previous render" error
- Cause: Early return before useCallback hooks
- Fix: Moved all useCallback definitions before the `if (isLoading)` return

---

## Recent Fixes (February 3, 2026 Late Night)

### Legacy vs Figma Codebase Audit Complete
- **Finding**: Figma codebase (`src/src_figma/`) cross-imports from legacy (`src/`) via relative paths
- **Architecture**: Integration wrappers in Figma adapt legacy engine APIs for React hooks
- **Status**: ✅ 42 TypeScript build errors FIXED, build now passes

### Files Fixed (API Mismatches)
| File | Issue | Fix |
|------|-------|-----|
| `agingIntegration.ts` | Wrong signature for `processEndOfSeasonAging` | Pass `{overall: rating}` object |
| `useAgingData.ts` | Used `result.retired` instead of `result.shouldRetire` | Updated property names |
| `fanMoraleIntegration.ts` | Wrong FanState enum values | ELECTRIC→EUPHORIC, etc. |
| `useFanMorale.ts` | 21 errors, not imported anywhere | Stubbed out |
| `useMWARCalculations.ts` | Wrong import path, wrong param order | Fixed paths and signature |
| `mwarIntegration.ts` | Return type void vs object | Return copy after mutation |
| `franchiseStorage.ts` | File completely missing | Created stub with types |

### Documents Created/Updated
- `spec-docs/LEGACY_VS_FIGMA_AUDIT.md` - Full file comparison
- `spec-docs/RECONCILIATION_PLAN.md` - API reference and fix strategy

---

## Recent Fixes (February 3, 2026)

### Current Batter/Pitcher Display - Now Live
- **Problem**: Display boxes showed hardcoded "J. MARTINEZ" and "R. SMITH"
- **Fix**: Now pulls from `gameState.currentBatterId/Name` and `playerStats/pitcherStats` Maps
- **Location**: `src/src_figma/app/pages/GameTracker.tsx` lines 368-393, 1232-1282
- **Shows**: Batter name, position, grade, H-AB stats | Pitcher name, pitch count

### Pitcher Substitution - Now Working
- **Problem**: Pitching change from roster only logged to console, didn't update state
- **Fix**: `handlePitcherSubstitution` now calls `changePitcher()` hook
- **Flow**: TeamRoster → handlePitcherSubstitution → changePitcher → PitchCountModal → confirm → state update
- **Location**: `src/src_figma/app/pages/GameTracker.tsx` lines 704-712

### Previous Bugs Fixed (This Session, Pre-Compaction)
- ✅ SB with multiple runners - uses batch runner moves
- ✅ Walk classified correctly (type: 'walk' not 'hit')
- ✅ Fly out with runner thrown out - counts all outs
- ✅ Fame event deduplication - no repeated milestones
- ✅ Game initialization with lineups - batters have unique IDs

---

## Recent Fixes (February 2, 2026 Late Night)

### Runner Icon Sync Bug Fix
- **Problem**: Runner icons didn't always end up where they should after plays
- **Root Cause**: `recordOut` in `useGameState.ts` was not updating `bases` state from `runnerData` parameter
- **Fix**: Added base state management in `recordOut` to clear origin bases and set destination bases
- **Location**: `src/src_figma/hooks/useGameState.ts` lines 1043-1064

### Hook Wiring Complete
- `usePlayerState` and `useFameTracking` hooks now wired into GameTracker.tsx
- Fame Event Popup (top-right) shows detected fame events with LI tier
- Player State Notifications (top-left) shows Mojo/Fitness changes
- Mojo updates triggered on: HOME_RUN, SINGLE, DOUBLE, TRIPLE, STRIKEOUT

---

## GameTracker 5-Step UX Flow 📋 NEWLY IMPLEMENTED

### Overview
A new 5-step UX flow has been integrated into the Enhanced Interactive Field. This provides cleaner button placement and more intuitive play recording.

### 5-Step Flow
```
Step 1: IDLE           → ActionSelector shows HIT/OUT/OTHER in left foul corner
Step 2: HIT_LOCATION   → Click field overlay to set hit location
        OUT_FIELDING   → Drag fielder + tap throw sequence + ADVANCE button
Step 3: HIT_OUTCOME    → OutcomeButtons (1B/2B/3B/HR + modifiers) in right foul corner
        OUT_OUTCOME    → OutcomeButtons (GO/FO/LO/K/etc + modifiers) in right foul corner
Step 4: RUNNER_CONFIRM → RunnerOutcomesDisplay (existing component)
Step 5: END_CONFIRM    → END AT-BAT button (existing component)
```

### New Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `ActionSelector.tsx` | Left foul corner | Step 1 - HIT/OUT/OTHER buttons |
| `OutcomeButtons.tsx` | Right foul corner | Step 3 - Multi-select outcome buttons |

### FlowStep State Machine
```typescript
type FlowStep =
  | 'IDLE'              // Step 1: Waiting for HIT/OUT/OTHER selection
  | 'HIT_LOCATION'      // Step 2 (HIT): Waiting for field click
  | 'OUT_FIELDING'      // Step 2 (OUT): Waiting for fielder drag + sequence
  | 'HIT_OUTCOME'       // Step 3 (HIT): Showing hit outcome buttons
  | 'OUT_OUTCOME'       // Step 3 (OUT): Showing out outcome buttons
  | 'RUNNER_CONFIRM'    // Step 4: Confirming runner outcomes
  | 'END_CONFIRM';      // Step 5: End at-bat confirmation
```

### ActionSelector OTHER Menu
Expands to: BB, IBB, HBP, D3K, SB, CS, PK, TBL, PB, WP, E

### OutcomeButtons Options
**HIT Mode:**
- Types: 1B, 2B, 3B, HR
- Modifiers: BUNT, IS (Infield Single), 7+
- Specials: KP (Killed Pitcher), NUT (Nut Shot)

**OUT Mode:**
- Types: GO, FO, LO, PO, FLO, K, KL, DP, FC
- Modifiers: SF, SAC, IFR, RD, E, 7+
- Specials: WEB (Web Gem)

### Implementation Status
| Feature | Status |
|---------|--------|
| ActionSelector component | ✅ Complete |
| OutcomeButtons component | ✅ Complete |
| FlowStep state machine | ✅ Complete |
| Visual prompts for each step | ✅ Complete |
| Integration with existing RunnerOutcomesDisplay | ✅ Complete |
| Integration with existing END AT-BAT | ✅ Complete |
| TypeScript compilation | ✅ Passing |
| Production build | ✅ Passing |

### Design Documents
- `spec-docs/GAMETRACKER_REDESIGN_GAP_ANALYSIS.md` - Gap analysis between vision and implementation
- `spec-docs/GAMETRACKER_UI_DESIGN.md` - UI design spec with ASCII layouts

---

## GameTracker Redesign - Drag-Drop Paradigm 📋 SPEC COMPLETE

### Specification v4 Complete
A comprehensive specification (~770 lines) has been created for the drag-and-drop GameTracker redesign.

**See**: `spec-docs/GAMETRACKER_DRAGDROP_SPEC.md` for full details.

### Core Design Decisions (v4)
1. **Continuous coordinate system** - Field is (0,0) to (1.0, 1.4) including stands
2. **Drag fielder to ball location** - Captures spray chart, then tap throw sequence
3. **Tap fielder sequence** (5-3, 6-4-3) - Implies throws between fielders
4. **Foul territory auto-detected** - `isFoulTerritory(x,y) = |x-0.5| > y×0.5`
5. **Two HR methods** - Drag past fence (fun) OR HR button (quick)
6. **Substitutions via lineup card** - NOT field dragging (prevents accidents)
7. **Undo button only** - 5-step stack, no gestures (prevents accidents)
8. **Special events** auto-detected (Killed Pitcher, Nutshot, Web Gem, Foul Out)

### Reconciliation Strategy
| Keep from Original | Replace | Add New |
|--------------------|---------|---------|
| Data layer (hooks, storage) | Button-based UI | Continuous coordinates |
| Calculation engines | Modal dialogs | Foul territory geometry |
| Play recording functions | Separate fielding panel | Lineup card subs |
| | | Undo system |

### Implementation Status (8 Phases)
| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Extended Field Canvas | ✅ COMPLETE |
| Phase 2 | Batter Drag-Drop | ✅ COMPLETE |
| Phase 3 | Fielder Drag-Drop | ✅ COMPLETE (via Phase 2) |
| Phase 4 | Play Classification | ✅ COMPLETE |
| Phase 5 | Runner Events | ✅ COMPLETE (RunnerDragDrop.tsx) |
| Phase 6 | Substitution System | ✅ COMPLETE (LineupCard.tsx) |
| Phase 7 | Undo System | ✅ COMPLETE (UndoSystem.tsx) |
| Phase 8 | Data Layer & Polish | ⚠️ PARTIAL (wiring improvements made Jan 31) |

> **Audit Note (2026-01-31)**: Previous documentation incorrectly claimed Phases 5-7 were "Not Started".
> See `DRAGDROP_AUDIT_2026-01-31.md` for full audit details.

### Phase 1 Deliverables (COMPLETE)
- `src/src_figma/app/components/FieldCanvas.tsx` - SVG field with extended coordinates
- `src/src_figma/app/components/FielderIcon.tsx` - Draggable fielder components
- `src/src_figma/app/components/DragDropFieldDemo.tsx` - Integration demo

### Phase 2 Deliverables (COMPLETE)
- `src/src_figma/app/components/EnhancedInteractiveField.tsx` - Game-integrated field component
- Toggle in GameTracker.tsx to switch between enhanced/legacy fields
- Drop handlers connected to useGameState recording functions
- Basic play classification (HR, Hit, Out, Foul Out, Foul Ball)

### Phase 4 Deliverables (COMPLETE)
- `HitTypeModal` - 1B, 2B, 3B selection with spray sector display
- `OutTypeModal` - GO, FO, LO, DP, TP, FC, SAC with smart suggestions based on throw sequence
- Updated PlayData type with `hitType` and `outType` fields
- Chained modal flow: PlayType → HitType/OutType → Complete

### Inferential Logic Engine (COMPLETE)
- `src/src_figma/app/components/playClassifier.ts` - Central inference engine (~450 lines)
- **Auto-complete obvious plays** (skip modals):
  - Foul out, foul ball
  - Classic DPs (6-4-3, 4-6-3, etc.)
  - Standard ground outs (throw to first)
  - Deep outfield fly outs
- **Smart suggestions** based on:
  - Throw sequence length/composition
  - Ball location depth
  - Game context (outs, runners)
- **Special event prompts**:
  - Web Gem (OF catch at y > 0.8)
  - Robbery (catch at y > 0.95)
  - Killed Pitcher (P fields comebacker)
  - `SpecialEventPromptModal` with YES/NO
- **Quick buttons**: 🥜 💥 🤦 ⭐ 📍

### All Open Questions Resolved ✅
- Spray chart precision, fielder inference, HR entry, HR distance
- Wall scraper vs bomb, foul balls, pitcher substitution, undo mechanism

---

## Phase 6 Progress - Finalize & Polish ⏳

### Integration Testing & Fixes (In Progress)

**Critical Integration Issues Fixed:**
1. ✅ **Season number persistence** - `currentSeason` now stored in localStorage and increments on advance
2. ✅ **Offseason flow props** - All flows now receive consistent `seasonId` and `seasonNumber` props
3. ✅ **Header display** - FranchiseHome header shows correct season number from state
4. ✅ **Fallback strings** - Hardcoded "Season 2" fallbacks updated to use dynamic `currentSeason`

**Files Modified:**
- `src/src_figma/app/pages/FranchiseHome.tsx` - Season state management, prop passing

**Franchise Lifecycle Flow (Verified):**
```
League Builder → Create League/Teams/Players
     ↓
FranchiseHome (Regular Season) → Add games, track stats
     ↓
FranchiseHome (Playoffs) → Create playoff, track series
     ↓ [PROCEED TO OFFSEASON button, requires playoffs complete]
FranchiseHome (Offseason) → Awards → Ratings → Retirements → FA → Draft → Trades
     ↓
FinalizeAdvanceFlow → Roster management → Spring Training → Advance
     ↓ [Increments currentSeason, persists to localStorage]
FranchiseHome (Regular Season) → New season begins
```

### Phase 6 Status
| Story | Description | Status |
|-------|-------------|--------|
| P6-001 | Integration Testing | ✅ Complete |
| P6-002 | Season Advance Fix | ✅ Complete |
| P6-003 | Offseason Props Fix | ✅ Complete |
| P6-004 | UI Polish | ✅ Complete (Chalkboard styling Feb 2) |
| P6-005 | Performance Optimization | ⏳ Pending |

### GameTracker UI Styling (Complete - Feb 2, 2026)
- ✅ K/Ꝅ buttons: Red gradient with gold text
- ✅ BB/HBP/HR buttons: Color-coded (green/orange/gold)
- ✅ RESET button: Dark background, gold border
- ✅ Runner icons: Diamond-shaped with R1/R2/R3 labels
- ✅ Modifier buttons: Chalkboard grid styling
- ✅ END/NEXT AT-BAT: Gradient buttons with gold borders
- ✅ Consistent 3px offset shadows throughout
- **Commit**: `602d89e style: Chalkboard aesthetic for GameTracker UI`

---

## Full Implementation Plan Created ✅

A comprehensive end-to-end implementation plan has been created to make all UI components functional.

**See**: `IMPLEMENTATION_PLAN_FULL.md` for complete details.

### Summary

| Metric | Value |
|--------|-------|
| Total Stories | 331 |
| Complete | ~50 (15%) |
| Pending | ~281 (85%) |
| Estimated Effort | 96-116 days |
| Figma Components with Real Data | ~13% |

### 6-Phase Roadmap

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 0 | 2 weeks | Foundation (schedule gen, data layer) |
| Phase 1 | 4 weeks | League Builder (create franchises) |
| Phase 2 | 2 weeks | Core Gameplay (play seasons) |
| Phase 3 | 1 week | Playoffs |
| Phase 4 | 4 weeks | Offseason Part 1 (awards, ratings, retirements) |
| Phase 5 | 4 weeks | Offseason Part 2 (FA, draft, trades) |
| Phase 6 | 3 weeks | Finalize & Polish |

### Recommended Starting Point
- **First Sprint**: Stories NEW-003, NEW-016, NEW-017 (schedule generation, offseason ordering)
- **Second Sprint**: Stories LB-001 to LB-015 (League Builder hub + LEAGUES module)

---

## Phase 0 Progress ✅

### Schedule System Implementation (Complete)
- ✅ Created `scheduleStorage.ts` - IndexedDB storage for scheduled games
- ✅ Created `useScheduleData.ts` - React hook bridging storage to UI
- ✅ Wired FranchiseHome to persisted schedule storage
- ✅ Removed Schedule from offseason phases (games added on-the-fly per Figma spec)
- ✅ Added `kbl-schedule` database to backup/restore

### Spring Training Integration (Complete)
- ✅ Added "spring-training" screen to FinalizeAdvanceFlow
- ✅ Shows projected player development via agingEngine
- ✅ Career phase counts (Developing, Prime, Declining, Must Retire)
- ✅ Per-player rating projections with trend indicators

### Phase 0 Status
| Story | Description | Status |
|-------|-------------|--------|
| NEW-003 | Schedule System | ✅ Complete (manual addition per Figma spec) |
| NEW-002 | Spring Training | ✅ Complete (integrated into Finalize flow) |
| NEW-016 | Offseason ordering | ✅ Complete (10 phases, no schedule phase) |

---

## Phase 1 Progress - League Builder ⏳

### League Builder Storage Implementation (In Progress)
- ✅ Created `leagueBuilderStorage.ts` - IndexedDB database `kbl-league-builder` with 5 stores:
  - `leagueTemplates` - League configuration templates
  - `globalTeams` - Team definitions (reusable across leagues)
  - `globalPlayers` - Player database
  - `rulesPresets` - Game rules configurations (3 defaults: Standard, Quick Play, Full Simulation)
  - `teamRosters` - Roster assignments and lineups
- ✅ Created `useLeagueBuilderData.ts` - React hook bridging storage to UI with:
  - CRUD operations for all entities
  - Loading/error states
  - Auto-refresh on changes
- ✅ Wired `LeagueBuilder.tsx` hub to display real league counts
- ✅ Wired `LeagueBuilderLeagues.tsx` - Full CRUD for leagues with modal editor
- ✅ Wired `LeagueBuilderTeams.tsx` - Full CRUD for teams with modal editor
- ✅ Wired `LeagueBuilderPlayers.tsx` - Full CRUD for players with modal editor (POW/CON/SPD/FLD/ARM, pitching stats, arsenal)
- ✅ Wired `LeagueBuilderRules.tsx` - Full CRUD for rules presets (game/season/playoffs settings)
- ✅ Wired `LeagueBuilderRosters.tsx` - MLB/AAA splits, lineups, rotation, depth charts
- ✅ Added `kbl-league-builder` database to backup/restore

### Phase 1 Status
| Story | Description | Status |
|-------|-------------|--------|
| LB-005 | League Builder Storage | ✅ Complete |
| LB-006 | useLeagueBuilderData Hook | ✅ Complete |
| LB-001 | LeagueBuilder Hub Wiring | ✅ Complete |
| LB-002 | Leagues Module CRUD | ✅ Complete |
| LB-003 | Teams Module CRUD | ✅ Complete |
| LB-004 | Players Module CRUD | ✅ Complete |
| LB-007 | Rosters Module | ✅ Complete |
| LB-008 | Draft Module | ✅ Complete |
| LB-009 | Rules Module | ✅ Complete |

---

## Phase 2 Progress - Core Gameplay ⏳

### Core Gameplay Wiring (In Progress)
- ✅ ScheduleContent wired to useScheduleData (games can be added, viewed, filtered)
- ✅ StandingsContent wired to calculateStandings (real data from completed games)
- ✅ LeagueLeadersContent wired to useSeasonStats (batting/pitching leaders)
- ✅ Game → Season aggregation works (GameTracker → eventLog → seasonAggregator → standings)
- ⚠️ Schedule storage not yet auto-updated when game completes (separate enhancement)

### Phase 2 Status
| Story | Description | Status |
|-------|-------------|--------|
| CG-001 | Schedule UI wiring | ✅ Complete |
| CG-002 | Standings calculation | ✅ Complete |
| CG-003 | Leaders display | ✅ Complete |
| CG-004 | Game flow integration | ✅ Complete (stats) |
| CG-005 | Schedule-GameTracker link | ⏳ Future enhancement |

---

## Phase 3 Progress - Playoffs ✅

### Playoff Storage Implementation (Complete)
- ✅ Created `playoffStorage.ts` - IndexedDB database `kbl-playoffs` with 4 stores:
  - `playoffs` - Playoff configuration (teams, rounds, status)
  - `series` - Individual series matchups with game-by-game tracking
  - `playoffGames` - Detailed game data (linked to GameTracker)
  - `playoffStats` - Player stat aggregation for playoffs
- ✅ Created `usePlayoffData.ts` - React hook bridging storage to UI with:
  - State: playoff, series, isLoading, error
  - Derived: currentRoundSeries, completedSeries, bracketByRound, bracketByLeague
  - Actions: createNewPlayoff, startPlayoffs, recordGameResult, advanceRound, completePlayoffs
  - Fallback mock data for empty state
- ✅ Added `kbl-playoffs` database to backup/restore

### FranchiseHome Playoff Tabs Wired (Complete)
- ✅ **Bracket Tab**: Shows Eastern/Western conference brackets, championship series
  - Real team matchups with seed numbers
  - Series scores and status indicators (PENDING/IN_PROGRESS/COMPLETED)
  - CREATE PLAYOFF and START PLAYOFFS buttons
- ✅ **Series Tab**: Complete series breakdown by round
  - All series grouped by round name (Wild Card, Division, Championship, World Series)
  - Individual game results with scores
  - Status badges and series records
- ✅ **Playoff Stats Tab**: Team playoff records
  - Shows all playoff teams with seed, league, series W/L
  - Status column (ACTIVE/ELIMINATED/CHAMPION)
- ✅ **Playoff Leaders Tab**: Placeholder for player stats
  - Wired to playoffData hook
  - MVP display when champion is crowned
  - Awaiting GameTracker integration for actual stats
- ✅ **Advance to Offseason Tab**: Dynamic based on playoff state
  - Shows champion when playoffs complete
  - Disabled button until playoffs finished
  - Real series counts and progress

### Phase 3 Status
| Story | Description | Status |
|-------|-------------|--------|
| PO-001 | Playoff Storage System | ✅ Complete |
| PO-002 | usePlayoffData Hook | ✅ Complete |
| PO-003 | Bracket Tab Wiring | ✅ Complete |
| PO-004 | Series Results Tab | ✅ Complete |
| PO-005 | Playoff Stats Tab | ✅ Complete |
| PO-006 | Playoff Leaders Tab | ✅ Complete (UI wired, awaits game data) |
| PO-007 | Advance to Offseason | ✅ Complete |

---

## Phase 4 Progress - Offseason ⏳

### Offseason Storage Implementation (In Progress)
- ✅ Created `offseasonStorage.ts` - IndexedDB database `kbl-offseason` with 7 stores:
  - `offseasonState` - State machine tracking current phase
  - `awards` - Season award winners
  - `ratings` - Rating adjustments and manager bonuses
  - `retirements` - Retirement decisions
  - `freeAgency` - Free agent signings
  - `draft` - Draft picks and order
  - `trades` - Trade records
- ✅ Created `useOffseasonState.ts` - React hook for offseason state machine with:
  - Phase tracking (10 phases in strict order)
  - Phase-specific data access
  - Save actions for each phase type
  - Progress tracking
- ✅ Added `kbl-offseason` database to backup/restore

### Offseason Phase Machine
```
1. STANDINGS_FINAL     → Finalize season standings
2. AWARDS              → Award ceremonies
3. RATINGS_ADJUSTMENTS → Age-based changes, manager bonuses
4. CONTRACTION_EXPANSION → Team changes
5. RETIREMENTS         → Player retirements
6. FREE_AGENCY         → Sign free agents
7. DRAFT               → Amateur draft
8. TRADES              → Execute trades
9. FARM_TRANSACTIONS   → Call-ups/send-downs
10. SPRING_TRAINING    → Development preview
```

### Offseason Flows Wired to Storage (Complete)
- ✅ **AwardsCeremonyFlow** - Saves awards to IndexedDB on completion
- ✅ **RetirementFlow** - Saves retirement decisions with HOF eligibility
- ✅ **FreeAgencyFlow** - Saves signings and declined offers
- ✅ **TradeFlow** - Saves executed trades with player exchanges
- ✅ **DraftFlow** - Saves draft picks, order, and rounds
- ✅ **RatingsAdjustmentFlow** - Saves rating changes and manager bonuses

### Flows Without Special Storage (Complete - Phase Tracking Only)
- ✅ **ContractionExpansionFlow** - Modifies league structure (stored in leagueBuilderStorage)
- ✅ **FinalizeAdvanceFlow** - Transitions to new season (completes offseason)

### Phase 4 Status
| Story | Description | Status |
|-------|-------------|--------|
| OS-001 | Offseason Storage System | ✅ Complete |
| OS-002 | useOffseasonState Hook | ✅ Complete |
| OS-003 | Wire AwardsCeremonyFlow | ✅ Complete |
| OS-004 | Wire RatingsAdjustmentFlow | ✅ Complete |
| OS-005 | Wire RetirementFlow | ✅ Complete |
| OS-006 | Wire ContractionExpansionFlow | ✅ Complete (no special storage) |
| OS-007 | Wire FreeAgencyFlow | ✅ Complete |
| OS-008 | Wire DraftFlow | ✅ Complete |
| OS-009 | Wire TradeFlow | ✅ Complete |
| OS-010 | Wire FinalizeAdvanceFlow | ✅ Complete (no special storage) |

---

## UI/Font Fixes Applied ✅

### Font Configuration
- Google Fonts "Press Start 2P" imported in `index.html`
- All font variables updated to use Press Start 2P (retro pixel aesthetic)
- Files modified: `index.html`, `src/index.css`, `src/styles/global.css`, `tailwind.config.js`

### GameTracker Layout Fixes
- Removed black backdrop shadow from logo
- Fixed scoreboard width (no longer extends too far right)
- Added `max-w-7xl` content wrapper for consistent alignment with header
- Layout works correctly on both desktop and iPad

---

## Ralph Framework Implementation - PHASES A-G COMPLETE ✅

All 78 user stories from Phases B-G implemented and committed. Components are wired to navigation.

### Implementation Summary

| Phase | Stories | Status | Commit |
|-------|---------|--------|--------|
| Phase A | A001-A022 | ✅ Complete | Various (Jan 25-26) |
| Phase B | B001-B018 | ✅ Complete | `a264b3b` |
| Phase C | C001-C012 | ✅ Complete | `a264b3b` |
| Phase D | D001-D010 | ✅ Complete | `a264b3b` |
| Phase E | E001-E008 | ✅ Complete | `a264b3b` |
| Phase F | F001-F012 | ✅ Complete | `a264b3b` |
| Phase G | G001-G008 | ✅ Complete | `a264b3b` |
| Navigation Wiring | - | ✅ Complete | `5695fdb` |

## Implementation Plan v5 - Days 1-4 COMPLETE ✅

| Day | Task | Status |
|-----|------|--------|
| Day 1 | Wire fWAR + rWAR to useWARCalculations | ✅ Complete |
| Day 2 | Wire mWAR + Clutch Calculator | ✅ Complete |
| Day 3 | Wire Mojo + Fitness Engines to GameTracker | ✅ Complete |
| Day 4 | Integration Testing (3-tier NFL) | ✅ Complete |

### Day 4 Integration Testing Results

**Tier 1: Code-Level Verification** ✅
- Mojo/Fitness/Salary: 45/45 tests passing
- WAR (pWAR, fWAR, rWAR, RPW): 24/24 tests passing
- Leverage/Clutch/mWAR: 21/21 tests passing
- Fame/Detection: 25/25 tests passing
- Fan Morale/Narrative: 73/73 tests passing

**Tier 2: Data Flow Verification** ✅
- Mojo: UI → useMojoState → mojoEngine → createFameEvent → Display
- Fitness: UI → useFitnessState → fitnessEngine → createFameEvent → Display
- Fame: GameContext → useFameDetection → createFameEvent (with mojo/fitness)

**Tier 3: Spec Audit** ✅
- All Mojo Fame modifiers match spec (±0)
- All Fitness Fame modifiers match spec (±0)
- All WAR multipliers match spec (±0)

## Figma Integration Progress

### Figma UI Wiring Status

The Figma export (`src/src_figma/`) replaces the original UI. Components are being wired to real IndexedDB data.

| Figma Component | Data Source | Status |
|-----------------|-------------|--------|
| GameTracker | useGameState → eventLog → IndexedDB | ✅ Wired |
| FranchiseHome header | useFranchiseData → useSeasonData | ✅ Wired |
| StandingsContent | useFranchiseData → calculateStandings | ✅ Wired |
| LeagueLeadersContent | useFranchiseData → useSeasonStats | ✅ Wired |
| AwardsContent | useFranchiseData → useSeasonStats | ✅ Wired |
| PlayoffBracket | usePlayoffData → playoffStorage | ✅ Wired |
| PlayoffSeries | usePlayoffData → playoffStorage | ✅ Wired |
| PlayoffStats | usePlayoffData → playoffStorage | ✅ Wired |
| PlayoffLeaders | usePlayoffData → playoffStorage | ✅ Wired |
| FreeAgencyFlow | useOffseasonData → playerDatabase | ✅ Wired |
| RetirementFlow | useOffseasonData → playerDatabase + useAgingData | ✅ Wired |
| RatingsAdjustmentFlow | useOffseasonData → playerDatabase | ✅ Wired |
| TradeFlow | useOffseasonData → playerDatabase | ✅ Wired |
| DraftFlow | useOffseasonData → playerDatabase | ✅ Wired |
| ContractionExpansionFlow | useOffseasonData → playerDatabase | ✅ Wired |
| FinalizeAdvanceFlow | useOffseasonData → playerDatabase | ✅ Wired |
| TeamHubContent | useOffseasonData → playerDatabase | ✅ Wired |
| AwardsCeremonyFlow | useOffseasonData → playerDatabase | ✅ Wired |
| MuseumContent | useMuseumData → IndexedDB (kbl-museum) | ✅ Wired |
| ScheduleContent | useScheduleData → IndexedDB (kbl-schedule) | ✅ Wired |
| AddGameModal | useScheduleData → IndexedDB (kbl-schedule) | ✅ Wired |

### LeagueBuilder Sub-Pages

| Page | Route | Data Source | Status |
|------|-------|-------------|--------|
| LeagueBuilderLeagues | /league-builder/leagues | useLeagueBuilderData → IndexedDB | ✅ Wired (CRUD) |
| LeagueBuilderTeams | /league-builder/teams | useLeagueBuilderData → IndexedDB | ✅ Wired (CRUD) |
| LeagueBuilderPlayers | /league-builder/players | useLeagueBuilderData → IndexedDB | ✅ Wired (CRUD) |
| LeagueBuilderRosters | /league-builder/rosters | useLeagueBuilderData → IndexedDB | ✅ Wired (CRUD) |
| LeagueBuilderDraft | /league-builder/draft | useLeagueBuilderData → IndexedDB | ✅ Wired (Config) |
| LeagueBuilderRules | /league-builder/rules | useLeagueBuilderData → IndexedDB | ✅ Wired (CRUD) |

### Museum Historical Data Storage

New IndexedDB database `kbl-museum` with stores:
- Championships, Season standings, Team all-time records
- Award winners, Hall of Fame, All-time leaders
- League records, Legendary moments, Retired jerseys, Stadiums

Files:
- `src/utils/museumStorage.ts` - IndexedDB CRUD operations
- `src/src_figma/hooks/useMuseumData.ts` - React hook with mock fallbacks

### Schedule System Storage ✅ NEW

New IndexedDB database `kbl-schedule` with stores:
- scheduledGames - All scheduled games with status (SCHEDULED, IN_PROGRESS, COMPLETED, SKIPPED)
- scheduleMetadata - Season-level schedule stats

Files:
- `src/utils/scheduleStorage.ts` - IndexedDB CRUD operations for schedule
- `src/src_figma/hooks/useScheduleData.ts` - React hook for schedule management

Key Features:
- Games added manually (SMB4 is source of truth for matchups)
- Add single game or series (2-4 games same matchup)
- Filter by team or view full league
- Auto-pull next scheduled game for Today's Game tab
- Games persist across page refresh

### Key Figma Integration Files

- `src/src_figma/hooks/useGameState.ts` - Bridge hook for GameTracker ↔ IndexedDB
- `src/src_figma/hooks/useFranchiseData.ts` - Bridge hook for FranchiseHome ↔ IndexedDB
- `src/src_figma/hooks/useOffseasonData.ts` - Bridge hook for Offseason flows ↔ playerDatabase
- `src/src_figma/hooks/useMuseumData.ts` - Bridge hook for Museum ↔ IndexedDB (kbl-museum)
- `src/src_figma/hooks/useScheduleData.ts` - Bridge hook for Schedule ↔ IndexedDB (kbl-schedule)
- `src/App.tsx` - Router configured for Figma routes only

## Data Wiring Progress (Original UI)

### Components Now Wired to Real Data

| Component | Data Source | Status |
|-----------|-------------|--------|
| SeasonDashboard | IndexedDB season + standings calculation | ✅ Wired |
| RosterView (via RosterWrapper) | playerDatabase + salary calculation | ✅ Wired |
| PostGameScreen | GameTracker → URL params | ✅ Wired |
| GameTracker | Full Mojo/Fitness/WAR/Fame integration | ✅ Wired |

### Remaining Empty Data Components

Components still receiving placeholder/empty data:
- ScheduleView (needs game schedule storage)
- LeagueLeadersView (needs aggregated stats)
- OffseasonHub + sub-routes (needs offseason state machine)
- AwardsCeremonyHub (needs voting/calculation logic)

### Routes Now Configured

| Path | Component | Description |
|------|-----------|-------------|
| `/` | MainMenu | Home screen with full navigation |
| `/pregame` | PreGameWrapper | Pre-game screen with team/pitcher selection |
| `/game` | GamePage | Game tracker |
| `/postgame` | PostGameScreen | Post-game summary with headlines |
| `/season` | SeasonDashboard | Season progress and stats |
| `/schedule` | ScheduleWrapper | Season schedule view |
| `/roster` | RosterWrapper | Team roster management |
| `/leaders` | LeadersWrapper | League stat leaders |
| `/stats-by-park` | StatsByParkWrapper | Player stats by stadium |
| `/awards` | AwardsWrapper | Awards ceremony hub |
| `/offseason` | OffseasonWrapper | Offseason hub navigation |
| `/offseason/ratings` | EOSRatingsWrapper | End-of-season ratings changes |
| `/offseason/retirements` | RetirementsWrapper | Player retirements |
| `/offseason/free-agency` | FreeAgencyWrapper | Free agent signing |
| `/offseason/draft` | DraftWrapper | Draft hub |
| `/offseason/trades` | TradeWrapper | Trade hub |
| `/museum` | MuseumWrapper | Franchise museum hub |
| `/team/:id` | TeamPage | Team details |
| `*` | NotFound | 404 handler |

### New Components Created (Phases B-G)

**Phase B - Game Flow:**
- `PreGameScreen.tsx` - Starting pitcher selection and matchup display
- `GameSetupModal.tsx` - Team and pitcher selection modal
- `LineupPanel.tsx` - Enhanced lineup display with substitutions
- `PlayerCard.tsx` - Detailed player stats modal
- `InningEndSummary.tsx` - Inning transition summary
- `PitcherExitPrompt.tsx` - Pitcher removal confirmation
- `DoubleSwitchModal.tsx` - Double switch implementation
- `WalkoffCelebration.tsx` - Walk-off win celebration
- `FameEventToast.tsx` - Fame event notifications
- `PostGameScreen.tsx` - Comprehensive post-game summary

**Phase C - Season Management:**
- `ScheduleView.tsx` - Season schedule with filters
- `RosterView.tsx` - Roster management
- `LeagueLeadersView.tsx` - Statistical leaderboards
- `StandingsView.tsx` - League standings
- `TeamStatsView.tsx` - Team statistics
- `TeamFinancialsView.tsx` - Team financial overview
- `BoxScoreView.tsx` - Detailed box score
- `SeasonProgressTracker.tsx` - Season milestone tracking
- `PlayoffBracket.tsx` - Playoff visualization

**Phase D - Offseason:**
- `OffseasonHub.tsx` - Offseason navigation
- `EOSRatingsView.tsx` - End-of-season rating changes
- `RetirementsScreen.tsx` - Player retirement ceremony
- `FreeAgencyHub.tsx` - Free agent signing interface
- `DraftHub.tsx` - Draft interface with prospect cards
- `TradeHub.tsx` - Trade negotiation interface
- `AgingDisplay.tsx` - Player aging visualization

**Phase E - Awards:**
- `AwardsCeremonyHub.tsx` - Awards ceremony navigation
- `awards/MVPCeremony.tsx` - MVP presentation
- `awards/CyYoungCeremony.tsx` - Cy Young presentation
- `awards/RookieOfYearCeremony.tsx` - ROY presentation
- `awards/GoldGloveCeremony.tsx` - Gold Glove presentation
- `awards/AllStarReveal.tsx` - All-Star team reveal
- `awards/BattingTitleCeremony.tsx` - Batting champion presentation
- `awards/PitchingAwardsCeremony.tsx` - Pitching awards (ERA, Wins)

**Phase F - Advanced Features:**
- `FanMoralePanel.tsx` - Fan mood visualization
- `RelationshipPanel.tsx` - Player relationships display
- `ChampionshipCelebration.tsx` - Championship celebration
- `StatsByParkView.tsx` - Player stats by stadium
- `adaptiveLearningEngine.ts` - Fielding inference improvement
- `fieldingStatsAggregator.ts` - Position-based fielding aggregation
- `LeagueNewsFeed.tsx` - News feed with story types

**Phase G - Museum & Extras:**
- `MuseumHub.tsx` - Franchise history museum
- `museum/HallOfFameGallery.tsx` - HOF member display
- `museum/RetiredNumbersWall.tsx` - Retired jersey numbers
- `museum/FranchiseRecords.tsx` - Franchise record holders
- `museum/ChampionshipBanners.tsx` - Championship banners
- `dataExportService.ts` - CSV/JSON export service
- `ContractionWarning.tsx` - Team contraction risk alert
- `ChemistryDisplay.tsx` - Team chemistry visualization

### Engines Created (Phases B-G)

| Engine | File | Purpose |
|--------|------|---------|
| Relationship Engine | `relationshipEngine.ts` | Player relationship tracking and morale effects |
| Aging Engine | `agingEngine.ts` | Player aging and decline curves |
| Adaptive Learning | `adaptiveLearningEngine.ts` | Fielding inference improvement from corrections |
| Headline Generator | `headlineGenerator.ts` | Dynamic post-game headlines |
| Walkoff Detector | `walkoffDetector.ts` | Walk-off game detection |

### Services Created (Phases B-G)

| Service | File | Purpose |
|---------|------|---------|
| Fielding Stats Aggregator | `fieldingStatsAggregator.ts` | Per-position fielding stats for awards |
| Data Export Service | `dataExportService.ts` | Export box scores and stats to CSV/JSON |

---

> ✅ **BUILD STATUS: PASSING**
>
> `npm run build` → Exit 0 (as of January 27, 2026)
>
> **IMPLEMENTATION PLAN v5** is now active.
> - Phase 1 Day 1: Wire fWAR + rWAR to useWARCalculations ✅
> - Phase 1 Day 2: Wire mWAR + Clutch Calculator ✅
> - Phase 1 Day 3: Wire Mojo + Fitness Engines ✅
> - Phase 1 Day 4: Integration Testing (pending)
>
> **Mojo/Fitness Wiring Session (January 27, 2026):**
> - useMojoState hook created - manages per-player mojo during gameplay ✅
> - useFitnessState hook created - manages per-player fitness state ✅
> - Mojo/Fitness changed to USER-CONTROLLED ONLY (auto-trigger removed) ✅
> - State consolidated through hooks (removed duplicate useState Records) ✅
> - LineupPanel edits flow through hooks to all displays ✅
> - Mojo/Fitness multipliers wired into Fame calculations (createFameEvent) ✅
> - Mojo/Fitness multipliers wired into WAR calculations (adjustWARForCondition) ✅
> - Scoreboard displays batter + pitcher mojo badges ✅
> - PlayerCard/PlayerCardModal show mojo + fitness with multipliers ✅
> - BUG-006 (No Mojo/Fitness in scoreboard) FIXED ✅
>
> **Component Wiring Session (January 26, 2026):**
> - BoxScoreView → PostGameScreen ✅
> - InningEndSummary → GameTracker inning flip ✅
> - PitcherExitPrompt → Pitch count threshold (≥85) ✅
> - WalkoffCelebration → Walkoff detection in handleAtBatFlowComplete ✅
> - FreeAgencyHub → Sign Player action with sample data ✅
> - FameEventToast → Already wired via FameToastContainer ✅
> - headlineGenerator → Already wired in PostGameScreen ✅
>
> **Position Switch Bugs Fixed (Jan 26, 2026):**
> - Bug 1: Catcher now appears in Position Switch modal (fixed lineup generation)
> - Bug 2: Auto-swap feature - system auto-adds reverse swap when moving to occupied position
>
> **Roster Management Session (January 26, 2026):**
> - ManualPlayerInput wired to route `/add-player` ✅
> - All player fields added: gender, overall, secondary position, chemistry, traits, arsenal ✅
> - RosterView delete functionality added ✅
> - Roster grouped by Position Players/Pitchers, sorted by salary descending ✅
> - Removed Team Role (Starter/Bench) designation from form ✅
> - Added location.key dependency for roster reload on navigation ✅
> - Salary calculation wired to form (auto-calculates from ratings) ✅
>
> **Previous Plan v3 completed** (Days 1-11):
> - Day 1: Fixed 42 TypeScript build errors
> - Day 2: Wired WARDisplay to UI
> - Day 3: Resolved 5 spec contradictions
> - Day 4: Added fWAR-relevant fields to FieldingModal
> - Day 5: Verified Career Aggregation Pipeline, created CareerDisplay component
> - Day 6: Created PlayerCard component with full stats, wired to UI
> - Day 7: Created SeasonLeaderboards with player click to open PlayerCard
> - Day 8: Created SeasonSummary modal with all leaderboard categories
> - Day 9: Fixed remaining spec issues (LEVERAGE, PWAR, BWAR docs)
> - Day 10: Integration testing - all 267+ tests pass
> - Day 11: Salary display BLOCKED - data model lacks player ratings
>
> See SESSION_LOG.md for detailed work log.

---

> ⚠️ **AI SESSION START PROTOCOL**
>
> **BEFORE doing any work**, read these files in order:
> 1. `SESSION_LOG_SUMMARY.md` - Condensed recent sessions (fast context loading)
> 2. `AI_OPERATING_PREFERENCES.md` - Core operating principles (NFL, scope discipline, etc.)
>
> **Optional deep-dive** (if needed for specific history):
> - `SESSION_LOG.md` - Full session history (5,900+ lines)
> - `DECISIONS_LOG.md` - Key decisions with rationale
> - `FEATURE_WISHLIST.md` - Known gaps to address
>
> These files contain critical context for how to work on this project.

---

## SML Player Database - COMPLETE ✅

All 20 Super Mega League teams fully populated with rosters.

### Database Summary

| Category | Count | Status |
|----------|-------|--------|
| SML Teams | 20 | ✅ Complete |
| Players per team | 22 | 9 starters, 4 bench, 4 rotation, 5 bullpen |
| Free Agents | 66 | ✅ Complete |
| **Total Players** | ~506 | ✅ All in `playerDatabase.ts` |

### Team Prefixes

| Prefix | Team | Prefix | Team |
|--------|------|--------|------|
| sir | Sirloins | htc | Hot Corners |
| bee | Beewolves | mns | Moonstars |
| frb | Freebooters | blf | Blowfish |
| hrb | Herbisaurs | swt | Sawteeth |
| moo | Moose | sct | Sand Cats |
| wpg | Wild Pigs | wdl | Wideloads |
| jck | Jacks | ply | Platypi |
| nem | Nemesis | grp | Grapplers |
| buz | Buzzards | htr | Heaters |
| cro | Crocodons | ovd | Overdogs |

### Player Data Includes
- Demographics: age, gender, bats, throws
- Positions: primary and secondary
- Ratings: batting (POW/CON/SPD/FLD/ARM) or pitching (VEL/JNK/ACC)
- Chemistry type
- Traits (1-2 per player)
- Arsenal (pitchers only)
- Overall grade (S, A+, A, A-, B+, B, B-, C+, C, C-, D+, D)

---

## Gap Closure Session (January 26, 2026) - COMPLETE ✅

All 18 gap closure stories from `STORIES_GAP_CLOSERS.md` implemented and committed.

### Stories Completed

| Story | Gap | Title | Commit |
|-------|-----|-------|--------|
| NEW-001 | GAP-002 | Sign Free Agent Action | P0 |
| NEW-002 | GAP-038 | Spring Training Phase | P0 |
| NEW-003 | GAP-039 | Schedule Generation Phase | P0 |
| NEW-006 | GAP-001 | Player Ratings Storage | P0 |
| NEW-007 | GAP-003 | Unified Player Database | P0 |
| NEW-008 | GAP-004 | Data Integration Layer | P0 |
| NEW-009 | GAP-031 | Fix Exit Type Double Entry | P1 |
| NEW-010 | GAP-032 | Make Player Names Clickable | P1 |
| NEW-011 | GAP-033 | Display Team Names in Scoreboard | P1 |
| NEW-012 | GAP-034 | Add Lineup Access Panel | P1 (already implemented) |
| NEW-013 | GAP-041 | Wire Relationship Engine | P1 |
| NEW-014 | GAP-042 | Wire Aging Engine | P1 |
| NEW-015 | GAP-046 | Wire Beat Reporter to Fan Morale | P1 |
| NEW-016 | GAP-050 | Enforce Offseason Phase Order | P1 |
| NEW-017 | GAP-051 | Create Farm System State | P1 |
| NEW-018 | GAP-065 | Add IndexedDB Backup/Restore | P2 |

### New Files Created

**Storage Layer:**
- `src/utils/relationshipStorage.ts` - IndexedDB for player relationships
- `src/utils/farmStorage.ts` - IndexedDB for farm system rosters
- `src/utils/backupRestore.ts` - Full IndexedDB backup/restore utility

**React Hooks:**
- `src/hooks/useRelationshipData.ts` - Relationship queries and trade warnings
- `src/hooks/useAgingData.ts` - Player aging calculations
- `src/hooks/useNarrativeMorale.ts` - Wire narrative engine to fan morale
- `src/hooks/useOffseasonPhase.ts` - Offseason phase progression state

**Components:**
- `src/components/AgingBadge.tsx` - Career phase and retirement probability display

### Key Integrations

- **Relationship → Trade**: Trade warnings show in TradeProposalBuilder when trading players with relationships
- **Narrative → Morale**: Beat reporter stories now affect fan morale via `publishStory()`
- **Aging → Retirement**: Career phase badges and retirement probability on player cards
- **Offseason → Phases**: Sequential phase completion enforced via hook
- **Farm → Roster**: Separate farm roster tracking (AAA/AA/A levels)
- **Backup → All DBs**: Export/import all 7 KBL databases to JSON

---

## Wiring Stories Session (January 26, 2026) - COMPLETE ✅

Implemented stories from `STORIES_WIRING.md` to connect orphaned components.

### Stories Completed (23 of 23) ✅

| Story | Gap | Title | Status |
|-------|-----|-------|--------|
| WIRE-001 | GAP-005 | BoxScoreView → PostGameScreen | ✅ Done |
| WIRE-002 | GAP-006 | StandingsView → SeasonDashboard | ✅ Done |
| WIRE-003 | GAP-007 | TeamStatsView → TeamPage | ✅ Done |
| WIRE-004 | GAP-009 | FanMoralePanel → GameTracker | ✅ Done |
| WIRE-005 | GAP-010 | PlayoffBracket → SeasonDashboard | ✅ Done |
| WIRE-006 | GAP-011 | ChampionshipCelebration → PostGameScreen | ✅ Done |
| WIRE-007 | GAP-012 | SeasonProgressTracker → SeasonDashboard | ✅ Done |
| WIRE-008 | GAP-014 | SalaryDisplay → PlayerCard | ✅ Done |
| WIRE-009 | GAP-015 | RelationshipPanel → PlayerCard | ✅ Done |
| WIRE-010 | GAP-016 | AgingDisplay → PlayerCard | ✅ Done |
| WIRE-011 | GAP-018 | LeagueNewsFeed → SeasonDashboard | ✅ Done |
| WIRE-012 | GAP-019 | ChemistryDisplay → RosterView | ✅ Done |
| WIRE-013 | GAP-020 | ContractionWarning → SeasonDashboard | ✅ Done |
| WIRE-014 | GAP-021 | LeagueBuilder → MainMenu | ✅ Done |
| WIRE-015 | GAP-022 | PlayerRatingsForm → ManualPlayerInput | ✅ Done |
| WIRE-016 | GAP-023 | Museum Components → MuseumHub | ✅ Done |
| WIRE-017 | GAP-024 | Awards Components → AwardsCeremonyHub | ✅ Done |
| WIRE-018 | GAP-025 | Offseason Components → OffseasonHub | ✅ Done |
| WIRE-019 | GAP-026 | transactionStorage → TradeHub | ✅ Done |
| WIRE-020 | GAP-027 | fieldingStatsAggregator → AwardsHub | ✅ Done |
| WIRE-021 | GAP-028 | dataExportService → PostGameScreen | ✅ Done |
| WIRE-022 | GAP-029 | traitPools → TraitLotteryWheel | ✅ Done |
| WIRE-023 | GAP-030 | adaptiveLearningEngine → FieldingModal | ✅ Done |

### Routes Added

| Path | Component | Description |
|------|-----------|-------------|
| `/league-builder` | LeagueBuilderWrapper | Create new league/season |
| `/awards/goldglove` | GoldGloveWrapper | Gold Glove awards presentation |
| `/museum/hof` | HallOfFameWrapper | Hall of Fame gallery |
| `/museum/retired` | RetiredNumbersWrapper | Retired numbers wall |
| `/museum/records` | FranchiseRecordsWrapper | Franchise records display |
| `/museum/championships` | ChampionshipBannersWrapper | Championship banners |

### Key Components Wired (January 26 Final Session)

- **SeasonDashboard**: PlayoffBracket (conditional, shows during playoffs), ContractionWarning
- **PostGameScreen**: ChampionshipCelebration (shows after championship win)
- **PlayerCard**: RelationshipPanel, AgingDisplay, SalaryDisplay (using salaryCalculator)
- **RosterView**: ChemistryDisplay with expandable toggle
- **MuseumHub**: HallOfFameGallery, RetiredNumbersWall, FranchiseRecords, ChampionshipBanners
- **TraitLotteryWheel**: getWeightedTraitPool from traitPools.ts

### Status

**All 23 wiring stories COMPLETE.** Player database now has full ratings for all 506 players, enabling salary calculation in PlayerCard.

---

## Project Overview

**What is this?**: A baseball stat-tracking application designed for **Super Mega Baseball 4 (SMB4)**, a video game with unique mechanics. This distinction matters because:
- No catcher interference, balk detection, or umpire judgment calls
- User manually selects all outcomes (the game tells them what happened)
- DH rules and substitutions still apply (user can remove DH)
- Kids league rules do NOT apply

---

## Implementation Status

### Core Features - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| At-bat result tracking | ✅ Complete | 1B, 2B, 3B, HR, BB, IBB, K, GO, FO, LO, PO, DP, SF, SAC, HBP, E, FC, D3K |
| Runner advancement | ✅ Complete | Force play logic, minimum advancement, user selection |
| Out counting | ✅ Complete | Includes DP (adds 2), inning flip at 3 |
| Run scoring | ✅ Complete | Respects 3rd-out-on-force rule |
| RBI calculation | ✅ Complete | Excludes errors, DP, WP, PB, Balk |
| Extra events | ✅ Complete | Steal, CS, WP, PB, Pickoff, Balk |
| Inning management | ✅ Complete | TOP/BOTTOM flip, bases clear, outs reset |
| Undo functionality | ✅ Complete | 10-state stack |
| Activity log | ✅ Complete | Rolling 10-entry display |
| CLUTCH/RISP tags | ✅ Complete | Shows situational indicators |

### Fielding System - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Fielder inference | ✅ Complete | Auto-infers fielder from direction + exit type |
| Fielding modal | ✅ Complete | Confirms fielder, play type, special situations |
| Two-step at-bat flow | ✅ Complete | Basic inputs → Fielding confirmation → Submit |
| Contextual UI | ✅ Complete | Shows toggles only when applicable (IFR, D3K, etc.) |
| Hit fielding attempts | ✅ Complete | "Clean" vs diving/leaping/robbery attempt tracking |

**Key Logic (see FIELDING_SYSTEM_SPEC.md Section 1.1):**
- Outs/Errors: ALWAYS require fielding confirmation
- Hits: Default to "Clean" (no fielding chance), user can select diving/leaping/robbery to indicate attempt
- Fielding chance only recorded when play was attempted

### Substitution System - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Pinch Hitter | ✅ Complete | PinchHitterModal with position assignment |
| Pinch Runner | ✅ Complete | PinchRunnerModal with pitcher responsibility inheritance |
| Defensive Sub | ✅ Complete | DefensiveSubModal supports multiple subs |
| Pitching Change | ✅ Complete | PitchingChangeModal with pitch count, inherited runners |
| Position Switch | ✅ Complete | PositionSwitchModal - swap positions without removing players |
| Double Switch | ⚠️ Spec only | Not yet implemented |
| Lineup State | ✅ Complete | LineupState tracks current lineup, bench, used players |
| Undo support | ✅ Complete | Lineup state included in undo stack |

### Features - PARTIALLY IMPLEMENTED ⚠️

*None currently*

### Data Persistence & Stats - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| IndexedDB game storage | ✅ Complete | `gameStorage.ts` - saves current game, archives completed |
| Game recovery on refresh | ✅ Complete | `useGamePersistence.ts` - auto-load, recovery prompt |
| Season stats aggregation | ✅ Complete | `seasonStorage.ts`, `seasonAggregator.ts` |
| Live stats display | ✅ Complete | `useLiveStats.ts` - season + current game merged |
| Event log system | ✅ Complete | `eventLog.ts` - bulletproof data with situational context |
| Data integrity checks | ✅ Complete | `useDataIntegrity.ts` - startup recovery, retry logic |
| Fame detection | ✅ Complete | `useFameDetection.ts` - triggers from accumulated stats |
| **Fielding events** | ✅ Complete | `eventLog.ts` - FieldingModal → FIELDING_EVENTS store (fixed Jan 24) |
| **Leverage per at-bat** | ✅ Complete | `AtBatEvent.leverageIndex` stored per at-bat |

See `STAT_TRACKING_ARCHITECTURE_SPEC.md` for full architecture (Phases 1-4 implemented).

**Day 1 v2 Fix (Jan 24, 2026)**: Connected FieldingModal to IndexedDB persistence. Rich fielding data (play type, difficulty, assist chains) now persists to `fieldingEvents` store for fWAR calculation.

### WAR Calculation Engines - IMPLEMENTED ✅ (Day 1-2 Sprint)

| Feature | Status | Notes |
|---------|--------|-------|
| bWAR Types | ✅ Complete | `types/war.ts` - All interfaces, SMB4 baselines |
| bWAR Calculator | ✅ Complete | `engines/bwarCalculator.ts` - wOBA, wRAA, replacement runs |
| pWAR Calculator | ✅ Complete | `engines/pwarCalculator.ts` - FIP, starter/reliever split, leverage |
| fWAR Calculator | ✅ Complete | `engines/fwarCalculator.ts` - Per-play values, positional adjustment |
| rWAR Calculator | ✅ Complete | `engines/rwarCalculator.ts` - wSB, UBR, wGDP |
| Unified Index | ✅ Complete | `engines/index.ts` - calculateTotalWAR, getTotalWARTier |
| All Tests | ✅ Complete | `war-verify.mjs` - 24/24 tests passing |
| Transaction Logging | ✅ Complete | `transactionStorage.ts` - 30+ event types |
| Career Storage | ✅ Updated | WAR fields added to career batting/pitching |
| **WAR Hook** | ✅ Complete | `hooks/useWARCalculations.ts` - Bridge to seasonStorage (Day 2) |
| **WAR Display** | ✅ Complete | `components/GameTracker/WARDisplay.tsx` - Leaderboards, badges (Day 2) |
| **fWAR Integration** | ✅ Complete | `useWARCalculations.ts` - calculateFWARFromStats wired (IMPL_PLAN_v5 Day 1) |
| **rWAR Integration** | ✅ Complete | `useWARCalculations.ts` - calculateRWARSimplified wired (IMPL_PLAN_v5 Day 1) |
| **Total WAR** | ✅ Complete | Position: bWAR+fWAR+rWAR; Pitcher: pWAR+(bWAR×0.1) |

**Day 2 v2 Fix (Jan 25, 2026)**: Connected bWAR/pWAR calculators to real persisted season data via `useWARCalculations` hook. Created display components for WAR leaderboards.

**Day 1 IMPL_PLAN_v5 (Jan 26, 2026)**: Connected fWAR and rWAR calculators to useWARCalculations hook. Added conversion functions, state maps, getters, and total WAR calculation combining all components.

**Day 2 IMPL_PLAN_v5 (Jan 26, 2026)**: Wired Clutch and mWAR systems to UI:
- Added "Clutch" tab to WARPanel (`WARDisplay.tsx`) with ClutchLeaderboard component
- Wired `useClutchCalculations` hook into GameTracker - records clutch events for both batter and pitcher after each at-bat
- Wired `useMWARCalculations` hook into GameTracker - records manager decisions (pitching changes, pinch hitters, etc.) for mWAR tracking
- Browser tested: Clutch tab appears and displays "No clutch data yet" until at-bats are recorded

**SMB4 Baselines Used (from ADAPTIVE_STANDARDS_ENGINE_SPEC.md):**
- League wOBA: 0.329, wOBA Scale: 1.7821
- League FIP: 4.04, FIP constant: 3.28
- Replacement Level: -12.0 runs per 600 PA (batters), 0.12/0.03 (starter/reliever)
- **WAR Runs Per Win: 10 × (seasonGames / 162)** — e.g., 50 games = 3.09 RPW
- SB value: +0.20, CS value: -0.45, break-even: 69%

> ⚠️ **Note**: The 17.87 "runsPerWin" in ADAPTIVE_STANDARDS is for run environment analysis (Pythagorean expectation), NOT for WAR. See SESSION_LOG "CRITICAL BUG FIX" entry.

**WAR Component Summary:**
- **bWAR**: wOBA → wRAA → replacement adjustment → park factor → WAR
- **pWAR**: FIP → runs prevented above replacement → WAR (with leverage)
- **fWAR**: per-play runs × position modifier × difficulty → positional adjustment → WAR
- **rWAR**: BsR (wSB + UBR + wGDP) / runsPerWin

### Day 3 Sprint - Leverage/Clutch/mWAR - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Leverage Index Calculator | ✅ Complete | `engines/leverageCalculator.ts` - BASE_OUT_LI table, inning/score modifiers |
| gmLI for Relievers | ✅ Complete | Accumulator pattern, gmLI → leverage multiplier |
| Clutch Calculator | ✅ Complete | `engines/clutchCalculator.ts` - Multi-participant attribution |
| Contact Quality | ✅ Complete | Exit type → CQ mapping, playoff multipliers |
| Net Clutch Rating | ✅ Complete | Per-player accumulation, tier system |
| mWAR Calculator | ✅ Complete | `engines/mwarCalculator.ts` - Decision tracking, evaluation |
| Manager Decision Types | ✅ Complete | 12 decision types, auto-detect + user-prompted |
| Team Overperformance | ✅ Complete | Salary-based expectation, 30% manager credit |
| All Tests | ✅ Complete | `leverage-clutch-mwar-verify.mjs` - 21/21 passing |
| LI UI Integration | ✅ Complete | Scoreboard displays LI with color-coded categories |

**Key Calculations:**
- **Leverage Index**: LI = BASE_OUT_LI × inningMult × walkoffBoost × scoreDamp (range: 0.1 - 10.0)
- **Clutch Value**: baseValue × √LI × playoffMultiplier
- **mWAR**: (decisionWAR × 0.60) + (overperformanceWAR × 0.40)
- **gmLI → Leverage Multiplier**: (gmLI + 1) / 2

**UI Integration:**
- Scoreboard component now displays live LI with color coding
- Categories: LOW (gray), MEDIUM (green), CLUTCH (yellow), HIGH (orange), EXTREME (red 🔥)
- CLUTCH badge still appears in at-bat card when LI ≥ 1.5

### Day 4 Sprint - Fame Engine & Detection Functions - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Fame Engine | ✅ Complete | `engines/fameEngine.ts` - LI weighting, fame tiers |
| Career Milestones | ✅ Complete | 20+ career stat thresholds (HR, Hits, Wins, etc.) |
| Season Milestones | ✅ Complete | Season achievements, clubs (20/20, 30/30, etc.) |
| First Career Detection | ✅ Complete | First hit, HR, RBI, win, save, K |
| Detection Functions | ✅ Complete | `engines/detectionFunctions.ts` - prompt/manual detection |
| Prompt Detection | ✅ Complete | Web Gem, Robbery, TOOTBLAN, Nut Shot, etc. |
| Blown Save Detection | ✅ Complete | Save opportunity tracking |
| Triple Play Detection | ✅ Complete | Regular and unassisted |
| Position Player Pitching | ✅ Complete | Clean innings, strikeouts, runs allowed |
| Fielding Errors | ✅ Complete | Dropped fly, booted grounder, wrong base |
| All Tests | ✅ Complete | `fame-detection-verify.cjs` - 25/25 passing |

**Key Calculations:**
- **Fame Value**: baseFame × √LI × playoffMultiplier
- **LI Multiplier**: √LI (LI=4 → 2×, LI=9 → 3×)
- **Fame Tiers**: Notorious (-30), Villain, Disliked, Unknown, Known, Fan Favorite, Star, Superstar, Legend (50+)
- **Save Opportunity**: Lead ≤3 OR tying run on base/at bat, 7th inning or later

**Milestone Threshold Architecture (Runtime Scaling):**
- **MLB Baseline Thresholds** are stored in code (40 HR, 200 hits, etc.) - These create meaning
- **MilestoneConfig** holds franchise settings: `gamesPerSeason`, `inningsPerGame`
- **Runtime Scaling** via `scaleMilestoneThreshold()` in fameEngine.ts
- **Scaling Types**:
  - `'opportunity'`: games × innings (gamesPerSeason/162 × inningsPerGame/9)
    - Used for: HR, hits, RBI, SB, pitcher K, walks, errors, WAR, etc.
    - Rationale: More innings per game = more plate appearances/chances
  - `'per-game'`: season length only (gamesPerSeason / 162)
    - Used for: Wins, losses, saves, blown saves, complete games, games played
    - Rationale: Max 1 per game regardless of game length
  - `'none'`: No scaling
    - Used for: Awards (All-Star, MVP, Cy Young) - 1 per season max
- **Rate stats** (BA, ERA) use same thresholds as MLB (no scaling needed)
- **Example - 32g/9inn season**: 40 HR MLB × (32/162 × 9/9) = 40 × 0.198 = 8 HR threshold
- **Example - 32g/7inn season**: 40 HR MLB × (32/162 × 7/9) = 40 × 0.154 = 6 HR threshold

**Existing UI Integration:**
- FameEventModal for manual Fame entry (all event types)
- QuickFameButtons for common events (Nut Shot, TOOTBLAN, Web Gem, etc.)
- FamePanel for in-game Fame display
- Toast notifications for auto-detected events
- EndGameFameSummary for post-game

**Design Philosophy Documented:**
- Updated `REQUIREMENTS.md` - User Interaction Model section rewritten
- Updated `AI_OPERATING_PREFERENCES.md` - Added Section 13 "GameTracker Design Philosophy"
- Detection Tiers: Auto-Detect (no input), Prompt-Detect (1-click), Manual Entry (rare)

### Day 5 Sprint - Mojo/Fitness/Salary Engines - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Mojo Engine | ✅ Complete | `engines/mojoEngine.ts` - 5-level scale, triggers, effects |
| Mojo Stat Multipliers | ✅ Complete | 0.82 (Rattled) to 1.18 (Jacked) |
| Mojo Triggers | ✅ Complete | 20+ events with situational amplification |
| Mojo Carryover | ✅ Complete | 30% carries between games |
| Fitness Engine | ✅ Complete | `engines/fitnessEngine.ts` - 6 states, decay, recovery |
| Fitness Stat Multipliers | ✅ Complete | 0.00 (Hurt) to 1.20 (Juiced) |
| Fitness Decay/Recovery | ✅ Complete | Position-specific rates, trait modifiers |
| Injury Risk | ✅ Complete | Based on fitness state, position, age, traits |
| Juiced Status | ✅ Complete | Extended rest requirements, cooldown, PED stigma |
| Salary Calculator | ✅ Complete | `engines/salaryCalculator.ts` - base + modifiers |
| Position Player Weights | ✅ Complete | 3:3:2:1:1 (Power 30%, Contact 30%, Speed 20%, Fielding 10%, Arm 10%) |
| Pitcher Weights | ✅ Complete | 1:1:1 (equal 33.3% each) |
| Position Multipliers | ✅ Complete | C +15%, SS +12%, CF +8%, 1B -8%, DH -12% |
| Trait Modifiers | ✅ Complete | Elite ±10%, Good ±5%, Minor ±2% |
| Pitcher Batting Bonus | ✅ Complete | ≥70 = +50%, ≥55 = +25%, ≥40 = +10% |
| Two-Way Player Handling | ✅ Complete | (Position + Pitcher) × 1.25 premium |
| True Value | ✅ Complete | Position-relative percentile approach |
| Trade Matching | ✅ Complete | Salary-based swap requirements |
| Draft Budget | ✅ Complete | Retirements + releases + standings bonus |
| All Tests | ✅ Complete | `mojo-fitness-salary-verify.cjs` - 45/45 passing |

**Key Calculations:**
- **Mojo Stat Multiplier**: 0.82 + (0.09 × (mojo + 2)) → 0.82 to 1.18
- **Mojo Amplification**: tieGameLate × playoff × basesLoaded × rispTwoOuts (multiplicative)
- **Mojo Carryover**: nextStartMojo = round(endMojo × 0.3)
- **Fitness Stat Multiplier**: JUICED 1.20, FIT 1.00, WELL 0.95, STRAINED 0.85, WEAK 0.70, HURT 0
- **Position Player Rating**: power×0.30 + contact×0.30 + speed×0.20 + fielding×0.10 + arm×0.10
- **Pitcher Rating**: (velocity + junk + accuracy) / 3
- **Base Salary**: (weightedRating / 100)^2.5 × $50M × positionMult × traitMod
- **Final Salary**: baseSalary × ageFactor × performanceMod × fameMod × personalityMod
- **True Value**: WAR percentile among position peers → salary percentile mapping

**Fame/WAR Integration:**
- Mojo Fame Modifier: Rattled +30%, Jacked -20%
- Fitness Fame Modifier: Juiced -50% (PED stigma), Weak +25% (gutsy)
- Mojo WAR Multiplier: Rattled +15%, Jacked -10%
- Fitness WAR Multiplier: Juiced -15%, Weak +20%

### Day 6 Sprint - Fan Morale/Narrative Engines - IMPLEMENTED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Fan Morale Engine | ✅ Complete | `engines/fanMoraleEngine.ts` - 7 states, event-driven |
| Fan State Thresholds | ✅ Complete | EUPHORIC (90-99) → HOSTILE (0-9) |
| Morale Events | ✅ Complete | 30+ event types with base impacts |
| Performance Multipliers | ✅ Complete | VASTLY_EXCEEDING (±50%) to VASTLY_UNDER (±50%) |
| Timing Multipliers | ✅ Complete | EARLY (0.5×) to PLAYOFF_RACE (2.0×) |
| Morale Drift | ✅ Complete | Natural regression toward baseline (0.03/day) |
| Momentum System | ✅ Complete | 50% amplification for streaks |
| Trade Scrutiny | ✅ Complete | 14-game window with verdicts |
| Contraction Risk | ✅ Complete | Morale (30%) + Financial (40%) + Performance (30%) |
| Narrative Engine | ✅ Complete | `engines/narrativeEngine.ts` - beat reporter templates |
| Reporter Personalities | ✅ Complete | 10 personalities with weighted distribution |
| 80/20 Alignment | ✅ Complete | 80% on-brand, 20% off-brand |
| Story Types | ✅ Complete | TRADE, GAME_RECAP, MILESTONE, etc. |
| Heat Levels | ✅ Complete | COLD (0.5×) to EXPLOSIVE (1.5×) |
| Claude API Ready | ✅ Complete | Placeholder for drop-in integration |
| Reporter Reliability | ✅ Complete | 65-95% accuracy by personality, retractions |
| All Tests | ✅ Complete | `fan-morale-narrative-verify.cjs` - 73/73 passing |

**Key Calculations:**
- **Fan State**: Derived from morale value (0-99) via FAN_STATE_THRESHOLDS
- **Morale Change**: baseImpact × performanceMult × timingMult × momentumMult
- **Performance Classification**: Compare win% vs expected (from salary-based projection)
- **Trade Verdict**: Compare acquired player WAR vs traded player WAR over 14 games
- **Contraction Risk**: (morale × 0.30) + (financial × 0.40) + (performance × 0.30)

**Beat Reporter System:**
- **Personality Weights**: BALANCED 20%, OPTIMIST 15%, DRAMATIC 12%, PESSIMIST 10%, ANALYTICAL 10%
- **Secondary Weights**: HOMER 8%, CONTRARIAN 8%, INSIDER 7%, OLD_SCHOOL 5%, HOT_TAKE 5%
- **Alignment Rate**: 80% personality-aligned, 20% off-brand
- **Story Morale Impact**: Derived from personality alignment × heat level

**Reporter Reliability System:**
- **Accuracy Rates**: INSIDER 95%, ANALYTICAL 92%, BALANCED 90%, OLD_SCHOOL 88%, OPTIMIST/PESSIMIST 85%, HOMER 80%, DRAMATIC 78%, CONTRARIAN 75%, HOT_TAKE 65%
- **Confidence Levels**: CONFIRMED (≥90%), LIKELY (≥80%), SOURCES_SAY (≥70%), RUMORED (≥50%), SPECULATING (<50%)
- **Inaccuracy Types**: PREMATURE (jumped gun), EXAGGERATED (overstated), MISATTRIBUTED (wrong player), FABRICATED (bad source), OUTDATED (situation changed)
- **Retractions**: Severe errors on high-stakes topics always need retraction; minor errors ~30% chance noticed
- **Credibility Hits**: FABRICATED -15, PREMATURE -10, MISATTRIBUTED -5, EXAGGERATED -3, OUTDATED -1

### Day 5 (IMPL PLAN v3) - Career Aggregation Pipeline - VERIFIED ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Career Storage | ✅ Complete | `careerStorage.ts` - PlayerCareerBatting/Pitching/Fielding |
| Career Aggregation | ✅ Complete | `milestoneAggregator.ts` - Game → Career via aggregateGameWithMilestones |
| Career Queries | ✅ Complete | getAllCareerBatting(), getAllCareerPitching(), getCareerStats() |
| Season End Processing | ✅ Complete | `seasonEndProcessor.ts` - MVP/Ace/Legacy detection |
| Career Milestone Detection | ✅ Complete | `milestoneDetector.ts` - Tiered thresholds with scaling |
| Career Stats Hook | ✅ Complete | `useCareerStats.ts` - Hook for UI components |
| Career Display Component | ✅ Created | `CareerDisplay.tsx` - Leaderboards (not yet rendered) |

**Data Flow:**
1. `index.tsx` line 796 → `aggregateGameToSeason()` at game end
2. `seasonAggregator.ts` → `aggregateGameWithMilestones()`
3. `milestoneAggregator.ts` → `aggregateGameToCareerBatting()` / `Pitching()`
4. Career milestones detected via `checkAndProcessCareerBattingMilestones()`

**Tier 4 Spec Audit Results:**
- ✅ Career batting interface matches spec (20+ fields)
- ✅ Career pitching interface matches spec (25+ fields)
- ✅ Scaling factors match spec (128/162 = 0.79, 6/9 = 0.67)
- ✅ WAR component milestones (bWAR, pWAR, fWAR, rWAR) tiered correctly

### Features - NOT IMPLEMENTED ❌

| Feature | Status | Priority |
|---------|--------|----------|
| Double Switch | ⚠️ Spec only | LOW - Modal not implemented yet |
| Box score export | ❌ None | FUTURE |
| Spray chart visualization | ❌ Spec only | FUTURE - Uses fielding data |
| Shift toggle | ❌ Spec only | FUTURE - Modifies inference |
| Career Display Rendered | ⚠️ Component exists | DAY 6-7 - Wire to UI |
| **Salary Display in PlayerCard** | ✅ Complete | Engine + UI wired, player database has ratings |

### Salary Display - RESOLVED ✅

**Status**: Fully implemented and working.

**What's Implemented:**
- `engines/salaryCalculator.ts` (1196 lines) - Complete per SALARY_SYSTEM_SPEC.md
- `components/GameTracker/SalaryDisplay.tsx` - All display variants available
- `components/GameTracker/PlayerCard.tsx` - Shows salary with tier and ROI badge
- `data/playerDatabase.ts` - 506 players with full ratings (batterRatings, pitcherRatings)

**How It Works:**
1. PlayerCard receives playerId from game lineup
2. `getPlayer(playerId)` retrieves PlayerData with batterRatings/pitcherRatings
3. `calculateSalary()` computes salary from ratings per SALARY_SYSTEM_SPEC.md
4. Salary displayed with tier (Supermax, Elite, etc.) and ROI badge when WAR available

---

## NFL Audit Status (January 24, 2026)

### Latest Audit: Days 1-5 Engine Implementation

A comprehensive NFL audit of engine implementations revealed critical issues in salaryCalculator.ts that have now been fixed.

**Salary Calculator Issues Found & Fixed:**

| Issue | Spec Requirement | Was Implemented | Status |
|-------|-----------------|-----------------|--------|
| Batter rating weights | 3:3:2:1:1 | 40/30/10/10/10 | ✅ Fixed |
| Pitcher rating weights | 1:1:1 (equal) | 35/35/30 | ✅ Fixed |
| Position multipliers | C: +15%, SS: +12%, etc. | Missing | ✅ Added |
| Trait modifiers | Elite ±10%, Good ±5% | Missing | ✅ Added |
| Pitcher batting bonus | ≥70 = +50%, etc. | Missing | ✅ Added |
| Two-way player handling | (Pos + Pitch) × 1.25 | Missing | ✅ Added |
| True Value calculation | Position-relative percentile | Simple ROI | ✅ Rewrote |

**All Tests Passing:**
- mojo-fitness-salary-verify.cjs: 45/45 ✅
- bwar-verify.mjs: All passing ✅
- war-verify.mjs: All passing ✅
- leverage-clutch-mwar-verify.mjs: All passing ✅
- fame-detection-verify.cjs: All passing ✅
- TypeScript compilation: Clean ✅

### Previous Audit (January 23, 2026)

See `NFL_AUDIT_REPORT.md` for full details of the spec-level audit.

**Summary:**
- **73 total issues** identified across 43 spec files
- **Critical Issues:** 7 resolved, 4 remaining (detection functions need implementation)
- **Major Issues:** 5 resolved, 17 remaining

**Key Resolutions:**
- ✅ Roster size standardized: 22-man
- ✅ Mojo range standardized: -2 to +2 (5 levels)
- ✅ "Locked In" = HIGH (+1 Mojo) display name
- ✅ ADAPTIVE_STANDARDS_ENGINE: Using SMB4 static baselines (MVP decision)
- ✅ ~45 detection functions documented in `DETECTION_FUNCTIONS_IMPLEMENTATION.md`
- ✅ Pitcher grade thresholds corrected

**New Documentation:**
- `NFL_AUDIT_REPORT.md` - Full audit with issue tracking
- `DETECTION_FUNCTIONS_IMPLEMENTATION.md` - All detection functions cataloged

---

## Known Bugs

See `GAMETRACKER_BUGS.md` for detailed bug tracking. Status as of Jan 27, 2026:

**Fixed (9 bugs):**
- BUG-001/002: Position validation in subs
- BUG-003: GO→DP auto-correction
- BUG-004/005: WAR/Season loading
- BUG-006: Mojo/Fitness in scoreboard (Jan 27 - hooks + UI wired)
- BUG-010: Morale superscripts
- BUG-013: Disable impossible events
- BUG-015: HR fielding options
- Balk button removed (not in SMB4)

**Fixed (Jan 27 Session - Bug Fix Round):**
- BUG-007: Player names not clickable → VERIFIED already fixed (onClick handlers present)
- BUG-008: Team names not in scoreboard → VERIFIED already fixed (getTeam() wired)
- BUG-011: HR distance allows invalid values → FIXED (min=250/max=550 validation)
- Pitch count never incrementing → FIXED (added result-based estimates in updatePitcherStats)

**Remaining (0 bugs from original list):**
- All 15 original bugs resolved ✅

**Fixed (Feb 2 Session - Enhanced Field Drag-Drop):**
- SVG_HEIGHT mismatch (1000 vs 900) causing 11% Y-coordinate error → FIXED (single source of truth)
- Fielders "teleporting" on drop instead of staying at release position → FIXED
- Container aspect ratio wrong (8:5 instead of 16:9) → FIXED

**Fixed (Jan 26 Session):**
- BUG-009: Undo button - NOT A BUG (exists in Activity Log, requires scroll)
- BUG-012: Pitcher exit prompt - WIRED (triggers at 85/100/115 pitches)
- BUG-014: Inning summary - WIRED (shows on inning flip)

---

## Test Coverage

- **Unit Tests**: 63/63 passing (testStateMachine.mjs + testIntegration.mjs)
- **UI Tests**: 17 scenarios tested, 16 passing, 1 not implemented (Pinch Hitter)

See `WORST_CASE_SCENARIOS.md` for detailed test results.

---

## File Structure

```
kbl-tracker/
├── src/
│   ├── components/
│   │   └── GameTracker/
│   │       ├── index.tsx          # Main component, state machine
│   │       ├── AtBatButtons.tsx   # Result/event buttons
│   │       ├── AtBatFlow.tsx      # Two-step at-bat flow with fielding
│   │       ├── FieldingModal.tsx  # Fielding confirmation modal
│   │       ├── AtBatModal.tsx     # Result confirmation modal (legacy)
│   │       └── ExtraEventModal.tsx # Event confirmation modal
│   ├── types/
│   │   └── game.ts                # TypeScript types (FieldingData, etc.)
│   └── data/
│       └── mockData.ts            # Sample team/player data
├── tests/
│   ├── testStateMachine.mjs       # 39 unit tests
│   ├── testIntegration.mjs        # 24 integration tests
│   └── fieldingInferenceTests.ts  # 88 fielding inference tests
├── reference-docs/                 # SMB4 Reference Materials
│   ├── BillyYank Super Mega Baseball Guide 3rd Edition.docx  # Full 90+ page guide
│   └── Jester's Super Mega Baseball Reference V2 clean.xlsx  # Stat tracking template
└── spec-docs/
    ├── AI_OPERATING_PREFERENCES.md # ⚠️ READ FIRST - Core operating principles for AI
    ├── KBL_XHD_TRACKER_MASTER_SPEC_v3.md  # ⭐ MASTER SPEC - All systems
    │
    │   ## WAR Calculation Specs
    ├── BWAR_CALCULATION_SPEC.md   # ⭐ Batting WAR (wOBA, wRAA, replacement level)
    ├── FWAR_CALCULATION_SPEC.md   # ⭐ Fielding WAR per-play values + season scaling
    ├── RWAR_CALCULATION_SPEC.md   # ⭐ Baserunning WAR (wSB, UBR, wGDP)
    ├── PWAR_CALCULATION_SPEC.md   # ⭐ Pitching WAR (FIP-based)
    ├── MWAR_CALCULATION_SPEC.md   # ⭐ Manager WAR (decisions + overperformance)
    │
    │   ## In-Game Tracking Specs
    ├── LEVERAGE_INDEX_SPEC.md     # ⭐ Leverage Index calculation
    ├── CLUTCH_ATTRIBUTION_SPEC.md # ⭐ Multi-participant clutch credit distribution
    ├── FIELDING_SYSTEM_SPEC.md    # Fielding UI and inference logic
    ├── RUNNER_ADVANCEMENT_RULES.md # Runner movement, force plays, WP/PB/SB
    ├── INHERITED_RUNNERS_SPEC.md  # ⭐ Inherited runner responsibility tracking
    ├── PITCH_COUNT_TRACKING_SPEC.md # ⭐ Pitch count per-AB and game totals
    ├── PITCHER_STATS_TRACKING_SPEC.md # ⭐ IP, K, BB, W/L/SV, Maddux detection
    ├── SUBSTITUTION_FLOW_SPEC.md  # ⭐ PH/PR/defensive sub/pitching change flows
    │
    │   ## Special Events & Fame
    ├── SPECIAL_EVENTS_SPEC.md     # ⭐ Fame Bonus/Boner events (nut shot, TOOTBLAN, etc.)
    ├── fame_and_events_system.md  # Fame system, All-Star voting, random events
    │
    │   ## SMB4 Reference
    ├── SMB4_GAME_MECHANICS.md     # ⭐ Central SMB4 what IS/ISN'T in game
    ├── SMB4_GAME_REFERENCE.md     # SMB4 game mechanics (Mojo, Chemistry, Traits)
    │
    │   ## Project Management
    ├── CURRENT_STATE.md           # This file
    ├── DECISIONS_LOG.md           # Key decisions with rationale
    ├── REQUIREMENTS.md            # User requirements
    ├── SESSION_LOG.md             # Running session log
    ├── WORST_CASE_SCENARIOS.md    # Test results
    └── STATE_TRANSITION_RULES.md
```

---

## WAR Calculation Implementation Phases

> **Future-proofing note**: This section documents what advanced metrics can be calculated now vs. what requires enhanced tracking. Each spec file has detailed implementation notes.

### Summary Table

| Metric | Component | Status | Notes | Spec Reference |
|--------|-----------|--------|-------|----------------|
| **bWAR** | wOBA | ✅ Ready | All batting events tracked | BWAR_CALCULATION_SPEC.md §3-4 |
| **bWAR** | wRAA | ✅ Ready | Derived from wOBA | BWAR_CALCULATION_SPEC.md §5 |
| **bWAR** | Replacement Level | ✅ Ready | Calibration system included | BWAR_CALCULATION_SPEC.md §6-7 |
| **fWAR** | Basic plays | ✅ Ready | Putouts, assists, errors | FWAR_CALCULATION_SPEC.md §4-6 |
| **fWAR** | Advanced plays | ⚠️ Partial | Need running/sliding/over_shoulder tracking | FIELDING_SYSTEM_SPEC.md |
| **fWAR** | DP role credit | ❌ Later | Schema defined, UI not built | FIELDING_SYSTEM_SPEC.md §1.2 |
| **rWAR** | wSB | ✅ Ready | SB/CS tracked via extra events | RWAR_CALCULATION_SPEC.md §3 |
| **rWAR** | wGDP | ✅ Ready | GIDP tracked as at-bat result | RWAR_CALCULATION_SPEC.md §5 |
| **rWAR** | UBR (basic) | ⚠️ Partial | Speed rating proxy available | RWAR_CALCULATION_SPEC.md §8 |
| **rWAR** | UBR (full) | ❌ Later | Needs runner advancement tracking | RWAR_CALCULATION_SPEC.md §8 |
| **pWAR** | FIP | ✅ Ready | K, BB, HBP, HR all tracked | PWAR_CALCULATION_SPEC.md §3 |
| **pWAR** | Basic pWAR | ✅ Ready | Using simplified RPW | PWAR_CALCULATION_SPEC.md §8 |
| **pWAR** | Starter/Reliever split | ✅ Ready | GS and G tracked | PWAR_CALCULATION_SPEC.md §6 |
| **pWAR** | Leverage adjustment | ✅ Ready | Full LI calculation now available | LEVERAGE_INDEX_SPEC.md §4-6 |
| **pWAR** | Park adjustment | ❌ Later | Requires park factor data | PWAR_CALCULATION_SPEC.md §11 |
| **Clutch** | Leverage Index | ✅ Ready | All game state data tracked | LEVERAGE_INDEX_SPEC.md §3-4 |
| **Clutch** | LI-weighted clutch/choke | ✅ Ready | Replaces binary "close game" | CLUTCH_ATTRIBUTION_SPEC.md §4 |
| **Clutch** | Multi-participant attribution | ✅ Ready | Credit to all players on play | CLUTCH_ATTRIBUTION_SPEC.md §4-5 |
| **Clutch** | Contact Quality | ✅ Ready | Inferred from trajectory | CLUTCH_ATTRIBUTION_SPEC.md §3 |
| **Clutch** | Net Clutch Rating | ✅ Ready | Feeds All-Star/Award voting | CLUTCH_ATTRIBUTION_SPEC.md §9 |
| **mWAR** | Decision tracking | ✅ Ready | Auto-inferred + user-prompted | MWAR_CALCULATION_SPEC.md §3-4 |
| **mWAR** | Decision evaluation | ✅ Ready | LI-weighted outcomes | MWAR_CALCULATION_SPEC.md §5 |
| **mWAR** | Team overperformance | ✅ Ready | Wins vs salary expectation | MWAR_CALCULATION_SPEC.md §6 |

### Phase 1 (Calculate Now)
These metrics can be implemented with current tracking:
- **Full bWAR**: wOBA, wRAA, replacement level adjustment
- **Basic fWAR**: Per-play credits for putouts, assists, errors, DPs
- **Partial rWAR**: wSB (stolen bases) + wGDP (double play avoidance)
- **Full pWAR**: FIP, starter/reliever split, real LI-based leverage multiplier
- **Full Clutch System**: LI calculation, multi-participant attribution, contact quality, Net Clutch Rating
- **Full mWAR**: Manager decision tracking (auto-inferred), LI-weighted evaluation, team overperformance

### Phase 2 (Requires Enhanced Tracking)
These need additional UI/schema work:
- **Full fWAR**: DP role tracking (started/turned/completed), new play types
- **Full rWAR (UBR)**: Runner advancement opportunities, extra bases taken, thrown out advancing
- **Park factors**: For pWAR park adjustment
- **Full mWAR prompts**: User-prompted steal/bunt/squeeze calls (currently defaults to player autonomy)

### Schema Additions Defined But Not Implemented
See FIELDING_SYSTEM_SPEC.md and RWAR_CALCULATION_SPEC.md for ready-to-implement schemas:
- `dpRole`: 'started' | 'turned' | 'completed' | 'unassisted'
- `RunnerAdvancement`: advancementType, couldHaveAdvanced, wasThrown
- Enhanced play types: running, sliding, over_shoulder

---

## Key Code Locations

| Logic | File | Line(s) | Notes |
|-------|------|---------|-------|
| Force play calculation | index.tsx | ~150-180 | `getMinimumBase()` function |
| Out counting | index.tsx | ~280-320 | DP adds 2, runner outs add 1 |
| RBI calculation | index.tsx | ~250-280 | Modal pre-calculates, user can adjust |
| Inning flip | index.tsx | ~320-350 | Clears bases, resets outs |
| Extra events | index.tsx | ~400-450 | `handleExtraEvent()` |
| Undo | index.tsx | ~100-130 | 10-state stack |
| **Fielding chance logic** | AtBatFlow.tsx | ~315-326 | `needsFieldingConfirmation` calculation |
| **Fielder inference** | FieldingModal.tsx | ~59-98 | Direction + exit type → fielder matrices |
| **Hit fielding attempt** | AtBatFlow.tsx | ~766-798 | "Clean" vs diving/leaping/robbery UI |
| **FieldingData type** | types/game.ts | ~18-50 | Complete fielding data interface |

---

*This document should be updated whenever implementation status changes.*
