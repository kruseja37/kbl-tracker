# FABLE DESIGN: Pool Affordability Fix (Arm Repricing + Cheap-Depth + Balanced Seating)

**Date:** 2026-07-04 · **Author:** Fable 5 (math/design authority) · **Status:** BINDING design spec — Codex executes
**Symptom:** design-first pool tops out with $143k–$218k RP/SP-RP arms, needs ~$1.5M cap to seat 4 clubs (then >$1M/club leeway) while ~1000 cheaper players go unused.
**Root cause:** verified adversarially; taken as given here (arm mispricing keystone + no affordability objective + greedy seating + adds-only repair). Demand symmetry and duplicates are RULED OUT — do not touch.

---

## BUILD ORDER (cheapest-impact-first; each step independently blessed)

| Step | Change | File(s) | Expected symptom relief |
|---|---|---|---|
| **1 (KEYSTONE)** | Arm repricing | `src/data/ivCurves.ts` | Pool top-end arms drop from $143–218k to ≲$90k; required cap collapses even before any selection change |
| **2** | Balanced seating | `src/engines/rosterDesignFeasibility.ts` (`seatAllClubs`) | Kills the false "can't seat" + the $1M leeway artifact; G1 and UI FLOOR both fixed (shared primitive, 19fac707) |
| **3** | Cheap-depth floors | `src/engines/draftPoolExtractor.ts` (`structuralFloor`) | Pool GUARANTEES affordable bodies per position/arm-class; trim can't evict them |
| **4 (safety net)** | Repair swap-down | `src/engines/poolFromDemand.ts` (repair loop ~:503–546) | Overrun failures can dig out instead of stalling |

Build Step 1, re-bless, RE-MEASURE the symptom (same 4-team fixture), then proceed. Steps 2–4 are ordered by remaining impact; all four ship for v1.

---

## STEP 1 — ARM REPRICING (ivCurves.ts:157–212)

### Ruling: role price ordering at identical ratings

**SP (1.00) > SP/RP (0.90) > CP (0.65) > RP (0.55)** — multipliers on the SP pitching-attribute curves.

**Ruling refined per JK (2026-07-04): SP/RP = 0.80×SP (was 0.90), reconciled with the IV engine's own valuation.**

**How this reconciles with the IV engine (JK directive — verified in the value path).** I traced ratings → curves → kblIV. `buildSalaryIvInput` (salaryCalculator.ts:714–738) passes `pitcherRole` straight into `computeIV`, and the position knob for EVERY pitcher role is 1.00 (salaryCalculator.ts:252–259 — SP, RP, CP, SP/RP all 1.00). So the role curve block in ivCurves.ts is the SOLE place the engine expresses role value — no separate optionality term, no flexibility knob, nowhere else the number can live. The SP/RP multiplier therefore is NOT an externally-imposed ratio; it IS the engine's role-value derivation, and it must equal the expected PRODUCTION the engine prices, nothing more.

**Production vs flexibility, cleanly separated (resolves the tension JK flagged):**
- **Genuine expected production — priced NOW (JK is right that SP/RPs are valuable):** a swingman throws materially more innings than a pure reliever. Leveraged-innings estimate: SP ≈ 180 IP at LI≈1.0 (anchor = 1.00); SP/RP ≈ 130–150 IP mostly at LI≈1.0 → **≈ 0.75–0.85 × SP by innings alone.** That production gap between a swingman and a reliever is exactly why SP/RP sits well above RP and is NOT crushed to 0.55.
- **Speculative optionality premium — DEFERRED to v1.1:** the EXTRA value of deploying the same body as either starter or reliever mid-season (real-option value beyond expected innings) is the v1.1 flexibility-as-value item; it does NOT belong in these curves. I am removing my earlier "satisfies both legality floors" justification — that was optionality leaking into a production number, the exact conflict JK caught. The legality-floor benefit is claimed at the POOL/roster layer instead (Step 2 seating + Step 3 cheap-depth already exploit SP/RP dual eligibility) — never double-counted inside IV.

