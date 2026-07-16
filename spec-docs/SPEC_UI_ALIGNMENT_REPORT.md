# Snake Draft Spec / UI Alignment Report

**Date:** 2026-07-12
**Verdict:** NOT VERIFIED before repair
**Scope:** production snake setup, MLB room, companion, farm room, recap, staffing, Franchise Setup, and zero-schedule Living Season handoff.

## Major confirmed gaps

1. The room does not preserve the decision surface on iPad. Below `xl`, the private desk, selected-player action, live roster, and ritual rail stack vertically; the 22-player board separates inspection from drafting by many screens (`SnakeDraftRoomView.tsx:348-475`, `BoardView.tsx:25-47`).
2. The pick-order rail renders the entire 22-round order with no active window or active-pick scroll (`SnakeDraftSetupAdapter.tsx:347-358`, `SnakeDraftRoomView.tsx:324-345`).
3. A player who fails the legal-finish check cannot be inspected; selection is incorrectly coupled to draft legality (`DeskCandidateCard.tsx:47-58`, `SnakeDraftRoom.tsx:955-982`).
4. What-if accepts unavailable players and can persist them into a private plan (`WhatIfSandbox.tsx:33-40`, `SnakeDraftRoom.tsx:1108-1147`).
5. Candidate cards label the team archetype as if it were the player's archetype (`SnakeDraftRoom.tsx:883-902`, `DeskCandidateCard.tsx:31-35`).
6. Farm repeats the buried-action problem and supplies no real selected-prospect card (`FarmPrivateDesk.tsx:61-88`, `SnakeDraftRoom.tsx:456-481`).
7. Companion cover is not durable; the freshness loop reopens the approved private desk (`SnakeCompanion.tsx:117-163,426-455`).
8. Companion omits selected-player inspection, drafted/planned money and chemistry truth, team branding, farm parity, and a completed-room state (`SnakeCompanion.tsx:52-55,117-131,426-456`, `SnakeCompanionFrame.tsx:3-31`).
9. Setup allows blank/unclaimable companion seats and more companion seats than the runtime cap (`SnakeDraftSetupAdapter.tsx:249-310,365-370,449-465`, `companionModel.ts:57-77`).
10. Recap replaces the room before explicit confirmation and offers no return for the final allowed correction (`SnakeDraftRoom.tsx:1268-1289`, `SnakeDraftRecap.tsx:34-87`).
11. The post-draft Franchise Setup wizard re-asks settled roster questions, exposes deferred playoff setup, says fantasy drafting is deferred, and tells the user to run the prospect draft already completed (`FranchiseSetup.tsx:502-507,1125-1139,1533-1644`).
12. Help-Button law is violated on Scout Hire, companion claim/approval, Franchise Setup, and schedule import (`SESSION_RULES.md:379-389`; `ScoutHire.tsx:129-137`; `CompanionApprovalCard.tsx:46-53`; `CompanionClaimScreen.tsx:23-31`; `FranchiseSetup.tsx:1108-1118,1591-1623`; `ScheduleContent.tsx:258-273`).

## State / persistence defects that surface in UI

1. Run It Back deletes MLB season 1 and auction farm state but not snake farm season 2 or generated prospects (`snakeFarmSlots.ts:7-8,101-105`, `leagueBuilderAuctionPipeline.ts:195-204,571-596`).
2. A completed draft's frozen pool can be unlocked or changed, invalidating manifest consumers (`LeagueBuilderDraftSetup.tsx:1678-1694,2733-2737,4910-4926`).
3. Pick save can race pause/trade; a stale whole-session write can overwrite the pick or trade (`SnakeDraftRoomView.tsx:216-300`, `SnakeDraftRoom.tsx:1235-1247`, `leagueBuilderStorage.ts:2193-2211`).
4. Farm correction can erase newer private-board work because only MLB boards are preserved during merge (`snakeFarmSlots.ts:314-351`, `SnakeDraftRoom.tsx:410-489`, `leagueBuilderStorage.ts:2175-2211`).
5. Legacy completed MLB state can bypass the farm-draft requirement (`mlbDraftCompletion.ts:24-37`, `franchiseInitializer.ts:118-139`).

## Already aligned

- Main-device private information fails closed when seat, pick, trade, or lens changes.
- MLB profile includes non-zero ratings, positions, personality, traits, player archetype, team fit, salary, tax, true cost, and chemistry delta without displaying pronouns.
- Fit has text as well as green/yellow/red color.
- Farm boards persist only fog-safe scout information.
- Confirmed manifests freeze MLB and farm rosters and allow zero-schedule franchise launch.

This report is the pre-repair baseline. Final acceptance remains JK's browser walk.

## Post-repair reconciliation — 2026-07-12

All 12 UI gaps and all 5 persistence defects above now have production repairs and focused
regression coverage:

1. The iPad room is board-first with a compact decision rail, bounded active-pick window, compact
   selected-player profile, and separate plan/roster truth.
2. Any available player may be inspected; draft legality gates recording, not inspection.
3. One persisted overall ranking feeds primary/secondary position views. Ranking changes do not
   silently rewrite exact plan membership; explicit plan changes drive all recalculation.
4. Full-pool search, selected profile, fit, exact tax/true cost, five chemistry families,
   personality, traits, player archetype, positions, and every non-zero rating are present.
   Pronouns stay engine-side and never render.
5. Companion and shared-device desks fail closed, auto-cover at disclosure boundaries, and expose
   only the selected team's authorized private state.
6. Farm has fog-safe overall/position boards, selected-prospect inspection, frozen slot money,
   durable trade/correction, recap confirmation, and no hidden-IV leakage.
7. Setup, room, companion, recap, staffing, Franchise Setup, and schedule entry conform to the
   ratified Help-Button law.
8. Run It Back clears both snake phases and associated generated state while linked franchises
   block destructive reset. Completed manifests freeze the pool and launch record.
9. Pick, pause, board, trade, correction, cover, and room-code writes use narrow or atomic merge
   paths rather than stale whole-row replacement.
10. Franchise launch requires exact MLB and farm handoffs, stores both manifest provenances,
    preserves farm privacy, and creates zero schedule rows.
11. Roster recommit clears stale MLB/FARM league assignments before applying frozen winners, so
    old stock-roster ownership cannot block the completed 22+10 handoff.
12. MLB and farm recap confirmation reload the current session revision before freezing; the
    first confirmation click can no longer lose a race to background advisor/board persistence.
13. Franchise ownership embeds both full canonical snake manifests. Even a short deterministic-ID
    collision fails closed for completed resume and partial-launch cleanup.

**Status:** independently code-aligned; the complete repository gate passed 674 test files with
8 skipped (682 total): 9,955 tests passed, 15 skipped (9,970 total), 0 failed. Only JK can accept the UI through
his browser walk.
