# KBL TRACKER — AUDIT LOG
# Created: 2026-02-17 | Format: append-only, never delete entries
# Read this file at the start of every session to know exactly where we are.

---

## HOW TO READ THIS FILE

- Findings are numbered sequentially: FINDING-001, FINDING-002, etc.
- Status meanings:
  - **CONFIRMED** — verified by real test or browser check
  - **CONTRADICTED** — code does NOT match what spec/handoff claims
  - **UNVERIFIED** — not yet tested; do not treat as working
- Never change a past finding's status. Add a new FINDING that supersedes it.

---

## Current Phase: 0 — COMPLETE → Moving to Phase 1

Phase 0 inventory complete. Critical architectural finding: Gemini's refactor
landed on the wrong file. Active app is untouched by all claimed improvements.
Next action: Phase 1 — read active GameTracker.tsx and useGameState.ts in full.

---

## PHASE STATUS TRACKER

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| 0 | Inventory | COMPLETE | 2026-02-17 | 2026-02-17 |
| 1 | Architecture Map | IN PROGRESS | 2026-02-17 | — |
| 2 | Seams Audit | NOT STARTED | — | — |
| 3 | Known Bug Verification | NOT STARTED | — | — |
| 4 | Debt Inventory | NOT STARTED | — | — |

---

## FINDINGS

---

### FINDING-001
**Date:** 2026-02-17
**Phase:** 0
**File:** `src/App.tsx` lines 14, 55
**Claim:** Gemini handoff implies reducer-based GameTracker is the active system
**Evidence:**
- Line 14: `import { GameTracker } from './src_figma/app/pages/GameTracker';`
- Line 55: `<Route path="/game-tracker/:gameId" element={<GameTracker />} />`
**Status:** CONFIRMED
**Verification method:** grep on src/App.tsx, verified by JK
**Verified by:** Claude + JK

---

### FINDING-002
**Date:** 2026-02-17
**Phase:** 0
**File:** `src/components/GameTracker/index.tsx` vs `src/src_figma/app/pages/GameTracker.tsx`
**Claim:** Gemini handoff states reducer migration, rehydration gate, and useGamePersistence are "accomplished"
**Evidence:**
- `index.tsx` (2,985 lines): has useReducer at line 634, imports useGamePersistence — INACTIVE file
- `GameTracker.tsx` (src_figma): imports useGameState at line 210, no reducer — ACTIVE file
**Status:** CONTRADICTED
**Verification method:** grep for useReducer and useGameState; App.tsx routing confirmed
**Verified by:** Claude + JK
**Impact:** ALL claimed refactor work exists only in a file the app does not use. Active app is unreformed.

---

### FINDING-003
**Date:** 2026-02-17
**Phase:** 0
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** useGameState.ts was deprecated/replaced by the reducer
**Evidence:** 4,647 lines. Actively imported by live GameTracker.tsx at line 210. Not deprecated. Not replaced.
**Status:** CONFIRMED
**Verification method:** wc -l output + grep for useGameState in active GameTracker
**Verified by:** Claude + JK
**Impact:** The 4,647-line monolith IS the current state management system. All persistence bugs originate here.

---

### FINDING-004
**Date:** 2026-02-17
**Phase:** 0
**File:** `src/hooks/useGamePersistence.ts`
**Claim:** useGamePersistence is the new persistence system replacing the old debounce approach
**Evidence:** Only imported by `src/components/GameTracker/index.tsx` (inactive). Active GameTracker has no import of useGamePersistence.
**Status:** CONTRADICTED
**Verification method:** grep for useGamePersistence across all files
**Verified by:** Claude + JK
**Impact:** All persistence hardening (rehydration gate, hook-local timer, autosave cancellation) wired to dead file. Active app has none of it.

---

