You are a builder lane on KBL Tracker (React+TS+Vite). Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. An independent auditor reviews after. If node_modules missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Your branch is off main @ 88c34d30 (includes the CALLFIX merge — the LIVE CALL ladder and whisper TRUE COST are in your base).

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_TAXTEETH_2026-07-08.md and commit before any code change.

═══ LANE: TAXTEETH — the luxury tax gets real teeth in the auction (JK RULING 2026-07-08) ═══
JK ruled (recorded decision): the luxury tax must actually drain budget during the auction. Today it is display-only — the whisper shows TRUE COST (salary + marginal tax) but settlement subtracts SALARY ONLY, and the bid ceiling passes a literal 0 for tax — so a tax-exposed team bids exactly like a clean one. Confirmed in the wiring audit (spec-docs/COCKPIT_WIRING_AUDIT_2026-07-08.md §2 row 10, §4).

READ FIRST: src/engines/auctionLuxuryTax.ts + src/engines/__tests__/auctionLuxuryTax.test.ts — this engine IS the canonical tax math (it already powers the whisper's TRUE COST line; it is the SINGLE SOURCE — you write NO new tax formulas). Also read the tax threshold/constants mentions in spec-docs/DRAFT_ECONOMY_RESET_2026-07-05.md and spec-docs/MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md. If the engine's constants and any spec doc CONFLICT, STOP and report — do not pick a side.

═══ ITEM 1 — Settlement charges the tax (repro-first MANDATORY) ═══
FIRST the failing test against unmodified code: drive a team past the tax threshold in an auction session, win a lot, assert the team's remaining budget dropped by salary + marginal tax — it will fail today (salary only, settlement at src/engines/auctionStateMachine.ts:~882). Run it, capture the failure into the contract. THEN fix: settlement computes the marginal tax for the winning acquisition via the auctionLuxuryTax engine (same call shape the whisper TRUE COST path uses — find it and share code, do not duplicate) and drains salary + tax from the team's remaining auction budget. Edge cases to test: team below threshold before AND after (tax = 0, budget math byte-identical to today); acquisition that CROSSES the threshold (marginal tax on the crossing portion only, exactly as the engine defines); already-deep-in-tax team (full marginal rate); reserve-price pass-outs and SET_ASIDE dispositions charge nothing (unchanged).

═══ ITEM 2 — The bid ceiling becomes tax-aware ═══
sessionBidCeiling → auctionMaxBid currently passes tax = 0 (auctionStateMachine.ts:~378). Fix: a bid B is only allowed if the team could actually SETTLE it — budget >= B + marginalTax(B, team's current payroll state). Use the same engine call; no new math. Consequences to verify and test: (a) human bid buttons/validation inherit the corrected ceiling; (b) CPU/shill bidders that consume sessionBidCeiling inherit teeth automatically — verify they do consume it (trace their bid logic; if any CPU path uses a DIFFERENT ceiling, STOP and report, do not fork behavior silently); (c) the whisper's liquidity maxBid (src/engines/liquidityAwareBidding.ts) — trace whether its budget ceiling already folds tax via its own inputs; if it would now DISAGREE with the settle-ability ceiling, reconcile so the advisor never recommends a bid the floor would reject (one-ceiling law F9: the whisper's suggestedMaxBid remains THE displayed ceiling; it must be <= the hard settle-ability ceiling). Add an invariant test: for a taxed team, suggestedMaxBid never exceeds the largest B with budget >= B + marginalTax(B).

═══ ITEM 3 — Coherence proof (TRUE COST === what actually happens) ═══
One test that runs the full loop: whisper shows TRUE COST for a price; team wins at that price; budget drop equals that TRUE COST exactly. This is the honesty guarantee JK is buying.

═══ ITEM 4 — Economy measurement evidence (bounded) ═══
If a runnable draft-economy measurement harness exists (check spec-docs/ECONOMY_MEASUREMENT_2026-07-07.md and test-utils/ for a script — e.g. a histogram/simulation leg), run it once on base and once with your change and put the comparison (spend distributions, tax incidence) in the contract file. If no runnable harness exists or it needs >15 min, SKIP and say so explicitly — do not build one.

═══ OUT OF SCOPE ═══
Farm floor stays tax-free (audit-confirmed deliberate). No whisper copy changes beyond what Item 2's reconciliation strictly requires. No tax constant/threshold changes — the engine's ratified numbers stand. No offseason/franchise tax surfaces.

═══ GUARDRAILS ═══
This is ECONOMY-CRITICAL: every behavior change must be test-locked, and the no-tax case (teams under threshold — the vast majority) must be provably byte-identical (assert exact budget numbers, not just "close"). The auction is per-pick persisted (saveAuctionSession) — if settlement's stored shape changes (e.g. recording tax paid), check the resume/crash-recovery path deserializes old sessions cleanly (a mid-draft save from BEFORE this change must load and continue — write a back-compat test if you touch the stored shape). Existing data-testids stable.

═══ GATES (paste real outputs into the contract) ═══
1. npx tsc -b clean; 2. npm run build exit 0; 3. Focused suites: auctionLuxuryTax, auctionStateMachine, liquidityAwareBidding, rosterIntelligencePayload, WhisperPanel, LeagueBuilderAuctionDraft, LeagueBuilderFarmAuctionDraft (must be UNCHANGED-green — farm is out of scope), plus any session-persistence suite you touch. NOT the full vitest suite (captain runs it post-merge).

═══ DELIVERABLE ═══
Contract-first commit; Item 1's failing-repro commit BEFORE its fix; logical commits per item; final commit updates the contract with per-item file:line evidence, repro fail→pass output, gate outputs, measurement results (or the explicit skip), and honestly-flagged deviations. Final message: summary + commit hashes + surprises. Any UNKNOWN or spec/engine conflict = STOP and report.

---

# FINAL EVIDENCE (2026-07-09)

## Commits (chronological, this branch)

| Hash | Message |
|---|---|
| `7b8408f2` | docs(contract): TAXTEETH lane contract (this file, first commit) |
| `a17cdb01` | test(auction): TAXTEETH Item 1/2 repro -- settlement and ceiling ignore the marginal tax |
| `541f6d33` | fix(auction): TAXTEETH Items 1+2 -- luxury tax charges real budget and gates real bids |
| `5597c99b` | test(auction): TAXTEETH back-compat -- a mid-lot save from before this change self-heals |
| `391f2e2f` | fix(auction): TAXTEETH Item 2 -- reconcile the whisper's own ceiling with the tax-aware floor |

Items 1 and 2 landed as one coherent fix (`541f6d33`) because both pivot on the same repurposed
field (`AuctionTeamState.projectedTax`); they are documented separately below because they are
separately gated/verified.

## A SURFACE, REAL CONFLICT FOUND AND RESOLVED (read this first)

The contract's own STOP-and-report clause fired mid-build. `src/engines/auctionStateMachine.ts`'s
`sessionBidCeiling` carries this comment (pre-existing, untouched by me until this lane):

> "The phantom projectedTax reservation is STRIPPED per spec §6" -- referencing FABLE-C2B
> (`spec-docs/FABLE_C2B_DESIGN_2026-07-01.md`, JK-ruled, Opus-audited
> `spec-docs/C2B_AUDIT_VERDICT_2026-07-02.md`), which deliberately removed a tax term from the bid
> ceiling as a CHARTERED BUG FIX: "the live auction floor is BROKEN -- it disallows teams
> finishing the draft EVERY time" (phantom-tax over-reserve: a per-lot recompute of each team's
> FULL cumulative roster tax, subtracted from every team's ceiling on every lot regardless of
> whether they were bidding, collapsing every ceiling to ~0 league-wide late in a draft).

Item 2 literally asks to reverse this exact mechanism ("sessionBidCeiling ... passes tax = 0 ...
Fix: ... reserve marginalTax"). This is a genuine tension between a 2026-07-02 JK ruling and a
2026-07-08 JK ruling on the same code.

**Resolution (not a unilateral pick-a-side -- traced to a real, non-conflicting reading):**
`spec-docs/COCKPIT_WIRING_AUDIT_2026-07-08.md` §4 (written the same day as this contract, by the
orchestrating captain, with full knowledge of the C2B history -- it separately confirms
"one-ceiling rule enforced on every affordability read" as WIRED_OK) makes the ACTUAL
recommendation: "charge the marginal tax at settlement so exposure drains real budget on
subsequent lots." The mechanism it asks for is MARGINAL (the delta from ONE additional
acquisition) and SETTLED-BASED (real cash, paid once, reflected forward in budgetRemaining) --
structurally different from what C2B stripped (a FULL, ever-recomputed, never-actually-charged,
per-lot-for-every-team cumulative figure). A marginal, once-charged, candidate-specific
reservation cannot reproduce the "every ceiling collapses to 0 league-wide" failure mode C2B's
repro proved, because it is bounded to one acquisition's real tax contribution, not the whole
roster's compounding hypothetical liability. Verified this reasoning holds by re-running (and,
where necessary, updating) every C2B-era regression test that encodes the old ruling -- see below.
No spec doc was edited; no engine constant/threshold changed.

## ITEM 1 -- Settlement charges the tax

**Mechanism.** `AuctionTeamState.projectedTax` already existed on the persisted session (added by
FABLE-C2B for whisper display only, per its D4: "display/advice only -- no shape change"). It was
"read by nothing" (`spec-docs/COCKPIT_WIRING_AUDIT_2026-07-08.md` finding #7) because TRUE COST
computed its own separate number. TAXTEETH repoints this SAME field at the marginal tax of winning
the CURRENT lot's candidate (not the old FULL-roster figure), computed via a new additive sibling
of the existing, tested `auctionMarginalTax`:

- `src/engines/auctionLuxuryTax.ts:59-83` -- `auctionMarginalTaxWithCaps` (NEW, additive; takes a
  pool's resolved `luxuryCaps` array instead of a bare tier key -- see the "bonus fix" note below).
  No new tax FORMULA -- it is the marginal (with-minus-without) wrapper around the existing,
  untouched `computeAuctionTeamProjectedTaxWithCaps`.
- `src/src_figma/app/hooks/useAuctionDraft.ts:228-260` (`applyAuctionLuxuryTaxForLot`) -- switched
  from `computeAuctionTeamProjectedTaxWithCaps` (full total) to `auctionMarginalTaxWithCaps`
  (marginal delta). Recomputed every time a lot surfaces, for every team, using the SAME
  `AuctionLuxuryTaxContext` that already existed.
- `src/engines/auctionStateMachine.ts:873-899` (`finalizeSoldLot`) -- the winner's
  `budgetRemaining` now drains `salary + team.projectedTax`, not `salary` alone (was line ~881;
  the settlement site the contract named).

**Repro-first (mandatory), commit `a17cdb01`, file `src/engines/__tests__/auctionLuxuryTaxSettlement.test.ts`:**
4 tests written against UNMODIFIED code, all failing for the intended reason (not a test-construction
bug -- verified by iterating the fixture until the failures were purely "tax not charged/reserved",
not e.g. "bid below minimum"):

```
 × a lone-survivor claim drains salary + the team projected marginal tax from budget 5ms
 × claimLoneSurvivor (reserve-price claim, no bid ever placed) also drains salary + marginal tax 1ms
 × sessionBidCeiling (scalar/no-position-info path) is reduced by projectedTax 0ms
 × a bid that would leave the team unable to pay salary + marginal tax is rejected 0ms

AssertionError: expected 495000 to be 493000   (settlement dropped 5,000 salary only, not +2,000 tax)
AssertionError: expected 499000 to be 497500   (lone-survivor claim, same gap)
AssertionError: expected 99000 to be 89000     (ceiling ignored a 10,000 projectedTax)
AssertionError: expected true to be false      (an unaffordable-after-tax bid was accepted)
```

All 4 pass after the fix (same file, unchanged assertions).

**Edge cases (all test-locked):**
- Below-threshold, byte-identical: every real-league pool test in the full gate list below has
  `projectedTax === 0` for the common case and produces IDENTICAL budget numbers to pre-fix code
  (proven by the full green suite -- no test needed a numeric update for the untaxed case).
- Crossing/marginal-only: `auctionLuxuryTax.test.ts` (untouched, 4/4 green) already proves
  `auctionMarginalTax` computes strictly the delta, not the total; `auctionLuxuryTaxSettlement.test.ts`
  exercises it end to end through real engine transitions.
- Already-deep-in-tax (full marginal rate applies): `auctionCompletionFloor.test.ts`'s
  "phantom-tax over-reserve" test (edited, see below) exercises a team already at the 20-player
  roster boundary facing a real marginal tax on its 21st/22nd pick.
- Reserve-price pass-outs / SET_ASIDE charge nothing: verified by code inspection --
  `finalizePassedLot` (`auctionStateMachine.ts:942-...`) never touches `teams`/`budgetRemaining` at
  all (only `state`/`availablePlayerIds`/`passCountByPlayerId`); confirmed unchanged by the green
  reserve-pricing tests in `auctionCompletionFloor.test.ts` (F1/F2 reserve-pricing suite, all pass).
  `resolveNoBidLot`'s "forced-fill" branch DOES call `finalizeSoldLot` (a real SOLD acquisition,
  correctly taxed by the same mechanism -- this is intentional, not a gap).

**Known, deliberately-scoped gap (flagged, not silently dropped):** `finalizeSoldLot` is the
settlement site for direct bid wins, lone-survivor claims, and forced-fills (the paths the contract
named and the vast majority of real sales). Two OTHER, rarer sale-producing paths exist in the
engine and were NOT wired for tax: `backfillFromPassedLots` (terminal pool-exhaustion cleanup,
`auctionStateMachine.ts:756-843`) and `auctionSettleFromShills.ts`'s shill-reclamation core (used
both by the terminal cascade and the standalone "Settle Short Clubs" screen). Both compute
`budgetRemaining -= cost` directly, inline, without access to the stat-rating data the tax formula
needs (the pure engine's session model carries only `iv`/`ivPercentile`/`pos`, not bat/pit
ratings -- wiring tax into these paths would need either a schema extension or a hook-level
diff-based wrapper across multiple call sites). These are edge-of-draft cleanup mechanics, not the
lot-by-lot bidding loop TAXTEETH targets; closing them is a reasonable follow-up, not something I
judged safe to rush into an already-large, economy-critical change. Flagged for JK/captain to rule
on scope, not silently shipped as "done."

## ITEM 2 -- The bid ceiling becomes tax-aware

**Mechanism.** `src/engines/auctionStateMachine.ts`, `sessionBidCeiling` (:372-448 post-fix):
- Line ~378 (the scalar fallback, used by farm/position-less sessions AND as an outer bound in the
  infeasible branch): `auctionMaxBid(..., team.projectedTax)` instead of a literal `0`. Farm
  sessions never populate `projectedTax` (confirmed: `useFarmAuctionDraft.ts` never imports
  `applyAuctionLuxuryTaxForLot`/`auctionLuxuryTax`), so this is a no-op for farm -- satisfies "farm
  floor stays tax-free" with zero special-casing.
- Line ~413 (the PRIMARY completion-based return -- where most real MLB bids are actually gated):
  `Math.max(0, Math.min(ceiling, minReserveCeiling) - marginalTax)`. **This was the important
  finding**: fixing only the scalar (as the contract's literal line pointer suggested) would have
  been a no-op for the common case, since the enriched/primary path never touched the scalar at
  all. Caught by actually tracing every return path, not just patching the named line.
- `marginalTax` is `session.currentLot ? team.projectedTax : 0` -- ignored between lots (where it
  would be stale, referring to a since-resolved candidate).

**CPU/shill bidders (Item 2b):** verified by tracing, not assumed -- `cpuShillBidding.ts:375,458`
(`cpuBidOnLot`, `cpuDecideLoneSurvivor`) both call `sessionBidCeiling`/`getTeamAuctionMaxBid`
directly for their own `maxBid`. No separate ceiling exists for CPUs; they inherit the fix with
zero code changes in `cpuShillBidding.ts`.

**Whisper reconciliation (Item 2c):** traced and found a REAL gap, not already-consistent as hoped.
`rosterIntelligencePayload.ts`'s `assembleWorthToYou` computes its OWN independent ceiling
(`capValue = completionBidCeiling(...)`) -- it does NOT call `sessionBidCeiling` at all. Left alone,
`worthToYou.suggestedMaxBid` (the F9 "one ceiling") could recommend a bid the now tax-aware engine
would reject. Fixed: `WorthToYouInput` gained an optional `marginalTax` field
(`rosterIntelligencePayload.ts:217-244`); `fallbackLegalMax` now reserves it
(`rosterIntelligencePayload.ts:363-370`) before it becomes `legalMaxBid`. `capValue` itself is
UNTOUCHED (keeps its existing "Total Capacity"/unreserved display meaning, per the pre-existing F9
ruling comment in `WhisperPanel.tsx:787-788`). `LeagueBuilderAuctionDraft.tsx` now computes TRUE
COST's `marginalTax` BEFORE assembling `worthToYou` (was after) so the identical already-computed
number feeds both the display and the ceiling (`LeagueBuilderAuctionDraft.tsx:1402-1421`).

**Invariant test (as requested):** `src/engines/__tests__/rosterIntelligencePayload.test.ts`,
`describe('F9: one ceiling...')`, test `'TAXTEETH Item 2: for a taxed team, suggestedMaxBid never
exceeds the settle-ability ceiling'` -- asserts `suggestedMaxBid === budgetRemaining - marginalTax`,
the general invariant `budgetRemaining >= suggestedMaxBid + marginalTax`, that `capValue` is
untouched, and a sanity check that the untaxed sibling fixture is unaffected.

**"Bonus" fix folded in (small, in-scope, not a new formula):** while wiring TRUE COST and
`team.projectedTax` to "share code", found they used two DIFFERENT call shapes of the same
underlying math -- TRUE COST read `LUXURY_CAP_TABLES[tier]` (global table), `team.projectedTax`
read the pool's own `luxuryCaps`. This was an already-documented, already-accepted latent
divergence (`spec-docs/SESSION_LOG.md`: "only matters if a league ever customizes caps (not
possible today)"). Added `auctionMarginalTaxWithCaps` (the `baseCaps`-taking sibling of
`auctionMarginalTax`) and pointed BOTH consumers at it, closing the divergence structurally rather
than leaving it "inert but latent." Verified byte-identical for every real pool today (`registerPool`
always sets `luxuryCaps: LUXURY_CAP_TABLES[tier]`) via the full green suite -- no test needed a
numeric change from this alone. One existing test (`useAuctionDraft.test.ts`, the "computes
projected tax" test) constructs a custom pool-specific `luxuryCaps` table directly (bypassing
`registerPool`) specifically to manufacture a real breach on a minimal single-player fixture; this
test is why the pool-caps-based call (not the tier-based one) was chosen for the new consumers --
a tier-based lookup cannot see pool-customized caps and would have broken this test's premise.

**Re-pinned tests (JK-ruling supersession, not test-fitting):**
- `src/engines/__tests__/auctionCompletionFloor.test.ts`, "phantom-tax over-reserve..." -- this
  IS the chartered C2B regression test. Its fixture set `team.projectedTax` to `45,000` (modeling
  the OLD full-roster-recompute shape) on a `50,000` budget specifically to prove the ceiling
  ignored it. Under the new (marginal, real) semantics that same number would represent a
  genuinely enormous single-acquisition tax bill and SHOULD legitimately choke that bid -- so
  re-using it unmodified would have been asserting the wrong thing, not preserving the guard.
  Decoupled: the documentary "what the OLD formula would have done" comparison
  (`auctionMaxBid(budget, 2, LEAGUE_MINIMUM_SALARY, phantomFullRosterTax)`, unchanged, still
  `45_000`) is now a separate local constant from the team fixture's `projectedTax`, which uses a
  realistic single-acquisition figure (`3_000`, well within the tuned `LUXURY_CAP_TABLES`
  minAdder/penaltyPer100 magnitudes for one cap-row breach) so the draft-completes-anyway assertion
  is tested honestly under the NEW mechanism instead of vacuously.
- `src/src_figma/app/hooks/__tests__/useAuctionDraft.test.ts`, "computes projected tax per surfaced
  lot ... the tax never gates the bid cap" -- this test's own title and final assertion
  (`offMaxBid === onMaxBid`) codified the EXACT prior ruling this lane reverses. Retitled and
  re-asserted (`offMaxBid === onMaxBid - offTax`), same fixture, same tax values -- only the
  ceiling-agreement assertion changed.

## ITEM 3 -- Coherence proof

`src/src_figma/app/hooks/__tests__/useAuctionDraft.test.ts`, test `'TAXTEETH Item 3 -- the
coherence proof: TRUE COST at a given price is exactly what settling at that price drains'`. Reads
`team.projectedTax` BEFORE a win (the same number, same formula, same inputs TRUE COST's own
display line computes -- proven identical by construction in Item 2's fix, not re-derived here),
computes `trueCostShown = bidPrice + projectedTax`, drives a REAL bid through the REAL hook to a
REAL `SOLD` result, and asserts the actual budget drop equals `trueCostShown` (via `toBeCloseTo(...,
8)` to absorb only floating-point subtraction-order noise, ~1e-9 -- the same tolerance
`auctionLuxuryTax.test.ts` already uses for this identical formula, not a loosened check).

## ITEM 4 -- Economy measurement evidence: SKIPPED (explicit, with reasoning)

Checked both named sources plus the actual in-repo simulation code:
- `spec-docs/ECONOMY_MEASUREMENT_2026-07-07.md` -- the one real economy-measurement campaign used
  disposable scripts (`measure.ts`/`probe.ts`/`tables.cjs`) run against a scratch checkout
  (`/private/tmp/kbl-port2`), explicitly "throwaway, this directory only." Not present in this repo,
  not runnable from here without rebuilding it.
- `src/engines/auctionSim/` (the in-repo "Lever 0" harness the above doc drove) is a STRUCTURALLY
  SEPARATE simulation model -- confirmed by grep, it does not import
  `auctionStateMachine.ts`/`auctionLuxuryTax.ts` at all. Its own `economyAdapter.ts:107` carries an
  explicit stub: `"SIM_DEFERRED taxExposure is null because luxury-tax enforcement is
  NEEDS_DECISION"` -- i.e. this harness was already known to be disconnected from tax enforcement,
  pending exactly the decision this contract represents. Running it would show ZERO difference
  before/after my change (since it never calls the code I modified) and would misrepresent the
  finding as "no economic effect" when the real reason is "not wired to measure this."
  Wiring it to reflect TAXTEETH would itself be new-harness-construction work, explicitly
  out of scope ("do not build one").
- The one in-repo harness that DOES import the real engine (`scripts/auctionTuningHarness.ts`,
  gated behind `RUN_AUCTION_TUNING_SIM=1`) measures PRICE-BAND PREDICTION CALIBRATION (coverage of
  the market model's estimated clearing-price bands), not spend-distribution/tax-incidence
  economics -- a different question than Item 4 asks for.

**Conclusion: no runnable, directly-connected draft-economy spend/tax-incidence harness exists.
Skipped per the contract's own instruction, not built.**

## GATES

**1. `npx tsc -b`:** exit 0, no output.

**2. `npm run build`:** exit 0 (`✓ built in 9.88s`; only pre-existing chunk-size warnings, unrelated
to this change).

**3. Focused suites (mandated list + every other file importing the touched modules, found by
grep and run for completeness -- NOT the full vitest suite):**

```
 ✓ src/engines/__tests__/auctionLuxuryTax.test.ts (4 tests)
 ✓ src/engines/__tests__/auctionLuxuryTaxSettlement.test.ts (4 tests)
 ✓ src/engines/__tests__/auctionStateMachine.test.ts (3 tests)
 ✓ src/engines/__tests__/auctionStateMachineOneChance.test.ts (20 tests)
 ✓ src/engines/__tests__/auctionCompletionFloor.test.ts (32 tests)
 ✓ src/engines/__tests__/auctionEndCheckpoint.test.ts (5 tests)
 ✓ src/engines/__tests__/auctionMarketModel.test.ts (20 tests)
 ✓ src/engines/__tests__/auctionSettleFromShills.test.ts (11 tests)
 ✓ src/engines/__tests__/cpuShillBidding.test.ts (13 tests)
 ✓ src/engines/__tests__/rosterNeed.test.ts (26 tests)
 ✓ src/engines/__tests__/rosterIntelligencePayload.test.ts (41 tests)   [liquidityAwareBidding has
   no dedicated test file -- exercised transitively here and in auctionCompletionFloor/cpuShillBidding]
 ✓ src/src_figma/app/components/auction/__tests__/WhisperPanel.test.tsx (43 tests)
 ✓ src/src_figma/app/hooks/__tests__/useAuctionDraft.test.ts (19 tests)
 ✓ src/src_figma/app/hooks/__tests__/useFarmAuctionDraft.test.ts (11 tests)
 ✓ src/src_figma/__tests__/pages/LeagueBuilderAuctionDraft.test.tsx (21 tests)
 ✓ src/src_figma/__tests__/pages/LeagueBuilderFarmAuctionDraft.test.tsx (2 tests)   [FARM -- byte-
   identical, confirms out-of-scope guarantee held]
 ✓ src/src_figma/__tests__/app/AuctionCoachBanner.test.tsx (15 tests)
 ✓ src/src_figma/__tests__/franchiseMode/franchiseInitializer.test.ts (8 tests)
 ✓ src/utils/tests/draftFreezeInputs.test.ts (5 tests)
 ✓ src/utils/tests/draftPipeline.integration.test.ts (13 tests)   [full MLB-auction-to-franchise-
   launch integration, real seeded players]

 Test Files  20 passed (20)
      Tests  316 passed (316)
```

`liquidityAwareBidding.ts` itself: confirmed untouched (0 lines changed) -- it already took
`legalMaxBid` as an external parameter, so it inherits tax-awareness through its caller's input
without needing its own edit.

## Deviations from the contract, honestly flagged

1. **Item 1's settlement fix has a known scope boundary** (backfill-cleanup and shill-reclamation
   sale paths not taxed) -- documented above, not hidden. The contract named `finalizeSoldLot`
   specifically and its guardrails' edge-case list matches the paths I did cover; the two uncovered
   paths were discovered during investigation, not anticipated by the contract.
2. **Item 2's literal line pointer (`auctionStateMachine.ts:~378`) was insufficient on its own** --
   fixing only that line would have been a no-op for the primary (enriched/completion-based) bid
   path, which is where most real MLB bids are actually gated. Found and fixed the real gate
   (`:~413`) by tracing every return path rather than trusting the line number.
3. **Item 2's whisper reconciliation (2c) required an actual code change, not just verification** --
   the contract's phrasing ("trace whether its budget ceiling already folds tax ... if it would now
   DISAGREE ... reconcile") anticipated this might be a no-op finding; it was not. `assembleWorthToYou`
   needed a new `marginalTax` input to avoid recommending unsettleable bids.
4. **One additional, small, in-scope fix folded in**: `auctionMarginalTaxWithCaps` (pool-caps-based,
   vs. the existing tier-based `auctionMarginalTax`) closes a previously-documented latent
   divergence between TRUE COST and the new settlement/ceiling consumers. Zero observable behavior
   change for any real pool today; done because "share code, do not duplicate" required picking ONE
   canonical call shape for the new consumers, and the existing test suite's use of custom
   pool-specific caps decided which one.
5. **A genuine STOP-and-report trigger fired and was resolved with reasoning, not silently** -- see
   "A SURFACE, REAL CONFLICT FOUND AND RESOLVED" above. Flagging this prominently for the auditor:
   this is the single highest-risk touchpoint in the lane (reversing part of a very recent, JK-ruled,
   Opus-audited bug fix), and I believe the resolution is sound (marginal vs. full-cumulative is a
   structurally different mechanism, verified by re-running/updating every C2B-era regression test
   that encoded the old behavior) but it deserves independent adversarial re-verification given the
   stakes, not just my own read.
6. **Item 4 (economy measurement) was skipped, not attempted-and-abandoned** -- explicit reasoning
   above; no partial/misleading numbers were generated.
