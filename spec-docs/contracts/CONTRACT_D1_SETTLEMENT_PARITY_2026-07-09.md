# CONTRACT — D1: settlement + franchise parity (traditional draft program, 2026-07-09)

**Builder:** Codex (xhigh). **Auditor:** independent opus agent (not you). **Captain:** Fable.
**Branch:** codex/d1-settlement-parity-2026-07-09 (this clone). Base: main @ d4e04974.
**Binding design:** spec-docs/TRADITIONAL_DRAFT_PROGRAM_2026-07-09.md — §3 (IV settlement),
§8 (correctness planks), §8a (the handoff interface — READ IT IN FULL; it is the evidence-
grounded spec for this lane). The doc governs on any ambiguity. UNKNOWNs = STOP-and-report.
**Git discipline:** your sandbox cannot write .git — run NO git write command. The captain
committed this contract and cuts commits from your finished tree. Leave every file in place.
Do not edit any spec-doc except APPENDING your report here.

## Mission
Make a completed snake draft a first-class citizen of the economy and the living season —
BEFORE any draft UI work happens. After this lane, a completed snake session settles honest
salaries, is recognized everywhere the app asks "did this league draft?", and freezes the
same-quality snapshot into franchise/season as an auction does.

## Build items (each per §8/§8a — restated here; the doc has the evidence and file:lines)
1. **Settlement stamp + commit function.** New
   `commitCompletedSnakeSessionToLeagueRosters(...)` (shape-parallel to the auction's commit
   in leagueBuilderAuctionPipeline.ts) reading `completedPicks`; it stamps
   `player.salary = player.settledSalary = the player's IV` (RegisteredPool lookup) at commit.
   Add a `settledSalary` field to the `completedPicks` entry shape (persisted at pick time by
   the future D2 page; for D1, the commit function derives-and-stamps from the pool so a
   session lacking the field still settles correctly — tolerate both).
2. **Shared completion helper.** `isMlbDraftComplete(leagueId)` (or equivalent): auction
   session state === AUCTION_COMPLETE OR mlbDraftSessions session with
   `currentPickIndex >= pickOrder.length`. Single source of truth.
3. **The six gate sites go format-aware via the helper** (evidence in §8a):
   a. franchiseInitializer freeze gate (~:783) — the freeze block runs for completed snake
      sessions too, via the adapter (item 4).
   b. Copy-league drafted guard (useLeagueBuilderData ~:420-478) — explicit, not accidental.
   c. Draft Setup resume / Run-It-Back button state (LeagueBuilderDraftSetup ~:100,1583-1612).
   d. Franchise Setup "already drafted" badge (FranchiseSetup ~:100-219,672-697).
   e. Farm-auction MLB-completion gate (useFarmAuctionDraft ~:214-217) + item 6.
   f. Roster-commit guard — item 1's function carries the same completed-or-throw discipline.
4. **Freeze adapter** — a snake branch for `buildDraftFreezeInputs` (pure adapter; the freeze
   engine itself does NOT change):
   - won order = `completedPicks` array order; winnerTeamId = `completedPicks[i].teamId`
   - settledSalary from item 1's stamp (or IV lookup); iv from the RegisteredPool
   - **payClass override for snake (captain-ruled, §8a):** compute per pick
     `delta = overallPick − ivRank` (ivRank = rank of the player among the confirmed pool by
     IV, 1 = best); `threshold = max(3, round(0.05 × totalPicks))`;
     delta ≤ −threshold → the "above" class; |delta| < threshold → "within";
     delta ≥ threshold → "below". Wire this so the existing draftMorale machinery consumes it
     unchanged — if the current payClass computation is inlined such that an override needs an
     engine-signature change, STOP-and-report with the exact seam.
   - exclusion set = EMPTY for snake (no shills; `deriveShillTeamIds` never called on this
     path).
5. **Run-It-Back:** `resetCompletedDraftArc` also deletes the snake session
   (`deleteMlbDraftSession` — exists, currently uncalled) so reset works for either format.
6. **Farm carryover (captain-ruled):** for snake leagues, MLB "unspent" =
   `max(0, resolveLeagueSalaryCap(league) − Σ settledSalary of the team's MLB picks)`, fed to
   the UNCHANGED `computeMlbToFarmCarryover`. Auction path untouched.
7. **Canonical roster shape:** delete the page-local `createEmptyMlbDraftRoster`
   (LeagueBuilderSnakeDraft.tsx ~:155-185) in favor of the canonical `createEmptyTeamRoster`.
   (The page is unrouted — this is safe cleanup; do NOT route it or change its UI otherwise.)
