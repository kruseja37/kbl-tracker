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
| 1 | Architecture Map | COMPLETE | 2026-02-17 | 2026-02-18 |
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

---

### FINDING-032
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts` lines 1166-1230
**Claim:** initializeGame useCallback dep array may be unstable
**Evidence:** initializeGame useCallback body confirmed — no closing bracket or dep array visible in this range. The function body is substantial (sets state, clears timers, builds lineup state). Dep array not yet visible — need lines 1230-1280 to see it.
**Status:** UNVERIFIED — dep array still not confirmed
**Verification method:** sed lines 1166-1230
**Verified by:** Claude
**Next action:** Read lines 1260-1330 to find closing dep array

---

### FINDING-033
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts` lines 1324-1400
**Claim:** loadExistingGame useCallback is the rehydration entry point
**Evidence:** Full rehydration logic confirmed in detail:
- Clears autosave timer on entry
- getGameHeader() check — rejects if no header or isComplete
- loadCurrentGame() — loads snapshot
- Clears stale snapshot if gameId mismatch or game complete
- hasUsableLiveSnapshot check (scoreboard OR runnerTracker OR pitcher/batter IDs)
- If all pass: restores scoreboard (with normalization), lineups, lineup state, season ID, player stats
- Scoreboard normalization handles null/undefined gracefully with fallbacks
**Status:** CONFIRMED — rehydration is thorough and defensive
**Verification method:** sed lines 1324-1400
**Verified by:** Claude + JK
**Impact:** Rehydration logic itself is solid. Dep array for this useCallback still not visible — need to confirm stability.

---

### FINDING-034
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx`
**Claim:** awayTeamPlayers and homeTeamPlayers are stable state values
**Evidence:** 
- Line 479: `const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>(navigationState?.awayPlayers || [...])`
- Line 504: `const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>(navigationState?.homePlayers || [...])`
- Both are useState — initialized once from navigationState, only change when setAwayTeamPlayers/setHomeTeamPlayers called
- setAwayTeamPlayers called at line 1015-1016 (inside handleLineupCardSubstitution/roster update path)
**Status:** CONFIRMED — arrays are useState, not props or derived values
**Verification method:** grep awayTeamPlayers/homeTeamPlayers
**Verified by:** Claude + JK
**Impact:** REVISES FINDING-031 partially. Because awayTeamPlayers/homeTeamPlayers are useState (not props), they only change when a substitution occurs — not on every parent render. The race condition risk is lower than feared for normal gameplay. HOWEVER: if a substitution fires setAwayTeamPlayers mid-game, the 16-dep useEffect at line 750 WILL re-fire, calling loadExistingGame() again during an active game. This is still a real bug path — just triggered by substitutions specifically, not every render.

---

### FINDING-035
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx`
**Claim:** Player-related useCallbacks are memoized
**Evidence:** useCallback present for: getPlayerIdFromName (829), getPlayerMojoByName (833), getPlayerFitnessByName (839), setPlayerMojoByName (845), setPlayerFitnessByName (850), handleLineupCardSubstitution (933), handleSubstitution (1893), handlePositionSwap (1966). None of these are in the dep array of the init useEffect — good.
**Status:** CONFIRMED — player callbacks are memoized and not in init dep array
**Verification method:** grep useMemo/useCallback for player/team/roster/lineup
**Verified by:** Claude + JK
**Impact:** The substitution handlers themselves are stable. The problem is they call setAwayTeamPlayers/setHomeTeamPlayers which triggers the init useEffect re-fire (FINDING-034).

---

## OPEN QUESTIONS (Updated 2026-02-17 batch 5)

| # | Question | Raised | Resolved |
|---|----------|--------|----------|
| 16 | Are useCallback deps stable for initializeGame and loadExistingGame? | 2026-02-17 | FINDING-032/033: body confirmed, dep arrays still not visible — need lines 1260-1330 |
| 17 | Do completeGameInternal and processCompletedGame stay in sync? | 2026-02-17 | Pending |
| 18 | Does substitution calling setAwayTeamPlayers re-trigger the init useEffect? | 2026-02-17 | FINDING-034: YES — confirmed real bug path triggered by substitutions |
| 19 | What are the closing dep arrays for initializeGame and loadExistingGame useCallbacks? | 2026-02-17 | Pending — read lines 1260-1330 |
| 20 | Does gameInitialized flag prevent re-initialization after substitution re-fires effect? | 2026-02-17 | Partially — line 640 checks gameInitialized but initInProgressRef also guards. Need to verify both guards hold under substitution scenario |

