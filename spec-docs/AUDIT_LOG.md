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

## Current Phase: Snake pitcher-hitting recalibration VERIFIED — JK walk next

The usage-aware builder rerun keeps starter POW/CON as explicit rotation-only identity axes for
Bash Brothers, Launch & Leather, Flamethrowers, and HDH Royals, while restoring a visible
Standard/Nerfed selection effect for Flamethrowers and HDH. Exact RP/CP proof confirms ordinary
reliever batting remains role-usage-discounted; Two Way relief batting is full-use but never charged
again in bullpen-secondary rows. All 24 identities stay inside the +/-10% parity band. The separate
audit returned VERIFIED with no Major or Minor findings. Next action: JK's hands-on League Builder
and Snake-room walk remains the sole product gate.

### 2026-07-17 — Existing-room companion republication audit block and repair

JK's Hotseat retained the completed trade while every companion retained the old room after loading
FINDING-235. This is a pre-repair conflict, not a failure of the repaired five-second freshness loop:
the old authoritative write had already stale-rejected, and refresh correctly did not overwrite a
newer cloud base. Contract `SNAKE-COMPANION-HOTSEAT-REPUBLISH-43` adds one explicit commissioner
recovery. It writes only the current room record against that record's exact cloud base and verifies
the accepted content. The first separate auditor returned **BLOCK — Major 1 / Minor 0** because an
affected companion's own pre-Contract-42 whole-room queue would continue rejecting that publication.
The repair adds a room-scoped commissioner publication marker and retires only a superseded legacy
room op proven by its independent board row and by the absence of unpublished companion intent.
The two-device regression adopts the trade/pick order, preserves the private board, and retains an
unrelated pending write; negative regressions preserve an unpublished pick request and trade decline.
The next audit pass found that publish also needed to compare against the exact current cloud room;
otherwise unseen cloud-side companion activity could be overwritten. That check and regression are
now built. Final builder and independent gates are green: 250/250 affected tests, TypeScript,
changed-file ESLint, 2,730-module production build/PWA, diff integrity, and auditor **APPROVE — Major
0 / Minor 0**. JK's same-room click remains the product gate. No new draft or repeated action is
permitted.

---