8. **deepCopyLeagueToFranchise verify-read:** confirm (and record in your report with
   file:line) that it reads TeamRoster generically with no auction-session coupling — the
   sweep flagged its internals unverified. If you find coupling, STOP-and-report.

## Non-goals
No routing changes, no draft UI work, no CPU picker, no trades (later lanes). No auction-path
behavior changes anywhere — every existing auction test must stay byte-identically green. No
engine changes to computeDraftFreeze/draftMorale beyond what item 4 strictly requires (and if
it requires any, STOP first).

## Repro-first (the silent no-ops become loud, then fixed)
Before the fix, commit-ready failing tests proving today's gaps against a fixture completed
snake session: (a) franchise init seeds NO morale baselines and stamps NO settledSalary;
(b) Draft Setup / Franchise Setup show the league as never-drafted; (c) farm carryover is $0
despite cap headroom; (d) Run-It-Back leaves the snake session behind. Run them red, record
the output, then build.

## Exit gauntlet (the §8a freeze-snapshot proof — the lane's centerpiece test)
A permanent suite: six production-default full snake drafts (simulated pick sequences —
deterministic fixture picks are fine since the CPU picker is a later lane; use need-aware
greedy fixture logic so rosters are legal) → commit → franchise init → assert for EVERY team:
legal 22; all salaries stamped = IV; morale baselines seeded per the payClass ruling
(including at least one "fell" and one "reach" case asserted at the threshold boundary);
draft-baseline TrueValue rows written; farm budget = cap-headroom carryover. Plus
format-parity: an auction league fixture through the same assertions proves the auction path
is untouched.

## Gates
1. npx tsc -b → clean
2. npm run build → exit 0
3. New suites + franchiseInitializer/draftFreeze/farm-wallet/pipeline suites +
   LeagueBuilderDraftSetup split suites + FranchiseSetup tests → green
4. ONE full NODE_ENV= npx vitest run → any new red = fix or STOP. Known solo-rerun flakes:
   AwardsWatchlist, franchiseManualSmokeFixture, GameTrackerLaunchState, RosterDesigner
   (D1 two-way toggle), LeagueBuilderDraftSetup.money (M3 tier par).

## Report
APPEND here: per-item disposition, repro red proof, the item-8 verify-read evidence, gate
outputs, STOP items. Working tree stays dirty for the captain.

---

## Builder report — BLOCKED at contract STOP (2026-07-09)

**Disposition:** STOPPED before repro-test or implementation edits. No git write command was
run. No product or test file was changed.

**STOP item — item 4 payClass override requires a freeze-engine seam change:**

- `src/engines/draftFreeze.ts:20-30` defines `DraftFreezePlayerInput` with IV, settled salary,
  and scout range, but no pay-class override.
- `src/engines/draftFreeze.ts:85-97` computes morale inside `computeDraftFreeze` by calling
  `computeDraftMoraleFromRaw(...)` with settled salary and scout range.
- `src/engines/draftMorale.ts:80-93` derives `payClass` internally through
  `classifyDraftPay(winningBid, range)`; the adapter cannot supply the captain-ruled
  slot-vs-IV-rank class.
- `src/utils/draftFreezeInputs.ts:24-49,81-98` can only construct auction inputs with a
  perceived-value scout range. Encoding the snake class by falsifying that scout range would
  conflate two different meanings and was not attempted.

The smallest honest seam appears to be an optional explicit pay-class override on
`DraftFreezePlayerInput`, consumed by `computeDraftFreeze` while preserving the existing
auction default. That is still an engine input/behavior change. The contract says that when
the current pay-class computation is inlined such that an override needs an engine-signature
change, and when item 4 requires an engine change, the builder must STOP first. Captain must
approve/amend the exact seam before D1 continues.

**Repro red proof:** NOT RUN — the STOP was discovered during mandatory pre-build seam
inspection, before the contract's repro-first edit/run sequence.

**Items 1-8:** NOT STARTED due to the item-4 STOP.

**Item 8 verify-read:** NOT REACHED due to the item-4 STOP.

**Gates / exit gauntlet / full Vitest:** NOT RUN due to the item-4 STOP.

**Working tree:** pre-existing untracked `dispatch-prompt.txt` remains untouched; this appended
report is the only builder-created change.

---

## Captain ruling on the item-4 STOP (2026-07-09) — seam authorized, build resumes
The STOP was correct: falsifying the scout range to smuggle the class in would conflate two
meanings and is forbidden. The minimal honest seam is AUTHORIZED, with guards:
1. `DraftFreezePlayerInput` gains OPTIONAL `payClassOverride?: 'above' | 'within' | 'below'`.
   `computeDraftFreeze`/`computeDraftMoraleFromRaw` consume it: when present, it replaces the
   internal `classifyDraftPay` result; when absent, behavior is EXACTLY today's — same code
   path, no reordering.
