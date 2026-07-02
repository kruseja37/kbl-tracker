# C2B AUDIT VERDICT — FABLE-C2B (auction market model + completion floor + bid-log + archetype shills)

**Date:** 2026-07-02 · **Auditor:** Opus 4.8 (Captain) · **Builder:** Fable 5 · **Branch:** `experiment/manager-wpa-window` (trunk HEAD `96ed3920`)
**Method:** cross-model adversarial pass (Codex 5.5, xhigh, read-only) + independent Opus 8-lens Workflow (each finding re-verified by an independent skeptic) + Opus own full read of the diff + the gate (build / full suite / calibration / smoke-solo).
**Contract:** C2B-AUDIT in `PROMPT_CONTRACTS.md`. Builder≠auditor honored (Opus did not write C2B).

## VERDICT: BLOCK → one targeted fix round, then commit (JK ruling 2026-07-02)

The **chartered bug fix is correct and verified**: the completion-based solvency floor fixes the common-case defect that blocked every draft from finishing (phantom-tax over-reserve + generic-minimum under-reserve). ONE real residual defect remains (a narrow endgame strand corner) plus minor prediction-layer polish. JK ruled: fix now before commit, fold the polish into the same round.

## GATE (Opus re-ran; evidence, not assertion)

| Gate | Result |
|---|---|
| `NODE_ENV= npm run build` | **exit 0** (only pre-existing chunk-size warnings) |
| `NODE_ENV= npx vitest run` (FULL) | **2 failed / 558 files, 2 skipped = the characterized pair ONLY** (`wpaRuntimeBoundary` hard-fail + `franchiseManualSmokeFixture` order-flake). **Zero new reds.** |
| `franchiseManualSmokeFixture` solo | **4 passed** → confirms the 2nd red is the order-flake, not C2B |
| Calibration (`RUN_AUCTION_TUNING_SIM=1 AUCTION_TUNING_RUNS=200`) | **PASS.** Value-bidding coverage [0.8591, 0.8643, 0.8759, 0.9143], aggregate ≈0.872 (in the 85-90% window, small tolerance to 0.92); stress cases 0.95-1.0 floor-covered. Independently matches Fable's reported numbers. |
| L-SIM | **DEFERRED to post-fix** (pre-commit gate; the season runner does not itself run an auction — auction changes are transitive-import-only to it, covered by the green full suite; run before the eventual commit, mindful of baseline-regeneration cadence). |

## CLEAN (attacked hard from two lenses, holds)

