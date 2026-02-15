# Franchise ↔ GameTracker Wiring Matrix

This matrix maps UX triggers (FranchiseHome + GameTracker) to their backend contracts so each wiring task is traceable to specific specs or bug reports.

| Trigger | UI Path | Hook/Engine/Storage | Outcome | Key Spec/Bug | Notes |
|---|---|---|---|---|---|
| Launch GameTracker from FranchiseHome | `FranchiseHome.tsx` → `navigate('/game-tracker/:gameId', state)` | `buildGameTrackerRoster`, `GameStateHook.initializeGame` | Teams, rosters, stadium + season context passed to GameTracker | `PROJECT_BIBLE.md` (Files: Franchise UI) + `FRANCHISE_GAMETRACKER_PLAN.md` Phase 2 | include `stadiumName`, `scheduleGameId`, `franchiseId`, `seasonNumber` in navigation state; follow `specs/GAMETRACKER_DRAGDROP_SPEC.md` input hierarchy | 
| Exit Game (End Game) | `GameTracker.tsx` `hookEndGame` → `processCompletedGame` / `seasonStorage` / `careerStorage` / `logFieldingEvent` | `useGameState`, `processCompletedGame`, `seasonAggregator`, `fieldingEventExtractor` | Completed game persisted, stats aggregated, fame/special events logged, schedule marked done | `CURRENT_STATE.md` (Tier 0 fixes) + `FRANCHISE_GAMETRACKER_PLAN.md` Phase 2-3 | ensure `fameEvents` + activity log entries survive; confirm `stadiumName` flows to `gameHeader` | 
| Post-game to Franchise home refresh | `PostGameSummary.tsx` → `navigate('/franchise/:franchiseId')` + `useFranchiseData` refresh | `franchiseManager`, `useScheduleData`, `usePlayoffData` | New game/season state reflected (standings, schedule, roster) | `FRANCHISE_MODE_SPEC.md` (franchise metadata) + `CURRENT_STATE.md` (Verified UI list) | add invalidation hooks or `setState` so scoreboard updates once persistence complete | 
| Undo + Activity log | `GameTracker.tsx` `UndoButton` → `useUndoSystem` (stack cap 20) | `undoStack` in GameTracker hook | Revert to previous play without dropping franchise data | `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` + `KBL_Guide_v2_Spec_Reconciliation.json` (undo limit) | ensure stack cap constant matches spec and persisted actions revert fielding/roster changes | 
| Special Event detection logging | `EnhancedInteractiveField.tsx` `runPlayDetections` → `logFieldingEvent` → Fame engines | `detectionIntegration`, `fameIntegration` | Spray chart events recorded, FameEvent entries stored, UI toast shown | `specs/GAMETRACKER_DRAGDROP_SPEC.md` contextual buttons + `GAMETRACKER_BUGS.md` (BUG-014) | ensure `activityLog` captures event strings + `FameEventType` union is exhaustive | 
 
Use this matrix as the blueprint for wiring work; update each row when new dependencies (e.g., `stadiumName`, `undoStack`, special events) are added or relocated within the app.

## Wiring Checklists

### Launch GameTracker from FranchiseHome
- Confirm `FranchiseHome.tsx` navigation state includes `leagueId`, `franchiseId`, `scheduleGameId`, `stadiumName`, `seasonNumber`.
- `buildGameTrackerRoster` should fetch rosters using `franchiseId` + `leagueId`; reference `specs/FRANCHISE_MODE_SPEC.md` per-franchise roster isolation.
- `GameStateHook.initializeGame` must record `stadiumName` in the initial GameState and pass it into `GameTracker.tsx`, and rely on `specs/GAMETRACKER_DRAGDROP_SPEC.md` for input ordering (team → lineup → stadium).
- Add a unit check in `franchiseManager.test.ts` to ensure navigation state mapping matches the wiring expectation.

### Exit Game (End Game)
- `hookEndGame` in `GameTracker.tsx` needs to call `processCompletedGame`, `seasonStorage`, `careerStorage`, `logFieldingEvent`, and `scheduleStorage.markCompleted`.
- Each storage hook should persist the final `stadiumName`/`seasonNumber` from the GameState so `seasonStorage` aligns with `specs/CURRENT_STATE.md`.
- Ensure `fameEvents` and `activityLog` receives entries persisted through `logFieldingEvent` (per `specs/STAT_TRACKING_ARCHITECTURE_SPEC.md`).
- Add tests verifying `hookEndGame` results in invalidations for `useFranchiseData`, `useScheduleData`, and `usePlayoffData`.

### Post-game to Franchise home refresh
- `PostGameSummary.tsx` must navigate back to `/franchise/:franchiseId` with the same `franchiseId` and trigger `useFranchiseData` `invalidateQueries`.
- `useFranchiseData`, `useScheduleData`, and `usePlayoffData` should listen for `processCompletedGame` completion via `queryClient.invalidateQueries` or stored listeners.
- Confirm new standings, roster, and schedule data appear without manual reload by adding a journey test referencing `CURRENT_STATE.md`.
- Document the expected refreshed state in `FRANCHISE_MODE_SPEC.md` metadata (standings, schedule, career totals).

### Undo + Activity log
- `UndoButton` should call `useUndoSystem` and rely on the constant from `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` (undo cap 20); ensure the constant matches `specs/KBL_Guide_v2_Spec_Reconciliation.json`.
- Persist the undo stack entry such that rolling back a play updates both UI and `activityLog`.
- Verify that undo does not drop franchise data by checking `franchiseManager` values after revert.
- Add a regression test that pushes 21 entries to confirm the 20-entry cap, per spec.

### Special Event detection logging
- `runPlayDetections` must feed the detected special play (e.g., `Robbery`, `DivingCatch`) into `logFieldingEvent` so the event persists with `FameEventType`.
- Ensure `ActivityLog` entries contain the special play description and that `FameEventType` is in the exhaustive union referenced by `specs/STAT_TRACKING_ARCHITECTURE_SPEC.md`.
- Validate that finishing a special play triggers the Fame engine hook and updates the displayed log/message in `GameTracker.tsx`.
- Write a test verifying that `logFieldingEvent` receives special play metadata and adds it to the `fameEvents` store.
