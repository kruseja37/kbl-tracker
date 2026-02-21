# KBL TRACKER — SESSION LOG
# Previous sessions archived at: spec-docs/archive/SESSION_LOG_through_2026-02-11.md
---
## Session: 2026-02-18 — Persistence/Rehydration Hardening (GameTracker Figma Path)
### Accomplished
- Investigated refresh regression where large scoreboard values leaked from prior sessions and lead runners intermittently disappeared.
- Identified race/staleness causes in `src/src_figma/hooks/useGameState.ts`:
  - `currentGame` snapshot rehydrated without strict in-progress header validation,
  - shared debounced save path allowed delayed stale writes across game boundaries,
  - snapshot runner identity could be absent while base occupancy booleans remained true.
- Implemented hardening changes:
  - Strict snapshot gate: rehydrate snapshot only when gameId matches AND `getGameHeader(...).isComplete === false`.
  - Stale snapshot cleanup: auto-clear mismatched/invalid `currentGame` snapshots.
  - Autosave isolation: replaced shared `debouncedSaveCurrentGame` usage with hook-local timeout + `saveCurrentGame`.
  - Lifecycle safety: clear pending autosave timers during initialize/load/unmount/end-game.
  - Session hygiene: clear `currentGame` on new game initialization and after completed game processing.
  - Runner durability: fallback serialization preserves occupied lead bases even if tracker identity momentarily lags.
### Verification
- Figma persistence path updated and compiles.
- Full `npm run build` still surfaces pre-existing legacy type errors in `src/components/GameTracker/*` outside the active Figma path.
### Pending Manual Check
- Browser validation still required:
  1. Start game A, create runners + scoreboard changes, refresh, verify all bases and line score persist.
  2. End game A, start game B, verify no residual scoreboard/runners carry over.

## Session: 2026-02-12 — Full Stack Audit + Post-Season Build
### Accomplished
- Full Stack Audit: 28 defects found and fixed (2 CRITICAL, 12 MAJOR, 8 MINOR, 4 INFO)
- DEF-001 CRITICAL: Fixed IndexedDB v2/v3 version deadlock (created trackerDb.ts)
- DEF-002 CRITICAL: Deleted stadiumData.ts, wired real stadium names from IndexedDB
- All Math.random() fake stats removed
- All hardcoded MLB names removed from franchise UI
- MOCK_* constants renamed to EMPTY_*
- Orphan variables cleaned up
### Post-Season Build (4 Batches)
- Batch 1: Wired 5 orphaned code assets (seasonTransitionEngine, qualifyTeams, SeasonEndFlow, PlayoffSeedingFlow, PostseasonMVPFlow)
- Batch 2: Added playoff SIM, cleaned WorldSeries LEADERS/HISTORY tabs
- Batch 3: Offseason persistence (retirements, FA, draft, ratings all modify actual rosters)
- Batch 4: Both season advancement paths aligned, career stats verified safe
### Bug Fixes
- 3 React hooks crashes fixed (SpecialAwardsScreen, RetirementFlow, FinalizeAdvanceFlow)
- 3 missing offseason tabs added (Farm Reconciliation, Chemistry Rebalancing, Spring Training)
- Tab order corrected to match state machine
- Contraction/Expansion: 1,310 lines of stub replaced with 64-line honest placeholder
### Full Lifecycle Verified
- Season 1 → Playoffs → Champion → Offseason (11/11 phases) → Season 2 → Play games ✅
- 0 console errors throughout
### Browser-Verified Flows (continued session)
- League Leaders N/A fix: rewired batch SIM to full pipeline (generateSyntheticGame + processCompletedGame)
- useFranchiseData: dynamic seasonId from currentSeason param (was hardcoded season-1)
- FreeAgencyFlow hooks crash: moved isLoading early return after all hooks + guarded currentTeam access
- DraftFlow: replaced 2 hardcoded "SAN FRANCISCO GIANTS" with dynamic userTeamName
- Flow D1 (Free Agency): PASS — full protection→dice→destination→exchange flow with real players
- Flow D2 (Draft): PASS — 20 AI-generated prospects, user pick, roster tracking (FIXED MLB name bug)
- Flow D3 (GameTracker Season 2): PASS — game loads with full field, all buttons, playable
- Flow D4 (Museum): PASS — UI loads (6 tabs), data empty (expected: museum pipeline not built yet)
### Offseason Phase Machine Verification (continued session)
- Wired SpringTrainingFlow `onComplete` prop from FranchiseHome → handleAdvancePhase
- SIMmed Season 2: 160 regular season games → playoffs (Crocodons champion, 4-0 sweep of Wideloads) → offseason
- Systematically verified ALL 11 offseason phase transitions via browser:
  - Phase 1→2 (STANDINGS_FINAL → AWARDS): PASS — tab auto-selected to AWARDS, Awards Ceremony content loaded
  - Phase 2→3 (AWARDS → RATINGS_ADJUSTMENTS): PASS — tab auto-selected to RATINGS ADJ
  - Phase 3→4 (RATINGS_ADJUSTMENTS → CONTRACTION_EXPANSION): PASS — tab auto-selected to CONTRACT/EXPAND
  - Phase 4→5 (CONTRACTION_EXPANSION → RETIREMENTS): PASS — tab auto-selected to RETIREMENTS
  - Phase 5→6 (RETIREMENTS → FREE_AGENCY): PASS — tab auto-selected to FREE AGENCY
  - Phase 6→7 (FREE_AGENCY → DRAFT): PASS — tab auto-selected to DRAFT
  - Phase 7→8 (DRAFT → FARM_RECONCILIATION): PASS — tab auto-selected to FARM SYSTEM
  - Phase 8→9 (FARM_RECONCILIATION → CHEMISTRY_REBALANCING): PASS — tab auto-selected to CHEMISTRY
  - Phase 9→10 (CHEMISTRY_REBALANCING → TRADES): PASS — tab auto-selected to TRADES
  - Phase 10→11 (TRADES → SPRING_TRAINING): PASS — tab auto-selected to SPRING TRAINING
  - Phase 11→COMPLETED: PASS — "START SEASON 3" button appears, IndexedDB status=COMPLETED
- IndexedDB verified: all 11 phases in phasesCompleted array, completedAt timestamp present
- Spring Training content loads with real data: 78 DEVELOPING, 308 PRIME, 120 DECLINING, 0 MUST RETIRE
- Only console error: pre-existing FreeAgencyFlow hooks ordering warning (non-blocking)
### Pending (for next session)
- FinalizeAdvanceFlow requires 32 players per team (farm validation blocks advance without full draft)
- ~~GameTracker "TIGERS/SOX" defaults~~ — FIXED (uses navigationState, defaults to 'HOME'/'AWAY')
- Museum data pipeline needs building (all tabs empty)
- FreeAgencyFlow hooks ordering warning (React dev mode, non-blocking)
- See CURRENT_STATE.md "Known Issues" section for complete list

---
## Session: 2026-02-12 (cont.) — Data Integrity Fixes + Documentation Reconciliation
### Data Integrity Fix Plan v2 (21/21 RESOLVED)
All batches completed. Full details in `DATA_INTEGRITY_FIX_REPORT.md`.

| Batch | Issues | Commits |
|-------|--------|---------|
| 1A-i | #1 pitcher stats, #4 fielding persistence | (prior session) |
| 1A-ii | #5 runnersAfter null, #6 basesReachedViaError | (prior session) |
| 1B | #2 milestone playerName, #3 W/L/SV, #11 HBP/SF/SAC/GIDP | a76ad23 |
| 2A | #8 loss decision, #13 isPlayoff, #14 walk-off, #15 team record | 7629f29 |
| 2B | #10 pitch count, #16 SB/CS in WAR, #17 fielding credits | d393bfd |
| 2C | #7 autoCorrectResult wired | 6b5dd45 |
| 3 | #18 hooks ordering, #19-20 docs, #21 dead balks field | def25eb |
| F1 | Career pitching W/L/SV/H/BS aggregation | d790a72 |
| F2 | #12 WPA system (winExpectancyTable + wpaCalculator, 26 tests) | 1f39f15 |
| F3 | #9 LineupState tracking + substitution validation | 4b0e11e |

