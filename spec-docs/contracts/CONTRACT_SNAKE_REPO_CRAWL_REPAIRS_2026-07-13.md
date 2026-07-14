# Contract: Snake Full-Repository Crawl Repairs

**Date:** 2026-07-13
**Branch:** `codex/snake-mock-draft-ready`
**Baseline HEAD:** `c69bf0b79b4bbacc4d329d66388732106e48bf7a`
**Verified origin/main at contract open:** `ea66830e0305d999f4140a101d452417f7d9152e`
**Audit of record:** `/root/snake_repo_crawl_auditor`
**Status:** Open

**Amendment 1:** Lane B proved the exact export consumers before mutation. The
three adjacent modules and import-only consumer paths listed below are frozen as
authorized. `FranchiseHomeContext.ts` may contain only the existing React
context and hook; it may not add persistence, routing, state transitions, or UI.

**Amendment 2:** Required import updates made two existing files part of the
branch-changed lint set and exposed whole-file debt. Structural lint cleanup is
authorized in `TeamHubContent.tsx` and `useAuctionDraft.test.ts` only. No feature,
storage, routing, assertion, or rendered-output change is authorized.

**Amendment 3:** `TeamHubContent.franchiseReads.test.tsx` mocks the former page
context export. Its mock path may be repointed to the extracted canonical
`FranchiseHomeContext` module only. No mock behavior or assertion may change.

**Amendment 4:** Lane A re-audit proved that generic session writers bypass the
narrow board patch guard and that recap-confirm error copy can still expose a
player key. Lane A must centralize authoritative resolution and board-delta
authorization in every transaction that can persist board maps, including
`saveMlbDraftSession`, `updateMlbDraftSessionAtomically`, and
`saveMlbDraftRoomSession`. No new production path is required.

**Amendment 5:** Lane B re-audit found six behavior regressions in the lint and
test-isolation repair. All six must be repaired without restoring lint debt or
weakening readiness assertions. The existing product paths are already allowed;
the focused test paths listed below are added for mutation-honest coverage.

**Amendment 6:** Lane A's second re-audit found two remaining authorization
bypasses. Atomic updater callbacks must receive an isolated working copy while
authorization retains an untouched authoritative pre-action snapshot. Runtime
standalone and embedded board keys must be validated against primitive key
types, the active session phase, and frozen clubs before hydration or carryover.

**Amendment 7:** Lane A's third re-audit proved that authorization facts could
still be changed in a prior board-free transaction. Post-creation frozen club
team-ID membership and persisted draft-manifest truth are immutable across every
writer. A present runtime manifest without a valid phase must fail closed.

## Why this contract exists

The hostile full-repository Snake crawl confirmed two product bugs, one storage
integrity boundary gap, and branch acceptance-gate failures. This contract
repairs every confirmed item without reopening approved Snake product design.

Two builders may work concurrently, but their path sets are disjoint. Neither
builder audits its own work. The audit-of-record agent must re-audit both lanes.

## Lane A: Snake correctness and integrity

### A1. Reconcile embedded and standalone seat boards symmetrically

- Reads and writes must choose the same authoritative seat board.
- The higher `revision` wins whether it is embedded in the draft session or in
  the standalone seat-board store.
- A write with `expectedBoardRevision` equal to the authoritative revision must
  remain writable even when the other copy is older.
- The successful write must atomically converge both copies to the new board.
- Equal revisions with structurally unequal board payloads are corruption and
  must fail closed with a clear error. They may not silently select one copy.
- Applying session and standalone-board sync groups in either order must converge
  to a writable state once both groups arrive.
- Stale expected revisions must still fail; do not weaken optimistic concurrency.
- `saveMlbDraftSession` must read the existing session plus both standalone board
  stores and write the candidate session plus converged standalone copies in one
  transaction. A conflict must abort before either store changes.
- Generic session/room writers must resolve authoritative pre-write boards before
  applying any candidate board map. They may not overwrite a newer standalone or
  embedded copy.