### FINDING-005
**Date:** 2026-02-17
**Phase:** 0
**File:** `src/src_figma/` (entire active layer)
**Claim:** State management has been modernized
**Evidence:** 718 useState calls in src_figma. useReducer only in inactive components.
**Status:** CONFIRMED
**Verification method:** grep useState count
**Verified by:** Claude + JK
**Impact:** Active codebase is still original useState spaghetti. State tearing risk fully present.

---

### FINDING-006
**Date:** 2026-02-17
**Phase:** 0
**File:** `src/engines/fameEngine.ts`
**Claim:** Gemini Phase B (fameEngine.ts) was future work
**Evidence:** File EXISTS in inventory. Also integration files in src/src_figma/app/engines/.
**Status:** UNVERIFIED
**Verification method:** File exists but contents not read — unknown if complete, stub, or duplicate
**Next action:** Read in Phase 1

---

### FINDING-007
**Date:** 2026-02-17
**Phase:** 0
**File:** `src/components/GameTracker/atBatLogic.ts`, `fieldingLogic.ts`, `gameEngine.ts`
**Claim:** Pure logic extraction files created as part of Gemini's refactor
**Evidence:** All three exist. gameEngine.ts is 362 lines. Only wired to inactive index.tsx.
**Status:** UNVERIFIED
**Verification method:** Files exist but not confirmed whether active GameTracker uses any of them
**Next action:** Read in Phase 1

---

## OPEN QUESTIONS

| # | Question | Raised | Resolved |
|---|----------|--------|----------|
| 1 | Does active GameTracker.tsx import anything from gameEngine.ts, atBatLogic.ts, or fieldingLogic.ts? | 2026-02-17 | Pending Phase 1 |
| 2 | What is the full import list of active GameTracker.tsx? | 2026-02-17 | Pending Phase 1 |
| 3 | Does useGameState.ts have the rehydration gate (isRehydrated) the session log claims? | 2026-02-17 | Pending Phase 1 |
| 4 | What is actually in fameEngine.ts — complete, stub, or duplicate? | 2026-02-17 | Pending Phase 1 |

---

## APPEND NEW FINDINGS BELOW THIS LINE

---

### FINDING-008
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx` (imports)
**Claim:** Gemini handoff says gameEngine.ts, atBatLogic.ts, fieldingLogic.ts are wired into active GameTracker
**Evidence:** Active GameTracker.tsx imports zero from gameEngine.ts, atBatLogic.ts, or fieldingLogic.ts.
**Status:** CONTRADICTED
**Verification method:** sed first 80 lines of active GameTracker.tsx, full import list scanned
**Verified by:** Claude + JK
**Impact:** Pure logic extraction is real but completely orphaned. Active app uses none of it.

---

### FINDING-009
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** Reducer migration replaced useState in the active state layer
**Evidence:** Imports: useState, useCallback, useEffect, useRef — no useReducer anywhere.
**Status:** CONFIRMED (monolith is hook-only, no reducer)
**Verification method:** sed first 80 lines of useGameState.ts
**Verified by:** Claude + JK
**Impact:** Active state system is pure useState monolith. Reducer exists only in inactive path.

---

### FINDING-010
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx`
**Claim:** N/A (new finding)
**Evidence:** _DeprecatedGameState interface still present in active GameTracker.tsx with comment "kept for reference during migration." Migration never completed.
**Status:** CONFIRMED
**Verification method:** sed first 80 lines
**Verified by:** Claude
**Impact:** Dead weight in active file. Indicator migration was started and abandoned.

---

### FINDING-011
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** Persistence is separated from state management
**Evidence:** useGameState.ts directly imports eventLog, gameStorage, processCompletedGame. State and persistence tangled in same 4,647-line hook.
**Status:** CONFIRMED (tangled, not separated)
**Verification method:** sed first 80 lines — import list shows direct persistence imports
**Verified by:** Claude + JK
**Impact:** Root cause of scoreboard/runner bugs. State and persistence updates are not atomic.

---