### Documentation Reconciliation
- Updated DATA_INTEGRITY_FIX_REPORT.md: 21/21 ALL RESOLVED (296141a)
- Updated FEATURE_WISHLIST.md: moved 13 completed items, added "Still Orphaned" section (60c1c4f)
- Updated IMPLEMENTATION_PLAN.md: reconciled engine matrix, remaining 9 sprint items (60c1c4f)
- Updated CURRENT_STATE.md: fixed test count (5653/134), marked #6/#13/#14 as FIXED, added data integrity + orphan + bug sections
- Updated SESSION_LOG.md: added data integrity batch table
- Cleaned CLAUDE.md: removed stale ACTIVE FIX PROTOCOL section (data integrity work complete)

### Final Test Baseline
- Build: PASS (exit 0)
- Tests: 5,653 passing / 0 failing / 134 test files
- All 8 canary checks: PASS

### Remaining Sprint Work (per IMPLEMENTATION_PLAN.md)
**Orphan wiring (3):** Clutch hook import, fWAR/rWAR display columns, Mojo/Fitness scoreboard display
**Gap closure (3):** IBB tracking, Player ratings data model, Milestone watch UI
**Bug fixes (4):** BUG-006 (scoreboard), BUG-007 (fame events), BUG-008 (end game modal), BUG-014 (inning summary)

---
## Session: 2026-02-13 (cont.) — Tier 0 + Tier 1 Bug Fixes

### Tier 0 Fixes (5 commits)
- T0-01: Auto game-end detection at regulation end (c52b685)
- T0-03: Baserunning outs (CS/pickoff/TOOTBLAN) triggering half-inning end (1ecca6b)
- T0-04: Wire error flow position buttons to recordError() (06d075d)
- T0-05: Game persistence — played games now persist to standings/schedule (7e7b363)
- T0-07/T0-11/T0-12: Replace hardcoded Tigers/Sox with dynamic team names (db5ba24)

### Tier 1 Diagnostic (Phase 1)
- T1-01: Fame per-player tracking — CONDITIONAL (works but affected by T1-08 doubling)
- T1-07: Scoreboard display — RESOLVED (core works, 9-column cosmetic minor)
- T1-08: Post-game stats — STILL BROKEN (all stats exactly doubled)

### Tier 1 Fixes (7 commits)
| ID | Issue | Fix | Commit |
|----|-------|-----|--------|
| T1-08 | Stats doubled in post-game | Idempotency guards in completeGameInternal + endGame | ba382fe |
| T1-09 | Mojo/Fitness factors | VERIFIED CORRECT — no fix needed | N/A |
| T1-10 | Pitcher rotation in SIM | Rotation cycling, closer usage, save/hold detection | 8c52ba8 |
| T1-02/03/04 | Runner identity bugs | getBaseRunnerNames() sync from tracker + version counter | 8b8505c |
| T1-05 | Fielding inference | Auto-infer credits from fieldingSequence, skip modal | 21aa89c |
| T1-06 | Error prompt on OUT | Clear stale React state + local variable for check | 02876e5 |
| T1-11 | SMB4 traits made-up | Replaced 32 fake traits with 63 real SMB4 traits | 0bd310c |

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files) — matches baseline

### Items Needing Runtime Verification
1. T1-01: Fame popup count correctness post-T1-08 fix
2. T1-02/03/04: Pinch runner name display on bases
3. T1-05: FielderCreditModal auto-skip on standard plays
4. T1-06: No false ErrorOnAdvanceModal on OUT plays after hit

### Full Report: spec-docs/TIER1_VERIFICATION.md

---
## Session: 2026-02-13 — Pre-Manual Bug Triage + Doc Reconciliation

### What Was Accomplished
- ✅ Deep cross-check of ALL tracking docs vs actual codebase (6 documents updated)
- ✅ Full bug triage: read GAMETRACKER_BUGS.md, traced all 4 active bugs in code, classified each
- ✅ Discovered BUG number collision (GAMETRACKER_BUGS.md vs IMPLEMENTATION_PLAN.md used same numbers for different bugs)
- ✅ Found BUG-007 (Fame events) is LIKELY FIXED — useFameTracking fully wired with popup (GameTracker:2016-2040)
- ✅ Found BUG-008 was mislabeled — End Game modal is fine, real issue is PostGameSummary data gaps
- ✅ Confirmed FinalizeAdvanceFlow 32-player already uses soft gate ("Advance Anyway" button)
- ✅ Classified all orphan features (Clutch=INVISIBLE, fWAR/rWAR=NO UI BUILT)
- ✅ Verified IBB IS tracked (useGameState:107,283), Player ratings viewable in offseason
- ✅ Updated GAMETRACKER_BUGS.md summary (11/15 fixed, 4 remaining)
- ✅ Updated CURRENT_STATE.md with accurate issue list (7 active items, properly described)
- ✅ Updated IMPLEMENTATION_PLAN.md bug table (removed stale BUG numbers, 11 remaining sprint items)
- ✅ Fixed stale MEMORY.md (test baseline, autoCorrectResult marked fixed)
- ✅ Committed doc reconciliation (5bdf426) and triage (d379437)

### Decisions Made
- Bug number collision resolved: GAMETRACKER_BUGS.md retains original numbers, IMPLEMENTATION_PLAN.md now uses descriptive names instead
- Fame events classified "LIKELY FIXED" pending live verification rather than "TODO"
- PostGameSummary gaps now properly described (errors=0 hardcode + no batting box score) instead of vague "End Game modal wrong data"

### NFL Results
- Not an implementation day — triage/documentation only
- **Day Status**: COMPLETE (triage objective achieved)

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files)
- All canary checks: PASS

### Pending / Next Steps
**Must verify during manual testing:**
- [ ] Fame events popup — trigger one in live game to confirm LIKELY FIXED
- [ ] PostGameSummary — play a game, end it, check if box score data looks right

**Remaining sprint items (11 total, per IMPLEMENTATION_PLAN.md):**
Orphan wiring:
- [ ] Wire Clutch Calculator (import useClutchCalculations in GameTracker)
- [ ] Add fWAR/rWAR display columns
- [ ] Mojo/Fitness scoreboard display (MiniScoreboard has no mojo/fitness props)

Gap closure:
- [ ] IBB tracking in bWAR (IBB tracked, verify wOBA formula excludes it)
- [ ] Player Ratings data model (types + storage + game setup UI)
- [ ] Milestone Watch UI (component + hook + scoreboard)
- [ ] PostGameSummary fixes (errors=0, add batting box score)
- [ ] Inning summary component (new, render at inning flip)
- [ ] Exit type double-entry UX (review AtBatFlow modal)
- [ ] Lineup access modal (view/edit lineup mid-game)
- [ ] Special plays logging (wire fame + activity log for diving/robbery)

### Key Context for Next Session
- GAMETRACKER_BUGS.md original BUG-006 = "Exit type double entry" (NOT mojo/fitness)
- GAMETRACKER_BUGS.md original BUG-008 = "Team names in scoreboard" (FIXED, NOT end game modal)
- IMPLEMENTATION_PLAN.md now uses descriptive names to avoid number confusion
- Fame popup code exists at GameTracker.tsx:2016-2040 — test by getting a home run or special event
- PostGameSummary.tsx:162 has `errors: 0` hardcoded — fix by pulling from game state

### Files Modified
- `spec-docs/CURRENT_STATE.md` — accurate test count, fixed statuses, added active issues section
- `spec-docs/GAMETRACKER_BUGS.md` — updated summary table (11/15 fixed), separated tracking
- `spec-docs/IMPLEMENTATION_PLAN.md` — accurate bug table, 11 remaining sprint items
- `spec-docs/SESSION_LOG.md` — this session entry
- `CLAUDE.md` — removed stale ACTIVE FIX PROTOCOL (replaced with completion notice)

### Commits This Session
- `5bdf426` — Reconcile all tracking docs with actual codebase state
- `d379437` — Pre-manual triage: classify bugs, update tracking docs

---
## Session: 2026-02-14 — Tier 2 Bug Fixes (6 commits)

### Tier 2 Diagnostic
Assessed all 11 T2 issues. Found 5 already resolved by prior T0/T1 work:
- T2-01 (Mock data): mockData.ts orphaned/unused
- T2-02 (Lineup card): Dynamic reactive data flow works
- T2-03 (Beat writers): Shows empty state (feature not built is expected)
- T2-06 (SIM box scores): Data pipeline complete
- T2-08 (Manager decisions): Fully wired