2. ONLY the snake adapter branch ever sets it (with the ruled slot-vs-IV-rank mapping). The
   auction input builder never sets it.
3. **Tripwire test (mandatory):** an auction fixture's complete freeze output (morale
   baselines, payroll, fan morale, per-player classes) asserted DEEP-EQUAL before/after this
   change — pin the pre-change output as the expected value, computed from the unmodified
   engine (you may generate it by temporarily checking the engine behavior in the test itself
   against a hand-derived expectation — record how you derived it in the report).
4. This is the ONLY engine-signature change authorized in this lane. Everything else in the
   contract binds unchanged. Resume from the repro tests.

---

## Builder report — COMPLETE after captain ruling (2026-07-09)

**Disposition:** Items 1–8 and the permanent exit gauntlet are implemented. No git write
command was run. The pre-existing untracked `dispatch-prompt.txt` was not read, edited, or
removed. Product files, tests, and this appended report remain in the working tree for the
captain.

### Repro-first red proof

Before production edits, the five contract repro files were run together with
`NODE_ENV= npx vitest run ... --reporter=verbose`: **5 failed, 82 passed**. The five intended
failures were: completed-snake franchise initialization seeded no freeze baseline; the farm
wallet omitted snake cap headroom; Franchise Setup showed no draft-complete badge; Draft
Setup showed no `Drafted ✓`; and Run-It-Back left the snake session behind. The same repros
are now green in the focused gates below.

### Item dispositions

1. **COMPLETE — settlement stamp and roster commit.**
   `commitCompletedSnakeSessionToLeagueRosters` is at
   `src/utils/leagueBuilderAuctionPipeline.ts:385-449`. It rejects an incomplete cursor,
   prevalidates every unique winner against RegisteredPool before any roster write, commits
   the completed picks by team, and stamps source `salary` plus `settledSalary` at IV through
   the canonical assignment writer. The persisted pick shape now tolerates optional
   `settledSalary` at `src/utils/leagueBuilderStorage.ts:349-358`; legacy rows without it are
   covered. Focused commit coverage is at
   `src/utils/tests/draftPipeline.integration.test.ts:2059-2156`.
2. **COMPLETE — shared completion truth.**
   `src/utils/mlbDraftCompletion.ts:7-51` defines the auction and snake predicates plus the
   single combined read/API. Snake completion is exactly
   `currentPickIndex >= pickOrder.length`.
3. **COMPLETE — all six gate sites are format-aware.**
   Franchise readiness/freeze uses the combined read at
   `src/utils/franchiseInitializer.ts:110-127,784-844`; duplicate-league protection uses it at
   `src/src_figma/hooks/useLeagueBuilderData.ts:419`; Draft Setup resume/Run-It-Back uses it at
   `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx:1593-1615`; Franchise Setup badges use
   it at `src/src_figma/app/pages/FranchiseSetup.tsx:199-210`; farm initialization uses it at
   `src/src_figma/app/hooks/useFarmAuctionDraft.ts:222-248`; and item 1 carries the completed-
   or-throw roster guard. The split Draft Setup harnesses also mock both storage reads so the
   shared fail-closed lookup is exercised without accidental IndexedDB fallthrough.
4. **COMPLETE — authorized optional pay-class seam and snake freeze adapter.**
   The sole engine-signature change is the optional field at
   `src/engines/draftFreeze.ts:28-33`, passed at `:97-101`, and consumed with the old auction
   classifier as the unchanged fallback at `src/engines/draftMorale.ts:80-92`. The snake-only
   adapter is `src/utils/draftFreezeInputs.ts:61-105`: completed-pick order, RegisteredPool IV
   settlement, deterministic IV rank, `max(3, round(.05 * totalPicks))`, exact reach/within/
   fall boundaries, and no shill exclusion. The auction builder never owns or sets
   `payClassOverride`.

   The mandatory pre-change auction tripwire is pinned at
   `src/engines/__tests__/draftFreeze.test.ts:197-292` and asserts the complete freeze object
   deep-equal. Its hand derivation was: three won players become early/middle/late; scout
   ranges classify above/within/below for pay bases +10/0/-10; undefined personality follows
   the existing RELAXED matrix multipliers (positive ×0.85, negative ×0.75); payroll ranks
   1/.5/0 produce fan morale 20/50/35. It was green against the unmodified engine before the
   optional seam (**12/12** across freeze engine + adapter), and is green after it. Adapter
   coverage also asserts auction inputs have no own override property.