- Missing or malformed standalone board records, including a phase/payload shape
  mismatch, must fail closed or use a validated authoritative copy. Runtime
  validation is required at the storage boundary; TypeScript shape is not proof.
- Atomic updater callbacks may mutate their input in place, but that working copy
  must never alias the authoritative pre-action session used for authorization.
  Deep-clone or equivalently isolate all nested board maps and frozen setup data.
- Hydration must reject empty/non-string team keys, phase mismatches, nonmember
  teams, and self-consistent record IDs derived from invalid runtime metadata.
- Every carried-forward resolved board key is validated against the session
  phase and frozen clubs even when the caller does not change that key.
- After initial creation, every writer preserves the authoritative frozen club
  team-ID set. Existing same-team metadata such as `hotseat` may change only when
  already allowed; team membership may not expand, shrink, or be replaced.
- Every atomic/generic writer preserves a persisted draft manifest through the
  canonical `preservePersistedSnakeDraftManifest` invariant before persistence.
  A board-free transaction may not remove completion truth or reset it for a
  later board mutation.
- If `draftManifest` is present at runtime, its required `phase` must be present
  and valid. Missing phase is malformed, not equivalent to no manifest.

### A2. Authorize main-device board writes in the transaction

- MLB board writes require an incomplete MLB session and a team contained in the
  frozen MLB Snake clubs.
- FARM board writes require an incomplete FARM session and a team contained in
  the frozen FARM Snake clubs.
- Completed/draft-manifest sessions reject board mutation.
- Phase-mismatched writes reject even when IDs and revisions otherwise match.
- The checks occur inside the same transaction that writes the board.
- Practice MLB sessions follow the MLB rule; normal valid main and companion
  writes remain unchanged.
- Board-delta authorization applies to every exported writer capable of changing
  `seatBoards` or `farmSeatBoards`, not only `patchIndependentSeatBoard`.
- Compare the authoritative pre-transaction boards with the proposed boards. For
  every changed key enforce incomplete pre-action state, correct frozen phase,
  and frozen-club membership before any store write.
- Valid initial session creation is permitted after validating all initial board
  keys against the new session's frozen phase/clubs. A valid final-pick write is
  permitted because authorization uses the fresh incomplete pre-action session.

### A3. Never render raw player identifiers

- Missing MLB and FARM player lookups render the neutral copy `UNKNOWN PLAYER`.
- The MLB live ticker uses the same neutral copy.
- Recap, ticker, accessibility labels, titles, and error copy must never fall back
  to `playerId`, UUIDs, canonical IDs, or other internal keys.
- Known players continue to render their normal names.
- MLB and FARM recap confirmation failures must render neutral user-facing copy.
  They may not render arbitrary engine/storage error messages verbatim. Tests
  must click Confirm and inspect alert text, visible text, and `innerHTML` for the
  missing raw ID.

### Lane A allowed files

- `src/utils/leagueBuilderStorage.ts`
- `src/utils/tests/snakeRoomPersistence.test.ts`
- `src/utils/tests/syncEngine.dynamicElimination.test.ts`
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- `src/src_figma/app/components/snake/SnakeDraftRecap.tsx`
- `src/src_figma/__tests__/pages/SnakeDraftRoom.2a.test.tsx`
- `src/src_figma/__tests__/pages/SnakeDraftRoom.completion.test.tsx`
- `src/src_figma/__tests__/pages/SnakeDraftRoom.farm.test.tsx`

No other production file is authorized in Lane A without a proven dependency
and a committed contract amendment.

### Lane A required tests

1. Embedded rev2 + standalone rev1 reads rev2 and writes rev3 successfully.
2. Standalone rev2 + embedded rev1 reads rev2 and writes rev3 successfully.
3. Both sync arrival orders end at a writable, converged board.
4. Equal revision with unequal payload fails read and write closed.
5. Stale expected revision still fails.
6. Completed MLB and FARM sessions reject writes.
7. MLB/FARM phase mismatch rejects writes.
8. Unknown player in MLB recap, FARM recap, and live ticker renders exactly
   `UNKNOWN PLAYER`, with no internal ID in the DOM.
