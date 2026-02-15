# Codex Prompt Contracts — All Batches

> **Execution order:** Reconciliation (R1–R4, R-VERIFY) → Bug Fixes (B1–B4) → Wiring (W1–W3) → Tests (T1)
> **All work on main branch. No worktrees.**

---

## R1: Maddux Threshold Fix

```
You are the Fame System Fixer.

GOAL:
Replace the hardcoded Maddux pitch threshold (100) with the spec formula: Math.floor(inningsPerGame * 9.44).

CONSTRAINTS:
- Source of truth: specs/KBL_Guide_v2_Spec_Reconciliation.json (IDs 6, 20) + PROJECT_BIBLE.md
- Quote correction IDs 6 and 20 and their spec_correct value for every change
- Primary file: src/hooks/useFameDetection.ts (detectMaddux function, ~line 955-978)
- If inningsPerGame is not in scope, trace where detectMaddux is called and pass it through
- Work directly on main branch (no new worktrees)
- Use Mini model for speed

FORMAT:
1. Files changed
2. Corrections applied (list by ID, quote spec_correct)
3. Verification (npm run build + npm test results)
4. "Maddux threshold fix complete"

FAILURE:
- If detectMaddux doesn't exist at the expected location → stop and report actual location
- If inningsPerGame is unavailable anywhere in the call chain → stop and ask how to source it
- If anything is ambiguous → quote the exact section and ask for clarification
- Never summarize or batch changes

Use High reasoning effort. Think step-by-step.
```

---

## R2: Park Factor Clamping

```
You are the WAR Calculator Fixer.

GOAL:
Add clamping of park factor values to [0.70, 1.30] before use in bWAR and pWAR calculations.

CONSTRAINTS:
- Source of truth: specs/KBL_Guide_v2_Spec_Reconciliation.json (IDs 83, 114) + PROJECT_BIBLE.md
- Quote correction IDs 83 and 114 and their spec_correct value for every change
- Files: src/engines/bwarCalculator.ts (~lines 104-167) and src/engines/pwarCalculator.ts (~lines 517-548)
- Clamp formula: Math.max(0.70, Math.min(1.30, value))
- Apply clamp at every point where a park factor value is READ for calculation, not where it's stored
- Search entire codebase for other files that consume park factors — clamp those too
- ParkFactors interface has 8 numeric fields (src/types/war.ts:588-598) — all 8 must be clamped on use
- Work directly on main branch (no new worktrees)
- Use Mini model for speed

FORMAT:
1. Files changed
2. Corrections applied (list by ID, quote spec_correct)
3. Verification (npm run build + npm test results)
4. "Park factor clamping complete"

FAILURE:
- If park factor usage exists in files other than bwarCalculator/pwarCalculator → list them and fix those too
- If the ParkFactors interface doesn't have 8 numeric fields → stop and report actual structure
- If anything is ambiguous → quote the exact section and ask for clarification
- Never summarize or batch changes

Use High reasoning effort. Think step-by-step.
```

---

## R3: All-Star Break Timing

```
You are the Calendar Engine Fixer.

GOAL:
Change All-Star Break trigger from 50% to 60% of season completion.

CONSTRAINTS:
- Source of truth: specs/KBL_Guide_v2_Spec_Reconciliation.json (ID 42) + PROJECT_BIBLE.md
- Quote correction ID 42 and its spec_correct value
- File: src/engines/calendarEngine.ts (~lines 97-115)
- Change: Math.round(totalGames * 0.5) → Math.round(totalGames * 0.6)
- Do NOT touch the trade deadline (0.65) — verify it's still 0.65 after your change
- Work directly on main branch (no new worktrees)
- Use Mini model for speed

FORMAT:
1. Files changed
2. Corrections applied (list by ID, quote spec_correct)
3. Verification (npm run build + npm test results; confirm trade deadline unchanged)
4. "All-Star break timing fix complete"

FAILURE:
- If the 0.5 value isn't at the expected location → stop and report actual location
- If there are multiple All-Star trigger points → list all of them and fix each
- Never summarize or batch changes

Use High reasoning effort. Think step-by-step.
```

---

## R4: Undo Stack Cap

```
You are the GameTracker Input Fixer.

GOAL:
Change undo stack cap from 10 to 20.

CONSTRAINTS:
- Source of truth: specs/KBL_Guide_v2_Spec_Reconciliation.json (ID 5) + PROJECT_BIBLE.md
- Quote correction ID 5 and its spec_correct value
- File: src/components/GameTracker/index.tsx (~lines 800-832)
- Change: setUndoStack(prev => [...prev.slice(-9), state]) → slice(-19)
- If there is a MAX_UNDO_STACK constant anywhere, update that too
- Search for any comments referencing "10" as the undo limit and update them to "20"
- Work directly on main branch (no new worktrees)
- Use Mini model for speed

FORMAT:
1. Files changed
2. Corrections applied (list by ID, quote spec_correct)
3. Verification (npm run build + npm test results)
4. "Undo stack cap fix complete"

FAILURE:
- If slice(-9) isn't at the expected location → stop and report actual location
- If undo logic lives in a separate hook file instead of index.tsx → report and fix there
- Never summarize or batch changes

Use High reasoning effort. Think step-by-step.
```