### FINDING-012
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** SESSION_LOG 2026-02-18 — isRehydrated guard implemented to gate snapshot rehydration
**Evidence:** grep -n "isRehydrated" returned NO OUTPUT on active hook.
**Status:** CONTRADICTED (critical)
**Verification method:** grep for isRehydrated — zero hits
**Verified by:** Claude + JK
**Impact:** CRITICAL. No rehydration gate in active app. Nothing prevents empty state overwriting saved data on refresh. Direct cause of runner/scoreboard bugs.

---

### FINDING-013
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/hooks/useGamePersistence.ts`
**Claim:** SESSION_LOG 2026-02-18 — shared debounce replaced with hook-local timer with cancellation
**Evidence:** useGamePersistence.ts imports debouncedSaveCurrentGame — shared debounce still in use.
**Status:** CONTRADICTED
**Verification method:** sed first 60 lines — import visible
**Verified by:** Claude + JK
**Impact:** Fix described in SESSION_LOG was never implemented anywhere.

---

### FINDING-014
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/components/GameTracker/index.tsx` lines 620-720
**Claim:** Reducer migration replaced 20+ useState hooks in inactive file
**Evidence:** Even inactive index.tsx has 13+ useState calls alongside useReducer: fameEvents, fameToasts, fameModalOpen, fameSettings, playerCardOpen, selectedPlayer, seasonSummaryOpen, showLineupPanel, pendingResult, pendingEvent, lineupState, substitutionHistory, pendingSubType.
**Status:** CONFIRMED (partial migration even in inactive file)
**Verification method:** sed lines 620-720 of index.tsx
**Verified by:** Claude + JK
**Impact:** The blueprint we might migrate from is itself incomplete. Reducer covers core game state only.

---