9. Generic save/session-room writers cannot bypass completion, phase, club, or
   authoritative-revision rules.
10. Generic save conflict leaves embedded and standalone raw-store bytes
    unchanged.
11. Valid initial creation and final-pick reconciliation still succeed.
12. Missing/malformed board records and phase/payload mismatch fail closed.
13. MLB and FARM missing-player recap tests press Confirm and prove no raw ID is
    present in the alert, visible text, or `innerHTML`.
14. An in-place atomic callback cannot rewrite completion, phase, frozen clubs,
    or the pre-action board snapshot to bypass authorization.
15. Raw standalone rows with wrong session phase, nonmember teams, empty keys, or
    non-string keys fail hydration and leave all stores byte-unchanged after
    rejected save/update/room/freeze attempts.
16. A two-transaction club-expansion then board-creation attack fails and leaves
    raw bytes unchanged.
17. A two-transaction manifest-removal/reset then completed-session board attack
    fails and leaves raw bytes unchanged.
18. Hydration/save/update/room/freeze reject a present manifest missing `phase`.

## Lane B: branch acceptance gates

Lane B is mechanical/gate repair. It may not change Snake, auction, franchise,
or schedule behavior.

### B1. Diff hygiene

- Remove the branch-added trailing whitespace in
  `spec-docs/contracts/CONTRACT_SNAKE_INTELLIGENCE_2026-07-13.md`.
- `git diff --check origin/main...HEAD` must pass after the lane is committed.

### B2. Exact changed-file ESLint

Bring the current 112 errors and nine warnings to zero for the branch-changed
TypeScript/TSX files. The baseline file set is:

- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.board.test.tsx`
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.universe.test.tsx`
- `src/src_figma/app/pages/FranchiseHome.tsx`
- `src/src_figma/app/pages/FranchiseSetup.tsx`
- `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx`
- `src/src_figma/app/pages/LeagueBuilderFarmAuctionDraft.tsx`
- `src/src_figma/hooks/useLeagueBuilderData.ts`
- `src/utils/tests/companionAtomicPersistence.test.ts`
- `src/utils/tests/syncEngine.dynamicElimination.test.ts` is assigned to Lane A;
  Lane A must also close its listed lint findings.

Rules:

- Remove genuinely unused test imports/helpers; do not add disable comments.
- Preserve every test and assertion. No `.skip`, `.only`, deletion, snapshot
  rewrite, or assertion weakening.
- Resolve hook dependency/state/ref findings structurally. Do not silence the
  rules.
- Fast-refresh findings may be solved by moving pure exported helpers/constants
  to one adjacent helper module per affected page. Only the minimum helper and
  the existing tests/importers that consume those exports are authorized.
- New helper modules contain no state, storage, routing, or UI behavior.
- Production behavior must be mutation-tested by the existing focused suites.

### B3. Pool-lock test isolation

- Diagnose the full-suite-only timeouts in
  `LeagueBuilderDraftSetup.poolLock.test.tsx` and its shared test utilities.
- Preserve the behavioral assertions that demand extraction, pool writes, hard
  keeps, manual exclusions, and quality-center propagation.
- Prefer deterministic readiness/settling over arbitrary sleeps.
- A bounded timeout increase is allowed only after proving the operation is
  healthy but delayed under full-suite CPU saturation; it may not replace a
  missing event or write.
- The file must pass alone, in the changed-file matrix, and in the full suite.
- Every Regenerate interaction in the affected quality-center/hydration tests
  must use the readiness-aware helper, including the hard-keep/manual-exclusion
  case. Saturated parallel repetitions must pass without a timeout increase.

### B4. Preserve behavior while clearing lint

- Auction nomination selection plus opening-bid reset must be one atomic state
  transition. A non-default selected player may not be overwritten by stale
  pre-event state.
- MLB and FARM bid draft state must be keyed by lot identity/generation as well
  as its minimum. Consecutive lots with the same opening ask must not resurrect
  a prior lot's custom amount.