---

### FINDING-036
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts` — initializeGame closing dep array
**Claim:** FINDING-032 — initializeGame dep array not yet visible
**Evidence:** Line visible at end of initializeGame body: `}, []);` — empty dependency array.
**Status:** CONFIRMED — initializeGame has empty dep array, fully stable ref
**Verification method:** sed lines 1260-1330
**Verified by:** Claude + JK
**Impact:** initializeGame ref is completely stable — it never changes. This eliminates it as a cause of the useEffect re-fire. The re-fire risk from FINDING-034 is real but initializeGame itself is not the trigger.

---

### FINDING-037
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts` — loadExistingGame dep array
**Claim:** loadExistingGame dep array stability unknown
**Evidence:** loadExistingGame body visible at lines 1324+. Dep array closing bracket not yet seen in this range — function body continues into stat restoration. Need one more read to confirm dep array. However: loadExistingGame only uses initialGameId (a string prop) and internal refs/setters. If dep array is [initialGameId] or [], it would be stable.
**Status:** UNVERIFIED — dep array still not confirmed
**Verification method:** sed lines 1400-1440 — body still running
**Next action:** Read lines 1540-1580 to find closing dep array

---

### FINDING-038
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx`
**Claim:** gameInitialized flag prevents re-initialization after state changes
**Evidence:**
- Line 211: `const [gameInitialized, setGameInitialized] = useState(false)`
- Line 642: `if (gameInitialized || initInProgressRef.current) return;` — FIRST check in the init useEffect
- setGameInitialized(true) called at lines 654, 732, 738 (all success paths)
- gameInitialized is in the dep array at line 750
**Status:** CONFIRMED — gameInitialized IS an effective guard
**Verification method:** grep gameInitialized/setGameInitialized
**Verified by:** Claude + JK
**Impact:** REVISES FINDING-034. When setAwayTeamPlayers fires during a substitution, the init useEffect re-fires BUT immediately exits at line 642 because gameInitialized is already true. The race condition from FINDING-034 does NOT cause re-initialization during normal gameplay. The guard works correctly.

---

### FINDING-039
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx`
**Claim:** setAwayTeamPlayers/setHomeTeamPlayers are called during substitutions
**Evidence:**
- Line 1015-1016: called inside updateTeamRoster (substitution path)
- Line 1913: called inside handleSubstitution
- Line 1970: called inside handlePositionSwap
All three are substitution handlers — not random state updates.
**Status:** CONFIRMED — player state only changes on substitution
**Verification method:** grep setAwayTeamPlayers/setHomeTeamPlayers
**Verified by:** Claude + JK
**Impact:** Combined with FINDING-038: substitutions update player arrays → init useEffect re-fires → exits immediately at gameInitialized guard. No re-initialization occurs. This path is safe.

---