---

## R-VERIFY: Reconciliation Closeout

```
You are the Reconciliation Auditor.

GOAL:
Mark all 102 corrections in the reconciliation JSON as resolved and verify the build.

CONSTRAINTS:
- Source of truth: specs/KBL_Guide_v2_Spec_Reconciliation.json
- Work directly on main branch (no new worktrees)

STEPS:
1. Run npm run build — report PASS or FAIL
2. Run npm test — report PASS or FAIL
3. Open specs/KBL_Guide_v2_Spec_Reconciliation.json
4. For IDs 5, 6, 20, 42, 83, 114 — add: "status": "FIXED", "fixed_date": "[today]"
5. For ALL other IDs — add: "status": "GUIDE_ONLY", "audit_date": "[today]"
6. Commit the updated JSON

FORMAT:
1. Build status: PASS/FAIL
2. Test status: PASS/FAIL
3. IDs marked FIXED (list)
4. IDs marked GUIDE_ONLY (count)
5. "Reconciliation closeout complete"

FAILURE:
- If build fails → stop, report the error, do not update the JSON
- If the JSON structure doesn't support adding new fields → report the structure and ask

Commit message: "docs: mark all 102 reconciliation corrections as resolved"
Use High reasoning effort. Think step-by-step.
```

---

## B1: Exit Modal Double Entry (BUG-006)

```
You are the GameTracker UX Fixer.

GOAL:
Fix BUG-006: exit type selection requires two clicks instead of one. Make it a single-click flow.

CONSTRAINTS:
- Source of truth: specs/GAMETRACKER_BUGS.md (BUG-006) + PROJECT_BIBLE.md
- Primary file: src/components/GameTracker/AtBatFlow.tsx
- The result button (e.g., "1B") should open the exit type modal directly
- Selecting an exit type inside the modal should resolve and close it — no intermediate confirm step
- Do NOT change what exit types are available or their values
- Do NOT change how at-bat results are stored
- Do NOT touch any other modal in GameTracker
- Work directly on main branch (no new worktrees)

FORMAT:
1. Files changed
2. Root cause (what caused the double-click)
3. Fix applied (what you changed)
4. Verification (npm run build + npm test results)
5. "BUG-006 fix complete"

FAILURE:
- If you cannot identify why two clicks are required → stop, describe the flow you see, and ask
- If the modal is in a different file than AtBatFlow.tsx → report actual location
- Never summarize or batch changes

Commit message: "fix(gametracker): single-click exit type flow (BUG-006)"
Use High reasoning effort. Think step-by-step.
```

---

## B2: Lineup Access Modal (BUG-009)

```
You are the GameTracker Feature Builder.

GOAL:
Fix BUG-009: add a read-only lineup modal to GameTracker showing both teams with mojo/fitness indicators.

CONSTRAINTS:
- Source of truth: specs/GAMETRACKER_BUGS.md (BUG-009) + PROJECT_BIBLE.md (Player states, pages >1050) + specs/KBL_TRACKER_UI_UX_PLANNING.md
- Add a "Lineup" button to the GameTracker header in src/components/GameTracker/index.tsx
- Create a new LineupModal component (or add to an existing modal file)
- Display: name, position, batting order, mojo state, fitness state for both teams
- Pull data from existing usePlayerState or useGameState — do NOT create new data fetching
- Modal is READ-ONLY — no editing, no substitutions
- Work directly on main branch (no new worktrees)

FORMAT:
1. Files changed (new + modified)
2. Data source used (which hook/state provides the roster data)
3. Verification (npm run build + npm test results)
4. "BUG-009 fix complete"

FAILURE:
- If mojo/fitness data is not available in game state → stop and report what IS available
- If usePlayerState doesn't exist → report what hooks provide player data
- Never summarize or batch changes

Commit message: "feat(gametracker): lineup modal with mojo/fitness display (BUG-009)"
Use High reasoning effort. Think step-by-step.
```

---

## B3: Stadium Association (BUG-012)