- Franchise persistence repair must not rerun on ordinary rerenders. Retain the
  latest refresh functions safely while keeping the repair trigger dependent on
  stable franchise/season primitives.
- Advisor responses for a prior draft/session must be ignored after the active
  draft changes. A late payload may not switch state back to its draft ID.
- Team Hub sort output must preserve the original relational comparison and
  missing-value behavior exactly. Locale-aware replacement semantics are not
  authorized.

### Lane B additional allowed files

- `spec-docs/contracts/CONTRACT_SNAKE_INTELLIGENCE_2026-07-13.md`
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx`
- `src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.testUtils.ts`
- `src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx`
- `src/src_figma/__tests__/franchiseMode/FranchiseHome.test.tsx`
- Existing focused tests that import a moved pure helper, import-update only
- At most one new adjacent pure helper module for each affected production page

Frozen helper and importer paths:

- `src/src_figma/app/pages/LeagueBuilderAuctionDraft.helpers.ts` (new; the five
  existing pure exported helpers only)
- `src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.computeBoardAutoAdvanceLine.test.ts`
- `src/src_figma/app/hooks/__tests__/useAuctionDraft.test.ts` (import update and
  structural lint cleanup only)
- `src/src_figma/app/components/auction/__tests__/WhisperPanel.test.tsx`
- `src/src_figma/app/pages/LeagueBuilderFarmAuctionDraft.helpers.ts` (new;
  `buildFarmBridgeHeadline` only)
- `src/src_figma/__tests__/pages/LeagueBuilderFarmAuctionDraft.test.tsx`
- `src/src_figma/app/pages/FranchiseHomeContext.ts` (new; existing context and
  hook only)
- `src/src_figma/app/components/TeamHubContent.tsx` (import update and structural
  lint cleanup only)
- `src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx`
  (mock import path update only)
- `src/src_figma/app/components/LineupsTabContent.tsx` (import update only)
- `src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx` (replace
  page re-export imports with direct canonical helper imports only)

Lane B must report every added helper/importer before final handoff. It may not
touch Lane A files.

### Amendment 5 required tests

1. Select a non-default auction player and nominate that exact player.
2. Two consecutive MLB lots with the same minimum start from independent bid
   drafts.
3. Two consecutive FARM lots with the same minimum start from independent bid
   drafts.
4. Ordinary Franchise Home rerenders and tab changes perform persistence repair
   once for the same stable franchise/season identity.
5. A deferred advisor response for draft A resolves after switching to draft B
   and is ignored.
6. Team Hub sorting matches the pre-repair relational order for strings,
   numerics, equal values, and missing values.
7. At least four saturated parallel pool-lock runs pass all readiness cases with
   no sleep or timeout increase.

## Gates required for each lane

- Red-first mutation-honest focused tests
- Exact allowed-path lint with zero warnings
- Typecheck
- Relevant focused/integration suites
- `git diff --check`
- Exact scope/status report
- No staging or commit by either builder

## Combined gates before re-audit

- All Snake-owned tests
- Draft setup/pool-lock/persistence/sync/migration/routing/handoff/franchise
  launch suites
- Permanent Snake responsive Playwright 4/4
- Exact ESLint over every branch-changed existing `.ts`/`.tsx` file: zero errors,
  zero warnings
- Typecheck
- Production build
- Full Vitest with machine-readable failure capture
- `git diff --check origin/main...HEAD` after the repair commit
- Clean status and no generated artifacts

## Non-goals

- No auction design changes.
- No schedule generation before franchise launch.
- No Legends Library work.
- No new Snake intelligence or UI redesign.
- No data migration that guesses conflicting equal-revision board content.
- No test weakening or lint suppression.
- No builder self-audit.

## Acceptance

Both builders return evidence without staging or committing. The coordinator
routes findings back until focused gates are green, then a separate auditor
reviews each lane. Only the coordinator stages the exact verified paths after a
fresh `origin/main` fetch. The original repo-crawl auditor then reruns the full
cross-lane audit and must return zero major and zero minor findings.
