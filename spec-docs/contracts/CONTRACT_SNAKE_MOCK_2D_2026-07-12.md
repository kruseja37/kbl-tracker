# CONTRACT — SNAKE MOCK 2D: FARM BOARD PARITY UNDER SCOUTING FOG

**Date:** 2026-07-12
**Base checkpoint:** `17526ae5`
**Builder/auditor law:** separate agents; JK browser walk is the sole acceptance gate.

## Binding rulings

- The farm room gets the same decision structure as MLB: team-first covered desk, one overall board, position views, a planned class, exact-player selection, and all-team backfill.
- Farm scouting fog is absolute. Rankings, plan, selected card, logs, and persistence may use only that team's saved scout-visible card data plus public slot salary and public picks. Never persist or render true prospect ratings, true grade, IV, or another team's scout read.
- Farm salary belongs to the absolute pick and does not change when a prospect moves on a board. No farm luxury tax is invented.

## Required behavior

1. Add a narrow optional farm-board record to the existing farm snake session: overall ranking, position rankings, frozen ids, planned prospect ids, and board revision. Old sessions remain readable and seed deterministically on first use.
2. Seed each team separately from `rankFarmFogCards` built with that team's scout snapshot. Include a prospect in every valid stored primary/secondary position view without exposing hidden ratings.
3. The planned class size equals that team's remaining farm turns in the persisted pick order. It contains unique available prospects in GM/scout order and reports open/broken places honestly.
4. Overall reorder changes the persisted overall list and refits the planned class. Position reorder changes that position's order and deterministically merges the reordered ids back through the same overall universe before refit.
5. Recorded prospects backfill every existing farm board in one next farm session write without revealing any seat. Automatic backfill changes planned membership only; explicit GM rankings stay byte-stable.
6. Separate `draftingTeam` from selected farm `deskTeam`, matching MLB 2B. Any team can work off-clock; only the live pick owner can arm/record. New live pick returns the main device to that club covered.
7. Replace the single scroll list with compact OVERALL/position controls and the chosen list only. Preserve exact selected prospect and fog card details.
8. Show drafted farm roster count/spend/money left and planned-class count/future slot cost/money after owed slots. No tax row. Slot salaries remain frozen by absolute pick and owner changes after valid pick trades.
9. Keep Assistant Scout pressure/log private and selected-team conditioned. Switching teams removes prior scout strings from the DOM before paint.
10. Completion/recap/farm commit/Staff Hire/Franchise Setup path remains unchanged.

## Tests first

Prove at minimum:

- two teams with different scouts seed different private rankings without true-grade leakage;
- secondary position appears in both valid farm position views;
- overall and position reorder persist only the selected team and deterministically refit its planned class;
- off-clock farm desk can edit but cannot draft; live team can draft;
- one recorded prospect backfills three hidden farm boards in one session save with rankings byte-stable;
- drafted and planned farm money use frozen absolute slot salaries and remain distinct after a pick trade;
- old farm sessions without farm boards seed once and remain reload-stable;
- covered prior-team scout strings and plan are absent from the DOM;
- recap, commit, staffing, franchise, MLB, companion, performance, and auction gates remain green.

## Allowed product files

- `src/utils/leagueBuilderStorage.ts` only for the optional farm-board record
- `src/engines/snakeFarmSlots.ts` only for pure farm-board/session helpers if appropriate
- `src/src_figma/app/components/snake/farm/**`
- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx` only for farm prop compatibility
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- directly corresponding tests and migration/persistence tests if the optional field requires them

If true prospect ratings/IV must cross the fog boundary, or auction/shared tax engines seem necessary, stop and report.

## Hard boundaries

- No farm luxury tax, chemistry-synergy claim, true-rating profile, optimizer, or companion transport expansion.
- No MLB board behavior change.
- No manifest/franchise/schedule changes.
- No explanatory copy outside Help.
- No commit or push by builder.

## Verification

1. Pure farm board/fog model tests.
2. Farm desk privacy/reorder tests.
3. Real farm page persistence/backfill/team-first tests.
4. Existing MLB slices, recap, companion, trade, performance, auction, and production build.
5. `git diff --check`, fog-leak grep/test, and exact changed-file report.

End with `SNAKE MOCK 2D COMPLETE` or `BLOCKED: <reason>`.