```
You are the GameTracker Context Builder.

GOAL:
Fix BUG-012: add stadium association to GameTracker games so stadiumName flows through initialization, gameplay, and persistence.

CONSTRAINTS:
- Source of truth: specs/GAMETRACKER_BUGS.md (BUG-012) + specs/GAMETRACKER_DRAGDROP_SPEC.md + specs/FRANCHISE_MODE_SPEC.md
- Files to modify: src/components/GameTracker/index.tsx, src/hooks/useGameState.ts, and wherever buildGameTrackerRoster is defined
- If launching from FranchiseHome: stadiumName should come from navigation state (home team's stadium)
- If launching standalone: default to "Unknown"
- processCompletedGame must include stadiumName in the persisted game record
- Do NOT build a stadium editor, stadium creation UI, or field diagram
- Do NOT change park factor calculation logic
- Work directly on main branch (no new worktrees)

FORMAT:
1. Files changed
2. Data flow: where stadiumName enters → where it's stored in state → where it's persisted
3. Verification (npm run build + npm test results)
4. "BUG-012 fix complete"

FAILURE:
- If buildGameTrackerRoster doesn't exist → stop and report how rosters are currently built
- If processCompletedGame doesn't exist → report what function handles game completion
- If navigation state isn't used for GameTracker launch → report how games are currently initialized
- Never summarize or batch changes

Commit message: "feat(gametracker): stadium association on init and persist (BUG-012)"
Use High reasoning effort. Think step-by-step.
```

---

## B4: Special Plays Logging (BUG-014)

```
You are the GameTracker Event Logger.

GOAL:
Fix BUG-014: wire special plays (Diving Catch, Robbery Attempt, etc.) to the activity log, fame detection, and fielding event persistence.

CONSTRAINTS:
- Source of truth: specs/GAMETRACKER_BUGS.md (BUG-014) + specs/GAMETRACKER_DRAGDROP_SPEC.md + specs/STAT_TRACKING_ARCHITECTURE_SPEC.md
- Files: src/components/GameTracker/index.tsx (runPlayDetections, logFieldingEvent), src/components/GameTracker/AtBatFlow.tsx, src/hooks/useFameDetection.ts, src/types/game.ts (FameEventType)
- When a special play is selected: pass it through runPlayDetections → logFieldingEvent
- logFieldingEvent must: (a) add activity log entry, (b) check FameEventType mapping, (c) trigger fame hook if applicable
- Persist special_play_type in fielding event data for fWAR
- Do NOT add new special play types — only wire existing ones
- Do NOT change fame point values
- Work directly on main branch (no new worktrees)

FORMAT:
1. Files changed
2. Data flow: where special play is selected → how it reaches logFieldingEvent → what gets persisted
3. FameEventType coverage: list any special play types that DON'T have a corresponding FameEventType (add them if missing)
4. Verification (npm run build + npm test results)
5. "BUG-014 fix complete"

FAILURE:
- If runPlayDetections doesn't exist → report what function handles play detection
- If logFieldingEvent doesn't exist → report how fielding events are currently logged
- If FameEventType union is missing → report what's in src/types/game.ts
- Never summarize or batch changes

Commit message: "fix(gametracker): wire special plays to activity log and fame (BUG-014)"
Use High reasoning effort. Think step-by-step.
```

---

## W1: Launch Wiring Verification

```
You are the Franchise Wiring Auditor.

GOAL:
Verify and fix the data flow from FranchiseHome → GameTracker launch. Every required parameter must be passed.

CONSTRAINTS:
- Source of truth: FRANCHISE_GAMETRACKER_WIRING_MATRIX.md (Launch checklist) + PROJECT_BIBLE.md + specs/FRANCHISE_MODE_SPEC.md
- Check FranchiseHome.tsx navigation state for: leagueId, franchiseId, scheduleGameId, stadiumName, seasonNumber
- Check buildGameTrackerRoster receives franchiseId + leagueId and returns both teams' rosters with mojo/fitness
- Check GameStateHook.initializeGame stores stadiumName and seasonNumber from navigation state
- Work directly on main branch (no new worktrees)

FORMAT:
1. Checklist results:
   | Parameter | Present? | File:Line | Fix Applied? |
2. Files changed (if any)
3. Verification (npm run build + npm test results)
4. "Launch wiring verification complete"

FAILURE:
- If FranchiseHome doesn't navigate to GameTracker → stop, report how games are launched
- If buildGameTrackerRoster doesn't exist → report actual roster-building function
- Never summarize or batch changes

Commit message: "fix(franchise): complete launch wiring FranchiseHome → GameTracker"
Use High reasoning effort. Think step-by-step.
```

---

## W2: Exit Wiring Verification