- **Completion floor — feasible path (the bug fix core):** every returned completion is law-verified by `isLegalRoster`; cost = price of a real, distinct, law-verified legal 22 at true-floor (opening-ask) prices → an UPPER bound → ceiling can only be too safe on this path. Arm-split enumeration, catcher two-attempt min, body floors all backstopped by the law check. **No under-cost found.**
- **Six-site rewire:** current-lot candidate is provably excluded from the completion pool (filtered out of `availablePlayerIds` at surface time); `roster.length + openSlots === 22` holds at every call; all old `auctionMaxBid` hard gates removed; phantom tax stripped from every gate but still computed for display; rejection-reason pins preserved.
- **Repro pair:** genuine — drives the REAL `surfaceNextPlayer`/`recordBid`/`resolveLot`/`claimLoneSurvivor` transitions and contrasts against the old `auctionMaxBid` formula (Codex's "hand-computed" nitpick refuted: the asserted numbers ARE what the real code computes).
- **Second-price band:** no inversion possible (`gap` floored at 0; `median` clamped to `[low,high]`; `high ≥ median ≥ low`); `low = ask` is a true floor (every clear path pays ≥ opening ask); v_ij clamped to each team's solvency ceiling; 2nd-highest selection correct.
- **Single-math:** `bandFitMultiplier`/`bandLiftFromPriorities` is byte-equivalent to the pre-refactor `evaluateCpuArchetypeFit`; the predictor prices with the exact same exported formula (one definition, no divergent copy).
- **Shill distribution + CONTESTED privacy:** predictor structurally cannot read a shill's secret (shill `bandPriorities`/`personality` nulled in the lot view; shill fit = uniform mixture over the 24); CONTESTED exposes counts + plain text only, advised GM excluded.
- **Bid-log + persistence:** accumulates and survives every transition to finalize; `underbidder` derivation correct; all new fields optional → old saves load unchanged.
- **Hook test rewrite:** faithful to spec §6, NOT test-fitting — both sessions fall to the scalar path (single-player pools → infeasible; tax=0), so the flipped assertion isolates exactly the now-stripped tax; `offTax > 0` retained (tax still computed for display).
- **Determinism:** no `Math.random`/`Date`; seeded hashing; id/teamId/playerId tie-broken sorts; nomination exponent honors the ratified per-tier 2/3 (stale 2.5 default never consumed).

## FINDINGS

### F1 — MUST-FIX (the residual charter bug: rare endgame strand). Confirmed by 3 independent Opus skeptics (CRITICAL/MAJOR); missed by Codex.
`src/engines/auctionCompletionFloor.ts` `cheapestArmPicks` (~:92-155) selects the required rotation/bullpen arms **purely by price** and never prefers a `canCover('C')` (Two-Way(C)) arm. The forced-coverer step (~:206-216) can only ADD a *separate* coverer body, never SUBSTITUTE a coverage-carrying arm into the required-arm picks. So when a team is one catcher short AND its only remaining catcher-coverer is a Two-Way(C) arm that is ALSO a required rotation/bullpen pick AND slots are tight, **both attempts return spurious INFEASIBLE even though a legal 22 exists** (buy the Two-Way(C) arm as both the deficit arm and the 2nd catcher).
- **Reproduced (Opus, hand-traced + skeptic):** roster 21 = 13 hitters incl. exactly 1 primary-C + 8 pitchers (3 SP + 5 RP, rotation deficit 1); openSlots 1; pool = {cheaper non-covering pure SP, pricier Two-Way(C) SP}. `rosterNeedBreakdown` correctly reports feasible (minimumAdditions=1, coverBodies=0 via sharing), but `cheapestArmPicks` buys the cheaper non-covering SP → catcher depth stays 1 → `isLegalRoster` fails → INFEASIBLE. Buying the Two-Way(C) SP yields a legal 22.
- **The safe-direction proof is INVALID:** on spurious-INFEASIBLE, `sessionBidCeiling` falls back to scalar `budget − (slots−1)×minSalary`. Because `minSalary` (1666.49) is frequently **less** than the remaining required players' opening asks (reservePriceCurve 0.5-0.7 × iv ≈ several thousand), the scalar **under-reserves** → the ceiling is too LOOSE → the team can overspend and strand. The count-only `bidWouldStrand` guard is price-blind and does NOT catch it. This re-opens the exact "draft can't finish" failure C2B was chartered to fix — on a narrow (catcher-scarcity + slot-tightness) trigger; a pre-existing weakness the new floor inherits rather than introduces.

### F2 — MUST-FIX (Codex, MAJOR; Opus confirmed). own_need over-rates off-role pitchers.
`src/engines/auctionMarketModel.ts` `fillsHardRequirement` (~:356) returns true for ANY pitcher role whenever `need.pitcherNeed > 0`, but `pitcherNeed` is a class-blind scalar (min total arms to satisfy both staffs). A pure SP therefore counts as filling a bullpen-only deficit → `ownNeedMultiplier` returns `1 + 0.35·urgency` instead of 1.0. Feeds live v_ij (calibration still passed, so within tolerance, but wrong).

### F3 — MUST-FIX (Codex, MAJOR; folded in by JK). bid-vs-pass suggests unsignable targets.
`src/engines/auctionMarketModel.ts` `projectBidVsPass` (~:606-695) enumerates targets with no would-strand check and hard-codes rival `wouldStrand: false`, so a legality-blocked player can appear as a positive-surplus/affordable board suggestion. Advice-layer, not yet wired to UI.

### F4 — MUST-FIX (privacy hardening; JK ruled "wall it off entirely"). Internal second-price number.
`src/engines/auctionMarketModel.ts` `EstimatedMarket.modeledSecondPrice` (~:126, :339) can, in a 1-rival case, equal that rival's clamped ceiling 1:1. Opus's skeptic REFUTED it as a live leak (it's the model's own price inference, not a rival's secret, and nothing displays it), but JK ruled: remove it from the GM-facing type so no future screen can ever display it; keep it available to the calibration harness via a separate/internal channel. (Codex rated this CRITICAL; Opus review + JK ruling resolve it as a hardening, not a live leak.)

### Non-findings (explicitly NOT to be touched in the fix)
Codex's "repro doesn't run the old machine end-to-end" is a refuted nitpick — the repro is adequate. The feasible-path floor, band math, single-math, shill/CONTESTED privacy, bid-log, hook-test rewrite, and determinism are all clean — leave them byte-stable.

## JK RULINGS (2026-07-02)
1. **Fix the strand corner now, then commit** (not document-and-defer). Precedent noted (C1 R2-1 Two-Way(C) builder limit was deferred), but JK chose fix-now for the charter's core promise.
2. **Fold the prediction-layer polish (F2, F3, F4) into the same fix round.**

## NEXT
FABLE-C2B-FIX contract (Fable builds) → Opus re-audits the DELTA (Codex re-pass + Opus verify) → Opus runs the gate + **L-SIM** → Opus commits branch-only. Then FABLE-C3.
