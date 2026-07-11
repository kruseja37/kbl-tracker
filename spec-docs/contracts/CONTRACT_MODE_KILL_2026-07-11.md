# CONTRACT MODE-KILL-1 — three-mode fail-closed (kill the phantom fourth mode)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-modekill
(branch codex/mode-kill, stacked on codex/living-kernel2 = KERNEL-TRUTH-1 + KERNEL2 — you are on the
post-kernel shape by construction; do not wait for main).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait for confirmation; execute to completion.
Ignore any session-start protocol asking you to wait for JK; the captain holds the baton.

## Product ruling (JK 2026-07-11, binding)
The app has EXACTLY three game modes — EXHIBITION, ELIMINATION, FRANCHISE. A game that cannot be
classified is an ERROR, loudly rejected before writes — never a "casual season game." Authority:
`spec-docs/MODE_TRUTH_SWEEP_2026-07-11.md` (the verified classification + kill list; re-verify its
line citations — they were taken mid-KERNEL2 and may have shifted).

## SCOPE (fail-closed set; deletions minimal; legacy SAVES stay readable)

**M1. Mode-aware startup recovery (the live leak — headline).**
`AppHome.tsx:~8-16` + `useDataIntegrity.ts:~59-104`: recovery treats any complete-but-unaggregated
archive as a regular-season game and calls `aggregateGameToSeason` regardless of mode. Fix:
- franchise regular-season archives (allow-list per M2): recover as today (through
  `processCompletedGame`, which now owns idempotency).
- exhibition archives: mark reconciled WITHOUT season aggregation.
- elimination / playoff-marked archives: mark reconciled without regular-season writes (their own
  writers own their stores; recovery must not reach into them).
- unclassifiable archives: QUARANTINE — log loudly with the archive id, write NOTHING, do not mark
  reconciled in a way that hides them (a repeated warning on launch is acceptable and intended).
Tests: one recovery test per mode + the quarantine case.

**M2. `shouldAggregateToRegularSeasonStats` becomes an allow-list.**
(processCompletedGame.ts — KERNEL2's shape.) Require `competitionType === 'franchise'` AND a
resolvable franchiseId AND no postseason markers (playoffId/seriesId/gameNumber/isEliminationGame) —
instead of today's exclusion logic where a MISSING competitionType passes. The KERNEL scope-mismatch
assert and franchise-only ledger stay as-is. LEGACY NOTE: this gate runs on NEW completions and M1
recovery; legacy already-aggregated data is untouched. Tests: missing-type game → not aggregated +
(from a launch path) loud rejection per M4; franchise game unchanged.

**M3. Writers stop inventing scope.**
(a) `aggregateGameToSeason` (seasonAggregator.ts:~39-43,165-179): delete the `'season-1'` default —
absent explicit seasonId → typed error (the allow-listed caller always supplies it).
(b) `useGameState`'s completion builders (:~11190-11197, :~11896-11913): the
`statsScopeId → seasonId → 'season-1'` fallback arms lose the `'season-1'` terminal — a franchise
completion without scope must FAIL the completion with a user-visible error, an exhibition completion
carries exhibition identity with NO season scope (see M5).
(c) `getCompletedGameSeasonId` keeps accepting explicit options (callers) but never manufactures ids.

**M4. Launch-time identity validation BLOCKS.**
`gameTrackerIdentity.ts` `validateModeCompetitionScope` (~:166-169) warns today. For NEW launches it
must throw/block with a clear message; for RESTORED legacy games (resuming an old in-flight game) keep
the warning path (read tolerance). You must find the seam that distinguishes launch from restore — if
none exists cleanly, STOP that sub-item and report.

**M5. Exhibition stops fabricating `season-N`.**
`gameTrackerIdentity.ts:~122-140` stamps exhibition with a generic season scope. Change: exhibition
identity = exhibition competition + league identity, NO season scope. PRECONDITION (verify FIRST):
post-KERNEL Exhibition Leaders reads completed-game archives, but sweep every OTHER reader of
exhibition season-scoped rows (useSeasonStats over generic season ids, almanac queries) — if a LIVE
reader still depends on the fabricated scope, STOP this item with the list; do not break it.

**M6. New-write mode validation + one deletion.**
(a) `archiveCompletedGame`: a FRESH archive must carry a classifiable mode (franchise identity,
exhibition identity, or elimination/playoff markers) — else typed error. Reads of legacy archives
unchanged. (b) Delete `archiveBatchGameResult` (gameStorage.ts:~1083-1119 — zero callers; verify then
delete). Do NOT delete useGamePersistence (inactive-tree imports) or test-utils fixtures in this slice.

## FENCE
AppHome.tsx, useDataIntegrity.ts, processCompletedGame.ts (gate fn only), seasonAggregator.ts,
useGameState.ts (fallback arms only), gameTrackerIdentity.ts, gameStorage.ts (validation + deletion),
+ tests. Do NOT touch: Lens/Hub files, engines, scheduleStorage semantics, elimination/playoff
writers, flags, L-SIM harness. LEGACY-SAFETY WALL: nothing in this contract may mutate, repair, or
re-aggregate EXISTING stored data — quarantine and read-tolerance only. Any item that would require a
data migration → STOP that item.

## VERIFICATION (paste all)
1. Build exit 0. 2. FULL vitest run (summary; the sweep says some tests INTENTIONALLY exercise the
phantom mode — those tests must be UPDATED to expect the new rejection, each listed with a one-line
justification; an unlisted assertion change is an audit failure). 3. Proving tests per item M1-M6
(fail-before/pass-after). 4. L-SIM smoke leg (its fixtures stamp franchise identity — must stay
green; if a harness fixture depended on the phantom tolerance, STOP and report rather than editing
test-utils). 5. Changed-files list.

FORMAT: files → per-item (M1-M6) → verification → "MODE-KILL-1 complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: anchor mismatch (citations were mid-edit) → re-locate by symbol; live-reader
dependency (M5) or no launch/restore seam (M4) or migration-shaped need → STOP that item with
evidence, finish the rest.

Use xhigh reasoning effort. Think step-by-step.
