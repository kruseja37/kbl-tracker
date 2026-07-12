# CONTRACT — SNAKE MOCK 1A: CHOOSE, INSPECT, DRAFT

**Date:** 2026-07-12  
**Builder:** separate implementation agent  
**Auditor:** captain/audit agent that did not write the product diff  
**Branch/worktree:** `codex/snake-mock-draft-ready` at `/private/tmp/kbl-snake-mock`  
**Verified base:** `origin/main` `ea66830e0305d999f4140a101d452417f7d9152e`

## Binding product rulings

- The live MLB snake room must let the active team choose a specific available player. It may not silently force the first saved-board name.
- The path is: tap a player -> inspect/select that player -> `DRAFT PLAYER` -> privacy cover -> hold the gavel to confirm and persist that exact player.
- Changing the selected player while the private desk is open must not trigger the privacy cover. Privacy changes only for a real seat/lens/turn boundary or an explicit cover/draft action.
- The selected-player area uses the shared full player profile popover. Gender/pronouns remain engine data and are not displayed.
- Existing green/brass/chalk palette, team colors/logos, privacy, Help-button law, correction, trades, companion consent, sound, and farm behavior remain intact.
- Do not add explanatory text outside Help. Existing explanatory copy is not part of this slice's cleanup.

## Required behavior

1. Add one transient selected-player id for the current MLB turn. Initialize it to the current legal saved-board/default candidate, but honor a user selection thereafter.
2. Reset or repair selection only when the turn/active seat changes or the selected player becomes unavailable/illegal. Never persist a drafted/unavailable selection.
3. Every available player card in both the 22-slot board and position rankings can select that player. Drafted cards are not selectable.
4. The selected card is visually unambiguous without introducing a new blue theme.
5. Selection flows from `DeskCandidateCard` through `BoardView`/`RankingsView`/`PrivateDesk` into `SnakeDraftRoom.tsx`; do not create a second draft engine or duplicate settlement logic.
6. The live candidate economics/legal-finish calculation must recompute for the selected id. A blocked candidate cannot reach the arm/gavel ritual.
7. The selected-player area includes the existing `PlayerProfilePopover` with `revealFull={true}`. The trigger must be obvious and usable by touch and keyboard.
8. Replace `COVER & ARM` with the explicit action label `DRAFT PLAYER`. That action covers the private seat and arms the existing one-second gavel confirmation. The gavel remains the only write trigger.
9. The saved pick must use the exact selected player id, frozen IV, shared marginal-tax calculation, correction snapshot, and existing persisted session path.
10. Decouple `useSeatReveal` from candidate id. Selecting another player must leave the active private desk revealed; changing turn/seat/lens must still cover it.

## Tests first

Add failing tests before implementation proving at minimum:

- selecting a non-default ranked player changes the selected-player area and the eventual `onRecordPick` id;
- selecting a player does not cover the revealed desk;
- `DRAFT PLAYER` covers and arms, and a full gavel hold records the selected id;
- a drafted/blocked player cannot be selected or armed;
- changing turn/seat still covers and repairs the selection;
- the selected player opens the shared full profile, including ratings, traits, archetype, personality, and chemistry while showing no pronoun label;
- the existing privacy, pause, correction, live-pick-move, and final-pick view tests remain green.

Use focused tests in the existing snake component/page suites. A real page-level integration test must prove a non-default pool player can be selected and written through the real ritual; a view-only mocked callback test is necessary but insufficient.

## Allowed product files

- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`
- `src/src_figma/app/components/snake/desk/BoardView.tsx`
- `src/src_figma/app/components/snake/desk/RankingsView.tsx`
- `src/src_figma/app/components/snake/desk/DeskCandidateCard.tsx`
- directly corresponding snake test files

If another product file is genuinely required, stop and report the exact reason before touching it.

## Hard boundaries

- No farm-room changes in this slice.
- No completion, recap, franchise commit, schedule, chemistry aggregation, salary-ledger, ranking-unification, secondary-position, backfill, trade-offer, CPU-seat, or companion-network implementation.
- No auction files or auction behavior changes.
- No storage schema/version change.
- No new player-profile implementation; reuse the shared profile.
- No canonical state/session/decision doc edits by the builder.
- Do not touch the dirty root checkout. Work only in `/private/tmp/kbl-snake-mock`.
- Do not commit or push.

## Verification

Run and report exact commands/results:

1. Focused new/changed snake tests.
2. `npx vitest run src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx src/src_figma/app/components/snake/desk/__tests__/PrivateDesk.test.tsx src/src_figma/__tests__/pages/LeagueBuilderSnakeDraft.test.tsx src/src_figma/__tests__/pages/SnakeDraftRoom.registration.integration.test.tsx`
3. `npm run build`
4. Changed-file list and diff summary.

Baseline note: untouched `origin/main` full suite produced two timing failures in `LeagueBuilderDraftSetup.board.test.tsx` and `LeagueBuilderDraftSetup.poolLock.test.tsx`; both passed immediately in isolated reruns. Do not touch those files or claim them as this slice's regression.

## Builder report format

- Files changed
- Red tests added and why they failed before implementation
- Behavior implemented
- Verification commands and exact results
- Any unresolved risk or contract deviation
- End with `SNAKE MOCK 1A COMPLETE` or `BLOCKED: <reason>`