### Tier 2 Fixes
| ID | Issue | Root Cause | Fix | Commit |
|----|-------|------------|-----|--------|
| T2-11 | Errors not on MiniScoreboard | No error props in interface | Added awayErrors/homeErrors to MiniScoreboard | 24692ab |
| T2-04 | Salaries all $0.0 | convertPlayer() hardcoded salary: 1.0 | computeInitialSalary() calls salary engine | b17d025 |
| T2-05 | Team Hub no player stats | useSeasonStats() defaulted to 'season-1' | Derive correct seasonId from franchiseData | 0e5c288 |
| T2-07 | No narratives in news tab | Narratives generated but never persisted | Load recent games + generate on-the-fly | 951c6f2 |
| T2-09 | Immaculate inning no popup | Detection fired to fameEvents[] but not display hook | Wire confirmPitchCount result to fameTrackingHook | 11e7a9c |
| T2-10 | Duplicate positions in lineup | slice(0,8) with no dedup | 3-pass greedy position-fill algorithm | efe0d43 |

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files) — matches baseline

### All Runtime UNVERIFIED
All 6 fixes pass build+tests but need manual verification:
1. T2-11: Start game, minimize scoreboard, record error → see "E:1"
2. T2-04: Create fresh franchise → check player salaries (non-zero, varied)
3. T2-05: Play franchise game → Team Hub Stats tab shows WAR
4. T2-07: Play game → Tootwhistle Times tab shows narratives
5. T2-09: 3K on 9 pitches → confirm pitch count → fame popup appears
6. T2-10: Start franchise game → verify 8 unique field positions + pitcher 9th

---
## Session: 2026-02-14 (cont.) — Tier 3 Feature Builds (3 commits)

### Plan: spec-docs/TIER3_BUILD_PLAN.md

### Tier 3 Features
| ID | Issue | Size | Fix | Commit |
|----|-------|------|-----|--------|
| T3-02 | View Roster button dead | SMALL | Added useNavigate + onClick to navigate('/league-builder/rosters') | e252ccb |
| T3-03 | No way to remove games | MEDIUM | Added onDeleteGame prop to ScheduleContent, Trash2 icon + inline confirm | acfb04b |
| T3-01 | No pre-game lineup screen | LARGE (MVP) | PreGameData state in GameDayContent, LineupPreview overlay, starter dropdown | 498e4be |

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files) — matches baseline

### All Runtime UNVERIFIED
1. T3-02: Go to franchise setup → Step 5 (Roster Mode) → "[View Rosters]" link navigates to league builder
2. T3-03: Go to Schedule tab → see trash icon on scheduled games → click → confirm → game deleted
3. T3-01: Click "Play Game" in franchise → pre-game overlay shows lineups + starter picker → select starter → "START GAME" launches

### Summary
All 35 items from MANUAL_TESTING_BUG_FIX_PLAN.md addressed:
- Tier 0: 6 game-breaking fixes (prior session)
- Tier 1: 11 wrong-results fixes (prior session)
- Tier 2: 6 wiring fixes + 5 already resolved
- Tier 3: 3 feature builds

---
## Session: 2026-02-14 (cont.) — Remaining Tier 3 + Cosmetic Fixes (5 commits)

### Items Completed
| ID | Issue | Size | Fix | Commit |
|----|-------|------|-----|--------|
| T3-05 | SMB4 name verification | SMALL | Audited all name pools — 100% real SMB4 names, 0 fake | 1725882 |
| T3-04 | Museum data pipeline (MVP) | MEDIUM | Created museumPipeline.ts, auto-populate AllTimeLeaders from career data | c74d4c7 |
| T3-06 | Milestone watch UI (MVP) | LARGE | MilestoneWatchPanel component + async loading in pre-game overlay | 9f6f362 |
| T3-07 | fWAR/rWAR display columns | MEDIUM | Added BattingSortKey entries, useFranchiseData leaders, SeasonLeaderboards UI | 8348962 |
| T0-15 | Post-game 9-inning header | SMALL | Derived numInnings from inningScores.length, replaced 4 hardcoded 9s | 91911ba |

### Files Created
- `src/utils/museumPipeline.ts` — Bridge between careerStorage and museumStorage
- `src/src_figma/app/components/MilestoneWatchPanel.tsx` — Approaching milestones display

### Files Modified
- `src/src_figma/hooks/useMuseumData.ts` — Auto-populate on load when empty
- `src/src_figma/app/pages/FranchiseHome.tsx` — Milestone watch in pre-game overlay
- `src/hooks/useSeasonStats.ts` — fWAR/rWAR sort keys
- `src/src_figma/hooks/useFranchiseData.ts` — fWAR/rWAR leader data
- `src/components/GameTracker/SeasonLeaderboards.tsx` — fWAR/rWAR column headers
- `src/src_figma/app/pages/PostGameSummary.tsx` — Dynamic inning count

### Build Status
- Build: PASS (exit 0)
- Tests: 5,653 / 5,653 passing (134 files) — matches baseline

### All Runtime UNVERIFIED
1. T3-04: Open Museum → All-Time Leaders tab should auto-populate from career data
2. T3-06: Click "Play Game" in franchise → pre-game overlay shows milestone watches
3. T3-07: Go to League Leaders → fWAR and rWAR categories visible and sortable
4. T0-15: Play a 7-inning game → post-game scoreboard shows 7 columns, not 9

### Complete Bug Fix Summary
All 40 items across all tiers now addressed:
- Tier 0: 6 game-breaking fixes + 1 cosmetic (T0-15)
- Tier 1: 11 wrong-results fixes
- Tier 2: 6 wiring fixes + 5 already resolved
- Tier 3: 6 feature builds + 1 verification (T3-05) + 2 new features (T3-04, T3-06, T3-07)

---
## Session: 2026-02-14 (cont.) — Full Codebase Cleanup

### Goal
Make the project easily understandable for future AI agent sessions that have never worked in kbl-tracker.

### Phase 1: spec-docs/ Cleanup (417MB → 262MB)
- Deleted 254 duplicate .jpg files (~190MB) — SMB4 screenshots existed as both .jpg and .jpeg
- Archived 38 completed work artifacts (CLI prompts, audit reports, old session logs)
- Archived superseded document versions
- Removed .DS_Store files throughout
- Removed exact duplicate files (identified via md5 hash)

### Phase 2: src/ vs src_figma/ Analysis
- Confirmed src_figma lives INSIDE src/ at `src/src_figma/` (not a sibling)
- Mapped 384+ cross-imports from src_figma → src/ (engines, utils, types, hooks)
- Confirmed all 16 routes in App.tsx import exclusively from src_figma/app/pages/
- Identified 6 duplicate utils, dead pages, dead services

### Phase 3: Dead Code Removal
**Archived (preserved in archived-*/ folders):**
- 20 dead legacy page components → `src/archived-pages/` (252K)
- 35 dead components (awards/, museum/, offseason/ subfolders) → `src/archived-components/` (372K)
- 3 dead hooks (useNarrativeMorale, usePlayerData, useRosterData) → `src/archived-hooks/` (16K)
- 8 orphan test files → `src/archived-tests/` (124K)
- 11 stale migration docs → `src/src_figma/archived-docs/` (208K)

**Deleted (not archived):**
- `src/services/` — 2 dead files (apiConfig.ts, teamService.ts), no imports
- `src/src_figma/imports/` — 2 Figma export artifacts, never imported
- 4 stale figma config files from src_figma/ root
- Root-level artifacts: cleanup.sh, run-cleanup.sh, CLAUDE.md.backup, files.zip

### What Remains Active in src/
- `components/`: GameTracker/ (31 files) + 6 shared components (AgingDisplay, FanMoralePanel, LeagueBuilder, NavigationHeader, RelationshipPanel, TeamSelector)
- `hooks/`: 16 hooks — all verified as imported by active code
- `engines/`: 36 engine files + __tests__/ (WAR calculators, mojo, salary, playoffs, etc.)
- `utils/`: 38 storage + utility modules (IndexedDB layer, game processing, franchise management)
- `types/`: 4 type files (game.ts, franchise.ts, war.ts, index.ts)
- `context/`: AppContext.tsx + appStateStorage.ts
- `tests/`: 3 files (baseballLogicTests, runStateMachineTests, stateMachineTests)