### FINDING-040
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/GameTracker.tsx` line 825
**Claim:** Second useEffect also depends on awayTeamPlayers/homeTeamPlayers
**Evidence:** Line 825: `}, [gameInitialized, awayTeamPlayers, homeTeamPlayers, awayPitcher, homePitcher, playerStateHook]);` — a second useEffect with player arrays in dep array, also guarded by `if (!gameInitialized) return` at line 755.
**Status:** CONFIRMED — second effect also re-fires on substitution but is guarded
**Verification method:** grep gameInitialized
**Verified by:** Claude + JK
**Impact:** Both useEffects that depend on player arrays are guarded by gameInitialized. Substitution-triggered re-fires are safe. The initialization race condition hypothesis from FINDING-031 is substantially weakened — the guards appear to work.

---

## REVISED UNDERSTANDING OF BUG ROOT CAUSE (2026-02-17)

Based on FINDING-036 through FINDING-040, the useEffect race condition theory is largely disproven:
- initializeGame has empty dep array — completely stable
- gameInitialized guard exits early on all re-fires
- Substitution-triggered re-fires are safe

**New hypothesis:** Runner disappearance and scoreboard bugs are more likely caused by:
1. The autosave snapshot missing runner state in some edge case (FINDING-016 showed timer-based save — what if component unmounts before timer fires?)
2. The hasUsableLiveSnapshot check failing for a valid game (if scoreboard/runnerTracker are null at snapshot time)
3. A specific at-bat outcome path that doesn't trigger autosave before refresh

**Next investigation target:** The autosave trigger path — when exactly does it fire, and what state does it capture?

---

## OPEN QUESTIONS (Updated 2026-02-17 batch 6)

| # | Question | Raised | Resolved |
|---|----------|--------|----------|
| 16 | initializeGame dep array stable? | 2026-02-17 | FINDING-036: YES — empty dep array |
| 19 | loadExistingGame dep array? | 2026-02-17 | FINDING-037: UNVERIFIED — need lines 1540-1580 |
| 20 | Does gameInitialized prevent re-init after substitution? | 2026-02-17 | FINDING-038: YES — guard works |
| 21 | When exactly does autosave fire and what does it capture? | 2026-02-17 | Pending — new priority target |
| 22 | Can component unmount before autosave timer fires, losing runner state? | 2026-02-17 | Pending — critical for bug root cause |
| 23 | What does the autosave snapshot include — does it capture runnerTrackerSnapshot? | 2026-02-17 | Pending — read autosave path in useGameState.ts |

---

### FINDING-041
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts` lines 1975-2040
**Claim:** Autosave may miss runner state if component unmounts before timer fires
**Evidence:**
- Autosave timer: 250ms debounce (line ~1988), saves full persisted state
- runnerTrackerSnapshot IS included in the persisted object (line 1972 confirmed)
- Unmount cleanup at line 2027: clears the timer but does NOT flush the save
- HOWEVER: beforeunload handler at line ~2015 calls immediateSaveCurrentGame(latestPersistedRef.current) — synchronous flush on page unload
- visibilitychange handler also flushes when tab goes hidden
- latestPersistedRef.current always holds the latest state — even if timer hasn't fired yet
**Status:** CONFIRMED — unmount gap exists but beforeunload covers the refresh case
**Verification method:** sed lines 1975-2040
**Verified by:** Claude + JK
**Impact:** On normal page refresh: beforeunload fires → immediateSaveCurrentGame flushes latest state including runners → rehydration picks it up. The unmount-before-timer gap is covered for refresh. Gap remains for: app crash, browser kill, or navigation that doesn't trigger beforeunload. This is acceptable risk, not the primary bug.

---

