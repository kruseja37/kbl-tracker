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

## Amendment 8 — combined-branch closing-audit repairs (2026-07-14)

### Audit verdict

The independent whole-branch re-audit of `c178be67` against `origin/main`
`ea66830e` returned **NOT VERIFIED: three major findings, zero minor findings**.
The full serial repository suite passed 681 files / 10,109 tests, the focused
Snake matrix passed 48 files / 375 tests, TypeScript and production build
passed, responsive Playwright passed 4/4, and diff/status checks were clean.
Those green gates do not override the three deterministic contract breaches.

### A8-1. Companion cover must synchronously clear rational-risk state

- `SnakeCompanion` must pass a null request into `useSnakeRationalRisks` while
  the device is covered, before the covered-screen return.
- Returning to the same seat may not reuse a ready pre-cover risk snapshot.
- Covering must clear private rational-risk output and actions synchronously;
  a later worker response from the pre-cover epoch must remain stale.
- Add a caller-level test that reaches a ready risk result, covers the device,
  returns to the same seat without a new worker result, and proves the old
  result/action cannot render. Also prove the caller request is null while
  covered.

### A8-2. Remove every branch-added lint suppression structurally

- The branch-changed TypeScript/TSX file set must pass ESLint with
  `--no-inline-config`, zero errors, and zero warnings.
- Remove the two `react-hooks/set-state-in-effect` suppressions in
  `useSnakeAssistantBoard.ts` and `useSnakeGuideRecommendation.ts`; derive or
  reset state structurally without stale results, render loops, or behavior
  drift.
- Remove the file-wide fast-refresh suppressions from
  `SnakeDraftSetupAdapter.tsx` and `LeagueBuilderDraftSetup.tsx`. Move pure
  exported helpers/constants/types into adjacent helper modules where needed;
  the modules may contain no component state, storage writes, routing, or UI
  behavior.
- Remove the branch-added/relocated hook-dependency suppressions in
  `LeagueBuilderDraftSetup.tsx` by stabilizing dependencies or restructuring
  the callbacks/effects. The pre-existing base suppression for
  `positionGroups` must not be expanded; if the changed-file no-inline gate
  reaches it, close it structurally too.
- No new disable comment, `.skip`, `.only`, timeout increase, assertion
  weakening, or generated lint ignore is allowed.

### A8-3. Neutral identity copy is exact and fail-closed

- No missing player or team lookup may render an internal ID/key in any Snake
  surface, activity line, ticker, order row, alert, or DOM attribute.
- Player fallback text is exactly `UNKNOWN PLAYER`.
- Team fallback text is exactly `UNKNOWN TEAM`.
- Replace the advisor-log `gonePlayerId` fallback, companion ticker `A PLAYER`
  fallback, room-view unknown-team fallback, and setup-adapter unknown-team
  fallback.
- Add mutation-honest tests that inject absent player/team lookups and assert
  the internal IDs are absent from visible text and `innerHTML`.

### Amendment 8 allowed production paths