### Final Sizes
- spec-docs/: 263MB (mostly SMB4 reference images)
- src/: 8.9MB total
- archived-*/ folders: ~764K total

### Known Deferred Item
- Type consolidation: src/types/ vs src/src_figma/app/types/ have partial duplicates (game.ts differs by FAILED_ROBBERY constant, war.ts is identical, index.ts differs). Requires updating 384+ import paths — deferred to dedicated session.

### Documentation Updated
- CURRENT_STATE.md: Added "CODEBASE ARCHITECTURE" section with directory layout, architecture rules, and type duplication notes
- SESSION_LOG.md: This entry

### Decisions Made
- **No folder restructuring:** src_figma stays inside src/ — moving it would break vite alias, tsconfig paths, and all @ imports
- **Archive over delete:** Dead code moved to archived-*/ folders rather than deleted, for reference
- **Type consolidation deferred:** Too many import paths to update safely without dedicated session + build verification

### Phase 4: Full Project Cleanup for Agent Transfer
**Goal:** Prep entire kbl-tracker folder for new agents starting from scratch.

**Root-level cleanup:**
- Removed duplicate `mcp.json` (identical to `.mcp.json`)
- Removed `Claude Skills/` folder (superseded by `.claude/skills/`)
- Removed `test-results/` (empty, just `.last-run.json`)
- Removed `.DS_Store`

**spec-docs reorganization (134 → 78 items at root):**
- Archived 24 audit/report artifacts (AUDIT_REPORT, COHESION_REPORT, DATA_INTEGRITY_FIX_REPORT, etc.)
- Archived 12 stale/superseded docs (PIPELINE, CLAUDE_CODE_CONSTITUTION, RALPH_FRAMEWORK, etc.)
- Created `stories/` subfolder → moved 14 STORIES_*.md files
- Created `testing/` subfolder → moved 6 testing pipeline + API map docs
- Removed duplicates (Audit Triage.xlsx, test_write_permission)
- Archive grew from 82 → 119 files

**src cleanup:**
- Removed `src/src_figma/app/data/mockData.ts` (confirmed orphaned/unused)

**CLAUDE.md rewrite:**
- Updated project structure with accurate file counts (16 pages, 49 components, 15 figma engines, etc.)
- Removed 70-line SMB4 extraction protocol (one-time-use, no longer needed)
- Updated custom skills section (4 → 20 skills, organized by pipeline)
- Removed stale references to deleted files and old component counts

**CURRENT_STATE.md updates:**
- Updated spec-docs directory layout to reflect new subfolder structure
- Archive count updated (79 → 119)

**Final project state:**
- Root: 15 items (src, spec-docs, reference-docs, test-utils, config files)
- spec-docs/: 78 items at root, organized into 7 subfolders
- src/: 8.9MB, all active code verified
- CLAUDE.md: 187 lines, accurate, concise
- All 3 agent-facing docs (CURRENT_STATE, SESSION_LOG, CLAUDE.md) current and consistent

- **2026-02-15:** Phase 1 GameTracker bugs (exit-type double entry, lineup modal access, special-play logging, stadium/HR data) resolved; `fake-indexeddb` added for season/franchise tests, PostGameSummary/useGameState imports aligned, and `npm test` confirms 134 suites (5,653 tests) pass. Phase 2 wiring validation remains the next active effort.
## Session: Feb 15, 2026 — Reconciliation & Data Foundation

### Context
Began executing Codex prompt contracts for KBL Tracker reconciliation fixes and franchise/gametracker remediation. Prompt contracts were architected by Claude (claude.ai) based on:
- Reconciliation audit of 102 corrections from specs/KBL_Guide_v2_Spec_Reconciliation.json
- FRANCHISE_GAMETRACKER_PLAN.md (5-phase remediation)
- Billy Yank's Guide to Super Mega Baseball (3rd Edition) for park dimensions data

### Completed
- **R1 — Maddux Threshold Fix (IDs 6, 20)**
  - Replaced hardcoded pitchThreshold=100 in detectMaddux with Math.floor(inningsPerGame * 9.44)
  - Added calculateMadduxThreshold helper in src/hooks/useFameDetection.ts
  - Added DEFAULT_INNINGS_PER_GAME constant, made GameContext carry optional inningsPerGame
  - Plumbed inningsPerGame: 9 through end-game and mid-game fame contexts in GameTracker/index.tsx
  - Files changed: src/hooks/useFameDetection.ts, src/components/GameTracker/index.tsx