### FINDING-042
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** Autosave dep array may miss state that affects runner tracking
**Evidence:** Autosave useCallback dep array (lines ~2000-2010):
`[isLoading, gameState, scoreboard, playerStats, pitcherStats, fameEvents, substitutionLog, atBatSequence, awayBatterIndex, homeBatterIndex]`
runnerTrackerRef is a useRef — NOT in the dep array (refs don't trigger re-renders). The autosave fires when the listed state changes, but runnerTrackerRef updates happen imperatively and don't trigger the autosave directly.
**Status:** CONFIRMED — runner tracker updates don't directly trigger autosave
**Verification method:** Dep array visible in sed output lines 1975-2040
**Verified by:** Claude + JK
**Impact:** POTENTIAL BUG PATH. If a runner is moved (runnerTrackerRef updated) but no listed state changes (no score, no out, no at-bat sequence change), the 250ms autosave may not fire with the updated runner position. On refresh, the stale snapshot is loaded — runner appears to disappear. This is a credible root cause for the runner disappearance bug.

---

### FINDING-043
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** loadExistingGame dep array unknown
**Evidence:** Line 1540-1580 shows stat restoration (playerStats, pitcherStats maps being rebuilt from snapshot). Closing dep array not yet visible — function body continues past line 1580.
**Status:** UNVERIFIED — dep array still not found
**Verification method:** sed lines 1540-1580
**Verified by:** Claude
**Next action:** Read lines 1750-1790 to find closing bracket

---

### FINDING-044
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** runnerTrackerRef is properly restored on rehydration
**Evidence:** Lines 1493-1502: if savedSnapshot.runnerTrackerSnapshot exists, runnerTrackerRef.current is fully rebuilt with runners, currentPitcherId, currentPitcherName, pitcherStats, inning, atBatNumber. Line 1533: fallback rebuild path also exists. Line 1736: second rebuild path exists.
**Status:** CONFIRMED — runner tracker restoration is thorough
**Verification method:** grep runnerTrackerSnapshot in useGameState.ts
**Verified by:** Claude + JK
**Impact:** Rehydration of runner tracker is correct. The bug is in CAPTURE (FINDING-042), not RESTORE. Runner state is restored fine when the snapshot has it — but the snapshot may not have the latest runner position if no listed dep changed since the last autosave.

---

## REVISED ROOT CAUSE HYPOTHESIS (2026-02-17 — Batch 7)

**Runner disappearance bug — most likely cause:**
runnerTrackerRef is a useRef. Updating it (moving a runner between bases without recording an at-bat) does NOT trigger any of the autosave deps. If the user moves a runner manually and then refreshes before the next at-bat event fires the autosave, the snapshot has stale runner positions. On reload, the correct gameId/snapshot is found but runner positions are from before the manual move.

**Fix:** Add an explicit autosave trigger whenever runnerTrackerRef is mutated. Since refs don't trigger re-renders, this requires either: (a) a separate useState counter that increments on every runner move, added to the autosave dep array, or (b) calling immediateSaveCurrentGame() directly after every runner mutation.

**Scoreboard showing prior game data:**
Still under investigation — likely related to the clearCurrentGame() call sequence on new game initialization.

---

## OPEN QUESTIONS (Updated 2026-02-17 batch 7)

| # | Question | Raised | Resolved |
|---|----------|--------|----------|
| 19 | loadExistingGame dep array? | 2026-02-17 | FINDING-043: UNVERIFIED — need lines 1750-1790 |
| 22 | Can unmount lose runner state? | 2026-02-17 | FINDING-041: beforeunload covers refresh case — acceptable |
| 23 | Does autosave capture runnerTrackerSnapshot? | 2026-02-17 | FINDING-041: YES — captured at line 1972 |
| 24 | Does runner move without at-bat trigger autosave? | 2026-02-17 | FINDING-042: NO — runnerTrackerRef not in dep array. LIKELY ROOT CAUSE. |
| 25 | What triggers runner moves — is there an explicit save call after? | 2026-02-17 | Pending — need to find runner move handlers |
| 26 | What is the clearCurrentGame sequence on new game start? | 2026-02-17 | Pending — scoreboard bug investigation |

---

### FINDING-045
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** FINDING-042 — runner moves don't trigger autosave because runnerTrackerRef is not in dep array
**Evidence:** 
- trackerAddRunner, trackerAdvanceRunner, trackerRunnerOut all imported at lines 40-42
- runnerTrackerRef.current mutated at lines 2095, 2098, 2108, 2119, 2120, 2125, 2130
- advanceRunner (line 3354) and advanceRunnersBatch (line 3440) are the user-facing handlers
- Both call setGameState (updating outs, bases, scores) — which IS in the autosave dep array
- Line 2130: runnerTrackerRef.current = tracker (ref mutation after processing)
**Status:** CONFIRMED — FINDING-042 PARTIALLY REVISED
**Verification method:** grep runnerTrackerRef + grep advanceRunner
**Verified by:** Claude + JK
**Impact:** Runner moves always accompany a setGameState call (updating bases/outs/score). setGameState IS in the autosave dep array (gameState). Therefore runner moves DO trigger the autosave indirectly via gameState change. FINDING-042's root cause hypothesis is weakened — the autosave fires when runners move. The runner disappearance bug needs a different explanation.

---

### FINDING-046
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** loadExistingGame dep array unknown
**Evidence:** Line ~1770: `}, [initialGameId]);` — loadExistingGame closes with dep array of just `[initialGameId]`.
**Status:** CONFIRMED — loadExistingGame dep array is [initialGameId] — stable
**Verification method:** sed lines 1750-1790
**Verified by:** Claude + JK
**Impact:** loadExistingGame ref is stable — only changes if initialGameId changes. Combined with FINDING-036 (initializeGame has empty dep array), both functions passed to the init useEffect are stable refs. The 16-dep useEffect re-fires are driven by player/team state changes only, and guarded by gameInitialized. No ref instability issues.

---

### FINDING-047
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** There is a fallback rehydration path from event log when no currentGame snapshot exists
**Evidence:** Lines 1750-1780 show a second rehydration path: if no usable live snapshot, falls back to reconstructing state from the last at-bat event (lastEvent?.runnersAfter, lastEvent?.batterId, etc.). This path uses the event log, not the currentGame store. Runner positions reconstructed from lastEvent.runnersAfter.
**Status:** CONFIRMED — fallback path exists
**Verification method:** sed lines 1750-1790
**Verified by:** Claude + JK
**Impact:** CRITICAL for bug investigation. The fallback path reconstructs bases from `lastEvent?.runnersAfter` which only captures base occupancy (true/false), NOT runner identities (who is on which base). If the live snapshot is missing and fallback fires, runner identity data (names, responsible pitcher) is lost — only base state preserved. This IS a credible cause of "runner disappears" — identity lost, base state preserved but shown as unknown runner.

---

### FINDING-048
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/useGameState.ts`
**Claim:** clearCurrentGame sequence on new game start
**Evidence:**
- Line 1174: clearCurrentGame() called inside initializeGame (before new game state is set)
- Line 1345: clearCurrentGame() called inside loadExistingGame (stale snapshot cleanup)
- Line 4307: clearCurrentGame() called inside endGame() after game completion
All three are explicit, intentional clear calls. No race condition apparent in the clear sequence itself.
**Status:** CONFIRMED — clear sequence is intentional and correct
**Verification method:** grep clearCurrentGame
**Verified by:** Claude + JK
**Impact:** The scoreboard showing prior game data is not caused by a missing clearCurrentGame call. Most likely cause: the hasUsableLiveSnapshot check passes for a snapshot from the previous game (same gameId condition not met → snapshot should be cleared → but what if gameId happens to match?). Or: the fallback event-log path (FINDING-047) reconstructs scoreboard from the wrong game's events.

---

## REVISED ROOT CAUSE HYPOTHESES (2026-02-17 — Batch 8)

**Runner disappearance bug — revised:**
FINDING-045 shows runner moves DO trigger autosave (via setGameState). FINDING-042 hypothesis weakened.
New most likely cause: FINDING-047 — fallback path fires when live snapshot is missing, reconstructs from lastEvent.runnersAfter which only has base occupancy (true/false), not runner identities. Runner identity (name, responsible pitcher) is lost.

When does the live snapshot go missing? If clearCurrentGame fires before the new snapshot is written. The 250ms autosave timer creates a window where clearCurrentGame (from initializeGame or loadExistingGame) can run and clear the snapshot before the previous game's runner state is captured.

**Scoreboard reset bug:**
Still unresolved. FINDING-047 fallback path only has base state, not full scoreboard — if this path fires mid-game, scoreboard would revert to gameState values only.

---

## OPEN QUESTIONS (Updated 2026-02-17 batch 8)

| # | Question | Raised | Resolved |
|---|----------|--------|----------|
| 19 | loadExistingGame dep array? | 2026-02-17 | FINDING-046: [initialGameId] — stable |
| 24 | Does runner move without at-bat trigger autosave? | 2026-02-17 | FINDING-045: YES — via setGameState dep |
| 25 | What triggers the fallback event-log rehydration path? | 2026-02-17 | FINDING-047: fires when hasUsableLiveSnapshot is false |
| 26 | Can a 250ms autosave window create gap where clearCurrentGame clears valid runner data? | 2026-02-17 | Pending — need to trace timing of clear vs save |
| 27 | Does the fallback path (FINDING-047) fire more than expected? | 2026-02-17 | Pending — need to add logging or trace condition |
| 28 | Phase 1 complete? | 2026-02-17 | Pending — assess remaining unknowns |

---

### FINDING-049
**Date:** 2026-02-17
**Phase:** 1
**File:** `spec-docs/` directory
**Claim:** Spec-docs are manageable in scope
**Evidence:** 164,089 total lines. 80+ spec files. Major specs include: FRANCHISE_MODE_SPEC, OFFSEASON_SYSTEM_SPEC, NARRATIVE_SYSTEM_SPEC, SALARY_SYSTEM_SPEC, TRADE_SYSTEM_SPEC, FARM_SYSTEM_SPEC, PLAYOFF_SYSTEM_SPEC, MILESTONE_SYSTEM_SPEC, MOJO_FITNESS_SYSTEM_SPEC, RELATIONSHIP_ENGINE (implied), ADAPTIVE_STANDARDS_ENGINE, STADIUM_ANALYTICS, AWARDS_CEREMONY, CONTRACTION_EXPANSION, DRAFT, FREE_AGENCY, RETIREMENT, SEASON_SETUP, SEASON_END, LEAGUE_BUILDER, and 5 separate WAR calc specs (BWAR, FWAR, PWAR, RWAR, MWAR).
**Status:** CONFIRMED — spec corpus is massive, 20+ distinct subsystems documented
**Verification method:** ls spec-docs/ + wc -l
**Verified by:** Claude + JK
**Impact:** Original 6-subsystem audit plan was severely underscoped. Full subsystem count is 20+. Plan requires revision.

---

### FINDING-050
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/engines/` directory
**Claim:** Engine layer is limited
**Evidence:** 30+ engine files confirmed: adaptiveLearningEngine, agingEngine, awardEmblems, bwarCalculator, calendarEngine, calibrationService, clutchCalculator, detectionFunctions, fameEngine, fanFavoriteEngine, fanMoraleEngine, fitnessEngine, fwarCalculator, gradeEngine, h2hTracker, headlineEngine, hofEngine, legacyDynastyTracker, leverageCalculator, mojoEngine, mwarCalculator, narrativeEngine, nicknameEngine, oddityRecordTracker, parkFactorDeriver, playoffEngine, pwarCalculator, ratingsAdjustmentEngine, relationshipEngine, rwarCalculator, salaryCalculator, seasonTransitionEngine, tradeEngine, winExpectancyTable, wpaCalculator.
**Status:** CONFIRMED — 35 engine files, none examined beyond fameEngine size
**Verification method:** find src -name "*.ts" export grep
**Verified by:** Claude + JK
**Impact:** Engines exist for virtually every spec. Wiring status unknown for all 35.

---

### FINDING-051
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/engines/` — integration layer
**Claim:** Integration layer unknown
**Evidence:** Separate integration engine files exist alongside the core engines: adaptiveLearningIntegration, agingIntegration, detectionIntegration, fameIntegration, fanMoraleIntegration, mwarIntegration, narrativeIntegration, playerStateIntegration, relationshipIntegration, warOrchestrator, saveDetector, d3kTracker, inheritedRunnerTracker.
**Status:** CONFIRMED — integration layer exists as a bridge between src/engines/ and active app
**Verification method:** find src -name "*.ts"
**Verified by:** Claude + JK
**Impact:** Architecture has three layers: engines (src/engines/), integration adapters (src_figma/app/engines/), and hooks (src_figma/hooks/). Wiring status of each integration file is unknown. This is likely where most gaps live.

---

### FINDING-052
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/app/pages/` — UI pages
**Claim:** UI page count unknown
**Evidence:** 16 pages: AppHome, ExhibitionGame, FranchiseHome, FranchiseSelector, FranchiseSetup, GameTracker, LeagueBuilder (+ 6 sub-pages), PostGameSummary, SeasonSummary, WorldSeries.
**Status:** CONFIRMED — 16 pages total
**Verification method:** ls pages/
**Verified by:** Claude + JK
**Impact:** Routing status, data wiring, and completion state unknown for all pages except GameTracker (examined) and partially PostGameSummary (referenced in code).

---

### FINDING-053
**Date:** 2026-02-17
**Phase:** 1
**File:** `src/src_figma/hooks/` vs `src/hooks/`
**Claim:** Hook duplication pattern
**Evidence:** Active hooks (src_figma/hooks/): useFranchiseData, useGameState, useLeagueBuilderData, useMuseumData, useOffseasonData, useOffseasonState, usePlayoffData, useScheduleData. Legacy hooks (src/hooks/): useAgingData, useCareerStats, useClutchCalculations, useDataIntegrity, useFameDetection, useFanMorale, useFitnessState, useGamePersistence, useLiveStats, useMWARCalculations, useMojoState, useOffseasonPhase, useRelationshipData, useSeasonData, useSeasonStats, useWARCalculations.
**Status:** CONFIRMED — same duplication pattern as useGameState. Active app uses src_figma/hooks/, legacy hooks in src/hooks/ are likely inactive.
**Verification method:** ls both hook directories
**Verified by:** Claude + JK
**Impact:** Need to verify which src_figma hooks are actually imported by active pages before assuming src/hooks/ are all dead.

---

### FINDING-054
**Date:** 2026-02-17
**Phase:** 1
**File:** AUDIT_LOG.md
**Claim:** Documentation size is manageable
**Evidence:** 888 lines already. At current pace (50 findings per subsystem survey), projecting 1500-2000 lines before Phase 1 closes.
**Status:** CONFIRMED — restructure required now
**Verification method:** wc -l AUDIT_LOG.md
**Verified by:** Claude + JK
**Impact:** Doc restructure must happen before next batch. See restructure plan below.


---

### FINDING-055
**Date:** 2026-02-17
**Phase:** 1
**File:** App-wide (player creation, player storage, trait system)
**Claim:** SMB4 trait system is implemented and tied to players
**Evidence:** JK confirmed: no traits are tied to players anywhere in the app. Not in player creation UI, not in player data structures, not in storage. smb4_traits_reference.md documents 60+ traits across 5 Chemistry types with tier bonuses. The trait system affects: mojo, clutch, fitness decay, pitch bonuses, batting bonuses, baserunning, fielding — virtually every calculation in the app.
**Status:** CONFIRMED GAP — trait system is completely unimplemented
**Verification method:** Direct user observation
**Verified by:** JK
**Impact:** CRITICAL. If traits are not stored on players, then every engine that depends on trait data (clutchCalculator, mojoEngine, fitnessEngine, adaptiveLearningEngine, relationshipEngine, fameEngine, awardEmblems) is either: (a) running without trait inputs (producing wrong outputs), or (b) has its trait logic pathway dead. This is not a bug — it is a missing foundational layer that the entire advanced stats system depends on. Must verify whether player data structure has a traits field at all.
**Next action:** grep for "trait" in player type definitions and storage files


---

## Findings 056–064 — Index Only
> Full detail in `spec-docs/FINDINGS/FINDINGS_056_onwards.md`

| Finding | Subject | Status |
|---------|---------|--------|
| FINDING-056 | Trait field in unifiedPlayerStorage vs active app types | CONFIRMED GAP PARTIALLY REVISED — field in legacy type only |
| FINDING-057 | Stats Aggregation — seasonAggregator, liveStatsCalculator | CONFIRMED — core aggregation wired at game completion |
| FINDING-058 | Franchise subsystem — franchiseManager, franchiseStorage | CONFIRMED — CRUD layer real; page wiring unknown |
| FINDING-059 | Schedule subsystem — scheduleStorage, scheduleGenerator | CONFIRMED — substantial; active hook exists; page wiring unknown |
| FINDING-060 | src_figma/utils/ re-export barrel pattern | CONFIRMED — all three utils are 1-line re-exports of src/utils/ |
| FINDING-061 | WAR subsystem — 5 calculators + warOrchestrator | CONFIRMED ORPHANED — 3,287 lines unimported by active app |
| FINDING-062 | Fame/Milestone — fameEngine, fameIntegration, milestoneDetector | CONFIRMED PARTIAL — one fn in FranchiseHome; full pipeline orphaned |
| FINDING-063 | Milestone file duplication (not re-exports) | CONFIRMED — milestoneDetector + milestoneAggregator duplicated in two locations |
| FINDING-064 | Offseason/Playoff — storage + active hooks exist | CONFIRMED PARTIAL — hooks active; page wiring unknown |
| FINDING-065 | Mojo/Fitness — usePlayerState wired in GameTracker | CONFIRMED WIRED — live during games; engine backend wiring TBD |
| FINDING-080 | Stats Aggregation — aggregateGameToSeason + liveStatsCalculator | CONFIRMED PARTIAL — aggregation wired at game end; liveStatsCalculator orphaned |
| FINDING-081 | Franchise — franchiseManager + franchiseInitializer | CONFIRMED WIRED — 6 active consumers across pages/hooks |
| FINDING-082 | Schedule — scheduleStorage + scheduleGenerator + useScheduleData | CONFIRMED WIRED — GameTracker, FranchiseHome, SeasonSummary, useFranchiseData |
| FINDING-083 | Salary — salaryCalculator | CONFIRMED WIRED — offseason hook, leagueBuilder, seasonTransition |
| FINDING-084 | Integration wrappers — playerState, fanMorale, narrative | CONFIRMED WIRED — all three exported via engines/index.ts |
| FINDING-085 | liveStatsCalculator | CONFIRMED ORPHANED — inactive path only |
| FINDING-086 | Relationships — relationshipIntegration, useRelationshipData | CONFIRMED WIRED (indirect) — reached via useFranchiseData only |
| FINDING-087 | Narrative — narrativeIntegration, headlineGenerator | CONFIRMED PARTIAL — game recap wired; headlineGenerator orphaned |
| FINDING-088 | Mojo/Fitness — playerStateIntegration full chain | CONFIRMED WIRED — playerStateIntegration → mojoEngine/fitnessEngine/clutch → usePlayerState → GameTracker |
| FINDING-089 | Fan Morale — useFanMorale STUBBED | CONFIRMED STUBBED — hook called live but returns placeholder data; fanMoraleEngine never properly called |
| FINDING-090 | Offseason — useOffseasonData, useOffseasonState | CONFIRMED WIRED — 12 active consumers across all offseason flows |
| FINDING-091 | Playoffs — usePlayoffData | CONFIRMED WIRED — FranchiseHome + SeasonSummary |
| FINDING-092 | Fame/Milestone — multi-path wiring confirmed | CONFIRMED WIRED — per-play hook, direct engine calls, end-of-season; milestones fire at game completion |
| FINDING-093 | UI Pages — complete page→hook map | CONFIRMED — GameTracker(6), FranchiseHome(4), SeasonSummary(4); PostGameSummary/WorldSeries have zero app hooks |
| FINDING-094 | headlineGenerator.ts | CONFIRMED ORPHANED — no active importers |
| FINDING-095 | useAgingData (app/hooks/) | CONFIRMED ORPHANED — SpringTrainingFlow bypasses it with direct engine import |
| FINDING-096 | Clutch Attribution — calculatePlayAttribution never called in active app | CONFIRMED PARTIAL — engine + hook complete; trigger missing; players accumulate zero clutch stats |
| FINDING-097 | Leverage Index — full LI spec implemented; active hook uses boLI only | CONFIRMED PARTIAL — useGameState uses partial boLI at 6 sites; EnhancedInteractiveField uses full LI; relationship modifiers dead |
| FINDING-098 | Clutch Attribution — Phase 2 pattern conformance | CONFIRMED PARTIAL — architecture follows OOTP stat pipeline pattern correctly; disconnection from per-play trigger is the only failure; fix is wiring only |
| FINDING-099 | Leverage Index — Phase 2 pattern conformance | CONFIRMED N — two LI values in flight violates OOTP single-value principle; 6 getBaseOutLI calls in useGameState must be replaced with calculateLeverageIndex |
| FINDING-100 | Legacy Field toggle — silent data loss risk | FIXED 2026-02-18 — toggle removed, legacy branch deleted, DragDropGameTracker.tsx archived, handlePlayComplete stub deleted; -200 lines GameTracker.tsx |
| FINDING-066 | mWAR — useMWARCalculations wired in GameTracker | CONFIRMED WIRED — revises FINDING-061; bWAR/fWAR/pWAR/rWAR still orphaned |
| FINDING-067 | Fame tracking — useFameTracking wired in GameTracker | CONFIRMED WIRED — revises FINDING-062; fameEngine/fameIntegration still orphaned |
| FINDING-068 | Fan Morale — useFanMorale wired in GameTracker | CONFIRMED WIRED — backend engine wiring TBD |
| FINDING-069 | Narrative — generateGameRecap partial wiring | CONFIRMED PARTIAL — thin wrapper wired; full narrative/headline engine orphaned |
| FINDING-070 | Relationship system — all files unwired | CONFIRMED ORPHANED — chemistry/relationships have zero effect on gameplay |
| FINDING-071 | Four-layer architecture pattern confirmed | CONFIRMED — hook layers 3-4 are active surface; layers 1-2 are orphan zone |