### FINDING-015
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/components/GameTracker/gameEngine.ts`
**Claim:** gameEngine.ts contains pure extracted logic
**Evidence:** Exports confirmed: processRunnerOutcomes, isForceOut, updatePitcherStats, calculateSimpleWinProbability, calculateLOB. 362 lines. Real implementations, not stubs.
**Status:** CONFIRMED (complete, orphaned)
**Verification method:** grep exports from gameEngine.ts
**Verified by:** Claude + JK
**Impact:** Solid reusable logic exists. Just needs importing by active GameTracker. Low-risk win.

---

## OPEN QUESTIONS (Updated 2026-02-17)

| # | Question | Raised | Resolved |
|---|----------|--------|----------|
| 1 | Does active GameTracker.tsx import from gameEngine/atBatLogic/fieldingLogic? | 2026-02-17 | FINDING-008: imports ZERO from all three |
| 2 | Full import list of active GameTracker.tsx? | 2026-02-17 | FINDING-008/009: confirmed, no reducer, no pure logic |
| 3 | Does useGameState.ts have isRehydrated gate? | 2026-02-17 | FINDING-012: does NOT exist |
| 4 | What is in fameEngine.ts — complete, stub, duplicate? | 2026-02-17 | UNVERIFIED — pending next read |
| 5 | How does GameTracker.tsx trigger saves? | 2026-02-17 | Pending Phase 1 continued |
| 6 | What guard conditions exist on load/rehydrate in useGameState.ts? | 2026-02-17 | Pending Phase 1 continued |
| 7 | How does end-game flow execute in active GameTracker? | 2026-02-17 | Pending Phase 1 continued |
| 8 | How does handlePlayGame pass roster data in? | 2026-02-17 | Pending Phase 1 continued |
| 9 | Are atBatLogic.ts and fieldingLogic.ts complete or stubs? | 2026-02-17 | Pending next read |
| 10 | Size and content of gameStorage.ts and processCompletedGame.ts? | 2026-02-17 | FINDING-016/017: sizes confirmed, contents pending |

---

### FINDING-016
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** SESSION_LOG 2026-02-18 — shared debounce replaced with hook-local timer
**Evidence:** autoSaveTimeoutRef (useRef) IS present at line 1062. clearTimeout called at lines 1169, 1327, 1985, 2009, 2030, 4303. setTimeout fires saveCurrentGame at line 1988. Timer cancelled at end-game (line 4303) and on load (line 1327).
**Status:** CONFIRMED — hook-local timer EXISTS in active useGameState.ts
**Verification method:** grep for autoSave/debounce in useGameState.ts
**Verified by:** Claude + JK
**Impact:** REVISES FINDING-013. The hook-local timer fix WAS applied to useGameState.ts (active hook). useGamePersistence.ts (inactive path) still uses debounce but that doesn't matter since it's not used. This is good news — autosave is cleaner than assumed.

---

### FINDING-017
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** SESSION_LOG 2026-02-18 — stale currentGame cleared on new game init and game load
**Evidence:** clearCurrentGame() called at line 1174 (init path) and line 1345 (load path). loadCurrentGame() called at line 1342. Header checked at line 1338: `!header.isComplete` guard exists.
**Status:** PARTIALLY CONFIRMED
**Verification method:** grep for endGame/completeGame/isComplete in useGameState.ts
**Verified by:** Claude + JK
**Impact:** Some persistence hardening IS present in the active hook. The isComplete guard on load (line 1338) is a partial rehydration gate — not the full isRehydrated flag, but it does check header validity before loading. FINDING-012 partially revised — there IS a guard, just not named isRehydrated.

---

### FINDING-018
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** endGame flow is complete and wired
**Evidence:** endGame() defined at line 4317. completeGameInternal() at line 4043. clearCurrentGame() called at line 4307 on end-game. completeScheduleGame called (T0-05). Fielding events queried at line 4338. CRIT-05 fix present. Double-aggregation guard at line 4238.
**Status:** CONFIRMED — endGame flow is substantial and wired
**Verification method:** grep for endGame/completeGame in useGameState.ts
**Verified by:** Claude + JK
**Impact:** End-game path is more complete than Phase 0 suggested. The bugs are more likely in the load/rehydration path than the save path.

---

### FINDING-019
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx`
**Claim:** GameTracker.tsx has minimal persistence logic — defers to useGameState
**Evidence:** 10+ useEffect calls in active GameTracker.tsx. loadExistingGame called at line 649 inside a useEffect at line 641. Comment at line 638: "Try loading existing game first, only create new if none found." Multiple useEffects watching state at lines 215, 224, 231, 263, 285, 351, 422, 641, 754, 2273.
**Status:** CONFIRMED — GameTracker has substantial useEffect complexity
**Verification method:** grep for useEffect/save/load/persist in GameTracker.tsx
**Verified by:** Claude + JK
**Impact:** 10+ useEffects in the orchestrator is a state tearing risk. Multiple effects watching overlapping state can fire in unpredictable order. This is a likely secondary cause of the runner/scoreboard bugs alongside the rehydration path.

---

### FINDING-020
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/utils/gameStorage.ts`
**Claim:** gameStorage.ts is a full implementation
**Evidence:** wc -l returns 1 line. File exists but is effectively empty or a re-export only.
**Status:** CONFIRMED (critical — near-empty file)
**Verification method:** wc -l
**Verified by:** Claude + JK
**Impact:** CRITICAL. Active gameStorage.ts in src_figma/utils/ is 1 line. This means the active hook (useGameState.ts) is importing saveCurrentGame, loadCurrentGame, clearCurrentGame from this file — but the file has almost no content. Need to read it immediately to understand what it exports (likely re-exports from src/utils/gameStorage.ts).

---

### FINDING-021
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/utils/processCompletedGame.ts`
**Claim:** processCompletedGame is the game result orchestrator
**Evidence:** 53 lines. Small file.
**Status:** UNVERIFIED — size noted, contents not yet read
**Verification method:** wc -l
**Verified by:** Claude
**Next action:** Read contents in next batch

