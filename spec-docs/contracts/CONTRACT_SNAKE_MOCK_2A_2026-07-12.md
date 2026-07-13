# CONTRACT — SNAKE MOCK 2A: ONE BOARD, SECONDARY ELIGIBILITY, ALL-SEAT BACKFILL

**Date:** 2026-07-12
**Base checkpoint:** `93adf76a`
**Builder/auditor law:** separate agents; JK browser walk is the sole acceptance gate.

## Binding rulings

- Each team owns one ordered overall board plus position views of that same player universe.
- A player appears in every position for which the stored player is actually eligible, including secondary position.
- Reordering either overall or a position view must immediately refit the team's 22-slot plan and recalculate the existing plan cost/tax/cushion and selected-player consequences.
- A drafted/retired player is removed and backfilled for every saved team board, not only the currently revealed desk.
- Rankings and plans stay private; existing cover law and Help law remain intact.

## Required behavior

1. Extend the snake desk candidate model with canonical eligible positions derived from primary plus valid secondary position. No position inference from name or UI.
2. Seed position rankings with a player in each eligible position. Preserve deterministic advisor-worth/id ordering.
3. Slot eligibility, what-if legality, refit, and backfill all honor the same primary/secondary rules. Pitcher role rules remain canonical (`SP`, `SP/RP`, `RP`, `CP`); do not make arbitrary fielding positions interchangeable.
4. `RankingsView` exposes a compact `OVERALL` view and position buttons. It renders only the chosen list, supports the existing drag/arrows/type-rank controls, and keeps player select/profile flow intact.
5. Add persisted overall reorder through the existing `rankings.global` field. Position reorder remains persisted through `rankings.byPosition`.
6. Add one pure deterministic board-refit helper. Given rankings plus candidates, it assigns each of the 22 canonical slots once, preferring that slot's position order then overall order, never duplicating a player. It reports broken slots rather than inventing players.
7. Both overall and position reorder call the refit helper before the single session save. The recalculated slots must feed the already-existing plan bill, tax core, slot depth, selected-player fallout, and legal-finish display on the next render.
8. Backfill uses the board slot's required role first, not the drafted player's primary role. A secondary-eligible player drafted out of a catcher slot must be replaced from catcher-eligible rankings.
9. Add page-owned all-seat reconciliation: whenever unavailable/version state changes, reconcile every existing `session.seatBoards` entry in memory, apply all changed boards to one next session, and persist once. It must not require revealing any seat and must not expose another team's board.
10. Keep per-team rankings byte-stable except for the explicit user reorder; automatic backfill changes slots only and emits the existing advisor log when that team is later viewed.

## Tests first

Prove at minimum:

- C/1B appears in both C and 1B position views and can fill/backfill either matching slot;
- a primary 1B with secondary C cannot fill SS or pitcher slots;
- overall and position reorder each change the intended 22-slot plan deterministically and recalculate plan totals;
- no player occupies two plan slots after refit;
- broken supply reports the exact broken slot;
- backfill chooses by the slot role when the gone player was there via secondary eligibility;
- a pick that removes players from boards for three saved teams backfills all three in one persisted session write without any private-seat reveal;
- overall/position UI selection and reorder persist through the real page session seam;
- existing selection, recap, privacy, farm, trade, correction, performance, and auction gates stay green.

## Allowed product files

- `src/src_figma/app/components/snake/desk/deskModel.ts`
- `src/src_figma/app/components/snake/desk/deskRoomModel.ts` only if the stored secondary position must be carried into the desk candidate
- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`
- `src/src_figma/app/components/snake/desk/RankingsView.tsx`
- `src/src_figma/app/components/snake/desk/BoardView.tsx` only for recalculation display wiring
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- directly corresponding snake tests

If storage schema or an engine outside this list seems necessary, stop and report. Existing `rankings.global`, `rankings.byPosition`, slots, and revision fields must be sufficient.

## Hard boundaries

- No team-first/off-clock private selector yet.
- No new chemistry or money ledger UI.
- No farm board redesign.
- No manifest/franchise/schedule/staffing/auction changes.
- No explanatory copy outside Help.
- No commit or push by builder.

## Verification

1. Pure desk model/room model tests.
2. PrivateDesk/Rankings page tests including one real persisted-session integration.
3. Existing Slice 1A/1B gates, performance test, farm tests, and production build.
4. `git diff --check` and exact changed-file report.

End with `SNAKE MOCK 2A COMPLETE` or `BLOCKED: <reason>`.
