# CONTRACT — COMPANIONAUTH (2026-07-12)

**Lane:** codex/companion-auth · base `beaad38f` (current github/main)
**Builder:** Codex 5.6-sol, xhigh. **Auditor:** opus (independent). **Captain cuts all commits — the builder runs NO git write commands.**

CONFIRMED — this contract IS the captain confirmation the session-start ritual requires. Do not
re-run the ritual; do not wait for further confirmation. Work only in /private/tmp/kbl-companion.

## The defect (JK's real phone, 2026-07-11 — code-grounded)

`/snake-companion` on a second device cannot join a draft. Root cause chain (verified):

1. `src/src_figma/app/pages/SnakeCompanion.tsx` renders `CompanionClaimScreen` with NO sign-in
   path anywhere on the page. There is no `useAuth` usage, no login form, no auth state shown.
2. All companion data flows through `useLeagueBuilderData` (local IndexedDB) + `syncEngine.pull()`
   (`SnakeCompanion.tsx:88`). `src/utils/syncEngine.ts:453-459` — `pull()` reads
   `client.auth.getSession()` and pulls ONLY for `session.user.id`. On an unauthenticated device
   this silently no-ops.
3. Therefore a fresh phone has empty local leagues, `claimDesk` (`SnakeCompanion.tsx:106-119`)
   iterates zero/stale leagues and every code lands on `'THAT ROOM CODE DOES NOT MATCH.'` — with
   no hint that sign-in is the missing step.

The main device DOES push: storage modules broadly queue writes into `syncEngine` (recordWrite →
pushQueue), so once the phone is authenticated to the SAME account, pull → claim → push round-trip
is expected to work. The one missing product surface is companion sign-in.

## The fix (scope — exactly this, no more)

1. **Sign-in gate on `/snake-companion`.** When `useAuth().isAuthenticated` is false, render a
   sign-in screen (email + password + submit, matching the `LoginForm` in
   `src/src_figma/app/components/SyncModal.tsx:69`) BEFORE the claim screen. Fail closed: no claim
   UI until authenticated. Preferred shape: extract `LoginForm` from `SyncModal.tsx` into a shared
   component file consumed by BOTH SyncModal and the companion page — SyncModal's rendered
   behavior must stay byte-identical (its tests, if any, are the firewall).
2. **Post-sign-in flow:** after successful sign-in, run `syncEngine.pull()` and then enter the
   existing claim flow. While the first pull is in flight, show a state line (e.g. `PULLING YOUR
   LEAGUES…`) so the phone is never a dead mystery.
3. **Honest empty state:** when authenticated and pull complete but no league has an open snake
   room, the claim screen's failure copy must distinguish "no room found on this account" from
   "code does not match". One-line state copy only.
4. **Signed-in indicator + sign-out** on the claim screen (small, one line: account email + a
   SIGN OUT control) so JK can tell which account the phone is on.