---

### FINDING-022
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/components/GameTracker/atBatLogic.ts`, `src/components/GameTracker/fieldingLogic.ts`, `src/engines/fameEngine.ts`
**Claim:** These are complete extracted logic files
**Evidence:**
- atBatLogic.ts: 302 lines. Exports: BaseKey, RunnerOutcomes, isRunnerForced, getMinimumAdvancement, outcomeToDestination, isExtraAdvancement, getDefaultOutcome, calculateRBIs, getEventOutcomes. Real implementations, not stubs.
- fieldingLogic.ts: 120 lines. Exports: buildAssistChainFromDpType, sanitizeAssistChain, getPutoutPositionFromDpType, getDefaultDpType, mapPlayTypeToSpecialPlay. Real implementations.
- fameEngine.ts: 947 lines. Substantial — not a stub.
**Status:** CONFIRMED (all three are real, complete files — all orphaned from active app)
**Verification method:** wc -l + grep exports
**Verified by:** Claude + JK
**Impact:** 947-line fameEngine.ts, 302-line atBatLogic.ts, 120-line fieldingLogic.ts — all complete, none imported by active GameTracker. Significant reusable logic sitting unused.

---

## OPEN QUESTIONS (Updated 2026-02-17 batch 2)

| # | Question | Raised | Resolved |
|---|----------|--------|----------|
| 1 | Does active GameTracker.tsx import from gameEngine/atBatLogic/fieldingLogic? | 2026-02-17 | FINDING-008: imports ZERO |
| 2 | Full import list of active GameTracker.tsx? | 2026-02-17 | FINDING-008/009: confirmed |
| 3 | Does useGameState.ts have a rehydration guard? | 2026-02-17 | FINDING-017: partial guard exists (isComplete check at line 1338) |
| 4 | What is in fameEngine.ts? | 2026-02-17 | FINDING-022: 947 lines, complete, orphaned |
| 5 | How does GameTracker.tsx trigger saves? | 2026-02-17 | FINDING-019: 10+ useEffects, loadExistingGame at line 649 |
| 6 | What guard conditions on load/rehydrate in useGameState.ts? | 2026-02-17 | FINDING-017: isComplete header check at line 1338 — partial |
| 7 | How does end-game flow execute? | 2026-02-17 | FINDING-018: endGame() line 4317, substantial and wired |
| 8 | How does handlePlayGame pass roster data in? | 2026-02-17 | Pending next read |
| 9 | Are atBatLogic.ts and fieldingLogic.ts complete or stubs? | 2026-02-17 | FINDING-022: both complete, both orphaned |
| 10 | What does src_figma/utils/gameStorage.ts actually contain? | 2026-02-17 | FINDING-020: 1 line — likely re-export, MUST READ |
| 11 | What does processCompletedGame.ts actually do in 53 lines? | 2026-02-17 | Pending next read |
| 12 | Why are there 10+ useEffects in GameTracker.tsx and do any conflict? | 2026-02-17 | Pending deeper read |

---

### FINDING-023
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/utils/gameStorage.ts`
**Claim:** FINDING-020 flagged this as a near-empty critical file
**Evidence:** File contains exactly: `export * from '../../utils/gameStorage';`
**Status:** CONFIRMED — pure re-export barrel, not missing implementation
**Verification method:** cat src/src_figma/utils/gameStorage.ts
**Verified by:** Claude + JK
**Impact:** RESOLVES FINDING-020. Active hook correctly resolves to src/utils/gameStorage.ts via re-export. Save/load path is intact.

---

