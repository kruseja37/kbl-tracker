# CONTRACT MIRROR-1 — console-mirror confirmation: schema + service (no UI in this contract)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Repo worktree: /Users/johnkruse/Projects/kbl-mirror (branch codex/console-mirror)

## Product ruling (JK 2026-07-11, verbatim intent)
"The user has to change the ratings/traits in the SMB4 console itself for gameplay, but we ALSO need
the living-season engine to know the current state of traits/ratings, so it should also make these
changes in the app so the app matches the console; then at the next checkpoint, ratings and traits can
update again, etc." Plus: "users have to sign off on changes in case there are bugs; make it an easy
confirmation log that keeps the change history somewhere hidden but easy to find and also lets the
user reject any changes."
Authority: `spec-docs/OBSERVER_GROUNDWORK_BRIEF_2026-07-11.md` §5 R2. Peer-reviewed design (Codex 5.6
Sol, 2026-07-11): confirmation is a STATE MACHINE with compare-and-set, not a checkbox.

## Current verified state (re-read each anchor before editing; mismatch → STOP)
- Ratings overlay status is only `pending | confirmed` (`src/utils/franchiseRatingsOverlayStorage.ts:15`);
  `confirmOverlay` flips status only, applies nothing (`src/engines/ratingsOverlayConfirmation.ts:71`);
  no production caller for either.
- Trait applier `applyConfirmedTraitOverlay` mutates player trait1/trait2 then updates the overlay in a
  second DB and admits non-atomicity (`src/utils/franchiseTraitConfirmApply.ts:19,41`); no production caller.
- Lens merges CONFIRMED overlays over the stored player ratings (`src/engines/ratingsOverlayMerge.ts:42`) —
  once applied rows mutate the player record this becomes a DOUBLE-APPLY hazard.

## SCOPE

**A. Status model (both overlay stores).**
Extend to: `pending → confirmed-applied | rejected | conflict | apply-failed`, plus `applied: boolean`
(traits already have it; add for ratings). Resolution metadata on the row (all optional for legacy
rows): `expectedPriorValue`, `proposedValue`, `actualEnteredValue` (may differ from proposed — SMB4
clamps, user adjusts), `resolvedAt` (epoch) + `resolvedCivilDate` (device-local YYYY-MM-DD),
`resolvedBy` (free actor/device string), `rejectReason?`, `playerRecordRevision?`, bounded
`applyError?`. NO new IndexedDB store, NO trackerDb version bump — these are field additions on
existing stores' rows.

**B. The mirror service** — new `src/utils/franchiseConsoleMirror.ts`:
1. `listUnresolvedDevelopment(franchiseId, seasonId)` → proposals grouped by checkpoint, OLDEST
   unresolved checkpoint first (the current UI picks the newest and strands older ones — the service
   contract must make oldest-first the only easy path).
2. `resolveRatingsProposal(overlayId, resolution)` where resolution =
   `{ action: 'confirm' | 'confirm-adjusted' | 'reject', actualValue?, actor? }`:
   - COMPARE-AND-SET: if the player's CURRENT app value ≠ the proposal's `expectedPriorValue` → mark
     `conflict`, apply nothing, return the conflict info. Never stack a stale delta.
   - confirm/confirm-adjusted: write the final value (proposed or actual) to the FRANCHISE PLAYER
     RECORD (the same store franchise rosters read), then mark the overlay `confirmed-applied` with
     full resolution metadata. If the player write succeeded but the overlay update throws → row must
     be recoverable: a re-run detects the already-applied player value and completes the overlay update
     idempotently (`apply-failed` is the durable state only when the PLAYER write failed).
   - reject: mark `rejected` + reason; player record untouched.
3. `resolveTraitProposal(overlayId, resolution)` — same contract, wrapping the existing
   `applyConfirmedTraitOverlay` mechanics (reuse its mutation logic; do not duplicate it) with CAS
   (expected prior trait state), the new statuses, and idempotent crash recovery.
4. `getDevelopmentHistory(franchiseId, playerId)` → chronological resolved rows (both kinds) — this IS
   JK's "hidden but easy to find" change history; the UI contract will surface it.
5. Every mutation idempotent: re-resolving a resolved row is a no-op returning current state.

**C. Kill the double-apply.**
`ratingsOverlayMerge` (and any other consumer of confirmed overlays) must EXCLUDE rows with
`applied: true` — the player record is already the truth for applied rows. Legacy `confirmed`
(unapplied) rows keep today's merge behavior. Prove with a test: applied row + merge → base value used.

**D. Explicitly OUT of scope / FENCE**
- NO UI files (`useFranchiseLensData.ts`, `FranchiseLensHub.tsx` — next contract).
- Do NOT touch KERNEL-lane files: `processCompletedGame.ts`, `seasonAggregator.ts`,
  `milestoneAggregator.ts`, `milestoneDetector.ts`, `franchiseCheckpointSweepCompute.ts`,
  `franchiseTraitGrantCompute.ts`, `franchiseFameCompute.ts`, `franchiseStadiumRecordsTap.ts`,
  `scheduleStorage.ts`, `gameStorage.ts`, `GameTracker.tsx`, `careerStorage.ts`.
- Do NOT block new-proposal generation for players with unresolved rows (that lives in the sweep
  compute — fenced); note it as a carry-forward in your report.
- No flag/activation changes; no test-utils/lsim changes.

## VERIFICATION (paste all)
1. `NODE_ENV= npm run build` → exit 0 (tail).
2. `NODE_ENV= npx vitest run` — FULL suite (storage-type ripple risk). Known solo-green batch flakes
   (LeagueBuilderDraftSetup, franchiseManualSmokeFixture) are baseline; any other new red is yours.
3. Proving tests: CAS conflict path; reject path; confirm-adjusted (actual ≠ proposed → actual wins);
   idempotent re-resolve; trait crash-recovery (player mutated, overlay update failed → re-run
   completes); merge excludes applied rows; oldest-first ordering from `listUnresolvedDevelopment`.
4. Changed-files list + the exact status-union and new-field diffs for both storage modules.

FORMAT: 1. Files changed 2. Per-scope-item (A-D) 3. Verification pasted 4. "MIRROR-1 complete" OR
"BLOCKED: <exact reason>". Commit on branch codex/console-mirror if the sandbox permits; else clean
tree + say so. NEVER push.
FAILURE PROTOCOL: anchor mismatch → STOP + report. Ambiguity → quote this contract + STOP. Product
semantics this contract doesn't answer → STOP (never improvise).

Use xhigh reasoning effort. Think step-by-step.