5. **COMPLETE — Run-It-Back.** Snake storage is read with the reset arc and deleted at
   `src/utils/leagueBuilderAuctionPipeline.ts:491-511`; the persistent integration test proves
   the row is gone.
6. **COMPLETE — snake farm carryover.** Per-team cap headroom is derived from completed-pick
   settlement/IV at `src/utils/mlbDraftCompletion.ts:53-86`, selected only for the snake path
   at `src/src_figma/app/hooks/useFarmAuctionDraft.ts:222-241`, and fed to the unchanged
   `computeMlbToFarmCarryover`. The auction branch still reads its persisted team
   `budgetRemaining`. The live hook repro is at
   `src/src_figma/app/hooks/__tests__/useFarmAuctionDraft.test.ts:411-478`.
7. **COMPLETE — canonical roster shape.** The page-local roster factory is deleted;
   `src/src_figma/app/pages/LeagueBuilderSnakeDraft.tsx:160` now uses
   `createEmptyTeamRoster`. No routing or other page UI was changed.
8. **COMPLETE — verify-read, no change required.** `deepCopyLeagueToFranchise` begins at
   `src/utils/franchisePlayerStorage.ts:538`. It loads the league/all players/all teams/scouts
   at `:543-553`, reads each generic TeamRoster with `getTeamRoster` at `:563-566`, merges the
   generic roster at `:567-573`, applies those roster assignments to the copied players at
   `:575-595`, and validates that same handoff at `:598-625`. There is no auction-session read,
   auction result dependency, or auction-specific roster branch.

### Exit gauntlet and auction parity

The permanent six-case test is
`src/utils/tests/draftPipeline.integration.test.ts:1344-1545`. Each deterministic case runs
four teams through 22 snake rounds (88 picks) with need-aware positional selection, commits,
adds the required farm/scout handoff, and initializes a franchise. Every case asserts legal
22/10 counts, source `salary = settledSalary = IV`, franchise `settledSalary = IV`, per-team
cap-headroom carryover, 88 player plus four team-fan morale baselines, and 88 draft-baseline
TrueValue rows with `contractValue = trueValue = IV`. For 88 picks the threshold is four:
pick 1 taking IV-rank 5 asserts the exact reach boundary (`above`, +10), and pick 5 taking
IV-rank 1 asserts the exact fall boundary (`below`, -10). Isolated result: **1 passed** (all
six cases) in 4.28s; complete pipeline file: **16/16 passed** in 14.47s.

Auction parity is covered in the same integration file by the existing deterministic full
MLB-auction → farm-auction → franchise pipeline, which ran twice and deep-equaled both end
states before the snake gauntlet assertions. The mandatory full-output freeze tripwire above
separately pins auction morale, payroll, fan morale, ordering, and pay classification. The
auction adapter continues to omit the override property.

### Gates

- `npx tsc -b --pretty false`: **exit 0**, including a final run after split-test harness
  integration.
- `npm run build`: **exit 0**; Vite built 2,648 modules in 11.59s. Only the repository's
  existing Browserslist, mixed dynamic/static import, and chunk-size warnings were emitted.
- Engine/storage/freeze/farm/initializer focused batch: **8 files, 60/60 passed**.
- Full draft-pipeline integration file: **1 file, 16/16 passed**.
- Franchise Setup variants plus duplicate-league guard: **4 files, 55/55 passed** (existing
  React `act(...)` warnings only).
- Draft Setup six-file split gate after adding the required snake-read mocks: **106/107
  passed** in the combined contention run; the contract-characterized two-way-toggle test was
  the lone timeout and passed immediately solo (**1/1**, 0.994s). An earlier combined attempt
  exposed and led to fixing the missing snake-read mocks rather than weakening the fail-closed
  product guard.
- Required single full `NODE_ENV= npx vitest run --reporter=dot`: **617 files passed, 1 file
  failed, 7 files skipped; 9,516 tests passed, 2 failed, 11 skipped** in 245.63s. Both failures
  were full-suite-contention timeouts in pre-existing Draft Setup numeric-pool tests
  (`quality-center changes preserve user-added hard keeps and manual exclusions` and
  `switching from balanced to grounded can shrink engine-generated slack`); no D1 test was
  red. Those two tests had already passed in the focused split run and passed together on the
  immediate prescribed solo rerun (**2/2**, 6.60s). Per the contract's one-full-run rule, the
  full suite was not rerun a second time.

**STOP items:** none after the captain authorized the exact optional seam. No new product
failure reproduced in focused or solo verification. The two full-suite timeouts and their
green solo characterization are recorded above for the auditor rather than hidden.