**Landing 0.80 (down from 0.90):** 0.90 embedded ~0.10 of implicit optionality on top of the ~0.80 innings-production estimate. Stripping the deferred optionality leaves the pure-production 0.80. It is (a) far below today's 1.39× bug, (b) well above RP's 0.55 — SP/RPs keep their real dual-role production value, (c) derived from the engine's own leveraged-innings logic, not imposed, (d) coherent ordering SP > SP/RP > CP > RP. The current table (SP/RP 1.39×, RP 1.34×, CP 0.84× of SP) inverts all of this — it prices the fewest-innings roles highest; a real distortion, not a taste call.

**RP (0.55) and CP (0.65) UNCHANGED by this reconciliation** — they carry no dual-role production and no deferred optionality, so the innings/leverage estimate stands: CP ≈ 60 IP at LI≈1.8 ≈ 108 leveraged-IP ≈ 0.6×SP; RP ≈ 70 IP at LI≈1.1–1.3 ≈ 85 ≈ 0.5×SP. **CP > RP** is the honest leverage math (closers out-earn setup men at equal stuff); both stay ≤ 0.70×SP.

### Concrete target values

**SP block: UNCHANGED** (baseline; minimizes oracle churn).

**SP/RP block (ivCurves.ts:171–184)** — adopt SP's shape params (min/curve1/mid/curve2) on all pitching attrs, scale SP's midSal/sal100 by **0.80** (was 0.90 — see reconciliation above); batting/FLD rows copy SP verbatim (kills the absurd 200k/160k/200k batting sal100s):

| Attr | Row | min | curve1 | mid | midSal | curve2 | sal100 |
|---|---|---|---|---|---|---|---|
| VEL | primary | 50 | 1.2 | 65 | **8,400** | 2 | **50,400** |
| VEL | subMin | 0 | 1.2 | 30 | **6,000** | 1.3 | **14,400** |
| JNK | primary | 0 | 1 | 60 | **4,000** | 2 | **16,000** |
| ACC | primary | 0 | 1 | 50 | **6,160** | 2 | **27,720** |
| POW/CON/SPD/FLD | primary | — | — | — | copy SP rows exactly (500/100,000 · 400/80,000 · 550/100,000 · 500/3,500) | — | — |

**CP block (:199–212)** — 0.65 × SP on pitching attrs; batting/FLD already equal SP (no change):

| Attr | Row | midSal | sal100 |
|---|---|---|---|
| VEL primary | (min 50, c1 1.2, mid 65, c2 2) | **6,825** | **40,950** |
| VEL subMin | (min 0, c1 1.2, mid 30, c2 1.3) | **4,875** | **11,700** |
| JNK primary | (mid 60, c2 2) | **3,250** | **13,000** |
| ACC primary | (mid 50, c2 2) | **5,005** | **22,525** |

**RP block (:185–198)** — 0.55 × SP on pitching attrs; batting/FLD already equal SP (no change):

| Attr | Row | midSal | sal100 |
|---|---|---|---|
| VEL primary | (min 50, c1 1.2, mid 65, c2 2) | **5,775** | **34,650** |
| VEL subMin | (min 0, c1 1.2, mid 30, c2 1.3) | **4,125** | **9,900** |
| JNK primary | (mid 60, c2 2) | **2,750** | **11,000** |
| ACC primary | (mid 50, c2 2) | **4,235** | **19,060** |

Builder may round to the nearest $25; the RATIO is the spec, the rounding is not. Where a current RP/SP-RP/CP shape param differs from SP (e.g. SP/RP VEL mid 60), REPLACE it with SP's shape param — one shape family, four scalings, so the ordering holds at every rating, not just the anchors.

### Acceptance (Step 1)
Compute live `computeIV` at the two measured reference arms (VEL/JNK/ACC = 80/70/70 and 90/85/85, identical non-pitching ratings):
- Ordering: SP > SP/RP > CP > RP at BOTH points.
- Ratios vs SP: **SP/RP ∈ [0.76, 0.84]** (centered on 0.80) · CP ∈ [0.60, 0.70] · RP ∈ [0.50, 0.60].
- SP values unchanged from today ($51,329 / $81,047).
- Sanity: at the 80/70/70 arm, SP/RP should land ≈ $41k (0.80×$51.3k) — down from today's ~$71k, and clearly above RP's ≈ $28k. This is the concrete before/after JK should see.

