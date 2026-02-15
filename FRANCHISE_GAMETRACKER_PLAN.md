# Franchise + GameTracker Remediation Plan

## Objectives
1. Close the remaining high/medium priority GameTracker bugs that affect exit flow, lineup access, stadium context, and special-event logging (see `specs/GAMETRACKER_BUGS.md`).
2. Verify wiring between `FranchiseHome` → `GameTracker` → persistence layers so played games update franchise storage, schedule, and narrative data consistently (guided by `PROJECT_BIBLE.md` and `specs/CURRENT_STATE.md`).
3. Reconcile architecture/constant drift identified in `specs/KBL_Guide_v2_Spec_Reconciliation.json`, especially GameTracker undo limits, event enumerations, and season phase triggers.
4. Formalize franchise-mode data isolation (per `specs/FRANCHISE_MODE_SPEC.md`) and ensure tests hit the key API contracts described in `specs/testing/FRANCHISE_API_MAP.md` + `specs/testing/ENGINE_API_MAP.md`.

## Phase 1: Critical GameTracker Fixes (P0/P1)
- `BUG-006`: Simplify exit-type flow so only one modal is required (`src/components/GameTracker/AtBatFlow.tsx`).
- `BUG-009`: Surface a lineup/roster modal from the GameTracker header, showing mojo/fitness (per spec callouts in `PROJECT_BIBLE.md` pages >1050).
- `BUG-012`: Add stadium selection/context while initializing games; ensure `stadiumName` flows through `GameTracker` initialization and persistence.
- `BUG-014`: Log special plays via `runPlayDetections` → `logFieldingEvent` → Fame systems and ensure context appears in the activity log.

### Phase 1 bug mapping
Each remaining bug above is tied to specific components and spec references to keep the fix scoped and auditable:
1. **BUG-006 (Exit modal double entry)** — `src/components/GameTracker/AtBatFlow.tsx` should use the modal defined in `AtBatFlow` to handle both button tap and entry, per the UX described in `PROJECT_BIBLE.md` Franchise UX section (Franchise UI, AtBatFlow). Verify `hookExitSelection` only surfaces once and that the `result` button resolves the modal submission rather than opening it twice.
2. **BUG-009 (Lineup access)** — `src/components/GameTracker/index.tsx` must expose a `LineupModal` that consumes `usePlayerState`/`useFranchiseData`, mirrors the mojo/fitness badges from the scoreboard, and references the roster schema in `specs/KBL_TRACKER_UI_UX_PLANNING.md`. This ensures players see the same stats the spec expects for mid-game adjustments.
3. **BUG-012 (Stadium association)** — During game bootstrap (`GameTracker.tsx` and `hooks/useGameState.ts`), propagate `stadiumName` from `FranchiseHome` via `buildGameTrackerRoster` and into `processCompletedGame`/`seasonStorage` so it matches the `specs/GAMETRACKER_DRAGDROP_SPEC.md` context rules and `FRANCHISE_MODE_SPEC.md` park-factor expectations.
4. **BUG-014 (Special plays logging)** — `runPlayDetections` and `logFieldingEvent` in `src/components/GameTracker/index.tsx`/`AtBatFlow.tsx` must persist the special-play type to the activity log, call the Fame engine hooks described in `specs/GAMETRACKER_DRAGDROP_SPEC.md`, and register the event under the correct `FameEventType` so downstream game analytics in `specs/STAT_TRACKING_ARCHITECTURE_SPEC.md` can consume it.

## Phase 2: Franchise ↔ GameTracker Wiring
1. Verify `FranchiseHome` uses `buildGameTrackerRoster` and `GameTracker` routes include all required params (`leagueId`, `franchiseId`, `scheduleGameId`, `stadiumName`, `seasonNumber`).
2. Ensure `useGameState` persists final games via `processCompletedGame`, `seasonStorage`, `careerStorage`, `scheduleStorage`, and `playoffStorage` every time `hookEndGame` runs.
3. Drive UI updates in `useFranchiseData`, `useScheduleData`, `usePlayoffData` when games complete or seasons advance (look for `invalidateQueries` or state resets).
4. Add verification checks for the undo stack cap (implement constant from `specs/KBL_XHD_TRACKER_MASTER_SPEC_v3.md`).

## Phase 3: Spec Reconciliation Sweep
- Compare `specs/KBL_Guide_v2_Spec_Reconciliation.json` entries tagged `gametracker` or `franchise` to code constants; create tests or assertions for field names/values that previously diverged.
- Confirm `Season config` lengths, `FameEventType` coverage, and milestone threshold rules match both `src/types` and spec docs (update cross-imports as needed).

### Reconciliation focus
| Spec area | Correct value | Code locations to verify | Verification action |
|---|---|---|---|
| `GameTracker — Undo, Input System` | `undo_stack_max = 20` per `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` | `src/components/GameTracker/index.tsx` `undoStack`, `src/src_figma/__tests__/gameTracker/undoSystem.test.ts` | Add `MAX_UNDO_STACK` constant, ensure `useUndoSystem` enforces cap, and coverage test pushes 21 plays to assert oldest entry drops. |
| `Season Configuration — Lengths, Phases, Timing` | Season lengths: `24, 32, 40, 48, 56, 81, 100, 162`; All-Star/Trade deadlines at 60/65% of season, not fixed counts | `src/types/war.ts`, `src/utils/leagueStorage.ts`, `src/utils/milestoneDetector.ts`, `specs/KBL_XHD_TRACKER_MASTER_SPEC_v3.md` | Update `SeasonLength` enum/consts, ensure `scheduleEngine` uses percentages, add regression test verifying league length list matches master spec, log mismatch in `PROJECT_BIBLE.md`. |
| `Special Events — Definitions, Missing Events` | Fame events cover full `FameEventType` union (~80+ entries) and special plays from `runPlayDetections` should map to those types | `src/types/game.ts`, `src/hooks/useFameDetection.ts`, `src/components/GameTracker/index.tsx` | Validate event-to-Fame mapping via targeted unit test, ensure `logFieldingEvent` persists special_play metadata, and include spec list in `FRANCHISE_GAMETRACKER_TEST_PLAN.md`. |

## Phase 4: Franchise Mode Data Isolation
1. Frame each franchise as a separate IndexedDB per `specs/FRANCHISE_MODE_SPEC.md`; update `franchiseManager` and `trackerDb` helpers accordingly.
2. Ensure `App` loads `kbl-app-meta` to list franchises and `getFranchiseDBName()` is used consistently.
3. Add metadata tracking (last played, storage size, total seasons) and make sure actions like `deleteFranchise`/`exportFranchise` respect isolation.
4. Coordinate with `specs/testing/FRANCHISE_API_MAP.md` and `ENGINE_API_MAP.md` to cover all engine/storage APIs in tests.

## Phase 5: Testing & Verification
- Extend existing Vitest journey tests (`test-utils/journeys/*`) to cover newly restored flows.
- Add targeted unit tests for bug patterns (e.g., exit modal flow, planned stadium selection) referencing `specs/testing/TESTING_IMPLEMENTATION_PLAN.md`.
- Run full manual verification cycle noted in `CURRENT_STATE.md` (regular season, playoffs, offseason, Season Advancement). Document results in `SESSION_LOG.md`.

## Deliverables
1. `FRANCHISE_GAMETRACKER_WIRING_MATRIX.md` (maps UI actions to backend calls).  
2. `FRANCHISE_GAMETRACKER_TEST_PLAN.md` (lists regression and new tests).  
3. Updated `PROJECT_BIBLE.md` sections that track status changes (if needed).  
4. Tiered bug/phase tracker annotated with spec references.
