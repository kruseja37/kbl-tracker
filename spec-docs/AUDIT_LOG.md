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
| 10 | Size and content of gameStorage.ts and processCompletedGame.ts? | 2026-02-17 | Pending next read |