### FINDING-024
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/utils/gameStorage.ts` (real implementation)
**Claim:** gameStorage is the real persistence layer
**Evidence:** Re-export chain confirmed. processCompletedGame.ts imports from this layer. Real implementation at src/utils/ not src_figma/utils/.
**Status:** CONFIRMED
**Verification method:** Traced re-export chain
**Verified by:** Claude
**Next action:** Read src/utils/gameStorage.ts contents to understand full API surface

---

### FINDING-025
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/utils/processCompletedGame.ts`
**Claim:** processCompletedGame is the game result orchestrator
**Evidence:** 53 lines. Clean two-step pipeline: (1) aggregateGameToSeason() — full stat aggregation, (2) archiveCompletedGame() — writes to completedGames store. Described as "non-React equivalent of completeGameInternal."
**Status:** CONFIRMED — clean, complete, correct pattern
**Verification method:** cat src/utils/processCompletedGame.ts
**Verified by:** Claude + JK
**Impact:** Two paths exist for same operation: processCompletedGame (pure) and completeGameInternal (React hook). Divergence risk.

---

### FINDING-026
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts` lines 1330-1360
**Claim:** FINDING-012 said no rehydration gate. FINDING-017 said partial gate.
**Evidence:** Three-layer rehydration guard confirmed:
- `header && !header.isComplete` — rejects completed games
- `savedSnapshot.gameId === initialGameId` — rejects mismatched snapshots
- `hasUsableLiveSnapshot` — requires scoreboard OR runnerTracker OR pitcher/batter IDs
All three must pass before snapshot is applied.
**Status:** CONFIRMED — gate IS present and multi-layered
**Verification method:** sed lines 1330-1360
**Verified by:** Claude + JK
**Impact:** REVISES FINDING-012. Rehydration gate exists and is robust. Runner/scoreboard bugs NOT caused by missing gate. Root cause likely the useEffect race condition in FINDING-027.

---

### FINDING-027
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx`
**Claim:** initializeGame and loadExistingGame are cleanly separated
**Evidence:** loadExistingGame called at line 649 first. initializeGame at line 708 only if load returns false. Both in dependency array of same useEffect at line 750 — 13+ dependencies.
**Status:** CONFIRMED — correct pattern but unstable dep array
**Verification method:** grep initializeGame/loadExistingGame
**Verified by:** Claude + JK
**Impact:** 13+ dependencies in one useEffect means any dep change re-fires the entire init/load sequence. If useCallback refs for initializeGame or loadExistingGame are unstable, effect re-fires mid-game — overwriting runners and scoreboard. Most likely root cause of persistence bugs.

---

## OPEN QUESTIONS (Updated 2026-02-17 batch 3)

| # | Question | Raised | Resolved |
|---|----------|--------|----------|
| 10 | What does src_figma/utils/gameStorage.ts contain? | 2026-02-17 | FINDING-023: pure re-export |
| 11 | What does processCompletedGame.ts do? | 2026-02-17 | FINDING-025: clean 2-step orchestrator |
| 15 | What is the real implementation in src/utils/gameStorage.ts? | 2026-02-17 | Pending — need to read |
| 16 | Are useCallback deps stable for initializeGame and loadExistingGame? | 2026-02-17 | Pending — critical for confirming FINDING-027 |
| 17 | Do completeGameInternal and processCompletedGame stay in sync? | 2026-02-17 | Pending — divergence risk flagged in FINDING-025 |

---

### FINDING-028
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts` lines 1166, 1324
**Claim:** FINDING-027 flagged unstable useCallback refs as likely root cause of re-init race condition
**Evidence:** initializeGame defined with useCallback at line 1166. loadExistingGame defined with useCallback at line 1324. Neither dep array visible yet — need to read those lines to confirm stability.
**Status:** UNVERIFIED — useCallback confirmed present, dep arrays not yet read
**Verification method:** grep for useCallback on those functions
**Verified by:** Claude
**Next action:** Read lines 1166-1200 and 1324-1340 to see dep arrays

---

### FINDING-029
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts` lines 1055-1080
**Claim:** useGameState hook structure understood
**Evidence:** Hook opens with: isLoading, isSaving, lastSavedAt (useState), latestPersistedRef + autoSaveTimeoutRef (useRef), showAutoEndPrompt, atBatSequence, awayBatterIndex, homeBatterIndex (useState), awayLineupRef + homeLineupRef + seasonIdRef (useRef), awayLineupStateRef + homeLineupStateRef (useRef). 
**Status:** CONFIRMED — hook is useState-heavy with ref stabilization for lineup/persistence
**Verification method:** sed lines 1055-1080
**Verified by:** Claude + JK
**Impact:** At least 8 useState calls at the top of a 4,647-line hook. Combined with the 10+ useEffects in GameTracker.tsx, the state surface is extremely large. Any state change can trigger cascading re-renders.