### MANDATORY re-bless (this is oracle-blessed canonical IV math)
`salary === kblIV` (leaguePlayerAdapter.ts:56,66 → salaryCalculator.ts:741–745) — these curves feed auction budgets, cap math, and frozen oracle pins. The build MUST:
1. Re-run and re-pin the frozen IV oracle: `src/engines/__tests__/ivEngine.test.ts` (update pinned expectations DELIBERATELY, each new pin hand-checked against the ratio table above — never blind-regenerate).
2. Re-run the value-parity harness: `archetypeBalanceSimulator` (+ its test). **Parity note:** the 24 archetypes were locked on parity measured over DISTORTED reliever prices — bullpen-heavy archetypes were being overcharged for the same wins. Repricing moves measured parity TOWARD truth. If any archetype departs its balance band after repricing, adjust that archetype's budget split / shape targets — NEVER re-inflate the role curves to patch parity.
3. Full vitest suite (expect churn in `salarySeam.t5`, `optimizerConstantsSnapshot`, `draftabilityRanker`, `draftPoolExtractor`, `poolFeasibility`, `leagueConstruction`; verify `historicalArchetypes.test` SOLO — known big-batch flake).
4. Update `spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md` (role-curve table + the ordering ruling) and add a DECISIONS_LOG entry (this ruling, this date).

---

## STEP 2 — BALANCED SEATING (rosterDesignFeasibility.ts `seatAllClubs`, :546–577)

### Ruling
The sequential loop (club 1 solves cheapest-first, deletes its 22, next club) is structurally biased: identical symmetric clubs, but club 1 hoovers the cheap bodies and the last club is priced against leftovers — a false negative that only clears at an inflated cap, exactly the $1.5M/$1M-leeway artifact. Replace the INTERNALS of `seatAllClubs` (same signature + result shape, plus per-club costs) so it remains the shared primitive for both G1 (`runG1Check`) and the UI FLOOR.

### Design: one global matching + budget balancing (reuses the audited F1 matcher)
1. **Global matching:** build T copies of `buildDefaultDesignSlots()` (T×22 slots) and run the SAME Kuhn max-cardinality matcher `evaluateRosterDesign` already uses — once, over all T×22 slots vs the whole pool, candidate order = existing `candidateOrder` with no tilt (G1 has none). Slot order: most-constrained-first globally, tie-break snake by club index so scarce cheap bodies stripe across clubs instead of pooling in club 1. Incomplete matching → `holds:false` with the true blockers (existing blocker language).
2. **Per-club budget balancing:** after a complete matching, while some club exceeds `budget`: (a) try swapping a body in the max-cost club with a CHEAPER eligible unused pool body (augment via the matcher); (b) else try a same-slot-class swap with an under-budget club where the exchange strictly reduces the max club's cost and keeps the donor legal + within budget. Each iteration strictly decreases the max club cost → terminates. All clubs ≤ budget → `holds:true`.
3. **Legality:** per-club `isLegalRoster` stays the invariant gate; failures explain via `explainIllegality` (never canned).
4. Return per-club `assemblies` AND per-club `costs` so the UI leeway readout reports the BALANCED spread, not the greedy artifact.

Determinism: no randomness — existing tie-breaks (salary, then id) + fixed snake order.

### Acceptance (Step 2)
- **Stranding fixture (the regression test for THIS bug):** 2 clubs; pool where each slot-class has 2 cheap + 2 expensive bodies such that club-sequential seating strands club 2 over budget but a cross-club distribution seats both. Balanced must hold at a budget where the OLD greedy provably returned `holds:false` (encode the old failure in the test comment, not in code).
- **Symmetry:** verdict and per-club max cost are invariant under pool input order.
- **Partition fixture:** pool = T disjoint legal 22s each costing exactly B → holds at budget B, fails at B−1.
- **Live re-measure:** the 4-team symptom fixture must now hold at a cap far below $1.5M with per-club leeway spread ≲ the price of one mid arm (record the measured numbers in the audit evidence).

---

