# Franchise Internal V1 Active Execution Plan

Date: 2026-05-30

Purpose: keep the current Franchise v1 work aligned with the Mode 1 and Mode 2 reconciliation plans while capturing manual smoke fallout in a controlled order. This is a living execution plan, not a replacement for the Mode 1/2 worksheets.

## Current Priority Order

1. Stabilize the Mode 1 to Mode 2 playable spine.
   - Franchise creation must finish cleanly after save.
   - Franchise save slots must be removable.
   - Scheduled franchise games must launch GameTracker reliably.

2. Enforce data-contract issues that would create bad franchise state.
   - Franchise prospects must not use `DH` as primary or secondary position.
   - Franchise scouts must not use `DH` as specialty or weakness.

3. Return to the Mode 1 and Mode 2 v1 worksheets for the next planned foundation slice.
   - Do not let manual-smoke polish replace the master plan.
   - Fix bugs immediately when they block the foundation.

4. Defer tuning and richer UX until the playable loop is stable.
   - Scout accuracy tuning.
   - SMB4 name-pool variety.
   - Team Hub player profile UX.
   - Broader narrative, morale, relationship, and Mode 3 systems.

## Immediate Foundation Blockers

1. `Start Franchise` appears to hang after successful save.
   - Manual smoke observation: the franchise slot is created, but the UI does not finish cleanly. The user must leave/reload Franchise Mode to find the save slot.
   - Likely area: post-create navigation, active-franchise refresh, loading-state cleanup, or completion handling after `initializeFranchise`.

2. Franchise GameTracker launch confirmation appears to do nothing.
   - Manual smoke observation: when trying to score/play a game, clicking the `Are you sure?` confirmation does not proceed.
   - Likely area: scheduled-game launch confirmation handler, lineup benchmark gate, modal state, route navigation, or launch-state validation.

3. Franchise save-slot delete click does nothing.
   - Manual smoke observation: clicking delete on franchise save slots does not remove the slot.
   - Likely area: delete click handler, event propagation, confirmation path, storage delete call, or list refresh.

## Current Thread Scope

This thread fixes only the three immediate foundation blockers above.

Allowed areas:
- Franchise Setup post-create flow.
- Franchise selector / save-slot delete flow.
- FranchiseHome scheduled-game launch confirmation flow.
- Focused tests and smoke coverage.

Out of scope for this thread:
- Scout/prospect generation policy, including `DH` removal.
- Scout accuracy tuning.
- Scout/prospect name-pool changes.
- Team Hub player profile UX.
- Salary, trades, playoffs, Mode 3, Cloud Sync, narrative, morale, relationships, and awards.

## Deferred Manual-Smoke Feedback

The following items are preserved in `FRANCHISE_INTERNAL_V1_MANUAL_SMOKE_FEEDBACK.md` and should be handled as later focused slices:

- Remove `DH` from Franchise prospect/scout generation.
- Reduce scout accuracy.
- Improve scout/prospect name variety using SMB4 name data.
- Add Franchise player profile visibility, especially for revealed FARM call-ups and SMB4 console entry.

## Alignment With Mode 1 / Mode 2 Worksheets

This plan supports the highest-priority approved foundation decisions:

- Mode 1 save-slot creation and copy-not-reference handoff.
- Mode 1 handoff into Mode 2.
- Mode 2 Franchise Home shell.
- Mode 2 schedule-to-GameTracker launch.
- Mode 2 active game and completion loop.

The plan does not replace the worksheets. Once the immediate foundation blockers are repaired and verified, execution should return to the Mode 1 and Mode 2 v1 reconciliation documents for the next planned slice.