---

### FINDING-030
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/utils/gameStorage.ts`
**Claim:** gameStorage is a simple persistence layer
**Evidence:** 537 lines. Full API surface:
- initDatabase() — IDB initializer
- saveCurrentGame() — line 278
- loadCurrentGame() — line 299
- clearCurrentGame() — line 317
- hasSavedGame() — line 333
- archiveCompletedGame() — line 367
- archiveBatchGameResult() — line 417
- getRecentGames() — line 457
- getCompletedGameById() — line 485
- debouncedSaveCurrentGame() — line 513 (still exists but unused by active hook)
- immediateSaveCurrentGame() — line 528
**Status:** CONFIRMED — full, real implementation
**Verification method:** wc -l + grep exports
**Verified by:** Claude + JK
**Impact:** debouncedSaveCurrentGame still exists in the real gameStorage.ts but active useGameState.ts uses the hook-local timer instead (FINDING-016). The debounce function is dead code in production path but still importable — confusion risk.

---

### FINDING-031
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx` lines 640-760
**Claim:** FINDING-027 flagged the init useEffect dep array as an instability risk
**Evidence:** 
- `initInProgressRef` guards against double-fire (line 640) — good
- `cancelled` flag prevents stale async updates (cleanup function present) — good
- Load-then-init pattern is correct: loadExistingGame() first, initializeGame() only if no existing game
- Dep array (line 750): `[gameInitialized, awayTeamPlayers, homeTeamPlayers, awayPitcher, homePitcher, awayTeamId, homeTeamId, gameId, initializeGame, loadExistingGame, selectedStadium, navigationState?.franchiseId, navigationState?.seasonNumber, navigationState?.totalInnings, awayTeamName, homeTeamName]` — 16 dependencies
- awayTeamPlayers and homeTeamPlayers are arrays — if parent re-renders and passes new array references, this effect re-fires even if content is identical
**Status:** CONFIRMED — race condition risk is REAL
**Verification method:** sed lines 640-760
**Verified by:** Claude + JK
**Impact:** CRITICAL. awayTeamPlayers/homeTeamPlayers are array props. In React, arrays are new references on every render. If parent re-renders (very likely during game), this 16-dep useEffect re-fires, calls loadExistingGame() again mid-game, and potentially overwrites live game state. This is the most probable root cause of runner disappearance and scoreboard reset bugs.

---

## OPEN QUESTIONS (Updated 2026-02-17 batch 4)

| # | Question | Raised | Resolved |
|---|----------|--------|----------|
| 15 | Full API of src/utils/gameStorage.ts? | 2026-02-17 | FINDING-030: 537 lines, full API confirmed |
| 16 | Are useCallback deps stable for initializeGame and loadExistingGame? | 2026-02-17 | FINDING-028: UNVERIFIED — dep arrays not yet read |
| 17 | Do completeGameInternal and processCompletedGame stay in sync? | 2026-02-17 | Pending |
| 18 | Are awayTeamPlayers/homeTeamPlayers memoized before being passed to GameTracker? | 2026-02-17 | Pending — critical for confirming FINDING-031 |
| 19 | What are the dep arrays for initializeGame and loadExistingGame useCallbacks? | 2026-02-17 | Pending — read lines 1166-1230 and 1324-1400 |
