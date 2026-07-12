# CONTRACT — SNAKE MOCK 2B: TEAM-FIRST PRIVATE SEATS AND OFF-CLOCK BOARDS

**Date:** 2026-07-12  
**Base checkpoint:** `ed2828d7`  
**Builder/auditor law:** separate agents; JK browser walk is the sole acceptance gate.

## Binding rulings

- The public room stays on the live pick, but the private desk is team-first: any club can be selected and its private material is covered until that club explicitly reveals it.
- Switching clubs must remove the prior club's private DOM before paint. No prior board, money, fit, advisor, or selected-player detail may remain visible.
- A selected off-clock club may inspect players, reorder its overall/position rankings, refit its board, use what-if, and open its own trade guide. It may not arm or record the live pick.
- The live on-clock club remains the only club that can draft. Pick ownership/trades, not the private lens, decide who owns the live selection.
- On the shared main device, a new live pick returns the private selector to the new on-clock club and covers it for the pass-around ritual.
- An approved companion remains pinned to its claimed club and can perform the same overall/position board reorders off-clock. Companion writes remain own-board-only and freshness guarded.

## Required behavior

1. Separate the page's `draftingTeam` (live pick owner) from its selected `deskTeam`. All private desk, selected-player, plan, tax, fit, advisor, board, and fixed-buyer trade-guide calculations use `deskTeam`; recording a pick still validates and writes only for `draftingTeam`.
2. Make the existing club-lens team controls select the private club as well as the public lens. Team branding must remain visible, but all insider content remains absent from the DOM until reveal.
3. Add a controlled team-selection seam between the page and `SnakeDraftRoomView`. Any club change, pick change, trade change, or explicit cover fails closed through the existing reveal hook.
4. Hide/disable the arm action when `deskTeam` does not own the current live pick. Do not show tutorial copy on the main screen; Help remains the only explanatory surface.
5. Preserve exact-player selection per selected desk. Repair the selection when the club changes, the player becomes unavailable, or the stored player is missing.
6. Reorders and what-if saves target only `session.seatBoards[deskTeam.id]`. Never overwrite another team's board from stale current-team state.
7. The private trade guide uses the selected desk team as fixed buyer so a club can price a pick-for-pick move before its turn. Commissioner execution remains public and ownership-validated.
8. Bring the approved companion desk onto Slice 2A's one-board contract: show `OVERALL` plus position views, carry canonical secondary eligibility, refit all 22 slots after either reorder, recalculate the existing plan bill, and persist only the claimed team board.
9. Companion freshness conflicts continue to fail closed with the existing stale message and refresh. Do not add same-Wi-Fi transport, accounts, or a second storage model in this slice.
10. Remove any remaining visible hardcoded player pronouns encountered in the touched snake/companion path; stored gender/pronoun data remains available to engines.

## Tests first

Prove at minimum:

- choosing an off-clock club covers the old seat and reveals only the chosen club after explicit reveal;
- the chosen club's overall and position reorder persist only that club's board and recalculate its 22-slot plan;
- an off-clock club cannot arm or record the live pick;
- returning to the live-pick club restores the exact draft path;
- a new live pick selects the new on-clock club and opens covered;
- the selected club is the fixed buyer in its private trade guide;
- an approved companion reorders overall and a secondary-position view, refits, and writes only its claimed board;
- stale/revoked companion writes still fail closed;
- covered private strings are absent from the DOM, not visually hidden;
- existing Slice 1A/1B/2A, privacy, trade, farm, performance, and auction gates remain green.

## Allowed product files

- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
- `src/src_figma/app/hooks/useSeatReveal.ts` only if its fail-closed contract needs a controlled selection key
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- `src/src_figma/app/pages/SnakeCompanion.tsx`
- `src/src_figma/app/components/snake/companion/SnakeCompanionFrame.tsx` only if required for the pinned-team surface
- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx` only for existing prop plumbing
- directly corresponding snake/companion tests

If storage schema, sync transport, auth, auction code, or a new engine seems necessary, stop and report.

## Hard boundaries

- No chemistry or new money ledger UI.
- No farm desk redesign.
- No immutable draft manifest or franchise initialization changes.
- No network discovery or local peer-to-peer server.
- No new explanatory copy outside Help.
- No commit or push by builder.

## Verification

1. Reducer/view privacy and team-selector tests.
2. Real page persistence tests for off-clock and on-clock behavior.
3. Companion model/page tests including stale/revoked writes.
4. Existing Slice 1A/1B/2A, trade, farm, performance, auction, and production build gates.
5. `git diff --check` and exact changed-file report.

End with `SNAKE MOCK 2B COMPLETE` or `BLOCKED: <reason>`.