## STEP 3 — CHEAP-DEPTH FLOORS (draftPoolExtractor.ts `structuralFloor`, :133–226)

### Ruling
Every structural pick-list currently sorts `byIvDescIdAsc` (:124–126; applied :145, :161, :176–179, :211, :218) — the floors deliberately pull each position's MOST EXPENSIVE bodies and nothing anywhere guarantees affordable depth. Add a parallel **cheap quota** to the same pick-lists; do not change the top-IV pulls.

### Design
1. Add `byIvAscIdAsc` (salary===iv, so cheapest = lowest IV) beside `byIvDescIdAsc`.
2. Add tuning constants to `EXTRACTOR_TUNING` (draftPoolExtractor.ts:72): `cheapDepthPerClubField: 1`, `cheapDepthPerClubArm: 2` (named dials for C5 tuning).
3. In `structuralFloor`, after each existing top-IV pull, ALSO pull the cheapest legal bodies from the SAME filtered list into `picks`:
   - per field position: `teams × cheapDepthPerClubField` cheapest primaries (C included);
   - C-coverage: `teams × cheapDepthPerClubField` cheapest additional coverage bodies;
   - startable arms: `teams × cheapDepthPerClubArm` cheapest; relievable arms: `teams × cheapDepthPerClubArm` cheapest;
   - pitcher/hitter body top-ups: unchanged (cheap pulls above already add bodies).
   Dedup via the existing `picks` map; no extra quality gate — these ARE the affordability rail (an optional bottom-percentile viability guard may be added later as a dial, default OFF — do not build it now).
4. **Trim protection is automatic:** cheap picks join `floorIds`, which already flows into `protectedIds` (poolFromDemand.ts:476–481) → `trimPoolToTarget` (:170–196) cannot evict them. Its eviction tie-break (:183) already keeps the cheaper of equal-fit bodies — leave as is.
5. **Sizing stays a COUNT target** (`resolvePoolSizingTarget`, ceiling 1.5×demandBase at :151) — ruled: with repriced arms + guaranteed cheap depth + a balanced G1 verifying the real cap, a cost-target sizer is unnecessary complexity for v1.

### Acceptance (Step 3)
- Unit: for a synthetic source with wide salary spread, the extracted pool contains ≥ teams cheapest-quartile primaries at EVERY field position and ≥ 2×teams cheapest-quartile startable + relievable arms, and none of them appear in `trimPoolToTarget.evicted` at any legal multiplier.
- Pool-size delta stays within the existing ceiling clamp (cheap picks count toward, not on top of, the target where trim applies to unprotected filler).

---

## STEP 4 — REPAIR SWAP-DOWN (poolFromDemand.ts repair loop :503–546)

### Ruling
The loop only ever `current.set(...)`; on a pure budget overrun (`failing.overrun` set, `repairSlotsForFailure` → `[null]`) adding the cheapest legal body cannot remove the expensive bodies causing the overrun. Add a swap-down arm; keep everything else.

### Design
When `g1.failing.overrun` is set, each repair round becomes net-zero-size **swap-down**: inject the cheapest eligible universe body for the failing class (existing pick via `selectFitAwareRepairCandidate`) AND evict the most expensive UNPROTECTED pool body of the same eligibility class (respect `protectedIds`; never shrink below `hardFloor`; ≤ `repairSlots.length` evictions/round; record evicted ids in sizing messages). If no unprotected expensive body exists, fall through to the existing stuck message (:538–540). Non-overrun failures keep today's adds-only behavior.

### Acceptance (Step 4)
- Fixture: pool that fails G1 on overrun only, universe containing cheaper same-class bodies → repair converges to `holds:true` within `maxRepairRounds`, pool size unchanged, no protected id evicted.
- Existing repair tests unchanged for missing-body failures.

---

## GLOBAL GATES (every step)
`npm run build` exit 0 · full vitest (baseline per CURRENT_STATE.md) · L-SIM NOT required (auction/pool modules are outside the L-SIM import graph — documented orthogonality) · the 4-team symptom fixture re-measured and numbers recorded after Steps 1, 2, and 4 · DECISIONS_LOG + IV_ENGINE spec updated in Step 1 only.