- **R0 — Build Baseline Cleanup (26 pre-existing errors → 0)**
  - Added src/archived-pages/** and src/archived-tests/** to tsconfig.app.json exclude (killed 16 errors)
  - Fixed stale import paths in src_figma: warOrchestrator.ts, useSeasonStats.ts, PostGameSummary.tsx, FranchiseHome.tsx
  - Created shim modules in src/src_figma/utils/ (gameStorage, seasonStorage, careerStorage, franchiseStorage) that re-export from root src/utils/*
  - Extended CompletedGameRecord with playerStats, pitcherGameStats, inningScores fields
  - Added getCompletedGameById helper to src/utils/gameStorage.ts
  - npm run build now passes with 0 errors

- **D1 — Park Dimensions Data Ingestion**
  - Added src/data/smb4-parks.json with all 23 SMB4 park dimensions (source: Billy Yank's Guide, 3rd Edition)
  - Created src/data/parkLookup.ts with TypeScript types (ParkDimensions, WallHeight) and utilities (getParkByName, getAllParks, getParkNames, getMinFenceDistance, LEAGUE_AVG_DIMENSIONS)
  - Added resolveJsonModule: true to tsconfig.app.json
  - Park count verified: 23

### Decisions Made
- Billy Yank's Guide (3rd Edition) is the canonical source for SMB4 park dimensions
- Park factors will be derived from real fence distances via heuristic formula (upcoming R2)
- HR distance validation will use actual fence distance per stadium per direction (upcoming B3)
- Shim modules chosen over mass-renaming of src_figma imports to minimize churn
- archived-pages/ and archived-tests/ excluded from build rather than deleted (preserves history)

### Known Issues (pre-existing, not introduced by this session)
- npm test fails on 4 archived test suites that still reference missing modules
- .worktrees/ copies have stale imports that don't match main tree
- These do NOT affect the main build or main-tree test suites

### Pending (next session)
- R2: Park factor clamping [0.70, 1.30] + derivation from real dimensions
- R3: All-Star break timing (0.5 → 0.6)
- R4: Undo stack cap (10 → 20)
- R-VERIFY: Mark all 102 reconciliation corrections resolved in JSON
- B1-B4: GameTracker bug fixes (exit modal, lineup modal, stadium association, special plays)
- W1-W3: Franchise ↔ GameTracker wiring verification
- T1: Core regression tests

## 2026-02-18 (Batch D)
- Ran Tier 1 Batch D: Farm, Trade, Salary, League Builder, Museum/HOF, Aging/Ratings, Career Stats
- Logged FINDING-072 through FINDING-079 to FINDINGS_056_onwards.md
- Updated SUBSYSTEM_MAP.md rows 13–19 with confirmed wiring verdicts
- Updated CURRENT_STATE.md — Tier 1 breadth survey now COMPLETE
- Key verdicts: Farm/Trade ORPHANED; League Builder WIRED; ratingsAdjustmentEngine ORPHANED; HOF test-only; Aging partially live via direct import bypass; Career storage wired
- salaryCalculator wiring UNVERIFIED (wrong path used in audit — lives at src/engines/ not src/utils/)
- Tier 1 complete. Next: Tier 2 wiring check OR Phase 1 synthesis. JK to decide.
## Session: 2026-02-18 — Phase 2 OOTP Pattern Audit (cont.) — Fan Morale, Stats Aggregation, Positional WAR, Trait System

### Accomplished
- FINDING-100 executed and marked FIXED: legacy field removal (InteractiveField, DragDropGameTracker archived, -200 lines from GameTracker.tsx). Commit: 3705a86.
- FINDING-101 logged: Fan Morale — BROKEN. `processGameResult` called instead of `recordGameResult` (silent no-op). Fix contract written in PROMPT_CONTRACTS.md. Bug B (hardcoded season/game numbers) and Bug C (localStorage instead of IndexedDB) also documented.
- Design clarification: Player Morale (OOTP-style 5-category system) vs Traits (SMB4 static player attributes) are fully independent systems. FEATURE_WISHLIST.md corrected to remove false trait/morale coupling.
- FINDING-102 logged: Stats Aggregation — PARTIAL. Steps 5+9 wired correctly. OOTP Steps 6 (standings), 7 (leaderboard), 8 (WAR), 10 (narrative), 11 (development) all absent from post-game pipeline.
- FINDING-103 logged: Positional WAR — N. All 5 calculators (bWAR/fWAR/pWAR/rWAR/mWAR, 3,287 lines) correct per OOTP formula. `warOrchestrator.calculateAndPersistSeasonWAR()` has zero callers in active app. Fix = one import + one call in processCompletedGame.ts.
- FINDING-104 logged (revised): Trait System — PARTIAL. Player storage wired (trait1/trait2 on master player record ✅). Player creation has trait fields but free-text not dropdown ⚠️. Awards ceremony UI assigns/revokes traits but does NOT write changes back to player record ❌. traitPools.ts (60+ traits) never imported anywhere ❌. Design clarified by JK: traits are NOT engine effects — they are persistent player identity attributes used in player creation, player generation, and awards ceremony rewards/penalties. No dynamic trigger layer needed.

### Commits This Session
- bc69ea3: FINDING-100 logged + prompt contract
- 3705a86: FINDING-100 marked FIXED
- 5323bcf: FINDING-101 logged + player morale design intent + fix contract
- badad5e: Player morale/traits design clarification
- 8ed21a9: FINDING-102 logged
- 45c650d: FINDING-103 logged
- b863121: FINDING-104 (initial — incorrect scope)
- de7b3c5: FINDING-104 revised — traits are persistent attributes not engine effects

### Design Decisions Locked This Session
- Traits are NOT engine effects. No potency calculator, no trigger layer needed.
- Traits: persistent player attributes (max 2), chosen via dropdown at player creation, assigned sparingly to generated/rookie players, granted/revoked at awards ceremony as rewards/penalties, may inform salary/grades.
- Player Morale = separate OOTP-style 5-category system (independent of traits/chemistry).
- FIERY + GRITTY chemistry types are KBL additions (SMB4 has only 5). Decision pending.

### Phase 2 Complete — All 5 Priority Subsystems Audited
| Finding | Subsystem | Verdict |
|---------|-----------|---------|
| 098 | Clutch Attribution | PARTIAL — design correct, pipeline disconnected |
| 099 | Leverage Index | N — dual-value violation |
| 101 | Fan Morale | BROKEN — method name mismatch, never fires |
| 102 | Stats Aggregation | PARTIAL — Steps 6/7/8/10/11 missing from pipeline |
| 103 | Positional WAR | N — 3,287 lines, zero callers |
| 104 | Trait System | PARTIAL — storage wired, ceremony persistence broken, catalog disconnected |

### Next Session Starts With
Phase 3: Fix prioritization and execution planning.
Candidate fixes (in rough priority order):
1. FINDING-101: Fan Morale — execute fix contract (method rename, 2 lines) — PROMPT_CONTRACTS.md
2. FINDING-103: Positional WAR — wire warOrchestrator into processCompletedGame.ts (1 import + 1 call)
3. FINDING-102 Step 6: Standings wiring — HIGH priority per audit
4. FINDING-099: LI dual-value — replace 6 getBaseOutLI calls with calculateLeverageIndex
5. FINDING-104: Trait system — (a) dropdown in player creation, (b) ceremony persistence to player record
6. FINDING-098: Clutch Attribution — wire trigger from at-bat outcome
Confirm with JK before beginning execution.

## Session: 2026-02-18 — Doc Reconciliation (session end)

### What Was Accomplished
- Read all 5 session docs + PATTERN_MAP + FINDINGS_056_onwards.md in full
- Identified discrepancy: CURRENT_STATE.md said 5 rows closed, actual count was 15
- Closed rows 14 (Farm) and 15 (Trade) using Batch D finding evidence (F-072, F-073) — both ORPHANED = N
- Updated PATTERN_MAP.md rows 14 and 15 "Follows Pattern" column
- Rewrote CURRENT_STATE.md to reflect actual state: 15 rows closed, 11 UNKNOWN

### No Code Changes This Session
Documentation reconciliation only.

### Actual Pattern Map State (post-reconciliation)
**Closed (15):** Rows 1, 2, 3, 4, 4b, 5, 6, 7, 11b, 12, 13, 14, 15, 20, 21
**Open (11):** Rows 8, 9, 10, 11, 16, 17, 18, 19, 22, 23, 24

### Next Session Starts With
Audit Phase 1 — close remaining 11 UNKNOWN rows, starting with Group B:
- Row 8: Playoffs (usePlayoffData WIRED — needs pattern conformance check)
- Row 9: Relationships (indirect wiring via useFranchiseData — needs pattern check)
- Row 10: Narrative/Headlines (game recap WIRED, headline ORPHANED — needs pattern check)
- Row 11: Mojo/Fitness (playerStateIntegration WIRED — needs pattern check)
- Rows 16, 17, 18, 19: Salary, League Builder, Museum/HOF, Aging/Ratings
- Rows 22, 23, 24: Player Dev Engine, Record Book, UI Pages

After Phase 1 complete → build full Phase 2 fix queue → begin fix execution.

## Session: 2026-02-18 — Doc Reconciliation #2

### What Was Accomplished
- Read all 5 session docs — discovered F-113 through F-118 already written to FINDINGS_056_onwards.md but never reflected in PATTERN_MAP.md, AUDIT_LOG.md, or CURRENT_STATE.md
- Updated PATTERN_MAP.md rows 8, 11, 16, 17, 18, 19 with correct verdicts + finding numbers
- Added AUDIT_LOG.md index entries for F-113 through F-118
- Rewrote CURRENT_STATE.md: 21 rows closed, 5 UNKNOWN remaining (rows 9, 10, 22, 23, 24)
- Added F-118 (aging write-back) to Phase 2 FIX-CODE queue
- Added F-113 (playoff stats gap), F-114 (mojo persistence), F-115 (salary design) to FIX-DECISION queue

### No Code Changes This Session
Documentation reconciliation only.

### Next Session Starts With
Phase 1 — audit the last 5 UNKNOWN rows: 9 (Relationships), 10 (Narrative/Headlines), 22 (Player Dev Engine), 23 (Record Book), 24 (UI Pages).
After all 5 closed → Phase 1 complete → build full Phase 2 fix queue → JK confirms → begin fix execution.

## Session: 2026-02-18 — Phase 1 Completion (audit rows 9, 10, 22, 23, 24)

### What Was Accomplished
- Audited the final 5 UNKNOWN rows: 9 (Relationships), 10 (Narrative/Headlines), 22 (Player Dev Engine), 23 (Record Book), 24 (UI Pages)
- Wrote FINDING-119 through FINDING-123 to FINDINGS_056_onwards.md
- Updated PATTERN_MAP.md rows 9, 10, 13 (missed from earlier), 22, 23, 24
- Added AUDIT_LOG.md index entries for F-119 through F-123
- Rewrote CURRENT_STATE.md: Phase 1 complete, 26/26 rows closed
- Compiled full Phase 2 fix queue: 11 FIX-CODE items + 11 FIX-DECISION items

### Key Findings This Session
- Row 9 (Relationships): Full system built, zero active callers, no persistence — ORPHANED
- Row 10 (Narrative/Headlines): Game recap wired; headlineEngine orphaned; story morale dead — PARTIAL
- Row 22 (Player Dev Engine): No 10-factor growth model exists at all — MISSING
- Row 23 (Record Book): oddityRecordTracker exists in legacy; zero callers — ORPHANED
- Row 24 (UI Pages): Legitimate writers correct by design; WorldSeries stats leaderboard always empty (no PLAYOFF_STATS write path) — PARTIAL

### Phase 1 Final Verdict Summary
Y=2 | PARTIAL=10 | N=14 (ORPHANED=4, MISSING=1, BROKEN=1)

### Next Session Starts With
Phase 2 kick-off. Present full fix queue to JK:
1. JK reviews FIX-DECISION items and makes calls on each
2. JK approves FIX-CODE execution order
3. Begin fix execution using Prompt Contract template, dependency order: spine first, downstream second

## Session: 2026-02-20 — OOTP Architecture Research Ingestion

### What Was Accomplished
- Read and synthesized the completed OOTP Architecture Research document (1,217 lines, 10 sections + 2 appendices)
- Document location: `spec-docs/OOTP_ARCHITECTURE_RESEARCH.md`
- Produced in session 2026-02-18 via exhaustive web research (OOTP manuals v13–24, StatsPlus wiki, OOTPDBTools, Lahman schema, Baseball Reference, FanGraphs, forum analysis)

### Key Architectural Findings (from OOTP research)

**Data Model (Section 1):**
- OOTP exports 68+ tables via .odb → CSV/MySQL
- Core entities: Player, Team, Franchise, Season (yearID), Game, PlayerSeasonStats, Contract, Transaction, Award, HOFEntry
- Career stats = SUM(PlayerSeasonStats) — no separate career table (Lahman/OOTP pattern)
- PlayerSeasonStats = one row per player per team per yearID

**Stat Pipeline (Section 2) — 12 steps:**
1. At-bat event → game state 2. Inning end → half-inning stats 3. Game complete → box score 4. Box score → PlayerSeasonStats accumulator 5. Recalculate rate stats 6. Update standings 7. Update leaderboards 8. Recalculate WAR 9. Check career totals + milestones 10. Trigger narratives 11. Player development check 12. Persist
- Steps 5+9 are wired in KBL; steps 6/7/8/10/11 are missing (confirms F-102)

**Player Lifecycle (Section 3):**
- Growth phase: < 25, 10-factor model (coaching, playing time, potential, challenge, injury, morale, focus sliders, devSpeedMod, workEthic, intelligence)
- Decline phase: ≥ 30, rating decay curves by position
- Development runs at season close
- Potential ratings also mutable (injury, chance events)

**Season Lifecycle (Section 4):**
- Phases: preseason → regular_season → postseason → offseason (discrete state machine)
- closeSeason(): lock stats → awards → HOF → retirements → age+develop → contracts → transactions → records
- openSeason(): validate rosters → init standings → init schedule → reset accumulators
- Confirms atomic season transitions needed

**Narrative Engine (Section 5):**
- 350+ storyline categories across 12 types (team performance, player performance, milestones, records, contracts, injuries, chemistry, transactions, draft, international, personal, HOF)
- Triggers: stat thresholds (3000 H, 500 HR, etc.), streak detection, record chases (>90% of record), calendar events, milestone proximity
- Storage: events table with type, playerId, yearId, triggeredAt, articleText
- Narrative is a side-effect consumer — reads pipeline output but never writes back

**HOF (Section 6):**
- Eligibility: 5+ years retired, 10+ years professional service
- Evaluation: career stat thresholds (HOF Score = weighted formula), committee override, narrative legacy score
- Induction: annual ballot, voting simulation
- Confirms Phase 2 F-117 (Museum/HOF PARTIAL) — eligibility engine correct, vote simulation missing

**Replayability Systems (Section 8):**
- Player personality: 6 traits at 1-200 (leadership, loyalty, desire_for_winner, greed, workEthic, intelligence) — drive morale, dev speed, contract behavior, narrative triggers
- Team chemistry: personality compatibility scoring per pair, clubhouse effect on development
- Confirms KBL trait design (persistent attributes, max 2) is correct for KBL's simpler SMB4-based model

### Decisions Informed by OOTP Research

**F-109 (Career Stats — derive-on-read vs incremental write):**
OOTP answer: derive-on-read (SUM across seasons). Recommendation: adopt same pattern.
→ **FIX-DECISION should resolve to: derive-on-read.** No separate career table needed. CareerStats = sumCareerStats(playerId) across all PlayerSeasonStats rows.

**F-121 (Player Dev Engine — define model):**
OOTP answer: 10-factor growth model < 25, decline ≥ 30. All factors documented in Section 10.5.
→ Use OOTP model as spec for KBL's player dev engine. TypeScript implementation contract in Section 10.5.

**F-103 (WAR wiring):**
OOTP answer: WAR is a derived field recalculated after every game, not a stored constant. Needs league context (lgFIP, average wOBA, RPW) that updates throughout season.
→ Confirms F-103 fix: wire warOrchestrator into stat pipeline post-game. The WAR calc itself is correct.

**Phase 2 Fix Priority Alignment with OOTP:**
OOTP Section 9.4 priority order matches KBL Phase 2 queue exactly:
1. Stat pipeline spine (F-102 steps 6/7/8, F-103 WAR wiring)
2. Season transition (F-112 clearSeasonalStats, F-113 playoff stats)
3. Development/aging (F-118 agingIntegration write-back, F-121 dev engine)
4. Reconnections (F-098 clutch, F-099 LI, F-104 traits, F-119 relationships, F-120 narrative)

### No Code Changes This Session
Research ingestion and documentation only.

### Next Session Starts With
Phase 2 kick-off — same as before. JK to confirm FIX-DECISION resolutions (using OOTP findings above as input) before fix execution begins. Recommended first FIX-DECISION decisions:
1. F-109: Career stats → resolve to derive-on-read (OOTP-confirmed)
2. F-113: Playoff stats → resolve to wire (WorldSeries leaderboard empty without it)
3. F-120: Narrative persistence → resolve to IndexedDB (ephemeral display is not franchise-grade)
Then execute FIX-CODE items in dependency order: F-103 (WAR spine) first, then F-102 steps 6+7+8.

---

## Session: 2026-02-20 — Spec Sync Verification & Completion

### Summary
Verified all 20 planned spec updates from the decision inventory session are present on disk. JK confirmed the full list.

### Verification Method
- Searched each updated spec for removed content (contraction, salary matching) — confirmed 0 hits
- Verified all 7 new spec files exist with correct content via `ls -la`
- Spot-checked minor updates (cross-references, changelog entries) via content search
- Confirmed OFFSEASON_SYSTEM_SPEC.md has zero contraction references (earlier compaction summary was stale)

### Confirmed Updates (20 total)

**MAJOR UPDATES (8):**
1. ✅ TRADE_SYSTEM_SPEC.md — removed salary matching, added Chemistry-tier trade value
2. ✅ OFFSEASON_SYSTEM_SPEC.md — removed contraction, restructured 11 phases, triple salary recalc, Phase 11 signing round
3. ✅ SALARY_SYSTEM_SPEC.md — removed contraction, added Chemistry-tier potency factor, triple recalc schedule
4. ✅ FAN_MORALE_SYSTEM_SPEC.md — simplified 60/20/10/10 formula, removed contraction risk, franchise health warning replaces it
5. ✅ FARM_SYSTEM_SPEC.md — unlimited farm during season, 3 options limit, call-up rating reveal
6. ✅ NARRATIVE_SYSTEM_SPEC.md — already had v1.2 corrections (mojo/fitness read-only, morale→probability)
7. ✅ EOS_RATINGS_ADJUSTMENT_SPEC.md — already had corrected Chemistry mechanics + trait assignment
8. ✅ FRANCHISE_MODE_SPEC.md — already had separated modes, dynamic schedule, fictional dates

**NEW SPECS CREATED (7):**
1. ✅ TRAIT_INTEGRATION_SPEC.md — corrected Chemistry mechanics, potency tiers, position-appropriate pools
2. ✅ SEPARATED_MODES_ARCHITECTURE.md — League Builder → Franchise Season → Offseason Workshop
3. ✅ SCOUTING_SYSTEM_SPEC.md — hidden ratings, scout accuracy by position, call-up reveal
4. ✅ PROSPECT_GENERATION_SPEC.md — grade distribution, trait ratios (~30/50/20), Chemistry distribution
5. ✅ ALMANAC_SPEC.md — top-level nav, cross-season queries, incremental build phases
6. ✅ PARK_FACTOR_SEED_SPEC.md — BillyYank 23 stadiums, 40% activation threshold
7. ✅ PERSONALITY_SYSTEM_SPEC.md — hybrid 7 visible + 4 hidden modifiers

**MINOR UPDATES (5):**
1. ✅ LEAGUE_BUILDER_SPEC.md — personality system reference
2. ✅ DRAFT_FIGMA_SPEC.md — grade distribution table, reveal ceremony reference
3. ✅ FREE_AGENCY_FIGMA_SPEC.md — updated cross-reference to PERSONALITY_SYSTEM_SPEC
4. ✅ AWARDS_CEREMONY_FIGMA_SPEC.md — already had trait wheel + eye test equal ranking
5. ✅ STADIUM_ANALYTICS_SPEC.md — BillyYank source reference, park factor activation

**Three critical corrections embedded throughout:**
- Phase 11 claim order by total salary
- Trait Chemistry mechanics (potency tiers, not binary)
- Salary matching removal (contract value matching via 10% rule instead)

### No Code Changes This Session
Spec updates and verification only.

### CURRENT_STATE.md Updated
Rewritten to reflect Spec Sync completion. Added "Spec Sync: COMPLETE" status line and full 20-item summary.

### Next Session Starts With
Phase 2 kick-off. JK to confirm FIX-DECISION resolutions (using OOTP findings as input), then execute FIX-CODE items in dependency order. Recommended first decisions:
1. F-109: Career stats → resolve to derive-on-read (OOTP-confirmed)
2. F-113: Playoff stats → resolve to wire (WorldSeries leaderboard empty without it)
3. F-120: Narrative persistence → resolve to IndexedDB (ephemeral display is not franchise-grade)
Then execute FIX-CODE items: F-103 (WAR spine) first, then F-102 steps 6+7+8.

---

## Session: 2026-02-21 — Spec-to-Fix-Queue Reconciliation

### Summary
Produced RECONCILIATION_PLAN.md mapping every Phase 2 fix queue item against the 20 updated specs from the spec sync session. Planning only — no code changes.

### Files Read
- SESSION_RULES.md, CURRENT_STATE.md, SESSION_LOG.md (last 2 entries), AUDIT_LOG.md
- Specs: NARRATIVE_SYSTEM_SPEC, ALMANAC_SPEC, SEPARATED_MODES_ARCHITECTURE, PERSONALITY_SYSTEM_SPEC, PARK_FACTOR_SEED_SPEC, PROSPECT_GENERATION_SPEC, EOS_RATINGS_ADJUSTMENT_SPEC, PLAYOFF_SYSTEM_SPEC, MOJO_FITNESS_SYSTEM_SPEC (sections), SALARY_SYSTEM_SPEC (formula), FAN_MORALE_SYSTEM_SPEC (storage search)

### Reconciliation Results

**UNCHANGED (7 FIX-CODE items):** F-098, F-099, F-101 Bug A, F-101 Bug B, F-102, F-103, F-104a, F-104b, F-110

**RE-SCOPED (2 FIX-CODE items):**
- F-112: clearSeasonalStats fix unchanged but must confirm call site is Offseason Phase 1 (not Spring Training)
- F-118: aging write-back must fire in Offseason Phase 1 (not SpringTrainingFlow — wrong phase per OFFSEASON_SYSTEM_SPEC 11-phase structure)

**RESOLVED FIX-DECISION items (2):**
- F-109: ALMANAC_SPEC §4.3 resolves to derive-on-read (pre-aggregated, no separate career table)
- F-115: SALARY_SYSTEM_SPEC confirms age-based salary is final design (no service time concept)

**RE-SCOPED FIX-DECISION items (3):**
- F-114: Not "re-enable auto-update" — MOJO_FITNESS_SYSTEM_SPEC requires full between-game persistence (fitness persists across games by definition, mojo has carryover); scope = IndexedDB persistence + Team Page editor (§7)
- F-121: PROSPECT_GENERATION_SPEC is about draft class seeding, not player development. F-121 dev engine gap remains; OOTP research provides 10-factor model; JK must approve
- F-122: ALMANAC_SPEC §3.2 defines Season Records as a distinct Almanac section (Phase 2 in build priority); both oddityRecordTracker and standard records in scope; JK must confirm both or split

**STILL PENDING FIX-DECISION items (6):** F-101 Bug C, F-107 (deferred), F-113, F-119, F-120 (2 sub-items)

### New Gaps Identified (8)
- GAP-001: Mode separation enforcement (SEPARATED_MODES_ARCHITECTURE.md)
- GAP-002: Park factor seeding + 40% activation (PARK_FACTOR_SEED_SPEC.md)
- GAP-003: Personality system population in player records (PERSONALITY_SYSTEM_SPEC.md)
- GAP-004: Mojo/fitness stat splits accumulation per PA (MOJO_FITNESS_SYSTEM_SPEC §6.2)
- GAP-005: Juiced fame scrutiny in fameEngine (MOJO_FITNESS_SYSTEM_SPEC)
- GAP-006: Between-game mojo/fitness persistence (expanded F-114 scope)
- GAP-007: Prospect/draft class generation engine (PROSPECT_GENERATION_SPEC §3)
- GAP-008: Narrative memory storage layer (NARRATIVE_SYSTEM_SPEC §4.3 NarrativeMemory)

### Output
- RECONCILIATION_PLAN.md written to spec-docs/ (225 lines)

### Next Session Starts With
JK reviews RECONCILIATION_PLAN.md and answers the 10 questions in Section 6. After decisions:
1. Confirm F-109 and F-115 resolutions (recommend YES to both)
2. Decide F-114 scope (bare persistence vs full §7 editor)
3. Decide F-113 (wire playoff stats now or defer)
4. Execute Phase 2A FIX-CODE items: F-103 → F-102 → F-099 (in that order)

## Session: 2026-02-21 — Full Spec Review + Reconciliation Plan Integration

### Purpose
Complete the reconciliation by reading all specs modified today (2026-02-20) that were not covered in the prior session. Integrate findings into RECONCILIATION_PLAN.md.

### Specs Read This Session (Previously Unread)
1. HANDOFF_RECONCILIATION.md — confirmed this is the task brief, not additional spec content
2. SEPARATED_MODES_ARCHITECTURE.md — GAP-001 confirmed in full detail; §5.2 specifies transitionMode() must persist to IndexedDB before mode switch
3. FRANCHISE_MODE_SPEC.md — explicitly PLANNING/deferred; §7.1 defines Default Franchise migration path; confirms F-107 safe as latent debt
4. LEAGUE_BUILDER_SPEC.md — confirmed personality and trait assignment at import; **SPEC CONFLICTS identified** (see below)
5. AWARDS_CEREMONY_FIGMA_SPEC.md — **F-104b re-scoped**: trait write-back is event-driven per ceremony screen, not batch
6. DRAFT_FIGMA_SPEC.md — Farm-First draft model; confirms GAP-007; introduces Potential Ceiling attribute on FarmPlayer
7. FREE_AGENCY_FIGMA_SPEC.md — UI spec only; no new gaps
8. STADIUM_ANALYTICS_SPEC.md — **GAP-002 corrected**: 3-tier blend ratios (LOW=70%seed, MEDIUM=30%seed, HIGH=0%seed), not flat 70/30
9. TRADE_SYSTEM_SPEC.md — future-phase spec; no new gaps or fix items
10. SMB4_PARK_DIMENSIONS.md — reference data (23 stadiums); confirms GAP-002 data source
11. OFFSEASON_SYSTEM_SPEC.md (sections) — **F-112 correction**: clearSeasonalStats fires in Phase 11 §13.8 (Season Archival), NOT Phase 1
12. SCOUTING_SYSTEM_SPEC.md — pre-call-up scouting accuracy; no new gaps (relates to F-121 context)
13. TRAIT_INTEGRATION_SPEC.md (full) — confirmed Chemistry potency tiers; SPEC CONFLICT with LEAGUE_BUILDER_SPEC
14. FEATURE_WISHLIST.md — confirmed in-season player dev deferred; F-121 gap still open

### Key Corrections Made to RECONCILIATION_PLAN.md

1. **F-112**: Corrected call site from "Phase 1" to "Phase 11 §13.8 Season Archival"
2. **F-104b**: Re-scoped from batch write-back to per-step event-driven write-back gated by UI confirmation
3. **F-107**: Changed rationale — FRANCHISE_MODE_SPEC explicitly PLANNING/deferred with §7.1 migration path
4. **GAP-002**: Corrected blend ratio description to 3-tier system
5. **GAP-007**: Added Potential Ceiling attribute requirement from DRAFT_FIGMA_SPEC

### Spec Conflicts Identified (New — Require JK Resolution)

**CONFLICT-001 (Chemistry Types):**
- LEAGUE_BUILDER_SPEC §5.3 lists 5 types: Competitive, Spirited, Crafty, Scholarly, Disciplined
- TRAIT_INTEGRATION_SPEC §2.2 TRAIT_CHEMISTRY_MAP lists 4 types: Spirited, Crafty, Tough, Flashy
- Incompatible. Implementation blocked until resolved.

**CONFLICT-002 (Personality Types):**
- LEAGUE_BUILDER_SPEC §5.3 lists 11 Personality type values
- PERSONALITY_SYSTEM_SPEC defines 7 visible types
- LEAGUE_BUILDER_SPEC v1.1 cross-references PERSONALITY_SYSTEM_SPEC but contradicts it
- Resolution needed before League Builder personality assignment code is written

### RECONCILIATION_PLAN.md Status
- All sections updated
- 12 questions for JK (was 10; added CONFLICT-001 and CONFLICT-002 resolutions)
- Section 6a (SPEC CONFLICTS) added
- F-104b route changed to Codex | 5.3 | high
- F-107 rationale updated

### Next Action
Await JK confirmation on 12 questions in RECONCILIATION_PLAN.md §6/6a before Phase 2 execution begins. Phase 2A (F-103, F-102, F-099) can begin immediately after JK confirms — these are all UNCHANGED FIX-CODE items not blocked by any decision or conflict.


---

## Session: Figma Spec Alignment Audit — 2026-02-21

**Task:** Complete Part 2 of HANDOFF_RECONCILIATION.md — reconcile all 13 Figma specs against updated system specs.

**Method:** Read each Figma spec file directly; cross-referenced against corresponding system spec. No assertions from prior session summaries.

### Results

**OBSOLETE (1):**
- CONTRACTION_EXPANSION_FIGMA_SPEC.md — entire 977-line file describes removed contraction feature. Action: archive.

**STALE (6):**
- LEAGUE_BUILDER_FIGMA_SPEC.md — missing LB-F016 Mode Transition screen required by SEPARATED_MODES_ARCHITECTURE §5.1 (HIGH priority)
- SEASON_SETUP_FIGMA_SPEC.md — missing transitionMode() persistence gate on SS-F007; no mode-separation framing (HIGH priority)
- EOS_RATINGS_FIGMA_SPEC.md — wrong phase label (says Phase 3, should be Phase 1); no trait performance modifier in Manager Distribution screen (MEDIUM)
- SEASON_END_FIGMA_SPEC.md — Phase 1 checklist screen missing ratings adjustments and aging (MEDIUM)
- FINALIZE_ADVANCE_FIGMA_SPEC.md — missing signing round screen between Season Transition and Advance Confirmation (LOW)
- SCHEDULE_SYSTEM_FIGMA_SPEC.md — uses real-year dates throughout ("2024", "JULY 12"); must use fictional Year N / Day N format (LOW)

**ALIGNED (6):**
- TRADE_FIGMA_SPEC.md — salary informational only, no matching; consistent with TRADE_SYSTEM_SPEC
- RETIREMENT_FIGMA_SPEC.md — Phase 5 correct per OFFSEASON_SYSTEM_SPEC
- PLAYOFFS_FIGMA_SPEC.md — Phase 1 handoff correct; no playoff stats write-back shown (consistent with F-113 pending)
- DRAFT_FIGMA_SPEC.md — Potential Ceiling field + Farm-First model present (sync-updated)
- FREE_AGENCY_FIGMA_SPEC.md — personality-driven destination present (sync-updated)
- AWARDS_CEREMONY_FIGMA_SPEC.md — already confirmed aligned; 13-screen flow with per-step trait gates

**New Gaps Added:**
- GAP-009: Mode Transition UI (League Builder exit → Franchise Season entry) — no LB-F016 screen exists anywhere
- GAP-010: Fictional date system in Schedule UI — cosmetic but needs Figma + data model audit

### Files Modified
- RECONCILIATION_PLAN.md — Part 2 (Figma Spec Alignment Audit) added in full: alignment table, disposition summary, severity ranking, new gaps

### Next Action
RECONCILIATION_PLAN.md is now complete (Part 1 + Part 2). Ready for JK to answer the 12 questions in §6/6a before Phase 2 execution begins.


---

## SESSION: 2026-02-21 — Third-Pass Reconciliation + JK Decisions

### Work Completed

**Third-pass spec verification** — read actual spec content section-by-section (not grep). Produced SPEC_RECONCILIATION_FINDINGS.md with:
- 22 items confirmed/cleared
- 3 new conflicts (CONFLICT-003, 004, 005)
- 7 open questions carried forward (Q-001 through Q-007)
- 5 watch-list items (not blocking, but notable)

**JK answered all 10 decisions.** Full decision log:

| Decision | Resolution |
|----------|------------|
| CONFLICT-003: Chemistry types | Real SMB4 names: Competitive, Crafty, Disciplined, Spirited, Scholarly (5 types). TRAIT_INTEGRATION_SPEC, PROSPECT_GENERATION_SPEC, SALARY_SYSTEM_SPEC all need correction. |
| CONFLICT-004: FA exchange rule | ±20% True Value match, no position restriction. Neither spec had it right (Figma said ±10%, Offseason said grade-based). Both need correction. |
| CONFLICT-005: Draft grade range vs farm schema | All grades possible on farm (A through D). Bell curve per PROSPECT_GENERATION_SPEC — B, B-, C+ at 15% each. FARM_SYSTEM_SPEC overallRating field must be expanded to full range. |
| Q-001: Rookie salary | Set at draft by round/position. Salary locked until EOS recalculation after rookie season ends. Ratings, traits, and grade all hidden while on farm. Revealed at call-up — salary does NOT change at call-up. |
| Q-002: Standings tiebreaker | Run differential. If still tied, user selects who advances (manual user decision prompt). |
| Q-003: Farm population at startup | League Builder includes a prospect draft step to populate farms before Season 1 begins. |
| Q-004: Stadium change mechanic | V1 scope. Needs new section in OFFSEASON_SYSTEM_SPEC (Phase 4 sub-step). |
| Q-005: Scout grade deviation | Fat-tail distribution. Keep max-deviation-by-position structure (position accuracy sets center), replace uniform probability with fat-tail — small misses most common, rare large outliers possible beyond current hard cap. |
| Q-006: Team captain | V1 scope. Formal designation driven by Charisma hidden modifier. Needs spec in DYNAMIC_DESIGNATIONS_SPEC or PERSONALITY_SYSTEM_SPEC. |
| Q-007: Beat reporter pre-decision warning | V1 scope. Blocking modal before call-up/send-down executes. Conditional on relevant relationship/narrative data. Needs UI flow spec. |

### Files Created This Session
- SPEC_RECONCILIATION_FINDINGS.md — full third-pass findings with all conflicts, open questions, and watch-list items

### Next Action
Write all spec updates from the 10 decisions. Specs requiring changes:
1. TRAIT_INTEGRATION_SPEC — chemistry type names (5 real SMB4 types), TRAIT_CHEMISTRY_MAP expansion to cover all SMB4 traits
2. PROSPECT_GENERATION_SPEC — chemistry type names
3. SALARY_SYSTEM_SPEC — chemistry type names; draft-round-based rookie salary table (replace rating-at-callup model)
4. FARM_SYSTEM_SPEC — overallRating schema expanded to full A–D range; rookie salary note (set at draft, locked until post-rookie EOS)
5. FREE_AGENCY_FIGMA_SPEC — FA exchange rule corrected to ±20% True Value, no position restriction
6. OFFSEASON_SYSTEM_SPEC — FA exchange rule corrected; stadium change Phase 4 sub-step added; run differential tiebreaker + user-select prompt added; team captain designation added
7. SCOUTING_SYSTEM_SPEC — grade deviation replaced with fat-tail model
8. LEAGUE_BUILDER_SPEC — prospect draft step added as new section
9. DYNAMIC_DESIGNATIONS_SPEC — team captain designation specced
10. New UI flow spec needed for beat reporter pre-decision warning modal