- `src/src_figma/app/pages/SnakeCompanion.tsx`
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`
- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
- `src/src_figma/app/components/snake/setup/SnakeDraftSetupAdapter.tsx`
- `src/src_figma/app/components/snake/desk/useSnakeRationalRisks.ts`
- `src/src_figma/app/components/snake/desk/useSnakeAssistantBoard.ts`
- `src/src_figma/app/components/snake/desk/useSnakeGuideRecommendation.ts`
- `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx`
- Adjacent pure helper modules required only to relocate existing exported
  helpers/constants/types from the two fast-refresh pages.

### Amendment 8 allowed test/importer paths

- Existing focused tests for the production modules above.
- Existing tests/importers that directly import a relocated pure export;
  import-path changes only outside the focused test files.
- No auction, schedule, franchise-launch, storage-schema, economy-math, or
  Legends behavior change is authorized.

### Amendment 8 gates

1. Red-first focused tests for cover clearing and neutral identity fallbacks.
2. Focused hook/page/component suites.
3. Exact changed-file ESLint with `--no-inline-config`, zero errors/warnings.
4. Full Snake matrix.
5. Responsive Playwright 4/4.
6. TypeScript and production build.
7. Full serial Vitest.
8. `git diff --check origin/main...HEAD` and clean exact-scope status.
9. Separate auditor returns VERIFIED with zero major and zero minor findings.

Builder does not stage or commit. Builder does not audit its own work. Use high
reasoning effort.

## Amendment 9 — Amendment 8 audit rejection and repair 2 (2026-07-14)

### Re-audit verdict

The independent Amendment 8 audit returned **NOT VERIFIED: three major
findings, zero minor findings**. Green focused, Snake, TypeScript, build, lint,
and responsive gates did not cover the following deterministic failures.

### A9-1. Cover is a real privacy epoch, not only a null render

- `useSnakeRationalRisks` must not retain or reuse a settled snapshot across a
  null-request cover boundary, even when the same semantic request key returns.
- Cover must invalidate the prior worker generation and prior ready result.
- Returning to the same seat before a new worker response must remain idle or
  pending; it may not show the pre-cover recommendation/action.
- Directly test the real hook without mocking it: settle `AT_RISK`, render null,
  re-enter with the identical key, prove the old result is absent before the
  fresh response, then prove a late pre-cover response remains stale.

### A9-2. Hook state identity and worker identity must match

- `useSnakeAssistantBoard` and `useSnakeGuideRecommendation` must key both
  displayed snapshot state and worker lifecycle/response acceptance to the same
  semantic request identity.
- A freshly cloned request object with an unchanged semantic key must neither
  clear a ready result nor strand the hook in pending.
- A meaningfully changed key must still clear stale output, start a new worker,
  and reject the old worker's response.
- Add direct real-hook tests for same-key cloned request objects for both hooks;
  mutation must fail if reference equality is restored.

### A9-3. Complete the exact neutral-team fallback sweep

The Amendment 8 allowlist is expanded to include:

- `src/src_figma/app/components/snake/companion/CompanionApprovalCard.tsx`
- `src/src_figma/app/components/snake/trade/TradePackageCard.tsx`
- `src/src_figma/app/components/snake/trade/SnakeCommissionerTrade.tsx`
- Their existing focused tests only.

Every live missing-team lookup in those surfaces must render exactly
`UNKNOWN TEAM`, never `CLUB` or an internal ID. Add focused DOM tests and run a
production Snake-surface sweep for missing-team/player fallback literals and
ID fallbacks. Any additional live violation is in scope only after it is added
to this contract before editing.

### Amendment 9 gates

1. Direct real-hook red-first mutations for A9-1 and both A9-2 hooks.
2. All Amendment 8 focused tests plus the expanded identity tests.
3. Exact branch-changed TypeScript/TSX ESLint with `--no-inline-config`, zero
   errors and zero warnings; no disable comments.
4. Full 48-file Snake matrix.
5. Responsive Playwright 4/4.
6. TypeScript and production build.
7. Full serial Vitest after the independent audit is green on the deterministic
   findings.
8. Diff/status hygiene and separate auditor verdict of zero major/minor.

Builder does not stage or commit and may not audit its own work. Use high
reasoning effort.

### Amendment 9 closing record (2026-07-14)

**Independent verdict: VERIFIED — zero major, zero minor.** The auditor directly
mutation-tested the real privacy epoch and both semantic request-identity hooks,
then confirmed the exact neutral identity sweep. Independent focused proof was
9 files / 131 tests. The builder's combined changed-test gate was 14 files / 266
tests; the contract Snake matrix was 48 files / 383 tests. Exact changed-file
ESLint with `--no-inline-config` returned zero errors and zero warnings;
responsive Playwright passed 4/4; TypeScript, production build, and diff hygiene
were green. No worker leak, cache resurrection, stranded pending lifecycle, or
residual `CLUB` / `A PLAYER` fallback survived the attack.

The captain then ran the required post-audit serial repository gate on the exact
audited tree: 681 files passed with 8 skipped (689 total); 10,120 tests passed
with 15 skipped (10,135 total); zero failed. Amendment 9 closes FINDING-157,
FINDING-158, and FINDING-159. The next gate is the live Snake UI crawl; JK's
browser walk remains the only product-acceptance gate.