## PHASE STATUS TRACKER

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| 0 | Inventory | COMPLETE | 2026-02-17 | 2026-02-17 |
| 1 | Architecture Map | COMPLETE | 2026-02-17 | 2026-02-18 |
| 2 | Seams Audit | NOT STARTED | — | — |
| 3 | Known Bug Verification | NOT STARTED | — | — |
| 4 | Debt Inventory | NOT STARTED | — | — |
| SNAKE-1 | Snake mock draft close | PITCHER-HITTING RECALIBRATION VERIFIED — JK RE-WALK PENDING | 2026-07-13 | 2026-07-14 |

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
| FINDING-101 | Fan Morale — 3 bugs: wrong method name (silent no-op), hardcoded season/game, localStorage vs IndexedDB | CONFIRMED — fanMoraleEngine never fires in production; fix is surgical (method rename + season wiring); localStorage gap is follow-on |
| FINDING-102 | Stats Aggregation Pipeline — OOTP Steps 6/7/8/10/11 absent from post-game pipeline | PARTIAL — Steps 5+9 correct; standings (Step 6), leaderboard (7), WAR (8), narrative (10), development (11) not wired into aggregateGameToSeason |
| FINDING-103 | Positional WAR — all 5 calculators correct but warOrchestrator never called; zero callers in active app | N — 3,287 lines produce zero output; fix is one call to calculateAndPersistSeasonWAR() in processCompletedGame.ts |
| FINDING-104 | Trait System — catalog exists, player storage wired, awards ceremony UI exists but trait changes not written back to player record; traitPools.ts never imported | PARTIAL — 3 gaps: (1) player creation needs dropdown not free-text, (2) ceremony must persist trait add/remove to player record, (3) traitPools.ts disconnected; NO engine layer needed per design |
| FINDING-105 | GameTracker / Game State — Row 1 Pattern Map | PARTIAL — pipeline fires on completion ✅; two execution paths with idempotency guards ⚠️; pipeline only covers 2 of 12 OOTP steps (already in F-102/103); no reducer (useState only) |
| FINDING-106 | Stats Aggregation — Row 2 Pattern Map | PARTIAL — batting/pitching/fielding/milestones present ✅; standings/WAR/narrative/development absent (already in F-102/103); aggregation is atomic/sequential ✅ |
| FINDING-107 | Franchise / Season Engine — Row 3 Pattern Map | N — two separate DB systems: per-franchise DB (franchiseManager.ts) never connected to stats stores (trackerDb.ts); stats scoped by seasonId only, no franchiseId; not a blocking bug given single-franchise constraint; FIX-DECISION queued |
| FINDING-108 | Schedule System — Row 6 Pattern Map | PARTIAL — 162-game grid ✅; completion event fires stats pipeline ✅; standings are lazy-derived NOT pushed at game end ❌; GameTracker.tsx comment incorrectly claims completeScheduleGame updates standings; FIX-DECISION queued |
| FINDING-109 | Career Stats — Row 20 Pattern Map | N — separate career table updated incrementally per game (OOTP derives via SUM); pipeline wired correctly ✅; partial-write drift risk if aggregateGameWithMilestones fails midway; FIX-DECISION queued |
| FINDING-110 | WAR — mWAR — Row 4b Pattern Map | PARTIAL — decision recording/resolution/persistence all wired ✅; hardcoded 'season-1' seasonId in init + aggregation calls ❌ (same class as F-101 Bug B); home manager only ⚠️; FIX-CODE (2 lines) queued |
| FINDING-111 | Fame / Milestone — Row 5 Pattern Map | PARTIAL — career threshold detection wired ✅; milestones persist to IndexedDB ✅; de-duplication guarded ✅; narrative trigger on threshold cross ABSENT (confirms F-102 Step 10) |
| FINDING-112 | Offseason — Row 7 Pattern Map | PARTIAL — 11-phase structure ✅; player state reset ✅; season stats archive is localStorage stub (admits "full implementation needed") ❌; clearSeasonalStats scans localStorage but stats are in IndexedDB — clears nothing ❌; FIX-CODE queued |
| FINDING-106 | Stats Aggregation — Row 2 Pattern Map | PARTIAL — fires after every game ✅; 5 of 12 OOTP steps covered; standings/WAR/narrative/dev missing; 'season-1' hardcoded fallback is latent risk |
| FINDING-107 | Franchise / Season Engine — Row 3 Pattern Map | PARTIAL — franchiseId exists at franchise+schedule layer ✅; seasonStorage/gameStorage/offseasonStorage have NO franchiseId scoping ❌; latent multi-franchise isolation gap (no current user impact, DEFER) |
| FINDING-108 | Schedule System — Row 6 Pattern Map | PARTIAL — schedule marks completion ✅; stat pipeline called sequentially not by coupling ⚠️; future code paths could mark complete without aggregating; DEFER as architectural debt |
| FINDING-109 | Career Stats — Row 20 Pattern Map | N — separate careerStorage with incremental writes (contradicts documented Key Decision #1); career can desync from season totals; FIX-DECISION needed: derive-on-read vs idempotency guards |
| FINDING-066 | mWAR — useMWARCalculations wired in GameTracker | CONFIRMED WIRED — revises FINDING-061; bWAR/fWAR/pWAR/rWAR still orphaned |
| FINDING-067 | Fame tracking — useFameTracking wired in GameTracker | CONFIRMED WIRED — revises FINDING-062; fameEngine/fameIntegration still orphaned |
| FINDING-068 | Fan Morale — useFanMorale wired in GameTracker | CONFIRMED WIRED — backend engine wiring TBD |
| FINDING-069 | Narrative — generateGameRecap partial wiring | CONFIRMED PARTIAL — thin wrapper wired; full narrative/headline engine orphaned |
| FINDING-070 | Relationship system — all files unwired | CONFIRMED ORPHANED — chemistry/relationships have zero effect on gameplay |
| FINDING-071 | Four-layer architecture pattern confirmed | CONFIRMED — hook layers 3-4 are active surface; layers 1-2 are orphan zone |
| FINDING-113 | 2026-02-18 | Y | playoffStorage.ts / playoffEngine.ts | Row 8 Playoffs — separate stat tables, bracket seeded from standings, fully wired |
| FINDING-114 | 2026-02-18 | N | usePlayerState.ts / GameTracker.tsx | Row 11 Mojo/Fitness — auto-update disabled by design; zero persistence between games (useState only) |
| FINDING-115 | 2026-02-18 | N | salaryCalculator.ts / leagueBuilderStorage.ts | Row 16 Salary — no service time concept; age-based calc only; KBL design choice |
| FINDING-116 | 2026-02-18 | PARTIAL | leagueBuilderStorage.ts | Row 17 League Builder — entity CRUD correct; no auto-roster generation (by design) |
| FINDING-117 | 2026-02-18 | PARTIAL | museumPipeline.ts / museumStorage.ts | Row 18 Museum/HOF — leaderboard reads career stats; no eligibility gating; post-retirement trigger unverified |
| FINDING-118 | 2026-02-18 | N | agingEngine.ts / SpringTrainingFlow.tsx | Row 19 Aging/Ratings — calc exists but display-only; no write-back to player record; wrong phase |
| FINDING-119 | 2026-02-18 | N | relationshipEngine.ts / useRelationshipData.ts | Row 9 Relationships — full system built; zero active callers; no persistence; completely orphaned |
| FINDING-120 | 2026-02-18 | PARTIAL | narrativeIntegration.ts / GameTracker.tsx | Row 10 Narrative/Headlines — game recap wired; headlineEngine orphaned; story morale dead; recaps not persisted |
| FINDING-121 | 2026-02-18 | N | agingIntegration.ts | Row 22 Player Dev Engine — no 10-factor growth model exists; calculateDevelopmentPotential is display-only label; MISSING |
| FINDING-122 | 2026-02-18 | N | oddityRecordTracker.ts | Row 23 Record Book — oddityRecordTracker exists in legacy engines; zero callers; no standard record book; ORPHANED |
| FINDING-123 | 2026-02-18 | PARTIAL | app/pages/*.tsx | Row 24 UI Pages — legitimate writers (GameTracker, LeagueBuilder) correct by design; pure consumers confirmed; WorldSeries stats leaderboard always empty (no write path to PLAYOFF_STATS — see F-113) |


| FINDING-124 | 2026-02-21 | CONFLICT | TRAIT_INTEGRATION_SPEC / smb4_traits_reference.md | Chemistry type names wrong — specs use 4 invented names (Spirited, Crafty, Tough, Flashy); SMB4 has 5 real types (Competitive, Crafty, Disciplined, Spirited, Scholarly). Resolved: use real SMB4 names. |
| FINDING-125 | 2026-02-21 | CONFLICT | FREE_AGENCY_FIGMA_SPEC / OFFSEASON_SYSTEM_SPEC | FA player exchange rules contradict: Figma said ±10% salary/no position; Offseason said grade+position type. Resolved: ±20% True Value match, no position restriction. |
| FINDING-126 | 2026-02-21 | CONFLICT | PROSPECT_GENERATION_SPEC / FARM_SYSTEM_SPEC | Draft grade range (A–D) vs farm schema (B–C- only) — logical gap in pipeline. Resolved: all grades possible on farm, expand farm schema to full range. Bell curve centered on B/B-/C+ at 15% each. |
| FINDING-127 | 2026-02-21 | DECISION | SALARY_SYSTEM_SPEC / FARM_SYSTEM_SPEC | Rookie salary: resolved as draft-round-based (set at draft, locked until EOS after rookie season). Rating/traits/grade hidden on farm, revealed at call-up — salary unchanged at call-up. |
| FINDING-128 | 2026-02-21 | DECISION | FRANCHISE_MODE_SPEC | Standings tiebreaker: run differential. If still tied, user selects who advances. |
| FINDING-129 | 2026-02-21 | DECISION | LEAGUE_BUILDER_SPEC | Farm population at startup: League Builder includes prospect draft step before Season 1. |
| FINDING-130 | 2026-02-21 | DECISION | OFFSEASON_SYSTEM_SPEC | Stadium change mechanic is v1 scope. New Phase 4 sub-step needed. |
| FINDING-131 | 2026-02-21 | DECISION | SCOUTING_SYSTEM_SPEC | Scout grade deviation: fat-tail distribution. Keep max-deviation-by-position structure; replace uniform probability with fat-tail model — small misses most common, rare outliers beyond current hard cap possible. |
| FINDING-132 | 2026-02-21 | DECISION | DYNAMIC_DESIGNATIONS_SPEC / PERSONALITY_SYSTEM_SPEC | Team captain: v1 scope. Formal designation driven by Charisma hidden modifier. Needs full spec. |
| FINDING-133 | 2026-02-21 | DECISION | NARRATIVE_SYSTEM_SPEC / new UI flow spec | Beat reporter pre-decision warning: v1 scope. Blocking modal before call-up/send-down executes. Conditional on relationship/narrative data. Needs UI flow spec. |

| FINDING-134 | 2026-06-11 | CONFIRMED | FinalizeAdvanceFlow/TradeFlow/AwardsCeremonyFlow/FreeAgencyFlow .tsx | Residual $M-scale salary logic (×/÷1e6 conversions, grade tables, thresholds) in 4 Figma flows invisible to T5 sweep; full text in FINDINGS_056_onwards.md |
| FINDING-135 | 2026-06-12 | DEFERRED | franchiseInitializer.ts | deriveSeasonTotalGames = schedule-row counting feeds SeasonMetadata.totalGames (§4.4 anti-pattern, pre-existing); WAR/milestones now safe via gamesPerTeam (W1); other totalGames consumers unaudited — fold into FINDING-134 discovery slot; full text in FINDINGS_056_onwards.md |

| FINDING-136 | 2026-06-12 | CONFIRMED | 4 Figma offseason flows | F-134 RESOLVED: 25 $M sites, 0 LIVE-BROKEN (two structural gates), 16 latent on offseason flag flip (FA:541 persists ×1e6), 10 sites new vs known list; fix queue F134-T1..T4; full report spec-docs/F134_F135_DISCOVERY_REPORT.md |
| FINDING-137 | 2026-06-12 | CONFIRMED | useSeasonStats.ts:331/:366 | F-135 RESOLVED: 18 totalGames consumers (3 config-truth, 6 row-count-OK, 9 dead); ONE LIVE DEFECT — leader WAR scales by league-total row count: ±Infinity at 0, mis-scale partial AND full; fix F135-T1 = gamesPerTeam + zero-guard |
| FINDING-138 | 2026-06-12 | CONFIRMED | useOffseasonData.ts:292-298 | C-1 promoted: offseason flows read STOCK playerDatabase not franchise stores — denomination fixes necessary but NOT sufficient for flag flip; named precondition on reactivation |
| FINDING-137 | 2026-06-12 | FIXED (F135-T1) | useSeasonStats.ts | Leader WAR season-length defect FIXED — resolveSeasonGamesForWAR (gamesPerTeam-first, 162 fallback w/ warn-once, totalGames banned, finiteWAR clamps); Fable verdict "F135-T1 DELTA VERIFIED", 4 disagreements none MAJOR; M2b test-strength one-liner parked to F135-T2 |
| FINDING-136 | 2026-06-12 | PARTIAL-FIXED (F134-T1) | FreeAgencyFlow.tsx | FreeAgencyFlow cleared — contractValue persists canonical dollars, 7 raw-M formatters → engine formatSalary, ±10% ratio math pinned unchanged; Fable "F134-T1 DELTA VERIFIED" 4/0-MAJOR; contractValue is currently WRITE-ONLY (dead-data candidate → F135-T2 list); Awards/FinalizeAdvance/TradeFlow sites remain (T2/T3/T4) |
| FINDING-139 | 2026-06-12 | DECISION | AwardsCeremonyFlow.tsx | Vote-divisor ruling (JK): 500000 → 1666 (= round(500000 / BRIDGE 300.032521)) — faithful translation of original sensitivity to canonical dollars; redesign deferred unless gameplay shows need. Governs F134-T2. |
| FINDING-140 | 2026-06-12 | DECISION | FinalizeAdvanceFlow.tsx | Rookie call-up salary ruling (JK): DELETE calculateRookieSalary grade table — F-127 canon (salary set at draft, UNCHANGED at call-up) means call-up carries player.salary as-is; recompute-at-call-up was a canon contradiction, not just a scale bug. Governs F134-T3. |
| FINDING-136 | 2026-06-12 | PARTIAL-FIXED (F134-T2+T3) | AwardsCeremonyFlow.tsx, FinalizeAdvanceFlow.tsx | T2+T3 parallel arc VERIFIED: Awards canonical (pass-through, divisor 1666 per F-139 both vote paths, 4 formatters); FinalizeAdvance canonical + F-127 canon (grade table DELETED per F-140, salary unchanged at call-up, thresholds 33330/16665 shared logic+display, ?? 0 fallback). 3 of 4 flows cleared — only TradeFlow legacy branch remains (T4 DELETE). Suite 7,205. |
| FINDING-141 | 2026-06-12 | DECISION | CURRENT_STATE.md + KBL_V1_EXECUTION_PLAN.md + FRANCHISE_ENGINE_MAP.md | Sequencing ruling (JK): full T-stack = v1, runs to completion first (pure execution); F-13x closure = F-136/137 only; D0 then rules as cut line on everything beyond (incl. Elimination Mode, playtest placement); D1-D8 post-D0; F-138 scoped post-D0, flag stays FALSE; 5-session milestone amended. Amendment notices appended to both canonical plan docs. |
| FINDING-136 | 2026-06-12 | FIXED (F134-T1..T4 complete) | all four flows + TradeFlow | FULLY RESOLVED — all 25 $M-scale sites canonicalized (T1-T3) or deleted (T4, ActiveTradeFlow −1,306 lines); Fable "F134-T4 DELTA VERIFIED"; console region byte-identical by hunk arithmetic; FINDING-136 closed |
| FINDING-137 | 2026-06-12 | FIXED + CLEANUP COMPLETE (F135-T2) | 9 files deleted + 2 live-file surgeries | Cleanup tail closed: orphan trio + useWARCalculations + SeasonEndFlow + C-7 duplicate + FranchiseStats (ADDENDUM 1, JK-ruled: type + contract-test block) + un-rendered totalGames; M2b mutant re-run RED against new test; exclusions held; suite 7,113/380 exact reconciliation; Fable "F135-T2 DELTA VERIFIED"; new candidate C-8 (orphan useWARCalculations copy in src_figma) logged |

| FINDING-142 | 2026-06-12 | FIXED-AND-VERIFIED | franchiseValueInputs.ts | Value-input WAR composition dropped persisted pWAR; fixed in TV1, verified by M-142 probe | Full text: FINDINGS_142_onwards.md |

| FINDING-143 | 2026-06-12 | CONFIRMED-OPEN | franchiseValueInputs.ts | valuePosition is profile primaryPosition, not positions actually played (violates R-6 doctrine); TV2/D1 | Full text: FINDINGS_142_onwards.md |

| FINDING-144 | 2026-06-12 | CONFIRMED-OPEN | salaryCalculator.ts | R-6 residue in salary path: UTIL/BENCH→IF/OF + TWO-WAY→OF remaps, DH in tables; taxonomy cleanup batch | Full text: FINDINGS_142_onwards.md |

| FINDING-145 | 2026-06-12 | CONFIRMED-OPEN | franchiseDesignationEligibility.ts | Stale pre-§17 'active' semantics feed context surfaces (no write bypass); one-cleanup with 'active' member + embedded-field scrub; EP1/slice-5 | Full text: FINDINGS_142_onwards.md |

| FINDING-146 | 2026-06-12 | OPEN-BLOCKING | EP1 changeset (deliverable) | EP1-AUDIT MAJOR: golden-regression attribution table ABSENT (contract-required 3×); engine logic mutation-proven but fixture-league delta UNPROVEN; F-143 not delta-certified; remedy EP1-GOLDEN → D8 re-audit → closure | Full text: FINDINGS_142_onwards.md |

| FINDING-147 | 2026-06-12 | CONFIRMED-OPEN | franchiseDesignations.ts:13/:223 | EP1-AUDIT MINOR #1: stale 'peer pools profile-position until EP1' string written live into every designation record's peerPoolLimitation, now FALSE post-EP1; outside only-edit list; couples to F-145; F-144/cleanup batch | Full text: FINDINGS_142_onwards.md |

| FINDING-146 | 2026-06-12 | CLOSED | EP1 golden artifacts | D8 deliverable produced + D8-only re-audit (Opus 4.8 Max) "EP1 D8 VERIFIED"; 52 players/13 changed/0 unattributed, all hand-verified, tw_if 260k/+80k (R-8 pt5) | Full text: FINDINGS_142_onwards.md |
| FINDING-143 | 2026-06-12 | DELTA-CERTIFIED | franchiseEffectivePosition.ts | EP1 effective-position engine resolves valuePosition by starts-plurality, not profile; mutation-proven + delta-certified; R-6 violation closed | Full text: FINDINGS_142_onwards.md |
| FINDING-147 | 2026-06-12 | CLOSED | franchiseDesignations.ts:13 | CLEANUP-F147: stale EP1 limitation string replaced with accurate post-EP1 wording (Option 1, field kept); grep-zero confirmed, suite zero delta | Full text: FINDINGS_142_onwards.md |
| FINDING-148 | 2026-06-14 | CONFIRMED-OPEN | traitPricing.ts AUX_PRICING + extract-iv-data.py | L/R batter base handedness premium (switch>left>right) absent — T1 CONTRACT-SCOPE gap (not extraction/audit failure); lefty premium missing; surfaced by T6 audit finding #1; new ticket JK-gated, regen frozen oracle; ROUTE Codex 5.5\|high→Opus audit | Full text: FINDINGS_142_onwards.md |
| FINDING-149 | 2026-06-18 | RESOLVED | traitCandidateBuilder.ts ↔ traitAcquisition.ts | L9b-3a→L9b-2 SEAM BREAK: L9b-3a emitted a FLAT `TraitCandidate` but `computeTraitAcquisition` consumes `candidate.score.*` (nested `{traitName, score: TraitRealityScore}`). Caught by the decorrelated builder self-audit, verified from source by the Captain. FIX = keep the outcome-weighted RATE signal model (spec §B-faithful; exposure-COUNT alternative is fatally broken — opposing pairs become indistinguishable) AND change the output to `SeasonTraitCandidate extends TraitCandidate` + a seam integration test. tsc 0 / 22 tests / full suite zero new reds. | Full text: FINDINGS_142_onwards.md |
| FINDING-150 | 2026-06-18 | CONFIRMED-OPEN | TRAIT_SIGNAL_CERTIFICATION.md §D vs §VI · traitCandidateBuilder.ts BUILDABLE_TRAITS | L9 trait-reality DETECTION-SCOPE gap (JK-triggered): matrix + scorer + acquisition + the 16 built traits are SOUND, but L9b-3a built only ~16 of the ~39+ traits the RESOLVED §VI model says are buildable from already-persisted/joined data + personality — it inherited the SUPERSEDED §D "needs the ball-strike count" triage. First-pitch traits come free from `pitchesInAtBat`; count-family is personality-primary (Q12, JK now mandates v1); platoon splits buildable since L9a-3 joined handedness. L9a-2 count reframed = precision-only, not a gate (Q1). Next = TRAIT_DETECTION_SCOPE_AUDIT before any rebuild. | Full text: FINDINGS_142_onwards.md |
| FINDING-151 | 2026-07-07 | CONFIRMED-OPEN | FranchiseLensHub.tsx / useFranchiseLensData.ts / FranchiseHome.tsx | CUT1-1 parity gate blocked the `/franchise/:franchiseId` Lens flip: live Lens data includes schedule, standings, next-game, readiness, and lineup context, but the Lens PLAY BALL/SIM controls are inert and there is no SCORE action, `buildFranchiseGameTrackerRoster` launch, or pregame launch/review path equivalent to FranchiseHome. Route flip must wait for a parity ticket. |
| FINDING-152 | 2026-07-13 | CONFIRMED-OPEN — PLAN APPROVED | Snake MLB board / guide / assistant intelligence | Rankings persist without refitting the 22; guide prefers weak one-for-one trades; existing fit/tax/chemistry/scarcity/rival intelligence lacks a separate live Asst GM Board and actionable TAKE/WAIT/TRADE bridge. JK approved the complete batched repair; separate builder/auditor and JK browser gate remain binding. | Full text: FINDINGS_142_onwards.md |
| FINDING-153 | 2026-07-13 | CONFIRMED-OPEN — BATCH 2 CONTRACTED | snakeGuideTrade.ts / leagueConstruction.ts | Duplicate pick ids can pass equal-length guide revalidation then collapse through Set ownership into an unequal-turn trade; execution also trusts caller-supplied values. MLB-only directional/current-value rails and a pool-surplus chart are frozen for Batch 2; farm validation stays unchanged. | Full text: FINDINGS_142_onwards.md |
| FINDING-154 | 2026-07-13 | CONFIRMED-OPEN — BATCH 3 CONTRACTED | SnakeDraftRoom.tsx / SnakeCompanion.tsx / snake desk | Main contextualizes advisor worth while companion uses raw price; no separate derived Asst GM Board exists; current local-slot What-If can affirm a canonically illegal 22. Shared worker-backed Best-22 and selected-player consequence contracts are frozen. | Full text: FINDINGS_142_onwards.md |
| FINDING-155 | 2026-07-13 | CONFIRMED-OPEN — BATCH 4 CONTRACTED | snakeRationalRoom.ts / snake desk / trade guide | Risk is one greedy playout with a 0/1 buyer count, can call a missing next turn SAFE, and uses card-count role depth without affordability/legal-finish proof. A public sensitivity ensemble, real club pressure, viable scarcity/cliffs, and fail-closed TAKE/WAIT/TRADE/PASS bridge are frozen. | Full text: FINDINGS_142_onwards.md |
| FINDING-156 | 2026-07-13 | CONFIRMED-OPEN — BATCH 5 CONTRACTED | MLB snake room / private desk / companion / trade presentation | Duplicate guide and team selectors, retired What-If, hidden/misordered board truth, split selected-player action, incomplete trade cards, and oversized companion/public status dilute the iPad GM path. One team-first lens and four-job private desk are frozen. | Full text: FINDINGS_142_onwards.md |
| FINDING-157 | 2026-07-14 | FIXED-AND-VERIFIED — AMENDMENT 9 | SnakeCompanion.tsx / useSnakeRationalRisks.ts | Cover now creates a real privacy epoch: prior rational-risk results and late pre-cover worker responses cannot reappear when the same seat/key returns. Direct unmocked mutation proof and independent audit are green. | Full text: FINDINGS_142_onwards.md |
| FINDING-158 | 2026-07-14 | FIXED-AND-VERIFIED — AMENDMENT 9 | Snake/League Draft Setup hooks and pages | Assistant/guide state and worker lifecycle now share semantic request identity; same-key clones preserve ready output and changed keys restart cleanly. Exact changed-file no-inline lint is 0/0. | Full text: FINDINGS_142_onwards.md |
| FINDING-159 | 2026-07-14 | FIXED-AND-VERIFIED — AMENDMENT 9 | Snake room / companion / setup identity fallbacks | All contracted missing identities now use exact neutral UNKNOWN PLAYER / UNKNOWN TEAM copy; live fallback sweeps and DOM tests expose neither internal IDs nor CLUB/A PLAYER placeholders. | Full text: FINDINGS_142_onwards.md |
| FINDING-160 | 2026-07-14 | FIXED-AND-VERIFIED — AMENDMENT 10 | deskModel.ts / deskRoomModel.ts / SnakeDraftRoom.tsx / SnakeCompanion.tsx / snakeEconomics.ts | FLEX obeys 13–14H/8–9P canon; all persisted/evaluated boards fail closed on legality/version conflicts; automatic backfill skips unsafe cards, backtracks deterministically, and leaves no-safe boards byte-stable. Final independent re-audit: 0 major/0 minor with direct mutations. | Full text: FINDINGS_142_onwards.md |
| FINDING-161 | 2026-07-14 | FIXED-AND-VERIFIED — LIVE-CRAWL CONTRACT | playerDatabase.ts / leagueBuilderStorage.ts / poolFromDemand.ts / Snake setup proof | Exact six stock roles corrected and guarded-migrated; all 20 stock 22s and the full 506-card universe constructively seat. Hard legality is 20 CP, competitive shaping remains 27, CP-only canon and locked draft bytes preserved. Independent audit: 0 major/0 minor, 181/181. | Full text: FINDINGS_142_onwards.md |
| FINDING-162 | 2026-07-14 | CONFIRMED-OPEN — LIVE-CRAWL CONTRACTED | Snake rational/assistant workers / seating proof / main+companion | A real 506-card early draft left strategy output calculating for tens of seconds and delayed browser work about 40 seconds; after the board became legal, Asst GM still returned UNAVAILABLE and starved the next click. | Full text: FINDINGS_142_onwards.md |
| FINDING-163 | 2026-07-14 | CONFIRMED-OPEN — FIRST RE-AUDIT NOT VERIFIED (7 MAJOR/2 MINOR COMBINED) | SnakeResponsivePreview.tsx / preview fixture / responsive Playwright | Stateful preview still misstates consequence money/refit, enables off-clock and duplicate drafting, leaves drafted cards on boards, fails to move live pick ownership, diverges main/companion finances, and has dead recap/reset/revert semantics. Green tests missed the outcomes. | Full text: FINDINGS_142_onwards.md |
| FINDING-164 | 2026-07-14 | CONFIRMED-OPEN — FIRST RE-AUDIT NOT VERIFIED (7 MAJOR/2 MINOR COMBINED) | SnakeDraftRoomView.tsx / SelectedPlayerCard.tsx / companion frame | Portrait action strip scrolls offscreen with its card sibling; companion lacks independent responsive profile/board workspace at both iPad orientations. Existing anchor test records an already-broken state. | Full text: FINDINGS_142_onwards.md |
| FINDING-165 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | SnakeDraftRoomView.tsx / FARM room tests | FARM hides trade controls but still calls remaining picks tradeable and correction trade-capable. | Full text: FINDINGS_165_onwards.md |
| FINDING-166 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | leagueBuilderStorage.ts / syncEngine.ts | Existing FARM authority can erase its phase and inject retired trade state through local or inbound writers. | Full text: FINDINGS_165_onwards.md |
| FINDING-167 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | syncConfig.ts / Snake rooms / companion | Full sync omits scout/startup stores and post-pull room derivation can use stale player and salary truth. | Full text: FINDINGS_165_onwards.md |
| FINDING-168 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | SelectedPlayerCard.tsx / SnakeDraftRoom.tsx | Production REVERT is a consequence dismissal, not an exact board undo. | Full text: FINDINGS_165_onwards.md |
| FINDING-169 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | snakeFarmSlots.ts | Pristine FARM drafts still use a global curve that valid unequal carryover budgets cannot afford. | Full text: FINDINGS_165_onwards.md |
| FINDING-170 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | SnakeResponsivePreview.tsx | Preview dynamic guide and canned executable offer can contradict each other. | Full text: FINDINGS_165_onwards.md |
| FINDING-171 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | SnakeDraftRoomView.tsx / responsive journey | Landscape player selection clips the sticky action strip under the team header. | Full text: FINDINGS_165_onwards.md |
| FINDING-172 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | SnakeResponsivePreview.tsx | Preview trade nudge and Activity remain hard-coded to a completed or owned pick 19. | Full text: FINDINGS_165_onwards.md |
| FINDING-173 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | leagueBuilderStorage.ts / syncEngine.ts | Post-creation writers can mutate FARM frozen pick order and slot salaries. | Full text: FINDINGS_165_onwards.md |
| FINDING-174 | 2026-07-14 | CONFIRMED-OPEN — DOC CLOSE REQUIRED | active Snake specs/status docs | Active docs still promise FARM draft-pick trades after JK retired them. | Full text: FINDINGS_165_onwards.md |
| FINDING-175 | 2026-07-14 | CONFIRMED TEST GAP — CLOSING GATE REQUIRED | FARM transition/commit/handoff integrations | Real-storage 9+1 and 10+0 FARM boundaries are not proven end-to-end. | Full text: FINDINGS_165_onwards.md |
| FINDING-176 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | SnakeResponsivePreview.tsx companion surface | Cover rotates the preview privacy epoch but restores the prior GM's selected player and assistant pin on return. | Full text: FINDINGS_165_onwards.md |
| FINDING-177 | 2026-07-14 | CONFIRMED TEST REGRESSION — REPAIR CONTRACTED | SnakeDraftRoom.completion.test.tsx | Mandatory sync freshness now falls into real IndexedDB in the completion harness, blocking all 11 correction/recap tests. | Full text: FINDINGS_165_onwards.md |
| FINDING-178 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | syncEngine.ts season-2 bootstrap | Clean-device inbound sync stores a noncanonical FARM authority because season-2 rows bypass canonical MLB-to-FARM creation validation. | Full text: FINDINGS_165_onwards.md |
| FINDING-179 | 2026-07-14 | CONFIRMED TEST REGRESSION — REPAIR CONTRACTED | Snake performance + companion auth harnesses | Fresh storage rereads bypass the mocked hook and fall into missing IndexedDB, so five owned cases never reach their assertions. | Full text: FINDINGS_165_onwards.md |
| FINDING-180 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | backupRestore.ts / League Builder editorial migration test | League Builder is version 10 while backup restore and one migration assertion still declare version 9; isolated restore and schema gates are red. | Full text: FINDINGS_165_onwards.md |
| FINDING-181 | 2026-07-14 | CONFIRMED TEST REGRESSION — REPAIR CONTRACTED | FranchiseSetup.test.tsx | Its storage mock omits the shared FARM season constant, so the season-2 read defaults to season 1 and falsely reports Draft required. | Full text: FINDINGS_165_onwards.md |
| FINDING-182 | 2026-07-14 | CONFIRMED-OPEN — REPAIR CONTRACTED | backupRestore.ts / League Builder v10 migration seam | Generic backup opening can consume the v9→v10 version bump without running the canonical stock-player content migration, permanently stranding old rows. | Full text: FINDINGS_165_onwards.md |

### 2026-07-14 Snake final closure — append-only superseding status

| Finding | Date | Status | Surface | Resolution |
|---------|------|--------|---------|------------|
| FINDING-152 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Snake intelligence | Live board refit, fair trade guide, and coherent decision intelligence shipped. |
| FINDING-153 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | MLB pick packages | Unique/disjoint/current-value/directional transaction rails and fair packages proved. |
| FINDING-154 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | My Board / Asst GM Board | Shared legal solvent worker-backed assistant board and exact consequences proved. |
| FINDING-155 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Rational room | Public scenario range, rival pressure, scarcity, opportunity cost, and action bridge proved. |
| FINDING-156 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Main/companion private desk | One team-first four-job desk and complete trade/profile truth proved. |
| FINDING-162 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Early-draft workers | Production-shape assistant/rational reads return useful results without freezing the room. |
| FINDING-163 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Responsive preview | Covered, stateful, transaction-honest test drive proved. |
| FINDING-164 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | iPad workspace | Stable profile/action plus independently scrolling board proved at both orientations. |
| FINDING-165 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | FARM copy | No retired trade language remains in the live FARM room. |
| FINDING-166 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | FARM writers | Local and inbound writers reject phase removal and trade state. |
| FINDING-167 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Sync freshness | Scout/startup stores synchronize and rooms reread fresh storage after pull. |
| FINDING-168 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Selected-player action | REVERT exists only as exact saved-board undo. |
| FINDING-169 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | FARM salary curve | Every club gets a local 75% curve with exact 3x endpoint ratio. |
| FINDING-170 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Preview trade truth | Preview offer comes from and executes through the real guide engine. |
| FINDING-171 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | iPad selected player | Action strip remains reachable while the board scrolls. |
| FINDING-172 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Trade target signal | Target derives from live ownership and disappears when unreachable. |
| FINDING-173 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Frozen FARM authority | Creation envelope is immutable after sanctioned transition. |
| FINDING-174 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Active Snake docs | FARM draft-pick trades are retired canon; historical references are marked superseded. |
| FINDING-175 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | FARM 9+1 / 10+0 | Real-storage boundary transitions, commits, handoffs, and retries proved. |
| FINDING-176 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Companion privacy epoch | Cover clears private transient choices while preserving durable My Board. |
| FINDING-177 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Correction/recap harness | All 11 cases reach owned assertions with production freshness intact. |
| FINDING-178 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Clean-device FARM sync | Season-2 authority is deferred/rejected until canonical MLB prerequisites prove it. |
| FINDING-179 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Fresh-read harnesses | Performance and companion auth suites use honest fixture-backed storage reads. |
| FINDING-180 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Backup schema | Manual backup/restore matches League Builder v10 and all synchronized stores. |
| FINDING-181 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Franchise Setup test seam | Explicit FARM season-2 read is proved. |
| FINDING-182 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Canonical migration | Backup cannot steal the v9→v10 content migration. |
| FINDING-183 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Backup connection lifecycle | Backup-owned canonical migration connection closes without touching the app singleton. |
| FINDING-184 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Guide worker build | Worker graph is cycle-neutral and production builds all Snake workers. |
| FINDING-185 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Final lint honesty | Lifecycle fixtures retain exact storage types and full snapshot comparison. |

Final evidence: code commit `f8ca392d`; 686 passed files / 10,227 passed tests / zero failures;
17/17 responsive and production-lifecycle browser journeys; strict changed-file lint, TypeScript,
production build, and diff integrity green. JK's browser walk remains the sole acceptance gate.

### 2026-07-14 JK browser-walk repair — append-only finding index

| Finding | Date | Status | Surface | Resolution |
|---------|------|--------|---------|------------|
| FINDING-186 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Assistant board lifecycle | Ordered worker epochs stop board/Optimize loops and stale private results. |
| FINDING-187 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Archetype / Asst GM | Older Snake setup uses saved team archetype; explicit Balanced is preserved. |
| FINDING-188 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Drafted-player truth | Own picks commit, rival picks leave, pools exclude all drafted cards, money truth is exact. |
| FINDING-189 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Recent Picks | Complete expandable numbered pick log is live. |
| FINDING-190 | 2026-07-14 | LOCAL FIX VERIFIED — EXTERNAL SERVICE OPEN | Companion LAN/auth | Real LAN URL/prefill/error truth shipped; active Supabase connection still required. |

Full text: `FINDINGS/FINDINGS_165_onwards.md`. Code commit: `00fd64fe`. Final focused gate:
133/133; exact-tree Playwright: 17/17; independent re-audit: APPROVE. JK's re-walk remains
the acceptance gate.

### 2026-07-14 Snake companion/economy/responsive repair — append-only finding index

| Finding | Date | Status | Surface | Resolution |
|---------|------|--------|---------|------------|
| FINDING-191 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Companion refresh | Serialized minimal refresh and scoped calculation states remove lag/churn. |
| FINDING-192 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Snake roster tax | One roster-local tax authority is invariant across 2/8/20-seat rooms. |
| FINDING-193 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Archetype fit | Exact raw shifts and role-aware need restore team-specific relief fit. |
| FINDING-194 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Assistant GM fallback | Worker and local paths share validation, pin baseline proof, and fail-closed behavior. |
| FINDING-195 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Companion picks | GM intent requires exact atomic Hotseat reauthorization before a pick records. |
| FINDING-196 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Mac/iPad layout | Fine-pointer desktop uses one page scroll; touch devices retain bounded panes. |
| FINDING-197 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | No-clock controls | Normal Pause removed; contextual Resume exists only for an actual stopped state. |
| FINDING-198 | 2026-07-14 | FIXED-AND-INDEPENDENTLY-VERIFIED | Cloud replacement | Explicit replacement snapshots and restores prior cloud data on pre-verification failure. |

Full text: `FINDINGS/FINDINGS_165_onwards.md`. Code commit: `6ae55543`. Full Snake/companion
gate: 499/499; sync/SyncModal: 112/112; build: 2,720 modules; independent delta re-audit:
APPROVE, 168/168. JK's re-walk remains the acceptance gate.

### 2026-07-15 Snake tax/fit/slot walkthrough — append-only finding index

| Finding | Date | Status | Surface | Required resolution |
|---------|------|--------|---------|---------------------|
| FINDING-199 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Legal finish | Exact all-in completion search; only completed proof may block, bounded uncertainty stays OPEN. |
| FINDING-200 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Fit truth | Full-cap pressure plus exact 22-player before/after tax. |
| FINDING-201 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Asst GM board | Canonical backup-C seam, IV depth order, shared affordability law. |
| FINDING-202 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Player profile | Full-name duplicate nicknames suppressed at display time. |
| FINDING-203 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Room navigation | Compact SMB home control is live. |
| FINDING-205 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Snake money law | Seating, Assistant, strategy, setup, main, and companion share one signed sub-cent affordability rule. |

Contract: `contracts/CONTRACT_SNAKE_TAX_SLOT_REPAIR_2026-07-15.md`. JK's browser walk
remains the sole acceptance gate.

### 2026-07-15 Unified draft setup — append-only finding index

| Finding | Date | Status | Surface | Required resolution |
|---------|------|--------|---------|---------------------|
| FINDING-204 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | League Builder Draft Setup | Method, sources, player edits, versions, and identities are one shared setup truth; repeated unlock cannot resurrect a GM removal. |

Contract: `contracts/CONTRACT_UNIFIED_DRAFT_SETUP_2026-07-15.md`. JK's browser walk
remains the sole acceptance gate.

Final repair evidence: builder gate 23 files / 370 tests, typecheck, changed-file ESLint,
production build 2,724 modules, and diff integrity clean. Independent frozen-tree audit:
APPROVE, 22 files / 327 tests, zero blocker/major/minor findings. Freshly fetched
`origin/main`: `ea66830e`. JK's browser walk remains the sole product-acceptance gate.

### 2026-07-15 Legends libraries, draft personality, and Snake soul handoff — append-only finding index

| Finding | Date | Status | Surface | Required resolution |
|---------|------|--------|---------|---------------------|
| FINDING-206 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Historical Legends source libraries | Career/Draft/Peak become stable selectable source cohorts instead of one unassigned player dump. |
| FINDING-207 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Draft personality lifecycle | Legends preserve authored/person-level truth; non-Legends initialize once; hidden values stay off draft surfaces. |
| FINDING-208 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Snake player morale | MLB/FARM use pick versus frozen full-pool expectation with pay neutral and frozen public outcomes. |
| FINDING-209 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Snake fan morale | Cumulative relative team-archetype alignment drives one shared private live/frozen result. |
| FINDING-210 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | FARM fog / manifest | Full 3× hidden ranking drives the calculation but no prospect rank enters the manifest. |

Contract: `PROMPT_CONTRACTS.md` section `SNAKE-LEGENDS-LIBRARIES-PERSONALITY-MORALE-26`.
Code commit: `2efcef63`. Independent final verdict: **APPROVE**. JK's browser walk remains
the sole product-acceptance gate.

### 2026-07-15 Pitcher-hitting archetype identity — append-only finding index

| Finding | Date | Status | Surface | Required resolution |
|---------|------|--------|---------|---------------------|
| FINDING-211 | 2026-07-15 | FIXED-AND-INDEPENDENTLY-VERIFIED | Snake exact role fit | A real identity with no axis for the player's role resolves to neutral instead of falling through to generic band fit. |

Contract: `PROMPT_CONTRACTS.md` section `SNAKE-PITCHER-HITTING-IDENTITY-28`. Standard and
Nerfed are the tuned product tiers; Juiced remains compatibility-only. Independent final verdict:
**APPROVE**. JK's browser walk remains the sole product-acceptance gate.

### 2026-07-15 Snake identity close — append-only finding index

| Finding | Date | Status | Surface | Required resolution |
|---------|------|--------|---------|---------------------|
| FINDING-212 | 2026-07-15 | CONFIRMED-OPEN (PRE-EXISTING) | Production build | Resolve the Vite/PWA code-split worker format in a separate bounded build-plumbing repair. |

The identity diff is independently approved and does not touch the failing worker or Vite config.
Dev/test/type gates are green; JK's browser walk remains the product-acceptance gate.

### 2026-07-16 Usage-aware pitcher-hitting recalibration — append-only finding index

| Finding | Date | Status | Surface | Required resolution |
|---------|------|--------|---------|---------------------|
| FINDING-213 | 2026-07-16 | FIXED-AND-INDEPENDENTLY-VERIFIED | Starter-hitting identity value | Exact zero-axis ablation and lower-bound sweep verified the final +30% Flamethrowers POW/CON, +40% HDH CON, and unchanged Bash/Launch values. |

Contract: `PROMPT_CONTRACTS.md` section `SNAKE-PITCHER-HITTING-RECALIBRATION-30`.
Implementation commit: `9ace5857`. Builder proof is 6/6 focused plus 136/136 surrounding tests,
48/48 priority-tier identity rosters legal/solvent, all 72 value rosters legal/solvent, the contested
eight-team production-shape gate solo-green, TypeScript, lint, and diff integrity. RP/CP and Two Way
relief cases are pinned. The separate non-builder audit returned **VERIFIED**, with no Major or Minor
findings: 6/6 recalibration, exact `9e5901d7` ablation 1/1, 186/186 surrounding tests, 72/72 parity
rosters and 48/48 identity rosters legal/solvent, independently reproduced lower bounds, and clean
TypeScript/lint/diff gates. JK's browser walk remains open.

### 2026-07-16 Draft Setup browser-gate feedback — append-only finding index

| Finding | Date | Status | Surface | Required resolution |
|---------|------|--------|---------|---------------------|
| FINDING-214 | 2026-07-16 | FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN | Snake player editor | Shared editor mounted in Snake; builder component gates and independent audit are green. |
| FINDING-215 | 2026-07-16 | FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN | Shaped pool / chosen identities | Live unique-person identity certificate, honest UNKNOWN, BUILD-scoped widening, actual-mode persistence, and source-role diagnostics are independently approved. |
| FINDING-216 | 2026-07-16 | FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN | Setup certificate / board parity | Cross-position sibling alternatives survive the bounded nonlinear search while final legal plans reserve one person; incomplete search fails closed. |
| FINDING-217 | 2026-07-16 | FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN | Legends version handling | Compact all-card setup, safe unsaved-legacy migration, sibling-retirement ticker, undo removal, and fail-closed version optimization are independently approved. |
| FINDING-218 | 2026-07-16 | FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN | Snake identity picks | Identity saves remain local after persistence; a separate auditor approved the removal of redundant full-data and pool refreshes. |
| FINDING-219 | 2026-07-16 | FIXED-AND-INDEPENDENTLY-VERIFIED — JK BROWSER RE-WALK OPEN | Draft Setup mount | Requested league resolution is synchronous and hidden mount-time BUILD is removed; a separate auditor approved with explicit BUILD preserved. |

Contract: `contracts/CONTRACT_DRAFT_SETUP_BROWSER_FIXES_2026-07-16.md`. Builder and auditor are
different agents. No commit, merge, or deploy is authorized; JK's browser re-walk remains the sole
product-acceptance gate.

Builder repair handoff after the first rejected audit: all seven deltas are implemented. The exact
repaired-tree focused matrix passes 8 files / 187 tests, TypeScript and changed-file ESLint are
green, the post-lint seating-proof delta passes 14/14, and diff integrity is clean. Production build
was not rerun by coordinator instruction. This
is builder evidence only: the original non-builder auditor must recheck the frozen tree, and JK's
browser re-walk remains the sole product-acceptance gate. No commit, merge, push, or deploy is
authorized.

### 2026-07-16 Draft Setup second independent audit and builder repair

The same non-builder auditor returned **REJECT** with three Majors and no Blockers: Assistant could
pre-collapse sibling cards to a legal non-optimal 198 assignment instead of the 293 weighted
optimum; Full Sources could persist a removal that its hard keep restored; and Full Sources UNKNOWN
copy fell back to shaped-pool guidance after reload or a receipt-clearing manual edit.

The original builder removed the pre-collapse and placed exact one-capacity version-group matching
inside the weighted identity optimizer, cleaned the Full Sources removal ledger from final
membership before state/persistence, and keyed UNKNOWN copy to persisted `poolAssemblyMode`.
Builder gates are Assistant 21/21, residual Full Sources 2/2, combined optimizer/default-caller/UI
78/78, TypeScript, changed-file ESLint, and diff integrity. Production build was not run by
coordinator instruction. This is builder evidence only; status remains **BUILT — INDEPENDENT
RE-AUDIT PENDING**. No commit, merge, push, or deploy is authorized, and JK's browser re-walk
remains the product-acceptance gate. The original target worktree and its pre-existing
`archetypeBalanceSimulator.ts` collision remain untouched.

### 2026-07-16 Draft Setup third independent audit and builder repair

The same non-builder auditor returned **REJECT** with two Majors: the additive exact assignment did
not exhaust arbitrary-length nonlinear roster exchanges, and optional slot-preference scoring
changed the default no-group Best 22 path.

The original builder retained the assignment. Exclusive-version optimization now uses the additive
assignment only as a seed, then runs a separately capped deterministic simple-cycle search over all
relevant unpinned occupied groups and evaluates the actual legality, nonlinear tax, value-floor,
and fit objectives. Cap or pass exhaustion marks the result incomplete and Assistant fails closed;
two-cycle, four-cycle, and deterministic cap-hit regressions are pinned. The no-group path again
uses literal `rosterFitScore(players)`, with omitted-option parity under nonzero preference/rank
inputs.

Builder gates are 12 changed test files / 246 tests, optimizer/default/Assistant 51/51, exact-tree
TypeScript, all-changed-file ESLint, diff integrity, and a successful 2,729-module production build.
Full-repository lint still reports 939 pre-existing problems outside the changed-file gate. This is
builder evidence only; status remains **BUILT — INDEPENDENT RE-AUDIT PENDING**. No commit, merge,
push, or deploy is authorized. The target worktree remains untouched, and JK's browser re-walk is
the sole product-acceptance gate.

### 2026-07-16 Draft Setup fourth independent audit and builder repair

The same non-builder auditor returned **REJECT** with one Major: completion followed only the
winning baseline/identity board, so a cap hit in an executed but unselected start could be discarded
and Assistant could report READY.

The original builder retained the narrow repair. Baseline completion now ANDs every executed value
and fit start; identity completion ANDs both identity starts. The winning board is still selected by
the existing objective and feasibility rules, but any incomplete executed start propagates
`optimizationComplete=false` and Assistant fails closed. Two real Assistant regressions isolate the
secondary baseline start and the unselected identity start respectively. The identity regression's
test-only 10-second timeout accommodates deliberate exhaustion of the unchanged 250,000-candidate
production cap; no product timeout or cap changed.

Builder gates are focused simulator/Assistant 31/31, exact-tree TypeScript, narrow changed-file
ESLint, and diff integrity. The prior production build remains green; it was not rerun because only
about 1.58 GiB remained. This is builder evidence only; status remains **BUILT — INDEPENDENT
RE-AUDIT PENDING**. No commit, merge, push, or deploy occurred. The external target worktree now
points to clean `codex/home-bar-proportions` at `7ba9922f`; the builder did not modify tracked files
there. JK's browser re-walk remains the sole product-acceptance gate.

### 2026-07-16 Draft Setup final independent re-audit — APPROVE

The same non-builder auditor returned **APPROVE** with zero actionable findings. Baseline completion
ANDs every executed value/fit start, identity completion ANDs both identity starts, and either capped
unselected start forces Assistant `INCOMPLETE_BOARD` independently of the winning board. The
auditor's narrow run passed 48/48 tests and `git diff --check`; no diagnostic or test-only production
seam was found. This is code-audit approval only. JK's browser re-walk remains the sole
product-acceptance gate. No commit, merge, push, or deploy occurred.

### 2026-07-16 Snake Draft browser walkthrough wave 2 intake

JK approved the next live-room correction batch. FINDING-220 through FINDING-224 record the five
confirmed seams: inconsistent CP assignment, visually ambiguous committed players, repeated
per-row unavailable-risk noise, missing local GM decision views, and stale explanatory/placeholder
copy. Contract `SNAKE-DRAFT-WALKTHROUGH-WAVE-2-33` freezes the scope and performance law.

The clean PR #115 head `d7858e7b` is the implementation base; the dirty root checkout is excluded.
Baseline production build is green. The pre-change full-suite result is being recorded separately
before implementation. Builder work is not an audit, and JK's real-browser walkthrough remains the
only product-acceptance gate.

### 2026-07-16 Snake Draft browser walkthrough wave 2 — independent close

Implementation `c4f1c58f` and test-alignment follow-up `cf033728` close FINDING-220 through
FINDING-224: committed-roster/CP truth, team-colored roster rows, actionable-only player risk,
memoized GM sorts and filters with context-aware `TOP`, and Help-gated methodology. The first
separate read-only audit returned NOT VERIFIED with one confirmed edge: a complete saved board could
skip CP refitting when both owned closers were already present but assigned in the wrong order.

Repair `8a2602eb` changes only saved-board reconciliation and its direct regressions. The same
auditor returned **APPROVE — zero findings** after verifying the exact persisted-board case, the
fail-closed committed-player checks, undrafted-extra-closer removal, 40/40 desk proof, the exact
Assistant closer proof, and diff integrity. Builder combined gates passed 67/67 closer/model/Assistant
and 45/45 main/companion. The broader production/page/model gate is 139/139 and lifecycle proof is
36/36; TypeScript, changed-file lint, production build, and diff integrity are green. Live Mac/iPad
checks found no horizontal overflow or console errors; local sorts measured 38-61 ms, fit filters
22-83 ms, and position-context `TOP` 279 ms. This is engineering approval only. JK's browser re-walk
remains the sole product-acceptance gate.

### 2026-07-17 Snake fit and shaped-pool correctness follow-up — append-only finding index

| Finding | Date | Status | Surface | Required resolution |
|---------|------|--------|---------|---------------------|
| FINDING-225 | 2026-07-17 | IMPLEMENTED — INDEPENDENTLY VERIFIED; JK BROWSER GATE PENDING | Snake room FIT | FIT is identity-only across the exact 440; tax remains separate. |
| FINDING-226 | 2026-07-17 | IMPLEMENTED — INDEPENDENTLY VERIFIED; COMBINED PREVIEW/JK GATES PENDING | Snake shaped pool | Production-identity exact 238/264 proof independently verified. |
| FINDING-228 | 2026-07-17 | IMPLEMENTED — INDEPENDENTLY VERIFIED; COMBINED PREVIEW/JK GATES PENDING | Snake chosen-identity certificate | Exact adapter Full/238/264 and all-24 four-club proof independently verified. |

### 2026-07-17 Snake chosen-identity certificate coverage gap

Performance integration supplied the first real production-browser proof of the correctness commit.
The page stayed responsive, but the eight-club journey honestly auto-widened to 440 with
`identity-proof-unknown`. A two-club Murderers Row/Whiteyball room and a synchronous direct engine
call on the same exact 440 input returned the same result, excluding worker transport. The permanent
calibration was false-green because it supplied `capIdentity` without production's
`identityArchetype`; correcting that field reproduces the Full Sources failure in 26.35 seconds.

FINDING-226 is reopened under FINDING-228. Performance code remains frozen and green. Contract
`SNAKE-IDENTITY-CERTIFICATE-CORRECTNESS-36` owns a separate bounded search-construction repair and
production-input calibration, followed by a separate non-builder audit. No readiness, identity,
money, legality, value-floor, embodiment, version, pool-size, or performance law may be weakened.

### 2026-07-17 Snake chosen-identity certificate — builder repair

The corrected production-input regression failed at exact 440 Full Sources before shaping. The
narrow repair adds one generic deterministic constructor inside `snakeSeatingProof`: clubs build
canonical identity rosters from remaining version groups in four bounded orderings, while each
club's value floor remains anchored to its Full Sources baseline. No assignment is trusted from that
construction. The existing independent validator recomputes and must accept disjoint people, legal
22, exact settlement money and bills, the Full Sources optimal-posture IV floor, and strict positive
identity embodiment before SUCCESS can return. The prior generic matcher and honest UNKNOWN tail
remain unchanged fallbacks.

Builder proof passes the exact production adapter rather than a hand-built cap-only input: mixed
eight-club Full Sources plus 238 Competitive and 264 Loose, two-club Murderers Row/Whiteyball Full
Sources, and four simultaneous clubs for every one of the 24 archetypes against exactly 440 assigned
SMB4 players. The original synthetic strict-identity UNKNOWN remains UNKNOWN. Surrounding gates are
107/107 proof/adapter/pool/desk, 49/49 Draft Setup, TypeScript, changed-file lint, 2,729-module
production build/PWA, and diff integrity. This is builder evidence only; the diff is now frozen for
a separate non-builder audit. Performance integration and browser latency files remain untouched.

### 2026-07-17 Snake chosen-identity certificate — independent close

A separate non-builder auditor returned **APPROVE — Major 0 / Minor 0**. It traced the real
`buildSnakeSetupProofInput` path and confirmed that both `capIdentity` and `identityArchetype` reach
the permanent exact-440 calibration. It verified the bounded four-order constructor, immutable Full
Sources value-floor translation, identity-specific Legend version selection with whole-person group
consumption, and the unchanged validator's independent checks for disjoint identities, legal 22,
exact settlement bills and money, source-relative IV floor, and strict positive identity embodiment.
The honest UNKNOWN fallback remains intact.

Independent reruns passed the exact calibration 4/4 in 278.32s, seating proof 14/14, adapter proof
12/12, TypeScript, changed-file ESLint, the 2,729-module production build/PWA, and diff integrity.
This closes the correctness-lane audit only. Performance re-integration, combined independent audit,
one preview, and JK's real browser walk remain open; no merge or deployment is authorized.

### 2026-07-17 Snake FIT and shaped-pool correctness — independent close

The exact 440-player trace confirmed two separate correctness defects: tax pressure overwrote the
identity FIT label, and all independent identity claims plus structural floors could silently expand
named 238/264 pools to 336/344. Contract `SNAKE-FIT-POOL-CORRECTNESS-34` kept the repair separate
from proof scheduling and latency work.

The implementation makes FIT identity-only, derives shaped membership from the exact Full Sources
simultaneous certificate plus the established position floor, trims evictable quota overfill, and
requires a feasible final proof inside the actual named bound. The real 440 regression returns exact
238 Competitive and 264 Loose pools with all 176 certificate players and no LOCKED club. Auto-widen
uses only wider named presets or honest Full Sources. Reset clears hand edits while retaining the
persisted actual preset and re-enters the same certificate path.

The first separate read-only audit rejected a Reset Edits bypass and a missing pre-shape injection
receipt. Both received narrow repairs. Its next pass exposed a mutation-dishonest reset test; the
contract was clarified to retain the persisted widened preset, and the test now models production
`replaceLeagueLocal`, rerenders at Loose, and proves the 300-player source plus 264-player final
candidate. Final auditor verdict: **APPROVE — Major 0 / Minor 0**. Builder gates include 83/83
engine/desk tests, 28/28 universe tests, 21/21 pool-lock tests, 2/2 exact-440 calibration tests,
TypeScript, changed-file ESLint, production build, and diff integrity. No merge, push, deploy, or
preview occurred. Performance integration, combined independent audit, one preview, and JK's real
browser walk remain downstream gates.
### 2026-07-17 — Combined Snake identity-correctness and proof-performance audit

Separate non-builder verdict on integration `68c0f0c0`: **APPROVE — Major 0 / Minor 0**. The auditor
passed 134 focused combined tests, TypeScript, changed-file ESLint, the 2,730-module production build
with the Snake setup-proof worker emitted, and both diff checks. It confirmed correctness-owned files
are byte-identical to approved `ca4cc14b`, performance runtime is byte-identical to approved
`503362af` except those correctness files, and the restored permanent contract/FINDING-227/229 records
close the documentation gate. Exact-stock calibration 4/4 remained green in the builder integration
run. FINDING-229 stays deferred for legacy/malformed saved-room recovery. JK's real browser walk is
the final acceptance gate; no merge or deploy is authorized.

### 2026-07-17 — Legends import and four-team Draft Setup recovery

FINDING-230 is fixed under contract `LEGENDS-DRAFT-TARGET-RECOVERY-37`. Exact legacy Legends cards
with only closed SML/MLB assignments can now be reclaimed; user assignments still block repair.
Draft Setup cannot target a source library, and stock refresh preserves authoritative user-league
team membership, player assignments, rosters, registered pools, and draft sessions. The separate
auditor returned **APPROVE — Major 0 / Minor 0** after rejecting three earlier preservation gaps.
Focused 115/115, TypeScript, lint, production build, and diff integrity are green. JK's browser repair
click remains the product gate; no merge, push, or deploy is authorized.
## 2026-07-17 — Snake Two Way catcher board materialization (Contract 38)

- Builder reproduced the production blocker red-first with a legal 14-hitter/8-pitcher certificate
  whose second catcher coverer is a Two Way starter. Before repair, setup failed with broken `SP4`.
- The narrow repair changes only board-slot materialization and display: roster-wide canonical
  legality remains the final authority, and ordinary fifth-bench rows display as `FLEX5`.
- Separate non-builder verdict: **APPROVE — Major 0 / Minor 0**. The auditor confirmed catcher
  preference, unique player/version enforcement, fail-closed seed/reorder/backfill validation, and
  shared My/Assistant rendering.
- Independent gates: 13 files / 154 tests, TypeScript, changed-file ESLint, 2,730-module production
  build/PWA, and diff integrity green. JK's browser retry remains the only acceptance gate.

| FINDING-232 | 2026-07-17 | FIXED — INDEPENDENTLY APPROVED | deskModel.ts / deskRoomModel.ts / SnakeDraftSetupAdapter.helpers.ts | Exact certified legal staffs now materialize without a stricter display-row law or outside substitution. |
| FINDING-233 | 2026-07-17 | FIXED — INDEPENDENTLY APPROVED — JK BROWSER VERIFIED | LoginForm.tsx / supabase.ts / focused tests | Chrome quota now falls back only the Supabase token to tab storage; rejected/stalled sign-in has actionable status. |
| FINDING-234 | 2026-07-17 | FIXED — INDEPENDENTLY APPROVED — JK RETEST PENDING | CompanionClaimScreen.tsx / SnakeDraftRoomView.tsx / SnakeDraftRoom.tsx | Pending devices can resend room claims; Hotseat shows an exact pending count without auto-opening private details. |
| FINDING-235 | 2026-07-17 | FIXED — INDEPENDENTLY APPROVED — JK RETEST PENDING | leagueBuilderStorage.ts / companionFreshness.ts / SnakeDraftRoom.tsx | Private boards no longer publish stale room copies; open devices adopt board revisions and authoritative picks/trades/corrections force-publish. |

### 2026-07-17 — Companion live-room propagation independent close

The separate non-builder auditor returned **APPROVE — Major 0 / Minor 0**. It confirmed that an
independent board edit queues only its standalone row, both cloud arrival orders preserve the
authoritative room and newest board, already-open Hotseat/companion pages detect MLB and FARM board
revision changes, and completed picks, trades, and corrections strict-flush the saved room. A failed
publication accurately says the action was saved locally and never invites a duplicate action.
Independent gates passed 8 focused files / 230 tests, TypeScript, changed-file ESLint, the
2,730-module production build/PWA, and diff integrity. JK's same-room browser walk remains the final
product gate; no new draft is required and no push, merge, or deploy is authorized.
