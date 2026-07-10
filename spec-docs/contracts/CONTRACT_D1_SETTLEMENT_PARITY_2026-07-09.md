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
