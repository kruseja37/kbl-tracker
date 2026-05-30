# Franchise Internal V1 Manual Smoke Feedback

Date: 2026-05-30

Purpose: preserve user-observed manual smoke-test feedback without interrupting the current foundational implementation plan. This document is not an implementation prompt and does not change scope by itself. Each item should be revisited, triaged, and assigned to the appropriate v1 hardening slice after the foundation work remains stable.

## Summary

The manual smoke test mostly validated the recent Franchise v1 direction, but GameTracker launch and several League Builder / Franchise UX details need follow-up. The immediate theme is not to chase these bugs ad hoc; instead, keep them visible so the implementation roadmap covers them deliberately.

## Blocking Or High-Priority Workflow Issues

1. Franchise creation can hang on `Start Franchise`.
   - User impact: blocks the Mode 1 to Mode 2 handoff.
   - Additional observation: the franchise slot is still saved successfully, but the user has to leave and reload Franchise Mode to find the saved slot.
   - Area to inspect later: Franchise Setup submit flow after successful storage write, post-create navigation/refresh, loading-state cleanup, and any UI error handling around `initializeFranchise` completion.

2. Game scoring / launch does not proceed after the `Are you sure?` confirmation click.
   - User impact: blocks regular-season GameTracker launch from Franchise Mode.
   - Area to inspect later: FranchiseHome scheduled-game launch flow, pregame confirmation modal, current-lineup benchmark gate, no-DH lineup snapshot, route navigation, and GameTracker launch state.

3. Clicking delete on franchise save slots does nothing.
   - User impact: blocks cleanup of bad smoke-test saves and makes iteration harder.
   - Area to inspect later: Franchise selector / save-slot delete handler, confirmation UI, storage delete call, and post-delete refresh.

## Franchise Mode Rules / Data Policy

1. DH should not be a position in Franchise Mode.
   - No prospects should have `DH` as primary or secondary position.
   - No scouts should have `DH` as a specialty or weakness.
   - This should be enforced in the scout/prospect generation path, not merely hidden in UI.

2. Scout accuracy seems too high.
   - Goal: keep two scouts per team while making prospect evaluation uncertain enough that drafting is not too easy.
   - Future tuning should nerf base accuracy and/or widen report variance while preserving visible specialty/weakness strategy.

## Scout / Prospect Generation Quality

1. Scout and prospect names feel too redundant or similar.
   - Desired behavior: more variability.
   - Names should be pulled from the SMB4 first-name / last-name database where possible.
   - Area to inspect later: prospect/scout generation name pools and existing SMB4 name data source.

## Player Information / Team Hub Needs

1. Users need a way to inspect player profiles from Franchise Mode.
   - Critical for called-up FARM players because users must create/update that player in the SMB4 console.
   - Team Hub should expose player details either as a roster section or a click/pop-up from the player name.
   - Needed info includes ratings, attributes, traits, positions, handedness, salary, and any other console-relevant details.
   - Hidden prospect info must remain hidden until the appropriate reveal/call-up point, but once revealed the user needs enough information to recreate the player in SMB4.

## Suggested Future Triage Buckets

1. Launch / handoff blockers
   - Franchise creation hang.
   - GameTracker launch confirmation no-op.
   - Save-slot delete no-op.

2. Scout/prospect generation policy
   - Remove DH from Franchise prospects and scout specialty/weakness pools.
   - Reduce scout accuracy.
   - Improve scout/prospect name variability using SMB4 name data.

3. Franchise player inspection UX
   - Player profile pop-up or Team Hub profile panel.
   - Revealed FARM prospect console-entry details.
   - Hidden-safe behavior before reveal.

## Notes

- These issues should not reopen deferred systems such as Mode 3 annual draft, AI drafting, generated schedules, AI trades, morale, relationships, awards, or full scouting persistence unless explicitly scoped later.
- The immediate priority remains a stable Mode 1 to Mode 2 playable loop. These items should be addressed as focused hardening slices after the current foundation remains green.
