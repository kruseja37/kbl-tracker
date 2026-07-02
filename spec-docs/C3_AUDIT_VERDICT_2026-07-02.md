# C3 AUDIT VERDICT — 2026-07-02

**Diff:** uncommitted FABLE-C3 (pool sizing + completion-guarantee cascade + FS-3), branch `experiment/manager-wpa-window`, trunk HEAD `56004cdd`.
**Auditor:** Opus 4.8 (Captain; builder≠auditor — Fable built it). **Method:** cross-model Codex pass (attempted) + an independent Opus 7-finder multi-lens Workflow (each candidate finding re-verified by 3 independent refuters, majority-refute kills) + Opus own full read of the diff + the gate.

## VERDICT: **BLOCK** — 1 CRITICAL + 3 MAJOR (+1 MINOR). Fixes route back to Fable.

The gate is GREEN (build, targeted battery, sweep, C2A/C2B calibration, full suite = zero new reds) — but the automated gate cannot catch these: the sweep runs the CPU-vs-CPU path with the opt-in need-aware politeness the **live** hook does not pass, and no test exercises the live-MLB exhaustion-with-rival-depletion → backfill scenario. The adversarial pass found what the gate could not.

**The chartered work is directionally right.** Pool sizing reproduces the C1B evidence exactly; the end-checkpoint, shill cap, and — importantly — the **pool-aware strand law** (the #1 flagged risk) are correct. The defects are all in the *completion-guarantee cascade's economics and force-fill affordability*, plus one UI gate threshold.

---

## PROCESS NOTE — Codex cross-model pass produced nothing
Codex was dispatched read-only, watchdog-bounded. It hung on the model API for the full 30 minutes and emitted zero analysis (output stuck at the echoed prompt); the watchdog killed it (rc=137). The cross-model lens yielded nothing usable this round. The Opus multi-lens Workflow (the pass that caught C2B's F1 that the single Codex pass also missed) is the adversarial signal of record. This is logged, not hidden.

---

## CONFIRMED DEFECTS (each survived 3 independent refuters; each crux re-verified by Opus)

### F1 — CRITICAL — the exhaustion cleanup backfill's affordability-by-construction is FALSE in live MLB
`src/engines/auctionStateMachine.ts:647` (`backfillFromPassedLots`) + the sub-minSalary opening-ask fact.

**The claim the ratified design rests on (design §5b item 6):** "the completion ceiling guarantees every team retains ≥ minimum-salary money per open slot, so the backfill (priced at `team.minSalary`) is affordable by construction whenever a positional completion exists."

**Why it is false — independently verified from the constants:**
- `LEAGUE_MINIMUM_SALARY = 1666.49` (`rosterEngineConstants.ts:316`).
- `reservePriceCurve` returns only **0.5–0.7 × IV** (`RESERVE_PRICE_CURVE_MIN=0.5`, `MAX=0.7`, `rosterEngineConstants.ts:322-331`).
- `lotOpeningAsk` = `reservePriceCurve(pctile) × iv` **unless `flatReserveFloor` is set** (`auctionStateMachine.ts:265-269`). The **live MLB hook does NOT set `flatReserveFloor`** (`useAuctionDraft.ts`); only the **farm** hook does (`useFarmAuctionDraft.ts:472`).
- ⇒ any MLB player with IV below ~2,380–3,333 has an **opening ask BELOW minSalary**.

The enriched `sessionBidCeiling` reserves the completion cost at those **opening asks** (`completionBidCeiling` = `budget − cheapestLegalCompletion.cost`, priced at asks) and is **not** min'd against the minSalary scalar on the feasible path. So a completing team can spend down to `budgetRemaining < openSlots × minSalary`. Worse, the reserve is computed against the **available** pool, but the backfill buys from the **passed** pool — so even the ask-vs-minSalary framing understates it: the reserved money is for *different players* than the backfill purchases.

**Failing case (live 8-team MLB):** Team T is 21/22, 1 open slot, the only cheap available completer P_cheap has IV≈1666 → opening ask ≈ 833 < minSalary. `sessionBidCeiling(T)` = `B − 833`; T bids to it and wins another lot → `budgetRemaining = 833`, still 1 slot open. A rival then buys P_cheap on a normal contested lot (the load-bearing/no-bid guards never run on a contested sale). Pool exhausts with T 1 short. `backfillFromPassedLots` prices every passed player at `minSalary = 1666.49`; `833 < 1666.49` → the affordability check skips T. T ends 21/22 → `deepCopyLeagueToFranchise` → `validateV1RosterHandoff` throws — **the exact launch break the backfill exists to prevent.**

**Scope:** MLB-only. Farm is immune (floors asks at minSalary AND has no position info → backfill no-ops). The sweep's "zero shortfalls" cannot catch it — it runs the CPU path with need-aware politeness ON, which the live hook does not use.

**Fix direction (Fable's call, prove it):** restore the invariant the minSalary-priced backfill relies on — floor the completion-based reserve at `minSalary` per remaining slot (so every acquisition leaves `budgetRemaining ≥ openSlots × minSalary`, matching the scalar and the backfill), OR price the backfill at each passed player's true opening ask with a proof of affordability. The former is the clean, invariant-restoring fix.

### F2 — MAJOR — `loadBearingTeam` Criterion 1 force-fills without an affordability check
`src/engines/auctionStateMachine.ts:916-931` (Criterion 1) vs `:948` (Criterion 2). Found independently by two finders (joint-class + need-aware).

Criterion 2 guards its recipient with `(sessionBidCeiling(session, team.teamId) ?? 0) < requireLot(session).openingAsk) continue`. **Criterion 1 has no equivalent guard** — it returns a team purely on positional load-bearingness. `resolveNoBidLot` (`:975`) then force-sells at `lot.openingAsk` after only a **budget-blind** `!bidWouldStrand` re-check, and `finalizeSoldLot` has no budget floor.

**Failing case:** real-1 has budget 20000, 2 open slots, missing a primary SS; the current no-bid lot is the only remaining SS, high-IV, openingAsk 25000. Criterion 1 returns real-1 (`withoutCandidate === null`, no other SS). Force-sold at 25000 → `budgetRemaining = −5000` (over-budget tier-cap violation committed into the franchise), or in the 1-slot variant the team overspends its completion. Criterion 2 would have rejected this exact recipient.

**Fix:** apply the same `sessionBidCeiling ≥ openingAsk` guard to Criterion 1's return.

### F3 — MAJOR (partly pre-existing; C3 widens it) — a live CPU strand-rejection HALTS the draft
`src/src_figma/app/hooks/useAuctionDraft.ts:105` (`transitionOrThrow`).

`transitionOrThrow` throws on ANY rejected transition. The live page auto-advances CPU teams — including `controlledCpuTeamIds` (real CPU teams), not just shills — through `cpuBidOnLot → bid → recordBid`. If `recordBid` rejects with `bid-strands-roster`, `transitionOrThrow` throws, `runAction` surfaces the error, the session is unchanged, and the **same** CPU bidder is stuck (deterministic seed → identical throw on retry). The draft cannot auto-progress. The sweep harness masks this with `recordBidOrPassIfStranded` (`auctionTuningHarness.ts:519-527`); the **live hook has no such fallback**. `bidWouldStrand` predates C3, but C3's pool-aware branch widens the set of bids that get rejected, so the latent halt is now more reachable.

**Fix:** make the live CPU auto-advance fall back to a pass on `bid-strands-roster` (mirror the harness's `recordBidOrPassIfStranded` / `claimOrPassIfStranded`).

### F4 — MAJOR (bounded) — Start-Draft sufficiency hard floor green-lights a proven-stranding pool
`src/utils/leagueBuilderPoolBuilder.ts:296` (`evaluatePoolDemandSufficiency`).

The hard floor is `baseSlots + expectedShillWins` = 176 + 20 = **196** at T=8/S=2. But the same model computes `feasibilityFloor = 202` and `targetSize = 264`, and the design's own sweep (`FABLE_C3_DESIGN §5b`) records **"Bare floor (196 at S=2): 20/20 shortfall — the identity-headroom target is load-bearing."** So the DraftSetup screen renders a green check + "surplus +0" + enables Start-Draft for a pool the sweep proves strands every real team. The function's doc comment ("a pool any smaller can strand a real roster") is false — the whole 196–283 range strands at S=2. **Bounded:** the next screen (`DraftSetupHubPreview.tsx:212`) re-gates at `(teams+shills)×22 = 220`, so it's a misleading OK + a confusing dead-end downstream, not a direct launch throw.

**Fix:** set the green-light hard floor to at least `feasibilityFloor` (202), ideally surface `targetSize` (264) as the recommended threshold; reconcile with the downstream 220 gate. (Product-threshold nuance — flag to JK.)

### F5 — MINOR — stale comment
`src/engines/auctionStateMachine.ts:597` — `backfillFromPassedLots`'s header says "at opening-ask prices"; the code prices at `team.minSalary` (the inline comment at the fill site is correct). Fix the header when touching F1.

---

## ATTACKED AND HOLDS (verified correct — do NOT touch in the fix round)
- **Pool-aware strand law spurious-INFEASIBLE (the #1 flagged risk): CLEARED.** A finder bundled the real `cheapestLegalCompletion`/`isLegalRoster` and fuzzed **>11M** roster+pool shapes (random, catcher-scarcity-biased, alphabet-concentrated, openSlots 1–4) against a brute-force `isLegalRoster` subset oracle — **zero** cases where a legal 22 exists but the code returns infeasible. The two-attempt (biased + forced-coverer) heuristic + the C2B-F1 arm coverage-substitution is sound over the reachable space. (Independently corroborated: `isLegalRoster` requires an exact primary at each field spot, matching `missingPrimaries`, so no secondary-vs-primary cross-position miss exists; the `roster.length+openSlots===22` guard holds at every live call site; `bidWouldStrand` checks only positional feasibility, never affordability, so it can't block an expensive-but-legal bid.)
- **Joint-class double-count: NOT real.** `pitcherNeed`+`pitcherFloorNeed` and `missingPrimaries.length`+`hitterFloorNeed` are disjoint-additive by construction (`minPitchers` = `startingPitchers`+`minRelievers` = 8; floor terms count only bodies beyond the class fills). Verified by Opus reading `rosterNeed.ts`.
- **End-checkpoint additivity + termination:** byte-identical old semantics without `nonCompletingTeamIds`; auction never waits on shill slots; born-complete never wrongly fires; the full-budget shill ceiling can never apply to a real team (exact teamId match on synthetic ids).
- **Shill win cap:** `team.roster.length` is an exact win count (shills only grow via `finalizeSoldLot`; excluded from every force-fill path); additive-optional; `SIZING_TUNING.winsPerShill` is the ONE shared constant for the cap and the sizing budget (JK rider satisfied by construction).
- **Need-aware CPU bidding is sweep-only:** the live hooks pass no options → `needOverrideApplies` returns false; `mustBuy` can never bypass the over-budget gate; the politeness rule is CPU-only and exempts the buyer's own tight-class needs.
- **Sizing math:** `feasibilityFloor` = ⌈8×8×1.2⌉+⌈8×13×1.2⌉ = 77+125 = 202 (reproduces C1B); `targetSize` = max(⌈176×1.5⌉,202)+10S = 264+10S; no double-count. Advisory probabilities are never a hard gate (grep-confirmed the only consumer is the read-only panel).
- **Draft Setup panel:** async effect has correct cancelled-guard/cleanup; purely additive; never blocks Start-Draft. `toFeasibilitySimPlayer` mapping correct. Copy-lock respected (only the displayed slot NUMBER changes via F4's floor swap).
- **Harness additivity:** every new param defaults to today's 8/2/false/uncapped → C2A/C2B default cases byte-identical (calibration re-passed, byte-stable).
- **Sweep honesty:** leg-1 (`shortfallRuns===0`) is a real assertion; leg-2 (bare floor) is report-only by design; no real shortfall silently passed.
- **FS-3 regression:** a genuine (non-tautological) pin of `validateV1RosterHandoff` against a post-shill state; commit-exclusion + termination covered separately.
- **`playerFillsHardRequirement` relocation:** byte-identical to the deleted private `fillsHardRequirement`; own_need unchanged.
- **Farm auction NOT regressed:** the pool-aware strand clause short-circuits on missing `.pos`; farm players carry no `.pos` → the 22-vs-10 mismatch never fires.

---

## GATE (independently re-run by Opus — GREEN, but cannot catch F1–F4)
- `NODE_ENV= npm run build` → exit 0.
- Targeted battery (14 files) → 132 passed.
- Pool-sizing sweep (20 runs) → 3/3; **0 shortfalls S=0..4**; empirical wins/shill = 10 (cap holds); real-spend inflation 0 / +0.95 / −3.68 / −3.08 / −3.83% (the honest ±4% finding reproduced).
- C2A baseline sim (50 runs) → 1/1 byte-stable. C2B calibration (50 runs) → 1/1 byte-stable.
- Full suite → **2 failed / 8682 passed** = exactly the characterized set (`wpaRuntimeBoundary` hard-fail + `franchiseManualSmokeFixture` flake, solo-passes 4/4; `archetypeBalanceSimulator` passed this run). **Zero new reds** — 8682 matches Fable's count exactly.
- **L-SIM: ORTHOGONAL, documented not run.** Import-graph proof: the L-SIM harness imports zero auction modules (fixture rosters); `seasonRunner` touches no freeze/auction path; `franchiseInitializer` imports only `deriveShillTeamIds` (unchanged `cpuTeamRoles`) + a type-only `CpuShillAuctionSession`; `rosterNeed` diff is additive-only (24+/0−). The one seam C3 could reach (auction→freeze) is covered more directly by the full suite's `draftPipeline.integration.test` + the new FS-3 regression. Running a fragile baseline regeneration for a diff L-SIM cannot observe would only risk corrupting the canonical baselines (the cadence trap). Matches the C2B precedent.

## ROUTING
Fixes route to Fable (builder≠auditor) via **FABLE-C3-FIX** in `PROMPT_CONTRACTS.md` (F1 must-fix + F2/F3/F4/F5). Opus re-audits the delta (round 2), re-runs the gate, then commits branch-only after JK's go. The three ratified design DECISIONS stand — F1 is an implementation/pricing bug in the ratified backfill, not a reversal of the ratified intent; JK should know the backfill's stated affordability *proof* was invalid and is being repaired.

---

# ROUND 2 — delta re-pass of the FABLE-C3-FIX (2026-07-02)

**Method:** Opus own read + a focused 4-finder adversarial delta Workflow (3 refuters each) + a Codex cross-model delta re-pass (this time it completed, rc=0). **Gate re-run GREEN.**

## VERDICT: **BLOCK (soft)** — the CRITICAL + 3 MAJOR are correctly fixed; F4 was left INCOMPLETE (1 MAJOR) + 2 MINOR. One small follow-up round (F6/F7/F8) then commit.

### F1–F5: ALL CONFIRMED CORRECT (triangulated: Opus read + Codex CLEAN + Workflow attackedAndHolds)
- **F1** — the minSalary reserve floor holds. Verified inductively across ALL four `finalizeSoldLot` sale paths (recordBid `:466`, claimLoneSurvivor `:540`, loadBearing force-sale via F2/Criterion-2 guards, forced-filler `:1034`) + the backfill: every sale price ≤ `sessionBidCeiling ≤ minReserveCeiling`, so `budgetRemaining ≥ openSlots×minSalary` after any acquisition. No openSlots off-by-one (openSlots = slots AFTER the win; backfill buys exactly that many at minSalary). The PASSED-vs-AVAILABLE crux is CLOSED because the backfill reprices every cleanup pick flat at `minSalary`, so `cost = numPicks×minSalary ≤` the reserved amount regardless of which players it buys. Cannot wrongly block (last slot → openSlots 0 → no cap) and cannot re-loosen (it's a `Math.min`).
- **F2** — Criterion 1 now carries the identical `sessionBidCeiling ≥ openingAsk` guard as Criterion 2; no remaining below-ceiling force-sale route.
- **F3** — converts ONLY `bid-strands-roster`, ONLY for a CPU actor, on both bid and claim; humans + all other reasons still throw; farm is a safe no-op (no `.pos`).
- **F4 (partial — see F6)** — the sizing floor is correct (222 at 8/2) and two of three screens are reconciled.
- **F5** — comment corrected.

### NEW findings from the delta pass (all Opus-verified)
- **F6 — MAJOR — F4 reconciliation is INCOMPLETE.** `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx:866` (the live auction-start gate feeding `setupPoolReady`→`beginAuction` + the blocker message) is the **sole remaining live caller of the OLD `evaluatePoolSufficiency`** (`(teams+shills)×22`), while the two Draft Setup screens now use `evaluatePoolDemandSufficiency`. The gates disagree: at **S≥3** the auction page over-demands (242 vs the setup screens' 232), so a pool green-lit at setup is BLOCKED at the auction page with "needs N more" — the exact green-upstream/dead-end-downstream inconsistency F4 was chartered to remove, left on the third gate. (At S≤2 the setup floor ≥ the auction floor, so it is a cosmetic-only disagreement, not a functional dead-end.) Bounded: 220/235 > feasibilityFloor 202 so class feasibility still holds and F1's backfill prevents an outright launch throw — the impact is a confusing blocked-valid-draft at high shill counts (user-adjustable, off the default S=2). **FIX: migrate `:866` to `evaluatePoolDemandSufficiency(pool, leagueTeams.length, setupShillCount)` — the same call the setup screens use — so all three gates agree.**
- **F7 — MINOR — the F2 regression test does not exercise the F2 guard.** `auctionCompletionFloor.test.ts:327` ("F1/F2") reaches Lot 2 with `availablePlayerIds` empty, so `remainingPool(0) < totalOpenSlots(1)` → the `if (remainingPool >= totalOpenSlots)` branch is false → `loadBearingTeam` (which carries the F2 Criterion-1 guard at `:947`) is never called; the pre-existing `selectForcedFillerTeam` guard (`:1034`, audit R2-2) is what refuses the force-fill. The F2 branch is correct (byte-identical to Criterion 2) but UNTESTED, and the comment at `:354` misattributes which guard fires. **FIX: add a case with `remainingPool ≥ totalOpenSlots` AND an unaffordable load-bearing team (so `loadBearingTeam` Criterion 1 is the guard that refuses), and correct the comment.**
- **F8 — MINOR — dead import.** `src/engines/auctionMarketModel.ts:25` `import { canCover }` is unused after the `fillsHardRequirement`→`playerFillsHardRequirement` relocation (build passes only because `noUnusedLocals:false`). **FIX: remove the import.**

### GATE (round 2, Opus re-run — GREEN)
build exit 0 · targeted **147/147** (incl. the new F1/F3/F4 tests) · sweep **0-shortfall S=0..4** (floor-stress 20/20 report-only) · C2A 1/1 + C2B calibration 1/1 byte-stable · full suite **2 failed / 8692 passed** = the characterized pair (`wpaRuntimeBoundary` + `franchiseManualSmokeFixture`, solo-passes 4/4) → zero new reds · L-SIM orthogonality reconfirmed (zero season-path files changed; `rosterNeed` still additive-only) · Codex delta re-pass **CLEAN** on F1–F5.

### ROUTING
F6 (must, completes F4) + F7/F8 (minor) → `FABLE-C3-FIX-2` in `PROMPT_CONTRACTS.md`. Held for JK to hand to Fable (per JK 2026-07-02 — not auto-dispatched). Nothing committed. After the small round: Opus re-runs the gate, then commits branch-only on JK's go.