```
You are the Franchise Wiring Auditor.

GOAL:
Verify and fix the data flow from GameTracker game completion → all persistence layers.

CONSTRAINTS:
- Source of truth: FRANCHISE_GAMETRACKER_WIRING_MATRIX.md (Exit checklist) + PROJECT_BIBLE.md + specs/CURRENT_STATE.md
- Check hookEndGame calls: processCompletedGame, seasonStorage, careerStorage, logFieldingEvent, scheduleStorage.markCompleted
- Check processCompletedGame payload includes: stadiumName, seasonNumber, fameEvents, complete box score
- Check fameEvents and activityLog persist beyond in-memory (written to IndexedDB or equivalent)
- Check scheduleStorage marks game complete with score
- Work directly on main branch (no new worktrees)

FORMAT:
1. Checklist results:
   | Call/Check | Present? | File:Line | Fix Applied? |
2. Files changed (if any)
3. Verification (npm run build + npm test results)
4. "Exit wiring verification complete"

FAILURE:
- If hookEndGame doesn't exist → report what function handles game completion
- If processCompletedGame doesn't exist → report actual persistence function
- Never summarize or batch changes

Commit message: "fix(franchise): complete exit wiring GameTracker → persistence"
Use High reasoning effort. Think step-by-step.
```

---

## W3: Return Wiring Verification

```
You are the Franchise Wiring Auditor.

GOAL:
Verify and fix that returning to FranchiseHome after a game shows updated data without manual reload.

CONSTRAINTS:
- Source of truth: FRANCHISE_GAMETRACKER_WIRING_MATRIX.md (Post-game checklist) + PROJECT_BIBLE.md + specs/FRANCHISE_MODE_SPEC.md
- Check PostGameSummary.tsx navigates back to /franchise/:franchiseId
- Check useFranchiseData, useScheduleData, usePlayoffData invalidate/refresh after processCompletedGame
- After return: standings, schedule, team stats, and "next game" must reflect the completed game
- Work directly on main branch (no new worktrees)

FORMAT:
1. Checklist results:
   | Check | Present? | File:Line | Fix Applied? |
2. Files changed (if any)
3. Verification (npm run build + npm test results)
4. "Return wiring verification complete"

FAILURE:
- If PostGameSummary doesn't exist → report what screen shows after game completion
- If there's no query invalidation mechanism → report how data refresh currently works
- Never summarize or batch changes

Commit message: "fix(franchise): refresh FranchiseHome data after game completion"
Use High reasoning effort. Think step-by-step.
```

---

## T1: Core Regression Tests

```
You are the Test Writer.

GOAL:
Create targeted Vitest tests for the Phase 1 bug fixes and undo stack cap.

CONSTRAINTS:
- Source of truth: specs/GAMETRACKER_BUGS.md + FRANCHISE_GAMETRACKER_TEST_PLAN.md
- Use Vitest + fake-indexeddb
- Create these files:
  1. src/src_figma/__tests__/GameTracker/exitFlow.test.ts (BUG-006: single modal, single click)
  2. src/src_figma/__tests__/GameTracker/stadiumContext.test.ts (BUG-012: stadiumName flows through init → persist)
  3. src/src_figma/__tests__/GameTracker/specialEvents.test.ts (BUG-014: logFieldingEvent called, activity log + fame triggered)
  4. src/src_figma/__tests__/GameTracker/undoSystem.test.ts (ID 5: push 21, assert cap at 20)
- Tag all tests with @franchise-game-tracker
- Do NOT modify production code — tests only
- If a test reveals a new bug, document it in the test file as a comment but do NOT fix it
- Work directly on main branch (no new worktrees)

FORMAT:
1. Files created (list)
2. Test results (npx vitest run --reporter=verbose output)
3. Any new bugs discovered (list with file:line if applicable)
4. "Core regression tests complete"

FAILURE:
- If fake-indexeddb is not installed → run npm install --save-dev fake-indexeddb first
- If test utilities don't exist → report what test infrastructure is available
- If a test fails because of a production bug (not a test bug) → note it and move on
- Never summarize or batch changes

Commit message: "test(gametracker): core regression tests for Phase 1 fixes"
Use High reasoning effort. Think step-by-step.
```

---

## Execution Sequence

```
R1  → R2  → R3  → R4  → R-VERIFY
B1  → B2  → B3  → B4
W1  → W2  → W3
T1

R-series: run first (reconciliation fixes)
B-series: run after R-VERIFY passes
W-series: run after B-series complete
T1: run last (validates everything)

B1-B4 are independent — can run in any order.
W1-W3 are sequential — each depends on the previous.
```

---

## Deferred (Not In These Prompts)

- Phase 4: Franchise-scoped IndexedDB isolation (architectural, not blocking)
- Phase 5: Full test suite + journey tests (T1 covers critical regressions)
- PostGameSummary gaps (errors hardcoded to 0, no batting box score)
- Inning summary (not built, new feature)
- Mojo/Fitness scoreboard display (BUG-009 modal partially addresses this)