5. **Help-button law (RATIFIED, non-negotiable — SESSION_RULES "Help-Button UI Law"):** NO inline
   explainer sentences. If the claim/sign-in screen needs instructions (e.g. "sign in with the
   same account as the main device, join over the same Wi-Fi"), that content goes behind a `?`
   Help affordance matching the Lens pattern. Inline copy = labels, values, states, one-line
   action consequences only. While you are in the companion tree, ALSO relocate any EXISTING
   inline explainer sentences on the companion screens behind the same `?` Help affordance, and
   list every relocated string in your builder report.

## Constraints

- Files owned: `src/src_figma/app/pages/SnakeCompanion.tsx`,
  `src/src_figma/app/components/snake/companion/**`, the extracted shared LoginForm file (new),
  `src/src_figma/app/components/SyncModal.tsx` (extraction only — zero behavior change), plus
  owned tests. NOTHING else. Do not touch `syncEngine.ts` semantics, storage shapes, engines,
  or any non-companion snake surface (a parallel lane owns setup/room/board).
- No new dependencies. No `any` without justification. No git write commands — leave the working
  tree dirty for the captain.
- `useAuth` hook is at `src/hooks/useAuth.ts` (verify path by reading the SyncModal import).

## Proof required (gates — run and paste real output into your report)

1. **Two-origin automated test** (the acceptance centerpiece): a vitest test simulating two
   devices with ISOLATED storage contexts —
   - Device A (main): authenticated (mock supabase session, user U), creates league + snake
     session with room code, writes flow into the push path.
   - Device B (fresh storage, `/snake-companion` mount): unauthenticated → sign-in screen renders,
     claim UI absent; after mocked sign-in as user U + pull → the claim with the correct room code
     SUBMITS; device A sees the pending claim; approval round-trips back to B.
   - Also: device B signed in as a DIFFERENT account → honest "no room on this account" state.
   Mock the supabase client at the seam syncEngine already exposes for tests (read existing
   syncEngine tests first and reuse their harness — do not invent a parallel mock layer).
2. `npx tsc --noEmit` clean; `npm run build` exit 0.
3. Owned suites green: companion tests + any SyncModal/auth tests + your new two-origin test.
4. One full `npx vitest run` at the end. Machine-load flake protocol applies ONLY to the
   pre-existing characterized files (LeagueBuilderDraftSetup family, franchiseManualSmokeFixture,
   franchiseOffseasonGuards, RosterDesigner, EliminationTeamHub): any of ≤3 solo attempts green
   counts. It NEVER applies to your own new tests.

## Report format

Append `## BUILDER REPORT` to THIS file: what changed (file:line), relocated-string list, gate
outputs pasted (real terminal text), uncertainties. Then print the completion marker line
`COMPANIONAUTH-COMPLETE-$(hostname -s)` as the last line of your run.

## STOP rules

Mid-build surprise, missing seam, or any need to touch un-owned files = STOP and report in this
file under `## BUILDER STOP`; do not improvise. An UNKNOWN is a stop, not a guess.

## AMENDMENT 1 (captain, 2026-07-12) — companion density + test pins

A read-only inventory of the companion tree found these; they are IN this lane's scope (you own
these files):

1. **Duplicated trade guide, both always visible:** `SnakeCompanion.tsx` passes the same
   `SnakeTradeGuide` twice — nested in `privateDesk`'s GUIDE tab (~lines 335-341) AND as the
   standalone `tradeGuide` prop (~343-349) — and `SnakeCompanionFrame.tsx` renders both
   unconditionally (lines 29-30). Fix: render it ONCE — keep the GUIDE tab copy inside the desk,
   drop the standalone section from the companion frame.
