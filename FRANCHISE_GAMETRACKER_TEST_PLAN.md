# Franchise + GameTracker Test Plan

Structured to cover the Phase 1-5 deliverables from `FRANCHISE_GAMETRACKER_PLAN.md` via automated suites and manual verification.

## Automated Regression Scope
| Focus | File(s) | What to Assert | Reference | Notes |
|---|---|---|---|---|
| Exit Modal Flow | `src/src_figma/__tests__/GameTracker/exitFlow.test.ts` (new) | Single modal path for exit-type selection, no double click required | `specs/GAMETRACKER_BUGS.md` BUG-006 | Use mocked `useGameState` to simulate button clicks and ensure only one prompt opens |
| In-game Lineup Access | `src/src_figma/__tests__/GameTracker/lineupModal.test.ts` | Lineup modal renders, mojo/fitness data matches `usePlayerState` | `PROJECT_BIBLE.md` (Player states) + `BUG-009` | Confirm modal buttons load roster players; test that mojo/fitness badges match engine values |
| Stadium Selection | `src/src_figma/__tests__/GameTracker/stadiumContext.test.ts` | Playing location propagates into `processCompletedGame` and `seasonStorage` entries | `specs/GAMETRACKER_DRAGDROP_SPEC.md` + `FRANCHISE_MODE_SPEC.md` | Inject `stadiumName` in navigation state, assert stored `completedGame` includes it |
| Special Event Logging | `src/src_figma/__tests__/GameTracker/specialEvents.test.ts` | `logFieldingEvent` called, activity log updated, FameEvent persisted | `BUG-014` + `FRANCHISE_GAMETRACKER_WIRING_MATRIX.md` entry | Use fake IndexedDB to inspect `eventLog` store after runPlayDetections notification |
| Franchise Game Completion | `test-utils/journeys/06-full-season-flow.spec.ts` | Played game writes to season/career/schedule/metrics | `specs/testing/FRANCHISE_API_MAP.md` + `CURRENT_STATE.md` Completed pipeline checklist | Extend existing journey to assert storage counts and `useFranchiseData` refresh after completion |

## Spec Verification
- **Undo Stack Cap** — `src/src_figma/__tests__/GameTracker/undoSystem.test.ts` asserts that pushing the 21st undo entry drops the oldest and caps at 20, matching `specs/KBL_Guide_v2_Spec_Reconciliation.json` (`GameTracker — Undo, Input System`) and the `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` constant.
- **Season Configuration Lengths & Milestones** — `src/src_figma/__tests__/League/seasonLength.test.ts` compares the `SeasonLength` list (24, 32, 40, 48, 56, 81, 100, 162) defined in `src/types/war.ts` against the master spec and asserts deadline triggers compute at 60%/65% of configured lengths instead of fixed values (`Season Configuration — Lengths, Phases, Timing` corrections).
- **Special Event Coverage** — `src/src_figma/__tests__/GameTracker/specialEventsCoverage.test.ts` ensures each `special_play_type` emitted by `runPlayDetections` resolves to an entry in the `FameEventType` union and that `logFieldingEvent` stores the `special_play_type` value for analytics (`Special Events — Definitions, Missing Events`).

## Integration & Contract Coverage
1. **Undo Stack Cap** – create `useUndoSystem.test.ts` verifying 20-entry cap per `KBL_XHD_TRACKER_MASTER_SPEC_v3.md`, guard in `useUndoSystem` as part of plan Phase 2.
2. **Game State Persistence** – `useGameStatePersistence.test.ts` ensures `processCompletedGame` leads to season + career aggregates and fame events; deletes from `gameStorage` once game is archived.
3. **Franchise Metadata** – `franchiseManager.test.ts` checks `createFranchise`, `deleteFranchise`, `exportFranchise`, `setActiveFranchise` operate on separate IndexedDB names per `FRANCHISE_MODE_SPEC.md`.
4. **Hook wiring** – `useFranchiseData.test.ts` ensures `useScheduleData` invalidates when `scheduleStorage.markCompleted()` runs, matching plan Phase 2.

## Manual Verification Steps (per `CURRENT_STATE.md` and manual bug list)
- Play a regular-season game from `FranchiseHome` (include lineup view, update mojo/fitness, auto-detect special events). Confirm standings/schedule update without reload.
- Run a playoff GameTracker session with postseason context, finish series, confirm `playoffStorage` reflects champion and `WorldSeries.tsx` shows correct info.
- Advance season via `FranchiseHome` `FinalizeAdvanceFlow` and confirm career stats persist, `seasonTransitionEngine` resets per spec.
- Check `SeasonSummary.tsx` sees pulled season data, `MilestoneWatchPanel` still shows upcoming milestones.
- Verify `UndoButton` reverts to the previous recorded play without losing fielding stats or event log entries.

## Execution Notes
- Use `fake-indexeddb` shim for unit tests touching persistence stores; reset between tests.
- Tag new specs/tests with `@franchise-game-tracker` for easy filtering during `vitest run`.
- After each manual session, record results in `specs/SESSION_LOG.md` with timestamps and pass/fail outcomes.