2. **Relocate rulings for companion explainer strings** (per the ratified help-button law; put
   them behind the companion's `?` Help affordance, styled like the HelpNote pattern in
   `LeagueBuilderDraftSetup.tsx:5076`):
   - `CompanionApprovalCard.tsx:50` "USE THIS CODE ONLY ON THE LEAGUE OWNER'S…" → RELOCATE.
   - `CompanionClaimScreen.tsx:11` "YOUR DESK STAYS COVERED UNTIL THE COMMISSIONER APPROVES…" → RELOCATE.
   - `CompanionClaimScreen.tsx:18` "ENTER THE GM NAME FROM THE MAIN SCREEN AND ITS FOUR-DIGIT ROOM CODE." → KEEP (it is the claim form's only guidance; one line).
   - `CompanionApprovalCard.tsx:49` "ON YOUR PHONE, GO TO: {url} — SAME WI-FI" → KEEP (functionally necessary one-liner). NOTE: this string is test-pinned at
     `src/src_figma/app/components/snake/companion/__tests__/CompanionSurfaces.test.tsx:41` — keep it byte-identical or update that pin deliberately.
   - `SnakeCompanion.tsx:308` "OPEN THIS CLUB'S DESK ON THE MAIN DEVICE FIRST." → KEEP (recovery one-liner).
3. New sign-in-screen guidance ("same account as the main device, same Wi-Fi") goes behind the
   same `?` Help affordance, NOT inline.

## BUILDER REPORT

**Status:** COMPLETE — implementation and automated gates complete; JK's real-phone browser check remains the product acceptance gate.

### Files changed (13 total)

1. `src/src_figma/app/pages/SnakeCompanion.tsx` — auth gate, post-auth pull + league-data refresh, pulling/error states, open-room scan, honest account-empty copy, account sign-out wiring, and single trade-guide render (`:66-181`, `:364-415`).
2. `src/src_figma/app/components/LoginForm.tsx` — extracted shared email/password login form (`:1-56`).
3. `src/src_figma/app/components/SyncModal.tsx` — consumes the extracted LoginForm; rendered SyncModal behavior is unchanged (`:10`, `:50`).
4. `src/src_figma/app/components/snake/companion/CompanionSignInScreen.tsx` — fail-closed companion sign-in surface with Help-only guidance (`:1-23`).
5. `src/src_figma/app/components/snake/companion/CompanionHelp.tsx` — shared `?` progressive-disclosure affordance (`:1-27`).
6. `src/src_figma/app/components/snake/companion/CompanionClaimScreen.tsx` — signed-in email + SIGN OUT, Help relocation, preserved one-line claim guidance (`:4-39`).
7. `src/src_figma/app/components/snake/companion/CompanionApprovalCard.tsx` — preserved the URL line byte-identically and moved account-policy explanation behind Help (`:46-53`).
8. `src/src_figma/app/components/snake/companion/SnakeCompanionFrame.tsx` — removed the duplicate standalone trade-guide prop/section; the desk GUIDE copy is now the sole render (`:3-31`).
9. `src/src_figma/app/components/snake/companion/__tests__/CompanionAuthFlow.test.tsx` — mounted two-device auth/pull/claim/approval and different-account empty-state coverage (`:167-219`).
10. `src/src_figma/app/components/snake/companion/__tests__/CompanionSurfaces.test.tsx` — Help relocation, account sign-out, and single-surface coverage.
11. `src/src_figma/__tests__/app/SyncModal.test.tsx` — extraction firewall proving the modal's login copy and submit behavior remain intact.
12. `src/utils/tests/syncEngine.dynamicElimination.test.ts` — real syncEngine + existing mock-Supabase-seam test across isolated IndexedDB contexts: main push → phone pull/claim/push → main pull/approve/push → phone pull (`:1098-1203`).
13. `spec-docs/contracts/CONTRACT_COMPANIONAUTH_2026-07-12.md` — this report. Captain Amendment 1 was already appended during the build and was followed.

`run_lane.sh` remains an unrelated pre-existing untracked path and was not touched. No git write command was run.

### Relocated-string list

Existing strings moved from always-visible UI behind `?` Help:

- `YOUR DESK STAYS COVERED UNTIL THE COMMISSIONER APPROVES THIS DEVICE.`
- `USE THIS CODE ONLY ON THE LEAGUE OWNER'S SIGNED-IN DEVICES AT THE TABLE.`

New instructional strings placed behind `?` Help from their first introduction:

- `SIGN IN WITH THE SAME ACCOUNT AS THE MAIN DEVICE.`
- `KEEP BOTH DEVICES ONLINE WHILE THE DRAFT IS OPEN.`
- `USE THE SAME SIGNED-IN ACCOUNT AS THE MAIN DEVICE.`

Per Amendment 1, these necessary one-line strings remain visible and byte-identical:

- `ENTER THE GM NAME FROM THE MAIN SCREEN AND ITS FOUR-DIGIT ROOM CODE.`
- `ON YOUR PHONE, GO TO: {origin}/snake-companion — SAME WI-FI`

### Gate output

`NODE_ENV= npx tsc --noEmit`

```text
(no output)
exit 0
```

Focused companion/auth suites:

```text
Test Files  6 passed (6)
Tests  19 passed (19)
```

Real sync-engine suite, including the isolated-device companion round trip:

```text
Test Files  1 passed (1)
Tests  84 passed (84)
```

`NODE_ENV= npm run build`

```text
✓ 2690 modules transformed.
✓ built in 14.33s
PWA v1.2.0
mode      generateSW
precache  201 entries (5553.28 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
exit 0
```

First full-suite pass exposed three machine-load/order reds; all three passed immediately solo:

```text
Test Files  3 failed | 656 passed | 8 skipped (667)
Tests  3 failed | 9770 passed | 15 skipped (9788)

draftPipeline.integration exact red: 1 passed (2.44s)
GameTrackerLaunchState exact red: 1 passed (0.42s)
LeagueBuilderDraftSetup.poolLock exact red: 1 passed (4.43s)
```

Closing full-suite pass removed both non-allowlisted reds. Its sole red was in the contract-characterized `LeagueBuilderDraftSetup` family and passed on the first solo attempt, satisfying the stated machine-load protocol:

```text
Test Files  1 failed | 658 passed | 8 skipped (667)
Tests  1 failed | 9772 passed | 15 skipped (9788)

LeagueBuilderDraftSetup.board exact red:
Test Files  1 passed (1)
Tests  1 passed | 23 skipped (24)
```

**Passing-test count:** 9,772 passed in the closing full run; the one characterized batch-only red passed solo immediately. All new/owned tests passed in every run.

### Uncertainties

- Automated coverage proves the real sync-engine record round trip through the repository's existing Supabase test seam, but it does not replace JK's real-phone test against the deployed Supabase project.
- No live browser/device verification was run in this CLI-only lane. The remaining acceptance check is: fresh phone → same-account sign-in → room pull → claim → main approval → approved desk appears.

## AMENDMENT 2 (captain, 2026-07-12) — cross-device clobber fix (build this now, same lane)

Captain's independent sync-trace found a defect the sign-in fix would expose in live use:

**The defect.** Both companion writes — claim (`SnakeCompanion.tsx:169`) and board save (`:298`)
— use raw `saveMlbDraftSession`, which writes the WHOLE session row. Cloud sync is row-level
last-write-wins (`syncEngine.applyPage` applies cloud rows with unconditional `store.put`;
local queued writes only defer application until pushed). So: main device records a pick at t0;
phone (last pulled at t0−5s) saves its board at t0+1 carrying the OLD `completedPicks`; the
phone's push becomes the newest cloud row; the main device's next pull ERASES ITS OWN PICK.
Additionally `updateApprovedCompanionBoard` requires `expectedSessionRevision` to match exactly —
during a live draft the session revision bumps on every pick, so phone board saves would
frequently bounce as stale even when nothing about the board conflicts.

**The fix (all in this lane):**
1. **Claim path:** route through the existing `patchMlbDraftSessionSnakeCompanions`
   (`src/utils/leagueBuilderStorage.ts:2041`) so the phone's claim write mutates ONLY the
   `snakeCompanions` field, carrying every other field forward from the freshest local read.
   Keep `submitCompanionClaim`'s validation; adapt its output into the patch callback.
2. **Board path:** add ONE additive export to `src/utils/leagueBuilderStorage.ts` (file grant
   extended for exactly this): `patchMlbDraftSessionSeatBoard({ leagueId, seasonNumber, teamId,
   board, expectedBoardRevision })` built on `updateMlbDraftSessionAtomically`, which replaces
   ONLY `seatBoards[teamId]` (reject if the stored board's revision ≠ expectedBoardRevision —
   board-revision check only, NOT session-revision), bumps session revision, and carries all
   other fields forward. Wire the companion's `saveBoard` and what-if keep through it. Keep the
   device-approval authorization check (only an approved device for that team may write its board)
   — lift that check from `updateApprovedCompanionBoard` into the flow before patching.
3. **Pull-before-write:** call `syncEngine.pull()` at the top of both `claimDesk` and `saveBoard`
   to shrink the staleness window to sub-second.
4. **Clobber regression test:** extend the two-origin test — after phone pull, main device
   records a new completed pick and pushes; phone then saves its board; assert after both devices
   pull that BOTH the main device's pick AND the phone's board edit survive.

Known residual (document, do not build): a write landing inside the sub-second window can still
lose one pick — server-side field merge is the v2 fix; acceptable for v1 same-table play.

Gates: re-run tsc, build, owned suites + the extended sync test, and one full vitest (same flake
protocol). Append `## BUILDER REPORT 2` and print the marker `COMPANIONAUTH2-COMPLETE-$(hostname -s)`.

## BUILDER REPORT 2

**Status:** COMPLETE — Amendment 2 is implemented and its automated gates are complete; independent audit and JK's real-phone acceptance check remain outside this builder lane.

### Amendment 2 changes

1. `src/src_figma/app/pages/SnakeCompanion.tsx:165-189` — claim submission now pulls first, keeps `submitCompanionClaim` as the validator, and adapts its validated `snakeCompanions` result into `patchMlbDraftSessionSnakeCompanions`; the companion no longer saves a whole session row for a claim.
2. `src/src_figma/app/pages/SnakeCompanion.tsx:304-325` — board and what-if-keep saves now pull first, re-read the session, require a current approved claim for this device/team, and call the new seat-board patch with a board-only revision check. The unrelated session revision is no longer a rejection condition.
3. `src/utils/leagueBuilderStorage.ts:2066-2099` — added `patchMlbDraftSessionSeatBoard`, built on `updateMlbDraftSessionAtomically`. It replaces only `seatBoards[teamId]`, carries every other fresh field forward, rejects missing/stale board revisions, and bumps the session revision on success.
4. `src/utils/tests/snakeRoomPersistence.test.ts:146-181` — added direct storage proof that a board edit survives a newer session/pick revision, preserves the other team's board, and rejects a genuinely stale board revision without overwriting the stored board.
5. `src/utils/tests/syncEngine.dynamicElimination.test.ts:1098-1310` — extended the real sync-engine/two-origin scenario: phone holds a stale snapshot; main records and pushes a completed pick; phone restores its stale local context, pulls, patches its board, and pushes; both main and phone then pull and retain BOTH the pick and board edit.
6. `src/src_figma/app/components/snake/companion/__tests__/CompanionAuthFlow.test.tsx:36-68,231-233` — the page harness now exposes the narrow companion patch and pins pull-before-claim plus zero calls to raw `saveMlbDraftSession`.

Static retirement check:

```text
rg -n "saveMlbDraftSession|updateApprovedCompanionBoard" src/src_figma/app/pages/SnakeCompanion.tsx
(no output)
```

### Complete git-status inventory (17 paths)

Amendment 2 changed these six lane-owned paths:

- `spec-docs/contracts/CONTRACT_COMPANIONAUTH_2026-07-12.md`
- `src/src_figma/app/pages/SnakeCompanion.tsx`
- `src/utils/leagueBuilderStorage.ts`
- `src/utils/tests/snakeRoomPersistence.test.ts`
- `src/utils/tests/syncEngine.dynamicElimination.test.ts`
- `src/src_figma/app/components/snake/companion/__tests__/CompanionAuthFlow.test.tsx`

These nine lane-owned paths remain from the base contract + Amendment 1 and were not otherwise broadened by Amendment 2:

- `src/src_figma/__tests__/app/SyncModal.test.tsx`
- `src/src_figma/app/components/SyncModal.tsx`
- `src/src_figma/app/components/LoginForm.tsx`
- `src/src_figma/app/components/snake/companion/CompanionApprovalCard.tsx`
- `src/src_figma/app/components/snake/companion/CompanionClaimScreen.tsx`
- `src/src_figma/app/components/snake/companion/CompanionHelp.tsx`
- `src/src_figma/app/components/snake/companion/CompanionSignInScreen.tsx`
- `src/src_figma/app/components/snake/companion/SnakeCompanionFrame.tsx`
- `src/src_figma/app/components/snake/companion/__tests__/CompanionSurfaces.test.tsx`

These two untracked runner scripts were already present and were not touched:

- `run_lane.sh`
- `run_lane2.sh`

No git write command was run.

### Gate output

`NODE_ENV= npx tsc --noEmit`

```text
(no output)
exit 0
```

Focused companion/auth/storage suites:

```text
Test Files  6 passed (6)
Tests  20 passed (20)
exit 0
```

Full real sync-engine suite, including the extended isolated-device clobber regression:

```text
Test Files  1 passed (1)
Tests  84 passed (84)
exit 0
```

`NODE_ENV= npm run build`

```text
✓ 2690 modules transformed.
✓ built in 11.32s
PWA v1.2.0
mode      generateSW
precache  201 entries (5553.41 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
exit 0
```

Full repository suite:

```text
Test Files  1 failed | 658 passed | 8 skipped (667)
Tests  1 failed | 9773 passed | 15 skipped (9789)

Sole red: LeagueBuilderDraftSetup.poolLock
"reroll preserves roster-design pinned players as hard keeps"
Error: Test timed out in 15000ms.
```

The sole red belongs to the contract-characterized `LeagueBuilderDraftSetup` family and passed on the first exact solo attempt:

```text
Test Files  1 passed (1)
Tests  1 passed | 20 skipped (21)
Duration  5.96s
exit 0
```

`git diff --check`

```text
(no output)
exit 0
```

**Passing-test count:** 9,773 passed in the full batch run; its one characterized timeout passed immediately solo. Every Amendment 2 and owned test passed in all relevant runs.

### Uncertainties and accepted residual

- As specified by Amendment 2, a main-device pick that lands after the phone's pull but before the phone's patched row reaches the server can still be lost under row-level last-write-wins. A server-side field merge is the v2 fix; this sub-second residual is accepted for v1 same-table play.
- Automated coverage proves convergence through the repository's real sync engine and existing mock-Supabase seam. It does not replace JK's fresh-phone test against the deployed Supabase project.
- No live browser/device verification was run in this CLI builder lane.

## CAPTAIN POST-BUILD EDITS (Fable, 2026-07-12 — audit these too)

1. `LoginForm.tsx` — added `variant?: 'legacy' | 'ballpark'` (default legacy = byte-identical
   SyncModal rendering); companion sign-in passes `variant="ballpark"` so the form matches the
   ballpark kit instead of the sync modal's arcade styling.
2. `SnakeCompanion.tsx` `refreshSession` — while unclaimed, the 5s freshness loop now re-checks
   `hasOpenRoom` so a phone signed in BEFORE the main device opens the room flips from "NO OPEN
   SNAKE ROOM" to ready without a manual reload.
Verified: tsc clean; SyncModal + companion suites 17/17 green post-edit.

## AUDIT VERDICT (opus, independent, 2026-07-12) — APPROVE-WITH-NOTES

Re-ran self: tsc exit 0; syncEngine.dynamicElimination 84/84; companion+SyncModal 17/17;
snakeRoomPersistence 3/3. Auth gate fail-closed and race-free (verified). Clobber fix correct:
zero raw whole-session writes in SnakeCompanion.tsx; patchMlbDraftSessionSeatBoard replaces only
seatBoards[teamId], board-rev-only check, carries fields forward; board auth derives teamId from
the device's own approved claim (A cannot write B; unapproved rejected).

NOTE 1 (primary, non-blocking): the two-origin test (syncEngine.dynamicElimination.test.ts:1098-1310)
did NOT discriminate the field-patch fix — it pulled before the phone's board write, so a whole-row
save converged identically. Proven empirically by the auditor (mutation still passed). Real proof
lives in snakeRoomPersistence.test.ts:146-181 (discriminating) + zero-raw-writes grep.
NOTE 2: LoginForm extraction adds role="alert" + try/finally vs old inline form — inert for SyncModal,
not strictly byte-identical on the error path. Accepted.
NOTE 3: companionModel.ts updateApprovedCompanionBoard now orphaned (test-only) — cleanup candidate.

Merge-safe. JK's real-phone walk remains the acceptance gate.

## CAPTAIN RESOLUTION OF NOTE 1 (Fable, 2026-07-12)

Strengthened the two-origin test: the board payload now comes from the phone's STALE pre-pick UI
snapshot (the exact shape the old code path wrote), so the patch's internal fresh re-read is what
carries the main pick forward. Captain mutation-verified: swapping the patch for a whole-session
save from that snapshot FAILS the test (sync push rejects/converges wrong); reverting passes 84/84.
The centerpiece test now discriminates the fix.
